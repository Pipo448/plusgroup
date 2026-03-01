// src/routes/enterprise.routes.js
// ✅ PLUS GROUP — Enterprise Payment Routes
// Chak router eksporte endepandaman — pa gen risk "undefined"

const express         = require('express')
const { authenticate, requireEnterprise } = require('../middleware/auth')

// ══════════════════════════════════════════════
// TI KANÈ KÈS
// ══════════════════════════════════════════════
const kaneRouter = express.Router()
kaneRouter.use(authenticate, requireEnterprise)

kaneRouter.get('/balance', async (req, res) => {
  try {
    res.json({ success: true, service: 'kane', balance: 0, currency: 'HTG' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

kaneRouter.post('/transfer', async (req, res) => {
  try {
    const { amount, recipient, note } = req.body
    if (!amount || !recipient) return res.status(400).json({ success: false, message: 'Montant ak destinatè obligatwa.' })
    res.json({ success: true, service: 'kane', message: 'Transfè anrejistre.', amount, recipient })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

kaneRouter.get('/transactions', async (req, res) => {
  try {
    res.json({ success: true, service: 'kane', transactions: [], total: 0 })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ══════════════════════════════════════════════
// SABOTAY
// ══════════════════════════════════════════════
const sabotayRouter = express.Router()
sabotayRouter.use(authenticate, requireEnterprise)

sabotayRouter.get('/balance', async (req, res) => {
  try {
    res.json({ success: true, service: 'sabotay', balance: 0, currency: 'HTG' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

sabotayRouter.post('/send', async (req, res) => {
  try {
    const { amount, phone, note } = req.body
    if (!amount || !phone) return res.status(400).json({ success: false, message: 'Montant ak nimewo telefòn obligatwa.' })
    res.json({ success: true, service: 'sabotay', message: 'Peman anrejistre.', amount, phone })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

sabotayRouter.get('/history', async (req, res) => {
  try {
    res.json({ success: true, service: 'sabotay', history: [], total: 0 })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ══════════════════════════════════════════════
// MONCASH
// ══════════════════════════════════════════════
const moncashRouter = express.Router()
moncashRouter.use(authenticate, requireEnterprise)

moncashRouter.get('/balance', async (req, res) => {
  try {
    res.json({ success: true, service: 'moncash', balance: 0, currency: 'HTG' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

moncashRouter.post('/payment', async (req, res) => {
  try {
    const { amount, phone, reference } = req.body
    if (!amount || !phone) return res.status(400).json({ success: false, message: 'Montant ak nimewo obligatwa.' })
    res.json({ success: true, service: 'moncash', message: 'Peman MonCash anrejistre.', amount, phone, reference })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

moncashRouter.get('/transactions', async (req, res) => {
  try {
    res.json({ success: true, service: 'moncash', transactions: [], total: 0 })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ══════════════════════════════════════════════
// NATCASH
// ══════════════════════════════════════════════
const natcashRouter = express.Router()
natcashRouter.use(authenticate, requireEnterprise)

natcashRouter.get('/balance', async (req, res) => {
  try {
    res.json({ success: true, service: 'natcash', balance: 0, currency: 'HTG' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

natcashRouter.post('/payment', async (req, res) => {
  try {
    const { amount, phone, reference } = req.body
    if (!amount || !phone) return res.status(400).json({ success: false, message: 'Montant ak nimewo obligatwa.' })
    res.json({ success: true, service: 'natcash', message: 'Peman NatCash anrejistre.', amount, phone, reference })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

natcashRouter.get('/transactions', async (req, res) => {
  try {
    res.json({ success: true, service: 'natcash', transactions: [], total: 0 })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// ══════════════════════════════════════════════
// ✅ EKSPORTE — Chak router nommé eksplisite
// ══════════════════════════════════════════════
module.exports = {
  kaneRouter,
  sabotayRouter,
  moncashRouter,
  natcashRouter,
}
