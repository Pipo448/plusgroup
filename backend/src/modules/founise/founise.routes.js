// src/modules/founise/founise.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const { extractBranch } = require('../../middleware/branch');
const ctrl = require('./founise.controller');

router.use(identifyTenant, authenticate, extractBranch);

// Kapital
router.get('/kapital', ctrl.getKapital);
router.get('/kapital/mouvman', ctrl.getKapitalMouvman);
router.post('/kapital/enjeksyon', ctrl.postKapitalEnjeksyon);

// Founisè
router.get('/founise', ctrl.getFounise);
router.post('/founise', ctrl.postFounise);
router.put('/founise/:id', ctrl.putFounise);

// Achte
router.get('/achte', ctrl.getAchte);
router.post('/achte', ctrl.postAchte);
// ✅ NOUVO — plizyè liy achte pou menm founisè a
router.post('/achte/batch', ctrl.postAchteBatch);

module.exports = router;
