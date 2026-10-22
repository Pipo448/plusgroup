// src/pages/restaurant/restoPrint.js
// ─── Enprime tikè kizin ak adisyon (58/80 mm) ─────────────────────────
// Resi enprime yo an FRANSE, ak nòt tenant an anba, epi
// "Produit par PLUS GROUP Tel: +509 4244 9024" toujou nan dènye liy lan.
// Si w vle voye l sou enprimant Sunmi/Bluetooth la, ranplase printHtml()
// ak fonksyon enpresyon ou a (printText) — done yo deja prepare isit la.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const amt = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202F|\u00A0/g, ' ')
const now = () => new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const tenantReceiptNote = (tenant) =>
  tenant?.settings?.receiptNote || tenant?.settings?.invoiceNote || tenant?.settings?.warningNote || tenant?.receiptNote || ''

function printHtml(title, body, width = 80) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentWindow.document
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: ${width}mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { margin: 0; width: ${width - 6}mm; font: 12px/1.35 'Courier New', monospace; color: #000; }
    h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
    h2 { font-size: 22px; margin: 4px 0; text-align: center; letter-spacing: 1px; }
    .c { text-align: center; } .r { text-align: right; white-space: nowrap; } .b { font-weight: bold; }
    .big { font-size: 15px; font-weight: bold; }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; } td { vertical-align: top; padding: 1px 0; }
    .q { width: 34px; font-weight: bold; } .note { font-size: 11px; padding-left: 34px; font-style: italic; }
    .foot { font-size: 10px; text-align: center; margin-top: 6px; }
  </style></head><body>${body}</body></html>`)
  doc.close()
  const go = () => { try { frame.contentWindow.focus(); frame.contentWindow.print() } finally { setTimeout(() => frame.remove(), 1500) } }
  if (frame.contentWindow.document.readyState === 'complete') setTimeout(go, 120); else frame.onload = go
}

const footer = (note) => `<hr>${note ? `<div class="foot">${esc(note)}</div>` : ''}<div class="foot b">Produit par PLUS GROUP Tel: +509 4244 9024</div>`

// Tikè kizin: sèlman plat ki poko voye (oswa tout si `all`)
export function printKitchenTicket({ tenantName, title, subtitle, items, notes }) {
  const rows = items.map((it) => `<tr><td class="q big">${esc(it.qty)}×</td><td class="big">${esc(it.name)}</td></tr>${it.note ? `<tr><td colspan="2" class="note">→ ${esc(it.note)}</td></tr>` : ''}`).join('')
  printHtml('Bon de cuisine', `
    <div class="c">${esc(tenantName)}</div>
    <h2>BON DE CUISINE</h2>
    <div class="c big">${esc(title)}</div>
    ${subtitle ? `<div class="c">${esc(subtitle)}</div>` : ''}
    <div class="c">${now()}</div><hr>
    <table>${rows}</table>
    ${notes ? `<hr><div class="b">Note : ${esc(notes)}</div>` : ''}<hr>
    <div class="c">${items.reduce((s, i) => s + Number(i.qty || 0), 0)} article(s)</div>`)
}

// Adisyon (pre-fakti) pou kliyan an verifye anvan li peye
export function printBill({ tenantName, title, subtitle, items, subtotal, discountPct = 0, deliveryFee = 0, total, note }) {
  const rows = items.map((it) => `<tr><td class="q">${esc(it.qty)}</td><td>${esc(it.name)}<br><span style="font-size:10px">${amt(it.unitPrice)}</span></td><td class="r">${amt(it.qty * it.unitPrice)}</td></tr>`).join('')
  const disc = discountPct > 0 ? `<tr><td></td><td>Remise ${esc(discountPct)}%</td><td class="r">-${amt(subtotal * discountPct / 100)}</td></tr>` : ''
  const del = deliveryFee > 0 ? `<tr><td></td><td>Frais de livraison</td><td class="r">${amt(deliveryFee)}</td></tr>` : ''
  printHtml('Addition', `
    <h1>${esc(tenantName)}</h1>
    <div class="c b">ADDITION</div>
    <div class="c">${esc(title)}${subtitle ? ` — ${esc(subtitle)}` : ''}</div>
    <div class="c">${now()}</div><hr>
    <table>${rows}</table><hr>
    <table><tr><td>Sous-total</td><td class="r">${amt(subtotal)} HTG</td></tr>${disc}${del}
    <tr><td class="big">TOTAL</td><td class="r big">${amt(total)} HTG</td></tr></table>
    <div class="c" style="margin-top:4px;font-size:10px">Ceci n'est pas une facture</div>
    ${footer(note)}`)
}

// Rapò vant (Z) pou kesye a enprime sou papye — an franse
const METHOD_FR = { cash: 'Espèces', moncash: 'MonCash', natcash: 'NatCash', card: 'Carte' }
const SOURCE_FR = { table: 'Sur place', online: 'En ligne' }
export function printSalesReport({ tenantName, report, cashier, note }) {
  const r = report
  const period = r.from === r.to ? r.from : `${r.from} → ${r.to}`
  const row = (label, value, bold) => `<tr><td${bold ? ' class="b"' : ''}>${esc(label)}</td><td class="r${bold ? ' b' : ''}">${value}</td></tr>`
  const group = (title, rows, map) => rows.length ? `<hr><div class="b">${esc(title)}</div><table>${rows.map((x) => row(`${map ? map[x.key] || x.key : x.key} (${x.count})`, amt(x.total))).join('')}</table>` : ''
  printHtml('Rapport des ventes', `
    <h1>${esc(tenantName)}</h1>
    <div class="c b">RAPPORT DES VENTES</div>
    <div class="c">Période : ${esc(period)}</div>
    ${cashier ? `<div class="c">Caissier : ${esc(cashier)}</div>` : ''}
    <div class="c">Imprimé le ${now()}</div><hr>
    <table>
      ${row('Nombre de ventes', r.totals.count)}
      ${row('Total brut', amt(r.totals.gross))}
      ${r.totals.discount ? row('Remises', '-' + amt(r.totals.discount)) : ''}
      ${r.totals.deliveryFees ? row('Frais de livraison', amt(r.totals.deliveryFees)) : ''}
      ${row('TOTAL VENDU (HTG)', amt(r.totals.net), true)}
      ${row('Ticket moyen', amt(r.totals.avgTicket))}
    </table>
    ${group('PAR MODE DE PAIEMENT', r.byMethod, METHOD_FR)}
    ${group('SUR PLACE / EN LIGNE', r.bySource, SOURCE_FR)}
    ${cashier ? '' : group('PAR CAISSIER', r.byCashier)}
    ${group('PAR SERVEUR', (r.byServer || []).filter((x) => x.key))}
    ${r.topItems.length ? `<hr><div class="b">PLATS LES PLUS VENDUS</div><table>${r.topItems.map((i) => `<tr><td class="q">${esc(i.qty)}</td><td>${esc(i.name)}</td><td class="r">${amt(i.total)}</td></tr>`).join('')}</table>` : ''}
    <hr><div class="c" style="margin-top:14px">Signature caissier : ____________</div>
    ${footer(note)}`)
}
