// src/services/printerService.js
// Goojprt PT-210 — ESC/POS via Web Bluetooth (Android Chrome)

// ── UUID Goojprt PT-210 (MTP-II)
const PRINTER_SERVICE_UUID      = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHAR_UUID         = '00002af1-0000-1000-8000-00805f9b34fb'

// Fallback UUID si premye a pa mache
const PRINTER_SERVICE_UUID_2    = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const PRINTER_CHAR_UUID_2       = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

// ── Sèvis global (kenbe koneksyon an vivan)
let _device = null
let _char   = null

// ── ESC/POS kòmand debaz
const ESC  = 0x1B
const GS   = 0x1D
const LF   = 0x0A

const CMD = {
  INIT:           [ESC, 0x40],
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],
  NORMAL_SIZE:    [ESC, 0x21, 0x00],
  SMALL_FONT:     [ESC, 0x4D, 0x01],
  NORMAL_FONT:    [ESC, 0x4D, 0x00],
  LINE_FEED:      [LF],
  CUT:            [GS, 0x56, 0x41, 0x03], // coud papye
}

// ── Konvèti tèks an bytes (Latin-1 pou Kreyòl)
const encodeText = (text) => {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire accent
    .replace(/[^\x00-\x7F]/g, '?')   // replace chars ki pa ASCII
  return Array.from(clean).map(c => c.charCodeAt(0))
}

// ── Kreye yon liy 32 karaktè (pou 58mm)
const LINE_WIDTH = 32

const line = (left, right = '') => {
  const total = LINE_WIDTH
  if (!right) {
    return encodeText(left.substring(0, total).padEnd(total))
  }
  const spaces = total - left.length - right.length
  if (spaces <= 0) {
    return encodeText((left.substring(0, total - right.length - 1) + ' ' + right).substring(0, total))
  }
  return encodeText(left + ' '.repeat(spaces) + right)
}

const divider = (char = '-') => encodeText(char.repeat(LINE_WIDTH))

// ── Voye bytes nan printer a (chunk pa chunk)
const sendBytes = async (bytes) => {
  if (!_char) throw new Error('Printer pa konekte')

  const CHUNK = 100 // bytes pa chunk
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.slice(i, i + CHUNK)
    await _char.writeValue(new Uint8Array(chunk))
    await new Promise(r => setTimeout(r, 20)) // pran souf
  }
}

// ── Konekte ak printer a
export const connectPrinter = async () => {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth pa sipòte sou navigatè sa. Itilize Chrome Android.')
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
    _device.addEventListener('gattserverdisconnected', () => {
      _char = null
      _device = null
    })

    // Eseye premye service UUID
    try {
      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
      _char = await service.getCharacteristic(PRINTER_CHAR_UUID)
    } catch {
      // Eseye dezyèm UUID si premye a echwe
      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID_2)
      _char = await service.getCharacteristic(PRINTER_CHAR_UUID_2)
    }

    return _device.name || 'Goojprt PT-210'
  } catch (err) {
    _char = null
    _device = null
    throw err
  }
}

// ── Dekonekte
export const disconnectPrinter = () => {
  if (_device?.gatt?.connected) {
    _device.gatt.disconnect()
  }
  _char   = null
  _device = null
}

// ── Tcheke koneksyon
export const isPrinterConnected = () => !!_char && !!_device?.gatt?.connected

// ── Enprime Resi Fakti
export const printInvoice = async (invoice, tenant) => {
  if (!_char) throw new Error('Printer pa konekte')

  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

  const bytes = [
    ...CMD.INIT,
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText((tenant?.name || 'PLUS GROUP') + '\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,

    // Adrès ak kontakt
    ...(tenant?.address ? [...encodeText(tenant.address + '\n')] : []),
    ...(tenant?.phone   ? [...encodeText('Tel: ' + tenant.phone + '\n')] : []),
    ...CMD.LINE_FEED,

    ...CMD.ALIGN_LEFT,
    ...divider('='), ...CMD.LINE_FEED,

    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...encodeText('FACTURE\n'),
    ...CMD.BOLD_OFF,
    ...CMD.ALIGN_LEFT,

    // Nimewo + Dat
    ...line('No:', invoice.invoiceNumber || ''), ...CMD.LINE_FEED,
    ...line('Dat:', new Date(invoice.issueDate).toLocaleDateString('fr-HT')), ...CMD.LINE_FEED,

    // Kliyan
    ...(invoice.clientSnapshot?.name
      ? [...line('Kliyan:', invoice.clientSnapshot.name), ...CMD.LINE_FEED]
      : []),
    ...(invoice.clientSnapshot?.phone
      ? [...line('Tel:', invoice.clientSnapshot.phone), ...CMD.LINE_FEED]
      : []),

    ...divider('-'), ...CMD.LINE_FEED,

    // Header kolòn atik yo
    ...CMD.SMALL_FONT,
    ...CMD.BOLD_ON,
    ...encodeText('ATIK            QTE  TOTAL HTG\n'),
    ...CMD.BOLD_OFF,
    ...divider('-'), ...CMD.LINE_FEED,

    // Atik yo
    ...(invoice.items || []).flatMap(item => {
      const nom   = (item.product?.name || item.productSnapshot?.name || 'Atik').substring(0, 16)
      const qte   = String(Number(item.quantity))
      const total = fmt(item.totalHtg)
      const row   = nom.padEnd(16) + qte.padStart(4) + total.padStart(12)
      return [...encodeText(row.substring(0, LINE_WIDTH) + '\n')]
    }),

    ...CMD.NORMAL_FONT,
    ...divider('-'), ...CMD.LINE_FEED,

    // Totaux
    ...line('Sous-total:', fmt(invoice.subtotalHtg) + ' HTG'), ...CMD.LINE_FEED,
    ...(Number(invoice.discountHtg) > 0
      ? [...line('Remiz:', '-' + fmt(invoice.discountHtg) + ' HTG'), ...CMD.LINE_FEED]
      : []),
    ...(Number(invoice.taxHtg) > 0
      ? [...line('TVA (' + Number(invoice.taxRate) + '%):', fmt(invoice.taxHtg) + ' HTG'), ...CMD.LINE_FEED]
      : []),

    ...divider('='), ...CMD.LINE_FEED,

    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...CMD.DOUBLE_HEIGHT,
    ...encodeText('TOTAL: ' + fmt(invoice.totalHtg) + ' HTG\n'),
    ...CMD.NORMAL_SIZE,
    ...CMD.BOLD_OFF,
    ...CMD.ALIGN_LEFT,

    ...divider('-'), ...CMD.LINE_FEED,

    // Peman
    ...line('Peye:', fmt(invoice.amountPaidHtg) + ' HTG'), ...CMD.LINE_FEED,
    ...(Number(invoice.balanceDueHtg) > 0
      ? [...line('Balans:', fmt(invoice.balanceDueHtg) + ' HTG'), ...CMD.LINE_FEED]
      : []),

    // Statut
    ...CMD.ALIGN_CENTER,
    ...CMD.BOLD_ON,
    ...encodeText(
      invoice.status === 'paid'    ? '*** PEYE ***\n' :
      invoice.status === 'partial' ? '--- PASYAL ---\n' :
      '--- IMPAYE ---\n'
    ),
    ...CMD.BOLD_OFF,

    // Taux chanj
    ...(tenant?.exchangeRate
      ? [...CMD.ALIGN_CENTER, ...CMD.SMALL_FONT, ...encodeText('1 USD = ' + Number(tenant.exchangeRate).toFixed(2) + ' HTG\n'), ...CMD.NORMAL_FONT]
      : []),

    ...CMD.LINE_FEED,
    ...CMD.ALIGN_CENTER,
    ...encodeText('Mesi pou konfyans ou!\n'),
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,
    ...CMD.LINE_FEED,

    // Koupe papye
    ...CMD.CUT,
  ]

  await sendBytes(bytes)
}
