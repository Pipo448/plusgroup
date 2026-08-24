// src/pages/estok-kontwol/EstokKontwolPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estokKontwolAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { printReport } from '../../utils/printReport'
import toast from 'react-hot-toast'
import { ArrowLeft, ClipboardCheck, Printer, Search } from 'lucide-react'

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

  // ✅ NOUVO — olye de chèche/tape yon pwodwi alafwa, kounye a nou chaje TOUT
  // lis pwodwi yo yon sèl kou; kesye a jis tape kantite a nan chak liy li
  // vle kontwole (kite lòt yo vid — yo pa antre nan konfimasyon an).
  const [filtreKategori, setFiltreKategori] = useState('')
  const [filtreChèche, setFiltreChèche] = useState('')
  const [konte, setKonte] = useState({}) // { [productId]: '12.5' }
  const [dènyeRezime, setDènyeRezime] = useState(null)

  const { data: categoriesData } = useQuery({ queryKey: ['product-categories'], queryFn: () => productAPI.getCategories() })
  const categories = categoriesData?.data?.categories || []

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-all-kontwol', filtreKategori, filtreChèche],
    queryFn: () => productAPI.getAll({ categoryId: filtreKategori || undefined, search: filtreChèche || undefined, limit: 500 }),
  })
  const products = productsData?.data?.products || []

  const { data: histData } = useQuery({ queryKey: ['estok-kontwol-list'], queryFn: () => estokKontwolAPI.getAll({ limit: 40 }) })
  const historik = histData?.data?.kontwol || []

  const batchMutation = useMutation({
    mutationFn: (data) => estokKontwolAPI.createBatch(data),
    onSuccess: (res) => {
      const { kontwolReyisi, kontwolEchwe, kontwol } = res.data
      toast.success(`${kontwolReyisi} kontwòl anrejistre${kontwolEchwe > 0 ? ` (${kontwolEchwe} echwe)` : ''}.`)
      setDènyeRezime(kontwol)
      setKonte({})
      qc.invalidateQueries({ queryKey: ['estok-kontwol-list'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan anrejistreman an.'),
  })

  const kantiteRanpli = Object.entries(konte).filter(([, v]) => v !== '' && v != null)

  const handleSubmit = () => {
    if (!kantiteRanpli.length) return toast.error('Antre kantite pou omwen yon pwodwi.')
    batchMutation.mutate({
      lignes: kantiteRanpli.map(([productId, v]) => ({ productId, kantiteKonte: Number(v) })),
    })
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
        {/* Nouvo kontwòl — lis konplè, tape kantite dirèkteman nan chak liy */}
        <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center' }}><ClipboardCheck size={14} color={D.blue}/></div>
            <div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>Nouvo Kontwòl</h3>
              <p style={{ fontSize:11, color:D.muted, margin:'2px 0 0' }}>Tape kantite a nan liy chak pwodwi ou kontwole — kite lòt yo vid</p>
            </div>
          </div>

          {/* Filt — pou jwenn yon seksyon pwodwi rapid nan yon gwo katalòg */}
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:'1 1 220px' }}>
              <Search size={14} color={D.muted} style={{ position:'absolute', left:12, top:12 }}/>
              <input style={{ ...inp, paddingLeft:34 }} value={filtreChèche} onChange={e => setFiltreChèche(e.target.value)} placeholder="Filtre pa non pwodwi..."/>
            </div>
            <select style={{ ...inp, flex:'0 1 200px' }} value={filtreKategori} onChange={e => setFiltreKategori(e.target.value)}>
              <option value="">Tout kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Antèt kolòn */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 130px', gap:10, padding:'0 4px 8px', borderBottom:`2px solid ${D.border}`, marginBottom:4 }}>
            <span style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>Pwodwi</span>
            <span style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', textAlign:'right' }}>Sistèm</span>
            <span style={{ fontSize:10, fontWeight:800, color:D.muted, textTransform:'uppercase', textAlign:'right' }}>Konte</span>
          </div>

          {/* Lis pwodwi — defile, tape sèlman sa w ap kontwole a */}
          <div style={{ maxHeight:420, overflowY:'auto' }}>
            {loadingProducts ? (
              <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>N ap chaje pwodwi yo...</p>
            ) : products.length === 0 ? (
              <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen pwodwi ki matche filt la.</p>
            ) : (
              products.map(p => {
                const valè = konte[p.id] ?? ''
                const gen = valè !== ''
                return (
                  <div key={p.id} style={{
                    display:'grid', gridTemplateColumns:'1fr 110px 130px', gap:10, alignItems:'center',
                    padding:'9px 4px', borderRadius:8,
                    background: gen ? D.blueDim : 'transparent',
                  }}>
                    <span style={{ fontSize:13, fontWeight: gen ? 700 : 500, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize:12, color:D.muted, fontFamily:'monospace', textAlign:'right' }}>{fmt(p.quantity)} {p.unit}</span>
                    <input type="number" step="0.001" min="0" value={valè}
                      onChange={e => setKonte(k => ({ ...k, [p.id]: e.target.value }))}
                      placeholder="—"
                      style={{ ...inpMoney, padding:'6px 10px', fontSize:12, textAlign:'right' }}/>
                  </div>
                )
              })
            )}
          </div>

          {/* Ba konfimasyon — rete vizib, montre konbyen liy ranpli */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, paddingTop:16, borderTop:`1px dashed ${D.border}` }}>
            <span style={{ fontSize:12, color:D.muted, fontWeight:700 }}>
              {kantiteRanpli.length > 0 ? `${kantiteRanpli.length} pwodwi pare pou konfime` : 'Poko gen kantite antre'}
            </span>
            <button onClick={handleSubmit} disabled={batchMutation.isPending || !kantiteRanpli.length}
              style={{ padding:'12px 22px', borderRadius:12, border:'none',
                background: kantiteRanpli.length ? D.orange : D.blueDim, color: kantiteRanpli.length ? '#fff' : D.muted,
                fontWeight:800, fontSize:13, cursor: kantiteRanpli.length ? 'pointer' : 'not-allowed', boxShadow: kantiteRanpli.length ? D.shadowLift : 'none' }}>
              {batchMutation.isPending ? 'N ap sove...' : `Konfime Tout (${kantiteRanpli.length})`}
            </button>
          </div>
        </div>

        {/* Rezilta dènye batch */}
        {dènyeRezime && dènyeRezime.length > 0 && (
          <div style={{ background:D.white, borderRadius:20, padding:26, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>Rezilta Dènye Kontwòl yo</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {dènyeRezime.map(k => {
                const eka = Number(k.eka)
                return (
                  <div key={k.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:10, border:`1px solid ${ekaColor(eka)}` }}>
                    <span style={{ fontSize:13, fontWeight:700, color:D.text }}>{k.product?.name}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:12, fontFamily:'monospace', color:D.muted }}>{fmt(k.kantite_sistem)} → {fmt(k.kantite_konte)}</span>
                      <span style={{ fontWeight:900, fontSize:13, fontFamily:'monospace', color:ekaColor(eka) }}>{eka > 0 ? '+' : ''}{fmt(eka)}</span>
                      <button onClick={() => printKontwol(k)} style={{ background:D.blueDim, border:'none', borderRadius:8, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, cursor:'pointer' }}>
                        <Printer size={12}/>
                      </button>
                    </div>
                  </div>
                )
              })}
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
