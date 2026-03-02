// src/routes/enterprise.routes.js
// ✅ PLUS GROUP — Enterprise Routes — Aliye ak Frontend

const express = require('express')
const { authenticate, requireEnterprise } = require('../middleware/auth')

// ═══════════════════════════════════════════════════════
// TI KANÈ KÈS
// Frontend rele: GET /kane, POST /kane, PATCH /kane/:id/status
// ═══════════════════════════════════════════════════════
const kaneRouter = express.Router()
kaneRouter.use(authenticate, requireEnterprise)

// GET /kane — Lis kanè + statistik
kaneRouter.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const tenantId = req.tenant?.id

    // TODO: Ranplase ak vre query baz done ou a
    // Egzanp: const kanes = await Kane.findAll({ where: { tenantId, ...(status ? { status } : {}) } })
    const kanes = []
    const stats = {
      totalToday:   0,
      totalPaid:    0,
      totalPending: 0,
    }

    res.json({ success: true, kanes, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /kane — Kreye nouvo kanè
kaneRouter.post('/', async (req, res) => {
  try {
    const { description, amount, currency, clientName, clientPhone, notes } = req.body
    if (!description || !amount) {
      return res.status(400).json({ success: false, message: 'Deskripsyon ak montan obligatwa.' })
    }

    const tenantId = req.tenant?.id
    const cashierName = req.user?.fullName || req.user?.name || 'Kasye'

    // Jenere nimewo sekansyèl
    const kaneNumber = `KNE-${Date.now().toString().slice(-6)}`

    // TODO: Sove nan baz done ou a
    // const kane = await Kane.create({ tenantId, kaneNumber, description, amount, currency: currency || 'HTG', clientName, clientPhone, notes, cashierName, status: 'pending' })

    const kane = {
      id: Date.now(),
      kaneNumber,
      description,
      amount: Number(amount),
      currency: currency || 'HTG',
      clientName: clientName || null,
      clientPhone: clientPhone || null,
      notes: notes || null,
      cashierName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    res.status(201).json({ success: true, kane })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// PATCH /kane/:id/status — Chanje statut (paid, cancelled)
kaneRouter.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['pending', 'paid', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Statut envalid. Dwe youn nan: ${validStatuses.join(', ')}` })
    }

    // TODO: Mete ajou nan baz done ou a
    // const kane = await Kane.findOne({ where: { id, tenantId: req.tenant?.id } })
    // if (!kane) return res.status(404).json({ success: false, message: 'Kanè pa jwenn.' })
    // await kane.update({ status })

    res.json({ success: true, message: 'Statut ajou!', id, status })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ═══════════════════════════════════════════════════════
// SABOTAY
// Frontend rele: GET /sabotay/sales, POST /sabotay/sales,
//                GET /sabotay/balance, POST /sabotay/config,
//                POST /sabotay/test-connection
// ═══════════════════════════════════════════════════════
const sabotayRouter = express.Router()
sabotayRouter.use(authenticate, requireEnterprise)

// GET /sabotay/balance
sabotayRouter.get('/balance', async (req, res) => {
  try {
    // TODO: Rele API Sabotay reyèl pou balans
    res.json({ success: true, service: 'sabotay', balance: 0, currency: 'HTG' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// GET /sabotay/sales — Lis vant + statistik
sabotayRouter.get('/sales', async (req, res) => {
  try {
    const { status, period } = req.query

    // TODO: Ranplase ak vre query baz done ou a
    const sales = []
    const stats = {
      totalSales:  0,
      totalProfit: 0,
      count:       0,
    }

    res.json({ success: true, sales, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /sabotay/sales — Kreye vant recharge
sabotayRouter.post('/sales', async (req, res) => {
  try {
    const { phone, operator, amount, sellingPrice, costPrice } = req.body
    if (!phone || !amount || !sellingPrice) {
      return res.status(400).json({ success: false, message: 'Telefòn, montan, ak pri vant obligatwa.' })
    }

    // TODO: Rele API Sabotay pou voye recharge reyèl
    // TODO: Sove nan baz done ou a

    const sale = {
      id: Date.now(),
      phone,
      operator: operator || 'Digicel',
      amount: Number(amount),
      sellingPrice: Number(sellingPrice),
      costPrice: costPrice ? Number(costPrice) : null,
      status: 'success',
      createdAt: new Date().toISOString(),
      tenantId: req.tenant?.id,
    }

    res.status(201).json({ success: true, sale })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /sabotay/test-connection — Tès koneksyon API
sabotayRouter.post('/test-connection', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ success: false, connected: false, message: 'Kle API manke.' })

    // TODO: Rele API Sabotay reyèl pou tès
    res.json({ success: true, connected: false, message: 'Endpoint tès — konekte API Sabotay reyèl ou a.' })
  } catch (e) {
    res.status(500).json({ success: false, connected: false, message: e.message })
  }
})

// POST /sabotay/config — Sove konfigirasyon
sabotayRouter.post('/config', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ success: false, message: 'Kle API manke.' })

    // TODO: Sove konfigirasyon nan baz done ou a (enkripte apiKey)
    res.json({ success: true, message: 'Konfigirasyon sove!' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ═══════════════════════════════════════════════════════
// MONCASH
// Frontend rele: GET /moncash/transactions, POST /moncash/request,
//                POST /moncash/test, POST /moncash/config,
//                GET /moncash/verify/:id,
//                PATCH /moncash/transactions/:id/confirm
// ═══════════════════════════════════════════════════════
const moncashRouter = express.Router()
moncashRouter.use(authenticate, requireEnterprise)

// GET /moncash/transactions — Lis tranzaksyon + statistik
moncashRouter.get('/transactions', async (req, res) => {
  try {
    const { status, period } = req.query

    // TODO: Ranplase ak vre query baz done ou a
    const transactions = []
    const stats = {
      totalReceived: 0,
      totalPending:  0,
      count:         0,
    }

    res.json({ success: true, transactions, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /moncash/request — Kreye demann peman
moncashRouter.post('/request', async (req, res) => {
  try {
    const { phone, amount, description, provider } = req.body
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Telefòn ak montan obligatwa.' })
    }

    // TODO: Rele API MonCash reyèl pou kreye demann peman
    // TODO: Sove tranzaksyon nan baz done ou a

    const transaction = {
      id: Date.now(),
      provider: 'MonCash',
      phone,
      amount: Number(amount),
      description: description || null,
      status: 'pending',
      reference: `MCX-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
    }

    // paymentLink retounen si API MonCash reyèl la kreye l
    res.status(201).json({ success: true, transaction, paymentLink: null })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /moncash/test — Tès koneksyon API MonCash
moncashRouter.post('/test', async (req, res) => {
  try {
    const { clientKey, clientSecret, mode } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, connected: false, message: 'Client Key ak Secret obligatwa.' })
    }

    // TODO: Rele API MonCash reyèl pou tès
    res.json({ success: true, connected: false, message: 'Endpoint tès — konekte API MonCash reyèl ou a.' })
  } catch (e) {
    res.status(500).json({ success: false, connected: false, message: e.message })
  }
})

// POST /moncash/config — Sove konfigirasyon MonCash
moncashRouter.post('/config', async (req, res) => {
  try {
    const { clientKey, clientSecret, mode } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client Key ak Secret obligatwa.' })
    }

    // TODO: Sove konfigirasyon nan baz done ou a (enkripte clientSecret)
    res.json({ success: true, message: 'Konfigirasyon MonCash sove!' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// GET /moncash/verify/:transactionId — Verifye tranzaksyon
moncashRouter.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    if (!transactionId) return res.status(400).json({ success: false, message: 'ID tranzaksyon manke.' })

    // TODO: Verifye tranzaksyon nan API MonCash reyèl
    // const result = await moncashAPI.verify(transactionId)

    res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn. Verifye ID a epi reseye.' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// PATCH /moncash/transactions/:id/confirm — Konfime manyèlman
moncashRouter.patch('/transactions/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params

    // TODO: Mete ajou statut nan baz done ou a
    // const tx = await MoncashTransaction.findOne({ where: { id, tenantId: req.tenant?.id } })
    // if (!tx) return res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn.' })
    // await tx.update({ status: 'confirmed' })

    res.json({ success: true, message: 'Tranzaksyon konfime!', id, status: 'confirmed' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ═══════════════════════════════════════════════════════
// NATCASH
// Frontend rele: GET /natcash/transactions, POST /natcash/request,
//                POST /natcash/test, POST /natcash/config,
//                GET /natcash/verify/:id,
//                PATCH /natcash/transactions/:id/confirm
// ═══════════════════════════════════════════════════════
const natcashRouter = express.Router()
natcashRouter.use(authenticate, requireEnterprise)

// GET /natcash/transactions — Lis tranzaksyon + statistik
natcashRouter.get('/transactions', async (req, res) => {
  try {
    const { status, period } = req.query

    // TODO: Ranplase ak vre query baz done ou a
    const transactions = []
    const stats = {
      totalReceived: 0,
      totalPending:  0,
      count:         0,
    }

    res.json({ success: true, transactions, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /natcash/request — Kreye demann peman NatCash
natcashRouter.post('/request', async (req, res) => {
  try {
    const { phone, amount, description } = req.body
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Telefòn ak montan obligatwa.' })
    }

    // TODO: Rele API NatCash reyèl

    const transaction = {
      id: Date.now(),
      provider: 'NatCash',
      phone,
      amount: Number(amount),
      description: description || null,
      status: 'pending',
      reference: `NCX-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
    }

    res.status(201).json({ success: true, transaction, paymentLink: null })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /natcash/test — Tès koneksyon API NatCash
natcashRouter.post('/test', async (req, res) => {
  try {
    const { clientKey, clientSecret, mode } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, connected: false, message: 'Client Key ak Secret obligatwa.' })
    }

    // TODO: Rele API NatCash reyèl pou tès
    res.json({ success: true, connected: false, message: 'Endpoint tès — konekte API NatCash reyèl ou a.' })
  } catch (e) {
    res.status(500).json({ success: false, connected: false, message: e.message })
  }
})

// POST /natcash/config — Sove konfigirasyon NatCash
natcashRouter.post('/config', async (req, res) => {
  try {
    const { clientKey, clientSecret, mode } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client Key ak Secret obligatwa.' })
    }

    // TODO: Sove konfigirasyon nan baz done ou a
    res.json({ success: true, message: 'Konfigirasyon NatCash sove!' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// GET /natcash/verify/:transactionId — Verifye tranzaksyon
natcashRouter.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    if (!transactionId) return res.status(400).json({ success: false, message: 'ID tranzaksyon manke.' })

    // TODO: Verifye nan API NatCash reyèl
    res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn. Verifye ID a epi reseye.' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// PATCH /natcash/transactions/:id/confirm — Konfime manyèlman
natcashRouter.patch('/transactions/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params

    // TODO: Mete ajou statut nan baz done ou a

    res.json({ success: true, message: 'Tranzaksyon konfime!', id, status: 'confirmed' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ══════════════════════════════════════════════
// EKSPORTE
// ══════════════════════════════════════════════
module.exports = {
  kaneRouter,
  sabotayRouter,
  moncashRouter,
  natcashRouter,
}
