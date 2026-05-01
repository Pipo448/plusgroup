// ─────────────────────────────────────────────────────────────
// PlanDetail.jsx — Detay yon Plan Sabotay Sol
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react'
import {
  Users, Plus, Eye, CheckCircle, ArrowLeft, Search,
  Trophy, AlertTriangle, Edit3, Lock, Unlock, UserCheck,
  FileText, Shuffle, StopCircle,
} from 'lucide-react'

import {
  D, fmt, freqFullLabel,
  getAllPaymentDates, getPayoutDate, getPayoutDateMap,
  computeMemberStatus, memberPayout, ownerPayout,
  hasOwnerSlot, getMemberSlots, calcDepoRezev,
} from './sabotayUtils'

import {
  usePrinterState,
  PrinterBtn, ReceiptSizeBtn, PlanStatusBadge,
  Modal,
  ModalMarkPayment, ModalMemberAction,
  PlanCalendar, MemberVirtualAccount,
  ExchangeTab, AdminCashTab,
} from './sabotayComponents'

// ─────────────────────────────────────────────────────────────
export default function PlanDetail({
  plan,
  onBack,
  onAddMember,
  onPaymentSaved,
  onBlindDraw,
  onEditPlan,
  onClosePlan,
  onMemberAction,
  printer,
}) {
  const [viewMember,       setView]    = useState(null)
  const [viewMemberSlots,  setSlots]   = useState(null)
  const [payMember,        setPay]     = useState(null)
  const [actionModal,      setAction]  = useState(null)
  const [confirmingPayout, setConfirmingPayout] = useState(null)
  const [tab,              setTab]     = useState('members')
  const [memberSearch,     setMemberSearch]     = useState('')

  useEffect(() => { setView(null); setSlots(null) }, [plan.regleman, plan.updatedAt, plan.id])

  const today    = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
  const allDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const payoutMap = useMemo(() => getPayoutDateMap(plan), [plan])

  const todayWinPos = Object.entries(payoutMap).find(([, d]) => d === today)
  const todayWinner = todayWinPos
    ? plan.members?.find(m => m.position === Number(todayWinPos[0]))
    : null

  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const totColl = activeMembers.reduce((acc, m) =>
    acc + allDates.filter(d => m.payments?.[d]).length * plan.amount, 0) || 0
  const totExp  = activeMembers.reduce((acc, m) =>
    acc + allDates.filter(d => d <= today).length * plan.amount, 0) || 0
  const payout  = memberPayout(plan)

  const depoRezevTotal = useMemo(() => calcDepoRezev(plan, today), [plan, today])

  const blockedCount = (plan.members || []).filter(m => computeMemberStatus(m, plan, today) === 'blocked').length
  const lateCount    = (plan.members || []).filter(m => computeMemberStatus(m, plan, today) === 'late').length
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ color: D.gold, margin: 0, fontSize: 17, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</h2>
            <PlanStatusBadge status={plan.status || 'open'} />
          </div>
          <p style={{ color: D.muted, margin: 0, fontSize: 11 }}>{freqFullLabel(plan)} • {fmt(plan.amount)} HTG / moun</p>
        </div>
        <PrinterBtn printer={printer} />
        <ReceiptSizeBtn />
        <button onClick={onEditPlan} title="Modifye Plan" style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Edit3 size={14} />
        </button>
        {!isPlanClosed && (
          <button onClick={onClosePlan} title="Fèmen Plan" style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${D.red}40`, background: D.redBg, color: D.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StopCircle size={14} />
          </button>
        )}
        {!isPlanClosed && (
          <button onClick={onAddMember} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <Plus size={13} /><span>Enskri</span>
          </button>
        )}
      </div>

      {/* ─── AVÈTISMAN ─── */}
      {(blockedCount > 0 || lateCount > 0) && (
        <div style={{ background: D.redBg, border: `1px solid ${D.red}30`, borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
          <AlertTriangle size={14} style={{ color: D.red, flexShrink: 0 }} />
          <div style={{ flex: 1, color: D.muted }}>
            {blockedCount > 0 && <span style={{ color: D.red, fontWeight: 700 }}>{blockedCount} kont bloke</span>}
            {blockedCount > 0 && lateCount > 0 && <span style={{ color: D.muted }}> • </span>}
            {lateCount > 0 && <span style={{ color: D.orange, fontWeight: 700 }}>{lateCount} manm an reta</span>}
            {stoppedCount > 0 && <span style={{ color: D.muted }}> • {stoppedCount} kanpe</span>}
          </div>
        </div>
      )}

      {isPlanClosed && (
        <div style={{ background: 'rgba(231,76,60,0.08)', border: `1px solid ${D.red}30`, borderRadius: 12, padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <StopCircle size={15} style={{ color: D.red, flexShrink: 0 }} />
          <span style={{ color: D.red, fontWeight: 700 }}>Plan sa a fèmen. Pa gen nouvo enskripsyon ki posib.</span>
        </div>
      )}

      {/* ─── GAYAN JODI A ─── */}
      {todayWinner && (
        <div style={{ background: 'linear-gradient(135deg,rgba(39,174,96,0.15),rgba(201,168,76,0.08))', border: `1px solid ${D.green}40`, borderRadius: 14, padding: '13px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={20} color="#0a1222" />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: D.green, margin: '0 0 2px' }}>🎉 {todayWinner.name} ap touche jodi a! (Plas #{todayWinner.position})</p>
            <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
              Montan: <span style={{ color: D.gold, fontWeight: 700 }}>{fmt(todayWinner.isOwnerSlot ? ownerPayout(plan) : payout)} HTG</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── STATS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 9, marginBottom: 16 }}>
        {[
          { label: 'Manm Aktif',    val: `${activeMembers.length}`,                                                                             color: D.blue  },
          { label: 'Kolekte Total', val: `${fmt(totColl)} HTG`,                                                                                  color: D.green },
          { label: 'Jodi a ✨',     val: `${fmt(activeMembers.reduce((a, m) => a + (m.payments?.[today] ? Number(plan.amount) : 0), 0))} HTG`,   color: '#00d084'},
          { label: 'Rès Atann',     val: `${fmt(Math.max(0, totExp - totColl))} HTG`,                                                           color: D.red   },
          { label: 'Depo Rezèv 💰', val: `${fmt(depoRezevTotal)} HTG`,                                                                          color: D.teal  },
          { label: 'Manm Touche',   val: `${fmt(payout)} HTG`,                                                                                  color: D.gold  },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '11px 13px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color, wordBreak: 'break-word' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ─── TABS ─── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['members', '👥 Manm'], ['calendar', '📅 Kalandriye'], ['exchange', '🔄 Echanj'], ['regleman', '📜 Regleman'], ['cash', '💰 Kès']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            border: `1px solid ${tab === t ? D.gold : D.borderSub}`,
            background: tab === t ? D.goldDim : 'transparent',
            color: tab === t ? D.gold : D.muted, transition: 'all 0.15s',
          }}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onBlindDraw} disabled={isPlanClosed} style={{
          padding: '8px 13px', borderRadius: 9, border: `1px solid ${D.blue}40`,
          background: D.blueBg, color: D.blue, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, opacity: isPlanClosed ? 0.4 : 1,
        }}>
          <Shuffle size={13} /> Tiraj Avèg
        </button>
      </div>

      {/* ─── TAB: MANM ─── */}
      {tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
              return m.name?.toLowerCase().includes(q) || m.phone?.includes(q)
            })
            .map(m => {
              const due        = allDates.filter(d => d <= today).length
              const paid       = allDates.filter(d => m.payments?.[d]).length
              const payoutDate = payoutMap[m.position]
              const isWin      = payoutDate === today
              const isOwn      = m.isOwnerSlot
              const fineTot    = Object.values(m.fines || {}).reduce((a, b) => a + Number(b), 0)
              const mStatus    = computeMemberStatus(m, plan, today)
              const isStopped  = m.status === 'stopped'

              return (
                <div key={m._virtualKey || m.id} style={{
                  background: isStopped ? 'rgba(243,156,18,0.05)' : isOwn ? 'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))' : isWin ? 'linear-gradient(135deg,rgba(39,174,96,0.10),rgba(201,168,76,0.06))' : D.card,
                  border: `1px solid ${isStopped ? `${D.orange}30` : isOwn ? `${D.gold}50` : isWin ? `${D.green}40` : D.border}`,
                  borderRadius: 12, padding: '11px 13px', opacity: isStopped ? 0.75 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {/* Badge pozisyon */}
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: isOwn ? D.goldBtn : D.goldDim, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: isOwn ? '#0a1222' : D.gold }}>
                        {isOwn ? '★' : `#${hasOwnerSlot(plan) ? m.position - 1 : m.position}`}
                      </span>
                    </div>
                    {/* Non + telefòn */}
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isStopped ? D.orange : isOwn ? D.gold : D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                          {isOwn ? 'Pwopriyete Sol' : m.name}
                        </span>
                        {isOwn && <span style={{ fontSize: 10, color: D.gold, opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>({m.name})</span>}
                        {isWin && !isOwn && <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '1px 6px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>🏆</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: D.muted }}>{m.phone}</span>
                        {payoutDate && !isStopped && <span style={{ fontSize: 9, color: D.blue }}>🏆 {payoutDate.split('-').reverse().join('/')}</span>}
                      </div>
                    </div>
                    {/* Peman / balans */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                      {isStopped ? (
                        <div style={{ fontSize: 10, color: D.orange, fontWeight: 700 }}>
                          {fmt(paid * plan.amount)} HTG<br />
                          <span style={{ fontSize: 9, color: D.muted }}>kontribiye</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: paid >= due ? D.green : due > 0 ? D.orange : D.muted }}>{paid}/{due}</div>
                          <div style={{ fontSize: 10, color: D.muted }}>{fmt(paid * plan.amount)}</div>
                          {fineTot > 0 && <div style={{ fontSize: 9, color: D.red }}>+{fmt(fineTot)} amand</div>}
                        </>
                      )}
                    </div>
                    {/* Bouton aksyon */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {!isStopped && plan.status !== 'finished' && (
                        <button onClick={() => setPay(m)} title="Mache Peye" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: D.greenBg, color: D.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => handleViewMember(m)} title="Kont Vityèl" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: D.goldDim, color: D.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={14} />
                      </button>
                      {!m.hasWon && (
                        <button onClick={() => setAction({ member: m, action: mStatus === 'blocked' ? 'unblock' : isStopped ? 'resume' : 'block' })}
                          title={mStatus === 'blocked' ? 'Debloke' : isStopped ? 'Reprann' : 'Bloke/Kanpe'}
                          style={{ width: 30, height: 30, borderRadius: 8, border: 'none',
                            background: mStatus === 'blocked' ? D.greenBg : isStopped ? D.blueBg : D.redBg,
                            color: mStatus === 'blocked' ? D.green : isStopped ? D.blue : D.red,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {mStatus === 'blocked' ? <Unlock size={13} /> : isStopped ? <UserCheck size={13} /> : <Lock size={13} />}
                        </button>
                      )}
                      {!isStopped && !m.hasWon && payoutDate && payoutDate <= today && (
                        <button onClick={() => setConfirmingPayout(m)} title="Konfime Touche" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(201,168,76,0.2)', color: D.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trophy size={13} />
                        </button>
                      )}
                      {m.hasWon && (
                        <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '2px 7px', borderRadius: 10, fontWeight: 800, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          🏆 Touche
                        </span>
                      )}
                    </div>
                  </div>
                  {due > 0 && !isStopped && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (paid / due) * 100)}%`, background: paid >= due ? D.green : D.gold, borderRadius: 4 }} />
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
          onSave={(memberId, dates, timings, fines) => {
            onPaymentSaved(memberId, dates, timings, fines)
            setPay(null)
          }} />
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
              <p style={{ fontSize: 13, color: D.green, fontWeight: 800, margin: 0 }}>{fmt(memberPayout(plan))} HTG</p>
            </div>
            <p style={{ fontSize: 12, color: D.muted, margin: 0, lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 13px' }}>
              Aksyon sa ap <strong style={{ color: D.text }}>mache manm sa kòm touche</strong>.
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
