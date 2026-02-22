// src/middleware/auth.js
// ============================================================
// PLUS GROUP — Middleware Auth & Multi-Tenant
// ============================================================

const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { asyncHandler } = require('./errorHandler');

// ── 1. Identifier le tenant (depuis slug header ou sous-domaine)
const identifyTenant = asyncHandler(async (req, res, next) => {
  let slug = null;

  // Méthode 1: Header X-Tenant-Slug (SPA / mobile)
  if (req.headers['x-tenant-slug']) {
    slug = req.headers['x-tenant-slug'];
  }
  // Méthode 2: Sous-domaine (entreprise1.app.com)
  else if (req.hostname && req.hostname !== 'localhost') {
    const parts = req.hostname.split('.');
    if (parts.length >= 3) slug = parts[0]; // entreprise1
  }

  if (!slug) {
    return res.status(400).json({
      success: false,
      message: 'Tenant pa idantifye. Voye X-Tenant-Slug header.'
    });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, status: true,
      logoUrl: true, primaryColor: true,
      defaultCurrency: true, defaultLanguage: true,
      exchangeRate: true, taxRate: true, receiptSize: true,
      subscriptionEndsAt: true, planId: true,
      plan: { select: { maxUsers: true, maxProducts: true, features: true } }
    }
  });

  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Entreprise pa jwenn.'
    });
  }

  if (tenant.status !== 'active') {
    const messages = {
      pending:   'Kont entreprise a ap tann aktivasyon.',
      suspended: 'Kont entreprise a suspann. Kontakte sipò.',
      cancelled: 'Kont entreprise a kanselé.'
    };
    return res.status(403).json({
      success: false,
      message: messages[tenant.status] || 'Kont pa aktif.'
    });
  }

  // ✅ Abònman ekspire — bloke SÈLMAN si se pa wout login/auth
  // Login toujou aksesib pou itilizatè ka wè mesaj ekspirasyon
  const isAuthRoute = req.path === '/login' || req.path === '/forgot-password' || req.path === '/reset-password';
  if (!isAuthRoute && tenant.subscriptionEndsAt && new Date() > new Date(tenant.subscriptionEndsAt)) {
    return res.status(402).json({
      success: false,
      message: 'Abònman ekspire. Renouvle pou kontinye.',
      expired: true
    });
  }

  req.tenant = tenant;
  next();
});

// ── 2. Authentifier l'utilisateur (JWT)
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token obligatwa. Konekte ou dabò.'
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError'
        ? 'Sesyon ekspire. Konekte ankò.'
        : 'Token pa valid.'
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: decoded.userId,
      tenantId: req.tenant.id,  // ← isolation tenant stricte
      isActive: true
    },
    select: {
      id: true, tenantId: true, fullName: true,
      email: true, role: true, permissions: true,
      preferredLang: true, avatarUrl: true
    }
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Itilizatè pa jwenn oswa pa aktif.'
    });
  }

  req.user = user;
  next();
});

// ── 3. Autoriser par rôle(s)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non otantifye.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Aksè refize. Rôl ${req.user.role} pa gen pèmisyon sa a.`
    });
  }
  next();
};

// ── 4. Super Admin Auth
const superAdminAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token super admin obligatwa.' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token super admin pa valid.' });
  }

  const admin = await prisma.superAdmin.findUnique({
    where: { id: decoded.adminId, isActive: true },
    select: { id: true, name: true, email: true }
  });

  if (!admin) {
    return res.status(401).json({ success: false, message: 'Super admin pa jwenn.' });
  }

  req.superAdmin = admin;
  next();
});

// ── 5. Helper: vérifie permission spécifique (granulaire)
const hasPermission = (permission) => (req, res, next) => {
  const perms = req.user?.permissions || {};
  if (req.user?.role === 'admin' || perms[permission] === true) return next();
  return res.status(403).json({
    success: false,
    message: `Pèmisyon "${permission}" manke.`
  });
};

module.exports = {
  identifyTenant,
  authenticate,
  authorize,
  superAdminAuth,
  hasPermission
};
