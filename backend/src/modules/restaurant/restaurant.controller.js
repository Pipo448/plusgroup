// src/modules/restaurant/restaurant.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./restaurant.service');

const getMenu = asyncHandler(async (req, res) => {
  const data = await svc.getMenu(req.tenant.id, { ...req.query, branchId: req.branchId || undefined });
  res.json({ success: true, ...data });
});

const getLowStock = asyncHandler(async (req, res) => {
  const data = await svc.getLowStock(req.tenant.id, req.branchId || undefined);
  res.json({ success: true, products: data });
});

const getMenuItem = asyncHandler(async (req, res) => {
  const data = await svc.getMenuItem(req.tenant.id, req.params.id);
  res.json({ success: true, product: data });
});

const createMenuItem = asyncHandler(async (req, res) => {
  const data = await svc.createMenuItem(req.tenant.id, req.user.id, {
    ...req.body,
    branchId: req.body.branchId || req.branchId || null
  });
  res.status(201).json({ success: true, product: data });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const data = await svc.updateMenuItem(req.tenant.id, req.params.id, req.user.id, req.body);
  res.json({ success: true, product: data });
});

const removeMenuItem = asyncHandler(async (req, res) => {
  const result = await svc.removeMenuItem(req.tenant.id, req.params.id);
  res.json({
    success: true,
    message: result?.message || 'Atik meni siprime avèk siksè.',
    soft: result?.soft || false
  });
});

const adjustStock = asyncHandler(async (req, res) => {
  const data = await svc.adjustStock(req.tenant.id, req.params.id, req.user.id, { ...req.body, branchId: req.branchId || undefined });
  res.json({ success: true, product: data });
});

const getCategories = asyncHandler(async (req, res) => {
  const data = await svc.getCategories(req.tenant.id, req.branchId || undefined);
  res.json({ success: true, categories: data });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await svc.createCategory(req.tenant.id, req.branchId || null, req.body);
  res.status(201).json({ success: true, category: data });
});

const updateCategory = asyncHandler(async (req, res) => {
  const data = await svc.updateCategory(req.tenant.id, req.params.id, req.body);
  res.json({ success: true, category: data });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await svc.deleteCategory(req.tenant.id, req.params.id);
  res.json({ success: true, message: 'Kategori siprime.' });
});

module.exports = {
  getMenu, getLowStock, getMenuItem, createMenuItem, updateMenuItem, removeMenuItem, adjustStock,
  getCategories, createCategory, updateCategory, deleteCategory,
};
