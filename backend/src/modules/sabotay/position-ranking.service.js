// ══════════════════════════════════════════════════════════════
// position-ranking.service.js
// Algorit klasman dinamik — Sabotay Sol
// Path: src/modules/sabotay/position-ranking.service.js
// ══════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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

// ─────────────────────────────────────────────────────────────
// HELPER: Konvèti array peman Prisma → map {date: true}
// ─────────────────────────────────────────────────────────────
function buildPaymentMap(paymentsArray) {
  const payments = {}, paymentTimings = {}
  for (const p of (paymentsArray || [])) {
    try {
      const dk = String(p.dueDate instanceof Date
        ? p.dueDate.toISOString()
        : p.dueDate
      ).split('T')[0]
      payments[dk]       = true
      paymentTimings[dk] = p.timing || 'onTime'
    } catch(_) {}
  }
  return { payments, paymentTimings }
}

// ─────────────────────────────────────────────────────────────
// KALKILE TIMING GRANULÈ
// ─────────────────────────────────────────────────────────────
function computeDetailedTiming(dueDate, paidAt, dueTime = '08:00', dueTimeEnd = '15:00') {
  try {
    const dueDateStr = String(dueDate).split('T')[0]

    const paidHaiti   = new Date(new Date(paidAt).getTime() - 5 * 60 * 60 * 1000)
    const paidDateStr = paidHaiti.toISOString().split('T')[0]

    const due      = new Date(dueDateStr)
    const paid     = new Date(paidDateStr)
    const diffDays = Math.round((paid - due) / (1000 * 60 * 60 * 24))

    if (diffDays <= -2) return 'earlyDepo'
    if (diffDays === -1) return 'earlyDay'

    if (diffDays === 0) {
      const paidH       = paidHaiti.getUTCHours()
      const paidM       = paidHaiti.getUTCMinutes()
      const paidMinutes = paidH * 60 + paidM

      const [startH, startM] = dueTime.split(':').map(Number)
      const [endH,   endM]   = dueTimeEnd.split(':').map(Number)
      const windowStart = startH * 60 + startM
      const windowEnd   = endH   * 60 + endM

      if (paidMinutes < windowStart) return 'early'
      if (paidMinutes <= windowEnd)  return 'onTime'
      return 'lateWindow'
    }

    if (diffDays === 1) return 'late'
    return 'veryLate'

  } catch {
    return 'onTime'
  }
}

// ─────────────────────────────────────────────────────────────
// HELPER: Tout dat peman — parse lokal pou evite UTC shift
// ─────────────────────────────────────────────────────────────
function getAllPaymentDates(plan) {
  const dates    = []
  const freq     = plan.frequency || 'weekly'
  const interval = Number(plan.interval || 1)
  const total    = plan.maxMembers || 1

  const raw = plan.startDate instanceof Date
    ? plan.startDate.toISOString().split('T')[0]
    : String(plan.startDate || '').split('T')[0]

  const [y, mo, d] = raw.split('-').map(Number)
  const start = new Date(y, mo - 1, d)

  const toKey = (dt) => {
    const yr  = dt.getFullYear()
    const m   = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${yr}-${m}-${day}`
  }

  for (let i = 0; i < total; i++) {
    const dt = new Date(start)
    switch (freq) {
      case 'daily':           dt.setDate(dt.getDate()   + i * interval); break
      case 'weekly_saturday':
      case 'weekly':          dt.setDate(dt.getDate()   + i * 7 * interval); break
      case 'biweekly':        dt.setDate(dt.getDate()   + i * 14); break
      case 'monthly':         dt.setMonth(dt.getMonth() + i * interval); break
      default:                dt.setDate(dt.getDate()   + i * 7); break
    }
    dates.push(toKey(dt))
  }
  return dates.sort()
}

// ─────────────────────────────────────────────────────────────
// KALKILE SKOR
// ✅ FIX: Dat kap vini — konte earlyDepo si peye, skip si pa peye
// ─────────────────────────────────────────────────────────────
function calcScore(member, allDates, today) {
  const payments       = member.payments       || {}
  const paymentTimings = member.paymentTimings || {}

  const history = []
  for (const date of allDates) {
    const isFuture = date > today

    if (isFuture) {
      // ✅ Dat kap vini — konte sèlman si manm nan deja peye (earlyDepo/earlyDay)
      // Si pa peye — pa penalize, jis skip
      if (payments[date]) {
        const t = paymentTimings[date] || 'earlyDepo'
        history.push({ date, timing: t, paid: true, isFuture: true })
      }
      continue
    }

    // Dat pase — lojik nòmal
    if (payments[date]) {
      const t = paymentTimings[date] || 'onTime'
      history.push({ date, timing: t, paid: true, isFuture: false })
    } else {
      history.push({ date, timing: 'missing', paid: false, isFuture: false })
    }
  }

  let score = 0

  for (let i = 0; i < history.length; i++) {
    const entry = history[i]

    if (!entry.paid) {
      score += POINTS.missing
      continue
    }

    // Rekiperasyon — pa aplike pou peman alavans (earlyDepo/earlyDay)
    const isInRecovery = (() => {
      if (entry.isFuture) return false
      const recentHistory   = history.slice(Math.max(0, i - 3), i).filter(h => !h.isFuture)
      const recentLateCount = recentHistory.filter(
        h => h.timing === 'late' || h.timing === 'veryLate' || !h.paid
      ).length
      return recentLateCount >= 2
    })()

    const basePoints = TIMING_TO_POINTS[entry.timing] ?? POINTS.onTime

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
// ✅ FIX: Dat kap vini — konte earlyDepo si peye, skip si pa peye
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
    const isFuture = date > today

    if (isFuture) {
      // ✅ Konte sèlman si peye alavans — pa penalize dat kap vini ki pa peye
      if (payments[date]) {
        const t = paymentTimings[date] || 'earlyDepo'
        history.push({ date, timing: t, paid: true, isFuture: true })
        breakdown[t] = (breakdown[t] || 0) + 1
      }
      continue
    }

    // Dat pase
    if (payments[date]) {
      const t = paymentTimings[date] || 'onTime'
      history.push({ date, timing: t, paid: true, isFuture: false })
      breakdown[t] = (breakdown[t] || 0) + 1
    } else {
      history.push({ date, timing: 'missing', paid: false, isFuture: false })
      breakdown.missing++
    }
  }

  // Verifye rekiperasyon — sèlman peman pase yo
  const pastHistory = history.filter(h => !h.isFuture)
  if (pastHistory.length >= 3) {
    const last3 = pastHistory.slice(-3)
    const lateInLast3 = last3.filter(
      h => h.timing === 'late' || h.timing === 'veryLate' || !h.paid
    ).length
    breakdown.inRecovery = lateInLast3 >= 2
  }

  breakdown.total = calcScore(member, allDates, today)
  return breakdown
}

// ─────────────────────────────────────────────────────────────
// JENERE permanentId
// ─────────────────────────────────────────────────────────────
async function generatePermanentId(planId) {
  const count = await prisma.sabotayMember.count({ where: { planId } })
  return 'M' + String(count + 1).padStart(3, '0')
}

// ─────────────────────────────────────────────────────────────
// REKALILE POZISYON
// ─────────────────────────────────────────────────────────────
async function recalculatePositions(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
  })

  if (!plan)                  throw new Error('Plan pa jwenn')
  if (!plan.dynamicPositions) return { skipped: true, reason: 'dynamicPositions dezaktive' }

  const today    = getHaitiToday()
  const allDates = getAllPaymentDates(plan)

  const wonMembers   = plan.members.filter(m => m.hasWon)
  const wonPositions = new Set(wonMembers.map(m => m.position))

  const competing = plan.members.filter(
    m => !m.hasWon && m.isActive && m.status !== 'stopped'
  )

  if (competing.length === 0) return { recalculated: 0, message: 'Pa gen manm pou klase' }

  const scored = competing.map(m => {
    const { payments, paymentTimings } = buildPaymentMap(m.payments)
    return {
      id:          m.id,
      permanentId: m.permanentId,
      score:       calcScore({ ...m, payments, paymentTimings }, allDates, today),
      createdAt:   m.createdAt,
    }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const allPositions = plan.members.map(m => m.position).sort((a, b) => a - b)
  const available    = allPositions.filter(p => !wonPositions.has(p))

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
    include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
  })

  if (!plan) throw new Error('Plan pa jwenn')

  const today    = getHaitiToday()
  const allDates = getAllPaymentDates(plan)

  return plan.members.map(m => {
    const { payments, paymentTimings } = buildPaymentMap(m.payments)
    const mWithMaps = { ...m, payments, paymentTimings }
    const breakdown = calcScoreBreakdown(mWithMaps, allDates, today)

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
  computeDetailedTiming,
  getAllPaymentDates,
  buildPaymentMap,
  POINTS,
  TIMING_TO_POINTS,
}