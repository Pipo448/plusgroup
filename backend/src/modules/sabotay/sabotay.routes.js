// backend/src/modules/sabotay/sabotay.routes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('./sabotay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')

// Tout rout yo pwoteje
router.use(identifyTenant, authenticate)

// ── Plans ──────────────────────────────────────────────────────
// ✅ FIX: /plans/stats DWE vini ANVAN /plans/:id
//    Sinon Express ap match "stats" kòm yon :id — ctrl.getStats pa janm rele
router.get('/plans/stats',        ctrl.getStats)   // ← ANVAN :id
router.get('/plans',              ctrl.getPlans)
router.get('/plans/:id',          ctrl.getPlan)
router.post('/plans',             ctrl.createPlan)
router.patch('/plans/:id',        ctrl.updatePlan)
router.put('/plans/:id',          ctrl.updatePlan)  // ✅ FIX: frontend voye PUT, backend te gen PATCH sèlman
router.delete('/plans/:id',       ctrl.deletePlan)

// ── Tiraj Avèg ────────────────────────────────────────────────
// ✅ NOUVO: endpoint pou blind draw
router.post('/plans/:id/blind-draw', ctrl.blindDraw)
// ── Fèmen Plan (Admin) ─────────────────────────────────────────
router.post('/plans/:id/close',                          ctrl.closePlan)

// ── Aksyon sou Manm (bloke, debloke, kanpe, reprann) ──────────
router.post('/plans/:planId/members/:memberId/action',   ctrl.memberAction)


// ── Manm ──────────────────────────────────────────────────────
router.get('/plans/:planId/members',            ctrl.getMembers)
router.post('/plans/:planId/members',           ctrl.addMember)
router.patch('/plans/:planId/members/:id',      ctrl.updateMember)
router.delete('/plans/:planId/members/:id',     ctrl.removeMember)

// ── Peman ─────────────────────────────────────────────────────
router.get('/plans/:planId/payments',                    ctrl.getPayments)
router.post('/plans/:planId/members/:memberId/pay',      ctrl.markPaid)
router.delete('/payments/:paymentId',                    ctrl.unmarkPaid)

// ── Kont vityèl manm (lekti sèlman) ──────────────────────────
router.get('/plans/:planId/members/:memberId/account',   ctrl.getMemberAccount)

// ── SUPER ADMIN: wè tout plan Sol pou tout tenant ──
router.get('/admin/overview', async (req, res) => {
  try {
    const { token } = req.headers.authorization?.replace('Bearer ', '') 
      ? { token: req.headers.authorization.replace('Bearer ', '') } 
      : { token: null }
    
    if (!token) return res.status(401).json({ message: 'Token obligatwa' })
    
    const jwt = require('jsonwebtoken')
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return res.status(403).json({ message: 'Aksè refize' })
    }

    const plans = await prisma.sabotayPlan.findMany({
      include: {
        _count: { select: { members: { where: { isActive: true } } } },
        members: {
          where: { isActive: true },
          include: { payments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Jwenn tenant info pou chak plan
    const tenantIds = [...new Set(plans.map(p => p.tenantId))]
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, logoUrl: true }
    })
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]))

    const overview = plans.map(plan => {
      const activeMembers = plan.members.filter(m => m.status !== 'stopped')
      const totalSlots = activeMembers.reduce((acc, m) => {
        return acc + ((m.positions?.length) || 1)
      }, 0)
      const totalCollected = activeMembers.reduce((acc, m) =>
        acc + m.payments.length * Number(plan.amount), 0)
      const feePerMember = Number(plan.feePerMember || 0)
      const expectedRevenue = feePerMember * activeMembers.length

      return {
        id: plan.id,
        name: plan.name,
        status: plan.status,
        amount: Number(plan.amount),
        feePerMember,
        frequency: plan.frequency,
        activeMembers: activeMembers.length,
        totalSlots,
        totalCollected,
        expectedRevenue,
        tenant: tenantMap[plan.tenantId] || { name: 'Enkoni' },
        createdAt: plan.createdAt,
      }
    })

    // Rezime global
    const summary = {
      totalPlans: plans.length,
      activePlans: plans.filter(p => p.status === 'open' || p.status === 'active').length,
      totalMembers: overview.reduce((a, p) => a + p.activeMembers, 0),
      totalRevenue: overview.reduce((a, p) => a + p.expectedRevenue, 0),
      totalCollected: overview.reduce((a, p) => a + p.totalCollected, 0),
      totalTenants: tenantIds.length,
    }

    return res.json({ success: true, overview, summary })
  } catch (err) {
    console.error('[SABOTAY ADMIN OVERVIEW]', err)
    return res.status(500).json({ message: err.message })
  }
})

module.exports = router
