// src/routes/pg-employees.routes.js
'use strict'
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()
router.use(identifyTenant, authenticate)
const tid = (req) => req.tenant.id

// ── GET /pg-employees ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, statut, page = 1, limit = 50 } = req.query
    const tenantId = tid(req)
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE tenant_id = $1`
    const params = [tenantId]
    let idx = 2

    if (statut) { where += ` AND statut = $${idx++}`; params.push(statut) }
    if (search) {
      where += ` AND (nom ILIKE $${idx} OR prenom ILIKE $${idx} OR titre ILIKE $${idx})`
      params.push(`%${search}%`); idx++
    }

    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM pg_employees ${where} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM pg_employees ${where}`, ...params),
    ])
    res.json({ employees: rows, total: Number(countRow[0]?.total || 0) })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── POST /pg-employees ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nom, prenom, titre, telephone, email, salaire, dateEmbauche, statut, notes } = req.body
    if (!nom || !titre) return res.status(400).json({ message: 'Nom ak titre obligatwa.' })
    const rows = await prisma.$queryRaw`
      INSERT INTO pg_employees (tenant_id,nom,prenom,titre,telephone,email,salaire,date_embauche,statut,notes)
      VALUES (${tid(req)},${nom},${prenom||null},${titre},${telephone||null},${email||null},
              ${salaire?Number(salaire):null},${dateEmbauche?new Date(dateEmbauche):null},
              ${statut||'actif'},${notes||null})
      RETURNING *
    `
    res.status(201).json({ employee: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── PUT /pg-employees/:id ────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { nom, prenom, titre, telephone, email, salaire, dateEmbauche, statut, notes } = req.body
    const rows = await prisma.$queryRaw`
      UPDATE pg_employees SET
        nom=COALESCE(${nom||null},nom), prenom=COALESCE(${prenom||null},prenom),
        titre=COALESCE(${titre||null},titre), telephone=COALESCE(${telephone||null},telephone),
        email=COALESCE(${email||null},email),
        salaire=COALESCE(${salaire!==undefined?Number(salaire):null},salaire),
        date_embauche=COALESCE(${dateEmbauche?new Date(dateEmbauche):null},date_embauche),
        statut=COALESCE(${statut||null},statut), notes=COALESCE(${notes||null},notes),
        updated_at=NOW()
      WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ message: 'Anplwaye pa jwenn.' })
    res.json({ employee: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ── DELETE /pg-employees/:id ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.$queryRaw`DELETE FROM pg_employees WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)}`
    res.json({ success: true })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
