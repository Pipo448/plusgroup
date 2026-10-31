// src/pages/restaurant/RestaurantCounterPage.jsx
// ─── KÈS / VANN — kliyan ki vin achte devan kès la (san tab) ──────────────
//  • Griy plat ak bwason (foto, pri, estòk) separe pa kategori + rechèch
//  • Tikè: kantite, mòd (pou ale / sou plas / livrezon), non kliyan OPSYONÈL, nòt kizin
//  • Peman (kach + monnen, MonCash, NatCash, kat) → fakti + vant nan rapò + estòk bese
//  • Nimewo kòmand chak jou (#1, #2…) + tikè kizin otomatik (manje sèlman, pa bwason)
//  • Tablo « Kòmand k ap prepare »: Pare → Bay kliyan
//  • Pwoteksyon kont doub fakti: chak tikè gen yon referans; si rezo a koupe, re-peye kontinye menm vant lan
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Store, ShoppingBag, UtensilsCrossed, Bike, Trash2, CreditCard, RefreshCw, Printer, Check, ChefHat, Clock,
  ChevronRight, Receipt, Plus, StickyNote,
} from 'lucide-react'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi } from './restoApi'
import { printKitchenTicket, printCounterReceipt, tenantReceiptNote } from './restoPrint'
import PayModal from './RestoPayModal'
import {
  Stage, Layer, Hero, Btn, Badge, Chips, SearchField, DishVisual, Modal, Stepper, Seg, Field, Empty, SkeletonGrid, ThemeToggle,
  useRestoTheme, useCountUp, useDebounced, useIsMobile, money, getTenantName, cx,
} from './restoUI'

const CART_KEY = 'resto-counter-cart'
const PRINT_KEY = 'resto-counter-autoprint'
const lsGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* */ } }
const newRef = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
const MODES = [{ id: 'takeaway', icon: ShoppingBag }, { id: 'dinein', icon: UtensilsCrossed }, { id: 'delivery', icon: Bike }]
const emptyDraft = () => ({ ref: newRef(), lines: [], mode: 'takeaway', name: '', phone: '', address: '', fee: '', notes: '' })
const loadDraft = () => { try { const d = JSON.parse(lsGet(CART_KEY)); return d && Array.isArray(d.lines) ? { ...emptyDraft(), ...d } : emptyDraft() } catch { return emptyDraft() } }
const minsSince = (d) => Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000))

// ── Kat yon plat nan griy la ──────────────────────────────────────────
function ProductTile({ item, qty, onAdd, t }) {
  const out = item.quantity != null && item.quantity <= 0
  const low = !out && item.quantity != null && item.quantity <= 5
  return (
    <button type="button" className={cx('rs-pos-tile', qty > 0 && 'is-in', out && 'is-out')} onClick={() => onAdd(item)} disabled={out}
      aria-label={`${item.name} — ${money(item.priceHtg, 0)}`}>
      {qty > 0 && <span className="rs-pos-tile__qty">{qty}</span>}
      <span className="rs-pos-tile__art"><DishVisual src={item.imageUrl} name={item.name} size={64} spin={false} /></span>
      <span className="rs-pos-tile__name">{item.name}</span>
      <span className="rs-pos-tile__foot">
        <b>{money(item.priceHtg, 0)}</b>
        {out ? <Badge tone="chili">{t('counter.out')}</Badge> : low ? <small>{t('counter.low', { qty: item.quantity })}</small> : item.kind === 'drink' ? <small>🥤</small> : null}
      </span>
    </button>
  )
}

// ── Panno tikè a (dwat sou òdinatè, fenèt anba sou telefòn) ───────────
function TicketPanel({ draft, setDraft, subtotal, fee, total, onPay, onClear, canSell, inSheet, t }) {
  const count = draft.lines.reduce((s, l) => s + l.qty, 0)
  const shown = useCountUp(total, 450)
  const setQty = (id, q) => setDraft((d) => ({ ...d, lines: q <= 0 ? d.lines.filter((l) => l.id !== id) : d.lines.map((l) => (l.id === id ? { ...l, qty: q } : l)) }))
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  return (
    <div className="rs-pos-ticket">
      <div className="rs-pos-ticket__head">
        {inSheet
          ? <span>{count > 0 && <Badge tone="paprika">{t('counter.items', { count })}</Badge>}</span>
          : <h2 className="rs-card__title" style={{ margin: 0 }}><Receipt size={18} /> {t('counter.ticket')} {count > 0 && <Badge tone="paprika">{t('counter.items', { count })}</Badge>}</h2>}
        {count > 0 && <Btn variant="ghost" size="sm" icon={Trash2} onClick={onClear}>{t('counter.clear')}</Btn>}
      </div>
      <Seg block value={draft.mode} onChange={(mode) => set({ mode })} options={MODES.map((m) => ({ id: m.id, icon: m.icon, label: t(`counter.mode.${m.id}`) }))} />

      {!draft.lines.length ? (
        <div className="rs-pos-ticket__empty"><ShoppingBag size={30} /><b>{t('counter.empty')}</b><span>{t('counter.emptyText')}</span></div>
      ) : (
        <ul className="rs-lines rs-pos-lines">
          {draft.lines.map((l) => (
            <li key={l.id} className="rs-line rs-cline">
              <DishVisual src={l.imageUrl} name={l.name} size={44} spin={false} className="rs-cline__img" />
              <div className="rs-line__info rs-cline__info">
                <span className="rs-line__name">{l.name}</span>
                <span className="rs-line__sub">{money(l.unitPrice, 0)}{l.kind === 'drink' ? ' · 🥤' : ''}</span>
              </div>
              <span className="rs-cline__total">{money(l.unitPrice * l.qty, 0)}</span>
              <span className="rs-cline__step"><Stepper size="sm" value={l.qty} min={0} max={99} label={l.name} onChange={(q) => setQty(l.id, q)} /></span>
            </li>
          ))}
        </ul>
      )}

      <div className="rs-pos-ticket__fields">
        <Field label={t('counter.customer')}>
          <input className="rs-input" value={draft.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder={t('counter.customerPh')} autoComplete="off" />
        </Field>
        {draft.mode === 'delivery' && (
          <>
            <div className="rs-form-grid">
              <Field label={t('counter.phone')}><input className="rs-input" inputMode="tel" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="off" /></Field>
              <Field label={t('counter.deliveryFee')}><input className="rs-input rs-mono" type="number" min="0" inputMode="numeric" value={draft.fee} onChange={(e) => set({ fee: e.target.value })} placeholder="0" /></Field>
            </div>
            <Field label={t('counter.address')}><input className="rs-input" value={draft.address} onChange={(e) => set({ address: e.target.value })} autoComplete="off" /></Field>
          </>
        )}
        <details className="rs-pos-notes" open={!!draft.notes}>
          <summary><StickyNote size={14} /> {t('counter.notes')}</summary>
          <input className="rs-input" value={draft.notes} maxLength={300} onChange={(e) => set({ notes: e.target.value })} placeholder={t('counter.notesPh')} />
        </details>
      </div>

      <dl className="rs-totals" style={{ marginTop: 4 }}>
        <div><dt>{t('pub.cart.subtotal')}</dt><dd>{money(subtotal, 0)}</dd></div>
        {fee > 0 && <div><dt>{t('counter.deliveryFee')}</dt><dd>{money(fee, 0)}</dd></div>}
      </dl>
      <div className="rs-total" style={{ marginTop: 8 }}><span className="rs-total__label">{t('tables.order.total')}</span><span className="rs-total__val">{money(shown, 0)}</span></div>
      {canSell
        ? <Btn size="lg" block variant="success" icon={CreditCard} iconRight={ChevronRight} disabled={!draft.lines.length} onClick={onPay} className="rs-pos-pay">{t('counter.pay')} · {money(total, 0)}</Btn>
        : <p className="rs-hint" style={{ textAlign: 'center' }}>{t('counter.cashierOnly')}</p>}
    </div>
  )
}

// ── Kòmand k ap prepare ───────────────────────────────────────────────
function Queue({ tickets, onStatus, busyId, t }) {
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(id) }, [])
  if (!tickets.length) return null
  return (
    <section className="rs-pos-queue" aria-label={t('counter.queue')}>
      <h2 className="rs-pos-queue__title"><ChefHat size={16} /> {t('counter.queue')} <Badge tone="saffron">{tickets.length}</Badge></h2>
      <div className="rs-pos-queue__row">
        {tickets.map((k) => {
          const ready = k.status === 'ready'
          const Icon = MODES.find((m) => m.id === k.mode)?.icon || ShoppingBag
          return (
            <article key={k.id} className={cx('rs-pos-q', ready && 'is-ready')}>
              <div className="rs-pos-q__top">
                <span className="rs-pos-q__num">#{k.number}</span>
                <span className="rs-pos-q__meta"><Icon size={13} /> {t(`counter.mode.${k.mode}`)}<br /><Clock size={12} /> {t('counter.ago', { min: minsSince(ready ? k.readyAt || k.createdAt : k.createdAt) })}</span>
              </div>
              {k.customerName && <b className="rs-pos-q__name">{k.customerName}</b>}
              <span className="rs-pos-q__items">{k.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</span>
              {ready
                ? <>
                    <span className="rs-pos-q__call">📣 {k.customerName ? t('counter.callName', { name: k.customerName }) : t('counter.callNumber', { number: k.number })}</span>
                    <Btn size="sm" block variant="success" icon={Check} loading={busyId === k.id} onClick={() => onStatus(k, 'served')}>{t('counter.serve')}</Btn>
                  </>
                : <Btn size="sm" block icon={Check} loading={busyId === k.id} onClick={() => onStatus(k, 'ready')}>{t('counter.markReady')}</Btn>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ── Fenèt « vant anrejistre » ─────────────────────────────────────────
function DoneModal({ theme, done, onPrint, onClose, t }) {
  const [auto, setAuto] = useState(() => lsGet(PRINT_KEY) === '1')
  const toggleAuto = (v) => { setAuto(v); lsSet(PRINT_KEY, v ? '1' : null) }
  return (
    <Modal theme={theme} onClose={onClose} closeLabel={t('common.close')} title={t('counter.done')}
      footer={<>
        <Btn variant="glass" icon={Printer} onClick={onPrint}>{t('counter.printReceipt')}</Btn>
        <Btn icon={Plus} onClick={onClose} autoFocus>{t('counter.newSale')}</Btn>
      </>}>
      <div className="rs-pos-done">
        <span className="rs-label">{t('counter.number')}</span>
        <span className="rs-pos-done__num">#{done.ticket.number}</span>
        <span className="rs-pos-done__who">
          {t(`counter.mode.${done.ticket.mode}`)}{done.ticket.customerName ? ` · ${done.ticket.customerName}` : ''}
        </span>
        {done.pay.method === 'cash' && done.pay.change > 0 && (
          <div className="rs-change rs-pos-done__change"><span>{t('counter.giveChange')}</span><b>{money(done.pay.change, 0)}</b></div>
        )}
        <p className="rs-hint" style={{ margin: 0 }}>
          {done.hasFood ? <><ChefHat size={13} /> {t('counter.kitchenPrinted')}</> : <>🥤 {t('counter.drinksOnly')}</>}
        </p>
        <label className="rs-pos-auto"><input type="checkbox" checked={auto} onChange={(e) => toggleAuto(e.target.checked)} /> {t('counter.autoPrint')}</label>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════
// PAJ PRENSIPAL
// ══════════════════════════════════════════════
export default function RestaurantCounterPage() {
  const { t } = useRT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isMobile = useIsMobile(1024)
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant, user } = useAuthStore()
  const tenantName = getTenantName(tenant)
  const canSell = user?.isAdmin === true || ['admin', 'cashier'].includes(user?.role)

  const { data: catalog, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['restaurant-counter-catalog'], queryFn: restoApi.counterCatalog, staleTime: 60000 })
  const { data: tq } = useQuery({ queryKey: ['restaurant-counter-tickets'], queryFn: () => restoApi.counterTickets(), refetchInterval: 20000, enabled: canSell })
  const items = useMemo(() => catalog?.items || [], [catalog])
  const categories = useMemo(() => catalog?.categories || [], [catalog])

  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim().toLowerCase(), 120)
  const [cat, setCat] = useState('')
  const [draft, setDraft] = useState(loadDraft)
  useEffect(() => { lsSet(CART_KEY, JSON.stringify(draft)) }, [draft])
  const [sheet, setSheet] = useState(false)
  const [paying, setPaying] = useState(false)
  const [selling, setSelling] = useState(false)
  const [done, setDone] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const visible = useMemo(() => items.filter((i) => (!cat || i.categoryId === cat) && (!q || i.name.toLowerCase().includes(q))), [items, cat, q])
  const qtyOf = useMemo(() => Object.fromEntries(draft.lines.map((l) => [l.id, l.qty])), [draft.lines])
  const subtotal = draft.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const fee = draft.mode === 'delivery' ? Math.max(0, Number(draft.fee) || 0) : 0
  const total = subtotal + fee
  const count = draft.lines.reduce((s, l) => s + l.qty, 0)

  const add = (it) => {
    if (it.quantity != null && it.quantity <= 0) return
    setDraft((d) => {
      const ex = d.lines.find((l) => l.id === it.id)
      if (ex && it.quantity != null && ex.qty + 1 > it.quantity) { toast.error(t('counter.low', { qty: it.quantity })); return d }
      return { ...d, lines: ex ? d.lines.map((l) => (l.id === it.id ? { ...l, qty: l.qty + 1 } : l))
        : [...d.lines, { id: it.id, productId: it.id, name: it.name, unitPrice: Number(it.priceHtg), qty: 1, kind: it.kind, imageUrl: it.imageUrl }] }
    })
  }
  const clear = () => setDraft((d) => ({ ...emptyDraft(), mode: d.mode }))
  // Rechèch: Enter ajoute premye rezilta a
  const onSearchKey = (e) => { if (e.key === 'Enter' && visible[0]) { e.preventDefault(); add(visible[0]); setSearch('') } }

  const statusMutation = useMutation({
    mutationFn: ({ k, status }) => { setBusyId(k.id); return restoApi.updateCounterTicket(k.id, status) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-counter-tickets'] }),
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
    onSettled: () => setBusyId(null),
  })

  const receipt = (res) => printCounterReceipt({
    tenantName, number: res.ticket.number, customerName: res.ticket.customerName, mode: res.ticket.mode,
    items: res.lines.map((l) => ({ qty: l.qty, name: l.name, unitPrice: l.unitPrice })), subtotal: res.subtotal, discountPct: res.pay.discountPct,
    deliveryFee: res.fee, total: res.pay.total, method: res.pay.method, given: res.pay.given, change: res.pay.change,
    cashier: user?.fullName || user?.name, note: tenantReceiptNote(tenant),
  })

  // Vann: 1) fakti (yon sèl fwa)  2) tikè + nimewo  3) vant nan rapò  4) tikè kizin
  const sell = async (pay) => {
    if (selling) return
    setSelling(true)
    const d = draft
    const invKey = `resto-counter-inv-${d.ref}`
    const name = d.name.trim()
    const modeLabel = t(`counter.mode.${d.mode}`)
    try {
      let invoiceId = lsGet(invKey)
      if (invoiceId) toast(t('counter.resume'))
      else {
        const lines = d.lines.map((l) => {
          const gross = l.qty * l.unitPrice
          return { description: l.name, productId: l.productId, quantity: l.qty, unitPriceHtg: l.unitPrice, unitPriceUsd: 0, discountPct: pay.discountPct,
            totalHtg: Math.round(gross * (1 - pay.discountPct / 100) * 100) / 100, totalUsd: 0 }
        })
        if (fee > 0) lines.push({ description: t('counter.deliveryFee'), quantity: 1, unitPriceHtg: fee, unitPriceUsd: 0, discountPct: 0, totalHtg: fee, totalUsd: 0 })
        const res = await invoiceAPI.createDirect({
          items: lines,
          payment: { method: pay.method, amountHtg: pay.total, amountUsd: 0, amountGiven: pay.given, change: pay.change },
          notes: [t('counter.title'), modeLabel, name || t('counter.walkin'), d.mode === 'delivery' ? [d.phone, d.address].filter(Boolean).join(' · ') : '', d.notes].filter(Boolean).join(' — '),
        })
        invoiceId = res.data?.invoice?.id || 'ok'
        lsSet(invKey, invoiceId)
      }
      const realInvoice = invoiceId === 'ok' ? null : invoiceId
      const ticket = await restoApi.createCounterTicket({
        clientRef: d.ref, customerName: name, customerPhone: d.phone, address: d.address, mode: d.mode, notes: d.notes,
        items: d.lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice })),
        totalHtg: pay.total, invoiceId: realInvoice,
      })
      await restoApi.recordSale({
        source: 'counter', refId: ticket.id, refLabel: `#${ticket.number}${name ? ` · ${name}` : ''} · ${modeLabel}`, invoiceId: realInvoice,
        items: d.lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice })),
        discountPct: pay.discountPct, deliveryFee: fee, paymentMethod: pay.method, amountGiven: pay.given, change: pay.change,
      }).catch(() => { /* rapò a pa dwe bloke vant lan */ })
      const food = d.lines.filter((l) => l.kind !== 'drink')
      if (food.length) {
        printKitchenTicket({ tenantName, title: `#${ticket.number} · ${modeLabel.toUpperCase()}`, subtitle: name || undefined, notes: d.notes || undefined,
          items: food.map((l) => ({ qty: l.qty, name: l.name })) })
      }
      const result = { ticket, pay, lines: d.lines, subtotal: d.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), fee, hasFood: food.length > 0 }
      if (lsGet(PRINT_KEY) === '1') setTimeout(() => receipt(result), food.length ? 900 : 0)
      lsSet(invKey, null)
      setDraft((x) => ({ ...emptyDraft(), mode: x.mode }))
      setPaying(false); setSheet(false)
      setDone(result)
      qc.invalidateQueries({ queryKey: ['restaurant-counter-tickets'] })
      qc.invalidateQueries({ queryKey: ['restaurant-counter-catalog'] })
      qc.invalidateQueries({ queryKey: ['restaurant-dashboard'] })
    } catch (e) {
      toast.error(e.response?.data?.message || t('counter.error'))
    } finally { setSelling(false) }
  }

  const tickets = tq?.tickets || []
  const today = tq?.today

  const panel = (inSheet) => (
    <TicketPanel inSheet={inSheet} draft={draft} setDraft={setDraft} subtotal={subtotal} fee={fee} total={total} canSell={canSell} t={t}
      onClear={clear} onPay={() => (draft.lines.length ? setPaying(true) : null)} />
  )

  return (
    <Stage theme={theme} className="rs-page rs-pos-page">
      <div className="rs-wrap">
        <Hero overline={tenantName} title={t('counter.title')} subtitle={!isMobile ? t('counter.subtitle') : null} icon={Store}
          onBack={() => navigate(-1)} backLabel={t('common.back')}
          actions={<>
            {today && today.count > 0 && <Badge tone="basil" icon={Check}>{t('counter.todayCount', { count: today.count, total: money(today.total, 0) })}</Badge>}
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn variant="glass" icon={RefreshCw} onClick={() => refetch()} disabled={isRefetching} className={isRefetching ? 'rs-spinning' : undefined} aria-label={t('common.refresh')} />
          </>} />

        <Queue tickets={tickets} busyId={busyId} t={t} onStatus={(k, status) => statusMutation.mutate({ k, status })} />

        <div className="rs-pos">
          <section className="rs-pos-catalog">
            <div className="rs-pos-tools" onKeyDown={onSearchKey}>
              <SearchField value={search} onChange={setSearch} hints={[t('counter.search')]} autoFocus={!isMobile} />
              {categories.length > 0 && (
                <Chips value={cat} onChange={setCat} items={[{ id: '', label: t('counter.all') }, ...categories.map((c) => ({ id: c.id, label: `${c.kind === 'drink' ? '🥤 ' : ''}${c.name}` }))]} />
              )}
            </div>
            {isLoading ? <SkeletonGrid count={12} height={170} className="rs-pos-grid" /> : !visible.length ? (
              <Empty icon={UtensilsCrossed} title={t('menu.emptySearch')} />
            ) : (
              <div className="rs-pos-grid">
                {visible.map((it) => <ProductTile key={it.id} item={it} qty={qtyOf[it.id] || 0} onAdd={add} t={t} />)}
              </div>
            )}
            {!isMobile && <p className="rs-hint" style={{ marginTop: 14 }}>{t('counter.tip')}</p>}
          </section>
          {!isMobile && <aside className="rs-pos-side rs-glass">{panel(false)}</aside>}
        </div>
      </div>

      {/* Telefòn / tablèt: ba tikè anba ekran an */}
      {/* Layer → rann nan <body>: `position: fixed` pa kase anndan paj ki gen animasyon transform */}
      {isMobile && count > 0 && !sheet && (
        <Layer theme={theme}>
          <div className="rs-pos-bar">
            <Btn size="lg" block icon={Receipt} iconRight={ChevronRight} onClick={() => setSheet(true)}>
              {t('counter.viewTicket')} · {t('counter.items', { count })} · {money(total, 0)}
            </Btn>
          </div>
        </Layer>
      )}
      {isMobile && sheet && (
        <Modal theme={theme} onClose={() => setSheet(false)} closeLabel={t('common.close')} title={t('counter.ticket')} size="lg">{panel(true)}</Modal>
      )}

      {paying && (
        <PayModal theme={theme} subtotal={subtotal} extra={fee} loading={selling} t={t} title={t('counter.payTitle')} confirmLabel={t('counter.confirm')}
          onConfirm={sell} onClose={() => (selling ? null : setPaying(false))} />
      )}
      {done && (
        <DoneModal theme={theme} done={done} t={t} onPrint={() => receipt(done)} onClose={() => setDone(null)} />
      )}
    </Stage>
  )
}
