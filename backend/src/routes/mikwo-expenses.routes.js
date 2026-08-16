// backend/src/routes/mikwo-expenses.routes.js
'use strict'
const express = require('express')
const { Prisma } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../config/prisma')
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id
const isAdmin = (req) => req.user?.role === 'admin'

const CATEGORIES = ['Loye','Elektrisite','Dlo','Salè','Founisè','Transpò','Ekipman','Maketing','Lòt']
const isValidDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// GET /mikwo-expenses
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=20, categorie, debutDate, finDate } = req.query
    const offset = (Number(page)-1)*Number(limit)
    const limitNum = Number(limit)
    const tenantId = tid(req)

    // ✅ Kondisyon yo bati ak Prisma.sql — chak valè PARAMETRIZE (pa konkatene)
    const conditions = [Prisma.sql`tenant_id = ${tenantId}`]
    if (categorie && CATEGORIES.includes(categorie)) conditions.push(Prisma.sql`categorie = ${categorie}`)
    if (isValidDate(debutDate)) conditions.push(Prisma.sql`date_depans >= ${debutDate}::date`)
    if (isValidDate(finDate))   conditions.push(Prisma.sql`date_depans <= ${finDate}::date`)
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

    const [rows, countRow, totalRow] = await Promise.all([
      prisma.$queryRaw`SELECT * FROM mikwo_expenses ${whereClause} ORDER BY date_depans DESC, created_at DESC LIMIT ${limitNum} OFFSET ${offset}`,
      prisma.$queryRaw`SELECT COUNT(*) as total FROM mikwo_expenses ${whereClause}`,
      prisma.$queryRaw`SELECT COALESCE(SUM(montant),0) as total_montant FROM mikwo_expenses ${whereClause}`,
    ])
    res.json({ expenses: rows, total: Number(countRow[0]?.total||0), totalMontant: Number(totalRow[0]?.total_montant||0) })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

// POST /mikwo-expenses
router.post('/', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    const { titre, montant, categorie, dateDepans, notes } = req.body
    if (!titre)   return res.status(400).json({ message: 'Titre obligatwa.' })
    if (!montant || Number(montant) <= 0) return res.status(400).json({ message: 'Montan dwe > 0.' })

    const tenantId  = tid(req)
    const cat       = CATEGORIES.includes(categorie) ? categorie : 'Lòt'
    const dateVal   = isValidDate(dateDepans) ? dateDepans : new Date().toISOString().split('T')[0]

    const rows = await prisma.$queryRaw`
      INSERT INTO mikwo_expenses (tenant_id, titre, montant, categorie, date_depans, notes, created_by)
      VALUES (${tenantId}, ${String(titre)}, ${Number(montant)}, ${cat}, ${dateVal}::date, ${notes || null}, ${req.user?.id || null})
      RETURNING *
    `
    res.status(201).json({ expense: rows[0] })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

// PUT /mikwo-expenses/:id
router.put('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    const { titre, montant, categorie, dateDepans, notes } = req.body

    const titreVal      = titre !== undefined && titre !== '' ? String(titre) : null
    const montantVal    = montant !== undefined && montant !== '' ? Number(montant) : null
    const categorieVal  = categorie && CATEGORIES.includes(categorie) ? categorie : null
    const dateVal       = isValidDate(dateDepans) ? dateDepans : null
    const notesVal      = notes !== undefined ? notes : null

    const rows = await prisma.$queryRaw`
      UPDATE mikwo_expenses SET
        titre       = COALESCE(${titreVal}, titre),
        montant     = COALESCE(${montantVal}, montant),
        categorie   = COALESCE(${categorieVal}, categorie),
        date_depans = COALESCE(${dateVal}::date, date_depans),
        notes       = COALESCE(${notesVal}, notes)
      WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ message: 'Depans pa jwenn.' })
    res.json({ expense: rows[0] })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

// DELETE /mikwo-expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    await prisma.$executeRaw`DELETE FROM mikwo_expenses WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`
    res.json({ success: true })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
