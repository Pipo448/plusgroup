// src/middleware/requireBranchForWrite.js
//
// Middleware pou aplike SÈLMAN sou wout KREYASYON (POST) ki kreye done
// operasyonèl (pwodui, mouvman estòk, fakti, devi). Objektif: anpeche
// done "san branch" kreye lè yon admin an mòd "Global" (pa gen branch
// chwazi nan switcher la) — sitiyasyon ki t ap rekreye menm konfizyon
// "done jeneral san branch" nou te repare pou Plus Store la.
//
// Konpòtman:
//   - Si req.branchId deja gen yon valè (admin ki chwazi yon branch
//     espesifik, oswa kesye ki otomatikman limite a pwòp branch pa yo)
//     → kontinye san pwoblèm.
//   - Si tenant lan PA GEN OKENN branch ditou (poko itilize fonksyonalite
//     a) → kontinye san pwoblèm, konpòtman ansyen an rete entak.
//   - Si tenant lan GEN branch e req.branchId null (admin an mòd Global)
//     → bloke ak 400, mande admin lan chwazi yon branch dabò.
//
// ⚠️ IMPORTANT — sèlman mete sou wout POST/kreyasyon, JANM sou GET/lekti,
// paske "Global" dwe rete yon mòd vizyalizasyon valid pou rapò/lis.

const prisma = require('../config/prisma')
const { asyncHandler } = require('./errorHandler')

const requireBranchForWrite = asyncHandler(async (req, res, next) => {
  if (req.branchId) return next()

  const branchCount = await prisma.branch.count({ where: { tenantId: req.tenant.id } })
  if (branchCount === 0) return next()

  return res.status(400).json({
    success: false,
    message: 'Ou nan mòd "Global" kounye a. Chwazi yon branch nan meni anlè a anvan w kreye.',
    requiresBranch: true
  })
})

module.exports = { requireBranchForWrite }
