// src/pre.routes.js
// Mount: app.use('/api/pre', preRoutes)  <- deja nan index.js liy 158
// Pattern: tout logik inline — menm jan ak sol.routes.js

const express = require('express')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

const { authenticate }  = require('../middleware/auth')
const { requireTenant } = require('../middleware/tenant')

router.use(authenticate)
router.use(requireTenant)

// ─── HELPERS ─────────────────────────────────────────────────

async function genereNumeroPre(tenantId) {
  const ane = new Date().getFullYear()
  const count = await prisma.pre.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(`${ane}-01-01`),
        lt:  new Date(`${ane + 1}-01-01`),
      },
    },
  })
  const seq = String(count + 1).padStart(5, '0')
  return `PRE-${ane}-${seq}`
}

function calcTotalDu(montant, tauxInteret, dureeEnMois) {
  const k = Number(montant)
  const t = Number(tauxInteret) / 100
  const d = Number(dureeEnMois)
  return Math.round((k + k * t * (d / 12)) * 100) / 100
}

// ═══════════════════════════════════════════════════════════════
// GET /api/pre/stats
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const { tenantId } = req.tenant
    const debiMwa = new Date()
    debiMwa.setDate(1)
    debiMwa.setHours(0, 0, 0, 0)

    const [
      totalPrets, pretsActifs, pretsEnReta,
      portfeuyeAgg, desèmanMwaAgg, koleksyonMwaAgg,
    ] = await Promise.all([
      prisma.pre.count({ where: { tenantId } }),
      prisma.pre.count({ where: { tenantId, statut: 'actif' } }),
      prisma.pre.count({ where: { tenantId, statut: 'reta'  } }),
      prisma.pre.aggregate({
        where: { tenantId, statut: { in: ['actif', 'reta', 'attente'] } },
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

    const koleksyonMwa    = Number(koleksyonMwaAgg._sum.montant || 0)
    const totalPortfeuye  = Number(portfeuyeAgg._sum.montant    || 0)
    const totalDesèmanMwa = Number(desèmanMwaAgg._sum.montant   || 0)

    const pretsAktifList = await prisma.pre.findMany({
      where:  { tenantId, statut: { in: ['actif', 'reta'] } },
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
        enterèMwa,
      },
    })
  } catch (err) {
    console.error('[PRE /stats]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /api/pre
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req.tenant
    const { search = '', page = 1, limit = 15, statut, branchId } = req.query
    const skip  = (Number(page) - 1) * Number(limit)
    const where = {
      tenantId,
      ...(statut   && { statut }),
      ...(branchId && { branchId }),
      ...(search   && {
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
          totalDu: true, totalPaye: true, datDebut: true, datFin: true,
          periode: true, statut: true, createdAt: true, branchId: true,
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
// GET /api/pre/:id
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { tenantId } = req.tenant
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
// POST /api/pre
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { tenantId } = req.tenant
    const userId = req.user?.id
    const {
      clientNom, clientPhone, clientNifCin, clientAdres,
      montant, tauxInteret, dureeEnMois,
      datDebut, periode, method, reference, notes,
    } = req.body

    if (!clientNom?.trim())       return res.status(400).json({ message: 'Non kliyan obligatwa.' })
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })
    if (!tauxInteret)             return res.status(400).json({ message: 'Taux enterè obligatwa.' })
    if (!dureeEnMois)             return res.status(400).json({ message: 'Durasyon obligatwa.' })

    const numeroPre = await genereNumeroPre(tenantId)
    const totalDu   = calcTotalDu(montant, tauxInteret, dureeEnMois)
    const debut     = datDebut ? new Date(datDebut) : new Date()
    const datFin    = new Date(debut)
    datFin.setMonth(datFin.getMonth() + Number(dureeEnMois))

    const pre = await prisma.pre.create({
      data: {
        tenantId,
        numeroPre,
        clientNom:        clientNom.trim(),
        clientPhone:      clientPhone      || null,
        clientNifCin:     clientNifCin     || null,
        clientAdres:      clientAdres      || null,
        montant:          Number(montant),
        tauxInteret:      Number(tauxInteret),
        dureeEnMois:      Number(dureeEnMois),
        totalDu, totalPaye: 0,
        datDebut:         debut,
        datFin,
        periode:          periode          || 'mois',
        methodDeseman:    method           || 'cash',
        referenceDeseman: reference        || null,
        notes:            notes            || null,
        statut:           'actif',
        createdBy:        userId           || null,
      },
    })

    return res.status(201).json({ pre })
  } catch (err) {
    console.error('[PRE POST /]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /api/pre/:id/paiement
// ═══════════════════════════════════════════════════════════════
router.post('/:id/paiement', async (req, res) => {
  try {
    const { tenantId } = req.tenant
    const userId = req.user?.id
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
    if (balanceApre <= 0)                                        nouvoStatut = 'cloture'
    else if (pre.datFin && new Date() > new Date(pre.datFin))    nouvoStatut = 'reta'

    // ✅ Atomik — paieman + update prè ansanm
    const [paieman] = await prisma.$transaction([
      prisma.prePaiement.create({
        data: {
          tenantId, preId: id,
          montant: montantReyèl, balanceAvant, balanceApre,
          method:    method    || 'cash',
          reference: reference || null,
          notes:     notes     || null,
          createdBy: userId    || null,
        },
      }),
      prisma.pre.update({
        where: { id },
        data:  { totalPaye: nouvoTotalPaye, statut: nouvoStatut },
      }),
    ])

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
    const { tenantId } = req.tenant
    const { id } = req.params

    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.'  })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Deja klotire.'  })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'  })

    const preMajou = await prisma.pre.update({
      where: { id },
      data:  { statut: 'cloture' },
    })

    return res.json({ pre: preMajou })
  } catch (err) {
    console.error('[PRE POST /:id/cloture]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

module.exports = router