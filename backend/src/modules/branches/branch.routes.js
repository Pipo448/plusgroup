// src/modules/branches/branch.routes.js
const express = require('express')
const router  = express.Router()
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth')
const { asyncHandler } = require('../../middleware/errorHandler')
const prisma  = require('../../config/prisma')

router.use(identifyTenant, authenticate)

// ⚠️ NOUVO — Sèlman Super Admin ki ka toggle branch
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Sèlman Super Admin ki ka bloke oswa debloke yon branch.'
    })
  }
  next()
})

const checkBranchAccess = asyncHandler(async (req, res, next) => {
  const branchId = req.params.branchId || req.params.id || req.body.branchId
  if (!branchId) return next()

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: req.tenant.id }
  })
  if (!branch) return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })

  if (req.user.role === 'admin') { req.branch = branch; return next() }

  const branchUser = await prisma.branchUser.findUnique({
    where: { branchId_userId: { branchId: branch.id, userId: req.user.id } }
  })
  if (!branchUser) return res.status(403).json({ success: false, message: 'Ou pa gen aksè nan branch sa a.' })

  if (!branch.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Branch sa a bloke. Kontakte administratè pou debloke.',
      branchLocked: true
    })
  }

  req.branch = branch
  req.branchUser = branchUser
  next()
})

router.get('/', asyncHandler(async (req, res) => {
  let branches
  if (req.user.role === 'admin') {
    branches = await prisma.branch.findMany({
      where: { tenantId: req.tenant.id },
      include: { _count: { select: { branchUsers: true, products: true, invoices: true, quotes: true } } },
      orderBy: { createdAt: 'asc' }
    })
  } else {
    const myBranchUsers = await prisma.branchUser.findMany({
      where: { userId: req.user.id },
      include: { branch: { include: { _count: { select: { branchUsers: true, products: true } } } } }
    })
    branches = myBranchUsers
      .filter(bu => bu.branch.isActive)
      .map(bu => ({ ...bu.branch, myRole: bu.role, isMyAdmin: bu.isAdmin }))
  }
  res.json({ success: true, branches })
}))

router.get('/:id', checkBranchAccess, asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
    include: {
      branchUsers: { include: { user: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true, isActive: true } } } },
      _count: { select: { products: true, clients: true, invoices: true, quotes: true } }
    }
  })
  res.json({ success: true, branch })
}))

router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const { name, slug, description, address, phone, email } = req.body
  if (!name || !slug) return res.status(400).json({ success: false, message: 'Non ak slug obligatwa.' })

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
  const maxBranches = req.tenant.plan?.maxBranches || 1
  const currentCount = await prisma.branch.count({ where: { tenantId: req.tenant.id } })

  if (currentCount >= maxBranches) {
    return res.status(403).json({ success: false, message: `Plan ou a limite nan ${maxBranches} branch.`, limitReached: true, currentCount, maxBranches })
  }

  const existing = await prisma.branch.findFirst({ where: { tenantId: req.tenant.id, slug: cleanSlug } })
  if (existing) return res.status(409).json({ success: false, message: `Slug "${cleanSlug}" deja egziste.` })

  const branch = await prisma.branch.create({
    data: { tenantId: req.tenant.id, name: name.trim(), slug: cleanSlug, description: description || null, address: address || null, phone: phone || null, email: email || null, isActive: false }
  })
  res.status(201).json({ success: true, branch, message: `Branch "${branch.name}" kreye. Li bloke — aktive li nan pano admin.` })
}))

router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const { name, description, address, phone, email } = req.body
  const branch = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id } })
  if (!branch) return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })

  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: { name: name?.trim() || branch.name, description: description ?? branch.description, address: address ?? branch.address, phone: phone ?? branch.phone, email: email ?? branch.email }
  })
  res.json({ success: true, branch: updated, message: 'Branch ajou avèk siksè.' })
}))

// ⚠️ CHANJMAN KLÈ — requireSuperAdmin ajoute
router.patch('/:id/toggle', authorize('admin'), requireSuperAdmin, asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id } })
  if (!branch) return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })

  const newStatus = !branch.isActive
  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: { isActive: newStatus, unlockedAt: newStatus ? new Date() : branch.unlockedAt }
  })
  res.json({ success: true, branch: updated, message: newStatus ? `Branch "${branch.name}" aktive.` : `Branch "${branch.name}" bloke.` })
}))

router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id } })
  if (!branch) return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })

  await prisma.$transaction([
    prisma.product.updateMany({ where: { branchId: branch.id }, data: { branchId: null } }),
    prisma.client.updateMany({ where: { branchId: branch.id }, data: { branchId: null } }),
    prisma.quote.updateMany({ where: { branchId: branch.id }, data: { branchId: null } }),
    prisma.invoice.updateMany({ where: { branchId: branch.id }, data: { branchId: null } }),
    prisma.branch.delete({ where: { id: branch.id } })
  ])
  res.json({ success: true, message: `Branch "${branch.name}" efase.` })
}))

router.post('/:id/users', authorize('admin'), asyncHandler(async (req, res) => {
  const { userId, role, isAdmin } = req.body
  const branch = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id } })
  if (!branch) return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId: req.tenant.id } })
  if (!user) return res.status(404).json({ success: false, message: 'Itilizatè pa jwenn.' })

  const bu = await prisma.branchUser.upsert({
    where: { branchId_userId: { branchId: branch.id, userId } },
    create: { branchId: branch.id, userId, role: role || 'cashier', isAdmin: isAdmin || false },
    update: { role: role || 'cashier', isAdmin: isAdmin || false },
    include: { user: { select: { id: true, fullName: true, email: true, role: true } } }
  })
  res.json({ success: true, branchUser: bu, message: `${user.fullName} ajoute nan branch "${branch.name}".` })
}))

router.delete('/:id/users/:userId', authorize('admin'), asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id } })
  if (!branch) return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })

  await prisma.branchUser.deleteMany({ where: { branchId: branch.id, userId: req.params.userId } })
  res.json({ success: true, message: 'Itilizatè retire nan branch lan.' })
}))

router.get('/:id/reports', checkBranchAccess, asyncHandler(async (req, res) => {
  const branchId = req.params.id
  const { startDate, endDate } = req.query
  const where = { branchId }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate)   where.createdAt.lte = new Date(endDate)
  }

  const [invoices, quotes, products, stockMovements] = await Promise.all([
    prisma.invoice.findMany({ where: { ...where, tenantId: req.tenant.id }, select: { id: true, invoiceNumber: true, totalHtg: true, totalUsd: true, status: true, createdAt: true } }),
    prisma.quote.findMany({ where: { ...where, tenantId: req.tenant.id }, select: { id: true, quoteNumber: true, totalHtg: true, totalUsd: true, status: true, createdAt: true } }),
    prisma.product.count({ where: { branchId, tenantId: req.tenant.id } }),
    prisma.stockMovement.findMany({ where: { ...where, tenantId: req.tenant.id }, select: { movementType: true, quantityChange: true, createdAt: true } })
  ])

  const totalRevenueHtg = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.totalHtg), 0)
  res.json({ success: true, branchId, report: { invoices: { count: invoices.length, items: invoices, totalRevenueHtg }, quotes: { count: quotes.length, items: quotes }, products: { count: products }, stockMovements: { count: stockMovements.length, items: stockMovements } } })
}))

router.get('/reports/global', authorize('admin'), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query
  const tenantId = req.tenant.id
  const branches = await prisma.branch.findMany({ where: { tenantId }, include: { _count: { select: { products: true, clients: true } } } })

  const dateFilter = {}
  if (startDate || endDate) {
    dateFilter.createdAt = {}
    if (startDate) dateFilter.createdAt.gte = new Date(startDate)
    if (endDate)   dateFilter.createdAt.lte = new Date(endDate)
  }

  const branchStats = await Promise.all(branches.map(async (branch) => {
    const [invoicesPaid, invoicesTotal, quotesTotal] = await Promise.all([
      prisma.invoice.aggregate({ where: { tenantId, branchId: branch.id, status: 'paid', ...dateFilter }, _sum: { totalHtg: true, totalUsd: true } }),
      prisma.invoice.count({ where: { tenantId, branchId: branch.id, ...dateFilter } }),
      prisma.quote.count({ where: { tenantId, branchId: branch.id, ...dateFilter } })
    ])
    return {
      branch: { id: branch.id, name: branch.name, isActive: branch.isActive },
      revenue: { htg: Number(invoicesPaid._sum.totalHtg || 0), usd: Number(invoicesPaid._sum.totalUsd || 0) },
      invoicesCount: invoicesTotal, quotesCount: quotesTotal,
      productsCount: branch._count.products, clientsCount: branch._count.clients
    }
  }))

  const [globalRevenue, globalInvoices, globalQuotes] = await Promise.all([
    prisma.invoice.aggregate({ where: { tenantId, status: 'paid', ...dateFilter }, _sum: { totalHtg: true, totalUsd: true } }),
    prisma.invoice.count({ where: { tenantId, ...dateFilter } }),
    prisma.quote.count({ where: { tenantId, ...dateFilter } })
  ])

  res.json({ success: true, global: { revenue: { htg: Number(globalRevenue._sum.totalHtg || 0), usd: Number(globalRevenue._sum.totalUsd || 0) }, invoicesCount: globalInvoices, quotesCount: globalQuotes }, byBranch: branchStats })
}))

module.exports = router