// src/modules/restaurant/restaurant.routes.js
// Wout STAFF (otantifye). Wout piblik kliyan yo nan restaurant.public.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./restaurant.controller');

router.use(identifyTenant, authenticate, extractBranch);

// ── Rezime, tablo bò, preferans
router.get('/summary', ctrl.getSummary);
router.get('/dashboard', ctrl.getDashboard);
router.get('/prefs', ctrl.getPrefs);
router.put('/prefs', authorize('admin'), ctrl.setPrefs);

// ── Vant ak rapò (sèvè pa ka anrejistre peman; kesye wè pwòp vant li sèlman)
router.post('/sales', authorize('admin', 'cashier'), ctrl.recordSale);
router.get('/sales/report', authorize('admin', 'cashier'), ctrl.getReport);

// ── Kategori meni
router.get('/menu/categories',        ctrl.getCategories);
router.post('/menu/categories',       authorize('admin', 'stock_manager'), ctrl.createCategory);
router.put('/menu/categories/:id',    authorize('admin', 'stock_manager'), ctrl.updateCategory);
router.delete('/menu/categories/:id', authorize('admin'), ctrl.deleteCategory);

// ── Meni
router.get('/menu',              ctrl.getMenu);
router.get('/menu/low-stock',    ctrl.getLowStock);
router.get('/menu/kinds',        ctrl.getMenuKinds);
// ── Yon sèl estòk: pwodui POS ki vann nan restoran an tou
router.get('/menu/search',              ctrl.searchMenu);
router.get('/menu/shared',              ctrl.listShared);
router.get('/menu/stock-search',        ctrl.searchStock);
router.post('/menu/shared',             authorize('admin', 'stock_manager'), ctrl.addShared);
router.patch('/menu/shared/:productId', authorize('admin', 'stock_manager'), ctrl.updateShared);
router.delete('/menu/shared/:productId', authorize('admin', 'stock_manager'), ctrl.removeShared);
router.post('/menu/import',      authorize('admin', 'stock_manager'), ctrl.importMenu);
router.post('/menu/dedupe',      authorize('admin'), ctrl.dedupeMenu);
router.get('/menu/job',          ctrl.menuJob);
router.get('/menu/:id',          ctrl.getMenuItem);
router.post('/menu',             authorize('admin', 'stock_manager'), ctrl.createMenuItem);
router.put('/menu/:id',          authorize('admin', 'stock_manager'), ctrl.updateMenuItem);
router.patch('/menu/:id/stock',  authorize('admin', 'stock_manager', 'cashier'), ctrl.adjustStock);
router.delete('/menu/:id',       authorize('admin'), ctrl.removeMenuItem);

// ── Paramèt pòtal kliyan
router.get('/portal/settings',   ctrl.getPortalSettings);
router.put('/portal/settings',   authorize('admin'), ctrl.savePortalSettings);

// ── Flyer meni (imaj) — admin + jesyonè estòk ka jere yo
router.get('/flyers',            ctrl.listFlyers);
router.get('/flyers/:id/image',  ctrl.flyerImage);
router.post('/flyers',           authorize('admin', 'stock_manager'), ctrl.addFlyer);
router.patch('/flyers/:id',      authorize('admin', 'stock_manager'), ctrl.updateFlyer);
router.delete('/flyers/:id',     authorize('admin', 'stock_manager'), ctrl.deleteFlyer);

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