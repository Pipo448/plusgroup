// src/modules/tenants/tenant-signup.service.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Enskripsyon Otonòm Antrepriz (Piblik oswa pa Ajan)
// ══════════════════════════════════════════════════════════════
// Antrepriz ki enskri tèt yo (sou paj Login) oswa yo enskri pa yon ajan
// (nan Dashboard Ajan) toulè de dwe pase pa isit la. Kontrèman ak
// kreyasyon manyèl Super Admin fè a (nan admin.routes.js), chemen sa a
// TOUJOU mande yon kòd pwomo ajan valid, epi tenant lan kreye ak
// `pendingApproval: true` — li aktif e esè a kòmanse imedyatman, men
// Super Admin dwe apwouve l anvan kliyan an ka reyèlman itilize sistèm nan.
const prisma = require('../../config/prisma')
const bcrypt = require('bcryptjs')

// Dwe rete SENKRONIZE ak PLUS_GROUP_BASE_MONTHLY nan admin.routes.js
const PLUS_GROUP_BASE_MONTHLY = 2500

// Dwe rete SENKRONIZE ak ALL_PAGES nan admin.routes.js
const ALL_PAGES = [
  'dashboard','products','clients','quotes','direct-quotes','invoices','stock','reports',
  'branches','settings','users','kane','kane-epay','pre','sabotay','mobilpay',
  'hotel','restaurant','dry','employees','expenses'
]
const LOCKED_PAGES = ALL_PAGES.reduce((acc, p) => ({ ...acc, [p]: p === 'dashboard' }), {})

/**
 * Kreye yon tenant an atant apwobasyon.
 * @param {object} data - non, slug, email, phone, address, promoCode,
 *   adminEmail, adminPassword, adminName
 * @param {'self'|'agent'} source
 */
const createPendingTenant = async (data, source) => {
  const { name, slug, email, phone, address, promoCode, adminEmail, adminPassword, adminName } = data

  if (!name || !slug) {
    throw Object.assign(new Error('Non antrepriz ak slug obligatwa.'), { statusCode: 400 })
  }
  if (!promoCode || promoCode.trim() === '') {
    throw Object.assign(new Error('Kòd pwomo ajan obligatwa pou enskripsyon otonòm.'), { statusCode: 400 })
  }
  if (!adminEmail || !adminPassword) {
    throw Object.assign(new Error('Imèl ak modpas administratè antrepriz la obligatwa.'), { statusCode: 400 })
  }
  if (adminPassword.length < 6) {
    throw Object.assign(new Error('Modpas la dwe gen omwen 6 karaktè.'), { statusCode: 400 })
  }

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
  if (!cleanSlug) {
    throw Object.assign(new Error('Slug pa valid.'), { statusCode: 400 })
  }

  const existingSlug = await prisma.tenant.findUnique({ where: { slug: cleanSlug } })
  if (existingSlug) {
    throw Object.assign(new Error(`Slug "${cleanSlug}" deja itilize — chwazi yon lòt non.`), { statusCode: 409 })
  }

  const agent = await prisma.agent.findUnique({ where: { promoCode: promoCode.trim().toUpperCase() } })
  if (!agent) {
    throw Object.assign(new Error(`Kòd pwomo "${promoCode}" pa valid.`), { statusCode: 400 })
  }
  if (agent.status !== 'approved') {
    throw Object.assign(new Error('Ajan ki gen kòd pwomo sa a pa aktif kounye a.'), { statusCode: 400 })
  }

  const existingAdminEmail = await prisma.user.findFirst({ where: { email: adminEmail.toLowerCase().trim() } })
  if (existingAdminEmail) {
    throw Object.assign(new Error('Yon kont deja egziste ak imèl sa a.'), { statusCode: 409 })
  }

  // ⚠️ Esè: YON MWA (pa 8 jou) — apre sa, tenant lan bloke si li pa peye
  const subscriptionEndsAt = new Date()
  subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1)

  const tenant = await prisma.tenant.create({
    data: {
      name: name.trim(),
      slug: cleanSlug,
      email: email || null,
      phone: phone || null,
      address: address || null,
      status: 'trial',
      subscriptionEndsAt,
      agentId: agent.id,
      monthlyPrice: PLUS_GROUP_BASE_MONTHLY,
      pendingApproval: true,
      signupSource: source,
      allowedPages: LOCKED_PAGES,
    }
  })

  const hash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      fullName: (adminName || 'Administratè').trim(),
      email: adminEmail.toLowerCase().trim(),
      passwordHash: hash,
      role: 'admin',
      isActive: true,
    }
  })

  return tenant
}

/**
 * Super Admin apwouve yon tenant an atant. Si yon monthlyPrice pi wo pase
 * planche a bay, yon komisyon ajan kreye pou premye mwa a.
 */
const approveTenant = async (tenantId, { monthlyPrice } = {}) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw Object.assign(new Error('Tenant pa jwenn.'), { statusCode: 404 })
  if (!tenant.pendingApproval) {
    throw Object.assign(new Error('Tenant sa a deja apwouve.'), { statusCode: 400 })
  }

  const finalMonthlyPrice = monthlyPrice != null && Number(monthlyPrice) > 0
    ? Math.round(Number(monthlyPrice))
    : tenant.monthlyPrice

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { pendingApproval: false, approvedAt: new Date(), monthlyPrice: finalMonthlyPrice }
  })

  if (tenant.agentId) {
    const agentCutPerMonth = Math.max(0, finalMonthlyPrice - PLUS_GROUP_BASE_MONTHLY)
    if (agentCutPerMonth > 0) {
      await prisma.agentCommission.create({
        data: { agentId: tenant.agentId, tenantId: tenant.id, months: 1, amountHtg: agentCutPerMonth, status: 'pending' }
      })
    }
  }

  return updated
}

/**
 * Super Admin rejte yon tenant an atant — siprime l nèt (li pa t janm reyèlman aktif).
 */
const rejectTenant = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw Object.assign(new Error('Tenant pa jwenn.'), { statusCode: 404 })
  if (!tenant.pendingApproval) {
    throw Object.assign(new Error('Sèl tenant an atant ka rejte.'), { statusCode: 400 })
  }
  await prisma.tenant.delete({ where: { id: tenantId } })
  return { deleted: true }
}

module.exports = { createPendingTenant, approveTenant, rejectTenant, PLUS_GROUP_BASE_MONTHLY, ALL_PAGES }
