// src/modules/restaurant-tables/restaurant-tables.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./restaurant-tables.controller');

router.use(identifyTenant, authenticate, extractBranch);

// Tab
router.get('/tables',        ctrl.getTables);
router.post('/tables',       authorize('admin', 'cashier'), ctrl.postTable);
router.put('/tables/:id',    authorize('admin', 'cashier'), ctrl.putTable);

// Kòmand
router.post('/tables/:tableId/open', ctrl.postOpenOrder);
router.get('/orders/:id',            ctrl.getOrder);
router.post('/orders/:id/items',     ctrl.postItems);
router.delete('/orders/:id/items/:itemId', ctrl.deleteItem);
router.post('/orders/:id/send-kitchen', ctrl.postSendKitchen);
// ✅ Sèvè (role "server") ka louvri tab, ajoute plat epi voye kizin; se kesye
// oswa admin SÈLMAN ki ka fèmen tab la (peman) oswa anile kòmand lan.
router.post('/orders/:id/close',     authorize('admin', 'cashier'), ctrl.postClose);
router.post('/orders/:id/cancel',    authorize('admin', 'cashier'), ctrl.postCancel);

module.exports = router;
