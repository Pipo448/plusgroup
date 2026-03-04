// backend/src/modules/kane-epay/kane-epay.routes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('./kane-epay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')

// Tout rout yo pwoteje
router.use(identifyTenant, authenticate)

router.get('/',              ctrl.getAccounts)
router.get('/stats',         ctrl.getStats)
router.get('/:id',           ctrl.getAccount)
router.post('/',             ctrl.createAccount)
router.post('/:id/deposit',  ctrl.deposit)
router.post('/:id/withdraw', ctrl.withdraw)

module.exports = router
