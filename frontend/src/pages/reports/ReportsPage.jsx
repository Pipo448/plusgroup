// src/pages/reports/ReportsPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportAPI } from '../../services/api'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Package, Award } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const PERIOD_PRESETS = [
  { labelKey: 'reports.days7',  days: 7 },
  { labelKey: 'reports.days30', days: 30 },
  { labelKey: 'reports.days90', days: 90 },
]

const COLORS = ['#1E40AF', '#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function ReportsPage() {
  const { t } = useTranslation()
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [activeTab, setActiveTab] = useState('sales')

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn: () => reportAPI.getSales({ dateFrom, dateTo }).then(r => r.data.report),
    enabled: activeTab === 'sales'
  })

  const { data: stockReport } = useQuery({
    queryKey: ['stock-report'],
    queryFn: () => reportAPI.getStock().then(r => r.data.report),
    enabled: activeTab === 'stock'
  })

  const { data: topReport } = useQuery({
    queryKey: ['top-products', dateFrom, dateTo],
    queryFn: () => reportAPI.getTopProducts({ dateFrom, dateTo, limit: 10 }).then(r => r.data.topProducts),
    enabled: activeTab === 'top'
  })

  const setPreset = (days) => {
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
    setDateTo(format(new Date(), 'yyyy-MM-dd'))
  }

  const TABS = [
    { key:'sales', labelKey:'reports.sales', icon:<TrendingUp size={15}/> },
    { key:'stock', labelKey:'reports.stock', icon:<Package size={15}/> },
    { key:'top',   labelKey:'reports.topProducts', icon:<Award size={15}/> },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.icon} {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Date filter */}
      {activeTab !== 'stock' && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-1">
            {PERIOD_PRESETS.map(p => (
              <button key={p.days} onClick={() => setPreset(p.days)}
                className="btn-secondary btn-sm">{t(p.labelKey)}</button>
            ))}
          </div>
          <input type="date" className="input w-40 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-slate-400">→</span>
          <input type="date" className="input w-40 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      )}

      {/* VENTES */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('reports.totalSales'),   val:`${fmt(salesReport?.totals?._sum?.totalHtg)} HTG`,              color:'text-brand-700 bg-brand-50' },
              { label: t('reports.totalUsd'),     val:`${fmt(salesReport?.totals?._sum?.totalUsd)} USD`,              color:'text-purple-700 bg-purple-50' },
              { label: t('reports.invoiceCount'), val: salesReport?.totals?._count || 0,                              color:'text-emerald-700 bg-emerald-50' },
              { label: t('reports.paid'),         val:`${fmt(salesReport?.totals?._sum?.amountPaidHtg)} HTG`,         color:'text-emerald-700 bg-emerald-50' },
            ].map((s,i) => (
              <div key={i} className="card p-4">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-lg font-display font-bold ${s.color} rounded-lg px-2 py-0.5 inline-block`}>{s.val}</p>
              </div>
            ))}
          </div>

          {salesReport?.byStatus && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="section-title">{t('reports.salesByStatus')}</h3>
                <div className="space-y-3">
                  {salesReport.byStatus.map((s,i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-slate-600">{s.status}</span>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-sm">{fmt(s._sum?.totalHtg)} HTG</p>
                        <p className="text-xs text-slate-400">{s._count} {t('reports.invoices')}</p>
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

      {/* STOCK */}
      {activeTab === 'stock' && stockReport && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('reports.totalProducts'), val: stockReport.totalProducts },
              { label: t('reports.lowStock'),      val: stockReport.lowStock,      warn: stockReport.lowStock > 0 },
              { label: t('reports.outOfStock'),    val: stockReport.outOfStock,    warn: stockReport.outOfStock > 0 },
              { label: t('reports.stockValue'),    val: `${fmt(stockReport.stockValue?.priceHtg)}` },
            ].map((s,i) => (
              <div key={i} className={`card p-4 ${s.warn ? 'border-orange-200' : ''}`}>
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-xl font-display font-bold ${s.warn ? 'text-orange-600' : 'text-slate-800'}`}>{s.val}</p>
              </div>
            ))}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('reports.product')}</th>
                  <th>{t('reports.category')}</th>
                  <th className="text-right">{t('reports.qty')}</th>
                  <th className="text-right">{t('reports.alertThreshold')}</th>
                  <th className="text-right">{t('reports.stockValueHtg')}</th>
                </tr>
              </thead>
              <tbody>
                {stockReport.products?.map(p => (
                  <tr key={p.id} className={Number(p.quantity) <= Number(p.alertThreshold) ? 'bg-orange-50/50' : ''}>
                    <td><p className="font-medium">{p.name}</p><p className="text-xs text-slate-400 font-mono">{p.code}</p></td>
                    <td>{p.category?.name || '—'}</td>
                    <td className={`text-right font-mono font-bold ${Number(p.quantity) <= Number(p.alertThreshold) ? 'text-orange-600' : 'text-slate-700'}`}>
                      {Number(p.quantity)} {p.unit}
                    </td>
                    <td className="text-right font-mono text-slate-400">{Number(p.alertThreshold)}</td>
                    <td className="text-right font-mono">{fmt(Number(p.quantity) * Number(p.priceHtg))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOP PRODUITS */}
      {activeTab === 'top' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('reports.product')}</th>
                <th className="text-center">{t('reports.qtySold')}</th>
                <th className="text-right">{t('reports.totalHtg')}</th>
                <th className="text-center">{t('reports.orderCount')}</th>
              </tr>
            </thead>
            <tbody>
              {topReport?.map((item, i) => (
                <tr key={i}>
                  <td className="w-10">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {i+1}
                    </span>
                  </td>
                  <td><p className="font-medium">{item.product?.name}</p><p className="text-xs text-slate-400 font-mono">{item.product?.code}</p></td>
                  <td className="text-center font-mono">{Number(item._sum?.quantity || 0).toFixed(2)}</td>
                  <td className="text-right font-mono font-semibold">{fmt(item._sum?.totalHtg)} HTG</td>
                  <td className="text-center text-slate-500">{item._count}</td>
                </tr>
              )) || (
                <tr><td colSpan={5}><div className="empty-state py-8"><p className="text-slate-400">{t('reports.noData')}</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
