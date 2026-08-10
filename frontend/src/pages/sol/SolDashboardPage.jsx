// src/pages/sol/SolDashboardPage.jsx
// ─── Paj prensipal tableau de bord Sol ───────────────────────
// FIX #310: Tout hooks deplase AVAN early returns
// FIX TIMING: dat jodi pa "anreta" avan dueTimeEnd
// OPTIM: useMemo / useCallback / tick interval pou tan reyèl
// MOBIL: clamp(), padding adaptatif, breakpoint sou layout

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LogOut, RefreshCw, Trophy, Key, Wallet,
  TrendingUp, CreditCard, Star, ChevronDown,
} from 'lucide-react'
import SolExchangeMarket from '../../components/SolExchangeMarket'

// ✅ NOUVO: badge "Sabotay Inove" (menm grafik + flèch ak paj login la)
function BrandIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect x="4"  y="20" width="5" height="12" rx="1.4" fill="#2563EB" />
      <rect x="12" y="13" width="5" height="19" rx="1.4" fill="#60A5FA" />
      <rect x="20" y="7"  width="5" height="25" rx="1.4" fill="#93C5FD" />
      <path d="M5 23 L15 16 L23 10 L31 4" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M23 4 L31 4 L31 12" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

import {
  SOL_API, fmt, THEMES, getD, FREQ_LABELS,
  getPaymentDates, GLOBAL_STYLES,
} from './solDashboardUtils'

import {
  PayBadge, ScoreBadge, timingBadge,
  SolCalendar, PaymentCountdown, BlockingCountdown,
  PerformanceMessage, PerformanceSection, SolChat, DeclaredPayoutBanner,
} from './SolDashboardComponents'

import { ModalChangePassword, ModalPayMobile } from './SolDashboardModals'

// ═════════════════════════════════════════════════════════════
export default function SolDashboardPage() {
  const navigate = useNavigate()

  // ─── STATE ──────────────────────────────────────────────────
  const [data,           setData]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showChangePw,   setShowChangePw]   = useState(false)
  const [showPayModal,   setShowPayModal]   = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [tab,            setTab]            = useState('history')
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [theme,          setTheme]          = useState(() => localStorage.getItem('sol_theme') || 'dark')
  const [, setTick]                         = useState(0) // pou re-render chak 30s — mete tan ajou

  const D     = getD(theme)
  const token = localStorage.getItem('sol_token')

  // ─── EFFECTS ────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'sol-dashboard-styles'
    el.textContent = GLOBAL_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('sol-dashboard-styles')?.remove()
  }, [])

  // 🔄 Tick chak 30s — fè `today` ak `currentTime` aktyalize otomatikman
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // 🔔 Push notifications
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const VAPID = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
    const urlBase64ToUint8Array = (b) => {
      const padding = '='.repeat((4 - b.length % 4) % 4)
      const base64  = (b + padding).replace(/-/g, '+').replace(/_/g, '/')
      return new Uint8Array([...window.atob(base64)].map(c => c.charCodeAt(0)))
    }
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      })
      if (token) await fetch(`${SOL_API}/api/sol/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subscription: sub }),
      }).catch(() => {})
    }).catch(e => console.warn('SW:', e.message))
  }, [token])

  // ─── DATA FETCH ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) { navigate('/app/sol/login'); return }
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/members/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('sol_token')
        localStorage.removeItem('sol_member')
        navigate('/app/sol/login')
        return
      }
      const json = await res.json()
      setData(json)
      // ✅ Functional update — pa gen depandans sou selectedPlanId, evite enfini lòp
      setSelectedPlanId(prev => prev || json.plans?.[0]?.id || null)
    } catch { toast.error('Pa ka chaje done yo.') }
    finally { setLoading(false) }
  }, [token, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── DATA NORMALIZATION (memoized, null-safe) ──────────────
  const plans = useMemo(() => {
    if (!data) return []
    const rawPlans = data.plans
      ? data.plans
      : data.plan
        ? [{ id: data.plan.id, member: data.member, plan: data.plan, tenant: data.tenant }]
        : []
    return rawPlans.map(p => ({
      id:     p.id     || p.plan?.id,
      member: p.member || null,
      plan:   p.plan   || p,
      tenant: p.tenant || data.tenant,
    })).filter(p => p.plan && p.member)
  }, [data])

  const tenant          = data?.tenant || plans[0]?.tenant || null
  const currentPlanData = plans.find(p => p.id === selectedPlanId) || plans[0] || null
  const plan            = currentPlanData?.plan   || null
  const member          = currentPlanData?.member || null

  // ─── LÈ AYITI (rekalkile chak render — tick fòse l chak 30s) ─
  const nowHaiti       = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const today          = nowHaiti.toISOString().split('T')[0]
  const currentTime    = `${String(nowHaiti.getUTCHours()).padStart(2,'0')}:${String(nowHaiti.getUTCMinutes()).padStart(2,'0')}`
  const planDueTimeEnd = plan?.dueTimeEnd || '17:00'

  // ✅ FIX: yon dat anreta sèlman si:
  //   • li avan jodi, OUBYEN
  //   • se jodi epi lè a depase fenèt peman (`dueTimeEnd`)
  const isDateOverdue = useCallback((d) => {
    if (d < today) return true
    if (d === today) return currentTime > planDueTimeEnd
    return false
  }, [today, currentTime, planDueTimeEnd])

  // ─── KALKILASYON (tout memoized — null-safe) ────────────────
  const allSlots = useMemo(() => {
    if (!member) return []
    return member.allSlots || [{
      id:                 member.id,
      position:           member.position,
      payments:           member.payments,
      paymentTimings:     member.paymentTimings,
      declaredPayoutDate: member.declaredPayoutDate || null,
    }]
  }, [member])

  const totalSlotCount = useMemo(() => {
    if (!plan && !currentPlanData) return 0
    return Math.max(
      currentPlanData?.activeMemberCount || 0,
      currentPlanData?.totalMemberCount  || 0,
      plan?.maxMembers                   || 0,
      allSlots.reduce((max, s) => Math.max(max, s.position || 0), 0),
    )
  }, [plan, currentPlanData, allSlots])

  const dates = useMemo(() => {
    if (!plan || !totalSlotCount) return []
    return getPaymentDates(plan.frequency, plan.createdAt || plan.startDate, totalSlotCount)
  }, [plan, totalSlotCount])

  const totalPaid = useMemo(
    () => dates.filter(d => member?.payments?.[d]).length,
    [dates, member],
  )

  const totalPaidPast = useMemo(
    () => dates.filter(d => isDateOverdue(d) && member?.payments?.[d]).length,
    [dates, isDateOverdue, member],
  )

  const totalDue = useMemo(
    () => dates.filter(d => isDateOverdue(d)).length,
    [dates, isDateOverdue],
  )

  const scoreData = useMemo(() => {
    if (!member) return null
    const timings = Object.values(member.paymentTimings || {})
    if (!timings.length) return null
    const earlyDepo = timings.filter(t => t === 'earlyDepo').length
    const earlyDay  = timings.filter(t => t === 'earlyDay').length
    const early     = timings.filter(t => t === 'early').length
    const onTime    = timings.filter(t => t === 'onTime').length
    const late      = timings.filter(t => t === 'late' || t === 'lateWindow' || t === 'veryLate').length
    const total     = timings.length
    return {
      score:  Math.round(((earlyDepo * 3 + earlyDay * 2.5 + early * 2 + onTime) / (total * 3)) * 100),
      early:  earlyDepo + earlyDay + early,
      onTime,
      late,
    }
  }, [member])

  const lastPaidDatePast = useMemo(() => {
    if (!member?.payments) return null
    return [...dates].filter(d => isDateOverdue(d)).reverse().find(d => member.payments[d]) || null
  }, [dates, isDateOverdue, member])

  const lastPaidDate = useMemo(() => {
    if (!member?.payments) return null
    return [...dates].reverse().find(d => member.payments[d]) || null
  }, [dates, member])

  const nextUnpaidDate = useMemo(() => {
    if (!member) return null
    if (lastPaidDatePast) {
      return dates.find(d => d > lastPaidDatePast && isDateOverdue(d) && !member.payments?.[d])
        || dates.find(d => !isDateOverdue(d) && !member.payments?.[d])
    }
    return dates.find(d => !member.payments?.[d])
  }, [dates, lastPaidDatePast, isDateOverdue, member])

  // ─── HANDLERS ──────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem('sol_token')
    localStorage.removeItem('sol_member')
    navigate('/app/sol/login')
    toast('Ou dekonekte', { icon: '👋' })
  }, [navigate])

  // ═════════════════════════════════════════════════════════════
  // ✅ TOUT HOOKS FINI — KOUNYE A SEKIRITÈ POU EARLY RETURNS
  // ═════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: D.bgGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ width: 44, height: 44, border: `3px solid rgba(37,99,235,0.20)`, borderTopColor: D.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: D.muted, fontSize: 13, fontWeight: 500 }}>Ap chaje kont ou...</p>
        </div>
      </div>
    )
  }

  if (!data || !plans.length || !member || !plan) return null

  // ─── KALKIL FINAL (regular const — pa hooks) ────────────────
  const amountContributed = totalPaid     * plan.amount * allSlots.length
  const amountPaidPast    = totalPaidPast * plan.amount * allSlots.length
  const amountDue         = totalDue      * plan.amount * allSlots.length

  // ✅ NOUVO: "Touche Chak Konbyen Sik" — montan final la miltipliye pa entèval la
  const planInterval     = Math.max(1, Math.floor(Number(plan.interval) || 1))
  const payoutDebaz      = ((plan.amount * totalSlotCount) - (plan.feePerMember || plan.fee || 0)) * planInterval
  const memberBalance    = Number(member.balance || 0)
  const payoutAjiste     = payoutDebaz + memberBalance
  const progress         = totalSlotCount > 0 ? (totalPaid / totalSlotCount) * 100 : 0
  const totalToPayForSol = totalSlotCount * plan.amount * allSlots.length
  const restaPouPeye     = Math.max(0, totalToPayForSol - amountContributed)

  // ✅ FIX: pa gen okenn "touche" otomatik ki soti nan kalkil pozisyon an —
  // sèlman lè ADMIN deklare yon dat (declaredPayoutDate) oswa konfime
  // touche a pou tout bon (hasWon), manm nan ka wè yon endikasyon.
  const declaredStr = member.declaredPayoutDate ? String(member.declaredPayoutDate).split('T')[0] : null
  const isWinner   = !!member.hasWon || declaredStr === today
  const tenantName = tenant?.businessName || tenant?.name || 'Sòl Ou'
  // ✅ NOUVO: si admin aktive "Kache Pozisyon", manm nan pa dwe wè "Pozisyon #X"
  const hidePos    = !!plan.hidePositionInSol
  const posStr     = hidePos ? '' : (allSlots.length > 1
    ? allSlots.map(s => `#${s.position}`).join(' • ')
    : `Pozisyon #${member.position}`)

  // ─── PLAN SELECTOR (mobil) ──────────────────────────────────
  const planSelectorJSX = plans.length > 1 && (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <button
        onClick={() => setShowPlanPicker(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '11px 14px', borderRadius: 12,
          border: `1px solid ${D.border}`, background: D.goldDim,
          color: D.text, cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: 700, fontSize: 'clamp(11px, 2.8vw, 13px)',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          📋 {plan.name}
          <span style={{ marginLeft: 8, fontSize: 'clamp(9px, 2.4vw, 11px)', color: D.muted, fontWeight: 500 }}>
            {fmt(plan.amount)} HTG • {FREQ_LABELS[plan.frequency] || plan.frequency}
          </span>
        </span>
        <ChevronDown size={13} style={{ color: D.gold, flexShrink: 0, transform: showPlanPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {showPlanPicker && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50,
          background: D.card, border: `1px solid ${D.border}`,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxHeight: '60vh', overflowY: 'auto',
        }}>
          {plans.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPlanId(p.id); setShowPlanPicker(false); setTab('history') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '12px 14px', border: 'none',
                borderBottom: i < plans.length - 1 ? `1px solid ${D.borderSub}` : 'none',
                background: p.id === selectedPlanId ? D.goldDim : 'transparent',
                color: p.id === selectedPlanId ? D.gold : D.text,
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                fontSize: 'clamp(11px, 2.8vw, 13px)', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {p.id === selectedPlanId ? '✓ ' : ''}{p.plan?.name || '—'}
              </span>
              <span style={{ fontSize: 10, color: D.muted, flexShrink: 0 }}>{fmt(p.plan?.amount || 0)} HTG</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ─── SIDEBAR ────────────────────────────────────────────────
  const sidebarJSX = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 28 }}>
        {tenant?.logoUrl
          ? <img src={tenant.logoUrl} style={{ height: 36, borderRadius: 9, objectFit: 'contain', flexShrink: 0 }} alt="logo" />
          : <div style={{ width: 36, height: 36, borderRadius: 9, background: 'radial-gradient(circle at 35% 30%, rgba(37,99,235,0.22) 0%, #0B1526 72%)', boxShadow: '0 0 0 1px rgba(37,99,235,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BrandIcon size={20} /></div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: D.text, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</div>
          <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>Kont Sabotay</div>
        </div>
      </div>

      {plans.length > 1 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 7, paddingLeft: 4 }}>Plan Ou Yo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {plans.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPlanId(p.id); setTab('history') }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 10,
                  border: p.id === selectedPlanId ? `1px solid ${D.border}` : '1px solid transparent',
                  background: p.id === selectedPlanId ? D.goldDim : 'transparent',
                  color: p.id === selectedPlanId ? D.gold : D.muted,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
                  textAlign: 'left', width: '100%', minWidth: 0,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {p.id === selectedPlanId ? '✓ ' : ''}{p.plan?.name || '—'}
                </span>
                <span style={{ fontSize: 10, color: D.muted, flexShrink: 0, marginLeft: 8 }}>{fmt(p.plan?.amount || 0)} G</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: D.goldDim, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px', marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: D.text, fontFamily: 'Syne, sans-serif', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
        <div style={{ fontSize: 11, color: D.muted, marginBottom: 8 }}>{member.phone}</div>
        <div style={{ fontSize: 11, color: D.gold, fontWeight: 600, lineHeight: 1.5 }}>{posStr}</div>
        {allSlots.length > 1 && (
          <div style={{ fontSize: 10, color: D.muted, marginTop: 3 }}>
            {allSlots.length} men • {fmt(allSlots.length * plan.amount)} HTG/sik
          </div>
        )}
        {plan.dueTime && (
          <div style={{ fontSize: 10, color: D.muted, marginTop: 3 }}>
            ⏰ {plan.dueTime} — {plan.dueTimeEnd || '17:00'}
          </div>
        )}
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 7, paddingLeft: 14 }}>Menu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {[
          { id: 'history',  icon: <CreditCard size={14} />, label: 'Istwa Peman'  },
          { id: 'calendar', icon: <TrendingUp size={14} />, label: 'Kalandriye'   },
          { id: 'exchange', icon: <RefreshCw  size={14} />, label: 'Mache Echanj' },
        ].map(item => (
          <button key={item.id} className={`sol-nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 20 }}>
        <button
          onClick={() => setShowPayModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.06)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'inherit', width: '100%' }}
        >
          📱 Moncash / Natcash
        </button>
        <button
          onClick={() => setShowChangePw(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.06)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'inherit', width: '100%' }}
        >
          <Key size={12} /> Chanje Modpas
        </button>
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'inherit', width: '100%' }}
        >
          <LogOut size={12} /> Dekonekte
        </button>
      </div>
    </>
  )

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="sol-root">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ─── HEADER MOBIL ─── */}
      <div className="sol-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
          {tenant?.logoUrl
            ? <img src={tenant.logoUrl} style={{ height: 26, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} alt="logo" />
            : <div style={{ width: 26, height: 26, borderRadius: 6, background: 'radial-gradient(circle at 35% 30%, rgba(37,99,235,0.22) 0%, #0B1526 72%)', boxShadow: '0 0 0 1px rgba(37,99,235,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BrandIcon size={15} /></div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</div>
            <div style={{ fontSize: 9, color: D.muted }}>Kont Sabotay</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button
            onClick={fetchData}
            aria-label="Rafrechi"
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={handleLogout}
            aria-label="Dekonekte"
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      <div className="sol-layout">
        <div className="sol-sidebar">{sidebarJSX}</div>

        <div className="sol-main" style={{ animation: 'fadeUp 0.3s ease' }}>
          {planSelectorJSX}

          {/* ─── ALERTS ─── */}
          {isWinner && (
            <div className="sol-alert" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.14),rgba(37,99,235,0.12))', border: `1px solid ${D.green}40` }}>
              <div style={{ width: 46, height: 46, minWidth: 46, borderRadius: 14, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.32)' }}>
                <Trophy size={22} color="#0a0a00" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: 800, color: D.green, margin: '0 0 3px', fontFamily: 'Syne, sans-serif' }}>🎉 Se Jou Ou Jodi a!</p>
                <p style={{ fontSize: 12, color: D.mutedLt, margin: 0 }}>
                  Ou ap touche: <span style={{ color: D.gold, fontWeight: 800 }}>{fmt(payoutAjiste)} HTG</span>
                </p>
              </div>
            </div>
          )}

          {!isWinner && (() => {
            const neverPaid = !lastPaidDate
            if (neverPaid) {
              return (
                <div className="sol-alert" style={{ background: D.blueBg, border: `1px solid ${D.blue}35` }}>
                  <div style={{ color: D.blue, flexShrink: 0, fontSize: 20 }}>🔔</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: D.blue, fontWeight: 800, margin: '0 0 2px' }}>Ou poko fè premye peman ou!</p>
                    <p style={{ fontSize: 10, color: D.muted, margin: 0 }}>
                      Premye dat: {nextUnpaidDate?.split('-').reverse().join('/')} • {plan.dueTime || '10:00'} — {plan.dueTimeEnd || '17:00'}
                    </p>
                  </div>
                </div>
              )
            }
            if (!nextUnpaidDate) return null
            const daysUntil    = Math.ceil((new Date(nextUnpaidDate) - new Date(today)) / 86400000)
            const overdueAlert = isDateOverdue(nextUnpaidDate)
            if (overdueAlert) return <BlockingCountdown nextUnpaidDate={nextUnpaidDate} plan={plan} lastPaidDate={lastPaidDate} />
            if (daysUntil > 3) return null
            return <PaymentCountdown nextUnpaidDate={nextUnpaidDate} plan={plan} daysUntil={daysUntil} />
          })()}

          {/* ─── HERO ─── */}
          <div className="sol-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
                  Kont Sabotay Sòl
                </div>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 800, color: D.text, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.name}
                </h1>
                <div style={{ fontSize: 12, color: D.muted, marginBottom: 6 }}>{member.phone}</div>
                <div style={{ fontSize: 11, color: D.mutedLt, marginBottom: plan.dueTime ? 10 : 0 }}>
                  {posStr ? `${posStr} • ${plan.name}` : plan.name}
                </div>
                {plan.dueTime && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: D.goldDim, border: `1px solid ${D.border}`, borderRadius: 8, padding: '4px 10px', fontSize: 11, color: D.gold, fontWeight: 600 }}>
                    ⏰ <strong>{plan.dueTime}</strong> — <strong>{plan.dueTimeEnd || '17:00'}</strong>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>
                  Kontribisyon Total
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 'clamp(24px, 7vw, 40px)', color: D.gold, lineHeight: 1, marginBottom: 4 }}>
                  {fmt(amountContributed)}
                </div>
                <div style={{ fontSize: 12, color: D.muted }}>HTG • {totalPaid}/{totalSlotCount} peman</div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pwogrè Sòl la</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 14, color: D.gold }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="sol-progress-track">
                <div className="sol-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: D.muted }}>
                <span>{totalPaid} peman fèt</span>
                <span>{totalSlotCount - totalPaid} rès</span>
              </div>
            </div>
          </div>

          {/* ─── STATS ─── */}
          <div className="sol-stats-grid">
            <div className="sol-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: D.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={14} style={{ color: D.red }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Rès pou Peye
                </span>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 'clamp(16px, 4.5vw, 20px)', color: restaPouPeye === 0 ? D.green : D.red }}>
                {fmt(restaPouPeye)}
              </div>
              <div style={{ fontSize: 10, color: D.muted, marginTop: 3 }}>HTG</div>
            </div>

            {allSlots.map(slot => {
              const isExchangedSlot = slot.position === (member.accountPosition ?? member.position)
              const slotPayout      = isExchangedSlot ? payoutAjiste : payoutDebaz
              // ✅ NOUVO: "Men #X" ak dat li PA JANM afiche otomatikman —
              // sèlman lè ADMIN deklare yon dat pwomès pou eskl SA A espesifikman.
              const slotDeclared = slot.declaredPayoutDate ? String(slot.declaredPayoutDate).split('T')[0] : null
              return (
                <div
                  key={slot.position}
                  className="sol-stat-card"
                  style={{ borderColor: slotDeclared ? `${D.blue}40` : 'rgba(37,99,235,0.28)', background: slotDeclared ? 'rgba(96,165,250,0.06)' : 'rgba(37,99,235,0.08)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(37,99,235,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={14} style={{ color: D.gold }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {slotDeclared ? `Men #${slot.position}` : 'Men'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 'clamp(16px, 4.5vw, 20px)', color: D.gold }}>
                    {fmt(slotPayout)}
                  </div>
                  {slotDeclared ? (
                    <div style={{ fontSize: 10, color: D.blue, marginTop: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      📅 W ap touche {slotDeclared.split('-').reverse().join('/')}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>HTG</div>
                  )}
                  {isExchangedSlot && memberBalance !== 0 && (
                    <>
                      <div style={{ marginTop: 7, padding: '4px 7px', borderRadius: 7, background: memberBalance > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: memberBalance > 0 ? D.green : D.red }}>
                          {memberBalance > 0 ? '▲' : '▼'} {fmt(Math.abs(memberBalance))} HTG
                        </span>
                        <span style={{ fontSize: 9, color: D.muted }}>
                          {memberBalance > 0 ? 'frè resevwa' : 'frè peye'}
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: D.muted, marginTop: 2 }}>Debaz: {fmt(payoutDebaz)} HTG</div>
                    </>
                  )}
                </div>
              )
            })}

            {allSlots.length > 1 && (
              <div className="sol-stat-card" style={{ borderColor: `${D.green}30`, background: 'rgba(34,197,94,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: D.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={14} style={{ color: D.green }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: D.green, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Total Ap Touche
                  </span>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 'clamp(16px, 4.5vw, 20px)', color: D.green }}>
                  {fmt(payoutDebaz * allSlots.length + memberBalance)}
                </div>
                <div style={{ fontSize: 10, color: D.muted, marginTop: 3 }}>HTG total — {allSlots.length} men</div>
              </div>
            )}

            <div className="sol-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: D.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={14} style={{ color: D.blue }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Frekans
                </span>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 'clamp(12px, 3.4vw, 14px)', color: D.text }}>
                {FREQ_LABELS[plan.frequency] || plan.frequency}
              </div>
              <div style={{ fontSize: 10, color: D.muted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plan.name}
              </div>
            </div>

            {/* ✅ FIX: pwen yo afiche toutan, kèlkeswa si Pozisyon Dinamik aktive */}
            <div className="sol-stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(155,89,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={14} style={{ color: D.purple }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Pwen Pèfòmans
                  </span>
                </div>
                <div style={{
                  fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 'clamp(16px, 4.5vw, 20px)',
                  color: (member.performanceScore ?? 0) >= 80 ? D.green
                       : (member.performanceScore ?? 0) >= 50 ? D.orange
                       : D.red,
                }}>
                  {member.performanceScore ?? 0}
                </div>
                <div style={{ fontSize: 10, color: D.muted, marginTop: 3 }}>pts</div>
              </div>
          </div>

          <PerformanceSection scoreData={scoreData} />
          <PerformanceMessage scoreData={scoreData} />
          {/* ✅ FIX: pa doub-afiche si dat deklare a se jodi a — bannyè "Se Jou Ou Jodi a!" anwo a deja kouvri sa */}
          {declaredStr !== today && <DeclaredPayoutBanner declaredPayoutDate={member.declaredPayoutDate} />}

          {/* ✅ NOUVO: Si manm nan kanpe, montre estati ranbousman "penalite kanpe" a */}
          {member.status === 'stopped' && Number(member.stopRefundAmount || 0) > 0 && (
            <div style={{
              background: member.stopRefundPaid ? 'rgba(34,197,94,0.08)' : 'rgba(243,156,18,0.08)',
              border: `1px solid ${member.stopRefundPaid ? 'rgba(34,197,94,0.3)' : 'rgba(243,156,18,0.3)'}`,
              borderRadius: 18, padding: '16px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>{member.stopRefundPaid ? '✅' : '⏸️'}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: member.stopRefundPaid ? '#22c55e' : '#f59e0b', margin: '0 0 3px' }}>
                  {member.stopRefundPaid ? 'Ranbousman Peye' : 'Ou Kanpe Patisipasyon'}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                  {member.stopRefundPaid
                    ? `Ou resevwa ${fmt(member.stopRefundAmount)} HTG.`
                    : `Ou ap resevwa ${fmt(member.stopRefundAmount)} HTG lè plan sa a fèmen.`}
                </p>
              </div>
            </div>
          )}

          {/* ✅ NOUVO: Avètisman jeneral sou penalite si manm nan ta kanpe */}
          {member.status !== 'stopped' && plan.stopPenaltyAmount > 0 && (
            <div style={{
              background: 'rgba(243,156,18,0.06)', border: '1px solid rgba(243,156,18,0.2)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>
                Si w kanpe patisipasyon w nan sòl la, <strong style={{ color: '#f59e0b' }}>{fmt(plan.stopPenaltyAmount)} HTG</strong> nan
                kòb ou te DEJA peye a ap dedwi kòm penalite. Rès la ap tann ou lè plan an fèmen.
              </p>
            </div>
          )}

          {plan.regleman && (
            <div style={{ background: D.tealBg, border: `1px solid rgba(20,184,166,0.2)`, borderRadius: 18, padding: 'clamp(14px, 4vw, 20px)', marginBottom: 16 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, color: D.teal, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                📜 Regleman Sòl la
              </p>
              <p style={{ fontSize: 12, color: D.mutedLt, margin: 0, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {plan.regleman}
              </p>
            </div>
          )}

          {/* ─── THEME SWITCHER ─── */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => { setTheme(key); localStorage.setItem('sol_theme', key) }}
                style={{
                  padding: '4px 9px', borderRadius: 18, cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, border: 'none',
                  background: theme === key ? t.accent : 'rgba(128,128,128,0.15)',
                  color: theme === key ? '#fff' : D.muted,
                  transition: 'all 0.2s',
                }}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* ─── TABS ─── */}
          <div className="sol-tabs">
            {[['history','📋 Istwa'],['calendar','📅 Kalandriye'],['exchange','🔄 Mache'],['chat','💬 Chat']].map(([t, l]) => (
              <button
                key={t}
                className="sol-tab-btn"
                onClick={() => { setTab(t); if (t === 'chat') setUnreadCount(0) }}
                style={{
                  border: 'none',
                  background: tab === t ? D.goldDim : 'transparent',
                  color: tab === t ? D.gold : D.muted,
                  fontFamily: 'inherit', position: 'relative', fontSize: 11,
                }}
              >
                {l}
                {t === 'chat' && unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', boxShadow: '0 2px 6px rgba(239,68,68,0.5)' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ─── ISTWA PEMAN ─── */}
          {tab === 'history' && (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: 'clamp(12px, 3.5vw, 16px) clamp(14px, 4vw, 20px)', borderBottom: `1px solid ${D.borderSub}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(12px, 3.2vw, 13px)', fontWeight: 700, color: D.text }}>
                  Istwa Peman
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: D.muted, background: D.goldDim, padding: '2px 9px', borderRadius: 7 }}>
                  {totalPaid}/{dates.length}
                </span>
              </div>
              <div className="sol-scroll" style={{ maxHeight: 420, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {dates.map((d, i) => {
                  const paid     = !!member.payments?.[d]
                  const timing   = member.paymentTimings?.[d]
                  const isPast   = isDateOverdue(d) // ✅ FIX: respekte dueTimeEnd
                  // ✅ FIX: badge "Touche" a sèlman lè ADMIN deklare dat sa a
                  // (declaredPayoutDate) — pa yon devinèt otomatik ki soti nan pozisyon.
                  const isWin    = declaredStr === d
                  const montanDat = plan.amount * allSlots.length
                  return (
                    <div
                      key={d}
                      className="sol-pay-row"
                      style={{ background: isWin ? 'rgba(37,99,235,0.10)' : d === today ? 'rgba(37,99,235,0.05)' : 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: isPast ? D.text : D.muted, flexShrink: 0, fontWeight: 500 }}>
                          {d.split('-').reverse().join('/')}
                        </span>
                        {isWin && (
                          <span style={{ fontSize: 8, background: D.goldDim, color: D.gold, padding: '1px 7px', borderRadius: 7, fontWeight: 700, flexShrink: 0, border: `1px solid ${D.border}` }}>
                            🏆 Touche
                          </span>
                        )}
                        {d === today && !isWin && (
                          <span style={{ fontSize: 8, background: D.blueBg, color: D.blue, padding: '1px 7px', borderRadius: 7, fontWeight: 700, flexShrink: 0 }}>
                            Jodi
                          </span>
                        )}
                        {paid && timingBadge(timing)}
                        {paid && allSlots.length > 1 && (
                          <span style={{ fontSize: 8, color: D.muted, flexShrink: 0 }}>
                            {allSlots.length}×{fmt(plan.amount)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: paid ? D.green : isPast ? D.red : D.muted, whiteSpace: 'nowrap' }}>
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

          {/* ─── AKSYON MOBIL ─── */}
          <div className="sol-mobile-actions">
            <button
              onClick={() => setShowPayModal(true)}
              style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(220,38,38,0.28)', background: 'rgba(220,38,38,0.07)', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}
            >
              📱 Peye pa Moncash / Natcash
            </button>
            <button
              onClick={() => setShowChangePw(true)}
              style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.06)', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}
            >
              <Key size={13} /> Chanje Modpas
            </button>
          </div>
        </div>
      </div>

      {showPayModal  && <ModalPayMobile      onClose={() => setShowPayModal(false)} />}
      {showChangePw  && <ModalChangePassword token={token} onClose={() => setShowChangePw(false)} />}
    </div>
  )
}