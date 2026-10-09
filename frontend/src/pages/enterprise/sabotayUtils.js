// ─────────────────────────────────────────────────────────────
// sabotayUtils.js — Constants, Helpers, Calc Functions
// ─────────────────────────────────────────────────────────────

import html2canvas from 'html2canvas'
import { toCanvas } from 'html-to-image'
import jsPDF from 'jspdf'
import { prepareShare, shareCached } from '../../services/shareFile'

export const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
export const API_URL = import.meta.env.VITE_API_URL     || 'https://plusgroup-backend.onrender.com/api/v1'

// ✅ NOUVO: netwaye nimewo telefòn pou konparezon "menm moun" (menm lojik
// ak backend la) — retire tout sa ki pa chif.
export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

// ─── LABELS ──────────────────────────────────────────────────
export const FREQ_LABELS = {
  daily:           { ht: 'Chak Jou',       fr: 'Chaque jour',    en: 'Daily'          },
  weekly_saturday: { ht: 'Chak Samdi',     fr: 'Chaque samedi',  en: 'Every Saturday' },
  weekly_monday:   { ht: 'Chak Lendi',     fr: 'Chaque lundi',   en: 'Every Monday'   },
  biweekly:        { ht: 'Chak 15 Jou',   fr: 'Tous les 15 j.', en: 'Every 2 weeks'  },
  monthly:         { ht: 'Chak Mwa',       fr: 'Chaque mois',    en: 'Monthly'        },
  weekdays:        { ht: 'Lendi-Vandredi', fr: 'Lun-Ven',        en: 'Weekdays'       },
}

export const MEMBER_STATUS = {
  active:   { label: 'Aktif',  color: '#27ae60', bg: 'rgba(39,174,96,0.12)',   icon: '✅' },
  blocked:  { label: 'Bloke',  color: '#e74c3c', bg: 'rgba(231,76,60,0.12)',   icon: '🔒' },
  stopped:  { label: 'Kanpe',  color: '#f39c12', bg: 'rgba(243,156,18,0.12)',  icon: '⏸️' },
  finished: { label: 'Touche', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',  icon: '🏆' },
  late:     { label: 'Reta',   color: '#e67e22', bg: 'rgba(230,126,34,0.10)',  icon: '⚠️' },
}

export const PLAN_STATUS = {
  open:    { label: 'Ouvè',  color: '#27ae60', bg: 'rgba(39,174,96,0.12)'  },
  closed:  { label: 'Fèmen', color: '#e74c3c', bg: 'rgba(231,76,60,0.10)' },
  finished:{ label: 'Fini',  color: '#C9A84C', bg: 'rgba(201,168,76,0.10)'},
}

export const RELATIONSHIPS = [
  { val: 'conjoint', label: '💑 Konjwen / Konjwen' },
  { val: 'parent',   label: '👪 Manman / Papa'      },
  { val: 'fre_se',   label: '👫 Frè / Sè'           },
  { val: 'pitit',    label: '👶 Pitit'               },
  { val: 'zanmi',    label: '🤝 Zanmi'              },
  { val: 'koleg',    label: '💼 Kolèg Travay'       },
  { val: 'lot',      label: '🔗 Lòt'                },
]

export const OWNER_SLOT_NAME = 'Pwopriyete Sol'

// ─── DESIGN TOKENS ───────────────────────────────────────────
export const D = {
  // ✅ Tèm "Plus Fit" (menm ak Kanè Epay / Prè / Gym): kat blan, tèks nwa, aksan lò
  bg:'transparent', card:'#ffffff', cardHov:'#fbfaf7', soft:'#f4f3ef', night:'#0b0c0f',
  border:'rgba(20,21,26,0.08)', borderSub:'rgba(20,21,26,0.08)',
  gold:'#9A7412', goldDk:'#8A6508',
  goldBtn:'linear-gradient(135deg,#FFD45C,#E0A410)',
  goldDim:'rgba(255,200,61,0.16)',
  green:'#16a34a', greenBg:'rgba(22,163,74,0.09)',
  red:'#dc2626',   redBg:'rgba(220,38,38,0.08)',
  blue:'#2563eb',  blueBg:'rgba(37,99,235,0.08)',
  orange:'#d97706',orangeBg:'rgba(217,119,6,0.10)',
  purple:'#7c3aed',purpleBg:'rgba(124,58,237,0.08)',
  teal:'#0d9488',  tealBg:'rgba(13,148,136,0.09)',
  text:'#14151a', muted:'#6b7080',
  label:'#6b7080', input:'#f4f3ef',
}

export const GLOBAL_STYLES = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pop     { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
  .ke-scope input::placeholder,.ke-scope textarea::placeholder{color:#9a9eaa}
  .ke-scope select option{background:#fff;color:#14151a}
  .ke-scope input[type=date],.ke-scope input[type=time]{color-scheme:light}
  .ke-scope input:focus,.ke-scope textarea:focus,.ke-scope select:focus{border-color:#0b0c0f!important;box-shadow:0 0 0 4px rgba(255,200,61,.45);background:#fff!important}
  @media(max-width:480px){
    .freq-grid{grid-template-columns:1fr 1fr!important;gap:6px!important;}
    .vacct-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .pay-date-row{padding:10px 12px!important;}
  }
`

// ─── SHARED INPUT STYLES ──────────────────────────────────────
export const inp = {
  width:'100%', padding:'12px 14px', borderRadius:13, fontSize:14.5, fontWeight:600,
  border:'1.5px solid rgba(20,21,26,0.08)', outline:'none', fontFamily:'inherit',
  color:D.text, background:D.input, transition:'border-color .2s, box-shadow .2s, background .2s', boxSizing:'border-box',
}
export const lbl = {
  display:'block', fontSize:11, fontWeight:800, color:D.label,
  marginBottom:7, textTransform:'uppercase', letterSpacing:'0.09em',
}

// ─── FORMATTERS ───────────────────────────────────────────────
export const fmt = (n) =>
  Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:0,maximumFractionDigits:0})

export function freqFullLabel(plan) {
  const n = Math.max(1, Math.floor(plan.interval) || 1)
  const base = FREQ_LABELS[plan.frequency]?.ht || plan.frequency
  if (n <= 1) return `Peye ${base} • Touche ${base}`
  return `Peye ${base} • Touche chak ${n}yèm`
}

// ─── PLAN HELPERS ─────────────────────────────────────────────
export function hasOwnerSlot(plan) {
  return Number(plan.feePerMember) > 0 && Number(plan.feePerMember) === Number(plan.amount)
}

export function memberPayout(plan) {
  const slots    = totalActiveSlots(plan)
  const interval = Math.max(1, Math.floor(Number(plan.interval) || 1))
  // ✅ NOUVO: "Touche Chak Konbyen Sik" — lè entèval la >1, plizyè sik
  // konbine nan YON SÈL peman final, donk montan an miltipliye pa entèval la.
  return Math.max(0, (Number(plan.amount) * slots - Number(plan.feePerMember || 0)) * interval)
}

export function ownerPayout(plan) {
  const slots    = totalActiveSlots(plan)
  const interval = Math.max(1, Math.floor(Number(plan.interval) || 1))
  return Math.max(0, (Number(plan.amount) * slots - Number(plan.feePerMember || 0)) * interval)
}

export function totalActiveSlots(plan) {
  return (plan.members || [])
    .filter(m => m.status !== 'stopped')
    .reduce((acc, m) => {
      const slots = (m.positions && Array.isArray(m.positions) && m.positions.length > 1)
        ? m.positions.length : 1
      return acc + slots
    }, 0)
}

// ─── KALANDRIYE ───────────────────────────────────────────────
export function getPaymentDates(frequency, startDate, count) {
  if (count <= 0) return []
  const dates = []

  // ✅ FIX: Parse kòm dat lokal — evite UTC timezone shift
  const parseLocal = (ds) => {
    const s = String(ds).split('T')[0]
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const toKey = (d) => {
    const y   = d.getFullYear()
    const m   = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  let cur = parseLocal(startDate || new Date().toISOString())

  const advanceOnce = () => {
    switch (frequency) {
      case 'daily':           cur.setDate(cur.getDate() + 1); break
      case 'weekly_saturday': cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      case 'weekly_monday':   cur.setDate(cur.getDate() + ((1 - cur.getDay() + 7) % 7 || 7)); break
      case 'biweekly':        cur.setDate(cur.getDate() + 14); break
      case 'monthly':         cur.setMonth(cur.getMonth() + 1); break
      case 'weekdays':
        do { cur.setDate(cur.getDate() + 1) } while ([0, 6].includes(cur.getDay())); break
      default: cur.setDate(cur.getDate() + 1)
    }
  }

  dates.push(toKey(cur))
  for (let i = 1; i < count; i++) {
    advanceOnce()
    dates.push(toKey(new Date(cur)))
  }
  return dates
}

// ✅ FIX: Pran sèlman pati YYYY-MM-DD — pa timestamp konplè
export function getPlanStartDate(plan) {
  const raw = plan.startDate || plan.createdAt || new Date().toISOString()
  return String(raw).split('T')[0]
}

export function getPayoutDate(plan, position) {
  const interval = Math.max(1, Math.floor(plan.interval) || 1)
  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const slots = Math.max(activeMembers.length, position)
  const totalCycles = slots * interval
  const allDates = getPaymentDates(plan.frequency, getPlanStartDate(plan), totalCycles)
  const idx = (position * interval) - 1
  return allDates[Math.min(idx, allDates.length - 1)] || null
}

export function getAllPaymentDates(plan) {
  const interval = Math.max(1, Math.floor(plan.interval) || 1)
  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const slots = activeMembers.length || 1
  const totalCycles = slots * interval
  return getPaymentDates(plan.frequency, getPlanStartDate(plan), totalCycles)
}

export function getPayoutDateMap(plan) {
  const map = {}
  const members = (plan.members || [])
  members.forEach(m => { map[m.position] = getPayoutDate(plan, m.position) })
  return map
}
// ─── LÈ AYITI HELPERS ─────────────────────────────────────────
/**
 * Retounen dat ak lè aktyèl Ayiti (UTC-5)
 */
export function getHaitiNow() {
  // ✅ FIX: Ayiti swiv lè ete (UTC-4 mas→novanm, UTC-5 rès ane a).
  // Ansyen kòd la te toujou retire 5è, kidonk pandan lè ete lè a te 1è an reta
  // (fenèt peman, "an reta", jodi a chanje a 1è dimaten olye minwi).
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
    const g = (t) => parts.find(p => p.type === t)?.value
    const hh = g('hour') === '24' ? '00' : g('hour')
    return { today: `${g('year')}-${g('month')}-${g('day')}`, currentTime: `${hh}:${g('minute')}` }
  } catch {
    const nowHaiti = new Date(Date.now() - 5 * 60 * 60 * 1000)
    return {
      today: nowHaiti.toISOString().split('T')[0],
      currentTime: `${String(nowHaiti.getUTCHours()).padStart(2, '0')}:${String(nowHaiti.getUTCMinutes()).padStart(2, '0')}`,
    }
  }
}

/**
 * Verifye si yon dat depase fenèt peman an (vrèman an reta).
 *
 * Yon dat se "an reta" SÈLMAN si:
 *   • li avan jodi a, OUBYEN
 *   • li jodi a epi lè a depase fen fenèt peman (`dueTimeEnd`)
 *
 * @param {string} date          — fòma 'YYYY-MM-DD'
 * @param {string} today         — jodi a Ayiti (YYYY-MM-DD)
 * @param {string} currentTime   — lè aktyèl Ayiti ('HH:MM')
 * @param {string} dueTimeEnd    — fen fenèt peman ('HH:MM', default '17:00')
 */
export function isDateOverdue(date, today, currentTime, dueTimeEnd = '17:00') {
  if (!date) return false
  if (date < today) return true
  if (date === today) return Boolean(currentTime) && currentTime > dueTimeEnd
  return false
}

// ─── POZISYON LOCK (ENCHANJAB) ────────────────────────────────
/**
 * ✅ NOUVO: Konvèti collectDate (Date/string) → 'YYYY-MM-DD'
 * (kenbe pou backward compat — men isPositionLocked PA itilize l ankò)
 */
export function getCollectKey(member) {
  const cd = member?.collectDate
  if (!cd) return null
  try {
    return cd instanceof Date
      ? cd.toISOString().split('T')[0]
      : String(cd).split('T')[0]
  } catch { return null }
}

/**
 * ✅ FIX: Èske pozisyon yon manm ENCHANJAB (locked)?
 *
 * LOCK si YOUN nan kondisyon sa yo vre:
 *   1. Manm nan deja touche (`hasWon`)
 *   2. Dat touche a (kalkile soti nan POZISYON AKTYÈL la, pa
 *      collectDate ki ka vin vye apre reklasman) tonbe nan
 *      fenèt: jodi a JISKA jodi + lockWindowDays jou.
 *
 * IMPÒTAN: nou itilize `getPayoutDate(plan, position)` — menm
 * fonksyon ki bay dat ki afiche nan UI a — pou evite stale data.
 * Nou lock SÈLMAN `0 ≤ jou ≤ lockWindowDays` (pa dat ki pase deja).
 *
 * NÒT: Skò TOUJOU kalkile separeman menm si pozisyon lock.
 *
 * @param {object} member
 * @param {object} plan              - bezwen pou kalkile dat soti nan pozisyon
 * @param {string} today             - 'YYYY-MM-DD' Ayiti
 * @param {number} lockWindowDays    - default 2 (jodi + 2 = 3 manm total)
 */
export function isPositionLocked(member, plan, today, lockWindowDays = 2) {
  if (!member) return false
  if (member.hasWon) return true
  if (!plan) return false

  // ✅ Dat touche soti nan POZISYON AKTYÈL la (pa stale collectDate)
  const payoutDate = getPayoutDate(plan, member.position)
  if (!payoutDate) return false

  const a = new Date(`${today}T00:00:00Z`)
  const b = new Date(`${payoutDate}T00:00:00Z`)
  const daysUntilCollect = Math.round((b - a) / 86400000)

  // SÈLMAN jodi a (0) jiska +lockWindowDays jou.
  // Pa lock dat ki pase deja (daysUntil < 0) — sa se anomali,
  // pa fè pati fenèt woule a. Manm sa yo nòmalman hasWon deja.
  return daysUntilCollect >= 0 && daysUntilCollect <= lockWindowDays
}

// ─── STATUT MANM ──────────────────────────────────────────────
/**
 * Kalkile estati yon manm.
 * ✅ FIX: aksepte `currentTime` opsyonèl pou respekte `dueTimeEnd` jodi a.
 */
export function computeMemberStatus(member, plan, today, currentTime = null) {
  if (member.status === 'stopped') return 'stopped'
  if (member.status === 'blocked') return 'blocked'
  if (member.hasWon)               return 'finished'

  const allDates   = getAllPaymentDates(plan)
  const dueTimeEnd = plan.dueTimeEnd || '17:00'

  // ✅ Si `currentTime` bay, sèvi ak `isDateOverdue` (ki konsidere fenèt peman).
  // Si li pa bay, sèvi ak ansyen lojik la pou backward compatibility — men
  // sèlman dat ki STRIKTEMAN avan jodi konte (jodi pa konsidere "pase").
  const overduePast = currentTime
    ? allDates.filter(d => isDateOverdue(d, today, currentTime, dueTimeEnd))
    : allDates.filter(d => d < today)

  if (!overduePast.length) return 'active'

  const unpaidPast = overduePast.filter(d => !member.payments?.[d])
  if (!unpaidPast.length) return 'active'

  const lateDays     = plan.warningDelayDays || 0
  const latestUnpaid = unpaidPast[0]
  const daysDiff     = Math.floor((new Date(today) - new Date(latestUnpaid)) / 86400000)

  if (lateDays > 0 && daysDiff >= lateDays) return 'blocked'
  return 'late'
}

// ─── BREAKDOWN LOKAL (overrides backend pou respekte dueTimeEnd) ─
/**
 * Rekonstwi breakdown skò yon manm sou frontend pou respekte
 * `dueTimeEnd`. Sa anile pwoblèm kote backend an kalkile `missing: -7`
 * pou jodi a anvan fenèt peman an fini.
 *
 * Retounen yon objè ak menm fòma ak `m.scoreBreakdown`:
 * { earlyDepo, earlyDay, early, onTime, lateWindow, late, veryLate, missing, total, count, inRecovery }
 */
const SCORE_POINTS = {
  earlyDepo: +7, earlyDay: +5, early: +3, onTime: +1,
  lateWindow: -1, late: -3, veryLate: -5, missing: -7,
}

export function computeLocalBreakdown(member, plan, today, currentTime, fallback = null) {
  const allDates   = getAllPaymentDates(plan)
  const dueTimeEnd = plan.dueTimeEnd || '17:00'

  const breakdown = {
    earlyDepo: 0, earlyDay: 0, early: 0, onTime: 0,
    lateWindow: 0, late: 0, veryLate: 0, missing: 0,
    total: 0, count: 0,
    inRecovery: fallback?.inRecovery || false,
  }

  for (const d of allDates) {
    if (member.payments?.[d]) {
      // ✅ Peye — itilize timing ki sove a
      const t = member.paymentTimings?.[d]
      if (t && Object.prototype.hasOwnProperty.call(SCORE_POINTS, t)) {
        breakdown[t]++
        breakdown.count++
      } else if (t === undefined) {
        // Pa gen timing nan database — konsidere kòm `onTime` pa default
        breakdown.onTime++
        breakdown.count++
      }
    } else if (isDateOverdue(d, today, currentTime, dueTimeEnd)) {
      // ✅ Pa peye epi VRÈMAN an reta (respekte dueTimeEnd)
      breakdown.missing++
      breakdown.count++
    }
    // Si pa peye epi pa an reta (jodi avan dueTimeEnd, oubyen fiti) → pa konte
  }

  // Kalkile total
  breakdown.total = Object.entries(breakdown).reduce((sum, [k, v]) => {
    return SCORE_POINTS[k] !== undefined ? sum + (v * SCORE_POINTS[k]) : sum
  }, 0)

  return breakdown
}

// ─── DEPO REZÈV ───────────────────────────────────────────────
/**
 * Kalkile total "Depo Rezèv" pou yon plan:
 * = tout peman manm yo fè pou dat ki APRE jodi a
 * (peman alavans — lajan ki disponib pou sik kap vini yo)
 */
export function calcDepoRezev(plan, today) {
  const allDates = getAllPaymentDates(plan)
  const futureDates = allDates.filter(d => d > today)

  return (plan.members || [])
    .filter(m => m.status !== 'stopped')
    .reduce((total, m) => {
      const futurePaid = futureDates.filter(d => m.payments?.[d]).length
      return total + futurePaid * Number(plan.amount)
    }, 0)
}

/**
 * Kalkile depo rezèv pou yon manm espesifik
 */
export function calcMemberDepoRezev(member, plan, today) {
  const allDates = getAllPaymentDates(plan)
  const futureDates = allDates.filter(d => d > today)
  const futurePaid = futureDates.filter(d => member.payments?.[d]).length
  return futurePaid * Number(plan.amount)
}

// ─── TIMING & SCORE ───────────────────────────────────────────
// ✅ `at` (opsyonèl) = { date:'YYYY-MM-DD', time:'HH:MM' } — lè kliyan an te REYÈLMAN peye
// (mòd « Lè manyèl »). San `at`, se lè kounye a (Ayiti) ki konte, menm jan anvan.
export function getPaymentTiming(plan, paymentDate, at = null) {
  const now = getHaitiNow()
  const today       = at?.date || now.today
  const currentTime = at?.time || now.currentTime
  const [h, m] = currentTime.split(':').map(Number)
  const nowMins = h * 60 + m

  if (paymentDate < today) return 'late'

  const [startH, startM] = (plan.dueTime    || '08:00').split(':').map(Number)
  const [endH,   endM  ] = (plan.dueTimeEnd || '15:00').split(':').map(Number)
  const startMins = startH * 60 + startM
  const endMins   = endH   * 60 + endM

  if (nowMins < startMins) return 'early'
  if (nowMins <= endMins)  return 'onTime'
  return 'late'
}

export function getMemberScore(member) {
  const timings = Object.values(member.paymentTimings || {})
  if (!timings.length) return null
  const early  = timings.filter(t => t === 'early').length
  const onTime = timings.filter(t => t === 'onTime').length
  const late   = timings.filter(t => t === 'late').length
  return { score: Math.round(((early * 2 + onTime) / (timings.length * 2)) * 100), early, onTime, late }
}

// ─── MEMBER HELPERS ───────────────────────────────────────────
export function getMemberSlots(plan, phone) {
  if (!phone || !plan.members) return []
  return plan.members.filter(m => m.phone === phone)
}

export function generateCredentials(name, phone) {
  const first = name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const last4  = phone.replace(/\D/g, '').slice(-4)
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pw = ''
  for (let i = 0; i < 6; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return { username: `${first}${last4}`, password: pw }
}

// ─── API FETCH ────────────────────────────────────────────────
import { useAuthStore } from '../../stores/authStore'

export async function apiFetch(path, options = {}) {
  const { token } = useAuthStore.getState()
  const slug     = localStorage.getItem('plusgroup-slug')
  const branchId = localStorage.getItem('plusgroup-branch-id')
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(slug     ? { 'X-Tenant-Slug': slug }     : {}),
      ...(branchId ? { 'X-Branch-Id':  branchId }  : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Erè API')
  return data
}

// ─── RECEIPT BUILDER ──────────────────────────────────────────
export function buildReceiptHTML(plan, member, paidDates = [], tenant, type = 'peman', allSlots = [], paidAt = null) {
  const slotCount    = allSlots.length > 0 ? allSlots.length : 1
  const receiptSize  = tenant?.receiptSize || '80mm'
  const W            = (receiptSize === '57mm' || receiptSize === '58mm') ? '64mm' : '80mm'
  const biz          = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo         = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : `<div style="font-size:20px;text-align:center">🏦</div>`
  const _hn          = getHaitiNow()
  const paidDay      = paidAt ? String(paidAt).slice(0, 10) : _hn.today
  const txDate       = `${paidDay.split('-').reverse().join('/')} ${paidAt ? String(paidAt).slice(11, 16) : _hn.currentTime}`
  const posOff       = hasOwnerSlot(plan) ? 1 : 0
  const posOf        = (s) => s.isOwnerSlot ? '★' : '#' + (s.position - posOff)
  const tagOf        = (d) => {
    const tm = member.paymentTimings?.[d]
    if (d > paidDay) return ['REZÈV', '#0d9488']
    if (tm === 'late' || (!tm && d < paidDay)) return ['RETA', '#dc2626']
    if (tm === 'early') return ['BONÈ', '#059669']
    return ['A LÈ', '#16a34a']
  }
  const isOwner      = member.isOwnerSlot
  const payout       = isOwner ? ownerPayout(plan) : memberPayout(plan)
  const allDates     = getAllPaymentDates(plan)
  const totalPaid    = Object.keys(member.payments || {}).filter(d => member.payments[d]).length
  const fmtAmt       = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })
  const interval     = Math.max(1, Math.floor(plan.interval) || 1)
  const activeMbrs   = (plan.members || []).filter(m => m.status !== 'stopped').length
  const fineTotal    = Object.values(member.fines || {}).reduce((a, b) => a + Number(b), 0)

  const amtPaid = allSlots.length > 1
    ? allSlots.reduce((acc, slot) => {
        const slotPaid = Object.keys(slot.payments || {})
          .filter(d => slot.payments[d] && !paidDates.includes(d)).length
        return acc + slotPaid * plan.amount
      }, 0)
    : Object.keys(member.payments || {})
        .filter(d => member.payments[d] && !paidDates.includes(d)).length * plan.amount

  const kontribisyonTotal = amtPaid + (paidDates.length * plan.amount * slotCount)

  const MSG_REFERRAL = `Envite yon moun serye k ap fè biznis rejwenn nou, epi w ap benefisye yon bonis ki evalye soti nan 1 pou rive 5% de kòb manm sa pral touche a. Ekri nou sou WhatsApp +50942449024.`

  return `<div style="width:${W};max-width:${W};padding:3mm 2mm;background:#fff;color:#1a1a1a;font-family:'Courier New',monospace;font-size:${W === '64mm' ? '8.5px' : '10px'};line-height:1.5">
    ${logo}
    <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
    <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- SABOTAY-SÒL --</div>
    ${tenant?.phone ? `<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>` : ''}
    ${tenant?.address ? `<div style="font-size:9px;color:#555">${tenant.address}</div>` : ''}
  </div>
  <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:5px">
    ${type === 'peman' ? 'RESI PÈMAN' : type === 'tiraj' ? 'RESI TIRAJ AVÈG' : type === 'kanpe' ? 'KONFIMASYON KANPE' : 'KONT MANM KREYE'}
  </div>
  <div style="font-size:9px;margin-bottom:5px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="color:#555;white-space:nowrap;padding-right:6px">Plan:</td><td style="font-weight:700;text-align:right">${plan.name}</td></tr>
      <tr><td style="color:#555">Frekans:</td><td style="text-align:right">${FREQ_LABELS[plan.frequency]?.ht || plan.frequency}${interval > 1 ? ` (chak ${interval}yèm)` : ''}</td></tr>
      <tr><td style="color:#555">Manm Aktif:</td><td style="text-align:right">${activeMbrs}</td></tr>
      <tr><td style="color:#555">Dat:</td><td style="text-align:right">${txDate}</td></tr>
    </table>
  </div>
  <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid ${isOwner ? '#C9A84C' : '#ccc'};margin-bottom:5px;font-size:9px">
    <div style="font-weight:700">${member.name}${isOwner ? ' ★' : ''}</div>
    ${member.phone ? `<div>${member.phone}</div>` : ''}
    ${plan.hidePositionInSol ? '' : `<div>Pozisyon: ${allSlots.length > 1 ? allSlots.map(posOf).join(' • ') : posOf(member)}</div>`}
    ${slotCount > 1 ? `<div style="color:#C9A84C;font-weight:700">${slotCount} Men • ${fmt(plan.amount * slotCount)} HTG/sik</div>` : ''}
  </div>
  <div style="border-top:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
    ${type === 'peman' ? `
      <div style="font-weight:700;margin-bottom:3px">Dat Peye:</div>
      <table style="width:100%;border-collapse:collapse">
        ${[...paidDates].sort().map(d => `
          <tr>
            <td style="font-family:monospace">${d.split('-').reverse().join('/')} <b style="color:${tagOf(d)[1]};font-family:Arial;font-size:8px">[${tagOf(d)[0]}]</b></td>
            <td style="text-align:right;font-weight:600;color:#16a34a">
              ${slotCount > 1 ? `${slotCount} × ${fmtAmt(plan.amount)} = +${fmtAmt(plan.amount * slotCount)}` : `+${fmtAmt(plan.amount)}`} HTG
            </td>
          </tr>`).join('')}
        ${fineTotal > 0 ? `<tr><td style="color:#e74c3c">Amand:</td><td style="text-align:right;color:#e74c3c">+${fmtAmt(fineTotal)} HTG</td></tr>` : ''}
        <tr><td colspan="2" style="border-top:2px solid #111;padding-top:3px"></td></tr>
        <tr>
          <td style="font-family:Arial;font-weight:900;font-size:10px">TOTAL PEYE</td>
          <td style="text-align:right;font-family:Arial;font-weight:700;font-size:10px;color:#16a34a">
            ${fmtAmt(paidDates.length * plan.amount * slotCount + fineTotal)} G
          </td>
        </tr>
        <tr>
          <td style="color:#555;padding-top:4px">Kontribisyon total:</td>
          <td style="text-align:right;font-weight:700;color:#16a34a;padding-top:4px">${fmtAmt(kontribisyonTotal)} HTG</td>
        </tr>
      </table>
    ` : `
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#555">Montan / Peman:</td><td style="text-align:right;font-weight:700">${fmtAmt(plan.amount)} HTG</td></tr>
        <tr><td style="color:#555">Peman Fet:</td><td style="text-align:right">${totalPaid}/${activeMbrs}</td></tr>
        <tr><td style="color:#555">Total Kontribye:</td><td style="text-align:right;font-weight:700;color:#16a34a">${fmtAmt(amtPaid)} HTG</td></tr>
        ${fineTotal > 0 ? `<tr><td style="color:#e74c3c">Total Amand:</td><td style="text-align:right;color:#e74c3c">${fmtAmt(fineTotal)} HTG</td></tr>` : ''}
        <tr><td colspan="2" style="border-top:2px solid #111;padding-top:3px"></td></tr>
        <tr>
          <td style="font-family:Arial;font-weight:900;font-size:11px">PRYIM SOL</td>
          <td style="text-align:right;font-family:Arial;font-weight:900;font-size:12px;color:#C9A84C">${fmtAmt(payout)} HTG</td>
        </tr>
      </table>
    `}
  </div>
  ${plan.regleman ? `<div style="border-top:1px dashed #ccc;padding-top:4px;margin-top:4px;font-size:8px;color:#555"><div style="font-weight:700;margin-bottom:2px">Regleman Sol:</div>${plan.regleman.substring(0, 200)}</div>` : ''}
  <div style="border-top:1px dashed #ccc;padding-top:5px;margin-top:5px;font-size:8px;color:#444;text-align:center;line-height:1.6">
    <div style="font-style:italic;margin-bottom:4px">${MSG_REFERRAL}</div>
  </div>
  <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px;margin-top:5px">
    <div style="font-weight:700;font-size:10px">Mèsi! / Merci!</div>
    <div style="color:#666;font-size:8px;margin-top:2px">PlusGroup — Tel: +50942449024</div>
  </div>`
}

// ─── PRINT: modal DIREK nan paj la (pa yon window.open) ────────
// ⚠️ FIX APK/Capacitor: window.open('', '_blank') + window.print() te
// pran TOUT ekran WebView a san bouton fèmen ni jesyon bouton "bak"
// Android — itilizatè a te kole. Kounye a resi a afiche kòm yon overlay
// DOM nòmal (fèmab), epi enprime a fèt sou paj aktyèl la (@media print
// kache tout rès la, montre sèlman resi a) — pa gen popup ditou.
// ✅ NOUVO: enprime DIREK (san fenèt previzyon) — sèvi ak sèvis enpresyon Android
// la (RawBT, enprimant Bluetooth, elatriye). Resi a envizib sou ekran an; li parèt
// sèlman nan enpresyon an. Netwaye apre enpresyon an (afterprint / retou nan app la).
export async function printReceiptDirect(html, receiptSize = '80mm') {
  document.getElementById('sab-direct-print')?.remove()
  document.getElementById('sab-direct-print-style')?.remove()
  const W = (receiptSize === '57mm' || receiptSize === '58mm') ? '58mm' : '80mm'

  const style = document.createElement('style')
  style.id = 'sab-direct-print-style'
  style.textContent = `
    #sab-direct-print{position:fixed;left:-10000px;top:0;width:${W};background:#fff}
    @media print{
      @page{size:${W} auto;margin:0}
      html,body{background:#fff!important;height:auto!important;overflow:visible!important}
      body>*:not(#sab-direct-print){display:none!important}
      #sab-direct-print{display:block!important;position:static!important;left:auto!important;width:${W}!important}
    }`
  document.head.appendChild(style)

  const box = document.createElement('div')
  box.id = 'sab-direct-print'
  box.innerHTML = html
  document.body.appendChild(box)

  // Tann logo a chaje (max 2.5s) pou l parèt sou papye a
  const imgs = Array.from(box.querySelectorAll('img'))
  await Promise.race([
    Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r }))),
    new Promise(r => setTimeout(r, 2500)),
  ])

  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    box.remove(); style.remove()
    window.removeEventListener('afterprint', cleanup)
    document.removeEventListener('resume', onResume)
  }
  // Sou Android, window.print() pa bloke — nou netwaye lè enpresyon an fini oswa lè w tounen nan app la
  const onResume = () => setTimeout(cleanup, 1500)
  window.addEventListener('afterprint', cleanup)
  document.addEventListener('resume', onResume)
  setTimeout(cleanup, 120000)

  window.print()
}

export function printReceiptBrowser(html) {
  // Netwaye ansyen overlay si li te rete la pou yon rezon
  document.getElementById('sabotay-receipt-overlay')?.remove()
  document.getElementById('sabotay-receipt-print-style')?.remove()

  const style = document.createElement('style')
  style.id = 'sabotay-receipt-print-style'
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #sabotay-receipt-print, #sabotay-receipt-print * { visibility: visible !important; }
      #sabotay-receipt-print { position: absolute; top: 0; left: 0; width: 100%; }
      #sabotay-receipt-overlay { position: absolute !important; background: none !important; }
    }
  `
  document.head.appendChild(style)

  const overlay = document.createElement('div')
  overlay.id = 'sabotay-receipt-overlay'
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.85);
    display: flex; flex-direction: column; align-items: center;
    justify-content: flex-start; padding: 16px; overflow-y: auto;
  `

  const btnBar = document.createElement('div')
  btnBar.style.cssText = 'display:flex; gap:10px; margin-bottom:14px; width:100%; max-width:340px;'

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕ Fèmen'
  closeBtn.style.cssText = 'flex:1; padding:12px; border-radius:10px; border:none; background:rgba(255,255,255,0.12); color:#fff; font-weight:700; font-size:14px;'
  closeBtn.onclick = () => { overlay.remove(); style.remove(); document.removeEventListener('backbutton', onBack) }

  const printBtn = document.createElement('button')
  printBtn.textContent = '🖨️ Enprime'
  printBtn.style.cssText = 'flex:2; padding:12px; border-radius:10px; border:none; background:#C9A84C; color:#0a1222; font-weight:800; font-size:14px;'
  printBtn.onclick = () => window.print()

  btnBar.appendChild(closeBtn)
  btnBar.appendChild(printBtn)

  const receiptBox = document.createElement('div')
  receiptBox.id = 'sabotay-receipt-print'
  receiptBox.style.cssText = 'background:#fff; border-radius:8px; overflow:hidden; width:100%; max-width:340px;'
  receiptBox.innerHTML = html

  overlay.appendChild(btnBar)
  overlay.appendChild(receiptBox)
  document.body.appendChild(overlay)

  // ✅ Bouton "bak" Android (Capacitor) fèmen modal la olye kite l kole
  const onBack = (e) => { e?.preventDefault?.(); closeBtn.onclick() }
  document.addEventListener('backbutton', onBack)
}


// ═══════════════════════════════════════════════════════════════
// ✅ NOUVO: RESI POU PATAJE (Imaj PNG + PDF) — menm design ak Kanè Epay / Prè
// type: 'peman' (dat ki fèk peye) | 'kont' (rezime kont manm nan)
// ═══════════════════════════════════════════════════════════════
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
const RC = { bg:'#ECE8DF', night:'#0b0c0f', gold:'#FFC83D', goldInk:'#8A6508', ink:'#14151a', muted:'#6b7080', soft:'#f4f3ef', line:'#E6E3DB', green:'#16a34a', red:'#dc2626', teal:'#0d9488' }
const DISPLAY = "'Barlow Condensed','Arial Narrow',Arial,sans-serif"
const BODY    = "'Manrope','Segoe UI',Arial,sans-serif"
export const SOL_RECEIPT_WIDTH = 460
const dmy = (d) => String(d || '').split('T')[0].split('-').reverse().join('/')

export function buildSolShareHTML({ plan, member, paidDates = [], tenant, type = 'peman', allSlots = [], paidAt = null }) {
  const LH       = 'line-height:1.25'
  const slots    = allSlots.length ? allSlots : [member]
  const nSlots   = slots.length
  const isPay    = type === 'peman'
  const amount   = Number(plan.amount || 0)
  const allDates = getAllPaymentDates(plan)
  const nowH = getHaitiNow()
  const today = nowH.today
  // ✅ Lè manyèl: resi a montre lè kliyan an te peye a, epi badj yo baze sou lè sa a
  const paidDay  = paidAt ? String(paidAt).slice(0, 10) : today
  const paidTime = paidAt ? String(paidAt).slice(11, 16) : nowH.currentTime
  const currentTime = paidTime
  const paidCount = slots.reduce((a, sl) => a + allDates.filter(d => sl.payments?.[d]).length, 0)
  const justPaid  = isPay ? paidDates.length * amount * nSlots : 0
  const fineTotal = Object.values(member.fines || {}).reduce((a, b) => a + Number(b), 0)
  const contribution = Math.max(paidCount * amount, justPaid)
  const payout    = member.isOwnerSlot ? ownerPayout(plan) : memberPayout(plan)
  const payoutDate = getPayoutDate(plan, member.position)
  const bizRaw    = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const biz       = esc(bizRaw)
  const bizSize   = bizRaw.length > 26 ? 18 : bizRaw.length > 18 ? 21 : 25
  const bizIni    = esc(bizRaw.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())
  const ini       = esc(String(member.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())
  const posOff    = hasOwnerSlot(plan) ? 1 : 0
  // ✅ Mòd « Kache pozisyon » aktif → pa montre okenn pozisyon sou resi a
  const posTxt    = plan.hidePositionInSol ? '' : slots.map(sl => sl.isOwnerSlot ? '★' : `#${sl.position - posOff}`).join(' · ')

  const row = (k, v, color = RC.ink) => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid ${RC.line}">
      <span style="font-size:13px;font-weight:600;line-height:1.3;color:${RC.muted}">${k}</span>
      <span style="font-size:13.5px;font-weight:800;line-height:1.3;color:${color};text-align:right">${v}</span>
    </div>`

  // ✅ Chak dat ak badj li: Reta (wouj) · Bonè / A lè (vèt) · Depo rezèv (teal)
  const badge = (txt, c, bg) =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 9px;border-radius:999px;background:${bg};color:${c};font-size:10.5px;font-weight:800;line-height:1;letter-spacing:.03em;white-space:nowrap">${txt}</span>`
  const dateInfo = (d) => {
    const tm = member.paymentTimings?.[d]
    if (d > paidDay)                            return { c: RC.teal,  b: badge('DEPO REZÈV', RC.teal, 'rgba(13,148,136,.12)') }
    if (tm === 'late' || (!tm && d < paidDay))  return { c: RC.red,   b: badge('RETA', RC.red, 'rgba(220,38,38,.10)') }
    if (tm === 'early')                         return { c: RC.green, b: badge('BONÈ', '#059669', 'rgba(5,150,105,.12)') }
    return                                             { c: RC.green, b: badge('A LÈ', RC.green, 'rgba(22,163,74,.12)') }
  }
  const sortedDates = [...paidDates].sort()
  const dateRows = isPay ? sortedDates.slice(0, 14).map(d => {
    const { c, b } = dateInfo(d)
    const fine = Number(member.fines?.[d] || 0)
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid ${RC.line}">
      <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:13.5px;font-weight:800;line-height:1.3;color:${c}">${dmy(d)}</span>${b}
      </span>
      <span style="text-align:right">
        <span style="display:block;font-size:13.5px;font-weight:800;line-height:1.3;color:${c}">+${fmt(amount * nSlots)} HTG</span>
        ${fine > 0 ? `<span style="display:block;font-size:11px;font-weight:700;line-height:1.3;color:${RC.red}">+${fmt(fine)} amand</span>` : ''}
      </span>
    </div>`
  }).join('') + (sortedDates.length > 14 ? row(`+ ${sortedDates.length - 14} lòt dat`, '') : '') : ''

  const logo = tenant?.logoUrl
    ? `<img src="${esc(tenant.logoUrl)}" crossorigin="anonymous" style="width:50px;height:50px;border-radius:15px;object-fit:cover;background:#fff;display:block;flex:none"/>`
    : `<div style="width:50px;height:50px;border-radius:15px;background:${RC.gold};display:flex;align-items:center;justify-content:center;flex:none"><span style="font-family:${DISPLAY};font-weight:800;font-size:22px;${LH};color:${RC.night}">${bizIni}</span></div>`

  const big = isPay
    ? { l: `MONTAN PEYE · ${paidDates.length} DAT${nSlots > 1 ? ` × ${nSlots} MEN` : ''}`, v: `+${fmt(justPaid + (isPay ? Object.entries(member.fines || {}).filter(([d]) => paidDates.includes(d)).reduce((a, [, v]) => a + Number(v), 0) : 0))}`, c: '#5ee59a', pill: 'PEMAN', pbg: '#4ade80' }
    : { l: 'AP TOUCHE', v: fmt(payout), c: RC.gold, pill: 'KONT', pbg: RC.gold }

  return `
<div style="width:${SOL_RECEIPT_WIDTH}px;padding:22px;background:${RC.bg};font-family:${BODY};color:${RC.ink};box-sizing:border-box;${LH};text-align:left">
  <div style="border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 24px 40px -24px rgba(11,12,15,.45)">
    <div style="position:relative;overflow:hidden;background:${RC.night};padding:16px 24px 24px;color:#f2f1ec">
      <div style="position:absolute;width:340px;height:340px;right:-120px;top:-170px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.32),rgba(255,200,61,0) 65%)"></div>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,.1)">
        <span style="font-size:13px;font-weight:800;${LH};color:#fff">${dmy(paidDay)} ${currentTime}</span>
        <span style="font-size:11px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.6)">${isPay ? 'RESI PEMAN' : 'KONT MANM'}</span>
      </div>
      <div style="position:relative;display:flex;align-items:center;gap:12px">
        ${logo}
        <div style="min-width:0;flex:1">
          <div style="font-family:${DISPLAY};font-weight:800;font-size:${bizSize}px;${LH};text-transform:uppercase;letter-spacing:.02em;color:#fff;word-break:break-word">${biz}</div>
          <div style="font-size:10.5px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.55);margin-top:2px">SABOTAY SOL${tenant?.phone ? ` · ${esc(tenant.phone)}` : ''}</div>
        </div>
        <div style="height:32px;padding:0 13px;border-radius:999px;background:${big.pbg};display:flex;align-items:center;flex:none">
          <span style="font-family:${DISPLAY};font-weight:800;font-size:15px;${LH};letter-spacing:.08em;color:${RC.night}">${big.pill}</span>
        </div>
      </div>
      <div style="position:relative;margin-top:22px;font-size:11px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.6)">${big.l}</div>
      <div style="position:relative;margin-top:2px;white-space:nowrap">
        <span style="font-family:${DISPLAY};font-weight:800;font-size:64px;line-height:1.15;color:${big.c}">${big.v}</span><span style="font-family:${DISPLAY};font-weight:800;font-size:22px;line-height:1.15;color:rgba(242,241,236,.55);margin-left:8px">HTG</span>
      </div>
    </div>

    <div style="position:relative;height:24px;background:#fff">
      <div style="position:absolute;left:-12px;top:0;width:24px;height:24px;border-radius:50%;background:${RC.bg}"></div>
      <div style="position:absolute;right:-12px;top:0;width:24px;height:24px;border-radius:50%;background:${RC.bg}"></div>
      <div style="position:absolute;left:22px;right:22px;top:11px;border-top:2px dashed ${RC.line}"></div>
    </div>

    <div style="padding:0 24px">
      <div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:${RC.soft}">
        <div style="width:48px;height:48px;border-radius:14px;background:${RC.night};display:flex;align-items:center;justify-content:center;flex:none">
          <span style="font-family:${DISPLAY};font-weight:800;font-size:20px;${LH};color:${RC.gold}">${member.isOwnerSlot ? '★' : ini}</span>
        </div>
        <div style="min-width:0;flex:1">
          <div style="font-weight:800;font-size:16px;${LH};word-break:break-word">${esc(member.name)}</div>
          <div style="font-family:${DISPLAY};font-weight:700;font-size:16px;${LH};letter-spacing:.06em;color:${RC.goldInk};margin-top:1px">${esc(plan.name)}${posTxt ? ` · ${posTxt}` : ''}</div>
        </div>
        ${member.phone ? `<div style="text-align:right;font-size:11.5px;font-weight:600;line-height:1.5;color:${RC.muted};flex:none">${esc(member.phone)}</div>` : ''}
      </div>
    </div>

    <div style="padding:8px 24px 0">
      ${dateRows}
      ${row('Montan pa dat', `${fmt(amount)} HTG${nSlots > 1 ? ` × ${nSlots}` : ''}`)}
      ${row('Kontribisyon total', `${fmt(contribution)} HTG`, RC.green)}
      ${fineTotal > 0 ? row('Amand', `${fmt(fineTotal)} HTG`, RC.red) : ''}
      ${row('Peman fèt', `${paidCount} / ${allDates.length * nSlots}`)}
      ${!isPay && payoutDate ? row('Dat touche', dmy(payoutDate)) : ''}
    </div>

    <div style="margin:16px 24px 0;padding:14px 18px;border-radius:18px;background:${RC.night};display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span style="font-size:11px;font-weight:800;${LH};letter-spacing:.14em;color:rgba(242,241,236,.6)">${isPay ? 'AP TOUCHE' : 'KONTRIBYE'}</span>
      <span style="white-space:nowrap"><span style="font-family:${DISPLAY};font-weight:800;font-size:34px;line-height:1.2;color:${RC.gold}">${fmt(isPay ? payout : contribution)}</span><span style="font-family:${DISPLAY};font-weight:800;font-size:14px;line-height:1.2;color:rgba(242,241,236,.55);margin-left:6px">HTG</span></span>
    </div>

    <div style="display:flex;justify-content:center;padding:18px 24px 0">
      <div style="height:34px;padding:0 15px;border-radius:999px;background:rgba(22,163,74,.1);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${RC.green}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        <span style="font-size:12px;font-weight:800;${LH};letter-spacing:.04em;color:${RC.green}">${isPay ? 'PEMAN ANREJISTRE' : 'KONT AJOU'}</span>
      </div>
    </div>
    <div style="text-align:center;padding:16px 26px 22px">
      ${tenant?.receiptFooterNote ? `<div style="font-size:12px;color:${RC.muted};font-weight:600;margin-bottom:8px;line-height:1.45">${esc(tenant.receiptFooterNote)}</div>` : ''}
      <div style="font-family:${DISPLAY};font-weight:800;font-size:22px;${LH};letter-spacing:.04em;text-transform:uppercase;color:${RC.ink}">Mèsi! / Merci!</div>
      <div style="font-size:11px;font-weight:700;${LH};color:${RC.muted};margin-top:4px">Produit par PLUS GROUP · Tel: +509 4244 9024</div>
    </div>
  </div>
</div>`
}

async function captureNode(node, bg) {
  try {
    const opts = { pixelRatio: 2.5, backgroundColor: bg, cacheBust: true }
    await toCanvas(node, opts)                 // premye apèl: chaje polis/imaj
    const canvas = await toCanvas(node, opts)
    if (canvas?.width > 0 && canvas?.height > 0) return canvas
    throw new Error('canvas vid')
  } catch (e) {
    console.warn('[resi] html-to-image echwe, n ap itilize html2canvas:', e?.message)
    return await html2canvas(node, { scale: 2.5, backgroundColor: bg, useCORS: true, logging: false })
  }
}

// Kreye fichye resi a (PNG oswa PDF) — san pataje
export async function buildSolFile(data, fmtOut = 'png') {
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;'
  box.innerHTML = buildSolShareHTML(data)
  document.body.appendChild(box)
  let canvas
  try {
    try { await Promise.all([document.fonts?.load?.('800 60px "Barlow Condensed"'), document.fonts?.load?.('700 14px "Manrope"')]); await document.fonts?.ready } catch {}
    const imgs = Array.from(box.querySelectorAll('img'))
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })))
    canvas = await captureNode(box.firstElementChild, RC.bg)
  } finally { document.body.removeChild(box) }

  const isPng = fmtOut === 'png'
  let blob
  if (isPng) blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
  else {
    const wMm = 100, hMm = (canvas.height * wMm) / canvas.width
    const pdf = new jsPDF({ unit: 'mm', format: [wMm, Math.max(hMm, 60)] })
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, wMm, hMm)
    blob = pdf.output('blob')
  }
  const safe = (x) => String(x || '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  const fileName = `Sol-${safe(data.plan?.name)}-${safe(data.member?.name)}-${getHaitiNow().today}.${isPng ? 'png' : 'pdf'}`
  return { blob, fileName, mime: isPng ? 'image/png' : 'application/pdf', title: `Resi Sol — ${data.member?.name || ''}` }
}

const solShareKey = (data, fmtOut) =>
  `sol-${data.type || 'peman'}-${data.member?.id || data.member?.name}-${(data.paidDates || []).join(',')}-${data.paidAt || ''}-${fmtOut}`

// Prepare imaj la davans (lè fenèt resi a louvri) — klik « Pataje » vin imedya
export const prepareSolReceipt = (data, fmtOut = 'png') => prepareShare(solShareKey(data, fmtOut), () => buildSolFile(data, fmtOut))

// Retounen: 'shared' | 'cancel' | 'downloaded' | 'needs-gesture'
export async function shareSolReceipt(data, fmtOut = 'png') {
  return shareCached(solShareKey(data, fmtOut), () => buildSolFile(data, fmtOut))
}