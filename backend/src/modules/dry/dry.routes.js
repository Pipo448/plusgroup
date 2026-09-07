// src/modules/dry/dry.routes.js
const express = require('express')
const router  = express.Router()
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth')
const { extractBranch } = require('../../middleware/branch')
const ctrl = require('./dry.controller')

router.use(identifyTenant, authenticate, extractBranch)

router.get('/',                ctrl.getAll)
router.get('/catalog',         ctrl.getCatalog)
router.get('/dashboard',       ctrl.getDashboard)
router.post('/',               authorize('admin', 'cashier'), ctrl.create)
router.post('/catalog',        authorize('admin'), ctrl.createCatalogItem)
router.patch('/catalog/:id',   authorize('admin'), ctrl.updateCatalogItem)
router.delete('/catalog/:id',  authorize('admin'), ctrl.deleteCatalogItem)
router.get('/:id',             ctrl.getOne)
router.patch('/:id/status',    authorize('admin', 'cashier'), ctrl.updateStatus)
router.post('/:id/payment',    authorize('admin', 'cashier'), ctrl.addPayment)

module.exports = router
