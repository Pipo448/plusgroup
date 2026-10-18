// src/pages/invoices/InvoicesPage.jsx — Plus Fit redesign
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  Search, Receipt, Eye, ChevronLeft, ChevronRight, Plus, FileText,
  AlertCircle, Clock, CheckCircle, XCircle, RotateCcw, TrendingUp, Layers,
} from 'lucide-react'
import { format } from 'date-fns'
import './invoices.css'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 0 })
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

// ✅ Etikèt Kreyòl konsistan ak ReportsPage
const STATUS = {
  unpaid:    { label: 'Pa peye', color: '#DC2626', bg: 'rgba(220,38,38,0.09)',  Icon: AlertCircle },
  partial:   { label: 'Depo',    color: '#D97706', bg: 'rgba(217,119,6,0.12)',  Icon: Clock },
  paid:      { label: 'Peye',    color: '#059669', bg: 'rgba(5,150,105,0.10)',  Icon: CheckCircle },
  cancelled: { label: 'Anile',   color: '#64748B', bg: 'rgba(100,116,139,0.10)', Icon: XCircle },
  refunded:  { label: 'Remèt',   color: '#2D3FBF', bg: 'rgba(45,63,191,0.09)',  Icon: RotateCcw },
}

const FILTERS = [
  { v: '', l: 'Tout', color: '#1B2A8F' },
  ...['unpaid', 'partial', 'paid', 'cancelled', 'refunded'].map(k => ({ v: k, l: STATUS[k].label, color: STATUS[k].color })),
]

const AVATAR_COLORS = ['#1B2A8F', '#FF6B00', '#059669', '#7C3AED', '#0284C7', '#DB2777', '#B45309', '#0F766E']
const avatarColor = (s = '') => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

const parseCurrencies = (raw) => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) { try { return JSON.parse(raw) } catch { return [] } }
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
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

function useScreenSize() {
  const get = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 }
  }
  const [size, setSize] = useState(get)
  useEffect(() => {
    const h = () => setSize(get())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return size
}

// ✅ Chif ki "konte" jiska valè a (animasyon)
function useCountUp(value, ms = 700) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      setV(a + (b - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, money }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{money ? fmt0(v) : Math.round(v)}{money && <small>HTG</small>}</div>
    </div>
  )
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  // ✅ Li ?search= ak ?status= nan URL la (lyen ki soti nan Kliyan, Rapò, Tablo de bò)
  const [params] = useSearchParams()
  const [search, setSearch] = useState(() => params.get('search') || '')
  const [status, setStatus] = useState(() => params.get('status') || '')
  const [page, setPage]     = useState(1)
  const { isMobile, isTablet, isDesktop } = useScreenSize()
  const { tenant } = useAuthStore()

  const debouncedSearch = useDebounce(search, 400)

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates || {}
  const visibleCurrs  = useMemo(() => parseCurrencies(tenant?.visibleCurrencies), [tenant?.visibleCurrencies])
  const requireQuote  = tenant?.requireQuote === true

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
    placeholderData: (prev) => prev,   // ✅ react-query v5
    staleTime: 20_000,
  })

  const data = rawData || { invoices: [], total: 0, pages: 1 }

  // ✅ Total sou fakti vizib yo (paj sa a)
  const { pageValue, totalDebt } = useMemo(() => data.invoices.reduce((acc, inv) => {
    if (inv.status !== 'cancelled') acc.pageValue += Number(inv.totalHtg || 0)
    acc.totalDebt += Number(inv.balanceDueHtg || 0)
    return acc
  }, { pageValue: 0, totalDebt: 0 }), [data.invoices])

  const handleSearchChange = useCallback((e) => { setSearch(e.target.value); setPage(1) }, [])
  const handleStatusChange = useCallback((v) => { setStatus(v); setPage(1) }, [])

  const rowProps = { showRate, exchangeRates, visibleCurrs }

  return (
    <div className="iv" style={{ paddingBottom: isMobile ? 80 : 24 }}>

      {/* ── Hero ── */}
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>

        <div className="row">
          <div className="ico"><Receipt size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Plus Group'}</p>
            <h1>{t('invoices.title') || 'Fakti'}</h1>
            <p className="sub">Tout vant ou yo, estati peman yo ak sa ki rete pou touche.</p>
          </div>
          {!requireQuote ? (
            <Link to="/app/invoices/new" className="iv-btn-main pulse newbtn">
              <Plus size={17}/> {t('invoices.newInvoice') || 'Nouvo Fakti'}
            </Link>
          ) : (
            <div className="iv-hint newbtn">
              <FileText size={14}/> {t('invoices.requireQuoteHint') || 'Pase pa Devi → Konvèti pou kreye fakti'}
            </div>
          )}
        </div>

        <div className="iv-kpis">
          <Kpi label="Fakti"       value={data.total} icon={Layers}      delay={80}/>
          <Kpi label="Valè paj la" value={pageValue}  icon={TrendingUp}  delay={160} tone="gold" money/>
          <Kpi label="Pou touche"  value={totalDebt}  icon={AlertCircle} delay={240} tone={totalDebt > 0 ? 'red' : ''} money/>
        </div>
      </section>

      {/* ── Rechèch + filt ── */}
      <div className="iv-bar a-up" style={{ animationDelay: '120ms' }}>
        <div className="iv-search">
          <Search size={16}/>
          <input
            placeholder={t('invoices.searchPlaceholder') || 'Chèche nimewo oswa kliyan...'}
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="iv-chips">
          {FILTERS.map(opt => (
            <button key={opt.v} type="button" onClick={() => handleStatusChange(opt.v)} className={`iv-chip ${status === opt.v ? 'on' : ''}`}>
              <span className="dot" style={{ background: status === opt.v ? '#fff' : opt.color }}/>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lis ── */}
      {!isDesktop ? (
        <div className="iv-grid" style={{ gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : '1fr' }}>
          {isLoading
            ? Array(isTablet ? 6 : 4).fill(0).map((_, i) => (
                <div key={i} className="iv-card" style={{ animationDelay: `${i * 60}ms` }}>
                  {[60, 40, 85, 70].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 10 }}/>)}
                </div>
              ))
            : !data.invoices.length
            ? <div style={{ gridColumn: '1 / -1' }} className="iv-table"><EmptyState requireQuote={requireQuote} t={t} filtered={!!(status || debouncedSearch)}/></div>
            : data.invoices.map((inv, i) => <InvCard key={inv.id} inv={inv} i={i} t={t} {...rowProps}/>)
          }
        </div>
      ) : (
        <div className="iv-table">
          <div className="iv-thead">
            {[
              t('invoices.colNumber')  || 'Nimewo',
              t('invoices.colClient')  || 'Kliyan',
              t('invoices.colTotal')   || 'Total',
              t('invoices.colPaid')    || 'Peye',
              t('invoices.colBalance') || 'Balans',
              t('invoices.colStatus')  || 'Stati',
              t('invoices.colDate')    || 'Dat',
              '',
            ].map((h, i) => (
              <span key={i} style={{ textAlign: i >= 2 && i < 7 ? 'center' : i === 7 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {isLoading
            ? Array(6).fill(0).map((_, i) => (
                <div key={i} className="iv-tr" style={{ animationDelay: `${i * 50}ms` }}>
                  {Array(8).fill(0).map((_, j) => <div key={j} className="iv-sk"/>)}
                </div>
              ))
            : !data.invoices.length
            ? <EmptyState requireQuote={requireQuote} t={t} filtered={!!(status || debouncedSearch)}/>
            : data.invoices.map((inv, i) => <InvRow key={inv.id} inv={inv} i={i} {...rowProps}/>)
          }
        </div>
      )}

      {/* ── Paginasyon ── */}
      {data.pages > 1 && (
        <div className="iv-pager">
          <p>
            {t('invoices.page') || 'Paj'} <b style={{ color: 'var(--ink)' }}>{page}</b> / {data.pages} · <b style={{ color: 'var(--ink)' }}>{data.total}</b> {t('invoices.total') || 'fakti'}
          </p>
          <div className="btns">
            <button className="iv-pg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button>
            <button className="iv-pg" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ requireQuote, t, filtered }) {
  return (
    <div className="iv-empty">
      <div className="art">
        <div className="paper"><i/><i/><i/><i/><i/></div>
        <div className="bubble">{filtered ? <Search size={18}/> : <Plus size={20}/>}</div>
      </div>
      <h3>{filtered ? 'Anyen pa koresponn' : (t('invoices.noInvoices') || 'Pa gen fakti')}</h3>
      <p>{filtered ? 'Eseye yon lòt rechèch oswa chanje filt la.' : 'Kreye premye fakti ou — li pran mwens pase yon minit.'}</p>
      {!requireQuote && !filtered && (
        <Link to="/app/invoices/new" className="iv-btn-main"><Plus size={16}/> {t('invoices.newInvoice') || 'Nouvo Fakti'}</Link>
      )}
    </div>
  )
}

// ✅ Done komen pou kat ak ranje
function useInvView(inv, showRate, exchangeRates, visibleCurrs) {
  return useMemo(() => {
    const total = Number(inv.totalHtg) || 0
    const paid  = Number(inv.amountPaidHtg) || 0
    const clientName = inv.client?.name || inv.clientSnapshot?.name || ''
    const items = inv.items || []
    return {
      s:           STATUS[inv.status] || STATUS.unpaid,
      totalConv:   showRate ? fmtConv(total, exchangeRates, visibleCurrs) : null,
      payedConv:   showRate ? fmtConv(paid, exchangeRates, visibleCurrs) : null,
      balanceConv: showRate ? fmtConv(Number(inv.balanceDueHtg), exchangeRates, visibleCurrs) : null,
      dateStr:     inv.issueDate ? format(new Date(inv.issueDate), 'dd/MM/yy') : '',
      hasBalance:  Number(inv.balanceDueHtg) > 0,
      isCancelled: inv.status === 'cancelled',
      isPartial:   inv.status === 'partial',
      paidPct:     total > 0 ? Math.min(100, (paid / total) * 100) : 0,
      clientName:  clientName || 'Vant kontwa',
      isWalkIn:    !clientName,
      itemBadges:  items.slice(0, 2),
      extraItems:  Math.max(0, items.length - 2),
    }
  }, [inv, showRate, exchangeRates, visibleCurrs])
}

function Items({ v }) {
  if (!v.itemBadges.length) return null
  return (
    <div className="iv-items">
      {v.itemBadges.map(it => {
        const tierLabel = it.productSnapshot?.tierLabel
        const name = it.product?.name || it.productSnapshot?.name || 'Atik'
        return (
          <span key={it.id} className="iv-item">
            {name}
            {tierLabel && <span className={`iv-tier ${tierLabel === 'Detay' ? 'det' : ''}`}>{tierLabel}</span>}
          </span>
        )
      })}
      {v.extraItems > 0 && <span className="iv-item">+{v.extraItems} lòt</span>}
    </div>
  )
}

function Badge({ s }) {
  const I = s.Icon
  return <span className="iv-badge" style={{ background: s.bg, color: s.color }}><I size={11}/>{s.label}</span>
}

function Avatar({ v }) {
  return (
    <div className="iv-avatar" style={{ background: v.isWalkIn ? '#CBD2E6' : avatarColor(v.clientName) }}>
      {v.isWalkIn ? <Receipt size={15}/> : initials(v.clientName)}
    </div>
  )
}

// ✅ Kat — mobil + tablèt (tout kat la klikab)
const InvCard = memo(function InvCard({ inv, i, t, showRate, exchangeRates, visibleCurrs }) {
  const v = useInvView(inv, showRate, exchangeRates, visibleCurrs)
  return (
    <Link to={`/app/invoices/${inv.id}`} className="iv-card" style={{ '--acc': v.s.color, animationDelay: `${Math.min(i, 10) * 45}ms` }}>
      <div className="top">
        <span className="iv-num">{inv.invoiceNumber}</span>
        <Badge s={v.s}/>
      </div>

      <div className="mid">
        <div className="iv-client">
          <Avatar v={v}/>
          <div style={{ minWidth: 0 }}>
            <span className={`name ${v.isWalkIn ? 'walk' : ''}`}>{v.clientName}</span>
            <Items v={v}/>
          </div>
        </div>
        <span className="iv-date" style={{ flexShrink: 0 }}>{v.dateStr}</span>
      </div>

      <div className="sums">
        <div>
          <div className="k">{t('invoices.colTotal') || 'Total'}</div>
          <div className="iv-money">{fmt(inv.totalHtg)}</div>
          {v.totalConv && <div className="iv-conv">{v.totalConv}</div>}
        </div>
        <div>
          <div className="k">{v.isPartial ? 'Depo' : (t('invoices.colPaid') || 'Peye')}</div>
          <div className="iv-money" style={{ color: 'var(--ok)' }}>{fmt(inv.amountPaidHtg)}</div>
          {v.payedConv && <div className="iv-conv">{v.payedConv}</div>}
        </div>
        <div>
          <div className="k">{t('invoices.colBalance') || 'Balans'}</div>
          <div className="iv-money" style={{ color: v.hasBalance ? 'var(--bad)' : 'var(--muted)' }}>{fmt(inv.balanceDueHtg)}</div>
          {v.hasBalance && !v.isCancelled && <div className="iv-due">pou peye</div>}
        </div>
      </div>

      {v.isPartial && (
        <div style={{ marginTop: 10 }}>
          <div className="iv-prog"><i style={{ width: `${v.paidPct}%` }}/></div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right', fontWeight: 700, marginTop: 4 }}>{v.paidPct.toFixed(0)}% peye</div>
        </div>
      )}
    </Link>
  )
})

// ✅ Ranje — desktop (>= 1024px)
const InvRow = memo(function InvRow({ inv, i, showRate, exchangeRates, visibleCurrs }) {
  const v = useInvView(inv, showRate, exchangeRates, visibleCurrs)
  return (
    <Link to={`/app/invoices/${inv.id}`} className="iv-tr" style={{ '--acc': v.s.color, animationDelay: `${Math.min(i, 14) * 35}ms` }}>
      <span className="iv-num">{inv.invoiceNumber}</span>

      <div className="iv-client">
        <Avatar v={v}/>
        <div style={{ minWidth: 0 }}>
          <span className={`name ${v.isWalkIn ? 'walk' : ''}`}>{v.clientName}</span>
          <Items v={v}/>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="iv-money">{fmt(inv.totalHtg)}</div>
        {v.totalConv && <div className="iv-conv">{v.totalConv}</div>}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="iv-money" style={{ color: 'var(--ok)', fontSize: 16 }}>{fmt(inv.amountPaidHtg)}</div>
        {v.payedConv && <div className="iv-conv">{v.payedConv}</div>}
        {v.isPartial && <div className="iv-prog" style={{ maxWidth: 120, margin: '5px auto 0' }}><i style={{ width: `${v.paidPct}%` }}/></div>}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="iv-money" style={{ color: v.hasBalance ? 'var(--bad)' : 'var(--muted)', fontSize: 16 }}>{fmt(inv.balanceDueHtg)}</div>
        {v.balanceConv && v.hasBalance && <div className="iv-conv" style={{ color: 'var(--bad)' }}>{v.balanceConv}</div>}
        {v.hasBalance && !v.isCancelled && <div className="iv-due">pou peye</div>}
      </div>

      <div style={{ textAlign: 'center' }}><Badge s={v.s}/></div>
      <span className="iv-date" style={{ textAlign: 'center' }}>{v.dateStr}</span>
      <div style={{ textAlign: 'right' }}><span className="iv-eye"><Eye size={15}/></span></div>
    </Link>
  )
})