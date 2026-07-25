// src/middleware/branch.js
// ⚠️ KORIJE — extractBranch kounye a konsyan wòl itilizatè a:
//   - Admin: header X-Branch-Id se yon senp filtè, li ka chwazi
//     nenpòt branch tenant lan oswa "Global" (pa gen header = tout done)
//   - Lòt wòl (kesye, manadjè, elatriye): branch la soti OTOMATIKMAN
//     nan BranchUser pa yo — header la pa ka fòse yo antre nan yon
//     branch yo pa gen aksè.
//
// AVAN: nenpòt itilizatè otantifye te ka voye nenpòt X-Branch-Id valid
// pou tenant lan e li te aksepte l san verifye si itilizatè a te
// reyèlman gen aksè branch sa a — yon twou otorizasyon.

const prisma = require('../config/prisma')
const { asyncHandler } = require('./errorHandler')

const extractBranch = asyncHandler(async (req, res, next) => {
  const headerBranchId = req.headers['x-branch-id'] || null

  // ── ADMIN — aksè total, header la se yon senp filtè vizyèl
  if (req.user.role === 'admin') {
    if (!headerBranchId) {
      req.branchId = null // "Global" — wè tout branch ansanm
      return next()
    }
    const branch = await prisma.branch.findFirst({
      where: { id: headerBranchId, tenantId: req.tenant.id }
    })
    if (!branch) {
      req.branchId = null
      return next()
    }
    if (!branch.isActive) {
      return res.status(403).json({ success: false, message: 'Branch sa a bloke.', branchLocked: true })
    }
    req.branchId = branch.id
    req.branch   = branch
    return next()
  }

  // ── LÒT WÒL — branch la soti nan BranchUser pa yo, pa nan header
  const branchUsers = await prisma.branchUser.findMany({
    where: { userId: req.user.id },
    include: { branch: true }
  })

  // Tenant ki poko itilize fonksyonalite branch (itilizatè san BranchUser)
  // → konpòtman ansyen an rete, pa gen restriksyon
  if (branchUsers.length === 0) {
    req.branchId = null
    return next()
  }

  // Itilizatè lye ak yon sèl branch → otomatik, pa gen chwa
  if (branchUsers.length === 1) {
    const bu = branchUsers[0]
    if (!bu.branch.isActive) {
      return res.status(403).json({ success: false, message: 'Branch ou a bloke. Kontakte administratè.', branchLocked: true })
    }
    req.branchId = bu.branch.id
    req.branch   = bu.branch
    return next()
  }

  // Itilizatè ki gen aksè plizyè branch → header obligatwa, e li dwe
  // fè pati lis branch itilizatè a otorize
  const allowedIds = branchUsers.map(bu => bu.branchId)
  if (!headerBranchId || !allowedIds.includes(headerBranchId)) {
    return res.status(400).json({
      success: false,
      message: 'Chwazi yon branch pou kontinye.',
      requiresBranch: true,
      allowedBranches: branchUsers.map(bu => ({ id: bu.branch.id, name: bu.branch.name }))
    })
  }

  const bu = branchUsers.find(b => b.branchId === headerBranchId)
  if (!bu.branch.isActive) {
    return res.status(403).json({ success: false, message: 'Branch sa a bloke.', branchLocked: true })
  }
  req.branchId = bu.branch.id
  req.branch   = bu.branch
  next()
})

module.exports = { extractBranch }