// src/modules/products/product.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma = require('../../config/prisma');
const svc = require('./product.service');

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, {
    ...req.query,
    branchId: req.branchId || undefined
  });
  res.json({ success: true, ...data });
});

const getLowStock = asyncHandler(async (req, res) => {
  const data = await svc.getLowStock(req.tenant.id, req.branchId || undefined, req.query.module || undefined);
  res.json({ success: true, products: data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id);
  res.json({ success: true, product: data });
});

// ⚠️ KORIJE — valide branchId eksplisit la (si admin voye youn nan body,
// pa egzanp yon dropdown nan fòm lan) apatyen tenant lan e li aktif,
// olye l pase dirèkteman san verifikasyon jan l te ye anvan an.
const create = asyncHandler(async (req, res) => {
  let branchId = req.branchId || null;

  if (req.user.role === 'admin' && req.body.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: req.body.branchId, tenantId: req.tenant.id }
    });
    if (!branch) {
      return res.status(400).json({ success: false, message: 'Branch pa valid.' });
    }
    if (!branch.isActive) {
      return res.status(403).json({ success: false, message: 'Branch sa a bloke.', branchLocked: true });
    }
    branchId = branch.id;
  }

  const data = await svc.create(req.tenant.id, req.user.id, {
    ...req.body,
    branchId
  });
  res.status(201).json({ success: true, product: data });
});

const update = asyncHandler(async (req, res) => {
  const data = await svc.update(req.tenant.id, req.params.id, req.user.id, req.body);
  res.json({ success: true, product: data });
});

const remove = asyncHandler(async (req, res) => {
  const result = await svc.remove(req.tenant.id, req.params.id);
  res.json({ 
    success: true, 
    message: result?.message || 'Pwodui siprime avèk siksè.',
    soft: result?.soft || false
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const data = await svc.getCategories(req.tenant.id, req.branchId || undefined, req.query.module || undefined);
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

module.exports = { getAll, getLowStock, getOne, create, update, remove, getCategories, createCategory, updateCategory, deleteCategory };
