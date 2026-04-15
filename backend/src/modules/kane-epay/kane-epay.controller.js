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
// FIX: pa itilize kane_epay_id — kalkile balans depi transaksyon yo
// ═══════════════════════════════════════════════════════════════
exports.deleteTransaction = async (req, res) => {
  try {
    const { tenantId } = getTenantAndBranch(req)
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Admin sèlman.' })

    // 1. Jwenn transaksyon an via Prisma ORM (evite raw SQL column name issues)
    const tx = await prisma.kaneTransaction.findFirst({
      where: { id: req.params.txId, tenantId },
    })
    if (!tx) return res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn.' })

    // 2. Efase transaksyon an
    await prisma.kaneTransaction.delete({ where: { id: req.params.txId } })

    // 3. Kalkile nouvo balans kont lan (SUM tout tranzaksyon ki rete)
    // depot/ouverture = positif, retrait = negatif
    const remaining = await prisma.kaneTransaction.findMany({
      where: { kaneEpayId: tx.kaneEpayId, tenantId },
      select: { type: true, amount: true },
    })

    const newBalance = remaining.reduce((sum, t) => {
      const amt = Number(t.amount)
      if (t.type === 'depot' || t.type === 'ouverture') return sum + amt
      if (t.type === 'retrait') return sum - amt
      return sum
    }, 0)

    // 4. Mizajou balans kont lan
    await prisma.kaneEpay.update({
      where: { id: tx.kaneEpayId },
      data:  { balance: Math.max(0, newBalance), updatedAt: new Date() },
    })

    return res.json({ success: true, message: 'Tranzaksyon efase epi balans korije.', newBalance: Math.max(0, newBalance) })
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

    // 1. Verifye kont lan egziste
    const account = await prisma.kaneEpay.findFirst({
      where: { id: req.params.id, tenantId },
    })
    if (!account) return res.status(404).json({ success: false, message: 'Kont pa jwenn.' })

    // 2. Verifye si gen prè aktif
    const pretsActifs = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM prets
      WHERE kont_kane_epay_id = ${req.params.id}
        AND statut IN ('actif', 'reta', 'attente')
        AND tenant_id = ${tenantId}
    `
    if (Number(pretsActifs[0]?.total) > 0) {
      return res.status(400).json({
        success: false,
        message: `Kont sa gen ${pretsActifs[0].total} prè aktif. Klotire yo dabò anvan efase kont lan.`,
      })
    }

    // 3. Efase tout transaksyon + kont via Prisma ORM
    await prisma.$transaction(async (tx) => {
      await tx.kaneTransaction.deleteMany({ where: { kaneEpayId: req.params.id, tenantId } })
      await tx.kaneEpay.delete({ where: { id: req.params.id } })
    })

    return res.json({ success: true, message: `Kont ${account.accountNumber} efase avèk siksè.` })
  } catch (e) {
    console.error('[KANE DELETE ACCOUNT]', e)
    res.status(500).json({ success: false, message: e.message })
  }
}