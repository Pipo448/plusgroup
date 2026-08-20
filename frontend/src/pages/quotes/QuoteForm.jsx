// src/pages/quotes/QuoteForm.jsx
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { quoteAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Search, ArrowLeft, Save,
  ChevronDown, Package, User, Calculator
} from 'lucide-react'
import { useDraftCartStore } from '../../stores/draftCartStore'

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

// ✅ NOUVO — Si yon nivo pri an gwo aktif SOU LIY SA A epi li gen yon
// "Pri Total Pakè a" (totalPriceHtg) sove, epi kantite a se yon MILTIP
// EGZAK sèy nivo a (3, 6, 9... pou yon nivo 3), kalkile total la
// DIRÈKTEMAN ak pri total la — olye de miltipliye pri linite a (ki
// awondi a 2 chif) — pou evite erè tankou 3 × 583,33 = 1749,99 olye
// 1750,00 net. Retounen null si kondisyon yo pa ranpli.
const exactTierGross = (item) => {
  if (!item?._priceMode?.startsWith('tier-') || !item._priceTiers?.length) return null
  const tier = item._priceTiers.find(tr => `tier-${tr.id || tr.minQty}` === item._priceMode)
  const minQty = Number(tier?.minQty || 0)
  if (!tier?.totalPriceHtg || !minQty) return null
  const qty = Number(item.quantity) || 0
  if (qty <= 0 || qty % minQty !== 0) return null
  return (qty / minQty) * Number(tier.totalPriceHtg)
}

// ✅ useDebounce — evite API call chak lèt
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ✅ ClientSearch — deyò, memo, debounce. Kounye a `value` reprezante
// SWA yon vrè kliyan chwazi (gen `id`), SWA yon non tape alamen pou yon
// kliyan ki PA anrejistre nan sistèm nan (san `id`) — toude ka itilize.
const ClientSearch = memo(function ClientSearch({ value, onChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // ✅ DEBOUNCE — chèche selon tèks ki nan chan an, sof si yon vrè kliyan deja chwazi
  const debouncedSearch = useDebounce(value?.id ? '' : (value?.name || ''), 400)

  const { data } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn:  () => clientAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.clients),
    enabled:  debouncedSearch.length >= 1,
    staleTime: 30_000,
  })

  const handleSelect = useCallback((c) => {
    onChange(c)
    setOpen(false)
  }, [onChange])

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            className="input pl-9"
            placeholder={t('quotes.searchClient') || 'Chèche oswa tape non kliyan...'}
            value={value?.name || ''}
            onChange={e => { onChange(e.target.value ? { name: e.target.value } : null); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
          />
        </div>
        {value && (
          <button type="button" onClick={() => onChange(null)}
            className="btn-secondary btn-sm px-3">✕</button>
        )}
      </div>
      {open && data?.length > 0 && !value?.id && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {data.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => handleSelect(c)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{c.phone}</p>
              </div>
            </button>
          ))}

        </div>
      )}
    </div>
  )
})

// ✅ Dropdown pwodui — reutilizab pou ItemCard ak ItemRow
const ProductDropdown = memo(function ProductDropdown({ value, onSelect, onClear, placeholder }) {
  const { t } = useTranslation()
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  // ✅ DEBOUNCE — kle chanjman
  const debouncedSearch = useDebounce(search, 400)

  const { data: productResults } = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn:  () => productAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.products),
    enabled:  debouncedSearch.length >= 2, // ✅ min 2 lèt
    staleTime: 30_000,
  })

  const handleSelect = useCallback((p) => {
    onSelect(p)
    setSearch('')
    setOpen(false)
    setActiveIdx(-1)
  }, [onSelect])

  const handleKey = useCallback((e) => {
    if (!productResults?.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, productResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(productResults[activeIdx]) }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }, [productResults, activeIdx, handleSelect])

  if (value) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'white', borderRadius:10, border:'1.5px solid rgba(27,42,143,0.15)' }}>
        {/* ✅ NOUVO — Vinyèt foto pwodwi (si genyen) */}
        <div style={{
          width:26, height:26, borderRadius:7, flexShrink:0,
          background: value.imageUrl ? `url(${value.imageUrl}) center/cover no-repeat` : 'rgba(27,42,143,0.08)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {!value.imageUrl && <Package size={13} color="#1B2A8F"/>}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#0F1A5C', margin:0 }}>{value.name}</p>
          <p style={{ fontSize:11, color:'#6B7AAB', margin:0, fontFamily:'monospace' }}>{value.code}</p>
        </div>
        <button type="button" onClick={onClear}
          style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:2 }}>
          <ChevronDown size={14}/>
        </button>
      </div>
    )
  }

  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <Package size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
        <input
          style={{ width:'100%', padding:'8px 12px 8px 32px', borderRadius:10, border:'1.5px solid rgba(27,42,143,0.15)', fontSize:13, outline:'none', boxSizing:'border-box', background:'white' }}
          placeholder={placeholder || t('quotes.searchProduct')}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => { if (search.length >= 1) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKey}
        />
      </div>
      {open && productResults?.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'white', border:'1.5px solid rgba(27,42,143,0.15)', borderRadius:12, boxShadow:'0 8px 24px rgba(27,42,143,0.15)', zIndex:50, overflow:'hidden', minWidth:300 }}>
          {productResults.map((p, i) => (
            <button key={p.id} type="button"
              onMouseDown={() => handleSelect(p)}
              style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'9px 12px', border:'none', cursor:'pointer', textAlign:'left',
                background: i === activeIdx ? 'rgba(27,42,143,0.07)' : 'white',
                borderBottom: i < productResults.length - 1 ? '1px solid rgba(27,42,143,0.06)' : 'none',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                {/* ✅ NOUVO — Vinyèt foto pwodwi (si genyen) */}
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background: p.imageUrl ? `url(${p.imageUrl}) center/cover no-repeat` : 'rgba(27,42,143,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {!p.imageUrl && <Package size={13} color="#1B2A8F"/>}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#0F1A5C', margin:0 }}>{p.name}</p>
                  <p style={{ fontSize:10, color:'#6B7AAB', margin:0, fontFamily:'monospace' }}>{p.code} · {p.unit}</p>
                </div>
              </div>
              <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:700, color:'#1B2A8F', flexShrink:0 }}>
                {Number(p.priceHtg).toLocaleString('fr-HT', { minimumFractionDigits:2 })} HTG
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

// ✅ ItemCard — memo, reutilize ProductDropdown
const ItemCard = memo(function ItemCard({ item, index, onChange, onRemove, canOverridePrice }) {
  const { t } = useTranslation()

  // ✅ KORIJE — kalkile total ak discountAmt (HTG), pa discountPct
  const gross   = exactTierGross(item) ?? (Number(item.unitPriceHtg||0) * Number(item.quantity||0))
  const discAmt = Number(item.discountAmt||0)
  const totalHtg = useMemo(
    () => Math.max(0, gross - discAmt),
    [gross, discAmt]
  )

  const update = useCallback((field, val) => {
    if (field === 'unitPriceHtg') {
      // ✅ NOUVO — si itilizatè a tape yon pri alamen, koupe auto-switch la
      // (pa fòse nivo sou li ankò pou liy sa a). Sa a sèlman rive si
      // canOverridePrice=true, paske chan an disabled pou lòt wòl yo.
      onChange(index, { ...item, unitPriceHtg: val, _priceMode: 'manual' })
      return
    }
    if (field === 'quantity') {
      const next = { ...item, quantity: val }
      // ✅ NOUVO — Pri "An Gwo" (plizyè nivo): si pwodwi a gen nivo epi
      // kesye a poko chanje pri a alamen pou liy sa a, chanje pri a
      // otomatikman selon pi bon nivo ki matche kantite a.
      if (item._priceTiers?.length && item._priceMode !== 'manual') {
        const bestTier = pickBestTier(item._priceTiers, val)
        if (bestTier) {
          next.unitPriceHtg = Number(bestTier.priceHtg)
          next.unitPriceUsd = bestTier.priceUsd != null ? Number(bestTier.priceUsd) : 0
          next._priceMode   = `tier-${bestTier.id || bestTier.minQty}`
        } else {
          next.unitPriceHtg = item._retailPriceHtg
          next.unitPriceUsd = item._retailPriceUsd
          next._priceMode   = 'retail'
        }
      }
      onChange(index, next)
      return
    }
    onChange(index, { ...item, [field]: val })
  }, [index, item, onChange])

  // ✅ NOUVO — Pou KESYE (pa admin): switch ki bloke ant Detay ak nivo yo
  // — PA tape lib. Sa bay flèksibilite biznis (kesye ka toujou vann an
  // gwo menm si kantite a pa rive nan sèy la) san yo pa ka envante yon pri.
  // `tier` se null pou Detay, oswa youn nan objè `item._priceTiers`.
  const forcePriceMode = useCallback((tier) => {
    if (tier) {
      onChange(index, {
        ...item,
        quantity: Number(tier.minQty),
        unitPriceHtg: Number(tier.priceHtg),
        unitPriceUsd: tier.priceUsd != null ? Number(tier.priceUsd) : 0,
        _priceMode: `tier-${tier.id || tier.minQty}`,
      })
    } else {
      onChange(index, { ...item, unitPriceHtg: item._retailPriceHtg, unitPriceUsd: item._retailPriceUsd, _priceMode: 'retail' })
    }
  }, [index, item, onChange])

  const handleProductSelect = useCallback((p) => {
    const qty = Number(item.quantity) || 1
    // ✅ NOUVO — sonje pri detay + lis nivo pri an gwo pwodwi a sou liy
    // la, pou nou ka otomatikman chwazi bon pri a selon kantite a
    const tiers = (p.priceTiers || []).slice().sort((a,b) => a.minQty - b.minQty)
    const bestTier = pickBestTier(tiers, qty)
    onChange(index, {
      ...item,
      productId: p.id, productName: p.name, productCode: p.code, unit: p.unit,
      unitPriceHtg: bestTier ? Number(bestTier.priceHtg) : Number(p.priceHtg),
      unitPriceUsd: bestTier ? (bestTier.priceUsd != null ? Number(bestTier.priceUsd) : 0) : Number(p.priceUsd),
      _retailPriceHtg: Number(p.priceHtg),
      _retailPriceUsd: Number(p.priceUsd),
      _priceTiers: tiers,
      _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
    })
  }, [index, item, onChange])

  const handleProductClear = useCallback(() => {
    onChange(index, { ...item, productName:'', productId:null })
  }, [index, item, onChange])

  const productValue = item.productName ? { name: item.productName, code: item.productCode } : null

  return (
    <div style={{ background:'#F8F9FF', borderRadius:12, border:'1.5px solid rgba(27,42,143,0.12)', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em' }}>Atik #{index + 1}</span>
        <button type="button" onClick={() => onRemove(index)}
          style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(192,57,43,0.2)', background:'rgba(192,57,43,0.06)', color:'#C0392B', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Trash2 size={13}/>
        </button>
      </div>

      <ProductDropdown
        value={productValue}
        onSelect={handleProductSelect}
        onClear={handleProductClear}
        placeholder={t('quotes.searchProduct')}
      />

      {!item.productName && (
        <input className="input text-sm mt-1" placeholder={t('quotes.orTypeDescription')}
          value={item.description || ''} onChange={e => update('description', e.target.value)}/>
      )}

      {/* ✅ KORIJE — Qte ak Rabè sou menm liy (2 kolòn); Pri a ap gen tout
          lajè kat la pi ba a, paske bouton nivo yo (Detay/3/Douzèn...)
          bezwen plas pou yo rete gwo ase pou touche sou iPhone. */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>{t('quotes.qty')}</label>
          <input type="number" step="0.001" min="0.001" className="input text-center text-sm py-2"
            value={item.quantity} onFocus={e => e.target.select()} onChange={e => update('quantity', e.target.value)}/>
        </div>
        <div>
          {/* ✅ KORIJE — Rabè HTG (kantite kòb), pa pousantaj */}
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Rabè (HTG)</label>
          <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
            value={item.discountAmt || 0} onFocus={e => e.target.select()} onChange={e => update('discountAmt', e.target.value)}/>
        </div>
      </div>

      <div>
        <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Pri HTG</label>
        <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
          value={item.unitPriceHtg}
          disabled={!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual'))}
          style={!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual')) ? { background:'#F1F5F9', color:'#64748B', cursor:'not-allowed' } : undefined}
          onFocus={e => e.target.select()} onChange={e => update('unitPriceHtg', e.target.value)}/>
        {/* ✅ NOUVO — bouton nivo yo pou TOUT moun (admin ak kesye), pou evite kalkil manyèl.
            Gwosè touch ogmante (padding/fontSize pi gwo) pou yo fasil peze ak dwèt sou iPhone. */}
        {item._priceTiers?.length > 0 && (
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            <button type="button" onClick={() => forcePriceMode(null)} style={{
              fontSize:12, fontWeight:800, padding:'8px 12px', borderRadius:8, border:'1px solid', minHeight:36,
              borderColor: item._priceMode === 'retail' ? '#1B2A8F' : '#E2E8F0',
              background: item._priceMode === 'retail' ? '#1B2A8F' : '#fff',
              color: item._priceMode === 'retail' ? '#fff' : '#6B7AAB', cursor:'pointer',
            }}>DETAY</button>
            {item._priceTiers.map(tr => (
              <button key={tr.id || tr.minQty} type="button" onClick={() => forcePriceMode(tr)} style={{
                fontSize:12, fontWeight:800, padding:'8px 12px', borderRadius:8, border:'1px solid', minHeight:36,
                borderColor: item._priceMode === `tier-${tr.id || tr.minQty}` ? '#FF6B00' : '#E2E8F0',
                background: item._priceMode === `tier-${tr.id || tr.minQty}` ? '#FF6B00' : '#fff',
                color: item._priceMode === `tier-${tr.id || tr.minQty}` ? '#fff' : '#6B7AAB', cursor:'pointer',
              }}>{tr.label || `${tr.minQty}+`}</button>
            ))}
            {/* ✅ NOUVO — Admin sèlman: deloke chan an pou tape yon pri espesyal */}
            {canOverridePrice && (
              <button type="button" onClick={() => onChange(index, { ...item, _priceMode: 'manual' })} style={{
                fontSize:12, fontWeight:800, padding:'8px 12px', borderRadius:8, border:'1px dashed', minHeight:36,
                borderColor: item._priceMode === 'manual' ? '#FF6B00' : '#E2E8F0',
                background: item._priceMode === 'manual' ? 'rgba(255,107,0,0.1)' : '#fff',
                color: item._priceMode === 'manual' ? '#FF6B00' : '#6B7AAB', cursor:'pointer',
              }}>✏️ Manyèl</button>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign:'right' }}>
        <p style={{ fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 5px' }}>Total</p>
        <p style={{ fontFamily:'monospace', fontWeight:800, color:'#0F1A5C', fontSize:16, margin:0 }}>
          {totalHtg.toLocaleString('fr-HT', { minimumFractionDigits:2 })} <span style={{ fontSize:11, color:'#6B7AAB' }}>HTG</span>
        </p>
      </div>
    </div>
  )
})

// ✅ ItemRow — memo, reutilize ProductDropdown
const ItemRow = memo(function ItemRow({ item, index, onChange, onRemove, canOverridePrice }) {
  const { t } = useTranslation()

  // ✅ KORIJE — kalkile total ak discountAmt (HTG)
  const gross   = exactTierGross(item) ?? (Number(item.unitPriceHtg||0) * Number(item.quantity||0))
  const discAmt = Number(item.discountAmt||0)
  const totalHtg = useMemo(
    () => Math.max(0, gross - discAmt),
    [gross, discAmt]
  )

  const update = useCallback((field, val) => {
    if (field === 'unitPriceHtg') {
      onChange(index, { ...item, unitPriceHtg: val, _priceMode: 'manual' })
      return
    }
    if (field === 'quantity') {
      const next = { ...item, quantity: val }
      if (item._priceTiers?.length && item._priceMode !== 'manual') {
        const bestTier = pickBestTier(item._priceTiers, val)
        if (bestTier) {
          next.unitPriceHtg = Number(bestTier.priceHtg)
          next.unitPriceUsd = bestTier.priceUsd != null ? Number(bestTier.priceUsd) : 0
          next._priceMode   = `tier-${bestTier.id || bestTier.minQty}`
        } else {
          next.unitPriceHtg = item._retailPriceHtg
          next.unitPriceUsd = item._retailPriceUsd
          next._priceMode   = 'retail'
        }
      }
      onChange(index, next)
      return
    }
    onChange(index, { ...item, [field]: val })
  }, [index, item, onChange])

  // ✅ NOUVO — menm switch bloke Detay/nivo yo, vèsyon tablo
  const forcePriceMode = useCallback((tier) => {
    if (tier) {
      onChange(index, {
        ...item,
        quantity: Number(tier.minQty),
        unitPriceHtg: Number(tier.priceHtg),
        unitPriceUsd: tier.priceUsd != null ? Number(tier.priceUsd) : 0,
        _priceMode: `tier-${tier.id || tier.minQty}`,
      })
    } else {
      onChange(index, { ...item, unitPriceHtg: item._retailPriceHtg, unitPriceUsd: item._retailPriceUsd, _priceMode: 'retail' })
    }
  }, [index, item, onChange])

  const handleProductSelect = useCallback((p) => {
    const qty = Number(item.quantity) || 1
    const tiers = (p.priceTiers || []).slice().sort((a,b) => a.minQty - b.minQty)
    const bestTier = pickBestTier(tiers, qty)
    onChange(index, {
      ...item,
      productId: p.id, productName: p.name, productCode: p.code, unit: p.unit,
      unitPriceHtg: bestTier ? Number(bestTier.priceHtg) : Number(p.priceHtg),
      unitPriceUsd: bestTier ? (bestTier.priceUsd != null ? Number(bestTier.priceUsd) : 0) : Number(p.priceUsd),
      _retailPriceHtg: Number(p.priceHtg),
      _retailPriceUsd: Number(p.priceUsd),
      _priceTiers: tiers,
      _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
    })
  }, [index, item, onChange])

  const handleProductClear = useCallback(() => {
    onChange(index, { ...item, productName:'', productId:null })
  }, [index, item, onChange])

  const productValue = item.productName ? { name: item.productName, code: item.productCode } : null

  return (
    <tr>
      <td className="p-2 min-w-[200px]">
        <ProductDropdown
          value={productValue}
          onSelect={handleProductSelect}
          onClear={handleProductClear}
          placeholder={t('quotes.searchProduct')}
        />
        {!item.productName && (
          <input className="input text-sm py-1.5 mt-1" placeholder={t('quotes.orTypeDescription')}
            value={item.description || ''} onChange={e => update('description', e.target.value)}/>
        )}
      </td>
      <td className="p-2 w-24">
        <input type="number" step="0.001" min="0.001" className="input text-center text-sm py-2"
          value={item.quantity} onFocus={e => e.target.select()} onChange={e => update('quantity', e.target.value)}/>
      </td>
      <td className="p-2 w-32">
        <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
          value={item.unitPriceHtg}
          disabled={!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual'))}
          style={!(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual')) ? { background:'#F1F5F9', color:'#64748B', cursor:'not-allowed' } : undefined}
          onFocus={e => e.target.select()} onChange={e => update('unitPriceHtg', e.target.value)}/>
        {item._priceTiers?.length > 0 && (
          <div style={{ display:'flex', gap:3, marginTop:4, flexWrap:'wrap' }}>
            <button type="button" onClick={() => forcePriceMode(null)} style={{
              fontSize:8, fontWeight:800, padding:'3px 6px', borderRadius:5, border:'1px solid',
              borderColor: item._priceMode === 'retail' ? '#1B2A8F' : '#E2E8F0',
              background: item._priceMode === 'retail' ? '#1B2A8F' : '#fff',
              color: item._priceMode === 'retail' ? '#fff' : '#6B7AAB', cursor:'pointer',
            }}>DETAY</button>
            {item._priceTiers.map(tr => (
              <button key={tr.id || tr.minQty} type="button" onClick={() => forcePriceMode(tr)} style={{
                fontSize:8, fontWeight:800, padding:'3px 6px', borderRadius:5, border:'1px solid',
                borderColor: item._priceMode === `tier-${tr.id || tr.minQty}` ? '#FF6B00' : '#E2E8F0',
                background: item._priceMode === `tier-${tr.id || tr.minQty}` ? '#FF6B00' : '#fff',
                color: item._priceMode === `tier-${tr.id || tr.minQty}` ? '#fff' : '#6B7AAB', cursor:'pointer',
              }}>{tr.label || `${tr.minQty}+`}</button>
            ))}
            {/* ✅ NOUVO — Admin sèlman: deloke chan an pou tape yon pri espesyal */}
            {canOverridePrice && (
              <button type="button" onClick={() => onChange(index, { ...item, _priceMode: 'manual' })} style={{
                fontSize:8, fontWeight:800, padding:'3px 6px', borderRadius:5, border:'1px dashed',
                borderColor: item._priceMode === 'manual' ? '#FF6B00' : '#E2E8F0',
                background: item._priceMode === 'manual' ? 'rgba(255,107,0,0.1)' : '#fff',
                color: item._priceMode === 'manual' ? '#FF6B00' : '#6B7AAB', cursor:'pointer',
              }}>✏️ Manyèl</button>
            )}
          </div>
        )}
      </td>
      <td className="p-2 w-28">
        {/* ✅ KORIJE — Rabè HTG (kantite), pa pousantaj */}
        <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
          value={item.discountAmt || 0} onFocus={e => e.target.select()} onChange={e => update('discountAmt', e.target.value)}/>
      </td>
      <td className="p-2 w-36 text-right">
        <span className="font-mono font-semibold text-slate-800">
          {totalHtg.toLocaleString('fr-HT', { minimumFractionDigits:2 })} HTG
        </span>
      </td>
      <td className="p-2 w-10">
        <button type="button" onClick={() => onRemove(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
          <Trash2 size={15}/>
        </button>
      </td>
    </tr>
  )
})

// ✅ TotauxBlock — deyò QuoteForm, memo
const TotauxBlock = memo(function TotauxBlock({
  subtotal, discountAmt, taxAmt, total,
  discountType, discountValue, taxRate, currency,
  setDiscountType, setDiscountValue, setTaxRate, setCurrency,
  exchangeRate, isMobile, isPending, isEdit, t
}) {
  const other    = currency === 'HTG' ? 'USD' : 'HTG'
  const rate     = Number(exchangeRate || 132)
  const otherAmt = currency === 'HTG' ? total / rate : total * rate
  const factor   = currency === 'USD' ? (1 / rate) : 1
  const fmt2     = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits:2, maximumFractionDigits:2 })

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-brand-600"/>
        <h3 className="font-display font-bold text-slate-800">{t('quotes.summary')}</h3>
      </div>

      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        {['HTG','USD'].map(c => (
          <button key={c} type="button" onClick={() => setCurrency(c)}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${currency === c ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>
            {c === 'HTG' ? '🇭🇹 HTG' : '🇺🇸 USD'}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{t('quotes.subtotal')}</span>
          <span className="font-mono font-medium">{fmt2(subtotal * factor)} {currency}</span>
        </div>

        <div className="border-t border-slate-100 pt-3">
          {/* ✅ KORIJE — sèlman kantite kòb (HTG), pa pousantaj */}
          <label className="label">Rabè ({currency})</label>
          <input type="number" min="0" step="0.01" className="input py-1.5 text-sm text-right font-mono w-full"
            value={discountValue} onFocus={e => e.target.select()} onChange={e => setDiscountValue(e.target.value)}
            placeholder="0.00"/>
          {discountAmt * factor > 0 && (
            <div className="flex justify-between text-sm text-red-600 mt-2">
              <span>Rabè aplike</span>
              <span className="font-mono">-{fmt2(discountAmt * factor)} {currency}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3">
          <label className="label">{t('quotes.taxVAT')} (%)</label>
          <input type="number" min="0" max="100" step="0.5" className="input py-1.5 text-sm text-right font-mono"
            value={taxRate} onFocus={e => e.target.select()} onChange={e => setTaxRate(e.target.value)}/>
          {taxAmt * factor > 0 && (
            <div className="flex justify-between text-sm text-slate-600 mt-2">
              <span>{t('quotes.taxVAT')} ({taxRate}%)</span>
              <span className="font-mono">{fmt2(taxAmt * factor)} {currency}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-brand-200 pt-3 mt-1">
          <div className="flex justify-between items-start">
            <span className="font-display font-bold text-slate-800 text-lg">TOTAL</span>
            <div className="text-right">
              <p className="font-bold text-brand-700 text-xl font-mono">{fmt2(total * factor)} {currency}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">≈ {fmt2(otherAmt)} {other}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
        <div className="flex justify-between">
          <span>{t('quotes.rate')}:</span>
          <span className="font-mono font-medium">1 USD = {rate.toFixed(2)} HTG</span>
        </div>
      </div>

      {isMobile && (
        <button type="submit" disabled={isPending} className="btn-primary w-full mt-4" style={{ justifyContent:'center' }}>
          <Save size={16}/> {isPending ? t('common.saving') : isEdit ? t('common.update') : t('quotes.createQuote')}
        </button>
      )}
    </div>
  )
})

// ── Main QuoteForm
export default function QuoteForm() {
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isEdit    = !!id
  const { tenant, user } = useAuthStore()
  // ✅ NOUVO — Sèlman admin/manajè ka tape yon pri alamen (override lib).
  // Kesye jwenn sèlman aksè pou CHWAZI ant "Detay" ak "Gwo" (pri konfigire
  // deja sou pwodwi a) — pa ka envante yon lòt pri. Ajiste lis wòl la si
  // gen lòt wòl (egz. 'manager') nan sistèm nan.
  const PRICE_OVERRIDE_ROLES = ['admin']
  const canOverridePrice = PRICE_OVERRIDE_ROLES.includes(user?.role)
  const isMobile  = useIsMobile()

  // ✅ NOUVO — Panye santral (pataje ak paj Pwodui a ak Fakti a). Sèlman pou
  // yon NOUVO devi (pa lè n ap modifye youn ki egziste deja).
  const draftItems     = useDraftCartStore(s => s.items)
  const setDraftItems  = useDraftCartStore(s => s.setItems)
  const clearDraftCart = useDraftCartStore(s => s.clear)

  const [client, setClient]               = useState(null)
  const [discountType, setDiscountType]   = useState('amount')
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate]             = useState(Number(tenant?.taxRate || 0))
  const [notes, setNotes]                 = useState('')
  const [terms, setTerms]                 = useState('')
  const [expiryDate, setExpiryDate]       = useState('')
  // ✅ KORIJE — defo USD (olye HTG)
  const [currency, setCurrency]           = useState(tenant?.defaultCurrency || 'USD')

  // ✅ KORIJE — itilize discountAmt (HTG) olye discountPct
  // ✅ NOUVO — si se yon nouvo devi (pa modifikasyon) e panye santral la gen
  // atik ladan l (soti nan bouton panye Pwodui a), ranpli fakti a ak yo.
  const [items, setItems] = useState(() => {
    if (!isEdit && draftItems.length) {
      return draftItems.map((it, idx) => ({
        _id:          it.id || Date.now() + idx,
        productId:    it.productId,
        productName:  it.description,
        productCode:  it.product?.code || '',
        quantity:     Number(it.qty) || 1,
        unitPriceHtg: Number(it.unitPrice) || 0,
        unitPriceUsd: 0,
        discountAmt:  Number(it.discount) || 0,
        unit:         it.product?.unit || 'unité',
      }))
    }
    return [
      { _id: Date.now(), productId:null, productName:'', productCode:'', quantity:1, unitPriceHtg:0, unitPriceUsd:0, discountAmt:0, unit:'unité' }
    ]
  })

  // ✅ NOUVO — Chak fwa itilizatè a modifye yon liy DIRÈKTEMAN nan paj Devi a
  // (e se yon nouvo devi, pa yon modifikasyon), senkwonize chanjman an tounen
  // nan panye santral la, pou l rete ajou si l ale sou Pwodui pou chèche plis.
  useEffect(() => {
    if (isEdit) return
    setDraftItems(items.map(it => ({
      id: it._id,
      description: it.productName,
      productId: it.productId,
      unitPrice: it.unitPriceHtg,
      qty: it.quantity,
      discount: it.discountAmt,
    })))
  }, [items, isEdit])

  const { data: existingQuote } = useQuery({
    queryKey: ['quote', id],
    queryFn:  () => quoteAPI.getOne(id).then(r => r.data.quote),
    enabled:  isEdit,
    staleTime: 30_000,
  })

  // ✅ Default notes/terms — apre lang chaje
  useEffect(() => {
    if (!notes) setNotes(t('quotes.defaultNotes'))
    if (!terms) setTerms(t('quotes.defaultTerms'))
  }, [t]) // eslint-disable-line

  useEffect(() => {
    if (!existingQuote) return
    setClient(existingQuote.client || existingQuote.clientSnapshot)
    const rawItems = Array.isArray(existingQuote.items) ? existingQuote.items : []
    setItems(rawItems.length > 0
      ? rawItems.map((i, idx) => {
          // ✅ KORIJE — konvèti discountPct (ki sove nan DB) → discountAmt (HTG) pou afichaj
          const gross    = Number(i.unitPriceHtg||0) * Number(i.quantity||0)
          const discPct  = Number(i.discountPct||0)
          const discAmt  = gross * discPct / 100
          return {
            _id:          i.id || idx,
            productId:    i.productId,
            productName:  i.product?.name    || i.productSnapshot?.name  || '',
            productCode:  i.product?.code    || i.productSnapshot?.code  || '',
            quantity:     Number(i.quantity),
            unitPriceHtg: Number(i.unitPriceHtg),
            unitPriceUsd: Number(i.unitPriceUsd),
            discountAmt:  Math.round(discAmt * 100) / 100,  // HTG amount
            unit:         i.product?.unit    || i.productSnapshot?.unit  || 'unité'
          }
        })
      : [{ _id: Date.now(), productId:null, productName:'', productCode:'', quantity:1, unitPriceHtg:0, unitPriceUsd:0, discountAmt:0, unit:'unité' }]
    )
    setDiscountType('amount')  // ✅ Toujou amount kounye a
    setDiscountValue(Number(existingQuote.discountHtg || existingQuote.discountValue || 0))
    setTaxRate(Number(existingQuote.taxRate))
    setNotes(existingQuote.notes || '')
    setTerms(existingQuote.terms || '')
    setCurrency(existingQuote.currency)
  }, [existingQuote])

  // ✅ useMemo — pa recalcule chak keystroke (kounye a ak discountAmt HTG pa liy)
  const { subtotal, discountAmt, taxAmt, total } = useMemo(() => {
    const sub      = items.reduce((acc, item) => {
      const gross   = exactTierGross(item) ?? (Number(item.unitPriceHtg||0) * Number(item.quantity||0))
      const lineDisc = Number(item.discountAmt||0)
      return acc + Math.max(0, gross - lineDisc)
    }, 0)
    // ✅ Rabè global toujou kantite (HTG) kounye a
    const discAmt  = Number(discountValue)
    const afterD   = Math.max(0, sub - discAmt)
    const tax      = afterD * Number(taxRate) / 100
    return { subtotal: sub, discountAmt: discAmt, taxAmt: tax, total: afterD + tax }
  }, [items, discountValue, taxRate])

  // ✅ useCallback — pa rekrye fonksyon
  const updateItem = useCallback((index, newItem) => {
    setItems(prev => prev.map((it, i) => i === index ? newItem : it))
  }, [])

  const removeItem = useCallback((index) => {
    setItems(prev => { if (prev.length === 1) return prev; return prev.filter((_, i) => i !== index) })
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { _id: Date.now(), productId:null, productName:'', productCode:'', quantity:1, unitPriceHtg:0, unitPriceUsd:0, discountAmt:0, unit:'unité' }])
  }, [])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? quoteAPI.update(id, data) : quoteAPI.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? t('quotes.quoteUpdated') : t('quotes.quoteCreated'))
      // ✅ NOUVO — Devi a kreye avèk siksè (pa yon modifikasyon), vide panye santral la
      if (!isEdit) clearDraftCart()
      navigate(`/app/quotes/${res.data.quote?.id || id}`)
    }
  })

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!items.length || !items.some(i => i.quantity > 0)) return toast.error(t('quotes.addAtLeastOneItem'))
    mutation.mutate({
      clientId: client?.id || null,
      clientSnapshot: client ? { id:client.id, name:client.name, phone:client.phone, email:client.email } : {},
      currency, exchangeRate: tenant?.exchangeRate || 132,
      // ✅ KORIJE — Rabè global toujou 'amount' kounye a
      discountType: 'amount',
      discountValue: Number(discountValue),
      taxRate: Number(taxRate), notes, terms,
      expiryDate: expiryDate || null,
      items: items.map(i => {
        // ✅ KORIJE — konvèti discountAmt (HTG) → discountPct (%) pou backend
        const gross    = exactTierGross(i) ?? (Number(i.unitPriceHtg||0) * Number(i.quantity||0))
        const discAmt  = Number(i.discountAmt||0)
        const discPct  = gross > 0 ? (discAmt / gross) * 100 : 0
        return {
          productId:       i.productId || null,
          productSnapshot: { name: i.productName || i.description, code: i.productCode, unit: i.unit, tierLabel: i._priceMode?.startsWith('tier-') ? (i._priceTiers?.find(tr => `tier-${tr.id || tr.minQty}` === i._priceMode)?.label || 'Gwo') : (i.productId ? 'Detay' : null) },
          quantity:        Number(i.quantity),
          unitPriceHtg:    Number(i.unitPriceHtg),
          unitPriceUsd:    Number(i.unitPriceUsd || 0),
          discountPct:     Math.round(discPct * 100) / 100,  // sove kòm pousantaj nan DB
          sortOrder:       0
        }
      })
    })
  }, [items, client, currency, discountValue, taxRate, notes, terms, expiryDate, mutation, tenant, t])

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/app/quotes')} className="btn-ghost p-2">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="page-title">{isEdit ? t('quotes.editQuote') : t('quotes.newQuote')}</h1>
            {isEdit && <p className="text-slate-500 text-sm">{existingQuote?.quoteNumber}</p>}
          </div>
        </div>
        {!isMobile && (
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            <Save size={16}/> {mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('quotes.createQuote')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Kliyan */}
          <div className="card p-5">
            <h3 className="section-title">{t('quotes.clientInfo')}</h3>
            <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
              <div className={isMobile ? '' : 'col-span-2'}>
                <label className="label">{t('quotes.client')}</label>
                <ClientSearch value={client} onChange={setClient}/>
              </div>
              <div>
                <label className="label">{t('quotes.currency')}</label>
                <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="HTG">HTG — {t('quotes.gourde')}</option>
                  <option value="USD">USD — {t('quotes.dollar')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Atik yo */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">{t('quotes.items')}</h3>
              <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                <Plus size={14}/> {t('quotes.addLine')}
              </button>
            </div>

            {isMobile ? (
              <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10 }}>
                {items.map((item, idx) => (
                  // ✅ key={item._id} — stab
                  <ItemCard key={item._id} item={item} index={idx} onChange={updateItem} onRemove={removeItem} canOverridePrice={canOverridePrice}/>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs font-display font-semibold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="p-2 text-left pl-4">{t('quotes.productDescription')}</th>
                      <th className="p-2 text-center">{t('quotes.qty')}</th>
                      <th className="p-2 text-right">{t('quotes.unitPrice')}</th>
                      <th className="p-2 text-right">Rabè (HTG)</th>
                      <th className="p-2 text-right">{t('common.total')}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      // ✅ key={item._id}
                      <ItemRow key={item._id} item={item} index={idx} onChange={updateItem} onRemove={removeItem} canOverridePrice={canOverridePrice}/>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 border-t border-slate-100">
              <button type="button" onClick={addItem}
                className="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-1.5 transition-colors">
                <Plus size={15}/> {t('quotes.addAnotherItem')}
              </button>
            </div>
          </div>

          {isMobile && (
            <TotauxBlock
              subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total}
              discountType={discountType} discountValue={discountValue} taxRate={taxRate} currency={currency}
              setDiscountType={setDiscountType} setDiscountValue={setDiscountValue}
              setTaxRate={setTaxRate} setCurrency={setCurrency}
              exchangeRate={tenant?.exchangeRate} isMobile={true}
              isPending={mutation.isPending} isEdit={isEdit} t={t}
            />
          )}
        </div>

        {!isMobile && (
          <div className="space-y-4">
            <div className="sticky top-4">
              <TotauxBlock
                subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total}
                discountType={discountType} discountValue={discountValue} taxRate={taxRate} currency={currency}
                setDiscountType={setDiscountType} setDiscountValue={setDiscountValue}
                setTaxRate={setTaxRate} setCurrency={setCurrency}
                exchangeRate={tenant?.exchangeRate} isMobile={false}
                isPending={mutation.isPending} isEdit={isEdit} t={t}
              />
            </div>
          </div>
        )}
      </div>
    </form>
  )
}