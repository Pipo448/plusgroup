// src/modules/admin/tenant-pages.routes.js — Aksè paj yo pa tenant (Super Admin)
// Monte nan index.js ANVAN adminRoutes:
//   app.use(`${API}/admin/tenants/:id/pages`, tenantPagesRoutes)
// Se WOUT SA A (pa sa ki nan admin.routes.js) ki reyèlman sove bouton paj yo.
//
// ✅ KORIJE — 'restaurant-portal' te manke nan lis la, kidonk chak fwa Super
// Admin lan te aktive « Pòtal kliyan Restoran », backend lan te jete kle a
// e li te sove l kòm false. Fichye sa a endepandan (li pa bezwen okenn
// controller): menm lojik ak admin.routes.js, ak lis paj konplè a.
const express = require('express')
const router  = express.Router({ mergeParams: true }) // pou jwenn req.params.id ki nan chemen index.js la
const { superAdminAuth } = require('../../middleware/auth')
const { asyncHandler } = require('../../middleware/errorHandler')
const prisma  = require('../../config/prisma')

// Dwe rete SENKRONIZE ak ALL_PAGES nan admin.routes.js ak tenant-signup.service.js
const ALL_PAGES = [
  'dashboard','products','clients','quotes','direct-quotes','invoices','stock','reports',
  'branches','settings','users','kane','kane-epay','pre','sabotay','mobilpay',
  'hotel','restaurant','restaurant-portal','kes-sesyon','estok-kontwol','dry','employees','expenses','gym','founise','klinik',
]

// Tout paj kòmanse fèmen (eksepte dashboard) — Super Admin ouvri sa kliyan an bezwen
const DEFAULT_PAGES = ALL_PAGES.reduce((acc, p) => ({ ...acc, [p]: p === 'dashboard' }), {})

const parsePages = (raw) => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return {} }
}

async function logAudit(tenantId, action, targetName, details = {}) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO admin_audit_logs (tenant_id, action, target_name, details)
       VALUES (CAST($1 AS uuid), $2, $3, CAST($4 AS jsonb))`,
      tenantId, action, targetName || null, JSON.stringify(details),
    )
  } catch (e) { console.warn('[Audit pages]', e.message) }
}

router.use(superAdminAuth)

// ⚠️ KORIJE — itilize Prisma ORM (champ `allowedPages`) olye SQL brit sou `allowed_pages`:
// non kolòn reyèl la ka diferan nan baz done a (sa te bay « Erè trete done » 500).
async function loadTenant(id) {
  try {
    return await prisma.tenant.findUnique({ where: { id }, select: { id: true, name: true, allowedPages: true } })
  } catch (e) {
    // id ki pa yon UUID valid → tenant pa jwenn
    if (/uuid|invalid|Inconsistent/i.test(e.message)) return null
    throw e
  }
}

// ── GET /api/v1/admin/tenants/:id/pages
router.get('/', asyncHandler(async (req, res) => {
  try {
    const t = await loadTenant(req.params.id)
    if (!t) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })
    // dashboard toujou ON; paj ki pa janm sove yo parèt fèmen
    const pages = { ...DEFAULT_PAGES, ...parsePages(t.allowedPages), dashboard: true }
    res.json({ success: true, pages })
  } catch (e) {
    console.error('[tenant-pages GET]', e)
    res.status(500).json({ success: false, message: `Paj yo pa ka chaje: ${e.message}` })
  }
}))

// ── PATCH /api/v1/admin/tenants/:id/pages
router.patch('/', asyncHandler(async (req, res) => {
  const { pages } = req.body || {}
  if (!pages || typeof pages !== 'object')
    return res.status(400).json({ success: false, message: 'pages obligatwa (obje JSON).' })

  try {
    const t = await loadTenant(req.params.id)
    if (!t) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

    // Kenbe sèlman paj ki nan ALL_PAGES; dashboard toujou true
    const sanitized = {}
    ALL_PAGES.forEach((key) => { sanitized[key] = key === 'dashboard' ? true : pages[key] === true })
    // Pa pèdi lòt kle ki te deja sove yo — sèlman ALL_PAGES chanje
    const merged = { ...parsePages(t.allowedPages), ...sanitized }

    // Si champ lan se String nan schema a (pa Json), sove l kòm tèks JSON
    const asString = typeof t.allowedPages === 'string'
    await prisma.tenant.update({
      where: { id: t.id },
      data: { allowedPages: asString ? JSON.stringify(merged) : merged },
    })

    await logAudit(t.id, 'PAGE_ACCESS_UPDATED', t.name, {
      enabled: Object.values(sanitized).filter(Boolean).length,
      disabled: Object.values(sanitized).filter((v) => !v).length,
      restaurantPortal: sanitized['restaurant-portal'],
    })

    res.json({ success: true, pages: merged, message: 'Aksè paj yo ajou.' })
  } catch (e) {
    console.error('[tenant-pages PATCH]', e)
    res.status(500).json({ success: false, message: `Paj yo pa sove: ${e.message}` })
  }
}))

module.exports = router