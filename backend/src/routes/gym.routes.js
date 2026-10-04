// backend/src/routes/gym.routes.js
const express = require('express')
const router = express.Router()
const ctrl = require('../modules/gym/gym.controller')
const { identifyTenant, authenticate } = require('../middleware/auth') // ⚠️ verifye non egzak middleware ou a si li diferan

router.use(identifyTenant, authenticate)

router.get('/stats', ctrl.getStats)

router.get('/plans', ctrl.getPlans)
router.post('/plans', ctrl.createPlan)
router.patch('/plans/:id', ctrl.updatePlan)
router.delete('/plans/:id', ctrl.deletePlan)

// ✅ NOUVO — Tarif Jounalye (peman pa jou, san plan)
router.get('/daily-rate', ctrl.getDailyRate)
router.post('/daily-rate', ctrl.setDailyRate)
router.post('/members/:memberId/daily-payment', ctrl.confirmDailyPayment)

router.get('/members', ctrl.getMembers)
router.get('/members/:id', ctrl.getMember)
router.post('/members', ctrl.addMember)
router.patch('/members/:id', ctrl.updateMember)
router.delete('/members/:id', ctrl.removeMember)

router.get('/members/:memberId/memberships', ctrl.getMemberships)
router.post('/members/:memberId/memberships', ctrl.createMembership)
router.patch('/memberships/:membershipId/cancel', ctrl.cancelMembership)

router.get('/check-ins', ctrl.getCheckIns)
router.post('/members/:memberId/check-in', ctrl.checkIn)
router.patch('/check-ins/:checkInId/check-out', ctrl.checkOut)

router.get('/payments', ctrl.getPayments)
router.post('/members/:memberId/payments', ctrl.addPayment)

router.get('/classes', ctrl.getClasses)
router.post('/classes', ctrl.createClass)
router.patch('/classes/:id', ctrl.updateClass)
router.delete('/classes/:id', ctrl.deleteClass)
router.get('/classes/:id/members', ctrl.getClassMembers)
router.post('/classes/:id/enroll', ctrl.enrollMember)
router.delete('/classes/:id/members/:memberId', ctrl.unenrollMember)

module.exports = router