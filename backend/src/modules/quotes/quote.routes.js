// ============================================================
// src/modules/quotes/quote.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./quote.controller');

router.use(identifyTenant, authenticate);

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getOne);
router.post('/',                   authorize('admin', 'cashier'), ctrl.create);
router.put('/:id',                 authorize('admin', 'cashier'), ctrl.update);
router.patch('/:id/send',          authorize('admin', 'cashier'), ctrl.send);
router.patch('/:id/cancel',        authorize('admin'), ctrl.cancel);
router.post('/:id/convert',        authorize('admin', 'cashier'), ctrl.convertToInvoice);

module.exports = router;
