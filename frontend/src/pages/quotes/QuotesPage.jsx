// src/pages/quotes/QuotesPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Plus, Search, FileText, Eye, Edit2, Send, XCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914', goldDim:'rgba(201,168,76,0.12)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF', border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

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

const STATUS_KEYS = {
  draft:     'quotes.statusDraft',
  sent:      'quotes.statusSent',
  accepted:  'quotes.statusAccepted',
  converted: 'quotes.statusConverted',
  cancelled: 'quotes.statusCancelled',
  expired:   'quotes.statusExpired',
}

const STATUS_COLORS = {
  draft:     { color:'#64748B', bg:'rgba(100,116,139,0.08)' },
  sent:      { color:'#1B2A8F', bg:'rgba(27,42,143,0.07)'  },
  accepted:  { color:'#059669', bg:'rgba(5,150,105,0.08)'  },
  converted: { color:'#7C3AED', bg:'rgba(124,58,237,0.08)' },
  cancelled: { color:'#C0392B', bg:'rgba(192,57,43,0.08)'  },
  expired:   { color:'#D97706', bg:'rgba(217,119,6,0.10)'  },
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 640))
  }
  return isMobile
}

export default function QuotesPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const isMobile    = useIsMobile()
  const { tenant }  = useAuthStore()

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates     || {}
  const visibleCurrs  = tenant?.visibleCurrencies  || []

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', search, status, page],
    queryFn:  () => quoteAPI.getAll({ search, status, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  })

  const convertMutation = useMutation({
    mutationFn: (id) => quoteAPI.convert(id),
    onSuccess:  (res) => { toast.success(t('quotes.converted')); qc.invalidateQueries(['quotes']); navigate(`/app/invoices/${res.data.invoice.id}`) }
  })
  const cancelMutation = useMutation({
    mutationFn: (id) => quoteAPI.cancel(id),
    onSuccess:  () => { toast.success(t('quotes.cancelled')); qc.invalidateQueries(['quotes']) }
  })
  const sendMutation = useMutation({
    mutationFn: (id) => quoteAPI.send(id),
    onSuccess:  () => { toast.success(t('quotes.sent')); qc.invalidateQueries(['quotes']) }
  })

  const FILTER_OPTIONS = [
    { v:'', l: t('invoices.all') },
    ...Object.keys(STATUS_KEYS).map(k => ({ v: k, l: t(STATUS_KEYS[k]) }))
  ]

  const COL_HEADERS = [
    t('quotes.colNumber'), t('quotes.colClient'), t('quotes.colTotal'),
    t('quotes.colStatus'), t('quotes.colDate'), t('quotes.colExpiry'), t('quotes.colAction')
  ]

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.gold},${D.goldDk})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.gold}50` }}>
            <FileText size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>{t('nav.quotes')}</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{data?.total || 0} {t('quotes.totalCount')}</p>
          </div>
        </div>
        <Link to="/app/quotes/new" style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, textDecoration:'none', background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:14, boxShadow:`0 4px 16px ${D.blue}45` }}>
          <Plus size={16}/> {t('quotes.newQuote')}
        </Link>
      </div>

      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input placeholder={t('quotes.searchPlaceholder')} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ width:'100%', padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor = D.blue} onBlur={e => e.target.style.borderColor = D.border}
          />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'nowrap', overflowX:'auto', paddingBottom:2 }}>
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.v} onClick={() => { setStatus(opt.v); setPage(1) }}
              style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s', background:status === opt.v ? D.gold : '#F4F6FF', color:status === opt.v ? '#fff' : D.muted, border:`1.5px solid ${status === opt.v ? D.gold : D.border}`, whiteSpace:'nowrap', flexShrink:0 }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {isLoading ? Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ background:D.white, borderRadius:14, padding:16, border:`1px solid ${D.border}` }}>
              {Array(4).fill(0).map((_, j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6, marginBottom:10 }}/>)}
            </div>
          )) : !data?.quotes?.length ? (
            <div style={{ padding:'60px 20px', textAlign:'center', background:D.white, borderRadius:16, border:`1px solid ${D.border}` }}>
              <FileText size={32} color={D.gold} style={{ marginBottom:12 }}/>
              <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:'0 0 16px' }}>{t('quotes.noQuotes')}</p>
              <Link to="/app/quotes/new" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:12, textDecoration:'none', fontSize:13, fontWeight:800, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff' }}>
                <Plus size={14}/> {t('quotes.createFirst')}
              </Link>
            </div>
          ) : data.quotes.map(q => (
            <QuoteCard key={q.id} q={q} D={D} fmt={fmt} t={t} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs} convertMutation={convertMutation} cancelMutation={cancelMutation} sendMutation={sendMutation}/>
          ))}
        </div>
      ) : (
        <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1.2fr 100px 90px 90px 100px', padding:'11px 20px', background:D.blueDim, borderBottom:`1px solid ${D.border}` }}>
            {COL_HEADERS.map((h, i) => (
              <span key={i} style={{ color:D.blue, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', textAlign:i >= 2 && i <= 5 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {isLoading ? Array(5).fill(0).map((_, i) => (
            <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${D.border}`, display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1.2fr 100px 90px 90px 100px', gap:8 }}>
              {Array(7).fill(0).map((_, j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6 }}/>)}
            </div>
          )) : !data?.quotes?.length ? (
            <div style={{ padding:'60px 20px', textAlign:'center' }}>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:20, background:D.goldDim, marginBottom:16 }}>
                <FileText size={32} color={D.gold}/>
              </div>
              <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:'0 0 16px' }}>{t('quotes.noQuotes')}</p>
              <Link to="/app/quotes/new" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:12, textDecoration:'none', fontSize:13, fontWeight:800, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff' }}>
                <Plus size={14}/> {t('quotes.createFirst')}
              </Link>
            </div>
          ) : data.quotes.map((q, idx) => (
            <QuoteRow key={q.id} q={q} idx={idx} D={D} fmt={fmt} t={t} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs} convertMutation={convertMutation} cancelMutation={cancelMutation} sendMutation={sendMutation}/>
          ))}
        </div>
      )}

      {data?.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
          <p style={{ color:D.muted, fontSize:13 }}>{t('invoices.page')} <strong style={{ color:D.text }}>{page}</strong> / {data.pages}</p>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ width:36, height:36, borderRadius:10, cursor:page <= 1 ? 'not-allowed' : 'pointer', background:page <= 1 ? '#F4F6FF' : D.blue, border:`1px solid ${page <= 1 ? D.border : D.blue}`, color:page <= 1 ? D.muted : '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronLeft size={16}/></button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} style={{ width:36, height:36, borderRadius:10, cursor:page >= data.pages ? 'not-allowed' : 'pointer', background:page >= data.pages ? '#F4F6FF' : D.blue, border:`1px solid ${page >= data.pages ? D.border : D.blue}`, color:page >= data.pages ? D.muted : '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronRight size={16}/></button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}

function QuoteCard({ q, D, fmt, t, showRate, exchangeRates, visibleCurrs, convertMutation, cancelMutation, sendMutation }) {
  const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft
  const isExpired = q.expiryDate && new Date(q.expiryDate) < new Date()
  const convStr = showRate ? fmtConv(Number(q.totalHtg), exchangeRates, visibleCurrs) : null
  return (
    <div style={{ background:D.white, borderRadius:14, border:`1px solid ${D.border}`, boxShadow:D.shadow, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'monospace', fontWeight:900, color:D.gold, fontSize:13 }}>{q.quoteNumber}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:sc.bg, color:sc.color, textTransform:'uppercase' }}>{t(STATUS_KEYS[q.status] || STATUS_KEYS.draft)}</span>
          <Link to={`/app/quotes/${q.id}`} style={{ width:34, height:34, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', textDecoration:'none' }}><Eye size={15}/></Link>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:14, fontWeight:700, color:D.text }}>{q.client?.name || <span style={{ color:D.muted, fontStyle:'italic' }}>{t('quotes.noClient')}</span>}</span>
        <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace' }}>{format(new Date(q.issueDate), 'dd/MM/yy')}</span>
      </div>
      <div style={{ height:1, background:D.border }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <p style={{ fontSize:10, color:D.muted, fontWeight:700, textTransform:'uppercase', margin:'0 0 2px' }}>{t('common.total')}</p>
          <p style={{ fontFamily:'monospace', fontWeight:900, color:D.text, fontSize:15, margin:0 }}>{fmt(q.totalHtg)} HTG</p>
          {convStr && <p style={{ fontFamily:'monospace', fontSize:11, color:D.muted, margin:'2px 0 0' }}>{convStr}</p>}
        </div>
        {q.expiryDate && (
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, color:D.muted, fontWeight:700, textTransform:'uppercase', margin:'0 0 2px' }}>{t('quotes.colExpiry')}</p>
            <p style={{ fontFamily:'monospace', fontSize:12, color: isExpired ? D.red : D.muted, margin:0 }}>{format(new Date(q.expiryDate), 'dd/MM/yy')}</p>
          </div>
        )}
      </div>
      {!['converted','cancelled'].includes(q.status) && (
        <div style={{ display:'flex', gap:8, borderTop:`1px solid ${D.border}`, paddingTop:10 }}>
          {['draft','sent'].includes(q.status) && (
            <Link to={`/app/quotes/${q.id}/edit`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:10, textDecoration:'none', background:D.blueDim, color:D.blue, fontWeight:700, fontSize:12 }}>
              <Edit2 size={13}/> {t('common.edit')}
            </Link>
          )}
          {q.status === 'draft' && (
            <button onClick={() => sendMutation.mutate(q.id)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:10, border:'none', background:'rgba(2,132,199,0.1)', color:'#0284C7', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              <Send size={13}/> {t('quotes.send')}
            </button>
          )}
          {['draft','sent','accepted'].includes(q.status) && (
            <button onClick={() => { if (confirm(t('quotes.convertConfirm'))) convertMutation.mutate(q.id) }} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:10, border:'none', background:D.successBg, color:D.success, fontWeight:700, fontSize:12, cursor:'pointer' }}>
              <CheckCircle size={13}/> {t('quotes.convert')}
            </button>
          )}
          <button onClick={() => { if (confirm(t('quotes.cancelConfirm'))) cancelMutation.mutate(q.id) }} style={{ width:36, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:'none', background:D.redDim, color:D.red, cursor:'pointer' }}>
            <XCircle size={15}/>
          </button>
        </div>
      )}
    </div>
  )
}

function QuoteRow({ q, idx, D, fmt, t, showRate, exchangeRates, visibleCurrs, convertMutation, cancelMutation, sendMutation }) {
  const [hov, setHov] = useState(false)
  const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft
  const isExpired = q.expiryDate && new Date(q.expiryDate) < new Date()
  const convStr = showRate ? fmtConv(Number(q.totalHtg), exchangeRates, visibleCurrs) : null
  const actionBtn = (onClick, icon, title, color) => (
    <button onClick={onClick} title={title} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${D.border}`, cursor:'pointer', background:'#F4F6FF', color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
      onMouseEnter={e => e.currentTarget.style.background=`${color}25`}
      onMouseLeave={e => e.currentTarget.style.background='#F4F6FF'}>{icon}</button>
  )
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1.2fr 100px 90px 90px 100px', padding:'12px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background:hov ? D.blueDim : idx%2===0 ? '#fff' : 'rgba(244,246,255,0.4)', transition:'background 0.15s' }}>
      <span style={{ fontFamily:'monospace', fontWeight:800, color:D.gold, fontSize:12 }}>{q.quoteNumber}</span>
      <span style={{ fontSize:13, fontWeight:600, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {q.client?.name || <span style={{ color:D.muted, fontStyle:'italic' }}>{t('quotes.noClient')}</span>}
      </span>
      <div style={{ textAlign:'center' }}>
        <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text, fontSize:13 }}>{fmt(q.totalHtg)} HTG</span>
        {convStr && <div style={{ fontSize:10, color:D.muted, fontFamily:'monospace', marginTop:2 }}>{convStr}</div>}
      </div>
      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:sc.bg, color:sc.color, textTransform:'uppercase' }}>{t(STATUS_KEYS[q.status] || STATUS_KEYS.draft)}</span>
      </div>
      <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace', textAlign:'center' }}>{format(new Date(q.issueDate), 'dd/MM/yy')}</span>
      <span style={{ fontSize:11, fontFamily:'monospace', textAlign:'center', color:isExpired ? D.red : D.muted }}>{q.expiryDate ? format(new Date(q.expiryDate), 'dd/MM/yy') : '—'}</span>
      <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
        <Link to={`/app/quotes/${q.id}`} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${D.border}`, background:'#F4F6FF', color:D.blue, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}><Eye size={13}/></Link>
        {['draft','sent'].includes(q.status) && actionBtn(()=>{}, <Edit2 size={12}/>, t('common.edit'), D.blue)}
        {q.status==='draft' && actionBtn(()=>sendMutation.mutate(q.id), <Send size={12}/>, t('quotes.send'), '#0284C7')}
        {['draft','sent','accepted'].includes(q.status) && actionBtn(()=>{ if(confirm(t('quotes.convertConfirm'))) convertMutation.mutate(q.id) }, <CheckCircle size={12}/>, t('quotes.convert'), D.success)}
        {!['converted','cancelled'].includes(q.status) && actionBtn(()=>{ if(confirm(t('quotes.cancelConfirm'))) cancelMutation.mutate(q.id) }, <XCircle size={12}/>, t('common.cancel'), D.red)}
      </div>
    </div>
  )
}
