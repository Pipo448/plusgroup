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
  setISPManager, managerLogin, managerAuth,
  getManagerStats, getManagerClients,
  createManagerClient, updateManagerClient, deleteManagerClient,
} = require('./internet.controller');

// ══════════════════════════════════════════════════════════
// APP KLIYAN — Public
// ══════════════════════════════════════════════════════════
router.post('/login',    loginClient);

// ══════════════════════════════════════════════════════════
// APP KLIYAN — Prive (token kliyan)
// ══════════════════════════════════════════════════════════
router.get('/status',    clientAuth, getStatus);
router.get('/payments',  clientAuth, getClientPayments);

// ══════════════════════════════════════════════════════════
// SUPER ADMIN — ISP CRUD
// ══════════════════════════════════════════════════════════
router.get('/isps',            getISPs);
router.post('/isps',           createISP);
router.put('/isps/:id',        updateISP);
router.delete('/isps/:id',     deleteISP);
router.patch('/isps/:id/manager', setISPManager);  // ✅ Set manager credentials

// ══════════════════════════════════════════════════════════
// SUPER ADMIN — Kliyan CRUD
// ══════════════════════════════════════════════════════════
router.get('/clients',         getClients);
router.post('/clients',        createClient);
router.put('/clients/:id',     updateClient);
router.delete('/clients/:id',  deleteClient);
router.post('/renew',          renewSubscription);

// ══════════════════════════════════════════════════════════
// SUPER ADMIN — Mikrotik config
// ══════════════════════════════════════════════════════════
router.get('/mikrotik-config',        getMikrotikConfig);
router.post('/mikrotik-config',       saveMikrotikConfig);
router.post('/mikrotik-config/test',  testMikrotikConfig);

// ══════════════════════════════════════════════════════════
// MANAGER — Auth (James login)
// ══════════════════════════════════════════════════════════
router.post('/manager/login', managerLogin);

// ══════════════════════════════════════════════════════════
// MANAGER — Dashboard (token manadjè)
// ══════════════════════════════════════════════════════════
router.get('/manager/stats',           managerAuth, getManagerStats);

// ══════════════════════════════════════════════════════════
// MANAGER — Kliyan zòn li sèlman
// ══════════════════════════════════════════════════════════
router.get('/manager/clients',         managerAuth, getManagerClients);
router.post('/manager/clients',        managerAuth, createManagerClient);
router.put('/manager/clients/:id',     managerAuth, updateManagerClient);
router.delete('/manager/clients/:id',  managerAuth, deleteManagerClient);

// ══════════════════════════════════════════════════════════
// MANAGER — Mikrotik estati (li sèlman, pa edite)
// ══════════════════════════════════════════════════════════
router.get('/manager/mikrotik-config', managerAuth, async (req, res) => {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: req.manager.isp_id }
    })
    res.json(config
      ? { connected: true,  host: config.host }
      : { connected: false, host: null }
    )
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
});

module.exports = router;