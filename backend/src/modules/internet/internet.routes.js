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
  hotspotLogin, hotspotLogout,
  getPlans, createPlan, updatePlan, deletePlan,
  getHotspotMessage, saveHotspotMessage, getPublicHotspotMessage,
} = require('./internet.controller');

// ══════════════════════════════════════════════════════════
// HOTSPOT — Captive Portal
// ══════════════════════════════════════════════════════════
router.get('/hotspot', (req, res) => {
  const { mac, ip, username } = req.query
  res.json({ status: 'hotspot', mac, ip, username })
})
router.post('/hotspot/login',   hotspotLogin);
router.post('/hotspot/logout',  hotspotLogout);
router.get('/hotspot/message',  getPublicHotspotMessage);  // ✅ Public — paj hotspot chaje mesaj

// ══════════════════════════════════════════════════════════
// APP KLIYAN — Public
// ══════════════════════════════════════════════════════════
router.post('/login', loginClient);

// ══════════════════════════════════════════════════════════
// APP KLIYAN — Prive (token kliyan)
// ══════════════════════════════════════════════════════════
router.get('/status',   clientAuth, getStatus);
router.get('/payments', clientAuth, getClientPayments);

// ══════════════════════════════════════════════════════════
// SUPER ADMIN — ISP CRUD
// ══════════════════════════════════════════════════════════
router.get('/isps',               getISPs);
router.post('/isps',              createISP);
router.put('/isps/:id',           updateISP);
router.delete('/isps/:id',        deleteISP);
router.patch('/isps/:id/manager', setISPManager);

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
// MANAGER — Auth
// ══════════════════════════════════════════════════════════
router.post('/manager/login', managerLogin);

// ══════════════════════════════════════════════════════════
// MANAGER — Dashboard
// ══════════════════════════════════════════════════════════
router.get('/manager/stats', managerAuth, getManagerStats);

// ══════════════════════════════════════════════════════════
// MANAGER — Kliyan zòn li sèlman
// ══════════════════════════════════════════════════════════
router.get('/manager/clients',        managerAuth, getManagerClients);
router.post('/manager/clients',       managerAuth, createManagerClient);
router.put('/manager/clients/:id',    managerAuth, updateManagerClient);
router.delete('/manager/clients/:id', managerAuth, deleteManagerClient);

// ══════════════════════════════════════════════════════════
// MANAGER — Mikrotik estati (li sèlman)
// ══════════════════════════════════════════════════════════
router.get('/manager/mikrotik-config', managerAuth, async (req, res) => {
  const prisma = require('../../config/prisma')
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

// ══════════════════════════════════════════════════════════
// MANAGER — Mesaj Hotspot ✅
// ══════════════════════════════════════════════════════════
router.get('/manager/hotspot-message',  managerAuth, getHotspotMessage);
router.post('/manager/hotspot-message', managerAuth, saveHotspotMessage);

// ══════════════════════════════════════════════════════════
// PLANS — Admin ak Manager
// ══════════════════════════════════════════════════════════
router.get('/plans',        managerAuth, getPlans);
router.post('/plans',       managerAuth, createPlan);
router.put('/plans/:id',    managerAuth, updatePlan);
router.delete('/plans/:id', managerAuth, deletePlan);

module.exports = router;