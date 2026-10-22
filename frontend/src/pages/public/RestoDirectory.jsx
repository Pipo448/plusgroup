// src/pages/public/RestoDirectory.jsx
// ─── Anyè « Plus Resto »: /resto ──────────────────────────────────────
// Kliyan an wè tout restoran ki gen pòtal aktif, ranje pa distans si li
// bay pozisyon li. Li klike yon restoran → pòtal restoran sa a (/resto/:slug).
// Se paj sa a ki paj kòmansman app Plus Resto a (PWA + Play Store).
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  UtensilsCrossed, LocateFixed, MapPin, Bike, Store, CalendarDays, Clock, Heart, Download, X, Share, Loader2, Navigation,
} from 'lucide-react'
import { useRT } from '../restaurant/restoI18n'
import { publicApi } from '../restaurant/restoApi'
import {
  Stage, Btn, Badge, Chips, SearchField, DishVisual, Empty, SkeletonGrid, ThemeToggle, RatingStars, FavButton,
  useRestoTheme, useTilt, money, cx,
} from '../restaurant/restoUI'
import { LangSwitch } from './RestaurantPortal'
import { usePlusRestoPwa } from './restoPwa'

const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d } }
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* */ } }
const POS_KEY = 'plusresto-pos'
const FAV_KEY = 'plusresto-favs'

function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v)
  useEffect(() => { const id = setTimeout(() => setD(v), ms); return () => clearTimeout(id) }, [v, ms])
  return d
}

// Pozisyon kliyan an: mande SÈLMAN lè l klike « Pi pre m » (oswa si li te deja bay pèmisyon)
function useLocation() {
  const [pos, setPos] = useState(() => {
    const p = load(POS_KEY, null)
    return p && Date.now() - p.at < 30 * 60 * 1000 ? p : null // pozisyon valab 30 min
  })
  const [state, setState] = useState(pos ? 'ok' : 'idle') // idle | loading | ok | denied
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setState('denied'); return }
    setState('loading')
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const p = { lat: Math.round(g.coords.latitude * 1e4) / 1e4, lng: Math.round(g.coords.longitude * 1e4) / 1e4, at: Date.now() }
        store(POS_KEY, p); setPos(p); setState('ok')
      },
      () => setState('denied'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    )
  }, [])
  // Si pèmisyon an te deja bay, chèche pozisyon an otomatikman
  useEffect(() => {
    if (pos || !navigator.permissions?.query) return
    navigator.permissions.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') locate() }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return { pos, state, locate, clear: () => { store(POS_KEY, null); setPos(null); setState('idle') } }
}

const fmtDist = (t, km) => (km == null ? null : km < 1 ? t('dir.m', { m: Math.max(50, Math.round((km * 1000) / 50) * 50) }) : t('dir.km', { km: km < 10 ? km.toFixed(1) : Math.round(km) }))

function RestoCard({ r, index, fav, onFav, onOpen, t }) {
  const tilt = useTilt(6, 8)
  const cover = r.cover ? publicApi.imageUrl(r.slug, r.cover.id, r.cover.v) : null
  const [logoOk, setLogoOk] = useState(r.hasLogo)
  const dist = fmtDist(t, r.distanceKm)
  return (
    <article ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
      className={cx('rs-rcard', !r.open && 'is-closed')} style={{ '--delay': `${Math.min(index, 12) * 60}ms` }}
      onClick={() => onOpen(r)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(r) }} aria-label={r.name}>
      <div className="rs-rcard__inner">
        <div className="rs-rcard__cover">
          {cover
            ? <img src={cover} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            : <div className="rs-rcard__art"><DishVisual name={r.cuisine || r.name} size={112} spin={false} halo /></div>}
          <div className="rs-rcard__shade" aria-hidden="true" />
          <div className="rs-rcard__top">
            <Badge tone={r.open ? 'basil' : 'saffron'} dot pulse={r.open}>{r.open ? t('dir.open') : t('dir.closedShort')}</Badge>
            <FavButton on={fav} onToggle={() => onFav(r.slug)} labelOn={t('pub.removeFav')} labelOff={t('pub.addFav')} />
          </div>
          {dist && <span className="rs-rcard__dist"><Navigation size={13} /> {dist}</span>}
        </div>
        <div className="rs-rcard__body">
          <div className="rs-rcard__logo">
            {logoOk ? <img src={publicApi.logoUrl(r.slug)} alt="" onError={() => setLogoOk(false)} /> : (r.name || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div className="rs-rcard__head">
            <h3 className="rs-rcard__name">{r.name}</h3>
            <span className="rs-rcard__sub">{[r.cuisine, r.city].filter(Boolean).join(' · ') || r.address}</span>
          </div>
          <div className="rs-rcard__rating">
            {r.rating ? <RatingStars value={r.rating} size={14} count={r.ratingCount} /> : <Badge tone="sky">{t('dir.noRating')}</Badge>}
          </div>
          <div className="rs-rcard__tags">
            {r.acceptOrders && r.delivery && <span><Bike size={14} /> {r.deliveryFeeHtg > 0 ? t('dir.fee', { fee: money(r.deliveryFeeHtg, 0) }) : t('dir.freeDelivery')}</span>}
            {r.acceptOrders && r.pickup && <span><Store size={14} /> {t('dir.pickup')}</span>}
            {r.acceptReservations && <span><CalendarDays size={14} /> {t('dir.reserve')}</span>}
            {r.acceptOrders && <span><Clock size={14} /> {t('dir.prep', { min: r.prepMinutes })}</span>}
          </div>
        </div>
      </div>
    </article>
  )
}

function InstallBanner({ t }) {
  const { canInstall, install, iosHint, dismissed, dismiss } = usePlusRestoPwa()
  if (dismissed || (!canInstall && !iosHint)) return null
  return (
    <div className="rs-install rs-glass" role="region" aria-label={t('dir.installTitle')}>
      <div className="rs-install__icon"><img src="/plus-resto-192.png" alt="" /></div>
      <div className="rs-install__text">
        <b>{t('dir.installTitle')}</b>
        <span>{iosHint ? <><Share size={13} /> {t('dir.iosHint')}</> : t('dir.installText')}</span>
      </div>
      {canInstall && <Btn size="sm" icon={Download} onClick={install}>{t('dir.install')}</Btn>}
      <button type="button" className="rs-install__x" onClick={dismiss} aria-label={t('dir.later')}><X size={16} /></button>
    </div>
  )
}

export default function RestoDirectory() {
  const { t, i18n, lang } = useRT()
  const navigate = useNavigate()
  const [theme, toggleTheme] = useRestoTheme('resto-portal-theme')
  const loc = useLocation()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState(() => load('plusresto-city', ''))
  const [filter, setFilter] = useState('') // '' | open | delivery | fav
  const [favs, setFavs] = useState(() => load(FAV_KEY, []))
  const q = useDebounced(search.trim(), 350)

  useEffect(() => { document.title = `${t('dir.brand')} · ${t('dir.title')}` }, [t, lang])
  useEffect(() => store('plusresto-city', city), [city])
  useEffect(() => { try { sessionStorage.setItem('plusresto-dir', '1') } catch { /* */ } }, [])

  const params = useMemo(() => ({
    ...(loc.pos ? { lat: loc.pos.lat, lng: loc.pos.lng } : {}),
    ...(q ? { q } : {}),
    ...(city ? { city } : {}),
    ...(filter === 'open' ? { open: 1 } : {}),
    ...(filter === 'delivery' ? { delivery: 1 } : {}),
  }), [loc.pos, q, city, filter])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['plusresto-dir', params], queryFn: () => publicApi.directory(params),
    staleTime: 60000, placeholderData: keepPreviousData,
  })
  const all = useMemo(() => data?.restaurants || [], [data])
  const list = filter === 'fav' ? all.filter((r) => favs.includes(r.slug)) : all
  const cities = data?.cities || []

  const toggleFav = (slug) => setFavs((f) => { const n = f.includes(slug) ? f.filter((x) => x !== slug) : [...f, slug]; store(FAV_KEY, n); return n })
  const open = (r) => navigate(`/resto/${r.slug}`, { state: { fromDir: true } })

  const chips = [
    { id: '', label: t('common.all') },
    { id: 'open', label: t('dir.filterOpen') },
    { id: 'delivery', label: t('dir.filterDelivery'), icon: Bike },
    ...(favs.length ? [{ id: 'fav', label: t('pub.favorites'), icon: Heart, count: favs.length }] : []),
  ]

  const searchRef = useRef(null)
  return (
    <Stage theme={theme} className="rs-app rs-dir">
      <div className="rs-app__inner">
        <header className="rs-topbar">
          <div className="rs-brand">
            <div className="rs-brand__logo rs-brand__logo--app"><img src="/plus-resto-192.png" alt="" onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('P')) }} /></div>
            <div style={{ minWidth: 0 }}>
              <h1 className="rs-brand__name">{t('dir.brand')}</h1>
              <span className="rs-brand__sub"><MapPin size={13} /> {loc.pos ? t('dir.located') : (city || t('dir.allCities'))}</span>
            </div>
          </div>
          <LangSwitch i18n={i18n} lang={lang} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
        </header>

        <section className="rs-dir__hero rs-glass" ref={searchRef}>
          <div className="rs-dir__glow" aria-hidden="true" />
          <h2 className="rs-dir__title">{t('dir.title')}</h2>
          <p className="rs-dir__sub">{t('dir.subtitle')}</p>
          <SearchField value={search} onChange={setSearch} placeholder={t('dir.search')} label={t('dir.search')} className="rs-dir__search" />
          <div className="rs-dir__row">
            <Btn variant={loc.pos ? 'success' : 'primary'} icon={loc.state === 'loading' ? Loader2 : LocateFixed}
              className={cx(loc.state === 'loading' && 'is-spin')} onClick={loc.pos ? loc.clear : loc.locate} disabled={loc.state === 'loading'}>
              {loc.state === 'loading' ? t('dir.locating') : loc.pos ? t('dir.located') : t('dir.nearMe')}
            </Btn>
            {cities.length > 0 && (
              <select className="rs-input rs-dir__city" value={city} onChange={(e) => setCity(e.target.value)} aria-label={t('dir.city')}>
                <option value="">{t('dir.allCities')}</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
          {loc.state === 'denied' && <div className="rs-alert rs-alert--warn" style={{ marginTop: 12 }}>{t('dir.locDenied')}</div>}
        </section>

        <InstallBanner t={t} />

        <div className="rs-dir__bar">
          <Chips items={chips} value={filter} onChange={setFilter} label={t('dir.title')} />
          {data && <span className={cx('rs-dir__count', isFetching && 'is-busy')}>{t('dir.count', { count: list.length })}</span>}
        </div>

        {isLoading ? <SkeletonGrid count={6} height={300} /> : isError ? (
          <Empty icon={UtensilsCrossed} title={t('common.error')} action={<Btn onClick={() => window.location.reload()}>{t('common.retry')}</Btn>} />
        ) : !list.length ? (
          (data?.total || 0) === 0
            ? <Empty icon={UtensilsCrossed} title={t('dir.none')} text={t('dir.noneText')} />
            : <Empty icon={UtensilsCrossed} title={t('dir.empty')} text={t('dir.emptyText')}
                action={<Btn variant="glass" onClick={() => { setSearch(''); setCity(''); setFilter('') }}>{t('dir.allCities')}</Btn>} />
        ) : (
          <div className="rs-rgrid">
            {list.map((r, i) => <RestoCard key={r.slug} r={r} index={i} t={t} fav={favs.includes(r.slug)} onFav={toggleFav} onOpen={open} />)}
          </div>
        )}

        <footer className="rs-dir__foot">Plus Resto · <a href="https://wa.me/50942449024" target="_blank" rel="noreferrer">PLUS GROUP</a></footer>
      </div>
    </Stage>
  )
}
