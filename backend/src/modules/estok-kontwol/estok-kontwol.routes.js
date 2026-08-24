// src/modules/estok-kontwol/estok-kontwol.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const ctrl = require('./estok-kontwol.controller');

router.use(identifyTenant, authenticate);

router.post('/', ctrl.post);
router.get('/',  ctrl.getAll);

module.exports = router;
