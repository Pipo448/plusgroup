// src/pages/sol/solDashboardUtils.js
// ─── Konstant, tèm (CSS variables), helpers dat Ayiti, ak style global ───
//
// ✅ NOUVO DESIGN — "Sabotay Inove"
//   • Tout koulè yo pase pa CSS variables (--s-*). Chak tèm chanje variables yo sou
//     eleman `.sol-root`, kidonk TOUT komponan (kalandriye, chat, modals…) swiv tèm nan.
//   • `V`  = token CSS (var(--s-…)) — pou komponan nouvo yo.
//   • `D`  = ansyen tokens (hex nwa) — kenbe pou konpatibilite (egz. SolExchangeMarket).
//   • Polis: Plus Jakarta Sans (tèks) + JetBrains Mono (chif/revèy).

export const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

export const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })
  .replace(/[  ]/g, ' ')

// ══════════════════════════════════════════════════════════════
// TÈM
// ══════════════════════════════════════════════════════════════
export const THEMES = {
  dark:   { name: 'Nwa',   dark: true,  bg: '#050A18', card: '#0C1630', text: '#EEF3FF', accent: '#2563EB', accentText: '#7FA5FF', accent2: '#F97316' },
  blue:   { name: 'Ble',   dark: false, bg: '#EEF3FF', card: '#FFFFFF', text: '#0A1530', accent: '#1D4ED8', accentText: '#1D4ED8', accent2: '#F97316' },
  green:  { name: 'Vèt',   dark: false, bg: '#EFFAF3', card: '#FFFFFF', text: '#052E16', accent: '#16A34A', accentText: '#15803D', accent2: '#0EA5E9' },
  yellow: { name: 'Jòn',   dark: false, bg: '#FFF9E6', card: '#FFFFFF', text: '#1A1200', accent: '#B8860B', accentText: '#8A6508', accent2: '#F59E0B' },
  salmon: { name: 'Somon', dark: false, bg: '#FFF3EC', card: '#FFFFFF', text: '#240D00', accent: '#C45C3A', accentText: '#A64626', accent2: '#F97316' },
  red:    { name: 'Wouj',  dark: false, bg: '#FFF0F0', card: '#FFFFFF', text: '#240000', accent: '#DC2626', accentText: '#B91C1C', accent2: '#F97316' },
}

const hex2rgb = (h) => {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgba = (hex, a) => { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${a})` }
const mix = (hex, withHex, f) => {
  const a = hex2rgb(hex), b = hex2rgb(withHex)
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

// CSS variables pou yon tèm — mete yo sou `style` eleman .sol-root
export function themeVars(theme) {
  const t = THEMES[theme] || THEMES.dark
  const dk = t.dark
  const green = dk ? '#34D399' : '#15803D'
  const red   = dk ? '#F87171' : '#DC2626'
  const amber = dk ? '#FBBF24' : '#B45309'
  const blue  = dk ? '#7FB2FF' : '#1D4ED8'
  const line  = dk ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.09)'
  return {
    '--s-bg': t.bg,
    '--s-grad': dk
      ? `radial-gradient(900px 480px at 8% -8%, ${rgba(t.accent, 0.20)} 0%, transparent 60%), radial-gradient(700px 420px at 100% 108%, ${rgba(t.accent2, 0.11)} 0%, transparent 60%)`
      : `radial-gradient(900px 480px at 8% -8%, ${rgba(t.accent, 0.10)} 0%, transparent 60%)`,
    '--s-card': t.card,
    '--s-card2': dk ? '#111F40' : rgba(t.accent, 0.055),
    '--s-text': t.text,
    '--s-muted': dk ? '#8391AD' : '#5B6577',
    '--s-muted2': dk ? '#A9B6CE' : '#778196',
    '--s-line': line,
    '--s-line2': dk ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.20)',
    '--s-accent': t.accent,
    '--s-accent-text': t.accentText,
    '--s-accent2': t.accent2,
    '--s-accent-soft': rgba(t.accent, dk ? 0.14 : 0.09),
    '--s-accent-line': rgba(t.accent, dk ? 0.38 : 0.30),
    '--s-btn': `linear-gradient(135deg, ${t.accent} 0%, ${mix(t.accent, t.accent2, 0.55)} 55%, ${t.accent2} 100%)`,
    '--s-hero': `linear-gradient(150deg, ${mix(t.accent, '#000000', dk ? 0.62 : 0.5)} 0%, ${mix(t.accent, '#000000', dk ? 0.35 : 0.22)} 55%, ${mix(t.accent, t.accent2, 0.45)} 150%)`,
    '--s-green': green,  '--s-green-soft': rgba(dk ? '#34D399' : '#16A34A', dk ? 0.13 : 0.10),  '--s-green-line': rgba(dk ? '#34D399' : '#16A34A', 0.34),
    '--s-red': red,      '--s-red-soft': rgba(dk ? '#F87171' : '#DC2626', dk ? 0.13 : 0.08),    '--s-red-line': rgba(dk ? '#F87171' : '#DC2626', 0.34),
    '--s-amber': amber,  '--s-amber-soft': rgba(dk ? '#FBBF24' : '#D97706', dk ? 0.13 : 0.10),  '--s-amber-line': rgba(dk ? '#FBBF24' : '#D97706', 0.34),
    '--s-blue': blue,    '--s-blue-soft': rgba(dk ? '#7FB2FF' : '#2563EB', dk ? 0.13 : 0.08),   '--s-blue-line': rgba(dk ? '#7FB2FF' : '#2563EB', 0.34),
    '--s-shadow': dk ? '0 18px 40px rgba(0,0,0,0.38)' : '0 14px 34px rgba(15,23,42,0.09)',
    colorScheme: dk ? 'dark' : 'light',
  }
}

// Tokens CSS pou komponan nouvo yo
export const V = {
  bg: 'var(--s-bg)', card: 'var(--s-card)', card2: 'var(--s-card2)',
  text: 'var(--s-text)', muted: 'var(--s-muted)', muted2: 'var(--s-muted2)',
  line: 'var(--s-line)', line2: 'var(--s-line2)',
  accent: 'var(--s-accent)', accentText: 'var(--s-accent-text)', accent2: 'var(--s-accent2)',
  accentSoft: 'var(--s-accent-soft)', accentLine: 'var(--s-accent-line)', btn: 'var(--s-btn)',
  green: 'var(--s-green)', greenSoft: 'var(--s-green-soft)', greenLine: 'var(--s-green-line)',
  red: 'var(--s-red)', redSoft: 'var(--s-red-soft)', redLine: 'var(--s-red-line)',
  amber: 'var(--s-amber)', amberSoft: 'var(--s-amber-soft)', amberLine: 'var(--s-amber-line)',
  blue: 'var(--s-blue)', blueSoft: 'var(--s-blue-soft)', blueLine: 'var(--s-blue-line)',
}

// Konpatibilite: `getD(theme)` retounen tokens CSS (tèm lan aplike sou .sol-root)
export const getD = () => V

// D (ansyen, hex nwa) — pou fichye ki poko modènize (SolExchangeMarket…)
export const D = {
  bg:'#050A18', card:'#0C1630', cardHov:'#111F40',
  border:'rgba(37,99,235,0.20)', borderSub:'rgba(255,255,255,0.06)',
  gold:'#2563EB', goldLight:'#60A5FA',
  goldBtn:'linear-gradient(135deg,#2563EB 0%,#3B5FE0 45%,#F97316 100%)',
  goldDim:'rgba(37,99,235,0.10)',
  orangeAccent:'#F97316',
  green:'#22c55e', greenBg:'rgba(34,197,94,0.10)',
  red:'#ef4444',   redBg:'rgba(239,68,68,0.10)',
  orange:'#f59e0b',orangeBg:'rgba(245,158,11,0.10)',
  blue:'#60a5fa',  blueBg:'rgba(96,165,250,0.10)',
  teal:'#14b8a6',  tealBg:'rgba(20,184,166,0.08)',
  text:'#f0f4ff', muted:'#5a6a82', mutedLt:'#8899aa',
  bgGrad:'radial-gradient(ellipse at 15% 0%, rgba(37,99,235,0.14) 0%, #050B18 55%), radial-gradient(ellipse at 85% 100%, rgba(249,115,22,0.10) 0%, transparent 50%)',
}

// ══════════════════════════════════════════════════════════════
// FRÈKANS + DAT
// ══════════════════════════════════════════════════════════════
export const FREQ_LABELS = {
  daily: 'Chak Jou', weekly_saturday: 'Chak Samdi', weekly_monday: 'Chak Lendi',
  biweekly: 'Chak 15 Jou', monthly: 'Chak Mwa', weekdays: 'Lendi-Vandredi',
  saturday: 'Chak Samdi', weekly: 'Chak Lendi',
}

export const MONTHS_SHORT = ['Jan', 'Fev', 'Mas', 'Avr', 'Me', 'Jen', 'Jiy', 'Out', 'Sep', 'Okt', 'Nov', 'Des']
export const dmy = (d) => String(d || '').split('T')[0].split('-').reverse().join('/')
export const dayOf = (d) => String(Number(String(d).split('-')[2]))
export const monthOf = (d) => MONTHS_SHORT[Number(String(d).split('-')[1]) - 1] || ''

export function getPaymentDates(frequency, startDate, count) {
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

// ── Lè Ayiti (DST-aware) ─────────────────────────────────────
// ✅ KORIJE: ansyen kont rebou yo te itilize UTC-5 fiks (`+5`). Ayiti pase an UTC-4
// ete a (DST) — kidonk revèy la te dekale 1 è. Kounye a nou kalkile òfsè reyèl la.
const HAITI_TZ = 'America/Port-au-Prince'
function haitiOffsetMs(utcMs) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: HAITI_TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs)).map(x => [x.type, x.value]))
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
    return asUtc - Math.floor(utcMs / 1000) * 1000
  } catch { return -5 * 3600e3 }
}
// 'YYYY-MM-DD' + 'HH:MM' (lè miray Ayiti) → objè Date reyèl
export function haitiWallToDate(dateStr, hhmm = '00:00', addDays = 0) {
  const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number)
  const [hh, mm] = String(hhmm).split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d + addDays, hh || 0, mm || 0)
  let t = guess - haitiOffsetMs(guess)
  t = guess - haitiOffsetMs(t)
  return new Date(t)
}

// ══════════════════════════════════════════════════════════════
// STYLE GLOBAL
// ══════════════════════════════════════════════════════════════
export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
  @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 var(--s-accent-line) } 100% { box-shadow: 0 0 0 10px transparent } }
  @keyframes stampIn { 0% { transform: scale(1.5) rotate(-8deg); opacity: 0 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
  html { scroll-behavior: smooth; }
  button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; font-family: inherit; }
  :focus-visible { outline: 2px solid var(--s-accent); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }

  .sol-root { min-height: 100vh; background-color: var(--s-bg); background-image: var(--s-grad); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: var(--s-text); -webkit-font-smoothing: antialiased; }
  .sol-num  { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .sol-display { font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }

  /* ── MIZ AN PAJ ── */
  .sol-layout { display: flex; min-height: 100vh; }
  .sol-sidebar { width: 272px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; padding: 26px 18px 22px; border-right: 1px solid var(--s-line); background: var(--s-card); background: color-mix(in srgb, var(--s-card) 70%, transparent); overflow-y: auto; }
  .sol-main { flex: 1; min-width: 0; padding: 34px 44px 60px; max-width: 940px; }
  .sol-appbar { display: none; }
  .sol-bottomnav { display: none; }
  @media (max-width: 1000px) { .sol-main { padding: 28px 28px 60px; } }
  @media (max-width: 900px) {
    .sol-sidebar { display: none; }
    .sol-main { padding: 14px 14px calc(96px + env(safe-area-inset-bottom)); max-width: 100%; }
    .sol-appbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; position: sticky; top: 0; z-index: 40; background: var(--s-bg); background: color-mix(in srgb, var(--s-bg) 88%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--s-line); }
    .sol-bottomnav { display: grid; grid-template-columns: repeat(5, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 45; padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); background: var(--s-card); background: color-mix(in srgb, var(--s-card) 92%, transparent); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-top: 1px solid var(--s-line); }
  }

  /* ── NAV ── */
  .sol-nav-item { position: relative; display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 12px; cursor: pointer; font-size: 13.5px; font-weight: 600; color: var(--s-muted); transition: background .15s, color .15s; border: 1px solid transparent; background: transparent; width: 100%; text-align: left; }
  .sol-nav-item:hover { background: var(--s-card2); color: var(--s-text); }
  .sol-nav-item.active { background: var(--s-accent-soft); color: var(--s-accent-text); border-color: var(--s-accent-line); }
  .sol-bn-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 7px 2px 5px; border: none; background: transparent; color: var(--s-muted); font-size: 10.5px; font-weight: 700; cursor: pointer; border-radius: 12px; transition: color .15s; }
  .sol-bn-item.active { color: var(--s-accent-text); }
  .sol-bn-item.active .sol-bn-ico { background: var(--s-accent-soft); }
  .sol-bn-ico { width: 46px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 14px; transition: background .2s; }
  .sol-dot { position: absolute; top: 2px; right: calc(50% - 26px); min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--s-red); color: #fff; font-size: 9.5px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid var(--s-card); }

  /* ── KAD / TIL ── */
  .sol-card { background: var(--s-card); border: 1px solid var(--s-line); border-radius: 20px; }
  .sol-card-pad { padding: 20px 22px; }
  .sol-section-title { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; color: var(--s-text); }
  .sol-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 18px; }
  @media (max-width: 900px) { .sol-tiles { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; } }
  @media (max-width: 360px) { .sol-tiles { grid-template-columns: 1fr; } }
  .sol-tile { background: var(--s-card); border: 1px solid var(--s-line); border-radius: 18px; padding: 16px 16px 15px; transition: transform .18s, border-color .18s; }
  .sol-tile:hover { transform: translateY(-2px); border-color: var(--s-line2); }
  .sol-tile-ico { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .sol-tile-label { font-size: 12px; font-weight: 600; color: var(--s-muted); margin-bottom: 4px; }
  .sol-tile-val { font-size: clamp(19px, 5vw, 23px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
  .sol-tile-sub { font-size: 11px; color: var(--s-muted); margin-top: 4px; }
  .sol-tile-wide { grid-column: 1 / -1; }

  /* ── HERO (kat manm) ── */
  .sol-hero { position: relative; overflow: hidden; border-radius: 26px; padding: 24px 24px 20px; margin-bottom: 16px; color: #fff; background: var(--s-hero); box-shadow: var(--s-shadow); isolation: isolate; }
  .sol-hero-art { position: absolute; right: -90px; top: -110px; width: 360px; height: 360px; z-index: -1; pointer-events: none; }
  .sol-hero-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
  .sol-glass { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 99px; font-size: 11.5px; font-weight: 700; background: rgba(255,255,255,0.13); border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(6px); color: #fff; }
  .sol-hero-main { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .sol-hero-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.72); margin-bottom: 6px; }
  .sol-hero-amount { font-size: clamp(36px, 10.5vw, 58px); font-weight: 800; letter-spacing: -0.045em; line-height: 1; font-variant-numeric: tabular-nums; }
  .sol-hero-amount small { font-size: 0.34em; font-weight: 700; letter-spacing: 0; margin-left: 6px; color: rgba(255,255,255,0.7); }
  .sol-hero-who { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 10px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .sol-hero-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 22px; border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.16); }
  .sol-hero-cell { background: rgba(0,0,0,0.22); padding: 11px 12px 10px; min-width: 0; }
  .sol-hero-cell b { display: block; font-size: clamp(13px, 3.6vw, 16px); font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sol-hero-cell span { font-size: 10.5px; color: rgba(255,255,255,0.66); font-weight: 600; }
  .sol-ring-wrap { position: relative; width: 92px; height: 92px; flex-shrink: 0; }
  .sol-ring-txt { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; }
  .sol-ring-txt b { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; }
  .sol-ring-txt span { font-size: 9.5px; color: rgba(255,255,255,0.68); font-weight: 600; margin-top: 2px; }
  @media (max-width: 400px) { .sol-hero { padding: 20px 18px 16px; border-radius: 22px; } .sol-ring-wrap { width: 78px; height: 78px; } .sol-ring-txt b { font-size: 18px; } }

  /* ── ALÈT ── */
  .sol-alert { border-radius: 18px; padding: 15px 17px; margin-bottom: 14px; display: flex; align-items: center; gap: 13px; border: 1px solid var(--s-line); background: var(--s-card); animation: fadeUp .35s ease both; }
  .sol-alert-ico { width: 42px; height: 42px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sol-alert-title { font-size: 14px; font-weight: 800; letter-spacing: -0.01em; }
  .sol-alert-sub { font-size: 12px; color: var(--s-muted); margin-top: 2px; line-height: 1.5; }
  .sol-alert.green  { background: var(--s-green-soft); border-color: var(--s-green-line); }
  .sol-alert.blue   { background: var(--s-blue-soft);  border-color: var(--s-blue-line); }
  .sol-alert.amber  { background: var(--s-amber-soft); border-color: var(--s-amber-line); }
  .sol-alert.red    { background: var(--s-red-soft);   border-color: var(--s-red-line); }
  .sol-alert-x { margin-left: auto; align-self: flex-start; background: none; border: none; color: var(--s-muted); cursor: pointer; padding: 2px; display: flex; }

  /* ── KONT REBOU ── */
  .sol-clock { display: flex; align-items: center; gap: 6px; margin-top: 9px; }
  .sol-clock-seg { min-width: 54px; padding: 8px 6px 6px; border-radius: 12px; text-align: center; background: var(--s-card); border: 1px solid var(--s-line); }
  .sol-clock-seg b { display: block; font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; line-height: 1; }
  .sol-clock-seg span { font-size: 9.5px; color: var(--s-muted); font-weight: 600; }
  .sol-clock-sep { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 20px; opacity: .5; padding-bottom: 12px; }

  /* ── CARNET (tanpon peman) ── */
  .sol-carnet { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 8px; padding: 16px 18px 18px; }
  .sol-stamp { position: relative; aspect-ratio: 1 / 1.08; border-radius: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed var(--s-line2); color: var(--s-muted); background: transparent; line-height: 1; }
  .sol-stamp b { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; }
  .sol-stamp span { font-size: 9.5px; font-weight: 700; margin-top: 3px; opacity: .85; }
  .sol-stamp i { position: absolute; top: -6px; right: -6px; width: 19px; height: 19px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-style: normal; color: #fff; border: 2px solid var(--s-card); }
  .sol-stamp.paid, .sol-stamp.early, .sol-stamp.late { border-style: solid; }
  .sol-stamp.paid { border-style: solid; border-color: var(--s-green-line); background: var(--s-green-soft); color: var(--s-green); }
  .sol-stamp.paid i { background: var(--s-green); animation: stampIn .35s ease both; }
  .sol-stamp.early { border-color: var(--s-accent-line); background: var(--s-accent-soft); color: var(--s-accent-text); }
  .sol-stamp.early i { background: var(--s-accent); }
  .sol-stamp.late { border-color: var(--s-amber-line); background: var(--s-amber-soft); color: var(--s-amber); }
  .sol-stamp.late i { background: var(--s-amber); }
  .sol-stamp.miss { border-style: solid; border-color: var(--s-red-line); background: var(--s-red-soft); color: var(--s-red); }
  .sol-stamp.miss i { background: var(--s-red); }
  .sol-stamp.today { border-style: solid; border-color: var(--s-accent); color: var(--s-accent-text); background: var(--s-accent-soft); animation: pulseRing 1.8s ease-out infinite; }
  .sol-stamp.win { border-style: solid; border-color: var(--s-accent2); color: var(--s-accent2); }
  .sol-legend { display: flex; gap: 14px; flex-wrap: wrap; padding: 0 18px 16px; font-size: 11px; color: var(--s-muted); font-weight: 600; }
  .sol-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .sol-legend em { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }

  /* ── LIS PEMAN ── */
  .sol-pay-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--s-line); gap: 10px; transition: background .15s; }
  .sol-pay-row:hover { background: var(--s-card2); }
  @media (max-width: 900px) { .sol-pay-row { padding: 11px 14px; } }

  /* ── BADGE / CHIP ── */
  .sol-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; font-size: 10.5px; font-weight: 700; white-space: nowrap; flex-shrink: 0; border: 1px solid transparent; }
  .sol-badge.green { color: var(--s-green); background: var(--s-green-soft); border-color: var(--s-green-line); }
  .sol-badge.red   { color: var(--s-red);   background: var(--s-red-soft);   border-color: var(--s-red-line); }
  .sol-badge.amber { color: var(--s-amber); background: var(--s-amber-soft); border-color: var(--s-amber-line); }
  .sol-badge.blue  { color: var(--s-blue);  background: var(--s-blue-soft);  border-color: var(--s-blue-line); }
  .sol-badge.accent{ color: var(--s-accent-text); background: var(--s-accent-soft); border-color: var(--s-accent-line); }
  .sol-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid var(--s-line2); background: transparent; color: var(--s-muted2); }
  .sol-chip.on { background: var(--s-accent-soft); border-color: var(--s-accent-line); color: var(--s-accent-text); }

  /* ── KALANDRIYE ── */
  .sol-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .sol-cal-day { aspect-ratio: 1; border-radius: 11px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid transparent; font-size: 12px; transition: transform .12s; }
  .sol-cal-day.pay { font-weight: 800; }

  /* ── PWOGRÈ ── */
  .sol-progress-track { height: 8px; border-radius: 8px; background: var(--s-line); overflow: hidden; }
  .sol-progress-fill { height: 100%; border-radius: 8px; background: var(--s-btn); transition: width 1s cubic-bezier(0.4,0,0.2,1); }
  .sol-score-row { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12.5px; }

  /* ── BOUTON ── */
  .sol-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 18px; border-radius: 14px; border: 1px solid var(--s-line2); background: transparent; color: var(--s-text); font-size: 14px; font-weight: 700; cursor: pointer; transition: filter .15s, background .15s; }
  .sol-btn:hover { background: var(--s-card2); }
  .sol-btn.primary { border: none; background: var(--s-btn); color: #fff; box-shadow: 0 8px 22px rgba(0,0,0,0.22); box-shadow: 0 8px 22px color-mix(in srgb, var(--s-accent) 32%, transparent); }
  .sol-btn.primary:hover { filter: brightness(1.07); background: var(--s-btn); }
  .sol-btn:disabled { opacity: .55; cursor: default; }
  .sol-btn.block { width: 100%; }
  .sol-side-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--s-line); background: transparent; color: var(--s-muted2); cursor: pointer; font-weight: 600; font-size: 12.5px; width: 100%; transition: background .15s, color .15s; }
  .sol-side-btn:hover { background: var(--s-card2); color: var(--s-text); }
  .sol-icon-btn { width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--s-line); background: var(--s-card); color: var(--s-muted2); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; }
  .sol-icon-btn:hover { color: var(--s-text); border-color: var(--s-line2); }

  /* ── CHAMP ── */
  .sol-inp { width: 100%; padding: 13px 15px; border-radius: 13px; font-size: 15px; font-family: inherit; color: var(--s-text); background: var(--s-card2); border: 1.5px solid var(--s-line); transition: border-color .15s, box-shadow .15s; }
  .sol-inp::placeholder { color: var(--s-muted); opacity: .7; }
  .sol-inp:focus { border-color: var(--s-accent); outline: none; box-shadow: 0 0 0 3px var(--s-accent-soft); }
  .sol-label { display: block; font-size: 12.5px; font-weight: 700; color: var(--s-muted2); margin-bottom: 7px; }

  /* ── MODAL / SHEET ── */
  .sol-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(2,6,16,0.72); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: flex-end; justify-content: center; animation: fadeIn .2s ease; }
  @media (min-width: 600px) { .sol-modal-overlay { align-items: center; } }
  .sol-modal-sheet { background: var(--s-card); color: var(--s-text); border: 1px solid var(--s-line2); border-radius: 26px 26px 0 0; width: 100%; max-width: 500px; padding: 12px 22px calc(28px + env(safe-area-inset-bottom)); max-height: 92vh; overflow-y: auto; animation: slideUp .3s cubic-bezier(0.32, 0.72, 0, 1); box-shadow: var(--s-shadow); }
  @media (min-width: 600px) { .sol-modal-sheet { border-radius: 26px; padding: 14px 26px 28px; animation: fadeUp .25s ease; } }
  .sol-grab { width: 42px; height: 4px; border-radius: 2px; background: var(--s-line2); margin: 0 auto 18px; }
  .sol-modal-title { font-size: 21px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 4px; }
  .sol-modal-sub { font-size: 13px; color: var(--s-muted); line-height: 1.6; margin-bottom: 20px; }
  .sol-scroll::-webkit-scrollbar, .sol-modal-sheet::-webkit-scrollbar { width: 4px; }
  .sol-scroll::-webkit-scrollbar-thumb, .sol-modal-sheet::-webkit-scrollbar-thumb { background: var(--s-line2); border-radius: 2px; }

  /* ── CHAT ── */
  .sol-chat { display: flex; flex-direction: column; height: min(560px, calc(100vh - 220px)); min-height: 380px; overflow: hidden; }
  .sol-bubble { padding: 9px 13px; font-size: 13.5px; line-height: 1.5; word-break: break-word; }

  /* ── ANSYEN KLAS (kenbe pou SolExchangeMarket) ── */
  .sol-stat-card { background: var(--s-card); border: 1px solid var(--s-line); border-radius: 18px; padding: 18px 20px; }
  .sol-tabs { display: flex; gap: 4px; background: var(--s-card2); border: 1px solid var(--s-line); border-radius: 14px; padding: 4px; margin-bottom: 18px; }
  .sol-tab-btn { flex: 1; padding: 10px 12px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 700; text-align: center; border: none; white-space: nowrap; background: transparent; color: var(--s-muted); }
  .sol-tab-btn.on { background: var(--s-accent-soft); color: var(--s-accent-text); }
`
