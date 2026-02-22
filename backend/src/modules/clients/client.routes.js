// src/modules/clients/client.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./client.controller');

router.use(identifyTenant, authenticate);

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getOne);
router.post('/',      ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
