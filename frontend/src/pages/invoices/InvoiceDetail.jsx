// src/pages/invoices/InvoiceDetail.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { usePrinterStore } from '../../stores/printerStore'
import { isAndroid, isSunmi } from '../../services/printerService'
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
  { value:'check',    label:'Chek'      },
]

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
      const er = tenant && tenant.exchangeRates
      if (!er) return {}
      if (typeof er === 'object') return er
      return JSON.parse(String(er))
    } catch (e) { return {} }
  })()

  const receiptWidth = tenant?.receiptSize === '57mm' ? '57mm' : '80mm'
  const is57         = receiptWidth === '57mm'

  const totalHtg = Number(invoice.totalHtg || 0)
  const paidHtg  = Number(invoice.amountPaidHtg || 0)
  const balHtg   = Number(invoice.balanceDueHtg || 0)
  const rateUSD  = Number(exchangeRates.USD || invoice.exchangeRate || 132)
  const rateDOP  = Number(exchangeRates.DOP || 0)
  const toUSD    = (htg) => rateUSD > 0 ? (htg / rateUSD).toFixed(2) : null
  const toDOP    = (htg) => rateDOP > 0 ? (htg / rateDOP).toFixed(2) : null

  const lastPayment = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1] : null

  const amountGiven = lastPayment?.amountGiven || 0
  const change      = lastPayment?.change || 0

  const statusLabel = isPaid      ? 'TOTAL PAYÉ / TOTAL PEYE'
    : isCancelled                 ? 'ANILÉ / ANNULÉ'
    : isPartial                   ? 'PASYAL / PARTIEL'
    :                               'IMPAYÉ / IMPAYE'

  const statusColor = isPaid      ? '#111'
    : isCancelled                 ? '#6b7280'
    : isPartial                   ? '#d97706'
    :                               '#dc2626'

  const PAYMENT_METHOD_LABELS = {
    cash: 'Kach / Cash', moncash: 'MonCash', natcash: 'NatCash',
    card: 'Kat / Carte', transfer: 'Virement', check: 'Chek / Chèque', other: 'Lòt / Autre'
  }

  const base = {
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    width:      receiptWidth,
    maxWidth:   receiptWidth,
    margin:     '0 auto',
    padding:    is57 ? '4mm 3mm' : '5mm 5mm',
    background: '#fff',
    color:      '#111',
    fontSize:   is57 ? '11px' : '12px',
    lineHeight: '1.5',
  }

  const HR_SOLID  = <div style={{ borderTop: '1.5px solid #111', margin: '5px 0' }} />
  const HR_DASHED = <div style={{ borderTop: '1px dashed #aaa', margin: '5px 0' }} />

  const Row = ({ left, right, bold, large, color }) => (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'baseline',
      fontWeight:     bold ? '700' : '400',
      fontSize:       large ? (is57 ? '13px' : '14px') : 'inherit',
      color:          color || '#111',
      marginBottom:   '2px',
    }}>
      <span>{left}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: bold ? '800' : '500' }}>{right}</span>
    </div>
  )

  const fmtR = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const businessName = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const tagline      = tenant?.tagline || tenant?.description || ''

  return (
    <div id="printable-receipt" style={{ display: 'none', ...base }}>

      {/* ══════════ HEADER ══════════ */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        {logoBase64 ? (
          <img
            src={logoBase64}
            alt="Logo"
            style={{
              height:      is57 ? '35px' : '45px',
              maxWidth:    '100%',
              objectFit:   'contain',
              display:     'block',
              margin:      '0 auto 5px',
            }}
          />
        ) : (
          <div style={{
            fontWeight:    '900',
            fontSize:      is57 ? '17px' : '22px',
            letterSpacing: '0.5px',
            marginBottom:  '3px',
          }}>
            {businessName}
          </div>
        )}

        {logoBase64 && (
          <div style={{ fontWeight: '900', fontSize: is57 ? '15px' : '20px', letterSpacing: '0.5px', marginBottom: '2px' }}>
            {businessName}
          </div>
        )}

        {tagline && (
          <div style={{ fontSize: is57 ? '10px' : '11px', color: '#555', marginBottom: '2px' }}>
            {tagline}
          </div>
        )}

        {tenant?.address && (
          <div style={{ fontSize: is57 ? '10px' : '11px', color: '#555' }}>
            {tenant.address}
          </div>
        )}

        {tenant?.phone && (
          <div style={{ fontSize: is57 ? '10px' : '11px', color: '#555' }}>
            Tel: {tenant.phone}
          </div>
        )}
      </div>

      {HR_SOLID}

      {/* ══════════ INFO FAKTI ══════════ */}
      <div style={{ marginBottom: '4px', fontSize: is57 ? '10px' : '11px' }}>
        <div><strong>Dat / Date:</strong> {toHaitiDate(invoice.issueDate, 'dd-MM-yyyy')}</div>
        <div><strong>Resi N° / Reçu N°:</strong> {invoice.invoiceNumber}</div>
        {snap.name && (
          <div><strong>Kliyan / Client:</strong> {snap.name}</div>
        )}
        {!is57 && snap.phone && (
          <div style={{ color: '#555' }}>Tél: {snap.phone}</div>
        )}
        {!is57 && (
          <div>
            <strong>Kesye / Caissier:</strong>{' '}
            {invoice.cashierName || invoice.createdByName || 'Admin'}
          </div>
        )}
        {snap.nif && (
          <div style={{ color: '#555', fontSize: '9px' }}>NIF: {snap.nif}</div>
        )}
      </div>

      {HR_DASHED}

      {/* ══════════ ATIK YO ══════════ */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{
          display:       'flex',
          justifyContent:'space-between',
          fontWeight:    '700',
          fontSize:      is57 ? '10px' : '11px',
          borderBottom:  '1px dashed #aaa',
          paddingBottom: '3px',
          marginBottom:  '3px',
        }}>
          <span style={{ flex: 3 }}>{is57 ? 'Pwodwi / Produit' : 'Produit'}</span>
          <span style={{ flex: 1, textAlign: 'center' }}>{is57 ? 'Qty' : 'Qté'}</span>
          <span style={{ flex: 2, textAlign: 'right' }}>{is57 ? 'Pri' : 'Prix'}</span>
          <span style={{ flex: 2, textAlign: 'right' }}>Total</span>
        </div>

        {invoice.items?.map((item, i) => {
          const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
          return (
            <div key={i} style={{
              display:       'flex',
              justifyContent:'space-between',
              alignItems:    'baseline',
              fontSize:      is57 ? '10px' : '11px',
              padding:       '2px 0',
              borderBottom:  '1px dotted #ddd',
            }}>
              <span style={{ flex: 3, fontWeight: '500' }}>{nom}</span>
              <span style={{ flex: 1, textAlign: 'center' }}>{Number(item.quantity)}</span>
              <span style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace' }}>
                {fmtR(item.unitPriceHtg)} G
              </span>
              <span style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>
                {fmtR(item.totalHtg)} G
              </span>
            </div>
          )
        })}
      </div>

      {HR_DASHED}

      {/* ══════════ TOTAUX ══════════ */}
      <div style={{ marginBottom: '4px', fontSize: is57 ? '10px' : '11px' }}>
        {Number(invoice.discountHtg) > 0 && (
          <Row left="Remiz / Remise:" right={`-${fmtR(invoice.discountHtg)} G`} color="#dc2626" />
        )}
        {Number(invoice.taxHtg) > 0 && (
          <Row left={`Taks / Taxe (${Number(invoice.taxRate || 0)}%):`} right={`${fmtR(invoice.taxHtg)} G`} />
        )}
      </div>

      {/* ✅ TOTAL GRAND + deviz sou menm liy */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          fontWeight:     '900',
          fontSize:       is57 ? '13px' : '14px',
          color:          '#111',
          marginBottom:   '2px',
        }}>
          <span>TOTAL / TOTAL:</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{fmtR(totalHtg)} G</span>
            {toUSD(totalHtg) && (
              <span style={{ fontSize: '9px', color: '#555', fontFamily: 'monospace' }}>
                ≈ ${toUSD(totalHtg)} USD
              </span>
            )}
            {toDOP(totalHtg) && (
              <span style={{ fontSize: '9px', color: '#555', fontFamily: 'monospace' }}>
                ≈ RD${toDOP(totalHtg)} DOP
              </span>
            )}
          </div>
        </div>
      </div>

      {HR_DASHED}

      {/* ══════════ PEMAN ══════════ */}
      <div style={{ marginBottom: '4px', fontSize: is57 ? '10px' : '11px' }}>

        {/* Kob kliyan bay */}
        {amountGiven > 0 && (
          <Row
            left={is57 ? 'Kòb kliyan bay' : 'Montant reçu / Kòb kliyan bay:'}
            right={`${fmtR(amountGiven)} G`}
            bold
          />
        )}

        {/* Monnen */}
        {change > 0 && (
          <Row
            left={is57 ? 'Monnen' : 'Monnaie / Monnen remèt:'}
            right={`${fmtR(change)} G`}
            bold
          />
        )}

        {/* Metod peman */}
        {lastPayment?.method && (
          <Row
            left={is57 ? 'Metod / Mode:' : 'Méthode / Metod:'}
            right={PAYMENT_METHOD_LABELS[lastPayment.method] || lastPayment.method}
          />
        )}
        {lastPayment?.reference && (
          <Row left="Réf:" right={lastPayment.reference} />
        )}

        {/* ✅ BALANS AK SIY NEGATIF */}
        {balHtg > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'baseline',
              fontWeight:     '700',
              color:          '#dc2626',
              marginBottom:   '2px',
            }}>
              <span>Balans / Solde dû:</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>-{fmtR(balHtg)} G</span>
                {toUSD(balHtg) && (
                  <span style={{ fontSize: '9px', color: '#dc2626', opacity: 0.7, fontFamily: 'monospace' }}>
                    ≈ -${toUSD(balHtg)} USD
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ✅ DAT PEMAN KREDI */}
        {invoice.dueDate && balHtg > 0 && (
          <>
            {HR_DASHED}
            <div style={{
              background:   'rgba(217,119,6,0.07)',
              border:       '1px dashed #d97706',
              borderRadius: 6,
              padding:      '5px 8px',
              marginTop:    4,
            }}>
              <Row
                left={is57 ? '📅 Dat pou peye:' : '📅 Date limite paiement:'}
                right={toHaitiDate(invoice.dueDate, 'dd/MM/yyyy')}
                bold
                color="#d97706"
              />
            </div>
          </>
        )}
      </div>

      {HR_SOLID}

      {/* ══════════ STATUT FINAL ══════════ */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'baseline',
        fontWeight:     '900',
        fontSize:       is57 ? '12px' : '14px',
        color:          statusColor,
        margin:         '5px 0',
      }}>
        <span>{statusLabel}:</span>
        <span style={{ fontFamily: 'monospace' }}>{fmtR(isPaid ? totalHtg : paidHtg)} G</span>
      </div>

      {HR_SOLID}

      {/* ══════════ QR CODE ══════════ */}
      {showQrCode && qrDataUrl && (
        <div style={{ textAlign: 'center', margin: '6px 0' }}>
          <img
            src={qrDataUrl}
            alt="QR"
            style={{ width: is57 ? '70px' : '85px', height: is57 ? '70px' : '85px', display: 'block', margin: '0 auto 3px' }}
          />
          <div style={{ fontSize: '9px', color: '#aaa', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</div>
        </div>
      )}

      {/* ══════════ FOOTER ══════════ */}
      <div style={{
        textAlign:  'center',
        fontSize:   is57 ? '9px' : '10px',
        color:      '#444',
        lineHeight: '1.6',
        marginTop:  '6px',
        borderTop:  '1px dashed #ccc',
        paddingTop: '6px',
      }}>
        <div style={{ fontWeight: '700', fontSize: is57 ? '11px' : '12px', marginBottom: '3px' }}>
          Mési paske ou achte lakay nou
        </div>
        <div style={{ marginBottom: '4px' }}>
          Merci pour votre achat
        </div>

        <div style={{ borderTop: '1px dotted #ccc', paddingTop: '4px', marginBottom: '4px', fontStyle: 'italic', color: '#555' }}>
          Tout machandiz vann pa reprann ni chanje.
          <br />
          Les marchandises vendues ne sont ni reprises ni échangées.
        </div>

        <div style={{ borderTop: '1px dotted #ccc', paddingTop: '4px', fontWeight: '600', color: '#333' }}>
          Produit par / Pwodwi pa
          <br />
          <strong>Plus Group</strong>
          <br />
          +509 4244-9024
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
  const pdfMenuRef  = useRef(null)
  const { t, i18n } = useTranslation()

  const [showPayment, setShowPayment] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [qrDataUrl, setQrDataUrl]     = useState(null)
  const [logoBase64, setLogoBase64]   = useState(null)
  const [printing, setPrinting]       = useState(false)

  // ✅ dueDate ajoute pou peman kredi
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

  // ✅ Detekte BT san krash — iOS Safari ak vye navigatè pa sipote navigator.bluetooth
  const btSupported = (() => {
    try { return !onSunmi && typeof navigator !== 'undefined' && !!navigator.bluetooth }
    catch { return false }
  })()

  // ✅ Wrapper connect ak try/catch an plis pou evite krash nenpòt ki kote
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
      qc.invalidateQueries(['invoice', id])
      setShowPayment(false)
      setPayData({ amountHtg: '', method: 'cash', reference: '', dueDate: '' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Ere pandan peman.')
  })

  const cancelMutation = useMutation({
    mutationFn: (reason) => invoiceAPI.cancel(id, { reason }),
    onSuccess: () => { toast.success('Facture anile.'); qc.invalidateQueries(['invoice', id]) }
  })

  const openPaymentModal = () => {
    const bal = Number(invoice?.balanceDueHtg || 0)
    setPayData({ amountHtg: bal > 0 ? String(bal) : '', method: 'cash', reference: '', dueDate: '' })
    setShowPayment(true)
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

      <PrintableReceipt
        invoice={invoice}
        tenant={tenant}
        t={t}
        qrDataUrl={qrDataUrl}
        logoBase64={logoBase64}
        showQrCode={showQrCode}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media print {
          @page { margin: 0; }
          #root > * { display: none !important; }
          #_receipt_print_root { display: block !important; }
          body, html { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* ══════════ HEADER — responsiv mobil ══════════ */}
      <div style={{ marginBottom: 24 }}>

        {/* Ranje 1 — Titre + badge */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={() => navigate('/app/invoices')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h1 className="text-2xl font-display font-bold" style={{ margin:0 }}>{invoice.invoiceNumber}</h1>
              <span className={`badge ${isPaid ? 'badge-green' : isCancelled ? 'badge-gray' : invoice.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
                {isPaid ? 'Peye' : isCancelled ? 'Anile' : invoice.status === 'partial' ? 'Pasyal' : 'Impaye'}
              </span>
            </div>
            {invoice.quoteId && (
              <p className="text-slate-500 text-sm" style={{ margin:'2px 0 0' }}>
                Soti devis:{' '}
                <Link to={`/app/quotes/${invoice.quoteId}`} className="text-brand-600 hover:underline">
                  {invoice.quote?.quoteNumber}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Ranje 2 — Bouton aksyon yo — wrap sou mobil */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>

          {/* Enprime window.print */}
          <button
            onClick={handlePrint}
            disabled={printing}
            className="btn-secondary btn-sm"
            style={{ display:'flex', alignItems:'center', gap:6 }}
          >
            <Printer size={14} />
            {printing ? 'Ap enprime...' : 'Enprime Resi'}
          </button>

          {/* Sunmi — sèlman si onSunmi */}
          {onSunmi && (
            <button
              onClick={handleSunmiPrint}
              disabled={btPrinting}
              className="btn-secondary btn-sm"
              style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(5,150,105,0.08)', color:'#059669', border:'1px solid rgba(5,150,105,0.3)' }}
            >
              <Printer size={14} />
              {btPrinting ? 'Ap enprime...' : '🖨 Sunmi'}
            </button>
          )}

          {/* ✅ Bluetooth — sèlman si btSupported (safe check) */}
          {btSupported && (
            <>
              {!connected ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn-secondary btn-sm"
                  style={{ display:'flex', alignItems:'center', gap:6 }}
                >
                  <Bluetooth size={14} />
                  {connecting
                    ? <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ width:10, height:10, border:'2px solid #94a3b8', borderTopColor:'#1B2A8F', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                        Ap konekte...
                      </span>
                    : 'Konekte BT'
                  }
                </button>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <button
                    onClick={() => { try { print(invoice, tenant, user) } catch(e) { toast.error('Erè BT print') } }}
                    disabled={btPrinting}
                    className="btn-secondary btn-sm"
                    style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(5,150,105,0.08)', color:'#059669', border:'1px solid rgba(5,150,105,0.3)' }}
                  >
                    <Printer size={14} />
                    {btPrinting ? 'Ap enprime...' : `BT${deviceName ? ` (${deviceName.slice(0,10)})` : ''}`}
                  </button>
                  <button
                    onClick={() => { try { disconnect() } catch(e) { console.error(e) } }}
                    title="Dekonekte printer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, background:'rgba(192,57,43,0.07)', border:'1px solid rgba(192,57,43,0.2)', color:'#C0392B', cursor:'pointer', flexShrink:0 }}
                  >
                    <BluetoothOff size={13}/>
                  </button>
                </div>
              )}
            </>
          )}

          {/* PDF */}
          <div className="relative" ref={pdfMenuRef}>
            <button onClick={() => setShowPdfMenu(v => !v)} className="btn-secondary btn-sm"
              style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Download size={14} />
              PDF
              <ChevronDown size={12} style={{ transition:'transform 0.2s', transform: showPdfMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {showPdfMenu && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:50, background:'#fff', borderRadius:12, minWidth:210, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Foma enprimant
                </div>
                {PDF_SIZES.map((s, i) => (
                  <button key={s.value} onClick={() => downloadPdf(s.value)}
                    style={{ width:'100%', textAlign:'left', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', borderBottom: i < PDF_SIZES.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', fontFamily:'DM Sans,sans-serif' }}>🖨 {s.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Peman */}
          {!isCancelled && !isPaid && hasRole(['admin','cashier']) && (
            <button onClick={openPaymentModal} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Plus size={16} /> Anrejistre Peman
            </button>
          )}

          {/* Anile */}
          {!isCancelled && hasRole('admin') && (
            <button onClick={() => {
              const reason = prompt('Rezon anilasyon:')
              if (reason !== null) cancelMutation.mutate(reason)
            }} className="btn-danger btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <XCircle size={14} /> Anile
            </button>
          )}
        </div>
      </div>

      {btSupported && connected && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'rgba(5,150,105,0.07)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:10, marginBottom:16, fontSize:12, color:'#059669', fontWeight:600, flexWrap:'wrap' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#059669', animation:'pulse-dot 1.5s infinite', flexShrink:0 }}/>
          Printer BT konekte{deviceName ? ` — ${deviceName}` : ''} — Klike "BT" pou enprime
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
                    <td className="text-center text-slate-500">{Number(item.discountPct) > 0 ? `${item.discountPct}%` : '-'}</td>
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
                <thead><tr><th>Dat</th><th>Metod</th><th>Referans</th><th className="text-right">Montan HTG</th></tr></thead>
                <tbody>
                  {invoice.payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs text-slate-500">{toHaitiDate(p.paymentDate, 'dd/MM/yyyy')}</td>
                      <td><span className="badge-blue">{PAYMENT_METHODS.find(m=>m.value===p.method)?.label || p.method}</span></td>
                      <td className="text-xs text-slate-400 font-mono">{p.reference || '-'}</td>
                      <td className="text-right font-mono font-semibold text-emerald-600">{fmt(p.amountHtg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ✅ Afiche dat limit peman si gen dueDate ak balans */}
          {invoice.dueDate && balance > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'rgba(217,119,6,0.07)', border:'1px solid rgba(217,119,6,0.3)', borderRadius:12 }}>
              <span style={{ fontSize:20 }}>📅</span>
              <div>
                <p style={{ fontSize:12, fontWeight:800, color:'#d97706', margin:0 }}>Dat limit peman kredi</p>
                <p style={{ fontSize:14, fontWeight:700, color:'#92400e', margin:'2px 0 0', fontFamily:'monospace' }}>
                  {toHaitiDate(invoice.dueDate, 'dd MMMM yyyy')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Kolòn dwat */}
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
                  {/* ✅ Siy negatif nan sidebar tou */}
                  <span className="font-mono font-bold">-{fmt(balance)} HTG</span>
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
              <div className="flex justify-between">
                <span>Dat:</span><span>{toHaitiDate(invoice.issueDate, 'dd/MM/yyyy')}</span>
              </div>
              {invoice.dueDate && balance > 0 && (
                <div className="flex justify-between" style={{ color:'#d97706', fontWeight:700 }}>
                  <span>📅 Limit:</span>
                  <span className="font-mono">{toHaitiDate(invoice.dueDate, 'dd/MM/yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Taux:</span>
                <span className="font-mono">1 USD = {Number(invoice.exchangeRate||132).toFixed(2)} HTG</span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              disabled={printing}
              className="btn-primary w-full mt-4"
              style={{ justifyContent:'center', display:'flex', alignItems:'center', gap:6 }}
            >
              <Printer size={15} />
              {printing ? 'Ap enprime...' : 'Enprime Resi'}
            </button>

            {onSunmi && (
              <button
                onClick={handleSunmiPrint}
                disabled={btPrinting}
                className="w-full mt-2"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'rgba(5,150,105,0.08)', color:'#059669', border:'1px solid rgba(5,150,105,0.3)', fontWeight:600, fontSize:13, cursor:'pointer' }}
              >
                <Printer size={15} />
                {btPrinting ? 'Ap enprime...' : '🖨 Enprime Sunmi'}
              </button>
            )}

            {btSupported && connected && (
              <button
                onClick={() => { try { print(invoice, tenant, user) } catch(e) { toast.error('Erè BT print') } }}
                disabled={btPrinting}
                className="w-full mt-2"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:10, background:'rgba(5,150,105,0.08)', color:'#059669', border:'1px solid rgba(5,150,105,0.3)', fontWeight:600, fontSize:13, cursor:'pointer' }}
              >
                <Printer size={15} />
                {btPrinting ? 'Ap enprime...' : 'Enprime BT'}
              </button>
            )}

            {showQrCode && qrDataUrl && (
              <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #f1f5f9', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'#94a3b8', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>QR Verifikasyon</p>
                <img src={qrDataUrl} alt="QR Code" style={{ width:90, height:90, margin:'0 auto', display:'block', borderRadius:8, border:'1px solid #e2e8f0' }} />
                <p style={{ fontSize:9, color:'#cbd5e1', marginTop:4 }}>{invoice.invoiceNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════ MODAL PEMAN ══════════ */}
      {showPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div className="modal max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-display font-bold">Anrejistre Peman</h2>
                <p className="text-xs text-slate-400 mt-0.5">{invoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600 p-1 text-xl leading-none">x</button>
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
                  {/* ✅ Siy negatif nan modal tou */}
                  <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:800, color:'#dc2626' }}>-{fmt(balance)} HTG</span>
                </div>
              </div>

              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <label className="label mb-0">Montan kliyan bay (HTG) *</label>
                  {amtNum !== balance && balance > 0 && (
                    <button type="button"
                      onClick={() => setPayData(d => ({ ...d, amountHtg: String(balance) }))}
                      style={{ fontSize:10, color:'#2563eb', fontWeight:700, background:'#eff6ff', border:'none', cursor:'pointer', padding:'2px 8px', borderRadius:4 }}>
                      Ranpli tout
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
                    <span style={{ fontSize:12, color:'#d97706', fontWeight:700 }}>Peman pasyal</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#d97706' }}>{fmt(balance - amtNum)} HTG ap rete</span>
                  </div>
                )}
                {amtNum === balance && amtNum > 0 && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#16a34a', fontWeight:700 }}>Peman egzak</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#16a34a' }}>Pa gen monnen</span>
                  </div>
                )}
                {monnen > 0 && (
                  <div style={{ marginTop:8, borderRadius:12, overflow:'hidden', border:'2px solid #16a34a' }}>
                    <div style={{ background:'#16a34a', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Monnen pou remet</span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontFamily:'monospace' }}>{fmt(amtNum)} - {fmt(balance)}</span>
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
                <label className="label">Metod peman</label>
                <select className="input" value={payData.method} onChange={e => setPayData(d => ({ ...d, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Referans (opsyonel)</label>
                <input className="input" placeholder="ex: MCash #12345"
                  value={payData.reference}
                  onChange={e => setPayData(d => ({ ...d, reference: e.target.value }))} />
              </div>

              {/* ✅ DAT KREDI — montre sèlman si se peman pasyal */}
              {amtNum > 0 && amtNum < balance && (
                <div>
                  <label className="label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span>📅</span> Dat kliyan ap vin peye balans la
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={payData.dueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setPayData(d => ({ ...d, dueDate: e.target.value }))}
                  />
                  {!payData.dueDate && (
                    <p style={{ fontSize:11, color:'#d97706', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                      <span>⚠️</span> Rekòmande pou kredi — bay dat limit peman an
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary" disabled={paymentMutation.isPending}>
                  Anile
                </button>
                <button type="button"
                  onClick={() => {
                    if (!amtNum || amtNum <= 0) return toast.error('Montan dwe plis ke 0.')
                    const amtToRecord = monnen > 0 ? balance : amtNum
                    paymentMutation.mutate({
                      ...payData,
                      amountHtg: amtToRecord,
                      dueDate: payData.dueDate || undefined,
                    })
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
                    : monnen > 0 ? `Konfime ${fmt(balance)} HTG` : `Konfime ${fmt(amtNum)} HTG`
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
