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

// ✅ NOUVO — Jenere yon lyen piblik (token + 24è ekspirasyon)
const share = asyncHandler(async (req, res) => {
  const data = await svc.generatePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, ...data, message: 'Lyen pataj kreye. Li valab pou 24è.' });
});

// ✅ NOUVO — Revoke (efase) lyen piblik la
const revokeShare = asyncHandler(async (req, res) => {
  await svc.revokePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Lyen pataj revoke.' });
});

// ✅ NOUVO — Wout PIBLIK pou kliyan an wè pwoforma a san pou l konekte
const getPublic = asyncHandler(async (req, res) => {
  const data = await svc.getByPublicToken(req.params.token);
  // Si lyen ekspire, retounen done a ak `expired: true` (PA voye 410)
  // Sa pèmèt frontend la montre yon paj "ekspire" elegan
  res.json({ success: true, ...data });
});

module.exports = { getAll, getOne, create, update, send, cancel, convertToInvoice, share, revokeShare, getPublic };
