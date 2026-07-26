// src/pages/agent/AgentLoginPage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, ArrowLeft, ShieldCheck } from 'lucide-react'
import { agentApi, setAgent } from '../../services/agentApi'
import PromoCarousel from '../../components/agent/PromoCarousel'

const LOGO_URL = '/assets/logo.webp'

const C = {
  navy: '#0F172A', orange: '#F97316', orangeDark: '#EA580C',
  white: '#FFFFFF', bg: '#F1F5F9', blue: '#2563EB', danger: '#EF4444',
  border: '#E2E8F0', textMuted: '#64748B'
}

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 860)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 860)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
  background: C.white, border: `1.5px solid ${C.border}`, color: C.navy, fontSize: 15, outline: 'none', fontFamily: 'inherit'
}
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }

export default function AgentLoginPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email ak modpas obligatwa.'); return }
    setLoading(true)
    try {
      const res = await agentApi.post('/agents/login', { email, password })
      setAgent(res.data.token, res.data.agent)
      navigate('/agent/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Idantifyan pa kòrèk.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={LOGO_URL} alt="Plus Group" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.navy }}>PLUS <span style={{ color: C.orange }}>GROUP</span></h1>
          <p style={{ margin: 0, fontSize: 10, color: C.textMuted, fontWeight: 600 }}>Inovasyon • Konfyans • Rezilta</p>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <PromoCarousel maxWidth={380} height={420} />
        </div>
        <div style={{ width: '100%', maxWidth: 420, background: C.white, borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(15,23,42,0.06)', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogIn size={20} color={C.orange} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>Pòtal Ajan</h2>
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>Konekte pou wè dashboard ou</p>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.danger, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Modpas</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '13px', borderRadius: 10, border: 'none',
              background: loading ? '#94A3B8' : `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`,
              color: C.white, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? 'Ap konekte...' : 'Konekte'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20, fontSize: 11, color: C.textMuted }}>
            <ShieldCheck size={13} color={C.blue} /> Koneksyon sekirize
          </div>

          <Link to="/agent/apply" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 14, color: C.textMuted, fontSize: 12, textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Poko yon ajan? Aplike isit la
          </Link>
        </div>
      </div>
    </div>
  )
}
