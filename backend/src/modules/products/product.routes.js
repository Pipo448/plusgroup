// src/modules/products/product.routes.js
const express  = require('express');
const router   = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch'); // ⚠️ NOUVO
const ctrl     = require('./product.controller');
const { notifyEmployeeAction } = require('../helpers/notification.helper');

// ⚠️ KORIJE — ajoute extractBranch pou li X-Branch-Id header
router.use(identifyTenant, authenticate, extractBranch);

router.get('/categories',        ctrl.getCategories);
router.post('/categories',       authorize('admin', 'stock_manager'), ctrl.createCategory);
router.put('/categories/:id',    authorize('admin', 'stock_manager'), ctrl.updateCategory);
router.delete('/categories/:id', authorize('admin'), ctrl.deleteCategory);

router.get('/',          ctrl.getAll);
router.get('/low-stock', ctrl.getLowStock);
router.get('/:id',       ctrl.getOne);
router.post('/',         authorize('admin', 'stock_manager'), ctrl.create);
router.put('/:id',       authorize('admin', 'stock_manager'), ctrl.update);
router.delete('/:id',    authorize('admin'), ctrl.remove);

module.exports = router;
