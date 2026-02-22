// src/pages/admin/AdminDashboard.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import axios from 'axios'
import {
  Shield, Plus, Building2, Users, LogOut,
  CheckCircle, XCircle, Clock, X
} from 'lucide-react'

const R = {
  navy:'#1B3A6B', navyD:'#0F2347',
  gold:'#C9A84C', goldL:'#F0D080',
  salmon:'#E8836A', red:'#C0392B', white:'#FFFFFF'
}

// ── Client axios dédicat pou admin (pa interceptor tenant)
const adminApi = axios.create({ baseURL: '/api/v1', timeout: 15000 })
adminApi.interceptors.request.use((config) => {
  try {
    const { token } = JSON.parse(localStorage.getItem('pg-admin') || '{}')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})
adminApi.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pg-admin')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

const getAdmin = () => {
  try { return JSON.parse(localStorage.getItem('pg-admin') || '{}') } catch { return {} }
}

const STATUS_STYLES = {
  active:    { bg:'rgba(39,174,96,0.12)',   color:'#27ae60', border:'rgba(39,174,96,0.3)',    label:'Aktif' },
  suspended: { bg:'rgba(192,57,43,0.12)',   color:'#C0392B', border:'rgba(192,57,43,0.3)',    label:'Sipann' },
  pending:   { bg:'rgba(201,168,76,0.12)',  color:'#C9A84C', border:'rgba(201,168,76,0.3)',   label:'Annatant' },
  trial:     { bg:'rgba(26,58,107,0.12)',   color:'#1B3A6B', border:'rgba(26,58,107,0.3)',    label:'Esè' },
  cancelled: { bg:'rgba(100,116,139,0.12)', color:'#64748b', border:'rgba(100,116,139,0.3)', label:'Anile' },
}

// ── Modal kreye tenant
const CreateTenantModal = ({ plans, onClose, onCreated }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { defaultCurrency: 'HTG', defaultLanguage: 'ht', subscriptionMonths: 12 }
  })

  const mutation = useMutation({
    mutationFn: (data) => adminApi.post('/admin/tenants', data),
    onSuccess: (res) => {
      toast.success(`Entreprise "${res.data.tenant.name}" kreye avèk siksè!`)
      onCreated?.()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan kreyasyon.')
  })

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)',
      zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'#fff', borderRadius:24, width:'100%', maxWidth:560,
        maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 24px 80px rgba(0,0,0,0.3)',
        border:'1px solid rgba(201,168,76,0.2)'
      }}>
        {/* Header modal */}
        <div style={{
          padding:'20px 24px',
          background:`linear-gradient(135deg, ${R.navyD}, ${R.navy})`,
          borderRadius:'24px 24px 0 0',
          display:'flex', alignItems:'center', justifyContent:'space-between'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Building2 size={18} color={R.gold}/>
            <h2 style={{ color:R.white, fontSize:16, fontWeight:700, margin:0, fontFamily:'DM Sans, sans-serif' }}>
              Kreye Nouvo Entreprise
            </h2>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8,
            width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:R.white
          }}><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {/* Non entreprise */}
            <div style={{ gridColumn:'1/-1' }}>
              <label className="label">Non Entreprise *</label>
              <input className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="Ma Boutik Jacmel"
                {...register('name', { required: 'Non obligatwa' })} />
              {errors.name && <p style={{ color:'#ef4444', fontSize:11, marginTop:3 }}>{errors.name.message}</p>}
            </div>

            {/* Slug */}
            <div>
              <label className="label">Slug (URL) *</label>
              <input className={`input ${errors.slug ? 'input-error' : ''}`}
                placeholder="ma-boutik-jacmel"
                {...register('slug', {
                  required: 'Slug obligatwa',
                  pattern: { value:/^[a-z0-9-]+$/, message:'Lèt miniskil, chif ak tiré sèlman' }
                })} />
              {errors.slug && <p style={{ color:'#ef4444', fontSize:11, marginTop:3 }}>{errors.slug.message}</p>}
              <p style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>Egz: ma-boutik-jacmel</p>
            </div>

            {/* Plan */}
            <div>
              <label className="label">Plan Abonneman *</label>
              <select className="input" {...register('planId')}>
                <option value="">— Chwazi yon plan (opsyonèl) —</option>
                {plans?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${Number(p.priceMonthly).toFixed(0)}/mwa
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Dire abònman (mwa) */}
            <div>
              <label className="label">Dire Abònman (mwa)</label>
              <input type="number" min="1" max="36" step="1" className="input"
                placeholder="12"
                defaultValue="12"
                {...register('subscriptionMonths')} />
              <p style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                Konbyen mwa abònman an ap dire (1-36)
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Entreprise</label>
              <input type="email" className="input"
                placeholder="contact@entreprise.ht"
                {...register('email')} />
            </div>

            {/* Telefòn */}
            <div>
              <label className="label">Telefòn</label>
              <input className="input" placeholder="+509 3000-0000" {...register('phone')} />
            </div>

            {/* Devise */}
            <div>
              <label className="label">Devise Defò</label>
              <select className="input" {...register('defaultCurrency')}>
                <option value="HTG">HTG — Goud Ayisyen</option>
                <option value="USD">USD — Dola Ameriken</option>
              </select>
            </div>
          </div>

          {/* Séparateur Admin */}
          <div style={{ borderTop:'1px solid #f0e8d8', paddingTop:16 }}>
            <p style={{ fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase',
              letterSpacing:'0.08em', margin:'0 0 12px', fontFamily:'DM Sans' }}>
              👤 Kont Administratè
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="label">Non Konplè Admin *</label>
                <input className="input" placeholder="Jean Baptiste"
                  {...register('adminName', { required: true })} />
              </div>
              <div>
                <label className="label">Email Admin *</label>
                <input type="email" className="input" placeholder="admin@entreprise.ht"
                  {...register('adminEmail', { required: true })} />
              </div>
              <div>
                <label className="label">Modpas *</label>
                <input type="password" className="input" placeholder="Min. 8 karaktè"
                  {...register('adminPassword', { required: true, minLength: 8 })} />
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:8, borderTop:'1px solid #f0e8d8' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Anile</button>
            <button type="submit" disabled={mutation.isPending} style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'10px 24px', borderRadius:12,
              background: mutation.isPending
                ? 'rgba(27,58,107,0.4)'
                : `linear-gradient(135deg, ${R.navy}, #2d5fa6)`,
              color:R.white, border:'none',
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              fontSize:13, fontWeight:700, fontFamily:'DM Sans, sans-serif',
              boxShadow: mutation.isPending ? 'none' : '0 4px 14px rgba(26,58,107,0.3)'
            }}>
              {mutation.isPending
                ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap kreye...</>
                : <><Plus size={15}/> Kreye Entreprise</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ══════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const { admin }   = getAdmin()

  // Redirijye si pa gen session admin
  if (!localStorage.getItem('pg-admin')) {
    navigate('/admin/login')
    return null
  }

  // Queries
  const { data: statsData }   = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  () => adminApi.get('/admin/stats').then(r => r.data)
  })
  const { data: tenantsData } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn:  () => adminApi.get('/admin/tenants').then(r => r.data)
  })
  const { data: plansData }   = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  () => adminApi.get('/admin/plans').then(r => r.data)
  })

  // ✅ Jwenn tenants ki ap ekspire nan 5 jou
  const { data: expiringData } = useQuery({
    queryKey: ['admin-expiring'],
    queryFn:  () => adminApi.get('/admin/expiring-soon').then(r => r.data),
    refetchInterval: 5 * 60 * 1000  // Refresh chak 5 minit
  })

  const tenants = tenantsData?.tenants || []
  const plans   = plansData?.plans    || []
  const expiring = expiringData?.expiring || []

  // Mutation statut
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.patch(`/admin/tenants/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Statut ajou!')
      qc.invalidateQueries(['admin-tenants'])
      qc.invalidateQueries(['admin-stats'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  // ✅ Mutation pou renouvle abònman +1 mwa
  const renewMutation = useMutation({
    mutationFn: ({ id, months }) => adminApi.post(`/admin/tenants/${id}/renew`, { months }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      qc.invalidateQueries(['admin-tenants'])
      qc.invalidateQueries(['admin-expiring'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan renouvèlman.')
  })

  const handleLogout = () => {
    localStorage.removeItem('pg-admin')
    navigate('/admin/login')
    toast.success('Ou dekonekte.')
  }

  const statCards = [
    { label:'Total Entreprise', value: statsData?.stats?.tenants?.total  || 0, icon:<Building2 size={18}/>, grad:`linear-gradient(135deg,${R.navy},#2d5fa6)`,    glow:'rgba(26,58,107,0.3)' },
    { label:'Entreprise Aktif', value: statsData?.stats?.tenants?.active || 0, icon:<CheckCircle size={18}/>, grad:'linear-gradient(135deg,#27ae60,#1e8449)',     glow:'rgba(39,174,96,0.3)' },
    { label:'Annatant',         value: statsData?.stats?.tenants?.pending|| 0, icon:<Clock size={18}/>,       grad:`linear-gradient(135deg,${R.gold},#9a7d32)`,   glow:'rgba(201,168,76,0.3)' },
    { label:'Total Itilizatè',  value: statsData?.stats?.users?.total    || 0, icon:<Users size={18}/>,       grad:`linear-gradient(135deg,${R.salmon},#c0603d)`, glow:'rgba(232,131,106,0.3)' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg, #f8f4ee 0%, #fdfbf8 100%)', fontFamily:'IBM Plex Sans, sans-serif' }}>

      {/* ── HEADER */}
      <header style={{
        background:`linear-gradient(135deg, ${R.navyD}, ${R.navy})`,
        height:64, padding:'0 32px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 4px 20px rgba(15,35,71,0.4)',
        position:'sticky', top:0, zIndex:40,
        borderBottom:'1px solid rgba(201,168,76,0.2)'
      }}>
        {/* Ligne or déco */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg, transparent, ${R.gold} 30%, ${R.salmon} 70%, transparent)` }}/>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            background:`linear-gradient(135deg,${R.gold},${R.goldL})`,
            borderRadius:10, width:38, height:38,
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <Shield size={20} color={R.navyD}/>
          </div>
          <div>
            <p style={{ color:R.white, fontSize:15, fontWeight:800, margin:0, fontFamily:'DM Sans' }}>PLUS GROUP</p>
            <p style={{ color:R.gold, fontSize:10, margin:0, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              Super Admin Panel
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ color:R.white, fontSize:13, fontWeight:600, margin:0 }}>{admin?.name}</p>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, margin:0 }}>{admin?.email}</p>
          </div>
          <button onClick={handleLogout} style={{
            background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:10, padding:'8px 14px', cursor:'pointer',
            color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:6,
            fontSize:12, fontFamily:'DM Sans, sans-serif', fontWeight:600,
            transition:'all 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          >
            <LogOut size={14}/> Dekonekte
          </button>
        </div>
      </header>

      <main style={{ padding:'28px 32px', maxWidth:1200, margin:'0 auto' }}>

        {/* ✅ NOTIFIKASYON ABÒNMAN KI AP EKSPIRE */}
        {expiring.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            borderRadius: 16, padding: '16px 20px', marginBottom: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 20px rgba(238,90,111,0.3)',
            display: 'flex', alignItems: 'flex-start', gap: 14
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>
                {expiring.length} entreprise gen abònman ki ap ekspire nan 5 jou!
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {expiring.slice(0, 3).map(t => (
                  <p key={t.id} style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, margin: 0 }}>
                    • <strong>{t.name}</strong> — ekspire {new Date(t.subscriptionEndsAt).toLocaleDateString('fr-FR')}
                  </p>
                ))}
                {expiring.length > 3 && (
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: 0 }}>
                    +{expiring.length - 3} lòt...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {statCards.map((s,i) => (
            <div key={i} style={{
              background:R.white, borderRadius:16, padding:'20px',
              border:'1px solid rgba(201,168,76,0.1)',
              boxShadow:'0 2px 12px rgba(26,58,107,0.06)',
              position:'relative', overflow:'hidden'
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:4,
                background:s.grad, borderRadius:'16px 16px 0 0' }}/>
              <div style={{ marginTop:4, marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:s.grad,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:R.white, boxShadow:`0 4px 12px ${s.glow}` }}>
                  {s.icon}
                </div>
              </div>
              <p style={{ color:'#94a3b8', fontSize:10, fontWeight:700, marginBottom:4,
                textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>
                {s.label}
              </p>
              <p style={{ color:R.navy, fontSize:28, fontWeight:800, margin:0, fontFamily:'DM Sans' }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── TABLEAU TENANTS */}
        <div style={{
          background:R.white, borderRadius:20, overflow:'hidden',
          border:'1px solid rgba(201,168,76,0.12)',
          boxShadow:'0 2px 16px rgba(26,58,107,0.07)'
        }}>
          {/* Header tableau */}
          <div style={{
            padding:'18px 24px', borderBottom:'1px solid rgba(201,168,76,0.1)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'linear-gradient(135deg, rgba(27,58,107,0.03), rgba(201,168,76,0.03))'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ background:`linear-gradient(135deg,${R.navy},#2d5fa6)`, borderRadius:9,
                width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Building2 size={15} color={R.white}/>
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:R.navy, fontFamily:'DM Sans' }}>
                  Entreprise yo ({tenants.length})
                </h3>
                <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Jere tout kliyan SaaS ou yo</p>
              </div>
            </div>
            <button onClick={() => setShowCreate(true)} style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'10px 20px', borderRadius:10,
              background:`linear-gradient(135deg,${R.gold},${R.goldL})`,
              color:R.navyD, border:'none', cursor:'pointer',
              fontSize:13, fontWeight:800, fontFamily:'DM Sans, sans-serif',
              boxShadow:`0 4px 14px rgba(201,168,76,0.35)`
            }}>
              <Plus size={14}/> Nouvo Entreprise
            </button>
          </div>

          {/* Table */}
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#fafaf8' }}>
                {['Entreprise','Slug','Plan','Itilizatè','Statut','Ekspirasyon','Aksyon'].map((h,i) => (
                  <th key={i} style={{
                    padding:'10px 16px', textAlign:'left',
                    paddingLeft: i===0 ? 24 : 16,
                    fontSize:10, fontWeight:800, color:'#94a3b8',
                    textTransform:'uppercase', letterSpacing:'0.08em',
                    fontFamily:'DM Sans', borderBottom:'1px solid rgba(201,168,76,0.1)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!tenants.length
                ? <tr><td colSpan={7} style={{ padding:'60px 24px', textAlign:'center' }}>
                    <Building2 size={40} color="#e2e8f0" style={{ margin:'0 auto 12px', display:'block' }}/>
                    <p style={{ color:'#94a3b8', fontWeight:600, margin:'0 0 4px', fontFamily:'DM Sans' }}>
                      Pa gen entreprise
                    </p>
                    <p style={{ color:'#cbd5e1', fontSize:13, margin:0 }}>
                      Klike "Nouvo Entreprise" pou kòmanse
                    </p>
                  </td></tr>
                : tenants.map((t, idx) => {
                    const ss = STATUS_STYLES[t.status] || STATUS_STYLES.pending
                    return (
                      <tr key={t.id}
                        style={{ borderBottom: idx < tenants.length-1 ? '1px solid #faf8f4' : 'none', transition:'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fdfbf8'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <td style={{ padding:'14px 16px 14px 24px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{
                              width:36, height:36, borderRadius:10,
                              background:`linear-gradient(135deg,${R.navy},#2d5fa6)`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              color:R.white, fontSize:14, fontWeight:800, fontFamily:'DM Sans', flexShrink:0
                            }}>{t.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p style={{ fontWeight:700, color:R.navy, margin:0, fontSize:13, fontFamily:'DM Sans' }}>{t.name}</p>
                              {t.email && <p style={{ color:'#94a3b8', fontSize:11, margin:0 }}>{t.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <span style={{ fontFamily:'IBM Plex Mono', fontSize:12, color:'#64748b',
                            background:'rgba(26,58,107,0.06)', padding:'2px 8px', borderRadius:6 }}>
                            {t.slug}
                          </span>
                        </td>
                        <td style={{ padding:'14px 16px', fontSize:13, fontWeight:600, color:R.navy }}>
                          {t.plan?.name || <span style={{ color:'#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <div style={{ width:22, height:22, borderRadius:6, background:'rgba(26,58,107,0.08)',
                              display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <Users size={12} color={R.navy}/>
                            </div>
                            <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>
                              {t._count?.users || 0}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:4,
                            padding:'3px 10px', borderRadius:99,
                            background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`,
                            fontSize:11, fontWeight:700, fontFamily:'DM Sans'
                          }}>{ss.label}</span>
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          {/* ✅ Dat ekspirasyon + konte jou */}
                          {t.subscriptionEndsAt ? (() => {
                            const endsAt = new Date(t.subscriptionEndsAt)
                            const daysLeft = Math.ceil((endsAt - new Date()) / (1000 * 60 * 60 * 24))
                            const isExpired = daysLeft < 0
                            const isWarning = daysLeft >= 0 && daysLeft <= 5
                            return (
                              <div>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans',
                                  color: isExpired ? R.red : isWarning ? '#d97706' : '#27ae60'
                                }}>
                                  {isExpired
                                    ? `Ekspire ${Math.abs(daysLeft)} jou pase`
                                    : daysLeft === 0
                                      ? '⚠ Ekspire jodi a!'
                                      : isWarning
                                        ? `⚠ ${daysLeft} jou rete`
                                        : `${daysLeft} jou rete`
                                  }
                                </span>
                                <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0', fontFamily: 'DM Sans' }}>
                                  {endsAt.toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            )
                          })() : (
                            <span style={{ color:'#cbd5e1', fontSize:12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {/* ✅ Bouton Renouvle +1 Mwa (toujou vèt) */}
                            <button onClick={() => {
                              if (confirm(`Renouvle abònman "${t.name}" pou +1 mwa?`))
                                renewMutation.mutate({ id: t.id, months: 1 })
                            }}
                              style={{ display:'inline-flex', alignItems:'center', gap:4,
                                padding:'5px 12px', borderRadius:7,
                                background:'rgba(39,174,96,0.12)', border:'1px solid rgba(39,174,96,0.3)',
                                color:'#27ae60', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'DM Sans' }}>
                              ↻ +1 Mwa
                            </button>
                            {/* Sipann / Aktive */}
                            {t.status === 'active' && (
                              <button onClick={() => {
                                if (confirm(`Sipann "${t.name}"?`)) statusMutation.mutate({ id:t.id, status:'suspended' })
                              }}
                                style={{ display:'inline-flex', alignItems:'center', gap:4,
                                  padding:'5px 12px', borderRadius:7,
                                  background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.25)',
                                  color:R.red, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'DM Sans' }}>
                                <XCircle size={12}/> Sipann
                              </button>
                            )}
                            {t.status !== 'active' && (
                              <button onClick={() => statusMutation.mutate({ id:t.id, status:'active' })}
                                style={{ display:'inline-flex', alignItems:'center', gap:4,
                                  padding:'5px 12px', borderRadius:7,
                                  background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.25)',
                                  color:'#27ae60', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'DM Sans' }}>
                                <CheckCircle size={12}/> Aktive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal kreye tenant */}
      {showCreate && (
        <CreateTenantModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            qc.invalidateQueries(['admin-tenants'])
            qc.invalidateQueries(['admin-stats'])
            toast.success('Tablo ajou!')
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
