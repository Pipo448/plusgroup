// backend/src/modules/admin/tenant-pages.controller.js
const prisma = require('../../config/prisma')

const ALL_PAGES = [
  'dashboard', 'products', 'clients', 'quotes', 'invoices',
  'stock', 'reports', 'branches', 'settings', 'users',
  'kane', 'kane-epay', 'sabotay', 'mobilpay'
]

const DEFAULT_PAGES = ALL_PAGES.reduce((acc, p) => ({ ...acc, [p]: true }), {})

// GET /api/v1/admin/tenants/:id/pages
exports.getPages = async (req, res) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT id, name, allowed_pages
      FROM tenants
      WHERE id = ${req.params.id}
      LIMIT 1
    `
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })
    }
    const tenant = result[0]
    const pages = { ...DEFAULT_PAGES, ...(tenant.allowed_pages || {}) }
    res.json({ success: true, pages })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// PATCH /api/v1/admin/tenants/:id/pages
exports.updatePages = async (req, res) => {
  try {
    const { pages } = req.body
    if (!pages || typeof pages !== 'object') {
      return res.status(400).json({ success: false, message: 'Objè pages obligatwa.' })
    }

    // Filtre sèlman paj valid + dashboard toujou ON
    const sanitized = {}
    ALL_PAGES.forEach(p => {
      sanitized[p] = pages[p] !== false
    })
    sanitized['dashboard'] = true

    // ✅ Sèvi ak $executeRaw — pa bezwen champ nan schema Prisma
    await prisma.$executeRaw`
      UPDATE tenants
      SET allowed_pages = ${JSON.stringify(sanitized)}::jsonb
      WHERE id = ${req.params.id}
    `

    res.json({ success: true, pages: sanitized })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.ALL_PAGES   = ALL_PAGES
exports.DEFAULT_PAGES = DEFAULT_PAGES
