// src/modules/tenants/tenant.routes.js — Paramètres entreprise (Tenant)
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const prisma  = require('../../config/prisma');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Config upload logo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `tenant-${req.tenant.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Sèlman JPEG, PNG, WebP ak SVG aksepte.'));
  }
});

// ── Helper: konvèti logoUrl relatif → absoli
const getAbsoluteLogoUrl = (logoUrl) => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl; // deja absoli
  const BASE = process.env.API_URL || 'https://plusgroup-backend.onrender.com';
  return `${BASE}${logoUrl}`;
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
      exchangeRate: true, taxRate: true,
      receiptSize: true,
      printerConnection: true, // ✅ Ajoute
      status: true, subscriptionEndsAt: true,
      plan: { select: { name: true, maxUsers: true, maxProducts: true, features: true } }
    }
  });

  // ✅ Korije logoUrl pou retounen URL absoli
  res.json({
    success: true,
    tenant: {
      ...tenant,
      logoUrl: getAbsoluteLogoUrl(tenant.logoUrl)
    }
  });
}));

// ── PUT /api/v1/tenant/settings
router.put('/settings', authorize('admin'), asyncHandler(async (req, res) => {
  const {
    name, address, phone, email, website,
    defaultCurrency, defaultLanguage,
    exchangeRate, taxRate, primaryColor,
    receiptSize, printerConnection  // ✅ Ajoute printerConnection
  } = req.body;

  const tenant = await prisma.tenant.update({
    where: { id: req.tenant.id },
    data: {
      name, address, phone, email, website, primaryColor,
      defaultCurrency, defaultLanguage,
      exchangeRate:      exchangeRate      ? Number(exchangeRate)    : undefined,
      taxRate:           taxRate           ? Number(taxRate)         : undefined,
      receiptSize:       receiptSize       ? String(receiptSize)     : undefined,
      printerConnection: printerConnection ? String(printerConnection) : undefined, // ✅
    },
    select: {
      id: true, name: true, defaultCurrency: true, defaultLanguage: true,
      exchangeRate: true, taxRate: true, primaryColor: true,
      receiptSize: true, printerConnection: true  // ✅
    }
  });
  res.json({ success: true, tenant, message: 'Paramèt ajou avèk siksè.' });
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

// ── POST /api/v1/tenant/logo
router.post('/logo', authorize('admin'), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'Fichye logo obligatwa.' });

  const logoUrl = `/uploads/logos/${req.file.filename}`;
  await prisma.tenant.update({ where: { id: req.tenant.id }, data: { logoUrl } });

  // ✅ Retounen URL absoli pou frontend ka afiche logo imedyatman
  const absoluteLogoUrl = getAbsoluteLogoUrl(logoUrl);
  res.json({ success: true, logoUrl: absoluteLogoUrl, message: 'Logo chanje avèk siksè.' });
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
    where: { tenantId_documentType: { tenantId: req.tenant.id, documentType: type } },
    create: {
      tenantId: req.tenant.id, documentType: type,
      prefix, currentYear: new Date().getFullYear()
    },
    update: { prefix }
  });
  res.json({ success: true, sequence: seq, message: 'Prefix ajou.' });
}));

module.exports = router;
