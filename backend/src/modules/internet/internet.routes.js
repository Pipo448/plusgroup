// src/modules/internet/internet.routes.js
const express = require('express');
const router  = express.Router();
const {
  clientAuth,
  loginClient, getStatus, getClientPayments,
  getISPs, createISP, updateISP, deleteISP,
  getClients, createClient, updateClient, deleteClient,
  renewSubscription,
  getMikrotikConfig, saveMikrotikConfig, testMikrotikConfig,
} = require('./internet.controller');

// ── App kliyan (public) ──────────────────────────────────
router.post('/login',    loginClient);

// ── App kliyan (prive) ──────────────────────────────────
router.get('/status',    clientAuth, getStatus);
router.get('/payments',  clientAuth, getClientPayments);

// ── Admin — ISP ──────────────────────────────────────────
router.get('/isps',         getISPs);
router.post('/isps',        createISP);
router.put('/isps/:id',     updateISP);
router.delete('/isps/:id',  deleteISP);

// ── Admin — Kliyan ───────────────────────────────────────
router.get('/clients',          getClients);
router.post('/clients',         createClient);
router.put('/clients/:id',      updateClient);
router.delete('/clients/:id',   deleteClient);
router.post('/renew',           renewSubscription);

// ── Admin — Mikrotik config ──────────────────────────────
router.get('/mikrotik-config',        getMikrotikConfig);
router.post('/mikrotik-config',       saveMikrotikConfig);
router.post('/mikrotik-config/test',  testMikrotikConfig);

module.exports = router;
