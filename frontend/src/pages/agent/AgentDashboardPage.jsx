// src/pages/agent/AgentDashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Trophy, Copy, LogOut, Building2, Wallet, Clock, TrendingUp } from 'lucide-react'
import { agentApi, clearAgent } from '../../services/agentApi'

const LOGO_URL = '/assets/logo.webp'
const BANNER_URL = '/assets/banner-konkou.png'

const C = {
  navy: '#0F172A', orange: '#F97316', orangeDark: '#EA580C', orangeLight: '#FDBA74',
  white: '#FFFFFF', bg: '#F1F5F9', blue: '#2563EB', green: '#16A34A', danger: '#EF4444',
  border: '#E2E8F0', textMuted: '#64748B'
}

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ color }}>{icon}</div>
      <p style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
    <p style={{ color: C.navy, fontSize: 22, fontWeight: 800, margin: 0 }}>{value}</p>
  </div>
)

export default function AgentDashboardPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    agentApi.get('/agents/dashboard')
      .then(res => setData(res.data))
      .catch(() => toast.error('Erè chajman done yo.'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    clearAgent()
    navigate('/agent')
    toast.success('Ou dekonekte.')
  }

  const copyCode = () => {
    if (!data?.agent?.promoCode) return
    navigator.clipboard.writeText(data.agent.promoCode)
    toast.success('Kòd promo kopye!')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.orangeLight}`, borderTop: `3px solid ${C.orange}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!data) return null

  const { agent, tenants, commissions, stats, rank, totalAgents, message } = data
  const fmt = (n) => `${Number(n || 0).toLocaleString()} HTG`

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_URL} alt="Plus Group" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div>
            <h1 style={{ color: C.navy, fontSize: 16, fontWeight: 800, margin: 0 }}>Bonjou, {agent.fullName} 👋</h1>
            <p style={{ color: C.textMuted, fontSize: 11, margin: '2px 0 0' }}>{agent.city}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <LogOut size={14} /> Dekonekte
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ background: `linear-gradient(135deg, #FFF7ED, #FFEDD5)`, border: `1px solid ${C.orangeLight}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: C.orangeDark, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Kòd Promo Ou</p>
            <p style={{ color: C.navy, fontSize: 28, fontWeight: 800, margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{agent.promoCode}</p>
          </div>
          <button onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: C.white, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Copy size={14} /> Kopye
          </button>
        </div>

        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ color: C.green, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>💪 {message}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', border: `1px solid ${C.orangeLight}`, borderRadius: 12, overflow: 'hidden' }}>
          <img src={BANNER_URL} alt="Konkou Ajan — 100,000 HTG" style={{ width: '100%', display: 'block' }} />
          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Trophy size={20} color={C.orange} />
              <p style={{ color: C.navy, fontSize: 13, margin: 0 }}>
                Ou nan pozisyon <strong style={{ color: C.orangeDark }}>#{rank || '—'}</strong>{totalAgents > 0 ? ` sou ${totalAgents} ajan` : ''}
              </p>
            </div>
            <p style={{ color: C.textMuted, fontSize: 11.5, margin: 0 }}>🏆 Konkou fen ane: 100,000 HTG bay 3 pi gwo ajan yo — objektif se 20+ antrepriz konekte.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <StatCard label="Total Touche" value={fmt(stats.totalEarned)} icon={<Wallet size={16} />} color={C.orange} />
          <StatCard label="Deja Peye" value={fmt(stats.totalPaid)} icon={<TrendingUp size={16} />} color={C.green} />
          <StatCard label="An Atant" value={fmt(stats.totalPending)} icon={<Clock size={16} />} color={C.danger} />
          <StatCard label="Antrepriz Aktif" value={`${stats.activeTenants}/${stats.totalTenants}`} icon={<Building2 size={16} />} color={C.blue} />
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.navy }}>Antrepriz Ou Mennen ({tenants.length})</h3>
          </div>
          {tenants.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: 30, margin: 0, fontSize: 13 }}>Ou poko mennen okenn antrepriz. Pataje kòd ou a!</p>
          ) : (
            <div>
              {tenants.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.navy, fontSize: 13 }}>{t.name}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: t.status === 'active' ? '#F0FDF4' : '#FEF2F2', color: t.status === 'active' ? C.green : C.danger }}>
                    {t.status === 'active' ? 'Aktif' : t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.navy }}>Istwa Komisyon</h3>
          </div>
          {commissions.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.textMuted, padding: 30, margin: 0, fontSize: 13 }}>Pa gen komisyon ankò.</p>
          ) : (
            <div>
              {commissions.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ color: C.navy, fontSize: 13, margin: 0 }}>{c.tenant?.name}</p>
                    <p style={{ color: C.textMuted, fontSize: 11, margin: '2px 0 0' }}>{c.months} mwa · {new Date(c.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: C.orange, fontSize: 14, fontWeight: 700, margin: 0 }}>{fmt(c.amountHtg)}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.status === 'paid' ? C.green : C.danger }}>{c.status === 'paid' ? 'Peye' : 'An atant'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
