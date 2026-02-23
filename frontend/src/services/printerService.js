// src/services/printerService.js
// Goojprt PT-210 — ESC/POS via Web Bluetooth (Android Chrome)

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
  DOUBLE_BOTH:   [ESC, 0x21, 0x30],  // doub lajè + wotè
  NORMAL_SIZE:   [ESC, 0x21, 0x00],
  SMALL_FONT:    [ESC, 0x4D, 0x01],
  NORMAL_FONT:   [ESC, 0x4D, 0x00],
  LINE_FEED:     [LF],
  CUT:           [GS, 0x56, 0x41, 0x03],
  // QR Code ESC/POS
  QR_MODEL:      [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], // model 2
  QR_SIZE:       [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06],       // size 6
  QR_ERROR:      [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30],       // error M
  QR_PRINT:      [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30],       // print
}

// ── Retire aksan pou ESC/POS (pa sipòte UTF-8 nòmalman)
const encodeText = (text) => {
  const clean = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '?')
  return Array.from(clean).map(c => c.charCodeAt(0))
}

// ── Lajè pou 80mm = 48 karaktè, 58mm = 32 karaktè
const getWidth = (tenant) => {
  const size = tenant?.receiptSize || '80mm'
  return size === '57mm' ? 32 : 48
}

// ── Liy avèk goch ak dwat
const makeLine = (left, right, width) => {
  const l = String(left)
  const r = String(right)
  const spaces = width - l.length - r.length
  if (spaces <= 0) return encodeText((l.substring(0, width - r.length - 1) + ' ' + r).substring(0, width))
  return encodeText(l + ' '.repeat(spaces) + r)
}

// ── Separatè
const divider = (char, width) => encodeText(char.repeat(width))

// ── QR Code bytes pou yon URL/tèks
const makeQR = (content) => {
  const data    = encodeText(content)
  const len     = data.length + 3
  const lenL    = len & 0xFF
  const lenH    = (len >> 8) & 0xFF
  return [
    ...CMD.QR_MODEL,
    ...CMD.QR_SIZE,
    ...CMD.QR_ERROR,
    // Stoke done QR a
    GS, 0x28, 0x6B, lenL, lenH, 0x31, 0x50, 0x30, ...data,
    // Enprime QR a
    ...CMD.QR_PRINT,
  ]
}

// ── Voye bytes nan printer (chunk pa chunk)
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
// Enprime Resi — menm konsepsyon ak HTML popup la
// ──────────────────────────────────────────
export const printInvoice = async (invoice, tenant) => {
  if (!_char) throw new Error('Printer pa konekte')

  const fmt   = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  const W     = getWidth(tenant) // 48 pou 80mm, 32 pou 57mm
  const snap  = invoice.clientSnapshot || {}

  // Dènye peman
  const lastPay = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1]
    : null

  const PAYMENT_LABELS = {
    cash: 'Cash', moncash: 'MonCash', natcash: 'NatCash',
    card: 'Carte', transfer: 'Virement', check: 'Cheque', other: 'Autre'
  }

  const statusText =
    invoice.status === 'paid'      ? '*** FULLY PAID ***' :
    invoice.status === 'partial'   ? '--- PEMAN PASYAL ---' :
    invoice.status === 'cancelled' ? '--- ANILE ---' :
    '--- IMPAYE ---'

  // QR content = URL fakti + nimewo
  const qrContent = `${window.location.origin}/invoices/${invoice.id}\n${invoice.invoiceNumber}`

  // ── Kolòn atik: Pwodui | Qty | Pri U. | Total
  // Lajè kolòn selon tay papye
  const isWide = W >= 48
  const C = isWide
    ? { name: 20, qty: 4, price: 10, total: 12 }  // 80mm: 20+4+10+12 = 46 + 2 espas = 48
    : { name: 12, qty: 3, price: 7, total: 8 }    // 57mm: 12+3+7+8 = 30 + 2 espas = 32

  const itemHeader = isWide
    ? 'Pwodui'.padEnd(C.name) + 'Qty'.padStart(C.qty) + 'Pri U.'.padStart(C.price) + 'Total'.padStart(C.total)
    : 'Atik'.padEnd(C.name) + 'Q'.padStart(C.qty) + 'Pri'.padStart(C.price) + 'Tot'.padStart(C.total)

  const bytes = [
    ...CMD.INIT,

    // ── HEADER: Non biznis
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    // Telefòn + Adrès
    ...(tenant?.phone   ? [...encodeText('\u{1F4DE} ' + tenant.phone + '\n')]   : []),
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')]               : []),
    ...CMD.LINE_FEED,

    // ── TITRE
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText('SALES RECEIPT\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── INFO FAKTI
    ...CMD.ALIGN_LEFT,
    ...makeLine('Invoice No.:', invoice.invoiceNumber || '', W), ...CMD.LINE_FEED,
    ...makeLine('Date:', new Date(invoice.issueDate).toLocaleDateString('fr-HT') + ' ' + new Date(invoice.issueDate).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }), W), ...CMD.LINE_FEED,
    ...(tenant?.exchangeRate
      ? [...makeLine('Rate: 1 USD =', Number(tenant.exchangeRate).toFixed(2) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    // ── KLIYAN
    ...(snap.name
      ? [
          ...divider('-', W), ...CMD.LINE_FEED,
          ...CMD.BOLD_ON,
          ...encodeText('Client: ' + snap.name.substring(0, W - 8) + '\n'),
          ...CMD.BOLD_OFF,
          ...(snap.phone ? [...encodeText('Tel: ' + snap.phone + '\n')] : []),
        ]
      : []),

    // ── TABLO ATIK
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...CMD.BOLD_ON,
    ...encodeText(itemHeader + '\n'),
    ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,

    // Atik yo (yon pa yon)
    ...(invoice.items || []).flatMap(item => {
      const nom   = (item.product?.name || item.productSnapshot?.name || 'Atik').substring(0, C.name)
      const qte   = String(Number(item.quantity)).padStart(C.qty)
      const pri   = fmt(item.unitPriceHtg).padStart(C.price)
      const tot   = fmt(item.totalHtg).padStart(C.total)
      const row   = nom.padEnd(C.name) + qte + pri + tot

      const result = [...encodeText(row.substring(0, W) + '\n')]

      // Si remiz, afiche li
      if (Number(item.discountPct) > 0) {
        result.push(...encodeText('  Remiz: ' + item.discountPct + '%\n'))
      }
      return result
    }),

    ...CMD.NORMAL_FONT,
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── TOTAUX
    ...CMD.ALIGN_LEFT,
    ...makeLine('Subtotal:', fmt(invoice.subtotalHtg) + ' HTG', W), ...CMD.LINE_FEED,
    ...(Number(invoice.discountHtg) > 0
      ? [...makeLine('Remiz:', '-' + fmt(invoice.discountHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),
    ...(Number(invoice.taxHtg) > 0
      ? [...makeLine('TVA (' + Number(invoice.taxRate) + '%):', fmt(invoice.taxHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    ...divider('=', W), ...CMD.LINE_FEED,

    // ── TOTAL (gwo)
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText('TOTAL: ' + fmt(invoice.totalHtg) + ' HTG\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    ...divider('=', W), ...CMD.LINE_FEED,

    // ── PEMAN
    ...CMD.ALIGN_LEFT,
    ...CMD.BOLD_ON,
    ...encodeText('Amount paid: '),
    ...CMD.BOLD_OFF,
    ...encodeText(fmt(invoice.amountPaidHtg) + ' HTG\n'),

    ...(Number(invoice.balanceDueHtg) > 0
      ? [
          ...CMD.BOLD_ON,
          ...encodeText('Balance: '),
          ...CMD.BOLD_OFF,
          ...encodeText(fmt(invoice.balanceDueHtg) + ' HTG\n'),
        ]
      : []),

    // Metòd peman
    ...(lastPay
      ? [
          ...makeLine('Payment method:', PAYMENT_LABELS[lastPay.method] || lastPay.method, W), ...CMD.LINE_FEED,
          ...(lastPay.reference
            ? [...makeLine('Reference:', lastPay.reference, W), ...CMD.LINE_FEED]
            : []),
        ]
      : []),

    ...divider('-', W), ...CMD.LINE_FEED,

    // ── STATUT BADGE
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText(statusText + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    ...divider('-', W), ...CMD.LINE_FEED,

    // ── QR CODE (ESC/POS natif)
    ...CMD.ALIGN_CENTER,
    ...makeQR(qrContent),
    ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...encodeText('Scan QR to verify this invoice\n'),
    ...encodeText(invoice.invoiceNumber + '\n'),
    ...CMD.NORMAL_FONT,

    ...divider('-', W), ...CMD.LINE_FEED,

    // ── PYE PAJ
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...encodeText('Thank you for your business!\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText('Payment: Cash, MonCash, NatCash.\n'),
    ...encodeText('All sales are final.\n'),
    ...CMD.LINE_FEED,
    ...encodeText('Powered by PlusGroup\n'),
    ...CMD.NORMAL_FONT,

    // ── Espas + Koupe
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}
