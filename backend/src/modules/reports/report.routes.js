// src/modules/reports/report.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma  = require('../../config/prisma');

router.use(identifyTenant, authenticate);

// ── GET /api/v1/reports/sales
router.get('/sales', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const tenantId = req.tenant.id;

  const dateFilter = dateFrom && dateTo
    ? { issueDate: { gte: new Date(dateFrom), lte: new Date(dateTo) } }
    : {};

  const where = { tenantId, status: { not: 'cancelled' }, ...dateFilter };

  const [totals, byStatus, recentInvoices] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _sum: { totalHtg: true, totalUsd: true, amountPaidHtg: true, balanceDueHtg: true },
      _count: true
    }),
    prisma.invoice.groupBy({
      by: ['status'],
      where,
      _sum: { totalHtg: true, totalUsd: true },
      _count: true
    }),
    prisma.invoice.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { issueDate: 'desc' },
      take: 30
    })
  ]);

  res.json({ success: true, report: { totals, byStatus, recentInvoices } });
}));

// ── GET /api/v1/reports/stock
router.get('/stock', asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;

  const [products, lowStockCount, outOfStockCount] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, isActive: true, isService: false },
      include: { category: { select: { name: true, color: true } } },
      orderBy: { quantity: 'asc' }
    }),
    prisma.product.count({
      where: { tenantId, isActive: true, isService: false, quantity: { lte: 5, gt: 0 } }
    }),
    prisma.product.count({
      where: { tenantId, isActive: true, isService: false, quantity: { lte: 0 } }
    })
  ]);

  const stockValue = products.reduce((acc, p) => {
    acc.costHtg  += Number(p.quantity) * Number(p.costPriceHtg);
    acc.priceHtg += Number(p.quantity) * Number(p.priceHtg);
    return acc;
  }, { costHtg: 0, priceHtg: 0 });

  res.json({
    success: true,
    report: {
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      stockValue,
      products
    }
  });
}));

// ── GET /api/v1/reports/top-products
router.get('/top-products', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 10 } = req.query;
  const tenantId = req.tenant.id;

  const invoiceFilter = {
    status: { not: 'cancelled' },
    ...(dateFrom && dateTo && { issueDate: { gte: new Date(dateFrom), lte: new Date(dateTo) } })
  };

  const topItems = await prisma.invoiceItem.groupBy({
    by: ['productId'],
    where: { tenantId, invoice: invoiceFilter },
    _sum: { quantity: true, totalHtg: true, totalUsd: true },
    _count: true,
    orderBy: { _sum: { totalHtg: 'desc' } },
    take: Number(limit)
  });

  const enriched = await Promise.all(
    topItems.map(async (item) => {
      if (!item.productId) return item;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, code: true, unit: true, category: { select: { name: true } } }
      });
      return { ...item, product };
    })
  );

  res.json({ success: true, topProducts: enriched });
}));

// ── GET /api/v1/reports/dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const today    = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    invoiceStats, paidThisMonth,
    lowStockCount, productCount,
    recentInvoices
  ] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      where: { tenantId },
      _sum: { totalHtg: true, balanceDueHtg: true },
      _count: true
    }),
    prisma.invoice.aggregate({
      where: { tenantId, status: 'paid', issueDate: { gte: startMonth } },
      _sum: { totalHtg: true, totalUsd: true },
      _count: true
    }),
    prisma.product.count({ where: { tenantId, isActive: true, isService: false, quantity: { lte: 5 } } }),
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.invoice.findMany({
      where: { tenantId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  res.json({
    success: true,
    dashboard: { invoiceStats, paidThisMonth, lowStockCount, productCount, recentInvoices }
  });
}));

module.exports = router;
