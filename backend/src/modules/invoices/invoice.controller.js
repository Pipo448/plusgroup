// src/modules/invoices/invoice.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./invoice.service');
const { generateInvoicePDF } = require('./pdf.service');

const getAll      = asyncHandler(async (req, res) => { const data = await svc.getAll(req.tenant.id, req.query); res.json({ success: true, ...data }); });
const getOne      = asyncHandler(async (req, res) => { const data = await svc.getOne(req.tenant.id, req.params.id); res.json({ success: true, invoice: data }); });
const getDashboard = asyncHandler(async (req, res) => { const data = await svc.getDashboard(req.tenant.id); res.json({ success: true, dashboard: data }); });
const cancel      = asyncHandler(async (req, res) => { const data = await svc.cancel(req.tenant.id, req.params.id, req.user.id, req.body.reason); res.json({ success: true, invoice: data, message: 'Facture anile.' }); });
const addPayment  = asyncHandler(async (req, res) => { const data = await svc.addPayment(req.tenant.id, req.params.id, req.user.id, req.body); res.status(201).json({ success: true, ...data, message: 'Peman anrejistre.' }); });

// ✅ Telechaje PDF thermal receipt (80mm oswa 57mm)
const downloadPDF = asyncHandler(async (req, res) => {
  const invoice = await svc.getOne(req.tenant.id, req.params.id);
  const size = req.query.size === '57mm' ? '57mm' : '80mm';  // Default: 80mm
  
  const doc = generateInvoicePDF(invoice, size);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture-${invoice.invoiceNumber}-${size}.pdf"`);
  
  doc.pipe(res);
  doc.end();
});

module.exports = { getAll, getOne, getDashboard, cancel, addPayment, downloadPDF };
