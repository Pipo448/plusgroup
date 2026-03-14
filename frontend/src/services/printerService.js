// src/services/printerService.js

const PRINTER_SERVICE_UUID   = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHAR_UUID      = '00002af1-0000-1000-8000-00805f9b34fb'
const PRINTER_SERVICE_UUID_2 = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_CHAR_UUID_2    = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'
const PRINTER_SERVICE_UUID_3 = '49535343-fe7d-4ae5-8fa9-9fafd205e455'
const PRINTER_CHAR_UUID_3    = '49535343-8841-43f4-a8d4-ecbe34729bb3'

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

// ══════════════════════════════════════════════════════════════
// ── UTILITÈ
// ══════════════════════════════════════════════════════════════

const ACCENT_MAP = {
  'à':'a','â':'a','ä':'a','á':'a','ã':'a',
  'è':'e','é':'e','ê':'e','ë':'e',
  'ì':'i','í':'i','î':'i','ï':'i',
  'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
  'ù':'u','ú':'u','û':'u','ü':'u',
  'ç':'c','ñ':'n',
  'À':'A','Â':'A','Á':'A','È':'E','É':'E','Ê':'E',
  'Î':'I','Ï':'I','Ô':'O','Ù':'U','Û':'U','Ç':'C',
}

const encodeText = (text) => {
  const clean = String(text)
    .replace(/[àâäáã]/g, 'a')
    .replace(/[èéêë]/g,  'e')
    .replace(/[ìíîï]/g,  'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g,  'u')
    .replace(/[ÀÂÁ]/g,   'A')
    .replace(/[ÈÉÊË]/g,  'E')
    .replace(/[ÌÍÎÏ]/g,  'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g,  'U')
    .replace(/ç/g,       'c')
    .replace(/Ç/g,       'C')
    .replace(/ñ/g,       'n')
    .replace(/[^\x00-\x7F]/g, '?')
  return Array.from(clean).map(c => c.charCodeAt(0))
}

const _logoCache = new Map()

// ✅ Detekte Sunmi espesifikman (pa jis Android an jeneral)
// Sunmi V2 gen "SUNMI" nan userAgent li — telefon nòmal pa gen sa
const _ua        = navigator.userAgent
const _isAndroid = /android/i.test(_ua)
const _isSunmi   = /sunmi/i.test(_ua)

export const isAndroid = () => _isAndroid
export const isSunmi   = () => _isSunmi

const getWidth = (tenant) => {
  const size = (tenant?.receiptSize) || '58mm'
  return (size === '57mm' || size === '58mm' || size === '58') ? 32 : 48
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

const logoWithTimeout = async (logoUrl, width, ms = 3000) => {
  const cacheKey = `${logoUrl}_${width}`
  if (_logoCache.has(cacheKey)) return _logoCache.get(cacheKey)

  const result = await Promise.race([
    logoToEscPos(logoUrl, width),
    new Promise(resolve => setTimeout(() => { console.warn('Logo timeout'); resolve([]) }, ms))
  ])

  if (result.length > 0) _logoCache.set(cacheKey, result)
  return result
}

// ══════════════════════════════════════════════════════════════
// ── RAWBT — SUNMI V2 INNER PRINTER
// ══════════════════════════════════════════════════════════════

const sendViaRawBT = (bytes) => {
  const binary = bytes.map(b => String.fromCharCode(b & 0xFF)).join('')
  const b64    = btoa(binary)
  window.location.href =
    'intent:' + b64 +
    '#Intent;' +
    'scheme=rawbt;' +
    'package=ru.a402d.rawbtprinter;' +
    'end;'
}

// ══════════════════════════════════════════════════════════════
// ── BLUETOOTH (printer ekstèn)
// ══════════════════════════════════════════════════════════════

export const connectPrinter = async () => {
  if (!navigator.bluetooth) throw new Error('WEB_BLUETOOTH_NOT_SUPPORTED')

  _device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [PRINTER_SERVICE_UUID, PRINTER_SERVICE_UUID_2, PRINTER_SERVICE_UUID_3]
  })

  const server = await _device.gatt.connect()
  _device.addEventListener('gattserverdisconnected', () => { _char = null; _device = null })

  for (const [svcUUID, charUUID] of [
    [PRINTER_SERVICE_UUID,   PRINTER_CHAR_UUID  ],
    [PRINTER_SERVICE_UUID_2, PRINTER_CHAR_UUID_2],
    [PRINTER_SERVICE_UUID_3, PRINTER_CHAR_UUID_3],
  ]) {
    try {
      const svc = await server.getPrimaryService(svcUUID)
      _char     = await svc.getCharacteristic(charUUID)
      return _device.name || 'Bluetooth Printer'
    } catch { /* eseye pwochen */ }
  }

  _char = null; _device = null
  throw new Error('PRINTER_UUID_NOT_FOUND')
}

export const disconnectPrinter = () => {
  if (_device?.gatt?.connected) _device.gatt.disconnect()
  _char = null; _device = null
}

export const isPrinterConnected = () => !!_char && !!(_device?.gatt?.connected)

const sendViaBluetooth = async (bytes) => {
  if (!_char) throw new Error('Printer pa konekte')
  const CHUNK = 100
  for (let i = 0; i < bytes.length; i += CHUNK) {
    await _char.writeValue(new Uint8Array(bytes.slice(i, i + CHUNK)))
    await new Promise(r => setTimeout(r, 20))
  }
}

// ══════════════════════════════════════════════════════════════
// ── DISPATCH — chwazi metòd otomatikman
// ══════════════════════════════════════════════════════════════

const dispatch = async (bytes) => {
  // ✅ Sunmi sèlman — RawBT inner printer
  if (_isSunmi) {
    sendViaRawBT(bytes)
    return
  }
  if (_char) {
    await sendViaBluetooth(bytes)
    return
  }
  throw new Error('Okenn printer disponib. Sou Sunmi: itilize bouton Sunmi. Sou lòt aparey: konekte yon printer Bluetooth dabò.')
}

// ══════════════════════════════════════════════════════════════
// ✅ PRINT INVOICE — matche nouvo design bileng + kredi
// ══════════════════════════════════════════════════════════════

export const printInvoice = async (invoice, tenant, cashier = null, amountGiven = 0, change = 0) => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W            = getWidth(tenant)
  const isWide       = W >= 48
  const snap         = invoice.clientSnapshot || {}
  const cashierName  = cashier?.fullName || cashier?.name || localStorage.getItem('plusgroup-cashier-name') || null
  const totalHtg     = Number(invoice.totalHtg || 0)
  const paidHtg      = Number(invoice.amountPaidHtg || 0)
  const balanceHtg   = Number(invoice.balanceDueHtg || 0)
  const lastPay      = invoice.payments?.length > 0 ? invoice.payments[invoice.payments.length - 1] : null
  const isCredit     = invoice.paymentType === 'credit' || invoice.isCredit === true || balanceHtg > 0 && paidHtg === 0
  const isPartial    = invoice.status === 'partial'
  const isPaid       = invoice.status === 'paid'
  const isCancelled  = invoice.status === 'cancelled'

  // ✅ Taux echanj
  const exchangeRates = (() => {
    try {
      const er = tenant?.exchangeRates
      if (!er) return {}
      if (typeof er === 'object') return er
      return JSON.parse(String(er))
    } catch { return {} }
  })()
  const rateUSD = Number(exchangeRates.USD || invoice.exchangeRate || 132)
  const rateDOP = Number(exchangeRates.DOP || 0)
  const toUSD   = (htg) => rateUSD > 0 ? (htg / rateUSD).toFixed(2) : null
  const toDOP   = (htg) => rateDOP > 0 ? (htg / rateDOP).toFixed(2) : null

  const PAYMENT_LABELS = {
    cash:'Kach / Cash', moncash:'MonCash', natcash:'NatCash',
    card:'Kat / Carte', transfer:'Virement', check:'Chek / Cheque', other:'Lòt / Autre'
  }

  // ✅ Statut bileng
  const statusLine =
    isPaid      ? 'TOTAL PAYE / TOTAL PAYE' :
    isCancelled ? 'ANILE / ANNULE' :
    isPartial   ? 'PASYAL / PARTIEL' :
    isCredit    ? 'KREDI / CREDIT' : 'IMPAYE / NON PAYE'

  // ✅ Kolonn tablo atik
  const C = isWide
    ? { name: 20, qty: 4, price: 10, total: 12 }
    : { name: 12, qty: 3, price:  8, total:  9 }

  const itemHeader = isWide
    ? 'Produit'.padEnd(C.name) + 'Qte'.padStart(C.qty) + 'Prix'.padStart(C.price) + 'Total'.padStart(C.total)
    : 'Pwodwi'.padEnd(C.name) + 'Q'.padStart(C.qty)   + 'Pri'.padStart(C.price)   + 'Tot'.padStart(C.total)

  const logoUrl   = tenant?.logoUrl || tenant?.logo
  const logoW     = isWide ? 200 : 120
  const logoBytes = logoUrl ? await logoWithTimeout(logoUrl, logoW) : []

  const issueDate = new Date(invoice.issueDate)
  const dateStr   = issueDate.toLocaleDateString('fr-HT')

  const qrContent = window.location.origin + '/app/invoices/' + invoice.id + '\n' + invoice.invoiceNumber
  const bizName   = tenant?.businessName || tenant?.name || 'PLUS GROUP'

  const bytes = [
    ...CMD.INIT,

    // ── HEADER ──────────────────────────────────────────────
    ...CMD.ALIGN_CENTER,
    ...(logoBytes.length > 0 ? [...logoBytes, ...CMD.LINE_FEED] : []),
    ...CMD.BOLD_ON,
    ...encodeText(bizName + '\n'),
    ...CMD.BOLD_OFF,
    ...(tenant?.tagline   ? [...CMD.SMALL_FONT, ...encodeText(tenant.tagline + '\n'),   ...CMD.NORMAL_FONT] : []),
    ...(tenant?.address   ? [...CMD.SMALL_FONT, ...encodeText(tenant.address + '\n'),   ...CMD.NORMAL_FONT] : []),
    ...(tenant?.phone     ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + tenant.phone + '\n'), ...CMD.NORMAL_FONT] : []),

    // ── SEPARASYON ──────────────────────────────────────────
    ...CMD.ALIGN_LEFT,
    ...divider('=', W), ...CMD.LINE_FEED,

    // ── INFO FAKTI ──────────────────────────────────────────
    ...CMD.SMALL_FONT,
    ...encodeText('Dat / Date: ' + dateStr + '\n'),
    ...encodeText('Resi N / Recu N: ' + invoice.invoiceNumber + '\n'),
    ...(snap.name       ? [...encodeText('Kliyan / Client: ' + snap.name.substring(0, W - 16) + '\n')] : []),
    ...(snap.phone      ? [...encodeText('Tel: ' + snap.phone + '\n')] : []),
    ...(snap.nif        ? [...encodeText('NIF: ' + snap.nif + '\n')] : []),
    ...(cashierName     ? [...encodeText((isWide ? 'Kesye / Caissier: ' : 'Kesye: ') + cashierName.substring(0, W - 18) + '\n')] : []),
    ...CMD.NORMAL_FONT,

    // ── SEPARASYON ──────────────────────────────────────────
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── TABLO ATIK ──────────────────────────────────────────
    ...CMD.SMALL_FONT,
    ...encodeText(itemHeader + '\n'),
    ...divider('-', W), ...CMD.LINE_FEED,
    ...(invoice.items || []).flatMap(item => {
      const nom = (item.product?.name || item.productSnapshot?.name || 'Atik').substring(0, C.name)
      const row = nom.padEnd(C.name) +
        String(Number(item.quantity)).padStart(C.qty) +
        (fmt(item.unitPriceHtg) + ' G').padStart(C.price) +
        (fmt(item.totalHtg) + ' G').padStart(C.total)
      const result = [...encodeText(row.substring(0, W) + '\n')]
      if (Number(item.discountPct) > 0)
        result.push(...encodeText('  Remiz / Remise: ' + item.discountPct + '%\n'))
      return result
    }),
    ...CMD.NORMAL_FONT,

    // ── REMIZ + TAKS ────────────────────────────────────────
    ...(Number(invoice.discountHtg) > 0 ? [
      ...CMD.SMALL_FONT,
      ...makeLine('Remiz / Remise:', '-' + fmt(invoice.discountHtg) + ' G', W), ...CMD.LINE_FEED,
      ...CMD.NORMAL_FONT,
    ] : []),
    ...(Number(invoice.taxHtg) > 0 ? [
      ...CMD.SMALL_FONT,
      ...makeLine('Taks / Taxe (' + Number(invoice.taxRate) + '%):', fmt(invoice.taxHtg) + ' G', W), ...CMD.LINE_FEED,
      ...CMD.NORMAL_FONT,
    ] : []),

    // ── TOTAL ───────────────────────────────────────────────
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON,
    ...makeLine('TOTAL / TOTAL:', fmt(totalHtg) + ' G', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_OFF,
    ...(toUSD(totalHtg) ? [
      ...CMD.SMALL_FONT,
      ...encodeText('  = $' + toUSD(totalHtg) + ' USD\n'),
      ...CMD.NORMAL_FONT,
    ] : []),
    ...(toDOP(totalHtg) ? [
      ...CMD.SMALL_FONT,
      ...encodeText('  = RD$' + toDOP(totalHtg) + ' DOP\n'),
      ...CMD.NORMAL_FONT,
    ] : []),
    ...divider('-', W), ...CMD.LINE_FEED,

    // ── PEMAN ───────────────────────────────────────────────
    ...CMD.SMALL_FONT,
    // Kob kliyan bay
    ...(amountGiven > 0 ? [
      ...makeLine(isWide ? 'Montant recu / Kob kliyan bay:' : 'Kob kliyan bay', fmt(amountGiven) + ' G', W), ...CMD.LINE_FEED,
    ] : []),
    // Monnen
    ...(change > 0 ? [
      ...makeLine(isWide ? 'Monnaie / Monnen remet:' : 'Monnen', fmt(change) + ' G', W), ...CMD.LINE_FEED,
    ] : []),
    // Metod peman
    ...(lastPay?.method ? [
      ...makeLine(isWide ? 'Methode / Metod:' : 'Metod:', PAYMENT_LABELS[lastPay.method] || lastPay.method, W), ...CMD.LINE_FEED,
    ] : []),
    // Referans
    ...(lastPay?.reference ? [
      ...makeLine('Ref:', lastPay.reference.substring(0, W - 6), W), ...CMD.LINE_FEED,
    ] : []),
    // Peman deja fe (si pasyal)
    ...(isPartial && paidHtg > 0 ? [
      ...makeLine(isWide ? 'Deja paye / Deja peye:' : 'Deja peye:', fmt(paidHtg) + ' G', W), ...CMD.LINE_FEED,
    ] : []),
    ...CMD.NORMAL_FONT,

    // ✅ SEKSYON KREDI ─────────────────────────────────────
    ...(balanceHtg > 0 ? [
      ...divider('-', W), ...CMD.LINE_FEED,
      ...CMD.BOLD_ON,
      ...makeLine(
        isWide ? 'Balans / Solde du:' : 'Balans:',
        fmt(balanceHtg) + ' G',
        W
      ), ...CMD.LINE_FEED,
      ...CMD.BOLD_OFF,
      // ✅ Si se kredi oswa pasyal — ajoute avètisman
      ...(isCredit || isPartial ? [
        ...CMD.SMALL_FONT,
        ...CMD.ALIGN_CENTER,
        ...encodeText('*** KREDI / CREDIT ***\n'),
        ...encodeText('Peman an dwe fe nan dat:' + '\n'),
        ...(invoice.dueDate ? [
          ...encodeText(new Date(invoice.dueDate).toLocaleDateString('fr-HT') + '\n'),
        ] : [
          ...encodeText('Pi vit posib / Aussitot possible\n'),
        ]),
        ...CMD.ALIGN_LEFT,
        ...CMD.NORMAL_FONT,
      ] : []),
    ] : []),

    // ── STATUT FINAL ────────────────────────────────────────
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText(statusLine + '\n'),
    ...CMD.BOLD_OFF,
    ...CMD.ALIGN_LEFT,
    ...CMD.BOLD_ON,
    ...makeLine(
      isPaid ? 'TOTAL PAYE:' : isPartial ? 'PAYE:' : isCredit ? 'MONTANT DU:' : 'TOTAL:',
      fmt(isPaid ? totalHtg : paidHtg > 0 ? paidHtg : totalHtg) + ' G',
      W
    ), ...CMD.LINE_FEED,
    ...CMD.BOLD_OFF,

    // ── QR CODE ─────────────────────────────────────────────
    ...(tenant?.showQrCode !== false ? [
      ...CMD.ALIGN_CENTER,
      ...makeQR(qrContent),
      ...CMD.SMALL_FONT, ...encodeText(invoice.invoiceNumber + '\n'), ...CMD.NORMAL_FONT,
    ] : []),

    // ── FOOTER ──────────────────────────────────────────────
    ...CMD.ALIGN_CENTER,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON,
    ...encodeText('Mesi paske ou achte lakay nou\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText('Merci pour votre achat\n'),
    ...divider('-', W), ...CMD.LINE_FEED,
    ...encodeText('Tout machandiz vann pa reprann ni chanje.\n'),
    ...encodeText('Les marchandises vendues ne sont\n'),
    ...encodeText('ni reprises ni echangees.\n'),
    ...divider('-', W), ...CMD.LINE_FEED,
    ...encodeText('Pwodwi pa / Produit par\n'),
    ...CMD.NORMAL_FONT, ...CMD.BOLD_ON,
    ...encodeText('Plus Group\n'),
    ...CMD.BOLD_OFF, ...CMD.SMALL_FONT,
    ...encodeText('+509 4244-9024\n'),
    ...CMD.NORMAL_FONT,
    ...CMD.LINE_FEED, ...CMD.LINE_FEED,
    ...CMD.CUT,
  ]

  await dispatch(bytes)
}

// ══════════════════════════════════════════════════════════════
// ✅ PRINT SABOTAY SOL
// ══════════════════════════════════════════════════════════════

export const printSabotayReceipt = async (plan, member, paidDates = [], tenant, type = 'peman') => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits:0, maximumFractionDigits:0 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W          = getWidth(tenant)
  const txDate     = new Date().toLocaleDateString('fr-HT') + ' ' +
    new Date().toLocaleTimeString('fr-HT', { hour:'2-digit', minute:'2-digit' })
  const payout     = (plan.amount * plan.maxMembers) - (plan.fee || 0)
  const totalPaid  = Object.keys(member.payments || {}).filter(d => member.payments[d]).length
  const amountPaid = totalPaid * plan.amount
  const totalAmt   = paidDates.length * plan.amount

  const FREQ = {
    daily:'Chak Jou', weekly_saturday:'Chak Samdi',
    weekly_monday:'Chak Lendi', biweekly:'Chak 15 Jou',
    monthly:'Chak Mwa', weekdays:'Lendi-Vandredi'
  }

  const logoUrl   = tenant?.logoUrl || tenant?.logo
  const logoW     = W === 48 ? 200 : 120
  const logoBytes = logoUrl ? await logoWithTimeout(logoUrl, logoW) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, ...CMD.LINE_FEED] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.BOLD_ON, ...encodeText('-- SABOTAY SOL --\n'), ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')]  : []),
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')]          : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
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
    ...makeLine('Frekans:', FREQ[plan.frequency] || plan.frequency, W), ...CMD.LINE_FEED,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...(type === 'peman' ? [
      ...CMD.BOLD_ON, ...encodeText('Dat Peye:\n'), ...CMD.BOLD_OFF,
      ...paidDates.flatMap(d => [
        ...encodeText('  ' + d.split('-').reverse().join('/') + ' — ' + fmt(plan.amount) + ' HTG\n')
      ]),
      ...divider('=', W), ...CMD.LINE_FEED,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
      ...encodeText('TOTAL: ' + fmt(totalAmt) + ' HTG\n'),
      ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF, ...CMD.ALIGN_LEFT,
      ...makeLine('Kontribisyon total:', fmt(amountPaid) + ' HTG', W), ...CMD.LINE_FEED,
    ] : [
      ...makeLine('Montan / peman:', fmt(plan.amount) + ' HTG', W), ...CMD.LINE_FEED,
      ...makeLine('Peman fe:', totalPaid + '/' + plan.maxMembers, W), ...CMD.LINE_FEED,
      ...makeLine('Kontribye:', fmt(amountPaid) + ' HTG', W), ...CMD.LINE_FEED,
      ...divider('=', W), ...CMD.LINE_FEED,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
      ...encodeText('Prim: ' + fmt(payout) + ' HTG\n'),
      ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ]),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('Mesi! / Merci!\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText('PlusGroup — Tel: +50942449024\n'),
    ...CMD.NORMAL_FONT, ...CMD.LINE_FEED, ...CMD.LINE_FEED, ...CMD.CUT,
  ]

  await dispatch(bytes)
}

// ══════════════════════════════════════════════════════════════
// ✅ PRINT KANÈ EPAY
// ══════════════════════════════════════════════════════════════

export const printKaneReceipt = async (account, transaction, tenant, type = 'ouverture') => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits:2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W = getWidth(tenant)

  const TX_LABELS = {
    ouverture:'OUVERTURE KONT',
    depot:'DEPO / DEPOT',
    retrait:'RETRAIT / RETRE'
  }
  const PAYMENT_LABELS = {
    cash:'Kach/Cash', moncash:'MonCash', natcash:'NatCash',
    card:'Kat/Carte', transfer:'Virement', check:'Chek/Cheque', other:'Lot/Autre'
  }

  const txDate = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleDateString('fr-HT') + ' ' +
      new Date(transaction.createdAt).toLocaleTimeString('fr-HT', { hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleDateString('fr-HT')

  const logoUrl   = tenant?.logoUrl || tenant?.logo
  const logoW     = W === 48 ? 200 : 120
  const logoBytes = logoUrl ? await logoWithTimeout(logoUrl, logoW) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, ...CMD.LINE_FEED] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.BOLD_ON, ...encodeText('-- KANE EPAY --\n'), ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')]  : []),
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')]          : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText((TX_LABELS[type] || 'TRANZAKSYON') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_LEFT,
    ...makeLine('No. Kont:', account.accountNumber || '', W), ...CMD.LINE_FEED,
    ...makeLine('Dat:', txDate, W), ...CMD.LINE_FEED,
    ...divider('-', W), ...CMD.LINE_FEED,
    ...CMD.BOLD_ON,
    ...encodeText((account.firstName + ' ' + account.lastName).substring(0, W) + '\n'),
    ...CMD.BOLD_OFF,
    ...(account.address        ? [...encodeText(account.address.substring(0, W) + '\n')]          : []),
    ...(account.nifOrCin       ? [...encodeText('NIF/CIN: ' + account.nifOrCin + '\n')]           : []),
    ...(account.phone          ? [...encodeText('Tel: ' + account.phone + '\n')]                  : []),
    ...(account.familyRelation ? [...encodeText('Ref: ' + account.familyRelation + (account.familyName ? ' — ' + account.familyName : '') + '\n')] : []),
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
      (type === 'ouverture' ? 'BALANS: ' : type === 'retrait' ? 'RETRE: ' : 'DEPO: ') +
      fmt(type === 'ouverture' ? account.balance : transaction?.amount) + ' HTG\n'
    ),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...(type !== 'ouverture' ? [
      ...CMD.ALIGN_LEFT,
      ...makeLine('Nouvo balans:', fmt(transaction?.balanceAfter) + ' HTG', W), ...CMD.LINE_FEED
    ] : []),
    ...(transaction?.method ? [
      ...divider('-', W), ...CMD.LINE_FEED,
      ...makeLine('Metod:', PAYMENT_LABELS[transaction.method] || transaction.method, W), ...CMD.LINE_FEED,
      ...(transaction.reference ? [...makeLine('Ref:', transaction.reference, W), ...CMD.LINE_FEED] : []),
    ] : []),
    ...divider('=', W), ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
    ...encodeText('Mesi! / Merci!\n'),
    ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText('PlusGroup — Tel: +50942449024\n'),
    ...CMD.NORMAL_FONT, ...CMD.LINE_FEED, ...CMD.LINE_FEED, ...CMD.CUT,
  ]

  await dispatch(bytes)
}
