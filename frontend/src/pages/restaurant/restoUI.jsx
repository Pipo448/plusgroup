// src/pages/restaurant/restoUI.jsx
// ─── Konpozan UI pataje modil Restoran an (design Plus Resto) ─────────
// Glas, tilt 3D, plat ki flote, animasyon. Itilize pa paj staff yo ak pòtal kliyan an.
import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Moon, Sun, X, Search, Plus, Check, Minus } from 'lucide-react'
import './resto.css'

// ══════════════════════════════════════════════
// ZOUTI
// ══════════════════════════════════════════════
export const cx = (...a) => a.filter(Boolean).join(' ')

export const fmt = (n, dec = 2) =>
  Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

export const money = (n, dec = 2) => `${fmt(n, dec)} HTG`

// Non tenant an soti nan paramèt tenant an (Settings) — non biznis la an premye
export const getTenantName = (tenant, fallback = 'Restoran') =>
  tenant?.settings?.businessName || tenant?.businessName || tenant?.settings?.companyName ||
  tenant?.companyName || tenant?.name || fallback

export const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

export function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return m
}

export function useRestoTheme(key = 'resto-theme') {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(key) || 'dark' } catch { return 'dark' }
  })
  const toggle = useCallback(() => {
    setTheme((t) => {
      const n = t === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(key, n) } catch { /* pa gen depo */ }
      return n
    })
  }, [key])
  return [theme, toggle]
}

export function useTilt(maxX = 12, maxY = 16) {
  const ref = useRef(null)
  const onPointerMove = (e) => {
    if (e.pointerType === 'touch' || reducedMotion()) return
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${((0.5 - y) * maxX).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * maxY).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    el.classList.add('is-tilting')
  }
  const onPointerLeave = () => {
    const el = ref.current; if (!el) return
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
    el.classList.remove('is-tilting')
  }
  return { ref, onPointerMove, onPointerLeave }
}

export function useCountUp(target, ms = 700) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (reducedMotion()) { setV(target); from.current = target; return undefined }
    let raf, start = null
    const a = from.current
    const step = (t) => {
      if (start == null) start = t
      const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3)
      setV(a + (target - a) * e)
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); from.current = target }
  }, [target, ms])
  return v
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id) }, [value, ms])
  return v
}

export function timeAgo(t, date) {
  const d = new Date(date)
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000))
  if (min < 1) return t('common.justNow')
  if (min < 60) return t('common.ago', { count: min })
  return t('common.hoursAgo', { count: Math.round(min / 60) })
}

export const hhmm = (date) => {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Dat lokal YYYY-MM-DD (fuzo Ayiti)
export function haitiToday(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  if (!offset) return parts
  const d = new Date(`${parts}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function dayParts(t, dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const days = String(t('common.days')).split(',')
  const months = String(t('common.months')).split(',')
  return { dow: days[d.getUTCDay()] || '', num: d.getUTCDate(), mon: months[d.getUTCMonth()] || '' }
}

// ══════════════════════════════════════════════
// SÈN AK PÒTAL
// ══════════════════════════════════════════════
export function Stage({ theme = 'dark', className, children, ...rest }) {
  return <div className={cx('rs', className)} data-theme={theme} {...rest}>{children}</div>
}

// Modal yo rann nan document.body pou okenn transform paran pa kraze position:fixed
export function Layer({ theme, children }) {
  if (typeof document === 'undefined') return null
  return createPortal(<div className="rs rs-portal" data-theme={theme}>{children}</div>, document.body)
}

// ══════════════════════════════════════════════
// BOUTON / BADGE
// ══════════════════════════════════════════════
export function Btn({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconR, loading, block, className, children, type = 'button', disabled, ...rest }) {
  const iconOnly = children == null || children === false
  const isz = size === 'sm' ? 15 : size === 'lg' ? 20 : 17
  return (
    <button type={type} {...rest} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cx('rs-btn', `rs-btn--${variant}`, `rs-btn--${size}`, block && 'rs-btn--block', iconOnly && 'rs-btn--icon', loading && 'is-loading', className)}>
      {variant === 'primary' && <span className="rs-btn__shine" aria-hidden="true" />}
      {loading ? <span className="rs-spinner" aria-hidden="true" /> : Icon ? <Icon size={isz} strokeWidth={2.2} /> : null}
      {!iconOnly && <span>{children}</span>}
      {IconR && !loading && <IconR size={isz} strokeWidth={2.2} className={block ? 'rs-btn__trail' : undefined} />}
    </button>
  )
}

export function Badge({ tone = 'neutral', icon: Icon, children, className, dot, pulse }) {
  return (
    <span className={cx('rs-badge', `rs-badge--${tone}`, className)}>
      {dot && <span className={cx('rs-dot', pulse && 'rs-dot--pulse')} />}
      {Icon && <Icon size={13} strokeWidth={2.4} />}
      {children}
    </span>
  )
}

export function ThemeToggle({ theme, onToggle, t, size = 'md' }) {
  const dark = theme === 'dark'
  return (
    <Btn variant="glass" size={size} icon={dark ? Sun : Moon} onClick={onToggle}
      aria-label={dark ? t('common.themeLight') : t('common.themeDark')} title={dark ? t('common.themeLight') : t('common.themeDark')} />
  )
}

// ══════════════════════════════════════════════
// ILISTRASYON PLAT (SVG) + FOTO
// ══════════════════════════════════════════════
function grains(n, cx0, cy0, rad, cls, seed = 7) {
  const out = []; let s = seed
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rad
    const x = (cx0 + Math.cos(a) * r).toFixed(1), y = (cy0 + Math.sin(a) * r * 0.85).toFixed(1)
    out.push(<ellipse key={`g${i}`} className={cls} cx={x} cy={y} rx={3.2} ry={1.3} transform={`rotate(${Math.round(rnd() * 180)} ${x} ${y})`} />)
  }
  return out
}
function pikliz(x, y, k) {
  return ['rs-f-red', 'rs-f-green', 'rs-f-gold', 'rs-f-cream', 'rs-f-red', 'rs-f-green'].map((c, i) => {
    const px = x + (i % 3) * 7 - 7, py = y + Math.floor(i / 3) * 7 - 3, rot = (i * 47) % 180
    return <rect key={k + i} className={c} x={px} y={py} width={16} height={3.2} rx={1.6} transform={`rotate(${rot} ${px + 8} ${py + 1.6})`} />
  })
}
const E = (props) => <ellipse {...props} />
const FOOD = {
  griyo: () => [
    <E key="b1" className="rs-f-gold" cx={62} cy={118} rx={20} ry={16} transform="rotate(-20 62 118)" />,
    <E key="b1i" className="rs-f-goldi" cx={62} cy={118} rx={12} ry={9} transform="rotate(-20 62 118)" />,
    <E key="b2" className="rs-f-gold" cx={82} cy={146} rx={19} ry={15} transform="rotate(15 82 146)" />,
    <E key="b2i" className="rs-f-goldi" cx={82} cy={146} rx={11} ry={8} transform="rotate(15 82 146)" />,
    <E key="g1" className="rs-f-crust" cx={118} cy={78} rx={18} ry={14} transform="rotate(25 118 78)" />,
    <E key="g2" className="rs-f-crust" cx={140} cy={104} rx={16} ry={13} transform="rotate(-30 140 104)" />,
    <E key="g3" className="rs-f-crust" cx={112} cy={110} rx={15} ry={12} transform="rotate(60 112 110)" />,
    <E key="g4" className="rs-f-crust" cx={128} cy={136} rx={15} ry={12} transform="rotate(10 128 136)" />,
    <E key="g5" className="rs-f-crust" cx={92} cy={84} rx={13} ry={11} transform="rotate(-15 92 84)" />,
    <E key="h1" className="rs-f-hi" cx={114} cy={73} rx={7} ry={3} transform="rotate(25 114 73)" />,
    <E key="h2" className="rs-f-hi" cx={136} cy={99} rx={6} ry={2.6} transform="rotate(-30 136 99)" />,
    ...pikliz(70, 70, 'p'),
  ],
  djondjon: () => [
    <path key="r" className="rs-f-rice" d="M48 104c0-30 24-52 54-52s52 20 52 48-22 52-52 52-54-18-54-48z" />,
    ...grains(46, 100, 102, 44, 'rs-f-grain', 11),
    <circle key="p1" className="rs-f-green" cx={84} cy={88} r={4} />,
    <circle key="p2" className="rs-f-green" cx={118} cy={120} r={4} />,
    <circle key="p3" className="rs-f-green" cx={126} cy={84} r={3.5} />,
    <path key="av" className="rs-f-green" d="M132 132c14-4 24 4 26 14-12 6-24 2-26-14z" />,
    <path key="avi" className="rs-f-cream" d="M137 135c9-1 15 4 16 9-7 2-14 0-16-9z" />,
    <path key="sh" className="rs-f-red" d="M66 132c6-10 20-10 24 0-4 2-8-4-12-2s-8 6-12 2z" />,
  ],
  legim: () => [
    <path key="rice" className="rs-f-cream" d="M44 100c0-24 16-40 38-40 14 0 22 18 22 40s-8 42-22 42c-22 0-38-18-38-42z" />,
    ...grains(26, 72, 100, 24, 'rs-f-graind', 3),
    <path key="stew" className="rs-f-stew" d="M100 70c22-10 50 0 56 24 6 26-10 48-34 50-20 2-30-14-28-34 1-16-6-34 6-40z" />,
    <E key="m1" className="rs-f-crust" cx={122} cy={96} rx={11} ry={9} />,
    <E key="m2" className="rs-f-crust" cx={138} cy={122} rx={9} ry={8} />,
    <circle key="k1" className="rs-f-orange" cx={112} cy={124} r={5} />,
    <circle key="k2" className="rs-f-green" cx={142} cy={98} r={4} />,
    <E key="h" className="rs-f-hi" cx={120} cy={92} rx={5} ry={2} />,
  ],
  joumou: () => {
    const out = [
      <circle key="bowl" className="rs-f-bowl" cx={100} cy={100} r={62} />,
      <circle key="soup" className="rs-f-orange" cx={100} cy={100} r={54} />,
      <circle key="soupi" className="rs-f-orangei" cx={94} cy={94} r={34} />,
    ];
    [[78, 82, 20], [112, 76, -30], [124, 112, 60], [86, 118, 10], [100, 98, 80], [70, 104, -50], [130, 92, 30]].forEach((q, i) =>
      out.push(<rect key={`m${i}`} className="rs-f-cream" x={q[0] - 7} y={q[1] - 2.5} width={14} height={5} rx={2.5} transform={`rotate(${q[2]} ${q[0]} ${q[1]})`} />));
    [[96, 132], [134, 128], [66, 86]].forEach((q, i) => out.push(<circle key={`c${i}`} className="rs-f-red" cx={q[0]} cy={q[1]} r={5} />));
    [[104, 70], [118, 128], [76, 128], [140, 104], [60, 110]].forEach((q, i) =>
      out.push(<path key={`h${i}`} className="rs-f-green" d={`M${q[0]} ${q[1]}c3-4 7-4 8 0-3 3-6 3-8 0z`} />))
    out.push(<E key="gl" className="rs-f-hi" cx={80} cy={70} rx={14} ry={5} transform="rotate(-30 80 70)" />)
    return out
  },
  akra: () => {
    const out = [];
    [[78, 80, 17], [114, 72, 15], [138, 104, 16], [100, 108, 18], [70, 120, 15], [112, 142, 16]].forEach(([x, y, r], i) => {
      out.push(<E key={`a${i}`} className="rs-f-akra" cx={x} cy={y} rx={r} ry={r * 0.86} transform={`rotate(${i * 37} ${x} ${y})`} />)
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + i
        out.push(<circle key={`a${i}k${k}`} className="rs-f-akra" cx={(x + Math.cos(ang) * r * 0.85).toFixed(1)} cy={(y + Math.sin(ang) * r * 0.75).toFixed(1)} r={(r * 0.32).toFixed(1)} />)
      }
      out.push(<E key={`ah${i}`} className="rs-f-hi" cx={x - r * 0.3} cy={y - r * 0.4} rx={r * 0.35} ry={r * 0.15} />)
    })
    return out.concat(pikliz(146, 140, 'p'))
  },
  bwason: () => [
    <circle key="ice" className="rs-f-glass" cx={100} cy={100} r={46} />,
    <circle key="j" className="rs-f-orange" cx={100} cy={100} r={38} />,
    <circle key="ji" className="rs-f-orangei" cx={92} cy={92} r={22} />,
    <rect key="i1" className="rs-f-glass" x={84} y={84} width={16} height={16} rx={4} transform="rotate(20 92 92)" />,
    <rect key="i2" className="rs-f-glass" x={104} y={100} width={14} height={14} rx={4} transform="rotate(-15 111 107)" />,
    <path key="lime" className="rs-f-green" d="M132 62a22 22 0 0 1 14 30z" />,
    <rect key="straw" className="rs-f-red" x={96} y={40} width={6} height={56} rx={3} transform="rotate(28 99 68)" />,
  ],
}
export const DISH_VARIANTS = Object.keys(FOOD)

// Chwazi yon ilistrasyon dapre non plat la (konsa menm plat toujou gen menm desen)
export function variantFor(name = '') {
  const n = String(name).toLowerCase()
  if (/(ji|jus|juice|jugo|bwason|boisson|drink|bebida|kola|soda|cola|byè|biere|beer|cerveza|dlo|eau|water|agua|kafe|café|coffee|te\b|thé)/.test(n)) return 'bwason'
  if (/(joumou|soup|soupe|sopa|bouyon|bouillon)/.test(n)) return 'joumou'
  if (/(djon|diri|riz|rice|arroz)/.test(n)) return 'djondjon'
  if (/(akra|fritay|marinad|fritt|pate|paté)/.test(n)) return 'akra'
  if (/(legim|légume|veget|lalo|berej)/.test(n)) return 'legim'
  if (/(griyo|griot|tasso|taso|poul|poulet|chicken|pollo|kabrit|cabri|vyann|viande|meat|carne|lanbi|pwason|poisson|fish)/.test(n)) return 'griyo'
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return ['griyo', 'djondjon', 'legim', 'joumou', 'akra'][h % 5]
}

export function DishArt({ variant = 'griyo', size = 160, spin = true, halo, label, className, style }) {
  const food = FOOD[variant] || FOOD.griyo
  return (
    <div className={cx('rs-dish', spin && 'rs-dish--spin', halo && 'rs-dish--halo', className)} style={{ width: size, height: size, ...style }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <circle className="rs-f-rim" cx={100} cy={100} r={92} />
        <circle className="rs-f-plate" cx={100} cy={100} r={76} />
        <path className="rs-f-sheen" d="M38 64a76 76 0 0 1 46-36" fill="none" strokeWidth={5} strokeLinecap="round" />
        <g>{food()}</g>
      </svg>
    </div>
  )
}

// Foto plat la an wonn sou yon asyèt — oswa ilistrasyon si pa gen foto
export function DishVisual({ src, name, size = 140, spin = true, halo, className }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return <DishArt variant={variantFor(name)} size={size} spin={spin} halo={halo} label={name} className={className} />
  return (
    <div className={cx('rs-dish', spin && 'rs-dish--spin', halo && 'rs-dish--halo', className)} style={{ width: size, height: size }}>
      <div className="rs-photo"><img className="rs-photo__img" src={src} alt={name || ''} loading="lazy" onError={() => setBroken(true)} /></div>
    </div>
  )
}

// Tab wè anwo, ak chèz dapre kantite plas
export function TableArt({ seats = 4, busy, usedSeats = 0 }) {
  const n = Math.max(1, Math.min(12, Number(seats) || 4))
  const round = n <= 4
  const chairs = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const rx = round ? 46 : 58, ry = round ? 46 : 40
    const x = 70 + Math.cos(a) * rx, y = 56 + Math.sin(a) * ry
    chairs.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={9} className={cx('rs-t-chair', busy && i < usedSeats && 'rs-t-chair--used')} />)
  }
  const plates = busy ? Math.min(n, Math.max(1, usedSeats)) : 0
  const platesEls = []
  for (let i = 0; i < plates; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const rx = round ? 20 : 34, ry = round ? 20 : 16
    platesEls.push(<g key={i}><circle cx={(70 + Math.cos(a) * rx).toFixed(1)} cy={(56 + Math.sin(a) * ry).toFixed(1)} r={6.5} className="rs-t-plate" /><circle cx={(70 + Math.cos(a) * rx).toFixed(1)} cy={(56 + Math.sin(a) * ry).toFixed(1)} r={2.5} className="rs-t-dot" /></g>)
  }
  return (
    <svg viewBox="0 0 140 112" aria-hidden="true">
      {chairs}
      {round
        ? <><circle cx={70} cy={56} r={33} className="rs-t-top" /><circle cx={70} cy={56} r={27} className="rs-t-top-in" /></>
        : <><rect x={22} y={30} width={96} height={52} rx={16} className="rs-t-top" /><rect x={28} y={36} width={84} height={40} rx={12} className="rs-t-top-in" /></>}
      {platesEls}
    </svg>
  )
}

// ══════════════════════════════════════════════
// KONTWÒL
// ══════════════════════════════════════════════
export function Chips({ items = [], value, onChange, label }) {
  const refs = useRef({}), ind = useRef(null)
  const place = useCallback(() => {
    const b = refs.current[value], i = ind.current
    if (!i) return
    if (!b) { i.style.opacity = '0'; return }
    i.style.width = `${b.offsetWidth}px`
    i.style.transform = `translateX(${b.offsetLeft}px)`
    i.style.opacity = '1'
  }, [value])
  useLayoutEffect(place, [place, items.length])
  useEffect(() => {
    document.fonts?.ready?.then(place)
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [place])
  return (
    <div className="rs-chips" role="tablist" aria-label={label}>
      <span className="rs-chips__ind" ref={ind} aria-hidden="true" />
      {items.map((it) => {
        const on = it.id === value
        return (
          <button key={it.id ?? 'all'} type="button" role="tab" aria-selected={on} ref={(n) => { refs.current[it.id] = n }}
            className={cx('rs-chip', on && 'is-active')} onClick={() => onChange?.(it.id)}>
            {it.icon && <it.icon size={15} />}
            <span>{it.label}</span>
            {it.count != null && <span className="rs-chip__count">{it.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function SearchField({ value, onChange, hints = [], placeholder, label, onFocus, onBlur, autoFocus, children, className }) {
  const [i, setI] = useState(0)
  const [foc, setFoc] = useState(false)
  const list = hints.length ? hints : [placeholder || '']
  useEffect(() => {
    if (list.length < 2 || reducedMotion()) return undefined
    const id = setInterval(() => setI((x) => (x + 1) % list.length), 2800)
    return () => clearInterval(id)
  }, [list.length])
  return (
    <div className={cx('rs-search', foc && 'is-focus', className)}>
      <Search size={19} className="rs-search__icon" />
      <div className="rs-search__field">
        <input className="rs-search__input" type="search" value={value} autoFocus={autoFocus} aria-label={label || list[0]}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={(e) => { setFoc(true); onFocus?.(e) }} onBlur={(e) => { setFoc(false); onBlur?.(e) }} />
        {!value && <span key={i} className="rs-search__hint" aria-hidden="true">{list[i % list.length]}</span>}
      </div>
      {value ? <button type="button" className="rs-search__clear" onClick={() => onChange?.('')} aria-label="x"><X size={16} /></button> : null}
      {children}
    </div>
  )
}

export function Stepper({ value, min = 0, max = 99, onChange, size, label }) {
  const [dir, setDir] = useState('up')
  const set = (n) => { if (n < min || n > max) return; setDir(n > value ? 'up' : 'down'); onChange?.(n) }
  return (
    <div className={cx('rs-stepper', size === 'sm' && 'rs-stepper--sm')} role="group" aria-label={label}>
      <button type="button" className="rs-stepper__btn" onClick={() => set(value - 1)} disabled={value <= min} aria-label="-"><Minus size={15} strokeWidth={2.6} /></button>
      <span className="rs-stepper__val" aria-live="polite"><span key={value} className={`rs-roll rs-roll--${dir}`}>{value}</span></span>
      <button type="button" className="rs-stepper__btn rs-stepper__btn--plus" onClick={() => set(value + 1)} disabled={value >= max} aria-label="+"><Plus size={15} strokeWidth={2.6} /></button>
    </div>
  )
}

export function AddButton({ onAdd, label, small, disabled }) {
  const [added, setAdded] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const click = (e) => {
    e.stopPropagation()
    setAdded(true); onAdd?.()
    setTimeout(() => { if (alive.current) setAdded(false) }, 1300)
  }
  return (
    <button type="button" className={cx('rs-add', small && 'rs-add--sm', added && 'is-added')} onClick={click} disabled={disabled} aria-label={label}>
      <span className="rs-add__burst" aria-hidden="true" />
      {added ? <Check size={small ? 16 : 20} strokeWidth={2.8} /> : <Plus size={small ? 16 : 20} strokeWidth={2.8} />}
    </button>
  )
}

export function Switch({ on, onChange, title, desc, disabled }) {
  return (
    <label className={cx('rs-switch', on && 'is-on')} style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
      <span className="rs-switch__text"><span className="rs-switch__title">{title}</span>{desc && <span className="rs-switch__desc">{desc}</span>}</span>
      <input type="checkbox" className="rs-sr" checked={!!on} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="rs-toggle" aria-hidden="true" />
    </label>
  )
}

export function Seg({ options = [], value, onChange, block }) {
  return (
    <div className={cx('rs-seg', block && 'rs-seg--block')} role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={cx('rs-seg__btn', value === o.id && 'is-active')} onClick={() => onChange?.(o.id)}>
          {o.icon && <o.icon size={15} />}{o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <div className="rs-field">
      {label && <span className="rs-label">{label}</span>}
      {children}
      {error ? <span className="rs-error-text">{error}</span> : hint ? <span className="rs-hint">{hint}</span> : null}
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════
export function Modal({ open = true, onClose, theme, title, subtitle, size, children, footer, closeLabel = 'Close' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <Layer theme={theme}>
      <div className="rs-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
        <div className={cx('rs-modal', size && `rs-modal--${size}`)} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
          <span className="rs-grab" aria-hidden="true" />
          {(title || onClose) && (
            <div className="rs-modal__head">
              <div style={{ minWidth: 0 }}>
                {title && <h3 className="rs-modal__title">{title}</h3>}
                {subtitle && <p className="rs-modal__sub">{subtitle}</p>}
              </div>
              {onClose && <Btn variant="glass" size="sm" icon={X} onClick={onClose} aria-label={closeLabel} />}
            </div>
          )}
          <div className="rs-modal__body">{children}</div>
          {footer && <div className="rs-modal__foot">{footer}</div>}
        </div>
      </div>
    </Layer>
  )
}

export function ConfirmModal({ open, theme, title, text, confirmLabel, cancelLabel, tone = 'danger', loading, onConfirm, onClose }) {
  return (
    <Modal open={open} theme={theme} title={title} onClose={onClose}
      footer={<>
        <Btn variant="glass" onClick={onClose}>{cancelLabel}</Btn>
        <Btn variant={tone === 'danger' ? 'primary' : tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Btn>
      </>}>
      {text && <p style={{ margin: 0, color: 'var(--ink-muted)', font: '500 14px/21px var(--font-sans)' }}>{text}</p>}
    </Modal>
  )
}

// ══════════════════════════════════════════════
// TÈT PAJ (HERO) + STAT + VID
// ══════════════════════════════════════════════
export function Hero({ overline, title, subtitle, icon: Icon, onBack, backLabel, actions, children }) {
  return (
    <header className="rs-hero rs-glass">
      <div className="rs-hero__top">
        {onBack && <Btn variant="glass" size="md" icon={BackIcon} onClick={onBack} aria-label={backLabel} />}
        {Icon && <div className="rs-hero__icon"><Icon size={24} strokeWidth={2.2} /></div>}
        <div className="rs-hero__titles">
          {overline && <span className="rs-overline">{overline}</span>}
          <h1 className="rs-hero__title">{title}</h1>
          {subtitle && <p className="rs-hero__sub">{subtitle}</p>}
        </div>
        {actions && <div className="rs-hero__actions">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
function BackIcon(props) {
  return <svg viewBox="0 0 24 24" width={props.size} height={props.size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
}

export function Stats({ children }) { return <div className="rs-stats">{children}</div> }

export function Stat({ icon: Icon, label, value, tone = 'paprika', index = 0, animate = true }) {
  const isNum = typeof value === 'number'
  const v = useCountUp(isNum && animate ? value : 0)
  return (
    <div className="rs-stat" style={{ '--d': `${index * 70}ms` }}>
      {Icon && <span className={`rs-stat__icon rs-stat__icon--${tone}`}><Icon size={18} strokeWidth={2.2} /></span>}
      <div style={{ minWidth: 0 }}>
        <div className="rs-stat__val">{isNum && animate ? Math.round(v).toLocaleString('fr-HT').replace(/\u202F|\u00A0/g, ' ') : value}</div>
        <div className="rs-stat__label">{label}</div>
      </div>
    </div>
  )
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="rs-empty rs-glass">
      {Icon && <div className="rs-empty__icon"><Icon size={32} strokeWidth={2} /></div>}
      <h3 className="rs-empty__title">{title}</h3>
      {text && <p className="rs-empty__text">{text}</p>}
      {action}
    </div>
  )
}

export function SkeletonGrid({ count = 8, height = 240, className = 'rs-grid' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => <div key={i} className="rs-skel" style={{ height, animationDelay: `${i * 80}ms` }} />)}
    </div>
  )
}

// ══════════════════════════════════════════════
// SWIVI (etap + ti kat)
// ══════════════════════════════════════════════
export function Steps({ steps, current }) {
  const pct = steps.length > 1 ? Math.max(0, current) / (steps.length - 1) : 1
  return (
    <div className="rs-steps" style={{ '--n': steps.length, '--p': pct }}>
      <span className="rs-steps__rail" aria-hidden="true"><span className="rs-steps__fill" /></span>
      <ol>
        {steps.map((s, i) => (
          <li key={s.key || i} className={cx('rs-step', i < current && 'is-done', i === current && 'is-current')} aria-current={i === current ? 'step' : undefined} style={{ '--d': `${i * 130}ms` }}>
            <span className="rs-step__dot">{i < current ? <Check size={16} strokeWidth={2.6} /> : s.icon ? <s.icon size={16} strokeWidth={2.2} /> : null}</span>
            <span className="rs-step__label">{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const ROUTE = 'M24 92 C 70 92, 78 40, 128 46 S 200 92, 236 70 S 270 28, 286 24'
export function MiniMap({ progress = 0.5, moving = true }) {
  const still = reducedMotion() || !moving
  const pt = Math.max(0.08, Math.min(0.95, progress))
  return (
    <div className="rs-map" aria-hidden="true">
      <svg viewBox="0 0 310 116" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="rs-grid" width={22} height={22} patternUnits="userSpaceOnUse"><path d="M22 0H0V22" className="rs-map__grid" /></pattern></defs>
        <rect width={310} height={116} fill="url(#rs-grid)" />
        <path d="M0 30 L310 60 M120 0 L150 116 M230 0 L210 116" className="rs-map__road" />
        <path d={ROUTE} className="rs-map__route-bg" />
        <path d={ROUTE} className="rs-map__route" />
        <circle cx={24} cy={92} r={6} className="rs-map__start" />
        <circle cx={286} cy={24} r={7} className="rs-map__end" />
        <g transform={still ? `translate(${24 + 262 * pt} ${92 - 68 * pt})` : undefined}>
          <circle r={11} className="rs-map__rider-bg" />
          <circle r={4.5} className="rs-map__rider-dot" />
          {!still && <animateMotion dur="7s" repeatCount="indefinite" path={ROUTE} keyPoints={`0;${pt.toFixed(2)}`} keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />}
        </g>
      </svg>
    </div>
  )
}

export function CheckBurst({ size = 76 }) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="rs-checkmark" aria-hidden="true">
      <circle cx={26} cy={26} r={24} /><path d="M15 27l7 7 15-16" />
    </svg>
  )
}

// ══════════════════════════════════════════════
// ZETWAL (nòt) — afiche ak fraksyon, oswa entèaktif ak pop
// ══════════════════════════════════════════════
const STAR_D = 'm12 3.2 2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17l-5.38 2.85 1.03-6L3.3 9.6l6-.9z'
const StarSvg = ({ size }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={STAR_D} /></svg>

export function RatingStars({ value = 0, count, size = 18, interactive, onChange, label, showValue = true }) {
  const [hover, setHover] = useState(null)
  const [pop, setPop] = useState(0)
  const shown = hover ?? value
  const stars = [1, 2, 3, 4, 5].map((n) => {
    const frac = Math.max(0, Math.min(1, shown - (n - 1)))
    const inner = (
      <>
        <span className="rs-star__bg"><StarSvg size={size} /></span>
        <span className="rs-star__fill" style={{ width: `${frac * 100}%` }}><StarSvg size={size} /></span>
      </>
    )
    if (!interactive) return <span key={n} className="rs-star">{inner}</span>
    return (
      <button key={n} type="button" className={cx('rs-star', pop === n && 'is-pop')} aria-label={`${n}/5`} aria-pressed={value >= n}
        onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n)} onBlur={() => setHover(null)}
        onClick={() => { setPop(n); onChange?.(n) }}>{inner}</button>
    )
  })
  return (
    <span className="rs-rating" role={interactive ? 'group' : 'img'} aria-label={label || `${Number(value).toFixed(1)} / 5`}>
      <span className="rs-rating__stars">{stars}</span>
      {showValue && !interactive && value > 0 && (
        <span className="rs-rating__val">{Number(value).toFixed(1)}{count != null && <span className="rs-rating__count"> ({count})</span>}</span>
      )}
    </span>
  )
}

// ══════════════════════════════════════════════
// KÈ FAVORI (pop)
// ══════════════════════════════════════════════
export function FavButton({ on, onToggle, labelOn, labelOff }) {
  return (
    <button type="button" className={cx('rs-icon-btn', on && 'is-on')} aria-pressed={on} aria-label={on ? labelOn : labelOff}
      onClick={(e) => { e.stopPropagation(); onToggle?.() }}>
      <svg viewBox="0 0 24 24" width={17} height={17} fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />
      </svg>
    </button>
  )
}

// ══════════════════════════════════════════════
// TELEFÒN 3D (mockup) — tilt sourit, flotasyon, refleksyon
// ══════════════════════════════════════════════
export function PhoneFrame({ width = 300, tilt = 'none', float = true, delay = 0, children, footer, time = '9:41', className }) {
  const t3d = useTilt(10, 14)
  return (
    <div ref={t3d.ref} onPointerMove={t3d.onPointerMove} onPointerLeave={t3d.onPointerLeave}
      className={cx('rs-phone-scene', `rs-phone--${tilt}`, float && 'rs-phone--float', className)} style={{ '--w': `${width}px`, '--delay': `${delay}ms` }}>
      <div className="rs-phone-tilt">
        <div className="rs-phone">
          <span className="rs-phone__btn rs-phone__btn--a" aria-hidden="true" />
          <span className="rs-phone__btn rs-phone__btn--b" aria-hidden="true" />
          <span className="rs-phone__btn rs-phone__btn--c" aria-hidden="true" />
          <div className="rs-phone__screen">
            <div className="rs-phone__content">{children}</div>
            <div className="rs-phone__status" aria-hidden="true">
              <span>{time}</span><span className="rs-phone__island" />
              <span className="rs-phone__sys"><i className="rs-sig"><b /><b /><b /><b /></i><i className="rs-bat" /></span>
            </div>
            {footer && <div className="rs-phone__footer">{footer}</div>}
            <span className="rs-phone__home" aria-hidden="true" />
          </div>
          <div className="rs-phone__glare" aria-hidden="true" />
        </div>
      </div>
      <div className="rs-phone__shadow" aria-hidden="true" />
    </div>
  )
}
