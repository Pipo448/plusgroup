// src/modules/agents/agent.routes.js
const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const prisma  = require('../../config/prisma')
const { asyncHandler } = require('../../middleware/errorHandler')
const { agentAuth }    = require('../../middleware/agentAuth')

function slugifyCode(name) {
  return name.toUpperCase().trim()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

async function generateUniquePromoCode(fullName) {
  const base = slugifyCode(fullName) || 'AGENT'
  let code = base
  let suffix = 0
  while (await prisma.agent.findUnique({ where: { promoCode: code } })) {
    suffix += 1
    code = `${base}${suffix}`
  }
  return code
}

// ═══════════════════════════════════════════════════════
// WOUT PIBLIK — san otantifikasyon
// ═══════════════════════════════════════════════════════

// ── POST /agents/apply — Fòm kandidati piblik
router.post('/apply', asyncHandler(async (req, res) => {
  const { fullName, email, phone, city, message } = req.body

  if (!fullName || !email || !phone || !city) {
    return res.status(400).json({ success: false, message: 'Non, email, telefòn ak vil obligatwa.' })
  }

  const existing = await prisma.agent.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) {
    return res.status(409).json({ success: false, message: 'Yon kandidati deja egziste ak email sa a.' })
  }

  const promoCode = await generateUniquePromoCode(fullName)

  const agent = await prisma.agent.create({
    data: {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      city: city.trim(),
      message: message || null,
      promoCode,
      status: 'pending'
    }
  })

  res.status(201).json({
    success: true,
    message: 'Kandidati ou voye avèk siksè. Ekip Plus Group ap kontakte w apre revizyon.',
    agentId: agent.id
  })
}))

// ── POST /agents/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email ak modpas obligatwa.' })
  }

  const agent = await prisma.agent.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!agent || !agent.passwordHash) {
    return res.status(401).json({ success: false, message: 'Idantifyan pa kòrèk.' })
  }

  if (agent.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: agent.status === 'pending'
        ? 'Kandidati ou a poko apwouve.'
        : 'Kont ajan ou a pa aktif kounye a.'
    })
  }

  const valid = await bcrypt.compare(password, agent.passwordHash)
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Idantifyan pa kòrèk.' })
  }

  const token = jwt.sign({ agentId: agent.id }, process.env.AGENT_JWT_SECRET, { expiresIn: '30d' })

  res.json({
    success: true,
    token,
    agent: {
      id: agent.id, fullName: agent.fullName, email: agent.email,
      city: agent.city, promoCode: agent.promoCode
    }
  })
}))

// ═══════════════════════════════════════════════════════
// WOUT PWOTEJE — egzije agentAuth
// ═══════════════════════════════════════════════════════
router.use(agentAuth)

// ── GET /agents/me — tès rapid koneksyon an mache
router.get('/me', asyncHandler(async (req, res) => {
  res.json({ success: true, agent: req.agent })
}))

module.exports = router
