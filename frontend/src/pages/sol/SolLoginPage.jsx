// src/pages/sol/SolLoginPage.jsx
// Pòtal koneksyon pou manm Sabotay Sol — imaj branding "Sabotay Inove" kòm background
// Wout: /app/sol/login
//
// ⚠️ Mete imaj la nan: public/images/sabotay-login-bg.png (menm imaj ou te voye a)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Lock } from 'lucide-react'

const D = {
  blue:    '#2563EB',
  blueLt:  '#60A5FA',
  orange:  '#F97316',
  brandBtn:'linear-gradient(135deg,#2563EB 0%,#3B5FE0 45%,#F97316 100%)',
  text:    '#F5F7FA',
  muted:   '#8FA0BD',
  input:   'rgba(5,11,24,0.55)',
  red:     '#EF4444',
  redBg:   'rgba(239,68,68,0.14)',
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
    width: '100%', padding: '13px 14px', borderRadius: 12, fontSize: 15,
    border: `1.5px solid rgba(255,255,255,0.14)`, outline: 'none',
    color: D.text, background: D.input, fontFamily: 'inherit',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
    backdropFilter: 'blur(6px)',
  }

  return (
    <div className="sabotay-login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .sabotay-login-root {
          min-height: 100vh;
          display: flex; align-items: flex-start; justify-content: flex-end;
          font-family: 'DM Sans', sans-serif;
          background-image:
            linear-gradient(90deg, rgba(2,6,15,0.15) 0%, rgba(2,6,15,0.05) 45%, rgba(2,6,15,0.35) 100%),
            url('/images/sabotay-login-bg.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          padding: 24px 8vw;
          box-sizing: border-box;
          /* ✅ FIX: pèmèt paj la defile (web AK mobil) si kontni pi wo pase ekran an —
             align-items:flex-start + margin:auto sou kad la santre l san l pa janm
             koupe tèt li lè li pa antre nan wotè ekran an. */
          overflow-y: auto;
        }
        .sabotay-login-card { margin: auto 0; }

        /* Sou selil laj (desktop/tablèt), fòm nan pran plas nan pano vid a dwat la */
        @media (min-width: 861px) {
          .sabotay-login-root { justify-content: flex-end; padding-right: 9%; }
        }

        /* Sou mobil, itilize imaj vètikal (pòtrè) ki fèt SPESYALMAN pou telefòn,
           kad fòm nan poze nan espas vid anba "KONT SOL & SABOTAY" a */
        @media (max-width: 860px) {
          .sabotay-login-root {
            justify-content: center;
            background-image:
              linear-gradient(180deg, rgba(2,6,15,0.05) 60%, rgba(2,6,15,0.25) 100%),
              url('/images/sabotay-login-bg-mobile.png');
            background-position: top center;
            background-size: cover;
            padding: 20px 18px 32px;
          }
          .sabotay-login-card { width: 100%; max-width: 420px; margin: 58vh auto 20px; }
        }

        /* Sou ti ekran byen etwat, kad la ka bezwen pi plis espas anwo pou
           kontni an pa kole tèt anba tèks logo/tit la */
        @media (max-width: 420px) {
          .sabotay-login-root { padding-top: 24px; }
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        input::placeholder { color: rgba(255,255,255,0.35) }
        input:focus { border-color: rgba(37,99,235,0.6) !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .sabotay-login-btn:hover:not(:disabled) { filter: brightness(1.08); }
      `}</style>

      <div className="sabotay-login-card" style={{ width: '100%', maxWidth: 340, animation: 'fadeUp 0.45s ease' }}>

        {/* ✅ Alèt blokaj */}
        {blocked && (
          <div style={{
            background: D.redBg, border: `1px solid rgba(239,68,68,0.4)`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 14,
            display: 'flex', alignItems: 'flex-start', gap: 10,
            animation: 'shake 0.4s ease', backdropFilter: 'blur(6px)',
          }}>
            <Lock size={18} style={{ color: D.red, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: D.red, margin: '0 0 3px' }}>
                Kont Bloke
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
                {blockMsg}
              </p>
            </div>
          </div>
        )}

        {/* Fòm nan — kad vit sou imaj la, san w pa repete logo/tit la */}
        <div style={{
          background: 'rgba(5,11,24,0.42)',
          border: `1px solid ${blocked ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.14)'}`,
          borderRadius: 20, padding: '22px 22px 24px',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 16px 44px rgba(0,0,0,0.35)',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: D.blueLt, margin: '0 0 16px',
            textTransform: 'uppercase', letterSpacing: '0.14em', textAlign: 'center',
          }}>
            Konekte nan Kont Sol Ou
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Username */}
            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                color: D.blueLt, marginBottom: 5,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Non Itilizatè</label>
              <input
                type="text"
                style={{ ...inp, borderColor: blocked ? 'rgba(239,68,68,0.35)' : undefined }}
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
                display: 'block', fontSize: 10, fontWeight: 700,
                color: D.blueLt, marginBottom: 5,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Modpas</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  style={{ ...inp, paddingRight: 42, borderColor: blocked ? 'rgba(239,68,68,0.35)' : undefined }}
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
                    position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: D.muted,
                    padding: 4, display: 'flex',
                  }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Bouton login */}
            <button
              className="sabotay-login-btn"
              onClick={handleLogin}
              disabled={loading || blocked}
              style={{
                marginTop: 4, padding: '13px', borderRadius: 12, border: 'none',
                background: blocked
                  ? 'rgba(239,68,68,0.18)'
                  : loading
                    ? 'rgba(37,99,235,0.35)'
                    : D.brandBtn,
                color: blocked ? D.red : '#fff',
                fontWeight: 800, fontSize: 14,
                cursor: (loading || blocked) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: (loading || blocked) ? 'none' : '0 6px 20px rgba(37,99,235,0.3)',
                transition: 'all 0.2s',
              }}>
              {loading
                ? <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : blocked
                  ? <Lock size={15} />
                  : <LogIn size={15} />}
              {loading ? 'Ap verifye...' : blocked ? 'Kont Bloke' : 'Konekte'}
            </button>

          </div>

          <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
            Pa gen kont? Kontakte responsab sol ou a.
          </p>
        </div>
      </div>
    </div>
  )
}
