// src/modules/branding/branding.routes.js
// Monte nan index.js:  app.use(`${API}/branding`, brandingRoutes)
//   GET    /api/v1/branding   → koulè tenant lan (tout itilizatè konekte)
//   PUT    /api/v1/branding   → anrejistre (admin sèlman)
//   DELETE /api/v1/branding   → retounen sou koulè PLUS GROUP (admin sèlman)
const express = require('express')
const router = express.Router()
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth')
const { asyncHandler } = require('../../middleware/errorHandler')
const svc = require('./branding.service')

router.use(identifyTenant, authenticate)

const tenantIdOf = (req) => req.tenant?.id || req.user?.tenantId

router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, branding: await svc.getBranding(tenantIdOf(req)) })
}))

router.put('/', authorize('admin'), asyncHandler(async (req, res) => {
  const branding = await svc.saveBranding(tenantIdOf(req), req.user?.id, req.body || {})
  try { require('../restaurant/restaurant.public.service').invalidatePortalCache(tenantIdOf(req)) } catch { /* modil restoran pa la */ }
  res.json({ success: true, branding, message: 'Koulè yo anrejistre.' })
}))

router.delete('/', authorize('admin'), asyncHandler(async (req, res) => {
  await svc.resetBranding(tenantIdOf(req))
  res.json({ success: true, branding: null, message: 'Koulè PLUS GROUP yo retounen.' })
}))

module.exports = router