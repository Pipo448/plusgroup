// src/services/printerService.js
// ESC/POS via QZ Tray (Windows/Mac/Linux) + Web Bluetooth fallback (Android Chrome)
// Compatible: Epson, Goojprt, Xprinter, Rongta, Star, Bixolon — USB, WiFi, Bluetooth, COM

// ── Bluetooth UUIDs (fallback Android)
const PRINTER_SERVICE_UUID   = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHAR_UUID      = '00002af1-0000-1000-8000-00805f9b34fb'
const PRINTER_SERVICE_UUID_2 = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_CHAR_UUID_2    = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'
const PRINTER_SERVICE_UUID_3 = '49535343-fe7d-4ae5-8fa9-9fafd205e455' // Rongta, Xprinter
const PRINTER_CHAR_UUID_3    = '49535343-8841-43f4-a8d4-ecbe34729bb3'

// ── State
let _device   = null  // Web Bluetooth device
let _char     = null  // Web Bluetooth characteristic
let _qzConfig = null  // QZ Tray config
let _mode     = null  // 'qz' | 'bluetooth'

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

// ══════════════════════════════════════════════════════════════
// ── QZ TRAY HELPERS
// ══════════════════════════════════════════════════════════════

const loadQzScript = () => new Promise((resolve, reject) => {
  if (window.qz) return resolve()
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js'
  script.onload  = resolve
  script.onerror = () => reject(new Error('QZ Tray script pa chaje. Verifye koneksyon entènèt ou.'))
  document.head.appendChild(script)
})

const connectQz = async () => {
  await loadQzScript()
  if (!window.qz) throw new Error('QZ Tray pa disponib.')

  // Sètifika sinatire — pou pwodwiksyon, ranplase ak yon vrè sètifika
  window.qz.security.setCertificatePromise((resolve) => resolve('-----TRUSTED QZ-CERT-----'))
  window.qz.security.setSignatureAlgorithm('SHA512')
  window.qz.security.setSignaturePromise((toSign) => {
    return (resolve) => resolve('') // Itilize sèlman si w gen yon sètifika siyen
  })

  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 3, delay: 1 })
  }
}

// ── Jwenn lis printer disponib via QZ Tray
export const getQzPrinters = async () => {
  await connectQz()
  const printers = await qz.printers.find()
  return Array.isArray(printers) ? printers : [printers]
}

// ── Konekte sou yon printer spesifik via QZ Tray
export const connectQzPrinter = async (printerName) => {
  await connectQz()
  _qzConfig = qz.configs.create(printerName)
  _mode     = 'qz'
  return printerName
}

// ══════════════════════════════════════════════════════════════
// ── WEB BLUETOOTH HELPERS (Android Chrome)
// ══════════════════════════════════════════════════════════════

const connectBluetooth = async () => {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth pa sipote. Itilize Chrome sou Android, oswa enstale QZ Tray sou Windows.')
  }
  _device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true, // ← Aksepte TOUT printer Bluetooth
    optionalServices: [
      PRINTER_SERVICE_UUID,
      PRINTER_SERVICE_UUID_2,
      PRINTER_SERVICE_UUID_3,
    ]
  })
  const server = await _device.gatt.connect()
  _device.addEventListener('gattserverdisconnected', () => {
    _char = null; _device = null; _mode = null
  })

  // Eseye 3 UUID youn apre lòt
  const attempts = [
    [PRINTER_SERVICE_UUID,   PRINTER_CHAR_UUID  ],
    [PRINTER_SERVICE_UUID_2, PRINTER_CHAR_UUID_2],
    [PRINTER_SERVICE_UUID_3, PRINTER_CHAR_UUID_3],
  ]
  for (const [svcUUID, charUUID] of attempts) {
    try {
      const svc = await server.getPrimaryService(svcUUID)
      _char     = await svc.getCharacteristic(charUUID)
      _mode     = 'bluetooth'
      return _device.name || 'Bluetooth Printer'
    } catch { /* eseye pwochen UUID */ }
  }
  throw new Error('Printer Bluetooth konekte men UUID sèvis pa rekonèt. Eseye QZ Tray pito.')
}

// ══════════════════════════════════════════════════════════════
// ── KONEKTE PRINTER — AUTO DETECT MODE
// ── Si QZ Tray disponib → itilize QZ
// ── Sinon → eseye Web Bluetooth (Android)
// ══════════════════════════════════════════════════════════════

export const connectPrinter = async (printerName = null) => {
  // Eseye QZ Tray an premye (Windows/Mac/Linux)
  try {
    await connectQz()
    if (printerName) {
      return await connectQzPrinter(printerName)
    }
    // Si pa gen non printer, pran defò Windows la
    const printers = await qz.printers.find()
    const list = Array.isArray(printers) ? printers : [printers]
    if (list.length === 0) throw new Error('Pa gen printer enstale sou PC sa a.')
    const defaultPrinter = await qz.printers.getDefault()
    return await connectQzPrinter(defaultPrinter || list[0])
  } catch (qzErr) {
    console.warn('QZ Tray pa disponib, eseye Web Bluetooth...', qzErr.message)
  }

  // Fallback → Web Bluetooth (Android Chrome)
  return await connectBluetooth()
}

export const disconnectPrinter = () => {
  // Dékonekte Bluetooth
  if (_device && _device.gatt && _device.gatt.connected) _device.gatt.disconnect()
  _char = null; _device = null

  // Dékonekte QZ
  if (window.qz && qz.websocket.isActive()) {
    qz.websocket.disconnect().catch(() => {})
  }
  _qzConfig = null
  _mode     = null
}

export const isPrinterConnected = () => {
  if (_mode === 'qz')        return !!_qzConfig
  if (_mode === 'bluetooth') return !!_char && !!(_device?.gatt?.connected)
  return false
}

export const getPrinterMode = () => _mode // 'qz' | 'bluetooth' | null

// ══════════════════════════════════════════════════════════════
// ── SEND BYTES — route selon mode
// ══════════════════════════════════════════════════════════════

const sendBytes = async (bytes) => {
  if (_mode === 'qz') {
    if (!_qzConfig) throw new Error('QZ Tray printer pa konfigire.')
    // Konvèti bytes array an base64 pou QZ Tray
    const b64 = btoa(String.fromCharCode(...bytes))
    const data = [{ type: 'raw', format: 'base64', data: b64 }]
    await qz.print(_qzConfig, data)
    return
  }

  if (_mode === 'bluetooth') {
    if (!_char) throw new Error('Bluetooth printer pa konekte.')
    const CHUNK = 100
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await _char.writeValue(new Uint8Array(bytes.slice(i, i + CHUNK)))
      await new Promise(r => setTimeout(r, 20))
    }
    return
  }

  throw new Error('Pa gen printer konekte. Rele connectPrinter() an premye.')
}

// ══════════════════════════════════════════════════════════════
// ── UTILITÈ ESC/POS (ENCHANGE)
// ══════════════════════════════════════════════════════════════

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

const logoToEscPos = async (base64url, targetWidth) => {
  try {
    const canvas = document.createElement('canvas')
    const ctx    = canvas.getContext('2d')
    const img    = new Image()

    await new Promise((resolve, reject) => {
      img.onload  = resolve
      img.onerror = reject
      img.src     = base64url
    })

    const maxH  = 80
    const ratio = Math.min(targetWidth / img.width, maxH / img.height)
    const w     = Math.floor(img.width  * ratio)
    const h     = Math.floor(img.height * ratio)
    const pw    = Math.ceil(w / 8) * 8

    canvas.width  = pw
    canvas.height = h
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pw, h)
    ctx.drawImage(img, 0, 0, w, h)

    const imgData     = ctx.getImageData(0, 0, pw, h)
    const pixels      = imgData.data
    const bytesPerRow = pw / 8
    const bitmapBytes = []

    for (let row = 0; row < h; row++) {
      for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x   = byteIdx * 8 + bit
          const idx = (row * pw + x) * 4
          const lum = pixels[idx] * 0.299 + pixels[idx+1] * 0.587 + pixels[idx+2] * 0.114
          if (pixels[idx+3] > 128 && lum < 160) byte |= (0x80 >> bit)
        }
        bitmapBytes.push(byte)
      }
    }

    const wL = bytesPerRow & 0xFF
    const wH = (bytesPerRow >> 8) & 0xFF
    const hL = h & 0xFF
    const hH = (h >> 8) & 0xFF

    return [GS, 0x76, 0x30, 0x00, wL, wH, hL, hH, ...bitmapBytes]
  } catch (e) {
    console.warn('Logo bitmap error:', e)
    return []
  }
}

// ══════════════════════════════════════════════════════════════
// ✅ PRINT INVOICE
// ══════════════════════════════════════════════════════════════
export const printInvoice = async (invoice, tenant, cashier = null) => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W    = getWidth(tenant)
  const snap = invoice.clientSnapshot || {}

  const branchName = invoice.branchName
    || invoice.branch?.name
    || localStorage.getItem('plusgroup-branch-name')
    || null

  const cashierName = cashier?.fullName
    || cashier?.name
    || localStorage.getItem('plusgroup-cashier-name')
    || null

  const exchangeRates = (() => {
    try {
      const er = tenant?.exchangeRates
      if (!er) return {}
      return typeof er === 'object' ? er : JSON.parse(String(er))
    } catch { return {} }
  })()

  const rateUSD  = Number(exchangeRates.USD || tenant?.exchangeRate || 0)
  const rateDOP  = Number(exchangeRates.DOP || 0)
  const totalHtg = Number(invoice.totalHtg || 0)

  const lastPay = invoice.payments?.length > 0
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

  const qrContent  = window.location.origin + '/app/invoices/' + invoice.id + '\n' + invoice.invoiceNumber
  const isWide     = W >= 48
  const C = isWide
    ? { name: 20, qty: 4, price: 10, total: 12 }
    : { name: 12, qty: 3, price: 7,  total: 8  }

  const itemHeader = isWide
    ? 'Pwodui/Product'.padEnd(C.name) + 'Qte'.padStart(C.qty) + 'Pri/Prix'.padStart(C.price) + 'Total'.padStart(C.total)
    : 'Atik'.padEnd(C.name) + 'Q'.padStart(C.qty) + 'Pri'.padStart(C.price) + 'Tot'.padStart(C.total)

  const logoUrl   = tenant && (tenant.logoUrl || tenant.logo)
  const logoBytes = logoUrl ? await logoToEscPos(logoUrl, W === 48 ? 200 : 140) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, ...CMD.LINE_FEED] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...(branchName ? [...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...encodeText('-- ' + branchName + ' --\n'), ...CMD.BOLD_OFF] : []),
    ...(tenant?.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')]   : []),
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')]           : []),
    ...CMD.LINE_FEED,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText('Resi / Recu / Receipt\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_LEFT,
    ...makeLine('No. Fakti/Invoice:', invoice.invoiceNumber || '', W), ...CMD.LINE_FEED,
    ...makeLine('Dat/Date:', new Date(invoice.issueDate).toLocaleDateString('fr-HT') + ' ' + new Date(invoice.issueDate).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }), W), ...CMD.LINE_FEED,
    ...(cashierName ? [...makeLine('Kasye/Caissier:', cashierName.substring(0, W - 17), W), ...CMD.LINE_FEED] : []),
    ...(snap.name ? [
      ...divider('-', W), ...CMD.LINE_FEED,
      ...CMD.BOLD_ON, ...encodeText('Kliyan/Client: ' + snap.name.substring(0, W - 15) + '\n'), ...CMD.BOLD_OFF,
      ...(snap.phone ? [...encodeText('Tel: ' + snap.phone + '\n')] : []),
    ] : []),
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.SMALL_FONT, ...CMD.BOLD_ON, ...encodeText(itemHeader + '\n'), ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...(invoice.items || []).flatMap(item => {
      const nom  = (item.product?.name || item.productSnapshot?.name || 'Atik').substring(0, C.name)
      const qte  = String(Number(item.quantity)).padStart(C.qty)
      const pri  = fmt(item.unitPriceHtg).padStart(C.price)
      const tot  = fmt(item.totalHtg).padStart(C.total)
      const row  = nom.padEnd(C.name) + qte + pri + tot
      const result = [...encodeText(row.substring(0, W) + '\n')]
      if (Number(item.discountPct) > 0) result.push(...encodeText('  Remiz/Remise: ' + item.discountPct + '%\n'))
      return result
    }),
    ...CMD.NORMAL_FONT,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_LEFT,
    ...(Number(invoice.discountHtg) > 0 ? [...makeLine('Remiz/Remise/Disc.:', '-' + fmt(invoice.discountHtg) + ' HTG', W), ...CMD.LINE_FEED] : []),
    ...(Number(invoice.taxHtg) > 0      ? [...makeLine('Taks/Tax (' + Number(invoice.taxRate) + '%):', fmt(invoice.taxHtg) + ' HTG', W), ...CMD.LINE_FEED] : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...(fmt(totalHtg).length > 10 ? [...CMD.DOUBLE_HEIGHT] : [...CMD.DOUBLE_BOTH]),
    ...encodeText('TOTAL: ' + fmt(totalHtg) + ' HTG\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...(rateUSD > 0 ? [...CMD.ALIGN_CENTER, ...CMD.SMALL_FONT, ...encodeText('aprox. USD: $' + (totalHtg / rateUSD).toFixed(2) + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(rateDOP > 0 ? [...CMD.ALIGN_CENTER, ...CMD.SMALL_FONT, ...encodeText('aprox. DOP: RD$' + (totalHtg / rateDOP).toFixed(2) + '\n'), ...CMD.NORMAL_FONT] : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_LEFT, ...CMD.BOLD_ON, ...encodeText('Peye/Paye/Paid: '), ...CMD.BOLD_OFF,
    ...(fmt(invoice.amountPaidHtg).length > 10
      ? [...CMD.SMALL_FONT, ...encodeText(fmt(invoice.amountPaidHtg) + ' HTG\n'), ...CMD.NORMAL_FONT]
      : [...encodeText(fmt(invoice.amountPaidHtg) + ' HTG\n')]),
    ...(Number(invoice.balanceDueHtg) > 0 ? [
      ...CMD.BOLD_ON, ...encodeText('Balans/Solde/Balance: '), ...CMD.BOLD_OFF,
      ...(fmt(invoice.balanceDueHtg).length > 10
        ? [...CMD.SMALL_FONT, ...encodeText(fmt(invoice.balanceDueHtg) + ' HTG\n'), ...CMD.NORMAL_FONT]
        : [...encodeText(fmt(invoice.balanceDueHtg) + ' HTG\n')]),
    ] : []),
    ...(lastPay ? [
      ...makeLine('Metod/Mode/Method:', PAYMENT_LABELS[lastPay.method] || lastPay.method, W), ...CMD.LINE_FEED,
      ...(lastPay.reference ? [...makeLine('Ref:', lastPay.reference, W), ...CMD.LINE_FEED] : []),
    ] : []),
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText(statusText + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...(tenant?.showQrCode !== false ? [
      ...CMD.ALIGN_CENTER,
      ...makeQR(qrContent),
      ...CMD.LINE_FEED,
      ...CMD.SMALL_FONT,
      ...encodeText('Skane/Scanner/Scan to verify\n'),
      ...encodeText(invoice.invoiceNumber + '\n'),
      ...CMD.NORMAL_FONT,
    ] : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('Mesi! / Merci! / Thank you!\n'),
    ...CMD.BOLD_OFF, ...CMD.SMALL_FONT,
    ...encodeText('Pwodwi pa / Propulse par / Powered by\n'),
    ...CMD.BOLD_ON, ...encodeText('PlusGroup\n'), ...CMD.BOLD_OFF,
    ...encodeText('Tel: +50942449024\n'),
    ...CMD.NORMAL_FONT,
    ...CMD.LINE_FEED, ...CMD.LINE_FEED, ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}

// ══════════════════════════════════════════════════════════════
// ✅ PRINT SABOTAY SOL
// ══════════════════════════════════════════════════════════════
export const printSabotayReceipt = async (plan, member, paidDates = [], tenant, type = 'peman') => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W           = getWidth(tenant)
  const txDate      = new Date().toLocaleDateString('fr-HT') + ' ' + new Date().toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
  const payout      = (plan.amount * plan.maxMembers) - (plan.fee || 0)
  const totalPaid   = Object.keys(member.payments || {}).filter(d => member.payments[d]).length
  const amountPaid  = totalPaid * plan.amount
  const totalAmount = paidDates.length * plan.amount

  const FREQ_SHORT = {
    daily: 'Chak Jou', weekly_saturday: 'Chak Samdi', weekly_monday: 'Chak Lendi',
    biweekly: 'Chak 15 Jou', monthly: 'Chak Mwa', weekdays: 'Lendi-Vandredi',
  }

  const logoUrl   = tenant && (tenant.logoUrl || tenant.logo)
  const logoBytes = logoUrl ? await logoToEscPos(logoUrl, W === 48 ? 200 : 140) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, ...CMD.LINE_FEED] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('-- SABOTAY SOL --\n'),
    ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')]   : []),
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')]           : []),
    ...CMD.LINE_FEED,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText(type === 'peman' ? 'RESI PEMAN\n' : 'KONT MANM\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_LEFT,
    ...makeLine('Plan:', plan.name.substring(0, W - 6), W), ...CMD.LINE_FEED,
    ...makeLine('Dat:', txDate, W), ...CMD.LINE_FEED,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON, ...encodeText(member.name.substring(0, W) + '\n'), ...CMD.BOLD_OFF,
    ...(member.phone ? [...encodeText('Tel: ' + member.phone + '\n')] : []),
    ...makeLine('Pozisyon:', '#' + member.position, W), ...CMD.LINE_FEED,
    ...makeLine('Frekans:', FREQ_SHORT[plan.frequency] || plan.frequency, W), ...CMD.LINE_FEED,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...(type === 'peman' ? [
      ...CMD.BOLD_ON, ...encodeText('Dat Peye:\n'), ...CMD.BOLD_OFF,
      ...paidDates.flatMap(d => [...encodeText('  ' + d.split('-').reverse().join('/') + ' — ' + fmt(plan.amount) + ' HTG\n')]),
      ...divider('=', W), ...CMD.LINE_FEED,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
      ...encodeText('TOTAL: ' + fmt(totalAmount) + ' HTG\n'),
      ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
      ...CMD.ALIGN_LEFT,
      ...makeLine('Kontribisyon total:', fmt(amountPaid) + ' HTG', W), ...CMD.LINE_FEED,
    ] : [
      ...makeLine('Montan / peman:', fmt(plan.amount) + ' HTG', W), ...CMD.LINE_FEED,
      ...makeLine('Peman fè:', totalPaid + '/' + plan.maxMembers, W), ...CMD.LINE_FEED,
      ...makeLine('Kontribye:', fmt(amountPaid) + ' HTG', W), ...CMD.LINE_FEED,
      ...divider('=', W), ...CMD.LINE_FEED,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
      ...encodeText('PRYIM: ' + fmt(payout) + ' HTG\n'),
      ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ]),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('Mesi! / Merci! / Thank you!\n'),
    ...CMD.BOLD_OFF, ...CMD.SMALL_FONT,
    ...encodeText('Pwodwi pa / Powered by\n'),
    ...CMD.BOLD_ON, ...encodeText('PlusGroup\n'), ...CMD.BOLD_OFF,
    ...encodeText('Tel: +50942449024\n'),
    ...CMD.NORMAL_FONT,
    ...CMD.LINE_FEED, ...CMD.LINE_FEED, ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}

// ══════════════════════════════════════════════════════════════
// ✅ PRINT KANÈ EPAY
// ══════════════════════════════════════════════════════════════
export const printKaneReceipt = async (account, transaction, tenant, type = 'ouverture') => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W = getWidth(tenant)

  const TX_LABELS = {
    ouverture: 'OUVERTURE KONT',
    depot:     'DEPO / DEPOT',
    retrait:   'RETRAIT / RETRÈ',
  }

  const PAYMENT_LABELS = {
    cash: 'Kach/Cash', moncash: 'MonCash', natcash: 'NatCash',
    card: 'Kat/Carte', transfer: 'Virement', check: 'Chek/Cheque', other: 'Lot/Autre'
  }

  const txDate = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleDateString('fr-HT') + ' ' +
      new Date(transaction.createdAt).toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('fr-HT')

  const logoUrl   = tenant && (tenant.logoUrl || tenant.logo)
  const logoBytes = logoUrl ? await logoToEscPos(logoUrl, W === 48 ? 200 : 140) : []
  const txLabel   = TX_LABELS[type] || 'TRANZAKSYON'

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, ...CMD.LINE_FEED] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('-- KANE EPAY --\n'),
    ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')]   : []),
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')]           : []),
    ...CMD.LINE_FEED,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText(txLabel + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_LEFT,
    ...makeLine('No. Kont:', account.accountNumber || '', W), ...CMD.LINE_FEED,
    ...makeLine('Dat:', txDate, W), ...CMD.LINE_FEED,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON,
    ...encodeText((account.firstName + ' ' + account.lastName).substring(0, W) + '\n'),
    ...CMD.BOLD_OFF,
    ...(account.address       ? [...encodeText(account.address.substring(0, W) + '\n')]                                                          : []),
    ...(account.nifOrCin      ? [...encodeText('NIF/CIN: ' + account.nifOrCin + '\n')]                                                           : []),
    ...(account.phone         ? [...encodeText('Tel: ' + account.phone + '\n')]                                                                  : []),
    ...(account.familyRelation ? [...encodeText('Referans: ' + account.familyRelation + (account.familyName ? ' — ' + account.familyName : '') + '\n')] : []),
    ...divider('-', W), ...CMD.LINE_FEED,
    ...(type === 'ouverture' ? [
      ...makeLine('Montan depoze:', fmt(account.openingAmount) + ' HTG', W), ...CMD.LINE_FEED,
      ...makeLine('Fre kane:', '- ' + fmt(account.kaneFee || 0) + ' HTG', W), ...CMD.LINE_FEED,
      ...makeLine('Montan bloke:', '- ' + fmt(account.lockedAmount || 0) + ' HTG', W), ...CMD.LINE_FEED,
    ] : [
      ...makeLine('Balans anvan:', fmt(transaction?.balanceBefore) + ' HTG', W), ...CMD.LINE_FEED,
    ]),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText(
      (type === 'ouverture' ? 'BALANS: ' : (type === 'retrait' ? 'RETRÈ: ' : 'DEPO: ')) +
      fmt(type === 'ouverture' ? account.balance : transaction?.amount) + ' HTG\n'
    ),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...(type !== 'ouverture' ? [
      ...CMD.ALIGN_LEFT,
      ...makeLine('Nouvo balans:', fmt(transaction?.balanceAfter) + ' HTG', W), ...CMD.LINE_FEED,
    ] : []),
    ...(transaction?.method ? [
      ...divider('-', W), ...CMD.LINE_FEED,
      ...makeLine('Metod:', PAYMENT_LABELS[transaction.method] || transaction.method, W), ...CMD.LINE_FEED,
      ...(transaction.reference ? [...makeLine('Ref:', transaction.reference, W), ...CMD.LINE_FEED] : []),
    ] : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('Mesi! / Merci! / Thank you!\n'),
    ...CMD.BOLD_OFF, ...CMD.SMALL_FONT,
    ...encodeText('Pwodwi pa / Powered by\n'),
    ...CMD.BOLD_ON, ...encodeText('PlusGroup\n'), ...CMD.BOLD_OFF,
    ...encodeText('Tel: +50942449024\n'),
    ...CMD.NORMAL_FONT,
    ...CMD.LINE_FEED, ...CMD.LINE_FEED, ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}