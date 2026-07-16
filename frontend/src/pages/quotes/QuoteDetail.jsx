// src/pages/quotes/QuoteDetail.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { quoteAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useMemo, memo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Edit2, FileCheck, Share2, Copy, Check, MessageCircle,
  Lock, Eye, RefreshCw, Trash2, X, ExternalLink, Link2, KeyRound, Printer
} from 'lucide-react'
import { format } from 'date-fns'
import { printQuoteNative, isNativePrinterAvailable } from '../../services/printerNative'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
const CURRENCY_SYMBOLS = { USD: '$', DOP: 'RD$', EUR: '€', CAD: 'CA$' }

// ✅ Deyò component — pa rekrye
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

const STATUS_BADGES = { draft:'badge-gray', sent:'badge-blue', accepted:'badge-green', converted:'badge-purple', cancelled:'badge-red' }
const STATUS_LABELS = { draft:'Bouyon', sent:'Voye', accepted:'Aksepte', converted:'Konvèti', cancelled:'Anile' }

// ✅ WithConv — deyò component prensipal, memo
const WithConv = memo(function WithConv({ htg, showRate, exchangeRates, visibleCurrs, large }) {
  const lines = useMemo(
    () => showRate ? fmtConv(Number(htg), exchangeRates, visibleCurrs) : null,
    [htg, showRate, exchangeRates, visibleCurrs]
  )
  return (
    <div style={{ textAlign:'right' }}>
      <span className={`font-mono${large ? ' font-bold text-brand-700' : ''}`}>{fmt(htg)} HTG</span>
      {lines && lines.map((line, i) => (
        <div key={i} style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace', marginTop:1 }}>{line}</div>
      ))}
    </div>
  )
})

export default function QuoteDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { tenant } = useAuthStore()
  const qc         = useQueryClient()

  // ✅ NOUVO — eta modal pataj
  const [shareOpen, setShareOpen] = useState(false)
  // ✅ NOUVO — eta pandan y ap enprime sou enprimant native (APK)
  const [printing, setPrinting] = useState(false)

  const showRate      = tenant?.showExchangeRate !== false
  const exchangeRates = tenant?.exchangeRates || {}
  // ✅ parseCurrencies — jere string ak array
  const visibleCurrs  = useMemo(
    () => parseCurrencies(tenant?.visibleCurrencies),
    [tenant?.visibleCurrencies]
  )

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn:  () => quoteAPI.getOne(id).then(r => r.data.quote),
    staleTime: 30_000, // ✅ cache 30 sèk
  })

  const convertMutation = useMutation({
    mutationFn: () => quoteAPI.convert(id),
    onSuccess:  (res) => {
      toast.success('Devis konvèti an facture!')
      // ✅ Kòrèk path
      navigate(`/app/invoices/${res.data.invoice.id}`)
    }
  })

  const cancelMutation = useMutation({
    mutationFn: () => quoteAPI.cancel(id),
    onSuccess:  () => { toast.success('Devis anile.'); qc.invalidateQueries(['quote', id]) }
  })

  // ✅ NOUVO — Mutation pou jenere lyen pataj + kòd akse
  const shareMutation = useMutation({
    mutationFn: () => quoteAPI.share(id),
    onSuccess:  () => {
      toast.success('Lyen ak kòd akse kreye!')
      qc.invalidateQueries({ queryKey: ['quote', id] })
    },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan kreye lyen.')
  })

  // ✅ NOUVO — Mutation pou revoke lyen
  const revokeMutation = useMutation({
    mutationFn: () => quoteAPI.revokeShare(id),
    onSuccess:  () => {
      toast.success('Lyen revoke.')
      qc.invalidateQueries({ queryKey: ['quote', id] })
    },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan revoke lyen.')
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner"/></div>
  if (!quote)    return null

  const snap = quote.clientSnapshot || {}
  const canShare = !['cancelled'].includes(quote.status)

  // ✅ NOUVO — Enprime devi a: si nou nan APK (Bluetooth/Sunmi/iMin/Telpo konfigire),
  // voye dirèkteman bay enprimant thermal la. Sinon (navigatè web), itilize dyalòg enprime navigatè a.
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

  return (
    <div className="animate-fade-in max-w-4xl">

      {/* ✅ NOUVO — Estil enprime: kache bouton yo, gade sèlman kontni devi a */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6" style={{ flexWrap:'wrap', gap:12 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/quotes')} className="btn-ghost p-2 no-print">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">{quote.quoteNumber}</h1>
              <span className={STATUS_BADGES[quote.status] || 'badge-gray'}>
                {STATUS_LABELS[quote.status]}
              </span>
            </div>
            <p className="text-slate-500 text-sm">{format(new Date(quote.issueDate), 'dd MMMM yyyy')}</p>
          </div>
        </div>
        <div className="flex gap-2 no-print" style={{ flexWrap:'wrap' }}>

          {/* ✅ NOUVO — Bouton Enprime Devi */}
          <button onClick={handlePrint} disabled={printing} className="btn-secondary btn-sm">
            <Printer size={14}/> {printing ? 'Ap enprime...' : 'Enprime Devi'}
          </button>

          {/* ✅ NOUVO — Bouton Pataje */}
          {canShare && (
            <button
              onClick={() => setShareOpen(true)}
              className="btn-secondary btn-sm"
              style={{
                background: quote.publicToken ? 'linear-gradient(135deg,#25D366,#1da851)' : undefined,
                color: quote.publicToken ? '#fff' : undefined,
                border: quote.publicToken ? 'none' : undefined,
                position: 'relative',
              }}>
              <Share2 size={14}/>
              {quote.publicToken ? 'Lyen Aktif' : 'Pataje'}
              {quote.publicViewCount > 0 && (
                <span style={{
                  position:'absolute', top:-6, right:-6,
                  background:'#dc2626', color:'#fff',
                  borderRadius:99, padding:'1px 6px',
                  fontSize:10, fontWeight:800,
                }}>
                  👁 {quote.publicViewCount}
                </span>
              )}
            </button>
          )}

          {['draft','sent'].includes(quote.status) && (
            <Link to={`/app/quotes/${id}/edit`} className="btn-secondary btn-sm">
              <Edit2 size={14}/> Modifye
            </Link>
          )}
          {['draft','sent','accepted'].includes(quote.status) && (
            <button
              onClick={() => { if (confirm('Konvèti an facture?')) convertMutation.mutate() }}
              disabled={convertMutation.isPending}
              className="btn-primary">
              <FileCheck size={16}/> Konvèti an Facture
            </button>
          )}
          {quote.status === 'converted' && quote.invoice && (
            <Link to={`/app/invoices/${quote.invoice.id}`} className="btn-primary">
              <FileCheck size={16}/> Wè Facture {quote.invoice.invoiceNumber}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Kliyan */}
          <div className="card p-5">
            <h3 className="section-title">Kliyan</h3>
            {snap.name
              ? <div>
                  <p className="font-semibold text-slate-800">{snap.name}</p>
                  {snap.phone && <p className="text-sm text-slate-500">{snap.phone}</p>}
                  {snap.email && <p className="text-sm text-slate-500">{snap.email}</p>}
                </div>
              : <p className="text-slate-400 italic">San kliyan</p>
            }
          </div>

          {/* Atik yo */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">
                Atik yo ({quote.items?.length || 0})
              </h3>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Pwodui</th>
                  <th className="text-center">Qte</th>
                  <th className="text-right">Pri U.</th>
                  <th className="text-center">Rem.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items?.map((item, i) => (
                  // ✅ QuoteItemRow — memo pou evite re-render
                  <QuoteItemRow
                    key={item.id || i}
                    item={item}
                    showRate={showRate}
                    exchangeRates={exchangeRates}
                    visibleCurrs={visibleCurrs}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {quote.notes && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nòt</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Totaux */}
        <div>
          <div className="card p-5">
            <h3 className="font-display font-bold text-slate-800 mb-4">Totaux</h3>
            <div className="space-y-2.5 text-sm">

              <div className="flex justify-between items-start">
                <span className="text-slate-500">Sous-total</span>
                <WithConv htg={quote.subtotalHtg} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs}/>
              </div>

              {Number(quote.discountHtg) > 0 && (
                <div className="flex justify-between items-start text-red-600">
                  <span>Remiz</span>
                  <div style={{ textAlign:'right' }}>
                    <span className="font-mono">-{fmt(quote.discountHtg)} HTG</span>
                    {showRate && fmtConv(Number(quote.discountHtg), exchangeRates, visibleCurrs)?.map((line, i) => (
                      <div key={i} style={{ fontSize:10, color:'#f87171', fontFamily:'monospace' }}>
                        -{line.replace('≈ ', '')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Number(quote.taxHtg) > 0 && (
                <div className="flex justify-between items-start">
                  <span>TVA ({Number(quote.taxRate)}%)</span>
                  <WithConv htg={quote.taxHtg} showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs}/>
                </div>
              )}

              <div className="flex justify-between items-start font-bold text-base pt-2 border-t border-slate-200 mt-2">
                <span>TOTAL</span>
                <WithConv htg={quote.totalHtg} large showRate={showRate} exchangeRates={exchangeRates} visibleCurrs={visibleCurrs}/>
              </div>
            </div>

            {/* Taux reference */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Devise:</span><span>{quote.currency}</span>
              </div>
              {showRate && visibleCurrs.map(cur => {
                const r = Number(exchangeRates[cur])
                if (!r) return null
                return (
                  <div key={cur} className="flex justify-between">
                    <span>1 {cur} =</span>
                    <span className="font-mono">{r.toFixed(2)} HTG</span>
                  </div>
                )
              })}
              {(!showRate || !visibleCurrs.length) && (
                <div className="flex justify-between">
                  <span>Taux:</span>
                  <span className="font-mono">1 USD = {Number(quote.exchangeRate || 132).toFixed(2)} HTG</span>
                </div>
              )}
              {quote.expiryDate && (
                <div className="flex justify-between">
                  <span>Ekspire:</span>
                  <span>{format(new Date(quote.expiryDate), 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOUVO — Modal Pataje */}
      {shareOpen && (
        <ShareModal
          quote={quote}
          tenant={tenant}
          onClose={() => setShareOpen(false)}
          shareMutation={shareMutation}
          revokeMutation={revokeMutation}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ✅ NOUVO — MODAL PATAJE AK KÒD AKSE
// ════════════════════════════════════════════════════════════

function ShareModal({ quote, tenant, onClose, shareMutation, revokeMutation }) {
  const [copied,     setCopied]     = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  const hasActive = !!quote.publicToken && !!quote.accessCode
  const publicUrl = quote.publicToken ? `${window.location.origin}/proforma/${quote.publicToken}` : ''
  const code      = quote.accessCode || ''

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
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${waMessage}`
    : `https://wa.me/?text=${waMessage}`

  const isPending = shareMutation.isPending || revokeMutation.isPending

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalBox}>

        {/* Header */}
        <div style={modalHeader}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <div style={iconBoxStyle(hasActive ? '#25D366' : '#1B2A8F')}>
              <Share2 size={18} color="#fff"/>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize:17, fontWeight:900, color:'#0F1A5C', margin:0 }}>Pataje pwoforma</h2>
              <p style={{ fontSize:12, color:'#6B7AAB', margin:'2px 0 0' }}>
                {quote.quoteNumber} · {fmt(quote.totalHtg)} HTG
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>
            <X size={18}/>
          </button>
        </div>

        {/* Kontni */}
        <div style={{ padding:'20px 22px' }}>

          {hasActive ? (
            <>
              {/* Banyè aktif */}
              <div style={statusBanner('#25D366', 'rgba(37,211,102,0.08)')}>
                <Check size={16} color="#16a34a"/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:'#15803d', margin:0 }}>
                    Lyen ak kòd akse aktif
                  </p>
                  <p style={{ fontSize:11, color:'#16a34a', margin:'2px 0 0' }}>
                    Kliyan an dwe antre kòd la pou wè pwoforma a.
                  </p>
                </div>
              </div>

              {/* Stati vizit */}
              {quote.publicViewCount > 0 ? (
                <div style={viewStats}>
                  <Eye size={14} color="#1B2A8F"/>
                  <span style={{ fontSize:12, color:'#0F1A5C', fontWeight:600 }}>
                    Kliyan an wè pwoforma a <strong>{quote.publicViewCount}</strong> fwa
                    {quote.publicViewedAt && (
                      <> · premye fwa {format(new Date(quote.publicViewedAt), 'dd/MM/yyyy HH:mm')}</>
                    )}
                  </span>
                </div>
              ) : (
                <div style={{ ...viewStats, background:'rgba(217,119,6,0.06)' }}>
                  <Eye size={14} color="#D97706"/>
                  <span style={{ fontSize:12, color:'#92400e', fontWeight:600 }}>
                    Kliyan an poko wè pwoforma a
                  </span>
                </div>
              )}

              {/* URL */}
              <div style={{ marginTop:14 }}>
                <p style={inputLabel}>🔗 Lyen d'akse</p>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    onFocus={(e) => e.target.select()}
                    style={urlInputStyle}
                  />
                  <button onClick={() => handleCopy(publicUrl, setCopied)} style={iconBtnStyle('#1B2A8F')}>
                    {copied ? <Check size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              </div>

              {/* Kòd akse (KÒM GWO ELEMAN) */}
              <div style={{ marginTop:14 }}>
                <p style={inputLabel}>🔐 Kòd akse 4 chif</p>
                <div style={codeContainer}>
                  <div style={{ display:'flex', gap:6 }}>
                    {code.split('').map((digit, i) => (
                      <div key={i} style={codeDigit}>{digit}</div>
                    ))}
                  </div>
                  <button onClick={() => handleCopy(code, setCodeCopied)} style={iconBtnStyle('#FF6B00')}>
                    {codeCopied ? <Check size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
                <p style={{ fontSize:11, color:'#92400e', margin:'8px 0 0', fontWeight:600, lineHeight:1.4 }}>
                  ⚠️ Voye kòd sa ak kliyan an separeman pou pi gwo konfidansyalite.
                </p>
              </div>

              {/* Aksyon prensipal */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:18 }}>
                <a href={waUrl} target="_blank" rel="noreferrer" style={waBtn}>
                  <MessageCircle size={16}/> WhatsApp
                </a>
                <a href={publicUrl} target="_blank" rel="noreferrer" style={previewBtn}>
                  <ExternalLink size={16}/> Wè kòm Kliyan
                </a>
              </div>

              {/* Aksyon segondè */}
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button
                  onClick={() => { if (confirm('Re-jenere lyen + nouvo kòd?')) shareMutation.mutate() }}
                  disabled={isPending}
                  style={secondaryBtnStyle('#D97706')}>
                  <RefreshCw size={13}/> Re-jenere
                </button>
                <button
                  onClick={() => {
                    if (confirm('Revoke lyen sa? Kliyan an pap ka wè pwoforma a ankò.')) {
                      revokeMutation.mutate()
                    }
                  }}
                  disabled={isPending}
                  style={secondaryBtnStyle('#DC2626')}>
                  <Trash2 size={13}/> Revoke
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize:13, color:'#475569', margin:'0 0 14px', lineHeight:1.5 }}>
                Kreye yon <strong>lyen sekrè</strong> ak yon <strong>kòd akse 4 chif</strong> pou pataje pwoforma sa ak kliyan an.
              </p>

              <div style={infoBox('#1B2A8F')}>
                <KeyRound size={14} color="#1B2A8F"/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#0F1A5C', margin:0 }}>
                    Kijan sa ap fonksyone:
                  </p>
                  <ul style={{ fontSize:11, color:'#475569', margin:'4px 0 0', paddingLeft:18, lineHeight:1.6 }}>
                    <li>Kliyan an klike sou lyen an</li>
                    <li>Yo antre kòd akse 4 chif la</li>
                    <li>Si kòd la kòrèk, yo wè pwoforma a</li>
                    <li>Ou ka revoke lyen an nenpòt ki lè</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => shareMutation.mutate()}
                disabled={isPending}
                style={primaryBtnStyle}>
                {shareMutation.isPending ? '⏳ Ap kreye...' : <><Share2 size={16}/> Jenere Lyen + Kòd Akse</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STIL MODAL
// ════════════════════════════════════════════════════════════

const overlay = {
  position:'fixed', inset:0, zIndex:1000,
  background:'rgba(15,26,92,0.5)', backdropFilter:'blur(4px)',
  display:'flex', alignItems:'center', justifyContent:'center',
  padding:16,
}

const modalBox = {
  background:'#fff', borderRadius:18, width:'100%', maxWidth:520,
  maxHeight:'90vh', overflowY:'auto',
  boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
  fontFamily:'DM Sans,sans-serif',
}

const modalHeader = {
  padding:'18px 22px',
  borderBottom:'1px solid #eef0ff',
  display:'flex', alignItems:'center', justifyContent:'space-between',
  gap:12,
}

const closeBtn = {
  width:34, height:34, borderRadius:9,
  background:'#f1f5f9', border:'none', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  color:'#64748b', flexShrink:0,
}

const iconBoxStyle = (color) => ({
  width:40, height:40, borderRadius:11,
  background:`linear-gradient(135deg,${color},${color}CC)`,
  display:'flex', alignItems:'center', justifyContent:'center',
  flexShrink:0,
})

const statusBanner = (border, bg) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'10px 14px', background:bg,
  border:`1px solid ${border}40`,
  borderRadius:10, marginBottom:12,
})

const viewStats = {
  display:'flex', alignItems:'center', gap:8,
  padding:'8px 12px',
  background:'rgba(27,42,143,0.06)',
  borderRadius:9,
}

const inputLabel = {
  fontSize:11, fontWeight:800, color:'#6B7AAB',
  textTransform:'uppercase', letterSpacing:'0.05em',
  margin:'0 0 6px',
}

const urlInputStyle = {
  flex:1, padding:'10px 12px',
  border:'1.5px solid #eef0ff', borderRadius:10,
  fontFamily:'monospace', fontSize:12, color:'#0F1A5C',
  background:'#F8F9FF', outline:'none', minWidth:0,
}

const iconBtnStyle = (color) => ({
  width:42, height:42, borderRadius:10,
  background:color, color:'#fff', border:'none', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  flexShrink:0,
})

const codeContainer = {
  display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
  padding:'14px 14px',
  background:'linear-gradient(135deg, rgba(255,107,0,0.08), rgba(255,140,51,0.06))',
  border:'1.5px solid rgba(255,107,0,0.3)',
  borderRadius:12,
}

const codeDigit = {
  width:42, height:50,
  background:'#fff', border:'2px solid #FF6B00',
  borderRadius:9,
  display:'flex', alignItems:'center', justifyContent:'center',
  fontSize:22, fontWeight:900, color:'#FF6B00',
  fontFamily:'monospace',
  boxShadow:'0 2px 8px rgba(255,107,0,0.2)',
}

const waBtn = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
  padding:'12px', borderRadius:10, textDecoration:'none',
  background:'linear-gradient(135deg,#25D366,#1da851)',
  color:'#fff', fontWeight:800, fontSize:13,
  boxShadow:'0 4px 14px rgba(37,211,102,0.3)',
}

const previewBtn = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
  padding:'12px', borderRadius:10, textDecoration:'none',
  background:'linear-gradient(135deg,#1B2A8F,#2D3FBF)',
  color:'#fff', fontWeight:800, fontSize:13,
}

const secondaryBtnStyle = (color) => ({
  flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
  padding:'9px', borderRadius:9,
  background:'transparent', border:`1.5px solid ${color}40`,
  color, fontWeight:700, fontSize:11.5, cursor:'pointer',
})

const infoBox = (color) => ({
  display:'flex', gap:10, alignItems:'flex-start',
  padding:'12px 14px', borderRadius:10,
  background:`${color}08`, border:`1px solid ${color}25`,
  marginBottom:14,
})

const primaryBtnStyle = {
  width:'100%',
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'14px', borderRadius:11,
  background:'linear-gradient(135deg,#FF6B00,#FF8C33)',
  color:'#fff', border:'none', cursor:'pointer',
  fontWeight:800, fontSize:14,
  boxShadow:'0 4px 16px rgba(255,107,0,0.35)',
}

// ✅ Separe row — memo pou evite re-render tout tablo
const QuoteItemRow = memo(function QuoteItemRow({ item, showRate, exchangeRates, visibleCurrs }) {
  const lines = useMemo(
    () => showRate ? fmtConv(Number(item.totalHtg), exchangeRates, visibleCurrs) : null,
    [item.totalHtg, showRate, exchangeRates, visibleCurrs]
  )
  return (
    <tr>
      <td>
        <p className="font-medium">{item.product?.name || item.productSnapshot?.name}</p>
        <p className="text-xs text-slate-400 font-mono">{item.product?.code || item.productSnapshot?.code}</p>
      </td>
      <td className="text-center font-mono">{Number(item.quantity)}</td>
      <td className="text-right font-mono">{fmt(item.unitPriceHtg)} HTG</td>
      <td className="text-center text-slate-500">
        {Number(item.discountPct) > 0 ? `${item.discountPct}%` : '—'}
      </td>
      <td className="text-right">
        <span className="font-mono font-semibold">{fmt(item.totalHtg)} HTG</span>
        {lines && lines.map((line, j) => (
          <div key={j} style={{ fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>{line}</div>
        ))}
      </td>
    </tr>
  )
})