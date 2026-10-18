// src/pages/dashboard/Dashboard.jsx — Plus Fit redesign
// ✅ KORIJE:
//   • Grafik 7 jou a te kalkile jou yo ak lè telefòn nan (pa lè Ayiti) → apre 7è diswa
//     (lè Etazini/UTC) ba « jodi a » te ka tonbe sou move jou
//   • Dat dènye fakti yo pa t an lè Ayiti, e paj la te kraze si yon fakti pa t gen dat
//   • Non kliyan te parèt « — » pou fakti ki gen kliyan rapid (clientSnapshot)
//   • Liy fakti yo te sanble klikab (cursor) men se sèlman ti flèch la ki te mache
//   • Fakti « an reta » (overdue) te parèt kòm « pa peye »
//   • Bouton « Nouvo devi » te toujou la, menm si tenant lan pa gen aksè Devi; kounye a
//     bouton prensipal la se « Nouvo fakti » oswa « Nouvo devi » selon Paramèt « Obligye devi »
//   • Bann abònman an te kole anba ekran an (position fixed) e li te kache meni anba
//     telefòn nan ak dènye liy yo → kounye a se yon kat nòmal anba paj la (admin sèlman)
//   • localStorage ki pa disponib (navigatè prive) te ka kraze paj la
//   • Tikèt « Plan » te parèt pou kesye yo tou
// ✅ NOUVO:
//   • Chif yo anime, kat KPI glise sou telefòn
//   • Tuil Sesyon Kès ak Kontwòl Estòk (paj yo te egziste men yo pa t sou tablo a)
//   • Rechèch nan aksè rapid yo, ti pwen wouj sou tuil ki bezwen atansyon
//   • Grafik 7 jou: total semèn nan, jodi a vs yè (%), pi bon jou
//   • Estòk ba: ba nivo, « fini » an wouj
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  Receipt, Package, AlertTriangle, TrendingUp, ArrowRight, CheckCircle2, Clock, Plus, User,
  Search, X, Lock, MessageCircle, BarChart3, FileText, Crown, Sparkles, RefreshCw,
} from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import ProfitSection from './ProfitSection'
import { TZ, fmt, fmt0, fmtK, tr, todayHT, addDays, dayOfWeek, useCountUp, Delta, Bars } from './dashboardUI'
import '../invoices/invoices.css'

const HT_DAYS = ['Dimanch', 'Lendi', 'Madi', 'Mèkredi', 'Jedi', 'Vandredi', 'Samdi']
const HT_DAYS_SHORT = ['Dim', 'Len', 'Mad', 'Mèk', 'Jed', 'Van', 'Sam']
const HT_MONTHS = ['Janvye', 'Fevriye', 'Mas', 'Avril', 'Me', 'Jen', 'Jiyè', 'Out', 'Septanm', 'Oktòb', 'Novanm', 'Desanm']
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

const LABELS = {
  salesToday:   { ht: 'Vant jodi a',     fr: 'Ventes du jour',     en: "Today's sales",  es: 'Ventas de hoy' },
  mySalesToday: { ht: 'Vant pa m',       fr: 'Mes ventes',         en: 'My sales',       es: 'Mis ventas' },
  paid:         { ht: 'Kòb ki antre',    fr: 'Encaissé',           en: 'Cash in',        es: 'Cobrado' },
  balance:      { ht: 'Pa peye jodi a',  fr: 'Impayé du jour',     en: 'Unpaid today',   es: 'No pagado hoy' },
  partial:      { ht: 'Kredi jodi a',    fr: 'Crédit du jour',     en: 'Credit today',   es: 'Crédito de hoy' },
}

const STATUS = {
  paid:      { label: 'Peye',     c: 'var(--ok)',   bg: 'var(--okBg)' },
  partial:   { label: 'Pasyèl',   c: 'var(--warn)', bg: 'var(--warnBg)' },
  unpaid:    { label: 'Pa peye',  c: 'var(--bad)',  bg: 'var(--badBg)' },
  overdue:   { label: 'An reta',  c: '#9A3412',     bg: 'rgba(154,52,18,.1)' },
  cancelled: { label: 'Anile',    c: 'var(--gray)', bg: 'var(--grayBg)' },
}

const convLine = (htg, rates = {}, vis = []) => {
  const parts = vis.map(c => { const r = Number(rates[c] || 0); return r ? `≈ ${CURRENCY_SYMBOLS[c] || c}${fmt(htg / r)}` : null }).filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

// Menm lojik ak ProtectedPage nan App.jsx
const isPageAllowed = (tenant, pageKey) => {
  if (!pageKey) return true
  const ap = tenant?.allowedPages
  return !(ap && typeof ap === 'object' && ap[pageKey] === false)
}

function HeroKpi({ label, value, sub, icon: Icon, tone = '', delay = 0, loading }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      {loading ? <div className="iv-sk" style={{ height: 22, width: '70%', marginTop: 8, opacity: .25 }}/> : <div className="v">{fmt0(v)}<small>HTG</small></div>}
      {sub && <div className="s" title={sub}>{sub}</div>}
    </div>
  )
}

function KpiLink({ to, label, value, sub, icon: Icon, color, money, delay }) {
  const v = useCountUp(value)
  return (
    <Link to={to}>
      <div className="rp-kpi" style={{ '--kc': color, animationDelay: `${delay}ms` }}>
        <div className="l"><i><Icon size={14}/></i> {label} <ArrowRight size={12} style={{ marginLeft: 'auto' }}/></div>
        <div className="v" style={{ color }}>{money ? fmt0(v) : Math.round(v)}{money && <small>HTG</small>}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user, tenant } = useAuthStore()
  const navigate = useNavigate()
  const [tileQ, setTileQ] = useState('')

  const lang = (i18n?.language || 'ht').substring(0, 2)
  const lbl = (k) => LABELS[k]?.[lang] || LABELS[k]?.ht || k
  const isAdmin = user?.role === 'admin'
  const showRate = tenant?.showExchangeRate !== false
  const rates = tenant?.exchangeRates || {}
  const vis = Array.isArray(tenant?.visibleCurrencies) ? tenant.visibleCurrencies : []
  const conv = (n) => (showRate ? convLine(n, rates, vis) : null)
  const requireQuote = tenant?.requireQuote === true
  let branchId
  try { branchId = localStorage.getItem('plusgroup-branch-id') || undefined } catch { branchId = undefined }

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-full', branchId],
    queryFn: () => api.get('/dashboard/full', { params: { ...(branchId && { branchId }) } }).then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  })

  const dashboard = data?.dashboard
  const today = data?.today
  const lowStock = data?.lowStock || []
  const salesDaily = data?.salesDaily || []

  // ── Chif jodi a ──
  const totalVentesJodi = Number(data?.todayTotalVentes || 0)
  const myTodaySales = Number(data?.myTodaySales?.total || 0)
  const myTodaySalesCount = Number(data?.myTodaySales?.count || 0)
  // Kòb ki antre = fakti peye konplè + depo sou fakti pasyèl yo
  const totalPayeJodi = Number(today?.totalPaid?._sum?.totalHtg || 0) + Number(today?.totalPartial?._sum?.amountPaidHtg || 0)
  const nbFaktiPayeJodi = Number(today?.totalPaid?._count || 0) + Number(today?.totalPartial?._count || 0)
  const totalImpayeJodi = Number(today?.totalUnpaid?._sum?.balanceDueHtg || 0)
  const totalPasyalJodi = Number(today?.totalPartial?._sum?.balanceDueHtg || 0)
  const totalImpaye = Number(dashboard?.totalUnpaid?._sum?.balanceDueHtg || 0)
  const totalPaye = Number(dashboard?.totalPaid?._sum?.totalHtg || 0)
  const totalPasyal = Number(dashboard?.totalPartial?._sum?.balanceDueHtg || 0)

  // ── Grafik 7 jou (lè Ayiti) ──
  const tday = todayHT()
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const key = addDays(tday, i - 6)
    const found = salesDaily.find(x => String(x.date).startsWith(key))
    const dow = dayOfWeek(key)
    const [, m, d] = key.split('-')
    return { key, label: i === 6 ? 'Jodi a' : HT_DAYS_SHORT[dow], tip: `${HT_DAYS[dow]} ${d}/${m}`, values: { v: Number(found?.total_htg || 0) } }
  }), [salesDaily, tday])
  const weekTotal = week.reduce((s, d) => s + d.values.v, 0)
  const best = week.reduce((b, d) => (d.values.v > (b?.values.v || 0) ? d : b), null)
  const todayV = week[6].values.v, yestV = week[5].values.v

  // ── Abònman ──
  const subBanner = useMemo(() => {
    if (!tenant?.subscriptionEndsAt) return null
    const daysLeft = Math.ceil((new Date(tenant.subscriptionEndsAt) - Date.now()) / 864e5)
    return daysLeft > 5 ? null : { expired: daysLeft < 0, daysLeft }
  }, [tenant?.subscriptionEndsAt])
  const waLink = `https://wa.me/50942449024?text=${encodeURIComponent(`🏢 *PLUS GROUP*\n\n📋 *Antrepriz:* ${tenant?.name || 'N/A'}\n\nBonjou, mwen vle renouvle abònman mwen an. Mèsi!`)}`

  // ── Salitasyon + dat (lè Ayiti) ──
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false, weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
    .formatToParts(new Date()).map(p => [p.type, p.value]))
  const hour = Number(parts.hour) % 24
  const greet = hour < 12 ? tr(t, 'dashboard.greetingMorning', 'Bonjou') : hour < 18 ? tr(t, 'dashboard.greetingAfternoon', 'Bon apremidi') : tr(t, 'dashboard.greetingEvening', 'Bonswa')
  const dateLine = lang === 'ht'
    ? `${HT_DAYS[dayOfWeek(tday)]} ${Number(parts.day)} ${HT_MONTHS[Number(parts.month) - 1]} ${parts.year}`
    : new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = (user?.fullName || '').trim().split(/\s+/)[0]

  // ── Aksyon prensipal ──
  const canInv = isPageAllowed(tenant, 'invoices'), canQuote = isPageAllowed(tenant, 'quotes')
  const primary = !requireQuote && canInv
    ? { to: '/app/invoices/new', label: tr(t, 'dashboard.newInvoice', 'Nouvo fakti'), icon: Receipt }
    : canQuote ? { to: '/app/quotes/new', label: tr(t, 'dashboard.newQuote', 'Nouvo devi'), icon: FileText } : null

  // ── Tuil yo ──
  const unpaidCount = Number(dashboard?.totalUnpaid?._count || 0)
  const SECTIONS = useMemo(() => {
    const L = (k, fb) => tr(t, k, fb)
    const s = [
      { title: L('dashboard.sections.sales', 'Vant'), tiles: [
        { pageKey: 'invoices', icon: '🧾', name: L('dashboard.tiles.invoices', 'Fakti'), badge: `${unpaidCount} ${L('dashboard.tiles.active', 'aktif')}`, dot: unpaidCount, g: 'linear-gradient(135deg,#1B2A8F,#2D3FBF)', path: '/app/invoices' },
        { pageKey: 'quotes', icon: '📋', name: L('nav.quotes', 'Devi'), badge: L('dashboard.tiles.quotesNew', 'Nouvo'), g: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', path: '/app/quotes' },
        { pageKey: 'direct-quotes', icon: '🔖', name: L('nav.directQuotes', 'Devi dirèk'), badge: L('dashboard.tiles.quotesNew', 'Nouvo'), g: 'linear-gradient(135deg,#a855f7,#7c3aed)', path: '/app/direct-quotes' },
        { pageKey: 'clients', icon: '👤', name: L('nav.clients', 'Kliyan'), badge: L('dashboard.tiles.manage', 'Jere'), g: 'linear-gradient(135deg,#059669,#047857)', path: '/app/clients' },
        { pageKey: 'kes-sesyon', icon: '🗃️', name: L('nav.cashSession', 'Sesyon kès'), badge: 'Louvri / fèmen', g: 'linear-gradient(135deg,#10B981,#065F46)', path: '/app/kes-sesyon' },
        { pageKey: 'reports', icon: '📊', name: L('nav.reports', 'Rapò'), badge: L('dashboard.tiles.analytics', 'Analiz'), g: 'linear-gradient(135deg,#38BDF8,#0369A1)', path: '/app/reports' },
      ] },
      { title: L('dashboard.sections.stock', 'Estòk'), tiles: [
        { pageKey: 'products', icon: '📦', name: L('nav.products', 'Pwodui'), badge: L('dashboard.tiles.catalog', 'Katalòg'), g: 'linear-gradient(135deg,#f97316,#c2410c)', path: '/app/products' },
        { pageKey: 'stock', icon: '🏭', name: L('nav.stock', 'Estòk'), badge: `${lowStock.length} ${L('dashboard.tiles.alerts', 'alèt')}`, dot: lowStock.length, g: 'linear-gradient(135deg,#14b8a6,#0f766e)', path: '/app/stock' },
        { pageKey: 'estok-kontwol', icon: '✅', name: L('nav.stockControl', 'Kontwòl estòk'), badge: 'Konte', g: 'linear-gradient(135deg,#0EA5E9,#0F766E)', path: '/app/estok-kontwol' },
      ] },
      { title: L('dashboard.sections.finance', 'Finans'), tiles: [
        { pageKey: 'kane', icon: '💰', name: L('dashboard.tiles.kane', 'Kanè'), badge: L('dashboard.tiles.cash', 'Kach'), g: 'linear-gradient(135deg,#C9A84C,#8B6914)', path: '/app/kane' },
        { pageKey: 'kane-epay', icon: '💳', name: L('dashboard.tiles.kaneEpay', 'Kanè epay'), badge: L('dashboard.tiles.payment', 'Peman'), g: 'linear-gradient(135deg,#ec4899,#be185d)', path: '/app/kane-epay' },
        { pageKey: 'expenses', icon: '🧮', name: L('dashboard.tiles.expenses', 'Depans'), badge: L('dashboard.tiles.manage', 'Jere'), g: 'linear-gradient(135deg,#0891b2,#155e75)', path: '/app/expenses' },
        { pageKey: null, adminOnly: true, icon: '📈', name: L('dashboard.tiles.finances', 'Finans'), badge: L('dashboard.tiles.admin', 'Admin'), g: 'linear-gradient(135deg,#16a34a,#166534)', path: '/app/finances' },
        { pageKey: null, adminOnly: true, icon: '💎', name: L('dashboard.tiles.plans', 'Plan'), badge: L('dashboard.tiles.plan', 'Abònman'), g: 'linear-gradient(135deg,#a855f7,#6b21a8)', path: '/app/plans' },
      ] },
      { title: L('dashboard.sections.enterprise', 'Biznis'), tiles: [
        { pageKey: 'sabotay', icon: '📱', name: L('dashboard.tiles.sabotay', 'Sabotay'), badge: L('dashboard.tiles.sol', 'Sol'), g: 'linear-gradient(135deg,#06b6d4,#0e7490)', path: '/app/sabotay' },
        { pageKey: 'mobilpay', icon: '📲', name: L('dashboard.tiles.mobilpay', 'MobilPay'), badge: L('dashboard.tiles.payment', 'Peman'), g: 'linear-gradient(135deg,#ef4444,#991b1b)', path: '/app/mobilpay' },
        { pageKey: 'hotel', icon: '🏨', name: L('dashboard.tiles.hotel', 'Otèl'), badge: L('dashboard.tiles.reservation', 'Rezèvasyon'), g: 'linear-gradient(135deg,#7c3aed,#5b21b6)', path: '/app/hotel' },
        { pageKey: 'restaurant', icon: '🍽️', name: L('nav.restaurant', 'Restoran'), badge: L('dashboard.tiles.restaurantBadge', 'Meni'), g: 'linear-gradient(135deg,#DC2626,#991B1B)', path: '/app/restaurant/menu' },
        { pageKey: 'dry', icon: '👔', name: L('dashboard.tiles.dry', 'Dry clean'), badge: L('dashboard.tiles.order', 'Kòmand'), g: 'linear-gradient(135deg,#0d9488,#115e59)', path: '/app/dry' },
        { pageKey: 'pre', icon: '🏦', name: L('dashboard.tiles.pre', 'Prè'), badge: L('dashboard.tiles.loan', 'Kredi'), g: 'linear-gradient(135deg,#d97706,#92400e)', path: '/app/pre' },
        { pageKey: 'pre', icon: '📖', name: L('dashboard.tiles.preGuide', 'Gid prè'), badge: L('dashboard.tiles.info', 'Info'), g: 'linear-gradient(135deg,#b45309,#78350f)', path: '/app/mikwo-kredi-gid' },
        { pageKey: 'pre', adminOnly: true, icon: '💹', name: L('dashboard.tiles.preProfit', 'Profi prè'), badge: L('dashboard.tiles.admin', 'Admin'), g: 'linear-gradient(135deg,#065f46,#022c22)', path: '/app/mikwo-profit' },
      ] },
      { title: L('dashboard.sections.admin', 'Administrasyon'), tiles: [
        { pageKey: 'employees', icon: '🧑‍💼', name: L('dashboard.tiles.employees', 'Anplwaye'), badge: L('dashboard.tiles.hr', 'RH'), g: 'linear-gradient(135deg,#475569,#1e293b)', path: '/app/employees' },
        { pageKey: 'branches', icon: '🏬', name: L('nav.branches', 'Branch'), badge: L('dashboard.tiles.manage', 'Jere'), g: 'linear-gradient(135deg,#334155,#0f172a)', path: '/app/branches' },
        { pageKey: 'users', icon: '🔑', name: L('dashboard.tiles.users', 'Itilizatè'), badge: L('dashboard.tiles.account', 'Kont'), g: 'linear-gradient(135deg,#57534e,#292524)', path: '/app/settings/users' },
        { pageKey: 'settings', icon: '⚙️', name: L('nav.settings', 'Paramèt'), badge: L('dashboard.tiles.config', 'Konfig'), g: 'linear-gradient(135deg,#64748b,#334155)', path: '/app/settings' },
        { pageKey: null, icon: '🖨️', name: L('dashboard.tiles.printerTest', 'Tès enprimant'), badge: L('dashboard.tiles.pos', 'POS'), g: 'linear-gradient(135deg,#0EA5E9,#0369A1)', path: '/app/printer-test' },
      ] },
    ]
    return s.map(sec => ({ ...sec, tiles: sec.tiles.filter(x => isPageAllowed(tenant, x.pageKey) && (!x.adminOnly || isAdmin)) })).filter(sec => sec.tiles.length)
  }, [unpaidCount, lowStock.length, tenant, isAdmin, t])

  const tileCount = SECTIONS.reduce((s, x) => s + x.tiles.length, 0)
  const q = tileQ.trim().toLowerCase()
  const shownSections = q ? SECTIONS.map(s => ({ ...s, tiles: s.tiles.filter(x => `${x.name} ${x.badge} ${s.title}`.toLowerCase().includes(q)) })).filter(s => s.tiles.length) : SECTIONS

  const recent = dashboard?.recentInvoices || []
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-HT', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  return (
    <div className="iv" style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 24 }}>
      {/* ══════════ ABÒNMAN ══════════ */}
      {subBanner && (
        <div className={`db-sub ${subBanner.expired ? 'exp' : 'warn'}`}>
          <span className="ic">{subBanner.expired ? <Lock size={20}/> : <Clock size={20}/>}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b style={{ fontSize: 14 }}>{subBanner.expired ? tr(t, 'dashboard.subscriptionExpired', 'Abònman ou ekspire') : tr(t, 'dashboard.subscriptionExpiring', `Abònman ou ap fini nan ${subBanner.daysLeft} jou`).replace('{{days}}', subBanner.daysLeft)}</b>
            <p style={{ margin: '2px 0 0', fontSize: 12, opacity: .8 }}>{tr(t, 'dashboard.contactAdmin', 'Renouvle l pou w pa pèdi aksè.')}</p>
          </div>
          <a href={waLink} target="_blank" rel="noreferrer"><MessageCircle size={14}/> Renouvle via WhatsApp</a>
        </div>
      )}

      {/* ══════════ HERO ══════════ */}
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico gold"><Crown size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'PLUS GROUP'} · {tr(t, 'dashboard.tableBoard', 'Tablo de bò')}</p>
            <h1>{greet}{firstName ? `, ${firstName}` : ''}! <span style={{ textTransform: 'none' }}>👋</span></h1>
            <p className="sub" style={{ textTransform: 'capitalize' }}>{dateLine}</p>
          </div>
          <div className="db-acts hx">
            {primary && <Link to={primary.to} className="pri"><Plus size={15}/> {primary.label}</Link>}
            {primary?.to === '/app/invoices/new' && canQuote && <Link to="/app/quotes/new" className="sec"><FileText size={14}/> Devi</Link>}
            {isAdmin && isPageAllowed(tenant, 'reports') && <Link to="/app/reports" className="sec"><BarChart3 size={14}/> Rapò</Link>}
          </div>
        </div>
        <div className="db-hk">
          <HeroKpi label={lbl('salesToday')} value={totalVentesJodi} icon={TrendingUp} tone="gold" loading={isLoading} delay={60} sub={conv(totalVentesJodi)}/>
          <HeroKpi label={lbl('mySalesToday')} value={myTodaySales} icon={User} tone="violet" loading={isLoading} delay={120} sub={`${myTodaySalesCount} ${tr(t, 'dashboard.invoices', 'fakti')}`}/>
          <HeroKpi label={lbl('paid')} value={totalPayeJodi} icon={CheckCircle2} tone="green" loading={isLoading} delay={180} sub={conv(totalPayeJodi) || `${nbFaktiPayeJodi} ${tr(t, 'dashboard.invoices', 'fakti')}`}/>
          <HeroKpi label={lbl('balance')} value={totalImpayeJodi} icon={Clock} tone="red" loading={isLoading} delay={240} sub={conv(totalImpayeJodi) || `${today?.totalUnpaid?._count || 0} ${tr(t, 'dashboard.unpaid', 'pa peye')}`}/>
          <HeroKpi label={lbl('partial')} value={totalPasyalJodi} icon={Receipt} tone="sky" loading={isLoading} delay={300} sub={conv(totalPasyalJodi) || `${today?.totalPartial?._count || 0} ${tr(t, 'dashboard.documents', 'dokiman')}`}/>
        </div>
      </section>

      {isError && (
        <div className="iv-banner off"><span className="ic"><AlertTriangle size={16} color="#D97706"/></span><span className="grow">Pa ka chaje chif yo. Verifye koneksyon entènèt ou.</span><button onClick={() => refetch()}><RefreshCw size={13} className={isFetching ? 'spin' : ''}/> Eseye ankò</button></div>
      )}

      {/* ══════════ AKSÈ RAPID ══════════ */}
      <div className="db-h2">
        <div>
          <h2>{tr(t, 'dashboard.quickAccessTitle', 'Aksè rapid')}</h2>
          <p>{tr(t, 'dashboard.quickAccessSubtitle', 'Tout modil ou yo, yon sèl klik')}</p>
        </div>
        {tileCount > 10 && (
          <div className="r iv-search" style={{ flex: '0 1 240px', minWidth: 150 }}>
            <Search size={15}/>
            <input value={tileQ} onChange={e => setTileQ(e.target.value)} placeholder="Chèche yon modil…" style={{ minHeight: 40 }}/>
            {tileQ && <button onClick={() => setTileQ('')} aria-label="Efase" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={14}/></button>}
          </div>
        )}
      </div>
      {shownSections.length ? shownSections.map((sec, si) => (
        <div key={sec.title}>
          <div className="db-sec-t">{sec.title}</div>
          <div className="db-tiles">
            {sec.tiles.map((x, i) => (
              <button key={x.path} type="button" className="db-tile" style={{ '--g': x.g, animationDelay: `${Math.min(si * 3 + i, 18) * 25}ms` }} onClick={() => navigate(x.path)}>
                <span className="ti">{x.icon}</span>
                <span style={{ minWidth: 0 }}><b>{x.name}</b><small>{x.badge}</small></span>
                {x.dot > 0 && <span className="dot">{x.dot > 99 ? '99+' : x.dot}</span>}
              </button>
            ))}
          </div>
        </div>
      )) : <p className="iv-note">Okenn modil pa koresponn ak « {tileQ} ».</p>}

      {/* ══════════ GRAFIK + ESTÒK BA ══════════ */}
      <div className="db-h2"><div><h2>Aktivite</h2><p>Vant 7 dènye jou yo ak pwodui pou reaprovizyone</p></div></div>
      <div className="db-grid2" style={!isAdmin ? { gridTemplateColumns: '1fr' } : undefined}>
        {isAdmin && (
          <section className="iv-sec a-up">
            <div className="iv-sec-h">
              <div className="n"><BarChart3 size={17}/></div>
              <div><p className="eb">{tr(t, 'dashboard.salesChart', 'Vant chak jou')}</p><h3>{tr(t, 'dashboard.sales7days', '7 dènye jou')}</h3></div>
              <div className="r"><Link to="/app/reports" className="iv-act" style={{ textDecoration: 'none', minHeight: 36 }}>{tr(t, 'dashboard.seeReport', 'Rapò')} <ArrowRight size={13}/></Link></div>
            </div>
            <div className="db-mini">
              <div><small>Total 7 jou</small><b className="num">{fmtK(weekTotal)} <span style={{ fontSize: 11, color: 'var(--muted)' }}>HTG</span></b></div>
              <div><small>Jodi a vs yè</small><b style={{ fontSize: 14, marginTop: 5 }}>{yestV || todayV ? <Delta cur={todayV} prev={yestV}/> : <span style={{ color: 'var(--muted)' }}>—</span>}</b></div>
              <div><small>Pi bon jou</small><b className="num">{best ? `${best.label} · ${fmtK(best.values.v)}` : '—'}</b></div>
            </div>
            {isLoading ? <div className="iv-sk" style={{ height: 200, borderRadius: 14 }}/> : (
              <Bars data={week} active={6} height={190}
                series={[{ key: 'v', name: 'Vant', color: (d, i) => (best && d.key === best.key && d.values.v > 0 ? 'linear-gradient(180deg,#FFC83D,#C9A84C)' : i === 6 ? 'linear-gradient(180deg,#FF8C33,#FF6B00)' : 'linear-gradient(180deg,#2D3FBF,#1B2A8F)') }]}/>
            )}
          </section>
        )}

        <section className="iv-sec a-up" style={{ animationDelay: '60ms' }}>
          <div className="iv-sec-h">
            <div className="n" style={{ background: lowStock.length ? 'linear-gradient(135deg,#DC2626,#F87171)' : 'linear-gradient(135deg,#059669,#10B981)' }}>{lowStock.length ? <AlertTriangle size={17}/> : <Package size={17}/>}</div>
            <div><p className="eb">{tr(t, 'dashboard.needRestock', 'Pou reaprovizyone')}</p><h3>{tr(t, 'dashboard.lowStock', 'Estòk ba')}</h3></div>
            {lowStock.length > 0 && <div className="r"><span className="iv-badge" style={{ background: 'var(--badBg)', color: 'var(--bad)' }}>{lowStock.length}</span></div>}
          </div>
          {isLoading ? [70, 55, 80].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 14 }}/>) : !lowStock.length ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 54, height: 54, borderRadius: 18, background: 'var(--okBg)', color: 'var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}><CheckCircle2 size={24}/></div>
              <b style={{ color: 'var(--ok)', fontSize: 14 }}>{tr(t, 'dashboard.stockOk', 'Estòk la anfòm')}</b>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{tr(t, 'dashboard.noAlerts', 'Pa gen alèt pou kounye a')}</p>
            </div>
          ) : (
            <>
              {lowStock.slice(0, isAdmin ? 5 : 8).map((p, i) => {
                const qn = Number(p.quantity || 0), al = Number(p.alertThreshold || 0)
                const out = qn <= 0
                const c = out ? 'var(--bad)' : 'var(--warn)'
                return (
                  <Link key={p.id} to="/app/stock" className="db-low" style={{ animationDelay: `${i * 40}ms` }}>
                    <AlertTriangle size={15} color={out ? '#DC2626' : '#D97706'} style={{ flexShrink: 0 }}/>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <b style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</b>
                      <div className="rp-lvl"><i style={{ width: `${al ? Math.min(100, (qn / al) * 100) : 0}%`, background: c }}/></div>
                    </span>
                    <span className="q"><b style={{ color: c }}>{out ? 'Fini' : qn}</b><small style={{ display: 'block', fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>alèt {al}</small></span>
                  </Link>
                )
              })}
              <Link to="/app/products" className="iv-act" style={{ width: '100%', marginTop: 12, textDecoration: 'none' }}>{tr(t, 'dashboard.seeAll', 'Wè tout')} <ArrowRight size={13}/></Link>
            </>
          )}
        </section>
      </div>

      {/* ══════════ KPI JENERAL ══════════ */}
      <div className="db-h2"><div><h2>Rezime</h2><p>Kote biznis lan ye kounye a</p></div></div>
      <div className="db-kpi4">
        <KpiLink to="/app/invoices?status=unpaid" label={tr(t, 'dashboard.kpiFaktirImpaye', 'Fakti pa peye')} value={totalImpaye} money icon={Receipt} color="#DC2626" delay={0} sub={`${unpaidCount} ${tr(t, 'dashboard.kpiFakti', 'fakti')}`}/>
        <KpiLink to="/app/reports" label={tr(t, 'dashboard.kpiVantMwa', 'Vant peye')} value={totalPaye} money icon={TrendingUp} color="#1B2A8F" delay={60} sub={`${dashboard?.totalPaid?._count || 0} ${tr(t, 'dashboard.kpiPeye', 'peye')}`}/>
        <KpiLink to="/app/invoices?status=partial" label={tr(t, 'dashboard.kpiPasyal', 'Rès sou pasyèl')} value={totalPasyal} money icon={Clock} color="#D97706" delay={120} sub={`${dashboard?.totalPartial?._count || 0} ${tr(t, 'dashboard.kpiDocs', 'dokiman')}`}/>
        <KpiLink to="/app/stock" label={tr(t, 'dashboard.kpiStock', 'Estòk ba')} value={lowStock.length} icon={AlertTriangle} color="#B45309" delay={180} sub={tr(t, 'dashboard.kpiRestock', 'pwodui pou reaprovizyone')}/>
      </div>

      {/* ══════════ DÈNYE FAKTI ══════════ */}
      <div className="db-h2">
        <div><h2>{tr(t, 'dashboard.lastInvoices', 'Dènye fakti')}</h2><p>{tr(t, 'dashboard.lastActivity', 'Dènye aktivite yo')}</p></div>
        <div className="r"><Link to="/app/invoices" className="iv-act" style={{ textDecoration: 'none', minHeight: 38 }}>{tr(t, 'dashboard.seeAll', 'Wè tout')} <ArrowRight size={13}/></Link></div>
      </div>
      <section className="iv-sec a-up" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 20 }}>{[80, 60, 70, 50].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 16 }}/>)}</div>
        ) : !recent.length ? (
          <div className="iv-empty">
            <div className="art"><div className="paper"><i/><i/><i/><i/></div><div className="bubble"><Receipt size={18}/></div></div>
            <h3>{tr(t, 'dashboard.noInvoices', 'Poko gen fakti')}</h3>
            <p>{tr(t, 'dashboard.createQuoteToStart', 'Kreye premye vant ou pou kòmanse.')}</p>
            {primary && <Link to={primary.to} className="iv-btn-main" style={{ textDecoration: 'none', display: 'inline-flex' }}><Sparkles size={15}/> {primary.label}</Link>}
          </div>
        ) : (
          <>
            <div className="db-inv hd"><span>{tr(t, 'dashboard.number', 'Nimewo')}</span><span>{tr(t, 'dashboard.client', 'Kliyan')}</span><span className="r">{tr(t, 'common.total', 'Total')}</span><span className="c">{tr(t, 'dashboard.status', 'Estati')}</span><span className="c">{tr(t, 'dashboard.date', 'Dat')}</span><span/></div>
            {recent.map((inv, i) => {
              const s = STATUS[inv.status] || STATUS.unpaid
              const cv = conv(Number(inv.totalHtg || 0))
              return (
                <Link key={inv.id} to={`/app/invoices/${inv.id}`} className="db-inv" style={{ animationDelay: `${i * 30}ms` }}>
                  <span className="mono" style={{ fontWeight: 800, color: 'var(--blue)', fontSize: 12.5 }}>{inv.invoiceNumber}</span>
                  <span style={{ minWidth: 0, fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.client?.name || inv.clientSnapshot?.name || <span style={{ color: 'var(--muted)', fontWeight: 600 }}>San kliyan</span>}
                    <small className="m-only-inv" style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{fmtDate(inv.issueDate)}</small>
                  </span>
                  <span className="r">
                    <b className="num" style={{ fontSize: 17, textDecoration: inv.status === 'cancelled' ? 'line-through' : 'none' }}>{fmt(inv.totalHtg)}</b> <small style={{ color: 'var(--muted)', fontSize: 10 }}>HTG</small>
                    {cv && <small style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)' }}>{cv}</small>}
                  </span>
                  <span className="c"><span className="iv-badge" style={{ background: s.bg, color: s.c }}>{tr(t, `dashboard.${inv.status}Label`, s.label)}</span></span>
                  <span className="c dt mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{fmtDate(inv.issueDate)}</span>
                  <span className="go" style={{ color: 'var(--muted)' }}><ArrowRight size={15}/></span>
                </Link>
              )
            })}
          </>
        )}
      </section>

      {isAdmin && <ProfitSection/>}

      {/* ══════════ ABÒNMAN (enfòmasyon) ══════════ */}
      {isAdmin && (
        <div className="db-renew">
          <span style={{ fontSize: 22 }}>💳</span>
          <p><b>Renouvle abònman ou:</b> MonCash, NatCash, Sogebanking oswa BUH. Voye screenshot pèman an sou WhatsApp — ekip PLUS GROUP ap konfime l nan 24 è. Ou ka pase nan biwo nou nan Ouanaminthe tou.</p>
          <a href={waLink} target="_blank" rel="noreferrer"><MessageCircle size={14}/> +509 4244 9024</a>
        </div>
      )}
    </div>
  )
}