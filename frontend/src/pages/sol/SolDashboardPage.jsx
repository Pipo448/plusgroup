// src/pages/sol/SolDashboardPage.jsx
// Tableau de bord manm Sabotay Sol — Design Pwofesyonèl v2
// Wout: /app/sol/dashboard

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LogOut, RefreshCw, Trophy, CheckCircle, Clock, Star, Bell, Key,
  ChevronLeft, ChevronRight, Wallet, TrendingUp, CreditCard, Shield,
} from 'lucide-react'
import SolExchangeMarket from '../../components/SolExchangeMarket'

const D = {
  bg:        '#04090f',
  bgGrad: 'radial-gradient(ellipse at 15% 0%, #0d1f3c 0%, #04090f 55%), radial-gradient(ellipse at 85% 100%, #1a0a2e 0%, transparent 50%)',
  card:      '#0a1520',
  cardHov:   '#0f1e2e',
  border:    'rgba(201,168,76,0.15)',
  borderSub: 'rgba(255,255,255,0.06)',
  gold:      '#C9A84C',
  goldLight: '#E8C87A',
  goldBtn:   'linear-gradient(135deg,#E8C87A 0%,#C9A84C 50%,#8B6914 100%)',
  goldDim:   'rgba(201,168,76,0.08)',
  green:     '#22c55e', greenBg: 'rgba(34,197,94,0.10)',
  red:       '#ef4444', redBg:   'rgba(239,68,68,0.10)',
  orange:    '#f59e0b', orangeBg:'rgba(245,158,11,0.10)',
  blue:      '#60a5fa', blueBg:  'rgba(96,165,250,0.10)',
  teal:      '#14b8a6', tealBg:  'rgba(20,184,166,0.08)',
  text:      '#f0f4ff',
  muted:     '#5a6a82',
  mutedLt:   '#8899aa',
}

const GLOBAL_STYLES = `
 @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
  html { scroll-behavior: smooth; }
  .sol-root { min-height: 100vh; background: ${D.bgGrad}; font-family: 'Plus Jakarta Sans', sans-serif; color: ${D.text}; }
  .sol-layout { display: flex; min-height: 100vh; }
  .sol-sidebar {
    width: 260px; flex-shrink: 0;
    background: linear-gradient(180deg, #071528 0%, #04090f 100%);
    border-right: 1px solid ${D.border};
    position: sticky; top: 0; height: 100vh;
    display: flex; flex-direction: column;
    padding: 28px 20px;
    backdrop-filter: blur(20px);
    overflow-y: auto;
  }
  .sol-main { flex: 1; min-width: 0; padding: 36px 48px; max-width: 900px; }
  @media (max-width: 1000px) { .sol-main { padding: 28px 32px; } }
  @media (max-width: 900px) { .sol-sidebar { display: none !important; } .sol-main { padding: 16px 14px; max-width: 100%; } }
  .sol-mobile-header {
    display: none; align-items: center; justify-content: space-between;
    padding: 14px 16px;
    background: rgba(8,16,26,0.98);
    border-bottom: 1px solid ${D.border};
    position: sticky; top: 0; z-index: 50;
    backdrop-filter: blur(20px);
  }
  @media (max-width: 900px) { .sol-mobile-header { display: flex; } }
  .sol-hero {
   background: linear-gradient(145deg, #0f2040 0%, #0c1a30 40%, #091520 100%);
border: 1px solid rgba(201,168,76,0.22);
    border: 1px solid ${D.border};
    border-radius: 24px; padding: 36px; margin-bottom: 24px;
    position: relative; overflow: hidden;
  }
  .sol-hero::before {
    content: ''; position: absolute; top: -80px; right: -80px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  @media (max-width: 900px) { .sol-hero { padding: 20px; border-radius: 18px; margin-bottom: 16px; } }
  .sol-stats-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 14px; margin-bottom: 20px;
  }
  @media (max-width: 900px) { .sol-stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; } }
  @media (max-width: 380px) { .sol-stats-grid { grid-template-columns: 1fr; } }
  .sol-stat-card {
    background: ${D.card}; border: 1px solid ${D.border};
    border-radius: 18px; padding: 20px 22px;
    transition: all 0.2s ease;
  }
  .sol-stat-card:hover { background: ${D.cardHov}; border-color: rgba(201,168,76,0.3); transform: translateY(-2px); }
  @media (max-width: 900px) { .sol-stat-card { padding: 14px 15px; border-radius: 14px; } }
  .sol-tabs {
    display: flex; gap: 4px;
    background: rgba(255,255,255,0.03);
    border: 1px solid ${D.borderSub};
    border-radius: 14px; padding: 4px; margin-bottom: 20px;
  }
  .sol-tab-btn {
    flex: 1; padding: 11px 12px; border-radius: 11px;
    cursor: pointer; font-size: 13px; font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif; text-align: center;
    transition: all 0.18s ease; border: none; white-space: nowrap;
  }
  @media (max-width: 400px) { .sol-tab-btn { font-size: 11px; padding: 9px 6px; } }
  .sol-pay-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 22px; border-bottom: 1px solid rgba(255,255,255,0.04);
    gap: 10px; transition: background 0.15s;
  }
  .sol-pay-row:hover { background: rgba(255,255,255,0.02); }
  .sol-pay-row:last-child { border-bottom: none; }
  @media (max-width: 900px) { .sol-pay-row { padding: 10px 14px; } }
  .sol-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  @media (max-width: 380px) { .sol-cal-grid { gap: 2px; } }
  .sol-cal-day {
    aspect-ratio: 1; border-radius: 9px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .sol-modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.88); backdrop-filter: blur(10px);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  @media (min-width: 600px) { .sol-modal-overlay { align-items: center; } }
  .sol-modal-sheet {
    background: linear-gradient(160deg, #0f1e30 0%, #0a1520 100%);
    border: 1px solid ${D.border};
    border-radius: 24px 24px 0 0;
    width: 100%; max-width: 520px;
    padding: 28px 26px 48px; max-height: 92vh; overflow-y: auto;
    animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  @media (min-width: 600px) { .sol-modal-sheet { border-radius: 24px; animation: fadeUp 0.25s ease; } }
  .sol-modal-sheet::-webkit-scrollbar { width: 3px; }
  .sol-modal-sheet::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
  .sol-scroll::-webkit-scrollbar { width: 3px; }
  .sol-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.15); border-radius: 2px; }
  .sol-inp::placeholder { color: #2a3a54; }
  .sol-inp:focus { border-color: rgba(201,168,76,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
  .sol-alert { border-radius: 18px; padding: 18px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; animation: fadeUp 0.3s ease; }
  @media (max-width: 900px) { .sol-alert { padding: 13px 15px; gap: 10px; border-radius: 14px; margin-bottom: 14px; } }
  button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .sol-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 10px;
    cursor: pointer; font-size: 13px; font-weight: 600;
    color: ${D.muted}; transition: all 0.15s; border: 1px solid transparent;
    background: transparent; width: 100%; text-align: left;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .sol-nav-item:hover { background: rgba(255,255,255,0.04); color: ${D.text}; }
  .sol-nav-item.active { background: ${D.goldDim}; color: ${D.gold}; border-color: ${D.border}; }
  .sol-score-row { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; }
  @media (max-width: 400px) { .sol-score-row { gap: 8px; font-size: 11px; } }
  .sol-progress-track { height: 6px; border-radius: 6px; background: rgba(255,255,255,0.06); overflow: hidden; }
  .sol-progress-fill { height: 100%; border-radius: 6px; background: ${D.goldBtn}; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
  .sol-mobile-actions { display: none; }
  @media (max-width: 900px) { .sol-mobile-actions { display: flex; flex-direction: column; padding: 0 0 50px; gap: 10px; margin-top: 16px; } }
`

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

function getPaymentDates(frequency, startDate, count) {
  const dates = []
  const parseDateLocal = (ds) => {
    if (!ds) return new Date()
    const parts = String(ds).split('T')[0].split('-').map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  const toKey = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const cur = parseDateLocal(startDate)
  const advance = () => {
    switch (frequency) {
      case 'daily': cur.setDate(cur.getDate() + 1); break
      case 'weekly_saturday': case 'saturday':
        cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      case 'weekly_monday': case 'weekly':
        cur.setDate(cur.getDate() + ((1 - cur.getDay() + 7) % 7 || 7)); break
      case 'biweekly': cur.setDate(cur.getDate() + 14); break
      case 'monthly': cur.setMonth(cur.getMonth() + 1); break
      case 'weekdays':
        do { cur.setDate(cur.getDate() + 1) } while ([0, 6].includes(cur.getDay())); break
      default: cur.setDate(cur.getDate() + 1)
    }
  }
  dates.push(toKey(cur))
  for (let i = 1; i < count; i++) { advance(); dates.push(toKey(new Date(cur))) }
  return dates
}

const FREQ_LABELS = {
  daily: 'Chak Jou', weekly_saturday: 'Chak Samdi', weekly_monday: 'Chak Lendi',
  biweekly: 'Chak 15 Jou', monthly: 'Chak Mwa', weekdays: 'Lendi-Vandredi',
  saturday: 'Chak Samdi', weekly: 'Chak Lendi',
}

function PayBadge({ paid }) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 20, fontWeight: 700, fontSize: 10,
      display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
      background: paid ? D.greenBg : D.redBg, color: paid ? D.green : D.red,
      whiteSpace: 'nowrap', border: `1px solid ${paid ? D.green : D.red}25`,
    }}>
      {paid ? <CheckCircle size={9} /> : <Clock size={9} />}
      {paid ? 'Peye' : 'Pa Peye'}
    </span>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? D.orange : D.red
  const label = score >= 80 ? '⭐ Ekselans' : score >= 50 ? '⚠️ Mwayen' : '❌ Reta'
  return (
    <span style={{ padding: '4px 11px', borderRadius: 20, fontWeight: 700, fontSize: 11, background: `${color}15`, color, whiteSpace: 'nowrap', border: `1px solid ${color}30` }}>
      {label} — {score}%
    </span>
  )
}

function ModalChangePassword({ onClose, token }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const handleSubmit = async () => {
    if (!form.current || !form.next) return toast.error('Ranpli tout chan yo.')
    if (form.next.length < 4) return toast.error('Omwen 4 karaktè.')
    if (form.next !== form.confirm) return toast.error('Modpas yo pa menm.')
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erè')
      toast.success('Modpas chanje!'); onClose()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }
  const inp = { width: '100%', padding: '13px 15px', borderRadius: 12, fontSize: 15, border: '1.5px solid rgba(255,255,255,0.08)', color: D.text, background: 'rgba(255,255,255,0.04)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }
  return (
    <div className="sol-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sol-modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 6 }}>Chanje Modpas</h2>
        <p style={{ fontSize: 13, color: D.muted, marginBottom: 26, lineHeight: 1.6 }}>Sekirize kont ou ak yon nouvo modpas solid.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[{ label: 'Modpas Aktyèl', key: 'current' }, { label: 'Nouvo Modpas', key: 'next' }, { label: 'Konfime Nouvo Modpas', key: 'confirm' }].map(({ label, key }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: D.gold, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
              <input type="password" className="sol-inp" style={inp} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder="••••••" autoComplete={key === 'current' ? 'current-password' : 'new-password'} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, fontWeight: 600, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>Anile</button>
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn, color: '#0a0a00', fontWeight: 800, fontSize: 14, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif' }}>
              {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <Key size={15} />}
              {loading ? 'Ap chanje...' : 'Chanje Modpas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalPayMobile({ onClose }) {
  const payCard = (color, icon, title, subtitle, numero, nom) => (
    <div style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`, border: `1px solid ${color}30`, borderRadius: 20, padding: '22px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, borderRadius: 13, width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20, boxShadow: `0 4px 20px ${color}40` }}>{icon}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color, fontFamily: 'Syne, sans-serif' }}>{title}</div>
          <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 13, padding: '13px 15px' }}>
          <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Nimewo</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 14, color: '#fff', letterSpacing: '0.04em' }}>{numero}</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 13, padding: '13px 15px' }}>
          <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Non</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{nom}</div>
        </div>
      </div>
    </div>
  )
  return (
    <div className="sol-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sol-modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 6 }}>📱 Peye pa Mobil Moni</h2>
        <p style={{ fontSize: 13, color: D.muted, marginBottom: 24, lineHeight: 1.7 }}>Voye kòb la epi voye yon kopi resi ou a bay admin pou konfime peman ou.</p>
        {payCard('#dc2626', '▶', 'Digicel MonCash', 'Mobil Moni Digicel', '+509 31 33 87 85', 'Dasner JEAN')}
        {payCard('#ea580c', 'nat', 'Natcash', 'Mobil Moni Natcom', '+509 42 44 90 24', 'Dasner JEAN')}
        <div style={{ background: D.goldDim, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 18px', marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 13 }}>
          <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: D.gold, marginBottom: 5 }}>Frè Tranzaksyon</div>
            <div style={{ fontSize: 12, color: D.mutedLt, lineHeight: 1.8 }}>
              Ajoute <strong style={{ color: D.text }}>15 HTG</strong> frè pou chak <strong style={{ color: D.text }}>250 HTG</strong> ou voye.<br />
              Egzanp: 250 HTG → voye <strong style={{ color: D.gold }}>265 HTG</strong> total.
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '15px', borderRadius: 13, border: `1px solid ${D.borderSub}`, background: 'rgba(255,255,255,0.04)', color: D.mutedLt, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>Fèmen</button>
      </div>
    </div>
  )
}

function SolCalendar({ dates, member, plan, today, allSlots }) {
  const [offset, setOffset] = useState(0)
  const now = new Date(); now.setMonth(now.getMonth() + offset)
  const year = now.getFullYear(), month = now.getMonth()
  const monthStr = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dateSet = new Set(dates)
  const winDatesSet = new Set(allSlots.map(s => dates[s.position - 1]).filter(Boolean))
  const btnSt = { width: 38, height: 38, borderRadius: 10, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 22, padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setOffset(o => o - 1)} style={btnSt}><ChevronLeft size={15} /></button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: D.text, textTransform: 'capitalize' }}>{monthStr}</span>
        <button onClick={() => setOffset(o => o + 1)} style={btnSt}><ChevronRight size={15} /></button>
      </div>
      <div className="sol-cal-grid" style={{ marginBottom: 8 }}>
        {['Di','Lu','Ma','Me','Je','Ve','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: D.muted, padding: '4px 0', letterSpacing: '0.06em' }}>{d}</div>
        ))}
      </div>
      <div className="sol-cal-grid">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ aspectRatio: '1' }} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = ds === today, isPayDay = dateSet.has(ds)
          const paid = !!member.payments?.[ds], timing = member.paymentTimings?.[ds]
          const isPast = ds < today, isWinDay = winDatesSet.has(ds)
          let bg = 'transparent', border = 'transparent', color = isPast ? 'rgba(255,255,255,0.1)' : D.muted
          if      (isPayDay && paid && timing === 'early') { bg = 'rgba(0,208,132,0.15)'; border = 'rgba(0,208,132,0.4)'; color = '#00d084' }
else if (isPayDay && paid && timing === 'late')  { bg = D.orangeBg; border = `${D.orange}40`; color = D.orange }
else if (isPayDay && paid)                       { bg = D.greenBg; border = `${D.green}40`; color = D.green }
else if (isToday)                                { bg = D.goldDim; border = D.gold; color = D.gold }
else if (isWinDay)                               { bg = 'rgba(34,197,94,0.15)'; border = `${D.green}50`; color = D.green }
else if (isPayDay && isPast)                     { bg = D.redBg; border = `${D.red}30`; color = D.red }
else if (isPayDay)                               { bg = D.blueBg; border = 'rgba(96,165,250,0.3)'; color = D.blue }
          return (
            <div key={day} className="sol-cal-day" style={{ background: bg, border: `1px solid ${border}` }}>
              <span style={{ fontSize: 10, fontWeight: isPayDay || isToday ? 800 : 400, color, fontFamily: isPayDay ? 'DM Mono, monospace' : 'inherit' }}>{day}</span>
              {isWinDay && <span style={{ fontSize: 7, lineHeight: 1 }}>🏆</span>}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16, fontSize: 10, color: D.muted }}>
        {[['#00d084','Bonè'],[D.green,'Alè'],[D.orange,'Reta'],[D.red,'Pa Peye'],[D.blue,'Pwochen']].map(([c,l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
        <span>🏆 Dat Touche</span>
      </div>
    </div>
  )
}

function PaymentCountdown({ nextUnpaidDate, plan, daysUntil }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [status,   setStatus]   = useState('pending')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const [dueH, dueM] = (plan.dueTime    || '10:00').split(':').map(Number)
      const [endH, endM] = (plan.dueTimeEnd || '15:00').split(':').map(Number)
      const dateParts = nextUnpaidDate.split('-').map(Number)
      const dueDateTime = new Date(Date.UTC(dateParts[0], dateParts[1]-1, dateParts[2], dueH+5, dueM))
      const endDateTime = new Date(Date.UTC(dateParts[0], dateParts[1]-1, dateParts[2], endH+5, endM))
      const diffToDue = dueDateTime - now
      const diffToEnd = endDateTime - now

      if (diffToDue > 0) {
        const h = Math.floor(diffToDue / 3600000)
        const m = Math.floor((diffToDue % 3600000) / 60000)
        const s = Math.floor((diffToDue % 60000) / 1000)
        setTimeLeft(
          daysUntil > 0
            ? `${daysUntil}j ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
            : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        )
        setStatus('pending')
      } else if (diffToEnd > 0) {
        const h = Math.floor(diffToEnd / 3600000)
        const m = Math.floor((diffToEnd % 3600000) / 60000)
        const s = Math.floor((diffToEnd % 60000) / 1000)
        setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
        setStatus('due')
      } else {
        setTimeLeft('00:00:00')
        setStatus('late')
      }
    }

    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [nextUnpaidDate, plan])

  const cfg = {
    pending: { bg: D.orangeBg, border: `${D.orange}35`, color: D.orange, icon: <Bell size={22} style={{color:D.orange,flexShrink:0}}/>, label: 'Pwochen pèman ou a:' },
    due:     { bg: D.greenBg,  border: `${D.green}35`,  color: D.green,  icon: <CheckCircle size={22} style={{color:D.green,flexShrink:0}}/>, label: 'Peye kounye a — lè limite:' },
    late:    { bg: D.redBg,    border: `${D.red}35`,    color: D.red,    icon: <Bell size={22} style={{color:D.red,flexShrink:0}}/>, label: 'Lè pèman an pase!' },
  }[status]

  return (
    <div className="sol-alert" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.icon}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: cfg.color, fontWeight: 700, margin: '0 0 4px' }}>
          {cfg.label} {nextUnpaidDate.split('-').reverse().join('/')}
        </p>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 900, color: cfg.color, margin: 0, letterSpacing: '0.05em' }}>
          {timeLeft}
        </p>
        <p style={{ fontSize: 10, color: cfg.color, opacity: 0.7, margin: '4px 0 0' }}>
          {status === 'pending' && `Lè peman: ${plan.dueTime || '10:00'} — ${plan.dueTimeEnd || '15:00'}`}
          {status === 'due'     && `✅ Ou ka peye kounye a!`}
          {status === 'late'    && `⚠️ Pèman an reta`}
        </p>
      </div>
    </div>
  )
}

// ✅ NOUVO — Countdown blokaj (dat pase pa peye)
function BlockingCountdown({ nextUnpaidDate, plan, lastPaidDate }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      // Blokaj = minui nan dat ki pase a (UTC-5 → +5h UTC)
      const dateParts = nextUnpaidDate.split('-').map(Number)
      const blockTime = new Date(Date.UTC(dateParts[0], dateParts[1]-1, dateParts[2]+1, 5, 0, 0))
      const diff = blockTime - now

      if (diff <= 0) {
        setTimeLeft('Kont ou bloke!')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [nextUnpaidDate])

  return (
    <div className="sol-alert" style={{
      background: D.redBg, border: `1px solid ${D.red}40`,
      flexDirection: 'column', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bell size={22} style={{ color: D.red, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, color: D.red, fontWeight: 800, margin: '0 0 2px' }}>
            ⚠️ Pèman {nextUnpaidDate.split('-').reverse().join('/')} pa peye!
          </p>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
            Dènye pèman ou: {lastPaidDate?.split('-').reverse().join('/') || '—'}
          </p>
        </div>
      </div>
      <div style={{ width: '100%', background: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: '12px 16px' }}>
        <p style={{ fontSize: 10, color: D.red, fontWeight: 700, margin: '0 0 6px',
          textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Tan avan blokaj:
        </p>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 32, fontWeight: 900,
          color: D.red, margin: 0, letterSpacing: '0.05em' }}>
          {timeLeft}
        </p>
        <p style={{ fontSize: 11, color: D.muted, margin: '6px 0 0' }}>
          Peye imedyatman pou evite blokaj kont ou!
        </p>
      </div>
    </div>
  )
}

function PerformanceMessage({ scoreData }) {
  const [visible, setVisible] = useState(true)
  if (!scoreData || !visible) return null

  const isChampion = scoreData.early >= 5
  const isLate     = scoreData.late >= 3 && scoreData.early === 0

  if (!isChampion && !isLate) return null

  if (isChampion) return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,208,132,0.12), rgba(201,168,76,0.10))',
      border: '1px solid rgba(0,208,132,0.35)',
      borderRadius: 20, padding: '20px 22px', marginBottom: 20,
      position: 'relative', overflow: 'hidden',
      animation: 'fadeUp 0.5s ease',
    }}>
      {/* Dekorasyon */}
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.08, userSelect: 'none' }}>🌸</div>
      <div style={{ position: 'absolute', bottom: -10, left: -10, fontSize: 60, opacity: 0.08, userSelect: 'none' }}>🌺</div>

      <button onClick={() => setVisible(false)} style={{
        position: 'absolute', top: 10, right: 12,
        background: 'none', border: 'none', color: '#00d084',
        cursor: 'pointer', fontSize: 16, opacity: 0.6,
      }}>×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>🌸</div>
        <div>
          <p style={{
            fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 900,
            color: '#00d084', margin: '0 0 2px',
          }}>
            🏆 Bravo! Ou se yon Chanpyon Sòl!
          </p>
          <p style={{ fontSize: 11, color: 'rgba(0,208,132,0.7)', margin: 0 }}>
            {scoreData.early} pèman bonè • Pèfòmans ekselan
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0,
        lineHeight: 1.8, fontStyle: 'italic',
      }}>
        🌺 <strong style={{ color: '#00d084' }}>Felisitasyon!</strong> Ou bay nou kè kontan anpil —
        ou peye <strong style={{ color: '#E8C87A' }}>{scoreData.early} fwa bonè</strong> deja!
        Sa montre ou se yon moun serye e ki gen konviksyon ak responsabilite.
        🌸 <strong style={{ color: '#00d084' }}>Kontinye konsa</strong> — plis ou peye bonè,
        plis ou bati konfyans ou ak avantaj ou nan Sòl la.
        Nou fyè de ou! 🌟
      </p>

      <div style={{
        marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {['⚡ Disiplin', '🌟 Fyète', '💪 Responsabilite'].map(tag => (
          <span key={tag} style={{
            fontSize: 10, fontWeight: 700, color: '#00d084',
            background: 'rgba(0,208,132,0.12)', border: '1px solid rgba(0,208,132,0.25)',
            borderRadius: 20, padding: '3px 10px',
          }}>{tag}</span>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(245,158,11,0.08))',
      border: '1px solid rgba(239,68,68,0.30)',
      borderRadius: 20, padding: '20px 22px', marginBottom: 20,
      position: 'relative', overflow: 'hidden',
      animation: 'fadeUp 0.5s ease',
    }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.07, userSelect: 'none' }}>⚠️</div>

      <button onClick={() => setVisible(false)} style={{
        position: 'absolute', top: 10, right: 12,
        background: 'none', border: 'none', color: D.red,
        cursor: 'pointer', fontSize: 16, opacity: 0.6,
      }}>×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>⚠️</div>
        <div>
          <p style={{
            fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 900,
            color: D.red, margin: '0 0 2px',
          }}>
            Atansyon — Pèman Reta!
          </p>
          <p style={{ fontSize: 11, color: 'rgba(239,68,68,0.7)', margin: 0 }}>
            {scoreData.late} pèman reta • Sa ap afekte pèfòmans ou
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0,
        lineHeight: 1.8,
      }}>
        ⏰ Nou remake ou gen <strong style={{ color: D.orange }}>{scoreData.late} pèman reta</strong>.
        pèman reta ka <strong style={{ color: D.red }}>bloke kont ou</strong> epi
        afekte chans ou pou jwenn pi bon pozisyon nan Sòl la.
        💡 <strong style={{ color: D.orange }}>Chak pèman bonè</strong> ba ou pwen,
        epi pwen yo ouvri pòt pou plis avantaj.
        Fè efò — <strong style={{ color: '#E8C87A' }}>ou kapab fè plis efò!</strong> 🙏
      </p>

      <div style={{
        marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {['📅 Peye Bonè', '⬆️ Amelyore Pèfòmans', '🔓 Evite Blokaj'].map(tag => (
          <span key={tag} style={{
            fontSize: 10, fontWeight: 700, color: D.orange,
            background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 20, padding: '3px 10px',
          }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

function SolChat({ token, plan, member }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const bottomRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${SOL_API}/api/sol/chat/${plan.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {}
    finally { setLoading(false) }
  }, [plan.id, token])

  useEffect(() => {
    fetchMessages()
    const iv = setInterval(fetchMessages, 5000) // ✅ Poll chak 5 segonn
    return () => clearInterval(iv)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/chat/${plan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: input.trim() })
      })
      if (res.ok) {
        setInput('')
        fetchMessages()
      }
    } catch {}
    finally { setSending(false) }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const fmtTime = (d) => new Date(d).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-HT')

  let lastDate = null

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 22, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>

      {/* Tèt chat */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.borderSub}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: D.text }}>
            💬 Chat Sol — {plan.name}
          </span>
          <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>
            Diskisyon anonymous pami manm yo
          </p>
        </div>
        <button onClick={fetchMessages} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Mesaj yo */}
      <div className="sol-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: D.muted }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${D.gold}30`, borderTopColor: D.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: D.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ margin: 0, fontSize: 13 }}>Pa gen mesaj pou kounye a.</p>
            <p style={{ margin: '4px 0 0', fontSize: 11 }}>Kòmanse diskisyon an!</p>
          </div>
        ) : messages.map((msg, i) => {
          const isMe    = msg.authorId === member.id
          const isAdmin = msg.isAdmin
          const msgDate = fmtDate(msg.createdAt)
          const showDate = msgDate !== lastDate
          lastDate = msgDate

          return (
            <div key={msg.id}>
              {/* Separatè dat */}
              {showDate && (
                <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 10, color: D.muted }}>
                  <span style={{ background: D.card, padding: '2px 10px', borderRadius: 10, border: `1px solid ${D.borderSub}` }}>
                    {msgDate}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: isAdmin ? D.goldBtn : isMe ? 'linear-gradient(135deg,#3B82F6,#1d4ed8)' : 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: isAdmin ? '#0a1222' : '#fff',
                }}>
                  {isAdmin ? '👑' : msg.authorName.replace('Manm ', '#')}
                </div>

                {/* Bilbòd mesaj */}
                <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                  {!isMe && (
                    <span style={{ fontSize: 9, color: isAdmin ? D.gold : D.muted, fontWeight: 700, marginLeft: 4 }}>
                      {msg.authorName}
                    </span>
                  )}
                  <div style={{
                    padding: '9px 13px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isAdmin
                      ? 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08))'
                      : isMe
                        ? 'linear-gradient(135deg,#3B82F6,#1d4ed8)'
                        : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isAdmin ? D.gold+'40' : isMe ? 'transparent' : D.borderSub}`,
                  }}>
                    <p style={{ fontSize: 13, color: isMe ? '#fff' : D.text, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {msg.message}
                    </p>
                  </div>
                  <span style={{ fontSize: 9, color: D.muted, marginLeft: 4, marginRight: 4 }}>
                    {fmtTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${D.borderSub}`, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ekri yon mesaj... (Enter pou voye)"
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 14,
            border: `1px solid ${D.borderSub}`, background: 'rgba(255,255,255,0.04)',
            color: D.text, fontSize: 13, fontFamily: 'inherit',
            resize: 'none', outline: 'none', lineHeight: 1.5,
            maxHeight: 100, overflowY: 'auto',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            width: 42, height: 42, borderRadius: 12, border: 'none',
            background: input.trim() ? D.goldBtn : 'rgba(255,255,255,0.06)',
            color: input.trim() ? '#0a1222' : D.muted,
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s',
          }}
        >
          {sending
            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <span style={{ fontSize: 18 }}>➤</span>
          }
        </button>
      </div>
    </div>
  )
}

export default function SolDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showChangePw, setShowChangePw] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [tab, setTab] = useState('history')

  useEffect(() => {
    const el = document.createElement('style'); el.id = 'sol-dashboard-styles'; el.textContent = GLOBAL_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('sol-dashboard-styles')?.remove()
  }, [])

  const token = localStorage.getItem('sol_token')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const VAPID_PUBLIC_KEY = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
    const urlBase64ToUint8Array = (b) => {
      const padding = '='.repeat((4 - b.length % 4) % 4)
      const base64 = (b + padding).replace(/-/g, '+').replace(/_/g, '/')
      return new Uint8Array([...window.atob(base64)].map(c => c.charCodeAt(0)))
    }
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
      if (token) await fetch(`${SOL_API}/api/sol/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subscription: sub }) }).catch(() => {})
    }).catch(err => console.warn('SW:', err.message))
  }, [token])

  const fetchData = useCallback(async () => {
    if (!token) { navigate('/app/sol/login'); return }
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/members/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { localStorage.removeItem('sol_token'); localStorage.removeItem('sol_member'); navigate('/app/sol/login'); return }
      setData(await res.json())
    } catch { toast.error('Pa ka chaje done yo.') }
    finally { setLoading(false) }
  }, [token, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleLogout = () => {
    localStorage.removeItem('sol_token'); localStorage.removeItem('sol_member')
    navigate('/app/sol/login'); toast('Ou dekonekte', { icon: '👋' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bgGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 50, height: 50, border: `3px solid rgba(201,168,76,0.15)`, borderTopColor: D.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 18px' }} />
        <p style={{ color: D.muted, fontSize: 14, fontWeight: 500 }}>Ap chaje kont ou...</p>
      </div>
    </div>
  )

  if (!data) return null
  const { member, plan, tenant } = data
  if (!member || !plan) return null

  const todayLocal = new Date()
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`

  // ✅ 1. allSlots ANVAN tout lòt kalkil
  const allSlots = member.allSlots || [{ id: member.id, position: member.position, payments: member.payments, paymentTimings: member.paymentTimings }]

  // ✅ 2. totalSlotCount
  const totalSlotCount = Math.max(
    data?.plan?.activeMemberCount || 0, data?.plan?.maxMembers || 0,
    allSlots.reduce((max, s) => Math.max(max, s.position), 0)
  )

  // ✅ 3. Kalkil
const dates      = getPaymentDates(plan.frequency, plan.createdAt, totalSlotCount)

// ✅ Konte dat inik — pa sòme pa men
const totalPaid  = dates.filter(d => member.payments?.[d]).length
const totalDue   = dates.filter(d => d <= today).length
const amountPaid = totalPaid * plan.amount * allSlots.length
const amountDue  = totalDue  * plan.amount * allSlots.length
const payout     = (plan.amount * totalSlotCount) - (plan.feePerMember || plan.fee || 0)  // ✅ AJOUTE
const progress   = totalSlotCount > 0 ? (totalPaid / totalSlotCount) * 100 : 0
  const isWinner   = allSlots.some(slot => dates[slot.position - 1] === today)

  const timings = Object.values(member.paymentTimings || {})
  const scoreData = timings.length ? (() => {
    const early = timings.filter(t => t === 'early').length
    const onTime = timings.filter(t => t === 'onTime').length
    const late = timings.filter(t => t === 'late').length
    return { score: Math.round(((early * 2 + onTime) / (timings.length * 2)) * 100), early, onTime, late }
  })() : null

  const timingBadge = (t) => {
    if (t === 'early')  return <span style={{ fontSize: 9, background: 'rgba(0,208,132,0.15)', color: '#00d084', padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>⚡ Bonè</span>
    if (t === 'onTime') return <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>✅ A lè</span>
    if (t === 'late')   return <span style={{ fontSize: 9, background: D.orangeBg, color: D.orange, padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>⚠️ Reta</span>
    return null
  }

 // ✅ Jwenn dènye dat peye a
const lastPaidDate = [...dates].reverse().find(d => member.payments?.[d]) || null

// ✅ Pwochen peman = premye dat san peman APRE dènye dat peye a
const nextUnpaidDate = lastPaidDate
  ? dates.find(d => d > lastPaidDate && !member.payments?.[d])
  : dates.find(d => !member.payments?.[d]) // si poko peye ditou
  const tenantName = tenant?.businessName || tenant?.name || 'Sòl Ou'
  const posStr = allSlots.length > 1 ? allSlots.map(s => `#${s.position}`).join(' • ') : `Pozisyon #${member.position}`

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
          { id: 'history',  icon: <CreditCard size={15} />, label: 'Istwa Peman'   },
          { id: 'calendar', icon: <TrendingUp size={15} />, label: 'Kalandriye'    },
          { id: 'exchange', icon: <RefreshCw  size={15} />, label: 'Mache Echanj'  },
        ].map(item => (
          <button key={item.id} className={`sol-nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        <button onClick={() => setShowPayModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.06)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
          📱 Moncash / Natcash
        </button>
        <button onClick={() => setShowChangePw(true)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.06)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
          <Key size={13} /> Chanje Modpas
        </button>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 11, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
          <LogOut size={13} /> Dekonekte
        </button>
      </div>
    </>
  )

  return (
    <div className="sol-root">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* MOBILE HEADER */}
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

          {/* ALERTS */}
          {isWinner && (
            <div className="sol-alert" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.14),rgba(201,168,76,0.09))', border: `1px solid ${D.green}40` }}>
              <div style={{ width: 52, height: 52, minWidth: 52, borderRadius: 16, background: D.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(201,168,76,0.3)' }}>
                <Trophy size={24} color="#0a0a00" />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: D.green, margin: '0 0 4px', fontFamily: 'Syne, sans-serif' }}>🎉 Se Jou Ou Jodi a!</p>
                <p style={{ fontSize: 13, color: D.mutedLt, margin: 0 }}>Ou ap touche: <span style={{ color: D.gold, fontWeight: 800 }}>{fmt(payout)} HTG</span></p>
              </div>
            </div>
          )}

 {!isWinner && (() => {
  const neverPaid = !lastPaidDate

  // Si poko peye ditou
  if (neverPaid) return (
    <div className="sol-alert" style={{ background: D.blueBg, border: `1px solid ${D.blue}35` }}>
      <Bell size={22} style={{ color: D.blue, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 13, color: D.blue, fontWeight: 800, margin: '0 0 2px' }}>
          Ou poko fè premye peman ou!
        </p>
        <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
          Premye dat: {nextUnpaidDate?.split('-').reverse().join('/')} • Peye ant {plan.dueTime || '10:00'} — {plan.dueTimeEnd || '15:00'}
        </p>
      </div>
    </div>
  )

  if (!nextUnpaidDate) return null

  const daysUntil = Math.ceil((new Date(nextUnpaidDate) - new Date(today)) / 86400000)
  const isOverdue = nextUnpaidDate < today  // dat pase — kont ap bloke

  // Si dat pase — afiche an wouj ak countdown blokaj
  if (isOverdue) return (
    <BlockingCountdown
      nextUnpaidDate={nextUnpaidDate}
      plan={plan}
      lastPaidDate={lastPaidDate}
    />
  )

  // Pwochen peman nòmal
  if (daysUntil > 3) return null
  return <PaymentCountdown nextUnpaidDate={nextUnpaidDate} plan={plan} daysUntil={daysUntil} />
})()}

          {/* HERO */}
          <div className="sol-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12, fontFamily: 'Syne, sans-serif' }}>Kont Sabotay Sòl</div>
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
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 40, color: D.gold, lineHeight: 1, marginBottom: 6 }}>{fmt(amountPaid)}</div>
                <div style={{ fontSize: 13, color: D.muted }}>HTG • {totalPaid}/{totalSlotCount} peman</div>
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pwogrè Sòl la</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 15, color: D.gold }}>{Math.round(progress)}%</span>
              </div>
              <div className="sol-progress-track">
                <div className="sol-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 11, color: D.muted }}>
                <span>{totalPaid} peman fèt</span>
                <span>{totalSlotCount - totalPaid} rès</span>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="sol-stats-grid">
            <div className="sol-stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: D.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={15} style={{ color: D.red }} /></div>
                <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rès pou Peye</span>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 22, color: D.red }}>{fmt(Math.max(0, amountDue - amountPaid))}</div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>HTG</div>
            </div>

            {allSlots.map(slot => (
              <div key={slot.position} className="sol-stat-card" style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={15} style={{ color: D.gold }} /></div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Men #{slot.position}</span>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 22, color: D.gold }}>{fmt(payout)}</div>
                <div style={{ fontSize: 11, color: D.muted, marginTop: 4 }}>HTG • {dates[slot.position - 1]?.split('-').reverse().join('/') || '—'}</div>
              </div>
            ))}

            {allSlots.length > 1 && (
              <div className="sol-stat-card" style={{ borderColor: `${D.green}30`, background: 'rgba(34,197,94,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: D.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={15} style={{ color: D.green }} /></div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: D.green, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Ap Touche</span>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 22, color: D.green }}>{fmt(payout * allSlots.length)}</div>
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

         {/* PÈFÒMANS */}
          {scoreData && (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 20, padding: '22px 26px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Shield size={13} /> Pèfòmans Ou
                </span>
                <ScoreBadge score={scoreData.score} />
              </div>
              <div className="sol-score-row">
                <span style={{ color: '#00d084', fontWeight: 700 }}>⚡ {scoreData.early} bonè</span>
                <span style={{ color: D.green,  fontWeight: 700 }}>✅ {scoreData.onTime} a lè</span>
                <span style={{ color: D.orange, fontWeight: 700 }}>⚠️ {scoreData.late} reta</span>
              </div>
            </div>
          )}

          {/* ✅ Mesaj Motivasyon */}
          <PerformanceMessage scoreData={scoreData} />

          {/* REGLEMAN */}
          {plan.regleman && (
            <div style={{ background: D.tealBg, border: `1px solid rgba(20,184,166,0.2)`, borderRadius: 20, padding: '22px 26px', marginBottom: 20 }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, color: D.teal, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>📜 Regleman Sòl la</p>
              <p style={{ fontSize: 13, color: D.mutedLt, margin: 0, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{plan.regleman}</p>
            </div>
          )}

          {/* TABS */}
          <div className="sol-tabs">
            {[['history','📋 Istwa Peman'],['calendar','📅 Kalandriye'],['exchange','🔄 Mache'],['chat','💬 Chat']].map(([t,l]) => (
              <button key={t} className="sol-tab-btn" onClick={() => setTab(t)} style={{ border: 'none', background: tab === t ? D.goldDim : 'transparent', color: tab === t ? D.gold : D.muted, fontFamily: 'DM Sans, sans-serif' }}>{l}</button>
            ))}
          </div>

        {/* ISTWA */}
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
                  // ✅ Montan reyèl = plan.amount × kantite men
                  const montanDat = plan.amount * allSlots.length
                  return (
                    <div key={d} className="sol-pay-row" style={{ background: isWin ? 'rgba(201,168,76,0.06)' : d === today ? 'rgba(201,168,76,0.03)' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: isPast ? D.text : D.muted, flexShrink: 0, fontWeight: 500 }}>{d.split('-').reverse().join('/')}</span>
                        {isWin && <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '2px 8px', borderRadius: 8, fontWeight: 700, flexShrink: 0, border: `1px solid ${D.border}` }}>🏆 Touche</span>}
                        {d === today && !isWin && <span style={{ fontSize: 9, background: D.blueBg, color: D.blue, padding: '2px 8px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>Jodi</span>}
                        {paid && timingBadge(timing)}
                        {/* ✅ Afiche detay men si > 1 */}
                        {paid && allSlots.length > 1 && (
                          <span style={{ fontSize: 9, color: D.muted, flexShrink: 0 }}>
                            {allSlots.length}×{fmt(plan.amount)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {/* ✅ Montan × kantite men */}
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: paid ? D.green : isPast ? D.red : D.muted, whiteSpace: 'nowrap' }}>
                          {paid
                            ? `+${fmt(montanDat)}`
                            : isPast
                              ? `-${fmt(montanDat)}`
                              : fmt(montanDat)
                          } HTG
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
          {tab === 'chat' && <SolChat token={token} plan={plan} member={member} />}

          {/* MOBILE ACTIONS */}
          <div className="sol-mobile-actions">
            <button onClick={() => setShowPayModal(true)} style={{ padding: '15px', borderRadius: 15, border: '1px solid rgba(220,38,38,0.28)', background: 'rgba(220,38,38,0.07)', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif' }}>
              📱 Peye pa Moncash / Natcash
            </button>
            <button onClick={() => setShowChangePw(true)} style={{ padding: '15px', borderRadius: 15, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.06)', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif' }}>
              <Key size={14} /> Chanje Modpas
            </button>
          </div>

        </div>
      </div>

      {showPayModal && <ModalPayMobile onClose={() => setShowPayModal(false)} />}
      {showChangePw && <ModalChangePassword token={token} onClose={() => setShowChangePw(false)} />}
    </div>
  )
}