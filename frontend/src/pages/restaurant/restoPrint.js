// src/pages/restaurant/restoPrint.js
// ─── Enpresyon modil Restoran: resi kès, adisyon, tikè kizin, rapò Z ────────
// Menm règ ak resi POS yo (printerService.js / printReport.js):
//   1) APK Android (plugin natif)     → printGenericReportNative  (Bluetooth / Sunmi / iMin / Telpo)
//   2) Sunmi oswa enprimant BT konekte → printGenericReceipt (ESC/POS, 32 oswa 48 karaktè)
//   3) Sinon                           → fenèt enpresyon navigatè a (USB / Windows driver), fòma 57 mm oswa 80 mm
// Lajè papye: localStorage « receipt_size » (aparèy sa a) → tenant.receiptSize (Paramèt) → 80 mm.
// Resi yo an FRANSE. Pye: nòt tenant an → « Powered by plusgroupe.com · Tél: +509 4244 9024 ».
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { printGenericReceipt, isPrinterConnected, isSunmi } from '../../services/printerService'
import { isNativePrinterAvailable, printGenericReportNative } from '../../services/printerNative'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const amt = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, ' ')
const now = () => new Date().toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const MODE_FR = { takeaway: 'À emporter', dinein: 'Sur place', delivery: 'Livraison' }
const METHOD_FR = { cash: 'Espèces', moncash: 'MonCash', natcash: 'NatCash', card: 'Carte' }
const SOURCE_FR = { table: 'Tables', online: 'En ligne', counter: 'Caisse (comptoir)' }

// ── Tenant + lajè papye ──────────────────────────────────────────────
const currentTenant = () => { try { return useAuthStore.getState?.()?.tenant || null } catch { return null } }

/** '57mm' oswa '80mm' — menm sous ak printerService (receipt_size → tenant.receiptSize) */
export function paperSize(tenant = currentTenant()) {
  let saved = null
  try { saved = localStorage.getItem('receipt_size') } catch { /* */ }
  const s = String(saved || tenant?.receiptSize || '80mm')
  return /^5[78]/.test(s) ? '57mm' : '80mm'
}
/** Chanje lajè papye pou aparèy sa a (menm kle ak resi POS / Sabotay yo) */
export function setPaperSize(size) {
  try { localStorage.setItem('receipt_size', size === '57mm' ? '57mm' : '80mm') } catch { /* */ }
}

export const tenantReceiptNote = (tenant) =>
  tenant?.receiptFooterNote || tenant?.settings?.receiptNote || tenant?.settings?.invoiceNote || tenant?.settings?.warningNote || tenant?.receiptNote || ''

const bizName = (tenant, fallback) => tenant?.businessName || tenant?.name || fallback || 'PLUS GROUP'

// ── Yon sèl fil enpresyon: 2 tikè pa janm melanje sou enprimant Bluetooth la ──
let queue = Promise.resolve()
const enqueue = (job) => { queue = queue.then(job, job); return queue }

// ══════════════════════════════════════════════════════════════════════
// DOKIMAN JENERIK → (A) ESC/POS tèks   (B) HTML 57/80 mm
// doc = { docTitle, label, big, subs[], meta[[l,v]], items[{qty,name,unit,note}], kitchen,
//         totals[[l,v,strong]], notes[], footerNote, showLogo }
// ══════════════════════════════════════════════════════════════════════

// Koupe yon tèks an plizyè liy ki pa depase `width` karaktè
function wrap(text, width) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  const out = []
  let line = ''
  for (const w of words) {
    if (w.length > width) { if (line) { out.push(line); line = '' } for (let i = 0; i < w.length; i += width) out.push(w.slice(i, i + width)); continue }
    if (!line) line = w
    else if (line.length + 1 + w.length <= width) line += ` ${w}`
    else { out.push(line); line = w }
  }
  if (line) out.push(line)
  return out.length ? out : ['']
}

// (A) Fòma tèks pou printGenericReceipt / printGenericReportNative
function toTextDoc(doc, W) {
  // printerService.makeLine: si pa gen valè adwat, etikèt la dwe ≤ W-1 karaktè (sinon li koupe l)
  const L = W - 1
  const sep = { label: '-'.repeat(L), value: '' }
  const rows = []
  const addSep = () => { if (rows.length && rows[rows.length - 1] !== sep) rows.push(sep) }
  if (doc.items?.length) {
    for (const it of doc.items) {
      const qty = `${it.qty} x `
      if (doc.kitchen) {
        wrap(`${qty}${it.name}`, L - 4).forEach((l, i) => rows.push({ label: i ? `    ${l}` : l, value: '', strong: true }))
        if (it.note) wrap(`-> ${it.note}`, L - 4).forEach((l) => rows.push({ label: `    ${l}`, value: '' }))
        continue
      }
      const total = amt(it.qty * it.unit)
      const first = wrap(`${qty}${it.name}`, Math.max(10, W - total.length - 1 - 4))
      first.forEach((l, i) => rows.push({ label: i ? `    ${l}` : l, value: i === first.length - 1 ? total : '' }))
      if (it.qty > 1) rows.push({ label: `    @ ${amt(it.unit)}`, value: '' })
    }
  }
  if (doc.totals?.length) { addSep(); for (const [label, value, strong] of doc.totals) rows.push({ label, value: String(value), strong: !!strong }) }
  if (doc.notes?.length) { addSep(); doc.notes.forEach((n) => wrap(n, L).forEach((l) => rows.push({ label: l, value: '' }))) }
  if (doc.footerNote) { addSep(); wrap(doc.footerNote, L).forEach((l) => rows.push({ label: l, value: '' })) }
  return {
    title: [doc.label, doc.big].filter(Boolean).join(' - '),
    subtitle: (doc.subs || []).filter(Boolean).join(' | '),
    meta: (doc.meta || []).map(([label, value]) => ({ label, value: String(value) })),
    rows,
  }
}

// (B) HTML pou fenèt enpresyon navigatè a — 57 mm (48 mm enprimab) oswa 80 mm (72 mm)
function cssFor(size) {
  const s57 = size === '57mm'
  return `
  @page { size: ${s57 ? '57mm' : '80mm'} auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; color: #000 !important; }
  html, body { background: #fff; }
  body { width: ${s57 ? '48mm' : '72mm'}; margin: 0 auto; padding: ${s57 ? '2mm 0 4mm' : '3mm 0 5mm'};
    font: 700 ${s57 ? '9.5pt' : '10.5pt'}/1.3 Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    word-wrap: break-word; overflow-wrap: anywhere; }
  .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
  .logo { display: block; margin: 0 auto 2mm; max-width: ${s57 ? '34mm' : '46mm'}; max-height: ${s57 ? '14mm' : '18mm'}; object-fit: contain; }
  .biz { font-size: ${s57 ? '12.5pt' : '14.5pt'}; font-weight: 900; text-align: center; line-height: 1.15; }
  .hl { font-size: ${s57 ? '8pt' : '8.5pt'}; text-align: center; }
  .lbl { margin-top: 1.5mm; text-align: center; font-size: ${s57 ? '10pt' : '11pt'}; font-weight: 900; letter-spacing: 1px; }
  .big { text-align: center; font-size: ${s57 ? '26pt' : '32pt'}; font-weight: 900; line-height: 1.05; margin: 1mm 0; overflow-wrap: normal; word-break: normal; }
  .big.k { font-size: ${s57 ? '22pt' : '28pt'}; }
  .sub { text-align: center; font-size: ${s57 ? '9pt' : '10pt'}; }
  .sub.b { font-size: ${s57 ? '10.5pt' : '12pt'}; font-weight: 900; }
  .sep { border-top: 1.5px dashed #000; margin: 2mm 0; }
  .sep.eq { border-top: 2px solid #000; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { vertical-align: top; padding: 0.4mm 0; }
  .meta td:first-child { width: 42%; } .meta td:last-child { text-align: right; }
  .it .q { width: ${s57 ? '7mm' : '9mm'}; font-weight: 900; }
  .it .t { width: ${s57 ? '17mm' : '21mm'}; text-align: right; white-space: nowrap; }
  .it .u { display: block; font-size: ${s57 ? '7.5pt' : '8pt'}; font-weight: 700; }
  .kit td { font-size: ${s57 ? '12pt' : '14pt'}; font-weight: 900; padding: 0.8mm 0; }
  .kit .q { width: ${s57 ? '9mm' : '12mm'}; }
  .kit .n { font-size: ${s57 ? '9pt' : '10pt'}; font-weight: 700; font-style: italic; padding-left: ${s57 ? '9mm' : '12mm'}; }
  .tot td { font-size: ${s57 ? '9.5pt' : '10.5pt'}; } .tot td:last-child { text-align: right; white-space: nowrap; }
  .tot td:first-child { padding-right: 1.5mm; }
  .tot .s td { font-size: ${s57 ? '11pt' : '14pt'}; font-weight: 900; padding-top: 1mm; }
  .note { text-align: center; font-size: ${s57 ? '9pt' : '10pt'}; margin-top: 1mm; }
  .foot { text-align: center; font-size: ${s57 ? '7.5pt' : '8pt'}; margin-top: 1mm; }
  tr, .big, .tot { page-break-inside: avoid; }`
}

function toHtml(doc, tenant, size) {
  const logo = doc.showLogo && tenant?.logoUrl && tenant?.printLogoOnReceipt !== false ? `<img class="logo" src="${esc(tenant.logoUrl)}" alt="">` : ''
  const head = `${logo}<div class="biz">${esc(doc.biz)}</div>
    ${!doc.kitchen && tenant?.address ? `<div class="hl">${esc(tenant.address)}</div>` : ''}
    ${!doc.kitchen && tenant?.phone ? `<div class="hl">Tél : ${esc(tenant.phone)}</div>` : ''}`
  const items = !doc.items?.length ? '' : doc.kitchen
    ? `<table class="kit">${doc.items.map((it) => `<tr><td class="q">${esc(it.qty)}×</td><td>${esc(it.name)}</td></tr>${it.note ? `<tr><td colspan="2" class="n">→ ${esc(it.note)}</td></tr>` : ''}`).join('')}</table>`
    : `<table class="it">${doc.items.map((it) => `<tr><td class="q">${esc(it.qty)}</td><td>${esc(it.name)}${it.qty > 1 ? `<span class="u">@ ${amt(it.unit)}</span>` : ''}</td><td class="t">${amt(it.qty * it.unit)}</td></tr>`).join('')}</table>`
  const totals = doc.totals?.length
    ? `<table class="tot">${doc.totals.map(([l, v, strong]) => `<tr${strong ? ' class="s"' : ''}><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` : ''
  return `${head}
    ${doc.label ? `<div class="lbl">${esc(doc.label)}</div>` : ''}
    ${doc.big ? `<div class="big${doc.kitchen ? ' k' : ''}">${esc(doc.big)}</div>` : ''}
    ${(doc.subs || []).filter(Boolean).map((s, i) => `<div class="sub${i === 0 && doc.big ? ' b' : ''}">${esc(s)}</div>`).join('')}
    ${doc.meta?.length ? `<div class="sep"></div><table class="meta">${doc.meta.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
    ${items ? `<div class="sep"></div>${items}` : ''}
    ${totals ? `<div class="sep eq"></div>${totals}` : ''}
    ${(doc.notes || []).length ? `<div class="sep"></div>${doc.notes.map((n) => `<div class="note">${esc(n)}</div>`).join('')}` : ''}
    ${doc.kitchen ? '' : `<div class="sep"></div>
      ${doc.footerNote ? `<div class="foot">${esc(doc.footerNote)}</div>` : ''}
      <div class="foot">Powered by plusgroupe.com · Tél : +509 4244 9024</div>`}
    <div class="foot">Imprimé : ${esc(now())}</div>`
}

function printHtml(title, body, size) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const d = frame.contentWindow.document
  d.open()
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${cssFor(size)}</style></head><body>${body}</body></html>`)
  d.close()
  return new Promise((resolve) => {
    const go = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print() } catch { /* */ }
      setTimeout(() => { frame.remove(); resolve() }, 1500)
    }
    // tann imaj yo (logo) chaje anvan enpresyon an
    const imgs = [...d.images]
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => { i.onload = ok; i.onerror = ok; setTimeout(ok, 2500) }))))
      .then(() => setTimeout(go, 150))
  })
}

// Chwazi enprimant lan epi enprime
function printDoc(doc) {
  return enqueue(async () => {
    const tenant = currentTenant() || {}
    const size = paperSize(tenant)
    const W = size === '57mm' ? 32 : 48
    // printerService li lajè a nan tenant.receiptSize → nou ba l lajè aparèy la; pa gen logo sou tikè kizin
    const t2 = { ...tenant, name: doc.biz, receiptSize: size, ...(doc.showLogo ? {} : { printLogoOnReceipt: false }) }
    try {
      if (isNativePrinterAvailable()) { await printGenericReportNative(toTextDoc(doc, W), t2); return }
      if (isSunmi() || isPrinterConnected()) { await printGenericReceipt(toTextDoc(doc, W), t2); return }
    } catch (e) {
      if (e?.message !== 'ANDROID_USE_BROWSER_PRINT') {
        console.warn('[restoPrint]', e)
        toast.error(`Enprimant: ${e?.message || 'erè'} — n ap eseye ak enpresyon navigatè a.`)
      }
    }
    await printHtml(doc.docTitle, toHtml(doc, tenant, size), size)
  })
}

// ══════════════════════════════════════════════════════════════════════
// FONKSYON PIBLIK YO (menm siyati ak anvan)
// ══════════════════════════════════════════════════════════════════════

// Tikè kizin: manje sèlman (bwason pa ale nan kizin)
export function printKitchenTicket({ tenantName, title, subtitle, items, notes }) {
  const count = items.reduce((s, i) => s + Number(i.qty || 0), 0)
  return printDoc({
    docTitle: 'Bon de cuisine', biz: bizName(currentTenant(), tenantName), kitchen: true, showLogo: false,
    label: 'BON DE CUISINE', big: title, subs: [subtitle],
    items: items.map((i) => ({ qty: Number(i.qty), name: i.name, note: i.note })),
    notes: [notes ? `Note : ${notes}` : null, `${count} article(s)`].filter(Boolean),
  })
}

// Adisyon (pre-fakti) pou kliyan an verifye anvan li peye
export function printBill({ tenantName, title, subtitle, items, subtotal, discountPct = 0, deliveryFee = 0, total, note }) {
  const tenant = currentTenant()
  return printDoc({
    docTitle: 'Addition', biz: bizName(tenant, tenantName), showLogo: true,
    label: 'ADDITION', subs: [[title, subtitle].filter(Boolean).join(' — '), now()],
    items: items.map((i) => ({ qty: Number(i.qty), name: i.name, unit: Number(i.unitPrice) })),
    totals: [
      ['Sous-total', `${amt(subtotal)} HTG`],
      ...(discountPct > 0 ? [[`Remise ${discountPct}%`, `-${amt(subtotal * discountPct / 100)}`]] : []),
      ...(deliveryFee > 0 ? [['Frais de livraison', amt(deliveryFee)]] : []),
      ['TOTAL', `${amt(total)} HTG`, true],
    ],
    notes: ["Ceci n'est pas une facture"],
    footerNote: note || tenantReceiptNote(tenant),
  })
}

// Resi kès (vann kontwa): nimewo kòmand an gwo, non kliyan, peman
export function printCounterReceipt({ tenantName, number, customerName, mode, items, subtotal, discountPct = 0, deliveryFee = 0, total, method, given, change, cashier, note }) {
  const tenant = currentTenant()
  return printDoc({
    docTitle: `Reçu N° ${number}`, biz: bizName(tenant, tenantName), showLogo: true,
    label: 'REÇU', big: `N° ${number}`,
    subs: [[MODE_FR[mode], customerName].filter(Boolean).join(' — '), [now(), cashier].filter(Boolean).join(' · ')],
    items: items.map((i) => ({ qty: Number(i.qty), name: i.name, unit: Number(i.unitPrice) })),
    totals: [
      ['Sous-total', `${amt(subtotal)} HTG`],
      ...(discountPct > 0 ? [[`Remise ${discountPct}%`, `-${amt(subtotal * discountPct / 100)}`]] : []),
      ...(deliveryFee > 0 ? [['Frais de livraison', amt(deliveryFee)]] : []),
      ['TOTAL', `${amt(total)} HTG`, true],
      ['Paiement', METHOD_FR[method] || method || ''],
      ...(method === 'cash' && Number(given) > 0 ? [['Reçu', `${amt(given)} HTG`], ['Monnaie', `${amt(change)} HTG`, true]] : []),
    ],
    notes: ['Gardez ce numéro : on vous appellera'],
    footerNote: note || tenantReceiptNote(tenant),
  })
}

// Rapò vant (Z) pou kesye a — an franse
export function printSalesReport({ tenantName, report, cashier, note }) {
  const r = report
  const tenant = currentTenant()
  const period = r.from === r.to ? r.from : `${r.from} → ${r.to}`
  const group = (title, rows, map) => (rows || []).length
    ? [[`— ${title} —`, ''], ...rows.map((x) => [`${map ? map[x.key] || x.key : x.key} (${x.count})`, amt(x.total)])] : []
  const top = (title, list) => (list || []).length ? [[`— ${title} —`, ''], ...list.map((i) => [`${i.qty} x ${i.name}`, amt(i.total)])] : []
  return printDoc({
    docTitle: 'Rapport des ventes', biz: bizName(tenant, tenantName), showLogo: false,
    label: 'RAPPORT DES VENTES', subs: [`Période : ${period}`, cashier ? `Caissier : ${cashier}` : null, `Imprimé le ${now()}`],
    totals: [
      ['Nombre de ventes', String(r.totals.count)],
      ['Total brut', amt(r.totals.gross)],
      ...(r.totals.discount ? [['Remises', `-${amt(r.totals.discount)}`]] : []),
      ...(r.totals.deliveryFees ? [['Frais de livraison', amt(r.totals.deliveryFees)]] : []),
      ['TOTAL VENDU (HTG)', amt(r.totals.net), true],
      ['Ticket moyen', amt(r.totals.avgTicket)],
      ...group('PAR MODE DE PAIEMENT', r.byMethod, METHOD_FR),
      ...group('PAR SOURCE', r.bySource, SOURCE_FR),
      ...(cashier ? [] : group('PAR CAISSIER', r.byCashier)),
      ...group('PAR SERVEUR', (r.byServer || []).filter((x) => x.key)),
      ...group('NOURRITURE / BOISSONS', (r.byKind || []).map((x) => ({ key: x.key, count: x.qty, total: x.total })), { food: 'Nourriture', drink: 'Boissons' }),
      ...top('PLATS LES PLUS VENDUS', r.topItems),
      ...top('BOISSONS LES PLUS VENDUES', r.topDrinks),
    ],
    notes: ['Signature caissier : ______________'],
    footerNote: note || tenantReceiptNote(tenant),
  })
}

// Pou tès / apèsi sèlman
export const _internals = { toHtml, toTextDoc, cssFor }
