// src/pages/founise/FounisePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { founiseAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Truck, Wallet, ShoppingBag, X, Search,
} from 'lucide-react'

// ✅ Menm palèt/tokens ak paj Fakti a (NewInvoicePage.jsx) — pou tout paj
// yo gen menm lè pwofesyonèl la.
const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.18)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  red:'#C0392B', redBg:'rgba(192,57,43,0.08)',
  shadow:'0 2px 14px rgba(27,42,143,0.06)',
  heroGrad:'linear-gradient(115deg,#0F1A5C 0%,#1B2A8F 55%,#2D3FBF 100%)',
  shadowLift:'0 10px 24px rgba(27,42,143,0.16)',
}

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid rgba(27,42,143,0.20)`, outline:'none',
  fontSize:13, color:D.text, background:'#FFFFFF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
  transition:'border-color 0.15s ease, background 0.15s ease',
}
const inpMoney = {
  ...inp,
  border:`1.5px solid rgba(27,42,143,0.28)`,
  fontFamily:'monospace', fontWeight:800, color:D.blueDk,
  background:'#F7F8FF',
}
const label = (txt) => (
  <label style={{ display:'block', fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{txt}</label>
)
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── Modal senp (rezoud pou tout fòm — Founisè / Enjeksyon Kapital) ─────────
const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(15,26,92,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
    <div style={{ background:D.white, borderRadius:18, padding:24, width:'100%', maxWidth:420, boxShadow:D.shadowLift, maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <h3 style={{ color:D.text, fontSize:15, fontWeight:900, margin:0 }}>{title}</h3>
        <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, border:'none', background:D.blueDim, color:D.blue, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={15}/>
        </button>
      </div>
      {children}
    </div>
  </div>
)

// ── Fòm Nouvo Founisè ────────────────────────────────────────────────────
const FounisModal = ({ onClose, onSaved }) => {
  const { register, handleSubmit } = useForm()
  const mutation = useMutation({
    mutationFn: (data) => founiseAPI.create(data),
    onSuccess: () => { toast.success('Founisè anrejistre.'); onSaved() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan anrejistreman an.'),
  })
  return (
    <Modal title="Nouvo Founisè" onClose={onClose}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>{label('Non Founisè *')}<input className="input" style={inp} {...register('non', { required: true })} placeholder="Egz. Distribisyon Karayib"/></div>
        <div>{label('Telefòn')}<input className="input" style={inp} {...register('telefon')} placeholder="+509 ..."/></div>
        <div>{label('Email')}<input className="input" style={inp} {...register('email')} placeholder="kontak@founise.com"/></div>
        <div>{label('Adrès')}<input className="input" style={inp} {...register('adres')} placeholder="Vil, katye..."/></div>
        <div>{label('Nòt')}<textarea className="input" style={{ ...inp, minHeight:70, resize:'vertical' }} {...register('notes')}/></div>
        <button type="submit" disabled={mutation.isPending} style={{ marginTop:6, padding:'12px', borderRadius:12, border:'none', background:D.blue, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
          {mutation.isPending ? 'N ap sove...' : 'Anrejistre Founisè'}
        </button>
      </form>
    </Modal>
  )
}

// ── Fòm Enjeksyon Kapital ────────────────────────────────────────────────
const KapitalModal = ({ onClose, onSaved }) => {
  const { register, handleSubmit } = useForm()
  const mutation = useMutation({
    mutationFn: (data) => founiseAPI.injectKapital({ ...data, montant: Number(data.montant) }),
    onSuccess: () => { toast.success('Kapital enjekte.'); onSaved() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan enjeksyon an.'),
  })
  return (
    <Modal title="Enjekte Kapital" onClose={onClose}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>{label('Montan (HTG) *')}<input type="number" step="0.01" min="0.01" style={inpMoney} {...register('montant', { required: true, min: 0.01 })} placeholder="0.00" autoFocus/></div>
        <div>{label('Nòt (opsyonèl)')}<input style={inp} {...register('notes')} placeholder="Egz. Kapital inisyal, ogmantasyon..."/></div>
        <button type="submit" disabled={mutation.isPending} style={{ marginTop:6, padding:'12px', borderRadius:12, border:'none', background:D.gold, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
          {mutation.isPending ? 'N ap sove...' : 'Konfime Enjeksyon'}
        </button>
      </form>
    </Modal>
  )
}

// ── Fòm Nouvo Achte ──────────────────────────────────────────────────────
const AchteModal = ({ founiseList, onClose, onSaved }) => {
  const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: { kantite: '', priKoutInite: '' } })
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const { data: productsData } = useQuery({
    queryKey: ['products-search-achte', search],
    queryFn: () => productAPI.getAll({ search, limit: 8 }),
    enabled: search.length >= 2,
  })
  const products = productsData?.data?.products || []

  const kantite = Number(watch('kantite')) || 0
  const priKout = Number(watch('priKoutInite')) || 0
  const total = kantite * priKout

  const mutation = useMutation({
    mutationFn: (data) => founiseAPI.createAchte(data),
    onSuccess: () => { toast.success('Achte anrejistre — estòk ak kapital ajou.'); onSaved() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan achte a.'),
  })

  const onSubmit = (d) => {
    mutation.mutate({
      founiseId: d.founiseId,
      productId: selectedProduct?.id || null,
      deskripsyon: selectedProduct ? undefined : d.deskripsyon,
      kantite: Number(d.kantite),
      priKoutInite: Number(d.priKoutInite),
      notes: d.notes,
    })
  }

  return (
    <Modal title="Nouvo Achte" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          {label('Founisè *')}
          <select style={inp} {...register('founiseId', { required: true })}>
            <option value="">— Chwazi founisè —</option>
            {founiseList.map(f => <option key={f.id} value={f.id}>{f.non}</option>)}
          </select>
        </div>

        <div style={{ position:'relative' }}>
          {label('Pwodwi (opsyonèl — kite vid si se yon depans jeneral)')}
          {selectedProduct ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, background:D.blueDim, border:`1.5px solid ${D.blue}` }}>
              <span style={{ fontSize:13, fontWeight:700, color:D.text }}>{selectedProduct.name}</span>
              <button type="button" onClick={() => { setSelectedProduct(null); setSearch('') }} style={{ background:'none', border:'none', color:D.blue, cursor:'pointer' }}><X size={15}/></button>
            </div>
          ) : (
            <>
              <div style={{ position:'relative' }}>
                <Search size={14} color={D.muted} style={{ position:'absolute', left:12, top:12 }}/>
                <input style={{ ...inp, paddingLeft:34 }} value={search}
                  onChange={e => { setSearch(e.target.value); setShowResults(true) }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Chèche yon pwodwi nan estòk..."/>
              </div>
              {showResults && products.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, background:'#fff', borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:180, overflowY:'auto', marginTop:4 }}>
                  {products.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProduct(p); setValue('priKoutInite', Number(p.costPriceHtg || 0)); setShowResults(false) }}
                      style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:`1px solid ${D.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {p.name} <span style={{ color:D.muted, fontSize:11 }}>· stòk: {p.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!selectedProduct && (
          <div>{label('Deskripsyon (si pa gen pwodwi)')}<input style={inp} {...register('deskripsyon')} placeholder="Egz. Materyèl anbalaj"/></div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>{label('Kantite *')}<input type="number" step="0.001" min="0.001" style={inpMoney} {...register('kantite', { required: true, min: 0.001 })} placeholder="0"/></div>
          <div>{label('Pri Kout Inite (HTG) *')}<input type="number" step="0.01" min="0" style={inpMoney} {...register('priKoutInite', { required: true, min: 0 })} placeholder="0.00"/></div>
        </div>

        <div style={{ padding:'12px 16px', borderRadius:12, background:D.blueDim, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>Total Achte</span>
          <span style={{ fontSize:18, fontWeight:900, color:D.blueDk, fontFamily:'monospace' }}>{fmt(total)} HTG</span>
        </div>

        <div>{label('Nòt (opsyonèl)')}<input style={inp} {...register('notes')}/></div>

        <button type="submit" disabled={mutation.isPending} style={{ marginTop:6, padding:'12px', borderRadius:12, border:'none', background:D.orange, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
          {mutation.isPending ? 'N ap sove...' : 'Konfime Achte'}
        </button>
      </form>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════════════
// PAJ PRENSIPAL
// ════════════════════════════════════════════════════════════════════════
export default function FounisePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { tenant } = useAuthStore()
  const qc = useQueryClient()

  const [modal, setModal] = useState(null) // 'founise' | 'kapital' | 'achte' | null

  const { data: kapitalData } = useQuery({ queryKey: ['founise-kapital'], queryFn: () => founiseAPI.getKapital() })
  const { data: founiseData } = useQuery({ queryKey: ['founise-list'], queryFn: () => founiseAPI.getAll() })
  const { data: achteData }   = useQuery({ queryKey: ['founise-achte'], queryFn: () => founiseAPI.getAchte({ limit: 20 }) })

  const kapital = kapitalData?.data?.kapital || { disponib: 0, totalEnjeksyon: 0, totalAchte: 0 }
  const founiseList = founiseData?.data?.founise || []
  const achteList = achteData?.data?.achte || []

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['founise-kapital'] })
    qc.invalidateQueries({ queryKey: ['founise-list'] })
    qc.invalidateQueries({ queryKey: ['founise-achte'] })
    qc.invalidateQueries({ queryKey: ['dashboard-full'] })
    setModal(null)
  }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding: isMobile ? '16px' : '24px' }}>
      {/* Banner/masthead — menm resèt ak paj Fakti a */}
      <div style={{
        position:'relative', overflow:'hidden',
        background: D.heroGrad, borderRadius: isMobile ? 18 : 22,
        padding: isMobile ? '18px 18px' : '26px 30px',
        marginBottom: isMobile ? 18 : 26,
        boxShadow:'0 14px 34px rgba(15,26,92,0.28)',
      }}>
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.9, pointerEvents:'none' }}>
          <path d="M -20 150 C 140 60, 340 210, 620 70" stroke={D.orange} strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 180 C 160 100, 360 240, 620 110" stroke={D.gold} strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap: isMobile ? 12 : 16 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.22)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
            <ArrowLeft size={17}/>
          </button>
          <div style={{ width: isMobile ? 42 : 50, height: isMobile ? 42 : 50, borderRadius:14, flexShrink:0, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 18px rgba(255,107,0,0.35)' }}>
            <Truck size={isMobile ? 19 : 23} color="#fff"/>
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize: isMobile ? 9 : 10, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', margin:'0 0 3px' }}>{tenant?.name || 'Founisè'}</p>
            <h1 style={{ color:'#fff', fontSize: isMobile ? 19 : 25, fontWeight:900, margin:0, letterSpacing:'-0.01em' }}>Founisè & Kapital</h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize: isMobile ? 11 : 13, margin:'3px 0 0' }}>Jere achte, estòk, ak kapital biznis ou</p>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: isMobile ? 16 : 20 }}>

        {/* Kapital */}
        <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent:'space-between', alignItems: isMobile ? 'stretch' : 'center', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Wallet size={20} color={D.blue}/>
              </div>
              <div>
                <p style={{ color:D.muted, fontSize:10, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 3px' }}>Kapital Disponib</p>
                <p style={{ color: kapital.disponib < 0 ? D.red : D.blueDk, fontSize: isMobile ? 24 : 30, fontWeight:900, margin:0, fontFamily:'monospace' }}>
                  {fmt(kapital.disponib)} <span style={{ fontSize:14, fontWeight:700, color:D.muted }}>HTG</span>
                </p>
              </div>
            </div>
            <button onClick={() => setModal('kapital')} style={{ padding:'12px 18px', borderRadius:12, border:'none', background:D.gold, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift, display:'flex', alignItems:'center', justifyContent:'center', gap:6, whiteSpace:'nowrap' }}>
              <Plus size={15}/> Enjekte Kapital
            </button>
          </div>
          <div style={{ display:'flex', gap:20, marginTop:16, paddingTop:16, borderTop:`1px dashed ${D.border}` }}>
            <div>
              <p style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', margin:'0 0 2px' }}>Total Enjekte</p>
              <p style={{ fontSize:14, fontWeight:800, color:D.success, margin:0, fontFamily:'monospace' }}>+{fmt(kapital.totalEnjeksyon)}</p>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', margin:'0 0 2px' }}>Total Achte</p>
              <p style={{ fontSize:14, fontWeight:800, color:D.red, margin:0, fontFamily:'monospace' }}>−{fmt(kapital.totalAchte)}</p>
            </div>
          </div>
        </div>

        {/* Founisè */}
        <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Truck size={14} color={D.blue}/>
              </div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Founisè ({founiseList.length})</h3>
            </div>
            <button onClick={() => setModal('founise')} style={{ padding:'9px 14px', borderRadius:10, border:`1.5px solid ${D.blue}`, background:'#fff', color:D.blue, fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <Plus size={14}/> Ajoute
            </button>
          </div>
          {founiseList.length === 0 ? (
            <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen founisè anrejistre ankò.</p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap:10 }}>
              {founiseList.map(f => (
                <div key={f.id} style={{ padding:'12px 14px', borderRadius:12, border:`1px solid ${D.border}`, background:'#FAFBFF' }}>
                  <p style={{ fontWeight:800, fontSize:13, color:D.text, margin:'0 0 3px' }}>{f.non}</p>
                  {f.telefon && <p style={{ fontSize:12, color:D.muted, margin:0 }}>{f.telefon}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achte */}
        <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ShoppingBag size={14} color={D.blue}/>
              </div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Achte Resan</h3>
            </div>
            <button onClick={() => setModal('achte')} disabled={founiseList.length === 0}
              style={{ padding:'9px 14px', borderRadius:10, border:'none', background: founiseList.length === 0 ? D.blueDim2 : D.orange, color: founiseList.length === 0 ? D.muted : '#fff', fontWeight:800, fontSize:12, cursor: founiseList.length === 0 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <Plus size={14}/> Nouvo Achte
            </button>
          </div>
          {founiseList.length === 0 && (
            <p style={{ color:D.muted, fontSize:12, marginBottom:14 }}>Ajoute yon founisè anvan pou w ka anrejistre yon achte.</p>
          )}
          {achteList.length === 0 ? (
            <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen achte anrejistre ankò.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {achteList.map(a => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:12, border:`1px solid ${D.border}` }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:800, fontSize:13, color:D.text, margin:'0 0 2px' }}>{a.product?.name || a.deskripsyon || 'Achte'}</p>
                    <p style={{ fontSize:11, color:D.muted, margin:0 }}>{a.founise?.non} · {Number(a.kantite)} × {fmt(a.pri_kout_inite)} HTG</p>
                  </div>
                  <p style={{ fontWeight:900, fontSize:14, color:D.blueDk, fontFamily:'monospace', margin:0, whiteSpace:'nowrap' }}>{fmt(a.total_htg)} HTG</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal === 'founise' && <FounisModal onClose={() => setModal(null)} onSaved={refreshAll}/>}
      {modal === 'kapital' && <KapitalModal onClose={() => setModal(null)} onSaved={refreshAll}/>}
      {modal === 'achte' && <AchteModal founiseList={founiseList} onClose={() => setModal(null)} onSaved={refreshAll}/>}
    </div>
  )
}