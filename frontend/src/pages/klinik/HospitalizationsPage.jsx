// src/pages/klinik/HospitalizationsPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  K, KLINIK_STYLES, KModal, KSection, KBadge, KSpinner,
  inputStyle, labelStyle, fmtDate, fmtDateTime,
  STATUT_HOSP, GROUPE_SANGUIN_LABELS,
} from './klinikShared.jsx'
import { BedDouble, Plus, RefreshCw, ChevronLeft, ChevronRight, Search, LogOut } from 'lucide-react'

const hospAPI = {
  getAll:   (p)    => api.get('/klinik/hospitalizations', { params: p }),
  getOne:   (id)   => api.get(`/klinik/hospitalizations/${id}`),
  create:   (d)    => api.post('/klinik/hospitalizations', d),
  update:   (id,d) => api.put(`/klinik/hospitalizations/${id}`, d),
  decharge: (id,d) => api.patch(`/klinik/hospitalizations/${id}/decharge`, d),
}
const patAPI = { search: (s) => api.get('/klinik/patients', { params: { search: s, limit: 8 } }) }

// ─── Modal Admèt Pasyan ───────────────────────────────────────
function ModalAdmisyon({ hosp, onClose, onSuccess }) {
  const isEdit = !!hosp?.id
  const [patSearch,   setPatSearch]   = useState(hosp?.patient ? `${hosp.patient.prenom} ${hosp.patient.nom}` : '')
  const [patResults,  setPatResults]  = useState([])
  const [patSelected, setPatSelected] = useState(hosp?.patient || null)
  const [form, setForm] = useState({
    doctorName:    hosp?.doctorName    || '',
    motifAdmission:hosp?.motifAdmission|| '',
    chambre:       hosp?.chambre       || '',
    lit:           hosp?.lit           || '',
    notes:         hosp?.notes         || '',
    statut:        hosp?.statut        || 'admis',
  })
  const set = (k,v) => setForm(p => ({ ...p, [k]:v }))

  useEffect(() => {
    if (!patSearch || patSelected) return
    const t = setTimeout(async () => {
      const r = await patAPI.search(patSearch)
      setPatResults(r.data.patients || [])
    }, 300)
    return () => clearTimeout(t)
  }, [patSearch, patSelected])

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? hospAPI.update(hosp.id, d) : hospAPI.create(d),
    onSuccess: () => { toast.success(isEdit ? '✅ Mizajou!' : '✅ Pasyan admèt!'); onSuccess(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!patSelected && !isEdit) { toast.error('Chwazi yon pasyan.'); return }
    if (!form.doctorName.trim()) { toast.error('Non doktè obligatwa.'); return }
    if (!form.motifAdmission.trim()) { toast.error('Motif admisyon obligatwa.'); return }
    mutation.mutate({ patientId: patSelected?.id || hosp?.patientId, ...form })
  }

  return (
    <KModal onClose={onClose} title={isEdit ? '✏️ Edite Ospitalizasyon' : '🛏️ Admèt Pasyan'} width={540}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {!isEdit && (
          <KSection icon="👤" title="Pasyan">
            {patSelected ? (
              <div style={{ background:K.blueDim, borderRadius:9, padding:'10px 12px', border:`1px solid ${K.blueBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{patSelected.prenom} {patSelected.nom}</p>
                  {patSelected.allergies && <p style={{ fontSize:11, color:K.orange, margin:'2px 0 0' }}>⚠ {patSelected.allergies}</p>}
                  <p style={{ fontSize:11, color:K.muted, margin:'2px 0 0' }}>GS: {GROUPE_SANGUIN_LABELS[patSelected.groupeSanguin]}</p>
                </div>
                <button onClick={() => { setPatSelected(null); setPatSearch('') }} style={{ background:'none', border:'none', cursor:'pointer', color:K.muted }}>✕</button>
              </div>
            ) : (
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:K.muted }}/>
                <input className="kl-input" style={{ ...inputStyle, paddingLeft:36 }} placeholder="Chèche pasyan..."
                  value={patSearch} onChange={e => { setPatSearch(e.target.value); setPatSelected(null) }}/>
                {patResults.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:9, marginTop:4, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                    {patResults.map(p => (
                      <button key={p.id} onClick={() => { setPatSelected(p); setPatResults([]) }}
                        style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.05)`, textAlign:'left', color:K.text, fontSize:13 }}>
                        {p.prenom} {p.nom}
                        <span style={{ color:K.muted, marginLeft:8 }}>{p.numeroDossier}</span>
                        {p.allergies && <span style={{ color:K.orange, marginLeft:8, fontSize:11 }}>⚠ {p.allergies}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </KSection>
        )}

        <KSection icon="🏥" title="Detay Admisyon">
          <div>
            <label style={labelStyle}>Doktè Responsab *</label>
            <input className="kl-input" style={inputStyle} value={form.doctorName}
              onChange={e => set('doctorName', e.target.value)} placeholder="Dr. Marie..."/>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Motif Admisyon *</label>
            <textarea className="kl-input" style={{ ...inputStyle, height:64, resize:'vertical' }}
              value={form.motifAdmission} onChange={e => set('motifAdmission', e.target.value)}
              placeholder="Rezon ospitalizasyon an..."/>
          </div>
          <div className="kl-frow" style={{ marginTop:10 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Chanm</label>
              <input className="kl-input" style={inputStyle} value={form.chambre}
                onChange={e => set('chambre', e.target.value)} placeholder="ex: 101, B-2..."/>
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Li</label>
              <input className="kl-input" style={inputStyle} value={form.lit}
                onChange={e => set('lit', e.target.value)} placeholder="ex: A, 1..."/>
            </div>
            {isEdit && (
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Statut</label>
                <select className="kl-input" style={{ ...inputStyle, cursor:'pointer' }}
                  value={form.statut} onChange={e => set('statut', e.target.value)}>
                  <option value="admis">Admis</option>
                  <option value="en_soin">An Swen</option>
                  <option value="transfere">Transf.</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Nòt</label>
            <textarea className="kl-input" style={{ ...inputStyle, height:52, resize:'vertical' }}
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Obsèvasyon..."/>
          </div>
        </KSection>

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="kl-btn" onClick={handleSubmit} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:mutation.isPending?0.6:1 }}>
            {mutation.isPending ? <><KSpinner/> Ap sove...</> : isEdit ? '✅ Sove' : <><BedDouble size={15}/> Admèt Pasyan</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ─── Modal Decharge ───────────────────────────────────────────
function ModalDecharge({ hosp, onClose, onSuccess }) {
  const [diagnosticFinal, setDiagnosticFinal] = useState(hosp.diagnosticFinal || '')
  const [notes,           setNotes]           = useState(hosp.notes || '')

  const mutation = useMutation({
    mutationFn: () => hospAPI.decharge(hosp.id, { diagnosticFinal, notes }),
    onSuccess: () => { toast.success('✅ Pasyan decharge!'); onSuccess(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  return (
    <KModal onClose={onClose} title={`🏠 Decharge — ${hosp.patient?.prenom} ${hosp.patient?.nom}`} width={480}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:K.orangeBg, border:`1px solid ${K.orange}30`, borderRadius:9, padding:'10px 14px', fontSize:12, color:K.orange }}>
          ⚠️ Aksyon sa pap ka defèt. Pasyan an ap konsidere kòm sorti.
        </div>
        <div>
          <label style={labelStyle}>Dyagnostik Final</label>
          <textarea className="kl-input" style={{ ...inputStyle, height:72, resize:'vertical' }}
            value={diagnosticFinal} onChange={e => setDiagnosticFinal(e.target.value)}
            placeholder="Dyagnostik final anvan decharge..."/>
        </div>
        <div>
          <label style={labelStyle}>Nòt Decharge</label>
          <textarea className="kl-input" style={{ ...inputStyle, height:52, resize:'vertical' }}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Konsèy, swivi, nòt final..."/>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="kl-btn" onClick={() => mutation.mutate()} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${K.green},#16a34a)`, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:mutation.isPending?0.6:1 }}>
            {mutation.isPending ? <><KSpinner/> Ap trete...</> : <><LogOut size={15}/> Konfime Decharge</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function HospitalizationsPage() {
  const qc = useQueryClient()
  const [statut,  setStatut]  = useState('')
  const [page,    setPage]    = useState(1)
  const [modal,   setModal]   = useState(null)
  const [selHosp, setSelHosp] = useState(null)

  useEffect(() => {
    const el = document.createElement('style'); el.textContent = KLINIK_STYLES
    document.head.appendChild(el); return () => document.head.removeChild(el)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['klinik-hosp', statut, page],
    queryFn:  () => hospAPI.getAll({ statut: statut || undefined, page, limit:20 }).then(r => r.data),
    keepPreviousData: true,
    refetchInterval: 60000,
  })

  const hosps      = data?.hospitalizations || []
  const total      = data?.total             || 0
  const totalPages = Math.ceil(total / 20)   || 1
  const refresh    = () => qc.invalidateQueries(['klinik-hosp'])

  const jousHosp = (dateAdmission) => Math.floor((Date.now() - new Date(dateAdmission)) / 86400000)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>
      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:K.blue, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}><BedDouble size={19}/> Ospitalizasyon</h1>
          <p style={{ fontSize:11, color:K.muted, margin:0 }}>Admisyon, suivi ak decharge pasyan</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={refresh} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><RefreshCw size={14}/></button>
          <button className="kl-btn" onClick={() => { setSelHosp(null); setModal('admisyon') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13 }}>
            <Plus size={15}/> Admèt Pasyan
          </button>
        </div>
      </div>

      {/* Filtre */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {[{val:'',label:'Tout'},{val:'admis',label:'Admis'},{val:'en_soin',label:'An Swen'},{val:'sorti',label:'Sorti'}].map(s => (
          <button key={s.val} className="kl-btn" onClick={() => { setStatut(s.val); setPage(1) }}
            style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${statut===s.val ? K.blue+'60' : K.cardBorder}`, background: statut===s.val ? K.blueDim : 'transparent', color: statut===s.val ? K.blue : K.muted, cursor:'pointer', fontWeight:700, fontSize:11 }}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign:'center', padding:40, color:K.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <KSpinner color={K.blue} size={18}/> Ap chaje...
        </div>
      ) : !hosps.length ? (
        <div style={{ textAlign:'center', padding:50, background:K.card, borderRadius:16, border:`1px dashed ${K.cardBorder}` }}>
          <BedDouble size={34} style={{ opacity:0.2, margin:'0 auto 10px', display:'block', color:K.blue }}/>
          <p style={{ fontSize:13, fontWeight:700, color:K.muted, margin:0 }}>Pa gen ospitalizasyon</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {hosps.map(h => {
            const jous = jousHosp(h.dateAdmission)
            const isActif = h.statut === 'admis' || h.statut === 'en_soin'
            return (
              <div key={h.id} style={{ background:K.card, border:`1px solid ${isActif ? K.red+'25' : K.cardBorder}`, borderRadius:12, padding:'12px 14px', animation:'kFadeUp 0.2s ease' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  {/* Avatar + jous */}
                  <div style={{ width:50, height:50, borderRadius:12, flexShrink:0, background: isActif ? K.redBg : 'rgba(255,255,255,0.05)', border:`1px solid ${isActif ? K.red+'30' : 'rgba(255,255,255,0.08)'}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color: isActif ? K.red : K.muted, lineHeight:1 }}>{isActif ? jous : '✓'}</span>
                    {isActif && <span style={{ fontSize:9, color:K.muted }}>jou</span>}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:K.text, margin:0 }}>{h.patient?.prenom} {h.patient?.nom}</p>
                      <span style={{ fontSize:10, color:K.red, fontWeight:800, fontFamily:'monospace' }}>GS: {GROUPE_SANGUIN_LABELS[h.patient?.groupeSanguin]}</span>
                      <KBadge statut={h.statut} cfg={STATUT_HOSP}/>
                    </div>
                    <p style={{ fontSize:12, color:K.muted, margin:'2px 0 0' }}>{h.motifAdmission}</p>
                    <p style={{ fontSize:11, color:K.muted, margin:'3px 0 0' }}>
                      Dr. {h.doctorName}
                      {h.chambre && ` • Chanm ${h.chambre}`}
                      {h.lit && ` / Li ${h.lit}`}
                      {' • '}Admis {fmtDate(h.dateAdmission)}
                      {h.dateDecharge && ` → Sorti ${fmtDate(h.dateDecharge)}`}
                    </p>
                  </div>
                </div>

                {isActif && (
                  <div style={{ display:'flex', gap:6, marginTop:10, paddingTop:10, borderTop:`1px solid rgba(239,68,68,0.1)` }}>
                    <button className="kl-btn" onClick={() => { setSelHosp(h); setModal('admisyon') }}
                      style={{ padding:'7px 13px', borderRadius:8, border:`1px solid ${K.cardBorder}`, background:'rgba(255,255,255,0.03)', color:K.muted, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                      ✏️ Edite
                    </button>
                    <button className="kl-btn" onClick={() => { setSelHosp(h); setModal('decharge') }}
                      style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${K.green}30`, background:K.greenBg, color:K.green, cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <LogOut size={13}/> Decharge
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:K.muted }}>{total} ospitalizasyon</span>
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

      {modal === 'admisyon' && <ModalAdmisyon hosp={selHosp} onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'decharge' && selHosp && <ModalDecharge hosp={selHosp} onClose={() => setModal(null)} onSuccess={refresh}/>}
    </div>
  )
}
