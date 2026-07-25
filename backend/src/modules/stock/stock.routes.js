// src/modules/stock/stock.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma     = require('../../config/prisma');
const svcProduct = require('../products/product.service');
const { checkAndNotifyLowStock, notifyEmployeeAction } =require('../../helpers/notification.helper');

router.use(identifyTenant, authenticate);

// ⚠️ NOUVO — Admin ka pase yon branchId eksplisit nan body (pa egzanp
// yon dropdown nan fòm lan) ki pran priyorite sou header X-Branch-Id la.
// Pou lòt wòl, req.branchId (deja detèmine pa extractBranch selon
// BranchUser pa yo) toujou itilize san eksepsyon — yo pa ka bypass
// pwòp limit branch yo lè yo voye yon branchId nan body.
async function resolveBranchId(req, res) {
  if (req.user.role === 'admin' && req.body.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: req.body.branchId, tenantId: req.tenant.id }
    });
    if (!branch) {
      res.status(400).json({ success: false, message: 'Branch pa valid.' });
      return null;
    }
    if (!branch.isActive) {
      res.status(403).json({ success: false, message: 'Branch sa a bloke.', branchLocked: true });
      return null;
    }
    return branch.id;
  }
  return req.branchId || null;
}

// GET mouvements de stock
router.get('/movements', extractBranch, asyncHandler(async (req, res) => {
  const { productId, type, page = 1, limit = 20 } = req.query;
  const branchId = req.branchId || null;

  const where = {
    tenantId: req.tenant.id,
    ...(branchId && { branchId }),
    ...(productId && { productId }),
    ...(type && { movementType: type })
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, code: true, unit: true } },
        creator: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.stockMovement.count({ where })
  ]);

  res.json({ success: true, movements, total, pages: Math.ceil(total / Number(limit)) });
}));

// Ajustement manuel
router.post('/adjust', authorize('admin', 'stock_manager'), extractBranch, asyncHandler(async (req, res) => {
  const { productId, quantity, type, notes } = req.body;
  if (!productId || !quantity || !type) {
    return res.status(400).json({ success: false, message: 'productId, quantity ak type obligatwa.' });
  }

  const branchId = await resolveBranchId(req, res);
  if (res.headersSent) return; // erè deja voye pa resolveBranchId (branch pa valid/bloke)

  const product = await svcProduct.adjustStock(req.tenant.id, productId, req.user.id, {
    quantity, type, notes, branchId
  });
  res.json({ success: true, product, message: `Stock ajiste. Nouvo kantite: ${product.quantity}` });
}));

// Réapprovisionnement
router.post('/purchase', authorize('admin', 'stock_manager'), extractBranch, asyncHandler(async (req, res) => {
  const { productId, quantity, unitCostHtg, notes } = req.body;
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId: req.tenant.id } });
  if (!product) return res.status(404).json({ success: false, message: 'Pwodui pa jwenn.' });

  const branchId = await resolveBranchId(req, res);
  if (res.headersSent) return; // erè deja voye pa resolveBranchId (branch pa valid/bloke)

  const qtyBefore = Number(product.quantity);
  const qtyAfter  = qtyBefore + Number(quantity);

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { quantity: qtyAfter } }),
    prisma.stockMovement.create({
      data: {
        tenantId: req.tenant.id,
        branchId,
        productId,
        movementType: 'purchase',
        quantityBefore: qtyBefore,
        quantityChange: Number(quantity),
        quantityAfter: qtyAfter,
        unitCostHtg: unitCostHtg ? Number(unitCostHtg) : undefined,
        notes,
        createdBy: req.user.id
      }
    })
  ]);

  res.json({ success: true, message: `${quantity} inite ajoute. Total: ${qtyAfter}` });
}));

module.exports = router;
