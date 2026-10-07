// src/pages/enterprise/kane-epay/KaneEpayComponents.jsx
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Konpozan UI (konsèp "Plus Fit": Barlow Condensed + Manrope)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, AlertCircle, Camera, Check, Banknote, Smartphone,
  ArrowLeftRight, CreditCard, FileText,
} from 'lucide-react'
import { fmt, buildShareReceiptHTML, RECEIPT_WIDTH } from './kaneEpayUtils'
import { PAYMENT_METHODS, AVATAR_GRADIENTS, T, FRE_OUVERTURE, hexA } from './kaneEpayConstants'

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 14, color = 'currentColor' }) {
  return <span className="ke-spinner" style={{ width: size, height: size, color }} />
}

// ─── Chif ki monte (count-up) ────────────────────────────────
export function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const to = Number(target) || 0
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { fromRef.current = to; setVal(to); return }
    const from = fromRef.current
    if (from === to) { setVal(to); return }
    let raf, start
    const tick = (t) => {
      if (start === undefined) start = t
      const p = Math.min((t - start) / duration, 1)
      const v = from + (to - from) * (1 - Math.pow(1 - p, 4))
      fromRef.current = v; setVal(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-HT')

export function AnimatedNumber({ value, format = fmt, signed = false, duration }) {
  const v = useCountUp(value, duration)
  return <>{signed && v > 0.004 ? '+' : ''}{format(v)}</>
}
export const AnimatedInt = (p) => <AnimatedNumber {...p} format={fmtInt} />

// Ba pwogrè ki ranpli apre montaj la
export function Track({ pct = 0, color, dark = false }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = setTimeout(() => setW(Math.max(0, Math.min(100, pct))), 120); return () => clearTimeout(id) }, [pct])
  return (
    <div className={dark ? 'ke-dtrack' : 'ke-track'} style={{ '--c': color }}>
      <i style={{ width: `${w}%`, background: color }} />
    </div>
  )
}

// ─── Avatar ──────────────────────────────────────────────────
export function avatarColors(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
export function initials(a) {
  return (((a?.firstName || '').trim()[0] || '') + ((a?.lastName || '').trim()[0] || '')).toUpperCase() || '?'
}
export function Avatar({ account, size = 48, radius = 16 }) {
  const [a1, a2] = avatarColors(`${account?.firstName}${account?.lastName}${account?.accountNumber}`)
  return (
    <div className="ke-av" style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.42, '--a1': a1, '--a2': a2 }}>
      {initials(account)}
    </div>
  )
}

// ─── Wonn aktivite (hero) ────────────────────────────────────
export function Ring({ value = 0, size = 170, stroke = 14, color = T.gold }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [p, setP] = useState(0)
  useEffect(() => { const id = setTimeout(() => setP(Math.max(0, Math.min(1, value))), 150); return () => clearTimeout(id) }, [value])
  const pct = Math.round(useCountUp(value * 100, 1400))
  return (
    <div className="ke-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ filter: `drop-shadow(0 0 10px ${hexA(color, .45)})` }} />
      </svg>
      <div className="ke-ring-c" style={{ fontSize: size * 0.3 }}>
        <span>{pct}<small>%</small></span>
      </div>
    </div>
  )
}

// ─── Kat stat blan (menm jan ak Gym) ─────────────────────────
export function StatCard({ label, num, format = fmtInt, suffix, icon, color = T.teal, pill, pct, delay = 0 }) {
  return (
    <div className="ke-stat" style={{ '--c': color, '--cbg': hexA(color, .1), '--cbg2': hexA(color, .12), animationDelay: `${delay}s` }}>
      <div className="ke-stat-top">
        <div className="ke-stat-ic">{icon}</div>
        {pill != null && <span className="ke-pill">{pill}</span>}
      </div>
      <p className="ke-stat-v"><AnimatedNumber value={num} format={format} />{suffix && <small>{suffix}</small>}</p>
      <p className="ke-stat-l">{label}</p>
      <Track pct={pct} color={color} />
    </div>
  )
}

// ─── Kat "glass" nan hero ────────────────────────────────────
export function GlassStat({ label, icon, num, color, pct, sub, signed }) {
  return (
    <div className="ke-glass">
      <p className="ke-glass-l">{icon}{label}</p>
      <p className="ke-glass-v" style={{ color: color || '#fff' }}><AnimatedNumber value={num} signed={signed} /><small>HTG</small></p>
      <Track pct={pct} color={color} dark />
      {sub && <p className="ke-glass-s">{sub}</p>}
    </div>
  )
}

// ─── Chip ────────────────────────────────────────────────────
export function Chip({ color = T.ink, icon, children, dark }) {
  return (
    <span className={`ke-chip${dark ? ' dark' : ''}`} style={dark ? undefined : { '--c': color, '--cbg': hexA(color, .1) }}>
      {icon}{children}
    </span>
  )
}

// ─── Section fòm ─────────────────────────────────────────────
export function Section({ n, title, optional, children, delay = 0 }) {
  return (
    <div className="ke-sec" style={{ animationDelay: `${delay}s` }}>
      <div className="ke-sec-h">
        {n != null && <span className="ke-sec-n">{n}</span>}
        <p className="ke-sec-t">{title}</p>
        {optional && <span className="ke-sec-opt">Opsyonèl</span>}
      </div>
      {children}
    </div>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      {label && <label className="ke-label">{label}</label>}
      {children}
      {error && <p className="ke-err"><AlertCircle size={13} /> {error}</p>}
      {!error && hint && <p className="ke-hint">{hint}</p>}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────
export function Modal({ onClose, title, subtitle, icon, accent = T.gold, width = 540, footer, children, dismissible = false }) {
  const [closing, setClosing] = useState(false)
  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(() => onClose?.(), 200)
  }, [closing, onClose])

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

// ─── Lightbox ────────────────────────────────────────────────
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
          <><img src={preview} alt={label} /><span className="ok"><Check size={15} strokeWidth={3} /></span></>
        ) : (
          <><span className="ic">{icon || <Camera size={18} />}</span><span>{hint}</span></>
        )}
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange} />
      </label>
    </div>
  )
}

// ─── Metòd peman ─────────────────────────────────────────────
const METHOD_ICONS = { cash: Banknote, moncash: Smartphone, natcash: Smartphone, transfer: ArrowLeftRight, card: CreditCard, check: FileText }
export function MethodPicker({ value, onChange }) {
  return (
    <div className="ke-methods" role="radiogroup">
      {PAYMENT_METHODS.map(m => {
        const Ic = METHOD_ICONS[m.value] || Banknote
        return (
          <button type="button" key={m.value} role="radio" aria-checked={value === m.value}
            className={`ke-m${value === m.value ? ' on' : ''}`} onClick={() => onChange(m.value)}>
            <Ic size={18} />{m.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Gwo chan montan (bwat nwa) ──────────────────────────────
// accent = koulè sou fon nwa (lò, vèt klè, wouj klè, ble klè)
export function AmountField({ label, value, onChange, accent = T.gold, quick = [], allValue, error, autoFocus, onEnter }) {
  return (
    <div>
      <div className={`ke-amount${error ? ' err' : ''}`} style={{ '--acc': accent, '--glow': hexA(accent, .22), '--ring': hexA(accent, .35) }}>
        <p className="ke-amount-l">{label}</p>
        <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0"
          value={value} autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onFocus={e => e.target.select()}
          onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }} />
        <div className="ke-amount-cur">HTG · GOUD</div>
        {(quick.length > 0 || allValue > 0) && (
          <div className="ke-quick">
            {quick.map(q => (
              <button type="button" key={q} onClick={() => onChange(String(q))}>{Number(q).toLocaleString('fr-HT')}</button>
            ))}
            {allValue > 0 && <button type="button" className="all" onClick={() => onChange(String(allValue))}>Tout balans</button>}
          </div>
        )}
      </div>
      {error && <p className="ke-err"><AlertCircle size={13} /> {error}</p>}
    </div>
  )
}

// ─── Alert ───────────────────────────────────────────────────
export function Alert({ color = T.orange, icon, children }) {
  return (
    <div className="ke-alert" style={{ '--c': color, '--cbg': hexA(color, .07), '--cbd': hexA(color, .25) }}>
      {icon || <AlertCircle size={17} />}
      <div>{children}</div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────
export function AccountSkeleton({ i = 0 }) {
  return (
    <div className="ke-acc" style={{ cursor: 'default', animationDelay: `${i * 0.05}s` }}>
      <div className="ke-acc-head">
        <div className="ke-skel" style={{ width: 48, height: 48, borderRadius: 16 }} />
        <div style={{ flex: 1 }}>
          <div className="ke-skel" style={{ width: '40%', height: 11, marginBottom: 8 }} />
          <div className="ke-skel" style={{ width: '70%', height: 15 }} />
        </div>
      </div>
      <div className="ke-skel" style={{ height: 78, borderRadius: 18 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="ke-skel" style={{ flex: 1, height: 42, borderRadius: 13 }} />
        <div className="ke-skel" style={{ flex: 1, height: 42, borderRadius: 13 }} />
        <div className="ke-skel" style={{ width: 42, height: 42, borderRadius: 13 }} />
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
        {balance > 0 && <i style={{ flex: 1, background: T.green }} />}
      </div>
      <div className="ke-legend">
        {fee > 0    && <span style={{ color: T.red }}>Frè {fmt(fee)}</span>}
        {locked > 0 && <span style={{ color: T.orange }}>Bloke {fmt(locked)}</span>}
        <span style={{ color: balance >= 0 ? T.green : T.red }}>Balans {fmt(balance)}</span>
      </div>
    </>
  )
}

// ─── Aperçu resi pataje (menm HTML ak imaj/PDF la) ───────────
export function ReceiptPreview({ account, transaction, tenant, type }) {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const [box, setBox] = useState({ scale: 1, h: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || RECEIPT_WIDTH
      const scale = Math.min(1, w / RECEIPT_WIDTH)
      const h = (innerRef.current?.scrollHeight || 0) * scale
      setBox({ scale, h })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(wrapRef.current)
    document.fonts?.ready?.then(measure).catch(() => {})
    return () => ro?.disconnect()
  }, [account, transaction, type])

  return (
    <div ref={wrapRef} className="ke-rcpt-wrap" style={{ height: box.h || undefined }}>
      <div ref={innerRef} className="ke-rcpt-inner"
        style={{ width: RECEIPT_WIDTH, transform: `scale(${box.scale})`, marginLeft: box.scale < 1 ? 0 : 'auto', marginRight: box.scale < 1 ? 0 : 'auto' }}
        dangerouslySetInnerHTML={{ __html: buildShareReceiptHTML(account, transaction, tenant, type) }} />
    </div>
  )
}