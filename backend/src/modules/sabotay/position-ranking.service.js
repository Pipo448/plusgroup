// ══════════════════════════════════════════════════════════════
// position-ranking.service.js
// Algorit klasman dinamik — Sabotay Sol
// Path: src/modules/sabotay/position-ranking.service.js
// ══════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// HELPER: Dat jounen an (Haiti UTC-5)
// ─────────────────────────────────────────────────────────────
function getHaitiToday() {
  return new Date(new Date().getTime() - 5 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────
// HELPER: Kalkile tout dat peman pou yon plan
// ─────────────────────────────────────────────────────────────
function getAllPaymentDates(plan) {
  const dates    = []
  const start    = new Date(plan.startDate)
  const freq     = plan.frequency || 'weekly'
  const interval = Number(plan.interval || 1)
  const total    = plan.maxMembers || 1

  for (let i = 0; i < total; i++) {
    const d = new Date(start)
    switch (freq) {
      case 'daily':    d.setDate(d.getDate()    + i * interval); break
      case 'weekly':   d.setDate(d.getDate()    + i * 7 * interval); break
      case 'biweekly': d.setDate(d.getDate()    + i * 14); break
      case 'monthly':  d.setMonth(d.getMonth()  + i * interval); break
      default:         d.setDate(d.getDate()    + i * 7); break
    }
    dates.push(d.toISOString().split('T')[0])
  }
  return dates.sort()
}

// ─────────────────────────────────────────────────────────────
// KALKILE SKOR — pou yon manm selon pèfomans li
//
// Pwen:
//   Early   = +3   (peye avan lè)
//   OnTime  = +1   (peye a lè)
//   Late    = -1   (peye an reta)
//   Manke   = -3   (pa peye menm)
// ─────────────────────────────────────────────────────────────
function calcScore(member, allDates, today) {
  let score = 0
  const payments = member.payments       || {}
  const timings  = member.paymentTimings || {}

  for (const date of allDates) {
    if (date > today) break  // sèlman dat ki pase konte

    if (payments[date]) {
      const t = timings[date] || 'onTime'
      if      (t === 'early')  score += 3
      else if (t === 'late')   score -= 1
      else                     score += 1   // onTime
    } else {
      score -= 3  // peman manke
    }
  }
  return score
}

// ─────────────────────────────────────────────────────────────
// JENERE permanentId pou yon nouvo manm
// Format: M001, M002, M003...
// ─────────────────────────────────────────────────────────────
async function generatePermanentId(planId) {
  const count = await prisma.sabotayMember.count({ where: { planId } })
  return 'M' + String(count + 1).padStart(3, '0')
}

// ─────────────────────────────────────────────────────────────
// REKALILE POZISYON — kè algorit dinamik la
//
// Règ:
//   1. Manm ki "hasWon=true" → pozisyon yo ENCHANJAB pou toujou
//   2. Manm ki kanpe (stopped) pa konpetisyon
//   3. Pami manm ki aktif + poko touche → klasman pa skor
//   4. Skor egal → manm ki enskri avan an premye
//   5. Ansyen manm ki te gen pwoblèm pa ka monte nan plas deja touche
// ─────────────────────────────────────────────────────────────
async function recalculatePositions(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { orderBy: { position: 'asc' } } },
  })

  if (!plan)                   throw new Error('Plan pa jwenn')
  if (!plan.dynamicPositions)  return { skipped: true, reason: 'dynamicPositions dezaktive' }

  const today    = getHaitiToday()
  const allDates = getAllPaymentDates(plan)

  // ─── 1. Separe: manm ki touche deja (plas enchanjab) vs aktif
  const wonMembers   = plan.members.filter(m => m.hasWon)
  const wonPositions = new Set(wonMembers.map(m => m.position))

  const competing = plan.members.filter(
    m => !m.hasWon && m.isActive && m.status !== 'stopped'
  )

  if (competing.length === 0) return { recalculated: 0, message: 'Pa gen manm pou klase' }

  // ─── 2. Kalkile skor chak manm ki nan konpetisyon
  const scored = competing.map(m => ({
    id:           m.id,
    permanentId:  m.permanentId,
    score:        calcScore(m, allDates, today),
    createdAt:    m.createdAt,
  }))

  // ─── 3. Trye: pi bon skor ann premye, pa dat enskripsyon si egal
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  // ─── 4. Slot disponib = tout pozisyon ki PA touche, nan lòd monte
  const allPositions = plan.members.map(m => m.position).sort((a, b) => a - b)
  const available    = allPositions.filter(p => !wonPositions.has(p))

  // ─── 5. Asiye nouvo pozisyon
  const updates = scored.map((m, idx) =>
    prisma.sabotayMember.update({
      where: { id: m.id },
      data: {
        position:        available[idx] ?? m.position,
        performanceScore: m.score,
      },
    })
  )

  await prisma.$transaction(updates)

  console.log(`[RANKING] Plan ${planId}: ${updates.length} manm reklase`)

  return {
    recalculated: updates.length,
    ranking: scored.map((m, idx) => ({
      permanentId: m.permanentId,
      newPosition: available[idx],
      score:       m.score,
    })),
  }
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT — afiche klasman aktyèl san chanje anyen
// ─────────────────────────────────────────────────────────────
async function getRankingSnapshot(planId) {
  const plan = await prisma.sabotayPlan.findUnique({
    where:   { id: planId },
    include: { members: { orderBy: { position: 'asc' } } },
  })

  if (!plan) throw new Error('Plan pa jwenn')

  const today    = getHaitiToday()
  const allDates = getAllPaymentDates(plan)

  return plan.members.map(m => ({
    id:           m.id,
    permanentId:  m.permanentId,
    name:         m.name,
    position:     m.position,
    score:        calcScore(m, allDates, today),
    hasWon:       m.hasWon,
    isStopped:    m.status === 'stopped',
    positionLocked: m.hasWon,
  })).sort((a, b) => a.position - b.position)
}

module.exports = {
  recalculatePositions,
  generatePermanentId,
  getRankingSnapshot,
  calcScore,
  getAllPaymentDates,
}
