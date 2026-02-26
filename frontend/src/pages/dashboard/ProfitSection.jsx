// ══════════════════════════════════════════════════════════════
// ProfitSection.jsx — Seksyon Rapò Benefis pou Dashboard
// Mete nan: frontend/src/pages/dashboard/ProfitSection.jsx
// ══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

const PERIODS = [
  { label: "Jodi a",       value: "today" },
  { label: "7 jou",        value: "7days" },
  { label: "Mwa sa",       value: "month" },
  { label: "Semèn sa",     value: "week" },
  { label: "30 jou",       value: "30days" },
]

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
        borderRadius: 16, padding: '18px 16px',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? `0 12px 32px ${color}25` : D.shadow,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${color}40`,
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
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, fontSize: 16, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: D.muted, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

export default function ProfitSection() {
  const [period, setPeriod]         = useState('month')
  const [showAllProducts, setShowAll] = useState(false)
  const [expandedChart, setExpanded]  = useState(false)

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
    date:    d.date.substring(5), // MM-DD
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

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px',
        borderBottom: `2px solid ${D.blueDim}`,
        background: `linear-gradient(135deg, ${D.blueDim}, ${D.goldDim || 'rgba(201,168,76,0.06)'})`,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(135deg, ${D.gold}, ${D.goldDk})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${D.gold}40`,
          }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: D.text, margin: '0 0 2px' }}>
              📊 Rapò Benefis
            </h3>
            <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
              Vant vs Kout · Admin sèlman
            </p>
          </div>
        </div>

        {/* Filtre peryòd */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: D.muted }}>
            <div style={{
              width: 36, height: 36, border: `3px solid ${D.blueDim}`,
              borderTopColor: D.blue, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
            <p style={{ fontSize: 13 }}>Ap chaje rapò...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* ── 4 KART REZIME ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <SummaryCard
                label="Vant Total"
                value={`${fmt(totaux.vantHtg)} HTG`}
                icon={<ShoppingCart size={18} />}
                color={D.blue}
              />
              <SummaryCard
                label="Kout Total"
                value={`${fmt(totaux.koutHtg)} HTG`}
                icon={<DollarSign size={18} />}
                color={D.red}
              />
              <SummaryCard
                label="Benefis Net"
                value={`${fmt(totaux.benefisHtg)} HTG`}
                icon={<TrendingUp size={18} />}
                color={Number(totaux.benefisHtg) >= 0 ? D.success : D.red}
              />
              <SummaryCard
                label="Maj Benefis"
                value={`${totaux.majPct}%`}
                icon={<Award size={18} />}
                color={D.gold}
                sub={`${byProduct.length} pwodui analyze`}
              />
            </div>

            {/* ── GRAFIK VANT vs KOUT vs BENEFIS ── */}
            {daily.length > 0 && (
              <div style={{
                background: D.bg, borderRadius: 16, padding: '16px 18px',
                border: `1px solid ${D.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: 0 }}>
                    Evolisyon Chak Jou
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
                    {expandedChart ? 'Rédui' : 'Agrandi'}
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={expandedChart ? 300 : 180}>
                  <BarChart data={daily} barSize={14} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke={D.blueDim} vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: D.muted }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: D.muted }}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip content={<ProfitTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} />
                    <Bar dataKey="Vant"    fill={D.blue}    radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Kout"    fill={D.red}     radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Benefis" fill={D.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── TOP 5 PWODUI PWOFITAB ── */}
            {top5.length > 0 && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: '0 0 12px' }}>
                  🏆 Top 5 Pwodui Pwofitab
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {top5.map((p, i) => {
                    const maxBenefis = top5[0]?.benefisHtg || 1
                    const pct = Math.max(0, (p.benefisHtg / maxBenefis) * 100)
                    return (
                      <div key={p.productId} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 12,
                        background: i === 0 ? `${D.gold}10` : D.bg,
                        border: `1px solid ${i === 0 ? D.gold + '30' : D.border}`,
                      }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 8,
                          background: i === 0
                            ? `linear-gradient(135deg, ${D.gold}, ${D.goldDk})`
                            : D.blueDim,
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

            {/* ── TABLO DETAYE PA PWODUI ── */}
            {byProduct.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: D.text, margin: 0 }}>
                    Detay pa Pwodui
                  </h4>
                  <span style={{ fontSize: 11, color: D.muted }}>
                    {byProduct.length} pwodui
                  </span>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${D.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: D.blueDim }}>
                        {['Pwodui', 'Kategori', 'Qte Vann', 'Vant HTG', 'Kout HTG', 'Benefis HTG', 'Maj %'].map((h, i) => (
                          <th key={i} style={{
                            padding: '10px 14px', textAlign: i >= 2 ? 'right' : 'left',
                            fontSize: 10, fontWeight: 800, color: D.blue,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
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
                            transition: 'background 0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : D.bg}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <p style={{ fontWeight: 700, color: D.text, margin: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </p>
                              {p.code && p.code !== '—' && (
                                <p style={{ fontSize: 10, color: D.muted, margin: 0, fontFamily: 'monospace' }}>{p.code}</p>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                background: D.blueDim, color: D.blue,
                              }}>{p.category}</span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.text }}>
                              {Number(p.qteVann).toFixed(0)} {p.unit}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.blue }}>
                              {fmt(p.vantHtg)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: D.red }}>
                              {fmt(p.koutHtg)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <span style={{
                                fontFamily: 'monospace', fontWeight: 800, fontSize: 12,
                                color: isProfit ? D.success : D.red,
                              }}>
                                {isProfit ? '+' : ''}{fmt(p.benefisHtg)}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
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
                      ? <><ChevronUp size={14} /> Montre mwens</>
                      : <><ChevronDown size={14} /> Wè tout {byProduct.length} pwodui</>
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
                  Pa gen done pou peryòd sa
                </p>
                <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>
                  Chwazi yon peryòd diferan oswa verifye si pwodui yo gen pri kout (costPriceHtg)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
