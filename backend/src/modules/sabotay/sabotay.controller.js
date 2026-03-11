// backend/src/modules/sabotay/sabotay.controller.js
const svc = require('./sabotay.service')

const getCtx = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.headers['x-branch-id'] || null,
  userId:   req.user.id,
})

// ── Plans ──────────────────────────────────────────────────────

// GET /sabotay/plans/stats
exports.getStats = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const stats = await svc.getStats(tenantId, branchId)
    res.json({ success: true, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// GET /sabotay/plans
exports.getPlans = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const result = await svc.getPlans(tenantId, branchId, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// GET /sabotay/plans/:id
exports.getPlan = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const plan = await svc.getPlanById(tenantId, req.params.id)
    res.json({ success: true, plan })
  } catch (e) {
    res.status(404).json({ success: false, message: e.message })
  }
}

// POST /sabotay/plans
exports.createPlan = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getCtx(req)
    const plan = await svc.createPlan(tenantId, branchId, userId, req.body)
    res.status(201).json({ success: true, plan })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// PATCH + PUT /sabotay/plans/:id
exports.updatePlan = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const plan = await svc.updatePlan(tenantId, req.params.id, userId, req.body)
    res.json({ success: true, plan })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// DELETE /sabotay/plans/:id
exports.deletePlan = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    await svc.deletePlan(tenantId, req.params.id)
    res.json({ success: true, message: 'Plan efase.' })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Tiraj Avèg ────────────────────────────────────────────────

// POST /sabotay/plans/:id/blind-draw
exports.blindDraw = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const result = await svc.blindDraw(tenantId, req.params.id, userId, req.body)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Manm ──────────────────────────────────────────────────────

// GET /sabotay/plans/:planId/members
exports.getMembers = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const members = await svc.getMembers(tenantId, req.params.planId)
    res.json({ success: true, members })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// POST /sabotay/plans/:planId/members
exports.addMember = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const member = await svc.addMember(tenantId, req.params.planId, userId, req.body)
    res.status(201).json({ success: true, member })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// PATCH /sabotay/plans/:planId/members/:id
exports.updateMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const member = await svc.updateMember(tenantId, req.params.planId, req.params.id, req.body)
    res.json({ success: true, member })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// DELETE /sabotay/plans/:planId/members/:id
exports.removeMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    await svc.removeMember(tenantId, req.params.planId, req.params.id)
    res.json({ success: true, message: 'Manm retire.' })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Peman ─────────────────────────────────────────────────────

// GET /sabotay/plans/:planId/payments
exports.getPayments = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const payments = await svc.getPayments(tenantId, req.params.planId, req.query)
    res.json({ success: true, payments })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// POST /sabotay/plans/:planId/members/:memberId/pay
exports.markPaid = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const payment = await svc.markPaid(tenantId, req.params.planId, req.params.memberId, userId, req.body)
    res.status(201).json({ success: true, payment })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// DELETE /sabotay/payments/:paymentId
exports.unmarkPaid = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    await svc.unmarkPaid(tenantId, req.params.paymentId)
    res.json({ success: true, message: 'Peman retire.' })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Kont vityèl ───────────────────────────────────────────────

// GET /sabotay/plans/:planId/members/:memberId/account
exports.getMemberAccount = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const account = await svc.getMemberAccount(tenantId, req.params.planId, req.params.memberId)
    res.json({ success: true, account })
  } catch (e) {
    res.status(404).json({ success: false, message: e.message })
  }
}

// ── Fèmen Plan ────────────────────────────────────────────────

// POST /sabotay/plans/:id/close
exports.closePlan = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const plan = await svc.closePlan(tenantId, req.params.id, userId)
    res.json({ success: true, plan })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Aksyon sou Manm ───────────────────────────────────────────

// POST /sabotay/plans/:planId/members/:memberId/action
exports.memberAction = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const result = await svc.memberAction(
      tenantId, req.params.planId, req.params.memberId, userId, req.body
    )
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}
