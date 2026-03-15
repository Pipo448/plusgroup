// backend/src/modules/sabotay/sol-exchange.service.js
// ✅ Sèvis echanj pozisyon Sol — mache men sol

const prisma     = require('../../config/prisma')
const solPushSvc = require('./sol-push.service')

// ─────────────────────────────────────────────────────────────
// KALKILE FRÈ ECHANJ
// Pousantaj baze sou diferans pozisyon × montan plan an
// ─────────────────────────────────────────────────────────────
function calcFee(posDiff, planAmount, totalMembers, feePct, feeAdminPct) {
  // Valè 1 "sik" = montan plan × diferans pozisyon
  // Pousantaj sou sa
  const base       = planAmount * posDiff
  const feeAmount  = Math.round((base * feePct) / 100)
  const feeAdminAmt  = Math.round((feeAmount * feeAdminPct) / 100)
  const feeSellerAmt = feeAmount - feeAdminAmt
  return { feeAmount, feeAdminAmt, feeSellerAmt, positionDiff: posDiff }
}

// ─────────────────────────────────────────────────────────────
// JWENN KONFIGIRASYON FRÈ PLAN AN
// Admin ka fikse feePct + feeAdminPct sou plan an
// Pa defò: 10% total, 50% admin / 50% vendeur
// ─────────────────────────────────────────────────────────────
async function getPlanExchangeConfig(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where: { id: planId },
    select: { id: true, amount: true, maxMembers: true, exchangeFeePct: true, exchangeFeeAdminPct: true }
  })
  return {
    feePct:       Number(plan?.exchangeFeePct      ?? 10),
    feeAdminPct:  Number(plan?.exchangeFeeAdminPct ?? 50),
    planAmount:   Number(plan?.amount ?? 0),
    maxMembers:   plan?.maxMembers ?? 0,
  }
}

// ─────────────────────────────────────────────────────────────
// INISYE yon ofri echanj
// offerType: 'buy' = moun vle monte (pos aktyèl > cible)
//            'sell' = moun vle desann (pos aktyèl < cible)
// targetId: opsyonèl — si pa bay, se ofri piblik
// ─────────────────────────────────────────────────────────────
async function initiateExchange(tenantId, planId, initiatorAccountId, data) {
  const { offerType, targetAccountId, notes } = data

  // Verifye initiator
  const initiatorAcc = await prisma.solMemberAccount.findFirst({
    where: { id: initiatorAccountId, tenantId }
  })
  if (!initiatorAcc) throw new Error('Kont ou pa jwenn.')

  // Jwenn SabotayMember pou initiator nan plan sa a
  const initiatorPos = await prisma.solMemberPosition.findFirst({
    where: { accountId: initiatorAccountId, planId, status: 'active' }
  })
  if (!initiatorPos) throw new Error('Ou pa nan plan sa a.')

  // Verifye pa gen ofri pending déjà
  const existing = await prisma.solPositionExchange.findFirst({
    where: {
      planId, initiatorId: initiatorAccountId,
      status: 'pending',
      expiresAt: { gt: new Date() }
    }
  })
  if (existing) throw new Error('Ou gen deja yon ofri k ap tann. Anile l anvan ou kreye yon nouvo.')

  // Jwenn config frè
  const { feePct, feeAdminPct, planAmount } = await getPlanExchangeConfig(planId)

  let targetPos = null
  let targetId  = null
  let posDiff   = 0
  let feeCalc   = { feeAmount: 0, feeAdminAmt: 0, feeSellerAmt: 0, positionDiff: 0 }

  if (targetAccountId) {
    // Echanj dirèk ak yon manm espesifik
    const targetPosRec = await prisma.solMemberPosition.findFirst({
      where: { accountId: targetAccountId, planId, status: 'active' }
    })
    if (!targetPosRec) throw new Error('Manm cible a pa nan plan sa a.')
    if (targetAccountId === initiatorAccountId) throw new Error('Pa ka echanje ak tèt ou.')

    targetId  = targetAccountId
    targetPos = targetPosRec.memberPosition
    posDiff   = Math.abs(initiatorPos.memberPosition - targetPos)
    feeCalc   = calcFee(posDiff, planAmount, 0, feePct, feeAdminPct)
  }

  const exchange = await prisma.solPositionExchange.create({
    data: {
      tenantId,
      planId,
      initiatorId:    initiatorAccountId,
      initiatorPos:   initiatorPos.memberPosition,
      targetId:       targetId   || null,
      targetPos:      targetPos  || null,
      offerType:      offerType  || 'buy',
      positionDiff:   feeCalc.positionDiff,
      feePct,
      feeAdminPct,
      feeAmount:      feeCalc.feeAmount,
      feeAdminAmt:    feeCalc.feeAdminAmt,
      feeSellerAmt:   feeCalc.feeSellerAmt,
      notes:          notes || null,
      status:         'pending',
    }
  })

  // Notifye target si echanj dirèk
  if (targetId) {
    const targetAcc = await prisma.solMemberAccount.findUnique({ where: { id: targetId } })
    await solPushSvc.sendToSolMember(targetAcc?.memberId, {
      title: '🔄 Ofri Echanj Pozisyon',
      body:  `${initiatorAcc.memberName} (Men #${initiatorPos.memberPosition}) ofri echanje pozisyon ak ou (Men #${targetPos}). Frè: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG`,
      tag:   `exchange-${exchange.id}`,
      data:  { url: '/sol/dashboard' },
    }).catch(() => {})
  } else {
    // Ofri piblik — notifye tout manm plan an
    await notifyAllPlanMembers(planId, initiatorAcc, initiatorPos.memberPosition, offerType, exchange.id)
  }

  return exchange
}

// ─────────────────────────────────────────────────────────────
// Notifye tout manm yon plan (pou ofri piblik)
// ─────────────────────────────────────────────────────────────
async function notifyAllPlanMembers(planId, initiatorAcc, initiatorPos, offerType, exchangeId) {
  try {
    const positions = await prisma.solMemberPosition.findMany({
      where: { planId, status: 'active' },
      select: { memberId: true, accountId: true }
    })
    const typeLabel = offerType === 'buy' ? 'vle MONTE (achte men devan)' : 'vle DESANN (vann men devan)'
    for (const p of positions) {
      if (p.accountId === initiatorAcc.id) continue // pa notifye tèt ou
      await solPushSvc.sendToSolMember(p.memberId, {
        title: '📢 Mache Men Sol',
        body:  `${initiatorAcc.memberName} (Men #${initiatorPos}) ${typeLabel}. Klike pou wè detay.`,
        tag:   `exchange-pub-${exchangeId}`,
        data:  { url: '/sol/dashboard' },
      }).catch(() => {})
    }
  } catch (err) {
    console.warn('[Exchange] Notifikasyon piblik echwe:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────
// AKSEPTE yon echanj
// ─────────────────────────────────────────────────────────────
async function acceptExchange(tenantId, exchangeId, acceptorAccountId) {
  const exchange = await prisma.solPositionExchange.findFirst({
    where: { id: exchangeId, tenantId, status: 'pending' }
  })
  if (!exchange) throw new Error('Echanj pa jwenn oswa pa disponib ankò.')
  if (new Date() > exchange.expiresAt) {
    await prisma.solPositionExchange.update({ where: { id: exchangeId }, data: { status: 'expired' } })
    throw new Error('Ofri a ekspire.')
  }
  if (exchange.initiatorId === acceptorAccountId) throw new Error('Pa ka aksepte pwòp ofri ou.')

  // Jwenn pozisyon acceptor
  const acceptorPos = await prisma.solMemberPosition.findFirst({
    where: { accountId: acceptorAccountId, planId: exchange.planId, status: 'active' }
  })
  if (!acceptorPos) throw new Error('Ou pa nan plan sa a.')

  // Si echanj dirèk — verifye se bien target la
  if (exchange.targetId && exchange.targetId !== acceptorAccountId) {
    throw new Error('Ofri sa a pa pou ou.')
  }

  // Kalkile frè (si pa te kalkile deja — cas ofri piblik)
  const { feePct, feeAdminPct, planAmount } = await getPlanExchangeConfig(exchange.planId)
  const posDiff = Math.abs(exchange.initiatorPos - acceptorPos.memberPosition)
  const feeCalc = calcFee(posDiff, planAmount, 0, feePct, feeAdminPct)

  // Nouvo pozisyon: echanje
  const newInitiatorPos = acceptorPos.memberPosition
  const newTargetPos    = exchange.initiatorPos

  // ── Fè echanj la nan BD (transaksyon atomik) ──
  await prisma.$transaction(async (tx) => {
    // 1. Mete ajou SolMemberPosition pou initiator
    await tx.solMemberPosition.updateMany({
      where: { accountId: exchange.initiatorId, planId: exchange.planId },
      data:  { memberPosition: newInitiatorPos }
    })

    // 2. Mete ajou SolMemberPosition pou acceptor
    await tx.solMemberPosition.updateMany({
      where: { accountId: acceptorAccountId, planId: exchange.planId },
      data:  { memberPosition: newTargetPos }
    })

    // 3. Mete ajou SabotayMember tou (pozisyon BD prensipal)
    const initiatorMem = await tx.solMemberPosition.findFirst({
      where: { accountId: exchange.initiatorId, planId: exchange.planId }
    })
    const acceptorMem = await tx.solMemberPosition.findFirst({
      where: { accountId: acceptorAccountId, planId: exchange.planId }
    })
    if (initiatorMem?.memberId) {
      await tx.sabotayMember.update({
        where: { id: initiatorMem.memberId },
        data:  { position: newInitiatorPos }
      })
    }
    if (acceptorMem?.memberId) {
      await tx.sabotayMember.update({
        where: { id: acceptorMem.memberId },
        data:  { position: newTargetPos }
      })
    }

    // 4. Mete ajou echanj la
    await tx.solPositionExchange.update({
      where: { id: exchangeId },
      data: {
        targetId:       acceptorAccountId,
        targetPos:      acceptorPos.memberPosition,
        newInitiatorPos,
        newTargetPos,
        positionDiff:   feeCalc.positionDiff,
        feeAmount:      feeCalc.feeAmount,
        feeAdminAmt:    feeCalc.feeAdminAmt,
        feeSellerAmt:   feeCalc.feeSellerAmt,
        status:         'accepted',
        updatedAt:      new Date(),
      }
    })
  })

  // Notifye tou de manm yo
  const [initiatorAcc, acceptorAcc] = await Promise.all([
    prisma.solMemberAccount.findUnique({ where: { id: exchange.initiatorId } }),
    prisma.solMemberAccount.findUnique({ where: { id: acceptorAccountId } }),
  ])

  await Promise.all([
    solPushSvc.sendToSolMember(initiatorAcc?.memberId, {
      title: '✅ Echanj Aksepte!',
      body:  `${acceptorAcc?.memberName} aksepte echanj la. Ou pase Men #${exchange.initiatorPos} → Men #${newInitiatorPos}. Frè vendè: ${feeCalc.feeSellerAmt.toLocaleString('fr-HT')} HTG`,
      tag:   `exchange-done-${exchangeId}`,
      data:  { url: '/sol/dashboard' },
    }).catch(() => {}),
    solPushSvc.sendToSolMember(acceptorAcc?.memberId, {
      title: '✅ Echanj Aksepte!',
      body:  `Ou pase Men #${acceptorPos.memberPosition} → Men #${newTargetPos}. Frè ou peye: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG`,
      tag:   `exchange-done2-${exchangeId}`,
      data:  { url: '/sol/dashboard' },
    }).catch(() => {}),
  ])

  return { success: true, newInitiatorPos, newTargetPos, feeCalc }
}

// ─────────────────────────────────────────────────────────────
// REFIZE yon echanj
// ─────────────────────────────────────────────────────────────
async function rejectExchange(tenantId, exchangeId, rejectorAccountId) {
  const exchange = await prisma.solPositionExchange.findFirst({
    where: { id: exchangeId, tenantId, status: 'pending' }
  })
  if (!exchange) throw new Error('Echanj pa jwenn.')

  // Sèlman target oswa initiator ka refize
  const isTarget    = exchange.targetId === rejectorAccountId
  const isInitiator = exchange.initiatorId === rejectorAccountId
  if (!isTarget && !isInitiator) throw new Error('Pa otorize refize echanj sa.')

  const newStatus = isInitiator ? 'cancelled' : 'rejected'
  await prisma.solPositionExchange.update({
    where: { id: exchangeId },
    data:  { status: newStatus, updatedAt: new Date() }
  })

  // Notifye lòt pati
  if (isTarget && exchange.initiatorId) {
    const initiatorAcc = await prisma.solMemberAccount.findUnique({ where: { id: exchange.initiatorId } })
    await solPushSvc.sendToSolMember(initiatorAcc?.memberId, {
      title: '❌ Echanj Refize',
      body:  'Ofri echanj ou a refize. Ou ka eseye ak yon lòt manm.',
      tag:   `exchange-rej-${exchangeId}`,
      data:  { url: '/sol/dashboard' },
    }).catch(() => {})
  }

  return { success: true, status: newStatus }
}

// ─────────────────────────────────────────────────────────────
// JWENN ofri piblik yo nan yon plan
// ─────────────────────────────────────────────────────────────
async function getPublicOffers(tenantId, planId, viewerAccountId) {
  const offers = await prisma.solPositionExchange.findMany({
    where: {
      tenantId, planId,
      status: 'pending',
      targetId: null, // ofri piblik sèlman
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Ajoute info manm pou chak ofri
  const enriched = await Promise.all(offers.map(async (o) => {
    const initiatorAcc = await prisma.solMemberAccount.findUnique({
      where: { id: o.initiatorId },
      select: { memberName: true, memberPhone: true }
    })
    const { feePct, feeAdminPct, planAmount } = await getPlanExchangeConfig(planId)

    // Si se viewer ki ta echanje avè l, kalkile frè pou li
    let feePreview = null
    if (viewerAccountId && viewerAccountId !== o.initiatorId) {
      const viewerPos = await prisma.solMemberPosition.findFirst({
        where: { accountId: viewerAccountId, planId, status: 'active' }
      })
      if (viewerPos) {
        const diff = Math.abs(o.initiatorPos - viewerPos.memberPosition)
        feePreview = calcFee(diff, planAmount, 0, feePct, feeAdminPct)
        feePreview.viewerCurrentPos = viewerPos.memberPosition
      }
    }

    return { ...o, initiatorName: initiatorAcc?.memberName, feePreview }
  }))

  return enriched
}

// ─────────────────────────────────────────────────────────────
// JWENN echanj pou yon manm (istwa + pending)
// ─────────────────────────────────────────────────────────────
async function getMemberExchanges(tenantId, accountId, planId) {
  return prisma.solPositionExchange.findMany({
    where: {
      tenantId,
      planId,
      OR: [{ initiatorId: accountId }, { targetId: accountId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

// ─────────────────────────────────────────────────────────────
// ADMIN — Jwenn tout echanj + konfigire frè
// ─────────────────────────────────────────────────────────────
async function getAdminExchanges(tenantId, planId, params = {}) {
  const { status, page = 1, limit = 20 } = params
  const where = {
    tenantId,
    ...(planId && { planId }),
    ...(status && { status }),
  }
  const [exchanges, total] = await Promise.all([
    prisma.solPositionExchange.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.solPositionExchange.count({ where }),
  ])
  return { exchanges, total }
}

async function updateExchangeConfig(tenantId, planId, userId, config) {
  const { exchangeFeePct, exchangeFeeAdminPct } = config
  const plan = await prisma.sabotayPlan.findFirst({ where: { id: planId, tenantId } })
  if (!plan) throw new Error('Plan pa jwenn.')

  return prisma.sabotayPlan.update({
    where: { id: planId },
    data: {
      ...(exchangeFeePct      !== undefined && { exchangeFeePct:      Number(exchangeFeePct) }),
      ...(exchangeFeeAdminPct !== undefined && { exchangeFeeAdminPct: Number(exchangeFeeAdminPct) }),
    }
  })
}

module.exports = {
  initiateExchange,
  acceptExchange,
  rejectExchange,
  getPublicOffers,
  getMemberExchanges,
  getAdminExchanges,
  updateExchangeConfig,
  calcFee,
}
