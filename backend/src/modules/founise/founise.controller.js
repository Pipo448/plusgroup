// src/modules/founise/founise.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./founise.service');

// ── Kapital
const getKapital = asyncHandler(async (req, res) => {
  const balans = await svc.getKapitalBalans(req.tenant.id);
  res.json({ success: true, kapital: balans });
});

const getKapitalMouvman = asyncHandler(async (req, res) => {
  const data = await svc.listKapitalMouvman(req.tenant.id, req.query);
  res.json({ success: true, mouvman: data });
});

const postKapitalEnjeksyon = asyncHandler(async (req, res) => {
  const data = await svc.injectKapital(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ success: true, enjeksyon: data });
});

// ── Founisè
const getFounise = asyncHandler(async (req, res) => {
  const data = await svc.listFounise(req.tenant.id);
  res.json({ success: true, founise: data });
});

const postFounise = asyncHandler(async (req, res) => {
  const data = await svc.createFounise(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ success: true, founise: data });
});

const putFounise = asyncHandler(async (req, res) => {
  const data = await svc.updateFounise(req.tenant.id, req.params.id, req.body);
  res.json({ success: true, founise: data });
});

// ── Achte
const getAchte = asyncHandler(async (req, res) => {
  const data = await svc.listAchte(req.tenant.id, req.query);
  res.json({ success: true, achte: data });
});

const postAchte = asyncHandler(async (req, res) => {
  const data = await svc.createAchte(req.tenant.id, req.user.id, { ...req.body, branchId: req.branchId || undefined });
  res.status(201).json({ success: true, achte: data });
});

// ✅ NOUVO — plizyè liy achte pou menm founisè a, an yon sèl fwa
const postAchteBatch = asyncHandler(async (req, res) => {
  const data = await svc.createAchteBatch(req.tenant.id, req.user.id, { ...req.body, branchId: req.branchId || undefined });
  res.status(201).json({ success: true, ...data });
});

module.exports = {
  getKapital, getKapitalMouvman, postKapitalEnjeksyon,
  getFounise, postFounise, putFounise,
  getAchte, postAchte, postAchteBatch,
};
