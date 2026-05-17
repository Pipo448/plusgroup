// ══════════════════════════════════════════════════════════════
// position-ranking.service.js
// Algorit klasman dinamik — Sabotay Sol
// ✅ FIX FINAL: available[idx] ?? originalPosition (pa negatif tanporè)
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

function getHaitiToday() {
  return new Date(new Date().getTime() - 5 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
}

function getHaitiNow() {
  const nowHaiti = new Date(Date.now() - 5 * 60 * 60 * 1000)
  return {
    today:       nowHaiti.toISOString().split('T')[0],
    currentTime: `${String(nowHaiti.getUTCHours()).padStart(2, '0')}:${String(nowHaiti.getUTCMinutes()).padStart(2, '0')}`,
  }
}

function isDateOverdue(date, today, currentTime = null, dueTimeEnd = null) {
  if (!date) return false
  if (date < today) return true
  if (date === today) {
    if (!currentTime || !dueTimeEnd) return false
    return currentTime > dueTimeEnd
  }
  return false
}

function getCollectKey(member) {
  const cd = member?.collectDate
  if (!cd) return null
  try {
    return cd instanceof Date
      ? cd.toISOString().split('T')[0]
      : String(cd).split('T')[0]
  } catch { return null }
}

function daysBetween(fromKey, toKey) {
  const a = new Date(`${fromKey}T00:00:00Z`)
  const b = new Date(`${toKey}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

function isPositionLocked(member, today, lockWindowDays = 2) {
  if (!member) return false
  if (member.hasWon) return true
  const collectKey = getCollectKey(member)
  if (!collectKey) return false
  const daysUntilCollect = daysBetween(today, collectKey)
  return daysUntilCollect <= lockWindowDays
}

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

function computeDetailedTiming(dueDate, paidAt, dueTime = '08:00', dueTimeEnd = '15:00') {
  try {
    const dueDateStr  = String(dueDate).split('T')[0]
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

function calcScore(member, allDates, today, currentTime = null, dueTimeEnd = null) {
  const payments       = member.payments       || {}
  const paymentTimings = member.paymentTimings || {}

  const history = []
  for (const date of allDates) {
    const overdue = isDateOverdue(date, today, currentTime, dueTimeEnd)

    if (!overdue) {
      if (payments[date]) {
        const t = paymentTimings[date] || 'earlyDepo'
        history.push({ date, timing: t, paid: true, isFuture: true })
      }
      continue
    }

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
    const overdue = isDateOverdue(date, today, currentTime, dueTimeEnd)

    if (!overdue) {
      if (payments[date]) {
        const t = paymentTimings[date] || 'earlyDepo'
        history.push({ date, timing: t, paid: true, isFuture: true })
        breakdown[t] = (breakdown[t] || 0) + 1
      }
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

async function generatePermanentId(planId) {
  const count = await prisma.sabotayMember.count({ where: { planId } })
  return 'M' + String(count + 1).padStart(3, '0')
}

async function recalculatePositions(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
  })

  if (!plan)                  throw new Error('Plan pa jwenn')
  if (!plan.dynamicPositions) return { skipped: true, reason: 'dynamicPositions dezaktive' }

  const { today, currentTime } = getHaitiNow()
  const dueTimeEnd     = plan.dueTimeEnd || '17:00'
  const lockWindowDays = Number(plan.lockWindowDays ?? 2)
  const allDates       = getAllPaymentDates(plan)

  // ─── Manm aktif sèlman ────────────────────────────────────
  const activeMembers = plan.members.filter(
    m => m.isActive && m.status !== 'stopped'
  )

  if (activeMembers.length === 0) {
    return { recalculated: 0, message: 'Pa gen manm aktif' }
  }

  // ─── Kalkile skò ─────────────────────────────────────────
  const allScored = activeMembers.map(m => {
    const { payments, paymentTimings } = buildPaymentMap(m.payments)
    const score = calcScore(
      { ...m, payments, paymentTimings },
      allDates, today, currentTime, dueTimeEnd,
    )
    return {
      id:               m.id,
      permanentId:      m.permanentId,
      score,
      createdAt:        m.createdAt,
      originalPosition: m.position, // ✅ KRITIK: sove pozisyon ORIGINAL (pozitif)
      locked:           isPositionLocked(m, today, lockWindowDays),
    }
  })

  // ─── Pozisyon LOCK ────────────────────────────────────────
  const lockedPositions = new Set(
    allScored.filter(s => s.locked).map(s => s.originalPosition)
  )

  // ─── Manm k ap konpetisyone ───────────────────────────────
  const competing = allScored
    .filter(s => !s.locked)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(a.createdAt) - new Date(b.createdAt)
    })

  // ─── Pozisyon disponib ────────────────────────────────────
  // ✅ FIX: sèlman manm aktif, pozisyon pozitif
  const allPositions = activeMembers
    .map(m => m.position)
    .filter(p => p > 0)
    .sort((a, b) => a - b)

  const available = allPositions.filter(p => !lockedPositions.has(p))

  console.log(`[RANKING DEBUG] competing=${competing.length}, available=${available.length}, locked=${lockedPositions.size}`, available)

  // ═══════════════════════════════════════════════════════════
  // ETAP 1: Pozisyon negatif tanporè
  // ═══════════════════════════════════════════════════════════
  if (competing.length > 0) {
    await prisma.$transaction(
      competing.map((m, idx) =>
        prisma.sabotayMember.update({
          where: { id: m.id },
          data:  { position: -(idx + 100000) },
        })
      )
    )
  }

  // ═══════════════════════════════════════════════════════════
  // ETAP 2: Pozisyon final
  // ✅ FIX KRITIK: si available[idx] pa egziste, itilize
  //    originalPosition (pozitif!) pa currentPosition (negatif!)
  // ═══════════════════════════════════════════════════════════
  if (competing.length > 0) {
    await prisma.$transaction(
      competing.map((m, idx) =>
        prisma.sabotayMember.update({
          where: { id: m.id },
          data: {
            position:         available[idx] ?? m.originalPosition, // ✅ originalPosition!
            performanceScore: m.score,
          },
        })
      )
    )
  }

  // ═══════════════════════════════════════════════════════════
  // ETAP 3: Ajou skò manm LOCK yo
  // ═══════════════════════════════════════════════════════════
  const lockedScored = allScored.filter(s => s.locked)
  if (lockedScored.length > 0) {
    await prisma.$transaction(
      lockedScored.map(m =>
        prisma.sabotayMember.update({
          where: { id: m.id },
          data:  { performanceScore: m.score },
        })
      )
    )
  }

  console.log(
    `[RANKING] Plan ${planId}: ${competing.length} reklase, ` +
    `${lockedScored.length} lock, today=${today}, ` +
    `time=${currentTime}, dueTimeEnd=${dueTimeEnd}, lockWindow=${lockWindowDays}j`
  )

  return {
    recalculated: competing.length,
    lockedCount:  lockedScored.length,
    ranking: competing.map((m, idx) => ({
      permanentId: m.permanentId,
      newPosition: available[idx] ?? m.originalPosition,
      score:       m.score,
    })),
    locked: lockedScored.map(m => ({
      permanentId: m.permanentId,
      position:    m.originalPosition,
      score:       m.score,
    })),
  }
}

async function getRankingSnapshot(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
  })

  if (!plan) throw new Error('Plan pa jwenn')

  const { today, currentTime } = getHaitiNow()
  const dueTimeEnd = plan.dueTimeEnd || '17:00'
  const allDates   = getAllPaymentDates(plan)

  return plan.members.map(m => {
    const { payments, paymentTimings } = buildPaymentMap(m.payments)
    const mWithMaps = { ...m, payments, paymentTimings }
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
  getHaitiToday,
  getHaitiNow,
  isDateOverdue,
  isPositionLocked,
  getCollectKey,
  daysBetween,
  POINTS,
  TIMING_TO_POINTS,
}