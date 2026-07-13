// src/pages/reports/ReportsPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportAPI, invoiceAPI } from '../../services/api'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Package, Award, AlertCircle } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const fmt    = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
const fmtUSD = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PERIOD_PRESETS = [
  { labelKey: 'reports.days7',  days: 7  },
  { labelKey: 'reports.days30', days: 30 },
  { labelKey: 'reports.days90', days: 90 },
]

const COLORS = ['#1E40AF', '#6366f1', '#10b981', '#f59e0b', '#ef4444']

const STATUS_LABELS = {
  unpaid:    'Pa peye',
  partial:   'Depo (Pasyèl)',
  paid:      'Peye',
  cancelled: 'Anile',
  overdue:   'An reta',
}

const STATUS_COLORS = {
  unpaid:    '#dc2626',
  partial:   '#d97706',
  paid:      '#16a34a',
  cancelled: '#6b7280',
  overdue:   '#7c2d12',
}

// ✅ Hook responsive — detekte gwosè ekran
function useScreenSize() {
  const [size, setSize] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 }
  })
  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth
      setSize({ isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 })
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const { hasRole, tenant } = useAuthStore()
  const { isMobile, isTablet } = useScreenSize()

  const exchangeRate = Number(tenant?.exchangeRate || 132)
  const htgToUsd     = (htg) => (Number(htg || 0) / exchangeRate)

  const isCashier      = !hasRole('admin')
  const MAX_DAYS       = 2
  const minCashierDate = format(subDays(new Date(), MAX_DAYS), 'yyyy-MM-dd')
  const todayStr       = format(new Date(), 'yyyy-MM-dd')

  const [dateFrom,  setDateFrom]  = useState(isCashier ? minCashierDate : format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo,    setDateTo]    = useState(todayStr)
  const [activeTab, setActiveTab] = useState('sales')

  const handleDateFrom = (val) => { if (isCashier && val < minCashierDate) return; setDateFrom(val) }
  const handleDateTo   = (val) => { if (isCashier && val > todayStr) return;       setDateTo(val) }
  const setPreset = (days) => {
    if (isCashier) return
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
    setDateTo(todayStr)
  }

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn:  () => reportAPI.getSales({ dateFrom, dateTo }).then(r => r.data.report),
    enabled:  activeTab === 'sales',
  })

  // ✅ NOUVO — chèche fakti ki gen dèt pou kalkile top debtors
  const { data: unpaidInvoices } = useQuery({
    queryKey: ['unpaid-invoices', dateFrom, dateTo],
    queryFn:  () => invoiceAPI.getAll({ dateFrom, dateTo, limit: 500 }).then(r => r.data.invoices || []),
    enabled:  activeTab === 'sales',
    staleTime: 30_000,
  })

  // ✅ NOUVO — Total Kredi TOUT TAN (endepandan de filtè dat la anwo a).
  // "Balans Kredi (Dèt)" anba a se sèlman pou peryòd chwazi a (7/30/90 jou);
  // yon kliyan ki gen yon dèt ki soti pi lwen pase peryòd la p ap parèt ladan.
  // Sa a montre total reyèl tout kliyan dwe, kèlkeswa lè fakti a te fèt.
  const { data: allTimeCredit } = useQuery({
    queryKey: ['alltime-credit'],
    queryFn:  () => api.get('/dashboard/full').then(r => r.data.data),
    enabled:  activeTab === 'sales',
    staleTime: 60_000,
  })
  const totalKrediToutTan = Number(allTimeCredit?.dashboard?.totalUnpaid?._sum?.balanceDueHtg||0)
                          + Number(allTimeCredit?.dashboard?.totalPartial?._sum?.balanceDueHtg||0)

  const { data: stockReport } = useQuery({
    queryKey: ['stock-report'],
    queryFn:  () => reportAPI.getStock().then(r => r.data.report),
    enabled:  activeTab === 'stock',
  })

  const { data: topReport } = useQuery({
    queryKey: ['top-products', dateFrom, dateTo],
    queryFn:  () => reportAPI.getTopProducts({ dateFrom, dateTo, limit: 10 }).then(r => r.data.topProducts),
    enabled:  activeTab === 'top',
  })

  const handleTabChange = (key) => { if (key === 'stock' && isCashier) return; setActiveTab(key) }

  const TABS = [
    { key: 'sales', labelKey: 'reports.sales',       icon: <TrendingUp size={isMobile ? 14 : 15}/>, adminOnly: false },
    { key: 'stock', labelKey: 'reports.stock',       icon: <Package    size={isMobile ? 14 : 15}/>, adminOnly: true  },
    { key: 'top',   labelKey: 'reports.topProducts', icon: <Award      size={isMobile ? 14 : 15}/>, adminOnly: false },
  ].filter(tab => !tab.adminOnly || !isCashier)

  // Kalkil global
  const totalHtg   = Number(salesReport?.totals?._sum?.totalHtg || 0)
  const paidHtg    = Number(salesReport?.totals?._sum?.amountPaidHtg || 0)
  const balanceDue = Math.max(0, totalHtg - paidHtg)

  // ✅ KORIJE — kalkile pou chak stati: Vant total, Deja peye, Toujou dwe
  // (sòti nan tout fakti yo paske backend byStatus sèlman bay totalHtg)
  const byStatusDetailed = useMemo(() => {
    const base = (salesReport?.byStatus || []).map(s => ({
      status:      s.status,
      statusLabel: STATUS_LABELS[s.status] || s.status,
      color:       STATUS_COLORS[s.status] || '#94a3b8',
      count:       s._count || 0,
      total:       Number(s._sum?.totalHtg || 0),
      paid:        0,
      owed:        0,
    }))
    // Si nou gen detay fakti yo, mete `paid` ak `owed` reyèl yo pou chak stati
    if (unpaidInvoices?.length) {
      const stats = {}
      unpaidInvoices.forEach(inv => {
        const st = inv.status || 'unpaid'
        if (!stats[st]) stats[st] = { paid: 0, owed: 0 }
        stats[st].paid += Number(inv.amountPaidHtg || 0)
        stats[st].owed += Number(inv.balanceDueHtg || 0)
      })
      base.forEach(b => {
        if (stats[b.status]) {
          b.paid = stats[b.status].paid
          b.owed = stats[b.status].owed
        } else if (b.status === 'paid') {
          // Pou fakti peye yo, peye = total, dwe = 0
          b.paid = b.total
          b.owed = 0
        } else if (b.status === 'unpaid') {
          // Pou fakti pa peye yo, peye = 0, dwe = total
          b.paid = 0
          b.owed = b.total
        }
      })
    }
    return base
  }, [salesReport?.byStatus, unpaidInvoices])

  // Pou grafik la (li sèlman bezwen label + count + color)
  const byStatusTranslated = byStatusDetailed.map(s => ({
    statusLabel: s.statusLabel,
    color:       s.color,
    _count:      s.count,
    _sum:        { totalHtg: s.total },
  }))

  // ✅ NOUVO — gwoupe pa kliyan, jwenn top 5 ki dwe plis
  const topDebtors = useMemo(() => {
    if (!unpaidInvoices?.length) return []
    const byClient = {}
    unpaidInvoices.forEach(inv => {
      const bal = Number(inv.balanceDueHtg || 0)
      if (bal <= 0) return
      const clientName = inv.client?.name || inv.clientSnapshot?.name || 'San Kliyan'
      const clientId   = inv.client?.id || `_${clientName}`
      if (!byClient[clientId]) {
        byClient[clientId] = { id: clientId, name: clientName, balance: 0, invoiceCount: 0, phone: inv.client?.phone }
      }
      byClient[clientId].balance      += bal
      byClient[clientId].invoiceCount += 1
    })
    return Object.values(byClient).sort((a, b) => b.balance - a.balance).slice(0, 5)
  }, [unpaidInvoices])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? 80 : 24 }}>

      <div className="page-header" style={{ marginBottom: isMobile ? 14 : 20 }}>
        <h1 className="page-title" style={{ fontSize: isMobile ? 22 : undefined }}>{t('reports.title')}</h1>
      </div>

      {/* ── Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: isMobile ? 16 : 24,
        background: '#f1f5f9', padding: 4, borderRadius: 12,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        width: 'fit-content', maxWidth: '100%',
      }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => handleTabChange(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '10px 12px' : '8px 14px',
            minHeight: 40,
            borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: isMobile ? 12 : 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
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
        <div style={{ marginBottom: isMobile ? 16 : 20 }}>

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

          {!isCashier && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {PERIOD_PRESETS.map(p => (
                <button key={p.days} onClick={() => setPreset(p.days)} className="btn-secondary btn-sm"
                  style={{ minHeight: 36 }}>
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <input
              type="date"
              className="input"
              style={{
                flex: isMobile ? '1 1 100%' : '1 1 130px',
                width: isMobile ? '100%' : undefined,
                minWidth: 120, maxWidth: isMobile ? '100%' : 180,
                fontSize: 14, minHeight: 42,
              }}
              value={dateFrom}
              min={isCashier ? minCashierDate : undefined}
              max={dateTo}
              onChange={e => handleDateFrom(e.target.value)}
            />
            {!isMobile && <span style={{ color: '#94a3b8', fontSize: 16, flexShrink: 0 }}>→</span>}
            <input
              type="date"
              className="input"
              style={{
                flex: isMobile ? '1 1 100%' : '1 1 130px',
                width: isMobile ? '100%' : undefined,
                minWidth: 120, maxWidth: isMobile ? '100%' : 180,
                fontSize: 14, minHeight: 42,
              }}
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

          {/* ✅ 5 kat estatistik — 2 kolòn sou mobil, auto sou desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: isMobile ? 8 : 12,
          }}>
            {[
              { label: 'Total Vant',         val: `${fmt(totalHtg)} HTG`,           color: '#1B2A8F', bg: '#eff2ff' },
              { label: 'Total USD',          val: `$${fmtUSD(htgToUsd(totalHtg))}`, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Nbr Fakti',          val: salesReport?.totals?._count || 0, color: '#0369a1', bg: '#e0f2fe' },
              { label: 'Peye',               val: `${fmt(paidHtg)} HTG`,            color: '#059669', bg: '#ecfdf5' },
              { label: 'Balans Kredi (Dèt)', val: `${fmt(balanceDue)} HTG`,         color: '#dc2626', bg: '#fef2f2', warn: balanceDue > 0 },
              { label: 'Total Kredi (Tout Tan)', val: `${fmt(totalKrediToutTan)} HTG`, color: '#b45309', bg: '#fffbeb', warn: totalKrediToutTan > 0 },
            ].map((s, i) => (
              <div key={i} className="card" style={{
                padding: isMobile ? '12px 14px' : '14px 16px',
                borderColor: s.warn ? '#fecaca' : undefined,
              }}>
                <p style={{
                  fontSize: isMobile ? 10 : 11,
                  color: '#94a3b8', marginBottom: 4,
                  textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 700,
                }}>{s.label}</p>
                <p style={{
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 700, color: s.color,
                  background: s.bg, borderRadius: 6,
                  padding: '3px 8px', display: 'inline-block',
                  wordBreak: 'break-all', lineHeight: 1.5,
                }}>{s.val}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: -4 }}>
            1 USD = {fmt(exchangeRate)} HTG (to aktyèl) · "Balans Kredi (Dèt)" se pou peryòd chwazi a, "Total Kredi (Tout Tan)" se total dèt tout kliyan kèlkeswa dat fakti a
          </p>

          {/* ✅ NOUVO — Top 5 Kliyan ki Dwe */}
          {topDebtors.length > 0 && (
            <div className="card" style={{ padding: isMobile ? 14 : 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 12 : 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'rgba(220,38,38,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertCircle size={16} color="#dc2626"/>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    Top Kliyan ki Dwe
                  </h3>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                    5 pi gwo dèt nan peryòd la
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
                {topDebtors.map((c, i) => (
                  <Link
                    key={c.id}
                    to={`/app/invoices?search=${encodeURIComponent(c.name)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
                      padding: isMobile ? '10px 12px' : '12px 14px',
                      borderRadius: 12,
                      background: i === 0 ? 'rgba(220,38,38,0.04)' : '#fafaf9',
                      border:     i === 0 ? '1px solid rgba(220,38,38,0.15)' : '1px solid #f0e8d8',
                      textDecoration: 'none',
                      minHeight: 56,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = i === 0 ? 'rgba(220,38,38,0.07)' : '#f5f5f4'}
                    onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'rgba(220,38,38,0.04)' : '#fafaf9'}
                  >
                    <div style={{
                      width: isMobile ? 28 : 32, height: isMobile ? 28 : 32,
                      borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMobile ? 13 : 14, fontWeight: 800,
                      background: i === 0 ? '#dc2626' : i < 3 ? '#fef3c7' : '#f1f5f9',
                      color:      i === 0 ? '#fff'    : i < 3 ? '#d97706' : '#64748b',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: isMobile ? 13 : 14, fontWeight: 700, color: '#1e293b',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                        {c.invoiceCount} fakti{c.phone ? ` · ${c.phone}` : ''}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        fontSize: isMobile ? 13 : 15, fontWeight: 900, color: '#dc2626',
                        fontFamily: 'monospace', margin: 0,
                      }}>
                        {fmt(c.balance)}
                      </p>
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', fontWeight: 600 }}>
                        HTG
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: '1px dashed #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 8,
              }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  Total dèt top 5
                </span>
                <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace' }}>
                  {fmt(topDebtors.reduce((a, c) => a + c.balance, 0))} HTG
                </span>
              </div>
            </div>
          )}

          {/* Stati + grafik */}
          {byStatusDetailed.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: isMobile ? 12 : 16,
            }}>
              <div className="card" style={{ padding: isMobile ? 16 : 20 }}>
                <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: '#1e293b', margin: '0 0 14px' }}>
                  Vant pa Stati
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14 }}>
                  {byStatusDetailed.map((s, i) => {
                    const isPartial = s.status === 'partial'
                    const isPaid    = s.status === 'paid'
                    const isUnpaid  = s.status === 'unpaid'
                    return (
                      <div key={i} style={{
                        padding: isMobile ? '10px 12px' : '12px 14px',
                        background: '#fafaf9',
                        borderRadius: 12,
                        border: `1px solid ${s.color}25`,
                        borderLeft: `4px solid ${s.color}`,
                      }}>
                        {/* Tit + kantite */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }}/>
                            <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: '#1e293b' }}>
                              {s.statusLabel}
                            </span>
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, background: '#fff', padding: '2px 8px', borderRadius: 99 }}>
                            {s.count} fakti
                          </span>
                        </div>

                        {/* Detay nimewo yo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: isMobile ? 11 : 12 }}>

                          {/* Pou Pa peye → sèlman montre "Total dwe" */}
                          {isUnpaid && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Total dwe:</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                                {fmt(s.total)} HTG
                              </span>
                            </div>
                          )}

                          {/* Pou Pasyèl → montre tout 3 (Total, Depo peye, Dwe) */}
                          {isPartial && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Vant total:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                                  {fmt(s.total)} HTG
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Depo peye:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>
                                  +{fmt(s.paid)} HTG
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: 4, marginTop: 2 }}>
                                <span style={{ color: '#dc2626', fontWeight: 700 }}>Toujou dwe:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                                  {fmt(s.owed)} HTG
                                </span>
                              </div>
                            </>
                          )}

                          {/* Pou Peye → sèlman montre "Total peye" */}
                          {isPaid && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Total peye:</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>
                                ✓ {fmt(s.total)} HTG
                              </span>
                            </div>
                          )}

                          {/* Lòt stati (Anile, Remèt) → senp */}
                          {!isUnpaid && !isPartial && !isPaid && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Total:</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: s.color }}>
                                {fmt(s.total)} HTG
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: isMobile ? 16 : 20 }}>
                <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: '#1e293b', margin: '0 0 14px' }}>
                  Repatisyon
                </h3>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                  <PieChart>
                    <Pie
                      data={byStatusTranslated}
                      dataKey="_count" nameKey="statusLabel"
                      cx="50%" cy="50%"
                      outerRadius={isMobile ? 60 : 80}
                    >
                      {byStatusTranslated.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} fakti`, name]}/>
                    <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }}/>
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
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: isMobile ? 8 : 12,
          }}>
            {[
              { label: 'Total Pwodwi', val: stockReport.totalProducts,                  warn: false },
              { label: 'Stòk Ba',      val: stockReport.lowStock,                       warn: stockReport.lowStock > 0 },
              { label: 'Pa gen Stòk',  val: stockReport.outOfStock,                     warn: stockReport.outOfStock > 0 },
              { label: 'Valè Stòk',    val: `${fmt(stockReport.stockValue?.priceHtg)}`, warn: false },
            ].map((s, i) => (
              <div key={i} className="card" style={{
                padding: isMobile ? '12px 14px' : '14px 16px',
                borderColor: s.warn ? '#fed7aa' : undefined,
              }}>
                <p style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                  {s.label}
                </p>
                <p style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: s.warn ? '#ea580c' : '#1e293b', wordBreak: 'break-all' }}>
                  {s.val}
                </p>
              </div>
            ))}
          </div>

          {/* Lis pwodwi — kat sou mobil, tablo sou desktop/tablet */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stockReport.products?.map(p => {
                const low = Number(p.quantity) <= Number(p.alertThreshold)
                return (
                  <div key={p.id} className="card" style={{
                    padding: '12px 14px',
                    borderColor: low ? '#fed7aa' : undefined,
                    background:  low ? 'rgba(251,146,60,0.04)' : '#fff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </p>
                        {p.code && (
                          <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', margin: '2px 0 0' }}>{p.code}</p>
                        )}
                      </div>
                      {p.category && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#eff2ff', color: '#1B2A8F', fontWeight: 700, flexShrink: 0 }}>
                          {p.category.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                      <div>
                        <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>QTE</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 800, margin: '2px 0 0', color: low ? '#ea580c' : '#1e293b' }}>
                          {Number(p.quantity)} {p.unit}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>ALÈT</p>
                        <p style={{ fontFamily: 'monospace', color: '#64748b', margin: '2px 0 0' }}>
                          {Number(p.alertThreshold)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>VALÈ</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 700, margin: '2px 0 0', color: '#1e293b' }}>
                          {fmt(Number(p.quantity) * Number(p.priceHtg))}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="table" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th>Pwodwi</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'right' }}>QTE</th>
                    <th style={{ textAlign: 'right' }}>Alèt</th>
                    <th style={{ textAlign: 'right' }}>Valè HTG</th>
                  </tr>
                </thead>
                <tbody>
                  {stockReport.products?.map(p => {
                    const low = Number(p.quantity) <= Number(p.alertThreshold)
                    return (
                      <tr key={p.id} style={{ background: low ? 'rgba(251,146,60,0.06)' : undefined }}>
                        <td>
                          <p style={{ fontWeight: 600 }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{p.code}</p>
                        </td>
                        <td>{p.category?.name || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: low ? '#ea580c' : '#334155' }}>
                          {Number(p.quantity)} {p.unit}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>{Number(p.alertThreshold)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(Number(p.quantity) * Number(p.priceHtg))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ TOP PWODWI ════ */}
      {activeTab === 'top' && (
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topReport?.length ? topReport.map((item, i) => (
              <div key={i} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                    background: i < 3 ? '#fef3c7' : '#f1f5f9',
                    color:      i < 3 ? '#d97706' : '#64748b',
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product?.name}
                    </p>
                    {item.product?.code && (
                      <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', margin: '2px 0 0' }}>{item.product.code}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
                  <div>
                    <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>VANN</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 800, margin: '2px 0 0' }}>
                      {Number(item._sum?.quantity || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>KÒMAND</p>
                    <p style={{ fontFamily: 'monospace', color: '#64748b', margin: '2px 0 0' }}>
                      {item._count}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontWeight: 600, margin: 0 }}>TOTAL</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 700, margin: '2px 0 0', color: '#1B2A8F' }}>
                      {fmt(item._sum?.totalHtg)}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                Pa gen done
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ minWidth: 440 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pwodwi</th>
                  <th style={{ textAlign: 'center' }}>Qte Vann</th>
                  <th style={{ textAlign: 'right' }}>Total HTG</th>
                  <th style={{ textAlign: 'center' }}>Kòmand</th>
                </tr>
              </thead>
              <tbody>
                {topReport?.length ? topReport.map((item, i) => (
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
                      <p style={{ fontWeight: 600 }}>{item.product?.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{item.product?.code}</p>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{Number(item._sum?.quantity || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(item._sum?.totalHtg)} HTG</td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{item._count}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5}>
                      <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                        Pa gen done
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}