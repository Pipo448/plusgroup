// src/routes/pre.routes.js  — V4 (Declining Balance + Echéancier + Enterè Kouru)
const express  = require('express')
const { PrismaClient } = require('@prisma/client')
const {
  genereEcheances, calcNbrPeman, calcInteretKouru, alokePaiement,
} = require('./pre.engine')  // ← mete nan menm dosye a

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

const HAITI_DATE = `(NOW() - INTERVAL '5 hours')::date`

async function isKesFemen(tenantId, userId) {
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
  const ane = new Date().getFullYear()
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

// Mete ajou enterè kouru pou tout echeans an reta
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
    const { interetKouru, jouReta } = calcInteretKouru(
      Number(e.balans_avant), Number(e.taux_interet), e.dat_limit, aujourdui
    )
    await prisma.$executeRaw`
      UPDATE pre_echeances
      SET interet_kouru = ${interetKouru}, jou_reta = ${jouReta},
          statut = CASE WHEN statut = 'attente' THEN 'reta' ELSE statut END,
          updated_at = NOW()
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

    // Total enterè kouru aktyèl
    const interetKouruAgg = await prisma.$queryRaw`
      SELECT COALESCE(SUM(interet_kouru),0) as total
      FROM pre_echeances
      WHERE tenant_id = ${tenantId} AND statut IN ('reta','partiel')
    `

    const koleksyonMwa = Number(kolMwaAgg._sum.montant || 0)
    const kapitalDisponib = await getKapitalDisponib(tenantId)

    return res.json({
      stats: {
        totalPrets, pretsActifs,
        totalEnReta:      pretsEnReta,
        totalPortfeuye:   Number(portAgg._sum.montant || 0),
        totalDesèmanMwa:  Number(desMwaAgg._sum.montant || 0),
        totalPaiemanMwa:  koleksyonMwa,
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
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
        { phone:     { contains: q, mode: 'insensitive' } },
        { nifOrCin:  { contains: q, mode: 'insensitive' } },
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
    return res.json({ kesFemen: r.length > 0 })
  } catch (err) { return res.json({ kesFemen: false }) }
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
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { search = '', page = 1, limit = 15, statut, branchId } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = {
      tenantId,
      ...(statut   && { statut }),
      ...(branchId && { branchId }),
      ...(search && { OR: [
        { clientNom:    { contains: search, mode: 'insensitive' } },
        { clientPhone:  { contains: search, mode: 'insensitive' } },
        { numeroPre:    { contains: search, mode: 'insensitive' } },
      ]}),
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
          interetKouruTotal: true, totalDuAjou: true,
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
    if (await isKesFemen(tenantId, userId))
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
      INSERT INTO pre_rapo_kesye (tenant_id, user_id, date_rapo, total_pre_kreye, montant_deseman, total_koleksyon, total_entere, nb_paieman, notes)
      VALUES (${tenantId}, ${userId}, (NOW() - INTERVAL '5 hours')::date,
              ${totalPreKreye}, ${montantDeseman}, ${totalKoleksyon}, ${totalEntere}, ${paiemanJou.length}, ${notes||null})
    `
    return res.json({ rapo: { date: new Date().toISOString().split('T')[0], totalPreKreye, montantDeseman, totalKoleksyon, totalEntere, nbPaieman: paiemanJou.length } })
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

    if (await isKesFemen(tenantId, userId))
      return res.status(403).json({ message: 'Kès ou fèmen jodi a.' })

    const { clientNom, clientPhone, clientNifCin, clientAdres, kontKaneEpayId,
            montant, tauxInteret, dureeEnMois, montantBloke,
            tipKalkil, pemaParJou, nombreJou,
            datDebut, periode, method, reference, notes } = req.body

    if (!clientNom?.trim())       return res.status(400).json({ message: 'Non kliyan obligatwa.' })
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })
    if (!tauxInteret)             return res.status(400).json({ message: 'Taux enterè obligatwa.' })
    if (!dureeEnMois)             return res.status(400).json({ message: 'Durasyon obligatwa.' })
    if (!kontKaneEpayId)          return res.status(400).json({ message: 'Kont Kanè Epay obligatwa.' })

    const kaneKont = await prisma.kaneEpay.findFirst({ where: { id: kontKaneEpayId, tenantId } })
    if (!kaneKont) return res.status(400).json({ message: 'Kont Kanè Epay pa jwenn.' })

    const numeroPre = await genereNumeroPre(tenantId)
    const debut     = datDebut ? new Date(datDebut) : new Date()
    const datFin    = new Date(debut)
    datFin.setMonth(datFin.getMonth() + Number(dureeEnMois))

    // Premye peman = mwa apre dat debut
    const datPremyePeman = new Date(debut)
    switch (periode) {
      case 'jounal':    datPremyePeman.setDate(datPremyePeman.getDate() + 1);    break
      case 'semaine':   datPremyePeman.setDate(datPremyePeman.getDate() + 7);    break
      case 'biweekly':  datPremyePeman.setDate(datPremyePeman.getDate() + 14);   break
      case 'mois':      datPremyePeman.setMonth(datPremyePeman.getMonth() + 1);  break
      case 'trimestre': datPremyePeman.setMonth(datPremyePeman.getMonth() + 3);  break
    }

    const isBousSoleil = tipKalkil === 'bous_soleil'
    const nbrPeman  = isBousSoleil
      ? Number(nombreJou || 30)
      : calcNbrPeman(Number(dureeEnMois), periode || 'mois')

    const result = genereEcheances(
      Number(montant), Number(tauxInteret || 0), nbrPeman, datPremyePeman, periode || 'mois',
      tipKalkil || 'declining',
      { pemaParJou: Number(pemaParJou || 0), nombreJou: Number(nombreJou || 0) }
    )
    const echeances = result.echeances
    const totalDuRonde = result.totalDu

    // Kreye prè + echeans nan yon sèl tranzaksyon
    const pre = await prisma.$transaction(async (tx) => {
      const p = await tx.pre.create({
        data: {
          tenantId, numeroPre,
          clientNom: clientNom.trim(), clientPhone: clientPhone||null,
          clientNifCin: clientNifCin||null, clientAdres: clientAdres||null,
          kontKaneEpayId, montant: Number(montant),
          tauxInteret: Number(tauxInteret), dureeEnMois: Number(dureeEnMois),
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

      // Enstale echeans yo — insert yon pa yon (solid)
      for (const e of echeances) {
        const datLimitStr = e.datLimit // string YYYY-MM-DD
        await tx.$executeRaw`
          INSERT INTO pre_echeances
            (tenant_id, pre_id, numero, dat_limit,
             montant_capital, montant_interet, montant_total,
             balans_avant, balans_apre, statut)
          VALUES (
            ${tenantId}, ${p.id}, ${e.numero},
            ${datLimitStr}::date,
            ${e.montantCapital}, ${e.montantInteret}, ${e.montantTotal},
            ${e.balansAvant}, ${e.balansApre}, 'attente'
          )
        `
      }
      return p
    })

    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'prè', ${pre.id}, ${`Dekèsman ${numeroPre}`}, ${userId})
    `

    // Retounen prè + echeans
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
// GET /pre/:id  — Prè ak echeans + enterè kouru ajou
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const pre = await prisma.pre.findFirst({
      where: { id: req.params.id, tenantId },
      include: { paiements: { orderBy: { createdAt: 'desc' } } },
    })
    if (!pre) return res.status(404).json({ message: 'Prè pa jwenn.' })

    // Mete ajou enterè kouru anvan retounen
    await majInteretKouru(tenantId)

    // Jwenn echeans ajou
    const echeances = await prisma.$queryRaw`
      SELECT * FROM pre_echeances
      WHERE pre_id = ${req.params.id}
      ORDER BY numero
    `

    // Kalkile total enterè kouru aktyèl
    const interetKouruTotal = echeances.reduce((s, e) =>
      s + Number(e.interet_kouru || 0), 0
    )
    const totalDuAjou = Number(pre.totalDu) + interetKouruTotal - Number(pre.totalPaye)

    return res.json({ pre: { ...pre, interetKouruTotal, totalDuAjou: Math.max(0, totalDuAjou) }, echeances })
  } catch (err) {
    console.error('[PRE GET /:id]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/:id/paieman  — Peman avèk alokasyon declining balance
// ═══════════════════════════════════════════════════════════════
router.post('/:id/paiement', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    const { id } = req.params
    const { montant, method, reference, notes } = req.body

    if (await isKesFemen(tenantId, userId))
      return res.status(403).json({ message: 'Kès ou fèmen jodi a.' })
    if (!montant || montant <= 0)
      return res.status(400).json({ message: 'Montan peman dwe > 0.' })

    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.'     })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Prè deja klotire.' })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'     })

    // Mete ajou enterè kouru anvan
    await majInteretKouru(tenantId)

    // Jwenn echeans ki poko peye
    const echeancesRaw = await prisma.$queryRaw`
      SELECT * FROM pre_echeances
      WHERE pre_id = ${id} AND statut != 'paye'
      ORDER BY numero
    `

    const echeances = echeancesRaw.map(e => ({
      id:             e.id,
      numero:         e.numero,
      datLimit:       e.dat_limit,
      montantCapital: Number(e.montant_capital),
      montantInteret: Number(e.montant_interet),
      montantTotal:   Number(e.montant_total),
      balansAvant:    Number(e.balans_avant),
      balansApre:     Number(e.balans_apre),
      montantPaye:    Number(e.montant_paye || 0),
      statut:         e.statut,
      interetKouru:   Number(e.interet_kouru || 0),
      jouReta:        Number(e.jou_reta || 0),
    }))

    // Aloke peman — itilize taux reyèl (0 pou bous_soleil pa pwoblèm)
    const { echeancesMise } = alokePaiement(
      echeances, Number(montant), Number(pre.tauxInteret || 0), new Date()
    )

    // Nouvo totalPaye
    const nouvoTotalPaye = Number(pre.totalPaye) + Number(montant)
    const resteAPayer    = echeances.reduce((s, e) =>
      s + e.montantTotal + e.interetKouru - e.montantPaye, 0
    ) - Number(montant)

    let nouvoStatut = 'actif'
    if (resteAPayer <= 0.01) nouvoStatut = 'cloture'
    else if (echeances.some(e => e.statut === 'reta')) nouvoStatut = 'reta'

    const interetKouruTotalCalc = echeances.reduce((s, e) => s + Number(e.interetKouru || 0), 0)

    // Atomik: peman + update echeans + update prè
    await prisma.$transaction(async (tx) => {
      // Anrejistre peman
      await tx.prePaiement.create({
        data: {
          tenantId, preId: id,
          montant:      Number(montant),
          balanceAvant: Math.max(0, Number(pre.totalDu) - Number(pre.totalPaye)),
          balanceApre:  Math.max(0, resteAPayer),
          method:       method    || 'cash',
          reference:    reference || null,
          notes:        notes     || null,
          createdBy:    userId,
        },
      })

      // Update chak echeans aloke
      for (const e of echeancesMise) {
        await tx.$executeRaw`
          UPDATE pre_echeances SET
            montant_paye   = ${e.montantPaye},
            statut         = ${e.statut},
            dat_paye       = ${e.datPaye ? e.datPaye : null},
            interet_kouru  = ${e.interetKouru},
            jou_reta       = ${e.jouReta},
            updated_at     = NOW()
          WHERE id = ${e.id}
        `
      }

      // Update prè — san interetKouruTotal pou evite erè schema
      await tx.$executeRaw`
        UPDATE prets SET
          total_paye = ${nouvoTotalPaye},
          statut     = ${nouvoStatut},
          updated_at = NOW()
        WHERE id = ${id}
      `

      // Mete ajou interetKouruTotal si kolòn nan egziste
      try {
        await tx.$executeRaw`
          UPDATE prets SET interet_kouru_total = ${interetKouruTotalCalc}
          WHERE id = ${id}
        `
      } catch { /* silans si kolòn pa egziste */ }
    })

    // Retounen prè + echeans ajou
    await prisma.$executeRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'retou', ${id}, ${`Peman ${pre.numeroPre}`}, ${userId})
    `

    const preAjou = await prisma.pre.findUnique({ where: { id } })
    const echAjou = await prisma.$queryRaw`SELECT * FROM pre_echeances WHERE pre_id=${id} ORDER BY numero`

    return res.json({ pre: preAjou, echeances: echAjou })
  } catch (err) {
    console.error('[PRE POST /:id/paiement]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /pre/:id/echeances  — Echeans ajou pou yon prè
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

// NOTE: Ajoute nan schema.prisma model Pre, apre "notes String?":
// avalize1Nom    String?  @map("avalize1_nom")   @db.VarChar(200)
// avalize1Phone  String?  @map("avalize1_phone") @db.VarChar(50)
// avalize2Nom    String?  @map("avalize2_nom")   @db.VarChar(200)
// avalize2Phone  String?  @map("avalize2_phone") @db.VarChar(50)
// garantiByens   String?  @map("garanti_byens")