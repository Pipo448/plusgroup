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

  // ✅ NOUVO — Benefis: kalkile pou MWA SA A (menm konvansyon ak paj Depans
  // lan, "TOTAL DEPANS MWA SA"), an lè Ayiti.
  const monthStart = `${today.slice(0, 7)}-01`; // "YYYY-MM-01"
  const monthRange = haitiRange(monthStart, today);
  // pg_expenses.date_depans se yon kolòn DATE (pa Timestamptz) — konparezon
  // an fèt ak dat pi senp, pa gen bezwen lè presi.
  const monthDateOnlyRange = { gte: new Date(`${monthStart}T00:00:00.000Z`), lte: new Date(`${today}T23:59:59.999Z`) };

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

  // ✅ MODIFYE — Total Tablo Bò a ENKLI tout lajan, ni sa ki soti nan estòk
  // ni sa ki soti nan Devi Dirèk konvèti. Separasyon detaye a se sèlman
  // nan paj Rapò a (blòk enfòmatif adisyonèl), pa yon eksklizyon isit la.

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
    // ✅ KORIJE — "Vant Jodi a" (tout fakti jodi a, kèlkeswa estati peman)
    // Sa a te AVAN sèlman kalkile pou admin (bay 0 pou kesye). Kounye a li
    // mache pou TOUT wòl, paske kat "Vant Jodi a" a vizib pou tout moun.
    todayAllStatus,
    // ✅ NOUVO — Vant PA M jodi a (kesye ki konekte a sèlman), pou li ka
    // konfye chif pa li san l pa gen aksè chif tout lòt kesye yo
    myTodaySales,
    // low stock (tout pwodwi aktif — nou filtre pa alertThreshold reyèl la apre)
    allActiveProducts,
    // sales 30 jou (admin sèlman — sèvi pou graf la sèlman)
    salesReport,
    // ✅ NOUVO — Benefis mwa sa a (admin sèlman)
    monthRevenueAgg,
    monthInvoiceItems,
    monthExpensesAgg,
    monthSalariesAgg,
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
      _sum: { balanceDueHtg: true, amountPaidHtg: true }, _count: true,
    }),
    // ✅ NOUVO — pou TOUT wòl, pa sèlman admin
    prisma.invoice.aggregate({
      where: { ...todayWhere, status: { not: 'cancelled' } },
      _sum: { totalHtg: true }, _count: true,
    }),
    // ✅ NOUVO — menm bagay la men filtre PA userId (kesye ki konekte a sèlman)
    prisma.invoice.aggregate({
      where: { ...todayWhere, status: { not: 'cancelled' }, createdBy: req.user.id },
      _sum: { totalHtg: true }, _count: true,
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
    // Sales 30 jou — sèlman si admin (sa a se pou graf istorik la sèlman,
    // "Vant Jodi a" pa depann de sa ankò)
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
    // ✅ NOUVO — Benefis mwa sa a (admin sèlman, menm jan ak salesReport):
    // 1) revni mwa a, 2) kou machandiz vann (kantite × pri kout aktyèl
    // pwodwi a), 3) depans, 4) salè anplwaye aktif yo.
    isAdmin
      ? prisma.invoice.aggregate({
          where: { tenantId, status: { not: 'cancelled' }, ...(branchId && { branchId }), issueDate: monthRange },
          _sum: { totalHtg: true },
        })
      : Promise.resolve({ _sum: { totalHtg: 0 } }),
    isAdmin
      ? prisma.invoiceItem.findMany({
          where: {
            tenantId,
            invoice: { status: { not: 'cancelled' }, ...(branchId && { branchId }), issueDate: monthRange },
          },
          select: { quantity: true, product: { select: { costPriceHtg: true } } },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.pg_expenses.aggregate({
          where: { tenant_id: tenantId, date_depans: monthDateOnlyRange },
          _sum: { montant: true },
        })
      : Promise.resolve({ _sum: { montant: 0 } }),
    isAdmin
      ? prisma.pg_employees.aggregate({
          where: { tenant_id: tenantId, statut: 'actif' },
          _sum: { salaire: true },
        })
      : Promise.resolve({ _sum: { salaire: 0 } }),
  ]);

  // ✅ NOUVO — Benefis mwa sa a
  const monthRevenue  = Number(monthRevenueAgg._sum?.totalHtg || 0);
  const monthCogs     = monthInvoiceItems.reduce((acc, it) => acc + Number(it.quantity) * Number(it.product?.costPriceHtg || 0), 0);
  const monthExpenses = Number(monthExpensesAgg._sum?.montant || 0);
  const monthSalaries = Number(monthSalariesAgg._sum?.salaire || 0);
  const monthProfit = {
    revenue:  monthRevenue,
    cogs:     Math.round(monthCogs * 100) / 100,
    expenses: monthExpenses,
    salaries: monthSalaries,
    net:      Math.round((monthRevenue - monthCogs - monthExpenses - monthSalaries) * 100) / 100,
  };

  // ✅ Low stock: konparezon quantity <= alertThreshold fèt an JS
  // paske Prisma pa ka konpare 2 kolòn dirèkteman nan yon `where` san raw SQL.
  // (alertThreshold default 5 si li pa defini pou yon pwodwi)
  const lowStock = allActiveProducts
    .filter(p => Number(p.quantity) <= Number(p.alertThreshold ?? 5))
    .slice(0, 10);

  // ✅ KORIJE — "Vant Jodi a" mache pou tout wòl kounye a (pa admin sèlman)
  const todayTotalVentes = Number(todayAllStatus._sum?.totalHtg || 0);
  // ✅ NOUVO — Vant pa m jodi a (kesye ki konekte a)
  const myTodayTotalVentes = Number(myTodaySales._sum?.totalHtg || 0);
  const myTodayCount       = Number(myTodaySales._count || 0);

  // Konstrwi chart data 7 jou (grouye pa dat Ayiti, pa dat UTC) — admin sèlman
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
        totalPartial: { _sum: { balanceDueHtg: todayPartial._sum?.balanceDueHtg, amountPaidHtg: todayPartial._sum?.amountPaidHtg }, _count: todayPartial._count },
      },
      todayTotalVentes,
      // ✅ NOUVO — pou tout wòl, chak moun wè sèlman pwòp chif pa li
      myTodaySales: { total: myTodayTotalVentes, count: myTodayCount },
      lowStock,
      salesDaily: Object.values(daily),
      // ✅ NOUVO — Benefis = Vant − Kou machandiz vann − Depans − Salè,
      // kalkile pou mwa an kou a (null pou kesye, admin sèlman)
      monthProfit: isAdmin ? monthProfit : null,
    }
  });
}));

module.exports = router;