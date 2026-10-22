// src/pages/restaurant/RestaurantTablesPage.jsx
// ─── Tab ak kòmand sou plas (staff) — design Plus Resto ───────────────
// Amelyorasyon sou lojik ansyen an:
//  • Plat menm jan yo gwoupe ak yon stepper (+/−) olye de liy doub
//  • Plat ki deja nan kizin pwoteje: konfimasyon anvan w retire yo
//  • Tikè kizin enprime otomatikman lè w voye; adisyon pou kliyan an
//  • Fenèt peman: metòd, rabè, kòb kliyan bay ak monnen
//  • Pwoteksyon kont fakti doub si fèmen tab la echwe apre fakti a kreye
//  • Tab ki gen rezèvasyon nan 3 pwochen èdtan yo make "Rezève"
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Send, CreditCard, Trash2, Users, UtensilsCrossed, RefreshCw, Armchair, Wallet, CalendarCheck, Ban,
  Check, Printer, Receipt, Banknote, Smartphone, Clock,
} from 'lucide-react'
import { restaurantTablesAPI, productAPI, invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi } from './restoApi'
import { printKitchenTicket, printBill, tenantReceiptNote } from './restoPrint'
import {
  Stage, Hero, Stats, Stat, Btn, Badge, Chips, SearchField, DishVisual, TableArt, Modal, ConfirmModal, Stepper,
  Field, Empty, SkeletonGrid, ThemeToggle, useRestoTheme, useTilt, useCountUp, useDebounced, useIsMobile,
  money, getTenantName, hhmm, haitiToday, cx,
} from './restoUI'

const lineTotal = (it) => Number(it.quantity) * Number(it.unitPriceHtg)
const orderTotal = (o) => (o?.items || []).reduce((acc, it) => acc + lineTotal(it), 0)
const lsGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* */ } }

// Gwoupe liy yo: menm plat + menm pri + menm estati kizin = yon sèl liy ak kantite total
function groupItems(items = []) {
  const map = new Map()
  items.forEach((it) => {
    const sent = it.kitchenStatus === 'voye'
    const key = `${it.productId || it.description}|${Number(it.unitPriceHtg)}|${sent ? 's' : 'p'}`
    const g = map.get(key) || { key, productId: it.productId, name: it.description, unitPrice: Number(it.unitPriceHtg), sent, qty: 0, lines: [] }
    g.qty += Number(it.quantity); g.lines.push(it); map.set(key, g)
  })
  return [...map.values()].sort((a, b) => Number(a.sent) - Number(b.sent))
}

// ── Kat tab ───────────────────────────────────────────────────────────
function TableCard({ table, reservation, index, onClick, t }) {
  const tilt = useTilt(10, 12)
  const order = table.kòmandAktif
  const busy = !!order
  const reserved = !busy && !!reservation
  const total = busy ? orderTotal(order) : 0
  const used = busy ? Math.min(Number(table.seats) || 0, Math.max(1, groupItems(order.items).length)) : 0
  return (
    <button type="button" ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} onClick={() => onClick(table)}
      className={cx('rs-table', busy ? 'is-busy' : reserved ? 'is-reserved' : 'is-free')} style={{ '--delay': `${Math.min(index, 16) * 45}ms` }}>
      <div className="rs-table__inner">
        <span className="rs-table__glare" aria-hidden="true" />
        <div className="rs-table__head">
          <div style={{ minWidth: 0 }}>
            <p className="rs-table__name">{table.name}</p>
            {table.zone && <p className="rs-table__zone">{table.zone}</p>}
          </div>
          {busy ? <Badge tone="paprika" dot pulse>{t('tables.busy')}</Badge>
            : reserved ? <Badge tone="saffron" icon={Clock}>{reservation.time}</Badge>
              : <Badge tone="basil" dot>{t('tables.free')}</Badge>}
        </div>
        <div className="rs-table__art"><TableArt seats={table.seats} busy={busy} usedSeats={used} /></div>
        <div className="rs-table__foot">
          <span className="rs-table__seats"><Users size={13} /> {t('tables.seats', { count: table.seats })}</span>
          {busy && <span className="rs-price rs-price--sm">{money(total, 0)}</span>}
          {reserved && <span className="rs-table__seats" title={reservation.customerName}>{t('tables.reservedAt', { time: reservation.time })}</span>}
        </div>
      </div>
    </button>
  )
}

// ── Modal nouvo tab ───────────────────────────────────────────────────
function NewTableModal({ theme, onClose, onSaved, t }) {
  const [name, setName] = useState('')
  const [zone, setZone] = useState('')
  const [seats, setSeats] = useState(4)
  const mutation = useMutation({
    mutationFn: () => restaurantTablesAPI.createTable({ name: name.trim(), zone: zone.trim(), seats: Number(seats) || 1 }),
    onSuccess: () => { toast.success(t('tables.modal.added')); onSaved() },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })
  const submit = (e) => { e?.preventDefault(); name.trim() ? mutation.mutate() : toast.error(t('tables.modal.nameRequired')) }
  return (
    <Modal theme={theme} title={t('tables.modal.title')} onClose={onClose} closeLabel={t('common.close')}
      footer={<><Btn variant="glass" onClick={onClose}>{t('common.cancel')}</Btn><Btn icon={Plus} loading={mutation.isPending} onClick={submit}>{t('tables.modal.add')}</Btn></>}>
      <form className="rs-form" onSubmit={submit}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ width: 150 }}><TableArt seats={seats} /></div></div>
        <Field label={t('tables.modal.name')}><input className="rs-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tables.modal.namePh')} /></Field>
        <div className="rs-form-grid">
          <Field label={`${t('tables.modal.zone')} (${t('common.optional')})`}><input className="rs-input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder={t('tables.modal.zonePh')} /></Field>
          <Field label={t('tables.modal.seats')}><div><Stepper value={Number(seats) || 1} min={1} max={30} onChange={setSeats} /></div></Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

// ── Fenèt peman ───────────────────────────────────────────────────────
const METHODS = [
  { id: 'cash', icon: Banknote }, { id: 'moncash', icon: Smartphone }, { id: 'natcash', icon: Smartphone }, { id: 'card', icon: CreditCard },
]
function PayModal({ theme, subtotal, loading, onConfirm, onClose, t }) {
  const [method, setMethod] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const [given, setGiven] = useState('')
  const d = Math.min(100, Math.max(0, Number(discount) || 0))
  const total = Math.round((subtotal * (1 - d / 100)) * 100) / 100
  const givenN = method === 'cash' ? (given === '' ? total : Number(given) || 0) : total
  const diff = givenN - total
  const shownTotal = useCountUp(total, 400)
  const quick = [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000])].filter((v) => v >= total).slice(0, 4)
  return (
    <Modal theme={theme} title={t('tables.order.pay.title')} onClose={onClose} closeLabel={t('common.close')}
      footer={<><Btn variant="glass" onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn variant="success" icon={Check} loading={loading} disabled={diff < 0}
          onClick={() => onConfirm({ method, discountPct: d, total, given: givenN, change: Math.max(0, diff) })}>{t('tables.order.pay.confirm')}</Btn></>}>
      <div className="rs-form">
        <Field label={t('tables.order.pay.method')}>
          <div className="rs-pay-grid">
            {METHODS.map((m) => (
              <button key={m.id} type="button" className={cx('rs-pay-opt', method === m.id && 'is-active')} onClick={() => setMethod(m.id)}>
                <m.icon size={20} /> {t(`tables.order.pay.${m.id}`)}
              </button>
            ))}
          </div>
        </Field>
        <div className="rs-form-grid">
          <Field label={t('tables.order.pay.discount')}><input type="number" min="0" max="100" className="rs-input rs-mono" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          {method === 'cash' && <Field label={t('tables.order.pay.given')}><input type="number" min="0" className="rs-input rs-mono" placeholder={String(total)} value={given} onChange={(e) => setGiven(e.target.value)} autoFocus /></Field>}
        </div>
        {method === 'cash' && (
          <div className="rs-quick">
            {quick.map((v, i) => <button key={v} type="button" onClick={() => setGiven(String(v))}>{i === 0 ? t('tables.order.pay.exact') : money(v, 0)}</button>)}
          </div>
        )}
        <dl className="rs-totals" style={{ marginTop: 0 }}>
          <div><dt>{t('tables.order.pay.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
          {d > 0 && <div><dt>{t('tables.order.pay.discount')}</dt><dd>-{money(subtotal - total)}</dd></div>}
        </dl>
        <div className="rs-total" style={{ marginTop: 0 }}><span className="rs-total__label">{t('tables.order.total')}</span><span className="rs-total__val">{money(shownTotal)}</span></div>
        {method === 'cash' && (
          <div className={cx('rs-change', diff < 0 && 'is-short')}>
            <span>{diff < 0 ? t('tables.order.pay.short') : t('tables.order.pay.change')}</span><b>{money(Math.abs(diff))}</b>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Panno kòmand (tab louvri) ─────────────────────────────────────────
function OrderPanel({ order: initialOrder, theme, tenant, onClose, t }) {
  const qc = useQueryClient()
  const tenantName = getTenantName(tenant)
  const [order, setOrder] = useState(initialOrder)
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 250)
  const [showResults, setShowResults] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'cancel' | {type:'removeSent', group}
  const [paying, setPaying] = useState(false)
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data: productsData } = useQuery({
    queryKey: ['restaurant-menu-search', debounced],
    queryFn: () => productAPI.getAll({ module: 'restaurant', search: debounced, limit: 10 }),
    enabled: debounced.length >= 1,
  })
  const products = productsData?.data?.products || []

  const apply = (res) => { if (res?.data?.order) setOrder(res.data.order); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) }
  const onErr = (e) => toast.error(e.response?.data?.message || t('common.error'))
  // Tout chanjman pase youn apre lòt pou evite kondisyon kous
  const run = async (fn) => { if (busy) return; setBusy(true); try { await fn() } catch (e) { onErr(e) } finally { setBusy(false) } }

  const addUnit = (p, qty = 1) => run(async () => {
    apply(await restaurantTablesAPI.addItems(order.id, [{ productId: p.productId ?? p.id, description: p.name, quantity: qty, unitPriceHtg: Number(p.unitPrice ?? p.priceHtg ?? 0) }]))
    setSearch(''); setShowResults(false)
  })
  // Retire 1 inite nan yon gwoup (liy ki poko voye)
  const removeUnit = (g) => run(async () => {
    const last = g.lines[g.lines.length - 1]
    let res = await restaurantTablesAPI.removeItem(order.id, last.id)
    if (Number(last.quantity) > 1) res = await restaurantTablesAPI.addItems(order.id, [{ productId: last.productId, description: last.description, quantity: Number(last.quantity) - 1, unitPriceHtg: Number(last.unitPriceHtg) }])
    apply(res)
  })
  const removeGroup = (g) => run(async () => {
    let res
    for (const l of g.lines) res = await restaurantTablesAPI.removeItem(order.id, l.id)
    apply(res); setConfirm(null)
  })

  const groups = useMemo(() => groupItems(order.items), [order.items])
  const pendingGroups = groups.filter((g) => !g.sent)
  const total = orderTotal(order)
  const shownTotal = useCountUp(total, 600)
  const title = order.table?.name || ''

  const kitchenMutation = useMutation({
    mutationFn: () => restaurantTablesAPI.sendToKitchen(order.id),
    onSuccess: (res) => {
      printKitchenTicket({ tenantName, title, subtitle: order.table?.zone, items: pendingGroups.map((g) => ({ qty: g.qty, name: g.name })) })
      apply(res); toast.success(t('tables.order.sentToast'))
    },
    onError: onErr,
  })
  const cancelMutation = useMutation({
    mutationFn: () => restaurantTablesAPI.cancelOrder(order.id),
    onSuccess: () => { toast.success(t('tables.order.cancelledToast')); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }); onClose() },
    onError: onErr,
  })

  const billPrint = () => printBill({
    tenantName, title, subtitle: order.table?.zone, items: groups.map((g) => ({ qty: g.qty, name: g.name, unitPrice: g.unitPrice })),
    subtotal: total, total, note: tenantReceiptNote(tenant),
  })

  // Fèmen tab: 1) fakti (yon sèl fwa)  2) fèmen kòmand lan
  const closeTable = async ({ method, discountPct, total: payTotal, given, change }) => {
    setClosing(true)
    const key = `resto-close-${order.id}`
    try {
      let invoiceId = lsGet(key)
      if (invoiceId) toast(t('tables.order.resumeClose'))
      else {
        const invoiceRes = await invoiceAPI.createDirect({
          items: (order.items || []).map((it) => {
            const gross = lineTotal(it)
            return {
              description: it.description, productId: it.productId,
              quantity: Number(it.quantity), unitPriceHtg: Number(it.unitPriceHtg),
              unitPriceUsd: 0, discountPct, totalHtg: Math.round(gross * (1 - discountPct / 100) * 100) / 100, totalUsd: 0,
            }
          }),
          payment: { method, amountHtg: payTotal, amountUsd: 0, amountGiven: given, change },
          notes: `Tab: ${title}`,
        })
        invoiceId = invoiceRes.data?.invoice?.id || 'ok'
        lsSet(key, invoiceId)
      }
      await restaurantTablesAPI.closeOrder(order.id, invoiceId === 'ok' ? undefined : invoiceId)
      lsSet(key, null)
      toast.success(t('tables.order.closedToast'))
      qc.invalidateQueries({ queryKey: ['restaurant-tables'] })
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || t('tables.order.closeError'))
    } finally {
      setClosing(false); setPaying(false)
    }
  }

  return (
    <Modal theme={theme} size="lg" onClose={onClose} closeLabel={t('common.close')} title={title}
      subtitle={[order.table?.zone, order.createdAt && t('tables.order.openedAt', { time: hhmm(order.createdAt) })].filter(Boolean).join(' · ')}
      footer={<>
        <Btn variant="danger" icon={Ban} onClick={() => setConfirm('cancel')} aria-label={t('tables.order.cancel')}>{t('tables.order.cancel')}</Btn>
        <Btn variant="glass" icon={Receipt} onClick={billPrint} disabled={!groups.length}>{t('tables.order.printBill')}</Btn>
        <Btn variant="glass" icon={Send} disabled={!pendingGroups.length || busy} loading={kitchenMutation.isPending} onClick={() => kitchenMutation.mutate()}>{t('tables.order.sendKitchen')}</Btn>
        <Btn variant="success" icon={CreditCard} loading={closing} disabled={busy} onClick={() => (groups.length ? setPaying(true) : toast.error(t('tables.order.needItem')))}>{t('tables.order.close')}</Btn>
      </>}>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <SearchField value={search} onChange={(v) => { setSearch(v); setShowResults(true) }} hints={[t('tables.order.searchPh')]}
          onFocus={() => setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 180)} />
        {showResults && products.length > 0 && (
          <div className="rs-results" role="listbox">
            {products.map((p) => {
              const out = Number(p.quantity) <= 0
              return (
                <button key={p.id} type="button" className="rs-result" onMouseDown={(e) => e.preventDefault()} onClick={() => addUnit(p)} disabled={busy || out} style={out ? { opacity: 0.5 } : undefined}>
                  <DishVisual src={p.imageUrl} name={p.name} size={38} spin={false} />
                  <span className="rs-result__name">{p.name}</span>
                  {out ? <Badge tone="chili">{t('menu.out')}</Badge> : <span className="rs-price rs-price--sm">{money(p.priceHtg, 0)}</span>}
                  <Plus size={16} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!groups.length ? (
        <div style={{ textAlign: 'center', padding: '26px 0 10px' }}>
          <div style={{ display: 'inline-block', width: 150 }}><TableArt seats={order.table?.seats || 4} /></div>
          <p className="rs-h2" style={{ marginTop: 8 }}>{t('tables.order.empty')}</p>
          <p className="rs-hint">{t('tables.order.emptyText')}</p>
        </div>
      ) : (
        <ul className="rs-lines" style={busy ? { opacity: 0.7, pointerEvents: 'none' } : undefined}>
          {groups.map((g, i) => (
            <li key={g.key} className="rs-line" style={{ '--d': `${Math.min(i, 10) * 40}ms` }}>
              <DishVisual name={g.name} size={42} spin={false} />
              <div className="rs-line__info">
                <span className="rs-line__name">{g.name}</span>
                <span className="rs-line__sub">
                  {g.sent ? <Badge tone="basil" icon={Check}>{t('tables.order.sent')}</Badge> : <Badge tone="saffron" dot pulse>{t('tables.order.pending')}</Badge>}
                  {money(g.unitPrice, 0)}
                </span>
              </div>
              {g.sent ? (
                <span className="rs-group-qty">
                  <b className="rs-mono">× {g.qty}</b>
                  <button type="button" className="rs-icon-btn" onClick={() => addUnit(g)} aria-label={t('common.add')}><Plus size={14} /></button>
                  <button type="button" className="rs-icon-btn rs-icon-btn--danger" onClick={() => setConfirm({ type: 'removeSent', group: g })} aria-label={t('common.delete')}><Trash2 size={14} /></button>
                </span>
              ) : (
                <Stepper size="sm" value={g.qty} min={0} max={99} label={g.name}
                  onChange={(n) => (n > g.qty ? addUnit(g) : removeUnit(g))} />
              )}
              <span className="rs-line__amt">{money(g.qty * g.unitPrice, 0)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="rs-total">
        <span className="rs-total__label">{t('tables.order.total')}</span>
        <span className="rs-total__val">{money(shownTotal)}</span>
      </div>
      {pendingGroups.length > 0 && groups.some((g) => g.sent) && (
        <p className="rs-hint" style={{ margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}><Printer size={13} /> {t('tables.order.printKitchen')}: {pendingGroups.reduce((s, g) => s + g.qty, 0)}</p>
      )}

      <ConfirmModal open={confirm === 'cancel'} theme={theme} title={t('tables.order.cancelTitle')} text={t('tables.order.cancelText')}
        confirmLabel={t('tables.order.cancel')} cancelLabel={t('common.no')} loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()} onClose={() => setConfirm(null)} />
      <ConfirmModal open={confirm?.type === 'removeSent'} theme={theme} title={t('tables.order.removeSentTitle')} text={t('tables.order.removeSentText')}
        confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} loading={busy}
        onConfirm={() => removeGroup(confirm.group)} onClose={() => setConfirm(null)} />
      {paying && <PayModal theme={theme} subtotal={total} loading={closing} t={t} onConfirm={closeTable} onClose={() => setPaying(false)} />}
    </Modal>
  )
}

// ══════════════════════════════════════════════
// PAJ PRENSIPAL
// ══════════════════════════════════════════════
export default function RestaurantTablesPage() {
  const { t } = useRT()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant } = useAuthStore()
  const tenantName = getTenantName(tenant)
  const qc = useQueryClient()

  const [modal, setModal] = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const [zone, setZone] = useState('')

  // 45s pou ekonomize trafik (egress Supabase) + bouton Rafrechi manyèl
  const { data: tablesData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-tables'], queryFn: () => restaurantTablesAPI.getTables(), refetchInterval: 45000,
  })
  const tables = useMemo(() => tablesData?.data?.tables || [], [tablesData])
  const today = haitiToday()
  const { data: resvToday = [] } = useQuery({
    queryKey: ['restaurant-reservations-day', today], queryFn: () => restoApi.reservations({ date: today }), staleTime: 60000, retry: false,
  })

  // Pwochen rezèvasyon (≤ 3è) pou chak tab
  const upcoming = useMemo(() => {
    const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes()
    const map = {}
    resvToday.filter((r) => r.tableId && ['an_atant', 'konfime'].includes(r.status)).forEach((r) => {
      const [h, m] = r.time.split(':').map(Number); const at = h * 60 + m
      if (at >= mins - 30 && at <= mins + 180 && (!map[r.tableId] || map[r.tableId].time > r.time)) map[r.tableId] = r
    })
    return map
  }, [resvToday])

  const zones = useMemo(() => [...new Set(tables.map((x) => x.zone).filter(Boolean))], [tables])
  const visible = zone ? tables.filter((x) => x.zone === zone) : tables
  const busyCount = tables.filter((x) => x.kòmandAktif).length
  const openTotal = tables.reduce((s, x) => s + (x.kòmandAktif ? orderTotal(x.kòmandAktif) : 0), 0)
  const resvCount = resvToday.filter((r) => !['anile', 'pa_vini'].includes(r.status)).length

  const openMutation = useMutation({
    mutationFn: (tableId) => restaurantTablesAPI.openOrder(tableId),
    onSuccess: (res) => { setActiveOrder(res.data.order); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })
  const handleTableClick = (tb) => {
    if (tb.kòmandAktif) { setActiveOrder({ ...tb.kòmandAktif, table: tb.kòmandAktif.table || tb }); return }
    openMutation.mutate(tb.id)
  }

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap">
        <Hero overline={tenantName} title={t('tables.title')} subtitle={!isMobile ? t('tables.subtitle') : null} icon={UtensilsCrossed}
          onBack={() => navigate(-1)} backLabel={t('common.back')}
          actions={<>
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn variant="glass" icon={RefreshCw} onClick={() => refetch()} disabled={isRefetching} className={isRefetching ? 'rs-spinning' : undefined} aria-label={t('common.refresh')} />
            <Btn icon={Plus} onClick={() => setModal('new')} aria-label={t('tables.newTable')}>{isMobile ? null : t('tables.newTable')}</Btn>
          </>}>
          <Stats>
            <Stat index={0} icon={Armchair} tone="basil" label={t('tables.stats.free')} value={tables.length - busyCount} />
            <Stat index={1} icon={UtensilsCrossed} tone="paprika" label={t('tables.stats.busy')} value={busyCount} />
            <Stat index={2} icon={Wallet} tone="saffron" label={t('tables.stats.openTotal')} value={money(openTotal, 0)} />
            <Stat index={3} icon={CalendarCheck} tone="sky" label={t('tables.stats.resv')} value={resvCount} />
          </Stats>
        </Hero>

        {zones.length > 0 && (
          <div className="rs-toolbar">
            <Chips items={[{ id: '', label: t('tables.allZones') }, ...zones.map((z) => ({ id: z, label: z, count: tables.filter((x) => x.zone === z).length }))]}
              value={zone} onChange={setZone} />
          </div>
        )}

        {isLoading ? <SkeletonGrid count={8} height={210} className="rs-tables" /> : !tables.length ? (
          <Empty icon={Armchair} title={t('tables.empty')} text={t('tables.emptyText')}
            action={<Btn icon={Plus} onClick={() => setModal('new')}>{t('tables.createFirst')}</Btn>} />
        ) : (
          <div className="rs-tables">
            {visible.map((tb, i) => <TableCard key={tb.id} table={tb} reservation={upcoming[tb.id]} index={i} t={t} onClick={handleTableClick} />)}
          </div>
        )}
      </div>

      {modal === 'new' && (
        <NewTableModal theme={theme} t={t} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); qc.invalidateQueries({ queryKey: ['restaurant-tables'] }) }} />
      )}
      {activeOrder && <OrderPanel key={activeOrder.id} order={activeOrder} tenant={tenant} theme={theme} t={t} onClose={() => setActiveOrder(null)} />}
    </Stage>
  )
}
