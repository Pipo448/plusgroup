// backend/src/modules/gym/gym.service.js
// ✅ NOUVO — Modil Jim/Gym: jesyon manm, abònman, check-in, peman, klas & antrenè.
const prisma = require('../../config/prisma')

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function todayDateOnly() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────
async function getStats(tenantId, branchId) {
  const memberWhere = { tenantId, ...(branchId && { branchId }) }
  const today = todayDateOnly()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [totalMembers, activeMembers, activeMemberships, checkInsToday, revenueAgg] = await Promise.all([
    prisma.gymMember.count({ where: memberWhere }),
    prisma.gymMember.count({ where: { ...memberWhere, isActive: true } }),
    prisma.gymMembership.count({
      where: { tenantId, status: 'active', OR: [{ endDate: null }, { endDate: { gte: today } }] },
    }),
    prisma.gymCheckIn.count({
      where: { tenantId, ...(branchId && { branchId }), checkInAt: { gte: today } },
    }),
    prisma.gymPayment.aggregate({
      where: { tenantId, createdAt: { gte: monthStart } },
      _sum: { amountHtg: true },
    }),
  ])

  return {
    totalMembers,
    activeMembers,
    activeMemberships,
    checkInsToday,
    revenueThisMonth: Number(revenueAgg._sum.amountHtg || 0),
  }
}

// ─────────────────────────────────────────────────────────────
// PLANS (abònman: Mansyèl, Trimès, Anyèl...)
// ─────────────────────────────────────────────────────────────
async function getPlans(tenantId, branchId) {
  return prisma.gymPlan.findMany({
    where: { tenantId, ...(branchId && { branchId }) },
    orderBy: { durationDays: 'asc' },
  })
}

async function createPlan(tenantId, branchId, data) {
  const { name, durationDays, priceHtg, priceUsd } = data
  if (!name) throw new Error('Non plan obligatwa.')
  if (!durationDays || Number(durationDays) <= 0) throw new Error('Dire plan (jou) obligatwa.')
  if (priceHtg === undefined || Number(priceHtg) < 0) throw new Error('Pri plan obligatwa.')
  return prisma.gymPlan.create({
    data: {
      tenantId, branchId: branchId || null,
      name: name.trim(), durationDays: Number(durationDays),
      priceHtg: Number(priceHtg), priceUsd: Number(priceUsd || 0),
    },
  })
}

async function updatePlan(tenantId, planId, data) {
  const plan = await prisma.gymPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')
  return prisma.gymPlan.update({
    where: { id: planId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.durationDays !== undefined && { durationDays: Number(data.durationDays) }),
      ...(data.priceHtg !== undefined && { priceHtg: Number(data.priceHtg) }),
      ...(data.priceUsd !== undefined && { priceUsd: Number(data.priceUsd) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })
}

async function deletePlan(tenantId, planId) {
  const plan = await prisma.gymPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')
  const used = await prisma.gymMembership.count({ where: { planId } })
  if (used > 0) {
    await prisma.gymPlan.update({ where: { id: planId }, data: { isActive: false } })
    return { softDeleted: true }
  }
  await prisma.gymPlan.delete({ where: { id: planId } })
  return { softDeleted: false }
}

// ─────────────────────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────────────────────
async function getMembers(tenantId, branchId, params = {}) {
  const { search, status, page = 1, limit = 20 } = params
  const skip = (Number(page) - 1) * Number(limit)
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }
  const [members, total] = await Promise.all([
    prisma.gymMember.findMany({
      where,
      include: {
        memberships: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.gymMember.count({ where }),
  ])

  const today = todayDateOnly()
  const membersFormatted = members.map(m => {
    const latest = m.memberships[0] || null
    const isExpired = latest?.endDate ? new Date(latest.endDate) < today : false
    return {
      ...m,
      memberships: undefined,
      currentMembership: latest
        ? {
            id: latest.id, planName: latest.plan?.name || null,
            startDate: latest.startDate, endDate: latest.endDate,
            status: isExpired && latest.status === 'active' ? 'expired' : latest.status,
          }
        : null,
    }
  })

  return { members: membersFormatted, total, page: Number(page), limit: Number(limit) }
}

async function getMemberById(tenantId, memberId) {
  const member = await prisma.gymMember.findFirst({
    where: { id: memberId, tenantId },
    include: {
      memberships: { orderBy: { createdAt: 'desc' }, include: { plan: { select: { name: true, durationDays: true } } } },
      payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      checkIns: { orderBy: { checkInAt: 'desc' }, take: 20 },
    },
  })
  if (!member) throw new Error('Manm pa jwenn.')
  return member
}

async function addMember(tenantId, branchId, userId, data) {
  const { fullName, phone, email, photoUrl, birthDate, address, emergencyContact, emergencyPhone } = data
  if (!fullName) throw new Error('Non manm obligatwa.')

  const member = await prisma.gymMember.create({
    data: {
      tenantId, branchId: branchId || null,
      fullName: fullName.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      photoUrl: photoUrl || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      address: address || null,
      emergencyContact: emergencyContact || null,
      emergencyPhone: emergencyPhone || null,
    },
  })

  // ✅ Si yon plan bay ansanm ak kreyasyon manm nan, kreye premye abònman an tousuit
  if (data.planId) {
    await createMembership(tenantId, member.id, userId, {
      planId: data.planId,
      amountPaid: data.amountPaid,
      method: data.method,
    })
  }

  return member
}

async function updateMember(tenantId, memberId, data) {
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')
  return prisma.gymMember.update({
    where: { id: memberId },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName.trim() }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.birthDate !== undefined && { birthDate: data.birthDate ? new Date(data.birthDate) : null }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact }),
      ...(data.emergencyPhone !== undefined && { emergencyPhone: data.emergencyPhone }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })
}

async function removeMember(tenantId, memberId) {
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')
  // ✅ Pa efase definitivman si gen istwa peman/abònman — dezaktive sèlman
  const hasHistory = await prisma.gymPayment.count({ where: { memberId } })
  if (hasHistory > 0) {
    await prisma.gymMember.update({ where: { id: memberId }, data: { isActive: false } })
    return { softDeleted: true }
  }
  await prisma.gymMember.delete({ where: { id: memberId } })
  return { softDeleted: false }
}

// ─────────────────────────────────────────────────────────────
// MEMBERSHIPS (achte / renouvle abònman)
// ─────────────────────────────────────────────────────────────
async function createMembership(tenantId, memberId, userId, data) {
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')

  const { planId, startDate, amountPaid, method, notes } = data
  let endDate = null
  let priceHtg = Number(data.priceHtg || 0)

  if (planId) {
    const plan = await prisma.gymPlan.findFirst({ where: { id: planId, tenantId } })
    if (!plan) throw new Error('Plan pa jwenn.')
    const start = startDate ? new Date(startDate) : new Date()
    endDate = addDays(start, plan.durationDays)
    priceHtg = Number(plan.priceHtg)
  }

  const start = startDate ? new Date(startDate) : new Date()

  const membership = await prisma.gymMembership.create({
    data: {
      tenantId, memberId, planId: planId || null,
      startDate: start, endDate, priceHtg,
      status: 'active', notes: notes || null, createdBy: userId,
    },
  })

  // ✅ Si yon montan peye bay, anrejistre peman an tou dirèkteman
  if (amountPaid !== undefined && Number(amountPaid) > 0) {
    await prisma.gymPayment.create({
      data: {
        tenantId, memberId, membershipId: membership.id,
        amountHtg: Number(amountPaid), method: method || 'cash',
        type: 'membership', createdBy: userId,
      },
    })
  }

  return membership
}

async function getMemberships(tenantId, memberId) {
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')
  return prisma.gymMembership.findMany({
    where: { memberId },
    include: { plan: { select: { name: true, durationDays: true } }, payments: true },
    orderBy: { createdAt: 'desc' },
  })
}

async function cancelMembership(tenantId, membershipId) {
  const membership = await prisma.gymMembership.findFirst({ where: { id: membershipId, tenantId } })
  if (!membership) throw new Error('Abònman pa jwenn.')
  return prisma.gymMembership.update({ where: { id: membershipId }, data: { status: 'cancelled' } })
}

// ─────────────────────────────────────────────────────────────
// CHECK-IN
// ─────────────────────────────────────────────────────────────
async function checkIn(tenantId, branchId, memberId, userId, data = {}) {
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')
  if (!member.isActive) throw new Error('Manm sa inaktif — pa ka antre.')

  // ✅ Verifye si manm nan gen yon abònman aktif ki poko ekspire
  const today = todayDateOnly()
  const activeMembership = await prisma.gymMembership.findFirst({
    where: {
      memberId, status: 'active',
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
    orderBy: { endDate: 'desc' },
  })

  const checkInRecord = await prisma.gymCheckIn.create({
    data: {
      tenantId, branchId: branchId || null, memberId,
      method: data.method || 'manual', createdBy: userId,
    },
  })

  return {
    checkIn: checkInRecord,
    hasActiveMembership: !!activeMembership,
    warning: activeMembership ? null : 'Manm sa PA GEN abònman aktif — verifye si l dwe peye pa vizit.',
  }
}

async function checkOut(tenantId, checkInId) {
  const record = await prisma.gymCheckIn.findFirst({ where: { id: checkInId, tenantId } })
  if (!record) throw new Error('Antre pa jwenn.')
  return prisma.gymCheckIn.update({ where: { id: checkInId }, data: { checkOutAt: new Date() } })
}

async function getCheckIns(tenantId, branchId, params = {}) {
  const { memberId, date, page = 1, limit = 50 } = params
  const skip = (Number(page) - 1) * Number(limit)
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(memberId && { memberId }),
    ...(date && {
      checkInAt: {
        gte: new Date(`${date}T00:00:00`),
        lt: new Date(`${date}T23:59:59`),
      },
    }),
  }
  const [checkIns, total] = await Promise.all([
    prisma.gymCheckIn.findMany({
      where,
      include: { member: { select: { id: true, fullName: true, phone: true, photoUrl: true } } },
      orderBy: { checkInAt: 'desc' },
      skip, take: Number(limit),
    }),
    prisma.gymCheckIn.count({ where }),
  ])
  return { checkIns, total, page: Number(page), limit: Number(limit) }
}

// ─────────────────────────────────────────────────────────────
// PAYMENTS / KÈS
// ─────────────────────────────────────────────────────────────
async function addPayment(tenantId, memberId, userId, data) {
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')
  const { amountHtg, method, type, reference, notes, membershipId } = data
  if (!amountHtg || Number(amountHtg) <= 0) throw new Error('Montan peman obligatwa.')

  return prisma.gymPayment.create({
    data: {
      tenantId, memberId, membershipId: membershipId || null,
      amountHtg: Number(amountHtg), method: method || 'cash',
      type: type || 'visit', reference: reference || null, notes: notes || null,
      createdBy: userId,
    },
  })
}

async function getPayments(tenantId, params = {}) {
  const { memberId, from, to, page = 1, limit = 50 } = params
  const skip = (Number(page) - 1) * Number(limit)
  const where = {
    tenantId,
    ...(memberId && { memberId }),
    ...(from && to && { createdAt: { gte: new Date(from), lt: new Date(to) } }),
  }
  const [payments, total, totalAgg] = await Promise.all([
    prisma.gymPayment.findMany({
      where,
      include: { member: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take: Number(limit),
    }),
    prisma.gymPayment.count({ where }),
    prisma.gymPayment.aggregate({ where, _sum: { amountHtg: true } }),
  ])
  return { payments, total, page: Number(page), limit: Number(limit), totalAmount: Number(totalAgg._sum.amountHtg || 0) }
}

// ─────────────────────────────────────────────────────────────
// CLASSES & TRAINERS (klas & antrenè)
// ─────────────────────────────────────────────────────────────
async function getClasses(tenantId, branchId) {
  const classes = await prisma.gymClass.findMany({
    where: { tenantId, ...(branchId && { branchId }) },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { name: 'asc' },
  })
  return classes
}

async function createClass(tenantId, branchId, data) {
  const { name, trainerName, schedule, capacity } = data
  if (!name) throw new Error('Non klas obligatwa.')
  if (!trainerName) throw new Error('Non antrenè obligatwa.')
  return prisma.gymClass.create({
    data: {
      tenantId, branchId: branchId || null,
      name: name.trim(), trainerName: trainerName.trim(),
      schedule: schedule || [], capacity: capacity ? Number(capacity) : null,
    },
  })
}

async function updateClass(tenantId, classId, data) {
  const cls = await prisma.gymClass.findFirst({ where: { id: classId, tenantId } })
  if (!cls) throw new Error('Klas pa jwenn.')
  return prisma.gymClass.update({
    where: { id: classId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.trainerName !== undefined && { trainerName: data.trainerName.trim() }),
      ...(data.schedule !== undefined && { schedule: data.schedule }),
      ...(data.capacity !== undefined && { capacity: data.capacity ? Number(data.capacity) : null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })
}

async function deleteClass(tenantId, classId) {
  const cls = await prisma.gymClass.findFirst({ where: { id: classId, tenantId } })
  if (!cls) throw new Error('Klas pa jwenn.')
  await prisma.gymClass.delete({ where: { id: classId } })
}

async function enrollMember(tenantId, classId, memberId) {
  const cls = await prisma.gymClass.findFirst({ where: { id: classId, tenantId } })
  if (!cls) throw new Error('Klas pa jwenn.')
  const member = await prisma.gymMember.findFirst({ where: { id: memberId, tenantId } })
  if (!member) throw new Error('Manm pa jwenn.')

  if (cls.capacity) {
    const count = await prisma.gymClassEnrollment.count({ where: { classId } })
    if (count >= cls.capacity) throw new Error('Klas sa a plen.')
  }

  const exists = await prisma.gymClassEnrollment.findFirst({ where: { classId, memberId } })
  if (exists) throw new Error('Manm sa deja enskri nan klas sa a.')

  return prisma.gymClassEnrollment.create({ data: { tenantId, classId, memberId } })
}

async function unenrollMember(tenantId, classId, memberId) {
  const enrollment = await prisma.gymClassEnrollment.findFirst({ where: { classId, memberId, tenantId } })
  if (!enrollment) throw new Error('Enskripsyon pa jwenn.')
  await prisma.gymClassEnrollment.delete({ where: { id: enrollment.id } })
}

async function getClassMembers(tenantId, classId) {
  const cls = await prisma.gymClass.findFirst({ where: { id: classId, tenantId } })
  if (!cls) throw new Error('Klas pa jwenn.')
  const enrollments = await prisma.gymClassEnrollment.findMany({
    where: { classId },
    include: { member: { select: { id: true, fullName: true, phone: true, photoUrl: true } } },
    orderBy: { enrolledAt: 'asc' },
  })
  return enrollments.map(e => e.member)
}

module.exports = {
  getStats,
  getPlans, createPlan, updatePlan, deletePlan,
  getMembers, getMemberById, addMember, updateMember, removeMember,
  createMembership, getMemberships, cancelMembership,
  checkIn, checkOut, getCheckIns,
  addPayment, getPayments,
  getClasses, createClass, updateClass, deleteClass,
  enrollMember, unenrollMember, getClassMembers,
}
