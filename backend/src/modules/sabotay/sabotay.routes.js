// backend/src/modules/sabotay/sabotay.routes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('./sabotay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')

// Tout rout yo pwoteje
router.use(identifyTenant, authenticate)

// ── Plans ──────────────────────────────────────────────────────
router.get('/plans',              ctrl.getPlans)
router.get('/plans/stats',        ctrl.getStats)
router.get('/plans/:id',          ctrl.getPlan)
router.post('/plans',             ctrl.createPlan)
router.patch('/plans/:id',        ctrl.updatePlan)
router.delete('/plans/:id',       ctrl.deletePlan)

// ── Manm ──────────────────────────────────────────────────────
router.get('/plans/:planId/members',       ctrl.getMembers)
router.post('/plans/:planId/members',      ctrl.addMember)
router.patch('/plans/:planId/members/:id', ctrl.updateMember)
router.delete('/plans/:planId/members/:id', ctrl.removeMember)

// ── Peman ─────────────────────────────────────────────────────
router.get('/plans/:planId/payments',           ctrl.getPayments)
router.post('/plans/:planId/members/:memberId/pay', ctrl.markPaid)
router.delete('/payments/:paymentId',           ctrl.unmarkPaid)

// ── Kont vityèl manm (lekti sèlman) ──────────────────────────
router.get('/plans/:planId/members/:memberId/account', ctrl.getMemberAccount)

module.exports = router
