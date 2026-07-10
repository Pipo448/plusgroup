// src/services/printerNative.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Enpresyon NATIVE via UniversalPrinter plugin
// Itilize nan APK Capacitor sèlman (Bluetooth/Sunmi/iMin/Telpo)
// ══════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core'

const fmtN = (n) => Number(n || 0)
  .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  // ✅ KORIJE — retire "espas san koupe" (U+00A0) ke toLocaleString ajoute pou milye yo.
  // Karaktè sa a se 2 bytes an UTF-8, li fè enprimant Bluetooth "korompi" l an fo-karaktè chinwa.
  .replace(/\u00A0/g, ' ')

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_LABELS = {
  unpaid:    'PA PEYE',
  partial:   'DEPO (PASYÈL)',
  paid:      'PEYE',
  cancelled: 'ANILE',
  refunded:  'REMÈT',
}

// ✅ NOUVO — Retire aksan (é, è, à, ò, ù, ç, ñ...) pou GARANTI konpatibilite
// ak TOUT enprimant tèmik, menm sa ki pa sipòte codepage Windows-1252 byen.
// San sa, kèk enprimant montre "?" olye lèt aksan yo.
const ACCENT_MAP = {
  'á':'a','à':'a','â':'a','ã':'a','ä':'a','Á':'A','À':'A','Â':'A','Ã':'A','Ä':'A',
  'é':'e','è':'e','ê':'e','ë':'e','É':'E','È':'E','Ê':'E','Ë':'E',
  'í':'i','ì':'i','î':'i','ï':'i','Í':'I','Ì':'I','Î':'I','Ï':'I',
  'ó':'o','ò':'o','ô':'o','õ':'o','ö':'o','Ó':'O','Ò':'O','Ô':'O','Õ':'O','Ö':'O',
  'ú':'u','ù':'u','û':'u','ü':'u','Ú':'U','Ù':'U','Û':'U','Ü':'U',
  'ç':'c','Ç':'C','ñ':'n','Ñ':'N',
}
const ACCENT_REGEX = /[áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ]/g

function stripAccents(str) {
  if (!str) return str
  return String(str).replace(ACCENT_REGEX, ch => ACCENT_MAP[ch] || ch)
}

// ✅ NOUVO — Netwaye tout liy yo (tèks + tablo) anvan voye bay enprimant lan
function sanitizeLines(lines) {
  return lines.map(line => {
    const l = { ...line }
    if (l.type === 'text' && l.content) l.content = stripAccents(l.content)
    if (l.type === 'table' && Array.isArray(l.columns)) {
      l.columns = l.columns.map(c => ({ ...c, text: stripAccents(c.text) }))
    }
    return l
  })
}

/**
 * Èske plugin native a disponib sou aparèy sa a?
 * (Sèlman nan APK Capacitor — pa nan navigatè web)
 */
export function isNativePrinterAvailable() {
  return Capacitor.isNativePlatform()
}

/**
 * Konstwi liy yo pou enprime yon fakti, epi voye yo bay
 * plugin UniversalPrinter la (Sunmi/iMin/Telpo/Bluetooth otomatik).
 */
export async function printInvoiceNative(invoice, tenant, cashier = null) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Enprime native sèlman disponib nan app Android la (APK)')
  }

  // ✅ Import dinamik — pa kraze build web la si plugin pa disponib
  const { UniversalPrinter } = await import('@capacitor-plus/universal-printer')

  const snap        = invoice.clientSnapshot || {}
  const totalHtg     = Number(invoice.totalHtg      || 0)
  const paidHtg       = Number(invoice.amountPaidHtg  || 0)
  const balanceHtg    = Number(invoice.balanceDueHtg  || 0)
  const isPaid        = invoice.status === 'paid'
  const isPartial     = invoice.status === 'partial'
  const isCancelled   = invoice.status === 'cancelled'

  const lines = []

  // ─── Logo (si genyen) — DWE PREMYE, anlè tèt tout bagay ───
  if (tenant?.logoUrl) {
    lines.push({ type: 'image', url: tenant.logoUrl, align: 'center' })
    lines.push({ type: 'space' })
  }

  // ─── HEADER: Non konpayi (apre logo a) ───
  lines.push({ type: 'text', content: tenant?.name || 'PLUS GROUP', align: 'center', size: 'large', bold: true })
  if (tenant?.address) {
    lines.push({ type: 'text', content: tenant.address, align: 'center', size: 'small' })
  }
  if (tenant?.phone) {
    // ✅ si gen 2+ nimewo separe pa vigil (,) oswa (/), enprime chak sou pwòp liy pa l
    const phones = String(tenant.phone).split(/[,\/]/).map(p => p.trim()).filter(Boolean)
    phones.forEach(phone => {
      lines.push({ type: 'text', content: `Tel: ${phone}`, align: 'center', size: 'small', bold: true })
    })
  }

  lines.push({ type: 'divider', char: '=' })

  // ─── Enfo fakti ───
  lines.push({ type: 'text', content: `Dat: ${fmtDate(invoice.issueDate)}`, size: 'small' })
  lines.push({ type: 'text', content: `Fakti: ${invoice.invoiceNumber || ''}`, bold: true })
  if (cashier?.fullName || cashier?.email) {
    lines.push({ type: 'text', content: `Kesye: ${cashier.fullName || cashier.email}`, size: 'small' })
  }
  if (snap.name) {
    lines.push({ type: 'text', content: `Kliyan: ${snap.name}`, size: 'small' })
  }
  if (snap.phone) {
    lines.push({ type: 'text', content: `Tel: ${snap.phone}`, size: 'small' })
  }

  lines.push({ type: 'divider' })

  // ─── Atik yo ───
  const items = invoice.items || []
  for (const item of items) {
    const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
    const qty = Number(item.quantity)
    const pri = fmtN(item.unitPriceHtg)
    const tot = fmtN(item.totalHtg)

    lines.push({ type: 'text', content: nom, bold: true })
    lines.push({
      type: 'table',
      columns: [
        { text: `${qty} x ${pri}`, width: 60, align: 'left' },
        { text: `${tot} HTG`,      width: 40, align: 'right' },
      ]
    })

    if (Number(item.discountPct) > 0) {
      // ✅ KORIJE — '↳' pa nan codepage Windows-1252, ranplase l ak ekivalan ASCII
      lines.push({ type: 'text', content: `  -> Remiz: -${item.discountPct}%`, size: 'small' })
    }
  }

  lines.push({ type: 'divider' })

  // ─── Totaux ───
  lines.push({
    type: 'table',
    columns: [
      { text: 'SOUS-TOTAL', width: 60, align: 'left' },
      { text: `${fmtN(invoice.subtotalHtg || totalHtg)} HTG`, width: 40, align: 'right' },
    ]
  })

  if (Number(invoice.discountHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Rabè', width: 60, align: 'left' },
        { text: `-${fmtN(invoice.discountHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
  }

  if (Number(invoice.taxHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: `Taks (${Number(invoice.taxRate || 0)}%)`, width: 60, align: 'left' },
        { text: `${fmtN(invoice.taxHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
  }

  // ─── TOTAL — estrikti tablo (label + montan) an gra, pou l pa "wrap" mal sou papye a ───
  // (font 'large' konsome 2x plas — sou 58mm sa fè tèks long antre nan yon lòt liy;
  // yon tablo an gra rete nan yon sèl liy, byen aliye, tankou lòt liy total yo)
  lines.push({ type: 'divider', char: '=' })
  lines.push({
    type: 'table',
    bold: true,
    columns: [
      { text: 'TOTAL', width: 40, align: 'left' },
      { text: `${fmtN(totalHtg)} HTG`, width: 60, align: 'right' },
    ]
  })
  lines.push({ type: 'divider', char: '=' })

  // ─── Estati peman ───
  if (isCancelled) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: 'X FAKTI ANILE', align: 'center', bold: true, size: 'large' })
  } else if (isPaid) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: '* PEYE KONPLÈ *', align: 'center', bold: true })
  } else if (isPartial) {
    lines.push({ type: 'divider' })
    lines.push({
      type: 'table',
      columns: [
        { text: 'Depo peye', width: 60, align: 'left' },
        { text: `${fmtN(paidHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
    lines.push({
      type: 'table',
      columns: [
        { text: 'Rete pou peye', width: 60, align: 'left' },
        { text: `${fmtN(balanceHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
  } else {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: `POU PEYE: ${fmtN(balanceHtg)} HTG`, align: 'center', bold: true })
  }

  lines.push({ type: 'space' })

  // ─── Footer ───
  lines.push({ type: 'text', content: 'Mèsi pou konfyans ou!', align: 'center', bold: true, size: 'small' })
  lines.push({ type: 'text', content: tenant?.name || 'PLUS GROUP', align: 'center', size: 'small' })

  // ✅ NOUVO — Nòt/Avètisman konfigirab (paramèt Tenant) ki parèt nan pye paj la
  if (tenant?.receiptFooterNote) {
    lines.push({ type: 'space' })
    lines.push({ type: 'divider' })
    lines.push({ type: 'text', content: tenant.receiptFooterNote, align: 'center', size: 'small' })
  }

  // ✅ NOUVO — Netwaye aksan yo (é, è, à, ò...) pou evite "?" sou enprimant Bluetooth
  const cleanLines = sanitizeLines(lines)

  // ─── Voye nan plugin la ───
  const result = await UniversalPrinter.print({
    lines: cleanLines,
    copies: 1,
    cutAtEnd: true,
  })

  if (!result.success) {
    throw new Error(result.message || 'Erè pandan enprime')
  }

  return result
}