// src/modules/restaurant/restaurant.routes.js
// Wout STAFF (otantifye). Wout piblik kliyan yo nan restaurant.public.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./restaurant.controller');

router.use(identifyTenant, authenticate, extractBranch);

// ── Rezime
router.get('/summary', ctrl.getSummary);

// ── Kategori meni
router.get('/menu/categories',        ctrl.getCategories);
router.post('/menu/categories',       authorize('admin', 'stock_manager'), ctrl.createCategory);
router.put('/menu/categories/:id',    authorize('admin', 'stock_manager'), ctrl.updateCategory);
router.delete('/menu/categories/:id', authorize('admin'), ctrl.deleteCategory);

// ── Meni
router.get('/menu',              ctrl.getMenu);
router.get('/menu/low-stock',    ctrl.getLowStock);
router.get('/menu/:id',          ctrl.getMenuItem);
router.post('/menu',             authorize('admin', 'stock_manager'), ctrl.createMenuItem);
router.put('/menu/:id',          authorize('admin', 'stock_manager'), ctrl.updateMenuItem);
router.patch('/menu/:id/stock',  authorize('admin', 'stock_manager', 'cashier'), ctrl.adjustStock);
router.delete('/menu/:id',       authorize('admin'), ctrl.removeMenuItem);

// ── Paramèt pòtal kliyan
router.get('/portal/settings',   ctrl.getPortalSettings);
router.put('/portal/settings',   authorize('admin'), ctrl.savePortalSettings);

// ── Kòmand an liy
router.get('/online-orders',               ctrl.listOnlineOrders);
router.get('/online-orders/count',         ctrl.countNewOrders);
router.patch('/online-orders/:id/status',  ctrl.updateOrderStatus);
router.patch('/online-orders/:id/invoice', ctrl.linkOrderInvoice);

// ── Rezèvasyon
router.get('/reservations',        ctrl.listReservations);
router.post('/reservations',       ctrl.createReservation);
router.patch('/reservations/:id',  ctrl.updateReservation);

module.exports = router;
