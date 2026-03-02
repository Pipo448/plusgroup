// src/modules/invoices/invoice.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./invoice.controller');

router.use(identifyTenant, authenticate);

router.get('/',              ctrl.getAll);
router.get('/dashboard',     ctrl.getDashboard);
router.get('/:id',           ctrl.getOne);
router.get('/:id/pdf',       ctrl.downloadPDF);
router.patch('/:id/cancel',  authorize('admin'), ctrl.cancel);
router.post('/:id/payment',  authorize('admin', 'cashier'), ctrl.addPayment);
// ✅ NOUVO: Kreye fakti direk san devi
router.post('/direct',       authorize('admin', 'cashier'), ctrl.createDirect);

module.exports = router;
