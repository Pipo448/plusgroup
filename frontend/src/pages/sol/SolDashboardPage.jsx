// src/pages/sol/SolDashboardPage.jsx
// Tableau de bord manm Sabotay Sol
// Wout: /app/sol/dashboard
//hh1

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LogOut, RefreshCw, Trophy, CheckCircle, Clock, Star, Bell, Key,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import SolExchangeMarket from '../../components/SolExchangeMarket'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const D = {
  bg:        '#060f1e',
  card:      '#0d1b2a',
  border:    'rgba(201,168,76,0.18)',
  borderSub: 'rgba(255,255,255,0.07)',
  gold:      '#C9A84C',
  goldBtn:   'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:   'rgba(201,168,76,0.10)',
  green:     '#27ae60', greenBg:  'rgba(39,174,96,0.12)',
  red:       '#e74c3c', redBg:    'rgba(231,76,60,0.10)',
  orange:    '#f39c12', orangeBg: 'rgba(243,156,18,0.10)',
  blue:      '#3B82F6', blueBg:   'rgba(59,130,246,0.10)',
  text:      '#e8eaf0',
  muted:     '#6b7a99',
}

// ─────────────────────────────────────────────────────────────
// GLOBAL STYLES — responsivite mobile
// ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes shimmer { from { opacity:0.6 } to { opacity:1 } }

  /* ── Scrollbar piti */
  .sol-scroll::-webkit-scrollbar { width: 3px; height: 3px; }
  .sol-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }

  /* ── Placeholders */
  .sol-inp::placeholder { color: #2a3a54; }
  .sol-inp:focus { border-color: rgba(201,168,76,0.5) !important; outline: none; }

  /* ── Touch tap highlight retire */
  button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }

  /* ── Stats grid: 2 kolòn sou >=360px, 1 kolòn anba */
  .sol-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  @media (max-width: 340px) {
    .sol-stats-grid { grid-template-columns: 1fr; }
  }

  /* ── Payment history row */
  .sol-pay-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    gap: 8px;
    min-width: 0;
  }
  .sol-pay-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }
  .sol-pay-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ── Tabs: plein largeur mobile */
  .sol-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }
  .sol-tab-btn {
    flex: 1;
    padding: 10px 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    transition: all 0.15s;
    white-space: nowrap;
  }

  /* ── Header */
  .sol-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    gap: 8px;
  }
  .sol-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .sol-header-title {
    font-size: 12px;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sol-header-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ── Kont card header */
  .sol-kont-card {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
  }
  .sol-kont-amount {
    font-family: monospace;
    font-weight: 900;
    font-size: 22px;
    margin: 0;
  }
  @media (max-width: 380px) {
    .sol-kont-amount { font-size: 18px; }
    .sol-pay-row { padding: 9px 12px; }
    .sol-tab-btn { font-size: 11px; padding: 9px 6px; }
  }
  @media (max-width: 320px) {
    .sol-kont-amount { font-size: 15px; }
    .sol-header { padding: 10px 11px; }
  }

  /* ── Calendar responsive */
  .sol-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  @media (max-width: 360px) {
    .sol-cal-grid { gap: 1px; }
  }
  .sol-cal-day {
    aspect-ratio: 1;
    border-radius: 7px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .sol-cal-day span {
    font-size: 10px;
  }
  @media (max-width: 360px) {
    .sol-cal-day span { font-size: 9px; }
  }
  @media (max-width: 300px) {
    .sol-cal-day span { font-size: 8px; }
  }

  /* ── Modal responsive */
  .sol-modal-sheet {
    background: #0d1b2a;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 440px;
    padding: 24px 18px 40px;
    max-height: 90vh;
    overflow-y: auto;
  }
  @media (min-width: 600px) {
    .sol-modal-sheet {
      border-radius: 16px;
      margin: 20px;
      max-height: 85vh;
    }
  }

  /* ── Pèfòmans badges wrap */
  .sol-score-row {
    display: flex;
    gap: 10px;
    font-size: 11px;
    flex-wrap: wrap;
  }
  @media (max-width: 320px) {
    .sol-score-row { gap: 7px; font-size: 10px; }
  }

  /* ── Alert banner */
  .sol-alert {
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  @media (max-width: 360px) {
    .sol-alert { padding: 10px 12px; gap: 8px; }
  }
`

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getPaymentDates(frequency, startDate, count) {
  const dates = []
  const parseDateLocal = (ds) => {
    if (!ds) return new Date()
    const parts = String(ds).split('T')[0].split('-').map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  const toKey = (d) => {
    const y   = d.getFullYear()
    const m   = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const cur = parseDateLocal(startDate)
  const advance = () => {
    switch (frequency) {
      case 'daily':
        cur.setDate(cur.getDate() + 1); break
      case 'weekly_saturday':
      case 'saturday':
        cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      case 'weekly_monday':
      case 'weekly':
        cur.setDate(cur.getDate() + ((1 - cur.getDay() + 7) % 7 || 7)); break
      case 'biweekly':
        cur.setDate(cur.getDate() + 14); break
      case 'monthly':
        cur.setMonth(cur.getMonth() + 1); break
      case 'weekdays':
        do { cur.setDate(cur.getDate() + 1) } while ([0, 6].includes(cur.getDay())); break
      default:
        cur.setDate(cur.getDate() + 1)
    }
  }
  dates.push(toKey(cur))
  for (let i = 1; i < count; i++) {
    advance()
    dates.push(toKey(new Date(cur)))
  }
  return dates
}

const FREQ_LABELS = {
  daily: 'Chak Jou', weekly_saturday: 'Chak Samdi', weekly_monday: 'Chak Lendi',
  biweekly: 'Chak 15 Jou', monthly: 'Chak Mwa', weekdays: 'Lendi-Vandredi',
  saturday: 'Chak Samdi', weekly: 'Chak Lendi',
}

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
function PayBadge({ paid }) {
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 20, fontWeight: 700, fontSize: 10,
      display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
      background: paid ? D.greenBg : D.redBg,
      color: paid ? D.green : D.red,
      whiteSpace: 'nowrap',
    }}>
      {paid ? <CheckCircle size={9} /> : <Clock size={9} />}
      {paid ? 'Peye' : 'Pa Peye'}
    </span>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#00d084' : score >= 50 ? D.orange : D.red
  const label = score >= 80 ? '⭐ Ekselans' : score >= 50 ? '⚠️ Mwayen' : '❌ Reta'
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 20, fontWeight: 700, fontSize: 11,
      background: `${color}18`, color, whiteSpace: 'nowrap',
    }}>{label} — {score}%</span>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL CHANJE MODPAS — Mobile-first
// ─────────────────────────────────────────────────────────────
function ModalChangePassword({ onClose, token }) {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.current || !form.next) return toast.error('Ranpli tout chan yo.')
    if (form.next.length < 4)        return toast.error('Modpas nouvo dwe gen omwen 4 karaktè.')
    if (form.next !== form.confirm)  return toast.error('Modpas yo pa menm.')
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erè')
      toast.success('Modpas chanje!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '12px 13px', borderRadius: 10, fontSize: 15,
    border: '1.5px solid rgba(255,255,255,0.09)',
    color: D.text, background: D.bg, fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="sol-modal-sheet">
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={16} style={{ color: D.gold }} /> Chanje Modpas
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Modpas Aktyèl',          key: 'current' },
            { label: 'Nouvo Modpas',            key: 'next'    },
            { label: 'Konfime Nouvo Modpas',    key: 'confirm' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                color: 'rgba(201,168,76,0.75)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{label}</label>
              <input
                type="password"
                className="sol-inp"
                style={inp}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="••••••"
                autoComplete={key === 'current' ? 'current-password' : 'new-password'}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '13px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${D.borderSub}`, background: 'transparent',
              color: D.muted, fontWeight: 700, fontSize: 14, minHeight: 48,
            }}>
              Anile
            </button>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 2, padding: '13px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn,
              color: '#0a1222', fontWeight: 800, fontSize: 14, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              minHeight: 48,
            }}>
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <Key size={15} />}
              {loading ? 'Ap chanje...' : 'Chanje Modpas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KALANDRIYE PÈSONÈL — Mobile responsive
// ─────────────────────────────────────────────────────────────
function SolCalendar({ dates, member, plan, today }) {
  const [offset, setOffset] = useState(0)

  const now = new Date()
  now.setMonth(now.getMonth() + offset)
  const year       = now.getFullYear()
  const month      = now.getMonth()
  const monthStr   = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth= new Date(year, month + 1, 0).getDate()
  const dateSet    = new Set(dates)

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px' }}>
      {/* Navigation mwa */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setOffset(o => o - 1)}
          style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#fff', textTransform: 'capitalize' }}>{monthStr}</span>
        <button
          onClick={() => setOffset(o => o + 1)}
          style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Tèt semèn */}
      <div className="sol-cal-grid" style={{ marginBottom: 4 }}>
        {['Di','Lu','Ma','Me','Je','Ve','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: D.muted, padding: '3px 0' }}>{d}</div>
        ))}
      </div>

      {/* Jou */}
      <div className="sol-cal-grid">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ aspectRatio: '1' }} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day    = i + 1
          const ds     = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday   = ds === today
          const isPayDay  = dateSet.has(ds)
          const paid      = !!member.payments?.[ds]
          const timing    = member.paymentTimings?.[ds]
          const isPast    = ds < today
          const isWinDay  = ds === dates[member.position - 1]

          let bg = 'transparent', border = 'transparent', color = isPast ? 'rgba(255,255,255,0.15)' : D.muted
          if      (isToday)                                          { bg = D.goldDim;                        border = D.gold;                    color = D.gold    }
          else if (isWinDay)                                         { bg = 'rgba(39,174,96,0.15)';           border = `${D.green}40`;            color = D.green   }
          else if (isPayDay && paid && timing === 'early')           { bg = 'rgba(0,208,132,0.15)';           border = 'rgba(0,208,132,0.4)';     color = '#00d084' }
          else if (isPayDay && paid)                                 { bg = D.greenBg;                        border = `${D.green}40`;            color = D.green   }
          else if (isPayDay && isPast)                               { bg = D.redBg;                          border = `${D.red}30`;              color = D.red     }
          else if (isPayDay)                                         { bg = D.blueBg;                         border = 'rgba(59,130,246,0.3)';    color = D.blue    }

          return (
            <div key={day} className="sol-cal-day" style={{ background: bg, border: `1px solid ${border}` }}>
              <span style={{ fontWeight: isPayDay || isToday ? 800 : 400, color }}>{day}</span>
              {isWinDay && <span style={{ fontSize: 7, lineHeight: 1 }}>🏆</span>}
            </div>
          )
        })}
      </div>

      {/* Lejann */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, fontSize: 9, color: D.muted }}>
        {[
          ['#00d084', 'Bonè'],
          [D.green,   'Peye'],
          [D.red,     'Pa Peye'],
          [D.blue,    'Pwochen'],
        ].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </span>
        ))}
        <span>🏆 Dat Touche</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL — Mobile-first responsive
// ═══════════════════════════════════════════════════════════════
export default function SolDashboardPage() {
  const navigate = useNavigate()
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [showChangePw, setShowChangePw] = useState(false)
  const [tab,          setTab]          = useState('history')

  // Enjekte styles
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'sol-dashboard-styles'
    el.textContent = GLOBAL_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('sol-dashboard-styles')?.remove()
  }, [])

  const token = localStorage.getItem('sol_token')
  // ── Anrejistre Service Worker + Push Subscription ──
useEffect(() => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const VAPID_PUBLIC_KEY = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
  }

  navigator.serviceWorker.register('/sw.js')
    .then(async reg => {
      // Mande pèmisyon notifikasyon
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      // Verifye si subscription deja egziste
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      // Voye subscription bay backend
      if (token) {
        await fetch(`${SOL_API}/api/sol/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: sub }),
        }).catch(() => {})
      }
    })
    .catch(err => console.warn('SW:', err.message))
}, [token])

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
    } catch {
      toast.error('Pa ka chaje done yo. Verifye koneksyon ou.')
    } finally {
      setLoading(false)
    }
  }, [token, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = () => {
    localStorage.removeItem('sol_token')
    localStorage.removeItem('sol_member')
    navigate('/app/sol/login')
    toast('Ou dekonekte', { icon: '👋' })
  }

  // ── Loading screen
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40,
          border: `3px solid ${D.goldDim}`, borderTopColor: D.gold,
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>Ap chaje kont ou...</p>
      </div>
    </div>
  )

  if (!data) return null

  const { member, plan, tenant } = data
  if (!member || !plan) return null

  // Today lokal (evite UTC offset bug Ayiti UTC-5)
  const todayLocal = new Date()
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`

  // ✅ Itilize activeMemberCount (dinamik) oswa maxMembers si plan fèmen
const activeMemberCount = data?.plan?.activeMemberCount || data?.plan?.maxMembers || 10

const dates       = getPaymentDates(plan.frequency, plan.createdAt, activeMemberCount)
const winDate     = dates[member.position - 1]
const totalPaid   = dates.filter(d => member.payments?.[d]).length
const totalDue    = dates.filter(d => d <= today).length
const amountPaid  = totalPaid * plan.amount
const amountDue   = totalDue  * plan.amount
const payout      = (plan.amount * activeMemberCount) - (plan.feePerMember || plan.fee || 0)
const progress    = activeMemberCount > 0 ? (totalPaid / activeMemberCount) * 100 : 0
const isWinner    = winDate === today

// ✅ Tout men manm nan (allSlots)
const allSlots    = member.allSlots || [{ id: member.id, position: member.position, payments: member.payments, paymentTimings: member.paymentTimings }]

  // Skò pèfòmans
  const timings  = Object.values(member.paymentTimings || {})
  const scoreData = timings.length ? (() => {
    const early  = timings.filter(t => t === 'early').length
    const onTime = timings.filter(t => t === 'onTime').length
    const late   = timings.filter(t => t === 'late').length
    const score  = Math.round(((early * 2 + onTime) / (timings.length * 2)) * 100)
    return { score, early, onTime, late }
  })() : null

  const timingBadge = (timing) => {
    if (timing === 'early')  return <span style={{ fontSize: 9, background: 'rgba(0,208,132,0.15)', color: '#00d084', padding: '2px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>⚡ Bonè</span>
    if (timing === 'onTime') return <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '2px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>✅ Atètan</span>
    if (timing === 'late')   return <span style={{ fontSize: 9, background: D.orangeBg, color: D.orange, padding: '2px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>⚠️ Reta</span>
    return null
  }

  const nextUnpaidDate = dates.find(d => d >= today && !member.payments?.[d])

  return (
    <div style={{
      minHeight: '100vh', background: D.bg,
      fontFamily: 'DM Sans, sans-serif',
      paddingBottom: 60,
    }}>

      {/* ── HEADER sticky */}
      <div style={{
        background: D.card,
        borderBottom: `1px solid ${D.border}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div className="sol-header">
          <div className="sol-header-left">
            {tenant?.logoUrl
              ? <img src={tenant.logoUrl} style={{ height: 30, borderRadius: 7, objectFit: 'contain', flexShrink: 0 }} alt="logo" />
              : <div style={{ width: 30, height: 30, borderRadius: 7, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>🏦</span>
                </div>}
            <div style={{ minWidth: 0 }}>
              <div className="sol-header-title">{tenant?.businessName || tenant?.name || 'Sol Ou'}</div>
              <div style={{ fontSize: 10, color: D.muted }}>Kont Sabotay</div>
            </div>
          </div>
          <div className="sol-header-actions">
            <button
              onClick={fetchData}
              title="Aktualize"
              style={{ width: 36, height: 36, minWidth: 36, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleLogout}
              title="Dekonekte"
              style={{ width: 36, height: 36, minWidth: 36, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KONTNI */}
      <div style={{
        maxWidth: 500, margin: '0 auto',
        padding: '14px 12px',
        animation: 'fadeUp 0.3s ease',
      }}>

        {/* ALÈT: TOUCHE JODI A */}
        {isWinner && (
          <div className="sol-alert" style={{
            background: 'linear-gradient(135deg,rgba(39,174,96,0.2),rgba(201,168,76,0.12))',
            border: `1px solid ${D.green}50`,
          }}>
            <div style={{
              width: 44, height: 44, minWidth: 44, borderRadius: 12,
              background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={20} color="#0a1222" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: D.green, margin: '0 0 2px' }}>🎉 Se Jou Ou Jodi a!</p>
              <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>
                Ou ap touche: <span style={{ color: D.gold, fontWeight: 800 }}>{fmt(payout)} HTG</span>
              </p>
            </div>
          </div>
        )}

        {/* ALÈT: PWOCHEN PEMAN */}
        {nextUnpaidDate && !isWinner && (() => {
          const daysUntil = Math.ceil((new Date(nextUnpaidDate) - new Date(today)) / 86400000)
          if (daysUntil > 3) return null
          return (
            <div className="sol-alert" style={{
              background: D.orangeBg,
              border: `1px solid ${D.orange}40`,
            }}>
              <Bell size={18} style={{ color: D.orange, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#7a4e00', fontWeight: 800, margin: 0, flex: 1, minWidth: 0 }}>
                {daysUntil === 0
                  ? 'Peman ou a se jodi a!'
                  : `Peman pwochèn ou a nan ${daysUntil} jou — ${nextUnpaidDate.split('-').reverse().join('/')}`}
              </p>
            </div>
          )
        })()}

        {/* KONT HEADER CARD */}
        <div style={{
          background: D.goldBtn, borderRadius: 18,
          padding: '18px 16px', marginBottom: 14, color: '#0a1222',
        }}>
          <div className="sol-kont-card">
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 900, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.name}
              </p>
              <p style={{ fontSize: 11, opacity: 0.65, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.phone}
              </p>
              <p style={{ fontSize: 11, opacity: 0.6, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Pozisyon #{member.position} • {plan.name}
                {allSlots.length > 1 && (
  <p style={{ fontSize: 10, opacity: 0.7, margin: '3px 0 0' }}>
    {allSlots.length} men • Peye {fmt(allSlots.length * plan.amount)} HTG/sik
  </p>
)}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 9, opacity: 0.6, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Kontribisyon</p>
              <p className="sol-kont-amount">{fmt(amountPaid)} HTG</p>
              <p style={{ fontSize: 10, opacity: 0.55, margin: '2px 0 0' }}>{totalPaid}/{plan.maxMembers} peman</p>
            </div>
          </div>
        </div>

        {/* STATS GRID — 2 kolòn */}
        <div className="sol-stats-grid">
          {[
            { label: 'Rès pou Peye', val: `${fmt(Math.max(0, amountDue - amountPaid))} HTG`, color: D.red  },
            ...allSlots.map(slot => ({
  label: `🏆 Men #${slot.position}`,
  val:   `${fmt(payout)} HTG • ${dates[slot.position - 1]?.split('-').reverse().join('/') || '—'}`,
  color: D.gold,
})),
            { label: 'Frekans',      val: FREQ_LABELS[plan.frequency] || plan.frequency,      color: D.muted},
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: D.card, border: `1px solid ${D.border}`,
              borderRadius: 12, padding: '11px 12px',
            }}>
              <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color, wordBreak: 'break-word', lineHeight: 1.3 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* PWOGRÈ */}
        <div style={{
          background: D.card, border: `1px solid ${D.border}`,
          borderRadius: 14, padding: '14px 15px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase' }}>Pwogrè Sol</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: D.gold }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: D.goldBtn, borderRadius: 8, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: D.muted }}>
            <span>{totalPaid} peman fèt</span>
            <span>{plan.maxMembers - totalPaid} rès</span>
          </div>
        </div>

        {/* PÈFÒMANS */}
        {scoreData && (
          <div style={{
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 14, padding: '13px 15px', marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: D.blue, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={11} /> Pèfòmans Ou
              </span>
              <ScoreBadge score={scoreData.score} />
            </div>
            <div className="sol-score-row">
              <span style={{ color: '#00d084', fontWeight: 700 }}>⚡ {scoreData.early} bonè</span>
              <span style={{ color: D.green,   fontWeight: 700 }}>✅ {scoreData.onTime} atètan</span>
              <span style={{ color: D.orange,  fontWeight: 700 }}>⚠️ {scoreData.late} reta</span>
            </div>
          </div>
        )}

    {/* REGLEMAN SOL */}
        {plan.regleman && (
          <div style={{
            background: 'rgba(20,184,166,0.06)',
            border: '1px solid rgba(20,184,166,0.18)',
            borderRadius: 14, padding: '13px 15px', marginBottom: 14,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 800, color: '#14b8a6',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📜 Regleman Sol la
            </p>
            <p style={{
              fontSize: 12, color: '#94a3b8', margin: 0,
              lineHeight: 1.8, whiteSpace: 'pre-line',
            }}>
              {plan.regleman}
            </p>
          </div>
        )}

        {/* TABS — plein lajè */}
        <div className="sol-tabs">
         {[['history', '📋 Istwa'], ['calendar', '📅 Kalandriye'], ['exchange', '🔄 Mache']].map(([t, l]) => (
            <button
              key={t}
              className="sol-tab-btn"
              onClick={() => setTab(t)}
              style={{
                border:      `1px solid ${tab === t ? D.gold : D.borderSub}`,
                background:  tab === t ? D.goldDim : 'transparent',
                color:       tab === t ? D.gold : D.muted,
                fontFamily: 'inherit',
              }}
            >{l}</button>
          ))}
        </div>

        {/* ISTWA PEMAN */}
        {tab === 'history' && (
          <div style={{
            background: D.card, border: `1px solid ${D.border}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Istwa Peman ({totalPaid}/{dates.length})
              </p>
            </div>
            <div className="sol-scroll" style={{ maxHeight: 380, overflowY: 'auto' }}>
              {dates.map((d, i) => {
                const paid   = !!member.payments?.[d]
                const timing = member.paymentTimings?.[d]
                const isPast = d <= today
                const isWin  = i === member.position - 1
                return (
                  <div key={d} className="sol-pay-row" style={{
                    background: isWin ? D.goldDim : (d === today ? 'rgba(201,168,76,0.04)' : 'transparent'),
                  }}>
                    {/* Gòch — dat + badges */}
                    <div className="sol-pay-left">
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: isPast ? D.text : D.muted, flexShrink: 0 }}>
                        {d.split('-').reverse().join('/')}
                      </span>
                      {isWin && <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '2px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>🏆</span>}
                      {d === today && !isWin && <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.15)', color: D.blue, padding: '2px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>Jodi</span>}
                      {paid && timingBadge(timing)}
                    </div>
                    {/* Dwat — montan + badge */}
                    <div className="sol-pay-right">
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: paid ? D.green : (isPast ? D.red : D.muted), whiteSpace: 'nowrap' }}>
                        {paid ? `+${fmt(plan.amount)}` : isPast ? `-${fmt(plan.amount)}` : fmt(plan.amount)} HTG
                      </span>
                      {isPast && <PayBadge paid={paid} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* KALANDRIYE */}
        {tab === 'calendar' && (
          <SolCalendar dates={dates} member={member} plan={plan} today={today} />
        )}

        {/* MACHE ECHANJ */}
        {tab === 'exchange' && (
          <SolExchangeMarket token={token} member={member} plan={plan} />
        )}

         {/* BOUTON CHANJE MODPAS */}
        <button
          onClick={() => setShowChangePw(true)}
          style={{
            marginTop: 16, width: '100%', padding: '14px',
            borderRadius: 12, border: `1px solid rgba(155,89,182,0.25)`,
            background: 'rgba(155,89,182,0.06)', color: '#9b59b6',
            cursor: 'pointer', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            minHeight: 48, fontFamily: 'inherit',
          }}
        >
          <Key size={14} /> Chanje Modpas
        </button>

      </div>

      {showChangePw && (
        <ModalChangePassword token={token} onClose={() => setShowChangePw(false)} />
      )}
    </div>
  )
}
