// src/pages/klinik/KlinikDashboard.jsx
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import {
  K, KLINIK_STYLES, KStatCard,
  fmtDate, fmtHeure, STATUT_RDV, KBadge,
} from './klinikShared.jsx'
import {
  Users, Calendar, Stethoscope, FlaskConical,
  BedDouble, Activity, TrendingUp, Clock,
  ArrowRight, Plus,
} from 'lucide-react'

const klinikAPI = {
  getStats:       () => api.get('/klinik/stats'),
  getRdvJodi:     () => api.get('/klinik/appointments', { params: { date: new Date().toISOString().split('T')[0], limit: 10 } }),
  getHospActif:   () => api.get('/klinik/hospitalizations', { params: { statut: 'admis', limit: 5 } }),
}

export default function KlinikDashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = KLINIK_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const { data: statsData } = useQuery({
    queryKey: ['klinik-stats'],
    queryFn:  () => klinikAPI.getStats().then(r => r.data.stats),
    refetchInterval: 60000,
  })

  const { data: rdvData } = useQuery({
    queryKey: ['klinik-rdv-jodi'],
    queryFn:  () => klinikAPI.getRdvJodi().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: hospData } = useQuery({
    queryKey: ['klinik-hosp-actif'],
    queryFn:  () => klinikAPI.getHospActif().then(r => r.data),
  })

  const rdv  = rdvData?.appointments  || []
  const hosp = hospData?.hospitalizations || []

  const QUICK_LINKS = [
    { label:'Nouvo Pasyan',    icon:<Users size={16}/>,         color:K.blue,   path:'/app/klinik/patients?new=1'     },
    { label:'Nouvo Randevou',  icon:<Calendar size={16}/>,      color:K.teal,   path:'/app/klinik/randevou?new=1'     },
    { label:'Konsiltasyon',    icon:<Stethoscope size={16}/>,   color:K.purple, path:'/app/klinik/konsiltasyon'       },
    { label:'Laboratwa',       icon:<FlaskConical size={16}/>,  color:K.orange, path:'/app/klinik/lab'                },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:1000, margin:'0 auto' }}>

      {/* Header */}
      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:K.blue, margin:'0 0 3px', display:'flex', alignItems:'center', gap:8 }}>
            <Activity size={20}/> Plus Klinik
          </h1>
          <p style={{ fontSize:12, color:K.muted, margin:0 }}>Tableau de bò — {new Date().toLocaleDateString('fr-HT', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={() => navigate('/app/klinik/patients?new=1')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13, boxShadow:`0 4px 14px rgba(14,165,233,0.3)` }}>
            <Plus size={15}/> Nouvo Pasyan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="kl-grid-4">
        <KStatCard label="Total Pasyan"    value={statsData?.totalPasyan || 0}   icon={<Users size={17}/>}         color={K.blue}   />
        <KStatCard label="Randevou Jodi a" value={statsData?.rdvJodi || 0}        icon={<Calendar size={17}/>}      color={K.teal}   highlight />
        <KStatCard label="Konsilt. Mwa a"  value={statsData?.konsultMwa || 0}     icon={<Stethoscope size={17}/>}   color={K.purple} />
        <KStatCard label="Ospitalize"      value={statsData?.hospActif || 0}      icon={<BedDouble size={17}/>}     color={K.red}    highlight={statsData?.hospActif > 0} />
      </div>

      <div className="kl-grid-3" style={{ marginTop:-4 }}>
        <KStatCard label="Nouvo Pasyan Mwa"  value={statsData?.nouvoMwa || 0}   icon={<TrendingUp size={17}/>}   color={K.green} />
        <KStatCard label="RDV An Atant"       value={statsData?.rdvAtant || 0}   icon={<Clock size={17}/>}        color={K.orange} highlight={statsData?.rdvAtant > 0} />
        <KStatCard label="Lab An Atant"       value={statsData?.labAtant || 0}   icon={<FlaskConical size={17}/>} color={K.pink}   highlight={statsData?.labAtant > 0} />
      </div>

      {/* Aksyon rapid */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:K.muted, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>Aksyon Rapid</p>
        <div className="kl-grid-4">
          {QUICK_LINKS.map(q => (
            <button key={q.label} className="kl-btn" onClick={() => navigate(q.path)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:`1px solid ${q.color}25`, background:`${q.color}10`, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:`${q.color}20`, display:'flex', alignItems:'center', justifyContent:'center', color:q.color, flexShrink:0 }}>
                {q.icon}
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:K.text }}>{q.label}</span>
              <ArrowRight size={13} style={{ color:K.muted, marginLeft:'auto', flexShrink:0 }}/>
            </button>
          ))}
        </div>
      </div>

      <div className="kl-grid-2">
        {/* Randevou jodi a */}
        <div style={{ background:K.card, borderRadius:14, border:`1px solid ${K.cardBorder}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:`1px solid ${K.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:12, fontWeight:800, color:K.blue, margin:0, display:'flex', alignItems:'center', gap:6 }}>
              <Calendar size={13}/> Randevou Jodi a
            </p>
            <button className="kl-btn" onClick={() => navigate('/app/klinik/randevou')}
              style={{ fontSize:11, color:K.blue, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
              Wè tout →
            </button>
          </div>
          <div style={{ maxHeight:300, overflowY:'auto' }}>
            {!rdv.length ? (
              <p style={{ textAlign:'center', color:K.muted, padding:30, fontSize:12 }}>Pa gen randevou jodi a</p>
            ) : rdv.map(r => (
              <div key={r.id} className="kl-row" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer' }}
                onClick={() => navigate('/app/klinik/randevou')}>
                <div style={{ width:36, height:36, borderRadius:9, background:K.blueDim, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:K.blue, flexShrink:0 }}>
                  {fmtHeure(r.dateHeure)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.patient.prenom} {r.patient.nom}
                  </p>
                  <p style={{ fontSize:11, color:K.muted, margin:'1px 0 0' }}>{r.motif}</p>
                </div>
                <KBadge statut={r.statut} cfg={STATUT_RDV}/>
              </div>
            ))}
          </div>
        </div>

        {/* Pasyan ospitalize */}
        <div style={{ background:K.card, borderRadius:14, border:`1px solid ${K.cardBorder}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:`1px solid ${K.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:12, fontWeight:800, color:K.red, margin:0, display:'flex', alignItems:'center', gap:6 }}>
              <BedDouble size={13}/> Pasyan Ospitalize
            </p>
            <button className="kl-btn" onClick={() => navigate('/app/klinik/ospitalizasyon')}
              style={{ fontSize:11, color:K.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
              Wè tout →
            </button>
          </div>
          <div style={{ maxHeight:300, overflowY:'auto' }}>
            {!hosp.length ? (
              <p style={{ textAlign:'center', color:K.muted, padding:30, fontSize:12 }}>Pa gen pasyan ospitalize</p>
            ) : hosp.map(h => (
              <div key={h.id} className="kl-row" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer' }}
                onClick={() => navigate('/app/klinik/ospitalizasyon')}>
                <div style={{ width:36, height:36, borderRadius:9, background:K.redBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:K.red, flexShrink:0 }}>
                  {h.patient.prenom?.[0]}{h.patient.nom?.[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>
                    {h.patient.prenom} {h.patient.nom}
                  </p>
                  <p style={{ fontSize:11, color:K.muted, margin:'1px 0 0' }}>
                    {h.chambre ? `Chanm ${h.chambre}` : 'Pa asiye'} • Admis {fmtDate(h.dateAdmission)}
                  </p>
                </div>
                <span style={{ fontSize:10, color:K.red, fontWeight:700 }}>Jou {Math.floor((Date.now() - new Date(h.dateAdmission)) / 86400000)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lyen rapid tout modil */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:K.muted, textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 10px' }}>Tout Modil Klinik</p>
        <div className="kl-grid-4">
          {[
            { label:'Pasyan',       icon:'👥', color:K.blue,   path:'/app/klinik/patients'       },
            { label:'Randevou',     icon:'📅', color:K.teal,   path:'/app/klinik/randevou'       },
            { label:'Konsiltasyon', icon:'🩺', color:K.purple, path:'/app/klinik/konsiltasyon'   },
            { label:'Preskripsyon', icon:'💊', color:K.green,  path:'/app/klinik/preskripsyon'   },
            { label:'Laboratwa',    icon:'🔬', color:K.orange, path:'/app/klinik/lab'            },
            { label:'Ospitalizasyon',icon:'🛏️', color:K.red,   path:'/app/klinik/ospitalizasyon' },
          ].map(m => (
            <button key={m.label} className="kl-btn" onClick={() => navigate(m.path)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:'14px 10px', borderRadius:12, border:`1px solid ${m.color}20`, background:`${m.color}08`, cursor:'pointer', fontSize:11, fontWeight:700, color:K.text }}>
              <span style={{ fontSize:22 }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
