// backend/src/modules/gym/gym.controller.js
// ✅ NOUVO — Modil Jim/Gym
const svc = require('./gym.service')

const getCtx = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.headers['x-branch-id'] || null,
  userId:   req.user.id,
})

// ── Stats ──────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const stats = await svc.getStats(tenantId, branchId)
    res.json({ success: true, stats })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// ── Plans ──────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const plans = await svc.getPlans(tenantId, branchId)
    res.json({ success: true, plans })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.createPlan = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const plan = await svc.createPlan(tenantId, branchId, req.body)
    res.status(201).json({ success: true, plan })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.updatePlan = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const plan = await svc.updatePlan(tenantId, req.params.id, req.body)
    res.json({ success: true, plan })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.deletePlan = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const result = await svc.deletePlan(tenantId, req.params.id)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Members ───────────────────────────────────────────────────
exports.getMembers = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const result = await svc.getMembers(tenantId, branchId, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.getMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const member = await svc.getMemberById(tenantId, req.params.id)
    res.json({ success: true, member })
  } catch (e) {
    res.status(404).json({ success: false, message: e.message })
  }
}

exports.addMember = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getCtx(req)
    const member = await svc.addMember(tenantId, branchId, userId, req.body)
    res.status(201).json({ success: true, member })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.updateMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const member = await svc.updateMember(tenantId, req.params.id, req.body)
    res.json({ success: true, member })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.removeMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const result = await svc.removeMember(tenantId, req.params.id)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Memberships (abònman) ────────────────────────────────────
exports.getMemberships = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const memberships = await svc.getMemberships(tenantId, req.params.memberId)
    res.json({ success: true, memberships })
  } catch (e) {
    res.status(404).json({ success: false, message: e.message })
  }
}

exports.createMembership = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const membership = await svc.createMembership(tenantId, req.params.memberId, userId, req.body)
    res.status(201).json({ success: true, membership })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.cancelMembership = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const membership = await svc.cancelMembership(tenantId, req.params.membershipId)
    res.json({ success: true, membership })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Check-in ──────────────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getCtx(req)
    const result = await svc.checkIn(tenantId, branchId, req.params.memberId, userId, req.body)
    res.status(201).json({ success: true, ...result })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.checkOut = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const checkIn = await svc.checkOut(tenantId, req.params.checkInId)
    res.json({ success: true, checkIn })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.getCheckIns = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const result = await svc.getCheckIns(tenantId, branchId, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// ── Payments / Kès ────────────────────────────────────────────
exports.addPayment = async (req, res) => {
  try {
    const { tenantId, userId } = getCtx(req)
    const payment = await svc.addPayment(tenantId, req.params.memberId, userId, req.body)
    res.status(201).json({ success: true, payment })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.getPayments = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const result = await svc.getPayments(tenantId, req.query)
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// ── Daily Rate (Tarif Jounalye) ──────────────────────────────
exports.getDailyRate = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const rate = await svc.getDailyRate(tenantId, branchId)
    res.json({ success: true, rate })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.setDailyRate = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getCtx(req)
    const rate = await svc.setDailyRate(tenantId, branchId, userId, req.body)
    res.status(201).json({ success: true, rate })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.confirmDailyPayment = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getCtx(req)
    const payment = await svc.confirmDailyPayment(tenantId, branchId, req.params.memberId, userId, req.body)
    res.status(201).json({ success: true, payment })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Registration Fee (Tarif Enskripsyon) ─────────────────────
exports.getRegistrationFee = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const fee = await svc.getRegistrationFee(tenantId, branchId)
    res.json({ success: true, fee })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.setRegistrationFee = async (req, res) => {
  try {
    const { tenantId, branchId, userId } = getCtx(req)
    const fee = await svc.setRegistrationFee(tenantId, branchId, userId, req.body)
    res.status(201).json({ success: true, fee })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

// ── Classes & Trainers (klas & antrenè) ──────────────────────
exports.getClasses = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const classes = await svc.getClasses(tenantId, branchId)
    res.json({ success: true, classes })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.createClass = async (req, res) => {
  try {
    const { tenantId, branchId } = getCtx(req)
    const gymClass = await svc.createClass(tenantId, branchId, req.body)
    res.status(201).json({ success: true, class: gymClass })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.updateClass = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const gymClass = await svc.updateClass(tenantId, req.params.id, req.body)
    res.json({ success: true, class: gymClass })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.deleteClass = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    await svc.deleteClass(tenantId, req.params.id)
    res.json({ success: true, message: 'Klas efase.' })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.enrollMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const { memberId } = req.body
    if (!memberId) return res.status(400).json({ success: false, message: 'memberId obligatwa.' })
    const enrollment = await svc.enrollMember(tenantId, req.params.id, memberId)
    res.status(201).json({ success: true, enrollment })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.unenrollMember = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    await svc.unenrollMember(tenantId, req.params.id, req.params.memberId)
    res.json({ success: true, message: 'Manm retire nan klas la.' })
  } catch (e) {
    res.status(400).json({ success: false, message: e.message })
  }
}

exports.getClassMembers = async (req, res) => {
  try {
    const { tenantId } = getCtx(req)
    const members = await svc.getClassMembers(tenantId, req.params.id)
    res.json({ success: true, members })
  } catch (e) {
    res.status(404).json({ success: false, message: e.message })
  }
}