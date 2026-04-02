// src/pages/klinik/LabPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  K, KLINIK_STYLES, KModal, KSection, KBadge, KSpinner,
  inputStyle, labelStyle, fmtDate, fmtDateTime,
  STATUT_LAB, TESTS_LAB_COMMUNS,
} from './klinikShared.jsx'
import { FlaskConical, Plus, Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, AlertCircle, Check } from 'lucide-react'

const labAPI = {
  getAll:         (p)        => api.get('/klinik/lab-orders', { params: p }),
  create:         (d)        => api.post('/klinik/lab-orders', d),
  update:         (id, d)    => api.put(`/klinik/lab-orders/${id}`, d),
  saveResultat:   (orderId, itemId, d) =>
    api.patch(`/klinik/lab-orders/${orderId}/items/${itemId}/resultat`, d),
}
const patAPI = { search: (s) => api.get('/klinik/patients', { params: { search: s, limit: 8 } }) }

// ─── Modal Kreye / Edite Kòmand Lab ──────────────────────────
function ModalLabOrder({ order, onClose, onSuccess }) {
  const isEdit = !!order?.id
  const [patSearch,   setPatSearch]   = useState(order?.patient ? `${order.patient.prenom} ${order.patient.nom}` : '')
  const [patResults,  setPatResults]  = useState([])
  const [patSelected, setPatSelected] = useState(order?.patient || null)
  const [doctorName,  setDoctorName]  = useState(order?.doctorName || '')
  const [notes,       setNotes]       = useState(order?.notes || '')
  const [items,       setItems]       = useState(
    order?.items?.length ? order.items.map(i => ({ testNom:i.testNom, testCode:i.testCode||'', valeurNormale:i.valeurNormale||'' }))
    : [{ testNom:'', testCode:'', valeurNormale:'' }]
  )

  useEffect(() => {
    if (!patSearch || patSelected) return
    const t = setTimeout(async () => {
      const r = await patAPI.search(patSearch)
      setPatResults(r.data.patients || [])
    }, 300)
    return () => clearTimeout(t)
  }, [patSearch, patSelected])

  const addItem    = () => setItems(p => [...p, { testNom:'', testCode:'', valeurNormale:'' }])
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i))
  const setItem    = (i, k, v) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]:v } : item))
  const addPreset  = (test) => {
    if (items.find(i => i.testNom === test.nom)) return
    setItems(p => [...p.filter(i => i.testNom), { testNom:test.nom, testCode:test.code, valeurNormale:'' }])
  }

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? labAPI.update(order.id, d) : labAPI.create(d),
    onSuccess: () => { toast.success(isEdit ? '✅ Kòmand mizajou!' : '✅ Kòmand kreye!'); onSuccess(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!patSelected && !isEdit) { toast.error('Chwazi yon pasyan.'); return }
    if (!doctorName.trim()) { toast.error('Non doktè obligatwa.'); return }
    const validItems = items.filter(i => i.testNom.trim())
    if (!validItems.length) { toast.error('Ajoute omwen yon tès.'); return }
    mutation.mutate({ patientId: patSelected?.id || order?.patientId, doctorName, notes, items: validItems })
  }

  return (
    <KModal onClose={onClose} title={isEdit ? '✏️ Edite Kòmand Lab' : '🔬 Nouvo Kòmand Laboratwa'} width={600}>
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
                        style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', borderBottom:`1px solid rgba(255,255,255,0.05)`, textAlign:'left', color:K.text, fontSize:13 }}>
                        {p.prenom} {p.nom} <span style={{ color:K.muted }}>— {p.numeroDossier}</span>
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

        {/* Tès predefini */}
        <div>
          <label style={labelStyle}>Tès Komen (klike pou ajoute)</label>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4 }}>
            {TESTS_LAB_COMMUNS.slice(0, 8).map(t => (
              <button key={t.code} className="kl-btn" onClick={() => addPreset(t)}
                style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${K.cardBorder}`, background:'rgba(255,255,255,0.04)', color:K.muted, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                {t.nom.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        <KSection icon="🔬" title="Lis Tès">
          {items.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-end' }}>
              <div style={{ flex:2 }}>
                {i === 0 && <label style={labelStyle}>Tès *</label>}
                <input className="kl-input" style={inputStyle} value={item.testNom}
                  onChange={e => setItem(i, 'testNom', e.target.value)} placeholder="NFS, Glycémie..."/>
              </div>
              <div style={{ flex:1 }}>
                {i === 0 && <label style={labelStyle}>Valè Nòmal</label>}
                <input className="kl-input" style={inputStyle} value={item.valeurNormale}
                  onChange={e => setItem(i, 'valeurNormale', e.target.value)} placeholder="ex: 4-10"/>
              </div>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', cursor:'pointer', color:K.red, display:'flex', paddingBottom:11 }}>
                  <Trash2 size={14}/>
                </button>
              )}
            </div>
          ))}
          <button className="kl-btn" onClick={addItem}
            style={{ width:'100%', padding:'8px', borderRadius:9, border:`1px dashed ${K.orange}40`, background:'transparent', color:K.orange, cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Plus size={13}/> Ajoute Tès
          </button>
        </KSection>

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="kl-btn" onClick={handleSubmit} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:mutation.isPending?0.6:1 }}>
            {mutation.isPending ? <><KSpinner/> Ap sove...</> : <><FlaskConical size={15}/> {isEdit ? 'Sove' : 'Kreye Kòmand'}</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ─── Modal Antre Rezilta ──────────────────────────────────────
function ModalResultat({ order, onClose, onSuccess }) {
  const [items, setItems] = useState(order.items?.map(i => ({
    ...i, valeur: i.valeur || '', unite: i.unite || '', estAnormal: i.estAnormal || false, notesResultat: i.notesResultat || '',
  })) || [])
  const setItem = (i, k, v) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]:v } : item))

  const [loading, setLoading] = useState(false)
  const handleSave = async () => {
    setLoading(true)
    try {
      await Promise.all(
        items.map(item => labAPI.saveResultat(order.id, item.id, {
          valeur: item.valeur, unite: item.unite,
          estAnormal: item.estAnormal, notesResultat: item.notesResultat,
        }))
      )
      toast.success('✅ Rezilta anrejistre!')
      onSuccess(); onClose()
    } catch (e) {
      toast.error('Erè pandan anrejistrasyon rezilta yo.')
    } finally { setLoading(false) }
  }

  return (
    <KModal onClose={onClose} title={`🔬 Rezilta — ${order.patient?.prenom} ${order.patient?.nom}`} width={560}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ background:'rgba(255,255,255,0.03)', borderRadius:9, padding:'12px', border:`1px solid ${item.estAnormal ? K.red+'40' : 'rgba(255,255,255,0.07)'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <p style={{ fontSize:13, fontWeight:700, color:K.text, margin:0 }}>{item.testNom}</p>
              {item.valeurNormale && <span style={{ fontSize:10, color:K.muted }}>Nòmal: {item.valeurNormale}</span>}
            </div>
            <div className="kl-frow">
              <div style={{ flex:2 }}>
                <label style={labelStyle}>Rezilta *</label>
                <input className="kl-input" style={{ ...inputStyle, borderColor: item.estAnormal ? K.red+'50' : undefined, color: item.estAnormal ? K.red : K.text }}
                  value={item.valeur} onChange={e => setItem(i, 'valeur', e.target.value)} placeholder="Antre valè..."/>
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Inite</label>
                <input className="kl-input" style={inputStyle} value={item.unite}
                  onChange={e => setItem(i, 'unite', e.target.value)} placeholder="g/L, mmol/L..."/>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                <input type="checkbox" checked={item.estAnormal} onChange={e => setItem(i, 'estAnormal', e.target.checked)}/>
                <span style={{ fontSize:12, color: item.estAnormal ? K.red : K.muted, fontWeight: item.estAnormal ? 700 : 400 }}>
                  {item.estAnormal ? '⚠ Anòmal' : 'Nòmal'}
                </span>
              </label>
            </div>
          </div>
        ))}

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="kl-btn" onClick={handleSave} disabled={loading}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:loading?0.6:1 }}>
            {loading ? <><KSpinner/> Ap sove...</> : <><Check size={15}/> Konfime Rezilta</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function LabPage() {
  const qc = useQueryClient()
  const [statut,  setStatut]  = useState('')
  const [page,    setPage]    = useState(1)
  const [modal,   setModal]   = useState(null)
  const [selOrder,setSelOrder]= useState(null)

  useEffect(() => {
    const el = document.createElement('style'); el.textContent = KLINIK_STYLES
    document.head.appendChild(el); return () => document.head.removeChild(el)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['klinik-lab', statut, page],
    queryFn:  () => labAPI.getAll({ statut: statut || undefined, page, limit:20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const orders     = data?.labOrders || []
  const total      = data?.total      || 0
  const totalPages = Math.ceil(total / 20) || 1
  const refresh    = () => qc.invalidateQueries(['klinik-lab'])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>
      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:K.blue, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}><FlaskConical size={19}/> Laboratwa</h1>
          <p style={{ fontSize:11, color:K.muted, margin:0 }}>Kòmand tès ak rezilta</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={refresh} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><RefreshCw size={14}/></button>
          <button className="kl-btn" onClick={() => { setSelOrder(null); setModal('create') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13 }}>
            <Plus size={15}/> Nouvo Kòmand
          </button>
        </div>
      </div>

      {/* Filtre statut */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {[{val:'',label:'Tout'}, {val:'en_attente',label:'An Atant'}, {val:'en_cours',label:'An Kous'}, {val:'complete',label:'Konplè'}].map(s => (
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
      ) : !orders.length ? (
        <div style={{ textAlign:'center', padding:50, background:K.card, borderRadius:16, border:`1px dashed ${K.cardBorder}` }}>
          <FlaskConical size={34} style={{ opacity:0.2, margin:'0 auto 10px', display:'block', color:K.blue }}/>
          <p style={{ fontSize:13, fontWeight:700, color:K.muted, margin:0 }}>Pa gen kòmand lab</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {orders.map(o => (
            <div key={o.id} style={{ background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:12, padding:'12px 14px', animation:'kFadeUp 0.2s ease' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:9, background:K.orangeBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🔬</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:K.text, margin:0 }}>{o.patient?.prenom} {o.patient?.nom}</p>
                    <KBadge statut={o.statut} cfg={STATUT_LAB}/>
                    {o.items?.some(i => i.estAnormal) && <span style={{ fontSize:10, color:K.red, fontWeight:700, background:K.redBg, padding:'1px 6px', borderRadius:4 }}>⚠ Anòmal</span>}
                  </div>
                  <p style={{ fontSize:11, color:K.muted, margin:'2px 0 0' }}>Dr. {o.doctorName} • {fmtDate(o.dateCommande)}</p>
                  <div style={{ marginTop:5, display:'flex', gap:4, flexWrap:'wrap' }}>
                    {o.items?.map((item, i) => (
                      <span key={i} style={{ fontSize:10, color: item.estAnormal ? K.red : K.orange, background: item.estAnormal ? K.redBg : K.orangeBg, padding:'1px 7px', borderRadius:4, fontWeight:600 }}>
                        {item.testNom}{item.valeur ? `: ${item.valeur}${item.unite ? ' '+item.unite : ''}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:10, paddingTop:10, borderTop:`1px solid rgba(14,165,233,0.08)` }}>
                {o.statut !== 'complete' && (
                  <button className="kl-btn" onClick={() => { setSelOrder(o); setModal('resultat') }}
                    style={{ flex:1, padding:'7px', borderRadius:8, border:`1px solid ${K.green}30`, background:K.greenBg, color:K.green, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                    Antre Rezilta
                  </button>
                )}
                <button className="kl-btn" onClick={() => { setSelOrder(o); setModal('edit') }}
                  style={{ padding:'7px 13px', borderRadius:8, border:`1px solid ${K.cardBorder}`, background:'rgba(255,255,255,0.03)', color:K.muted, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                  ✏️ Edite
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'create'   && <ModalLabOrder onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'edit'     && selOrder && <ModalLabOrder order={selOrder} onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'resultat' && selOrder && <ModalResultat order={selOrder} onClose={() => setModal(null)} onSuccess={refresh}/>}
    </div>
  )
}
