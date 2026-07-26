// src/modules/admin/admin.routes.js — Super Admin Panel
const express = require('express')
const router  = express.Router()
const { superAdminAuth } = require('../../middleware/auth')
const { asyncHandler } = require('../../middleware/errorHandler')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const prisma  = require('../../config/prisma')

// ══════════════════════════════════════════════
// LOJIK ABÒNMAN — JOU 5 MWA KAP VINI
// ══════════════════════════════════════════════

function calcSubscriptionEnd(startDate, months) {
  const start       = new Date(startDate)
  const targetMonth = start.getMonth() + months
  const targetYear  = start.getFullYear() + Math.floor(targetMonth / 12)
  const normMonth   = ((targetMonth % 12) + 12) % 12
  const expireDate  = new Date(targetYear, normMonth, 5)
  expireDate.setHours(23, 59, 59, 999)
  return expireDate
}

function renewSubscription(currentEnd, months) {
  const now  = new Date()
  const base = (currentEnd && new Date(currentEnd) > now)
    ? new Date(currentEnd)
    : now
  const targetMonth = base.getMonth() + months
  const targetYear  = base.getFullYear() + Math.floor(targetMonth / 12)
  const normMonth   = ((targetMonth % 12) + 12) % 12
  const expireDate  = new Date(targetYear, normMonth, 5)
  expireDate.setHours(23, 59, 59, 999)
  return expireDate
}

// ══════════════════════════════════════════════
// DB SETUP: Kreye tabèl audit + kolòn monthly_price
// ══════════════════════════════════════════════
;(async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id     UUID,
        action        VARCHAR(100) NOT NULL,
        actor         VARCHAR(200) DEFAULT 'Super Admin',
        target_email  VARCHAR(200),
        target_name   VARCHAR(200),
        details       JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_tenant
      ON admin_audit_logs(tenant_id, created_at DESC)
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_price INTEGER DEFAULT 0
    `)
    console.log('[Admin] DB setup done.')
  } catch (e) {
    console.warn('[Admin] DB setup warn:', e.message)
  }
})()

// ══════════════════════════════════════════════
// AUDIT LOG HELPER
// ══════════════════════════════════════════════
async function logAudit(tenantId, action, targetEmail, targetName, details = {}) {
  if (!tenantId) return
  try {
    // FIX: $executeRawUnsafe ak positional params pou evite UUID cast error ak Supabase/pgBouncer
    await prisma.$executeRawUnsafe(
      `INSERT INTO admin_audit_logs (tenant_id, action, target_email, target_name, details)
       VALUES (CAST($1 AS uuid), $2, $3, $4, CAST($5 AS jsonb))`,
      tenantId,
      action,
      targetEmail || null,
      targetName  || null,
      JSON.stringify(details)
    )
  } catch (e) {
    console.warn('[Audit]', e.message)
  }
}

// ── POST /api/v1/admin/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email ak modpas obligatwa.' })

  const admin = await prisma.superAdmin.findUnique({ where: { email } })
  if (!admin || !admin.isActive)
    return res.status(401).json({ success: false, message: 'Idantifyan pa kòrèk.' })

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid)
    return res.status(401).json({ success: false, message: 'Idantifyan pa kòrèk.' })

  const token = jwt.sign(
    { adminId: admin.id },
    process.env.SUPER_ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  )
  res.json({ success: true, token, admin: { id: admin.id, name: admin.name, email: admin.email } })
}))

// ── POST /api/v1/admin/setup-superadmin
// ⚠️ KORIJE — itilize `prisma` pataje a olye kreye yon PrismaClient nouvo
// (chak apèl te kreye yon pool koneksyon separe ki pa t janm fèmen si
// tenantExists te fè fonksyon an retounen bonè, sa te fwi koneksyon
// Postgres/Supabase yo pandan tan).
router.post('/setup-superadmin', asyncHandler(async (req, res) => {
  const existing = await prisma.superAdmin.findFirst()
  if (existing) {
    return res.json({ success: false, message: 'Super Admin deja egziste!' })
  }

  const hashedPassword = await bcrypt.hash('SuperAdmin2024!', 12)
  const superAdmin = await prisma.superAdmin.create({
    data: { name: 'PLUS GROUP Admin', email: 'admin@plusgroup.ht', passwordHash: hashedPassword, isActive: true }
  })

  res.json({
    success: true,
    message: 'Super Admin kreye avèk siksè!',
    data: {
      superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email },
      credentials: { email: 'admin@plusgroup.ht', password: 'SuperAdmin2024!', loginUrl: '/admin/login' }
    }
  })
}))

// ── DELETE /api/v1/admin/tenants/by-slug/:slug
// ⚠️ KORIJE — itilize `prisma` pataje a olye kreye yon PrismaClient nouvo.
// Ansyen kòd la te kreye yon nouvo pool koneksyon CHAK fwa wout sa a rele,
// e li pa t janm rele $disconnect() si youn nan safeDelete yo te leve yon
// erè ki pa jere — koneksyon yo te rete louvri pou tout tan sou Supabase.
router.delete('/tenants/by-slug/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params

  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    return res.status(404).json({ success: false, message: `Tenant "${slug}" pa jwenn.` })
  }

  const safeDelete = async (fn) => { try { await fn() } catch(e) { console.warn('Skip:', e.message) } }
  await safeDelete(() => prisma.stockMovement.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId: tenant.id } } }))
  await safeDelete(() => prisma.payment.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.invoice.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.quoteItem.deleteMany({ where: { quote: { tenantId: tenant.id } } }))
  await safeDelete(() => prisma.quote.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.product.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.client.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.documentSequence.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.branchUser.deleteMany({ where: { branch: { tenantId: tenant.id } } }))
  await safeDelete(() => prisma.branch.deleteMany({ where: { tenantId: tenant.id } }))
  await safeDelete(() => prisma.user.deleteMany({ where: { tenantId: tenant.id } }))
  await prisma.tenant.delete({ where: { id: tenant.id } })

  res.json({ success: true, message: `Tenant "${slug}" efase avèk siksè!` })
}))

// ══════════════════════════════════════════════
// ── Proteksyon tout routes anba a
// ══════════════════════════════════════════════
router.use(superAdminAuth)

// ── POST /api/v1/admin/tenants/reset-password
router.post('/tenants/reset-password', asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body

  if (!email || !newPassword)
    return res.status(400).json({ success: false, message: 'Email ak nouvo modpas obligatwa.' })

  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'Modpas dwe gen omwen 6 karaktè.' })

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    include: { tenant: { select: { id: true, name: true, slug: true } } }
  })

  if (!user)
    return res.status(404).json({
      success: false,
      message: `Okenn itilizatè jwenn ak email: ${email}`
    })

  const newHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      updatedAt: new Date()
    }
  })

  // ── Audit log
  await logAudit(user.tenantId, 'PASSWORD_RESET', user.email, user.fullName, {
    changedBy: 'Super Admin'
  })

  res.json({
    success: true,
    message: `✅ Modpas ${user.fullName || user.email} chanje. Sesyon li anyile — li dwe konekte ankò.`,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tenantName: user.tenant?.name,
      tenantSlug: user.tenant?.slug
    }
  })
}))

// ── GET /api/v1/admin/tenants
router.get('/tenants', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const where = { ...(status && { status }) }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      select: {
        id: true, name: true, slug: true, email: true, phone: true, address: true,
        status: true, subscriptionEndsAt: true, createdAt: true, updatedAt: true,
        defaultCurrency: true, defaultLanguage: true,
        monthlyPrice: true,
        plan: { select: { id: true, name: true, features: true, priceMonthly: true, maxBranches: true } },
        branches: { select: { id: true, name: true, slug: true, isActive: true, createdAt: true } },
        _count: { select: { users: true, products: true, invoices: true, branches: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.tenant.count({ where })
  ])

  res.json({ success: true, tenants, total, pages: Math.ceil(total / Number(limit)) })
}))

// ── GET /api/v1/admin/tenants/:id
router.get('/tenants/:id', asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: {
      plan: true,
      subscriptions: true,
      branches: {
        include: {
          _count: { select: { branchUsers: true, products: true, invoices: true } }
        }
      },
      _count: { select: { users: true, products: true, invoices: true, branches: true } }
    }
  })
  if (!tenant)
    return res.status(404).json({ success: false, message: 'Entreprise pa jwenn.' })
  res.json({ success: true, tenant })
}))

// ── POST /api/v1/admin/tenants
router.post('/tenants', asyncHandler(async (req, res) => {
  const {
    name, slug, email, phone, address, planId,
    adminEmail, adminPassword, adminName,
    subscriptionMonths, defaultCurrency, defaultLanguage,
    promoCode // ⚠️ NOUVO — kòd ajan (opsyonèl)
  } = req.body

  if (!name || !slug)
    return res.status(400).json({ success: false, message: 'Non ak slug obligatwa.' })

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
  if (!cleanSlug)
    return res.status(400).json({ success: false, message: 'Slug pa valid.' })

  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } })
  if (existing)
    return res.status(409).json({ success: false, message: `Slug "${cleanSlug}" deja egziste.` })

  const months = Math.max(1, Math.min(36, Number(subscriptionMonths) || 1))
  const subscriptionEndsAt = calcSubscriptionEnd(new Date(), months)

  let cleanPlanId = null
  if (planId && typeof planId === 'string' && planId.trim() !== '') {
    const trimmedId = planId.trim()
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidPattern.test(trimmedId)) {
      try {
        const planExists = await prisma.subscriptionPlan.findUnique({ where: { id: trimmedId } })
        if (planExists) cleanPlanId = trimmedId
      } catch (e) { console.warn(`Erè rechèch plan: ${e.message}`) }
    }
  }

  const cleanCurrency = ['HTG', 'USD'].includes(defaultCurrency) ? defaultCurrency : 'HTG'
  const cleanLanguage  = ['ht', 'fr', 'en'].includes(defaultLanguage) ? defaultLanguage : 'ht'

  // ⚠️ NOUVO — Valide kòd promo si youn bay, jwenn ajan ki koresponn
  let referringAgent = null
  if (promoCode && promoCode.trim() !== '') {
    referringAgent = await prisma.agent.findUnique({
      where: { promoCode: promoCode.trim().toUpperCase() }
    })
    if (!referringAgent) {
      return res.status(400).json({ success: false, message: `Kòd promo "${promoCode}" pa jwenn.` })
    }
    if (referringAgent.status !== 'approved') {
      return res.status(400).json({ success: false, message: `Ajan ki gen kòd promo sa a pa aktif kounye a.` })
    }
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: name.trim(), slug: cleanSlug,
      email: email || null, phone: phone || null, address: address || null,
      planId: cleanPlanId,
      defaultCurrency: cleanCurrency, defaultLanguage: cleanLanguage,
      status: 'active',
      subscriptionEndsAt,
      agentId: referringAgent?.id || null // ⚠️ NOUVO
    }
  })

  // ⚠️ NOUVO — Jenere premye komisyon ajan an si tenant lan lye ak yon ajan
  if (referringAgent) {
    await prisma.agentCommission.create({
      data: {
        agentId: referringAgent.id,
        tenantId: tenant.id,
        months,
        amountHtg: referringAgent.commissionPerTenant * months,
        status: 'pending'
      }
    })
  }

  if (adminEmail && adminPassword) {
    const emailExists = await prisma.user.findFirst({
      where: { email: adminEmail.toLowerCase().trim(), tenantId: tenant.id }
    })
    if (!emailExists) {
      const hash = await bcrypt.hash(adminPassword, 12)
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          fullName: (adminName || 'Administrateur').trim(),
          email: adminEmail.toLowerCase().trim(),
          passwordHash: hash, role: 'admin', isActive: true
        }
      })
    }
  }

  try {
    await Promise.all([
      prisma.documentSequence.upsert({
        where:  { tenantId_documentType: { tenantId: tenant.id, documentType: 'quote' } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'quote', prefix: 'DEV', currentYear: new Date().getFullYear() }
      }),
      prisma.documentSequence.upsert({
        where:  { tenantId_documentType: { tenantId: tenant.id, documentType: 'invoice' } },
        update: {},
        create: { tenantId: tenant.id, documentType: 'invoice', prefix: 'FAC', currentYear: new Date().getFullYear() }
      })
    ])
  } catch (seqErr) { console.warn('Sekans dokiman:', seqErr.message) }

  // ── Audit log
  await logAudit(tenant.id, 'TENANT_CREATED', adminEmail || null, tenant.name, {
    plan: cleanPlanId, months, currency: cleanCurrency, agentId: referringAgent?.id || null
  })

  res.status(201).json({
    success: true, tenant,
    message: `Entreprise "${tenant.name}" kreye. Abònman ekspire ${subscriptionEndsAt.toLocaleDateString('fr-FR')}.`
      + (referringAgent ? ` Lye ak ajan "${referringAgent.fullName}".` : '')
  })
}))

// ── PATCH /api/v1/admin/tenants/:id/status
router.patch('/tenants/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body
  const valid = ['active', 'suspended', 'pending', 'cancelled']
  if (!valid.includes(status))
    return res.status(400).json({ success: false, message: 'Statut pa valid.' })

  // Jwenn statut + non anvan chanjman
  const before = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: { status: true, name: true }
  })

  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: { status } })
  const msg = status === 'active' ? 'aktive' : status === 'suspended' ? 'sipann' : status

  // ── Audit log
  await logAudit(req.params.id, 'STATUS_CHANGED', null, before?.name, {
    from: before?.status, to: status
  })

  res.json({ success: true, tenant, message: `Entreprise ${msg}.` })
}))

// ── PATCH /api/v1/admin/tenants/:id/plan
router.patch('/tenants/:id/plan', asyncHandler(async (req, res) => {
  const { planId } = req.body
  if (!planId)
    return res.status(400).json({ success: false, message: 'planId obligatwa.' })

  const planExists = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  if (!planExists)
    return res.status(404).json({ success: false, message: 'Plan pa jwenn.' })

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { planId },
    include: { plan: { select: { id: true, name: true, features: true, priceMonthly: true, maxBranches: true } } }
  })

  // ── Audit log
  await logAudit(req.params.id, 'PLAN_CHANGED', null, tenant.name, {
    newPlan: planExists.name, price: planExists.priceMonthly
  })

  res.json({ success: true, tenant, message: `Plan "${planExists.name}" asiye bay ${tenant.name}.` })
}))

// ── POST /api/v1/admin/tenants/:id/renew
router.post('/tenants/:id/renew', asyncHandler(async (req, res) => {
  const { months = 1 } = req.body
  const numMonths = Math.max(1, Math.min(36, Number(months)))

  const existing = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, subscriptionEndsAt: true, status: true, agentId: true }
  })
  if (!existing)
    return res.status(404).json({ success: false, message: 'Entreprise pa jwenn.' })

  const newEndsAt = renewSubscription(existing.subscriptionEndsAt, numMonths)

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { subscriptionEndsAt: newEndsAt, status: 'active' },
    select: { id: true, name: true, subscriptionEndsAt: true, status: true }
  })

  // ⚠️ NOUVO — Jenere komisyon ajan an si tenant lan lye ak yon ajan
  if (existing.agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: existing.agentId } })
    if (agent && agent.status === 'approved') {
      await prisma.agentCommission.create({
        data: {
          agentId: agent.id,
          tenantId: existing.id,
          months: numMonths,
          amountHtg: agent.commissionPerTenant * numMonths,
          status: 'pending'
        }
      })
    }
  }

  // ── Audit log
  await logAudit(req.params.id, 'SUBSCRIPTION_RENEWED', null, existing.name, {
    months: numMonths, newEndsAt: newEndsAt.toISOString()
  })

  res.json({
    success: true, tenant,
    message: `Abònman ${existing.name} renouvle pou ${numMonths} mwa. Nouvo ekspirasyon: ${newEndsAt.toLocaleDateString('fr-FR')}.`
  })
}))

// ══════════════════════════════════════════════
// BRANCH MANAGEMENT PAR SUPER ADMIN
// ══════════════════════════════════════════════

// ── GET /api/v1/admin/tenants/:id/branches
router.get('/tenants/:id/branches', asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, plan: { select: { name: true, maxBranches: true } } }
  })
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

  const branches = await prisma.branch.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { branchUsers: true, products: true, invoices: true } }
    },
    orderBy: { createdAt: 'asc' }
  })

  res.json({
    success: true,
    tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
    branches,
    total: branches.length
  })
}))

// ── PATCH /api/v1/admin/tenants/:tenantId/branches/:branchId/toggle
router.patch('/tenants/:tenantId/branches/:branchId/toggle', asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findFirst({
    where: { id: req.params.branchId, tenantId: req.params.tenantId }
  })

  if (!branch) {
    return res.status(404).json({ success: false, message: 'Branch pa jwenn.' })
  }

  const newStatus = !branch.isActive

  const updated = await prisma.branch.update({
    where: { id: branch.id },
    data: {
      isActive: newStatus,
      unlockedAt: newStatus ? new Date() : branch.unlockedAt
    }
  })

  // ── Audit log
  await logAudit(req.params.tenantId, 'BRANCH_TOGGLED', null, branch.name, {
    branchSlug: branch.slug, isActive: newStatus
  })

  res.json({
    success: true,
    branch: updated,
    message: newStatus
      ? `✅ Branch "${branch.name}" debloke — itilizatè yo ka aksede l.`
      : `🔒 Branch "${branch.name}" bloke — aksè refize pou itilizatè yo.`
  })
}))

// ── POST /api/v1/admin/tenants/:id/branches
router.post('/tenants/:id/branches', asyncHandler(async (req, res) => {
  const { name, slug, description, address, phone, email, isActive } = req.body

  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: { plan: true }
  })
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

  const maxBranches = tenant.plan?.maxBranches || 1
  const currentCount = await prisma.branch.count({ where: { tenantId: tenant.id } })

  if (currentCount >= maxBranches) {
    return res.status(403).json({
      success: false,
      message: `Plan ${tenant.plan?.name || 'aktyèl'} la limite nan ${maxBranches} branch.`,
      limitReached: true
    })
  }

  if (!name || !slug) {
    return res.status(400).json({ success: false, message: 'Non ak slug obligatwa.' })
  }

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')

  const existing = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, slug: cleanSlug }
  })
  if (existing) return res.status(409).json({ success: false, message: 'Slug deja egziste pou tenant sa a.' })

  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: name.trim(),
      slug: cleanSlug,
      description: description || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      isActive: isActive === true
    }
  })

  res.status(201).json({
    success: true,
    branch,
    message: `Branch "${branch.name}" kreye pou ${tenant.name}.`
  })
}))

// ══════════════════════════════════════════════
// PAGE ACCESS MANAGEMENT
// ══════════════════════════════════════════════

const ALL_PAGES = [
  'dashboard','products','clients','quotes','invoices','stock','reports',
  'branches','settings','users','kane','kane-epay','sabotay','mobilpay'
]

const DEFAULT_PAGES = ALL_PAGES.reduce((acc, p) => ({ ...acc, [p]: true }), {})

// ── GET /api/v1/admin/tenants/:id/pages
router.get('/tenants/:id/pages', asyncHandler(async (req, res) => {
  try {
    // FIX: $queryRawUnsafe ak positional param pou UUID cast
    const rows = await prisma.$queryRawUnsafe(
      `SELECT allowed_pages FROM tenants WHERE id = CAST($1 AS uuid)`,
      req.params.id
    )
    if (!rows || rows.length === 0)
      return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

    const raw   = rows[0].allowed_pages
    const saved = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})

    // Fòse dashboard toujou ON, merge ak defaults
    const pages = { ...DEFAULT_PAGES, ...saved, dashboard: true }

    res.json({ success: true, pages })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}))

// ── PATCH /api/v1/admin/tenants/:id/pages
router.patch('/tenants/:id/pages', asyncHandler(async (req, res) => {
  const { pages } = req.body
  if (!pages || typeof pages !== 'object')
    return res.status(400).json({ success: false, message: 'pages obligatwa (obje JSON).' })

  // Sanktifye — sèlman paj ki nan ALL_PAGES, dashboard toujou true
  const sanitized = {}
  ALL_PAGES.forEach(key => {
    sanitized[key] = key === 'dashboard' ? true : (pages[key] !== false)
  })

  try {
    // FIX: $executeRawUnsafe ak positional params pou UUID cast
    await prisma.$executeRawUnsafe(
      `UPDATE tenants SET allowed_pages = CAST($1 AS jsonb) WHERE id = CAST($2 AS uuid)`,
      JSON.stringify(sanitized),
      req.params.id
    )

    // Jwenn non tenant pou audit
    const t = await prisma.tenant.findUnique({
      where: { id: req.params.id }, select: { name: true }
    })

    const enabledCount  = Object.values(sanitized).filter(Boolean).length
    const disabledCount = Object.values(sanitized).filter(v => !v).length

    // ── Audit log
    await logAudit(req.params.id, 'PAGE_ACCESS_UPDATED', null, t?.name, {
      enabled: enabledCount, disabled: disabledCount
    })

    res.json({ success: true, pages: sanitized, message: 'Aksè paj yo ajou.' })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}))

// ══════════════════════════════════════════════
// MONTHLY PRICE
// ══════════════════════════════════════════════

// ── PATCH /api/v1/admin/tenants/:id/monthly-price
router.patch('/tenants/:id/monthly-price', asyncHandler(async (req, res) => {
  const price = Math.max(0, Number(req.body.monthlyPrice) || 0)

  // Prisma ORM — pa gen raw SQL, pa gen UUID pwoblem
  const t = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { monthlyPrice: price },
    select: { name: true }
  })

  await logAudit(req.params.id, 'PRICE_UPDATED', null, t?.name, { monthlyPrice: price })

  res.json({ success: true, monthlyPrice: price, message: `Pri mensyèl ajou: ${price.toLocaleString()} HTG` })
}))

// ══════════════════════════════════════════════
// AUDIT LOG — GET ISTORIK
// ══════════════════════════════════════════════

// ── GET /api/v1/admin/tenants/:id/audit
router.get('/tenants/:id/audit', asyncHandler(async (req, res) => {
  try {
    // FIX: $queryRawUnsafe ak positional param pou UUID cast
    const logs = await prisma.$queryRawUnsafe(
      `SELECT id::text, action, actor, target_email, target_name, details, created_at
       FROM admin_audit_logs
       WHERE tenant_id = CAST($1 AS uuid)
       ORDER BY created_at DESC
       LIMIT 100`,
      req.params.id
    )
    res.json({ success: true, logs })
  } catch {
    res.json({ success: true, logs: [] })
  }
}))

// ══════════════════════════════════════════════
// PLANS
// ══════════════════════════════════════════════

// ── GET /api/v1/admin/plans
router.get('/plans', asyncHandler(async (req, res) => {
  const PLANS = [
    {
      name: 'Estanda',  nameFr: 'Standard',   maxUsers: 5,   maxProducts: 10000,     maxBranches: 1,
      priceMonthly: 2500, features: JSON.stringify(['Jesyon Stòk', 'Fakti & Devis', 'Jiska 5 itilizatè', '1 Branch'])
    },
    {
      name: 'Biznis',   nameFr: 'Business',   maxUsers: 15,  maxProducts: 50000,     maxBranches: 3,
      priceMonthly: 3000, features: JSON.stringify(['Tout nan Estanda', 'Rapò avanse', 'Jiska 15 itilizatè', '3 Branch', 'Sèvis'])
    },
    {
      name: 'Premyum',  nameFr: 'Premium',    maxUsers: 100, maxProducts: 100000,    maxBranches: 10,
      priceMonthly: 4000, features: JSON.stringify(['Tout nan Biznis', 'Sipò priorite', 'Itilizatè entelimite', '10 Branch', 'Sèvis'])
    },
    {
      name: 'Antepriz', nameFr: 'Entreprise', maxUsers: 999, maxProducts: 999999999, maxBranches: 50,
      priceMonthly: 5000, features: JSON.stringify(['Tout nan Premyum', 'Paj Sabotay MonCash/NatCash', 'Ti Kanè Kès', '50 Branch', 'Sipò VIP 24/7', 'Sèvis'])
    },
  ]

  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } })
    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          features: plan.features,
          priceMonthly: plan.priceMonthly,
          maxUsers: plan.maxUsers,
          maxProducts: plan.maxProducts,
          maxBranches: plan.maxBranches,
          isActive: true
        }
      })
    } else {
      await prisma.subscriptionPlan.create({ data: plan })
    }
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' }
  })

  res.json({ success: true, plans })
}))

// ── GET /api/v1/admin/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [total, active, pending, suspended, totalUsers, totalBranches] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'active' } }),
    prisma.tenant.count({ where: { status: 'pending' } }),
    prisma.tenant.count({ where: { status: 'suspended' } }),
    prisma.user.count(),
    prisma.branch.count()
  ])

  // Kalkile total revni mensyèl aktif via Prisma aggregate
  const revenueAgg = await prisma.tenant.aggregate({
    where: { status: 'active' },
    _sum: { monthlyPrice: true }
  })
  const totalMonthly = Number(revenueAgg._sum.monthlyPrice || 0)

  res.json({
    success: true,
    stats: {
      tenants:  { total, active, pending, suspended },
      users:    { total: totalUsers },
      branches: { total: totalBranches },
      revenue:  { totalMonthly }
    }
  })
}))

// ── GET /api/v1/admin/expiring
router.get('/expiring', asyncHandler(async (req, res) => {
  const fiveDaysFromNow = new Date()
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

  const expiring = await prisma.tenant.findMany({
    where: { status: 'active', subscriptionEndsAt: { lte: fiveDaysFromNow, gte: new Date() } },
    select: { id: true, name: true, email: true, subscriptionEndsAt: true, plan: { select: { name: true } } },
    orderBy: { subscriptionEndsAt: 'asc' }
  })

  res.json({ success: true, expiring, count: expiring.length })
}))

// ── GET /api/v1/admin/expiring-soon (backward compat)
router.get('/expiring-soon', asyncHandler(async (req, res) => {
  const fiveDaysFromNow = new Date()
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

  const expiring = await prisma.tenant.findMany({
    where: { status: 'active', subscriptionEndsAt: { lte: fiveDaysFromNow, gte: new Date() } },
    select: { id: true, name: true, email: true, subscriptionEndsAt: true, plan: { select: { name: true } } },
    orderBy: { subscriptionEndsAt: 'asc' }
  })

  res.json({ success: true, expiring, count: expiring.length })
}))

// ══════════════════════════════════════════════
// JESYON AJAN (Faz 2 — Kòd Promo / Komisyon)
// ══════════════════════════════════════════════

function generatePassword() {
  return Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100)
}

// ── GET /api/v1/admin/agents — lis tout ajan (filtre pa status opsyonèl)
router.get('/agents', asyncHandler(async (req, res) => {
  const { status } = req.query
  const agents = await prisma.agent.findMany({
    where: { ...(status && { status }) },
    include: {
      _count: { select: { tenants: true, commissions: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ success: true, agents, total: agents.length })
}))

// ── GET /api/v1/admin/agents/:id — detay yon ajan (tenant + komisyon)
router.get('/agents/:id', asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    include: {
      tenants: { select: { id: true, name: true, slug: true, status: true, createdAt: true } },
      commissions: { orderBy: { createdAt: 'desc' } }
    }
  })
  if (!agent) return res.status(404).json({ success: false, message: 'Ajan pa jwenn.' })

  const totalEarned = agent.commissions.reduce((s, c) => s + c.amountHtg, 0)
  const totalPaid    = agent.commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amountHtg, 0)
  const totalPending = totalEarned - totalPaid

  res.json({ success: true, agent, stats: { totalEarned, totalPaid, totalPending } })
}))

// ── PATCH /api/v1/admin/agents/:id/approve — apwouve kandidati, jenere premye modpas
router.patch('/agents/:id/approve', asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ success: false, message: 'Ajan pa jwenn.' })
  if (agent.status === 'approved') {
    return res.status(400).json({ success: false, message: 'Ajan sa a deja apwouve.' })
  }

  const initialPassword = generatePassword()
  const passwordHash = await bcrypt.hash(initialPassword, 12)

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'approved', passwordHash, approvedAt: new Date() }
  })

  await logAudit(null, 'AGENT_APPROVED', agent.email, agent.fullName, { agentId: agent.id })

  res.json({
    success: true,
    agent: updated,
    // ⚠️ Modpas la sèlman parèt YON SÈL FWA isit la — SuperAdmin dwe kopye l
    // e voye l bay ajan an manyèlman (WhatsApp/telefòn), pa gen sistèm email.
    initialPassword,
    message: `Ajan "${agent.fullName}" apwouve. Kòd promo: ${agent.promoCode}. Modpas inisyal: ${initialPassword} (kopye l kounye a, li p ap parèt ankò).`
  })
}))

// ── PATCH /api/v1/admin/agents/:id/reject
router.patch('/agents/:id/reject', asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ success: false, message: 'Ajan pa jwenn.' })

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'rejected' }
  })

  await logAudit(null, 'AGENT_REJECTED', agent.email, agent.fullName, { agentId: agent.id })

  res.json({ success: true, agent: updated, message: `Kandidati "${agent.fullName}" rejte.` })
}))

// ── PATCH /api/v1/admin/agents/:id/suspend — bloke yon ajan ki te deja apwouve
router.patch('/agents/:id/suspend', asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ success: false, message: 'Ajan pa jwenn.' })

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'suspended' }
  })

  await logAudit(null, 'AGENT_SUSPENDED', agent.email, agent.fullName, { agentId: agent.id })

  res.json({ success: true, agent: updated, message: `Ajan "${agent.fullName}" sispann.` })
}))

// ── PATCH /api/v1/admin/agent-commissions/:id/paid — make yon komisyon kòm peye
router.patch('/agent-commissions/:id/paid', asyncHandler(async (req, res) => {
  const commission = await prisma.agentCommission.findUnique({ where: { id: req.params.id } })
  if (!commission) return res.status(404).json({ success: false, message: 'Komisyon pa jwenn.' })

  const updated = await prisma.agentCommission.update({
    where: { id: commission.id },
    data: { status: 'paid' }
  })

  res.json({ success: true, commission: updated, message: 'Komisyon make kòm peye.' })
}))



// ── GET /api/v1/admin/tenants/:id/sol/accounts
// Wè tout kont Sol pou yon tenant (ak credentials)
router.get('/tenants/:id/sol/accounts', asyncHandler(async (req, res) => {
  const { planId } = req.query

  const tenant = await prisma.tenant.findUnique({
    where:  { id: req.params.id },
    select: { id: true, name: true }
  })
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

  const accounts = await prisma.solMemberAccount.findMany({
    where: {
      tenantId: req.params.id,
      ...(planId && { planId }),
    },
    select: {
      id:             true,
      username:       true,
      plainPassword:  true,   // ← Admin ka wè modpas klè
      memberName:     true,
      memberPhone:    true,
      memberPosition: true,
      planId:         true,
      planName:       true,
      isOwnerSlot:    true,
      hasWon:         true,
      createdAt:      true,
    },
    orderBy: [{ planName: 'asc' }, { memberPosition: 'asc' }],
  })

  res.json({ success: true, accounts, total: accounts.length, tenantName: tenant.name })
}))

// ── GET /api/v1/admin/tenants/:id/sol/plans
// Wè tout plan Sabotay pou yon tenant ak kont Sol yo
router.get('/tenants/:id/sol/plans', asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: req.params.id },
    select: { id: true, name: true }
  })
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant pa jwenn.' })

  const plans = await prisma.sabotayPlan.findMany({
    where:   { tenantId: req.params.id },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Pou chak plan, konbyen kont Sol egziste
  const plansWithSolCount = await Promise.all(
    plans.map(async (plan) => {
      const solCount = await prisma.solMemberAccount.count({
        where: { planId: plan.id }
      })
      return { ...plan, solAccountCount: solCount }
    })
  )

  res.json({ success: true, plans: plansWithSolCount, total: plans.length })
}))

// ── PATCH /api/v1/admin/tenants/:tenantId/sol/accounts/:accountId/reset-password
// Super Admin reset modpas yon manm Sol
router.patch('/tenants/:tenantId/sol/accounts/:accountId/reset-password', asyncHandler(async (req, res) => {
  const bcrypt = require('bcryptjs')
  const { newPassword } = req.body

  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ success: false, message: 'Modpas dwe gen omwen 4 karaktè.' })

  const account = await prisma.solMemberAccount.findFirst({
    where: { id: req.params.accountId, tenantId: req.params.tenantId }
  })
  if (!account) return res.status(404).json({ success: false, message: 'Kont Sol pa jwenn.' })

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.solMemberAccount.update({
    where: { id: account.id },
    data:  { passwordHash, plainPassword: newPassword },
  })

  await logAudit(req.params.tenantId, 'SOL_PASSWORD_RESET', null, account.memberName, {
    username: account.username, resetBy: 'Super Admin'
  })

  res.json({ success: true, message: `Modpas ${account.memberName} (${account.username}) reset.`, username: account.username })
}))

// ── DELETE /api/v1/admin/tenants/:tenantId/sol/accounts/:accountId
// Efase yon kont Sol
router.delete('/tenants/:tenantId/sol/accounts/:accountId', asyncHandler(async (req, res) => {
  const account = await prisma.solMemberAccount.findFirst({
    where: { id: req.params.accountId, tenantId: req.params.tenantId }
  })
  if (!account) return res.status(404).json({ success: false, message: 'Kont Sol pa jwenn.' })

  await prisma.solMemberAccount.delete({ where: { id: account.id } })

  await logAudit(req.params.tenantId, 'SOL_ACCOUNT_DELETED', null, account.memberName, {
    username: account.username, deletedBy: 'Super Admin'
  })

  res.json({ success: true, message: `Kont Sol ${account.username} efase.` })
}))

module.exports = router