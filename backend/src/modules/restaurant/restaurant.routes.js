// src/modules/restaurant/restaurant.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./restaurant.controller');

router.use(identifyTenant, authenticate, extractBranch);

router.get('/menu/categories',        ctrl.getCategories);
router.post('/menu/categories',       authorize('admin', 'stock_manager'), ctrl.createCategory);
router.put('/menu/categories/:id',    authorize('admin', 'stock_manager'), ctrl.updateCategory);
router.delete('/menu/categories/:id', authorize('admin'), ctrl.deleteCategory);

router.get('/menu',              ctrl.getMenu);
router.get('/menu/low-stock',    ctrl.getLowStock);
router.get('/menu/:id',          ctrl.getMenuItem);
router.post('/menu',             authorize('admin', 'stock_manager'), ctrl.createMenuItem);
router.put('/menu/:id',          authorize('admin', 'stock_manager'), ctrl.updateMenuItem);
router.patch('/menu/:id/stock',  authorize('admin', 'stock_manager', 'cashier'), ctrl.adjustStock);
router.delete('/menu/:id',       authorize('admin'), ctrl.removeMenuItem);

module.exports = router;
