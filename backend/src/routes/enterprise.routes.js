// ============================================================
// PLUS GROUP — Routes Backend Antepriz (Enterprise Only)
// Fichye: backend/routes/enterprise.routes.js
// Enpòte nan: app.js oswa index.js
// ============================================================

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireAdmin, requireEnterprise } = require('../middleware/auth')

const prisma = new PrismaClient()

// ─────────────────────────────────────────────
// ① KANÈ KÈS  →  /api/v1/kane
// ─────────────────────────────────────────────
const kaneRouter = express.Router()
kaneRouter.use(authenticate, requireEnterprise)

// GET /api/v1/kane — Lis kanè
kaneRouter.get('/', async (req, res) => {
  try {
    const { status, branchId, limit = 50, page = 1 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      tenantId: req.user.tenantId,
      ...(status && { status }),
      ...(branchId && { branchId }),
    }

    const [kanes, total] = await Promise.all([
      prisma.kane.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip,
        include: { branch: { select: { name: true } } }
      }),
      prisma.kane.count({ where }),
    ])

    // Statistik jodi a
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [statsToday, statsPaid, statsPending] = await Promise.all([
      prisma.kane.aggregate({
        where: { tenantId: req.user.tenantId, createdAt: { gte: today } },
        _sum: { amount: true }
      }),
      prisma.kane.aggregate({
        where: { tenantId: req.user.tenantId, status: 'paid', createdAt: { gte: today } },
        _sum: { amount: true }
      }),
      prisma.kane.aggregate({
        where: { tenantId: req.user.tenantId, status: 'pending' },
        _sum: { amount: true }
      }),
    ])

    res.json({
      kanes,
      total,
      stats: {
        totalToday:   statsToday._sum.amount || 0,
        totalPaid:    statsPaid._sum.amount || 0,
        totalPending: statsPending._sum.amount || 0,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// POST /api/v1/kane — Kreye kanè
kaneRouter.post('/', async (req, res) => {
  try {
    const { description, amount, currency = 'HTG', clientName, clientPhone, notes, branchId } = req.body
    if (!description || !amount) return res.status(400).json({ message: 'Deskripsyon ak montan obligatwa' })

    // Jenere nimewo kanè otomatik
    const count = await prisma.kane.count({ where: { tenantId: req.user.tenantId } })
    const kaneNumber = `KNE-${String(count + 1).padStart(4, '0')}`

    const kane = await prisma.kane.create({
      data: {
        tenantId:   req.user.tenantId,
        kaneNumber,
        description,
        amount:     Number(amount),
        currency,
        clientName:  clientName || null,
        clientPhone: clientPhone || null,
        notes:       notes || null,
        cashierId:   req.user.id,
        cashierName: req.user.name,
        status:      'pending',
        branchId:    branchId || null,
      }
    })
    res.status(201).json({ kane })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// PATCH /api/v1/kane/:id/status — Chanje statut
kaneRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (!['paid', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Statut envalid' })

    const kane = await prisma.kane.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } })
    if (!kane) return res.status(404).json({ message: 'Kanè pa jwenn' })
    if (kane.status !== 'pending') return res.status(400).json({ message: 'Sèlman kanè annatant ka chanje' })

    const updated = await prisma.kane.update({
      where: { id: kane.id },
      data: { status, ...(status === 'paid' ? { paidAt: new Date() } : {}) }
    })
    res.json({ kane: updated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ─────────────────────────────────────────────
// ② SABOTAY  →  /api/v1/sabotay
// ─────────────────────────────────────────────
const sabotayRouter = express.Router()
sabotayRouter.use(authenticate, requireEnterprise)

// GET /api/v1/sabotay/balance — Balans Sabotay
sabotayRouter.get('/balance', async (req, res) => {
  try {
    const config = await prisma.sabotayConfig.findFirst({ where: { tenantId: req.user.tenantId } })
    if (!config?.apiKey) return res.json({ balance: null, message: 'Pa gen konfigirasyon Sabotay' })

    // Apèl API Sabotay reyèl (adaptè selon dokimantasyon Sabotay)
    // const response = await fetch('https://api.sabotay.ht/v1/balance', {
    //   headers: { 'Authorization': `Bearer ${config.apiKey}` }
    // })
    // const data = await response.json()
    // res.json({ balance: data.balance })

    // Mock pou devlopman
    res.json({ balance: 45000 })
  } catch (err) {
    res.status(500).json({ message: 'Erè koneksyon Sabotay' })
  }
})

// POST /api/v1/sabotay/config — Sove konfigirasyon
sabotayRouter.post('/config', requireAdmin, async (req, res) => {
  try {
    const { apiKey } = req.body
    await prisma.sabotayConfig.upsert({
      where: { tenantId: req.user.tenantId },
      create: { tenantId: req.user.tenantId, apiKey },
      update: { apiKey },
    })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ message: 'Erè sèvè' }) }
})

// POST /api/v1/sabotay/test-connection — Tès koneksyon
sabotayRouter.post('/test-connection', requireAdmin, async (req, res) => {
  try {
    const { apiKey } = req.body
    // TODO: rele Sabotay API reyèl pou tès
    // const response = await fetch('https://api.sabotay.ht/v1/ping', { headers: { Authorization: `Bearer ${apiKey}` } })
    // const ok = response.ok
    const ok = Boolean(apiKey && apiKey.length > 8)
    res.json({ connected: ok })
  } catch { res.json({ connected: false }) }
})

// GET /api/v1/sabotay/sales — Lis vant
sabotayRouter.get('/sales', async (req, res) => {
  try {
    const { status, period, operator } = req.query
    const dateFrom = period === 'today' ? new Date(new Date().setHours(0,0,0,0))
      : period === 'week' ? new Date(Date.now() - 7 * 86400000)
      : period === 'month' ? new Date(Date.now() - 30 * 86400000)
      : undefined

    const where = {
      tenantId: req.user.tenantId,
      ...(status && { status }),
      ...(operator && { operator }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
    }

    const [sales, agg] = await Promise.all([
      prisma.sabotaySale.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.sabotaySale.aggregate({
        where,
        _sum: { sellingPrice: true, costPrice: true },
        _count: true
      })
    ])

    const totalSales  = agg._sum.sellingPrice || 0
    const totalCost   = agg._sum.costPrice || 0

    res.json({
      sales,
      stats: {
        totalSales,
        totalProfit: totalSales - totalCost,
        count: agg._count,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// POST /api/v1/sabotay/sales — Nouvo vant recharge
sabotayRouter.post('/sales', async (req, res) => {
  try {
    const { phone, operator, amount, sellingPrice, costPrice } = req.body
    if (!phone || !amount || !sellingPrice) return res.status(400).json({ message: 'Telefòn, montan, ak pri vant obligatwa' })

    const config = await prisma.sabotayConfig.findFirst({ where: { tenantId: req.user.tenantId } })

    let status = 'pending'
    // Si gen API Sabotay konfigire, rele li:
    // if (config?.apiKey) {
    //   const response = await fetch('https://api.sabotay.ht/v1/topup', {
    //     method: 'POST',
    //     headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ phone, operator, amount })
    //   })
    //   const data = await response.json()
    //   status = data.success ? 'success' : 'failed'
    // }

    const sale = await prisma.sabotaySale.create({
      data: {
        tenantId:     req.user.tenantId,
        phone,
        operator,
        amount:       Number(amount),
        sellingPrice: Number(sellingPrice),
        costPrice:    Number(costPrice) || 0,
        status,
        createdById: req.user.id,
      }
    })
    res.status(201).json({ sale })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ─────────────────────────────────────────────
// ③ MONCASH  →  /api/v1/moncash
// ─────────────────────────────────────────────
const moncashRouter = express.Router()
moncashRouter.use(authenticate, requireEnterprise)

// POST /api/v1/moncash/config
moncashRouter.post('/config', requireAdmin, async (req, res) => {
  try {
    const { clientKey, clientSecret, mode = 'sandbox' } = req.body
    await prisma.moncashConfig.upsert({
      where: { tenantId: req.user.tenantId },
      create: { tenantId: req.user.tenantId, clientKey, clientSecret, mode },
      update: { clientKey, clientSecret, mode },
    })
    res.json({ success: true })
  } catch { res.status(500).json({ message: 'Erè sèvè' }) }
})

// POST /api/v1/moncash/test
moncashRouter.post('/test', requireAdmin, async (req, res) => {
  try {
    const { clientKey, clientSecret, mode } = req.body
    const baseUrl = mode === 'production'
      ? 'https://moncashapi.com'
      : 'https://sandbox.moncashapi.com'
    // TODO: tès koneksyon API MonCash reyèl
    const ok = Boolean(clientKey && clientSecret)
    res.json({ connected: ok })
  } catch { res.json({ connected: false }) }
})

// GET /api/v1/moncash/transactions
moncashRouter.get('/transactions', async (req, res) => {
  try {
    const { status, period } = req.query
    const dateFrom = period === 'today' ? new Date(new Date().setHours(0,0,0,0))
      : period === 'week' ? new Date(Date.now() - 7 * 86400000)
      : period === 'month' ? new Date(Date.now() - 30 * 86400000)
      : undefined

    const where = {
      tenantId: req.user.tenantId,
      provider: 'MonCash',
      ...(status && { status }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
    }

    const [transactions, agg] = await Promise.all([
      prisma.mobilTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.mobilTransaction.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      })
    ])

    const pendingAgg = await prisma.mobilTransaction.aggregate({
      where: { ...where, status: 'pending' }, _sum: { amount: true }
    })

    res.json({
      transactions,
      stats: {
        totalReceived: agg._sum.amount || 0,
        totalPending: pendingAgg._sum.amount || 0,
        count: agg._count,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// POST /api/v1/moncash/request — Kreye demann peman MonCash
moncashRouter.post('/request', async (req, res) => {
  try {
    const { phone, amount, description } = req.body
    if (!phone || !amount) return res.status(400).json({ message: 'Telefòn ak montan obligatwa' })

    const config = await prisma.moncashConfig.findFirst({ where: { tenantId: req.user.tenantId } })

    const reference = `MC-${Date.now()}`
    let paymentLink = null

    // Si gen konfigirasyon MonCash:
    // const baseUrl = config?.mode === 'production'
    //   ? 'https://moncashapi.com' : 'https://sandbox.moncashapi.com'
    // const tokenRes = await fetch(`${baseUrl}/Api/oauth/token`, { ... })
    // const { access_token } = await tokenRes.json()
    // const payRes = await fetch(`${baseUrl}/Api/v1/CreatePayment`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ amount, orderId: reference })
    // })
    // const { payment_token } = await payRes.json()
    // paymentLink = `${baseUrl}/Pay?token=${payment_token.token}`

    const tx = await prisma.mobilTransaction.create({
      data: {
        tenantId:      req.user.tenantId,
        provider:      'MonCash',
        phone,
        amount:        Number(amount),
        description:   description || null,
        reference,
        status:        'pending',
        paymentLink,
        createdById:   req.user.id,
      }
    })
    res.status(201).json({ transaction: tx, paymentLink })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erè sèvè' })
  }
})

// GET /api/v1/moncash/verify/:transactionId
moncashRouter.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    const config = await prisma.moncashConfig.findFirst({ where: { tenantId: req.user.tenantId } })

    // TODO: Verifye ak MonCash API reyèl
    // const response = await fetch(`${baseUrl}/Api/v1/RetrieveTransactionPayment`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ transactionId })
    // })
    // const data = await response.json()

    // Verifye nan BD nou
    const tx = await prisma.mobilTransaction.findFirst({
      where: { tenantId: req.user.tenantId, transactionId }
    })
    if (!tx) return res.status(404).json({ error: true, message: 'Tranzaksyon pa jwenn' })
    res.json(tx)
  } catch (err) {
    res.status(500).json({ error: true, message: 'Erè verifikasyon' })
  }
})

// PATCH /api/v1/moncash/transactions/:id/confirm — Konfime manyèl
moncashRouter.patch('/transactions/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const tx = await prisma.mobilTransaction.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!tx) return res.status(404).json({ message: 'Tranzaksyon pa jwenn' })
    const updated = await prisma.mobilTransaction.update({
      where: { id: tx.id },
      data: { status: 'confirmed', confirmedAt: new Date(), confirmedById: req.user.id }
    })
    res.json({ transaction: updated })
  } catch { res.status(500).json({ message: 'Erè sèvè' }) }
})

// ─────────────────────────────────────────────
// ④ NATCASH  →  /api/v1/natcash
// (mèm estrikti ak MonCash, provider='NatCash')
// ─────────────────────────────────────────────
const natcashRouter = express.Router()
natcashRouter.use(authenticate, requireEnterprise)

natcashRouter.post('/config', requireAdmin, async (req, res) => {
  try {
    const { clientKey, clientSecret, mode = 'sandbox' } = req.body
    await prisma.natcashConfig.upsert({
      where: { tenantId: req.user.tenantId },
      create: { tenantId: req.user.tenantId, clientKey, clientSecret, mode },
      update: { clientKey, clientSecret, mode },
    })
    res.json({ success: true })
  } catch { res.status(500).json({ message: 'Erè sèvè' }) }
})

natcashRouter.post('/test', requireAdmin, async (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body
    // TODO: Tès API NatCash reyèl
    res.json({ connected: Boolean(clientKey && clientSecret) })
  } catch { res.json({ connected: false }) }
})

// GET /api/v1/natcash/transactions (idantik ak moncash, filtre par provider='NatCash')
natcashRouter.get('/transactions', async (req, res) => {
  try {
    const { status, period } = req.query
    const dateFrom = period === 'today' ? new Date(new Date().setHours(0,0,0,0))
      : period === 'week' ? new Date(Date.now() - 7 * 86400000)
      : period === 'month' ? new Date(Date.now() - 30 * 86400000)
      : undefined

    const where = {
      tenantId: req.user.tenantId,
      provider: 'NatCash',
      ...(status && { status }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
    }

    const [transactions, agg] = await Promise.all([
      prisma.mobilTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.mobilTransaction.aggregate({ where, _sum: { amount: true }, _count: true })
    ])
    const pendingAgg = await prisma.mobilTransaction.aggregate({
      where: { ...where, status: 'pending' }, _sum: { amount: true }
    })
    res.json({
      transactions,
      stats: { totalReceived: agg._sum.amount || 0, totalPending: pendingAgg._sum.amount || 0, count: agg._count }
    })
  } catch (err) { res.status(500).json({ message: 'Erè sèvè' }) }
})

natcashRouter.post('/request', async (req, res) => {
  try {
    const { phone, amount, description } = req.body
    if (!phone || !amount) return res.status(400).json({ message: 'Telefòn ak montan obligatwa' })

    const reference = `NC-${Date.now()}`
    const tx = await prisma.mobilTransaction.create({
      data: {
        tenantId:    req.user.tenantId,
        provider:    'NatCash',
        phone,
        amount:      Number(amount),
        description: description || null,
        reference,
        status:      'pending',
        createdById: req.user.id,
      }
    })
    res.status(201).json({ transaction: tx })
  } catch (err) { res.status(500).json({ message: 'Erè sèvè' }) }
})

natcashRouter.get('/verify/:transactionId', async (req, res) => {
  try {
    const tx = await prisma.mobilTransaction.findFirst({
      where: { tenantId: req.user.tenantId, transactionId: req.params.transactionId }
    })
    if (!tx) return res.status(404).json({ error: true, message: 'Tranzaksyon pa jwenn' })
    res.json(tx)
  } catch { res.status(500).json({ error: true, message: 'Erè verifikasyon' }) }
})

natcashRouter.patch('/transactions/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const tx = await prisma.mobilTransaction.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!tx) return res.status(404).json({ message: 'Tranzaksyon pa jwenn' })
    const updated = await prisma.mobilTransaction.update({
      where: { id: tx.id },
      data: { status: 'confirmed', confirmedAt: new Date(), confirmedById: req.user.id }
    })
    res.json({ transaction: updated })
  } catch { res.status(500).json({ message: 'Erè sèvè' }) }
})

// ─────────────────────────────────────────────
// EKSPÒ — ajoute nan index.js / app.js
// ─────────────────────────────────────────────
module.exports = { kaneRouter, sabotayRouter, moncashRouter, natcashRouter }

/*
=================================================================
FASON POU AJOUTE NAN index.js / app.js:
=================================================================

const { kaneRouter, sabotayRouter, moncashRouter, natcashRouter } = require('./routes/enterprise.routes')

app.use('/api/v1/kane',    kaneRouter)
app.use('/api/v1/sabotay', sabotayRouter)
app.use('/api/v1/moncash', moncashRouter)
app.use('/api/v1/natcash', natcashRouter)

=================================================================
PRISMA MODELS POU AJOUTE NAN schema.prisma:
=================================================================

model Kane {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  kaneNumber  String
  description String
  amount      Float
  currency    String   @default("HTG")
  clientName  String?
  clientPhone String?
  notes       String?
  status      String   @default("pending") // pending | paid | cancelled
  cashierId   String?
  cashierName String?
  branchId    String?
  branch      Branch?  @relation(fields: [branchId], references: [id])
  paidAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
}

model SabotayConfig {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  apiKey    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SabotaySale {
  id           String   @id @default(cuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  phone        String
  operator     String   // Digicel | Natcom | Unitel
  amount       Float
  sellingPrice Float
  costPrice    Float    @default(0)
  status       String   @default("pending") // pending | success | failed
  createdById  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([tenantId])
}

model MoncashConfig {
  id           String   @id @default(cuid())
  tenantId     String   @unique
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  clientKey    String
  clientSecret String
  mode         String   @default("sandbox") // sandbox | production
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model NatcashConfig {
  id           String   @id @default(cuid())
  tenantId     String   @unique
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  clientKey    String
  clientSecret String
  mode         String   @default("sandbox")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model MobilTransaction {
  id             String    @id @default(cuid())
  tenantId       String
  tenant         Tenant    @relation(fields: [tenantId], references: [id])
  provider       String    // MonCash | NatCash
  phone          String
  amount         Float
  description    String?
  reference      String?
  transactionId  String?
  paymentLink    String?
  status         String    @default("pending") // pending | confirmed | failed | cancelled
  payer          String?
  confirmedAt    DateTime?
  confirmedById  String?
  createdById    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([tenantId, provider])
}

=================================================================
MIDDLEWARE requireEnterprise — ajoute nan middleware/auth.js:
=================================================================

exports.requireEnterprise = async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: { plan: true }
    })
    const entNames = ['Antepriz', 'Entreprise', 'Enterprise']
    if (!entNames.includes(tenant?.plan?.name)) {
      return res.status(403).json({ message: 'Fonksyon sa a disponib sèlman pou Plan Antepriz.' })
    }
    next()
  } catch (err) {
    res.status(500).json({ message: 'Erè sèvè' })
  }
}

=================================================================
FASON POU AJOUTE POUTWO NAN APP REACT (Router):
=================================================================

// App.jsx oswa router.jsx
import KanePage     from './pages/enterprise/KanePage'
import SabotayPage  from './pages/enterprise/SabotayPage'
import MobilPayPage from './pages/enterprise/MobilPayPage'

// Nan <Routes>:
<Route path="/kane"     element={<KanePage />} />
<Route path="/sabotay"  element={<SabotayPage />} />
<Route path="/mobilpay" element={<MobilPayPage />} />

// Sidebar.jsx — Ajoute anba branch "Antepriz" (si plan = Antepriz):
// { label: 'Ti Kanè Kès', icon: <CreditCard />, path: '/kane' }
// { label: 'Sabotay',     icon: <Smartphone />, path: '/sabotay' }
// { label: 'MonCash / NatCash', icon: <Phone />, path: '/mobilpay' }
=================================================================
*/
