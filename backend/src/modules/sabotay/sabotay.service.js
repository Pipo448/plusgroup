// backend/src/modules/sabotay/sabotay.service.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// HELPERS — Kalkile dat peman
// ─────────────────────────────────────────────────────────────

function computePaymentDate(startDate, frequency, position, interval = 1) {
  const start = new Date(startDate)
  const pos   = position - 1 // 0-indexed

  switch (frequency) {
    case 'daily':
      start.setDate(start.getDate() + pos * interval)
      break
    case 'saturday':
    case 'weekly_saturday':
      start.setDate(start.getDate() + pos * 7 * interval)
      break
    case 'weekly':
    case 'weekly_monday':
      start.setDate(start.getDate() + pos * 5 * interval)
      break
    case 'biweekly':
      start.setDate(start.getDate() + pos * 15 * interval)
      break
    case 'monthly':
      start.setMonth(start.getMonth() + pos * interval)
      break
    case 'weekdays':
      start.setDate(start.getDate() + pos * interval)
      break
    default:
      start.setDate(start.getDate() + pos * 7 * interval)
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

// ─────────────────────────────────────────────────────────────
// HELPERS — Jenere credentials Sol
// ─────────────────────────────────────────────────────────────

// username: premye mo non + pozisyon 4 chif  →  ex: marie0003
function generateUsername(name, position) {
  const first = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(' ')[0]
    .replace(/[^a-z0-9]/g, '')
  const pos = String(position).padStart(4, '0')
  return `${first}${pos}`
}

// modpas 8 karaktè — retire karaktè konfizyon (0/O, 1/l/I)
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
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
          include: {
            payments: {
              select: {
                id: true, dueDate: true, paidAt: true,
                amount: true, timing: true, fineAmt: true,
              }
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

  // Transfòme payments array → { payments: {}, paymentTimings: {} }
  const plansFormatted = plans.map(plan => ({
    ...plan,
    members: plan.members.map(member => {
      const payments       = {}
      const paymentTimings = {}
      for (const p of member.payments) {
        const dateKey            = new Date(p.dueDate).toISOString().split('T')[0]
        payments[dateKey]        = true
        paymentTimings[dateKey]  = p.timing || 'onTime'
      }
      return { ...member, payments, paymentTimings }
    })
  }))

  return { plans: plansFormatted, total, page: Number(page), limit: Number(limit) }
}

async function getPlanById(tenantId, planId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      creator: { select: { fullName: true } },
      members: {
        where:   { isActive: true },
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

async function createPlan(tenantId, branchId, userId, data) {
  const {
    name, frequency, amount, maxMembers, fee, startDate, notes,
    feePerMember, penalty, interval, dueTime, regleman,
  } = data

  if (!name)      throw new Error('Non plan obligatwa.')
  if (!frequency) throw new Error('Frekans obligatwa.')
  if (!amount || Number(amount) <= 0)     throw new Error('Montan dwe plis ke 0.')
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
      notes:        notes     || null,
      status:       'active',
      createdBy:    userId,
      feePerMember: Number(feePerMember || 0),
      penalty:      Number(penalty      || 0),
      interval:     Number(interval     || 1),
      dueTime:      dueTime   || '08:00',
      regleman:     regleman  || null,
    },
    include: {
      creator: { select: { fullName: true } },
      _count:  { select: { members: true } },
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
      ...(data.name         && { name: data.name.trim() }),
      ...(data.status       && { status: data.status }),
      ...(data.notes        !== undefined && { notes: data.notes }),
      ...(data.fee          !== undefined && { fee:          Number(data.fee) }),
      ...(data.maxMembers   && { maxMembers:   Number(data.maxMembers) }),
      ...(data.startDate    && { startDate:    new Date(data.startDate) }),
      ...(data.feePerMember !== undefined && { feePerMember: Number(data.feePerMember) }),
      ...(data.penalty      !== undefined && { penalty:      Number(data.penalty) }),
      ...(data.interval     !== undefined && { interval:     Number(data.interval) }),
      ...(data.dueTime      !== undefined && { dueTime:      data.dueTime }),
      ...(data.regleman     !== undefined && { regleman:     data.regleman }),
    },
    include: {
      creator: { select: { fullName: true } },
      _count:  { select: { members: true } },
    }
  })

  return updated
}

async function deletePlan(tenantId, planId) {
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const paymentCount = await prisma.sabotayPayment.count({ where: { planId } })
  if (paymentCount > 0)
    throw new Error('Pa ka efase yon plan ki gen peman deja. Mete l inaktif olye.')

  await prisma.sabotayPlan.delete({ where: { id: planId } })
}

// ─────────────────────────────────────────────────────────────
// TIRAJ AVÈG
// ─────────────────────────────────────────────────────────────
async function blindDraw(tenantId, planId, userId, data) {
  const { winnerId } = data

  const plan = await prisma.sabotayPlan.findFirst({
    where:   { id: planId, tenantId },
    include: { members: { where: { isActive: true, hasWon: false } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  let winner
  if (winnerId) {
    winner = await prisma.sabotayMember.findFirst({
      where: { id: winnerId, planId, isActive: true }
    })
    if (!winner) throw new Error('Manm pa jwenn.')
  } else {
    const eligible = plan.members.filter(m => !m.hasWon)
    if (!eligible.length) throw new Error('Tout manm fin touche deja.')
    winner = eligible[Math.floor(Math.random() * eligible.length)]
  }

  const updatedWinner = await prisma.sabotayMember.update({
    where: { id: winner.id },
    data:  { hasWon: true },
  })

  const totalMembers = plan.members.length
  const feePerMember = Number(plan.feePerMember || 0)
  const amount       = Number(plan.amount)
  const pool         = amount * totalMembers
  const payout       = pool - feePerMember

  await _checkAndNotifyCollection(tenantId, plan, new Date().toISOString().split('T')[0])

  return {
    winner:      updatedWinner,
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
    where:   { planId, isActive: true },
    include: {
      payments: { orderBy: { dueDate: 'asc' } },
      creator:  { select: { fullName: true } },
    },
    orderBy: { position: 'asc' },
  })

  return members
}

// ─────────────────────────────────────────────────────────────
// ADD MEMBER — ✅ REFACTORE: 1 kont → plizyè pozisyon
// ─────────────────────────────────────────────────────────────
async function addMember(tenantId, planId, userId, data) {
  const {
    name, phone, position, notes, isOwnerSlot, hasWon, fines, credentials,
    // ── KYC
    cin, nif, address, photoUrl, idPhotoUrl,
    // ── Referans
    referenceName, referencePhone, relationship,
    // ── Dat manm prefere pou touche (kalkile nan frontend, sove pou referans)
    preferredDate,
  } = data

  if (!name)     throw new Error('Non manm obligatwa.')
  if (!phone)    throw new Error('Telefòn manm obligatwa.')
  if (!position) throw new Error('Pozisyon obligatwa.')

  // ── Verifye plan + limit plas
  const plan = await prisma.sabotayPlan.findFirst({
    where:   { id: planId, tenantId },
    include: { _count: { select: { members: { where: { isActive: true } } } } }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  const ownerSlot    = Number(plan.feePerMember || 0) === Number(plan.amount) ? 1 : 0
  const maxSlots     = plan.maxMembers + ownerSlot
  const currentCount = plan._count.members

  if (currentCount >= maxSlots) {
    throw new Error(`Plan plen! Maks ${maxSlots} manm rive.`)
  }

  // ── Verifye pozisyon pa pran deja
  const posExists = await prisma.sabotayMember.findFirst({
    where: { planId, position: Number(position), isActive: true }
  })
  if (posExists) throw new Error(`Pozisyon #${position} deja pran pa ${posExists.name}.`)

  // ── Kalkile dat peman ak dat touche pou pozisyon sa a
  const dueDate     = computePaymentDate(plan.startDate, plan.frequency, Number(position), Number(plan.interval || 1))
  const collectDate = computeCollectDate(plan.startDate, plan.frequency, Number(position), plan.maxMembers, Number(plan.interval || 1))

  // ── 1. Kreye SabotayMember (tablo prensipal — pa chanje)
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
      isOwnerSlot: isOwnerSlot || false,
      hasWon:      hasWon      || false,
      fines:       fines       || {},
    },
    include: {
      payments: true,
      creator:  { select: { fullName: true } },
    }
  })

  // ── 2. Kont Sol — sèlman pou manm ki pa isOwnerSlot
  if (!isOwnerSlot) {
    try {
      const bcrypt     = require('bcryptjs')
      const cleanPhone = phone.trim()

      // ── Chèche si kont Sol deja egziste pou telefòn sa a nan tenant sa a
      //    (menm moun ka enskri nan plizyè plan — yon sèl kont)
      let solAccount = await prisma.solMemberAccount.findFirst({
        where: { tenantId, memberPhone: cleanPhone }
      })

      let rawPassword = null // pou retounen bay frontend si kont nouvo

      if (solAccount) {
        // ── KONT DEJA EGZISTE — pa rekree, jis mete ajou KYC si gen nouvo enfòmasyon
        console.log(`[sabotay] ♻️  Kont Sol egziste — username: ${solAccount.username}`)

        // Sèlman ajoute champ ki pa la deja (pa ekraze ansyen enfòmasyon)
        const updates = {}
        if (cin            && !solAccount.cin)            updates.cin            = cin
        if (nif            && !solAccount.nif)            updates.nif            = nif
        if (address        && !solAccount.address)        updates.address        = address
        if (photoUrl       && !solAccount.photoUrl)       updates.photoUrl       = photoUrl
        if (idPhotoUrl     && !solAccount.idPhotoUrl)     updates.idPhotoUrl     = idPhotoUrl
        if (referenceName  && !solAccount.referenceName)  updates.referenceName  = referenceName
        if (referencePhone && !solAccount.referencePhone) updates.referencePhone = referencePhone
        if (relationship   && !solAccount.relationship)   updates.relationship   = relationship

        if (Object.keys(updates).length > 0) {
          solAccount = await prisma.solMemberAccount.update({
            where: { id: solAccount.id },
            data:  updates,
          })
          console.log(`[sabotay] 📝 KYC mete ajou pou ${solAccount.username}`)
        }

      } else {
        // ── KREYE NOUVO KONT SOL
        const rawUsername = credentials?.username
          ? credentials.username.toLowerCase().trim()
          : generateUsername(name, Number(position))

        rawPassword = credentials?.password || generatePassword(8)

        // Asire unicite username (ajoute suffix si deja egziste)
        const usernameExists = await prisma.solMemberAccount.findFirst({
          where: { username: rawUsername }
        })
        const finalUsername = usernameExists
          ? `${rawUsername}${Date.now().toString().slice(-4)}`
          : rawUsername

        const passwordHash = await bcrypt.hash(rawPassword, 10)

        solAccount = await prisma.solMemberAccount.create({
          data: {
            username:       finalUsername,
            passwordHash,
            plainPassword:  rawPassword,   // Admin ka wè l nan dashboard
            tenantId,
            memberName:     name.trim(),
            memberPhone:    cleanPhone,
            // KYC
            cin:            cin            || null,
            nif:            nif            || null,
            address:        address        || null,
            photoUrl:       photoUrl       || null,
            idPhotoUrl:     idPhotoUrl     || null,
            // Referans
            referenceName:  referenceName  || null,
            referencePhone: referencePhone || null,
            relationship:   relationship   || null,
          }
        })

        console.log(`[sabotay] ✅ Nouvo kont Sol — username: ${finalUsername} | pw: ${rawPassword}`)
      }

      // ── 3. Kreye SolMemberPosition — yon nouvo ranje pou chak enskripsyon
      //       (kit kont la te deja egziste oswa li nouvo)
      await prisma.solMemberPosition.create({
        data: {
          accountId:        solAccount.id,
          tenantId,
          memberId:         member.id,
          memberPosition:   member.position,
          planId:           plan.id,
          // Snapshot plan pou afiche san rèkèt anplis
          planName:         plan.name,
          planAmount:       Number(plan.amount),
          planFee:          Number(plan.fee           || 0),
          planFrequency:    plan.frequency,
          planMaxMembers:   plan.maxMembers,
          planStartDate:    plan.startDate.toISOString().split('T')[0],
          planDueTime:      plan.dueTime              || '08:00',
          planInterval:     Number(plan.interval      || 1),
          planFeePerMember: Number(plan.feePerMember  || 0),
          planPenalty:      Number(plan.penalty       || 0),
          planRegleman:     plan.regleman             || null,
          isOwnerSlot:      false,
          hasWon:           false,
          // Dat manm te chwazi pou touche (= collectDate kalkile pou pozisyon an)
          preferredDate:    preferredDate             || collectDate,
          payments:         {},
          paymentTimings:   {},
          fines:            {},
        }
      })

      // ── Ajoute enfòmasyon kont nan obje member pou frontend ka montre credentials
      member._solAccount = {
        username:     solAccount.username,
        plainPassword: rawPassword || null, // null si kont te deja egziste
        isExisting:   rawPassword === null, // true = kont te deja la, jis pozisyon ajoute
      }

    } catch (err) {
      console.error('[sabotay] ❌ Kont Sol pa kreye/mete ajou:', err.message)
      // Erè kont Sol pa bloke enskripsyon manm la
    }
  }

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
      ...(data.name     && { name: data.name.trim() }),
      ...(data.phone    && { phone: data.phone.trim() }),
      ...(data.notes    !== undefined && { notes:     data.notes }),
      ...(data.isActive !== undefined && { isActive:  data.isActive }),
      ...(data.hasWon   !== undefined && { hasWon:    data.hasWon }),
      ...(data.fines    !== undefined && { fines:     data.fines }),
    },
    include: { payments: true }
  })

  return updated
}

async function removeMember(tenantId, planId, memberId) {
  const member = await prisma.sabotayMember.findFirst({
    where:   { id: memberId, planId, plan: { tenantId } },
    include: { _count: { select: { payments: true } } }
  })
  if (!member) throw new Error('Manm pa jwenn.')

  if (member._count.payments > 0) {
    // Si manm gen peman — mete l inaktif olye efase
    await prisma.sabotayMember.update({ where: { id: memberId }, data: { isActive: false } })
  } else {
    await prisma.sabotayMember.delete({ where: { id: memberId } })
  }
}

// ─────────────────────────────────────────────────────────────
// PEMAN — ✅ Aksepte plizyè dat yon sèl kou (dates array)
// ─────────────────────────────────────────────────────────────
async function getPayments(tenantId, planId, params = {}) {
  const { memberId, month, year } = params

  const where = {
    planId,
    plan: { tenantId },
    ...(memberId && { memberId }),
    ...(month && year && {
      dueDate: {
        gte: new Date(`${year}-${String(month).padStart(2, '0')}-01`),
        lt:  new Date(`${year}-${String(Number(month) + 1).padStart(2, '0')}-01`),
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
  const { dates, timings, fines, method, notes } = data

  const datesToProcess = dates || (data.dueDate ? [data.dueDate] : [])
  if (!datesToProcess.length) throw new Error('Omwen yon dat peman obligatwa.')

  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  const member = await prisma.sabotayMember.findFirst({
    where: { id: memberId, planId, isActive: true }
  })
  if (!member) throw new Error('Manm pa jwenn oswa inaktif.')

  const createdPayments = []
  const updatedFines    = { ...(member.fines || {}) }

  for (const dueDate of datesToProcess) {
    // Pa doble peman pou menm dat
    const exists = await prisma.sabotayPayment.findFirst({
      where: { planId, memberId, dueDate: new Date(dueDate) }
    })
    if (exists) continue

    const timing  = timings?.[dueDate] || data.timing  || null
    const fineAmt = fines?.[dueDate]   || (data.fineAmt || 0)

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
        fineAmt:   Number(fineAmt),
        timing:    timing  || null,
      },
      include: {
        member:  { select: { id: true, name: true, phone: true, position: true } },
        creator: { select: { fullName: true } },
      }
    })

    createdPayments.push(payment)

    if (Number(fineAmt) > 0) {
      updatedFines[dueDate] = Number(fineAmt)
    }
  }

  // Mete ajou fines sou manm si gen nouvo amand
  if (Object.keys(updatedFines).length > Object.keys(member.fines || {}).length) {
    await prisma.sabotayMember.update({
      where: { id: memberId },
      data:  { fines: updatedFines }
    })
  }

  // ── Sinkronize peman yo nan SolMemberPosition tou
  if (createdPayments.length > 0) {
    try {
      const solPos = await prisma.solMemberPosition.findFirst({
        where: { memberId, planId }
      })
      if (solPos) {
        const newPayments       = { ...(solPos.payments       || {}) }
        const newPaymentTimings = { ...(solPos.paymentTimings || {}) }
        for (const p of createdPayments) {
          const dk = new Date(p.dueDate).toISOString().split('T')[0]
          newPayments[dk]       = true
          newPaymentTimings[dk] = p.timing || 'onTime'
        }
        await prisma.solMemberPosition.update({
          where: { id: solPos.id },
          data:  { payments: newPayments, paymentTimings: newPaymentTimings }
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
  const payment = await prisma.sabotayPayment.findFirst({
    where: { id: paymentId, plan: { tenantId } }
  })
  if (!payment) throw new Error('Peman pa jwenn.')
  await prisma.sabotayPayment.delete({ where: { id: paymentId } })
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL MANM
// ─────────────────────────────────────────────────────────────
async function getMemberAccount(tenantId, planId, memberId) {
  const plan = await prisma.sabotayPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      members: {
        where:  { isActive: true },
        select: { id: true }
      }
    }
  })
  if (!plan) throw new Error('Plan pa jwenn.')

  const member = await prisma.sabotayMember.findFirst({
    where:   { id: memberId, planId },
    include: {
      payments: {
        orderBy: { dueDate: 'asc' },
        include: { creator: { select: { fullName: true } } }
      }
    }
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

  const progressPct = totalMembers > 0
    ? Math.round((member.payments.length / totalMembers) * 100) : 0
  const totalFines  = Object.values(member.fines || {}).reduce((s, v) => s + Number(v), 0)

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
// NOUVO: Jwenn kont Sol pa telefòn (pou deteksyon pandan enskripsyon)
// Rele pa: GET /api/v1/sabotay/sol-account?phone=...
// ─────────────────────────────────────────────────────────────
async function findSolAccountByPhone(tenantId, phone) {
  if (!phone) return null
  const clean = phone.replace(/\s/g, '').trim()

  const account = await prisma.solMemberAccount.findFirst({
    where: { tenantId, memberPhone: clean },
    include: {
      positions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, planName: true, memberPosition: true,
          planAmount: true, planFrequency: true,
          hasWon: true, preferredDate: true, createdAt: true,
        }
      }
    }
  })

  return account
}

// ─────────────────────────────────────────────────────────────
// NOUVO: Wè tout pozisyon yon kont Sol (pou SolDashboard kliyan)
// Rele pa: GET /api/v1/sol/members/me (après login)
// ─────────────────────────────────────────────────────────────
async function getSolAccountPositions(tenantId, username) {
  const account = await prisma.solMemberAccount.findFirst({
    where: { username, tenantId },
    include: {
      positions: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  if (!account) throw new Error('Kont Sol pa jwenn.')
  return account
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
      where:  { tenantId, role: 'admin', isActive: true },
      select: { id: true }
    })

    const feePerMember     = Number(plan.feePerMember || 0)
    const amount           = Number(plan.amount)
    const collectionAmount = feePerMember === amount
      ? amount * totalActive
      : amount * totalActive - Number(plan.fee || 0)

    await Promise.all(admins.map(admin =>
      prisma.notification.create({
        data: {
          tenantId,
          userId:     admin.id,
          type:       'sabotay_collection',
          titleHt:    `🏆 Sol Konplè — ${plan.name}`,
          titleFr:    `🏆 Sol Complété — ${plan.name}`,
          titleEn:    `🏆 Sol Round Complete — ${plan.name}`,
          messageHt:  `Tout manm fin peye. ${winner.name} (Pozisyon #${winner.position}) ap touche ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
          messageFr:  `Tous les membres ont payé. ${winner.name} (Position #${winner.position}) reçoit ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
          messageEn:  `All members paid. ${winner.name} (Position #${winner.position}) collects ${collectionAmount.toLocaleString('fr-HT')} HTG.`,
          entityType: 'sabotay_plan',
          entityId:   plan.id,
        }
      })
    ))
  } catch (err) {
    console.error('[sabotay] Notifikasyon erè:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
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
  // ── Nouvo
  findSolAccountByPhone,
  getSolAccountPositions,
}
