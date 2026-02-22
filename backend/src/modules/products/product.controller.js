// src/modules/products/product.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./product.service');

const getAll         = asyncHandler(async (req, res) => { const data = await svc.getAll(req.tenant.id, req.query); res.json({ success: true, ...data }); });
const getLowStock    = asyncHandler(async (req, res) => { const data = await svc.getLowStock(req.tenant.id); res.json({ success: true, products: data }); });
const getOne         = asyncHandler(async (req, res) => { const data = await svc.getOne(req.tenant.id, req.params.id); res.json({ success: true, product: data }); });
const create         = asyncHandler(async (req, res) => { const data = await svc.create(req.tenant.id, req.user.id, req.body); res.status(201).json({ success: true, product: data }); });
const update         = asyncHandler(async (req, res) => { const data = await svc.update(req.tenant.id, req.params.id, req.user.id, req.body); res.json({ success: true, product: data }); });
const remove         = asyncHandler(async (req, res) => { await svc.remove(req.tenant.id, req.params.id); res.json({ success: true, message: 'Pwodui siprime avèk siksè.' }); });
const getCategories  = asyncHandler(async (req, res) => { const data = await svc.getCategories(req.tenant.id); res.json({ success: true, categories: data }); });
const createCategory = asyncHandler(async (req, res) => { const data = await svc.createCategory(req.tenant.id, req.body); res.status(201).json({ success: true, category: data }); });
const updateCategory = asyncHandler(async (req, res) => { const data = await svc.updateCategory(req.tenant.id, req.params.id, req.body); res.json({ success: true, category: data }); });
const deleteCategory = asyncHandler(async (req, res) => { await svc.deleteCategory(req.tenant.id, req.params.id); res.json({ success: true, message: 'Kategori siprime.' }); });

module.exports = { getAll, getLowStock, getOne, create, update, remove, getCategories, createCategory, updateCategory, deleteCategory };
