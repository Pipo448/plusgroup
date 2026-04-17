// backend/src/modules/sabotay/sol-exchange.service.js
// ✅ Sèvis echanj pozisyon Sol — mache men sol

const prisma     = require('../../config/prisma')
const solPushSvc = require('./sol-push.service')

function calcFee(posDiff, planAmount, totalMembers, feePct, feeAdminPct) {
  const base         = planAmount * posDiff
  const feeAmount    = Math.round((base * feePct) / 100)
  const feeAdminAmt  = Math.round((feeAmount * feeAdminPct) / 100)
  const feeSellerAmt = feeAmount - feeAdminAmt
  return { feeAmount, feeAdminAmt, feeSellerAmt, positionDiff: posDiff }
}

async function getPlanExchangeConfig(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:  { id: planId },
    select: { id: true, amount: true, maxMembers: true, exchangeFeePct: true, exchangeFeeAdminPct: true }
  })
  return {
    feePct:      Number(plan?.exchangeFeePct      ?? 10),
    feeAdminPct: Number(plan?.exchangeFeeAdminPct ?? 50),
    planAmount:  Number(plan?.amount ?? 0),
    maxMembers:  plan?.maxMembers ?? 0,
  }
}

// ─────────────────────────────────────────────────────────────
// INISYE yon ofri echanj
// ✅ FIX: Aksepte memberPosition nan body pou manm ki gen plizyè men
// ─────────────────────────────────────────────────────────────
async function initiateExchange(tenantId, planId, initiatorAccountId, data) {
  const { offerType, targetAccountId, notes, memberPosition } = data

  // Verifye initiator kont
  const initiatorAcc = await prisma.solMemberAccount.findFirst({
    where: { id: initiatorAccountId, tenantId }
  })
  if (!initiatorAcc) throw new Error('Kont ou pa jwenn.')

  const actualPlanId = initiatorAcc.planId || planId

  // ✅ Si manm espesifye ki men li vle vann — itilize sa dirèkteman
  let initiatorMemberPos = null

  if (memberPosition) {
    // Eseye jwenn ranje espesifik sa nan sol_member_positions
    const posRecord = await prisma.solMemberPosition.findFirst({
      where: {
        accountId:      initiatorAccountId,
        status:         'active',
        memberPosition: Number(memberPosition),
      }
    })

    if (posRecord) {
      initiatorMemberPos = posRecord.memberPosition
    } else {
      // Fallback: verifye nan sabotayMember dirèkteman
      const memberRec = await prisma.sabotayMember.findFirst({
        where: {
          planId:   actualPlanId,
          position: Number(memberPosition),
          isActive: true,
        }
      })
      if (memberRec) {
        initiatorMemberPos = memberRec.position
      }
    }
  }

  // Si memberPosition pa t bay oswa pa jwenn — pran pi ba a (premye)
  if (!initiatorMemberPos) {
    const posRecord = await prisma.solMemberPosition.findFirst({
      where:   { accountId: initiatorAccountId, status: 'active' },
      orderBy: { memberPosition: 'asc' }
    })

    if (posRecord) {
      initiatorMemberPos = posRecord.memberPosition
    } else {
      // Dènye fallback: kont la menm
      initiatorMemberPos = initiatorAcc.memberPosition
    }
  }

  if (!initiatorMemberPos) throw new Error('Pozisyon ou pa jwenn.')

  // Verifye pa gen ofri pending déjà pou menm pozisyon sa
  const existing = await prisma.solPositionExchange.findFirst({
    where: {
      planId:      actualPlanId,
      initiatorId: initiatorAccountId,
      initiatorPos: initiatorMemberPos,
      status:      'pending',
      expiresAt:   { gt: new Date() }
    }
  })
  if (existing) throw new Error('Ou gen deja yon ofri k ap tann pou men sa. Anile l anvan ou kreye yon nouvo.')

  const { feePct, feeAdminPct, planAmount } = await getPlanExchangeConfig(actualPlanId)

  let targetPos = null
  let targetId  = null
  let feeCalc   = { feeAmount: 0, feeAdminAmt: 0, feeSellerAmt: 0, positionDiff: 0 }

  if (targetAccountId) {
    // Eseye jwenn pozisyon target nan sol_member_positions oswa solMemberAccount
    const targetPosRec = await prisma.solMemberPosition.findFirst({
      where: { accountId: targetAccountId, planId: actualPlanId, status: 'active' },
      orderBy: { memberPosition: 'asc' }
    })
    const targetAccRec = await prisma.solMemberAccount.findFirst({
      where: { id: targetAccountId }
    })

    const targetMemberPos = targetPosRec?.memberPosition ?? targetAccRec?.memberPosition
    if (!targetMemberPos) throw new Error('Manm cible a pa nan plan sa a.')
    if (targetAccountId === initiatorAccountId) throw new Error('Pa ka echanje ak tèt ou.')

    targetId  = targetAccountId
    targetPos = targetMemberPos
    const posDiff = Math.abs(initiatorMemberPos - targetPos)
    feeCalc   = calcFee(posDiff, planAmount, 0, feePct, feeAdminPct)
  }

  const exchange = await prisma.solPositionExchange.create({
    data: {
      tenantId,
      planId:       actualPlanId,
      initiatorId:  initiatorAccountId,
      initiatorPos: initiatorMemberPos,  // ✅ Men espesifik manm te chwazi
      targetId:     targetId  || null,
      targetPos:    targetPos || null,
      offerType:    offerType || 'buy',
      positionDiff: feeCalc.positionDiff,
      feePct,
      feeAdminPct,
      feeAmount:    feeCalc.feeAmount,
      feeAdminAmt:  feeCalc.feeAdminAmt,
      feeSellerAmt: feeCalc.feeSellerAmt,
      notes:        notes || null,
      status:       'pending',
    }
  })

  if (targetId) {
    const targetAcc = await prisma.solMemberAccount.findUnique({ where: { id: targetId } })
    await solPushSvc.sendToSolMember(targetAcc?.memberId, {
      title: '🔄 Ofri Echanj Pozisyon',
      body:  `${initiatorAcc.memberName} (Men #${initiatorMemberPos}) ofri echanje pozisyon ak ou (Men #${targetPos}). Frè: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG`,
      tag:   `exchange-${exchange.id}`,
      data:  { url: '/sol/dashboard' },
    }).catch(() => {})
  } else {
    await notifyAllPlanMembers(actualPlanId, initiatorAcc, initiatorMemberPos, offerType, exchange.id)
  }

  return exchange
}

// ─────────────────────────────────────────────────────────────
// Notifye tout manm yon plan (pou ofri piblik)
// ─────────────────────────────────────────────────────────────
async function notifyAllPlanMembers(planId, initiatorAcc, initiatorPos, offerType, exchangeId) {
  try {
    const positions = await prisma.solMemberPosition.findMany({
      where:  { planId, status: 'active' },
      select: { memberId: true, accountId: true }
    })
    const typeLabel = offerType === 'buy' ? 'vle MONTE (achte men devan)' : 'vle DESANN (vann men devan)'
    for (const p of positions) {
      if (p.accountId === initiatorAcc.id) continue
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

  // Jwenn pozisyon acceptor — sol_member_positions oswa solMemberAccount
  let acceptorMemberPos = null
  const acceptorPosRec = await prisma.solMemberPosition.findFirst({
    where:   { accountId: acceptorAccountId, planId: exchange.planId, status: 'active' },
    orderBy: { memberPosition: 'asc' }
  })
  if (acceptorPosRec) {
    acceptorMemberPos = acceptorPosRec.memberPosition
  } else {
    const acceptorAccRec = await prisma.solMemberAccount.findFirst({
      where: { id: acceptorAccountId }
    })
    acceptorMemberPos = acceptorAccRec?.memberPosition
  }
  if (!acceptorMemberPos) throw new Error('Ou pa nan plan sa a.')

  if (exchange.targetId && exchange.targetId !== acceptorAccountId) {
    throw new Error('Ofri sa a pa pou ou.')
  }

  const { feePct, feeAdminPct, planAmount } = await getPlanExchangeConfig(exchange.planId)
  const posDiff = Math.abs(exchange.initiatorPos - acceptorMemberPos)
  const feeCalc = calcFee(posDiff, planAmount, 0, feePct, feeAdminPct)

  const newInitiatorPos = acceptorMemberPos
  const newTargetPos    = exchange.initiatorPos

  await prisma.$transaction(async (tx) => {
    await tx.solMemberPosition.updateMany({
      where: { accountId: exchange.initiatorId, planId: exchange.planId, memberPosition: exchange.initiatorPos },
      data:  { memberPosition: newInitiatorPos }
    })

    await tx.solMemberPosition.updateMany({
      where: { accountId: acceptorAccountId, planId: exchange.planId, memberPosition: acceptorMemberPos },
      data:  { memberPosition: newTargetPos }
    })

    // Mete ajou sabotayMember tou
    const initiatorMemRec = await tx.solMemberPosition.findFirst({
      where: { accountId: exchange.initiatorId, planId: exchange.planId, memberPosition: newInitiatorPos }
    })
    const acceptorMemRec = await tx.solMemberPosition.findFirst({
      where: { accountId: acceptorAccountId, planId: exchange.planId, memberPosition: newTargetPos }
    })
    if (initiatorMemRec?.memberId) {
      await tx.sabotayMember.update({
        where: { id: initiatorMemRec.memberId },
        data:  { position: newInitiatorPos }
      })
    }
    if (acceptorMemRec?.memberId) {
      await tx.sabotayMember.update({
        where: { id: acceptorMemRec.memberId },
        data:  { position: newTargetPos }
      })
    }

    await tx.solPositionExchange.update({
      where: { id: exchangeId },
      data: {
        targetId:       acceptorAccountId,
        targetPos:      acceptorMemberPos,
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
      body:  `Ou pase Men #${acceptorMemberPos} → Men #${newTargetPos}. Frè ou peye: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG`,
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

  const isTarget    = exchange.targetId    === rejectorAccountId
  const isInitiator = exchange.initiatorId === rejectorAccountId
  if (!isTarget && !isInitiator) throw new Error('Pa otorize refize echanj sa.')

  const newStatus = isInitiator ? 'cancelled' : 'rejected'
  await prisma.solPositionExchange.update({
    where: { id: exchangeId },
    data:  { status: newStatus, updatedAt: new Date() }
  })

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
      status:    'pending',
      targetId:  null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const enriched = await Promise.all(offers.map(async (o) => {
    const initiatorAcc = await prisma.solMemberAccount.findUnique({
      where:  { id: o.initiatorId },
      select: { memberName: true, memberPhone: true }
    })
    const { feePct, feeAdminPct, planAmount } = await getPlanExchangeConfig(planId)

    let feePreview = null
    if (viewerAccountId && viewerAccountId !== o.initiatorId) {
      const viewerPosRec = await prisma.solMemberPosition.findFirst({
        where:   { accountId: viewerAccountId, planId, status: 'active' },
        orderBy: { memberPosition: 'asc' }
      })
      const viewerAcc = await prisma.solMemberAccount.findFirst({
        where: { id: viewerAccountId }
      })
      const viewerPos = viewerPosRec?.memberPosition ?? viewerAcc?.memberPosition
      if (viewerPos) {
        const diff = Math.abs(o.initiatorPos - viewerPos)
        feePreview = calcFee(diff, planAmount, 0, feePct, feeAdminPct)
        feePreview.viewerCurrentPos = viewerPos
      }
    }

    return { ...o, initiatorName: initiatorAcc?.memberName, feePreview }
  }))

  return enriched
}

// ─────────────────────────────────────────────────────────────
// JWENN echanj pou yon manm
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
// ADMIN
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