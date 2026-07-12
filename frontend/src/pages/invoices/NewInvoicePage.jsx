// src/pages/invoices/NewInvoicePage.jsx
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Receipt, User, Search, Save, WifiOff, RefreshCw, UploadCloud } from 'lucide-react'
// ✅ NOUVO — Offline mode
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import {
  cacheProducts, searchCachedProducts,
  cacheClients, searchCachedClients,
  queueSale, adjustCachedProductStock,
} from '../../services/offlineDb'
import { syncPendingSales, countPendingSales, onSyncEvent } from '../../services/offlineSync'
import { printInvoiceNative, isNativePrinterAvailable } from '../../services/printerNative'

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

// ✅ Helper — kalkile line total ak rabè kòm montan HTG (pa pousantaj)
const calcLineTotal = (qty, unitPrice, discountAmt) => {
  const gross = Number(qty) * Number(unitPrice)
  const disc  = Math.min(Number(discountAmt || 0), gross) // pa kite total vin negatif
  return Math.max(0, gross - disc)
}

// ✅ memo — evite re-render si props pa chanje
const ItemRowDesktop = memo(function ItemRowDesktop({ item, idx, onUpdate, onRemove, t, isOnline }) {
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
    () => calcLineTotal(item.qty, item.unitPrice, item.discount),
    [item.unitPrice, item.qty, item.discount]
  )

  const selectProduct = useCallback((p) => {
    setSearch(p.name)
    setOpen(false)
    onUpdate(idx, { description: p.name, productId: p.id, unitPrice: p.priceHtg || 0, qty: 1, discount: 0 })
  }, [idx, onUpdate])

  return (
    <div style={{ display:'grid', gridTemplateColumns:'2.2fr 60px 110px 110px 110px 36px', gap:8, alignItems:'start', padding:'12px 0', borderBottom:`1px solid ${D.border}` }}>
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
      {/* ✅ KORIJE — Rabè HTG (montan), pa pousantaj */}
      <input type="number" min="0" step="0.01" value={item.discount}
        onChange={e => onUpdate(idx, { discount: e.target.value })}
        placeholder="0.00"
        style={{ ...inp, fontSize:12, fontFamily:'monospace', textAlign:'right' }}
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
const ItemRowMobile = memo(function ItemRowMobile({ item, idx, onUpdate, onRemove, t, count, isOnline }) {
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
    () => calcLineTotal(item.qty, item.unitPrice, item.discount),
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
          {/* ✅ KORIJE — Rabè HTG */}
          {label('Rabè HTG')}
          <input type="number" min="0" step="0.01" value={item.discount}
            onChange={e => onUpdate(idx, { discount: e.target.value })}
            placeholder="0.00"
            style={{ ...inp, textAlign:'right', fontSize:13, fontFamily:'monospace' }}
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
  const { tenant, user } = useAuthStore()
  const isMobile = useIsMobile()

  // ✅ NOUVO — Offline mode
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncingNow, setSyncingNow] = useState(false)

  // ✅ NOUVO — Peman (fèt AN MENM TAN ak kreyasyon fakti a — mache online ak offline)
  const [paymentMethod, setPaymentMethod]     = useState('cash')  // cash | moncash | natcash | credit
  const [amountReceived, setAmountReceived]   = useState('')
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

  const [items, setItems] = useState(() => [
    { id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }
  ])

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
    const sub     = items.reduce((acc, it) => acc + calcLineTotal(it.qty, it.unitPrice, it.discount), 0)
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

    // ✅ KORIJE — pou chak liy, konvèti montan rabè a an pousantaj
    // (paske schema InvoiceItem nan backend la sèlman gen `discountPct`)
    const mappedItems = validItems.map(it => {
      const qty       = Number(it.qty)
      const unitPrice = Number(it.unitPrice)
      const discAmt   = Number(it.discount || 0)
      const gross     = qty * unitPrice
      const lineTotal = Math.max(0, gross - Math.min(discAmt, gross))
      // Konvèti montan rabè → pousantaj pou backend
      const discPct   = gross > 0 ? Math.min(100, (discAmt / gross) * 100) : 0

      return {
        description:     it.description,
        productId:       it.productId || null,
        quantity:        qty,
        unitPriceHtg:    unitPrice,
        unitPriceUsd:    0,
        discountPct:     Number(discPct.toFixed(4)),
        totalHtg:        lineTotal,
        totalUsd:        0,
        productSnapshot: {},
      }
    })

    const sub      = mappedItems.reduce((a, it) => a + it.totalHtg, 0)
    // ✅ KORIJE — rabè global se yon MONTAN dirèk
    const discAmt  = Math.min(Number(discountGlobal || 0), sub)
    const afterDis = Math.max(0, sub - discAmt)
    const taxAmt   = afterDis * (Number(taxRate) / 100)
    const total    = afterDis + taxAmt

    // ✅ NOUVO — Konstwi peman an (si pa Kredi) — mache online ak offline
    const payment = paymentMethod === 'credit' ? null : {
      method:      paymentMethod,
      amountHtg:   paymentMethod === 'cash' ? Math.min(Number(amountReceived || total), total) : total,
      amountUsd:   0,
      amountGiven: paymentMethod === 'cash' ? Number(amountReceived || 0) : total,
      change:      paymentMethod === 'cash' ? Math.max(0, Number(amountReceived || 0) - total) : 0,
    }

    const payload = {
      clientId:      selectedClient?.id || null,
      clientSnapshot: selectedClient ? { id: selectedClient.id, name: selectedClient.name, phone: selectedClient.phone } : {},
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
  }, [items, discountGlobal, taxRate, selectedClient, invoiceDate, dueDate, notes, terms, mutation, isOnline, navigate, paymentMethod, amountReceived])

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
              <ItemRowMobile key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t} count={items.length} isOnline={isOnline}/>
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
                <ItemRowDesktop key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t} isOnline={isOnline}/>
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
              {/* ✅ KORIJE — Rabè HTG (montan dirèk) */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:D.muted }}>
                <span>Rabè (HTG)</span>
                <input type="number" min="0" step="0.01" value={discountGlobal}
                  onChange={e => setDiscountGlobal(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inp, width:120, textAlign:'right', fontSize:12, padding:'6px 10px', fontFamily:'monospace' }}
                  onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}/>
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
                    style={{ ...inp, textAlign:'right', fontFamily:'monospace', fontSize:15 }}/>
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
                <p style={{ fontSize:11, color:D.muted, margin:'8px 0 0', fontStyle:'italic' }}>
                  ℹ️ Fakti a ap rete "Pa peye" — kliyan an ap dwe {fmt(grandTotal)} HTG.
                </p>
              )}
            </div>

            <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
              style={{ width:'100%', marginTop:22, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 0', borderRadius:12, background: mutation.isPending ? '#ccc' : `linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', border:'none', fontWeight:800, fontSize:14, cursor: mutation.isPending ? 'not-allowed' : 'pointer', fontFamily:'DM Sans,sans-serif' }}>
              <Save size={16}/>
              {mutation.isPending ? (t('invoice.saving') || 'Ap sovgade...') : (t('invoice.createInvoice') || 'Kreye Fakti')}
            </button>
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