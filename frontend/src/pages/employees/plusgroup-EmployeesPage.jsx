// src/pages/employees/EmployeesPage.jsx — PLUS GROUP
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, RefreshCw, X, Users, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const S = {
  wrap:   { padding:'24px', fontFamily:'DM Sans, sans-serif', maxWidth:1100, margin:'0 auto' },
  card:   { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'20px 22px' },
  input:  { width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #E5E7EB', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' },
  label:  { display:'block', fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' },
  btnPri: { display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#1e40af,#3B82F6)', color:'#fff', fontWeight:800, fontSize:13 },
  btnSec: { padding:'10px 16px', borderRadius:10, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:13, color:'#6B7280' },
}

const STATUT_COLORS = {
  actif:   { color:'#059669', bg:'#ECFDF5', label:'Aktif'   },
  inactif: { color:'#6B7280', bg:'#F9FAFB', label:'Inaktif' },
  conge:   { color:'#D97706', bg:'#FFFBEB', label:'Konje'   },
}

function ModalEmp({ emp, onClose, onSuccess }) {
  const isEdit = !!emp?.id
  const [nom,          setNom]          = useState(emp?.nom          || '')
  const [prenom,       setPrenom]       = useState(emp?.prenom       || '')
  const [titre,        setTitre]        = useState(emp?.titre        || '')
  const [telephone,    setTelephone]    = useState(emp?.telephone    || '')
  const [email,        setEmail]        = useState(emp?.email        || '')
  const [salaire,      setSalaire]      = useState(emp?.salaire      || '')
  const [dateEmbauche, setDateEmbauche] = useState(emp?.date_embauche ? emp.date_embauche.split('T')[0] : '')
  const [statut,       setStatut]       = useState(emp?.statut       || 'actif')
  const [notes,        setNotes]        = useState(emp?.notes        || '')

  const mutation = useMutation({
    mutationFn: d => isEdit ? api.put(`/pg-employees/${emp.id}`, d) : api.post('/pg-employees', d),
    onSuccess: () => { toast.success(isEdit ? '✅ Mizajou!' : '✅ Anplwaye ajoute!'); onSuccess(); onClose() },
    onError: e => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!nom.trim())   { toast.error('Nom obligatwa.');   return }
    if (!titre.trim()) { toast.error('Titre obligatwa.'); return }
    mutation.mutate({ nom, prenom, titre, telephone, email, salaire: salaire || null, dateEmbauche: dateEmbauche || null, statut, notes })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 48px rgba(0,0,0,0.15)' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#1e40af,#3B82F6,#06B6D4)' }}/>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👤</div>
            <div>
              <h3 style={{ color:'#111827', margin:0, fontSize:15, fontWeight:800 }}>{isEdit ? 'Edite Anplwaye' : 'Nouvo Anplwaye'}</h3>
              <p style={{ color:'#9CA3AF', margin:'1px 0 0', fontSize:11 }}>Enfòmasyon anplwaye a</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280' }}><X size={14}/></button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'18px 22px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={S.label}>Prenom</label>
                <input style={S.input} value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Marie"/>
              </div>
              <div>
                <label style={S.label}>Nom *</label>
                <input style={S.input} value={nom} onChange={e => setNom(e.target.value)} placeholder="Pierre"/>
              </div>
            </div>
            <div>
              <label style={S.label}>Titre / Pòs *</label>
              <input style={S.input} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Kesye, Direktè, Jaden..."/>
              <p style={{ fontSize:10, color:'#9CA3AF', margin:'3px 0 0' }}>Ou ka kreye nenpòt tit — li pa obligatwa.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={S.label}>Telefòn</label>
                <input style={S.input} value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+509 3000-0000"/>
              </div>
              <div>
                <label style={S.label}>Email</label>
                <input type="email" style={S.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="emp@biznis.ht"/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={S.label}>Salè (HTG) — opsyonèl</label>
                <input type="number" min="0" style={S.input} value={salaire} onChange={e => setSalaire(e.target.value)} placeholder="0.00"/>
              </div>
              <div>
                <label style={S.label}>Dat Anbòch</label>
                <input type="date" style={S.input} value={dateEmbauche} onChange={e => setDateEmbauche(e.target.value)}/>
              </div>
            </div>
            <div>
              <label style={S.label}>Statut</label>
              <div style={{ display:'flex', gap:8 }}>
                {Object.entries(STATUT_COLORS).map(([k,v]) => (
                  <button key={k} onClick={() => setStatut(k)}
                    style={{ flex:1, padding:'9px', borderRadius:9, border:`1.5px solid ${statut===k ? v.color : '#E5E7EB'}`, background: statut===k ? v.bg : '#fff', color: statut===k ? v.color : '#6B7280', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Nòt</label>
              <textarea style={{ ...S.input, height:56, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon..."/>
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ ...S.btnSec, flex:1 }}>Anile</button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            style={{ ...S.btnPri, flex:2, justifyContent:'center', opacity:mutation.isPending?0.7:1 }}>
            {mutation.isPending ? 'Ap sove...' : <><Users size={14}/> {isEdit ? 'Sove' : 'Ajoute Anplwaye'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeesPage() {
  const qc = useQueryClient()
  const tenant = useAuthStore(s => s.tenant)
  const [modal, setModal] = useState(null)
  const [selEmp, setSelEmp] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const { data, isLoading } = useQuery({
    queryKey: ['pg-employees', search, page],
    queryFn: () => api.get('/pg-employees', { params: { search, page, limit: LIMIT } }).then(r => r.data),
    keepPreviousData: true,
  })
  const emps       = data?.employees || []
  const total      = data?.total     || 0
  const totalPages = Math.ceil(total / LIMIT) || 1
  const refresh    = () => qc.invalidateQueries(['pg-employees'])
  useEffect(() => setPage(1), [search])

  const mutDelete = useMutation({
    mutationFn: id => api.delete(`/pg-employees/${id}`),
    onSuccess: () => { toast.success('Anplwaye efase.'); refresh() },
    onError: e => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const totalSalaire = emps.filter(e => e.statut==='actif').reduce((s,e) => s + Number(e.salaire||0), 0)
  const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'

  return (
    <div style={S.wrap}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#111827', margin:0, display:'flex', alignItems:'center', gap:8 }}>
            <Users size={22} style={{ color:'#3B82F6' }}/> Anplwaye
          </h1>
          <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>{total} anplwaye · {tenant?.name}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={refresh} style={{ ...S.btnSec, width:38, height:38, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button onClick={() => { setSelEmp(null); setModal('create') }} style={S.btnPri}>
            <Plus size={15}/> Nouvo Anplwaye
          </button>
        </div>
      </div>

      {/* Mas salè */}
      {totalSalaire > 0 && (
        <div style={{ ...S.card, background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', borderColor:'#BFDBFE', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#3B82F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💰</div>
          <div>
            <p style={{ fontSize:11, color:'#6B7280', fontWeight:700, textTransform:'uppercase', margin:0 }}>Mas Salè Mensyèl (Anplwaye Aktif)</p>
            <p style={{ fontSize:24, fontWeight:900, color:'#1e40af', margin:'2px 0 0' }}>{totalSalaire.toLocaleString()} <span style={{ fontSize:14, fontWeight:400 }}>HTG</span></p>
          </div>
        </div>
      )}

      {/* Rechèch */}
      <div style={{ position:'relative', marginBottom:16 }}>
        <Search size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
        <input style={{ ...S.input, paddingLeft:38 }} placeholder="Chèche pa non, tit..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Lis */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Ap chaje...</div>
      ) : emps.length === 0 ? (
        <div style={{ ...S.card, textAlign:'center', padding:60 }}>
          <Users size={40} style={{ color:'#E5E7EB', margin:'0 auto 12px', display:'block' }}/>
          <p style={{ fontSize:14, fontWeight:700, color:'#9CA3AF', margin:0 }}>
            {search ? `Okenn anplwaye pou "${search}"` : 'Pa gen anplwaye ankò'}
          </p>
          {!search && <button onClick={() => setModal('create')} style={{ ...S.btnPri, margin:'16px auto 0', justifyContent:'center' }}><Plus size={13}/> Ajoute Premye Anplwaye</button>}
        </div>
      ) : (
        <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                {['Anplwaye', 'Titre', 'Telefòn', 'Salè', 'Dat Anbòch', 'Statut', ''].map((h,i) => (
                  <th key={i} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emps.map((e, i) => {
                const st = STATUT_COLORS[e.statut] || STATUT_COLORS.actif
                return (
                  <tr key={e.id} style={{ borderBottom: i < emps.length-1 ? '1px solid #F3F4F6' : 'none' }}
                    onMouseEnter={ev => ev.currentTarget.style.background='#F9FAFB'}
                    onMouseLeave={ev => ev.currentTarget.style.background=''}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:9, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#3B82F6' }}>
                          {(e.prenom?.[0]||e.nom?.[0]||'?').toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>{e.prenom} {e.nom}</p>
                          {e.email && <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }}>{e.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#374151' }}>{e.titre}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#6B7280' }}>{e.telephone || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#1e40af' }}>
                      {e.salaire ? `${Number(e.salaire).toLocaleString()} G` : <span style={{ color:'#9CA3AF', fontWeight:400 }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'#6B7280' }}>{fmtDate(e.date_embauche)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, color:st.color, background:st.bg }}>{st.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setSelEmp(e); setModal('edit') }}
                          style={{ width:30, height:30, borderRadius:7, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280' }}>
                          <Edit2 size={12}/>
                        </button>
                        <button onClick={() => { if(window.confirm('Efase anplwaye sa a?')) mutDelete.mutate(e.id) }}
                          style={{ width:30, height:30, borderRadius:7, border:'1px solid #FEE2E2', background:'#FFF5F5', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#EF4444' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:20 }}>
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ ...S.btnSec, padding:'8px 12px' }}><ChevronLeft size={14}/></button>
          <span style={{ fontSize:12, color:'#6B7280' }}>Paj <strong>{page}</strong> / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ ...S.btnSec, padding:'8px 12px' }}><ChevronRight size={14}/></button>
        </div>
      )}

      {modal && <ModalEmp emp={modal==='create'?null:selEmp} onClose={() => { setModal(null); setSelEmp(null) }} onSuccess={refresh}/>}
      <style>{`input:focus,textarea:focus{border-color:#3B82F6!important;box-shadow:0 0 0 2px rgba(59,130,246,0.1)!important;} select option{background:#fff;}`}</style>
    </div>
  )
}
