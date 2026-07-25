// src/modules/invoices/invoice.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma = require('../../config/prisma');
const svc = require('./invoice.service');
const { generateInvoicePDF } = require('./pdf.service');

const { notifyEmployeeSale, checkAndNotifyLowStock } = require('../../helpers/notification.helper');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, {
    ...req.query,
    branchId: req.branchId || undefined
  });
  res.json({ success: true, ...data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id);
  res.json({ success: true, invoice: data });
});

const getDashboard = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const data = await svc.getDashboard(
    req.tenant.id,
    req.branchId || null,
    dateFrom || null,
    dateTo   || null
  );
  res.json({ success: true, dashboard: data });
});

const cancel = asyncHandler(async (req, res) => {
  const data = await svc.cancel(req.tenant.id, req.params.id, req.user.id, req.body.reason);
  res.json({ success: true, invoice: data, message: 'Facture anile.' });
});

const addPayment = asyncHandler(async (req, res) => {
  const data = await svc.addPayment(req.tenant.id, req.params.id, req.user.id, req.body);
  res.status(201).json({ success: true, ...data, message: 'Peman anrejistre.' });
});

// ⚠️ KORIJE — valide branchId eksplisit la (si admin voye youn nan body,
// pa egzanp yon dropdown nan fòm lan) apatyen tenant lan e li aktif,
// olye l pase dirèkteman san verifikasyon jan l te ye anvan an.
const createDirect = asyncHandler(async (req, res) => {
  let branchId = req.branchId || null;

  if (req.user.role === 'admin' && req.body.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: req.body.branchId, tenantId: req.tenant.id }
    });
    if (!branch) {
      return res.status(400).json({ success: false, message: 'Branch pa valid.' });
    }
    if (!branch.isActive) {
      return res.status(403).json({ success: false, message: 'Branch sa a bloke.', branchLocked: true });
    }
    branchId = branch.id;
  }

  const data = await svc.createDirect(req.tenant.id, req.user.id, {
    ...req.body,
    branchId
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

const share = asyncHandler(async (req, res) => {
  const data = await svc.generatePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, ...data, message: 'Lyen pataj kreye.' });
});

const revokeShare = asyncHandler(async (req, res) => {
  await svc.revokePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Lyen pataj revoke.' });
});

const getPublic = asyncHandler(async (req, res) => {
  const data = await svc.getByPublicToken(req.params.token);
  res.json({ success: true, ...data });
});

module.exports = { getAll, getOne, getDashboard, cancel, addPayment, createDirect, downloadPDF, share, revokeShare, getPublic };
