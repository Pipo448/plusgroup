// src/pages/sol/SolLoginPage.jsx
// Pòtal koneksyon pou manm Sabotay Sol — nouvo design "Sabotay Inove"
// Wout: /app/sol/login
//
// ✅ Design 100% nan kòd (SVG + CSS): pa bezwen imaj background ankò
//    (public/images/sabotay-login-bg*.png pa itilize ankò — paj la chaje pi vit, menm sou done mobil).

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Lock, TrendingUp, Bell, Trophy } from 'lucide-react'

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

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

export default function SolLoginPage() {
  const navigate = useNavigate()
  const [form,     setForm]     = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [blocked,  setBlocked]  = useState(false)
  const [blockMsg, setBlockMsg] = useState('')
  const [caps,     setCaps]     = useState(false)

  // Si manm gen deja yon sesyon aktif, redirije dirèkteman
  useEffect(() => {
    const token = localStorage.getItem('sol_token')
    if (token) navigate('/app/sol/dashboard', { replace: true })
  }, [navigate])

  const handleLogin = async (e) => {
    e?.preventDefault?.()
    if (loading) return
    if (!form.username || !form.password) {
      return toast.error('Antre non itilizatè ak modpas ou.')
    }
    setLoading(true)
    setBlocked(false)
    setBlockMsg('')
    try {
      const res = await fetch(`${SOL_API}/api/sol/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim().toLowerCase(), password: form.password }),
      })
      const data = await res.json().catch(() => ({}))

      // Blokaj (403) — montre mesaj espesyal, pa kite konekte
      if (res.status === 403 && data.blocked) {
        setBlocked(true)
        setBlockMsg((data.message || 'Kont ou bloke. Kontakte admin pou debloke l.').replace(/^\s*🔒\s*/, ''))
        return
      }
      if (!res.ok) throw new Error(data.message || 'Erè koneksyon')

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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .sl-root { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #EEF3FF; background: #050A18; -webkit-font-smoothing: antialiased; }
        .sl-brand { position: relative; overflow: hidden; padding: 48px 56px; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(900px 560px at 0% 0%, rgba(37,99,235,0.42) 0%, transparent 62%), radial-gradient(700px 480px at 100% 100%, rgba(249,115,22,0.22) 0%, transparent 60%), #060D20; isolation: isolate; }
        .sl-art { position: absolute; z-index: -1; right: -180px; bottom: -200px; width: 720px; height: 720px; pointer-events: none; }
        .sl-logo { display: flex; align-items: center; gap: 13px; }
        .sl-logo-mark { width: 46px; height: 46px; border-radius: 15px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 32% 28%, rgba(37,99,235,0.4) 0%, #0A1330 76%); box-shadow: 0 0 0 1px rgba(96,165,250,0.35); }
        .sl-logo b { display: block; font-size: 17px; font-weight: 800; letter-spacing: -0.02em; }
        .sl-logo span { font-size: 12.5px; color: #8FA0BD; }
        .sl-hero h1 { font-size: clamp(34px, 4.2vw, 54px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.04; max-width: 11em; }
        .sl-hero p.lead { margin-top: 16px; font-size: 16px; line-height: 1.65; color: #A9B6CE; max-width: 30em; }
        .sl-points { margin-top: 34px; display: flex; flex-direction: column; gap: 16px; }
        .sl-point { display: flex; align-items: flex-start; gap: 14px; }
        .sl-point i { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #7FA5FF; background: rgba(37,99,235,0.16); border: 1px solid rgba(96,165,250,0.25); }
        .sl-point b { display: block; font-size: 14.5px; font-weight: 700; }
        .sl-point span { font-size: 13px; color: #8FA0BD; }
        .sl-foot { font-size: 12px; color: #6B7B96; }
        .sl-form-side { display: flex; align-items: center; justify-content: center; padding: 32px 28px; background: #0A1226; }
        .sl-card { width: 100%; max-width: 392px; animation: slFade .5s ease both; }
        .sl-card h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
        .sl-card .sub { margin-top: 6px; font-size: 14px; color: #8FA0BD; line-height: 1.55; }
        .sl-label { display: block; font-size: 13px; font-weight: 700; color: #A9B6CE; margin-bottom: 7px; }
        .sl-input { width: 100%; padding: 14px 15px; border-radius: 14px; font-size: 16px; font-family: inherit; color: #EEF3FF; background: #0F1A38; border: 1.5px solid rgba(255,255,255,0.09); transition: border-color .15s, box-shadow .15s; }
        .sl-input::placeholder { color: #51607C; }
        .sl-input:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 4px rgba(37,99,235,0.2); }
        .sl-input.bad { border-color: rgba(239,68,68,0.55); }
        .sl-input:disabled { opacity: .6; }
        .sl-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #8FA0BD; cursor: pointer; padding: 10px; display: flex; border-radius: 10px; }
        .sl-eye:hover { color: #EEF3FF; }
        .sl-btn { margin-top: 8px; width: 100%; padding: 15px; border-radius: 14px; border: none; color: #fff; font-family: inherit; font-weight: 800; font-size: 15.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; background: linear-gradient(135deg, #2563EB 0%, #3B5FE0 45%, #F97316 100%); box-shadow: 0 10px 28px rgba(37,99,235,0.35); transition: filter .15s, transform .1s; }
        .sl-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .sl-btn:active:not(:disabled) { transform: scale(0.99); }
        .sl-btn:disabled { cursor: not-allowed; box-shadow: none; }
        .sl-btn.loading { background: rgba(37,99,235,0.45); }
        .sl-btn.blocked { background: rgba(239,68,68,0.16); color: #F87171; border: 1px solid rgba(239,68,68,0.35); }
        .sl-alert { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; padding: 14px 15px; border-radius: 16px; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.38); animation: slShake .4s ease; }
        .sl-alert b { display: block; font-size: 13.5px; color: #F87171; margin-bottom: 3px; }
        .sl-alert span { font-size: 12.5px; color: #E6B4B4; line-height: 1.55; }
        .sl-hint { font-size: 12px; color: #FBBF24; margin-top: 7px; font-weight: 600; }
        .sl-mobile-brand { display: none; }
        .sl-powered { display: none; margin-top: 40px; text-align: center; font-size: 11.5px; color: #51607C; }
        .sl-help { margin-top: 22px; text-align: center; font-size: 13px; color: #8FA0BD; }
        @keyframes slFade { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes slShake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-7px) } 40%,80% { transform: translateX(7px) } }
        @keyframes slSpin { to { transform: rotate(360deg) } }
        :focus-visible { outline: 2px solid #60A5FA; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: .001ms !important; } }

        @media (max-width: 900px) {
          .sl-root { display: block; background: radial-gradient(520px 340px at 0% 0%, rgba(37,99,235,0.38) 0%, transparent 65%), radial-gradient(420px 300px at 100% 0%, rgba(249,115,22,0.16) 0%, transparent 60%), #060D20; }
          .sl-brand { display: none; }
          .sl-form-side { background: transparent; min-height: 100vh; min-height: 100dvh; align-items: flex-start; padding: 28px 20px 36px; }
          .sl-card { max-width: 440px; margin: 0 auto; }
          .sl-mobile-brand { display: block; margin: 8px 0 30px; }
          .sl-mobile-brand .sl-logo { margin-bottom: 26px; }
          .sl-mobile-brand h1 { font-size: 31px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.08; }
          .sl-mobile-brand p { margin-top: 10px; font-size: 14.5px; color: #A9B6CE; line-height: 1.6; }
          .sl-powered { display: block; }
          .sl-card h2 { display: none; }
          .sl-card .sub.desk { display: none; }
        }
      `}</style>

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
          <h1>Sòl ou, klè nan men w.</h1>
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
      </aside>

      {/* Fòm */}
      <main className="sl-form-side">
        <div className="sl-card">
          <div className="sl-mobile-brand">
            <div className="sl-logo">
              <div className="sl-logo-mark"><BrandIcon size={28} /></div>
              <div><b>Sabotay Inove</b><span>Kont Sòl</span></div>
            </div>
            <h1>Sòl ou, klè nan men w.</h1>
            <p>Konekte pou wè peman ou yo ak dat ou ap touche.</p>
          </div>

          <h2>Konekte</h2>
          <p className="sub desk" style={{ marginBottom: 26 }}>Antre non itilizatè ak modpas ou responsab sòl la ban ou.</p>

          {blocked && (
            <div className="sl-alert" role="alert">
              <Lock size={19} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
              <div><b>Kont bloke</b><span>{blockMsg}</span></div>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label className="sl-label" htmlFor="sl-user">Non itilizatè</label>
              <input id="sl-user" type="text" className={`sl-input ${blocked ? 'bad' : ''}`}
                value={form.username} placeholder="egz: marie0001" autoFocus
                onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setBlocked(false) }}
                autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" disabled={loading} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="sl-label" htmlFor="sl-pass">Modpas</label>
              <div style={{ position: 'relative' }}>
                <input id="sl-pass" type={showPass ? 'text' : 'password'} className={`sl-input ${blocked ? 'bad' : ''}`}
                  style={{ paddingRight: 50 }} value={form.password} placeholder="••••••"
                  onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setBlocked(false) }}
                  onKeyDown={onKey} onKeyUp={onKey} autoComplete="current-password" disabled={loading} />
                <button type="button" className="sl-eye" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Kache modpas' : 'Montre modpas'}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {caps && <p className="sl-hint">Majiskil aktive (Caps Lock).</p>}
            </div>

            <button type="submit" className={`sl-btn ${loading ? 'loading' : ''} ${blocked ? 'blocked' : ''}`} disabled={loading || blocked}>
              {loading
                ? <span style={{ width: 17, height: 17, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'slSpin .8s linear infinite' }} />
                : blocked ? <Lock size={17} /> : <LogIn size={17} />}
              {loading ? 'Ap verifye…' : blocked ? 'Kont bloke' : 'Konekte'}
            </button>
          </form>

          <p className="sl-help">Pa gen kont? Kontakte responsab sòl ou a.</p>
          <p className="sl-powered">Powered by plusgroupe.com</p>
        </div>
      </main>
    </div>
  )
}
