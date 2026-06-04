// ============================================================
// src/modules/quotes/quote.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./quote.controller');

// ✅ NOUVO — Wout PIBLIK (san otorizasyon, anvan middleware auth la)
// Kliyan ka klike sou lyen sa san pou l konekte
router.get('/public/:token', ctrl.getPublic);

// ⬇️ Tout wout pi ba la egzije otorizasyon
router.use(identifyTenant, authenticate, extractBranch);

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getOne);
router.post('/',                   authorize('admin', 'cashier'), ctrl.create);
router.put('/:id',                 authorize('admin', 'cashier'), ctrl.update);
router.patch('/:id/send',          authorize('admin', 'cashier'), ctrl.send);
router.patch('/:id/cancel',        authorize('admin'), ctrl.cancel);
router.post('/:id/convert',        authorize('admin', 'cashier'), ctrl.convertToInvoice);
// ✅ NOUVO — Jenere yon lyen piblik (ekspire nan 24è)
router.post('/:id/share',          authorize('admin', 'cashier'), ctrl.share);
// ✅ NOUVO — Revoke lyen piblik (mete fini imedyatman)
router.delete('/:id/share',        authorize('admin', 'cashier'), ctrl.revokeShare);

module.exports = router;
