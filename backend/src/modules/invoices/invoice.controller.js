// src/modules/invoices/invoice.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./invoice.service');
const { generateInvoicePDF } = require('./pdf.service');

// ⚠️ KORIJE — pase req.branchId bay svc.getAll
const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, {
    ...req.query,
    branchId: req.branchId || undefined
  });
  res.json({ success: true, ...data });
});

const getOne = asyncHandler(async (req, res) => { const data = await svc.getOne(req.tenant.id, req.params.id); res.json({ success: true, invoice: data }); });

// ⚠️ KORIJE — pase req.branchId bay getDashboard tou
const getDashboard = asyncHandler(async (req, res) => {
  const data = await svc.getDashboard(req.tenant.id, req.branchId || null);
  res.json({ success: true, dashboard: data });
});

const cancel     = asyncHandler(async (req, res) => { const data = await svc.cancel(req.tenant.id, req.params.id, req.user.id, req.body.reason); res.json({ success: true, invoice: data, message: 'Facture anile.' }); });
const addPayment = asyncHandler(async (req, res) => { const data = await svc.addPayment(req.tenant.id, req.params.id, req.user.id, req.body); res.status(201).json({ success: true, ...data, message: 'Peman anrejistre.' }); });

// ⚠️ KORIJE — ajoute branchId nan createDirect otomatikman
const createDirect = asyncHandler(async (req, res) => {
  const data = await svc.createDirect(req.tenant.id, req.user.id, {
    ...req.body,
    branchId: req.body.branchId || req.branchId || null
  });
  res.status(201).json({ success: true, invoice: data, message: 'Fakti kreye avèk siksè.' });
});

const downloadPDF = asyncHandler(async (req, res) => {
  const invoice = await svc.getOne(req.tenant.id, req.params.id);
  const size = req.query.size === '57mm' ? '57mm' : '80mm';
  const doc = generateInvoicePDF(invoice, size);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture-${invoice.invoiceNumber}-${size}.pdf"`);
  doc.pipe(res);
  doc.end();
});

module.exports = { getAll, getOne, getDashboard, cancel, addPayment, createDirect, downloadPDF };
