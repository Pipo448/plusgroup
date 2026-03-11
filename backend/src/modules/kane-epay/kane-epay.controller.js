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
    console.error('❌ KANE getStats ERROR:', e.message)
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
    console.error('❌ KANE getAccounts ERROR:', e.message)
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
    console.error('❌ KANE getAccount ERROR:', e.message)
    res.status(404).json({ success: false, message: e.message })
  }
}

// POST /kane-epay
exports.createAccount = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getTenantAndBranch(req)
    console.log('📥 KANE CREATE — body:', JSON.stringify(req.body, null, 2))
    const account = await svc.createAccount(tenantId, branchId, userId, req.body)
    console.log('✅ KANE CREATE — success:', account.accountNumber)
    res.status(201).json({ success: true, account })
  } catch (e) {
    console.error('❌ KANE CREATE ERROR:', e.message)
    console.error('❌ KANE CREATE STACK:', e.stack)
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
    console.error('❌ KANE deposit ERROR:', e.message)
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
    console.error('❌ KANE withdraw ERROR:', e.message)
    res.status(400).json({ success: false, message: e.message })
  }
}