// src/modules/reports/dashboard-full.route.js
// ✅ Yon sèl endpoint ki konbine tout 5 calls Dashboard la
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma  = require('../../config/prisma');

router.use(identifyTenant, authenticate);

const haitiRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return {};
  const gte = new Date(`${dateFrom}T05:00:00.000Z`);
  const lte = new Date(new Date(`${dateTo}T05:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000 - 1);
  return { gte, lte };
};

// ✅ Jwenn dat la an lè Ayiti (America/Port-au-Prince), pa an UTC.
// Sa evite bug kote "Vant Jodi a" / "Pa Peye" bay 0 apre ~7è diswa lè Ayiti,
// paske .toISOString() te ka deja sou pwochen jou a an UTC.
const getHaitiDateStr = (d = new Date()) =>
  d.toLocaleDateString('en-CA', { timeZone: 'America/Port-au-Prince' }); // → "YYYY-MM-DD"

// ── GET /api/v1/dashboard/full
router.get('/full', extractBranch, asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const branchId = req.branchId || null;
  const isAdmin  = req.user.role === 'admin';

  const today      = getHaitiDateStr();
  const todayRange = haitiRange(today, today);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFrom30 = getHaitiDateStr(thirtyDaysAgo);
  const salesRange = haitiRange(dateFrom30, today);

  const baseWhere = {
    tenantId,
    status: { not: 'cancelled' },
    ...(branchId && { branchId }),
  };

  const todayWhere = {
    tenantId,
    ...(branchId && { branchId }),
    issueDate: todayRange,
  };

  // ✅ Tout queries an paralèl — yon sèl aller-retour backend
  const [
    // dashboard global
    totalUnpaid,
    totalPaid,
    totalPartial,
    recentInvoices,
    // today
    todayPaid,
    todayUnpaid,
    todayPartial,
    // low stock (tout pwodwi aktif — nou filtre pa alertThreshold reyèl la apre)
    allActiveProducts,
    // sales 30 jou (admin sèlman)
    salesReport,
  ] = await Promise.all([
    // Global stats
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: 'unpaid' },
      _sum: { balanceDueHtg: true }, _count: true,
    }),
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: 'paid' },
      _sum: { totalHtg: true }, _count: true,
    }),
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: 'partial' },
      _sum: { balanceDueHtg: true }, _count: true,
    }),
    prisma.invoice.findMany({
      where: { tenantId, ...(branchId && { branchId }) },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Today stats
    prisma.invoice.aggregate({
      where: { ...todayWhere, status: 'paid' },
      _sum: { totalHtg: true }, _count: true,
    }),
    prisma.invoice.aggregate({
      where: { ...todayWhere, status: 'unpaid' },
      _sum: { balanceDueHtg: true }, _count: true,
    }),
    prisma.invoice.aggregate({
      where: { ...todayWhere, status: 'partial' },
      _sum: { balanceDueHtg: true }, _count: true,
    }),
    // Tout pwodwi aktif (pa sèvis) — filtraj alertThreshold fèt an JS pi ba
    prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        isService: false,
        ...(branchId && { branchId }),
      },
      select: { id: true, name: true, code: true, quantity: true, alertThreshold: true },
    }),
    // Sales 30 jou — sèlman si admin
    isAdmin
      ? prisma.invoice.findMany({
          where: {
            tenantId,
            status: { not: 'cancelled' },
            ...(branchId && { branchId }),
            issueDate: salesRange,
          },
          select: { issueDate: true, totalHtg: true },
          orderBy: { issueDate: 'desc' },
          take: 1000,
        })
      : Promise.resolve([]),
  ]);

  // ✅ Low stock: konparezon quantity <= alertThreshold fèt an JS
  // paske Prisma pa ka konpare 2 kolòn dirèkteman nan yon `where` san raw SQL.
  // (alertThreshold default 5 si li pa defini pou yon pwodwi)
  const lowStock = allActiveProducts
    .filter(p => Number(p.quantity) <= Number(p.alertThreshold ?? 5))
    .slice(0, 10);

  // ✅ Kalkile today totals — konvèti chak issueDate an dat Ayiti anvan konparezon,
  // olye de String(inv.issueDate).startsWith(today) ki ka fail si issueDate se yon Date obj.
  const todayTotalVentes = isAdmin
    ? salesReport
        .filter(inv => getHaitiDateStr(new Date(inv.issueDate)) === today)
        .reduce((sum, inv) => sum + Number(inv.totalHtg || 0), 0)
    : 0;

  // Konstrwi chart data 7 jou (grouye pa dat Ayiti, pa dat UTC)
  const daily = salesReport.reduce((acc, inv) => {
    const day = getHaitiDateStr(new Date(inv.issueDate));
    if (!acc[day]) acc[day] = { date: day, total_htg: 0 };
    acc[day].total_htg += Number(inv.totalHtg || 0);
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      dashboard: {
        totalUnpaid,
        totalPaid,
        totalPartial,
        recentInvoices,
      },
      today: {
        totalPaid:    { _sum: { totalHtg: todayPaid._sum?.totalHtg },       _count: todayPaid._count },
        totalUnpaid:  { _sum: { balanceDueHtg: todayUnpaid._sum?.balanceDueHtg }, _count: todayUnpaid._count },
        totalPartial: { _sum: { balanceDueHtg: todayPartial._sum?.balanceDueHtg }, _count: todayPartial._count },
      },
      todayTotalVentes,
      lowStock,
      salesDaily: Object.values(daily),
    }
  });
}));

module.exports = router;