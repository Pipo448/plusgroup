// src/middleware/branch.js
// ⚠️ NOUVO — Middleware pou ekstrè X-Branch-Id epi valide li
// Ajoute req.branchId si header la prezan ak valid

const prisma = require('../config/prisma')
const { asyncHandler } = require('./errorHandler')

/**
 * Opsyonèl — ekstrè branchId nan header X-Branch-Id
 * Si header la prezant: valide branch lan egziste pou tenant an
 * Si pa prezant: req.branchId = null (wè tout done)
 */
const extractBranch = asyncHandler(async (req, res, next) => {
  const branchId = req.headers['x-branch-id']

  if (!branchId) {
    req.branchId = null
    return next()
  }

  // Valide branch lan egziste pou tenant an
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: req.tenant.id }
  })

  if (!branch) {
    req.branchId = null
    return next()
  }

  if (!branch.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Branch sa a bloke.',
      branchLocked: true
    })
  }

  req.branchId = branch.id
  req.branch   = branch
  next()
})

module.exports = { extractBranch }
