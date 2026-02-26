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

  // ── Calcul vant pa jou (pou grafik)
  const daily = recentInvoices.reduce((acc, inv) => {
    const day = String(inv.issueDate).substring(0, 10);
    if (!acc[day]) acc[day] = { date: day, total_htg: 0, count: 0 };
    acc[day].total_htg += Number(inv.totalHtg || 0);
    acc[day].count     += 1;
    return acc;
  }, {});

  res.json({ success: true, report: { totals, byStatus, recentInvoices, daily: Object.values(daily) } });
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
    report: { totalProducts: products.length, lowStockCount, outOfStockCount, stockValue, products }
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

  const [invoiceStats, paidThisMonth, lowStockCount, productCount, recentInvoices] = await Promise.all([
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

// ══════════════════════════════════════════════════════════════
// ── GET /api/v1/reports/profit  (ADMIN SÈLMAN)
// ── Rapò Benefis: vant vs kout, benefis pa pwodui, maj %
// ══════════════════════════════════════════════════════════════
router.get('/profit', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, categoryId, createdBy } = req.query;
  const tenantId = req.tenant.id;

  // Sèlman admin ki ka wè rapò benefis
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Aksè refize. Admin sèlman.' });
  }

  const dateFilter = dateFrom && dateTo
    ? { gte: new Date(dateFrom), lte: new Date(dateTo) }
    : undefined;

  // Filtè pou InvoiceItem
  const itemWhere = {
    tenantId,
    invoice: {
      status: { not: 'cancelled' },
      ...(dateFilter && { issueDate: dateFilter }),
      ...(createdBy && { createdBy }),
    },
    ...(categoryId && {
      product: { categoryId }
    }),
  };

  // 1. Rekipere tout InvoiceItem ak snapshot pwodui
  const items = await prisma.invoiceItem.findMany({
    where: itemWhere,
    include: {
      product: {
        select: {
          id: true, name: true, code: true, unit: true,
          costPriceHtg: true,
          category: { select: { id: true, name: true, color: true } }
        }
      },
      invoice: {
        select: { issueDate: true, createdBy: true, invoiceNumber: true }
      }
    }
  });

  // 2. Agrege pa pwodui
  const productMap = {};
  for (const item of items) {
    const pid  = item.productId || 'unknown';
    const name = item.productSnapshot?.name || item.product?.name || 'Pwodui Siprime';
    const code = item.product?.code || '—';
    const unit = item.product?.unit || '';
    const cat  = item.product?.category?.name || '—';
    const catColor = item.product?.category?.color || '#6B7AAB';

    // Pri kout — itilize costPriceHtg pwodui aktyèl la
    const costPriceHtg = Number(item.product?.costPriceHtg || item.productSnapshot?.costPriceHtg || 0);
    const qty          = Number(item.quantity || 0);
    const vantTotal    = Number(item.totalHtg || 0);
    const koutTotal    = costPriceHtg * qty;
    const benefis      = vantTotal - koutTotal;

    if (!productMap[pid]) {
      productMap[pid] = {
        productId: pid, name, code, unit, category: cat, categoryColor: catColor,
        qteVann: 0, vantHtg: 0, koutHtg: 0, benefisHtg: 0, nbTransaksyon: 0
      };
    }

    productMap[pid].qteVann       += qty;
    productMap[pid].vantHtg       += vantTotal;
    productMap[pid].koutHtg       += koutTotal;
    productMap[pid].benefisHtg    += benefis;
    productMap[pid].nbTransaksyon += 1;
  }

  // 3. Konvèti an array epi kalkile maj %
  const byProduct = Object.values(productMap)
    .map(p => ({
      ...p,
      majPct: p.vantHtg > 0 ? ((p.benefisHtg / p.vantHtg) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.benefisHtg - a.benefisHtg);

  // 4. Totaux jeneral
  const totaux = byProduct.reduce((acc, p) => {
    acc.vantHtg    += p.vantHtg;
    acc.koutHtg    += p.koutHtg;
    acc.benefisHtg += p.benefisHtg;
    return acc;
  }, { vantHtg: 0, koutHtg: 0, benefisHtg: 0 });

  totaux.majPct = totaux.vantHtg > 0
    ? ((totaux.benefisHtg / totaux.vantHtg) * 100).toFixed(1)
    : '0.0';

  // 5. Top 5 pwodui pwofitab
  const top5 = [...byProduct].slice(0, 5);

  // 6. Grafik pa jou (benefis chak jou)
  const dailyMap = {};
  for (const item of items) {
    const day          = String(item.invoice.issueDate).substring(0, 10);
    const costPrice    = Number(item.product?.costPriceHtg || 0);
    const qty          = Number(item.quantity || 0);
    const vant         = Number(item.totalHtg || 0);
    const kout         = costPrice * qty;

    if (!dailyMap[day]) dailyMap[day] = { date: day, vant: 0, kout: 0, benefis: 0 };
    dailyMap[day].vant    += vant;
    dailyMap[day].kout    += kout;
    dailyMap[day].benefis += vant - kout;
  }

  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    profit: { totaux, byProduct, top5, daily }
  });
}));

module.exports = router;
