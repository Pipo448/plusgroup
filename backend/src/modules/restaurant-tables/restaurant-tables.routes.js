// src/modules/restaurant-tables/restaurant-tables.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./restaurant-tables.controller');

router.use(identifyTenant, authenticate, extractBranch);

// Tab
router.get('/tables',        ctrl.getTables);
router.post('/tables',       ctrl.postTable);
router.put('/tables/:id',    ctrl.putTable);

// Kòmand
router.post('/tables/:tableId/open', ctrl.postOpenOrder);
router.get('/orders/:id',            ctrl.getOrder);
router.post('/orders/:id/items',     ctrl.postItems);
router.delete('/orders/:id/items/:itemId', ctrl.deleteItem);
router.post('/orders/:id/send-kitchen', ctrl.postSendKitchen);
router.post('/orders/:id/close',     ctrl.postClose);
router.post('/orders/:id/cancel',    ctrl.postCancel);

module.exports = router;
