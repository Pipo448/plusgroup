// ══════════════════════════════════════════════════════════════
// ProfitSection.jsx — Seksyon Rapò Benefis pou Dashboard
// Mete nan: frontend/src/pages/dashboard/ProfitSection.jsx

// ══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { reportAPI } from '../../services/api'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Award, ChevronDown, ChevronUp } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.14)',
  gold:'#C9A84C', goldDk:'#8B6914', goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const getPeriodDates = (period) => {
  const now = new Date()
  switch (period) {
    case 'today':  return { dateFrom: format(now, 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') }
    case '7days':  return { dateFrom: format(subDays(now, 6), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') }
    case 'month':  return { dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), dateTo: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'week':   return { dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), dateTo: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
    case '30days': return { dateFrom: format(subDays(now, 29), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') }
    default:       return { dateFrom: format(subDays(now, 29), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') }
  }
}

// ── Tooltip grafik
const ProfitTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.blueDk, borderRadius: 12, padding: '10px 16px', border: `1px solid ${D.gold}40`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <p style={{ color: D.gold, fontSize: 10, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: 'monospace', fontWeight: 700, color: p.color, fontSize: 12, margin: '2px 0' }}>
          {p.name}: {fmt(p.value)} HTG
        </p>
      ))}
    </div>
  )
}

// ── Kart rezime
const SummaryCard = ({ label, value, icon, color, sub, trend }) => {
  const [hov, setHov] = useState(false)
  const isPositive = trend >= 0
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `${color}12` : D.white,
        border: `1px solid ${hov ? color + '40' : D.border}`,
        borderRadius: 16, padding: '16px 14px',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? `0 12px 32px ${color}25` : D.shadow,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${color}40`, flexShrink: 0,
        }}>
          <span style={{ color: '#fff' }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: isPositive ? D.successBg : D.redDim,
            borderRadius: 99, padding: '3px 8px',
          }}>
            {isPositive ? <TrendingUp size={11} color={D.success} /> : <TrendingDown size={11} color={D.red} />}
            <span style={{ fontSize: 10, fontWeight: 800, color: isPositive ? D.success : D.red }}>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.muted, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, fontSize: 14, color, margin: 0, wordBreak: 'break-word' }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: D.muted, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

export default function ProfitSection() {
  const { t } = useTranslation()

  const [period, setPeriod]           = useState('month')
  const [showAllProducts, setShowAll] = useState(false)
  const [expandedChart, setExpanded]  = useState(false)


  const PERIODS = [
    { label: t('dashboard.profitPeriodToday'),  value: 'today' },
    { label: t('dashboard.profitPeriod7days'),  value: '7days' },
    { label: t('dashboard.profitPeriodMonth'),  value: 'month' },
    { label: t('dashboard.profitPeriodWeek'),   value: 'week' },
    { label: t('dashboard.profitPeriod30days'), value: '30days' },
  ]

  const { dateFrom, dateTo } = getPeriodDates(period)

  const { data, isLoading, error } = useQuery({
    queryKey: ['profit-report', dateFrom, dateTo],
    queryFn: () => reportAPI.getProfit({ dateFrom, dateTo }).then(r => r.data.profit),
    staleTime: 60000,
  })

  const totaux    = data?.totaux    || { vantHtg: 0, koutHtg: 0, benefisHtg: 0, majPct: '0.0' }
  const byProduct = data?.byProduct || []
  const top5      = data?.top5      || []
  const daily     = (data?.daily    || []).map(d => ({
    date:    d.date.substring(5),
    Vant:    d.vant,
    Kout:    d.kout,
    Benefis: d.benefis,
  }))

  const displayProducts = showAllProducts ? byProduct : byProduct.slice(0, 8)

  if (error) return null

  return (
    <div style={{
      background: D.white, borderRadius: 20,
      border: `1px solid ${D.border}`,
      boxShadow: D.shadow, overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .profit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 2px solid rgba(27,42,143,0.07);
          background: linear-gradient(135deg, rgba(27,42,143,0.07), rgba(201,168,76,0.06));
          flex-wrap: wrap;
          gap: 12px;
        }

        .profit-periods {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* 4 kolonn sou desktop */
        .profit-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        /* Tablo responsive */
        .profit-table-wrap {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid rgba(27,42,143,0.10);
          -webkit-overflow-scrolling: touch;
        }

        /* Chart + Stock grid */
        .chart-area {
          background: #F4F6FF;
          border-radius: 16px;
          padding: 16px 18px;
          border: 1px solid rgba(27,42,143,0.10);
        }

        /* ── TABLET (≤ 900px) ── */
        @media (max-width: 900px) {
          .profit-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ── MOBILE (≤ 600px) ── */
        @media (max-width: 600px) {
          .profit-header {
            padding: 14px 16px;
            flex-direction: column;
            align-items: flex-start;
          }
          .profit-periods {
            width: 100%;
            justify-content: flex-start;
          }
          .profit-summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .chart-area {
            padding: 12px 10px;
          }
          .profit-inner {
            padding: 14px 14px !important;
            gap: 14px !important;
          }
        }

        /* ── PETIT MOBIL (≤ 380px) ── */
        @media (max-width: 380px) {
          .profit-summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: 7px;
          }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="profit-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(135deg, ${D.gold}, ${D.goldDk})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${D.gold}40`, flexShrink: 0,
          }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
          
            <h3 style={{ fontSize: 15, fontWeight: 800, color: D.text, margin: '0 0 2px' }}>
              📊 {t('dashboard.profitReport')}
            </h3>
            <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
              {t('dashboard.profitSubtitle')}
            </p>
          </div>
        </div>

        
        <div className="profit-periods">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '5px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif',
                background: period === p.value
                  ? `linear-gradient(135deg, ${D.gold}, ${D.goldDk})`
                  : D.blueDim,
                color: period === p.value ? '#0F1A5C' : D.muted,
                transition: 'all 0.2s',
                boxShadow: period === p.value ? `0 3px 10px ${D.gold}40` : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KONTNI ── */}
      <div
        className="profit-inner"
        style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}
      >

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted }}>
            <div style={{
              width: 36, height: 36, border: `3px solid ${D.blueDim}`,
              borderTopColor: D.blue, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
          
            <p style={{ fontSize: 13 }}>{t('dashboard.loadingReport')}</p>
          </div>
        ) : (
          <>
            {/* ── 4 KART REZIME — 2x2 sou mobil ── */}
            <div className="profit-summary-grid">
              <SummaryCard
                label={t('dashboard.totalSalesLabel')}
                value={`${fmt(totaux.vantHtg)} HTG`}
                icon={<ShoppingCart size={17} />}
                color={D.blue}
              />
              <SummaryCard
                label={t('dashboard.totalCostLabel')}
                value={`${fmt(totaux.koutHtg)} HTG`}
                icon={<DollarSign size={17} />}
                color={D.red}
              />
              <SummaryCard
                label={t('dashboard.netProfit')}
                value={`${fmt(totaux.benefisHtg)} HTG`}
                icon={<TrendingUp size={17} />}
                color={Number(totaux.benefisHtg) >= 0 ? D.success : D.red}
              />
              <SummaryCard
                label={t('dashboard.profitMargin')}
                value={`${totaux.majPct}%`}
                icon={<Award size={17} />}
                color={D.gold}
                sub={`${byProduct.length} ${t('dashboard.analyzed')}`}
              />
            </div>

            {/* ── GRAFIK CHAK JOU ── */}
            {daily.length > 0 && (
              <div className="chart-area">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: 0 }}>
                    {t('dashboard.dailyEvolution')}
                  </h4>
                  <button
                    onClick={() => setExpanded(!expandedChart)}
                    style={{
                      background: D.blueDim, border: 'none', borderRadius: 8,
                      padding: '4px 10px', cursor: 'pointer', fontSize: 11,
                      color: D.blue, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    {expandedChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  
                    {expandedChart ? t('dashboard.collapse') : t('dashboard.expand')}
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={expandedChart ? 280 : 160}>
                  <BarChart data={daily} barSize={12} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={D.blueDim} vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: D.muted }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: D.muted }}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      width={35}
                    />
                    <Tooltip content={<ProfitTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif' }} />
                    <Bar dataKey="Vant"    fill={D.blue}    radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Kout"    fill={D.red}     radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Benefis" fill={D.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── TOP 5 PWODUI ── */}
            {top5.length > 0 && (
              <div>
              
                <h4 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 12px' }}>
                  {t('dashboard.top5Products')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {top5.map((p, i) => {
                    const maxBenefis = top5[0]?.benefisHtg || 1
                    const pct = Math.max(0, (p.benefisHtg / maxBenefis) * 100)
                    return (
                      <div key={p.productId} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 12,
                        background: i === 0 ? `${D.gold}10` : D.bg,
                        border: `1px solid ${i === 0 ? D.gold + '30' : D.border}`,
                      }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 8,
                          background: i === 0 ? `linear-gradient(135deg, ${D.gold}, ${D.goldDk})` : D.blueDim,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 900,
                          color: i === 0 ? '#0F1A5C' : D.muted,
                          flexShrink: 0,
                        }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: D.text, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </p>
                          <div style={{ height: 5, background: D.blueDim, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 99, width: `${pct}%`,
                              background: i === 0
                                ? `linear-gradient(90deg, ${D.gold}, ${D.goldDk})`
                                : `linear-gradient(90deg, ${D.blue}, ${D.blueLt})`,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: D.success, margin: 0 }}>
                            +{fmt(p.benefisHtg)}
                          </p>
                          <p style={{ fontSize: 10, color: D.muted, margin: 0 }}>
                            Maj: {p.majPct}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── TABLO DETAYE ── */}
            {byProduct.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: 0 }}>
                    {t('dashboard.productDetail')}
                  </h4>
                  <span style={{ fontSize: 11, color: D.muted }}>
                    {byProduct.length} {t('dashboard.analyzed')}
                  </span>
                </div>

                
                <div className="profit-table-wrap">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: D.blueDim }}>
                        {['Pwodui', 'Kategori', 'Qte', 'Vant HTG', 'Kout HTG', 'Benefis', 'Maj%'].map((h, i) => (
                          <th key={i} style={{
                            padding: '9px 12px', textAlign: i >= 2 ? 'right' : 'left',
                            fontSize: 10, fontWeight: 800, color: D.blue,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayProducts.map((p, idx) => {
                        const isProfit = p.benefisHtg >= 0
                        return (
                          <tr key={p.productId} style={{
                            background: idx % 2 === 0 ? '#fff' : D.bg,
                            borderBottom: `1px solid ${D.border}`,
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : D.bg}
                          >
                            <td style={{ padding: '9px 12px' }}>
                              <p style={{ fontWeight: 700, color: D.text, margin: 0, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </p>
                              {p.code && p.code !== '—' && (
                                <p style={{ fontSize: 10, color: D.muted, margin: 0, fontFamily: 'monospace' }}>{p.code}</p>
                              )}
                            </td>
                            <td style={{ padding: '9px 12px' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: D.blueDim, color: D.blue }}>
                                {p.category}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
                              {Number(p.qteVann).toFixed(0)} {p.unit}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.blue }}>
                              {fmt(p.vantHtg)}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.red }}>
                              {fmt(p.koutHtg)}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: isProfit ? D.success : D.red }}>
                                {isProfit ? '+' : ''}{fmt(p.benefisHtg)}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: 11, fontWeight: 800, padding: '3px 7px', borderRadius: 99,
                                background: isProfit ? D.successBg : D.redDim,
                                color: isProfit ? D.success : D.red,
                              }}>
                                {p.majPct}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bouton wè plis */}
                {byProduct.length > 8 && (
                  <button
                    onClick={() => setShowAll(!showAllProducts)}
                    style={{
                      width: '100%', marginTop: 10, padding: '9px',
                      borderRadius: 10, border: `1px solid ${D.border}`,
                      background: D.blueDim, color: D.blue,
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      fontFamily: 'DM Sans, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {showAllProducts
                      ? <><ChevronUp size={14} /> {t('dashboard.showLess')}</>  /* ✅ */
                      : <><ChevronDown size={14} /> {t('dashboard.seeAll')} {byProduct.length} {t('dashboard.analyzed')}</>
                    }
                  </button>
                )}
              </div>
            )}

            {/* Si pa gen done */}
            {byProduct.length === 0 && !isLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: 36, margin: '0 0 10px' }}>📊</p>
              
                <p style={{ fontWeight: 800, color: D.text, fontSize: 14, margin: '0 0 4px' }}>
                  {t('dashboard.noDataPeriod')}
                </p>
                <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>
                  {t('dashboard.noDataHint')}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
