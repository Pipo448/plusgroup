// src/modules/internet/internet.routes.js
const express = require('express');
const router  = express.Router();
const {
  clientAuth,
  loginClient,
  getStatus,
  getClientPayments,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  renewSubscription,
  getMikrotikConfig,
  saveMikrotikConfig,
  testMikrotikConfig,
} = require('./internet.controller');

// ── Middleware: jwenn tenant_id depi token admin oswa slug ──
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function adminTenantMiddleware(req, res, next) {
  try {
    const slug = req.headers['x-tenant-slug']
    if (slug) {
      const tenant = await prisma.tenants.findFirst({ where: { slug } })
      if (tenant) { req.tenantId = tenant.id; return next() }
    }
    // Si pa gen slug, eseye jwenn depi token normal la
    const token = req.headers.authorization?.split(' ')[1]
    if (token) {
      const jwt = require('jsonwebtoken')
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.tenantId = decoded.tenantId || decoded.tenant_id
        return next()
      } catch {}
    }
    return res.status(400).json({ error: 'Tenant pa idantifye' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// ROUTES PIBLIK — App kliyan (internet.plusgroupe.com)
// ══════════════════════════════════════════════════════════
router.post('/login', loginClient);

// ══════════════════════════════════════════════════════════
// ROUTES PRIVE — App kliyan otantifye
// ══════════════════════════════════════════════════════════
router.get('/status',   clientAuth, getStatus);
router.get('/payments', clientAuth, getClientPayments);

// ══════════════════════════════════════════════════════════
// ROUTES ADMIN — Jere kliyan (Super Admin Panel)
// ══════════════════════════════════════════════════════════
router.get('/clients',        adminTenantMiddleware, getClients);
router.post('/clients',       adminTenantMiddleware, createClient);
router.put('/clients/:id',    adminTenantMiddleware, updateClient);
router.delete('/clients/:id', adminTenantMiddleware, deleteClient);

// Renouvèlman abònman
router.post('/renew', adminTenantMiddleware, renewSubscription);

// ══════════════════════════════════════════════════════════
// ROUTES MIKROTIK CONFIG
// ══════════════════════════════════════════════════════════
router.get('/mikrotik-config',        adminTenantMiddleware, getMikrotikConfig);
router.post('/mikrotik-config',       adminTenantMiddleware, saveMikrotikConfig);
router.post('/mikrotik-config/test',  adminTenantMiddleware, testMikrotikConfig);

module.exports = router;