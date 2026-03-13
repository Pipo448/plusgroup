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

// ✅ ClientSearch — deyò, memo, debounce
const ClientSearch = memo(function ClientSearch({ value, onChange }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState(false)

  // ✅ DEBOUNCE
  const debouncedSearch = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn:  () => clientAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.clients),
    enabled:  debouncedSearch.length >= 1,
    staleTime: 30_000,
  })

  const handleSelect = useCallback((c) => {
    onChange(c)
    setSearch('')
    setOpen(false)
  }, [onChange])

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            className="input pl-9"
            placeholder={t('quotes.searchClient')}
            value={value?.name || search}
            onChange={e => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
          />
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(null); setSearch('') }}
            className="btn-secondary btn-sm px-3">✕</button>
        )}
      </div>
      {open && data?.length > 0 && !value && (
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
        <Package size={14} color="#1B2A8F"/>
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
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:'rgba(27,42,143,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Package size={13} color="#1B2A8F"/>
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
const ItemCard = memo(function ItemCard({ item, index, onChange, onRemove }) {
  const { t } = useTranslation()

  const totalHtg = useMemo(
    () => Number(item.unitPriceHtg||0) * Number(item.quantity||0) * (1 - Number(item.discountPct||0)/100),
    [item.unitPriceHtg, item.quantity, item.discountPct]
  )

  const update = useCallback((field, val) => {
    onChange(index, { ...item, [field]: val })
  }, [index, item, onChange])

  const handleProductSelect = useCallback((p) => {
    onChange(index, { ...item, productId: p.id, productName: p.name, productCode: p.code, unit: p.unit, unitPriceHtg: Number(p.priceHtg), unitPriceUsd: Number(p.priceUsd) })
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

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>{t('quotes.qty')}</label>
          <input type="number" step="0.001" min="0.001" className="input text-center text-sm py-2"
            value={item.quantity} onFocus={e => e.target.select()} onChange={e => update('quantity', e.target.value)}/>
        </div>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Pri HTG</label>
          <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
            value={item.unitPriceHtg} onFocus={e => e.target.select()} onChange={e => update('unitPriceHtg', e.target.value)}/>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, alignItems:'center' }}>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Remiz %</label>
          <input type="number" step="0.5" min="0" max="100" className="input text-center text-sm py-2"
            value={item.discountPct || 0} onFocus={e => e.target.select()} onChange={e => update('discountPct', e.target.value)}/>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 5px' }}>Total</p>
          <p style={{ fontFamily:'monospace', fontWeight:800, color:'#0F1A5C', fontSize:16, margin:0 }}>
            {totalHtg.toLocaleString('fr-HT', { minimumFractionDigits:2 })} <span style={{ fontSize:11, color:'#6B7AAB' }}>HTG</span>
          </p>
        </div>
      </div>
    </div>
  )
})

// ✅ ItemRow — memo, reutilize ProductDropdown
const ItemRow = memo(function ItemRow({ item, index, onChange, onRemove }) {
  const { t } = useTranslation()

  const totalHtg = useMemo(
    () => Number(item.unitPriceHtg||0) * Number(item.quantity||0) * (1 - Number(item.discountPct||0)/100),
    [item.unitPriceHtg, item.quantity, item.discountPct]
  )

  const update = useCallback((field, val) => {
    onChange(index, { ...item, [field]: val })
  }, [index, item, onChange])

  const handleProductSelect = useCallback((p) => {
    onChange(index, { ...item, productId: p.id, productName: p.name, productCode: p.code, unit: p.unit, unitPriceHtg: Number(p.priceHtg), unitPriceUsd: Number(p.priceUsd) })
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
          value={item.unitPriceHtg} onFocus={e => e.target.select()} onChange={e => update('unitPriceHtg', e.target.value)}/>
      </td>
      <td className="p-2 w-20">
        <input type="number" step="0.5" min="0" max="100" className="input text-center text-sm py-2"
          value={item.discountPct || 0} onFocus={e => e.target.select()} onChange={e => update('discountPct', e.target.value)}/>
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
          <label className="label">{t('quotes.discount')}</label>
          <div className="flex gap-2 mb-2">
            <select className="input py-1.5 text-sm" value={discountType} onChange={e => setDiscountType(e.target.value)}>
              <option value="amount">{t('quotes.valueAmount')} ({currency})</option>
              <option value="percent">{t('quotes.percentage')} (%)</option>
            </select>
            <input type="number" min="0" step="0.01" className="input py-1.5 text-sm w-24 text-right font-mono"
              value={discountValue} onFocus={e => e.target.select()} onChange={e => setDiscountValue(e.target.value)}/>
          </div>
          {discountAmt * factor > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>{t('quotes.discount')}</span>
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
  const { tenant } = useAuthStore()
  const isMobile  = useIsMobile()

  const [client, setClient]               = useState(null)
  const [discountType, setDiscountType]   = useState('amount')
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate]             = useState(Number(tenant?.taxRate || 0))
  // ✅ Pa init state ak t() — itilize '' e mete default nan useEffect
  const [notes, setNotes]                 = useState('')
  const [terms, setTerms]                 = useState('')
  const [expiryDate, setExpiryDate]       = useState('')
  const [currency, setCurrency]           = useState(tenant?.defaultCurrency || 'HTG')

  // ✅ id inik pou chak item — evite key={idx}
  const [items, setItems] = useState(() => [
    { _id: Date.now(), productId:null, productName:'', productCode:'', quantity:1, unitPriceHtg:0, unitPriceUsd:0, discountPct:0, unit:'unité' }
  ])

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
      ? rawItems.map((i, idx) => ({
          _id:          i.id || idx,
          productId:    i.productId,
          productName:  i.product?.name    || i.productSnapshot?.name  || '',
          productCode:  i.product?.code    || i.productSnapshot?.code  || '',
          quantity:     Number(i.quantity),
          unitPriceHtg: Number(i.unitPriceHtg),
          unitPriceUsd: Number(i.unitPriceUsd),
          discountPct:  Number(i.discountPct),
          unit:         i.product?.unit    || i.productSnapshot?.unit  || 'unité'
        }))
      : [{ _id: Date.now(), productId:null, productName:'', productCode:'', quantity:1, unitPriceHtg:0, unitPriceUsd:0, discountPct:0, unit:'unité' }]
    )
    setDiscountType(existingQuote.discountType)
    setDiscountValue(Number(existingQuote.discountValue))
    setTaxRate(Number(existingQuote.taxRate))
    setNotes(existingQuote.notes || '')
    setTerms(existingQuote.terms || '')
    setCurrency(existingQuote.currency)
  }, [existingQuote])

  // ✅ useMemo — pa recalcule chak keystroke
  const { subtotal, discountAmt, taxAmt, total } = useMemo(() => {
    const sub      = items.reduce((acc, item) => acc + Number(item.unitPriceHtg||0) * Number(item.quantity||0) * (1 - Number(item.discountPct||0)/100), 0)
    const discAmt  = discountType === 'percent' ? sub * Number(discountValue) / 100 : Number(discountValue)
    const afterD   = sub - discAmt
    const tax      = afterD * Number(taxRate) / 100
    return { subtotal: sub, discountAmt: discAmt, taxAmt: tax, total: afterD + tax }
  }, [items, discountType, discountValue, taxRate])

  // ✅ useCallback — pa rekrye fonksyon
  const updateItem = useCallback((index, newItem) => {
    setItems(prev => prev.map((it, i) => i === index ? newItem : it))
  }, [])

  const removeItem = useCallback((index) => {
    setItems(prev => { if (prev.length === 1) return prev; return prev.filter((_, i) => i !== index) })
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { _id: Date.now(), productId:null, productName:'', productCode:'', quantity:1, unitPriceHtg:0, unitPriceUsd:0, discountPct:0, unit:'unité' }])
  }, [])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? quoteAPI.update(id, data) : quoteAPI.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? t('quotes.quoteUpdated') : t('quotes.quoteCreated'))
      navigate(`/app/quotes/${res.data.quote?.id || id}`)
    }
  })

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!items.length || !items.some(i => i.quantity > 0)) return toast.error(t('quotes.addAtLeastOneItem'))
    mutation.mutate({
      clientId: client?.id,
      clientSnapshot: client ? { id:client.id, name:client.name, phone:client.phone, email:client.email } : {},
      currency, exchangeRate: tenant?.exchangeRate || 132,
      discountType, discountValue: Number(discountValue),
      taxRate: Number(taxRate), notes, terms,
      expiryDate: expiryDate || null,
      items: items.map(i => ({
        productId:       i.productId || null,
        productSnapshot: { name: i.productName || i.description, code: i.productCode, unit: i.unit },
        quantity:        Number(i.quantity),
        unitPriceHtg:    Number(i.unitPriceHtg),
        unitPriceUsd:    Number(i.unitPriceUsd || 0),
        discountPct:     Number(i.discountPct || 0),
        sortOrder:       0
      }))
    })
  }, [items, client, currency, discountType, discountValue, taxRate, notes, terms, expiryDate, mutation, tenant, t])

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

          {/* Kliyan + Dat */}
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
              <div>
                <label className="label">{t('quotes.expiryDate')}</label>
                <input type="date" className="input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}/>
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
                  <ItemCard key={item._id} item={item} index={idx} onChange={updateItem} onRemove={removeItem}/>
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
                      <th className="p-2 text-center">{t('quotes.discountPct')}</th>
                      <th className="p-2 text-right">{t('common.total')}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      // ✅ key={item._id}
                      <ItemRow key={item._id} item={item} index={idx} onChange={updateItem} onRemove={removeItem}/>
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

          {/* Nòt */}
          <div className="card p-5">
            <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
              <div>
                <label className="label">{t('quotes.notesForClient')}</label>
                <textarea className="input resize-none" rows={3}
                  placeholder={t('quotes.notesPlaceholder')}
                  value={notes} onChange={e => setNotes(e.target.value)}/>
              </div>
              <div>
                <label className="label">{t('quotes.generalTerms')}</label>
                <textarea className="input resize-none" rows={3}
                  placeholder={t('quotes.termsPlaceholder')}
                  value={terms} onChange={e => setTerms(e.target.value)}/>
              </div>
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