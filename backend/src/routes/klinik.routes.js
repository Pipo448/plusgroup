// ═══════════════════════════════════════════════════════════════
// KLINIK SERVICES — Ajoute nan klinik.routes.js
// Mete seksyon sa ANVAN: module.exports = router
// ═══════════════════════════════════════════════════════════════

// ── GET /klinik/services ─────────────────────────────────────
router.get('/services', async (req, res) => {
  try {
    const tenantId   = tid(req)
    const { serviceType, search, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE ks.tenant_id = $1`
    const params = [tenantId]
    let idx = 2

    if (serviceType) {
      where += ` AND ks.service_type = $${idx++}`
      params.push(serviceType)
    }

    if (search) {
      where += ` AND (kp.prenom ILIKE $${idx} OR kp.nom ILIKE $${idx})`
      params.push(`%${search}%`)
      idx++
    }

    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT
          ks.*,
          json_build_object('id',kp.id,'prenom',kp.prenom,'nom',kp.nom,'numeroDossier',kp.numero_dossier) AS patient
        FROM klinik_services ks
        LEFT JOIN klinik_patients kp ON kp.id = ks.patient_id
        ${where}
        ORDER BY ks.created_at DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `, ...params),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM klinik_services ks
        LEFT JOIN klinik_patients kp ON kp.id = ks.patient_id
        ${where}
      `, ...params),
    ])

    res.json({
      services: rows,
      total:    Number(countRow[0]?.total || 0),
      page:     Number(page),
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── POST /klinik/services ─────────────────────────────────────
router.post('/services', async (req, res) => {
  try {
    const tenantId = tid(req)
    const userId   = req.user?.id || null
    const {
      patientId, serviceType, priceHtg = 0,
      status = 'peye', notes, performedBy,
    } = req.body

    if (!patientId)   return res.status(400).json({ message: 'patientId obligatwa.' })
    if (!serviceType) return res.status(400).json({ message: 'serviceType obligatwa.' })

    const [row] = await prisma.$queryRaw`
      INSERT INTO klinik_services
        (tenant_id, patient_id, service_type, price_htg, status, notes, performed_by, created_by)
      VALUES
        (${tenantId}, ${patientId}, ${serviceType}, ${Number(priceHtg)},
         ${status}, ${notes || null}, ${performedBy || null}, ${userId})
      RETURNING *
    `
    res.status(201).json({ service: row })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── PATCH /klinik/services/:id ───────────────────────────────
router.patch('/services/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { id }   = req.params
    const { status, notes, priceHtg, performedBy } = req.body

    const [row] = await prisma.$queryRaw`
      UPDATE klinik_services
      SET
        status       = COALESCE(${status       || null}, status),
        notes        = COALESCE(${notes        || null}, notes),
        price_htg    = COALESCE(${priceHtg !== undefined ? Number(priceHtg) : null}, price_htg),
        performed_by = COALESCE(${performedBy  || null}, performed_by)
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
      RETURNING *
    `
    if (!row) return res.status(404).json({ message: 'Sèvis pa jwenn.' })
    res.json({ service: row })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// ── DELETE /klinik/services/:id ──────────────────────────────
router.delete('/services/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { id }   = req.params
    await prisma.$queryRaw`
      DELETE FROM klinik_services
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
    `
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})