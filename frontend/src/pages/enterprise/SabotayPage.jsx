// ─────────────────────────────────────────────────────────────
// SabotayPage.jsx — Main Page + PlanDetail
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users, Plus, Wallet, Eye, CheckCircle,
  Settings, RefreshCw, Trophy, AlertCircle, ArrowLeft, Search,
  Printer, Star, Loader, Shuffle, FileText, Edit3, AlertTriangle,
  Lock, Unlock, UserCheck, TrendingUp,
  XCircle, StopCircle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

import {
  D, GLOBAL_STYLES, fmt, freqFullLabel,
  getAllPaymentDates, getPayoutDate, getPayoutDateMap,
  computeMemberStatus, memberPayout, ownerPayout,
  hasOwnerSlot, getMemberSlots, calcDepoRezev,
  apiFetch, SOL_API, API_URL,
} from './sabotayUtils'

import {
  usePrinterState,
  PrinterBtn, ReceiptSizeBtn, PlanStatusBadge, MemberStatusBadge, PayBadge,
  Modal,
  ModalCreatePlan, ModalBlindDraw, ModalMarkPayment,
  ModalMemberAction, ModalClosePlan, ModalAddMember,
  ModalMemberCredentials,
  PlanCalendar, MemberVirtualAccount,
  ExchangeTab, AdminCashTab,
} from './sabotayComponents'

// ─────────────────────────────────────────────────────────────
// PLAN DETAIL
// ─────────────────────────────────────────────────────────────
function PlanDetail({ plan, onBack, onAddMember, onPaymentSaved, onBlindDraw, onEditPlan, onClosePlan, onMemberAction, printer }) {
  const [viewMember,    setView]    = useState(null)
  const [viewMemberSlots, setSlots] = useState(null)
  const [payMember,     setPay]     = useState(null)
  const [actionModal,   setAction]  = useState(null)
  const [confirmingPayout, setConfirmingPayout] = useState(null)
  const [tab,           setTab]     = useState('members')
  const [memberSearch,  setMemberSearch] = useState('')

  useEffect(() => { setView(null); setSlots(null) }, [plan.regleman, plan.updatedAt, plan.id])

  const today    = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
  const allDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const payoutMap = useMemo(() => getPayoutDateMap(plan), [plan])

  const todayWinPos = Object.entries(payoutMap).find(([, d]) => d === today)
  const todayWinner = todayWinPos ? plan.members?.find(m => m.position === Number(todayWinPos[0])) : null

  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const totColl = activeMembers.reduce((acc, m) => acc + allDates.filter(d => m.payments?.[d]).length * plan.amount, 0) || 0
  const totExp  = activeMembers.reduce((acc, m) => acc + allDates.filter(d => d <= today).length * plan.amount, 0) || 0
  const payout  = memberPayout(plan)

  // ─── DEPO REZÈV TOTAL POU PLAN ───
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

  return (
    <div>
      {/* ─── HEAD ─── */}
      <div className="detail-head" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
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
        {plan.status !== 'closed' && plan.status !== 'finished' && (
          <button onClick={onClosePlan} title="Fèmen Plan" style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${D.red}40`, background: D.redBg, color: D.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StopCircle size={14} />
          </button>
        )}
        {plan.status !== 'closed' && plan.status !== 'finished' && (
          <button onClick={onAddMember} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <Plus size={13} /><span>Enskri</span>
          </button>
        )}
      </div>

      {/* Avètisman */}
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

      {(plan.status === 'closed' || plan.status === 'finished') && (
        <div style={{ background: 'rgba(231,76,60,0.08)', border: `1px solid ${D.red}30`, borderRadius: 12, padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <StopCircle size={15} style={{ color: D.red, flexShrink: 0 }} />
          <span style={{ color: D.red, fontWeight: 700 }}>Plan sa a fèmen. Pa gen nouvo enskripsyon ki posib.</span>
        </div>
      )}

      {/* Gayan jodi a */}
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

      {/* ─── STATS — DOUBLON RETIRE, DEPO REZÈV AJOUTE ─── */}
      <div className="detail-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 9, marginBottom: 16 }}>
        {[
          { label: 'Manm Aktif',    val: `${activeMembers.length}`,                                                               color: D.blue   },
          { label: 'Kolekte Total', val: `${fmt(totColl)} HTG`,                                                                   color: D.green  },
          { label: 'Jodi a ✨',     val: `${fmt(activeMembers.reduce((a, m) => a + (m.payments?.[today] ? Number(plan.amount) : 0), 0))} HTG`, color: '#00d084' },
          { label: 'Rès Atann',     val: `${fmt(Math.max(0, totExp - totColl))} HTG`,                                             color: D.red    },
          { label: 'Depo Rezèv 💰', val: `${fmt(depoRezevTotal)} HTG`,                                                           color: D.teal   },
          { label: 'Manm Touche',   val: `${fmt(payout)} HTG`,                                                                   color: D.gold   },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '11px 13px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color, wordBreak: 'break-word' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['members', '👥 Manm'], ['calendar', '📅 Kalandriye'], ['exchange', '🔄 Echanj'], ['regleman', '📜 Regleman'], ['cash', '💰 Kès']].map(([t, l]) => (
          <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            border: `1px solid ${tab === t ? D.gold : D.borderSub}`,
            background: tab === t ? D.goldDim : 'transparent',
            color: tab === t ? D.gold : D.muted, transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onBlindDraw} disabled={plan.status === 'closed' || plan.status === 'finished'} style={{
          padding: '8px 13px', borderRadius: 9, border: `1px solid ${D.blue}40`,
          background: D.blueBg, color: D.blue, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: (plan.status === 'closed' || plan.status === 'finished') ? 0.4 : 1 }}>
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
                style={{ ...{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none', fontFamily: 'inherit', color: D.text, background: D.input, boxSizing: 'border-box' }, paddingLeft: 32, fontSize: 12 }} />
            </div>
          )}

          {!plan.members?.length ? (
            <div style={{ textAlign: 'center', padding: 40, color: D.muted }}>
              <Users size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0 }}>Pa gen manm. Enskri premye kliyan ou!</p>
            </div>
          ) : displayMembers.filter(m => {
            if (!memberSearch) return true
            const q = memberSearch.toLowerCase()
            return m.name?.toLowerCase().includes(q) || m.phone?.includes(q)
          }).map(m => {
            const due = allDates.filter(d => d <= today).length
            const paid = allDates.filter(d => m.payments?.[d]).length
            const payoutDate = payoutMap[m.position]
            const isWin  = payoutDate === today
            const isOwn  = m.isOwnerSlot
            const fineTot = Object.values(m.fines || {}).reduce((a, b) => a + Number(b), 0)
            const mStatus = computeMemberStatus(m, plan, today)
            const isStopped = m.status === 'stopped'

            return (
              <div key={m._virtualKey || m.id} className="member-row" style={{
                background: isStopped ? 'rgba(243,156,18,0.05)' : isOwn ? 'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))' : isWin ? 'linear-gradient(135deg,rgba(39,174,96,0.10),rgba(201,168,76,0.06))' : D.card,
                border: `1px solid ${isStopped ? `${D.orange}30` : isOwn ? `${D.gold}50` : isWin ? `${D.green}40` : D.border}`,
                borderRadius: 12, padding: '11px 13px', opacity: isStopped ? 0.75 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div className="member-pos-badge" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: isOwn ? D.goldBtn : D.goldDim, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: isOwn ? '#0a1222' : D.gold }}>
                      {isOwn ? '★' : `#${hasOwnerSlot(plan) ? m.position - 1 : m.position}`}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 1 }}>
                      <span className="member-name" style={{ fontSize: 13, fontWeight: 700, color: isStopped ? D.orange : isOwn ? D.gold : D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                        {isOwn ? 'Pwopriyete Sol' : m.name}
                      </span>
                      {isOwn && <span style={{ fontSize: 10, color: D.gold, opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130, display: 'block' }}>({m.name})</span>}
                      {isWin && !isOwn && <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '1px 6px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>🏆</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="member-phone" style={{ fontSize: 11, color: D.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.phone}</span>
                      {payoutDate && !isStopped && <span style={{ fontSize: 9, color: D.blue }}>🏆 {payoutDate.split('-').reverse().join('/')}</span>}
                    </div>
                  </div>
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
                  <div className="member-btns" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
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

      {tab === 'calendar'  && <PlanCalendar plan={plan} />}
      {tab === 'exchange'  && <ExchangeTab plan={plan} />}
      {tab === 'cash'      && <AdminCashTab plan={plan} />}
      {tab === 'regleman'  && (
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
        <ModalMarkPayment member={payMember} plan={plan} onClose={() => setPay(null)} printer={printer}
          onSave={(memberId, dates, timings, fines) => { onPaymentSaved(memberId, dates, timings, fines); setPay(null) }} />
      )}

      {viewMember && (
        <MemberVirtualAccount member={viewMember} plan={plan} onClose={() => { setView(null); setSlots(null) }}
          printer={printer} allMemberSlots={viewMemberSlots} />
      )}

      {actionModal && (
        <ModalMemberAction member={actionModal.member} plan={plan} action={actionModal.action}
          onClose={() => setAction(null)} loading={false} printer={printer}
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

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function SabotayPage() {
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = GLOBAL_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const qc       = useQueryClient()
  const { tenant } = useAuthStore()
  const printer  = usePrinterState()

  const [selectedPlan,  setSelected]  = useState(null)
  const [showCreate,    setShowCreate] = useState(false)
  const [editingPlan,   setEditing]   = useState(null)
  const [showAddMember, setAddMember] = useState(false)
  const [showDraw,      setDraw]      = useState(false)
  const [showClosePlan, setClosePlan] = useState(false)
  const [search,        setSearch]    = useState('')
  const [memberCreds,   setMemberCreds] = useState(null)

  const { data: plans = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sabotay-plans'],
    queryFn: () => apiFetch('/sabotay/plans').then(r => {
      const result = r.plans || r.data || r
      return Array.isArray(result) ? result : []
    }),
    refetchInterval: 15000,
  })

  const activePlan = selectedPlan ? plans.find(p => p.id === selectedPlan.id) || selectedPlan : null

  const createPlan = useMutation({
    mutationFn: (data) => apiFetch('/sabotay/plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (r) => { qc.invalidateQueries(['sabotay-plans']); setShowCreate(false); toast.success('✅ Plan kreye!'); setSelected(r.plan || r) },
    onError: (e) => toast.error(e.message),
  })

  const updatePlan = useMutation({
    mutationFn: ({ id, ...data }) => apiFetch(`/sabotay/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries(['sabotay-plans']); refetch(); setEditing(null); toast.success('✅ Plan modifye!') },
    onError: (e) => toast.error(e.message),
  })

  const closePlan = useMutation({
    mutationFn: (id) => apiFetch(`/sabotay/plans/${id}/close`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries(['sabotay-plans']); setClosePlan(false); toast.success('✅ Plan fèmen!') },
    onError: (e) => toast.error(e.message),
  })

  const addMember = useMutation({
    mutationFn: async (data) => {
      const { _cb, ...body } = data
      const r = await apiFetch(`/sabotay/plans/${activePlan?.id}/members`, { method: 'POST', body: JSON.stringify(body) })
      const savedMember = r.member || r
      if (body.credentials && savedMember?.id) {
        try {
          const { token } = useAuthStore.getState()
          await fetch(`${SOL_API}/api/sol/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ memberId: savedMember.id, tenantId: tenant?.id, dueTime: activePlan?.dueTime || '08:00', credentials: body.credentials }),
          })
        } catch (err) { console.error('[SOL ACCOUNT CREATE]', err) }
      }
      return r
    },
    onSuccess: (r, vars) => {
      qc.invalidateQueries(['sabotay-plans'])
      const saved = r.member || r
      if (saved && activePlan) printer.print(activePlan, saved, [], tenant, 'kont')
      if (typeof vars._cb === 'function') vars._cb(saved)
      else setAddMember(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const markPayment = useMutation({
    mutationFn: ({ memberId, ...data }) => apiFetch(`/sabotay/plans/${activePlan?.id}/members/${memberId}/pay`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries(['sabotay-plans']); toast.success('✅ Peman anrejistre!') },
    onError: (e) => toast.error(e.message),
  })

  const memberAction = useMutation({
    mutationFn: ({ planId, memberId, action, reason }) => apiFetch(`/sabotay/plans/${planId}/members/${memberId}/action`, { method: 'POST', body: JSON.stringify({ action, reason }) }),
    onSuccess: (r, vars) => {
      qc.invalidateQueries(['sabotay-plans'])
      const labels = { block: '🔒 Bloke!', unblock: '🔓 Debloke!', stop: '⏸️ Kanpe!', resume: '▶️ Reprann!' }
      toast.success(labels[vars.action] || '✅ Fèt!')
    },
    onError: (e) => toast.error(e.message),
  })

  const blindDraw = useMutation({
    mutationFn: (memberId) => apiFetch(`/sabotay/plans/${activePlan?.id}/blind-draw`, { method: 'POST', body: JSON.stringify({ memberId }) }),
    onSuccess: (r) => {
      qc.invalidateQueries(['sabotay-plans']); setDraw(false)
      toast.success(`🏆 ${r.member?.name || 'Manm'} chwazi pa tiraj!`)
      if (activePlan) printer.print(activePlan, r.member || {}, [], tenant, 'tirage')
    },
    onError: (e) => toast.error(e.message),
  })

  const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]

  // ─── STATS GLOBAL ───
  const totalMembers   = plans.reduce((a, p) => a + (p.members?.length || 0), 0)
  const totalCollected = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => m.status !== 'stopped').reduce((b, m) => {
      const allD = getAllPaymentDates(p)
      return b + allD.filter(d => m.payments?.[d] && d <= today).length * p.amount
    }, 0), 0)
  const todayCollected = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => m.status !== 'stopped')
      .reduce((b, m) => b + (m.payments?.[today] ? Number(p.amount) : 0), 0), 0)

  // ─── DEPO REZÈV GLOBAL ───
  const depoRezevGlobal = plans.reduce((a, p) => a + calcDepoRezev(p, today), 0)

  const activePlans = plans.filter(p => p.status !== 'closed' && p.status !== 'finished').length
  const globalWarnings = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => { const s = computeMemberStatus(m, p, today); return s === 'blocked' || s === 'late' }).length, 0)

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
        <div className="error-banner" style={{ background: D.redBg, border: `1px solid ${D.red}40`, borderRadius: 12, padding: '11px 15px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <AlertCircle size={15} style={{ color: D.red, flexShrink: 0 }} />
          <span style={{ flex: 1, color: D.red }}>{error.message}</span>
          <button onClick={() => refetch()} style={{ padding: '5px 11px', borderRadius: 8, border: `1px solid ${D.red}40`, background: 'transparent', color: D.red, cursor: 'pointer', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <RefreshCw size={11} /> Reyesye
          </button>
        </div>
      )}

      {activePlan ? (
        <PlanDetail
          plan={activePlan}
          printer={printer}
          onBack={() => setSelected(null)}
          onAddMember={() => setAddMember(true)}
          onBlindDraw={() => setDraw(true)}
          onEditPlan={() => setEditing(activePlan)}
          onClosePlan={() => setClosePlan(true)}
          onMemberAction={(memberId, action, reason) => memberAction.mutate({ planId: activePlan.id, memberId, action, reason })}
          onPaymentSaved={(memberId, dates, timings, fines) => markPayment.mutate({ memberId, dates, timings, fines })}
        />
      ) : (
        <>
          {/* PAGE HEAD */}
          <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
            <div>
              <h1 style={{ color: D.gold, margin: 0, fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} /> Sabotay Sol
              </h1>
              <p style={{ color: D.muted, margin: '3px 0 0', fontSize: 12 }}>Jesyon Sol — PlusGroup</p>
            </div>
            <div className="page-head-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)', color: printer.connected ? D.green : D.muted }}>
                {printer.connecting ? <span style={{ width: 13, height: 13, border: `2px solid ${D.muted}40`, borderTopColor: D.muted, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : printer.connected ? '🖨️' : '🖨️'}
                <span className="printer-label">{printer.connected ? 'Printer OK' : 'Printer'}</span>
              </button>
              <ReceiptSizeBtn />
              <button className="btn-new-plan" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: D.goldBtn, color: '#0a1222', boxShadow: '0 4px 16px rgba(201,168,76,0.30)' }}>
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

          {/* ─── TOP STATS — ak Depo Rezèv Global ─── */}
          <div className="top-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Plan Aktif',     val: activePlans,            color: D.gold,    bg: D.goldDim,                       icon: <Wallet size={16} /> },
              { label: 'Total Manm',    val: totalMembers,            color: D.blue,    bg: D.blueBg,                        icon: <Users size={16} /> },
              { label: 'Total Kolekte', val: fmt(totalCollected),     color: D.green,   bg: D.greenBg,                       icon: <Trophy size={16} /> },
              { label: 'Jodi a ✨',      val: fmt(todayCollected),     color: '#00d084', bg: 'rgba(0,208,132,0.10)',           icon: <CheckCircle size={16} /> },
              { label: 'Depo Rezèv 💰', val: fmt(depoRezevGlobal),   color: D.teal,    bg: 'rgba(20,184,166,0.10)',          icon: <TrendingUp size={16} /> },
            ].map(({ label, val, color, bg, icon }) => (
              <div key={label} className="stat-card" style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 13, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="stat-icon" style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="stat-val" style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color, wordBreak: 'break-word' }}>{val}</div>
                  <div style={{ fontSize: 10, color: D.muted, fontWeight: 600 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* SEARCH */}
          <div className="search-wrap" style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
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
                const allD = getAllPaymentDates(plan)
                const coll = activeMbrs.reduce((a, m) => a + allD.filter(d => m.payments?.[d] && d <= today).length * plan.amount, 0) || 0
                const payMap = getPayoutDateMap(plan)
                const todayWinE = Object.entries(payMap).find(([, d]) => d === today)
                const winner = todayWinE ? plan.members?.find(m => m.position === Number(todayWinE[0])) : null
                const payout = memberPayout(plan)
                const planDepo = calcDepoRezev(plan, today)
                const warnings = (plan.members || []).filter(m => { const s = computeMemberStatus(m, plan, today); return s === 'blocked' || s === 'late' }).length

                return (
                  <div key={plan.id} className="plan-card" onClick={() => setSelected(plan)} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                          <h3 style={{ color: '#fff', margin: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</h3>
                          <PlanStatusBadge status={plan.status || 'open'} />
                          {warnings > 0 && <span style={{ fontSize: 9, background: D.redBg, color: D.red, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>⚠️ {warnings}</span>}
                        </div>
                        <p style={{ color: D.muted, margin: 0, fontSize: 11 }}>
                          {freqFullLabel(plan)} • <span style={{ color: D.gold, fontWeight: 700 }}>{fmt(plan.amount)} HTG</span>
                          {Number(plan.penalty) > 0 && <span style={{ color: D.red }}> • Amand {fmt(plan.penalty)}</span>}
                          {Number(plan.warningDelayDays) > 0 && <span style={{ color: D.orange }}> • ⚠️ {plan.warningDelayDays}j reta</span>}
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
                      <span style={{ fontSize: 10, color: plan.status === 'open' ? D.green : D.red, fontWeight: 700 }}>{plan.status === 'open' ? '🟢 Ouvè' : '🔴 Fèmen'}</span>
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

      {/* ─── MODALS GLOBAL ─── */}
      {showCreate && <ModalCreatePlan onClose={() => setShowCreate(false)} loading={createPlan.isPending} onSave={(data) => createPlan.mutate(data)} />}
      {editingPlan && <ModalCreatePlan initialData={editingPlan} onClose={() => setEditing(null)} loading={updatePlan.isPending} onSave={(data) => updatePlan.mutate({ id: editingPlan.id, ...data })} />}
      {showAddMember && activePlan && (
        <ModalAddMember plan={activePlan} onClose={() => setAddMember(false)} loading={addMember.isPending}
          onSave={(data) => addMember.mutate(data)}
          onShowCreds={(data) => { setMemberCreds(data); setAddMember(false) }} />
      )}
      {showDraw && activePlan && (
        <ModalBlindDraw plan={activePlan} onClose={() => setDraw(false)} loading={blindDraw.isPending}
          onConfirm={(member) => blindDraw.mutate(member.id)} />
      )}
      {showClosePlan && activePlan && (
        <ModalClosePlan plan={activePlan} onClose={() => setClosePlan(false)} loading={closePlan.isPending}
          onConfirm={() => closePlan.mutate(activePlan.id)} />
      )}
      {memberCreds && (
        <ModalMemberCredentials member={memberCreds.member} credentials={memberCreds.credentials}
          positions={memberCreds.positions} payoutDates={memberCreds.payoutDates}
          onClose={() => setMemberCreds(null)} />
      )}
    </div>
  )
}
