// src/modules/internet/internet.controller.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const {
  getHotspotUser,
  getActiveSession,
  renewClient,
  disableClient
} = require('./mikrotikService');

const prisma = new PrismaClient();

// ── Helper: jwenn tenant_id depi slug ────────────────────
async function getTenantId(req) {
  const slug = req.headers['x-tenant-slug']
  if (!slug) return null
  const tenant = await prisma.tenants.findFirst({ where: { slug } })
  return tenant?.id || null
}

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
// AUTH KLIYAN — Login (app internet.plusgroupe.com)
// ══════════════════════════════════════════════════════════
async function loginClient(req, res) {
  const { username, password } = req.body;
  try {
    const client = await prisma.internet_clients.findFirst({
      where: { mikrotik_username: username }
    });
    if (!client || client.mikrotik_password !== password) {
      return res.status(401).json({ error: 'Non itilizatè oswa modpas enkòrèk' });
    }
    const token = jwt.sign(
      {
        id:       client.id,
        username: client.mikrotik_username,
        tenant_id: client.tenant_id
      },
      process.env.CLIENT_JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      client: {
        full_name: client.full_name,
        phone:     client.phone,
        plan_name: client.plan_name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
// ESTATI — Mikrotik status (app kliyan)
// ══════════════════════════════════════════════════════════
async function getStatus(req, res) {
  try {
    const config = await prisma.mikrotik_config.findFirst({
      where: { tenant_id: req.client.tenant_id }
    });

    if (!config) {
      return res.json({
        userInfo: null,
        session:  null,
        message:  'Mikrotik pa konfigire encore'
      });
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
// PEMAN — Istorik (app kliyan)
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
// ADMIN — Liste kliyan pa tenant
// ══════════════════════════════════════════════════════════
async function getClients(req, res) {
  try {
    const tenant_id = req.tenantId || await getTenantId(req)
    if (!tenant_id) return res.status(400).json({ error: 'Tenant pa jwenn' })

    const { search } = req.query
    const where = { tenant_id }
    if (search) {
      where.OR = [
        { full_name:         { contains: search, mode: 'insensitive' } },
        { phone:             { contains: search } },
        { mikrotik_username: { contains: search, mode: 'insensitive' } },
      ]
    }

    const clients = await prisma.internet_clients.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true, full_name: true, phone: true, email: true,
        mikrotik_username: true, mikrotik_password: true,
        plan_name: true, created_at: true
      }
    })
    res.json({ clients })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — Kreye kliyan
// ══════════════════════════════════════════════════════════
async function createClient(req, res) {
  try {
    const tenant_id = req.tenantId || await getTenantId(req)
    if (!tenant_id) return res.status(400).json({ error: 'Tenant pa jwenn' })

    const { full_name, phone, email, mikrotik_username, mikrotik_password, plan_name } = req.body

    if (!full_name || !mikrotik_username || !mikrotik_password) {
      return res.status(400).json({ error: 'Non, username ak modpas obligatwa' })
    }

    // Verifye si username deja egziste
    const existing = await prisma.internet_clients.findFirst({
      where: { mikrotik_username }
    })
    if (existing) return res.status(400).json({ error: 'Username sa a deja egziste' })

    const client = await prisma.internet_clients.create({
      data: { tenant_id, full_name, phone, email, mikrotik_username, mikrotik_password, plan_name }
    })
    res.status(201).json({ client })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — Edite kliyan
// ══════════════════════════════════════════════════════════
async function updateClient(req, res) {
  try {
    const { id } = req.params
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

// ══════════════════════════════════════════════════════════
// ADMIN — Efase kliyan
// ══════════════════════════════════════════════════════════
async function deleteClient(req, res) {
  try {
    const { id } = req.params
    await prisma.internet_clients.delete({ where: { id: parseInt(id) } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
// ADMIN — Renouvle abònman
// ══════════════════════════════════════════════════════════
async function renewSubscription(req, res) {
  const { client_id, new_profile, amount, duration_days } = req.body;
  try {
    const tenant_id = req.tenantId || await getTenantId(req)

    const client = await prisma.internet_clients.findUnique({
      where: { id: client_id }
    });
    if (!client) return res.status(404).json({ error: 'Kliyan pa jwenn' });

    const config = await prisma.mikrotik_config.findFirst({
      where: { tenant_id: client.tenant_id }
    });

    if (config) {
      await renewClient(config, client.mikrotik_username, new_profile);
    }

    await prisma.internet_payments.create({
      data: {
        tenant_id: client.tenant_id,
        client_id: client.id,
        amount,
        plan_name:    new_profile,
        duration_days,
        renewed_by:   req.user?.username || 'admin'
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
// MIKROTIK CONFIG — Jwenn ak sove
// ══════════════════════════════════════════════════════════
async function getMikrotikConfig(req, res) {
  try {
    const tenant_id = req.tenantId || await getTenantId(req)
    const config = await prisma.mikrotik_config.findFirst({ where: { tenant_id } })
    res.json(config || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function saveMikrotikConfig(req, res) {
  try {
    const tenant_id = req.tenantId || await getTenantId(req)
    if (!tenant_id) return res.status(400).json({ error: 'Tenant pa jwenn' })

    const { host, port, username, password, use_ssl } = req.body
    const existing = await prisma.mikrotik_config.findFirst({ where: { tenant_id } })

    let config
    if (existing) {
      config = await prisma.mikrotik_config.update({
        where: { id: existing.id },
        data:  { host, port: parseInt(port) || 8728, username, password, use_ssl }
      })
    } else {
      config = await prisma.mikrotik_config.create({
        data: { tenant_id, host, port: parseInt(port) || 8728, username, password, use_ssl }
      })
    }
    res.json({ config })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function testMikrotikConfig(req, res) {
  try {
    const tenant_id = req.tenantId || await getTenantId(req)
    const config = await prisma.mikrotik_config.findFirst({ where: { tenant_id } })
    if (!config) return res.status(404).json({ error: 'Pa gen konfigirasyon Mikrotik' })

    const { RouterOSAPI } = require('node-routeros')
    const conn = new RouterOSAPI({
      host: config.host, user: config.username,
      password: config.password, port: config.port || 8728,
    })
    await conn.connect()
    await conn.close()
    res.json({ success: true, message: 'Koneksyon Mikrotik reyisi!' })
  } catch (err) {
    res.status(500).json({ error: `Koneksyon echwe: ${err.message}` })
  }
}

module.exports = {
  clientAuth,
  loginClient,
  getStatus,
  getClientPayments,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  renewSubscription,
  getMikrotikConfig,
  saveMikrotikConfig,
  testMikrotikConfig,
}