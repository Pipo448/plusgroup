// src/modules/payments/payment.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma  = require('../../config/prisma');

router.use(identifyTenant, authenticate);

// GET historique paiements
router.get('/', asyncHandler(async (req, res) => {
  const { invoiceId, method, page = 1, limit = 20, dateFrom, dateTo } = req.query;
  const where = {
    tenantId: req.tenant.id,
    ...(invoiceId && { invoiceId }),
    ...(method && { method }),
    ...(dateFrom && dateTo && { paymentDate: { gte: new Date(dateFrom), lte: new Date(dateTo) } })
  };

  const [payments, total, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: { select: { invoiceNumber: true, client: { select: { name: true } } } },
        creator: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amountHtg: true, amountUsd: true } })
  ]);

  res.json({ success: true, payments, total, totals: totals._sum, pages: Math.ceil(total / Number(limit)) });
}));

module.exports = router;
