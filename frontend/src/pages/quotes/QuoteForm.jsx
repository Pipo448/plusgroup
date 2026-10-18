// src/pages/quotes/QuoteForm.jsx — Plus Fit redesign (etap vizib + pwofòma an dirèk)
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quoteAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Search, ArrowLeft, Save, Package, User, FileText, Check, X,
  Calendar, Percent, RefreshCw, StickyNote,
} from 'lucide-react'
import { useDraftCartStore } from '../../stores/draftCartStore'
import '../invoices/invoices.css'

const fmt2 = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ✅ Tradiksyon ak repli (pa janm montre kle i18n la)
const tr = (t, key, fallback) => {
  const v = t(key)
  return v && v !== key ? v : fallback
}

// ✅ Pri an gwo: pi bon nivo pou yon kantite
const pickBestTier = (tiers, qty) => {
  if (!tiers || !tiers.length) return null
  const q = Number(qty) || 0
  const eligible = tiers.filter(tr => q >= Number(tr.minQty))
  if (!eligible.length) return null
  return eligible.reduce((best, tr) => Number(tr.minQty) > Number(best.minQty) ? tr : best)
}

// ✅ Kantite = miltip egzak sèy nivo a → itilize pri total pakè a (evite 1749,99)
const exactTierGross = (item) => {
  if (!item?._priceMode?.startsWith('tier-') || !item._priceTiers?.length) return null
  const tier = item._priceTiers.find(tr => `tier-${tr.id || tr.minQty}` === item._priceMode)
  const minQty = Number(tier?.minQty || 0)
  if (!tier?.totalPriceHtg || !minQty) return null
  const qty = Number(item.quantity) || 0
  if (qty <= 0 || qty % minQty !== 0) return null
  return (qty / minQty) * Number(tier.totalPriceHtg)
}

const lineGross = (i) => exactTierGross(i) ?? (Number(i.unitPriceHtg || 0) * Number(i.quantity || 0))
const lineTotal = (i) => Math.max(0, lineGross(i) - Number(i.discountAmt || 0))
const lineName  = (i) => (i.productName || i.description || '').trim()
const isValidLine = (i) => !!lineName(i) && Number(i.quantity) > 0

const emptyLine = () => ({ _id: Date.now() + Math.random(), productId: null, productName: '', productCode: '', description: '', quantity: 1, unitPriceHtg: 0, unitPriceUsd: 0, discountAmt: 0, unit: 'unité' })

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

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

// ═══════════════════════════════════════════════════════════════
// Kliyan — rechèch (vrè kliyan) oswa non tape alamen (san id)
// ═══════════════════════════════════════════════════════════════
const ClientSearch = memo(function ClientSearch({ value, onChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const debouncedSearch = useDebounce(value?.id ? '' : (value?.name || ''), 400)

  const { data } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn:  () => clientAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.clients || []),
    enabled:  debouncedSearch.length >= 1,
    staleTime: 30_000,
  })

  if (value?.id) {
    return (
      <div className="iv-client-card">
        <div className="iv-avatar" style={{ background: '#FF6B00', width: 42, height: 42 }}>{value.name?.trim()?.[0]?.toUpperCase() || <User size={16}/>}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{value.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{value.phone || value.email || 'Kliyan anrejistre'}</div>
        </div>
        <button type="button" className="iv-del" style={{ background: '#fff' }} onClick={() => onChange(null)}>Chanje</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <label className="iv-lbl">{tr(t, 'quotes.client', 'Chèche oswa tape non kliyan an')}</label>
      <div className="iv-icon-inp">
        <Search size={15}/>
        <input className="iv-inp"
          placeholder={tr(t, 'quotes.searchClient', 'Non, telefòn...')}
          value={value?.name || ''}
          onChange={e => { onChange(e.target.value ? { name: e.target.value } : null); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}/>
        {value?.name && <button type="button" className="iv-x" onClick={() => onChange(null)}>×</button>}
      </div>
      {open && data?.length > 0 && (
        <div className="iv-drop">
          {data.map(c => (
            <div key={c.id} className="iv-opt" onMouseDown={() => { onChange(c); setOpen(false) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="iv-avatar" style={{ background: '#1B2A8F', width: 32, height: 32, fontSize: 12 }}>{c.name?.[0]?.toUpperCase()}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.phone || ''}</span>
            </div>
          ))}
        </div>
      )}
      {value?.name && !value?.id && debouncedSearch === value.name && !data?.length && (
        <p className="iv-note">ℹ️ « {value.name} » pa nan lis kliyan yo — non sa a ap parèt sou devi a kanmenm.</p>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════
// Liy atik (yon sèl konpozan — CSS la jere mobil/desktop)
// ═══════════════════════════════════════════════════════════════
const QItem = memo(function QItem({ item, index, count, onChange, onRemove, canOverridePrice }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(-1)
  const debouncedSearch     = useDebounce(search, 400)

  const { data: results } = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn:  () => productAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.products || []),
    enabled:  debouncedSearch.length >= 2,
    staleTime: 30_000,
  })

  const total = useMemo(() => lineTotal(item), [item])
  const shown = useCountUp(total, 300)

  const update = (field, val) => {
    if (field === 'unitPriceHtg') return onChange(index, { ...item, unitPriceHtg: val, _priceMode: 'manual' })
    if (field === 'quantity') {
      const next = { ...item, quantity: val }
      // ✅ Chanje pri a otomatikman selon kantite a (sof pri manyèl)
      if (item._priceTiers?.length && item._priceMode !== 'manual') {
        const best = pickBestTier(item._priceTiers, val)
        if (best) {
          next.unitPriceHtg = Number(best.priceHtg)
          next.unitPriceUsd = best.priceUsd != null ? Number(best.priceUsd) : 0
          next._priceMode   = `tier-${best.id || best.minQty}`
        } else {
          next.unitPriceHtg = item._retailPriceHtg
          next.unitPriceUsd = item._retailPriceUsd
          next._priceMode   = 'retail'
        }
      }
      return onChange(index, next)
    }
    onChange(index, { ...item, [field]: val })
  }

  // ✅ Switch Detay / nivo (pou tout moun) — pa ka envante yon pri
  const forcePriceMode = (tier) => {
    if (tier) {
      onChange(index, { ...item, quantity: Number(tier.minQty), unitPriceHtg: Number(tier.priceHtg),
        unitPriceUsd: tier.priceUsd != null ? Number(tier.priceUsd) : 0, _priceMode: `tier-${tier.id || tier.minQty}` })
    } else {
      onChange(index, { ...item, quantity: 1, unitPriceHtg: item._retailPriceHtg, unitPriceUsd: item._retailPriceUsd, _priceMode: 'retail' })
    }
  }

  const selectProduct = (p) => {
    const qty   = Number(item.quantity) || 1
    const tiers = (p.priceTiers || []).slice().sort((a, b) => a.minQty - b.minQty)
    const best  = pickBestTier(tiers, qty)
    onChange(index, {
      ...item,
      productId: p.id, productName: p.name, productCode: p.code, unit: p.unit, description: '',
      _imageUrl: p.imageUrl || null,
      unitPriceHtg: best ? Number(best.priceHtg) : Number(p.priceHtg),
      unitPriceUsd: best ? (best.priceUsd != null ? Number(best.priceUsd) : 0) : Number(p.priceUsd || 0),
      _retailPriceHtg: Number(p.priceHtg),
      _retailPriceUsd: Number(p.priceUsd || 0),
      _priceTiers: tiers,
      _priceMode: best ? `tier-${best.id || best.minQty}` : 'retail',
    })
    setSearch(''); setOpen(false); setActive(-1)
  }

  const onKey = (e) => {
    if (!results?.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); selectProduct(results[active]) }
    if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  const priceLocked = !(canOverridePrice && (!item._priceTiers?.length || item._priceMode === 'manual'))
  const ok = isValidLine(item)

  return (
    <div className={`iv-line ${ok ? 'ok' : ''}`}>
      <div className="iv-line-h">
        <span className="t">Atik #{index + 1} {ok && <Check size={13} color="#059669"/>}</span>
        {count > 1 && <button type="button" className="iv-del" onClick={() => onRemove(index)}><Trash2 size={12}/> Retire</button>}
      </div>

      <div className="iv-line-grid">
        <div className="full" style={{ position: 'relative' }}>
          <label className="iv-lbl">{tr(t, 'quotes.productDescription', 'Pwodui / Deskripsyon')}</label>
          {item.productName ? (
            <div className="iv-client-card" style={{ padding: '8px 10px', borderColor: 'var(--line2)', background: '#fff', animation: 'none' }}>
              <span className="iv-thumb" style={{ backgroundImage: item._imageUrl ? `url(${item._imageUrl})` : undefined }}>
                {!item._imageUrl && <Package size={15} color="#1B2A8F"/>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</div>
                {item.productCode && <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{item.productCode}</div>}
              </div>
              <button type="button" className="iv-x" style={{ position: 'static', transform: 'none' }} title="Chanje pwodwi"
                onClick={() => onChange(index, { ...item, productName: '', productId: null, productCode: '', _priceTiers: null, _priceMode: null })}>
                <X size={14}/>
              </button>
            </div>
          ) : (
            <>
              <div className="iv-icon-inp">
                <Search size={15}/>
                <input className="iv-inp"
                  placeholder={tr(t, 'quotes.searchProduct', 'Chèche yon pwodwi...')}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setOpen(true); setActive(-1) }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 200)}
                  onKeyDown={onKey}/>
              </div>
              {open && results?.length > 0 && (
                <div className="iv-drop">
                  {results.map((p, i) => (
                    <div key={p.id} className="iv-opt" style={i === active ? { background: '#F4F6FE' } : undefined} onMouseDown={() => selectProduct(p)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span className="iv-thumb" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined }}>
                          {!p.imageUrl && <Package size={15} color="#1B2A8F"/>}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{[p.code, p.unit].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                      <span className="num" style={{ fontSize: 17, fontWeight: 800, color: '#1B2A8F', flexShrink: 0 }}>{fmt2(p.priceHtg)}</span>
                    </div>
                  ))}
                </div>
              )}
              <input className="iv-inp" style={{ marginTop: 8 }}
                placeholder={tr(t, 'quotes.orTypeDescription', '… oswa tape yon deskripsyon (sèvis, travay...)')}
                value={item.description || ''} onChange={e => update('description', e.target.value)}/>
            </>
          )}
        </div>

        <div>
          <label className="iv-lbl">{tr(t, 'quotes.qty', 'Qte')}</label>
          <input type="number" step="0.001" min="0.001" className="iv-inp money center"
            value={item.quantity} onFocus={e => e.target.select()} onChange={e => update('quantity', e.target.value)}/>
        </div>
        <div>
          <label className="iv-lbl">Pri U. HTG</label>
          <input type="number" step="0.01" min="0" className="iv-inp money" value={item.unitPriceHtg} disabled={priceLocked}
            onFocus={e => e.target.select()} onChange={e => update('unitPriceHtg', e.target.value)}/>
        </div>
        <div>
          <label className="iv-lbl">Rabè HTG</label>
          <input type="number" step="0.01" min="0" className="iv-inp money" value={item.discountAmt || 0}
            onFocus={e => e.target.select()} onChange={e => update('discountAmt', e.target.value)}/>
        </div>
      </div>

      {item._priceTiers?.length > 0 && (
        <div className="iv-tiers">
          <button type="button" className={`iv-tierbtn ${item._priceMode === 'retail' ? 'on' : ''}`} style={{ '--tb': '#1B2A8F' }} onClick={() => forcePriceMode(null)}>
            DETAY<small>{fmt2(item._retailPriceHtg)} HTG</small>
          </button>
          {item._priceTiers.map(tr2 => {
            const key = `tier-${tr2.id || tr2.minQty}`
            return (
              <button key={tr2.id || tr2.minQty} type="button" className={`iv-tierbtn ${item._priceMode === key ? 'on' : ''}`} style={{ '--tb': '#FF6B00' }} onClick={() => forcePriceMode(tr2)}>
                {(tr2.label || `${tr2.minQty}+`).toUpperCase()}
                <small>{tr2.totalPriceHtg ? `${fmt2(tr2.totalPriceHtg)} / ${tr2.minQty}` : fmt2(tr2.priceHtg)} HTG</small>
              </button>
            )
          })}
          {canOverridePrice && (
            <button type="button" className={`iv-tierbtn manual ${item._priceMode === 'manual' ? 'on' : ''}`} style={{ '--tb': '#C9A84C' }}
              onClick={() => onChange(index, { ...item, _priceMode: 'manual' })}>
              ✏️ MANYÈL<small>Pri espesyal</small>
            </button>
          )}
        </div>
      )}

      <div className="iv-line-total">
        <span>Total liy</span>
        <span className="num">{fmt2(shown)} <small style={{ fontSize: 12, opacity: .6 }}>HTG</small></span>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════
export default function QuoteForm() {
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const { id }    = useParams()
  const isEdit    = !!id
  const { tenant, user } = useAuthStore()
  const PRICE_OVERRIDE_ROLES = ['admin']
  const canOverridePrice = PRICE_OVERRIDE_ROLES.includes(user?.role)
  const isMobile  = useIsMobile()

  // ✅ KORIJE — to a soti nan tenant.exchangeRates.USD (sa ki afiche anlè paj la),
  // anvan sa li te li tenant.exchangeRate ki pa egziste → toujou 132.
  const rate = Number(tenant?.exchangeRates?.USD || tenant?.exchangeRate || 132)

  const draftItems     = useDraftCartStore(s => s.items)
  const setDraftItems  = useDraftCartStore(s => s.setItems)
  const clearDraftCart = useDraftCartStore(s => s.clear)

  const [client, setClient]               = useState(null)
  const [discountValue, setDiscountValue] = useState(0)
  const [taxRate, setTaxRate]             = useState(Number(tenant?.taxRate || 0))
  const [notes, setNotes]                 = useState('')
  const [terms, setTerms]                 = useState('')
  const [expiryDate, setExpiryDate]       = useState('')
  const [currency, setCurrency]           = useState(tenant?.defaultCurrency || 'USD')
  const [showNotes, setShowNotes]         = useState(false)

  const secRefs = { client: useRef(null), items: useRef(null), terms: useRef(null), save: useRef(null) }

  const [items, setItems] = useState(() => {
    if (!isEdit && draftItems.length) {
      return draftItems.map((it, idx) => ({
        ...emptyLine(),
        _id:          it.id || Date.now() + idx,
        productId:    it.productId,
        productName:  it.productId ? it.description : '',
        description:  it.productId ? '' : it.description,
        productCode:  it.product?.code || '',
        quantity:     Number(it.qty) || 1,
        unitPriceHtg: Number(it.unitPrice) || 0,
        discountAmt:  Number(it.discount) || 0,
        unit:         it.product?.unit || 'unité',
      }))
    }
    return [emptyLine()]
  })

  // ✅ Senkronize panye santral la (nouvo devi sèlman)
  useEffect(() => {
    if (isEdit) return
    setDraftItems(items.map(it => ({
      id: it._id, description: lineName(it), productId: it.productId,
      unitPrice: it.unitPriceHtg, qty: it.quantity, discount: it.discountAmt,
    })))
  }, [items, isEdit])

  const { data: existingQuote } = useQuery({
    queryKey: ['quote', id],
    queryFn:  () => quoteAPI.getOne(id).then(r => r.data.quote),
    enabled:  isEdit,
    staleTime: 30_000,
  })

  // ✅ Nòt/kondisyon pa defo (nouvo devi sèlman)
  useEffect(() => {
    if (isEdit) return
    if (!notes) setNotes(tr(t, 'quotes.defaultNotes', ''))
    if (!terms) setTerms(tr(t, 'quotes.defaultTerms', ''))
  }, [t]) // eslint-disable-line

  useEffect(() => {
    if (!existingQuote) return
    setClient(existingQuote.client || existingQuote.clientSnapshot || null)
    const rawItems = Array.isArray(existingQuote.items) ? existingQuote.items : []
    setItems(rawItems.length > 0
      ? rawItems.map((i, idx) => {
          // ✅ discountAmt egzak si li sove; sinon rekonstwi l apati discountPct (ansyen devi)
          const gross   = Number(i.unitPriceHtg || 0) * Number(i.quantity || 0)
          const discAmt = i.discountAmt != null ? Number(i.discountAmt) : gross * Number(i.discountPct || 0) / 100
          const name    = i.product?.name || i.productSnapshot?.name || ''
          return {
            ...emptyLine(),
            _id:          i.id || idx,
            productId:    i.productId,
            productName:  i.productId ? name : '',
            description:  i.productId ? '' : name,   // ✅ deskripsyon lib rete modifyab
            productCode:  i.product?.code || i.productSnapshot?.code || '',
            quantity:     Number(i.quantity),
            unitPriceHtg: Number(i.unitPriceHtg),
            unitPriceUsd: Number(i.unitPriceUsd || 0),
            discountAmt:  Math.round(discAmt * 100) / 100,
            unit:         i.product?.unit || i.productSnapshot?.unit || 'unité',
          }
        })
      : [emptyLine()]
    )
    setDiscountValue(Number(existingQuote.discountHtg || existingQuote.discountValue || 0))
    setTaxRate(Number(existingQuote.taxRate || 0))
    setNotes(existingQuote.notes || '')
    setTerms(existingQuote.terms || '')
    setCurrency(existingQuote.currency || 'HTG')
    setExpiryDate(existingQuote.expiryDate ? String(existingQuote.expiryDate).split('T')[0] : '')
    if (existingQuote.notes || existingQuote.terms) setShowNotes(true)
  }, [existingQuote])

  // ✅ Rabè global = MONTAN HTG (toujou)
  const { subtotal, discountAmt, taxAmt, total } = useMemo(() => {
    const sub    = items.reduce((acc, it) => acc + lineTotal(it), 0)
    const disc   = Math.min(Number(discountValue || 0), sub)
    const afterD = Math.max(0, sub - disc)
    const tax    = afterD * Number(taxRate || 0) / 100
    return { subtotal: sub, discountAmt: disc, taxAmt: tax, total: afterD + tax }
  }, [items, discountValue, taxRate])

  const factor     = currency === 'USD' ? 1 / rate : 1
  const shownTotal = useCountUp(total * factor)

  const updateItem = useCallback((index, newItem) => setItems(prev => prev.map((it, i) => i === index ? newItem : it)), [])
  const removeItem = useCallback((index) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index)), [])
  const addItem    = useCallback(() => setItems(prev => [...prev, emptyLine()]), [])

  const validItems = useMemo(() => items.filter(isValidLine), [items])
  const clientOk   = !!client?.name || validItems.length > 0
  const itemsOk    = validItems.length > 0
  const STEPS = [
    { key: 'client', label: 'Kliyan',     done: clientOk },
    { key: 'items',  label: 'Atik',       done: itemsOk },
    { key: 'terms',  label: 'Kondisyon',  done: itemsOk && (!!expiryDate || !!notes) },
    { key: 'save',   label: 'Sove',       done: false },
  ]
  const curIdx = Math.max(0, STEPS.findIndex(s => !s.done))
  const goStep = (key) => secRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? quoteAPI.update(id, data) : quoteAPI.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? tr(t, 'quotes.quoteUpdated', 'Devi mete ajou!') : tr(t, 'quotes.quoteCreated', 'Devi kreye!'))
      qc.invalidateQueries({ queryKey: ['quotes'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['quote', id] })
      if (!isEdit) clearDraftCart()
      navigate(`/app/quotes/${res.data.quote?.id || id}`)
    },
    // ✅ NOUVO — anvan sa, si sèvè a refize, pa t gen okenn mesaj
    onError: (e) => toast.error(e?.response?.data?.message || 'Erè pandan anrejistreman devi a.'),
  })

  const handleSubmit = useCallback((e) => {
    e?.preventDefault()
    // ✅ KORIJE — liy vid (san pwodwi ni deskripsyon) pa voye ankò
    if (!validItems.length) {
      toast.error(tr(t, 'quotes.addAtLeastOneItem', 'Ajoute omwen yon atik.'))
      goStep('items')
      return
    }
    mutation.mutate({
      clientId: client?.id || null,
      clientSnapshot: client ? { id: client.id, name: client.name, phone: client.phone, email: client.email } : {},
      currency, exchangeRate: rate,
      discountType: 'amount',
      discountValue: Number(discountValue || 0),
      taxRate: Number(taxRate || 0), notes, terms,
      expiryDate: expiryDate || null,
      items: validItems.map((i, idx) => {
        const gross   = lineGross(i)
        const discAmt = Number(i.discountAmt || 0)
        const discPct = gross > 0 ? (discAmt / gross) * 100 : 0
        return {
          productId:       i.productId || null,
          productSnapshot: {
            name: lineName(i), code: i.productCode, unit: i.unit,
            tierLabel: i._priceMode?.startsWith('tier-')
              ? (i._priceTiers?.find(tr2 => `tier-${tr2.id || tr2.minQty}` === i._priceMode)?.label || 'Gwo')
              : (i.productId ? 'Detay' : null),
          },
          quantity:     Number(i.quantity),
          unitPriceHtg: Number(i.unitPriceHtg),
          unitPriceUsd: Number(i.unitPriceUsd || 0),
          discountPct:  Math.round(discPct * 100) / 100,
          discountAmt:  Math.round(discAmt * 100) / 100,
          sortOrder:    idx,   // ✅ kenbe lòd liy yo
        }
      }),
    })
  }, [validItems, client, currency, rate, discountValue, taxRate, notes, terms, expiryDate, mutation, t])

  const submitText = mutation.isPending
    ? tr(t, 'common.saving', 'Ap sove...')
    : isEdit ? tr(t, 'common.update', 'Mete ajou') : tr(t, 'quotes.createQuote', 'Kreye devi')

  const minExpiry = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="iv" style={{ maxWidth: 1240, paddingBottom: isMobile ? 80 : 24 }}>

      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FFC83D" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button type="button" className="back" onClick={() => navigate(isEdit ? `/app/quotes/${id}` : '/app/quotes')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico gold"><FileText size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{isEdit ? (existingQuote?.quoteNumber || 'Devi') : (tenant?.name || 'Devi')}</p>
            <h1>{isEdit ? tr(t, 'quotes.editQuote', 'Modifye devi') : tr(t, 'quotes.newQuote', 'Nouvo devi')}</h1>
            {!isMobile && <p className="sub">Pwofòma pou kliyan an — swiv etap yo, total la mete ajou an dirèk.</p>}
          </div>
        </div>
        <div className="iv-steps">
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: 'contents' }}>
              <button type="button" onClick={() => goStep(s.key)} className={`iv-step ${i === curIdx ? 'cur' : ''} ${s.done ? 'done' : ''}`}>
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
              <div className={`n ${client?.name ? 'ok' : ''}`}>{client?.name ? <Check size={18}/> : 1}</div>
              <div><p className="eb">Etap 1</p><h3>{tr(t, 'quotes.clientInfo', 'Kliyan')}</h3></div>
              <div className="r">{client?.name ? <span className="iv-pill"><Check size={11}/> Chwazi</span> : <span className="iv-pill muted">Opsyonèl</span>}</div>
            </div>
            <ClientSearch value={client} onChange={setClient}/>
          </section>

          {/* ② Atik */}
          <section ref={secRefs.items} className={`iv-sec a-up ${curIdx === 1 ? 'focus' : ''}`} style={{ animationDelay: '120ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${itemsOk ? 'ok' : ''}`}>{itemsOk ? <Check size={18}/> : 2}</div>
              <div><p className="eb">Etap 2</p><h3>{tr(t, 'quotes.items', 'Atik yo')}</h3></div>
              <div className="r"><span className={`iv-pill ${itemsOk ? '' : 'muted'}`}>{validItems.length} atik</span></div>
            </div>
            {items.map((item, idx) => (
              <QItem key={item._id} item={item} index={idx} count={items.length} onChange={updateItem} onRemove={removeItem} canOverridePrice={canOverridePrice}/>
            ))}
            <button type="button" className="iv-add" onClick={addItem}><Plus size={16}/> {tr(t, 'quotes.addAnotherItem', 'Ajoute yon lòt atik')}</button>
          </section>

          {/* ③ Kondisyon */}
          <section ref={secRefs.terms} className={`iv-sec a-up ${curIdx === 2 ? 'focus' : ''}`} style={{ animationDelay: '180ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${STEPS[2].done ? 'ok' : ''}`}>{STEPS[2].done ? <Check size={18}/> : 3}</div>
              <div><p className="eb">Etap 3</p><h3>Kondisyon</h3></div>
              <div className="r"><span className="iv-pill muted">Opsyonèl</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '200px 200px 1fr', gap: 10 }}>
              <div>
                <label className="iv-lbl"><Calendar size={10} style={{ verticalAlign: '-1px' }}/> Valab jiska</label>
                <input type="date" className="iv-inp" min={minExpiry} value={expiryDate} onChange={e => setExpiryDate(e.target.value)}/>
              </div>
              <div>
                <label className="iv-lbl"><Percent size={10} style={{ verticalAlign: '-1px' }}/> {tr(t, 'quotes.taxVAT', 'TVA')} (%)</label>
                <input type="number" min="0" max="100" step="0.5" className="iv-inp money" value={taxRate} onFocus={e => e.target.select()} onChange={e => setTaxRate(e.target.value)}/>
              </div>
              {!isMobile && <div/>}
            </div>
            {expiryDate && (
              <div className="iv-quick" style={{ marginTop: 8 }}>
                {[7, 15, 30].map(d => (
                  <button key={d} type="button" onClick={() => setExpiryDate(new Date(Date.now() + d * 864e5).toISOString().split('T')[0])}>+{d} jou</button>
                ))}
              </div>
            )}
            {!expiryDate && (
              <div className="iv-quick" style={{ marginTop: 8 }}>
                {[7, 15, 30].map(d => (
                  <button key={d} type="button" onClick={() => setExpiryDate(new Date(Date.now() + d * 864e5).toISOString().split('T')[0])}>Valab {d} jou</button>
                ))}
              </div>
            )}

            <button type="button" className="iv-act" style={{ marginTop: 14 }} onClick={() => setShowNotes(v => !v)}>
              <StickyNote size={14}/> {showNotes ? 'Kache nòt ak kondisyon' : 'Ajoute nòt / kondisyon'}
            </button>
            {showNotes && (
              <div className="a-up" style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <div>
                  <label className="iv-lbl">Nòt pou kliyan an</label>
                  <textarea className="iv-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Egz: Mèsi pou konfyans ou!"/>
                </div>
                <div>
                  <label className="iv-lbl">Kondisyon</label>
                  <textarea className="iv-textarea" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Egz: 50% avans pou konfime kòmand lan."/>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ④ Pwofòma an dirèk */}
        <aside ref={secRefs.save} className="iv-aside">
          <div className="iv-receipt">
            <div className="rh">
              <span className="brand">{tenant?.name || 'Pwofòma'}</span>
              <span className="tag" style={{ color: '#A87B12', background: 'rgba(201,168,76,.15)' }}>Pwofòma</span>
            </div>
            <div className="meta">
              <div><span>Kliyan</span><b>{client?.name || 'San kliyan'}</b></div>
              <div style={{ textAlign: 'right' }}><span>Valab jiska</span><b>{expiryDate ? expiryDate.split('-').reverse().join('/') : '—'}</b></div>
            </div>

            <div className="iv-cur">
              {['HTG', 'USD'].map(c => (
                <button key={c} type="button" className={currency === c ? 'on' : ''} onClick={() => setCurrency(c)}>{c === 'HTG' ? '🇭🇹 HTG' : '🇺🇸 USD'}</button>
              ))}
            </div>

            <div className="iv-rlines">
              {validItems.length ? validItems.map(it => (
                <div key={it._id} className="iv-rline">
                  <div className="d">
                    <b>{lineName(it)}</b>
                    <small>{Number(it.quantity)} × {fmt2(it.unitPriceHtg)}{Number(it.discountAmt) > 0 ? ` − ${fmt2(it.discountAmt)}` : ''}</small>
                  </div>
                  <span className="num">{fmt2(lineTotal(it) * factor)}</span>
                </div>
              )) : <div className="iv-rempty">📄 Atik ou ajoute yo ap parèt la a</div>}
            </div>

            <div style={{ paddingTop: 8 }}>
              <div className="iv-rrow"><span>{tr(t, 'quotes.subtotal', 'Sou-total')}</span><span className="num">{fmt2(subtotal * factor)} {currency}</span></div>
              <div className="iv-rinline">
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Rabè global (HTG)</span>
                <input type="number" min="0" step="0.01" className="iv-inp money" value={discountValue} onFocus={e => e.target.select()} onChange={e => setDiscountValue(e.target.value)} placeholder="0.00"/>
              </div>
              {discountAmt > 0 && <div className="iv-rrow disc"><span>− Rabè aplike</span><span className="num">− {fmt2(discountAmt * factor)} {currency}</span></div>}
              {taxAmt > 0 && <div className="iv-rrow"><span>TVA ({taxRate}%)</span><span className="num">+ {fmt2(taxAmt * factor)} {currency}</span></div>}
            </div>

            <div className="iv-rtotal">
              <span>Total</span>
              <span className="num">{fmt2(shownTotal)}<small>{currency}</small></span>
            </div>
            <div className="iv-rrow" style={{ marginTop: 6 }}>
              <span>≈ {currency === 'HTG' ? 'USD' : 'HTG'}</span>
              <span className="mono" style={{ fontSize: 12 }}>{fmt2(currency === 'HTG' ? total / rate : total)} {currency === 'HTG' ? 'USD' : 'HTG'}</span>
            </div>
            <div className="iv-rrow"><span>{tr(t, 'quotes.rate', 'To')}</span><span className="mono" style={{ fontSize: 11 }}>1 USD = {rate.toFixed(2)} HTG</span></div>
          </div>

          <div className="iv-check">
            <div className={itemsOk ? 'ok' : ''}><i>{itemsOk && <Check size={11} strokeWidth={3}/>}</i> Omwen yon atik valab</div>
            <div className={client?.name ? 'ok' : ''}><i>{client?.name && <Check size={11} strokeWidth={3}/>}</i> Kliyan {client?.name ? '' : '(opsyonèl)'}</div>
            <div className={expiryDate ? 'ok' : ''}><i>{expiryDate && <Check size={11} strokeWidth={3}/>}</i> Dat validite {expiryDate ? '' : '(opsyonèl)'}</div>
          </div>

          {!isMobile && (
            <button type="submit" className={`iv-btn-main ${itemsOk && !mutation.isPending ? 'pulse' : ''}`} style={{ width: '100%', minHeight: 54, fontSize: 15 }} disabled={mutation.isPending}>
              {mutation.isPending ? <RefreshCw size={17} className="spin"/> : <Save size={17}/>} {submitText}
            </button>
          )}
        </aside>
      </div>

      {isMobile && (
        <div className="iv-mbar">
          <div className="l">
            <small>{validItems.length} atik · Total {currency}</small>
            <span className="num" style={{ display: 'inline-block' }}>{fmt2(shownTotal)}</span>
          </div>
          <button type="submit" className="iv-btn-main" disabled={mutation.isPending} style={{ minHeight: 50 }}>
            {mutation.isPending ? <RefreshCw size={16} className="spin"/> : <Save size={16}/>} {mutation.isPending ? 'Ap sove...' : (isEdit ? 'Mete ajou' : 'Kreye')}
          </button>
        </div>
      )}
    </form>
  )
}