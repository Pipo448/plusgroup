// src/modules/internet/internet.controller.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const {
  getHotspotUser,
  getActiveSession,
  renewClient,
} = require('./mikrotikService');

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════
// MIDDLEWARE: otantifikasyon kliyan internet (app kliyan)
// ══════════════════════════════════════════════════════════
function clientAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Pa otorize' });
  try {
    req.client = jwt.verify(token, process.env.CLIENT_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

// ══════════════════════════════════════════════════════════
// LOGIN KLIYAN — App internet.plusgroupe.com
// ══════════════════════════════════════════════════════════
async function loginClient(req, res) {
  const { username, password } = req.body;
  try {
    const client = await prisma.internet_clients.findFirst({
      where: { mikrotik_username: username },
      include: { tenant: true }
    });
    if (!client || client.mikrotik_password !== password) {
      return res.status(401).json({ error: 'Non itilizatè oswa modpas enkòrèk' });
    }
    const token = jwt.sign(
      {
        id:                 client.id,
        username:           client.mikrotik_username,
        internet_tenant_id: client.internet_tenant_id
      },
      process.env.CLIENT_JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      client: {
        full_name: client.full_name,
        phone:     client.phone,
        plan_name: client.plan_name,
        isp_name:  client.tenant?.name || 'PLUS INTERNET'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// ESTATI — Mikrotik (app kliyan)
// ══════════════════════════════════════════════════════════
async function getStatus(req, res) {
  try {
    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: req.client.internet_tenant_id }
    });
    if (!config) {
      return res.json({ userInfo: null, session: null, message: 'Mikrotik pa konfigire encore' });
    }
    const [userInfo, session] = await Promise.all([
      getHotspotUser(config, req.client.username),
      getActiveSession(config, req.client.username)
    ]);
    res.json({ userInfo, session });
  } catch (err) {
    res.json({ userInfo: null, session: null, error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// PEMAN KLIYAN — Istorik (app kliyan)
// ══════════════════════════════════════════════════════════
async function getClientPayments(req, res) {
  try {
    const payments = await prisma.internet_payments.findMany({
      where:   { client_id: req.client.id },
      orderBy: { paid_at: 'desc' },
      take:    20
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — ISP CRUD
// ══════════════════════════════════════════════════════════
async function getISPs(req, res) {
  try {
    const isps = await prisma.internet_tenants.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { clients: true } } }
    });
    res.json({ isps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createISP(req, res) {
  try {
    const { name, owner_name, phone, email, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Non ak slug obligatwa' });
    const existing = await prisma.internet_tenants.findFirst({ where: { slug } });
    if (existing) return res.status(400).json({ error: 'Slug sa a deja egziste' });
    const isp = await prisma.internet_tenants.create({
      data: { name, owner_name, phone, email, slug }
    });
    res.status(201).json({ isp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateISP(req, res) {
  try {
    const { id } = req.params;
    const { name, owner_name, phone, email, active } = req.body;
    const isp = await prisma.internet_tenants.update({
      where: { id: parseInt(id) },
      data:  { name, owner_name, phone, email, active }
    });
    res.json({ isp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteISP(req, res) {
  try {
    const { id } = req.params;
    await prisma.internet_tenants.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — KLIYAN CRUD
// ══════════════════════════════════════════════════════════
async function getClients(req, res) {
  try {
    const { isp_id, search } = req.query;
    const where = {};
    if (isp_id) where.internet_tenant_id = parseInt(isp_id);
    if (search) {
      where.OR = [
        { full_name:         { contains: search, mode: 'insensitive' } },
        { phone:             { contains: search } },
        { mikrotik_username: { contains: search, mode: 'insensitive' } },
      ];
    }
    const clients = await prisma.internet_clients.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { tenant: { select: { name: true } } }
    });
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createClient(req, res) {
  try {
    const { internet_tenant_id, full_name, phone, email, mikrotik_username, mikrotik_password, plan_name } = req.body;
    if (!full_name || !mikrotik_username || !mikrotik_password) {
      return res.status(400).json({ error: 'Non, username ak modpas obligatwa' });
    }
    const existing = await prisma.internet_clients.findFirst({ where: { mikrotik_username } });
    if (existing) return res.status(400).json({ error: 'Username sa a deja egziste' });
    const client = await prisma.internet_clients.create({
      data: {
        internet_tenant_id: internet_tenant_id ? parseInt(internet_tenant_id) : null,
        full_name, phone, email, mikrotik_username, mikrotik_password, plan_name
      }
    });
    res.status(201).json({ client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { full_name, phone, email, mikrotik_password, plan_name, internet_tenant_id } = req.body;
    const client = await prisma.internet_clients.update({
      where: { id: parseInt(id) },
      data:  {
        full_name, phone, email, mikrotik_password, plan_name,
        internet_tenant_id: internet_tenant_id ? parseInt(internet_tenant_id) : undefined
      }
    });
    res.json({ client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteClient(req, res) {
  try {
    const { id } = req.params;
    await prisma.internet_clients.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — RENOUVLE ABÒNMAN
// ══════════════════════════════════════════════════════════
async function renewSubscription(req, res) {
  const { client_id, new_profile, amount, duration_days } = req.body;
  try {
    const client = await prisma.internet_clients.findUnique({ where: { id: client_id } });
    if (!client) return res.status(404).json({ error: 'Kliyan pa jwenn' });

    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: client.internet_tenant_id }
    });
    if (config) await renewClient(config, client.mikrotik_username, new_profile);

    await prisma.internet_payments.create({
      data: {
        internet_tenant_id: client.internet_tenant_id,
        client_id:          client.id,
        amount,
        plan_name:          new_profile,
        duration_days,
        renewed_by:         'admin'
      }
    });

    await prisma.internet_clients.update({
      where: { id: client_id },
      data:  { plan_name: new_profile }
    });

    res.json({ success: true, message: 'Abònman renouvle ak siksè' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — MIKROTIK CONFIG
// ══════════════════════════════════════════════════════════
async function getMikrotikConfig(req, res) {
  try {
    const { isp_id } = req.query;
    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: parseInt(isp_id) }
    });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function saveMikrotikConfig(req, res) {
  try {
    const { isp_id, host, port, username, password, use_ssl } = req.body;
    if (!isp_id) return res.status(400).json({ error: 'isp_id obligatwa' });
    const existing = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: parseInt(isp_id) }
    });
    const data = { host, port: parseInt(port) || 8728, username, password, use_ssl: !!use_ssl };
    let config;
    if (existing) {
      config = await prisma.mikrotik_config.update({ where: { id: existing.id }, data });
    } else {
      config = await prisma.mikrotik_config.create({
        data: { ...data, internet_tenant_id: parseInt(isp_id) }
      });
    }
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function testMikrotikConfig(req, res) {
  try {
    const { isp_id } = req.body;
    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: parseInt(isp_id) }
    });
    if (!config) return res.status(404).json({ error: 'Pa gen konfigirasyon Mikrotik' });
    const { RouterOSAPI } = require('node-routeros');
    const conn = new RouterOSAPI({
      host: config.host, user: config.username,
      password: config.password, port: config.port || 8728,
    });
    await conn.connect();
    await conn.close();
    res.json({ success: true, message: 'Koneksyon Mikrotik reyisi!' });
  } catch (err) {
    res.status(500).json({ error: `Koneksyon echwe: ${err.message}` });
  }
}

// ============================================================
// AJOUTE SA NAN internet.controller.js
// Anba dènye fonksyon yo, anvan module.exports
// ============================================================

// ══════════════════════════════════════════════════════════
// SUPER ADMIN — Mete ajou ISP ak manager credentials
// ══════════════════════════════════════════════════════════
// npm install bcryptjs  ← fò ou enstale sa nan backend
const bcrypt = require('bcryptjs')

async function setISPManager(req, res) {
  try {
    const { id } = req.params
    const { manager_name, manager_email, manager_password } = req.body

    if (!manager_email || !manager_password) {
      return res.status(400).json({ error: 'Email ak modpas obligatwa' })
    }

    // Verifye email pa deja pran pa yon lòt ISP
    const existing = await prisma.internet_tenants.findFirst({
      where: { manager_email, NOT: { id: parseInt(id) } }
    })
    if (existing) return res.status(400).json({ error: 'Email sa a deja itilize' })

    const hash = await bcrypt.hash(manager_password, 10)

    const isp = await prisma.internet_tenants.update({
      where: { id: parseInt(id) },
      data:  { manager_name, manager_email, manager_password: hash }
    })
    res.json({ success: true, isp: { id: isp.id, name: isp.name, manager_email: isp.manager_email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// MANAGER — Login (James)
// ══════════════════════════════════════════════════════════
async function managerLogin(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ak modpas obligatwa' })
    }

    const isp = await prisma.internet_tenants.findFirst({
      where: { manager_email: email }
    })

    if (!isp || !isp.manager_password) {
      return res.status(401).json({ error: 'Email oswa modpas enkòrèk' })
    }

    if (!isp.active) {
      return res.status(403).json({ error: 'Kont ou dezaktive. Kontakte PLUS INTERNET.' })
    }

    const valid = await bcrypt.compare(password, isp.manager_password)
    if (!valid) {
      return res.status(401).json({ error: 'Email oswa modpas enkòrèk' })
    }

    const token = jwt.sign(
      {
        isp_id:       isp.id,
        isp_name:     isp.name,
        manager_email: isp.manager_email,
        manager_name:  isp.manager_name,
        role:          'isp_manager'
      },
      process.env.CLIENT_JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      manager: {
        isp_id:   isp.id,
        isp_name: isp.name,
        name:     isp.manager_name,
        email:    isp.manager_email,
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// MIDDLEWARE — Manager otantifye
// ══════════════════════════════════════════════════════════
function managerAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Pa otorize' })
  try {
    const decoded = jwt.verify(token, process.env.CLIENT_JWT_SECRET)
    if (decoded.role !== 'isp_manager') {
      return res.status(403).json({ error: 'Aksè refize' })
    }
    req.manager = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

// ══════════════════════════════════════════════════════════
// MANAGER — Dashboard stats
// ══════════════════════════════════════════════════════════
async function getManagerStats(req, res) {
  try {
    const isp_id = req.manager.isp_id

    const [totalClients, isp] = await Promise.all([
      prisma.internet_clients.count({ where: { internet_tenant_id: isp_id } }),
      prisma.internet_tenants.findUnique({
        where: { id: isp_id },
        include: {
          configs: true,
          _count: { select: { clients: true } }
        }
      })
    ])

    // Total peman mwa sa a
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthPayments = await prisma.internet_payments.aggregate({
      where: {
        internet_tenant_id: isp_id,
        paid_at: { gte: firstOfMonth }
      },
      _sum: { amount: true },
      _count: true
    })

    res.json({
      isp_name:     isp.name,
      total_clients: totalClients,
      has_mikrotik:  isp.configs.length > 0,
      month_revenue: monthPayments._sum.amount || 0,
      month_renewals: monthPayments._count || 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// MANAGER — Kliyan pa zòn li (CRUD)
// ══════════════════════════════════════════════════════════
async function getManagerClients(req, res) {
  try {
    const { search } = req.query
    const where = { internet_tenant_id: req.manager.isp_id }
    if (search) {
      where.OR = [
        { full_name:         { contains: search, mode: 'insensitive' } },
        { phone:             { contains: search } },
        { mikrotik_username: { contains: search, mode: 'insensitive' } },
      ]
    }
    const clients = await prisma.internet_clients.findMany({
      where,
      orderBy: { created_at: 'desc' }
    })
    res.json({ clients })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function createManagerClient(req, res) {
  try {
    const { full_name, phone, email, mikrotik_username, mikrotik_password, plan_name } = req.body
    if (!full_name || !mikrotik_username || !mikrotik_password) {
      return res.status(400).json({ error: 'Non, username ak modpas obligatwa' })
    }
    const existing = await prisma.internet_clients.findFirst({ where: { mikrotik_username } })
    if (existing) return res.status(400).json({ error: 'Username sa a deja egziste' })

    const client = await prisma.internet_clients.create({
      data: {
        internet_tenant_id: req.manager.isp_id,
        full_name, phone, email, mikrotik_username, mikrotik_password, plan_name
      }
    })
    res.status(201).json({ client })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function updateManagerClient(req, res) {
  try {
    const { id } = req.params
    // Verifye kliyan an se pa zòn manadjè a
    const existing = await prisma.internet_clients.findFirst({
      where: { id: parseInt(id), internet_tenant_id: req.manager.isp_id }
    })
    if (!existing) return res.status(404).json({ error: 'Kliyan pa jwenn' })

    const { full_name, phone, email, mikrotik_password, plan_name } = req.body
    const client = await prisma.internet_clients.update({
      where: { id: parseInt(id) },
      data:  { full_name, phone, email, mikrotik_password, plan_name }
    })
    res.json({ client })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function deleteManagerClient(req, res) {
  try {
    const { id } = req.params
    const existing = await prisma.internet_clients.findFirst({
      where: { id: parseInt(id), internet_tenant_id: req.manager.isp_id }
    })
    if (!existing) return res.status(404).json({ error: 'Kliyan pa jwenn' })

    await prisma.internet_clients.delete({ where: { id: parseInt(id) } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = {
  clientAuth,
  loginClient,
  getStatus,
  getClientPayments,
  getISPs, createISP, updateISP, deleteISP,
  getClients, createClient, updateClient, deleteClient,
  renewSubscription,
  getMikrotikConfig, saveMikrotikConfig, testMikrotikConfig,
  setISPManager, managerLogin, managerAuth,
  getManagerStats, getManagerClients,
  createManagerClient, updateManagerClient, deleteManagerClient,
};
