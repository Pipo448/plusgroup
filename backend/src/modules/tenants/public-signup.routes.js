// src/modules/tenants/public-signup.routes.js
const express = require('express')
const router  = express.Router()
const prisma  = require('../../config/prisma')
const { asyncHandler } = require('../../middleware/errorHandler')
const { createPendingTenant } = require('./tenant-signup.service')

// ── GET /api/v1/public/plans — lis plan aktif yo (piblik, san auth,
// pou fòm enskripsyon otonòm lan ka montre chwa plan)
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
    select: { id: true, name: true, priceMonthly: true, maxUsers: true, maxProducts: true, maxBranches: true, features: true }
  })
  res.json({ success: true, plans })
}))

// ── POST /api/v1/public/tenant-signup — Antrepriz enskri tèt li
// Piblik (san otantifikasyon), men mande yon kòd pwomo ajan valid.
router.post('/tenant-signup', asyncHandler(async (req, res) => {
  const tenant = await createPendingTenant(req.body, 'self')
  res.status(201).json({
    success: true,
    message: `Enskripsyon "${tenant.name}" resevwa! Esè yon mwa a kòmanse kounye a. Ekip Plus Group ap konfime kont ou a talè.`,
    tenantId: tenant.id,
  })
}))

module.exports = router

// ── Ajoute nan index.js ou a ─────────────────────────────────
// const publicSignupRoutes = require('./modules/tenants/public-signup.routes')
// app.use('/api/v1/public', publicSignupRoutes)
