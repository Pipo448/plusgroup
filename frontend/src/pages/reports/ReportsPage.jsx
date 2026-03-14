// src/pages/reports/ReportsPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Package, Award } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const PERIOD_PRESETS = [
  { labelKey: 'reports.days7',  days: 7  },
  { labelKey: 'reports.days30', days: 30 },
  { labelKey: 'reports.days90', days: 90 },
]

const COLORS = ['#1E40AF', '#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function ReportsPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuthStore()

  const isCashier      = !hasRole('admin')
  const MAX_DAYS       = 2
  const minCashierDate = format(subDays(new Date(), MAX_DAYS), 'yyyy-MM-dd')
  const todayStr       = format(new Date(), 'yyyy-MM-dd')

  const [dateFrom,  setDateFrom]  = useState(isCashier ? minCashierDate : format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo,    setDateTo]    = useState(todayStr)
  const [activeTab, setActiveTab] = useState('sales')

  const handleDateFrom = (val) => {
    if (isCashier && val < minCashierDate) return
    setDateFrom(val)
  }

  const handleDateTo = (val) => {
    if (isCashier && val > todayStr) return
    setDateTo(val)
  }

  const setPreset = (days) => {
    if (isCashier) return
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
    setDateTo(todayStr)
  }

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn:  () => reportAPI.getSales({ dateFrom, dateTo }).then(r => r.data.report),
    enabled:  activeTab === 'sales'
  })

  const { data: stockReport } = useQuery({
    queryKey: ['stock-report'],
    queryFn:  () => reportAPI.getStock().then(r => r.data.report),
    enabled:  activeTab === 'stock'
  })

  const { data: topReport } = useQuery({
    queryKey: ['top-products', dateFrom, dateTo],
    queryFn:  () => reportAPI.getTopProducts({ dateFrom, dateTo, limit: 10 }).then(r => r.data.topProducts),
    enabled:  activeTab === 'top'
  })

  const TABS = [
    { key: 'sales', labelKey: 'reports.sales',      icon: <TrendingUp size={15} /> },
    { key: 'stock', labelKey: 'reports.stock',       icon: <Package    size={15} /> },
    { key: 'top',   labelKey: 'reports.topProducts', icon: <Award      size={15} /> },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
      </div>

      {/* ── Tabs — scroll horizontal sou mobil */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: '#f1f5f9', padding: 4, borderRadius: 12,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        width: 'fit-content', maxWidth: '100%',
      }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
            background: activeTab === tab.key ? '#fff'    : 'transparent',
            color:      activeTab === tab.key ? '#1B2A8F' : '#64748b',
            boxShadow:  activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}>
            {tab.icon} {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* ── Filtè dat */}
      {activeTab !== 'stock' && (
        <div style={{ marginBottom: 20 }}>

          {/* Mesaj limit kesye */}
          {isCashier && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, marginBottom: 10,
              background: 'rgba(217,119,6,0.08)',
              border: '1px solid rgba(217,119,6,0.25)',
              fontSize: 12, color: '#d97706', fontWeight: 600,
            }}>
              <span>⏱</span> Aksè limite: {MAX_DAYS} dènye jou sèlman
            </div>
          )}

          {/* Presè — admin sèlman */}
          {!isCashier && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {PERIOD_PRESETS.map(p => (
                <button key={p.days} onClick={() => setPreset(p.days)} className="btn-secondary btn-sm">
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          )}

          {/* Inputs dat — stack sou mobil, liy sou desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="date"
              className="input"
              style={{ flex: '1 1 130px', minWidth: 120, maxWidth: 180, fontSize: 13 }}
              value={dateFrom}
              min={isCashier ? minCashierDate : undefined}
              max={dateTo}
              onChange={e => handleDateFrom(e.target.value)}
            />
            <span style={{ color: '#94a3b8', fontSize: 16, flexShrink: 0 }}>→</span>
            <input
              type="date"
              className="input"
              style={{ flex: '1 1 130px', minWidth: 120, maxWidth: 180, fontSize: 13 }}
              value={dateTo}
              min={dateFrom}
              max={todayStr}
              onChange={e => handleDateTo(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ════ VANT ════ */}
      {activeTab === 'sales' && (
        <div className="space-y-5">

          {/* Stat cards — auto-fit: 1 kolòn sou ti mobil, 2 sou tablet, 4 sou desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: t('reports.totalSales'),   val: `${fmt(salesReport?.totals?._sum?.totalHtg)} HTG`,      color: '#1B2A8F', bg: '#eff2ff' },
              { label: t('reports.totalUsd'),     val: `${fmt(salesReport?.totals?._sum?.totalUsd)} USD`,      color: '#7c3aed', bg: '#f5f3ff' },
              { label: t('reports.invoiceCount'), val: salesReport?.totals?._count || 0,                       color: '#059669', bg: '#ecfdf5' },
              { label: t('reports.paid'),         val: `${fmt(salesReport?.totals?._sum?.amountPaidHtg)} HTG`, color: '#059669', bg: '#ecfdf5' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{s.label}</p>
                <p style={{
                  fontSize: 14, fontWeight: 700, color: s.color,
                  background: s.bg, borderRadius: 6,
                  padding: '2px 8px', display: 'inline-block',
                  wordBreak: 'break-all', lineHeight: 1.5,
                }}>{s.val}</p>
              </div>
            ))}
          </div>

          {salesReport?.byStatus && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}>
              <div className="card p-5">
                <h3 className="section-title">{t('reports.salesByStatus')}</h3>
                <div className="space-y-3">
                  {salesReport.byStatus.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#475569', textTransform: 'capitalize' }}>{s.status}</span>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{fmt(s._sum?.totalHtg)} HTG</p>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>{s._count} {t('reports.invoices')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="section-title">{t('reports.distribution')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={salesReport.byStatus} dataKey="_count" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                      {salesReport.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} ${t('reports.invoices')}`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ STÒK ════ */}
      {activeTab === 'stock' && stockReport && (
        <div className="space-y-5">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: t('reports.totalProducts'), val: stockReport.totalProducts,                  warn: false },
              { label: t('reports.lowStock'),      val: stockReport.lowStock,                       warn: stockReport.lowStock > 0 },
              { label: t('reports.outOfStock'),    val: stockReport.outOfStock,                     warn: stockReport.outOfStock > 0 },
              { label: t('reports.stockValue'),    val: `${fmt(stockReport.stockValue?.priceHtg)}`, warn: false },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px', borderColor: s.warn ? '#fed7aa' : undefined }}>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.warn ? '#ea580c' : '#1e293b', wordBreak: 'break-all' }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Tablo — scroll horizontal sou mobil */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th>{t('reports.product')}</th>
                  <th>{t('reports.category')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.qty')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.alertThreshold')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.stockValueHtg')}</th>
                </tr>
              </thead>
              <tbody>
                {stockReport.products?.map(p => (
                  <tr key={p.id} style={{ background: Number(p.quantity) <= Number(p.alertThreshold) ? 'rgba(251,146,60,0.06)' : undefined }}>
                    <td>
                      <p style={{ fontWeight: 500 }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{p.code}</p>
                    </td>
                    <td>{p.category?.name || '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: Number(p.quantity) <= Number(p.alertThreshold) ? '#ea580c' : '#334155' }}>
                      {Number(p.quantity)} {p.unit}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>{Number(p.alertThreshold)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(Number(p.quantity) * Number(p.priceHtg))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ TOP PWODWI ════ */}
      {activeTab === 'top' && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="table" style={{ minWidth: 440 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('reports.product')}</th>
                <th style={{ textAlign: 'center' }}>{t('reports.qtySold')}</th>
                <th style={{ textAlign: 'right' }}>{t('reports.totalHtg')}</th>
                <th style={{ textAlign: 'center' }}>{t('reports.orderCount')}</th>
              </tr>
            </thead>
            <tbody>
              {topReport?.map((item, i) => (
                <tr key={i}>
                  <td style={{ width: 40 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      background: i < 3 ? '#fef3c7' : '#f1f5f9',
                      color:      i < 3 ? '#d97706' : '#64748b',
                    }}>{i + 1}</span>
                  </td>
                  <td>
                    <p style={{ fontWeight: 500 }}>{item.product?.name}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{item.product?.code}</p>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{Number(item._sum?.quantity || 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(item._sum?.totalHtg)} HTG</td>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>{item._count}</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={5}>
                    <div style={{ padding: '32px 0', textAlign: 'center' }}>
                      <p style={{ color: '#94a3b8' }}>{t('reports.noData')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}