// ══════════════════════════════════════════════════════════════
// position-ranking.service.js
// Algorit klasman dinamik — Sabotay Sol
// Path: src/modules/sabotay/position-ranking.service.js
// ✅ FIX: Respekte dueTimeEnd — jodi a pa konte kòm "missing"
//         anvan fenèt peman fini.
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
// HELPERS — Lè ak Dat Ayiti (UTC-5)
// ─────────────────────────────────────────────────────────────
function getHaitiToday() {
  return new Date(new Date().getTime() - 5 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
}

/**
 * ✅ NOUVO: Retounen ni dat ni lè aktyèl Ayiti
 */
function getHaitiNow() {
  const nowHaiti = new Date(Date.now() - 5 * 60 * 60 * 1000)
  return {
    today:       nowHaiti.toISOString().split('T')[0],
    currentTime: `${String(nowHaiti.getUTCHours()).padStart(2, '0')}:${String(nowHaiti.getUTCMinutes()).padStart(2, '0')}`,
  }
}

/**
 * ✅ NOUVO: Yon dat se "an reta" SÈLMAN si:
 *   • li avan jodi a, OUBYEN
 *   • li jodi a epi lè a depase fen fenèt peman (`dueTimeEnd`)
 *
 * Si parametr opsyonèl `currentTime` oswa `dueTimeEnd` manke,
 * fonksyon an konsidere SÈLMAN dat ki STRIKTEMAN avan jodi kòm "an reta".
 * Sa vle di: jodi a PA konte kòm "missing" pa default. Sa pi sekirite.
 */
function isDateOverdue(date, today, currentTime = null, dueTimeEnd = null) {
  if (!date) return false
  if (date < today) return true
  if (date === today) {
    if (!currentTime || !dueTimeEnd) return false
    return currentTime > dueTimeEnd
  }
  return false
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
// KALKILE TIMING GRANULÈ (chak peman)
// ─────────────────────────────────────────────────────────────
function computeDetailedTiming(dueDate, paidAt, dueTime = '08:00', dueTimeEnd = '15:00') {
  try {
    const dueDateStr = String(dueDate).split('T')[0]
    const paidHaiti  = new Date(new Date(paidAt).getTime() - 5 * 60 * 60 * 1000)
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
// ✅ FIX KRITIK: aksepte `currentTime` ak `dueTimeEnd` opsyonèl
//
// Lojik:
//   • Dat fiti OSWA jodi avan dueTimeEnd      → pa peye = pa penalize
//   • Dat ki VRÈMAN an reta (pase, oswa jodi
//     apre dueTimeEnd) ki pa peye             → -7 (missing)
//   • Tout peman fèt                          → konte selon timing yo
// ─────────────────────────────────────────────────────────────
function calcScore(member, allDates, today, currentTime = null, dueTimeEnd = null) {
  const payments       = member.payments       || {}
  const paymentTimings = member.paymentTimings || {}

  const history = []
  for (const date of allDates) {
    // ✅ FIX KRITIK: itilize isDateOverdue olye `date > today`
    const overdue = isDateOverdue(date, today, currentTime, dueTimeEnd)

    if (!overdue) {
      // Dat fiti OSWA jodi avan dueTimeEnd
      if (payments[date]) {
        const t = paymentTimings[date] || 'earlyDepo'
        history.push({ date, timing: t, paid: true, isFuture: true })
      }
      // Pa peye = pa penalize (poko an reta)
      continue
    }

    // Dat VRÈMAN an reta
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

    const isInRecovery = (() => {
      if (entry.isFuture) return false
      const recentPast      = history.slice(Math.max(0, i - 3), i).filter(h => !h.isFuture)
      const recentLateCount = recentPast.filter(
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
// ✅ FIX: aksepte `currentTime` ak `dueTimeEnd` opsyonèl
// ─────────────────────────────────────────────────────────────
function calcScoreBreakdown(member, allDates, today, currentTime = null, dueTimeEnd = null) {
  const payments       = member.payments       || {}
  const paymentTimings = member.paymentTimings || {}

  const breakdown = {
    earlyDepo: 0, earlyDay: 0, early: 0,
    onTime: 0, lateWindow: 0, late: 0, veryLate: 0, missing: 0,
    total: 0, inRecovery: false,
  }

  const history = []
  for (const date of allDates) {
    // ✅ FIX KRITIK
    const overdue = isDateOverdue(date, today, currentTime, dueTimeEnd)

    if (!overdue) {
      if (payments[date]) {
        const t = paymentTimings[date] || 'earlyDepo'
        history.push({ date, timing: t, paid: true, isFuture: true })
        breakdown[t] = (breakdown[t] || 0) + 1
      }
      // Pa peye = pa konte
      continue
    }

    if (payments[date]) {
      const t = paymentTimings[date] || 'onTime'
      history.push({ date, timing: t, paid: true, isFuture: false })
      breakdown[t] = (breakdown[t] || 0) + 1
    } else {
      history.push({ date, timing: 'missing', paid: false, isFuture: false })
      breakdown.missing++
    }
  }

  const pastHistory = history.filter(h => !h.isFuture)
  if (pastHistory.length >= 3) {
    const last3 = pastHistory.slice(-3)
    const lateInLast3 = last3.filter(
      h => h.timing === 'late' || h.timing === 'veryLate' || !h.paid
    ).length
    breakdown.inRecovery = lateInLast3 >= 2
  }

  breakdown.total = calcScore(member, allDates, today, currentTime, dueTimeEnd)
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
// ✅ FIX P2002: 2-etap pou evite unique constraint [plan_id, position]
// ✅ FIX TIMING: pase currentTime ak dueTimeEnd nan calcScore
// ─────────────────────────────────────────────────────────────
async function recalculatePositions(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
  })

  if (!plan)                  throw new Error('Plan pa jwenn')
  if (!plan.dynamicPositions) return { skipped: true, reason: 'dynamicPositions dezaktive' }

  // ✅ Pran ni today ni currentTime
  const { today, currentTime } = getHaitiNow()
  const dueTimeEnd = plan.dueTimeEnd || '17:00'
  const allDates   = getAllPaymentDates(plan)

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
      // ✅ FIX: pase currentTime ak dueTimeEnd
      score:       calcScore({ ...m, payments, paymentTimings }, allDates, today, currentTime, dueTimeEnd),
      createdAt:   m.createdAt,
    }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const allPositions = plan.members.map(m => m.position).sort((a, b) => a - b)
  const available    = allPositions.filter(p => !wonPositions.has(p))

  // ETAP 1: Pozisyon temp negatif
  await prisma.$transaction(
    scored.map((m, idx) =>
      prisma.sabotayMember.update({
        where: { id: m.id },
        data:  { position: -(idx + 1000) },
      })
    )
  )

  // ETAP 2: Pozisyon final ak skor
  await prisma.$transaction(
    scored.map((m, idx) =>
      prisma.sabotayMember.update({
        where: { id: m.id },
        data: {
          position:         available[idx] ?? m.position,
          performanceScore: m.score,
        },
      })
    )
  )

  console.log(`[RANKING] Plan ${planId}: ${scored.length} manm reklase (today=${today}, time=${currentTime}, dueTimeEnd=${dueTimeEnd})`)

  return {
    recalculated: scored.length,
    ranking: scored.map((m, idx) => ({
      permanentId: m.permanentId,
      newPosition: available[idx],
      score:       m.score,
    })),
  }
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT — Klasman aktyèl ak detay skor
// ✅ FIX TIMING: pase currentTime ak dueTimeEnd
// ─────────────────────────────────────────────────────────────
async function getRankingSnapshot(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
  })

  if (!plan) throw new Error('Plan pa jwenn')

  // ✅ Pran ni today ni currentTime
  const { today, currentTime } = getHaitiNow()
  const dueTimeEnd = plan.dueTimeEnd || '17:00'
  const allDates   = getAllPaymentDates(plan)

  return plan.members.map(m => {
    const { payments, paymentTimings } = buildPaymentMap(m.payments)
    const mWithMaps = { ...m, payments, paymentTimings }
    // ✅ FIX
    const breakdown = calcScoreBreakdown(mWithMaps, allDates, today, currentTime, dueTimeEnd)

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
  // ✅ NOUVO: ekspoze helpers pou itilize lòt kote
  getHaitiToday,
  getHaitiNow,
  isDateOverdue,
  POINTS,
  TIMING_TO_POINTS,
}