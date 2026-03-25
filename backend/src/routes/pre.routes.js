// src/routes/pre.routes.js
// Mount: app.use(`${API}/pre`, preRoutes)  ← deja nan index.js ✅

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')
const { extractBranch } = require('../middleware/branch')

const router = express.Router()
const prisma = new PrismaClient()

// Tout routes pwoteje — menm pattern ke kane-epay.routes.js
router.use(identifyTenant, authenticate, extractBranch)

// ─── Helper — menm pattern ke kane-epay.controller.js ────────
const getTB = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.branchId || null,
  userId:   req.user?.id || null,
})

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function genereNumeroPre(tenantId) {
  const ane = new Date().getFullYear()
  const count = await prisma.pre.count({
    where: {
      tenantId,
      createdAt: { gte: new Date(`${ane}-01-01`), lt: new Date(`${ane + 1}-01-01`) },
    },
  })
  return `PRE-${ane}-${String(count + 1).padStart(5, '0')}`
}

// ✅ To enterè PA MWA: total = K + K × taux × duree
function calcTotalDu(montant, tauxParMwa, dureeEnMois) {
  const k = Number(montant)
  const t = Number(tauxParMwa) / 100
  const d = Number(dureeEnMois)
  return Math.round((k + k * t * d) * 100) / 100
}

// Kapital disponib = total enjeksyon - total prè aktif
async function getKapitalDisponib(tenantId) {
  const [enjeksyonAgg, pretAgg] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM(montant), 0) as total
      FROM pre_kapital
      WHERE tenant_id = ${tenantId} AND type = 'enjeksyon'
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(montant), 0) as total
      FROM prets
      WHERE tenant_id = ${tenantId} AND statut IN ('actif','reta','attente')
    `,
  ])
  const totalEnjeksyon = Number(enjeksyonAgg[0]?.total || 0)
  const totalPrete     = Number(pretAgg[0]?.total     || 0)
  return Math.max(0, totalEnjeksyon - totalPrete)
}

// ═══════════════════════════════════════════════════════════════
// GET /api/pre/stats
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const debiMwa = new Date()
    debiMwa.setDate(1); debiMwa.setHours(0, 0, 0, 0)

    const [
      totalPrets, pretsActifs, pretsEnReta,
      portfeuyeAgg, desèmanMwaAgg, koleksyonMwaAgg,
    ] = await Promise.all([
      prisma.pre.count({ where: { tenantId } }),
      prisma.pre.count({ where: { tenantId, statut: 'actif'  } }),
      prisma.pre.count({ where: { tenantId, statut: 'reta'   } }),
      prisma.pre.aggregate({
        where: { tenantId, statut: { in: ['actif','reta','attente'] } },
        _sum:  { montant: true },
      }),
      prisma.pre.aggregate({
        where: { tenantId, statut: { not: 'annule' }, createdAt: { gte: debiMwa } },
        _sum:  { montant: true },
      }),
      prisma.prePaiement.aggregate({
        where: { tenantId, createdAt: { gte: debiMwa } },
        _sum:  { montant: true },
      }),
    ])

    const koleksyonMwa    = Number(koleksyonMwaAgg._sum.montant  || 0)
    const totalPortfeuye  = Number(portfeuyeAgg._sum.montant     || 0)
    const totalDesèmanMwa = Number(desèmanMwaAgg._sum.montant    || 0)
    const kapitalDisponib = await getKapitalDisponib(tenantId)

    const pretsAktifList = await prisma.pre.findMany({
      where:  { tenantId, statut: { in: ['actif','reta'] } },
      select: { montant: true, totalDu: true },
    })
    let enterèMwa = 0
    if (koleksyonMwa > 0 && pretsAktifList.length > 0) {
      const ratio = pretsAktifList.reduce((acc, p) => {
        const td = Number(p.totalDu), k = Number(p.montant)
        return acc + (td > 0 ? (td - k) / td : 0)
      }, 0) / pretsAktifList.length
      enterèMwa = Math.round(koleksyonMwa * ratio * 100) / 100
    }

    return res.json({
      stats: {
        totalPrets, pretsActifs,
        totalEnReta:     pretsEnReta,
        totalPortfeuye,  totalDesèmanMwa,
        totalPaiemanMwa: koleksyonMwa,
        enterèMwa,       kapitalDisponib,
      },
    })
  } catch (err) {
    console.error('[PRE /stats]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /api/pre/kane-epay-search  — AVANT /:id
// ═══════════════════════════════════════════════════════════════
router.get('/kane-epay-search', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { q = '' } = req.query
    if (q.length < 2) return res.json({ accounts: [] })

    const accounts = await prisma.kaneEpay.findMany({
      where: {
        tenantId, isActive: true,
        OR: [
          { firstName:     { contains: q, mode: 'insensitive' } },
          { lastName:      { contains: q, mode: 'insensitive' } },
          { phone:         { contains: q, mode: 'insensitive' } },
          { nifOrCin:      { contains: q, mode: 'insensitive' } },
          { accountNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, accountNumber: true, firstName: true, lastName: true, phone: true, balance: true, photoUrl: true },
      take: 8,
    })
    return res.json({ accounts })
  } catch (err) {
    console.error('[PRE /kane-epay-search]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /api/pre/kapital/istorik  — AVANT /:id
// ═══════════════════════════════════════════════════════════════
router.get('/kapital/istorik', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { page = 1, limit = 20 } = req.query
    const istorik = await prisma.$queryRaw`
      SELECT pk.*, u.full_name as creator_name
      FROM pre_kapital pk
      LEFT JOIN users u ON u.id = pk.created_by
      WHERE pk.tenant_id = ${tenantId}
      ORDER BY pk.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${(Number(page) - 1) * Number(limit)}
    `
    const kapitalDisponib = await getKapitalDisponib(tenantId)
    return res.json({ istorik, kapitalDisponib })
  } catch (err) {
    console.error('[PRE /kapital/istorik]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /api/pre/rapo/kesye  — AVANT /:id
// ═══════════════════════════════════════════════════════════════
router.get('/rapo/kesye', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const rapos = await prisma.$queryRaw`
      SELECT r.*, u.full_name as kesye_nom
      FROM pre_rapo_kesye r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.tenant_id = ${tenantId}
      ORDER BY r.created_at DESC
      LIMIT 100
    `
    return res.json({ rapos })
  } catch (err) {
    console.error('[PRE /rapo/kesye]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /api/pre  — lis + rechèch + filtre + pagination
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { search = '', page = 1, limit = 15, statut, branchId } = req.query
    const skip  = (Number(page) - 1) * Number(limit)
    const where = {
      tenantId,
      ...(statut   && { statut }),
      ...(branchId && { branchId }),
      ...(search && {
        OR: [
          { clientNom:    { contains: search, mode: 'insensitive' } },
          { clientPhone:  { contains: search, mode: 'insensitive' } },
          { clientNifCin: { contains: search, mode: 'insensitive' } },
          { numeroPre:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    }
    const [prets, total] = await Promise.all([
      prisma.pre.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        select: {
          id: true, numeroPre: true, clientNom: true, clientPhone: true,
          montant: true, tauxInteret: true, dureeEnMois: true,
          totalDu: true, totalPaye: true, montantBloke: true,
          datDebut: true, datFin: true, periode: true,
          statut: true, createdAt: true, branchId: true, kontKaneEpayId: true,
        },
      }),
      prisma.pre.count({ where }),
    ])
    return res.json({ prets, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('[PRE GET /]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /api/pre/kapital/enjekte  — AVANT /:id
// ═══════════════════════════════════════════════════════════════
router.post('/kapital/enjekte', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    if (req.user?.role !== 'admin')
      return res.status(403).json({ message: 'Sèlman admin ka enjekte kapital.' })
    const { montant, notes } = req.body
    if (!montant || montant <= 0)
      return res.status(400).json({ message: 'Montan dwe > 0.' })
    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'enjeksyon', ${notes || null}, ${userId})
    `
    const kapitalDisponib = await getKapitalDisponib(tenantId)
    return res.json({ message: 'Kapital enjekte avèk siksè.', kapitalDisponib })
  } catch (err) {
    console.error('[PRE /kapital/enjekte]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /api/pre/rapo/femen-kes  — AVANT /:id
// ═══════════════════════════════════════════════════════════════
router.post('/rapo/femen-kes', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    const { notes } = req.body
    const debiJou = new Date()
    debiJou.setHours(0, 0, 0, 0)

    const [pretsJou, paiemanJou] = await Promise.all([
      prisma.pre.findMany({
        where: { tenantId, createdBy: userId, createdAt: { gte: debiJou } },
        select: { montant: true, totalDu: true },
      }),
      prisma.prePaiement.findMany({
        where: { tenantId, createdBy: userId, createdAt: { gte: debiJou } },
        select: { montant: true },
      }),
    ])

    const totalPreKreye  = pretsJou.length
    const montantDeseman = pretsJou.reduce((s, p) => s + Number(p.montant), 0)
    const totalKoleksyon = paiemanJou.reduce((s, p) => s + Number(p.montant), 0)
    let totalEntere = 0
    if (pretsJou.length > 0 && totalKoleksyon > 0) {
      const ratio = pretsJou.reduce((acc, p) => {
        const td = Number(p.totalDu), k = Number(p.montant)
        return acc + (td > 0 ? (td - k) / td : 0)
      }, 0) / pretsJou.length
      totalEntere = Math.round(totalKoleksyon * ratio * 100) / 100
    }

    await prisma.$executeRaw`
      INSERT INTO pre_rapo_kesye
        (tenant_id, user_id, date_rapo, total_pre_kreye, montant_deseman, total_koleksyon, total_entere, nb_paieman, notes)
      VALUES
        (${tenantId}, ${userId}, CURRENT_DATE, ${totalPreKreye}, ${montantDeseman}, ${totalKoleksyon}, ${totalEntere}, ${paiemanJou.length}, ${notes || null})
    `
    return res.json({
      rapo: { date: new Date().toISOString().split('T')[0], totalPreKreye, montantDeseman, totalKoleksyon, totalEntere, nbPaieman: paiemanJou.length },
    })
  } catch (err) {
    console.error('[PRE /rapo/femen-kes]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /api/pre  — kreye nouvo prè
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    const {
      clientNom, clientPhone, clientNifCin, clientAdres,
      kontKaneEpayId, montant, tauxInteret, dureeEnMois,
      montantBloke, datDebut, periode, method, reference, notes,
    } = req.body

    if (!clientNom?.trim())       return res.status(400).json({ message: 'Non kliyan obligatwa.' })
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })
    if (!tauxInteret)             return res.status(400).json({ message: 'Taux enterè obligatwa.' })
    if (!dureeEnMois)             return res.status(400).json({ message: 'Durasyon obligatwa.' })

    if (kontKaneEpayId) {
      const kaneKont = await prisma.kaneEpay.findFirst({ where: { id: kontKaneEpayId, tenantId } })
      if (!kaneKont) return res.status(400).json({ message: 'Kont Kane Epay pa jwenn.' })
    }

    const numeroPre = await genereNumeroPre(tenantId)
    const totalDu   = calcTotalDu(montant, tauxInteret, dureeEnMois)
    const debut     = datDebut ? new Date(datDebut) : new Date()
    const datFin    = new Date(debut)
    datFin.setMonth(datFin.getMonth() + Number(dureeEnMois))

    const pre = await prisma.pre.create({
      data: {
        tenantId, numeroPre,
        clientNom:        clientNom.trim(),
        clientPhone:      clientPhone      || null,
        clientNifCin:     clientNifCin     || null,
        clientAdres:      clientAdres      || null,
        kontKaneEpayId:   kontKaneEpayId   || null,
        montant:          Number(montant),
        tauxInteret:      Number(tauxInteret),
        dureeEnMois:      Number(dureeEnMois),
        montantBloke:     Number(montantBloke || 0),
        totalDu, totalPaye: 0,
        datDebut: debut, datFin,
        periode:          periode          || 'mois',
        methodDeseman:    method           || 'cash',
        referenceDeseman: reference        || null,
        notes:            notes            || null,
        statut:           'actif',
        createdBy:        userId,
      },
    })

    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'prè', ${pre.id}, ${`Desèman ${numeroPre}`}, ${userId})
    `

    return res.status(201).json({ pre })
  } catch (err) {
    console.error('[PRE POST /]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /api/pre/:id  — TOUJOU DÈNYÈ nan GET yo
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const pre = await prisma.pre.findFirst({
      where:   { id: req.params.id, tenantId },
      include: { paiements: { orderBy: { createdAt: 'desc' } } },
    })
    if (!pre) return res.status(404).json({ message: 'Prè pa jwenn.' })
    return res.json({ pre })
  } catch (err) {
    console.error('[PRE GET /:id]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /api/pre/:id/paiement
// ═══════════════════════════════════════════════════════════════
router.post('/:id/paiement', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    const { id } = req.params
    const { montant, method, reference, notes } = req.body

    if (!montant || montant <= 0)
      return res.status(400).json({ message: 'Montan paieman dwe > 0.' })

    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.'     })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Prè deja klotire.' })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'     })

    const balanceAvant = Number(pre.totalDu) - Number(pre.totalPaye)
    if (balanceAvant <= 0)
      return res.status(400).json({ message: 'Prè sa deja peye nèt.' })

    const montantReyèl   = Math.min(Number(montant), balanceAvant)
    const nouvoTotalPaye = Number(pre.totalPaye) + montantReyèl
    const balanceApre    = Math.max(0, Number(pre.totalDu) - nouvoTotalPaye)

    let nouvoStatut = 'actif'
    if (balanceApre <= 0)                                     nouvoStatut = 'cloture'
    else if (pre.datFin && new Date() > new Date(pre.datFin)) nouvoStatut = 'reta'

    const [paieman] = await prisma.$transaction([
      prisma.prePaiement.create({
        data: {
          tenantId, preId: id,
          montant: montantReyèl, balanceAvant, balanceApre,
          method:    method    || 'cash',
          reference: reference || null,
          notes:     notes     || null,
          createdBy: userId,
        },
      }),
      prisma.pre.update({
        where: { id },
        data:  { totalPaye: nouvoTotalPaye, statut: nouvoStatut },
      }),
    ])

    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
      VALUES (${tenantId}, ${montantReyèl}, 'retou', ${id}, ${`Paieman ${pre.numeroPre}`}, ${userId})
    `

    const preAjou = await prisma.pre.findUnique({ where: { id } })
    return res.json({ paiement: paieman, pre: preAjou })
  } catch (err) {
    console.error('[PRE POST /:id/paiement]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /api/pre/:id/cloture
// ═══════════════════════════════════════════════════════════════
router.post('/:id/cloture', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { id } = req.params
    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.'  })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Deja klotire.'  })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'  })

    const preMajou = await prisma.pre.update({
      where: { id }, data: { statut: 'cloture' },
    })
    return res.json({ pre: preMajou })
  } catch (err) {
    console.error('[PRE POST /:id/cloture]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

module.exports = router
