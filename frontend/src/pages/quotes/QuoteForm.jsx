// src/pages/quotes/QuoteForm.jsx - WITH FULL i18n + RESPONSIVE
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { quoteAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Search, ArrowLeft, Save, Send,
  ChevronDown, Package, User, Calculator
} from 'lucide-react'

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 640))
  }
  return isMobile
}

// Recherche client inline
const ClientSearch = ({ value, onChange }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['clients-search', search],
    queryFn: () => clientAPI.getAll({ search, limit: 8 }).then(r => r.data.clients),
    enabled: search.length > 0
  })

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={t('quotes.searchClient')}
            value={value?.name || search}
            onChange={e => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
            onFocus={() => setOpen(true)}
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
              onClick={() => { onChange(c); setSearch(''); setOpen(false) }}
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
}

// ── Atik — vèsyon MOBIL (kat)
const ItemCard = ({ item, index, onChange, onRemove }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const { data: productResults } = useQuery({
    queryKey: ['product-search', search],
    queryFn: () => productAPI.getAll({ search, limit: 6 }).then(r => r.data.products),
    enabled: search.length > 0
  })

  const selectProduct = (p) => {
    onChange(index, { ...item, productId: p.id, productName: p.name, productCode: p.code, unit: p.unit, unitPriceHtg: Number(p.priceHtg), unitPriceUsd: Number(p.priceUsd) })
    setSearch(''); setOpen(false)
  }

  const update = (field, val) => onChange(index, { ...item, [field]: val })
  const totalHtg = Number(item.unitPriceHtg || 0) * Number(item.quantity || 0) * (1 - Number(item.discountPct || 0) / 100)

  return (
    <div style={{ background:'#F8F9FF', borderRadius:12, border:'1.5px solid rgba(27,42,143,0.12)', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>

      {/* Header kat: Nimewo + Siprime */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em' }}>Atik #{index + 1}</span>
        <button type="button" onClick={() => onRemove(index)}
          style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(192,57,43,0.2)', background:'rgba(192,57,43,0.06)', color:'#C0392B', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Trash2 size={13}/>
        </button>
      </div>

      {/* Rechèch pwodui */}
      <div className="relative">
        {item.productName
          ? <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'white', borderRadius:10, border:'1.5px solid rgba(27,42,143,0.15)' }}>
              <Package size={14} color="#1B2A8F"/>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#0F1A5C', margin:0 }}>{item.productName}</p>
                <p style={{ fontSize:11, color:'#6B7AAB', margin:0, fontFamily:'monospace' }}>{item.productCode}</p>
              </div>
              <button type="button" onClick={() => update('productName', '')} style={{ color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:2 }}>
                <ChevronDown size={14}/>
              </button>
            </div>
          : <div>
              <div className="relative">
                <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="input pl-8 text-sm" placeholder={t('quotes.searchProduct')}
                  value={search} onChange={e => { setSearch(e.target.value); setOpen(true) }}/>
              </div>
              {open && productResults?.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
                  {productResults.map(p => (
                    <button key={p.id} type="button" onClick={() => selectProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.code} · {p.unit}</p>
                      </div>
                      <p className="text-sm font-mono text-brand-700">{Number(p.priceHtg).toLocaleString()} HTG</p>
                    </button>
                  ))}
                </div>
              )}
              <input className="input text-sm mt-1" placeholder={t('quotes.orTypeDescription')}
                value={item.description || ''} onChange={e => update('description', e.target.value)}/>
            </div>
        }
      </div>

      {/* Qte + Pri nan yon ranje */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>{t('quotes.qty')}</label>
          <input type="number" step="0.001" min="0.001" className="input text-center text-sm py-2"
            value={item.quantity} onChange={e => update('quantity', e.target.value)}/>
        </div>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Pri HTG</label>
          <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
            value={item.unitPriceHtg} onChange={e => update('unitPriceHtg', e.target.value)}/>
        </div>
      </div>

      {/* Remiz + Total */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, alignItems:'center' }}>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>Remiz %</label>
          <input type="number" step="0.5" min="0" max="100" className="input text-center text-sm py-2"
            value={item.discountPct || 0} onChange={e => update('discountPct', e.target.value)}/>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:10, fontWeight:800, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 5px' }}>Total</p>
          <p style={{ fontFamily:'monospace', fontWeight:800, color:'#0F1A5C', fontSize:16, margin:0 }}>
            {totalHtg.toLocaleString('fr-HT', { minimumFractionDigits: 2 })} <span style={{ fontSize:11, color:'#6B7AAB' }}>HTG</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Atik — vèsyon DESKTOP (tablo)
const ItemRow = ({ item, index, onChange, onRemove }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const { data: productResults } = useQuery({
    queryKey: ['product-search', search],
    queryFn: () => productAPI.getAll({ search, limit: 6 }).then(r => r.data.products),
    enabled: search.length > 0
  })

  const selectProduct = (p) => {
    onChange(index, { ...item, productId: p.id, productName: p.name, productCode: p.code, unit: p.unit, unitPriceHtg: Number(p.priceHtg), unitPriceUsd: Number(p.priceUsd) })
    setSearch(''); setOpen(false)
  }

  const update = (field, val) => onChange(index, { ...item, [field]: val })
  const totalHtg = Number(item.unitPriceHtg || 0) * Number(item.quantity || 0) * (1 - Number(item.discountPct || 0) / 100)

  return (
    <tr>
      <td className="p-2 min-w-[200px]">
        <div className="relative">
          {item.productName
            ? <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.productName}</p>
                  <p className="text-xs text-slate-400 font-mono">{item.productCode}</p>
                </div>
                <button type="button" onClick={() => update('productName', '')} className="text-slate-300 hover:text-slate-500">
                  <ChevronDown size={14} />
                </button>
              </div>
            : <>
                <div className="relative">
                  <Package size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-8 text-sm py-2" placeholder={t('quotes.searchProduct')}
                    value={search} onChange={e => { setSearch(e.target.value); setOpen(true) }} />
                </div>
                {open && productResults?.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
                    {productResults.map(p => (
                      <button key={p.id} type="button" onClick={() => selectProduct(p)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.code} · {p.unit}</p>
                        </div>
                        <p className="text-sm font-mono text-brand-700">{Number(p.priceHtg).toLocaleString()} HTG</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
          }
        </div>
        {!item.productName && (
          <input className="input text-sm py-1.5 mt-1" placeholder={t('quotes.orTypeDescription')}
            value={item.description || ''} onChange={e => update('description', e.target.value)} />
        )}
      </td>
      <td className="p-2 w-24">
        <input type="number" step="0.001" min="0.001" className="input text-center text-sm py-2"
          value={item.quantity} onChange={e => update('quantity', e.target.value)} />
      </td>
      <td className="p-2 w-32">
        <input type="number" step="0.01" min="0" className="input text-right text-sm py-2 font-mono"
          value={item.unitPriceHtg} onChange={e => update('unitPriceHtg', e.target.value)} />
      </td>
      <td className="p-2 w-20">
        <input type="number" step="0.5" min="0" max="100" className="input text-center text-sm py-2"
          value={item.discountPct || 0} onChange={e => update('discountPct', e.target.value)} />
      </td>
      <td className="p-2 w-36 text-right">
        <span className="font-mono font-semibold text-slate-800">
          {totalHtg.toLocaleString('fr-HT', { minimumFractionDigits: 2 })} HTG
        </span>
      </td>
      <td className="p-2 w-10">
        <button type="button" onClick={() => onRemove(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  )
}

// ── Main QuoteForm
export default function QuoteForm() {
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isEdit    = !!id
  const { tenant } = useAuthStore()
  const isMobile  = useIsMobile()

  const [client, setClient] = useState(null)
  const [items, setItems] = useState([
    { productId: null, productName: '', productCode: '', quantity: 1, unitPriceHtg: 0, unitPriceUsd: 0, discountPct: 0, unit: 'unité' }
  ])
  const [discountType, setDiscountType] = useState('amount')
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate] = useState(Number(tenant?.taxRate || 0))
  const [notes, setNotes] = useState(t('quotes.defaultNotes'))
  const [terms, setTerms] = useState(t('quotes.defaultTerms'))
  const [expiryDate, setExpiryDate] = useState('')
  const [currency, setCurrency] = useState(tenant?.defaultCurrency || 'HTG')

  const { data: existingQuote } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quoteAPI.getOne(id).then(r => r.data.quote),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingQuote) {
      setClient(existingQuote.client || existingQuote.clientSnapshot)
      setItems(existingQuote.items.map(i => ({
        productId: i.productId,
        productName: i.product?.name || i.productSnapshot?.name || '',
        productCode: i.product?.code || i.productSnapshot?.code || '',
        quantity: Number(i.quantity),
        unitPriceHtg: Number(i.unitPriceHtg),
        unitPriceUsd: Number(i.unitPriceUsd),
        discountPct: Number(i.discountPct),
        unit: i.product?.unit || i.productSnapshot?.unit || 'unité'
      })))
      setDiscountType(existingQuote.discountType)
      setDiscountValue(Number(existingQuote.discountValue))
      setTaxRate(Number(existingQuote.taxRate))
      setNotes(existingQuote.notes || '')
      setTerms(existingQuote.terms || '')
      setCurrency(existingQuote.currency)
    }
  }, [existingQuote])

  const subtotal = items.reduce((acc, item) =>
    acc + Number(item.unitPriceHtg || 0) * Number(item.quantity || 0) * (1 - Number(item.discountPct || 0) / 100), 0)

  const discountAmt = discountType === 'percent' ? subtotal * Number(discountValue) / 100 : Number(discountValue)
  const afterDisc = subtotal - discountAmt
  const taxAmt    = afterDisc * Number(taxRate) / 100
  const total     = afterDisc + taxAmt
  const fmt = (n) => Number(n).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

  const updateItem = (index, newItem) => setItems(items.map((it, i) => i === index ? newItem : it))
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))
  const addItem    = () => setItems([...items, { productId: null, productName: '', productCode: '', quantity: 1, unitPriceHtg: 0, unitPriceUsd: 0, discountPct: 0, unit: 'unité' }])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? quoteAPI.update(id, data) : quoteAPI.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? t('quotes.quoteUpdated') : t('quotes.quoteCreated'))
      navigate(`/quotes/${res.data.quote?.id || id}`)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!items.length || !items.some(i => i.quantity > 0)) return toast.error(t('quotes.addAtLeastOneItem'))
    mutation.mutate({
      clientId: client?.id,
      clientSnapshot: client ? { id: client.id, name: client.name, phone: client.phone, email: client.email } : {},
      currency, exchangeRate: tenant?.exchangeRate || 132,
      discountType, discountValue: Number(discountValue),
      taxRate: Number(taxRate), notes, terms,
      expiryDate: expiryDate || null,
      items: items.map(i => ({
        productId: i.productId || null,
        productSnapshot: { name: i.productName || i.description, code: i.productCode, unit: i.unit },
        quantity: Number(i.quantity), unitPriceHtg: Number(i.unitPriceHtg),
        unitPriceUsd: Number(i.unitPriceUsd || 0), discountPct: Number(i.discountPct || 0), sortOrder: 0
      }))
    })
  }

  // Blok totaux (reutilize pou mobil ak desktop)
  const TotauxBlock = () => {
    const rate    = Number(tenant?.exchangeRate || 132)
    const factor  = currency === 'USD' ? (1 / rate) : 1
    const cur     = currency
    const other   = currency === 'HTG' ? 'USD' : 'HTG'
    const otherAmt= currency === 'HTG' ? total / rate : total * rate
    const fmt2    = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits:2, maximumFractionDigits:2 })

    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-brand-600" />
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
            <span className="font-mono font-medium">{fmt2(subtotal * factor)} {cur}</span>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="label">{t('quotes.discount')}</label>
            <div className="flex gap-2 mb-2">
              <select className="input py-1.5 text-sm" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                <option value="amount">{t('quotes.valueAmount')} ({cur})</option>
                <option value="percent">{t('quotes.percentage')} (%)</option>
              </select>
              <input type="number" min="0" step="0.01" className="input py-1.5 text-sm w-24 text-right font-mono"
                value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
            </div>
            {discountAmt * factor > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>{t('quotes.discount')}</span>
                <span className="font-mono">-{fmt2(discountAmt * factor)} {cur}</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="label">{t('quotes.taxVAT')} (%)</label>
            <input type="number" min="0" max="100" step="0.5" className="input py-1.5 text-sm text-right font-mono"
              value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            {taxAmt * factor > 0 && (
              <div className="flex justify-between text-sm text-slate-600 mt-2">
                <span>{t('quotes.taxVAT')} ({taxRate}%)</span>
                <span className="font-mono">{fmt2(taxAmt * factor)} {cur}</span>
              </div>
            )}
          </div>

          <div className="border-t-2 border-brand-200 pt-3 mt-1">
            <div className="flex justify-between items-start">
              <span className="font-display font-bold text-slate-800 text-lg">TOTAL</span>
              <div className="text-right">
                <p className="font-bold text-brand-700 text-xl font-mono">{fmt2(total * factor)} {cur}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">≈ {fmt2(otherAmt)} {other}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>{t('quotes.rate')}:</span>
            <span className="font-mono font-medium">1 USD = {Number(tenant?.exchangeRate || 132).toFixed(2)} HTG</span>
          </div>
        </div>

        {/* Bouton sove sou mobil */}
        {isMobile && (
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full mt-4" style={{ justifyContent:'center' }}>
            <Save size={16}/> {mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('quotes.createQuote')}
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/quotes')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? t('quotes.editQuote') : t('quotes.newQuote')}</h1>
            {isEdit && <p className="text-slate-500 text-sm">{existingQuote?.quoteNumber}</p>}
          </div>
        </div>
        {/* Bouton sove — desktop sèlman */}
        {!isMobile && (
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            <Save size={16}/> {mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('quotes.createQuote')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Infos client */}
          <div className="card p-5">
            <h3 className="section-title">{t('quotes.clientInfo')}</h3>
            {/* ── Mobil: kolòn yon pa youn ── */}
            <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
              <div className={isMobile ? '' : 'col-span-2'}>
                <label className="label">{t('quotes.client')}</label>
                <ClientSearch value={client} onChange={setClient} />
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
                <input type="date" className="input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Atik yo */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">{t('quotes.items')}</h3>
              <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                <Plus size={14} /> {t('quotes.addLine')}
              </button>
            </div>

            {/* ── MOBIL: Kat pou chak atik ── */}
            {isMobile ? (
              <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10 }}>
                {items.map((item, idx) => (
                  <ItemCard key={idx} item={item} index={idx} onChange={updateItem} onRemove={removeItem}/>
                ))}
              </div>
            ) : (
              /* ── DESKTOP: Tablo ── */
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
                      <ItemRow key={idx} item={item} index={idx} onChange={updateItem} onRemove={removeItem}/>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 border-t border-slate-100">
              <button type="button" onClick={addItem}
                className="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-1.5 transition-colors">
                <Plus size={15} /> {t('quotes.addAnotherItem')}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            {/* ── Mobil: yon kolòn ── */}
            <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
              <div>
                <label className="label">{t('quotes.notesForClient')}</label>
                <textarea className="input resize-none" rows={3}
                  placeholder={t('quotes.notesPlaceholder')}
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('quotes.generalTerms')}</label>
                <textarea className="input resize-none" rows={3}
                  placeholder={t('quotes.termsPlaceholder')}
                  value={terms} onChange={e => setTerms(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Totaux — afiche nan kolòn prensipal sou mobil */}
          {isMobile && <TotauxBlock />}
        </div>

        {/* Totaux — kolòn lateral sou desktop sèlman */}
        {!isMobile && (
          <div className="space-y-4">
            <div className="sticky top-4">
              <TotauxBlock />
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
