// backend/src/modules/kane-epay/kane-epay.controller.js
const svc = require('./kane-epay.service')

const getTenantAndBranch = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.headers['x-branch-id'] || null,
  userId:   req.user.id,
})

// GET /kane-epay/stats
exports.getStats = async (req, res) => {
  try {
    const { tenantId, branchId } = getTenantAndBranch(req)
    const stats = await svc.getStats(tenantId, branchId)
    res.json({ success: true, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// GET /kane-epay
exports.getAccounts = async (req, res) => {
  try {
    const { tenantId, branchId } = getTenantAndBranch(req)
    const result = await svc.getAccounts(tenantId, branchId, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// GET /kane-epay/:id
exports.getAccount = async (req, res) => {
  try {
    const { tenantId } = getTenantAndBranch(req)
    const account = await svc.getAccountById(tenantId, req.params.id)
    res.json({ success: true, account })
  } catch (e) {
    res.status(404).json({ success: false, message: e.message })
  }
}

// POST /kane-epay
exports.createAccount = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getTenantAndBranch(req)
    const account = await svc.createAccount(tenantId, branchId, userId, req.body)
    res.status(201).json({ success: true, account })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// POST /kane-epay/:id/deposit
exports.deposit = async (req, res) => {
  try {
    const { tenantId, userId } = getTenantAndBranch(req)
    const result = await svc.deposit(tenantId, req.params.id, userId, req.body)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// POST /kane-epay/:id/withdraw
exports.withdraw = async (req, res) => {
  try {
    const { tenantId, userId } = getTenantAndBranch(req)
    const result = await svc.withdraw(tenantId, req.params.id, userId, req.body)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}
