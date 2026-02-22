// src/modules/quotes/quote.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./quote.service');

const getAll          = asyncHandler(async (req, res) => { const data = await svc.getAll(req.tenant.id, req.query); res.json({ success: true, ...data }); });
const getOne          = asyncHandler(async (req, res) => { const data = await svc.getOne(req.tenant.id, req.params.id); res.json({ success: true, quote: data }); });
const create          = asyncHandler(async (req, res) => { const data = await svc.create(req.tenant.id, req.user.id, req.body); res.status(201).json({ success: true, quote: data }); });
const update          = asyncHandler(async (req, res) => { const data = await svc.update(req.tenant.id, req.params.id, req.user.id, req.body); res.json({ success: true, quote: data }); });
const send            = asyncHandler(async (req, res) => { const data = await svc.send(req.tenant.id, req.params.id); res.json({ success: true, quote: data, message: 'Devis voye.' }); });
const cancel          = asyncHandler(async (req, res) => { const data = await svc.cancel(req.tenant.id, req.params.id); res.json({ success: true, quote: data, message: 'Devis anile.' }); });
const convertToInvoice = asyncHandler(async (req, res) => { const data = await svc.convertToInvoice(req.tenant.id, req.params.id, req.user.id); res.status(201).json({ success: true, invoice: data, message: 'Devis konvèti an facture avèk siksè.' }); });

module.exports = { getAll, getOne, create, update, send, cancel, convertToInvoice };
