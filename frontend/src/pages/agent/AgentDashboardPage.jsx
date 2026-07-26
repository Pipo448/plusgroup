// src/pages/agent/AgentDashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Trophy, Copy, LogOut, Building2, Wallet, Clock, TrendingUp } from 'lucide-react'
import { agentApi, getAgent, clearAgent } from '../../services/agentApi'

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, borderRadius: 14, padding: '16px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ color }}>{icon}</div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
    <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Playfair Display'" }}>{value}</p>
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
      <div style={{ minHeight: '100vh', background: '#0a0f16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(201,168,76,0.2)', borderTop: '3px solid #C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!data) return null

  const { agent, tenants, commissions, stats, rank, totalAgents, message } = data
  const fmt = (n) => `${Number(n || 0).toLocaleString()} HTG`

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0a0f16, #111827)', paddingBottom: 40 }}>
      {/* HEADER */}
      <header style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.12)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display'" }}>Bonjou, {agent.fullName} 👋</h1>
          <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: 11, margin: '2px 0 0' }}>{agent.city}</p>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <LogOut size={14} /> Dekonekte
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KÒD PROMO */}
        <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(139,0,0,0.08))', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: 'rgba(201,168,76,0.7)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Kòd Promo Ou</p>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{agent.promoCode}</p>
          </div>
          <button onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #C9A84C, #f0d080)', color: '#0f1923', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Copy size={14} /> Kopye
          </button>
        </div>

        {/* MESAJ ANKOURAJMAN */}
        <div style={{ background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.25)', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ color: '#27ae60', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>💪 {message}</p>
        </div>

        {/* KLASMAN */}
        {totalAgents > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '12px 18px' }}>
            <Trophy size={20} color="#C9A84C" />
            <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>
              Ou nan pozisyon <strong style={{ color: '#C9A84C' }}>#{rank}</strong> sou {totalAgents} ajan — konkou fen ane a bay pi bon 3 yo gwo lo!
            </p>
          </div>
        )}

        {/* ESTATISTIK */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <StatCard label="Total Touche" value={fmt(stats.totalEarned)} icon={<Wallet size={16} />} color="#C9A84C" />
          <StatCard label="Deja Peye" value={fmt(stats.totalPaid)} icon={<TrendingUp size={16} />} color="#27ae60" />
          <StatCard label="An Atant" value={fmt(stats.totalPending)} icon={<Clock size={16} />} color="#E8836A" />
          <StatCard label="Antrepriz Aktif" value={`${stats.activeTenants}/${stats.totalTenants}`} icon={<Building2 size={16} />} color="#1B3A6B" />
        </div>

        {/* ANTREPRIZ YO MENNEN */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(201,168,76,0.08)', background: 'rgba(201,168,76,0.03)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Antrepriz Ou Mennen ({tenants.length})</h3>
          </div>
          {tenants.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: 30, margin: 0, fontSize: 13 }}>Ou poko mennen okenn antrepriz. Pataje kòd ou a!</p>
          ) : (
            <div>
              {tenants.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#fff', fontSize: 13 }}>{t.name}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: t.status === 'active' ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)', color: t.status === 'active' ? '#27ae60' : '#C0392B' }}>
                    {t.status === 'active' ? 'Aktif' : t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ISTWA KOMISYON */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(201,168,76,0.08)', background: 'rgba(201,168,76,0.03)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Istwa Komisyon</h3>
          </div>
          {commissions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: 30, margin: 0, fontSize: 13 }}>Pa gen komisyon ankò.</p>
          ) : (
            <div>
              {commissions.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{c.tenant?.name}</p>
                    <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>{c.months} mwa · {new Date(c.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#C9A84C', fontSize: 14, fontWeight: 700, margin: 0 }}>{fmt(c.amountHtg)}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.status === 'paid' ? '#27ae60' : '#E8836A' }}>{c.status === 'paid' ? 'Peye' : 'An atant'}</span>
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
