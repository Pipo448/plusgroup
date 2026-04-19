// src/routes/klinik.routes.js
// ─── Plus Klinik — Tout Routes Backend ───────────────────────
'use strict'

const express  = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')
const { extractBranch }               = require('../middleware/branch')

const router = express.Router()
const prisma  = new PrismaClient()

router.use(identifyTenant, authenticate, extractBranch)

// ─── Helper ───────────────────────────────────────────────────
const tid = (req) => req.tenant.id

async function genNumeroDossier(tenantId) {
  const ane   = new Date().getFullYear()
  const count = await prisma.klinikPatient.count({ where: { tenantId } })
  return `DOS-${ane}-${String(count + 1).padStart(5, '0')}`
}

// ═══════════════════════════════════════════════════════════════
// STATS DASHBOARD
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const tenantId  = tid(req)
    const jodi      = new Date(); jodi.setHours(0, 0, 0, 0)
    const demenJodi = new Date(jodi); demenJodi.setDate(demenJodi.getDate() + 1)
    const debutMwa  = new Date(jodi.getFullYear(), jodi.getMonth(), 1)

    const [
      totalPasyan, nouvoMwa, rdvJodi, rdvAtant,
      konsultMwa, hospActif, labAtant,
    ] = await Promise.all([
      prisma.klinikPatient.count({ where: { tenantId, isActive: true } }),
      prisma.klinikPatient.count({ where: { tenantId, createdAt: { gte: debutMwa } } }),
      prisma.klinikAppointment.count({ where: { tenantId, dateHeure: { gte: jodi, lt: demenJodi } } }),
      prisma.klinikAppointment.count({ where: { tenantId, statut: 'en_attente', dateHeure: { gte: jodi } } }),
      prisma.klinikConsultation.count({ where: { tenantId, date: { gte: debutMwa } } }),
      prisma.klinikHospitalization.count({ where: { tenantId, statut: { in: ['admis', 'en_soin'] } } }),
      prisma.klinikLabOrder.count({ where: { tenantId, statut: { in: ['en_attente', 'en_cours'] } } }),
    ])

    res.json({ stats: { totalPasyan, nouvoMwa, rdvJodi, rdvAtant, konsultMwa, hospActif, labAtant } })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// PASYAN
// ═══════════════════════════════════════════════════════════════
router.get('/patients', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, isActive } = req.query
    const tenantId = tid(req)
    const skip     = (Number(page) - 1) * Number(limit)
    const where    = { tenantId }

    if (search) {
      where.OR = [
        { nom:           { contains: search, mode: 'insensitive' } },
        { prenom:        { contains: search, mode: 'insensitive' } },
        { numeroDossier: { contains: search, mode: 'insensitive' } },
        { telephone:     { contains: search, mode: 'insensitive' } },
      ]
    }
    if (isActive !== undefined) where.isActive = isActive === 'true'

    const [patients, total] = await Promise.all([
      prisma.klinikPatient.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              consultations:    true,
              appointments:     true,
              hospitalizations: true,
            },
          },
        },
      }),
      prisma.klinikPatient.count({ where }),
    ])

    res.json({ patients, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await prisma.klinikPatient.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
      include: {
        appointments:    { orderBy: { dateHeure: 'desc' }, take: 10 },
        consultations:   {
          orderBy: { date: 'desc' }, take: 10,
          include: { prescriptions: { include: { items: true } } },
        },
        prescriptions:    { orderBy: { date: 'desc' }, take: 5, include: { items: true } },
        labOrders:        { orderBy: { dateCommande: 'desc' }, take: 5, include: { items: true } },
        hospitalizations: { orderBy: { dateAdmission: 'desc' }, take: 5 },
      },
    })
    if (!patient) return res.status(404).json({ message: 'Pasyan pa jwenn.' })
    res.json({ patient })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/patients', async (req, res) => {
  try {
    const tenantId      = tid(req)
    const numeroDossier = await genNumeroDossier(tenantId)
    const {
      prenom, nom, dateNesans, sexe, telephone,
      adresse, groupeSangin, email, notes,
    } = req.body

    const rows = await prisma.$queryRawUnsafe(`
      INSERT INTO klinik_patients
        (tenant_id, numero_dossier, prenom, nom, date_naissance, sexe,
         telephone, adresse, groupe_sanguin, email, notes, is_active)
      VALUES ($1,$2,$3,$4,$5,
        $6::"Sexe",
        $7,$8,
        $9::"GroupeSanguin",
        $10,$11,true)
      RETURNING *
    `,
      tenantId,
      numeroDossier,
      prenom       || null,
      nom          || null,
      dateNesans   ? new Date(dateNesans) : null,
      sexe         || null,
      telephone    || null,
      adresse      || null,
      groupeSangin || null,
      email        || null,
      notes        || null,
    )
    res.status(201).json({ patient: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/patients/:id', async (req, res) => {
  try {
    const {
      prenom, nom, dateNesans, sexe, telephone,
      adresse, groupeSangin, email, notes,
    } = req.body

    const rows = await prisma.$queryRawUnsafe(`
      UPDATE klinik_patients SET
        prenom         = COALESCE($1, prenom),
        nom            = COALESCE($2, nom),
        date_naissance = COALESCE($3, date_naissance),
        sexe           = COALESCE($4::"Sexe", sexe),
        telephone      = COALESCE($5, telephone),
        adresse        = COALESCE($6, adresse),
        groupe_sanguin = COALESCE($7::"GroupeSanguin", groupe_sanguin),
        email          = COALESCE($8, email),
        notes          = COALESCE($9, notes),
        updated_at     = NOW()
      WHERE id = $10 AND tenant_id = $11
      RETURNING *
    `,
      prenom       || null,
      nom          || null,
      dateNesans   ? new Date(dateNesans) : null,
      sexe         || null,
      telephone    || null,
      adresse      || null,
      groupeSangin || null,
      email        || null,
      notes        || null,
      req.params.id,
      tid(req),
    )
    if (!rows[0]) return res.status(404).json({ message: 'Pasyan pa jwenn.' })
    res.json({ patient: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// RANDEVOU
// ═══════════════════════════════════════════════════════════════
router.get('/appointments', async (req, res) => {
  try {
    const { date, statut, patientId, page = 1, limit = 50 } = req.query
    const tenantId = tid(req)
    const where    = { tenantId }

    if (date) {
      const d    = new Date(date); d.setHours(0, 0, 0, 0)
      const next = new Date(d);    next.setDate(next.getDate() + 1)
      where.dateHeure = { gte: d, lt: next }
    }
    if (statut)    where.statut    = statut
    if (patientId) where.patientId = patientId

    const [appointments, total] = await Promise.all([
      prisma.klinikAppointment.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { dateHeure: 'asc' },
        include: {
          patient: { select: { nom: true, prenom: true, telephone: true, numeroDossier: true } },
        },
      }),
      prisma.klinikAppointment.count({ where }),
    ])

    res.json({ appointments, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/appointments', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, patient, consultation, ...data } = req.body
    // ✅ Konvèti dateHeure an objè Date — Prisma bezwen timezone
    if (data.dateHeure) {
      data.dateHeure = new Date(data.dateHeure)
    }
    const appointment = await prisma.klinikAppointment.create({
      data:    { ...data, tenantId: tid(req), createdBy: req.user.id },
      include: { patient: { select: { nom: true, prenom: true, telephone: true } } },
    })
    res.status(201).json({ appointment })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/appointments/:id', async (req, res) => {
  try {
    const { id, tenantId, createdAt, updatedAt, patient, consultation, ...data } = req.body
    // ✅ Konvèti dateHeure an objè Date
    if (data.dateHeure) {
      data.dateHeure = new Date(data.dateHeure)
    }
    const appointment = await prisma.klinikAppointment.update({
      where:   { id: req.params.id },
      data,
      include: { patient: { select: { nom: true, prenom: true } } },
    })
    res.json({ appointment })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.patch('/appointments/:id/statut', async (req, res) => {
  try {
    const { statut } = req.body
    const appointment = await prisma.klinikAppointment.update({
      where:   { id: req.params.id },
      data:    { statut },
      include: { patient: { select: { nom: true, prenom: true } } },
    })
    res.json({ appointment })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.delete('/appointments/:id', async (req, res) => {
  try {
    await prisma.klinikAppointment.delete({ where: { id: req.params.id } })
    res.json({ message: 'Randevou efase.' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// KONSILTASYON
// ═══════════════════════════════════════════════════════════════
router.get('/consultations', async (req, res) => {
  try {
    const { patientId, page = 1, limit = 20 } = req.query
    const tenantId = tid(req)
    const where    = { tenantId }
    if (patientId) where.patientId = patientId

    const [consultations, total] = await Promise.all([
      prisma.klinikConsultation.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { date: 'desc' },
        include: {
          patient:       { select: { nom: true, prenom: true, numeroDossier: true } },
          prescriptions: { include: { items: true } },
          labOrders:     { include: { items: true } },
        },
      }),
      prisma.klinikConsultation.count({ where }),
    ])
    res.json({ consultations, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/consultations/:id', async (req, res) => {
  try {
    const consultation = await prisma.klinikConsultation.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
      include: {
        patient:       true,
        appointment:   true,
        prescriptions: { include: { items: true } },
        labOrders:     { include: { items: true } },
      },
    })
    if (!consultation) return res.status(404).json({ message: 'Konsiltasyon pa jwenn.' })
    res.json({ consultation })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/consultations', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, patient, prescriptions,
            labOrders, appointment, ...data } = req.body

    if (data.appointmentId) {
      await prisma.klinikAppointment.update({
        where: { id: data.appointmentId },
        data:  { statut: 'en_cours' },
      })
    }

    const consultation = await prisma.klinikConsultation.create({
      data:    { ...data, tenantId: tid(req), createdBy: req.user.id },
      include: { patient: { select: { nom: true, prenom: true } } },
    })
    res.status(201).json({ consultation })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/consultations/:id', async (req, res) => {
  try {
    const { id, tenantId, createdAt, updatedAt,
            patient, prescriptions, labOrders, appointment, ...data } = req.body

    const consultation = await prisma.klinikConsultation.update({
      where: { id: req.params.id },
      data,
      include: {
        patient:       { select: { nom: true, prenom: true } },
        prescriptions: { include: { items: true } },
        labOrders:     { include: { items: true } },
      },
    })

    if (data.statut === 'signe' && consultation.appointmentId) {
      await prisma.klinikAppointment.update({
        where: { id: consultation.appointmentId },
        data:  { statut: 'complete' },
      })
    }

    res.json({ consultation })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// PRESKRIPSYON
// ═══════════════════════════════════════════════════════════════
router.get('/prescriptions', async (req, res) => {
  try {
    const { patientId, statut, page = 1, limit = 20 } = req.query
    const tenantId = tid(req)
    const where    = { tenantId }
    if (patientId) where.patientId = patientId
    if (statut)    where.statut    = statut

    const [prescriptions, total] = await Promise.all([
      prisma.klinikPrescription.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { date: 'desc' },
        include: {
          patient: { select: { nom: true, prenom: true, numeroDossier: true } },
          items:   true,
        },
      }),
      prisma.klinikPrescription.count({ where }),
    ])
    res.json({ prescriptions, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/prescriptions/:id', async (req, res) => {
  try {
    const prescription = await prisma.klinikPrescription.findFirst({
      where:   { id: req.params.id, tenantId: tid(req) },
      include: {
        patient: { select: { nom: true, prenom: true, numeroDossier: true } },
        items:   true,
      },
    })
    if (!prescription) return res.status(404).json({ message: 'Preskripsyon pa jwenn.' })
    res.json({ prescription })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/prescriptions', async (req, res) => {
  try {
    const { items = [], id, createdAt, updatedAt, patient, consultation, ...rest } = req.body
    const prescription = await prisma.klinikPrescription.create({
      data:    { ...rest, tenantId: tid(req), items: { create: items } },
      include: { items: true, patient: { select: { nom: true, prenom: true } } },
    })
    res.status(201).json({ prescription })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/prescriptions/:id', async (req, res) => {
  try {
    const { items = [], id, tenantId, createdAt, updatedAt,
            patient, consultation, ...rest } = req.body

    await prisma.klinikPrescriptionItem.deleteMany({ where: { prescriptionId: req.params.id } })

    const prescription = await prisma.klinikPrescription.update({
      where:   { id: req.params.id },
      data:    { ...rest, items: { create: items } },
      include: { items: true, patient: { select: { nom: true, prenom: true } } },
    })
    res.json({ prescription })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// LABORATWA
// ═══════════════════════════════════════════════════════════════
router.get('/lab-orders', async (req, res) => {
  try {
    const { patientId, statut, page = 1, limit = 20 } = req.query
    const tenantId = tid(req)
    const where    = { tenantId }
    if (patientId) where.patientId = patientId
    if (statut)    where.statut    = statut

    const [labOrders, total] = await Promise.all([
      prisma.klinikLabOrder.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { dateCommande: 'desc' },
        include: {
          patient: { select: { nom: true, prenom: true, numeroDossier: true } },
          items:   true,
        },
      }),
      prisma.klinikLabOrder.count({ where }),
    ])
    res.json({ labOrders, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/lab-orders', async (req, res) => {
  try {
    const { items = [], id, createdAt, updatedAt, patient, consultation, ...rest } = req.body
    const labOrder = await prisma.klinikLabOrder.create({
      data:    { ...rest, tenantId: tid(req), items: { create: items } },
      include: { items: true, patient: { select: { nom: true, prenom: true } } },
    })
    res.status(201).json({ labOrder })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/lab-orders/:id', async (req, res) => {
  try {
    const { items = [], id, tenantId, createdAt, updatedAt,
            patient, consultation, ...rest } = req.body

    await prisma.klinikLabItem.deleteMany({ where: { labOrderId: req.params.id } })

    const labOrder = await prisma.klinikLabOrder.update({
      where:   { id: req.params.id },
      data:    { ...rest, items: { create: items } },
      include: { items: true, patient: { select: { nom: true, prenom: true } } },
    })
    res.json({ labOrder })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.patch('/lab-orders/:orderId/items/:itemId/resultat', async (req, res) => {
  try {
    const { valeur, unite, estAnormal, notesResultat } = req.body

    const item = await prisma.klinikLabItem.update({
      where: { id: req.params.itemId },
      data:  { valeur, unite, estAnormal, notesResultat, dateResultat: new Date() },
    })

    const allItems = await prisma.klinikLabItem.findMany({
      where: { labOrderId: req.params.orderId },
    })
    if (allItems.every(i => i.valeur)) {
      await prisma.klinikLabOrder.update({
        where: { id: req.params.orderId },
        data:  { statut: 'complete' },
      })
    }

    res.json({ item })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// OSPITALIZASYON
// ═══════════════════════════════════════════════════════════════
router.get('/hospitalizations', async (req, res) => {
  try {
    const { statut, patientId, page = 1, limit = 20 } = req.query
    const tenantId = tid(req)
    const where    = { tenantId }
    if (statut)    where.statut    = statut
    if (patientId) where.patientId = patientId

    const [hospitalizations, total] = await Promise.all([
      prisma.klinikHospitalization.findMany({
        where,
        skip:    (Number(page) - 1) * Number(limit),
        take:    Number(limit),
        orderBy: { dateAdmission: 'desc' },
        include: {
          patient: {
            select: {
              nom: true, prenom: true,
              numeroDossier: true, groupeSanguin: true, telephone: true,
            },
          },
        },
      }),
      prisma.klinikHospitalization.count({ where }),
    ])
    res.json({ hospitalizations, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/hospitalizations/:id', async (req, res) => {
  try {
    const hosp = await prisma.klinikHospitalization.findFirst({
      where:   { id: req.params.id, tenantId: tid(req) },
      include: { patient: true },
    })
    if (!hosp) return res.status(404).json({ message: 'Ospitalizasyon pa jwenn.' })
    res.json({ hospitalization: hosp })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/hospitalizations', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, patient, ...data } = req.body
    const hosp = await prisma.klinikHospitalization.create({
      data:    { ...data, tenantId: tid(req) },
      include: { patient: { select: { nom: true, prenom: true } } },
    })
    res.status(201).json({ hospitalization: hosp })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/hospitalizations/:id', async (req, res) => {
  try {
    const { id, tenantId, createdAt, updatedAt, patient, ...data } = req.body
    const hosp = await prisma.klinikHospitalization.update({
      where:   { id: req.params.id },
      data,
      include: { patient: { select: { nom: true, prenom: true } } },
    })
    res.json({ hospitalization: hosp })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.patch('/hospitalizations/:id/decharge', async (req, res) => {
  try {
    const { diagnosticFinal, notes } = req.body
    const hosp = await prisma.klinikHospitalization.update({
      where: { id: req.params.id },
      data:  { statut: 'sorti', dateDecharge: new Date(), diagnosticFinal, notes },
      include: { patient: { select: { nom: true, prenom: true } } },
    })
    res.json({ hospitalization: hosp })
  } catch (e) { res.status(500).json({ message: e.message }) }
})


// ═══════════════════════════════════════════════════════════════
// SÈVIS KLINIK (Sonografi, EKG, Glisémi, Tansyon/Dyabèt...)
// ═══════════════════════════════════════════════════════════════

router.get('/services', async (req, res) => {
  try {
    const tenantId = tid(req)
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
        SELECT ks.*,
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

    res.json({ services: rows, total: Number(countRow[0]?.total || 0), page: Number(page) })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/services', async (req, res) => {
  try {
    const tenantId = tid(req)
    const userId   = req.user?.id || null
    const { patientId, serviceType, priceHtg = 0, status = 'peye', notes, performedBy } = req.body

    if (!patientId)   return res.status(400).json({ message: 'patientId obligatwa.' })
    if (!serviceType) return res.status(400).json({ message: 'serviceType obligatwa.' })

    const rows = await prisma.$queryRaw`
      INSERT INTO klinik_services (tenant_id, patient_id, service_type, price_htg, status, notes, performed_by, created_by)
      VALUES (${tenantId}, ${patientId}, ${serviceType}, ${Number(priceHtg)}, ${status}, ${notes || null}, ${performedBy || null}, ${userId})
      RETURNING *
    `
    res.status(201).json({ service: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.patch('/services/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { id } = req.params
    const { status, notes, priceHtg, performedBy } = req.body

    const rows = await prisma.$queryRaw`
      UPDATE klinik_services SET
        status       = COALESCE(${status || null}, status),
        notes        = COALESCE(${notes  || null}, notes),
        price_htg    = COALESCE(${priceHtg !== undefined ? Number(priceHtg) : null}, price_htg),
        performed_by = COALESCE(${performedBy || null}, performed_by)
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ message: 'Sèvis pa jwenn.' })
    res.json({ service: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.delete('/services/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    await prisma.$queryRaw`
      DELETE FROM klinik_services WHERE id = ${req.params.id}::uuid AND tenant_id = ${tenantId}
    `
    res.json({ success: true })
  } catch (e) { res.status(500).json({ message: e.message }) }
})


// ═══════════════════════════════════════════════════════════════
// ANPLWAYE
// ═══════════════════════════════════════════════════════════════
router.get('/employees', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { search, poste, statut, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE tenant_id = $1`
    const params = [tenantId]
    let idx = 2

    if (poste)  { where += ` AND poste = $${idx++}`;  params.push(poste)  }
    if (statut) { where += ` AND statut = $${idx++}`; params.push(statut) }
    if (search) {
      where += ` AND (nom ILIKE $${idx} OR prenom ILIKE $${idx} OR poste ILIKE $${idx})`
      params.push(`%${search}%`); idx++
    }

    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM klinik_employees ${where} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM klinik_employees ${where}`, ...params),
    ])
    res.json({ employees: rows, total: Number(countRow[0]?.total || 0) })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/employees', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { nom, prenom, poste, telephone, email, adresse, dateEmbauche, salaireBase, statut, notes } = req.body
    const rows = await prisma.$queryRaw`
      INSERT INTO klinik_employees (tenant_id,nom,prenom,poste,telephone,email,adresse,date_embauche,salaire_base,statut,notes)
      VALUES (${tenantId},${nom||null},${prenom||null},${poste||null},${telephone||null},${email||null},${adresse||null},
              ${dateEmbauche ? new Date(dateEmbauche) : null},${Number(salaireBase||0)},${statut||'actif'},${notes||null})
      RETURNING *
    `
    res.status(201).json({ employee: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/employees/:id', async (req, res) => {
  try {
    const { nom, prenom, poste, telephone, email, adresse, dateEmbauche, salaireBase, statut, notes } = req.body
    const rows = await prisma.$queryRaw`
      UPDATE klinik_employees SET
        nom=COALESCE(${nom||null},nom), prenom=COALESCE(${prenom||null},prenom),
        poste=COALESCE(${poste||null},poste), telephone=COALESCE(${telephone||null},telephone),
        email=COALESCE(${email||null},email), adresse=COALESCE(${adresse||null},adresse),
        date_embauche=COALESCE(${dateEmbauche?new Date(dateEmbauche):null},date_embauche),
        salaire_base=COALESCE(${salaireBase!==undefined?Number(salaireBase):null},salaire_base),
        statut=COALESCE(${statut||null},statut), notes=COALESCE(${notes||null},notes),
        updated_at=NOW()
      WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)}
      RETURNING *
    `
    res.json({ employee: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════════
router.get('/payroll', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { mois, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE p.tenant_id = $1`
    const params = [tenantId]
    let idx = 2

    if (mois) { where += ` AND p.mois = $${idx++}`; params.push(mois) }

    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT p.*, e.nom, e.prenom, e.poste
        FROM klinik_payroll p
        LEFT JOIN klinik_employees e ON e.id = p.employee_id
        ${where} ORDER BY p.created_at DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM klinik_payroll p ${where}`, ...params),
    ])
    res.json({ payrolls: rows, total: Number(countRow[0]?.total || 0) })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/payroll', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { employeeId, mois, salaireBase, bonus=0, deduction=0, salaireNet, methode_paiement, datePaiement, notes, statut='paye' } = req.body
    if (!employeeId) return res.status(400).json({ message: 'employeeId obligatwa.' })
    if (!mois)       return res.status(400).json({ message: 'mois obligatwa.' })
    const rows = await prisma.$queryRaw`
      INSERT INTO klinik_payroll (tenant_id,employee_id,mois,salaire_base,bonus,deduction,salaire_net,statut,methode_paiement,date_paiement,notes,created_by)
      VALUES (${tenantId},${employeeId}::uuid,${mois},${Number(salaireBase||0)},${Number(bonus)},${Number(deduction)},
              ${Number(salaireNet||0)},${statut},${methode_paiement||null},${datePaiement?new Date(datePaiement):null},${notes||null},${req.user?.id||null})
      RETURNING *
    `
    res.status(201).json({ payroll: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/famasi', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { search, page = 1, limit = 24, filter } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE p.tenant_id = $1 AND p.is_active = true`
    const params = [tenantId]
    let idx = 2

    if (search) {
      where += ` AND p.name ILIKE $${idx++}`
      params.push(`%${search}%`)
    }
    if (filter === 'low') {
      where += ` AND p.quantity > 0 AND p.quantity <= COALESCE(p.alert_threshold, 10)`
    } else if (filter === 'out') {
      where += ` AND p.quantity <= 0`
    }

    const [products, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT p.*,
          CASE
            WHEN p.cost_price_htg > 0 AND p.price_htg > 0
            THEN ROUND(((p.price_htg - p.cost_price_htg) / p.price_htg) * 100, 1)
            ELSE 0
          END AS benefis_pct,
          CASE
            WHEN p.cost_price_htg > 0
            THEN ROUND(p.price_htg - p.cost_price_htg, 2)
            ELSE 0
          END AS benefis_unit
        FROM products p
        ${where}
        ORDER BY p.name ASC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `, ...params),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM products p ${where}`,
        ...params
      ),
    ])

    // Stats global
    const [statsRow] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(p.price_htg * p.quantity), 0)     AS valeur_stock,
        COALESCE(SUM(p.cost_price_htg * p.quantity), 0) AS cout_stock,
        COUNT(*) FILTER (WHERE p.quantity <= 0)          AS san_estok,
        COUNT(*) FILTER (WHERE p.quantity > 0 AND p.quantity <= COALESCE(p.alert_threshold,10)) AS ba_estok
      FROM products p
      WHERE p.tenant_id = $1 AND p.is_active = true
    `, tenantId)

    res.json({
      products,
      total: Number(countRow[0]?.total || 0),
      stats: {
        valeurStock:  Number(statsRow?.valeur_stock  || 0),
        coutStock:    Number(statsRow?.cout_stock    || 0),
        benefisPotansyel: Number(statsRow?.valeur_stock || 0) - Number(statsRow?.cout_stock || 0),
        sanEstok:     Number(statsRow?.san_estok     || 0),
        baEstok:      Number(statsRow?.ba_estok      || 0),
      }
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// PATCH /klinik/famasi/:id/stock — ajiste estòk (ajoute / retire)
router.patch('/famasi/:id/stock', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { delta, raison } = req.body
    // delta = +N pou ajoute, -N pou retire

    if (delta === undefined || delta === null) {
      return res.status(400).json({ message: 'delta obligatwa (ex: 5 oswa -3).' })
    }

    // Verifye estòk disponib si retire
    if (Number(delta) < 0) {
      const [cur] = await prisma.$queryRawUnsafe(
        `SELECT quantity FROM products WHERE id = $1 AND tenant_id = $2`,
        req.params.id, tenantId
      )
      if (!cur) return res.status(404).json({ message: 'Pwodui pa jwenn.' })
      if (Number(cur.quantity) + Number(delta) < 0) {
        return res.status(400).json({ message: `Pa gen ase estòk. Disponib: ${cur.quantity}` })
      }
    }

    const [product] = await prisma.$queryRawUnsafe(`
      UPDATE products
      SET quantity   = GREATEST(0, quantity + $1),
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, Number(delta), req.params.id, tenantId)

    if (!product) return res.status(404).json({ message: 'Pwodui pa jwenn.' })
    res.json({ product })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// POST /klinik/famasi/vente — anrejistre yon vant
router.post('/famasi/vente', async (req, res) => {
  try {
    const tenantId = tid(req)
    const userId   = req.user?.id || null
    const { productId, quantite, kliyan, note } = req.body

    if (!productId) return res.status(400).json({ message: 'productId obligatwa.' })
    if (!quantite || Number(quantite) <= 0) return res.status(400).json({ message: 'Kantite obligatwa.' })

    // Jwenn pwodui a
    const [product] = await prisma.$queryRawUnsafe(
      `SELECT * FROM products WHERE id = $1 AND tenant_id = $2`,
      productId, tenantId
    )
    if (!product) return res.status(404).json({ message: 'Pwodui pa jwenn.' })
    if (Number(product.quantity) < Number(quantite)) {
      return res.status(400).json({ message: `Pa gen ase estòk. Disponib: ${product.quantity}` })
    }

    const priceHtg    = Number(product.price_htg    || 0)
    const costHtg     = Number(product.cost_price_htg || 0)
    const totalVant   = priceHtg * Number(quantite)
    const totalCout   = costHtg  * Number(quantite)
    const totalBenefi = totalVant - totalCout

    // Retire estòk
    await prisma.$queryRawUnsafe(`
      UPDATE products SET quantity = quantity - $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `, Number(quantite), productId, tenantId)

    // Anrejistre vant nan klinik_ventes
    const [vente] = await prisma.$queryRaw`
      INSERT INTO klinik_ventes
        (tenant_id, product_id, product_name, quantite, price_htg, cost_price_htg,
         total_vant, total_cout, total_benefi, kliyan, note, created_by)
      VALUES
        (${tenantId}, ${productId}::uuid, ${product.name}, ${Number(quantite)},
         ${priceHtg}, ${costHtg}, ${totalVant}, ${totalCout}, ${totalBenefi},
         ${kliyan || null}, ${note || null}, ${userId})
      RETURNING *
    `

    res.status(201).json({ vente, newQuantity: Number(product.quantity) - Number(quantite) })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// GET /klinik/famasi/ventes — istwa vant + stats benefis
router.get('/famasi/ventes', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { page = 1, limit = 20, productId } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE tenant_id = $1`
    const params = [tenantId]
    let idx = 2

    if (productId) { where += ` AND product_id = $${idx++}::uuid`; params.push(productId) }

    const [ventes, countRow, totals] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT * FROM klinik_ventes ${where}
        ORDER BY created_at DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM klinik_ventes ${where}`, ...params),
      prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(SUM(total_vant),   0) AS total_revni,
          COALESCE(SUM(total_cout),   0) AS total_cout,
          COALESCE(SUM(total_benefi), 0) AS total_benefi,
          COUNT(*) AS nb_ventes
        FROM klinik_ventes ${where}
      `, ...params),
    ])

    res.json({
      ventes,
      total: Number(countRow[0]?.total || 0),
      stats: {
        totalRevni:  Number(totals[0]?.total_revni  || 0),
        totalCout:   Number(totals[0]?.total_cout   || 0),
        totalBenefi: Number(totals[0]?.total_benefi || 0),
        nbVentes:    Number(totals[0]?.nb_ventes    || 0),
      }
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
