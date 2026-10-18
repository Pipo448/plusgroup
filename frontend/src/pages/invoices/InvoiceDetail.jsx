// src/pages/invoices/InvoiceDetail.jsx — Plus Fit redesign
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { invoiceAPI } from '../../services/api'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { usePrinterStore } from '../../stores/printerStore'
import { isAndroid, isSunmi } from '../../services/printerService'
// ✅ NOUVO — HTML/Windows driver printing pou RP327 USB
import { printInvoiceHTML } from '../../services/printReceiptHTML'
// ✅ NOUVO — Enprime native (Bluetooth/Sunmi/iMin/Telpo) pou APK Android
import { printInvoiceNative, isNativePrinterAvailable } from '../../services/printerNative'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, XCircle, CheckCircle, Clock, Printer, Download, ChevronDown, Bluetooth, BluetoothOff,
  Share2, Copy, Check, MessageCircle, X, RefreshCw, Receipt, User, Phone, Calendar, Package,
  Banknote, Smartphone, Wallet, CreditCard, ArrowLeftRight, FileText, RotateCcw, AlertCircle, Link2,
} from 'lucide-react'
import { format } from 'date-fns'
import './invoices.css'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PAYMENT_METHODS = [
  { value:'cash',     label:'Kach',      Icon: Banknote,       color:'#059669' },
  { value:'moncash',  label:'MonCash',   Icon: Smartphone,     color:'#DC2626' },
  { value:'natcash',  label:'NatCash',   Icon: Wallet,         color:'#FF6B00' },
  { value:'card',     label:'Kat Kredi', Icon: CreditCard,     color:'#7C3AED' },
  { value:'transfer', label:'Virement',  Icon: ArrowLeftRight, color:'#0284C7' },
  { value:'check',    label:'Chek',      Icon: FileText,       color:'#475569' },
  { value:'credit',   label:'Kredi',     Icon: Clock,          color:'#1B2A8F' },
]

// ✅ Estati fakti (koulè + etikèt)
const STATUS = {
  paid:      { label:'Peye',    color:'#34D399', ink:'#059669', Icon: CheckCircle },
  partial:   { label:'Depo',    color:'#FBBF24', ink:'#D97706', Icon: Clock },
  unpaid:    { label:'Pa peye', color:'#F87171', ink:'#DC2626', Icon: AlertCircle },
  cancelled: { label:'Anile',   color:'#CBD5E1', ink:'#64748B', Icon: XCircle },
  refunded:  { label:'Remèt',   color:'#93C5FD', ink:'#2D3FBF', Icon: RotateCcw },
}

// ✅ Chif ki konte jiska valè a
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

function Kpi({ label, value, icon: Icon, tone = '', delay = 0 }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{Number(v).toLocaleString('fr-HT', { maximumFractionDigits: 0 })}<small>HTG</small></div>
    </div>
  )
}

const PDF_SIZES = [
  { value: '80mm', label: '80mm', desc: 'Enprimant normal (80x80)' },
  { value: '57mm', label: '57mm', desc: 'Ti enprimant (57x40)'    },
]

const toBase64 = (url) => new Promise((resolve) => {
  if (!url) return resolve(null)
  if (url.startsWith('data:')) return resolve(url)
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

const toHaitiDate = (dateStr, fmt2) => {
  try {
    return format(
      new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/Port-au-Prince' })),
      fmt2
    )
  } catch { return '' }
}

const loadPdfLibs = async () => {
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      s.onload = resolve
      s.onerror = () => reject(new Error('html2canvas pa chaje'))
      document.head.appendChild(s)
    })
  }
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      s.onload = resolve
      s.onerror = () => reject(new Error('jsPDF pa chaje'))
      document.head.appendChild(s)
    })
  }
}

function PrintableReceipt({ invoice, tenant, t, qrDataUrl, logoBase64, showQrCode }) {
  if (!invoice) return null

  const snap        = invoice.clientSnapshot || {}
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const isPartial   = invoice.status === 'partial'

  const exchangeRates = (() => {
    try {
      const er = tenant?.exchangeRates
      if (!er) return {}
      if (typeof er === 'object') return er
      return JSON.parse(String(er))
    } catch { return {} }
  })()

  const receiptWidth = tenant?.receiptSize === '57mm' ? '57mm' : '80mm'
  const is57         = receiptWidth === '57mm'
  const PW           = is57 ? '57mm' : '80mm'

  const totalHtg = Number(invoice.totalHtg || 0)
  const paidHtg  = Number(invoice.amountPaidHtg || 0)
  const balHtg   = Number(invoice.balanceDueHtg || 0)
  const rateUSD  = Number(exchangeRates.USD || invoice.exchangeRate || 132)
  const rateDOP  = Number(exchangeRates.DOP || 0)
  const toUSD    = (n) => rateUSD > 0 ? (n / rateUSD).toFixed(2) : null
  const toDOP    = (n) => rateDOP > 0 ? (n / rateDOP).toFixed(2) : null

  const lastPay     = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1] : null

  const amountGiven = Number(lastPay?.amountGiven || 0)
  const change      = Number(lastPay?.change || 0)
  const dueDate     = lastPay?.dueDate || invoice.dueDate || null
  const isCredit    = lastPay?.method === 'credit'

  const METOD_LABEL = {
    cash:'Kach', moncash:'MonCash', natcash:'NatCash',
    card:'Kat kredi', transfer:'Virement', check:'Chèk',
    credit:'Kredi', other:'Lòt',
  }

  const statusLabel =
    isPaid      ? 'TOTAL PEYE' :
    isCancelled ? 'ANILE'      :
    isCredit    ? 'KREDI'      :
    isPartial   ? 'PASYEL'     : 'IMPAYE'

  const statusColor =
    isPaid      ? '#111'    :
    isCancelled ? '#888'    :
    isCredit || isPartial ? '#d97706' : '#dc2626'

  const fmtR = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const bizName = tenant?.businessName || tenant?.name || 'PLUS GROUP'

  // ── Tèks footer konfigirab ──────────────────────────────────
  const thankYouMsg  = tenant?.receiptThankYou   || 'Mèsi paske ou achte lakay nou!'
  const footerNote   = tenant?.receiptFooterNote || null

  const S = {
    wrap: {
      fontFamily: "'Courier New', Courier, monospace",
      width: PW, maxWidth: PW, margin: '0 auto',
      padding: is57 ? '3mm 2mm' : '4mm 4mm',
      background: '#fff', color: '#111',
      fontSize: is57 ? '10px' : '11px',
      lineHeight: '1.4',
    },
    center:  { textAlign: 'center' },
    bold:    { fontWeight: '700' },
    small:   { fontSize: is57 ? '9px' : '10px', color: '#555' },
    hr:      { borderTop: '1px solid #111', margin: '3px 0', border: 'none', borderTopStyle: 'solid', borderTopWidth: 1, borderTopColor:'#111' },
    dash:    { borderTop: '1px dashed #888', margin: '3px 0', border: 'none', borderTopStyle: 'dashed', borderTopWidth: 1, borderTopColor:'#888' },
  }

  const Row2 = ({ label, value, bold, color, large }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontWeight: bold ? '700' : '400',
      color: color || '#111',
      fontSize: large ? (is57 ? '12px' : '13px') : 'inherit',
      marginBottom: '1px',
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )

  const HR   = () => <div style={S.hr}   />
  const DASH = () => <div style={S.dash} />

  return (
    <div id="printable-receipt" style={{ display:'none', ...S.wrap }}>

      {/* ════ ANTÈT ════ */}
      <div style={S.center}>
        {logoBase64 && (
          <img src={logoBase64} alt="" style={{
            height: is57 ? '28px' : '38px', maxWidth:'100%',
            display:'block', margin:'0 auto 2px', objectFit:'contain',
          }} />
        )}
        <div style={{ fontWeight:'900', fontSize: is57 ? '14px' : '17px', letterSpacing:'1px' }}>
          {bizName}
        </div>
        {tenant?.tagline  && <div style={S.small}>{tenant.tagline}</div>}
        {tenant?.address  && <div style={S.small}>{tenant.address}</div>}
        {tenant?.phone    && <div style={S.small}>Tel: {tenant.phone}</div>}
      </div>

      <HR/>

      {/* ════ INFO RESI ════ */}
      <div style={{ fontSize: is57 ? '9px' : '10px', marginBottom:'2px' }}>
        <Row2 label="Dat:"     value={toHaitiDate(invoice.issueDate, 'dd/MM/yyyy')} />
        <Row2 label="Resi N°:" value={invoice.invoiceNumber} bold />
        {snap.name  && <Row2 label="Kliyan:" value={snap.name} />}
        {snap.phone && <Row2 label="Tel:"    value={snap.phone} />}
        {!is57      && <Row2 label="Kasye:"  value={invoice.cashierName || invoice.createdByName || 'Admin'} />}
        {snap.nif   && <Row2 label="NIF:"    value={snap.nif} />}
      </div>

      <DASH/>

      {/* ════ ATIK YO ════ */}
      <div style={{ marginBottom:'2px' }}>
        <div style={{
          display:'grid',
          gridTemplateColumns: is57 ? '1fr 18px 44px 44px' : '1fr 22px 52px 52px',
          fontSize: is57 ? '9px' : '10px',
          fontWeight:'700',
          borderBottom:'1px solid #111',
          paddingBottom:'2px',
          marginBottom:'2px',
          gap:'2px',
        }}>
          <span>Pwodwi</span>
          <span style={{ textAlign:'right' }}>Q</span>
          <span style={{ textAlign:'right' }}>Pri</span>
          <span style={{ textAlign:'right' }}>Total</span>
        </div>

        {invoice.items?.map((item, i) => {
          const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
          return (
            <div key={i} style={{
              display:'grid',
              gridTemplateColumns: is57 ? '1fr 18px 44px 44px' : '1fr 22px 52px 52px',
              fontSize: is57 ? '9px' : '10px',
              borderBottom:'1px dotted #ccc',
              padding:'1px 0',
              gap:'2px',
              alignItems:'baseline',
            }}>
              <span style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {nom}
              </span>
              <span style={{ textAlign:'right' }}>{Number(item.quantity)}</span>
              <span style={{ textAlign:'right' }}>{fmtR(item.unitPriceHtg)}</span>
              <span style={{ textAlign:'right', fontWeight:'700' }}>{fmtR(item.totalHtg)}</span>
            </div>
          )
        })}
      </div>

      <DASH/>

      {/* ════ REMIZ + TAKS ════ */}
      {(Number(invoice.discountHtg) > 0 || Number(invoice.taxHtg) > 0) && (
        <div style={{ fontSize: is57 ? '9px' : '10px', marginBottom:'2px' }}>
          {Number(invoice.discountHtg) > 0 && (
            <Row2 label="Remiz:" value={`-${fmtR(invoice.discountHtg)} G`} color="#dc2626" />
          )}
          {Number(invoice.taxHtg) > 0 && (
            <Row2 label={`Taks (${Number(invoice.taxRate||0)}%):`} value={`${fmtR(invoice.taxHtg)} G`} />
          )}
          <DASH/>
        </div>
      )}

      {/* ════ TOTAL ════ */}
      <div style={{ marginBottom:'2px' }}>
        <Row2
          label="TOTAL:"
          value={`${fmtR(totalHtg)} G`}
          bold large
        />
        {(toUSD(totalHtg) || toDOP(totalHtg)) && (
          <div style={{ textAlign:'right', fontSize:'9px', color:'#666', marginBottom:'1px' }}>
            {toUSD(totalHtg) && <span>≈ ${toUSD(totalHtg)} USD</span>}
            {toUSD(totalHtg) && toDOP(totalHtg) && <span>  </span>}
            {toDOP(totalHtg) && <span>≈ RD${toDOP(totalHtg)} DOP</span>}
          </div>
        )}
      </div>

      <DASH/>

      {/* ════ PEMAN ════ */}
      <div style={{ fontSize: is57 ? '9px' : '10px', marginBottom:'2px' }}>
        {amountGiven > 0 && (
          <Row2 label="Kòb kliyan bay:" value={`${fmtR(amountGiven)} G`} bold />
        )}
        {change > 0 && (
          <Row2 label="Monnen remèt:" value={`${fmtR(change)} G`} bold />
        )}
        {paidHtg > 0 && (
          // ✅ KORIJE — "Depo peye" si pasyèl, "Kòb peye" si konplè
          <Row2
            label={balHtg > 0 ? "Depo peye:" : "Kòb peye:"}
            value={`${fmtR(paidHtg)} G`}
            bold
            color={balHtg > 0 ? "#16a34a" : undefined}
          />
        )}
        {lastPay?.method && (
          <Row2
            label="Metod:"
            value={METOD_LABEL[lastPay.method] || lastPay.method}
          />
        )}
        {lastPay?.reference && (
          <Row2 label="Ref:" value={lastPay.reference} />
        )}
        {balHtg > 0 && (
          <>
            <DASH/>
            <Row2
              label="Balans pou peye:"
              value={`-${fmtR(balHtg)} G${toUSD(balHtg) ? ` / -$${toUSD(balHtg)}` : ''}`}
              bold color="#dc2626"
            />
          </>
        )}
        {dueDate && balHtg > 0 && (
          <div style={{
            background:'rgba(217,119,6,0.08)',
            border:'1px dashed #d97706',
            borderRadius:3, padding:'2px 5px', marginTop:3,
            fontSize: is57 ? '9px' : '10px',
          }}>
            <Row2
              label="📅 Dat pou peye:"
              value={toHaitiDate(dueDate, 'dd/MM/yyyy')}
              bold color="#c47a00"
            />
          </div>
        )}
        {/* ✅ NOUVO — mesaj klè lè kliyan peye TOUT balans la */}
        {isPaid && paidHtg > 0 && (
          <div style={{
            background:'rgba(22,163,74,0.08)',
            border:'1px dashed #16a34a',
            borderRadius:3, padding:'3px 5px', marginTop:3,
            textAlign:'center',
            fontSize: is57 ? '10px' : '11px',
            fontWeight: 900, color:'#15803d',
          }}>
            ✓ KLIYAN AN PA DWE ANKÒ
          </div>
        )}
      </div>

      <HR/>

      {/* ════ STATUT FINAL ════ */}
      <div style={{
        display:'flex', justifyContent:'space-between',
        fontWeight:'900', fontSize: is57 ? '12px' : '14px',
        color: statusColor, margin:'3px 0',
      }}>
        <span>{statusLabel}:</span>
        <span>{fmtR(isPaid ? totalHtg : paidHtg > 0 ? paidHtg : totalHtg)} G</span>
      </div>

      <HR/>

      {/* ════ QR CODE ════ */}
      {showQrCode && qrDataUrl && (
        <div style={{ ...S.center, margin:'4px 0' }}>
          <img src={qrDataUrl} alt="QR" style={{
            width: is57 ? '58px' : '72px', height: is57 ? '58px' : '72px',
            display:'block', margin:'0 auto 2px',
          }}/>
          <div style={{ fontSize:'8px', color:'#aaa' }}>{invoice.invoiceNumber}</div>
        </div>
      )}

      {/* ════ PIE ════ */}
      <div style={{
        ...S.center,
        fontSize: is57 ? '8px' : '9px',
        color: '#444',
        lineHeight: '1.5',
        marginTop: '3px',
        borderTop: '1px dashed #bbb',
        paddingTop: '4px',
      }}>
        <div style={{ fontWeight:'700', fontSize: is57 ? '10px' : '11px', marginBottom:'2px' }}>
          {thankYouMsg}
        </div>
        {footerNote && (
          <div style={{ fontStyle:'italic', color:'#666', marginBottom:'3px' }}>
            {footerNote}
          </div>
        )}
        <div style={{ fontWeight:'600', color:'#333' }}>
          Pwodwi pa <strong>{bizName}</strong> · {tenant?.phone || '+509 4244-9024'}
        </div>
      </div>

    </div>
  )
}


export default function InvoiceDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { hasRole, tenant, user } = useAuthStore()
  const qc          = useQueryClient()
  // ✅ NOUVO — Pataje Fakti pa WhatsApp
  const [shareOpen, setShareOpen] = useState(false)
  const shareMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/share`),
    onSuccess:  () => { toast.success('Lyen pataj kreye!'); qc.invalidateQueries({ queryKey: ['invoice', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan kreye lyen.')
  })
  const revokeShareMutation = useMutation({
    mutationFn: () => api.delete(`/invoices/${id}/share`),
    onSuccess:  () => { toast.success('Lyen revoke.'); qc.invalidateQueries({ queryKey: ['invoice', id] }) },
    onError:    (e) => toast.error(e.response?.data?.message || 'Erè pandan revoke lyen.')
  })
  const pdfMenuRef  = useRef(null)
  const { t, i18n } = useTranslation()

  const [showPayment, setShowPayment] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [qrDataUrl, setQrDataUrl]     = useState(null)
  const [logoBase64, setLogoBase64]   = useState(null)
  const [printing, setPrinting]       = useState(false)
  // ✅ NOUVO — eta pou enprime native (Bluetooth/Sunmi/etc via plugin)
  const [printingNative, setPrintingNative] = useState(false)

  const [payData, setPayData] = useState({ amountHtg: '', method: 'cash', reference: '', dueDate: '' })

  const {
    connected,
    connecting,
    printing:   btPrinting,
    connect,
    disconnect,
    print,
    deviceName,
  } = usePrinterStore()

  const onSunmi    = isSunmi()
  const showQrCode = tenant?.showQrCode !== false

  const btSupported = (() => {
    try { return !onSunmi && typeof navigator !== 'undefined' && !!navigator.bluetooth }
    catch { return false }
  })()

  const printerConnection = tenant?.printerConnection || 'usb'
  const isUsbPrinter      = printerConnection === 'usb'

  const handleConnect = async () => {
    try {
      await connect()
    } catch (err) {
      console.error('BT connect wrapper error:', err)
      toast.error('Bluetooth echwe. Asire Chrome ak BT aktive.')
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target)) setShowPdfMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn:  () => invoiceAPI.getOne(id).then(r => r.data.invoice)
  })

  useEffect(() => {
    const url = tenant?.logoUrl
    if (!url) { setLogoBase64(null); return }
    if (url.startsWith('data:')) { setLogoBase64(url); return }
    toBase64(url).then(b64 => setLogoBase64(b64 || null))
  }, [tenant?.logoUrl])

  useEffect(() => {
    if (!invoice || !showQrCode) { setQrDataUrl(null); return }
    const qrContent = [
      invoice.invoiceNumber,
      `Total: ${fmt(invoice.totalHtg)} HTG`,
      `Status: ${invoice.status}`,
      `Date: ${toHaitiDate(invoice.issueDate, 'dd/MM/yyyy')}`,
      window.location.href,
    ].join('\n')
    QRCode.toDataURL(qrContent, { width: 200, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR Code error:', err))
  }, [invoice, showQrCode])

  const handlePrint = async () => {
    if (isUsbPrinter) {
      try {
        setPrinting(true)
        await printInvoiceHTML(invoice, tenant, user)
      } catch (err) {
        toast.error('Ere enpresyon: ' + err.message)
      } finally {
        setPrinting(false)
      }
      return
    }

    setPrinting(true)
    const toastId = toast.loading('Ap prepare resi...')
    try {
      const receiptEl = document.getElementById('printable-receipt')
      if (!receiptEl) throw new Error('Resi pa disponib')
      const receiptSize = tenant?.receiptSize || '80mm'
      const oldStyle = document.getElementById('_receipt_print_css')
      if (oldStyle) oldStyle.remove()
      const style = document.createElement('style')
      style.id = '_receipt_print_css'
      style.textContent = `
        @media print {
          @page { margin: 0; size: ${receiptSize} auto; }
          body > *:not(#_receipt_print_root) { display: none !important; }
          #_receipt_print_root { display: block !important; }
          #printable-receipt { display: block !important; }
        }
      `
      document.head.appendChild(style)
      let root = document.getElementById('_receipt_print_root')
      if (!root) {
        root = document.createElement('div')
        root.id = '_receipt_print_root'
        root.style.cssText = 'display:none;position:absolute;top:0;left:0;width:100%;background:#fff;'
        document.body.appendChild(root)
      }
      root.innerHTML = receiptEl.outerHTML.replace('display: none', 'display: block')
      await new Promise(r => setTimeout(r, 150))
      window.print()
      toast.success('Resi voye bay printer!', { id: toastId })
    } catch (err) {
      toast.error('Ere enpresyon: ' + err.message, { id: toastId })
    } finally {
      setPrinting(false)
    }
  }

  const handleSunmiPrint = () => {
    print(invoice, tenant, user)
  }

  // ✅ NOUVO — Enprime dirèkteman via plugin native (Bluetooth/Sunmi/iMin/Telpo)
  // Sa a mache SÈLMAN nan APK Capacitor — pa nan navigatè web
  const handlePrintNative = async (copies = 1) => {
    setPrintingNative(true)
    const toastId = toast.loading(copies > 1 ? `Ap voye ${copies} kopi bay enprimant...` : 'Ap voye resi bay enprimant...')
    try {
      await printInvoiceNative(invoice, tenant, user, copies)
      toast.success(copies > 1 ? `${copies} kopi enprime!` : 'Resi enprime!', { id: toastId })
    } catch (err) {
      toast.error('Erè enprime: ' + err.message, { id: toastId })
    } finally {
      setPrintingNative(false)
    }
  }

  const downloadPdf = async (size) => {
    setShowPdfMenu(false)
    const toastId = toast.loading(`Ap prepare PDF ${size}...`)
    try {
      await loadPdfLibs()
      const receiptEl = document.getElementById('printable-receipt')
      if (!receiptEl) throw new Error('Resi HTML pa trovab')
      const prevDisplay = receiptEl.style.display
      receiptEl.style.display = 'block'
      receiptEl.style.position = 'fixed'
      receiptEl.style.left = '-9999px'
      receiptEl.style.top = '0'
      const canvas = await window.html2canvas(receiptEl, {
        scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false,
      })
      receiptEl.style.display = prevDisplay
      receiptEl.style.position = ''
      receiptEl.style.left = ''
      receiptEl.style.top = ''
      const mmWidth  = size === '57mm' ? 57 : 80
      const mmHeight = (canvas.height / canvas.width) * mmWidth
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [mmWidth, mmHeight] })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, mmWidth, mmHeight)
      pdf.save(`facture-${invoice.invoiceNumber}-${size}.pdf`)
      toast.success(`PDF ${size} telechaje!`, { id: toastId })
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('Ere pandan jenere PDF. Eseye ankò.', { id: toastId })
    }
  }

  const paymentMutation = useMutation({
    mutationFn: (data) => invoiceAPI.addPayment(id, data),
    onSuccess: () => {
      toast.success('Peman anrejistre!')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setShowPayment(false)
      setPayData({ amountHtg: '', method: 'cash', reference: '', dueDate: '' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Ere pandan peman.')
  })

  const cancelMutation = useMutation({
    mutationFn: (reason) => invoiceAPI.cancel(id, { reason }),
    onSuccess: () => { toast.success('Facture anile.'); qc.invalidateQueries({ queryKey: ['invoice', id] }) }
  })

  const openPaymentModal = () => {
    const bal = Number(invoice?.balanceDueHtg || 0)
    setPayData({ amountHtg: bal > 0 ? String(bal) : '', method: 'cash', reference: '', dueDate: '' })
    setShowPayment(true)
  }

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
  if (!invoice)  return null

  const snap        = invoice.clientSnapshot || {}
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const balance     = Number(invoice.balanceDueHtg || 0)
  const amtNum      = Number(payData.amountHtg || 0)
  const monnen      = amtNum > balance && balance > 0 ? amtNum - balance : 0

  const st          = STATUS[invoice.status] || STATUS.unpaid
  const totalNum    = Number(invoice.totalHtg || 0)
  const paidNum     = Number(invoice.amountPaidHtg || 0)
  const paidPct     = totalNum > 0 ? Math.min(100, (paidNum / totalNum) * 100) : 0
  const canPay      = !isCancelled && !isPaid && hasRole(['admin','cashier'])
  const nativeOk    = isNativePrinterAvailable()
  const sortedPays  = [...(invoice.payments || [])].sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))

  // ✅ Bouton enprime selon anviwònman an (web USB / APK native / Sunmi / BT web)
  const PrintButtons = ({ big }) => (
    <>
      {!nativeOk && (
        <button onClick={handlePrint} disabled={printing} className={big ? 'iv-btn-main' : 'iv-act'} style={big ? { width: '100%', minHeight: 50 } : undefined}>
          {printing ? <RefreshCw size={15} className="spin"/> : <Printer size={15}/>}
          {printing ? 'Ap enprime...' : isUsbPrinter ? 'Enprime (USB)' : 'Enprime Resi'}
        </button>
      )}
      {nativeOk && (
        <>
          <button onClick={() => handlePrintNative(1)} disabled={printingNative} className={big ? 'iv-btn-main' : 'iv-act sky'} style={big ? { width: '100%', minHeight: 50 } : undefined}>
            {printingNative ? <RefreshCw size={15} className="spin"/> : <Bluetooth size={15}/>}
            {printingNative ? 'Ap enprime...' : 'Enprime (POS)'}
          </button>
          <button onClick={() => handlePrintNative(2)} disabled={printingNative} className="iv-act sky" title="Enprime 2 kopi (1 pou kliyan, 1 pou achiv)" style={big ? { width: '100%' } : undefined}>
            <Bluetooth size={15}/> {big ? 'Enprime 2 kopi' : '×2'}
          </button>
        </>
      )}
      {onSunmi && (
        <button onClick={handleSunmiPrint} disabled={btPrinting} className="iv-act green" style={big ? { width: '100%' } : undefined}>
          <Printer size={15}/> {btPrinting ? 'Ap enprime...' : 'Sunmi'}
        </button>
      )}
    </>
  )

  return (
    <div className="iv" style={{ maxWidth: 1240, paddingBottom: 80 }}>

      <PrintableReceipt
        invoice={invoice}
        tenant={tenant}
        t={t}
        qrDataUrl={qrDataUrl}
        logoBase64={logoBase64}
        showQrCode={showQrCode}
      />

      <style>{`
        @media print {
          @page { margin: 0; }
          #root > * { display: none !important; }
          #_receipt_print_root { display: block !important; }
          body, html { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* ══════════ HERO ══════════ */}
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>

        <div className="row">
          <button className="back" onClick={() => navigate('/app/invoices')} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico"><Receipt size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">Fakti</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{invoice.invoiceNumber}</h1>
              <span className="stamp" style={{ '--sc': st.color }}><i/> {st.label}</span>
            </div>
            <div className="meta-line">
              <span><User size={12}/> {snap.name || 'Vant kontwa'}</span>
              <span><Calendar size={12}/> {toHaitiDate(invoice.issueDate, 'dd/MM/yyyy HH:mm')}</span>
              {invoice.quoteId && (
                <span>Soti devi: <Link to={`/app/quotes/${invoice.quoteId}`}>{invoice.quote?.quoteNumber}</Link></span>
              )}
            </div>
          </div>
          {canPay && (
            <button onClick={openPaymentModal} className="iv-btn-main pulse">
              <Plus size={17}/> Anrejistre peman
            </button>
          )}
        </div>

        <div className="iv-kpis">
          <Kpi label="Total"  value={totalNum} icon={Receipt}     delay={80}/>
          <Kpi label={balance > 0 ? 'Depo peye' : 'Peye'} value={paidNum} icon={CheckCircle} delay={160} tone="green"/>
          <Kpi label="Balans" value={balance}  icon={AlertCircle} delay={240} tone={balance > 0 ? 'red' : ''}/>
        </div>

        {!isCancelled && totalNum > 0 && (
          <div className="iv-hero-prog">
            <div className="bar"><i style={{ width: `${paidPct}%` }}/></div>
            <div className="lbl"><span>{paidPct.toFixed(0)}% peye</span><span>{balance > 0 ? `${fmt(balance)} HTG rete` : '✓ Fini'}</span></div>
          </div>
        )}
      </section>

      {/* ══════════ AKSYON ══════════ */}
      <div className="iv-actions a-up" style={{ animationDelay: '100ms' }}>
        {PrintButtons({})}

        {btSupported && (
          !connected ? (
            <button onClick={handleConnect} disabled={connecting} className="iv-act">
              {connecting ? <RefreshCw size={15} className="spin"/> : <Bluetooth size={15}/>}
              {connecting ? 'Ap konekte...' : 'Konekte BT'}
            </button>
          ) : (
            <>
              <button onClick={() => { try { print(invoice, tenant, user) } catch { toast.error('Erè BT print') } }} disabled={btPrinting} className="iv-act green">
                <Printer size={15}/> {btPrinting ? 'Ap enprime...' : `BT${deviceName ? ` (${deviceName.slice(0, 10)})` : ''}`}
              </button>
              <button onClick={() => { try { disconnect() } catch (e) { console.error(e) } }} title="Dekonekte printer" className="iv-act danger icon">
                <BluetoothOff size={15}/>
              </button>
            </>
          )
        )}

        <button onClick={() => setShareOpen(true)} className="iv-act"><Share2 size={15}/> Pataje</button>

        <div style={{ position: 'relative' }} ref={pdfMenuRef}>
          <button onClick={() => setShowPdfMenu(v => !v)} className="iv-act">
            <Download size={15}/> PDF
            <ChevronDown size={13} style={{ transition: 'transform .2s', transform: showPdfMenu ? 'rotate(180deg)' : 'none' }}/>
          </button>
          {showPdfMenu && (
            <div className="iv-menu">
              <div className="h">Fòma enprimant</div>
              {PDF_SIZES.map(s => (
                <button key={s.value} onClick={() => downloadPdf(s.value)}>
                  <b>🖨 {s.label}</b><small>{s.desc}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="sp"/>
        {isUsbPrinter && !nativeOk && <span className="iv-mode">🖨 Mode USB — Windows Driver (RP327)</span>}

        {!isCancelled && hasRole('admin') && (
          <button onClick={() => {
            const reason = prompt('Rezon anilasyon:')
            if (reason !== null) cancelMutation.mutate(reason)
          }} className="iv-act danger">
            <XCircle size={15}/> Anile
          </button>
        )}
      </div>

      {btSupported && connected && (
        <div className="iv-bt-on">
          <span className="d"/> Printer BT konekte{deviceName ? ` — ${deviceName}` : ''} · klike « BT » pou enprime
        </div>
      )}

      <div className="iv-layout">
        <div className="iv-col">

          {/* ── Kliyan ── */}
          <section className="iv-sec a-up" style={{ animationDelay: '140ms' }}>
            <div className="iv-sec-h" style={{ marginBottom: snap.name ? 14 : 0 }}>
              <div className="n"><User size={17}/></div>
              <div>
                <p className="eb">Kliyan</p>
                <h3>{snap.name || 'Vant kontwa'}</h3>
              </div>
              {!snap.name && <div className="r"><span className="iv-pill muted">San kliyan</span></div>}
            </div>
            {snap.name && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {snap.phone && <span className="iv-pill muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}><Phone size={11}/> {snap.phone}</span>}
                {snap.email && <span className="iv-pill muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>{snap.email}</span>}
                {snap.nif   && <span className="iv-pill muted" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>NIF: {snap.nif}</span>}
              </div>
            )}
          </section>

          {/* ── Atik ── */}
          <section className="iv-sec a-up" style={{ animationDelay: '200ms' }}>
            <div className="iv-sec-h">
              <div className="n"><Package size={17}/></div>
              <div>
                <p className="eb">Detay</p>
                <h3>Atik yo</h3>
              </div>
              <div className="r"><span className="iv-pill muted">{invoice.items?.length || 0} atik</span></div>
            </div>

            <div className="iv-dl-head">
              <span>Pwodui</span><span style={{ textAlign: 'center' }}>Qte</span><span style={{ textAlign: 'right' }}>Pri U.</span>
              <span style={{ textAlign: 'right' }}>Rabè</span><span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {invoice.items?.map((item, i) => {
              const tierLabel = item.productSnapshot?.tierLabel
              const unit = item.product?.unit || item.productSnapshot?.unit
              const code = item.product?.code || item.productSnapshot?.code
              const disc = Number(item.discountPct) > 0
                ? (Number(item.unitPriceHtg) * Number(item.quantity)) * (Number(item.discountPct) / 100)
                : 0
              return (
                <div key={i} className="iv-dl-row" style={{ animationDelay: `${Math.min(i, 10) * 40 + 220}ms` }}>
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
                  <div className="r">
                    <span className="k">Pri U.</span>
                    <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{fmt(item.unitPriceHtg)}</span>
                  </div>
                  <div className={`r ${disc > 0 ? '' : 'disc'}`}>
                    <span className="k">Rabè</span>
                    <span className="num" style={{ fontSize: 16, color: disc > 0 ? 'var(--bad)' : 'var(--muted)' }}>{disc > 0 ? `−${fmt(disc)}` : '—'}</span>
                  </div>
                  <div className="r">
                    <span className="k">Total</span>
                    <span className="num" style={{ fontSize: 19, fontWeight: 800 }}>{fmt(item.totalHtg)}</span>
                  </div>
                </div>
              )
            })}
          </section>

          {/* ── Istwa peman (tan liy) ── */}
          <section className="iv-sec a-up" style={{ animationDelay: '260ms' }}>
            <div className="iv-sec-h">
              <div className={`n ${isPaid ? 'ok' : ''}`}><Banknote size={17}/></div>
              <div>
                <p className="eb">Istwa</p>
                <h3>Peman ({invoice.payments?.length || 0})</h3>
              </div>
              {canPay && (
                <div className="r">
                  <button className="iv-act" onClick={openPaymentModal} style={{ minHeight: 36 }}><Plus size={14}/> Peman</button>
                </div>
              )}
            </div>

            {sortedPays.length ? (
              <div className="iv-tl">
                {sortedPays.map((p, idx) => {
                  // ✅ Depo oswa peman final
                  const totalBeforeMe = sortedPays.slice(0, idx + 1).reduce((acc, x) => acc + Number(x.amountHtg || 0), 0)
                  const isFinalPay    = totalBeforeMe >= totalNum - 0.01
                  const isOnlyPayment = sortedPays.length === 1
                  const tipLabel      = isFinalPay && !isOnlyPayment ? 'Peman final'
                                      : isFinalPay && isOnlyPayment  ? 'Peman konplè'
                                      : `Depo #${idx + 1}`
                  const m   = PAYMENT_METHODS.find(x => x.value === p.method)
                  const MI  = m?.Icon || Banknote
                  const tc  = isFinalPay ? '#059669' : '#D97706'
                  return (
                    <div key={p.id} className="iv-tl-it" style={{ '--tc': tc, animationDelay: `${idx * 70 + 300}ms` }}>
                      <span className="ic"><MI size={17}/></span>
                      <div className="bd">
                        <b>{tipLabel}</b>
                        <small>
                          {toHaitiDate(p.paymentDate, 'dd/MM/yyyy HH:mm')} · {m?.label || p.method}
                          {p.reference ? ` · Ref: ${p.reference}` : ''}
                        </small>
                      </div>
                      <span className="num">+{fmt(p.amountHtg)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="iv-note" style={{ margin: 0 }}>Pa gen okenn peman anrejistre pou fakti sa a.</p>
            )}

            {invoice.dueDate && balance > 0 && (
              <div className="iv-due-card" style={{ marginTop: 6 }}>
                <span className="ic"><Calendar size={19}/></span>
                <div>
                  <div style={{ font: "800 11px 'Manrope', sans-serif", letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--warn)' }}>Dat limit peman kredi</div>
                  <div className="num" style={{ fontSize: 22, fontWeight: 800, color: '#92400E' }}>{toHaitiDate(invoice.dueDate, 'dd/MM/yyyy')}</div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ══════════ RESI / TOTAL ══════════ */}
        <aside className="iv-aside">
          <div className="iv-receipt">
            <div className="rh">
              <span className="brand">{tenant?.businessName || tenant?.name || 'Fakti'}</span>
              {(isPaid || isCancelled)
                ? <span className="iv-seal" style={{ '--sc': isPaid ? '#059669' : '#94A3B8' }}>{isPaid ? 'PEYE' : 'ANILE'}</span>
                : <span className="tag">Resi</span>}
            </div>
            <div className="meta">
              <div><span>Kliyan</span><b>{snap.name || 'Vant kontwa'}</b></div>
              <div style={{ textAlign: 'right' }}><span>Dat</span><b>{toHaitiDate(invoice.issueDate, 'dd/MM/yyyy')}</b></div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <div className="iv-rrow"><span>Sou-total</span><span className="num">{fmt(invoice.subtotalHtg)}</span></div>
              {Number(invoice.discountHtg) > 0 && <div className="iv-rrow disc"><span>Remiz</span><span className="num">−{fmt(invoice.discountHtg)}</span></div>}
              {Number(invoice.taxHtg) > 0 && <div className="iv-rrow"><span>TVA ({Number(invoice.taxRate || 0)}%)</span><span className="num">+{fmt(invoice.taxHtg)}</span></div>}
            </div>

            <div className="iv-rtotal">
              <span>Total</span>
              <span className="num">{fmt(invoice.totalHtg)}<small>HTG</small></span>
            </div>

            <div className="iv-paidbox ok">
              <span><CheckCircle size={14}/> {balance > 0 ? 'Depo peye' : 'Peye'}</span>
              <span className="num">{fmt(invoice.amountPaidHtg)}</span>
            </div>
            {balance > 0 && (
              <div className="iv-paidbox bad">
                <span><Clock size={14}/> Balans pou peye</span>
                <span className="num">{fmt(balance)}</span>
              </div>
            )}
            {isPaid && paidNum > 0 && <div className="iv-clear">✓ Kliyan an pa dwe ankò</div>}

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1.5px dashed var(--line2)', fontSize: 11, color: 'var(--muted)' }}>
              {invoice.dueDate && balance > 0 && (
                <div className="iv-rrow" style={{ color: 'var(--warn)', fontWeight: 800 }}><span>📅 Limit</span><span>{toHaitiDate(invoice.dueDate, 'dd/MM/yyyy')}</span></div>
              )}
              <div className="iv-rrow"><span>Taux</span><span className="mono">1 USD = {Number(invoice.exchangeRate || 132).toFixed(2)} HTG</span></div>
            </div>

            {showQrCode && qrDataUrl && (
              <div className="iv-qr">
                <img src={qrDataUrl} alt="QR Code"/>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 800 }}>QR verifikasyon</div>
              </div>
            )}
          </div>

          <div className="iv-printbtns">
            {PrintButtons({ big: true })}
            {btSupported && connected && (
              <button onClick={() => { try { print(invoice, tenant, user) } catch { toast.error('Erè BT print') } }} disabled={btPrinting} className="iv-act green" style={{ width: '100%' }}>
                <Printer size={15}/> {btPrinting ? 'Ap enprime...' : 'Enprime BT'}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ══════════ MODAL PEMAN ══════════ */}
      {showPayment && (
        <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && !paymentMutation.isPending && setShowPayment(false)}>
          <div className="iv-sheet">
            <div className="iv-sheet-h">
              <h3>
                {paidNum > 0
                  ? 'Lòt depo / Peye balans'
                  : (amtNum > 0 && amtNum < balance) ? 'Anrejistre depo (avans)' : 'Anrejistre peman'}
              </h3>
              <p>{invoice.invoiceNumber} · {snap.name || 'Vant kontwa'}</p>
              <button className="x" onClick={() => setShowPayment(false)} aria-label="Fèmen"><X size={17}/></button>
            </div>

            <div className="iv-sheet-b">
              <div className="iv-balbox">
                <div className="rw"><span>Total fakti</span><span className="num">{fmt(invoice.totalHtg)} HTG</span></div>
                {paidNum > 0 && <div className="rw"><span>💰 Depo deja peye</span><span className="num" style={{ color: 'var(--ok)' }}>−{fmt(invoice.amountPaidHtg)}</span></div>}
                <div className="big"><span>Balans pou peye</span><span className="num">{fmt(balance)} HTG</span></div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="iv-lbl" style={{ margin: 0 }}>Montan kliyan bay (HTG) *</label>
                  {amtNum !== balance && balance > 0 && (
                    <button type="button" className="iv-pill" style={{ border: 'none', cursor: 'pointer', background: 'rgba(27,42,143,.08)', color: 'var(--blue)' }}
                      onClick={() => setPayData(d => ({ ...d, amountHtg: String(balance) }))}>
                      Ranpli tout
                    </button>
                  )}
                </div>
                <input type="number" step="0.01" min="0.01" className="iv-inp money big center"
                  value={payData.amountHtg}
                  onFocus={e => e.target.select()}
                  onChange={e => setPayData(d => ({ ...d, amountHtg: e.target.value }))}
                  autoFocus/>
              </div>

              {amtNum > 0 && amtNum < balance && (
                <div className="iv-state dep">
                  <div className="rw"><b>💰 Depo (avans)</b><span className="num" style={{ color: 'var(--ok)' }}>+{fmt(amtNum)}</span></div>
                  <div className="rw" style={{ marginTop: 4 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Balans ap rete</span><span className="num">{fmt(balance - amtNum)} HTG</span></div>
                </div>
              )}
              {amtNum === balance && amtNum > 0 && (
                <div className="iv-state fin">
                  <div className="rw"><b>✓ Peman final — balans peye nèt</b><span style={{ fontSize: 11, fontWeight: 800 }}>Pa gen monnen</span></div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Kliyan an pa pral dwe anyen apre peman sa.</div>
                </div>
              )}
              {monnen > 0 && (
                <div className="iv-state chg">
                  <div style={{ font: "800 11px 'Manrope', sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', opacity: .85 }}>Monnen pou remèt</div>
                  <div className="num">{fmt(monnen)} <small style={{ fontSize: 16 }}>HTG</small></div>
                  <div className="mono" style={{ fontSize: 11, opacity: .8 }}>{fmt(amtNum)} − {fmt(balance)}</div>
                </div>
              )}

              <div>
                <label className="iv-lbl">Metòd peman</label>
                <div className="iv-pay seven">
                  {PAYMENT_METHODS.map(({ value, label, Icon, color }) => (
                    <button key={value} type="button" onClick={() => setPayData(d => ({ ...d, method: value }))}
                      className={`iv-paybtn ${payData.method === value ? 'on' : ''}`} style={{ '--pc': color }}>
                      {payData.method === value && <span className="ck"><Check size={10} strokeWidth={3}/></span>}
                      <span className="pi"><Icon size={16}/></span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="iv-lbl">Referans (opsyonèl)</label>
                <input className="iv-inp" placeholder="ex: MCash #12345"
                  value={payData.reference}
                  onChange={e => setPayData(d => ({ ...d, reference: e.target.value }))}/>
              </div>

              {amtNum > 0 && amtNum < balance && (
                <div className="a-up">
                  <label className="iv-lbl">📅 Dat kliyan ap vin peye balans la</label>
                  <input type="date" className="iv-inp"
                    value={payData.dueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setPayData(d => ({ ...d, dueDate: e.target.value }))}/>
                  {!payData.dueDate && (
                    <p style={{ fontSize: 11, color: 'var(--warn)', margin: '6px 0 0', fontWeight: 700 }}>⚠️ Rekòmande pou kredi — bay dat limit peman an</p>
                  )}
                </div>
              )}

              <div className="iv-sheet-f">
                <button type="button" className="iv-act" onClick={() => setShowPayment(false)} disabled={paymentMutation.isPending}>Anile</button>
                <button type="button" className="iv-btn-main"
                  onClick={() => {
                    if (!amtNum || amtNum <= 0) return toast.error('Montan dwe plis ke 0.')
                    const amtToRecord = monnen > 0 ? balance : amtNum
                    paymentMutation.mutate({
                      ...payData,
                      amountHtg:    amtToRecord,
                      amountGiven:  monnen > 0 ? amtNum : 0,
                      change:       monnen > 0 ? monnen : 0,
                      dueDate:      payData.dueDate || undefined,
                    })
                  }}
                  disabled={paymentMutation.isPending || amtNum <= 0}>
                  {paymentMutation.isPending
                    ? <><RefreshCw size={16} className="spin"/> Ap anrejistre...</>
                    : <><Check size={16}/> Konfime {fmt(monnen > 0 ? balance : amtNum)} HTG</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal Pataje pa WhatsApp */}
      {shareOpen && (
        <InvoiceShareModal
          invoice={invoice}
          onClose={() => setShareOpen(false)}
          shareMutation={shareMutation}
          revokeMutation={revokeShareMutation}
        />
      )}
    </div>
  )
}

// ── Modal Pataje — lyen dirèk pa WhatsApp (san kòd)
function InvoiceShareModal({ invoice, onClose, shareMutation, revokeMutation }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = invoice.publicToken ? `${window.location.origin}/facture/${invoice.publicToken}` : null

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Men fakti ou a: ${shareUrl}`)}`
    : null

  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 440 }}>
        <div className="iv-sheet-h">
          <h3><Share2 size={18} style={{ verticalAlign: '-2px' }}/> Pataje fakti</h3>
          <p>{invoice.invoiceNumber}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>

        <div className="iv-sheet-b">
          {!invoice.publicToken ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div className="iv-okring" style={{ background: 'linear-gradient(135deg,#1B2A8F,#2D3FBF)', boxShadow: '0 0 0 10px rgba(27,42,143,.1), 0 16px 34px rgba(27,42,143,.3)', width: 78, height: 78 }}>
                <Link2 size={32} color="#fff"/>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
                Kreye yon lyen pou kliyan an ka wè fakti a nan fòm elektwonik, ak tout enfo peman li yo, dirèkteman, san kòd.
              </p>
              <button onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending} className="iv-btn-main" style={{ width: '100%' }}>
                {shareMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Share2 size={16}/>}
                {shareMutation.isPending ? 'Kreyasyon...' : 'Kreye lyen pataj'}
              </button>
            </div>
          ) : (
            <>
              <div className="iv-share-url">
                <input readOnly value={shareUrl} className="iv-inp" onFocus={e => e.target.select()}/>
                <button onClick={handleCopy} className={`iv-act icon ${copied ? 'green' : ''}`} style={{ minHeight: 44, width: 44 }}>
                  {copied ? <Check size={17}/> : <Copy size={17}/>}
                </button>
              </div>
              <a href={waUrl} target="_blank" rel="noreferrer" className="iv-wa">
                <MessageCircle size={18}/> Voye sou WhatsApp
              </a>
              <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending} className="iv-link-btn">
                <RefreshCw size={13}/> Revoke lyen sa a
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}