// src/routes/pre.routes.js  — V6
const express  = require('express')
const { PrismaClient } = require('@prisma/client')
const {
  genereEcheances, calcNbrPeman, calcInteretKouru, alokePaiement,
} = require('./pre.engine')

const router = express.Router()
const prisma = new PrismaClient()

const { identifyTenant, authenticate } = require('../middleware/auth')
const { extractBranch }                = require('../middleware/branch')

router.use(identifyTenant, authenticate, extractBranch)

// ─── Helper ───────────────────────────────────────────────────
const getTB = (req) => ({
  tenantId: req.tenant.id,
  branchId: req.branchId || null,
  userId:   req.user?.id || null,
})

async function isKesFermen(tenantId, userId) {
  const r = await prisma.$queryRaw`
    SELECT id FROM pre_rapo_kesye
    WHERE tenant_id = ${tenantId}
      AND user_id   = ${userId}
      AND date_rapo = (NOW() - INTERVAL '5 hours')::date
    LIMIT 1
  `
  return r.length > 0
}

async function genereNumeroPre(tenantId) {
  const ane   = new Date().getFullYear()
  const count = await prisma.pre.count({
    where: { tenantId, createdAt: { gte: new Date(`${ane}-01-01`), lt: new Date(`${ane + 1}-01-01`) } },
  })
  return `PRE-${ane}-${String(count + 1).padStart(5, '0')}`
}

async function getKapitalDisponib(tenantId) {
  const [enj, pre] = await Promise.all([
    prisma.$queryRaw`SELECT COALESCE(SUM(montant),0) as total FROM pre_kapital WHERE tenant_id=${tenantId} AND type='enjeksyon'`,
    prisma.$queryRaw`SELECT COALESCE(SUM(montant),0) as total FROM prets WHERE tenant_id=${tenantId} AND statut IN ('actif','reta','attente')`,
  ])
  return Math.max(0, Number(enj[0]?.total || 0) - Number(pre[0]?.total || 0))
}

async function majInteretKouru(tenantId) {
  const aujourdui = new Date()
  const ech = await prisma.$queryRaw`
    SELECT e.*, p.taux_interet, p.tenant_id
    FROM pre_echeances e
    JOIN prets p ON p.id = e.pre_id
    WHERE e.tenant_id = ${tenantId}
      AND e.statut IN ('attente','partiel')
      AND e.dat_limit < CURRENT_DATE
  `
  for (const e of ech) {
    const tauxNum = Number(e.taux_interet || 0)
    if (tauxNum === 0) continue   // Bous Solèy — pa gen enterè kouru
    const { interetKouru, jouReta } = calcInteretKouru(
      Number(e.balans_avant), tauxNum, e.dat_limit, aujourdui
    )
    await prisma.$executeRaw`
      UPDATE pre_echeances
      SET interet_kouru = ${interetKouru},
          jou_reta      = ${jouReta},
          statut        = CASE WHEN statut = 'attente' THEN 'reta' ELSE statut END,
          updated_at    = NOW()
      WHERE id = ${e.id}
    `
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /pre/stats
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const debiMwa = new Date(); debiMwa.setDate(1); debiMwa.setHours(0,0,0,0)

    await majInteretKouru(tenantId)

    const [totalPrets, pretsActifs, pretsEnReta, portAgg, desMwaAgg, kolMwaAgg] = await Promise.all([
      prisma.pre.count({ where: { tenantId } }),
      prisma.pre.count({ where: { tenantId, statut: 'actif' } }),
      prisma.pre.count({ where: { tenantId, statut: 'reta'  } }),
      prisma.pre.aggregate({ where: { tenantId, statut: { in: ['actif','reta','attente'] } }, _sum: { montant: true } }),
      prisma.pre.aggregate({ where: { tenantId, statut: { not: 'annule' }, createdAt: { gte: debiMwa } }, _sum: { montant: true } }),
      prisma.prePaiement.aggregate({ where: { tenantId, createdAt: { gte: debiMwa } }, _sum: { montant: true } }),
    ])

    const interetKouruAgg = await prisma.$queryRaw`
      SELECT COALESCE(SUM(interet_kouru),0) as total
      FROM pre_echeances
      WHERE tenant_id = ${tenantId} AND statut IN ('reta','partiel')
    `

    const kapitalDisponib = await getKapitalDisponib(tenantId)

    return res.json({
      stats: {
        totalPrets, pretsActifs,
        totalEnReta:      pretsEnReta,
        totalPortfeuye:   Number(portAgg._sum.montant || 0),
        totalDesèmanMwa:  Number(desMwaAgg._sum.montant || 0),
        totalPaiemanMwa:  Number(kolMwaAgg._sum.montant || 0),
        enterèKouruTotal: Number(interetKouruAgg[0]?.total || 0),
        kapitalDisponib,
      },
    })
  } catch (err) {
    console.error('[PRE /stats]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/kane-epay-search
// ═══════════════════════════════════════════════════════════════
router.get('/kane-epay-search', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { q = '' } = req.query
    if (q.length < 2) return res.json({ accounts: [] })
    const accounts = await prisma.kaneEpay.findMany({
      where: { tenantId, isActive: true, OR: [
        { firstName:     { contains: q, mode: 'insensitive' } },
        { lastName:      { contains: q, mode: 'insensitive' } },
        { phone:         { contains: q, mode: 'insensitive' } },
        { nifOrCin:      { contains: q, mode: 'insensitive' } },
        { accountNumber: { contains: q, mode: 'insensitive' } },
      ]},
      select: { id: true, accountNumber: true, firstName: true, lastName: true, phone: true, balance: true, photoUrl: true },
      take: 8,
    })
    return res.json({ accounts })
  } catch (err) {
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/kapital/istorik
// ═══════════════════════════════════════════════════════════════
router.get('/kapital/istorik', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const istorik = await prisma.$queryRaw`
      SELECT pk.*, u.full_name as creator_name FROM pre_kapital pk
      LEFT JOIN users u ON u.id = pk.created_by
      WHERE pk.tenant_id = ${tenantId}
      ORDER BY pk.created_at DESC LIMIT 50
    `
    return res.json({ istorik, kapitalDisponib: await getKapitalDisponib(tenantId) })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/rapo/kes-status
// ═══════════════════════════════════════════════════════════════
router.get('/rapo/kes-status', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    const r = await prisma.$queryRaw`
      SELECT id FROM pre_rapo_kesye
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
        AND date_rapo = (NOW() - INTERVAL '5 hours')::date
      LIMIT 1
    `
    return res.json({ kesFermen: r.length > 0 })
  } catch (err) { return res.json({ kesFermen: false }) }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/rapo/kesye
// ═══════════════════════════════════════════════════════════════
router.get('/rapo/kesye', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const rapos = await prisma.$queryRaw`
      SELECT r.*, u.full_name as kesye_nom FROM pre_rapo_kesye r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.tenant_id = ${tenantId}
      ORDER BY r.created_at DESC LIMIT 100
    `
    return res.json({ rapos })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre  — lis prè
// FIX V6: pa itilize interetKouruTotal/totalDuAjou nan Prisma select
//         (si kolòn sa yo pa nan schema.prisma → findMany kraze)
//         Itilize $queryRawUnsafe pito
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { search = '', page = 1, limit = 15, statut, branchId } = req.query
    const pageNum  = Number(page)
    const limitNum = Number(limit)
    const offset   = (pageNum - 1) * limitNum

    // Bati klaòz WHERE ak paramèt safe (evite SQL injection)
    const tid = tenantId.replace(/'/g, "''")
    const conditions = [`p.tenant_id = '${tid}'`]
    if (statut)                 conditions.push(`p.statut = '${statut.replace(/'/g, "''")}'`)
    if (branchId)               conditions.push(`p.branch_id = '${branchId.replace(/'/g, "''")}'`)
    if (search && search.length > 1) {
      const s = search.replace(/'/g, "''")
      conditions.push(`(p.client_nom ILIKE '%${s}%' OR p.client_phone ILIKE '%${s}%' OR p.numero_pre ILIKE '%${s}%')`)
    }
    const whereClause = conditions.join(' AND ')

    const [prets, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT
          p.id, p.numero_pre, p.client_nom, p.client_phone,
          p.montant, p.taux_interet, p.duree_en_mois,
          p.total_du, p.total_paye, p.montant_bloke,
          p.dat_debut, p.dat_fin, p.periode,
          p.statut, p.created_at, p.branch_id, p.kont_kane_epay_id,
          COALESCE(p.interet_kouru_total, 0)                     AS interet_kouru_total,
          COALESCE(p.total_du_ajou, GREATEST(0, p.total_du - p.total_paye)) AS total_du_ajou
        FROM prets p
        WHERE ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM prets p WHERE ${whereClause}`),
    ])

    return res.json({
      prets,
      total: Number(countResult[0]?.total || 0),
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error('[PRE GET /]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/kapital/enjekte
// ═══════════════════════════════════════════════════════════════
router.post('/kapital/enjekte', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin sèlman.' })
    const { montant, notes } = req.body
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })
    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'enjeksyon', ${notes||null}, ${userId})
    `
    return res.json({ message: 'Kapital enjekte.', kapitalDisponib: await getKapitalDisponib(tenantId) })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/rapo/femen-kes
// ═══════════════════════════════════════════════════════════════
router.post('/rapo/femen-kes', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    if (await isKesFermen(tenantId, userId))
      return res.status(400).json({ message: 'Kès ou deja fèmen jodi a.' })
    const { notes } = req.body
    const debiJou = new Date(); debiJou.setHours(0,0,0,0)
    const [pretsJou, paiemanJou] = await Promise.all([
      prisma.pre.findMany({ where: { tenantId, createdBy: userId, createdAt: { gte: debiJou } }, select: { montant: true, totalDu: true } }),
      prisma.prePaiement.findMany({ where: { tenantId, createdBy: userId, createdAt: { gte: debiJou } }, select: { montant: true } }),
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
        (${tenantId}, ${userId}, (NOW() - INTERVAL '5 hours')::date,
         ${totalPreKreye}, ${montantDeseman}, ${totalKoleksyon}, ${totalEntere}, ${paiemanJou.length}, ${notes||null})
    `
    return res.json({ rapo: {
      date: new Date().toISOString().split('T')[0],
      totalPreKreye, montantDeseman, totalKoleksyon, totalEntere,
      nbPaieman: paiemanJou.length,
    }})
  } catch (err) {
    console.error('[PRE /rapo/femen-kes]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre  — Kreye nouvo prè + JENERE ECHEANCES
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)

    if (await isKesFermen(tenantId, userId))
      return res.status(403).json({ message: 'Kès ou fèmen jodi a.' })

    const { clientNom, clientPhone, clientNifCin, clientAdres, kontKaneEpayId,
            montant, tauxInteret, dureeEnMois, montantBloke,
            tipKalkil, pemaParJou, nombreJou,
            datDebut, periode, method, reference, notes } = req.body

    const isBousSoleil = tipKalkil === 'bous_soleil'

    if (!clientNom?.trim())       return res.status(400).json({ message: 'Non kliyan obligatwa.' })
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })
    if (!kontKaneEpayId)          return res.status(400).json({ message: 'Kont Kanè Epay obligatwa.' })

    if (!isBousSoleil) {
      if (tauxInteret === undefined || tauxInteret === null || tauxInteret === '')
        return res.status(400).json({ message: 'Taux enterè obligatwa.' })
      if (!dureeEnMois)
        return res.status(400).json({ message: 'Durasyon obligatwa.' })
    } else {
      if (!pemaParJou || pemaParJou <= 0)
        return res.status(400).json({ message: 'Peman pa jou obligatwa pou Bous Solèy.' })
      if (!nombreJou || nombreJou <= 0)
        return res.status(400).json({ message: 'Nonm jou obligatwa pou Bous Solèy.' })
    }

    const kaneKont = await prisma.kaneEpay.findFirst({ where: { id: kontKaneEpayId, tenantId } })
    if (!kaneKont) return res.status(400).json({ message: 'Kont Kanè Epay pa jwenn.' })

    const numeroPre      = await genereNumeroPre(tenantId)
    const debut          = datDebut ? new Date(datDebut) : new Date()
    const datFin         = new Date(debut)
    const dureeNum       = isBousSoleil ? Math.ceil(Number(nombreJou || 30) / 30) : Number(dureeEnMois)
    datFin.setMonth(datFin.getMonth() + dureeNum)

    const datPremyePeman = new Date(debut)
    switch (periode) {
      case 'jounal':    datPremyePeman.setDate(datPremyePeman.getDate() + 1);   break
      case 'semaine':   datPremyePeman.setDate(datPremyePeman.getDate() + 7);   break
      case 'biweekly':  datPremyePeman.setDate(datPremyePeman.getDate() + 14);  break
      case 'mois':      datPremyePeman.setMonth(datPremyePeman.getMonth() + 1); break
      case 'trimestre': datPremyePeman.setMonth(datPremyePeman.getMonth() + 3); break
    }

    const nbrPeman = isBousSoleil
      ? Number(nombreJou || 30)
      : calcNbrPeman(Number(dureeEnMois), periode || 'mois')

    const result       = genereEcheances(
      Number(montant), Number(tauxInteret || 0), nbrPeman,
      datPremyePeman, periode || 'mois',
      tipKalkil || 'declining',
      { pemaParJou: Number(pemaParJou || 0), nombreJou: Number(nombreJou || 0) }
    )
    const echeances    = result.echeances
    const totalDuRonde = result.totalDu

    const pre = await prisma.$transaction(async (tx) => {
      const p = await tx.pre.create({
        data: {
          tenantId, numeroPre,
          clientNom: clientNom.trim(), clientPhone: clientPhone||null,
          clientNifCin: clientNifCin||null, clientAdres: clientAdres||null,
          kontKaneEpayId, montant: Number(montant),
          tauxInteret: Number(tauxInteret || 0), dureeEnMois: dureeNum,
          montantBloke: Number(montantBloke||0),
          totalDu: totalDuRonde, totalPaye: 0, totalDuAjou: totalDuRonde,
          datDebut: debut, datFin, periode: periode||'mois',
          methodDeseman: method||'cash', referenceDeseman: reference||null,
          notes: notes||null, statut: 'actif', createdBy: userId,
          avalize1Nom:   req.body.avalize1Nom   || null,
          avalize1Phone: req.body.avalize1Phone || null,
          avalize2Nom:   req.body.avalize2Nom   || null,
          avalize2Phone: req.body.avalize2Phone || null,
          garantiByens:  req.body.garantiByens  || null,
        },
      })
      for (const e of echeances) {
        await tx.$executeRaw`
          INSERT INTO pre_echeances
            (tenant_id, pre_id, numero, dat_limit,
             montant_capital, montant_interet, montant_total,
             balans_avant, balans_apre, statut)
          VALUES (
            ${tenantId}, ${p.id}, ${e.numero}, ${e.datLimit}::date,
            ${e.montantCapital}, ${e.montantInteret}, ${e.montantTotal},
            ${e.balansAvant}, ${e.balansApre}, 'attente'
          )
        `
      }
      return p
    })

    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'pre', ${pre.id}, ${`Dekèsman ${numeroPre}`}, ${userId})
    `

    const echCreye = await prisma.$queryRaw`
      SELECT * FROM pre_echeances WHERE pre_id = ${pre.id} ORDER BY numero
    `
    return res.status(201).json({ pre, echeances: echCreye })
  } catch (err) {
    console.error('[PRE POST /] DETAIL:', err?.message || err)
    return res.status(500).json({ message: err?.message || 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/:id
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const pre = await prisma.pre.findFirst({
      where:   { id: req.params.id, tenantId },
      include: { paiements: { orderBy: { createdAt: 'desc' } } },
    })
    if (!pre) return res.status(404).json({ message: 'Prè pa jwenn.' })

    await majInteretKouru(tenantId)

    const echeances = await prisma.$queryRaw`
      SELECT * FROM pre_echeances WHERE pre_id = ${req.params.id} ORDER BY numero
    `
    const interetKouruTotal = echeances.reduce((s, e) => s + Number(e.interet_kouru || 0), 0)
    const totalDuAjou       = Number(pre.totalDu) + interetKouruTotal - Number(pre.totalPaye)

    return res.json({ pre: { ...pre, interetKouruTotal, totalDuAjou: Math.max(0, totalDuAjou) }, echeances })
  } catch (err) {
    console.error('[PRE GET /:id]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/:id/paiement  — V6
// FIX 1: prePaiement.create → $executeRaw  (evite schema mismatch)
// FIX 2: nouvoStatut — verifye TOUT echeans ki rete, pa sèlman echeancesMise
// FIX 3: dat_paye nan $executeRaw — pa pase string nan ::date si null
// ═══════════════════════════════════════════════════════════════
router.post('/:id/paiement', async (req, res) => {
  const LP = `[PAIEMENT ${req.params.id}]`
  try {
    const { tenantId, userId } = getTB(req)
    const { id }               = req.params
    const { montant, method, reference, notes } = req.body

    console.log(`${LP} S1 — debut. montant=${montant} userId=${userId}`)

    if (await isKesFermen(tenantId, userId))
      return res.status(403).json({ message: 'Kès ou fèmen jodi a.' })
    if (!montant || Number(montant) <= 0)
      return res.status(400).json({ message: 'Montan peman dwe > 0.' })

    console.log(`${LP} S2 — jwenn prè`)
    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.'     })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Prè deja klotire.' })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'     })

    console.log(`${LP} S3 — majInteretKouru`)
    await majInteretKouru(tenantId)

    console.log(`${LP} S4 — jwenn echeans`)
    const echeancesRaw = await prisma.$queryRaw`
      SELECT * FROM pre_echeances
      WHERE pre_id = ${id} AND statut != 'paye'
      ORDER BY numero
    `
    console.log(`${LP} S4 OK — ${echeancesRaw.length} echeans`)

    const echeances = echeancesRaw.map(e => ({
      id:             e.id,
      numero:         e.numero,
      datLimit:       e.dat_limit,
      montantCapital: Number(e.montant_capital),
      montantInteret: Number(e.montant_interet),
      montantTotal:   Number(e.montant_total),
      balansAvant:    Number(e.balans_avant),
      balansApre:     Number(e.balans_apre),
      montantPaye:    Number(e.montant_paye  || 0),
      statut:         e.statut,
      interetKouru:   Number(e.interet_kouru || 0),
      jouReta:        Number(e.jou_reta      || 0),
    }))

    const tauxNum = Number(pre.tauxInteret || 0)
    console.log(`${LP} S5 — alokePaiement taux=${tauxNum}`)
    const engineResult  = alokePaiement(echeances, Number(montant), tauxNum, new Date())
    const echeancesMise = engineResult?.echeancesMise ?? []
    console.log(`${LP} S5 OK — ${echeancesMise.length} echeans aloke`)

    const montan         = Number(montant)
    const nouvoTotalPaye = Number(pre.totalPaye) + montan

    // nouvoStatut — FIX V6:
    // Konbine echeans ki PA t touche + echeans ki fèk mize pou kalkile rès total
    const idsMise = new Set(echeancesMise.map(e => String(e.id)))
    const echFinal = [
      ...echeancesRaw
        .filter(e => !idsMise.has(String(e.id)))
        .map(e => ({
          montantTotal: Number(e.montant_total),
          montantPaye:  Number(e.montant_paye  || 0),
          interetKouru: Number(e.interet_kouru || 0),
          statut:       e.statut,
        })),
      ...echeancesMise.map(e => ({
        montantTotal: Number(e.montantTotal),
        montantPaye:  Number(e.montantPaye  || 0),
        interetKouru: Number(e.interetKouru || 0),
        statut:       e.statut,
      })),
    ]
    const totalReste = echFinal.reduce(
      (s, e) => s + Math.max(0, e.montantTotal + e.interetKouru - e.montantPaye), 0
    )
    const genReta = echFinal.some(e => e.statut === 'reta' && e.montantTotal > e.montantPaye)

    let nouvoStatut = 'actif'
    if (totalReste <= 0.01)  nouvoStatut = 'cloture'
    else if (genReta)        nouvoStatut = 'reta'

    const interetKouruTotalCalc = echeances.reduce((s, e) => s + e.interetKouru, 0)

    console.log(`${LP} S6 — tranzaksyon DB. statut=${nouvoStatut} reste=${totalReste.toFixed(2)}`)

    await prisma.$transaction(async (tx) => {

      // 6a — Peman via $executeRaw (evite champ schema mismatch nan prePaiement)
      await tx.$executeRaw`
        INSERT INTO pre_paiements
          (tenant_id, pre_id, montant, balance_avant, balance_apre,
           method, reference, notes, created_by, created_at)
        VALUES (
          ${tenantId}, ${id}, ${montan},
          ${Math.max(0, Number(pre.totalDu) - Number(pre.totalPaye))},
          ${Math.max(0, totalReste)},
          ${method    || 'cash'},
          ${reference || null},
          ${notes     || null},
          ${userId},
          NOW()
        )
      `

      // 6b — Update chak echeans
      for (const e of echeancesMise) {
        const datPayeStr = e.datPaye
          ? (e.datPaye instanceof Date
              ? e.datPaye.toISOString().split('T')[0]
              : String(e.datPaye).split('T')[0])
          : null

        if (datPayeStr) {
          await tx.$executeRaw`
            UPDATE pre_echeances SET
              montant_paye  = ${Number(e.montantPaye  || 0)},
              statut        = ${e.statut},
              dat_paye      = ${datPayeStr}::date,
              interet_kouru = ${Number(e.interetKouru || 0)},
              jou_reta      = ${Number(e.jouReta      || 0)},
              updated_at    = NOW()
            WHERE id = ${e.id}
          `
        } else {
          await tx.$executeRaw`
            UPDATE pre_echeances SET
              montant_paye  = ${Number(e.montantPaye  || 0)},
              statut        = ${e.statut},
              dat_paye      = NULL,
              interet_kouru = ${Number(e.interetKouru || 0)},
              jou_reta      = ${Number(e.jouReta      || 0)},
              updated_at    = NOW()
            WHERE id = ${e.id}
          `
        }
      }

      // 6c — Update prè (champs de baz)
      await tx.$executeRaw`
        UPDATE prets SET
          total_paye = ${nouvoTotalPaye},
          statut     = ${nouvoStatut},
          updated_at = NOW()
        WHERE id = ${id}
      `

      // 6d — Kolòn opsyonèl (skip si pa egziste)
      try {
        await tx.$executeRaw`
          UPDATE prets SET
            interet_kouru_total = ${interetKouruTotalCalc},
            total_du_ajou       = ${Math.max(0, totalReste)}
          WHERE id = ${id}
        `
      } catch (_) {
        console.warn(`${LP} S6d skip — interet_kouru_total/total_du_ajou pa nan schema`)
      }
    })

    console.log(`${LP} S6 OK — tranzaksyon reyisi`)

    // 7 — Retou kapital (pa bloke repons si echè)
    try {
      await prisma.$executeRaw`
        INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
        VALUES (${tenantId}, ${montan}, 'retou', ${id}, ${`Peman ${pre.numeroPre}`}, ${userId})
      `
      console.log(`${LP} S7 OK`)
    } catch (kapErr) {
      console.warn(`${LP} S7 SKIP — pre_kapital 'retou':`, kapErr?.message)
    }

    const preAjou = await prisma.pre.findUnique({ where: { id } })
    const echAjou = await prisma.$queryRaw`SELECT * FROM pre_echeances WHERE pre_id = ${id} ORDER BY numero`

    console.log(`${LP} DONE`)
    return res.json({ pre: preAjou, echeances: echAjou })

  } catch (err) {
    console.error(`${LP} ECHEK:`, err?.message || err)
    console.error(`${LP} STACK:`, err?.stack)
    return res.status(500).json({ message: err?.message || 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/:id/echeances
// ═══════════════════════════════════════════════════════════════
router.get('/:id/echeances', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const pre = await prisma.pre.findFirst({ where: { id: req.params.id, tenantId } })
    if (!pre) return res.status(404).json({ message: 'Prè pa jwenn.' })
    await majInteretKouru(tenantId)
    const echeances = await prisma.$queryRaw`
      SELECT * FROM pre_echeances WHERE pre_id = ${req.params.id} ORDER BY numero
    `
    return res.json({ echeances })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/:id/cloture
// ═══════════════════════════════════════════════════════════════
router.post('/:id/cloture', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { id } = req.params
    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.' })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Deja klotire.'  })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'  })
    const preMajou = await prisma.pre.update({ where: { id }, data: { statut: 'cloture' } })
    return res.json({ pre: preMajou })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

module.exports = router