// src/modules/clients/client.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./client.service');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, req.query);
  res.json({ success: true, ...data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id);
  res.json({ success: true, client: data });
});

const create = asyncHandler(async (req, res) => {
  const data = await svc.create(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ success: true, client: data });
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.tenant.id, req.params.id, req.body);
  res.json({ success: true, client: data });
});

const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Kliyan efase.' });
});

module.exports = { getAll, getOne, create, update, remove };
