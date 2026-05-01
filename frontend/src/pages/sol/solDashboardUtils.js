// src/pages/sol/solDashboardUtils.js
// ─── Konstant, tèm, ak fonksyon itilitè ──────────────────────

export const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

export const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

export const THEMES = {
  dark:   { bg: '#04090f', card: '#0a1520', text: '#f0f4ff', gold: '#C9A84C', accent: '#C9A84C', name: '🌑 Nwa' },
  yellow: { bg: '#fffbea', card: '#fff9d6', text: '#1a1200', gold: '#b8860b', accent: '#f59e0b', name: '🌟 Jòn' },
  salmon: { bg: '#fff5f0', card: '#fff0eb', text: '#1a0800', gold: '#c45c3a', accent: '#f97316', name: '🍑 Somon' },
  green:  { bg: '#f0fff4', card: '#e6ffed', text: '#001a08', gold: '#16a34a', accent: '#22c55e', name: '🌿 Vèt' },
  red:    { bg: '#fff0f0', card: '#ffe5e5', text: '#1a0000', gold: '#dc2626', accent: '#ef4444', name: '🔴 Wouj' },
  blue:   { bg: '#f0f4ff', card: '#e6eeff', text: '#00051a', gold: '#1d4ed8', accent: '#3b82f6', name: '💙 Ble' },
}

export const getD = (theme) => {
  const t = THEMES[theme] || THEMES.dark
  const isDark = theme === 'dark'
  return {
    bg:        t.bg,
    bgGrad:    isDark
      ? 'radial-gradient(ellipse at 15% 0%, #0d1f3c 0%, #04090f 55%), radial-gradient(ellipse at 85% 100%, #1a0a2e 0%, transparent 50%)'
      : `radial-gradient(ellipse at 15% 0%, ${t.accent}22 0%, ${t.bg} 55%)`,
    card:      t.card,
    border:    `${t.accent}40`,
    borderSub: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    gold:      t.gold,
    goldLight: t.gold,
    goldBtn:   `linear-gradient(135deg, ${t.accent}, ${t.gold})`,
    goldDim:   `${t.accent}20`,
    green:     '#22c55e', greenBg: 'rgba(34,197,94,0.10)',
    red:       '#ef4444', redBg:   'rgba(239,68,68,0.10)',
    orange:    '#f59e0b', orangeBg:'rgba(245,158,11,0.10)',
    blue:      '#60a5fa', blueBg:  'rgba(96,165,250,0.10)',
    teal:      '#14b8a6', tealBg:  'rgba(20,184,166,0.08)',
    text:      t.text,
    muted:     isDark ? '#5a6a82' : '#6b7280',
    mutedLt:   isDark ? '#8899aa' : '#9ca3af',
  }
}

// D pa default (dark) — itilize pou komponan ki pa aksede tèm
export const D = {
  bg:'#04090f', card:'#0a1520', cardHov:'#0f1e2e',
  border:'rgba(201,168,76,0.15)', borderSub:'rgba(255,255,255,0.06)',
  gold:'#C9A84C', goldLight:'#E8C87A',
  goldBtn:'linear-gradient(135deg,#E8C87A 0%,#C9A84C 50%,#8B6914 100%)',
  goldDim:'rgba(201,168,76,0.08)',
  green:'#22c55e', greenBg:'rgba(34,197,94,0.10)',
  red:'#ef4444',   redBg:'rgba(239,68,68,0.10)',
  orange:'#f59e0b',orangeBg:'rgba(245,158,11,0.10)',
  blue:'#60a5fa',  blueBg:'rgba(96,165,250,0.10)',
  teal:'#14b8a6',  tealBg:'rgba(20,184,166,0.08)',
  text:'#f0f4ff', muted:'#5a6a82', mutedLt:'#8899aa',
  bgGrad:'radial-gradient(ellipse at 15% 0%, #0d1f3c 0%, #04090f 55%), radial-gradient(ellipse at 85% 100%, #1a0a2e 0%, transparent 50%)',
}

export const FREQ_LABELS = {
  daily: 'Chak Jou', weekly_saturday: 'Chak Samdi', weekly_monday: 'Chak Lendi',
  biweekly: 'Chak 15 Jou', monthly: 'Chak Mwa', weekdays: 'Lendi-Vandredi',
  saturday: 'Chak Samdi', weekly: 'Chak Lendi',
}

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

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
  html { scroll-behavior: smooth; }
  .sol-root { min-height: 100vh; background: radial-gradient(ellipse at 15% 0%, #0d1f3c 0%, #04090f 55%), radial-gradient(ellipse at 85% 100%, #1a0a2e 0%, transparent 50%); font-family: 'Plus Jakarta Sans', sans-serif; color: #f0f4ff; }
  .sol-layout { display: flex; min-height: 100vh; }
  .sol-sidebar { width: 260px; flex-shrink: 0; background: linear-gradient(180deg, #071528 0%, #04090f 100%); border-right: 1px solid rgba(201,168,76,0.15); position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; padding: 28px 20px; backdrop-filter: blur(20px); overflow-y: auto; }
  .sol-main { flex: 1; min-width: 0; padding: 36px 48px; max-width: 900px; }
  @media (max-width: 1000px) { .sol-main { padding: 28px 32px; } }
  @media (max-width: 900px) { .sol-sidebar { display: none !important; } .sol-main { padding: 16px 14px; max-width: 100%; } }
  .sol-mobile-header { display: none; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(8,16,26,0.98); border-bottom: 1px solid rgba(201,168,76,0.15); position: sticky; top: 0; z-index: 50; backdrop-filter: blur(20px); }
  @media (max-width: 900px) { .sol-mobile-header { display: flex; } }
  .sol-hero { background: linear-gradient(145deg, #0f2040 0%, #0c1a30 40%, #091520 100%); border: 1px solid rgba(201,168,76,0.15); border-radius: 24px; padding: 36px; margin-bottom: 24px; position: relative; overflow: hidden; }
  .sol-hero::before { content: ''; position: absolute; top: -80px; right: -80px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%); pointer-events: none; }
  @media (max-width: 900px) { .sol-hero { padding: 20px; border-radius: 18px; margin-bottom: 16px; } }
  .sol-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; margin-bottom: 20px; }
  @media (max-width: 900px) { .sol-stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; } }
  @media (max-width: 380px) { .sol-stats-grid { grid-template-columns: 1fr; } }
  .sol-stat-card { background: #0a1520; border: 1px solid rgba(201,168,76,0.15); border-radius: 18px; padding: 20px 22px; transition: all 0.2s ease; }
  .sol-stat-card:hover { background: #0f1e2e; border-color: rgba(201,168,76,0.3); transform: translateY(-2px); }
  @media (max-width: 900px) { .sol-stat-card { padding: 14px 15px; border-radius: 14px; } }
  .sol-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 4px; margin-bottom: 20px; }
  .sol-tab-btn { flex: 1; padding: 11px 12px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; text-align: center; transition: all 0.18s ease; border: none; white-space: nowrap; }
  @media (max-width: 400px) { .sol-tab-btn { font-size: 11px; padding: 9px 6px; } }
  .sol-pay-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 22px; border-bottom: 1px solid rgba(255,255,255,0.04); gap: 10px; transition: background 0.15s; }
  .sol-pay-row:hover { background: rgba(255,255,255,0.02); }
  .sol-pay-row:last-child { border-bottom: none; }
  @media (max-width: 900px) { .sol-pay-row { padding: 10px 14px; } }
  .sol-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  @media (max-width: 380px) { .sol-cal-grid { gap: 2px; } }
  .sol-cal-day { aspect-ratio: 1; border-radius: 9px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.15s; }
  .sol-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.88); backdrop-filter: blur(10px); display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s ease; }
  @media (min-width: 600px) { .sol-modal-overlay { align-items: center; } }
  .sol-modal-sheet { background: linear-gradient(160deg, #0f1e30 0%, #0a1520 100%); border: 1px solid rgba(201,168,76,0.15); border-radius: 24px 24px 0 0; width: 100%; max-width: 520px; padding: 28px 26px 48px; max-height: 92vh; overflow-y: auto; animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
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
  .sol-nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: #5a6a82; transition: all 0.15s; border: 1px solid transparent; background: transparent; width: 100%; text-align: left; font-family: 'Plus Jakarta Sans', sans-serif; }
  .sol-nav-item:hover { background: rgba(255,255,255,0.04); color: #f0f4ff; }
  .sol-nav-item.active { background: rgba(201,168,76,0.08); color: #C9A84C; border-color: rgba(201,168,76,0.15); }
  .sol-score-row { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; }
  @media (max-width: 400px) { .sol-score-row { gap: 8px; font-size: 11px; } }
  .sol-progress-track { height: 6px; border-radius: 6px; background: rgba(255,255,255,0.06); overflow: hidden; }
  .sol-progress-fill { height: 100%; border-radius: 6px; background: linear-gradient(135deg,#E8C87A 0%,#C9A84C 50%,#8B6914 100%); transition: width 1s cubic-bezier(0.4,0,0.2,1); }
  .sol-mobile-actions { display: none; }
  @media (max-width: 900px) { .sol-mobile-actions { display: flex; flex-direction: column; padding: 0 0 50px; gap: 10px; margin-top: 16px; } }
`
