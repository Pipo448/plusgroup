// src/modules/direct-quotes/direct-quote.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./direct-quote.service');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, { ...req.query, branchId: req.branchId || undefined });
  res.json({ success: true, ...data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id);
  res.json({ success: true, directQuote: data });
});

// ✅ Kreye — pase wòl itilizatè a pou sèvis la ka verifye si otorizasyon PIN nesesè
const create = asyncHandler(async (req, res) => {
  const data = await svc.create(req.tenant.id, req.user.id, req.user.role, { ...req.body, branchId: req.body.branchId || req.branchId || null });
  res.status(201).json({ success: true, directQuote: data });
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.tenant.id, req.params.id, req.user.id, req.user.role, req.body);
  res.json({ success: true, directQuote: data });
});

// ✅ NOUVO — Admin otorize yon Devi Dirèk ak PWÒP PIN pa li
const authorize = asyncHandler(async (req, res) => {
  const data = await svc.authorize(req.tenant.id, req.params.id, req.user.id, req.body.pin);
  res.json({ success: true, directQuote: data, message: 'Devi Dirèk otorize!' });
});

const send             = asyncHandler(async (req, res) => { const data = await svc.send(req.tenant.id, req.params.id);       res.json({ success: true, directQuote: data, message: 'Devi Dirèk voye.' }); });
const cancel           = asyncHandler(async (req, res) => { const data = await svc.cancel(req.tenant.id, req.params.id);     res.json({ success: true, directQuote: data, message: 'Devi Dirèk anile.' }); });
const convertToInvoice = asyncHandler(async (req, res) => { const data = await svc.convertToInvoice(req.tenant.id, req.params.id, req.user.id, req.user.role); res.status(201).json({ success: true, invoice: data, message: 'Devi Dirèk konvèti an fakti avèk siksè.' }); });

const share = asyncHandler(async (req, res) => {
  const data = await svc.generatePublicLink(req.tenant.id, req.params.id, req.user.role);
  res.json({ success: true, ...data, message: 'Lyen pataj kreye.' });
});

const revokeShare = asyncHandler(async (req, res) => {
  await svc.revokePublicLink(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Lyen pataj revoke.' });
});

// ✅ Wout PIBLIK — san kòd, tankou Devi nòmal
const getPublic = asyncHandler(async (req, res) => {
  const data = await svc.getByPublicToken(req.params.token);
  res.json({ success: true, ...data });
});

const getReport = asyncHandler(async (req, res) => {
  const data = await svc.getReport(req.tenant.id, { ...req.query, branchId: req.branchId || undefined });
  res.json({ success: true, ...data });
});

// ✅ Admin konfigire pwòp PIN 4 chif pa li (pou otorize Devi Dirèk kesye yo)
const setMyPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Sèlman admin ka konfigire yon PIN otorizasyon.' });
  }
  if (!pin || !/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ success: false, message: 'PIN dwe gen egzakteman 4 chif.' });
  }
  const prisma = require('../../config/prisma');
  await prisma.user.update({ where: { id: req.user.id }, data: { directQuotePin: String(pin) } });
  res.json({ success: true, message: 'PIN otorizasyon konfigire.' });
});

module.exports = { getAll, getOne, create, update, send, cancel, convertToInvoice, authorize, share, revokeShare, getPublic, getReport, setMyPin };
