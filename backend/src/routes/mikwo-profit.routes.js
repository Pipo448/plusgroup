// backend/src/routes/mikwo-profit.routes.js
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma  = new PrismaClient()
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id

// GET /mikwo-profit?debutDate=&finDate=
router.get('/', async (req, res) => {
  try {
    const tenantId  = tid(req)
    const now       = new Date()
    const debutDate = req.query.debutDate || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const finDate   = req.query.finDate   || new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]

    const [
      enteretData,
      penaliteData,
      freKane,
      depans,
      kapitalEnjekte,
      kapitalRetou,
      nbrPreActif,
      nbrKaneActif,
      totalPortfeuye,
      paimanResan,
      depansResan,
    ] = await Promise.all([

      // ✅ Vrè Enterè sèlman (pa kapital) — depi echeyans ki peye nan peryòd la
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(pe.montant_interet), 0) as total
        FROM pre_echeances pe
        WHERE pe.tenant_id = '${tenantId}'
          AND pe.paiement_id IS NOT NULL
          AND pe.dat_paye::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // ✅ Penalite (enterè kouru pou jou reta) — echeyans peye nan peryòd la
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(pe.interet_kouru), 0) as total
        FROM pre_echeances pe
        WHERE pe.tenant_id = '${tenantId}'
          AND pe.paiement_id IS NOT NULL
          AND pe.dat_paye::date BETWEEN '${debutDate}' AND '${finDate}'
          AND pe.jou_reta > 0
      `),

      // Frè Kanè (250G × kont kreye)
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total_kont,
               COALESCE(SUM(kane_fee), 0) as total_fre
        FROM kane_epay_accounts
        WHERE tenant_id = '${tenantId}'
          AND created_at::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Depans operasyonèl
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM mikwo_expenses
        WHERE tenant_id = '${tenantId}'
          AND date_depans BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Kapital enjekte (tout tan — pa filtre sou dat, se total)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(montant), 0) as total
        FROM pre_kapital
        WHERE tenant_id = '${tenantId}'
          AND type = 'enjeksyon'
      `),

      // Kapital retounen (ranbousman kapital sèlman)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(pe.montant_capital), 0) as total
        FROM pre_echeances pe
        WHERE pe.tenant_id = '${tenantId}'
          AND pe.paiement_id IS NOT NULL
          AND pe.dat_paye::date BETWEEN '${debutDate}' AND '${finDate}'
      `),

      // Statistik: prè aktif
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM prets
        WHERE tenant_id = '${tenantId}' AND statut IN ('actif','reta')
      `),

      // Statistik: kanè aktif
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM kane_epay_accounts
        WHERE tenant_id = '${tenantId}' AND is_active = true
      `),

      // Portfeuye prè (balans restan)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total_du - total_paye), 0) as total
        FROM prets
        WHERE tenant_id = '${tenantId}' AND statut IN ('actif','reta','attente')
      `),

      // Grafik: peman 7 dènye jou
      prisma.$queryRawUnsafe(`
        SELECT DATE(dat_paye) as dat,
               COALESCE(SUM(montant_interet), 0) as enteret,
               COALESCE(SUM(interet_kouru), 0)   as penalite,
               COALESCE(SUM(montant_capital), 0) as kapital
        FROM pre_echeances
        WHERE tenant_id = '${tenantId}'
          AND paiement_id IS NOT NULL
          AND dat_paye >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(dat_paye)
        ORDER BY dat ASC
      `),

      // Grafik: depans 7 dènye jou
      prisma.$queryRawUnsafe(`
        SELECT date_depans as dat, COALESCE(SUM(montant),0) as total
        FROM mikwo_expenses
        WHERE tenant_id = '${tenantId}'
          AND date_depans >= NOW() - INTERVAL '7 days'
        GROUP BY date_depans
        ORDER BY dat ASC
      `),
    ])

    // ── Kalkil ──────────────────────────────────────────────
    const totalEnteret   = Number(enteretData[0]?.total   || 0)
    const totalPenalite  = Number(penaliteData[0]?.total  || 0)
    const totalFreKane   = Number(freKane[0]?.total_fre   || 0)
    const totalDepans    = Number(depans[0]?.total        || 0)
    const totalEnjekte   = Number(kapitalEnjekte[0]?.total|| 0)
    const totalRetouKap  = Number(kapitalRetou[0]?.total  || 0)
    const nbrKont        = Number(freKane[0]?.total_kont  || 0)

    // ✅ Vrè Revni = Enterè + Penalite + Frè Kanè (PAS kapital!)
    const vrèRevni   = totalEnteret + totalPenalite + totalFreKane

    // ✅ Vrè Pwofi Nèt = Vrè Revni - Depans
    const vrèPwofi   = vrèRevni - totalDepans

    res.json({
      periode: { debutDate, finDate },

      // Vrè pwofi — zòn ki chanje
      revni: {
        enteret:      totalEnteret,     // ✅ Enterè sèlman
        penalite:     totalPenalite,    // ✅ Penalite pou reta
        freKane:      totalFreKane,     // ✅ Frè kanè
        nbrKontKane:  nbrKont,
        total:        vrèRevni,
      },
      kout: {
        depans:       totalDepans,
        total:        totalDepans,
      },

      // Kapital — info sèlman, pa konte nan pwofi
      kapital: {
        enjekte:      totalEnjekte,
        retounen:     totalRetouKap,
        nèt:          totalRetouKap - totalEnjekte,
      },

      pwofiNèt:  vrèPwofi,
      isFans:    vrèPwofi >= 0,

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