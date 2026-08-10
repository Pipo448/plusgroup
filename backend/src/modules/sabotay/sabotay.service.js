// backend/src/modules/sabotay/sabotay.service.js
// ✅ FIX: `isLate` nan getMemberAccount respekte `dueTimeEnd`
//        konsistan ak fix nan position-ranking.service.js
const prisma = require('../../config/prisma')// ✅ Import rankingSvc pou timing granulè + helpers
const rankingSvc = require('./position-ranking.service')

function computePaymentDate(startDate, frequency, position, interval = 1) {
  const start = new Date(startDate)
  const pos   = position - 1
  switch (frequency) {
    case 'daily':           start.setDate(start.getDate() + pos * interval); break
    case 'saturday':
    case 'weekly_saturday': start.setDate(start.getDate() + pos * 7 * interval); break
    case 'weekly':
    case 'weekly_monday':   start.setDate(start.getDate() + pos * 5 * interval); break
    case 'biweekly':        start.setDate(start.getDate() + pos * 15 * interval); break
    case 'monthly':         start.setMonth(start.getMonth() + pos * interval); break
    case 'weekdays':        start.setDate(start.getDate() + pos * interval); break
    default:                start.setDate(start.getDate() + pos * 7 * interval)
  }
  return start.toISOString().split('T')[0]
}

function getIntervalDays(frequency, interval = 1) {
  const base = {
    daily: 1, saturday: 7, weekly_saturday: 7,
    weekly: 5, weekly_monday: 5, biweekly: 15,
    monthly: 30, weekdays: 1,
  }
  return (base[frequency] || 7) * interval
}

function computeCollectDate(startDate, frequency, position, totalMembers, interval = 1) {
  const start = new Date(startDate)
  const days  = getIntervalDays(frequency, interval)
  start.setDate(start.getDate() + position * days)
  return start.toISOString().split('T')[0]
}

function generateUsername(name, position) {
  const first = name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(' ')[0].replace(/[^a-z0-9]/g, '')
  const pos = String(position).padStart(4, '0')
  return `${first}${pos}`
}

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < length; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
  return pass
}

function getTenantPrefix(tenantId) {
  return String(tenantId || 'tn').slice(0, 8)
}

async function getStats(tenantId, branchId) {
  const where = { tenantId, ...(branchId && { branchId }) }

  // Minwi Ayiti (UTC-5) = 5 AM UTC
  const nowUtc    = new Date()
  const haitiNow  = new Date(nowUtc.getTime() - 5 * 60 * 60 * 1000)
  const haitiMidnight = new Date(Date.UTC(
    haitiNow.getUTCFullYear(),
    haitiNow.getUTCMonth(),
    haitiNow.getUTCDate(),
    5, 0, 0, 0,
  ))

  const [totalPlans, activePlans, totalMembers, paymentsToday] = await Promise.all([
    prisma.sabotayPlan.count({ where }),
    prisma.sabotayPlan.count({ where: { ...where, status: 'active' } }),
    prisma.sabotayMember.count({ where: { plan: { tenantId, ...(branchId && { branchId }) }, isActive: true } }),
    prisma.sabotayPayment.count({
      where: {
        plan: { tenantId },
        paidDate: { gte: haitiMidnight }
      }
    }),
  ])

  const fundsAgg = await prisma.sabotayPayment.aggregate({
    where: { plan: { tenantId } },
    _sum: { amount: true }
  })

  return {
    totalPlans, activePlans, totalMembers, paymentsToday,
    totalFunds: Number(fundsAgg._sum.amount || 0)
  }
}

async function getPlans(tenantId, branchId, params = {}) {
  const { search, status, page = 1, limit = 20 } = params
  const skip = (Number(page) - 1) * Number(limit)
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(status   && { status }),
    ...(search   && { name: { contains: search, mode: 'insensitive' } }),
  }
  const [plans, total] = await Promise.all([
    prisma.sabotayPlan.findMany({
      where,
      include: {
        creator: { select: { fullName: true } },
        _count:  { select: { members: true, payments: true } },
        members: {
          where:   { isActive: true },
          include: { payments: { select: { id: true, dueDate: true, paidDate: true, amount: true, timing: true, fineAmt: true } } },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.sabotayPlan.count({ where }),
  ])

  const plansFormatted = await Promise.all(plans.map(async plan => ({
    ...plan,
    members: await Promise.all(plan.members.map(async member => {
      const payments = {}, paymentTimings = {}
      for (const p of member.payments) {
        const dateKey = new Date(p.dueDate).toISOString().split('T')[0]
        payments[dateKey] = true
        paymentTimings[dateKey] = p.timing || 'onTime'
      }
      const solAccount = await prisma.solMemberAccount.findFirst({
        where: { tenantId, memberPhone: member.phone },
        select: { username: true, plainPassword: true }
      })
      return {
        ...member, payments, paymentTimings,
        _credentials: solAccount ? { username: solAccount.username, password: solAccount.plainPassword } : null
      }
    }))
  })))
  return { plans: plansFormatted, total, page: Number(page), limit: Number(limit) }
}

async function getPlanById(tenantId, planId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      creator: { select: { fullName: true } },
      members: { where: { isActive: true }, include: { payments: { orderBy: { dueDate: 'asc' } } }, orderBy: { position: 'asc' } },
      payments: { include: { member: { select: { id: true, name: true, phone: true, position: true } }, creator: { select: { fullName: true } } }, orderBy: { dueDate: 'asc' } },
    }
  })
  if (!plan) throw new Error('Plan pa jwenn.')
  return plan
}

async function createPlan(tenantId, branchId, userId, data) {
 const { name, frequency, amount, maxMembers, fee, startDate, notes, feePerMember, penalty, interval, dueTime, dueTimeEnd, regleman, stopPenaltyAmount } = data
  if (!name)      throw new Error('Non plan obligatwa.')
  if (!frequency) throw new Error('Frekans obligatwa.')
  if (!amount || Number(amount) <= 0) throw new Error('Montan dwe plis ke 0.')
  if (!maxMembers || Number(maxMembers) < 2) throw new Error('Dwe gen omwen 2 manm.')

  const plan = await prisma.sabotayPlan.create({
    data: {
      tenantId, branchId: branchId || null, name: name.trim(), frequency,
      amount: Number(amount), maxMembers: Number(maxMembers), fee: Number(fee || 0),
      startDate: startDate ? new Date(startDate) : new Date(),
      notes: notes || null, status: 'active', createdBy: userId,
      feePerMember: Number(feePerMember || 0), penalty: Number(penalty || 0),
      interval: Number(interval || 1), dueTime: dueTime || '08:00',
      dueTimeEnd: dueTimeEnd || '15:00', regleman: regleman || null,
      stopPenaltyAmount: Number(stopPenaltyAmount || 0),
    },
    include: { creator: { select: { fullName: true } }, _count: { select: { members: true } } }
  })
  return plan
}

async function updatePlan(tenantId, planId, userId, data) {
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')
  const updated = await prisma.sabotayPlan.update({
    where: { id: planId },
    data: {
      ...(data.name         && { name: data.name.trim() }),
      ...(data.status       && { status: data.status }),
      ...(data.notes        !== undefined && { notes: data.notes }),
      ...(data.fee          !== undefined && { fee: Number(data.fee) }),
      ...(data.maxMembers   && { maxMembers: Number(data.maxMembers) }),
      ...(data.startDate    && { startDate: new Date(data.startDate) }),
      ...(data.feePerMember !== undefined && { feePerMember: Number(data.feePerMember) }),
      ...(data.penalty      !== undefined && { penalty: Number(data.penalty) }),
      ...(data.interval     !== undefined && { interval: Number(data.interval) }),
      ...(data.dueTime      !== undefined && { dueTime: data.dueTime }),
      ...(data.dueTimeEnd   !== undefined && { dueTimeEnd: data.dueTimeEnd }),
      ...(data.regleman     !== undefined && { regleman: data.regleman }),
      ...(data.stopPenaltyAmount !== undefined && { stopPenaltyAmount: Number(data.stopPenaltyAmount) }),
    },
    include: { creator: { select: { fullName: true } }, _count: { select: { members: true } } }
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

async function blindDraw(tenantId, planId, userId, data) {
  const { winnerId } = data
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { members: { where: { isActive: true, hasWon: false } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')
  let winner
  if (winnerId) {
    winner = await prisma.sabotayMember.findFirst({ where: { id: winnerId, planId, isActive: true } })
    if (!winner) throw new Error('Manm pa jwenn.')
  } else {
    const eligible = plan.members.filter(m => !m.hasWon)
    if (!eligible.length) throw new Error('Tout manm fin touche deja.')
    winner = eligible[Math.floor(Math.random() * eligible.length)]
  }
  const updatedWinner = await prisma.sabotayMember.update({ where: { id: winner.id }, data: { hasWon: true } })
  const totalMembers = plan.members.length
  const feePerMember = Number(plan.feePerMember || 0)
  const amount = Number(plan.amount)
  const pool = amount * totalMembers
  const payout = pool - feePerMember
  await _checkAndNotifyCollection(tenantId, plan, new Date().toISOString().split('T')[0])
  return { winner: updatedWinner, payout, pool, feePerMember, message: `${updatedWinner.name} ap touche ${payout.toLocaleString('fr-HT')} HTG!` }
}

async function getMembers(tenantId, planId) {
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')
  const members = await prisma.sabotayMember.findMany({
    where: { planId, isActive: true },
    include: { payments: { orderBy: { dueDate: 'asc' } }, creator: { select: { fullName: true } } },
    orderBy: { position: 'asc' },
  })
  return members
}

// ─────────────────────────────────────────────────────────────
// ADD MEMBER — Auto-detect existing phone (same tenant) + cross-tenant safe
// ─────────────────────────────────────────────────────────────
async function addMember(tenantId, planId, userId, data) {
  const {
    name, phone, position, positions, notes, isOwnerSlot, hasWon, fines, credentials,
    cin, nif, address, photoUrl, idPhotoUrl, referenceName, referencePhone, relationship, preferredDate,
    permanentId,
  } = data

  if (!name)     throw new Error('Non manm obligatwa.')
  if (!phone)    throw new Error('Telefòn manm obligatwa.')
  if (!position) throw new Error('Pozisyon obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { _count: { select: { members: { where: { isActive: true } } } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  const positionsToCreate = (positions && Array.isArray(positions) && positions.length > 1)
    ? positions : [Number(position)]

  for (const pos of positionsToCreate) {
    const posExists = await prisma.sabotayMember.findFirst({ where: { planId, position: Number(pos), isActive: true } })
    if (posExists) throw new Error(`Pozisyon #${pos} deja pran pa ${posExists.name}.`)
  }

  const createdMembers = []

  for (const pos of positionsToCreate) {
    const dueDate     = computePaymentDate(plan.startDate, plan.frequency, Number(pos), Number(plan.interval || 1))
    const collectDate = computeCollectDate(plan.startDate, plan.frequency, Number(pos), plan.maxMembers, Number(plan.interval || 1))

    const member = await prisma.sabotayMember.create({
      data: {
        planId, name: name.trim(), phone: phone.trim(),
        position: Number(pos), dueDate: new Date(dueDate), collectDate: new Date(collectDate),
        notes: notes || null, isActive: true, createdBy: userId,
        isOwnerSlot: isOwnerSlot || false, hasWon: hasWon || false, fines: fines || {},
        permanentId: permanentId || null,
      },
      include: { payments: true, creator: { select: { fullName: true } } }
    })

    createdMembers.push({ member, collectDate })
  }

  const firstMember = createdMembers[0].member

  let solAccount  = null
  let rawPassword = null
  let isExistingAccount = false

  try {
    const bcrypt     = require('bcryptjs')
    const cleanPhone = phone.replace(/\s/g, '').trim()

    // ✅ FIX: chèche kont egzistan ak PLIZYÈ fòma telefòn an menm tan
    //    Sa pèmèt jwenn ansyen done ki te estoke ak espas/tirè/elatriye.
    //    Yo tout fè referans menm moun nan.
    const phoneVariants = Array.from(new Set([
      phone.trim(),                            // egzakteman jan li tape
      cleanPhone,                              // san espas
      phone.replace(/[^\d+]/g, ''),            // sèlman chif + plis sign
      phone.replace(/[\s\-()]/g, '').trim(),   // san espas/tirè/parantèz
    ].filter(Boolean)))

    solAccount = await prisma.solMemberAccount.findFirst({
      where: { tenantId, memberPhone: { in: phoneVariants } }
    })

    if (solAccount) {
      console.log(`[addMember] Kont Sol egziste pou ${phone} nan tenan ${tenantId} — username: ${solAccount.username}`)
      isExistingAccount = true
      if (!solAccount.memberId) {
        solAccount = await prisma.solMemberAccount.update({
          where: { id: solAccount.id },
          data:  { memberId: firstMember.id }
        })
      }
    } else {
      console.log(`[addMember] Nouvo kont Sol pou ${phone} nan tenan ${tenantId}`)
      const rawUsername = credentials?.username
        ? credentials.username.toLowerCase().trim()
        : generateUsername(name, Number(positionsToCreate[0]))

      rawPassword = credentials?.password || generatePassword(8)

      let finalUsername = rawUsername
      const usernameExists = await prisma.solMemberAccount.findFirst({
        where: { username: rawUsername }
      })

      if (usernameExists) {
        const shortTenantId  = getTenantPrefix(tenantId)
        const prefixedUsername = `${shortTenantId}-${rawUsername}`

        const prefixedExists = await prisma.solMemberAccount.findFirst({
          where: { username: prefixedUsername }
        })

        finalUsername = prefixedExists
          ? `${prefixedUsername}-${tenantId.slice(-4)}`
          : prefixedUsername

        console.log(`[addMember] Username "${rawUsername}" deja pran — itilize "${finalUsername}"`)
      }

      const passwordHash = await bcrypt.hash(rawPassword, 10)

      solAccount = await prisma.solMemberAccount.create({
        data: {
          username:      finalUsername,
          passwordHash,
          plainPassword: rawPassword,
          tenantId,
          memberId:      firstMember.id,
          memberName:    name.trim(),
          memberPhone:   cleanPhone,
        }
      })
    }
  } catch (err) {
    console.error('[sabotay] ❌ Kont Sol erè DETAY:', err)
  }

  for (const { member, collectDate } of createdMembers) {
    if (solAccount) {
      try {
        await prisma.solMemberPosition.create({
          data: {
            accountId: solAccount.id, tenantId, memberId: member.id,
            memberPosition: member.position, planId: plan.id, planName: plan.name,
            planAmount: Number(plan.amount), planFee: Number(plan.fee || 0),
            planFrequency: plan.frequency, planMaxMembers: plan.maxMembers,
            planStartDate: plan.startDate.toISOString().split('T')[0],
            planDueTime: plan.dueTime || '08:00', planInterval: Number(plan.interval || 1),
            planFeePerMember: Number(plan.feePerMember || 0), planPenalty: Number(plan.penalty || 0),
            planRegleman: plan.regleman || null,
            isOwnerSlot: isOwnerSlot || false, hasWon: false,
            preferredDate: collectDate, payments: {}, paymentTimings: {}, fines: {},
          }
        })
      } catch (err) {
        console.error('[sabotay] ❌ SolMemberPosition erè pos', member.position, ':', err.message)
      }
    }
  }

  if (solAccount) {
    firstMember._solAccount = {
      username:      solAccount.username,
      plainPassword: rawPassword || solAccount.plainPassword || null,
      isExisting:    isExistingAccount,
    }
  }
  firstMember.positions = positionsToCreate
  return firstMember
}

async function updateMember(tenantId, planId, memberId, data) {
  const member = await prisma.sabotayMember.findFirst({ where: { id: memberId, planId, plan: { tenantId } } })
  if (!member) throw new Error('Manm pa jwenn.')
  const updated = await prisma.sabotayMember.update({
    where: { id: memberId },
    data: {
      ...(data.name     && { name: data.name.trim() }),
      ...(data.phone    && { phone: data.phone.trim() }),
      ...(data.notes    !== undefined && { notes:    data.notes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.hasWon   !== undefined && { hasWon:   data.hasWon }),
      ...(data.fines    !== undefined && { fines:    data.fines }),
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

async function getPayments(tenantId, planId, params = {}) {
  const { memberId, month, year } = params
  const where = {
    planId, plan: { tenantId },
    ...(memberId && { memberId }),
    ...(month && year && { dueDate: { gte: new Date(`${year}-${String(month).padStart(2,'0')}-01`), lt: new Date(`${year}-${String(Number(month)+1).padStart(2,'0')}-01`) } }),
  }
  const payments = await prisma.sabotayPayment.findMany({
    where,
    include: { member: { select: { id: true, name: true, phone: true, position: true } }, creator: { select: { fullName: true } } },
    orderBy: { dueDate: 'asc' },
  })
  return payments
}

// ─────────────────────────────────────────────────────────────
// MARK PAID — Kalkile timing granulè otomatikman (server-side)
// ─────────────────────────────────────────────────────────────
async function markPaid(tenantId, planId, memberId, userId, data) {
  const { dates, timings, fines, method, notes, paidAt } = data
  const datesToProcess = dates || (data.dueDate ? [data.dueDate] : [])
  if (!datesToProcess.length) throw new Error('Omwen yon dat peman obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')
  const member = await prisma.sabotayMember.findFirst({ where: { id: memberId, planId, isActive: true } })
  if (!member) throw new Error('Manm pa jwenn oswa inaktif.')

  // ✅ NOUVO: Lè Manyèl — si plan a aktive `manualPaymentTime` epi kesye a
  // bay yon `paidAt` (lè kliyan an REYÈLMAN peye a), itilize l pou kalkile
  // timing olye lè sistèm nan kounye a (`new Date()`). Sa rezoud ka a kote
  // kliyan peye bonè men kesye a pa gentan make peman an avan rezilta soti.
  const paidMoment = (plan.manualPaymentTime && paidAt) ? new Date(paidAt) : new Date()
  if (plan.manualPaymentTime && paidAt && isNaN(paidMoment.getTime())) {
    throw new Error('Lè peman an pa valid.')
  }

  const createdPayments = []
  const updatedFines    = { ...(member.fines || {}) }

  for (const dueDate of datesToProcess) {
    const exists = await prisma.sabotayPayment.findFirst({ where: { planId, memberId, dueDate: new Date(dueDate) } })
    if (exists) continue

    const timing = rankingSvc.computeDetailedTiming(
      dueDate,
      paidMoment,
      plan.dueTime    || '08:00',
      plan.dueTimeEnd || '15:00',
    )
    const fineAmt = fines?.[dueDate] || (data.fineAmt || 0)

    const payment = await prisma.sabotayPayment.create({
      data: {
        planId, memberId, amount: Number(plan.amount),
        dueDate: new Date(dueDate), paidDate: new Date(),
        paid_at: paidMoment, // ✅ NOUVO: lè reyèl peman an (manyèl si aktive, sinon lè kesye a make l)
        method: method || 'cash', notes: notes || null, createdBy: userId,
        fineAmt: Number(fineAmt),
        timing,
      },
      include: { member: { select: { id: true, name: true, phone: true, position: true } }, creator: { select: { fullName: true } } }
    })

    createdPayments.push(payment)

    if (Number(fineAmt) > 0) {
      await addToAdminCash(
        tenantId, planId, plan.name, 'late_fine',
        Number(fineAmt), memberId, member.name, `Amand reta ${dueDate}`
      ).catch(() => {})
    }
    if (Number(fineAmt) > 0) updatedFines[dueDate] = Number(fineAmt)
  }

  if (Object.keys(updatedFines).length > Object.keys(member.fines || {}).length) {
    await prisma.sabotayMember.update({ where: { id: memberId }, data: { fines: updatedFines } })
  }

  if (createdPayments.length > 0) {
    try {
      const solPos = await prisma.solMemberPosition.findFirst({ where: { memberId, planId } })
      if (solPos) {
        const newPayments        = { ...(solPos.payments       || {}) }
        const newPaymentTimings  = { ...(solPos.paymentTimings || {}) }
        for (const p of createdPayments) {
          const dk = new Date(p.dueDate).toISOString().split('T')[0]
          newPayments[dk]       = true
          newPaymentTimings[dk] = p.timing || 'onTime'
        }
        await prisma.solMemberPosition.update({
          where: { id: solPos.id },
          data:  { payments: newPayments, paymentTimings: newPaymentTimings },
        })
      }
    } catch (err) {
      console.warn('[sabotay] Sinkwonizasyon SolMemberPosition echwe:', err.message)
    }
  }

  if (datesToProcess.length > 0) {
    await _checkAndNotifyCollection(tenantId, plan, datesToProcess[datesToProcess.length - 1])
  }

  return { payments: createdPayments, count: createdPayments.length }
}

async function unmarkPaid(tenantId, paymentId) {
  const payment = await prisma.sabotayPayment.findFirst({ where: { id: paymentId, plan: { tenantId } } })
  if (!payment) throw new Error('Peman pa jwenn.')
  await prisma.sabotayPayment.delete({ where: { id: paymentId } })
}

async function getMemberAccount(tenantId, planId, memberId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { members: { where: { isActive: true }, select: { id: true } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')
  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId },
    include: { payments: { orderBy: { dueDate: 'asc' }, include: { creator: { select: { fullName: true } } } } }
  })
  if (!member) throw new Error('Manm pa jwenn.')

  const planInterval  = Number(plan.interval    || 1)
  const feePerMember  = Number(plan.feePerMember || 0)
  const penaltyRate   = Number(plan.penalty      || 0)
  const totalMembers  = plan.members.length
  const intervalDays  = getIntervalDays(plan.frequency, planInterval)
  const amount        = Number(plan.amount)
  const totalExpected = amount * totalMembers
  const totalPaid     = member.payments.reduce((s, p) => s + Number(p.amount), 0)

  let toCollect
  if (feePerMember === amount) {
    toCollect = member.isOwnerSlot ? amount * totalMembers : amount * totalMembers - feePerMember
  } else if (feePerMember > 0) {
    toCollect = amount * totalMembers - feePerMember
  } else {
    toCollect = amount * totalMembers - Number(plan.fee || 0)
  }

  const progressPct = totalMembers > 0 ? Math.round((member.payments.length / totalMembers) * 100) : 0
  const totalFines  = Object.values(member.fines || {}).reduce((s, v) => s + Number(v), 0)

  // ✅ FIX: Pran ni today ni currentTime, e itilize isDateOverdue ki konsidere dueTimeEnd
  const { today, currentTime } = rankingSvc.getHaitiNow()
  const dueTimeEnd = plan.dueTimeEnd || '17:00'

  const allDueDates = Array.from({ length: totalMembers }, (_, i) => {
    const d = new Date(plan.startDate)
    d.setDate(d.getDate() + i * intervalDays)
    return d.toISOString().split('T')[0]
  })

  const paymentHistory = allDueDates.map((dueDate, i) => {
    const paid = member.payments.find(p => p.dueDate.toISOString().split('T')[0] === dueDate)
    // ✅ FIX: An reta sèlman si VRÈMAN pase oswa jodi APRE dueTimeEnd
    const isOverdue = rankingSvc.isDateOverdue(dueDate, today, currentTime, dueTimeEnd)
    return {
      index: i + 1, dueDate, amount,
      isPaid: !!paid,
      isLate: isOverdue && !paid, // ✅ pa enklud jodi avan dueTimeEnd
      paidDate: paid?.paidDate || null, method: paid?.method || null,
      paymentId: paid?.id || null, fineAmt: paid?.fineAmt || (member.fines?.[dueDate] || 0),
      timing: paid?.timing || null,
    }
  })

  return {
    plan: { id: plan.id, name: plan.name, frequency: plan.frequency, amount, fee: Number(plan.fee || 0), maxMembers: plan.maxMembers, startDate: plan.startDate, feePerMember, penalty: penaltyRate, interval: planInterval, dueTime: plan.dueTime || '08:00', dueTimeEnd: plan.dueTimeEnd || '15:00', regleman: plan.regleman || null, manualPaymentTime: plan.manualPaymentTime || false, stopPenaltyAmount: Number(plan.stopPenaltyAmount || 0) },
    member: { id: member.id, name: member.name, phone: member.phone, position: member.position, dueDate: member.dueDate, collectDate: member.collectDate, joinedAt: member.createdAt, isOwnerSlot: member.isOwnerSlot || false, hasWon: member.hasWon || false, fines: member.fines || {}, declaredPayoutDate: member.declaredPayoutDate || null, status: member.status, stopRefundAmount: member.stopRefundAmount ? Number(member.stopRefundAmount) : null, stopRefundPaid: member.stopRefundPaid || false },
    summary: { totalExpected, totalPaid, remaining: Math.max(0, totalExpected - totalPaid), toCollect, progressPct, paidCount: member.payments.length, totalRounds: totalMembers, totalFines },
    paymentHistory,
  }
}

// ─────────────────────────────────────────────────────────────
// FIND SOL ACCOUNT BY PHONE
// ─────────────────────────────────────────────────────────────
async function findSolAccountByPhone(tenantId, phone) {
  if (!phone) return null
  const clean = phone.replace(/\s/g, '').trim()

  const account = await prisma.solMemberAccount.findFirst({
    where: { tenantId, memberPhone: clean },
    include: {
      positions: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          planId: true,
          planName: true,
          memberPosition: true,
          planAmount: true,
          planFrequency: true,
          hasWon: true,
          status: true,
          preferredDate: true,
          createdAt: true,
        }
      }
    }
  })

  if (!account) return null

  const activePositions = (account.positions || [])
    .filter(p => p.status !== 'stopped')

  return {
    ...account,
    activePlanCount: activePositions.length,
    activePlans: activePositions.map(p => ({
      planId: p.planId,
      planName: p.planName,
      position: p.memberPosition,
      hasWon: p.hasWon,
      preferredDate: p.preferredDate,
    })),
  }
}

async function getSolAccountPositions(tenantId, username) {
  const account = await prisma.solMemberAccount.findFirst({
    where: { username, tenantId },
    include: { positions: { orderBy: { createdAt: 'desc' } } }
  })
  if (!account) throw new Error('Kont Sol pa jwenn.')
  return account
}

async function _checkAndNotifyCollection(tenantId, plan, dueDate) {
  try {
    const totalActive = await prisma.sabotayMember.count({ where: { planId: plan.id, isActive: true } })
    const paidCount   = await prisma.sabotayPayment.count({ where: { planId: plan.id, dueDate: new Date(dueDate) } })
    if (paidCount < totalActive) return
    const round    = await prisma.sabotayPayment.count({ where: { planId: plan.id, dueDate: { lte: new Date(dueDate) } } })
    const roundNum = Math.ceil(round / totalActive)
    const winner   = await prisma.sabotayMember.findFirst({ where: { planId: plan.id, position: roundNum, isActive: true } })
    if (!winner) return
    const admins = await prisma.user.findMany({ where: { tenantId, role: 'admin', isActive: true }, select: { id: true } })
    const feePerMember     = Number(plan.feePerMember || 0)
    const amount           = Number(plan.amount)
    const collectionAmount = feePerMember === amount ? amount * totalActive : amount * totalActive - Number(plan.fee || 0)
    await Promise.all(admins.map(admin => prisma.notification.create({
      data: {
        tenantId, userId: admin.id, type: 'sabotay_collection',
        titleHt: `🏆 Sol Konplè — ${plan.name}`, titleFr: `🏆 Sol Complété — ${plan.name}`, titleEn: `🏆 Sol Round Complete — ${plan.name}`,
        messageHt: `Tout manm fin peye. ${winner.name} (Pozisyon #${winner.position}) ap touche ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
        messageFr: `Tous les membres ont payé. ${winner.name} (Position #${winner.position}) reçoit ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
        messageEn: `All members paid. ${winner.name} (Position #${winner.position}) collects ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
        entityType: 'sabotay_plan', entityId: plan.id,
      }
    })))
  } catch (err) {
    console.error('[sabotay] Notifikasyon erè:', err.message)
  }
}

async function closePlan(tenantId, planId, userId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: { members: { where: { isActive: true }, orderBy: { position: 'asc' } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')
  if (plan.status === 'closed' || plan.status === 'finished') throw new Error('Plan sa a deja fèmen.')

  const activeMembers = plan.members.filter(m => m.status !== 'stopped')
  let newPosition = 1
  for (const member of activeMembers) {
    if (member.position !== newPosition) {
      await prisma.sabotayMember.update({ where: { id: member.id }, data: { position: newPosition } })
      await prisma.solMemberPosition.updateMany({ where: { memberId: member.id, planId }, data: { memberPosition: newPosition } }).catch(() => {})
    }
    newPosition++
  }

  // ✅ NOUVO: lis manm ki te kanpe yo ak ki poko touche ranbousman yo —
  // pou admin ka wè klè ki moun ki rete pou peye lè plan an fèmen.
  const pendingRefunds = plan.members
    .filter(m => m.status === 'stopped' && Number(m.stopRefundAmount || 0) > 0 && !m.stopRefundPaid)
    .map(m => ({ memberId: m.id, name: m.name, phone: m.phone, amount: Number(m.stopRefundAmount) }))

  const updated = await prisma.sabotayPlan.update({
    where: { id: planId }, data: { status: 'closed' },
    include: { creator: { select: { fullName: true } }, _count: { select: { members: true } } }
  })
  return { ...updated, pendingRefunds }
}

async function addToAdminCash(tenantId, planId, planName, type, amount, memberId, memberName, description) {
  if (!amount || amount <= 0) return null
  try {
    return await prisma.sabotayAdminCash.create({
      data: {
        tenantId, planId, planName,
        type, amount: Number(amount),
        memberId:    memberId    || null,
        memberName:  memberName  || null,
        description: description || null,
      }
    })
  } catch (err) {
    console.error('[AdminCash] Erè:', err.message)
    return null
  }
}

async function getAdminCash(tenantId, planId) {
  const where = { tenantId, ...(planId && { planId }) }
  const [entries, totalAgg] = await Promise.all([
    prisma.sabotayAdminCash.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.sabotayAdminCash.aggregate({ where, _sum: { amount: true } }),
  ])
  const byPlan = {}
  for (const e of entries) {
    if (!byPlan[e.planId]) byPlan[e.planId] = { planId: e.planId, planName: e.planName, total: 0, entries: [] }
    byPlan[e.planId].total += e.amount
    byPlan[e.planId].entries.push(e)
  }
  const byType = {}
  for (const e of entries) {
    if (!byType[e.type]) byType[e.type] = 0
    byType[e.type] += e.amount
  }
  return { totalGlobal: Number(totalAgg._sum.amount || 0), byType, byPlan: Object.values(byPlan), entries }
}

async function memberAction(tenantId, planId, memberId, userId, data) {
  const { action, reason, payoutDate } = data

  if (!['block','unblock','stop','resume','payout','schedule_payout','cancel_scheduled_payout','mark_refund_paid'].includes(action))
    throw new Error(`Aksyon invalide: ${action}`)

  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId, plan: { tenantId } },
    include: { payments: true }
  })
  if (!member) throw new Error('Manm pa jwenn.')

  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const statusMap = { block:'blocked', unblock:'active', stop:'stopped', resume:'active', payout:'active' }
  const newStatus = statusMap[action]

  // ─────────────────────────────────────────────────────────────
  // ✅ NOUVO: Deklare Dat Peman (pwomès) — SEPARE de "payout" (touche
  // imedya). Isit la manm nan PA mache "hasWon", li senpman wè yon
  // dat nan kont sol li ki di ki lè l ap touche.
  // ─────────────────────────────────────────────────────────────
  if (action === 'schedule_payout') {
    if (!payoutDate) throw new Error('Dat peman an obligatwa.')
    const updatedMember = await prisma.sabotayMember.update({
      where: { id: memberId },
      data: { declaredPayoutDate: new Date(payoutDate) },
    })
    try {
      const solPos = await prisma.solMemberPosition.findFirst({ where: { memberId, planId }, include: { account: true } })
      if (solPos?.account) {
        await prisma.solNotification.create({
          data: {
            accountId: solPos.account.id, type: 'payout_scheduled',
            titleHt: '📅 Dat Peman Ou Deklare!',
            messageHt: `${plan.name}: ou ap touche sol ou a nan dat ${new Date(payoutDate).toLocaleDateString('fr-HT')}.`,
          }
        }).catch(() => {})
      }
    } catch(_) {}
    return { member: updatedMember, action, declaredPayoutDate: updatedMember.declaredPayoutDate }
  }

  if (action === 'cancel_scheduled_payout') {
    const updatedMember = await prisma.sabotayMember.update({
      where: { id: memberId },
      data: { declaredPayoutDate: null },
    })
    return { member: updatedMember, action, declaredPayoutDate: null }
  }

  // ✅ NOUVO: Admin make ranbousman "kanpe" a kòm peye (kach, men-a-men)
  if (action === 'mark_refund_paid') {
    const updatedMember = await prisma.sabotayMember.update({
      where: { id: memberId },
      data: { stopRefundPaid: true },
    })
    return { member: updatedMember, action }
  }

  if (action === 'payout') {
    // ✅ Lè yon touche konfime pou tout bon, efase nenpòt dat pwomès ki te la
    const updatedMember = await prisma.sabotayMember.update({ where: { id: memberId }, data: { hasWon: true, declaredPayoutDate: null } })
    try {
      const solPos = await prisma.solMemberPosition.findFirst({ where: { memberId, planId }, include: { account: true } })
      if (solPos?.account) {
        await prisma.solNotification.create({
          data: { accountId: solPos.account.id, type: 'payout', titleHt: '🏆 Ou touche Sol ou a!', messageHt: `Felisitasyon! Ou resevwa kob sol ou a. Kontakte jesyone sol la pou detay.` }
        }).catch(() => {})
      }
    } catch(_) {}
    return { member: updatedMember, action, newStatus: 'active' }
  }

  if (action === 'stop') {
    const stopPenaltyAmount = Number(plan.stopPenaltyAmount || 0)
    const totalPaid = member.payments.reduce((s, p) => s + Number(p.amount), 0)
    // ✅ FIX: penalite kounye a se yon MONTAN FIKS (pa pousantaj) — plafonnen
    // pou l pa janm depase kòb manm nan reyèlman peye.
    const penaltyAmt = Math.min(stopPenaltyAmount, totalPaid)
    // ✅ FIX: montan ki rete a (totalPaid - penalite) kounye a ANREJISTRE sou
    // manm nan — pa jis nan yon mesaj tèks — pou closePlan() ka konte l tout bon.
    const netPayout = totalPaid - penaltyAmt
    if (penaltyAmt > 0) {
      await addToAdminCash(tenantId, planId, plan.name, 'stop_penalty', penaltyAmt, memberId, member.name, `Penalite kanpe: ${penaltyAmt} HTG (montan fiks) sou ${totalPaid} HTG kontribye`)
    }
    await prisma.sabotayMember.update({ where: { id: memberId }, data: { stopRefundAmount: netPayout, stopRefundPaid: false } })
    try {
      const solPos = await prisma.solMemberPosition.findFirst({ where: { memberId, planId }, include: { account: true } })
      if (solPos?.account) {
        await prisma.solNotification.create({
          data: {
            accountId: solPos.account.id, type: 'stop_penalty', titleHt: '⏸️ Ou kanpe nan Sol la',
            messageHt: penaltyAmt > 0
              ? `Ou kanpe patisipasyon ou. Penalite: ${penaltyAmt} HTG. Ou ap resevwa ${netPayout} HTG le sol la fini.`
              : `Ou kanpe patisipasyon ou nan ${plan.name}. Ou ap resevwa ${totalPaid} HTG le sol la fini.`,
          }
        }).catch(() => {})
      }
    } catch(_) {}
  }

  const updated = await prisma.sabotayMember.update({
    where: { id: memberId },
    // ✅ FIX: pa mete isActive:false lè kanpe — sa te fè manm nan disparèt nèt
    // nan lis admin lan. `status:'stopped'` sifi (deja itilize toupatou pou filtre).
    data: { status: newStatus, ...(reason && { notes: reason }) },
    include: { payments: true }
  })

  try {
    await prisma.solMemberPosition.updateMany({ where: { memberId, planId }, data: { status: newStatus } })
  } catch (_) {}

  return { member: updated, action, newStatus }
}

async function adjustMemberPosition(tenantId, planId, memberId, steps) {
  if (!steps || steps < 1 || steps > 10) throw new Error('Etap dwe ant 1 ak 10.')

  // ═══════════════════════════════════════════════════════════════
  // TOUT NAN YON SÈL TRANSACTION + MENM ADVISORY LOCK AK RECALC
  //   → ajisteman manyèl ak rekalkil otomatik PA KA antre an konfli.
  //   → pa gen pozisyon negatif ki ka rete bloke (rollback total).
  // ═══════════════════════════════════════════════════════════════
  return await prisma.$transaction(async (tx) => {

    // 🔒 Menm lock key ak recalculatePositions → yo serialize ansanm
    const lockKey = rankingSvc._lockKeyFromId(planId)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`

    const member = await tx.sabotayMember.findFirst({
      where: { id: memberId, planId, plan: { tenantId } }
    })
    if (!member) throw new Error('Manm pa jwenn.')
    if (member.isOwnerSlot) throw new Error('Pa ka ajiste pozisyon pwopriyete a.')
    if (member.hasWon)      throw new Error('Pa ka ajiste pozisyon yon manm ki touche deja.')

    // Anpeche ajiste pozisyon manm ki LOCK (touche/pre touche)
    const planForLock = await tx.sabotayPlan.findFirst({
      where: { id: planId, tenantId },
      include: { members: { where: { isActive: true }, select: { position: true, status: true } } },
    })
    const { today } = rankingSvc.getHaitiNow()
    const lockWindowDays = Number(planForLock?.lockWindowDays ?? 2)
    if (rankingSvc.isPositionLocked(member, planForLock, today, lockWindowDays)) {
      throw new Error('Pozisyon sa a enchanjab — manm nan ap touche byento.')
    }

    const newPosition = member.position + steps

    // Verifye nouvo pozisyon an valid
    const maxMember = await tx.sabotayMember.findFirst({
      where: { planId, isActive: true },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const maxPosition = maxMember?.position || member.position
    if (newPosition > maxPosition) {
      throw new Error(`Pa ka desann pi ba pase pozisyon #${maxPosition}.`)
    }

    // Manm ki ant pozisyon aktyèl ak nouvo pozisyon an
    const membersToShift = await tx.sabotayMember.findMany({
      where: { planId, position: { gt: member.position, lte: newPosition }, isActive: true },
      orderBy: { position: 'asc' },
    })

    if (membersToShift.length === 0) {
      await tx.sabotayMember.update({ where: { id: memberId }, data: { position: newPosition } })
      await tx.solMemberPosition.updateMany({
        where: { memberId, planId }, data: { memberPosition: newPosition }
      }).catch(() => {})
      console.log(`[ADJUST POS] Plan ${planId}: manm ${memberId} soti #${member.position} ale #${newPosition} (0 deplase)`)
      return { oldPosition: member.position, newPosition, shifted: 0 }
    }

    // ─────────────────────────────────────────────────────────────
    // ✅ FIX P2002: 2-etap NAN MENM TX (atomik — rollback si echwe)
    // ─────────────────────────────────────────────────────────────
    const updates = [
      { id: memberId, finalPos: newPosition },
      ...membersToShift.map(m => ({ id: m.id, finalPos: m.position - 1 })),
    ]

    // ETAP 1: Pozisyon negatif tanporè
    for (let idx = 0; idx < updates.length; idx++) {
      await tx.sabotayMember.update({
        where: { id: updates[idx].id },
        data:  { position: -(idx + 1000) },
      })
    }

    // ETAP 2: Pozisyon final yo
    for (const u of updates) {
      await tx.sabotayMember.update({
        where: { id: u.id },
        data:  { position: u.finalPos },
      })
    }

    // Sinkwonize SolMemberPosition
    for (const u of updates) {
      await tx.solMemberPosition.updateMany({
        where: { memberId: u.id, planId },
        data:  { memberPosition: u.finalPos },
      }).catch(() => {})
    }

    console.log(`[ADJUST POS] Plan ${planId}: manm ${memberId} soti #${member.position} ale #${newPosition} (${membersToShift.length} manm deplase)`)

    return { oldPosition: member.position, newPosition, shifted: membersToShift.length }

  }, {
    timeout: 30000,
    maxWait: 20000,
  })
}

/**
 * ✅ NOUVO: Repare pozisyon negatif ki te rete bloke (ansyen bug race).
 * Rele yon fwa pou netwaye done ki deja korije.
 * Renumewote tout manm aktif yo 1..N selon lòd pozisyon yo ye kounye a
 * (pozitif anvan, negatif aprè) — answit recalc ap reklase yo pa skò.
 */
async function repairCorruptedPositions(tenantId, planId) {
  return await prisma.$transaction(async (tx) => {
    const lockKey = rankingSvc._lockKeyFromId(planId)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`

    const plan = await tx.sabotayPlan.findFirst({
      where: { id: planId, tenantId },
      include: { members: { where: { isActive: true } } },
    })
    if (!plan) throw new Error('Plan pa jwenn.')

    const members = plan.members
    const hasCorruption = members.some(m => !Number.isInteger(m.position) || m.position <= 0)
    if (!hasCorruption) {
      return { repaired: false, message: 'Pa gen pozisyon korije' }
    }

    // Lòd: pozitif yo (nan lòd) anvan, answit negatif yo (nan lòd)
    const ordered = [...members].sort((a, b) => {
      const pa = a.position > 0 ? a.position : 1e9 + Math.abs(a.position)
      const pb = b.position > 0 ? b.position : 1e9 + Math.abs(b.position)
      return pa - pb
    })

    // ETAP 1: tout sou negatif tanporè
    for (let i = 0; i < ordered.length; i++) {
      await tx.sabotayMember.update({
        where: { id: ordered[i].id },
        data:  { position: -(i + 5000) },
      })
    }
    // ETAP 2: renumewote 1..N
    for (let i = 0; i < ordered.length; i++) {
      await tx.sabotayMember.update({
        where: { id: ordered[i].id },
        data:  { position: i + 1 },
      })
      await tx.solMemberPosition.updateMany({
        where: { memberId: ordered[i].id, planId },
        data:  { memberPosition: i + 1 },
      }).catch(() => {})
    }

    console.log(`[REPAIR] Plan ${planId}: ${ordered.length} pozisyon renumewote 1..${ordered.length}`)
    return { repaired: true, count: ordered.length }
  }, { timeout: 30000, maxWait: 20000 })
}

module.exports = {
  getStats, getPlans, getPlanById, createPlan, updatePlan, deletePlan,
  blindDraw, getMembers, addMember, updateMember, removeMember,
  getPayments, markPaid, unmarkPaid, getMemberAccount,
  findSolAccountByPhone, getSolAccountPositions, closePlan,
  memberAction, getAdminCash, addToAdminCash,
  adjustMemberPosition,
  repairCorruptedPositions,
}