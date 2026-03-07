// src/routes/sol.routes.js
// API pou pòtal manm Sabotay Sol
// Mount: app.use('/api/sol', solRouter)

import express from 'express'
import bcrypt  from 'bcryptjs'
import jwt     from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

const SOL_JWT_SECRET = process.env.JWT_SECRET || 'plusgroup-sol-secret-change-me'

// ─────────────────────────────────────────────────────────────
// HELPER: Kalkile timing (early / onTime / late)
// dueDate : @db.Date       → jou ki te prevwa pou peman an
// paidAt  : @db.Timestamptz → lè reyèl manm peye a
// Lojik: si manm peye anvan jou a  → early
//        si menm jou                → onTime
//        si apre jou a              → late
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
// depi vrè enregisteman SabotayPayment yo
// Retounen: { payments: {"2025-03-01": true, ...}, paymentTimings: {...} }
// ─────────────────────────────────────────────────────────────
function buildPaymentMaps(sabotayPayments) {
  const payments       = {}
  const paymentTimings = {}
  for (const p of sabotayPayments) {
    // dueDate se @db.Date — pran pati dat la sèlman (YYYY-MM-DD)
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
// Body: { username, password }
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

    // ✅ Tenant: champ ki egziste se 'name' — pa 'businessName'
    const tenant = await prisma.tenant.findUnique({
      where: { id: account.tenantId },
      select: {
        id:      true,
        name:    true,
        phone:   true,
        address: true,
        logoUrl: true,
      },
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
      // Aliyas name → businessName pou frontend SolDashboardPage aksepte li
      tenant: tenant ? { ...tenant, businessName: tenant.name } : null,
    })
  } catch (err) {
    console.error('[SOL LOGIN]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// POST /api/sol/auth/change-password
// Headers: Authorization: Bearer <token manm>
// Body: { currentPassword, newPassword }
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
      data:  { passwordHash: newHash },
    })

    return res.json({ message: 'Modpas chanje avèk siksè' })
  } catch (err) {
    console.error('[SOL CHANGE-PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// GET /api/sol/members/me
// Headers: Authorization: Bearer <token manm>
// ✅ Li done yo dirèkteman depi SabotayMember + SabotayPlan + SabotayPayment
// ══════════════════════════════════════════════════════════════
router.get('/members/me', authMember, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findUnique({
      where: { id: req.solMember.accountId },
    })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })

    // ✅ Li manm reyèl + plan + tout peman li yo
    const sabotayMember = await prisma.sabotayMember.findUnique({
      where: { id: account.memberId },
      include: {
        plan: true,              // SabotayPlan
        payments: {              // SabotayPayment[]
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    if (!sabotayMember) {
      return res.status(404).json({ message: 'Manm pa jwenn nan SabotayMember' })
    }

    const plan = sabotayMember.plan

    // ✅ Kalkile payments + timings depi dueDate vs paidAt reyèl
    const { payments, paymentTimings } = buildPaymentMaps(sabotayMember.payments)

    // ✅ Tenant.name — pa businessName (pa egziste nan schema)
    const tenant = await prisma.tenant.findUnique({
      where: { id: account.tenantId },
      select: {
        id:      true,
        name:    true,
        phone:   true,
        address: true,
        logoUrl: true,
      },
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
        id:         plan.id,
        name:       plan.name,
        // ✅ amount se Decimal nan Prisma — konvèti an Number
        amount:     Number(plan.amount),
        fee:        Number(plan.fee),
        frequency:  plan.frequency,
        maxMembers: plan.maxMembers,
        // ✅ SabotayPlan gen 'startDate' (@db.Timestamptz) — pa 'createdAt'
        // Frontend (SolDashboardPage) atann 'createdAt' kòm string YYYY-MM-DD
        createdAt:  plan.startDate.toISOString().split('T')[0],
        dueTime:    account.planDueTime || '08:00',
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
// Kreye kont aksè pou yon manm sabotay ki deja egziste
// Body: { memberId, tenantId, dueTime, credentials: { username, password } }
// NOTE: planId pa obligatwa nan body — nou li li depi SabotayMember.planId
// ══════════════════════════════════════════════════════════════
router.post('/accounts', authAdmin, async (req, res) => {
  try {
    const { memberId, tenantId, dueTime, credentials } = req.body

    if (!memberId || !tenantId || !credentials?.username || !credentials?.password) {
      return res.status(400).json({
        message: 'memberId, tenantId, credentials.username, credentials.password obligatwa',
      })
    }

    // ✅ Jwenn manm reyèl + plan li depi SabotayMember
    const sabotayMember = await prisma.sabotayMember.findUnique({
      where: { id: memberId },
      include: { plan: true },
    })
    if (!sabotayMember) {
      return res.status(404).json({ message: 'Manm pa jwenn nan SabotayMember' })
    }

    // Verifye si manm nan bon tenant an
    if (sabotayMember.plan.tenantId !== tenantId) {
      return res.status(403).json({ message: 'Manm sa pa nan tenant ou a' })
    }

    // Chèche si username deja pran (global — yon manm pa ka gen 2 kont)
    const existing = await prisma.solMemberAccount.findUnique({
      where: { username: credentials.username.toLowerCase().trim() },
    })
    if (existing) {
      return res.status(409).json({ message: 'Non itilizatè sa deja pran' })
    }

    // Verifye si manm sa gen deja yon kont
    const existingByMember = await prisma.solMemberAccount.findFirst({
      where: { memberId: sabotayMember.id },
    })
    if (existingByMember) {
      return res.status(409).json({
        message: `Manm sa gen deja yon kont (${existingByMember.username})`,
      })
    }

    const passwordHash = await bcrypt.hash(credentials.password, 10)
    const plan = sabotayMember.plan

    const account = await prisma.solMemberAccount.create({
      data: {
        username:        credentials.username.toLowerCase().trim(),
        passwordHash,
        tenantId,
        memberId:        sabotayMember.id,
        memberName:      sabotayMember.name,
        memberPhone:     sabotayMember.phone || '',
        memberPosition:  sabotayMember.position,
        planId:          plan.id,
        planName:        plan.name,
        planAmount:      Number(plan.amount),
        planFee:         Number(plan.fee),
        planFrequency:   plan.frequency,
        planMaxMembers:  plan.maxMembers,
        // ✅ SabotayPlan.startDate (@db.Timestamptz) → string YYYY-MM-DD
        planCreatedAt:   plan.startDate.toISOString().split('T')[0],
        planDueTime:     dueTime || '08:00',
        // payments + paymentTimings pa sèvi pou GET /me ankò (nou li depi SabotayPayment)
        // men nou kite yo nan schema pou referans oswa cache opsyonèl
        payments:        {},
        paymentTimings:  {},
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
// Verifye si yon manm gen deja yon kont sol
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

export default router
