// src/pages/dashboard/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, productAPI, reportAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Link } from 'react-router-dom'
import {
  Receipt, Package, AlertTriangle, TrendingUp,
  ArrowRight, CheckCircle2, Clock, Plus, Crown, Globe
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'

// ── Palèt koulè PLUS GROUP
const C = {
  black:  '#0A0A0F',
  dark:   '#111118',
  gold:   '#C9A84C',
  goldLt: '#F0D080',
  goldDm: '#8B6914',
  red:    '#C0392B',
  redBt:  '#E74C3C',
  white:  '#FFFFFF',
  bg:     '#F5F0E8',
}

const fmt = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits:2, maximumFractionDigits:2 })

// ── Language Switcher Component (inline)
const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  
  const languages = [
    { code: 'ht', label: 'HT', flag: '🇭🇹' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
  ]

  const currentLang = i18n.language || 'ht'

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('plusgroup-lang', langCode)
    window.location.reload()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Globe size={14} style={{ color: C.gold }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: currentLang === lang.code 
                ? `2px solid ${C.gold}` 
                : '1px solid rgba(255,255,255,0.15)',
              background: currentLang === lang.code
                ? `linear-gradient(135deg, ${C.gold}, ${C.goldDm})`
                : 'rgba(255,255,255,0.05)',
              color: currentLang === lang.code ? C.black : C.white,
              fontSize: 10,
              fontWeight: currentLang === lang.code ? 800 : 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'DM Sans, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            {lang.flag} {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Badge statut
const StatusBadge = ({ status }) => {
  const { t } = useTranslation()
  const map = {
    unpaid:    { bg:'#C0392B15', color:'#C0392B', border:'#C0392B30', label: t('dashboard.unpaid') || 'Impaye'  },
    partial:   { bg:'#C9A84C15', color:'#8B6914', border:'#C9A84C40', label: t('dashboard.partial') || 'Pasyal'  },
    paid:      { bg:'#05603A15', color:'#05603A', border:'#05603A40', label: t('dashboard.paid') || 'Peye'    },
    cancelled: { bg:'#44444415', color:'#666',    border:'#44444440', label:'Anile'   },
  }
  const s = map[status] || map.unpaid
  return (
    <span style={{
      fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:99,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      letterSpacing:'0.04em', textTransform:'uppercase', fontFamily:'DM Sans'
    }}>
      {s.label}
    </span>
  )
}

// ── Tooltip chart
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:C.dark, borderRadius:10, padding:'10px 14px',
      border:`1px solid ${C.gold}40`,
      boxShadow:`0 8px 24px rgba(0,0,0,0.5)`
    }}>
      <p style={{ color:C.gold, fontSize:10, fontWeight:800, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
      <p style={{ fontFamily:'monospace', fontWeight:800, color:C.white, fontSize:14 }}>
        {fmt(payload[0]?.value)} <span style={{ color:C.gold, fontSize:10 }}>HTG</span>
      </p>
    </div>
  )
}

// ── Animated stat card
const StatCard = ({ label, val, icon, color, sub }) => {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? `linear-gradient(135deg, ${color}22, ${color}08)`
          : `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
        border: `1px solid ${hov ? color+'50' : 'rgba(255,255,255,0.10)'}`,
        borderRadius:16, padding:'14px 16px',
        transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 24px ${color}20` : 'none',
        cursor:'default',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{
          color, filter: hov ? `drop-shadow(0 0 6px ${color})` : 'none',
          transition:'filter 0.25s'
        }}>{icon}</span>
        <span style={{ fontSize:10, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.07em', opacity:0.85 }}>{label}</span>
      </div>
      <p style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:C.white, fontSize:13, margin:0 }}>{val}</p>
      {sub && <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', margin:'3px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ── KPI Card
const KpiCard = ({ label, value, count, icon, colors, link }) => {
  const [hov, setHov] = useState(false)
  return (
    <Link to={link} style={{ textDecoration:'none' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        background: hov ? colors.bgHov : colors.bg,
        border:`1px solid ${colors.border}`,
        borderRadius:18, padding:'18px 16px',
        transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: hov ? 'translateY(-3px) scale(1.02)' : 'none',
        boxShadow: hov ? `0 12px 32px ${colors.shadow}` : '0 2px 8px rgba(0,0,0,0.05)',
        cursor:'pointer', height:'100%'
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background:colors.iconBg, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 4px 14px ${colors.shadow}`,
            transition:'transform 0.2s',
            transform: hov ? 'rotate(-6deg) scale(1.1)' : 'none',
          }}>
            <span style={{ color:'#fff' }}>{icon}</span>
          </div>
          <ArrowRight size={14} style={{
            color:colors.textDim, opacity: hov ? 0.8 : 0.3,
            transform: hov ? 'translateX(2px)' : 'none',
            transition:'all 0.2s'
          }}/>
        </div>
        <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em',
          color:colors.textDim, marginBottom:4, fontFamily:'DM Sans' }}>
          {label}
        </p>
        <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:colors.text, margin:0 }}>{value}</p>
        <p style={{ fontSize:10, color:colors.textDim, margin:'3px 0 0', opacity:0.7 }}>{count}</p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, tenant } = useAuthStore()

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => invoiceAPI.getDashboard().then(r => r.data.dashboard)
  })
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => productAPI.getLowStock().then(r => r.data.products)
  })
  const { data: salesReport } = useQuery({
    queryKey: ['sales-report-dash'],
    queryFn: () => reportAPI.getSales({
      dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      dateTo:   format(new Date(), 'yyyy-MM-dd')
    }).then(r => r.data.report)
  })

  const chartData = Array.from({ length:7 }, (_, i) => {
    const d   = subDays(new Date(), 6-i)
    const key = format(d, 'yyyy-MM-dd')
    const found = salesReport?.daily?.find(x => String(x.date).startsWith(key))
    return {
      date:   format(d, 'EEE', { locale:fr }),
      ventes: Number(found?.total_htg || 0),
    }
  })

  const totalVentes = Number(salesReport?.totals?._sum?.totalHtg || 0)
  const totalPaye   = Number(dashboard?.totalPaid?._sum?.totalHtg    || 0)
  const totalImpaye = Number(dashboard?.totalUnpaid?._sum?.totalHtg  || 0)
  const totalPasyal = Number(dashboard?.totalPartial?._sum?.balanceDueHtg || 0)

  // ── Check abònman
  const subBanner = (() => {
    if (!tenant?.subscriptionEndsAt) return null
    const endsAt   = new Date(tenant.subscriptionEndsAt)
    const daysLeft = Math.ceil((endsAt - new Date()) / 86400000)
    if (daysLeft > 5) return null
    const expired  = daysLeft < 0
    return { expired, daysLeft, endsAt }
  })()

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, fontFamily:'DM Sans,sans-serif' }}>

      {/* ── ALÈT ABÒNMAN */}
      {subBanner && (
        <div style={{
          borderRadius:16, padding:'14px 20px', display:'flex', alignItems:'center', gap:14,
          background: subBanner.expired
            ? 'linear-gradient(135deg,#8B0000,#C0392B)'
            : 'linear-gradient(135deg,#8B6914,#C9A84C)',
          boxShadow: subBanner.expired ? '0 4px 20px rgba(192,57,43,0.35)' : '0 4px 20px rgba(201,168,76,0.3)',
          border:'1px solid rgba(255,255,255,0.15)',
          animation:'slideDown 0.3s ease'
        }}>
          <span style={{ fontSize:26 }}>{subBanner.expired ? '🔒' : '⏰'}</span>
          <div style={{ flex:1 }}>
            <p style={{ color:'#fff', fontWeight:800, fontSize:13, margin:'0 0 2px' }}>
              {subBanner.expired ? 'Abònman ekspire — Sistèm bloke!'
                : subBanner.daysLeft === 0 ? 'Abònman ekspire JÒD A!'
                : `Abònman ap ekspire nan ${subBanner.daysLeft} jou!`}
            </p>
            <p style={{ color:'rgba(255,255,255,0.8)', fontSize:11, margin:0 }}>
              Kontakte administrasyon pou renouvle.
            </p>
          </div>
          <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:8, padding:'4px 12px',
            fontSize:11, fontWeight:900, color:'#fff', border:'1px solid rgba(255,255,255,0.2)' }}>
            {subBanner.expired ? 'BLOKE' : `J-${subBanner.daysLeft}`}
          </div>
        </div>
      )}

      {/* ══ HERO BANNER ══ */}
      <div style={{
        borderRadius:24, padding:'28px 28px 24px', position:'relative', overflow:'hidden',
        background:`linear-gradient(145deg, ${C.black} 0%, #1A0A02 40%, #2D1504 70%, #0A0A0F 100%)`,
        boxShadow:`0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.2)`,
        animation:'fadeSlideUp 0.5s ease'
      }}>
        {/* Décoration cercles */}
        <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%',
          background:`radial-gradient(circle, ${C.red}30, transparent 70%)`, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:40, width:180, height:180, borderRadius:'50%',
          background:`radial-gradient(circle, ${C.gold}20, transparent 70%)`, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:0, right:'25%', width:1, height:'100%',
          background:`linear-gradient(180deg, transparent, ${C.gold}30, transparent)`, pointerEvents:'none' }}/>

        {/* Ligne or top */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg, transparent, ${C.goldDm} 20%, ${C.gold} 45%, ${C.goldLt} 55%, ${C.gold} 70%, ${C.goldDm} 85%, transparent)`,
          animation:'shimmer 4s linear infinite', backgroundSize:'200% 100%'
        }}/>
        {/* Ligne rouge bottom */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg, transparent, ${C.red}80 40%, ${C.red} 60%, transparent)`
        }}/>

        {/* Contenu hero */}
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:24 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <Crown size={16} style={{ color:C.gold, filter:`drop-shadow(0 0 6px ${C.gold})` }}/>
              <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.12em', color:C.gold }}>
                {tenant?.name || 'PLUS GROUP'} · {t('nav.dashboard')}
              </span>
            </div>
            <h1 style={{ fontSize:28, fontWeight:900, color:C.white, margin:'0 0 6px',
              textShadow:`0 0 30px rgba(255,255,255,0.1)` }}>
              {t('dashboard.greeting')}, {user?.fullName?.split(' ')[0] || 'Dasner'}! 👋
            </h1>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', margin:0, textTransform:'capitalize' }}>
              {format(new Date(), "EEEE d MMMM yyyy", { locale:fr })}
            </p>
          </div>
          
          {/* ✅ LanguageSwitcher + Nouvo Devis INLINE */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <LanguageSwitcher />
            <Link to="/quotes/new"
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 18px', borderRadius:12, textDecoration:'none',
                background:`linear-gradient(135deg, ${C.gold}, ${C.goldDm})`,
                color:C.black, fontWeight:800, fontSize:12, letterSpacing:'0.03em',
                boxShadow:`0 4px 20px ${C.gold}50`,
                transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow=`0 8px 28px ${C.gold}70` }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)';    e.currentTarget.style.boxShadow=`0 4px 20px ${C.gold}50` }}
            >
              <Plus size={14}/> {t('dashboard.newQuote')}
            </Link>
          </div>
        </div>

        {/* Mini stat cards nan hero */}
        <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}
          className="grid-cols-2 sm:grid-cols-4">
          <StatCard label={t('dashboard.sales30days')} val={`${fmt(totalVentes)} HTG`}
            icon={<TrendingUp size={15}/>} color={C.gold} sub={t('dashboard.totalSales')}/>
          <StatCard label={t('dashboard.paid')} val={`${fmt(totalPaye)} HTG`}
            icon={<CheckCircle2 size={15}/>} color="#22c55e" sub={`${dashboard?.totalPaid?._count || 0} ${t('dashboard.invoices')}`}/>
          <StatCard label={t('dashboard.balance')} val={`${fmt(totalImpaye)} HTG`}
            icon={<Clock size={15}/>} color={C.redBt} sub={`${dashboard?.totalUnpaid?._count || 0} ${t('dashboard.unpaid')}`}/>
          <StatCard label={t('dashboard.partial')} val={`${fmt(totalPasyal)} HTG`}
            icon={<Receipt size={15}/>} color="#93c5fd" sub={`${dashboard?.totalPartial?._count || 0} ${t('dashboard.documents')}`}/>
        </div>
      </div>

      {/* ══ CHART + STOCK ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }} className="chart-grid">

        {/* Graphique barres */}
        <div style={{
          background:'#fff', borderRadius:20, padding:'20px 20px 14px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.06)',
          border:'1px solid rgba(201,168,76,0.12)',
          animation:'fadeSlideUp 0.6s ease'
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:800, color:C.black, margin:'0 0 2px', fontFamily:'DM Sans' }}>
                {t('dashboard.sales7days')}
              </h3>
              <p style={{ fontSize:11, color:'#888', margin:0 }}>{t('dashboard.salesChart')}</p>
            </div>
            <Link to="/reports"
              style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700,
                color:C.goldDm, textDecoration:'none', padding:'5px 10px', borderRadius:8,
                background:'#FFF8E7', border:'1px solid #F0D08050',
                transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#FFF3D0'}
              onMouseLeave={e => e.currentTarget.style.background='#FFF8E7'}
            >
              {t('dashboard.seeReport')} <ArrowRight size={12}/>
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <BarChart data={chartData} barSize={28} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" vertical={false}/>
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize:11, fill:'#999', fontFamily:'DM Sans', fontWeight:600 }}/>
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize:10, fill:'#bbb' }}
                tickFormatter={v => v>=1000 ? `${(v/1000).toFixed(0)}k` : v}/>
              <Tooltip content={<CustomTooltip/>} cursor={{ fill:'rgba(201,168,76,0.05)', radius:6 }}/>
              <Bar dataKey="ventes" radius={[8,8,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.ventes === Math.max(...chartData.map(d=>d.ventes)) && entry.ventes > 0
                      ? `url(#barGold)` : `url(#barNormal)`}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.gold}/>
                  <stop offset="100%" stopColor={C.goldDm}/>
                </linearGradient>
                <linearGradient id="barNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C0392B"/>
                  <stop offset="100%" stopColor="#8B0000"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock alèt */}
        <div style={{
          background:'#fff', borderRadius:20, padding:'20px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.06)',
          border:'1px solid rgba(192,57,43,0.12)',
          animation:'fadeSlideUp 0.7s ease'
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:C.black, margin:'0 0 2px' }}>{t('dashboard.lowStock')}</h3>
              <p style={{ fontSize:11, color:'#888', margin:0 }}>{t('dashboard.needRestock')}</p>
            </div>
            <Link to="/products"
              style={{ fontSize:11, fontWeight:700, color:C.red, textDecoration:'none',
                display:'flex', alignItems:'center', gap:3,
                padding:'4px 10px', borderRadius:8, background:'#FFF0EE',
                transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#FFE5E0'}
              onMouseLeave={e => e.currentTarget.style.background='#FFF0EE'}
            >
              {t('dashboard.seeAll')} <ArrowRight size={12}/>
            </Link>
          </div>

          {!lowStock?.length
            ? <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ width:44, height:44, borderRadius:14, background:'#F0FDF4',
                  display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                  <Package size={20} style={{ color:'#22c55e' }}/>
                </div>
                <p style={{ fontSize:12, fontWeight:700, color:'#15803d', margin:'0 0 2px' }}>Estòk an bon nivo</p>
                <p style={{ fontSize:11, color:'#aaa', margin:0 }}>Pa gen alèt</p>
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {lowStock.slice(0,5).map(p => (
                  <div key={p.id} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:12, background:'linear-gradient(135deg,#FFF5F4,#FFF0EE)',
                    border:'1px solid rgba(192,57,43,0.15)',
                    transition:'all 0.15s'
                  }}>
                    <AlertTriangle size={13} style={{ color:C.red, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:700, color:C.black, margin:0,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize:10, color:'#aaa', margin:0, fontFamily:'monospace' }}>{p.code}</p>
                    </div>
                    <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:800,
                      color:C.red, background:'rgba(192,57,43,0.08)',
                      padding:'2px 8px', borderRadius:99, flexShrink:0 }}>
                      {Number(p.quantity)}/{Number(p.alertThreshold)}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ══ 4 KPI CARDS ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }} className="kpi-grid">
        <KpiCard label={t('dashboard.unpaidInvoices')} value={`${fmt(totalImpaye)} HTG`}
          count={`${dashboard?.totalUnpaid?._count||0} ${t('dashboard.invoices')}`}
          icon={<Receipt size={20}/>} link="/invoices?status=unpaid"
          colors={{ bg:'#FFF5F4', bgHov:'#FFE8E5', border:'rgba(192,57,43,0.2)',
            iconBg:`linear-gradient(135deg,${C.red},#8B0000)`,
            shadow:'rgba(192,57,43,0.2)', text:C.red, textDim:'#9B2335' }}/>
        <KpiCard label={t('dashboard.monthlySales')} value={`${fmt(totalPaye)} HTG`}
          count={`${dashboard?.totalPaid?._count||0} ${t('dashboard.paid').toLowerCase()}`}
          icon={<TrendingUp size={20}/>} link="/reports"
          colors={{ bg:'#FFFBF0', bgHov:'#FFF3D0', border:`rgba(201,168,76,0.25)`,
            iconBg:`linear-gradient(135deg,${C.gold},${C.goldDm})`,
            shadow:`rgba(201,168,76,0.25)`, text:C.goldDm, textDim:C.goldDm }}/>
        <KpiCard label={t('dashboard.partialPayments')} value={`${fmt(totalPasyal)} HTG`}
          count={`${dashboard?.totalPartial?._count||0} ${t('dashboard.documents')}`}
          icon={<Clock size={20}/>} link="/invoices?status=partial"
          colors={{ bg:'#F8F9FF', bgHov:'#EEF0FF', border:'rgba(99,102,241,0.2)',
            iconBg:'linear-gradient(135deg,#6366f1,#4338ca)',
            shadow:'rgba(99,102,241,0.2)', text:'#4338ca', textDim:'#4338ca' }}/>
        <KpiCard label={t('dashboard.stockAlerts')} value={`${lowStock?.length||0} ${t('dashboard.products')}`}
          count={t('dashboard.needRestock')}
          icon={<AlertTriangle size={20}/>} link="/products"
          colors={{ bg:'#FFF7ED', bgHov:'#FFEDD5', border:'rgba(234,88,12,0.2)',
            iconBg:'linear-gradient(135deg,#ea580c,#c2410c)',
            shadow:'rgba(234,88,12,0.2)', text:'#c2410c', textDim:'#9a3412' }}/>
      </div>

      {/* ══ DÈNYE FACTURE ══ */}
      <div style={{
        background:'#fff', borderRadius:20, overflow:'hidden',
        boxShadow:'0 4px 24px rgba(0,0,0,0.07)',
        border:`1px solid rgba(201,168,76,0.12)`,
        animation:'fadeSlideUp 0.8s ease'
      }}>
        {/* Header table */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px',
          borderBottom:'2px solid transparent',
          backgroundImage:`linear-gradient(#fff,#fff), linear-gradient(90deg, ${C.red}60, ${C.gold}80, ${C.red}60)`,
          backgroundOrigin:'border-box', backgroundClip:'padding-box, border-box',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:`linear-gradient(135deg,${C.gold},${C.goldDm})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:`0 4px 14px ${C.gold}50`
            }}>
              <Receipt size={16} style={{ color:C.black }}/>
            </div>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:C.black, margin:'0 0 1px' }}>Dènye Facture yo</h3>
              <p style={{ fontSize:10, color:'#aaa', margin:0 }}>Dènye aktivite finansyè</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Link to="/quotes/new" style={{
              display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
              borderRadius:10, textDecoration:'none', fontSize:12, fontWeight:800,
              background:`linear-gradient(135deg,${C.black},#1a1a28)`,
              color:C.gold, border:`1px solid ${C.gold}40`,
              boxShadow:`0 2px 10px rgba(0,0,0,0.2)`,
              transition:'all 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow=`0 4px 16px ${C.gold}30` }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.2)' }}
            >
              <Plus size={13}/> {t('dashboard.newQuote')}
            </Link>
            <Link to="/invoices" style={{
              display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
              borderRadius:10, textDecoration:'none', fontSize:12, fontWeight:700,
              background:'#F5F0E8', color:'#555', border:'1px solid #E8E0D0',
              transition:'all 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background='#EDE8DE'}
              onMouseLeave={e => e.currentTarget.style.background='#F5F0E8'}
            >
              {t('dashboard.seeAll')} <ArrowRight size={12}/>
            </Link>
          </div>
        </div>

        {!dashboard?.recentInvoices?.length
          ? <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ width:56, height:56, borderRadius:18, background:'#FFF8E7',
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <Receipt size={24} style={{ color:C.gold }}/>
              </div>
              <p style={{ fontWeight:800, color:C.black, fontSize:14, margin:'0 0 4px' }}>Pa gen facture yo</p>
              <p style={{ color:'#aaa', fontSize:12, margin:'0 0 16px' }}>Kreye yon devis pou kòmanse</p>
              <Link to="/quotes/new" style={{
                display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px',
                borderRadius:12, textDecoration:'none', fontSize:12, fontWeight:800,
                background:`linear-gradient(135deg,${C.gold},${C.goldDm})`,
                color:C.black, boxShadow:`0 4px 16px ${C.gold}40`
              }}>
                <Plus size={14}/> Kreye premye devis ou
              </Link>
            </div>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#FAFAF8' }}>
                    {['Nimewo','Kliyan','Total HTG','Statut','Dat',''].map((h, i) => (
                      <th key={i} style={{
                        padding:'10px 16px', textAlign: i >= 2 && i < 5 ? 'center' : i === 5 ? 'right' : 'left',
                        fontSize:10, fontWeight:800, color:'#999', textTransform:'uppercase',
                        letterSpacing:'0.07em', borderBottom:'1px solid #F0EBE0',
                        whiteSpace:'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentInvoices.map((inv, idx) => (
                    <InvoiceRow key={inv.id} inv={inv} idx={idx}/>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* ── Animations globales */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-10px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @media (max-width:900px) {
          .chart-grid  { grid-template-columns:1fr !important }
          .kpi-grid    { grid-template-columns:repeat(2,1fr) !important }
        }
        @media (max-width:560px) {
          .kpi-grid    { grid-template-columns:1fr !important }
        }
      `}</style>
    </div>
  )
}

// ── Row faktir
function InvoiceRow({ inv, idx }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#FFFBF0' : idx % 2 === 0 ? '#fff' : '#FAFAF8',
        transition:'background 0.15s',
        borderBottom:'1px solid #F5F0E8',
        cursor:'pointer'
      }}
    >
      <td style={{ padding:'12px 16px' }}>
        <span style={{ fontFamily:'monospace', fontWeight:800, color:C.black, fontSize:12 }}>
          {inv.invoiceNumber}
        </span>
      </td>
      <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#333' }}>
        {inv.client?.name || '—'}
      </td>
      <td style={{ padding:'12px 16px', textAlign:'center' }}>
        <span style={{ fontFamily:'monospace', fontWeight:800, color:C.black, fontSize:13 }}>
          {fmt(inv.totalHtg)}
        </span>
        <span style={{ color:'#aaa', fontSize:10, marginLeft:3 }}>HTG</span>
      </td>
      <td style={{ padding:'12px 16px', textAlign:'center' }}>
        <StatusBadge status={inv.status}/>
      </td>
      <td style={{ padding:'12px 16px', textAlign:'center', fontSize:11, color:'#aaa', fontFamily:'monospace' }}>
        {format(new Date(inv.issueDate), 'dd/MM/yy')}
      </td>
      <td style={{ padding:'12px 16px', textAlign:'right' }}>
        <Link to={`/invoices/${inv.id}`} style={{
          width:30, height:30, borderRadius:8, display:'inline-flex',
          alignItems:'center', justifyContent:'center',
          background: hov ? `linear-gradient(135deg,${C.gold},${C.goldDm})` : '#F5F0E8',
          color: hov ? C.black : '#aaa',
          textDecoration:'none', transition:'all 0.2s',
          transform: hov ? 'scale(1.1)' : 'scale(1)',
        }}>
          <ArrowRight size={13}/>
        </Link>
      </td>
    </tr>
  )
}
