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

async function genereNumeroPre(tenantId, kontKaneEpayId) {
  
  // 1. Jwenn accountNumber kont Kane Epay la
  const kont = await prisma.kaneEpay.findFirst({
    where: { id: kontKaneEpayId, tenantId },
    select: { accountNumber: true }
  })
  if (!kont) throw new Error('Kont Kane Epay pa jwenn.')

  const accountNumber = kont.accountNumber // "YK-2026-00029"

  // 2. ANNDAN transaction — konte prè egzistan pou kont sa SÈLMAN
  const count = await prisma.pre.count({
    where: { tenantId, kontKaneEpayId }
  })

  const sequence = String(count + 1).padStart(3, '0') // 001, 002...
  return `${accountNumber}-${sequence}`
  // Rezilta: "YK-2026-00029-001"
}

async function getKapitalDisponib(tenantId) {
  const [enjeksyon, preDekès, preRetou, kaneRetre, kaneDep] = await Promise.all([
    prisma.$queryRaw`SELECT COALESCE(SUM(montant),0) AS total FROM pre_kapital WHERE tenant_id = ${tenantId} AND type = 'enjeksyon'`,
    prisma.$queryRaw`SELECT COALESCE(SUM(montant),0) AS total FROM pre_kapital WHERE tenant_id = ${tenantId} AND type = 'pre'`,
    prisma.$queryRaw`SELECT COALESCE(SUM(montant),0) AS total FROM pre_kapital WHERE tenant_id = ${tenantId} AND type = 'retou'`,
    prisma.$queryRaw`SELECT COALESCE(SUM(amount),0) AS total FROM kane_transactions WHERE tenant_id = ${tenantId} AND type = 'retrait'`,
    prisma.$queryRaw`SELECT COALESCE(SUM(amount),0) AS total FROM kane_transactions WHERE tenant_id = ${tenantId} AND type IN ('depot', 'ouverture')`,
  ])
  const disponib =
    Number(enjeksyon[0]?.total || 0)
    + Number(preRetou[0]?.total  || 0)
    + Number(kaneDep[0]?.total   || 0)
    - Number(preDekès[0]?.total  || 0)
    - Number(kaneRetre[0]?.total || 0)
  return Math.max(0, disponib)
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
    if (tauxNum === 0) continue
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
      FROM pre_echeances WHERE tenant_id = ${tenantId} AND statut IN ('reta','partiel')
    `
    const kapitalDisponib = await getKapitalDisponib(tenantId)
    return res.json({ stats: {
      totalPrets, pretsActifs, totalEnReta: pretsEnReta,
      totalPortfeuye:   Number(portAgg._sum.montant   || 0),
      totalDesèmanMwa:  Number(desMwaAgg._sum.montant || 0),
      totalPaiemanMwa:  Number(kolMwaAgg._sum.montant || 0),
      enterèKouruTotal: Number(interetKouruAgg[0]?.total || 0),
      kapitalDisponib,
    }})
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
      select: { id:true, accountNumber:true, firstName:true, lastName:true, phone:true, balance:true, photoUrl:true },
      take: 8,
    })
    return res.json({ accounts })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
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
// GET /pre — lis prè
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    const { search = '', page = 1, limit = 15, statut, branchId } = req.query
    const pageNum  = Number(page)
    const limitNum = Number(limit)
    const offset   = (pageNum - 1) * limitNum

    const tid = tenantId.replace(/'/g, "''")
    const conditions = [`p.tenant_id = '${tid}'`]
    if (statut)                 conditions.push(`p.statut = '${statut.replace(/'/g, "''")}'`)
    if (branchId)               conditions.push(`p.branch_id = '${branchId.replace(/'/g, "''")}'`)
    if (search && search.length > 1) {
      const s = search.replace(/'/g, "''")
      conditions.push(`(p.client_nom ILIKE '%${s}%' OR p.client_phone ILIKE '%${s}%' OR p.numero_pre ILIKE '%${s}%')`)
    }
    const whereClause = conditions.join(' AND ')

    const [pretsRaw, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT p.id, p.numero_pre, p.client_nom, p.client_phone,
          p.montant, p.taux_interet, p.duree_en_mois,
          p.total_du, p.total_paye, p.montant_bloke,
          p.dat_debut, p.dat_fin, p.periode,
          p.statut, p.created_at, p.branch_id, p.kont_kane_epay_id,
          COALESCE(p.interet_kouru_total, 0) AS interet_kouru_total,
          COALESCE(p.total_du_ajou, GREATEST(0, p.total_du - p.total_paye)) AS total_du_ajou
        FROM prets p WHERE ${whereClause}
        ORDER BY p.created_at DESC LIMIT ${limitNum} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM prets p WHERE ${whereClause}`),
    ])

    const prets = pretsRaw.map(p => ({
      id: p.id, numeroPre: p.numero_pre, clientNom: p.client_nom,
      clientPhone: p.client_phone, montant: p.montant, tauxInteret: p.taux_interet,
      dureeEnMois: p.duree_en_mois, totalDu: p.total_du, totalPaye: p.total_paye,
      montantBloke: p.montant_bloke, datDebut: p.dat_debut, datFin: p.dat_fin,
      periode: p.periode, statut: p.statut, createdAt: p.created_at,
      branchId: p.branch_id, kontKaneEpayId: p.kont_kane_epay_id,
      interetKouruTotal: Number(p.interet_kouru_total || 0),
      totalDuAjou: Number(p.total_du_ajou || 0),
    }))

    return res.json({ prets, total: Number(countResult[0]?.total || 0), page: pageNum, limit: limitNum })
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
    const inserted = await prisma.$queryRaw`
      INSERT INTO pre_kapital (tenant_id, montant, type, notes, created_by)
      VALUES (${tenantId}, ${Number(montant)}, 'enjeksyon', ${notes||null}, ${userId})
      RETURNING id
    `
    const newId = inserted[0]?.id || null
    return res.json({ message: 'Kapital enjekte.', id: newId, kapitalDisponib: await getKapitalDisponib(tenantId) })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE /pre/kapital/:id — Admin efase yon enjeksyon/transaksyon
// ═══════════════════════════════════════════════════════════════
router.delete('/kapital/:id', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin sèlman.' })
    const rows = await prisma.$queryRaw`
      SELECT id, type FROM pre_kapital
      WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId}
      LIMIT 1
    `
    if (!rows[0]) return res.status(404).json({ message: 'Transaksyon pa jwenn.' })
    await prisma.$executeRaw`
      DELETE FROM pre_kapital WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId}
    `
    return res.json({ success: true, message: 'Transaksyon efase.' })
  } catch (err) { return res.status(500).json({ message: 'Erè sèvè.' }) }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/rapo/femen-kes
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PUT /pre/kapital/:id — Admin modifye enjeksyon (5 minit sèlman)
// ═══════════════════════════════════════════════════════════════
router.put('/kapital/:id', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin sèlman.' })

    const rows = await prisma.$queryRaw`
      SELECT id, montant, notes, created_at FROM pre_kapital
      WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId} AND type = 'enjeksyon'
      LIMIT 1
    `
    if (!rows[0]) return res.status(404).json({ message: 'Enjeksyon pa jwenn.' })

    // Verifye 5 minit limite
    const createdAt  = new Date(rows[0].created_at)
    const now        = new Date()
    const diffMinutes = (now - createdAt) / 1000 / 60

    if (diffMinutes > 5) {
      return res.status(403).json({
        message: `Limite 5 minit depase. Ou te kreye enjeksyon sa ${Math.round(diffMinutes)} minit pase.`,
        expired: true,
      })
    }

    const { montant, notes } = req.body
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })

    await prisma.$executeRaw`
      UPDATE pre_kapital SET montant = ${Number(montant)}, notes = ${notes||null}
      WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId}
    `

    const sekonRete = Math.max(0, 300 - Math.round((now - createdAt) / 1000))
    return res.json({
      message: 'Enjeksyon modifye.',
      kapitalDisponib: await getKapitalDisponib(tenantId),
      sekonRete,
    })
  } catch (err) {
    console.error('[PRE PUT /kapital/:id]', err)
    return res.status(500).json({ message: err?.message || 'Erè sèvè.' })
  }
})

router.post('/rapo/femen-kes', async (req, res) => {
  try {
    const { tenantId, userId } = getTB(req)
    if (await isKesFermen(tenantId, userId))
      return res.status(400).json({ message: 'Kès ou deja fèmen jodi a.' })
    const { notes } = req.body
    const debiJou = new Date(); debiJou.setHours(0,0,0,0)
    const [pretsJou, paiemanJou] = await Promise.all([
      prisma.pre.findMany({ where: { tenantId, createdBy: userId, createdAt: { gte: debiJou } }, select: { montant:true, totalDu:true } }),
      prisma.prePaiement.findMany({ where: { tenantId, createdBy: userId, createdAt: { gte: debiJou } }, select: { montant:true } }),
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
      totalPreKreye, montantDeseman, totalKoleksyon, totalEntere, nbPaieman: paiemanJou.length,
    }})
  } catch (err) {
    console.error('[PRE /rapo/femen-kes]', err)
    return res.status(500).json({ message: 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre — Kreye nouvo prè + JENERE ECHEANCES
// ✅ FIX: timeout 30s sou transaction an
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

// ✅ numeroPre ap jenere ANNDAN transaction an kounye a (wè anba)
const debut    = datDebut ? new Date(datDebut) : new Date()
const datFin   = new Date(debut)
const dureeNum = isBousSoleil ? Math.ceil(Number(nombreJou || 30) / 30) : Number(dureeEnMois)
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

    // ✅ FIX: maxWait 15s, timeout 30s — evite "Transaction not found" sou cold start
    const pre = await prisma.$transaction(async (tx) => {
      const count = await tx.pre.count({
    where: { tenantId, kontKaneEpayId }
  })
  const numeroPre = `${kaneKont.accountNumber}-${String(count + 1).padStart(3, '0')}`
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
    }, { maxWait: 15000, timeout: 30000 })  // ✅ FIX timeout

    // ✅ KÒRÈK — sèvi ak pre.numeroPre
await prisma.$executeRaw`
  INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
  VALUES (${tenantId}, ${Number(montant)}, 'pre', ${pre.id}, ${`Dekèsman ${pre.numeroPre}`}, ${userId})
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
// ✅ DELETE /pre/:id — Admin efase yon prè (ak tout echeances + paiements + kapital)
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin sèlman.' })

    const pre = await prisma.pre.findFirst({ where: { id: req.params.id, tenantId } })
    if (!pre) return res.status(404).json({ message: 'Prè pa jwenn.' })

    const pid = req.params.id   // UUID string
    const tid = tenantId

    await prisma.$transaction(async (tx) => {
      // ✅ Prisma ORM pou peman
      await tx.prePaiement.deleteMany({ where: { preId: pid } })
      // ✅ pre_id nan pre_echeances/pre_kapital se TEXT — pa mete ::uuid cast
      await tx.$executeRawUnsafe(`DELETE FROM pre_echeances WHERE pre_id = '${pid}'`)
      await tx.$executeRawUnsafe(`DELETE FROM pre_kapital WHERE pre_id = '${pid}' AND tenant_id = '${tid}'`)
      // ✅ Prisma ORM pou prè
      await tx.pre.delete({ where: { id: pid } })
    }, { maxWait: 10000, timeout: 20000 })

    return res.json({ success: true, message: `Prè ${pre.numeroPre} efase avèk siksè.` })
  } catch (err) {
    console.error('[PRE DELETE /:id]', err)
    return res.status(500).json({ message: err?.message || 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// ✅ DELETE /pre/:id/paiement/:paiementId — Admin efase yon peman
// ═══════════════════════════════════════════════════════════════
router.delete('/:id/paiement/:paiementId', async (req, res) => {
  try {
    const { tenantId } = getTB(req)
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin sèlman.' })

    const paiement = await prisma.prePaiement.findFirst({
      where: { id: req.params.paiementId, tenantId, preId: req.params.id }
    })
    if (!paiement) return res.status(404).json({ message: 'Peman pa jwenn.' })

    const montantPeman = Number(paiement.montant)
    const pid = req.params.id
    const tid = tenantId
    const datPaye = paiement.createdAt instanceof Date
      ? paiement.createdAt.toISOString().split('T')[0]
      : String(paiement.createdAt).split('T')[0]

    await prisma.$transaction(async (tx) => {
      // 1. ✅ Efase peman via Prisma ORM
      await tx.prePaiement.delete({ where: { id: req.params.paiementId } })

      // 2. ✅ prets.id = UUID primary key → ::uuid kòrèk
      await tx.$executeRawUnsafe(`
        UPDATE prets SET
          total_paye = GREATEST(0, total_paye - ${montantPeman}),
          statut     = CASE
            WHEN statut = 'cloture' THEN 'actif'::"PreStatut"
            ELSE statut
          END,
          updated_at = NOW()
        WHERE id = '${pid}' AND tenant_id = '${tid}'
      `)

      // 3. ✅ pre_kapital.pre_id = TEXT — pa mete ::uuid
      await tx.$executeRawUnsafe(`
        DELETE FROM pre_kapital
        WHERE pre_id = '${pid}'
          AND tenant_id = '${tid}'
          AND type = 'retou'
          AND montant = ${montantPeman}
          AND id = (
            SELECT id FROM pre_kapital
            WHERE pre_id = '${pid}'
              AND type = 'retou'
              AND montant = ${montantPeman}
            ORDER BY created_at DESC
            LIMIT 1
          )
      `)

      // 4. ✅ pre_echeances.pre_id = TEXT — pa mete ::uuid
      await tx.$executeRawUnsafe(`
        UPDATE pre_echeances SET
          montant_paye  = 0,
          statut        = 'attente',
          dat_paye      = NULL,
          updated_at    = NOW()
        WHERE pre_id = '${pid}'
          AND statut = 'paye'
          AND dat_paye::date = '${datPaye}'::date
      `)
    }, { maxWait: 10000, timeout: 20000 })

    return res.json({ success: true, message: 'Peman efase epi prè mizajou.' })
  } catch (err) {
    console.error('[PRE DELETE PAIEMENT]', err)
    return res.status(500).json({ message: err?.message || 'Erè sèvè.' })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /pre/:id/paiement — V6 + ✅ FIX timeout
// ═══════════════════════════════════════════════════════════════
router.post('/:id/paiement', async (req, res) => {
  const LP = `[PAIEMENT ${req.params.id}]`
  try {
    const { tenantId, userId } = getTB(req)
    const { id }               = req.params
    const { montant, method, reference, notes } = req.body

    if (await isKesFermen(tenantId, userId))
      return res.status(403).json({ message: 'Kès ou fèmen jodi a.' })
    if (!montant || Number(montant) <= 0)
      return res.status(400).json({ message: 'Montan peman dwe > 0.' })

    const pre = await prisma.pre.findFirst({ where: { id, tenantId } })
    if (!pre)                     return res.status(404).json({ message: 'Prè pa jwenn.'     })
    if (pre.statut === 'cloture') return res.status(400).json({ message: 'Prè deja klotire.' })
    if (pre.statut === 'annule')  return res.status(400).json({ message: 'Prè sa anile.'     })

    await majInteretKouru(tenantId)

    const echeancesRaw = await prisma.$queryRaw`
      SELECT * FROM pre_echeances WHERE pre_id = ${id} AND statut != 'paye' ORDER BY numero
    `

    const echeances = echeancesRaw.map(e => ({
      id: e.id, numero: e.numero, datLimit: e.dat_limit,
      montantCapital: Number(e.montant_capital), montantInteret: Number(e.montant_interet),
      montantTotal: Number(e.montant_total), balansAvant: Number(e.balans_avant),
      balansApre: Number(e.balans_apre), montantPaye: Number(e.montant_paye || 0),
      statut: e.statut, interetKouru: Number(e.interet_kouru || 0), jouReta: Number(e.jou_reta || 0),
    }))

    const tauxNum      = Number(pre.tauxInteret || 0)
    const engineResult = alokePaiement(echeances, Number(montant), tauxNum, new Date())
    const echeancesMise = engineResult?.echeancesMise ?? []

    const montan         = Number(montant)
    const nouvoTotalPaye = Number(pre.totalPaye) + montan

    const idsMise = new Set(echeancesMise.map(e => String(e.id)))
    const echFinal = [
      ...echeancesRaw.filter(e => !idsMise.has(String(e.id))).map(e => ({
        montantTotal: Number(e.montant_total), montantPaye: Number(e.montant_paye || 0),
        interetKouru: Number(e.interet_kouru || 0), statut: e.statut,
      })),
      ...echeancesMise.map(e => ({
        montantTotal: Number(e.montantTotal), montantPaye: Number(e.montantPaye || 0),
        interetKouru: Number(e.interetKouru || 0), statut: e.statut,
      })),
    ]
    const totalReste = echFinal.reduce((s, e) => s + Math.max(0, e.montantTotal + e.interetKouru - e.montantPaye), 0)
    const genReta    = echFinal.some(e => e.statut === 'reta' && e.montantTotal > e.montantPaye)

    let nouvoStatut = 'actif'
    if (totalReste <= 0.01) nouvoStatut = 'cloture'
    else if (genReta)       nouvoStatut = 'reta'

    const interetKouruTotalCalc = echeances.reduce((s, e) => s + e.interetKouru, 0)

    // ✅ FIX: timeout 30s
    await prisma.$transaction(async (tx) => {
      await tx.prePaiement.create({
        data: {
          tenantId, preId: id, montant: montan,
          balanceAvant: Math.max(0, Number(pre.totalDu) - Number(pre.totalPaye)),
          balanceApre:  Math.max(0, totalReste),
          method: (method || 'cash'), reference: reference||null,
          notes: notes||null, createdBy: userId,
        },
      })

      for (const e of echeancesMise) {
        const datPayeStr = e.datPaye
          ? (e.datPaye instanceof Date ? e.datPaye.toISOString().split('T')[0] : String(e.datPaye).split('T')[0])
          : null

        if (datPayeStr) {
          await tx.$executeRaw`
            UPDATE pre_echeances SET
              montant_paye = ${Number(e.montantPaye || 0)}, statut = ${e.statut},
              dat_paye = ${datPayeStr}::date, interet_kouru = ${Number(e.interetKouru || 0)},
              jou_reta = ${Number(e.jouReta || 0)}, updated_at = NOW()
            WHERE id = ${e.id}
          `
        } else {
          await tx.$executeRaw`
            UPDATE pre_echeances SET
              montant_paye = ${Number(e.montantPaye || 0)}, statut = ${e.statut},
              dat_paye = NULL, interet_kouru = ${Number(e.interetKouru || 0)},
              jou_reta = ${Number(e.jouReta || 0)}, updated_at = NOW()
            WHERE id = ${e.id}
          `
        }
      }

      await tx.$executeRaw`
        UPDATE prets SET total_paye = ${nouvoTotalPaye}, statut = ${nouvoStatut}::"PreStatut", updated_at = NOW()
        WHERE id = ${id}
      `

      try {
        await tx.$executeRaw`
          UPDATE prets SET interet_kouru_total = ${interetKouruTotalCalc}, total_du_ajou = ${Math.max(0, totalReste)}
          WHERE id = ${id}
        `
      } catch (_) {}
    }, { maxWait: 15000, timeout: 30000 })  // ✅ FIX timeout

    try {
      await prisma.$executeRaw`
        INSERT INTO pre_kapital (tenant_id, montant, type, pre_id, notes, created_by)
        VALUES (${tenantId}, ${montan}, 'retou', ${id}, ${`Peman ${pre.numeroPre}`}, ${userId})
      `
    } catch (kapErr) {
      console.warn(`${LP} S7 SKIP — pre_kapital 'retou':`, kapErr?.message)
    }

    const preAjou = await prisma.pre.findUnique({ where: { id } })
    const echAjou = await prisma.$queryRaw`SELECT * FROM pre_echeances WHERE pre_id = ${id} ORDER BY numero`

    return res.json({ pre: preAjou, echeances: echAjou })
  } catch (err) {
    console.error(`${LP} ECHEK:`, err?.message || err)
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