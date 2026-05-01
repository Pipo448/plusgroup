// ─────────────────────────────────────────────────────────────
// SabotayPage.jsx — Paj prensipal Sabotay Sol
// (VERSION AK POZISYON DINAMIK)
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
export default function SabotayPage() {
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = GLOBAL_STYLES + `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: 0.5; transform: scale(0.85); }
      }
    `
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const { tenant }  = useAuthStore()
  const printer     = usePrinterState()

  const [selectedPlan,  setSelected]   = useState(null)
  const [showCreate,    setShowCreate]  = useState(false)
  const [editingPlan,   setEditing]    = useState(null)
  const [showAddMember, setAddMember]  = useState(false)
  const [showDraw,      setDraw]       = useState(false)
  const [showClosePlan, setClosePlan]  = useState(false)
  const [memberCreds,   setMemberCreds] = useState(null)
  const [search,        setSearch]     = useState('')

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

  const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]

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
  const globalWarnings  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => {
      const s = computeMemberStatus(m, p, today)
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
    <div style={{ minHeight: '100vh', background: D.bg, padding: '16px 16px 80px', fontFamily: 'Inter,system-ui,sans-serif', color: D.text, maxWidth: 700, margin: '0 auto', boxSizing: 'border-box' }}>

      {error && (
        <div style={{ background: D.redBg, border: `1px solid ${D.red}40`, borderRadius: 12, padding: '11px 15px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <AlertCircle size={15} style={{ color: D.red, flexShrink: 0 }} />
          <span style={{ flex: 1, color: D.red }}>{error.message}</span>
          <button onClick={() => refetch()} style={{ padding: '5px 11px', borderRadius: 8, border: `1px solid ${D.red}40`, background: 'transparent', color: D.red, cursor: 'pointer', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
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
        />
      ) : (
        <>
          {/* PAGE HEAD */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
            <div>
              <h1 style={{ color: D.gold, margin: 0, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} /> Sabotay Sol
              </h1>
              <p style={{ color: D.muted, margin: '3px 0 0', fontSize: 12 }}>Jesyon Sol — PlusGroup</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)', color: printer.connected ? D.green : D.muted }}>
                🖨️ <span>{printer.connected ? 'Printer OK' : 'Printer'}</span>
              </button>
              <ReceiptSizeBtn />
              <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: D.goldBtn, color: '#0a1222', boxShadow: '0 4px 16px rgba(201,168,76,0.30)' }}>
                <Plus size={15} /> Nouvo Plan
              </button>
            </div>
          </div>

          {globalWarnings > 0 && (
            <div style={{ background: D.orangeBg, border: `1px solid ${D.orange}30`, borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
              <AlertTriangle size={14} style={{ color: D.orange, flexShrink: 0 }} />
              <span style={{ color: D.orange, fontWeight: 700 }}>{globalWarnings} manm an reta oswa bloke nan tout plan yo.</span>
            </div>
          )}

          {/* STATS GLOBAL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Plan Aktif',    val: activePlans,          color: D.gold,    bg: D.goldDim,              icon: <Wallet size={16} />      },
              { label: 'Total Manm',    val: totalMembers,         color: D.blue,    bg: D.blueBg,               icon: <Users size={16} />       },
              { label: 'Total Kolekte', val: fmt(totalCollected),  color: D.green,   bg: D.greenBg,              icon: <Trophy size={16} />      },
              { label: 'Jodi a ✨',      val: fmt(todayCollected),  color: '#00d084', bg: 'rgba(0,208,132,0.10)', icon: <CheckCircle size={16} /> },
              { label: 'Depo Rezèv 💰', val: fmt(depoRezevGlobal), color: D.teal,    bg: 'rgba(20,184,166,0.10)',icon: <TrendingUp size={16} />  },
            ].map(({ label, val, color, bg, icon }) => (
              <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 13, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color, wordBreak: 'break-word' }}>{val}</div>
                  <div style={{ fontSize: 10, color: D.muted, fontWeight: 600 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* RECHÈCH */}
          <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
            <input style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none', fontFamily: 'inherit', color: D.text, background: D.input, boxSizing: 'border-box' }}
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Chèche plan..." />
          </div>

          {/* LISTE PLAN */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: D.muted }}>
              <Wallet size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 14 }}>Pa gen plan Sabotay pou kounye a.</p>
              <button onClick={() => setShowCreate(true)} style={{ marginTop: 14, padding: '10px 20px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
                Kreye Premye Plan
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                  const s = computeMemberStatus(m, plan, today)
                  return s === 'blocked' || s === 'late'
                }).length

                return (
                  <div key={plan.id} onClick={() => setSelected(plan)} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                          <h3 style={{ color: '#fff', margin: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</h3>
                          <PlanStatusBadge status={plan.status || 'open'} />
                          {plan.dynamicPositions && (
                            <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.15)', color: D.blue, padding: '2px 6px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Zap size={8} /> Dinamik
                            </span>
                          )}
                          {warnings > 0 && <span style={{ fontSize: 9, background: D.redBg, color: D.red, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>⚠️ {warnings}</span>}
                        </div>
                        <p style={{ color: D.muted, margin: 0, fontSize: 11 }}>
                          {freqFullLabel(plan)} • <span style={{ color: D.gold, fontWeight: 700 }}>{fmt(plan.amount)} HTG</span>
                          {Number(plan.penalty) > 0 && <span style={{ color: D.red }}> • Amand {fmt(plan.penalty)}</span>}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: D.green }}>{fmt(coll)} HTG</div>
                        <div style={{ fontSize: 10, color: D.muted }}>kolekte</div>
                      </div>
                    </div>

                    {winner && (
                      <div style={{ background: D.greenBg, border: `1px solid ${D.green}30`, borderRadius: 9, padding: '6px 11px', marginBottom: 9, fontSize: 11, color: D.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Trophy size={12} /> {winner.name} ap touche jodi a — {fmt(winner.isOwnerSlot ? ownerPayout(plan) : payout)} HTG
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: D.muted }}>{activeMbrs.length} manm aktif • {allD.length} sik total</span>
                      <span style={{ fontSize: 10, color: plan.status === 'open' ? D.green : D.red, fontWeight: 700 }}>
                        {plan.status === 'open' ? '🟢 Ouvè' : '🔴 Fèmen'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: D.muted, flexWrap: 'wrap', gap: 4 }}>
                      <span>Payout: <strong style={{ color: D.gold }}>{fmt(payout)} HTG</strong></span>
                      {planDepo > 0 && <span style={{ color: D.teal, fontWeight: 700 }}>💰 Rezèv: {fmt(planDepo)} HTG</span>}
                      {plan.regleman && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: D.teal }}><FileText size={10} />Regleman</span>}
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
