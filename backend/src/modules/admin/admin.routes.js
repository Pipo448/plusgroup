// src/modules/admin/admin.routes.js — Super Admin Panel
const express = require('express');
const router  = express.Router();
const { superAdminAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../../config/prisma');

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
        plan: { select: { name: true } },
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
    include: {
      plan: true,
      subscriptions: true,
      _count: { select: { users: true, products: true, invoices: true } }
    }
  });
  if (!tenant)
    return res.status(404).json({ success: false, message: 'Entreprise pa jwenn.' });
  res.json({ success: true, tenant });
}));

// ── POST /api/v1/admin/tenants
router.post('/tenants', asyncHandler(async (req, res) => {
  const {
    name, slug, email, phone, address,
    planId, adminEmail, adminPassword, adminName,
    subscriptionMonths, defaultCurrency, defaultLanguage
  } = req.body;

  if (!name || !slug)
    return res.status(400).json({ success: false, message: 'Non ak slug obligatwa.' });

  // Slug: miniskil, tiret sèlman, pa kòmanse/fini ak tiret
  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  if (!cleanSlug)
    return res.status(400).json({ success: false, message: 'Slug pa valid.' });

  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing)
    return res.status(409).json({ success: false, message: `Slug "${cleanSlug}" deja egziste.` });

  // ✅ Kalkile dat ekspirasyon
  let subscriptionEndsAt = null;
  const months = Number(subscriptionMonths);
  if (months > 0) {
    const now = new Date();
    subscriptionEndsAt = new Date(now.setMonth(now.getMonth() + months));
  }

  // ✅ planId — verifye li egziste sinon mete null
  let cleanPlanId = null;
  if (planId && typeof planId === 'string' && planId.trim() !== '') {
    const trimmedId = planId.trim();
    // Verifye se yon UUID valid
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmedId)) {
      try {
        const planExists = await prisma.subscriptionPlan.findUnique({ where: { id: trimmedId } });
        if (planExists) cleanPlanId = trimmedId;
        else console.warn(`Plan ${trimmedId} pa jwenn nan baz done`);
      } catch (e) {
        console.warn(`Erè rechèch plan: ${e.message}`);
      }
    }
  }

  // ✅ Devise ak lang
  const cleanCurrency = ['HTG', 'USD'].includes(defaultCurrency) ? defaultCurrency : 'HTG';
  const cleanLanguage  = ['ht', 'fr', 'en'].includes(defaultLanguage)  ? defaultLanguage  : 'ht';

  const tenant = await prisma.tenant.create({
    data: {
      name:            name.trim(),
      slug:            cleanSlug,
      email:           email   || null,
      phone:           phone   || null,
      address:         address || null,
      planId:          cleanPlanId,   // null si pa chwazi oswa pa jwenn
      defaultCurrency: cleanCurrency,
      defaultLanguage: cleanLanguage,
      status:          'active',
      subscriptionEndsAt
      // ✅ Pa mete createdBy — SuperAdmin relation pa toujou konfigire
    }
  });

  // ✅ Kreye itilizatè admin si done yo bay
  if (adminEmail && adminPassword) {
    // Verifye si email la pa deja itilize nan menm tenant an
    const emailExists = await prisma.user.findFirst({
      where: { email: adminEmail.toLowerCase().trim(), tenantId: tenant.id }
    });
    if (!emailExists) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          tenantId:     tenant.id,
          fullName:     (adminName || 'Administrateur').trim(),
          email:        adminEmail.toLowerCase().trim(),
          passwordHash: hash,
          role:         'admin',
          isActive:     true
        }
      });
    }
  }

  // ✅ Kreye sekans dokiman (DEV + FAC) — upsert pou evite erè doublòn
  try {
    await Promise.all([
      prisma.documentSequence.upsert({
        where:  { tenantId_documentType: { tenantId: tenant.id, documentType: 'quote' } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'quote',   prefix: 'DEV', currentYear: new Date().getFullYear() }
      }),
      prisma.documentSequence.upsert({
        where:  { tenantId_documentType: { tenantId: tenant.id, documentType: 'invoice' } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'invoice', prefix: 'FAC', currentYear: new Date().getFullYear() }
      })
    ]);
  } catch (seqErr) {
    // Pa bloke si sekans deja egziste
    console.warn('Sekans dokiman:', seqErr.message);
  }

  res.status(201).json({ success: true, tenant, message: `Entreprise "${tenant.name}" kreye avèk siksè.` });
}));

// ── PATCH /api/v1/admin/tenants/:id/status
router.patch('/tenants/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['active', 'suspended', 'pending', 'cancelled'];
  if (!valid.includes(status))
    return res.status(400).json({ success: false, message: 'Statut pa valid.' });

  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: { status } });
  const msg = status === 'active' ? 'aktive' : status === 'suspended' ? 'suspann' : status;
  res.json({ success: true, tenant, message: `Entreprise ${msg}.` });
}));

// ── POST /api/v1/admin/tenants/:id/renew
// ✅ Renouvle abònman pou 1 mwa (oswa plis) apre peman
router.post('/tenants/:id/renew', asyncHandler(async (req, res) => {
  const { months = 1 } = req.body;
  const numMonths = Math.max(1, Math.min(36, Number(months)));

  const existing = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, subscriptionEndsAt: true, status: true }
  });
  if (!existing)
    return res.status(404).json({ success: false, message: 'Entreprise pa jwenn.' });

  // ✅ Si abònman ekspire (oswa pa gen dat), pati de kounye a
  // Si abònman poko ekspire, ajoute mwa yo sou dat ki deja la
  const baseDate = (existing.subscriptionEndsAt && new Date(existing.subscriptionEndsAt) > new Date())
    ? new Date(existing.subscriptionEndsAt)
    : new Date();

  baseDate.setMonth(baseDate.getMonth() + numMonths);

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: {
      subscriptionEndsAt: baseDate,
      status: 'active'   // ✅ Reaktive si te bloke
    },
    select: { id: true, name: true, subscriptionEndsAt: true, status: true }
  });

  res.json({
    success: true,
    tenant,
    message: `Abònman ${existing.name} renouvle pou ${numMonths} mwa. Nouvo dat: ${baseDate.toLocaleDateString('fr-FR')}.`
  });
}));

// ── GET /api/v1/admin/plans
router.get('/plans', asyncHandler(async (req, res) => {
  let plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' }
  });

  // ✅ Si tab la vid, kreye plans defo otomatikman
  if (plans.length === 0) {
    await prisma.subscriptionPlan.createMany({
      data: [
        { name: 'Basik',      nameFr: 'Basique',      maxUsers: 3,   maxProducts: 200,  priceMonthly: 1500, features: JSON.stringify(['Fakti', 'Devis', 'Kliyan']) },
        { name: 'Estanda',    nameFr: 'Standard',     maxUsers: 10,  maxProducts: 1000, priceMonthly: 3500, features: JSON.stringify(['Fakti', 'Devis', 'Kliyan', 'Rapò', 'Stòk']) },
        { name: 'Biznis',     nameFr: 'Business',     maxUsers: 25,  maxProducts: 5000, priceMonthly: 7500, features: JSON.stringify(['Tout fonksyon', 'Rapò avanse', 'Sipò priorite']) },
        { name: 'Antrepriz',  nameFr: 'Entreprise',   maxUsers: 100, maxProducts: 99999,priceMonthly: 15000,features: JSON.stringify(['Tout fonksyon', 'Itilizatè entelimite', 'Sipò dedye']) },
      ]
    });
    plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' }
    });
  }

  res.json({ success: true, plans });
}));

// ── GET /api/v1/admin/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [totalTenants, activeTenants, pendingTenants, totalInvoices, totalRevenue] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'active' } }),
    prisma.tenant.count({ where: { status: 'pending' } }),
    prisma.invoice.count(),
    prisma.invoice.aggregate({
      where: { status: 'paid' },
      _sum: { totalHtg: true, totalUsd: true }
    })
  ]);

  res.json({
    success: true,
    stats: { totalTenants, activeTenants, pendingTenants, totalInvoices, totalRevenue: totalRevenue._sum }
  });
}));

// ── GET /api/v1/admin/expiring-soon
// ✅ Jwenn tenants ki gen abònman ki ap ekspire nan 5 jou oswa mwens
router.get('/expiring-soon', asyncHandler(async (req, res) => {
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const expiring = await prisma.tenant.findMany({
    where: {
      status: 'active',
      subscriptionEndsAt: {
        lte: fiveDaysFromNow,      // Ekspire nan 5 jou oswa mwens
        gte: new Date()             // Men pa deja ekspire
      }
    },
    select: {
      id: true, name: true, email: true, subscriptionEndsAt: true,
      plan: { select: { name: true } }
    },
    orderBy: { subscriptionEndsAt: 'asc' }
  });

  res.json({ success: true, expiring, count: expiring.length });
}));

module.exports = router;