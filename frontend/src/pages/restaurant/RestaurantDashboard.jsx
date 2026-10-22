// src/pages/restaurant/RestaurantDashboard.jsx
// ─── Tablo bò restoran: vant jodi a, tab, kòmand an liy, rezèvasyon ───
// + RestoDashboardGate: deside si /app/dashboard montre tablo restoran an
//   oswa tablo jeneral la, epi bay admin lan yon bouton pou chanje.
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Wallet, Receipt, TrendingUp, TrendingDown, Armchair, ShoppingBag, CalendarDays, UtensilsCrossed,
  BarChart3, Globe, Clock, Users, ArrowRight, Store, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi, RESTO_PATHS } from './restoApi'
import { BarList, ColumnChart } from './RestaurantReportPage'
import {
  Stage, Hero, Stats, Stat, Btn, Badge, Empty, SkeletonGrid, ThemeToggle, DishVisual, useRestoTheme, useCountUp,
  money, getTenantName, dayParts, cx,
} from './restoUI'

const isAdminUser = (u) => u?.role === 'admin' || u?.isAdmin === true

export default function RestaurantDashboard({ onUseGeneral }) {
  const { t } = useRT()
  const navigate = useNavigate()
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant, user } = useAuthStore()
  const tenantName = getTenantName(tenant)

  // 60s: ti repons (agrega), pa lis — pou ekonomize trafik
  const { data, isLoading } = useQuery({ queryKey: ['restaurant-dashboard'], queryFn: restoApi.dashboard, refetchInterval: 60000 })
  const d = data?.dashboard
  const salesToday = useCountUp(d?.sales.today || 0, 900)

  const quick = [
    { to: RESTO_PATHS.tables, icon: Armchair, label: t('nav.tablesNav') },
    { to: RESTO_PATHS.orders, icon: ShoppingBag, label: t('nav.orders'), badge: d?.online.nouvo },
    { to: RESTO_PATHS.reservations, icon: CalendarDays, label: t('nav.reservations') },
    { to: RESTO_PATHS.menu, icon: UtensilsCrossed, label: t('nav.menuNav') },
    { to: RESTO_PATHS.report, icon: BarChart3, label: t('nav.report') },
  ]

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap">
        <Hero overline={tenantName} title={t('dash.title')} subtitle={t('dash.subtitle')} icon={LayoutDashboard}
          actions={<>
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            {onUseGeneral && isAdminUser(user) && <Btn variant="glass" icon={LayoutDashboard} onClick={onUseGeneral}>{t('dash.useGeneral')}</Btn>}
          </>}>
          {d && (
            <div className="rs-kpi">
              <div className="rs-kpi__main">
                <span className="rs-overline">{t('dash.salesToday')}</span>
                <b className="rs-kpi__val">{money(salesToday, 0)}</b>
                {d.sales.changePct == null
                  ? <span className="rs-hint">{t('dash.noCompare')}</span>
                  : <Badge tone={d.sales.changePct >= 0 ? 'basil' : 'chili'} icon={d.sales.changePct >= 0 ? TrendingUp : TrendingDown}>{t('dash.vsYesterday', { pct: (d.sales.changePct > 0 ? '+' : '') + d.sales.changePct })}</Badge>}
              </div>
              <div className="rs-kpi__spark"><ColumnChart points={d.last7} labelOf={(p) => dayParts(t, p.date).dow} highlightLast /></div>
            </div>
          )}
          {d && (
            <Stats>
              <Stat index={0} icon={Receipt} tone="sky" label={t('dash.orders')} value={d.sales.count} />
              <Stat index={1} icon={Wallet} tone="basil" label={t('dash.avgTicket')} value={money(d.sales.avgTicket, 0)} />
              <Stat index={2} icon={Armchair} tone="paprika" label={t('dash.tablesBusy')} value={`${d.tables.busy} / ${d.tables.total}`} />
              <Stat index={3} icon={ShoppingBag} tone="saffron" label={t('dash.newOnline')} value={d.online.nouvo} />
            </Stats>
          )}
        </Hero>

        <div className="rs-quick-grid">
          {quick.map((q, i) => (
            <button key={q.to} type="button" className="rs-quick-tile rs-glass" style={{ '--delay': `${i * 50}ms` }} onClick={() => navigate(q.to)}>
              <span className="rs-stat__icon rs-stat__icon--paprika"><q.icon size={20} /></span>
              <span>{q.label}</span>
              {q.badge ? <span className="rs-quick-tile__badge">{q.badge}</span> : <ArrowRight size={16} className="rs-quick-tile__arrow" />}
            </button>
          ))}
        </div>

        {isLoading ? <SkeletonGrid count={4} height={220} className="rs-two" /> : !d ? null : (
          <div className="rs-col" style={{ gap: 18 }}>
            <div className="rs-two">
              <section className="rs-card rs-glass">
                <h2 className="rs-card__title"><Clock size={18} /> {t('dash.hourly')}</h2>
                {d.hourly.length ? <ColumnChart points={(() => {
                  const map = Object.fromEntries(d.hourly.map((h) => [h.hour, h.total])); const used = d.hourly.map((h) => h.hour)
                  const lo = Math.min(...used, 10), hi = Math.max(...used, 21)
                  return Array.from({ length: hi - lo + 1 }, (_, i) => ({ hour: lo + i, total: map[lo + i] || 0 }))
                })()} labelOf={(p) => `${p.hour}h`} /> : <p className="rs-hint">{t('dash.noSales')}</p>}
              </section>
              <section className="rs-card rs-glass" style={{ '--delay': '60ms' }}>
                <h2 className="rs-card__title"><UtensilsCrossed size={18} /> {t('dash.topDishes')}</h2>
                {!d.topItems.length ? <p className="rs-hint">{t('dash.noSales')}</p> : (
                  <ul className="rs-lines">
                    {d.topItems.map((it, i) => (
                      <li key={it.name} className="rs-line" style={{ '--d': `${i * 50}ms` }}>
                        <span className="rs-rank">{i + 1}</span>
                        <DishVisual name={it.name} size={42} spin={false} />
                        <div className="rs-line__info"><span className="rs-line__name">{it.name}</span><span className="rs-line__sub">× {it.qty}</span></div>
                        <span className="rs-line__amt">{money(it.total, 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="rs-two">
              <section className="rs-card rs-glass" style={{ '--delay': '120ms' }}>
                <h2 className="rs-card__title"><Wallet size={18} /> {t('dash.byMethod')}</h2>
                {d.byMethod.length ? <BarList rows={d.byMethod} labelOf={(x) => t(`report.method.${x.key}`)} /> : <p className="rs-hint">{t('dash.noSales')}</p>}
                {d.bySource.length > 0 && (<>
                  <h2 className="rs-card__title" style={{ marginTop: 18 }}><Store size={18} /> {t('dash.bySource')}</h2>
                  <BarList rows={d.bySource} labelOf={(x) => t(`report.source.${x.key}`)} tone="sky" />
                </>)}
                {d.tables.openOrders > 0 && <div className="rs-alert rs-alert--info" style={{ marginTop: 14 }}><Armchair size={16} /> {t('dash.openAmount', { amount: money(d.tables.openTotal, 0) })}</div>}
              </section>
              <section className="rs-card rs-glass" style={{ '--delay': '180ms' }}>
                <h2 className="rs-card__title"><Sparkles size={18} /> {t('dash.live')}</h2>
                <div className="rs-info-grid" style={{ marginBottom: 14 }}>
                  <button type="button" className="rs-info" style={{ cursor: 'pointer', color: 'inherit', textAlign: 'left' }} onClick={() => navigate(RESTO_PATHS.orders)}>
                    <Globe size={16} /><div><div className="rs-label">{t('dash.newOnline')}</div><b className="rs-mono">{d.online.nouvo}</b></div>
                  </button>
                  <button type="button" className="rs-info" style={{ cursor: 'pointer', color: 'inherit', textAlign: 'left' }} onClick={() => navigate(RESTO_PATHS.orders)}>
                    <ShoppingBag size={16} /><div><div className="rs-label">{t('dash.activeOnline')}</div><b className="rs-mono">{d.online.active}</b></div>
                  </button>
                  <button type="button" className="rs-info" style={{ cursor: 'pointer', color: 'inherit', textAlign: 'left' }} onClick={() => navigate(RESTO_PATHS.reservations)}>
                    <CalendarDays size={16} /><div><div className="rs-label">{t('dash.resvToday')}</div><b className="rs-mono">{d.reservations.count} · {t('common.people', { count: d.reservations.guests })}</b></div>
                  </button>
                </div>
                <span className="rs-label">{t('dash.upcoming')}</span>
                {!d.reservations.upcoming.length ? <p className="rs-hint">{t('dash.noUpcoming')}</p> : (
                  <ul className="rs-lines">
                    {d.reservations.upcoming.map((r, i) => (
                      <li key={r.code} className="rs-line" style={{ '--d': `${i * 50}ms` }}>
                        <span className="rs-badge rs-badge--paprika" style={{ height: 30, fontSize: 13 }}>{r.time}</span>
                        <div className="rs-line__info"><span className="rs-line__name">{r.name}</span><span className="rs-line__sub"><Users size={12} /> {r.party}{r.table ? ` · ${r.table}` : ''}</span></div>
                        <Badge tone={r.status === 'konfime' ? 'sky' : 'saffron'}>{t(`resv.status.${r.status}`)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </Stage>
  )
}

// ══════════════════════════════════════════════
// Gate pou /app/dashboard
// ══════════════════════════════════════════════
export function RestoDashboardGate({ fallback }) {
  const { t } = useRT()
  const qc = useQueryClient()
  const { tenant, user } = useAuthStore()
  const restoOn = tenant?.allowedPages?.restaurant === true
  const { data: prefs, isLoading } = useQuery({ queryKey: ['restaurant-prefs'], queryFn: restoApi.prefs, enabled: restoOn, staleTime: 5 * 60 * 1000, retry: false })
  const m = useMutation({
    mutationFn: (mode) => restoApi.setPrefs(mode),
    onSuccess: (p) => { qc.setQueryData(['restaurant-prefs'], p); toast.success(t('dash.switched')) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  if (!restoOn) return fallback
  if (isLoading) return null
  if (prefs?.useRestoDashboard) return <RestaurantDashboard onUseGeneral={() => m.mutate('general')} />
  return (
    <>
      {isAdminUser(user) && (
        <div className="rs" data-theme="light" style={{ background: 'none' }}>
          <div className="rs-switch-banner">
            <span className="rs-stat__icon rs-stat__icon--paprika"><UtensilsCrossed size={18} /></span>
            <span className="rs-switch-banner__text">{t('dash.switchHint')}</span>
            <Btn size="sm" icon={LayoutDashboard} loading={m.isPending} onClick={() => m.mutate('resto')}>{t('dash.useResto')}</Btn>
          </div>
        </div>
      )}
      {fallback}
    </>
  )
}
