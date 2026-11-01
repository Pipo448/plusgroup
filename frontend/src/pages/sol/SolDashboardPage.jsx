// src/pages/sol/SolDashboardPage.jsx
// ─── Paj prensipal tableau de bord Sol — nouvo design "Sabotay Inove" ───
// Lojik (kalkil dat, peman, skò, blokaj, fetch) = MENM ak anvan.
// Chanjman UI: kat manm (hero) + carnet tanpon + navigasyon anba (mobil) + sidebar (desktop)
//   + tèm CSS variables + fenèt "Kont" + notifikasyon sou demann (pa otomatik).
// FIX #310: Tout hooks deplase AVAN early returns.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LogOut, RefreshCw, Trophy, Key, Wallet, TrendingUp, CreditCard, Star,
  ChevronDown, Home, Calendar, MessageCircle, Bell, Smartphone, Check,
} from 'lucide-react'
import SolExchangeMarket from '../../components/SolExchangeMarket'

import {
  SOL_API, fmt, THEMES, themeVars, V, FREQ_LABELS, getPaymentDates, GLOBAL_STYLES,
  dmy, dayOf, monthOf,
} from './solDashboardUtils'

import {
  BrandIcon, LogoMark, ProgressRing, StampCarnet, CountUp, TiltCard,
  PayBadge, timingBadge, SolCalendar, PaymentCountdown, BlockingCountdown,
  PerformanceMessage, PerformanceSection, SolChat, DeclaredPayoutBanner, MemberScoreDisplay,
} from './SolDashboardComponents'

import { SolBanner, GoldKpis, SolReports, SolReceiptButton, SolReceiptModal, IMG_LOGO } from './SolReports'
import { ModalChangePassword, ModalPayMobile, ModalAccount } from './SolDashboardModals'

const VAPID = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
const urlBase64ToUint8Array = (b) => {
  const padding = '='.repeat((4 - b.length % 4) % 4)
  const base64  = (b + padding).replace(/-/g, '+').replace(/_/g, '/')
  return new Uint8Array([...window.atob(base64)].map(c => c.charCodeAt(0)))
}
const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const NAV = [
  { id: 'home',     label: 'Akèy',      Icon: Home },
  { id: 'history',  label: 'Peman',     Icon: CreditCard },
  { id: 'calendar', label: 'Kalandriye', Icon: Calendar },
  { id: 'exchange', label: 'Mache',     Icon: RefreshCw },
  { id: 'chat',     label: 'Chat',      Icon: MessageCircle },
]

// ── Til estatistik (deyò paj la pou li pa remonte chak render) ──
function Tile({ icon, tone = 'accent', label, children, sub, className = '', style }) {
  return (
    <div className={`sol-tile ${className}`} style={style}>
      <div className="sol-tile-ico" style={{ background: `var(--s-${tone}-soft)`, color: tone === 'accent' ? V.accentText : V[tone] }}>{icon}</div>
      <div className="sol-tile-label">{label}</div>
      {children}
      {sub && <div className="sol-tile-sub">{sub}</div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
export default function SolDashboardPage() {
  const navigate = useNavigate()

  // ─── STATE ──────────────────────────────────────────────────
  const [data,           setData]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [showChangePw,   setShowChangePw]   = useState(false)
  const [showPayModal,   setShowPayModal]   = useState(false)
  const [showAccount,    setShowAccount]    = useState(false)
  const [showReceipt,    setShowReceipt]    = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [tab,            setTab]            = useState('home')
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [theme,          setThemeState]     = useState(() => {
    try { const t = localStorage.getItem('sol_theme'); return THEMES[t] ? t : 'plus' } catch { return 'plus' }
  })
  const [pushState,      setPushState]      = useState(() => pushSupported() ? Notification.permission : 'unsupported')
  const [, setTick]                         = useState(0) // re-render chak 30s — mete tan ajou

  const token = localStorage.getItem('sol_token')
  const setTheme = useCallback((k) => { setThemeState(k); try { localStorage.setItem('sol_theme', k) } catch {} }, [])

  // ─── EFFECTS ────────────────────────────────────────────────
  // 🔄 Tick chak 30s — fè `today` ak `currentTime` aktyalize otomatikman
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // 🔔 Push notifications — ✅ KORIJE: pa mande otorizasyon otomatikman lè paj la louvri
  // (navigatè yo penalize sa). Si manm nan deja otorize, nou re-anrejistre an silans;
  // sinon l ka aktive l ak bouton "Aktive notifikasyon" nan fenèt Kont lan.
  const subscribePush = useCallback(async (ask) => {
    if (!pushSupported()) return
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      let permission = Notification.permission
      if (ask && permission === 'default') permission = await Notification.requestPermission()
      setPushState(permission)
      if (permission !== 'granted') return
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) })
      if (token) await fetch(`${SOL_API}/api/sol/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subscription: sub }),
      }).catch(() => {})
      if (ask) toast.success('Notifikasyon aktive!')
    } catch (e) { console.warn('SW:', e.message) }
  }, [token])

  useEffect(() => { if (pushSupported() && Notification.permission === 'granted') subscribePush(false) }, [subscribePush])

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
      // kont bloke (an reta) → dekonekte manm nan ak mesaj la
      if (res.status === 403) {
        const j = await res.json().catch(() => ({}))
        let who = ''
        try { who = JSON.parse(localStorage.getItem('sol_member') || '{}')?.name || '' } catch { /* */ }
        // Sove rezon an + montan ki an reta a: paj login lan montre yon panèl konplè (pa yon toast ki disparèt)
        try { sessionStorage.setItem('sol_block', JSON.stringify({ message: j.message || 'Kont ou bloke poutèt reta peman.', lateAmount: j.lateAmount, lateCount: j.lateCount, name: who })) } catch { /* */ }
        localStorage.removeItem('sol_token')
        localStorage.removeItem('sol_member')
        navigate('/app/sol/login')
        return
      }
      const json = await res.json()
      setData(json)
      setSelectedPlanId(prev => prev || json.plans?.[0]?.id || null)
    } catch { toast.error('Pa ka chaje done yo.') }
    finally { setLoading(false) }
  }, [token, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  // Lè manm nan tounen sou app la, rechaje done yo an silans (maks 1 fwa / 60 s — EGRESS)
  useEffect(() => {
    let last = Date.now()
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60000 || !token) return
      last = Date.now()
      try {
        const res = await fetch(`${SOL_API}/api/sol/members/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) setData(await res.json())
        else if (res.status === 403 || res.status === 401) fetchData()
      } catch { /* rezo */ }
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [token, fetchData])

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

  // ─── LÈ AYITI ───────────────────────────────────────────────
  const { today, currentTime } = (() => {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).map(x => [x.type, x.value]))
      return { today: `${p.year}-${p.month}-${p.day}`, currentTime: `${p.hour}:${p.minute}` }
    } catch {
      const n = new Date(Date.now() - 5 * 60 * 60 * 1000)
      return { today: n.toISOString().split('T')[0], currentTime: `${String(n.getUTCHours()).padStart(2,'0')}:${String(n.getUTCMinutes()).padStart(2,'0')}` }
    }
  })()
  const planDueTimeEnd = plan?.dueTimeEnd || '17:00'

  // yon dat anreta sèlman si li avan jodi, OUBYEN se jodi epi lè a depase `dueTimeEnd`
  const isDateOverdue = useCallback((d) => {
    if (d < today) return true
    if (d === today) return currentTime > planDueTimeEnd
    return false
  }, [today, currentTime, planDueTimeEnd])

  // ─── KALKILASYON (memoized — null-safe) ─────────────────────
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
    if (!plan) return 0
    if (plan.nonStoppedMemberCount) return plan.nonStoppedMemberCount
    return Math.max(
      plan.activeMemberCount || 0,
      plan.maxMembers        || 0,
      allSlots.reduce((max, s) => Math.max(max, s.position || 0), 0),
    )
  }, [plan, allSlots])

  const dates = useMemo(() => {
    if (!plan || !totalSlotCount) return []
    // manm yo PEYE chak jou san manke — se TOUCHE a ki chak "entèval" jou
    const totalDays = totalSlotCount * Math.max(1, Math.floor(plan.interval || 1))
    const base = getPaymentDates(plan.frequency, plan.createdAt || plan.startDate, totalDays)
    // tout dat kesye a te make peye parèt tou — okenn peman pa "disparèt"
    const paidKeys = new Set()
    for (const s of (member?.allSlots || [member || {}])) Object.keys(s?.payments || {}).forEach(d => s.payments[d] && paidKeys.add(d))
    const extra = [...paidKeys].filter(d => !base.includes(d))
    return extra.length ? [...base, ...extra].sort() : base
  }, [plan, totalSlotCount, member])

  const totalPaid = useMemo(() => dates.filter(d => member?.payments?.[d]).length, [dates, member])
  const totalPaidPast = useMemo(() => dates.filter(d => isDateOverdue(d) && member?.payments?.[d]).length, [dates, isDateOverdue, member])
  const totalDue = useMemo(() => dates.filter(d => isDateOverdue(d)).length, [dates, isDateOverdue])

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

  const goTab = useCallback((t) => { setTab(t); if (t === 'chat') setUnreadCount(0); window.scrollTo?.({ top: 0 }) }, [])

  // ═════════════════════════════════════════════════════════════
  // ✅ TOUT HOOKS FINI — KOUNYE A SEKIRITÈ POU EARLY RETURNS
  // ═════════════════════════════════════════════════════════════
  const rootStyle = themeVars(theme)

  if (loading) {
    return (
      <div className="sol-root" style={{ ...rootStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ width: 62, height: 62, borderRadius: 20, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s-card)', border: '1px solid var(--s-line)', boxShadow: 'var(--s-shadow)', animation: 'pulseRing 1.6s ease-out infinite' }}>
            <BrandIcon size={34} />
          </div>
          <p style={{ color: V.muted2, fontSize: 14, fontWeight: 600 }}>Ap chaje kont ou…</p>
        </div>
      </div>
    )
  }

  // ✅ Pa gen paj blan ankò: si done yo pa chaje, montre yon mesaj ak bouton pou eseye ankò
  if (!data || !plans.length || !member || !plan) {
    return (
      <div className="sol-root" style={{ ...rootStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{GLOBAL_STYLES}</style>
        <div className="sol-card" style={{ maxWidth: 380, width: '100%', padding: 26, textAlign: 'center', boxShadow: 'var(--s-shadow)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s-amber-soft)', color: V.amber }}><Wallet size={24} /></div>
          <h1 className="sol-display" style={{ fontSize: 22, marginBottom: 8 }}>Pa ka chaje kont ou</h1>
          <p style={{ fontSize: 13.5, color: V.muted, lineHeight: 1.65, marginBottom: 20 }}>Verifye koneksyon entènèt ou, epi eseye ankò. Si pwoblèm nan kontinye, kontakte admin sòl ou a.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="sol-btn" style={{ flex: 1 }} onClick={handleLogout}><LogOut size={15} /> Dekonekte</button>
            <button className="sol-btn primary" style={{ flex: 1.4 }} onClick={fetchData}><RefreshCw size={15} /> Eseye ankò</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── KALKIL FINAL ───────────────────────────────────────────
  const amountContributed = totalPaid     * plan.amount * allSlots.length
  const amountPaidPast    = totalPaidPast * plan.amount * allSlots.length   // eslint-disable-line no-unused-vars
  const amountDue         = totalDue      * plan.amount * allSlots.length   // eslint-disable-line no-unused-vars

  // "Touche Chak Konbyen Sik" — montan final la miltipliye pa entèval la
  const planInterval     = Math.max(1, Math.floor(Number(plan.interval) || 1))
  const payoutDebaz      = ((plan.amount * totalSlotCount) - (plan.feePerMember || plan.fee || 0)) * planInterval
  const memberBalance    = Number(member.balance || 0)
  const payoutAjiste     = payoutDebaz + memberBalance
  const progress         = dates.length > 0 ? (totalPaid / dates.length) * 100 : 0
  const totalToPayForSol = dates.length * plan.amount * allSlots.length
  const restaPouPeye     = Math.max(0, totalToPayForSol - amountContributed)
  const totalPayout      = allSlots.length > 1 ? payoutDebaz * allSlots.length + memberBalance : payoutAjiste

  // pa gen "touche" otomatik — sèlman lè ADMIN deklare yon dat oswa konfime touche a
  const declaredStr = member.declaredPayoutDate ? String(member.declaredPayoutDate).split('T')[0] : null
  const isWinner    = !!member.hasWon || declaredStr === today
  const isStopped   = member.status === 'stopped'
  const tenantName  = tenant?.businessName || tenant?.name || 'Sòl Ou'
  const hidePos     = !!plan.hidePositionInSol   // admin ka kache "Pozisyon #X"
  const posStr      = hidePos ? '' : (allSlots.length > 1
    ? allSlots.map(s => `#${s.position}`).join(' • ')
    : `Pozisyon #${member.position}`)
  const declaredDates = allSlots.map(s => s.declaredPayoutDate ? String(s.declaredPayoutDate).split('T')[0] : null).filter(Boolean)
  const initials = String(member.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  // ─── PLAN SELECTOR ──────────────────────────────────────────
  const planSelectorJSX = plans.length > 1 && (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <button onClick={() => setShowPlanPicker(v => !v)} aria-expanded={showPlanPicker}
        className="sol-card" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', color: V.text, cursor: 'pointer', fontWeight: 700, fontSize: 13.5 }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {plan.name}
          <span style={{ marginLeft: 8, fontSize: 11.5, color: V.muted, fontWeight: 500 }}>{fmt(plan.amount)} HTG · {FREQ_LABELS[plan.frequency] || plan.frequency}</span>
        </span>
        <ChevronDown size={15} style={{ color: V.accentText, flexShrink: 0, transform: showPlanPicker ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {showPlanPicker && (
        <div className="sol-card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, overflow: 'hidden', boxShadow: 'var(--s-shadow)', maxHeight: '60vh', overflowY: 'auto' }}>
          {plans.map((p, i) => (
            <button key={p.id}
              onClick={() => { setSelectedPlanId(p.id); setShowPlanPicker(false); goTab('home') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', border: 'none', borderTop: i ? '1px solid var(--s-line)' : 'none', background: p.id === selectedPlanId ? 'var(--s-accent-soft)' : 'transparent', color: p.id === selectedPlanId ? V.accentText : V.text, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, textAlign: 'left' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{p.plan?.name || '—'}</span>
              {p.id === selectedPlanId && <Check size={15} />}
              <span style={{ fontSize: 11.5, color: V.muted, flexShrink: 0 }}>{fmt(p.plan?.amount || 0)} HTG</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ─── SIDEBAR (desktop) ──────────────────────────────────────
  const sidebarJSX = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
        <LogoMark tenant={tenant} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.025em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</div>
          <div style={{ fontSize: 11.5, color: V.muted, marginTop: 2 }}>Kont Sabotay</div>
        </div>
      </div>

      <img src={IMG_LOGO} alt="Plus Group" style={{ height: 30, width: 'auto', alignSelf: 'flex-start', margin: '-8px 0 18px 2px', background: '#fff', padding: '5px 10px', borderRadius: 10, boxSizing: 'content-box' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <div className="sol-card" style={{ background: 'var(--s-card2)', padding: 14, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--s-btn)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
          <div style={{ fontSize: 11.5, color: V.muted, marginTop: 1 }}>{member.phone}</div>
          {posStr && <div style={{ fontSize: 11.5, color: V.accentText, fontWeight: 700, marginTop: 2 }}>{posStr}</div>}
        </div>
      </div>

      {plans.length > 1 && (
        <div style={{ marginBottom: 18 }}>
          <div className="sol-label" style={{ paddingLeft: 4 }}>Plan ou yo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {plans.map(p => (
              <button key={p.id} onClick={() => { setSelectedPlanId(p.id); goTab('home') }} className={`sol-nav-item ${p.id === selectedPlanId ? 'active' : ''}`} style={{ padding: '9px 12px', fontSize: 12.5, justifyContent: 'space-between' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.plan?.name || '—'}</span>
                <span style={{ fontSize: 11, opacity: .7, flexShrink: 0 }}>{fmt(p.plan?.amount || 0)} G</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={`sol-nav-item ${tab === id ? 'active' : ''}`} onClick={() => goTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={17} /> {label}
            {id === 'chat' && unreadCount > 0 && <span className="sol-badge red" style={{ marginLeft: 'auto', background: V.red, color: '#fff' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 18 }}>
        <div style={{ display: 'flex', gap: 7, padding: '0 2px 6px', alignItems: 'center' }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} onClick={() => setTheme(key)} title={t.name} aria-label={`Tèm ${t.name}`} aria-pressed={theme === key}
              style={{ width: 22, height: 22, borderRadius: '50%', background: t.accent, border: '2px solid ' + (t.dark ? '#0C1630' : '#fff'), boxShadow: theme === key ? `0 0 0 2px ${t.accent}` : '0 0 0 1px var(--s-line2)', cursor: 'pointer', padding: 0 }} />
          ))}
        </div>
        <button className="sol-side-btn" onClick={() => setShowPayModal(true)}><Smartphone size={15} style={{ color: V.red }} /> MonCash / Natcash</button>
        {pushState === 'default' && <button className="sol-side-btn" onClick={() => subscribePush(true)}><Bell size={15} style={{ color: V.amber }} /> Aktive notifikasyon</button>}
        <button className="sol-side-btn" onClick={() => setShowChangePw(true)}><Key size={15} style={{ color: V.accentText }} /> Chanje modpas</button>
        <button className="sol-side-btn" onClick={handleLogout}><LogOut size={15} /> Dekonekte</button>
      </div>
    </>
  )

  // ─── AKÈY ───────────────────────────────────────────────────
  const homeJSX = (
    <>
      <SolBanner name={member.name} tenantName={tenantName} />
      {/* Alèt */}
      {isWinner && (
        <div className="sol-alert green">
          <div className="sol-alert-ico" style={{ background: 'var(--s-btn)', color: '#fff' }}><Trophy size={21} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="sol-alert-title" style={{ color: V.green }}>Se jou ou jodi a!</div>
            <div className="sol-alert-sub">Ou ap touche <strong className="sol-num" style={{ color: V.text }}>{fmt(payoutAjiste)} HTG</strong>.</div>
          </div>
        </div>
      )}

      {!isWinner && !isStopped && (() => {
        if (!lastPaidDate) {
          return (
            <div className="sol-alert blue">
              <div className="sol-alert-ico" style={{ background: 'var(--s-blue-soft)', color: V.blue }}><Bell size={20} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="sol-alert-title" style={{ color: V.blue }}>Ou poko fè premye peman ou</div>
                <div className="sol-alert-sub">Premye dat: {dmy(nextUnpaidDate)} · {plan.dueTime || '10:00'} a {plan.dueTimeEnd || '17:00'}</div>
              </div>
            </div>
          )
        }
        if (!nextUnpaidDate) return null
        const daysUntil = Math.ceil((new Date(nextUnpaidDate) - new Date(today)) / 86400000)
        if (isDateOverdue(nextUnpaidDate)) return <BlockingCountdown nextUnpaidDate={nextUnpaidDate} lastPaidDate={lastPaidDate} />
        if (daysUntil > 3) return null
        return <PaymentCountdown nextUnpaidDate={nextUnpaidDate} plan={plan} />
      })()}

      {pushState === 'default' && (
        <button onClick={() => subscribePush(true)} className="sol-alert" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', color: V.text, font: 'inherit' }}>
          <div className="sol-alert-ico" style={{ background: 'var(--s-amber-soft)', color: V.amber }}><Bell size={19} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="sol-alert-title" style={{ fontSize: 13.5 }}>Aktive notifikasyon</div>
            <div className="sol-alert-sub">Resevwa rapèl avan lè peman an ak nouvo mesaj chat yo.</div>
          </div>
        </button>
      )}

      {/* Kat manm (hero) */}
      <TiltCard>
      <section className="sol-hero" aria-label="Rezime kont ou">
        <svg className="sol-hero-art" viewBox="0 0 360 360" fill="none" aria-hidden="true">
          {[60, 100, 140, 180].map((r, i) => <circle key={r} cx="180" cy="180" r={r} stroke="#fff" strokeOpacity={0.15 - i * 0.025} strokeWidth="1.5" />)}
          <circle cx="180" cy="40" r="7" fill="#F97316" />
        </svg>
        <div className="sol-hero-row">
          <span className="sol-glass">{plan.name}</span>
          <span className="sol-glass">{FREQ_LABELS[plan.frequency] || plan.frequency}{plan.dueTime ? ` · ${plan.dueTime}–${plan.dueTimeEnd || '17:00'}` : ''}</span>
        </div>
        <div className="sol-hero-main">
          <div style={{ minWidth: 0 }}>
            <div className="sol-hero-label">
              {isStopped ? (member.stopRefundPaid ? 'Ranbousman resevwa' : 'Ranbousman ki rete') : isWinner ? 'Ou ap touche jodi a' : allSlots.length > 1 ? `Total ou ap touche · ${allSlots.length} men` : 'Kòb ou ap touche'}
            </div>
            <div className="sol-hero-amount"><CountUp value={isStopped ? (member.stopRefundAmount || 0) : totalPayout} /><small>HTG</small></div>
            <div className="sol-hero-who">{member.name}{posStr ? ` · ${posStr}` : ''}</div>
          </div>
          <ProgressRing value={progress} top={`${Math.round(progress)}%`} bottom={`${totalPaid}/${dates.length}`} />
        </div>
        <div className="sol-hero-foot">
          <div className="sol-hero-cell"><b><CountUp value={amountContributed} /></b><span>Ou peye deja</span></div>
          <div className="sol-hero-cell"><b><CountUp value={restaPouPeye} /></b><span>Rès pou peye</span></div>
          <div className="sol-hero-cell"><b>{nextUnpaidDate ? `${dayOf(nextUnpaidDate)} ${monthOf(nextUnpaidDate)}` : '—'}</b><span>Pwochen</span></div>
        </div>
      </section>
      </TiltCard>

      {/* Til */}
      <div className="sol-tiles">
        {isStopped ? (
          <Tile className="sol-tile-wide" tone={member.stopRefundPaid ? 'green' : 'amber'} icon={<Wallet size={16} />}
            label={member.stopRefundPaid ? 'Ranbousman peye' : 'Kanpe: ranbousman ki rete'}
            sub={member.stopRefundPaid ? 'HTG resevwa' : 'HTG, ap peye lè plan an fèmen'}>
            <div className="sol-tile-val sol-num" style={{ color: member.stopRefundPaid ? V.green : V.amber }}>{fmt(member.stopRefundAmount || 0)}</div>
          </Tile>
        ) : (
          <>
            {allSlots.map(slot => {
              const isExchangedSlot = slot.position === (member.accountPosition ?? member.position)
              const slotPayout      = isExchangedSlot ? payoutAjiste : payoutDebaz
              // "Men #X" ak dat li PA JANM afiche otomatikman — sèlman lè ADMIN deklare yon dat
              const slotDeclared = slot.declaredPayoutDate ? String(slot.declaredPayoutDate).split('T')[0] : null
              const showBalance  = isExchangedSlot && memberBalance !== 0
              if (allSlots.length === 1 && !showBalance) return null   // deja nan kat la + KPI lò
              return (
                <Tile key={slot.position} tone="accent" icon={<Trophy size={16} />} label={slotDeclared ? `Men #${slot.position}` : 'Men'}
                  sub={slotDeclared ? `Ou ap touche ${dmy(slotDeclared)}` : 'HTG'}>
                  <div className="sol-tile-val sol-num" style={{ color: V.accentText }}><CountUp value={slotPayout} /></div>
                  {showBalance && (
                    <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: memberBalance > 0 ? V.green : V.red }}>
                      {memberBalance > 0 ? '▲' : '▼'} {fmt(Math.abs(memberBalance))} HTG {memberBalance > 0 ? 'frè resevwa' : 'frè peye'}
                      <div style={{ fontWeight: 500, color: V.muted, marginTop: 2 }}>Debaz: {fmt(payoutDebaz)} HTG</div>
                    </div>
                  )}
                </Tile>
              )
            })}
          </>
        )}

        <Tile tone="blue" icon={<TrendingUp size={16} />} label="Frekans" sub={plan.name}>
          <div className="sol-tile-val" style={{ fontSize: 'clamp(15px, 4vw, 17px)' }}>{FREQ_LABELS[plan.frequency] || plan.frequency}</div>
        </Tile>

        <Tile tone="accent" icon={<Star size={16} />} label="Pwen pèfòmans">
          <MemberScoreDisplay member={member} plan={plan} today={today} currentTime={currentTime} />
        </Tile>
      </div>

      <GoldKpis amountContributed={amountContributed} restaPouPeye={restaPouPeye} payout={isWinner ? payoutAjiste : totalPayout} totalPaid={totalPaid} totalDates={dates.length} isStopped={isStopped} payoutDate={declaredDates[0]} />
      <SolReports dates={dates} member={member} plan={plan} today={today} isDateOverdue={isDateOverdue} allSlots={allSlots} />

      <PerformanceSection scoreData={scoreData} />
      <PerformanceMessage scoreData={scoreData} />
      {declaredStr !== today && <DeclaredPayoutBanner declaredPayoutDate={member.declaredPayoutDate} />}

      {!isStopped && plan.stopPenaltyAmount > 0 && (
        <div className="sol-alert amber" style={{ alignItems: 'flex-start' }}>
          <div className="sol-alert-ico" style={{ background: 'var(--s-amber-soft)', color: V.amber, fontSize: 19 }}>⚠️</div>
          <p style={{ fontSize: 12.5, color: V.muted2, lineHeight: 1.65 }}>
            Si w kanpe patisipasyon w nan sòl la, <strong style={{ color: V.amber }}>{fmt(plan.stopPenaltyAmount)} HTG</strong> nan kòb ou te deja peye a ap dedwi kòm penalite. Rès la ap tann ou lè plan an fèmen.
          </p>
        </div>
      )}

      {plan.regleman && (
        <div className="sol-card sol-card-pad" style={{ marginBottom: 14 }}>
          <div className="sol-section-title" style={{ marginBottom: 10 }}>Regleman sòl la</div>
          <p style={{ fontSize: 13, color: V.muted2, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{plan.regleman}</p>
        </div>
      )}
    </>
  )

  // ─── ISTWA PEMAN ────────────────────────────────────────────
  const historyJSX = (
    <>
      <SolReceiptButton onClick={() => setShowReceipt(true)} />
      <div className="sol-card" style={{ overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '16px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="sol-section-title">Kaye peman</span>
          <span className="sol-badge accent sol-num">{totalPaid}/{dates.length}</span>
        </div>
        <StampCarnet dates={dates} member={member} today={today} isDateOverdue={isDateOverdue} declaredDates={declaredDates} />
      </div>

      <div className="sol-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="sol-section-title">Detay peman yo</span>
          <span style={{ fontSize: 12, color: V.muted, fontWeight: 600 }}>{allSlots.length > 1 ? `${allSlots.length} men × ${fmt(plan.amount)} HTG` : `${fmt(plan.amount)} HTG chak fwa`}</span>
        </div>
        <div className="sol-scroll" style={{ maxHeight: 460, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {dates.map((d) => {
            const paid      = !!member.payments?.[d]
            const timing    = member.paymentTimings?.[d]
            const isPast    = isDateOverdue(d)
            const isWin     = declaredStr === d
            const montanDat = plan.amount * allSlots.length
            return (
              <div key={d} className="sol-pay-row" style={{ background: isWin ? 'var(--s-accent-soft)' : d === today ? 'var(--s-card2)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                  <span className="sol-num" style={{ fontSize: 13, fontWeight: 600, color: isPast || paid ? V.text : V.muted, flexShrink: 0 }}>{dmy(d)}</span>
                  {isWin && <span className="sol-badge accent">🏆 Touche</span>}
                  {d === today && !isWin && <span className="sol-badge blue">Jodi</span>}
                  {paid && timingBadge(timing)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className="sol-num" style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: paid ? V.green : isPast ? V.red : V.muted }}>
                    {paid ? '+' : isPast ? '−' : ''}{fmt(montanDat)}
                  </span>
                  {isPast && <PayBadge paid={paid} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="sol-root" style={rootStyle}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header mobil */}
      <header className="sol-appbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <LogoMark tenant={tenant} size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: 15, letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenantName}</div>
            <div style={{ fontSize: 11, color: V.muted }}>Kont Sabotay</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="sol-icon-btn" onClick={fetchData} aria-label="Rafrechi"><RefreshCw size={15} /></button>
          <button className="sol-icon-btn" onClick={() => setShowAccount(true)} aria-label="Kont mwen"
            style={{ background: 'var(--s-btn)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13 }}>
            {initials}
            {pushState === 'default' && <span style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: V.amber, border: '2px solid var(--s-bg)' }} />}
          </button>
        </div>
      </header>

      <div className="sol-layout">
        <aside className="sol-sidebar">{sidebarJSX}</aside>

        <main className="sol-main">
          {planSelectorJSX}

          {tab === 'home'     && <div className="sol-pane" key="home">{homeJSX}</div>}
          {tab === 'history'  && <div className="sol-pane" key="history">{historyJSX}</div>}
          {tab === 'calendar' && <div className="sol-pane" key="cal"><SolCalendar dates={dates} member={member} plan={plan} today={today} allSlots={allSlots} /></div>}
          {tab === 'exchange' && <SolExchangeMarket token={token} member={member} plan={plan} />}
          {tab === 'chat'     && <SolChat token={token} plan={plan} member={member} onNewMessage={(count) => tab !== 'chat' && setUnreadCount(p => p + count)} />}
        </main>
      </div>

      {/* Navigasyon anba (mobil) */}
      <nav className="sol-bottomnav" aria-label="Navigasyon prensipal">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={`sol-bn-item ${tab === id ? 'active' : ''}`} onClick={() => goTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <span className="sol-bn-ico"><Icon size={20} strokeWidth={tab === id ? 2.4 : 2} /></span>
            {label}
            {id === 'chat' && unreadCount > 0 && <span className="sol-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        ))}
      </nav>

      {showAccount && (
        <ModalAccount
          onClose={() => setShowAccount(false)} member={member} tenantName={tenantName}
          theme={theme} setTheme={setTheme} pushState={pushState} onEnablePush={() => subscribePush(true)}
          onPay={() => { setShowAccount(false); setShowPayModal(true) }}
          onChangePw={() => { setShowAccount(false); setShowChangePw(true) }}
          onLogout={() => { setShowAccount(false); handleLogout() }}
        />
      )}
      {showReceipt && <SolReceiptModal onClose={() => setShowReceipt(false)} member={member} plan={plan} tenantName={tenantName} totalPaid={totalPaid} totalDates={dates.length} amountContributed={amountContributed} restaPouPeye={restaPouPeye} payout={totalPayout} lastPaidDate={lastPaidDate} />}
      {showPayModal && <ModalPayMobile onClose={() => setShowPayModal(false)} />}
      {showChangePw && <ModalChangePassword token={token} onClose={() => setShowChangePw(false)} />}
    </div>
  )
}
