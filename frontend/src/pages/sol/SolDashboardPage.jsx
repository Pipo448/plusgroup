// src/pages/sol/SolDashboardPage.jsx
// Tableau de bord manm Sabotay Sol
// Wout: /app/sol/dashboard

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LogOut, RefreshCw, Trophy, CheckCircle, Clock, Star, Bell, Key,
} from 'lucide-react'

const D = {
  bg:       '#060f1e',
  card:     '#0d1b2a',
  border:   'rgba(201,168,76,0.18)',
  borderSub:'rgba(255,255,255,0.07)',
  gold:     '#C9A84C',
  goldBtn:  'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:  'rgba(201,168,76,0.10)',
  green:    '#27ae60', greenBg: 'rgba(39,174,96,0.12)',
  red:      '#e74c3c', redBg:   'rgba(231,76,60,0.10)',
  orange:   '#f39c12', orangeBg:'rgba(243,156,18,0.10)',
  blue:     '#3B82F6', blueBg:  'rgba(59,130,246,0.10)',
  text:     '#e8eaf0',
  muted:    '#6b7a99',
}

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getPaymentDates(frequency, startDate, count) {
  const dates = []
  // ✅ Fix timezone: parse 'YYYY-MM-DD' lokal pou evite UTC offset bug (Ayiti UTC-5)
  const parseDateLocal = (ds) => {
    if (!ds) return new Date()
    const parts = String(ds).split('T')[0].split('-').map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2]) // lokal, pa UTC
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
      // ✅ Support 'weekly_saturday' (SabotayPage) ak 'saturday' (schema komantè)
      case 'weekly_saturday':
      case 'saturday':
        cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      // ✅ Support 'weekly_monday' (SabotayPage) ak 'weekly' (schema komantè)
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
}

function PayBadge({ paid }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 10,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: paid ? D.greenBg : D.redBg,
      color: paid ? D.green : D.red,
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
      padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11,
      background: `${color}18`, color,
    }}>{label} — {score}%</span>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL CHANJE MODPAS
// ─────────────────────────────────────────────────────────────
function ModalChangePassword({ onClose, token }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.current || !form.next) return toast.error('Ranpli tout chan yo.')
    if (form.next.length < 4) return toast.error('Modpas nouvo dwe gen omwen 4 karaktè.')
    if (form.next !== form.confirm) return toast.error('Modpas yo pa menm.')
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
    width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none',
    color: D.text, background: D.bg, fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: D.card, border: `1px solid ${D.border}`,
        borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420,
        padding: '24px 20px 36px',
      }}>
        <style>{`input::placeholder { color: #2a3a54 } @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 20px' }}>
          🔑 Chanje Modpas
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Modpas Aktyèl', key: 'current' },
            { label: 'Nouvo Modpas', key: 'next' },
            { label: 'Konfime Nouvo Modpas', key: 'confirm' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(201,168,76,0.75)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
              <input type="password" style={inp} value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="••••••" />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>
              Anile
            </button>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              opacity: loading ? 0.6 : 1,
            }}>
              {loading
                ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <Key size={14} />}
              {loading ? 'Ap chanje...' : 'Chanje Modpas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function SolDashboardPage() {
  const navigate = useNavigate()
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showChangePw, setShowChangePw] = useState(false)
  const [tab,         setTab]         = useState('history') // 'history' | 'calendar'

  const token = localStorage.getItem('sol_token')

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
    } catch (err) {
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

  // ── Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${D.goldDim}`, borderTopColor: D.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: D.muted, fontSize: 13 }}>Ap chaje kont ou...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!data) return null

  const { member, plan, tenant } = data
  // ✅ today an dat lokal (pa UTC) — evite bug lè li 11pm Ayiti (UTC-5)
  const todayLocal = new Date()
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`
  const dates = getPaymentDates(plan.frequency, plan.createdAt, plan.maxMembers)
  const winDate = dates[member.position - 1]

  const totalPaid   = dates.filter(d => member.payments?.[d]).length
  const totalDue    = dates.filter(d => d <= today).length
  const amountPaid  = totalPaid * plan.amount
  const amountDue   = totalDue  * plan.amount
  const payout      = (plan.amount * plan.maxMembers) - (plan.fee || 0)
  const progress    = plan.maxMembers > 0 ? (totalPaid / plan.maxMembers) * 100 : 0
  const isWinner    = winDate === today

  // Pèfòmans skò
  const timings = Object.values(member.paymentTimings || {})
  const scoreData = timings.length ? (() => {
    const early  = timings.filter(t => t === 'early').length
    const onTime = timings.filter(t => t === 'onTime').length
    const late   = timings.filter(t => t === 'late').length
    const score  = Math.round(((early * 2 + onTime * 1) / (timings.length * 2)) * 100)
    return { score, early, onTime, late }
  })() : null

  const timingBadge = (timing) => {
    if (timing === 'early')  return <span style={{ fontSize: 9, background: 'rgba(0,208,132,0.15)', color: '#00d084', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>⚡ Bonè</span>
    if (timing === 'onTime') return <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>✅ Atètan</span>
    if (timing === 'late')   return <span style={{ fontSize: 9, background: D.orangeBg, color: D.orange, padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>⚠️ Reta</span>
    return null
  }

  // Pwochen dat peman
  const nextUnpaidDate = dates.find(d => d >= today && !member.payments?.[d])

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: 'DM Sans, sans-serif', paddingBottom: 60 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── HEADER */}
      <div style={{
        background: D.card, borderBottom: `1px solid ${D.border}`,
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tenant?.logoUrl
            ? <img src={tenant.logoUrl} style={{ height: 32, borderRadius: 8, objectFit: 'contain' }} />
            : <div style={{ width: 32, height: 32, borderRadius: 8, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14 }}>🏦</span>
              </div>}
          <div>
            {/* ✅ backend voye { ...tenant, businessName: tenant.name } kòm aliyas */}
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{tenant?.businessName || tenant?.name || 'Sol Ou'}</div>
            <div style={{ fontSize: 10, color: D.muted }}>Kont Sabotay</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchData} title="Aktualize" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={handleLogout} title="Dekonekte" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 14px', animation: 'fadeUp 0.3s ease' }}>

        {/* ── ALÈT: TOUCHE JODI A */}
        {isWinner && (
          <div style={{ background: 'linear-gradient(135deg,rgba(39,174,96,0.2),rgba(201,168,76,0.12))', border: `1px solid ${D.green}50`, borderRadius: 16, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trophy size={22} color="#0a1222" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: D.green, margin: '0 0 3px' }}>🎉 Se Jou Ou Jodi a!</p>
              <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>
                Ou ap touche: <span style={{ color: D.gold, fontWeight: 800 }}>{fmt(payout)} HTG</span>
              </p>
            </div>
          </div>
        )}

        {/* ── ALÈT: PWOCHEN PEMAN */}
        {nextUnpaidDate && !isWinner && (() => {
          const daysUntil = Math.ceil((new Date(nextUnpaidDate) - new Date(today)) / 86400000)
          if (daysUntil <= 3) return (
            <div style={{ background: D.orangeBg, border: `1px solid ${D.orange}40`, borderRadius: 14, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={18} style={{ color: D.orange, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: D.orange, fontWeight: 700, margin: 0 }}>
                {daysUntil === 0 ? "Peman ou a se jodi a!" : `Peman pwochèn ou a nan ${daysUntil} jou — ${nextUnpaidDate.split('-').reverse().join('/')}`}
              </p>
            </div>
          )
        })()}

        {/* ── KONT HEADER */}
        <div style={{ background: D.goldBtn, borderRadius: 18, padding: '20px', marginBottom: 16, color: '#0a1222' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 900, margin: '0 0 2px' }}>{member.name}</p>
              <p style={{ fontSize: 11, opacity: 0.65, margin: '0 0 1px' }}>{member.phone}</p>
              <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>Pozisyon #{member.position} • {plan.name}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, opacity: 0.6, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Kontribisyon</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, margin: 0 }}>{fmt(amountPaid)} HTG</p>
              <p style={{ fontSize: 10, opacity: 0.55, margin: '2px 0 0' }}>{totalPaid}/{plan.maxMembers} peman</p>
            </div>
          </div>
        </div>

        {/* ── STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Rès pou Peye', val: `${fmt(Math.max(0, amountDue - amountPaid))} HTG`, color: D.red },
            { label: 'Ap Touche', val: `${fmt(payout)} HTG`, color: D.gold },
            { label: 'Dat Touche', val: winDate ? winDate.split('-').reverse().join('/') : '—', color: D.blue },
            { label: 'Frekans', val: FREQ_LABELS[plan.frequency] || plan.frequency, color: D.muted },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* ── PWOGRÈ */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase' }}>Pwogrè Sol</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: D.gold }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: D.goldBtn, borderRadius: 8, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: D.muted }}>
            <span>{totalPaid} peman fèt</span>
            <span>{plan.maxMembers - totalPaid} rès</span>
          </div>
        </div>

        {/* ── PÈFÒMANS */}
        {scoreData && (
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: D.blue, textTransform: 'uppercase' }}>
                <Star size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Pèfòmans Ou
              </span>
              <ScoreBadge score={scoreData.score} />
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: '#00d084', fontWeight: 700 }}>⚡ {scoreData.early} bonè</span>
              <span style={{ color: D.green, fontWeight: 700 }}>✅ {scoreData.onTime} atètan</span>
              <span style={{ color: D.orange, fontWeight: 700 }}>⚠️ {scoreData.late} reta</span>
            </div>
          </div>
        )}

        {/* ── TABS: ISTWA / KALANDRIYE */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['history', '📋 Istwa'], ['calendar', '📅 Kalandriye']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              border: `1px solid ${tab === t ? D.gold : D.borderSub}`,
              background: tab === t ? D.goldDim : 'transparent',
              color: tab === t ? D.gold : D.muted,
            }}>{l}</button>
          ))}
        </div>

        {/* ── ISTWA PEMAN */}
        {tab === 'history' && (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Istwa Peman ({totalPaid}/{dates.length})
              </p>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {dates.map((d, i) => {
                const paid   = !!member.payments?.[d]
                const timing = member.paymentTimings?.[d]
                const isPast = d <= today
                const isWin  = i === member.position - 1
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: isWin ? D.goldDim : (d === today ? 'rgba(201,168,76,0.04)' : 'transparent'),
                    borderBottom: `1px solid ${D.borderSub}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: isPast ? D.text : D.muted }}>
                        {d.split('-').reverse().join('/')}
                      </span>
                      {isWin && <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>🏆 Touche</span>}
                      {d === today && !isWin && <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.15)', color: D.blue, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>Jodi</span>}
                      {paid && timingBadge(timing)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: paid ? D.green : (isPast ? D.red : D.muted) }}>
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

        {/* ── KALANDRIYE */}
        {tab === 'calendar' && <SolCalendar dates={dates} member={member} plan={plan} today={today} />}

        {/* ── BOUTON CHANJE MODPAS */}
        <button
          onClick={() => setShowChangePw(true)}
          style={{
            marginTop: 16, width: '100%', padding: '12px', borderRadius: 12,
            border: `1px solid rgba(155,89,182,0.25)`,
            background: 'rgba(155,89,182,0.06)', color: '#9b59b6',
            cursor: 'pointer', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
          <Key size={14} /> Chanje Modpas
        </button>

      </div>

      {showChangePw && <ModalChangePassword token={token} onClose={() => setShowChangePw(false)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KALANDRIYE PÈSONÈL MANM
// ─────────────────────────────────────────────────────────────
function SolCalendar({ dates, member, plan, today }) {
  const [offset, setOffset] = useState(0)

  const now = new Date()
  now.setMonth(now.getMonth() + offset)
  const year  = now.getFullYear()
  const month = now.getMonth()
  const monthStr = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dateSet = new Set(dates)

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>‹</button>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#fff', textTransform: 'capitalize' }}>{monthStr}</span>
        <button onClick={() => setOffset(o => o + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['Di','Lu','Ma','Me','Je','Ve','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: D.muted, padding: '3px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ aspectRatio: '1' }} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = ds === today
          const isPayDay = dateSet.has(ds)
          const paid = !!member.payments?.[ds]
          const timing = member.paymentTimings?.[ds]
          const isPast = ds < today
          const isWinDay = ds === dates[member.position - 1]

          let bg = 'transparent', border = 'transparent', color = isPast ? 'rgba(255,255,255,0.2)' : D.muted
          if (isToday)                       { bg = D.goldDim; border = D.gold; color = D.gold }
          else if (isWinDay)                 { bg = 'rgba(39,174,96,0.15)'; border = `${D.green}40`; color = D.green }
          else if (isPayDay && paid && timing === 'early')  { bg = 'rgba(0,208,132,0.15)'; border = 'rgba(0,208,132,0.4)'; color = '#00d084' }
          else if (isPayDay && paid)         { bg = D.greenBg; border = `${D.green}40`; color = D.green }
          else if (isPayDay && isPast)       { bg = D.redBg; border = `${D.red}30`; color = D.red }
          else if (isPayDay)                 { bg = D.blueBg; border = 'rgba(59,130,246,0.3)'; color = D.blue }

          return (
            <div key={day} style={{ aspectRatio: '1', borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}` }}>
              <span style={{ fontSize: 10, fontWeight: isPayDay || isToday ? 800 : 400, color }}>{day}</span>
              {isWinDay && <span style={{ fontSize: 7 }}>🏆</span>}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 9, color: D.muted }}>
        <span><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d084', display: 'inline-block', marginRight: 3 }} />Bonè</span>
        <span><span style={{ width: 7, height: 7, borderRadius: '50%', background: D.green, display: 'inline-block', marginRight: 3 }} />Peye</span>
        <span><span style={{ width: 7, height: 7, borderRadius: '50%', background: D.red, display: 'inline-block', marginRight: 3 }} />Pa Peye</span>
        <span><span style={{ width: 7, height: 7, borderRadius: '50%', background: D.blue, display: 'inline-block', marginRight: 3 }} />Pwochen</span>
        <span>🏆 Dat Ou Touche</span>
      </div>
    </div>
  )
}
