// backend/src/routes/admin-finances.routes.js
// Jesyon Finansye — menm pattern ak mikwo-expenses
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma  = new PrismaClient()
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id
const isAdmin = (req) => req.user?.role === 'admin'

// GET /admin-finances/summary
router.get('/summary', async (req, res) => {
  try {
    const tenantId = tid(req)
    const today = new Date()
    const debut = req.query.debutDate || `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`
    const fin   = req.query.finDate   || today.toISOString().split('T')[0]

    const [depansR, depansPrevwaR, revniR, achaR, vantR, depoSolR, pemanSolR, depansJodiR, revniJodiR, depansParKatR, dernye10R] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='depans' AND status='active' AND date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count, COALESCE(SUM(CASE WHEN is_paid=true THEN amount ELSE 0 END),0) as paid FROM admin_finances WHERE tenant_id='${tenantId}' AND type='depans_prevwa' AND status='active' AND due_date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='revni' AND status='active' AND date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='acha' AND status='active' AND date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COALESCE(SUM(profit),0) as profit, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='vant' AND status='active' AND date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='depo_sol' AND status='active' AND date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='peman_sol' AND status='active' AND date BETWEEN '${debut}' AND '${fin}'`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total FROM admin_finances WHERE tenant_id='${tenantId}' AND type='depans' AND status='active' AND date = CURRENT_DATE`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(amount),0) as total FROM admin_finances WHERE tenant_id='${tenantId}' AND type='revni' AND status='active' AND date = CURRENT_DATE`),
      prisma.$queryRawUnsafe(`SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM admin_finances WHERE tenant_id='${tenantId}' AND type='depans' AND status='active' AND date BETWEEN '${debut}' AND '${fin}' GROUP BY category ORDER BY total DESC`),
      prisma.$queryRawUnsafe(`SELECT id, type, category, description, amount, profit, person_name, date, created_at FROM admin_finances WHERE tenant_id='${tenantId}' AND status='active' ORDER BY created_at DESC LIMIT 10`),
    ])

    const totalDepans     = Number(depansR[0]?.total || 0)
    const totalRevni      = Number(revniR[0]?.total || 0)
    const totalAcha       = Number(achaR[0]?.total || 0)
    const totalVant       = Number(vantR[0]?.total || 0)
    const totalProfitVant = Number(vantR[0]?.profit || 0)
    const totalDepoSol    = Number(depoSolR[0]?.total || 0)
    const totalPemanSol   = Number(pemanSolR[0]?.total || 0)
    const vreBenefis      = totalRevni + totalProfitVant - totalDepans

    res.json({
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
      vreBenefis,
      depansParKat: depansParKatR.map(r => ({ category: r.category || 'Lot', total: Number(r.total), count: Number(r.count) })),
      dernye10:     dernye10R.map(r => ({ ...r, amount: Number(r.amount), profit: r.profit ? Number(r.profit) : null })),
    })
  } catch (e) {
    console.error('[ADMIN-FIN SUMMARY]', e)
    res.status(500).json({ message: e.message })
  }
})

// GET /admin-finances
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

    let where = `WHERE tenant_id = '${tenantId}' AND status = 'active'`
    if (type) where += ` AND type = '${type}'`
    where += ` AND ${dateCol} BETWEEN '${debut}' AND '${fin}'`

    const [rows, countR] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM admin_finances ${where} ORDER BY ${dateCol} DESC, created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM admin_finances ${where}`),
    ])

    res.json({
      transactions: rows.map(r => ({
        ...r,
        amount:     Number(r.amount || 0),
        costPrice:  r.cost_price ? Number(r.cost_price) : null,
        sellPrice:  r.sell_price ? Number(r.sell_price) : null,
        profit:     r.profit ? Number(r.profit) : null,
        dueDate:    r.due_date,
        isPaid:     r.is_paid,
        personName: r.person_name,
        personPhone:r.person_phone,
      })),
      total: Number(countR[0]?.total || 0),
      page: Number(page),
    })
  } catch (e) {
    console.error('[ADMIN-FIN LIST]', e)
    res.status(500).json({ message: e.message })
  }
})

// POST /admin-finances — menm pattern ak mikwo-expenses
router.post('/', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })

    const { type, category, description, amount,
            costPrice, sellPrice, quantity,
            personName, personPhone,
            date, dueDate, notes } = req.body

    if (!type)        return res.status(400).json({ message: 'Tip obligatwa.' })
    if (!description) return res.status(400).json({ message: 'Deskripsyon obligatwa.' })
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })

    const tenantId = tid(req)
    const txDate   = date || new Date().toISOString().split('T')[0]

    let profitVal = 'NULL'
    if (type === 'vant' && costPrice) {
      profitVal = (Number(sellPrice || amount) - Number(costPrice)) * Number(quantity || 1)
    }

    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO admin_finances
        (tenant_id, type, category, description, amount, cost_price, sell_price, profit,
         quantity, person_name, person_phone, date, due_date, notes, created_by)
       VALUES ('${tenantId}', '${type}', ${category ? `'${category}'` : 'NULL'},
               '${(description||'').replace(/'/g, "''")}', ${Number(amount)},
               ${costPrice ? Number(costPrice) : 'NULL'},
               ${sellPrice ? Number(sellPrice) : 'NULL'},
               ${profitVal},
               ${Number(quantity || 1)},
               ${personName ? `'${(personName||'').replace(/'/g, "''")}'` : 'NULL'},
               ${personPhone ? `'${personPhone}'` : 'NULL'},
               '${txDate}',
               ${dueDate ? `'${dueDate}'` : 'NULL'},
               ${notes ? `'${(notes||'').replace(/'/g, "''")}'` : 'NULL'},
               '${req.user?.id || ''}')
       RETURNING *`
    )
    res.status(201).json({ transaction: rows[0], message: 'Anrejistre!' })
  } catch (e) {
    console.error('[ADMIN-FIN POST]', e)
    res.status(500).json({ message: e.message })
  }
})

// PATCH /admin-finances/:id
router.patch('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    const { isPaid, amount, description, category, notes, status } = req.body

    const sets = []
    if (isPaid !== undefined)      sets.push(`is_paid = ${isPaid}`)
    if (amount !== undefined)      sets.push(`amount = ${Number(amount)}`)
    if (description !== undefined) sets.push(`description = '${(description||'').replace(/'/g, "''")}'`)
    if (category !== undefined)    sets.push(`category = '${category}'`)
    if (notes !== undefined)       sets.push(`notes = '${(notes||'').replace(/'/g, "''")}'`)
    if (status !== undefined)      sets.push(`status = '${status}'`)
    sets.push(`updated_at = NOW()`)

    const rows = await prisma.$queryRawUnsafe(
      `UPDATE admin_finances SET ${sets.join(', ')} WHERE id = '${req.params.id}'::uuid AND tenant_id = '${tid(req)}' RETURNING *`
    )
    if (!rows[0]) return res.status(404).json({ message: 'Pa jwenn.' })
    res.json({ transaction: rows[0], message: 'Modifye!' })
  } catch (e) {
    console.error('[ADMIN-FIN PATCH]', e)
    res.status(500).json({ message: e.message })
  }
})

// DELETE /admin-finances/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    await prisma.$queryRawUnsafe(`UPDATE admin_finances SET status='cancelled', updated_at=NOW() WHERE id='${req.params.id}'::uuid AND tenant_id='${tid(req)}'`)
    res.json({ success: true, message: 'Efase!' })
  } catch (e) {
    console.error('[ADMIN-FIN DELETE]', e)
    res.status(500).json({ message: e.message })
  }
})

module.exports = router