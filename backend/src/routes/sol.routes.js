// src/routes/sol.routes.js
const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const router   = express.Router()
const prisma = require('../config/prisma')
const solPushSvc  = require('../modules/sabotay/sol-push.service')
const exchangeSvc = require('../modules/sabotay/sol-exchange.service')

const SOL_JWT_SECRET = process.env.JWT_SECRET || 'plusgroup-sol-secret-change-me'

function computeTiming(dueDate, paidAt) {
  if (!paidAt) return 'onTime'
  const toHaitiDate = (d) => {
    const dt = new Date(d)
    dt.setMinutes(dt.getMinutes() - 5 * 60)
    return dt.toISOString().split('T')[0]
  }
  const due  = toHaitiDate(dueDate)
  const paid = toHaitiDate(paidAt)
  if (paid < due) return 'early'
  if (paid > due) return 'late'
  return 'onTime'
}

function buildPaymentMaps(sabotayPayments) {
  const payments = {}, paymentTimings = {}
  for (const p of sabotayPayments) {
    try {
      const dateKey = new Date(p.dueDate).toISOString().split('T')[0]
      payments[dateKey] = true
      // ✅ FIX: itilize `timing` ki DEJA anrejistre sou peman an (menm sistèm
      // kategori — earlyDepo/earlyDay/early/onTime/lateWindow/late/veryLate —
      // ki panel admin lan itilize a). Rekalkile ak yon fonksyon lokal senplifye
      // te bay move kategori ki pa t matche SCORE_POINTS, donk peman yo te
      // disparèt san yo pa konte nan skò a.
      paymentTimings[dateKey] = p.timing || computeTiming(p.dueDate, p.paidDate || p.paidAt || p.dueDate)
    } catch(_) {}
  }
  return { payments, paymentTimings }
}

function authMember(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token manke' })
  try {
    const payload = jwt.verify(token, SOL_JWT_SECRET)
    if (payload.role !== 'sol_member') return res.status(401).json({ message: 'Token pa valid pou manm sol' })
    req.solMember = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token ekspire oswa pa valid' })
  }
}

function authAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token admin obligatwa' })
  try {
    req.admin = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET)
    return next()
  } catch {}
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return res.status(401).json({ message: 'Token admin pa valid' })
    }
    req.admin = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Token admin pa valid' })
  }
}

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'Non itilizatè ak modpas obligatwa' })

    const accounts = await prisma.solMemberAccount.findMany({
      where: { username: username.toLowerCase().trim() }
    })
    if (!accounts.length) return res.status(401).json({ message: 'Non itilizatè oswa modpas pa kòrèk' })

    let matchedAccount = null
    for (const acc of accounts) {
      const valid = await bcrypt.compare(password, acc.passwordHash)
      if (valid) { matchedAccount = acc; break }
    }
    if (!matchedAccount) return res.status(401).json({ message: 'Non itilizatè oswa modpas pa kòrèk' })

    // ✅ FIX 3: Verifye si manm nan bloke — bloke = pa ka konekte
    if (matchedAccount.memberId) {
      const sabotayMember = await prisma.sabotayMember.findUnique({
        where: { id: matchedAccount.memberId },
        select: { isBlocked: true }
      }).catch(() => null)
      const isBlocked = sabotayMember?.isBlocked === true
      if (isBlocked) {
        return res.status(403).json({
          message: '🔒 Kont ou bloke poutèt reta peman. Kontakte admin pou debloke l.',
          blocked: true
        })
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: matchedAccount.tenantId },
      select: { id: true, name: true, phone: true, address: true, logoUrl: true }
    })
    const token = jwt.sign(
      { role: 'sol_member', accountId: matchedAccount.id, memberId: matchedAccount.memberId, planId: matchedAccount.planId, tenantId: matchedAccount.tenantId },
      SOL_JWT_SECRET, { expiresIn: '7d' }
    )
    return res.json({
      token,
      member: { id: matchedAccount.memberId, name: matchedAccount.memberName, phone: matchedAccount.memberPhone, position: matchedAccount.memberPosition },
      tenant: tenant ? { ...tenant, businessName: tenant.name } : null
    })
  } catch (err) {
    console.error('[SOL LOGIN]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/auth/change-password', authMember, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Tout champ yo obligatwa' })
    if (newPassword.length < 4) return res.status(400).json({ message: 'Modpas nouvo dwe gen omwen 4 karaktè' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.solMember.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    const valid = await bcrypt.compare(currentPassword, account.passwordHash)
    if (!valid) return res.status(401).json({ message: 'Modpas aktyèl la pa kòrèk' })
    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.solMemberAccount.update({ where: { id: account.id }, data: { passwordHash: newHash, plainPassword: newPassword } })
    return res.json({ message: 'Modpas chanje avèk siksè' })
  } catch (err) {
    console.error('[SOL CHANGE-PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// buildPlanData
// ══════════════════════════════════════════════════════════════

async function buildPlanData(account, memberId) {
  if (!memberId) return null

  const sabotayMember = await prisma.sabotayMember.findUnique({
    where: { id: memberId },
    include: { plan: true, payments: { orderBy: { dueDate: 'asc' } } }
  })
  if (!sabotayMember || !sabotayMember.plan) return null

  const plan = sabotayMember.plan
  const { payments, paymentTimings } = buildPaymentMaps(sabotayMember.payments)

  const isClosed = plan.status === 'closed' || plan.status === 'finished'
  const allSlots = await prisma.sabotayMember.findMany({
    where: {
      phone: sabotayMember.phone,
      planId: sabotayMember.planId,
      ...(isClosed ? {} : { isActive: true })
    },
    include: { payments: { orderBy: { dueDate: 'asc' } } },
    orderBy: { position: 'asc' }
  })

  const activeMemberCount = await prisma.sabotayMember.count({
    where: { planId: plan.id, ...(isClosed ? {} : { isActive: true }) }
  }).catch(() => 0)

  const totalMemberCount = await prisma.sabotayMember.count({
    where: { planId: plan.id }
  }).catch(() => 0)

  // ✅ NOUVO: konte EGZAKTEMAN ak menm kritè panel admin lan itilize pou jenere
  // dat yo (status !== 'stopped') — pou skò "Chanpyon/Bon" a matche pafètman.
  const nonStoppedMemberCount = await prisma.sabotayMember.count({
    where: { planId: plan.id, status: { not: 'stopped' } }
  }).catch(() => activeMemberCount)

  return {
    member: {
      id: sabotayMember.id,
      name: sabotayMember.name,
      phone: sabotayMember.phone || '',
      position: sabotayMember.position,
      accountPosition: account.memberPosition,
      balance: Number(account.balance || 0),
      // ✅ FIX 2: Ajoute performanceScore pou afichaj pwen dinamik
      performanceScore: sabotayMember.performanceScore ?? 0,
      // ✅ NOUVO: Dat pwomès peman admin lan deklare (san afiche pozisyon/klasman)
      declaredPayoutDate: sabotayMember.declaredPayoutDate || null,
      // ✅ NOUVO: estati manm nan (pou l wè si li kanpe) ak montan ranbousman "kanpe" a
      status: sabotayMember.status || 'active',
      stopRefundAmount: sabotayMember.stopRefundAmount ? Number(sabotayMember.stopRefundAmount) : null,
      stopRefundPaid: sabotayMember.stopRefundPaid || false,
      payments,
      paymentTimings,
      allSlots: allSlots.map(s => {
        const { payments: sp, paymentTimings: st } = buildPaymentMaps(s.payments)
        // ✅ NOUVO: chak "men" (eskl) gen pwòp dat pwomès pa li — manm nan
        // pa dwe wè ki "men" li ye SOF si admin deklare yon dat pou eskl sa a.
        return { id: s.id, position: s.position, payments: sp, paymentTimings: st, declaredPayoutDate: s.declaredPayoutDate || null }
      })
    },
    plan: {
      id: plan.id,
      name: plan.name,
      amount: Number(plan.amount),
      fee: Number(plan.fee),
      frequency: plan.frequency,
      maxMembers: plan.maxMembers,
      activeMemberCount,
      totalMemberCount,
      // ✅ NOUVO: kantite manm ki pa 'stopped' — menm kritè ak sabotayUtils.js
      // (getAllPaymentDates) itilize bò panel admin la, pou skò yo matche.
      nonStoppedMemberCount,
      // ✅ FIX 2: Ajoute dynamicPositioning pou frontend ka konnen si aktive
      dynamicPositioning: plan.dynamicPositioning ?? false,
      // ✅ NOUVO: si aktive, fwontenn kont sol la pa dwe afiche "Pozisyon #X"
      hidePositionInSol: plan.hidePositionInSol ?? false,
      // ✅ NOUVO: montan fiks penalite "kanpe" a — pou avèti manm nan davans
      stopPenaltyAmount: Number(plan.stopPenaltyAmount || 0),
      createdAt: plan.startDate.toISOString().split('T')[0],
      dueTime: plan.dueTime || account.planDueTime || '08:00',
      dueTimeEnd: plan.dueTimeEnd || account.planDueTimeEnd || '15:00',
      interval: plan.interval || account.planInterval || 1,
      feePerMember: Number(plan.feePerMember || account.planFeePerMember || 0),
      penalty: Number(plan.penalty || account.planPenalty || 0),
      regleman: plan.regleman || null
    }
  }
}


// MEMBERS/ME
// ══════════════════════════════════════════════════════════════

router.get('/members/me', authMember, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.solMember.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    if (!account.memberId) return res.status(400).json({ message: 'Kont sa pa gen manm ki asosye avèk li' })

    const tenant = await prisma.tenant.findUnique({
      where: { id: account.tenantId },
      select: { id: true, name: true, phone: true, address: true, logoUrl: true }
    })
    const tenantFormatted = tenant ? { ...tenant, businessName: tenant.name } : null

    const primaryData = await buildPlanData(account, account.memberId)
    if (!primaryData) return res.status(404).json({ message: 'Manm oswa plan pa jwenn' })

    let allPlansData = [{ ...primaryData, id: primaryData.plan.id }]

    // ✅ FIX: Chèche TOUT pozisyon nan sol_member_positions pou kont sa a
    const allPositions = await prisma.solMemberPosition.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'asc' }
    })

    for (const pos of allPositions) {
      if (!pos.memberId) continue
      // Evite doublaj ak plan primè a
      if (allPlansData.find(p => p.plan.id === pos.planId)) continue
      const planData = await buildPlanData(account, pos.memberId)
      if (planData) allPlansData.push({ ...planData, id: planData.plan.id })
    }

    // ✅ Rete kòd orijinal la pou lòt kont (menm telefòn)
    const phone = primaryData.member.phone
    if (phone) {
      const otherAccounts = await prisma.solMemberAccount.findMany({
        where: { memberPhone: phone, tenantId: account.tenantId, id: { not: account.id }, memberId: { not: null } }
      })
      for (const otherAccount of otherAccounts) {
        const planData = await buildPlanData(otherAccount, otherAccount.memberId)
        if (planData && !allPlansData.find(p => p.plan.id === planData.plan.id)) {
          allPlansData.push({ ...planData, id: planData.plan.id })
        }
      }
    }

    if (allPlansData.length === 1) {
      return res.json({ member: primaryData.member, plan: primaryData.plan, tenant: tenantFormatted })
    }

    return res.json({
      tenant: tenantFormatted,
      member: primaryData.member,
      plan:   primaryData.plan,
      plans: allPlansData.map(d => ({ id: d.plan.id, member: d.member, plan: d.plan, tenant: tenantFormatted }))
    })
  } catch (err) {
    console.error('[SOL ME]', err)
    return res.status(500).json({ message: 'Erè sèvè', detail: err.message })
  }
})
// ══════════════════════════════════════════════════════════════
// ACCOUNTS (admin)
// ══════════════════════════════════════════════════════════════

router.post('/accounts', authAdmin, async (req, res) => {
  try {
    const { memberId, tenantId, dueTime, credentials } = req.body
    if (!memberId || !tenantId || !credentials?.username || !credentials?.password)
      return res.status(400).json({ message: 'memberId, tenantId, credentials.username, credentials.password obligatwa' })

    const sabotayMember = await prisma.sabotayMember.findUnique({
      where: { id: memberId }, include: { plan: true }
    })
    if (!sabotayMember) return res.status(404).json({ message: 'Manm pa jwenn nan SabotayMember' })
    if (sabotayMember.plan.tenantId !== tenantId)
      return res.status(403).json({ message: 'Manm sa pa nan tenant ou a' })

    const plan = sabotayMember.plan

    // ✅ FIX 1: Si nimewo telefòn nan deja gen kont Sol nan MENM TENANT an
    // → kreye nouvo kont pou nouvo plan an ak MENM username+modpas
    // → manm ap konekte yon sèl fwa epi wè tout plan li yo
    const existingInSameTenant = await prisma.solMemberAccount.findFirst({
      where: {
        memberPhone: sabotayMember.phone || '',
        tenantId,
        memberId: { not: memberId } // pa menm manm nan (evite loop)
      }
    })

    let finalUsername, finalPasswordHash, finalPlainPassword
    let reusingExistingCredentials = false

    if (existingInSameTenant && sabotayMember.phone) {
      // Reutilize username + modpas kont egzistan an pou menm login travay
      finalUsername        = existingInSameTenant.username
      finalPasswordHash    = existingInSameTenant.passwordHash
      finalPlainPassword   = existingInSameTenant.plainPassword
      reusingExistingCredentials = true
    } else {
      // Moun nouvo — jeneralize username (ak auto-suffix si lòt tenant gen menm username)
      finalUsername = credentials.username.toLowerCase().trim()
      const globalSameUsername = await prisma.solMemberAccount.findMany({
        where: { username: finalUsername }
      })
      if (globalSameUsername.some(a => a.tenantId !== tenantId)) {
        let suffix = 2
        while (await prisma.solMemberAccount.findFirst({
          where: { username: `${finalUsername}${suffix}`, tenantId }
        })) { suffix++ }
        finalUsername = `${finalUsername}${suffix}`
      }
      finalPlainPassword = credentials.password
      finalPasswordHash  = await bcrypt.hash(finalPlainPassword, 10)
    }

    // Verifye si kont pou memberId sa deja egziste
    const existingByMember = await prisma.solMemberAccount.findFirst({
      where: { memberId: sabotayMember.id }
    })

    // Verifye unicite username nan menm tenant (sèlman si nouvo username)
    if (!reusingExistingCredentials) {
      const existingUsername = await prisma.solMemberAccount.findFirst({
        where: { username: finalUsername, tenantId }
      })
      if (existingUsername && existingUsername.memberId !== memberId)
        return res.status(409).json({ message: 'Non itilizatè sa deja pran nan enstitisyon sa a' })
    }

    const accountData = {
      username: finalUsername, passwordHash: finalPasswordHash, plainPassword: finalPlainPassword,
      tenantId, memberId: sabotayMember.id, memberName: sabotayMember.name,
      memberPhone: sabotayMember.phone || '', memberPosition: sabotayMember.position,
      planId: plan.id, planName: plan.name, planAmount: Number(plan.amount),
      planFee: Number(plan.fee), planFrequency: plan.frequency, planMaxMembers: plan.maxMembers,
      planCreatedAt: plan.startDate.toISOString().split('T')[0], planDueTime: dueTime || '08:00',
      planInterval: Number(plan.interval || 1), planFeePerMember: Number(plan.feePerMember || 0),
      planPenalty: Number(plan.penalty || 0), planRegleman: plan.regleman || null,
      payments: {}, paymentTimings: {}, fines: {},
    }

    const account = await prisma.solMemberAccount.create({ data: accountData })

    const usernameChanged = !reusingExistingCredentials &&
      finalUsername !== credentials.username.toLowerCase().trim()

    const baseNote = reusingExistingCredentials
      ? `Kont Sol egzistan an reutilize (${finalUsername}). Manm ap konekte ak menm username+modpas li genyen deja nan tenant sa a.`
      : usernameChanged
        ? `Username modifye otomatikman: ${credentials.username} → ${finalUsername} (deja egziste nan yon lòt enstitisyon)`
        : ''

    if (existingByMember) {
      return res.status(201).json({
        message: 'Plan ajoute sou kont Sol egzistan an!',
        accountId: account.id, username: account.username, plainPassword: account.plainPassword,
        note: `Manm sa gen deja kont "${existingByMember.username}" pou lòt plan. Nouvo plan ${plan.name} ajoute.`
          + (baseNote ? ' ' + baseNote : ''),
      })
    }

    return res.status(201).json({
      message: reusingExistingCredentials ? 'Plan ajoute — kont Sol egzistan reutilize!' : 'Kont kreye!',
      accountId: account.id, username: account.username, plainPassword: account.plainPassword,
      ...(baseNote && { note: baseNote })
    })
  } catch (err) {
    console.error('[SOL CREATE ACCOUNT]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/members/:memberId/check', authAdmin, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findFirst({
      where: { memberId: req.params.memberId },
      select: { id: true, username: true, plainPassword: true, createdAt: true }
    })
    return res.json({ hasAccount: !!account, account: account || null })
  } catch (err) {
    console.error('[SOL CHECK]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/accounts', authAdmin, async (req, res) => {
  try {
    const { tenantId, planId } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const accounts = await prisma.solMemberAccount.findMany({
      where: { tenantId, ...(planId && { planId }) },
      select: { id: true, username: true, plainPassword: true, memberName: true, memberPhone: true, memberPosition: true, planName: true, createdAt: true },
      orderBy: { memberPosition: 'asc' }
    })
    return res.json({ accounts })
  } catch (err) {
    console.error('[SOL ACCOUNTS LIST]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.patch('/accounts/:accountId/reset-password', authAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ message: 'Modpas dwe gen omwen 4 karaktè' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.params.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    const passwordHash = await bcrypt.hash(newPassword, 10)
    // ✅ Lè modpas chanje, mete ajou TOUT kont Sol manm nan menm tenant (menm phone)
    await prisma.solMemberAccount.updateMany({
      where: { memberPhone: account.memberPhone, tenantId: account.tenantId },
      data: { passwordHash, plainPassword: newPassword }
    })
    return res.json({ message: 'Modpas reset avèk siksè pou tout plan manm nan', username: account.username })
  } catch (err) {
    console.error('[SOL RESET PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

router.get('/push/vapid-public-key', (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU' })
})

router.post('/push/subscribe', authMember, async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription) return res.status(400).json({ message: 'Subscription obligatwa' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.solMember.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    await solPushSvc.saveSolSubscription(account.tenantId, account.id, account.memberId, subscription)
    return res.json({ success: true, message: 'Push subscription anrejistre.' })
  } catch (err) {
    console.error('[SOL PUSH SUBSCRIBE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.delete('/push/unsubscribe', authMember, async (req, res) => {
  try {
    const { endpoint } = req.body
    if (endpoint) await solPushSvc.removeSolSubscription(endpoint)
    return res.json({ success: true })
  } catch (err) {
    console.error('[SOL PUSH UNSUBSCRIBE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// EXCHANGE
// ══════════════════════════════════════════════════════════════

router.get('/exchange/:planId/offers', authMember, async (req, res) => {
  try {
    const offers = await exchangeSvc.getPublicOffers(req.solMember.tenantId, req.params.planId, req.solMember.accountId)
    return res.json({ success: true, offers })
  } catch (err) {
    console.error('[SOL EXCHANGE OFFERS]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

router.get('/exchange/:planId/my', authMember, async (req, res) => {
  try {
    const exchanges = await exchangeSvc.getMemberExchanges(req.solMember.tenantId, req.solMember.accountId, req.params.planId)
    return res.json({ success: true, exchanges })
  } catch (err) {
    console.error('[SOL EXCHANGE MY]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

router.post('/exchange/:planId/initiate', authMember, async (req, res) => {
  try {
    const planId = req.params.planId || req.solMember.planId
    const exchange = await exchangeSvc.initiateExchange(req.solMember.tenantId, planId, req.solMember.accountId, req.body)
    return res.status(201).json({ success: true, exchange })
  } catch (err) {
    console.error('[SOL EXCHANGE INITIATE]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

router.post('/exchange/:exchangeId/accept', authMember, async (req, res) => {
  try {
    const result = await exchangeSvc.acceptExchange(req.solMember.tenantId, req.params.exchangeId, req.solMember.accountId)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL EXCHANGE ACCEPT]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

router.post('/exchange/:exchangeId/reject', authMember, async (req, res) => {
  try {
    const result = await exchangeSvc.rejectExchange(req.solMember.tenantId, req.params.exchangeId, req.solMember.accountId)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL EXCHANGE REJECT]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

router.get('/admin/exchange', authAdmin, async (req, res) => {
  try {
    const { tenantId, planId, status, page, limit } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const result = await exchangeSvc.getAdminExchanges(tenantId, planId, { status, page: Number(page) || 1, limit: Number(limit) || 20 })
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL ADMIN EXCHANGE]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

router.patch('/admin/exchange/:planId/config', authAdmin, async (req, res) => {
  try {
    const { tenantId } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const plan = await exchangeSvc.updateExchangeConfig(tenantId, req.params.planId, null, req.body)
    return res.json({ success: true, plan })
  } catch (err) {
    console.error('[SOL ADMIN EXCHANGE CONFIG]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

// ══════════════════════════════════════════════════════════════
// ACCOUNT BY PHONE
// ══════════════════════════════════════════════════════════════

router.get('/account-by-phone', authAdmin, async (req, res) => {
  try {
    const { phone, tenantId } = req.query
    if (!phone) return res.json({ account: null })
    const clean = phone.replace(/\s/g, '').trim()
    const account = await prisma.solMemberAccount.findFirst({
      where: { memberPhone: clean, ...(tenantId && { tenantId }) },
      select: { id: true, username: true, plainPassword: true, memberName: true, memberPhone: true, tenantId: true }
    })
    return res.json({ account: account || null })
  } catch (err) {
    console.error('[SOL ACCOUNT BY PHONE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/debug/accounts', async (req, res) => {
  try {
    const accounts = await prisma.solMemberAccount.findMany({ select: { username: true, memberName: true, tenantId: true, passwordHash: true } })
    return res.json({ count: accounts.length, accounts })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════
// CHAT SOL
// ══════════════════════════════════════════════════════════════

router.get('/chat/:planId', authMember, async (req, res) => {
  try {
    const messages = await prisma.solChat.findMany({ where: { planId: req.params.planId, tenantId: req.solMember.tenantId }, orderBy: { createdAt: 'asc' }, take: 100 })
    return res.json({ messages })
  } catch (err) {
    console.error('[SOL CHAT GET]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/chat/:planId', authMember, async (req, res) => {
  try {
    const { planId } = req.params
    const { tenantId, memberId, accountId } = req.solMember
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ message: 'Mesaj obligatwa' })
    if (message.length > 500) return res.status(400).json({ message: 'Mesaj tro long (max 500 karaktè)' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: accountId }, select: { memberPosition: true } })
    const authorName = `Manm #${account?.memberPosition || '?'}`
    const msg = await prisma.solChat.create({ data: { planId, tenantId, authorId: memberId, authorName, isAdmin: false, message: message.trim() } })
    solPushSvc.notifyPlanMembers(tenantId, planId, memberId, { title: `💬 ${authorName}`, body: message.trim().substring(0, 80) }).catch(e => console.warn('[SOL CHAT PUSH]', e.message))
    return res.status(201).json({ message: msg })
  } catch (err) {
    console.error('[SOL CHAT POST]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/admin/chat/:planId', authAdmin, async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.admin.tenantId
    const messages = await prisma.solChat.findMany({ where: { planId: req.params.planId, tenantId }, orderBy: { createdAt: 'asc' }, take: 100 })
    return res.json({ messages })
  } catch (err) {
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/admin/chat/:planId', authAdmin, async (req, res) => {
  try {
    const { planId } = req.params
    const { message } = req.body
    const tenantId = req.query.tenantId || req.admin.tenantId
    if (!message?.trim()) return res.status(400).json({ message: 'Mesaj obligatwa' })
    const msg = await prisma.solChat.create({ data: { planId, tenantId, authorId: 'admin', authorName: '👑 Admin', isAdmin: true, message: message.trim() } })
    solPushSvc.notifyPlanMembers(tenantId, planId, 'admin', { title: '👑 Admin', body: message.trim().substring(0, 80) }).catch(() => {})
    return res.status(201).json({ message: msg })
  } catch (err) {
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN
// ══════════════════════════════════════════════════════════════

router.get('/superadmin/overview', authAdmin, async (req, res) => {
  try {
    const plans = await prisma.sabotayPlan.findMany({ include: { tenant: { select: { id: true, name: true, slug: true } }, _count: { select: { members: { where: { isActive: true } } } } }, orderBy: { createdAt: 'desc' } })
    const result = plans.map(p => ({ planId: p.id, planName: p.name, amount: Number(p.amount), frequency: p.frequency, status: p.status, maxMembers: p.maxMembers, memberCount: p._count.members, startDate: p.startDate, tenant: { id: p.tenant.id, name: p.tenant.name, slug: p.tenant.slug } }))
    return res.json({ total: result.length, plans: result })
  } catch (err) {
    console.error('[SOL SUPERADMIN OVERVIEW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/superadmin/plans/:planId/members', authAdmin, async (req, res) => {
  try {
    const members = await prisma.sabotayMember.findMany({ where: { planId: req.params.planId }, orderBy: { position: 'asc' } })
    const memberIds = members.map(m => m.id)
    const solAccounts = await prisma.solMemberAccount.findMany({ where: { memberId: { in: memberIds } }, select: { memberId: true, username: true, plainPassword: true } })
    const accountMap = Object.fromEntries(solAccounts.map(a => [a.memberId, a]))
    const result = members.map(m => ({
      id: m.id, name: m.name, phone: m.phone || '', position: m.position,
      permanentId: m.permanentId || null, performanceScore: m.performanceScore ?? 0,
      isActive: m.isActive, isOwnerSlot: m.isOwnerSlot || false, hasWon: m.hasWon || false,
      username: accountMap[m.id]?.username || null,
      plainPassword: accountMap[m.id]?.plainPassword || null,
    }))
    return res.json({ members: result })
  } catch (err) {
    console.error('[SOL SUPERADMIN MEMBERS]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.patch('/superadmin/plans/:planId/members/:memberId', authAdmin, async (req, res) => {
  try {
    const { memberId } = req.params
    const { name, position, phone, isOwnerSlot, hasWon, username } = req.body
    const member = await prisma.sabotayMember.update({ where: { id: memberId }, data: { ...(name !== undefined && { name }), ...(position !== undefined && { position: Number(position) }), ...(phone !== undefined && { phone }), ...(isOwnerSlot !== undefined && { isOwnerSlot }), ...(hasWon !== undefined && { hasWon }) } })
    if (username) await prisma.solMemberAccount.updateMany({ where: { memberId }, data: { username: username.toLowerCase().trim(), memberName: name || member.name } })
    return res.json({ message: 'Manm ajou avèk siksè!', member })
  } catch (err) {
    console.error('[SOL SUPERADMIN PATCH MEMBER]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

module.exports = router