// src/routes/enterprise.routes.js
// ✅ PLUS GROUP — Enterprise Routes — Aliye ak Frontend

const express = require('express')
const { identifyTenant, authenticate, requireEnterprise } = require('../middleware/auth')

// ✅ KORIJE — identifyTenant AJOUTE nan chenn middleware
// Sa ki te kase: authenticate ap rele req.tenant.id men identifyTenant pa t la
const enterpriseMiddleware = [identifyTenant, authenticate, requireEnterprise]
// ⚠️ NOUVO — Epay Jounalye disponib pou TOUT plan (pa rezève pou Antrepriz)
const baseMiddleware = [identifyTenant, authenticate]

const ejCtrl = require('../modules/epay-jounalye/epayJounalye.controller')

// ═══════════════════════════════════════════════════════
// EPAY JOUNALYE (ansyen "Ti Kanè Kès") — kontra epay fòse chak jou
// Frontend rele: GET /kane, POST /kane, GET /kane/:id,
//                POST /kane/:id/pay, PATCH /kane/:id/cancel, GET /kane/config
// ═══════════════════════════════════════════════════════
const kaneRouter = express.Router()
kaneRouter.use(baseMiddleware)

kaneRouter.get('/config',        ejCtrl.getConfig)
kaneRouter.get('/',              ejCtrl.getAll)
kaneRouter.post('/',             ejCtrl.create)
kaneRouter.get('/:id',           ejCtrl.getOne)
kaneRouter.post('/:id/pay',      ejCtrl.recordPayment)
kaneRouter.put('/:id',           ejCtrl.update)
kaneRouter.patch('/:id/cancel',  ejCtrl.cancel)
kaneRouter.delete('/:id',        ejCtrl.remove)

// ═══════════════════════════════════════════════════════
// SABOTAY
// ═══════════════════════════════════════════════════════
const sabotayRouter = express.Router()
sabotayRouter.use(enterpriseMiddleware)

sabotayRouter.get('/balance', async (req, res) => {
  try {
    res.json({ success: true, balance: 0, currency: 'HTG' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

sabotayRouter.get('/sales', async (req, res) => {
  try {
    const sales = []
    const stats = { totalSales: 0, totalProfit: 0, count: 0 }
    res.json({ success: true, sales, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

sabotayRouter.post('/sales', async (req, res) => {
  try {
    const { phone, operator, amount, sellingPrice, costPrice } = req.body
    if (!phone || !amount || !sellingPrice) {
      return res.status(400).json({ success: false, message: 'Telefòn, montan, ak pri vant obligatwa.' })
    }
    // TODO: Rele API Sabotay + sove nan baz done
    const sale = {
      id: Date.now(), phone,
      operator: operator || 'Digicel',
      amount: Number(amount),
      sellingPrice: Number(sellingPrice),
      costPrice: costPrice ? Number(costPrice) : null,
      status: 'success',
      createdAt: new Date().toISOString(),
    }
    res.status(201).json({ success: true, sale })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

sabotayRouter.post('/test-connection', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ success: false, connected: false, message: 'Kle API manke.' })
    res.json({ success: true, connected: false, message: 'Tès — konekte API Sabotay reyèl ou a.' })
  } catch (e) {
    res.status(500).json({ success: false, connected: false, message: e.message })
  }
})

sabotayRouter.post('/config', async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) return res.status(400).json({ success: false, message: 'Kle API manke.' })
    res.json({ success: true, message: 'Konfigirasyon sove!' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ═══════════════════════════════════════════════════════
// MONCASH
// ═══════════════════════════════════════════════════════
const moncashRouter = express.Router()
moncashRouter.use(enterpriseMiddleware)

moncashRouter.get('/transactions', async (req, res) => {
  try {
    const transactions = []
    const stats = { totalReceived: 0, totalPending: 0, count: 0 }
    res.json({ success: true, transactions, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

moncashRouter.post('/request', async (req, res) => {
  try {
    const { phone, amount, description } = req.body
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Telefòn ak montan obligatwa.' })
    }
    const transaction = {
      id: Date.now(), provider: 'MonCash', phone,
      amount: Number(amount), description: description || null,
      status: 'pending', reference: `MCX-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
    }
    res.status(201).json({ success: true, transaction, paymentLink: null })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

moncashRouter.post('/test', async (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, connected: false, message: 'Client Key ak Secret obligatwa.' })
    }
    res.json({ success: true, connected: false, message: 'Tès — konekte API MonCash reyèl ou a.' })
  } catch (e) {
    res.status(500).json({ success: false, connected: false, message: e.message })
  }
})

moncashRouter.post('/config', async (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client Key ak Secret obligatwa.' })
    }
    res.json({ success: true, message: 'Konfigirasyon MonCash sove!' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

moncashRouter.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    if (!transactionId) return res.status(400).json({ success: false, message: 'ID tranzaksyon manke.' })
    res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn. Verifye ID a epi reseye.' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

moncashRouter.patch('/transactions/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params
    res.json({ success: true, message: 'Tranzaksyon konfime!', id, status: 'confirmed' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ═══════════════════════════════════════════════════════
// NATCASH
// ═══════════════════════════════════════════════════════
const natcashRouter = express.Router()
natcashRouter.use(enterpriseMiddleware)

natcashRouter.get('/transactions', async (req, res) => {
  try {
    const transactions = []
    const stats = { totalReceived: 0, totalPending: 0, count: 0 }
    res.json({ success: true, transactions, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

natcashRouter.post('/request', async (req, res) => {
  try {
    const { phone, amount, description } = req.body
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Telefòn ak montan obligatwa.' })
    }
    const transaction = {
      id: Date.now(), provider: 'NatCash', phone,
      amount: Number(amount), description: description || null,
      status: 'pending', reference: `NCX-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
    }
    res.status(201).json({ success: true, transaction, paymentLink: null })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

natcashRouter.post('/test', async (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, connected: false, message: 'Client Key ak Secret obligatwa.' })
    }
    res.json({ success: true, connected: false, message: 'Tès — konekte API NatCash reyèl ou a.' })
  } catch (e) {
    res.status(500).json({ success: false, connected: false, message: e.message })
  }
})

natcashRouter.post('/config', async (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ success: false, message: 'Client Key ak Secret obligatwa.' })
    }
    res.json({ success: true, message: 'Konfigirasyon NatCash sove!' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

natcashRouter.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    if (!transactionId) return res.status(400).json({ success: false, message: 'ID tranzaksyon manke.' })
    res.status(404).json({ success: false, message: 'Tranzaksyon pa jwenn. Verifye ID a epi reseye.' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

natcashRouter.patch('/transactions/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params
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
