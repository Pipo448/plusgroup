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

/**
 * ✅ NOUVO: Konvèti collectDate (Date oswa string) → 'YYYY-MM-DD'
 */
function getCollectKey(member) {
  const cd = member?.collectDate
  if (!cd) return null
  try {
    return cd instanceof Date
      ? cd.toISOString().split('T')[0]
      : String(cd).split('T')[0]
  } catch { return null }
}

/**
 * ✅ NOUVO: Konte jou ant 2 dat 'YYYY-MM-DD' (b - a)
 */
function daysBetween(fromKey, toKey) {
  const a = new Date(`${fromKey}T00:00:00Z`)
  const b = new Date(`${toKey}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

/**
 * ✅ NOUVO: Èske pozisyon yon manm ENCHANJAB (locked)?
 *
 * Yon pozisyon LOCK si YOUN nan kondisyon sa yo vre:
 *   1. Manm nan deja touche (`hasWon`) — lock pou toujou
 *   2. Dat touche a (collectDate) se jodi a OUBYEN li pase deja
 *   3. Rete `lockWindowDays` jou oswa mwens pou manm nan touche
 *
 * NÒT: menm si pozisyon an lock, SKÒ a TOUJOU kalkile separeman —
 *      sa pèmèt move pèfòmans afekte pwochen sòl la.
 *
 * @param {object} member
 * @param {string} today          - 'YYYY-MM-DD' Ayiti
 * @param {number} lockWindowDays - default 2 (jodi, demen, apredmen)
 */
function isPositionLocked(member, today, lockWindowDays = 2) {
  if (!member) return false
  if (member.hasWon) return true

  const collectKey = getCollectKey(member)
  if (!collectKey) return false

  const daysUntilCollect = daysBetween(today, collectKey)
  // daysUntilCollect <= 0  → jodi a oswa pase deja
  // daysUntilCollect <= 2  → rete 2 jou oswa mwens
  return daysUntilCollect <= lockWindowDays
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
// ✅ NOUVO: Pozisyon LOCK (enchanjab) si:
//      • hasWon (touche deja), OUBYEN
//      • collectDate jodi a / pase, OUBYEN
//      • rete ≤ 2 jou pou touche
//    MEN skò TOUJOU kalkile pou TOUT moun (menm sa ki lock)
//    — konsa move pèfòmans afekte pwochen sòl la.
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
  const dueTimeEnd     = plan.dueTimeEnd || '17:00'
  const lockWindowDays = Number(plan.lockWindowDays ?? 2)  // konfigirab si bezwen
  const allDates       = getAllPaymentDates(plan)

  // ─── Manm aktif (eskli stopped) ───────────────────────────
  const activeMembers = plan.members.filter(
    m => m.isActive && m.status !== 'stopped'
  )

  if (activeMembers.length === 0) {
    return { recalculated: 0, message: 'Pa gen manm aktif' }
  }

  // ─── Kalkile skò pou TOUT manm aktif (lock OSWA pa lock) ──
  // Sa enpòtan: menm manm ki lock dwe gen skò ajou pou pwochen sòl
  const allScored = activeMembers.map(m => {
    const { payments, paymentTimings } = buildPaymentMap(m.payments)
    const score = calcScore(
      { ...m, payments, paymentTimings },
      allDates, today, currentTime, dueTimeEnd,
    )
    return {
      id:              m.id,
      permanentId:     m.permanentId,
      score,
      createdAt:       m.createdAt,
      currentPosition: m.position,
      locked:          isPositionLocked(m, today, lockWindowDays),
    }
  })

  // ─── Pozisyon LOCK yo — pa ka reasiyen ───────────────────
  const lockedPositions = new Set(
    allScored.filter(s => s.locked).map(s => s.currentPosition)
  )

  // ─── Manm k ap konpetisyone (pozisyon yo ka chanje) ──────
  const competing = allScored
    .filter(s => !s.locked)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(a.createdAt) - new Date(b.createdAt)
    })

 // ─── Pozisyon disponib (sa ki PA lock) ───────────────────
const allPositions = plan.members
  .filter(m => m.isActive && m.status !== 'stopped')
  .map(m => m.position)
  .filter(p => p > 0)  // ✅ pa negatif
  .sort((a, b) => a - b)

const available = allPositions.filter(p => !lockedPositions.has(p))

console.log(`[RANKING DEBUG] competing=${competing.length}, available=${available.length}, locked=${lockedScored.length}`, available)

  // ═══════════════════════════════════════════════════════════
 // ETAP 1: Pozisyon temp negatif — SÈLMAN manm k ap konpetisyone
if (competing.length > 0) {
  await prisma.$transaction(
    competing.map((m, idx) =>
      prisma.sabotayMember.update({
        where: { id: m.id },
        data:  { position: -(idx + 100000) }, // ✅ 100000 olye 1000
      })
    )
  )
}

  // ═══════════════════════════════════════════════════════════
  // ETAP 2: Pozisyon final pou manm k ap konpetisyone YO SÈLMAN
  // ═══════════════════════════════════════════════════════════
  if (competing.length > 0) {
    await prisma.$transaction(
      competing.map((m, idx) =>
        prisma.sabotayMember.update({
          where: { id: m.id },
          data: {
            position:         available[idx] ?? m.currentPosition,
            performanceScore: m.score,
          },
        })
      )
    )
  }

  // ═══════════════════════════════════════════════════════════
  // ETAP 3: Mete skò AJOU pou manm LOCK yo (pozisyon PA chanje)
  //         — kritik: move pèfòmans dwe afekte pwochen sòl la
  // ═══════════════════════════════════════════════════════════
  const lockedScored = allScored.filter(s => s.locked)
  if (lockedScored.length > 0) {
    await prisma.$transaction(
      lockedScored.map(m =>
        prisma.sabotayMember.update({
          where: { id: m.id },
          data:  { performanceScore: m.score }, // SÈLMAN skò, PA pozisyon
        })
      )
    )
  }

  console.log(
    `[RANKING] Plan ${planId}: ${competing.length} reklase, ` +
    `${lockedScored.length} lock (skò ajou), today=${today}, ` +
    `time=${currentTime}, dueTimeEnd=${dueTimeEnd}, lockWindow=${lockWindowDays}j`
  )

  return {
    recalculated: competing.length,
    lockedCount:  lockedScored.length,
    ranking: competing.map((m, idx) => ({
      permanentId: m.permanentId,
      newPosition: available[idx],
      score:       m.score,
    })),
    locked: lockedScored.map(m => ({
      permanentId: m.permanentId,
      position:    m.currentPosition,
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
  isPositionLocked,
  getCollectKey,
  daysBetween,
  POINTS,
  TIMING_TO_POINTS,
}