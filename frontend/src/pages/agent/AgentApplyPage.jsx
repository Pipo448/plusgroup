// src/pages/agent/AgentApplyPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, CheckCircle2, ArrowLeft } from 'lucide-react'
import { agentApi } from '../../services/agentApi'

const iStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 15, fontFamily: 'DM Sans', outline: 'none'
}
const labelStyle = {
  display: 'block', color: 'rgba(201,168,76,0.7)', fontSize: 10, fontWeight: 700,
  marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Sans'
}

export default function AgentApplyPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.fullName || !form.email || !form.phone || !form.city) {
      setError('Non, email, telefòn ak vil obligatwa.')
      return
    }
    setLoading(true)
    try {
      await agentApi.post('/agents/apply', form)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Erè pandan soumèt kandidati a.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0a0f16, #111827)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #C9A84C 40%, #8B0000 70%, transparent)' }} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={48} color="#27ae60" style={{ marginBottom: 16 }} />
            <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 10, fontFamily: "'Playfair Display'" }}>Kandidati Voye!</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
              Mèsi pou enterè w nan vin Ajan Plus Group. Ekip nou an ap egzamine kandidati w la
              e n ap kontakte w pi vit posib pou konfime si w kalifye.
            </p>
            <Link to="/agent" style={{ display: 'inline-block', marginTop: 20, color: '#C9A84C', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              ← Retounen sou Login Ajan
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #C9A84C, #f0d080)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserPlus size={20} color="#0f1923" />
              </div>
              <div>
                <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display'" }}>Vin Ajan Plus Group</h1>
                <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: 11, margin: 0 }}>ANREJISTREMAN KANDIDATI</p>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Vin mennen antrepriz nan vil ou epi touche komisyon chak mwa pou chak
              antrepriz ki rete abòne sou platfòm lan.
            </p>

            {error && (
              <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#E8836A', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Non Konplè *</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Jean Baptiste" style={iStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="jean@email.com" style={iStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Telefòn *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+509 3000-0000" style={iStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Vil *</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="Okap" style={iStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Poukisa w vle vin ajan? (opsyonèl)</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Ti mo sou ou..." style={{ ...iStyle, resize: 'vertical', fontFamily: 'DM Sans' }} />
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: 8, padding: '13px', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #8B0000, #C0392B 50%, #C9A84C)',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                {loading ? 'Ap voye...' : 'Voye Kandidati'}
              </button>
            </form>

            <Link to="/agent" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20, color: '#64748b', fontSize: 12, textDecoration: 'none' }}>
              <ArrowLeft size={13} /> Deja yon ajan? Konekte
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
