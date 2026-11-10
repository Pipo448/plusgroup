// src/modules/invoices/pdf.service.js
const PDFDocument = require('pdfkit');

// ✅ NOUVO — etikèt PDF nan 4 lang (ht · fr · en · es). Lang lan soti nan ?lang=,
// sinon nan tenant.invoiceLanguage, sinon tenant.defaultLanguage, sinon ht.
const PDF_LABELS = {
  ht: { invoice:'FACTURE', no:'No', date:'Dat', client:'Kliyan', tel:'Tel', product:'Pwodwi', discount:'Remiz', subtotal:'Sou-total', vat:'TVA', total:'TOTAL', paid:'Peye', balance:'Balans', notes:'Nòt', terms:'Kondisyon', thanks:'Mèsi pou konfyans ou!' },
  fr: { invoice:'FACTURE', no:'N°', date:'Date', client:'Client', tel:'Tél', product:'Produit', discount:'Remise', subtotal:'Sous-total', vat:'TVA', total:'TOTAL', paid:'Payé', balance:'Solde', notes:'Notes', terms:'Conditions', thanks:'Merci de votre confiance !' },
  en: { invoice:'INVOICE', no:'No', date:'Date', client:'Customer', tel:'Tel', product:'Product', discount:'Discount', subtotal:'Subtotal', vat:'VAT', total:'TOTAL', paid:'Paid', balance:'Balance', notes:'Notes', terms:'Terms', thanks:'Thank you for your trust!' },
  es: { invoice:'FACTURA', no:'N°', date:'Fecha', client:'Cliente', tel:'Tel', product:'Producto', discount:'Descuento', subtotal:'Subtotal', vat:'IVA', total:'TOTAL', paid:'Pagado', balance:'Saldo', notes:'Notas', terms:'Condiciones', thanks:'¡Gracias por su confianza!' },
};
const PDF_LOCALE = { ht:'fr-FR', fr:'fr-FR', en:'en-US', es:'es-ES' };
const pickLang = (c) => (PDF_LABELS[c] ? c : null);

const fmtHTG = (n) => Number(n||0).toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 });

function generateInvoicePDF(invoice, size = '80mm', lang = null) {
  const sizes = {
    '80mm': { width: 226.77 },
    '57mm': { width: 161.57 }
  };
  const pageWidth = sizes[size]?.width || sizes['80mm'].width;
  const margin    = { top:10, bottom:10, left:8, right:8 };
  const printW    = pageWidth - margin.left - margin.right;

  const doc = new PDFDocument({
    size:    [pageWidth, 99999],
    margins: margin,
    autoFirstPage: true,
    bufferPages: true
  });

  const tenant    = invoice.tenant    || {};
  const lng = pickLang(lang) || pickLang(tenant.invoiceLanguage) || pickLang(tenant.defaultLanguage) || 'ht';
  const T = PDF_LABELS[lng];
  const client    = invoice.client    || null;
  const snap      = invoice.clientSnapshot || {};
  const clientName = client?.name || snap?.name || null;
  const clientPhone = client?.phone || snap?.phone || null;

  const rate      = Number(tenant.exchangeRate || 132);
  const fs        = size === '57mm' ? 7  : 8;    // font size base
  const fsTitle   = size === '57mm' ? 11 : 13;   // titre
  const fsSub     = size === '57mm' ? 9  : 10;   // sous-titre

  const drawLine  = (lw = 0.5) => {
    doc.strokeColor('#000').lineWidth(lw)
       .moveTo(margin.left, doc.y)
       .lineTo(pageWidth - margin.right, doc.y)
       .stroke();
    doc.moveDown(0.3);
  };

  // ── HEADER
  doc.fontSize(fsTitle).font('Helvetica-Bold')
     .text(tenant.name ? tenant.name.toUpperCase() : T.invoice, { align:'center' });
  doc.moveDown(0.2);

  doc.fontSize(fs - 1).font('Helvetica');
  if (tenant.address) doc.text(tenant.address, { align:'center' });
  if (tenant.phone)   doc.text(`${T.tel}: ${tenant.phone}`, { align:'center' });
  if (tenant.email)   doc.text(tenant.email, { align:'center' });
  doc.moveDown(0.4);
  drawLine(1);

  // ── TITRE FACTURE
  doc.fontSize(fsSub).font('Helvetica-Bold')
     .text(T.invoice, { align:'center' });
  doc.moveDown(0.2);
  doc.fontSize(fs).font('Helvetica')
     .text(`${T.no}: ${invoice.invoiceNumber}`, { align:'center' })
     .text(`${T.date}: ${new Date(invoice.issueDate).toLocaleDateString(PDF_LOCALE[lng], { timeZone: 'America/Port-au-Prince' })}`, { align:'center' });

  // ── CLIENT
  if (clientName) {
    doc.moveDown(0.3);
    doc.fontSize(fs).font('Helvetica-Bold').text(`${T.client}: `, { continued:true }).font('Helvetica').text(clientName);
    if (clientPhone) doc.font('Helvetica').text(`${T.tel}: ${clientPhone}`);
  }
  doc.moveDown(0.4);
  drawLine(0.5);

  // ── ITEMS
  const items = invoice.items || [];
  items.forEach((item, idx) => {
    const prod      = item.productSnapshot || item.product || {};
    const qty       = Number(item.quantity);
    const priceHTG  = Number(item.unitPriceHtg);
    const disc      = Number(item.discountPct || 0);
    const totalHTG  = Number(item.totalHtg || (qty * priceHTG * (1 - disc/100)));
    const totalUSD  = totalHTG / rate;

    // Non pwodui
    doc.fontSize(fs).font('Helvetica-Bold')
       .text(`${idx+1}. ${prod.name || T.product}`, margin.left, doc.y);

    // Qte × Pri
    doc.fontSize(fs - 1).font('Helvetica')
       .text(`   ${qty} x ${fmtHTG(priceHTG)} HTG`);

    if (disc > 0) doc.text(`   ${T.discount}: -${disc}%`);

    // Total item (HTG + USD)
    doc.fontSize(fs).font('Helvetica-Bold');
    const lineY = doc.y;
    doc.text(`${fmtHTG(totalHTG)} HTG`, margin.left, lineY, { width: printW, align:'right' });
    doc.fontSize(fs - 1.5).font('Helvetica')
       .text(`(${fmtHTG(totalUSD)} USD)`, margin.left, doc.y, { width: printW, align:'right' });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.2);
  drawLine(0.5);

  // ── TOTAUX — sèlman si sous-total diferan total (gen remiz/taks)
  const subtotalHTG = Number(invoice.subtotalHtg);
  const discountHTG = Number(invoice.discountHtg || 0);
  const taxHTG      = Number(invoice.taxHtg      || 0);
  const totalHTG    = Number(invoice.totalHtg);
  const totalUSD    = totalHTG / rate;

  doc.fontSize(fs).font('Helvetica');

  if (discountHTG > 0 || taxHTG > 0) {
    doc.text(`${T.subtotal}:`, margin.left, doc.y, { continued:true, width: printW*0.55 });
    doc.text(`${fmtHTG(subtotalHTG)} HTG`, { align:'right' }); doc.moveDown(0.15);

    if (discountHTG > 0) {
      doc.text(`${T.discount}:`, margin.left, doc.y, { continued:true, width: printW*0.55 });
      doc.text(`-${fmtHTG(discountHTG)} HTG`, { align:'right' }); doc.moveDown(0.15);
    }
    if (taxHTG > 0) {
      doc.text(`${T.vat}:`, margin.left, doc.y, { continued:true, width: printW*0.55 });
      doc.text(`${fmtHTG(taxHTG)} HTG`, { align:'right' }); doc.moveDown(0.15);
    }
    doc.moveDown(0.1);
    drawLine(0.5);
  }

  // ── TOTAL FINAL — gwo ekriti, HTG + USD (san taux)
  doc.fontSize(fsTitle).font('Helvetica-Bold');
  doc.text(T.total, margin.left, doc.y, { continued:true, width: printW * 0.4 });
  doc.text(`${fmtHTG(totalHTG)} HTG`, { align:'right' });

  doc.fontSize(fsSub).font('Helvetica');
  doc.text(`= ${fmtHTG(totalUSD)} USD`, margin.left, doc.y, { width: printW, align:'right' });
  doc.moveDown(0.3);

  drawLine(1);

  // ── PEMAN
  const paidHTG   = Number(invoice.amountPaidHtg || invoice.paidAmountHtg || 0);
  const balHTG    = Number(invoice.balanceDueHtg  || 0);

  if (paidHTG > 0 || balHTG > 0) {
    doc.fontSize(fs).font('Helvetica');
    if (paidHTG > 0) {
      doc.text(`${T.paid}:`, margin.left, doc.y, { continued:true, width: printW*0.55 });
      doc.text(`${fmtHTG(paidHTG)} HTG`, { align:'right' });
      doc.fontSize(fs-1.5).text(`(${fmtHTG(paidHTG/rate)} USD)`, { align:'right' });
      doc.moveDown(0.15);
    }
    if (balHTG > 0) {
      doc.fontSize(fs).font('Helvetica-Bold');
      doc.text(`${T.balance}:`, margin.left, doc.y, { continued:true, width: printW*0.55 });
      doc.text(`${fmtHTG(balHTG)} HTG`, { align:'right' });
      doc.fontSize(fs-1.5).font('Helvetica');
      doc.text(`(${fmtHTG(balHTG/rate)} USD)`, { align:'right' });
      doc.moveDown(0.15);
    }
    doc.moveDown(0.2);
    drawLine(0.5);
  }

  // ── NOTES (nòt pou kliyan)
  const notes = invoice.notes;
  if (notes && notes.trim()) {
    doc.fontSize(fs).font('Helvetica-Bold').text(`${T.notes}:`, margin.left, doc.y);
    doc.fontSize(fs - 0.5).font('Helvetica').text(notes.trim(), { align:'left' });
    doc.moveDown(0.3);
  }

  // ── KONDISYON
  const terms = invoice.terms;
  if (terms && terms.trim()) {
    doc.fontSize(fs - 0.5).font('Helvetica-Bold').text(`${T.terms}:`, margin.left, doc.y);
    doc.fontSize(fs - 1).font('Helvetica').text(terms.trim(), { align:'left' });
    doc.moveDown(0.3);
  }

  // ── FOOTER
  doc.moveDown(0.3);
  doc.fontSize(fs - 1).font('Helvetica')
     .text(T.thanks, { align:'center' });

  doc.moveDown(0.5);
  return doc;
}

module.exports = { generateInvoicePDF };
