// src/modules/kes-sesyon/kes-sesyon.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./kes-sesyon.service');

const postLouvri = asyncHandler(async (req, res) => {
  const data = await svc.louvriSesyon(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ success: true, sesyon: data });
});

const getAktif = asyncHandler(async (req, res) => {
  const data = await svc.getSesyonAktif(req.tenant.id, req.user.id);
  res.json({ success: true, sesyon: data });
});

const postFemen = asyncHandler(async (req, res) => {
  const data = await svc.femenSesyon(req.tenant.id, req.user.id, req.params.id, req.body);
  res.json({ success: true, sesyon: data });
});

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.listSesyon(req.tenant.id, req.query);
  res.json({ success: true, sesyon: data });
});

module.exports = { postLouvri, getAktif, postFemen, getAll };
