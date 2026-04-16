// backend/src/routes/mikwo-profit.routes.js
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma  = new PrismaClient()
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id

// GET /mikwo-profit?debutDate=&finDate=&periode=mois|jou|ane
router.get('/', async (req, res) => {
  try {
    const tenantId  = tid(req)
    const now       = new Date()
    const debutDate = req.query.debutDate || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const finDate   = req.query.finDate   || new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]

    const [
      // 1. Enterè kolekte (peman Prè - kapital)
      enteretKolekte,
      // 2. Frè Kanè Epay (250G × kont kreye nan peryòd la)
      freKane,
      // 3. Depans
      depans,
      // 4. Kapital enjekte total
      kapitalEnjekte,
      // 5. Kapital retounen (ranbousman)
      kapitalRetou,
      // 6. Stats jeneral
      nbrPreActif,
      nbrKaneActif,
      totalPortfeuye,
      // 7. Peman resan (pou grafik)
      paimanResan,
      // 8. Depans resan
      depansResan,
    ] = await Promise.all([

      // Enterè = totalPaye - (sum peman kapital sèlman)
      // Apwòch: kalkile depi paiements nan peryòd la
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(pp.montant), 0) as total
        FROM pre_paiements pp
        JOIN prets p ON p.id = pp.pre_id
        WHERE pp.tenant_id = '${tenantId}'
          AND pp.created_at::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Frè Kanè: 250 × nbre kont kreye nan peryòd la
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total_kont,
               COALESCE(SUM(kane_fee), 0) as total_fre
        FROM kane_epay
        WHERE tenant_id = '${tenantId}'
          AND created_at::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Depans
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM mikwo_expenses
        WHERE tenant_id = '${tenantId}'
          AND date_depans BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Kapital enjekte
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM pre_kapital
        WHERE tenant_id = '${tenantId}'
          AND type = 'enjeksyon'
          AND created_at::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Kapital retounen
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM pre_kapital
        WHERE tenant_id = '${tenantId}'
          AND type = 'retou'
          AND created_at::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Prè aktif
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM prets
        WHERE tenant_id = '${tenantId}' AND statut IN ('actif','reta')
      `),

      // Kane aktif
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM kane_epay
        WHERE tenant_id = '${tenantId}' AND is_active = true
      `),

      // Total portfeuye prè
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total_du - total_paye), 0) as total
        FROM prets
        WHERE tenant_id = '${tenantId}' AND statut IN ('actif','reta','attente')
      `),

      // Peman 7 dènye jou (pou grafik)
      prisma.$queryRawUnsafe(`
        SELECT DATE(created_at) as dat, COALESCE(SUM(montant),0) as total
        FROM pre_paiements
        WHERE tenant_id = '${tenantId}'
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY dat ASC
      `),

      // Depans 7 dènye jou
      prisma.$queryRawUnsafe(`
        SELECT date_depans as dat, COALESCE(SUM(montant),0) as total
        FROM mikwo_expenses
        WHERE tenant_id = '${tenantId}'
          AND date_depans >= NOW() - INTERVAL '7 days'
        GROUP BY date_depans
        ORDER BY dat ASC
      `),
    ])

    const totalPeman    = Number(enteretKolekte[0]?.total || 0)
    const totalFreKane  = Number(freKane[0]?.total_fre   || 0)
    const totalDepans   = Number(depans[0]?.total        || 0)
    const totalEnjekte  = Number(kapitalEnjekte[0]?.total|| 0)
    const totalRetou    = Number(kapitalRetou[0]?.total  || 0)
    const nbrKont       = Number(freKane[0]?.total_kont  || 0)

    // Kalkil pwofi nèt:
    // Revni = Peman Prè (enterè + kapital retounen) + Frè Kane
    // Kout  = Depans + Kapital enjekte
    // Pwofi = Revni - Depans sèlman (pa retire kapital paske se envèstisman)
    const revniTotal    = totalPeman + totalFreKane
    const pwofiNèt      = revniTotal - totalDepans

    res.json({
      periode: { debutDate, finDate },
      revni: {
        paimanPre:  totalPeman,
        freKane:    totalFreKane,
        nbrKontKane: nbrKont,
        total:      revniTotal,
      },
      kout: {
        depans:     totalDepans,
        total:      totalDepans,
      },
      kapital: {
        enjekte:    totalEnjekte,
        retou:      totalRetou,
        nèt:        totalRetou - totalEnjekte,
      },
      pwofiNèt,
      isFans: pwofiNèt >= 0,
      stats: {
        nbrPreActif:    Number(nbrPreActif[0]?.total    || 0),
        nbrKaneActif:   Number(nbrKaneActif[0]?.total   || 0),
        totalPortfeuye: Number(totalPortfeuye[0]?.total || 0),
      },
      grafik: {
        paimanResan: paimanResan.map(r => ({ dat: r.dat, total: Number(r.total) })),
        depansResan:  depansResan.map(r => ({ dat: r.dat, total: Number(r.total) })),
      },
    })
  } catch(e) {
    console.error('[MIKWO PROFIT]', e)
    res.status(500).json({ message: e.message })
  }
})

module.exports = router
