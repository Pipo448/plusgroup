const express = require('express')
const router  = express.Router()
const ctrl    = require('./sabotay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')
const jwt = require('jsonwebtoken')
const prisma = require('../../config/prisma')// ✅ FIX: Chemen relatif kòrèk — menm dosye a
const rankingSvc = require('./position-ranking.service')
const svc = require('./sabotay.service')

// ── SUPER ADMIN middleware ─────────────────────────────────────
async function authSuperAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token obligatwa' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return res.status(403).json({ message: 'Aksè refize' })
    }
    req.adminPayload = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token pa valid' })
  }
}

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN ROUTES — ANVAN middleware tenant yo
// ══════════════════════════════════════════════════════════════

router.get('/admin/overview', authSuperAdmin, async (req, res) => {
  try {
    const plans = await prisma.sabotayPlan.findMany({
      include: {
        _count: { select: { members: { where: { isActive: true } } } },
        members: { where: { isActive: true }, include: { payments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    const tenantIds = [...new Set(plans.map(p => p.tenantId))]
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, logoUrl: true }
    })
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))
    const overview = plans.map(plan => {
      const activeMembers = plan.members.filter(m => m.status !== 'stopped')
      const feePerMember  = Number(plan.feePerMember || 0)
      return {
        id: plan.id, name: plan.name, status: plan.status,
        amount: Number(plan.amount), feePerMember, frequency: plan.frequency,
        activeMembers: activeMembers.length,
        totalCollected: activeMembers.reduce((acc, m) => acc + m.payments.length * Number(plan.amount), 0),
        expectedRevenue: feePerMember * activeMembers.length,
        tenant: tenantMap[plan.tenantId] || { name: 'Enkoni' },
        createdAt: plan.createdAt,
      }
    })
    const summary = {
      totalPlans:     plans.length,
      activePlans:    plans.filter(p => p.status === 'open' || p.status === 'active').length,
      totalMembers:   overview.reduce((a, p) => a + p.activeMembers, 0),
      totalRevenue:   overview.reduce((a, p) => a + p.expectedRevenue, 0),
      totalCollected: overview.reduce((a, p) => a + p.totalCollected, 0),
      totalTenants:   tenantIds.length,
    }
    return res.json({ success: true, overview, summary })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/admin/plans', authSuperAdmin, async (req, res) => {
  try {
    const { slug } = req.query
    if (!slug) return res.status(400).json({ message: 'slug obligatwa' })
    const tenant = await prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) return res.status(404).json({ message: 'Tenant pa jwenn' })
    const plans = await prisma.sabotayPlan.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { members: { where: { isActive: true } } } } },
      orderBy: { createdAt: 'desc' }
    })
    return res.json({ success: true, plans })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

router.get('/admin/plans/:planId/members', authSuperAdmin, async (req, res) => {
  try {
    const members = await prisma.sabotayMember.findMany({
      where: { planId: req.params.planId, isActive: true },
      include: { payments: { select: { id: true } } },
      orderBy: { position: 'asc' }
    })
    return res.json({ success: true, members })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

router.delete('/admin/plans/:planId', authSuperAdmin, async (req, res) => {
  try {
    await prisma.sabotayPlan.delete({ where: { id: req.params.planId } })
    return res.json({ success: true, message: 'Plan efase!' })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
})

router.patch('/admin/members/:memberId', authSuperAdmin, async (req, res) => {
  try {
    const member = await prisma.sabotayMember.update({
      where: { id: req.params.memberId },
      data: req.body
    })
    return res.json({ success: true, member })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
})

// ══════════════════════════════════════════════════════════════
// ROUT TENANT — pwoteje ak middleware
// ══════════════════════════════════════════════════════════════
router.use(identifyTenant, authenticate)

router.get('/plans/stats',  ctrl.getStats)
router.get('/plans',        ctrl.getPlans)
router.get('/plans/:id',    ctrl.getPlan)
router.post('/plans',       ctrl.createPlan)
router.patch('/plans/:id',  ctrl.updatePlan)
router.put('/plans/:id',    ctrl.updatePlan)
router.delete('/plans/:id', ctrl.deletePlan)

router.post('/plans/:id/blind-draw', ctrl.blindDraw)
router.post('/plans/:id/close',      ctrl.closePlan)

// ─────────────────────────────────────────────────────────────
// ✅ Toggle Pozisyon Dinamik
// ─────────────────────────────────────────────────────────────
router.patch('/plans/:planId/toggle-dynamic', async (req, res) => {
  try {
    const { planId } = req.params
    const tenantId   = req.tenant?.id || req.user?.tenantId
    const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
    if (!plan) return res.status(404).json({ message: 'Plan pa jwenn' })
    const newValue = !plan.dynamicPositions
    await prisma.sabotayPlan.update({ where: { id: planId }, data: { dynamicPositions: newValue } })
    let ranking = null
    if (newValue) ranking = await rankingSvc.recalculatePositions(planId).catch(() => null)
    return res.json({
      message: newValue ? '✅ Pozisyon Dinamik aktive!' : '⏹️ Pozisyon Dinamik dezaktive',
      dynamicPositions: newValue, ranking,
    })
  } catch (err) {
    console.error('[TOGGLE DYNAMIC]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ─────────────────────────────────────────────────────────────
// ✅ NOUVO: Toggle Lè Manyèl (kesye ka antre lè reyèl peman an)
// ─────────────────────────────────────────────────────────────
router.patch('/plans/:planId/toggle-manual-time', async (req, res) => {
  try {
    const { planId } = req.params
    const tenantId   = req.tenant?.id || req.user?.tenantId
    const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
    if (!plan) return res.status(404).json({ message: 'Plan pa jwenn' })
    const newValue = !plan.manualPaymentTime
    await prisma.sabotayPlan.update({ where: { id: planId }, data: { manualPaymentTime: newValue } })
    return res.json({
      message: newValue ? '✅ Lè Manyèl aktive!' : '⏹️ Lè Manyèl dezaktive',
      manualPaymentTime: newValue,
    })
  } catch (err) {
    console.error('[TOGGLE MANUAL TIME]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ─────────────────────────────────────────────────────────────
// ✅ NOUVO: Toggle Kache Pozisyon (manm kont sol pa dwe wè pozisyon)
// ─────────────────────────────────────────────────────────────
router.patch('/plans/:planId/toggle-hide-position', async (req, res) => {
  try {
    const { planId } = req.params
    const tenantId   = req.tenant?.id || req.user?.tenantId
    const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
    if (!plan) return res.status(404).json({ message: 'Plan pa jwenn' })
    const newValue = !plan.hidePositionInSol
    await prisma.sabotayPlan.update({ where: { id: planId }, data: { hidePositionInSol: newValue } })
    return res.json({
      message: newValue ? '🙈 Pozisyon kache pou manm yo!' : '👁️ Pozisyon vizib pou manm yo',
      hidePositionInSol: newValue,
    })
  } catch (err) {
    console.error('[TOGGLE HIDE POSITION]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ─────────────────────────────────────────────────────────────
// ✅ Rekalile Pozisyon Manyèlman
// ─────────────────────────────────────────────────────────────
router.post('/plans/:planId/recalculate', async (req, res) => {
  try {
    const { planId } = req.params
    const tenantId   = req.tenant?.id || req.user?.tenantId
    const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
    if (!plan) return res.status(404).json({ message: 'Plan pa jwenn' })
    if (!plan.dynamicPositions) return res.status(400).json({ message: 'Aktive pozisyon dinamik dabò' })
    const result = await rankingSvc.recalculatePositions(planId)
    return res.json({ message: '✅ Pozisyon rekalile!', ...result })
  } catch (err) {
    console.error('[RECALCULATE DETAIL]', err.message, err.meta) // ✅ AJOUTE err.meta
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ─────────────────────────────────────────────────────────────
// ✅ Snapshot Klasman
// ─────────────────────────────────────────────────────────────
router.get('/plans/:planId/ranking', async (req, res) => {
  try {
    const snapshot = await rankingSvc.getRankingSnapshot(req.params.planId)
    return res.json({ ranking: snapshot })
  } catch (err) {
    console.error('[RANKING SNAPSHOT]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/plans/:planId/members/:memberId/action', ctrl.memberAction)

router.get('/plans/:planId/members',        ctrl.getMembers)
router.patch('/plans/:planId/members/:id',  ctrl.updateMember)
router.delete('/plans/:planId/members/:id', ctrl.removeMember)

router.post('/plans/:planId/members/:memberId/adjust-position',
  async (req, res) => {
    try {
      const { planId, memberId } = req.params
      const { steps } = req.body
      const tenantId = req.tenant?.id || req.user?.tenantId
      const result = await svc.adjustMemberPosition(
        tenantId, planId, memberId, Number(steps)
      )
      return res.json({ success: true, ...result })
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }
  }
)

// ─────────────────────────────────────────────────────────────
// ✅ Ajoute Manm — jenere permanentId ANVAN controller
// ─────────────────────────────────────────────────────────────
router.post('/plans/:planId/members',
  async (req, res, next) => {
    try {
      req.body.permanentId = await rankingSvc.generatePermanentId(req.params.planId)
    } catch (err) {
      console.warn('[PERMANENT ID GEN]', err.message)
    }
    next()
  },
  ctrl.addMember,
)

// ─────────────────────────────────────────────────────────────
// ✅ Mache Peye — rekalile APRE peman
// ─────────────────────────────────────────────────────────────
router.post('/plans/:planId/members/:memberId/pay',
  (req, res, next) => {
    const planId   = req.params.planId
    const origJson = res.json.bind(res)
    res.json = function (data) {
      origJson(data)
      if (data && data.success !== false && !data.error) {
        rankingSvc.recalculatePositions(planId).catch(e =>
          console.warn('[AUTO RECALC AFTER PAY]', e.message)
        )
      }
    }
    next()
  },
  ctrl.markPaid,
)

router.get('/plans/:planId/payments',                  ctrl.getPayments)
router.delete('/payments/:paymentId',                  ctrl.unmarkPaid)
router.get('/plans/:planId/members/:memberId/account', ctrl.getMemberAccount)

router.get('/sol-account', async (req, res) => {
  try {
    const { phone } = req.query
    if (!phone) return res.json({ account: null })
    const { tenantId } = req.user
    const clean = phone.replace(/\s/g, '').trim()
    const account = await prisma.solMemberAccount.findFirst({
      where: { memberPhone: clean, tenantId },
      select: { id: true, username: true, plainPassword: true, memberName: true, memberPhone: true, tenantId: true }
    })
    return res.json({ account: account || null })
  } catch (err) {
    console.error('[SOL ACCOUNT BY PHONE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/admin-cash', async (req, res) => {
  try {
    const { tenantId } = req.user
    const { planId }   = req.query
    const result = await svc.getAdminCash(tenantId, planId || null)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[ADMIN CASH]', err)
    return res.status(500).json({ message: err.message })
  }
})

router.patch('/plans/:planId/exchange-config', async (req, res) => {
  try {
    const { planId } = req.params
    const tenantId   = req.tenant.id
    const { exchangeFeePct, exchangeFeeAdminPct } = req.body
    const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
    if (!plan) return res.status(404).json({ message: 'Plan pa jwenn.' })
    const updated = await prisma.sabotayPlan.update({
      where: { id: planId },
      data: {
        ...(exchangeFeePct      !== undefined && { exchangeFeePct:      Number(exchangeFeePct) }),
        ...(exchangeFeeAdminPct !== undefined && { exchangeFeeAdminPct: Number(exchangeFeeAdminPct) }),
      }
    })
    return res.json({ success: true, plan: updated })
  } catch (e) {
    console.error('[EXCHANGE CONFIG]', e)
    return res.status(500).json({ message: e.message })
  }
})

module.exports = router