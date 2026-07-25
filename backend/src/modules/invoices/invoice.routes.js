// src/modules/invoices/invoice.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const { requireBranchForWrite } = require('../../middleware/requireBranchForWrite'); // ⚠️ NOUVO
const ctrl = require('./invoice.controller');

// ✅ Wout PIBLIK (san otantifikasyon) — pou kliyan wè Fakti pataje a
router.get('/public/:token', ctrl.getPublic);

router.use(identifyTenant, authenticate, extractBranch);

router.get('/',              ctrl.getAll);
router.get('/dashboard',     ctrl.getDashboard);
// ⚠️ NOUVO — requireBranchForWrite anpeche kreye yon fakti "san branch"
// lè admin an mòd Global (pandan tenant lan gen omwen yon branch)
router.post('/direct',       authorize('admin', 'cashier'), requireBranchForWrite, ctrl.createDirect);
router.get('/:id',           ctrl.getOne);
router.get('/:id/pdf',       ctrl.downloadPDF);
router.patch('/:id/cancel',  authorize('admin'), ctrl.cancel);
router.post('/:id/payment',  authorize('admin', 'cashier'), ctrl.addPayment);
router.post('/:id/share',    authorize('admin', 'cashier'), ctrl.share);
router.delete('/:id/share',  authorize('admin', 'cashier'), ctrl.revokeShare);

module.exports = router;
