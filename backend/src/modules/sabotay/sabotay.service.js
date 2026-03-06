// backend/src/modules/sabotay/sabotay.service.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Kalkile dat peman selon frekans + pozisyon
function computePaymentDate(startDate, frequency, position) {
  const start = new Date(startDate)
  const pos   = position - 1 // 0-indexed

  switch (frequency) {
    case 'daily':
      start.setDate(start.getDate() + pos)
      break
    case 'saturday':
      // Chak samdi — pos samdi depi startDate
      start.setDate(start.getDate() + pos * 7)
      break
    case 'weekly':
      // Chak 5 jou (lendi-vandredi)
      start.setDate(start.getDate() + pos * 5)
      break
    case 'biweekly':
      start.setDate(start.getDate() + pos * 15)
      break
    case 'monthly':
      start.setMonth(start.getMonth() + pos)
      break
    default:
      start.setDate(start.getDate() + pos * 7)
  }

  return start.toISOString().split('T')[0]
}

// Interval an jou selon frekans
function getIntervalDays(frequency) {
  const map = { daily: 1, saturday: 7, weekly: 5, biweekly: 15, monthly: 30 }
  return map[frequency] || 7
}

// Kalkile dat koleksyon yon manm (pozisyon × interval apre startDate)
function computeCollectDate(startDate, frequency, position, totalMembers) {
  const start    = new Date(startDate)
  const interval = getIntervalDays(frequency)
  start.setDate(start.getDate() + position * interval)
  return start.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────
async function getStats(tenantId, branchId) {
  const where = {
    tenantId,
    ...(branchId && { branchId }),
  }

  const [totalPlans, activePlans, totalMembers, paymentsToday] = await Promise.all([
    prisma.sabotayPlan.count({ where }),
    prisma.sabotayPlan.count({ where: { ...where, status: 'active' } }),
    prisma.sabotayMember.count({
      where: { plan: { tenantId, ...(branchId && { branchId }) }, isActive: true }
    }),
    prisma.sabotayPayment.count({
      where: {
        plan: { tenantId },
        paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    }),
  ])

  // Total fon kolekte (tout peman aktif)
  const fundsAgg = await prisma.sabotayPayment.aggregate({
    where: { plan: { tenantId } },
    _sum: { amount: true }
  })

  return {
    totalPlans,
    activePlans,
    totalMembers,
    paymentsToday,
    totalFunds: Number(fundsAgg._sum.amount || 0),
  }
}

// ─────────────────────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────────────────────
async function getPlans(tenantId, branchId, params = {}) {
  const { search, status, page = 1, limit = 20 } = params
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(status && { status }),
    ...(search && {
      name: { contains: search, mode: 'insensitive' }
    }),
  }

  const [plans, total] = await Promise.all([
    prisma.sabotayPlan.findMany({
      where,
      include: {
        creator: { select: { fullName: true } },
        _count: { select: { members: true, payments: true } },
        members: {
          where: { isActive: true },
          include: {
            payments: {
              select: { id: true, dueDate: true, paidAt: true, amount: true }
            }
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.sabotayPlan.count({ where }),
  ])

  return { plans, total, page: Number(page), limit: Number(limit) }
}

async function getPlanById(tenantId, planId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      creator: { select: { fullName: true } },
      members: {
        where: { isActive: true },
        include: {
          payments: {
            orderBy: { dueDate: 'asc' },
          }
        },
        orderBy: { position: 'asc' },
      },
      payments: {
        include: {
          member: { select: { id: true, name: true, phone: true, position: true } },
          creator: { select: { fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
    }
  })

  if (!plan) throw new Error('Plan pa jwenn.')
  return plan
}

async function createPlan(tenantId, branchId, userId, data) {
  const { name, frequency, amount, maxMembers, fee, startDate, notes } = data

  if (!name)       throw new Error('Non plan obligatwa.')
  if (!frequency)  throw new Error('Frekans obligatwa.')
  if (!amount || Number(amount) <= 0) throw new Error('Montan dwe plis ke 0.')
  if (!maxMembers || Number(maxMembers) < 2) throw new Error('Dwe gen omwen 2 manm.')

  const plan = await prisma.sabotayPlan.create({
    data: {
      tenantId,
      branchId:   branchId || null,
      name:       name.trim(),
      frequency,
      amount:     Number(amount),
      maxMembers: Number(maxMembers),
      fee:        Number(fee || 0),
      startDate:  startDate ? new Date(startDate) : new Date(),
      notes:      notes || null,
      status:     'active',
      createdBy:  userId,
    },
    include: {
      creator: { select: { fullName: true } },
      _count: { select: { members: true } },
    }
  })

  return plan
}

async function updatePlan(tenantId, planId, userId, data) {
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const updated = await prisma.sabotayPlan.update({
    where: { id: planId },
    data: {
      ...(data.name       && { name: data.name.trim() }),
      ...(data.status     && { status: data.status }),
      ...(data.notes      !== undefined && { notes: data.notes }),
      ...(data.fee        !== undefined && { fee: Number(data.fee) }),
      ...(data.maxMembers && { maxMembers: Number(data.maxMembers) }),
    },
    include: {
      creator: { select: { fullName: true } },
      _count: { select: { members: true } },
    }
  })

  return updated
}

async function deletePlan(tenantId, planId) {
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  // Verifye pa gen peman deja
  const paymentCount = await prisma.sabotayPayment.count({ where: { planId } })
  if (paymentCount > 0) throw new Error('Pa ka efase yon plan ki gen peman deja. Mete l inaktif olye.')

  await prisma.sabotayPlan.delete({ where: { id: planId } })
}

// ─────────────────────────────────────────────────────────────
// MANM
// ─────────────────────────────────────────────────────────────
async function getMembers(tenantId, planId) {
  // Verifye plan existe
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const members = await prisma.sabotayMember.findMany({
    where: { planId, isActive: true },
    include: {
      payments: { orderBy: { dueDate: 'asc' } },
      creator:  { select: { fullName: true } },
    },
    orderBy: { position: 'asc' },
  })

  return members
}

async function addMember(tenantId, planId, userId, data) {
  const { name, phone, position, notes } = data

  if (!name)     throw new Error('Non manm obligatwa.')
  if (!phone)    throw new Error('Telefòn manm obligatwa.')
  if (!position) throw new Error('Pozisyon obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { _count: { select: { members: { where: { isActive: true } } } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  // Verifye plan pa plen
  if (plan._count.members >= plan.maxMembers) {
    throw new Error(`Plan plen! Maks ${plan.maxMembers} manm rive.`)
  }

  // Verifye pozisyon pa pran
  const posExists = await prisma.sabotayMember.findFirst({
    where: { planId, position: Number(position), isActive: true }
  })
  if (posExists) throw new Error(`Pozisyon #${position} deja pran pa ${posExists.name}.`)

  // Kalkile dat peman ak koleksyon pou manm sa
  const totalMembers = plan._count.members + 1 // apre ajout
  const dueDate      = computePaymentDate(plan.startDate, plan.frequency, Number(position))
  const collectDate  = computeCollectDate(plan.startDate, plan.frequency, Number(position), plan.maxMembers)

  const member = await prisma.sabotayMember.create({
    data: {
      planId,
      name:        name.trim(),
      phone:       phone.trim(),
      position:    Number(position),
      dueDate:     new Date(dueDate),
      collectDate: new Date(collectDate),
      notes:       notes || null,
      isActive:    true,
      createdBy:   userId,
    },
    include: {
      payments: true,
      creator:  { select: { fullName: true } },
    }
  })

  return member
}

async function updateMember(tenantId, planId, memberId, data) {
  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId, plan: { tenantId } }
  })
  if (!member) throw new Error('Manm pa jwenn.')

  const updated = await prisma.sabotayMember.update({
    where: { id: memberId },
    data: {
      ...(data.name  && { name: data.name.trim() }),
      ...(data.phone && { phone: data.phone.trim() }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: { payments: true }
  })

  return updated
}

async function removeMember(tenantId, planId, memberId) {
  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId, plan: { tenantId } },
    include: { _count: { select: { payments: true } } }
  })
  if (!member) throw new Error('Manm pa jwenn.')

  if (member._count.payments > 0) {
    // Soft delete si gen peman — mete inaktif sèlman
    await prisma.sabotayMember.update({
      where: { id: memberId },
      data: { isActive: false }
    })
  } else {
    // Pa gen peman — efase nèt
    await prisma.sabotayMember.delete({ where: { id: memberId } })
  }
}

// ─────────────────────────────────────────────────────────────
// PEMAN
// ─────────────────────────────────────────────────────────────
async function getPayments(tenantId, planId, params = {}) {
  const { memberId, month, year } = params

  const where = {
    planId,
    plan: { tenantId },
    ...(memberId && { memberId }),
    ...(month && year && {
      dueDate: {
        gte: new Date(`${year}-${String(month).padStart(2,'0')}-01`),
        lt:  new Date(`${year}-${String(Number(month)+1).padStart(2,'0')}-01`),
      }
    }),
  }

  const payments = await prisma.sabotayPayment.findMany({
    where,
    include: {
      member:  { select: { id: true, name: true, phone: true, position: true } },
      creator: { select: { fullName: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  return payments
}

async function markPaid(tenantId, planId, memberId, userId, data) {
  const { dueDate, method, notes } = data

  if (!dueDate) throw new Error('Dat peman obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId, isActive: true }
  })
  if (!member) throw new Error('Manm pa jwenn oswa inaktif.')

  // Verifye pa gen doublòn pou menm dat
  const exists = await prisma.sabotayPayment.findFirst({
    where: { planId, memberId, dueDate: new Date(dueDate) }
  })
  if (exists) throw new Error(`Peman pou dat ${dueDate} deja anrejistre pou manm sa.`)

  const payment = await prisma.sabotayPayment.create({
    data: {
      planId,
      memberId,
      amount:  Number(plan.amount),
      dueDate: new Date(dueDate),
      paidAt:  new Date(),
      method:  method || 'cash',
      notes:   notes  || null,
      createdBy: userId,
    },
    include: {
      member:  { select: { id: true, name: true, phone: true, position: true } },
      creator: { select: { fullName: true } },
    }
  })

  // ── Notifikasyon: si tout manm fin peye pou dat sa,
  //    moun ki pozisyon koresponn nan ap resevwa notifikasyon
  await _checkAndNotifyCollection(tenantId, plan, dueDate)

  return payment
}

async function unmarkPaid(tenantId, paymentId) {
  const payment = await prisma.sabotayPayment.findFirst({
    where: { id: paymentId, plan: { tenantId } }
  })
  if (!payment) throw new Error('Peman pa jwenn.')

  await prisma.sabotayPayment.delete({ where: { id: paymentId } })
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL MANM (lekti sèlman)
// ─────────────────────────────────────────────────────────────
async function getMemberAccount(tenantId, planId, memberId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      members: {
        where: { isActive: true },
        select: { id: true }
      }
    }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId },
    include: {
      payments: {
        orderBy: { dueDate: 'asc' },
        include: { creator: { select: { fullName: true } } }
      }
    }
  })
  if (!member) throw new Error('Manm pa jwenn.')

  const totalMembers   = plan.members.length
  const interval       = getIntervalDays(plan.frequency)
  const totalExpected  = Number(plan.amount) * totalMembers
  const totalPaid      = member.payments.reduce((s, p) => s + Number(p.amount), 0)
  const toCollect      = Number(plan.amount) * totalMembers - Number(plan.fee)
  const progressPct    = totalMembers > 0
    ? Math.round((member.payments.length / totalMembers) * 100) : 0

  // Tout dat li sipoze te peye (1 peman pa sèl mwa/semèn/jou)
  const allDueDates = Array.from({ length: totalMembers }, (_, i) => {
    const d = new Date(plan.startDate)
    d.setDate(d.getDate() + i * interval)
    return d.toISOString().split('T')[0]
  })

  const today = new Date().toISOString().split('T')[0]

  const paymentHistory = allDueDates.map((dueDate, i) => {
    const paid = member.payments.find(
      p => p.dueDate.toISOString().split('T')[0] === dueDate
    )
    const isPast = dueDate <= today
    return {
      index:   i + 1,
      dueDate,
      amount:  Number(plan.amount),
      isPaid:  !!paid,
      isLate:  isPast && !paid,
      paidAt:  paid?.paidAt || null,
      method:  paid?.method || null,
      paymentId: paid?.id || null,
    }
  })

  return {
    plan: {
      id:         plan.id,
      name:       plan.name,
      frequency:  plan.frequency,
      amount:     Number(plan.amount),
      fee:        Number(plan.fee),
      maxMembers: plan.maxMembers,
      startDate:  plan.startDate,
    },
    member: {
      id:          member.id,
      name:        member.name,
      phone:       member.phone,
      position:    member.position,
      dueDate:     member.dueDate,
      collectDate: member.collectDate,
      joinedAt:    member.createdAt,
    },
    summary: {
      totalExpected,
      totalPaid,
      remaining:   Math.max(0, totalExpected - totalPaid),
      toCollect,
      progressPct,
      paidCount:   member.payments.length,
      totalRounds: totalMembers,
    },
    paymentHistory,
  }
}

// ─────────────────────────────────────────────────────────────
// NOTIFIKASYON ENTÈN — lè tout manm fin peye yon roud
// ─────────────────────────────────────────────────────────────
async function _checkAndNotifyCollection(tenantId, plan, dueDate) {
  try {
    // Konte kantite manm aktif
    const totalActive = await prisma.sabotayMember.count({
      where: { planId: plan.id, isActive: true }
    })

    // Konte peman pou dat sa (yon sèl peman pa manm)
    const paidCount = await prisma.sabotayPayment.count({
      where: { planId: plan.id, dueDate: new Date(dueDate) }
    })

    if (paidCount < totalActive) return // Pako tout moun fin peye

    // Jwenn moun k ap touche — pozisyon koresponn ak roud la
    const round = await prisma.sabotayPayment.count({
      where: {
        planId: plan.id,
        dueDate: { lte: new Date(dueDate) },
      }
    })
    // round / totalActive = nimewo roud la
    const roundNum = Math.ceil(round / totalActive)

    const winner = await prisma.sabotayMember.findFirst({
      where: { planId: plan.id, position: roundNum, isActive: true }
    })

    if (!winner) return

    // Kreye notifikasyon pou tout admin tenant an
    const admins = await prisma.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      select: { id: true }
    })

    const collectionAmount = Number(plan.amount) * totalActive - Number(plan.fee)

    await Promise.all(admins.map(admin =>
      prisma.notification.create({
        data: {
          tenantId,
          userId:    admin.id,
          type:      'sabotay_collection',
          titleHt:   `🏆 Sol Konplè — ${plan.name}`,
          titleFr:   `🏆 Sol Complété — ${plan.name}`,
          titleEn:   `🏆 Sol Round Complete — ${plan.name}`,
          messageHt: `Tout manm fin peye. ${winner.name} (Pozisyon #${winner.position}) ap touche ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
          messageFr: `Tous les membres ont payé. ${winner.name} (Position #${winner.position}) reçoit ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
          messageEn: `All members paid. ${winner.name} (Position #${winner.position}) collects ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
          entityType: 'sabotay_plan',
          entityId:   plan.id,
        }
      })
    ))
  } catch (err) {
    // Notifikasyon pa dwe bloke peman an
    console.error('[sabotay] Notifikasyon erè:', err.message)
  }
}

module.exports = {
  getStats,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getMembers,
  addMember,
  updateMember,
  removeMember,
  getPayments,
  markPaid,
  unmarkPaid,
  getMemberAccount,
}
