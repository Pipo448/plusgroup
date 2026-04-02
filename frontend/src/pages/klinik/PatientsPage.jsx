// src/pages/klinik/PatientsPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  K, KLINIK_STYLES, KStatCard, KModal, KSection, KBadge, KSpinner,
  inputStyle, labelStyle, fmtDate, fmtDateTime, age,
  GROUPE_SANGUIN_LABELS, SEXE_LABELS, STATUT_RDV, STATUT_KONSULT,
} from './klinikShared.jsx'
import {
  Users, Search, Plus, Eye, RefreshCw, X,
  Phone, MapPin, Droplets, AlertTriangle,
  ChevronLeft, ChevronRight, UserPlus, FileText,
} from 'lucide-react'

const pAPI = {
  getAll:  (p) => api.get('/klinik/patients', { params: p }),
  getOne:  (id) => api.get(`/klinik/patients/${id}`),
  create:  (d)  => api.post('/klinik/patients', d),
  update:  (id, d) => api.put(`/klinik/patients/${id}`, d),
}

const GROUPES = ['A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG','INCONNU']
const SEXES   = ['M','F','AUTRE']

// ─── Modal Kreye / Edite Pasyan ───────────────────────────────
function ModalPasyan({ pasyan, onClose, onSuccess }) {
  const isEdit = !!pasyan?.id
  const [form, setForm] = useState({
    nom: '', prenom: '', dateNaissance: '', sexe: 'M',
    telephone: '', email: '', adresse: '',
    groupeSanguin: 'INCONNU', allergies: '',
    antecedentsMed: '', antecedentsChir: '', antecedentsFam: '',
    assurance: '', numAssurance: '', notes: '',
    ...(pasyan || {}),
    dateNaissance: pasyan?.dateNaissance ? pasyan.dateNaissance.split('T')[0] : '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? pAPI.update(pasyan.id, d) : pAPI.create(d),
    onSuccess: (res) => {
      toast.success(isEdit ? '✅ Pasyan mizajou!' : `✅ Pasyan kreye — ${res.data.patient.numeroDossier}`)
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error('Non ak prenon obligatwa.'); return }
    const data = { ...form }
    if (!data.dateNaissance) delete data.dateNaissance
    mutation.mutate(data)
  }

  return (
    <KModal onClose={onClose} title={isEdit ? `✏️ Edite — ${pasyan.numeroDossier}` : '👤 Nouvo Pasyan'} width={600}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        <KSection icon="👤" title="Idantite">
          <div className="kl-frow">
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Prenon *</label>
              <input className="kl-input" style={inputStyle} value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Prenon..." />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Non *</label>
              <input className="kl-input" style={inputStyle} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Non..." />
            </div>
          </div>
          <div className="kl-frow" style={{ marginTop:10 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Dat Nesans</label>
              <input type="date" className="kl-input" style={inputStyle} value={form.dateNaissance} onChange={e => set('dateNaissance', e.target.value)} />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Sèks</label>
              <select className="kl-input" style={{ ...inputStyle, cursor:'pointer' }} value={form.sexe} onChange={e => set('sexe', e.target.value)}>
                {SEXES.map(s => <option key={s} value={s}>{SEXE_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="kl-frow" style={{ marginTop:10 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Telefòn</label>
              <input className="kl-input" style={inputStyle} inputMode="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+509 XXXX XXXX" />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Email</label>
              <input className="kl-input" style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@..." />
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Adrès</label>
            <input className="kl-input" style={inputStyle} value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Vil, Depatman..." />
          </div>
        </KSection>

        <KSection icon="🩸" title="Enfòmasyon Medikal">
          <div className="kl-frow">
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Gwoup Sanguin</label>
              <select className="kl-input" style={{ ...inputStyle, cursor:'pointer' }} value={form.groupeSanguin} onChange={e => set('groupeSanguin', e.target.value)}>
                {GROUPES.map(g => <option key={g} value={g}>{GROUPE_SANGUIN_LABELS[g]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Alèji</label>
            <input className="kl-input" style={inputStyle} value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Penicilline, Aspirin..." />
          </div>
          <div style={{ marginTop:10 }}>
            <label style={labelStyle}>Antesede Medikal</label>
            <textarea className="kl-input" style={{ ...inputStyle, height:60, resize:'vertical' }} value={form.antecedentsMed} onChange={e => set('antecedentsMed', e.target.value)} placeholder="Dyabèt, ipètansyon, tibèkiloz..." />
          </div>
          <div className="kl-frow" style={{ marginTop:10 }}>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Antesede Chirurjikal</label>
              <input className="kl-input" style={inputStyle} value={form.antecedentsChir} onChange={e => set('antecedentsChir', e.target.value)} placeholder="Apanndis 2019..." />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Antesede Fanmi</label>
              <input className="kl-input" style={inputStyle} value={form.antecedentsFam} onChange={e => set('antecedentsFam', e.target.value)} placeholder="Kansè, kadyopati..." />
            </div>
          </div>
        </KSection>

        <KSection icon="🛡️" title="Asirans">
          <div className="kl-frow">
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Konpayi Asirans</label>
              <input className="kl-input" style={inputStyle} value={form.assurance} onChange={e => set('assurance', e.target.value)} placeholder="Chibas, UniMed..." />
            </div>
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Nimewo Asirans</label>
              <input className="kl-input" style={inputStyle} value={form.numAssurance} onChange={e => set('numAssurance', e.target.value)} placeholder="ASS-XXXXX" />
            </div>
          </div>
        </KSection>

        <div>
          <label style={labelStyle}>Nòt Adisyonèl</label>
          <textarea className="kl-input" style={{ ...inputStyle, height:52, resize:'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Lòt enfòmasyon..." />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button className="kl-btn" onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button className="kl-btn" onClick={handleSubmit} disabled={mutation.isPending}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:14, opacity:mutation.isPending ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            {mutation.isPending ? <><KSpinner /> Ap sove...</> : isEdit ? '✅ Sove Chanjman' : <><UserPlus size={15}/> Kreye Pasyan</>}
          </button>
        </div>
      </div>
    </KModal>
  )
}

// ─── Modal Detay Pasyan ────────────────────────────────────────
function ModalDetailPasyan({ pasyanId, onClose, onEdit }) {
  const { data: pasyan, isLoading } = useQuery({
    queryKey: ['klinik-patient', pasyanId],
    queryFn:  () => pAPI.getOne(pasyanId).then(r => r.data.patient),
    enabled: !!pasyanId,
  })

  if (isLoading || !pasyan) return (
    <KModal onClose={onClose} title="Dosye Pasyan">
      <div style={{ textAlign:'center', padding:40, color:K.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <KSpinner color={K.blue} size={18}/> Ap chaje...
      </div>
    </KModal>
  )

  const gs  = GROUPE_SANGUIN_LABELS[pasyan.groupeSanguin] || '?'
  const gsColor = ['A_NEG','B_NEG','AB_NEG','O_NEG'].includes(pasyan.groupeSanguin) ? K.red : K.red

  return (
    <KModal onClose={onClose} title={`📋 ${pasyan.numeroDossier}`} width={620}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Bannè */}
        <div style={{ background:K.blueBtn, borderRadius:14, padding:'14px 16px', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, flexShrink:0 }}>
                {pasyan.prenom?.[0]}{pasyan.nom?.[0]}
              </div>
              <div>
                <p style={{ fontSize:17, fontWeight:900, margin:0 }}>{pasyan.prenom} {pasyan.nom}</p>
                <p style={{ fontSize:10, opacity:0.75, margin:'2px 0 0', fontFamily:'monospace' }}>{pasyan.numeroDossier}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap', fontSize:11 }}>
              {pasyan.dateNaissance && <span>🎂 {age(pasyan.dateNaissance)} • {fmtDate(pasyan.dateNaissance)}</span>}
              <span>⚧ {SEXE_LABELS[pasyan.sexe]}</span>
              {pasyan.telephone && <span>📱 {pasyan.telephone}</span>}
            </div>
          </div>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(239,68,68,0.3)', border:'2px solid rgba(239,68,68,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', fontWeight:900, fontSize:14 }}>
              {gs}
            </div>
            <p style={{ fontSize:9, opacity:0.7, margin:'3px 0 0' }}>GS</p>
          </div>
        </div>

        {/* Alèji — siyalman */}
        {pasyan.allergies && (
          <div style={{ background:K.orangeBg, border:`1px solid ${K.orange}40`, borderRadius:10, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
            <AlertTriangle size={14} style={{ color:K.orange, flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ fontSize:11, fontWeight:800, color:K.orange, margin:'0 0 2px', textTransform:'uppercase' }}>Alèji</p>
              <p style={{ fontSize:12, color:'#f0b84a', margin:0, lineHeight:1.5 }}>{pasyan.allergies}</p>
            </div>
          </div>
        )}

        {/* Antesede */}
        {(pasyan.antecedentsMed || pasyan.antecedentsChir || pasyan.antecedentsFam) && (
          <div className="kl-grid-3">
            {[
              { label:'Medikal',     val:pasyan.antecedentsMed   },
              { label:'Chirurjikal', val:pasyan.antecedentsChir  },
              { label:'Fanmi',       val:pasyan.antecedentsFam   },
            ].filter(x => x.val).map(x => (
              <div key={x.label} style={{ background:K.secBg, borderRadius:10, padding:'10px 12px', border:`1px solid ${K.secBorder}` }}>
                <p style={{ fontSize:10, fontWeight:800, color:K.muted, textTransform:'uppercase', margin:'0 0 4px' }}>{x.label}</p>
                <p style={{ fontSize:12, color:K.text, margin:0, lineHeight:1.5 }}>{x.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Dènye konsiltasyon */}
        {pasyan.consultations?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:800, color:K.muted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>Dènye Konsiltasyon ({pasyan.consultations.length})</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
              {pasyan.consultations.slice(0, 5).map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:K.blue, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:K.text, margin:0 }}>{c.diagnostic || c.motif || 'Konsiltasyon'}</p>
                    <p style={{ fontSize:10, color:K.muted, margin:'1px 0 0' }}>{fmtDate(c.date)} • Dr {c.doctorName}</p>
                  </div>
                  <KBadge statut={c.statut} cfg={STATUT_KONSULT}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton */}
        <div style={{ display:'flex', gap:8 }}>
          <button className="kl-btn" onClick={onEdit}
            style={{ flex:1, padding:'11px', borderRadius:10, border:`1px solid ${K.blue}30`, background:K.blueDim, color:K.blue, fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            ✏️ Edite
          </button>
          <button className="kl-btn" onClick={onClose}
            style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:K.muted, fontWeight:700, fontSize:13, cursor:'pointer' }}>
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
export default function PatientsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const [search,    setSearch]    = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page,      setPage]      = useState(1)
  const [modal,     setModal]     = useState(searchParams.get('new') === '1' ? 'create' : null)
  const [selId,     setSelId]     = useState(null)
  const searchRef = useRef(null)

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
    queryKey: ['klinik-patients', debSearch, page],
    queryFn:  () => pAPI.getAll({ search: debSearch || undefined, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const patients   = data?.patients || []
  const total      = data?.total    || 0
  const totalPages = Math.ceil(total / 20) || 1
  const refresh    = () => qc.invalidateQueries(['klinik-patients'])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>

      {/* Header */}
      <div className="kl-header">
        <div>
          <h1 style={{ fontSize:19, fontWeight:900, color:K.blue, margin:'0 0 2px', display:'flex', alignItems:'center', gap:7 }}>
            <Users size={19}/> Pasyan
          </h1>
          <p style={{ fontSize:11, color:K.muted, margin:0 }}>Jere dosye medikal pasyan yo</p>
        </div>
        <div className="kl-hright">
          <button className="kl-btn" onClick={() => { refresh() }}
            style={{ width:36, height:36, borderRadius:10, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button className="kl-btn" onClick={() => setModal('create')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', background:K.blueBtn, color:'#fff', fontWeight:800, fontSize:13, boxShadow:`0 4px 14px rgba(14,165,233,0.25)`, whiteSpace:'nowrap' }}>
            <UserPlus size={15}/> Nouvo Pasyan
          </button>
        </div>
      </div>

      {/* Rechèch */}
      <div style={{ position:'relative' }}>
        <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:K.muted, pointerEvents:'none' }}/>
        <input ref={searchRef} className="kl-input" style={{ ...inputStyle, paddingLeft:38 }}
          placeholder="Chèche non, nimewo dossye, telefòn..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Kont */}
      {total > 0 && <p style={{ fontSize:11, color:K.muted, margin:0 }}>{total} pasyan • paj {page}/{totalPages}</p>}

      {/* Lis */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:40, color:K.muted, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <KSpinner color={K.blue} size={18}/> Ap chaje...
        </div>
      ) : !patients.length ? (
        <div style={{ textAlign:'center', padding:50, background:K.card, borderRadius:16, border:`1px dashed ${K.cardBorder}` }}>
          <Users size={34} style={{ opacity:0.2, margin:'0 auto 10px', display:'block', color:K.blue }}/>
          <p style={{ fontSize:13, fontWeight:700, color:K.muted, margin:0 }}>
            {search ? 'Pa jwenn rezilta' : 'Pa gen pasyan pou kounye a'}
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {patients.map(p => (
            <div key={p.id} className="kl-row" onClick={() => { setSelId(p.id); setModal('detail') }}
              style={{ background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:14, padding:'12px 14px', cursor:'pointer', boxShadow:K.shadow, transition:'background 0.15s', animation:'kFadeUp 0.2s ease' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {/* Avatar */}
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:K.blueDim, border:`1px solid ${K.blueBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:K.blue }}>
                  {p.prenom?.[0]?.toUpperCase()}{p.nom?.[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <p style={{ fontFamily:'monospace', fontSize:10, fontWeight:800, color:K.blue, margin:0 }}>{p.numeroDossier}</p>
                    {p.allergies && <span style={{ fontSize:9, color:K.orange, fontWeight:700, background:K.orangeBg, padding:'1px 6px', borderRadius:4 }}>⚠ Alèji</span>}
                  </div>
                  <p style={{ fontSize:14, fontWeight:700, color:K.text, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.prenom} {p.nom}
                  </p>
                  <div style={{ display:'flex', gap:10, marginTop:2, flexWrap:'wrap' }}>
                    {p.dateNaissance && <span style={{ fontSize:11, color:K.muted }}>{age(p.dateNaissance)}</span>}
                    {p.telephone     && <span style={{ fontSize:11, color:K.muted }}>📱 {p.telephone}</span>}
                    <span style={{ fontSize:11, color:K.muted }}>
                      {p._count?.consultations || 0} konsilt • {p._count?.appointments || 0} rdv
                    </span>
                  </div>
                </div>

                {/* Gwoup sanguin + Actions */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:13, color:K.red, background:K.redBg, padding:'2px 8px', borderRadius:20 }}>
                    {GROUPE_SANGUIN_LABELS[p.groupeSanguin]}
                  </span>
                  <p style={{ fontSize:10, color:K.muted, margin:0 }}>
                    {fmtDate(p.createdAt)}
                  </p>
                </div>
              </div>

              {/* Bouton aksyon */}
              <div style={{ display:'flex', gap:6, marginTop:10, paddingTop:10, borderTop:`1px solid rgba(14,165,233,0.08)` }}>
                <button className="kl-btn" onClick={e => { e.stopPropagation(); setSelId(p.id); setModal('detail') }}
                  style={{ flex:1, padding:'7px 6px', borderRadius:8, border:'none', background:K.blueDim, color:K.blue, cursor:'pointer', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                  <Eye size={12}/> Wè Dosye
                </button>
                <button className="kl-btn" onClick={e => { e.stopPropagation(); setSelId(p.id); setModal('edit') }}
                  style={{ padding:'7px 13px', borderRadius:8, border:`1px solid ${K.cardBorder}`, background:'rgba(255,255,255,0.03)', color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700 }}>
                  ✏️ Edite
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 2px' }}>
          <span style={{ fontSize:12, color:K.muted }}>{total} pasyan total</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="kl-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:page===1 ? 'default':'pointer', opacity:page===1 ? 0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={14}/>
            </button>
            <span style={{ fontSize:12, fontWeight:700, color:K.text, minWidth:50, textAlign:'center' }}>{page}/{totalPages}</span>
            <button className="kl-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${K.cardBorder}`, background:K.card, color:K.muted, cursor:page===totalPages ? 'default':'pointer', opacity:page===totalPages ? 0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && <ModalPasyan onClose={() => setModal(null)} onSuccess={refresh}/>}
      {modal === 'edit'   && selId && (
        <ModalPasyanEdit pasyanId={selId} onClose={() => setModal(null)} onSuccess={refresh}/>
      )}
      {modal === 'detail' && selId && (
        <ModalDetailPasyan pasyanId={selId} onClose={() => setModal(null)}
          onEdit={() => setModal('edit')}/>
      )}
    </div>
  )
}

// Wrapper pou edit — chaje pasyan anvan ouvri modal
function ModalPasyanEdit({ pasyanId, onClose, onSuccess }) {
  const { data: pasyan, isLoading } = useQuery({
    queryKey: ['klinik-patient', pasyanId],
    queryFn:  () => pAPI.getOne(pasyanId).then(r => r.data.patient),
  })
  if (isLoading) return null
  return <ModalPasyan pasyan={pasyan} onClose={onClose} onSuccess={onSuccess}/>
}
