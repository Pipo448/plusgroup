// backend/src/routes/mikwo-expenses.routes.js
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma  = new PrismaClient()
router.use(identifyTenant, authenticate)

const tid = (req) => req.tenant.id
const isAdmin = (req) => req.user?.role === 'admin'

const CATEGORIES = ['Loye','Elektrisite','Dlo','Salè','Founisè','Transpò','Ekipman','Maketing','Lòt']

// GET /mikwo-expenses
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=20, categorie, debutDate, finDate } = req.query
    const offset = (Number(page)-1)*Number(limit)
    const tenantId = tid(req)

    let where = `WHERE tenant_id = '${tenantId}'`
    if (categorie)  where += ` AND categorie = '${categorie}'`
    if (debutDate)  where += ` AND date_depans >= '${debutDate}'`
    if (finDate)    where += ` AND date_depans <= '${finDate}'`

    const [rows, countRow, totalRow] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM mikwo_expenses ${where} ORDER BY date_depans DESC, created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM mikwo_expenses ${where}`),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(montant),0) as total_montant FROM mikwo_expenses ${where}`),
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
    if (!montant) return res.status(400).json({ message: 'Montan obligatwa.' })
    const tenantId = tid(req)
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO mikwo_expenses (tenant_id, titre, montant, categorie, date_depans, notes, created_by)
       VALUES ('${tenantId}', '${titre}', ${Number(montant)}, '${categorie||'Lòt'}',
               '${dateDepans || new Date().toISOString().split('T')[0]}',
               ${notes ? `'${notes}'` : 'NULL'}, '${req.user?.id||''}')
       RETURNING *`
    )
    res.status(201).json({ expense: rows[0] })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

// PUT /mikwo-expenses/:id
router.put('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    const { titre, montant, categorie, dateDepans, notes } = req.body
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE mikwo_expenses SET
        titre = COALESCE(${titre?`'${titre}'`:'NULL'}, titre),
        montant = COALESCE(${montant?Number(montant):'NULL'}, montant),
        categorie = COALESCE(${categorie?`'${categorie}'`:'NULL'}, categorie),
        date_depans = COALESCE(${dateDepans?`'${dateDepans}'`:'NULL'}, date_depans),
        notes = COALESCE(${notes?`'${notes}'`:'NULL'}, notes)
       WHERE id = '${req.params.id}' AND tenant_id = '${tid(req)}'
       RETURNING *`
    )
    if (!rows[0]) return res.status(404).json({ message: 'Depans pa jwenn.' })
    res.json({ expense: rows[0] })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

// DELETE /mikwo-expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Admin sèlman.' })
    await prisma.$queryRawUnsafe(`DELETE FROM mikwo_expenses WHERE id = '${req.params.id}' AND tenant_id = '${tid(req)}'`)
    res.json({ success: true })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
