// backend/src/modules/admin/tenant-pages.controller.js
const prisma = require('../../config/prisma')

const ALL_PAGES = [
  'dashboard', 'products', 'clients', 'quotes', 'invoices',
  'stock', 'reports', 'branches', 'settings', 'users',
  'kane', 'kane-epay', 'sabotay', 'mobilpay'
]

const DEFAULT_PAGES = ALL_PAGES.reduce((acc, p) => ({ ...acc, [p]: true }), {})

// GET /api/admin/tenants/:id/pages
exports.getPages = async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, allowedPages: true }
    })
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

    // Merge ak default pou asire tout paj yo prezan
    const pages = { ...DEFAULT_PAGES, ...(tenant.allowedPages || {}) }
    res.json({ success: true, pages })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

// PATCH /api/admin/tenants/:id/pages
exports.updatePages = async (req, res) => {
  try {
    const { pages } = req.body
    if (!pages || typeof pages !== 'object') {
      return res.status(400).json({ success: false, message: 'Objè pages obligatwa.' })
    }

    // Filtre sèlman paj ki valid yo
    const sanitized = {}
    ALL_PAGES.forEach(p => {
      sanitized[p] = pages[p] !== false // default true si pa spesifye
    })

    // Dashboard toujou ON — pa ka bloke l
    sanitized['dashboard'] = true

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { allowedPages: sanitized },
      select: { id: true, name: true, allowedPages: true }
    })

    res.json({ success: true, pages: tenant.allowedPages })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

exports.ALL_PAGES = ALL_PAGES
exports.DEFAULT_PAGES = DEFAULT_PAGES
