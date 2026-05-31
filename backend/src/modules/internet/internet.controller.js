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

// ── Helper: jenere username otomatikman depi non kliyan ──
function generateUsername(fullName) {
  const base = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10)
  return base + Math.floor(10 + Math.random() * 90)
}

async function getUniqueUsername(fullName) {
  let username = generateUsername(fullName)
  let existing = await prisma.internet_clients.findFirst({ where: { mikrotik_username: username } })
  while (existing) {
    username = generateUsername(fullName)
    existing = await prisma.internet_clients.findFirst({ where: { mikrotik_username: username } })
  }
  return username
}

async function createClient(req, res) {
  try {
    let { internet_tenant_id, full_name, phone, email, mikrotik_username, mikrotik_password, plan_name } = req.body;
    if (!full_name) return res.status(400).json({ error: 'Non kliyan obligatwa' });
    if (!mikrotik_password) return res.status(400).json({ error: 'Modpas obligatwa' });

    if (!mikrotik_username || !mikrotik_username.trim()) {
      mikrotik_username = await getUniqueUsername(full_name)
    } else {
      const existing = await prisma.internet_clients.findFirst({ where: { mikrotik_username } });
      if (existing) return res.status(400).json({ error: 'ID sa a deja egziste' });
    }

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
    let { full_name, phone, email, mikrotik_username, mikrotik_password, plan_name } = req.body
    if (!full_name) return res.status(400).json({ error: 'Non kliyan obligatwa' })
    if (!mikrotik_password) return res.status(400).json({ error: 'Modpas obligatwa' })

    if (!mikrotik_username || !mikrotik_username.trim()) {
      mikrotik_username = await getUniqueUsername(full_name)
    } else {
      const existing = await prisma.internet_clients.findFirst({ where: { mikrotik_username } })
      if (existing) return res.status(400).json({ error: 'ID sa a deja egziste' })
    }

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

// ── Ajoute nan internet.controller.js anvan module.exports ──

// ══════════════════════════════════════════════════════════
// HOTSPOT LOGIN — Kliyan antre ID pou konekte WiFi
// ══════════════════════════════════════════════════════════
async function hotspotLogin(req, res) {
  const { username, password, mac, ip, isp_slug } = req.body
  try {
    // 1. Jwenn kliyan an
    const client = await prisma.internet_clients.findFirst({
      where: { mikrotik_username: username },
      include: { tenant: true }
    })

    if (!client) {
      return res.status(401).json({ error: 'ID pa rekonèt. Kontakte sipò.' })
    }

    // 2. Verifye modpas (si yo itilize modpas)
    if (password && client.mikrotik_password !== password) {
      return res.status(401).json({ error: 'ID oswa modpas enkòrèk.' })
    }

    // 3. Jwenn config Mikrotik ISP la
    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: client.internet_tenant_id }
    })

    if (!config) {
      return res.status(500).json({ error: 'Sistèm pa konfigire. Kontakte PLUS INTERNET.' })
    }

    // 4. Di Mikrotik bay kliyan an aksè
    const { RouterOSAPI } = require('node-routeros')
    const conn = new RouterOSAPI({
      host: config.host, user: config.username,
      password: config.password, port: config.port || 8728,
    })
    await conn.connect()

    // Login kliyan an sou Mikrotik Hotspot
    await conn.write('/ip/hotspot/active/login', [
      `=user=${username}`,
      `=password=${client.mikrotik_password}`,
      mac ? `=mac-address=${mac}` : '',
      ip  ? `=ip=${ip}` : '',
    ].filter(Boolean))

    await conn.close()

    res.json({
      success: true,
      message: 'Koneksyon reyisi!',
      client: {
        full_name: client.full_name,
        plan_name: client.plan_name,
        isp_name:  client.tenant?.name || 'PLUS INTERNET'
      }
    })
  } catch (err) {
    // Si Mikrotik pa disponib, retounen yon erè klè
    console.error('Hotspot login error:', err.message)
    res.status(500).json({ error: 'Pwoblèm koneksyon. Eseye ankò.' })
  }
}

// ══════════════════════════════════════════════════════════
// HOTSPOT LOGOUT
// ══════════════════════════════════════════════════════════
async function hotspotLogout(req, res) {
  const { username } = req.body
  try {
    const client = await prisma.internet_clients.findFirst({
      where: { mikrotik_username: username },
      include: { tenant: true }
    })
    if (!client) return res.status(404).json({ error: 'Kliyan pa jwenn' })

    const config = await prisma.mikrotik_config.findFirst({
      where: { internet_tenant_id: client.internet_tenant_id }
    })
    if (!config) return res.json({ success: true })

    const { RouterOSAPI } = require('node-routeros')
    const conn = new RouterOSAPI({
      host: config.host, user: config.username,
      password: config.password, port: config.port || 8728,
    })
    await conn.connect()

    // Jwenn sesyon aktif la
    const sessions = await conn.write('/ip/hotspot/active/print', [`?user=${username}`])
    if (sessions.length > 0) {
      await conn.write('/ip/hotspot/active/remove', [`=.id=${sessions[0]['.id']}`])
    }
    await conn.close()

    res.json({ success: true, message: 'Dekonekte ak siksè' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// AJOUTE NAN internet.controller.js — anvan module.exports
// ══════════════════════════════════════════════════════════

// ── Helper: koneksyon Mikrotik ─────────────────────────────
async function getMikConn(isp_id) {
  const { RouterOSAPI } = require('node-routeros')
  const config = await prisma.mikrotik_config.findFirst({
    where: { internet_tenant_id: isp_id }
  })
  if (!config) return null
  const conn = new RouterOSAPI({
    host: config.host, user: config.username,
    password: config.password, port: config.port || 8728,
  })
  await conn.connect()
  return conn
}

// ── Helper: kalkile expires_at ─────────────────────────────
function calcExpires(durationDays) {
  const d = new Date()
  d.setDate(d.getDate() + parseInt(durationDays))
  return d
}

// ══════════════════════════════════════════════════════════
// PLANS — CRUD (admin + manager)
// ══════════════════════════════════════════════════════════
async function getPlans(req, res) {
  try {
    const isp_id = req.manager?.isp_id || parseInt(req.query.isp_id)
    const plans  = await prisma.internet_plans.findMany({
      where:   { internet_tenant_id: isp_id, active: true },
      orderBy: { speed_mbps: 'asc' }
    })
    res.json({ plans })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

async function createPlan(req, res) {
  try {
    const isp_id = req.manager?.isp_id || parseInt(req.body.isp_id)
    const { name, mikrotik_profile, speed_mbps, duration_days, price_htg, data_limit_gb, max_devices } = req.body

    if (!name || !mikrotik_profile || !speed_mbps || !duration_days) {
      return res.status(400).json({ error: 'Non, profil, vitès ak dire obligatwa' })
    }

    // Kreye profil nan Mikrotik
    const conn = await getMikConn(isp_id)
    if (conn) {
      try {
        await conn.write('/ip/hotspot/user/profile/add', [
          `=name=${mikrotik_profile}`,
          `=rate-limit=${speed_mbps}M/${speed_mbps}M`,
          `=shared-users=${max_devices || 1}`,
        ])
      } catch(e) { /* profil ka deja egziste */ }
      await conn.close()
    }

    const plan = await prisma.internet_plans.create({
      data: {
        internet_tenant_id: isp_id,
        name, mikrotik_profile,
        speed_mbps:   parseInt(speed_mbps),
        duration_days: parseInt(duration_days),
        price_htg,
        data_limit_gb: data_limit_gb ? parseInt(data_limit_gb) : null,
        max_devices:   parseInt(max_devices) || 1,
      }
    })
    res.status(201).json({ plan })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

async function updatePlan(req, res) {
  try {
    const { id } = req.params
    const { name, speed_mbps, duration_days, price_htg, data_limit_gb, max_devices, active } = req.body

    const plan = await prisma.internet_plans.findUnique({ where: { id: parseInt(id) } })
    if (!plan) return res.status(404).json({ error: 'Plan pa jwenn' })

    // Mete ajou profil Mikrotik
    const conn = await getMikConn(plan.internet_tenant_id)
    if (conn) {
      try {
        const profiles = await conn.write('/ip/hotspot/user/profile/print', [`?name=${plan.mikrotik_profile}`])
        if (profiles.length > 0) {
          await conn.write('/ip/hotspot/user/profile/set', [
            `=.id=${profiles[0]['.id']}`,
            `=rate-limit=${speed_mbps}M/${speed_mbps}M`,
            `=shared-users=${max_devices || 1}`,
          ])
        }
      } catch(e) {}
      await conn.close()
    }

    const updated = await prisma.internet_plans.update({
      where: { id: parseInt(id) },
      data: {
        name,
        speed_mbps:    speed_mbps    ? parseInt(speed_mbps)    : undefined,
        duration_days: duration_days ? parseInt(duration_days) : undefined,
        price_htg,
        data_limit_gb: data_limit_gb ? parseInt(data_limit_gb) : null,
        max_devices:   max_devices   ? parseInt(max_devices)   : undefined,
        active,
      }
    })
    res.json({ plan: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

async function deletePlan(req, res) {
  try {
    const { id } = req.params
    await prisma.internet_plans.update({
      where: { id: parseInt(id) },
      data:  { active: false }
    })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ══════════════════════════════════════════════════════════
// RANPLASE createManagerClient ak createClient
// (avèk Mikrotik sync + expires_at)
// ══════════════════════════════════════════════════════════
async function createManagerClient(req, res) {
  try {
    let { full_name, phone, email, mikrotik_username, mikrotik_password, plan_id, plan_name } = req.body
    const isp_id = req.manager.isp_id

    if (!full_name)        return res.status(400).json({ error: 'Non kliyan obligatwa' })
    if (!mikrotik_password) return res.status(400).json({ error: 'Modpas obligatwa' })

    // Auto-jenere username si vid
    if (!mikrotik_username?.trim()) {
      mikrotik_username = await getUniqueUsername(full_name)
    } else {
      const ex = await prisma.internet_clients.findFirst({ where: { mikrotik_username } })
      if (ex) return res.status(400).json({ error: 'ID sa a deja egziste' })
    }

    // Jwenn plan si bay plan_id
    let plan = null
    let expires_at = null
    if (plan_id) {
      plan = await prisma.internet_plans.findUnique({ where: { id: parseInt(plan_id) } })
      if (plan) {
        plan_name  = plan.name
        expires_at = calcExpires(plan.duration_days)
      }
    }

    // Kreye nan Supabase
    const client = await prisma.internet_clients.create({
      data: {
        internet_tenant_id: isp_id,
        plan_id:   plan ? plan.id : null,
        full_name, phone, email,
        mikrotik_username, mikrotik_password,
        plan_name,
        expires_at,
        activated_at: new Date(),
      }
    })

    // Kreye nan Mikrotik
    const conn = await getMikConn(isp_id)
    if (conn) {
      try {
        const limitUptime = plan ? `${plan.duration_days * 24}h` : '0s'
        await conn.write('/ip/hotspot/user/add', [
          `=name=${mikrotik_username}`,
          `=password=${mikrotik_password}`,
          `=profile=${plan?.mikrotik_profile || 'default'}`,
          plan ? `=limit-uptime=${limitUptime}` : '=limit-uptime=0s',
        ])
      } catch(e) { console.error('Mikrotik createClient error:', e.message) }
      await conn.close()
    }

    res.status(201).json({ client })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

async function createClient(req, res) {
  try {
    let { internet_tenant_id, full_name, phone, email, mikrotik_username, mikrotik_password, plan_id, plan_name } = req.body

    if (!full_name)        return res.status(400).json({ error: 'Non kliyan obligatwa' })
    if (!mikrotik_password) return res.status(400).json({ error: 'Modpas obligatwa' })

    if (!mikrotik_username?.trim()) {
      mikrotik_username = await getUniqueUsername(full_name)
    } else {
      const ex = await prisma.internet_clients.findFirst({ where: { mikrotik_username } })
      if (ex) return res.status(400).json({ error: 'ID sa a deja egziste' })
    }

    let plan = null
    let expires_at = null
    if (plan_id) {
      plan = await prisma.internet_plans.findUnique({ where: { id: parseInt(plan_id) } })
      if (plan) {
        plan_name  = plan.name
        expires_at = calcExpires(plan.duration_days)
      }
    }

    const isp_id = internet_tenant_id ? parseInt(internet_tenant_id) : null

    const client = await prisma.internet_clients.create({
      data: {
        internet_tenant_id: isp_id,
        plan_id:   plan ? plan.id : null,
        full_name, phone, email,
        mikrotik_username, mikrotik_password,
        plan_name,
        expires_at,
        activated_at: new Date(),
      }
    })

    // Kreye nan Mikrotik
    if (isp_id) {
      const conn = await getMikConn(isp_id)
      if (conn) {
        try {
          const limitUptime = plan ? `${plan.duration_days * 24}h` : '0s'
          await conn.write('/ip/hotspot/user/add', [
            `=name=${mikrotik_username}`,
            `=password=${mikrotik_password}`,
            `=profile=${plan?.mikrotik_profile || 'default'}`,
            `=limit-uptime=${limitUptime}`,
          ])
        } catch(e) { console.error('Mikrotik createClient error:', e.message) }
        await conn.close()
      }
    }

    res.status(201).json({ client })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ══════════════════════════════════════════════════════════
// RANPLASE renewSubscription — Renouvle ak Mikrotik sync
// ══════════════════════════════════════════════════════════
async function renewSubscription(req, res) {
  const { client_id, plan_id, amount } = req.body
  try {
    const client = await prisma.internet_clients.findUnique({ where: { id: client_id } })
    if (!client) return res.status(404).json({ error: 'Kliyan pa jwenn' })

    let plan = null
    let new_expires_at = new Date()

    if (plan_id) {
      plan = await prisma.internet_plans.findUnique({ where: { id: parseInt(plan_id) } })
    }

    // Si kliyan an pa ekspire encore, ajoute sou ekspirasyon aktyèl la
    const baseDate = client.expires_at && client.expires_at > new Date()
      ? client.expires_at
      : new Date()

    if (plan) {
      new_expires_at = new Date(baseDate)
      new_expires_at.setDate(new_expires_at.getDate() + plan.duration_days)
    }

    // Mete ajou Supabase
    await prisma.internet_clients.update({
      where: { id: client_id },
      data: {
        plan_id:    plan ? plan.id   : client.plan_id,
        plan_name:  plan ? plan.name : client.plan_name,
        expires_at: new_expires_at,
        activated_at: new Date(),
      }
    })

    // Anrejistre peman
    await prisma.internet_payments.create({
      data: {
        internet_tenant_id: client.internet_tenant_id,
        client_id:    client.id,
        amount:       amount || plan?.price_htg || 0,
        plan_name:    plan?.name || client.plan_name,
        duration_days: plan?.duration_days,
        renewed_by:   'manager'
      }
    })

    // Renouvle nan Mikrotik
    const conn = await getMikConn(client.internet_tenant_id)
    if (conn) {
      try {
        const users = await conn.write('/ip/hotspot/user/print', [`?name=${client.mikrotik_username}`])
        if (users.length > 0) {
          const limitUptime = plan ? `${plan.duration_days * 24}h` : '720h'
          await conn.write('/ip/hotspot/user/set', [
            `=.id=${users[0]['.id']}`,
            `=profile=${plan?.mikrotik_profile || users[0].profile}`,
            `=limit-uptime=${limitUptime}`,
            `=uptime=0s`,
            `=disabled=no`,
          ])
          // Dekonekte sesyon aktif pou limit reset
          const sessions = await conn.write('/ip/hotspot/active/print', [`?user=${client.mikrotik_username}`])
          for (const s of sessions) {
            await conn.write('/ip/hotspot/active/remove', [`=.id=${s['.id']}`])
          }
        }
      } catch(e) { console.error('Mikrotik renew error:', e.message) }
      await conn.close()
    }

    res.json({ success: true, message: 'Abònman renouvle ak siksè', new_expires_at })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ══════════════════════════════════════════════════════════
// AJOUTE NAN internet.controller.js — anvan module.exports
// ══════════════════════════════════════════════════════════

// ── Helper: jwenn/sove mesaj hotspot ─────────────────────
// Sove nan internet_tenants.hotspot_message
// (Ou bezwen ajoute kolòn sa a: ALTER TABLE internet_tenants ADD COLUMN IF NOT EXISTS hotspot_message TEXT;)

async function getHotspotMessage(req, res) {
  try {
    const isp = await prisma.internet_tenants.findUnique({
      where: { id: req.manager.isp_id },
      select: { hotspot_message: true }
    })
    res.json({ message: isp?.hotspot_message || '' })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

async function saveHotspotMessage(req, res) {
  try {
    const { message } = req.body
    await prisma.internet_tenants.update({
      where: { id: req.manager.isp_id },
      data:  { hotspot_message: message }
    })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── Ajoute nan module.exports: ────────────────────────────
// getHotspotMessage, saveHotspotMessage,

// ── Route piblik — Hotspot page chaje mesaj ISP ───────────
// Mikrotik ka pase ?isp=slug nan URL
async function getPublicHotspotMessage(req, res) {
  try {
    const { isp } = req.query
    if (!isp) return res.json({ message: '' })
    const tenant = await prisma.internet_tenants.findFirst({
      where: { slug: isp },
      select: { hotspot_message: true, name: true }
    })
    res.json({
      message:  tenant?.hotspot_message || '',
      isp_name: tenant?.name || 'PLUS INTERNET'
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
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
  hotspotLogin, hotspotLogout,
  getMikConn, calcExpires,
  getPlans, createPlan, updatePlan, deletePlan,
  getHotspotMessage, saveHotspotMessage, getPublicHotspotMessage,
};