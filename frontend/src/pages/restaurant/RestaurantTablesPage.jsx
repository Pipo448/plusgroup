// src/pages/restaurant/RestaurantTablesPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { restaurantTablesAPI, productAPI, invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, X, Search, Send, CreditCard, Trash2, Users, UtensilsCrossed, RefreshCw } from 'lucide-react'

const D = {
  red:'#C0392B', redLt:'#E05A4A', redDim:'rgba(192,57,43,0.08)',
  orange:'#FF6B00', gold:'#C9A84C',
  success:'#059669', successDim:'rgba(5,150,105,0.08)',
  white:'#FFFFFF', bg:'#FFF7F5',
  border:'rgba(192,57,43,0.15)',
  text:'#3D1A12', muted:'#9C6B5E',
  shadow:'0 2px 14px rgba(192,57,43,0.06)',
  heroGrad:'linear-gradient(115deg,#7A1F12 0%,#C0392B 55%,#E05A4A 100%)',
  shadowLift:'0 10px 24px rgba(192,57,43,0.18)',
}
const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid rgba(192,57,43,0.20)`, outline:'none',
  fontSize:13, color:D.text, background:'#FFFFFF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
}
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 }).replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── Modal senp pou ajoute yon tab ──────────────────────────────────────
const NouvoTabModal = ({ onClose, onSaved }) => {
  const [name, setName] = useState('')
  const [zone, setZone] = useState('')
  const [seats, setSeats] = useState(4)
  const mutation = useMutation({
    mutationFn: () => restaurantTablesAPI.createTable({ name, zone, seats }),
    onSuccess: () => { toast.success('Tab ajoute.'); onSaved() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(122,31,18,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:D.white, borderRadius:18, padding:24, width:'100%', maxWidth:380, boxShadow:D.shadowLift }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ color:D.text, fontSize:15, fontWeight:900, margin:0 }}>Nouvo Tab</h3>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, border:'none', background:D.redDim, color:D.red, cursor:'pointer' }}><X size={15}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input style={inp} placeholder="Non tab (Egz. Tab 1, Teras A)" value={name} onChange={e => setName(e.target.value)} autoFocus/>
          <input style={inp} placeholder="Zòn (opsyonèl — Egz. Andedan, Teras)" value={zone} onChange={e => setZone(e.target.value)}/>
          <input type="number" min="1" style={inp} placeholder="Kantite chèz" value={seats} onChange={e => setSeats(e.target.value)}/>
          <button onClick={() => name.trim() ? mutation.mutate() : toast.error('Antre non tab la.')} disabled={mutation.isPending}
            style={{ padding:12, borderRadius:12, border:'none', background:D.red, color:'#fff', fontWeight:800, cursor:'pointer' }}>
            {mutation.isPending ? 'N ap sove...' : 'Ajoute Tab'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panno Kòmand (lè yon tab louvri/okipe) ─────────────────────────────
const KòmandPanel = ({ order: initialOrder, onClose, onClosed, isMobile }) => {
  const qc = useQueryClient()
  const [order, setOrder] = useState(initialOrder)
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)

  const { data: productsData } = useQuery({
    queryKey: ['restaurant-menu-search', search],
    queryFn: () => productAPI.getAll({ module: 'restaurant', search, limit: 10 }),
    enabled: search.length >= 1,
  })
  const products = productsData?.data?.products || []

  const refresh = (res) => { setOrder(res.data.order); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) }

  const addMutation = useMutation({
    mutationFn: (p) => restaurantTablesAPI.addItems(order.id, [{ productId: p.id, description: p.name, quantity: 1, unitPriceHtg: Number(p.priceHtg || 0) }]),
    onSuccess: (res) => { refresh(res); setSearch(''); setShowResults(false) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })
  const removeMutation = useMutation({
    mutationFn: (itemId) => restaurantTablesAPI.removeItem(order.id, itemId),
    onSuccess: refresh,
  })
  const kitchenMutation = useMutation({
    mutationFn: () => restaurantTablesAPI.sendToKitchen(order.id),
    onSuccess: (res) => { refresh(res); toast.success('Voye nan kizin — tikè pare pou enprime.') },
  })
  const cancelMutation = useMutation({
    mutationFn: () => restaurantTablesAPI.cancelOrder(order.id),
    onSuccess: () => { toast.success('Kòmand anile.'); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }); onClosed() },
  })

  const total = (order.items || []).reduce((acc, it) => acc + Number(it.quantity) * Number(it.unitPriceHtg), 0)
  const genNouvo = (order.items || []).some(it => it.kitchenStatus === 'an_atant')

  const [closing, setClosing] = useState(false)
  const handleFèmenTab = async () => {
    if (!order.items?.length) return toast.error('Ajoute omwen yon pla anvan w fèmen tab la.')
    setClosing(true)
    try {
      const invoiceRes = await invoiceAPI.createDirect({
        items: order.items.map(it => ({
          description: it.description, productId: it.productId,
          quantity: Number(it.quantity), unitPriceHtg: Number(it.unitPriceHtg),
          unitPriceUsd: 0, discountPct: 0,
          totalHtg: Number(it.quantity) * Number(it.unitPriceHtg), totalUsd: 0,
        })),
        payment: { method: 'cash', amountHtg: total, amountUsd: 0, amountGiven: total, change: 0 },
        notes: `Tab: ${order.table?.name || ''}`,
      })
      await restaurantTablesAPI.closeOrder(order.id, invoiceRes.data?.invoice?.id)
      toast.success('Tab fèmen — fakti kreye.')
      qc.invalidateQueries({ queryKey: ['restaurant-tables'] })
      onClosed()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erè pandan fèmen tab la.')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(122,31,18,0.45)', zIndex:100, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding: isMobile ? 0 : 16 }} onClick={onClose}>
      <div style={{ background:D.white, borderRadius: isMobile ? '18px 18px 0 0' : 18, padding:22, width:'100%', maxWidth:460, maxHeight: isMobile ? '92vh' : '88vh', overflowY:'auto', boxShadow:D.shadowLift }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <h3 style={{ color:D.text, fontSize:17, fontWeight:900, margin:0 }}>{order.table?.name}</h3>
            <p style={{ fontSize:11, color:D.muted, margin:'2px 0 0' }}>{order.table?.zone || 'Kòmand louvri'}</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none', background:D.redDim, color:D.red, cursor:'pointer' }}><X size={16}/></button>
        </div>

        <div style={{ position:'relative', marginBottom:14 }}>
          <Search size={14} color={D.muted} style={{ position:'absolute', left:12, top:12 }}/>
          <input style={{ ...inp, paddingLeft:34 }} value={search}
            onChange={e => { setSearch(e.target.value); setShowResults(true) }}
            onFocus={() => setShowResults(true)}
            placeholder="Chèche yon pla nan meni a..."/>
          {showResults && products.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, background:'#fff', borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:200, overflowY:'auto', marginTop:4 }}>
              {products.map(p => (
                <div key={p.id} onClick={() => addMutation.mutate(p)}
                  style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:`1px solid ${D.border}`, display:'flex', justifyContent:'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background = D.redDim}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{p.name}</span>
                  <span style={{ fontFamily:'monospace', color:D.muted }}>{fmt(p.priceHtg)} HTG</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(!order.items || order.items.length === 0) ? (
          <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>Pa gen pla ajoute ankò — chèche epi klike pou ajoute.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16, maxHeight:260, overflowY:'auto' }}>
            {order.items.map(it => (
              <div key={it.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:9, background: it.kitchenStatus === 'an_atant' ? D.redDim : '#F8F8F8' }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:D.text, margin:0 }}>{Number(it.quantity)} × {it.description}</p>
                  {it.kitchenStatus === 'voye' && <p style={{ fontSize:10, color:D.success, fontWeight:800, margin:'2px 0 0' }}>✓ Voye nan kizin</p>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:13 }}>{fmt(Number(it.quantity) * Number(it.unitPriceHtg))}</span>
                  <button onClick={() => removeMutation.mutate(it.id)} style={{ background:'none', border:'none', color:D.red, cursor:'pointer', padding:0 }}><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:12, background:D.redDim, marginBottom:16 }}>
          <span style={{ fontSize:12, fontWeight:800, color:D.muted, textTransform:'uppercase' }}>Total</span>
          <span style={{ fontSize:18, fontWeight:900, color:D.red, fontFamily:'monospace' }}>{fmt(total)} HTG</span>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => cancelMutation.mutate()} style={{ padding:'11px 14px', borderRadius:11, border:`1.5px solid ${D.border}`, background:'#fff', color:D.muted, fontWeight:700, fontSize:12, cursor:'pointer' }}>
            Anile Tab
          </button>
          <button onClick={() => kitchenMutation.mutate()} disabled={!genNouvo || kitchenMutation.isPending}
            style={{ flex:1, padding:'11px 14px', borderRadius:11, border:'none', background: genNouvo ? D.orange : '#eee', color: genNouvo ? '#fff' : '#999', fontWeight:800, fontSize:12, cursor: genNouvo ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Send size={14}/> Voye Kizin
          </button>
          <button onClick={handleFèmenTab} disabled={closing}
            style={{ flex:1, padding:'11px 14px', borderRadius:11, border:'none', background:D.success, color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <CreditCard size={14}/> {closing ? 'N ap fèmen...' : 'Fèmen Tab'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RestaurantTablesPage() {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const isMobile = useIsMobile()
  const qc = useQueryClient()

  const [modal, setModal] = useState(null) // 'nouvo-tab' | null
  const [activeOrder, setActiveOrder] = useState(null)

  // ⚠️ KORIJE — te gen `refetchInterval: 15000` (chak 15s) isit la. Sa te
  // fè paj sa a rechèche TOUT tab yo (ak kòmand/atik ki mare ak yo) 4 fwa
  // pa minit, tout jounen an, pou chak aparèy ki gen paj la ouvri — sa te
  // yon gwo kontribitè nan depasman egress Supabase la. Nou monte entèval
  // la a 45s (3 fwa mwens frekan) epi nou ajoute yon bouton "Rafrechi"
  // manyèl pou moman kote yo bezwen yon chif fre imedya.
  const { data: tablesData, isLoading, refetch: refetchTables, isRefetching: refetchingTables } = useQuery({ queryKey: ['restaurant-tables'], queryFn: () => restaurantTablesAPI.getTables(), refetchInterval: 45000 })
  const tables = tablesData?.data?.tables || []

  const openMutation = useMutation({
    mutationFn: (tableId) => restaurantTablesAPI.openOrder(tableId),
    onSuccess: (res) => { setActiveOrder(res.data.order); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleTableClick = (t) => {
    if (t.kòmandAktif) { setActiveOrder(t.kòmandAktif); return }
    openMutation.mutate(t.id)
  }

  const statusStyle = (t) => {
    if (t.kòmandAktif) return { bg:'#FDEEEA', border:D.red, dot:D.red, label:'Okipe' }
    return { bg:'#EAF6EF', border:D.success, dot:D.success, label:'Lib' }
  }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding: isMobile ? '16px' : '24px' }}>
      <div style={{ position:'relative', overflow:'hidden', background: D.heroGrad, borderRadius: isMobile ? 18 : 22, padding: isMobile ? '18px 18px' : '26px 30px', marginBottom: isMobile ? 18 : 26, boxShadow:'0 14px 34px rgba(122,31,18,0.28)' }}>
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap: isMobile ? 12 : 16 }}>
          <button onClick={() => navigate(-1)} style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius:12, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
            <ArrowLeft size={17}/>
          </button>
          <div style={{ width: isMobile ? 42 : 50, height: isMobile ? 42 : 50, borderRadius:14, flexShrink:0, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <UtensilsCrossed size={isMobile ? 19 : 23} color="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize: isMobile ? 9 : 10, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', margin:'0 0 3px' }}>{tenant?.name || 'Restoran'}</p>
            <h1 style={{ color:'#fff', fontSize: isMobile ? 19 : 25, fontWeight:900, margin:0 }}>Tab & Kòmand</h1>
          </div>
          <button onClick={() => refetchTables()} disabled={refetchingTables} title="Rafrechi tab yo"
            style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius:12, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', cursor: refetchingTables ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}>
            <RefreshCw size={16} style={refetchingTables ? { animation:'spin 1s linear infinite' } : undefined}/>
          </button>
          <button onClick={() => setModal('nouvo-tab')} style={{ padding: isMobile ? '9px 12px' : '10px 18px', borderRadius:12, border:'none', background:'#fff', color:D.red, fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
            <Plus size={15}/> {!isMobile && 'Nouvo Tab'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color:D.muted, textAlign:'center', padding:'40px 0' }}>N ap chaje tab yo...</p>
      ) : tables.length === 0 ? (
        <div style={{ background:D.white, borderRadius:20, padding:40, textAlign:'center', boxShadow:D.shadow }}>
          <p style={{ color:D.muted, fontSize:14, marginBottom:16 }}>Pa gen tab konfigire ankò.</p>
          <button onClick={() => setModal('nouvo-tab')} style={{ padding:'11px 22px', borderRadius:12, border:'none', background:D.red, color:'#fff', fontWeight:800, cursor:'pointer' }}>
            + Kreye Premye Tab la
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap:14 }}>
          {tables.map(t => {
            const s = statusStyle(t)
            const total = t.kòmandAktif ? (t.kòmandAktif.items || []).reduce((acc, it) => acc + Number(it.quantity) * Number(it.unitPriceHtg), 0) : 0
            return (
              <button key={t.id} onClick={() => handleTableClick(t)}
                style={{ background:s.bg, border:`2px solid ${s.border}`, borderRadius:16, padding:16, cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <p style={{ fontWeight:900, fontSize:15, color:D.text, margin:0 }}>{t.name}</p>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:s.dot, flexShrink:0, marginTop:4 }}/>
                </div>
                {t.zone && <p style={{ fontSize:11, color:D.muted, margin:0 }}>{t.zone}</p>}
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:D.muted }}>
                  <Users size={11}/> {t.seats}
                </div>
                <p style={{ fontSize:11, fontWeight:800, color:s.dot, margin:'4px 0 0' }}>{s.label}</p>
                {t.kòmandAktif && (
                  <p style={{ fontSize:13, fontWeight:900, fontFamily:'monospace', color:D.red, margin:0 }}>{fmt(total)} HTG</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {modal === 'nouvo-tab' && (
        <NouvoTabModal onClose={() => setModal(null)} onSaved={() => { setModal(null); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) }}/>
      )}
      {activeOrder && (
        <KòmandPanel order={activeOrder} isMobile={isMobile}
          onClose={() => setActiveOrder(null)}
          onClosed={() => setActiveOrder(null)}/>
      )}
    </div>
  )
}