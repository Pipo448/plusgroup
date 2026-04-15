// src/pages/expenses/ExpensesPage.jsx — PLUS GROUP
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Search, RefreshCw, X, Wallet, Trash2, Edit2, ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react'

const S = {
  wrap:   { padding:'24px', fontFamily:'DM Sans, sans-serif', maxWidth:1100, margin:'0 auto' },
  card:   { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'20px 22px' },
  input:  { width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #E5E7EB', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' },
  label:  { display:'block', fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' },
  btnPri: { display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#DC2626,#EF4444)', color:'#fff', fontWeight:800, fontSize:13 },
  btnSec: { padding:'10px 16px', borderRadius:10, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:13, color:'#6B7280' },
}

const CATEGORIES = ['Loye','Elektrisite','Dlo','Salè','Founisè','Transpò','Manje','Ekipman','Maketing','Lòt']
const CAT_ICONS = { Loye:'🏠', Elektrisite:'⚡', Dlo:'💧', Salè:'👥', Founisè:'📦', Transpò:'🚗', Manje:'🍽️', Ekipman:'🖥️', Maketing:'📢', Lòt:'💼' }
const CAT_COLORS = {
  Loye:'#7C3AED', Elektrisite:'#F59E0B', Dlo:'#0EA5E9', Salè:'#10B981',
  Founisè:'#6366F1', Transpò:'#F97316', Manje:'#EC4899', Ekipman:'#14B8A6',
  Maketing:'#8B5CF6', Lòt:'#6B7280'
}

function ModalDepans({ dep, onClose, onSuccess }) {
  const isEdit = !!dep?.id
  const [titre,      setTitre]      = useState(dep?.titre      || '')
  const [montant,    setMontant]    = useState(dep?.montant    || '')
  const [categorie,  setCategorie]  = useState(dep?.categorie  || 'Lòt')
  const [dateDepans, setDateDepans] = useState(dep?.date_depans ? dep.date_depans.split('T')[0] : new Date().toISOString().split('T')[0])
  const [notes,      setNotes]      = useState(dep?.notes      || '')

  const mutation = useMutation({
    mutationFn: d => isEdit ? api.put(`/pg-expenses/${dep.id}`, d) : api.post('/pg-expenses', d),
    onSuccess: () => { toast.success(isEdit ? '✅ Mizajou!' : '✅ Depans anrejistre!'); onSuccess(); onClose() },
    onError: e => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleSubmit = () => {
    if (!titre.trim()) { toast.error('Titre obligatwa.');  return }
    if (!montant)      { toast.error('Montant obligatwa.'); return }
    mutation.mutate({ titre, montant, categorie, dateDepans, notes })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 48px rgba(0,0,0,0.15)' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#DC2626,#EF4444,#F97316)' }}/>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💸</div>
            <div>
              <h3 style={{ color:'#111827', margin:0, fontSize:15, fontWeight:800 }}>{isEdit ? 'Edite Depans' : 'Nouvo Depans'}</h3>
              <p style={{ color:'#9CA3AF', margin:'1px 0 0', fontSize:11 }}>Anrejistre yon depans</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280' }}><X size={14}/></button>
        </div>
        <div style={{ padding:'18px 22px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={S.label}>Titre Depans *</label>
              <input style={S.input} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Loye mwa avril, Elektrisite..."/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={S.label}>Montant (HTG) *</label>
                <input type="number" min="0" style={S.input} value={montant} onChange={e => setMontant(e.target.value)} placeholder="0.00"/>
              </div>
              <div>
                <label style={S.label}>Dat Depans</label>
                <input type="date" style={S.input} value={dateDepans} onChange={e => setDateDepans(e.target.value)}/>
              </div>
            </div>
            <div>
              <label style={S.label}>Kategori</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategorie(c)}
                    style={{ padding:'8px 4px', borderRadius:8, border:`1.5px solid ${categorie===c ? CAT_COLORS[c] : '#E5E7EB'}`, background: categorie===c ? `${CAT_COLORS[c]}15` : '#fff', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
                    <div style={{ fontSize:16 }}>{CAT_ICONS[c]}</div>
                    <div style={{ fontSize:9, fontWeight:700, color: categorie===c ? CAT_COLORS[c] : '#6B7280', marginTop:2, lineHeight:1.2 }}>{c}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Nòt</label>
              <textarea style={{ ...S.input, height:56, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detay siplemantè..."/>
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ ...S.btnSec, flex:1 }}>Anile</button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            style={{ ...S.btnPri, flex:2, justifyContent:'center', opacity:mutation.isPending?0.7:1 }}>
            {mutation.isPending ? 'Ap sove...' : <><Wallet size={14}/> {isEdit ? 'Sove' : 'Anrejistre Depans'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [selDep, setSelDep] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // Dat mwa aktyèl
  const now = new Date()
  const [debutDate, setDebutDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [finDate, setFinDate] = useState(new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0])

  const { data, isLoading } = useQuery({
    queryKey: ['pg-expenses', filterCat, debutDate, finDate, page],
    queryFn: () => api.get('/pg-expenses', { params: { categorie: filterCat||undefined, debutDate, finDate, page, limit: LIMIT } }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: statsData } = useQuery({
    queryKey: ['pg-expenses-stats'],
    queryFn: () => api.get('/pg-expenses/stats').then(r => r.data),
  })

  const deps        = data?.expenses     || []
  const total       = data?.total        || 0
  const totalMontant = data?.totalMontant || 0
  const totalPages  = Math.ceil(total / LIMIT) || 1
  const statsMwa    = statsData?.totalMwa || 0
  const parCat      = statsData?.parCategorie || []

  const refresh = () => { qc.invalidateQueries(['pg-expenses']); qc.invalidateQueries(['pg-expenses-stats']) }
  useEffect(() => setPage(1), [filterCat, debutDate, finDate])

  const mutDelete = useMutation({
    mutationFn: id => api.delete(`/pg-expenses/${id}`),
    onSuccess: () => { toast.success('Depans efase.'); refresh() },
    onError: e => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'

  return (
    <div style={S.wrap}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#111827', margin:0, display:'flex', alignItems:'center', gap:8 }}>
            <TrendingDown size={22} style={{ color:'#EF4444' }}/> Depans
          </h1>
          <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>Kontwole tout depans biznis ou a</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={refresh} style={{ ...S.btnSec, width:38, height:38, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14}/>
          </button>
          <button onClick={() => { setSelDep(null); setModal('create') }} style={S.btnPri}>
            <Plus size={15}/> Nouvo Depans
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <div style={{ ...S.card, background:'linear-gradient(135deg,#FEF2F2,#FEE2E2)', borderColor:'#FECACA' }}>
          <p style={{ fontSize:11, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', margin:'0 0 4px' }}>Total Depans Mwa Sa</p>
          <p style={{ fontSize:26, fontWeight:900, color:'#DC2626', margin:0 }}>{statsMwa.toLocaleString()} <span style={{ fontSize:13, fontWeight:400 }}>HTG</span></p>
        </div>
        <div style={{ ...S.card }}>
          <p style={{ fontSize:11, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', margin:'0 0 4px' }}>Total Peryòd Chwazi</p>
          <p style={{ fontSize:26, fontWeight:900, color:'#EF4444', margin:0 }}>{totalMontant.toLocaleString()} <span style={{ fontSize:13, fontWeight:400 }}>HTG</span></p>
        </div>
        <div style={{ ...S.card }}>
          <p style={{ fontSize:11, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', margin:'0 0 8px' }}>Top Kategori Mwa Sa</p>
          {parCat.slice(0,2).map((c,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, color:'#374151' }}>{CAT_ICONS[c.categorie]} {c.categorie}</span>
              <span style={{ fontSize:12, fontWeight:700, color:CAT_COLORS[c.categorie]||'#6B7280' }}>{Number(c.total).toLocaleString()} G</span>
            </div>
          ))}
          {parCat.length === 0 && <p style={{ fontSize:12, color:'#9CA3AF', margin:0 }}>Pa gen done</p>}
        </div>
      </div>

      {/* Filtre */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div>
            <label style={{ ...S.label, marginBottom:3 }}>De</label>
            <input type="date" style={{ ...S.input, width:'auto' }} value={debutDate} onChange={e => setDebutDate(e.target.value)}/>
          </div>
          <div>
            <label style={{ ...S.label, marginBottom:3 }}>Rive</label>
            <input type="date" style={{ ...S.input, width:'auto' }} value={finDate} onChange={e => setFinDate(e.target.value)}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:18 }}>
          <button onClick={() => setFilterCat('')}
            style={{ ...S.btnSec, padding:'7px 12px', fontSize:11, background:filterCat===''?'#F3F4F6':'#fff', fontWeight:filterCat===''?800:600 }}>Tout</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${filterCat===c ? CAT_COLORS[c] : '#E5E7EB'}`, background:filterCat===c ? `${CAT_COLORS[c]}15` : '#fff', color:filterCat===c ? CAT_COLORS[c] : '#6B7280', cursor:'pointer', fontWeight:700, fontSize:11 }}>
              {CAT_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Lis */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Ap chaje...</div>
      ) : deps.length === 0 ? (
        <div style={{ ...S.card, textAlign:'center', padding:60 }}>
          <Wallet size={40} style={{ color:'#E5E7EB', margin:'0 auto 12px', display:'block' }}/>
          <p style={{ fontSize:14, fontWeight:700, color:'#9CA3AF', margin:0 }}>Pa gen depans pou peryòd sa a</p>
          <button onClick={() => setModal('create')} style={{ ...S.btnPri, margin:'16px auto 0', justifyContent:'center' }}>
            <Plus size={13}/> Ajoute Premye Depans
          </button>
        </div>
      ) : (
        <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                {['Dat', 'Titre', 'Kategori', 'Montant', 'Nòt', ''].map((h,i) => (
                  <th key={i} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deps.map((d, i) => {
                const cc = CAT_COLORS[d.categorie] || '#6B7280'
                return (
                  <tr key={d.id} style={{ borderBottom: i < deps.length-1 ? '1px solid #F3F4F6' : 'none' }}
                    onMouseEnter={ev => ev.currentTarget.style.background='#F9FAFB'}
                    onMouseLeave={ev => ev.currentTarget.style.background=''}>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'#6B7280', whiteSpace:'nowrap' }}>{fmtDate(d.date_depans)}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#111827' }}>{d.titre}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, color:cc, background:`${cc}15` }}>
                        {CAT_ICONS[d.categorie]} {d.categorie}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:14, fontWeight:900, color:'#DC2626' }}>{Number(d.montant).toLocaleString()} G</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'#9CA3AF', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.notes || '—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setSelDep(d); setModal('edit') }}
                          style={{ width:30, height:30, borderRadius:7, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280' }}>
                          <Edit2 size={12}/>
                        </button>
                        <button onClick={() => { if(window.confirm('Efase depans sa a?')) mutDelete.mutate(d.id) }}
                          style={{ width:30, height:30, borderRadius:7, border:'1px solid #FEE2E2', background:'#FFF5F5', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#EF4444' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:'#F9FAFB', borderTop:'2px solid #E5E7EB' }}>
                <td colSpan={3} style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#374151' }}>TOTAL — {total} depans</td>
                <td style={{ padding:'12px 16px', fontSize:15, fontWeight:900, color:'#DC2626' }}>{totalMontant.toLocaleString()} G</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
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

      {modal && <ModalDepans dep={modal==='create'?null:selDep} onClose={() => { setModal(null); setSelDep(null) }} onSuccess={refresh}/>}
      <style>{`input:focus,textarea:focus,select:focus{border-color:#EF4444!important;box-shadow:0 0 0 2px rgba(239,68,68,0.1)!important;}`}</style>
    </div>
  )
}
