// src/pages/estok-kontwol/EstokKontwolPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estokKontwolAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { printReport } from '../../utils/printReport'
import toast from 'react-hot-toast'
import { ArrowLeft, ClipboardCheck, Printer, Search, X } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)',
  gold:'#C9A84C', orange:'#FF6B00', orangeLt:'#FF8C33',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.18)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', red:'#C0392B',
  shadow:'0 2px 14px rgba(27,42,143,0.06)',
  heroGrad:'linear-gradient(115deg,#0F1A5C 0%,#1B2A8F 55%,#2D3FBF 100%)',
  shadowLift:'0 10px 24px rgba(27,42,143,0.16)',
}
const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid rgba(27,42,143,0.20)`, outline:'none',
  fontSize:13, color:D.text, background:'#FFFFFF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
}
const inpMoney = { ...inp, border:`1.5px solid rgba(27,42,143,0.28)`, fontFamily:'monospace', fontWeight:800, color:D.blueDk, background:'#F7F8FF' }
const label = (txt) => (
  <label style={{ display:'block', fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{txt}</label>
)
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 3 }).replace(/\.?0+$/, m => m.includes('.') ? '' : m)
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function EstokKontwolPage() {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [kantiteKonte, setKantiteKonte] = useState('')
  const [notes, setNotes] = useState('')
  const [dernyeKontwol, setDernyeKontwol] = useState(null)

  const { data: productsData } = useQuery({
    queryKey: ['products-search-kontwol', search],
    queryFn: () => productAPI.getAll({ search, limit: 8 }),
    enabled: search.length >= 2,
  })
  const products = productsData?.data?.products || []

  const { data: histData } = useQuery({ queryKey: ['estok-kontwol-list'], queryFn: () => estokKontwolAPI.getAll({ limit: 40 }) })
  const historik = histData?.data?.kontwol || []

  const mutation = useMutation({
    mutationFn: (data) => estokKontwolAPI.create(data),
    onSuccess: (res) => {
      toast.success('Kontwòl anrejistre.')
      setDernyeKontwol(res.data.kontwol)
      setSelectedProduct(null); setSearch(''); setKantiteKonte(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['estok-kontwol-list'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan anrejistreman an.'),
  })

  const handleSubmit = () => {
    if (!selectedProduct) return toast.error('Chwazi yon pwodwi.')
    if (kantiteKonte === '') return toast.error('Antre kantite ou konte a.')
    mutation.mutate({ productId: selectedProduct.id, kantiteKonte: Number(kantiteKonte), notes })
  }

  const ekaColor = (eka) => eka > 0 ? D.success : eka < 0 ? D.red : D.muted
  const ekaLabel = (eka) => eka > 0 ? 'Siplis' : eka < 0 ? 'Manko' : 'Ekzat'

  const printKontwol = (k) => {
    const eka = Number(k.eka)
    printReport({
      tenantName: tenant?.name,
      title: 'Fich Kontwòl Estòk',
      subtitle: k.product?.name || '',
      meta: [{ label: 'Dat', value: fmtDate(k.created_at) }, { label: 'Kontwole pa', value: k.creator?.fullName || '—' }],
      rows: [
        { label: 'Kantite Sistèm', value: `${fmt(k.kantite_sistem)} ${k.product?.unit || ''}` },
        { label: 'Kantite Konte', value: `${fmt(k.kantite_konte)} ${k.product?.unit || ''}`, strong: true },
        { label: ekaLabel(eka), value: `${eka > 0 ? '+' : ''}${fmt(eka)} ${k.product?.unit || ''}`, strong: true, color: eka > 0 ? 'color-green' : eka < 0 ? 'color-red' : '' },
      ],
    })
  }

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'24px' }}>
      <div style={{ position:'relative', overflow:'hidden', background: D.heroGrad, borderRadius:22, padding:'26px 30px', marginBottom:26, boxShadow:'0 14px 34px rgba(15,26,92,0.28)' }}>
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.9, pointerEvents:'none' }}>
          <path d="M -20 150 C 140 60, 340 210, 620 70" stroke={D.orange} strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 180 C 160 100, 360 240, 620 110" stroke={D.gold} strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => navigate(-1)} style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.22)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <ArrowLeft size={17}/>
          </button>
          <div style={{ width:50, height:50, borderRadius:14, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 18px rgba(255,107,0,0.35)' }}>
            <ClipboardCheck size={23} color="#fff"/>
          </div>
          <div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:10, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', margin:'0 0 3px' }}>{tenant?.name || 'Estòk'}</p>
            <h1 style={{ color:'#fff', fontSize:25, fontWeight:900, margin:0 }}>Kontwòl Estòk</h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:13, margin:'3px 0 0' }}>Konte fizik, konpare ak sistèm nan</p>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Nouvo kontwòl */}
        <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}><ClipboardCheck size={14} color={D.blue}/></div>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Nouvo Kontwòl</h3>
          </div>

          <div style={{ maxWidth:420, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ position:'relative' }}>
              {label('Pwodwi *')}
              {selectedProduct ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, background:D.blueDim, border:`1.5px solid ${D.blue}` }}>
                  <span style={{ fontSize:13, fontWeight:700, color:D.text }}>{selectedProduct.name} <span style={{ color:D.muted, fontWeight:500 }}>· sistèm: {fmt(selectedProduct.quantity)}</span></span>
                  <button onClick={() => { setSelectedProduct(null); setSearch('') }} style={{ background:'none', border:'none', color:D.blue, cursor:'pointer' }}><X size={15}/></button>
                </div>
              ) : (
                <>
                  <div style={{ position:'relative' }}>
                    <Search size={14} color={D.muted} style={{ position:'absolute', left:12, top:12 }}/>
                    <input style={{ ...inp, paddingLeft:34 }} value={search}
                      onChange={e => { setSearch(e.target.value); setShowResults(true) }}
                      onFocus={() => setShowResults(true)}
                      placeholder="Chèche yon pwodwi..."/>
                  </div>
                  {showResults && products.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, background:'#fff', borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:180, overflowY:'auto', marginTop:4 }}>
                      {products.map(p => (
                        <div key={p.id} onClick={() => { setSelectedProduct(p); setShowResults(false) }}
                          style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:`1px solid ${D.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {p.name} <span style={{ color:D.muted, fontSize:11 }}>· sistèm: {fmt(p.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>{label('Kantite Ou Konte *')}<input type="number" step="0.001" min="0" style={inpMoney} value={kantiteKonte} onChange={e => setKantiteKonte(e.target.value)} placeholder="0"/></div>
            <div>{label('Nòt (opsyonèl)')}<input style={inp} value={notes} onChange={e => setNotes(e.target.value)}/></div>

            <button onClick={handleSubmit} disabled={mutation.isPending}
              style={{ padding:'12px 20px', borderRadius:12, border:'none', background:D.orange, color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadowLift }}>
              {mutation.isPending ? 'N ap sove...' : 'Konfime Kontwòl'}
            </button>
          </div>
        </div>

        {/* Rezilta dènye kontwòl */}
        {dernyeKontwol && (
          <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow, border:`2px solid ${ekaColor(Number(dernyeKontwol.eka))}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{dernyeKontwol.product?.name}</h3>
              <button onClick={() => printKontwol(dernyeKontwol)} style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${D.blue}`, background:'#fff', color:D.blue, fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Printer size={14}/> Enprime Fich
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              <div><p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>Sistèm</p><p style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', margin:0 }}>{fmt(dernyeKontwol.kantite_sistem)}</p></div>
              <div><p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>Konte</p><p style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', margin:0 }}>{fmt(dernyeKontwol.kantite_konte)}</p></div>
              <div>
                <p style={{ fontSize:10, color:D.muted, fontWeight:800, textTransform:'uppercase', margin:'0 0 3px' }}>{ekaLabel(Number(dernyeKontwol.eka))}</p>
                <p style={{ fontSize:18, fontWeight:900, fontFamily:'monospace', margin:0, color:ekaColor(Number(dernyeKontwol.eka)) }}>
                  {Number(dernyeKontwol.eka) > 0 ? '+' : ''}{fmt(dernyeKontwol.eka)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Istorik */}
        <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow }}>
          <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>Istorik Kontwòl</h3>
          {historik.length === 0 ? (
            <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen kontwòl anrejistre ankò.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {historik.map(k => (
                <div key={k.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:12, border:`1px solid ${D.border}` }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontWeight:800, fontSize:13, color:D.text, margin:'0 0 2px' }}>{k.product?.name}</p>
                    <p style={{ fontSize:11, color:D.muted, margin:0 }}>{fmtDate(k.created_at)} · {k.creator?.fullName || '—'}</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontWeight:900, fontSize:13, fontFamily:'monospace', color:ekaColor(Number(k.eka)) }}>
                      {Number(k.eka) > 0 ? '+' : ''}{fmt(k.eka)}
                    </span>
                    <button onClick={() => printKontwol(k)} style={{ background:D.blueDim, border:'none', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, cursor:'pointer' }}>
                      <Printer size={13}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
