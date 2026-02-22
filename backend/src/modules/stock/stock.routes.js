// src/modules/stock/stock.routes.js
// Référence: Voir la section stock dans report.routes.js
// Ce fichier est le point d'entrée pour les routes stock

const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma  = require('../../config/prisma');
const svcProduct = require('../products/product.service');

router.use(identifyTenant, authenticate);

// GET mouvements de stock
router.get('/movements', asyncHandler(async (req, res) => {
  const { productId, type, page = 1, limit = 20 } = req.query;
  const where = {
    tenantId: req.tenant.id,
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
router.post('/adjust', authorize('admin', 'stock_manager'), asyncHandler(async (req, res) => {
  const { productId, quantity, type, notes } = req.body;
  if (!productId || !quantity || !type) {
    return res.status(400).json({ success: false, message: 'productId, quantity ak type obligatwa.' });
  }
  const product = await svcProduct.adjustStock(req.tenant.id, productId, req.user.id, { quantity, type, notes });
  res.json({ success: true, product, message: `Stock ajiste. Nouvo kantite: ${product.quantity}` });
}));

// Réapprovisionnement
router.post('/purchase', authorize('admin', 'stock_manager'), asyncHandler(async (req, res) => {
  const { productId, quantity, unitCostHtg, notes } = req.body;
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId: req.tenant.id } });
  if (!product) return res.status(404).json({ success: false, message: 'Pwodui pa jwenn.' });

  const qtyBefore = Number(product.quantity);
  const qtyAfter  = qtyBefore + Number(quantity);

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { quantity: qtyAfter } }),
    prisma.stockMovement.create({
      data: {
        tenantId: req.tenant.id, productId,
        movementType: 'purchase',
        quantityBefore: qtyBefore, quantityChange: Number(quantity), quantityAfter: qtyAfter,
        unitCostHtg: unitCostHtg ? Number(unitCostHtg) : undefined,
        notes, createdBy: req.user.id
      }
    })
  ]);

  res.json({ success: true, message: `${quantity} inite ajoute. Total: ${qtyAfter}` });
}));

module.exports = router;
