// src/pages/sol/SolDashboardPage.jsx
// ─── Paj prensipal tableau de bord Sol ───────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, RefreshCw, Trophy, Key, Wallet, TrendingUp, CreditCard, Star, ChevronDown } from 'lucide-react'
import SolExchangeMarket from '../../components/SolExchangeMarket'

import {
  SOL_API, fmt, THEMES, getD, FREQ_LABELS,
  getPaymentDates, GLOBAL_STYLES,
} from './solDashboardUtils'

import {
  PayBadge, ScoreBadge, timingBadge,
  SolCalendar, PaymentCountdown, BlockingCountdown,
  PerformanceMessage, PerformanceSection, SolChat,
} from './SolDashboardComponents'

import { ModalChangePassword, ModalPayMobile } from './SolDashboardModals'

// ─────────────────────────────────────────────────────────────
export default function SolDashboardPage() {
  const navigate = useNavigate()
  const [data,           setData]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showChangePw,   setShowChangePw]   = useState(false)
  const [showPayModal,   setShowPayModal]   = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [tab,            setTab]            = useState('history')
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [theme,          setTheme]          = useState(() => localStorage.getItem('sol_theme') || 'dark')
  const D = getD(theme)

  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'sol-dashboard-styles'
    el.textContent = GLOBAL_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('sol-dashboard-styles')?.remove()
  }, [])

  const token = localStorage.getItem('sol_token')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const VAPID = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
    const urlBase64ToUint8Array = (b) => {
      const padding = '='.repeat((4 - b.length % 4) % 4)
      const base64 = (b + padding).replace(/-/g, '+').replace(/_/g, '/')
      return new Uint8Array([...window.atob(base64)].map(c => c.charCodeAt(0)))
    }
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) })
      if (token) await fetch(`${SOL_API}/api/sol/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subscription: sub }) }).catch(() => {})
    }).catch(e => console.warn('SW:', e.message))
  }, [token])

  const fetchData = useCallback(async () => {
    if (!token) { navigate('/app/sol/login'); return }
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/members/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { localStorage.removeItem('sol_token'); localStorage.removeItem('sol_member'); navigate('/app/sol/login'); return }
      const json = await res.json()
      setData(json)
      if (json.plans?.length && !selectedPlanId) setSelectedPlanId(json.plans[0].id)
    } catch { toast.error('Pa ka chaje done yo.') }
    finally { setLoading(false) }
  }, [token, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = () => {
    localStorage.removeItem('sol_token'); localStorage.removeItem('sol_member')
    navigate('/app/sol/login'); toast('Ou dekonekte', { icon: '👋' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bgGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 50, height: 50, border: `3px solid rgba(201,168,76,0.15)`, borderTopColor: D.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }} />
        <p style={{ color: D.muted, fontSize: 14, fontWeight: 500 }}>Ap chaje kont ou...</p>
      </div>
    </div>
  )

  if (!data) return null

  // ─── SIPÒ PLIZYÈ PLAN ────────────────────────────────────────
  // ✅ FIX: Nòmalize — backend retounen { plans: [{id, member, plan, tenant}] }
  //         oswa ansyen fòma { member, plan, tenant }
  const rawPlans = data.plans
    ? data.plans
    : data.plan
      ? [{ id: data.plan.id, member: data.member, plan: data.plan, tenant: data.tenant }]
      : []

  const plans = rawPlans.map(p => ({
    id:     p.id     || p.plan?.id,
    member: p.member || null,
    plan:   p.plan   || p,
    tenant: p.tenant || data.tenant,
  })).filter(p => p.plan && p.member)

  const tenant = data.tenant || plans[0]?.tenant
  if (!plans.length) return null

  const currentPlanData = plans.find(p => p.id === selectedPlanId) || plans[0]

  // ✅ FIX: plan = currentPlanData.plan — pa currentPlanData antye
  const plan   = currentPlanData.plan
  const member = currentPlanData.member

  if (!member || !plan) return null

  // ─── Kalkilasyon ─────────────────────────────────────────────
  const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]

  const allSlots = member.allSlots || [{ id: member.id, position: member.position, payments: member.payments, paymentTimings: member.paymentTimings }]

  // ✅ FIX: prefere activeMemberCount (reyèl) olye maxMembers
  const totalSlotCount = currentPlanData?.activeMemberCount
    || Math.max(
      plan?.maxMembers || 0,
      allSlots.reduce((max, s) => Math.max(max, s.position), 0)
    )

  const dates = getPaymentDates(plan.frequency, plan.createdAt || plan.startDate, totalSlotCount)

  // ✅ FIX: 3 varyab peman separe pou kalkil kòrèk
  const totalPaid     = dates.filter(d => member.payments?.[d]).length               // tout (+ futur earlyDepo)
  const totalPaidPast = dates.filter(d => d <= today && member.payments?.[d]).length  // sèlman pase
  const totalDue      = dates.filter(d => d <= today).length

  // ✅ FIX: Kontribisyon Total = tout kòb manm ba (+ futur earlyDepo)
  const amountContributed = totalPaid     * plan.amount * allSlots.length
  // ✅ FIX: Rès pou peye = sèlman dèt pase ki pa peye (pa konte futur)
  const amountPaidPast    = totalPaidPast * plan.amount * allSlots.length
  const amountDue         = totalDue      * plan.amount * allSlots.length

  const payoutDebaz   = (plan.amount * totalSlotCount) - (plan.feePerMember || plan.fee || 0)
  const memberBalance = Number(member.balance || 0)
  const payoutAjiste  = payoutDebaz + memberBalance

  // ✅ FIX: Progress = tout peman / total — 100% si tout peye (+ futur earlyDepo)
  const progress = totalSlotCount > 0 ? (totalPaid / totalSlotCount) * 100 : 0

  // ✅ FIX: Rès pou peye = sa ki rete pou peye jis fen sol la (total - tout peman fèt + futur)
  const totalToPayForSol = totalSlotCount * plan.amount * allSlots.length
  const restaPouPeye     = Math.max(0, totalToPayForSol - amountContributed)

  const isWinner = allSlots.some(slot => dates[slot.position - 1] === today)

  const timings   = Object.values(member.paymentTimings || {})
  const scoreData = timings.length ? (() => {
    const earlyDepo = timings.filter(t => t === 'earlyDepo').length
    const earlyDay  = timings.filter(t => t === 'earlyDay').length
    const early     = timings.filter(t => t === 'early').length
    const onTime    = timings.filter(t => t === 'onTime').length
    const late      = timings.filter(t => t === 'late' || t === 'lateWindow' || t === 'veryLate').length
    const total     = timings.length
    return {
      score:  Math.round(((earlyDepo * 3 + earlyDay * 2.5 + early * 2 + onTime) / (total * 3)) * 100),
      early:  earlyDepo + earlyDay + early,
      onTime, late,
    }
  })() : null

  const lastPaidDatePast = [...dates].filter(d => d <= today).reverse().find(d => member.payments?.[d]) || null
  const lastPaidDate     = [...dates].reverse().find(d => member.payments?.[d]) || null
  const nextUnpaidDate   = lastPaidDatePast
    ? dates.find(d => d > lastPaidDatePast && d <= today && !member.payments?.[d])
      || dates.find(d => d > today && !member.payments?.[d])
    : dates.find(d => !member.payments?.[d])

  const tenantName = tenant?.businessName || tenant?.name || 'Sòl Ou'
  const posStr     = allSlots.length > 1 ? allSlots.map(s => `#${s.position}`).join(' • ') : `Pozisyon #${member.position}`

  // ─── Seletè Plan (dropdown mobil) ────────────────────────────
  const PlanSelector = () => {
    if (plans.length <= 1) return null
    return (
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <button onClick={() => setShowPlanPicker(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', borderRadius: 14, border: `1px solid ${D.border}`, background: D.goldDim, color: D.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
          <span style={{ flex: 1, textAlign: 'left' }}>
            📋 {plan.name}
            <span style={{ marginLeft: 8, fontSize: 11, color: D.muted, fontWeight: 500 }}>
              {fmt(plan.amount)} HTG • {FREQ_LABELS[plan.frequency] || plan.frequency}
            </span>
          </span>
          <ChevronDown size={14} style={{ color: D.gold, transform: showPlanPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {showPlanPicker && (
          <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50, background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            {plans.map((p, i) => (
              <button key={p.id} onClick={() => { setSelectedPlanId(p.id); setShowPlanPicker(false); setTab('history') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', border: 'none', borderBottom: i < plans.length - 1 ? `1px solid ${D.borderSub}` : 'none', background: p.id === selectedPlanId ? D.goldDim : 'transparent', color: p.id === selectedPlanId ? D.gold : D.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>
                <span style={{ flex: 1 }}>{p.id === selectedPlanId ? '✓ ' : ''}{p.plan?.name || '—'}</span>
                <span style={{ fontSize: 11, color: D.muted }}>{fmt(p.plan?.amount || 0)} HTG</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Sidebar Content ──────────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        {tenant?.logoUrl
          ? <img src={tenant.logoUrl} style={{ height: 38, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} alt="logo" />
          : <div style={{ width: 38, height: 38, borderRadius: 10, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>🏦</div>}
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: D.text, lineHeight: 1.2 }}>{tenantName}</div>
          <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Kont Sabotay</div>
        </div>
      </div>

      {plans.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, paddingLeft: 4 }}>Plan Ou Yo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {plans.map(p => (
              <button key={p.id} onClick={() => { setSelectedPlanId(p.id); setTab('history') }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 11, border: p.id === selectedPlanId ? `1px solid ${D.border}` : '1px solid transparent', background: p.id === selectedPlanId ? D.goldDim : 'transparent', color: p.id === selectedPlanId ? D.gold : D.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, textAlign: 'left', width: '100%' }}>
                <span>{p.id === selectedPlanId ? '✓ ' : ''}{p.plan?.name || '—'}</span>
                <span style={{ fontSize: 10, color: D.muted }}>{fmt(p.plan?.amount || 0)} G</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: D.goldDim, border: `1px solid ${D.border}`, borderRadius: 16, padding: '18px', marginBottom: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: D.text, fontFamily: 'Syne, sans-serif', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
        <div style={{ fontSize: 11, color: D.muted, marginBottom: 10 }}>{member.phone}</div>
        <div style={{ fontSize: 11, color: D.gold, fontWeight: 600, lineHeight: 1.5 }}>{posStr}</div>
        {allSlots.length > 1 && <div style={{ fontSize: 10, color: D.muted, marginTop: 4 }}>{allSlots.length} men • {fmt(allSlots.length * plan.amount)} HTG/sik</div>}
        {plan.dueTime && <div style={{ fontSize: 10, color: D.muted, marginTop: 4 }}>⏰ Peye ant {plan.dueTime} — {plan.dueTimeEnd || '15:00'}</div>}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, paddingLeft: 14 }}>Menu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {[
          { id: 'history',  icon: <CreditCard size={15} />, label: 'Istwa Peman'  },
          { id: 'calendar', icon: <TrendingUp size={15} />, label: 'Kalandriye'   },
          { id: 'exchange', icon: <RefreshCw  size={15} />, label: 'Mache Echanj' },
        ].map(item => (
          <button key={item.id} className={`sol-nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        <button onClick={() => setShowPayModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.06)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit', width: '100%' }}>📱 Moncash / Natcash</button>
        <button onClick={() => setShowChangePw(true)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.06)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit', width: '100%' }}><Key size={13} /> Chanje Modpas</button>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit', width: '100%' }}><LogOut size={13} /> Dekonekte</button>
      </div>
    </>
  )

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="sol-root">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div className="sol-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tenant?.logoUrl
            ? <img src={tenant.logoUrl} style={{ height: 28, borderRadius: 7, objectFit: 'contain' }} alt="logo" />
            : <div style={{ width: 28, height: 28, borderRadius: 7, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🏦</div>}
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: D.text }}>{tenantName}</div>
            <div style={{ fontSize: 9, color: D.muted }}>Kont Sabotay</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={fetchData} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={13} /></button>
          <button onClick={handleLogout} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={13} /></button>
        </div>
      </div>

      <div className="sol-layout">
        <div className="sol-sidebar"><SidebarContent /></div>

        <div className="sol-main" style={{ animation: 'fadeUp 0.4s ease' }}>
          <PlanSelector />

          {/* ─── ALERTS ─── */}
          {isWinner && (
            <div className="sol-alert" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.14),rgba(201,168,76,0.09))', border: `1px solid ${D.green}40` }}>
              <div style={{ width: 52, height: 52, minWidth: 52, borderRadius: 16, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(201,168,76,0.3)' }}>
                <Trophy size={24} color="#0a0a00" />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: D.green, margin: '0 0 4px', fontFamily: 'Syne, sans-serif' }}>🎉 Se Jou Ou Jodi a!</p>
                <p style={{ fontSize: 13, color: D.mutedLt, margin: 0 }}>Ou ap touche: <span style={{ color: D.gold, fontWeight: 800 }}>{fmt(payoutAjiste)} HTG</span></p>
              </div>
            </div>
          )}

          {!isWinner && (() => {
            const neverPaid = !lastPaidDate
            if (neverPaid) return (
              <div className="sol-alert" style={{ background: D.blueBg, border: `1px solid ${D.blue}35` }}>
                <div style={{ color: D.blue, flexShrink: 0, fontSize: 22 }}>🔔</div>
                <div>
                  <p style={{ fontSize: 13, color: D.blue, fontWeight: 800, margin: '0 0 2px' }}>Ou poko fè premye peman ou!</p>
                  <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Premye dat: {nextUnpaidDate?.split('-').reverse().join('/')} • Peye ant {plan.dueTime || '10:00'} — {plan.dueTimeEnd || '15:00'}</p>
                </div>
              </div>
            )
            if (!nextUnpaidDate) return null
            const daysUntil = Math.ceil((new Date(nextUnpaidDate) - new Date(today)) / 86400000)
            const isOverdue = nextUnpaidDate < today
            if (isOverdue) return <BlockingCountdown nextUnpaidDate={nextUnpaidDate} plan={plan} lastPaidDate={lastPaidDate} />
            if (daysUntil > 3) return null
            return <PaymentCountdown nextUnpaidDate={nextUnpaidDate} plan={plan} daysUntil={daysUntil} />
          })()}

          {/* ─── HERO ─── */}
          <div className="sol-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Kont Sabotay Sòl</div>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 800, color: D.text, margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</h1>
                <div style={{ fontSize: 13, color: D.muted, marginBottom: 8 }}>{member.phone}</div>
                <div style={{ fontSize: 12, color: D.mutedLt, marginBottom: plan.dueTime ? 12 : 0 }}>{posStr} • {plan.name}</div>
                {plan.dueTime && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: D.goldDim, border: `1px solid ${D.border}`, borderRadius: 9, padding: '5px 12px', fontSize: 12, color: D.gold, fontWeight: 600 }}>
                    ⏰ Peye ant <strong>{plan.dueTime}</strong> — <strong>{plan.dueTimeEnd || '15:00'}</strong>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Kontribisyon Total</div>
                {/* ✅ FIX: amountContributed = tout peman (+ futur earlyDepo) */}
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 40, color: D.gold, lineHeight: 1, marginBottom: 6 }}>{fmt(amountContributed)}</div>
                <div style={{ fontSize: 13, color: D.muted }}>HTG • {totalPaid}/{totalSlotCount} peman</div>
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pwogrè Sòl la</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 15, color: D.gold }}>{Math.round(progress)}%</span>
              </div>
              <div className="sol-progress-track"><div className="sol-progress-fill" style={{ width: `${progress}%` }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 11, color: D.muted }}>
                {/* ✅ FIX: totalPaid (tout, + futur) */}
                <span>{totalPaid} peman fèt</span>
                <span>{totalSlotCount - totalPaid} rès</span>
              </div>
            </div>
          </div>

          {/* ─── STATS ─── */}
          <div className="sol-stats-grid">
            <div className="sol-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: D.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={15} style={{ color: D.red }} /></div>
                <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rès pou Peye</span>
              </div>
              {/* ✅ FIX: total sol - tout peman (+ earlyDepo) = sa ki rete vrèman */}
              <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 22, color: restaPouPeye === 0 ? D.green : D.red }}>{fmt(restaPouPeye)}</div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>HTG</div>
            </div>

            {allSlots.map(slot => {
              const isExchangedSlot = slot.position === (member.accountPosition ?? member.position)
              const slotPayout = isExchangedSlot ? payoutAjiste : payoutDebaz
              return (
                <div key={slot.position} className="sol-stat-card" style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={15} style={{ color: D.gold }} /></div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Men #{slot.position}</span>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 22, color: D.gold }}>{fmt(slotPayout)}</div>
                  <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>HTG • {dates[slot.position - 1]?.split('-').reverse().join('/') || '—'}</div>
                  {isExchangedSlot && memberBalance !== 0 && (
                    <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 8, background: memberBalance > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: memberBalance > 0 ? D.green : D.red }}>
                        {memberBalance > 0 ? '▲' : '▼'} {fmt(Math.abs(memberBalance))} HTG
                      </span>
                      <span style={{ fontSize: 10, color: D.muted }}>{memberBalance > 0 ? 'frè resevwa' : 'frè peye'}</span>
                    </div>
                  )}
                  {isExchangedSlot && memberBalance !== 0 && (
                    <div style={{ fontSize: 10, color: D.muted, marginTop: 3 }}>Debaz: {fmt(payoutDebaz)} HTG</div>
                  )}
                </div>
              )
            })}

            {allSlots.length > 1 && (
              <div className="sol-stat-card" style={{ borderColor: `${D.green}30`, background: 'rgba(34,197,94,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: D.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={15} style={{ color: D.green }} /></div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: D.green, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Ap Touche</span>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 22, color: D.green }}>{fmt(payoutDebaz * allSlots.length + memberBalance)}</div>
                <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>HTG total — {allSlots.length} men</div>
              </div>
            )}

            <div className="sol-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: D.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={15} style={{ color: D.blue }} /></div>
                <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frekans</span>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: D.text }}>{FREQ_LABELS[plan.frequency] || plan.frequency}</div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>{plan.name}</div>
            </div>
          </div>

          <PerformanceSection scoreData={scoreData} />
          <PerformanceMessage scoreData={scoreData} />

          {plan.regleman && (
            <div style={{ background: D.tealBg, border: `1px solid rgba(20,184,166,0.2)`, borderRadius: 20, padding: '22px 26px', marginBottom: 20 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, color: D.teal, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>📜 Regleman Sòl la</p>
              <p style={{ fontSize: 13, color: D.mutedLt, margin: 0, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{plan.regleman}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => { setTheme(key); localStorage.setItem('sol_theme', key) }}
                style={{ padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: 'none', background: theme === key ? t.accent : 'rgba(128,128,128,0.15)', color: theme === key ? '#fff' : D.muted, transition: 'all 0.2s' }}>
                {t.name}
              </button>
            ))}
          </div>

          <div className="sol-tabs">
            {[['history','📋 Istwa Peman'],['calendar','📅 Kalandriye'],['exchange','🔄 Mache'],['chat','💬 Chat']].map(([t, l]) => (
              <button key={t} className="sol-tab-btn" onClick={() => { setTab(t); if (t === 'chat') setUnreadCount(0) }}
                style={{ border: 'none', background: tab === t ? D.goldDim : 'transparent', color: tab === t ? D.gold : D.muted, fontFamily: 'inherit', position: 'relative' }}>
                {l}
                {t === 'chat' && unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'history' && (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 22, overflow: 'hidden' }}>
              <div style={{ padding: '20px 26px', borderBottom: `1px solid ${D.borderSub}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: D.text }}>Istwa Peman</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: D.muted, background: D.goldDim, padding: '3px 10px', borderRadius: 8 }}>{totalPaid}/{dates.length}</span>
              </div>
              <div className="sol-scroll" style={{ maxHeight: 460, overflowY: 'auto' }}>
                {dates.map((d, i) => {
                  const paid = !!member.payments?.[d], timing = member.paymentTimings?.[d]
                  const isPast = d <= today, isWin = allSlots.some(slot => i === slot.position - 1)
                  const montanDat = plan.amount * allSlots.length
                  return (
                    <div key={d} className="sol-pay-row" style={{ background: isWin ? 'rgba(201,168,76,0.06)' : d === today ? 'rgba(201,168,76,0.03)' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: isPast ? D.text : D.muted, flexShrink: 0, fontWeight: 500 }}>{d.split('-').reverse().join('/')}</span>
                        {isWin && <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '2px 8px', borderRadius: 8, fontWeight: 700, flexShrink: 0, border: `1px solid ${D.border}` }}>🏆 Touche</span>}
                        {d === today && !isWin && <span style={{ fontSize: 9, background: D.blueBg, color: D.blue, padding: '2px 8px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>Jodi</span>}
                        {paid && timingBadge(timing)}
                        {paid && allSlots.length > 1 && <span style={{ fontSize: 9, color: D.muted, flexShrink: 0 }}>{allSlots.length}×{fmt(plan.amount)}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: paid ? D.green : isPast ? D.red : D.muted, whiteSpace: 'nowrap' }}>
                          {paid ? `+${fmt(montanDat)}` : isPast ? `-${fmt(montanDat)}` : fmt(montanDat)} HTG
                        </span>
                        {isPast && <PayBadge paid={paid} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'calendar' && <SolCalendar dates={dates} member={member} plan={plan} today={today} allSlots={allSlots} />}
          {tab === 'exchange' && <SolExchangeMarket token={token} member={member} plan={plan} />}
          {tab === 'chat'     && <SolChat token={token} plan={plan} member={member} onNewMessage={(count) => tab !== 'chat' && setUnreadCount(p => p + count)} />}

          <div className="sol-mobile-actions">
            <button onClick={() => setShowPayModal(true)} style={{ padding: '15px', borderRadius: 15, border: '1px solid rgba(220,38,38,0.28)', background: 'rgba(220,38,38,0.07)', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>📱 Peye pa Moncash / Natcash</button>
            <button onClick={() => setShowChangePw(true)} style={{ padding: '15px', borderRadius: 15, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.06)', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}><Key size={14} /> Chanje Modpas</button>
          </div>
        </div>
      </div>

      {showPayModal && <ModalPayMobile onClose={() => setShowPayModal(false)} />}
      {showChangePw && <ModalChangePassword token={token} onClose={() => setShowChangePw(false)} />}
    </div>
  )
}