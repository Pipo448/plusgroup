// src/modules/quotes/quote.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma = require('../../config/prisma');
const svc = require('./quote.service');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, { ...req.query, branchId: req.branchId || undefined });
  res.json({ success: true, ...data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id);
  res.json({ success: true, quote: data });
});

// ⚠️ KORIJE — valide branchId eksplisit la (si admin voye youn nan body,
// pa egzanp yon dropdown nan fòm lan) apatyen tenant lan e li aktif.
const create = asyncHandler(async (req, res) => {
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

  const data = await svc.create(req.tenant.id, req.user.id, { ...req.body, branchId });
  res.status(201).json({ success: true, quote: data });
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.tenant.id, req.params.id, req.user.id, req.body);
  res.json({ success: true, quote: data });
});

const send             = asyncHandler(async (req, res) => { const data = await svc.send(req.tenant.id, req.params.id);       res.json({ success: true, quote: data, message: 'Devis voye.' }); });
const cancel           = asyncHandler(async (req, res) => { const data = await svc.cancel(req.tenant.id, req.params.id);     res.json({ success: true, quote: data, message: 'Devis anile.' }); });
const convertToInvoice = asyncHandler(async (req, res) => { const data = await svc.convertToInvoice(req.tenant.id, req.params.id, req.user.id); res.status(201).json({ success: true, invoice: data, message: 'Devis konvèti an facture avèk siksè.' }); });

const share = asyncHandler(async (req, res) => {
  const data = await svc.generatePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, ...data, message: 'Lyen ak kòd akse kreye.' });
});

const revokeShare = asyncHandler(async (req, res) => {
  await svc.revokePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Lyen pataj revoke.' });
});

const getPublic = asyncHandler(async (req, res) => {
  const data = await svc.getByPublicToken(req.params.token);
  res.json({ success: true, ...data });
});

module.exports = { getAll, getOne, create, update, send, cancel, convertToInvoice, share, revokeShare, getPublic };
