// src/modules/direct-quotes/direct-quote.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./direct-quote.controller');

// ✅ Wout PIBLIK (san otorizasyon) — pou kliyan wè Devi Dirèk pataje a
router.get('/public/:token', ctrl.getPublic);

// ⬇️ Tout wout pi ba la egzije otorizasyon
router.use(identifyTenant, authenticate, extractBranch);

router.get('/',              ctrl.getAll);
router.get('/report',        ctrl.getReport);
// ✅ Admin konfigire pwòp PIN otorizasyon pa li
router.patch('/my-pin',      authorize('admin'), ctrl.setMyPin);
router.get('/:id',           ctrl.getOne);
// ✅ 'cashier' ka kreye tou — PIN otorizasyon an jere anndan sèvis la
router.post('/',             authorize('admin', 'cashier'), ctrl.create);
router.put('/:id',           authorize('admin', 'cashier'), ctrl.update);
router.patch('/:id/send',    authorize('admin', 'cashier'), ctrl.send);
router.patch('/:id/cancel',  authorize('admin'), ctrl.cancel);
router.post('/:id/convert',  authorize('admin', 'cashier'), ctrl.convertToInvoice);
router.post('/:id/share',    authorize('admin', 'cashier'), ctrl.share);
router.delete('/:id/share',  authorize('admin', 'cashier'), ctrl.revokeShare);

module.exports = router;
