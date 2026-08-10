// src/pages/sol/SolLoginPage.jsx
// Pòtal koneksyon pou manm Sabotay Sol — branding "Sabotay Inove" (Plus Group)
// Wout: /app/sol/login

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Lock, Shield, BarChart3, Zap } from 'lucide-react'

// ── Tokens: idantite "Sabotay Inove" (ble + oranj sou fon navy prèske nwa) ──
const D = {
  bg:      '#050B18',
  card:    '#0B1526',
  border:  'rgba(37,99,235,0.22)',
  blue:    '#2563EB',
  blueLt:  '#60A5FA',
  orange:  '#F97316',
  brandBtn:'linear-gradient(135deg,#2563EB 0%,#3B5FE0 45%,#F97316 100%)',
  text:    '#F5F7FA',
  muted:   '#6B7A99',
  mutedLt: '#8FA0BD',
  input:   '#050B18',
  red:     '#EF4444',
  redBg:   'rgba(239,68,68,0.10)',
}

const FEATURES = [
  { icon: Shield,    label: 'Sekirite avanse' },
  { icon: BarChart3, label: 'Rapò an detay'   },
  { icon: Zap,       label: 'Rezilta rapid'   },
]

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

// ── Badge sikilè: ti graf + flèch, tankou ikòn "Sabotay Inove" a ──
function BrandBadge({ blocked }) {
  return (
    <div style={{
      width: 'clamp(60px, 16vw, 76px)', height: 'clamp(60px, 16vw, 76px)',
      borderRadius: '50%', margin: '0 auto 18px', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: blocked
        ? 'radial-gradient(circle at 35% 30%, rgba(239,68,68,0.16) 0%, #0B1526 72%)'
        : 'radial-gradient(circle at 35% 30%, rgba(37,99,235,0.20) 0%, #0B1526 72%)',
      boxShadow: blocked
        ? '0 0 0 1.5px rgba(239,68,68,0.4), 0 10px 34px rgba(239,68,68,0.28)'
        : '0 0 0 1.5px rgba(37,99,235,0.35), 0 10px 34px rgba(249,115,22,0.22)',
      transition: 'all 0.3s',
    }}>
      {blocked ? (
        <Lock size={26} color={D.red} />
      ) : (
        <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
          <rect x="4"  y="20" width="5" height="12" rx="1.4" fill={D.blue} />
          <rect x="12" y="13" width="5" height="19" rx="1.4" fill={D.blueLt} />
          <rect x="20" y="7"  width="5" height="25" rx="1.4" fill="#93C5FD" />
          <path d="M5 23 L15 16 L23 10 L31 4" stroke={D.orange} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M23 4 L31 4 L31 12" stroke={D.orange} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </div>
  )
}

export default function SolLoginPage() {
  const navigate = useNavigate()
  const [form,     setForm]     = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [blocked,  setBlocked]  = useState(false)
  const [blockMsg, setBlockMsg] = useState('')

  // ✅ Si manm gen deja yon sesyon aktif, redirijé dirèkteman
  useEffect(() => {
    const token = localStorage.getItem('sol_token')
    if (token) navigate('/app/sol/dashboard', { replace: true })
  }, [navigate])

  const handleLogin = async () => {
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
      const data = await res.json()

      // ✅ FIX: Detekte blokaj (403) — montre mesaj espesyal, pa kite konekte
      if (res.status === 403 && data.blocked) {
        setBlocked(true)
        setBlockMsg(data.message || '🔒 Kont ou bloke. Kontakte admin pou debloke l.')
        return
      }

      if (!res.ok) throw new Error(data.message || 'Erè koneksyon')

      // Sove token + info manm
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

  const inp = {
    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15,
    border: `1.5px solid rgba(255,255,255,0.09)`, outline: 'none',
    color: D.text, background: D.input, fontFamily: 'inherit',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  }

  return (
    <div className="sabotay-login-root" style={{
      minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'DM Sans, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        input::placeholder { color: #2a3a54 }
        input:focus { border-color: rgba(37,99,235,0.55) !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .sabotay-login-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .sabotay-feature-row { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; }
        @media (max-width: 380px) {
          .sabotay-feature-row { gap: 14px; }
        }
      `}</style>

      {/* Fon ambyans: 2 glo (ble anwo goch, oranj anba adwat) tankou vizyèl la */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 620px 420px at 8% -4%, rgba(37,99,235,0.20) 0%, transparent 60%), radial-gradient(ellipse 560px 460px at 96% 104%, rgba(249,115,22,0.14) 0%, transparent 62%)',
      }} />

      <div style={{ width: '100%', maxWidth: 408, position: 'relative', animation: 'fadeUp 0.4s ease' }}>

        {/* Wordmark / Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <BrandBadge blocked={blocked} />
          <h1 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 'clamp(20px, 5.5vw, 24px)', fontWeight: 800,
            letterSpacing: '0.01em', margin: '0 0 4px', lineHeight: 1.15,
          }}>
            <span style={{ color: '#fff' }}>SABOTAY </span>
            <span style={{ color: D.orange }}>INOVE</span>
          </h1>
          <p style={{
            fontSize: 11, fontWeight: 700, color: D.blueLt, margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.14em',
          }}>
            Kont Sol &amp; Sabotay
          </p>
          <p style={{ fontSize: 13, color: D.mutedLt, margin: 0 }}>
            Konekte pou wè kont sabotay ou a
          </p>
        </div>

        {/* ✅ Alèt blokaj */}
        {blocked && (
          <div style={{
            background: D.redBg, border: `1px solid rgba(239,68,68,0.35)`,
            borderRadius: 14, padding: '16px 18px', marginBottom: 18,
            display: 'flex', alignItems: 'flex-start', gap: 12,
            animation: 'shake 0.4s ease',
          }}>
            <Lock size={20} style={{ color: D.red, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: D.red, margin: '0 0 4px' }}>
                Kont Bloke
              </p>
              <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.85)', margin: 0, lineHeight: 1.6 }}>
                {blockMsg}
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{
          background: D.card,
          border: `1px solid ${blocked ? 'rgba(239,68,68,0.3)' : D.border}`,
          borderRadius: 20, padding: '28px 24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          transition: 'border-color 0.3s',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Username */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: D.blueLt, marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Non Itilizatè</label>
              <input
                type="text"
                style={{ ...inp, borderColor: blocked ? 'rgba(239,68,68,0.3)' : undefined }}
                value={form.username}
                onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setBlocked(false) }}
                placeholder="ex: marie0001"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: D.blueLt, marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Modpas</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  style={{ ...inp, paddingRight: 44, borderColor: blocked ? 'rgba(239,68,68,0.3)' : undefined }}
                  value={form.password}
                  onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setBlocked(false) }}
                  placeholder="••••••"
                  autoComplete="current-password"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                />
                <button
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: D.muted,
                    padding: 4, display: 'flex',
                  }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Bouton login */}
            <button
              className="sabotay-login-btn"
              onClick={handleLogin}
              disabled={loading || blocked}
              style={{
                marginTop: 4, padding: '14px', borderRadius: 12, border: 'none',
                background: blocked
                  ? 'rgba(239,68,68,0.15)'
                  : loading
                    ? 'rgba(37,99,235,0.35)'
                    : D.brandBtn,
                color: blocked ? D.red : '#fff',
                fontWeight: 800, fontSize: 15,
                cursor: (loading || blocked) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: (loading || blocked) ? 'none' : '0 6px 20px rgba(37,99,235,0.28)',
                transition: 'all 0.2s',
              }}>
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : blocked
                  ? <Lock size={16} />
                  : <LogIn size={16} />}
              {loading ? 'Ap verifye...' : blocked ? 'Kont Bloke — Kontakte Admin' : 'Konekte'}
            </button>

          </div>
        </div>

        {/* Trè-konfyans: 3 pwen fò yo, tankou nan bannyè a */}
        <div className="sabotay-feature-row" style={{ marginTop: 26 }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 84 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} style={{ color: D.blueLt }} />
              </div>
              <span style={{ fontSize: 10, color: D.mutedLt, textAlign: 'center', lineHeight: 1.3, fontWeight: 600 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: D.muted, marginTop: 26 }}>
          Pa gen kont? Kontakte responsab sol ou a.
        </p>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(107,122,153,0.55)', marginTop: 8 }}>
          Pwodwi pa PlusGroup • +509 4244 9024
        </p>
      </div>
    </div>
  )
}