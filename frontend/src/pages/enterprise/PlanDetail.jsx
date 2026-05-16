// ─────────────────────────────────────────────────────────────
// PlanDetail.jsx — Detay Plan + Sistèm Pozisyon Dinamik
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react'
import {
  Users, Plus, Eye, CheckCircle, ArrowLeft, Search,
  Trophy, AlertTriangle, Edit3, Lock, Unlock, UserCheck,
  FileText, Shuffle, StopCircle, RefreshCw, Zap, ZapOff,
  TrendingUp, TrendingDown, Minus, Info,
} from 'lucide-react'

import {
  D, fmt, freqFullLabel,
  getAllPaymentDates, getPayoutDateMap,
  computeMemberStatus, memberPayout, ownerPayout,
  hasOwnerSlot, getMemberSlots, calcDepoRezev,
  // ✅ NOUVO: helpers ki respekte dueTimeEnd
  getHaitiNow, isDateOverdue, computeLocalBreakdown,
  isPositionLocked,
} from './sabotayUtils'

import {
  PrinterBtn, ReceiptSizeBtn, PlanStatusBadge,
  Modal,
  ModalMarkPayment, ModalMemberAction,
  PlanCalendar, MemberVirtualAccount,
  ExchangeTab, AdminCashTab,
} from './sabotayComponents'

// ─────────────────────────────────────────────────────────────
// ✅ CSS RESPONSIVE — Mobile-first, optimize pou workflow peman
// ─────────────────────────────────────────────────────────────
const PD_RESPONSIVE_STYLES = `
  /* ─── HEAD ─── */
  .pd-head {
    display: flex;
    align-items: center;
    gap: clamp(7px, 1.8vw, 10px);
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .pd-head-title {
    flex: 1 1 auto;
    min-width: 0;
  }
  .pd-head-title h2 {
    color: ${D.gold};
    margin: 0;
    font-size: clamp(15px, 4vw, 17px);
    font-weight: 900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pd-head-title p {
    color: ${D.muted};
    margin: 0;
    font-size: clamp(10px, 2.6vw, 11px);
  }
  .pd-head-btn {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 1px solid ${D.border};
    background: transparent;
    color: ${D.muted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pd-head-btn-primary {
    padding: clamp(8px, 2vw, 10px) clamp(11px, 2.5vw, 13px);
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: ${D.goldBtn};
    color: #0a1222;
    font-weight: 800;
    font-size: clamp(11px, 2.6vw, 12px);
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    min-height: 38px;
  }

  /* ─── STATS GRID ─── */
  .pd-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: clamp(7px, 1.8vw, 9px);
    margin-bottom: 16px;
  }
  .pd-stats-card {
    background: ${D.card};
    border: 1px solid ${D.border};
    border-radius: 10px;
    padding: clamp(9px, 2.2vw, 11px) clamp(10px, 2.5vw, 13px);
    text-align: center;
    min-width: 0;
  }
  .pd-stats-label {
    font-size: clamp(8px, 2.2vw, 9px);
    color: ${D.muted};
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 3px;
  }
  .pd-stats-val {
    font-family: monospace;
    font-weight: 800;
    font-size: clamp(11px, 2.8vw, 12px);
    word-break: break-word;
    line-height: 1.2;
  }

  /* ─── TABS — scroll orizontal sou mobil ─── */
  .pd-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
    align-items: center;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .pd-tabs::-webkit-scrollbar { display: none; }
  .pd-tab-btn {
    padding: clamp(7px, 2vw, 8px) clamp(11px, 2.8vw, 14px);
    border-radius: 8px;
    cursor: pointer;
    font-size: clamp(11px, 2.7vw, 12px);
    font-weight: 700;
    transition: all 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 36px;
  }
  .pd-tab-shuffle {
    padding: clamp(7px, 2vw, 8px) clamp(11px, 2.5vw, 13px);
    border-radius: 9px;
    border: 1px solid ${D.blue}40;
    background: ${D.blueBg};
    color: ${D.blue};
    font-weight: 700;
    font-size: clamp(11px, 2.7vw, 12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    margin-left: auto;
    min-height: 36px;
  }

  /* ─── MEMBER ROW ─── */
  .pd-member-row {
    border-radius: 12px;
    padding: clamp(10px, 2.6vw, 12px) clamp(11px, 2.8vw, 13px);
  }
  .pd-member-row-inner {
    display: flex;
    align-items: flex-start;
    gap: clamp(8px, 2vw, 10px);
  }
  .pd-member-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .pd-member-name {
    font-size: clamp(12px, 3.2vw, 13px);
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .pd-member-stats {
    text-align: right;
    flex-shrink: 0;
    min-width: 65px;
  }
  .pd-member-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .pd-action-btn {
    width: clamp(30px, 8vw, 32px);
    height: clamp(30px, 8vw, 32px);
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s ease;
  }
  .pd-action-btn:active { transform: scale(0.9); }

  /* ─── MOBIL — Stack member row pou bouton peman an ALWAYS aksesib ─── */
  @media (max-width: 560px) {
    .pd-member-row-inner {
      flex-wrap: wrap;
    }
    .pd-member-actions {
      width: 100%;
      justify-content: flex-start;
      gap: 6px;
      padding-top: 10px;
      margin-top: 8px;
      border-top: 1px solid ${D.borderSub};
    }
    .pd-action-btn {
      width: 38px;
      height: 38px; /* pi gwo sou mobil pou touch */
    }
  }

  /* ─── TI EKRAN (≤ 380px) ─── */
  @media (max-width: 380px) {
    .pd-head { gap: 6px; }
    .pd-head-btn { width: 34px; height: 34px; }
    .pd-stats { grid-template-columns: 1fr 1fr; }
  }

  /* ─── HOVER sèlman sou desktop ─── */
  @media (hover: hover) {
    .pd-action-btn:hover { transform: translateY(-1px); }
  }
`


// ─────────────────────────────────────────────────────────────
// ECHÈL PWEN — pou tooltip
// ─────────────────────────────────────────────────────────────
const SCORE_SCALE = [
  { key: 'earlyDepo',  label: '💰 Depo rezèv (2+ jou davans)', pts: +7, color: '#00d084' },
  { key: 'earlyDay',   label: '⚡ Jou avan dat la',            pts: +5, color: '#00d084' },
  { key: 'early',      label: '✅ Avan lè a (menm jou)',       pts: +3, color: '#22c55e' },
  { key: 'onTime',     label: '🟢 Nan lè a (fenèt peman)',     pts: +1, color: '#22c55e' },
  { key: 'lateWindow', label: '🟡 Apre lè a (menm jou)',       pts: -1, color: '#f59e0b' },
  { key: 'late',       label: '🔴 1 jou an reta',              pts: -3, color: '#ef4444' },
  { key: 'veryLate',   label: '🔴 2+ jou an reta',             pts: -5, color: '#dc2626' },
  { key: 'missing',    label: '⚫ Pa peye ditou',              pts: -7, color: '#6b7280' },
]

// ─────────────────────────────────────────────────────────────
// ScoreDisplay — Badge skor grann, lizib, ak koulè
// ─────────────────────────────────────────────────────────────
function ScoreDisplay({ score, inRecovery }) {
  if (score === undefined || score === null) return null

  let color, bg, label, Icon
  if      (score >= 15) { color = '#00d084'; bg = 'rgba(0,208,132,0.14)';  label = 'Chanpyon'; Icon = TrendingUp   }
  else if (score >= 6)  { color = D.green;   bg = D.greenBg;               label = 'Bon';      Icon = TrendingUp   }
  else if (score >= 0)  { color = D.orange;  bg = D.orangeBg;              label = 'Mwayen';   Icon = Minus        }
  else if (score >= -8) { color = D.red;     bg = D.redBg;                 label = 'Fèb';      Icon = TrendingDown }
  else                  { color = '#dc2626'; bg = 'rgba(220,38,38,0.15)'; label = 'Kritik';   Icon = TrendingDown }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 3 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: bg, border: `1.5px solid ${color}40`,
        borderRadius: 10, padding: '5px 10px', width: 'fit-content',
      }}>
        <Icon size={13} color={color} />
        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color, letterSpacing: '0.02em' }}>
          {score > 0 ? `+${score}` : score}
        </span>
        <span style={{ fontSize: 11, color, opacity: 0.85, fontWeight: 700 }}>
          {label}
        </span>
      </div>
      {inRecovery && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(245,158,11,0.10)',
          border: `1px solid ${D.orange}35`,
          borderRadius: 8, padding: '3px 8px', width: 'fit-content',
        }}>
          <span style={{ fontSize: 10, color: D.orange, fontWeight: 700 }}>
            ⚠️ Rekiperasyon — plafon +2/peman
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ScoreTooltip — Detay breakdown skor nan yon popòvè
// ─────────────────────────────────────────────────────────────
function ScoreTooltip({ breakdown }) {
  const [show, setShow] = useState(false)
  if (!breakdown) return null

  const rows = SCORE_SCALE.filter(r => (breakdown[r.key] || 0) > 0)

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setShow(s => !s)}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `1px solid ${D.borderSub}`,
          background: show ? D.goldDim : 'rgba(255,255,255,0.05)',
          color: show ? D.gold : D.muted,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        <Info size={12} />
      </button>

      {show && (
        <>
          <div onClick={() => setShow(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', right: 0, top: 28, zIndex: 100,
            background: '#0a1520', border: `1px solid ${D.border}`,
            borderRadius: 14, padding: '14px 16px', minWidth: 220,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Detay Skor
              </span>
              <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
            </div>
            {rows.length === 0 ? (
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Pako gen peman anrejistre.</p>
            ) : rows.map(r => (
              <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: D.muted }}>{r.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: r.color, fontFamily: 'monospace', background: `${r.color}12`, borderRadius: 6, padding: '1px 7px', flexShrink: 0, marginLeft: 8 }}>
                  {breakdown[r.key]}× ({r.pts > 0 ? '+' : ''}{breakdown[r.key] * r.pts})
                </span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${D.borderSub}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: breakdown.total >= 0 ? D.green : D.red, fontFamily: 'monospace' }}>
                {breakdown.total > 0 ? `+${breakdown.total}` : breakdown.total} pts
              </span>
            </div>
            {breakdown.inRecovery && (
              <div style={{ marginTop: 10, padding: '7px 10px', background: D.orangeBg, border: `1px solid ${D.orange}30`, borderRadius: 9, fontSize: 10, color: D.orange, lineHeight: 1.5 }}>
                ⚠️ <strong>Plafon aktif</strong> — Ou te an reta resamman. Maksimòm +2 pa peman jiskaske ou rekipere.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PosBadge — Badge pozisyon + permanentId
// ─────────────────────────────────────────────────────────────
function PosBadge({ member, plan, dynamic }) {
  const isOwn  = member.isOwnerSlot
  const locked = member.hasWon

  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 11,
        background: isOwn ? D.goldBtn : locked ? 'rgba(39,174,96,0.25)' : D.goldDim,
        border: `1px solid ${locked ? D.green : D.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1,
      }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 12, color: isOwn ? '#0a1222' : locked ? D.green : D.gold, lineHeight: 1 }}>
          {isOwn ? '★' : `#${hasOwnerSlot(plan) ? member.position - 1 : member.position}`}
        </span>
        {!isOwn && member.permanentId && (
          <span style={{ fontSize: 10, color: D.gold, lineHeight: 1, fontFamily: 'monospace', fontWeight: 800, opacity: 0.85 }}>
            {member.permanentId}
          </span>
        )}
      </div>
      {dynamic && !locked && !isOwn && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          width: 9, height: 9, borderRadius: '50%',
          background: D.blue, border: `2px solid ${D.bg}`,
          animation: 'pulse 2s ease-in-out infinite',
        }} title="Plas pwovizwa" />
      )}
      {locked && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          width: 14, height: 14, borderRadius: '50%',
          background: D.green, border: `2px solid ${D.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={7} color="#fff" />
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function PlanDetail({
  plan, onBack, onAddMember, onPaymentSaved, onBlindDraw,
  onEditPlan, onClosePlan, onMemberAction, onToggleDynamic, onRecalculate, printer, onAdjustPosition,
}) {
  const [viewMember,       setView]             = useState(null)
  const [viewMemberSlots,  setSlots]            = useState(null)
  const [payMember,        setPay]              = useState(null)
  const [actionModal,      setAction]           = useState(null)
  const [confirmingPayout, setConfirmingPayout] = useState(null)
  const [tab,              setTab]              = useState('members')
  const [memberSearch,     setMemberSearch]     = useState('')
  const [adjustPos, setAdjustPos] = useState(null)  // ✅ NOUVO
  const [adjustSteps, setAdjustSteps] = useState(1) // ✅ NOUVO

  useEffect(() => { setView(null); setSlots(null) }, [plan.regleman, plan.updatedAt, plan.id])

  // ✅ Injekte CSS responsive yon sèl fwa
  useEffect(() => {
    if (document.getElementById('pd-responsive-styles')) return
    const el = document.createElement('style')
    el.id = 'pd-responsive-styles'
    el.textContent = PD_RESPONSIVE_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('pd-responsive-styles')?.remove()
  }, [])

  // ✅ Tick 30s pou aktyalize currentTime
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])


  // ✅ FIX: itilize getHaitiNow ki bay ni `today` ni `currentTime` (HH:MM)
  const { today, currentTime } = getHaitiNow()
  const dueTimeEnd = plan.dueTimeEnd || '17:00'

  const allDates  = useMemo(() => getAllPaymentDates(plan), [plan])
  const payoutMap = useMemo(() => getPayoutDateMap(plan), [plan])
  const isDynamic = !!plan.dynamicPositions

  const todayWinPos = Object.entries(payoutMap).find(([, d]) => d === today)
  const todayWinner = todayWinPos ? plan.members?.find(m => m.position === Number(todayWinPos[0])) : null

  const activeMembers  = (plan.members || []).filter(m => m.status !== 'stopped')
  const totColl        = activeMembers.reduce((acc, m) => acc + allDates.filter(d => m.payments?.[d]).length * plan.amount, 0) || 0
  // ✅ FIX: dat "espere" sèlman si VRÈMAN an reta (pa konte jodi avan dueTimeEnd)
  const totExp         = activeMembers.reduce(
    (acc, m) => acc + allDates.filter(d => d < today || (d === today && currentTime > dueTimeEnd)).length * plan.amount,
    0,
  ) || 0
  const payout         = memberPayout(plan)
  const depoRezevTotal = useMemo(() => calcDepoRezev(plan, today), [plan, today])

  // ✅ FIX: pase currentTime nan computeMemberStatus pou respekte dueTimeEnd
  const blockedCount = (plan.members || []).filter(m => computeMemberStatus(m, plan, today, currentTime) === 'blocked').length
  const lateCount    = (plan.members || []).filter(m => computeMemberStatus(m, plan, today, currentTime) === 'late').length
  const stoppedCount = (plan.members || []).filter(m => m.status === 'stopped').length

  const displayMembers = useMemo(() => {
    return (plan.members || []).flatMap(m => {
      if (m.positions && Array.isArray(m.positions) && m.positions.length > 1) {
        return m.positions.map(pos => ({ ...m, position: pos, _virtualKey: `${m.id}-${pos}` }))
      }
      return [{ ...m, _virtualKey: `${m.id}-${m.position}` }]
    })
  }, [plan.members])

  const handleViewMember = (m) => {
    const slots = getMemberSlots(plan, m.phone)
    setView(m)
    setSlots(slots.length > 1 ? slots : null)
  }

  const isPlanClosed = plan.status === 'closed' || plan.status === 'finished'

  return (
    <div>
      {/* ─── HEAD ─── */}
      <div className="pd-head">
        <button onClick={onBack} className="pd-head-btn" aria-label="Retounen">
          <ArrowLeft size={16} />
        </button>
        <div className="pd-head-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2>{plan.name}</h2>
            <PlanStatusBadge status={plan.status || 'open'} />
            {isDynamic && (
              <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.15)', color: D.blue, padding: '2px 7px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <Zap size={8} /> Dinamik
              </span>
            )}
          </div>
          <p>{freqFullLabel(plan)} • {fmt(plan.amount)} HTG / moun</p>
        </div>
        <PrinterBtn printer={printer} />
        <ReceiptSizeBtn />
        <button onClick={onEditPlan} title="Modifye Plan" className="pd-head-btn">
          <Edit3 size={14} />
        </button>
        {!isPlanClosed && (
          <button onClick={onClosePlan} title="Fèmen Plan" className="pd-head-btn" style={{ borderColor: `${D.red}40`, background: D.redBg, color: D.red }}>
            <StopCircle size={14} />
          </button>
        )}
        {!isPlanClosed && (
          <button onClick={onAddMember} className="pd-head-btn-primary" style={{ boxShadow: '0 4px 14px rgba(201,168,76,0.25)' }}>
            <Plus size={13} /><span>Enskri</span>
          </button>
        )}
      </div>

      {/* ─── BANN POZISYON DINAMIK ─── */}
      <div style={{ background: isDynamic ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isDynamic ? `${D.blue}30` : D.borderSub}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: isDynamic ? D.blue : D.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isDynamic ? <Zap size={13} /> : <ZapOff size={13} />}
            Pozisyon Dinamik
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: D.muted }}>
            {isDynamic
              ? 'Plas yo pwovizwa — yo chanje selon pèfomans. Pi bonè ou peye, pi plis pwen, pi devan ou ale.'
              : 'Aktive pou pozisyon yo ajiste otomatikman selon pèfomans chak manm.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          {isDynamic && (
            <button onClick={() => onRecalculate(plan.id)}
              style={{ padding: '7px 11px', borderRadius: 8, border: `1px solid ${D.blue}40`, background: D.blueBg, color: D.blue, cursor: 'pointer', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} /> Rekalile
            </button>
          )}
          <button onClick={() => onToggleDynamic(plan.id)}
            style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: isDynamic ? D.blue : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: isDynamic ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
        </div>
      </div>

      {/* ─── AVÈTISMAN ─── */}
      {(blockedCount > 0 || lateCount > 0) && (
        <div style={{ background: D.redBg, border: `1px solid ${D.red}30`, borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
          <AlertTriangle size={14} style={{ color: D.red, flexShrink: 0 }} />
          <div style={{ flex: 1, color: D.muted }}>
            {blockedCount > 0 && <span style={{ color: D.red, fontWeight: 700 }}>{blockedCount} kont bloke</span>}
            {blockedCount > 0 && lateCount > 0 && <span> • </span>}
            {lateCount > 0 && <span style={{ color: D.orange, fontWeight: 700 }}>{lateCount} manm an reta</span>}
            {stoppedCount > 0 && <span style={{ color: D.muted }}> • {stoppedCount} kanpe</span>}
          </div>
        </div>
      )}

      {isPlanClosed && (
        <div style={{ background: 'rgba(231,76,60,0.08)', border: `1px solid ${D.red}30`, borderRadius: 12, padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <StopCircle size={15} style={{ color: D.red, flexShrink: 0 }} />
          <span style={{ color: D.red, fontWeight: 700 }}>Plan sa a fèmen.</span>
        </div>
      )}

      {/* ─── GAYAN JODI A ─── */}
      {todayWinner && (
        <div style={{ background: 'linear-gradient(135deg,rgba(39,174,96,0.15),rgba(201,168,76,0.08))', border: `1px solid ${D.green}40`, borderRadius: 14, padding: '13px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={20} color="#0a1222" />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: D.green, margin: '0 0 2px' }}>🎉 {todayWinner.name} ap touche jodi a!</p>
            <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
              Montan: <span style={{ color: D.gold, fontWeight: 700 }}>{fmt(todayWinner.isOwnerSlot ? ownerPayout(plan) : payout)} HTG</span>
              {todayWinner.permanentId && <span style={{ color: D.muted }}> • ID: {todayWinner.permanentId}</span>}
            </p>
          </div>
        </div>
      )}

      {/* ─── STATS ─── */}
      <div className="pd-stats">
        {[
          { label: 'Manm Aktif',    val: `${activeMembers.length}`,                                                                           color: D.blue   },
          { label: 'Kolekte Total', val: `${fmt(totColl)} HTG`,                                                                               color: D.green  },
          { label: 'Jodi a ✨',     val: `${fmt(activeMembers.reduce((a, m) => a + (m.payments?.[today] ? Number(plan.amount) : 0), 0))} HTG`, color: '#00d084'},
          { label: 'Rès Atann',     val: `${fmt(Math.max(0, totExp - totColl))} HTG`,                                                         color: D.red    },
          { label: 'Depo Rezèv 💰', val: `${fmt(depoRezevTotal)} HTG`,                                                                        color: D.teal   },
          { label: 'Manm Touche',   val: `${fmt(payout)} HTG`,                                                                                color: D.gold   },
        ].map(({ label, val, color }) => (
          <div key={label} className="pd-stats-card">
            <div className="pd-stats-label">{label}</div>
            <div className="pd-stats-val" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ─── TABS — Scroll orizontal otomatik sou mobil ─── */}
      <div className="pd-tabs">
        {[['members', '👥 Manm'], ['calendar', '📅 Kalandriye'], ['exchange', '🔄 Echanj'], ['regleman', '📜 Regleman'], ['cash', '💰 Kès']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className="pd-tab-btn" style={{
            border: `1px solid ${tab === t ? D.gold : D.borderSub}`,
            background: tab === t ? D.goldDim : 'transparent',
            color: tab === t ? D.gold : D.muted,
          }}>{l}</button>
        ))}
        <button onClick={onBlindDraw} disabled={isPlanClosed} className="pd-tab-shuffle" style={{ opacity: isPlanClosed ? 0.4 : 1 }}>
          <Shuffle size={13} /> Tiraj Avèg
        </button>
      </div>

      {/* ─── TAB: MANM ─── */}
      {tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

          {isDynamic && (
            <div style={{ background: 'rgba(59,130,246,0.06)', border: `1px solid ${D.blue}20`, borderRadius: 12, padding: '10px 14px', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: D.muted, marginBottom: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.blue, display: 'inline-block' }} /> Plas pwovizwa
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={9} color={D.green} /> Plas enchanjab
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={9} color={D.green} /> Skor monte
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingDown size={9} color={D.red} /> Skor desann
                </span>
              </div>
              <div style={{ borderTop: `1px solid ${D.blue}15`, paddingTop: 9 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 7px' }}>Echèl Pwen:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {SCORE_SCALE.map(({ label, pts, color }) => (
                    <span key={label} style={{ fontSize: 9, color, fontWeight: 700, background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 8, padding: '2px 7px', display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap' }}>
                      {label}
                      <span style={{ fontFamily: 'monospace', background: `${color}20`, borderRadius: 4, padding: '0 4px' }}>
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {plan.members?.length > 5 && (
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
              <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Chèche manm..."
                style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10, fontSize: 12, border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none', fontFamily: 'inherit', color: D.text, background: D.input, boxSizing: 'border-box' }} />
            </div>
          )}

          {!plan.members?.length ? (
            <div style={{ textAlign: 'center', padding: 40, color: D.muted }}>
              <Users size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0 }}>Pa gen manm. Enskri premye kliyan ou!</p>
            </div>
          ) : displayMembers
            .filter(m => {
              if (!memberSearch) return true
              const q = memberSearch.toLowerCase()
              return m.name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.permanentId?.toLowerCase().includes(q)
            })
            .map(m => {
              // ✅ FIX: totalDates = total rount plan an (pa sèlman pase)
              const totalDates = allDates.length
              const due        = allDates.filter(d => d <= today).length
              const paid       = allDates.filter(d => m.payments?.[d]).length
              // ✅ FIX: Rès HTG = sa ki rete pou peye jis fen sol la
              const rèsHTG     = Math.max(0, (totalDates - paid) * plan.amount)
              // ✅ FIX: Dat anreta = dat ki VRÈMAN an reta (respekte dueTimeEnd)
              //         — jodi avan dueTimeEnd pa konsidere anreta
              const overdueDates = allDates.filter(d =>
                isDateOverdue(d, today, currentTime, dueTimeEnd) && !m.payments?.[d]
              ).length

              const payoutDate = payoutMap[m.position]
              const isWin      = payoutDate === today
              const isOwn      = m.isOwnerSlot
              const fineTot    = Object.values(m.fines || {}).reduce((a, b) => a + Number(b), 0)
              const mStatus    = computeMemberStatus(m, plan, today, currentTime) // ✅ pase currentTime
              const isStopped  = m.status === 'stopped'
              // ✅ NOUVO: pozisyon enchanjab si touche/pre touche/hasWon
              const lockWindowDays = Number(plan.lockWindowDays ?? 2)
              const posLocked  = isDynamic && isPositionLocked(m, today, lockWindowDays)

              // ✅ FIX KRITIK: rekalkile breakdown LOKALMAN pou respekte dueTimeEnd.
              // Backend an ka ap voye `missing: -7` pou jodi a anvan fenèt peman fini —
              // sa kòrèk sa.
              const backendBreakdown = m.scoreBreakdown || null
              const localBreakdown   = computeLocalBreakdown(m, plan, today, currentTime, backendBreakdown)
              // Si pa gen okenn aktivite (pa peye anyen ANKÒ pa gen dat an reta),
              // pa montre badge skò — manm la poko gen istwa.
              const hasActivity = localBreakdown.count > 0
              const score       = hasActivity ? localBreakdown.total : null
              const breakdown   = hasActivity ? localBreakdown      : null

              return (
                <div key={m._virtualKey || m.id} className="pd-member-row" style={{
                  background: isStopped ? 'rgba(243,156,18,0.05)' : isOwn ? 'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))' : isWin ? 'linear-gradient(135deg,rgba(39,174,96,0.10),rgba(201,168,76,0.06))' : D.card,
                  border: `1px solid ${isStopped ? `${D.orange}30` : isOwn ? `${D.gold}50` : isWin ? `${D.green}40` : D.border}`,
                  opacity: isStopped ? 0.75 : 1,
                }}>
                  <div className="pd-member-row-inner">

                    <PosBadge member={m} plan={plan} dynamic={isDynamic} />

                    <div className="pd-member-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span className="pd-member-name" style={{ color: isStopped ? D.orange : isOwn ? D.gold : D.text }}>
                          {isOwn ? 'Pwopriyete Sol' : m.name}
                        </span>
                        {isWin && !isOwn && (
                          <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '1px 6px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>🏆</span>
                        )}
                      </div>

                      {isDynamic && !isOwn && score !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <ScoreDisplay score={score} inRecovery={breakdown?.inRecovery || false} />
                          <ScoreTooltip breakdown={breakdown} />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'clamp(10px, 2.7vw, 11px)', color: D.muted }}>{m.phone}</span>
                        {payoutDate && !isStopped && (
                          <span style={{ fontSize: 9, color: D.blue }}>🏆 {payoutDate.split('-').reverse().join('/')}</span>
                        )}
                      </div>
                    </div>

                    {/* ✅ FIX: paid/totalDates + rès HTG */}
                    <div className="pd-member-stats">
                      {isStopped ? (
                        <div style={{ fontSize: 10, color: D.orange, fontWeight: 700 }}>
                          {fmt(paid * plan.amount)} HTG<br />
                          <span style={{ fontSize: 9, color: D.muted }}>kontribiye</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'monospace', fontSize: 'clamp(10px, 2.8vw, 11px)', fontWeight: 700, color: paid >= totalDates ? D.green : rèsHTG > 0 ? D.orange : D.muted }}>
                            {paid}/{totalDates}
                          </div>
                          <div style={{ fontSize: 'clamp(9px, 2.5vw, 10px)', color: D.muted }}>{fmt(paid * plan.amount)} HTG</div>
                          {rèsHTG > 0 && (
                            <div style={{ fontSize: 'clamp(8px, 2.3vw, 9px)', color: D.red, fontWeight: 700 }}>
                              Rès: {fmt(rèsHTG)} HTG
                            </div>
                          )}
                          {fineTot > 0 && <div style={{ fontSize: 9, color: D.red }}>+{fmt(fineTot)} amand</div>}
                        </>
                      )}
                    </div>

                    <div className="pd-member-actions">
                      {!isStopped && plan.status !== 'finished' && (
                        <button onClick={() => setPay(m)} title="Make Peye" aria-label="Make Peye" className="pd-action-btn" style={{ background: D.greenBg, color: D.green }}>
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => handleViewMember(m)} title="Kont Vityèl" aria-label="Kont Vityèl" className="pd-action-btn" style={{ background: D.goldDim, color: D.gold }}>
                        <Eye size={14} />
                      </button>
                      {!m.hasWon && (
                        <button
                          onClick={() => setAction({ member: m, action: mStatus === 'blocked' ? 'unblock' : isStopped ? 'resume' : 'block' })}
                          title={mStatus === 'blocked' ? 'Debloke' : isStopped ? 'Reprann' : 'Bloke/Kanpe'}
                          aria-label={mStatus === 'blocked' ? 'Debloke' : isStopped ? 'Reprann' : 'Bloke'}
                          className="pd-action-btn"
                          style={{
                            background: mStatus === 'blocked' ? D.greenBg : isStopped ? D.blueBg : D.redBg,
                            color: mStatus === 'blocked' ? D.green : isStopped ? D.blue : D.red,
                          }}>
                          {mStatus === 'blocked' ? <Unlock size={13} /> : isStopped ? <UserCheck size={13} /> : <Lock size={13} />}
                        </button>
                      )}
                      {!isStopped && !m.hasWon && payoutDate && payoutDate <= today && (
                        <button onClick={() => setConfirmingPayout(m)} title="Konfime Touche" aria-label="Konfime Touche" className="pd-action-btn" style={{ background: 'rgba(201,168,76,0.2)', color: D.gold }}>
                          <Trophy size={13} />
                        </button>
                      )}

                      {!isStopped && !m.hasWon && !isOwn && !posLocked && (
                        <button
                          onClick={() => { setAdjustPos(m); setAdjustSteps(1) }}
                          title="Desann Pozisyon"
                          aria-label="Desann Pozisyon"
                          className="pd-action-btn"
                          style={{ background: 'rgba(59,130,246,0.12)', color: D.blue }}>
                          <TrendingDown size={13} />
                        </button>
                      )}
                      {!m.hasWon && !isOwn && posLocked && (
                        <span title="Pozisyon enchanjab — manm nan ap touche byento (skò ap toujou kalkile)"
                          style={{ fontSize: 9, background: 'rgba(34,197,94,0.12)', color: D.green, padding: '4px 8px', borderRadius: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                          <Lock size={9} /> Enchanjab
                        </span>
                      )}
                      {m.hasWon && (
                        <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '4px 8px', borderRadius: 10, fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                          🏆 Touche
                        </span>
                      )}
                    </div>

                    {adjustPos && (
  <Modal onClose={() => setAdjustPos(null)}
    title={`📉 Ajiste Pozisyon — ${adjustPos.name}`} width={420}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: D.blueBg, border: `1px solid ${D.blue}30`,
        borderRadius: 12, padding: '12px 16px', fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: D.muted }}>Pozisyon aktyèl:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.text }}>
            #{adjustPos.position}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: D.muted }}>Nouvo pozisyon:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, color: D.blue }}>
            #{adjustPos.position + adjustSteps}
          </span>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10, fontWeight: 700, color: D.muted,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          display: 'block', marginBottom: 8 }}>
          Konbyen plas pou desann?
        </label>
        <div style={{ display: 'flex', gap: 7 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setAdjustSteps(n)} style={{
              flex: 1, padding: '10px 0', borderRadius: 9, cursor: 'pointer',
              fontFamily: 'monospace', fontWeight: 800, fontSize: 15,
              border: `1.5px solid ${adjustSteps === n ? D.blue : D.borderSub}`,
              background: adjustSteps === n ? D.blueBg : 'transparent',
              color: adjustSteps === n ? D.blue : D.muted }}>
              -{n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10,
        padding: '10px 13px', fontSize: 11, color: D.muted, lineHeight: 1.7 }}>
        Manm ki ant <strong style={{ color: D.text }}>#{adjustPos.position + 1}</strong> ak{' '}
        <strong style={{ color: D.text }}>#{adjustPos.position + adjustSteps}</strong> yo
        ap <strong style={{ color: D.green }}>monte 1 plas</strong> chak.
        Skor ak kont vityèl <strong style={{ color: D.text }}>pa chanje</strong>.
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setAdjustPos(null)}
          style={{ flex: 1, padding: '12px', borderRadius: 10,
            border: `1px solid ${D.borderSub}`, background: 'transparent',
            color: D.muted, cursor: 'pointer', fontWeight: 700 }}>
          Anile
        </button>
        <button onClick={() => {
          onAdjustPosition(adjustPos.id, adjustSteps)
          setAdjustPos(null)
        }} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
          cursor: 'pointer', background: `linear-gradient(135deg,${D.blue},#1d4ed8)`,
          color: '#fff', fontWeight: 800, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <TrendingDown size={15} /> Konfime Ajisteman
        </button>
      </div>
    </div>
  </Modal>
)}
                  </div>

                  {/* ✅ FIX: Bar la jòn SÈLMAN si gen dat anreta (deja pase san peye)
                       — si moun nan peye pou jodi (oswa rete dat futur sèlman), bar la vèt */}
                  {totalDates > 0 && !isStopped && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (paid / totalDates) * 100)}%`,
                          background: paid >= totalDates
                            ? D.green
                            : (overdueDates > 0 ? D.gold : D.green),
                          borderRadius: 4,
                        }} />
                      </div>
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
        <div style={{ background: D.tealBg, border: `1px solid ${D.teal}25`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: D.teal, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={13} /> Regleman Sol la
            </p>
            <button onClick={onEditPlan} style={{ fontSize: 11, color: D.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={12} /> Modifye
            </button>
          </div>
          {plan.regleman ? (
            <p style={{ fontSize: 12, color: D.muted, margin: 0, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{plan.regleman}</p>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: D.muted }}>
              <FileText size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 12 }}>Pa gen regleman pou plan sa a.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}
      {payMember && (
        <ModalMarkPayment member={payMember} plan={plan} printer={printer}
          onClose={() => setPay(null)}
          onSave={(memberId, dates, timings, fines) => { onPaymentSaved(memberId, dates, timings, fines); setPay(null) }} />
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

      {confirmingPayout && (
        <Modal onClose={() => setConfirmingPayout(null)} title={`🏆 Konfime Touche — ${confirmingPayout.name}`} width={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: D.goldDim, border: `1px solid ${D.gold}40`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <Trophy size={32} style={{ color: D.gold, marginBottom: 8 }} />
              <p style={{ fontSize: 16, fontWeight: 900, color: D.gold, margin: '0 0 4px' }}>{confirmingPayout.name}</p>
              {confirmingPayout.permanentId && (
                <p style={{ fontSize: 10, color: D.muted, margin: '0 0 4px', fontFamily: 'monospace' }}>
                  ID: {confirmingPayout.permanentId}
                </p>
              )}
              <p style={{ fontSize: 13, color: D.green, fontWeight: 800, margin: 0 }}>{fmt(memberPayout(plan))} HTG</p>
            </div>
            <p style={{ fontSize: 12, color: D.muted, margin: 0, lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 13px' }}>
              Aksyon sa ap <strong style={{ color: D.text }}>mache manm sa kòm touche</strong>.
              {isDynamic && <span style={{ color: D.blue }}> Plas li ap <strong>enchanjab</strong> pou toujou.</span>}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmingPayout(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
              <button onClick={() => { onMemberAction(confirmingPayout.id, 'payout', ''); setConfirmingPayout(null) }}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Trophy size={15} /> Konfime Touche
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}