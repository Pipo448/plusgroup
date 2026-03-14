// src/pages/invoices/InvoicesPage.jsx
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Search, Receipt, Eye, ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react'
import { format } from 'date-fns'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

const STATUS_KEYS = ['unpaid','partial','paid','cancelled','refunded']

const parseCurrencies = (raw) => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) {
      try { return JSON.parse(raw) } catch { return [] }
    }
    if (raw.trim().length > 0) return [raw.trim()]
  }
  return []
}

const convertFromHTG = (amountHTG, currency, exchangeRates = {}) => {
  const rateToHTG = Number(exchangeRates[currency] || 0)
  if (!rateToHTG) return null
  return { amount: amountHTG / rateToHTG, symbol: CURRENCY_SYMBOLS[currency] || currency }
}

const fmtConv = (amountHTG, exchangeRates, visibleCurrencies = []) => {
  if (!visibleCurrencies.length) return null
  const parts = visibleCurrencies
    .map(cur => convertFromHTG(amountHTG, cur, exchangeRates))
    .filter(Boolean)
    .map(c => `≈ ${c.symbol}${fmt(c.amount)}`)
  return parts.length ? parts.join('  ') : null
}

function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)
  const isMobile  = useIsMobile()
  const { tenant } = useAuthStore()

  const debouncedSearch = useDebounce(search, 400)

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates || {}
  const visibleCurrs  = useMemo(() => parseCurrencies(tenant?.visibleCurrencies), [tenant?.visibleCurrencies])
  const requireQuote  = tenant?.requireQuote === true

  const STATUS_MAP = useMemo(() => ({
    unpaid:    { label: t('invoices.unpaid'),    color: D.red,     bg: D.redDim },
    partial:   { label: t('invoices.partial'),   color: D.warning, bg: D.warningBg },
    paid:      { label: t('invoices.paid'),      color: D.success, bg: D.successBg },
    cancelled: { label: t('invoices.cancelled'), color: '#666',    bg: 'rgba(100,100,100,0.08)' },
    refunded:  { label: t('invoices.refunded'),  color: D.blue,    bg: D.blueDim },
  }), [t])

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['invoices', debouncedSearch, status, page],
    queryFn: () => invoiceAPI.getAll({ search: debouncedSearch, status, page, limit: 15 }).then(r => {
      const d = r.data || {}
      return {
        invoices: Array.isArray(d.invoices) ? d.invoices : [],
        total:    d.total || 0,
        pages:    d.pages || 1,
      }
    }),
    keepPreviousData: true,
    staleTime: 20_000,
  })

  const data = rawData || { invoices: [], total: 0, pages: 1 }

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((v) => {
    setStatus(v)
    setPage(1)
  }, [])

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
            <Receipt size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>{t('invoices.title')}</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{data.total} {t('invoices.total')}</p>
          </div>
        </div>

        {!requireQuote && (
          <Link to="/app/invoices/new"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', boxShadow:`0 4px 16px ${D.orange}45` }}>
            <Plus size={16}/> {t('invoices.newInvoice') || 'Nouvo Fakti'}
          </Link>
        )}

        {requireQuote && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:12, background:'rgba(27,42,143,0.06)', border:`1px dashed ${D.border}`, color:D.muted, fontSize:12, fontWeight:600 }}>
            <FileText size={14} color={D.muted}/>
            {t('invoices.requireQuoteHint') || 'Pase pa Devi → Konvèti pou kreye fakti'}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input
            placeholder={t('invoices.searchPlaceholder')}
            value={search}
            onChange={handleSearchChange}
            style={{ width:'100%', paddingLeft:36, padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' }}
            onFocus={e => e.target.style.borderColor = D.blue}
            onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0, width: isMobile ? '100%' : 'auto' }}>
          {[
            { v:'',          l: t('invoices.all') },
            { v:'unpaid',    l: t('invoices.unpaid') },
            { v:'partial',   l: t('invoices.partial') },
            { v:'paid',      l: t('invoices.paid') },
            { v:'cancelled', l: t('invoices.cancelled') },
            { v:'refunded',  l: t('invoices.refunded') },
          ].map(opt => (
            <button key={opt.v} onClick={() => handleStatusChange(opt.v)}
              style={{
                padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
                background: status === opt.v ? D.blue : '#F4F6FF',
                color: status === opt.v ? '#fff' : D.muted,
                border: `1.5px solid ${status === opt.v ? D.blue : D.border}`,
                boxShadow: status === opt.v ? `0 3px 10px ${D.blue}35` : 'none',
                whiteSpace:'nowrap', flexShrink:0,
              }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* MOBIL: Kat */}
      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {isLoading
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ background:D.white, borderRadius:14, padding:16, border:`1px solid ${D.border}` }}>
                  {Array(4).fill(0).map((_, j) => (
                    <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6, marginBottom:10, animation:'pulse 1.5s infinite', width: j === 0 ? '60%' : j === 1 ? '40%' : '80%' }}/>
                  ))}
                </div>
              ))
            : !data.invoices.length
            ? <EmptyState requireQuote={requireQuote} D={D} t={t}/>
            : data.invoices.map(inv => {
                const s = STATUS_MAP[inv.status] || STATUS_MAP.unpaid
                return <InvCard key={inv.id} inv={inv} s={s} D={D} fmt={fmt} t={t} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs}/>
              })
          }
        </div>
      ) : (
        /* DESKTOP: Tablo */
        <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1.2fr 1.1fr 1.1fr 90px 80px 50px', padding:'11px 20px', background:D.blueDim, borderBottom:`1px solid ${D.border}` }}>
            {[t('invoices.colNumber'), t('invoices.colClient'), t('invoices.colTotal'), t('invoices.colPaid'), t('invoices.colBalance'), t('invoices.colStatus'), t('invoices.colDate'), ''].map((h, i) => (
              <span key={i} style={{ color:D.blue, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', textAlign: i >= 2 && i < 7 ? 'center' : i === 7 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {isLoading
            ? Array(6).fill(0).map((_, i) => (
                <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${D.border}`, display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1.2fr 1.1fr 1.1fr 90px 80px 50px', gap:8, alignItems:'center' }}>
                  {Array(8).fill(0).map((_, j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6, animation:'pulse 1.5s infinite' }}/>)}
                </div>
              ))
            : !data.invoices.length
            ? <EmptyState requireQuote={requireQuote} D={D} t={t} desktop/>
            : data.invoices.map((inv, idx) => {
                const s = STATUS_MAP[inv.status] || STATUS_MAP.unpaid
                return <InvRow key={inv.id} inv={inv} idx={idx} s={s} D={D} fmt={fmt} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs}/>
              })
          }
        </div>
      )}

      {/* Paginasyon */}
      {data.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
          <p style={{ color:D.muted, fontSize:13 }}>
            {t('invoices.page')} <strong style={{ color:D.text }}>{page}</strong> / {data.pages} · <strong style={{ color:D.text }}>{data.total}</strong> {t('invoices.total')}
          </p>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              style={{ width:36, height:36, borderRadius:10, cursor:page <= 1 ? 'not-allowed' : 'pointer', background:page <= 1 ? '#F4F6FF' : D.blue, border:`1px solid ${page <= 1 ? D.border : D.blue}`, color:page <= 1 ? D.muted : '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={16}/>
            </button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
              style={{ width:36, height:36, borderRadius:10, cursor:page >= data.pages ? 'not-allowed' : 'pointer', background:page >= data.pages ? '#F4F6FF' : D.blue, border:`1px solid ${page >= data.pages ? D.border : D.blue}`, color:page >= data.pages ? D.muted : '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        ::-webkit-scrollbar{height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(27,42,143,0.2);border-radius:99px}
        .inv-row { transition: background 0.15s; }
        .inv-row:hover { background: rgba(27,42,143,0.07) !important; }
        .inv-row:hover .inv-eye {
          background: linear-gradient(135deg,#1B2A8F,#2D3FBF) !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  )
}

function EmptyState({ requireQuote, D, t, desktop }) {
  return (
    <div style={{ padding:'60px 20px', textAlign:'center', ...(desktop ? {} : { background:D.white, borderRadius:16, border:`1px solid ${D.border}` }) }}>
      {desktop && (
        <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:20, background:D.blueDim, marginBottom:16 }}>
          <Receipt size={32} color={D.blue}/>
        </div>
      )}
      {!desktop && <Receipt size={32} color={D.blue} style={{ marginBottom:12 }}/>}
      <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:0 }}>{t('invoices.noInvoices')}</p>
      {!requireQuote && (
        <Link to="/app/invoices/new"
          style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:16, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange || '#FF6B00'},${D.orangeLt || '#FF8C33'})`, color:'#fff', fontWeight:800, fontSize:13, textDecoration:'none' }}>
          <Plus size={14}/> {t('invoices.newInvoice') || 'Nouvo Fakti'}
        </Link>
      )}
    </div>
  )
}

// ✅ InvCard — deviz sou menm liy ak montan HTG, siy negatif sou balans
const InvCard = memo(function InvCard({ inv, s, D, fmt, t, showRate, exchangeRates, visibleCurrs }) {
  const { totalConv, payedConv, balanceConv } = useMemo(() => ({
    totalConv:   showRate ? fmtConv(Number(inv.totalHtg),      exchangeRates, visibleCurrs) : null,
    payedConv:   showRate ? fmtConv(Number(inv.amountPaidHtg), exchangeRates, visibleCurrs) : null,
    balanceConv: showRate ? fmtConv(Number(inv.balanceDueHtg), exchangeRates, visibleCurrs) : null,
  }), [inv.totalHtg, inv.amountPaidHtg, inv.balanceDueHtg, showRate, exchangeRates, visibleCurrs])

  const dateStr = useMemo(() => format(new Date(inv.issueDate), 'dd/MM/yy'), [inv.issueDate])
  const hasBalance = Number(inv.balanceDueHtg) > 0

  return (
    <div style={{ background:D.white, borderRadius:14, border:`1px solid ${D.border}`, boxShadow:D.shadow, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'monospace', fontWeight:900, color:D.blue, fontSize:13 }}>{inv.invoiceNumber}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.label}</span>
          <Link to={`/app/invoices/${inv.id}`}
            style={{ width:34, height:34, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', textDecoration:'none' }}>
            <Eye size={15}/>
          </Link>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:14, fontWeight:700, color:D.text }}>{inv.client?.name || '—'}</span>
        <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace' }}>{dateStr}</span>
      </div>

      <div style={{ height:1, background:D.border }}/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>

        {/* ✅ TOTAL — deviz sou menm liy */}
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:10, color:D.muted, fontWeight:700, textTransform:'uppercase', margin:'0 0 3px', letterSpacing:'0.04em' }}>{t('invoices.colTotal')}</p>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4, flexWrap:'wrap' }}>
            <p style={{ fontFamily:'monospace', fontWeight:800, color:D.text, fontSize:13, margin:0 }}>{fmt(inv.totalHtg)}</p>
            {totalConv && <span style={{ fontFamily:'monospace', fontSize:9, color:D.muted }}>{totalConv}</span>}
          </div>
        </div>

        {/* ✅ PEYE — deviz sou menm liy */}
        <div style={{ textAlign:'center', borderLeft:`1px solid ${D.border}`, borderRight:`1px solid ${D.border}` }}>
          <p style={{ fontSize:10, color:D.muted, fontWeight:700, textTransform:'uppercase', margin:'0 0 3px', letterSpacing:'0.04em' }}>{t('invoices.colPaid')}</p>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4, flexWrap:'wrap' }}>
            <p style={{ fontFamily:'monospace', fontWeight:800, color:D.success, fontSize:13, margin:0 }}>{fmt(inv.amountPaidHtg)}</p>
            {payedConv && <span style={{ fontFamily:'monospace', fontSize:9, color:D.muted }}>{payedConv}</span>}
          </div>
        </div>

        {/* ✅ BALANS — siy negatif + deviz sou menm liy */}
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:10, color:D.muted, fontWeight:700, textTransform:'uppercase', margin:'0 0 3px', letterSpacing:'0.04em' }}>{t('invoices.colBalance')}</p>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4, flexWrap:'wrap' }}>
            <p style={{ fontFamily:'monospace', fontWeight:800, color: hasBalance ? D.red : D.muted, fontSize:13, margin:0 }}>
              {hasBalance ? `-${fmt(inv.balanceDueHtg)}` : fmt(inv.balanceDueHtg)}
            </p>
            {balanceConv && hasBalance && (
              <span style={{ fontFamily:'monospace', fontSize:9, color:D.red, opacity:0.7 }}>{balanceConv}</span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
})

// ✅ InvRow — deviz sou menm liy ak montan HTG, siy negatif sou balans
const InvRow = memo(function InvRow({ inv, idx, s, D, fmt, showRate, exchangeRates, visibleCurrs }) {
  const { totalConv, payedConv, balanceConv } = useMemo(() => ({
    totalConv:   showRate ? fmtConv(Number(inv.totalHtg),      exchangeRates, visibleCurrs) : null,
    payedConv:   showRate ? fmtConv(Number(inv.amountPaidHtg), exchangeRates, visibleCurrs) : null,
    balanceConv: showRate ? fmtConv(Number(inv.balanceDueHtg), exchangeRates, visibleCurrs) : null,
  }), [inv.totalHtg, inv.amountPaidHtg, inv.balanceDueHtg, showRate, exchangeRates, visibleCurrs])

  const dateStr    = useMemo(() => format(new Date(inv.issueDate), 'dd/MM/yy'), [inv.issueDate])
  const hasBalance = Number(inv.balanceDueHtg) > 0

  return (
    <div className="inv-row"
      style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1.2fr 1.1fr 1.1fr 90px 80px 50px', padding:'13px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background: idx % 2 === 0 ? '#fff' : 'rgba(244,246,255,0.4)' }}>

      <span style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:12 }}>{inv.invoiceNumber}</span>
      <span style={{ fontSize:13, fontWeight:600, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.client?.name || '—'}</span>

      {/* ✅ TOTAL — deviz sou menm liy */}
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:5, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text, fontSize:13 }}>{fmt(inv.totalHtg)}</span>
          {totalConv && <span style={{ fontSize:10, color:D.muted, fontFamily:'monospace' }}>{totalConv}</span>}
        </div>
      </div>

      {/* ✅ PEYE — deviz sou menm liy */}
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:5, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'monospace', color:D.success, fontWeight:700, fontSize:12 }}>{fmt(inv.amountPaidHtg)}</span>
          {payedConv && <span style={{ fontSize:10, color:D.muted, fontFamily:'monospace' }}>{payedConv}</span>}
        </div>
      </div>

      {/* ✅ BALANS — siy negatif + deviz sou menm liy */}
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:5, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'monospace', color: hasBalance ? D.red : D.muted, fontWeight:700, fontSize:12 }}>
            {hasBalance ? `-${fmt(inv.balanceDueHtg)}` : fmt(inv.balanceDueHtg)}
          </span>
          {balanceConv && hasBalance && (
            <span style={{ fontSize:10, color:D.red, opacity:0.7, fontFamily:'monospace' }}>{balanceConv}</span>
          )}
        </div>
      </div>

      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.label}</span>
      </div>

      <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace', textAlign:'center' }}>{dateStr}</span>

      <div style={{ textAlign:'right' }}>
        <Link to={`/app/invoices/${inv.id}`} className="inv-eye"
          style={{ width:30, height:30, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', background:D.blueDim, color:D.blue, textDecoration:'none', transition:'all 0.2s' }}>
          <Eye size={13}/>
        </Link>
      </div>
    </div>
  )
})
