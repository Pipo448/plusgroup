// src/services/printReceiptHTML.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Enpresyon HTML pou RP327 80mm (Windows Driver)
// Itilize window.print() — pa ESC/POS — tèks kla kòm paj tès
// ══════════════════════════════════════════════════════════════

// ─── CSS pou 80mm ─────────────────────────────────────────────
const CSS_80MM = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: 80mm auto;
    margin: 2mm 3mm;
  }

  body {
    width: 74mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Alinman ── */
  .center { text-align: center; }
  .left   { text-align: left;   }
  .right  { text-align: right;  }

  /* ── Tay tèks ── */
  .xxl  { font-size: 18pt; font-weight: 900; letter-spacing: 2px; }
  .xl   { font-size: 14pt; font-weight: 800; }
  .lg   { font-size: 12pt; font-weight: 700; }
  .md   { font-size: 10pt; font-weight: 600; }
  .sm   { font-size:  8pt; }
  .bold { font-weight: 800; }

  /* ── Logo ── */
  .logo-wrap { text-align: center; margin-bottom: 4px; }
  .logo-wrap img {
    max-width: 50mm;
    max-height: 20mm;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  /* ── Separatè ── */
  .sep-eq  { border-top: 2px solid #000; margin: 4px 0; }
  .sep-dsh { border-top: 1px dashed #000; margin: 3px 0; }
  .sep-ln  { border-top: 1px solid #000; margin: 3px 0; }

  /* ── Tablo pwodwi ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  .items-table th {
    font-weight: 800;
    text-align: left;
    padding: 2px 1px;
    border-bottom: 1px solid #000;
    border-top: 1px solid #000;
    font-size: 9pt;
  }
  .items-table th.r,
  .items-table td.r { text-align: right; }
  .items-table th.c,
  .items-table td.c { text-align: center; }
  .items-table td {
    padding: 2px 1px;
    vertical-align: top;
  }
  .item-name { max-width: 35mm; word-break: break-word; }

  /* ── Seksyon total ── */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
  }
  .total-grand {
    font-size: 16pt;
    font-weight: 900;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }
  .status-box {
    text-align: center;
    font-size: 16pt;
    font-weight: 900;
    border: 3px solid #000;
    padding: 3px 0;
    margin: 4px 0;
    letter-spacing: 3px;
  }
  .status-box.paid    { border-color: #000; }
  .status-box.credit  { border-color: #000; }
  .status-box.partial { border-color: #000; }

  /* ── Badge kredi ── */
  .credit-badge {
    text-align: center;
    border: 2px dashed #000;
    padding: 3px;
    margin: 3px 0;
    font-weight: 800;
    font-size: 10pt;
  }

  /* ── QR code ── */
  .qr-wrap { text-align: center; margin: 4px 0; }
  .qr-wrap img { width: 28mm; height: 28mm; }

  /* ── Footer ── */
  .footer { text-align: center; margin-top: 4px; }

  /* ── Espas ── */
  .mt1 { margin-top: 2px; }
  .mt2 { margin-top: 4px; }
  .mt3 { margin-top: 6px; }
  .mb1 { margin-bottom: 2px; }
`

// ─── Fòmate nimerik ───────────────────────────────────────────
const fmtN = (n) => Number(n || 0)
  .toLocaleString('fr-HT', { minimumFractionDigits: 2 })
  .replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ')

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('fr-HT') } catch { return '' }
}

// ─── Jenere QR code URL ───────────────────────────────────────
const qrUrl = (text) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=120x120&margin=2`

// ══════════════════════════════════════════════════════════════
// PRINT INVOICE — HTML 80mm
// ══════════════════════════════════════════════════════════════
export const printInvoiceHTML = (invoice, tenant, cashier = null) => {
  const snap        = invoice.clientSnapshot || {}
  const cashierName = cashier?.fullName || cashier?.name || null
  const totalHtg    = Number(invoice.totalHtg     || 0)
  const paidHtg     = Number(invoice.amountPaidHtg || 0)
  const balanceHtg  = Number(invoice.balanceDueHtg || 0)
  const lastPay     = invoice.payments?.length > 0
    ? invoice.payments[invoice.payments.length - 1] : null
  const amountGiven = Number(lastPay?.amountGiven || 0)
  const change      = Number(lastPay?.change      || 0)
  const dueDate     = lastPay?.dueDate || invoice.dueDate || null
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const isPartial   = invoice.status === 'partial'
  const isCredit    = lastPay?.method === 'credit' || (balanceHtg > 0 && paidHtg === 0)

  const exchangeRates = (() => {
    try { const er = tenant?.exchangeRates
      return er ? (typeof er === 'object' ? er : JSON.parse(String(er))) : {}
    } catch { return {} }
  })()
  const rateUSD = Number(exchangeRates.USD || invoice.exchangeRate || 132)
  const rateDOP = Number(exchangeRates.DOP || 0)
  const toUSD   = (n) => rateUSD > 0 ? (n / rateUSD).toFixed(2) : null
  const toDOP   = (n) => rateDOP > 0 ? (n / rateDOP).toFixed(2) : null

  const METOD = {
    cash:'Kach', moncash:'MonCash', natcash:'NatCash',
    card:'Kat kredi', transfer:'Virement', check:'Chek',
    credit:'Kredi', other:'Lot',
  }

  const statusLabel = isPaid ? 'TOTAL PEYE' : isCancelled ? 'ANILE'
    : isCredit ? 'KREDI' : isPartial ? 'PASYAL' : 'IMPAYE'

  const bizName  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logoUrl  = tenant?.logoUrl || tenant?.logo || null
  const qrLink   = (window?.location?.origin || '') + '/app/invoices/' + invoice.id

  // ── Liy pwodwi ──────────────────────────────────────────────
  const itemRows = (invoice.items || []).map(item => {
    const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
    const qty = Number(item.quantity)
    const pri = fmtN(item.unitPriceHtg)
    const tot = fmtN(item.totalHtg)
    const dis = Number(item.discountPct) > 0
      ? `<tr><td colspan="4" class="sm" style="padding-left:4px;color:#333">
           ↳ Remiz: -${item.discountPct}%
         </td></tr>` : ''
    return `
      <tr>
        <td class="item-name">${nom}</td>
        <td class="c">${qty}</td>
        <td class="r">${pri}</td>
        <td class="r">${tot}</td>
      </tr>${dis}`
  }).join('')

  // ── HTML konplè ──────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="ht">
<head>
  <meta charset="UTF-8">
  <title>Resi ${invoice.invoiceNumber || ''}</title>
  <style>${CSS_80MM}</style>
</head>
<body>

  <!-- LOGO + HEADER -->
  ${logoUrl ? `
  <div class="logo-wrap">
    <img src="${logoUrl}" alt="logo" />
  </div>` : ''}

  <div class="center">
    <div class="xxl">${bizName}</div>
    ${tenant?.tagline  ? `<div class="sm mt1">${tenant.tagline}</div>` : ''}
    ${tenant?.address  ? `<div class="sm">${tenant.address}</div>` : ''}
    ${tenant?.phone    ? `<div class="md bold mt1">Tel: ${tenant.phone}</div>` : ''}
  </div>

  <div class="sep-eq mt2"></div>

  <!-- INFO TRANSAKSYON -->
  <table style="width:100%;font-size:9.5pt;">
    <tr>
      <td><b>Dat&nbsp;&nbsp;&nbsp;:</b></td>
      <td style="text-align:right"><b>${fmtDate(invoice.issueDate)}</b></td>
    </tr>
    <tr>
      <td><b>Resi N :</b></td>
      <td style="text-align:right"><b>${invoice.invoiceNumber || ''}</b></td>
    </tr>
    ${snap.name    ? `<tr><td><b>Kliyan :</b></td><td style="text-align:right">${snap.name}</td></tr>` : ''}
    ${snap.phone   ? `<tr><td><b>Tel&nbsp;&nbsp;&nbsp;:</b></td><td style="text-align:right">${snap.phone}</td></tr>` : ''}
    ${snap.nif     ? `<tr><td><b>NIF&nbsp;&nbsp;&nbsp;:</b></td><td style="text-align:right">${snap.nif}</td></tr>` : ''}
    ${cashierName  ? `<tr><td><b>Kasye&nbsp; :</b></td><td style="text-align:right">${cashierName}</td></tr>` : ''}
  </table>

  <!-- TABLO PWODWI -->
  <table class="items-table mt2">
    <thead>
      <tr>
        <th>Pwodwi</th>
        <th class="c">Q</th>
        <th class="r">Pri&nbsp;G</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- REMIZ / TAKS -->
  ${Number(invoice.discountHtg) > 0 ? `
  <div class="sep-dsh"></div>
  <div class="total-row sm">
    <span>Remiz:</span>
    <span>-${fmtN(invoice.discountHtg)} G</span>
  </div>` : ''}
  ${Number(invoice.taxHtg) > 0 ? `
  <div class="total-row sm">
    <span>Taks (${Number(invoice.taxRate || 0)}%):</span>
    <span>${fmtN(invoice.taxHtg)} G</span>
  </div>` : ''}

  <!-- TOTAL -->
  <div class="sep-eq"></div>
  <div class="total-grand">
    <span>TOTAL:</span>
    <span>${fmtN(totalHtg)} G</span>
  </div>
  ${toUSD(totalHtg) ? `<div class="total-row sm right"><span style="margin-left:auto">= $${toUSD(totalHtg)} USD</span></div>` : ''}
  ${toDOP(totalHtg) ? `<div class="total-row sm right"><span style="margin-left:auto">= RD$${toDOP(totalHtg)} DOP</span></div>` : ''}

  <!-- PEMAN -->
  <div class="sep-dsh"></div>
  <table style="width:100%;font-size:9.5pt;">
    ${amountGiven > 0 ? `
    <tr>
      <td>Kob kliyan bay :</td>
      <td style="text-align:right"><b>${fmtN(amountGiven)} G</b></td>
    </tr>` : ''}
    <tr>
      <td><b>Kob peye :</b></td>
      <td style="text-align:right"><b>${fmtN(paidHtg > 0 ? paidHtg : totalHtg)} G</b></td>
    </tr>
    ${change > 0 ? `
    <tr>
      <td>Monnen remèt :</td>
      <td style="text-align:right"><b>${fmtN(change)} G</b></td>
    </tr>` : ''}
    ${lastPay?.method ? `
    <tr>
      <td>Metod :</td>
      <td style="text-align:right"><b>${METOD[lastPay.method] || lastPay.method}</b></td>
    </tr>` : ''}
    ${lastPay?.reference ? `
    <tr>
      <td>Ref :</td>
      <td style="text-align:right">${lastPay.reference}</td>
    </tr>` : ''}
  </table>

  <!-- BALANS / KREDI -->
  ${balanceHtg > 0 ? `
  <div class="sep-dsh"></div>
  <div class="total-row bold">
    <span>Balans ki rete :</span>
    <span>-${fmtN(balanceHtg)} G</span>
  </div>
  ${toUSD(balanceHtg) ? `<div class="sm right">= -$${toUSD(balanceHtg)} USD</div>` : ''}
  <div class="credit-badge mt1">
    *** KREDI ***
    ${dueDate ? `<br><span class="sm">Dat limit: ${fmtDate(dueDate)}</span>` : '<br><span class="sm">Peye pi vit posib</span>'}
  </div>` : ''}

  <!-- STATUT FINAL -->
  <div class="sep-eq mt2"></div>
  <div class="status-box ${isPaid?'paid':isCredit?'credit':isPartial?'partial':''}">${statusLabel}</div>
  <div class="total-grand mt1">
    <span>${isPaid?'TOTAL PEYE:':isCredit?'MONTANT DI:':isPartial?'DEJA PEYE:':'TOTAL:'}</span>
    <span>${fmtN(isPaid ? totalHtg : paidHtg > 0 ? paidHtg : totalHtg)} G</span>
  </div>

  <!-- QR CODE -->
  ${tenant?.showQrCode !== false ? `
  <div class="qr-wrap mt2">
    <img src="${qrUrl(qrLink)}" alt="QR" />
    <div class="sm">${invoice.invoiceNumber || ''}</div>
  </div>` : ''}

  <!-- FOOTER -->
  <div class="sep-dsh mt2"></div>
  <div class="footer">
    <div class="bold">Mesi paske ou achte lakay nou!</div>
    <div class="sm mt1">Machandiz pa reprann ni chanje.</div>
    <div class="sep-dsh mt1"></div>
    <div class="sm">Pwodwi pa: Plus Group | +509 4244-9024</div>
  </div>

</body>
</html>`

  // ── Ouvri fenèt enpresyon ────────────────────────────────────
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) {
    alert('Aktive popup pou enprime. Chèche "popup blocked" nan navigatè ou a.')
    return
  }
  win.document.write(html)
  win.document.close()

  // Enprime otomatikman apre tout imaj chaje
  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
      // Fèmen fenèt la apre enpresyon
      win.addEventListener('afterprint', () => win.close())
    }, 300)
  }
}

// ══════════════════════════════════════════════════════════════
// PRINT KANE EPAY — HTML 80mm
// ══════════════════════════════════════════════════════════════
export const printKaneReceiptHTML = (account, transaction, tenant, type = 'ouverture') => {
  const TX_LABELS = { ouverture:'OUVETI KONT', depot:'DEPO', retrait:'RETRE' }
  const METOD     = { cash:'Kach', moncash:'MonCash', natcash:'NatCash', card:'Kat kredi', transfer:'Virement', check:'Chek', credit:'Kredi', other:'Lot' }
  const bizName   = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logoUrl   = tenant?.logoUrl || null
  const txDate    = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleDateString('fr-HT') + ' ' +
      new Date(transaction.createdAt).toLocaleTimeString('fr-HT', { hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleDateString('fr-HT')

  const html = `<!DOCTYPE html>
<html lang="ht"><head><meta charset="UTF-8">
<title>Kane Epay</title><style>${CSS_80MM}</style></head>
<body>
  ${logoUrl ? `<div class="logo-wrap"><img src="${logoUrl}" alt="logo"/></div>` : ''}
  <div class="center">
    <div class="xxl">${bizName}</div>
    <div class="lg mt1">— KANE EPAY —</div>
    ${tenant?.phone ? `<div class="md bold">Tel: ${tenant.phone}</div>` : ''}
  </div>
  <div class="sep-eq mt2"></div>
  <div class="status-box">${TX_LABELS[type] || 'TRANZAKSYON'}</div>
  <div class="sep-dsh"></div>
  <table style="width:100%;font-size:9.5pt;">
    <tr><td><b>No. Kont :</b></td><td style="text-align:right"><b>${account.accountNumber || ''}</b></td></tr>
    <tr><td><b>Dat :</b></td><td style="text-align:right">${txDate}</td></tr>
  </table>
  <div class="sep-dsh mt1"></div>
  <div class="lg bold">${account.firstName} ${account.lastName}</div>
  ${account.address  ? `<div class="sm">${account.address}</div>` : ''}
  ${account.nifOrCin ? `<div class="sm">NIF/CIN: ${account.nifOrCin}</div>` : ''}
  ${account.phone    ? `<div class="sm">Tel: ${account.phone}</div>` : ''}
  <div class="sep-dsh mt1"></div>
  ${type === 'ouverture' ? `
  <div class="total-row"><span>Montan depoze:</span><span><b>${fmtN(account.openingAmount)} G</b></span></div>
  <div class="total-row"><span>Fre kane:</span><span>- ${fmtN(account.kaneFee || 0)} G</span></div>
  <div class="total-row"><span>Montan bloke:</span><span>- ${fmtN(account.lockedAmount || 0)} G</span></div>
  ` : `
  <div class="total-row"><span>Balans anvan:</span><span>${fmtN(transaction?.balanceBefore)} G</span></div>
  `}
  <div class="sep-eq"></div>
  <div class="total-grand">
    <span>${type === 'ouverture' ? 'BALANS:' : type === 'retrait' ? 'RETRE:' : 'DEPO:'}</span>
    <span>${fmtN(type === 'ouverture' ? account.balance : transaction?.amount)} G</span>
  </div>
  ${type !== 'ouverture' ? `<div class="total-row"><span>Nouvo balans:</span><span><b>${fmtN(transaction?.balanceAfter)} G</b></span></div>` : ''}
  ${transaction?.method ? `
  <div class="sep-dsh mt1"></div>
  <div class="total-row"><span>Metod:</span><span><b>${METOD[transaction.method] || transaction.method}</b></span></div>
  ${transaction.reference ? `<div class="total-row"><span>Ref:</span><span>${transaction.reference}</span></div>` : ''}
  ` : ''}
  <div class="sep-eq mt2"></div>
  <div class="footer">
    <div class="bold">Mesi!</div>
    <div class="sm">PlusGroup — Tel: +50942449024</div>
  </div>
</body></html>`

  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) { alert('Aktive popup pou enprime.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { setTimeout(() => { win.focus(); win.print(); win.addEventListener('afterprint', () => win.close()) }, 300) }
}

// ══════════════════════════════════════════════════════════════
// PRINT PRÈ — HTML 80mm
// ══════════════════════════════════════════════════════════════
export const printPreReceiptHTML = (pre, echeances = [], tenant, type = 'ouverture', paiement = null) => {
  const bizName = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logoUrl = tenant?.logoUrl || null
  const PERIODES = { jounal:'Chak Jou', semaine:'Semèn', biweekly:'2 Semèn', mois:'Mwa', trimestre:'Trimès' }

  const echeanceRows = type === 'ouverture' && echeances.length > 0
    ? echeances.map(e => `
      <tr>
        <td style="text-align:center">${e.numero || e.num || ''}</td>
        <td>${new Date(e.dat_limit || e.datLimit).toLocaleDateString('fr-HT')}</td>
        <td style="text-align:right">${fmtN(e.montant_capital || e.montantCapital || 0)}</td>
        <td style="text-align:right">${fmtN(e.montant_interet || e.montantInteret || 0)}</td>
        <td style="text-align:right"><b>${fmtN(e.montant_total || e.montantTotal || 0)}</b></td>
      </tr>`).join('')
    : ''

  const html = `<!DOCTYPE html>
<html lang="ht"><head><meta charset="UTF-8">
<title>Prè ${pre.numeroPre || ''}</title><style>
${CSS_80MM}
.ech-table { width:100%; border-collapse:collapse; font-size:8pt; }
.ech-table th { border-bottom:1px solid #000; padding:2px 1px; font-weight:800; }
.ech-table td { padding:1px; border-bottom:1px dotted #ccc; }
.sign-line { border-bottom:2px solid #000; margin:12px 0 4px; }
</style></head>
<body>
  ${logoUrl ? `<div class="logo-wrap"><img src="${logoUrl}" alt="logo"/></div>` : ''}
  <div class="center">
    <div class="xxl">${bizName}</div>
    <div class="lg mt1">— MIKWO KREDI —</div>
    ${tenant?.phone ? `<div class="md bold">Tel: ${tenant.phone}</div>` : ''}
  </div>
  <div class="sep-eq mt2"></div>
  <div class="status-box">${type === 'ouverture' ? 'KONTRA PRÈ' : type === 'peman' ? 'RESI PEMAN' : 'KLOTIRE PRÈ'}</div>
  <div class="sep-dsh"></div>
  <table style="width:100%;font-size:9.5pt;">
    <tr><td><b>No. Prè :</b></td><td style="text-align:right"><b>${pre.numeroPre || ''}</b></td></tr>
    <tr><td><b>Dat :</b></td><td style="text-align:right">${new Date().toLocaleDateString('fr-HT')}</td></tr>
  </table>
  <div class="sep-dsh mt1"></div>
  <div class="lg bold">${pre.clientNom || ''}</div>
  ${pre.clientPhone  ? `<div class="sm">Tel: ${pre.clientPhone}</div>` : ''}
  ${pre.clientNifCin ? `<div class="sm">CIN/NIF: ${pre.clientNifCin}</div>` : ''}
  <div class="sep-dsh mt1"></div>
  <table style="width:100%;font-size:9.5pt;">
    <tr><td>Kapital:</td><td style="text-align:right"><b>${fmtN(pre.montant)} G</b></td></tr>
    <tr><td>To Entere:</td><td style="text-align:right">${pre.tauxInteret}% / mwa</td></tr>
    <tr><td>Dire:</td><td style="text-align:right">${pre.dureeEnMois} mwa</td></tr>
    <tr><td>Frekans:</td><td style="text-align:right">${PERIODES[pre.periode] || pre.periode || 'Mwa'}</td></tr>
    ${Number(pre.montantBloke) > 0 ? `<tr><td>Depozit bloke:</td><td style="text-align:right">${fmtN(pre.montantBloke)} G</td></tr>` : ''}
    ${pre.garantiByens ? `<tr><td>Garanti:</td><td style="text-align:right">${pre.garantiByens}</td></tr>` : ''}
  </table>
  <div class="sep-eq mt1"></div>
  <div class="total-grand">
    <span>TOTAL DWE:</span>
    <span>${fmtN(pre.totalDu)} G</span>
  </div>

  ${type === 'peman' && paiement ? `
  <div class="sep-dsh mt1"></div>
  <table style="width:100%;font-size:9.5pt;">
    <tr><td>Deja Peye:</td><td style="text-align:right">${fmtN(Number(pre.totalPaye || 0) - Number(paiement.montant || 0))} G</td></tr>
    <tr><td><b>PEMAN JÈ A:</b></td><td style="text-align:right"><b>${fmtN(paiement.montant)} G</b></td></tr>
    <tr><td>Rete:</td><td style="text-align:right">${fmtN(Math.max(0, Number(pre.totalDu) - Number(pre.totalPaye || 0)))} G</td></tr>
    ${paiement.method    ? `<tr><td>Metod:</td><td style="text-align:right">${paiement.method}</td></tr>` : ''}
    ${paiement.reference ? `<tr><td>Ref:</td><td style="text-align:right">${paiement.reference}</td></tr>` : ''}
  </table>` : ''}

  ${type === 'ouverture' && echeances.length > 0 ? `
  <div class="sep-eq mt2"></div>
  <div class="center bold">KALANDRIYE RANBOUSMAN</div>
  <table class="ech-table mt1">
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th>Dat</th>
        <th style="text-align:right">Kapital</th>
        <th style="text-align:right">Entere</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${echeanceRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right;font-weight:800;border-top:1px solid #000">TOTAL:</td>
        <td style="text-align:right;font-weight:800;border-top:1px solid #000">
          ${fmtN(echeances.reduce((s,e) => s + Number(e.montant_total || e.montantTotal || 0), 0))} G
        </td>
      </tr>
    </tfoot>
  </table>` : ''}

  ${type === 'ouverture' ? `
  <div class="sep-eq mt2"></div>
  <div class="center bold">SIYATI</div>
  <div class="mt2 sm">Emprunteur / Kliyan:</div>
  <div class="bold mt1">${pre.clientNom || ''}</div>
  <div class="sign-line"></div>
  ${pre.avalize1Nom ? `
  <div class="mt2 sm">Avalize 1: <b>${pre.avalize1Nom}</b></div>
  ${pre.avalize1Phone ? `<div class="sm">Tel: ${pre.avalize1Phone}</div>` : ''}
  <div class="sign-line"></div>` : ''}
  ${pre.avalize2Nom ? `
  <div class="mt2 sm">Avalize 2: <b>${pre.avalize2Nom}</b></div>
  ${pre.avalize2Phone ? `<div class="sm">Tel: ${pre.avalize2Phone}</div>` : ''}
  <div class="sign-line"></div>` : ''}
  <div class="mt2 sm">Responsab Kredi:</div>
  <div class="sign-line"></div>` : ''}

  <div class="sep-eq mt2"></div>
  <div class="footer">
    <div class="bold">Mesi! / Merci!</div>
    <div class="sm">${bizName} | ${tenant?.phone || '+50942449024'}</div>
  </div>
</body></html>`

  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) { alert('Aktive popup pou enprime.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { setTimeout(() => { win.focus(); win.print(); win.addEventListener('afterprint', () => win.close()) }, 300) }
}