// src/routes/klinik.routes.js
'use strict'

const express  = require('express')
const { PrismaClient } = require('@prisma/client')
const { identifyTenant, authenticate } = require('../middleware/auth')
const { extractBranch }               = require('../middleware/branch')

const router = express.Router()
const prisma  = new PrismaClient()

router.use(identifyTenant, authenticate, extractBranch)

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
    const [totalPasyan, nouvoMwa, rdvJodi, rdvAtant, konsultMwa, hospActif, labAtant] = await Promise.all([
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
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: { _count: { select: { consultations: true, appointments: true, hospitalizations: true } } },
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
        consultations:   { orderBy: { date: 'desc' }, take: 10, include: { prescriptions: { include: { items: true } } } },
        prescriptions:   { orderBy: { date: 'desc' }, take: 5, include: { items: true } },
        labOrders:       { orderBy: { dateCommande: 'desc' }, take: 5, include: { items: true } },
        hospitalizations:{ orderBy: { dateAdmission: 'desc' }, take: 5 },
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
    const { prenom, nom, dateNesans, sexe, telephone, adresse, groupeSangin, email, notes } = req.body
 
    // Validasyon
    if (!prenom || !prenom.trim()) return res.status(400).json({ message: 'Prenom obligatwa.' })
    if (!nom || !nom.trim())       return res.status(400).json({ message: 'Nom obligatwa.' })
    if (!sexe)                      return res.status(400).json({ message: 'Seks obligatwa.' })
 
    console.log('[POST /patients] data:', { prenom, nom, sexe, telephone, groupeSangin })
 
    const patient = await prisma.klinikPatient.create({
      data: {
        tenantId,
        numeroDossier,
        prenom:        prenom.trim(),
        nom:           nom.trim(),
        dateNaissance: dateNesans ? new Date(dateNesans) : null,
        sexe,
        telephone:     telephone || null,
        adresse:       adresse || null,
        groupeSanguin: groupeSangin || 'INCONNU',  // ← CHANJE SA
        email:         email || null,
        notes:         notes || null,
        isActive:      true,
      },
    })
 
    res.status(201).json({ patient })
  } catch (e) {
    console.error('[POST /patients] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

router.put('/patients/:id', async (req, res) => {
  try {
    const { prenom, nom, dateNesans, sexe, telephone, adresse, groupeSangin, email, notes } = req.body
 
    if (!prenom || !prenom.trim()) return res.status(400).json({ message: 'Prenom obligatwa.' })
    if (!nom || !nom.trim())       return res.status(400).json({ message: 'Nom obligatwa.' })
 
    const patient = await prisma.klinikPatient.update({
      where: { id: req.params.id },
      data: {
        prenom:        prenom.trim(),
        nom:           nom.trim(),
        dateNaissance: dateNesans ? new Date(dateNesans) : null,
        sexe,
        telephone:     telephone || null,
        adresse:       adresse || null,
        groupeSanguin: groupeSangin || 'INCONNU',  // ← CHANJE SA TOUN
        email:         email || null,
        notes:         notes || null,
      },
    })
 
    res.json({ patient })
  } catch (e) {
    console.error('[PUT /patients] erè:', e)
    res.status(500).json({ message: e.message })
  }
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
      const d = new Date(date); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate()+1)
      where.dateHeure = { gte: d, lt: next }
    }
    if (statut)    where.statut    = statut
    if (patientId) where.patientId = patientId
    const [appointments, total] = await Promise.all([
      prisma.klinikAppointment.findMany({
        where, skip:(Number(page)-1)*Number(limit), take:Number(limit), orderBy:{dateHeure:'asc'},
        include:{patient:{select:{nom:true,prenom:true,telephone:true,numeroDossier:true}}},
      }),
      prisma.klinikAppointment.count({ where }),
    ])
    res.json({ appointments, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/appointments', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, patient, consultation, ...data } = req.body
    if (data.dateHeure) data.dateHeure = new Date(data.dateHeure)
    const appointment = await prisma.klinikAppointment.create({
      data: { ...data, tenantId: tid(req), createdBy: req.user.id },
      include: { patient: { select: { nom:true, prenom:true, telephone:true } } },
    })
    res.status(201).json({ appointment })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/appointments/:id', async (req, res) => {
  try {
    const { id, tenantId, createdAt, updatedAt, patient, consultation, ...data } = req.body
    if (data.dateHeure) data.dateHeure = new Date(data.dateHeure)
    const appointment = await prisma.klinikAppointment.update({
      where: { id: req.params.id }, data,
      include: { patient: { select: { nom:true, prenom:true } } },
    })
    res.json({ appointment })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.patch('/appointments/:id/statut', async (req, res) => {
  try {
    const { statut } = req.body
    const appointment = await prisma.klinikAppointment.update({
      where: { id: req.params.id }, data: { statut },
      include: { patient: { select: { nom:true, prenom:true } } },
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
        where, skip:(Number(page)-1)*Number(limit), take:Number(limit), orderBy:{date:'desc'},
        include:{patient:{select:{nom:true,prenom:true,numeroDossier:true}},prescriptions:{include:{items:true}},labOrders:{include:{items:true}}},
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
      include: { patient:true, appointment:true, prescriptions:{include:{items:true}}, labOrders:{include:{items:true}} },
    })
    if (!consultation) return res.status(404).json({ message: 'Konsiltasyon pa jwenn.' })
    res.json({ consultation })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/consultations', async (req, res) => {
  try {
    const { appointmentId, patientId, doctorName, statut,
            motif, anamnese, examenClinique, diagnostic,
            traitement, notesInternes,
            tensionSys, tensionDia, temperature,
            poidsKg, tailleCm, pouls, spo2, glycemie,
          } = req.body

    if (!patientId)   return res.status(400).json({ message: 'patientId obligatwa.' })
    if (!doctorName)  return res.status(400).json({ message: 'doctorName obligatwa.' })

    if (appointmentId) {
      await prisma.klinikAppointment.update({
        where: { id: appointmentId }, data: { statut: 'en_cours' }
      })
    }

    const consultation = await prisma.klinikConsultation.create({
      data: {
        tenantId:       tid(req),
        createdBy:      req.user.id,
        patientId,
        doctorName,
        statut:         statut        || 'brouillon',
        appointmentId:  appointmentId || null,
        motif:          motif         || null,
        anamnese:       anamnese      || null,
        examenClinique: examenClinique|| null,
        diagnostic:     diagnostic    || null,
        traitement:     traitement    || null,
        notesInternes:  notesInternes || null,
        tensionSys:     tensionSys    ? parseInt(tensionSys)    : null,
        tensionDia:     tensionDia    ? parseInt(tensionDia)    : null,
        temperature:    temperature   ? parseFloat(temperature) : null,
        poidsKg:        poidsKg       ? parseFloat(poidsKg)     : null,
        tailleCm:       tailleCm      ? parseFloat(tailleCm)    : null,
        pouls:          pouls         ? parseInt(pouls)         : null,
        spo2:           spo2          ? parseInt(spo2)          : null,
        glycemie:       glycemie      ? parseFloat(glycemie)    : null,
      },
      include: { patient: { select: { nom: true, prenom: true } } },
    })

    res.status(201).json({ consultation })
  } catch (e) {
    console.error('[POST /consultations] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

router.put('/consultations/:id', async (req, res) => {
  try {
    const { doctorName, statut, motif, anamnese, examenClinique,
            diagnostic, traitement, notesInternes,
            tensionSys, tensionDia, temperature,
            poidsKg, tailleCm, pouls, spo2, glycemie,
          } = req.body

    const consultation = await prisma.klinikConsultation.update({
      where: { id: req.params.id },
      data: {
        doctorName,
        statut:         statut         || 'brouillon',
        motif:          motif          || null,
        anamnese:       anamnese       || null,
        examenClinique: examenClinique || null,
        diagnostic:     diagnostic     || null,
        traitement:     traitement     || null,
        notesInternes:  notesInternes  || null,
        tensionSys:     tensionSys     ? parseInt(tensionSys)    : null,
        tensionDia:     tensionDia     ? parseInt(tensionDia)    : null,
        temperature:    temperature    ? parseFloat(temperature) : null,
        poidsKg:        poidsKg        ? parseFloat(poidsKg)     : null,
        tailleCm:       tailleCm       ? parseFloat(tailleCm)    : null,
        pouls:          pouls          ? parseInt(pouls)         : null,
        spo2:           spo2           ? parseInt(spo2)          : null,
        glycemie:       glycemie       ? parseFloat(glycemie)    : null,
      },
      include: {
        patient: { select: { nom: true, prenom: true } },
        prescriptions: { include: { items: true } },
        labOrders: { include: { items: true } },
      },
    })

    if (statut === 'signe' && consultation.appointmentId) {
      await prisma.klinikAppointment.update({
        where: { id: consultation.appointmentId }, data: { statut: 'complete' }
      })
    }

    res.json({ consultation })
  } catch (e) {
    console.error('[PUT /consultations] erè:', e)
    res.status(500).json({ message: e.message })
  }
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
        where, skip:(Number(page)-1)*Number(limit), take:Number(limit), orderBy:{date:'desc'},
        include:{patient:{select:{nom:true,prenom:true,numeroDossier:true}},items:true},
      }),
      prisma.klinikPrescription.count({ where }),
    ])
    res.json({ prescriptions, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/prescriptions/:id', async (req, res) => {
  try {
    const prescription = await prisma.klinikPrescription.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
      include: { patient:{select:{nom:true,prenom:true,numeroDossier:true}}, items:true },
    })
    if (!prescription) return res.status(404).json({ message: 'Preskripsyon pa jwenn.' })
    res.json({ prescription })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/prescriptions', async (req, res) => {
  try {
    const { items = [], id, createdAt, updatedAt, patient, consultation, ...rest } = req.body
    const prescription = await prisma.klinikPrescription.create({
      data: { ...rest, tenantId: tid(req), items: { create: items } },
      include: { items:true, patient:{select:{nom:true,prenom:true}} },
    })
    res.status(201).json({ prescription })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/prescriptions/:id', async (req, res) => {
  try {
    const { items = [], id, tenantId, createdAt, updatedAt, patient, consultation, ...rest } = req.body
    await prisma.klinikPrescriptionItem.deleteMany({ where: { prescriptionId: req.params.id } })
    const prescription = await prisma.klinikPrescription.update({
      where: { id: req.params.id }, data: { ...rest, items: { create: items } },
      include: { items:true, patient:{select:{nom:true,prenom:true}} },
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
        where, skip:(Number(page)-1)*Number(limit), take:Number(limit), orderBy:{dateCommande:'desc'},
        include:{patient:{select:{nom:true,prenom:true,numeroDossier:true}},items:true},
      }),
      prisma.klinikLabOrder.count({ where }),
    ])
    res.json({ labOrders, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/lab-orders', async (req, res) => {
  try {
    const { items = [], id, createdAt, updatedAt, patient, consultation, ...rest } = req.body
    const mappedItems = items.map(it => ({
      testNom:       it.testNom       || it.nomTest       || '',
      testCode:      it.testCode      || it.code          || null,
      valeurNormale: it.valeurNormale || null,
      valeur:        it.valeur        || null,
      unite:         it.unite         || null,
      estAnormal:    it.estAnormal    || false,
    }))
    const labOrder = await prisma.klinikLabOrder.create({
      data: { ...rest, tenantId: tid(req), items: { create: mappedItems } },
      include: { items:true, patient:{select:{nom:true,prenom:true}} },
    })
    res.status(201).json({ labOrder })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/lab-orders/:id', async (req, res) => {
  try {
    const { items = [], id, tenantId, createdAt, updatedAt, patient, consultation, ...rest } = req.body
    const mappedItems = items.map(it => ({
      testNom:       it.testNom       || it.nomTest       || '',
      testCode:      it.testCode      || it.code          || null,
      valeurNormale: it.valeurNormale || null,
      valeur:        it.valeur        || null,
      unite:         it.unite         || null,
      estAnormal:    it.estAnormal    || false,
    }))
    await prisma.klinikLabItem.deleteMany({ where: { labOrderId: req.params.id } })
    const labOrder = await prisma.klinikLabOrder.update({
      where: { id: req.params.id },
      data: { ...rest, items: { create: mappedItems } },
      include: { items:true, patient:{select:{nom:true,prenom:true}} },
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
    const allItems = await prisma.klinikLabItem.findMany({ where: { labOrderId: req.params.orderId } })
    if (allItems.every(i => i.valeur)) {
      await prisma.klinikLabOrder.update({ where: { id: req.params.orderId }, data: { statut: 'complete' } })
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
        where, skip:(Number(page)-1)*Number(limit), take:Number(limit), orderBy:{dateAdmission:'desc'},
        include:{patient:{select:{nom:true,prenom:true,numeroDossier:true,groupeSanguin:true,telephone:true}}},
      }),
      prisma.klinikHospitalization.count({ where }),
    ])
    res.json({ hospitalizations, total })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.get('/hospitalizations/:id', async (req, res) => {
  try {
    const hosp = await prisma.klinikHospitalization.findFirst({
      where: { id: req.params.id, tenantId: tid(req) }, include: { patient: true },
    })
    if (!hosp) return res.status(404).json({ message: 'Ospitalizasyon pa jwenn.' })
    res.json({ hospitalization: hosp })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.post('/hospitalizations', async (req, res) => {
  try {
    const { id, createdAt, updatedAt, patient,
            numeroChambre, diagnostic, traitement, ...rest } = req.body
    const hosp = await prisma.klinikHospitalization.create({
      data: {
        ...rest,
        tenantId:       tid(req),
        chambre:        numeroChambre || rest.chambre || null,
        diagnosticFinal: diagnostic   || null,
        // traitement pa nan schema — mete nan notes si disponib
        notes: rest.notes || traitement || null,
      },
      include: { patient: { select: { nom:true, prenom:true } } },
    })
    res.status(201).json({ hospitalization: hosp })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

router.put('/hospitalizations/:id', async (req, res) => {
  try {
    const { id, tenantId, createdAt, updatedAt, patient,
            numeroChambre, diagnostic, traitement, ...rest } = req.body
    const hosp = await prisma.klinikHospitalization.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        chambre:         numeroChambre || rest.chambre || null,
        diagnosticFinal: diagnostic    || null,
        notes:           rest.notes    || traitement   || null,
      },
      include: { patient: { select: { nom:true, prenom:true } } },
    })
    res.json({ hospitalization: hosp })
  } catch(e) { res.status(500).json({ message: e.message }) }
})

router.patch('/hospitalizations/:id/decharge', async (req, res) => {
  try {
    const { diagnosticFinal, notes } = req.body
    const hosp = await prisma.klinikHospitalization.update({
      where: { id: req.params.id },
      data:  { statut:'sorti', dateDecharge:new Date(), diagnosticFinal, notes },
      include: { patient: { select: { nom:true, prenom:true } } },
    })
    res.json({ hospitalization: hosp })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// SÈVIS KLINIK
// ═══════════════════════════════════════════════════════════════
router.get('/services', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { serviceType, search, page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    let where = `WHERE ks.tenant_id = $1`
    const params = [tenantId]
    let idx = 2
    if (serviceType) { where += ` AND ks.service_type = $${idx++}`; params.push(serviceType) }
    if (search) { where += ` AND (kp.prenom ILIKE $${idx} OR kp.nom ILIKE $${idx})`; params.push(`%${search}%`); idx++ }
    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT ks.*, json_build_object('id',kp.id,'prenom',kp.prenom,'nom',kp.nom,'numeroDossier',kp.numero_dossier) AS patient
        FROM klinik_services ks LEFT JOIN klinik_patients kp ON kp.id=ks.patient_id
        ${where} ORDER BY ks.created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}
      `, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM klinik_services ks LEFT JOIN klinik_patients kp ON kp.id=ks.patient_id ${where}`, ...params),
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
      INSERT INTO klinik_services (tenant_id,patient_id,service_type,price_htg,status,notes,performed_by,created_by)
      VALUES (${tenantId},${patientId},${serviceType},${Number(priceHtg)},${status},${notes||null},${performedBy||null},${userId}) RETURNING *
    `
    res.status(201).json({ service: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.patch('/services/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { status, notes, priceHtg, performedBy } = req.body
    const rows = await prisma.$queryRaw`
      UPDATE klinik_services SET
        status=COALESCE(${status||null},status), notes=COALESCE(${notes||null},notes),
        price_htg=COALESCE(${priceHtg!==undefined?Number(priceHtg):null},price_htg),
        performed_by=COALESCE(${performedBy||null},performed_by)
      WHERE id=${req.params.id}::uuid AND tenant_id=${tenantId} RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ message: 'Sèvis pa jwenn.' })
    res.json({ service: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.delete('/services/:id', async (req, res) => {
  try {
    await prisma.$queryRaw`DELETE FROM klinik_services WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)}`
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
    if (poste)  { where += ` AND poste=$${idx++}`;  params.push(poste)  }
    if (statut) { where += ` AND statut=$${idx++}`; params.push(statut) }
    if (search) { where += ` AND (nom ILIKE $${idx} OR prenom ILIKE $${idx} OR poste ILIKE $${idx})`; params.push(`%${search}%`); idx++ }
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
              ${dateEmbauche?new Date(dateEmbauche):null},${Number(salaireBase||0)},${statut||'actif'},${notes||null}) RETURNING *
    `
    res.status(201).json({ employee: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

router.put('/employees/:id', async (req, res) => {
  try {
    const { nom, prenom, poste, telephone, email, adresse, dateEmbauche, salaireBase, statut, notes } = req.body
    const rows = await prisma.$queryRaw`
      UPDATE klinik_employees SET
        nom=COALESCE(${nom||null},nom),prenom=COALESCE(${prenom||null},prenom),poste=COALESCE(${poste||null},poste),
        telephone=COALESCE(${telephone||null},telephone),email=COALESCE(${email||null},email),adresse=COALESCE(${adresse||null},adresse),
        date_embauche=COALESCE(${dateEmbauche?new Date(dateEmbauche):null},date_embauche),
        salaire_base=COALESCE(${salaireBase!==undefined?Number(salaireBase):null},salaire_base),
        statut=COALESCE(${statut||null},statut),notes=COALESCE(${notes||null},notes),updated_at=NOW()
      WHERE id=${req.params.id}::uuid AND tenant_id=${tid(req)} RETURNING *
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
    if (mois) { where += ` AND p.mois=$${idx++}`; params.push(mois) }
    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT p.*,e.nom,e.prenom,e.poste FROM klinik_payroll p
        LEFT JOIN klinik_employees e ON e.id=p.employee_id
        ${where} ORDER BY p.created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}
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
              ${Number(salaireNet||0)},${statut},${methode_paiement||null},${datePaiement?new Date(datePaiement):null},${notes||null},${req.user?.id||null}) RETURNING *
    `
    res.status(201).json({ payroll: rows[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// FAMASI — products=TEXT ids, klinik_ventes=UUID ids
// ═══════════════════════════════════════════════════════════════

// GET /klinik/famasi/ventes  — ANVAN /famasi pou evite konfli routing
router.get('/famasi/ventes', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { page = 1, limit = 50, productId, periode } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let where = `WHERE tenant_id=$1::uuid`
    const params = [tenantId]
    let idx = 2
    if (productId) { where += ` AND product_id=$${idx++}::uuid`; params.push(productId) }
    if (periode === 'today') where += ` AND created_at>=CURRENT_DATE`
    else if (periode === 'week')  where += ` AND created_at>=CURRENT_DATE-INTERVAL '7 days'`
    else if (periode === 'month') where += ` AND created_at>=date_trunc('month',NOW())`

    const [ventes, countRow, totals, parJou] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM klinik_ventes ${where} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM klinik_ventes ${where}`, ...params),
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total_vant),0) AS total_revni, COALESCE(SUM(total_cout),0) AS total_cout,
               COALESCE(SUM(total_benefi),0) AS total_benefi, COUNT(*) AS nb_ventes
        FROM klinik_ventes ${where}
      `, ...params),
      prisma.$queryRawUnsafe(`
        SELECT TO_CHAR(created_at,'MM-DD') AS jou,
               COALESCE(SUM(total_vant),0) AS revni, COALESCE(SUM(total_benefi),0) AS benefi
        FROM klinik_ventes WHERE tenant_id=$1::uuid AND created_at>=CURRENT_DATE-INTERVAL '6 days'
        GROUP BY TO_CHAR(created_at,'MM-DD'),DATE(created_at) ORDER BY DATE(created_at) ASC
      `, tenantId),
    ])

    res.json({
      ventes,
      total: Number(countRow[0]?.total || 0),
      stats: {
        totalRevni:  Number(totals[0]?.total_revni  || 0),
        totalCout:   Number(totals[0]?.total_cout   || 0),
        totalBenefi: Number(totals[0]?.total_benefi || 0),
        nbVentes:    Number(totals[0]?.nb_ventes    || 0),
      },
      grafik: parJou.map(r => ({ jou:r.jou, revni:Number(r.revni||0), benefi:Number(r.benefi||0) }))
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// POST /klinik/famasi/vente
router.post('/famasi/vente', async (req, res) => {
  try {
    const tenantId = tid(req)
    const userId   = req.user?.id || null
    const { productId, quantite, kliyan, note } = req.body
    if (!productId) return res.status(400).json({ message: 'productId obligatwa.' })
    if (!quantite || Number(quantite) <= 0) return res.status(400).json({ message: 'Kantite obligatwa.' })

    const cur = await prisma.$queryRawUnsafe(`SELECT * FROM products WHERE id=$1 AND tenant_id=$2`, productId, tenantId)
    const p = cur[0]
    if (!p) return res.status(404).json({ message: 'Pwodui pa jwenn.' })
    if (Number(p.quantity) < Number(quantite)) return res.status(400).json({ message: `Pa gen ase estòk. Disponib: ${p.quantity}` })

    const priceHtg=Number(p.price_htg||0), costHtg=Number(p.cost_price_htg||0)
    const totalVant=priceHtg*Number(quantite), totalCout=costHtg*Number(quantite), totalBenefi=totalVant-totalCout

    await prisma.$queryRawUnsafe(`UPDATE products SET quantity=quantity-$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3`, Number(quantite), productId, tenantId)

    const vente = await prisma.$queryRawUnsafe(`
      INSERT INTO klinik_ventes (tenant_id,product_id,product_name,quantite,price_htg,cost_price_htg,total_vant,total_cout,total_benefi,kliyan,note,created_by)
      VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::uuid) RETURNING *
    `, tenantId, productId, p.name, Number(quantite), priceHtg, costHtg, totalVant, totalCout, totalBenefi, kliyan||null, note||null, userId)

    res.status(201).json({ vente: vente[0], newQuantity: Number(p.quantity) - Number(quantite) })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// PATCH /klinik/famasi/:id/stock
router.patch('/famasi/:id/stock', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { delta, raison } = req.body
    if (delta === undefined || delta === null) return res.status(400).json({ message: 'delta obligatwa.' })
    if (Number(delta) < 0) {
      const cur = await prisma.$queryRawUnsafe(`SELECT quantity FROM products WHERE id=$1 AND tenant_id=$2`, req.params.id, tenantId)
      if (!cur[0]) return res.status(404).json({ message: 'Pwodui pa jwenn.' })
      if (Number(cur[0].quantity) + Number(delta) < 0) return res.status(400).json({ message: `Pa gen ase estòk. Disponib: ${cur[0].quantity}` })
    }
    const result = await prisma.$queryRawUnsafe(`UPDATE products SET quantity=GREATEST(0,quantity+$1),updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *`, Number(delta), req.params.id, tenantId)
    if (!result[0]) return res.status(404).json({ message: 'Pwodui pa jwenn.' })
    res.json({ product: result[0] })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// GET /klinik/famasi
router.get('/famasi', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { search, page = 1, limit = 24, filter } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    let where = `WHERE p.tenant_id=$1 AND p.is_active=true`
    const params = [tenantId]
    let idx = 2
    if (search) { where += ` AND p.name ILIKE $${idx++}`; params.push(`%${search}%`) }
    if (filter === 'low') where += ` AND p.quantity>0 AND p.quantity<=COALESCE(p.alert_threshold,10)`
    if (filter === 'out') where += ` AND p.quantity<=0`

    const [products, countRow, statsRow] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT p.*,
          CASE WHEN p.cost_price_htg>0 AND p.price_htg>0 THEN ROUND(((p.price_htg-p.cost_price_htg)/p.price_htg)*100,1) ELSE 0 END AS benefis_pct,
          CASE WHEN p.cost_price_htg>0 THEN ROUND(p.price_htg-p.cost_price_htg,2) ELSE 0 END AS benefis_unit
        FROM products p ${where} ORDER BY p.name ASC LIMIT ${Number(limit)} OFFSET ${offset}
      `, ...params),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM products p ${where}`, ...params),
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(p.price_htg*p.quantity),0) AS valeur_stock, COALESCE(SUM(p.cost_price_htg*p.quantity),0) AS cout_stock,
               COUNT(*) FILTER (WHERE p.quantity<=0) AS san_estok,
               COUNT(*) FILTER (WHERE p.quantity>0 AND p.quantity<=COALESCE(p.alert_threshold,10)) AS ba_estok
        FROM products p WHERE p.tenant_id=$1 AND p.is_active=true
      `, tenantId),
    ])

    res.json({
      products,
      total: Number(countRow[0]?.total || 0),
      stats: {
        valeurStock:      Number(statsRow[0]?.valeur_stock || 0),
        coutStock:        Number(statsRow[0]?.cout_stock   || 0),
        benefisPotansyel: Number(statsRow[0]?.valeur_stock || 0) - Number(statsRow[0]?.cout_stock || 0),
        sanEstok:         Number(statsRow[0]?.san_estok    || 0),
        baEstok:          Number(statsRow[0]?.ba_estok     || 0),
      }
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// LÒT DEPANS (manje, dlo, kouran, mentnans, eks.)
// ─── Kole seksyon sa a nan klinik.routes.js ANVAN module.exports ───
// ═══════════════════════════════════════════════════════════════

const KATEGORI_DEPANS_VALID = [
  'manje', 'dlo', 'kouran', 'mentnans',
  'founiti', 'transpo', 'tel_net', 'lwaye', 'lot'
]

// GET /klinik/lot-depans — lis ak filtre
router.get('/lot-depans', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { kategori, dat_de, dat_a, page = 1, limit = 200 } = req.query
    const lim    = Math.min(Number(limit), 500)
    const offset = (Number(page) - 1) * lim

    let where = `WHERE tenant_id=$1::uuid`
    const params = [tenantId]
    let idx = 2
    if (kategori) { where += ` AND kategori=$${idx++}`;       params.push(kategori) }
    if (dat_de)   { where += ` AND dat>=$${idx++}::date`;     params.push(dat_de)   }
    if (dat_a)    { where += ` AND dat<=$${idx++}::date`;     params.push(dat_a)    }

    const [rows, countRow] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT * FROM klinik_lot_depans ${where} 
         ORDER BY dat DESC, created_at DESC 
         LIMIT ${lim} OFFSET ${offset}`,
        ...params
      ),
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM klinik_lot_depans ${where}`,
        ...params
      ),
    ])

    res.json({
      depans: rows,
      total:  Number(countRow[0]?.total || 0),
      page:   Number(page),
      limit:  lim,
    })
  } catch (e) {
    console.error('[GET /lot-depans] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

// GET /klinik/lot-depans/stats — repartisyon pa kategori
router.get('/lot-depans/stats', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { dat_de, dat_a } = req.query

    let where = `WHERE tenant_id=$1::uuid`
    const params = [tenantId]
    let idx = 2
    if (dat_de) { where += ` AND dat>=$${idx++}::date`; params.push(dat_de) }
    if (dat_a)  { where += ` AND dat<=$${idx++}::date`; params.push(dat_a)  }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT kategori, COALESCE(SUM(montan),0) AS total, COUNT(*) AS n
       FROM klinik_lot_depans ${where}
       GROUP BY kategori ORDER BY total DESC`,
      ...params
    )

    const parKategori = {}
    let total = 0, count = 0
    rows.forEach(r => {
      const t = Number(r.total || 0)
      parKategori[r.kategori] = t
      total += t
      count += Number(r.n || 0)
    })

    res.json({ total, count, parKategori })
  } catch (e) {
    console.error('[GET /lot-depans/stats] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

// POST /klinik/lot-depans — kreye nouvo depans
router.post('/lot-depans', async (req, res) => {
  try {
    const tenantId = tid(req)
    const userId   = req.user?.id || null
    const { kategori, description, montan, dat, notes } = req.body

    // Validasyon
    if (!kategori) return res.status(400).json({ message: 'Kategori obligatwa.' })
    if (!KATEGORI_DEPANS_VALID.includes(kategori)) {
      return res.status(400).json({ message: `Kategori "${kategori}" pa valid.` })
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Deskripsyon obligatwa.' })
    }
    const montanNum = Number(montan)
    if (!montanNum || montanNum <= 0) {
      return res.status(400).json({ message: 'Montan dwe pi gwo pase 0.' })
    }

    const datVal = dat || new Date().toISOString().split('T')[0]

    const rows = await prisma.$queryRaw`
      INSERT INTO klinik_lot_depans
        (tenant_id, kategori, description, montan, dat, notes, created_by)
      VALUES
        (${tenantId}::uuid, ${kategori}, ${description.trim()}, ${montanNum},
         ${datVal}::date, ${notes?.trim() || null}, ${userId}::uuid)
      RETURNING *
    `
    res.status(201).json({ depans: rows[0] })
  } catch (e) {
    console.error('[POST /lot-depans] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

// PUT /klinik/lot-depans/:id — mizajou
router.put('/lot-depans/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const { kategori, description, montan, dat, notes } = req.body

    if (kategori !== undefined && !KATEGORI_DEPANS_VALID.includes(kategori)) {
      return res.status(400).json({ message: `Kategori "${kategori}" pa valid.` })
    }
    if (montan !== undefined) {
      const m = Number(montan)
      if (!m || m <= 0) return res.status(400).json({ message: 'Montan dwe pi gwo pase 0.' })
    }

    const rows = await prisma.$queryRaw`
      UPDATE klinik_lot_depans SET
        kategori    = COALESCE(${kategori || null}, kategori),
        description = COALESCE(${description?.trim() || null}, description),
        montan      = COALESCE(${montan !== undefined ? Number(montan) : null}, montan),
        dat         = COALESCE(${dat || null}::date, dat),
        notes       = COALESCE(${notes?.trim() || null}, notes),
        updated_at  = NOW()
      WHERE id=${req.params.id}::uuid AND tenant_id=${tenantId}::uuid
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ message: 'Depans pa jwenn.' })
    res.json({ depans: rows[0] })
  } catch (e) {
    console.error('[PUT /lot-depans] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

// DELETE /klinik/lot-depans/:id — efase
router.delete('/lot-depans/:id', async (req, res) => {
  try {
    const tenantId = tid(req)
    const result = await prisma.$queryRaw`
      DELETE FROM klinik_lot_depans
      WHERE id=${req.params.id}::uuid AND tenant_id=${tenantId}::uuid
      RETURNING id
    `
    if (!result[0]) return res.status(404).json({ message: 'Depans pa jwenn.' })
    res.json({ success: true, id: result[0].id })
  } catch (e) {
    console.error('[DELETE /lot-depans] erè:', e)
    res.status(500).json({ message: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// FEN SEKSYON LÒT DEPANS
// ═══════════════════════════════════════════════════════════════

module.exports = router