// src/pages/sol/SolLoginPage.jsx
// Pòtal koneksyon pou manm Sabotay Sol — design "Sabotay Inove" (tipografi Syne + animasyon + mockup telefòn)
// Wout: /app/sol/login
//
// ✅ Design 100% nan kòd (SVG + CSS): pa bezwen imaj background ankò
//    (public/images/sabotay-login-bg*.png pa itilize ankò).
// ✅ Kont bloke: lè dashboard la resevwa 403, li sove rezon an + montan ki an reta a nan
//    sessionStorage('sol_block'). Paj sa a montre yon panèl konplè (rezon, montan, kijan pou peye)
//    olye yon ti toast ki disparèt.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Lock, TrendingUp, Bell, Trophy, Copy, Check, RefreshCw } from 'lucide-react'

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

const fmtN = (n) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

function BrandIcon({ size = 22 }) {
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

const POINTS = [
  { Icon: TrendingUp, title: 'Wè sa ou peye ak sa ki rete',  sub: 'Kaye peman ou a ajou an tan reyèl.' },
  { Icon: Bell,       title: 'Pa janm rate yon dat peman',   sub: 'Revèy ak rapèl pou chak peman.' },
  { Icon: Trophy,     title: 'Konnen kilè w ap touche',      sub: 'Dat ak montan an klè, san devine.' },
]

// ── Ti kat mockup (menm look ak kat tableau de bord la) ──
function MiniCard({ small }) {
  return (
    <div className={`sl-mini ${small ? 'sm' : ''}`}>
      <div className="sl-mini-row"><span>Sòl Chak Jou 500</span><span>Chak Jou</span></div>
      <div className="sl-mini-lab">Kòb ou ap touche</div>
      <div className="sl-mini-amt">4 750<small>HTG</small></div>
      <div className="sl-mini-bar"><i /></div>
      <div className="sl-mini-foot"><span>3/10 peye</span><span>30%</span></div>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="sl-phone-wrap" aria-hidden="true"><div className="sl-phone-scale">
      <div className="sl-phone">
        <div className="sl-phone-notch" />
        <div className="sl-phone-screen">
          <div className="sl-ps-bar"><b>Sabotay Inove</b><i>MJ</i></div>
          <MiniCard small />
          <div className="sl-ps-stamps">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <span key={n} className={n <= 3 ? 'ok' : n === 4 ? 'now' : ''} style={{ animationDelay: `${0.8 + n * 0.09}s` }}>{n <= 3 ? '✓' : n}</span>
            ))}
          </div>
          <div className="sl-ps-row"><i /><div><b /><s /></div></div>
          <div className="sl-ps-row"><i /><div><b /><s /></div></div>
          <div className="sl-ps-nav"><i className="on" /><i /><i /><i /></div>
        </div>
      </div>
      <div className="sl-chip c1"><Check size={13} strokeWidth={3} /> Peman bonè +12 pwen</div>
      <div className="sl-chip c2"><Trophy size={13} /> Ou touche 06/11</div>
    </div></div>
  )
}

// ── Panèl kont bloke ──
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

  const copy = (num, key) => {
    const clean = num.replace(/[^\d+]/g, '')
    const done = () => { setCopied(key); setTimeout(() => setCopied(''), 1800) }
    try { navigator.clipboard.writeText(clean).then(done, done) } catch { done() }
  }

  return (
    <div className="sl-block" role="alert">
      <div className="sl-block-top">
        <div className="sl-lock"><i /><i /><span><Lock size={26} /></span></div>
        <div>
          <h3>Kont ou bloke</h3>
          {info.name && <p className="who">{info.name}</p>}
        </div>
      </div>

      <p className="sl-block-why"><b>Rezon:</b> {msg.replace(/^Kont ou bloke:?\s*/i, '').replace(/\s*Kontakte admin lan.*$/i, '').replace(/[.\s]+$/, '').trim() || 'peman an reta'}.</p>

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
  const [loading,  setLoading]  = useState(false)
  const [block,    setBlock]    = useState(null)   // { message, lateAmount, lateCount, name }
  const [caps,     setCaps]     = useState(false)

  // Si manm gen deja yon sesyon aktif, redirije dirèkteman. Sinon, gade si dashboard la te voye yon blokaj.
  useEffect(() => {
    const token = localStorage.getItem('sol_token')
    if (token) { navigate('/app/sol/dashboard', { replace: true }); return }
    try {
      const raw = sessionStorage.getItem('sol_block')
      if (raw) setBlock(JSON.parse(raw))
    } catch { /* sessionStorage ka pa disponib */ }
  }, [navigate])

  const clearBlock = () => {
    setBlock(null)
    try { sessionStorage.removeItem('sol_block') } catch { /* */ }
  }

  const handleLogin = async (e) => {
    e?.preventDefault?.()
    if (loading) return
    if (!form.username || !form.password) {
      return toast.error('Antre non itilizatè ak modpas ou.')
    }
    setLoading(true)
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
      localStorage.setItem('sol_token',  data.token)
      localStorage.setItem('sol_member', JSON.stringify(data.member))
      toast.success(`Byenvini, ${data.member.name}!`)
      navigate('/app/sol/dashboard')
    } catch (err) {
      toast.error(err.message || 'Non itilizatè oswa modpas pa kòrèk.')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => setCaps(!!e.getModifierState?.('CapsLock'))

  return (
    <div className="sl-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .sl-root { --disp: 'Syne', 'Plus Jakarta Sans', system-ui, sans-serif; position: relative; min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #EEF3FF; background: #050A18; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

        /* ── anime: foul ak sèk ── */
        @keyframes slFade  { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
        @keyframes slShake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-7px) } 40%,80% { transform: translateX(7px) } }
        @keyframes slSpin  { to { transform: rotate(360deg) } }
        @keyframes slFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes slDrift { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(34px,-26px) scale(1.14) } }
        @keyframes slOrbit { to { transform: rotate(360deg) } }
        @keyframes slSway  { 0%,100% { transform: perspective(900px) rotateY(-9deg) rotateX(4deg) rotate(-2deg) } 50% { transform: perspective(900px) rotateY(7deg) rotateX(-2deg) rotate(1deg) } }
        @keyframes slShine { 0% { background-position: 170% 0 } 55%,100% { background-position: -70% 0 } }
        @keyframes slPop   { 0% { opacity: 0; transform: scale(.4) } 65% { opacity: 1; transform: scale(1.12) } 100% { opacity: 1; transform: scale(1) } }
        @keyframes slBar   { from { width: 0 } to { width: 30% } }
        @keyframes slRipple { 0% { transform: scale(.85); opacity: .7 } 100% { transform: scale(2.1); opacity: 0 } }
        @keyframes slChip  { 0%,100% { transform: translateY(0) rotate(var(--r, 0deg)) } 50% { transform: translateY(-8px) rotate(var(--r, 0deg)) } }

        .sl-orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; z-index: 0; animation: slDrift 16s ease-in-out infinite; }
        .sl-orb.a { width: 380px; height: 380px; left: -120px; top: -90px; background: rgba(37,99,235,.38); }
        .sl-orb.b { width: 320px; height: 320px; right: -90px; bottom: -70px; background: rgba(249,115,22,.2); animation-delay: -6s; }

        .sl-brand { position: relative; z-index: 1; overflow: hidden; padding: 48px 56px; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(900px 560px at 0% 0%, rgba(37,99,235,0.42) 0%, transparent 62%), radial-gradient(700px 480px at 100% 100%, rgba(249,115,22,0.22) 0%, transparent 60%), #060D20; isolation: isolate; }
        .sl-art { position: absolute; z-index: -1; right: -180px; bottom: -200px; width: 720px; height: 720px; pointer-events: none; animation: slOrbit 70s linear infinite; }
        .sl-logo { display: flex; align-items: center; gap: 13px; }
        .sl-logo-mark { width: 46px; height: 46px; border-radius: 15px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 32% 28%, rgba(37,99,235,0.4) 0%, #0A1330 76%); box-shadow: 0 0 0 1px rgba(96,165,250,0.35), 0 10px 30px rgba(37,99,235,.35); }
        .sl-logo b { display: block; font-family: var(--disp); font-size: 18px; font-weight: 800; letter-spacing: -0.03em; }
        .sl-logo span { font-size: 12.5px; color: #8FA0BD; }
        .sl-hero { position: relative; z-index: 2; }
        .sl-hero h1 { font-family: var(--disp); font-size: clamp(38px, 4.6vw, 60px); font-weight: 800; letter-spacing: -0.045em; line-height: .98; max-width: 7.5em; }
        .sl-hero h1 em { font-style: normal; background: linear-gradient(100deg, #7FA5FF, #FDBA74); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .sl-hero p.lead { margin-top: 18px; font-size: 15.5px; line-height: 1.65; color: #A9B6CE; max-width: 21em; }
        .sl-points { margin-top: 30px; display: flex; flex-direction: column; gap: 14px; max-width: 21em; }
        .sl-point { display: flex; align-items: flex-start; gap: 14px; }
        .sl-point i { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #7FA5FF; background: rgba(37,99,235,0.16); border: 1px solid rgba(96,165,250,0.25); }
        .sl-point b { display: block; font-size: 14.5px; font-weight: 700; }
        .sl-point span { font-size: 13px; color: #8FA0BD; }
        .sl-foot { font-size: 12px; color: #6B7B96; position: relative; z-index: 2; }
        .sl-brand .sl-logo, .sl-hero h1, .sl-hero p.lead, .sl-point { animation: slFade .8s cubic-bezier(.2,.8,.2,1) both; }
        .sl-hero p.lead { animation-delay: .12s } .sl-point:nth-child(1) { animation-delay: .24s } .sl-point:nth-child(2) { animation-delay: .32s } .sl-point:nth-child(3) { animation-delay: .4s }

        /* telefòn mockup */
        .sl-phone-scale { transform: scale(.82); transform-origin: 100% 100%; }
        .sl-phone-wrap { position: absolute; z-index: 1; right: 22px; bottom: -200px; width: 262px; animation: slFloat 7s ease-in-out infinite; }
        .sl-phone { width: 262px; height: 540px; border-radius: 44px; padding: 9px; background: linear-gradient(145deg, #243055, #0A1020); box-shadow: 0 0 0 1.5px rgba(255,255,255,.14), 0 50px 90px -20px rgba(0,0,0,.75), 0 0 80px rgba(37,99,235,.25); transform: perspective(1400px) rotateY(-16deg) rotateX(6deg) rotate(4deg); position: relative; }
        .sl-phone-notch { position: absolute; top: 15px; left: 50%; width: 76px; height: 20px; border-radius: 12px; background: #04070F; transform: translateX(-50%); z-index: 3; }
        .sl-phone-screen { height: 100%; border-radius: 36px; overflow: hidden; background: #08112A; padding: 40px 12px 12px; position: relative; display: flex; flex-direction: column; gap: 10px; }
        .sl-ps-bar { display: flex; justify-content: space-between; align-items: center; }
        .sl-ps-bar b { font-family: var(--disp); font-size: 12.5px; letter-spacing: -0.02em; }
        .sl-ps-bar i { font-style: normal; font-size: 8.5px; font-weight: 800; width: 22px; height: 22px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#2563EB,#F97316); }
        .sl-ps-stamps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .sl-ps-stamps span { aspect-ratio: 1; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #6B7B96; border: 1.4px dashed rgba(255,255,255,.14); animation: slPop .5s cubic-bezier(.2,.9,.3,1.2) both; }
        .sl-ps-stamps span.ok { color: #34D399; background: rgba(52,211,153,.12); border: 1.4px solid rgba(52,211,153,.4); }
        .sl-ps-stamps span.now { color: #7FA5FF; background: rgba(37,99,235,.18); border: 1.4px solid #2563EB; }
        .sl-ps-row { display: flex; gap: 8px; align-items: center; padding: 8px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); }
        .sl-ps-row i { width: 22px; height: 22px; border-radius: 8px; background: rgba(37,99,235,.28); flex-shrink: 0; }
        .sl-ps-row div { flex: 1; display: flex; flex-direction: column; gap: 4px; } .sl-ps-row b { height: 6px; width: 70%; border-radius: 4px; background: rgba(255,255,255,.22); } .sl-ps-row s { height: 5px; width: 45%; border-radius: 4px; background: rgba(255,255,255,.1); }
        .sl-ps-nav { margin-top: auto; display: flex; justify-content: space-around; padding: 9px 0 2px; border-top: 1px solid rgba(255,255,255,.07); }
        .sl-ps-nav i { width: 20px; height: 8px; border-radius: 5px; background: rgba(255,255,255,.14); } .sl-ps-nav i.on { background: #2563EB; width: 28px; }
        .sl-chip { position: absolute; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 99px; font-size: 11.5px; font-weight: 700; color: #fff; white-space: nowrap; background: rgba(12,20,48,.82); border: 1px solid rgba(255,255,255,.16); backdrop-filter: blur(10px); box-shadow: 0 14px 34px rgba(0,0,0,.45); }
        .sl-chip.c1 { right: -4px; top: 30px; left: auto; --r: -4deg; animation: slChip 5.5s ease-in-out infinite; color: #6EE7B7; }
        .sl-chip.c2 { left: -34px; top: 318px; --r: 3deg; animation: slChip 6.5s ease-in-out -2s infinite; color: #FDBA74; }

        /* mini kat */
        .sl-mini { padding: 14px 15px 13px; border-radius: 20px; color: #fff; background: linear-gradient(150deg, #0B1F55 0%, #1737A0 55%, #3B5FE0 110%); box-shadow: 0 1px 0 rgba(255,255,255,.2) inset, 0 22px 40px -14px rgba(0,0,0,.6); position: relative; overflow: hidden; }
        .sl-mini::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: linear-gradient(112deg, transparent 38%, rgba(255,255,255,.22) 50%, transparent 62%) 170% 0 / 260% 100% no-repeat; animation: slShine 6s ease-in-out 1s infinite; }
        .sl-mini-row { display: flex; justify-content: space-between; gap: 6px; font-size: 9.5px; font-weight: 700; } .sl-mini-row span { padding: 3px 8px; border-radius: 99px; background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.16); }
        .sl-mini-lab { margin-top: 14px; font-size: 10.5px; color: rgba(255,255,255,.72); font-weight: 600; }
        .sl-mini-amt { font-family: var(--disp); font-size: 36px; font-weight: 800; letter-spacing: -0.05em; line-height: 1.02; } .sl-mini-amt small { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; margin-left: 5px; letter-spacing: 0; color: rgba(255,255,255,.7); }
        .sl-mini-bar { margin-top: 12px; height: 5px; border-radius: 4px; background: rgba(255,255,255,.2); overflow: hidden; } .sl-mini-bar i { display: block; height: 100%; border-radius: 4px; background: #fff; animation: slBar 1.6s cubic-bezier(.2,.8,.2,1) .6s both; }
        .sl-mini-foot { margin-top: 7px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: rgba(255,255,255,.78); }
        .sl-mini.sm { padding: 11px 12px 10px; border-radius: 16px; } .sl-mini.sm .sl-mini-amt { font-size: 28px; } .sl-mini.sm .sl-mini-lab { margin-top: 9px; }

        /* fòm */
        .sl-form-side { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; padding: 32px 28px; background: #0A1226; }
        .sl-card { width: 100%; max-width: 392px; }
        .sl-card > * { animation: slFade .7s cubic-bezier(.2,.8,.2,1) both; }
        .sl-card > *:nth-child(2) { animation-delay: .07s } .sl-card > *:nth-child(3) { animation-delay: .14s } .sl-card > *:nth-child(4) { animation-delay: .21s } .sl-card > *:nth-child(5) { animation-delay: .28s } .sl-card > *:nth-child(n+6) { animation-delay: .35s }
        .sl-card h2 { font-family: var(--disp); font-size: 34px; font-weight: 800; letter-spacing: -0.045em; }
        .sl-card .sub { margin-top: 6px; font-size: 14px; color: #8FA0BD; line-height: 1.55; }
        .sl-label { display: block; font-size: 13px; font-weight: 700; color: #A9B6CE; margin-bottom: 7px; }
        .sl-input { width: 100%; padding: 14px 15px; border-radius: 14px; font-size: 16px; font-family: inherit; color: #EEF3FF; background: #0F1A38; border: 1.5px solid rgba(255,255,255,0.09); transition: border-color .15s, box-shadow .2s, transform .2s; }
        .sl-input::placeholder { color: #51607C; }
        .sl-input:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 4px rgba(37,99,235,0.2), 0 12px 28px -12px rgba(37,99,235,.5); transform: translateY(-1px); }
        .sl-input.bad { border-color: rgba(239,68,68,0.55); }
        .sl-input:disabled { opacity: .6; }
        .sl-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #8FA0BD; cursor: pointer; padding: 10px; display: flex; border-radius: 10px; }
        .sl-eye:hover { color: #EEF3FF; }
        .sl-btn { position: relative; overflow: hidden; margin-top: 8px; width: 100%; padding: 15px; border-radius: 14px; border: none; color: #fff; font-family: var(--disp); font-weight: 800; font-size: 16px; letter-spacing: -0.01em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; background: linear-gradient(135deg, #2563EB 0%, #3B5FE0 45%, #F97316 100%); box-shadow: 0 12px 30px rgba(37,99,235,0.38); transition: filter .15s, transform .12s, box-shadow .2s; }
        .sl-btn::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(110deg, transparent 38%, rgba(255,255,255,.34) 50%, transparent 62%) 170% 0 / 260% 100% no-repeat; animation: slShine 4.5s ease-in-out 1.4s infinite; }
        .sl-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-2px); box-shadow: 0 18px 38px rgba(37,99,235,0.45); }
        .sl-btn:active:not(:disabled) { transform: scale(0.99); }
        .sl-btn:disabled { cursor: not-allowed; box-shadow: none; }
        .sl-btn.loading { background: rgba(37,99,235,0.45); }
        .sl-btn.loading::after, .sl-btn.blocked::after { display: none; }
        .sl-btn.blocked { background: rgba(239,68,68,0.16); color: #F87171; border: 1px solid rgba(239,68,68,0.35); }
        .sl-hint { font-size: 12px; color: #FBBF24; margin-top: 7px; font-weight: 600; }
        .sl-mobile-brand { display: none; }
        .sl-powered { display: none; margin-top: 40px; text-align: center; font-size: 11.5px; color: #51607C; }
        .sl-help { margin-top: 22px; text-align: center; font-size: 13px; color: #8FA0BD; }

        /* panèl kont bloke */
        .sl-block { margin-bottom: 20px; padding: 18px 17px 16px; border-radius: 22px; background: linear-gradient(180deg, rgba(239,68,68,.14), rgba(239,68,68,.06)); border: 1px solid rgba(239,68,68,.4); box-shadow: 0 24px 50px -22px rgba(239,68,68,.45); animation: slShake .45s ease, slFade .6s ease both; }
        .sl-block-top { display: flex; align-items: center; gap: 15px; }
        .sl-lock { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
        .sl-lock i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(248,113,113,.7); animation: slRipple 2.2s ease-out infinite; }
        .sl-lock i + i { animation-delay: 1.1s; }
        .sl-lock span { position: absolute; inset: 0; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(145deg, #EF4444, #B91C1C); box-shadow: 0 10px 26px rgba(239,68,68,.5); }
        .sl-block h3 { font-family: var(--disp); font-size: 25px; font-weight: 800; letter-spacing: -0.04em; color: #FCA5A5; line-height: 1.05; }
        .sl-block .who { margin-top: 3px; font-size: 12.5px; color: #E6B4B4; font-weight: 600; }
        .sl-block-why { margin-top: 14px; font-size: 13.5px; line-height: 1.6; color: #F3CACA; } .sl-block-why b { color: #FCA5A5; }
        .sl-due { margin-top: 14px; display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 13px 15px; border-radius: 16px; background: rgba(0,0,0,.28); border: 1px solid rgba(239,68,68,.28); }
        .sl-due span { display: block; font-size: 11.5px; font-weight: 700; color: #E6B4B4; margin-bottom: 4px; }
        .sl-due strong { font-family: var(--disp); font-size: 38px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: #fff; } .sl-due strong small { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; margin-left: 6px; letter-spacing: 0; color: #FCA5A5; }
        .sl-due em { font-style: normal; font-size: 11.5px; font-weight: 800; color: #FCA5A5; padding: 5px 10px; border-radius: 99px; background: rgba(239,68,68,.18); border: 1px solid rgba(239,68,68,.4); }
        .sl-steps { list-style: none; margin: 15px 0 12px; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .sl-steps li { display: flex; gap: 11px; align-items: flex-start; font-size: 12.5px; line-height: 1.5; color: #E3C9C9; }
        .sl-steps b { width: 22px; height: 22px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--disp); font-size: 12px; color: #fff; background: rgba(239,68,68,.55); }
        .sl-pay { width: 100%; display: flex; align-items: center; gap: 11px; text-align: left; margin-bottom: 8px; padding: 10px 12px; border-radius: 14px; cursor: pointer; font-family: inherit; color: #EEF3FF; background: rgba(0,0,0,.26); border: 1px solid rgba(255,255,255,.1); transition: background .15s, transform .15s; }
        .sl-pay:hover { background: rgba(0,0,0,.4); transform: translateY(-1px); }
        .sl-pay > i { width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; }
        .sl-pay span { flex: 1; min-width: 0; } .sl-pay b { display: block; font-size: 13px; } .sl-pay em { font-style: normal; font-size: 11px; color: #A9B6CE; }
        .sl-pay code { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; } .sl-pay u { text-decoration: none; color: #A9B6CE; display: flex; }
        .sl-retry { margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 13px; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 13px; color: #FCA5A5; background: transparent; border: 1px solid rgba(239,68,68,.4); }
        .sl-retry:hover { background: rgba(239,68,68,.12); }

        :focus-visible { outline: 2px solid #60A5FA; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; } }
        @media (max-width: 1180px) { .sl-phone-wrap { display: none } }

        @media (max-width: 900px) {
          .sl-root { display: block; background: radial-gradient(520px 340px at 0% 0%, rgba(37,99,235,0.38) 0%, transparent 65%), radial-gradient(420px 300px at 100% 0%, rgba(249,115,22,0.16) 0%, transparent 60%), #060D20; }
          .sl-brand { display: none; }
          .sl-form-side { background: transparent; min-height: 100vh; min-height: 100dvh; align-items: flex-start; padding: 26px 20px 36px; }
          .sl-card { max-width: 440px; margin: 0 auto; }
          .sl-mobile-brand { display: block; margin: 6px 0 26px; }
          .sl-mobile-brand .sl-logo { margin-bottom: 22px; }
          .sl-mobile-brand h1 { font-family: var(--disp); font-size: clamp(30px, 8.6vw, 38px); font-weight: 800; letter-spacing: -0.05em; line-height: .98; }
          .sl-mobile-brand h1 em { font-style: normal; background: linear-gradient(100deg, #7FA5FF, #FDBA74); -webkit-background-clip: text; background-clip: text; color: transparent; }
          .sl-mobile-brand p { margin-top: 10px; font-size: 14.5px; color: #A9B6CE; line-height: 1.6; }
          .sl-mobile-card { margin-top: 22px; width: 78%; max-width: 300px; margin-left: auto; margin-right: 6px; animation: slSway 8s ease-in-out infinite; transform-origin: 50% 60%; }
          .sl-powered { display: block; }
          .sl-card h2, .sl-card .sub.desk { display: none; }
        }
      `}</style>

      <div className="sl-orb a" aria-hidden="true" />
      <div className="sl-orb b" aria-hidden="true" />

      {/* Pano mak (desktop) */}
      <aside className="sl-brand">
        <svg className="sl-art" viewBox="0 0 720 720" fill="none" aria-hidden="true">
          {[120, 200, 280, 360].map((r, i) => <circle key={r} cx="360" cy="360" r={r} stroke="#fff" strokeOpacity={0.11 - i * 0.02} strokeWidth="1.5" />)}
          <circle cx="360" cy="0" r="10" fill="#F97316" /><circle cx="640" cy="440" r="7" fill="#60A5FA" /><circle cx="150" cy="560" r="7" fill="#fff" fillOpacity=".5" />
        </svg>
        <div className="sl-logo">
          <div className="sl-logo-mark"><BrandIcon size={28} /></div>
          <div><b>Sabotay Inove</b><span>Kont Sòl</span></div>
        </div>
        <div className="sl-hero">
          <h1>Sòl ou, <em>klè nan men w.</em></h1>
          <p className="lead">Swiv chak peman, wè dat ou ap touche, epi pale ak lòt manm yo, tout nan yon sèl kote.</p>
          <div className="sl-points">
            {POINTS.map(({ Icon, title, sub }) => (
              <div className="sl-point" key={title}>
                <i><Icon size={18} /></i>
                <div><b>{title}</b><span>{sub}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="sl-foot">Powered by plusgroupe.com</div>
        <PhoneMockup />
      </aside>

      {/* Fòm */}
      <main className="sl-form-side">
        <div className="sl-card">
          <div className="sl-mobile-brand">
            <div className="sl-logo">
              <div className="sl-logo-mark"><BrandIcon size={28} /></div>
              <div><b>Sabotay Inove</b><span>Kont Sòl</span></div>
            </div>
            <h1>Sòl ou, <em>klè nan men w.</em></h1>
            <p>Konekte pou wè peman ou yo ak dat ou ap touche.</p>
            {!block && <div className="sl-mobile-card" aria-hidden="true"><MiniCard /></div>}
          </div>

          <h2>Konekte</h2>
          <p className="sub desk" style={{ marginBottom: 26 }}>Antre non itilizatè ak modpas ou responsab sòl la ban ou.</p>

          {block && <BlockedPanel info={block} onRetry={clearBlock} />}

          {!block && (
            <form onSubmit={handleLogin} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label className="sl-label" htmlFor="sl-user">Non itilizatè</label>
                <input id="sl-user" type="text" className="sl-input"
                  value={form.username} placeholder="egz: marie0001"
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" disabled={loading} />
              </div>

              <div style={{ marginBottom: 6 }}>
                <label className="sl-label" htmlFor="sl-pass">Modpas</label>
                <div style={{ position: 'relative' }}>
                  <input id="sl-pass" type={showPass ? 'text' : 'password'} className="sl-input"
                    style={{ paddingRight: 50 }} value={form.password} placeholder="••••••"
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    onKeyDown={onKey} onKeyUp={onKey} autoComplete="current-password" disabled={loading} />
                  <button type="button" className="sl-eye" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Kache modpas' : 'Montre modpas'}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {caps && <p className="sl-hint">Majiskil aktive (Caps Lock).</p>}
              </div>

              <button type="submit" className={`sl-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading
                  ? <span style={{ width: 17, height: 17, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'slSpin .8s linear infinite' }} />
                  : <LogIn size={17} />}
                {loading ? 'Ap verifye…' : 'Konekte'}
              </button>
            </form>
          )}

          <p className="sl-help">Pa gen kont? Kontakte responsab sòl ou a.</p>
          <p className="sl-powered">Powered by plusgroupe.com</p>
        </div>
      </main>
    </div>
  )
}
