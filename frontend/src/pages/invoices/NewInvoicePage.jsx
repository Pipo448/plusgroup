// src/pages/invoices/NewInvoicePage.jsx
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Receipt, User, Search, Save, WifiOff, RefreshCw, UploadCloud, Package } from 'lucide-react'
// ✅ NOUVO — Offline mode
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import {
  cacheProducts, searchCachedProducts,
  cacheClients, searchCachedClients,
  queueSale, adjustCachedProductStock,
} from '../../services/offlineDb'
import { syncPendingSales, countPendingSales, onSyncEvent } from '../../services/offlineSync'
import { printInvoiceNative, isNativePrinterAvailable } from '../../services/printerNative'
import { useDraftCartStore } from '../../stores/draftCartStore'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.18)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  red:'#C0392B',
  shadow:'0 2px 14px rgba(27,42,143,0.06)',
  // ✅ NOUVO — tokens pou nouvo banner ak bouton "plan" yo (nivo pri an gwo)
  heroGrad:'linear-gradient(115deg,#0F1A5C 0%,#1B2A8F 55%,#2D3FBF 100%)',
  shadowLift:'0 10px 24px rgba(27,42,143,0.16)',
  shadowPress:'inset 0 2px 5px rgba(0,0,0,0.18)',
}

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid rgba(27,42,143,0.20)`, outline:'none',
  fontSize:13, color:D.text, background:'#FFFFFF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
  transition:'border-color 0.15s ease, background 0.15s ease',
}

// ✅ NOUVO — chan lajan (pri, rabè, montan) pi vizib: bòday pi eskè, chif
// an gra pou yo pa neye nan lòt chan tèks yo.
const inpMoney = {
  ...inp,
  border:`1.5px solid rgba(27,42,143,0.28)`,
  fontFamily:'monospace', fontWeight:800, color:D.blueDk,
  background:'#F7F8FF',
}

const label = (txt) => (
  <label style={{ display:'block', color:D.muted, fontSize:11, fontWeight:700,
    marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>
    {txt}
  </label>
)

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

// ✅ NOUVO — Estil "plan" pou bouton nivo pri (Detay/3/Douzèn...). Chwazi:
// koulè plen + leve an lè (shadowLift) tankou yon bouton peze. Pa chwazi:
// plat, blan, ti lonbraj diskrè.
const planChipStyle = (active, accent) => ({
  padding:'9px 14px', borderRadius:12,
  border: active ? 'none' : `1.5px solid ${D.border}`,
  background: active ? accent : '#fff',
  color: active ? '#fff' : D.text,
  fontSize:11, fontWeight:800, letterSpacing:'0.03em',
  cursor:'pointer', textAlign:'left', minWidth:72,
  boxShadow: active ? D.shadowLift : '0 1px 3px rgba(27,42,143,0.06)',
  transform: active ? 'translateY(-1px)' : 'none',
  transition:'all 0.15s ease', fontFamily:'DM Sans,sans-serif',
})

// ✅ Hook debounce — evite API call chak lèt
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

// ✅ Hook responsive — senplifye
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ✅ NOUVO — Si yon nivo pri an gwo aktif SOU LIY SA A epi li gen yon
// "Pri Total Pakè a" (totalPriceHtg) sove, epi kantite a se yon MILTIP
// EGZAK sèy nivo a (3, 6, 9... pou yon nivo 3), kalkile total la
// DIRÈKTEMAN ak pri total la — olye de miltipliye pri linite a (ki
// awondi a 2 chif) — pou evite erè tankou 3 × 583,33 = 1749,99 olye
// 1750,00 net. Retounen null si kondisyon yo pa ranpli (tonbe sou
// ansyen kalkil la pi ba a).
const exactTierGross = (item) => {
  if (!item?._priceMode?.startsWith('tier-') || !item._priceTiers?.length) return null
  const tier = item._priceTiers.find(tr => `tier-${tr.id || tr.minQty}` === item._priceMode)
  const minQty = Number(tier?.minQty || 0)
  if (!tier?.totalPriceHtg || !minQty) return null
  const qty = Number(item.qty) || 0
  if (qty <= 0 || qty % minQty !== 0) return null
  return (qty / minQty) * Number(tier.totalPriceHtg)
}

// ✅ Helper — kalkile line total ak rabè kòm montan HTG (pa pousantaj)
const calcLineTotal = (item) => {
  const gross = exactTierGross(item) ?? (Number(item.qty) * Number(item.unitPrice))
  const disc  = Math.min(Number(item.discount || 0), gross) // pa kite total vin negatif
  return Math.max(0, gross - disc)
}

// ✅ NOUVO — Pri An Gwo (plizyè nivo): chwazi pi bon nivo pou yon kantite
// bay. `tiers` triye pa minQty krwasan; nou pran DÈNYE nivo ki gen minQty
// <= qty (sa vle di pi gwo sèy kantite kliyan an rive ladan l).
const pickBestTier = (tiers, qty) => {
  if (!tiers || !tiers.length) return null
  const q = Number(qty) || 0
  const eligible = tiers.filter(tr => q >= Number(tr.minQty))
  if (!eligible.length) return null
  return eligible.reduce((best, tr) => Number(tr.minQty) > Number(best.minQty) ? tr : best)
}

// ✅ memo — evite re-render si props pa chanje
const ItemRowDesktop = memo(function ItemRowDesktop({ item, idx, onUpdate, onRemove, t, isOnline, canOverridePrice }) {
  const [search, setSearch] = useState(item.description || '')
  const [open, setOpen]     = useState(false)

  // ✅ DEBOUNCE — pa fè API call chak lèt, tann 400ms
  const debouncedSearch = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['products-search', debouncedSearch, isOnline],
    // ✅ KORIJE — si nou DEJA konnen nou offline, sote apèl API a
    // dirèkteman (pa gaspiye tan tann timeout) e chèche nan cache a tousuit
    queryFn: async () => {
      if (!isOnline) {
        return await searchCachedProducts(debouncedSearch, 8)
      }
      try {
        const res = await productAPI.getAll({ search: debouncedSearch, limit: 8 })
        const products = res.data.products || []
        cacheProducts(products).catch(() => {})
        return products
      } catch (err) {
        return await searchCachedProducts(debouncedSearch, 8)
      }
    },
    enabled:  debouncedSearch.length >= 2,
    staleTime: 30_000,
    cacheTime: 60_000,
    retry: false,
  })
  const products = data || []

  // ✅ KORIJE — rabè se yon montan HTG kounye a, pa pousantaj
  const lineTotal = useMemo(
    () => calcLineTotal(item),
    [item.unitPrice, item.qty, item.discount, item._priceMode, item._priceTiers]
  )

  const selectProduct = useCallback((p) => {
    // ✅ NOUVO — Anpeche vann yon pwodwi ki gen 0 stòk (sof si se yon sèvis)
    const stock = Number(p.quantity ?? p.stock ?? 0)
    if (!p.isService && stock <= 0) {
      toast.error(`⛔ "${p.name}" pa gen stòk (0 ki rete). Kontakte admin pou reapwovizyone l.`, { duration: 4500 })
      return
    }
    setSearch(p.name)
    setOpen(false)
    // ✅ NOUVO — sonje pri detay + lis nivo pri an gwo pwodwi a sou liy la,
    // pou nou ka otomatikman chwazi bon pri a selon kantite a pandan kesye
    // a ap tape (menm lè kantite a chanje apè)
    const tiers = (p.priceTiers || []).slice().sort((a,b) => a.minQty - b.minQty)
    const bestTier = pickBestTier(tiers, 1)
    onUpdate(idx, {
      description: p.name, productId: p.id,
      unitPrice: bestTier ? Number(bestTier.priceHtg) : (p.priceHtg || 0),
      qty: 1, discount: 0,
      _retailPrice: p.priceHtg || 0,
      _priceTiers: tiers,
      _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
      // ✅ NOUVO — sonje kòd ak inite pwodwi a pou anrejistre nan productSnapshot
      _productCode: p.code || null,
      _unit: p.unit || null,
    })
  }, [idx, onUpdate])

  return (
    <div style={{ padding:'14px 0', borderBottom:`1px solid ${D.border}` }}>
    <div style={{ display:'grid', gridTemplateColumns:'2.2fr 60px 110px 110px 110px 36px', gap:8, alignItems:'start' }}>
      <div style={{ position:'relative' }}>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setOpen(true)
            onUpdate(idx, { description: e.target.value, productId: null })
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t('invoice.searchProduct') || 'Chèche pwodui...'}
          style={{ ...inp, fontSize:12 }}
        />
        {open && products.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:D.white, borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:200, overflowY:'auto', marginTop:4 }}>
            {products.map(p => {
              const stock = Number(p.quantity ?? p.stock ?? 0)
              const outOfStock = !p.isService && stock <= 0
              return (
                <div key={p.id}
                  onMouseDown={() => selectProduct(p)}
                  style={{
                    padding:'10px 12px', cursor: outOfStock ? 'not-allowed' : 'pointer', fontSize:13,
                    color: outOfStock ? D.muted : D.text, display:'flex', justifyContent:'space-between', alignItems:'center',
                    borderBottom:`1px solid ${D.border}`, opacity: outOfStock ? 0.55 : 1,
                  }}
                  onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.background = D.blueDim }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight:600, display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    {/* ✅ NOUVO — Vinyèt foto pwodwi nan rezilta rechèch */}
                    <span style={{
                      width:28, height:28, borderRadius:7, flexShrink:0,
                      background: p.imageUrl ? `url(${p.imageUrl}) center/cover no-repeat` : D.blueDim,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {!p.imageUrl && <Package size={13} color={D.blue}/>}
                    </span>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                    {outOfStock && (
                      <span style={{ fontSize:9, fontWeight:800, color:'#DC2626', background:'rgba(220,38,38,0.1)', padding:'2px 6px', borderRadius:99, letterSpacing:'0.03em', flexShrink:0 }}>
                        STÒK FINI
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily:'monospace', color: outOfStock ? D.muted : D.blue, fontWeight:700, fontSize:12, flexShrink:0 }}>{fmt(p.priceHtg)} HTG</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <input type="number" min="1" value={item.qty}
        onChange={e => {
          const qty = Number(e.target.value)
          // ✅ NOUVO — chanje pri a otomatikman selon kantite a, si liy la
          // gen nivo pri an gwo epi kesye a poko chanje pri a alamen
          if (item._priceTiers?.length && item._priceMode !== 'manual') {
            const bestTier = pickBestTier(item._priceTiers, qty)
            onUpdate(idx, {
              qty,
              unitPrice: bestTier ? Number(bestTier.priceHtg) : item._retailPrice,
              _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
            })
          } else {
            onUpdate(idx, { qty })
          }
        }}
        style={{ ...inp, fontSize:12, textAlign:'center' }}
        onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }}
        onBlur={e => e.target.style.borderColor = D.border}
      />
      <div>
        {/* ✅ KORIJE — chan an lok pa default pou TOUT moun ki gen nivo pri
            (evite tape total olye pri linite → total ki pa won). Admin ka
            "deloke" li ak bouton "✏️ Manyèl" nan ranje "plan" anba a si l
            vrèman bezwen l. */}
        <input type="number" min="0" step="0.01" value={item.unitPrice}
          disabled={!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual'))}
          onChange={e => onUpdate(idx, { unitPrice: e.target.value, _priceMode: 'manual' })}
          style={{ ...inpMoney, fontSize:12,
            ...(!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual')) ? { background:'#F1F5F9', color:'#64748B', cursor:'not-allowed' } : {}) }}
          onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }}
          onBlur={e => e.target.style.borderColor = D.border}
        />
      </div>
      {/* ✅ KORIJE — Rabè HTG (montan), pa pousantaj */}
      <input type="number" min="0" step="0.01" value={item.discount}
        onChange={e => onUpdate(idx, { discount: e.target.value })}
        placeholder="0.00"
        style={{ ...inpMoney, fontSize:12, textAlign:'right' }}
        onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }}
        onBlur={e => e.target.style.borderColor = D.border}
      />
      <div style={{ padding:'10px 6px', fontSize:12, fontFamily:'monospace', fontWeight:700, color:D.text, textAlign:'right' }}>
        {fmt(lineTotal)}
      </div>
      <button type="button" onClick={() => onRemove(idx)}
        style={{ width:34, height:38, borderRadius:9, background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.15)', color:D.red, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Trash2 size={13}/>
      </button>
    </div>

    {/* ✅ NOUVO — "Plan" pri an gwo: ranje separe, tout lajè liy lan, pou
        chak nivo (Detay/3/Douzèn...) parèt tankou yon vrè chwa pri — non
        an gra anlè, pri a an monospace anba, ak yon efè "an relyèf" (3D)
        lè li chwazi. */}
    {item._priceTiers?.length > 0 && (
      <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap', paddingLeft:2 }}>
        <button type="button" onClick={() => onUpdate(idx, { qty: 1, unitPrice: item._retailPrice, _priceMode: 'retail' })}
          style={planChipStyle(item._priceMode === 'retail', D.blue)}>
          <span style={{ display:'block' }}>DETAY</span>
          <span style={{ display:'block', fontFamily:'monospace', fontWeight:700, fontSize:10, opacity:0.85, marginTop:2 }}>{fmt(item._retailPrice)} HTG</span>
        </button>
        {item._priceTiers.map(tr => (
          <button key={tr.id || tr.minQty} type="button"
            onClick={() => onUpdate(idx, { qty: Number(tr.minQty), unitPrice: Number(tr.priceHtg), _priceMode: `tier-${tr.id || tr.minQty}` })}
            style={planChipStyle(item._priceMode === `tier-${tr.id || tr.minQty}`, D.orange)}>
            <span style={{ display:'block' }}>{(tr.label || `${tr.minQty}+`).toUpperCase()}</span>
            <span style={{ display:'block', fontFamily:'monospace', fontWeight:700, fontSize:10, opacity:0.85, marginTop:2 }}>
              {tr.totalPriceHtg ? `${fmt(tr.totalPriceHtg)} / ${tr.minQty}` : fmt(tr.priceHtg)} HTG
            </span>
          </button>
        ))}
        {/* ✅ NOUVO — Admin sèlman: deloke chan an pou tape yon pri espesyal */}
        {canOverridePrice && (
          <button type="button" onClick={() => onUpdate(idx, { _priceMode: 'manual' })}
            style={{ ...planChipStyle(item._priceMode === 'manual', D.gold), border:`1.5px dashed ${item._priceMode === 'manual' ? D.gold : D.border}` }}>
            <span style={{ display:'block' }}>✏️ MANYÈL</span>
          </button>
        )}
      </div>
    )}
    </div>
  )
})

// ✅ memo sou mobile row tou
const ItemRowMobile = memo(function ItemRowMobile({ item, idx, onUpdate, onRemove, t, count, isOnline, canOverridePrice }) {
  const [search, setSearch] = useState(item.description || '')
  const [open, setOpen]     = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['products-search-m', debouncedSearch, isOnline],
    queryFn: async () => {
      if (!isOnline) {
        return await searchCachedProducts(debouncedSearch, 8)
      }
      try {
        const res = await productAPI.getAll({ search: debouncedSearch, limit: 8 })
        const products = res.data.products || []
        cacheProducts(products).catch(() => {})
        return products
      } catch (err) {
        return await searchCachedProducts(debouncedSearch, 8)
      }
    },
    enabled:  debouncedSearch.length >= 2,
    staleTime: 30_000,
    cacheTime: 60_000,
    retry: false,
  })
  const products = data || []

  // ✅ KORIJE — rabè kòm montan HTG
  const lineTotal = useMemo(
    () => calcLineTotal(item),
    [item.unitPrice, item.qty, item.discount, item._priceMode, item._priceTiers]
  )

  const selectProduct = useCallback((p) => {
    // ✅ NOUVO — Anpeche vann yon pwodwi ki gen 0 stòk (sof si se yon sèvis)
    const stock = Number(p.quantity ?? p.stock ?? 0)
    if (!p.isService && stock <= 0) {
      toast.error(`⛔ "${p.name}" pa gen stòk (0 ki rete). Kontakte admin pou reapwovizyone l.`, { duration: 4500 })
      return
    }
    setSearch(p.name)
    setOpen(false)
    const tiers = (p.priceTiers || []).slice().sort((a,b) => a.minQty - b.minQty)
    const bestTier = pickBestTier(tiers, 1)
    onUpdate(idx, {
      description: p.name, productId: p.id,
      unitPrice: bestTier ? Number(bestTier.priceHtg) : (p.priceHtg || 0),
      qty: 1, discount: 0,
      _retailPrice: p.priceHtg || 0,
      _priceTiers: tiers,
      _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
      // ✅ NOUVO — sonje kòd ak inite pwodwi a pou anrejistre nan productSnapshot
      _productCode: p.code || null,
      _unit: p.unit || null,
    })
  }, [idx, onUpdate])

  return (
    <div style={{ background:'#F8F9FF', borderRadius:14, padding:14, border:`1.5px solid ${D.border}`, marginBottom:10 }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:800, color:D.blue, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Atik #{idx + 1}
        </span>
        {count > 1 && (
          <button type="button" onClick={() => onRemove(idx)}
            style={{ background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:8, padding:'4px 10px', cursor:'pointer', color:D.red, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
            <Trash2 size={12}/> Retire
          </button>
        )}
      </div>

      <div style={{ position:'relative', marginBottom:10 }}>
        {label(t('invoice.searchProduct') || 'Pwodui / Deskripsyon')}
        <div style={{ position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:D.muted, pointerEvents:'none' }}/>
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setOpen(true)
              onUpdate(idx, { description: e.target.value, productId: null })
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Ekri non pwodui a..."
            style={{ ...inp, paddingLeft:34, fontSize:14 }}
          />
        </div>
        {open && products.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:D.white, borderRadius:12, border:`1.5px solid ${D.blue}40`, boxShadow:'0 8px 32px rgba(27,42,143,0.15)', maxHeight:220, overflowY:'auto', marginTop:4 }}>
            {products.map(p => {
              const stock = Number(p.quantity ?? p.stock ?? 0)
              const outOfStock = !p.isService && stock <= 0
              return (
                <div key={p.id}
                  onMouseDown={() => selectProduct(p)}
                  style={{
                    padding:'12px 14px', cursor: outOfStock ? 'not-allowed' : 'pointer', borderBottom:`1px solid ${D.border}`,
                    display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, opacity: outOfStock ? 0.55 : 1,
                  }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0, flex:1 }}>
                    {/* ✅ NOUVO — Vinyèt foto pwodwi */}
                    <div style={{
                      width:38, height:38, borderRadius:9, flexShrink:0,
                      background: p.imageUrl ? `url(${p.imageUrl}) center/cover no-repeat` : D.blueDim,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {!p.imageUrl && <Package size={16} color={D.blue}/>}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color: outOfStock ? D.muted : D.text, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                        {outOfStock && (
                          <span style={{ fontSize:9, fontWeight:800, color:'#DC2626', background:'rgba(220,38,38,0.1)', padding:'2px 6px', borderRadius:99, letterSpacing:'0.03em' }}>
                            STÒK FINI
                          </span>
                        )}
                      </div>
                      {p.code && <div style={{ fontSize:11, color:D.muted }}>{p.code}</div>}
                    </div>
                  </div>
                  <div style={{ fontFamily:'monospace', fontWeight:800, color: outOfStock ? D.muted : D.blue, fontSize:13, flexShrink:0 }}>{fmt(p.priceHtg)}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ✅ KORIJE — Qte ak Rabè sou menm liy; Pri a ap gen tout lajè kat
          la pi ba a, paske bouton nivo yo (Detay/3/Douzèn...) bezwen plas
          pou yo rete gwo ase pou touche sou iPhone. */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <div>
          {label(t('invoice.qty') || 'Qte')}
          <input type="number" min="1" value={item.qty}
            onChange={e => {
              const qty = Number(e.target.value)
              if (item._priceTiers?.length && item._priceMode !== 'manual') {
                const bestTier = pickBestTier(item._priceTiers, qty)
                onUpdate(idx, {
                  qty,
                  unitPrice: bestTier ? Number(bestTier.priceHtg) : item._retailPrice,
                  _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
                })
              } else {
                onUpdate(idx, { qty })
              }
            }}
            style={{ ...inp, textAlign:'center', fontSize:14 }}
            onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }}
            onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
        <div>
          {/* ✅ KORIJE — Rabè HTG */}
          {label('Rabè HTG')}
          <input type="number" min="0" step="0.01" value={item.discount}
            onChange={e => onUpdate(idx, { discount: e.target.value })}
            placeholder="0.00"
            style={{ ...inpMoney, textAlign:'right', fontSize:13 }}
            onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }}
            onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
      </div>

      <div style={{ marginBottom:10 }}>
        {label('Pri U. HTG')}
        <input type="number" min="0" step="0.01" value={item.unitPrice}
          disabled={!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual'))}
          onChange={e => onUpdate(idx, { unitPrice: e.target.value, _priceMode: 'manual' })}
          style={{ ...inpMoney, fontSize:13,
            ...(!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual')) ? { background:'#F1F5F9', color:'#64748B', cursor:'not-allowed' } : {}) }}
          onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }}
          onBlur={e => e.target.style.borderColor = D.border}
        />
        {/* ✅ NOUVO — bouton "plan" pou TOUT moun (admin ak kesye) — non an
            gra anlè, pri a an monospace anba, gwo ase pou touche ak dwèt. */}
        {item._priceTiers?.length > 0 && (
          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            <button type="button" onClick={() => onUpdate(idx, { qty: 1, unitPrice: item._retailPrice, _priceMode: 'retail' })}
              style={{ ...planChipStyle(item._priceMode === 'retail', D.blue), fontSize:13, padding:'10px 14px', minHeight:44 }}>
              <span style={{ display:'block' }}>DETAY</span>
              <span style={{ display:'block', fontFamily:'monospace', fontWeight:700, fontSize:11, opacity:0.85, marginTop:2 }}>{fmt(item._retailPrice)} HTG</span>
            </button>
            {item._priceTiers.map(tr => (
              <button key={tr.id || tr.minQty} type="button"
                onClick={() => onUpdate(idx, { qty: Number(tr.minQty), unitPrice: Number(tr.priceHtg), _priceMode: `tier-${tr.id || tr.minQty}` })}
                style={{ ...planChipStyle(item._priceMode === `tier-${tr.id || tr.minQty}`, D.orange), fontSize:13, padding:'10px 14px', minHeight:44 }}>
                <span style={{ display:'block' }}>{(tr.label || `${tr.minQty}+`).toUpperCase()}</span>
                <span style={{ display:'block', fontFamily:'monospace', fontWeight:700, fontSize:11, opacity:0.85, marginTop:2 }}>
                  {tr.totalPriceHtg ? `${fmt(tr.totalPriceHtg)} / ${tr.minQty}` : fmt(tr.priceHtg)} HTG
                </span>
              </button>
            ))}
            {/* ✅ NOUVO — Admin sèlman: deloke pou tape yon pri espesyal */}
            {canOverridePrice && (
              <button type="button" onClick={() => onUpdate(idx, { _priceMode: 'manual' })}
                style={{ ...planChipStyle(item._priceMode === 'manual', D.gold), fontSize:13, padding:'10px 14px', minHeight:44, border:`1.5px dashed ${item._priceMode === 'manual' ? D.gold : D.border}` }}>
                ✏️ MANYÈL
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:D.blueDim, borderRadius:9, padding:'8px 12px' }}>
        <span style={{ fontSize:12, color:D.muted, fontWeight:700 }}>Total liy</span>
        <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color:D.blue }}>{fmt(lineTotal)} HTG</span>
      </div>
    </div>
  )
})

export default function NewInvoicePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()
  // ✅ NOUVO — Sèlman admin ka tape yon pri alamen. Kesye jwenn sèlman
  // aksè pou CHWAZI ant Detay ak nivo Gwo yo (konfigire deja sou pwodwi
  // a) — pa ka envante yon lòt pri.
  const PRICE_OVERRIDE_ROLES = ['admin']
  const canOverridePrice = PRICE_OVERRIDE_ROLES.includes(user?.role)
  const isMobile = useIsMobile()

  // ✅ NOUVO — Offline mode
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncingNow, setSyncingNow] = useState(false)

  // ✅ NOUVO — Peman (fèt AN MENM TAN ak kreyasyon fakti a — mache online ak offline)
  const [paymentMethod, setPaymentMethod]     = useState('cash')  // cash | moncash | natcash | credit
  const [amountReceived, setAmountReceived]   = useState('')
  // ✅ NOUVO — si kliyan an bay yon avans lè li chwazi Kredi
  const [creditDeposit, setCreditDeposit]     = useState('')
  const [offlineReceipt, setOfflineReceipt]   = useState(null)  // pseudo-fakti pou enprime apre vant offline
  const [printingOffline, setPrintingOffline] = useState(false)

  const [clientSearch, setClientSearch]     = useState('')
  const [clientOpen, setClientOpen]         = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const clientRef = useRef(null)

  const today = new Date(new Date().getTime() - 5*60*60*1000).toISOString().split('T')[0]
  const [invoiceDate, setInvoiceDate]       = useState(today)

  // ✅ KORIJE — Senplifye nèt pou evite risk desalynman ak fizo orè.
  // Ka nòmal la (99% ka yo): dat chwazi a se JODI A → itilize `new Date()`
  // DIRÈKTEMAN. Sa a GARANTI 100% egzat paske se VRÈ moman aktyèl la (san
  // okenn kalkil manyèl "+5 èdtan" ki ka pa matche ak vrè règ fizo orè
  // Ayiti a). `timeZone: 'America/Port-au-Prince'` ap toujou konvèti l
  // kòrèkteman lè n afiche l pita.
  const buildIssueDateTime = useCallback(() => {
    if (invoiceDate === today) {
      return new Date().toISOString()
    }
    // Ka backdating (ra) — dat pase chwazi manyèlman. Nou pa gen lè egzat
    // pou ka sa a, kidonk nou itilize "minwit Ayiti" kòm konvansyon.
    return `${invoiceDate}T05:00:00.000Z`
  }, [invoiceDate, today])
  const [dueDate, setDueDate]               = useState('')
  const [notes, setNotes]                   = useState('')
  const [terms, setTerms]                   = useState('')
  const [taxRate, setTaxRate]               = useState(tenant?.taxRate || 0)
  // ✅ KORIJE — discountGlobal kounye a se yon MONTAN HTG, pa pousantaj
  const [discountGlobal, setDiscountGlobal] = useState(0)

  // ✅ NOUVO — Panye santral (pataje ak paj Pwodui a). Si gen atik deja ladan l
  // (soti nan bouton panye Pwodui a), yo ranpli fakti a otomatikman. Sinon,
  // yon sèl liy vid parèt kòm dabitid.
  const draftItems    = useDraftCartStore(s => s.items)
  const setDraftItems = useDraftCartStore(s => s.setItems)
  const clearDraftCart = useDraftCartStore(s => s.clear)

  const [items, setItems] = useState(() =>
    draftItems.length
      ? draftItems.map(it => ({
          id: it.id, description: it.description, productId: it.productId,
          qty: it.qty, unitPrice: it.unitPrice, discount: it.discount,
        }))
      : [{ id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }]
  )

  // ✅ NOUVO — Chak fwa itilizatè a modifye Qte/Pri/Rabè oswa ajoute/retire yon
  // liy DIRÈKTEMAN nan paj Fakti a, senkwonize chanjman an tounen nan depo
  // santral la. Konsa, si l ale sou Pwodui pou chèche yon lòt atik epi tounen,
  // fakti a rete egzakteman jan l te kite l la.
  useEffect(() => {
    setDraftItems(items)
  }, [items])

  const debouncedClientSearch = useDebounce(clientSearch, 400)

  const { data: clientData } = useQuery({
    queryKey: ['clients-search', debouncedClientSearch, isOnline],
    queryFn: async () => {
      // ✅ KORIJE — si nou DEJA konnen nou offline, sote apèl API a
      // dirèkteman (evite toast "Erè koneksyon" repetitif)
      if (!isOnline) {
        return await searchCachedClients(debouncedClientSearch, 8)
      }
      try {
        const res = await clientAPI.getAll({ search: debouncedClientSearch, limit: 8 })
        const clients = res.data.clients || res.data || []
        cacheClients(clients).catch(() => {})
        return clients
      } catch (err) {
        return await searchCachedClients(debouncedClientSearch, 8)
      }
    },
    enabled:  debouncedClientSearch.length >= 1,
    staleTime: 30_000,
    retry: false,
  })
  const clients = clientData || []

  // ✅ NOUVO — Cache TOUT pwodwi/kliyan (san limit) lè paj la louvri (si an liy).
  // Sa asire gen yon katalòg lokal KONPLÈ disponib si entènèt tonbe pandan sesyon an,
  // kèlkeswa konbyen pwodwi/kliyan tenant an genyen (paginasyon otomatik).
  const [cacheReady, setCacheReady]     = useState(false)
  const [cachePhase, setCachePhase]     = useState('')    // 'pwodwi' | 'kliyan' | ''
  const [cacheProgress, setCacheProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    if (!isOnline) return
    let cancelled = false
    const PAGE_SIZE = 200
    const MAX_PAGES = 200 // sekirite — 200 × 200 = 40 000 rejis maksimòm

    async function cacheAll(phaseLabel, fetchPage, saveFn, extractItems, extractTotal) {
      let page = 1
      let totalCached = 0
      let totalCount  = null

      setCachePhase(phaseLabel)
      setCacheProgress({ done: 0, total: 0 })

      while (page <= MAX_PAGES) {
        if (cancelled) return
        const res   = await fetchPage(page)
        const items = extractItems(res)
        if (totalCount === null) totalCount = extractTotal(res, items)

        if (items.length === 0) break
        await saveFn(items)
        totalCached += items.length

        setCacheProgress({ done: totalCached, total: totalCount || totalCached })

        // Rive nan dènye paj la? Sispann.
        if (items.length < PAGE_SIZE || totalCached >= (totalCount || Infinity)) break
        page++
      }
      return totalCached
    }

    async function run() {
      await cacheAll(
        'pwodwi',
        (page) => productAPI.getAll({ page, limit: PAGE_SIZE }),
        cacheProducts,
        (res) => res.data.products || [],
        (res, items) => res.data.total ?? items.length
      )

      await cacheAll(
        'kliyan',
        (page) => clientAPI.getAll({ page, limit: PAGE_SIZE }),
        cacheClients,
        (res) => res.data.clients || res.data || [],
        (res, items) => res.data.total ?? items.length
      )

      if (!cancelled) {
        setCachePhase('')
        setCacheReady(true)
      }
    }

    run().catch(() => {})
    return () => { cancelled = true }
  }, [isOnline])

  // ✅ NOUVO — Konte vant an atant + tande evènman senkwonizasyon
  useEffect(() => {
    countPendingSales().then(setPendingCount)
    const unsub = onSyncEvent((evt) => {
      if (evt.type === 'sync-start') setSyncingNow(true)
      if (evt.type === 'sync-end') {
        setSyncingNow(false)
        countPendingSales().then(setPendingCount)
        if (evt.synced > 0) {
          toast.success(`${evt.synced} vant senkwonize avèk siksè!`)
        }
        if (evt.failed > 0) {
          toast.error(`${evt.failed} vant pa t ka senkwonize. Y ap eseye ankò.`)
        }
      }
    })
    return unsub
  }, [])

  // ✅ NOUVO — Senkwonize otomatikman lè entènèt tounen
  useEffect(() => {
    if (isOnline) {
      syncPendingSales()
    }
  }, [isOnline])

  const handleManualSync = useCallback(async () => {
    if (!isOnline) return toast.error('Pa gen entènèt kounye a.')
    setSyncingNow(true)
    await syncPendingSales()
  }, [isOnline])

  useEffect(() => {
    const h = (e) => { if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ✅ KORIJE — rabè kòm montan HTG nan tout kalkil yo
  const { subtotal, discountAmount, afterDiscount, taxAmount, grandTotal } = useMemo(() => {
    const sub     = items.reduce((acc, it) => acc + calcLineTotal(it), 0)
    const discAmt = Math.min(Number(discountGlobal || 0), sub) // pa kapab plis pase sou-total la
    const afterD  = Math.max(0, sub - discAmt)
    const taxAmt  = afterD * (Number(taxRate) / 100)
    return { subtotal: sub, discountAmount: discAmt, afterDiscount: afterD, taxAmount: taxAmt, grandTotal: afterD + taxAmt }
  }, [items, discountGlobal, taxRate])

  const updateItem = useCallback((idx, changes) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it))
  }, [])

  const removeItem = useCallback((idx) => {
    setItems(prev => { if (prev.length === 1) return prev; return prev.filter((_, i) => i !== idx) })
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }])
  }, [])

  const mutation = useMutation({
    mutationFn: (payload) => invoiceAPI.createDirect(payload),
    onSuccess: (res) => {
      const inv = res.data.invoice
      toast.success(t('invoice.invoiceCreated') || 'Fakti kreye avèk siksè!')
      // ✅ NOUVO — Fakti a kreye avèk siksè, vide panye santral la nèt
      clearDraftCart()
      navigate(`/app/invoices/${inv.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const handleSubmit = useCallback(async () => {
    const validItems = items.filter(it => it.description?.trim() && Number(it.unitPrice) > 0)
    if (!validItems.length) {
      toast.error(t('invoice.addAtLeastOneItem') || 'Ajoute omwen yon atik.')
      return
    }

    // ✅ NOUVO — bloke si se Espès e kesye a poko antre kòb li resevwa a.
    // Sa evite yon fakti make "peye" san pèsonn pa konfime konbyen kòb
    // reyèlman antre nan men.
    if (paymentMethod === 'cash' && amountReceived === '') {
      toast.error('Antre kòb ou resevwa a anvan w kreye fakti a.')
      return
    }

    // ✅ KORIJE — voye discountAmt (montan egzak) DIREKTEMAN bay backend la
    // kounye a, an plis de discountPct (kenbe pou konpatibilite/afichaj kòm
    // pousantaj). Sa evite pèt presizyon si fakti a re-louvri pou konsilte
    // detay rabè a pita.
    const mappedItems = validItems.map(it => {
      const qty       = Number(it.qty)
      const unitPrice = Number(it.unitPrice)
      const discAmt   = Number(it.discount || 0)
      // ✅ NOUVO — menm règ ak calcLineTotal: si kantite a se yon miltip
      // egzat sèy nivo a, itilize pri total pakè a dirèkteman
      const gross     = exactTierGross(it) ?? (qty * unitPrice)
      const lineTotal = Math.max(0, gross - Math.min(discAmt, gross))
      // Konvèti montan rabè → pousantaj (pou afichaj/rapò kòm pousantaj)
      const discPct   = gross > 0 ? Math.min(100, (discAmt / gross) * 100) : 0
      // ✅ NOUVO — non nivo pri a ki te aktif pou liy sa a (pou badj afichaj)
      const tierLabel = it._priceMode?.startsWith('tier-')
        ? (it._priceTiers?.find(tr => `tier-${tr.id || tr.minQty}` === it._priceMode)?.label || 'Gwo')
        : (it.productId ? 'Detay' : null)

      return {
        description:     it.description,
        productId:       it.productId || null,
        quantity:        qty,
        unitPriceHtg:    unitPrice,
        unitPriceUsd:    0,
        discountPct:     Number(discPct.toFixed(4)),
        discountAmt:     Math.min(discAmt, gross),  // ✅ NOUVO — valè egzak la
        totalHtg:        lineTotal,
        totalUsd:        0,
        productSnapshot: { name: it.description, code: it._productCode || null, unit: it._unit || null, tierLabel },
      }
    })

    const sub      = mappedItems.reduce((a, it) => a + it.totalHtg, 0)
    // ✅ KORIJE — rabè global se yon MONTAN dirèk
    const discAmt  = Math.min(Number(discountGlobal || 0), sub)
    const afterDis = Math.max(0, sub - discAmt)
    const taxAmt   = afterDis * (Number(taxRate) / 100)
    const total    = afterDis + taxAmt

    // ✅ NOUVO — Konstwi peman an (si pa Kredi) — mache online ak offline
    // ✅ MODIFYE — si Kredi chwazi MEN kliyan an bay yon avans, kreye yon
    // peman pasyèl (kach) pou montan avans lan; rès la rete "Pa Peye".
    const deposit = Number(creditDeposit || 0)
    const payment = paymentMethod === 'credit'
      ? (deposit > 0 ? {
          method:      'cash',
          amountHtg:   Math.min(deposit, total),
          amountUsd:   0,
          amountGiven: deposit,
          change:      0,
        } : null)
      : {
          method:      paymentMethod,
          amountHtg:   paymentMethod === 'cash' ? Math.min(Number(amountReceived || total), total) : total,
          amountUsd:   0,
          amountGiven: paymentMethod === 'cash' ? Number(amountReceived || 0) : total,
          change:      paymentMethod === 'cash' ? Math.max(0, Number(amountReceived || 0) - total) : 0,
        }

    const payload = {
      clientId:      selectedClient?.id || null,
      // ✅ NOUVO — si okenn kliyan pa seleksyone nan lis la, men itilizatè a
      // tape yon non, itilize non tape a kanmenm (kliyan ki pa nan sistèm nan)
      clientSnapshot: selectedClient
        ? { id: selectedClient.id, name: selectedClient.name, phone: selectedClient.phone }
        : (clientSearch.trim() ? { name: clientSearch.trim() } : {}),
      // ✅ KORIJE — dat+lè EGZAT (pa sèlman dat), kaptire nan MOMAN vant lan fèt
      issueDate:     buildIssueDateTime(),
      dueDate:       dueDate || null,
      currency:      'HTG',
      exchangeRate:  0,
      subtotalHtg:   sub,
      subtotalUsd:   0,
      discountType:  'amount',
      discountValue: Number(discountGlobal || 0),
      discountHtg:   discAmt,
      discountUsd:   0,
      taxRate:       Number(taxRate),
      taxHtg:        taxAmt,
      taxUsd:        0,
      totalHtg:      total,
      totalUsd:      0,
      notes,
      terms,
      items: mappedItems,
      // ✅ NOUVO
      payment,
    }

    // ✅ NOUVO — Si PA gen entènèt, sove vant lan lokalman (file datant)
    // olye eseye kontakte backend (ki t ap echwe de tout fason)
    if (!isOnline) {
      try {
        await queueSale(payload)

        // Ajiste estòk lokal (pou pwochen rechèch/vant offline wè bon kantite)
        for (const item of mappedItems) {
          if (item.productId) {
            await adjustCachedProductStock(item.productId, -item.quantity)
          }
        }

        setPendingCount(c => c + 1)

        // ✅ NOUVO — Konstwi yon pseudo-fakti pou pèmèt enprime imedyatman,
        // menm si nou poko gen yon vrè ID fakti (l ap kreye lè senkwonizasyon)
        const shortId = Date.now().toString().slice(-6)
        setOfflineReceipt({
          invoiceNumber: `OFFLINE-${shortId}`,
          // ✅ KORIJE — itilize menm dat+lè EGZAT ki nan payload la (konsistan)
          issueDate: payload.issueDate,
          clientSnapshot: payload.clientSnapshot,
          items: mappedItems.map(it => ({
            productSnapshot: { name: it.description },
            quantity: it.quantity,
            unitPriceHtg: it.unitPriceHtg,
            totalHtg: it.totalHtg,
            discountPct: it.discountPct,
          })),
          subtotalHtg: sub,
          discountHtg: discAmt,
          taxHtg: taxAmt,
          taxRate: Number(taxRate),
          totalHtg: total,
          amountPaidHtg: payment ? payment.amountHtg : 0,
          balanceDueHtg: payment ? Math.max(0, total - payment.amountHtg) : total,
          status: !payment ? 'unpaid' : (payment.amountHtg >= total ? 'paid' : 'partial'),
        })

        toast.success('📴 Pa gen entènèt — vant sove lokalman. L ap senkwonize otomatikman.', { duration: 5000 })
      } catch (e) {
        toast.error('Erè pandan sove vant offline: ' + e.message)
      }
      return
    }

    // ─── Online — kontinye jan sa te ye a ───
    mutation.mutate(payload)
  }, [items, discountGlobal, taxRate, selectedClient, invoiceDate, dueDate, notes, terms, mutation, isOnline, navigate, paymentMethod, amountReceived, creditDeposit])

  // ✅ NOUVO — Enprime resi offline (itilize plugin native Bluetooth/Sunmi/etc)
  const handlePrintOfflineReceipt = useCallback(async () => {
    if (!offlineReceipt) return
    setPrintingOffline(true)
    try {
      await printInvoiceNative(offlineReceipt, tenant, user)
      toast.success('Resi enprime!')
    } catch (e) {
      toast.error('Erè enprime: ' + e.message)
    } finally {
      setPrintingOffline(false)
    }
  }, [offlineReceipt, tenant, user])

  const handleContinueAfterOffline = useCallback(() => {
    setOfflineReceipt(null)
    // ✅ NOUVO — Vant offline reyisi = fakti "kreye" tou, vide panye a
    clearDraftCart()
    navigate('/app/invoices')
  }, [navigate])

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth: isMobile ? '100%' : 860, padding: isMobile ? '0 0 80px' : 0 }}>

      {/* ✅ NOUVO — Banyè Offline / Senkwonizasyon */}
      {isOnline && !cacheReady && (
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'8px 14px', marginBottom:16, borderRadius:10,
          background:'#F1F5F9', fontSize:11, color:D.muted, fontWeight:600,
        }}>
          <RefreshCw size={12} className="spin-icon"/>
          {cachePhase === 'pwodwi' && `Ap cache pwodwi... (${cacheProgress.done}/${cacheProgress.total || '?'})`}
          {cachePhase === 'kliyan' && `Ap cache kliyan... (${cacheProgress.done}/${cacheProgress.total || '?'})`}
          {!cachePhase && 'Ap prepare katalòg offline...'}
          <style>{`@keyframes spin-icon { to { transform: rotate(360deg) } } .spin-icon { animation: spin-icon 1s linear infinite; }`}</style>
        </div>
      )}

      {!isOnline && (
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'12px 16px', marginBottom:16, borderRadius:12,
          background:'rgba(217,119,6,0.1)', border:'1.5px solid rgba(217,119,6,0.3)',
        }}>
          <WifiOff size={18} color="#D97706" style={{ flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:800, color:'#92400E', margin:0 }}>
              Mòd Offline — Pa gen entènèt kounye a
            </p>
            <p style={{ fontSize:11, color:'#92400E', margin:'2px 0 0' }}>
              Vant yo ap sove lokalman e senkwonize otomatikman lè entènèt tounen.
            </p>
          </div>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'12px 16px', marginBottom:16, borderRadius:12,
          background:'rgba(27,42,143,0.06)', border:'1.5px solid rgba(27,42,143,0.2)',
        }}>
          <UploadCloud size={18} color={D.blue} style={{ flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:0 }}>
              {pendingCount} vant an atant pou senkwonize
            </p>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncingNow}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 14px', borderRadius:9,
              background: D.blue, color:'#fff', border:'none',
              fontSize:12, fontWeight:700, cursor: syncingNow ? 'wait' : 'pointer',
              opacity: syncingNow ? 0.6 : 1,
            }}>
            <RefreshCw size={13} className={syncingNow ? 'spin-icon' : ''}/>
            {syncingNow ? 'Ap senkwonize...' : 'Senkwonize Kounye a'}
          </button>
          <style>{`
            @keyframes spin-icon { to { transform: rotate(360deg) } }
            .spin-icon { animation: spin-icon 1s linear infinite; }
          `}</style>
        </div>
      )}

      {/* ✅ NOUVO — Banner/antèt tankou tèt yon dokiman ofisyèl (letterhead),
          ak yon "swoosh" oranj ki fè eko ak logo PLUS GROUP la. Ranplase
          ansyen ti liy kwens la pou bay paj la yon lè pwofesyonèl. */}
      <div style={{
        position:'relative', overflow:'hidden',
        background: D.heroGrad, borderRadius: isMobile ? 18 : 22,
        padding: isMobile ? '18px 18px' : '26px 30px',
        marginBottom: isMobile ? 18 : 26,
        boxShadow:'0 14px 34px rgba(15,26,92,0.28)',
      }}>
        {/* swoosh dekoratif — eko lojo PLUS GROUP la */}
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.9, pointerEvents:'none' }}>
          <path d="M -20 150 C 140 60, 340 210, 620 70" stroke={D.orange} strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 180 C 160 100, 360 240, 620 110" stroke={D.gold} strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>

        <div style={{ position:'relative', display:'flex', alignItems:'center', gap: isMobile ? 12 : 16 }}>
          <button onClick={() => navigate('/app/invoices')}
            style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.22)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, backdropFilter:'blur(4px)' }}>
            <ArrowLeft size={17}/>
          </button>

          <div style={{
            width: isMobile ? 42 : 50, height: isMobile ? 42 : 50, borderRadius:14, flexShrink:0,
            background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 18px rgba(255,107,0,0.35)',
          }}>
            <Receipt size={isMobile ? 19 : 23} color="#fff"/>
          </div>

          <div style={{ minWidth:0 }}>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize: isMobile ? 9 : 10, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', margin:'0 0 3px' }}>
              {tenant?.name || t('invoice.newInvoice') || 'Fakti'}
            </p>
            <h1 style={{ color:'#fff', fontSize: isMobile ? 19 : 25, fontWeight:900, margin:0, letterSpacing:'-0.01em' }}>
              {t('invoice.directInvoiceTitle') || 'Nouvo Fakti Direk'}
            </h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize: isMobile ? 11 : 13, margin:'3px 0 0' }}>
              {t('invoice.directInvoiceDesc') || 'Kreye yon fakti san pase pa devi'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: isMobile ? 16 : 20 }}>

        {/* Kliyan + Dat */}
        <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <User size={14} color={D.blue}/>
            </div>
            <div>
              <p style={{ color:D.muted, fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 1px' }}>Etap 1</p>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>
                {t('invoice.selectClient') || 'Chwazi Kliyan (opsyonèl)'}
              </h3>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div ref={clientRef} style={{ position:'relative' }}>
              {label(t('invoice.selectClient') || 'Kliyan')}
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted, pointerEvents:'none' }}/>
                <input
                  value={selectedClient ? selectedClient.name : clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setClientOpen(true) }}
                  onFocus={() => setClientOpen(true)}
                  onBlur={() => setTimeout(() => setClientOpen(false), 200)}
                  placeholder={t('invoice.searchClientPlaceholder') || 'Chèche kliyan...'}
                  style={{ ...inp, paddingLeft:36, fontSize: isMobile ? 14 : 13 }}
                />
                {selectedClient && (
                  <button type="button" onClick={() => { setSelectedClient(null); setClientSearch('') }}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:D.muted, fontSize:18, lineHeight:1 }}>×</button>
                )}
              </div>
              {clientOpen && clients.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:D.white, borderRadius:12, border:`1.5px solid ${D.blue}40`, boxShadow:'0 8px 32px rgba(27,42,143,0.15)', maxHeight:200, overflowY:'auto', marginTop:4 }}>
                  {clients.map(c => (
                    <div key={c.id}
                      onMouseDown={() => { setSelectedClient(c); setClientOpen(false); setClientSearch('') }}
                      style={{ padding:'12px 14px', cursor:'pointer', fontSize:13, color:D.text, borderBottom:`1px solid ${D.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight:700 }}>{c.name}</span>
                      <span style={{ color:D.muted, fontSize:12 }}>{c.phone || c.email || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '260px', gap:10 }}>
              <div>
                {label(`${t('settings.taxRate') || 'Taks TVA'} (%)`)}
                <input type="number" min="0" max="100" step="0.5" value={taxRate}
                  onChange={e => setTaxRate(e.target.value)} style={inpMoney}
                  onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }} onBlur={e => e.target.style.borderColor = D.border}/>
              </div>
            </div>
          </div>
        </div>

        {/* Atik yo */}
        <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Package size={14} color={D.blue}/>
            </div>
            <div>
              <p style={{ color:D.muted, fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 1px' }}>Etap 2</p>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>
                {t('quotes.items') || 'Atik yo'}
              </h3>
            </div>
          </div>

          {isMobile ? (
            items.map((item, idx) => (
              <ItemRowMobile key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t} count={items.length} isOnline={isOnline} canOverridePrice={canOverridePrice}/>
            ))
          ) : (
            <>
              {/* ✅ KORIJE — header "Rabè HTG" olye "Remiz %" */}
              <div style={{ display:'grid', gridTemplateColumns:'2.2fr 60px 110px 110px 110px 36px', gap:8, padding:'8px 0', borderBottom:`2px solid ${D.border}` }}>
                {[t('invoice.productDesc')||'Pwodui', t('invoice.qty')||'Qte', 'Pri U. (HTG)', 'Rabè (HTG)', 'Total', ''].map((h, i) => (
                  <span key={i} style={{ fontSize:10, fontWeight:800, color:D.blue, textTransform:'uppercase', letterSpacing:'0.05em', textAlign: i >= 1 ? (i === 3 || i === 4 ? 'right' : 'center') : 'left' }}>{h}</span>
                ))}
              </div>
              {items.map((item, idx) => (
                <ItemRowDesktop key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t} isOnline={isOnline} canOverridePrice={canOverridePrice}/>
              ))}
            </>
          )}

          <button type="button" onClick={addItem}
            style={{ display:'flex', alignItems:'center', gap:7, marginTop:12, padding:'10px 18px', borderRadius:10, background:D.blueDim, border:`1px dashed ${D.blue}`, color:D.blue, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <Plus size={14}/> {t('invoice.addAnotherItem') || 'Ajoute yon lòt atik'}
          </button>
        </div>

        {/* Rezime */}
        <div style={{ display:'grid', gridTemplateColumns: '1fr', gap:14 }}>

          <div style={{ background:D.white, borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 26, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Receipt size={14} color={D.blue}/>
              </div>
              <div>
                <p style={{ color:D.muted, fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 1px' }}>Etap 3</p>
                <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>
                  {t('quotes.summary') || 'Rezime'}
                </h3>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:D.muted }}>
                <span>{t('quotes.subtotal') || 'Sou-total'}</span>
                <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{fmt(subtotal)} HTG</span>
              </div>
              {/* ✅ KORIJE — Rabè HTG (montan dirèk) */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:D.muted }}>
                <span>Rabè (HTG)</span>
                <input type="number" min="0" step="0.01" value={discountGlobal}
                  onChange={e => setDiscountGlobal(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inpMoney, width:120, textAlign:'right', fontSize:12, padding:'6px 10px' }}
                  onFocus={e => { e.target.style.borderColor = D.blue; e.target.select() }} onBlur={e => e.target.style.borderColor = D.border}/>
              </div>
              {discountAmount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:D.red }}>
                  <span>- Rabè aplike</span>
                  <span style={{ fontFamily:'monospace' }}>- {fmt(discountAmount)} HTG</span>
                </div>
              )}
              {Number(taxRate) > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:D.muted }}>
                  <span>TVA ({taxRate}%)</span>
                  <span style={{ fontFamily:'monospace' }}>+ {fmt(taxAmount)} HTG</span>
                </div>
              )}
              <div style={{ height:1, background:D.border, margin:'4px 0' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:900 }}>
                <span style={{ color:D.text }}>{t('invoice.totalHtg') || 'TOTAL (HTG)'}</span>
                <span style={{ fontFamily:'monospace', color:D.blue }}>{fmt(grandTotal)} HTG</span>
              </div>
            </div>

            {/* ✅ NOUVO — Seksyon Peman (fèt AN MENM TAN ak kreyasyon fakti a) */}
            <div style={{ marginTop:18 }}>
              <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px' }}>
                Metòd Peman
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
                {[
                  { key:'cash',    label:'Espès'   },
                  { key:'moncash', label:'MonCash'  },
                  { key:'natcash', label:'NatCash'  },
                  { key:'credit',  label:'Kredi'    },
                ].map(m => (
                  <button key={m.key} type="button" onClick={() => setPaymentMethod(m.key)}
                    style={{
                      padding:'10px 8px', borderRadius:10,
                      background: paymentMethod === m.key ? D.blue : '#F8F9FF',
                      color: paymentMethod === m.key ? '#fff' : D.text,
                      border: `1.5px solid ${paymentMethod === m.key ? D.blue : D.border}`,
                      fontSize:12, fontWeight:700, cursor:'pointer',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div style={{ marginTop:10 }}>
                  {label('Kòb Resevwa (HTG)')}
                  <input type="number" min="0" step="0.01" value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value)}
                    placeholder={fmt(grandTotal)}
                    onFocus={e => e.target.select()}
                    style={{ ...inpMoney, textAlign:'right', fontSize:16, padding:'12px 14px' }}/>
                  {Number(amountReceived) > grandTotal && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, padding:'8px 12px', background:D.successBg, borderRadius:8 }}>
                      <span style={{ fontSize:12, color:D.success, fontWeight:700 }}>Monnen pou remèt</span>
                      <span style={{ fontFamily:'monospace', fontWeight:800, color:D.success }}>
                        {fmt(Number(amountReceived) - grandTotal)} HTG
                      </span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'credit' && (
                <div style={{ marginTop:10 }}>
                  {label('Kòb Resevwa (Avans — opsyonèl)')}
                  <input type="number" min="0" step="0.01" value={creditDeposit}
                    onChange={e => setCreditDeposit(e.target.value)}
                    placeholder="0.00"
                    onFocus={e => e.target.select()}
                    style={{ ...inpMoney, textAlign:'right', fontSize:16, padding:'12px 14px' }}/>
                  <p style={{ fontSize:11, color:D.muted, margin:'8px 0 0', fontStyle:'italic' }}>
                    {Number(creditDeposit) > 0
                      ? `ℹ️ Fakti a ap "Pasyèl" — kliyan an ap dwe ${fmt(Math.max(0, grandTotal - Number(creditDeposit)))} HTG apre avans lan.`
                      : `ℹ️ Fakti a ap rete "Pa peye" — kliyan an ap dwe ${fmt(grandTotal)} HTG.`}
                  </p>
                </div>
              )}
            </div>

            {/* ✅ NOUVO — bloke bouton an vizyèlman si se Espès e kòb resevwa a poko antre */}
            <button type="button" onClick={handleSubmit} disabled={mutation.isPending || (paymentMethod === 'cash' && amountReceived === '')}
              style={{ width:'100%', marginTop:22, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 0', borderRadius:12, background: (mutation.isPending || (paymentMethod === 'cash' && amountReceived === '')) ? '#ccc' : `linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', border:'none', fontWeight:800, fontSize:14, cursor: (mutation.isPending || (paymentMethod === 'cash' && amountReceived === '')) ? 'not-allowed' : 'pointer', fontFamily:'DM Sans,sans-serif' }}>
              <Save size={16}/>
              {mutation.isPending ? (t('invoice.saving') || 'Ap sovgade...') : (t('invoice.createInvoice') || 'Kreye Fakti')}
            </button>
            {paymentMethod === 'cash' && amountReceived === '' && (
              <p style={{ fontSize:11, color:D.red, margin:'8px 0 0', textAlign:'center' }}>
                Antre kòb resevwa a pou w ka kreye fakti a.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ✅ NOUVO — Modal Resi Offline (parèt apre yon vant offline reyisi) */}
      {offlineReceipt && (
        <div style={{
          position:'fixed', inset:0, zIndex:1000,
          background:'rgba(15,26,92,0.6)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:16,
        }}>
          <div style={{
            background:'#fff', borderRadius:18, width:'100%', maxWidth:420,
            padding:'28px 24px', textAlign:'center',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width:64, height:64, borderRadius:18,
              background:'rgba(217,119,6,0.1)', color:'#D97706',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 16px',
            }}>
              <WifiOff size={28}/>
            </div>
            <h3 style={{ fontSize:18, fontWeight:900, color:D.text, margin:'0 0 6px' }}>
              Vant Sove Offline
            </h3>
            <p style={{ fontSize:13, color:D.muted, margin:'0 0 4px' }}>
              {offlineReceipt.invoiceNumber}
            </p>
            <p style={{ fontSize:24, fontWeight:900, color:D.blue, fontFamily:'monospace', margin:'8px 0 20px' }}>
              {fmt(offlineReceipt.totalHtg)} HTG
            </p>

            {isNativePrinterAvailable() && (
              <button
                onClick={handlePrintOfflineReceipt}
                disabled={printingOffline}
                style={{
                  width:'100%', padding:'13px', marginBottom:10, borderRadius:12,
                  background:'rgba(14,165,233,0.1)', color:'#0EA5E9',
                  border:'1.5px solid rgba(14,165,233,0.3)',
                  fontWeight:800, fontSize:14, cursor: printingOffline ? 'wait' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                {printingOffline ? 'Ap enprime...' : '🖨 Enprime Resi'}
              </button>
            )}

            <button
              onClick={handleContinueAfterOffline}
              style={{
                width:'100%', padding:'13px', borderRadius:12,
                background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`,
                color:'#fff', border:'none',
                fontWeight:800, fontSize:14, cursor:'pointer',
              }}>
              Kontinye
            </button>

            <p style={{ fontSize:11, color:D.muted, margin:'14px 0 0' }}>
              Vant lan ap senkwonize otomatikman lè entènèt tounen.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}