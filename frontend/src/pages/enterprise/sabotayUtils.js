// ─────────────────────────────────────────────────────────────
// sabotayUtils.js — Constants, Helpers, Calc Functions
// ─────────────────────────────────────────────────────────────

export const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
export const API_URL = import.meta.env.VITE_API_URL     || 'https://plusgroup-backend.onrender.com/api/v1'

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
  bg:'#060f1e', card:'#0d1b2a', cardHov:'#112236',
  border:'rgba(201,168,76,0.18)', borderSub:'rgba(255,255,255,0.07)',
  gold:'#C9A84C', goldDk:'#8B6914',
  goldBtn:'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:'rgba(201,168,76,0.10)',
  green:'#27ae60', greenBg:'rgba(39,174,96,0.12)',
  red:'#e74c3c',   redBg:'rgba(231,76,60,0.10)',
  blue:'#3B82F6',  blueBg:'rgba(59,130,246,0.10)',
  orange:'#f39c12',orangeBg:'rgba(243,156,18,0.10)',
  purple:'#9b59b6',purpleBg:'rgba(155,89,182,0.10)',
  teal:'#14b8a6',  tealBg:'rgba(20,184,166,0.10)',
  text:'#e8eaf0', muted:'#6b7a99',
  label:'rgba(201,168,76,0.75)', input:'#060f1e',
}

export const GLOBAL_STYLES = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes pop     { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @media(min-width:640px){ .m-sheet{border-radius:20px!important;margin:20px!important;max-height:88vh!important;} }
  .m-sheet::-webkit-scrollbar{width:8px}
  .m-sheet::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
  .m-sheet input::placeholder,.m-sheet textarea::placeholder{color:#2a3a54}
  .m-sheet select option{background:#0d1b2a;color:#e8eaf0}
  .plan-card{transition:all 0.18s;}
  .plan-card:hover{background:#112236!important;transform:translateY(-2px);}
  @media(max-width:480px){
    .page-head{flex-direction:column!important;align-items:stretch!important;gap:10px!important;}
    .page-head-actions{justify-content:space-between!important;width:100%!important;}
    .btn-new-plan{flex:1!important;justify-content:center!important;}
    .top-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .stat-card{padding:10px 11px!important;}
    .stat-icon{width:34px!important;height:34px!important;}
    .stat-val{font-size:12px!important;}
    .search-wrap{max-width:100%!important;}
    .plan-card{padding:12px 13px!important;}
    .detail-head{gap:8px!important;margin-bottom:14px!important;}
    .detail-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .member-row{padding:10px 11px!important;}
    .member-pos-badge{width:30px!important;height:30px!important;}
    .member-name{font-size:12px!important;}
    .member-phone{font-size:10px!important;}
    .member-btns button{width:26px!important;height:26px!important;}
    .m-sheet{border-radius:18px 18px 0 0!important;}
    .modal-body{padding:14px 15px 24px!important;}
    .modal-title{font-size:14px!important;}
    .freq-grid{grid-template-columns:1fr 1fr!important;gap:6px!important;}
    .freq-btn{padding:8px 5px!important;font-size:10px!important;}
    .vacct-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .cal-day span{font-size:10px!important;}
    .tab-btn{padding:7px 12px!important;font-size:11px!important;}
    .pay-date-row{padding:9px 11px!important;}
    .printer-label{display:none!important;}
    .error-banner{flex-wrap:wrap!important;gap:8px!important;}
    .error-banner button{margin-left:0!important;width:100%!important;}
  }
  @media(max-width:360px){ .top-stats{grid-template-columns:1fr!important;} }
`

// ─── SHARED INPUT STYLES ──────────────────────────────────────
export const inp = {
  width:'100%', padding:'10px 12px', borderRadius:10, fontSize:13,
  border:'1.5px solid rgba(255,255,255,0.09)', outline:'none', fontFamily:'inherit',
  color:D.text, background:D.input, transition:'border-color 0.15s', boxSizing:'border-box',
}
export const lbl = {
  display:'block', fontSize:10, fontWeight:700, color:D.label,
  marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em',
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
  const slots = totalActiveSlots(plan)
  return Math.max(0, Number(plan.amount) * slots - Number(plan.feePerMember || 0))
}

export function ownerPayout(plan) {
  const slots = totalActiveSlots(plan)
  return Math.max(0, Number(plan.amount) * slots - Number(plan.feePerMember || 0))
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
  const nowHaiti = new Date(Date.now() - 5 * 60 * 60 * 1000)
  return {
    today: nowHaiti.toISOString().split('T')[0],
    currentTime: `${String(nowHaiti.getUTCHours()).padStart(2, '0')}:${String(nowHaiti.getUTCMinutes()).padStart(2, '0')}`,
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
export function getPaymentTiming(plan, paymentDate) {
  const now = new Date()
  const haitiOffset = -5 * 60
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes()
  const nowMins = ((utcMins + haitiOffset) % (24 * 60) + 24 * 60) % (24 * 60)

  const today = (() => {
    const haitiTime = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    return haitiTime.toISOString().split('T')[0]
  })()

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
export function buildReceiptHTML(plan, member, paidDates = [], tenant, type = 'peman', allSlots = []) {
  const slotCount    = allSlots.length > 0 ? allSlots.length : 1
  const receiptSize  = tenant?.receiptSize || '80mm'
  const W            = (receiptSize === '57mm' || receiptSize === '58mm') ? '64mm' : '80mm'
  const biz          = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo         = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : `<div style="font-size:20px;text-align:center">🏦</div>`
  const txDate       = new Date().toLocaleDateString('fr-HT') + ' ' + new Date().toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
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
    <div>Pozisyon: ${allSlots.length > 1 ? allSlots.map(s => '#' + s.position).join(' • ') : '#' + member.position}</div>
    ${slotCount > 1 ? `<div style="color:#C9A84C;font-weight:700">${slotCount} Men • ${fmt(plan.amount * slotCount)} HTG/sik</div>` : ''}
  </div>
  <div style="border-top:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
    ${type === 'peman' ? `
      <div style="font-weight:700;margin-bottom:3px">Dat Peye:</div>
      <table style="width:100%;border-collapse:collapse">
        ${paidDates.map(d => `
          <tr>
            <td style="font-family:monospace">${d.split('-').reverse().join('/')}</td>
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

export function printReceiptBrowser(html) {
  const w = window.open('', '_blank', 'width=340,height=620')
  if (!w) { return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff;font-family:'Courier New',monospace;font-size:10px}
    @media print{@page{margin:0;size:80mm auto}body{margin:0}}</style></head><body>${html}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2000) }, 300)
}