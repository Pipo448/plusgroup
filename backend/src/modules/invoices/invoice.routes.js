// src/modules/invoices/invoice.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch'); // ⚠️ NOUVO
const ctrl = require('./invoice.controller');

// ✅ NOUVO — Wout PIBLIK (san otantifikasyon) — pou kliyan wè Fakti pataje a
router.get('/public/:token', ctrl.getPublic);

// ⚠️ KORIJE — ajoute extractBranch pou li X-Branch-Id header
router.use(identifyTenant, authenticate, extractBranch);

router.get('/',              ctrl.getAll);
router.get('/dashboard',     ctrl.getDashboard);
router.post('/direct',       authorize('admin', 'cashier'), ctrl.createDirect);
router.get('/:id',           ctrl.getOne);
router.get('/:id/pdf',       ctrl.downloadPDF);
router.patch('/:id/cancel',  authorize('admin'), ctrl.cancel);
router.post('/:id/payment',  authorize('admin', 'cashier'), ctrl.addPayment);
// ✅ NOUVO — Pataje pa WhatsApp
router.post('/:id/share',    authorize('admin', 'cashier'), ctrl.share);
router.delete('/:id/share',  authorize('admin', 'cashier'), ctrl.revokeShare);

module.exports = router;
