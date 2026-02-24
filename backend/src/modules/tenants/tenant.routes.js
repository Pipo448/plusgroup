// src/modules/tenants/tenant.routes.js — Paramètres entreprise (Tenant)
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma  = require('../../config/prisma');
const multer  = require('multer');

// ── ✅ FIX: Sove logo kòm base64 nan DB — pa nan filesystem
// Render efase fichye upload yo apre chak deploy
// Base64 nan DB pa janm efase, pa gen pwoblèm CORS non plis
const upload = multer({
  storage: multer.memoryStorage(), // Nan memwa — pa nan disk
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max (base64 ap ~2.7MB nan DB)
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Sèlman JPEG, PNG, WebP ak SVG aksepte.'));
  }
});

// ── Helper: parse JSON fields ki ka vini kòm string oswa objè
const parseJsonField = (field, fallback = null) => {
  if (!field) return fallback;
  if (typeof field === 'object') return field;
  try { return JSON.parse(field); } catch { return fallback; }
};

router.use(identifyTenant, authenticate);

// ── GET /api/v1/tenant/settings
router.get('/settings', asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.tenant.id },
    select: {
      id: true, name: true, slug: true, logoUrl: true, primaryColor: true,
      address: true, phone: true, email: true, website: true,
      defaultCurrency: true, defaultLanguage: true,
      exchangeRate:       true,
      exchangeRates:      true,
      visibleCurrencies:  true,
      showExchangeRate:   true,
      taxRate: true,
      receiptSize: true,
      printerConnection: true,
      status: true, subscriptionEndsAt: true,
      plan: { select: { name: true, maxUsers: true, maxProducts: true, features: true } }
    }
  });

  const exchangeRates     = parseJsonField(tenant.exchangeRates, {});
  const visibleCurrencies = parseJsonField(tenant.visibleCurrencies, ['USD']);

  res.json({
    success: true,
    tenant: {
      ...tenant,
      // ✅ logoUrl se base64 dirèk — pa bezwen konvèsyon
      logoUrl: tenant.logoUrl || null,
      exchangeRates,
      visibleCurrencies,
      showExchangeRate: tenant.showExchangeRate ?? false,
    }
  });
}));

// ── PUT /api/v1/tenant/settings
router.put('/settings', authorize('admin'), asyncHandler(async (req, res) => {
  const {
    name, address, phone, email, website,
    defaultCurrency, defaultLanguage,
    exchangeRate, taxRate, primaryColor,
    receiptSize, printerConnection,
    exchangeRates,
    visibleCurrencies,
    showExchangeRate,
  } = req.body;

  const tenant = await prisma.tenant.update({
    where: { id: req.tenant.id },
    data: {
      name, address, phone, email, website, primaryColor,
      defaultCurrency, defaultLanguage,
      exchangeRate:      exchangeRate      ? Number(exchangeRate)      : undefined,
      taxRate:           taxRate           ? Number(taxRate)           : undefined,
      receiptSize:       receiptSize       ? String(receiptSize)       : undefined,
      printerConnection: printerConnection ? String(printerConnection) : undefined,
      exchangeRates:     exchangeRates     != null ? JSON.stringify(exchangeRates)     : undefined,
      visibleCurrencies: visibleCurrencies != null ? JSON.stringify(visibleCurrencies) : undefined,
      showExchangeRate:  showExchangeRate  != null ? Boolean(showExchangeRate)         : undefined,
    },
    select: {
      id: true, name: true, defaultCurrency: true, defaultLanguage: true,
      exchangeRate: true, taxRate: true, primaryColor: true,
      receiptSize: true, printerConnection: true,
      exchangeRates: true, visibleCurrencies: true, showExchangeRate: true,
    }
  });

  res.json({
    success: true,
    tenant: {
      ...tenant,
      exchangeRates:     parseJsonField(tenant.exchangeRates, {}),
      visibleCurrencies: parseJsonField(tenant.visibleCurrencies, ['USD']),
    },
    message: 'Paramèt ajou avèk siksè.'
  });
}));

// ── PATCH /api/v1/tenant/exchange-rate
router.patch('/exchange-rate', authorize('admin'), asyncHandler(async (req, res) => {
  const { exchangeRate } = req.body;
  if (!exchangeRate || isNaN(exchangeRate))
    return res.status(400).json({ success: false, message: 'Taux chanj pa valid.' });

  await prisma.tenant.update({
    where: { id: req.tenant.id },
    data: { exchangeRate: Number(exchangeRate) }
  });
  res.json({ success: true, exchangeRate: Number(exchangeRate), message: 'Taux chanj ajou.' });
}));

// ── PATCH /api/v1/tenant/exchange-rates
router.patch('/exchange-rates', authorize('admin'), asyncHandler(async (req, res) => {
  const { exchangeRates, visibleCurrencies, showExchangeRate } = req.body;

  if (!exchangeRates || typeof exchangeRates !== 'object')
    return res.status(400).json({ success: false, message: 'exchangeRates dwe se yon objè valid.' });

  for (const [currency, rate] of Object.entries(exchangeRates)) {
    if (isNaN(rate) || Number(rate) <= 0)
      return res.status(400).json({ success: false, message: `Taux chanj pou ${currency} pa valid.` });
  }

  const updateData = { exchangeRates: JSON.stringify(exchangeRates) };
  if (visibleCurrencies != null) updateData.visibleCurrencies = JSON.stringify(visibleCurrencies);
  if (showExchangeRate  != null) updateData.showExchangeRate  = Boolean(showExchangeRate);

  await prisma.tenant.update({ where: { id: req.tenant.id }, data: updateData });

  res.json({
    success: true,
    exchangeRates,
    visibleCurrencies: visibleCurrencies ?? undefined,
    showExchangeRate:  showExchangeRate  ?? undefined,
    message: 'Taux chanj ajou pou tout devise.'
  });
}));

// ── POST /api/v1/tenant/logo
// ✅ FIX: Konvèti imaj an base64 epi sove nan DB — pa nan filesystem
router.post('/logo', authorize('admin'), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'Fichye logo obligatwa.' });

  // Konvèti buffer an base64 data URL
  const mimeType  = req.file.mimetype;
  const base64    = req.file.buffer.toString('base64');
  const logoUrl   = `data:${mimeType};base64,${base64}`;

  // Sove base64 nan DB
  await prisma.tenant.update({
    where: { id: req.tenant.id },
    data:  { logoUrl }
  });

  res.json({
    success: true,
    logoUrl,  // Retounen base64 dirèk — frontend ka itilize li tousuit
    message: 'Logo chanje avèk siksè.'
  });
}));

// ── GET /api/v1/tenant/sequences
router.get('/sequences', authorize('admin'), asyncHandler(async (req, res) => {
  const sequences = await prisma.documentSequence.findMany({
    where: { tenantId: req.tenant.id }
  });
  res.json({ success: true, sequences });
}));

// ── PUT /api/v1/tenant/sequences/:type
router.put('/sequences/:type', authorize('admin'), asyncHandler(async (req, res) => {
  const { prefix } = req.body;
  const type = req.params.type;

  if (!['quote', 'invoice'].includes(type))
    return res.status(400).json({ success: false, message: 'Type dokiman pa valid.' });

  const seq = await prisma.documentSequence.upsert({
    where:  { tenantId_documentType: { tenantId: req.tenant.id, documentType: type } },
    create: { tenantId: req.tenant.id, documentType: type, prefix, currentYear: new Date().getFullYear() },
    update: { prefix }
  });
  res.json({ success: true, sequence: seq, message: 'Prefix ajou.' });
}));

module.exports = router;
