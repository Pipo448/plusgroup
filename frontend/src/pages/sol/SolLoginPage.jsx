// src/pages/sol/SolLoginPage.jsx
// Pòtal koneksyon "Kont Sòl ou" — design Plus Group (foto kesyè + kat glas + vag anime)
// Wout: /app/sol/login
//
// Asè (mete yo nan public/images/sol/):
//   • /images/sol/plus-group-logo.png   (logo Plus Group, fon transparan)
//   • /images/sol/ti-machann-haiti.jpg  (foto kesyè a)
//
// Lojik la pa chanje: menm API login, menm sesyon (sol_token / sol_member),
// menm jere blokaj (403) — dashboard la sove rezon + montan ki an reta a nan
// sessionStorage('sol_block') epi paj sa a montre yon panèl konplè.
// "Sonje mwen" sove SÈLMAN non itilizatè a (pa janm modpas la).

import { useState, useEffect, useRef } from 'react'
import SolJoinForm from './SolJoinForm'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User, Lock, Eye, EyeOff, LogIn, Users, Wallet, Calendar, BarChart3, Settings,
  ShieldCheck, Copy, Check, RefreshCw, MessageCircle, Sparkles,
} from 'lucide-react'

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const IMG_LOGO  = '/images/sol/plus-group-logo.png'
const IMG_PHOTO = '/images/sol/ti-machann-haiti.jpg'
const SUPPORT_WA = 'https://wa.me/50942449024?text=' + encodeURIComponent('Bonjou, mwen bliye modpas Kont Sòl mwen an.')

const fmtN = (n) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// Chemen vag SVG (peryòd 1440 → ka bouke san kouti lè nou deplase l 50%)
const wave = (base, amp) =>
  `M0 ${base} Q 360 ${base - 2 * amp} 720 ${base} T 1440 ${base} T 2160 ${base} T 2880 ${base} L2880 400 L0 400 Z`
const waveLine = (base, amp) =>
  `M0 ${base} Q 360 ${base - 2 * amp} 720 ${base} T 1440 ${base} T 2160 ${base} T 2880 ${base}`

function Waves() {
  return (
    <div className="sl-waves" aria-hidden="true">
      <svg className="sl-wave w3" viewBox="0 0 2880 400" preserveAspectRatio="none"><defs><linearGradient id="slGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FF8A1F" /><stop offset=".5" stopColor="#FFC83D" /><stop offset="1" stopColor="#FF8A1F" /></linearGradient></defs><path d={wave(150, 34)} fill="url(#slGold)" fillOpacity=".95" /></svg>
      <svg className="sl-wave w2" viewBox="0 0 2880 400" preserveAspectRatio="none"><path d={wave(170, 30)} fill="#1E5FE0" fillOpacity=".9" /></svg>
      <svg className="sl-wave w1" viewBox="0 0 2880 400" preserveAspectRatio="none">
        <defs><linearGradient id="slNavy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B3AA0" /><stop offset="1" stopColor="#061E57" /></linearGradient></defs>
        <path d={wave(195, 28)} fill="url(#slNavy)" />
        <path d={waveLine(195, 28)} fill="none" stroke="#FFD25E" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function GrowthIcon() {
  return (
    <svg className="sl-growth" width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect className="b1" x="6"  y="30" width="8" height="12" rx="2" fill="#FF8A1F" />
      <rect className="b2" x="20" y="22" width="8" height="20" rx="2" fill="#FF8A1F" />
      <rect className="b3" x="34" y="12" width="8" height="30" rx="2" fill="#FF8A1F" />
      <path className="arr" d="M6 24 L18 14 L26 18 L40 6" stroke="#FFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path className="arr" d="M31 6 L40 6 L40 15" stroke="#FFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const QUICK = [
  { Icon: Users,     label: 'Manm' },
  { Icon: Wallet,    label: 'Sòl' },
  { Icon: Calendar,  label: 'Echéans', hideMobile: true },
  { Icon: BarChart3, label: 'Rapò' },
  { Icon: Settings,  label: 'Paramèt' },
]

// ── Panèl kont bloke (ekri pou kat klè a) ──
function BlockedPanel({ info, onRetry }) {
  const [copied, setCopied] = useState('')
  const msg = (info.message || 'Kont ou bloke poutèt reta peman.').replace(/^\s*🔒\s*/, '')
  let amount = Number(info.lateAmount)
  if (!amount) {
    const m = msg.match(/\(([\d\s  .,]+)\s*HTG\)/)
    if (m) amount = Number(m[1].replace(/[^\d]/g, ''))
  }
  const count = Number(info.lateCount) || (msg.match(/(\d+)\s+peman/) || [])[1]
  const fee = amount ? Math.ceil(amount / 250) * 15 : 0
  const why = msg.replace(/^Kont ou bloke:?\s*/i, '').replace(/\s*Kontakte admin lan.*$/i, '').replace(/[.\s]+$/, '').trim() || 'peman an reta'

  const copy = (num, key) => {
    const clean = num.replace(/[^\d+]/g, '')
    const done = () => { setCopied(key); setTimeout(() => setCopied(''), 1800) }
    try { navigator.clipboard.writeText(clean).then(done, done) } catch { done() }
  }

  return (
    <div className="sl-block" role="alert">
      <div className="sl-block-top">
        <div className="sl-lock"><i /><i /><span><Lock size={24} /></span></div>
        <div style={{ minWidth: 0 }}>
          <h3>Kont ou bloke</h3>
          {info.name && <p className="who">{info.name}</p>}
        </div>
      </div>

      <p className="sl-block-why"><b>Rezon:</b> {why}.</p>

      {amount > 0 && (
        <div className="sl-due">
          <div>
            <span>Montan ou dwe</span>
            <strong>{fmtN(amount)}<small>HTG</small></strong>
          </div>
          {count ? <em>{count} peman an reta</em> : null}
        </div>
      )}

      <ol className="sl-steps">
        <li><b>1</b><span>Peye montan an pa MonCash oswa Natcash{fee ? <> (ajoute ≈ {fmtN(fee)} HTG pou frè)</> : null}.</span></li>
        <li><b>2</b><span>Voye yon kopi resi a bay admin lan.</span></li>
        <li><b>3</b><span>Kont ou debloke otomatikman lè peman yo ajou.</span></li>
      </ol>

      {[
        { k: 'mc', name: 'Digicel MonCash', num: '+509 31 33 87 85', c: '#EF4444' },
        { k: 'nc', name: 'Natcash',         num: '+509 42 44 90 24', c: '#F97316' },
      ].map(p => (
        <button type="button" key={p.k} className="sl-pay" onClick={() => copy(p.num, p.k)}>
          <i style={{ background: p.c }} />
          <span><b>{p.name}</b><em>Dasner JEAN</em></span>
          <code>{p.num}</code>
          <u>{copied === p.k ? <Check size={15} /> : <Copy size={15} />}</u>
        </button>
      ))}

      <button type="button" className="sl-retry" onClick={onRetry}><RefreshCw size={15} /> Mwen peye deja, eseye konekte ankò</button>
    </div>
  )
}

export default function SolLoginPage() {
  const navigate = useNavigate()
  const [form,     setForm]     = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [stage,    setStage]    = useState('auth')   // 'auth' → verifikasyon modpas, 'load' → chajman kont lan
  const [block,    setBlock]    = useState(null)   // { message, lateAmount, lateCount, name }
  const [caps,     setCaps]     = useState(false)
  const [help,     setHelp]     = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const cardRef = useRef(null)

  // Sesyon aktif → dirèk nan dashboard. Sinon: gade si dashboard la te voye yon blokaj + non sonje a.
  useEffect(() => {
    const token = localStorage.getItem('sol_token')
    if (token) { navigate('/app/sol/dashboard', { replace: true }); return }
    try {
      const raw = sessionStorage.getItem('sol_block')
      if (raw) setBlock(JSON.parse(raw))
    } catch { /* sessionStorage ka pa disponib */ }
    try {
      const u = localStorage.getItem('sol_remember_user')
      if (u) { setForm(p => ({ ...p, username: u })); setRemember(true) }
    } catch { /* */ }
  }, [navigate])

  const clearBlock = () => {
    setBlock(null)
    try { sessionStorage.removeItem('sol_block') } catch { /* */ }
  }

  // Demo: kont fo (done fo, byen kalkile) pou nouvo moun teste app la — pa gen rekèt rezo
  const startDemo = () => {
    try {
      localStorage.setItem('sol_token', 'demo')
      localStorage.setItem('sol_member', JSON.stringify({ name: 'Demo Machann' }))
      sessionStorage.removeItem('sol_block')
    } catch { /* */ }
    toast.success('Mòd demo: kont fo pou w teste app la')
    navigate('/app/sol/dashboard')
  }

  const handleLogin = async (e) => {
    e?.preventDefault?.()
    if (loading) return
    if (!form.username || !form.password) {
      return toast.error('Antre non itilizatè ak modpas ou.')
    }
    setLoading(true); setStage('auth')
    try {
      const res = await fetch(`${SOL_API}/api/sol/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim().toLowerCase(), password: form.password }),
      })
      const data = await res.json().catch(() => ({}))

      // Blokaj (403) — panèl konplè ak rezon + montan, pa kite konekte
      if (res.status === 403 && data.blocked) {
        const info = { message: data.message, lateAmount: data.lateAmount, lateCount: data.lateCount, name: '' }
        setBlock(info)
        try { sessionStorage.setItem('sol_block', JSON.stringify(info)) } catch { /* */ }
        return
      }
      if (!res.ok) throw new Error(data.message || 'Erè koneksyon')

      clearBlock()
      try {
        if (remember) localStorage.setItem('sol_remember_user', form.username.trim().toLowerCase())
        else localStorage.removeItem('sol_remember_user')
      } catch { /* */ }
      // Verifye kont lan DEVAN nou antre: si manm nan an reta/bloke, li rete isit la ak rezon an (pa janm antre nan dashboard la)
      setStage('load')
      let pre = null
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 25000)
        const r2 = await fetch(`${SOL_API}/api/sol/members/me`, { headers: { Authorization: `Bearer ${data.token}` }, signal: ctl.signal })
        clearTimeout(tm)
        if (r2.status === 403) {
          const j = await r2.json().catch(() => ({}))
          const info = { message: j.message || 'Kont ou bloke poutèt reta peman.', lateAmount: j.lateAmount, lateCount: j.lateCount, name: data.member?.name || '' }
          setBlock(info)
          try { sessionStorage.setItem('sol_block', JSON.stringify(info)) } catch { /* */ }
          return
        }
        if (r2.ok) pre = await r2.json()
      } catch { /* rezo ralanti: dashboard la ap eseye ankò */ }
      localStorage.setItem('sol_token',  data.token)
      localStorage.setItem('sol_member', JSON.stringify(data.member))
      if (pre) { try { sessionStorage.setItem('sol_prefetch', JSON.stringify({ t: Date.now(), json: pre })) } catch { /* */ } }
      toast.success(`Byenvini, ${data.member.name}!`)
      navigate('/app/sol/dashboard')
    } catch (err) {
      toast.error(err.message || 'Non itilizatè oswa modpas pa kòrèk.')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => setCaps(!!e.getModifierState?.('CapsLock'))

  // Kat la panche tou dousman swiv souris la (sèlman òdinatè)
  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const el = cardRef.current; if (!el) return
    const b = el.getBoundingClientRect()
    const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height
    el.style.setProperty('--ry', `${((px - 0.5) * 5).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${((0.5 - py) * 4).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`)
    el.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`)
  }
  const onLeave = () => {
    const el = cardRef.current; if (!el) return
    ;['--ry', '--rx', '--gx', '--gy'].forEach(k => el.style.removeProperty(k))
  }

  return (
    <div className="sl-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .sl-root { --disp: 'Plus Jakarta Sans', system-ui, sans-serif; --navy: #0B2F86; --blue: #0B4BD6; --orange: #FF6A00; --ink: #132B5E;
          position: relative; min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 56fr) minmax(0, 44fr);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: var(--ink); background: #EAF2FF; -webkit-font-smoothing: antialiased; overflow-x: hidden; isolation: isolate; }

        @keyframes slRise   { from { opacity: 0; transform: translateY(26px) } to { opacity: 1; transform: none } }
        @keyframes slCard   { from { opacity: 0; transform: translateY(40px) scale(.97); filter: blur(8px) } to { opacity: 1; transform: none; filter: blur(0) } }
        @keyframes slWipe   { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
        @keyframes slKen    { from { transform: scale(1.1) translate(-1%, .8%) } to { transform: scale(1) translate(0, 0) } }
        @keyframes slKen2   { 0%,100% { transform: scale(1) translate(0,0) } 50% { transform: scale(1.035) translate(-.6%, -.5%) } }
        @keyframes slWaveX  { to { transform: translateX(-50%) } }
        @keyframes slDrift  { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(40px,-30px) scale(1.15) } }
        @keyframes slShine  { 0% { background-position: 170% 0 } 55%,100% { background-position: -70% 0 } }
        @keyframes slSpin   { to { transform: rotate(360deg) } }
        @keyframes slShake  { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-7px) } 40%,80% { transform: translateX(7px) } }
        @keyframes slFloat  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes slBar    { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes slDraw   { from { stroke-dashoffset: 80 } to { stroke-dashoffset: 0 } }
        @keyframes slPing   { 0% { transform: scale(.85); opacity: .7 } 100% { transform: scale(2.1); opacity: 0 } }
        @keyframes slQuick  { 0%, 22%, 100% { transform: translateY(0) scale(1); background: transparent; color: var(--navy) } 8%, 14% { transform: translateY(-3px) scale(1.12); background: #FFF3C4; color: #C27A00 } }
        @keyframes slToast  { 0%, 4% { opacity: 0; transform: translateX(-22px) scale(.95) } 9%, 40% { opacity: 1; transform: none } 46%, 100% { opacity: 0; transform: translateX(-22px) scale(.95) } }
        @keyframes slNudge  { 0%, 100% { transform: translateX(0) rotate(0) } 20% { transform: translateX(7px) rotate(-8deg) } 40% { transform: translateX(0) rotate(6deg) } 60% { transform: translateX(7px) rotate(-8deg) } 80% { transform: translateX(0) rotate(0) } }
        @keyframes slGlow   { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,179,1,.55), 0 10px 22px -12px rgba(229,154,0,.7) } 50% { box-shadow: 0 0 0 9px rgba(245,179,1,0), 0 14px 28px -10px rgba(229,154,0,.9) } }
        @keyframes slHint   { 0%, 100% { opacity: .55; transform: translateY(0) } 50% { opacity: 1; transform: translateY(2px) } }
        @keyframes slTick   { 0% { transform: scale(0) } 60% { transform: scale(1.25) } 100% { transform: scale(1) } }

        /* ── FOTO (kesyè) ── */
        .sl-photo { position: relative; overflow: hidden; min-height: 100vh; min-height: 100dvh; background: #0A2C7A; }
        .sl-photo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 30% 18%; animation: slKen 2.4s cubic-bezier(.2,.7,.2,1) both, slKen2 22s ease-in-out 2.4s infinite; transform-origin: 40% 30%; }
        .sl-photo::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(7,32,100,.18) 0%, transparent 26%, transparent 52%, rgba(6,30,87,.55) 100%), linear-gradient(90deg, transparent 70%, rgba(234,242,255,.5) 100%); }
        .sl-logo-top { display: none; }

        .sl-notify { position: absolute; z-index: 3; left: 30px; top: 34px; display: flex; align-items: center; gap: 11px; padding: 10px 16px 10px 11px; border-radius: 18px; background: rgba(255,255,255,.88); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 18px 40px -12px rgba(0,25,90,.5); animation: slToast 12s ease-in-out 2.6s infinite both; opacity: 0; }
        @supports (backdrop-filter: blur(1px)) { .sl-notify { background: rgba(255,255,255,.7); backdrop-filter: blur(14px) saturate(1.5); -webkit-backdrop-filter: blur(14px) saturate(1.5); } }
        .sl-notify i { width: 34px; height: 34px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(145deg, #22C55E, #15803D); }
        .sl-notify i svg { animation: slTick .5s cubic-bezier(.2,.9,.3,1.4) 3.2s both; animation-iteration-count: 1; }
        .sl-notify b { display: block; font-size: 13px; color: var(--ink); line-height: 1.2; }
        .sl-notify span { font-size: 12px; font-weight: 700; color: #15803D; }

        .sl-tagline { position: absolute; z-index: 3; left: 44px; bottom: 24px; display: flex; align-items: center; gap: 14px; color: #fff; max-width: 330px; animation: slRise .9s cubic-bezier(.2,.8,.2,1) .7s both; }
        .sl-tagline p { font-family: var(--disp); font-size: clamp(17px, 1.55vw, 22px); font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
        .sl-tagline p i { display: inline-flex; vertical-align: -3px; margin-left: 7px; width: 20px; height: 20px; border-radius: 50%; align-items: center; justify-content: center; background: linear-gradient(145deg, #FFE08A, #F5B301 60%, #E39A00); color: #3B2600; box-shadow: 0 4px 10px -3px rgba(229,154,0,.8); }
        .sl-growth rect { transform-box: fill-box; transform-origin: bottom; animation: slBar .8s cubic-bezier(.2,.8,.2,1) both; }
        .sl-growth .b1 { animation-delay: 1s } .sl-growth .b2 { animation-delay: 1.15s } .sl-growth .b3 { animation-delay: 1.3s }
        .sl-growth .arr { stroke-dasharray: 80; animation: slDraw 1s ease-out 1.5s both; }

        /* ── LADAN DWAT (fon + kat) ── */
        .sl-side { position: relative; display: flex; align-items: center; justify-content: center; padding: 26px 34px 30px 0; margin-left: -96px; }
        .sl-bg { position: absolute; inset: 0; z-index: -1; overflow: hidden; background: radial-gradient(700px 520px at 85% 8%, #CFE3FF 0%, transparent 62%), radial-gradient(520px 420px at 100% 100%, rgba(255,138,31,.2) 0%, transparent 60%), linear-gradient(180deg, #EAF2FF 0%, #F6F9FF 100%); }
        .sl-orb { position: absolute; border-radius: 50%; filter: blur(60px); animation: slDrift 18s ease-in-out infinite; }
        .sl-orb.a { width: 340px; height: 340px; right: -60px; top: 6%; background: rgba(37,99,235,.28); }
        .sl-orb.b { width: 260px; height: 260px; left: 14%; bottom: 24%; background: rgba(255,138,31,.2); animation-delay: -7s; }

        .sl-stage { position: relative; z-index: 3; width: 100%; max-width: 540px; perspective: 1400px; }
        .sl-card { --rx: 0deg; --ry: 0deg; position: relative; width: 100%; padding: 22px 32px 18px; border-radius: 34px; background: rgba(255,255,255,.95); border: 1px solid rgba(255,255,255,.95);
          box-shadow: 0 1px 0 #fff inset, 0 40px 90px -28px rgba(6,40,130,.55), 0 14px 34px -14px rgba(6,40,130,.3);
          transform: rotateX(var(--rx)) rotateY(var(--ry)); transition: transform .35s cubic-bezier(.2,.8,.2,1); animation: slCard 1s cubic-bezier(.2,.8,.2,1) .15s both; }
        @supports (backdrop-filter: blur(1px)) { .sl-card { background: rgba(255,255,255,.8); backdrop-filter: blur(22px) saturate(1.5); -webkit-backdrop-filter: blur(22px) saturate(1.5); } }
        .sl-card::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient(380px circle at var(--gx, 80%) var(--gy, 0%), rgba(255,255,255,.7), transparent 60%); opacity: .8; }
        .sl-card > * { position: relative; z-index: 1; }

        .sl-logo-card { display: block; width: 100%; max-width: 330px; margin: 0 auto 10px; animation: slWipe 1.2s cubic-bezier(.65,.05,.2,1) .5s both; }
        .sl-logo-card img { display: block; width: 100%; height: auto; }
        .sl-rule { height: 1px; margin: 0 auto 12px; width: 86%; background: linear-gradient(90deg, transparent, rgba(11,47,134,.28), transparent); }

        .sl-head { text-align: center; margin-bottom: 15px; }
        .sl-head h1 { display: inline-flex; align-items: center; justify-content: center; gap: 12px; font-family: var(--disp); font-size: clamp(32px, 3.1vw, 42px); font-weight: 800; letter-spacing: -0.045em; line-height: 1; color: var(--blue); animation: slRise .8s cubic-bezier(.2,.8,.2,1) .75s both; }
        .sl-head h1 svg { color: var(--blue); flex-shrink: 0; animation: slFloat 4.5s ease-in-out infinite; }
        .sl-head h1 em { font-style: normal; color: var(--orange); background: linear-gradient(90deg, #FF6A00 0%, #FFB300 55%, #F5B301 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; position: relative; }
        .sl-head h1 em::after { content: ''; position: absolute; left: -6%; right: -6%; bottom: -9px; height: 5px; border-radius: 4px; background: linear-gradient(90deg, transparent, #F5B301, #FF8A1F, transparent); -webkit-text-fill-color: initial; transform-origin: left; animation: slWipe .9s ease-out 1.3s both; }
        .sl-head p { margin: 14px auto 0; max-width: 28em; font-size: 14px; font-weight: 700; line-height: 1.55; color: var(--navy); animation: slRise .8s cubic-bezier(.2,.8,.2,1) .9s both; }

        .sl-head p { line-height: 1.9; }
        .sl-join { display: inline-flex; align-items: center; gap: 7px; padding: 3px 13px 3px 8px; margin: 0 1px; border-radius: 99px; border: 1.5px solid #F5B301; background: linear-gradient(180deg, #FFF8DB, #FFEBA8); color: #7A4A00; font: inherit; font-weight: 800; cursor: pointer; animation: slGlow 2.4s ease-in-out 2s infinite; transition: transform .2s, filter .2s; }
        .sl-join:hover { transform: translateY(-2px) scale(1.03); filter: saturate(1.15); }
        .sl-join:active { transform: scale(.98); }
        .sl-finger { display: inline-block; font-size: 22px; line-height: 1; transform-origin: 30% 80%; animation: slNudge 2s ease-in-out 1.6s infinite; filter: drop-shadow(0 3px 3px rgba(150,90,0,.3)); }
        .sl-join-t { text-decoration: underline; text-decoration-color: rgba(122,74,0,.45); text-underline-offset: 3px; }
        .sl-join-hint { display: block; margin-top: 2px; font-size: 11.5px; font-weight: 800; color: #B07A00; animation: slHint 2.4s ease-in-out 2.4s infinite; }
        .sl-field { position: relative; margin-bottom: 12px; animation: slRise .7s cubic-bezier(.2,.8,.2,1) both; }
        .sl-field.f1 { animation-delay: 1s } .sl-field.f2 { animation-delay: 1.08s }
        .sl-field > svg.ico { position: absolute; left: 17px; top: 50%; transform: translateY(-50%); color: var(--navy); pointer-events: none; transition: color .2s, transform .2s; }
        .sl-input { width: 100%; height: 54px; padding: 0 52px 0 54px; border-radius: 17px; font-size: 16px; font-weight: 500; font-family: inherit; color: var(--ink); background: rgba(255,255,255,.96); border: 1.5px solid #8EA0C8; transition: border-color .2s, box-shadow .25s, transform .2s; }
        .sl-input::placeholder { color: #5B6C93; font-weight: 500; }
        .sl-input:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 4px rgba(11,75,214,.14), 0 14px 28px -14px rgba(11,75,214,.55); transform: translateY(-1px); }
        .sl-field:focus-within > svg.ico { color: var(--orange); transform: translateY(-50%) scale(1.12); }
        .sl-input:disabled { opacity: .65; }
        .sl-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--navy); cursor: pointer; padding: 11px; display: flex; border-radius: 12px; }
        .sl-eye:hover { background: rgba(11,47,134,.08); }
        .sl-hint { margin: -6px 2px 12px; font-size: 12px; font-weight: 700; color: #B45309; }

        .sl-demo { width: 100%; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; padding: 12px 14px; border-radius: 16px; cursor: pointer; font: inherit; font-weight: 800; font-size: 14.5px; color: #7A5200; background: #FFF8E1; border: 1.5px dashed #F5B301; transition: transform .15s, background .2s; }
        .sl-demo:hover { transform: translateY(-2px); background: #FFF1C2; }
        .sl-demo span { font-size: 11.5px; font-weight: 700; color: #A06A00; }
        .sl-btn { position: relative; overflow: hidden; width: 100%; height: 56px; margin-top: 4px; border: none; border-radius: 18px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; font-family: var(--disp); font-size: 21px; font-weight: 800; letter-spacing: -0.02em;
          background: linear-gradient(180deg, #FFA11A 0%, #FF6A00 55%, #F04A06 100%); box-shadow: 0 1px 0 rgba(255,255,255,.55) inset, 0 -3px 0 rgba(160,40,0,.22) inset, 0 16px 30px -10px rgba(255,90,0,.7);
          transition: transform .18s, box-shadow .25s, filter .2s; animation: slRise .7s cubic-bezier(.2,.8,.2,1) 1.16s both; }
        .sl-btn::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(108deg, transparent 38%, rgba(255,255,255,.5) 50%, transparent 62%) 170% 0 / 260% 100% no-repeat; animation: slShine 4.2s ease-in-out 2.2s infinite; }
        .sl-btn svg { transition: transform .25s; }
        .sl-btn:hover:not(:disabled) { transform: translateY(-3px); filter: saturate(1.1); box-shadow: 0 1px 0 rgba(255,255,255,.55) inset, 0 -3px 0 rgba(160,40,0,.22) inset, 0 22px 38px -10px rgba(255,90,0,.8); }
        .sl-btn:hover:not(:disabled) svg { transform: translateX(5px); }
        .sl-btn:active:not(:disabled) { transform: translateY(0) scale(.985); }
        .sl-btn:disabled { cursor: progress; filter: saturate(.7) brightness(.97); }
        .sl-btn.loading::after { display: none; }

        .sl-opts { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin: 14px 2px 0; font-size: 13.5px; font-weight: 600; animation: slRise .7s cubic-bezier(.2,.8,.2,1) 1.25s both; }
        .sl-check { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; color: var(--ink); user-select: none; }
        .sl-check input { position: absolute; opacity: 0; pointer-events: none; }
        .sl-check i { width: 20px; height: 20px; border-radius: 6px; border: 1.8px solid #6C7FA8; background: #fff; display: flex; align-items: center; justify-content: center; color: #fff; transition: background .2s, border-color .2s, transform .2s; }
        .sl-check i svg { opacity: 0; transform: scale(.4); transition: opacity .15s, transform .25s cubic-bezier(.2,.9,.3,1.5); }
        .sl-check input:checked + i { background: var(--blue); border-color: var(--blue); }
        .sl-check input:checked + i svg { opacity: 1; transform: scale(1); }
        .sl-check input:focus-visible + i { outline: 2px solid var(--blue); outline-offset: 2px; }
        .sl-link { background: none; border: none; padding: 0; font: inherit; font-weight: 700; color: var(--blue); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
        .sl-link:hover { color: var(--orange); }
        .sl-helpbox { margin: 12px 0 0; padding: 13px 15px; border-radius: 15px; font-size: 12.5px; line-height: 1.6; font-weight: 600; color: var(--ink); background: #EEF4FF; border: 1px solid #C9D9F7; animation: slRise .4s ease both; }
        .sl-helpbox a { display: inline-flex; align-items: center; gap: 7px; margin-top: 9px; padding: 8px 13px; border-radius: 11px; font-weight: 800; font-size: 12.5px; color: #fff; text-decoration: none; background: #16A34A; }

        .sl-quick { display: grid; grid-template-columns: repeat(5, 1fr); margin-top: 16px; padding: 8px 6px; border-radius: 22px; background: rgba(226,236,255,.75); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 1px 0 #fff inset; animation: slRise .7s cubic-bezier(.2,.8,.2,1) 1.35s both; }
        .sl-quick div { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 3px 0; font-size: 12.5px; font-weight: 800; color: var(--navy); border-right: 1px solid rgba(11,47,134,.16); }
        .sl-quick div:last-child { border-right: 0; }
        .sl-quick div i { width: 44px; height: 38px; border-radius: 14px; display: flex; align-items: center; justify-content: center; animation: slQuick 7.5s ease-in-out infinite; animation-delay: calc(var(--i) * 1.4s + 2.5s); }
        .sl-secure { margin: 12px 0 0; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 12px; font-weight: 600; color: #5B6C93; animation: slRise .7s ease 1.45s both; }

        /* ── PANÈL KONT BLOKE (kat klè) ── */
        .sl-block { margin-bottom: 4px; padding: 17px 16px 15px; border-radius: 22px; background: linear-gradient(180deg, #FFF1F1, #FFE4E4); border: 1.5px solid #F5A3A3; box-shadow: 0 20px 40px -22px rgba(220,38,38,.55); animation: slShake .45s ease, slRise .5s ease both; }
        .sl-block-top { display: flex; align-items: center; gap: 14px; }
        .sl-lock { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
        .sl-lock i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(239,68,68,.6); animation: slPing 2.2s ease-out infinite; }
        .sl-lock i + i { animation-delay: 1.1s; }
        .sl-lock span { position: absolute; inset: 0; border-radius: 17px; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(145deg, #EF4444, #B91C1C); box-shadow: 0 10px 22px rgba(239,68,68,.45); }
        .sl-block h3 { font-family: var(--disp); font-size: 25px; font-weight: 800; letter-spacing: -0.04em; color: #B91C1C; line-height: 1.05; }
        .sl-block .who { margin-top: 3px; font-size: 12.5px; font-weight: 700; color: #7F1D1D; }
        .sl-block-why { margin-top: 13px; font-size: 13.5px; line-height: 1.6; color: #5B1A1A; font-weight: 600; } .sl-block-why b { color: #B91C1C; }
        .sl-due { margin-top: 13px; display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 15px; border-radius: 16px; background: #fff; border: 1px solid #F5C2C2; }
        .sl-due span { display: block; font-size: 11.5px; font-weight: 800; color: #9B1C1C; margin-bottom: 4px; }
        .sl-due strong { font-family: var(--disp); font-size: 38px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: #7F1D1D; } .sl-due strong small { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; margin-left: 6px; letter-spacing: 0; color: #B91C1C; }
        .sl-due em { font-style: normal; font-size: 11.5px; font-weight: 800; color: #B91C1C; padding: 5px 10px; border-radius: 99px; background: #FEE2E2; border: 1px solid #F5A3A3; }
        .sl-steps { list-style: none; margin: 14px 0 12px; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .sl-steps li { display: flex; gap: 11px; align-items: flex-start; font-size: 12.5px; line-height: 1.5; font-weight: 600; color: #4B1D1D; }
        .sl-steps b { width: 22px; height: 22px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--disp); font-size: 12px; color: #fff; background: #DC2626; }
        .sl-pay { width: 100%; display: flex; align-items: center; gap: 11px; text-align: left; margin-bottom: 8px; padding: 10px 12px; border-radius: 14px; cursor: pointer; font-family: inherit; color: var(--ink); background: #fff; border: 1px solid #F0C9C9; transition: transform .15s, box-shadow .2s; }
        .sl-pay:hover { transform: translateY(-1px); box-shadow: 0 10px 20px -12px rgba(127,29,29,.5); }
        .sl-pay > i { width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; }
        .sl-pay span { flex: 1; min-width: 0; } .sl-pay b { display: block; font-size: 13px; } .sl-pay em { font-style: normal; font-size: 11px; color: #6B7B9A; font-weight: 600; }
        .sl-pay code { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; } .sl-pay u { text-decoration: none; color: #6B7B9A; display: flex; }
        .sl-retry { margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 13px; cursor: pointer; font-family: inherit; font-weight: 800; font-size: 13px; color: #B91C1C; background: transparent; border: 1.5px solid #E58D8D; }
        .sl-retry:hover { background: #FEE2E2; }

        /* ── VAG ANIME (anba) ── */
        .sl-waves { position: absolute; left: 0; right: 0; bottom: 0; height: 205px; z-index: 1; pointer-events: none; overflow: hidden; }
        .sl-wave { position: absolute; left: 0; bottom: 0; width: 200%; height: 100%; animation: slWaveX linear infinite; }
        .sl-wave.w3 { animation-duration: 26s; opacity: .95; } .sl-wave.w2 { animation-duration: 34s; animation-direction: reverse; } .sl-wave.w1 { animation-duration: 44s; }
        .sl-powered { position: absolute; z-index: 4; right: 26px; bottom: 14px; font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,.75); }

        :focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } .sl-notify { opacity: 0 !important; } }
        @media (hover: none) { .sl-card { transform: none !important; } }
        @media (max-width: 1100px) { .sl-side { padding-right: 20px; margin-left: -70px; } .sl-card { padding: 22px 22px 18px; } .sl-notify { left: 18px; top: 22px; } .sl-tagline { left: 26px; } }

        /* ── MOBIL ── */
        @media (max-width: 900px) {
          .sl-root { display: block; background: linear-gradient(180deg, #E4EFFF 0%, #FFFFFF 340px); }
          .sl-logo-top { display: block; position: relative; z-index: 3; width: min(78%, 330px); margin: 0 auto; padding: 24px 0 8px; animation: slWipe 1.2s cubic-bezier(.65,.05,.2,1) .3s both; }
          .sl-logo-top img { display: block; width: 100%; height: auto; }
          .sl-photo { min-height: 0; height: min(60vw, 330px); background: transparent; }
          .sl-photo-img { object-position: 50% 14%; -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 22%); mask-image: linear-gradient(180deg, transparent 0, #000 22%); }
          .sl-photo::after { background: linear-gradient(180deg, transparent 60%, rgba(6,30,87,.25) 100%); }
          .sl-tagline { display: none; }
          .sl-notify { left: 12px; top: auto; bottom: 46px; padding: 8px 13px 8px 9px; border-radius: 15px; }
          .sl-notify i { width: 28px; height: 28px; border-radius: 10px; } .sl-notify b { font-size: 11.5px; } .sl-notify span { font-size: 11px; }
          .sl-side { display: block; margin: -34px 0 0; padding: 0 12px 34px; background: linear-gradient(180deg, #0C47B5 0%, #072A70 100%); border-radius: 0; min-height: 0; }
          .sl-bg { display: none; }
          .sl-stage { max-width: 520px; margin: 0 auto; perspective: none; }
          .sl-card { padding: 22px 18px 20px; border-radius: 30px; transform: none !important; margin-top: 0; background: rgba(255,255,255,.93); }
          .sl-side { margin-left: 0 !important; }
          .sl-logo-card, .sl-rule { display: none; }
          .sl-head { margin-bottom: 16px; }
          .sl-head h1 { font-size: 34px; }
          .sl-head p { font-size: 13.5px; margin-top: 14px; }
          .sl-input { height: 56px; }
          .sl-btn { height: 58px; font-size: 20px; }
          .sl-quick { grid-template-columns: repeat(4, 1fr); }
          .sl-quick .hide-m { display: none; }
          .sl-quick div { font-size: 12px; }
          .sl-waves { height: 120px; opacity: .7; }
          .sl-powered { position: relative; z-index: 4; text-align: center; padding: 18px 0 8px; color: rgba(255,255,255,.85); }
        }
        @media (max-width: 380px) { .sl-head h1 { font-size: 30px; gap: 9px; } .sl-quick div i { width: 38px; } }
      `}</style>

      {/* Logo (mobil) */}
      <div className="sl-logo-top"><img src={IMG_LOGO} alt="Plus Group — Innovation, Technologie, Commerce, Service" /></div>

      {/* Foto kesyè */}
      <section className="sl-photo" aria-label="Machann ayisyen nan boutik li">
        <img className="sl-photo-img" src={IMG_PHOTO} alt="Yon machann ayisyen ap souri nan boutik li" />
        <div className="sl-notify" aria-hidden="true">
          <i><Check size={18} strokeWidth={3} /></i>
          <div><b>Peman resevwa</b><span>+500 HTG · jodi a</span></div>
        </div>
        <div className="sl-tagline">
          <GrowthIcon />
          <p>Jere sòl ou fasil, an sekirite ak plis kontwòl.<i><Check size={13} strokeWidth={3.4} /></i></p>
        </div>
      </section>

      {/* Fòm */}
      <main className="sl-side">
        <div className="sl-bg" aria-hidden="true"><div className="sl-orb a" /><div className="sl-orb b" /></div>

        <div className="sl-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
          <div className="sl-card" ref={cardRef}>
            <div className="sl-logo-card"><img src={IMG_LOGO} alt="Plus Group" /></div>
            <div className="sl-rule" />

            <header className="sl-head">
              <h1><Users size={36} strokeWidth={2.4} aria-hidden="true" /><span>Kont <em>Sòl</em> ou</span></h1>
              <p>
                <button type="button" className="sl-join" onClick={() => setJoinOpen(true)} aria-label="Rejwenn kominote a — louvri fòm pou antre nan sòl la">
                  <span className="sl-finger" aria-hidden="true">👉</span>
                  <span className="sl-join-t">Rejwenn kominote a</span>
                </button>{' '}
                pou w kapab sanble lajan'w pi byen pou biznis la ka grandi.
              </p>
              <span className="sl-join-hint" aria-hidden="true">Klike pou w antre nan sòl la</span>
            </header>

            {block && <BlockedPanel info={block} onRetry={clearBlock} />}

            {!block && (
              <form onSubmit={handleLogin} noValidate>
                <div className="sl-field f1">
                  <User className="ico" size={22} aria-hidden="true" />
                  <label className="sr" htmlFor="sl-user" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Non itilizatè</label>
                  <input id="sl-user" type="text" className="sl-input" value={form.username} placeholder="Non itilizatè"
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" disabled={loading} />
                </div>

                <div className="sl-field f2">
                  <Lock className="ico" size={22} aria-hidden="true" />
                  <label htmlFor="sl-pass" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Modpas</label>
                  <input id="sl-pass" type={showPass ? 'text' : 'password'} className="sl-input" value={form.password} placeholder="Modpas"
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    onKeyDown={onKey} onKeyUp={onKey} autoComplete="current-password" disabled={loading} />
                  <button type="button" className="sl-eye" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Kache modpas' : 'Montre modpas'}>
                    {showPass ? <EyeOff size={21} /> : <Eye size={21} />}
                  </button>
                </div>
                {caps && <p className="sl-hint">Majiskil aktive (Caps Lock).</p>}

                <button type="submit" className={`sl-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                  {loading
                    ? <span style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'slSpin .8s linear infinite' }} />
                    : <LogIn size={24} strokeWidth={2.4} />}
                  {loading ? (stage === 'load' ? 'Ap chaje kont ou…' : 'Ap verifye…') : 'Konekte'}
                </button>

                <div className="sl-opts">
                  <label className="sl-check">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    <i><Check size={13} strokeWidth={3.6} /></i>
                    Sonje mwen
                  </label>
                  <button type="button" className="sl-link" onClick={() => setHelp(h => !h)} aria-expanded={help}>Eske w bliye modpas ou ?</button>
                </div>
                <button type="button" className="sl-demo" onClick={startDemo}>
                  <Sparkles size={17} /> Eseye yon demo <span>kont fo, pa bezwen modpas</span>
                </button>
                {help && (
                  <div className="sl-helpbox" role="note">
                    Responsab sòl ou a se moun ki ba ou non itilizatè ak modpas la. Kontakte l pou li reyinisyalize modpas ou, oswa ekri sipò Plus Group.
                    <br />
                    <a href={SUPPORT_WA} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> Ekri sipò sou WhatsApp</a>
                  </div>
                )}
              </form>
            )}

            <div className="sl-quick" aria-hidden="true">
              {QUICK.map(({ Icon, label, hideMobile }, i) => (
                <div key={label} className={hideMobile ? 'hide-m' : ''} style={{ '--i': i }}>
                  <i><Icon size={25} strokeWidth={2.2} /></i>
                  {label}
                </div>
              ))}
            </div>

            <p className="sl-secure"><ShieldCheck size={15} /> Sekirite ou se priyorite nou.</p>
          </div>
        </div>

        <p className="sl-powered">Powered by plusgroupe.com</p>
      </main>

      <Waves />
      {joinOpen && <SolJoinForm onClose={() => setJoinOpen(false)} />}
    </div>
  )
}
