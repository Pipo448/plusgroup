const express = require('express')
const router  = express.Router()
const ctrl    = require('./sabotay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')
const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const prisma = new PrismaClient()

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

// GET /sabotay/admin/overview
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
      totalPlans:    plans.length,
      activePlans:   plans.filter(p => p.status === 'open' || p.status === 'active').length,
      totalMembers:  overview.reduce((a, p) => a + p.activeMembers, 0),
      totalRevenue:  overview.reduce((a, p) => a + p.expectedRevenue, 0),
      totalCollected:overview.reduce((a, p) => a + p.totalCollected, 0),
      totalTenants:  tenantIds.length,
    }
    return res.json({ success: true, overview, summary })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

// GET /sabotay/admin/plans?slug=tenant-slug
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

// GET /sabotay/admin/plans/:planId/members?slug=tenant-slug
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

// DELETE /sabotay/admin/plans/:planId
router.delete('/admin/plans/:planId', authSuperAdmin, async (req, res) => {
  try {
    await prisma.sabotayPlan.delete({ where: { id: req.params.planId } })
    return res.json({ success: true, message: 'Plan efase!' })
  } catch (e) {
    return res.status(400).json({ message: e.message })
  }
})

// PATCH /sabotay/admin/members/:memberId
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

router.get('/plans/stats',        ctrl.getStats)
router.get('/plans',              ctrl.getPlans)
router.get('/plans/:id',          ctrl.getPlan)
router.post('/plans',             ctrl.createPlan)
router.patch('/plans/:id',        ctrl.updatePlan)
router.put('/plans/:id',          ctrl.updatePlan)
router.delete('/plans/:id',       ctrl.deletePlan)

router.post('/plans/:id/blind-draw',                     ctrl.blindDraw)
router.post('/plans/:id/close',                          ctrl.closePlan)
router.post('/plans/:planId/members/:memberId/action',   ctrl.memberAction)

router.get('/plans/:planId/members',                     ctrl.getMembers)
router.post('/plans/:planId/members',                    ctrl.addMember)
router.patch('/plans/:planId/members/:id',               ctrl.updateMember)
router.delete('/plans/:planId/members/:id',              ctrl.removeMember)

router.get('/plans/:planId/payments',                    ctrl.getPayments)
router.post('/plans/:planId/members/:memberId/pay',      ctrl.markPaid)
router.delete('/payments/:paymentId',                    ctrl.unmarkPaid)

router.get('/plans/:planId/members/:memberId/account',   ctrl.getMemberAccount)

module.exports = router