// src/pages/dashboard/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, productAPI, reportAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Link } from 'react-router-dom'
import {
  Receipt, Package, AlertTriangle, TrendingUp,
  ArrowRight, CheckCircle2, Clock, Plus, Crown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'

// ── Design System PLUS GROUP
const D = {
  blue:     '#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:  'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.14)',
  gold:     '#C9A84C', goldLt:'#F0D080', goldDk:'#8B6914',
  goldDim:  'rgba(201,168,76,0.12)',
  red:      '#C0392B', redLt:'#E74C3C', redDim:'rgba(192,57,43,0.08)',
  white:    '#FFFFFF', bg:'#F4F6FF',
  border:   'rgba(27,42,143,0.10)',
  text:     '#0F1A5C', muted:'#6B7AAB',
  success:  '#059669', successBg:'rgba(5,150,105,0.08)',
  warning:  '#D97706', warningBg:'rgba(217,119,6,0.10)',
  shadow:   '0 4px 20px rgba(27,42,143,0.10)',
  shadowLg: '0 8px 32px rgba(27,42,143,0.16)',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Konvèsyon HTG → lòt devise
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

const convertFromHTG = (amountHTG, currency, exchangeRates = {}) => {
  const rateToHTG = Number(exchangeRates[currency] || 0)
  if (!rateToHTG) return null
  return { amount: amountHTG / rateToHTG, symbol: CURRENCY_SYMBOLS[currency] || currency, currency }
}

const fmtConv = (amountHTG, exchangeRates, visibleCurrencies = []) => {
  if (!visibleCurrencies.length) return null
  const parts = visibleCurrencies
    .map(cur => convertFromHTG(amountHTG, cur, exchangeRates))
    .filter(Boolean)
    .map(c => `≈ ${c.symbol}${fmt(c.amount)}`)
  return parts.length ? parts.join('  ') : null
}

// ── Badge statut
const StatusBadge = ({ status }) => {
  const map = {
    unpaid:    { bg: D.redDim,    color: D.red,     label: 'Impaye' },
    partial:   { bg: 'rgba(217,119,6,0.10)', color: D.warning, label: 'Pasyal' },
    paid:      { bg: D.successBg, color: D.success, label: 'Peye'   },
    cancelled: { bg: 'rgba(100,100,100,0.08)', color: '#666', label: 'Anile' },
  }
  const s = map[status] || map.unpaid
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  )
}

// ── Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.blueDk, borderRadius: 12, padding: '10px 16px', border: `1px solid ${D.gold}40`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <p style={{ color: D.gold, fontSize: 10, fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fff', fontSize: 14 }}>
        {fmt(payload[0]?.value)} <span style={{ color: D.gold, fontSize: 10 }}>HTG</span>
      </p>
    </div>
  )
}

// ── Mini Stat Card (nan hero)
const StatCard = ({ label, val, icon, color, sub }) => {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? `${color}18` : 'rgba(255,255,255,0.06)',
      border: `1px solid ${hov ? color + '40' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 14, padding: '14px 16px',
      transition: 'all 0.25s ease',
      transform: hov ? 'translateY(-2px)' : 'none',
      boxShadow: hov ? `0 8px 24px ${color}25` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color, filter: hov ? `drop-shadow(0 0 6px ${color})` : 'none', transition: 'filter 0.25s' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.9 }}>{label}</span>
      </div>
      <p style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 800, color: '#fff', fontSize: 13, margin: 0 }}>{val}</p>
      {sub && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ── KPI Card (gwo kart)
const KpiCard = ({ label, value, count, icon, color, bg, link }) => {
  const [hov, setHov] = useState(false)
  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
        background: hov ? bg : D.white,
        border: `1px solid ${hov ? color + '30' : D.border}`,
        borderRadius: 18, padding: '18px 16px',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? `0 12px 32px ${color}25` : D.shadow,
        cursor: 'pointer', height: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, ${color}, ${color}CC)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${color}40`,
            transition: 'transform 0.2s',
            transform: hov ? 'rotate(-6deg) scale(1.1)' : 'none',
          }}>
            <span style={{ color: '#fff' }}>{icon}</span>
          </div>
          <ArrowRight size={14} style={{ color: D.muted, opacity: hov ? 0.8 : 0.3, transform: hov ? 'translateX(3px)' : 'none', transition: 'all 0.2s' }} />
        </div>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.muted, marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color, margin: 0 }}>{value}</p>
        <p style={{ fontSize: 11, color: D.muted, margin: '3px 0 0', opacity: 0.7 }}>{count}</p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, tenant } = useAuthStore()

  // ── Paramèt taux depuis tenant (Settings)
  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates     || {}
  const visibleCurrs  = tenant?.visibleCurrencies  || []

  const { data: dashboard }    = useQuery({ queryKey: ['dashboard'],          queryFn: () => invoiceAPI.getDashboard().then(r => r.data.dashboard) })
  const { data: lowStock }     = useQuery({ queryKey: ['low-stock'],           queryFn: () => productAPI.getLowStock().then(r => r.data.products) })
  const { data: salesReport }  = useQuery({
    queryKey: ['sales-report-dash'],
    queryFn:  () => reportAPI.getSales({ dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'), dateTo: format(new Date(), 'yyyy-MM-dd') }).then(r => r.data.report)
  })

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d     = subDays(new Date(), 6 - i)
    const key   = format(d, 'yyyy-MM-dd')
    const found = salesReport?.daily?.find(x => String(x.date).startsWith(key))
    return { date: format(d, 'EEE', { locale: fr }), ventes: Number(found?.total_htg || 0) }
  })

  const totalVentes = Number(salesReport?.totals?._sum?.totalHtg || 0)
  const totalPaye   = Number(dashboard?.totalPaid?._sum?.totalHtg    || 0)
  const totalImpaye = Number(dashboard?.totalUnpaid?._sum?.totalHtg  || 0)
  const totalPasyal = Number(dashboard?.totalPartial?._sum?.balanceDueHtg || 0)

  const subBanner = (() => {
    if (!tenant?.subscriptionEndsAt) return null
    const endsAt   = new Date(tenant.subscriptionEndsAt)
    const daysLeft = Math.ceil((endsAt - new Date()) / 86400000)
    if (daysLeft > 5) return null
    return { expired: daysLeft < 0, daysLeft, endsAt }
  })()

  // ── Helper: montan HTG + konvèsyon sou 2 liy
  const AmountBlock = ({ htg, color = D.text, large = false }) => {
    const convStr = showRate ? fmtConv(Number(htg), exchangeRates, visibleCurrs) : null
    return (
      <div>
        <span style={{ fontFamily: 'monospace', fontWeight: large ? 800 : 700, fontSize: large ? 15 : 13, color }}>
          {fmt(htg)} HTG
        </span>
        {convStr && (
          <div style={{ fontSize: 10, color: D.muted, fontFamily: 'monospace', marginTop: 2 }}>{convStr}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'DM Sans,sans-serif' }}>

      {/* ── Alèt abònman */}
      {subBanner && (
        <div style={{
          borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
          background: subBanner.expired ? `linear-gradient(135deg,#8B0000,${D.red})` : `linear-gradient(135deg,${D.goldDk},${D.gold})`,
          boxShadow: subBanner.expired ? '0 4px 20px rgba(192,57,43,0.35)' : `0 4px 20px ${D.gold}40`,
          border: '1px solid rgba(255,255,255,0.15)', animation: 'slideDown 0.3s ease'
        }}>
          <span style={{ fontSize: 24 }}>{subBanner.expired ? '🔒' : '⏰'}</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 13, margin: '0 0 2px' }}>
              {subBanner.expired ? 'Abònman ekspire — Sistèm bloke!' : `Abònman ap ekspire nan ${subBanner.daysLeft} jou!`}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>Kontakte administrasyon pou renouvle.</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 900, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            {subBanner.expired ? 'BLOKE' : `J-${subBanner.daysLeft}`}
          </div>
        </div>
      )}

      {/* ══ HERO BANNER ══ */}
      <div style={{
        borderRadius: 24, padding: '28px', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(145deg, ${D.blueDk} 0%, ${D.blue} 50%, ${D.blueLt} 100%)`,
        boxShadow: `0 20px 60px rgba(27,42,143,0.35)`,
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle,${D.gold}25,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: 20, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${D.red}20,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${D.goldDk} 20%,${D.gold} 45%,${D.goldLt} 55%,${D.gold} 70%,${D.goldDk} 85%,transparent)`, animation: 'shimmer 4s linear infinite', backgroundSize: '200% 100%' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Crown size={14} style={{ color: D.gold, filter: `drop-shadow(0 0 6px ${D.gold})` }} />
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.gold }}>
                {tenant?.name || 'PLUS GROUP'} · Tablo Bò
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
              {t('dashboard.greeting')}, {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'capitalize' }}>
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <Link to="/quotes/new" style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, textDecoration: 'none',
            background: `linear-gradient(135deg,${D.gold},${D.goldDk})`,
            color: '#0F1A5C', fontWeight: 800, fontSize: 12, letterSpacing: '0.03em',
            boxShadow: `0 4px 20px ${D.gold}50`, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 8px 28px ${D.gold}70` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 20px ${D.gold}50` }}
          >
            <Plus size={14} /> {t('dashboard.newQuote')}
          </Link>
        </div>

        {/* Stat cards — yo montre sèlman HTG (hero se sumari rapid) */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <StatCard label="Vant 30 jou"  val={`${fmt(totalVentes)} HTG`} icon={<TrendingUp size={15} />}   color={D.gold}   sub={showRate && fmtConv(totalVentes, exchangeRates, visibleCurrs)} />
          <StatCard label="Peye"         val={`${fmt(totalPaye)} HTG`}   icon={<CheckCircle2 size={15} />} color="#34d399"  sub={showRate && fmtConv(totalPaye, exchangeRates, visibleCurrs) || `${dashboard?.totalPaid?._count || 0} fakti`} />
          <StatCard label="Balans"       val={`${fmt(totalImpaye)} HTG`} icon={<Clock size={15} />}        color={D.redLt}  sub={showRate && fmtConv(totalImpaye, exchangeRates, visibleCurrs) || `${dashboard?.totalUnpaid?._count || 0} impaye`} />
          <StatCard label="Pasyal"       val={`${fmt(totalPasyal)} HTG`} icon={<Receipt size={15} />}      color="#93c5fd"  sub={showRate && fmtConv(totalPasyal, exchangeRates, visibleCurrs) || `${dashboard?.totalPartial?._count || 0} dokiman`} />
        </div>
      </div>

      {/* ══ CHART + STOCK ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

        {/* Grafik */}
        <div style={{ background: D.white, borderRadius: 20, padding: '20px 20px 14px', boxShadow: D.shadow, border: `1px solid ${D.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: D.text, margin: '0 0 2px' }}>{t('dashboard.sales7days')}</h3>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Chif vant an HTG</p>
            </div>
            <Link to="/reports" style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: D.blue,
              textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: D.blueDim, border: `1px solid ${D.border}`, transition: 'all 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = D.blueDim2}
              onMouseLeave={e => e.currentTarget.style.background = D.blueDim}
            >
              Wè rapò <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <BarChart data={chartData} barSize={28} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke={D.blueDim} vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: D.muted, fontFamily: 'DM Sans', fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: D.muted }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: `${D.blue}06`, radius: 6 }} />
              <Bar dataKey="ventes" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.ventes === Math.max(...chartData.map(d => d.ventes)) && entry.ventes > 0 ? 'url(#barGold)' : 'url(#barBlue)'} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={D.gold} /><stop offset="100%" stopColor={D.goldDk} />
                </linearGradient>
                <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={D.blueLt} /><stop offset="100%" stopColor={D.blue} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock alèt */}
        <div style={{ background: D.white, borderRadius: 20, padding: '20px', boxShadow: D.shadow, border: `1px solid ${D.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: D.text, margin: '0 0 2px' }}>Estòk ba</h3>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Bezwen restock</p>
            </div>
            <Link to="/products" style={{
              fontSize: 11, fontWeight: 700, color: D.red, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 8,
              background: D.redDim, transition: 'all 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = D.redDim}
            >
              Wè tout <ArrowRight size={12} />
            </Link>
          </div>
          {!lowStock?.length
            ? <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: D.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Package size={20} style={{ color: D.success }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: D.success, margin: '0 0 2px' }}>Estòk an bon nivo</p>
                <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Pa gen alèt</p>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lowStock.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(192,57,43,0.05)', border: `1px solid ${D.border}` }}>
                    <AlertTriangle size={13} style={{ color: D.red, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 10, color: D.muted, margin: 0, fontFamily: 'monospace' }}>{p.code}</p>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 800, color: D.red, background: D.redDim, padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                      {Number(p.quantity)}/{Number(p.alertThreshold)}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ══ 4 KPI CARDS ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <KpiCard label="Fakti Impaye" value={`${fmt(totalImpaye)} HTG`} count={`${dashboard?.totalUnpaid?._count || 0} fakti`}  icon={<Receipt size={20} />}      color={D.red}     bg={D.redDim}                  link="/invoices?status=unpaid" />
        <KpiCard label="Vant Mwa"    value={`${fmt(totalPaye)} HTG`}   count={`${dashboard?.totalPaid?._count || 0} peye`}    icon={<TrendingUp size={20} />}   color={D.blue}    bg={D.blueDim}                 link="/reports" />
        <KpiCard label="Peman Pasyal" value={`${fmt(totalPasyal)} HTG`} count={`${dashboard?.totalPartial?._count || 0} doc`} icon={<Clock size={20} />}        color={D.gold}    bg={D.goldDim}                 link="/invoices?status=partial" />
        <KpiCard label="Alèt Stock"  value={`${lowStock?.length || 0} pwodui`} count="Bezwen restock"                        icon={<AlertTriangle size={20} />} color={D.warning} bg="rgba(217,119,6,0.08)"      link="/products" />
      </div>

      {/* ══ DÈNYE FACTURE ══ */}
      <div style={{ background: D.white, borderRadius: 20, overflow: 'hidden', boxShadow: D.shadow, border: `1px solid ${D.border}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `2px solid ${D.blueDim}`,
          background: `linear-gradient(135deg, ${D.blueDim}, ${D.goldDim})`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${D.blue},${D.blueLt})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${D.blue}40` }}>
              <Receipt size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: D.text, margin: '0 0 1px' }}>Dènye Facture yo</h3>
              <p style={{ fontSize: 10, color: D.muted, margin: 0 }}>Dènye aktivite finansyè</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/quotes/new" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 12, fontWeight: 800,
              background: `linear-gradient(135deg,${D.blue},${D.blueLt})`, color: '#fff', boxShadow: `0 3px 12px ${D.blue}40`, transition: 'all 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 6px 20px ${D.blue}50` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 3px 12px ${D.blue}40` }}
            >
              <Plus size={13} /> Nouvo Devis
            </Link>
            <Link to="/invoices" style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 12, fontWeight: 700,
              background: D.blueDim, color: D.blue, border: `1px solid ${D.border}`, transition: 'all 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = D.blueDim2}
              onMouseLeave={e => e.currentTarget.style.background = D.blueDim}
            >
              Wè tout <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {!dashboard?.recentInvoices?.length
          ? <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: D.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Receipt size={24} style={{ color: D.blue }} />
              </div>
              <p style={{ fontWeight: 800, color: D.text, fontSize: 14, margin: '0 0 4px' }}>Pa gen facture yo</p>
              <p style={{ color: D.muted, fontSize: 12, margin: '0 0 16px' }}>Kreye yon devis pou kòmanse</p>
              <Link to="/quotes/new" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                borderRadius: 12, textDecoration: 'none', fontSize: 12, fontWeight: 800,
                background: `linear-gradient(135deg,${D.blue},${D.blueLt})`, color: '#fff', boxShadow: `0 4px 16px ${D.blue}40`
              }}>
                <Plus size={14} /> Kreye premye devis ou
              </Link>
            </div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: D.blueDim }}>
                    {['Nimewo', 'Kliyan', 'Total', 'Statut', 'Dat', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 16px', textAlign: i >= 2 && i < 5 ? 'center' : i === 5 ? 'right' : 'left',
                        fontSize: 10, fontWeight: 800, color: D.blue, textTransform: 'uppercase',
                        letterSpacing: '0.07em', borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentInvoices.map((inv, idx) => (
                    <InvoiceRow key={inv.id} inv={inv} idx={idx} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs} />
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  )
}

// ── Ran tablo "Dènye Facture" — avèk konvèsyon monè
function InvoiceRow({ inv, idx, showRate, exchangeRates, visibleCurrs }) {
  const [hov, setHov] = useState(false)
  const convStr = showRate ? fmtConv(Number(inv.totalHtg || 0), exchangeRates, visibleCurrs) : null

  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? D.blueDim : idx % 2 === 0 ? '#fff' : 'rgba(244,246,255,0.5)', transition: 'background 0.15s', borderBottom: `1px solid ${D.border}`, cursor: 'pointer' }}>

      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.blue, fontSize: 12 }}>{inv.invoiceNumber}</span>
      </td>

      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: D.text }}>
        {inv.client?.name || '—'}
      </td>

      {/* Kolòn Total — HTG + konvèsyon DOP/USD anba */}
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.text, fontSize: 13 }}>
            {Number(inv.totalHtg || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
          </span>
          <span style={{ color: D.muted, fontSize: 10, marginLeft: 3 }}>HTG</span>
        </div>
        {convStr && (
          <div style={{ fontSize: 10, color: D.muted, fontFamily: 'monospace', marginTop: 2 }}>{convStr}</div>
        )}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        {(() => {
          const map = {
            unpaid:    { bg: 'rgba(192,57,43,0.08)',  color: '#C0392B', label: 'Impaye' },
            partial:   { bg: 'rgba(217,119,6,0.10)',  color: '#D97706', label: 'Pasyal' },
            paid:      { bg: 'rgba(5,150,105,0.08)',  color: '#059669', label: 'Peye'   },
            cancelled: { bg: 'rgba(100,100,100,0.08)', color: '#666',   label: 'Anile'  },
          }
          const s = map[inv.status] || map.unpaid
          return <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</span>
        })()}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: D.muted, fontFamily: 'monospace' }}>
        {format(new Date(inv.issueDate), 'dd/MM/yy')}
      </td>

      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <Link to={`/invoices/${inv.id}`} style={{
          width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: hov ? `linear-gradient(135deg,${D.blue},${D.blueLt})` : D.blueDim,
          color: hov ? '#fff' : D.blue, textDecoration: 'none', transition: 'all 0.2s',
        }}>
          <ArrowRight size={13} />
        </Link>
      </td>
    </tr>
  )
}
