// src/modules/quotes/quote.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./quote.service');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, { ...req.query, branchId: req.branchId || undefined });
  res.json({ success: true, ...data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id);
  res.json({ success: true, quote: data });
});

const create = asyncHandler(async (req, res) => {
  const data = await svc.create(req.tenant.id, req.user.id, { ...req.body, branchId: req.body.branchId || req.branchId || null });
  res.status(201).json({ success: true, quote: data });
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.tenant.id, req.params.id, req.user.id, req.body);
  res.json({ success: true, quote: data });
});

const send             = asyncHandler(async (req, res) => { const data = await svc.send(req.tenant.id, req.params.id);       res.json({ success: true, quote: data, message: 'Devis voye.' }); });
const cancel           = asyncHandler(async (req, res) => { const data = await svc.cancel(req.tenant.id, req.params.id);     res.json({ success: true, quote: data, message: 'Devis anile.' }); });
const convertToInvoice = asyncHandler(async (req, res) => { const data = await svc.convertToInvoice(req.tenant.id, req.params.id, req.user.id); res.status(201).json({ success: true, invoice: data, message: 'Devis konvèti an facture avèk siksè.' }); });

// ✅ NOUVO — Jenere lyen pataj + kòd akse 4 chif
const share = asyncHandler(async (req, res) => {
  const data = await svc.generatePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, ...data, message: 'Lyen ak kòd akse kreye.' });
});

// ✅ NOUVO — Revoke lyen
const revokeShare = asyncHandler(async (req, res) => {
  await svc.revokePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Lyen pataj revoke.' });
});

// ✅ NOUVO — Wout PIBLIK
// Si pa gen ?code= → retounen sèlman non konpayi a (paj PIN ap parèt)
// Si gen ?code=XXXX → verifye e retounen detay devi a
const getPublic = asyncHandler(async (req, res) => {
  const data = await svc.getByPublicToken(req.params.token, req.query.code);
  res.json({ success: true, ...data });
});

module.exports = { getAll, getOne, create, update, send, cancel, convertToInvoice, share, revokeShare, getPublic };
