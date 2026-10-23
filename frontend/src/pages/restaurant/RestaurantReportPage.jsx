// src/pages/restaurant/RestaurantReportPage.jsx
// ─── Rapò vant restoran (mèt la + kesye) ──────────────────────────────
// Admin wè tout vant yo (ka filtre pa kesye); kesye wè SÈLMAN pwòp vant li
// (backend lan fòse sa). Bouton "Enprime" bay yon rapò 80 mm an franse.
import { useState, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { BarChart3, Printer, Wallet, Receipt, Percent, Users, Store, Globe, UtensilsCrossed, Clock, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi } from './restoApi'
import { printSalesReport, tenantReceiptNote } from './restoPrint'
import {
  Stage, Hero, Stats, Stat, Btn, Badge, Seg, Field, Empty, SkeletonGrid, ThemeToggle, DishVisual,
  useRestoTheme, money, getTenantName, haitiToday, hhmm, cx,
} from './restoUI'

const firstOfMonth = () => `${haitiToday().slice(0, 8)}01`

// Ba orizontal anime (pa metòd, pa sous, pa kesye...)
export function BarList({ rows, labelOf, tone = 'paprika' }) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <ul className="rs-bars">
      {rows.map((r, i) => (
        <li key={r.key ?? r.name ?? i} style={{ '--d': `${i * 60}ms` }}>
          <div className="rs-bars__top"><span>{labelOf ? labelOf(r) : r.key}</span><b>{money(r.total, 0)}</b></div>
          <div className="rs-bars__track"><span className={`rs-bars__fill rs-bars__fill--${tone}`} style={{ width: `${(r.total / max) * 100}%` }} /></div>
          {r.count != null && <small>{r.count} ×</small>}
        </li>
      ))}
    </ul>
  )
}

// Grafik ba vètikal pa lè (0–23h) oswa pa jou
export function ColumnChart({ points, labelOf, highlightLast }) {
  const max = Math.max(1, ...points.map((p) => p.total))
  return (
    <div className="rs-cols" role="img">
      {points.map((p, i) => (
        <div key={i} className={cx('rs-cols__c', highlightLast && i === points.length - 1 && 'is-hi')} title={`${labelOf(p)} · ${money(p.total, 0)}`} style={{ '--d': `${i * 30}ms` }}>
          <span className="rs-cols__bar" style={{ height: `${Math.max(2, (p.total / max) * 100)}%` }} />
          <small>{labelOf(p)}</small>
        </div>
      ))}
    </div>
  )
}

function TopList({ items, t }) {
  return (
    <ul className="rs-lines">
      {items.map((it, i) => (
        <li key={it.name} className="rs-line" style={{ '--d': `${i * 40}ms` }}>
          <span className="rs-rank">{i + 1}</span>
          <DishVisual name={it.name} size={38} spin={false} />
          <div className="rs-line__info"><span className="rs-line__name">{it.name}</span><span className="rs-line__sub">{t('report.qty')}: {it.qty}</span></div>
          <span className="rs-line__amt">{money(it.total, 0)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function RestaurantReportPage() {
  const { t } = useRT()
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant, user } = useAuthStore()
  const tenantName = getTenantName(tenant)
  const today = haitiToday()
  const [preset, setPreset] = useState('today')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)

  const applyPreset = (p) => {
    setPreset(p)
    if (p === 'today') { setFrom(today); setTo(today) }
    if (p === 'yesterday') { const y = haitiToday(-1); setFrom(y); setTo(y) }
    if (p === 'week') { setFrom(haitiToday(-6)); setTo(today) }
    if (p === 'month') { setFrom(firstOfMonth()); setTo(today) }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-sales-report', from, to],
    queryFn: () => restoApi.salesReport({ from, to }),
    placeholderData: keepPreviousData,
  })
  const r = data?.report
  const methodLabel = (x) => t(`report.method.${x.key}`)
  const sourceLabel = (x) => t(`report.source.${x.key}`)
  const hours = useMemo(() => {
    if (!r) return []
    const map = Object.fromEntries(r.hourly.map((h) => [h.hour, h.total]))
    const used = r.hourly.map((h) => h.hour)
    const lo = used.length ? Math.min(...used, 10) : 10, hi = used.length ? Math.max(...used, 22) : 22
    return Array.from({ length: hi - lo + 1 }, (_, i) => ({ hour: lo + i, total: map[lo + i] || 0 }))
  }, [r])

  const doPrint = () => r && printSalesReport({
    tenantName, report: r, cashier: data.scope === 'cashier' ? data.cashier : null, note: tenantReceiptNote(tenant),
  })

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap">
        <Hero overline={tenantName} title={t('report.title')} subtitle={t('report.subtitle')} icon={BarChart3}
          actions={<>
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn icon={Printer} onClick={doPrint} disabled={!r}>{t('report.print')}</Btn>
          </>}>
          {r && (
            <Stats>
              <Stat index={0} icon={Wallet} tone="paprika" label={t('report.net')} value={money(r.totals.net, 0)} />
              <Stat index={1} icon={Receipt} tone="sky" label={t('report.count')} value={r.totals.count} />
              <Stat index={2} icon={TrendingUp} tone="basil" label={t('report.avgTicket')} value={money(r.totals.avgTicket, 0)} />
              <Stat index={3} icon={Percent} tone="saffron" label={t('report.discount')} value={money(r.totals.discount, 0)} />
            </Stats>
          )}
        </Hero>

        <div className="rs-toolbar">
          <Seg value={preset} onChange={applyPreset} options={[
            { id: 'today', label: t('report.today') }, { id: 'yesterday', label: t('report.yesterday') },
            { id: 'week', label: t('report.week') }, { id: 'month', label: t('report.month') },
          ]} />
          <div className="rs-row" style={{ flexWrap: 'nowrap' }}>
            <Field label={t('report.from')}><input type="date" className="rs-input" value={from} max={today} onChange={(e) => { setFrom(e.target.value); setPreset('custom') }} /></Field>
            <Field label={t('report.to')}><input type="date" className="rs-input" value={to} max={today} onChange={(e) => { setTo(e.target.value); setPreset('custom') }} /></Field>
          </div>
        </div>

        {data?.scope === 'cashier' && <div className="rs-alert rs-alert--info" style={{ marginBottom: 18 }}><Users size={16} /> {t('report.myOnly', { name: data.cashier || user?.fullName || '' })}</div>}

        {isLoading ? <SkeletonGrid count={4} height={220} className="rs-two" /> : !r || !r.totals.count ? (
          <Empty icon={BarChart3} title={t('report.empty')} />
        ) : (
          <div className="rs-col" style={{ gap: 18 }}>
            <div className="rs-two">
              <section className="rs-card rs-glass">
                <h2 className="rs-card__title"><Wallet size={18} /> {t('report.byMethod')}</h2>
                <BarList rows={r.byMethod} labelOf={methodLabel} tone="paprika" />
                <dl className="rs-totals">
                  <div><dt>{t('report.gross')}</dt><dd>{money(r.totals.gross)}</dd></div>
                  {r.totals.discount > 0 && <div><dt>{t('report.discount')}</dt><dd>-{money(r.totals.discount)}</dd></div>}
                  {r.totals.deliveryFees > 0 && <div><dt>{t('report.deliveryFees')}</dt><dd>{money(r.totals.deliveryFees)}</dd></div>}
                </dl>
                <div className="rs-total"><span className="rs-total__label">{t('report.net')}</span><span className="rs-total__val">{money(r.totals.net)}</span></div>
              </section>
              <section className="rs-card rs-glass" style={{ '--delay': '60ms' }}>
                <h2 className="rs-card__title"><Store size={18} /> {t('report.bySource')}</h2>
                <BarList rows={r.bySource} labelOf={sourceLabel} tone="sky" />
                {(r.byKind || []).length > 0 && (<>
                  <h2 className="rs-card__title" style={{ marginTop: 18 }}><UtensilsCrossed size={18} /> {t('kind.reportTitle')}</h2>
                  <BarList rows={r.byKind} labelOf={(x) => (x.key === 'drink' ? `🥤 ${t('kind.drink')}` : `🍽️ ${t('kind.food')}`)} tone="saffron" />
                </>)}
                {data.scope !== 'cashier' && r.byCashier.length > 0 && (<>
                  <h2 className="rs-card__title" style={{ marginTop: 18 }}><Users size={18} /> {t('report.byCashier')}</h2>
                  <BarList rows={r.byCashier} tone="saffron" />
                </>)}
                {r.byServer.length > 0 && (<>
                  <h2 className="rs-card__title" style={{ marginTop: 18 }}><UtensilsCrossed size={18} /> {t('report.byServer')}</h2>
                  <BarList rows={r.byServer} tone="basil" />
                </>)}
              </section>
            </div>

            <div className="rs-two">
              <section className="rs-card rs-glass" style={{ '--delay': '120ms' }}>
                <h2 className="rs-card__title"><Clock size={18} /> {t('report.hourly')}</h2>
                <ColumnChart points={hours} labelOf={(p) => `${p.hour}h`} />
              </section>
              <section className="rs-card rs-glass" style={{ '--delay': '180ms' }}>
                <h2 className="rs-card__title"><UtensilsCrossed size={18} /> {t('report.topItems')}</h2>
                <TopList items={r.topItems} t={t} />
                <h2 className="rs-card__title" style={{ marginTop: 18 }}>🥤 {t('kind.topDrinks')}</h2>
                {(r.topDrinks || []).length ? <TopList items={r.topDrinks} t={t} /> : <p className="rs-hint">{t('kind.noDrinks')}</p>}
              </section>
            </div>

            <section className="rs-card rs-glass" style={{ '--delay': '240ms' }}>
              <h2 className="rs-card__title"><Receipt size={18} /> {t('report.sales')} <Badge tone="neutral">{r.sales.length}</Badge></h2>
              <ul className="rs-lines">
                {r.sales.map((s, i) => (
                  <li key={s.id} className="rs-line" style={{ '--d': `${Math.min(i, 15) * 25}ms` }}>
                    <span className="rs-stat__icon rs-stat__icon--paprika">{s.source === 'online' ? <Globe size={16} /> : <Store size={16} />}</span>
                    <div className="rs-line__info">
                      <span className="rs-line__name">{s.label || t(`report.source.${s.source}`)}</span>
                      <span className="rs-line__sub">{r.from !== r.to ? `${s.at.slice(0, 10)} ` : ''}{hhmm(s.at)} · {t(`report.method.${s.method}`)}{s.cashier ? ` · ${s.cashier}` : ''}{s.server ? ` · ${s.server}` : ''}</span>
                    </div>
                    <span className="rs-line__amt">{money(s.total, 0)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </Stage>
  )
}