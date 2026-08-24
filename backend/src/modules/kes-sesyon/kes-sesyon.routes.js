// src/modules/kes-sesyon/kes-sesyon.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const ctrl = require('./kes-sesyon.controller');

router.use(identifyTenant, authenticate);

router.get('/aktif',      ctrl.getAktif);
router.post('/louvri',    ctrl.postLouvri);
router.post('/:id/femen', ctrl.postFemen);
router.get('/',           ctrl.getAll);

module.exports = router;
