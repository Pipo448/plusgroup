// src/services/printerNative.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Enpresyon NATIVE via UniversalPrinter plugin
// Itilize nan APK Capacitor sèlman (Bluetooth/Sunmi/iMin/Telpo)
// ══════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core'
// ✅ KORIJE — STATIC import (pa dynamic) pou plugin lan deja "an memwa" depi
// paj la chaje (pandan w te an liy). Dynamic import ("await import(...)") te
// bezwen re-telechaje yon ti moso kòd sou ENTÈNÈT chak fwa — sa ki fè enprime
// echwe lè pa gen entènèt. Static import rezoud sa nèt.
import { UniversalPrinter } from '@capacitor-plus/universal-printer'

const fmtN = (n) => Number(n || 0)
  .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  // ✅ KORIJE — retire "espas san koupe" (U+00A0) ke toLocaleString ajoute pou milye yo.
  // Karaktè sa a se 2 bytes an UTF-8, li fè enprimant Bluetooth "korompi" l an fo-karaktè chinwa.
  .replace(/\u00A0/g, ' ')

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  // ✅ KORIJE — fòse fizo orè Ayiti (America/New_York, UTC-5) pou dat la
  // pa "sote" yon jou si aparèy la gen yon lòt fizo orè konfigire (egzanp UTC).
  return date.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/New_York' })
}

// ✅ NOUVO — Dat + Lè (pou montre EGZAKTEMAN lè yon vant fèt oswa lè yon resi enprime)
const fmtDateTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const datePart = date.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/New_York' })
  const timePart = date.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' })
  return `${datePart} ${timePart}`
}

const STATUS_LABELS = {
  unpaid:    'NON PAYEE',
  partial:   'ACOMPTE (PARTIEL)',
  paid:      'PAYEE',
  cancelled: 'ANNULEE',
  refunded:  'REMBOURSEE',
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
 * Ouvri tiwa kès la (si l konekte atravè enprimant lan — kab "kick-out").
 * ⚠️ NOUVO — Eseye dabò metòd dedye plugin UniversalPrinter a
 * (`openDrawer` / `openCashBox`, selon vèsyon plugin). Si plugin an pa
 * gen metòd sa a, li tonbe sou voye kòmand brit ESC/POS pou "kick"
 * atravè `print()` (paramèt `raw`), ki mache ak prèske tout enprimant/tiwa.
 */
export async function openCashDrawerNative() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Ouvri tiwa kès sèlman disponib nan app Android la (APK)')
  }
  // ── Metòd 1: API dedye plugin la (verifye non egzat metòd la nan
  // dokimantasyon @capacitor-plus/universal-printer ou a — chanje l si
  // li rele yon lòt jan, egzanp openCashBox() oswa kickDrawer())
  if (typeof UniversalPrinter.openDrawer === 'function') {
    await UniversalPrinter.openDrawer()
    return
  }
  // ── Metòd 2 (repli) — kòmand brit ESC/POS pou "kick" tiwa a,
  // voye atravè menm mekanis print() lan tankou yon "print" espesyal
  const ESC = 0x1B
  const kickBytes = [ESC, 0x70, 0x00, 0x19, 0xFA]
  if (typeof UniversalPrinter.printRaw === 'function') {
    await UniversalPrinter.printRaw({ bytes: kickBytes })
    return
  }
  throw new Error('Plugin UniversalPrinter la pa sipòte ouvri tiwa kès dirèkteman — verifye dokimantasyon plugin la pou bon non fonksyon an.')
}

/**
 * Konstwi liy yo pou enprime yon fakti, epi voye yo bay
 * plugin UniversalPrinter la (Sunmi/iMin/Telpo/Bluetooth otomatik).
 */
export async function printInvoiceNative(invoice, tenant, cashier = null, copies = 1) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Enprime native sèlman disponib nan app Android la (APK)')
  }

  // ✅ Plugin la deja chaje (static import anlè a) — pa gen bezwen entènèt isit la

  const snap        = invoice.clientSnapshot || {}
  const totalHtg     = Number(invoice.totalHtg      || 0)
  const paidHtg       = Number(invoice.amountPaidHtg  || 0)
  const balanceHtg    = Number(invoice.balanceDueHtg  || 0)
  const isPaid        = invoice.status === 'paid'
  const isPartial     = invoice.status === 'partial'
  const isCancelled   = invoice.status === 'cancelled'
  // ✅ NOUVO — detay peman (Kob kliyan bay / Monnen remèt / Metòd / Ref),
  // menm chan ki deja itilize nan vèsyon web la (printerService.js /
  // printReceiptHTML.js), pou 2 rezi yo bay MENM enfo.
  const lastPay       = invoice.payments?.length > 0 ? invoice.payments[invoice.payments.length - 1] : null
  const amountGiven   = Number(lastPay?.amountGiven || 0)
  const change        = Number(lastPay?.change      || 0)
  const dueDate       = lastPay?.dueDate || invoice.dueDate || null
  const isCredit      = lastPay?.method === 'credit' || (balanceHtg > 0 && paidHtg === 0)

  // ✅ NOUVO — konvèsyon USD/DOP, menm lojik ak vèsyon web la
  const exchangeRates = (() => {
    try {
      const er = tenant?.exchangeRates
      return er ? (typeof er === 'object' ? er : JSON.parse(String(er))) : {}
    } catch { return {} }
  })()
  const rateUSD = Number(exchangeRates.USD || invoice.exchangeRate || 132)
  const rateDOP = Number(exchangeRates.DOP || 0)
  const toUSD   = (n) => rateUSD > 0 ? (n / rateUSD).toFixed(2) : null
  const toDOP   = (n) => rateDOP > 0 ? (n / rateDOP).toFixed(2) : null

  const METOD = {
    cash:'Kach', moncash:'MonCash', natcash:'NatCash', card:'Kat kredi',
    transfer:'Virement', check:'Chek', credit:'Kredi', other:'Lot',
  }

  const lines = []

  // ─── Logo (si genyen) — DWE PREMYE, anlè tèt tout bagay ───
  if (tenant?.logoUrl && tenant?.printLogoOnReceipt !== false) {
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

  // ─── Enfo fakti — MENM lòd/etikèt ak vèsyon web la ───
  lines.push({ type: 'text', content: `Date : ${fmtDateTime(invoice.issueDate)}`, size: 'small' })
  lines.push({ type: 'text', content: `Resi N : ${invoice.invoiceNumber || ''}`, bold: true })
  if (cashier?.fullName || cashier?.email) {
    lines.push({ type: 'text', content: `Kesye : ${cashier.fullName || cashier.email}`, size: 'small' })
  }
  if (snap.name) {
    lines.push({ type: 'text', content: `Kliyan : ${snap.name}`, size: 'small' })
  }
  if (snap.phone) {
    lines.push({ type: 'text', content: `Tel: ${snap.phone}`, size: 'small' })
  }
  if (snap.nif) {
    lines.push({ type: 'text', content: `NIF: ${snap.nif}`, size: 'small' })
  }

  lines.push({ type: 'divider' })

  // ─── Atik yo ───
  const items = invoice.items || []
  for (const item of items) {
    const nom = item.product?.name || item.productSnapshot?.name || 'Article'
    const qty = Number(item.quantity)
    const pri = fmtN(item.unitPriceHtg)
    const tot = fmtN(item.totalHtg)

    lines.push({ type: 'text', content: nom, bold: true })
    lines.push({
      type: 'table',
      columns: [
        { text: `${qty} x ${pri}`, width: 60, align: 'left' },
        { text: `${tot} G`,        width: 40, align: 'right' },
      ]
    })

    if (Number(item.discountPct) > 0) {
      // ✅ KORIJE — '↳' pa nan codepage Windows-1252, ranplase l ak ekivalan ASCII
      lines.push({ type: 'text', content: `  -> Remise : -${item.discountPct}%`, size: 'small' })
    }
  }

  lines.push({ type: 'divider' })

  // ─── Totaux ───
  lines.push({
    type: 'table',
    columns: [
      { text: 'SOUS-TOTAL', width: 60, align: 'left' },
      { text: `${fmtN(invoice.subtotalHtg || totalHtg)} G`, width: 40, align: 'right' },
    ]
  })

  if (Number(invoice.discountHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Remise', width: 60, align: 'left' },
        { text: `-${fmtN(invoice.discountHtg)} G`, width: 40, align: 'right' },
      ]
    })
  }

  if (Number(invoice.taxHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: `Taxe (${Number(invoice.taxRate || 0)}%)`, width: 60, align: 'left' },
        { text: `${fmtN(invoice.taxHtg)} G`, width: 40, align: 'right' },
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
      { text: `${fmtN(totalHtg)} G`, width: 60, align: 'right' },
    ]
  })
  // ✅ NOUVO — konvèsyon USD/DOP, menm jan ak vèsyon web la
  if (toUSD(totalHtg)) {
    lines.push({ type: 'text', content: `= $${toUSD(totalHtg)} USD`, align: 'right', size: 'small' })
  }
  if (toDOP(totalHtg)) {
    lines.push({ type: 'text', content: `= RD$${toDOP(totalHtg)} DOP`, align: 'right', size: 'small' })
  }
  lines.push({ type: 'divider', char: '=' })

  // ✅ NOUVO — Detay peman (Kob kliyan bay / Kob peye / Monnen remèt /
  // Metòd / Ref) — menm chan/lòd ak vèsyon web la
  lines.push({ type: 'divider' })
  if (amountGiven > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Kob kliyan bay', width: 60, align: 'left' },
        { text: `${fmtN(amountGiven)} G`, width: 40, align: 'right' },
      ]
    })
  }
  lines.push({
    type: 'table',
    columns: [
      { text: 'Kob peye', width: 60, align: 'left' },
      { text: `${fmtN(paidHtg > 0 ? paidHtg : totalHtg)} G`, width: 40, align: 'right' },
    ]
  })
  if (change > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Monnen remèt', width: 60, align: 'left' },
        { text: `${fmtN(change)} G`, width: 40, align: 'right' },
      ]
    })
  }
  if (lastPay?.method) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Metod', width: 60, align: 'left' },
        { text: METOD[lastPay.method] || lastPay.method, width: 40, align: 'right' },
      ]
    })
  }
  if (lastPay?.reference) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Ref', width: 40, align: 'left' },
        { text: String(lastPay.reference), width: 60, align: 'right' },
      ]
    })
  }

  // ─── Estati peman ───
  if (isCancelled) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: 'X FACTURE ANNULEE', align: 'center', bold: true, size: 'large' })
  } else if (isPartial) {
    lines.push({ type: 'divider' })
    lines.push({
      type: 'table',
      columns: [
        { text: 'Balans ki rete', width: 60, align: 'left' },
        { text: `-${fmtN(balanceHtg)} G`, width: 40, align: 'right' },
      ]
    })
    if (dueDate) {
      lines.push({ type: 'text', content: `Dat limit: ${fmtDate(dueDate)}`, align: 'center', size: 'small' })
    }
  } else if (!isPaid) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: `A PAYER : ${fmtN(balanceHtg)} G`, align: 'center', bold: true })
  }

  // ✅ NOUVO — estati final + total repete, menm jan ak vèsyon web la
  // (statusLine + "TOTAL PEYE:"/"MONTANT DI:"/"DEJA PEYE:")
  lines.push({ type: 'divider', char: '=' })
  lines.push({
    type: 'text',
    content: isPaid ? 'TOTAL PEYE' : isCancelled ? 'ANILE' : isCredit ? 'KREDI' : isPartial ? 'PASYAL' : 'IMPAYE',
    align: 'center', bold: true, size: 'large',
  })
  lines.push({
    type: 'table',
    bold: true,
    columns: [
      { text: isPaid ? 'TOTAL PEYE:' : isCredit ? 'MONTANT DI:' : isPartial ? 'DEJA PEYE:' : 'TOTAL:', width: 40, align: 'left' },
      { text: `${fmtN(isPaid ? totalHtg : paidHtg > 0 ? paidHtg : totalHtg)} G`, width: 60, align: 'right' },
    ]
  })
  lines.push({ type: 'divider', char: '=' })

  // ✅ NOUVO — QR kòd, menm jan ak vèsyon web la.
  // ⚠️ VERIFYE: mwen sipoze plugin @capacitor-plus/universal-printer a
  // sipòte yon liy tip 'qr' (konsistan ak 'text'/'table'/'image'/'space'
  // ki deja itilize pi wo a) — men mwen pa gen dokimantasyon plugin lan
  // sou machin sa a pou m konfime non/paramèt egzat la. Si enprime kraze
  // oswa QR la pa parèt, chèche nan dokimantasyon plugin ou a ki jan pou
  // enprime yon QR (petèt yon lòt non tankou 'barcode' oswa yon metòd
  // apa `UniversalPrinter.printQR(...)`), epi ranplase blòk sa a.
  if (tenant?.showQrCode !== false) {
    const qrLink = `${tenant?.webBaseUrl || 'https://app.plusgroupe.com'}/app/invoices/${invoice.id}`
    lines.push({ type: 'space' })
    lines.push({ type: 'qr', content: qrLink, align: 'center' })
    lines.push({ type: 'text', content: invoice.invoiceNumber || '', align: 'center', size: 'small' })
  }

  lines.push({ type: 'space' })

  // ─── Footer ───
  // ✅ KORIJE — Nòt/Avètisman konfigirab (paramèt Tenant) parèt PREMYE
  // kounye a, e pi vizib (ankadre ant 2 divizè '=', an gra) pou l pa pèdi
  // nan mitan rès tèks la — se pou sa yo rele l "avètisman".
  if (tenant?.receiptFooterNote) {
    lines.push({ type: 'divider', char: '=' })
    lines.push({ type: 'text', content: tenant.receiptFooterNote, align: 'center', size: 'small', bold: true })
    lines.push({ type: 'divider', char: '=' })
    lines.push({ type: 'space' })
  }

  // ✅ KORIJE — "Powered by" olye "Mèsi pou konfyans ou!" (piblisite Plus Group)
  lines.push({ type: 'text', content: 'Powered by plusgroupe.com', align: 'center', bold: true, size: 'small' })
  lines.push({ type: 'text', content: 'Tél: +50942449024', align: 'center', size: 'small' })
  lines.push({ type: 'text', content: tenant?.name || 'PLUS GROUP', align: 'center', size: 'small' })

  // ✅ NOUVO — Dat/Lè REYÈL enprimasyon an (pa lè vant lan fèt) — nan pye paj tout anba
  lines.push({ type: 'space' })
  lines.push({ type: 'text', content: `Imprime le : ${fmtDateTime(new Date())}`, align: 'center', size: 'small' })

  // ✅ NOUVO — Netwaye aksan yo (é, è, à, ò...) pou evite "?" sou enprimant Bluetooth
  const cleanLines = sanitizeLines(lines)

  // ─── Voye nan plugin la ───
  const result = await UniversalPrinter.print({
    lines: cleanLines,
    // ✅ NOUVO — pèmèt enprime plizyè kopi (egzanp: 1 pou kliyan, 1 pou achiv)
    copies: Math.max(1, Number(copies) || 1),
    cutAtEnd: true,
  })

  if (!result.success) {
    throw new Error(result.message || 'Erè pandan enprime')
  }

  return result
}

/**
 * ✅ NOUVO — Enprime yon fich rapò JENERIK (Sesyon Kès, Kontwòl Estòk,
 * elt.) atravè plugin UniversalPrinter la, menm mekanis ak
 * printInvoiceNative. Sèvi pou nenpòt fich ki gen sèlman antèt + liy
 * "label: valè" — pa gen bezwen bati yon fonksyon apa pou chak nouvo tip
 * rapò nou ajoute pita.
 */
export async function printGenericReportNative({ title, subtitle, meta = [], rows = [] }, tenant) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Enprime native sèlman disponib nan app Android la (APK)')
  }

  const lines = []

  if (tenant?.logoUrl && tenant?.printLogoOnReceipt !== false) {
    lines.push({ type: 'image', url: tenant.logoUrl, align: 'center' })
    lines.push({ type: 'space' })
  }

  lines.push({ type: 'text', content: tenant?.name || 'PLUS GROUP', align: 'center', size: 'large', bold: true })
  if (tenant?.address) {
    lines.push({ type: 'text', content: tenant.address, align: 'center', size: 'small' })
  }
  if (tenant?.phone) {
    lines.push({ type: 'text', content: `Tel: ${tenant.phone}`, align: 'center', size: 'small', bold: true })
  }

  lines.push({ type: 'divider', char: '=' })
  lines.push({ type: 'text', content: title, align: 'center', bold: true, size: 'large' })
  if (subtitle) {
    lines.push({ type: 'text', content: subtitle, align: 'center', size: 'small' })
  }
  lines.push({ type: 'divider', char: '=' })

  meta.forEach(m => {
    lines.push({
      type: 'table',
      columns: [
        { text: String(m.label), width: 45, align: 'left' },
        { text: String(m.value), width: 55, align: 'right' },
      ],
    })
  })

  if (meta.length) lines.push({ type: 'divider' })

  rows.forEach(r => {
    lines.push({
      type: 'table',
      bold: !!r.strong,
      columns: [
        { text: String(r.label), width: 45, align: 'left' },
        { text: String(r.value), width: 55, align: 'right' },
      ],
    })
  })

  lines.push({ type: 'divider', char: '=' })
  lines.push({ type: 'space' })
  lines.push({ type: 'text', content: 'Powered by plusgroupe.com', align: 'center', bold: true, size: 'small' })
  lines.push({ type: 'text', content: 'Tél: +50942449024', align: 'center', size: 'small' })
  lines.push({ type: 'space' })
  lines.push({ type: 'text', content: `Imprime le : ${fmtDateTime(new Date())}`, align: 'center', size: 'small' })

  const cleanLines = sanitizeLines(lines)

  const result = await UniversalPrinter.print({ lines: cleanLines, copies: 1, cutAtEnd: true })
  if (!result.success) {
    throw new Error(result.message || 'Erè pandan enprime')
  }
  return result
}

// ✅ NOUVO — Estati devi (labèl pou enprime)
const QUOTE_STATUS_LABELS = {
  draft:     'BROUILLON',
  sent:      'ENVOYE',
  accepted:  'ACCEPTE',
  converted: 'CONVERTI EN FACTURE',
  cancelled: 'ANNULE',
}

/**
 * Konstwi liy yo pou enprime yon DEVI (pwoforma), epi voye yo bay
 * plugin UniversalPrinter la (Sunmi/iMin/Telpo/Bluetooth otomatik).
 * Menm mekanis ak printInvoiceNative, adapte pou estrikti Devi a
 * (pa gen enfo peman/kesye, men gen dat ekspirasyon + estati).
 */
export async function printQuoteNative(quote, tenant) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Enprime native sèlman disponib nan app Android la (APK)')
  }

  const snap        = quote.clientSnapshot || {}
  const totalHtg     = Number(quote.totalHtg || 0)
  const isCancelled  = quote.status === 'cancelled'
  const isConverted  = quote.status === 'converted'

  const lines = []

  // ─── Logo (si genyen) — DWE PREMYE, anlè tèt tout bagay ───
  if (tenant?.logoUrl && tenant?.printLogoOnReceipt !== false) {
    lines.push({ type: 'image', url: tenant.logoUrl, align: 'center' })
    lines.push({ type: 'space' })
  }

  // ─── HEADER: Non konpayi (apre logo a) ───
  lines.push({ type: 'text', content: tenant?.name || 'PLUS GROUP', align: 'center', size: 'large', bold: true })
  if (tenant?.address) {
    lines.push({ type: 'text', content: tenant.address, align: 'center', size: 'small' })
  }
  if (tenant?.phone) {
    const phones = String(tenant.phone).split(/[,\/]/).map(p => p.trim()).filter(Boolean)
    phones.forEach(phone => {
      lines.push({ type: 'text', content: `Tel: ${phone}`, align: 'center', size: 'small', bold: true })
    })
  }

  lines.push({ type: 'divider', char: '=' })

  // ─── Tit DEVI ───
  lines.push({ type: 'text', content: 'PROFORMA / DEVIS', align: 'center', bold: true })

  // ─── Enfo devi ───
  lines.push({ type: 'text', content: `Date : ${fmtDate(quote.issueDate)}`, size: 'small' })
  lines.push({ type: 'text', content: `Devis : ${quote.quoteNumber || ''}`, bold: true })
  if (quote.expiryDate) {
    lines.push({ type: 'text', content: `Expire le : ${fmtDate(quote.expiryDate)}`, size: 'small' })
  }
  if (snap.name) {
    lines.push({ type: 'text', content: `Client : ${snap.name}`, size: 'small' })
  }
  if (snap.phone) {
    lines.push({ type: 'text', content: `Tel: ${snap.phone}`, size: 'small' })
  }

  lines.push({ type: 'divider' })

  // ─── Atik yo ───
  const items = quote.items || []
  for (const item of items) {
    const nom = item.product?.name || item.productSnapshot?.name || 'Article'
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
      lines.push({ type: 'text', content: `  -> Remise : -${item.discountPct}%`, size: 'small' })
    }
  }

  lines.push({ type: 'divider' })

  // ─── Totaux ───
  lines.push({
    type: 'table',
    columns: [
      { text: 'SOUS-TOTAL', width: 60, align: 'left' },
      { text: `${fmtN(quote.subtotalHtg || totalHtg)} HTG`, width: 40, align: 'right' },
    ]
  })

  if (Number(quote.discountHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Remise', width: 60, align: 'left' },
        { text: `-${fmtN(quote.discountHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
  }

  if (Number(quote.taxHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: `Taks (${Number(quote.taxRate || 0)}%)`, width: 60, align: 'left' },
        { text: `${fmtN(quote.taxHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
  }

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

  // ─── Estati devi ───
  if (isCancelled) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: 'X DEVIS ANNULE', align: 'center', bold: true, size: 'large' })
  } else if (isConverted) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: '* CONVERTI EN FACTURE *', align: 'center', bold: true })
  } else {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: `Statut : ${QUOTE_STATUS_LABELS[quote.status] || ''}`, align: 'center', size: 'small' })
  }

  lines.push({ type: 'space' })

  // ─── Footer ───
  if (tenant?.receiptFooterNote) {
    lines.push({ type: 'divider', char: '=' })
    lines.push({ type: 'text', content: tenant.receiptFooterNote, align: 'center', size: 'small', bold: true })
    lines.push({ type: 'divider', char: '=' })
    lines.push({ type: 'space' })
  }

  lines.push({ type: 'text', content: 'Powered by plusgroupe.com', align: 'center', bold: true, size: 'small' })
  lines.push({ type: 'text', content: 'Tél: +50942449024', align: 'center', size: 'small' })
  lines.push({ type: 'text', content: tenant?.name || 'PLUS GROUP', align: 'center', size: 'small' })

  lines.push({ type: 'space' })
  lines.push({ type: 'text', content: `Imprime le : ${fmtDateTime(new Date())}`, align: 'center', size: 'small' })

  const cleanLines = sanitizeLines(lines)

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
/**
 * ✅ NOUVO — Enprime yon DEVI DIRÈK (pwodui/sèvis ki pa nan katalòg estòk).
 * Atik yo se tèks tape alamen (item.description), pa gen lyen ak Product.
 */
export async function printDirectQuoteNative(directQuote, tenant) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Enprime native sèlman disponib nan app Android la (APK)')
  }

  const snap     = directQuote.clientSnapshot || {}
  const totalHtg = Number(directQuote.totalHtg || 0)
  const isCancelled = directQuote.status === 'cancelled'

  const lines = []

  if (tenant?.logoUrl && tenant?.printLogoOnReceipt !== false) {
    lines.push({ type: 'image', url: tenant.logoUrl, align: 'center' })
    lines.push({ type: 'space' })
  }

  lines.push({ type: 'text', content: tenant?.name || 'Entreprise', align: 'center', size: 'large', bold: true })
  if (tenant?.address) {
    lines.push({ type: 'text', content: tenant.address, align: 'center', size: 'small' })
  }
  if (tenant?.phone) {
    lines.push({ type: 'text', content: `Tel: ${tenant.phone}`, align: 'center', size: 'small', bold: true })
  }

  lines.push({ type: 'divider', char: '=' })
  lines.push({ type: 'text', content: 'DEVIS DIRECT', align: 'center', bold: true })
  lines.push({ type: 'text', content: `Date : ${fmtDate(directQuote.issueDate)}`, size: 'small' })
  lines.push({ type: 'text', content: `Devis : ${directQuote.quoteNumber || ''}`, bold: true })
  if (snap.name) lines.push({ type: 'text', content: `Client : ${snap.name}`, size: 'small' })
  if (snap.phone) lines.push({ type: 'text', content: `Tel: ${snap.phone}`, size: 'small' })

  lines.push({ type: 'divider' })

  const items = directQuote.items || []
  for (const item of items) {
    const qty = fmtN(item.quantity)
    const pri = fmtN(item.unitPriceHtg)
    const tot = fmtN(item.totalHtg)
    lines.push({ type: 'text', content: item.description || 'Article', bold: true })
    // ✅ NOUVO — montre gwosè a sou resi a si li genyen
    if (item.size) {
      lines.push({ type: 'text', content: `  Taille : ${item.size}`, size: 'small' })
    }
    lines.push({
      type: 'table',
      columns: [
        { text: `${qty} x ${pri}`, width: 60, align: 'left' },
        { text: `${tot} HTG`,      width: 40, align: 'right' },
      ]
    })
  }

  lines.push({ type: 'divider' })
  lines.push({
    type: 'table',
    columns: [
      { text: 'SOUS-TOTAL', width: 60, align: 'left' },
      { text: `${fmtN(directQuote.subtotalHtg || totalHtg)} HTG`, width: 40, align: 'right' },
    ]
  })

  if (Number(directQuote.discountHtg) > 0) {
    lines.push({
      type: 'table',
      columns: [
        { text: 'Remise', width: 60, align: 'left' },
        { text: `-${fmtN(directQuote.discountHtg)} HTG`, width: 40, align: 'right' },
      ]
    })
  }

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

  if (isCancelled) {
    lines.push({ type: 'space' })
    lines.push({ type: 'text', content: 'X DEVIS ANNULE', align: 'center', bold: true, size: 'large' })
  }

  lines.push({ type: 'space' })
  lines.push({ type: 'text', content: 'Powered by plusgroupe.com', align: 'center', bold: true, size: 'small' })
  lines.push({ type: 'text', content: 'Tél: +50942449024', align: 'center', size: 'small' })
  lines.push({ type: 'space' })
  lines.push({ type: 'text', content: `Imprime le : ${fmtDateTime(new Date())}`, align: 'center', size: 'small' })

  const cleanLines = sanitizeLines(lines)

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