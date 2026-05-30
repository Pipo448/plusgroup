const express = require('express');
const router = express.Router();
const {
  clientAuth,
  loginClient,
  getStatus,
  getPayments,
  renewSubscription
} = require('./internet.controller');

// Route piblik
router.post('/login', loginClient);

// Route prive — kliyan otantifye
router.get('/status', clientAuth, getStatus);
router.get('/payments', clientAuth, getPayments);

// Route admin — renouvèlman (ou ka ajoute adminAuth middleware ou la)
router.post('/renew', renewSubscription);

module.exports = router;