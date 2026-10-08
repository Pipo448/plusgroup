// ─────────────────────────────────────────────────────────────
// PlanDetail.jsx — Detay Plan + Sistèm Pozisyon Dinamik
// ✅ Design "Plus Fit" (hero nwa, gwo chif, kat blan)
// ✅ Filt manm pa estati (Tout / Peye jodi a / Pa peye / An reta / Bloke / Kanpe / Touche)
// ✅ FIX: modal "Ajiste Pozisyon" te rann ANNDAN chak liy manm (1 modal pa liy) → kounye a 1 sèl
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react'
import {
  Users, Plus, Eye, CheckCircle, ArrowLeft, Search, X,
  Trophy, AlertTriangle, Edit3, Lock, Unlock, UserCheck,
  FileText, Shuffle, StopCircle, RefreshCw, Zap,
  TrendingUp, TrendingDown, Minus, Info, Calendar, Clock4, EyeOff,
  Wallet, PiggyBank, Star, Inbox, CalendarDays, Repeat, Landmark,
} from 'lucide-react'

import {
  D, fmt, freqFullLabel,
  getAllPaymentDates, getPayoutDateMap,
  computeMemberStatus, memberPayout, ownerPayout,
  hasOwnerSlot, getMemberSlots, calcDepoRezev,
  getHaitiNow, isDateOverdue, computeLocalBreakdown,
} from './sabotayUtils'

import {
  PrinterBtn, ReceiptSizeBtn, PlanStatusBadge, Modal, Switch,
  ModalMarkPayment, ModalMemberAction, ModalDeclarePayout,
  PlanCalendar, MemberVirtualAccount,
  ExchangeTab, AdminCashTab,
} from './sabotayComponents'

import { T, hexA, todayLabel } from './kane-epay/kaneEpayConstants'
import { StatCard, GlassStat, Ring, AnimatedNumber, AnimatedInt, Track, Chip } from './kane-epay/KaneEpayComponents'

// ─────────────────────────────────────────────────────────────
const PD_STYLES = `
.pd-back{width:46px;height:46px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#f2f1ec;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .2s,transform .2s}
.pd-back:hover{background:rgba(255,255,255,.12);transform:translateX(-2px)}
.pd-danger-glass{color:#ff9b9b!important;border-color:rgba(255,123,123,.3)!important}
.pd-hero-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}

.pd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
@media(max-width:1000px){.pd-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.pd-stats{gap:12px}}

.pd-win{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 18px;border-radius:22px;background:var(--night);color:#f2f1ec;animation:keIn .5s cubic-bezier(.22,1,.36,1) backwards}
.pd-win::after{content:'';position:absolute;right:-60px;top:-80px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.35),transparent 65%)}
.pd-win-ic{width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg,#FFD45C,#E0A410);display:flex;align-items:center;justify-content:center;color:#0b0c0f;flex-shrink:0;animation:pdBob 2.4s ease-in-out infinite}
@keyframes pdBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-6deg)}}
.pd-win-amt{margin-left:auto;font-family:var(--display);font-weight:800;font-size:34px;line-height:1;color:#FFC83D;position:relative;z-index:1;white-space:nowrap}
.pd-win-amt small{font-size:14px;color:rgba(242,241,236,.6);margin-left:4px}

.pd-sets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media(max-width:900px){.pd-sets{grid-template-columns:1fr}}
.pd-set{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid var(--border);border-radius:20px;padding:14px 16px;transition:border-color .25s,box-shadow .25s}
.pd-set.on{border-color:var(--sc-bd);box-shadow:0 10px 26px -20px var(--sc)}
.pd-set-ic{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--soft);color:var(--muted);transition:all .25s}
.pd-set.on .pd-set-ic{background:var(--sc-bg);color:var(--sc)}
.pd-set h4{margin:0;font-size:13.5px;font-weight:800;color:var(--ink)}
.pd-set p{margin:3px 0 0;font-size:11.5px;line-height:1.45;color:var(--muted)}

.pd-tabs{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:5px;background:#fff;border:1px solid var(--border);border-radius:18px}
.pd-tabs::-webkit-scrollbar{display:none}
.pd-tab{flex-shrink:0;height:42px;padding:0 16px;border-radius:13px;border:0;background:transparent;font:700 13px var(--body);color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;transition:background .25s,color .25s}
.pd-tab:hover{color:var(--ink);background:var(--soft)}
.pd-tab.on{background:var(--night);color:#f2f1ec}
.pd-tab.on svg{color:#FFC83D}
.pd-draw{margin-left:auto;flex-shrink:0}

.pd-filters{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.pd-filters::-webkit-scrollbar{display:none}
.pd-fchip{flex-shrink:0;height:36px;padding:0 13px;border-radius:999px;border:1px solid var(--border);background:#fff;font:700 12px var(--body);color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
.pd-fchip .n{font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--soft);color:var(--ink)}
.pd-fchip.on{background:var(--fc);border-color:var(--fc);color:#fff}
.pd-fchip.on .n{background:rgba(255,255,255,.22);color:#fff}

.pd-legend{background:#fff;border:1px solid var(--border);border-radius:20px;padding:14px 16px}
.pd-scale{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pd-scale span{font-size:11px;font-weight:700;border-radius:999px;padding:4px 10px;display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
.pd-scale b{font-family:var(--display);font-size:13px}

.pd-list{display:flex;flex-direction:column;gap:10px}
.pd-row{position:relative;border-radius:20px;padding:14px 16px 14px 20px;border:2px solid transparent;background:linear-gradient(var(--rbg,#fff),var(--rbg,#fff)) padding-box,var(--rg) border-box;box-shadow:0 10px 24px -22px var(--rc);animation:keIn .45s cubic-bezier(.22,1,.36,1) backwards;transition:box-shadow .25s,transform .25s}
.pd-row::before{content:'';position:absolute;left:6px;top:14px;bottom:14px;width:4px;border-radius:4px;background:var(--rg)}
.pd-row::after{content:'';position:absolute;inset:0;border-radius:18px;pointer-events:none;background:radial-gradient(120% 90% at 0% 0%,var(--rt),transparent 55%)}
.pd-row>*{position:relative;z-index:1}
.pd-row:hover{box-shadow:0 18px 32px -20px var(--rc);transform:translateY(-1px)}
.pd-row.own{--rbg:#fffaf0}
.pd-row.win{--rbg:#f3fcf6}
.pd-row.stop{--rbg:#fdf8f0;opacity:.85}
.pd-row-in{display:flex;align-items:flex-start;gap:12px}
.pd-info{flex:1;min-width:0}
.pd-name{font-size:15px;font-weight:800;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pd-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}
.pd-meta .ph{font-size:12px;color:var(--muted);font-weight:600}
.pd-mstat{text-align:right;flex-shrink:0;min-width:84px}
.pd-mstat .pp{font-family:var(--display);font-weight:800;font-size:24px;line-height:1}
.pd-mstat .s{font-size:11.5px;color:var(--muted);font-weight:700;margin-top:3px}
.pd-acts{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:170px}
.pd-act{width:36px;height:36px;border-radius:12px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;background:var(--ab);color:var(--ac);transition:transform .15s,box-shadow .2s}
.pd-act:hover{transform:translateY(-2px);box-shadow:0 8px 16px -10px var(--ac)}
.pd-act:active{transform:scale(.92)}
.pd-act.pay{width:auto;padding:0 13px;gap:6px;font:800 12.5px var(--body);background:var(--night);color:#f2f1ec}
.pd-act.pay svg{color:#4ade80}
.pd-pos{position:relative;width:50px;height:50px;flex-shrink:0}
.pd-pos-in{width:100%;height:100%;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.pd-pos-in b{font-family:var(--display);font-weight:800;font-size:19px;line-height:1}
.pd-pos-in i{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.04em;opacity:.8}
.pd-dot{position:absolute;top:-3px;right:-3px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center}
@media(max-width:620px){
  .pd-row-in{flex-wrap:wrap}
  .pd-acts{width:100%;max-width:none;justify-content:flex-start;flex-wrap:nowrap;gap:5px;padding-top:10px;margin-top:2px;border-top:1px dashed var(--border)}
  .pd-act{width:38px;height:40px;flex-shrink:0}
  .pd-act.pay{flex:1 1 64px;min-width:0;justify-content:center;padding:0 8px}
}
.pd-tip{position:absolute;right:0;top:30px;z-index:100;background:#fff;border:1px solid var(--border);border-radius:18px;padding:14px 16px;min-width:250px;box-shadow:0 24px 50px -18px rgba(20,21,26,.35);animation:keIn .25s ease backwards}
.pd-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.pd-steps button{height:52px;border-radius:14px;border:1.5px solid var(--border);background:#fff;font-family:var(--display);font-weight:800;font-size:22px;color:var(--muted);cursor:pointer;transition:all .2s}
.pd-steps button.on{background:var(--night);border-color:var(--night);color:#FFC83D;transform:translateY(-2px)}
.pd-regl{background:#fff;border:1px solid var(--border);border-radius:24px;padding:22px}
.pd-regl p.t{font-size:14px;color:#3a3d48;margin:0;line-height:1.85;white-space:pre-line}
`

// ─────────────────────────────────────────────────────────────
// ECHÈL PWEN
// ─────────────────────────────────────────────────────────────
const SCORE_SCALE = [
  { key: 'earlyDepo',  label: '💰 Depo rezèv (2+ jou davans)', pts: +7, color: '#059669' },
  { key: 'earlyDay',   label: '⚡ Jou avan dat la',            pts: +5, color: '#059669' },
  { key: 'early',      label: '✅ Avan lè a (menm jou)',       pts: +3, color: '#16a34a' },
  { key: 'onTime',     label: '🟢 Nan lè a (fenèt peman)',     pts: +1, color: '#16a34a' },
  { key: 'lateWindow', label: '🟡 Apre lè a (menm jou)',       pts: -1, color: '#d97706' },
  { key: 'late',       label: '🔴 1 jou an reta',              pts: -3, color: '#dc2626' },
  { key: 'veryLate',   label: '🔴 2+ jou an reta',             pts: -5, color: '#b91c1c' },
  { key: 'missing',    label: '⚫ Pa peye ditou',              pts: -7, color: '#6b7080' },
]

function ScoreDisplay({ score, inRecovery }) {
  if (score === undefined || score === null) return null
  let color, label, Icon
  if      (score >= 15) { color = '#059669'; label = 'Chanpyon'; Icon = TrendingUp   }
  else if (score >= 6)  { color = D.green;   label = 'Bon';      Icon = TrendingUp   }
  else if (score >= 0)  { color = D.orange;  label = 'Mwayen';   Icon = Minus        }
  else if (score >= -8) { color = D.red;     label = 'Fèb';      Icon = TrendingDown }
  else                  { color = '#b91c1c'; label = 'Kritik';   Icon = TrendingDown }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: hexA(color, .09), border: `1px solid ${hexA(color, .25)}`, borderRadius: 999, padding: '3px 10px 3px 8px' }}>
        <Icon size={13} color={color} />
        <b style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17, lineHeight: 1.1, color }}>{score > 0 ? `+${score}` : score}</b>
        <span style={{ fontSize: 11, color, fontWeight: 800 }}>{label}</span>
      </span>
      {inRecovery && <Chip color={T.orange}>Rekiperasyon · max +2</Chip>}
    </div>
  )
}

function ScoreTooltip({ breakdown }) {
  const [show, setShow] = useState(false)
  if (!breakdown) return null
  const rows = SCORE_SCALE.filter(r => (breakdown[r.key] || 0) > 0)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setShow(s => !s)} aria-label="Detay skò"
        style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${D.border}`, background: show ? D.night : '#fff', color: show ? '#FFC83D' : D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
        <Info size={13} />
      </button>
      {show && (
        <>
          <div onClick={() => setShow(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div className="pd-tip">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="ke-label-s">Detay skò</span>
              <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer', display: 'flex' }}><X size={15} /></button>
            </div>
            {rows.length === 0 ? (
              <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>Poko gen peman anrejistre.</p>
            ) : rows.map(r => (
              <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#3a3d48', fontWeight: 600 }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: r.color, background: hexA(r.color, .09), borderRadius: 8, padding: '2px 8px', flexShrink: 0 }}>
                  {breakdown[r.key]}× ({r.pts > 0 ? '+' : ''}{breakdown[r.key] * r.pts})
                </span>
              </div>
            ))}
            <div style={{ borderTop: `1px dashed ${D.border}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: D.text }}>Total</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, lineHeight: 1, color: breakdown.total >= 0 ? D.green : D.red }}>
                {breakdown.total > 0 ? `+${breakdown.total}` : breakdown.total} <small style={{ fontSize: 12 }}>pts</small>
              </span>
            </div>
            {breakdown.inRecovery && (
              <div style={{ marginTop: 10, padding: '8px 11px', background: D.orangeBg, borderRadius: 12, fontSize: 11.5, color: D.orange, lineHeight: 1.5, fontWeight: 600 }}>
                <b>Plafon aktif</b> — Ou te an reta resamman. Maksimòm +2 pa peman jiskaske ou rekipere.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PosBadge({ member, plan, dynamic }) {
  const isOwn = member.isOwnerSlot
  const locked = member.hasWon
  const bg = isOwn ? 'linear-gradient(135deg,#FFD45C,#E0A410)' : locked ? hexA(T.green, .12) : D.night
  const fg = isOwn ? '#0b0c0f' : locked ? T.green : '#FFC83D'
  return (
    <div className="pd-pos">
      <div className="pd-pos-in" style={{ background: bg, color: fg }}>
        <b>{isOwn ? '★' : `#${hasOwnerSlot(plan) ? member.position - 1 : member.position}`}</b>
        {!isOwn && member.permanentId && <i style={{ color: locked ? T.green : '#f2f1ec' }}>{member.permanentId}</i>}
      </div>
      {dynamic && !locked && !isOwn && (
        <span className="pd-dot" title="Plas pwovizwa" style={{ width: 12, height: 12, background: T.blue, animation: 'pulse 2s ease-in-out infinite' }} />
      )}
      {locked && (
        <span className="pd-dot" style={{ width: 17, height: 17, background: T.green }}><Lock size={8} color="#fff" /></span>
      )}
    </div>
  )
}

// ✅ Koulè kouwòn chak kat manm — menm moun (menm telefòn) = menm koulè
const ROW_COLORS = [
  ['#FFC83D', '#E0A410'], ['#3b82f6', '#06b6d4'], ['#8b5cf6', '#ec4899'], ['#10b981', '#84cc16'],
  ['#f97316', '#ef4444'], ['#06b6d4', '#6366f1'], ['#ec4899', '#f59e0b'], ['#14b8a6', '#3b82f6'],
  ['#a855f7', '#6366f1'], ['#ef4444', '#f97316'], ['#22c55e', '#14b8a6'], ['#0ea5e9', '#8b5cf6'],
]
const rowColor = (m) => {
  const key = String(m.phone || '').replace(/\D/g, '') || String(m.id || m.name || '')
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return ROW_COLORS[h % ROW_COLORS.length]
}

const dmy = (d) => String(d || '').split('T')[0].split('-').reverse().join('/')

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function PlanDetail({
  plan, onBack, onAddMember, onPaymentSaved, onBlindDraw,
  onEditPlan, onClosePlan, onMemberAction, onToggleDynamic, onToggleManualTime, onToggleHidePosition, onRecalculate, printer, onAdjustPosition,
}) {
  const [viewMember,       setView]             = useState(null)
  const [viewMemberSlots,  setSlots]            = useState(null)
  const [payMember,        setPay]              = useState(null)
  const [actionModal,      setAction]           = useState(null)
  const [confirmingPayout, setConfirmingPayout] = useState(null)
  const [declaringPayout,  setDeclaringPayout]  = useState(null)
  const [tab,              setTab]              = useState('members')
  const [memberSearch,     setMemberSearch]     = useState('')
  const [memberFilter,     setMemberFilter]     = useState('all')
  const [adjustPos,        setAdjustPos]        = useState(null)
  const [adjustSteps,      setAdjustSteps]      = useState(1)

  useEffect(() => { setView(null); setSlots(null) }, [plan.regleman, plan.updatedAt, plan.id])

  useEffect(() => {
    if (document.getElementById('pd-styles')) return
    const el = document.createElement('style')
    el.id = 'pd-styles'
    el.textContent = PD_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('pd-styles')?.remove()
  }, [])

  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const { today, currentTime } = getHaitiNow()
  const dueTimeEnd = plan.dueTimeEnd || '17:00'

  const allDates  = useMemo(() => getAllPaymentDates(plan), [plan])
  const payoutMap = useMemo(() => getPayoutDateMap(plan), [plan])
  const isDynamic    = !!plan.dynamicPositions
  const manualTimeOn = !!plan.manualPaymentTime
  const hidePosOn    = !!plan.hidePositionInSol

  const todayWinner = plan.members?.find(m => String(m.declaredPayoutDate || '').split('T')[0] === today) || null

  const activeMembers  = (plan.members || []).filter(m => m.status !== 'stopped')
  const totColl        = activeMembers.reduce((acc, m) => acc + allDates.filter(d => m.payments?.[d]).length * plan.amount, 0) || 0
  const totExp         = activeMembers.reduce(
    (acc) => acc + allDates.filter(d => d < today || (d === today && currentTime > dueTimeEnd)).length * plan.amount, 0) || 0
  const todayColl      = activeMembers.reduce((a, m) => a + (m.payments?.[today] ? Number(plan.amount) : 0), 0)
  const isPayDayToday  = allDates.includes(today)
  const todayExpected  = isPayDayToday ? activeMembers.length * Number(plan.amount) : 0
  const payout         = memberPayout(plan)
  const depoRezevTotal = useMemo(() => calcDepoRezev(plan, today), [plan, today])
  const winnersCount   = (plan.members || []).filter(m => m.hasWon).length

  const statusOf = (m) => computeMemberStatus(m, plan, today, currentTime)
  const blockedCount = (plan.members || []).filter(m => statusOf(m) === 'blocked').length
  const lateCount    = (plan.members || []).filter(m => statusOf(m) === 'late').length
  const stoppedCount = (plan.members || []).filter(m => m.status === 'stopped').length
  const rate = totExp > 0 ? Math.min(1, totColl / totExp) : 1

  const displayMembers = useMemo(() => {
    return (plan.members || []).flatMap(m => {
      if (m.positions && Array.isArray(m.positions) && m.positions.length > 1) {
        return m.positions.map(pos => ({ ...m, position: pos, _virtualKey: `${m.id}-${pos}` }))
      }
      return [{ ...m, _virtualKey: `${m.id}-${m.position}` }]
    })
  }, [plan.members])

  // ─── Filt manm ─────────────────────────────────────────────
  const FILTERS = [
    { k: 'all',     l: 'Tout',          c: T.ink,    test: () => true },
    { k: 'paidT',   l: 'Peye jodi a',   c: T.green,  test: m => m.status !== 'stopped' && !!m.payments?.[today] },
    { k: 'unpaidT', l: 'Pa peye jodi a', c: T.orange, test: m => isPayDayToday && m.status !== 'stopped' && !m.hasWon && !m.payments?.[today] },
    { k: 'late',    l: 'An reta',       c: T.orange, test: m => statusOf(m) === 'late' },
    { k: 'blocked', l: 'Bloke',         c: T.red,    test: m => statusOf(m) === 'blocked' },
    { k: 'stopped', l: 'Kanpe',         c: T.muted,  test: m => m.status === 'stopped' },
    { k: 'won',     l: 'Touche',        c: T.goldDeep, test: m => !!m.hasWon },
  ]
  const fCounts = Object.fromEntries(FILTERS.map(f => [f.k, displayMembers.filter(f.test).length]))
  const activeF = FILTERS.find(f => f.k === memberFilter) || FILTERS[0]
  const q = memberSearch.toLowerCase()
  const shownMembers = displayMembers.filter(m =>
    activeF.test(m) &&
    (!q || m.name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.permanentId?.toLowerCase().includes(q))
  )

  const handleViewMember = (m) => {
    const slots = getMemberSlots(plan, m.phone)
    setView(m)
    setSlots(slots.length > 1 ? slots : null)
  }

  const isPlanClosed = plan.status === 'closed' || plan.status === 'finished'

  const SETTINGS = [
    { k: 'dyn', on: isDynamic, c: T.blue, icon: <Zap size={18} />, t: 'Pozisyon dinamik',
      d: isDynamic ? 'Plas yo pwovizwa — pi bonè ou peye, pi plis pwen, pi devan ou ale.' : 'Aktive pou pozisyon yo ajiste selon pèfòmans chak manm.',
      toggle: () => onToggleDynamic(plan.id),
      extra: isDynamic && <button className="ke-btn ke-btn-soft" style={{ height: 32, padding: '0 11px', fontSize: 12, marginTop: 8 }} onClick={() => onRecalculate(plan.id)}><RefreshCw size={13} /> Rekalkile</button> },
    { k: 'time', on: manualTimeOn, c: T.violet, icon: <Clock4 size={18} />, t: 'Lè manyèl',
      d: manualTimeOn ? 'Kesye a ka antre lè kliyan an te reyèlman peye a.' : 'Aktive pou kesye antre lè egzat kliyan an te peye a.',
      toggle: () => onToggleManualTime(plan.id) },
    { k: 'hide', on: hidePosOn, c: T.red, icon: <EyeOff size={18} />, t: 'Kache pozisyon',
      d: hidePosOn ? 'Manm yo PA wè "Pozisyon #X" — pwen ak dat pwomès rete vizib.' : 'Aktive pou kache "Pozisyon #X" nan kont sol manm yo.',
      toggle: () => onToggleHidePosition(plan.id) },
  ]

  const TABS = [
    ['members',  'Manm',       <Users size={15} key="i" />],
    ['calendar', 'Kalandriye', <CalendarDays size={15} key="i" />],
    ['exchange', 'Echanj',     <Repeat size={15} key="i" />],
    ['regleman', 'Regleman',   <FileText size={15} key="i" />],
    ['cash',     'Kès',        <Landmark size={15} key="i" />],
  ]

  return (
    <>
      {/* ════════ HERO ════════ */}
      <section className="ke-hero ke-in">
        <div className="ke-hero-glow" />
        <div className="ke-hero-grid" />
        <div className="ke-hero-body">
          <div style={{ minWidth: 0 }}>
            <div className="ke-hero-top">
              <div className="ke-hero-head">
                <button onClick={onBack} className="pd-back" aria-label="Retounen"><ArrowLeft size={20} /></button>
                <div style={{ minWidth: 0 }}>
                  <span className="ke-eyebrow"><span className="ke-live" />{todayLabel()} · {currentTime}</span>
                  <h1 className="ke-title" style={{ overflowWrap: 'anywhere' }}>{plan.name}</h1>
                  <p className="ke-sub">{freqFullLabel(plan)} · {fmt(plan.amount)} HTG / moun</p>
                  <div className="pd-hero-chips">
                    <PlanStatusBadge status={plan.status || 'open'} dark />
                    {isDynamic && <Chip dark color={T.blueD} icon={<Zap size={11} />}>Dinamik</Chip>}
                    {Number(plan.penalty) > 0 && <Chip dark color={T.redD}>Amand {fmt(plan.penalty)} G</Chip>}
                    <Chip dark color="#f2f1ec" icon={<Clock4 size={11} />}>Limit {dueTimeEnd}</Chip>
                  </div>
                </div>
              </div>
              <div className="ke-hero-actions">
                <PrinterBtn printer={printer} />
                <ReceiptSizeBtn />
                <button onClick={onEditPlan} title="Modifye plan" className="ke-btn ke-btn-glass sq"><Edit3 size={16} /></button>
                {!isPlanClosed && (
                  <button onClick={onClosePlan} title="Fèmen plan" className="ke-btn ke-btn-glass sq pd-danger-glass"><StopCircle size={16} /></button>
                )}
                {!isPlanClosed && (
                  <button onClick={onAddMember} className="ke-btn ke-btn-gold"><Plus size={17} /> Enskri</button>
                )}
              </div>
            </div>

            <div className="ke-hero-bottom">
              <div>
                <span className="ke-big-l"><Wallet size={14} /> Kolekte total</span>
                <p className="ke-big"><AnimatedNumber value={totColl} format={fmt} duration={1400} /><small>HTG</small></p>
                <span className="ke-net" style={{ color: totExp - totColl > 0 ? T.redD : T.greenD }}>
                  {totExp - totColl > 0 ? <><AlertTriangle size={14} /> Rès atann {fmt(totExp - totColl)} HTG</> : <><CheckCircle size={14} /> Tout kontribisyon ajou</>}
                </span>
              </div>
              <GlassStat format={fmt} label="Jodi a" icon={<CheckCircle size={14} />} num={todayColl} color={T.greenD}
                pct={todayExpected ? (todayColl / todayExpected) * 100 : 0}
                sub={isPayDayToday ? `sou ${fmt(todayExpected)} atann` : 'Pa jou peman'} />
              <GlassStat format={fmt} label="Manm touche" icon={<Trophy size={14} />} num={payout} color={T.gold}
                pct={displayMembers.length ? (winnersCount / displayMembers.length) * 100 : 0}
                sub={`${winnersCount} / ${displayMembers.length} deja touche`} />
            </div>
          </div>

          <div className="ke-hero-side">
            <Ring value={rate} size={170} color={rate >= .9 ? T.gold : rate >= .7 ? '#fb923c' : T.redD} />
            <div className="ke-side-txt" style={{ textAlign: 'center' }}>
              <span className="ke-eyebrow ke-side-l"><TrendingUp size={14} /> To koleksyon</span>
              <p className="ke-side-v"><AnimatedInt value={activeMembers.length} /> <span>manm</span></p>
              <p className="ke-side-s">{allDates.filter(d => d <= today).length} / {allDates.length} sik pase</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ GAYAN JODI A ════════ */}
      {todayWinner && (
        <div className="pd-win">
          <div className="pd-win-ic"><Trophy size={24} /></div>
          <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
            <span className="ke-eyebrow" style={{ color: '#FFC83D' }}>Ap touche jodi a</span>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 26, lineHeight: 1.05, textTransform: 'uppercase' }}>{todayWinner.name}</p>
            {todayWinner.permanentId && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(242,241,236,.6)', fontWeight: 700 }}>ID {todayWinner.permanentId}</p>}
          </div>
          <p className="pd-win-amt">{fmt(todayWinner.isOwnerSlot ? ownerPayout(plan) : payout)}<small>HTG</small></p>
        </div>
      )}

      {/* ════════ AVÈTISMAN ════════ */}
      {isPlanClosed && (
        <div className="ke-alert" style={{ '--c': T.red, '--cbg': hexA(T.red, .07), '--cbd': hexA(T.red, .25) }}>
          <StopCircle size={17} /><div><b>Plan sa a fèmen.</b> Pa ka enskri ni make nouvo peman.</div>
        </div>
      )}
      {(blockedCount > 0 || lateCount > 0) && (
        <div className="ke-alert" style={{ '--c': T.orange, '--cbg': hexA(T.orange, .08), '--cbd': hexA(T.orange, .3) }}>
          <AlertTriangle size={17} />
          <div>
            {blockedCount > 0 && <b style={{ color: T.red }}>{blockedCount} kont bloke</b>}
            {blockedCount > 0 && lateCount > 0 && ' · '}
            {lateCount > 0 && <b>{lateCount} manm an reta</b>}
            {stoppedCount > 0 && <span style={{ color: T.muted }}> · {stoppedCount} kanpe</span>}
          </div>
        </div>
      )}

      {/* ════════ STATS ════════ */}
      <div className="pd-stats">
        <StatCard label="Manm aktif" num={activeMembers.length} icon={<Users size={21} />} color={T.blue}
          pct={displayMembers.length ? (activeMembers.length / (plan.members?.length || 1)) * 100 : 0} pill={stoppedCount ? `${stoppedCount} kanpe` : null} delay={.05} />
        <StatCard label="Rès atann" num={Math.max(0, totExp - totColl)} format={fmt} suffix="G" icon={<AlertTriangle size={21} />} color={T.red}
          pct={totExp ? ((totExp - totColl) / totExp) * 100 : 0} delay={.09} />
        <StatCard label="Depo rezèv" num={depoRezevTotal} format={fmt} suffix="G" icon={<PiggyBank size={21} />} color={T.teal}
          pct={totColl ? (depoRezevTotal / totColl) * 100 : 0} pill="Alavans" delay={.13} />
        <StatCard label="Peye jodi a" num={fCounts.paidT} icon={<CheckCircle size={21} />} color={T.green}
          pct={activeMembers.length ? (fCounts.paidT / activeMembers.length) * 100 : 0} pill={`/ ${activeMembers.length}`} delay={.17} />
      </div>

      {/* ════════ PARAMÈT ════════ */}
      <div className="pd-sets ke-in" style={{ animationDelay: '.2s' }}>
        {SETTINGS.map(s => (
          <div key={s.k} className={`pd-set ${s.on ? 'on' : ''}`} style={{ '--sc': s.c, '--sc-bg': hexA(s.c, .1), '--sc-bd': hexA(s.c, .35) }}>
            <div className="pd-set-ic">{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
              {s.extra}
            </div>
            <Switch on={s.on} onClick={s.toggle} color={s.c} />
          </div>
        ))}
      </div>

      {/* ════════ TABS ════════ */}
      <div className="pd-tabs ke-in" style={{ animationDelay: '.24s' }} role="tablist">
        {TABS.map(([t, l, ic]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`pd-tab ${tab === t ? 'on' : ''}`}>{ic}{l}</button>
        ))}
        <button onClick={onBlindDraw} disabled={isPlanClosed} className="ke-btn ke-btn-soft pd-draw" style={{ height: 42, opacity: isPlanClosed ? .4 : 1, color: T.blue }}>
          <Shuffle size={15} /> Tiraj avèg
        </button>
      </div>

      {/* ════════ TAB: MANM ════════ */}
      {tab === 'members' && (
        <div className="pd-list">
          {isDynamic && (
            <div className="pd-legend">
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: D.muted, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: T.blue }} /> Plas pwovizwa</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={12} color={T.green} /> Plas enchanjab</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={12} color={T.green} /> Skò monte</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingDown size={12} color={T.red} /> Skò desann</span>
              </div>
              <div className="pd-scale">
                {SCORE_SCALE.map(({ label, pts, color }) => (
                  <span key={label} style={{ color, background: hexA(color, .08) }}>{label}<b>{pts > 0 ? `+${pts}` : pts}</b></span>
                ))}
              </div>
            </div>
          )}

          {!!plan.members?.length && (
            <>
              <div className="ke-search" style={{ flex: 'none' }}>
                <Search size={19} className="lead" />
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Chèche manm, telefòn, ID..." aria-label="Chèche manm" />
                {memberSearch && <button className="clr" onClick={() => setMemberSearch('')} aria-label="Efase"><X size={15} /></button>}
              </div>
              <div className="pd-filters">
                {FILTERS.filter(f => f.k === 'all' || fCounts[f.k] > 0 || f.k === memberFilter).map(f => (
                  <button key={f.k} className={`pd-fchip ${memberFilter === f.k ? 'on' : ''}`} style={{ '--fc': f.c }} onClick={() => setMemberFilter(f.k)}>
                    {f.l}<span className="n">{fCounts[f.k]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {!plan.members?.length ? (
            <div className="ke-empty">
              <div className="ke-empty-ic"><Users size={28} /></div>
              <h3>Pa gen manm ankò</h3>
              <p>Enskri premye kliyan ou pou kòmanse sol la.</p>
              {!isPlanClosed && <button className="ke-btn ke-btn-dark" onClick={onAddMember}><Plus size={17} /> Enskri manm</button>}
            </div>
          ) : shownMembers.length === 0 ? (
            <div className="ke-empty">
              <div className="ke-empty-ic"><Inbox size={28} /></div>
              <h3>Okenn manm</h3>
              <p>Pa gen manm ki koresponn ak filt sa a.</p>
            </div>
          ) : shownMembers.map((m, idx) => {
            const totalDates = allDates.length
            const paid       = allDates.filter(d => m.payments?.[d]).length
            const rèsHTG     = Math.max(0, (totalDates - paid) * plan.amount)
            const overdueDates = allDates.filter(d => isDateOverdue(d, today, currentTime, dueTimeEnd) && !m.payments?.[d]).length
            const payoutDate = payoutMap[m.position]
            const isWin      = payoutDate === today
            const isOwn      = m.isOwnerSlot
            const fineTot    = Object.values(m.fines || {}).reduce((a, b) => a + Number(b), 0)
            const mStatus    = statusOf(m)
            const isStopped  = m.status === 'stopped'
            const paidToday  = !!m.payments?.[today]
            const localBreakdown = computeLocalBreakdown(m, plan, today, currentTime, m.scoreBreakdown || null)
            const hasActivity = localBreakdown.count > 0
            const score      = hasActivity ? localBreakdown.total : null
            const breakdown  = hasActivity ? localBreakdown : null
            const perf       = m.performanceScore ?? 0
            const perfC      = perf >= 80 ? T.green : perf >= 50 ? T.orange : T.red
            const pct        = totalDates ? Math.min(100, (paid / totalDates) * 100) : 0

            const [rc1, rc2] = isOwn ? ['#FFD45C', '#E0A410'] : rowColor(m)
            return (
              <div key={m._virtualKey || m.id} className={`pd-row ${isStopped ? 'stop' : isOwn ? 'own' : isWin ? 'win' : ''}`}
                style={{ animationDelay: `${Math.min(idx, 14) * .03}s`, '--rg': `linear-gradient(135deg,${rc1},${rc2})`, '--rc': hexA(rc1, .55), '--rt': hexA(rc1, .07) }}>
                <div className="pd-row-in">
                  <PosBadge member={m} plan={plan} dynamic={isDynamic} />

                  <div className="pd-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span className="pd-name" style={{ color: isStopped ? T.orange : isOwn ? T.goldInk : T.ink }}>
                        {isOwn ? 'Pwopriyetè sol' : m.name}
                      </span>
                      {isWin && !isOwn && <Trophy size={14} color={T.goldDeep} style={{ flexShrink: 0 }} />}
                    </div>

                    {isDynamic && !isOwn && score !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <ScoreDisplay score={score} inRecovery={breakdown?.inRecovery || false} />
                        <ScoreTooltip breakdown={breakdown} />
                      </div>
                    )}

                    <div className="pd-meta">
                      <span className="ph">{m.phone}</span>
                      {!isStopped && isPayDayToday && !m.hasWon && (
                        paidToday
                          ? <Chip color={T.green} icon={<CheckCircle size={11} />}>Peye jodi a</Chip>
                          : <Chip color={mStatus === 'blocked' ? T.red : T.orange} icon={<Clock4 size={11} />}>{mStatus === 'blocked' ? 'Bloke' : mStatus === 'late' ? 'An reta' : 'Ap tann'}</Chip>
                      )}
                      {!isStopped && !isPayDayToday && mStatus === 'late' && <Chip color={T.orange}>An reta</Chip>}
                      {!isStopped && !isPayDayToday && mStatus === 'blocked' && <Chip color={T.red}>Bloke</Chip>}
                      {payoutDate && !isStopped && <Chip color={T.blue} icon={<Trophy size={11} />}>{dmy(payoutDate)}</Chip>}
                      {m.declaredPayoutDate && !isStopped && !m.hasWon && (
                        <Chip color={T.violet} icon={<Calendar size={11} />}>Pwomès {dmy(m.declaredPayoutDate)}</Chip>
                      )}
                      {!isStopped && <Chip color={perfC} icon={<Star size={11} />}>{perf} pwen</Chip>}
                      {isStopped && Number(m.stopRefundAmount || 0) > 0 && (
                        <Chip color={m.stopRefundPaid ? T.green : T.orange}>
                          {m.stopRefundPaid ? 'Ranbousman peye' : `Rete pou peye: ${fmt(m.stopRefundAmount)} G`}
                        </Chip>
                      )}
                    </div>
                  </div>

                  <div className="pd-mstat">
                    {isStopped ? (
                      <>
                        <div className="pp" style={{ color: T.orange, fontSize: 20 }}>{fmt(paid * plan.amount)}</div>
                        <div className="s">kontribiye</div>
                      </>
                    ) : (
                      <>
                        <div className="pp" style={{ color: paid >= totalDates ? T.green : overdueDates > 0 ? T.orange : T.ink }}>
                          {paid}<span style={{ fontSize: 15, color: T.muted }}>/{totalDates}</span>
                        </div>
                        <div className="s">{fmt(paid * plan.amount)} G</div>
                        {rèsHTG > 0 && <div className="s" style={{ color: T.red, fontSize: 11 }}>Rès {fmt(rèsHTG)}</div>}
                        {fineTot > 0 && <div className="s" style={{ color: T.red, fontSize: 11 }}>+{fmt(fineTot)} amand</div>}
                      </>
                    )}
                  </div>

                  <div className="pd-acts">
                    {!isStopped && plan.status !== 'finished' && (
                      <button onClick={() => setPay(m)} title="Make peye" aria-label="Make peye" className="pd-act pay">
                        <CheckCircle size={15} /> Peye
                      </button>
                    )}
                    <button onClick={() => handleViewMember(m)} title="Kont vityèl" aria-label="Kont vityèl" className="pd-act" style={{ '--ab': hexA(T.goldDeep, .14), '--ac': T.goldInk }}>
                      <Eye size={15} />
                    </button>
                    {!m.hasWon && (
                      <button
                        onClick={() => setAction({ member: m, action: mStatus === 'blocked' ? 'unblock' : isStopped ? 'resume' : 'block' })}
                        title={mStatus === 'blocked' ? 'Debloke' : isStopped ? 'Reprann' : 'Bloke'}
                        aria-label={mStatus === 'blocked' ? 'Debloke' : isStopped ? 'Reprann' : 'Bloke'}
                        className="pd-act"
                        style={{ '--ab': hexA(mStatus === 'blocked' ? T.green : isStopped ? T.blue : T.red, .1), '--ac': mStatus === 'blocked' ? T.green : isStopped ? T.blue : T.red }}>
                        {mStatus === 'blocked' ? <Unlock size={14} /> : isStopped ? <UserCheck size={14} /> : <Lock size={14} />}
                      </button>
                    )}
                    {isStopped && Number(m.stopRefundAmount || 0) > 0 && !m.stopRefundPaid && (
                      <button onClick={() => onMemberAction(m.id, 'mark_refund_paid', '')} title="Make ranbousman peye" aria-label="Make ranbousman peye"
                        className="pd-act" style={{ '--ab': hexA(T.green, .1), '--ac': T.green }}>
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {!m.hasWon && !isStopped && mStatus !== 'blocked' && !isOwn && (
                      <button onClick={() => setAction({ member: m, action: 'stop' })} title="Kanpe patisipasyon" aria-label="Kanpe patisipasyon"
                        className="pd-act" style={{ '--ab': hexA(T.orange, .12), '--ac': T.orange }}>
                        <StopCircle size={14} />
                      </button>
                    )}
                    {!isStopped && !m.hasWon && payoutDate && payoutDate <= today && (
                      <button onClick={() => setConfirmingPayout(m)} title="Konfime touche" aria-label="Konfime touche"
                        className="pd-act" style={{ '--ab': 'linear-gradient(135deg,#FFD45C,#E0A410)', '--ac': '#0b0c0f' }}>
                        <Trophy size={14} />
                      </button>
                    )}
                    {!isStopped && !m.hasWon && (
                      <button onClick={() => setDeclaringPayout(m)} title="Deklare dat peman" aria-label="Deklare dat peman"
                        className="pd-act" style={{ '--ab': hexA(T.violet, .1), '--ac': T.violet }}>
                        <Calendar size={14} />
                      </button>
                    )}
                    {!isStopped && !m.hasWon && !isOwn && (
                      <button onClick={() => { setAdjustPos(m); setAdjustSteps(1) }} title="Desann pozisyon" aria-label="Desann pozisyon"
                        className="pd-act" style={{ '--ab': hexA(T.blue, .1), '--ac': T.blue }}>
                        <TrendingDown size={14} />
                      </button>
                    )}
                    {m.hasWon && <Chip color={T.goldDeep} icon={<Trophy size={11} />}>Touche</Chip>}
                  </div>
                </div>

                {totalDates > 0 && !isStopped && (
                  <div style={{ marginTop: 12 }}>
                    <Track pct={pct} color={paid >= totalDates ? T.green : overdueDates > 0 ? T.goldDeep : T.green} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'calendar' && <PlanCalendar plan={plan} />}
      {tab === 'exchange' && <ExchangeTab plan={plan} />}
      {tab === 'cash'     && <AdminCashTab plan={plan} />}
      {tab === 'regleman' && (
        <div className="pd-regl ke-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: D.night, color: '#FFC83D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={19} /></div>
              <h3 style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, textTransform: 'uppercase', letterSpacing: '.02em' }}>Regleman sol la</h3>
            </div>
            <button onClick={onEditPlan} className="ke-btn ke-btn-soft" style={{ height: 38 }}><Edit3 size={14} /> Modifye</button>
          </div>
          {plan.regleman ? (
            <p className="t">{plan.regleman}</p>
          ) : (
            <div className="ke-empty" style={{ padding: '24px 0', border: 0 }}>
              <div className="ke-empty-ic"><FileText size={26} /></div>
              <h3>Pa gen regleman</h3>
              <p>Ajoute regleman yo nan "Modifye plan".</p>
            </div>
          )}
        </div>
      )}

      {/* ════════ MODALS ════════ */}
      {payMember && (
        <ModalMarkPayment member={payMember} plan={plan} printer={printer}
          onClose={() => setPay(null)}
          onSave={(memberId, dates, timings, fines, paidAt) => onPaymentSaved(memberId, dates, timings, fines, paidAt)} />
      )}

      {viewMember && (
        <MemberVirtualAccount member={viewMember} plan={plan} printer={printer}
          allMemberSlots={viewMemberSlots}
          onClose={() => { setView(null); setSlots(null) }} />
      )}

      {actionModal && (
        <ModalMemberAction member={actionModal.member} plan={plan} action={actionModal.action}
          printer={printer} loading={false}
          onClose={() => setAction(null)}
          onConfirm={(action, reason) => { onMemberAction(actionModal.member.id, action, reason); setAction(null) }} />
      )}

      {declaringPayout && (
        <ModalDeclarePayout member={declaringPayout} plan={plan} loading={false}
          onClose={() => setDeclaringPayout(null)}
          onConfirm={(payoutDate) => { onMemberAction(declaringPayout.id, 'schedule_payout', '', payoutDate); setDeclaringPayout(null) }} />
      )}

      {/* ✅ FIX: yon sèl modal, deyò map manm yo */}
      {adjustPos && (
        <Modal onClose={() => setAdjustPos(null)} title="Ajiste pozisyon" subtitle={adjustPos.name} icon={<TrendingDown size={20} />} width={440}
          footer={<>
            <button className="ke-fbtn" onClick={() => setAdjustPos(null)}>Anile</button>
            <button className="ke-fbtn main dark" onClick={() => { onAdjustPosition(adjustPos.id, adjustSteps); setAdjustPos(null) }}>
              <TrendingDown size={16} /> Konfime ajisteman
            </button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, background: D.soft, borderRadius: 18, padding: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <p className="ke-label-s">Kounye a</p>
                <p style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 40, lineHeight: 1 }}>#{adjustPos.position - (hasOwnerSlot(plan) ? 1 : 0)}</p>
              </div>
              <TrendingDown size={22} color={T.blue} />
              <div style={{ textAlign: 'center' }}>
                <p className="ke-label-s">Nouvo</p>
                <p style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 40, lineHeight: 1, color: T.blue }}>#{adjustPos.position + adjustSteps - (hasOwnerSlot(plan) ? 1 : 0)}</p>
              </div>
            </div>
            <div>
              <p className="ke-label-s" style={{ marginBottom: 8 }}>Konbyen plas pou desann?</p>
              <div className="pd-steps">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={adjustSteps === n ? 'on' : ''} onClick={() => setAdjustSteps(n)}>-{n}</button>
                ))}
              </div>
            </div>
            <div className="ke-alert" style={{ '--c': T.blue, '--cbg': hexA(T.blue, .06), '--cbd': hexA(T.blue, .2), margin: 0 }}>
              <Info size={16} />
              <div>Manm ant <b>#{adjustPos.position + 1 - (hasOwnerSlot(plan) ? 1 : 0)}</b> ak <b>#{adjustPos.position + adjustSteps - (hasOwnerSlot(plan) ? 1 : 0)}</b> ap <b style={{ color: T.green }}>monte 1 plas</b> chak. Skò ak kont vityèl <b>pa chanje</b>.</div>
            </div>
          </div>
        </Modal>
      )}

      {confirmingPayout && (
        <Modal onClose={() => setConfirmingPayout(null)} title="Konfime touche" subtitle={confirmingPayout.name} icon={<Trophy size={20} />} width={440}
          footer={<>
            <button className="ke-fbtn" onClick={() => setConfirmingPayout(null)}>Anile</button>
            <button className="ke-fbtn main gold" onClick={() => { onMemberAction(confirmingPayout.id, 'payout', ''); setConfirmingPayout(null) }}>
              <Trophy size={16} /> Konfime touche
            </button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: D.night, color: '#f2f1ec', borderRadius: 20, padding: '22px 18px', textAlign: 'center' }}>
              <div className="pd-win-ic" style={{ margin: '0 auto 12px' }}><Trophy size={24} /></div>
              <p style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, textTransform: 'uppercase' }}>{confirmingPayout.name}</p>
              {confirmingPayout.permanentId && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(242,241,236,.6)', fontWeight: 700 }}>ID {confirmingPayout.permanentId}</p>}
              <p style={{ margin: '12px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 44, lineHeight: 1, color: '#FFC83D' }}>
                {fmt(confirmingPayout.isOwnerSlot ? ownerPayout(plan) : memberPayout(plan))}<small style={{ fontSize: 15, color: 'rgba(242,241,236,.6)', marginLeft: 5 }}>HTG</small>
              </p>
            </div>
            <p style={{ fontSize: 13, color: D.muted, margin: 0, lineHeight: 1.6 }}>
              Aksyon sa ap <b style={{ color: D.text }}>make manm sa kòm touche</b>.
              {isDynamic && <span style={{ color: T.blue }}> Plas li ap <b>enchanjab</b> pou toujou.</span>}
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}