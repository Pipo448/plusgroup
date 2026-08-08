// src/routes/pg-expenses.routes.js
'use strict'
const express = require('express')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../config/prisma')
router.use(identifyTenant, authenticate)
const tid = (req) => req.tenant.id

const CATEGORIES = ['Loye','Elektrisite','Dlo','Salè','Founisè','Transpò','Manje','Ekipman','Maketing','Lòt']

// ── GET /pg-expenses ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { categorie, debutDate, finDate, page = 1, limit = 20 } = req.query
    const tenantId = tid(req)
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE tenant_id = $1`
    const params = [tenantId]
    let idx = 2

    if (categorie)  { where += ` AND categorie = $${idx++}`;  params.push(categorie) }
    if (debutDate)  { where += ` AND date_depans >= $${idx++}`; params.push(new Date(debutDate)) }
    if (finDate)    { where += ` AND date_depans <= $${idx++}`; params.push(new Date(finDate)) }

    const [rows, countRow, totalRow] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM pg_expenses ${where} ORDER BY date_depans DESC, created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM pg_expenses ${where}`, ...params),
      prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(montant),0) as total_montant FROM pg_expenses ${where}`, ...params),
    ])
    res.json({
      expenses: rows,
      total: Number(countRow[0]?.total || 0),
      totalMontant: Number(totalRow[0]?.total_montant || 0),
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── GET /pg-expenses/stats ───────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const tenantId = tid(req)
    const now = new Date()
    const debutMwa = new Date(now.getFullYear(), now.getMonth(), 1)
    const finMwa   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [totalMwa, parCategorie] = await Promise.all([
      prisma.$queryRaw`
        SELECT COALESCE(SUM(montant),0) as total FROM pg_expenses
        WHERE tenant_id=${tenantId} AND date_depans BETWEEN ${debutMwa} AND ${finMwa}
      `,
      prisma.$queryRaw`
        SELECT categorie, COALESCE(SUM(montant),0) as total, COUNT(*) as count
        FROM pg_expenses WHERE tenant_id=${tenantId} AND date_depans BETWEEN ${debutMwa} AND ${finMwa}
        GROUP BY categorie ORDER BY total DESC
      `,
    ])
    res.json({
      totalMwa: Number(totalMwa[0]?.total || 0),
      // ✅ KORIJE — COUNT(*) PostgreSQL retounen BigInt, ki fè
      // "Do not know how to serialize a BigInt" lè JSON.stringify eseye l.
      // Konvèti chak `total`/`count` an Number nòmal anvan voye repons lan.
      parCategorie: parCategorie.map(row => ({
        ...row,
        total: Number(row.total || 0),
        count: Number(row.count || 0),
      })),
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── POST /pg-expenses ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { titre, montant, categorie, dateDepans, notes } = req.body
    if (!titre)   return res.status(400).json({ message: 'Titre obligatwa.' })
    if (!montant) return res.status(400).json({ message: 'Montant obligatwa.' })
    const rows = await prisma.$queryRaw`
      INSERT INTO pg_expenses (tenant_id,titre,montant,categorie,date_depans,notes,created_by)
      VALUES (${tid(req)},${titre},${Number(montant)},${categorie||'Lòt'},
              ${dateDepans?new Date(dateDepans):new Date()},${notes||null},${req.user?.id||null})
      RETURNING *
    `
    res.status(201).json({ expense: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── PUT /pg-expenses/:id ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { titre, montant, categorie, dateDepans, notes } = req.body
    const rows = await prisma.$queryRaw`
      UPDATE pg_expenses SET
        titre=COALESCE(${titre||null},titre),
        montant=COALESCE(${montant?Number(montant):null},montant),
        categorie=COALESCE(${categorie||null},categorie),
        date_depans=COALESCE(${dateDepans?new Date(dateDepans):null},date_depans),
        notes=COALESCE(${notes||null},notes)
      WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ message: 'Depans pa jwenn.' })
    res.json({ expense: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── DELETE /pg-expenses/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.$queryRaw`DELETE FROM pg_expenses WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)}`
    res.json({ success: true })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router