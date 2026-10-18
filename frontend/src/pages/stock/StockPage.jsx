// src/pages/stock/StockPage.jsx — Plus Fit redesign
// ✅ KORIJE: lis la pa t rafrechi apre yon ajisteman (invalidateQueries v5); bouton
//            konfime a pa t janm bloke (isLoading → isPending, risk 2 mouvman);
//            pa t gen mesaj erè; rechèch san debounce; CSS global ki te kache
//            ba defilman TOUT app la (div::-webkit-scrollbar)
// ✅ NOUVO:  mouvman gwoupe pa jou, aperçu « avan → apre » an dirèk, blokaj si w retire
//            plis pase sa ki an stòk, bouton kantite rapid, rezon rapid, klike sou yon
//            mouvman pou re-ajiste menm pwodwi a, ekspòte CSV
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockAPI, productAPI } from '../../services/api'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Warehouse, Plus, Search, ChevronLeft, ChevronRight, Package, RefreshCw, X, Check,
  ArrowUpCircle, ArrowDownCircle, Layers, Download, Repeat, AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import '../invoices/invoices.css'

const tr = (t, key, fallback, opts) => { const v = t(key, opts); return v && v !== key ? v : fallback }
const num = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 3 })

const MOVES = {
  sale:        { key: 'stock.sale',       label: 'Vant',        color: '#DC2626', bg: 'rgba(220,38,38,0.09)',  icon: '↓' },
  purchase:    { key: 'stock.purchase',   label: 'Acha',        color: '#059669', bg: 'rgba(5,150,105,0.10)',  icon: '↑' },
  adjustment:  { key: 'stock.adjustment', label: 'Ajisteman',   color: '#1B2A8F', bg: 'rgba(27,42,143,0.08)',  icon: '⟳' },
  return_item: { key: 'stock.return',     label: 'Retou',       color: '#7C3AED', bg: 'rgba(124,58,237,0.09)', icon: '↩' },
  loss:        { key: 'stock.loss',       label: 'Pèt',         color: '#EA580C', bg: 'rgba(234,88,12,0.10)',  icon: '!' },
  transfer:    { key: 'stock.transfer',   label: 'Transfè',     color: '#0284C7', bg: 'rgba(2,132,199,0.09)',  icon: '⇄' },
}

const ADJ_TYPES = [
  { v: 'add',      key: 'stock.add',      label: 'Ajoute',  icon: '+', color: '#059669', sign: +1 },
  { v: 'remove',   key: 'stock.remove',   label: 'Retire',  icon: '−', color: '#DC2626', sign: -1 },
  { v: 'purchase', key: 'stock.purchase', label: 'Acha',    icon: '↑', color: '#1B2A8F', sign: +1 },
  { v: 'loss',     key: 'stock.loss',     label: 'Pèt',     icon: '!', color: '#EA580C', sign: -1 },
]

const REASONS = {
  add:      ['Erè kontaj', 'Retou kliyan', 'Envantè'],
  remove:   ['Erè kontaj', 'Itilizasyon entèn', 'Envantè'],
  purchase: ['Livrezon founisè', 'Acha mache', 'Reapwovizyonman'],
  loss:     ['Kase', 'Ekspire', 'Vòl', 'Domaj'],
}

const toHaiti = (d) => { try { return new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Port-au-Prince' })) } catch { return new Date(d) } }
const dayLabel = (d) => {
  const x = toHaiti(d), now = toHaiti(new Date())
  const key = format(x, 'yyyy-MM-dd')
  if (key === format(now, 'yyyy-MM-dd')) return 'Jodi a'
  if (key === format(new Date(now.getTime() - 864e5), 'yyyy-MM-dd')) return 'Yè'
  return x.toLocaleDateString('fr-HT', { weekday: 'long', day: '2-digit', month: 'long' })
}

function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

function useEsc(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

function useCountUp(value, ms = 700) {
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

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, prefix = '' }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{prefix}{num(Math.round(v))}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Modal ajisteman
// ════════════════════════════════════════════════════════════
const AdjustModal = ({ onClose, preset }) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  useEsc(onClose)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(preset?.product || null)
  const [form, setForm]         = useState({ quantity: '', type: preset?.type || 'add', notes: '' })
  const debounced = useDebounce(search)
  const qtyRef = useRef(null)

  const { data: products, isFetching } = useQuery({
    queryKey: ['products-adj', debounced],
    queryFn: () => productAPI.getAll({ search: debounced, limit: 8 }).then(r => (r.data.products || []).filter(p => !p.isService)),
    enabled: debounced.length >= 1,
    staleTime: 20_000,
  })

  // ✅ Si pwodwi a soti nan yon mouvman, chaje stòk AKTYÈL li (pa sa ki te nan mouvman an)
  const { data: fresh } = useQuery({
    queryKey: ['product-one-adj', selected?.id],
    queryFn: () => productAPI.getAll({ search: selected.code || selected.name, limit: 5 }).then(r => (r.data.products || []).find(p => p.id === selected.id) || null),
    enabled: !!selected?.id && selected?.quantity == null,
    staleTime: 0,
  })
  const product = fresh || selected

  useEffect(() => { if (selected) setTimeout(() => qtyRef.current?.focus(), 80) }, [selected])

  const type    = ADJ_TYPES.find(x => x.v === form.type) || ADJ_TYPES[0]
  const qty     = Number(form.quantity || 0)
  const before  = product?.quantity != null ? Number(product.quantity) : null
  const after   = before != null ? before + type.sign * qty : null
  const tooMuch = type.sign < 0 && before != null && qty > before

  const mutation = useMutation({
    mutationFn: (data) => stockAPI.addMovement(data),
    onSuccess: () => {
      toast.success(tr(t, 'stock.adjusted', 'Stòk ajiste!'))
      // ✅ KORIJE — { queryKey } (v5): anvan sa lis la ak pwodwi yo pa t mete ajou
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-adj'] })
      onClose()
    },
    // ✅ NOUVO — anvan sa, si sèvè a refize, pa t gen okenn mesaj
    onError: (e) => toast.error(e?.response?.data?.message || 'Erè pandan ajisteman an.'),
  })

  const handleConfirm = () => {
    if (!selected) return toast.error(tr(t, 'stock.selectProduct', 'Chwazi yon pwodwi.'))
    if (!qty || qty <= 0) { qtyRef.current?.focus(); return toast.error(tr(t, 'stock.quantityRequired', 'Antre yon kantite.')) }
    if (tooMuch) return toast.error(`Ou pa ka retire ${num(qty)} — se ${num(before)} sèlman ki an stòk.`)
    mutation.mutate({ productId: selected.id, quantity: qty, type: form.type, notes: form.notes.trim() })
  }

  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && !mutation.isPending && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 480 }}>
        <div className="iv-sheet-h" style={{ background: 'radial-gradient(120% 140% at 100% 0%, #14B8A6, #0F1A5C 75%)' }}>
          <h3><RefreshCw size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'stock.adjustTitle', 'Ajiste stòk')}</h3>
          <p>{product ? product.name : 'Chwazi pwodwi a, tip mouvman an ak kantite a'}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>

        <div className="iv-sheet-b">
          {/* Pwodwi */}
          <div>
            <label className="iv-lbl">{tr(t, 'stock.product', 'Pwodwi')}</label>
            {selected ? (
              <div className="iv-client-card" style={{ borderColor: 'rgba(20,184,166,.35)', background: 'linear-gradient(135deg,#F0FDFA,#F4F6FE)' }}>
                <span className="iv-thumb" style={{ width: 44, height: 44, borderRadius: 12, backgroundImage: product?.imageUrl ? `url(${product.imageUrl})` : undefined }}>
                  {!product?.imageUrl && <Package size={17} color="#0F766E"/>}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {tr(t, 'stock.currentStock', 'Stòk aktyèl')}: <b className="num" style={{ fontSize: 15, color: 'var(--ink)' }}>{before != null ? num(before) : '…'}</b> {product?.unit}
                  </div>
                </div>
                <button type="button" className="iv-del" style={{ background: '#fff' }} onClick={() => setSelected(null)}>Chanje</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div className="iv-icon-inp">
                  {isFetching ? <RefreshCw size={15} className="spin"/> : <Search size={15}/>}
                  <input className="iv-inp" autoFocus placeholder={tr(t, 'stock.searchProduct', 'Chèche non oswa kòd pwodwi a...')} value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
                {products?.length > 0 && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    {products.map((p, i) => {
                      const low = Number(p.quantity) <= Number(p.alertThreshold || 0)
                      return (
                        <div key={p.id} className="iv-opt a-slide" style={{ border: '1px solid var(--line)', borderRadius: 12, animationDelay: `${i * 30}ms` }} onClick={() => { setSelected(p); setSearch('') }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <span className="iv-thumb" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined }}>{!p.imageUrl && <Package size={15} color="#1B2A8F"/>}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                              {p.code && <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.code}</div>}
                            </div>
                          </div>
                          <span className="iv-pill" style={{ background: low ? 'var(--warnBg)' : 'var(--okBg)', color: low ? 'var(--warn)' : 'var(--ok)', textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                            {low && <AlertTriangle size={11}/>} {num(p.quantity)} {p.unit}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {debounced && !isFetching && products?.length === 0 && <p className="iv-note">Okenn pwodwi pa koresponn ak « {debounced} ».</p>}
              </div>
            )}
          </div>

          {/* Tip */}
          <div>
            <label className="iv-lbl">{tr(t, 'stock.movementType', 'Tip mouvman')}</label>
            <div className="st-types">
              {ADJ_TYPES.map(o => (
                <button key={o.v} type="button" className={`st-type ${form.type === o.v ? 'on' : ''}`} style={{ '--tc': o.color }} onClick={() => setForm(f => ({ ...f, type: o.v }))}>
                  <span className="pi">{o.icon}</span>{tr(t, o.key, o.label)}
                </button>
              ))}
            </div>
          </div>

          {/* Kantite */}
          <div>
            <label className="iv-lbl">{tr(t, 'stock.quantity', 'Kantite')}</label>
            <input ref={qtyRef} type="number" step="0.001" min="0.001" placeholder="0" className="iv-inp money big center"
              value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} onFocus={e => e.target.select()}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}/>
            <div className="iv-quick">
              {[1, 5, 10, 12, 24, 50].map(n => (
                <button key={n} type="button" onClick={() => setForm(f => ({ ...f, quantity: String(Number(f.quantity || 0) + n) }))}>+{n}</button>
              ))}
              {form.quantity && <button type="button" style={{ color: 'var(--bad)' }} onClick={() => setForm(f => ({ ...f, quantity: '' }))}>Efase</button>}
            </div>
          </div>

          {/* ✅ NOUVO — aperçu an dirèk */}
          {selected && before != null && qty > 0 && (
            <div className={`st-preview ${tooMuch ? 'bad' : ''}`} style={{ '--tc': type.color }}>
              <div className="bx"><small>Avan</small><div className="num">{num(before)}</div></div>
              <span className="arr">{type.sign > 0 ? '+' : '−'}{num(qty)} →</span>
              <div className="bx"><small>Apre</small><div className="num" style={{ color: tooMuch ? 'var(--bad)' : type.color }}>{num(after)}</div></div>
              {tooMuch && <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--bad)' }}>⚠️ Ou pa ka retire plis pase sa ki an stòk.</div>}
            </div>
          )}

          {/* Nòt */}
          <div>
            <label className="iv-lbl">{tr(t, 'stock.notes', 'Rezon / nòt')} <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>(opsyonèl)</span></label>
            <input className="iv-inp" placeholder={tr(t, 'stock.notesPlaceholder', 'Egz: livrezon founisè X')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/>
            <div className="iv-quick">
              {(REASONS[form.type] || []).map(r => (
                <button key={r} type="button" className={form.notes === r ? 'ex' : ''} onClick={() => setForm(f => ({ ...f, notes: f.notes === r ? '' : r }))}>{r}</button>
              ))}
            </div>
          </div>

          <div className="iv-sheet-f">
            <button type="button" className="iv-act" onClick={onClose} disabled={mutation.isPending}>{tr(t, 'common.cancel', 'Anile')}</button>
            {/* ✅ KORIJE — isPending (v5): bouton an bloke pandan anrejistreman an */}
            <button type="button" className="iv-btn-main" onClick={handleConfirm} disabled={mutation.isPending || tooMuch}
              style={{ background: `linear-gradient(135deg, ${type.color}, ${type.color}CC)`, boxShadow: `0 10px 24px ${type.color}55` }}>
              {mutation.isPending ? <RefreshCw size={16} className="spin"/> : <Check size={16}/>}
              {mutation.isPending ? 'Ap anrejistre...' : `${tr(t, type.key, type.label)}${qty ? ` ${num(qty)}` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Ranje mouvman
// ════════════════════════════════════════════════════════════
function MoveRow({ m, t, i, onAgain }) {
  const mv = MOVES[m.movementType] || MOVES.adjustment
  const change = Number(m.quantityChange)
  const before = Number(m.quantityBefore), after = Number(m.quantityAfter)
  const max = Math.max(before, after, 1)
  const left = (Math.min(before, after) / max) * 100
  const width = Math.max(3, (Math.abs(after - before) / max) * 100)
  const mc = change > 0 ? '#059669' : '#DC2626'

  return (
    <div className="st-row" style={{ '--mc': mv.color, '--mb': mv.bg, animationDelay: `${Math.min(i, 14) * 30}ms` }} onClick={() => onAgain(m)} title="Klike pou ajiste pwodwi sa ankò">
      <span className="st-ic">{m.product?.imageUrl
        ? <span className="iv-thumb" style={{ width: 42, height: 42, borderRadius: 13, backgroundImage: `url(${m.product.imageUrl})` }}/>
        : mv.icon}
      </span>
      <div className="st-prod">
        <div style={{ minWidth: 0 }}>
          <b>{m.product?.name || '—'}</b>
          <small>{m.product?.code || ''}</small>
        </div>
      </div>
      <span className="iv-badge t-type" style={{ background: mv.bg, color: mv.color, justifySelf: 'start' }}>{mv.icon} {tr(t, mv.key, mv.label)}</span>
      <div className="st-flow" style={{ '--mc': mc }}>
        <span>{num(before)}</span>
        <span className="bar"><i style={{ left: `${left}%`, width: `${width}%` }}/></span>
        <b>{num(after)}</b>
      </div>
      <span className={`st-chg ${change > 0 ? 'up' : 'down'}`}>{change > 0 ? '+' : ''}{num(change)}</span>
      <div className="st-who">
        {m.creator?.fullName || '—'}
        <small>{format(toHaiti(m.createdAt), 'HH:mm')} · <span className="iv-badge m-only" style={{ background: mv.bg, color: mv.color, padding: "1px 6px", fontSize: 9 }}>{tr(t, mv.key, mv.label)}</span></small>
      </div>
      <button type="button" className="iv-mini st-again" title="Ajiste ankò" onClick={(e) => { e.stopPropagation(); onAgain(m) }}><Repeat size={13}/></button>
      {m.notes && <div className="st-note">“{m.notes}”</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function StockPage() {
  const { t } = useTranslation()
  const [adjust, setAdjust]         = useState(null)   // null | { product?, type? }
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', typeFilter, page],
    queryFn: () => stockAPI.getMovements({ type: typeFilter, page, limit: 20 }).then(r => r.data),
    placeholderData: (prev) => prev,   // ✅ react-query v5
  })

  const movements = data?.movements || []

  const { ins, outs } = useMemo(() => movements.reduce((a, m) => {
    const c = Number(m.quantityChange || 0)
    if (c > 0) a.ins += c; else a.outs += Math.abs(c)
    return a
  }, { ins: 0, outs: 0 }), [movements])

  // ✅ NOUVO — gwoupe pa jou
  const groups = useMemo(() => {
    const out = []
    movements.forEach(m => {
      const label = dayLabel(m.createdAt)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(m)
      else out.push({ label, items: [m] })
    })
    return out
  }, [movements])

  // ✅ NOUVO — ekspòte paj la an CSV (Excel)
  const exportCsv = () => {
    if (!movements.length) return
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['Dat', 'Pwodwi', 'Kòd', 'Tip', 'Avan', 'Chanjman', 'Apre', 'Pa', 'Nòt']]
    movements.forEach(m => rows.push([
      format(toHaiti(m.createdAt), 'dd/MM/yyyy HH:mm'), m.product?.name, m.product?.code,
      tr(t, (MOVES[m.movementType] || MOVES.adjustment).key, (MOVES[m.movementType] || MOVES.adjustment).label),
      Number(m.quantityBefore), Number(m.quantityChange), Number(m.quantityAfter), m.creator?.fullName, m.notes,
    ]))
    const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mouvman-stok-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 3000)
  }

  const FILTERS = [{ v: '', l: tr(t, 'stock.allTypes', 'Tout'), color: '#1B2A8F' },
    ...Object.entries(MOVES).map(([k, m]) => ({ v: k, l: tr(t, m.key, m.label), color: m.color }))]

  const again = (m) => setAdjust({ product: { id: m.productId || m.product?.id, name: m.product?.name, code: m.product?.code, unit: m.product?.unit, imageUrl: m.product?.imageUrl } })

  return (
    <div className="iv" style={{ paddingBottom: 80 }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(20,184,166,.5), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#2DD4BF" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico teal"><Warehouse size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">Envantè</p>
            <h1>{tr(t, 'stock.title', 'Stòk')}</h1>
            <p className="sub">Chak antre ak sòti pwodwi — vant, acha, pèt ak ajisteman.</p>
          </div>
          <div className="pd-tools newbtn">
            <button onClick={exportCsv} disabled={!movements.length} className="iv-act" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.25)', minHeight: 46 }} title="Ekspòte paj la an CSV (Excel)">
              <Download size={15}/> CSV
            </button>
            <button onClick={() => setAdjust({})} className="iv-btn-main pulse" style={{ flex: 1 }}>
              <Plus size={17}/> {tr(t, 'stock.adjustBtn', 'Ajiste stòk')}
            </button>
          </div>
        </div>
        <div className="iv-kpis">
          <Kpi label="Mouvman"          value={data?.total || 0} icon={Layers}          delay={80}/>
          <Kpi label="Antre (paj la)"   value={ins}              icon={ArrowUpCircle}   delay={160} tone="green" prefix="+"/>
          <Kpi label="Sòti (paj la)"    value={outs}             icon={ArrowDownCircle} delay={240} tone="red" prefix="−"/>
        </div>
      </section>

      <div className="iv-bar a-up" style={{ animationDelay: '120ms' }}>
        <div className="iv-chips" style={{ width: '100%' }}>
          {FILTERS.map(opt => (
            <button key={opt.v} type="button" onClick={() => { setTypeFilter(opt.v); setPage(1) }} className={`iv-chip ${typeFilter === opt.v ? 'on' : ''}`}>
              <span className="dot" style={{ background: typeFilter === opt.v ? '#fff' : opt.color }}/>{opt.l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="st-list">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="st-row" style={{ cursor: 'default' }}>
              <div className="iv-sk" style={{ width: 42, height: 42, borderRadius: 13 }}/>
              {[70, 60, 80, 50, 60].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%` }}/>)}
            </div>
          ))}
        </div>
      ) : !movements.length ? (
        <div className="iv-table">
          <div className="iv-empty">
            <div className="art">
              <div className="paper"><i/><i/><i/><i/><i/></div>
              <div className="bubble" style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}><Warehouse size={18}/></div>
            </div>
            <h3>{tr(t, 'stock.noMovements', 'Pa gen mouvman')}</h3>
            <p>{typeFilter ? 'Pa gen mouvman pou tip sa a.' : tr(t, 'stock.clickToStart', 'Klike « Ajiste stòk » pou kòmanse.')}</p>
            {!typeFilter && <button className="iv-btn-main" onClick={() => setAdjust({})}><Plus size={16}/> Ajiste stòk</button>}
          </div>
        </div>
      ) : (
        groups.map(g => (
          <div key={g.label}>
            <div className="st-day"><b>{g.label}</b><small>{g.items.length} mouvman</small></div>
            <div className="st-list">
              {g.items.map((m, i) => <MoveRow key={m.id} m={m} t={t} i={i} onAgain={again}/>)}
            </div>
          </div>
        ))
      )}

      {data?.pages > 1 && (
        <div className="iv-pager">
          <p>{tr(t, 'stock.page', 'Paj')} <b style={{ color: 'var(--ink)' }}>{page}</b> / {data.pages} · <b style={{ color: 'var(--ink)' }}>{data.total}</b> mouvman</p>
          <div className="btns">
            <button className="iv-pg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button>
            <button className="iv-pg" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button>
          </div>
        </div>
      )}

      {adjust && <AdjustModal preset={adjust} onClose={() => setAdjust(null)}/>}
    </div>
  )
}