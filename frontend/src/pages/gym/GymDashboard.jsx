// src/pages/gym/GymDashboard.jsx
// ✅ GYM FITNESS — Tablo bò "Plus Fit": hero fonse, chif anime (count-up), wonn aktivite,
//    tipografi Barlow Condensed + Manrope, animasyon an kaskad, responsive, reduced-motion.
//    Done yo menm jan: gymAPI.getStats() → { success, stats:{...} }
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Dumbbell, Users, UserCheck, CreditCard, LogIn as LogInIcon,
  BookOpen, Wallet, ArrowUpRight, Activity, Zap, CalendarDays,
} from 'lucide-react'
import { gymAPI } from '../../services/api'

// ─── Palèt ────────────────────────────────────────────────────────────────
const C = {
  night:   '#0b0c0f',   // fon hero a
  night2:  '#16181e',
  line:    'rgba(255,255,255,0.08)',
  volt:    '#d4ff3a',   // koulè siyati (lime)
  ember:   '#ff6b2c',
  teal:    '#14B8A6',
  sky:     '#6ec8ff',
  ink:     '#14151a',
  muted:   '#6b7080',
  card:    '#ffffff',
  border:  'rgba(20,21,26,0.07)',
}
const FONT_DISPLAY = "'Barlow Condensed', 'Arial Narrow', sans-serif"
const FONT_BODY    = "'Manrope', system-ui, sans-serif"

const STATS = [
  { key:'totalMembers',      labelKey:'gym.dashboard.totalMembers',      icon:Users,      color:'#14B8A6' },
  { key:'activeMembers',     labelKey:'gym.dashboard.activeMembers',     icon:UserCheck,  color:'#16a34a' },
  { key:'activeMemberships', labelKey:'gym.dashboard.activeMemberships', icon:CreditCard, color:'#e07a0b' },
  { key:'checkInsToday',     labelKey:'gym.dashboard.checkInsToday',     icon:LogInIcon,  color:'#6366f1' },
]

const QUICK_LINKS = [
  { to:'/app/gym/check-in', icon:LogInIcon,  labelKey:'gym.dashboard.quickCheckIn',       color:'#6366f1', primary:true },
  { to:'/app/gym/members',  icon:Users,      labelKey:'gym.dashboard.manageMembers',      color:'#14B8A6' },
  { to:'/app/gym/plans',    icon:CreditCard, labelKey:'gym.dashboard.subscriptionPlan',   color:'#e07a0b' },
  { to:'/app/gym/classes',  icon:BookOpen,   labelKey:'gym.dashboard.classesAndTrainers', color:'#8b5cf6' },
]

// ─── Zouti ────────────────────────────────────────────────────────────────
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Chif ki monte soti 0 rive nan valè a (easeOutCubic)
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0)
  const raf = useRef()
  useEffect(() => {
    const end = Number(target) || 0
    if (prefersReducedMotion()) { setVal(end); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setVal(end * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR')
const pct = (a, b) => (Number(b) > 0 ? Math.min(100, Math.round((Number(a) / Number(b)) * 100)) : 0)

function AnimatedNumber({ value, suffix }) {
  const v = useCountUp(value)
  return <>{fmt(v)}{suffix && <span className="gx-suffix">{suffix}</span>}</>
}

// ─── Wonn aktivite (manm aktif / total) ───────────────────────────────────
function Ring({ percent, size = 168, stroke = 14 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [p, setP] = useState(0)
  useEffect(() => { const id = setTimeout(() => setP(percent), 120); return () => clearTimeout(id) }, [percent])
  const shown = useCountUp(percent, 1200)
  return (
    <div className="gx-ring" style={{ width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gxRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.volt}/>
            <stop offset="100%" stopColor="#9be22d"/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#gxRingGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p / 100)}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="gx-ring-center">
        <span className="gx-ring-val">{Math.round(shown)}<small>%</small></span>
      </div>
    </div>
  )
}

// ─── Kat statistik ────────────────────────────────────────────────────────
function StatCard({ icon:Icon, label, value, color, loading, delay, bar }) {
  return (
    <div className="gx-card gx-stat gx-in" style={{ animationDelay:`${delay}ms`, '--accent':color }}>
      <div className="gx-stat-top">
        <div className="gx-stat-icon"><Icon size={20}/></div>
        {bar != null && !loading && <span className="gx-chip">{bar}%</span>}
      </div>
      {loading
        ? <div className="gx-skel" style={{ width:64, height:38, marginTop:18 }}/>
        : <p className="gx-stat-val"><AnimatedNumber value={value}/></p>}
      <p className="gx-stat-label">{label}</p>
      <div className="gx-track"><i style={{ width: loading ? 0 : `${bar ?? 100}%`, transitionDelay:`${delay + 250}ms` }}/></div>
    </div>
  )
}

function QuickLink({ to, icon:Icon, label, color, delay, primary }) {
  return (
    <Link to={to} className={`gx-quick gx-in ${primary ? 'is-primary' : ''}`} style={{ animationDelay:`${delay}ms`, '--accent':color }}>
      <div className="gx-quick-icon"><Icon size={20}/></div>
      <span className="gx-quick-label">{label}</span>
      <span className="gx-quick-arrow"><ArrowUpRight size={16}/></span>
    </Link>
  )
}

// ─── Paj la ───────────────────────────────────────────────────────────────
export default function GymDashboard() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['gym-stats'],
    // backend voye { success:true, stats:{...} }
    queryFn: () => gymAPI.getStats().then(r => r.data.stats),
  })

  const total       = Number(data?.totalMembers ?? 0)
  const active      = Number(data?.activeMembers ?? 0)
  const memberships = Number(data?.activeMemberships ?? 0)
  const checkIns    = Number(data?.checkInsToday ?? 0)
  const revMonth    = data?.revenueThisMonth
  const revToday    = data?.revenueToday

  const activeRate     = pct(active, total)
  const membershipRate = pct(memberships, total)
  const checkInRate    = pct(checkIns, active || total)
  const todayShare     = pct(revToday, revMonth)

  const bars = {
    totalMembers: null,
    activeMembers: activeRate,
    activeMemberships: membershipRate,
    checkInsToday: checkInRate,
  }

  const today = new Date().toLocaleDateString(i18n?.language || 'fr-FR', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div className="gx-root">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="gx-hero gx-in">
        <div className="gx-hero-glow"/>
        <div className="gx-hero-grid"/>

        <div className="gx-hero-main">
          <div className="gx-hero-head">
            <div className="gx-logo"><Dumbbell size={24}/></div>
            <div>
              <span className="gx-eyebrow"><span className="gx-live"/> {today}</span>
              <h1 className="gx-title">{t('gym.title')}</h1>
              <p className="gx-sub">{t('gym.dashboard.subtitle')}</p>
            </div>
          </div>

          <div className="gx-rev">
            <div className="gx-rev-block">
              <span className="gx-label-dark"><Wallet size={14}/> {t('gym.dashboard.revenueMonth')}</span>
              <p className="gx-rev-big">
                {isLoading ? <span className="gx-skel dark" style={{ width:200, height:64, display:'inline-block' }}/>
                  : revMonth != null ? <AnimatedNumber value={revMonth} suffix="HTG"/> : '—'}
              </p>
            </div>
            <div className="gx-rev-split">
              <div className="gx-mini">
                <span className="gx-label-dark"><Zap size={13}/> {t('gym.dashboard.revenueToday')}</span>
                <p className="gx-mini-val">
                  {isLoading ? <span className="gx-skel dark" style={{ width:90, height:28, display:'inline-block' }}/>
                    : revToday != null ? <AnimatedNumber value={revToday} suffix="HTG"/> : '—'}
                </p>
                <div className="gx-track dark"><i style={{ width:`${isLoading ? 0 : Math.max(todayShare, 3)}%` }}/></div>
                <span className="gx-hint">{todayShare}% {t('gym.dashboard.ofMonth', 'du mois')}</span>
              </div>
              <div className="gx-mini">
                <span className="gx-label-dark"><CalendarDays size={13}/> {t('gym.dashboard.checkInsToday')}</span>
                <p className="gx-mini-val">{isLoading ? '—' : <AnimatedNumber value={checkIns}/>}</p>
                <div className="gx-track dark ember"><i style={{ width:`${isLoading ? 0 : Math.max(checkInRate, 3)}%` }}/></div>
                <span className="gx-hint">{checkInRate}% {t('gym.dashboard.ofActive', 'des actifs')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="gx-hero-side">
          <Ring percent={isLoading ? 0 : activeRate}/>
          <div className="gx-side-text">
            <span className="gx-label-dark"><Activity size={13}/> {t('gym.dashboard.activityRate', "Taux d'activité")}</span>
            <p className="gx-side-num">
              {isLoading ? '—' : <><AnimatedNumber value={active}/><span className="gx-of"> / {fmt(total)}</span></>}
            </p>
            <span className="gx-hint">{t('gym.dashboard.activeMembers')}</span>
          </div>
        </div>
      </section>

      {/* ── KPI ──────────────────────────────────────────────── */}
      <section className="gx-stats">
        {STATS.map((s, i) => (
          <StatCard key={s.key} icon={s.icon} color={s.color} label={t(s.labelKey)}
            value={data?.[s.key] ?? 0} loading={isLoading} delay={180 + i * 80} bar={bars[s.key]}/>
        ))}
      </section>

      {/* ── AKSYON RAPID ─────────────────────────────────────── */}
      <div className="gx-section-head gx-in" style={{ animationDelay:'520ms' }}>
        <h2>{t('gym.dashboard.quickActions')}</h2>
        <span className="gx-rule"/>
      </div>
      <section className="gx-quicks">
        {QUICK_LINKS.map((q, i) => (
          <QuickLink key={q.to} {...q} label={t(q.labelKey)} delay={600 + i * 70}/>
        ))}
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap');

        .gx-root{max-width:1180px;margin:0 auto;font-family:${FONT_BODY};color:${C.ink};padding-bottom:24px}

        /* animasyon */
        @keyframes gxIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
        @keyframes gxGlow{0%,100%{transform:translate(0,0) scale(1);opacity:.55}50%{transform:translate(-40px,20px) scale(1.15);opacity:.8}}
        @keyframes gxPulse{0%{box-shadow:0 0 0 0 rgba(212,255,58,.55)}70%{box-shadow:0 0 0 9px rgba(212,255,58,0)}100%{box-shadow:0 0 0 0 rgba(212,255,58,0)}}
        @keyframes gxShimmer{from{background-position:-200px 0}to{background-position:200px 0}}
        @keyframes gxFloat{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-4px) rotate(8deg)}}
        .gx-in{opacity:0;animation:gxIn .6s cubic-bezier(.22,1,.36,1) forwards}

        /* hero */
        .gx-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center;
          background:${C.night};color:#f2f1ec;border-radius:28px;padding:30px 34px;margin-bottom:18px;
          box-shadow:0 24px 50px -24px rgba(11,12,15,.55)}
        .gx-hero-glow{position:absolute;right:-120px;top:-140px;width:420px;height:420px;border-radius:50%;
          background:radial-gradient(circle, rgba(212,255,58,.22), rgba(212,255,58,0) 65%);animation:gxGlow 9s ease-in-out infinite;pointer-events:none}
        .gx-hero-grid{position:absolute;inset:0;pointer-events:none;opacity:.5;
          background-image:radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px);background-size:22px 22px;
          -webkit-mask-image:linear-gradient(90deg,transparent 30%,#000);mask-image:linear-gradient(90deg,transparent 30%,#000)}
        .gx-hero-main,.gx-hero-side{position:relative;z-index:1}
        .gx-hero-head{display:flex;gap:16px;align-items:flex-start}
        .gx-logo{width:52px;height:52px;flex:none;border-radius:16px;background:${C.volt};color:${C.night};display:grid;place-items:center;
          box-shadow:0 10px 28px -8px rgba(212,255,58,.6)}
        .gx-logo svg{animation:gxFloat 3.2s ease-in-out infinite}
        .gx-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(242,241,236,.6)}
        .gx-live{width:8px;height:8px;border-radius:50%;background:${C.volt};animation:gxPulse 2s infinite}
        .gx-title{margin:4px 0 0;font-family:${FONT_DISPLAY};font-weight:800;font-size:44px;line-height:.95;letter-spacing:.01em;text-transform:uppercase}
        .gx-sub{margin:6px 0 0;font-size:13.5px;color:rgba(242,241,236,.6);font-weight:500}

        .gx-rev{display:grid;grid-template-columns:auto 1fr;gap:34px;align-items:end;margin-top:28px}
        .gx-label-dark{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,241,236,.55)}
        .gx-rev-big{margin:8px 0 0;font-family:${FONT_DISPLAY};font-weight:800;font-size:68px;line-height:.9;color:${C.volt};letter-spacing:-.01em;white-space:nowrap}
        .gx-suffix{font-size:.36em;margin-left:8px;color:rgba(242,241,236,.55);font-weight:700;letter-spacing:.04em}
        .gx-rev-split{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .gx-mini{background:rgba(255,255,255,.04);border:1px solid ${C.line};border-radius:18px;padding:14px 16px;
          transition:background .25s, transform .25s}
        .gx-mini:hover{background:rgba(255,255,255,.07);transform:translateY(-2px)}
        .gx-mini-val{margin:6px 0 10px;font-family:${FONT_DISPLAY};font-weight:700;font-size:30px;line-height:1;white-space:nowrap}
        .gx-mini-val .gx-suffix{font-size:.5em}
        .gx-hint{display:block;margin-top:6px;font-size:11.5px;color:rgba(242,241,236,.5);font-weight:600}

        .gx-hero-side{display:flex;flex-direction:column;align-items:center;gap:12px;padding-left:32px;border-left:1px solid ${C.line}}
        .gx-ring{position:relative}
        .gx-ring-center{position:absolute;inset:0;display:grid;place-items:center}
        .gx-ring-val{font-family:${FONT_DISPLAY};font-weight:800;font-size:46px;line-height:1}
        .gx-ring-val small{font-size:22px;color:rgba(242,241,236,.55);margin-left:2px}
        .gx-side-text{text-align:center}
        .gx-side-num{margin:4px 0 0;font-family:${FONT_DISPLAY};font-weight:700;font-size:28px;line-height:1}
        .gx-of{color:rgba(242,241,236,.45);font-size:20px}

        /* tracks */
        .gx-track{height:6px;border-radius:999px;background:rgba(20,21,26,.06);overflow:hidden;margin-top:14px}
        .gx-track i{display:block;height:100%;width:0;border-radius:999px;background:var(--accent, ${C.teal});
          transition:width 1.1s cubic-bezier(.22,1,.36,1)}
        .gx-track.dark{background:rgba(255,255,255,.08);margin-top:0}
        .gx-track.dark i{background:${C.volt};transition-delay:.5s}
        .gx-track.dark.ember i{background:${C.ember}}

        /* kat statistik */
        .gx-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:30px}
        .gx-card{background:${C.card};border:1px solid ${C.border};border-radius:22px}
        .gx-stat{position:relative;overflow:hidden;padding:20px 22px 20px;transition:transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s}
        .gx-stat::after{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;
          background:var(--accent);opacity:.07;transition:transform .5s cubic-bezier(.22,1,.36,1), opacity .3s}
        .gx-stat:hover{transform:translateY(-4px);box-shadow:0 18px 36px -18px rgba(20,21,26,.25)}
        .gx-stat:hover::after{transform:scale(1.5);opacity:.12}
        .gx-stat-top{display:flex;justify-content:space-between;align-items:center}
        .gx-stat-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:var(--accent);
          background:color-mix(in srgb, var(--accent) 13%, transparent)}
        .gx-chip{font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:999px;color:var(--accent);
          background:color-mix(in srgb, var(--accent) 12%, transparent)}
        .gx-stat-val{margin:16px 0 0;font-family:${FONT_DISPLAY};font-weight:700;font-size:46px;line-height:1;letter-spacing:-.005em}
        .gx-stat-label{margin:4px 0 0;font-size:13px;font-weight:600;color:${C.muted};line-height:1.3}

        /* aksyon rapid */
        .gx-section-head{display:flex;align-items:center;gap:14px;margin:0 0 14px}
        .gx-section-head h2{margin:0;font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
        .gx-rule{flex:1;height:1px;background:${C.border}}
        .gx-quicks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
        .gx-quick{position:relative;overflow:hidden;text-decoration:none;color:${C.ink};background:${C.card};border:1px solid ${C.border};
          border-radius:20px;padding:18px;display:flex;align-items:center;gap:14px;
          transition:transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, background .25s, color .25s}
        .gx-quick-icon{width:44px;height:44px;flex:none;border-radius:14px;display:grid;place-items:center;color:var(--accent);
          background:color-mix(in srgb, var(--accent) 12%, transparent);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
        .gx-quick-label{flex:1;font-weight:700;font-size:14px;line-height:1.25}
        .gx-quick-arrow{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;color:${C.muted};
          border:1px solid ${C.border};transition:transform .3s, background .3s, color .3s, border-color .3s}
        .gx-quick:hover{transform:translateY(-4px);box-shadow:0 18px 36px -18px rgba(20,21,26,.3)}
        .gx-quick:hover .gx-quick-icon{transform:scale(1.1) rotate(-6deg)}
        .gx-quick:hover .gx-quick-arrow{transform:rotate(45deg);background:${C.night};color:${C.volt};border-color:${C.night}}
        .gx-quick.is-primary{background:${C.night};color:#f2f1ec;border-color:${C.night}}
        .gx-quick.is-primary .gx-quick-icon{background:${C.volt};color:${C.night}}
        .gx-quick.is-primary .gx-quick-arrow{border-color:rgba(255,255,255,.15);color:${C.volt}}
        .gx-quick.is-primary:hover .gx-quick-arrow{background:${C.volt};color:${C.night};border-color:${C.volt}}
        .gx-quick:focus-visible{outline:3px solid ${C.volt};outline-offset:2px}

        /* skeleton */
        .gx-skel{border-radius:8px;background:linear-gradient(90deg,rgba(20,21,26,.06) 0,rgba(20,21,26,.12) 50%,rgba(20,21,26,.06) 100%);
          background-size:400px 100%;animation:gxShimmer 1.2s linear infinite}
        .gx-skel.dark{background:linear-gradient(90deg,rgba(255,255,255,.06) 0,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 100%);background-size:400px 100%}

        /* responsive */
        @media (max-width: 1100px){
          .gx-rev{grid-template-columns:1fr;gap:20px}
        }
        @media (max-width: 900px){
          .gx-stats,.gx-quicks{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width: 820px){
          .gx-hero{grid-template-columns:1fr;padding:24px 20px;border-radius:22px}
          .gx-hero-side{flex-direction:row;padding-left:0;border-left:0;border-top:1px solid ${C.line};padding-top:20px;justify-content:flex-start;gap:20px}
          .gx-side-text{text-align:left}
          .gx-title{font-size:36px}
          .gx-rev-big{font-size:52px}
        }
        @media (max-width: 520px){
          .gx-stats{gap:12px}
          .gx-stat{padding:16px}
          .gx-stat-val{font-size:38px}
          .gx-quicks{grid-template-columns:1fr}
          .gx-rev-split{grid-template-columns:1fr}
          .gx-rev-big{font-size:44px}
          .gx-hero-side .gx-ring{transform:scale(.8);transform-origin:left center}
        }
        @media (prefers-reduced-motion: reduce){
          .gx-in{animation:none;opacity:1}
          .gx-hero-glow,.gx-logo svg,.gx-live,.gx-skel{animation:none}
          .gx-track i,.gx-stat,.gx-quick,.gx-quick-icon,.gx-quick-arrow{transition:none}
        }
      `}</style>
    </div>
  )
}