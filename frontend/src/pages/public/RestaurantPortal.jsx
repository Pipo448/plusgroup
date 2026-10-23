// src/pages/public/RestaurantPortal.jsx
// ─── Pòtal PIBLIK kliyan restoran an: /resto/:slug ─────────────────────
// Kliyan an wè meni an, mete plat nan panye, kòmande (livrezon / pran sou plas),
// swiv kòmand li an dirèk, epi rezève yon tab. Pa bezwen kont.
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  UtensilsCrossed, CalendarDays, ShoppingBag, Navigation, Globe, Phone, MapPin, Clock, Bike, Store,
  ChevronRight, Trash2, Wallet, CheckCircle2, ChefHat, Home, Search as SearchIcon, AlertTriangle, Check, MessageCircle, Heart, Send, ChevronLeft,
} from 'lucide-react'
import { setupPlusRestoPwa } from './restoPwa'
import FlyerView, { FlyerCta } from './FlyerView'
import { useRT, LANGS, changeRestoLang } from '../restaurant/restoI18n'
import { publicApi, errorCode, rateOrder } from '../restaurant/restoApi'
import {
  Stage, Btn, Badge, Chips, SearchField, DishVisual, DishArt, AddButton, Stepper, Modal, Field, Seg, Empty,
  SkeletonGrid, ThemeToggle, Steps, MiniMap, CheckBurst, RatingStars, FavButton, useRestoTheme, useTilt, useCountUp, haitiToday, dayParts,
  money, cx,
} from '../restaurant/restoUI'

// ── Ti zouti depo lokal ───────────────────────────────────────────────
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d } }
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* */ } }
const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
const FINAL = ['livre', 'anile']

// ══════════════════════════════════════════════
// Seleksyon lang
// ══════════════════════════════════════════════
export function LangSwitch({ i18n, lang }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const cur = LANGS.find((l) => l.id === lang) || LANGS[0]
  return (
    <div className="rs-lang" ref={ref}>
      <Btn variant="glass" size="md" icon={Globe} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{cur.short}</Btn>
      {open && (
        <div className="rs-lang__menu" role="menu">
          {LANGS.map((l) => (
            <button key={l.id} type="button" role="menuitem" className={cx('rs-lang__item', l.id === lang && 'is-active')}
              onClick={() => { changeRestoLang(i18n, l.id); setOpen(false) }}>
              {l.label} {l.id === lang && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// Kat plat kliyan
// ══════════════════════════════════════════════
function PublicDishCard({ item, img, index, onOpen, onAdd, canOrder, fav, onFav, t }) {
  const tilt = useTilt()
  const off = !item.available
  return (
    <article ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
      className="rs-dish-card" style={{ '--delay': `${Math.min(index, 12) * 60}ms`, cursor: 'pointer' }} onClick={() => onOpen(item)}>
      <div className="rs-dish-card__inner" style={off ? { opacity: 0.6 } : undefined}>
        <div className="rs-dish-card__glare" aria-hidden="true" />
        <div className="rs-dish-card__art"><DishVisual src={img} name={item.name} size={128} halo={!off} spin={!off} /></div>
        <div className="rs-dish-card__body">
          <div className="rs-dish-card__tags" style={{ alignItems: 'center' }}>
            {item.category && <Badge tone="neutral">{item.category}</Badge>}
            {off && <Badge tone="chili">{t('pub.unavailable')}</Badge>}
            <span style={{ marginLeft: 'auto' }}><FavButton on={fav} onToggle={() => onFav(item.id)} labelOn={t('pub.removeFav')} labelOff={t('pub.addFav')} /></span>
          </div>
          <h3 className="rs-dish-card__name">{item.name}</h3>
          {item.description && <p className="rs-dish-card__desc">{item.description}</p>}
          <div className="rs-dish-card__foot">
            <span className="rs-price">{money(item.priceHtg, 0)}</span>
            {canOrder && <AddButton label={`${t('pub.add')} ${item.name}`} disabled={off} onAdd={() => onAdd(item)} />}
          </div>
        </div>
      </div>
    </article>
  )
}

// ══════════════════════════════════════════════
// Detay plat
// ══════════════════════════════════════════════
function DishDetail({ item, img, theme, canOrder, onAdd, onClose, t }) {
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  return (
    <Modal theme={theme} onClose={onClose} closeLabel={t('common.close')} title={item.name} subtitle={item.category || null}
      footer={canOrder && item.available ? (
        <Btn size="lg" block icon={ShoppingBag} iconRight={ChevronRight} onClick={() => { onAdd(item, qty, note); onClose() }}>
          {t('pub.addToCart')} · {money(item.priceHtg * qty, 0)}
        </Btn>
      ) : null}>
      <div className="rs-detail-art"><DishVisual src={img} name={item.name} size={200} halo /></div>
      {item.description && <p style={{ margin: '0 0 14px', color: 'var(--ink-muted)', font: '500 14.5px/22px var(--font-sans)' }}>{item.description}</p>}
      <div className="rs-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="rs-price" style={{ fontSize: 26, lineHeight: '30px' }}>{money(item.priceHtg, 0)}</span>
        {canOrder && item.available ? <Stepper value={qty} min={1} max={50} onChange={setQty} /> : !item.available && <Badge tone="chili">{t('pub.unavailable')}</Badge>}
      </div>
      {canOrder && item.available && (
        <input className="rs-input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder={t('pub.itemNotePh')} />
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════
// Swivi kòmand
// ══════════════════════════════════════════════
function OrderTracker({ slug, code, last4, settings, t, te }) {
  const [stars, setStars] = useState(0)
  const [review, setReview] = useState('')
  const rate = useMutation({ mutationFn: () => rateOrder(slug, code, { phone: last4, rating: stars, review }) })
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['pub-order', slug, code, last4],
    queryFn: () => publicApi.trackOrder(slug, code, last4),
    refetchInterval: (q) => (FINAL.includes(q.state.data?.status) ? false : 20000),
    retry: false,
  })
  if (isLoading) return <SkeletonGrid count={1} height={320} className="rs-col" />
  if (isError || !order) return <div className="rs-alert rs-alert--err">{t('pub.track.notFound')}</div>

  const delivery = order.mode === 'delivery'
  const idx = { nouvo: 0, konfime: 0, nan_kizin: 1, pare: 2, sou_wout: 2, livre: 4, anile: -1 }[order.status] ?? 0
  const steps = [
    { label: t('pub.track.steps.received'), icon: CheckCircle2 },
    { label: t('pub.track.steps.kitchen'), icon: ChefHat },
    { label: delivery ? t('pub.track.steps.onTheWay') : t('pub.track.steps.ready'), icon: delivery ? Bike : Store },
    { label: delivery ? t('pub.track.steps.delivered') : t('pub.track.steps.pickedUp'), icon: Home },
  ]
  // ETA kòmanse kouri depi restoran an konfime kòmand lan (pa depi kliyan an voye l)
  const startAt = (order.history || []).find((h) => h.status === 'konfime')?.at || order.createdAt
  const elapsed = Math.round((Date.now() - new Date(startAt).getTime()) / 60000)
  const eta = Math.max(1, (order.prepMinutes || settings?.prepMinutes || 30) + (delivery ? 15 : 0) - elapsed)
  const final = FINAL.includes(order.status)

  return (
    <section className="rs-card rs-glass" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="rs-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <span className="rs-overline">{order.code}</span>
          <h2 className="rs-h1" style={{ fontSize: 26, lineHeight: '30px', marginTop: 2 }}>{order.status === 'anile' ? t('orders.status.anile') : t(`orders.status.${order.status}`)}</h2>
          <p className="rs-muted" style={{ margin: '6px 0 0', font: '500 14px/20px var(--font-sans)' }}>{t(`pub.track.text.${order.status}`)}</p>
        </div>
        {!final && <div className="rs-eta" title={t('pub.track.eta')}><b>{eta}</b><span>min</span></div>}
      </div>
      {delivery && order.status === 'sou_wout' && <MiniMap progress={0.7} />}
      {order.status !== 'anile' && <Steps steps={steps} current={idx} />}
      <ul className="rs-lines">
        {order.items.map((it, i) => (
          <li key={i} className="rs-line" style={{ '--d': `${i * 40}ms` }}>
            <DishVisual name={it.name} size={40} spin={false} />
            <div className="rs-line__info"><span className="rs-line__name">{it.qty} × {it.name}</span>{it.note && <span className="rs-line__sub">{it.note}</span>}</div>
            <span className="rs-line__amt">{money(it.totalHtg, 0)}</span>
          </li>
        ))}
      </ul>
      <div className="rs-total" style={{ marginTop: 0 }}><span className="rs-total__label">{t('pub.cart.total')}</span><span className="rs-total__val">{money(order.totalHtg, 0)}</span></div>
      {order.status === 'livre' && (order.rating || rate.isSuccess ? (
        <div className="rs-alert rs-alert--ok" style={{ alignItems: 'center' }}><RatingStars value={order.rating || stars} size={16} showValue={false} /> {t('pub.rate.thanks')}</div>
      ) : (
        <div className="rs-card rs-glass" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
          <span className="rs-h2">{t('pub.rate.title')}</span>
          <RatingStars interactive value={stars} size={30} onChange={setStars} />
          <input className="rs-input" value={review} maxLength={300} onChange={(e) => setReview(e.target.value)} placeholder={t('pub.rate.reviewPh')} />
          {rate.isError && <div className="rs-alert rs-alert--err">{te(errorCode(rate.error))}</div>}
          <Btn icon={Send} disabled={!stars} loading={rate.isPending} onClick={() => rate.mutate(undefined, { onSuccess: () => refetch() })}>{t('pub.rate.send')}</Btn>
        </div>
      ))}
      {!final && <span className="rs-hint" style={{ textAlign: 'center' }}><span className="rs-dot rs-dot--pulse" style={{ display: 'inline-block', marginRight: 6, color: 'var(--basil)' }} />{t('pub.track.updatedAuto')}</span>}
    </section>
  )
}

// ══════════════════════════════════════════════
// Rezèvasyon
// ══════════════════════════════════════════════
function ReserveView({ slug, data, t, te }) {
  const today = haitiToday()
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today])
  const saved = load('resto-customer', {})
  const [date, setDate] = useState(today)
  const [time, setTime] = useState(null)
  const [people, setPeople] = useState(2)
  const [f, setF] = useState({ name: saved.name || '', phone: saved.phone || '', email: '', notes: '', website: '' })
  const [done, setDone] = useState(null)
  const [err, setErr] = useState(null)

  const { data: av, isLoading } = useQuery({
    queryKey: ['pub-availability', slug, date],
    queryFn: () => publicApi.availability(slug, date),
    enabled: !!data.settings.acceptReservations,
    staleTime: 30000,
  })
  useEffect(() => { setTime(null) }, [date])
  // ✅ NOUVO — si pa gen lè ki rete jodi a (egz. li deja 22h), ale otomatikman sou demen (yon sèl fwa)
  const autoNext = useRef(false)
  useEffect(() => {
    if (autoNext.current || date !== today || !av?.slots) return
    autoNext.current = true
    if (!av.slots.some((s) => s.available)) setDate(days[1])
  }, [av, date, today, days])

  const m = useMutation({
    mutationFn: () => publicApi.createReservation(slug, { name: f.name, phone: f.phone, email: f.email, notes: f.notes, website: f.website, partySize: people, date, time }),
    onSuccess: (r) => { setDone(r); store('resto-customer', { ...load('resto-customer', {}), name: f.name, phone: f.phone }) },
    onError: (e) => setErr(errorCode(e)),
  })

  if (!data.settings.acceptReservations) return <Empty icon={CalendarDays} title={t('pub.reserve.title')} text={t('pub.reserve.closed')} />
  if (done) {
    const p = dayParts(t, done.date)
    return (
      <section className="rs-card rs-glass" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '34px 20px' }}>
        <CheckBurst />
        <h2 className="rs-h1">{t('pub.reserve.done')}</h2>
        <p className="rs-muted" style={{ margin: 0 }}>{p.dow} {p.num} {p.mon} · {done.time} · {t('common.people', { count: done.partySize })}</p>
        <p style={{ margin: '4px 0 10px', font: '600 14px/20px var(--font-sans)' }}>{t('pub.reserve.doneText', { code: done.code })}</p>
        <Btn variant="glass" onClick={() => { setDone(null); setTime(null) }}>{t('pub.reserve.again')}</Btn>
      </section>
    )
  }
  const submit = (e) => {
    e.preventDefault(); setErr(null)
    if (!time) { setErr('pickTime'); return }
    m.mutate()
  }
  return (
    <form className="rs-card rs-glass rs-form" onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto' }}>
      <div>
        <h2 className="rs-h1" style={{ fontSize: 26 }}>{t('pub.reserve.title')}</h2>
        <p className="rs-muted" style={{ margin: '4px 0 0', font: '500 13.5px/20px var(--font-sans)' }}>{t('pub.reserve.subtitle')}</p>
      </div>
      <span className="rs-label">{t('pub.reserve.day')}</span>
      <div className="rs-days" role="listbox" aria-label={t('pub.reserve.day')}>
        {days.map((d, i) => {
          const p = dayParts(t, d)
          // ✅ KORIJE MOBIL — « Aujourd'hui » te twò long pou chip la; kounye a chak chip
          // gen jou a + dat + mwa (oswa « Jodi a » ann ti lèt anba) e 7 chip plen lajè ekran an.
          return (
            <button key={d} type="button" role="option" aria-selected={d === date} title={i === 0 ? t('common.today') : undefined}
              className={cx('rs-day', d === date && 'is-active', i === 0 && 'is-today')} style={{ '--d': `${i * 30}ms` }}
              onClick={(e) => { setDate(d); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }) }}>
              <span className="rs-day__dow">{p.dow}</span><span className="rs-day__num">{p.num}</span>
              <span className="rs-day__mon">{i === 0 ? '•' : p.mon}</span>
            </button>
          )
        })}
      </div>
      <span className="rs-label">{t('pub.reserve.time')}</span>
      {isLoading ? <div className="rs-skel" style={{ height: 88 }} /> : !av?.slots?.some((s) => s.available) ? <div className="rs-alert rs-alert--warn">{t('pub.reserve.noSlots')}</div> : (
        <div className="rs-slots">
          {av.slots.map((s) => (
            <button key={s.time} type="button" disabled={!s.available} className={cx('rs-slot', time === s.time && 'is-active')} onClick={() => setTime(s.time)}>{s.time}</button>
          ))}
        </div>
      )}
      <div className="rs-row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <span className="rs-label" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{t('pub.reserve.people')}</span>
        <Stepper value={people} min={1} max={data.settings.maxParty || 12} onChange={setPeople} />
      </div>
      <div className="rs-form-grid">
        <Field label={t('pub.reserve.name')}><input className="rs-input" required placeholder={t('pub.checkout.namePh')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
        <Field label={t('pub.reserve.phone')}><input className="rs-input" required inputMode="tel" placeholder={t('pub.checkout.phonePh')} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></Field>
      </div>
      <Field label={t('pub.reserve.email')}><input className="rs-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
      <Field label={t('pub.reserve.notes')}><textarea className="rs-textarea" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <input className="rs-sr" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} aria-hidden="true" />
      {err && <div className="rs-alert rs-alert--err"><AlertTriangle size={16} /> {err === 'pickTime' ? t('pub.reserve.pickTime') : te(err)}</div>}
      <Btn type="submit" size="lg" block icon={CheckCircle2} loading={m.isPending}>{t('pub.reserve.confirm')}</Btn>
    </form>
  )
}

// ══════════════════════════════════════════════
// Panye + fini kòmand
// ══════════════════════════════════════════════
function CartView({ slug, data, lines, setQty, clearCart, onPlaced, goMenu, t, te }) {
  const s = data.settings
  const saved = load('resto-customer', {})
  const modes = [s.deliveryEnabled && 'delivery', s.pickupEnabled && 'pickup'].filter(Boolean)
  const [mode, setMode] = useState(modes.includes(saved.mode) ? saved.mode : modes[0] || 'pickup')
  const [pay, setPay] = useState(s.paymentMethods.includes(saved.pay) ? saved.pay : s.paymentMethods[0] || 'cash')
  const [f, setF] = useState({ name: saved.name || '', phone: saved.phone || '', address: saved.address || '', notes: '', website: '' })
  const [err, setErr] = useState(null)

  const subtotal = lines.reduce((a, l) => a + l.item.priceHtg * l.qty, 0)
  const fee = mode === 'delivery' ? s.deliveryFeeHtg : 0
  const total = subtotal + fee
  const shownTotal = useCountUp(total, 500)
  const belowMin = s.minOrderHtg > 0 && subtotal < s.minOrderHtg

  const m = useMutation({
    mutationFn: () => publicApi.createOrder(slug, {
      mode, paymentMethod: pay, notes: f.notes, website: f.website,
      customer: { name: f.name, phone: f.phone, address: f.address },
      items: lines.map((l) => ({ productId: l.item.id, qty: l.qty, note: l.note })),
    }),
    onSuccess: (order) => {
      store('resto-customer', { name: f.name, phone: f.phone, address: f.address, mode, pay })
      clearCart(); onPlaced(order)
    },
    onError: (e) => setErr(errorCode(e)),
  })

  if (!lines.length) {
    return <Empty icon={ShoppingBag} title={t('pub.cart.empty')} text={t('pub.cart.emptyText')} action={<Btn icon={UtensilsCrossed} onClick={goMenu}>{t('pub.cart.browse')}</Btn>} />
  }
  return (
    <div className="rs-two" style={{ alignItems: 'start' }}>
      <section className="rs-card rs-glass">
        <h2 className="rs-card__title"><ShoppingBag size={18} /> {t('pub.cart.title')} <Badge tone="paprika">{t('common.items', { count: lines.reduce((a, l) => a + l.qty, 0) })}</Badge></h2>
        <ul className="rs-lines">
          {lines.map((l, i) => (
            <li key={l.item.id} className="rs-line" style={{ '--d': `${i * 50}ms` }}>
              <DishVisual src={l.img} name={l.item.name} size={52} spin={false} />
              <div className="rs-line__info">
                <span className="rs-line__name">{l.item.name}</span>
                <span className="rs-line__sub">{money(l.item.priceHtg, 0)}{l.note ? ` · ${l.note}` : ''}</span>
              </div>
              <Stepper size="sm" value={l.qty} min={0} max={50} onChange={(q) => setQty(l.item.id, q)} />
            </li>
          ))}
        </ul>
        <dl className="rs-totals">
          <div><dt>{t('pub.cart.subtotal')}</dt><dd>{money(subtotal, 0)}</dd></div>
          {mode === 'delivery' && <div><dt>{t('pub.cart.deliveryFee')}</dt><dd>{fee ? money(fee, 0) : <Badge tone="basil" icon={Check}>{t('pub.cart.free')}</Badge>}</dd></div>}
        </dl>
        <div className="rs-total"><span className="rs-total__label">{t('pub.cart.total')}</span><span className="rs-total__val">{money(shownTotal, 0)}</span></div>
        {belowMin && <div className="rs-alert rs-alert--warn" style={{ marginTop: 12 }}><AlertTriangle size={16} /> {t('pub.cart.min', { amount: money(s.minOrderHtg, 0) })}</div>}
        <div style={{ marginTop: 12 }}><Btn variant="ghost" size="sm" icon={Trash2} onClick={clearCart}>{t('pub.cart.clear')}</Btn></div>
      </section>

      <form className="rs-card rs-glass rs-form" style={{ '--delay': '80ms' }} onSubmit={(e) => { e.preventDefault(); setErr(null); m.mutate() }}>
        <h2 className="rs-card__title" style={{ margin: 0 }}><CheckCircle2 size={18} /> {t('pub.checkout.title')}</h2>
        {!s.acceptOrders && <div className="rs-alert rs-alert--warn"><AlertTriangle size={16} /> {t('pub.ordersPaused')}</div>}
        {modes.length > 1 && (
          <Field label={t('pub.checkout.mode')}>
            <Seg block value={mode} onChange={setMode} options={[{ id: 'delivery', label: t('orders.mode.delivery'), icon: Bike }, { id: 'pickup', label: t('orders.mode.pickup'), icon: Store }]} />
          </Field>
        )}
        <div className="rs-form-grid">
          <Field label={t('pub.checkout.name')}><input className="rs-input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t('pub.checkout.namePh')} autoComplete="name" /></Field>
          <Field label={t('pub.checkout.phone')}><input className="rs-input" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder={t('pub.checkout.phonePh')} autoComplete="tel" /></Field>
        </div>
        {mode === 'delivery' && (
          <Field label={t('pub.checkout.address')}><textarea className="rs-textarea" rows={2} required value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder={t('pub.checkout.addressPh')} autoComplete="street-address" /></Field>
        )}
        <Field label={t('pub.checkout.payment')} hint={pay === 'cash' ? t('pub.checkout.payOnReceive') : s.moncashNumber ? t('pub.checkout.moncashNote', { number: s.moncashNumber }) : null}>
          <Seg block value={pay} onChange={setPay} options={s.paymentMethods.map((p) => ({ id: p, label: t(`orders.payment.${p}`), icon: p === 'cash' ? Wallet : Phone }))} />
        </Field>
        <Field label={`${t('pub.checkout.notes')} (${t('common.optional')})`}><input className="rs-input" value={f.notes} maxLength={300} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={t('pub.checkout.notesPh')} /></Field>
        <input className="rs-sr" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} aria-hidden="true" />
        {err && <div className="rs-alert rs-alert--err"><AlertTriangle size={16} /> {te(err)}</div>}
        <Btn type="submit" size="lg" block icon={ShoppingBag} iconRight={ChevronRight} loading={m.isPending} disabled={!s.acceptOrders || belowMin}>
          {m.isPending ? t('pub.checkout.placing') : `${t('pub.checkout.place')} · ${money(total, 0)}`}
        </Btn>
      </form>
    </div>
  )
}

// ══════════════════════════════════════════════
// PAJ PRENSIPAL PÒTAL LA
// ══════════════════════════════════════════════
export default function RestaurantPortal() {
  const { slug } = useParams()
  const { t, te, i18n, lang } = useRT()
  const location = useLocation()
  const navigate = useNavigate()
  // Bouton « Tout restoran yo » si kliyan an soti nan anyè a (oswa nan app Plus Resto a)
  const [fromDir] = useState(() => !!location.state?.fromDir || (() => { try { return sessionStorage.getItem('plusresto-dir') === '1' } catch { return false } })())
  useEffect(() => { setupPlusRestoPwa() }, [])
  const [logoOk, setLogoOk] = useState(true)
  const [theme, toggleTheme] = useRestoTheme('resto-portal-theme')
  const [params, setParams] = useSearchParams()
  const view = params.get('v') || 'menu'
  const go = (v, extra = {}) => { setParams({ v, ...extra }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pub-portal', slug], queryFn: () => publicApi.portal(slug), staleTime: 60000, retry: (n, e) => !e?.response && n < 2,
  })

  // Panye (sove nan navigatè a pou chak restoran)
  const cartKey = `resto-cart-${slug}`
  const [cart, setCart] = useState(() => load(cartKey, []))
  useEffect(() => store(cartKey, cart), [cart, cartKey])
  const [bump, setBump] = useState(0)
  const [myOrders, setMyOrders] = useState(() => load(`resto-orders-${slug}`, []))

  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('')
  const [favs, setFavs] = useState(() => load(`resto-favs-${slug}`, []))
  const toggleFav = (id) => setFavs((f) => { const n = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; store(`resto-favs-${slug}`, n); return n })
  const [detail, setDetail] = useState(null)
  const [placed, setPlaced] = useState(null)
  const [lookup, setLookup] = useState({ code: '', last4: '' })

  useEffect(() => { if (data?.restaurant?.name) document.title = data.restaurant.name }, [data])

  const items = useMemo(() => data?.items || [], [data])
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const img = (it) => (it?.hasImage ? publicApi.imageUrl(slug, it.id, it.v) : null)
  const lines = cart.map((c) => ({ ...c, item: byId.get(c.id) })).filter((l) => l.item && l.item.available)
    .map((l) => ({ ...l, img: img(l.item) }))
  const cartCount = lines.reduce((a, l) => a + l.qty, 0)
  const cartTotal = lines.reduce((a, l) => a + l.qty * l.item.priceHtg, 0)

  const addToCart = (item, qty = 1, note = '') => {
    setCart((c) => {
      const ex = c.find((x) => x.id === item.id)
      if (ex) return c.map((x) => (x.id === item.id ? { ...x, qty: Math.min(50, x.qty + qty), note: note || x.note } : x))
      return [...c, { id: item.id, qty, note }]
    })
    setBump((b) => b + 1)
  }
  const setQty = (id, q) => setCart((c) => (q <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty: q } : x))))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => (!cat || (cat === '__fav' ? favs.includes(i.id) : i.categoryId === cat)) && (!q || i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)))
  }, [items, search, cat, favs])
  const heroItem = items.find((i) => i.hasImage && i.available) || items.find((i) => i.available)
  const flyers = useMemo(() => data?.flyers || [], [data])
  // Restoran ki gen flyer sèlman (poko gen plat an liy): montre flyer la dirèkteman nan meni an
  const flyerOnly = !items.length && flyers.length > 0

  const onPlaced = (order) => {
    const entry = { code: order.code, last4: order.phoneLast4, at: order.createdAt, total: order.totalHtg }
    const next = [entry, ...myOrders.filter((o) => o.code !== order.code)].slice(0, 10)
    setMyOrders(next); store(`resto-orders-${slug}`, next)
    setPlaced(order)
  }

  // ── Eta erè / chajman ──
  if (isLoading) {
    return <Stage theme={theme} className="rs-app"><div className="rs-app__inner"><div className="rs-skel" style={{ height: 64, marginBottom: 18 }} /><div className="rs-skel" style={{ height: 190, marginBottom: 22 }} /><SkeletonGrid count={6} height={250} /></div></Stage>
  }
  if (isError || !data) {
    const code = errorCode(error)
    return (
      <Stage theme={theme} className="rs-app" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <Empty icon={UtensilsCrossed} title={t('pub.notFoundTitle')} text={te(code)}
            action={<LangSwitch i18n={i18n} lang={lang} />} />
        </div>
      </Stage>
    )
  }

  const r = data.restaurant
  const s = data.settings
  const canOrder = s.acceptOrders
  const navItems = [
    { id: 'menu', label: t('pub.nav.menu'), icon: UtensilsCrossed },
    ...(s.acceptReservations ? [{ id: 'reserve', label: t('pub.nav.reserve'), icon: CalendarDays }] : []),
    ...(canOrder || cartCount ? [{ id: 'cart', label: t('pub.nav.cart'), icon: ShoppingBag, badge: cartCount }] : []),
    { id: 'track', label: t('pub.nav.track'), icon: Navigation },
  ]
  const navIdx = Math.max(0, navItems.findIndex((n) => n.id === view))
  const trackCode = params.get('code'), trackLast4 = params.get('p')

  return (
    <Stage theme={theme} className="rs-app">
      <div className="rs-app__inner">
        {fromDir && (
          <button type="button" className="rs-backdir" onClick={() => (location.state?.fromDir && window.history.length > 1 ? navigate(-1) : navigate('/resto'))}>
            <ChevronLeft size={16} /> {t('dir.back')}
          </button>
        )}
        {/* ── Ba anlè ── */}
        <header className="rs-topbar">
          <div className="rs-brand">
            <div className="rs-brand__logo">{r.hasLogo && logoOk ? <img src={publicApi.logoUrl(slug)} alt="" onError={() => setLogoOk(false)} /> : (r.name || '?').trim().charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <h1 className="rs-brand__name">{r.name}</h1>
              <span className="rs-brand__sub">
                <span className="rs-dot rs-dot--pulse" style={{ color: canOrder ? 'var(--basil)' : 'var(--saffron)' }} />
                {canOrder ? t('pub.open') : t('pub.closed')}
                {r.hoursText ? ` · ${r.hoursText}` : ''}
              </span>
              {r.rating ? <RatingStars value={r.rating} count={t('pub.reviews', { count: r.ratingCount })} size={13} /> : null}
            </div>
          </div>
          <LangSwitch i18n={i18n} lang={lang} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
        </header>

        {/* ── MENI ── */}
        {view === 'menu' && (
          <>
            {s.ordersPaused && <div className="rs-alert rs-alert--warn rs-banner-closed"><AlertTriangle size={16} /> {t('pub.ordersPaused')}</div>}
            <section className="rs-promo">
              <div className="rs-promo__text">
                <span className="rs-promo__tag">{t('pub.promoTag')}</span>
                <h2 className="rs-promo__title">{r.welcomeMessage || t('pub.promoTitle')}</h2>
                <p className="rs-promo__desc">{t('pub.promoDesc')}</p>
                <button type="button" className="rs-promo__btn" onClick={() => (document.getElementById('rs-menu') || document.querySelector('.rs-flyers'))?.scrollIntoView({ behavior: 'smooth' })}>{t('pub.promoBtn')} <ChevronRight size={15} /></button>
              </div>
              {heroItem ? <DishVisual src={img(heroItem)} name={heroItem.name} size={190} className="rs-promo__art" /> : <DishArt variant="griyo" size={190} className="rs-promo__art" />}
            </section>

            {/* ✅ NOUVO — Flyer meni (imaj) */}
            {flyerOnly
              ? <FlyerView slug={slug} flyers={flyers} theme={theme} name={r.name} t={t} />
              : flyers.length > 0 && <FlyerCta slug={slug} flyers={flyers} t={t} onOpen={() => go('flyer')} />}

            {!flyerOnly && (<>
            <div id="rs-menu" className="rs-toolbar" style={{ scrollMarginTop: 12 }}>
              <SearchField value={search} onChange={setSearch} hints={[t('pub.hint1'), t('pub.hint2'), t('pub.hint3')]} />
              {(data.categories.length > 0 || favs.length > 0) && (
                <Chips value={cat} onChange={setCat} items={[
                  { id: '', label: t('pub.all') },
                  ...(favs.length ? [{ id: '__fav', label: t('pub.favorites'), icon: Heart, count: favs.filter((id) => byId.has(id)).length }] : []),
                  ...data.categories.map((c) => ({ id: c.id, label: c.name })),
                ]} />
              )}
            </div>

            {!filtered.length ? <Empty icon={SearchIcon} title={t('menu.emptySearch')} /> : (
              <div className="rs-grid">
                {filtered.map((it, i) => (
                  <PublicDishCard key={it.id} item={it} img={img(it)} index={i} t={t} canOrder={canOrder} onOpen={setDetail} onAdd={(x) => addToCart(x)}
                    fav={favs.includes(it.id)} onFav={toggleFav} />
                ))}
              </div>
            )}
            </>)}

            {(r.phone || r.address || r.hoursText) && (
              <>
                <div className="rs-section-title"><h2>{t('pub.info.title')}</h2></div>
                <div className="rs-info-grid">
                  {r.phone && <a className="rs-info" href={`tel:${r.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}><Phone size={16} /><div><div className="rs-label">{t('pub.info.phone')}</div>{r.phone}</div></a>}
                  {r.whatsapp && <a className="rs-info" href={`https://wa.me/${String(r.whatsapp).replace(/\D/g, '').replace(/^(\d{8})$/, '509$1')}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><MessageCircle size={16} /><div><div className="rs-label">WhatsApp</div>{r.whatsapp}</div></a>}
                  {r.address && <div className="rs-info"><MapPin size={16} /><div><div className="rs-label">{t('pub.info.address')}</div>{r.address}</div></div>}
                  {r.hoursText && <div className="rs-info"><Clock size={16} /><div><div className="rs-label">{t('pub.info.hours')}</div>{r.hoursText}</div></div>}
                </div>
              </>
            )}
            <p className="rs-hint" style={{ textAlign: 'center', margin: '30px 0 0' }}>{t('pub.poweredBy')}</p>
          </>
        )}

        {/* ── PANYE ── */}
        {view === 'cart' && (placed ? (
          <section className="rs-card rs-glass" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '34px 20px', maxWidth: 560, margin: '0 auto' }}>
            <CheckBurst />
            <h2 className="rs-h1">{t('pub.success.title')}</h2>
            <p className="rs-muted" style={{ margin: 0, maxWidth: 380 }}>{t('pub.success.text')}</p>
            <div className="rs-badge rs-badge--solid" style={{ height: 40, padding: '0 18px', fontSize: 18, letterSpacing: '0.06em' }}>{placed.code}</div>
            <Btn size="lg" icon={Navigation} onClick={() => { const p = placed; setPlaced(null); go('track', { code: p.code, p: p.phoneLast4 }) }}>{t('pub.success.track')}</Btn>
          </section>
        ) : (
          <CartView slug={slug} data={data} lines={lines} setQty={setQty} clearCart={() => setCart([])} onPlaced={onPlaced} goMenu={() => go('menu')} t={t} te={te} />
        ))}

        {/* ── SWIVI ── */}
        {view === 'track' && (
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {trackCode && trackLast4 ? (
              <>
                <OrderTracker slug={slug} code={trackCode} last4={trackLast4} settings={s} t={t} te={te} />
                <Btn variant="glass" onClick={() => go('track')}>{t('common.back')}</Btn>
              </>
            ) : (
              <>
                <form className="rs-card rs-glass rs-form" onSubmit={(e) => { e.preventDefault(); if (lookup.code && lookup.last4.length === 4) go('track', { code: lookup.code.toUpperCase().trim(), p: lookup.last4 }) }}>
                  <div>
                    <h2 className="rs-h1" style={{ fontSize: 26 }}>{t('pub.track.title')}</h2>
                    <p className="rs-muted" style={{ margin: '4px 0 0', font: '500 13.5px/20px var(--font-sans)' }}>{t('pub.track.lookup')}</p>
                  </div>
                  <div className="rs-form-grid">
                    <Field label={t('pub.track.code')}><input className="rs-input" value={lookup.code} onChange={(e) => setLookup({ ...lookup, code: e.target.value })} placeholder="PR-1234" style={{ textTransform: 'uppercase' }} /></Field>
                    <Field label={t('pub.track.last4')}><input className="rs-input rs-mono" inputMode="numeric" maxLength={4} value={lookup.last4} onChange={(e) => setLookup({ ...lookup, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="0000" /></Field>
                  </div>
                  <Btn type="submit" icon={SearchIcon}>{t('pub.track.find')}</Btn>
                </form>
                <section>
                  <div className="rs-section-title" style={{ marginTop: 0 }}><h2>{t('pub.track.mine')}</h2></div>
                  {!myOrders.length ? <p className="rs-hint">{t('pub.track.none')}</p> : (
                    <div className="rs-col" style={{ gap: 10 }}>
                      {myOrders.map((o, i) => (
                        <button key={o.code} type="button" className="rs-dish-row" style={{ '--delay': `${i * 50}ms` }} onClick={() => go('track', { code: o.code, p: o.last4 })}>
                          <span className="rs-stat__icon rs-stat__icon--paprika" style={{ marginLeft: 4 }}><ShoppingBag size={18} /></span>
                          <span className="rs-dish-row__body">
                            <span className="rs-dish-row__name">{o.code}</span>
                            <span className="rs-dish-row__desc">{new Date(o.at).toLocaleString()}</span>
                          </span>
                          <span className="rs-price rs-price--sm">{money(o.total || 0, 0)}</span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* ── FLYER MENI ── */}
        {view === 'flyer' && (flyers.length
          ? <FlyerView slug={slug} flyers={flyers} theme={theme} name={r.name} t={t} onBack={() => go('menu')} />
          : <Empty icon={UtensilsCrossed} title={t('flyer.empty')} action={<Btn icon={UtensilsCrossed} onClick={() => go('menu')}>{t('flyer.back')}</Btn>} />)}

        {/* ── REZÈVASYON ── */}
        {view === 'reserve' && <ReserveView slug={slug} data={data} t={t} te={te} />}
      </div>

      {/* Ba panye flotan */}
      {view === 'menu' && cartCount > 0 && (
        <div className="rs-cartbar">
          <Btn size="lg" block icon={ShoppingBag} iconRight={ChevronRight} onClick={() => go('cart')}>
            {t('pub.cart.view')} · {t('common.items', { count: cartCount })} · {money(cartTotal, 0)}
          </Btn>
        </div>
      )}

      {/* Nav anba */}
      <nav className="rs-nav" aria-label="Navigation">
        <div className="rs-nav__track" style={{ '--n': navItems.length, '--i': navIdx }}>
          <span className="rs-nav__blob" aria-hidden="true" />
          {navItems.map((n) => (
            <button key={n.id} type="button" className={cx('rs-nav__item', view === n.id && 'is-active')} aria-current={view === n.id ? 'page' : undefined}
              onClick={() => { if (n.id === 'cart') setPlaced(null); go(n.id) }}>
              <span className="rs-nav__icon">
                <n.icon size={22} strokeWidth={2} />
                {n.badge ? <span key={bump} className={cx('rs-nav__badge', 'is-bump')}>{n.badge}</span> : null}
              </span>
              <span className="rs-nav__label">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {detail && <DishDetail item={detail} img={img(detail)} theme={theme} canOrder={canOrder} t={t} onAdd={addToCart} onClose={() => setDetail(null)} />}
    </Stage>
  )
}