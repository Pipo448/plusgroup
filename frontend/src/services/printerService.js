// src/services/printerService.js
// Goojprt PT-210 — ESC/POS via Web Bluetooth (Android Chrome)
// Resi Trilingg: Kreyòl / Français / English
// ✅ v2: Logo ESC/POS (GS v 0) + TOTAL adapte 57mm/80mm

const PRINTER_SERVICE_UUID   = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHAR_UUID      = '00002af1-0000-1000-8000-00805f9b34fb'
const PRINTER_SERVICE_UUID_2 = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_CHAR_UUID_2    = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

let _device = null
let _char   = null

const ESC = 0x1B
const GS  = 0x1D
const LF  = 0x0A

const CMD = {
  INIT:          [ESC, 0x40],
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  ALIGN_RIGHT:   [ESC, 0x61, 0x02],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  DOUBLE_BOTH:   [ESC, 0x21, 0x30],
  NORMAL_SIZE:   [ESC, 0x21, 0x00],
  SMALL_FONT:    [ESC, 0x4D, 0x01],
  NORMAL_FONT:   [ESC, 0x4D, 0x00],
  LINE_FEED:     [LF],
  CUT:           [GS, 0x56, 0x41, 0x03],
  QR_MODEL:      [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  QR_SIZE:       [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06],
  QR_ERROR:      [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30],
  QR_PRINT:      [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30],
}

const L = {
  receipt:       'Resi / Recu / Receipt',
  invoiceNo:     'No. Fakti / No. Facture / Invoice No.',
  date:          'Dat / Date / Date',
  rate:          'Taux / Taux / Rate',
  client:        'Kliyan / Client / Client',
  phone:         'Tel / Tel / Tel',
  product:       'Pwodui / Produit / Product',
  qty:           'Qte / Qte / Qty',
  unitPrice:     'Pri U. / Prix U. / Unit Price',
  total:         'Total / Total / Total',
  discount:      'Remiz / Remise / Discount',
  subtotal:      'Sou-total / Sous-total / Subtotal',
  tax:           'Taks / Taxe / Tax',
  grandTotal:    'TOTAL / TOTAL / TOTAL',
  paid:          'Peye / Paye / Paid',
  balance:       'Balans / Solde / Balance',
  payMethod:     'Metod peman / Mode paiement / Payment method',
  reference:     'Referans / Reference / Reference',
  scanQr:        'Skane pou verifye / Scanner pour verifier / Scan to verify',
  thankYou:      'Mesi pou biznis ou! / Merci pour votre confiance! / Thank you for your business!',
  allSalesFinal: 'Vant final. / Vente finale. / All sales are final.',
  poweredBy:     'Powered by PlusGroup',
  statusPaid:      'PEYE / PAYE / PAID',
  statusPartial:   'PEMAN PASYAL / PAIEMENT PARTIEL / PARTIAL PAYMENT',
  statusCancelled: 'ANILE / ANNULE / CANCELLED',
  statusUnpaid:    'IMPAYE / NON PAYE / UNPAID',
  item:          'Atik/Art./Item',
  q:             'Q',
  pri:           'Pri/Pr./Pr.',
  tot:           'Tot',
  paymentMethods: {
    cash:     'Kach / Cash / Cash',
    moncash:  'MonCash / MonCash / MonCash',
    natcash:  'NatCash / NatCash / NatCash',
    card:     'Kat / Carte / Card',
    transfer: 'Virement / Virement / Transfer',
    check:    'Chek / Cheque / Check',
    other:    'Lot / Autre / Other',
  }
}

const encodeText = (text) => {
  const clean = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '?')
  return Array.from(clean).map(c => c.charCodeAt(0))
}

const getWidth = (tenant) => {
  const size = tenant?.receiptSize || '80mm'
  return size === '57mm' ? 32 : 48
}

const makeLine = (left, right, width) => {
  const l = String(left)
  const r = String(right)
  const spaces = width - l.length - r.length
  if (spaces <= 0) return encodeText((l.substring(0, width - r.length - 1) + ' ' + r).substring(0, width))
  return encodeText(l + ' '.repeat(spaces) + r)
}

const trunc = (text, maxLen) => String(text || '').substring(0, maxLen)
const divider = (char, width) => encodeText(char.repeat(width))

const makeQR = (content) => {
  const data = encodeText(content)
  const len  = data.length + 3
  const lenL = len & 0xFF
  const lenH = (len >> 8) & 0xFF
  return [
    ...CMD.QR_MODEL,
    ...CMD.QR_SIZE,
    ...CMD.QR_ERROR,
    GS, 0x28, 0x6B, lenL, lenH, 0x31, 0x50, 0x30, ...data,
    ...CMD.QR_PRINT,
  ]
}

// ──────────────────────────────────────────
// ✅ LOGO ESC/POS — GS v 0 (Raster Bit Image)
// Fonksyone pou 57mm (maxPx=240) ak 80mm (maxPx=384)
// ──────────────────────────────────────────
const logoToEscPos = (logoBase64, maxWidthPx) => new Promise((resolve) => {
  if (!logoBase64) return resolve([])
  try {
    const img = new Image()
    img.onload = () => {
      try {
        const MAX_W = maxWidthPx || 240
        const MAX_H = 100  // limite wotè pou pa gaspiye papye

        let w = img.width
        let h = img.height

        // Rezize propòsyonèl
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W }
        if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H }

        // Lajè DWE miltip de 8 (ESC/POS obligasyon)
        w = Math.floor(w / 8) * 8
        if (w < 8 || h < 1) return resolve([])

        const canvas = document.createElement('canvas')
        canvas.width  = w
        canvas.height = h
        const ctx = canvas.getContext('2d')

        // Fon blan — printer thermal pa konprann transparans
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)

        const imageData   = ctx.getImageData(0, 0, w, h)
        const pixels      = imageData.data
        const bytesPerRow = w / 8
        const bitmap      = []

        // Konvèti chak pixel an 1 bit (noir = enprime, blan = vid)
        for (let y = 0; y < h; y++) {
          for (let bx = 0; bx < bytesPerRow; bx++) {
            let byte = 0
            for (let bit = 0; bit < 8; bit++) {
              const x   = bx * 8 + bit
              const idx = (y * w + x) * 4
              const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
              if (lum < 128) byte |= (0x80 >> bit)
            }
            bitmap.push(byte)
          }
        }

        // GS v 0 — kòmand raster bit image
        const xL = bytesPerRow & 0xFF
        const xH = (bytesPerRow >> 8) & 0xFF
        const yL = h & 0xFF
        const yH = (h >> 8) & 0xFF

        resolve([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH, ...bitmap])
      } catch (e) {
        console.warn('Logo bitmap echwe:', e)
        resolve([])
      }
    }
    img.onerror = () => resolve([])
    img.src = logoBase64
  } catch (e) {
    resolve([])
  }
})

const sendBytes = async (bytes) => {
  if (!_char) throw new Error('Printer pa konekte')
  const CHUNK = 100
  for (let i = 0; i < bytes.length; i += CHUNK) {
    await _char.writeValue(new Uint8Array(bytes.slice(i, i + CHUNK)))
    await new Promise(r => setTimeout(r, 20))
  }
}

export const connectPrinter = async () => {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth pa sipote. Itilize Chrome Android.')
  }
  try {
    _device = await navigator.bluetooth.requestDevice({
      filters: [
        { name: 'MTP-II_A4AD' },
        { namePrefix: 'MTP' },
        { namePrefix: 'PT-210' },
        { namePrefix: 'Goojprt' },
      ],
      optionalServices: [PRINTER_SERVICE_UUID, PRINTER_SERVICE_UUID_2]
    })
    const server = await _device.gatt.connect()
    _device.addEventListener('gattserverdisconnected', () => { _char = null; _device = null })
    try {
      const svc = await server.getPrimaryService(PRINTER_SERVICE_UUID)
      _char = await svc.getCharacteristic(PRINTER_CHAR_UUID)
    } catch {
      const svc = await server.getPrimaryService(PRINTER_SERVICE_UUID_2)
      _char = await svc.getCharacteristic(PRINTER_CHAR_UUID_2)
    }
    return _device.name || 'Goojprt PT-210'
  } catch (err) {
    _char = null; _device = null
    throw err
  }
}

export const disconnectPrinter = () => {
  if (_device?.gatt?.connected) _device.gatt.disconnect()
  _char = null; _device = null
}

export const isPrinterConnected = () => !!_char && !!_device?.gatt?.connected

export const printInvoice = async (invoice, tenant) => {
  if (!_char) throw new Error('Printer pa konekte')

  const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  const W    = getWidth(tenant)
  const snap = invoice.clientSnapshot || {}
  const is57 = W <= 32  // 57mm papye

  const lastPay = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1]
    : null

  const statusText =
    invoice.status === 'paid'      ? L.statusPaid :
    invoice.status === 'partial'   ? L.statusPartial :
    invoice.status === 'cancelled' ? L.statusCancelled :
    L.statusUnpaid

  const qrContent = `${window.location.origin}/app/invoices/${invoice.id}\n${invoice.invoiceNumber}`

  // ✅ Logo: 57mm = 240px max, 80mm = 384px max
  const logoBytes = await logoToEscPos(tenant?.logoUrl || null, is57 ? 240 : 384)
  const hasLogo   = logoBytes.length > 0

  const isWide = W >= 48
  const C = isWide
    ? { name: 20, qty: 4, price: 12, total: 12 }
    : { name: 12, qty: 3, price: 8,  total: 9  }

  const itemHdr = isWide
    ? trunc(L.product, C.name).padEnd(C.name) + trunc(L.qty, C.qty).padStart(C.qty) + trunc(L.unitPrice, C.price).padStart(C.price) + trunc(L.total, C.total).padStart(C.total)
    : trunc(L.item, C.name).padEnd(C.name) + L.q.padStart(C.qty) + trunc(L.pri, C.price).padStart(C.price) + L.tot.padStart(C.total)

  const bytes = [
    ...CMD.INIT,

    // ── LOGO (si disponib)
    ...(hasLogo ? [
      ...CMD.ALIGN_CENTER,
      ...logoBytes,
      ...CMD.LINE_FEED,
    ] : []),

    // ── NON BIZNIS
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText(trunc(tenant?.businessName || tenant?.name || 'PLUS GROUP', W) + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...encodeText(tenant.phone + '\n')]   : []),
    ...(tenant?.address ? [...encodeText(trunc(tenant.address, W) + '\n')] : []),
    ...CMD.LINE_FEED,

    // ── TITRE RESI
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText(L.receipt + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,

    // ── NIMEWO FAKTI
    ...CMD.ALIGN_LEFT,
    ...CMD.BOLD_ON,
    ...encodeText(L.invoiceNo + '\n'),
    ...CMD.BOLD_OFF,
    ...CMD.ALIGN_CENTER,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText(invoice.invoiceNumber + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.ALIGN_LEFT,
    ...CMD.LINE_FEED,

    // ── DAT + TAUX
    ...makeLine(L.date + ':', new Date(invoice.issueDate).toLocaleDateString('fr-HT') + ' ' + new Date(invoice.issueDate).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }), W), ...CMD.LINE_FEED,
    ...(invoice.exchangeRate
      ? [...makeLine(L.rate + ': 1 USD =', Number(invoice.exchangeRate).toFixed(2) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    // ── KLIYAN
    ...(snap.name ? [
      ...divider('-', W), ...CMD.LINE_FEED,
      ...CMD.BOLD_ON,
      ...encodeText(L.client + ':\n'),
      ...CMD.BOLD_OFF,
      ...encodeText(trunc(snap.name, W) + '\n'),
      ...(snap.phone ? [...encodeText(L.phone + ': ' + snap.phone + '\n')] : []),
      ...(snap.email ? [...CMD.SMALL_FONT, ...encodeText(snap.email + '\n'), ...CMD.NORMAL_FONT] : []),
      ...(snap.nif   ? [...encodeText('NIF: ' + snap.nif + '\n')] : []),
    ] : []),

    // ── TABLO ATIK
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...CMD.BOLD_ON,
    ...encodeText(itemHdr.substring(0, W) + '\n'),
    ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,

    ...(invoice.items || []).flatMap(item => {
      const nom = trunc(item.product?.name || item.productSnapshot?.name || '?', C.name)
      const qte = String(Number(item.quantity)).padStart(C.qty)
      const pri = fmt(item.unitPriceHtg).padStart(C.price)
      const tot = fmt(item.totalHtg).padStart(C.total)
      const row = nom.padEnd(C.name) + qte + pri + tot
      const result = [...encodeText(row.substring(0, W) + '\n')]
      if (Number(item.discountPct) > 0) {
        result.push(...CMD.SMALL_FONT, ...encodeText('  ' + L.discount + ': ' + item.discountPct + '%\n'), ...CMD.NORMAL_FONT)
      }
      return result
    }),

    ...CMD.NORMAL_FONT,
    ...divider('=', W), ...CMD.LINE_FEED,

    // ── TOTAUX
    ...CMD.ALIGN_LEFT,
    ...makeLine(L.subtotal + ':', fmt(invoice.subtotalHtg) + ' HTG', W), ...CMD.LINE_FEED,
    ...(Number(invoice.discountHtg) > 0
      ? [...makeLine(L.discount + ':', '-' + fmt(invoice.discountHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),
    ...(Number(invoice.taxHtg) > 0
      ? [...makeLine(L.tax + ' (' + Number(invoice.taxRate || 0) + '%):', fmt(invoice.taxHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),
    ...divider('=', W), ...CMD.LINE_FEED,

    // ✅ TOTAL:
    // 57mm → DOUBLE_HEIGHT sèlman (evite tèks koupé)
    // 80mm → DOUBLE_BOTH (gwo + laj)
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...(is57 ? CMD.DOUBLE_HEIGHT : CMD.DOUBLE_BOTH),
    ...encodeText(L.grandTotal + ': ' + fmt(invoice.totalHtg) + ' HTG\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,

    // ── PEMAN
    ...CMD.ALIGN_LEFT,
    ...makeLine(L.paid + ':', fmt(invoice.amountPaidHtg) + ' HTG', W), ...CMD.LINE_FEED,
    ...(Number(invoice.balanceDueHtg) > 0
      ? [...CMD.BOLD_ON, ...makeLine(L.balance + ':', fmt(invoice.balanceDueHtg) + ' HTG', W), ...CMD.LINE_FEED, ...CMD.BOLD_OFF]
      : []),
    ...(lastPay ? [
      ...makeLine(L.payMethod + ':', L.paymentMethods[lastPay.method] || lastPay.method, W), ...CMD.LINE_FEED,
      ...(lastPay.reference ? [...makeLine(L.reference + ':', trunc(lastPay.reference, 20), W), ...CMD.LINE_FEED] : []),
    ] : []),
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── STATUT
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText('[ ' + statusText + ' ]\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── QR CODE
    ...CMD.ALIGN_CENTER,
    ...makeQR(qrContent),
    ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...encodeText(L.scanQr + '\n'),
    ...encodeText(invoice.invoiceNumber + '\n'),
    ...CMD.NORMAL_FONT,
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── PYE PAJ
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...encodeText(L.thankYou + '\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText(L.allSalesFinal + '\n'),
    ...CMD.LINE_FEED,
    ...encodeText(L.poweredBy + '\n'),
    ...CMD.NORMAL_FONT,

    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}
