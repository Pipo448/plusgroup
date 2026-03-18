// src/routes/sol.routes.js
// API pou pòtal manm Sabotay Sol
// Mount: app.use('/api/sol', solRouter)

const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const router   = express.Router()
const prisma   = new PrismaClient()

// ✅ Sol Push Service
const solPushSvc  = require('../modules/sabotay/sol-push.service')

// ✅ Sol Exchange Service — Mache Men Sol
const exchangeSvc = require('../modules/sabotay/sol-exchange.service')

const SOL_JWT_SECRET = process.env.JWT_SECRET || 'plusgroup-sol-secret-change-me'

// ─────────────────────────────────────────────────────────────
// HELPER: Kalkile timing (early / onTime / late)
// ─────────────────────────────────────────────────────────────
function computeTiming(dueDate, paidAt) {
  const due  = new Date(dueDate).toISOString().split('T')[0]
  const paid = new Date(paidAt).toISOString().split('T')[0]
  if (paid < due) return 'early'
  if (paid > due) return 'late'
  return 'onTime'
}

// ─────────────────────────────────────────────────────────────
// HELPER: Bati maps payments + paymentTimings
// ─────────────────────────────────────────────────────────────
function buildPaymentMaps(sabotayPayments) {
  const payments       = {}
  const paymentTimings = {}
  for (const p of sabotayPayments) {
    const dateKey = new Date(p.dueDate).toISOString().split('T')[0]
    payments[dateKey]       = true
    paymentTimings[dateKey] = computeTiming(p.dueDate, p.paidAt)
  }
  return { payments, paymentTimings }
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: Verifye token manm sol
// ─────────────────────────────────────────────────────────────
function authMember(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token manke' })
  try {
    const payload = jwt.verify(token, SOL_JWT_SECRET)
    if (payload.role !== 'sol_member') {
      return res.status(401).json({ message: 'Token pa valid pou manm sol' })
    }
    req.solMember = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token ekspire oswa pa valid' })
  }
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: Verifye token admin
// ─────────────────────────────────────────────────────────────
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token admin obligatwa' })
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Token admin pa valid' })
  }
}

// ══════════════════════════════════════════════════════════════
// POST /api/sol/auth/login
// ══════════════════════════════════════════════════════════════
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ message: 'Non itilizatè ak modpas obligatwa' })
    }

    const account = await prisma.solMemberAccount.findUnique({
      where: { username: username.toLowerCase().trim() },
    })
    if (!account) {
      return res.status(401).json({ message: 'Non itilizatè oswa modpas pa kòrèk' })
    }

    const valid = await bcrypt.compare(password, account.passwordHash)
    if (!valid) {
      return res.status(401).json({ message: 'Non itilizatè oswa modpas pa kòrèk' })
    }

    const tenant = await prisma.tenant.findUnique({
      where:  { id: account.tenantId },
      select: { id: true, name: true, phone: true, address: true, logoUrl: true },
    })

    const token = jwt.sign(
      {
        role:      'sol_member',
        accountId: account.id,
        memberId:  account.memberId,
        planId:    account.planId,
        tenantId:  account.tenantId,
      },
      SOL_JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      token,
      member: {
        id:       account.memberId,
        name:     account.memberName,
        phone:    account.memberPhone,
        position: account.memberPosition,
      },
      tenant: tenant ? { ...tenant, businessName: tenant.name } : null,
    })
  } catch (err) {
    console.error('[SOL LOGIN]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// POST /api/sol/auth/change-password
// ══════════════════════════════════════════════════════════════
router.post('/auth/change-password', authMember, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Tout champ yo obligatwa' })
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Modpas nouvo dwe gen omwen 4 karaktè' })
    }

    const account = await prisma.solMemberAccount.findUnique({
      where: { id: req.solMember.accountId },
    })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })

    const valid = await bcrypt.compare(currentPassword, account.passwordHash)
    if (!valid) return res.status(401).json({ message: 'Modpas aktyèl la pa kòrèk' })

    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.solMemberAccount.update({
      where: { id: account.id },
      data: { passwordHash: newHash, plainPassword: newPassword },
    })

    return res.json({ message: 'Modpas chanje avèk siksè' })
  } catch (err) {
    console.error('[SOL CHANGE-PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// GET /api/sol/members/me
// ══════════════════════════════════════════════════════════════
router.get('/members/me', authMember, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findUnique({
      where: { id: req.solMember.accountId },
    })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })

    const sabotayMember = await prisma.sabotayMember.findUnique({
      where: { id: account.memberId },
      include: {
        plan:     true,
        payments: { orderBy: { dueDate: 'asc' } },
      },
    })
    if (!sabotayMember) {
      return res.status(404).json({ message: 'Manm pa jwenn nan SabotayMember' })
    }

    const plan = sabotayMember.plan
    const { payments, paymentTimings } = buildPaymentMaps(sabotayMember.payments)

    const tenant = await prisma.tenant.findUnique({
      where:  { id: account.tenantId },
      select: { id: true, name: true, phone: true, address: true, logoUrl: true },
    })

    return res.json({
      member: {
        id:             sabotayMember.id,
        name:           sabotayMember.name,
        phone:          sabotayMember.phone || '',
        position:       sabotayMember.position,
        payments,
        paymentTimings,
      },
      plan: {
        id:            plan.id,
        name:          plan.name,
        amount:        Number(plan.amount),
        fee:           Number(plan.fee),
        frequency:     plan.frequency,
        maxMembers:    plan.maxMembers,
        createdAt:     plan.startDate.toISOString().split('T')[0],
        dueTime:       account.planDueTime      || '08:00',
        interval:      account.planInterval     || 1,
        feePerMember:  account.planFeePerMember || 0,
        penalty:       account.planPenalty      || 0,
        regleman:      account.planRegleman     || null,
      },
      tenant: tenant ? { ...tenant, businessName: tenant.name } : null,
    })
  } catch (err) {
    console.error('[SOL ME]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// POST /api/sol/accounts   (admin sèlman)
// ══════════════════════════════════════════════════════════════
router.post('/accounts', authAdmin, async (req, res) => {
  try {
    const { memberId, tenantId, dueTime, credentials } = req.body

    if (!memberId || !tenantId || !credentials?.username || !credentials?.password) {
      return res.status(400).json({
        message: 'memberId, tenantId, credentials.username, credentials.password obligatwa',
      })
    }

    const sabotayMember = await prisma.sabotayMember.findUnique({
      where:   { id: memberId },
      include: { plan: true },
    })
    if (!sabotayMember) {
      return res.status(404).json({ message: 'Manm pa jwenn nan SabotayMember' })
    }

    if (sabotayMember.plan.tenantId !== tenantId) {
      return res.status(403).json({ message: 'Manm sa pa nan tenant ou a' })
    }

    const existing = await prisma.solMemberAccount.findUnique({
      where: { username: credentials.username.toLowerCase().trim() },
    })
    if (existing) {
      return res.status(409).json({ message: 'Non itilizatè sa deja pran' })
    }

    const existingByMember = await prisma.solMemberAccount.findFirst({
      where: { memberId: sabotayMember.id },
    })
    if (existingByMember) {
      return res.status(409).json({
        message: `Manm sa gen deja yon kont (${existingByMember.username})`,
      })
    }

    const rawPassword  = credentials.password
    const passwordHash = await bcrypt.hash(rawPassword, 10)
    const plan         = sabotayMember.plan

    const account = await prisma.solMemberAccount.create({
      data: {
        username:         credentials.username.toLowerCase().trim(),
        passwordHash,
        plainPassword:    rawPassword,
        tenantId,
        memberId:         sabotayMember.id,
        memberName:       sabotayMember.name,
        memberPhone:      sabotayMember.phone || '',
        memberPosition:   sabotayMember.position,
        planId:           plan.id,
        planName:         plan.name,
        planAmount:       Number(plan.amount),
        planFee:          Number(plan.fee),
        planFrequency:    plan.frequency,
        planMaxMembers:   plan.maxMembers,
        planCreatedAt:    plan.startDate.toISOString().split('T')[0],
        planDueTime:      dueTime || '08:00',
        planInterval:     Number(plan.interval     || 1),
        planFeePerMember: Number(plan.feePerMember || 0),
        planPenalty:      Number(plan.penalty      || 0),
        planRegleman:     plan.regleman            || null,
        payments:         {},
        paymentTimings:   {},
        fines:            {},
      },
    })

    return res.status(201).json({
      message:   'Kont kreye!',
      accountId: account.id,
      username:  account.username,
    })
  } catch (err) {
    console.error('[SOL CREATE ACCOUNT]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// GET /api/sol/members/:memberId/check   (admin)
// ══════════════════════════════════════════════════════════════
router.get('/members/:memberId/check', authAdmin, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findFirst({
      where:  { memberId: req.params.memberId },
      select: { id: true, username: true, createdAt: true },
    })
    return res.json({ hasAccount: !!account, account: account || null })
  } catch (err) {
    console.error('[SOL CHECK]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// GET /api/sol/accounts?tenantId=xxx&planId=xxx  (admin)
// ══════════════════════════════════════════════════════════════
router.get('/accounts', authAdmin, async (req, res) => {
  try {
    const { tenantId, planId } = req.query
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId obligatwa' })
    }

    const accounts = await prisma.solMemberAccount.findMany({
      where: {
        tenantId,
        ...(planId && { planId }),
      },
      select: {
        id:             true,
        username:       true,
        plainPassword:  true,
        memberName:     true,
        memberPhone:    true,
        memberPosition: true,
        planName:       true,
        createdAt:      true,
      },
      orderBy: { memberPosition: 'asc' },
    })

    return res.json({ accounts })
  } catch (err) {
    console.error('[SOL ACCOUNTS LIST]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// PATCH /api/sol/accounts/:accountId/reset-password  (admin)
// ══════════════════════════════════════════════════════════════
router.patch('/accounts/:accountId/reset-password', authAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'Modpas dwe gen omwen 4 karaktè' })
    }

    const account = await prisma.solMemberAccount.findUnique({
      where: { id: req.params.accountId },
    })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.solMemberAccount.update({
      where: { id: account.id },
      data:  { passwordHash, plainPassword: newPassword },
    })

    return res.json({ message: 'Modpas reset avèk siksè', username: account.username })
  } catch (err) {
    console.error('[SOL RESET PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// ✅ PUSH NOTIFICATIONS — Manm Sol
// ══════════════════════════════════════════════════════════════

// GET /api/sol/push/vapid-public-key  (piblik)
router.get('/push/vapid-public-key', (req, res) => {
  res.json({
    success:   true,
    publicKey: process.env.VAPID_PUBLIC_KEY ||
      'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
  })
})

// POST /api/sol/push/subscribe
router.post('/push/subscribe', authMember, async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription) {
      return res.status(400).json({ message: 'Subscription obligatwa' })
    }
    const account = await prisma.solMemberAccount.findUnique({
      where: { id: req.solMember.accountId }
    })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })

    await solPushSvc.saveSolSubscription(
      account.tenantId,
      account.id,
      account.memberId,
      subscription
    )
    return res.json({ success: true, message: 'Push subscription anrejistre.' })
  } catch (err) {
    console.error('[SOL PUSH SUBSCRIBE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// DELETE /api/sol/push/unsubscribe
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
// ✅ MACHE MEN SOL — Echanj Pozisyon
// ══════════════════════════════════════════════════════════════

// GET /api/sol/exchange/:planId/offers — wè ofri piblik yo
router.get('/exchange/:planId/offers', authMember, async (req, res) => {
  try {
    const { planId } = req.params
    const { tenantId, accountId } = req.solMember
    const offers = await exchangeSvc.getPublicOffers(tenantId, planId, accountId)
    return res.json({ success: true, offers })
  } catch (err) {
    console.error('[SOL EXCHANGE OFFERS]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

// GET /api/sol/exchange/:planId/my — istwa echanj manm nan
router.get('/exchange/:planId/my', authMember, async (req, res) => {
  try {
    const { planId } = req.params
    const { tenantId, accountId } = req.solMember
    const exchanges = await exchangeSvc.getMemberExchanges(tenantId, accountId, planId)
    return res.json({ success: true, exchanges })
  } catch (err) {
    console.error('[SOL EXCHANGE MY]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

// POST /api/sol/exchange/:planId/initiate — inisye yon ofri
router.post('/exchange/:planId/initiate', authMember, async (req, res) => {
  try {
    const { planId } = req.params
    const { tenantId, accountId } = req.solMember
    const exchange = await exchangeSvc.initiateExchange(tenantId, planId, accountId, req.body)
    return res.status(201).json({ success: true, exchange })
  } catch (err) {
    console.error('[SOL EXCHANGE INITIATE]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

// POST /api/sol/exchange/:exchangeId/accept — aksepte yon ofri
router.post('/exchange/:exchangeId/accept', authMember, async (req, res) => {
  try {
    const { exchangeId } = req.params
    const { tenantId, accountId } = req.solMember
    const result = await exchangeSvc.acceptExchange(tenantId, exchangeId, accountId)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL EXCHANGE ACCEPT]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

// POST /api/sol/exchange/:exchangeId/reject — refize / anile yon ofri
router.post('/exchange/:exchangeId/reject', authMember, async (req, res) => {
  try {
    const { exchangeId } = req.params
    const { tenantId, accountId } = req.solMember
    const result = await exchangeSvc.rejectExchange(tenantId, exchangeId, accountId)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL EXCHANGE REJECT]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

// ── ADMIN: GET /api/sol/admin/exchange — tout echanj
router.get('/admin/exchange', authAdmin, async (req, res) => {
  try {
    const { tenantId, planId, status, page, limit } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const result = await exchangeSvc.getAdminExchanges(
      tenantId, planId,
      { status, page: Number(page) || 1, limit: Number(limit) || 20 }
    )
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL ADMIN EXCHANGE]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

// ── ADMIN: PATCH /api/sol/admin/exchange/:planId/config — konfigire % frè
router.patch('/admin/exchange/:planId/config', authAdmin, async (req, res) => {
  try {
    const { planId }   = req.params
    const { tenantId } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const plan = await exchangeSvc.updateExchangeConfig(tenantId, planId, null, req.body)
    return res.json({ success: true, plan })
  } catch (err) {
    console.error('[SOL ADMIN EXCHANGE CONFIG]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

// ══════════════════════════════════════════════════════════════
// GET /api/sol/account-by-phone?phone=xxx&tenantId=xxx  (admin)
// ══════════════════════════════════════════════════════════════
router.get('/account-by-phone', authAdmin, async (req, res) => {
  try {
    const { phone, tenantId } = req.query
    if (!phone) return res.json({ account: null })

    const clean = phone.replace(/\s/g, '').trim()
    const account = await prisma.solMemberAccount.findFirst({
      where: { memberPhone: clean, ...(tenantId && { tenantId }) },
      select: {
        id: true, username: true, plainPassword: true,
        memberName: true, memberPhone: true, tenantId: true,
      }
    })
    return res.json({ account: account || null })
  } catch (err) {
    console.error('[SOL ACCOUNT BY PHONE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// DEBUG TEMP — retire apre
router.get('/debug/accounts', async (req, res) => {
  try {
    const accounts = await prisma.solMemberAccount.findMany({
      select: { username: true, memberName: true, tenantId: true, passwordHash: true }
    })
    return res.json({ count: accounts.length, accounts })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router