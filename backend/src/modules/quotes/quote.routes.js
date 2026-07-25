// ============================================================
// src/modules/quotes/quote.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const { requireBranchForWrite } = require('../../middleware/requireBranchForWrite'); // ⚠️ NOUVO
const ctrl = require('./quote.controller');

// ✅ Wout PIBLIK (san otorizasyon, anvan middleware auth la)
router.get('/public/:token', ctrl.getPublic);

router.use(identifyTenant, authenticate, extractBranch);

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getOne);
// ⚠️ NOUVO — requireBranchForWrite anpeche kreye yon devi "san branch"
// lè admin an mòd Global (pandan tenant lan gen omwen yon branch)
router.post('/',                   authorize('admin', 'cashier'), requireBranchForWrite, ctrl.create);
router.put('/:id',                 authorize('admin', 'cashier'), ctrl.update);
router.patch('/:id/send',          authorize('admin', 'cashier'), ctrl.send);
router.patch('/:id/cancel',        authorize('admin'), ctrl.cancel);
router.post('/:id/convert',        authorize('admin', 'cashier'), ctrl.convertToInvoice);
router.post('/:id/share',          authorize('admin', 'cashier'), ctrl.share);
router.delete('/:id/share',        authorize('admin', 'cashier'), ctrl.revokeShare);

module.exports = router;
