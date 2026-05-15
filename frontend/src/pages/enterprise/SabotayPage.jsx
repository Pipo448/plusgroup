// ─────────────────────────────────────────────────────────────
// SabotayPage.jsx — Paj prensipal Sabotay Sol
// (VERSION AK POZISYON DINAMIK)
// ✅ FIX: pase currentTime nan computeMemberStatus pou respekte dueTimeEnd
// ✅ RESPONSIVE: Optimize pou telefòn, tablet, ak òdinatè (clamp + media queries)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Wallet, Plus, Users, Trophy, CheckCircle,
  AlertTriangle, AlertCircle, RefreshCw, Loader, TrendingUp,
  Search, FileText, Zap,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

import {
  D, GLOBAL_STYLES, fmt, freqFullLabel,
  getAllPaymentDates, getPayoutDateMap,
  computeMemberStatus, memberPayout, ownerPayout,
  calcDepoRezev, apiFetch,
  getHaitiNow,
} from './sabotayUtils'

import {
  usePrinterState,
  ReceiptSizeBtn, PlanStatusBadge,
  ModalCreatePlan, ModalBlindDraw,
  ModalAddMember, ModalClosePlan,
  ModalMemberCredentials,
} from './sabotayComponents'

import PlanDetail from './PlanDetail'
import { useSabotayMutations } from './useSabotayMutations'

// ─────────────────────────────────────────────────────────────
// ✅ CSS RESPONSIVE — Mobile-first ak breakpoints pou tablet/desktop
// ─────────────────────────────────────────────────────────────
const RESPONSIVE_STYLES = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }

  /* ─── LAYOUT KONTENEUR ─── */
  .sabotay-root {
    min-height: 100vh;
    background: ${D.bg};
    padding: clamp(10px, 3vw, 16px) clamp(10px, 3vw, 16px) 80px;
    font-family: Inter, system-ui, sans-serif;
    color: ${D.text};
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* ─── HEADER ─── */
  .page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: clamp(8px, 2vw, 12px);
    flex-wrap: wrap;
  }
  .page-head-title h1 {
    color: ${D.gold};
    margin: 0;
    font-size: clamp(16px, 4.5vw, 20px);
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.2;
  }
  .page-head-title p {
    color: ${D.muted};
    margin: 3px 0 0;
    font-size: clamp(10px, 2.6vw, 12px);
  }
  .page-head-actions {
    display: flex;
    align-items: center;
    gap: clamp(6px, 1.5vw, 8px);
    flex-wrap: wrap;
  }
  .btn-printer, .btn-new-plan {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: clamp(8px, 2vw, 10px) clamp(11px, 2.5vw, 16px);
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-weight: 700;
    font-size: clamp(11px, 2.6vw, 13px);
    font-family: inherit;
    white-space: nowrap;
    min-height: 38px;
  }
  .btn-new-plan { font-weight: 800; }

  /* ─── STATS GRID ─── */
  .top-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: clamp(8px, 2vw, 10px);
    margin-bottom: 20px;
  }
  .stat-card {
    background: ${D.card};
    border: 1px solid ${D.border};
    border-radius: 13px;
    padding: clamp(11px, 2.6vw, 13px) clamp(12px, 2.8vw, 15px);
    display: flex;
    align-items: center;
    gap: clamp(9px, 2.2vw, 12px);
    min-width: 0;
  }
  .stat-icon {
    width: clamp(34px, 8vw, 38px);
    height: clamp(34px, 8vw, 38px);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .stat-val {
    font-family: monospace;
    font-weight: 900;
    font-size: clamp(12px, 3vw, 14px);
    word-break: break-word;
    line-height: 1.15;
  }
  .stat-label {
    font-size: clamp(9px, 2.3vw, 10px);
    color: ${D.muted};
    font-weight: 600;
    margin-top: 2px;
  }

  /* ─── SEARCH ─── */
  .search-wrap {
    position: relative;
    margin-bottom: 16px;
    max-width: 100%;
  }
  @media (min-width: 640px) {
    .search-wrap { max-width: 380px; }
  }
  .search-input {
    width: 100%;
    padding: 11px 12px 11px 36px;
    border-radius: 10px;
    font-size: clamp(12px, 3vw, 13px);
    border: 1.5px solid rgba(255,255,255,0.09);
    outline: none;
    font-family: inherit;
    color: ${D.text};
    background: ${D.input};
    box-sizing: border-box;
    min-height: 42px;
  }
  .search-input:focus { border-color: ${D.gold}80; }

  /* ─── PLAN CARD ─── */
  .plan-card {
    background: ${D.card};
    border: 1px solid ${D.border};
    border-radius: 14px;
    padding: clamp(12px, 3vw, 14px) clamp(13px, 3vw, 16px);
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .plan-card:active { transform: scale(0.985); }
  @media (hover: hover) {
    .plan-card:hover { border-color: ${D.gold}40; }
  }
  .plan-card-title {
    color: #fff;
    margin: 0;
    font-size: clamp(13px, 3.4vw, 14px);
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .plan-card-meta {
    color: ${D.muted};
    margin: 0;
    font-size: clamp(10px, 2.6vw, 11px);
    line-height: 1.5;
  }
  .plan-card-coll {
    font-family: monospace;
    font-weight: 900;
    font-size: clamp(11px, 3vw, 13px);
    color: ${D.green};
    text-align: right;
    white-space: nowrap;
  }

  /* ─── TI EKRAN (≤ 380px) ─── */
  @media (max-width: 380px) {
    .page-head-actions {
      width: 100%;
      justify-content: stretch;
    }
    .btn-new-plan {
      flex: 1;
      justify-content: center;
    }
    .printer-label-text { display: none; }
    .top-stats { grid-template-columns: 1fr 1fr; }
  }

  /* ─── TABLET (641-1024px) ─── */
  @media (min-width: 641px) and (max-width: 1024px) {
    .sabotay-root { max-width: 760px; }
  }
`

// ─────────────────────────────────────────────────────────────
export default function SabotayPage() {
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'sabotay-page-styles'
    el.textContent = GLOBAL_STYLES + RESPONSIVE_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('sabotay-page-styles')?.remove()
  }, [])

  // ✅ Tick chak 30s pou aktyalize `currentTime` san itilizatè rafrechi
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const { tenant }  = useAuthStore()
  const printer     = usePrinterState()

  const [selectedPlan,  setSelected]    = useState(null)
  const [showCreate,    setShowCreate]  = useState(false)
  const [editingPlan,   setEditing]     = useState(null)
  const [showAddMember, setAddMember]   = useState(false)
  const [showDraw,      setDraw]        = useState(false)
  const [showClosePlan, setClosePlan]   = useState(false)
  const [memberCreds,   setMemberCreds] = useState(null)
  const [search,        setSearch]      = useState('')

  // ─── Chaje Plans ─────────────────────────────────────────
  const { data: plans = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sabotay-plans'],
    queryFn: () => apiFetch('/sabotay/plans').then(r => {
      const result = r.plans || r.data || r
      return Array.isArray(result) ? result : []
    }),
    refetchInterval: 15000,
  })

  const activePlan = selectedPlan
    ? plans.find(p => p.id === selectedPlan.id) || selectedPlan
    : null

  // ─── Mutations ────────────────────────────────────────────
  const mutations = useSabotayMutations({
    activePlan, tenant, printer,
    onCreateDone: (plan) => { setShowCreate(false); setSelected(plan) },
    onEditDone:   () => { refetch(); setEditing(null) },
    onAddDone:    (saved, credentials) => {
      setAddMember(false)
      if (credentials) setMemberCreds({ member: saved, credentials })
    },
    onCloseDone: () => setClosePlan(false),
  })

  // ✅ FIX: itilize getHaitiNow ki bay ni today ni currentTime
  const { today, currentTime } = getHaitiNow()

  // ─── Stats Global ─────────────────────────────────────────
  const totalMembers    = plans.reduce((a, p) => a + (p.members?.length || 0), 0)
  const totalCollected  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => m.status !== 'stopped').reduce((b, m) => {
      const allD = getAllPaymentDates(p)
      return b + allD.filter(d => m.payments?.[d] && d <= today).length * p.amount
    }, 0), 0)
  const todayCollected  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => m.status !== 'stopped')
      .reduce((b, m) => b + (m.payments?.[today] ? Number(p.amount) : 0), 0), 0)
  const depoRezevGlobal = plans.reduce((a, p) => a + calcDepoRezev(p, today), 0)
  const activePlans     = plans.filter(p => p.status !== 'closed' && p.status !== 'finished').length

  // ✅ FIX: pase currentTime nan computeMemberStatus
  const globalWarnings  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => {
      const s = computeMemberStatus(m, p, today, currentTime)
      return s === 'blocked' || s === 'late'
    }).length, 0)

  const filtered = plans.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    freqFullLabel(p).toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader size={32} style={{ color: D.gold, animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div className="sabotay-root">

      {error && (
        <div style={{ background: D.redBg, border: `1px solid ${D.red}40`, borderRadius: 12, padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 15px)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 'clamp(11px, 2.8vw, 12px)', flexWrap: 'wrap' }}>
          <AlertCircle size={15} style={{ color: D.red, flexShrink: 0 }} />
          <span style={{ flex: 1, color: D.red, minWidth: 0 }}>{error.message}</span>
          <button onClick={() => refetch()} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${D.red}40`, background: 'transparent', color: D.red, cursor: 'pointer', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={11} /> Reyesye
          </button>
        </div>
      )}

      {/* ─── VUE DETAY ─── */}
      {activePlan ? (
        <PlanDetail
          plan={activePlan}
          printer={printer}
          onBack={() => setSelected(null)}
          onAddMember={() => setAddMember(true)}
          onBlindDraw={() => setDraw(true)}
          onEditPlan={() => setEditing(activePlan)}
          onClosePlan={() => setClosePlan(true)}
          onToggleDynamic={(planId) => mutations.toggleDynamic.mutate(planId)}
          onRecalculate={(planId) => mutations.recalculate.mutate(planId)}
          onMemberAction={(memberId, action, reason) =>
            mutations.memberAction.mutate({ planId: activePlan.id, memberId, action, reason })
          }
          onPaymentSaved={(memberId, dates, timings, fines) =>
            mutations.markPayment.mutate({ memberId, dates, timings, fines })
          }
          onAdjustPosition={(memberId, steps) =>
            mutations.adjustPosition.mutate({ planId: activePlan.id, memberId, steps })
          }
        />
      ) : (
        <>
          {/* PAGE HEAD */}
          <div className="page-head">
            <div className="page-head-title" style={{ minWidth: 0, flex: '1 1 auto' }}>
              <h1>
                <Wallet size={20} /> Sabotay Sol
              </h1>
              <p>Jesyon Sol — PlusGroup</p>
            </div>
            <div className="page-head-actions">
              <button
                onClick={printer.connected ? printer.disconnect : printer.connect}
                disabled={printer.connecting}
                className="btn-printer"
                aria-label="Printer"
                style={{
                  background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
                  color: printer.connected ? D.green : D.muted,
                }}
              >
                🖨️ <span className="printer-label-text">{printer.connected ? 'Printer OK' : 'Printer'}</span>
              </button>
              <ReceiptSizeBtn />
              <button
                onClick={() => setShowCreate(true)}
                className="btn-new-plan"
                style={{
                  background: D.goldBtn,
                  color: '#0a1222',
                  boxShadow: '0 4px 16px rgba(201,168,76,0.30)',
                }}
              >
                <Plus size={15} /> <span>Nouvo Plan</span>
              </button>
            </div>
          </div>

          {globalWarnings > 0 && (
            <div style={{ background: D.orangeBg, border: `1px solid ${D.orange}30`, borderRadius: 12, padding: 'clamp(9px, 2.4vw, 10px) clamp(12px, 3vw, 14px)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 'clamp(10px, 2.6vw, 11px)' }}>
              <AlertTriangle size={14} style={{ color: D.orange, flexShrink: 0 }} />
              <span style={{ color: D.orange, fontWeight: 700, minWidth: 0 }}>{globalWarnings} manm an reta oswa bloke nan tout plan yo.</span>
            </div>
          )}

          {/* STATS GLOBAL */}
          <div className="top-stats">
            {[
              { label: 'Plan Aktif',    val: activePlans,          color: D.gold,    bg: D.goldDim,              icon: <Wallet size={16} />      },
              { label: 'Total Manm',    val: totalMembers,         color: D.blue,    bg: D.blueBg,               icon: <Users size={16} />       },
              { label: 'Total Kolekte', val: fmt(totalCollected),  color: D.green,   bg: D.greenBg,              icon: <Trophy size={16} />      },
              { label: 'Jodi a ✨',      val: fmt(todayCollected),  color: '#00d084', bg: 'rgba(0,208,132,0.10)', icon: <CheckCircle size={16} /> },
              { label: 'Depo Rezèv 💰', val: fmt(depoRezevGlobal), color: D.teal,    bg: 'rgba(20,184,166,0.10)',icon: <TrendingUp size={16} />  },
            ].map(({ label, val, color, bg, icon }) => (
              <div key={label} className="stat-card">
                <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="stat-val" style={{ color }}>{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* RECHÈCH */}
          <div className="search-wrap">
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none', zIndex: 1 }} />
            <input
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chèche plan..."
            />
          </div>

          {/* LISTE PLAN */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'clamp(36px, 9vw, 48px) 0', color: D.muted }}>
              <Wallet size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 'clamp(13px, 3.4vw, 14px)' }}>Pa gen plan Sabotay pou kounye a.</p>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  marginTop: 14,
                  padding: 'clamp(10px, 2.4vw, 12px) clamp(18px, 4vw, 22px)',
                  borderRadius: 10,
                  border: 'none',
                  background: D.goldBtn,
                  color: '#0a1222',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 'clamp(12px, 3vw, 13px)',
                  minHeight: 42,
                }}
              >
                Kreye Premye Plan
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 10px)' }}>
              {filtered.map(plan => {
                const activeMbrs = (plan.members || []).filter(m => m.status !== 'stopped')
                const allD       = getAllPaymentDates(plan)
                const coll       = activeMbrs.reduce((a, m) => a + allD.filter(d => m.payments?.[d] && d <= today).length * plan.amount, 0) || 0
                const payMap     = getPayoutDateMap(plan)
                const todayWinE  = Object.entries(payMap).find(([, d]) => d === today)
                const winner     = todayWinE ? plan.members?.find(m => m.position === Number(todayWinE[0])) : null
                const payout     = memberPayout(plan)
                const planDepo   = calcDepoRezev(plan, today)
                const warnings   = (plan.members || []).filter(m => {
                  const s = computeMemberStatus(m, plan, today, currentTime)
                  return s === 'blocked' || s === 'late'
                }).length

                return (
                  <div key={plan.id} className="plan-card" onClick={() => setSelected(plan)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <h3 className="plan-card-title">{plan.name}</h3>
                          <PlanStatusBadge status={plan.status || 'open'} />
                          {plan.dynamicPositions && (
                            <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.15)', color: D.blue, padding: '2px 6px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                              <Zap size={8} /> Dinamik
                            </span>
                          )}
                          {warnings > 0 && (
                            <span style={{ fontSize: 9, background: D.redBg, color: D.red, padding: '2px 7px', borderRadius: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              ⚠️ {warnings}
                            </span>
                          )}
                        </div>
                        <p className="plan-card-meta">
                          {freqFullLabel(plan)} • <span style={{ color: D.gold, fontWeight: 700 }}>{fmt(plan.amount)} HTG</span>
                          {Number(plan.penalty) > 0 && <span style={{ color: D.red }}> • Amand {fmt(plan.penalty)}</span>}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 0 }}>
                        <div className="plan-card-coll">{fmt(coll)} HTG</div>
                        <div style={{ fontSize: 'clamp(9px, 2.4vw, 10px)', color: D.muted }}>kolekte</div>
                      </div>
                    </div>

                    {winner && (
                      <div style={{ background: D.greenBg, border: `1px solid ${D.green}30`, borderRadius: 9, padding: 'clamp(6px, 1.6vw, 7px) clamp(10px, 2.5vw, 12px)', marginBottom: 9, fontSize: 'clamp(10px, 2.7vw, 11px)', color: D.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Trophy size={12} style={{ flexShrink: 0 }} />
                        <span style={{ minWidth: 0 }}>{winner.name} ap touche jodi a — {fmt(winner.isOwnerSlot ? ownerPayout(plan) : payout)} HTG</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 'clamp(9px, 2.5vw, 10px)', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ color: D.muted }}>{activeMbrs.length} manm aktif • {allD.length} sik total</span>
                      <span style={{ color: plan.status === 'open' ? D.green : D.red, fontWeight: 700 }}>
                        {plan.status === 'open' ? '🟢 Ouvè' : '🔴 Fèmen'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 'clamp(10px, 2.6vw, 11px)', color: D.muted, flexWrap: 'wrap', gap: 6 }}>
                      <span>Payout: <strong style={{ color: D.gold }}>{fmt(payout)} HTG</strong></span>
                      {planDepo > 0 && <span style={{ color: D.teal, fontWeight: 700 }}>💰 Rezèv: {fmt(planDepo)} HTG</span>}
                      {plan.regleman && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: D.teal }}><FileText size={10} />Regleman</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── MODALS ─── */}
      {showCreate && (
        <ModalCreatePlan loading={mutations.createPlan.isPending}
          onClose={() => setShowCreate(false)}
          onSave={(data) => mutations.createPlan.mutate(data)} />
      )}
      {editingPlan && (
        <ModalCreatePlan initialData={editingPlan} loading={mutations.updatePlan.isPending}
          onClose={() => setEditing(null)}
          onSave={(data) => mutations.updatePlan.mutate({ id: editingPlan.id, ...data })} />
      )}
      {showAddMember && activePlan && (
        <ModalAddMember plan={activePlan} loading={mutations.addMember.isPending}
          onClose={() => setAddMember(false)}
          onSave={(data) => mutations.addMember.mutate(data)}
          onShowCreds={(data) => { setMemberCreds(data); setAddMember(false) }} />
      )}
      {showDraw && activePlan && (
        <ModalBlindDraw plan={activePlan} loading={mutations.blindDraw.isPending}
          onClose={() => setDraw(false)}
          onConfirm={(member) => mutations.blindDraw.mutate(member.id)} />
      )}
      {showClosePlan && activePlan && (
        <ModalClosePlan plan={activePlan} loading={mutations.closePlan.isPending}
          onClose={() => setClosePlan(false)}
          onConfirm={() => mutations.closePlan.mutate(activePlan.id)} />
      )}
      {memberCreds && (
        <ModalMemberCredentials
          member={memberCreds.member}
          credentials={memberCreds.credentials}
          positions={memberCreds.positions}
          payoutDates={memberCreds.payoutDates}
          onClose={() => setMemberCreds(null)} />
      )}
    </div>
  )
}