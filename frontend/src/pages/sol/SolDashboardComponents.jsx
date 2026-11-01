// src/pages/sol/SolDashboardComponents.jsx
// ─── Komponan prensipal tableau de bord Sol (nouvo design "Sabotay Inove") ───
// Lojik la pa chanje. Sèl chanjman fonksyonèl:
//   • Kont rebou yo kalkile lè Ayiti reyèl (DST) — pa UTC-5 fiks ankò.
//   • Kalandriye a rekonèt tout kategori timing yo (earlyDepo/earlyDay/lateWindow/veryLate).

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle, Clock, Bell, ChevronLeft, ChevronRight, Shield, RefreshCw,
  Calendar, TrendingUp, TrendingDown, Minus, X, Check, Send, MessageCircle,
} from 'lucide-react'
import { V, SOL_API, fmt, dmy, dayOf, monthOf, haitiWallToDate } from './solDashboardUtils'
// ✅ menm fonksyon kalkil "Chanpyon/Bon/Mwayen" ki nan panel Sabotay la
import { computeLocalBreakdown } from '../enterprise/sabotayUtils'

// ── Mak "Sabotay Inove" (3 ba + flèch) ───────────────────────
export function BrandIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="4"  y="20" width="5" height="12" rx="1.4" fill="#2563EB" />
      <rect x="12" y="13" width="5" height="19" rx="1.4" fill="#60A5FA" />
      <rect x="20" y="7"  width="5" height="25" rx="1.4" fill="#93C5FD" />
      <path d="M5 23 L15 16 L23 10 L31 4" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M23 4 L31 4 L31 12" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// Logo kare (tenant oswa mak Sabotay)
export function LogoMark({ tenant, size = 38 }) {
  return tenant?.logoUrl
    ? <img src={tenant.logoUrl} alt="logo" style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: 'contain', flexShrink: 0, background: '#fff' }} />
    : (
      <div style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 32% 28%, rgba(37,99,235,0.35) 0%, #0A1330 74%)', boxShadow: '0 0 0 1px rgba(96,165,250,0.35)' }}>
        <BrandIcon size={Math.round(size * 0.58)} />
      </div>
    )
}

// ── Anno pwogrè sikilè (motif "sòl = sèk") ───────────────────
export function ProgressRing({ value = 0, top, bottom, size = 92, stroke = 9 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="sol-ring-wrap" style={{ width: size, height: size }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div className="sol-ring-txt"><b>{top}</b><span>{bottom}</span></div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SKÒ CHANPYON/BON/MWAYEN
// ══════════════════════════════════════════════════════════════
export function MemberScoreDisplay({ member, plan, today, currentTime }) {
  // `plan` isit la (kont sol) pa gen `plan.members` — konstwi yon "shim" ak kantite manm reyèl la
  const slotCount = plan.nonStoppedMemberCount || plan.activeMemberCount || plan.totalMemberCount || 1
  const planShim = { ...plan, members: Array.from({ length: slotCount }, () => ({ status: 'active' })) }
  const breakdown = computeLocalBreakdown(member, planShim, today, currentTime)
  if (!breakdown || breakdown.count === 0) return null
  const score = breakdown.total

  let tone, label, Icon
  if      (score >= 15) { tone = 'green'; label = 'Chanpyon'; Icon = TrendingUp }
  else if (score >= 6)  { tone = 'green'; label = 'Bon';      Icon = TrendingUp }
  else if (score >= 0)  { tone = 'amber'; label = 'Mwayen';   Icon = Minus }
  else if (score >= -8) { tone = 'red';   label = 'Fèb';      Icon = TrendingDown }
  else                  { tone = 'red';   label = 'Kritik';   Icon = TrendingDown }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span className="sol-tile-val sol-num" style={{ color: V[tone] }}>{score >= 0 ? `+${score}` : score}</span>
      <span className={`sol-badge ${tone}`}><Icon size={11} /> {label}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// BADGES
// ══════════════════════════════════════════════════════════════
export function PayBadge({ paid }) {
  return (
    <span className={`sol-badge ${paid ? 'green' : 'red'}`}>
      {paid ? <CheckCircle size={10} /> : <Clock size={10} />}
      {paid ? 'Peye' : 'Pa peye'}
    </span>
  )
}

export function ScoreBadge({ score }) {
  const tone  = score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red'
  const label = score >= 80 ? 'Ekselans' : score >= 50 ? 'Mwayen' : 'Reta'
  return <span className={`sol-badge ${tone}`} style={{ padding: '4px 11px', fontSize: 11.5 }}>{label} · {score}%</span>
}

// TOUT kategori timing yo (menm sa "Lè Manyèl"/computeDetailedTiming itilize)
const TIMING = {
  earlyDepo:  { tone: 'accent', text: '🔒 Depo rezèv' },
  earlyDay:   { tone: 'accent', text: '⚡ Jou avan' },
  early:      { tone: 'accent', text: '⚡ Bonè' },
  onTime:     { tone: 'green',  text: '✓ A lè' },
  lateWindow: { tone: 'amber',  text: 'Apre lè' },
  late:       { tone: 'amber',  text: 'Reta' },
  veryLate:   { tone: 'red',    text: 'Anpil reta' },
}
export function timingBadge(t) {
  const x = TIMING[t]
  return x ? <span className={`sol-badge ${x.tone}`}>{x.text}</span> : null
}
const timingClass = (t) =>
  (t === 'earlyDepo' || t === 'earlyDay' || t === 'early') ? 'early'
  : (t === 'lateWindow' || t === 'late') ? 'late'
  : t === 'veryLate' ? 'miss'
  : 'paid'

// ══════════════════════════════════════════════════════════════
// CARNET — yon tanpon pou chak dat (tankou ti kaye sòl la)
// ══════════════════════════════════════════════════════════════
export function StampCarnet({ dates, member, today, isDateOverdue, declaredDates = [] }) {
  return (
    <>
      <div className="sol-carnet">
        {dates.map(d => {
          const paid = !!member.payments?.[d]
          const overdue = isDateOverdue(d)
          const isToday = d === today
          const win = declaredDates.includes(d)
          let cls = ''
          if (paid) cls = timingClass(member.paymentTimings?.[d])
          else if (overdue) cls = 'miss'
          else if (isToday) cls = 'today'
          if (win) cls += ' win'
          return (
            <div key={d} className={`sol-stamp ${cls}`} title={dmy(d)}>
              <b className="sol-num">{dayOf(d)}</b>
              <span>{monthOf(d)}</span>
              {paid && <i><Check size={11} strokeWidth={3.5} /></i>}
              {!paid && overdue && <i><X size={11} strokeWidth={3.5} /></i>}
              {win && !paid && <i style={{ background: 'var(--s-accent2)' }}>★</i>}
            </div>
          )
        })}
      </div>
      <div className="sol-legend">
        <span><em style={{ background: 'var(--s-green)' }} />Peye</span>
        <span><em style={{ background: 'var(--s-accent)' }} />Bonè</span>
        <span><em style={{ background: 'var(--s-amber)' }} />Reta</span>
        <span><em style={{ background: 'var(--s-red)' }} />Pa peye</span>
        <span><em style={{ border: '1.5px dashed var(--s-line2)' }} />Pwochen</span>
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════
// KALANDRIYE
// ══════════════════════════════════════════════════════════════
export function SolCalendar({ dates, member, plan, today, allSlots }) {
  const [offset, setOffset] = useState(0)
  const now = new Date(); now.setDate(1); now.setMonth(now.getMonth() + offset)
  const year = now.getFullYear(), month = now.getMonth()
  const monthStr = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dateSet = new Set(dates)
  // "Dat Touche" (🏆) — sèlman lè ADMIN deklare yon dat pou yon eskl (declaredPayoutDate)
  const winDatesSet = new Set(
    allSlots.map(s => s.declaredPayoutDate ? String(s.declaredPayoutDate).split('T')[0] : null).filter(Boolean)
  )

  return (
    <div className="sol-card" style={{ padding: '20px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="sol-icon-btn" onClick={() => setOffset(o => o - 1)} aria-label="Mwa anvan"><ChevronLeft size={16} /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="sol-section-title" style={{ textTransform: 'capitalize', fontSize: 16 }}>{monthStr}</div>
          {offset !== 0 && <button onClick={() => setOffset(0)} style={{ background: 'none', border: 'none', color: V.accentText, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', marginTop: 2 }}>Retounen jodi a</button>}
        </div>
        <button className="sol-icon-btn" onClick={() => setOffset(o => o + 1)} aria-label="Mwa apre"><ChevronRight size={16} /></button>
      </div>
      <div className="sol-cal-grid" style={{ marginBottom: 6 }}>
        {['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: V.muted, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div className="sol-cal-grid">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = ds === today, isPayDay = dateSet.has(ds)
          const paid = !!member.payments?.[ds], timing = member.paymentTimings?.[ds]
          const isPast = ds < today, isWinDay = winDatesSet.has(ds)
          let bg = 'transparent', border = 'transparent', color = isPast ? V.muted : V.muted2
          if (isPayDay && paid) {
            const k = timingClass(timing)
            if (k === 'early')     { bg = V.accentSoft; border = V.accentLine; color = V.accentText }
            else if (k === 'late') { bg = V.amberSoft;  border = V.amberLine;  color = V.amber }
            else if (k === 'miss') { bg = V.redSoft;    border = V.redLine;    color = V.red }
            else                   { bg = V.greenSoft;  border = V.greenLine;  color = V.green }
          }
          else if (isToday)            { bg = V.accentSoft; border = V.accent; color = V.accentText }
          else if (isWinDay)           { bg = V.greenSoft;  border = V.greenLine; color = V.green }
          else if (isPayDay && isPast) { bg = V.redSoft;    border = V.redLine;   color = V.red }
          else if (isPayDay)           { bg = V.blueSoft;   border = V.blueLine;  color = V.blue }
          return (
            <div key={day} className={`sol-cal-day ${isPayDay ? 'pay' : ''}`} style={{ background: bg, borderColor: border, color }}>
              <span className={isPayDay ? 'sol-num' : ''}>{day}</span>
              {isWinDay && <span style={{ fontSize: 8, lineHeight: 1 }}>🏆</span>}
            </div>
          )
        })}
      </div>
      <div className="sol-legend" style={{ padding: '16px 2px 0' }}>
        <span><em style={{ background: 'var(--s-accent)' }} />Bonè</span>
        <span><em style={{ background: 'var(--s-green)' }} />A lè</span>
        <span><em style={{ background: 'var(--s-amber)' }} />Reta</span>
        <span><em style={{ background: 'var(--s-red)' }} />Pa peye</span>
        <span><em style={{ background: 'var(--s-blue)' }} />Pwochen</span>
        <span>🏆 Dat touche</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// KONT REBOU — helpers
// ══════════════════════════════════════════════════════════════
const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0')
function splitMs(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 }
}
function Clock3({ d = 0, h, m, s, color, tone }) {
  const seg = (v, l) => (
    <div className="sol-clock-seg" style={{ borderColor: tone ? `var(--s-${tone}-line)` : undefined }}>
      <b style={{ color }}>{pad2(v)}</b><span>{l}</span>
    </div>
  )
  return (
    <div className="sol-clock" role="timer">
      {d > 0 && <>{seg(d, 'jou')}<span className="sol-clock-sep">:</span></>}
      {seg(h, 'è')}<span className="sol-clock-sep">:</span>{seg(m, 'min')}<span className="sol-clock-sep">:</span>{seg(s, 'sek')}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// KONT REBOU — Pwochen Peman
// ══════════════════════════════════════════════════════════════
export function PaymentCountdown({ nextUnpaidDate, plan }) {
  const [state, setState] = useState({ status: 'pending', t: { d: 0, h: 0, m: 0, s: 0 } })

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      // ✅ lè Ayiti reyèl (DST) — pa +5 fiks ankò
      const due = haitiWallToDate(nextUnpaidDate, plan.dueTime || '10:00').getTime()
      const end = haitiWallToDate(nextUnpaidDate, plan.dueTimeEnd || '15:00').getTime()
      if (due - now > 0)      setState({ status: 'pending', t: splitMs(due - now) })
      else if (end - now > 0) setState({ status: 'due',     t: splitMs(end - now) })
      else                    setState({ status: 'late',    t: splitMs(0) })
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [nextUnpaidDate, plan.dueTime, plan.dueTimeEnd])

  const cfg = {
    pending: { cls: 'amber', color: V.amber, Icon: Bell,        title: 'Pwochen peman ou', sub: `Ouvè ${plan.dueTime || '10:00'} · fèmen ${plan.dueTimeEnd || '15:00'}` },
    due:     { cls: 'green', color: V.green, Icon: CheckCircle, title: 'Ou ka peye kounye a', sub: `Lè limit la: ${plan.dueTimeEnd || '15:00'}` },
    late:    { cls: 'red',   color: V.red,   Icon: Bell,        title: 'Lè peman an pase', sub: 'Peye le pli vit pou evite blokaj.' },
  }[state.status]

  return (
    <div className={`sol-alert ${cfg.cls}`} style={{ alignItems: 'flex-start' }}>
      <div className="sol-alert-ico" style={{ background: `var(--s-${cfg.cls}-soft)`, color: cfg.color }}><cfg.Icon size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="sol-alert-title" style={{ color: cfg.color }}>{cfg.title} · {dmy(nextUnpaidDate)}</div>
        <div className="sol-alert-sub">{cfg.sub}</div>
        {state.status !== 'late' && <Clock3 {...state.t} color={cfg.color} tone={cfg.cls} />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// KONT REBOU — Blokaj
// ══════════════════════════════════════════════════════════════
export function BlockingCountdown({ nextUnpaidDate, lastPaidDate }) {
  const [left, setLeft] = useState(null)

  useEffect(() => {
    const tick = () => {
      // Blokaj: minwi lè Ayiti nan lendemen dat la (DST-aware)
      const block = haitiWallToDate(nextUnpaidDate, '00:00', 1).getTime()
      setLeft(block - Date.now())
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [nextUnpaidDate])

  return (
    <div className="sol-alert red" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="sol-alert-ico" style={{ background: 'var(--s-red-soft)', color: V.red }}><Bell size={20} /></div>
        <div>
          <div className="sol-alert-title" style={{ color: V.red }}>Peman {dmy(nextUnpaidDate)} pa peye</div>
          <div className="sol-alert-sub">Dènye peman ou: {lastPaidDate ? dmy(lastPaidDate) : '—'}</div>
        </div>
      </div>
      <div style={{ background: 'var(--s-card)', border: '1px solid var(--s-red-line)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: V.red }}>
          {left !== null && left <= 0 ? 'Kont ou bloke' : 'Tan ki rete avan blokaj'}
        </div>
        {left !== null && left > 0 && <Clock3 {...splitMs(left)} color={V.red} tone="red" />}
        <div style={{ fontSize: 12, color: V.muted, marginTop: 9 }}>Peye kounye a pou evite blokaj kont ou.</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// BANNYÈ DAT PEMAN DEKLARE (pwomès admin, san pozisyon)
// ══════════════════════════════════════════════════════════════
export function DeclaredPayoutBanner({ declaredPayoutDate }) {
  const [visible, setVisible] = useState(true)
  if (!declaredPayoutDate || !visible) return null
  return (
    <div className="sol-alert blue">
      <div className="sol-alert-ico" style={{ background: 'var(--s-blue-soft)', color: V.blue }}><Calendar size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="sol-alert-title" style={{ color: V.blue }}>Dat ou ap touche</div>
        <div className="sol-alert-sub" style={{ color: V.muted2 }}>
          Admin lan fikse peman sòl ou a pou <strong style={{ color: V.text }}>{dmy(declaredPayoutDate)}</strong>.
        </div>
      </div>
      <button className="sol-alert-x" onClick={() => setVisible(false)} aria-label="Fèmen"><X size={16} /></button>
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

  const tone = isChampion ? 'green' : 'red'
  return (
    <div className={`sol-alert ${tone}`} style={{ alignItems: 'flex-start' }}>
      <div className="sol-alert-ico" style={{ background: `var(--s-${tone}-soft)`, fontSize: 22 }}>{isChampion ? '🏆' : '⚠️'}</div>
      <div style={{ minWidth: 0 }}>
        <div className="sol-alert-title" style={{ color: V[tone] }}>
          {isChampion ? 'Bravo, ou se yon Chanpyon Sòl!' : 'Atansyon, ou gen peman an reta'}
        </div>
        <div className="sol-alert-sub" style={{ color: V.muted2, fontSize: 12.5, lineHeight: 1.65 }}>
          {isChampion
            ? <>Ou peye <strong style={{ color: V.text }}>{scoreData.early} fwa bonè</strong> deja. Kontinye konsa: plis ou peye bonè, plis konfyans ou bati. Nou fyè de ou!</>
            : <>Ou gen <strong style={{ color: V.text }}>{scoreData.late} peman an reta</strong>. Reta ka <strong style={{ color: V.red }}>bloke kont ou</strong>. Chak peman bonè ba ou pwen: ou kapab!</>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {(isChampion ? ['Disiplin', 'Fyète', 'Responsabilite'] : ['Peye bonè', 'Amelyore pèfòmans', 'Evite blokaj']).map(tag => (
            <span key={tag} className={`sol-badge ${tone}`}>{tag}</span>
          ))}
        </div>
      </div>
      <button className="sol-alert-x" onClick={() => setVisible(false)} aria-label="Fèmen"><X size={16} /></button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PÈFÒMANS SECTION
// ══════════════════════════════════════════════════════════════
export function PerformanceSection({ scoreData }) {
  if (!scoreData) return null
  const total = Math.max(1, scoreData.early + scoreData.onTime + scoreData.late)
  const seg = (n, color) => n > 0 && <div style={{ width: `${(n / total) * 100}%`, background: color, height: '100%' }} />
  return (
    <div className="sol-card sol-card-pad" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <span className="sol-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={15} style={{ color: V.accentText }} /> Pèfòmans ou
        </span>
        <ScoreBadge score={scoreData.score} />
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', background: 'var(--s-line)', marginBottom: 12 }}>
        {seg(scoreData.early, 'var(--s-accent)')}{seg(scoreData.onTime, 'var(--s-green)')}{seg(scoreData.late, 'var(--s-amber)')}
      </div>
      <div className="sol-score-row">
        <span style={{ color: V.accentText, fontWeight: 700 }}>⚡ {scoreData.early} bonè</span>
        <span style={{ color: V.green, fontWeight: 700 }}>✓ {scoreData.onTime} a lè</span>
        <span style={{ color: V.amber, fontWeight: 700 }}>● {scoreData.late} reta</span>
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

  // ⚠️ EGRESS — pa gen setInterval: mesaj yo chaje yon sèl fwa lè tab la louvri,
  // epi bouton "Rafrechi" a (fetchMessages) pou wè nouvo mesaj.
  useEffect(() => { fetchMessages() }, [fetchMessages])
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
    <div className="sol-card sol-chat">
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--s-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="sol-section-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Chat · {plan.name}</div>
          <div style={{ fontSize: 11.5, color: V.muted, marginTop: 2 }}>Diskisyon anonim ant manm yo</div>
        </div>
        <button className="sol-icon-btn" onClick={fetchMessages} aria-label="Rafrechi mesaj yo" style={{ width: 34, height: 34 }}><RefreshCw size={13} /></button>
      </div>

      <div className="sol-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid var(--s-line2)', borderTopColor: 'var(--s-accent)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '44px 20px', color: V.muted }}>
            <MessageCircle size={34} style={{ marginBottom: 10, opacity: .5 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: V.muted2 }}>Poko gen mesaj</p>
            <p style={{ fontSize: 12.5, marginTop: 4 }}>Ekri premye mesaj la pou kòmanse diskisyon an.</p>
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
                <div style={{ textAlign: 'center', margin: '8px 0 10px' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: V.muted, background: 'var(--s-card2)', padding: '3px 11px', borderRadius: 99 }}>{msgDate}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: isAdmin ? 'var(--s-btn)' : isMe ? 'var(--s-accent)' : 'var(--s-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isAdmin || isMe ? '#fff' : V.muted2, border: '1px solid var(--s-line)' }}>
                  {isAdmin ? '👑' : String(msg.authorName || '').replace('Manm #', '')}
                </div>
                <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                  {!isMe && <span style={{ fontSize: 10.5, color: isAdmin ? V.accentText : V.muted, fontWeight: 700, marginLeft: 4 }}>{msg.authorName}</span>}
                  <div className="sol-bubble" style={{
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe ? 'var(--s-accent)' : isAdmin ? 'var(--s-accent-soft)' : 'var(--s-card2)',
                    border: `1px solid ${isAdmin ? 'var(--s-accent-line)' : 'var(--s-line)'}`,
                    color: isMe ? '#fff' : V.text,
                  }}>{msg.message}</div>
                  <span style={{ fontSize: 10, color: V.muted, margin: '0 4px' }}>{fmtTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--s-line)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} maxLength={500} aria-label="Mesaj"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ekri yon mesaj…" rows={1} className="sol-inp"
          style={{ flex: 1, padding: '11px 14px', borderRadius: 14, fontSize: 14, resize: 'none', lineHeight: 1.45, maxHeight: 100 }} />
        <button onClick={send} disabled={sending || !input.trim()} aria-label="Voye mesaj" className="sol-btn primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 14, flexShrink: 0, opacity: input.trim() ? 1 : .45 }}>
          {sending
            ? <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            : <Send size={17} />}
        </button>
      </div>
    </div>
  )
}
