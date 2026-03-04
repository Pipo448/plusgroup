// backend/src/modules/admin/tenant-pages.routes.js
const express = require('express')
const router  = express.Router({ mergeParams: true })
const ctrl    = require('./tenant-pages.controller')
const { superAdminAuth } = require('../../middleware/auth')

router.use(superAdminAuth)

router.get('/',  ctrl.getPages)
router.patch('/', ctrl.updatePages)

module.exports = router

// ── Ajoute nan index.js ou a ─────────────────────────────────
// const tenantPagesRoutes = require('./modules/admin/tenant-pages.routes')
// app.use('/api/admin/tenants/:id/pages', tenantPagesRoutes)
