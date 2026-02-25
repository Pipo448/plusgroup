// src/services/printerService.js
// Goojprt PT-210 — ESC/POS via Web Bluetooth (Android Chrome)

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

// ── Retire aksan — ESC/POS pa sipote UTF-8
const encodeText = (text) => {
  const clean = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '?')
  return Array.from(clean).map(c => c.charCodeAt(0))
}

const getWidth = (tenant) => {
  const size = (tenant && tenant.receiptSize) || '80mm'
  return size === '57mm' ? 32 : 48
}

const makeLine = (left, right, width) => {
  const l = String(left)
  const r = String(right)
  const spaces = width - l.length - r.length
  if (spaces <= 0) return encodeText((l.substring(0, width - r.length - 1) + ' ' + r).substring(0, width))
  return encodeText(l + ' '.repeat(spaces) + r)
}

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

// ── Konvèti logo base64 an bitmap ESC/POS (GS v 0)
const logoToEscPos = async (base64url, targetWidth) => {
  try {
    // Kreye canvas pou dessine logo a
    const canvas = document.createElement('canvas')
    const ctx    = canvas.getContext('2d')
    const img    = new Image()

    await new Promise((resolve, reject) => {
      img.onload  = resolve
      img.onerror = reject
      img.src     = base64url
    })

    // Kalkile wotè pwoposyonèl — max 80px wotè
    const maxH  = 80
    const ratio = Math.min(targetWidth / img.width, maxH / img.height)
    const w     = Math.floor(img.width  * ratio)
    const h     = Math.floor(img.height * ratio)

    // Lajè dwe miltip de 8 pou ESC/POS
    const pw = Math.ceil(w / 8) * 8
    canvas.width  = pw
    canvas.height = h

    // Fon blan
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pw, h)
    ctx.drawImage(img, 0, 0, w, h)

    // Konvèti an noir/blan (threshold)
    const imgData = ctx.getImageData(0, 0, pw, h)
    const pixels  = imgData.data
    const bytesPerRow = pw / 8
    const bitmapBytes = []

    for (let row = 0; row < h; row++) {
      for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x   = byteIdx * 8 + bit
          const idx = (row * pw + x) * 4
          const r   = pixels[idx]
          const g   = pixels[idx + 1]
          const b   = pixels[idx + 2]
          const a   = pixels[idx + 3]
          // Noir si fonce (luminosity < 128) epi pa transparan
          const lum = (r * 0.299 + g * 0.587 + b * 0.114)
          const isBlack = a > 128 && lum < 160
          if (isBlack) byte |= (0x80 >> bit)
        }
        bitmapBytes.push(byte)
      }
    }

    // GS v 0 — enprime bitmap raster
    const widthBytes = bytesPerRow
    const wL = widthBytes & 0xFF
    const wH = (widthBytes >> 8) & 0xFF
    const hL = h & 0xFF
    const hH = (h >> 8) & 0xFF

    return [
      GS, 0x76, 0x30, 0x00, wL, wH, hL, hH,
      ...bitmapBytes
    ]
  } catch (e) {
    console.warn('Logo bitmap error:', e)
    return []
  }
}

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
  if (_device && _device.gatt && _device.gatt.connected) _device.gatt.disconnect()
  _char = null; _device = null
}

export const isPrinterConnected = () => !!_char && !!(_device && _device.gatt && _device.gatt.connected)

export const printInvoice = async (invoice, tenant) => {
  if (!_char) throw new Error('Printer pa konekte')

  const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  const W    = getWidth(tenant)
  const snap = invoice.clientSnapshot || {}

  // Parse exchangeRates
  const exchangeRates = (() => {
    try {
      const er = tenant && tenant.exchangeRates
      if (!er) return {}
      if (typeof er === 'object') return er
      return JSON.parse(String(er))
    } catch(e) { return {} }
  })()

  const rateUSD  = Number(exchangeRates.USD || (tenant && tenant.exchangeRate) || 0)
  const rateDOP  = Number(exchangeRates.DOP || 0)
  const totalHtg = Number(invoice.totalHtg || 0)

  const lastPay = invoice.payments && invoice.payments.length > 0
    ? invoice.payments[invoice.payments.length - 1]
    : null

  const PAYMENT_LABELS = {
    cash: 'Kach/Cash', moncash: 'MonCash', natcash: 'NatCash',
    card: 'Kat/Carte', transfer: 'Virement', check: 'Chek/Cheque', other: 'Lot/Autre'
  }

  const statusText =
    invoice.status === 'paid'      ? 'PEYE / PAYE / PAID' :
    invoice.status === 'partial'   ? 'PASYAL / PARTIEL / PARTIAL' :
    invoice.status === 'cancelled' ? 'ANILE / ANNULE / CANCELLED' :
    'IMPAYE / NON PAYE / UNPAID'

  const qrContent = window.location.origin + '/app/invoices/' + invoice.id + '\n' + invoice.invoiceNumber

  const isWide = W >= 48
  const C = isWide
    ? { name: 20, qty: 4, price: 10, total: 12 }
    : { name: 12, qty: 3, price: 7,  total: 8  }

  const itemHeader = isWide
    ? 'Pwodui/Product'.padEnd(C.name) + 'Qte'.padStart(C.qty) + 'Pri/Prix'.padStart(C.price) + 'Total'.padStart(C.total)
    : 'Atik'.padEnd(C.name) + 'Q'.padStart(C.qty) + 'Pri'.padStart(C.price) + 'Tot'.padStart(C.total)

  // ── Logo bitmap (si disponib)
  const logoUrl   = tenant && (tenant.logoUrl || tenant.logo)
  const logoBytes = logoUrl ? await logoToEscPos(logoUrl, W === 48 ? 200 : 140) : []

  const bytes = [
    ...CMD.INIT,

    // LOGO (si disponib)
    ...(logoBytes.length > 0 ? [
      ...CMD.ALIGN_CENTER,
      ...logoBytes,
      ...CMD.LINE_FEED,
    ] : []),

    // NOM BIZNIS
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant && (tenant.businessName || tenant.name) || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    // Telefon + Adres
    ...(tenant && tenant.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')]   : []),
    ...(tenant && tenant.address ? [...encodeText(tenant.address + '\n')]           : []),
    ...CMD.LINE_FEED,

    // TITRE TRILENG
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText('Resi / Recu / Receipt\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,

    // INFO FAKTI
    ...CMD.ALIGN_LEFT,
    ...makeLine('No. Fakti/Invoice:', invoice.invoiceNumber || '', W), ...CMD.LINE_FEED,
    ...makeLine('Dat/Date:', new Date(invoice.issueDate).toLocaleDateString('fr-HT') + ' ' + new Date(invoice.issueDate).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }), W), ...CMD.LINE_FEED,

    // KLIYAN
    ...(snap.name ? [
      ...divider('-', W), ...CMD.LINE_FEED,
      ...CMD.BOLD_ON,
      ...encodeText('Kliyan/Client: ' + snap.name.substring(0, W - 15) + '\n'),
      ...CMD.BOLD_OFF,
      ...(snap.phone ? [...encodeText('Tel: ' + snap.phone + '\n')] : []),
    ] : []),

    // TABLO ATIK
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...CMD.BOLD_ON,
    ...encodeText(itemHeader + '\n'),
    ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,

    ...(invoice.items || []).flatMap(item => {
      const nom  = (item.product && item.product.name || item.productSnapshot && item.productSnapshot.name || 'Atik').substring(0, C.name)
      const qte  = String(Number(item.quantity)).padStart(C.qty)
      const pri  = fmt(item.unitPriceHtg).padStart(C.price)
      const tot  = fmt(item.totalHtg).padStart(C.total)
      const row  = nom.padEnd(C.name) + qte + pri + tot
      const result = [...encodeText(row.substring(0, W) + '\n')]
      if (Number(item.discountPct) > 0) {
        result.push(...encodeText('  Remiz/Remise: ' + item.discountPct + '%\n'))
      }
      return result
    }),

    ...CMD.NORMAL_FONT,
    ...divider('-', W), ...CMD.LINE_FEED,

    // TOTAUX
    ...CMD.ALIGN_LEFT,
    ...(Number(invoice.discountHtg) > 0
      ? [...makeLine('Remiz/Remise/Disc.:', '-' + fmt(invoice.discountHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),
    ...(Number(invoice.taxHtg) > 0
      ? [...makeLine('Taks/Tax (' + Number(invoice.taxRate) + '%):', fmt(invoice.taxHtg) + ' HTG', W), ...CMD.LINE_FEED]
      : []),

    ...divider('=', W), ...CMD.LINE_FEED,

    // TOTAL GWO + 3 deviz
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText('TOTAL: ' + fmt(totalHtg) + ' HTG\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    ...(rateUSD > 0 ? [...CMD.ALIGN_CENTER, ...CMD.SMALL_FONT, ...encodeText('aprox. USD: $' + (totalHtg / rateUSD).toFixed(2) + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(rateDOP > 0 ? [...CMD.ALIGN_CENTER, ...CMD.SMALL_FONT, ...encodeText('aprox. DOP: RD$' + (totalHtg / rateDOP).toFixed(2) + '\n'), ...CMD.NORMAL_FONT] : []),

    ...divider('=', W), ...CMD.LINE_FEED,

    // PEMAN
    ...CMD.ALIGN_LEFT,
    ...CMD.BOLD_ON,
    ...encodeText('Peye/Paye/Paid: '),
    ...CMD.BOLD_OFF,
    ...encodeText(fmt(invoice.amountPaidHtg) + ' HTG\n'),

    ...(Number(invoice.balanceDueHtg) > 0 ? [
      ...CMD.BOLD_ON,
      ...encodeText('Balans/Solde/Balance: '),
      ...CMD.BOLD_OFF,
      ...encodeText(fmt(invoice.balanceDueHtg) + ' HTG\n'),
    ] : []),

    ...(lastPay ? [
      ...makeLine('Metod/Mode/Method:', PAYMENT_LABELS[lastPay.method] || lastPay.method, W), ...CMD.LINE_FEED,
      ...(lastPay.reference ? [...makeLine('Ref:', lastPay.reference, W), ...CMD.LINE_FEED] : []),
    ] : []),

    ...divider('-', W), ...CMD.LINE_FEED,

    // STATUT TRILENG
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText(statusText + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    ...divider('-', W), ...CMD.LINE_FEED,

    // QR CODE
    ...CMD.ALIGN_CENTER,
    ...makeQR(qrContent),
    ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT,
    ...encodeText('Skane/Scanner/Scan to verify\n'),
    ...encodeText(invoice.invoiceNumber + '\n'),
    ...CMD.NORMAL_FONT,

    ...divider('=', W), ...CMD.LINE_FEED,

    // PYE PAJ
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...encodeText('Mesi! / Merci! / Thank you!\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText('Pwodwi pa / Propulse par / Powered by\n'),
    ...CMD.BOLD_ON,
    ...encodeText('PlusGroup\n'),
    ...CMD.BOLD_OFF,
    ...encodeText('Tel: +50942449024\n'),
    ...CMD.NORMAL_FONT,

    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}
