// src/pages/klinik/AppointmentsPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  K, KLINIK_STYLES, KModal, KSection, KBadge, KSpinner,
  inputStyle, labelStyle, fmtDate, fmtDateTime, fmtHeure,
  STATUT_RDV,
} from './klinikShared.jsx'
import {
  Calendar, Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  Clock, User, Check, X, AlertCircle,
} from 'lucide-react'

const rdvAPI = {
  getAll:    (p)    => api.get('/klinik/appointments', { params: p }),
  create:    (d)    => api.post('/klinik/appointments', d),
  update:    (id,d) => api.put(`/klinik/appointments/${id}`, d),
  updateStatut: (id,s) => api.patch(`/klinik/appointments/${id}/statut`, { statut: s }),
  delete:    (id)   => api.delete(`/klinik/appointments/${id}`),
}
const patAPI = {
  search: (s) => api.get('/klinik/patients', { params: { search: s, limit: 8 } }),
}

const STATUTS_LIST = [
  { val:'en_attente', label:'An Atant'  },
  { val:'confirme',   label:'Konfime'   },
  { val:'en_cours',   label:'An Kous'   },
  { val:'complete',   label:'Konplè'    },
  { val:'annule',     label:'Anile'     },
  { val:'absent',     label:'Absan'     },
]

// ─── Modal Kreye / Edite Randevou ────────────────────────────
function ModalRdv({ rdv, onClose, onSuccess }) {
  const isEdit = !!rdv?.id
  const now    = new Date()
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0)

  const [form, setForm] = useState({
    patientId: '',
    doctorName: '',
    dateHeure: now.toISOString().slice(0, 16),
    dureeMin: 30,
    motif: '',
    notes: '',
    ...(rdv ? {
      patientId: rdv.patientId,
      doctorName: rdv.doctorName,
      dateHeure: new Date(rdv.dateHeure).toISOString().slice(0, 16),
      dureeMin: rdv.dureeMin,
      motif: rdv.motif,
      notes: rdv.notes || '',
    } : {}),
  })

  const [patSearch,   setPatSearch]   = useState(rdv?.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : '')
  const [patResults,  setPatResults]  = useState([])
  const [patSelected, setPatSelected] = useState(rdv?.patient || null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!patSearch || patSelected) return
    const t = setTimeout(async () => {
      const r = await patAPI.search(patSearch)
      setPatResults(r.data.patients || [])
    }, 300)
    return () => clearTimeout(t)
  }, [patSearch, patSelected])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? rdvAPI.update(rdv.id, d) : rdvAPI.create(d),
    onSuccess: () => {
      toast.success(isEdit ? '✅ Randevou mizajou!' : '✅ Randevou kreye!')
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!form.patientId) { toast.error('Chwazi yon pasyan.'); return }
    if (!form.doctorName.trim()) { toast.error('Non doktè obligatwa.'); return }
    if (!form.motif.trim()) { toast.error('Motif obligatwa.'); return }
    mutation.mutate({ ...form, dureeMin: Number(form.dureeMin) })
  }

  return (
    <KModal onClose={onClose} title={isEdit ? '✏️ Edite Randevou' : '📅 Nouvo Randevou'} width={520}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Chèche Pasyan */}
        <KSection icon="👤" title="Pasyan">
          {patSelected ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:K.blueDim, borderRadius:9, border:`1px solid ${K.blueBorder}` }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{patSelected.prenom} {patSelected.nom}</p>
                <p style={{ fontSize:11, color:K.muted, margin:'2px 0 0', fontFamily:'monospace' }}>{patSelected.numeroDossier}</p>
              </div>
              <button onClick={() => { setPatSelected(null); setForm(p => ({ ...p, patientId:'' })); setPatSearch('') }}
                style={{ background:'none', border:'none', cursor:'pointer', color:K.muted, display:'flex' }}>
                <X size={15}/>
              </button>
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:K.muted, pointerEvents:'none' }}/>
              <input ref={searchRef} className="kl-input" style={{ ...inputStyle, paddingLeft:36 }}
                placeholder="Chèche non oswa nimewo dossye..."
                value={patSearch} onChange={e => { setPatSearch(e.target.value); setPatSelected(null) }} autoFocus/>
              {patResults.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:9, marginTop:4, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                  {patResults.map(p => (
                    <button key={p.id} onClick={() => { setPatSelected(p); setForm(f => ({ ...f, patientId:p.id })); setPatResults([]) }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.05)`, textAlign:'left' }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:K.blueDim, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:K.blue, flexShrink:0 }}>
                        {p.prenom?.[0]}{p.nom?.[0]}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{p.prenom} {p.nom}</p>
                        <p style={{ fontSize:11, color:K.muted, margin:0, fontFamily:'monospace' }}>{p.numeroDossier}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </KSection>

        <KSection icon="🩺" title="Detay Randevou">
          <div>
            <label style={labelStyle}>Non Doktè *</label>
            <input className="kl-input" style={inputStyle} value={form.doctorName}
              onChange={e => set('doctorName', e.target.value)} placeholder="Dr. Marie Pierre..." />
          </div>
          <div className="kl-frow" style={{ marginTop:10 }}>
            <div style={{ flex:2 }}>
              <label style={labelStyle}>Dat ak Lè *</label>
              <input type="datetime-local" className="kl-input" style={inputStyle}
                value={form.dateHeure} onChange={e => set('dateHeure', e.target.value)} />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Dire (min)</label>
              <select className="kl-input" style={{ ...inputStyle, cursor:'pointer' }}
                value={form.dureeMin} onChange={e => set('dureeMin', e.target.value)}>
                {[15,20,30,45,60,90,120].map(m => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Motif *</label>
            <input className="kl-input" style={inputStyle} value={form.motif}
              onChange={e => set('motif', e.target.value)} placeholder="Rezon vizit la..." />
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Nòt (opsyonèl)</label>
            <textarea className="kl-input" style={{ ...inputStyle, height:52, resize:'vertical' }}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Obsèvasyon..." />
          </div>
        </KSection>

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>
            Anile
          </button>
          <button className="kl-btn" onClick={handleSubmit} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:14, opacity:mutation.isPending ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            {mutation.isPending ? <><KSpinner/> Ap sove...</> : isEdit ? '✅ Sove' : <><Calendar size={15}/> Kreye Randevou</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function AppointmentsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [statut,     setStatut]     = useState('')
  const [page,       setPage]       = useState(1)
  const [modal,      setModal]      = useState(searchParams.get('new') === '1' ? 'create' : null)
  const [selRdv,     setSelRdv]     = useState(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = KLINIK_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['klinik-rdv', dateFilter, statut, page],
    queryFn:  () => rdvAPI.getAll({ date: dateFilter || undefined, statut: statut || undefined, page, limit: 30 }).then(r => r.data),
    keepPreviousData: true,
  })

  const rdvs       = data?.appointments || []
  const total      = data?.total         || 0
  const totalPages = Math.ceil(total / 30) || 1
  const refresh    = () => qc.invalidateQueries(['klinik-rdv'])

  const mutStatut = useMutation({
    mutationFn: ({ id, statut }) => rdvAPI.updateStatut(id, statut),
    onSuccess: () => { toast.success('Estati chanje ✅'); refresh() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const mutDelete = useMutation({
    mutationFn: (id) => rdvAPI.delete(id),
    onSuccess: () => { toast.success('Randevou efase.'); refresh() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  // Navige jou
  const changeDate = (delta) => {
    const d = new Date(dateFilter)
    d.setDate(d.getDate() + delta)
    setDateFilter(d.toISOString().split('T')[0])
    setPage(1)
  }

  const isJodi = dateFilter === new Date().toISOString().split('T')[0]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>

      {/* Header */}
      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:K.blue, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}>
            <Calendar size={19}/> Randevou
          </h1>
          <p style={{ fontSize:11, color:K.muted, margin:0 }}>Kalandriye ak jesyon randevou</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={() => refetch()}
            style={{ width:36, height:36, borderRadius:10, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button className="kl-btn" onClick={() => { setSelRdv(null); setModal('create') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13, boxShadow:`0 4px 14px rgba(14,165,233,0.25)` }}>
            <Plus size={15}/> Nouvo Randevou
          </button>
        </div>
      </div>

      {/* Filtre dat + statut */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:K.card, borderRadius:10, border:`1px solid ${K.cardBorder}`, padding:'4px 4px' }}>
          <button className="kl-btn" onClick={() => changeDate(-1)}
            style={{ width:30, height:30, borderRadius:8, border:'none', background:'transparent', color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={15}/>
          </button>
          <input type="date" style={{ ...inputStyle, width:'auto', padding:'6px 10px', border:'none', background:'transparent', color:K.text, fontSize:13, fontWeight:700 }}
            value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }} />
          <button className="kl-btn" onClick={() => changeDate(1)}
            style={{ width:30, height:30, borderRadius:8, border:'none', background:'transparent', color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronRight size={15}/>
          </button>
        </div>

        {!isJodi && (
          <button className="kl-btn" onClick={() => { setDateFilter(new Date().toISOString().split('T')[0]); setPage(1) }}
            style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${K.blueBorder}`, background:K.blueDim, color:K.blue, cursor:'pointer', fontWeight:700, fontSize:12 }}>
            Jodi a
          </button>
        )}

        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {[{ val:'', label:'Tout' }, ...STATUTS_LIST].map(s => (
            <button key={s.val} className="kl-btn" onClick={() => { setStatut(s.val); setPage(1) }}
              style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${statut === s.val ? K.blue+'60' : K.cardBorder}`, background: statut === s.val ? K.blueDim : 'transparent', color: statut === s.val ? K.blue : K.muted, cursor:'pointer', fontWeight:700, fontSize:11, whiteSpace:'nowrap' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kont */}
      {total > 0 && <p style={{ fontSize:11, color:K.muted, margin:0 }}>{total} randevou</p>}

      {/* Lis */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:40, color:K.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <KSpinner color={K.blue} size={18}/> Ap chaje...
        </div>
      ) : !rdvs.length ? (
        <div style={{ textAlign:'center', padding:50, background:K.card, borderRadius:16, border:`1px dashed ${K.cardBorder}` }}>
          <Calendar size={34} style={{ opacity:0.2, margin:'0 auto 10px', display:'block', color:K.blue }}/>
          <p style={{ fontSize:13, fontWeight:700, color:K.muted, margin:0 }}>Pa gen randevou pou dat sa a</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {rdvs.map(rdv => (
            <div key={rdv.id} style={{ background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:12, padding:'12px 14px', animation:'kFadeUp 0.2s ease' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                {/* Lè */}
                <div style={{ width:54, height:54, borderRadius:10, flexShrink:0, background:K.blueDim, border:`1px solid ${K.blueBorder}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:14, color:K.blue, lineHeight:1 }}>{fmtHeure(rdv.dateHeure)}</span>
                  <span style={{ fontSize:9, color:K.muted, marginTop:2 }}>{rdv.dureeMin}min</span>
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:K.text, margin:0 }}>
                      {rdv.patient?.prenom} {rdv.patient?.nom}
                    </p>
                    <span style={{ fontSize:10, fontFamily:'monospace', color:K.muted }}>
                      {rdv.patient?.numeroDossier}
                    </span>
                    <KBadge statut={rdv.statut} cfg={STATUT_RDV}/>
                  </div>
                  <p style={{ fontSize:12, color:K.muted, margin:0 }}>{rdv.motif}</p>
                  <p style={{ fontSize:11, color:K.muted, margin:'3px 0 0' }}>Dr. {rdv.doctorName}</p>
                </div>
              </div>

              {/* Aksyon */}
              <div style={{ display:'flex', gap:6, marginTop:10, paddingTop:10, borderTop:`1px solid rgba(14,165,233,0.08)`, flexWrap:'wrap' }}>
                {/* Bouton chanje statut rapid */}
                {rdv.statut === 'en_attente' && (
                  <button className="kl-btn" onClick={() => mutStatut.mutate({ id:rdv.id, statut:'confirme' })}
                    style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${K.teal}30`, background:K.tealBg, color:K.teal, cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                    <Check size={12}/> Konfime
                  </button>
                )}
                {(rdv.statut === 'confirme' || rdv.statut === 'en_attente') && (
                  <button className="kl-btn" onClick={() => mutStatut.mutate({ id:rdv.id, statut:'en_cours' })}
                    style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${K.blue}30`, background:K.blueDim, color:K.blue, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                    An Kous
                  </button>
                )}
                {rdv.statut === 'en_cours' && (
                  <button className="kl-btn" onClick={() => mutStatut.mutate({ id:rdv.id, statut:'complete' })}
                    style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${K.green}30`, background:K.greenBg, color:K.green, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                    <Check size={12}/> Konplè
                  </button>
                )}
                <button className="kl-btn" onClick={() => { setSelRdv(rdv); setModal('edit') }}
                  style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${K.cardBorder}`, background:'rgba(255,255,255,0.03)', color:K.muted, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                  ✏️ Edite
                </button>
                {rdv.statut !== 'complete' && (
                  <button className="kl-btn" onClick={() => mutStatut.mutate({ id:rdv.id, statut:'annule' })}
                    style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${K.red}30`, background:K.redBg, color:K.red, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                    <X size={12}/> Anile
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:K.muted }}>{total} randevou</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="kl-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:page===1?'default':'pointer', opacity:page===1?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={14}/>
            </button>
            <span style={{ fontSize:12, fontWeight:700, color:K.text, minWidth:50, textAlign:'center' }}>{page}/{totalPages}</span>
            <button className="kl-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:page===totalPages?'default':'pointer', opacity:page===totalPages?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && <ModalRdv onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'edit' && selRdv && <ModalRdv rdv={selRdv} onClose={() => setModal(null)} onSuccess={refresh}/>}
    </div>
  )
}
