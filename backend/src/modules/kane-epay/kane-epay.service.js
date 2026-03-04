// backend/src/modules/kane-epay/kane-epay.service.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ── Jenere nimewo kont otomatik: KE-2026-00001 ──
async function generateAccountNumber(tenantId) {
  const year = new Date().getFullYear()
  const docType = 'kane_epay'

  // Chèche oswa kreye sequence
  let seq = await prisma.documentSequence.findUnique({
    where: { tenantId_documentType: { tenantId, documentType: docType } }
  })

  if (!seq) {
    seq = await prisma.documentSequence.create({
      data: {
        tenantId,
        documentType: docType,
        prefix: 'KE',
        lastNumber: 0,
        currentYear: year,
        yearReset: true,
      }
    })
  }

  // Reset si nouvo ane
  let nextNum = seq.lastNumber + 1
  if (seq.yearReset && seq.currentYear !== year) {
    nextNum = 1
  }

  // Update sequence
  await prisma.documentSequence.update({
    where: { tenantId_documentType: { tenantId, documentType: docType } },
    data: { lastNumber: nextNum, currentYear: year }
  })

  return `KE-${year}-${String(nextNum).padStart(5, '0')}`
}

// ── Enskri yon nouvo kont ──────────────────────────────────────
async function createAccount(tenantId, branchId, userId, data) {
  const { firstName, lastName, address, nifOrCin, phone,
          openingAmount, kaneFee, lockedAmount } = data

  const opening = Number(openingAmount || 0)
  const fee     = Number(kaneFee     || 0)
  const locked  = Number(lockedAmount || 0)
  const balance = opening - fee - locked

  if (balance < 0) throw new Error('Balans pa ka negatif. Ajiste frè ak montan bloke a.')

  const accountNumber = await generateAccountNumber(tenantId)

  const account = await prisma.$transaction(async (tx) => {
    // Kreye kont
    const acc = await tx.kaneEpay.create({
      data: {
        tenantId,
        branchId:      branchId || null,
        accountNumber,
        firstName,
        lastName,
        address:       address  || null,
        nifOrCin:      nifOrCin || null,
        phone:         phone    || null,
        openingAmount: opening,
        kaneFee:       fee,
        lockedAmount:  locked,
        balance,
        createdBy: userId,
      }
    })

    // Kreye premye tranzaksyon "ouverture"
    await tx.kaneTransaction.create({
      data: {
        tenantId,
        accountId:    acc.id,
        type:         'ouverture',
        amount:       opening,
        balanceBefore: 0,
        balanceAfter:  balance,
        method:       data.method || 'cash',
        reference:    data.reference || null,
        notes:        `Ouverture kont — Frè: ${fee} HTG | Bloke: ${locked} HTG`,
        createdBy:    userId,
      }
    })

    return acc
  })

  return account
}

// ── Lis tout kont ─────────────────────────────────────────────
async function getAccounts(tenantId, branchId, params = {}) {
  const { search, page = 1, limit = 20, isActive } = params
  const skip = (Number(page) - 1) * Number(limit)

  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
    ...(search && {
      OR: [
        { firstName:     { contains: search, mode: 'insensitive' } },
        { lastName:      { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { nifOrCin:      { contains: search, mode: 'insensitive' } },
        { phone:         { contains: search, mode: 'insensitive' } },
      ]
    })
  }

  const [accounts, total] = await Promise.all([
    prisma.kaneEpay.findMany({
      where,
      include: {
        creator: { select: { fullName: true } },
        _count: { select: { transactions: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.kaneEpay.count({ where })
  ])

  return { accounts, total, page: Number(page), limit: Number(limit) }
}

// ── Jwenn yon sèl kont + tranzaksyon li ───────────────────────
async function getAccountById(tenantId, accountId) {
  const account = await prisma.kaneEpay.findFirst({
    where: { id: accountId, tenantId },
    include: {
      creator: { select: { fullName: true } },
      transactions: {
        include: { creator: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }
    }
  })
  if (!account) throw new Error('Kont pa jwenn.')
  return account
}

// ── Fè yon depo ───────────────────────────────────────────────
async function deposit(tenantId, accountId, userId, data) {
  const { amount, method, reference, notes } = data
  const amt = Number(amount || 0)
  if (amt <= 0) throw new Error('Montan dwe plis ke 0.')

  const account = await prisma.kaneEpay.findFirst({
    where: { id: accountId, tenantId, isActive: true }
  })
  if (!account) throw new Error('Kont pa jwenn oswa inaktif.')

  const balBefore = Number(account.balance)
  const balAfter  = balBefore + amt

  const result = await prisma.$transaction(async (tx) => {
    await tx.kaneEpay.update({
      where: { id: accountId },
      data: { balance: balAfter }
    })

    const tx_ = await tx.kaneTransaction.create({
      data: {
        tenantId,
        accountId,
        type:          'depot',
        amount:        amt,
        balanceBefore: balBefore,
        balanceAfter:  balAfter,
        method:        method  || 'cash',
        reference:     reference || null,
        notes:         notes     || null,
        createdBy:     userId,
      },
      include: { creator: { select: { fullName: true } } }
    })

    return { transaction: tx_, balanceAfter: balAfter }
  })

  return result
}

// ── Fè yon retrè ──────────────────────────────────────────────
async function withdraw(tenantId, accountId, userId, data) {
  const { amount, method, reference, notes } = data
  const amt = Number(amount || 0)
  if (amt <= 0) throw new Error('Montan dwe plis ke 0.')

  const account = await prisma.kaneEpay.findFirst({
    where: { id: accountId, tenantId, isActive: true }
  })
  if (!account) throw new Error('Kont pa jwenn oswa inaktif.')

  const balBefore = Number(account.balance)
  if (amt > balBefore) throw new Error(`Balans ensifizàn. Disponib: ${balBefore.toFixed(2)} HTG`)

  const balAfter = balBefore - amt

  const result = await prisma.$transaction(async (tx) => {
    await tx.kaneEpay.update({
      where: { id: accountId },
      data: { balance: balAfter }
    })

    const tx_ = await tx.kaneTransaction.create({
      data: {
        tenantId,
        accountId,
        type:          'retrait',
        amount:        amt,
        balanceBefore: balBefore,
        balanceAfter:  balAfter,
        method:        method   || 'cash',
        reference:     reference || null,
        notes:         notes     || null,
        createdBy:     userId,
      },
      include: { creator: { select: { fullName: true } } }
    })

    return { transaction: tx_, balanceAfter: balAfter }
  })

  return result
}

// ── Estatistik ────────────────────────────────────────────────
async function getStats(tenantId, branchId) {
  const where = { tenantId, ...(branchId && { branchId }) }

  const [totalAccounts, activeAccounts, balanceSum, todayTx] = await Promise.all([
    prisma.kaneEpay.count({ where }),
    prisma.kaneEpay.count({ where: { ...where, isActive: true } }),
    prisma.kaneEpay.aggregate({ where: { ...where, isActive: true }, _sum: { balance: true } }),
    prisma.kaneTransaction.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
      }
    })
  ])

  return {
    totalAccounts,
    activeAccounts,
    totalBalance: Number(balanceSum._sum.balance || 0),
    todayTransactions: todayTx,
  }
}

module.exports = { createAccount, getAccounts, getAccountById, deposit, withdraw, getStats }
