// backend/src/routes/mikwo-profit.routes.js
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma  = new PrismaClient()
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id

router.get('/', async (req, res) => {
  try {
    const tenantId  = tid(req)
    const now       = new Date()
    const debutDate = req.query.debutDate || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const finDate   = req.query.finDate   || new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]

    const [
      enteretData,
      penaliteData,
      kapitalRetouData,
      freKane,
      depans,
      kapitalEnjekte,
      nbrPreActif,
      nbrKaneActif,
      totalPortfeuye,
      paimanResan,
      depansResan,
      previzyonTotal,
      previzyonKolekte,
      previzyonDeyo,
    ] = await Promise.all([

      // ✅ Enterè sèlman — statut='paye' + dat_paye nan peryòd
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant_interet), 0) as total
        FROM pre_echeances
        WHERE tenant_id = '${tenantId}'
          AND statut = 'paye'
          AND dat_paye::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // ✅ Penalite — enterè kouru pou jou reta
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(interet_kouru), 0) as total
        FROM pre_echeances
        WHERE tenant_id = '${tenantId}'
          AND statut = 'paye'
          AND dat_paye::date BETWEEN '${debutDate}' AND '${finDate}'
          AND jou_reta > 0
      `),

      // Kapital retounen
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant_capital), 0) as total
        FROM pre_echeances
        WHERE tenant_id = '${tenantId}'
          AND statut = 'paye'
          AND dat_paye::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Frè Kanè
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total_kont,
       COALESCE(SUM("kaneFee"), 0) as total_fre
        FROM kane_epay_accounts
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

      // Kapital enjekte total (tout tan)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM pre_kapital
        WHERE tenant_id = '${tenantId}'
          AND type = 'enjeksyon'
      `),

      // Prè aktif
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM prets
        WHERE tenant_id = '${tenantId}' AND statut IN ('actif','reta')
      `),

      // Kanè aktif
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM kane_epay_accounts
        WHERE tenant_id = '${tenantId}' AND is_active = true
      `),

      // Portfeuye prè
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total_du - total_paye), 0) as total
        FROM prets
        WHERE tenant_id = '${tenantId}' AND statut IN ('actif','reta','attente')
      `),

      // Grafik 7 jou
      prisma.$queryRawUnsafe(`
        SELECT DATE(dat_paye) as dat,
               COALESCE(SUM(montant_interet), 0) as enteret,
               COALESCE(SUM(interet_kouru), 0)   as penalite,
               COALESCE(SUM(montant_capital), 0) as kapital
        FROM pre_echeances
        WHERE tenant_id = '${tenantId}'
          AND statut = 'paye'
          AND dat_paye >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(dat_paye)
        ORDER BY dat ASC
      `),

      // Depans 7 jou
      prisma.$queryRawUnsafe(`
        SELECT date_depans as dat, COALESCE(SUM(montant),0) as total
        FROM mikwo_expenses
        WHERE tenant_id = '${tenantId}'
          AND date_depans >= NOW() - INTERVAL '7 days'
        GROUP BY date_depans
        ORDER BY dat ASC
      `),

      // ✅ PREVIZYON — Total enterè prevwa sou tout prè aktif
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(e.montant_interet), 0) as total_interet,
               COALESCE(SUM(e.montant_capital), 0) as total_kapital,
               COALESCE(SUM(e.montant_total), 0)   as total_global
        FROM pre_echeances e
        JOIN prets p ON p.id = e.pre_id
        WHERE e.tenant_id = '${tenantId}'
          AND p.statut IN ('actif','reta','attente')
      `),

      // ✅ PREVIZYON — Enterè deja kolekte sou prè aktif (tout tan)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(e.montant_interet), 0) as total_interet,
               COALESCE(SUM(e.montant_capital), 0) as total_kapital
        FROM pre_echeances e
        JOIN prets p ON p.id = e.pre_id
        WHERE e.tenant_id = '${tenantId}'
          AND p.statut IN ('actif','reta','attente')
          AND e.statut = 'paye'
      `),

      // ✅ PREVIZYON — Balans deyo (kapital + enterè ki rete pou kolekte)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(GREATEST(0, p.total_du - p.total_paye)), 0) as balans_deyo,
               COALESCE(SUM(p.montant), 0) as total_prete,
               COUNT(*) as nbr_pre
        FROM prets p
        WHERE p.tenant_id = '${tenantId}'
          AND p.statut IN ('actif','reta','attente')
      `),
    ])

    const totalEnteret   = Number(enteretData[0]?.total      || 0)
    const totalPenalite  = Number(penaliteData[0]?.total     || 0)
    const totalFreKane   = Number(freKane[0]?.total_fre      || 0)
    const totalDepans    = Number(depans[0]?.total           || 0)
    const totalEnjekte   = Number(kapitalEnjekte[0]?.total   || 0)
    const totalRetouKap  = Number(kapitalRetouData[0]?.total || 0)
    const nbrKont        = Number(freKane[0]?.total_kont     || 0)

    // ✅ Vrè Revni = Enterè + Penalite + Frè Kanè
    const vrèRevni = totalEnteret + totalPenalite + totalFreKane
    const vrèPwofi = vrèRevni - totalDepans

    // ✅ PREVIZYON — Kalkil
    const prevEnterePrevwa  = Number(previzyonTotal[0]?.total_interet  || 0)
    const prevKapitalPrevwa = Number(previzyonTotal[0]?.total_kapital  || 0)
    const prevTotalPrevwa   = Number(previzyonTotal[0]?.total_global   || 0)
    const prevEntereKolekte = Number(previzyonKolekte[0]?.total_interet || 0)
    const prevKapitalKolekte= Number(previzyonKolekte[0]?.total_kapital || 0)
    const prevEntereRete    = Math.max(0, prevEnterePrevwa - prevEntereKolekte)
    const prevKapitalRete   = Math.max(0, prevKapitalPrevwa - prevKapitalKolekte)
    const balansDeyo        = Number(previzyonDeyo[0]?.balans_deyo  || 0)
    const totalPrete        = Number(previzyonDeyo[0]?.total_prete  || 0)
    const nbrPreDeyo        = Number(previzyonDeyo[0]?.nbr_pre      || 0)

    res.json({
      periode: { debutDate, finDate },
      revni: {
        enteret:     totalEnteret,
        penalite:    totalPenalite,
        freKane:     totalFreKane,
        nbrKontKane: nbrKont,
        total:       vrèRevni,
      },
      kout: {
        depans: totalDepans,
        total:  totalDepans,
      },
      kapital: {
        enjekte:  totalEnjekte,
        retounen: totalRetouKap,
        nèt:      totalRetouKap - totalEnjekte,
      },
      pwofiNèt: vrèPwofi,
      isFans:   vrèPwofi >= 0,
      previzyon: {
        enterePrevwa:   prevEnterePrevwa,
        entereKolekte:  prevEntereKolekte,
        entereRete:     prevEntereRete,
        kapitalPrevwa:  prevKapitalPrevwa,
        kapitalKolekte: prevKapitalKolekte,
        kapitalRete:    prevKapitalRete,
        totalPrevwa:    prevTotalPrevwa,
        balansDeyo,
        totalPrete,
        nbrPreDeyo,
      },
      stats: {
        nbrPreActif:    Number(nbrPreActif[0]?.total    || 0),
        nbrKaneActif:   Number(nbrKaneActif[0]?.total   || 0),
        totalPortfeuye: Number(totalPortfeuye[0]?.total || 0),
      },
      grafik: {
        paimanResan: paimanResan.map(r => ({
          dat:      r.dat,
          enteret:  Number(r.enteret),
          penalite: Number(r.penalite),
          kapital:  Number(r.kapital),
        })),
        depansResan: depansResan.map(r => ({
          dat:   r.dat,
          total: Number(r.total),
        })),
      },
    })
  } catch(e) {
    console.error('[MIKWO PROFIT]', e)
    res.status(500).json({ message: e.message })
  }
})

module.exports = router