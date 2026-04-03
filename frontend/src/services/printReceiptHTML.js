// src/services/printReceiptHTML.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Enpresyon HTML pou RP327 80mm (Windows Driver)
// Itilize window.print() — pa ESC/POS — tèks kla kòm paj tès
// ══════════════════════════════════════════════════════════════

// ─── CSS pou 80mm ─────────────────────────────────────────────
const CSS_80MM = `
  * { margin: 0; padding: 0; box-sizing: border-box; color: #000 !important; font-weight: 700; }

  @page {
    size: 80mm auto;
    margin: 2mm 2mm 2mm 1mm;
  }

  body {
    width: 77mm;
    max-width: 77mm;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    font-weight: 700;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow-x: hidden;
  }

  /* ── Alinman ── */
  .center { text-align: center; }
  .left   { text-align: left;   }
  .right  { text-align: right;  }

  /* ── Tay tèks ── */
  .xxl  { font-size: 17pt; font-weight: 900; letter-spacing: 1px; }
  .xl   { font-size: 13pt; font-weight: 900; }
  .lg   { font-size: 11pt; font-weight: 800; }
  .md   { font-size: 9pt;  font-weight: 700; }
  .sm   { font-size: 7.5pt; font-weight: 700; }
  .bold { font-weight: 900; }

  /* ── Logo ── */
  .logo-wrap {
    text-align: center;
    margin-bottom: 3px;
    width: 100%;
  }
  .logo-wrap img {
    max-width: 45mm;
    max-height: 18mm;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  /* ── Header biznis ── */
  .biz-name {
    font-size: 16pt;
    font-weight: 900;
    letter-spacing: 2px;
    text-align: center;
    line-height: 1.1;
    word-break: keep-all;
  }
  .biz-sub {
    font-size: 8pt;
    font-weight: 900;
    color: #000;
    text-align: center;
    letter-spacing: 1px;
    margin-top: 1px;
  }
  .biz-phone {
    font-size: 10pt;
    font-weight: 900;
    text-align: center;
    margin-top: 2px;
  }

  /* ── Separatè ── */
  .sep-eq  { border-top: 2px solid #000; margin: 4px 0; }
  .sep-dsh { border-top: 1px dashed #000; margin: 3px 0; }
  .sep-ln  { border-top: 1px solid #000; margin: 3px 0; }

  /* ── Tablo info ── */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    table-layout: fixed;
  }
  .info-table td:first-child {
    width: 26mm;
    font-weight: 900;
    white-space: nowrap;
  }
  .info-table td:last-child {
    text-align: right;
    font-weight: 800;
    word-break: break-word;
  }
  .info-table tr td {
    padding: 1.5px 1px;
  }

  /* ── Tablo pwodwi ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    table-layout: fixed;
  }
  .items-table col.col-nom  { width: 32mm; }
  .items-table col.col-qty  { width: 6mm;  }
  .items-table col.col-pri  { width: 17mm; }
  .items-table col.col-tot  { width: 17mm; }

  .items-table th {
    font-weight: 900;
    padding: 2px 1px;
    border-bottom: 1.5px solid #000;
    border-top: 1.5px solid #000;
    font-size: 8pt;
    overflow: hidden;
  }
  .items-table th.r,
  .items-table td.r { text-align: right; }
  .items-table th.c,
  .items-table td.c { text-align: center; }

  .items-table td {
    padding: 2px 1px;
    vertical-align: top;
    font-size: 8.5pt;
    font-weight: 700;
    overflow: hidden;
  }
  .item-name {
    word-break: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    line-height: 1.2;
    font-weight: 800;
  }
  .item-price, .item-total {
    text-align: right;
    white-space: nowrap;
    font-size: 8pt;
    font-weight: 800;
  }

  /* ── Seksyon total ── */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2px 0;
    font-size: 9pt;
    font-weight: 800;
    gap: 4px;
  }
  .total-row span:last-child {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .total-grand {
    font-size: 15pt;
    font-weight: 900;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 3px 0;
    gap: 4px;
  }
  .total-grand span:last-child {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .status-box {
    text-align: center;
    font-size: 15pt;
    font-weight: 900;
    border: 2.5px solid #000;
    padding: 3px 2px;
    margin: 4px 0;
    letter-spacing: 2px;
    width: 100%;
  }

  /* ── Badge kredi ── */
  .credit-badge {
    text-align: center;
    border: 2px dashed #000;
    padding: 3px;
    margin: 3px 0;
    font-weight: 900;
    font-size: 9.5pt;
  }

  /* ── Tablo peman ── */
  .pay-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    table-layout: fixed;
  }
  .pay-table td:first-child {
    width: 32mm;
    font-weight: 800;
  }
  .pay-table td:last-child {
    text-align: right;
    font-weight: 900;
    white-space: nowrap;
  }
  .pay-table tr td {
    padding: 2px 1px;
  }

  /* ── Konvèsyon deviz ── */
  .fx-line {
    text-align: right;
    font-size: 7.5pt;
    font-weight: 900;
    color: #000;
    padding: 1px 0;
  }

  /* ── QR code ── */
  .qr-wrap { text-align: center; margin: 5px 0 3px; }
  .qr-wrap img {
    width: 26mm;
    height: 26mm;
    display: block;
    margin: 0 auto;
  }
  .qr-num {
    font-size: 7.5pt;
    font-weight: 900;
    color: #000;
    text-align: center;
    margin-top: 2px;
    letter-spacing: 1px;
  }

  /* ── Footer ── */
  .footer { text-align: center; margin-top: 4px; }
  .footer .main-msg {
    font-size: 9.5pt;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #000;
  }
  .footer .sub-msg {
    font-size: 7.5pt;
    font-weight: 900;
    color: #000;
    margin-top: 2px;
  }
  .footer .brand {
    font-size: 7.5pt;
    font-weight: 900;
    color: #000;
    margin-top: 2px;
  }

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
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=110x110&margin=2`

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
  const tagline  = tenant?.tagline || null
  const logoUrl  = tenant?.logoUrl || tenant?.logo || null
  const qrLink   = (window?.location?.origin || '') + '/app/invoices/' + invoice.id

  // ── Liy pwodwi ──────────────────────────────────────────────
  const itemRows = (invoice.items || []).map(item => {
    const nom = item.product?.name || item.productSnapshot?.name || 'Atik'
    const qty = Number(item.quantity)
    const pri = fmtN(item.unitPriceHtg)
    const tot = fmtN(item.totalHtg)
    const dis = Number(item.discountPct) > 0
      ? `<tr><td colspan="4" class="sm" style="padding-left:4px;color:#000;font-style:normal;font-weight:900">
           ↳ Remiz: -${item.discountPct}%
         </td></tr>` : ''
    return `
      <tr>
        <td class="item-name">${nom}</td>
        <td class="c">${qty}</td>
        <td class="item-price">${pri}</td>
        <td class="item-total">${tot}</td>
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
    <img src="${logoUrl}" alt="${bizName}" />
  </div>` : ''}

  <div class="center">
    <div class="biz-name">${bizName}</div>
    ${tagline ? `<div class="biz-sub">${tagline}</div>` : ''}
    ${tenant?.address ? `<div class="sm mt1">${tenant.address}</div>` : ''}
    ${tenant?.phone   ? `<div class="biz-phone">Tel: ${tenant.phone}</div>` : ''}
  </div>

  <div class="sep-eq mt2"></div>

  <!-- INFO TRANSAKSYON -->
  <table class="info-table">
    <tr>
      <td>Dat&nbsp;&nbsp;&nbsp;:</td>
      <td>${fmtDate(invoice.issueDate)}</td>
    </tr>
    <tr>
      <td>Resi N&nbsp;:</td>
      <td>${invoice.invoiceNumber || ''}</td>
    </tr>
    ${snap.name   ? `<tr><td>Kliyan :</td><td>${snap.name}</td></tr>` : ''}
    ${snap.phone  ? `<tr><td>Tel&nbsp;&nbsp;&nbsp;:</td><td>${snap.phone}</td></tr>` : ''}
    ${snap.nif    ? `<tr><td>NIF&nbsp;&nbsp;&nbsp;:</td><td>${snap.nif}</td></tr>` : ''}
    ${cashierName ? `<tr><td>Kasye&nbsp;&nbsp;:</td><td>${cashierName}</td></tr>` : ''}
  </table>

  <!-- TABLO PWODWI -->
  <table class="items-table mt2">
    <colgroup>
      <col class="col-nom">
      <col class="col-qty">
      <col class="col-pri">
      <col class="col-tot">
    </colgroup>
    <thead>
      <tr>
        <th>Pwodwi</th>
        <th class="c">Q</th>
        <th class="r">Pri G</th>
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
    <span>${fmtN(totalHtg)}&nbsp;G</span>
  </div>
  ${toUSD(totalHtg) ? `<div class="fx-line">= $${toUSD(totalHtg)} USD</div>` : ''}
  ${toDOP(totalHtg) ? `<div class="fx-line">= RD$${toDOP(totalHtg)} DOP</div>` : ''}

  <!-- PEMAN -->
  <div class="sep-dsh"></div>
  <table class="pay-table">
    ${amountGiven > 0 ? `
    <tr>
      <td>Kob kliyan bay :</td>
      <td>${fmtN(amountGiven)} G</td>
    </tr>` : ''}
    <tr>
      <td>Kob peye :</td>
      <td>${fmtN(paidHtg > 0 ? paidHtg : totalHtg)} G</td>
    </tr>
    ${change > 0 ? `
    <tr>
      <td>Monnen remèt :</td>
      <td>${fmtN(change)} G</td>
    </tr>` : ''}
    ${lastPay?.method ? `
    <tr>
      <td>Metod :</td>
      <td>${METOD[lastPay.method] || lastPay.method}</td>
    </tr>` : ''}
    ${lastPay?.reference ? `
    <tr>
      <td>Ref :</td>
      <td>${lastPay.reference}</td>
    </tr>` : ''}
  </table>

  <!-- BALANS / KREDI -->
  ${balanceHtg > 0 ? `
  <div class="sep-dsh"></div>
  <div class="total-row bold">
    <span>Balans ki rete :</span>
    <span>-${fmtN(balanceHtg)} G</span>
  </div>
  ${toUSD(balanceHtg) ? `<div class="fx-line">= -$${toUSD(balanceHtg)} USD</div>` : ''}
  <div class="credit-badge mt1">
    *** KREDI ***
    ${dueDate
      ? `<br><span class="sm">Dat limit: ${fmtDate(dueDate)}</span>`
      : '<br><span class="sm">Peye pi vit posib</span>'}
  </div>` : ''}

  <!-- STATUT FINAL -->
  <div class="sep-eq mt2"></div>
  <div class="status-box ${isPaid?'paid':isCredit?'credit':isPartial?'partial':''}">${statusLabel}</div>
  <div class="total-grand mt1">
    <span>${isPaid?'TOTAL PEYE:':isCredit?'MONTANT DI:':isPartial?'DEJA PEYE:':'TOTAL:'}</span>
    <span>${fmtN(isPaid ? totalHtg : paidHtg > 0 ? paidHtg : totalHtg)}&nbsp;G</span>
  </div>

  <!-- QR CODE -->
  ${tenant?.showQrCode !== false ? `
  <div class="qr-wrap mt2">
    <img src="${qrUrl(qrLink)}" alt="QR" />
    <div class="qr-num">${invoice.invoiceNumber || ''}</div>
  </div>` : ''}

  <!-- FOOTER -->
  <div class="sep-dsh mt2"></div>
  <div class="footer">
    <div class="main-msg">Mesi paske ou achte lakay nou!</div>
    <div class="sub-msg">Machandiz pa reprann ni chanje.</div>
    <div class="sep-dsh mt1"></div>
    <div class="brand">Pwodwi pa: Plus Group | +509 4244-9024</div>
  </div>

</body>
</html>`

  // ── Ouvri fenèt enpresyon ────────────────────────────────────
  const win = window.open('', '_blank', 'width=420,height=650')
  if (!win) {
    alert('Aktive popup pou enprime. Chèche "popup blocked" nan navigatè ou a.')
    return
  }
  win.document.write(html)
  win.document.close()

  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
      win.addEventListener('afterprint', () => win.close())
    }, 400)
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
    <div class="biz-name">${bizName}</div>
    <div class="lg mt1">— KANE EPAY —</div>
    ${tenant?.phone ? `<div class="biz-phone">Tel: ${tenant.phone}</div>` : ''}
  </div>
  <div class="sep-eq mt2"></div>
  <div class="status-box">${TX_LABELS[type] || 'TRANZAKSYON'}</div>
  <div class="sep-dsh"></div>
  <table class="info-table">
    <tr><td>No. Kont :</td><td>${account.accountNumber || ''}</td></tr>
    <tr><td>Dat :</td><td>${txDate}</td></tr>
  </table>
  <div class="sep-dsh mt1"></div>
  <div class="lg bold">${account.firstName} ${account.lastName}</div>
  ${account.address  ? `<div class="sm">${account.address}</div>` : ''}
  ${account.nifOrCin ? `<div class="sm">NIF/CIN: ${account.nifOrCin}</div>` : ''}
  ${account.phone    ? `<div class="sm">Tel: ${account.phone}</div>` : ''}
  <div class="sep-dsh mt1"></div>
  ${type === 'ouverture' ? `
  <div class="total-row"><span>Montan depoze:</span><span>${fmtN(account.openingAmount)} G</span></div>
  <div class="total-row"><span>Fre kane:</span><span>- ${fmtN(account.kaneFee || 0)} G</span></div>
  <div class="total-row"><span>Montan bloke:</span><span>- ${fmtN(account.lockedAmount || 0)} G</span></div>
  ` : `
  <div class="total-row"><span>Balans anvan:</span><span>${fmtN(transaction?.balanceBefore)} G</span></div>
  `}
  <div class="sep-eq"></div>
  <div class="total-grand">
    <span>${type === 'ouverture' ? 'BALANS:' : type === 'retrait' ? 'RETRE:' : 'DEPO:'}</span>
    <span>${fmtN(type === 'ouverture' ? account.balance : transaction?.amount)}&nbsp;G</span>
  </div>
  ${type !== 'ouverture' ? `<div class="total-row"><span>Nouvo balans:</span><span>${fmtN(transaction?.balanceAfter)} G</span></div>` : ''}
  ${transaction?.method ? `
  <div class="sep-dsh mt1"></div>
  <div class="total-row"><span>Metod:</span><span>${METOD[transaction.method] || transaction.method}</span></div>
  ${transaction.reference ? `<div class="total-row"><span>Ref:</span><span>${transaction.reference}</span></div>` : ''}
  ` : ''}
  <div class="sep-eq mt2"></div>
  <div class="footer">
    <div class="main-msg">Mesi!</div>
    <div class="brand">PlusGroup — Tel: +50942449024</div>
  </div>
</body></html>`

  const win = window.open('', '_blank', 'width=420,height=650')
  if (!win) { alert('Aktive popup pou enprime.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { setTimeout(() => { win.focus(); win.print(); win.addEventListener('afterprint', () => win.close()) }, 400) }
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
.ech-table { width:100%; border-collapse:collapse; font-size:7.5pt; table-layout:fixed; }
.ech-table col:nth-child(1) { width:6mm; }
.ech-table col:nth-child(2) { width:18mm; }
.ech-table col:nth-child(3) { width:16mm; }
.ech-table col:nth-child(4) { width:16mm; }
.ech-table col:nth-child(5) { width:16mm; }
.ech-table th { border-bottom:1px solid #000; padding:2px 1px; font-weight:800; overflow:hidden; }
.ech-table td { padding:1.5px 1px; border-bottom:1px dotted #ccc; overflow:hidden; }
.sign-line { border-bottom:2px solid #000; margin:14px 0 3px; }
</style></head>
<body>
  ${logoUrl ? `<div class="logo-wrap"><img src="${logoUrl}" alt="logo"/></div>` : ''}
  <div class="center">
    <div class="biz-name">${bizName}</div>
    <div class="lg mt1">— MIKWO KREDI —</div>
    ${tenant?.phone ? `<div class="biz-phone">Tel: ${tenant.phone}</div>` : ''}
  </div>
  <div class="sep-eq mt2"></div>
  <div class="status-box">${type === 'ouverture' ? 'KONTRA PRÈ' : type === 'peman' ? 'RESI PEMAN' : 'KLOTIRE PRÈ'}</div>
  <div class="sep-dsh"></div>
  <table class="info-table">
    <tr><td>No. Prè :</td><td>${pre.numeroPre || ''}</td></tr>
    <tr><td>Dat :</td><td>${new Date().toLocaleDateString('fr-HT')}</td></tr>
  </table>
  <div class="sep-dsh mt1"></div>
  <div class="lg bold">${pre.clientNom || ''}</div>
  ${pre.clientPhone  ? `<div class="sm">Tel: ${pre.clientPhone}</div>` : ''}
  ${pre.clientNifCin ? `<div class="sm">CIN/NIF: ${pre.clientNifCin}</div>` : ''}
  <div class="sep-dsh mt1"></div>
  <table class="info-table">
    <tr><td>Kapital :</td><td>${fmtN(pre.montant)} G</td></tr>
    <tr><td>To Entere :</td><td>${pre.tauxInteret}% / mwa</td></tr>
    <tr><td>Dire :</td><td>${pre.dureeEnMois} mwa</td></tr>
    <tr><td>Frekans :</td><td>${PERIODES[pre.periode] || pre.periode || 'Mwa'}</td></tr>
    ${Number(pre.montantBloke) > 0 ? `<tr><td>Depozit bloke :</td><td>${fmtN(pre.montantBloke)} G</td></tr>` : ''}
    ${pre.garantiByens ? `<tr><td>Garanti :</td><td>${pre.garantiByens}</td></tr>` : ''}
  </table>
  <div class="sep-eq mt1"></div>
  <div class="total-grand">
    <span>TOTAL DWE:</span>
    <span>${fmtN(pre.totalDu)}&nbsp;G</span>
  </div>

  ${type === 'peman' && paiement ? `
  <div class="sep-dsh mt1"></div>
  <table class="pay-table">
    <tr><td>Deja Peye :</td><td>${fmtN(Number(pre.totalPaye || 0) - Number(paiement.montant || 0))} G</td></tr>
    <tr><td>PEMAN JÈ A :</td><td>${fmtN(paiement.montant)} G</td></tr>
    <tr><td>Rete :</td><td>${fmtN(Math.max(0, Number(pre.totalDu) - Number(pre.totalPaye || 0)))} G</td></tr>
    ${paiement.method    ? `<tr><td>Metod :</td><td>${paiement.method}</td></tr>` : ''}
    ${paiement.reference ? `<tr><td>Ref :</td><td>${paiement.reference}</td></tr>` : ''}
  </table>` : ''}

  ${type === 'ouverture' && echeances.length > 0 ? `
  <div class="sep-eq mt2"></div>
  <div class="center bold" style="font-size:9pt">KALANDRIYE RANBOUSMAN</div>
  <table class="ech-table mt1">
    <colgroup>
      <col><col><col><col><col>
    </colgroup>
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th>Dat</th>
        <th style="text-align:right">Kap.</th>
        <th style="text-align:right">Int.</th>
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
  <div class="center bold" style="font-size:9pt">SIYATI</div>
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
    <div class="main-msg">Mesi! / Merci!</div>
    <div class="brand">${bizName} | ${tenant?.phone || '+50942449024'}</div>
  </div>
</body></html>`

  const win = window.open('', '_blank', 'width=420,height=650')
  if (!win) { alert('Aktive popup pou enprime.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { setTimeout(() => { win.focus(); win.print(); win.addEventListener('afterprint', () => win.close()) }, 400) }
}