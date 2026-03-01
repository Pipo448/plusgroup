// src/modules/admin/admin.routes.js — Super Admin Panel
const express = require('express');
const router  = express.Router();
const { superAdminAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../../config/prisma');

// ══════════════════════════════════════════════
// LOJIK ABÒNMAN — JOU 5 MWA KAP VINI
// ══════════════════════════════════════════════

/**
 * Kalkile dat ekspirasyon: jou 5 nan mwa (N+months)
 * Eks: aktive 14 Fevriye + 1 mwa → ekspire 5 Mas 23:59:59
 *      aktive 14 Mas + 2 mwa     → ekspire 5 Me 23:59:59
 *      aktive 28 Desanm + 1 mwa  → ekspire 5 Janvye (lane pwochen) 23:59:59
 */
function calcSubscriptionEnd(startDate, months) {
  const start       = new Date(startDate);
  // Mwa target = mwa kouwè + months (pa months-1, nou vle mwa KAP VINI)
  const targetMonth = start.getMonth() + months;
  const targetYear  = start.getFullYear() + Math.floor(targetMonth / 12);
  const normMonth   = ((targetMonth % 12) + 12) % 12;
  // Jou 5 nan mwa kap vini an
  const expireDate  = new Date(targetYear, normMonth, 5);
  expireDate.setHours(23, 59, 59, 999);
  return expireDate;
}

/**
 * Renouvle: ajoute N mwa sou ekspirasyon kouwè a
 * → nouvo ekspirasyon = jou 5 nan mwa (base + N mwa)
 * Si deja ekspire → pati de jodi a
 */
function renewSubscription(currentEnd, months) {
  const now  = new Date();
  const base = (currentEnd && new Date(currentEnd) > now)
    ? new Date(currentEnd)
    : now;
  const targetMonth = base.getMonth() + months;
  const targetYear  = base.getFullYear() + Math.floor(targetMonth / 12);
  const normMonth   = ((targetMonth % 12) + 12) % 12;
  // Jou 5 nan mwa kap vini apre base a
  const expireDate  = new Date(targetYear, normMonth, 5);
  expireDate.setHours(23, 59, 59, 999);
  return expireDate;
}

// ── POST /api/v1/admin/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email ak modpas obligatwa.' });

  const admin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!admin || !admin.isActive)
    return res.status(401).json({ success: false, message: 'Idantifyan pa kòrèk.' });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid)
    return res.status(401).json({ success: false, message: 'Idantifyan pa kòrèk.' });

  const token = jwt.sign(
    { adminId: admin.id },
    process.env.SUPER_ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ success: true, token, admin: { id: admin.id, name: admin.name, email: admin.email } });
}));

// ── POST /api/v1/admin/setup-superadmin
router.post('/setup-superadmin', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prismaClient = new PrismaClient();

    const existing = await prismaClient.superAdmin.findFirst();
    if (existing) {
      await prismaClient.$disconnect();
      return res.json({ success: false, message: 'Super Admin deja egziste!' });
    }

    const hashedPassword = await bcrypt.hash('SuperAdmin2024!', 12);
    const superAdmin = await prismaClient.superAdmin.create({
      data: { name: 'PLUS GROUP Admin', email: 'admin@plusgroup.ht', passwordHash: hashedPassword, isActive: true }
    });
    await prismaClient.$disconnect();

    res.json({
      success: true,
      message: 'Super Admin kreye avèk siksè!',
      data: {
        superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email },
        credentials: { email: 'admin@plusgroup.ht', password: 'SuperAdmin2024!', loginUrl: '/admin/login' }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erè pandan kreye super admin', error: error.message });
  }
});

// ── DELETE /api/v1/admin/tenants/by-slug/:slug
router.delete('/tenants/by-slug/:slug', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prismaClient = new PrismaClient();
    const { slug } = req.params;

    const tenant = await prismaClient.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      await prismaClient.$disconnect();
      return res.status(404).json({ success: false, message: `Tenant "${slug}" pa jwenn.` });
    }

    const safeDelete = async (fn) => { try { await fn(); } catch(e) { console.warn("Skip:", e.message); } };
    await safeDelete(() => prismaClient.stockMovement.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.invoiceItem.deleteMany({ where: { invoice: { tenantId: tenant.id } } }));
    await safeDelete(() => prismaClient.payment.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.invoice.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.quoteItem.deleteMany({ where: { quote: { tenantId: tenant.id } } }));
    await safeDelete(() => prismaClient.quote.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.product.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.category.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.client.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.documentSequence.deleteMany({ where: { tenantId: tenant.id } }));
    await safeDelete(() => prismaClient.user.deleteMany({ where: { tenantId: tenant.id } }));
    await prismaClient.tenant.delete({ where: { id: tenant.id } });
    await prismaClient.$disconnect();

    res.json({ success: true, message: `Tenant "${slug}" efase avèk siksè!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erè pandan efase tenant', error: error.message });
  }
});

// ── Proteksyon tout routes anba a
router.use(superAdminAuth);

// ── GET /api/v1/admin/tenants
router.get('/tenants', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const where = { ...(status && { status }) };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        plan: { select: { id: true, name: true, features: true, priceMonthly: true } },
        _count: { select: { users: true, products: true, invoices: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.tenant.count({ where })
  ]);
  res.json({ success: true, tenants, total, pages: Math.ceil(total / Number(limit)) });
}));

// ── GET /api/v1/admin/tenants/:id
router.get('/tenants/:id', asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: { plan: true, subscriptions: true, _count: { select: { users: true, products: true, invoices: true } } }
  });
  if (!tenant)
    return res.status(404).json({ success: false, message: 'Entreprise pa jwenn.' });
  res.json({ success: true, tenant });
}));

// ── POST /api/v1/admin/tenants
router.post('/tenants', asyncHandler(async (req, res) => {
  const {
    name, slug, email, phone, address, planId,
    adminEmail, adminPassword, adminName,
    subscriptionMonths, defaultCurrency, defaultLanguage
  } = req.body;

  if (!name || !slug)
    return res.status(400).json({ success: false, message: 'Non ak slug obligatwa.' });

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  if (!cleanSlug)
    return res.status(400).json({ success: false, message: 'Slug pa valid.' });

  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing)
    return res.status(409).json({ success: false, message: `Slug "${cleanSlug}" deja egziste.` });

  // ✅ NOUVO: ekspire jou 5 nan mwa (N+months) — pa fen mwa kouwè
  // Eks: aktive 28 Fevriye + 1 mwa → ekspire 5 Mas 23:59:59
  const months = Math.max(1, Math.min(36, Number(subscriptionMonths) || 1));
  const subscriptionEndsAt = calcSubscriptionEnd(new Date(), months);

  let cleanPlanId = null;
  if (planId && typeof planId === 'string' && planId.trim() !== '') {
    const trimmedId = planId.trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmedId)) {
      try {
        const planExists = await prisma.subscriptionPlan.findUnique({ where: { id: trimmedId } });
        if (planExists) cleanPlanId = trimmedId;
      } catch (e) { console.warn(`Erè rechèch plan: ${e.message}`); }
    }
  }

  const cleanCurrency = ['HTG', 'USD'].includes(defaultCurrency) ? defaultCurrency : 'HTG';
  const cleanLanguage  = ['ht', 'fr', 'en'].includes(defaultLanguage) ? defaultLanguage : 'ht';

  const tenant = await prisma.tenant.create({
    data: {
      name: name.trim(), slug: cleanSlug,
      email: email || null, phone: phone || null, address: address || null,
      planId: cleanPlanId,
      defaultCurrency: cleanCurrency, defaultLanguage: cleanLanguage,
      status: 'active',
      subscriptionEndsAt  // ← jou 5 mwa kap vini
    }
  });

  if (adminEmail && adminPassword) {
    const emailExists = await prisma.user.findFirst({
      where: { email: adminEmail.toLowerCase().trim(), tenantId: tenant.id }
    });
    if (!emailExists) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          fullName: (adminName || 'Administrateur').trim(),
          email: adminEmail.toLowerCase().trim(),
          passwordHash: hash, role: 'admin', isActive: true
        }
      });
    }
  }

  try {
    await Promise.all([
      prisma.documentSequence.upsert({
        where:  { tenantId_documentType: { tenantId: tenant.id, documentType: 'quote' } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'quote', prefix: 'DEV', currentYear: new Date().getFullYear() }
      }),
      prisma.documentSequence.upsert({
        where:  { tenantId_documentType: { tenantId: tenant.id, documentType: 'invoice' } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'invoice', prefix: 'FAC', currentYear: new Date().getFullYear() }
      })
    ]);
  } catch (seqErr) { console.warn('Sekans dokiman:', seqErr.message); }

  res.status(201).json({
    success: true, tenant,
    message: `Entreprise "${tenant.name}" kreye. Abònman ekspire ${subscriptionEndsAt.toLocaleDateString('fr-FR')}.`
  });
}));

// ── PATCH /api/v1/admin/tenants/:id/status
router.patch('/tenants/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['active', 'suspended', 'pending', 'cancelled'];
  if (!valid.includes(status))
    return res.status(400).json({ success: false, message: 'Statut pa valid.' });

  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: { status } });
  const msg = status === 'active' ? 'aktive' : status === 'suspended' ? 'sipann' : status;
  res.json({ success: true, tenant, message: `Entreprise ${msg}.` });
}));

// ── PATCH /api/v1/admin/tenants/:id/plan
router.patch('/tenants/:id/plan', asyncHandler(async (req, res) => {
  const { planId } = req.body;
  if (!planId)
    return res.status(400).json({ success: false, message: 'planId obligatwa.' });

  const planExists = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!planExists)
    return res.status(404).json({ success: false, message: 'Plan pa jwenn.' });

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { planId },
    include: { plan: { select: { id: true, name: true, features: true, priceMonthly: true } } }
  });

  res.json({ success: true, tenant, message: `Plan "${planExists.name}" asiye bay ${tenant.name}.` });
}));

// ── POST /api/v1/admin/tenants/:id/renew
router.post('/tenants/:id/renew', asyncHandler(async (req, res) => {
  const { months = 1 } = req.body;
  const numMonths = Math.max(1, Math.min(36, Number(months)));

  const existing = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, subscriptionEndsAt: true, status: true }
  });
  if (!existing)
    return res.status(404).json({ success: false, message: 'Entreprise pa jwenn.' });

  // ✅ NOUVO: renouvèlman → jou 5 nan mwa kap vini apre ekspirasyon kouwè
  // Eks: ekspire 5 Mas + 1 mwa → 5 Avril
  //      ekspire 5 Avril + 1 mwa → 5 Me
  //      deja ekspire (28 Fevriye) + 1 mwa → 5 Avril (pati de jodi a)
  const newEndsAt = renewSubscription(existing.subscriptionEndsAt, numMonths);

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { subscriptionEndsAt: newEndsAt, status: 'active' },
    select: { id: true, name: true, subscriptionEndsAt: true, status: true }
  });

  res.json({
    success: true, tenant,
    message: `Abònman ${existing.name} renouvle pou ${numMonths} mwa. Nouvo ekspirasyon: ${newEndsAt.toLocaleDateString('fr-FR')}.`
  });
}));

// ── GET /api/v1/admin/plans
router.get('/plans', asyncHandler(async (req, res) => {
  const PLANS = [
    { name: 'Estanda',  nameFr: 'Standard',   maxUsers: 5,   maxProducts: 10000,  priceMonthly: 2500, features: JSON.stringify(['Jesyon Stòk', 'Fakti & Devis', 'Jiska 5 itilizatè']) },
    { name: 'Biznis',   nameFr: 'Business',   maxUsers: 15,  maxProducts: 50000,  priceMonthly: 3000, features: JSON.stringify(['Tout nan Estanda', 'Rapò avanse', 'Jiska 15 itilizatè', 'Sèvis']) },
    { name: 'Premyum',  nameFr: 'Premium',    maxUsers: 100, maxProducts: 100000, priceMonthly: 4000, features: JSON.stringify(['Tout nan Biznis', 'Sipò priorite', 'Itilizatè entelimite', 'Sèvis']) },
    { name: 'Antepriz', nameFr: 'Entreprise', maxUsers: 999, maxProducts: 999999999, priceMonthly: 5000, features: JSON.stringify(['Tout nan Premyum', 'Paj Sabotay MonCash/NatCash', 'Ti Kanè Kès', 'Sipò VIP 24/7', 'Sèvis']) },
  ];

  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: { features: plan.features, priceMonthly: plan.priceMonthly, maxUsers: plan.maxUsers, maxProducts: plan.maxProducts, isActive: true }
      });
    } else {
      await prisma.subscriptionPlan.create({ data: plan });
    }
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' }
  });

  res.json({ success: true, plans });
}));

// ── GET /api/v1/admin/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [total, active, pending, suspended, totalUsers] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'active' } }),
    prisma.tenant.count({ where: { status: 'pending' } }),
    prisma.tenant.count({ where: { status: 'suspended' } }),
    prisma.user.count()
  ]);

  res.json({
    success: true,
    stats: {
      tenants: { total, active, pending, suspended },
      users:   { total: totalUsers }
    }
  });
}));

// ── GET /api/v1/admin/expiring (ancien: expiring-soon)
router.get('/expiring', asyncHandler(async (req, res) => {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const expiring = await prisma.tenant.findMany({
    where: { status: 'active', subscriptionEndsAt: { lte: fiveDaysFromNow, gte: new Date() } },
    select: { id: true, name: true, email: true, subscriptionEndsAt: true, plan: { select: { name: true } } },
    orderBy: { subscriptionEndsAt: 'asc' }
  });

  res.json({ success: true, expiring, count: expiring.length });
}));

// ── GET /api/v1/admin/expiring-soon (backward compat)
router.get('/expiring-soon', asyncHandler(async (req, res) => {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const expiring = await prisma.tenant.findMany({
    where: { status: 'active', subscriptionEndsAt: { lte: fiveDaysFromNow, gte: new Date() } },
    select: { id: true, name: true, email: true, subscriptionEndsAt: true, plan: { select: { name: true } } },
    orderBy: { subscriptionEndsAt: 'asc' }
  });

  res.json({ success: true, expiring, count: expiring.length });
}));

module.exports = router;
