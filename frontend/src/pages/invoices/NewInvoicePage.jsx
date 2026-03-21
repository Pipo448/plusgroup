// src/pages/invoices/NewInvoicePage.jsx
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Receipt, User, Search, Save } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  red:'#C0392B',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, outline:'none',
  fontSize:13, color:D.text, background:'#F8F9FF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
}

const label = (txt) => (
  <label style={{ display:'block', color:D.muted, fontSize:11, fontWeight:700,
    marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>
    {txt}
  </label>
)

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

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

// ✅ memo — evite re-render si props pa chanje
const ItemRowDesktop = memo(function ItemRowDesktop({ item, idx, onUpdate, onRemove, t }) {
  const [search, setSearch] = useState(item.description || '')
  const [open, setOpen]     = useState(false)

  // ✅ DEBOUNCE — pa fè API call chak lèt, tann 400ms
  const debouncedSearch = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['products-search', debouncedSearch],
    queryFn:  () => productAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.products || []),
    enabled:  debouncedSearch.length >= 2, // ✅ omwen 2 lèt anvan chèche
    staleTime: 30_000, // ✅ cache 30 sèk — pa re-fetch si menm search
    cacheTime: 60_000,
  })
  const products = data || []

  const lineTotal = useMemo(
    () => (Number(item.unitPrice) * Number(item.qty)) * (1 - Number(item.discount || 0) / 100),
    [item.unitPrice, item.qty, item.discount]
  )

  const selectProduct = useCallback((p) => {
    setSearch(p.name)
    setOpen(false)
    onUpdate(idx, { description: p.name, productId: p.id, unitPrice: p.priceHtg || 0, qty: 1, discount: 0 })
  }, [idx, onUpdate])

  return (
    <div style={{ display:'grid', gridTemplateColumns:'2.5fr 70px 120px 80px 100px 36px', gap:8, alignItems:'start', padding:'12px 0', borderBottom:`1px solid ${D.border}` }}>
      <div style={{ position:'relative' }}>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setOpen(true)
            onUpdate(idx, { description: e.target.value, productId: null })
          }}
          onFocus={() => setOpen(true)}
          // ✅ onBlur + setTimeout — remplace mousedown listener
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t('invoice.searchProduct') || 'Chèche pwodui...'}
          style={{ ...inp, fontSize:12 }}
        />
        {open && products.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:D.white, borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:200, overflowY:'auto', marginTop:4 }}>
            {products.map(p => (
              <div key={p.id}
                onMouseDown={() => selectProduct(p)}
                style={{ padding:'10px 12px', cursor:'pointer', fontSize:13, color:D.text, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${D.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontWeight:600 }}>{p.name}</span>
                <span style={{ fontFamily:'monospace', color:D.blue, fontWeight:700, fontSize:12 }}>{fmt(p.priceHtg)} HTG</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <input type="number" min="1" value={item.qty}
        onChange={e => onUpdate(idx, { qty: Number(e.target.value) })}
        style={{ ...inp, fontSize:12, textAlign:'center' }}
        onFocus={e => e.target.style.borderColor = D.blue}
        onBlur={e => e.target.style.borderColor = D.border}
      />
      <input type="number" min="0" step="0.01" value={item.unitPrice}
        onChange={e => onUpdate(idx, { unitPrice: e.target.value })}
        style={{ ...inp, fontSize:12, fontFamily:'monospace' }}
        onFocus={e => e.target.style.borderColor = D.blue}
        onBlur={e => e.target.style.borderColor = D.border}
      />
      <input type="number" min="0" max="100" value={item.discount}
        onChange={e => onUpdate(idx, { discount: e.target.value })}
        style={{ ...inp, fontSize:12, textAlign:'center' }}
        onFocus={e => e.target.style.borderColor = D.blue}
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
  )
})

// ✅ memo sou mobile row tou
const ItemRowMobile = memo(function ItemRowMobile({ item, idx, onUpdate, onRemove, t, count }) {
  const [search, setSearch] = useState(item.description || '')
  const [open, setOpen]     = useState(false)

  // ✅ DEBOUNCE sou mobile tou
  const debouncedSearch = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['products-search-m', debouncedSearch],
    queryFn:  () => productAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.products || []),
    enabled:  debouncedSearch.length >= 2,
    staleTime: 30_000,
    cacheTime: 60_000,
  })
  const products = data || []

  const lineTotal = useMemo(
    () => (Number(item.unitPrice) * Number(item.qty)) * (1 - Number(item.discount || 0) / 100),
    [item.unitPrice, item.qty, item.discount]
  )

  const selectProduct = useCallback((p) => {
    setSearch(p.name)
    setOpen(false)
    onUpdate(idx, { description: p.name, productId: p.id, unitPrice: p.priceHtg || 0, qty: 1, discount: 0 })
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
            // ✅ onBlur + setTimeout olye mousedown listener
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Ekri non pwodui a..."
            style={{ ...inp, paddingLeft:34, fontSize:14 }}
          />
        </div>
        {open && products.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:D.white, borderRadius:12, border:`1.5px solid ${D.blue}40`, boxShadow:'0 8px 32px rgba(27,42,143,0.15)', maxHeight:220, overflowY:'auto', marginTop:4 }}>
            {products.map(p => (
              <div key={p.id}
                onMouseDown={() => selectProduct(p)}
                style={{ padding:'12px 14px', cursor:'pointer', borderBottom:`1px solid ${D.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:D.text }}>{p.name}</div>
                  {p.code && <div style={{ fontSize:11, color:D.muted }}>{p.code}</div>}
                </div>
                <div style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:13 }}>{fmt(p.priceHtg)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
        <div>
          {label(t('invoice.qty') || 'Qte')}
          <input type="number" min="1" value={item.qty}
            onChange={e => onUpdate(idx, { qty: Number(e.target.value) })}
            style={{ ...inp, textAlign:'center', fontSize:14 }}
            onFocus={e => e.target.style.borderColor = D.blue}
            onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
        <div>
          {label('Pri U. HTG')}
          <input type="number" min="0" step="0.01" value={item.unitPrice}
            onChange={e => onUpdate(idx, { unitPrice: e.target.value })}
            style={{ ...inp, fontFamily:'monospace', fontSize:13 }}
            onFocus={e => e.target.style.borderColor = D.blue}
            onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
        <div>
          {label('Remiz %')}
          <input type="number" min="0" max="100" value={item.discount}
            onChange={e => onUpdate(idx, { discount: e.target.value })}
            style={{ ...inp, textAlign:'center', fontSize:14 }}
            onFocus={e => e.target.style.borderColor = D.blue}
            onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
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
  const { tenant } = useAuthStore()
  const isMobile = useIsMobile()

  const [clientSearch, setClientSearch]     = useState('')
  const [clientOpen, setClientOpen]         = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const clientRef = useRef(null)

  const today = new Date().new Date(new Date().getTime() - 5*60*60*1000).toISOString().split('T')[0]
  const [invoiceDate, setInvoiceDate]       = useState(today)
  const [dueDate, setDueDate]               = useState('')
  const [notes, setNotes]                   = useState('')
  const [terms, setTerms]                   = useState('')
  const [taxRate, setTaxRate]               = useState(tenant?.taxRate || 0)
  const [discountGlobal, setDiscountGlobal] = useState(0)

  const [items, setItems] = useState(() => [
    { id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }
  ])

  // ✅ Debounce sou client search tou
  const debouncedClientSearch = useDebounce(clientSearch, 400)

  const { data: clientData } = useQuery({
    queryKey: ['clients-search', debouncedClientSearch],
    queryFn:  () => clientAPI.getAll({ search: debouncedClientSearch, limit: 8 }).then(r => r.data.clients || r.data),
    enabled:  debouncedClientSearch.length >= 1,
    staleTime: 30_000,
  })
  const clients = clientData || []

  useEffect(() => {
    const h = (e) => { if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ✅ useMemo — pa recalcule chak keystroke
  const { subtotal, discountAmount, afterDiscount, taxAmount, grandTotal } = useMemo(() => {
    const sub     = items.reduce((acc, it) => acc + (Number(it.unitPrice) * Number(it.qty)) * (1 - Number(it.discount || 0) / 100), 0)
    const discAmt = sub * (Number(discountGlobal) / 100)
    const afterD  = sub - discAmt
    const taxAmt  = afterD * (Number(taxRate) / 100)
    return { subtotal: sub, discountAmount: discAmt, afterDiscount: afterD, taxAmount: taxAmt, grandTotal: afterD + taxAmt }
  }, [items, discountGlobal, taxRate])

  // ✅ useCallback — evite rekrye fonksyon chak render
  const updateItem = useCallback((idx, changes) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it))
  }, [])

  const removeItem = useCallback((idx) => {
    setItems(prev => { if (prev.length === 1) return prev; return prev.filter((_, i) => i !== idx) })
  }, [])

  // ✅ id inik pou key — evite React remont mal
  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }])
  }, [])

  const mutation = useMutation({
    mutationFn: (payload) => invoiceAPI.createDirect(payload),
    onSuccess: (res) => {
      const inv = res.data.invoice
      toast.success(t('invoice.invoiceCreated') || 'Fakti kreye avèk siksè!')
      navigate(`/app/invoices/${inv.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const handleSubmit = useCallback(() => {
    const validItems = items.filter(it => it.description?.trim() && Number(it.unitPrice) > 0)
    if (!validItems.length) {
      toast.error(t('invoice.addAtLeastOneItem') || 'Ajoute omwen yon atik.')
      return
    }
    const mappedItems = validItems.map(it => {
      const qty       = Number(it.qty)
      const unitPrice = Number(it.unitPrice)
      const discPct   = Number(it.discount || 0)
      const lineTotal = qty * unitPrice * (1 - discPct / 100)
      return {
        description:     it.description,
        productId:       it.productId || null,
        quantity:        qty,
        unitPriceHtg:    unitPrice,
        unitPriceUsd:    0,
        discountPct:     discPct,
        totalHtg:        lineTotal,
        totalUsd:        0,
        productSnapshot: {},
      }
    })
    const sub      = mappedItems.reduce((a, it) => a + it.totalHtg, 0)
    const discAmt  = sub * (Number(discountGlobal) / 100)
    const afterDis = sub - discAmt
    const taxAmt   = afterDis * (Number(taxRate) / 100)
    const total    = afterDis + taxAmt

    mutation.mutate({
      clientId:      selectedClient?.id || null,
      issueDate:     invoiceDate,
      dueDate:       dueDate || null,
      currency:      'HTG',
      exchangeRate:  0,
      subtotalHtg:   sub,
      subtotalUsd:   0,
      discountType:  'percent',
      discountValue: Number(discountGlobal),
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
    })
  }, [items, discountGlobal, taxRate, selectedClient, invoiceDate, dueDate, notes, terms, mutation])

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth: isMobile ? '100%' : 860, padding: isMobile ? '0 0 80px' : 0 }}>

      <div style={{ display:'flex', alignItems:'center', gap:isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 28 }}>
        <button onClick={() => navigate('/app/invoices')}
          style={{ width:40, height:40, borderRadius:11, background:D.blueDim2, border:`1px solid ${D.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, flexShrink:0 }}>
          <ArrowLeft size={17}/>
        </button>
        <div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius:14, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Receipt size={isMobile ? 18 : 22} color="#fff"/>
        </div>
        <div style={{ minWidth:0 }}>
          <h1 style={{ color:D.text, fontSize: isMobile ? 17 : 22, fontWeight:900, margin:0 }}>
            {t('invoice.directInvoiceTitle') || 'Nouvo Fakti Direk'}
          </h1>
          <p style={{ color:D.muted, fontSize: isMobile ? 11 : 13, margin:'2px 0 0' }}>
            {t('invoice.directInvoiceDesc') || 'Kreye yon fakti san pase pa devi'}
          </p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Kliyan + Dat */}
        <div style={{ background:D.white, borderRadius:16, padding: isMobile ? 16 : 22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <User size={15} color={D.blue}/>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:0 }}>
              {t('invoice.selectClient') || 'Chwazi Kliyan (opsyonèl)'}
            </h3>
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

            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap:10 }}>
              <div>
                {label(t('invoice.invoiceDate') || 'Dat Fakti')}
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
              </div>
              <div>
                {label(t('invoice.dueDate') || 'Dat Limit')}
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
              </div>
              <div style={ isMobile ? { gridColumn:'1 / -1' } : {}}>
                {label(`${t('settings.taxRate') || 'Taks TVA'} (%)`)}
                <input type="number" min="0" max="100" step="0.5" value={taxRate}
                  onChange={e => setTaxRate(e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
              </div>
            </div>
          </div>
        </div>

        {/* Atik yo */}
        <div style={{ background:D.white, borderRadius:16, padding: isMobile ? 16 : 22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
          <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 14px' }}>
            {t('quotes.items') || 'Atik yo'}
          </h3>

          {isMobile ? (
            items.map((item, idx) => (
              // ✅ key={item.id} olye key={idx} — pi stab
              <ItemRowMobile key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t} count={items.length}/>
            ))
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'2.5fr 70px 120px 80px 100px 36px', gap:8, padding:'8px 0', borderBottom:`2px solid ${D.border}` }}>
                {[t('invoice.productDesc')||'Pwodui', t('invoice.qty')||'Qte', 'Pri U. (HTG)', 'Remiz %', 'Total', ''].map((h, i) => (
                  <span key={i} style={{ fontSize:10, fontWeight:800, color:D.blue, textTransform:'uppercase', letterSpacing:'0.05em', textAlign: i >= 1 ? 'center' : 'left' }}>{h}</span>
                ))}
              </div>
              {items.map((item, idx) => (
                // ✅ key={item.id}
                <ItemRowDesktop key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t}/>
              ))}
            </>
          )}

          <button type="button" onClick={addItem}
            style={{ display:'flex', alignItems:'center', gap:7, marginTop:12, padding:'10px 18px', borderRadius:10, background:D.blueDim, border:`1px dashed ${D.blue}`, color:D.blue, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <Plus size={14}/> {t('invoice.addAnotherItem') || 'Ajoute yon lòt atik'}
          </button>
        </div>

        {/* Rezime + Nòt */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>

          <div style={{ background:D.white, borderRadius:16, padding: isMobile ? 16 : 22, border:`1px solid ${D.border}`, boxShadow:D.shadow, display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              {label(t('invoice.notesForClient') || 'Nòt pou kliyan')}
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder={t('invoice.notesPlaceholder') || 'Remèsiman, kondisyon...'}
                style={{ ...inp, resize:'vertical', lineHeight:1.5 }}
                onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
            </div>
            <div>
              {label(t('invoice.generalTerms') || 'Kondisyon jeneral')}
              <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                placeholder={t('invoice.termsPlaceholder') || 'Kondisyon pèman...'}
                style={{ ...inp, resize:'vertical', lineHeight:1.5 }}
                onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
            </div>
          </div>

          <div style={{ background:D.white, borderRadius:16, padding: isMobile ? 16 : 22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>
              {t('quotes.summary') || 'Rezime'}
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:D.muted }}>
                <span>{t('quotes.subtotal') || 'Sou-total'}</span>
                <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{fmt(subtotal)} HTG</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:D.muted }}>
                <span>{t('quotes.discount') || 'Remiz'} (%)</span>
                <input type="number" min="0" max="100" value={discountGlobal}
                  onChange={e => setDiscountGlobal(e.target.value)}
                  style={{ ...inp, width:80, textAlign:'center', fontSize:12, padding:'6px 10px' }}
                  onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
              </div>
              {discountAmount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:D.red }}>
                  <span>- {t('quotes.discount') || 'Remiz'}</span>
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

            <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
              style={{ width:'100%', marginTop:22, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 0', borderRadius:12, background: mutation.isPending ? '#ccc' : `linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', border:'none', fontWeight:800, fontSize:14, cursor: mutation.isPending ? 'not-allowed' : 'pointer', fontFamily:'DM Sans,sans-serif' }}>
              <Save size={16}/>
              {mutation.isPending ? (t('invoice.saving') || 'Ap sovgade...') : (t('invoice.createInvoice') || 'Kreye Fakti')}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}