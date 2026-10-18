// src/pages/invoices/NewInvoicePage.jsx — Plus Fit redesign (stepper + resi an dirèk)
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Trash2, Receipt, User, Search, Save, WifiOff, RefreshCw, UploadCloud, Package,
  Banknote, Smartphone, Wallet, CreditCard, Check, Percent, Calendar,
} from 'lucide-react'
// ✅ Offline mode
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import {
  cacheProducts, searchCachedProducts,
  cacheClients, searchCachedClients,
  queueSale, adjustCachedProductStock,
} from '../../services/offlineDb'
import { syncPendingSales, countPendingSales, onSyncEvent } from '../../services/offlineSync'
import { printInvoiceNative, isNativePrinterAvailable } from '../../services/printerNative'
import { useDraftCartStore } from '../../stores/draftCartStore'
import './invoices.css'

const C = { blue: '#1B2A8F', orange: '#FF6B00', gold: '#C9A84C' }

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const PAY_METHODS = [
  { key: 'cash',    label: 'Espès',   Icon: Banknote,   color: '#059669' },
  { key: 'moncash', label: 'MonCash', Icon: Smartphone, color: '#DC2626' },
  { key: 'natcash', label: 'NatCash', Icon: Wallet,     color: '#FF6B00' },
  { key: 'credit',  label: 'Kredi',   Icon: CreditCard, color: '#1B2A8F' },
]

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ✅ Chif ki konte jiska nouvo valè a
function useCountUp(value, ms = 450) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

// ✅ Si yon nivo pri an gwo aktif epi kantite a se yon MILTIP EGZAK sèy la,
// kalkile total la ak pri total pakè a (evite 3 × 583,33 = 1749,99).
const exactTierGross = (item) => {
  if (!item?._priceMode?.startsWith('tier-') || !item._priceTiers?.length) return null
  const tier = item._priceTiers.find(tr => `tier-${tr.id || tr.minQty}` === item._priceMode)
  const minQty = Number(tier?.minQty || 0)
  if (!tier?.totalPriceHtg || !minQty) return null
  const qty = Number(item.qty) || 0
  if (qty <= 0 || qty % minQty !== 0) return null
  return (qty / minQty) * Number(tier.totalPriceHtg)
}

// ✅ Total liy — rabè se yon montan HTG
const calcLineTotal = (item) => {
  const gross = exactTierGross(item) ?? (Number(item.qty) * Number(item.unitPrice))
  const disc  = Math.min(Number(item.discount || 0), gross)
  return Math.max(0, gross - disc)
}

// ✅ Pi bon nivo pri pou yon kantite
const pickBestTier = (tiers, qty) => {
  if (!tiers || !tiers.length) return null
  const q = Number(qty) || 0
  const eligible = tiers.filter(tr => q >= Number(tr.minQty))
  if (!eligible.length) return null
  return eligible.reduce((best, tr) => Number(tr.minQty) > Number(best.minQty) ? tr : best)
}

const isValidItem = (it) => it.description?.trim() && Number(it.unitPrice) > 0

// ═══════════════════════════════════════════════════════════════
// Liy atik (yon sèl konpozan — CSS la jere mobil/desktop)
// ═══════════════════════════════════════════════════════════════
const ItemRow = memo(function ItemRow({ item, idx, onUpdate, onRemove, t, count, isOnline, canOverridePrice }) {
  const [search, setSearch] = useState(item.description || '')
  const [open, setOpen]     = useState(false)
  const debouncedSearch     = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['products-search', debouncedSearch, isOnline],
    queryFn: async () => {
      if (!isOnline) return await searchCachedProducts(debouncedSearch, 8)
      try {
        const res = await productAPI.getAll({ search: debouncedSearch, limit: 8 })
        const products = res.data.products || []
        cacheProducts(products).catch(() => {})
        return products
      } catch {
        return await searchCachedProducts(debouncedSearch, 8)
      }
    },
    enabled:  debouncedSearch.length >= 2,
    staleTime: 30_000,
    cacheTime: 60_000,
    retry: false,
  })
  const products = data || []

  const lineTotal = useMemo(
    () => calcLineTotal(item),
    [item.unitPrice, item.qty, item.discount, item._priceMode, item._priceTiers]
  )
  const shownTotal = useCountUp(lineTotal, 300)

  const selectProduct = useCallback((p) => {
    // ✅ Anpeche vann yon pwodwi ki gen 0 stòk (sof sèvis)
    const stock = Number(p.quantity ?? p.stock ?? 0)
    if (!p.isService && stock <= 0) {
      toast.error(`⛔ "${p.name}" pa gen stòk (0 ki rete). Kontakte admin pou reapwovizyone l.`, { duration: 4500 })
      return
    }
    setSearch(p.name)
    setOpen(false)
    const tiers = (p.priceTiers || []).slice().sort((a, b) => a.minQty - b.minQty)
    const bestTier = pickBestTier(tiers, 1)
    onUpdate(idx, {
      description: p.name, productId: p.id,
      unitPrice: bestTier ? Number(bestTier.priceHtg) : (p.priceHtg || 0),
      qty: 1, discount: 0,
      _retailPrice: p.priceHtg || 0,
      _priceTiers: tiers,
      _priceMode: bestTier ? `tier-${bestTier.id || bestTier.minQty}` : 'retail',
      _productCode: p.code || null,
      _unit: p.unit || null,
      _imageUrl: p.imageUrl || null,
    })
  }, [idx, onUpdate])

  const onQty = (e) => {
    const qty = Number(e.target.value)
    // ✅ Chanje pri a otomatikman selon kantite a (sof si pri manyèl)
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
  }

  // ✅ Chan pri a lòk pa default lè gen nivo pri; admin ka "deloke" ak MANYÈL
  const priceLocked = !(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual'))
  const ok = isValidItem(item)

  return (
    <div className={`iv-line ${ok ? 'ok' : ''}`}>
      <div className="iv-line-h">
        <span className="t">
          <span className="iv-thumb" style={{ width: 24, height: 24, borderRadius: 7, backgroundImage: item._imageUrl ? `url(${item._imageUrl})` : undefined }}>
            {!item._imageUrl && <Package size={12} color={C.blue}/>}
          </span>
          Atik #{idx + 1}
          {ok && <Check size={13} color="#059669"/>}
        </span>
        {count > 1 && (
          <button type="button" className="iv-del" onClick={() => onRemove(idx)}><Trash2 size={12}/> Retire</button>
        )}
      </div>

      <div className="iv-line-grid">
        <div className="full" style={{ position: 'relative' }}>
          <label className="iv-lbl">{t('invoice.productDesc') || 'Pwodui / Deskripsyon'}</label>
          <div className="iv-icon-inp">
            <Search size={15}/>
            <input
              className="iv-inp"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setOpen(true)
                onUpdate(idx, { description: e.target.value, productId: null })
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              placeholder={t('invoice.searchProduct') || 'Ekri non pwodui a...'}
            />
          </div>
          {open && products.length > 0 && (
            <div className="iv-drop">
              {products.map(p => {
                const stock = Number(p.quantity ?? p.stock ?? 0)
                const outOfStock = !p.isService && stock <= 0
                return (
                  <div key={p.id} className={`iv-opt ${outOfStock ? 'off' : ''}`} onMouseDown={() => selectProduct(p)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span className="iv-thumb" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined }}>
                        {!p.imageUrl && <Package size={15} color={C.blue}/>}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          {outOfStock && <span className="iv-out">STÒK FINI</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {p.code ? `${p.code} · ` : ''}{p.isService ? 'Sèvis' : `Stòk: ${stock}`}
                        </div>
                      </div>
                    </div>
                    <span className="num" style={{ fontSize: 17, fontWeight: 800, color: outOfStock ? 'var(--muted)' : C.blue, flexShrink: 0 }}>{fmt(p.priceHtg)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="iv-lbl">{t('invoice.qty') || 'Qte'}</label>
          <input type="number" min="1" className="iv-inp money center" value={item.qty} onChange={onQty} onFocus={e => e.target.select()}/>
        </div>

        <div>
          <label className="iv-lbl">Pri U. HTG</label>
          <input type="number" min="0" step="0.01" className="iv-inp money" value={item.unitPrice}
            disabled={priceLocked}
            onChange={e => onUpdate(idx, { unitPrice: e.target.value, _priceMode: 'manual' })}
            onFocus={e => e.target.select()}/>
        </div>

        <div>
          <label className="iv-lbl">Rabè HTG</label>
          <input type="number" min="0" step="0.01" className="iv-inp money" value={item.discount} placeholder="0.00"
            onChange={e => onUpdate(idx, { discount: e.target.value })}
            onFocus={e => e.target.select()}/>
        </div>
      </div>

      {/* "Plan" pri an gwo — Detay / 3 / Douzèn ... */}
      {item._priceTiers?.length > 0 && (
        <div className="iv-tiers">
          <button type="button" className={`iv-tierbtn ${item._priceMode === 'retail' ? 'on' : ''}`} style={{ '--tb': C.blue }}
            onClick={() => onUpdate(idx, { qty: 1, unitPrice: item._retailPrice, _priceMode: 'retail' })}>
            DETAY<small>{fmt(item._retailPrice)} HTG</small>
          </button>
          {item._priceTiers.map(tr => {
            const key = `tier-${tr.id || tr.minQty}`
            return (
              <button key={tr.id || tr.minQty} type="button" className={`iv-tierbtn ${item._priceMode === key ? 'on' : ''}`} style={{ '--tb': C.orange }}
                onClick={() => onUpdate(idx, { qty: Number(tr.minQty), unitPrice: Number(tr.priceHtg), _priceMode: key })}>
                {(tr.label || `${tr.minQty}+`).toUpperCase()}
                <small>{tr.totalPriceHtg ? `${fmt(tr.totalPriceHtg)} / ${tr.minQty}` : fmt(tr.priceHtg)} HTG</small>
              </button>
            )
          })}
          {canOverridePrice && (
            <button type="button" className={`iv-tierbtn manual ${item._priceMode === 'manual' ? 'on' : ''}`} style={{ '--tb': C.gold }}
              onClick={() => onUpdate(idx, { _priceMode: 'manual' })}>
              ✏️ MANYÈL<small>Pri espesyal</small>
            </button>
          )}
        </div>
      )}

      <div className="iv-line-total">
        <span>Total liy</span>
        <span className="num">{fmt(shownTotal)} <small style={{ fontSize: 12, opacity: .6 }}>HTG</small></span>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════
export default function NewInvoicePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()
  // ✅ Sèlman admin ka tape yon pri alamen
  const PRICE_OVERRIDE_ROLES = ['admin']
  const canOverridePrice = PRICE_OVERRIDE_ROLES.includes(user?.role)
  const isMobile = useIsMobile()

  // ✅ Offline mode
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncingNow, setSyncingNow] = useState(false)

  // ✅ Peman (fèt AN MENM TAN ak kreyasyon fakti a)
  const [paymentMethod, setPaymentMethod]     = useState('cash')
  const [amountReceived, setAmountReceived]   = useState('')
  const [creditDeposit, setCreditDeposit]     = useState('')
  const [offlineReceipt, setOfflineReceipt]   = useState(null)
  const [printingOffline, setPrintingOffline] = useState(false)
  const [created, setCreated]                 = useState(null)   // ✅ animasyon siksè

  const [clientSearch, setClientSearch]     = useState('')
  const [clientOpen, setClientOpen]         = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const clientRef = useRef(null)

  const secRefs = { client: useRef(null), items: useRef(null), pay: useRef(null), confirm: useRef(null) }

  const today = new Date(new Date().getTime() - 5*60*60*1000).toISOString().split('T')[0]
  const [invoiceDate] = useState(today)

  // ✅ Dat jodi a → moman egzak; dat pase → "minwit Ayiti"
  const buildIssueDateTime = useCallback(() => {
    if (invoiceDate === today) return new Date().toISOString()
    return `${invoiceDate}T05:00:00.000Z`
  }, [invoiceDate, today])
  const [dueDate]                           = useState('')
  const [notes]                             = useState('')
  const [terms]                             = useState('')
  const [taxRate, setTaxRate]               = useState(tenant?.taxRate || 0)
  // ✅ discountGlobal = MONTAN HTG
  const [discountGlobal, setDiscountGlobal] = useState(0)

  // ✅ Panye santral (pataje ak paj Pwodui a)
  const draftItems     = useDraftCartStore(s => s.items)
  const setDraftItems  = useDraftCartStore(s => s.setItems)
  const clearDraftCart = useDraftCartStore(s => s.clear)

  const [items, setItems] = useState(() =>
    draftItems.length
      ? draftItems.map(it => ({
          id: it.id, description: it.description, productId: it.productId,
          qty: it.qty, unitPrice: it.unitPrice, discount: it.discount,
        }))
      : [{ id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }]
  )

  useEffect(() => { setDraftItems(items) }, [items])

  const debouncedClientSearch = useDebounce(clientSearch, 400)

  const { data: clientData } = useQuery({
    queryKey: ['clients-search', debouncedClientSearch, isOnline],
    queryFn: async () => {
      if (!isOnline) return await searchCachedClients(debouncedClientSearch, 8)
      try {
        const res = await clientAPI.getAll({ search: debouncedClientSearch, limit: 8 })
        const clients = res.data.clients || res.data || []
        cacheClients(clients).catch(() => {})
        return clients
      } catch {
        return await searchCachedClients(debouncedClientSearch, 8)
      }
    },
    enabled:  debouncedClientSearch.length >= 1,
    staleTime: 30_000,
    retry: false,
  })
  const clients = clientData || []

  // ✅ Cache TOUT pwodwi/kliyan lè paj la louvri (pou mòd offline)
  const [cacheReady, setCacheReady]       = useState(false)
  const [cachePhase, setCachePhase]       = useState('')
  const [cacheProgress, setCacheProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    if (!isOnline) return
    let cancelled = false
    const PAGE_SIZE = 200
    const MAX_PAGES = 200

    async function cacheAll(phaseLabel, fetchPage, saveFn, extractItems, extractTotal) {
      let page = 1, totalCached = 0, totalCount = null
      setCachePhase(phaseLabel)
      setCacheProgress({ done: 0, total: 0 })
      while (page <= MAX_PAGES) {
        if (cancelled) return
        const res   = await fetchPage(page)
        const list  = extractItems(res)
        if (totalCount === null) totalCount = extractTotal(res, list)
        if (list.length === 0) break
        await saveFn(list)
        totalCached += list.length
        setCacheProgress({ done: totalCached, total: totalCount || totalCached })
        if (list.length < PAGE_SIZE || totalCached >= (totalCount || Infinity)) break
        page++
      }
      return totalCached
    }

    async function run() {
      await cacheAll('pwodwi', (page) => productAPI.getAll({ page, limit: PAGE_SIZE }), cacheProducts,
        (res) => res.data.products || [], (res, list) => res.data.total ?? list.length)
      await cacheAll('kliyan', (page) => clientAPI.getAll({ page, limit: PAGE_SIZE }), cacheClients,
        (res) => res.data.clients || res.data || [], (res, list) => res.data.total ?? list.length)
      if (!cancelled) { setCachePhase(''); setCacheReady(true) }
    }

    run().catch(() => {})
    return () => { cancelled = true }
  }, [isOnline])

  // ✅ Vant an atant + evènman senkwonizasyon
  useEffect(() => {
    countPendingSales().then(setPendingCount)
    const unsub = onSyncEvent((evt) => {
      if (evt.type === 'sync-start') setSyncingNow(true)
      if (evt.type === 'sync-end') {
        setSyncingNow(false)
        countPendingSales().then(setPendingCount)
        if (evt.synced > 0) toast.success(`${evt.synced} vant senkwonize avèk siksè!`)
        if (evt.failed > 0) toast.error(`${evt.failed} vant pa t ka senkwonize. Y ap eseye ankò.`)
      }
    })
    return unsub
  }, [])

  useEffect(() => { if (isOnline) syncPendingSales() }, [isOnline])

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

  // ✅ Kalkil total (rabè = montan HTG)
  const { subtotal, discountAmount, taxAmount, grandTotal } = useMemo(() => {
    const sub     = items.reduce((acc, it) => acc + calcLineTotal(it), 0)
    const discAmt = Math.min(Number(discountGlobal || 0), sub)
    const afterD  = Math.max(0, sub - discAmt)
    const taxAmt  = afterD * (Number(taxRate) / 100)
    return { subtotal: sub, discountAmount: discAmt, taxAmount: taxAmt, grandTotal: afterD + taxAmt }
  }, [items, discountGlobal, taxRate])

  const shownTotal = useCountUp(grandTotal)
  const [bump, setBump] = useState(0)
  useEffect(() => { setBump(b => b + 1) }, [grandTotal])

  const updateItem = useCallback((idx, changes) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it))
  }, [])
  const removeItem = useCallback((idx) => {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
  }, [])
  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: Date.now(), description:'', productId:null, qty:1, unitPrice:0, discount:0 }])
  }, [])

  // ✅ Eta etap yo (pwosesis vizib)
  const validItems   = useMemo(() => items.filter(isValidItem), [items])
  const clientName   = selectedClient?.name || clientSearch.trim()
  const itemsOk      = validItems.length > 0
  const payOk        = itemsOk && !(paymentMethod === 'cash' && amountReceived === '')
  const clientOk     = !!clientName || itemsOk   // opsyonèl → konsidere OK lè atik yo kòmanse
  const STEPS = [
    { key: 'client',  label: 'Kliyan',  done: clientOk },
    { key: 'items',   label: 'Atik',    done: itemsOk },
    { key: 'pay',     label: 'Peman',   done: payOk },
    { key: 'confirm', label: 'Konfime', done: false },
  ]
  const curIdx = Math.max(0, STEPS.findIndex(s => !s.done))
  const goStep = (key) => secRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const mutation = useMutation({
    mutationFn: (payload) => invoiceAPI.createDirect(payload),
    onSuccess: (res) => {
      const inv = res.data.invoice
      toast.success(t('invoice.invoiceCreated') || 'Fakti kreye avèk siksè!')
      clearDraftCart()
      // ✅ Ti animasyon siksè anvan nou ale sou detay la
      setCreated({ number: inv.invoiceNumber, total: inv.totalHtg ?? grandTotal })
      setTimeout(() => navigate(`/app/invoices/${inv.id}`), 1300)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const handleSubmit = useCallback(async () => {
    if (!validItems.length) {
      toast.error(t('invoice.addAtLeastOneItem') || 'Ajoute omwen yon atik.')
      goStep('items')
      return
    }
    // ✅ Espès: kesye a dwe antre kòb li resevwa a
    if (paymentMethod === 'cash' && amountReceived === '') {
      toast.error('Antre kòb ou resevwa a anvan w kreye fakti a.')
      goStep('pay')
      return
    }

    const mappedItems = validItems.map(it => {
      const qty       = Number(it.qty)
      const unitPrice = Number(it.unitPrice)
      const discAmt   = Number(it.discount || 0)
      const gross     = exactTierGross(it) ?? (qty * unitPrice)
      const lineTotal = Math.max(0, gross - Math.min(discAmt, gross))
      const discPct   = gross > 0 ? Math.min(100, (discAmt / gross) * 100) : 0
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
        discountAmt:     Math.min(discAmt, gross),
        totalHtg:        lineTotal,
        totalUsd:        0,
        productSnapshot: { name: it.description, code: it._productCode || null, unit: it._unit || null, tierLabel },
      }
    })

    const sub      = mappedItems.reduce((a, it) => a + it.totalHtg, 0)
    const discAmt  = Math.min(Number(discountGlobal || 0), sub)
    const afterDis = Math.max(0, sub - discAmt)
    const taxAmt   = afterDis * (Number(taxRate) / 100)
    const total    = afterDis + taxAmt

    // ✅ Peman — Kredi ak avans = peman pasyèl kach
    const deposit = Number(creditDeposit || 0)
    const payment = paymentMethod === 'credit'
      ? (deposit > 0 ? { method: 'cash', amountHtg: Math.min(deposit, total), amountUsd: 0, amountGiven: deposit, change: 0 } : null)
      : {
          method:      paymentMethod,
          amountHtg:   paymentMethod === 'cash' ? Math.min(Number(amountReceived || total), total) : total,
          amountUsd:   0,
          amountGiven: paymentMethod === 'cash' ? Number(amountReceived || 0) : total,
          change:      paymentMethod === 'cash' ? Math.max(0, Number(amountReceived || 0) - total) : 0,
        }

    const payload = {
      clientId:      selectedClient?.id || null,
      clientSnapshot: selectedClient
        ? { id: selectedClient.id, name: selectedClient.name, phone: selectedClient.phone }
        : (clientSearch.trim() ? { name: clientSearch.trim() } : {}),
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
      payment,
    }

    // ✅ Offline → sove lokalman (file datant)
    if (!isOnline) {
      try {
        await queueSale(payload)
        for (const item of mappedItems) {
          if (item.productId) await adjustCachedProductStock(item.productId, -item.quantity)
        }
        setPendingCount(c => c + 1)
        const shortId = Date.now().toString().slice(-6)
        setOfflineReceipt({
          invoiceNumber: `OFFLINE-${shortId}`,
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

    mutation.mutate(payload)
  }, [validItems, discountGlobal, taxRate, selectedClient, clientSearch, buildIssueDateTime, dueDate, notes, terms, mutation, isOnline, paymentMethod, amountReceived, creditDeposit, t])

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
    clearDraftCart()
    navigate('/app/invoices')
  }, [navigate])

  // ✅ Bouton kòb rapid (Egzak + awondi)
  const quickCash = useMemo(() => {
    if (grandTotal <= 0) return []
    const set = new Set()
    for (const base of [50, 100, 500, 1000]) {
      const v = Math.ceil(grandTotal / base) * base
      if (v > grandTotal) set.add(v)
    }
    return [...set].sort((a, b) => a - b).slice(0, 3)
  }, [grandTotal])

  const received   = Number(amountReceived || 0)
  const submitOff  = mutation.isPending || (paymentMethod === 'cash' && amountReceived === '')
  const submitText = mutation.isPending ? (t('invoice.saving') || 'Ap sovgade...') : (t('invoice.createInvoice') || 'Kreye Fakti')

  // ════════════════════════════════════════════════════════════
  return (
    <div className="iv" style={{ maxWidth: 1240, paddingBottom: isMobile ? 80 : 24 }}>

      {/* ── Banyè offline / cache / senkwonizasyon ── */}
      {isOnline && !cacheReady && (
        <div className="iv-banner cache">
          <RefreshCw size={13} className="spin"/>
          {cachePhase === 'pwodwi' && `Ap prepare katalòg offline — pwodwi (${cacheProgress.done}/${cacheProgress.total || '?'})`}
          {cachePhase === 'kliyan' && `Ap prepare katalòg offline — kliyan (${cacheProgress.done}/${cacheProgress.total || '?'})`}
          {!cachePhase && 'Ap prepare katalòg offline...'}
        </div>
      )}
      {!isOnline && (
        <div className="iv-banner off">
          <WifiOff size={18} style={{ flexShrink: 0 }}/>
          <div className="grow">
            <div style={{ fontSize: 13, fontWeight: 800 }}>Mòd Offline — Pa gen entènèt kounye a</div>
            <div style={{ fontWeight: 600 }}>Vant yo ap sove lokalman e senkwonize otomatikman lè entènèt tounen.</div>
          </div>
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="iv-banner sync">
          <UploadCloud size={18} color={C.blue} style={{ flexShrink: 0 }}/>
          <div className="grow" style={{ fontSize: 13, fontWeight: 800 }}>{pendingCount} vant an atant pou senkwonize</div>
          <button onClick={handleManualSync} disabled={syncingNow} style={{ opacity: syncingNow ? .6 : 1 }}>
            <RefreshCw size={13} className={syncingNow ? 'spin' : ''}/>
            {syncingNow ? 'Ap senkwonize...' : 'Senkwonize'}
          </button>
        </div>
      )}

      {/* ── Hero + stepper ── */}
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={() => navigate('/app/invoices')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico"><Receipt size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Fakti'}</p>
            <h1>{t('invoice.directInvoiceTitle') || 'Nouvo Fakti'}</h1>
            {!isMobile && <p className="sub">{t('invoice.directInvoiceDesc') || 'Kreye yon fakti san pase pa devi'} — swiv 4 etap yo.</p>}
          </div>
        </div>

        <div className="iv-steps">
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: 'contents' }}>
              <button type="button" onClick={() => goStep(s.key)}
                className={`iv-step ${i === curIdx ? 'cur' : ''} ${s.done ? 'done' : ''}`}>
                <span className="b">{s.done ? <Check size={16} strokeWidth={3}/> : i + 1}</span>
                <span className="lb">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`iv-link ${s.done ? 'full' : ''}`}><i/></div>}
            </div>
          ))}
        </div>
      </section>

      <div className="iv-layout">
        <div className="iv-col">

          {/* ① Kliyan */}
          <section ref={secRefs.client} className={`iv-sec a-up ${curIdx === 0 ? 'focus' : ''}`} style={{ animationDelay: '60ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${clientName ? 'ok' : ''}`}>{clientName ? <Check size={18}/> : 1}</div>
              <div>
                <p className="eb">Etap 1</p>
                <h3>Kliyan</h3>
              </div>
              <div className="r">
                {clientName ? <span className="iv-pill"><Check size={11}/> Chwazi</span> : <span className="iv-pill muted">Opsyonèl</span>}
              </div>
            </div>

            {selectedClient ? (
              <div className="iv-client-card">
                <div className="iv-avatar" style={{ background: C.orange, width: 42, height: 42 }}>
                  {selectedClient.name?.trim()?.[0]?.toUpperCase() || <User size={16}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedClient.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedClient.phone || selectedClient.email || 'Kliyan anrejistre'}</div>
                </div>
                <button type="button" className="iv-del" style={{ background: '#fff' }} onClick={() => { setSelectedClient(null); setClientSearch('') }}>Chanje</button>
              </div>
            ) : (
              <div ref={clientRef} style={{ position: 'relative' }}>
                <label className="iv-lbl">{t('invoice.selectClient') || 'Chèche oswa tape non kliyan an'}</label>
                <div className="iv-icon-inp">
                  <Search size={15}/>
                  <input className="iv-inp"
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setClientOpen(true) }}
                    onFocus={() => setClientOpen(true)}
                    onBlur={() => setTimeout(() => setClientOpen(false), 200)}
                    placeholder={t('invoice.searchClientPlaceholder') || 'Non, telefòn... (kite vid = Vant kontwa)'}
                  />
                  {clientSearch && <button type="button" className="iv-x" onClick={() => setClientSearch('')}>×</button>}
                </div>
                {clientOpen && clients.length > 0 && (
                  <div className="iv-drop">
                    {clients.map(c => (
                      <div key={c.id} className="iv-opt" onMouseDown={() => { setSelectedClient(c); setClientOpen(false); setClientSearch('') }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span className="iv-avatar" style={{ background: C.blue, width: 32, height: 32, fontSize: 12 }}>{c.name?.[0]?.toUpperCase()}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.phone || c.email || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
                {clientSearch.trim() && !clients.length && debouncedClientSearch === clientSearch && (
                  <p className="iv-note">ℹ️ « {clientSearch.trim()} » pa nan lis la — non sa a ap parèt sou fakti a kanmenm.</p>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '200px 200px', gap: 10, marginTop: 14 }}>
              <div>
                <label className="iv-lbl"><Percent size={10} style={{ verticalAlign: '-1px' }}/> {t('settings.taxRate') || 'Taks TVA'} (%)</label>
                <input type="number" min="0" max="100" step="0.5" className="iv-inp money" value={taxRate}
                  onChange={e => setTaxRate(e.target.value)} onFocus={e => e.target.select()}/>
              </div>
              <div>
                <label className="iv-lbl"><Calendar size={10} style={{ verticalAlign: '-1px' }}/> Dat</label>
                <input className="iv-inp" value={new Date().toLocaleDateString('fr-HT', { day: '2-digit', month: 'short', year: 'numeric' })} disabled/>
              </div>
            </div>
          </section>

          {/* ② Atik */}
          <section ref={secRefs.items} className={`iv-sec a-up ${curIdx === 1 ? 'focus' : ''}`} style={{ animationDelay: '120ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${itemsOk ? 'ok' : ''}`}>{itemsOk ? <Check size={18}/> : 2}</div>
              <div>
                <p className="eb">Etap 2</p>
                <h3>{t('quotes.items') || 'Atik yo'}</h3>
              </div>
              <div className="r">
                <span className={`iv-pill ${itemsOk ? '' : 'muted'}`}>{validItems.length} atik</span>
              </div>
            </div>

            {items.map((item, idx) => (
              <ItemRow key={item.id} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem}
                t={t} count={items.length} isOnline={isOnline} canOverridePrice={canOverridePrice}/>
            ))}

            <button type="button" className="iv-add" onClick={addItem}>
              <Plus size={16}/> {t('invoice.addAnotherItem') || 'Ajoute yon lòt atik'}
            </button>
          </section>

          {/* ③ Peman */}
          <section ref={secRefs.pay} className={`iv-sec a-up ${curIdx === 2 ? 'focus' : ''}`} style={{ animationDelay: '180ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${payOk ? 'ok' : ''}`}>{payOk ? <Check size={18}/> : 3}</div>
              <div>
                <p className="eb">Etap 3</p>
                <h3>Peman</h3>
              </div>
            </div>

            <div className="iv-pay">
              {PAY_METHODS.map(({ key, label, Icon, color }) => (
                <button key={key} type="button" onClick={() => setPaymentMethod(key)}
                  className={`iv-paybtn ${paymentMethod === key ? 'on' : ''}`} style={{ '--pc': color }}>
                  {paymentMethod === key && <span className="ck"><Check size={11} strokeWidth={3}/></span>}
                  <span className="pi"><Icon size={19}/></span>
                  {label}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div style={{ marginTop: 14 }} className="a-up">
                <label className="iv-lbl">Kòb resevwa (HTG)</label>
                <input type="number" min="0" step="0.01" className="iv-inp money big" value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)} placeholder={fmt(grandTotal)} onFocus={e => e.target.select()}/>
                {grandTotal > 0 && (
                  <div className="iv-quick">
                    <button type="button" className="ex" onClick={() => setAmountReceived(String(Number(grandTotal.toFixed(2))))}>Egzak · {fmt(grandTotal)}</button>
                    {quickCash.map(v => <button key={v} type="button" onClick={() => setAmountReceived(String(v))}>{v.toLocaleString('fr-HT')}</button>)}
                  </div>
                )}
                {amountReceived !== '' && received > grandTotal && (
                  <div className="iv-change"><span>💵 Monnen pou remèt</span><span className="num">{fmt(received - grandTotal)} HTG</span></div>
                )}
                {amountReceived !== '' && received < grandTotal && grandTotal > 0 && (
                  <div className="iv-change short"><span>⚠️ Depo — rès pou peye</span><span className="num">{fmt(grandTotal - received)} HTG</span></div>
                )}
              </div>
            )}

            {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
              <p className="iv-note a-up">ℹ️ Fakti a ap make <b>Peye</b> pou {fmt(grandTotal)} HTG via {paymentMethod === 'moncash' ? 'MonCash' : 'NatCash'}.</p>
            )}

            {paymentMethod === 'credit' && (
              <div style={{ marginTop: 14 }} className="a-up">
                <label className="iv-lbl">Avans resevwa (opsyonèl)</label>
                <input type="number" min="0" step="0.01" className="iv-inp money big" value={creditDeposit}
                  onChange={e => setCreditDeposit(e.target.value)} placeholder="0.00" onFocus={e => e.target.select()}/>
                <p className="iv-note">
                  {Number(creditDeposit) > 0
                    ? <>ℹ️ Fakti a ap <b>Depo</b> — kliyan an ap dwe <b>{fmt(Math.max(0, grandTotal - Number(creditDeposit)))} HTG</b> apre avans lan.</>
                    : <>ℹ️ Fakti a ap rete <b>Pa peye</b> — kliyan an ap dwe <b>{fmt(grandTotal)} HTG</b>.</>}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ④ Rezime — resi an dirèk */}
        <aside ref={secRefs.confirm} className="iv-aside">
          <div className="iv-receipt">
            <div className="rh">
              <span className="brand">{tenant?.name || 'Fakti'}</span>
              <span className="tag">Aperçu</span>
            </div>
            <div className="meta">
              <div><span>Kliyan</span><b>{clientName || 'Vant kontwa'}</b></div>
              <div style={{ textAlign: 'right' }}><span>Dat</span><b>{new Date().toLocaleDateString('fr-HT')}</b></div>
            </div>

            <div className="iv-rlines">
              {validItems.length ? validItems.map(it => (
                <div key={it.id} className="iv-rline">
                  <div className="d">
                    <b>{it.description}</b>
                    <small>{it.qty} × {fmt(it.unitPrice)}{Number(it.discount) > 0 ? ` − ${fmt(it.discount)}` : ''}</small>
                  </div>
                  <span className="num">{fmt(calcLineTotal(it))}</span>
                </div>
              )) : <div className="iv-rempty">🛒 Atik ou ajoute yo ap parèt la a</div>}
            </div>

            <div style={{ paddingTop: 8 }}>
              <div className="iv-rrow"><span>{t('quotes.subtotal') || 'Sou-total'}</span><span className="num">{fmt(subtotal)}</span></div>
              <div className="iv-rinline">
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Rabè global (HTG)</span>
                <input type="number" min="0" step="0.01" className="iv-inp money" value={discountGlobal}
                  onChange={e => setDiscountGlobal(e.target.value)} placeholder="0.00" onFocus={e => e.target.select()}/>
              </div>
              {discountAmount > 0 && <div className="iv-rrow disc"><span>− Rabè aplike</span><span className="num">− {fmt(discountAmount)}</span></div>}
              {Number(taxRate) > 0 && <div className="iv-rrow"><span>TVA ({taxRate}%)</span><span className="num">+ {fmt(taxAmount)}</span></div>}
            </div>

            <div className="iv-rtotal">
              <span>{t('invoice.totalHtg') || 'Total'}</span>
              <span key={bump} className="num bump">{fmt(shownTotal)}<small>HTG</small></span>
            </div>
          </div>

          <div className="iv-check">
            <div className={itemsOk ? 'ok' : ''}><i>{itemsOk && <Check size={11} strokeWidth={3}/>}</i> Omwen yon atik valab</div>
            <div className={payOk ? 'ok' : ''}><i>{payOk && <Check size={11} strokeWidth={3}/>}</i> Metòd peman pare</div>
            <div className={clientName ? 'ok' : ''}><i>{clientName && <Check size={11} strokeWidth={3}/>}</i> Kliyan {clientName ? '' : '(opsyonèl)'}</div>
          </div>

          {!isMobile && (
            <>
              <button type="button" className={`iv-btn-main ${!submitOff ? 'pulse' : ''}`} style={{ width: '100%', minHeight: 54, fontSize: 15 }}
                onClick={handleSubmit} disabled={submitOff}>
                {mutation.isPending ? <RefreshCw size={17} className="spin"/> : <Save size={17}/>} {submitText}
              </button>
              {paymentMethod === 'cash' && amountReceived === '' && <p className="iv-warnmsg">Antre kòb resevwa a pou w ka kreye fakti a.</p>}
            </>
          )}
        </aside>
      </div>

      {/* ── Ba anba mobil ── */}
      {isMobile && !offlineReceipt && !created && (
        <div className="iv-mbar">
          <div className="l">
            <small>{validItems.length} atik · Total</small>
            <span key={bump} className="num bump" style={{ display: 'inline-block' }}>{fmt(shownTotal)}</span>
          </div>
          <button type="button" className="iv-btn-main" onClick={handleSubmit} disabled={submitOff} style={{ minHeight: 50 }}>
            {mutation.isPending ? <RefreshCw size={16} className="spin"/> : <Save size={16}/>}
            {mutation.isPending ? 'Ap sove...' : (paymentMethod === 'cash' && amountReceived === '' ? 'Antre kòb la' : 'Kreye')}
          </button>
        </div>
      )}

      {/* ── Siksè ── */}
      {created && (
        <div className="iv-overlay">
          <div className="iv-modal">
            <div className="iv-okring">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3>Fakti kreye!</h3>
            <p style={{ color: 'var(--muted)', margin: 0, fontWeight: 700 }}>{created.number}</p>
            <div className="big">{fmt(created.total)} <small style={{ fontSize: 16, color: 'var(--muted)' }}>HTG</small></div>
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Ap louvri fakti a...</p>
          </div>
        </div>
      )}

      {/* ── Resi offline ── */}
      {offlineReceipt && (
        <div className="iv-overlay">
          <div className="iv-modal">
            <div className="iv-okring" style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)', boxShadow: '0 0 0 10px rgba(217,119,6,.12), 0 16px 34px rgba(217,119,6,.35)' }}>
              <WifiOff size={36} color="#fff"/>
            </div>
            <h3>Vant sove offline</h3>
            <p style={{ color: 'var(--muted)', margin: 0, fontWeight: 700 }}>{offlineReceipt.invoiceNumber}</p>
            <div className="big">{fmt(offlineReceipt.totalHtg)} <small style={{ fontSize: 16, color: 'var(--muted)' }}>HTG</small></div>

            {isNativePrinterAvailable() && (
              <button className="iv-btn-ghost" onClick={handlePrintOfflineReceipt} disabled={printingOffline}>
                {printingOffline ? 'Ap enprime...' : '🖨 Enprime Resi'}
              </button>
            )}
            <button className="iv-btn-main" style={{ width: '100%' }} onClick={handleContinueAfterOffline}>Kontinye</button>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '14px 0 0' }}>Vant lan ap senkwonize otomatikman lè entènèt tounen.</p>
          </div>
        </div>
      )}
    </div>
  )
}