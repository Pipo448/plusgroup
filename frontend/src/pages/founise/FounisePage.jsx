// src/pages/founise/FounisePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { founiseAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Truck, Wallet, ShoppingBag, X, Search, History, TrendingUp,
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
  const [founiseId, setFouniseId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([]) // [{ id, productId, name, deskripsyon, kantite, priKoutInite }]
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [manualDesc, setManualDesc] = useState('')
  // ✅ NOUVO — Lòt Frè (transpò, chaje/dechaje, elt.) mare ak menm achte a,
  // soti nan Kapital tou, men kòm kategori apa (pa melanje ak pri machandiz)
  const [fraAdisyonel, setFraAdisyonel] = useState('')
  const [fraDeskripsyon, setFraDeskripsyon] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['products-search-achte', search],
    queryFn: () => productAPI.getAll({ search, limit: 8 }),
    enabled: search.length >= 2,
  })
  const products = productsData?.data?.products || []

  const addProductLine = (p) => {
    setLines(ls => [...ls, {
      id: `p-${p.id}-${Date.now()}`,
      productId: p.id, name: p.name, deskripsyon: null,
      kantite: 1, priKoutInite: Number(p.costPriceHtg || 0),
      // ✅ NOUVO — pri vant aktyèl pwodwi a, pou kalkile benefis pwojte a
      priVant: Number(p.priceHtg || 0),
    }])
    setSearch(''); setShowResults(false)
  }
  const addManualLine = () => {
    if (!manualDesc.trim()) return
    setLines(ls => [...ls, {
      id: `m-${Date.now()}`,
      productId: null, name: manualDesc.trim(), deskripsyon: manualDesc.trim(),
      kantite: 1, priKoutInite: 0,
    }])
    setManualDesc('')
  }
  const updateLine = (id, patch) => setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
  const removeLine = (id) => setLines(ls => ls.filter(l => l.id !== id))

  const machandizTotal = lines.reduce((acc, l) => acc + (Number(l.kantite) || 0) * (Number(l.priKoutInite) || 0), 0)
  const grandTotal = machandizTotal + (Number(fraAdisyonel) || 0)
  // ✅ NOUVO — benefis pwojte: (pri vant aktyèl − pri kout) × kantite, pou
  // chak liy ki mare ak yon vrè pwodwi (liy manyèl yo pa gen pri vant pou konpare)
  const benefisTotal = lines.reduce((acc, l) => {
    if (l.priVant == null) return acc
    return acc + (Number(l.priVant) - (Number(l.priKoutInite) || 0)) * (Number(l.kantite) || 0)
  }, 0)

  const mutation = useMutation({
    mutationFn: (data) => founiseAPI.createAchteBatch(data),
    onSuccess: () => { toast.success(`${lines.length} atik anrejistre — estòk ak kapital ajou.`); onSaved() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan achte a.'),
  })

  const handleSubmit = () => {
    if (!founiseId) return toast.error('Chwazi yon founisè.')
    if (!lines.length) return toast.error('Ajoute omwen yon atik.')
    const bad = lines.find(l => !l.kantite || Number(l.kantite) <= 0 || l.priKoutInite === '' || Number(l.priKoutInite) < 0)
    if (bad) return toast.error('Verifye kantite ak pri kout chak liy.')
    mutation.mutate({
      founiseId,
      notes: notes.trim() || undefined,
      fraAdisyonel: Number(fraAdisyonel) || 0,
      fraDeskripsyon: fraDeskripsyon.trim() || undefined,
      lignes: lines.map(l => ({
        productId: l.productId,
        deskripsyon: l.deskripsyon,
        kantite: Number(l.kantite),
        priKoutInite: Number(l.priKoutInite),
      })),
    })
  }

  return (
    <Modal title="Nouvo Achte" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          {label('Founisè *')}
          <select style={inp} value={founiseId} onChange={e => setFouniseId(e.target.value)}>
            <option value="">— Chwazi founisè —</option>
            {founiseList.map(f => <option key={f.id} value={f.id}>{f.non}</option>)}
          </select>
        </div>

        {/* ✅ NOUVO — panye acha: ajoute plizyè pwodwi pou MENM founisè a
            anvan w konfime, olye de refè fòm nan yon lòt fwa pou chak atik. */}
        <div style={{ position:'relative' }}>
          {label('Ajoute yon pwodwi nan estòk')}
          <div style={{ position:'relative' }}>
            <Search size={14} color={D.muted} style={{ position:'absolute', left:12, top:12 }}/>
            <input style={{ ...inp, paddingLeft:34 }} value={search}
              onChange={e => { setSearch(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
              placeholder="Chèche epi klike pou ajoute..."/>
          </div>
          {showResults && products.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, background:'#fff', borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:180, overflowY:'auto', marginTop:4 }}>
              {products.map(p => (
                <div key={p.id} onClick={() => addProductLine(p)}
                  style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:`1px solid ${D.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {p.name} <span style={{ color:D.muted, fontSize:11 }}>· stòk: {p.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <input style={inp} value={manualDesc} onChange={e => setManualDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addManualLine())}
            placeholder="...oswa yon atik ki pa nan katalòg la (Antre)"/>
          <button type="button" onClick={addManualLine} style={{ padding:'0 16px', borderRadius:10, border:`1.5px solid ${D.blue}`, background:'#fff', color:D.blue, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap' }}>
            <Plus size={15}/>
          </button>
        </div>

        {/* Lis liy yo */}
        {lines.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:220, overflowY:'auto', padding:2 }}>
            {lines.map(l => (
              <div key={l.id} style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${D.border}`, background:'#FAFBFF' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:D.text }}>{l.name}</span>
                  <button type="button" onClick={() => removeLine(l.id)} style={{ background:'none', border:'none', color:D.red, cursor:'pointer', padding:0 }}><X size={14}/></button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}>
                  <input type="number" step="0.001" min="0.001" value={l.kantite}
                    onChange={e => updateLine(l.id, { kantite: e.target.value })}
                    style={{ ...inpMoney, padding:'7px 10px', fontSize:12 }} placeholder="Kantite"/>
                  <input type="number" step="0.01" min="0" value={l.priKoutInite}
                    onChange={e => updateLine(l.id, { priKoutInite: e.target.value })}
                    style={{ ...inpMoney, padding:'7px 10px', fontSize:12 }} placeholder="Pri kout"/>
                  <span style={{ fontSize:12, fontWeight:800, color:D.blueDk, fontFamily:'monospace', whiteSpace:'nowrap' }}>
                    {fmt((Number(l.kantite)||0) * (Number(l.priKoutInite)||0))}
                  </span>
                </div>
                {/* ✅ NOUVO — benefis pwojte pou liy sa a (sèlman si li mare ak yon vrè pwodwi ki gen pri vant) */}
                {l.priVant != null && (
                  <p style={{ fontSize:10, color:D.muted, margin:'6px 0 0' }}>
                    Pri vant: <span style={{ fontWeight:700, color:D.text }}>{fmt(l.priVant)} HTG</span> · Benefis pwojte:{' '}
                    <span style={{ fontWeight:800, color: (l.priVant - (Number(l.priKoutInite)||0)) >= 0 ? D.success : D.red }}>
                      {fmt((l.priVant - (Number(l.priKoutInite)||0)) * (Number(l.kantite)||0))} HTG
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ✅ NOUVO — Lòt Frè (transpò, chaje/dechaje...) mare ak menm achte sa a */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>{label('Lòt Frè (Transpò, elt.)')}<input type="number" step="0.01" min="0" style={inpMoney} value={fraAdisyonel} onChange={e => setFraAdisyonel(e.target.value)} placeholder="0.00"/></div>
          <div>{label('Deskripsyon Frè a')}<input style={inp} value={fraDeskripsyon} onChange={e => setFraDeskripsyon(e.target.value)} placeholder="Egz. Transpò"/></div>
        </div>

        <div style={{ padding:'12px 16px', borderRadius:12, background:D.blueDim, display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:D.muted }}>
            <span>Machandiz ({lines.length} atik)</span>
            <span style={{ fontFamily:'monospace' }}>{fmt(machandizTotal)}</span>
          </div>
          {Number(fraAdisyonel) > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:D.muted }}>
              <span>Lòt Frè</span>
              <span style={{ fontFamily:'monospace' }}>{fmt(Number(fraAdisyonel))}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:6, marginTop:2, borderTop:`1px dashed ${D.border}` }}>
            <span style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>Total ki soti nan Kapital</span>
            <span style={{ fontSize:18, fontWeight:900, color:D.blueDk, fontFamily:'monospace' }}>{fmt(grandTotal)} HTG</span>
          </div>
        </div>

        {/* ✅ NOUVO — benefis total pwojte, dapre pri vant aktyèl pwodwi yo (sèlman si gen omwen yon liy ki mare ak yon vrè pwodwi) */}
        {lines.some(l => l.priVant != null) && (
          <div style={{ padding:'12px 16px', borderRadius:12, background: benefisTotal >= 0 ? D.successBg : 'rgba(192,57,43,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>Benefis Total Pwojte (dapre pri vant aktyèl)</span>
            <span style={{ fontSize:16, fontWeight:900, color: benefisTotal >= 0 ? D.success : D.red, fontFamily:'monospace' }}>{fmt(benefisTotal)} HTG</span>
          </div>
        )}

        <div>{label('Nòt (opsyonèl)')}<input style={inp} value={notes} onChange={e => setNotes(e.target.value)}/></div>

        <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
          style={{ marginTop:6, padding:'12px', borderRadius:12, border:'none', background:D.orange, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
          {mutation.isPending ? 'N ap sove...' : `Konfime Achte (${lines.length} atik)`}
        </button>
      </div>
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
  // ✅ NOUVO — filt dat pou lis Achte a, itil lè w antre plizyè achte
  // youn pa youn (pa nan menm panye) e w vle wè total benefis pou yon dat
  const [dateFilt, setDateFilt] = useState({ from: '', to: '' })

  const { data: kapitalData } = useQuery({ queryKey: ['founise-kapital'], queryFn: () => founiseAPI.getKapital() })
  const { data: founiseData } = useQuery({ queryKey: ['founise-list'], queryFn: () => founiseAPI.getAll() })
  const { data: achteData }   = useQuery({
    queryKey: ['founise-achte', dateFilt.from, dateFilt.to],
    queryFn: () => founiseAPI.getAchte({ limit: 100, ...(dateFilt.from && dateFilt.to && { dateFrom: dateFilt.from, dateTo: dateFilt.to }) }),
  })
  // ✅ NOUVO — istorik mouvman kapital (enjeksyon + achte), pou n ka montre
  // yon istorik detaye enjeksyon yo, menm jan ak lis achte a
  const { data: mouvmanData } = useQuery({ queryKey: ['founise-kapital-mouvman'], queryFn: () => founiseAPI.getKapitalMouvman({ limit: 30 }) })

  const kapital = kapitalData?.data?.kapital || { disponib: 0, totalEnjeksyon: 0, totalAchte: 0, totalFre: 0 }
  const founiseList = founiseData?.data?.founise || []
  const achteList = achteData?.data?.achte || []
  // ✅ NOUVO — total benefis pwojte pou TOUT achte ki nan lis la kounye a
  // (filtre pa dat si yon peryòd chwazi) — sèvi ak pri vant aktyèl pwodwi
  // a (product.priceHtg) ki kounye a vini nan menm rezilta a.
  const achteBenefisTotal = achteList.reduce((acc, a) => {
    if (a.product?.priceHtg == null) return acc
    return acc + (Number(a.product.priceHtg) - Number(a.pri_kout_inite)) * Number(a.kantite)
  }, 0)
  // ✅ NOUVO — sèlman liy enjeksyon yo (pa mele ak achte/frè)
  const enjeksyonList = (mouvmanData?.data?.mouvman || []).filter(m => m.type === 'enjeksyon')

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['founise-kapital'] })
    qc.invalidateQueries({ queryKey: ['founise-list'] })
    qc.invalidateQueries({ queryKey: ['founise-achte'] })
    qc.invalidateQueries({ queryKey: ['founise-kapital-mouvman'] })
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
            {/* ✅ KORIJE — Frè adisyonèl (transpò, elt.) mare ak Achte, pa Depans jeneral */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', margin:'0 0 2px' }}>Total Frè</p>
              <p style={{ fontSize:14, fontWeight:800, color:D.red, margin:0, fontFamily:'monospace' }}>−{fmt(kapital.totalFre)}</p>
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

        {/* ✅ NOUVO — Istorik Enjeksyon */}
        <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <History size={14} color={D.blue}/>
              </div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Istorik Enjeksyon</h3>
            </div>
            <button onClick={() => setModal('kapital')} style={{ padding:'9px 14px', borderRadius:10, border:'none', background:D.gold, color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <Plus size={14}/> Enjekte
            </button>
          </div>
          {enjeksyonList.length === 0 ? (
            <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen enjeksyon kapital anrejistre ankò.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {enjeksyonList.map(m => (
                <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:12, border:`1px solid ${D.border}` }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:800, fontSize:13, color:D.text, margin:'0 0 2px' }}>{m.notes || 'Enjeksyon Kapital'}</p>
                    <p style={{ fontSize:11, color:D.muted, margin:0 }}>{new Date(m.created_at).toLocaleString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                  </div>
                  <p style={{ fontWeight:900, fontSize:14, color:D.success, fontFamily:'monospace', margin:0, whiteSpace:'nowrap' }}>+{fmt(m.montant)} HTG</p>
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

          {/* ✅ NOUVO — filt dat, itil lè w antre plizyè achte youn pa youn nan menm dat la */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'end' }}>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', marginBottom:4 }}>De</label>
              <input type="date" value={dateFilt.from} onChange={e => setDateFilt(d => ({ ...d, from: e.target.value }))} style={{ ...inp, padding:'8px 10px', fontSize:12 }}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', marginBottom:4 }}>Rive</label>
              <input type="date" value={dateFilt.to} onChange={e => setDateFilt(d => ({ ...d, to: e.target.value }))} style={{ ...inp, padding:'8px 10px', fontSize:12 }}/>
            </div>
            {(dateFilt.from || dateFilt.to) && (
              <button onClick={() => setDateFilt({ from:'', to:'' })} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${D.border}`, background:'#fff', color:D.muted, fontWeight:700, fontSize:11, cursor:'pointer' }}>
                Retire filt
              </button>
            )}
          </div>

          {/* ✅ NOUVO — total benefis pwojte pou tout achte ki nan lis la (peryòd chwazi a) */}
          {achteList.length > 0 && (
            <div style={{ padding:'12px 16px', borderRadius:12, background: achteBenefisTotal >= 0 ? D.successBg : 'rgba(192,57,43,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>
                Benefis Total Pwojte {(dateFilt.from && dateFilt.to) ? `(${dateFilt.from} → ${dateFilt.to})` : '(tout achte ki afiche)'}
              </span>
              <span style={{ fontSize:16, fontWeight:900, color: achteBenefisTotal >= 0 ? D.success : D.red, fontFamily:'monospace' }}>{fmt(achteBenefisTotal)} HTG</span>
            </div>
          )}

          {achteList.length === 0 ? (
            <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen achte anrejistre pou peryòd sa a.</p>
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