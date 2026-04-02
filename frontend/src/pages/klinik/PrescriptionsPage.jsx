// src/pages/klinik/PrescriptionsPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  K, KLINIK_STYLES, KModal, KSection, KBadge, KSpinner,
  inputStyle, labelStyle, fmtDate, STATUT_KONSULT, TESTS_LAB_COMMUNS,
} from './klinikShared.jsx'
import { Pill, Plus, Search, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

const rxAPI = {
  getAll:  (p)    => api.get('/klinik/prescriptions', { params: p }),
  create:  (d)    => api.post('/klinik/prescriptions', d),
  update:  (id,d) => api.put(`/klinik/prescriptions/${id}`, d),
}
const patAPI = { search: (s) => api.get('/klinik/patients', { params: { search: s, limit: 8 } }) }

function ModalRx({ rx, onClose, onSuccess }) {
  const isEdit = !!rx?.id
  const [patSearch, setPatSearch] = useState(rx?.patient ? `${rx.patient.prenom} ${rx.patient.nom}` : '')
  const [patResults, setPatResults] = useState([])
  const [patSelected, setPatSelected] = useState(rx?.patient || null)
  const [doctorName, setDoctorName] = useState(rx?.doctorName || '')
  const [notes, setNotes] = useState(rx?.notes || '')
  const [items, setItems] = useState(rx?.items?.length ? rx.items : [{ medicamentNom:'', dosage:'', frequence:'', duree:'', instructions:'', quantite:1 }])

  useEffect(() => {
    if (!patSearch || patSelected) return
    const t = setTimeout(async () => {
      const r = await patAPI.search(patSearch)
      setPatResults(r.data.patients || [])
    }, 300)
    return () => clearTimeout(t)
  }, [patSearch, patSelected])

  const addItem    = () => setItems(p => [...p, { medicamentNom:'', dosage:'', frequence:'', duree:'', instructions:'', quantite:1 }])
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i))
  const setItem    = (i, k, v) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]:v } : item))

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? rxAPI.update(rx.id, d) : rxAPI.create(d),
    onSuccess: () => { toast.success(isEdit ? '✅ Preskripsyon mizajou!' : '✅ Preskripsyon kreye!'); onSuccess(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!patSelected && !isEdit) { toast.error('Chwazi yon pasyan.'); return }
    if (!doctorName.trim()) { toast.error('Non doktè obligatwa.'); return }
    if (!items.length || !items[0].medicamentNom) { toast.error('Ajoute omwen yon medikaman.'); return }
    mutation.mutate({ patientId: patSelected?.id || rx?.patientId, doctorName, notes, items })
  }

  return (
    <KModal onClose={onClose} title={isEdit ? '✏️ Edite Preskripsyon' : '💊 Nouvo Preskripsyon'} width={600}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {!isEdit && (
          <KSection icon="👤" title="Pasyan">
            {patSelected ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:K.blueDim, borderRadius:9 }}>
                <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{patSelected.prenom} {patSelected.nom}</p>
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
                        style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.05)`, textAlign:'left', color:K.text, fontSize:13, fontWeight:600 }}>
                        {p.prenom} {p.nom} <span style={{ color:K.muted, fontWeight:400 }}>— {p.numeroDossier}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </KSection>
        )}

        <div>
          <label style={labelStyle}>Non Doktè *</label>
          <input className="kl-input" style={inputStyle} value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Pierre..."/>
        </div>

        <KSection icon="💊" title="Medikaman">
          {items.map((item, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:9, padding:'12px', marginBottom:8, border:`1px solid rgba(255,255,255,0.07)` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:800, color:K.blue }}>Medikaman {i + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', cursor:'pointer', color:K.red, display:'flex' }}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
              <div className="kl-frow" style={{ marginBottom:8 }}>
                <div style={{ flex:2 }}>
                  <label style={labelStyle}>Non Medikaman *</label>
                  <input className="kl-input" style={inputStyle} value={item.medicamentNom}
                    onChange={e => setItem(i, 'medicamentNom', e.target.value)} placeholder="Amoxicilline, Paracetamol..."/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Dòz</label>
                  <input className="kl-input" style={inputStyle} value={item.dosage}
                    onChange={e => setItem(i, 'dosage', e.target.value)} placeholder="500mg"/>
                </div>
              </div>
              <div className="kl-frow">
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Frekans</label>
                  <input className="kl-input" style={inputStyle} value={item.frequence}
                    onChange={e => setItem(i, 'frequence', e.target.value)} placeholder="3 fwa pa jou"/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Dire</label>
                  <input className="kl-input" style={inputStyle} value={item.duree}
                    onChange={e => setItem(i, 'duree', e.target.value)} placeholder="7 jou"/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Kantite</label>
                  <input type="number" min="1" className="kl-input" style={inputStyle} value={item.quantite}
                    onChange={e => setItem(i, 'quantite', Number(e.target.value))}/>
                </div>
              </div>
              <div style={{ marginTop:8 }}>
                <label style={labelStyle}>Enstriksyon</label>
                <input className="kl-input" style={inputStyle} value={item.instructions}
                  onChange={e => setItem(i, 'instructions', e.target.value)} placeholder="Pran apre manje..."/>
              </div>
            </div>
          ))}
          <button className="kl-btn" onClick={addItem}
            style={{ width:'100%', padding:'9px', borderRadius:9, border:`1px dashed ${K.blue}40`, background:'transparent', color:K.blue, cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Plus size={13}/> Ajoute Medikaman
          </button>
        </KSection>

        <div>
          <label style={labelStyle}>Nòt</label>
          <textarea className="kl-input" style={{ ...inputStyle, height:52, resize:'vertical' }}
            value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enstriksyon siplemantè..."/>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="kl-btn" onClick={handleSubmit} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:mutation.isPending?0.6:1 }}>
            {mutation.isPending ? <><KSpinner/> Ap sove...</> : <><Pill size={15}/> {isEdit ? 'Sove' : 'Kreye Preskripsyon'}</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

export default function PrescriptionsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [selRx, setSelRx] = useState(null)

  useEffect(() => {
    const el = document.createElement('style'); el.textContent = KLINIK_STYLES
    document.head.appendChild(el); return () => document.head.removeChild(el)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 380)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['klinik-rx', debSearch, page],
    queryFn:  () => rxAPI.getAll({ page, limit:20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const rxs        = data?.prescriptions || []
  const total      = data?.total          || 0
  const totalPages = Math.ceil(total / 20) || 1
  const refresh    = () => qc.invalidateQueries(['klinik-rx'])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>
      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:K.blue, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}><Pill size={19}/> Preskripsyon</h1>
          <p style={{ fontSize:11, color:K.muted, margin:0 }}>Ordonans ak medikaman</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={refresh} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><RefreshCw size={14}/></button>
          <button className="kl-btn" onClick={() => { setSelRx(null); setModal('create') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13 }}>
            <Plus size={15}/> Nouvo Preskripsyon
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign:'center', padding:40, color:K.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <KSpinner color={K.blue} size={18}/> Ap chaje...
        </div>
      ) : !rxs.length ? (
        <div style={{ textAlign:'center', padding:50, background:K.card, borderRadius:16, border:`1px dashed ${K.cardBorder}` }}>
          <Pill size={34} style={{ opacity:0.2, margin:'0 auto 10px', display:'block', color:K.blue }}/>
          <p style={{ fontSize:13, fontWeight:700, color:K.muted, margin:0 }}>Pa gen preskripsyon</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {rxs.map(rx => (
            <div key={rx.id} className="kl-row" style={{ background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:12, padding:'12px 14px', cursor:'pointer', animation:'kFadeUp 0.2s ease' }}
              onClick={() => { setSelRx(rx); setModal('edit') }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:9, background:K.greenBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>💊</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{rx.patient?.prenom} {rx.patient?.nom}</p>
                  <p style={{ fontSize:11, color:K.muted, margin:'2px 0 0' }}>{rx.items?.length || 0} medikaman • Dr. {rx.doctorName} • {fmtDate(rx.date)}</p>
                  {rx.items?.slice(0,2).map((item, i) => (
                    <span key={i} style={{ fontSize:10, color:K.green, fontWeight:700, background:K.greenBg, padding:'1px 7px', borderRadius:4, marginRight:4, marginTop:3, display:'inline-block' }}>
                      {item.medicamentNom} {item.dosage}
                    </span>
                  ))}
                  {rx.items?.length > 2 && <span style={{ fontSize:10, color:K.muted }}>+{rx.items.length - 2} lòt</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'create' && <ModalRx onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'edit' && selRx && <ModalRx rx={selRx} onClose={() => setModal(null)} onSuccess={refresh}/>}
    </div>
  )
}
