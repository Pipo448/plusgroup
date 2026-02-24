// src/services/printerService.js
// Goojprt PT-210 — ESC/POS via Web Bluetooth (Android Chrome)
// Resi Trilingg: Kreyòl / Français / English

const PRINTER_SERVICE_UUID   = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHAR_UUID      = '00002af1-0000-1000-8000-00805f9b34fb'
const PRINTER_SERVICE_UUID_2 = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_CHAR_UUID_2    = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

let _device = null
let _char   = null

// ── ESC/POS kòmand
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

// ── Tradiksyon etikèt (KR | FR | EN)
// Fòma: "Kreyòl / Français / English"
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
  payMethod:     'Metòd peman / Mode paiement / Payment method',
  reference:     'Referans / Reference / Reference',
  scanQr:        'Skane pou verifye / Scanner pour verifier / Scan to verify',
  thankYou:      'Mesi pou biznis ou! / Merci pour votre confiance! / Thank you for your business!',
  allSalesFinal: 'Vant final. / Vente finale. / All sales are final.',
  poweredBy:     'Powered by PlusGroup',
  // Statut
  statusPaid:      'PEYE / PAYE / PAID',
  statusPartial:   'PEMAN PASYAL / PAIEMENT PARTIEL / PARTIAL PAYMENT',
  statusCancelled: 'ANILE / ANNULE / CANCELLED',
  statusUnpaid:    'IMPAYE / NON PAYE / UNPAID',
  // Kolòn ti tablo (fòma kout pou 57mm)
  item:          'Atik/Art./Item',
  q:             'Q',
  pri:           'Pri/Pr./Pr.',
  tot:           'Tot',
  // Peman
  paymentMethods: {
    cash:     'Kach / Cash / Cash',
    moncash:  'MonCash / MonCash / MonCash',
    natcash:  'NatCash / NatCash / NatCash',
    card:     'Kat / Carte / Card',
    transfer: 'Virement / Virement / Transfer',
    check:    'Chek / Cheque / Check',
    other:    'Lòt / Autre / Other',
  }
}

// ── Retire aksan pou ESC/POS
const encodeText = (text) => {
  const clean = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '?')
  return Array.from(clean).map(c => c.charCodeAt(0))
}

// ── Lajè: 80mm = 48 karaktè, 57mm = 32 karaktè
const getWidth = (tenant) => {
  const size = tenant?.receiptSize || '80mm'
  return size === '57mm' ? 32 : 48
}

// ── Liy goch + dwat
const makeLine = (left, right, width) => {
  const l = String(left)
  const r = String(right)
  const spaces = width - l.length - r.length
  if (spaces <= 0) return encodeText((l.substring(0, width - r.length - 1) + ' ' + r).substring(0, width))
  return encodeText(l + ' '.repeat(spaces) + r)
}

// ── Tronke yon tèks si li twò long
const trunc = (text, maxLen) => String(text || '').substring(0, maxLen)

// ── Separatè
const divider = (char, width) => encodeText(char.repeat(width))

// ── QR Code bytes
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

// ── Voye bytes nan printer chunk pa chunk
const sendBytes = async (bytes) => {
  if (!_char) throw new Error('Printer pa konekte')
  const CHUNK = 100
  for (let i = 0; i < bytes.length; i += CHUNK) {
    await _char.writeValue(new Uint8Array(bytes.slice(i, i + CHUNK)))
    await new Promise(r => setTimeout(r, 20))
  }
}

// ──────────────────────────────────────────
// Koneksyon
// ──────────────────────────────────────────
export const connectPrinter = async () => {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth pa sipòte. Itilize Chrome Android.')
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

// ──────────────────────────────────────────
// Enprime Resi Trilingg (KR / FR / EN)
// ──────────────────────────────────────────
export const printInvoice = async (invoice, tenant) => {
  if (!_char) throw new Error('Printer pa konekte')

  const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  const W    = getWidth(tenant)
  const snap = invoice.clientSnapshot || {}

  const lastPay = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1]
    : null

  // Statut trilingg
  const statusText =
    invoice.status === 'paid'      ? L.statusPaid :
    invoice.status === 'partial'   ? L.statusPartial :
    invoice.status === 'cancelled' ? L.statusCancelled :
    L.statusUnpaid

  const qrContent = `${window.location.origin}/app/invoices/${invoice.id}\n${invoice.invoiceNumber}`

  // ── Dimansyon kolòn atik selon lajè papye
  const isWide = W >= 48
  // 80mm: non(20) + qte(4) + pri(12) + tot(12) = 48
  // 57mm: non(12) + qte(3) + pri(8)  + tot(9)  = 32
  const C = isWide
    ? { name: 20, qty: 4, price: 12, total: 12 }
    : { name: 12, qty: 3, price: 8,  total: 9  }

  // Entèt kolòn trilingg (2 liy)
  const itemHdr1 = isWide
    ? trunc(L.product, C.name).padEnd(C.name) + trunc(L.qty, C.qty).padStart(C.qty) + trunc(L.unitPrice, C.price).padStart(C.price) + trunc(L.total, C.total).padStart(C.total)
    : trunc(L.item, C.name).padEnd(C.name) + L.q.padStart(C.qty) + trunc(L.pri, C.price).padStart(C.price) + L.tot.padStart(C.total)

  const bytes = [
    ...CMD.INIT,

    // ════════════════════════════
    // ANTÈT — Non biznis
    // ════════════════════════════
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText(trunc(tenant?.businessName || tenant?.name || 'PLUS GROUP', W) + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...encodeText(tenant.phone + '\n')]   : []),
    ...(tenant?.address ? [...encodeText(trunc(tenant.address, W) + '\n')] : []),
    ...CMD.LINE_FEED,

    // ════════════════════════════
    // TITRE RESI (trilingg)
    // ════════════════════════════
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText(L.receipt + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,

    // ════════════════════════════
    // INFO FAKTI
    // ════════════════════════════
    ...CMD.ALIGN_LEFT,
    // Nimewo
    ...CMD.BOLD_ON,
    ...encodeText(L.invoiceNo + '\n'),
    ...CMD.BOLD_OFF,
    ...CMD.ALIGN_CENTER,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText(invoice.invoiceNumber + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.ALIGN_LEFT,
    ...CMD.LINE_FEED,

    // Dat
    ...makeLine(L.date + ':', new Date(invoice.issueDate).toLocaleDateString('fr-HT') + ' ' + new Date(invoice.issueDate).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }), W), ...CMD.LINE_FEED,

    // Taux (si disponib)
    ...(invoice.exchangeRate
      ? [...makeLine(L.rate + ': 1 USD =', Number(invoice.exchangeRate).toFixed(2) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    // ════════════════════════════
    // KLIYAN
    // ════════════════════════════
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

    // ════════════════════════════
    // TABLO ATIK
    // ════════════════════════════
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...CMD.BOLD_ON,
    ...encodeText(itemHdr1.substring(0, W) + '\n'),
    ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,

    // Atik yo
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

    // ════════════════════════════
    // TOTAUX
    // ════════════════════════════
    ...CMD.ALIGN_LEFT,
    ...makeLine(L.subtotal + ':', fmt(invoice.subtotalHtg) + ' HTG', W), ...CMD.LINE_FEED,

    ...(Number(invoice.discountHtg) > 0
      ? [...makeLine(L.discount + ':', '-' + fmt(invoice.discountHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    ...(Number(invoice.taxHtg) > 0
      ? [...makeLine(L.tax + ' (' + Number(invoice.taxRate || 0) + '%):', fmt(invoice.taxHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    ...divider('=', W), ...CMD.LINE_FEED,

    // TOTAL (gwo, trilingg)
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText(L.grandTotal + ': ' + fmt(invoice.totalHtg) + ' HTG\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,

    // ════════════════════════════
    // PEMAN
    // ════════════════════════════
    ...CMD.ALIGN_LEFT,
    ...makeLine(L.paid + ':', fmt(invoice.amountPaidHtg) + ' HTG', W), ...CMD.LINE_FEED,

    ...(Number(invoice.balanceDueHtg) > 0
      ? [
          ...CMD.BOLD_ON,
          ...makeLine(L.balance + ':', fmt(invoice.balanceDueHtg) + ' HTG', W), ...CMD.LINE_FEED,
          ...CMD.BOLD_OFF,
        ]
      : []),

    ...(lastPay
      ? [
          ...makeLine(L.payMethod + ':', L.paymentMethods[lastPay.method] || lastPay.method, W), ...CMD.LINE_FEED,
          ...(lastPay.reference
            ? [...makeLine(L.reference + ':', trunc(lastPay.reference, 20), W), ...CMD.LINE_FEED]
            : []),
        ]
      : []),

    ...divider('-', W), ...CMD.LINE_FEED,

    // ════════════════════════════
    // STATUT BADGE (trilingg)
    // ════════════════════════════
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText('[ ' + statusText + ' ]\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    ...divider('-', W), ...CMD.LINE_FEED,

    // ════════════════════════════
    // QR CODE
    // ════════════════════════════
    ...CMD.ALIGN_CENTER,
    ...makeQR(qrContent),
    ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...encodeText(L.scanQr + '\n'),
    ...encodeText(invoice.invoiceNumber + '\n'),
    ...CMD.NORMAL_FONT,

    ...divider('-', W), ...CMD.LINE_FEED,

    // ════════════════════════════
    // PYE PAJ (trilingg)
    // ════════════════════════════
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...encodeText(L.thankYou + '\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText(L.allSalesFinal + '\n'),
    ...CMD.LINE_FEED,
    ...encodeText(L.poweredBy + '\n'),
    ...CMD.NORMAL_FONT,

    // Espas + Koupe
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}
