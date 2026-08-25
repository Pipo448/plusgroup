// src/modules/restaurant-tables/restaurant-tables.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./restaurant-tables.service');

const getTables = asyncHandler(async (req, res) => {
  const data = await svc.listTables(req.tenant.id, req.branchId || undefined);
  res.json({ success: true, tables: data });
});

const postTable = asyncHandler(async (req, res) => {
  const data = await svc.createTable(req.tenant.id, req.body);
  res.status(201).json({ success: true, table: data });
});

const putTable = asyncHandler(async (req, res) => {
  const data = await svc.updateTable(req.tenant.id, req.params.id, req.body);
  res.json({ success: true, table: data });
});

const postOpenOrder = asyncHandler(async (req, res) => {
  const data = await svc.getOrCreateOrder(req.tenant.id, req.user.id, req.params.tableId);
  res.json({ success: true, order: data });
});

const getOrder = asyncHandler(async (req, res) => {
  const data = await svc.getOrder(req.tenant.id, req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'Kòmand pa jwenn.' });
  res.json({ success: true, order: data });
});

const postItems = asyncHandler(async (req, res) => {
  const data = await svc.addItems(req.tenant.id, req.params.id, req.body.lignes);
  res.json({ success: true, order: data });
});

const deleteItem = asyncHandler(async (req, res) => {
  const data = await svc.removeItem(req.tenant.id, req.params.id, req.params.itemId);
  res.json({ success: true, order: data });
});

const postSendKitchen = asyncHandler(async (req, res) => {
  const data = await svc.sendToKitchen(req.tenant.id, req.params.id);
  res.json({ success: true, order: data });
});

const postClose = asyncHandler(async (req, res) => {
  const data = await svc.closeOrder(req.tenant.id, req.params.id, req.body.invoiceId);
  res.json({ success: true, order: data });
});

const postCancel = asyncHandler(async (req, res) => {
  const data = await svc.cancelOrder(req.tenant.id, req.params.id);
  res.json({ success: true, order: data });
});

module.exports = { getTables, postTable, putTable, postOpenOrder, getOrder, postItems, deleteItem, postSendKitchen, postClose, postCancel };
