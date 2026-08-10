// src/pages/sol/SolDashboardComponents.jsx
// ─── Tout komponan prensipal tableau de bord Sol ──────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, Clock, Bell, ChevronLeft, ChevronRight, Shield, RefreshCw, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { D, SOL_API, fmt } from './solDashboardUtils'
// ✅ NOUVO: menm fonksyon kalkil "Chanpyon/Bon/Mwayen" ki nan panel Sabotay la
import { computeLocalBreakdown } from '../enterprise/sabotayUtils'

// ══════════════════════════════════════════════════════════════
// ✅ NOUVO: SKÒ CHANPYON/BON/MWAYEN — menm kalkil ak menm afichaj
// ki nan panel Sabotay admin (PlanDetail.jsx ScoreDisplay)
// ══════════════════════════════════════════════════════════════
export function MemberScoreDisplay({ member, plan, today, currentTime }) {
  // ✅ FIX: `plan` isit la (kont sol) pa gen `plan.members` tankou nan panel
  // admin la — konstwi yon "shim" ak kantite manm REYÈL la pou getAllPaymentDates
  // kalkile menm kantite sik/dat ak panel admin la.
  const slotCount = plan.activeMemberCount || plan.totalMemberCount || 1
  const planShim = { ...plan, members: Array.from({ length: slotCount }, () => ({ status: 'active' })) }
  const breakdown = computeLocalBreakdown(member, planShim, today, currentTime)
  if (!breakdown || breakdown.count === 0) return null
  const score = breakdown.total

  let color, bg, label, Icon
  if      (score >= 15) { color = '#00d084'; bg = 'rgba(0,208,132,0.14)'; label = 'Chanpyon'; Icon = TrendingUp }
  else if (score >= 6)  { color = D.green;   bg = D.greenBg;             label = 'Bon';      Icon = TrendingUp }
  else if (score >= 0)  { color = D.orange || '#f59e0b'; bg = D.orangeBg; label = 'Mwayen';  Icon = Minus }
  else if (score >= -8) { color = D.red;     bg = D.redBg;               label = 'Fèb';      Icon = TrendingDown }
  else                  { color = '#dc2626'; bg = 'rgba(220,38,38,0.15)'; label = 'Kritik';   Icon = TrendingDown }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bg, border: `1.5px solid ${color}40`,
      borderRadius: 12, padding: '7px 12px',
    }}>
      <Icon size={14} color={color} />
      <span style={{ fontWeight: 800, fontSize: 14, color }}>{score >= 0 ? `+${score}` : score}</span>
      <span style={{ fontWeight: 700, fontSize: 11, color, opacity: 0.9 }}>{label}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// BADGES
// ══════════════════════════════════════════════════════════════
export function PayBadge({ paid }) {
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

export function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? D.orange : D.red
  const label = score >= 80 ? '⭐ Ekselans' : score >= 50 ? '⚠️ Mwayen' : '❌ Reta'
  return (
    <span style={{ padding: '4px 11px', borderRadius: 20, fontWeight: 700, fontSize: 11, background: `${color}15`, color, whiteSpace: 'nowrap', border: `1px solid ${color}30` }}>
      {label} — {score}%
    </span>
  )
}

export function timingBadge(t) {
  if (t === 'early')  return <span style={{ fontSize: 9, background: 'rgba(0,208,132,0.15)', color: '#00d084', padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>⚡ Bonè</span>
  if (t === 'onTime') return <span style={{ fontSize: 9, background: D.greenBg, color: D.green, padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>✅ A lè</span>
  if (t === 'late')   return <span style={{ fontSize: 9, background: D.orangeBg, color: D.orange, padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>⚠️ Reta</span>
  return null
}

// ══════════════════════════════════════════════════════════════
// KALANDRIYE
// ══════════════════════════════════════════════════════════════
export function SolCalendar({ dates, member, plan, today, allSlots }) {
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
        {[['#00d084','Bonè'],[D.green,'Alè'],[D.orange,'Reta'],[D.red,'Pa Peye'],[D.blue,'Pwochen']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
        <span>🏆 Dat Touche</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// KONT REBOU — Pwochen Peman
// ══════════════════════════════════════════════════════════════
export function PaymentCountdown({ nextUnpaidDate, plan, daysUntil }) {
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
        setTimeLeft(daysUntil > 0
          ? `${daysUntil}j ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
          : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'00')}`)
        setStatus('pending')
      } else if (diffToEnd > 0) {
        const h = Math.floor(diffToEnd / 3600000)
        const m = Math.floor((diffToEnd % 3600000) / 60000)
        const s = Math.floor((diffToEnd % 60000) / 1000)
        setTimeLeft(`${String(h).padStart(2,'00')}:${String(m).padStart(2,'00')}:${String(s).padStart(2,'00')}`)
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
    pending: { bg: D.orangeBg, border: `${D.orange}35`, color: D.orange, icon: <Bell size={22} style={{ color: D.orange, flexShrink: 0 }} />, label: 'Pwochen pèman ou a:' },
    due:     { bg: D.greenBg,  border: `${D.green}35`,  color: D.green,  icon: <CheckCircle size={22} style={{ color: D.green, flexShrink: 0 }} />, label: 'Peye kounye a — lè limite:' },
    late:    { bg: D.redBg,    border: `${D.red}35`,    color: D.red,    icon: <Bell size={22} style={{ color: D.red, flexShrink: 0 }} />, label: 'Lè pèman an pase!' },
  }[status]

  return (
    <div className="sol-alert" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.icon}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: cfg.color, fontWeight: 700, margin: '0 0 4px' }}>
          {cfg.label} {nextUnpaidDate.split('-').reverse().join('/')}
        </p>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 900, color: cfg.color, margin: 0, letterSpacing: '0.05em' }}>{timeLeft}</p>
        <p style={{ fontSize: 10, color: cfg.color, opacity: 0.7, margin: '4px 0 0' }}>
          {status === 'pending' && `Lè peman: ${plan.dueTime || '10:00'} — ${plan.dueTimeEnd || '15:00'}`}
          {status === 'due'     && `✅ Ou ka peye kounye a!`}
          {status === 'late'    && `⚠️ Pèman an reta`}
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// KONT REBOU — Blokaj
// ══════════════════════════════════════════════════════════════
export function BlockingCountdown({ nextUnpaidDate, plan, lastPaidDate }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const dateParts = nextUnpaidDate.split('-').map(Number)
      const blockTime = new Date(Date.UTC(dateParts[0], dateParts[1]-1, dateParts[2]+1, 5, 0, 0))
      const diff = blockTime - now
      if (diff <= 0) { setTimeLeft('Kont ou bloke!'); return }
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
    <div className="sol-alert" style={{ background: D.redBg, border: `1px solid ${D.red}40`, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bell size={22} style={{ color: D.red, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, color: D.red, fontWeight: 800, margin: '0 0 2px' }}>⚠️ Pèman {nextUnpaidDate.split('-').reverse().join('/')} pa peye!</p>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Dènye pèman ou: {lastPaidDate?.split('-').reverse().join('/') || '—'}</p>
        </div>
      </div>
      <div style={{ width: '100%', background: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: '12px 16px' }}>
        <p style={{ fontSize: 10, color: D.red, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tan avan blokaj:</p>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 32, fontWeight: 900, color: D.red, margin: 0, letterSpacing: '0.05em' }}>{timeLeft}</p>
        <p style={{ fontSize: 11, color: D.muted, margin: '6px 0 0' }}>Peye imedyatman pou evite blokaj kont ou!</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ✅ NOUVO: BANNYÈ DAT PEMAN DEKLARE (pwomès admin, san pozisyon)
// ══════════════════════════════════════════════════════════════
export function DeclaredPayoutBanner({ declaredPayoutDate }) {
  const [visible, setVisible] = useState(true)
  if (!declaredPayoutDate || !visible) return null
  const dateStr = String(declaredPayoutDate).split('T')[0]
  const display = dateStr.split('-').reverse().join('/')

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(37,99,235,0.12))', border: `1px solid ${D.blue}40`, borderRadius: 20, padding: '18px 20px', marginBottom: 20, position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.5s ease' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 56, opacity: 0.08, userSelect: 'none' }}>📅</div>
      <button onClick={() => setVisible(false)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: D.blue, cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>×</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Calendar size={20} style={{ color: D.blue }} />
        </div>
        <div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 900, color: D.blue, margin: '0 0 3px' }}>📅 Dat Peman Ou Deklare</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0 }}>Ou ap touche sol ou a nan dat <strong style={{ color: '#fff' }}>{display}</strong>.</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MESAJ PÈFÒMANS
// ══════════════════════════════════════════════════════════════
export function PerformanceMessage({ scoreData }) {
  const [visible, setVisible] = useState(true)
  if (!scoreData || !visible) return null
  const isChampion = scoreData.early >= 5
  const isLate     = scoreData.late >= 3 && scoreData.early === 0
  if (!isChampion && !isLate) return null

  if (isChampion) return (
    <div style={{ background: 'linear-gradient(135deg, rgba(0,208,132,0.12), rgba(37,99,235,0.14))', border: '1px solid rgba(0,208,132,0.35)', borderRadius: 20, padding: '20px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.5s ease' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.08, userSelect: 'none' }}>🌸</div>
      <div style={{ position: 'absolute', bottom: -10, left: -10, fontSize: 60, opacity: 0.08, userSelect: 'none' }}>🌺</div>
      <button onClick={() => setVisible(false)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#00d084', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>×</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>🌸</div>
        <div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 900, color: '#00d084', margin: '0 0 2px' }}>🏆 Bravo! Ou se yon Chanpyon Sòl!</p>
          <p style={{ fontSize: 11, color: 'rgba(0,208,132,0.7)', margin: 0 }}>{scoreData.early} pèman bonè • Pèfòmans ekselan</p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.8, fontStyle: 'italic' }}>
        🌺 <strong style={{ color: '#00d084' }}>Felisitasyon!</strong> Ou bay nou kè kontan anpil — ou peye <strong style={{ color: '#F97316' }}>{scoreData.early} fwa bonè</strong> deja! 🌸 <strong style={{ color: '#00d084' }}>Kontinye konsa</strong> — plis ou peye bonè, plis ou bati konfyans ou. Nou fyè de ou! 🌟
      </p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['⚡ Disiplin', '🌟 Fyète', '💪 Responsabilite'].map(tag => (
          <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: '#00d084', background: 'rgba(0,208,132,0.12)', border: '1px solid rgba(0,208,132,0.25)', borderRadius: 20, padding: '3px 10px' }}>{tag}</span>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(245,158,11,0.08))', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 20, padding: '20px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.5s ease' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, opacity: 0.07, userSelect: 'none' }}>⚠️</div>
      <button onClick={() => setVisible(false)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: D.red, cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>×</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>⚠️</div>
        <div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 900, color: D.red, margin: '0 0 2px' }}>Atansyon — Pèman Reta!</p>
          <p style={{ fontSize: 11, color: 'rgba(239,68,68,0.7)', margin: 0 }}>{scoreData.late} pèman reta • Sa ap afekte pèfòmans ou</p>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.8 }}>
        ⏰ Nou remake ou gen <strong style={{ color: D.orange }}>{scoreData.late} pèman reta</strong>. Pèman reta ka <strong style={{ color: D.red }}>bloke kont ou</strong>. 💡 <strong style={{ color: D.orange }}>Chak pèman bonè</strong> ba ou pwen. Fè efò — <strong style={{ color: '#F97316' }}>ou kapab!</strong> 🙏
      </p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['📅 Peye Bonè', '⬆️ Amelyore Pèfòmans', '🔓 Evite Blokaj'].map(tag => (
          <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: D.orange, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '3px 10px' }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CHAT SOL
// ══════════════════════════════════════════════════════════════
export function SolChat({ token, plan, member, onNewMessage }) {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const bottomRef    = useRef(null)
  const prevCountRef = useRef(0)

  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`${SOL_API}/api/sol/chat/${plan.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      const newMsgs = data.messages || []
      if (newMsgs.length > prevCountRef.current && prevCountRef.current > 0) {
        onNewMessage?.(newMsgs.length - prevCountRef.current)
      }
      prevCountRef.current = newMsgs.length
      setMessages(newMsgs)
    } catch {}
    finally { setLoading(false) }
  }, [plan.id, token, onNewMessage])

  useEffect(() => {
    fetchMessages()
    const iv = setInterval(fetchMessages, 5000)
    return () => clearInterval(iv)
  }, [fetchMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/chat/${plan.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: input.trim() }),
      })
      if (res.ok) { setInput(''); fetchMessages() }
    } catch {}
    finally { setSending(false) }
  }

  const fmtTime = (d) => new Date(d).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-HT')
  let lastDate  = null

  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 22, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.borderSub}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: D.text }}>💬 Chat Sol — {plan.name}</span>
          <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>Diskisyon anonymous pami manm yo</p>
        </div>
        <button onClick={fetchMessages} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={12} />
        </button>
      </div>
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
        ) : messages.map((msg) => {
          const isMe    = msg.authorId === member.id
          const isAdmin = msg.isAdmin
          const msgDate = fmtDate(msg.createdAt)
          const showDate = msgDate !== lastDate
          lastDate = msgDate
          return (
            <div key={msg.id}>
              {showDate && (
                <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 10, color: D.muted }}>
                  <span style={{ background: D.card, padding: '2px 10px', borderRadius: 10, border: `1px solid ${D.borderSub}` }}>{msgDate}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isAdmin ? D.goldBtn : isMe ? 'linear-gradient(135deg,#3B82F6,#1d4ed8)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isAdmin ? '#0a1222' : '#fff' }}>
                  {isAdmin ? '👑' : msg.authorName.replace('Manm #', '')}
                </div>
                <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                  {!isMe && <span style={{ fontSize: 9, color: isAdmin ? D.gold : D.muted, fontWeight: 700, marginLeft: 4 }}>{msg.authorName}</span>}
                  <div style={{ padding: '9px 13px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isAdmin ? 'linear-gradient(135deg,rgba(37,99,235,0.2),rgba(249,115,22,0.12))' : isMe ? 'linear-gradient(135deg,#3B82F6,#1d4ed8)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isAdmin ? D.gold+'40' : isMe ? 'transparent' : D.borderSub}` }}>
                    <p style={{ fontSize: 13, color: isMe ? '#fff' : D.text, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.message}</p>
                  </div>
                  <span style={{ fontSize: 9, color: D.muted, marginLeft: 4, marginRight: 4 }}>{fmtTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${D.borderSub}`, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ekri yon mesaj... (Enter pou voye)" rows={1}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 14, border: `1px solid ${D.borderSub}`, background: 'rgba(255,255,255,0.04)', color: D.text, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }} />
        <button onClick={send} disabled={sending || !input.trim()} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: input.trim() ? D.goldBtn : 'rgba(255,255,255,0.06)', color: input.trim() ? '#0a1222' : D.muted, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
          {sending ? <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <span style={{ fontSize: 18 }}>➤</span>}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PÈFÒMANS SECTION
// ══════════════════════════════════════════════════════════════
export function PerformanceSection({ scoreData }) {
  if (!scoreData) return null
  return (
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
  )
}
