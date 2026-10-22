// src/pages/restaurant/RestaurantOnlineOrdersPage.jsx
// ─── Kòmand an liy kliyan yo fè sou pòtal la (staff) ──────────────────
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ShoppingBag, Bike, Store, Clock, Phone, MessageCircle, MapPin, ChefHat, CheckCircle2, Receipt,
  RefreshCw, Ban, Settings2, Bell, BellOff, StickyNote, ArrowRight, Wallet, Printer, Send,
} from 'lucide-react'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi, RESTO_PATHS, trackUrl, waLink, waNumber } from './restoApi'
import { printKitchenTicket } from './restoPrint'
import {
  Stage, Hero, Stats, Stat, Btn, Badge, Seg, Modal, ConfirmModal, Empty, SkeletonGrid, ThemeToggle,
  DishVisual, RatingStars, useRestoTheme, money, getTenantName, timeAgo, hhmm, cx,
} from './restoUI'

const NEXT = {
  nouvo: 'konfime',
  konfime: 'nan_kizin',
  nan_kizin: 'pare',
  pare: (o) => (o.mode === 'delivery' ? 'sou_wout' : 'livre'),
  sou_wout: 'livre',
}
const nextOf = (o) => { const n = NEXT[o.status]; return typeof n === 'function' ? n(o) : n }
const STATUS_TONE = { nouvo: 'paprika', konfime: 'sky', nan_kizin: 'saffron', pare: 'basil', sou_wout: 'sky', livre: 'basil', anile: 'chili' }
const NEXT_ICON = { konfime: CheckCircle2, nan_kizin: ChefHat, pare: CheckCircle2, sou_wout: Bike, livre: ShoppingBag }
const isToday = (d) => new Date(d).toDateString() === new Date().toDateString()

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.18].forEach((delay) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.16)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.18)
    })
    setTimeout(() => ctx.close(), 600)
  } catch { /* pa gen son */ }
}

function OrderCard({ order, index, onOpen, t }) {
  const ModeIcon = order.mode === 'delivery' ? Bike : Store
  return (
    <button type="button" className={cx('rs-order', order.status === 'nouvo' && 'is-new')} style={{ '--delay': `${Math.min(index, 10) * 50}ms` }} onClick={() => onOpen(order)}>
      <div className="rs-order__top">
        <span className="rs-order__code">{order.code}</span>
        <span className="rs-order__time"><Clock size={12} /> {timeAgo(t, order.createdAt)}</span>
      </div>
      <div className="rs-order__who">{order.customerName}</div>
      <div className="rs-order__items">{order.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</div>
      <div className="rs-order__foot">
        <span className="rs-row" style={{ gap: 6 }}>
          <Badge tone="neutral" icon={ModeIcon}>{t(`orders.mode.${order.mode}`)}</Badge>
          <Badge tone={STATUS_TONE[order.status]} dot pulse={order.status === 'nouvo'}>{t(`orders.status.${order.status}`)}</Badge>
        </span>
        <span className="rs-price rs-price--sm">{money(order.totalHtg, 0)}</span>
      </div>
      {order.rating ? <RatingStars value={order.rating} size={13} showValue={false} /> : null}
    </button>
  )
}

function OrderDetail({ order, theme, slug, tenantName, onClose, onChanged, t }) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [invoicing, setInvoicing] = useState(false)
  const next = nextOf(order)
  const last4 = String(order.customerPhone || '').replace(/\D/g, '').slice(-4)
  const link = slug ? trackUrl(slug, order.code, last4) : ''
  const waText = t(`orders.wa.${order.status}`, { name: order.customerName.split(' ')[0], code: order.code, resto: tenantName, link })
  const kitchenPrint = () => printKitchenTicket({
    tenantName, title: `${order.code} · ${order.customerName}`, subtitle: t(`orders.mode.${order.mode}`),
    items: order.items.map((i) => ({ qty: i.qty, name: i.name, note: i.note })), notes: order.notes,
  })

  const statusMutation = useMutation({
    mutationFn: async (status) => {
      // Livre → fakti otomatik (kliyan an peye lè l resevwa kòmand lan)
      if (status === 'livre' && !order.invoiceId) await createInvoice(true)
      const res = await restoApi.setOrderStatus(order.id, status)
      if (status === 'nan_kizin') kitchenPrint()
      return res
    },
    onSuccess: (res) => { toast.success(t('orders.updated')); onChanged(res.order); setConfirmCancel(false) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const createInvoice = async (silentThrow) => {
    setInvoicing(true)
    try {
      const lines = order.items.map((it) => ({
        description: it.name, productId: it.productId, quantity: Number(it.qty), unitPriceHtg: Number(it.unitPriceHtg),
        unitPriceUsd: 0, discountPct: 0, totalHtg: Number(it.qty) * Number(it.unitPriceHtg), totalUsd: 0,
      }))
      if (order.deliveryFeeHtg > 0) lines.push({ description: t('orders.deliveryFee'), quantity: 1, unitPriceHtg: order.deliveryFeeHtg, unitPriceUsd: 0, discountPct: 0, totalHtg: order.deliveryFeeHtg, totalUsd: 0 })
      const res = await invoiceAPI.createDirect({
        items: lines,
        payment: { method: order.paymentMethod || 'cash', amountHtg: order.totalHtg, amountUsd: 0, amountGiven: order.totalHtg, change: 0 },
        notes: `Kòmand an liy ${order.code} — ${order.customerName} ${order.customerPhone}`,
      })
      const r = await restoApi.linkOrderInvoice(order.id, res.data?.invoice?.id)
      toast.success(t('orders.invoiceCreated', { code: order.code }))
      if (!silentThrow) onChanged(r.order)
    } catch (e) {
      toast.error(e.response?.data?.message || t('orders.invoiceError'))
      if (silentThrow) throw e
    } finally { setInvoicing(false) }
  }

  const final = ['livre', 'anile'].includes(order.status)
  const nextLabel = next === 'livre' && order.mode === 'pickup' ? t('orders.actions.livrePickup') : next ? t(`orders.actions.${next}`) : null
  const NextIcon = NEXT_ICON[next] || ArrowRight

  return (
    <Modal theme={theme} size="lg" onClose={onClose} closeLabel={t('common.close')}
      title={`${order.code} · ${order.customerName}`}
      subtitle={`${hhmm(order.createdAt)} · ${t(`orders.mode.${order.mode}`)} · ${t(`orders.payment.${order.paymentMethod}`)}`}
      footer={<>
        {!final && <Btn variant="danger" icon={Ban} onClick={() => setConfirmCancel(true)}>{t('orders.actions.anile')}</Btn>}
        {order.status !== 'anile' && (order.invoiceId
          ? <Badge tone="basil" icon={Receipt}>{t('orders.actions.invoiced')}</Badge>
          : next !== 'livre' && <Btn variant="glass" icon={Receipt} loading={invoicing} onClick={() => createInvoice(false)}>{t('orders.actions.invoice')}</Btn>)}
        {next && <Btn variant={next === 'livre' ? 'success' : 'primary'} icon={next === 'livre' && !order.invoiceId ? Receipt : NextIcon} loading={statusMutation.isPending} onClick={() => statusMutation.mutate(next)}>{next === 'livre' && !order.invoiceId ? t('orders.deliverAndInvoice') : nextLabel}</Btn>}
      </>}>
      <div className="rs-row" style={{ marginBottom: 14 }}>
        <Badge tone={STATUS_TONE[order.status]} dot pulse={!final}>{t(`orders.status.${order.status}`)}</Badge>
        <a className="rs-btn rs-btn--glass rs-btn--sm" href={`tel:${order.customerPhone}`}><Phone size={15} /> {t('orders.actions.call')}</a>
        {waNumber(order.customerPhone) && <a className="rs-btn rs-btn--primary rs-btn--sm" href={waLink(order.customerPhone, waText)} target="_blank" rel="noreferrer"><Send size={15} /> {t('orders.notify')}</a>}
        {waNumber(order.customerPhone) && <a className="rs-btn rs-btn--glass rs-btn--sm" href={waLink(order.customerPhone)} target="_blank" rel="noreferrer" aria-label={t('orders.actions.whatsapp')}><MessageCircle size={15} /></a>}
        {!final && <Btn variant="glass" size="sm" icon={Printer} onClick={kitchenPrint}>{t('orders.printKitchen')}</Btn>}
      </div>

      <div className="rs-info-grid" style={{ marginBottom: 14 }}>
        <div className="rs-info"><Phone size={16} /><div><div className="rs-label">{t('common.phone')}</div>{order.customerPhone}</div></div>
        {order.mode === 'delivery' && <div className="rs-info"><MapPin size={16} /><div><div className="rs-label">{t('orders.address')}</div>{order.customerAddress}</div></div>}
        <div className="rs-info"><Wallet size={16} /><div><div className="rs-label">{t('pub.checkout.payment')}</div>{t(`orders.payment.${order.paymentMethod}`)}</div></div>
        {order.notes && <div className="rs-info"><StickyNote size={16} /><div><div className="rs-label">{t('common.notes')}</div>{order.notes}</div></div>}
      </div>

      <span className="rs-label">{t('orders.items')}</span>
      <ul className="rs-lines">
        {order.items.map((it, i) => (
          <li key={i} className="rs-line" style={{ '--d': `${i * 40}ms` }}>
            <DishVisual name={it.name} size={40} spin={false} />
            <div className="rs-line__info">
              <span className="rs-line__name">{it.qty} × {it.name}</span>
              {it.note && <span className="rs-line__sub">{it.note}</span>}
            </div>
            <span className="rs-line__amt">{money(it.totalHtg, 0)}</span>
          </li>
        ))}
      </ul>
      <dl className="rs-totals">
        <div><dt>{t('orders.subtotal')}</dt><dd>{money(order.subtotalHtg)}</dd></div>
        {order.mode === 'delivery' && <div><dt>{t('orders.deliveryFee')}</dt><dd>{money(order.deliveryFeeHtg)}</dd></div>}
      </dl>
      <div className="rs-total"><span className="rs-total__label">{t('orders.total')}</span><span className="rs-total__val">{money(order.totalHtg)}</span></div>

      {next === 'livre' && !order.invoiceId && <div className="rs-alert rs-alert--info" style={{ marginTop: 12 }}><Receipt size={16} /> {t('orders.autoInvoice')}</div>}
      {order.rating ? (
        <div className="rs-review">
          <span className="rs-label">{t('orders.rating')}</span>
          <div style={{ margin: '4px 0' }}><RatingStars value={order.rating} size={16} /></div>
          {order.review && <div>« {order.review} »</div>}
        </div>
      ) : null}

      {order.history?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span className="rs-label">{t('orders.history')}</span>
          <ul className="rs-lines">
            {order.history.map((h, i) => (
              <li key={i} className="rs-line" style={{ '--d': `${i * 30}ms`, padding: '7px 0' }}>
                <Badge tone={STATUS_TONE[h.status]}>{t(`orders.status.${h.status}`)}</Badge>
                <span className="rs-line__info"><span className="rs-line__sub">{h.by || ''}</span></span>
                <span className="rs-hint">{hhmm(h.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmModal open={confirmCancel} theme={theme} title={t('orders.cancelTitle', { code: order.code })} text={t('orders.cancelText')}
        confirmLabel={t('orders.actions.anile')} cancelLabel={t('common.no')} loading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate('anile')} onClose={() => setConfirmCancel(false)} />
    </Modal>
  )
}

export default function RestaurantOnlineOrdersPage() {
  const { t } = useRT()
  const navigate = useNavigate()
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant } = useAuthStore()
  const tenantName = getTenantName(tenant)
  const qc = useQueryClient()
  const [scope, setScope] = useState('active')
  const [selected, setSelected] = useState(null)
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('resto-sound') !== 'off' } catch { return true } })

  const { data: orders = [], isLoading, isSuccess, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-online-orders', scope],
    queryFn: () => restoApi.onlineOrders({ scope }),
    refetchInterval: scope === 'active' ? 30000 : false,
  })
  const { data: portal } = useQuery({ queryKey: ['restaurant-portal-settings'], queryFn: restoApi.portalSettings, staleTime: 5 * 60 * 1000, retry: false })

  // Son lè gen nouvo kòmand
  const prevNew = useRef(null)
  const newCount = orders.filter((o) => o.status === 'nouvo').length
  useEffect(() => {
    if (scope !== 'active' || !isSuccess) return
    if (prevNew.current != null && newCount > prevNew.current) {
      toast(t('orders.newAlert'), { icon: '🔔' })
      if (sound) beep()
    }
    prevNew.current = newCount
  }, [newCount, scope, sound, t, isSuccess])

  const cols = useMemo(() => ({
    nouvo: orders.filter((o) => o.status === 'nouvo'),
    kitchen: orders.filter((o) => ['konfime', 'nan_kizin'].includes(o.status)),
    ready: orders.filter((o) => ['pare', 'sou_wout'].includes(o.status)),
    done: orders.filter((o) => ['livre', 'anile'].includes(o.status) && isToday(o.updatedAt)),
  }), [orders])
  const revenueToday = orders.filter((o) => o.status === 'livre' && isToday(o.updatedAt)).reduce((s, o) => s + o.totalHtg, 0)

  const onChanged = (o) => {
    setSelected(o)
    qc.setQueryData(['restaurant-online-orders', scope], (old = []) => old.map((x) => (x.id === o.id ? o : x)))
    qc.invalidateQueries({ queryKey: ['restaurant-summary'] })
  }
  const toggleSound = () => setSound((s) => { try { localStorage.setItem('resto-sound', s ? 'off' : 'on') } catch { /* */ } return !s })

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap" style={{ maxWidth: 1400 }}>
        <Hero overline={tenantName} title={t('orders.title')} subtitle={t('orders.subtitle')} icon={ShoppingBag}
          actions={<>
            {newCount > 0 && <Badge tone="solid" dot pulse>{t('orders.newCount', { count: newCount })}</Badge>}
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn variant="glass" icon={sound ? Bell : BellOff} onClick={toggleSound} aria-label="Son" />
            <Btn variant="glass" icon={RefreshCw} onClick={() => refetch()} className={isRefetching ? 'rs-spinning' : undefined} aria-label={t('common.refresh')} />
            <Btn variant="glass" icon={Settings2} onClick={() => navigate(RESTO_PATHS.portal)}>{t('orders.setupPortal')}</Btn>
          </>}>
          <Stats>
            <Stat index={0} icon={Bell} tone="paprika" label={t('orders.cols.nouvo')} value={cols.nouvo.length} />
            <Stat index={1} icon={ChefHat} tone="saffron" label={t('orders.cols.kitchen')} value={cols.kitchen.length} />
            <Stat index={2} icon={Bike} tone="sky" label={t('orders.cols.ready')} value={cols.ready.length} />
            <Stat index={3} icon={Wallet} tone="basil" label={t('orders.cols.done')} value={money(revenueToday, 0)} />
          </Stats>
        </Hero>

        {portal && portal.settings && !portal.settings.enabled && (
          <div className="rs-alert rs-alert--warn" style={{ marginBottom: 18, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{t('orders.portalOff')}</span>
            <Btn size="sm" icon={Settings2} onClick={() => navigate(RESTO_PATHS.portal)}>{t('orders.setupPortal')}</Btn>
          </div>
        )}

        <div className="rs-toolbar">
          <Seg value={scope} onChange={setScope} options={[{ id: 'active', label: t('orders.scope.active') }, { id: 'history', label: t('orders.scope.history') }]} />
        </div>

        {isLoading ? <SkeletonGrid count={4} height={180} className="rs-board" /> : scope === 'history' ? (
          !orders.length ? <Empty icon={Receipt} title={t('orders.emptyHistory')} /> : (
            <div className="rs-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {orders.map((o, i) => <OrderCard key={o.id} order={o} index={i} t={t} onOpen={setSelected} />)}
            </div>
          )
        ) : (
          <div className="rs-board">
            {[
              ['nouvo', Bell], ['kitchen', ChefHat], ['ready', Bike], ['done', CheckCircle2],
            ].map(([key, Icon]) => (
              <section key={key} className="rs-col">
                <header className="rs-col__head"><Icon size={16} /><span className="rs-col__title">{t(`orders.cols.${key}`)}</span><span className="rs-col__count">{cols[key].length}</span></header>
                {cols[key].length ? cols[key].map((o, i) => <OrderCard key={o.id} order={o} index={i} t={t} onOpen={setSelected} />)
                  : <div className="rs-col__empty">{t('orders.colEmpty')}</div>}
              </section>
            ))}
          </div>
        )}
      </div>

      {selected && <OrderDetail key={selected.id} order={selected} theme={theme} t={t} slug={portal?.settings?.slug} tenantName={tenantName} onClose={() => setSelected(null)} onChanged={onChanged} />}
    </Stage>
  )
}
