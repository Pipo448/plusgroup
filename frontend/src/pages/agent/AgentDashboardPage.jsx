// src/pages/agent/AgentDashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Trophy, Copy, LogOut, Building2, Wallet, Clock, TrendingUp, Plus, X } from 'lucide-react'
import { agentApi, clearAgent } from '../../services/agentApi'
import PromoCarousel from '../../components/agent/PromoCarousel'

const LOGO_URL = '/assets/logo.webp'

// ⚠️ Dwe rete SENKRONIZE ak PLAN_PRICE_RULES nan tenant-signup.service.js
const PLAN_PRICE_RULES = {
  'Estanda':  { min: 3000, max: null },
  'Biznis':   { min: 3500, max: 4500 },
  'Premyum':  { min: 4000, max: null },
  'Antrepriz': { min: 5000, max: null },
}

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
  const [showCreateTenant, setShowCreateTenant] = useState(false)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowCreateTenant(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            <Plus size={14} /> Kreye Antrepriz
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <LogOut size={14} /> Dekonekte
          </button>
        </div>
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

        {(() => {
          const domains = Array.isArray(agent.domains) ? agent.domains : []
          const isSystem = domains.includes('system') || domains.includes('both')
          const isCommercial = domains.includes('commercial') || domains.includes('both')

          return (
            <>
              {isSystem && (
                <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', border: `1px solid ${C.orangeLight}`, borderRadius: 12, overflow: 'hidden', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <PromoCarousel maxWidth={300} height={260} />
                  <div style={{ marginTop: 14, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
                      <Trophy size={20} color={C.orange} />
                      <p style={{ color: C.navy, fontSize: 13, margin: 0 }}>
                        Ou nan pozisyon <strong style={{ color: C.orangeDark }}>#{rank || '—'}</strong>{totalAgents > 0 ? ` sou ${totalAgents} ajan` : ''}
                      </p>
                    </div>
                    <p style={{ color: C.textMuted, fontSize: 11.5, margin: 0 }}>🏆 Konkou fen ane: 100,000 HTG bay 3 pi gwo Ajan Sistèm yo — objektif se 20+ antrepriz konekte.</p>
                  </div>
                </div>
              )}

              {isCommercial && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>💵</span>
                    <p style={{ color: '#1E40AF', fontSize: 14, fontWeight: 800, margin: 0 }}>Komisyon Ajan Komèsyal</p>
                  </div>
                  {agent.commercialCommissionRate != null ? (
                    <p style={{ color: C.navy, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                      Ou touche <strong style={{ color: '#1E40AF', fontSize: 18 }}>{agent.commercialCommissionRate}%</strong> sou chak acha pwodui kliyan ou yo fè.
                    </p>
                  ) : (
                    <p style={{ color: C.textMuted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                      Ekip Plus Group poko defini pousantaj komisyon ou. Y ap kontakte w byento.
                    </p>
                  )}
                </div>
              )}
            </>
          )
        })()}

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
      {showCreateTenant && (
        <CreateTenantModal agent={agent} onClose={() => setShowCreateTenant(false)} />
      )}
    </div>
  )
}

/* ─── MODAL KREYE ANTREPRIZ (pou kliyan ajan an mennen) ─── */
function CreateTenantModal({ agent, onClose }) {
  const [form, setForm] = useState({
    name: '', slug: '', email: '', phone: '', address: '',
    adminName: '', adminEmail: '', adminPassword: '', planId: null, monthlyPrice: '',
  })
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    agentApi.get('/public/plans').then(res => {
      const list = res.data.plans || []
      setPlans(list)
      if (list.length) set('planId', list[0].id)
    }).catch(() => toast.error('Pa t ka chaje lis plan yo.'))
  }, [])

  const suggestSlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Non antrepriz la obligatwa.')
    if (!form.adminEmail.trim() || !form.adminPassword.trim()) return toast.error('Imèl ak modpas administratè a obligatwa.')
    if (form.adminPassword.length < 6) return toast.error('Modpas la dwe gen omwen 6 karaktè.')
    if (!form.planId) return toast.error('Chwazi yon plan.')
    const selectedPlan = plans.find(p => p.id === form.planId)
    const rule = PLAN_PRICE_RULES[selectedPlan?.name] || { min: 2500, max: null }
    const priceNum = Number(form.monthlyPrice)
    if (!priceNum || priceNum < rule.min || (rule.max && priceNum > rule.max)) {
      const rangeMsg = rule.max ? `ant ${rule.min} ak ${rule.max} HTG` : `omwen ${rule.min} HTG`
      return toast.error(`Pou plan "${selectedPlan?.name}", montan an dwe ${rangeMsg}.`)
    }

    setSaving(true)
    try {
      const res = await agentApi.post('/agents/tenant-requests', {
        ...form,
        monthlyPrice: Number(form.monthlyPrice),
        slug: form.slug.trim() || suggestSlug(form.name),
      })
      toast.success(res.data.message || 'Demann voye avèk siksè!')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erè kreye antrepriz la.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
    background: C.white, border: `1.5px solid ${C.border}`, color: C.navy, fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: C.white, borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.navy }}>Kreye Antrepriz</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMuted }}>Ou gen yon mwa pou itilize sistèm nan. Apre yon mwa itilizasyon, kliyan an dwe peye pou kontinye.</p>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: 'none', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: C.textMuted }}><X size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#FFF7ED', border: `1px solid ${C.orangeLight}`, borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>KÒD PWOMO OU</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: C.orangeDark, fontSize: 13 }}>{agent.promoCode}</span>
          </div>

          <div>
            <label style={labelStyle}>NON ANTREPRIZ *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Boutik Marie" />
          </div>
          <div>
            <label style={labelStyle}>SLUG (adrès kout)</label>
            <input value={form.slug} onChange={e => set('slug', e.target.value)} style={inputStyle}
              placeholder={form.name ? suggestSlug(form.name) : 'boutik-marie'} />
          </div>
          <div>
            <label style={labelStyle}>IMÈL ANTREPRIZ</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="kontak@antrepriz.com" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>TELEFÒN</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="+509 XXXX XXXX" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ADRÈS</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} placeholder="Vil, Depatman" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>CHWAZI YON PLAN *</label>
            {plans.length === 0 ? (
              <p style={{ color: C.textMuted, fontSize: 12 }}>Ap chaje plan yo...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {plans.map(p => {
                  const active = p.id === form.planId
                  return (
                    <button key={p.id} type="button" onClick={() => set('planId', p.id)} style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: active ? `1.5px solid ${C.orange}` : `1.5px solid ${C.border}`,
                      background: active ? '#FFF7ED' : C.white,
                    }}>
                      <div style={{ color: active ? C.orangeDark : C.navy, fontWeight: 800, fontSize: 13 }}>{p.name}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {(() => {
            const selectedPlan = plans.find(p => p.id === form.planId)
            const rule = PLAN_PRICE_RULES[selectedPlan?.name] || { min: 2500, max: null }
            const rangeText = rule.max ? `ant ${rule.min.toLocaleString()} ak ${rule.max.toLocaleString()} HTG` : `omwen ${rule.min.toLocaleString()} HTG`
            return (
              <div>
                <label style={labelStyle}>MONTAN MANSYÈL (HTG) *</label>
                <input type="number" min={rule.min} max={rule.max || undefined} value={form.monthlyPrice} onChange={e => set('monthlyPrice', e.target.value)} style={inputStyle} placeholder={`Egzanp: ${rule.min}`} />
                <p style={{ color: C.textMuted, fontSize: 10.5, margin: '4px 0 0' }}>Pou plan "{selectedPlan?.name || '...'}" — {rangeText}</p>
              </div>
            )
          })()}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kont Administratè Kliyan An</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>NON ADMINISTRATÈ</label>
                <input value={form.adminName} onChange={e => set('adminName', e.target.value)} style={inputStyle} placeholder="Marie Jean" />
              </div>
              <div>
                <label style={labelStyle}>IMÈL KONEKSYON *</label>
                <input value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} style={inputStyle} placeholder="marie@antrepriz.com" />
              </div>
              <div>
                <label style={labelStyle}>MODPAS *</label>
                <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} style={inputStyle} placeholder="Omwen 6 karaktè" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Anile</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
            {saving ? 'Ap voye...' : 'Kreye Antrepriz'}
          </button>
        </div>
      </div>
    </div>
  )
}
