// src/routes/sol.routes.js
const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const router   = express.Router()
const prisma = require('../config/prisma')
const solPushSvc  = require('../modules/sabotay/sol-push.service')
const exchangeSvc = require('../modules/sabotay/sol-exchange.service')

const SOL_JWT_SECRET = process.env.JWT_SECRET || 'plusgroup-sol-secret-change-me'
if (!process.env.JWT_SECRET) {
  // ⚠️ Sekirite: san JWT_SECRET nan environnement lan, tout moun ki konnen valè default la ka fabrike yon token.
  console.warn('[SOL] ⚠️ JWT_SECRET pa defini — ap itilize valè default la. Defini l sou Render.')
}

// ✅ NOUVO — limit eseye login (pwoteje kont yo kont devine modpas / brute-force).
// 8 move eseye pou chak (IP + non itilizatè) nan 15 minit → 429. Done yo rete nan memwa sèlman.
const LOGIN_MAX_FAILS = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const loginFails = new Map()   // key -> { count, first }
const loginKey = (req, username) =>
  `${String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()}|${String(username || '').toLowerCase().trim()}`
function loginLocked(key) {
  const r = loginFails.get(key)
  if (!r) return 0
  if (Date.now() - r.first > LOGIN_WINDOW_MS) { loginFails.delete(key); return 0 }
  return r.count >= LOGIN_MAX_FAILS ? Math.ceil((LOGIN_WINDOW_MS - (Date.now() - r.first)) / 60000) : 0
}
function loginFail(key) {
  const r = loginFails.get(key)
  if (!r || Date.now() - r.first > LOGIN_WINDOW_MS) loginFails.set(key, { count: 1, first: Date.now() })
  else r.count++
  if (loginFails.size > 5000) { for (const [k, v] of loginFails) if (Date.now() - v.first > LOGIN_WINDOW_MS) loginFails.delete(k) }
}

// ✅ NOUVO: netwaye nimewo telefòn pou konparezon "menm moun" (menm lojik ak
// sabotay.service.js) — retire tout sa ki pa chif.
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function computeTiming(dueDate, paidAt) {
  if (!paidAt) return 'onTime'
  const toHaitiDate = (d) => {
    const dt = new Date(d)
    dt.setMinutes(dt.getMinutes() - 5 * 60)
    return dt.toISOString().split('T')[0]
  }
  const due  = toHaitiDate(dueDate)
  const paid = toHaitiDate(paidAt)
  if (paid < due) return 'early'
  if (paid > due) return 'late'
  return 'onTime'
}

function buildPaymentMaps(sabotayPayments) {
  const payments = {}, paymentTimings = {}
  for (const p of sabotayPayments) {
    try {
      const dateKey = new Date(p.dueDate).toISOString().split('T')[0]
      payments[dateKey] = true
      // ✅ FIX: itilize `timing` ki DEJA anrejistre sou peman an (menm sistèm
      // kategori — earlyDepo/earlyDay/early/onTime/lateWindow/late/veryLate —
      // ki panel admin lan itilize a). Rekalkile ak yon fonksyon lokal senplifye
      // te bay move kategori ki pa t matche SCORE_POINTS, donk peman yo te
      // disparèt san yo pa konte nan skò a.
      // ⚠️ KORIJE — chan an nan schema a rele `paid_at` (pa `paidAt`); ansyen
      // non an te lakòz `PrismaClientValidationError` sou CHAK apèl /members/me.
      paymentTimings[dateKey] = p.timing || computeTiming(p.dueDate, p.paidDate || p.paid_at || p.dueDate)
    } catch(_) {}
  }
  return { payments, paymentTimings }
}

// ══════════════════════════════════════════════════════════════
// ✅ NOUVO — BLOKAJ OTOMATIK POU RETA
// Depi sistèm nan wè manm nan AN RETA (menm règ ak panel admin lan:
// yon dat ki pase — oswa jodi a apre lè limit `dueTimeEnd` — ki pa peye),
// manm nan PA KA konekte nan kont sol li. Li debloke OTOMATIKMAN depi
// kesye a make peman ki an reta yo.
// ══════════════════════════════════════════════════════════════

// Lè Ayiti ak lè ete (UTC-4 / UTC-5)
function haitiNow() {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(x => [x.type, x.value]))
    return { today: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
  } catch {
    const d = new Date(Date.now() - 5 * 3600e3)
    return { today: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) }
  }
}

// Menm jenerasyon dat ak frontend (sabotayUtils.getPaymentDates) — sispann apre `untilDay`
function paymentDatesUntil(frequency, startDate, count, untilDay) {
  const out = []
  if (!count || count <= 0) return out
  const [y, m, d] = String(startDate).split('T')[0].split('-').map(Number)
  const cur = new Date(Date.UTC(y, m - 1, d))
  const key = (dt) => dt.toISOString().slice(0, 10)
  const advance = () => {
    const dow = cur.getUTCDay()
    switch (frequency) {
      case 'weekly_saturday': cur.setUTCDate(cur.getUTCDate() + (((6 - dow + 7) % 7) || 7)); break
      case 'weekly_monday':   cur.setUTCDate(cur.getUTCDate() + (((1 - dow + 7) % 7) || 7)); break
      case 'biweekly':        cur.setUTCDate(cur.getUTCDate() + 14); break
      case 'monthly':         cur.setUTCMonth(cur.getUTCMonth() + 1); break
      case 'weekdays':        do { cur.setUTCDate(cur.getUTCDate() + 1) } while ([0, 6].includes(cur.getUTCDay())); break
      default:                cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }
  for (let i = 0; i < count; i++) {
    if (i > 0) advance()
    const k = key(cur)
    if (k > untilDay) break
    out.push(k)
  }
  return out
}

// Retounen { late, count, amount, planName } pou manm (ak tout "men" li yo menm telefòn)
// Kach 20 segonn: login lan epi /members/me ki vini imedyatman apre a pa kalkile 2 fwa (sa te ralanti chajman an)
const lateCache = new Map()   // accountId -> { t, st }
async function getLateStatus(account) {
  const hit = lateCache.get(account?.id)
  if (hit && Date.now() - hit.t < 20000) return hit.st
  const st = await computeLateStatus(account)
  if (account?.id && st && st.error !== true) {
    lateCache.set(account.id, { t: Date.now(), st })
    if (lateCache.size > 2000) lateCache.clear()
  }
  return st
}
async function computeLateStatus(account) {
  try {
    if (!account?.memberId) return { late: false }
    const { today, time } = haitiNow()
    const digits = normalizePhone(account.memberPhone)
    const last8  = digits.slice(-8)

    const select = {
      id: true, phone: true, hasWon: true, status: true, isActive: true, planId: true,
      payments: { select: { dueDate: true } },
      plan: { select: { id: true, name: true, amount: true, frequency: true, startDate: true, interval: true, dueTimeEnd: true, status: true, tenantId: true, maxMembers: true } },
    }
    let members = []
    if (last8.length >= 6) {
      members = await prisma.sabotayMember.findMany({
        where: { phone: { contains: last8 }, isActive: true, plan: { tenantId: account.tenantId } },
        select,
      })
      members = members.filter(m => normalizePhone(m.phone).endsWith(last8))
    }
    if (!members.some(m => m.id === account.memberId)) {
      const own = await prisma.sabotayMember.findUnique({ where: { id: account.memberId }, select }).catch(() => null)
      if (own) members.push(own)
    }

    const schedCache = {}
    let lateDates = 0, lateAmount = 0, planName = null
    for (const m of members) {
      const plan = m.plan
      if (!plan || plan.status === 'closed' || plan.status === 'finished') continue
      if (m.status === 'stopped' || m.hasWon) continue   // menm règ ak panel admin lan
      if (schedCache[plan.id] === undefined) {
        schedCache[plan.id] = await prisma.sabotayMember.findMany({ where: { planId: plan.id, isActive: true }, select: { id: true, position: true, status: true, hasWon: true } }).catch(() => [])
      }
      const sched = schedCache[plan.id].length ? solScheduleInfo(plan, schedCache[plan.id], m.id, today) : null
      const totalCycles = Math.max(1, sched ? sched.dateSlots : 1) * Math.max(1, Math.floor(Number(plan.interval) || 1))
      const dueTimeEnd  = plan.dueTimeEnd || '17:00'
      const paid = new Set(m.payments.map(p => new Date(p.dueDate).toISOString().slice(0, 10)))
      const dates = paymentDatesUntil(plan.frequency, plan.startDate.toISOString(), totalCycles, today)
      const overdue = dates.filter(d => (d < today || (d === today && time > dueTimeEnd)) && !paid.has(d))
      if (overdue.length) {
        lateDates  += overdue.length
        lateAmount += overdue.length * Number(plan.amount || 0)
        planName    = planName || plan.name
      }
    }
    return { late: lateDates > 0, count: lateDates, amount: lateAmount, planName }
  } catch (e) {
    console.warn('[SOL LATE CHECK]', e.message)
    return { late: false, error: true }   // pa janm bloke moun akoz yon erè sèvè (epi pa kache erè a)
  }
}

// Kantite "men" (manm) ki konte pou kalandriye a: pa kanpe + aktif, epi pa janm plis pase maxMembers sòl la.
// (Yon manm dezaktive/efase ki te rete konte te fè kalandriye a gen yon dat an plis: 28 olye 27.)
const cappedSlots = (count, plan) => {
  const max = Number(plan?.maxMembers) || 0
  return max > 0 ? Math.min(count, max) : count
}

// ══════════════════════════════════════════════════════════════
// ✅ NOUVO: kalandriye/montan chak manm lè gen manm kanpe.
//  • Manm ki DEJA touche (hasWon oswa dat touche orijinal li ≤ jodi a): dat ofisyèl yo ak montan an PA chanje.
//  • Manm ki POKO touche: chak manm kanpe retire 1 "men" nan montan an; chak plas kanpe ki te nan fiti
//    rakousi kalandriye a ak 1 dat, epi dat touche yo avanse.
//  `members` = [{ id, position, status, hasWon }] (aktif sèlman — manm kanpe yo ladan yo)
// ══════════════════════════════════════════════════════════════
function solScheduleInfo(plan, members, memberId, today) {
  const interval = Math.max(1, Math.floor(Number(plan.interval) || 1))
  const feeUnit  = Number(plan.feePerMember || plan.fee || 0)
  const amount   = Number(plan.amount || 0)
  const N        = Math.max(1, cappedSlots(members.length, plan))
  const stopped  = members.filter(m => m.status === 'stopped')
  const S        = Math.min(stopped.length, N)
  const startStr = plan.startDate instanceof Date ? plan.startDate.toISOString() : String(plan.startDate)
  const allDates = paymentDatesUntil(plan.frequency, startStr, N * interval, '9999-12-31')
  const origIdx  = (pos) => Math.min(Math.max(1, pos) * interval - 1, allDates.length - 1)
  const origDate = (pos) => allDates[origIdx(pos)] || null

  const me       = members.find(m => m.id === memberId) || {}
  const myOrig   = origDate(me.position)
  const touched  = !!me.hasWon || (myOrig && myOrig <= today) || me.status === 'stopped'

  // dat touche ki deja pase (nan kalandriye orijinal la)
  let pastRounds = 0
  for (let p = 1; p <= N; p++) if (origDate(p) && origDate(p) <= today) pastRounds++
  const futureStopped = stopped.filter(m => origDate(m.position) && origDate(m.position) > today).length

  // dat touche prevwa pou manm ki poko touche: yo avanse, nan lòd pozisyon
  let expectedPayoutDate = myOrig
  if (!touched) {
    const pending = members
      .filter(m => m.status !== 'stopped' && !m.hasWon && origDate(m.position) > today)
      .sort((a, b) => a.position - b.position)
    const j = pending.findIndex(m => m.id === memberId) + 1
    if (j > 0) expectedPayoutDate = allDates[Math.min((pastRounds + j) * interval - 1, allDates.length - 1)] || myOrig
  }

  const dateSlots   = touched ? N : Math.max(1, N - futureStopped)
  const payoutSlots = touched ? N : Math.max(1, N - S)
  const fullPayout  = Math.max(0, (amount * N - feeUnit) * interval)
  const payout      = Math.max(0, (amount * payoutSlots - feeUnit) * interval)
  const endDate     = paymentDatesUntil(plan.frequency, startStr, dateSlots * interval, '9999-12-31').pop() || null
  return {
    touched, stoppedCount: S, originalSlots: N, dateSlots, payoutSlots,
    payoutAmount: payout, originalPayoutAmount: fullPayout, reducedBy: fullPayout - payout,
    originalPayoutDate: myOrig, expectedPayoutDate, endDate,
    originalEndDate: allDates[allDates.length - 1] || null,
  }
}

const lateMessage = (st) =>
  `🔒 Kont ou bloke: ou gen ${st.count} peman an reta (${Number(st.amount).toLocaleString('fr-HT')} HTG)` +
  `${st.planName ? ` nan « ${st.planName} »` : ''}. Kontakte admin lan pou w regle peman yo — kont lan ap debloke otomatikman.`

function authMember(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token manke' })
  try {
    const payload = jwt.verify(token, SOL_JWT_SECRET)
    if (payload.role !== 'sol_member') return res.status(401).json({ message: 'Token pa valid pou manm sol' })
    req.solMember = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token ekspire oswa pa valid' })
  }
}

function authAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token admin obligatwa' })
  try {
    req.admin = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET)
    return next()
  } catch {}
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return res.status(401).json({ message: 'Token admin pa valid' })
    }
    req.admin = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Token admin pa valid' })
  }
}

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'Non itilizatè ak modpas obligatwa' })

    const lockKey = loginKey(req, username)
    const lockMin = loginLocked(lockKey)
    if (lockMin) return res.status(429).json({ message: `Twòp move eseye. Tann ${lockMin} minit epi eseye ankò.` })

    const accounts = await prisma.solMemberAccount.findMany({
      where: { username: username.toLowerCase().trim() }
    })
    if (!accounts.length) { loginFail(lockKey); return res.status(401).json({ message: 'Non itilizatè oswa modpas pa kòrèk' }) }

    let matchedAccount = null
    for (const acc of accounts) {
      const valid = await bcrypt.compare(password, acc.passwordHash)
      if (valid) { matchedAccount = acc; break }
    }
    if (!matchedAccount) { loginFail(lockKey); return res.status(401).json({ message: 'Non itilizatè oswa modpas pa kòrèk' }) }
    loginFails.delete(lockKey)   // koneksyon reyisi → efase konte a

    // ✅ FIX 3: Verifye si manm nan bloke — bloke = pa ka konekte
    const [sabotayMember, lateSt] = await Promise.all([
      matchedAccount.memberId
        ? prisma.sabotayMember.findUnique({ where: { id: matchedAccount.memberId }, select: { isBlocked: true, status: true } }).catch(() => null)
        : Promise.resolve(null),
      getLateStatus(matchedAccount),
    ])
    if (matchedAccount.memberId) {
      // ✅ NOUVO: manm kanpe (stopped) ka konekte pou wè mesaj kanpe a + montan l ap touche a
      const isBlocked = sabotayMember?.isBlocked === true && sabotayMember?.status !== 'stopped'
      if (isBlocked) {
        return res.status(403).json({
          message: '🔒 Kont ou bloke poutèt reta peman. Kontakte admin pou debloke l.',
          blocked: true
        })
      }
    }

    // ✅ NOUVO: blokaj otomatik si manm nan an reta
    if (lateSt.late && sabotayMember?.status !== 'stopped') {
      return res.status(403).json({ message: lateMessage(lateSt), blocked: true, late: true, lateCount: lateSt.count, lateAmount: lateSt.amount })
    }

    // ⚠️ KORIJE EGRESS — sa a se sous 1160.8KB `/sol/auth/login` a. `logoUrl`
    // se yon imaj brit ki ka fè plizyè santèn KB; menm fix ki te fèt deja
    // nan `/api/v1/auth/login` prensipal la (auth.service.js).
    const tenant = await prisma.tenant.findUnique({
      where: { id: matchedAccount.tenantId },
      select: { id: true, name: true, phone: true, address: true }
    })
    const token = jwt.sign(
      { role: 'sol_member', accountId: matchedAccount.id, memberId: matchedAccount.memberId, planId: matchedAccount.planId, tenantId: matchedAccount.tenantId },
      SOL_JWT_SECRET, { expiresIn: '7d' }
    )
    return res.json({
      token,
      member: { id: matchedAccount.memberId, name: matchedAccount.memberName, phone: matchedAccount.memberPhone, position: matchedAccount.memberPosition },
      tenant: tenant ? { ...tenant, businessName: tenant.name } : null
    })
  } catch (err) {
    console.error('[SOL LOGIN]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/auth/change-password', authMember, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Tout champ yo obligatwa' })
    if (newPassword.length < 4) return res.status(400).json({ message: 'Modpas nouvo dwe gen omwen 4 karaktè' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.solMember.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    const valid = await bcrypt.compare(currentPassword, account.passwordHash)
    if (!valid) return res.status(401).json({ message: 'Modpas aktyèl la pa kòrèk' })
    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.solMemberAccount.update({ where: { id: account.id }, data: { passwordHash: newHash, plainPassword: newPassword } })
    return res.json({ message: 'Modpas chanje avèk siksè' })
  } catch (err) {
    console.error('[SOL CHANGE-PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// buildPlanData
// ══════════════════════════════════════════════════════════════

// ⚠️ KORIJE EGRESS — sa a se sous 4.6MB `/sol/members/me` a. Chak apèl te
// chaje TOUT kolòn nan `payments` (`include: { payments: ... }`) pou CHAK
// manm ki NAN MENM PLAN AN (pou detekte "plizyè men" ak menm telefòn), pa
// sèlman manm k ap login la — pou yon plan ki gen anpil manm ak anpil
// istwa peman (plan chak jou sou plizyè mwa), sa fè dè milye ranje done
// konplè chaje chak fwa yon moun konekte. `buildPaymentMaps` sèlman
// bezwen dueDate/timing/paidDate/paid_at — menm fix ki te fèt deja nan
// position-ranking.service.js.
// ⚠️ KORIJE — chan an nan modèl SabotayPayment rele `paid_at` (san @map,
// non Prisma a se literalman `paid_at`), pa `paidAt`. Ansyen non an te
// lakòz `PrismaClientValidationError` sou chak apèl /members/me, ki te
// fè paj Sol la rete blanch pou tout moun.
const PAYMENT_SELECT_MINIMAL = { dueDate: true, timing: true, paidDate: true, paid_at: true }

async function buildPlanData(account, memberId) {
  if (!memberId) return null

  const sabotayMember = await prisma.sabotayMember.findUnique({
    where: { id: memberId },
    include: { plan: true, payments: { select: PAYMENT_SELECT_MINIMAL, orderBy: { dueDate: 'asc' } } }
  })
  if (!sabotayMember || !sabotayMember.plan) return null

  const plan = sabotayMember.plan
  const { payments, paymentTimings } = buildPaymentMaps(sabotayMember.payments)

  const isClosed = plan.status === 'closed' || plan.status === 'finished'
  // ✅ FIX: konpare nimewo yo NÒMALIZE (san espas/tirè/parantèz) pou pa rate
  // "men" ki gen menm moun men fòma telefòn diferan.
  const normTarget = normalizePhone(sabotayMember.phone)

  // ⚠️ KORIJE EGRESS — sa a se sous 5.8MB `/sol/members/me` a. AVAN, nou te
  // chaje TOUT istwa peman TOUT manm aktif nan plan an (`include: payments`)
  // epi SÈLMAN APRE sa filtre pa telefòn nan JavaScript — pou yon plan ki
  // gen anpil manm ak anpil istwa peman, sa te chaje done pou granmesi pou
  // tout manm ki PA menm "men" a. Kounye a nou fè yon PREMYE rekèt LEJE
  // (san peman) sèlman pou idantifye ki manm ki gen menm telefòn, epi yon
  // DEZYÈM rekèt ki chaje peman SÈLMAN pou moun sa yo.
  let allSlots
  if (normTarget) {
    const planCandidatesBasic = await prisma.sabotayMember.findMany({
      where: {
        planId: sabotayMember.planId,
        ...(isClosed ? {} : { isActive: true })
      },
      select: { id: true, phone: true },
      orderBy: { position: 'asc' }
    })
    const matchedIds = planCandidatesBasic
      .filter(m => normalizePhone(m.phone) === normTarget)
      .map(m => m.id)

    allSlots = matchedIds.length
      ? await prisma.sabotayMember.findMany({
          where: { id: { in: matchedIds } },
          include: { payments: { select: PAYMENT_SELECT_MINIMAL, orderBy: { dueDate: 'asc' } } },
          orderBy: { position: 'asc' }
        })
      : [sabotayMember]
  } else {
    allSlots = [sabotayMember]
  }

  const scheduleMembers = await prisma.sabotayMember.findMany({
    where: { planId: plan.id, ...(isClosed ? {} : { isActive: true }) },
    select: { id: true, position: true, status: true, hasWon: true },
  }).catch(() => [])
  const schedule = scheduleMembers.length
    ? solScheduleInfo(plan, scheduleMembers, sabotayMember.id, haitiNow().today)
    : null

  const activeMemberCount = await prisma.sabotayMember.count({
    where: { planId: plan.id, ...(isClosed ? {} : { isActive: true }) }
  }).catch(() => 0)

  const totalMemberCount = await prisma.sabotayMember.count({
    where: { planId: plan.id }
  }).catch(() => 0)

  // ✅ NOUVO: konte EGZAKTEMAN ak menm kritè panel admin lan itilize pou jenere
  // dat yo (status !== 'stopped') — pou skò "Chanpyon/Bon" a matche pafètman.
  const nonStoppedMemberCount = cappedSlots(await prisma.sabotayMember.count({
    where: { planId: plan.id, status: { not: 'stopped' }, ...(isClosed ? {} : { isActive: true }) }
  }).catch(() => activeMemberCount), plan)

  return {
    member: {
      id: sabotayMember.id,
      name: sabotayMember.name,
      phone: sabotayMember.phone || '',
      position: sabotayMember.position,
      accountPosition: account.memberPosition,
      balance: Number(account.balance || 0),
      // ✅ FIX 2: Ajoute performanceScore pou afichaj pwen dinamik
      performanceScore: sabotayMember.performanceScore ?? 0,
      // ✅ NOUVO: Dat pwomès peman admin lan deklare (san afiche pozisyon/klasman)
      declaredPayoutDate: sabotayMember.declaredPayoutDate || null,
      // ✅ NOUVO: estati manm nan (pou l wè si li kanpe) ak montan ranbousman "kanpe" a
      status: sabotayMember.status || 'active',
      stopRefundAmount: sabotayMember.stopRefundAmount ? Number(sabotayMember.stopRefundAmount) : null,
      stopRefundPaid: sabotayMember.stopRefundPaid || false,
      // ✅ NOUVO: kalkil ki pran an kont manm kanpe yo (montan, dat, mesaj)
      schedule,
      payments,
      paymentTimings,
      allSlots: allSlots.map(s => {
        const { payments: sp, paymentTimings: st } = buildPaymentMaps(s.payments)
        // ✅ NOUVO: chak "men" (eskl) gen pwòp dat pwomès pa li — manm nan
        // pa dwe wè ki "men" li ye SOF si admin deklare yon dat pou eskl sa a.
        return { id: s.id, position: s.position, payments: sp, paymentTimings: st, declaredPayoutDate: s.declaredPayoutDate || null }
      })
    },
    plan: {
      id: plan.id,
      name: plan.name,
      amount: Number(plan.amount),
      fee: Number(plan.fee),
      frequency: plan.frequency,
      maxMembers: plan.maxMembers,
      activeMemberCount,
      totalMemberCount,
      // ✅ NOUVO: kantite manm ki pa 'stopped' — menm kritè ak sabotayUtils.js
      // (getAllPaymentDates) itilize bò panel admin la, pou skò yo matche.
      nonStoppedMemberCount,
      // ✅ FIX 2: Ajoute dynamicPositioning pou frontend ka konnen si aktive
      dynamicPositioning: plan.dynamicPositioning ?? false,
      // ✅ NOUVO: si aktive, fwontenn kont sol la pa dwe afiche "Pozisyon #X"
      hidePositionInSol: plan.hidePositionInSol ?? false,
      // ✅ NOUVO: montan fiks penalite "kanpe" a — pou avèti manm nan davans
      stopPenaltyAmount: Number(plan.stopPenaltyAmount || 0),
      createdAt: plan.startDate.toISOString().split('T')[0],
      dueTime: plan.dueTime || account.planDueTime || '08:00',
      dueTimeEnd: plan.dueTimeEnd || account.planDueTimeEnd || '15:00',
      interval: plan.interval || account.planInterval || 1,
      feePerMember: Number(plan.feePerMember || account.planFeePerMember || 0),
      penalty: Number(plan.penalty || account.planPenalty || 0),
      regleman: plan.regleman || null
    }
  }
}


// MEMBERS/ME
// ══════════════════════════════════════════════════════════════

router.get('/members/me', authMember, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.solMember.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    if (!account.memberId) return res.status(400).json({ message: 'Kont sa pa gen manm ki asosye avèk li' })

    // ✅ NOUVO: si manm nan tonbe an reta pandan l te deja konekte → bloke aksè a tou
    const [blockedRow, lateSt, tenant] = await Promise.all([
      prisma.sabotayMember.findUnique({ where: { id: account.memberId }, select: { isBlocked: true, status: true } }).catch(() => null),
      getLateStatus(account),
      prisma.tenant.findUnique({ where: { id: account.tenantId }, select: { id: true, name: true, phone: true, address: true } }),
    ])
    const memberStopped = blockedRow?.status === 'stopped'
    if (blockedRow?.isBlocked && !memberStopped) {
      return res.status(403).json({ message: '🔒 Kont ou bloke poutèt reta peman. Kontakte admin pou debloke l.', blocked: true })
    }
    if (lateSt.late && !memberStopped) {
      return res.status(403).json({ message: lateMessage(lateSt), blocked: true, late: true, lateCount: lateSt.count, lateAmount: lateSt.amount })
    }

    // ⚠️ KORIJE EGRESS — menm pwoblèm `logoUrl` a, men isit la l te menm
    // ANVLOPE: fonksyon sa a rele yon fwa pou chak plan/kont (allPlansData),
    // epi `tenantFormatted` an te kopye nan CHAK antre nan `plans: [...]` —
    // sa vle di menm logo a te double/triple/kat fwa nan menm repons lan.
    const tenantFormatted = tenant ? { ...tenant, businessName: tenant.name } : null

    const primaryData = await buildPlanData(account, account.memberId)
    if (!primaryData) return res.status(404).json({ message: 'Manm oswa plan pa jwenn' })

    let allPlansData = [{ ...primaryData, id: primaryData.plan.id }]

    // ✅ FIX: Chèche TOUT pozisyon nan sol_member_positions pou kont sa a
    const allPositions = await prisma.solMemberPosition.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'asc' }
    })

    const posList = allPositions.filter(pos => pos.memberId && !allPlansData.find(p => p.plan.id === pos.planId))
    const posData = await Promise.all(posList.map(pos => buildPlanData(account, pos.memberId).catch(() => null)))
    for (const planData of posData) {
      if (planData && !allPlansData.find(p => p.plan.id === planData.plan.id)) allPlansData.push({ ...planData, id: planData.plan.id })
    }

    // ✅ Rete kòd orijinal la pou lòt kont (menm telefòn)
    const phone = primaryData.member.phone
    if (phone) {
      const otherAccounts = await prisma.solMemberAccount.findMany({
        where: { memberPhone: phone, tenantId: account.tenantId, id: { not: account.id }, memberId: { not: null } }
      })
      const otherData = await Promise.all(otherAccounts.map(o => buildPlanData(o, o.memberId).catch(() => null)))
      for (const planData of otherData) {
        if (planData && !allPlansData.find(p => p.plan.id === planData.plan.id)) {
          allPlansData.push({ ...planData, id: planData.plan.id })
        }
      }
    }

    if (allPlansData.length === 1) {
      return res.json({ member: primaryData.member, plan: primaryData.plan, tenant: tenantFormatted })
    }

    return res.json({
      tenant: tenantFormatted,
      member: primaryData.member,
      plan:   primaryData.plan,
      plans: allPlansData.map(d => ({ id: d.plan.id, member: d.member, plan: d.plan, tenant: tenantFormatted }))
    })
  } catch (err) {
    console.error('[SOL ME]', err)
    return res.status(500).json({ message: 'Erè sèvè', detail: err.message })
  }
})
// ══════════════════════════════════════════════════════════════
// ACCOUNTS (admin)
// ══════════════════════════════════════════════════════════════

router.post('/accounts', authAdmin, async (req, res) => {
  try {
    const { memberId, tenantId, dueTime, credentials } = req.body
    if (!memberId || !tenantId || !credentials?.username || !credentials?.password)
      return res.status(400).json({ message: 'memberId, tenantId, credentials.username, credentials.password obligatwa' })

    const sabotayMember = await prisma.sabotayMember.findUnique({
      where: { id: memberId }, include: { plan: true }
    })
    if (!sabotayMember) return res.status(404).json({ message: 'Manm pa jwenn nan SabotayMember' })
    if (sabotayMember.plan.tenantId !== tenantId)
      return res.status(403).json({ message: 'Manm sa pa nan tenant ou a' })

    const plan = sabotayMember.plan

    // ✅ FIX 1: Si nimewo telefòn nan deja gen kont Sol nan MENM TENANT an
    // → kreye nouvo kont pou nouvo plan an ak MENM username+modpas
    // → manm ap konekte yon sèl fwa epi wè tout plan li yo
    const existingInSameTenant = await prisma.solMemberAccount.findFirst({
      where: {
        memberPhone: sabotayMember.phone || '',
        tenantId,
        memberId: { not: memberId } // pa menm manm nan (evite loop)
      }
    })

    let finalUsername, finalPasswordHash, finalPlainPassword
    let reusingExistingCredentials = false

    if (existingInSameTenant && sabotayMember.phone) {
      // Reutilize username + modpas kont egzistan an pou menm login travay
      finalUsername        = existingInSameTenant.username
      finalPasswordHash    = existingInSameTenant.passwordHash
      finalPlainPassword   = existingInSameTenant.plainPassword
      reusingExistingCredentials = true
    } else {
      // Moun nouvo — jeneralize username (ak auto-suffix si lòt tenant gen menm username)
      finalUsername = credentials.username.toLowerCase().trim()
      const globalSameUsername = await prisma.solMemberAccount.findMany({
        where: { username: finalUsername }
      })
      if (globalSameUsername.some(a => a.tenantId !== tenantId)) {
        let suffix = 2
        while (await prisma.solMemberAccount.findFirst({
          where: { username: `${finalUsername}${suffix}`, tenantId }
        })) { suffix++ }
        finalUsername = `${finalUsername}${suffix}`
      }
      finalPlainPassword = credentials.password
      finalPasswordHash  = await bcrypt.hash(finalPlainPassword, 10)
    }

    // Verifye si kont pou memberId sa deja egziste
    const existingByMember = await prisma.solMemberAccount.findFirst({
      where: { memberId: sabotayMember.id }
    })

    // Verifye unicite username nan menm tenant (sèlman si nouvo username)
    if (!reusingExistingCredentials) {
      const existingUsername = await prisma.solMemberAccount.findFirst({
        where: { username: finalUsername, tenantId }
      })
      if (existingUsername && existingUsername.memberId !== memberId)
        return res.status(409).json({ message: 'Non itilizatè sa deja pran nan enstitisyon sa a' })
    }

    const accountData = {
      username: finalUsername, passwordHash: finalPasswordHash, plainPassword: finalPlainPassword,
      tenantId, memberId: sabotayMember.id, memberName: sabotayMember.name,
      memberPhone: sabotayMember.phone || '', memberPosition: sabotayMember.position,
      planId: plan.id, planName: plan.name, planAmount: Number(plan.amount),
      planFee: Number(plan.fee), planFrequency: plan.frequency, planMaxMembers: plan.maxMembers,
      planCreatedAt: plan.startDate.toISOString().split('T')[0], planDueTime: dueTime || '08:00',
      planInterval: Number(plan.interval || 1), planFeePerMember: Number(plan.feePerMember || 0),
      planPenalty: Number(plan.penalty || 0), planRegleman: plan.regleman || null,
      payments: {}, paymentTimings: {}, fines: {},
    }

    const account = await prisma.solMemberAccount.create({ data: accountData })

    const usernameChanged = !reusingExistingCredentials &&
      finalUsername !== credentials.username.toLowerCase().trim()

    const baseNote = reusingExistingCredentials
      ? `Kont Sol egzistan an reutilize (${finalUsername}). Manm ap konekte ak menm username+modpas li genyen deja nan tenant sa a.`
      : usernameChanged
        ? `Username modifye otomatikman: ${credentials.username} → ${finalUsername} (deja egziste nan yon lòt enstitisyon)`
        : ''

    if (existingByMember) {
      return res.status(201).json({
        message: 'Plan ajoute sou kont Sol egzistan an!',
        accountId: account.id, username: account.username, plainPassword: account.plainPassword,
        note: `Manm sa gen deja kont "${existingByMember.username}" pou lòt plan. Nouvo plan ${plan.name} ajoute.`
          + (baseNote ? ' ' + baseNote : ''),
      })
    }

    return res.status(201).json({
      message: reusingExistingCredentials ? 'Plan ajoute — kont Sol egzistan reutilize!' : 'Kont kreye!',
      accountId: account.id, username: account.username, plainPassword: account.plainPassword,
      ...(baseNote && { note: baseNote })
    })
  } catch (err) {
    console.error('[SOL CREATE ACCOUNT]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/members/:memberId/check', authAdmin, async (req, res) => {
  try {
    const account = await prisma.solMemberAccount.findFirst({
      where: { memberId: req.params.memberId },
      select: { id: true, username: true, plainPassword: true, createdAt: true }
    })
    return res.json({ hasAccount: !!account, account: account || null })
  } catch (err) {
    console.error('[SOL CHECK]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/accounts', authAdmin, async (req, res) => {
  try {
    const { tenantId, planId } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const accounts = await prisma.solMemberAccount.findMany({
      where: { tenantId, ...(planId && { planId }) },
      select: { id: true, username: true, plainPassword: true, memberName: true, memberPhone: true, memberPosition: true, planName: true, createdAt: true },
      orderBy: { memberPosition: 'asc' }
    })
    return res.json({ accounts })
  } catch (err) {
    console.error('[SOL ACCOUNTS LIST]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.patch('/accounts/:accountId/reset-password', authAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ message: 'Modpas dwe gen omwen 4 karaktè' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.params.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    const passwordHash = await bcrypt.hash(newPassword, 10)
    // ✅ Lè modpas chanje, mete ajou TOUT kont Sol manm nan menm tenant (menm phone)
    await prisma.solMemberAccount.updateMany({
      where: { memberPhone: account.memberPhone, tenantId: account.tenantId },
      data: { passwordHash, plainPassword: newPassword }
    })
    return res.json({ message: 'Modpas reset avèk siksè pou tout plan manm nan', username: account.username })
  } catch (err) {
    console.error('[SOL RESET PW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

router.get('/push/vapid-public-key', (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU' })
})

router.post('/push/subscribe', authMember, async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription) return res.status(400).json({ message: 'Subscription obligatwa' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: req.solMember.accountId } })
    if (!account) return res.status(404).json({ message: 'Kont pa jwenn' })
    await solPushSvc.saveSolSubscription(account.tenantId, account.id, account.memberId, subscription)
    return res.json({ success: true, message: 'Push subscription anrejistre.' })
  } catch (err) {
    console.error('[SOL PUSH SUBSCRIBE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.delete('/push/unsubscribe', authMember, async (req, res) => {
  try {
    const { endpoint } = req.body
    if (endpoint) await solPushSvc.removeSolSubscription(endpoint)
    return res.json({ success: true })
  } catch (err) {
    console.error('[SOL PUSH UNSUBSCRIBE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// EXCHANGE
// ══════════════════════════════════════════════════════════════

router.get('/exchange/:planId/offers', authMember, async (req, res) => {
  try {
    const offers = await exchangeSvc.getPublicOffers(req.solMember.tenantId, req.params.planId, req.solMember.accountId)
    return res.json({ success: true, offers })
  } catch (err) {
    console.error('[SOL EXCHANGE OFFERS]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

router.get('/exchange/:planId/my', authMember, async (req, res) => {
  try {
    const exchanges = await exchangeSvc.getMemberExchanges(req.solMember.tenantId, req.solMember.accountId, req.params.planId)
    return res.json({ success: true, exchanges })
  } catch (err) {
    console.error('[SOL EXCHANGE MY]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

router.post('/exchange/:planId/initiate', authMember, async (req, res) => {
  try {
    const planId = req.params.planId || req.solMember.planId
    const exchange = await exchangeSvc.initiateExchange(req.solMember.tenantId, planId, req.solMember.accountId, req.body)
    return res.status(201).json({ success: true, exchange })
  } catch (err) {
    console.error('[SOL EXCHANGE INITIATE]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

router.post('/exchange/:exchangeId/accept', authMember, async (req, res) => {
  try {
    const result = await exchangeSvc.acceptExchange(req.solMember.tenantId, req.params.exchangeId, req.solMember.accountId)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL EXCHANGE ACCEPT]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

router.post('/exchange/:exchangeId/reject', authMember, async (req, res) => {
  try {
    const result = await exchangeSvc.rejectExchange(req.solMember.tenantId, req.params.exchangeId, req.solMember.accountId)
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL EXCHANGE REJECT]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

router.get('/admin/exchange', authAdmin, async (req, res) => {
  try {
    const { tenantId, planId, status, page, limit } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const result = await exchangeSvc.getAdminExchanges(tenantId, planId, { status, page: Number(page) || 1, limit: Number(limit) || 20 })
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[SOL ADMIN EXCHANGE]', err)
    return res.status(500).json({ message: err.message || 'Erè sèvè' })
  }
})

router.patch('/admin/exchange/:planId/config', authAdmin, async (req, res) => {
  try {
    const { tenantId } = req.query
    if (!tenantId) return res.status(400).json({ message: 'tenantId obligatwa' })
    const plan = await exchangeSvc.updateExchangeConfig(tenantId, req.params.planId, null, req.body)
    return res.json({ success: true, plan })
  } catch (err) {
    console.error('[SOL ADMIN EXCHANGE CONFIG]', err)
    return res.status(400).json({ message: err.message || 'Erè' })
  }
})

// ══════════════════════════════════════════════════════════════
// ACCOUNT BY PHONE
// ══════════════════════════════════════════════════════════════

router.get('/account-by-phone', authAdmin, async (req, res) => {
  try {
    const { phone, tenantId } = req.query
    if (!phone) return res.json({ account: null })
    const clean = phone.replace(/\s/g, '').trim()
    const account = await prisma.solMemberAccount.findFirst({
      where: { memberPhone: clean, ...(tenantId && { tenantId }) },
      select: { id: true, username: true, plainPassword: true, memberName: true, memberPhone: true, tenantId: true }
    })
    return res.json({ account: account || null })
  } catch (err) {
    console.error('[SOL ACCOUNT BY PHONE]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ✅ SEKIRITE: sa a te PIBLIK epi li te retounen `passwordHash` TOUT kont yo (nenpòt moun ki konnen URL la
// te ka telechaje yo epi eseye dekode modpas yo). Kounye a: admin sèlman, epi san okenn hash.
router.get('/debug/accounts', authAdmin, async (req, res) => {
  try {
    const accounts = await prisma.solMemberAccount.findMany({ select: { username: true, memberName: true, tenantId: true } })
    return res.json({ count: accounts.length, accounts })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════
// CHAT SOL
// ══════════════════════════════════════════════════════════════

router.get('/chat/:planId', authMember, async (req, res) => {
  try {
    const messages = await prisma.solChat.findMany({ where: { planId: req.params.planId, tenantId: req.solMember.tenantId }, orderBy: { createdAt: 'asc' }, take: 100 })
    return res.json({ messages })
  } catch (err) {
    console.error('[SOL CHAT GET]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/chat/:planId', authMember, async (req, res) => {
  try {
    const { planId } = req.params
    const { tenantId, memberId, accountId } = req.solMember
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ message: 'Mesaj obligatwa' })
    if (message.length > 500) return res.status(400).json({ message: 'Mesaj tro long (max 500 karaktè)' })
    const account = await prisma.solMemberAccount.findUnique({ where: { id: accountId }, select: { memberPosition: true } })
    const authorName = `Manm #${account?.memberPosition || '?'}`
    const msg = await prisma.solChat.create({ data: { planId, tenantId, authorId: memberId, authorName, isAdmin: false, message: message.trim() } })
    solPushSvc.notifyPlanMembers(tenantId, planId, memberId, { title: `💬 ${authorName}`, body: message.trim().substring(0, 80) }).catch(e => console.warn('[SOL CHAT PUSH]', e.message))
    return res.status(201).json({ message: msg })
  } catch (err) {
    console.error('[SOL CHAT POST]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/admin/chat/:planId', authAdmin, async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.admin.tenantId
    const messages = await prisma.solChat.findMany({ where: { planId: req.params.planId, tenantId }, orderBy: { createdAt: 'asc' }, take: 100 })
    return res.json({ messages })
  } catch (err) {
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.post('/admin/chat/:planId', authAdmin, async (req, res) => {
  try {
    const { planId } = req.params
    const { message } = req.body
    const tenantId = req.query.tenantId || req.admin.tenantId
    if (!message?.trim()) return res.status(400).json({ message: 'Mesaj obligatwa' })
    const msg = await prisma.solChat.create({ data: { planId, tenantId, authorId: 'admin', authorName: '👑 Admin', isAdmin: true, message: message.trim() } })
    solPushSvc.notifyPlanMembers(tenantId, planId, 'admin', { title: '👑 Admin', body: message.trim().substring(0, 80) }).catch(() => {})
    return res.status(201).json({ message: msg })
  } catch (err) {
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN
// ══════════════════════════════════════════════════════════════

router.get('/superadmin/overview', authAdmin, async (req, res) => {
  try {
    const plans = await prisma.sabotayPlan.findMany({ include: { tenant: { select: { id: true, name: true, slug: true } }, _count: { select: { members: { where: { isActive: true } } } } }, orderBy: { createdAt: 'desc' } })
    const result = plans.map(p => ({ planId: p.id, planName: p.name, amount: Number(p.amount), frequency: p.frequency, status: p.status, maxMembers: p.maxMembers, memberCount: p._count.members, startDate: p.startDate, tenant: { id: p.tenant.id, name: p.tenant.name, slug: p.tenant.slug } }))
    return res.json({ total: result.length, plans: result })
  } catch (err) {
    console.error('[SOL SUPERADMIN OVERVIEW]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.get('/superadmin/plans/:planId/members', authAdmin, async (req, res) => {
  try {
    const members = await prisma.sabotayMember.findMany({ where: { planId: req.params.planId }, orderBy: { position: 'asc' } })
    const memberIds = members.map(m => m.id)
    const solAccounts = await prisma.solMemberAccount.findMany({ where: { memberId: { in: memberIds } }, select: { memberId: true, username: true, plainPassword: true } })
    const accountMap = Object.fromEntries(solAccounts.map(a => [a.memberId, a]))
    const result = members.map(m => ({
      id: m.id, name: m.name, phone: m.phone || '', position: m.position,
      permanentId: m.permanentId || null, performanceScore: m.performanceScore ?? 0,
      isActive: m.isActive, isOwnerSlot: m.isOwnerSlot || false, hasWon: m.hasWon || false,
      username: accountMap[m.id]?.username || null,
      plainPassword: accountMap[m.id]?.plainPassword || null,
    }))
    return res.json({ members: result })
  } catch (err) {
    console.error('[SOL SUPERADMIN MEMBERS]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.patch('/superadmin/plans/:planId/members/:memberId', authAdmin, async (req, res) => {
  try {
    const { memberId } = req.params
    const { name, position, phone, isOwnerSlot, hasWon, username } = req.body
    const member = await prisma.sabotayMember.update({ where: { id: memberId }, data: { ...(name !== undefined && { name }), ...(position !== undefined && { position: Number(position) }), ...(phone !== undefined && { phone }), ...(isOwnerSlot !== undefined && { isOwnerSlot }), ...(hasWon !== undefined && { hasWon }) } })
    if (username) await prisma.solMemberAccount.updateMany({ where: { memberId }, data: { username: username.toLowerCase().trim(), memberName: name || member.name } })
    return res.json({ message: 'Manm ajou avèk siksè!', member })
  } catch (err) {
    console.error('[SOL SUPERADMIN PATCH MEMBER]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

// ══════════════════════════════════════════════════════════════
// ✅ NOUVO — DEMANN POU ANTRE NAN SÒL LA (fòm piblik sou paj login lan)
//   POST  /api/sol/join-requests             (piblik, rate-limit + honeypot)
//   GET   /api/sol/admin/join-requests       (admin)  ?status=nouvo|kontakte|aksepte|refize
//   PATCH /api/sol/admin/join-requests/:id   (admin)  { status, adminNote }
// Tab la (sol_join_requests) kreye otomatikman si l pa egziste. Ou ka kouri sol_join_requests.sql
// nan Supabase SQL Editor tou (menm bagay). Pa gen okenn chanjman nan schema.prisma.
// ══════════════════════════════════════════════════════════════
const JOIN_STATUSES = ['nouvo', 'kontakte', 'aksepte', 'refize']
const JOIN_MAX_PER_HOUR = 4
const joinHits = new Map()   // ip -> [timestamps]

let joinTableReady = null
function ensureJoinTable() {
  if (!joinTableReady) {
    joinTableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS sol_join_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "fullName" TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        occupation TEXT,
        "beenInOurSol" BOOLEAN,
        "likedText" TEXT,
        "dislikedText" TEXT,
        referrer TEXT,
        "howKnow" TEXT,
        "joinedOtherSol" BOOLEAN,
        "otherSolText" TEXT,
        frequency TEXT,
        amount INTEGER,
        "amountOther" TEXT,
        slots INTEGER,
        "startWhen" TEXT,
        "canRecruit" BOOLEAN,
        "recruitList" TEXT,
        message TEXT,
        "acceptRules" BOOLEAN NOT NULL DEFAULT false,
        "acceptContact" BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'nouvo',
        "adminNote" TEXT,
        "tenantId" TEXT,
        ip TEXT,
        ua TEXT
      )`)
      .then(() => prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS sol_join_requests_status_idx ON sol_join_requests (status, "createdAt" DESC)`))
      .then(() => prisma.$executeRawUnsafe(`ALTER TABLE sol_join_requests ADD COLUMN IF NOT EXISTS extra JSONB`))
      .then(() => prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS sol_join_config (id INTEGER PRIMARY KEY, config JSONB NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`))
      .catch(err => { joinTableReady = null; throw err })
  }
  return joinTableReady
}

const clean = (v, max = 300) =>
  (typeof v === 'string' ? v : v == null ? '' : String(v))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ').trim().slice(0, max)
const yesNo = (v) => (v === true || v === 'wi' || v === 'yes' || v === 'true') ? true : (v === false || v === 'non' || v === 'no' || v === 'false') ? false : null
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 64)

// ── Konfigirasyon kesyon yo (admin modifye) ─────────────────
const Q_TYPES = ['text', 'textarea', 'yesno', 'choice', 'stepper']
async function loadJoinConfig() {
  await ensureJoinTable()
  const rows = await prisma.$queryRawUnsafe(`SELECT config FROM sol_join_config WHERE id = 1`)
  return rows[0]?.config || null
}
function sanitizeJoinConfig(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const groups = (Array.isArray(raw.groups) ? raw.groups : []).slice(0, 8).map((g, i) => ({
    id: clean(g?.id, 40).toLowerCase().replace(/[^a-z0-9_]/g, '') || `g${i + 1}`,
    title: clean(g?.title, 80) || `Etap ${i + 1}`,
    sub: clean(g?.sub, 160),
  }))
  const gids = new Set(groups.map(g => g.id))
  if (!groups.length) return { error: 'Omwen yon etap obligatwa.' }
  const seen = new Set()
  const questions = []
  for (const q of (Array.isArray(raw.questions) ? raw.questions : []).slice(0, 40)) {
    const id = clean(q?.id, 40).toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(id) || seen.has(id)) return { error: `ID kesyon pa valid oswa double: "${clean(q?.id, 40)}"` }
    if (['fullname', 'phone', 'address', 'acceptrules', 'acceptcontact', 'website'].includes(id.toLowerCase())) return { error: `ID "${id}" rezève.` }
    seen.add(id)
    const type = Q_TYPES.includes(q.type) ? q.type : 'text'
    const label = clean(q.label, 300)
    if (!label) return { error: 'Chak kesyon dwe gen yon tèks.' }
    const sIf = q.showIf && typeof q.showIf === 'object' && q.showIf.id ? { id: clean(q.showIf.id, 40), value: q.showIf.value === true || q.showIf.value === false ? q.showIf.value : clean(q.showIf.value, 80) } : null
    questions.push({
      id, label, type,
      group: gids.has(q.group) ? q.group : groups[0].id,
      required: !!q.required, active: q.active !== false,
      placeholder: clean(q.placeholder, 200),
      options: type === 'choice' ? (Array.isArray(q.options) ? q.options : []).slice(0, 20).map(o => clean(o, 80)).filter(Boolean) : [],
      allowOther: type === 'choice' && !!q.allowOther,
      gold: !!q.gold,
      yesLabel: clean(q.yesLabel, 60), noLabel: clean(q.noLabel, 60),
      min: Number.isFinite(Number(q.min)) ? Math.max(0, Math.min(1000, Math.round(Number(q.min)))) : 1,
      max: Number.isFinite(Number(q.max)) ? Math.max(1, Math.min(1000, Math.round(Number(q.max)))) : 10,
      showIf: sIf,
    })
  }
  return { config: { groups, questions } }
}
// kesyon an vizib si pa gen showIf oswa si repons kesyon paran an koresponn
function joinQVisible(q, ans) {
  if (!q.showIf) return true
  const v = ans[q.showIf.id]
  return v === q.showIf.value || (typeof v === 'string' && String(q.showIf.value) === v)
}
const FREQ_BY_LABEL = { 'chak jou': 'chak_jou', 'chak semèn': 'chak_semen', 'chak 2 semèn': 'chak_de_semen', 'chak mwa': 'chak_mwa' }

router.get('/join-config', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60')
    return res.json({ config: await loadJoinConfig() })
  } catch (err) {
    console.error('[SOL JOIN CONFIG GET]', err)
    return res.json({ config: null })   // fòm lan itilize kesyon default li yo
  }
})
router.get('/admin/join-config', authAdmin, async (req, res) => {
  try { return res.json({ config: await loadJoinConfig() }) }
  catch (err) { console.error('[SOL JOIN CONFIG ADMIN GET]', err); return res.status(500).json({ message: 'Erè sèvè' }) }
})
router.put('/admin/join-config', authAdmin, async (req, res) => {
  try {
    await ensureJoinTable()
    if (req.body && req.body.reset === true) {
      await prisma.$executeRawUnsafe(`DELETE FROM sol_join_config WHERE id = 1`)
      return res.json({ config: null })
    }
    const out = sanitizeJoinConfig(req.body)
    if (out.error) return res.status(400).json({ message: out.error })
    await prisma.$executeRawUnsafe(
      `INSERT INTO sol_join_config (id, config, "updatedAt") VALUES (1, $1::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, "updatedAt" = now()`, JSON.stringify(out.config))
    return res.json({ config: out.config })
  } catch (err) {
    console.error('[SOL JOIN CONFIG PUT]', err)
    return res.status(500).json({ message: 'Pa ka sove kesyon yo.' })
  }
})

router.post('/join-requests', async (req, res) => {
  try {
    const b = req.body || {}
    // Honeypot: yon bot ranpli chan kache a → fè kòm si sa pase, men pa sove anyen.
    if (clean(b.website, 50)) return res.status(201).json({ ok: true, message: 'Mèsi!' })

    const ip = clientIp(req)
    const now = Date.now()
    const hits = (joinHits.get(ip) || []).filter(t => now - t < 3600000)
    if (hits.length >= JOIN_MAX_PER_HOUR) {
      return res.status(429).json({ message: 'Ou voye twòp demann. Tann yon ti tan epi eseye ankò.' })
    }

    const fullName = clean(b.fullName, 120)
    const phone    = clean(b.phone, 40)
    const address  = clean(b.address, 240)
    const digits   = phone.replace(/\D/g, '')
    if (fullName.split(' ').filter(Boolean).length < 2) return res.status(400).json({ message: 'Antre non konplè ou (non ak prenon).', field: 'fullName' })
    if (digits.length < 8 || digits.length > 15)        return res.status(400).json({ message: 'Nimewo telefòn lan pa valid.', field: 'phone' })
    if (address.length < 4)                             return res.status(400).json({ message: 'Antre adrès ou (vil/komin ak katye).', field: 'address' })
    if (b.acceptRules !== true || b.acceptContact !== true) return res.status(400).json({ message: 'Ou dwe aksepte regleman yo epi pèmèt nou kontakte w.', field: 'acceptRules' })

    // Repons yo: [{id,label,value}] (nouvo) — oswa chan dirèk (ansyen fòm nan kach)
    const list = []
    if (Array.isArray(b.answers)) {
      for (const a of b.answers.slice(0, 60)) {
        const id = clean(a?.id, 40)
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(id)) continue
        const v = a.value
        const value = typeof v === 'boolean' ? v : typeof v === 'number' && Number.isFinite(v) ? v : clean(v, 1500)
        if (value === '' || value === null) continue
        list.push({ id, label: clean(a.label, 300), value })
      }
    } else {
      for (const k of ['occupation','beenInOurSol','likedText','dislikedText','referrer','howKnow','joinedOtherSol','otherSolText','frequency','amount','slots','startWhen','canRecruit','recruitList','message']) {
        const v = b[k]; if (v === undefined || v === null || v === '') continue
        list.push({ id: k, label: k, value: typeof v === 'boolean' || typeof v === 'number' ? v : clean(v, 1500) })
      }
    }
    const ans = Object.fromEntries(list.map(a => [a.id, a.value]))

    // Si admin sove yon konfigirasyon: verifye kesyon obligatwa yo (ki vizib)
    const cfg = await loadJoinConfig().catch(() => null)
    if (cfg?.questions) {
      for (const q of cfg.questions) {
        if (q.active === false || !q.required || !joinQVisible(q, ans)) continue
        const v = ans[q.id]
        if (v === undefined || v === '' || v === null) return res.status(400).json({ message: `Reponn kesyon sa a: ${q.label}`, field: q.id })
      }
    }

    // Menm nimewo a nan 24 èdtan → pa double (retounen siksè san kreye yon lòt)
    const dup = await prisma.$queryRawUnsafe(
      `SELECT id FROM sol_join_requests WHERE regexp_replace(phone, '\\D', '', 'g') = $1 AND "createdAt" > now() - interval '24 hours' LIMIT 1`, digits)
    if (dup.length) return res.status(200).json({ ok: true, duplicate: true, message: 'Nou deja resevwa demann ou a. N ap kontakte w talè.' })

    // Mapping sou ansyen kolòn yo (pou rapò/filtre) — pi bon efò
    const txt = (k) => (typeof ans[k] === 'string' ? clean(ans[k], 1500) : (typeof ans[k] === 'number' ? String(ans[k]) : '')) || null
    const freqRaw = txt('frequency')
    const freq = freqRaw ? (FREQ_BY_LABEL[freqRaw.toLowerCase()] || (['chak_jou','chak_semen','chak_de_semen','chak_mwa'].includes(freqRaw) ? freqRaw : null)) : null
    const amtRaw = ans.amount !== undefined ? String(ans.amount).replace(/[\s,]/g, '') : ''
    const amtNum = /^\d+$/.test(amtRaw) ? Math.min(parseInt(amtRaw, 10), 10000000) : null
    const slotsN = Number.isFinite(Number(ans.slots)) && Number(ans.slots) > 0 ? Math.min(Math.round(Number(ans.slots)), 50) : null

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO sol_join_requests
        ("fullName", phone, address, occupation, "beenInOurSol", "likedText", "dislikedText", referrer, "howKnow",
         "joinedOtherSol", "otherSolText", frequency, amount, "amountOther", slots, "startWhen",
         "canRecruit", "recruitList", message, "acceptRules", "acceptContact", ip, ua, extra)
       VALUES ($1,$2,$3,$4,$5::boolean,$6,$7,$8,$9,$10::boolean,$11,$12,$13::int,$14,$15::int,$16,$17::boolean,$18,$19,true,true,$20,$21,$22::jsonb)
       RETURNING id`,
      fullName, phone, address, txt('occupation'),
      yesNo(ans.beenInOurSol), txt('likedText'), txt('dislikedText'),
      txt('referrer'), txt('howKnow'),
      yesNo(ans.joinedOtherSol), txt('otherSolText'),
      freq, amtNum, amtNum === null && amtRaw ? clean(String(ans.amount), 80) : null, slotsN, txt('startWhen'),
      yesNo(ans.canRecruit), txt('recruitList'), txt('message'),
      ip, clean(req.headers['user-agent'], 240) || null, JSON.stringify(list))

    hits.push(now); joinHits.set(ip, hits)
    if (joinHits.size > 5000) { for (const [k, v] of joinHits) if (!v.some(t => now - t < 3600000)) joinHits.delete(k) }

    return res.status(201).json({ ok: true, id: rows[0]?.id, message: 'Demann ou a rive! N ap kontakte w talè.' })
  } catch (err) {
    console.error('[SOL JOIN REQUEST]', err)
    return res.status(500).json({ message: 'Pa ka voye demann lan kounye a. Eseye ankò talè.' })
  }
})

router.get('/admin/join-requests', authAdmin, async (req, res) => {
  try {
    await ensureJoinTable()
    const status = JOIN_STATUSES.includes(req.query.status) ? req.query.status : null
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM sol_join_requests ${status ? 'WHERE status = $1' : ''} ORDER BY "createdAt" DESC LIMIT 300`,
      ...(status ? [status] : []))
    const counts = await prisma.$queryRawUnsafe(`SELECT status, COUNT(*)::int AS n FROM sol_join_requests GROUP BY status`)
    return res.json({ requests: rows, counts: Object.fromEntries(counts.map(c => [c.status, c.n])) })
  } catch (err) {
    console.error('[SOL JOIN LIST]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})

router.patch('/admin/join-requests/:id', authAdmin, async (req, res) => {
  try {
    await ensureJoinTable()
    const { status, adminNote } = req.body || {}
    if (status !== undefined && !JOIN_STATUSES.includes(status)) return res.status(400).json({ message: 'Estati pa valid' })
    const id = String(req.params.id || '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ message: 'ID pa valid' })
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE sol_join_requests SET status = COALESCE($2, status), "adminNote" = COALESCE($3, "adminNote"), "updatedAt" = now()
       WHERE id = $1::uuid RETURNING *`,
      id, status ?? null, adminNote !== undefined ? clean(adminNote, 1500) : null)
    if (!rows.length) return res.status(404).json({ message: 'Demann pa jwenn' })
    return res.json({ request: rows[0] })
  } catch (err) {
    console.error('[SOL JOIN PATCH]', err)
    return res.status(500).json({ message: 'Erè sèvè' })
  }
})


module.exports = router