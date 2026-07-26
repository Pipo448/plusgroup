// src/middleware/agentAuth.js
const jwt    = require('jsonwebtoken')
const prisma = require('../config/prisma')
const { asyncHandler } = require('./errorHandler')

const agentAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token ajan obligatwa.' })
  }

  const token = authHeader.split(' ')[1]

  let decoded
  try {
    decoded = jwt.verify(token, process.env.AGENT_JWT_SECRET)
  } catch {
    return res.status(401).json({ success: false, message: 'Token ajan pa valid.' })
  }

  const agent = await prisma.agent.findUnique({
    where: { id: decoded.agentId },
    select: {
      id: true, fullName: true, email: true, phone: true, city: true,
      promoCode: true, status: true, commissionPerTenant: true,
      domains: true, commercialCommissionRate: true // ⚠️ NOUVO
    }
  })

  if (!agent) {
    return res.status(401).json({ success: false, message: 'Ajan pa jwenn.' })
  }

  if (agent.status !== 'approved') {
    return res.status(403).json({ success: false, message: 'Kont ajan ou a pa aktif kounye a.' })
  }

  req.agent = agent
  next()
})

module.exports = { agentAuth }
