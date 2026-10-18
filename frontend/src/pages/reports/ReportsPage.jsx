// src/pages/reports/ReportsPage.jsx — Plus Fit redesign
// ✅ KORIJE:
//   • To USD la te sèvi ak « exchangeRate || 132 » sèlman → kounye a li pran to USD ki nan Paramèt yo
//   • Dat yo (jodi a, limit kesye a) te kalkile ak lè telefòn nan, pa lè Ayiti
//   • « Total vant » te ka konte fakti ANILE yo → kounye a se vant nèt (san anile)
//   • Paj la te telechaje jiska 500 fakti KONPLÈ (menm sa ki peye) pou jwenn dèt yo → kounye a
//     li chèche SÈLMAN fakti ki pa peye/pasyèl/an reta (mwens done, pi rapid — bon pou kota Supabase)
//   • Fakti « an reta » pa t janm gen kantite ki dwe a
//   • Pa t gen chajman ni mesaj erè: paj la te rete vid
//   • Kantite vann te toujou gen 2 desimal (« 12.00 ») → kounye a « 12 » oswa « 2.5 »
//   • Grafik pòm nan te konte fakti, pa lajan → kounye a se lajan, ak sant ki montre % kolekte
// ✅ NOUVO:
//   • Peryòd rapid (Jodi a, Yè, 7 jou, Mwa sa a, 30, 90) ak bouton aktif la ki make
//   • Konparezon ak peryòd anvan an (↑ / ↓ %) pou admin
//   • Wonn « % kolekte » nan tèt paj la, panye mwayen pa fakti
//   • Estòk: rechèch, filt (ba / fini), triye, nivo vizyèl, valè pri vann ak kou
//   • Top pwodui: ba pwopòsyonèl ak pati chak pwodui nan vant lan
//   • Ekspòte chak onglè an CSV (Excel), paj la sonje dènye onglè a
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp, TrendingDown, Package, Award, AlertCircle, BarChart3, Receipt, Wallet, CreditCard,
  FileText, Download, Search, Clock, ArrowRight, ShoppingBag, Layers, RefreshCw, Minus, Boxes, Info,
} from 'lucide-react'
import api, { reportAPI, invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import '../invoices/invoices.css'

const TZ = 'America/Port-au-Prince'
const TAB_KEY = 'pg-reports-tab'
const tr = (t, k, fb) => { const v = t(k); return v && v !== k ? v : fb }
const fmt = (n, d = 2) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmt0 = (n) => fmt(Math.round(Number(n || 0)), 0)
const fmtQty = (n) => { const x = Number(n || 0); return Number.isInteger(x) ? fmt(x, 0) : fmt(x, 2).replace(/0$/, '') }
const fmtUSD = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Dat an lè Ayiti (yyyy-mm-dd) ──
const todayHT = () => new Date().toLocaleDateString('fr-CA', { timeZone: TZ })
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d + n)); return dt.toISOString().slice(0, 10) }
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5)
const fmtDay = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }

const STATUS = {
  paid:      { label: 'Peye',          color: '#059669' },
  partial:   { label: 'Depo (pasyèl)', color: '#D97706' },
  unpaid:    { label: 'Pa peye',       color: '#DC2626' },
  overdue:   { label: 'An reta',       color: '#9A3412' },
  cancelled: { label: 'Anile',         color: '#94A3B8' },
}
const ST_ORDER = ['paid', 'partial', 'unpaid', 'overdue', 'cancelled']
const DEBT_STATUSES = ['unpaid', 'partial', 'overdue']

// ── CSV (Excel aksepte ; + BOM pou aksan yo) ──
function downloadCSV(name, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = '﻿' + rows.map(r => r.map(esc).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function useCountUp(value, ms = 700) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

function Delta({ cur, prev }) {
  if (prev == null) return null
  if (!prev && !cur) return null
  if (!prev) return <span className="rp-delta up"><TrendingUp size={11}/> nouvo</span>
  const p = ((cur - prev) / Math.abs(prev)) * 100
  if (Math.abs(p) < 0.5) return <span className="rp-delta flat"><Minus size={11}/> 0%</span>
  return <span className={`rp-delta ${p > 0 ? 'up' : 'down'}`}>{p > 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>} {p > 0 ? '+' : ''}{p.toFixed(p > 99 || p < -99 ? 0 : 1)}%</span>
}

function KpiCard({ label, value, icon: Icon, color, money, usd, sub, delta, warn, delay = 0, loading }) {
  const v = useCountUp(value)
  return (
    <div className={`rp-kpi ${warn ? 'warn' : ''}`} style={{ '--kc': color, animationDelay: `${delay}ms` }}>
      <div className="l"><i><Icon size={14}/></i> {label}</div>
      {loading ? <div className="iv-sk" style={{ height: 24, width: '70%', marginTop: 10 }}/> : (
        <div className="v" style={warn ? { color } : undefined}>
          {usd ? `$${fmtUSD(v)}` : money ? fmt0(v) : Math.round(v)}{money && <small>HTG</small>}
        </div>
      )}
      {(sub || delta) && <div className="s" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{delta}{sub}</div>}
    </div>
  )
}

// Grafik wonn an SVG (pa bezwen bibliyotèk)
function Donut({ data, centerTop, centerSub }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = 76, C = 2 * Math.PI * R
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t) }, [])
  let acc = 0
  return (
    <div className="rp-donut">
      <svg viewBox="0 0 190 190" width="100%" height="100%">
        <circle cx="95" cy="95" r={R} fill="none" stroke="rgba(15,26,92,.06)" strokeWidth="22"/>
        {data.filter(d => d.value > 0).map(d => {
          const len = (d.value / total) * C
          const el = <circle key={d.key} className="seg" cx="95" cy="95" r={R} fill="none" stroke={d.color} strokeWidth="22"
            strokeDasharray={ready ? `${Math.max(0, len - 2)} ${C}` : `0 ${C}`} strokeDashoffset={-acc}/>
          acc += len
          return el
        })}
      </svg>
      <div className="c"><div><b className="num">{centerTop}</b><small>{centerSub}</small></div></div>
    </div>
  )
}

function Empty({ icon: Icon = BarChart3, title, text }) {
  return (
    <div className="iv-empty">
      <div className="art"><div className="paper"><i/><i/><i/><i/></div><div className="bubble"><Icon size={18}/></div></div>
      <h3>{title}</h3><p>{text}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const { t } = useTranslation()
  const { hasRole, tenant } = useAuthStore()
  const isCashier = !(hasRole?.('admin'))
  const MAX_DAYS = 2

  // ✅ To USD: Paramèt → exchangeRates.USD, sinon exchangeRate
  const exchangeRate = Number(tenant?.exchangeRates?.USD || tenant?.exchangeRate || 0) || 132
  const today = todayHT()
  const minCashier = addDays(today, -MAX_DAYS)

  const PRESETS = [
    { k: 'today', label: 'Jodi a',     range: () => [today, today] },
    { k: 'yest',  label: 'Yè',         range: () => [addDays(today, -1), addDays(today, -1)] },
    { k: '7',     label: '7 jou',      range: () => [addDays(today, -6), today], admin: true },
    { k: 'month', label: 'Mwa sa a',   range: () => [today.slice(0, 8) + '01', today], admin: true },
    { k: '30',    label: '30 jou',     range: () => [addDays(today, -29), today], admin: true },
    { k: '90',    label: '90 jou',     range: () => [addDays(today, -89), today], admin: true },
  ].filter(p => !p.admin || !isCashier)

  const [dateFrom, setDateFrom] = useState(isCashier ? minCashier : addDays(today, -29))
  const [dateTo, setDateTo] = useState(today)
  const [activeTab, setActiveTab] = useState(() => { try { return localStorage.getItem(TAB_KEY) || 'sales' } catch { return 'sales' } })
  const tab = isCashier && activeTab === 'stock' ? 'sales' : activeTab
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab) } catch {} }, [tab])

  const activePreset = PRESETS.find(p => { const [a, b] = p.range(); return a === dateFrom && b === dateTo })?.k
  const applyPreset = (p) => { const [a, b] = p.range(); setDateFrom(a); setDateTo(b) }
  const onFrom = (v) => { if (!v) return; if (isCashier && v < minCashier) v = minCashier; setDateFrom(v); if (v > dateTo) setDateTo(v) }
  const onTo = (v) => { if (!v) return; if (v > today) v = today; if (isCashier && v < minCashier) v = minCashier; setDateTo(v); if (v < dateFrom) setDateFrom(v) }

  // Peryòd anvan (menm longè) pou konparezon
  const len = daysBetween(dateFrom, dateTo) + 1
  const prevTo = addDays(dateFrom, -1), prevFrom = addDays(prevTo, -(len - 1))

  // ── Done ──
  const salesQ = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn: () => reportAPI.getSales({ dateFrom, dateTo }).then(r => r.data.report),
    enabled: tab === 'sales', staleTime: 60_000,
  })
  const prevQ = useQuery({
    queryKey: ['sales-report', prevFrom, prevTo],
    queryFn: () => reportAPI.getSales({ dateFrom: prevFrom, dateTo: prevTo }).then(r => r.data.report),
    enabled: tab === 'sales' && !isCashier, staleTime: 5 * 60_000,
  })
  // ✅ SÈLMAN fakti ki gen dèt (pa tout fakti yo) — mwens done
  const debtQs = useQueries({
    queries: DEBT_STATUSES.map(status => ({
      queryKey: ['report-debts', status, dateFrom, dateTo],
      queryFn: () => invoiceAPI.getAll({ dateFrom, dateTo, status, limit: 300 }).then(r => ({ list: r.data.invoices || [], total: Number(r.data.total || 0) })),
      enabled: tab === 'sales', staleTime: 60_000,
    })),
  })
  const creditQ = useQuery({
    queryKey: ['alltime-credit'],
    queryFn: () => api.get('/dashboard/full').then(r => r.data.data),
    enabled: tab === 'sales' && !isCashier, staleTime: 5 * 60_000,
  })
  const stockQ = useQuery({
    queryKey: ['stock-report'],
    queryFn: () => reportAPI.getStock().then(r => r.data.report),
    enabled: tab === 'stock', staleTime: 2 * 60_000,
  })
  const topQ = useQuery({
    queryKey: ['top-products', dateFrom, dateTo],
    queryFn: () => reportAPI.getTopProducts({ dateFrom, dateTo, limit: 10 }).then(r => r.data.topProducts || []),
    enabled: tab === 'top', staleTime: 60_000,
  })

  // ── Kalkil vant ──
  const sales = salesQ.data
  const debtInvoices = useMemo(() => {
    const seen = new Set(), out = []
    debtQs.forEach(q => (q.data?.list || []).forEach(inv => {
      if (seen.has(inv.id)) return
      if (!DEBT_STATUSES.includes(inv.status || 'unpaid')) return // si sèvè a inyore filt la
      seen.add(inv.id); out.push(inv)
    }))
    return out
  }, [debtQs.map(q => q.dataUpdatedAt).join()]) // eslint-disable-line
  const debtTruncated = debtQs.some(q => q.data && q.data.total > q.data.list.length)

  const calc = (rep) => {
    if (!rep) return null
    const by = {}
    ;(rep.byStatus || []).forEach(s => { by[s.status] = { count: Number(s._count || 0), total: Number(s._sum?.totalHtg || 0) } })
    const sumAll = Object.values(by).reduce((a, s) => a + s.total, 0)
    const rawTotal = Number(rep.totals?._sum?.totalHtg || 0)
    const cancelled = by.cancelled?.total || 0
    // ✅ Si total la gen anile yo ladan (li egal sòm tout estati yo), retire yo
    const includesCancelled = cancelled > 0 && Math.abs(rawTotal - sumAll) < 1
    const net = includesCancelled ? rawTotal - cancelled : rawTotal
    const count = Number(rep.totals?._count || 0) - (includesCancelled ? (by.cancelled?.count || 0) : 0)
    const paid = Number(rep.totals?._sum?.amountPaidHtg || 0)
    return { by, net, count, paid, owed: Math.max(0, net - paid), avg: count ? net / count : 0 }
  }
  const cur = useMemo(() => calc(sales), [sales]) // eslint-disable-line
  const prev = useMemo(() => calc(prevQ.data), [prevQ.data]) // eslint-disable-line
  const collectPct = cur?.net ? Math.min(100, (cur.paid / cur.net) * 100) : 0

  const totalKrediToutTan = Number(creditQ.data?.dashboard?.totalUnpaid?._sum?.balanceDueHtg || 0)
                          + Number(creditQ.data?.dashboard?.totalPartial?._sum?.balanceDueHtg || 0)

  const statusRows = useMemo(() => {
    if (!cur) return []
    const agg = {}
    debtInvoices.forEach(inv => {
      const st = inv.status || 'unpaid'
      agg[st] = agg[st] || { paid: 0, owed: 0 }
      agg[st].paid += Number(inv.amountPaidHtg || 0)
      agg[st].owed += Number(inv.balanceDueHtg || 0)
    })
    return ST_ORDER.filter(k => cur.by[k]).map(k => {
      const b = cur.by[k]
      const paid = k === 'paid' ? b.total : k === 'cancelled' || k === 'unpaid' ? 0 : (agg[k]?.paid ?? 0)
      // Pa peye = tout total la dwe; pasyèl/an reta = sa fakti yo di ki rete
      const owed = k === 'paid' || k === 'cancelled' ? 0 : k === 'unpaid' ? b.total : (agg[k]?.owed ?? 0)
      return { key: k, ...STATUS[k], count: b.count, total: b.total, paid, owed }
    })
  }, [cur, debtInvoices])

  const topDebtors = useMemo(() => {
    const by = {}
    debtInvoices.forEach(inv => {
      const bal = Number(inv.balanceDueHtg || 0)
      if (bal <= 0) return
      const name = inv.client?.name || inv.clientSnapshot?.name || 'San kliyan'
      const id = inv.client?.id || `_${name}`
      by[id] = by[id] || { id, name, balance: 0, invoiceCount: 0, phone: inv.client?.phone || inv.clientSnapshot?.phone, oldest: inv.issueDate }
      by[id].balance += bal
      by[id].invoiceCount += 1
      if (inv.issueDate && (!by[id].oldest || inv.issueDate < by[id].oldest)) by[id].oldest = inv.issueDate
    })
    return Object.values(by).sort((a, b) => b.balance - a.balance).slice(0, 5)
  }, [debtInvoices])
  const debtMax = topDebtors[0]?.balance || 1
  const ageDays = (d) => d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 864e5)) : null

  // ── Estòk ──
  const [sq, setSq] = useState('')
  const [sf, setSf] = useState('')
  const [sort, setSort] = useState('value')
  const [showN, setShowN] = useState(60)
  const stock = stockQ.data
  const stockList = useMemo(() => {
    const k = sq.trim().toLowerCase()
    const rows = (stock?.products || []).filter(p => !p.isService).map(p => {
      const qty = Number(p.quantity || 0), alert = Number(p.alertThreshold || 0)
      return { ...p, qty, alert, value: qty * Number(p.priceHtg || 0), cost: qty * Number(p.costPriceHtg || 0), lvl: qty <= 0 ? 'out' : qty <= alert ? 'low' : 'ok' }
    })
    return rows
      .filter(p => !sf || p.lvl === sf)
      .filter(p => !k || [p.name, p.code, p.category?.name].some(x => (x || '').toLowerCase().includes(k)))
      .sort((a, b) => sort === 'qty' ? a.qty - b.qty : sort === 'name' ? (a.name || '').localeCompare(b.name || '') : b.value - a.value)
  }, [stock, sq, sf, sort])
  const stockAgg = useMemo(() => {
    const ps = (stock?.products || []).filter(p => !p.isService)
    const value = Number(stock?.stockValue?.priceHtg ?? ps.reduce((s, p) => s + Number(p.quantity || 0) * Number(p.priceHtg || 0), 0))
    const cost = Number(stock?.stockValue?.costHtg ?? ps.reduce((s, p) => s + Number(p.quantity || 0) * Number(p.costPriceHtg || 0), 0))
    return { value, cost }
  }, [stock])
  useEffect(() => setShowN(60), [sq, sf, sort])

  // ── Top ──
  const top = topQ.data || []
  const topTotal = top.reduce((s, x) => s + Number(x._sum?.totalHtg || 0), 0) || 1
  const topMax = Number(top[0]?._sum?.totalHtg || 0) || 1

  // ── Ekspòtasyon ──
  const exportCSV = () => {
    const tag = `${dateFrom}_${dateTo}`
    if (tab === 'sales' && cur) {
      downloadCSV(`rapo-vant_${tag}.csv`, [
        ['Rapò vant', `${fmtDay(dateFrom)} → ${fmtDay(dateTo)}`], [],
        ['Vant nèt (HTG)', cur.net.toFixed(2)], ['Peye (HTG)', cur.paid.toFixed(2)], ['Dèt peryòd (HTG)', cur.owed.toFixed(2)], ['Fakti', cur.count], [],
        ['Estati', 'Fakti', 'Total HTG', 'Peye HTG', 'Dwe HTG'],
        ...statusRows.map(s => [s.label, s.count, s.total.toFixed(2), s.paid.toFixed(2), s.owed.toFixed(2)]), [],
        ['Kliyan ki dwe', 'Fakti', 'Dwe HTG', 'Telefòn'],
        ...topDebtors.map(c => [c.name, c.invoiceCount, c.balance.toFixed(2), c.phone || '']),
      ])
    } else if (tab === 'stock') {
      downloadCSV(`rapo-estok_${today}.csv`, [
        ['Pwodui', 'Kòd', 'Kategori', 'Kantite', 'Inite', 'Alèt', 'Valè HTG', 'Eta'],
        ...stockList.map(p => [p.name, p.code || '', p.category?.name || '', p.qty, p.unit || '', p.alert, p.value.toFixed(2), p.lvl === 'out' ? 'Fini' : p.lvl === 'low' ? 'Ba' : 'OK']),
      ])
    } else if (tab === 'top') {
      downloadCSV(`top-pwodui_${tag}.csv`, [
        ['#', 'Pwodui', 'Kòd', 'Kantite vann', 'Kòmand', 'Total HTG'],
        ...top.map((x, i) => [i + 1, x.product?.name || '', x.product?.code || '', Number(x._sum?.quantity || 0), x._count, Number(x._sum?.totalHtg || 0).toFixed(2)]),
      ])
    }
  }

  const TABS = [
    { key: 'sales', label: tr(t, 'reports.sales', 'Vant'), icon: TrendingUp },
    !isCashier && { key: 'stock', label: tr(t, 'reports.stock', 'Estòk'), icon: Package },
    { key: 'top', label: tr(t, 'reports.topProducts', 'Top pwodui'), icon: Award },
  ].filter(Boolean)
  const loadingSales = salesQ.isLoading
  const refetchAll = () => { salesQ.refetch(); stockQ.refetch(); topQ.refetch(); debtQs.forEach(q => q.refetch()) }
  const busy = salesQ.isFetching || stockQ.isFetching || topQ.isFetching

  return (
    <div className="iv" style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* ══════════ HERO ══════════ */}
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(56,189,248,.45), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico sky"><BarChart3 size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Rapò'}</p>
            <h1>{tr(t, 'reports.title', 'Rapò')}</h1>
            <div className="meta-line">
              {tab !== 'stock'
                ? <span><Clock size={12}/> {fmtDay(dateFrom)}{dateFrom !== dateTo && <> <ArrowRight size={11}/> {fmtDay(dateTo)}</>} · {len} jou</span>
                : <span><Package size={12}/> Eta estòk kounye a</span>}
              <span>1 USD = {fmt(exchangeRate)} HTG</span>
            </div>
          </div>
          {tab === 'sales' && cur && (
            <div className="hx" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="rp-ring" style={{ '--p': collectPct.toFixed(0), '--rc': collectPct >= 80 ? '#34D399' : collectPct >= 50 ? '#FBBF24' : '#F87171' }}><b>{collectPct.toFixed(0)}%</b></div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', lineHeight: 1.4 }}>Lajan<br/>kolekte</div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════ ONGLÈ + AKSYON ══════════ */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 14 }}>
        <nav className="set-tabs" role="tablist" style={{ marginBottom: 0, flex: '1 1 0', minWidth: 0 }}>
          {TABS.map(tb => { const I = tb.icon; return (
            <button key={tb.key} role="tab" aria-selected={tab === tb.key} className={`set-tab ${tab === tb.key ? 'on' : ''}`} onClick={() => setActiveTab(tb.key)}>
              <I size={15}/> <span className="lb">{tb.label}</span>
            </button>
          ) })}
        </nav>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="iv-act icon" style={{ height: '100%' }} onClick={refetchAll} aria-label="Rafrechi" title="Rafrechi"><RefreshCw size={15} className={busy ? 'spin' : ''}/></button>
          <button className="iv-act green" style={{ height: '100%' }} onClick={exportCSV} disabled={(tab === 'sales' && !cur) || (tab === 'stock' && !stock) || (tab === 'top' && !top.length)}><Download size={15}/> <span className="lbx">CSV</span></button>
        </div>
      </div>

      {/* ══════════ PERYÒD ══════════ */}
      {tab !== 'stock' && (
        <div className="iv-bar rp-period">
          <div className="iv-chips" style={{ flex: '1 1 auto' }}>
            {PRESETS.map(p => <button key={p.k} className={`iv-chip ${activePreset === p.k ? 'on' : ''}`} onClick={() => applyPreset(p)}>{p.label}</button>)}
          </div>
          <div className="rp-dates">
            <input type="date" value={dateFrom} min={isCashier ? minCashier : undefined} max={today} onChange={e => onFrom(e.target.value)} aria-label="Depi"/>
            <ArrowRight size={14} color="#94A3B8" style={{ flexShrink: 0 }}/>
            <input type="date" value={dateTo} min={isCashier ? minCashier : dateFrom} max={today} onChange={e => onTo(e.target.value)} aria-label="Jiska"/>
          </div>
        </div>
      )}
      {isCashier && tab !== 'stock' && (
        <div className="iv-banner pend"><span className="ic"><Clock size={16}/></span><span className="grow">Aksè limite: ou ka wè sèlman <b>{MAX_DAYS} dènye jou</b> yo.</span></div>
      )}

      {/* ══════════ VANT ══════════ */}
      {tab === 'sales' && (
        salesQ.isError ? (
          <div className="iv-empty"><h3>Pa ka chaje rapò a</h3><p>Verifye koneksyon entènèt ou.</p><button className="iv-act" onClick={() => salesQ.refetch()}><RefreshCw size={14}/> Eseye ankò</button></div>
        ) : (
          <>
            <div className="rp-kpis">
              <KpiCard label="Vant nèt" value={cur?.net} money icon={TrendingUp} color="#1B2A8F" loading={loadingSales}
                delta={!isCashier && prev ? <Delta cur={cur?.net || 0} prev={prev.net}/> : null} sub={!isCashier && prev ? 'vs peryòd anvan' : null}/>
              <KpiCard label="An dola" value={(cur?.net || 0) / exchangeRate} usd icon={CreditCard} color="#7C3AED" loading={loadingSales} delay={50} sub={`1 USD = ${fmt(exchangeRate)} HTG`}/>
              <KpiCard label="Fakti" value={cur?.count} icon={Receipt} color="#0284C7" loading={loadingSales} delay={100}
                delta={!isCashier && prev ? <Delta cur={cur?.count || 0} prev={prev.count}/> : null} sub={cur?.count ? `Mwayèn ${fmt0(cur.avg)} HTG` : null}/>
              <KpiCard label="Peye" value={cur?.paid} money icon={Wallet} color="#059669" loading={loadingSales} delay={150} sub={cur ? `${collectPct.toFixed(0)}% kolekte` : null}/>
              <KpiCard label="Dèt peryòd la" value={cur?.owed} money icon={AlertCircle} color="#DC2626" warn={cur?.owed > 0} loading={loadingSales} delay={200}/>
              {!isCashier && <KpiCard label="Kredi tout tan" value={totalKrediToutTan} money icon={Layers} color="#B45309" warn={totalKrediToutTan > 0} loading={creditQ.isLoading} delay={250} sub="Tout dèt kliyan yo"/>}
            </div>
            <p className="rp-info"><Info size={13} style={{ flexShrink: 0, marginTop: 2 }}/> « Dèt peryòd la » = fakti peryòd chwazi a sèlman. « Kredi tout tan » = tout sa kliyan yo dwe, kèlkeswa dat fakti a. Fakti anile pa konte nan vant yo.</p>

            {Number(sales?.directQuoteConverted?._count || 0) > 0 && (
              <div className="iv-banner auth" style={{ flexWrap: 'wrap' }}>
                <span className="ic"><FileText size={16}/></span>
                <span className="grow">
                  <b>{sales.directQuoteConverted._count} Devi Dirèk konvèti</b> · {fmt(sales.directQuoteConverted._sum?.totalHtg)} HTG
                  {Number(sales.directQuoteConverted._sum?.totalUsd) > 0 && <> (${fmtUSD(sales.directQuoteConverted._sum.totalUsd)})</>}
                  <small style={{ display: 'block', fontWeight: 600, opacity: .8 }}>Deja enkli nan « Vant nèt » — se yon detay.</small>
                </span>
                <Link to="/app/direct-quotes" className="iv-act" style={{ textDecoration: 'none' }}>Wè yo <ArrowRight size={13}/></Link>
              </div>
            )}

            {loadingSales ? (
              <div className="rp-cols">{[0, 1].map(i => <section key={i} className="iv-sec">{[60, 90, 75, 40].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 14 }}/>)}</section>)}</div>
            ) : !cur?.count && !cur?.by?.cancelled ? (
              <Empty icon={ShoppingBag} title="Pa gen vant" text="Pa gen okenn fakti nan peryòd sa a. Chwazi yon lòt peryòd."/>
            ) : (
              <div className="rp-cols">
                <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
                  <section className="iv-sec a-up">
                    <div className="iv-sec-h">
                      <div className="n"><BarChart3 size={17}/></div>
                      <div><p className="eb">Detay</p><h3>Vant pa estati</h3></div>
                    </div>
                    {statusRows.map((s, i) => (
                      <div key={s.key} className="rp-st" style={{ '--sc': s.color, animationDelay: `${i * 50}ms` }}>
                        <div className="h">
                          <b>{s.label}</b>
                          <span className="iv-badge" style={{ background: '#fff', color: 'var(--muted)' }}>{s.count} fakti</span>
                        </div>
                        <div className="iv-rrow" style={{ fontSize: 12.5 }}><span>Total</span><span className="num" style={{ fontSize: 15, fontWeight: 700, color: s.key === 'cancelled' ? 'var(--muted)' : 'var(--ink)', textDecoration: s.key === 'cancelled' ? 'line-through' : 'none' }}>{fmt(s.total)} HTG</span></div>
                        {(s.key === 'partial' || s.key === 'overdue') && s.paid > 0 && <div className="iv-rrow" style={{ fontSize: 12.5 }}><span>Depo peye</span><span className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ok)' }}>+{fmt(s.paid)} HTG</span></div>}
                        {s.owed > 0 && <div className="iv-rrow" style={{ fontSize: 12.5 }}><span style={{ color: 'var(--bad)', fontWeight: 800 }}>Toujou dwe</span><span className="num" style={{ fontSize: 16, fontWeight: 800, color: 'var(--bad)' }}>{fmt(s.owed)} HTG</span></div>}
                        {s.key !== 'cancelled' && cur.net > 0 && <div className="bar"><i style={{ width: `${Math.min(100, (s.total / cur.net) * 100)}%` }}/></div>}
                      </div>
                    ))}
                  </section>

                  {topDebtors.length > 0 && (
                    <section className="iv-sec a-up" style={{ animationDelay: '80ms' }}>
                      <div className="iv-sec-h">
                        <div className="n" style={{ background: 'linear-gradient(135deg,#DC2626,#F87171)' }}><AlertCircle size={17}/></div>
                        <div><p className="eb">Pou rekouvre</p><h3>Top kliyan ki dwe</h3></div>
                        <div className="r num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--bad)' }}>{fmt0(topDebtors.reduce((a, c) => a + c.balance, 0))} <small style={{ fontSize: 11, color: 'var(--muted)' }}>HTG</small></div>
                      </div>
                      {topDebtors.map((c, i) => {
                        const age = ageDays(c.oldest)
                        return (
                          <Link key={c.id} to={`/app/invoices?search=${encodeURIComponent(c.name)}`} className="rp-rank" style={{ '--mc': 'var(--bad)', animationDelay: `${i * 50}ms` }}>
                            <span className={`no ${i === 0 ? 'red' : ''}`}>{i + 1}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <b style={{ display: 'block', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</b>
                              <small style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                                {c.invoiceCount} fakti{c.phone ? ` · ${c.phone}` : ''}{age != null && age > 0 ? ` · ${age} jou` : ''}
                              </small>
                            </span>
                            <span className="amt"><b style={{ color: 'var(--bad)' }}>{fmt(c.balance)}</b><small>HTG</small></span>
                            <span className="meter" style={{ width: `${(c.balance / debtMax) * 100}%` }}/>
                          </Link>
                        )
                      })}
                      {debtTruncated && <p className="iv-note">Gen anpil fakti ki dwe — lis la baze sou 300 dènye yo pou chak estati.</p>}
                    </section>
                  )}
                </div>

                <section className="iv-sec a-up" style={{ animationDelay: '60ms', position: 'sticky', top: 16 }}>
                  <div className="iv-sec-h">
                    <div className="n" style={{ background: 'linear-gradient(135deg,#38BDF8,#0369A1)' }}><Layers size={17}/></div>
                    <div><p className="eb">An lajan</p><h3>Repatisyon</h3></div>
                  </div>
                  <Donut
                    data={statusRows.filter(s => s.key !== 'cancelled').map(s => ({ key: s.key, value: s.total, color: s.color }))}
                    centerTop={`${collectPct.toFixed(0)}%`} centerSub="kolekte"/>
                  <div className="rp-leg">
                    {statusRows.filter(s => s.key !== 'cancelled').map(s => (
                      <div key={s.key}><i style={{ background: s.color }}/> {s.label}<span className="n">{cur.net ? ((s.total / cur.net) * 100).toFixed(0) : 0}% · <span className="num" style={{ fontSize: 14, color: 'var(--ink)' }}>{fmt0(s.total)}</span></span></div>
                    ))}
                  </div>
                  <div className="iv-rtotal" style={{ marginTop: 16 }}>
                    <span>Vant nèt</span>
                    <span className="num">{fmt(cur.net)}<small>HTG</small></span>
                  </div>
                </section>
              </div>
            )}
          </>
        )
      )}

      {/* ══════════ ESTÒK ══════════ */}
      {tab === 'stock' && (
        stockQ.isError ? (
          <div className="iv-empty"><h3>Pa ka chaje estòk la</h3><p>Verifye koneksyon entènèt ou.</p><button className="iv-act" onClick={() => stockQ.refetch()}><RefreshCw size={14}/> Eseye ankò</button></div>
        ) : (
          <>
            <div className="rp-kpis">
              <KpiCard label="Pwodui" value={stock?.totalProducts} icon={Boxes} color="#1B2A8F" loading={stockQ.isLoading}/>
              <KpiCard label="Estòk ba" value={stock?.lowStock} icon={AlertCircle} color="#D97706" warn={stock?.lowStock > 0} loading={stockQ.isLoading} delay={50}/>
              <KpiCard label="Fini" value={stock?.outOfStock} icon={Package} color="#DC2626" warn={stock?.outOfStock > 0} loading={stockQ.isLoading} delay={100}/>
              <KpiCard label="Valè (pri vann)" value={stockAgg.value} money icon={Wallet} color="#059669" loading={stockQ.isLoading} delay={150}
                sub={stockAgg.cost > 0 ? `Kou: ${fmt0(stockAgg.cost)} HTG · maj ${fmt0(stockAgg.value - stockAgg.cost)}` : null}/>
            </div>

            <div className="iv-bar">
              <div className="iv-search"><Search size={16}/><input value={sq} onChange={e => setSq(e.target.value)} placeholder="Chèche pwodui, kòd, kategori…"/></div>
              <div className="iv-chips">
                {[['', 'Tout', null], ['low', 'Ba', '#D97706'], ['out', 'Fini', '#DC2626'], ['ok', 'OK', '#059669']].map(([k, l, c]) => (
                  <button key={k} className={`iv-chip ${sf === k ? 'on' : ''}`} onClick={() => setSf(k)}>{c && <span className="dot" style={{ background: c }}/>}{l}</button>
                ))}
              </div>
              <select className="iv-inp" style={{ width: 'auto', minHeight: 40 }} value={sort} onChange={e => setSort(e.target.value)} aria-label="Triye">
                <option value="value">Pi gwo valè</option>
                <option value="qty">Mwens kantite</option>
                <option value="name">Non A→Z</option>
              </select>
            </div>

            {stockQ.isLoading ? (
              <section className="iv-sec">{[80, 60, 70, 50, 65].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 16 }}/>)}</section>
            ) : !stockList.length ? (
              <Empty icon={Package} title="Okenn pwodui" text={sq || sf ? 'Chanje rechèch la oswa filt la.' : 'Pa gen pwodui nan estòk la.'}/>
            ) : (
              <section className="iv-sec a-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="rp-stock-row hd"><span>Pwodui</span><span className="cat">Kategori</span><span className="r">Kantite</span><span className="r alt">Alèt</span><span className="r">Valè HTG</span></div>
                {stockList.slice(0, showN).map((p, i) => {
                  const c = p.lvl === 'out' ? '#DC2626' : p.lvl === 'low' ? '#D97706' : '#059669'
                  const pct = p.alert > 0 ? Math.min(100, (p.qty / (p.alert * 3)) * 100) : p.qty > 0 ? 100 : 0
                  return (
                    <div key={p.id} className="rp-stock-row" style={{ animationDelay: `${Math.min(i, 20) * 15}ms`, background: p.lvl !== 'ok' ? `${c}08` : undefined }}>
                      <span style={{ minWidth: 0 }}>
                        <b style={{ display: 'block', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</b>
                        <small className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{p.code || '—'}{p.category?.name ? <span className="m-only"> · {p.category.name}</span> : null}</small>
                      </span>
                      <span className="cat">{p.category ? <span className="iv-badge" style={{ background: `${p.category.color || '#1B2A8F'}18`, color: p.category.color || 'var(--blue)' }}>{p.category.name}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</span>
                      <span className="r">
                        <b className="num" style={{ fontSize: 16, color: p.lvl === 'ok' ? 'var(--ink)' : c }}>{fmtQty(p.qty)}</b> <small style={{ color: 'var(--muted)', fontSize: 11 }}>{p.unit}</small>
                        <div className="rp-lvl"><i style={{ width: `${pct}%`, background: c }}/></div>
                      </span>
                      <span className="r alt num" style={{ color: 'var(--muted)', fontSize: 15 }}>{fmtQty(p.alert)}</span>
                      <span className="r num" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(p.value)}</span>
                    </div>
                  )
                })}
                {stockList.length > showN && (
                  <div style={{ padding: 14, textAlign: 'center' }}>
                    <button className="iv-act" onClick={() => setShowN(n => n + 60)}>Montre plis ({stockList.length - showN} ankò)</button>
                  </div>
                )}
              </section>
            )}
          </>
        )
      )}

      {/* ══════════ TOP PWODUI ══════════ */}
      {tab === 'top' && (
        topQ.isError ? (
          <div className="iv-empty"><h3>Pa ka chaje lis la</h3><p>Verifye koneksyon entènèt ou.</p><button className="iv-act" onClick={() => topQ.refetch()}><RefreshCw size={14}/> Eseye ankò</button></div>
        ) : topQ.isLoading ? (
          <section className="iv-sec">{[80, 60, 70, 50].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 16 }}/>)}</section>
        ) : !top.length ? (
          <Empty icon={Award} title="Pa gen done" text="Pa gen pwodui vann nan peryòd sa a."/>
        ) : (
          <div className="rp-cols">
            <section className="iv-sec a-up">
              <div className="iv-sec-h">
                <div className="n" style={{ background: 'linear-gradient(135deg,#E0B84C,#A87B12)' }}><Award size={17}/></div>
                <div><p className="eb">Sa ki vann plis</p><h3>Top {top.length} pwodui</h3></div>
              </div>
              {top.map((x, i) => {
                const tot = Number(x._sum?.totalHtg || 0)
                return (
                  <div key={x.product?.id || i} className="rp-rank" style={{ '--mc': i < 3 ? '#F59E0B' : 'var(--blue)', animationDelay: `${i * 45}ms` }}>
                    <span className={`no ${i < 3 ? `g${i + 1}` : ''}`}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.product?.name || 'Pwodui efase'}</b>
                      <small style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        <b className="num" style={{ fontSize: 13, color: 'var(--ink)' }}>{fmtQty(x._sum?.quantity)}</b> vann · {x._count} kòmand{x.product?.code ? <span className="mono"> · {x.product.code}</span> : null}
                      </small>
                    </span>
                    <span className="amt"><b>{fmt0(tot)}</b><small>{((tot / topTotal) * 100).toFixed(0)}% · HTG</small></span>
                    <span className="meter" style={{ width: `${(tot / topMax) * 100}%` }}/>
                  </div>
                )
              })}
            </section>
            <section className="iv-sec a-up" style={{ animationDelay: '60ms', position: 'sticky', top: 16 }}>
              <div className="iv-sec-h">
                <div className="n" style={{ background: 'linear-gradient(135deg,#38BDF8,#0369A1)' }}><Layers size={17}/></div>
                <div><p className="eb">Pati nan vant</p><h3>Top 5</h3></div>
              </div>
              {(() => {
                const PAL = ['#1B2A8F', '#FF6B00', '#0EA5E9', '#059669', '#7C3AED']
                const top5 = top.slice(0, 5).map((x, i) => ({ key: i, value: Number(x._sum?.totalHtg || 0), color: PAL[i], name: x.product?.name }))
                const rest = topTotal - top5.reduce((s, d) => s + d.value, 0)
                const data = rest > 0.5 ? [...top5, { key: 'r', value: rest, color: '#CBD5E1', name: 'Lòt (top 6–10)' }] : top5
                return (
                  <>
                    <Donut data={data} centerTop={fmtQty(top.reduce((s, x) => s + Number(x._sum?.quantity || 0), 0))} centerSub="inite vann"/>
                    <div className="rp-leg">
                      {data.map(d => <div key={d.key}><i style={{ background: d.color }}/> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{d.name}</span><span className="n">{((d.value / topTotal) * 100).toFixed(0)}%</span></div>)}
                    </div>
                    <div className="iv-rtotal" style={{ marginTop: 16 }}><span>Total top {top.length}</span><span className="num">{fmt(topTotal)}<small>HTG</small></span></div>
                  </>
                )
              })()}
            </section>
          </div>
        )
      )}
    </div>
  )
}