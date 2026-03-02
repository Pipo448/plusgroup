// ============================================================
// src/modules/products/product.routes.js
// ============================================================
const express  = require('express');
const router   = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const ctrl     = require('./product.controller');

// Tous les produits nécessitent tenant + auth
router.use(identifyTenant, authenticate);

// ✅ FIX: Categories ANVAN /:id — sinon Express pran "categories" kòm yon :id
router.get('/categories',        ctrl.getCategories);
router.post('/categories',       authorize('admin', 'stock_manager'), ctrl.createCategory);
router.put('/categories/:id',    authorize('admin', 'stock_manager'), ctrl.updateCategory);
router.delete('/categories/:id', authorize('admin'), ctrl.deleteCategory);

// Lòt routes pwodui
router.get('/',          ctrl.getAll);
router.get('/low-stock', ctrl.getLowStock);
router.get('/:id',       ctrl.getOne);
router.post('/',         authorize('admin', 'stock_manager'), ctrl.create);
router.put('/:id',       authorize('admin', 'stock_manager'), ctrl.update);
router.delete('/:id',    authorize('admin'), ctrl.remove);

module.exports = router;
