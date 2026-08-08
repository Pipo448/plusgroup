// ══════════════════════════════════════════════════════════════
// position-ranking.service.js
// Algorit klasman dinamik — Sabotay Sol
// Path: src/modules/sabotay/position-ranking.service.js
// ✅ FIX: Respekte dueTimeEnd — jodi a pa konte kòm "missing"
//         anvan fenèt peman fini.
// ══════════════════════════════════════════════════════════════
const prisma = require('../../config/prisma')const POINTS = {
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
 * Konvèti collectDate (Date oswa string) → 'YYYY-MM-DD'
 * (kenbe pou backward compat — isPositionLocked PA itilize l ankò)
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
 * Konte jou ant 2 dat 'YYYY-MM-DD' (b - a)
 */
function daysBetween(fromKey, toKey) {
  const a = new Date(`${fromKey}T00:00:00Z`)
  const b = new Date(`${toKey}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

/**
 * ✅ NOUVO: Sekans dat — menm lojik ak frontend getPaymentDates()
 */
function _seqPaymentDates(frequency, startKey, count) {
  if (count <= 0) return []
  const dates = []
  const [y, m, d] = String(startKey).split('T')[0].split('-').map(Number)
  let cur = new Date(y, m - 1, d)

  const toKey = (dt) => {
    const yr  = dt.getFullYear()
    const mo  = String(dt.getMonth() + 1).padStart(2, '0')
    const dy  = String(dt.getDate()).padStart(2, '0')
    return `${yr}-${mo}-${dy}`
  }
  const advance = () => {
    switch (frequency) {
      case 'daily':           cur.setDate(cur.getDate() + 1); break
      case 'weekly_saturday': cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      case 'weekly_monday':   cur.setDate(cur.getDate() + ((1 - cur.getDay() + 7) % 7 || 7)); break
      case 'biweekly':        cur.setDate(cur.getDate() + 14); break
      case 'monthly':         cur.setMonth(cur.getMonth() + 1); break
      case 'weekdays':
        do { cur.setDate(cur.getDate() + 1) } while ([0, 6].includes(cur.getDay())); break
      default:                cur.setDate(cur.getDate() + 7); break
    }
  }

  dates.push(toKey(cur))
  for (let i = 1; i < count; i++) { advance(); dates.push(toKey(new Date(cur))) }
  return dates
}

/**
 * ✅ NOUVO: Dat touche pou yon pozisyon — menm rezilta ak UI
 * (frontend getPayoutDate). Itilize POZISYON AKTYÈL, pa collectDate.
 */
function getPayoutDateForPosition(plan, position) {
  const interval = Math.max(1, Math.floor(Number(plan.interval) || 1))
  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const slots = Math.max(activeMembers.length || 1, position)
  const totalCycles = slots * interval

  const startKey = plan.startDate instanceof Date
    ? plan.startDate.toISOString().split('T')[0]
    : String(plan.startDate || plan.createdAt || '').split('T')[0]

  const allDates = _seqPaymentDates(plan.frequency || 'weekly', startKey, totalCycles)
  const idx = (position * interval) - 1
  if (idx < 0) return null
  return allDates[Math.min(idx, allDates.length - 1)] || null
}

/**
 * ✅ FIX: Èske pozisyon yon manm ENCHANJAB (locked)?
 *
 * LOCK si YOUN nan kondisyon sa yo vre:
 *   1. Manm nan deja touche (`hasWon`) — lock pou toujou
 *   2. Dat touche a (kalkile soti nan POZISYON AKTYÈL la, pa
 *      collectDate ki ka vin vye apre reklasman) tonbe nan
 *      fenèt: jodi a (0) JISKA jodi + lockWindowDays jou.
 *
 * Nou lock SÈLMAN `0 ≤ jou ≤ lockWindowDays` — pa dat ki pase
 * deja (sa se anomali, manm sa yo nòmalman hasWon deja).
 *
 * NÒT: menm si pozisyon lock, SKÒ a TOUJOU kalkile separeman.
 *
 * @param {object} member
 * @param {object} plan              - bezwen pou kalkile dat soti nan pozisyon
 * @param {string} today             - 'YYYY-MM-DD' Ayiti
 * @param {number} lockWindowDays    - default 2 (jodi + 2 = 3 manm)
 */
function isPositionLocked(member, plan, today, lockWindowDays = 2) {
  if (!member) return false
  if (member.hasWon) return true
  if (!plan) return false

  const payoutDate = getPayoutDateForPosition(plan, member.position)
  if (!payoutDate) return false

  const daysUntilCollect = daysBetween(today, payoutDate)
  // SÈLMAN jodi a (0) jiska +lockWindowDays jou.
  return daysUntilCollect >= 0 && daysUntilCollect <= lockWindowDays
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
// ✅ NOUVO: Pozisyon LOCK (enchanjab) — skò TOUJOU kalkile
// ✅ FIX RACE: yon sèl transaction + Postgres advisory lock
//      → menm si w make 10 peman vit pandan entènèt lan,
//        rekalkil yo fèt YOUN APRE LÒT, chak ak done fre.
//        Pa gen chif negatif ki ka rete bloke ankò.
// ─────────────────────────────────────────────────────────────

/**
 * Hash yon string ID → 31-bit int pou pg advisory lock
 */
function _lockKeyFromId(id) {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  // kenbe pozitif epi nan ranje 32-bit signed int
  return Math.abs(h) % 2147483647
}

// ─────────────────────────────────────────────────────────────
// ✅ PÈFÒMANS: mizajou annmas (bulk) olye yon UPDATE pa manm.
//   Yon sèl rekèt SQL pou N manm (unnest arrays) — sa retire
//   santèn de ale-retou rezo sekans ki te lakòz timeout 30s la
//   lè yon plan gen anpil manm.
// ─────────────────────────────────────────────────────────────
async function _bulkUpdateMemberPositions(tx, rows) {
  if (!rows.length) return
  const ids       = rows.map(r => r.id)
  const positions = rows.map(r => r.position)
  await tx.$executeRaw`
    UPDATE sabotay_members AS sm
    SET position = v.position
    FROM (SELECT * FROM unnest(${ids}::text[], ${positions}::int[]) AS v(id, position)) AS v
    WHERE sm.id = v.id
  `
}

async function _bulkUpdateMemberPositionsAndScores(tx, rows) {
  if (!rows.length) return
  const ids       = rows.map(r => r.id)
  const positions = rows.map(r => r.position)
  const scores    = rows.map(r => r.score)
  await tx.$executeRaw`
    UPDATE sabotay_members AS sm
    SET position = v.position, "performanceScore" = v.score
    FROM (SELECT * FROM unnest(${ids}::text[], ${positions}::int[], ${scores}::int[]) AS v(id, position, score)) AS v
    WHERE sm.id = v.id
  `
}

async function _bulkUpdateMemberScores(tx, rows) {
  if (!rows.length) return
  const ids    = rows.map(r => r.id)
  const scores = rows.map(r => r.score)
  await tx.$executeRaw`
    UPDATE sabotay_members AS sm
    SET "performanceScore" = v.score
    FROM (SELECT * FROM unnest(${ids}::text[], ${scores}::int[]) AS v(id, score)) AS v
    WHERE sm.id = v.id
  `
}

async function _bulkUpdateSolMemberPositions(tx, planId, rows) {
  if (!rows.length) return
  const ids       = rows.map(r => r.id)
  const positions = rows.map(r => r.position)
  try {
    await tx.$executeRaw`
      UPDATE sol_member_positions AS sp
      SET "memberPosition" = v.position
      FROM (SELECT * FROM unnest(${ids}::text[], ${positions}::int[]) AS v(id, position)) AS v
      WHERE sp."memberId" = v.id AND sp."planId" = ${planId}
    `
  } catch (_) {}
}

async function recalculatePositions(planId) {
  // ═══════════════════════════════════════════════════════════════
  // TOUT NAN YON SÈL TRANSACTION + ADVISORY LOCK
  //   → serialize apèl konkiran pou MENM plan an.
  //   → si nenpòt bagay echwe, TOUT bagay woule fè bak (rollback)
  //     donk pa gen pozisyon negatif ki ka rete bloke.
  //   ✅ PÈFÒMANS: tout mizajou yo kounye a fèt AN MAS (bulk),
  //      pa gen ankò yon rekèt sekans pa manm.
  // ═══════════════════════════════════════════════════════════════
  return await prisma.$transaction(async (tx) => {

    // 🔒 Advisory lock — lòt apèl pou menm plan an ap TANN isit la.
    //    Lock la lage otomatikman lè transaction nan fini.
    const lockKey = _lockKeyFromId(planId)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`

    // ─── Li done FRE anndan lock la ─────────────────────────────
    const plan = await tx.sabotayPlan.findUnique({
      where:   { id: planId },
      include: { members: { include: { payments: true }, orderBy: { position: 'asc' } } },
    })

    if (!plan)                  throw new Error('Plan pa jwenn')
    if (!plan.dynamicPositions) return { skipped: true, reason: 'dynamicPositions dezaktive' }

    const { today, currentTime } = getHaitiNow()
    const dueTimeEnd     = plan.dueTimeEnd || '17:00'
    const lockWindowDays = Number(plan.lockWindowDays ?? 2)
    const allDates       = getAllPaymentDates(plan)

    const activeMembers = plan.members.filter(
      m => m.isActive && m.status !== 'stopped'
    )
    if (activeMembers.length === 0) {
      return { recalculated: 0, message: 'Pa gen manm aktif' }
    }

    // ═════════════════════════════════════════════════════════════
    // ✅ SELF-HEAL: detekte epi repare pozisyon korije (negatif/dwòl)
    //   ki te ka rete bloke avan fix race condition an. Renumewote
    //   tout manm aktif 1..N (pozitif anvan, korije aprè) NAN MENM TX.
    //   Aprè sa, lojik nòmal la ap reklase yo pa skò.
    // ═════════════════════════════════════════════════════════════
    const hasCorruption = activeMembers.some(
      m => !Number.isInteger(m.position) || m.position <= 0
    )
    if (hasCorruption) {
      const ordered = [...activeMembers].sort((a, b) => {
        const pa = a.position > 0 ? a.position : 1e9 + Math.abs(a.position || 0)
        const pb = b.position > 0 ? b.position : 1e9 + Math.abs(b.position || 0)
        return pa - pb
      })
      // ETAP 1: tout sou negatif tanporè (san konfli) — 1 rekèt annmas
      await _bulkUpdateMemberPositions(
        tx, ordered.map((m, i) => ({ id: m.id, position: -(i + 5000) }))
      )
      // ETAP 2: renumewote 1..N — 1 rekèt annmas
      const healedRows = ordered.map((m, i) => ({ id: m.id, position: i + 1 }))
      await _bulkUpdateMemberPositions(tx, healedRows)
      await _bulkUpdateSolMemberPositions(tx, planId, healedRows)
      // Mete ajou objè lokal yo tou pou rès kalkil la
      for (const r of healedRows) {
        const am = activeMembers.find(x => x.id === r.id)
        if (am) am.position = r.position
      }
      console.log(`[SELF-HEAL] Plan ${planId}: ${ordered.length} pozisyon korije renumewote 1..${ordered.length}`)
    }

    // ─── Kalkile skò pou TOUT manm aktif ─────────────────────────
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
        locked:          isPositionLocked(m, plan, today, lockWindowDays),
      }
    })

    // ─── Pozisyon LOCK yo (sèlman pozisyon POZITIF valid) ────────
    const lockedScored = allScored.filter(s => s.locked)
    const lockedPositions = new Set(
      lockedScored
        .map(s => s.currentPosition)
        .filter(p => Number.isInteger(p) && p > 0)  // ✅ filtre negatif korije
    )

    // ─── Manm k ap konpetisyone (klase pa skò) ──────────────────
    const competing = allScored
      .filter(s => !s.locked)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return new Date(a.createdAt) - new Date(b.createdAt)
      })

    // ─── Pozisyon disponib — SOTI NAN SOUS STAB ─────────────────
    // ✅ FIX: Itilize SÈLMAN pozisyon pozitif valid. Si gen done
    //   korije (negatif soti nan ansyen bug), rekonstwi seri a
    //   1..N pou tout pozisyon ki PA lock.
    const positiveLocked = [...lockedPositions].sort((a, b) => a - b)
    const totalSlots     = activeMembers.length
    // Tout pozisyon posib 1..totalSlots, mwens sa ki lock
    const available = []
    for (let p = 1; p <= totalSlots; p++) {
      if (!lockedPositions.has(p)) available.push(p)
    }
    // Si gen plis manm konpetisyone pase plas (ka rive si lock
    // okipe pozisyon > totalSlots), ajoute plas anplis apre limit lan
    let extra = totalSlots + 1
    while (available.length < competing.length) {
      if (!lockedPositions.has(extra)) available.push(extra)
      extra++
    }

    // ═════════════════════════════════════════════════════════════
    // ETAP 1: Pozisyon temp negatif — SÈLMAN konpetisyone
    //   (1 rekèt annmas olye N — anndan menm tx, lock la anpeche
    //    nenpòt lòt apèl entèfere)
    // ═════════════════════════════════════════════════════════════
    await _bulkUpdateMemberPositions(
      tx, competing.map((m, idx) => ({ id: m.id, position: -(idx + 1000) }))
    )

    // ═════════════════════════════════════════════════════════════
    // ETAP 2: Pozisyon final + skò pou konpetisyone yo — 1 rekèt annmas
    // ═════════════════════════════════════════════════════════════
    await _bulkUpdateMemberPositionsAndScores(
      tx,
      competing.map((m, idx) => ({
        id:       m.id,
        position: available[idx] ?? m.currentPosition,
        score:    m.score,
      }))
    )

    // ═════════════════════════════════════════════════════════════
    // ETAP 3: Skò pou manm LOCK yo (pozisyon PA chanje) — 1 rekèt annmas
    // ═════════════════════════════════════════════════════════════
    await _bulkUpdateMemberScores(
      tx, lockedScored.map(m => ({ id: m.id, score: m.score }))
    )

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

  }, {
    // Bay ase tan: lock + kalkil + ekriti. Lòt apèl ap tann la a.
    timeout: 30000,  // 30s pou tranzaksyon an fini
    maxWait: 20000,  // 20s pou tann koumanse (si yon lòt ap kouri)
  })
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
  _lockKeyFromId,
  POINTS,
  TIMING_TO_POINTS,
}