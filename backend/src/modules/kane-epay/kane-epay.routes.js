// backend/src/modules/kane-epay/kane-epay.routes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('./kane-epay.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')
const { extractBranch } = require('../../middleware/branch')

router.use(identifyTenant, authenticate, extractBranch)

router.get('/',                           ctrl.getAccounts)
router.get('/stats',                      ctrl.getStats)
router.get('/:id',                        ctrl.getAccount)
router.post('/',                          ctrl.createAccount)
router.post('/:id/deposit',               ctrl.deposit)
router.post('/:id/withdraw',              ctrl.withdraw)

// ✅ Admin sèlman
router.delete('/transactions/:txId',      ctrl.deleteTransaction)
router.delete('/:id',                     ctrl.deleteAccount)

module.exports = router