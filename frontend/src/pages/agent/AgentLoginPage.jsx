// src/pages/agent/AgentLoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, ArrowLeft } from 'lucide-react'
import { agentApi, setAgent } from '../../lib/agentApi'

const iStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 15, fontFamily: 'DM Sans', outline: 'none'
}
const labelStyle = {
  display: 'block', color: 'rgba(201,168,76,0.7)', fontSize: 10, fontWeight: 700,
  marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Sans'
}

export default function AgentLoginPage() {
  const navigate = useNavigate()
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0a0f16, #111827)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #C9A84C 40%, #8B0000 70%, transparent)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #C9A84C, #f0d080)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogIn size={20} color="#0f1923" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display'" }}>Pòtal Ajan</h1>
            <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: 11, margin: 0 }}>PLUS GROUP — AGENT LOGIN</p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#E8836A', fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" style={iStyle} />
          </div>
          <div>
            <label style={labelStyle}>Modpas</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={iStyle} />
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: 8, padding: '13px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #8B0000, #C0392B 50%, #C9A84C)',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer'
          }}>
            {loading ? 'Ap konekte...' : 'Konekte'}
          </button>
        </form>

        <Link to="/agent/apply" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20, color: '#64748b', fontSize: 12, textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Poko yon ajan? Aplike isit la
        </Link>
      </div>
    </div>
  )
}
