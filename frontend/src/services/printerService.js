// src/services/printerService.js
// RP327 80mm — ESC/POS via Web Bluetooth
// ✅ FIX: Logo full width + tèks gwo + pa gen SMALL_FONT sou tèks enpòtan

const KNOWN_PAIRS = [
  { svc: '000018f0-0000-1000-8000-00805f9b34fb', chr: '00002af1-0000-1000-8000-00805f9b34fb' },
  { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', chr: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
  { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', chr: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
  { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', chr: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
  { svc: '0000ff00-0000-1000-8000-00805f9b34fb', chr: '0000ff02-0000-1000-8000-00805f9b34fb' },
  { svc: '0000ff00-0000-1000-8000-00805f9b34fb', chr: '0000ff01-0000-1000-8000-00805f9b34fb' },
  { svc: '0000ffe0-0000-1000-8000-00805f9b34fb', chr: '0000ffe1-0000-1000-8000-00805f9b34fb' },
  { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', chr: '6e400003-b5a3-f393-e0a9-e50e24dcca9e' },
]
const ALL_SERVICE_UUIDS = [...new Set(KNOWN_PAIRS.map(p => p.svc))]

let _device = null
let _char   = null

const ESC = 0x1B
const GS  = 0x1D
const LF  = 0x0A

const CMD = {
  INIT:          [ESC, 0x40],
  DENSITY_DARK: [GS, 0x45, 0x03], // max darkness (0–3)
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  ALIGN_RIGHT:   [ESC, 0x61, 0x02],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],  // 2x hautè
  DOUBLE_BOTH:   [ESC, 0x21, 0x30],  // 2x hautè + 2x lajè
  NORMAL_SIZE:   [ESC, 0x21, 0x00],
  // ✅ PA ITILIZE SMALL_FONT sou tèks enpòtan — sa ki koze tèks pa klè
  SMALL_FONT:    [ESC, 0x4D, 0x01],  // sèlman pou nòt anba
  NORMAL_FONT:   [ESC, 0x4D, 0x00],
  LINE_FEED:     [LF],
  CUT:           [GS, 0x56, 0x41, 0x03],
  QR_MODEL:      [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  QR_SIZE:       [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x07],  // ✅ size 7 = pi gwo QR
  QR_ERROR:      [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30],
  QR_PRINT:      [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30],
}

// ── Retire aksan ESC/POS ──────────────────────────────────────
const encodeText = (text) => {
  const clean = String(text)
    .replace(/[àâäáã]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g,  'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g,  'u').replace(/[ÀÂÁ]/g,   'A')
    .replace(/[ÈÉÊË]/g,  'E').replace(/[ÌÍÎÏ]/g,  'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[ÙÚÛÜ]/g,  'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C').replace(/ñ/g, 'n')
    .replace(/[^\x00-\x7F]/g, '?')
  return Array.from(clean).map(c => c.charCodeAt(0))
}

const _logoCache = new Map()
const _ua        = navigator.userAgent
const _isAndroid = /android/i.test(_ua)
const _isSunmi   = /sunmi/i.test(_ua)

export const isAndroid = () => _isAndroid
export const isSunmi   = () => _isSunmi

// ── Largè papye en DOTS ───────────────────────────────────────
// RP327 80mm = 576 dots (203 DPI)
// 58mm printer = 384 dots
const getDotWidth = (tenant) => {
  const size = tenant?.receiptSize || '80mm'
  return (size === '57mm' || size === '58mm' || size === '58') ? 384 : 576
}

// ── Largè en karaktè tèks ─────────────────────────────────────
// 80mm nòmal font = 48 char, DOUBLE_WIDTH = 24 char
const getWidth = (tenant) => {
  const size = tenant?.receiptSize || '80mm'
  return (size === '57mm' || size === '58mm' || size === '58') ? 32 : 48
}

// ── Tèks liy ak 2 bout ───────────────────────────────────────
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
    ...CMD.QR_MODEL, ...CMD.QR_SIZE, ...CMD.QR_ERROR,
    GS, 0x28, 0x6B, lenL, lenH, 0x31, 0x50, 0x30, ...data,
    ...CMD.QR_PRINT,
  ]
}

// ✅ LOGO — plen largè papye pou enpresyon klè
const logoToEscPos = async (base64url, dotWidth) => {
  try {
    const canvas = document.createElement('canvas')
    const ctx    = canvas.getContext('2d')
    const img    = new Image()
    await new Promise((resolve, reject) => {
      img.onload  = resolve
      img.onerror = reject
      img.src     = base64url
    })

    // ✅ Logo plen largè papye — pa limite a 200px ankò
    // 80mm = 576 dots, 58mm = 384 dots
    const maxW  = dotWidth        // plen largè
    const maxH  = Math.round(dotWidth * 0.4)  // max 40% lajè = pa twò wo

    const ratio = Math.min(maxW / img.width, maxH / img.height)
    const w  = Math.floor(img.width  * ratio)
    const h  = Math.floor(img.height * ratio)
    const pw = Math.ceil(w / 8) * 8   // arondi a 8 bits

    canvas.width  = pw
    canvas.height = h

    // Fon blan
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pw, h)
    // Kontrast maximòm pou printer nwa e blan
    ctx.filter = 'contrast(200%) brightness(90%)'
    ctx.drawImage(img, 0, 0, w, h)

    const pixels      = ctx.getImageData(0, 0, pw, h).data
    const bytesPerRow = pw / 8
    const bitmapBytes = []

    for (let row = 0; row < h; row++) {
      for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const idx = (row * pw + byteIdx * 8 + bit) * 4
          const lum = pixels[idx] * 0.299 + pixels[idx+1] * 0.587 + pixels[idx+2] * 0.114
          // ✅ Sèy 128 (pito 160) pou pi bon kontrast
          if (pixels[idx+3] > 128 && lum < 128) byte |= (0x80 >> bit)
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

const logoWithTimeout = async (logoUrl, dotWidth, ms = 4000) => {
  const key = `${logoUrl}_${dotWidth}`
  if (_logoCache.has(key)) return _logoCache.get(key)
  const result = await Promise.race([
    logoToEscPos(logoUrl, dotWidth),
    new Promise(r => setTimeout(() => { console.warn('Logo timeout'); r([]) }, ms))
  ])
  if (result.length > 0) _logoCache.set(key, result)
  return result
}

const sendViaRawBT = (bytes) => {
  const b64 = btoa(bytes.map(b => String.fromCharCode(b & 0xFF)).join(''))
  window.location.href = 'intent:' + b64 + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;'
}

// ── Bluetooth connect ─────────────────────────────────────────
export const connectPrinter = async () => {
  if (!navigator.bluetooth) throw new Error('WEB_BLUETOOTH_NOT_SUPPORTED')
  _device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ALL_SERVICE_UUIDS,
  })
  const server = await _device.gatt.connect()
  _device.addEventListener('gattserverdisconnected', () => { _char = null; _device = null })
  for (const { svc, chr } of KNOWN_PAIRS) {
    try {
      const service   = await server.getPrimaryService(svc)
      const candidate = await service.getCharacteristic(chr)
      if (candidate.properties.write || candidate.properties.writeWithoutResponse) {
        _char = candidate; return _device.name || 'Bluetooth Printer'
      }
    } catch {}
  }
  try {
    const services = await server.getPrimaryServices()
    for (const service of services) {
      try {
        const chars = await service.getCharacteristics()
        for (const chr of chars) {
          if (chr.properties.write || chr.properties.writeWithoutResponse) {
            _char = chr; return _device.name || 'Bluetooth Printer'
          }
        }
      } catch {}
    }
  } catch (e) { console.error('Auto-discovery echwe:', e) }
  _char = null; _device = null
  throw new Error('PRINTER_UUID_NOT_FOUND')
}

export const disconnectPrinter = () => {
  try { if (_device?.gatt?.connected) _device.gatt.disconnect() } catch {}
  _char = null; _device = null
}

export const isPrinterConnected = () => {
  try { return !!_char && !!(_device?.gatt?.connected) } catch { return false }
}

const sendViaBluetooth = async (bytes) => {
  if (!_char) throw new Error('Printer pa konekte')
  const CHUNK     = 100
  const useNoResp = !_char.properties.write && _char.properties.writeWithoutResponse
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = new Uint8Array(bytes.slice(i, i + CHUNK))
    try {
      useNoResp ? await _char.writeValueWithoutResponse(chunk) : await _char.writeValue(chunk)
    } catch {
      try { await _char.writeValueWithoutResponse(chunk) }
      catch (e2) { throw new Error('Echwe voye done: ' + e2.message) }
    }
    await new Promise(r => setTimeout(r, 20))
  }
}

const dispatch = async (bytes) => {
  if (_isSunmi) { sendViaRawBT(bytes); return }
  if (_char)    { await sendViaBluetooth(bytes); return }
  if (_isAndroid) throw new Error('ANDROID_USE_BROWSER_PRINT')
  throw new Error('Okenn printer disponib.')
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// PRINT INVOICE — tèks maksimòm klè pou RP327 80mm
// Règ: NORMAL_FONT tout kote, SMALL_FONT sèlman nòt/pye
// Logo 350px, tout valè enpòtan an BOLD
// ══════════════════════════════════════════════════════════════
export const printInvoice = async (invoice, tenant, cashier = null) => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const W           = getWidth(tenant)
  const is80        = W >= 48
  const snap        = invoice.clientSnapshot || {}
  const cashierName = cashier?.fullName || cashier?.name || null
  const totalHtg    = Number(invoice.totalHtg     || 0)
  const paidHtg     = Number(invoice.amountPaidHtg || 0)
  const balanceHtg  = Number(invoice.balanceDueHtg || 0)
  const lastPay     = invoice.payments?.length > 0 ? invoice.payments[invoice.payments.length - 1] : null
  const amountGiven = Number(lastPay?.amountGiven || 0)
  const change      = Number(lastPay?.change      || 0)
  const dueDate     = lastPay?.dueDate || invoice.dueDate || null
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const isPartial   = invoice.status === 'partial'
  const isCredit    = lastPay?.method === 'credit' || (balanceHtg > 0 && paidHtg === 0)

  const exchangeRates = (() => {
    try { const er = tenant?.exchangeRates; if (!er) return {}
      return typeof er === 'object' ? er : JSON.parse(String(er)) } catch { return {} }
  })()
  const rateUSD = Number(exchangeRates.USD || invoice.exchangeRate || 132)
  const rateDOP = Number(exchangeRates.DOP || 0)
  const toUSD   = (n) => rateUSD > 0 ? (n / rateUSD).toFixed(2) : null
  const toDOP   = (n) => rateDOP > 0 ? (n / rateDOP).toFixed(2) : null

  const METOD      = { cash:'Kach', moncash:'MonCash', natcash:'NatCash', card:'Kat kredi', transfer:'Virement', check:'Chek', credit:'Kredi', other:'Lot' }
  const statusLine = isPaid ? 'TOTAL PEYE' : isCancelled ? 'ANILE' : isCredit ? 'KREDI' : isPartial ? 'PASYAL' : 'IMPAYE'
  const bizName    = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const dateStr    = new Date(invoice.issueDate).toLocaleDateString('fr-HT')
  const logoUrl    = tenant?.logoUrl || tenant?.logo
  // ✅ Logo pi gwo: 350px pou 80mm (pa 200)
  const logoBytes  = logoUrl ? await logoWithTimeout(logoUrl, is80 ? 350 : 120) : []
  const qrContent  = (window?.location?.origin || '') + '/app/invoices/' + invoice.id

  // ── Kolòn 80mm: Nom(20) Q(4) Pri(12) Tot(12) = 48
  // ── Kolòn 58mm: Nom(16) Q(3) Pri(7)  Tot(6)  = 32
  const C = is80
    ? { nom: 20, qte: 4, pri: 12, tot: 12 }
    : { nom: 16, qte: 3, pri:  7, tot:  6 }

  // Header kolòn — GRAS pou lisibilite
  const tblHeader = is80
    ? 'Pwodwi'.padEnd(C.nom) + 'Q'.padStart(C.qte) + 'Pri (G)'.padStart(C.pri) + 'Total'.padStart(C.tot)
    : 'Pwodwi'.padEnd(C.nom) + 'Q'.padStart(C.qte) + 'Pri'.padStart(C.pri)     + 'Tot'.padStart(C.tot)

  const bytes = [
    ...CMD.INIT,

    // ══ HEADER ══════════════════════════════════════════════
    ...CMD.ALIGN_CENTER,

    // Logo — pi gwo, santré
    ...(logoBytes.length > 0 ? [...logoBytes, LF, LF] : []),

    // Non biznis — DOUBLE_BOTH (pi gwo posib)
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText(bizName + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    LF,

    // Adres ak telefòn — NORMAL_FONT (pa SMALL!) pou lisibilite
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')] : []),
    ...(tenant?.phone   ? [...CMD.BOLD_ON, ...encodeText('Tel: ' + tenant.phone + '\n'), ...CMD.BOLD_OFF] : []),
    ...(tenant?.tagline ? [...encodeText(tenant.tagline + '\n')] : []),
    LF,

    // ══ INFO TRANSAKSYON ═════════════════════════════════════
    ...CMD.ALIGN_LEFT,
    ...divider('=', W), LF,

    // Tout info an NORMAL_FONT + BOLD pou valè
    ...CMD.BOLD_ON, ...encodeText('Dat    : '), ...CMD.BOLD_OFF, ...encodeText(dateStr + '\n'),
    ...CMD.BOLD_ON, ...encodeText('Resi N : '), ...CMD.BOLD_OFF, ...encodeText((invoice.invoiceNumber || '') + '\n'),
    ...(snap.name     ? [...CMD.BOLD_ON, ...encodeText('Kliyan : '), ...CMD.BOLD_OFF, ...encodeText(snap.name.substring(0, W - 10) + '\n')] : []),
    ...(snap.phone    ? [...CMD.BOLD_ON, ...encodeText('Tel    : '), ...CMD.BOLD_OFF, ...encodeText(snap.phone + '\n')] : []),
    ...(snap.nif      ? [...CMD.BOLD_ON, ...encodeText('NIF    : '), ...CMD.BOLD_OFF, ...encodeText(snap.nif + '\n')] : []),
    ...(cashierName   ? [...CMD.BOLD_ON, ...encodeText('Kesye  : '), ...CMD.BOLD_OFF, ...encodeText(cashierName.substring(0, W - 10) + '\n')] : []),

    // ══ TABLO PWODWI ═════════════════════════════════════════
    ...divider('-', W), LF,
    ...CMD.BOLD_ON,
    ...encodeText(tblHeader.substring(0, W) + '\n'),
    ...CMD.BOLD_OFF,
    ...divider('-', W), LF,

    // Liy pwodwi — NORMAL_FONT, gras pou total
    ...(invoice.items || []).flatMap(item => {
      const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
      const qty = String(Number(item.quantity))
      const pri = fmt(item.unitPriceHtg)
      const tot = fmt(item.totalHtg)
      const result = []
      if (nom.length > C.nom) {
        result.push(...encodeText(nom.substring(0, W) + '\n'))
        result.push(...encodeText(' '.repeat(C.nom) + qty.padStart(C.qte) + pri.padStart(C.pri) + tot.padStart(C.tot) + '\n'))
      } else {
        result.push(...encodeText(nom.padEnd(C.nom) + qty.padStart(C.qte) + pri.padStart(C.pri) + tot.padStart(C.tot) + '\n'))
      }
      if (Number(item.discountPct) > 0) {
        result.push(...CMD.SMALL_FONT, ...encodeText('  Remiz: -' + item.discountPct + '%\n'), ...CMD.NORMAL_FONT)
      }
      return result
    }),

    // Remiz / Taks
    ...divider('-', W), LF,
    ...(Number(invoice.discountHtg) > 0 ? [
      ...makeLine('Remiz:', '-' + fmt(invoice.discountHtg) + ' G', W), LF,
    ] : []),
    ...(Number(invoice.taxHtg) > 0 ? [
      ...makeLine('Taks (' + Number(invoice.taxRate || 0) + '%):', fmt(invoice.taxHtg) + ' G', W), LF,
    ] : []),

    // ══ TOTAL ════════════════════════════════════════════════
    ...divider('=', W), LF,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...makeLine('  TOTAL:', fmt(totalHtg) + ' G', W), LF,
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    // Konvèsyon (NORMAL_FONT, pa SMALL)
    ...(toUSD(totalHtg) ? [
      ...CMD.ALIGN_RIGHT, ...encodeText('= $' + toUSD(totalHtg) + ' USD\n'), ...CMD.ALIGN_LEFT,
    ] : []),
    ...(toDOP(totalHtg) ? [
      ...CMD.ALIGN_RIGHT, ...encodeText('= RD$' + toDOP(totalHtg) + ' DOP\n'), ...CMD.ALIGN_LEFT,
    ] : []),

    // ══ PEMAN ════════════════════════════════════════════════
    ...divider('-', W), LF,

    ...(amountGiven > 0 ? [
      ...encodeText('Kob kliyan bay : '),
      ...CMD.BOLD_ON, ...encodeText(fmt(amountGiven) + ' G\n'), ...CMD.BOLD_OFF,
    ] : []),

    ...encodeText('Kob peye       : '),
    ...CMD.BOLD_ON, ...encodeText(fmt(paidHtg > 0 ? paidHtg : totalHtg) + ' G\n'), ...CMD.BOLD_OFF,

    ...(change > 0 ? [
      ...encodeText('Monnen remèt   : '),
      ...CMD.BOLD_ON, ...encodeText(fmt(change) + ' G\n'), ...CMD.BOLD_OFF,
    ] : []),

    ...(lastPay?.method ? [
      ...encodeText('Metod          : '),
      ...CMD.BOLD_ON, ...encodeText((METOD[lastPay.method] || lastPay.method) + '\n'), ...CMD.BOLD_OFF,
    ] : []),
    ...(lastPay?.reference ? [
      ...encodeText('Ref            : ' + lastPay.reference.substring(0, W - 18) + '\n'),
    ] : []),

    // Balans / Kredi
    ...(balanceHtg > 0 ? [
      ...divider('-', W), LF,
      ...CMD.BOLD_ON,
      ...makeLine('Balans ki rete :', '-' + fmt(balanceHtg) + ' G', W), LF,
      ...CMD.BOLD_OFF,
      ...(toUSD(balanceHtg) ? [
        ...CMD.ALIGN_RIGHT, ...encodeText('= -$' + toUSD(balanceHtg) + ' USD\n'), ...CMD.ALIGN_LEFT,
      ] : []),
      ...CMD.ALIGN_CENTER,
      ...CMD.BOLD_ON, ...encodeText('*** KREDI ***\n'), ...CMD.BOLD_OFF,
      ...(dueDate
        ? [...encodeText('Dat limit: ' + new Date(dueDate).toLocaleDateString('fr-HT') + '\n')]
        : [...encodeText('Peye pi vit posib\n')]
      ),
      ...CMD.ALIGN_LEFT,
    ] : []),

    // ══ STATUT FINAL ══════════════════════════════════════════
    ...divider('=', W), LF,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_BOTH,
    ...encodeText(statusLine + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    LF,
    // Total final — BOLD + DOUBLE_HEIGHT
    ...CMD.ALIGN_LEFT,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...makeLine(
      isPaid ? 'TOTAL PEYE:' : isCredit ? 'MONTANT DI:' : isPartial ? 'DEJA PEYE:' : 'TOTAL:',
      fmt(isPaid ? totalHtg : paidHtg > 0 ? paidHtg : totalHtg) + ' G',
      W
    ), LF,
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    // ══ QR CODE ══════════════════════════════════════════════
    ...(tenant?.showQrCode !== false ? [
      LF,
      ...CMD.ALIGN_CENTER,
      ...makeQR(qrContent),
      ...CMD.SMALL_FONT,
      ...encodeText(invoice.invoiceNumber + '\n'),
      ...CMD.NORMAL_FONT,
    ] : []),

    // ══ FOOTER ═══════════════════════════════════════════════
    ...CMD.ALIGN_CENTER,
    ...divider('-', W), LF,
    ...CMD.BOLD_ON,
    ...encodeText('Mesi paske ou achte lakay nou!\n'),
    ...CMD.BOLD_OFF,
    ...encodeText('Machandiz pa reprann ni chanje.\n'),
    ...divider('-', W), LF,
    ...CMD.SMALL_FONT,
    ...encodeText('Pwodwi pa: Plus Group | +509 4244-9024\n'),
    ...CMD.NORMAL_FONT,
    LF, LF, ...CMD.CUT,
  ]

  await dispatch(bytes)
}


export const printSabotayReceipt = async (plan, member, paidDates = [], tenant, type = 'peman', allSlots = []) => {
  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')
  const savedSize   = typeof localStorage !== 'undefined' ? localStorage.getItem('receipt_size') : null
  const receiptSize = savedSize || tenant?.receiptSize || '80mm'
  const W           = (receiptSize === '57mm' || receiptSize === '58mm') ? 32 : 48
  const txDate      = new Date().toLocaleDateString('fr-HT') + ' ' + new Date().toLocaleTimeString('fr-HT', { hour:'2-digit', minute:'2-digit' })
  const activeMemberCount = plan.activeMemberCount || plan.maxMembers || 0
  const payout      = (plan.amount * activeMemberCount) - (plan.feePerMember || plan.fee || 0)

  const slotCount   = allSlots.length > 0 ? allSlots.length : 1
  const posLabel    = allSlots.length > 1
    ? allSlots.map(s => '#' + s.position).join(' / ')
    : '#' + member.position

  const amtPaid = allSlots.length > 1
    ? allSlots.reduce((acc, slot) => {
        const slotPaid = Object.keys(slot.payments || {})
          .filter(d => slot.payments[d] && !paidDates.includes(d)).length
        return acc + slotPaid * plan.amount
      }, 0)
    : Object.keys(member.payments || {})
        .filter(d => member.payments[d] && !paidDates.includes(d)).length * plan.amount
  const totalAmt = paidDates.length * plan.amount * slotCount
  const kontribisyonTotal = amtPaid + totalAmt

  const FREQ = { daily:'Chak Jou', weekly_saturday:'Chak Samdi', weekly_monday:'Chak Lendi', biweekly:'Chak 15 Jou', monthly:'Chak Mwa', weekdays:'Lendi-Vandredi' }
  const logoBytes = tenant?.logoUrl ? await logoWithTimeout(tenant.logoUrl, W >= 48 ? 200 : 120) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, LF] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.BOLD_ON, ...encodeText('-- SABOTAY SOL --\n'), ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + tenant.phone + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(tenant?.address ? [...CMD.SMALL_FONT, ...encodeText(tenant.address + '\n'), ...CMD.NORMAL_FONT] : []),
    ...divider('=', W), LF,
    ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText(type === 'peman' ? 'RESI PEMAN\n' : type === 'tiraj' ? 'RESI TIRAJ AVEG\n' : type === 'kanpe' ? 'KANPE PATISIPASYON\n' : 'KONT MANM KREYE\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), LF,
    ...CMD.ALIGN_LEFT,
    ...makeLine('Plan:', plan.name.substring(0, W - 6), W), LF,
    ...makeLine('Dat:', txDate, W), LF,
    ...divider('-', W), LF,
    ...CMD.BOLD_ON, ...encodeText(member.name.substring(0, W) + '\n'), ...CMD.BOLD_OFF,
    ...(member.phone ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + member.phone + '\n'), ...CMD.NORMAL_FONT] : []),
    ...makeLine('Pozisyon:', posLabel, W), LF,
    ...(slotCount > 1 ? [...makeLine('Men:', slotCount + ' (' + fmt(plan.amount * slotCount) + ' G/sik)', W), LF] : []),
    ...makeLine('Frekans:', FREQ[plan.frequency] || plan.frequency, W), LF,
    ...divider('-', W), LF,
    ...(type === 'peman' ? [
      ...CMD.BOLD_ON, ...encodeText('Dat Peye:\n'), ...CMD.BOLD_OFF,
      ...paidDates.flatMap(d => [
        ...CMD.SMALL_FONT,
        ...encodeText('  ' + d.split('-').reverse().join('/') + ' — ' +
          (slotCount > 1 ? slotCount + 'x' + fmt(plan.amount) + '=' + fmt(plan.amount * slotCount) : fmt(plan.amount)) + ' G\n'),
        ...CMD.NORMAL_FONT,
      ]),
      ...divider('=', W), LF,
      ...CMD.ALIGN_LEFT, ...CMD.BOLD_ON,
      ...makeLine('TOTAL PEYE:', fmt(totalAmt) + ' G', W), LF, ...CMD.BOLD_OFF,
      ...makeLine('Kontribisyon total:', fmt(kontribisyonTotal) + ' G', W), LF,
    ] : type === 'tiraj' ? [
      ...CMD.ALIGN_CENTER,
      ...CMD.SMALL_FONT, ...encodeText('Moun Chwazi pa Tiraj:\n'), ...CMD.NORMAL_FONT,
      ...CMD.BOLD_ON, ...encodeText(member.name.substring(0, W) + '\n'), ...CMD.BOLD_OFF,
      ...CMD.SMALL_FONT, ...encodeText('Pozisyon #' + member.position + '\n'), ...CMD.NORMAL_FONT,
      ...divider('=', W), LF,
      ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT, ...encodeText('PRIM SOL: ' + fmt(payout) + ' G\n'), ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
      ...CMD.ALIGN_LEFT,
    ] : type === 'kanpe' ? [
      ...CMD.ALIGN_CENTER,
      ...CMD.BOLD_ON, ...encodeText('Manm sa a kanpe.\n'), ...CMD.BOLD_OFF,
      ...CMD.SMALL_FONT, ...encodeText('Li ka resevwa kob li le sol la fini.\n'), ...CMD.NORMAL_FONT,
      ...CMD.ALIGN_LEFT,
    ] : [
      ...makeLine('Montan / Peman:', fmt(plan.amount) + ' G', W), LF,
      ...makeLine('Total Kontribye:', fmt(amtPaid) + ' G', W), LF,
      ...divider('=', W), LF,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
      ...encodeText('PRIM SOL: ' + fmt(payout) + ' G\n'),
      ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF, ...CMD.ALIGN_LEFT,
    ]),
    ...divider('-', W), LF,
    ...CMD.ALIGN_CENTER, ...CMD.SMALL_FONT,
    ...encodeText('Envite yon moun serye k ap fe biznis\n'),
    ...encodeText('rejwenn nou, epi w ap benefisye\n'),
    ...encodeText('yon bonis ki evalye soti 1% rive 5%\n'),
    ...encodeText('de kob manm sa pral touche a.\n'),
    ...encodeText('Ekri nou sou WhatsApp:\n'),
    ...CMD.BOLD_ON, ...encodeText('+50942449024\n'), ...CMD.BOLD_OFF,
    ...CMD.NORMAL_FONT,
    ...divider('=', W), LF,
    ...CMD.BOLD_ON, ...encodeText('Mesi! / Merci!\n'), ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT, ...encodeText('PlusGroup Tel: +50942449024\n'), ...CMD.NORMAL_FONT,
    LF, LF, ...CMD.CUT,
  ]

  await dispatch(bytes)
}

export const printKaneReceipt = async (account, transaction, tenant, type = 'ouverture') => {
  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 }).replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')
  const W         = getWidth(tenant)
  const TX_LABELS = { ouverture:'OUVETI KONT', depot:'DEPO', retrait:'RETRE' }
  const METOD     = { cash:'Kach', moncash:'MonCash', natcash:'NatCash', card:'Kat kredi', transfer:'Virement', check:'Chek', credit:'Kredi', other:'Lot' }
  const txDate    = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleDateString('fr-HT') + ' ' + new Date(transaction.createdAt).toLocaleTimeString('fr-HT', { hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleDateString('fr-HT')
  const logoBytes = tenant?.logoUrl ? await logoWithTimeout(tenant.logoUrl, W >= 48 ? 200 : 120) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, LF] : []),
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((tenant?.businessName || tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.BOLD_ON, ...encodeText('-- KANE EPAY --\n'), ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + tenant.phone + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(tenant?.address ? [...CMD.SMALL_FONT, ...encodeText(tenant.address + '\n'), ...CMD.NORMAL_FONT] : []),
    ...divider('=', W), LF,
    ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT, ...encodeText((TX_LABELS[type] || 'TRANZAKSYON') + '\n'), ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), LF,
    ...CMD.ALIGN_LEFT,
    ...makeLine('No. Kont:', account.accountNumber || '', W), LF,
    ...makeLine('Dat:', txDate, W), LF,
    ...divider('-', W), LF,
    ...CMD.BOLD_ON, ...encodeText((account.firstName + ' ' + account.lastName).substring(0, W) + '\n'), ...CMD.BOLD_OFF,
    ...(account.address        ? [...CMD.SMALL_FONT, ...encodeText(account.address.substring(0, W) + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(account.nifOrCin       ? [...CMD.SMALL_FONT, ...encodeText('NIF/CIN: ' + account.nifOrCin + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(account.phone          ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + account.phone + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(account.familyRelation ? [...CMD.SMALL_FONT, ...encodeText('Ref: ' + account.familyRelation + (account.familyName ? ' - ' + account.familyName : '') + '\n'), ...CMD.NORMAL_FONT] : []),
    ...divider('-', W), LF,
    ...(type === 'ouverture' ? [
      ...makeLine('Montan depoze:', fmt(account.openingAmount) + ' G', W), LF,
      ...makeLine('Fre kane:', '- ' + fmt(account.kaneFee || 0) + ' G', W), LF,
      ...makeLine('Montan bloke:', '- ' + fmt(account.lockedAmount || 0) + ' G', W), LF,
    ] : [
      ...makeLine('Balans anvan:', fmt(transaction?.balanceBefore) + ' G', W), LF,
    ]),
    ...divider('=', W), LF,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText((type === 'ouverture' ? 'BALANS: ' : type === 'retrait' ? 'RETRE: ' : 'DEPO: ') + fmt(type === 'ouverture' ? account.balance : transaction?.amount) + ' G\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...(type !== 'ouverture' ? [...CMD.ALIGN_LEFT, ...makeLine('Nouvo balans:', fmt(transaction?.balanceAfter) + ' G', W), LF] : []),
    ...(transaction?.method ? [
      ...divider('-', W), LF,
      ...makeLine('Metod:', METOD[transaction.method] || transaction.method, W), LF,
      ...(transaction.reference ? [...makeLine('Ref:', transaction.reference, W), LF] : []),
    ] : []),
    ...divider('=', W), LF,
    ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...encodeText('Mesi!\n'), ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT, ...encodeText('PlusGroup — Tel: +50942449024\n'), ...CMD.NORMAL_FONT,
    LF, LF, ...CMD.CUT,
  ]

  await dispatch(bytes)
}

export const printPreReceipt = async (pre, echeances = [], tenant, type = 'ouverture', paiement = null, largeur = 80) => {
  const fmt = (n) => Number(n || 0)
    .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
    .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

  const fmtD = (d) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return '' }
  }

  const W = (largeur === 57 || largeur === 58) ? 32 : 48
  const PERIODES = { jounal: 'Chak Jou', semaine: 'Semèn', biweekly: '2 Semèn', mois: 'Mwa', trimestre: 'Trimès' }
  const bizName  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logoBytes = tenant?.logoUrl ? await logoWithTimeout(tenant.logoUrl, W >= 48 ? 200 : 120) : []

  const bytes = [
    ...CMD.INIT,
    ...(logoBytes.length > 0 ? [...CMD.ALIGN_CENTER, ...logoBytes, LF] : []),
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON, ...CMD.DOUBLE_BOTH,
    ...encodeText(bizName + '\n'),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...CMD.BOLD_ON, ...encodeText('-- MIKWO KREDI --\n'), ...CMD.BOLD_OFF,
    ...(tenant?.phone   ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + tenant.phone + '\n'), ...CMD.NORMAL_FONT] : []),
    ...(tenant?.address ? [...CMD.SMALL_FONT, ...encodeText(tenant.address + '\n'), ...CMD.NORMAL_FONT] : []),
    ...divider('=', W), LF,
    ...CMD.BOLD_ON, ...CMD.DOUBLE_HEIGHT,
    ...encodeText(
      type === 'ouverture' ? 'KONTRA PRE\n'
      : type === 'peman' ? 'RESI PEMAN\n'
      : 'KLOTIRE PRE\n'
    ),
    ...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF,
    ...divider('=', W), LF,
    ...CMD.ALIGN_LEFT,
    ...CMD.SMALL_FONT,
    ...makeLine('No. Pre:', pre.numeroPre || '', W), LF,
    ...makeLine('Dat:', fmtD(new Date()), W), LF,
    ...divider('-', W), LF,
    ...CMD.BOLD_ON, ...encodeText((pre.clientNom || '').substring(0, W) + '\n'), ...CMD.BOLD_OFF,
    ...(pre.clientPhone  ? [...encodeText('Tel: ' + pre.clientPhone  + '\n')] : []),
    ...(pre.clientNifCin ? [...encodeText('CIN/NIF: ' + pre.clientNifCin + '\n')] : []),
    ...CMD.NORMAL_FONT,
    ...divider('-', W), LF,
    ...CMD.SMALL_FONT,
    ...makeLine('Kapital:', fmt(pre.montant) + ' G', W), LF,
    ...makeLine('To intere:', pre.tauxInteret + '% / mwa', W), LF,
    ...makeLine('Dire:', pre.dureeEnMois + ' mwa', W), LF,
    ...makeLine('Frekans:', PERIODES[pre.periode] || pre.periode || 'Mwa', W), LF,
    ...(Number(pre.montantBloke) > 0 ? [...makeLine('Depozit bloke:', fmt(pre.montantBloke) + ' G', W), LF] : []),
    ...(pre.garantiByens ? [...encodeText('Garanti: ' + pre.garantiByens.substring(0, W - 9) + '\n')] : []),
    ...CMD.NORMAL_FONT,
    ...divider('=', W), LF,
    ...CMD.BOLD_ON,
    ...makeLine('TOTAL DWE:', fmt(pre.totalDu) + ' G', W), LF,
    ...CMD.BOLD_OFF,
    ...(type === 'paiement' && paiement ? [
      ...divider('-', W), LF,
      ...CMD.SMALL_FONT,
      ...makeLine('Deja Peye:', fmt(Number(pre.totalPaye || 0) - Number(paiement.montant || 0)) + ' G', W), LF,
      ...CMD.BOLD_ON, ...makeLine('PEMAN JE A:', fmt(paiement.montant) + ' G', W), LF, ...CMD.BOLD_OFF,
      ...makeLine('Rete:', fmt(Math.max(0, Number(pre.totalDu) - Number(pre.totalPaye || 0))) + ' G', W), LF,
      ...(paiement.method    ? [...makeLine('Metod:', paiement.method, W), LF] : []),
      ...(paiement.reference ? [...makeLine('Ref:', paiement.reference, W), LF] : []),
      ...CMD.NORMAL_FONT,
    ] : []),
    ...(type === 'paiement' && echeances.length > 0 ? (() => {
      const peye = echeances.filter(e => e.statut === 'paye' || e.statut === 'partiel')
      if (peye.length === 0) return []
      const rows = []
      rows.push(
        ...divider('-', W), LF,
        ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
        ...encodeText('DAT PEMAN TCHEKE\n'),
        ...CMD.BOLD_OFF, ...CMD.ALIGN_LEFT,
        ...CMD.SMALL_FONT,
      )
      for (const e of peye) {
        const num  = String(e.numero || '').padEnd(3)
        const dat  = fmtD(e.dat_paye || e.datPaye || '').substring(0, 10).padEnd(12)
        const tot  = fmt(e.montant_total || e.montantTotal || 0).padStart(W - 3 - 12 - 3)
        const stat = e.statut === 'paye' ? ' OK' : ' 1/2'
        rows.push(...encodeText(num + dat + tot + stat + '\n'))
      }
      rows.push(...CMD.NORMAL_FONT)
      return rows
    })() : []),
  ]

  if (type === 'ouverture' && echeances.length > 0) {
    bytes.push(
      ...divider('=', W), LF,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON,
      ...encodeText('KALANDRIYE RANBOUSMAN\n'),
      ...CMD.BOLD_OFF, ...CMD.ALIGN_LEFT,
    )
    if (W >= 48) {
      bytes.push(...CMD.SMALL_FONT, ...encodeText('#  Dat        Capital   Intere    Total\n'), ...CMD.NORMAL_FONT)
      bytes.push(...divider('-', W), LF)
      for (const e of echeances) {
        const num  = String(e.numero || e.num || '').padEnd(3)
        const dat  = fmtD(e.dat_limit || e.datLimit).substring(0, 10).padEnd(11)
        const cap  = fmt(e.montant_capital || e.montantCapital || 0).padStart(8)
        const int_ = fmt(e.montant_interet || e.montantInteret || 0).padStart(8)
        const tot  = fmt(e.montant_total   || e.montantTotal   || 0).padStart(8)
        bytes.push(...CMD.SMALL_FONT, ...encodeText(num + dat + cap + ' ' + int_ + ' ' + tot + '\n'), ...CMD.NORMAL_FONT)
      }
    } else {
      bytes.push(...CMD.SMALL_FONT, ...encodeText('#  Dat     Capital  Int    Tot\n'), ...CMD.NORMAL_FONT)
      bytes.push(...divider('-', W), LF)
      for (const e of echeances) {
        const num  = String(e.numero || '').padEnd(3)
        const dat  = fmtD(e.dat_limit || e.datLimit).substring(0, 8).padEnd(9)
        const cap  = String(Math.round(Number(e.montant_capital || e.montantCapital || 0))).padStart(6)
        const int_ = String(Math.round(Number(e.montant_interet || e.montantInteret || 0))).padStart(5)
        const tot  = String(Math.round(Number(e.montant_total   || e.montantTotal   || 0))).padStart(5)
        bytes.push(...CMD.SMALL_FONT, ...encodeText(num + dat + cap + int_ + tot + '\n'), ...CMD.NORMAL_FONT)
      }
    }
    bytes.push(
      ...divider('-', W), LF,
      ...CMD.SMALL_FONT, ...CMD.BOLD_ON,
      ...makeLine('TOTAL:', fmt(echeances.reduce((s, e) => s + Number(e.montant_total || e.montantTotal || 0), 0)) + ' G', W), LF,
      ...CMD.BOLD_OFF, ...CMD.NORMAL_FONT,
    )
  }

  if (type === 'ouverture') {
    bytes.push(
      ...divider('=', W), LF,
      ...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...encodeText('SIYATI\n'), ...CMD.BOLD_OFF,
      ...CMD.ALIGN_LEFT, LF,
      ...encodeText('Emprunteur / Kliyan:\n'),
      ...divider('_', W), LF,
      ...encodeText((pre.clientNom || '').substring(0, W) + '\n'), LF,
    )
    if (pre.avalize1Nom) {
      bytes.push(
        ...encodeText('Avalize 1: ' + (pre.avalize1Nom || '') + '\n'),
        ...divider('_', W), LF,
        ...(pre.avalize1Phone ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + pre.avalize1Phone + '\n'), ...CMD.NORMAL_FONT] : []),
        LF,
      )
    }
    if (pre.avalize2Nom) {
      bytes.push(
        ...encodeText('Avalize 2: ' + (pre.avalize2Nom || '') + '\n'),
        ...divider('_', W), LF,
        ...(pre.avalize2Phone ? [...CMD.SMALL_FONT, ...encodeText('Tel: ' + pre.avalize2Phone + '\n'), ...CMD.NORMAL_FONT] : []),
        LF,
      )
    }
    bytes.push(
      ...encodeText('Responsab Kredi:\n'),
      ...divider('_', W), LF, LF,
    )
  }

  bytes.push(
    ...divider('=', W), LF,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON, ...encodeText('Mesi! / Merci!\n'), ...CMD.BOLD_OFF,
    ...CMD.SMALL_FONT,
    ...encodeText(bizName + '\n'),
    ...(tenant?.phone ? [...encodeText('Tel: ' + tenant.phone + '\n')] : []),
    ...CMD.NORMAL_FONT,
    LF, LF, ...CMD.CUT,
  )

  await dispatch(bytes)
}