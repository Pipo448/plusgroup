// src/pages/invoices/InvoiceDetail.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { usePrinter } from '../../hooks/usePrinter'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, XCircle, CheckCircle2, Clock, Printer, Download, ChevronDown, Bluetooth, BluetoothOff } from 'lucide-react'
import { format } from 'date-fns'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const PAYMENT_METHODS = [
  { value:'cash',     label:'Kach'      },
  { value:'moncash',  label:'MonCash'   },
  { value:'natcash',  label:'NatCash'   },
  { value:'card',     label:'Kat Kredi' },
  { value:'transfer', label:'Virement'  },
  { value:'check',    label:'ChÃ¨k'      },
]

const PDF_SIZES = [
  { value: '80mm', label: '80mm', desc: 'Enprimant nÃ²mal (80Ã—80)' },
  { value: '57mm', label: '57mm', desc: 'Ti enprimant (57Ã—40)'    },
]

// â”€â”€ âœ… FIX: Logo se base64 dirÃ¨k nan DB â€” pa bezwen konvÃ¨syon
// Si se yon vye URL HTTP (ansyen logo), eseye konvÃ¨ti, sinon itilize dirÃ¨k
const toBase64 = (url) => new Promise((resolve) => {
  if (!url) return resolve(null)
  // Si deja base64 data URL â€” retounen dirÃ¨kteman
  if (url.startsWith('data:')) return resolve(url)
  // Ansyen logo HTTP â€” eseye konvÃ¨ti
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    } catch { resolve(url) }
  }
  img.onerror = () => resolve(null)
  img.src = url.includes('?') ? url : `${url}?t=${Date.now()}`
})

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Komponan resi enprime
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PrintableReceipt({ invoice, tenant, t, qrDataUrl, logoBase64, exchangeRates }) {
  if (!invoice) return null
  const snap        = invoice.clientSnapshot || {}
  const exchangeRates = (() => {
    try {
      const er = tenant?.exchangeRates
      if (!er) return {}
      if (typeof er === 'object') return er
      return JSON.parse(er)
    } catch(e) { return {} }
  })()
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const isPartial   = invoice.status === 'partial'

  // Trileng statut
  const statusLabel = isPaid
    ? 'PEYE / PAYÉ / PAID'
    : isCancelled
      ? 'ANILE / ANNULÉ / CANCELLED'
      : isPartial
        ? 'PASYAL / PARTIEL / PARTIAL'
        : 'IMPAYE / NON PAYÉ / UNPAID'

  const statusColor = isPaid ? '#16a34a' : isCancelled ? '#6b7280' : isPartial ? '#d97706' : '#dc2626'

  const lastPayment = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1]
    : null

  const receiptWidth = tenant?.receiptSize === '57mm' ? '57mm' : '80mm'

  // 3 deviz: HTG, USD, DOP
  const totalHtg = Number(invoice.totalHtg || 0)
  const paidHtg  = Number(invoice.amountPaidHtg || 0)
  const balHtg   = Number(invoice.balanceDueHtg || 0)

  const rateUSD = Number(exchangeRates?.USD || invoice.exchangeRate || 132)
  const rateDOP = Number(exchangeRates?.DOP || 0)

  const toUSD = (htg) => rateUSD > 0 ? (htg / rateUSD).toFixed(2) : null
  const toDOP = (htg) => rateDOP > 0 ? (htg / rateDOP).toFixed(2) : null

  return (
    <div id="printable-receipt" style={{
      display: 'none',
      fontFamily: "'Courier New', Courier, monospace",
      width: receiptWidth,
      maxWidth: receiptWidth,
      margin: '0 auto',
      padding: '3mm 3mm',
      background: '#fff',
      color: '#1a1a1a',
      fontSize: '10px',
      lineHeight: '1.4',
    }}>

      {/* ══ LOGO + NOM BIZNIS ══ */}
      <div style={{ textAlign: 'center', marginBottom: '5px', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>
        {logoBase64 && (
          <img
            src={logoBase64}
            alt="Logo"
            style={{ height: '36px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
          />
        )}
        <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: '900', fontSize: '13px', letterSpacing: '0.5px', color: '#111' }}>
          {tenant?.businessName || tenant?.name || 'PlusGroup'}
        </div>
        {tenant?.phone   && <div style={{ fontSize: '9px', color: '#555' }}>📞 {tenant.phone}</div>}
        {tenant?.address && <div style={{ fontSize: '9px', color: '#555' }}>{tenant.address}</div>}
      </div>

      {/* ══ TITRE TRILENG ══ */}
      <div style={{ textAlign: 'center', margin: '5px 0', fontFamily: 'Arial, sans-serif', fontWeight: '800', fontSize: '11px', letterSpacing: '1px', color: '#111', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
        Resi / Reçu / Receipt
      </div>

      {/* ══ INFO FAKTI ══ */}
      <div style={{ marginBottom: '5px', fontSize: '9px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>No. Fakti / Facture / Invoice:</span>
          <span style={{ fontWeight: '800', fontFamily: 'Arial', fontSize: '10px' }}>{invoice.invoiceNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Dat / Date:</span>
          <span>{format(new Date(invoice.issueDate), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>

      {/* ══ KLIYAN ══ */}
      {snap.name && (
        <div style={{ marginBottom: '5px', padding: '3px 5px', background: '#f8f8f8', borderRadius: '3px', fontSize: '9px', borderLeft: '2px solid #ccc' }}>
          <div style={{ fontWeight: '700', fontSize: '10px' }}>
            👤 Kliyan / Client: {snap.name}
          </div>
          {snap.phone && <div>Tel: {snap.phone}</div>}
          {snap.email && <div>{snap.email}</div>}
          {snap.nif   && <div>NIF: {snap.nif}</div>}
        </div>
      )}

      <div style={{ borderTop: '1px dashed #aaa', margin: '5px 0' }} />

      {/* ══ TABLO ATIK ══ */}
      <div style={{ fontSize: '9px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginBottom: '3px', paddingBottom: '2px', borderBottom: '1px solid #ddd', fontSize: '8px' }}>
          <span style={{ flex: 3 }}>Pwodui / Produit / Product</span>
          <span style={{ flex: 1, textAlign: 'center' }}>Qte</span>
          <span style={{ flex: 2, textAlign: 'right' }}>Pri/Prix (HTG)</span>
          <span style={{ flex: 2, textAlign: 'right' }}>Total HTG</span>
        </div>
        {invoice.items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dotted #eee' }}>
            <div style={{ flex: 3 }}>
              <div style={{ fontWeight: '600' }}>{item.product?.name || item.productSnapshot?.name}</div>
              {Number(item.discountPct) > 0 && (
                <div style={{ color: '#dc2626', fontSize: '8px' }}>
                  Remiz/Remise/Disc.: {item.discountPct}%
                </div>
              )}
            </div>
            <span style={{ flex: 1, textAlign: 'center' }}>{Number(item.quantity)}</span>
            <span style={{ flex: 2, textAlign: 'right' }}>{fmt(item.unitPriceHtg)}</span>
            <span style={{ flex: 2, textAlign: 'right', fontWeight: '700' }}>{fmt(item.totalHtg)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #aaa', margin: '5px 0' }} />

      {/* ══ TOTAUX ══ */}
      <div style={{ fontSize: '9px', marginBottom: '5px' }}>
        {Number(invoice.discountHtg) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '2px' }}>
            <span>Remiz / Remise / Discount:</span>
            <span>-{fmt(invoice.discountHtg)} HTG</span>
          </div>
        )}
        {Number(invoice.taxHtg) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Taks / Taxe / Tax ({Number(invoice.taxRate || 0)}%):</span>
            <span>{fmt(invoice.taxHtg)} HTG</span>
          </div>
        )}

        {/* TOTAL nan 3 deviz */}
        <div style={{ borderTop: '2px solid #111', marginTop: '4px', paddingTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '12px', fontFamily: 'Arial' }}>
            <span>TOTAL:</span>
            <span>{fmt(totalHtg)} HTG</span>
          </div>
          {toUSD(totalHtg) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '2px' }}>
              <span>≈ USD:</span>
              <span>{toUSD(totalHtg)} $</span>
            </div>
          )}
          {toDOP(totalHtg) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '1px' }}>
              <span>≈ DOP:</span>
              <span>RD$ {toDOP(totalHtg)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ══ PEMAN ══ */}
      <div style={{ fontSize: '9px', marginBottom: '5px', padding: '4px 6px', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#555' }}>Peye / Payé / Paid:</span>
          <span style={{ fontWeight: '700', color: '#16a34a' }}>{fmt(paidHtg)} HTG</span>
        </div>
        {balHtg > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555' }}>Balans / Solde / Balance:</span>
            <span style={{ fontWeight: '800', color: '#dc2626' }}>{fmt(balHtg)} HTG</span>
          </div>
        )}
        {lastPayment && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ color: '#555' }}>Metòd / Mode / Method:</span>
            <span style={{ fontWeight: '600', textTransform: 'uppercase' }}>{lastPayment.method}</span>
          </div>
        )}
        {lastPayment?.reference && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555' }}>Ref:</span>
            <span>{lastPayment.reference}</span>
          </div>
        )}
      </div>

      {/* ══ STATUT BADGE ══ */}
      <div style={{ textAlign: 'center', margin: '6px 0', padding: '5px', background: `${statusColor}15`, border: `1.5px solid ${statusColor}`, borderRadius: '5px' }}>
        <span style={{ fontWeight: '900', fontSize: '11px', color: statusColor, fontFamily: 'Arial' }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ borderTop: '1px dashed #aaa', margin: '6px 0' }} />

      {/* ══ QR CODE ══ */}
      {qrDataUrl && (
        <div style={{ textAlign: 'center', marginBottom: '5px' }}>
          <img src={qrDataUrl} alt="QR Code" style={{ width: '90px', height: '90px', display: 'block', margin: '0 auto 3px' }} />
          <div style={{ fontSize: '8px', color: '#888' }}>Skane / Scanner / Scan to verify</div>
          <div style={{ fontSize: '8px', color: '#aaa', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</div>
        </div>
      )}

      {/* ══ PYE PAJ ══ */}
      <div style={{ textAlign: 'center', fontSize: '9px', borderTop: '1px dashed #ccc', paddingTop: '5px' }}>
        <div style={{ fontWeight: '700', fontSize: '10px', marginBottom: '2px' }}>
          Mesi! / Merci! / Thank you!
        </div>
        <div style={{ color: '#666', fontSize: '8px', lineHeight: '1.4' }}>
          Vant final. / Vente finale. / All sales are final.
        </div>
        <div style={{ marginTop: '5px', fontSize: '8px', color: '#bbb' }}>
          Powered by PlusGroup Tél: +50942449024
        </div>
      </div>
    </div>
  )
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// KOMPONAN PRENSIPAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function InvoiceDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { hasRole, tenant } = useAuthStore()
  const qc          = useQueryClient()
  const pdfMenuRef  = useRef(null)
  const { t, i18n } = useTranslation()

  const [showPayment, setShowPayment]   = useState(false)
  const [showPdfMenu, setShowPdfMenu]   = useState(false)
  const [qrDataUrl, setQrDataUrl]       = useState(null)
  const [logoBase64, setLogoBase64]     = useState(null)
  const [payData, setPayData] = useState({ amountHtg: '', method: 'cash', reference: '' })

  const { connected, connecting, printing, connect, disconnect, print } = usePrinter()
  const hasBluetooth = typeof navigator !== 'undefined' && !!navigator.bluetooth

  useEffect(() => {
    const handler = (e) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target))
        setShowPdfMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn:  () => invoiceAPI.getOne(id).then(r => r.data.invoice)
  })

  // âœ… FIX: Si deja base64 data URL â€” itilize dirÃ¨kteman
  useEffect(() => {
    const url = tenant?.logoUrl
    if (!url) { setLogoBase64(null); return }
    // base64 data URL â€” pa bezwen konvÃ¨syon ditou
    if (url.startsWith('data:')) { setLogoBase64(url); return }
    // URL HTTP â€” eseye konvÃ¨ti
    toBase64(url).then(b64 => setLogoBase64(b64 || null))
  }, [tenant?.logoUrl])

  useEffect(() => {
    if (!invoice) return
    const qrContent = [
      invoice.invoiceNumber,
      `Total: ${fmt(invoice.totalHtg)} HTG`,
      `Status: ${invoice.status}`,
      `Date: ${format(new Date(invoice.issueDate), 'dd/MM/yyyy')}`,
      window.location.href,
    ].join('\n')

    QRCode.toDataURL(qrContent, { width: 200, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR Code error:', err))
  }, [invoice])

  const handlePrint = async () => {
    const receiptEl = document.getElementById('printable-receipt')
    if (!receiptEl) { toast.error('Resi pa disponib.'); return }

    const receiptSize = tenant?.receiptSize || '80mm'
    const receiptHTML = receiptEl.outerHTML.replace('display: none', 'display: block')

    const printWindow = window.open('', '_blank', 'width=340,height=600,scrollbars=no')
    if (!printWindow) {
      toast.error('NavigatÃ¨ bloke popup. PÃ¨mÃ¨t popup pou sit sa.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Resi ${invoice?.invoiceNumber || ''}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #fff; font-family: 'Courier New', Courier, monospace; }
          @media print {
            @page { margin: 0; size: ${receiptSize} auto; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>${receiptHTML}</body>
      </html>
    `)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        setTimeout(() => printWindow.close(), 1000)
      }, 200)
    }
  }

  const paymentMutation = useMutation({
    mutationFn: (data) => invoiceAPI.addPayment(id, data),
    onSuccess: () => {
      toast.success('Peman anrejistre!')
      qc.invalidateQueries(['invoice', id])
      setShowPayment(false)
      setPayData({ amountHtg: '', method: 'cash', reference: '' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'ErÃ¨ pandan peman.')
  })

  const cancelMutation = useMutation({
    mutationFn: (reason) => invoiceAPI.cancel(id, { reason }),
    onSuccess: () => { toast.success('Facture anile.'); qc.invalidateQueries(['invoice', id]) }
  })

  const openPaymentModal = () => {
    const bal = Number(invoice?.balanceDueHtg || 0)
    setPayData({ amountHtg: bal > 0 ? String(bal) : '', method: 'cash', reference: '' })
    setShowPayment(true)
  }

  const downloadPdf = async (size) => {
    setShowPdfMenu(false)
    const toastId = toast.loading(`Ap prepare PDF ${size}...`)
    try {
      const res = await invoiceAPI.downloadPDF(invoice.id, size)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `facture-${invoice.invoiceNumber}-${size}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`PDF ${size} telechaje!`, { id: toastId })
    } catch {
      toast.error('ErÃ¨ pandan telechajman PDF.', { id: toastId })
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!invoice)  return null

  const snap        = invoice.clientSnapshot || {}
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const balance     = Number(invoice.balanceDueHtg || 0)
  const amtNum      = Number(payData.amountHtg || 0)
  const monnen      = amtNum > balance && balance > 0 ? amtNum - balance : 0

  return (
    <div className="animate-fade-in max-w-4xl">

      {/* Resi Enprime (kachÃ© nan ekran) */}
      <PrintableReceipt invoice={invoice} tenant={tenant} t={t} qrDataUrl={qrDataUrl} logoBase64={logoBase64} exchangeRates={exchangeRates} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/invoices')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold">{invoice.invoiceNumber}</h1>
              <span className={`badge ${isPaid ? 'badge-green' : isCancelled ? 'badge-gray' : invoice.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
                {isPaid ? 'âœ“ Peye' : isCancelled ? 'Anile' : invoice.status === 'partial' ? 'Pasyal' : 'Impaye'}
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Soti devis:{' '}
              <Link to={`/app/quotes/${invoice.quoteId}`} className="text-brand-600 hover:underline">
                {invoice.quote?.quoteNumber}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} />
            Enprime Resi
          </button>

          {hasBluetooth && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {!connected ? (
                <button onClick={connect} disabled={connecting} className="btn-secondary btn-sm"
                  style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Bluetooth size={14} />
                  {connecting ? 'Ap konekte...' : 'Konekte Printer'}
                </button>
              ) : (
                <>
                  <button onClick={() => print(invoice, tenant)} disabled={printing}
                    className="btn-secondary btn-sm"
                    style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(5,150,105,0.08)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>
                    <Printer size={14} />
                    {printing ? 'Ap enprime...' : 'Enprime BT'}
                  </button>
                  <button onClick={disconnect} title="Dekonekte printer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'rgba(192,57,43,0.07)', border:'1px solid rgba(192,57,43,0.2)', color:'#C0392B', cursor:'pointer' }}>
                    <BluetoothOff size={13}/>
                  </button>
                </>
              )}
            </div>
          )}

          <div className="relative" ref={pdfMenuRef}>
            <button onClick={() => setShowPdfMenu(v => !v)} className="btn-secondary btn-sm"
              style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Download size={14} />
              Resi PDF
              <ChevronDown size={12} style={{ transition:'transform 0.2s', transform: showPdfMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {showPdfMenu && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:50, background:'#fff', borderRadius:12, minWidth:210, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  FÃ²ma enprimant
                </div>
                {PDF_SIZES.map((s, i) => (
                  <button key={s.value} onClick={() => downloadPdf(s.value)}
                    style={{ width:'100%', textAlign:'left', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', borderBottom: i < PDF_SIZES.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', fontFamily:'DM Sans,sans-serif' }}>ðŸ–¨ {s.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isCancelled && !isPaid && hasRole(['admin','cashier']) && (
            <button onClick={openPaymentModal} className="btn-primary">
              <Plus size={16} /> Anrejistre Peman
            </button>
          )}
          {!isCancelled && hasRole('admin') && (
            <button onClick={() => {
              const reason = prompt('Rezon anilasyon:')
              if (reason !== null) cancelMutation.mutate(reason)
            }} className="btn-danger btn-sm">
              <XCircle size={14} /> Anile
            </button>
          )}
        </div>
      </div>

      {connected && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'rgba(5,150,105,0.07)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:10, marginBottom:16, fontSize:12, color:'#059669', fontWeight:600 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#059669', animation:'pulse-dot 1.5s infinite' }}/>
          Goojprt PT-210 konekte via Bluetooth â€” Klike "Enprime BT" pou voye resi bay printer a
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          <div className="card p-5">
            <h3 className="section-title">Kliyan</h3>
            {snap.name
              ? <div>
                  <p className="font-semibold text-slate-800">{snap.name}</p>
                  {snap.phone && <p className="text-sm text-slate-500">{snap.phone}</p>}
                  {snap.email && <p className="text-sm text-slate-500">{snap.email}</p>}
                  {snap.nif   && <p className="text-xs text-slate-400">NIF: {snap.nif}</p>}
                </div>
              : <p className="text-slate-400 italic">San kliyan</p>
            }
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">Atik yo</h3>
            </div>
            <table className="table">
              <thead>
                <tr><th>Pwodui</th><th className="text-center">Qte</th><th className="text-right">Pri U.</th><th className="text-center">Rem.</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{item.product?.name || item.productSnapshot?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{item.product?.code || item.productSnapshot?.code}</p>
                    </td>
                    <td className="text-center font-mono">{Number(item.quantity)}</td>
                    <td className="text-right font-mono">{fmt(item.unitPriceHtg)}</td>
                    <td className="text-center text-slate-500">{Number(item.discountPct) > 0 ? `${item.discountPct}%` : 'â€”'}</td>
                    <td className="text-right font-mono font-semibold">{fmt(item.totalHtg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invoice.payments?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-display font-bold text-slate-800">Istwa Peman ({invoice.payments.length})</h3>
              </div>
              <table className="table">
                <thead><tr><th>Dat</th><th>MetÃ²d</th><th>Referans</th><th className="text-right">Montan HTG</th></tr></thead>
                <tbody>
                  {invoice.payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs text-slate-500">{format(new Date(p.paymentDate), 'dd/MM/yyyy')}</td>
                      <td><span className="badge-blue">{PAYMENT_METHODS.find(m=>m.value===p.method)?.label || p.method}</span></td>
                      <td className="text-xs text-slate-400 font-mono">{p.reference || 'â€”'}</td>
                      <td className="text-right font-mono font-semibold text-emerald-600">{fmt(p.amountHtg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-bold text-slate-800 mb-4">Totaux</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span className="font-mono">{fmt(invoice.subtotalHtg)}</span></div>
              {Number(invoice.discountHtg) > 0 && <div className="flex justify-between text-red-600"><span>Remiz</span><span className="font-mono">-{fmt(invoice.discountHtg)}</span></div>}
              {Number(invoice.taxHtg) > 0 && <div className="flex justify-between"><span>TVA</span><span className="font-mono">{fmt(invoice.taxHtg)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
                <span>TOTAL</span><span className="font-mono text-brand-700">{fmt(invoice.totalHtg)} HTG</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Peye</span>
                <span className="font-mono font-semibold">{fmt(invoice.amountPaidHtg)} HTG</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-red-600">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> Balans</span>
                  <span className="font-mono font-bold">{fmt(balance)} HTG</span>
                </div>
              )}
            </div>
            {!isCancelled && Number(invoice.totalHtg) > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (Number(invoice.amountPaidHtg)/Number(invoice.totalHtg))*100)}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {((Number(invoice.amountPaidHtg)/Number(invoice.totalHtg))*100).toFixed(0)}% peye
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between"><span>Dat:</span><span>{format(new Date(invoice.issueDate), 'dd/MM/yyyy')}</span></div>
            </div>

            {connected && (
              <button onClick={() => print(invoice, tenant)} disabled={printing}
                className="btn-primary w-full mt-4" style={{ justifyContent:'center' }}>
                <Printer size={15}/>
                {printing ? 'Ap enprime...' : 'Enprime Resi Bluetooth'}
              </button>
            )}

            {qrDataUrl && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>QR Verifikasyon</p>
                <img src={qrDataUrl} alt="QR Code" style={{ width: 90, height: 90, margin: '0 auto', display: 'block', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <p style={{ fontSize: 9, color: '#cbd5e1', marginTop: 4 }}>{invoice.invoiceNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div className="modal max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-display font-bold">Anrejistre Peman</h2>
                <p className="text-xs text-slate-400 mt-0.5">{invoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600 p-1 text-xl leading-none">âœ•</button>
            </div>

            <div className="p-5 space-y-4">
              <div style={{ background:'linear-gradient(135deg,#fef2f2,#fff5f5)', borderRadius:12, padding:'12px 16px', border:'1px solid #fecaca' }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>Total Fakti:</span>
                  <span style={{ fontFamily:'monospace', fontWeight:700, color:'#374151' }}>{fmt(invoice.totalHtg)} HTG</span>
                </div>
                {Number(invoice.amountPaidHtg) > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span style={{ fontSize:12, color:'#6b7280' }}>Deja peye:</span>
                    <span style={{ fontFamily:'monospace', color:'#16a34a', fontWeight:600 }}>-{fmt(invoice.amountPaidHtg)} HTG</span>
                  </div>
                )}
                <div style={{ borderTop:'1px solid #fecaca', marginTop:8, paddingTop:8 }} className="flex justify-between items-center">
                  <span style={{ fontSize:13, color:'#dc2626', fontWeight:700 }}>Balans ki rete:</span>
                  <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:800, color:'#dc2626' }}>{fmt(balance)} HTG</span>
                </div>
              </div>

              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <label className="label mb-0">Montan kliyan bay (HTG) *</label>
                  {amtNum !== balance && balance > 0 && (
                    <button type="button"
                      onClick={() => setPayData(d => ({ ...d, amountHtg: String(balance) }))}
                      style={{ fontSize:10, color:'#2563eb', fontWeight:700, background:'#eff6ff', border:'none', cursor:'pointer', padding:'2px 8px', borderRadius:4 }}>
                      Ranpli tout â†‘
                    </button>
                  )}
                </div>
                <input type="number" step="0.01" min="0.01" className="input"
                  value={payData.amountHtg}
                  onFocus={e => e.target.select()}
                  onChange={e => setPayData(d => ({ ...d, amountHtg: e.target.value }))}
                  style={{ fontSize:22, fontWeight:800, textAlign:'center' }}
                />

                {amtNum > 0 && amtNum < balance && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#d97706', fontWeight:700 }}>âš  Peman pasyal</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#d97706' }}>{fmt(balance - amtNum)} HTG ap rete</span>
                  </div>
                )}

                {amtNum === balance && amtNum > 0 && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#16a34a', fontWeight:700 }}>âœ“ Peman egzak</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#16a34a' }}>Pa gen monnen</span>
                  </div>
                )}

                {monnen > 0 && (
                  <div style={{ marginTop:8, borderRadius:12, overflow:'hidden', border:'2px solid #16a34a' }}>
                    <div style={{ background:'#16a34a', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        ðŸ’µ Monnen pou remet
                      </span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontFamily:'monospace' }}>
                        {fmt(amtNum)} âˆ’ {fmt(balance)}
                      </span>
                    </div>
                    <div style={{ background:'#f0fdf4', padding:'14px', textAlign:'center' }}>
                      <p style={{ fontFamily:'monospace', fontSize:36, fontWeight:900, color:'#15803d', margin:0 }}>
                        {fmt(monnen)} <span style={{ fontSize:18, color:'#16a34a' }}>HTG</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label">MetÃ²d peman</label>
                <select className="input" value={payData.method} onChange={e => setPayData(d => ({ ...d, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Referans (opsyonÃ¨l)</label>
                <input className="input" placeholder="ex: MCash #12345"
                  value={payData.reference}
                  onChange={e => setPayData(d => ({ ...d, reference: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary" disabled={paymentMutation.isPending}>
                  Anile
                </button>
                <button type="button"
                  onClick={() => {
                    if (!amtNum || amtNum <= 0) return toast.error('Montan dwe plis ke 0.')
                    const amtToRecord = monnen > 0 ? balance : amtNum
                    paymentMutation.mutate({ ...payData, amountHtg: amtToRecord })
                  }}
                  disabled={paymentMutation.isPending || amtNum <= 0}
                  className="btn-primary"
                  style={{ minWidth:160 }}
                >
                  {paymentMutation.isPending
                    ? <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                        Ap anrejistre...
                      </span>
                    : monnen > 0
                      ? `âœ“ Konfime ${fmt(balance)} HTG`
                      : `âœ“ Konfime ${fmt(amtNum)} HTG`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
