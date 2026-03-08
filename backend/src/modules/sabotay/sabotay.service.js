// backend/src/modules/sabotay/sabotay.service.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function computePaymentDate(startDate, frequency, position, interval = 1) {
  const start = new Date(startDate)
  const pos   = position - 1 // 0-indexed

  switch (frequency) {
    case 'daily':
      start.setDate(start.getDate() + pos * interval)
      break
    case 'saturday':
      start.setDate(start.getDate() + pos * 7 * interval)
      break
    case 'weekly':
      start.setDate(start.getDate() + pos * 5 * interval)
      break
    case 'biweekly':
      start.setDate(start.getDate() + pos * 15 * interval)
      break
    case 'monthly':
      start.setMonth(start.getMonth() + pos * interval)
      break
    default:
      start.setDate(start.getDate() + pos * 7 * interval)
  }

  return start.toISOString().split('T')[0]
}

function getIntervalDays(frequency, interval = 1) {
  const base = { daily: 1, saturday: 7, weekly: 5, biweekly: 15, monthly: 30 }
  return (base[frequency] || 7) * interval
}

function computeCollectDate(startDate, frequency, position, totalMembers, interval = 1) {
  const start    = new Date(startDate)
  const days     = getIntervalDays(frequency, interval)
  start.setDate(start.getDate() + position * days)
  return start.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────
async function getStats(tenantId, branchId) {
  const where = { tenantId, ...(branchId && { branchId }) }

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

  const fundsAgg = await prisma.sabotayPayment.aggregate({
    where: { plan: { tenantId } },
    _sum: { amount: true }
  })

  return {
    totalPlans, activePlans, totalMembers, paymentsToday,
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
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
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
            payments: { select: { id: true, dueDate: true, paidAt: true, amount: true } }
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
        include: { payments: { orderBy: { dueDate: 'asc' } } },
        orderBy: { position: 'asc' },
      },
      payments: {
        include: {
          member:  { select: { id: true, name: true, phone: true, position: true } },
          creator: { select: { fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
    }
  })

  if (!plan) throw new Error('Plan pa jwenn.')
  return plan
}

// ✅ FIX: ajoute nouvo kolòn schema (feePerMember, penalty, interval, dueTime, regleman)
async function createPlan(tenantId, branchId, userId, data) {
  const {
    name, frequency, amount, maxMembers, fee, startDate, notes,
    // Nouvo kolòn
    feePerMember, penalty, interval, dueTime, regleman,
  } = data

  if (!name)      throw new Error('Non plan obligatwa.')
  if (!frequency) throw new Error('Frekans obligatwa.')
  if (!amount || Number(amount) <= 0) throw new Error('Montan dwe plis ke 0.')
  if (!maxMembers || Number(maxMembers) < 2) throw new Error('Dwe gen omwen 2 manm.')

  const plan = await prisma.sabotayPlan.create({
    data: {
      tenantId,
      branchId:     branchId || null,
      name:         name.trim(),
      frequency,
      amount:       Number(amount),
      maxMembers:   Number(maxMembers),
      fee:          Number(fee || 0),
      startDate:    startDate ? new Date(startDate) : new Date(),
      notes:        notes    || null,
      status:       'active',
      createdBy:    userId,
      // ✅ Nouvo kolòn
      feePerMember: Number(feePerMember || 0),
      penalty:      Number(penalty      || 0),
      interval:     Number(interval     || 1),
      dueTime:      dueTime   || '08:00',
      regleman:     regleman  || null,
    },
    include: {
      creator: { select: { fullName: true } },
      _count: { select: { members: true } },
    }
  })

  return plan
}

// ✅ FIX: ajoute nouvo kolòn nan updatePlan tou
async function updatePlan(tenantId, planId, userId, data) {
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const updated = await prisma.sabotayPlan.update({
    where: { id: planId },
    data: {
      ...(data.name        && { name: data.name.trim() }),
      ...(data.status      && { status: data.status }),
      ...(data.notes       !== undefined && { notes: data.notes }),
      ...(data.fee         !== undefined && { fee: Number(data.fee) }),
      ...(data.maxMembers  && { maxMembers: Number(data.maxMembers) }),
      // ✅ Nouvo kolòn
      ...(data.feePerMember !== undefined && { feePerMember: Number(data.feePerMember) }),
      ...(data.penalty      !== undefined && { penalty:      Number(data.penalty) }),
      ...(data.interval     !== undefined && { interval:     Number(data.interval) }),
      ...(data.dueTime      !== undefined && { dueTime:      data.dueTime }),
      ...(data.regleman     !== undefined && { regleman:     data.regleman }),
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

  const paymentCount = await prisma.sabotayPayment.count({ where: { planId } })
  if (paymentCount > 0) throw new Error('Pa ka efase yon plan ki gen peman deja. Mete l inaktif olye.')

  await prisma.sabotayPlan.delete({ where: { id: planId } })
}

// ─────────────────────────────────────────────────────────────
// TIRAJ AVÈG (BLIND DRAW)
// ─────────────────────────────────────────────────────────────
// ✅ NOUVO: chwazi yon manm pou touche sol la, mete hasWon = true
async function blindDraw(tenantId, planId, userId, data) {
  const { winnerId } = data

  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { members: { where: { isActive: true, hasWon: false } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  // Si winnerId bay dirèkteman (admin chwazi), sinon chwazi yon manm owaza
  let winner
  if (winnerId) {
    winner = await prisma.sabotayMember.findFirst({
      where: { id: winnerId, planId, isActive: true }
    })
    if (!winner) throw new Error('Manm pa jwenn.')
  } else {
    // Chwazi owaza nan manm ki poko touche
    const eligible = plan.members.filter(m => !m.hasWon)
    if (!eligible.length) throw new Error('Tout manm fin touche deja.')
    winner = eligible[Math.floor(Math.random() * eligible.length)]
  }

  // Mete hasWon = true pou gagnant la
  const updatedWinner = await prisma.sabotayMember.update({
    where: { id: winner.id },
    data:  { hasWon: true },
  })

  // Kalkile payout
  const totalMembers  = plan.members.length
  const feePerMember  = Number(plan.feePerMember || 0)
  const amount        = Number(plan.amount)
  const pool          = amount * totalMembers
  const payout        = pool - feePerMember

  // Notifye admins
  await _checkAndNotifyCollection(tenantId, plan, new Date().toISOString().split('T')[0])

  return {
    winner: updatedWinner,
    payout,
    pool,
    feePerMember,
    message: `${updatedWinner.name} ap touche ${payout.toLocaleString('fr-HT')} HTG!`,
  }
}

// ─────────────────────────────────────────────────────────────
// MANM
// ─────────────────────────────────────────────────────────────
async function getMembers(tenantId, planId) {
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

// ✅ FIX: ajoute isOwnerSlot, hasWon, fines sou addMember
async function addMember(tenantId, planId, userId, data) {
  const { name, phone, position, notes, isOwnerSlot, hasWon, fines } = data

  if (!name)     throw new Error('Non manm obligatwa.')
  if (!phone)    throw new Error('Telefòn manm obligatwa.')
  if (!position) throw new Error('Pozisyon obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { _count: { select: { members: { where: { isActive: true } } } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  // ✅ Kalkile totalSlots: si feePerMember === amount → plas pwopriyetè ajoute
  const ownerSlot    = Number(plan.feePerMember || 0) === Number(plan.amount) ? 1 : 0
  const maxSlots     = plan.maxMembers + ownerSlot
  const currentCount = plan._count.members

  if (currentCount >= maxSlots) {
    throw new Error(`Plan plen! Maks ${maxSlots} manm rive.`)
  }

  // Verifye pozisyon pa pran
  const posExists = await prisma.sabotayMember.findFirst({
    where: { planId, position: Number(position), isActive: true }
  })
  if (posExists) throw new Error(`Pozisyon #${position} deja pran pa ${posExists.name}.`)

  const dueDate     = computePaymentDate(plan.startDate, plan.frequency, Number(position), Number(plan.interval || 1))
  const collectDate = computeCollectDate(plan.startDate, plan.frequency, Number(position), plan.maxMembers, Number(plan.interval || 1))

  const member = await prisma.sabotayMember.create({
    data: {
      planId,
      name:        name.trim(),
      phone:       phone.trim(),
      position:    Number(position),
      dueDate:     new Date(dueDate),
      collectDate: new Date(collectDate),
      notes:       notes       || null,
      isActive:    true,
      createdBy:   userId,
      // ✅ Nouvo kolòn
      isOwnerSlot: isOwnerSlot || false,
      hasWon:      hasWon      || false,
      fines:       fines       || {},
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
      ...(data.name       && { name: data.name.trim() }),
      ...(data.phone      && { phone: data.phone.trim() }),
      ...(data.notes      !== undefined && { notes: data.notes }),
      ...(data.isActive   !== undefined && { isActive: data.isActive }),
      ...(data.hasWon     !== undefined && { hasWon: data.hasWon }),
      ...(data.fines      !== undefined && { fines: data.fines }),
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
    await prisma.sabotayMember.update({ where: { id: memberId }, data: { isActive: false } })
  } else {
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
  const { dueDate, method, notes, fineAmt, timing } = data

  if (!dueDate) throw new Error('Dat peman obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId, isActive: true }
  })
  if (!member) throw new Error('Manm pa jwenn oswa inaktif.')

  const exists = await prisma.sabotayPayment.findFirst({
    where: { planId, memberId, dueDate: new Date(dueDate) }
  })
  if (exists) throw new Error(`Peman pou dat ${dueDate} deja anrejistre pou manm sa.`)

  const payment = await prisma.sabotayPayment.create({
    data: {
      planId,
      memberId,
      amount:    Number(plan.amount),
      dueDate:   new Date(dueDate),
      paidAt:    new Date(),
      method:    method  || 'cash',
      notes:     notes   || null,
      createdBy: userId,
      // ✅ Nouvo kolòn
      fineAmt:   Number(fineAmt || 0),
      timing:    timing  || null,
    },
    include: {
      member:  { select: { id: true, name: true, phone: true, position: true } },
      creator: { select: { fullName: true } },
    }
  })

  // Si gen amand, mete ajou fines nan manm nan
  if (Number(fineAmt) > 0) {
    const currentFines = member.fines || {}
    const updatedFines = { ...currentFines, [dueDate]: Number(fineAmt) }
    await prisma.sabotayMember.update({
      where: { id: memberId },
      data:  { fines: updatedFines }
    })
  }

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
// KONT VITYÈL MANM
// ─────────────────────────────────────────────────────────────
// ✅ FIX: retounen nouvo kolòn (feePerMember, penalty, interval, regleman, hasWon, fines)
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

  const planInterval   = Number(plan.interval || 1)
  const feePerMember   = Number(plan.feePerMember || 0)
  const penaltyRate    = Number(plan.penalty || 0)
  const totalMembers   = plan.members.length
  const intervalDays   = getIntervalDays(plan.frequency, planInterval)
  const amount         = Number(plan.amount)
  const totalExpected  = amount * totalMembers
  const totalPaid      = member.payments.reduce((s, p) => s + Number(p.amount), 0)

  // Payout selon règ feePerMember
  let toCollect
  if (feePerMember === amount) {
    // Plas pwopriyetè — touche totalMembers × amount san deduksyon
    toCollect = member.isOwnerSlot ? amount * totalMembers : amount * totalMembers - feePerMember
  } else if (feePerMember > 0) {
    toCollect = amount * totalMembers - feePerMember
  } else {
    toCollect = amount * totalMembers - Number(plan.fee || 0)
  }

  const progressPct = totalMembers > 0
    ? Math.round((member.payments.length / totalMembers) * 100) : 0

  // Total amand pou manm sa
  const totalFines = Object.values(member.fines || {}).reduce((s, v) => s + Number(v), 0)

  const allDueDates = Array.from({ length: totalMembers }, (_, i) => {
    const d = new Date(plan.startDate)
    d.setDate(d.getDate() + i * intervalDays)
    return d.toISOString().split('T')[0]
  })

  const today = new Date().toISOString().split('T')[0]

  const paymentHistory = allDueDates.map((dueDate, i) => {
    const paid  = member.payments.find(p => p.dueDate.toISOString().split('T')[0] === dueDate)
    const isPast = dueDate <= today
    return {
      index:     i + 1,
      dueDate,
      amount,
      isPaid:    !!paid,
      isLate:    isPast && !paid,
      paidAt:    paid?.paidAt    || null,
      method:    paid?.method    || null,
      paymentId: paid?.id        || null,
      fineAmt:   paid?.fineAmt   || (member.fines?.[dueDate] || 0),
      timing:    paid?.timing    || null,
    }
  })

  return {
    plan: {
      id:          plan.id,
      name:        plan.name,
      frequency:   plan.frequency,
      amount,
      fee:         Number(plan.fee || 0),
      maxMembers:  plan.maxMembers,
      startDate:   plan.startDate,
      // ✅ Nouvo kolòn
      feePerMember,
      penalty:     penaltyRate,
      interval:    planInterval,
      dueTime:     plan.dueTime  || '08:00',
      regleman:    plan.regleman || null,
    },
    member: {
      id:          member.id,
      name:        member.name,
      phone:       member.phone,
      position:    member.position,
      dueDate:     member.dueDate,
      collectDate: member.collectDate,
      joinedAt:    member.createdAt,
      // ✅ Nouvo kolòn
      isOwnerSlot: member.isOwnerSlot || false,
      hasWon:      member.hasWon      || false,
      fines:       member.fines       || {},
    },
    summary: {
      totalExpected,
      totalPaid,
      remaining:   Math.max(0, totalExpected - totalPaid),
      toCollect,
      progressPct,
      paidCount:   member.payments.length,
      totalRounds: totalMembers,
      totalFines,
    },
    paymentHistory,
  }
}

// ─────────────────────────────────────────────────────────────
// NOTIFIKASYON ENTÈN
// ─────────────────────────────────────────────────────────────
async function _checkAndNotifyCollection(tenantId, plan, dueDate) {
  try {
    const totalActive = await prisma.sabotayMember.count({
      where: { planId: plan.id, isActive: true }
    })

    const paidCount = await prisma.sabotayPayment.count({
      where: { planId: plan.id, dueDate: new Date(dueDate) }
    })

    if (paidCount < totalActive) return

    const round = await prisma.sabotayPayment.count({
      where: { planId: plan.id, dueDate: { lte: new Date(dueDate) } }
    })
    const roundNum = Math.ceil(round / totalActive)

    const winner = await prisma.sabotayMember.findFirst({
      where: { planId: plan.id, position: roundNum, isActive: true }
    })
    if (!winner) return

    const admins = await prisma.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      select: { id: true }
    })

    const feePerMember     = Number(plan.feePerMember || 0)
    const amount           = Number(plan.amount)
    const collectionAmount = feePerMember === amount
      ? amount * totalActive  // plas pwopriyetè
      : amount * totalActive - Number(plan.fee || 0)

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
  blindDraw,
  getMembers,
  addMember,
  updateMember,
  removeMember,
  getPayments,
  markPaid,
  unmarkPaid,
  getMemberAccount,
}
