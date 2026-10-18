// src/pages/quotes/QuotesPage.jsx — Plus Fit redesign
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus, Search, FileText, Eye, Edit2, Send, XCircle, CheckCircle, ChevronLeft, ChevronRight,
  Layers, TrendingUp, Clock, FileCheck, PenLine,
} from 'lucide-react'
import { format } from 'date-fns'
import '../invoices/invoices.css'

const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 0 })
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

// ✅ Estati devi — kle i18n + etikèt Kreyòl si tradiksyon an manke
const STATUS = {
  draft:     { key: 'quotes.statusDraft',     label: 'Bouyon',  color: '#64748B', bg: 'rgba(100,116,139,0.10)', Icon: PenLine },
  sent:      { key: 'quotes.statusSent',      label: 'Voye',    color: '#1B2A8F', bg: 'rgba(27,42,143,0.08)',   Icon: Send },
  accepted:  { key: 'quotes.statusAccepted',  label: 'Aksepte', color: '#059669', bg: 'rgba(5,150,105,0.10)',   Icon: CheckCircle },
  converted: { key: 'quotes.statusConverted', label: 'Konvèti', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)',  Icon: FileCheck },
  cancelled: { key: 'quotes.statusCancelled', label: 'Anile',   color: '#DC2626', bg: 'rgba(220,38,38,0.09)',   Icon: XCircle },
  expired:   { key: 'quotes.statusExpired',   label: 'Ekspire', color: '#D97706', bg: 'rgba(217,119,6,0.12)',   Icon: Clock },
}

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

const toHaitiDate = (dateStr, fmt2) => {
  try {
    return format(new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/Port-au-Prince' })), fmt2)
  } catch { return '' }
}

// ✅ Tradiksyon ak repli Kreyòl (evite montre kle a si li pa tradui)
const tr = (t, key, fallback) => {
  const v = t(key)
  return v && v !== key ? v : fallback
}

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

function useScreen() {
  const get = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024
    return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 }
  }
  const [s, setS] = useState(get)
  useEffect(() => {
    const h = () => setS(get())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return s
}

function useCountUp(value, ms = 700) {
  const [v, setV] = useState(value)
  const from = useRef(value)
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

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, money }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{money ? fmt0(v) : Math.round(v)}{money && <small>HTG</small>}</div>
    </div>
  )
}

export default function QuotesPage() {
  const { t } = useTranslation()
  // ✅ Li ?search= ak ?status= nan URL la (lyen ki soti nan Kliyan, Rapò, Tablo de bò)
  const [params] = useSearchParams()
  const [search, setSearch] = useState(() => params.get('search') || '')
  const [status, setStatus] = useState(() => params.get('status') || '')
  const [page, setPage]     = useState(1)
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const { isMobile, isTablet, isDesktop } = useScreen()
  const { tenant } = useAuthStore()

  const debouncedSearch = useDebounce(search, 400)

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates || {}
  const visibleCurrs  = useMemo(() => parseCurrencies(tenant?.visibleCurrencies), [tenant?.visibleCurrencies])

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', debouncedSearch, status, page],
    queryFn:  () => quoteAPI.getAll({ search: debouncedSearch, status, page, limit: 15 }).then(r => {
      const d = r.data || {}
      return { quotes: Array.isArray(d.quotes) ? d.quotes : [], total: d.total || 0, pages: d.pages || 1 }
    }),
    placeholderData: (prev) => prev,   // ✅ react-query v5 (ranplase keepPreviousData)
    staleTime: 20_000,
  })

  // ✅ react-query v5: invalidateQueries bezwen { queryKey } — anvan sa lis la pa t rafrechi
  const refresh = () => qc.invalidateQueries({ queryKey: ['quotes'] })
  const onErr   = (e) => toast.error(e?.response?.data?.message || 'Erè sèvè. Eseye ankò.')

  const convertMutation = useMutation({
    mutationFn: (id) => quoteAPI.convert(id),
    onSuccess:  (res) => {
      toast.success(tr(t, 'quotes.converted', 'Devi konvèti an fakti!'))
      refresh()
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/app/invoices/${res.data.invoice.id}`)
    },
    onError: onErr,
  })
  const cancelMutation = useMutation({
    mutationFn: (id) => quoteAPI.cancel(id),
    onSuccess:  () => { toast.success(tr(t, 'quotes.cancelled', 'Devi anile.')); refresh() },
    onError: onErr,
  })
  const sendMutation = useMutation({
    mutationFn: (id) => quoteAPI.send(id),
    onSuccess:  () => { toast.success(tr(t, 'quotes.sent', 'Devi make voye.')); refresh() },
    onError: onErr,
  })

  const handleSearchChange = useCallback((e) => { setSearch(e.target.value); setPage(1) }, [])
  const handleStatusChange = useCallback((v) => { setStatus(v); setPage(1) }, [])

  const FILTERS = useMemo(() => [
    { v: '', l: tr(t, 'invoices.all', 'Tout'), color: '#1B2A8F' },
    ...Object.entries(STATUS).map(([k, s]) => ({ v: k, l: tr(t, s.key, s.label), color: s.color })),
  ], [t])

  const quotes = data?.quotes || []

  // ✅ Total paj la + konbyen ki ka konvèti
  const { pageValue, open } = useMemo(() => quotes.reduce((acc, q) => {
    if (q.status !== 'cancelled') acc.pageValue += Number(q.totalHtg || 0)
    if (['draft', 'sent', 'accepted'].includes(q.status)) acc.open += 1
    return acc
  }, { pageValue: 0, open: 0 }), [quotes])

  const rowProps = { t, showRate, exchangeRates, visibleCurrs, convertMutation, cancelMutation, sendMutation, navigate }

  return (
    <div className="iv" style={{ paddingBottom: isMobile ? 80 : 24 }}>

      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FFC83D" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico gold"><FileText size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Plus Group'}</p>
            <h1>{tr(t, 'nav.quotes', 'Devi')}</h1>
            <p className="sub">Pwofòma pou kliyan yo — voye, pataje, epi konvèti an fakti an yon klik.</p>
          </div>
          <Link to="/app/quotes/new" className="iv-btn-main pulse newbtn">
            <Plus size={17}/> {tr(t, 'quotes.newQuote', 'Nouvo devi')}
          </Link>
        </div>
        <div className="iv-kpis">
          <Kpi label="Devi"           value={data?.total || 0} icon={Layers}     delay={80}/>
          <Kpi label="Valè paj la"    value={pageValue}        icon={TrendingUp} delay={160} tone="gold" money/>
          <Kpi label="Ka konvèti"     value={open}             icon={FileCheck}  delay={240} tone="green"/>
        </div>
      </section>

      <div className="iv-bar a-up" style={{ animationDelay: '120ms' }}>
        <div className="iv-search">
          <Search size={16}/>
          <input placeholder={tr(t, 'quotes.searchPlaceholder', 'Chèche nimewo oswa kliyan...')} value={search} onChange={handleSearchChange}/>
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

      {!isDesktop ? (
        <div className="iv-grid" style={{ gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : '1fr' }}>
          {isLoading
            ? Array(isTablet ? 6 : 4).fill(0).map((_, i) => (
                <div key={i} className="iv-card" style={{ animationDelay: `${i * 60}ms` }}>
                  {[60, 40, 85, 70].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 10 }}/>)}
                </div>
              ))
            : !quotes.length
            ? <div style={{ gridColumn: '1 / -1' }} className="iv-table"><QuotesEmpty t={t} filtered={!!(status || debouncedSearch)}/></div>
            : quotes.map((q, i) => <QuoteCard key={q.id} q={q} i={i} {...rowProps}/>)
          }
        </div>
      ) : (
        <div className="iv-table">
          <div className="iv-thead iv-qthead">
            {[tr(t, 'quotes.colNumber', 'Nimewo'), tr(t, 'quotes.colClient', 'Kliyan'), tr(t, 'quotes.colTotal', 'Total'),
              tr(t, 'quotes.colStatus', 'Stati'), tr(t, 'quotes.colDate', 'Dat'), tr(t, 'quotes.colExpiry', 'Ekspire'), tr(t, 'quotes.colAction', 'Aksyon')]
              .map((h, i) => <span key={i} className={i === 5 ? 'exp' : ''} style={{ textAlign: i >= 2 && i <= 5 ? 'center' : i === 6 ? 'right' : 'left' }}>{h}</span>)}
          </div>
          {isLoading
            ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="iv-tr iv-qtr" style={{ animationDelay: `${i * 50}ms` }}>
                  {Array(7).fill(0).map((_, j) => <div key={j} className="iv-sk"/>)}
                </div>
              ))
            : !quotes.length
            ? <QuotesEmpty t={t} filtered={!!(status || debouncedSearch)}/>
            : quotes.map((q, i) => <QuoteRow key={q.id} q={q} i={i} {...rowProps}/>)
          }
        </div>
      )}

      {data?.pages > 1 && (
        <div className="iv-pager">
          <p>{tr(t, 'invoices.page', 'Paj')} <b style={{ color: 'var(--ink)' }}>{page}</b> / {data.pages} · <b style={{ color: 'var(--ink)' }}>{data.total}</b> devi</p>
          <div className="btns">
            <button className="iv-pg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button>
            <button className="iv-pg" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuotesEmpty({ t, filtered }) {
  return (
    <div className="iv-empty">
      <div className="art">
        <div className="paper"><i/><i/><i/><i/><i/></div>
        <div className="bubble" style={{ background: 'linear-gradient(135deg,#E0B84C,#A87B12)' }}>{filtered ? <Search size={18}/> : <Plus size={20}/>}</div>
      </div>
      <h3>{filtered ? 'Anyen pa koresponn' : tr(t, 'quotes.noQuotes', 'Pa gen devi')}</h3>
      <p>{filtered ? 'Eseye yon lòt rechèch oswa chanje filt la.' : 'Kreye yon pwofòma pou yon kliyan, epi konvèti l an fakti lè l aksepte.'}</p>
      {!filtered && <Link to="/app/quotes/new" className="iv-btn-main"><Plus size={16}/> {tr(t, 'quotes.createFirst', 'Kreye premye devi a')}</Link>}
    </div>
  )
}

function useQuoteView(q, showRate, exchangeRates, visibleCurrs) {
  return useMemo(() => {
    const clientName = q.client?.name || q.clientSnapshot?.name || ''
    const isExpired  = q.expiryDate ? new Date(q.expiryDate) < new Date() : false
    const items = q.items || []
    return {
      s:          STATUS[q.status] || STATUS.draft,
      convStr:    showRate ? fmtConv(Number(q.totalHtg), exchangeRates, visibleCurrs) : null,
      dateStr:    toHaitiDate(q.issueDate || q.createdAt, 'dd/MM/yy'),
      expStr:     q.expiryDate ? toHaitiDate(q.expiryDate, 'dd/MM/yy') : null,
      isExpired:  isExpired && !['converted', 'cancelled'].includes(q.status),
      clientName: clientName || 'San kliyan',
      isWalkIn:   !clientName,
      itemBadges: items.slice(0, 2),
      extraItems: Math.max(0, items.length - 2),
      canEdit:    ['draft', 'sent'].includes(q.status),
      canSend:    q.status === 'draft',
      canConvert: ['draft', 'sent', 'accepted'].includes(q.status),
      canCancel:  !['converted', 'cancelled'].includes(q.status),
    }
  }, [q, showRate, exchangeRates, visibleCurrs])
}

function Items({ v }) {
  if (!v.itemBadges.length) return null
  return (
    <div className="iv-items">
      {v.itemBadges.map((it, k) => {
        const tierLabel = it.productSnapshot?.tierLabel
        return (
          <span key={it.id || k} className="iv-item">
            {it.product?.name || it.productSnapshot?.name || 'Atik'}
            {tierLabel && <span className={`iv-tier ${tierLabel === 'Detay' ? 'det' : ''}`}>{tierLabel}</span>}
          </span>
        )
      })}
      {v.extraItems > 0 && <span className="iv-item">+{v.extraItems} lòt</span>}
    </div>
  )
}

function Badge({ s, t }) {
  const I = s.Icon
  return <span className="iv-badge" style={{ background: s.bg, color: s.color }}><I size={11}/>{tr(t, s.key, s.label)}</span>
}

function Avatar({ v }) {
  return (
    <div className="iv-avatar" style={{ background: v.isWalkIn ? '#CBD2E6' : avatarColor(v.clientName) }}>
      {v.isWalkIn ? <FileText size={15}/> : initials(v.clientName)}
    </div>
  )
}

// ✅ Aksyon yo pa dwe louvri detay la lè yo klike (stopPropagation)
const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn() }

const QuoteCard = memo(function QuoteCard({ q, i, t, showRate, exchangeRates, visibleCurrs, convertMutation, cancelMutation, sendMutation, navigate }) {
  const v = useQuoteView(q, showRate, exchangeRates, visibleCurrs)
  return (
    <div className="iv-card" style={{ '--acc': v.s.color, animationDelay: `${Math.min(i, 10) * 45}ms`, cursor: 'pointer' }} onClick={() => navigate(`/app/quotes/${q.id}`)}>
      <div className="top">
        <span className="iv-num" style={{ color: '#A87B12' }}>{q.quoteNumber}</span>
        <Badge s={v.s} t={t}/>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTop: '1px dashed var(--line2)' }}>
        <div>
          <div style={{ font: "800 9px 'Manrope', sans-serif", letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total</div>
          <div className="iv-money" style={{ fontSize: 22 }}>{fmt(q.totalHtg)} <small style={{ fontSize: 11, color: 'var(--muted)' }}>HTG</small></div>
          {v.convStr && <div className="iv-conv">{v.convStr}</div>}
        </div>
        {v.expStr && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: "800 9px 'Manrope', sans-serif", letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Ekspire</div>
            <div className={`iv-exp ${v.isExpired ? 'late' : ''}`}>{v.isExpired ? '⚠ ' : ''}{v.expStr}</div>
          </div>
        )}
      </div>
      {v.canCancel && (
        <div className="iv-qact">
          {v.canEdit && <button className="iv-act" onClick={stop(() => navigate(`/app/quotes/${q.id}/edit`))}><Edit2 size={13}/> Modifye</button>}
          {v.canSend && <button className="iv-act sky" disabled={sendMutation.isPending} onClick={stop(() => sendMutation.mutate(q.id))}><Send size={13}/> Voye</button>}
          {v.canConvert && (
            <button className="iv-act green" disabled={convertMutation.isPending}
              onClick={stop(() => { if (confirm(tr(t, 'quotes.convertConfirm', 'Konvèti devi sa an fakti?'))) convertMutation.mutate(q.id) })}>
              <CheckCircle size={13}/> Fakti
            </button>
          )}
          <button className="iv-act danger icon" title="Anile" disabled={cancelMutation.isPending}
            onClick={stop(() => { if (confirm(tr(t, 'quotes.cancelConfirm', 'Anile devi sa?'))) cancelMutation.mutate(q.id) })}>
            <XCircle size={15}/>
          </button>
        </div>
      )}
    </div>
  )
})

const QuoteRow = memo(function QuoteRow({ q, i, t, showRate, exchangeRates, visibleCurrs, convertMutation, cancelMutation, sendMutation, navigate }) {
  const v = useQuoteView(q, showRate, exchangeRates, visibleCurrs)
  return (
    <div className="iv-tr iv-qtr" style={{ '--acc': v.s.color, animationDelay: `${Math.min(i, 14) * 35}ms`, cursor: 'pointer' }} onClick={() => navigate(`/app/quotes/${q.id}`)}>
      <span className="iv-num" style={{ color: '#A87B12' }}>{q.quoteNumber}</span>
      <div className="iv-client">
        <Avatar v={v}/>
        <div style={{ minWidth: 0 }}>
          <span className={`name ${v.isWalkIn ? 'walk' : ''}`}>{v.clientName}</span>
          <Items v={v}/>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="iv-money">{fmt(q.totalHtg)}</div>
        {v.convStr && <div className="iv-conv">{v.convStr}</div>}
      </div>
      <div style={{ textAlign: 'center' }}><Badge s={v.s} t={t}/></div>
      <span className="iv-date" style={{ textAlign: 'center' }}>{v.dateStr}</span>
      <span className={`iv-exp exp ${v.isExpired ? 'late' : ''}`} style={{ textAlign: 'center' }}>{v.expStr || '—'}</span>
      <div className="iv-rowacts">
        <Link to={`/app/quotes/${q.id}`} className="iv-mini" title="Wè" onClick={e => e.stopPropagation()}><Eye size={14}/></Link>
        {v.canEdit && <button className="iv-mini" title="Modifye" onClick={stop(() => navigate(`/app/quotes/${q.id}/edit`))}><Edit2 size={13}/></button>}
        {v.canSend && <button className="iv-mini" style={{ '--c': '#0284C7' }} title="Make voye" onClick={stop(() => sendMutation.mutate(q.id))}><Send size={13}/></button>}
        {v.canConvert && (
          <button className="iv-mini" style={{ '--c': '#059669' }} title="Konvèti an fakti"
            onClick={stop(() => { if (confirm(tr(t, 'quotes.convertConfirm', 'Konvèti devi sa an fakti?'))) convertMutation.mutate(q.id) })}>
            <CheckCircle size={13}/>
          </button>
        )}
        {v.canCancel && (
          <button className="iv-mini" style={{ '--c': '#DC2626' }} title="Anile"
            onClick={stop(() => { if (confirm(tr(t, 'quotes.cancelConfirm', 'Anile devi sa?'))) cancelMutation.mutate(q.id) })}>
            <XCircle size={13}/>
          </button>
        )}
      </div>
    </div>
  )
})