// backend/src/modules/sabotay/sabotay.routes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('./sabotay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')

// Tout rout yo pwoteje
router.use(identifyTenant, authenticate)

// ── Plans ──────────────────────────────────────────────────────
// ✅ FIX: /plans/stats DWE vini ANVAN /plans/:id
//    Sinon Express ap match "stats" kòm yon :id — ctrl.getStats pa janm rele
router.get('/plans/stats',        ctrl.getStats)   // ← ANVAN :id
router.get('/plans',              ctrl.getPlans)
router.get('/plans/:id',          ctrl.getPlan)
router.post('/plans',             ctrl.createPlan)
router.patch('/plans/:id',        ctrl.updatePlan)
router.put('/plans/:id',          ctrl.updatePlan)  // ✅ FIX: frontend voye PUT, backend te gen PATCH sèlman
router.delete('/plans/:id',       ctrl.deletePlan)

// ── Tiraj Avèg ────────────────────────────────────────────────
// ✅ NOUVO: endpoint pou blind draw
router.post('/plans/:id/blind-draw', ctrl.blindDraw)

// ── Manm ──────────────────────────────────────────────────────
router.get('/plans/:planId/members',            ctrl.getMembers)
router.post('/plans/:planId/members',           ctrl.addMember)
router.patch('/plans/:planId/members/:id',      ctrl.updateMember)
router.delete('/plans/:planId/members/:id',     ctrl.removeMember)

// ── Peman ─────────────────────────────────────────────────────
router.get('/plans/:planId/payments',                    ctrl.getPayments)
router.post('/plans/:planId/members/:memberId/pay',      ctrl.markPaid)
router.delete('/payments/:paymentId',                    ctrl.unmarkPaid)

// ── Kont vityèl manm (lekti sèlman) ──────────────────────────
router.get('/plans/:planId/members/:memberId/account',   ctrl.getMemberAccount)

module.exports = router
