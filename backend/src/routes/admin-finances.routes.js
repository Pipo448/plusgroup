// backend/src/routes/admin-finances.routes.js
// Jesyon Finansye Konplè — Admin Dashboard
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id
const uid = (req) => req.user?.id || null

// ═══════════════════════════════════════════════════════════════
// GET /admin-finances/summary — Rezime finansye
// ═══════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { debutDate, finDate } = req.query

    const today = new Date()
    const debut = debutDate || `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`
    const fin   = finDate   || today.toISOString().split('T')[0]

    // Tout query an parale
    const [
      depansR, depansPrevwaR, revniR, achaR, vantR, depoSolR, pemanSolR,
      depansJodiR, revniJodiR,
      depansParKatR, dernye10R,
    ] = await Promise.all([
      // Total depans nan peryod
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='depans' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
      `),
      // Total depans prevwa
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count,
               COALESCE(SUM(CASE WHEN is_paid=true THEN amount ELSE 0 END),0) as paid
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='depans_prevwa' AND status='active'
          AND due_date BETWEEN '${debut}' AND '${fin}'
      `),
      // Total revni
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='revni' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
      `),
      // Total acha
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='acha' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
      `),
      // Total vant + benefis
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COALESCE(SUM(profit),0) as profit, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='vant' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
      `),
      // Depo Sol (kob ki antre men pa pou ou)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='depo_sol' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
      `),
      // Peman Sol (kob ki soti)
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='peman_sol' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
      `),
      // Depans jodi a
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='depans' AND status='active'
          AND date = CURRENT_DATE
      `),
      // Revni jodi a
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amount),0) as total
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='revni' AND status='active'
          AND date = CURRENT_DATE
      `),
      // Depans pa kategori
      prisma.$queryRawUnsafe(`
        SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='depans' AND status='active'
          AND date BETWEEN '${debut}' AND '${fin}'
        GROUP BY category ORDER BY total DESC
      `),
      // 10 dènye tranzaksyon
      prisma.$queryRawUnsafe(`
        SELECT id, type, category, description, amount, profit, person_name, date, created_at
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND status='active'
        ORDER BY created_at DESC LIMIT 10
      `),
    ])

    const totalDepans    = Number(depansR[0]?.total || 0)
    const totalRevni     = Number(revniR[0]?.total || 0)
    const totalAcha      = Number(achaR[0]?.total || 0)
    const totalVant      = Number(vantR[0]?.total || 0)
    const totalProfitVant= Number(vantR[0]?.profit || 0)
    const totalDepoSol   = Number(depoSolR[0]?.total || 0)
    const totalPemanSol  = Number(pemanSolR[0]?.total || 0)

    // Balans = Revni + Vant - Depans - Acha + DepoSol - PemanSol
    const balans = totalRevni + totalVant - totalDepans - totalAcha + totalDepoSol - totalPemanSol

    // Vrè benefis = Revni + Profit Vant - Depans (pa konte sol paske se pa lajan ou)
    const vreBenefis = totalRevni + totalProfitVant - totalDepans

    return res.json({
      periode: { debut, fin },
      depans:      { total: totalDepans,  count: Number(depansR[0]?.count || 0) },
      depansPrevwa:{ total: Number(depansPrevwaR[0]?.total || 0), paid: Number(depansPrevwaR[0]?.paid || 0), count: Number(depansPrevwaR[0]?.count || 0) },
      revni:       { total: totalRevni,   count: Number(revniR[0]?.count || 0) },
      acha:        { total: totalAcha,    count: Number(achaR[0]?.count || 0) },
      vant:        { total: totalVant,    profit: totalProfitVant, count: Number(vantR[0]?.count || 0) },
      depoSol:     { total: totalDepoSol, count: Number(depoSolR[0]?.count || 0) },
      pemanSol:    { total: totalPemanSol, count: Number(pemanSolR[0]?.count || 0) },
      solBalans:   totalDepoSol - totalPemanSol,
      depansJodi:  Number(depansJodiR[0]?.total || 0),
      revniJodi:   Number(revniJodiR[0]?.total || 0),
      balans,
      vreBenefis,
      depansParKat: depansParKatR.map(r => ({ category: r.category || 'Lot', total: Number(r.total), count: Number(r.count) })),
      dernye10:     dernye10R.map(r => ({ ...r, amount: Number(r.amount), profit: r.profit ? Number(r.profit) : null })),
    })
  } catch (err) {
    console.error('[ADMIN-FIN SUMMARY]', err)
    return res.status(500).json({ message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /admin-finances?type=xxx — Lis tranzaksyon pa tip
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { type, debutDate, finDate, page = 1, limit = 30 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const today = new Date()
    const debut = debutDate || `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`
    const fin   = finDate   || today.toISOString().split('T')[0]

    let dateCol = 'date'
    if (type === 'depans_prevwa') dateCol = 'due_date'

    const typeFilter = type ? `AND type='${type.replace(/'/g,"''")}'` : ''

    const [rows, countR] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT * FROM admin_finances
        WHERE tenant_id='${tenantId}' AND status='active' ${typeFilter}
          AND ${dateCol} BETWEEN '${debut}' AND '${fin}'
        ORDER BY ${dateCol} DESC, created_at DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM admin_finances
        WHERE tenant_id='${tenantId}' AND status='active' ${typeFilter}
          AND ${dateCol} BETWEEN '${debut}' AND '${fin}'
      `),
    ])

    return res.json({
      transactions: rows.map(r => ({
        ...r,
        amount:    Number(r.amount || 0),
        costPrice: r.cost_price ? Number(r.cost_price) : null,
        sellPrice: r.sell_price ? Number(r.sell_price) : null,
        profit:    r.profit ? Number(r.profit) : null,
        dueDate:   r.due_date,
        isPaid:    r.is_paid,
        personName: r.person_name,
        personPhone: r.person_phone,
        createdBy: r.created_by,
      })),
      total: Number(countR[0]?.total || 0),
      page: Number(page),
    })
  } catch (err) {
    console.error('[ADMIN-FIN LIST]', err)
    return res.status(500).json({ message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// POST /admin-finances — Kreye nouvo tranzaksyon
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const tenantId = tid(req)
    const userId   = uid(req)
    const {
      type, category, description, amount,
      costPrice, sellPrice, quantity,
      personName, personPhone,
      date, dueDate, notes
    } = req.body

    if (!type)        return res.status(400).json({ message: 'Tip obligatwa.' })
    if (!description) return res.status(400).json({ message: 'Deskripsyon obligatwa.' })
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })

    const validTypes = ['depans', 'depans_prevwa', 'revni', 'acha', 'vant', 'depo_sol', 'peman_sol', 'kapital']
    if (!validTypes.includes(type)) return res.status(400).json({ message: 'Tip pa valid.' })

    // Kalkile benefis pou vant
    let profit = null
    if (type === 'vant' && costPrice) {
      profit = (Number(sellPrice || amount) - Number(costPrice)) * Number(quantity || 1)
    }

    const txDate = date || new Date().toISOString().split('T')[0]

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO admin_finances
        (tenant_id, type, category, description, amount, cost_price, sell_price, profit,
         quantity, person_name, person_phone, date, due_date, notes, created_by)
      VALUES
        ('${tenantId}', '${type}', ${category ? `'${category.replace(/'/g,"''")}'` : 'NULL'},
         '${description.replace(/'/g,"''")}', ${Number(amount)},
         ${costPrice ? Number(costPrice) : 'NULL'},
         ${sellPrice ? Number(sellPrice) : 'NULL'},
         ${profit !== null ? profit : 'NULL'},
         ${Number(quantity || 1)},
         ${personName ? `'${personName.replace(/'/g,"''")}'` : 'NULL'},
         ${personPhone ? `'${personPhone.replace(/'/g,"''")}'` : 'NULL'},
         '${txDate}',
         ${dueDate ? `'${dueDate}'` : 'NULL'},
         ${notes ? `'${notes.replace(/'/g,"''")}'` : 'NULL'},
         ${userId ? `'${userId}'` : 'NULL'})
      RETURNING *
    `)

    return res.status(201).json({ transaction: result[0], message: 'Anrejistre!' })
  } catch (err) {
    console.error('[ADMIN-FIN POST]', err)
    return res.status(500).json({ message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// PATCH /admin-finances/:id — Modifye (mak depans_prevwa peye)
// ═══════════════════════════════════════════════════════════════
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { id } = req.params
    const { isPaid, amount, description, category, notes, status } = req.body

    const sets = []
    if (isPaid !== undefined)     sets.push(`is_paid = ${isPaid}`)
    if (amount !== undefined)     sets.push(`amount = ${Number(amount)}`)
    if (description !== undefined)sets.push(`description = '${description.replace(/'/g,"''")}'`)
    if (category !== undefined)   sets.push(`category = '${category.replace(/'/g,"''")}'`)
    if (notes !== undefined)      sets.push(`notes = '${notes.replace(/'/g,"''")}'`)
    if (status !== undefined)     sets.push(`status = '${status}'`)
    sets.push(`updated_at = NOW()`)

    if (sets.length === 1) return res.status(400).json({ message: 'Anyen pou modifye.' })

    await prisma.$queryRawUnsafe(`
      UPDATE admin_finances SET ${sets.join(', ')}
      WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'
    `)

    return res.json({ message: 'Modifye!' })
  } catch (err) {
    console.error('[ADMIN-FIN PATCH]', err)
    return res.status(500).json({ message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// DELETE /admin-finances/:id — Efase
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    await prisma.$queryRawUnsafe(`
      UPDATE admin_finances SET status = 'cancelled', updated_at = NOW()
      WHERE id = '${req.params.id}'::uuid AND tenant_id = '${tenantId}'
    `)
    return res.json({ message: 'Efase!' })
  } catch (err) {
    console.error('[ADMIN-FIN DELETE]', err)
    return res.status(500).json({ message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// GET /admin-finances/grafik/7jou — Grafik 7 dènye jou
// ═══════════════════════════════════════════════════════════════
router.get('/grafik/7jou', async (req, res) => {
  try {
    const tenantId = tid(req)
    const [depans, revni] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT date, COALESCE(SUM(amount),0) as total
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='depans' AND status='active'
          AND date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY date ORDER BY date
      `),
      prisma.$queryRawUnsafe(`
        SELECT date, COALESCE(SUM(amount),0) as total
        FROM admin_finances
        WHERE tenant_id='${tenantId}' AND type='revni' AND status='active'
          AND date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY date ORDER BY date
      `),
    ])
    return res.json({
      depans: depans.map(r => ({ date: r.date, total: Number(r.total) })),
      revni:  revni.map(r => ({ date: r.date, total: Number(r.total) })),
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

module.exports = router
