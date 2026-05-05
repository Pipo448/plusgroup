// src/pages/sol/SolLoginPage.jsx
// Pòtal koneksyon pou manm Sabotay Sol
// Wout: /app/sol/login

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, Eye, EyeOff, LogIn, Lock } from 'lucide-react'

const D = {
  bg:      '#060f1e',
  card:    '#0d1b2a',
  border:  'rgba(201,168,76,0.18)',
  gold:    '#C9A84C',
  goldBtn: 'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim: 'rgba(201,168,76,0.10)',
  text:    '#e8eaf0',
  muted:   '#6b7a99',
  input:   '#060f1e',
  red:     '#e74c3c',
  redBg:   'rgba(231,76,60,0.10)',
  green:   '#27ae60',
}

const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'

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
    <div style={{
      minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'DM Sans, sans-serif',
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        input::placeholder { color: #2a3a54 }
        input:focus { border-color: rgba(201,168,76,0.5) !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.4s ease' }}>

        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: blocked ? 'rgba(231,76,60,0.2)' : D.goldBtn,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: blocked ? '0 8px 32px rgba(231,76,60,0.3)' : '0 8px 32px rgba(201,168,76,0.3)',
            transition: 'all 0.3s',
          }}>
            {blocked
              ? <Lock size={28} color={D.red} />
              : <Users size={28} color="#0a1222" />}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
            Kont Sol Ou
          </h1>
          <p style={{ fontSize: 13, color: D.muted, margin: 0 }}>
            Konekte pou wè kont sabotay ou a
          </p>
        </div>

        {/* ✅ Alèt blokaj */}
        {blocked && (
          <div style={{
            background: D.redBg, border: `1px solid rgba(231,76,60,0.35)`,
            borderRadius: 14, padding: '16px 18px', marginBottom: 18,
            display: 'flex', alignItems: 'flex-start', gap: 12,
            animation: 'shake 0.4s ease',
          }}>
            <Lock size={20} style={{ color: D.red, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: D.red, margin: '0 0 4px' }}>
                Kont Bloke
              </p>
              <p style={{ fontSize: 12, color: 'rgba(231,76,60,0.8)', margin: 0, lineHeight: 1.6 }}>
                {blockMsg}
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{
          background: D.card,
          border: `1px solid ${blocked ? 'rgba(231,76,60,0.3)' : D.border}`,
          borderRadius: 20, padding: '28px 24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Username */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(201,168,76,0.75)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Non Itilizatè</label>
              <input
                type="text"
                style={{ ...inp, borderColor: blocked ? 'rgba(231,76,60,0.3)' : undefined }}
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
                color: 'rgba(201,168,76,0.75)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Modpas</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  style={{ ...inp, paddingRight: 44, borderColor: blocked ? 'rgba(231,76,60,0.3)' : undefined }}
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
              onClick={handleLogin}
              disabled={loading || blocked}
              style={{
                marginTop: 4, padding: '14px', borderRadius: 12, border: 'none',
                background: blocked
                  ? 'rgba(231,76,60,0.15)'
                  : loading
                    ? 'rgba(201,168,76,0.3)'
                    : D.goldBtn,
                color: blocked ? D.red : '#0a1222',
                fontWeight: 900, fontSize: 15,
                cursor: (loading || blocked) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: (loading || blocked) ? 'none' : '0 4px 16px rgba(201,168,76,0.3)',
                transition: 'all 0.2s',
              }}>
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : blocked
                  ? <Lock size={16} />
                  : <LogIn size={16} />}
              {loading ? 'Ap verifye...' : blocked ? 'Kont Bloke — Kontakte Admin' : 'Konekte'}
            </button>

          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: D.muted, marginTop: 24 }}>
          Pa gen kont? Kontakte responsab sol ou a.
        </p>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(107,122,153,0.5)', marginTop: 8 }}>
          Pwodwi pa PlusGroup • +509 4244 9024
        </p>
      </div>
    </div>
  )
}