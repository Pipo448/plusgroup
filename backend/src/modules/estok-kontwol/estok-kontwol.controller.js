// src/modules/estok-kontwol/estok-kontwol.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./estok-kontwol.service');

const post = asyncHandler(async (req, res) => {
  const data = await svc.createKontwol(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ success: true, kontwol: data });
});

// ✅ NOUVO — plizyè kontwòl an yon sèl fwa
const postBatch = asyncHandler(async (req, res) => {
  const data = await svc.createKontwolBatch(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ success: true, ...data });
});

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.listKontwol(req.tenant.id, req.query);
  res.json({ success: true, kontwol: data });
});

module.exports = { post, postBatch, getAll };
