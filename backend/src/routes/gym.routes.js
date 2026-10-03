// backend/src/routes/gym.routes.js
// ✅ NOUVO — Modil Jim/Gym — swiv egzakteman menm patwon ak sabotay.routes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('../modules/gym/gym.controller')
const { identifyTenant, authenticate } = require('../middleware/auth')

// Tout wout Gym yo pwoteje pa middleware tenant (menm jan ak Sabotay/Hotel)
router.use(identifyTenant, authenticate)

// ── Stats ──────────────────────────────────────────────────────
router.get('/stats', ctrl.getStats)

// ── Plans (abònman) ──────────────────────────────────────────
router.get('/plans',        ctrl.getPlans)
router.post('/plans',       ctrl.createPlan)
router.patch('/plans/:id',  ctrl.updatePlan)
router.delete('/plans/:id', ctrl.deletePlan)

// ── Members ───────────────────────────────────────────────────
router.get('/members',         ctrl.getMembers)
router.get('/members/:id',     ctrl.getMember)
router.post('/members',        ctrl.addMember)
router.patch('/members/:id',   ctrl.updateMember)
router.delete('/members/:id',  ctrl.removeMember)

// ── Memberships (achte/renouvle abònman pou yon manm) ────────
router.get('/members/:memberId/memberships',  ctrl.getMemberships)
router.post('/members/:memberId/memberships', ctrl.createMembership)
router.patch('/memberships/:membershipId/cancel', ctrl.cancelMembership)

// ── Check-in ──────────────────────────────────────────────────
router.get('/check-ins',                    ctrl.getCheckIns)
router.post('/members/:memberId/check-in',  ctrl.checkIn)
router.patch('/check-ins/:checkInId/check-out', ctrl.checkOut)

// ── Payments / Kès ────────────────────────────────────────────
router.get('/payments',                   ctrl.getPayments)
router.post('/members/:memberId/payments', ctrl.addPayment)

// ── Classes & Trainers (klas & antrenè) ──────────────────────
router.get('/classes',                         ctrl.getClasses)
router.post('/classes',                        ctrl.createClass)
router.patch('/classes/:id',                   ctrl.updateClass)
router.delete('/classes/:id',                  ctrl.deleteClass)
router.get('/classes/:id/members',             ctrl.getClassMembers)
router.post('/classes/:id/enroll',             ctrl.enrollMember)
router.delete('/classes/:id/members/:memberId', ctrl.unenrollMember)

module.exports = router
