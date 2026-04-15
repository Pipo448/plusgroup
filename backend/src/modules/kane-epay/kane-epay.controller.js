// backend/src/modules/kane-epay/kane-epay.controller.js
const svc = require('./kane-epay.service')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getTenantAndBranch = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.branchId || null,
  userId:   req.user.id,
})

const isAdmin = (req) => req.user?.role === 'admin' || req.user?.isAdmin === true

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

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE /kane-epay/transactions/:txId — Admin efase yon transaksyon
// ═══════════════════════════════════════════════════════════════
exports.deleteTransaction = async (req, res) => {
  try {
    const { tenantId } = getTenantAndBranch(req)
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin sèlman.' })

    // Jwenn transaksyon an
    const txRows = await prisma.$queryRaw`
      SELECT * FROM kane_transactions
      WHERE id = ${req.params.txId}::uuid AND tenant_id = ${tenantId}
      LIMIT 1
    `
    if (!txRows[0]) return res.status(404).json({ success: false, message: 'Transaksyon pa jwenn.' })

    const tx    = txRows[0]
    const kaneId = tx.kane_epay_id || tx.kaneEpayId

    // Kalkile ajisteman balans
    // depot/ouverture → retire montant an (balans te monte)
    // retrait          → ajoute montant an (balans te desann)
    const delta = (tx.type === 'depot' || tx.type === 'ouverture')
      ? -Number(tx.amount)
      :  Number(tx.amount)

    await prisma.$transaction(async (ptx) => {
      // 1. Efase transaksyon
      await ptx.$executeRaw`
        DELETE FROM kane_transactions
        WHERE id = ${req.params.txId}::uuid AND tenant_id = ${tenantId}
      `
      // 2. Korije balans kont kan
      if (kaneId) {
        await ptx.$executeRaw`
          UPDATE kane_epay SET
            balance    = GREATEST(0, balance + ${delta}),
            updated_at = NOW()
          WHERE id = ${kaneId}::uuid AND tenant_id = ${tenantId}
        `
      }
    }, { maxWait: 10000, timeout: 20000 })

    return res.json({ success: true, message: 'Transaksyon efase epi balans korije.' })
  } catch (e) {
    console.error('[KANE DELETE TX]', e)
    res.status(500).json({ success: false, message: e.message })
  }
}

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE /kane-epay/:id — Admin efase yon kont Kane Epay
// ═══════════════════════════════════════════════════════════════
exports.deleteAccount = async (req, res) => {
  try {
    const { tenantId } = getTenantAndBranch(req)
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin sèlman.' })

    const account = await prisma.kaneEpay.findFirst({
      where: { id: req.params.id, tenantId }
    })
    if (!account) return res.status(404).json({ success: false, message: 'Kont pa jwenn.' })

    // Verifye si kont lan gen prè aktif
    const pretsActifs = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM prets
      WHERE kont_kane_epay_id = ${req.params.id}
        AND statut IN ('actif', 'reta', 'attente')
        AND tenant_id = ${tenantId}
    `
    if (Number(pretsActifs[0]?.total) > 0) {
      return res.status(400).json({
        success: false,
        message: `Kont sa gen ${pretsActifs[0].total} prè aktif. Klotire yo dabò anvan efase kont lan.`
      })
    }

    await prisma.$transaction(async (ptx) => {
      // Efase tout transaksyon kont lan
      await ptx.$executeRaw`
        DELETE FROM kane_transactions WHERE kane_epay_id = ${req.params.id}::uuid AND tenant_id = ${tenantId}
      `
      // Efase kont lan
      await ptx.kaneEpay.delete({ where: { id: req.params.id } })
    }, { maxWait: 10000, timeout: 20000 })

    return res.json({ success: true, message: `Kont ${account.accountNumber} efase avèk siksè.` })
  } catch (e) {
    console.error('[KANE DELETE ACCOUNT]', e)
    res.status(500).json({ success: false, message: e.message })
  }
}