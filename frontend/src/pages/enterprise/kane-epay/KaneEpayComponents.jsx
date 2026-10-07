// src/pages/enterprise/kane-epay/KaneEpayComponents.jsx
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Konpozan UI (design premium + animasyon)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, AlertCircle, Camera, Check, Banknote, Smartphone,
  ArrowLeftRight, CreditCard, FileText,
} from 'lucide-react'
import { fmt } from './kaneEpayUtils'
import { PAYMENT_METHODS, AVATAR_GRADIENTS, T, FRE_OUVERTURE } from './kaneEpayConstants'

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 14, color = 'currentColor' }) {
  return <span className="ke-spinner" style={{ width: size, height: size, color }} />
}

// ─── Hook: chif ki monte dousman (count-up) ──────────────────
export function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const to = Number(target) || 0
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { fromRef.current = to; setVal(to); return }
    const from = fromRef.current
    if (from === to) { setVal(to); return }
    let raf, start
    const tick = (t) => {
      if (start === undefined) start = t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)
      const v = from + (to - from) * eased
      fromRef.current = v
      setVal(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-HT')

export function AnimatedNumber({ value, format = fmt, signed = false, className = 'ke-num', duration }) {
  const v = useCountUp(value, duration)
  const sign = signed && v > 0.004 ? '+' : ''
  return <span className={className}>{sign}{format(v)}</span>
}
export const AnimatedInt = (p) => <AnimatedNumber {...p} format={fmtInt} />

// ─── Avatar (koulè fiks selon non an) ────────────────────────
export function avatarColors(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
export function initials(a) {
  const f = (a?.firstName || '').trim()[0] || ''
  const l = (a?.lastName  || '').trim()[0] || ''
  return (f + l).toUpperCase() || '?'
}
export function Avatar({ account, size = 46, radius = 15, photo = false }) {
  const [a1, a2] = avatarColors(`${account?.firstName}${account?.lastName}${account?.accountNumber}`)
  return (
    <div className="ke-av" style={{ width: size, height: size, borderRadius: radius, '--a1': a1, '--a2': a2, fontSize: size * 0.33 }}>
      {photo && account?.photoUrl ? <img src={account.photoUrl} alt="" /> : initials(account)}
    </div>
  )
}

// ─── Wonn pwogrè (ring) ──────────────────────────────────────
export function Ring({ value = 0, size = 40, stroke = 4, color = T.green, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [p, setP] = useState(0)
  useEffect(() => { const id = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, value)))); return () => cancelAnimationFrame(id) }, [value])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg className="ke-ring" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      {label != null && (
        <span className="ke-num" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color }}>{label}</span>
      )}
    </div>
  )
}

// ─── StatCard (KPI) ──────────────────────────────────────────
// Konpatib ak ansyen vèsyon an: `value` (tèks) — oswa `num` + `format` pou chif anime.
export function StatCard({ label, value, num, format = fmt, suffix, sub, icon, color = T.gold, ring, delay = 0 }) {
  return (
    <div className="ke-kpi" style={{ '--c': color, animationDelay: `${delay}s` }}>
      <div className="ke-kpi-top">
        <div className="ke-chip-ic">{icon}</div>
        {ring != null && <Ring value={ring} color={color} label={`${Math.round(ring * 100)}%`} />}
      </div>
      <p className="ke-kpi-lbl">{label}</p>
      <p className="ke-kpi-val">
        {num != null ? <AnimatedNumber value={num} format={format} /> : <span className="ke-num">{value}</span>}
        {suffix && <span style={{ fontSize: 12, color: T.gold2, marginLeft: 5, fontWeight: 800, letterSpacing: '.1em' }}>{suffix}</span>}
      </p>
      {sub && <p className="ke-kpi-sub">{sub}</p>}
    </div>
  )
}

// ─── Tile "Aktivite jodi a" (nan hero a) ─────────────────────
export function TodayTile({ label, num, signed, sub, icon, color, delay = 0 }) {
  return (
    <div className="ke-tile" style={{ '--c': color, animationDelay: `${delay}s` }}>
      <div className="ke-tile-h">
        <div className="ke-chip-ic" style={{ width: 30, height: 30, borderRadius: 10 }}>{icon}</div>
        <p className="ke-tile-l">{label}</p>
      </div>
      <p className="ke-tile-v"><AnimatedNumber value={num} signed={signed} /> <span style={{ fontSize: 11, opacity: .8 }}>G</span></p>
      {sub && <p className="ke-tile-s">{sub}</p>}
    </div>
  )
}

// ─── Section fòm ─────────────────────────────────────────────
export function Section({ n, icon, title, optional, children, delay = 0 }) {
  return (
    <div className="ke-sec" style={{ animationDelay: `${delay}s` }}>
      <div className="ke-sec-h">
        {n != null && <span className="ke-sec-n">{n}</span>}
        <p className="ke-sec-t">{n == null && icon}{title}</p>
        {optional && <span className="ke-sec-opt">Opsyonèl</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Field (label + input + erè) ─────────────────────────────
export function Field({ label, error, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      {label && <label className="ke-label">{label}</label>}
      {children}
      {error && <p className="ke-err"><AlertCircle size={12} /> {error}</p>}
    </div>
  )
}

// ─── Modal (bottom-sheet sou mobil, santre sou PC) ───────────
export function Modal({ onClose, title, subtitle, icon, accent = T.gold, width = 540, footer, children, dismissible = false }) {
  const [closing, setClosing] = useState(false)
  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(() => onClose?.(), 200)
  }, [closing, onClose])

  // Bloke scroll paj la pandan modal la louvri
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!dismissible) return
    const h = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [dismissible, close])

  return createPortal(
    <div className={`ke-scope ke-ov${closing ? ' closing' : ''}`}
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) close() }}>
      <div className="ke-sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        style={{ '--w': `${width}px`, '--accent': accent }}>
        <div className="ke-sheet-glow" />
        <div className="ke-grab" />
        <div className="ke-mhead">
          {icon && <div className="ke-mhead-ic">{icon}</div>}
          <div style={{ minWidth: 0 }}>
            <h2 className="ke-mtitle">{title}</h2>
            {subtitle && <p className="ke-msub">{subtitle}</p>}
          </div>
          <button className="ke-x" onClick={close} aria-label="Fèmen"><X size={17} /></button>
        </div>
        <div className="ke-mbody">{children}</div>
        {footer && <div className="ke-mfoot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

// ─── Lightbox foto ───────────────────────────────────────────
export function Lightbox({ src, caption, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  if (!src) return null
  return createPortal(
    <div className="ke-scope ke-lb" onClick={onClose}>
      <img src={src} alt={caption || ''} />
      {caption && <p>{caption}</p>}
    </div>,
    document.body
  )
}

// ─── PhotoBox (KYC) ──────────────────────────────────────────
export function PhotoBox({ label, icon, preview, inputId, onChange, hint }) {
  return (
    <div>
      <label className="ke-label">{label}</label>
      <label htmlFor={inputId} className={`ke-photo${preview ? ' has' : ''}`}>
        {preview ? (
          <>
            <img src={preview} alt={label} />
            <span className="ok"><Check size={14} strokeWidth={3} /></span>
          </>
        ) : (
          <>
            <span className="ic">{icon || <Camera size={18} />}</span>
            <span className="h">{hint}</span>
          </>
        )}
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange} />
      </label>
    </div>
  )
}

// ─── Chwa metòd peman (pills) ────────────────────────────────
const METHOD_ICONS = {
  cash: Banknote, moncash: Smartphone, natcash: Smartphone,
  transfer: ArrowLeftRight, card: CreditCard, check: FileText,
}
export function MethodPicker({ value, onChange }) {
  return (
    <div className="ke-methods" role="radiogroup">
      {PAYMENT_METHODS.map(m => {
        const Ic = METHOD_ICONS[m.value] || Banknote
        return (
          <button type="button" key={m.value} role="radio" aria-checked={value === m.value}
            className={`ke-m${value === m.value ? ' on' : ''}`} onClick={() => onChange(m.value)}>
            <Ic size={17} />{m.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Gwo chan montan + bouton rapid ──────────────────────────
export function AmountField({ label, value, onChange, accent = T.gold, quick = [], allValue, error, autoFocus, onEnter }) {
  return (
    <div>
      <div className={`ke-amount${error ? ' err' : ''}`} style={{ '--accent': accent }}>
        <p className="ke-amount-l">{label}</p>
        <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00"
          value={value} autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onFocus={e => e.target.select()}
          onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }} />
        <div className="ke-amount-cur">HTG · GOUD</div>
        {(quick.length > 0 || allValue > 0) && (
          <div className="ke-quick">
            {quick.map(q => (
              <button type="button" key={q} className="ke-q" onClick={() => onChange(String(q))}>
                {Number(q).toLocaleString('fr-HT')}
              </button>
            ))}
            {allValue > 0 && (
              <button type="button" className="ke-q all" onClick={() => onChange(String(allValue))}>Tout balans</button>
            )}
          </div>
        )}
      </div>
      {error && <p className="ke-err"><AlertCircle size={12} /> {error}</p>}
    </div>
  )
}

// ─── Alert ───────────────────────────────────────────────────
export function Alert({ color = T.orange, icon, children }) {
  return (
    <div className="ke-alert" style={{ '--c': color }}>
      {icon || <AlertCircle size={16} />}
      <div>{children}</div>
    </div>
  )
}

// ─── Skeleton kat kont ───────────────────────────────────────
export function AccountSkeleton({ i = 0 }) {
  return (
    <div className="ke-acc" style={{ cursor: 'default', animationDelay: `${i * 0.05}s` }}>
      <div className="ke-acc-head">
        <div className="ke-skel" style={{ width: 46, height: 46, borderRadius: 15 }} />
        <div style={{ flex: 1 }}>
          <div className="ke-skel" style={{ width: '45%', height: 10, marginBottom: 8 }} />
          <div className="ke-skel" style={{ width: '75%', height: 14 }} />
        </div>
      </div>
      <div className="ke-skel" style={{ height: 66, borderRadius: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="ke-skel" style={{ flex: 1, height: 40, borderRadius: 12 }} />
        <div className="ke-skel" style={{ flex: 1, height: 40, borderRadius: 12 }} />
        <div className="ke-skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
      </div>
    </div>
  )
}

// ─── BalanceBar (frè / bloke / balans) ───────────────────────
export function BalanceBar({ opening, fee = FRE_OUVERTURE, locked = 0 }) {
  const balance = opening - fee - locked
  const pct = (n) => `${opening > 0 ? Math.min((n / opening) * 100, 100) : 0}%`
  return (
    <>
      <div className="ke-stack">
        {fee > 0     && <i style={{ width: pct(fee),    background: T.red }} />}
        {locked > 0  && <i style={{ width: pct(locked), background: T.orange }} />}
        {balance > 0 && <i style={{ flex: 1, background: `linear-gradient(90deg, ${T.green}, #6FF0B8)` }} />}
      </div>
      <div className="ke-legend">
        {fee > 0    && <span style={{ color: T.red }}>Frè {fmt(fee)}</span>}
        {locked > 0 && <span style={{ color: T.orange }}>Bloke {fmt(locked)}</span>}
        <span style={{ color: balance >= 0 ? T.green : T.red }}>Balans {fmt(balance)}</span>
      </div>
    </>
  )
}