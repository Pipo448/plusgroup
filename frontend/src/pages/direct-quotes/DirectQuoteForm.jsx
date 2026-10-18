// src/pages/direct-quotes/DirectQuoteForm.jsx — Plus Fit redesign
// ✅ NOUVO: etap vizib, aperçu an dirèk, bouyon sove otomatikman, dipliké liy,
//           foto ki retire, dat validite rapid, dipliké yon devi (soti nan detay la)
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api, { clientAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { compressImage } from '../../utils/imageCompression'
import {
  Plus, Trash2, Search, ArrowLeft, Save, X, Lock, User, Camera, Image as ImageIcon, Check,
  Copy, Calendar, RefreshCw, FileSignature, StickyNote, RotateCcw,
} from 'lucide-react'
import '../invoices/invoices.css'

const fmt2 = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const tr = (t, key, fallback, opts) => { const v = t(key, opts); return v && v !== key ? v : fallback }

const DRAFT_KEY = 'pg-dq-draft'
const newItem = () => ({ _id: Date.now() + Math.random(), description: '', imageUrl: null, size: '', quantity: 1, unitPriceHtg: 0, discountAmt: 0 })
const lineTotal = (it) => Math.max(0, Number(it.quantity || 0) * Number(it.unitPriceHtg || 0) - Number(it.discountAmt || 0))
const isValid = (it) => !!it.description?.trim() && Number(it.quantity) > 0

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

// ── Kliyan (opsyonèl): chwazi nan lis la OSWA tape yon non
const ClientSearch = memo(function ClientSearch({ value, onChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(value?.id ? '' : (value?.name || ''), 400)

  const { data } = useQuery({
    queryKey: ['clients-search-dq', debounced],
    queryFn:  () => clientAPI.getAll({ search: debounced, limit: 8 }).then(r => r.data.clients || []),
    enabled:  debounced.length >= 1,
    staleTime: 30_000,
  })

  if (value?.id) {
    return (
      <div className="iv-client-card">
        <div className="iv-avatar" style={{ background: '#7C3AED', width: 42, height: 42 }}>{value.name?.trim()?.[0]?.toUpperCase() || <User size={16}/>}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{value.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{value.phone || 'Kliyan anrejistre'}</div>
        </div>
        <button type="button" className="iv-del" style={{ background: '#fff' }} onClick={() => onChange(null)}>Chanje</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <label className="iv-lbl">{tr(t, 'directQuotes.searchClient', 'Chèche oswa tape non kliyan an')}</label>
      <div className="iv-icon-inp">
        <Search size={15}/>
        <input className="iv-inp" placeholder="Non, telefòn... (kite vid = san kliyan)"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="iv-avatar" style={{ background: '#7C3AED', width: 32, height: 32, fontSize: 12 }}>{c.name?.[0]?.toUpperCase()}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.phone || ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// ── Atik: foto + deskripsyon + gwosè + kantite/pri/rabè
const ItemEntry = memo(function ItemEntry({ item, index, count, onChange, onRemove, onDuplicate }) {
  const { t } = useTranslation()
  const total = lineTotal(item)
  const shown = useCountUp(total, 300)
  const [busy, setBusy] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error(tr(t, 'directQuotes.imageOnlyError', 'Se sèlman foto ki aksepte.')); return }
    // ✅ KORIJE — foto telefòn yo gen 3-8 MB; nou konprese yo kanmenm, kidonk
    // limit 2 MB la te bloke prèske tout foto kamera. Kounye a: 15 MB.
    if (file.size > 15 * 1024 * 1024) { toast.error(tr(t, 'directQuotes.imageTooLarge', 'Foto a twò gwo (maks 15 MB).')); return }
    setBusy(true)
    try {
      const compressed = await compressImage(file, { maxWidth: 800, quality: 0.75 })
      onChange(index, { imageUrl: compressed })
    } catch {
      toast.error('Pa t ka prepare foto a.')
    } finally {
      setBusy(false)
    }
  }

  const ok = isValid(item)

  return (
    <div className={`iv-line ${ok ? 'ok' : ''}`}>
      <div className="iv-line-h">
        <span className="t">Atik #{index + 1} {ok && <Check size={13} color="#059669"/>}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="iv-del" style={{ background: 'rgba(27,42,143,.06)', color: 'var(--blue)', borderColor: 'var(--line2)' }} onClick={() => onDuplicate(index)} title="Dipliké liy sa a">
            <Copy size={12}/> Kopi
          </button>
          {count > 1 && <button type="button" className="iv-del" onClick={() => onRemove(index)}><Trash2 size={12}/> Retire</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <label className={`iv-photo ${item.imageUrl ? 'has' : ''}`} style={{ backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined }}>
            {busy ? <RefreshCw size={18} className="spin"/> : !item.imageUrl && <ImageIcon size={20}/>}
            <span className="cam"><Camera size={10}/></span>
            <input type="file" accept="image/*" onChange={handleImageChange}/>
          </label>
          {item.imageUrl && (
            <button type="button" onClick={() => onChange(index, { imageUrl: null })}
              style={{ background: 'none', border: 'none', color: 'var(--bad)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Retire foto</button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
          <div>
            <label className="iv-lbl">Pwodwi / sèvis</label>
            <input className="iv-inp" placeholder={tr(t, 'directQuotes.itemNamePlaceholder', 'Egz: Pòt an bwa, Tablo...')}
              value={item.description} onChange={e => onChange(index, { description: e.target.value })}/>
          </div>
          <div style={{ maxWidth: 200 }}>
            <label className="iv-lbl">{tr(t, 'directQuotes.size', 'Gwosè')}</label>
            <input className="iv-inp" placeholder={tr(t, 'directQuotes.sizePlaceholder', 'Egz: 2m x 1m, XL...')}
              value={item.size || ''} onChange={e => onChange(index, { size: e.target.value })}/>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <div>
          <label className="iv-lbl">{tr(t, 'directQuotes.quantity', 'Qte')}</label>
          <input type="number" min="0" step="0.01" className="iv-inp money center" value={item.quantity}
            onFocus={e => e.target.select()} onChange={e => onChange(index, { quantity: e.target.value })}/>
        </div>
        <div>
          <label className="iv-lbl">Pri U. HTG</label>
          <input type="number" min="0" step="0.01" className="iv-inp money" value={item.unitPriceHtg}
            onFocus={e => e.target.select()} onChange={e => onChange(index, { unitPriceHtg: e.target.value })}/>
        </div>
        <div>
          <label className="iv-lbl">Rabè HTG</label>
          <input type="number" min="0" step="0.01" className="iv-inp money" value={item.discountAmt}
            onFocus={e => e.target.select()} onChange={e => onChange(index, { discountAmt: e.target.value })}/>
        </div>
      </div>

      <div className="iv-line-total">
        <span>Total liy</span>
        <span className="num">{fmt2(shown)} <small style={{ fontSize: 12, opacity: .6 }}>HTG</small></span>
      </div>
    </div>
  )
})

// ══════════════════════════════════════════════
export default function DirectQuoteForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { tenant, user } = useAuthStore()
  const isMobile = useIsMobile()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  // ✅ KORIJE — to a soti nan exchangeRates.USD (tenant.exchangeRate pa egziste → toujou 132)
  const rate = Number(tenant?.exchangeRates?.USD || tenant?.exchangeRate || 132)

  const dup = location.state?.duplicate || null   // ✅ NOUVO — "Dipliké" soti nan paj detay la

  const [client, setClient]               = useState(dup?.client || null)
  const [expiryDate, setExpiryDate]       = useState('')
  const [notes, setNotes]                 = useState(dup?.notes || '')
  const [terms, setTerms]                 = useState(dup?.terms || '')
  const [discountValue, setDiscountValue] = useState(dup?.discountValue || 0)
  const [items, setItems]                 = useState(() => dup?.items?.length ? dup.items.map(it => ({ ...newItem(), ...it, _id: Date.now() + Math.random() })) : [newItem()])
  const [showNotes, setShowNotes]         = useState(!!(dup?.notes || dup?.terms))
  const [draft, setDraft]                 = useState(null)   // bouyon ki ka rekipere
  const [savedAt, setSavedAt]             = useState(null)

  const secRefs = { client: useRef(null), items: useRef(null), terms: useRef(null), save: useRef(null) }

  // ✅ NOUVO — Bouyon: si paj la fèmen pa aksidan (batri, apèl...), devi a pa pèdi
  useEffect(() => {
    if (dup) return
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (d && Date.now() - d.t < 3 * 864e5 && d.items?.some(isValid)) setDraft(d)
    } catch { /* */ }
  }, []) // eslint-disable-line

  const dirty = items.some(it => it.description?.trim()) || !!client
  useEffect(() => {
    if (!dirty || draft) return
    const h = setTimeout(() => {
      const payload = { t: Date.now(), client, expiryDate, notes, terms, discountValue, items }
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); setSavedAt(new Date()) }
      catch {
        // foto yo ka depase espas la → sove san foto
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload, items: items.map(i => ({ ...i, imageUrl: null })) })); setSavedAt(new Date()) } catch { /* */ }
      }
    }, 800)
    return () => clearTimeout(h)
  }, [client, expiryDate, notes, terms, discountValue, items, dirty, draft])

  const restoreDraft = () => {
    setClient(draft.client || null); setExpiryDate(draft.expiryDate || ''); setNotes(draft.notes || '')
    setTerms(draft.terms || ''); setDiscountValue(draft.discountValue || 0)
    setItems(draft.items?.length ? draft.items : [newItem()])
    if (draft.notes || draft.terms) setShowNotes(true)
    setDraft(null)
    toast.success('Bouyon an rekipere!')
  }
  const dropDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* */ } setDraft(null) }

  const updateItem    = useCallback((idx, ch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...ch } : it)), [])
  const removeItem    = useCallback((idx) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)), [])
  const addItem       = useCallback(() => setItems(prev => [...prev, newItem()]), [])
  const duplicateItem = useCallback((idx) => setItems(prev => {
    const copy = { ...prev[idx], _id: Date.now() + Math.random() }
    return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
  }), [])

  const validItems = useMemo(() => items.filter(isValid), [items])
  const subtotal   = useMemo(() => items.reduce((s, it) => s + lineTotal(it), 0), [items])
  const discount   = Math.min(Number(discountValue || 0), subtotal)   // ✅ pa ka depase sou-total la
  const total      = Math.max(0, subtotal - discount)
  const shownTotal = useCountUp(total)

  const itemsOk = validItems.length > 0
  const STEPS = [
    { key: 'client', label: 'Kliyan',    done: !!client?.name || itemsOk },
    { key: 'items',  label: 'Atik',      done: itemsOk },
    { key: 'terms',  label: 'Kondisyon', done: itemsOk && (!!expiryDate || !!notes || !!terms) },
    { key: 'save',   label: 'Sove',      done: false },
  ]
  const curIdx = Math.max(0, STEPS.findIndex(s => !s.done))
  const goStep = (k) => secRefs[k]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/direct-quotes', payload).then(r => r.data),
    onSuccess: (res) => {
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* */ }
      qc.invalidateQueries({ queryKey: ['direct-quotes'] })
      toast.success(isAdmin
        ? tr(t, 'directQuotes.createdSuccessAdmin', 'Devi dirèk kreye!')
        : tr(t, 'directQuotes.createdSuccessCashier', 'Devi a sove — admin yo resevwa yon notifikasyon pou otorize l.'))
      navigate(`/app/direct-quotes/${res.directQuote.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || tr(t, 'directQuotes.errorCreating', 'Erè pandan kreyasyon devi a.')),
  })

  const handleSave = () => {
    if (!validItems.length) { toast.error(tr(t, 'directQuotes.addAtLeastOneItem', 'Ajoute omwen yon atik.')); goStep('items'); return }
    if (items.some(it => it.description?.trim() && Number(it.quantity) <= 0)) {
      toast.error(tr(t, 'directQuotes.quantityMustBePositive', 'Kantite dwe plis pase 0.')); goStep('items'); return
    }
    mutation.mutate({
      clientId: client?.id || null,
      clientSnapshot: client?.name
        ? { name: client.name, phone: client.phone, address: client.address }
        : { name: 'San kliyan' },   // ✅ anvan sa: kle i18n la te ka sove kòm non kliyan
      currency: 'HTG',
      exchangeRate: rate,
      discountType: 'amount',
      discountValue: discount,
      expiryDate: expiryDate || null,
      notes, terms,
      items: validItems.map(it => ({
        description: it.description.trim(),
        imageUrl: it.imageUrl || null,
        size: it.size ? it.size.trim() : null,
        quantity: Number(it.quantity || 0),
        unitPriceHtg: Number(it.unitPriceHtg || 0),
        discountAmt: Number(it.discountAmt || 0),
      })),
    })
  }

  const minDate = new Date().toISOString().split('T')[0]
  const saveText = mutation.isPending ? tr(t, 'directQuotes.saving', 'Ap sove...') : tr(t, 'directQuotes.createDirectQuote', 'Kreye devi dirèk')

  return (
    <div className="iv" style={{ maxWidth: 1240, paddingBottom: isMobile ? 80 : 24 }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,.5), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#A78BFA" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button type="button" className="back" onClick={() => navigate('/app/direct-quotes')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico violet"><FileSignature size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{dup ? 'Kopi yon devi' : (tenant?.name || 'Devi dirèk')}</p>
            <h1>{tr(t, 'directQuotes.newDirectQuote', 'Nouvo devi dirèk')}</h1>
            {savedAt && !draft && <div className="iv-draft"><i/> Bouyon sove otomatikman · {savedAt.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })}</div>}
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

      {draft && (
        <div className="iv-banner sync">
          <span className="ic"><RotateCcw size={17} color="#1B2A8F"/></span>
          <div className="grow">
            <div style={{ fontSize: 13, fontWeight: 800 }}>Ou gen yon bouyon ki pa t fini</div>
            <div style={{ fontWeight: 600, color: 'var(--muted)' }}>{draft.items.filter(isValid).length} atik · {new Date(draft.t).toLocaleString('fr-HT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <button type="button" onClick={restoreDraft}>Rekipere</button>
          <button type="button" onClick={dropDraft} style={{ background: '#fff', color: 'var(--bad)', border: '1px solid rgba(220,38,38,.25)' }}>Efase</button>
        </div>
      )}

      {!isAdmin && (
        <div className="iv-banner auth">
          <span className="ic"><Lock size={16} color="#7C3AED"/></span>
          <div className="grow">{tr(t, 'directQuotes.authWarningCashier', 'Devi sa a ap bezwen otorizasyon yon admin anvan ou ka enprime, pataje oswa konvèti l.')}</div>
        </div>
      )}

      <div className="iv-layout">
        <div className="iv-col">
          <section ref={secRefs.client} className={`iv-sec a-up ${curIdx === 0 ? 'focus' : ''}`} style={{ animationDelay: '60ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${client?.name ? 'ok' : ''}`}>{client?.name ? <Check size={18}/> : 1}</div>
              <div><p className="eb">Etap 1</p><h3>Kliyan</h3></div>
              <div className="r">{client?.name ? <span className="iv-pill"><Check size={11}/> Chwazi</span> : <span className="iv-pill muted">Opsyonèl</span>}</div>
            </div>
            <ClientSearch value={client} onChange={setClient}/>
          </section>

          <section ref={secRefs.items} className={`iv-sec a-up ${curIdx === 1 ? 'focus' : ''}`} style={{ animationDelay: '120ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${itemsOk ? 'ok' : ''}`}>{itemsOk ? <Check size={18}/> : 2}</div>
              <div><p className="eb">Etap 2</p><h3>{tr(t, 'directQuotes.itemsTitle', 'Atik yo')}</h3></div>
              <div className="r"><span className={`iv-pill ${itemsOk ? '' : 'muted'}`}>{validItems.length} atik</span></div>
            </div>
            {items.map((item, idx) => (
              <ItemEntry key={item._id} item={item} index={idx} count={items.length} onChange={updateItem} onRemove={removeItem} onDuplicate={duplicateItem}/>
            ))}
            <button type="button" className="iv-add" onClick={addItem}><Plus size={16}/> {tr(t, 'directQuotes.addAnotherItem', 'Ajoute yon lòt atik')}</button>
          </section>

          <section ref={secRefs.terms} className={`iv-sec a-up ${curIdx === 2 ? 'focus' : ''}`} style={{ animationDelay: '180ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${STEPS[2].done ? 'ok' : ''}`}>{STEPS[2].done ? <Check size={18}/> : 3}</div>
              <div><p className="eb">Etap 3</p><h3>Kondisyon</h3></div>
              <div className="r"><span className="iv-pill muted">Opsyonèl</span></div>
            </div>
            <div style={{ maxWidth: 220 }}>
              <label className="iv-lbl"><Calendar size={10} style={{ verticalAlign: '-1px' }}/> {tr(t, 'directQuotes.expiryDate', 'Valab jiska')}</label>
              <input type="date" className="iv-inp" min={minDate} value={expiryDate} onChange={e => setExpiryDate(e.target.value)}/>
            </div>
            <div className="iv-quick" style={{ marginTop: 8 }}>
              {[7, 15, 30].map(d => (
                <button key={d} type="button" onClick={() => setExpiryDate(new Date(Date.now() + d * 864e5).toISOString().split('T')[0])}>Valab {d} jou</button>
              ))}
              {expiryDate && <button type="button" onClick={() => setExpiryDate('')} style={{ color: 'var(--bad)' }}>Retire dat</button>}
            </div>
            <button type="button" className="iv-act" style={{ marginTop: 14 }} onClick={() => setShowNotes(v => !v)}>
              <StickyNote size={14}/> {showNotes ? 'Kache nòt ak kondisyon' : 'Ajoute nòt / kondisyon'}
            </button>
            {showNotes && (
              <div className="a-up" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginTop: 12 }}>
                <div>
                  <label className="iv-lbl">{tr(t, 'directQuotes.notesForClient', 'Nòt pou kliyan an')}</label>
                  <textarea className="iv-textarea" value={notes} onChange={e => setNotes(e.target.value)}/>
                </div>
                <div>
                  <label className="iv-lbl">{tr(t, 'directQuotes.generalTerms', 'Kondisyon jeneral')}</label>
                  <textarea className="iv-textarea" value={terms} onChange={e => setTerms(e.target.value)}/>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside ref={secRefs.save} className="iv-aside">
          <div className="iv-receipt">
            <div className="rh">
              <span className="brand">{tenant?.name || 'Devi dirèk'}</span>
              <span className="tag" style={{ color: '#6D28D9', background: 'rgba(124,58,237,.12)' }}>Aperçu</span>
            </div>
            <div className="meta">
              <div><span>Kliyan</span><b>{client?.name || 'San kliyan'}</b></div>
              <div style={{ textAlign: 'right' }}><span>Valab jiska</span><b>{expiryDate ? expiryDate.split('-').reverse().join('/') : '—'}</b></div>
            </div>
            <div className="iv-rlines">
              {validItems.length ? validItems.map(it => (
                <div key={it._id} className="iv-rline" style={{ alignItems: 'center' }}>
                  <div className="d" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {it.imageUrl && <span className="iv-thumb" style={{ width: 30, height: 30, borderRadius: 8, backgroundImage: `url(${it.imageUrl})` }}/>}
                    <div style={{ minWidth: 0 }}>
                      <b>{it.description}{it.size ? ` · ${it.size}` : ''}</b>
                      <small>{Number(it.quantity)} × {fmt2(it.unitPriceHtg)}{Number(it.discountAmt) > 0 ? ` − ${fmt2(it.discountAmt)}` : ''}</small>
                    </div>
                  </div>
                  <span className="num">{fmt2(lineTotal(it))}</span>
                </div>
              )) : <div className="iv-rempty">🖼️ Atik ou ajoute yo ap parèt la a</div>}
            </div>
            <div style={{ paddingTop: 8 }}>
              <div className="iv-rrow"><span>Sou-total</span><span className="num">{fmt2(subtotal)}</span></div>
              <div className="iv-rinline">
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{tr(t, 'directQuotes.generalDiscount', 'Rabè global')} (HTG)</span>
                <input type="number" min="0" step="0.01" className="iv-inp money" value={discountValue} onFocus={e => e.target.select()} onChange={e => setDiscountValue(e.target.value)} placeholder="0.00"/>
              </div>
              {discount > 0 && <div className="iv-rrow disc"><span>− Rabè aplike</span><span className="num">− {fmt2(discount)}</span></div>}
            </div>
            <div className="iv-rtotal">
              <span>Total</span>
              <span className="num">{fmt2(shownTotal)}<small>HTG</small></span>
            </div>
            <div className="iv-rrow" style={{ marginTop: 6 }}><span>≈ USD</span><span className="mono" style={{ fontSize: 12 }}>${fmt2(total / rate)}</span></div>
          </div>

          <div className="iv-check">
            <div className={itemsOk ? 'ok' : ''}><i>{itemsOk && <Check size={11} strokeWidth={3}/>}</i> Omwen yon atik valab</div>
            <div className={client?.name ? 'ok' : ''}><i>{client?.name && <Check size={11} strokeWidth={3}/>}</i> Kliyan {client?.name ? '' : '(opsyonèl)'}</div>
            <div className={isAdmin ? 'ok' : ''}><i>{isAdmin && <Check size={11} strokeWidth={3}/>}</i> {isAdmin ? 'Admin — ou ka otorize l touswit' : 'Ap tann otorizasyon admin'}</div>
          </div>

          {!isMobile && (
            <button type="button" onClick={handleSave} disabled={mutation.isPending} className={`iv-btn-main ${itemsOk && !mutation.isPending ? 'pulse' : ''}`} style={{ width: '100%', minHeight: 54, fontSize: 15 }}>
              {mutation.isPending ? <RefreshCw size={17} className="spin"/> : <Save size={17}/>} {saveText}
            </button>
          )}
        </aside>
      </div>

      {isMobile && (
        <div className="iv-mbar">
          <div className="l">
            <small>{validItems.length} atik · Total</small>
            <span className="num" style={{ display: 'inline-block' }}>{fmt2(shownTotal)}</span>
          </div>
          <button type="button" onClick={handleSave} disabled={mutation.isPending} className="iv-btn-main" style={{ minHeight: 50 }}>
            {mutation.isPending ? <RefreshCw size={16} className="spin"/> : <Save size={16}/>} {mutation.isPending ? 'Ap sove...' : 'Kreye'}
          </button>
        </div>
      )}
    </div>
  )
}