// src/pages/quotes/QuoteDetail.jsx — Plus Fit redesign
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useMemo, useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Edit2, FileCheck, Share2, Copy, Check, MessageCircle, Eye, RefreshCw, Trash2, X,
  ExternalLink, KeyRound, Printer, FileText, User, Phone, Calendar, Package, XCircle, Send,
  CheckCircle, Clock, PenLine, StickyNote, Layers, DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import { printQuoteNative, isNativePrinterAvailable } from '../../services/printerNative'
import '../invoices/invoices.css'

const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 0 })
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

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
    .map(c => `≈ ${c.symbol}${fmt(c.amount)} ${c.currency}`)
  return parts.length ? parts : null
}

// ✅ Dat an lè Ayiti, fòma nimerik (pa "October" an anglè)
const toHaitiDate = (dateStr, fmt2) => {
  try {
    return format(new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/Port-au-Prince' })), fmt2)
  } catch { return '' }
}

const STATUS = {
  draft:     { label: 'Bouyon',  color: '#CBD5E1', Icon: PenLine },
  sent:      { label: 'Voye',    color: '#93C5FD', Icon: Send },
  accepted:  { label: 'Aksepte', color: '#34D399', Icon: CheckCircle },
  converted: { label: 'Konvèti', color: '#C4B5FD', Icon: FileCheck },
  cancelled: { label: 'Anile',   color: '#F87171', Icon: XCircle },
  expired:   { label: 'Ekspire', color: '#FBBF24', Icon: Clock },
}

function useCountUp(value, ms = 800) {
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

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, unit = 'HTG', dec = 0 }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{dec ? fmt(v) : fmt0(v)}{unit && <small>{unit}</small>}</div>
    </div>
  )
}

export default function QuoteDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { tenant, hasRole } = useAuthStore()
  const qc         = useQueryClient()

  const [shareOpen, setShareOpen] = useState(false)
  const [printing, setPrinting]   = useState(false)

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates || {}
  const visibleCurrs  = useMemo(() => parseCurrencies(tenant?.visibleCurrencies), [tenant?.visibleCurrencies])

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn:  () => quoteAPI.getOne(id).then(r => r.data.quote),
    staleTime: 30_000,
  })

  const onErr = (e) => toast.error(e?.response?.data?.message || 'Erè sèvè. Eseye ankò.')

  const convertMutation = useMutation({
    mutationFn: () => quoteAPI.convert(id),
    onSuccess:  (res) => {
      toast.success('Devi konvèti an fakti!')
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['quote', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/app/invoices/${res.data.invoice.id}`)
    },
    onError: onErr,
  })

  // ✅ KORIJE — invalidateQueries({ queryKey }) (v5); anvan sa paj la pa t rafrechi apre anilasyon
  const cancelMutation = useMutation({
    mutationFn: () => quoteAPI.cancel(id),
    onSuccess:  () => {
      toast.success('Devi anile.')
      qc.invalidateQueries({ queryKey: ['quote', id] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
    },
    onError: onErr,
  })

  const sendMutation = useMutation({
    mutationFn: () => quoteAPI.send(id),
    onSuccess:  () => {
      toast.success('Devi make voye.')
      qc.invalidateQueries({ queryKey: ['quote', id] })
      qc.invalidateQueries({ queryKey: ['quotes'] })
    },
    onError: onErr,
  })

  const shareMutation = useMutation({
    mutationFn: () => quoteAPI.share(id),
    onSuccess:  () => { toast.success('Lyen ak kòd akse kreye!'); qc.invalidateQueries({ queryKey: ['quote', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan kreye lyen.'),
  })

  const revokeMutation = useMutation({
    mutationFn: () => quoteAPI.revokeShare(id),
    onSuccess:  () => { toast.success('Lyen revoke.'); qc.invalidateQueries({ queryKey: ['quote', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan revoke lyen.'),
  })

  if (isLoading) return (
    <div className="iv">
      <div className="iv-hero" style={{ minHeight: 190 }}>
        <div className="iv-sk" style={{ width: '30%', height: 14, opacity: .25 }}/>
        <div className="iv-sk" style={{ width: '45%', height: 34, marginTop: 12, opacity: .25 }}/>
      </div>
      <div className="iv-layout">
        <div className="iv-sec">{[70, 50, 90, 60].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 14 }}/>)}</div>
        <div className="iv-sec">{[60, 80, 40].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 14 }}/>)}</div>
      </div>
    </div>
  )
  if (!quote) return null

  const snap       = quote.clientSnapshot || {}
  const clientName = snap.name || quote.client?.name || ''
  const st         = STATUS[quote.status] || STATUS.draft
  const canShare   = quote.status !== 'cancelled'
  const canEdit    = ['draft', 'sent'].includes(quote.status)
  const canConvert = ['draft', 'sent', 'accepted'].includes(quote.status)
  const canCancel  = !['converted', 'cancelled'].includes(quote.status)
  const usdRate    = Number(exchangeRates.USD || quote.exchangeRate || 132)
  const totalUsd   = Number(quote.totalHtg || 0) / usdRate
  const isExpired  = quote.expiryDate && new Date(quote.expiryDate) < new Date() && canCancel
  const daysLeft   = quote.expiryDate ? Math.ceil((new Date(quote.expiryDate) - new Date()) / 864e5) : null

  // ✅ Enprime: APK → enprimant natif; navigatè → dyalòg enprime (bouton yo kache)
  const handlePrint = async () => {
    if (isNativePrinterAvailable()) {
      setPrinting(true)
      try {
        await printQuoteNative(quote, tenant)
        toast.success('Devi enprime!')
      } catch (e) {
        toast.error(e.message || 'Erè pandan enprime devi a.')
      } finally {
        setPrinting(false)
      }
    } else {
      window.print()
    }
  }

  const doConvert = () => { if (confirm('Konvèti devi sa an fakti?')) convertMutation.mutate() }
  const doCancel  = () => { if (confirm('Anile devi sa? Ou pa ka defèt sa.')) cancelMutation.mutate() }

  return (
    <div className="iv" style={{ maxWidth: 1240, paddingBottom: 80 }}>

      {/* ══════════ HERO ══════════ */}
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FFC83D" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FF6B00" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={() => navigate('/app/quotes')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico gold"><FileText size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">Devi · Pwofòma</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{quote.quoteNumber}</h1>
              <span className="stamp" style={{ '--sc': st.color }}><i/> {st.label}</span>
            </div>
            <div className="meta-line">
              <span><User size={12}/> {clientName || 'San kliyan'}</span>
              <span><Calendar size={12}/> {toHaitiDate(quote.issueDate || quote.createdAt, 'dd/MM/yyyy')}</span>
              {quote.expiryDate && (
                <span style={isExpired ? { color: '#FCA5A5', fontWeight: 800 } : undefined}>
                  <Clock size={12}/> {isExpired ? 'Ekspire' : 'Valab jiska'} {toHaitiDate(quote.expiryDate, 'dd/MM/yyyy')}
                </span>
              )}
            </div>
          </div>
          {canConvert && (
            <button onClick={doConvert} disabled={convertMutation.isPending} className="iv-btn-main pulse no-print">
              {convertMutation.isPending ? <RefreshCw size={17} className="spin"/> : <FileCheck size={17}/>} Konvèti an fakti
            </button>
          )}
          {quote.status === 'converted' && quote.invoice && (
            <Link to={`/app/invoices/${quote.invoice.id}`} className="iv-btn-main no-print">
              <FileCheck size={17}/> Wè fakti {quote.invoice.invoiceNumber}
            </Link>
          )}
        </div>

        <div className="iv-kpis">
          <Kpi label="Total"   value={quote.totalHtg} icon={DollarSign} delay={80}  tone="gold"/>
          <Kpi label="≈ USD"   value={totalUsd}       icon={DollarSign} delay={160} unit="USD" dec={2}/>
          {daysLeft != null && canCancel
            ? <Kpi label={isExpired ? 'Ekspire depi' : 'Jou ki rete'} value={Math.abs(daysLeft)} icon={Clock} delay={240} unit="jou" tone={isExpired || daysLeft <= 3 ? 'red' : 'green'}/>
            : <Kpi label="Atik" value={quote.items?.length || 0} icon={Layers} delay={240} unit=""/>}
        </div>
      </section>

      {/* ══════════ AKSYON ══════════ */}
      <div className="iv-actions a-up no-print" style={{ animationDelay: '100ms' }}>
        <button onClick={handlePrint} disabled={printing} className={isNativePrinterAvailable() ? 'iv-act sky' : 'iv-act'}>
          {printing ? <RefreshCw size={15} className="spin"/> : <Printer size={15}/>} {printing ? 'Ap enprime...' : 'Enprime'}
        </button>
        {canShare && (
          <button onClick={() => setShareOpen(true)} className={`iv-act ${quote.publicToken ? 'green' : ''}`} style={{ position: 'relative' }}>
            <Share2 size={15}/> {quote.publicToken ? 'Lyen aktif' : 'Pataje'}
            {quote.publicViewCount > 0 && <span className="iv-badge-dot">👁 {quote.publicViewCount}</span>}
          </button>
        )}
        {canEdit && <Link to={`/app/quotes/${id}/edit`} className="iv-act"><Edit2 size={15}/> Modifye</Link>}
        {quote.status === 'draft' && (
          <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} className="iv-act sky">
            <Send size={15}/> Make voye
          </button>
        )}
        <span className="sp"/>
        {/* ✅ NOUVO — bouton Anile (mutation an te egziste men pa t gen bouton) */}
        {canCancel && (hasRole ? hasRole(['admin', 'cashier']) : true) && (
          <button onClick={doCancel} disabled={cancelMutation.isPending} className="iv-act danger"><XCircle size={15}/> Anile</button>
        )}
      </div>

      <div className="iv-layout">
        <div className="iv-col">

          <section className="iv-sec a-up" style={{ animationDelay: '140ms' }}>
            <div className="iv-sec-h" style={{ marginBottom: clientName ? 14 : 0 }}>
              <div className="n"><User size={17}/></div>
              <div><p className="eb">Kliyan</p><h3>{clientName || 'San kliyan'}</h3></div>
            </div>
            {clientName && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {snap.phone && <span className="iv-pill muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}><Phone size={11}/> {snap.phone}</span>}
                {snap.email && <span className="iv-pill muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>{snap.email}</span>}
              </div>
            )}
          </section>

          <section className="iv-sec a-up" style={{ animationDelay: '200ms' }}>
            <div className="iv-sec-h">
              <div className="n"><Package size={17}/></div>
              <div><p className="eb">Detay</p><h3>Atik yo</h3></div>
              <div className="r"><span className="iv-pill muted">{quote.items?.length || 0} atik</span></div>
            </div>
            <div className="iv-dl-head">
              <span>Pwodui</span><span style={{ textAlign: 'center' }}>Qte</span><span style={{ textAlign: 'right' }}>Pri U.</span>
              <span style={{ textAlign: 'right' }}>Rabè</span><span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {quote.items?.map((item, i) => {
              const tierLabel = item.productSnapshot?.tierLabel
              const code = item.product?.code || item.productSnapshot?.code
              const unit = item.product?.unit || item.productSnapshot?.unit
              // ✅ KORIJE — montre rabè a an MONTAN (discountAmt), pa "7.75%"
              const disc = item.discountAmt != null
                ? Number(item.discountAmt)
                : Number(item.unitPriceHtg) * Number(item.quantity) * Number(item.discountPct || 0) / 100
              const conv = showRate ? fmtConv(Number(item.totalHtg), exchangeRates, visibleCurrs) : null
              return (
                <div key={item.id || i} className="iv-dl-row" style={{ animationDelay: `${Math.min(i, 10) * 40 + 220}ms` }}>
                  <div className="nm">
                    <span className="iv-thumb" style={{ backgroundImage: item.product?.imageUrl ? `url(${item.product.imageUrl})` : undefined }}>
                      {!item.product?.imageUrl && <Package size={15} color="#1B2A8F"/>}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <b>{item.product?.name || item.productSnapshot?.name}</b>
                        {tierLabel && <span className={`iv-tier ${tierLabel === 'Detay' ? 'det' : ''}`}>{tierLabel}</span>}
                      </div>
                      {code && <small>{code}</small>}
                    </div>
                  </div>
                  <div className="c">
                    <span className="k">Qte</span>
                    <span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{Number(item.quantity)}</span>
                    {unit && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>{unit}</span>}
                  </div>
                  <div className="r"><span className="k">Pri U.</span><span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{fmt(item.unitPriceHtg)}</span></div>
                  <div className={`r ${disc > 0 ? '' : 'disc'}`}>
                    <span className="k">Rabè</span>
                    <span className="num" style={{ fontSize: 16, color: disc > 0 ? 'var(--bad)' : 'var(--muted)' }}>{disc > 0 ? `−${fmt(disc)}` : '—'}</span>
                  </div>
                  <div className="r">
                    <span className="k">Total</span>
                    <span className="num" style={{ fontSize: 19, fontWeight: 800 }}>{fmt(item.totalHtg)}</span>
                    {conv && conv.map((l, j) => <div key={j} className="iv-conv">{l}</div>)}
                  </div>
                </div>
              )
            })}
          </section>

          {(quote.notes || quote.terms) && (
            <section className="iv-sec a-up" style={{ animationDelay: '260ms' }}>
              <div className="iv-sec-h">
                <div className="n"><StickyNote size={17}/></div>
                <div><p className="eb">Pou kliyan an</p><h3>Nòt ak kondisyon</h3></div>
              </div>
              {quote.notes && (
                <div style={{ marginBottom: quote.terms ? 12 : 0 }}>
                  <label className="iv-lbl">Nòt</label>
                  <p className="iv-note" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <label className="iv-lbl">Kondisyon</label>
                  <p className="iv-note" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{quote.terms}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ══════════ PWOFÒMA ══════════ */}
        <aside className="iv-aside">
          <div className="iv-receipt">
            <div className="rh">
              <span className="brand">{tenant?.businessName || tenant?.name || 'Pwofòma'}</span>
              {['converted', 'cancelled'].includes(quote.status)
                ? <span className="iv-seal" style={{ '--sc': quote.status === 'converted' ? '#7C3AED' : '#DC2626' }}>{quote.status === 'converted' ? 'KONVÈTI' : 'ANILE'}</span>
                : <span className="tag" style={{ color: '#A87B12', background: 'rgba(201,168,76,.15)' }}>Pwofòma</span>}
            </div>
            <div className="meta">
              <div><span>Kliyan</span><b>{clientName || 'San kliyan'}</b></div>
              <div style={{ textAlign: 'right' }}><span>Deviz</span><b>{quote.currency || 'HTG'}</b></div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <div className="iv-rrow"><span>Sou-total</span><span className="num">{fmt(quote.subtotalHtg)}</span></div>
              {Number(quote.discountHtg) > 0 && <div className="iv-rrow disc"><span>Remiz</span><span className="num">−{fmt(quote.discountHtg)}</span></div>}
              {Number(quote.taxHtg) > 0 && <div className="iv-rrow"><span>TVA ({Number(quote.taxRate)}%)</span><span className="num">+{fmt(quote.taxHtg)}</span></div>}
            </div>

            <div className="iv-rtotal">
              <span>Total</span>
              <span className="num">{fmt(quote.totalHtg)}<small>HTG</small></span>
            </div>
            {showRate && fmtConv(Number(quote.totalHtg), exchangeRates, visibleCurrs)?.map((l, i) => (
              <div key={i} className="iv-rrow" style={{ justifyContent: 'flex-end' }}><span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>{l}</span></div>
            ))}

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1.5px dashed var(--line2)', fontSize: 11 }}>
              {showRate && visibleCurrs.map(cur => {
                const r = Number(exchangeRates[cur])
                if (!r) return null
                return <div key={cur} className="iv-rrow"><span>1 {cur}</span><span className="mono">{r.toFixed(2)} HTG</span></div>
              })}
              {(!showRate || !visibleCurrs.length) && (
                <div className="iv-rrow"><span>To</span><span className="mono">1 USD = {Number(quote.exchangeRate || 132).toFixed(2)} HTG</span></div>
              )}
              {quote.expiryDate && (
                <div className="iv-rrow" style={isExpired ? { color: 'var(--bad)', fontWeight: 800 } : undefined}>
                  <span>{isExpired ? '⚠ Ekspire' : 'Valab jiska'}</span><span>{toHaitiDate(quote.expiryDate, 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="iv-printbtns no-print">
            {canConvert && (
              <button onClick={doConvert} disabled={convertMutation.isPending} className="iv-btn-main" style={{ width: '100%', minHeight: 50 }}>
                {convertMutation.isPending ? <RefreshCw size={16} className="spin"/> : <FileCheck size={16}/>} Konvèti an fakti
              </button>
            )}
            <button onClick={handlePrint} disabled={printing} className="iv-act" style={{ width: '100%' }}>
              <Printer size={15}/> {printing ? 'Ap enprime...' : 'Enprime devi a'}
            </button>
          </div>
        </aside>
      </div>

      {shareOpen && (
        <ShareModal quote={quote} tenant={tenant} onClose={() => setShareOpen(false)} shareMutation={shareMutation} revokeMutation={revokeMutation}/>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MODAL PATAJE AK KÒD AKSE
// ════════════════════════════════════════════════════════════
function ShareModal({ quote, tenant, onClose, shareMutation, revokeMutation }) {
  const [copied, setCopied]         = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  const hasActive = !!quote.publicToken && !!quote.accessCode
  const publicUrl = quote.publicToken ? `${window.location.origin}/proforma/${quote.publicToken}` : ''
  const code      = String(quote.accessCode || '')

  const handleCopy = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text)
      setter(true)
      toast.success('Kopye!')
      setTimeout(() => setter(false), 2000)
    } catch {
      toast.error('Pa ka kopye otomatikman')
    }
  }

  const phone      = quote.clientSnapshot?.phone || quote.client?.phone || ''
  const cleanPhone = phone.replace(/\D/g, '')
  const clientName = quote.clientSnapshot?.name || quote.client?.name || ''

  const waMessage = encodeURIComponent(
    `Bonjour${clientName ? ' ' + clientName : ''},\n\n` +
    `Voici votre proforma N° ${quote.quoteNumber}.\n` +
    `Total : ${fmt(quote.totalHtg)} HTG\n\n` +
    `🔗 Lien d'accès :\n${publicUrl}\n\n` +
    `🔐 Code d'accès : ${code}\n\n` +
    `Merci !\n${tenant?.name || ''}`
  )
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMessage}` : `https://wa.me/?text=${waMessage}`
  const isPending = shareMutation.isPending || revokeMutation.isPending

  return (
    <div className="iv-overlay sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 500 }}>
        <div className="iv-sheet-h">
          <h3><Share2 size={18} style={{ verticalAlign: '-2px' }}/> Pataje pwofòma</h3>
          <p>{quote.quoteNumber} · {fmt(quote.totalHtg)} HTG</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>

        <div className="iv-sheet-b">
          {hasActive ? (
            <>
              <div className="iv-paidbox ok" style={{ marginTop: 0 }}>
                <span><Check size={14}/> Lyen ak kòd akse aktif</span>
              </div>

              {quote.publicViewCount > 0 ? (
                <div className="iv-views" style={{ background: 'rgba(27,42,143,.06)', color: 'var(--ink)' }}>
                  <Eye size={14} color="#1B2A8F"/>
                  <span>Kliyan an wè pwofòma a <b>{quote.publicViewCount}</b> fwa
                    {quote.publicViewedAt && <> · premye fwa {toHaitiDate(quote.publicViewedAt, 'dd/MM/yyyy HH:mm')}</>}
                  </span>
                </div>
              ) : (
                <div className="iv-views" style={{ background: 'var(--warnBg)', color: '#92400E' }}>
                  <Eye size={14}/> Kliyan an poko wè pwofòma a
                </div>
              )}

              <div>
                <label className="iv-lbl">🔗 Lyen akse</label>
                <div className="iv-share-url">
                  <input readOnly value={publicUrl} className="iv-inp" onFocus={e => e.target.select()}/>
                  <button onClick={() => handleCopy(publicUrl, setCopied)} className={`iv-act icon ${copied ? 'green' : ''}`} style={{ minHeight: 44, width: 44 }}>
                    {copied ? <Check size={17}/> : <Copy size={17}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="iv-lbl">🔐 Kòd akse</label>
                <div className="iv-code">
                  <div className="dg">{code.split('').map((d, i) => <span key={i} style={{ animationDelay: `${i * 80}ms` }}>{d}</span>)}</div>
                  <button onClick={() => handleCopy(code, setCodeCopied)} className="iv-act icon" style={{ minHeight: 44, width: 44, background: '#FF6B00', color: '#fff', borderColor: '#FF6B00' }}>
                    {codeCopied ? <Check size={17}/> : <Copy size={17}/>}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#92400E', margin: '8px 0 0', fontWeight: 700 }}>⚠️ Voye kòd sa ak kliyan an separeman pou plis konfidansyalite.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <a href={waUrl} target="_blank" rel="noreferrer" className="iv-wa"><MessageCircle size={17}/> WhatsApp</a>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="iv-btn-main" style={{ background: 'linear-gradient(135deg,#1B2A8F,#2D3FBF)', boxShadow: '0 10px 24px rgba(27,42,143,.3)' }}>
                  <ExternalLink size={16}/> Wè kòm kliyan
                </a>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (confirm('Re-jenere lyen + nouvo kòd?')) shareMutation.mutate() }} disabled={isPending} className="iv-act" style={{ flex: 1, color: '#D97706' }}>
                  <RefreshCw size={14}/> Re-jenere
                </button>
                <button onClick={() => { if (confirm('Revoke lyen sa? Kliyan an p ap ka wè pwofòma a ankò.')) revokeMutation.mutate() }} disabled={isPending} className="iv-act danger" style={{ flex: 1 }}>
                  <Trash2 size={14}/> Revoke
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Kreye yon <b style={{ color: 'var(--ink)' }}>lyen sekrè</b> ak yon <b style={{ color: 'var(--ink)' }}>kòd akse</b> pou pataje pwofòma sa ak kliyan an.
              </p>
              <div className="iv-info">
                <KeyRound size={16} color="#1B2A8F" style={{ flexShrink: 0, marginTop: 2 }}/>
                <div>
                  <b>Kijan sa mache</b>
                  <ol>
                    <li>Kliyan an klike sou lyen an</li>
                    <li>Li antre kòd akse a</li>
                    <li>Si kòd la bon, li wè pwofòma a</li>
                    <li>Ou ka revoke lyen an nenpòt ki lè</li>
                  </ol>
                </div>
              </div>
              <button onClick={() => shareMutation.mutate()} disabled={isPending} className="iv-btn-main" style={{ width: '100%', minHeight: 52 }}>
                {shareMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Share2 size={16}/>}
                {shareMutation.isPending ? 'Ap kreye...' : 'Jenere lyen + kòd akse'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}