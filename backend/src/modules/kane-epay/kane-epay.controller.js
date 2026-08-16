// backend/src/modules/kane-epay/kane-epay.controller.js
const svc = require('./kane-epay.service')
const prisma = require('../../config/prisma')
const { verifyPin } = require('../security/pin.service')
const getTenantAndBranch = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.branchId || null,
  userId:   req.user.id,
})

const isAdmin = (req) => req.user?.role === 'admin' || req.user?.isAdmin === true

exports.getStats = async (req, res) => {
  try {
    const { tenantId, branchId } = getTenantAndBranch(req)
    const stats = await svc.getStats(tenantId, branchId)
    res.json({ success: true, stats })
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
}

exports.getAccounts = async (req, res) => {
  try {
    const { tenantId, branchId } = getTenantAndBranch(req)
    const result = await svc.getAccounts(tenantId, branchId, req.query)
    res.json({ success: true, ...result })
  } catch (e) { res.status(500).json({ success: false, message: e.message }) }
}

exports.getAccount = async (req, res) => {
  try {
    const { tenantId } = getTenantAndBranch(req)
    const account = await svc.getAccountById(tenantId, req.params.id)
    res.json({ success: true, account })
  } catch (e) { res.status(404).json({ success: false, message: e.message }) }
}

exports.createAccount = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getTenantAndBranch(req)
    const account = await svc.createAccount(tenantId, branchId, userId, req.body)
    res.status(201).json({ success: true, account })
  } catch (e) { res.status(400).json({ success: false, message: e.message }) }
}

exports.deposit = async (req, res) => {
  try {
    const { tenantId, userId } = getTenantAndBranch(req)
    const result = await svc.deposit(tenantId, req.params.id, userId, req.body)
    res.json({ success: true, ...result })
  } catch (e) { res.status(400).json({ success: false, message: e.message }) }
}

exports.withdraw = async (req, res) => {
  try {
    const { tenantId, userId } = getTenantAndBranch(req)
    const result = await svc.withdraw(tenantId, req.params.id, userId, req.body)
    res.json({ success: true, ...result })
  } catch (e) { res.status(400).json({ success: false, message: e.message }) }
}

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE /kane-epay/transactions/:txId — Admin efase yon transaksyon
// FIX: sèvis la itilize "accountId" — pa "kaneEpayId"
// ═══════════════════════════════════════════════════════════════
exports.deleteTransaction = async (req, res) => {
  try {
    const { tenantId, userId } = getTenantAndBranch(req)
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin sèlman.' })
    try { await verifyPin(userId, req.body?.pin) }
    catch (pinErr) { return res.status(403).json({ success: false, message: pinErr.message, pinRequired: true }) }

    // 1. Jwenn transaksyon an
    const tx = await prisma.kaneTransaction.findFirst({
      where: { id: req.params.txId, tenantId },
    })
    if (!tx) return res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn.' })

    const accountId = tx.accountId  // ✅ "accountId" — pa "kaneEpayId"

    // 2. Efase transaksyon an
    await prisma.kaneTransaction.delete({ where: { id: req.params.txId } })

    // 3. Rekalkile balans kont lan depi transaksyon ki rete yo
    const remaining = await prisma.kaneTransaction.findMany({
      where:  { accountId, tenantId },
      select: { type: true, amount: true },
    })

    const newBalance = remaining.reduce((sum, t) => {
      const amt = Number(t.amount)
      if (t.type === 'depot' || t.type === 'ouverture') return sum + amt
      if (t.type === 'retrait') return sum - amt
      return sum
    }, 0)

    // 4. Mizajou balans
    await prisma.kaneEpay.update({
      where: { id: accountId },
      data:  { balance: Math.max(0, newBalance) },
    })

    return res.json({ success: true, message: 'Tranzaksyon efase epi balans korije.', newBalance: Math.max(0, newBalance) })
  } catch (e) {
    console.error('[KANE DELETE TX]', e)
    res.status(500).json({ success: false, message: e.message })
  }
}

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE /kane-epay/:id — Admin efase yon kont Kane Epay
// FIX: itilize "accountId" nan deleteMany
// ═══════════════════════════════════════════════════════════════
exports.deleteAccount = async (req, res) => {
  try {
    const { tenantId, userId } = getTenantAndBranch(req)
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin sèlman.' })
    try { await verifyPin(userId, req.body?.pin) }
    catch (pinErr) { return res.status(403).json({ success: false, message: pinErr.message, pinRequired: true }) }

    const account = await prisma.kaneEpay.findFirst({
      where: { id: req.params.id, tenantId },
    })
    if (!account) return res.status(404).json({ success: false, message: 'Kont pa jwenn.' })

    // Verifye prè aktif
    const pretsActifs = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM prets
      WHERE kont_kane_epay_id = ${req.params.id}
        AND statut IN ('actif', 'reta', 'attente')
        AND tenant_id = ${tenantId}
    `
    if (Number(pretsActifs[0]?.total) > 0) {
      return res.status(400).json({
        success: false,
        message: `Kont sa gen ${pretsActifs[0].total} prè aktif. Klotire yo dabò.`,
      })
    }

    // ✅ "accountId" — pa "kaneEpayId"
    await prisma.$transaction(async (tx) => {
      await tx.kaneTransaction.deleteMany({ where: { accountId: req.params.id, tenantId } })
      await tx.kaneEpay.delete({ where: { id: req.params.id } })
    })

    return res.json({ success: true, message: `Kont ${account.accountNumber} efase avèk siksè.` })
  } catch (e) {
    console.error('[KANE DELETE ACCOUNT]', e)
    res.status(500).json({ success: false, message: e.message })
  }
}