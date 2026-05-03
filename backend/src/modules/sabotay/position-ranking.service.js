// ══════════════════════════════════════════════════════════════
// position-ranking.service.js
// Algorit klasman dinamik — Sabotay Sol
// Path: src/modules/sabotay/position-ranking.service.js
// ══════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// ECHÈL PWEN — Baze sou lè ekzak peman an
// ─────────────────────────────────────────────────────────────
//
//  earlyDepo   = +7  Depo rezèv (2+ jou davans)
//  earlyDay    = +5  Peye jou avan dat la
//  early       = +3  Peye menm jou, AVAN lè a
//  onTime      = +1  Peye nan lè a (ex: 15h-17h)
//  lateWindow  = -1  Peye menm jou, APRE lè a
//  late        = -3  1 jou an reta
//  veryLate    = -5  2+ jou an reta
//  missing     = -7  Pa peye ditou
//
// REKIPERASYON LANT:
//   Si manm nan te an reta nan 2+ nan dènye 3 peman yo,
//   pwen maksimòm li ka jwenn pou chak peman se +2
//   (pa +7, +5, +3 oubyen +1) — li monte men dousman
// ─────────────────────────────────────────────────────────────

const POINTS = {
  earlyDepo:   7,
  earlyDay:    5,
  early:       3,
  onTime:      1,
  lateWindow: -1,
  late:       -3,
  veryLate:   -5,
  missing:    -7,
}

// Kat: timing string → pwen
const TIMING_TO_POINTS = {
  earlyDepo:  POINTS.earlyDepo,
  earlyDay:   POINTS.earlyDay,
  early:      POINTS.early,
  onTime:     POINTS.onTime,
  lateWindow: POINTS.lateWindow,
  late:       POINTS.late,
  veryLate:   POINTS.veryLate,
}

// ─────────────────────────────────────────────────────────────
// HELPER: Dat jounen an (Haiti UTC-5)
// ─────────────────────────────────────────────────────────────
function getHaitiToday() {
  return new Date(new Date().getTime() - 5 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
}

function getHaitiNow() {
  return new Date(new Date().getTime() - 5 * 60 * 60 * 1000)
}

// ─────────────────────────────────────────────────────────────
// KALKILE TIMING GRANULÈ
// Fòksyon sa ekspoze pou markPaid ka itilize li
//
// @param dueDate    {string|Date}  Dat peman an te dwe fèt
// @param paidAt     {Date}         Lè manm nan peye a
// @param dueTime    {string}       '15:00'  — kòmansman fenèt peman
// @param dueTimeEnd {string}       '17:00'  — fèmti fenèt peman
// @returns {string} timing code
// ─────────────────────────────────────────────────────────────
function computeDetailedTiming(dueDate, paidAt, dueTime = '08:00', dueTimeEnd = '15:00') {
  try {
    // Konvèti tout en dat Haiti (UTC-5)
    const toHaitiDate = (d) => {
      const dt = new Date(d)
      return new Date(dt.getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    const dueDateStr  = toHaitiDate(dueDate)
    const paidDateStr = toHaitiDate(paidAt)

    // Kalkile diferans jou (negatif = peye avan, pozitif = reta)
    const due  = new Date(dueDateStr)
    const paid = new Date(paidDateStr)
    const diffDays = Math.round((paid - due) / (1000 * 60 * 60 * 24))

    // Depo rezèv — peye 2+ jou davans
    if (diffDays <= -2) return 'earlyDepo'

    // Jou avan dat la
    if (diffDays === -1) return 'earlyDay'

    // Menm jou — verifye lè a
    if (diffDays === 0) {
      const paidHaitiTime = new Date(new Date(paidAt).getTime() - 5 * 60 * 60 * 1000)
      const paidH = paidHaitiTime.getHours()
      const paidM = paidHaitiTime.getMinutes()
      const paidMinutes = paidH * 60 + paidM

      const [startH, startM] = dueTime.split(':').map(Number)
      const [endH,   endM]   = dueTimeEnd.split(':').map(Number)
      const windowStart = startH * 60 + startM
      const windowEnd   = endH   * 60 + endM

      if (paidMinutes < windowStart) return 'early'       // Avan lè a
      if (paidMinutes <= windowEnd)  return 'onTime'      // Nan lè a
      return 'lateWindow'                                  // Apre lè a, menm jou
    }

    // Reta
    if (diffDays === 1) return 'late'
    return 'veryLate'  // 2+ jou reta

  } catch {
    return 'onTime'  // Pa ka kalkile — default
  }
}

// ─────────────────────────────────────────────────────────────
// HELPER: Kalkile tout dat peman pou yon plan
// ─────────────────────────────────────────────────────────────
function getAllPaymentDates(plan) {
  const dates    = []
  const start    = new Date(plan.startDate)
  const freq     = plan.frequency || 'weekly'
  const interval = Number(plan.interval || 1)
  const total    = plan.maxMembers || 1

  for (let i = 0; i < total; i++) {
    const d = new Date(start)
    switch (freq) {
      case 'daily':    d.setDate(d.getDate()    + i * interval); break
      case 'weekly':   d.setDate(d.getDate()    + i * 7 * interval); break
      case 'biweekly': d.setDate(d.getDate()    + i * 14); break
      case 'monthly':  d.setMonth(d.getMonth()  + i * interval); break
      default:         d.setDate(d.getDate()    + i * 7); break
    }
    dates.push(d.toISOString().split('T')[0])
  }
  return dates.sort()
}

// ─────────────────────────────────────────────────────────────
// KALKILE SKOR AVANSE — Echèl tan konplè + Rekiperasyon lant
// ─────────────────────────────────────────────────────────────
function calcScore(member, allDates, today) {
  const payments       = member.payments       || {}
  const paymentTimings = member.paymentTimings || {}

  // Kolekte istwa peman yo nan lòd kronolojik
  const history = []
  for (const date of allDates) {
    if (date > today) break
    if (payments[date]) {
      const t = paymentTimings[date] || 'onTime'
      history.push({ date, timing: t, paid: true })
    } else {
      history.push({ date, timing: 'missing', paid: false })
    }
  }

  let score = 0

  for (let i = 0; i < history.length; i++) {
    const entry = history[i]

    if (!entry.paid) {
      score += POINTS.missing
      continue
    }

    // Verifye si manm nan nan reji rekiperasyon
    // (te an reta nan 2+ nan dènye 3 peman ki te fèt avan sa a)
    const recentHistory = history.slice(Math.max(0, i - 3), i)
    const recentLateCount = recentHistory.filter(
      h => h.timing === 'late' || h.timing === 'veryLate' || !h.paid
    ).length

    const isInRecovery = recentLateCount >= 2

    // Pwen debaz selon timing
    const basePoints = TIMING_TO_POINTS[entry.timing] ?? POINTS.onTime

    // Si nan reji rekiperasyon, plafon pwen pozitif = +2
    if (isInRecovery && basePoints > 0) {
      score += Math.min(basePoints, 2)
    } else {
      score += basePoints
    }
  }

  return score
}

// ─────────────────────────────────────────────────────────────
// BREAKDOWN SKOR — Detay pou afichaj UI
// ─────────────────────────────────────────────────────────────
function calcScoreBreakdown(member, allDates, today) {
  const payments       = member.payments       || {}
  const paymentTimings = member.paymentTimings || {}

  const breakdown = {
    earlyDepo: 0, earlyDay: 0, early: 0,
    onTime: 0, lateWindow: 0, late: 0, veryLate: 0, missing: 0,
    total: 0, inRecovery: false,
  }

  const history = []
  for (const date of allDates) {
    if (date > today) break
    if (payments[date]) {
      const t = paymentTimings[date] || 'onTime'
      history.push({ date, timing: t, paid: true })
      breakdown[t] = (breakdown[t] || 0) + 1
    } else {
      history.push({ date, timing: 'missing', paid: false })
      breakdown.missing++
    }
  }

  // Verifye si aktyèlman nan reji rekiperasyon
  if (history.length >= 3) {
    const last3 = history.slice(-3)
    const lateInLast3 = last3.filter(
      h => h.timing === 'late' || h.timing === 'veryLate' || !h.paid
    ).length
    breakdown.inRecovery = lateInLast3 >= 2
  }

  breakdown.total = calcScore(member, allDates, today)
  return breakdown
}

// ─────────────────────────────────────────────────────────────
// JENERE permanentId pou yon nouvo manm
// ─────────────────────────────────────────────────────────────
async function generatePermanentId(planId) {
  const count = await prisma.sabotayMember.count({ where: { planId } })
  return 'M' + String(count + 1).padStart(3, '0')
}

// ─────────────────────────────────────────────────────────────
// REKALILE POZISYON — Kè algorit dinamik la
// ─────────────────────────────────────────────────────────────
async function recalculatePositions(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { orderBy: { position: 'asc' } } },
  })

  if (!plan)                  throw new Error('Plan pa jwenn')
  if (!plan.dynamicPositions) return { skipped: true, reason: 'dynamicPositions dezaktive' }

  const today    = getHaitiToday()
  const allDates = getAllPaymentDates(plan)

  // 1. Manm ki touche deja — plas enchanjab
  const wonMembers   = plan.members.filter(m => m.hasWon)
  const wonPositions = new Set(wonMembers.map(m => m.position))

  const competing = plan.members.filter(
    m => !m.hasWon && m.isActive && m.status !== 'stopped'
  )

  if (competing.length === 0) return { recalculated: 0, message: 'Pa gen manm pou klase' }

  // 2. Kalkile skor avanse pou chak manm
  const scored = competing.map(m => ({
    id:          m.id,
    permanentId: m.permanentId,
    score:       calcScore(m, allDates, today),
    createdAt:   m.createdAt,
  }))

  // 3. Trye: pi bon skor ann premye, dat enskripsyon si egal
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  // 4. Slot disponib = pozisyon ki PA touche
  const allPositions = plan.members.map(m => m.position).sort((a, b) => a - b)
  const available    = allPositions.filter(p => !wonPositions.has(p))

  // 5. Asiye nouvo pozisyon + sove skor
  const updates = scored.map((m, idx) =>
    prisma.sabotayMember.update({
      where: { id: m.id },
      data: {
        position:         available[idx] ?? m.position,
        performanceScore: m.score,
      },
    })
  )

  await prisma.$transaction(updates)
  console.log(`[RANKING] Plan ${planId}: ${updates.length} manm reklase`)

  return {
    recalculated: updates.length,
    ranking: scored.map((m, idx) => ({
      permanentId: m.permanentId,
      newPosition: available[idx],
      score:       m.score,
    })),
  }
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT — Klasman aktyèl ak detay skor
// ─────────────────────────────────────────────────────────────
async function getRankingSnapshot(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { orderBy: { position: 'asc' } } },
  })

  if (!plan) throw new Error('Plan pa jwenn')

  const today    = getHaitiToday()
  const allDates = getAllPaymentDates(plan)

  return plan.members.map(m => {
    const breakdown = calcScoreBreakdown(m, allDates, today)
    return {
      id:             m.id,
      permanentId:    m.permanentId,
      name:           m.name,
      position:       m.position,
      score:          breakdown.total,
      breakdown,
      hasWon:         m.hasWon,
      isStopped:      m.status === 'stopped',
      positionLocked: m.hasWon,
    }
  }).sort((a, b) => a.position - b.position)
}

module.exports = {
  recalculatePositions,
  generatePermanentId,
  getRankingSnapshot,
  calcScore,
  calcScoreBreakdown,
  computeDetailedTiming,   // ← ekspoze pou markPaid ka itilize
  getAllPaymentDates,
  POINTS,
  TIMING_TO_POINTS,
}