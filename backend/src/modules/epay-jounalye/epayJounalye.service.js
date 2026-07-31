// src/modules/epay-jounalye/epayJounalye.service.js
const prisma = require('../../config/prisma')

// 3mo→2, 6mo→5, 9mo→10, 12mo→15, 24mo→20 (jou bonus)
const BONUS_DAYS = { 3: 2, 6: 5, 9: 10, 12: 15, 24: 20 }
const ALLOWED_DURATIONS = Object.keys(BONUS_DAYS).map(Number)
const DAYS_PER_CYCLE = 30

// ── Dat Ayiti (san lè), fòma 'YYYY-MM-DD' — SÈLMAN pou yon vrè moman/lè
// (tankou "kounye a"). Sèvi ak sa a pou konvèti "now" an dat kalandriye Ayiti.
const haitiDateStr = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d)
  const g = (t) => parts.find(p => p.type === t).value
  return `${g('year')}-${g('month')}-${g('day')}`
}

// ⚠️ KORIJE — `startDate` se yon kolòn `@db.Date` (pa gen lè ladan l).
// Prisma retounen l kòm minwit UTC pou dat la. Si nou pase l nan
// haitiDateStr() (ki konvèti pou fizo Ayiti, UTC-4/-5), minwit UTC la
// "kapote" nan aswè VÈY LA nan fizo Ayiti — sa fè sistèm nan kwè kontra
// a kòmanse yon jou pi bonè pase reyalite a, e sa te lakòz bonis pèdi
// imedyatman menm sou yon kontra tou nèf. Pou yon dat pi (san lè), sèvi
// ak eleman UTC li yo dirèkteman, jamè re-lokalize l nan yon fizo.
const dateOnlyStr = (d) => {
  const dt = new Date(d)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Konbyen jou kalandriye ki fin pase ANTRE startDate ak referenceDate (san konte jodi a)
const daysFullyElapsedSince = (startDateStr, referenceDateStr) => {
  const a = new Date(`${startDateStr}T00:00:00Z`)
  const b = new Date(`${referenceDateStr}T00:00:00Z`)
  return Math.max(0, Math.round((b - a) / 86400000))
}

// Konbyen jou ki "dwe" deja peye jiska JODI A enkli (jodi a konte kòm yon jou
// ki gen dwa peye) — SAN okenn davans. Baz pou de règ bonis yo pi ba a.
const MAX_ADVANCE_DAYS  = 10  // limit total davans ki tolere
const MIN_RENEWAL_DAYS  = 2   // ka "ranpli" sèlman lè rete sa a jou oswa mwens
const daysDueStrict = (startDateStr, referenceDateStr, cap) =>
  Math.min(daysFullyElapsedSince(startDateStr, referenceDateStr) + 1, cap)

// ⚠️ Verifikasyon "paresè" (lazy) jou rate — rele l chak fwa nou li/modifye
// yon kontra, olye de yon travay pwograme (cron) separe. Depi bonis pèdi,
// li rete pèdi pou tout rès kontra a (pa gen "retabli").
const checkAndApplyMissedDays = async (contract) => {
  if (contract.status !== 'active' || !contract.bonusStillEligible) return contract

  const todayStr = haitiDateStr()
  const startStr = dateOnlyStr(contract.startDate)
  const expectedCompleted = Math.min(
    daysFullyElapsedSince(startStr, todayStr),
    contract.totalDaysPlanned
  )

  if (contract.daysPaid < expectedCompleted) {
    return prisma.epayJounalyeContract.update({
      where: { id: contract.id },
      data: { bonusStillEligible: false }
    })
  }
  return contract
}

// Tire yon prefiks 2-4 lèt soti nan premye lèt chak mo nan non antrepriz la
// (egzanp: "Plus Store" → "PS", "H&M Entreprise Ouanaminthe" → "HEO").
// Si non an se yon sèl mo san espas, pran 3 premye lèt li yo olye de sa.
const deriveTenantPrefix = (tenantName) => {
  if (!tenantName) return 'EJ'
  const words = tenantName.split(/\s+/).map(w => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean)
  let prefix = words.map(w => w[0].toUpperCase()).join('')
  if (prefix.length < 2) {
    prefix = tenantName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()
  }
  return prefix.slice(0, 4) || 'EJ'
}

const generateContractNumber = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  const prefix = deriveTenantPrefix(tenant?.name)
  let num, exists
  do {
    num = `${prefix}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10)}`
    exists = await prisma.epayJounalyeContract.findUnique({
      where: { tenantId_contractNumber: { tenantId, contractNumber: num } }
    })
  } while (exists)
  return num
}

// ── Konstwi grid kalandriye a (pou afichaj frontend): tablo de sik,
// chak sik gen 30 kazye ak estati 'paid' | 'missed' | 'pending'
const buildCalendarGrid = (contract) => {
  const todayStr = haitiDateStr()
  const startStr = dateOnlyStr(contract.startDate)
  const expectedCompleted = Math.min(
    daysFullyElapsedSince(startStr, todayStr),
    contract.totalDaysPlanned
  )

  const totalCycles = Math.ceil(contract.totalDaysPlanned / DAYS_PER_CYCLE)
  const cycles = []
  for (let c = 0; c < totalCycles; c++) {
    const cells = []
    for (let d = 0; d < DAYS_PER_CYCLE; d++) {
      const cellIndex = c * DAYS_PER_CYCLE + d
      if (cellIndex >= contract.totalDaysPlanned) break
      let cellStatus
      if (cellIndex < contract.daysPaid) cellStatus = 'paid'
      else if (cellIndex < expectedCompleted) cellStatus = 'missed'
      else cellStatus = 'pending'
      cells.push({ dayNumber: d + 1, status: cellStatus })
    }
    cycles.push({ cycleNumber: c + 1, cells })
  }
  return cycles
}

const getAll = async (tenantId, { status, branchId, search } = {}) => {
  const where = {
    tenantId,
    ...(status && { status }),
    ...(branchId && { branchId }),
    ...(search && {
      OR: [
        { clientFirstName: { contains: search, mode: 'insensitive' } },
        { clientLastName: { contains: search, mode: 'insensitive' } },
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search, mode: 'insensitive' } },
      ]
    })
  }

  const contracts = await prisma.epayJounalyeContract.findMany({
    where, orderBy: { createdAt: 'desc' }
  })

  const stats = contracts.reduce((s, c) => {
    s.totalContracts += 1
    if (c.status === 'active') s.activeContracts += 1
    if (c.status === 'completed') s.completedContracts += 1
    s.totalCollected += Number(c.totalPaid)
    return s
  }, { totalContracts: 0, activeContracts: 0, completedContracts: 0, totalCollected: 0 })

  return { contracts, stats }
}

const getOne = async (tenantId, id) => {
  let contract = await prisma.epayJounalyeContract.findFirst({
    where: { id, tenantId },
    include: { payments: { orderBy: { createdAt: 'desc' } } }
  })
  if (!contract) throw Object.assign(new Error('Kontra pa jwenn.'), { statusCode: 404 })

  contract = await checkAndApplyMissedDays(contract)
  const calendar = buildCalendarGrid(contract)
  return { ...contract, calendar }
}

const create = async (tenantId, userId, data) => {
  const durationMonths = Number(data.durationMonths)
  if (!ALLOWED_DURATIONS.includes(durationMonths)) {
    throw Object.assign(
      new Error(`Dire kontra dwe youn nan: ${ALLOWED_DURATIONS.join(', ')} mwa.`),
      { statusCode: 400 }
    )
  }
  const dailyAmount = Number(data.dailyAmount)
  if (!dailyAmount || dailyAmount <= 0) {
    throw Object.assign(new Error('Montan chak jou obligatwa.'), { statusCode: 400 })
  }
  if (!data.clientFirstName?.trim() || !data.clientLastName?.trim()) {
    throw Object.assign(new Error('Prenon ak non kliyan obligatwa.'), { statusCode: 400 })
  }

  const totalDaysPlanned = durationMonths * DAYS_PER_CYCLE
  const contractNumber   = await generateContractNumber(tenantId)

  return prisma.epayJounalyeContract.create({
    data: {
      tenantId,
      branchId:          data.branchId || null,
      contractNumber,
      clientFirstName:   data.clientFirstName.trim(),
      clientLastName:    data.clientLastName.trim(),
      clientPhone:       data.clientPhone || null,
      clientNifCin:      data.clientNifCin || null,
      clientAddress:     data.clientAddress || null,
      dailyAmount,
      currency:          data.currency || 'HTG',
      durationMonths,
      totalDaysPlanned,
      totalObjective:    dailyAmount * totalDaysPlanned,
      bonusDaysEligible: BONUS_DAYS[durationMonths],
      startDate:         data.startDate ? new Date(data.startDate) : new Date(`${haitiDateStr()}T00:00:00Z`),
      notes:             data.notes || null,
      createdBy:         userId,
    }
  })
}

// ── Anrejistre pèman "jodi a" pou kontra a
const recordPayment = async (tenantId, id, userId, data) => {
  let contract = await prisma.epayJounalyeContract.findFirst({ where: { id, tenantId } })
  if (!contract) throw Object.assign(new Error('Kontra pa jwenn.'), { statusCode: 404 })
  if (contract.status !== 'active') {
    throw Object.assign(new Error('Kontra sa a pa aktif ankò.'), { statusCode: 400 })
  }

  contract = await checkAndApplyMissedDays(contract)

  if (contract.daysPaid >= contract.totalDaysPlanned) {
    throw Object.assign(new Error('Tout jou kontra a deja peye.'), { statusCode: 400 })
  }

  // ⚠️ KORIJE — kliyan an ka vin ak kòb pou plizyè jou an menm fwa (peman
  // an avans). Kesye a antre `daysCount` (konbyen jou l ap peye) olye de
  // yon sèl jou fikse — pa gen limit "yon sèl pèman pa jou" ankò.
  const remaining = contract.totalDaysPlanned - contract.daysPaid
  const daysCount  = Math.max(1, Math.min(Math.floor(Number(data.daysCount) || 1), remaining))

  // Si kesye a bay yon montan total eksplisit, separe l egalman sou chak
  // jou; sinon chak jou pran montan fiks kontra a (dailyAmount).
  const perDayAmount = data.amount != null ? Number(data.amount) / daysCount : Number(contract.dailyAmount)

  const paymentRows = Array.from({ length: daysCount }, (_, i) => {
    const seq = contract.daysPaid + i
    return {
      tenantId, contractId: id,
      cycleNumber: Math.floor(seq / DAYS_PER_CYCLE) + 1,
      dayNumber:   (seq % DAYS_PER_CYCLE) + 1,
      amount: perDayAmount,
      method: data.method || 'cash',
      reference: data.reference || null,
      notes: data.notes || null,
      createdBy: userId,
    }
  })

  const newDaysPaid  = contract.daysPaid + daysCount
  const newTotalPaid = Number(contract.totalPaid) + perDayAmount * daysCount
  const isCompleting = newDaysPaid >= contract.totalDaysPlanned

  // ⚠️ De règ bonis (an plis de deteksyon jou rate ki deja fèt pi wo a):
  //  1) Total davans akimile pa ka depase MAX_ADVANCE_DAYS jou
  //  2) Yon depo ki AJOUTE sou yon davans ki deja egziste (pa premye depo a)
  //     dwe fèt sèlman lè rete MIN_RENEWAL_DAYS jou oswa mwens nan davans
  //     aktyèl la — "ranpli twò bonè" (pandan gen 3+ jou ki rete) anile bonis
  //     la menm si total la ta rete anba 10 jou.
  const startStr        = dateOnlyStr(contract.startDate)
  const todayStr         = haitiDateStr()
  const dueStrict        = daysDueStrict(startStr, todayStr, contract.totalDaysPlanned)
  const bufferBefore     = contract.daysPaid - dueStrict          // davans ki rete anvan depo sa a
  const isFirstDeposit   = contract.daysPaid === 0
  const tooEarlyRenewal  = !isFirstDeposit && bufferBefore > MIN_RENEWAL_DAYS
  const exceedsMaxBuffer = (newDaysPaid - dueStrict) > MAX_ADVANCE_DAYS
  const bonusStillEligible = contract.bonusStillEligible && !tooEarlyRenewal && !exceedsMaxBuffer

  const [, updatedContract] = await prisma.$transaction([
    prisma.epayJounalyePayment.createMany({ data: paymentRows }),
    prisma.epayJounalyeContract.update({
      where: { id },
      data: {
        daysPaid: newDaysPaid,
        totalPaid: newTotalPaid,
        bonusStillEligible,
        ...(isCompleting && {
          status: 'completed',
          completedAt: new Date(),
          finalPayoutAmount: newTotalPaid + (bonusStillEligible ? contract.bonusDaysEligible * Number(contract.dailyAmount) : 0)
        })
      }
    })
  ])

  return {
    daysPaid: daysCount,
    amountPaid: perDayAmount * daysCount,
    bonusJustForfeited: (tooEarlyRenewal || exceedsMaxBuffer) && contract.bonusStillEligible,
    forfeitReason: tooEarlyRenewal ? 'too_early' : exceedsMaxBuffer ? 'max_advance' : null,
    contract: updatedContract
  }
}

const cancel = async (tenantId, id) => {
  const contract = await prisma.epayJounalyeContract.findFirst({ where: { id, tenantId } })
  if (!contract) throw Object.assign(new Error('Kontra pa jwenn.'), { statusCode: 404 })
  if (contract.status !== 'active') {
    throw Object.assign(new Error('Sèl kontra aktif ka anile.'), { statusCode: 400 })
  }
  return prisma.epayJounalyeContract.update({ where: { id }, data: { status: 'cancelled' } })
}

// ── MODIFYE — si POKO gen okenn peman (daysPaid===0), tout chan ka chanje
// (montan, dire, dat kòmanse) e sistèm nan rekalkile objektif/bonis yo.
// Si kontra a deja gen peman, sèlman enfòmasyon kliyan an ka korije, pou
// pa "kraze" kalandriye/bonis ki deja an kou.
const update = async (tenantId, id, data) => {
  const contract = await prisma.epayJounalyeContract.findFirst({ where: { id, tenantId } })
  if (!contract) throw Object.assign(new Error('Kontra pa jwenn.'), { statusCode: 404 })

  const clientFields = {
    ...(data.clientFirstName !== undefined && { clientFirstName: data.clientFirstName.trim() }),
    ...(data.clientLastName  !== undefined && { clientLastName:  data.clientLastName.trim() }),
    ...(data.clientPhone     !== undefined && { clientPhone:     data.clientPhone || null }),
    ...(data.clientNifCin    !== undefined && { clientNifCin:    data.clientNifCin || null }),
    ...(data.clientAddress   !== undefined && { clientAddress:   data.clientAddress || null }),
    ...(data.notes           !== undefined && { notes:           data.notes || null }),
  }

  if (contract.daysPaid > 0) {
    // Kontra a deja gen peman — sèlman enfòmasyon kliyan an ka chanje
    return prisma.epayJounalyeContract.update({ where: { id }, data: clientFields })
  }

  // Poko gen peman — ka chanje montan/dire/dat tou, epi rekalkile
  const durationMonths = data.durationMonths != null ? Number(data.durationMonths) : contract.durationMonths
  if (!ALLOWED_DURATIONS.includes(durationMonths)) {
    throw Object.assign(new Error(`Dire kontra dwe youn nan: ${ALLOWED_DURATIONS.join(', ')} mwa.`), { statusCode: 400 })
  }
  const dailyAmount = data.dailyAmount != null ? Number(data.dailyAmount) : Number(contract.dailyAmount)
  if (!dailyAmount || dailyAmount <= 0) {
    throw Object.assign(new Error('Montan chak jou obligatwa.'), { statusCode: 400 })
  }
  const totalDaysPlanned = durationMonths * DAYS_PER_CYCLE

  return prisma.epayJounalyeContract.update({
    where: { id },
    data: {
      ...clientFields,
      dailyAmount,
      durationMonths,
      totalDaysPlanned,
      totalObjective: dailyAmount * totalDaysPlanned,
      bonusDaysEligible: BONUS_DAYS[durationMonths],
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.currency && { currency: data.currency }),
    }
  })
}

// ── SIPRIME — siprime nèt kontra a ansanm ak tout istwa peman li yo
// (cascade deja defini nan schema a). Aksyon sa a IREVERSIB.
const remove = async (tenantId, id) => {
  const contract = await prisma.epayJounalyeContract.findFirst({ where: { id, tenantId } })
  if (!contract) throw Object.assign(new Error('Kontra pa jwenn.'), { statusCode: 404 })
  await prisma.epayJounalyeContract.delete({ where: { id } })
  return { deleted: true }
}

module.exports = { BONUS_DAYS, ALLOWED_DURATIONS, MAX_ADVANCE_DAYS, MIN_RENEWAL_DAYS, getAll, getOne, create, recordPayment, cancel, update, remove }
