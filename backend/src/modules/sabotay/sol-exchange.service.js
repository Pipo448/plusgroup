// backend/src/modules/sabotay/sol-exchange.service.js
const prisma     = require('../../config/prisma')
const solPushSvc = require('./sol-push.service')

function calcFee(posDiff, feeFixed, feeAdminFixed) {
  const feeAmount    = feeFixed
  const feeAdminAmt  = feeAdminFixed
  const feeSellerAmt = feeAmount - feeAdminAmt
  return { feeAmount, feeAdminAmt, feeSellerAmt, positionDiff: posDiff }
}

async function getPlanExchangeConfig(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:  { id: planId },
    select: { id: true, amount: true, maxMembers: true, exchangeFeePct: true, exchangeFeeAdminPct: true }
  })
  return {
    feeFixed:      Number(plan?.exchangeFeePct      ?? 1250),
    feeAdminFixed: Number(plan?.exchangeFeeAdminPct ?? 250),
    planAmount:    Number(plan?.amount ?? 0),
    maxMembers:    plan?.maxMembers ?? 0,
  }
}

// ─────────────────────────────────────────────────────────────
// INISYE yon ofri echanj
// ─────────────────────────────────────────────────────────────
async function initiateExchange(tenantId, planId, initiatorAccountId, data) {
  const { offerType, targetAccountId, notes, memberPosition } = data

  const initiatorAcc = await prisma.solMemberAccount.findFirst({
    where: { id: initiatorAccountId, tenantId }
  })
  if (!initiatorAcc) throw new Error('Kont ou pa jwenn.')

  const actualPlanId = initiatorAcc.planId || planId

  if (initiatorAcc.memberId) {
    const memberRec = await prisma.sabotayMember.findUnique({ where: { id: initiatorAcc.memberId } })
    if (memberRec?.hasWon) throw new Error('Ou deja touche men ou a. Sèlman manm ki poko touche ka fè echanj.')
  }

  let initiatorMemberPos = null

  if (memberPosition) {
    const posRecord = await prisma.solMemberPosition.findFirst({
      where: { accountId: initiatorAccountId, status: 'active', memberPosition: Number(memberPosition) }
    })
    if (posRecord) {
      initiatorMemberPos = posRecord.memberPosition
    } else {
      const memberRec = await prisma.sabotayMember.findFirst({
        where: { planId: actualPlanId, position: Number(memberPosition), isActive: true }
      })
      if (memberRec) {
        if (memberRec.hasWon) throw new Error(`Men #${memberPosition} deja touche. Pa ka vann plas sa a.`)
        initiatorMemberPos = memberRec.position
      }
    }
  }

  if (!initiatorMemberPos) {
    const posRecord = await prisma.solMemberPosition.findFirst({
      where:   { accountId: initiatorAccountId, status: 'active' },
      orderBy: { memberPosition: 'asc' }
    })
    initiatorMemberPos = posRecord?.memberPosition ?? initiatorAcc.memberPosition
  }

  if (!initiatorMemberPos) throw new Error('Pozisyon ou pa jwenn.')

  const existing = await prisma.solPositionExchange.findFirst({
    where: {
      planId: actualPlanId, initiatorId: initiatorAccountId,
      initiatorPos: initiatorMemberPos, status: 'pending',
      expiresAt: { gt: new Date() }
    }
  })
  if (existing) throw new Error('Ou gen deja yon ofri k ap tann pou men sa. Anile l anvan ou kreye yon nouvo.')

  const { feeFixed, feeAdminFixed } = await getPlanExchangeConfig(actualPlanId)

  let targetPos = null, targetId = null
  let feeCalc = { feeAmount: 0, feeAdminAmt: 0, feeSellerAmt: 0, positionDiff: 0 }

  if (targetAccountId) {
    const targetAcc = await prisma.solMemberAccount.findFirst({ where: { id: targetAccountId } })
    if (targetAcc?.memberId) {
      const targetMember = await prisma.sabotayMember.findUnique({ where: { id: targetAcc.memberId } })
      if (targetMember?.hasWon) throw new Error('Manm cible a deja touche. Pa ka echanje ak li.')
    }
    const targetPosRec = await prisma.solMemberPosition.findFirst({
      where: { accountId: targetAccountId, planId: actualPlanId, status: 'active' },
      orderBy: { memberPosition: 'asc' }
    })
    const targetMemberPos = targetPosRec?.memberPosition ?? targetAcc?.memberPosition
    if (!targetMemberPos) throw new Error('Manm cible a pa nan plan sa a.')
    if (targetAccountId === initiatorAccountId) throw new Error('Pa ka echanje ak tèt ou.')
    targetId = targetAccountId
    targetPos = targetMemberPos
    feeCalc = calcFee(Math.abs(initiatorMemberPos - targetPos), feeFixed, feeAdminFixed)
  }

  const exchange = await prisma.solPositionExchange.create({
    data: {
      tenantId, planId: actualPlanId,
      initiatorId: initiatorAccountId, initiatorPos: initiatorMemberPos,
      targetId: targetId || null, targetPos: targetPos || null,
      offerType: offerType || 'buy', positionDiff: feeCalc.positionDiff,
      feePct: feeFixed, feeAdminPct: feeAdminFixed,
      feeAmount: feeCalc.feeAmount, feeAdminAmt: feeCalc.feeAdminAmt,
      feeSellerAmt: feeCalc.feeSellerAmt, notes: notes || null, status: 'pending',
    }
  })

  if (targetId) {
    const tAcc = await prisma.solMemberAccount.findUnique({ where: { id: targetId } })
    await solPushSvc.sendToSolMember(tAcc?.memberId, {
      title: '🔄 Ofri Echanj Pozisyon',
      body: `${initiatorAcc.memberName} (Men #${initiatorMemberPos}) ofri echanje pozisyon ak ou (Men #${targetPos}). Frè: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG`,
      tag: `exchange-${exchange.id}`, data: { url: '/sol/dashboard' },
    }).catch(() => {})
  } else {
    await notifyAllPlanMembers(actualPlanId, initiatorAcc, initiatorMemberPos, offerType, exchange.id)
  }

  return exchange
}

async function notifyAllPlanMembers(planId, initiatorAcc, initiatorPos, offerType, exchangeId) {
  try {
    const positions = await prisma.solMemberPosition.findMany({
      where: { planId, status: 'active' }, select: { memberId: true, accountId: true }
    })
    const typeLabel = offerType === 'buy' ? 'vle MONTE (achte men devan)' : 'vle DESANN (vann men devan)'
    for (const p of positions) {
      if (p.accountId === initiatorAcc.id) continue
      await solPushSvc.sendToSolMember(p.memberId, {
        title: '📢 Mache Men Sol',
        body: `${initiatorAcc.memberName} (Men #${initiatorPos}) ${typeLabel}. Klike pou wè detay.`,
        tag: `exchange-pub-${exchangeId}`, data: { url: '/sol/dashboard' },
      }).catch(() => {})
    }
  } catch (err) {
    console.warn('[Exchange] Notifikasyon piblik echwe:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────
// AKSEPTE yon echanj
// ✅ FIX DEFINITIF: chaje memberId ANVAN transaksyon an
//    pa chèche apre update — evite race condition
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

  // ✅ Chaje tout done ANVAN transaksyon an — memberId kritik
  const [initiatorAccData, acceptorAccData] = await Promise.all([
    prisma.solMemberAccount.findUnique({ where: { id: exchange.initiatorId } }),
    prisma.solMemberAccount.findUnique({ where: { id: acceptorAccountId } }),
  ])
  if (!initiatorAccData) throw new Error('Kont initiator pa jwenn.')
  if (!acceptorAccData)  throw new Error('Kont acceptor pa jwenn.')

  if (acceptorAccData.memberId) {
    const accMember = await prisma.sabotayMember.findUnique({ where: { id: acceptorAccData.memberId } })
    if (accMember?.hasWon) throw new Error('Ou deja touche men ou a. Pa ka fè echanj.')
  }

  if (exchange.targetId && exchange.targetId !== acceptorAccountId) throw new Error('Ofri sa a pa pou ou.')

  // Jwenn pozisyon acceptor
  const acceptorPosRec = await prisma.solMemberPosition.findFirst({
    where: { accountId: acceptorAccountId, planId: exchange.planId, status: 'active' },
    orderBy: { memberPosition: 'asc' }
  })
  const acceptorMemberPos = acceptorPosRec?.memberPosition ?? acceptorAccData.memberPosition
  if (!acceptorMemberPos) throw new Error('Ou pa nan plan sa a.')

  const { feeFixed, feeAdminFixed } = await getPlanExchangeConfig(exchange.planId)
  const feeCalc = calcFee(Math.abs(exchange.initiatorPos - acceptorMemberPos), feeFixed, feeAdminFixed)

  // Yveleau (#30) ofri → li desann ale #46
  // Frido (#46) aksepte → li monte ale #30
  const newInitiatorPos = acceptorMemberPos    // initiator (Yveleau) pran plas acceptor (Frido) = #46
  const newTargetPos    = exchange.initiatorPos // acceptor (Frido) pran plas initiator (Yveleau) = #30

  const initiatorMonte        = newInitiatorPos < exchange.initiatorPos
  const initiatorBalanceDelta = initiatorMonte ? -feeCalc.feeAmount    : feeCalc.feeSellerAmt
  const acceptorBalanceDelta  = initiatorMonte ?  feeCalc.feeSellerAmt : -feeCalc.feeAmount

  await prisma.$transaction(async (tx) => {

    // ── 1. Update sol_member_positions ──────────────────────
    await tx.solMemberPosition.updateMany({
      where: { accountId: exchange.initiatorId, planId: exchange.planId, memberPosition: exchange.initiatorPos },
      data:  { memberPosition: newInitiatorPos }
    })
    await tx.solMemberPosition.updateMany({
      where: { accountId: acceptorAccountId, planId: exchange.planId, memberPosition: acceptorMemberPos },
      data:  { memberPosition: newTargetPos }
    })

    // ── 2. ✅ Update sabotay_members via memberId dirèk ─────
    // Yveleau memberId → position #46
    // Frido memberId   → position #30
    if (initiatorAccData.memberId) {
      await tx.sabotayMember.update({
        where: { id: initiatorAccData.memberId },
        data:  { position: newInitiatorPos }
      }).catch(e => console.warn('[Exchange] sabotayMember initiator update echwe:', e.message))
    }
    if (acceptorAccData.memberId) {
      await tx.sabotayMember.update({
        where: { id: acceptorAccData.memberId },
        data:  { position: newTargetPos }
      }).catch(e => console.warn('[Exchange] sabotayMember acceptor update echwe:', e.message))
    }

    // ── 3. ✅ Update sol_member_accounts.memberPosition ─────
    // Sidebar + kont vityèl dwe montre nouvo pozisyon an
    await tx.solMemberAccount.update({
      where: { id: exchange.initiatorId },
      data:  { memberPosition: newInitiatorPos }
    })
    await tx.solMemberAccount.update({
      where: { id: acceptorAccountId },
      data:  { memberPosition: newTargetPos }
    })

    // ── 4. Update balans ────────────────────────────────────
    try {
      await tx.solMemberAccount.update({
        where: { id: exchange.initiatorId },
        data:  { balance: { increment: initiatorBalanceDelta } }
      })
      await tx.solMemberAccount.update({
        where: { id: acceptorAccountId },
        data:  { balance: { increment: acceptorBalanceDelta } }
      })
    } catch (balErr) {
      console.warn('[Exchange] Balance update echwe (kolòn pa la?):', balErr.message)
    }

    // ── 5. Mete ajou echanj la ──────────────────────────────
    await tx.solPositionExchange.update({
      where: { id: exchangeId },
      data: {
        targetId: acceptorAccountId, targetPos: acceptorMemberPos,
        newInitiatorPos, newTargetPos,
        positionDiff: feeCalc.positionDiff,
        feeAmount: feeCalc.feeAmount, feeAdminAmt: feeCalc.feeAdminAmt,
        feeSellerAmt: feeCalc.feeSellerAmt,
        status: 'accepted', updatedAt: new Date(),
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
      body: `${acceptorAcc?.memberName} aksepte echanj la. Ou pase Men #${exchange.initiatorPos} → Men #${newInitiatorPos}. ${initiatorMonte ? `Ou peye: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG` : `Ou resevwa: ${feeCalc.feeSellerAmt.toLocaleString('fr-HT')} HTG`}`,
      tag: `exchange-done-${exchangeId}`, data: { url: '/sol/dashboard' },
    }).catch(() => {}),
    solPushSvc.sendToSolMember(acceptorAcc?.memberId, {
      title: '✅ Echanj Aksepte!',
      body: `Ou pase Men #${acceptorMemberPos} → Men #${newTargetPos}. ${!initiatorMonte ? `Ou peye: ${feeCalc.feeAmount.toLocaleString('fr-HT')} HTG` : `Ou resevwa: ${feeCalc.feeSellerAmt.toLocaleString('fr-HT')} HTG`}`,
      tag: `exchange-done2-${exchangeId}`, data: { url: '/sol/dashboard' },
    }).catch(() => {}),
  ])

  return { success: true, newInitiatorPos, newTargetPos, feeCalc }
}

// ─────────────────────────────────────────────────────────────
// REFIZE / ANILE
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
    where: { id: exchangeId }, data: { status: newStatus, updatedAt: new Date() }
  })

  if (isTarget && exchange.initiatorId) {
    const initiatorAcc = await prisma.solMemberAccount.findUnique({ where: { id: exchange.initiatorId } })
    await solPushSvc.sendToSolMember(initiatorAcc?.memberId, {
      title: '❌ Echanj Refize',
      body: 'Ofri echanj ou a refize. Ou ka eseye ak yon lòt manm.',
      tag: `exchange-rej-${exchangeId}`, data: { url: '/sol/dashboard' },
    }).catch(() => {})
  }

  return { success: true, status: newStatus }
}

// ─────────────────────────────────────────────────────────────
// JWENN ofri piblik
// ─────────────────────────────────────────────────────────────
async function getPublicOffers(tenantId, planId, viewerAccountId) {
  const offers = await prisma.solPositionExchange.findMany({
    where: { tenantId, planId, status: 'pending', targetId: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }, take: 50,
  })

  const enriched = await Promise.all(offers.map(async (o) => {
    const initiatorAcc = await prisma.solMemberAccount.findUnique({
      where: { id: o.initiatorId }, select: { memberName: true, memberPhone: true }
    })
    const { feeFixed, feeAdminFixed } = await getPlanExchangeConfig(planId)

    let feePreview = null
    if (viewerAccountId && viewerAccountId !== o.initiatorId) {
      const viewerPosRec = await prisma.solMemberPosition.findFirst({
        where: { accountId: viewerAccountId, planId, status: 'active' },
        orderBy: { memberPosition: 'asc' }
      })
      const viewerAcc = await prisma.solMemberAccount.findFirst({ where: { id: viewerAccountId } })
      const viewerPos = viewerPosRec?.memberPosition ?? viewerAcc?.memberPosition
      if (viewerPos) {
        const diff = Math.abs(o.initiatorPos - viewerPos)
        feePreview = calcFee(diff, feeFixed, feeAdminFixed)
        feePreview.viewerCurrentPos = viewerPos
      }
    }

    return { ...o, initiatorName: initiatorAcc?.memberName, feePreview }
  }))

  return enriched
}

async function getMemberExchanges(tenantId, accountId, planId) {
  return prisma.solPositionExchange.findMany({
    where: { tenantId, planId, OR: [{ initiatorId: accountId }, { targetId: accountId }] },
    orderBy: { createdAt: 'desc' }, take: 20,
  })
}

async function getAdminExchanges(tenantId, planId, params = {}) {
  const { status, page = 1, limit = 20 } = params
  const where = { tenantId, ...(planId && { planId }), ...(status && { status }) }
  const [exchanges, total] = await Promise.all([
    prisma.solPositionExchange.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
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
  initiateExchange, acceptExchange, rejectExchange,
  getPublicOffers, getMemberExchanges, getAdminExchanges,
  updateExchangeConfig, calcFee,
}