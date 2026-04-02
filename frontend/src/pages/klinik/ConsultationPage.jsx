// src/pages/klinik/ConsultationPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  K, KLINIK_STYLES, KModal, KSection, KVitalTag, KBadge, KSpinner,
  inputStyle, labelStyle, fmtDate, fmtDateTime, age,
  STATUT_KONSULT, GROUPE_SANGUIN_LABELS,
} from './klinikShared.jsx'
import {
  Stethoscope, Plus, Search, RefreshCw,
  ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react'

const consultAPI = {
  getAll:  (p)    => api.get('/klinik/consultations', { params: p }),
  getOne:  (id)   => api.get(`/klinik/consultations/${id}`),
  create:  (d)    => api.post('/klinik/consultations', d),
  update:  (id,d) => api.put(`/klinik/consultations/${id}`, d),
}
const patAPI = {
  search: (s) => api.get('/klinik/patients', { params: { search: s, limit: 8 } }),
}

// ─── Modal Konsiltasyon ───────────────────────────────────────
function ModalConsult({ consult, onClose, onSuccess }) {
  const isEdit = !!consult?.id
  const [form, setForm] = useState({
    patientId: '', doctorName: '', motif: '',
    anamnese: '', examenClinique: '', diagnostic: '',
    traitement: '', notesInternes: '', statut: 'brouillon',
    poidsKg: '', tailleCm: '', tensionSys: '', tensionDia: '',
    temperature: '', pouls: '', spo2: '', glycemie: '',
    ...(consult ? {
      patientId:      consult.patientId,
      doctorName:     consult.doctorName,
      motif:          consult.motif || '',
      anamnese:       consult.anamnese || '',
      examenClinique: consult.examenClinique || '',
      diagnostic:     consult.diagnostic || '',
      traitement:     consult.traitement || '',
      notesInternes:  consult.notesInternes || '',
      statut:         consult.statut,
      poidsKg:        consult.poidsKg || '',
      tailleCm:       consult.tailleCm || '',
      tensionSys:     consult.tensionSys || '',
      tensionDia:     consult.tensionDia || '',
      temperature:    consult.temperature || '',
      pouls:          consult.pouls || '',
      spo2:           consult.spo2 || '',
      glycemie:       consult.glycemie || '',
    } : {}),
  })

  const [patSearch,   setPatSearch]   = useState(consult?.patient ? `${consult.patient.prenom} ${consult.patient.nom}` : '')
  const [patResults,  setPatResults]  = useState([])
  const [patSelected, setPatSelected] = useState(consult?.patient || null)

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
    mutationFn: (d) => isEdit ? consultAPI.update(consult.id, d) : consultAPI.create(d),
    onSuccess: () => {
      toast.success(isEdit ? '✅ Konsiltasyon mizajou!' : '✅ Konsiltasyon kreye!')
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = (statutFinal) => {
    if (!form.patientId) { toast.error('Chwazi yon pasyan.'); return }
    if (!form.doctorName.trim()) { toast.error('Non doktè obligatwa.'); return }
    const data = { ...form, statut: statutFinal || form.statut }
    // Konvèti nimerik
    ;['poidsKg','tailleCm','tensionSys','tensionDia','temperature','pouls','spo2','glycemie']
      .forEach(k => { if (data[k] !== '' && data[k] !== null) data[k] = Number(data[k]); else data[k] = null })
    mutation.mutate(data)
  }

  return (
    <KModal onClose={onClose} title={isEdit ? `✏️ Konsiltasyon — ${consult.patient?.prenom} ${consult.patient?.nom}` : '🩺 Nouvo Konsiltasyon'} width={640}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Pasyan */}
        {!isEdit && (
          <KSection icon="👤" title="Pasyan">
            {patSelected ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:K.blueDim, borderRadius:9, border:`1px solid ${K.blueBorder}` }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{patSelected.prenom} {patSelected.nom}</p>
                  {patSelected.allergies && <p style={{ fontSize:11, color:K.orange, margin:'2px 0 0' }}>⚠ Alèji: {patSelected.allergies}</p>}
                </div>
                <button onClick={() => { setPatSelected(null); set('patientId',''); setPatSearch('') }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:K.muted, display:'flex' }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:K.muted }}/>
                <input className="kl-input" style={{ ...inputStyle, paddingLeft:36 }}
                  placeholder="Chèche pasyan..." value={patSearch}
                  onChange={e => { setPatSearch(e.target.value); setPatSelected(null) }}/>
                {patResults.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:9, marginTop:4, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                    {patResults.map(p => (
                      <button key={p.id} onClick={() => { setPatSelected(p); set('patientId', p.id); setPatResults([]) }}
                        style={{ width:'100%', display:'flex', gap:10, padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.05)`, textAlign:'left' }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{p.prenom} {p.nom}</p>
                          <p style={{ fontSize:11, color:K.muted, margin:0 }}>{p.numeroDossier}{p.allergies ? ` • ⚠ ${p.allergies}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </KSection>
        )}

        {/* Doktè + Motif */}
        <KSection icon="🩺" title="Enfòmasyon Jeneral">
          <div className="kl-frow">
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Non Doktè *</label>
              <input className="kl-input" style={inputStyle} value={form.doctorName}
                onChange={e => set('doctorName', e.target.value)} placeholder="Dr. Marie..." />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Statut</label>
              <select className="kl-input" style={{ ...inputStyle, cursor:'pointer' }}
                value={form.statut} onChange={e => set('statut', e.target.value)}>
                <option value="brouillon">Bouyon</option>
                <option value="complete">Konplè</option>
                <option value="signe">Siyen</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Motif Konsiltasyon</label>
            <input className="kl-input" style={inputStyle} value={form.motif}
              onChange={e => set('motif', e.target.value)} placeholder="Rezon vizit la..." />
          </div>
        </KSection>

        {/* Siy Vital */}
        <KSection icon="📊" title="Siy Vital">
          <div className="kl-grid-4">
            {[
              { k:'poidsKg',     label:'Pwa (kg)',    pl:'ex: 65'  },
              { k:'tailleCm',    label:'Tay (cm)',    pl:'ex: 170' },
              { k:'temperature', label:'Temp. (°C)',  pl:'ex: 37.5'},
              { k:'pouls',       label:'Pou (bpm)',   pl:'ex: 72'  },
              { k:'tensionSys',  label:'Tension Sys', pl:'ex: 120' },
              { k:'tensionDia',  label:'Tension Dia', pl:'ex: 80'  },
              { k:'spo2',        label:'SpO2 (%)',    pl:'ex: 98'  },
              { k:'glycemie',    label:'Glycemi',     pl:'ex: 5.5' },
            ].map(f => (
              <div key={f.k}>
                <label style={labelStyle}>{f.label}</label>
                <input type="number" step="0.1" className="kl-input" style={inputStyle}
                  value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.pl}/>
              </div>
            ))}
          </div>
        </KSection>

        {/* Klinik */}
        <KSection icon="📋" title="Nòt Klinik">
          {[
            { k:'anamnese',      label:'Istwa Maladi a (Anamnèz)',    pl:'Deskripsyon siy ak sentòm...'        },
            { k:'examenClinique',label:'Egzamen Klinik',              pl:'Rezilta egzamen fizik la...'         },
            { k:'diagnostic',    label:'Dyagnostik',                  pl:'Dyagnostik prensipal ak diferansyèl...'},
            { k:'traitement',    label:'Tretman Preskripsyon',        pl:'Medikaman, konsèy, sijestyon...'    },
            { k:'notesInternes', label:'Nòt Entèn (pa pou kliyan)',   pl:'Obsèvasyon pou medsen sèlman...'    },
          ].map(f => (
            <div key={f.k} style={{ marginBottom:10 }}>
              <label style={labelStyle}>{f.label}</label>
              <textarea className="kl-input" style={{ ...inputStyle, height:70, resize:'vertical' }}
                value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.pl}/>
            </div>
          ))}
        </KSection>

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>
            Anile
          </button>
          <button className="kl-btn" onClick={() => handleSubmit('brouillon')} disabled={mutation.isPending}
            style={{ flex:1, padding:'12px', borderRadius:12, border:`1px solid ${K.orange}40`, background:K.orangeBg, color:K.orange, fontWeight:700, cursor:'pointer', opacity:mutation.isPending?0.6:1 }}>
            Sove Bouyon
          </button>
          <button className="kl-btn" onClick={() => handleSubmit('signe')} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:mutation.isPending?0.6:1 }}>
            {mutation.isPending ? <><KSpinner/> Ap sove...</> : '✅ Siyen & Konplète'}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ─── Modal Detay Konsiltasyon ─────────────────────────────────
function ModalDetailConsult({ consultId, onClose, onEdit }) {
  const { data: consult, isLoading } = useQuery({
    queryKey: ['klinik-consult', consultId],
    queryFn:  () => consultAPI.getOne(consultId).then(r => r.data.consultation),
    enabled: !!consultId,
  })

  if (isLoading || !consult) return (
    <KModal onClose={onClose} title="Konsiltasyon">
      <div style={{ textAlign:'center', padding:40, display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:K.muted }}>
        <KSpinner color={K.blue} size={18}/> Ap chaje...
      </div>
    </KModal>
  )

  return (
    <KModal onClose={onClose} title={`🩺 ${consult.patient?.prenom} ${consult.patient?.nom} — ${fmtDate(consult.date)}`} width={620}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <KBadge statut={consult.statut} cfg={STATUT_KONSULT}/>
          <span style={{ fontSize:12, color:K.muted }}>Dr. {consult.doctorName}</span>
          <span style={{ fontSize:12, color:K.muted }}>{fmtDateTime(consult.date)}</span>
        </div>

        {/* Siy vital */}
        {(consult.poidsKg || consult.temperature || consult.pouls || consult.spo2) && (
          <div className="kl-grid-4">
            <KVitalTag label="Pwa"    value={consult.poidsKg}     unit="kg"  />
            <KVitalTag label="Tay"    value={consult.tailleCm}    unit="cm"  />
            <KVitalTag label="Temp."  value={consult.temperature} unit="°C"  ok={!consult.temperature || consult.temperature < 38} />
            <KVitalTag label="Pou"    value={consult.pouls}       unit="bpm" />
            <KVitalTag label="Tension" value={consult.tensionSys && consult.tensionDia ? `${consult.tensionSys}/${consult.tensionDia}` : null} unit="mmHg" ok={!consult.tensionSys || consult.tensionSys < 140} />
            <KVitalTag label="SpO2"   value={consult.spo2}        unit="%"   ok={!consult.spo2 || consult.spo2 >= 95} />
            <KVitalTag label="Glycemi"value={consult.glycemie}    unit="g/L" />
          </div>
        )}

        {/* Nòt klinik */}
        {[
          { label:'Motif',        val:consult.motif          },
          { label:'Anamnèz',      val:consult.anamnese       },
          { label:'Egzamen',      val:consult.examenClinique },
          { label:'Dyagnostik',   val:consult.diagnostic     },
          { label:'Tretman',      val:consult.traitement     },
        ].filter(f => f.val).map(f => (
          <div key={f.label} style={{ background:K.secBg, borderRadius:9, padding:'10px 14px', border:`1px solid ${K.secBorder}` }}>
            <p style={{ fontSize:10, fontWeight:800, color:K.blue, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 5px' }}>{f.label}</p>
            <p style={{ fontSize:13, color:K.text, margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{f.val}</p>
          </div>
        ))}

        <div style={{ display:'flex', gap:8 }}>
          <button className="kl-btn" onClick={onEdit}
            style={{ flex:1, padding:'11px', borderRadius:10, border:`1px solid ${K.blue}30`, background:K.blueDim, color:K.blue, fontWeight:800, cursor:'pointer' }}>
            ✏️ Edite
          </button>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, fontWeight:700, cursor:'pointer' }}>
            Fèmen
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function ConsultationPage() {
  const qc = useQueryClient()
  const [search,    setSearch]    = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page,      setPage]      = useState(1)
  const [modal,     setModal]     = useState(null)
  const [selId,     setSelId]     = useState(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = KLINIK_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 380)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['klinik-consults', debSearch, page],
    queryFn:  () => consultAPI.getAll({ search: debSearch || undefined, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const consults   = data?.consultations || []
  const total      = data?.total          || 0
  const totalPages = Math.ceil(total / 20) || 1
  const refresh    = () => qc.invalidateQueries(['klinik-consults'])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>

      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:K.blue, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}>
            <Stethoscope size={19}/> Konsiltasyon
          </h1>
          <p style={{ fontSize:11, color:K.muted, margin:0 }}>Nòt medikal ak dyagnostik</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={refresh}
            style={{ width:36, height:36, borderRadius:10, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button className="kl-btn" onClick={() => { setSelId(null); setModal('create') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13, boxShadow:`0 4px 14px rgba(14,165,233,0.25)` }}>
            <Plus size={15}/> Nouvo Konsiltasyon
          </button>
        </div>
      </div>

      <div style={{ position:'relative' }}>
        <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:K.muted, pointerEvents:'none' }}/>
        <input className="kl-input" style={{ ...inputStyle, paddingLeft:38 }}
          placeholder="Chèche pasyan oswa dyagnostik..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {isLoading ? (
        <div style={{ textAlign:'center', padding:40, color:K.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <KSpinner color={K.blue} size={18}/> Ap chaje...
        </div>
      ) : !consults.length ? (
        <div style={{ textAlign:'center', padding:50, background:K.card, borderRadius:16, border:`1px dashed ${K.cardBorder}` }}>
          <Stethoscope size={34} style={{ opacity:0.2, margin:'0 auto 10px', display:'block', color:K.blue }}/>
          <p style={{ fontSize:13, fontWeight:700, color:K.muted, margin:0 }}>Pa gen konsiltasyon</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {consults.map(c => (
            <div key={c.id} className="kl-row" onClick={() => { setSelId(c.id); setModal('detail') }}
              style={{ background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:12, padding:'12px 14px', cursor:'pointer', animation:'kFadeUp 0.2s ease' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:K.blueDim, border:`1px solid ${K.blueBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:K.blue }}>
                  {c.patient?.prenom?.[0]}{c.patient?.nom?.[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:K.text, margin:0 }}>{c.patient?.prenom} {c.patient?.nom}</p>
                    <KBadge statut={c.statut} cfg={STATUT_KONSULT}/>
                  </div>
                  {c.diagnostic && <p style={{ fontSize:12, color:K.teal, margin:'2px 0', fontWeight:600 }}>🔍 {c.diagnostic}</p>}
                  {c.motif      && <p style={{ fontSize:11, color:K.muted, margin:0 }}>{c.motif}</p>}
                  <p style={{ fontSize:10, color:K.muted, margin:'4px 0 0' }}>Dr. {c.doctorName} • {fmtDate(c.date)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:K.muted }}>{total} konsiltasyon</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="kl-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:page===1?'default':'pointer', opacity:page===1?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={14}/>
            </button>
            <span style={{ fontSize:12, fontWeight:700, color:K.text, minWidth:50, textAlign:'center' }}>{page}/{totalPages}</span>
            <button className="kl-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:page===totalPages?'default':'pointer', opacity:page===totalPages?0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {modal === 'create' && <ModalConsult onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'edit'   && selId && (
        <ModalConsultEdit consultId={selId} onClose={() => setModal(null)} onSuccess={refresh}/>
      )}
      {modal === 'detail' && selId && (
        <ModalDetailConsult consultId={selId} onClose={() => setModal(null)}
          onEdit={() => setModal('edit')}/>
      )}
    </div>
  )
}

function ModalConsultEdit({ consultId, onClose, onSuccess }) {
  const { data: consult } = useQuery({
    queryKey: ['klinik-consult', consultId],
    queryFn:  () => consultAPI.getOne(consultId).then(r => r.data.consultation),
  })
  if (!consult) return null
  return <ModalConsult consult={consult} onClose={onClose} onSuccess={onSuccess}/>
}
