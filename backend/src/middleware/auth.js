// src/middleware/auth.js
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { asyncHandler } = require('./errorHandler');

const identifyTenant = asyncHandler(async (req, res, next) => {
  let slug = null;

  if (req.headers['x-tenant-slug']) {
    slug = req.headers['x-tenant-slug'];
  } else if (req.hostname && req.hostname !== 'localhost') {
    const parts = req.hostname.split('.');
    if (parts.length >= 3) slug = parts[0];
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
      phone: true,
      address: true,
      exchangeRate: true,
      exchangeRates: true,
      visibleCurrencies: true,
      showExchangeRate: true,
      taxRate: true,
      receiptSize: true,
      subscriptionEndsAt: true,
      planId: true,
      plan: {
        select: {
          id: true, name: true,
          maxUsers: true, maxProducts: true, features: true
        }
      }
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
      tenantId: req.tenant.id,
      isActive: true
    },
    select: {
      id: true, tenantId: true, fullName: true,
      email: true, role: true, permissions: true,
      preferredLang: true, avatarUrl: true,
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

const hasPermission = (permission) => (req, res, next) => {
  const perms = req.user?.permissions || {};
  if (req.user?.role === 'admin' || perms[permission] === true) return next();
  return res.status(403).json({
    success: false,
    message: `Pèmisyon "${permission}" manke.`
  });
};

// ✅ NOUVO — Verifye si tenant an sou plan Antepriz
const requireEnterprise = (req, res, next) => {
  const planName = req.tenant?.plan?.name || ''
  if (planName !== 'Antepriz') {
    return res.status(403).json({
      success: false,
      message: 'Fonksyon sa rezerve pou plan Antepriz sèlman. Monte plan ou pou gen aksè.',
      requiredPlan: 'Antepriz',
      currentPlan: planName || 'Okenn'
    })
  }
  next()
}

module.exports = {
  identifyTenant,
  authenticate,
  authorize,
  superAdminAuth,
  hasPermission,
  requireEnterprise,   // ✅ AJOUTE
};
