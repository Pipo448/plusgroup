// src/pages/gym/gymUI.jsx
// ✅ GYM FITNESS — Eleman ak stil pataje pou tout paj Gym yo (menm estil ak GymDashboard):
//    hero fonse, bouton, modal, chip, avatar, chif anime, skeleton, animasyon, responsive.
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export const C = {
  night:  '#0b0c0f',
  night2: '#16181e',
  line:   'rgba(255,255,255,0.08)',
  volt:   '#d4ff3a',
  ember:  '#ff6b2c',
  teal:   '#14B8A6',
  green:  '#16a34a',
  red:    '#dc2626',
  amber:  '#d97706',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  ink:    '#14151a',
  muted:  '#6b7080',
  card:   '#ffffff',
  soft:   '#f6f5f1',
  border: 'rgba(20,21,26,0.08)',
}
export const FONT_DISPLAY = "'Barlow Condensed', 'Arial Narrow', sans-serif"
export const FONT_BODY    = "'Manrope', system-ui, sans-serif"

// ─── Zouti ────────────────────────────────────────────────────────────────
export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR')
export const fmtMoney = (n) => (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
export const fmtTime = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR')
export const fmtDateShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0)
  const raf = useRef()
  useEffect(() => {
    const end = Number(target) || 0
    if (prefersReducedMotion()) { setVal(end); return }
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setVal(from + (end - from) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

export function AnimatedNumber({ value, suffix }) {
  const v = useCountUp(value)
  return <>{fmt(v)}{suffix && <span className="gx-suffix">{suffix}</span>}</>
}

// Koulè avatar ki toujou menm pou menm non
const AVATAR_TONES = [
  ['#d4ff3a', '#0b0c0f'], ['#ff6b2c', '#0b0c0f'], ['#6ec8ff', '#0b0c0f'],
  ['#14B8A6', '#ffffff'], ['#8b5cf6', '#ffffff'], ['#14151a', '#d4ff3a'],
]
export function Avatar({ name, size = 40 }) {
  let h = 0
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [bg, fg] = AVATAR_TONES[h % AVATAR_TONES.length]
  return (
    <span className="gx-avatar" style={{ width:size, height:size, background:bg, color:fg, fontSize:size * 0.36 }}>
      {initials(name)}
    </span>
  )
}

// ─── Hero tèt paj ─────────────────────────────────────────────────────────
// stats: [{ label, value, suffix?, icon?, tone?: 'volt'|'ember'|'sky'|'white' }]
export function PageHero({ icon:Icon, eyebrow, title, subtitle, actions, stats, children }) {
  return (
    <section className="gx-hero gx-in">
      <div className="gx-hero-glow"/>
      <div className="gx-hero-grid"/>
      <div className="gx-hero-top">
        <div className="gx-hero-head">
          {Icon && <div className="gx-logo"><Icon size={24}/></div>}
          <div style={{ minWidth:0 }}>
            {eyebrow && <span className="gx-eyebrow"><span className="gx-live"/> {eyebrow}</span>}
            <h1 className="gx-title">{title}</h1>
            {subtitle && <p className="gx-sub">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="gx-hero-actions">{actions}</div>}
      </div>
      {stats?.length > 0 && (
        <div className="gx-hero-stats" style={{ '--n': stats.length }}>
          {stats.map((s, i) => (
            <div key={i} className={`gx-hstat tone-${s.tone || 'white'}`}>
              <span className="gx-label-dark">{s.icon && <s.icon size={13}/>} {s.label}</span>
              <p className="gx-hstat-val">
                {s.loading ? <span className="gx-skel dark" style={{ width:70, height:30, display:'inline-block' }}/>
                  : typeof s.value === 'number' ? <AnimatedNumber value={s.value} suffix={s.suffix}/>
                  : <>{s.value}{s.suffix && <span className="gx-suffix">{s.suffix}</span>}</>}
              </p>
              {s.hint && <span className="gx-hint">{s.hint}</span>}
            </div>
          ))}
        </div>
      )}
      {children}
    </section>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────
export function Modal({ title, subtitle, icon:Icon, onClose, children, onSubmit, maxWidth = 440 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Body = onSubmit ? 'form' : 'div'
  return (
    <div className="gx-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <Body onSubmit={onSubmit} className="gx-modal" style={{ maxWidth }}>
        <div className="gx-modal-head">
          {Icon && <div className="gx-modal-icon"><Icon size={18}/></div>}
          <div style={{ flex:1, minWidth:0 }}>
            <h3 className="gx-modal-title">{title}</h3>
            {subtitle && <p className="gx-modal-sub">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="gx-icon-btn" aria-label="Close"><X size={16}/></button>
        </div>
        <div className="gx-modal-body">{children}</div>
      </Body>
    </div>
  )
}

export function Field({ label, error, children, hint }) {
  return (
    <div className="gx-field">
      {label && <label className="gx-label">{label}</label>}
      {children}
      {hint && <p className="gx-field-hint">{hint}</p>}
      {error && <p className="gx-error">{error}</p>}
    </div>
  )
}

export function EmptyState({ icon:Icon, text, action }) {
  return (
    <div className="gx-empty gx-in">
      {Icon && <div className="gx-empty-icon"><Icon size={26}/></div>}
      <p>{text}</p>
      {action}
    </div>
  )
}

export function SkeletonRows({ rows = 4, height = 64 }) {
  return (
    <div className="gx-stack">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="gx-skel" style={{ height, borderRadius:18, animationDelay:`${i * 90}ms` }}/>
      ))}
    </div>
  )
}

export function SectionHead({ title, count, right }) {
  return (
    <div className="gx-section-head">
      <h2>{title}</h2>
      {count != null && <span className="gx-count">{count}</span>}
      <span className="gx-rule"/>
      {right}
    </div>
  )
}

// ─── Stil global (enjekte nan chak paj) ───────────────────────────────────
export function GymStyles() {
  return <style>{GYM_CSS}</style>
}

const GYM_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap');

.gx-page *,.gx-overlay *{box-sizing:border-box}
.gx-page{max-width:1180px;margin:0 auto;font-family:${FONT_BODY};color:${C.ink};padding-bottom:28px}
.gx-page.narrow{max-width:860px}

@keyframes gxIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
@keyframes gxPop{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
@keyframes gxFade{from{opacity:0}to{opacity:1}}
@keyframes gxGlow{0%,100%{transform:translate(0,0) scale(1);opacity:.55}50%{transform:translate(-40px,20px) scale(1.15);opacity:.85}}
@keyframes gxPulse{0%{box-shadow:0 0 0 0 rgba(212,255,58,.55)}70%{box-shadow:0 0 0 9px rgba(212,255,58,0)}100%{box-shadow:0 0 0 0 rgba(212,255,58,0)}}
@keyframes gxShimmer{from{background-position:-300px 0}to{background-position:300px 0}}
@keyframes gxFloat{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-4px) rotate(8deg)}}
@keyframes gxSlideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
.gx-in{opacity:0;animation:gxIn .6s cubic-bezier(.22,1,.36,1) forwards}
.gx-slide{opacity:0;animation:gxSlideIn .45s cubic-bezier(.22,1,.36,1) forwards}

/* ── hero ── */
.gx-hero{position:relative;overflow:hidden;background:${C.night};color:#f2f1ec;border-radius:28px;padding:28px 32px;margin-bottom:20px;
  box-shadow:0 24px 50px -24px rgba(11,12,15,.55)}
.gx-hero-glow{position:absolute;right:-120px;top:-160px;width:420px;height:420px;border-radius:50%;
  background:radial-gradient(circle, rgba(212,255,58,.2), rgba(212,255,58,0) 65%);animation:gxGlow 9s ease-in-out infinite;pointer-events:none}
.gx-hero-grid{position:absolute;inset:0;pointer-events:none;opacity:.5;
  background-image:radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(90deg,transparent 35%,#000);mask-image:linear-gradient(90deg,transparent 35%,#000)}
.gx-hero > *:not(.gx-hero-glow):not(.gx-hero-grid){position:relative;z-index:1}
.gx-hero-top{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.gx-hero-head{display:flex;gap:16px;align-items:center;min-width:0}
.gx-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
.gx-logo{width:52px;height:52px;flex:none;border-radius:16px;background:${C.volt};color:${C.night};display:grid;place-items:center;
  box-shadow:0 10px 28px -8px rgba(212,255,58,.6)}
.gx-logo svg{animation:gxFloat 3.2s ease-in-out infinite}
.gx-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(242,241,236,.6)}
.gx-live{width:8px;height:8px;border-radius:50%;background:${C.volt};animation:gxPulse 2s infinite;flex:none}
.gx-title{margin:3px 0 0;font-family:${FONT_DISPLAY};font-weight:800;font-size:40px;line-height:.95;letter-spacing:.01em;text-transform:uppercase;overflow-wrap:anywhere}
.gx-sub{margin:6px 0 0;font-size:13.5px;color:rgba(242,241,236,.6);font-weight:500}
.gx-hero-stats{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:14px;margin-top:24px}
.gx-hstat{background:rgba(255,255,255,.04);border:1px solid ${C.line};border-radius:18px;padding:14px 16px;transition:background .25s, transform .25s}
.gx-hstat:hover{background:rgba(255,255,255,.07);transform:translateY(-2px)}
.gx-label-dark{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,241,236,.55)}
.gx-hstat-val{margin:6px 0 0;font-family:${FONT_DISPLAY};font-weight:700;font-size:32px;line-height:1;white-space:nowrap}
.gx-hstat.tone-volt .gx-hstat-val{color:${C.volt}}
.gx-hstat.tone-ember .gx-hstat-val{color:#ff8a57}
.gx-hstat.tone-sky .gx-hstat-val{color:#6ec8ff}
.gx-suffix{font-size:.45em;margin-left:6px;color:rgba(242,241,236,.55);font-weight:700;letter-spacing:.04em}
.gx-hint{display:block;margin-top:6px;font-size:11.5px;color:rgba(242,241,236,.5);font-weight:600}

/* ── bouton ── */
.gx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:14px;padding:11px 18px;
  font:700 13.5px ${FONT_BODY};cursor:pointer;white-space:nowrap;text-decoration:none;
  transition:transform .2s cubic-bezier(.22,1,.36,1), background .2s, color .2s, box-shadow .2s, border-color .2s}
.gx-btn:hover:not(:disabled){transform:translateY(-2px)}
.gx-btn:active:not(:disabled){transform:translateY(0) scale(.98)}
.gx-btn:disabled{opacity:.55;cursor:not-allowed}
.gx-btn:focus-visible{outline:3px solid ${C.volt};outline-offset:2px}
.gx-btn-volt{background:${C.volt};color:${C.night};box-shadow:0 10px 24px -10px rgba(212,255,58,.7)}
.gx-btn-volt:hover:not(:disabled){box-shadow:0 14px 30px -10px rgba(212,255,58,.85)}
.gx-btn-ghost-dark{background:rgba(255,255,255,.06);color:#f2f1ec;border-color:rgba(255,255,255,.12)}
.gx-btn-ghost-dark:hover:not(:disabled){background:rgba(255,255,255,.12)}
.gx-btn-dark{background:${C.night};color:#f2f1ec}
.gx-btn-dark:hover:not(:disabled){background:${C.volt};color:${C.night};box-shadow:0 12px 26px -12px rgba(11,12,15,.5)}
.gx-btn-soft{background:${C.card};color:${C.ink};border-color:${C.border}}
.gx-btn-soft:hover:not(:disabled){border-color:rgba(20,21,26,.2);box-shadow:0 10px 22px -14px rgba(20,21,26,.35)}
.gx-btn-danger{background:rgba(220,38,38,.07);color:${C.red};border-color:rgba(220,38,38,.18)}
.gx-btn-danger:hover:not(:disabled){background:${C.red};color:#fff}
.gx-btn-block{width:100%;padding:14px 18px;font-size:14.5px}
.gx-btn-sm{padding:8px 12px;border-radius:11px;font-size:12px}
.gx-icon-btn{width:34px;height:34px;flex:none;border-radius:11px;border:1px solid ${C.border};background:${C.card};color:${C.muted};
  display:grid;place-items:center;cursor:pointer;transition:all .2s}
.gx-icon-btn:hover{background:${C.night};color:${C.volt};border-color:${C.night};transform:translateY(-1px)}
.gx-icon-btn.danger:hover{background:${C.red};color:#fff;border-color:${C.red}}

/* ── kat & lis ── */
.gx-card{background:${C.card};border:1px solid ${C.border};border-radius:22px}
.gx-pad{padding:20px 22px}
.gx-stack{display:flex;flex-direction:column;gap:10px}
.gx-row{display:flex;align-items:center;gap:14px;padding:14px 16px;background:${C.card};border:1px solid ${C.border};border-radius:18px;
  color:${C.ink};text-decoration:none;text-align:left;width:100%;font-family:inherit;
  transition:transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .25s}
.gx-row.clickable{cursor:pointer}
.gx-row.clickable:hover,a.gx-row:hover{transform:translateY(-2px);box-shadow:0 16px 32px -18px rgba(20,21,26,.3);border-color:rgba(20,21,26,.14)}
.gx-row .grow{flex:1;min-width:0}
.gx-row-title{margin:0;font-weight:700;font-size:14.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gx-row-meta{margin:3px 0 0;font-size:12.5px;color:${C.muted};display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.gx-row.inset{background:${C.soft};border-color:transparent}
.gx-avatar{display:grid;place-items:center;border-radius:50%;font-weight:800;flex:none;letter-spacing:.02em}
.gx-chevron{color:${C.muted};transition:transform .25s}
a.gx-row:hover .gx-chevron{transform:translateX(3px);color:${C.ink}}

.gx-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.03em;white-space:nowrap;
  color:var(--c, ${C.ink});background:color-mix(in srgb, var(--c, ${C.ink}) 11%, transparent)}
.gx-chip{flex:none}
.gx-chip .dot{width:6px;height:6px;border-radius:50%;background:var(--c, ${C.ink})}
.gx-chip.solid{background:var(--c);color:#fff}
.gx-chip.volt{background:${C.volt};color:${C.night}}
.gx-chip.dark{background:${C.night};color:${C.volt}}

.gx-track{height:6px;border-radius:999px;background:rgba(20,21,26,.07);overflow:hidden}
.gx-track i{display:block;height:100%;width:0;border-radius:999px;background:var(--c, ${C.night});transition:width 1s cubic-bezier(.22,1,.36,1)}

.gx-section-head{display:flex;align-items:center;gap:12px;margin:26px 0 14px}
.gx-section-head h2{margin:0;font-family:${FONT_DISPLAY};font-weight:700;font-size:21px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.gx-count{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;background:${C.night};color:${C.volt}}
.gx-rule{flex:1;height:1px;background:${C.border}}

.gx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px}

.gx-empty{text-align:center;padding:46px 20px;background:${C.card};border:1.5px dashed rgba(20,21,26,.14);border-radius:22px;color:${C.muted};font-weight:600}
.gx-empty p{margin:12px 0 0}
.gx-empty-icon{width:58px;height:58px;margin:0 auto;border-radius:18px;background:${C.soft};display:grid;place-items:center;color:${C.ink}}
.gx-empty .gx-btn{margin-top:16px}

/* ── rechèch ── */
.gx-search{position:relative}
.gx-search svg.lead{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:${C.muted};pointer-events:none;transition:color .2s}
.gx-search input{width:100%;box-sizing:border-box;padding:16px 18px 16px 50px;border-radius:18px;border:1.5px solid ${C.border};background:${C.card};
  color:${C.ink};font:600 15.5px ${FONT_BODY};outline:none;transition:border-color .2s, box-shadow .2s}
.gx-search input::placeholder{color:#9a9eaa;font-weight:500}
.gx-search input:focus{border-color:${C.night};box-shadow:0 0 0 4px rgba(212,255,58,.55)}
.gx-search:focus-within svg.lead{color:${C.ink}}
.gx-search.big input{padding:20px 20px 20px 56px;font-size:17px;border-radius:22px}
.gx-search.big svg.lead{left:20px}
.gx-kbd{position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:800;color:${C.muted};background:${C.soft};padding:4px 8px;border-radius:8px}

.gx-tabs{display:inline-flex;gap:4px;padding:4px;background:${C.card};border:1px solid ${C.border};border-radius:14px}
.gx-tabs button{border:0;background:transparent;padding:8px 14px;border-radius:10px;font:700 12.5px ${FONT_BODY};color:${C.muted};cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;white-space:nowrap;flex:none}
.gx-tabs button.on{background:${C.night};color:#f2f1ec}
.gx-tabs button .n{font-size:10.5px;padding:1px 7px;border-radius:999px;background:rgba(20,21,26,.07)}
.gx-tabs button.on .n{background:${C.volt};color:${C.night}}

/* ── modal & fòm ── */
.gx-overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(11,12,15,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:gxFade .2s ease}
.gx-modal{width:100%;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;background:${C.card};border-radius:26px;
  box-shadow:0 40px 80px -30px rgba(11,12,15,.6);animation:gxPop .35s cubic-bezier(.22,1,.36,1);font-family:${FONT_BODY};color:${C.ink}}
.gx-modal-head{display:flex;align-items:center;gap:12px;padding:20px 22px 16px;border-bottom:1px solid ${C.border}}
.gx-modal-icon{width:40px;height:40px;flex:none;border-radius:13px;background:${C.night};color:${C.volt};display:grid;place-items:center}
.gx-modal-title{margin:0;font-family:${FONT_DISPLAY};font-weight:800;font-size:24px;line-height:1;text-transform:uppercase;letter-spacing:.02em}
.gx-modal-sub{margin:4px 0 0;font-size:12.5px;color:${C.muted};font-weight:600}
.gx-modal-body{padding:18px 22px 22px;overflow-y:auto}
.gx-field{margin-bottom:14px}
.gx-label{display:block;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:${C.muted};margin-bottom:7px}
.gx-input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:13px;border:1.5px solid ${C.border};background:${C.soft};color:${C.ink};
  font:600 14.5px ${FONT_BODY};outline:none;transition:border-color .2s, box-shadow .2s, background .2s}
.gx-input:focus{background:${C.card};border-color:${C.night};box-shadow:0 0 0 4px rgba(212,255,58,.5)}
.gx-input.big{font-family:${FONT_DISPLAY};font-weight:700;font-size:30px;padding:10px 16px}
.gx-field-hint{margin:6px 0 0;font-size:11.5px;color:${C.muted}}
.gx-error{margin:6px 0 0;font-size:12px;color:${C.red};font-weight:700}
.gx-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gx-divider{height:1px;background:${C.border};margin:18px 0}
.gx-summary{background:${C.soft};border-radius:16px;padding:14px 16px;margin:4px 0 14px}
.gx-summary .line{display:flex;justify-content:space-between;font-size:13px;font-weight:600;padding:3px 0}
.gx-summary .total{display:flex;justify-content:space-between;align-items:baseline;border-top:1px dashed rgba(20,21,26,.18);margin-top:8px;padding-top:10px}
.gx-summary .total span:first-child{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:${C.muted}}
.gx-summary .total b{font-family:${FONT_DISPLAY};font-size:28px;line-height:1}
.gx-change{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:12px 16px;border-radius:16px;background:${C.ember};color:${C.night};animation:gxPop .3s cubic-bezier(.22,1,.36,1)}
.gx-change span{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.gx-change b{font-family:${FONT_DISPLAY};font-size:28px;line-height:1}
.gx-quick-amounts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.gx-quick-amounts button{border:1.5px solid ${C.border};background:${C.card};border-radius:11px;padding:7px 12px;font:800 12.5px ${FONT_BODY};color:${C.ink};cursor:pointer;transition:all .18s}
.gx-quick-amounts button:hover,.gx-quick-amounts button.on{background:${C.night};color:${C.volt};border-color:${C.night}}

.gx-display{font-family:${FONT_DISPLAY};font-weight:700;line-height:1}

/* ── skeleton ── */
.gx-skel{border-radius:8px;background:linear-gradient(90deg,rgba(20,21,26,.05) 0,rgba(20,21,26,.11) 50%,rgba(20,21,26,.05) 100%);
  background-size:600px 100%;animation:gxShimmer 1.3s linear infinite}
.gx-skel.dark{background:linear-gradient(90deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 100%);background-size:600px 100%}

/* ── responsive ── */
@media (max-width: 820px){
  .gx-hero{padding:22px 20px;border-radius:22px}
  .gx-title{font-size:32px}
  .gx-hero-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gx-hero-stats > .gx-hstat:last-child:nth-child(odd){grid-column:1 / -1}
  .gx-hero-actions{width:100%}
  .gx-hero-actions .gx-btn{flex:1}
}
@media (max-width: 520px){
  .gx-logo{width:44px;height:44px;border-radius:14px}
  .gx-title{font-size:28px}
  .gx-hstat-val{font-size:26px}
  .gx-row{padding:12px 13px;gap:11px}
  .gx-two{grid-template-columns:1fr}
  .gx-modal{border-radius:22px}
  .gx-overlay{align-items:flex-end;padding:0}
  .gx-overlay .gx-modal{border-radius:24px 24px 0 0;max-height:92vh}
  .gx-hide-sm{display:none !important}
}
@media (prefers-reduced-motion: reduce){
  .gx-in,.gx-slide{animation:none;opacity:1}
  .gx-hero-glow,.gx-logo svg,.gx-live,.gx-skel,.gx-modal,.gx-overlay,.gx-change{animation:none}
  .gx-btn,.gx-row,.gx-track i,.gx-icon-btn{transition:none}
}
`