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

// ⚠️ KORIJE — toujou ajoute 3 chif aleatwa apre non an, pa sèlman lè gen
// kolizyon. Sa evite konfizyon lè 2 ajan gen menm non/non sanble
// (egzanp "Jean Baptiste" ak "Jean Bòs" ta ka toude jenere "JEANBAPTIS"
// san chif — kounye a yo toujou gen yon sifiks distenktif).
async function generateUniquePromoCode(fullName) {
  const base = slugifyCode(fullName).slice(0, 6) || 'AGENT'
  let code, exists
  do {
    const rand = Math.floor(100 + Math.random() * 900) // 3 chif, 100-999
    code = `${base}${rand}`
    exists = await prisma.agent.findUnique({ where: { promoCode: code } })
  } while (exists)
  return code
}

// ⚠️ NOUVO — Jenere nimewo dosye ofisyèl PG-{ane}-{6 chif}
async function generateDossierNumber() {
  const year = new Date().getFullYear()
  let num, exists
  do {
    const rand = Math.floor(100000 + Math.random() * 900000)
    num = `PG-${year}-${rand}`
    exists = await prisma.agent.findUnique({ where: { dossierNumber: num } })
  } while (exists)
  return num
}

// ⚠️ NOUVO — Kalkil nòt objektif yo (pati ki pa mande jijman imen)
// Total objektif: Pèsonèl(10) + Edikasyon(15) + Eksperyans(20) + Konpetans Dijital(15) = 60/100
// Rès la (Komèsyal/Sistèm/Bonus = 40 pwen) SuperAdmin antre apre entèvyou.
function calcObjectiveScores(data) {
  // ── Pèsonèl /10
  let scorePersonal = 0
  if (data.fullName && data.email && data.phone && data.city) scorePersonal += 3
  if (data.photoBase64) scorePersonal += 2
  if (data.idDocumentBase64) scorePersonal += 3
  if (data.declareInfoAccurate) scorePersonal += 2

  // ── Edikasyon /15
  const EDU_POINTS = { primè: 2, segondè: 6, teknik: 10, inivèsite: 15 }
  const scoreEducation = EDU_POINTS[data.educationLevel] || 0

  // ── Eksperyans /20
  const EXP_POINTS = { pa_genyen: 2, mwens_1: 5, '1-3': 10, '3-5': 15, '5+': 20 }
  const scoreExperience = EXP_POINTS[data.yearsExperience] || 0

  // ── Konpetans Dijital /15
  let scoreDigitalSkills = 0
  const skills = data.skills || {}
  if (skills.smartphone) scoreDigitalSkills += 4
  if (skills.laptop) scoreDigitalSkills += 4
  if (skills.internetHome) scoreDigitalSkills += 4
  const toolsKnown = data.systemEval?.toolsKnown
  if (Array.isArray(toolsKnown) && toolsKnown.length > 0) scoreDigitalSkills += 3
  scoreDigitalSkills = Math.min(15, scoreDigitalSkills)

  return { scorePersonal, scoreEducation, scoreExperience, scoreDigitalSkills }
}

function calcDecision(total) {
  if (total >= 90) return 'rekrite'
  if (total >= 80) return 'entèvyou'
  if (total >= 70) return 'atant'
  if (total >= 60) return 'fòmasyon'
  return 'refize'
}

// ═══════════════════════════════════════════════════════
// WOUT PIBLIK — san otantifikasyon
// ═══════════════════════════════════════════════════════

// ── POST /agents/track-visit — konte chak fwa paj kandidati a chaje
// (piblik, san auth — jis pou estatistik konvèsyon SuperAdmin)
router.post('/track-visit', asyncHandler(async (req, res) => {
  try {
    await prisma.agentApplyVisit.create({ data: {} })
  } catch (e) {
    console.warn('[AgentApplyVisit]', e.message)
  }
  res.json({ success: true })
}))

// ── POST /agents/apply — Fòm kandidati piblik konplè (6 faz)
router.post('/apply', asyncHandler(async (req, res) => {
  const {
    // Idantite
    fullName, lastName, dateOfBirth, gender, maritalStatus,
    email, phone, addressFull, city, department, country,
    // Dokiman
    photoBase64, idDocumentType, idDocumentBase64,
    // Edikasyon
    educationLevel, fieldOfStudy, schoolName, otherCertifications,
    // Sitiyasyon pwofesyonèl
    currentProfession, currentlyEmployed, companyName, jobTitle,
    // Eksperyans
    yearsExperience, experienceDomain,
    // Konpetans & Lang
    skills, languages,
    // Domèn
    domains,
    // Evalyasyon espesifik
    commercialEval, systemEval,
    // Motivasyon
    whyAgent, goals12Months, threeTraits, weakness,
    // Referans
    references,
    // Peman
    payoutMethod, natcashNumber,
    // Deklarasyon
    declareInfoAccurate, agreeRules, agreeVerification,
    // Legacy Faz 1 (konpatibilite)
    message
  } = req.body

  if (!fullName || !email || !phone || !city) {
    return res.status(400).json({ success: false, message: 'Non, email, telefòn ak vil obligatwa.' })
  }

  if (payoutMethod === 'natcash' && !natcashNumber) {
    return res.status(400).json({ success: false, message: 'Nimewo NatCash obligatwa si w chwazi peman NatCash.' })
  }

  const existing = await prisma.agent.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) {
    return res.status(409).json({ success: false, message: 'Yon kandidati deja egziste ak email sa a.' })
  }

  const [promoCode, dossierNumber] = await Promise.all([
    generateUniquePromoCode(fullName),
    generateDossierNumber()
  ])

  const scores = calcObjectiveScores({
    fullName, email, phone, city, photoBase64, idDocumentBase64,
    declareInfoAccurate, educationLevel, yearsExperience, skills, systemEval
  })

  const agent = await prisma.agent.create({
    data: {
      dossierNumber,
      fullName: fullName.trim(),
      lastName: lastName || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      maritalStatus: maritalStatus || null,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      addressFull: addressFull || null,
      city: city.trim(),
      department: department || null,
      country: country || 'Ayiti',

      photoBase64: photoBase64 || null,
      idDocumentType: idDocumentType || null,
      idDocumentBase64: idDocumentBase64 || null,

      educationLevel: educationLevel || null,
      fieldOfStudy: fieldOfStudy || null,
      schoolName: schoolName || null,
      otherCertifications: otherCertifications || null,

      currentProfession: currentProfession || null,
      currentlyEmployed: typeof currentlyEmployed === 'boolean' ? currentlyEmployed : null,
      companyName: companyName || null,
      jobTitle: jobTitle || null,

      yearsExperience: yearsExperience || null,
      experienceDomain: experienceDomain || null,

      skills: skills || null,
      languages: languages || null,
      domains: domains || null,
      commercialEval: commercialEval || null,
      systemEval: systemEval || null,

      whyAgent: whyAgent || null,
      goals12Months: goals12Months || null,
      threeTraits: threeTraits || null,
      weakness: weakness || null,

      references: references || null,

      payoutMethod: payoutMethod || null,
      natcashNumber: payoutMethod === 'natcash' ? natcashNumber : null,

      declareInfoAccurate: !!declareInfoAccurate,
      agreeRules: !!agreeRules,
      agreeVerification: !!agreeVerification,

      ...scores,

      message: message || null,
      promoCode,
      status: 'pending'
    }
  })

  res.status(201).json({
    success: true,
    message: `Kandidati ou voye avèk siksè. Nimewo Dosye: ${dossierNumber}. Ekip Plus Group ap kontakte w apre revizyon.`,
    agentId: agent.id,
    dossierNumber
  })
}))

// ── POST /agents/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email ak modpas obligatwa.' })
  }

  // ⚠️ KORIJE — aksepte ni yon vrè imèl ni kòd promo ajan an (egzanp "JEANQU387")
  // kòm idantifyan. Anvan sa, backend la te sèlman chèche pa email, kidonk
  // yon ajan ki antre kòd promo li te toujou jwenn 401 menm ak bon mopas.
  const identifier = String(email).trim()
  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { promoCode: identifier.toUpperCase() }
      ]
    }
  })
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

// ⚠️ NOUVO — POST /agents/tenant-requests — Ajan kreye yon antrepriz pou
// yon kliyan li mennen. Menm règ ak enskripsyon piblik la (esè yon mwa,
// an atant apwobasyon Super Admin), men kòd pwomo a se OTOMATIKMAN pa
// ajan konekte a — pa gen dwa antre yon lòt kòd.
router.post('/tenant-requests', asyncHandler(async (req, res) => {
  const { createPendingTenant } = require('../tenants/tenant-signup.service')
  const tenant = await createPendingTenant(
    { ...req.body, promoCode: req.agent.promoCode },
    'agent'
  )
  res.status(201).json({
    success: true,
    message: `Demann kreye pou "${tenant.name}"! Esè yon mwa a kòmanse. Super Admin ap konfime l talè.`,
    tenantId: tenant.id,
  })
}))

// ── GET /agents/dashboard — pwofi konplè: tenant yo mennen, komisyon, klasman
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [tenants, commissions] = await Promise.all([
    prisma.tenant.findMany({
      where: { agentId: req.agent.id },
      select: { id: true, name: true, status: true, createdAt: true }
    }),
    prisma.agentCommission.findMany({
      where: { agentId: req.agent.id },
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { name: true } } }
    })
  ])

  const totalEarned  = commissions.reduce((s, c) => s + c.amountHtg, 0)
  const totalPaid     = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amountHtg, 0)
  const totalPending  = totalEarned - totalPaid
  const activeTenants = tenants.filter(t => t.status === 'active').length

  let message
  if (tenants.length === 0) {
    message = "Kòmanse pataje kòd promo ou a pou w mennen premye antrepriz ou!"
  } else if (tenants.length <= 2) {
    message = "Bon kòmansman! Kontinye pataje kòd ou a pou w monte pi wo."
  } else if (tenants.length <= 5) {
    message = "Ou sou bon chemen! Kèk antrepriz anplis ka mete w nan tèt klasman an."
  } else {
    message = "Ou se yon vrè chanpyon! Kontinye konsa pou konkou fen ane a."
  }

  const allApproved = await prisma.agent.findMany({
    where: { status: 'approved' },
    select: { id: true, commissions: { select: { amountHtg: true } } }
  })
  const ranked = allApproved
    .map(a => ({ id: a.id, total: a.commissions.reduce((s, c) => s + c.amountHtg, 0) }))
    .sort((a, b) => b.total - a.total)
  const rank = ranked.findIndex(a => a.id === req.agent.id) + 1

  res.json({
    success: true,
    agent: req.agent,
    tenants,
    commissions,
    stats: { totalEarned, totalPaid, totalPending, activeTenants, totalTenants: tenants.length },
    rank, totalAgents: ranked.length,
    message
  })
}))

module.exports = router
