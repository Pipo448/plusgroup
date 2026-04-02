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
    const { id, createdAt, updatedAt, _count,
            appointments, consultations, prescriptions,
            labOrders, hospitalizations, ...data } = req.body
    const patient = await prisma.klinikPatient.create({
      data: { ...data, tenantId, numeroDossier },
    })
    res.status(201).json({ patient })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/patients/:id', async (req, res) => {
  try {
    const { id, tenantId, numeroDossier, createdAt, updatedAt,
            appointments, consultations, prescriptions,
            labOrders, hospitalizations, _count, ...data } = req.body
    const patient = await prisma.klinikPatient.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ patient })
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

module.exports = router