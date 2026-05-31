const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const {
  getHotspotUser,
  getActiveSession,
  renewClient,
  disableClient
} = require('./mikrotikService');

const prisma = new PrismaClient();

// ── Middleware: otantifikasyon kliyan internet ────────────
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

// ── Login kliyan ──────────────────────────────────────────
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
        id: client.id,
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
        phone: client.phone,
        plan_name: client.plan_name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Estati kliyan (info Mikrotik) ─────────────────────────
async function getStatus(req, res) {
  try {
    const config = await prisma.mikrotik_config.findFirst({
      where: { tenant_id: req.client.tenant_id }
    });

    // Si pa gen konfigirasyon Mikrotik encore, retounen done vid
    if (!config) {
      return res.json({
        userInfo: null,
        session: null,
        message: 'Mikrotik pa konfigire encore'
      });
    }

    const [userInfo, session] = await Promise.all([
      getHotspotUser(config, req.client.username),
      getActiveSession(config, req.client.username)
    ]);

    res.json({ userInfo, session });
  } catch (err) {
    // Retounen done vid olye erè 500
    res.json({
      userInfo: null,
      session: null,
      error: err.message
    });
  }
}
// ── Istorik peman ─────────────────────────────────────────
async function getPayments(req, res) {
  try {
    const payments = await prisma.internet_payments.findMany({
      where: { client_id: req.client.id },
      orderBy: { paid_at: 'desc' },
      take: 20
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Renouvle abònman (admin sèlman) ──────────────────────
async function renewSubscription(req, res) {
  const { client_id, new_profile, amount, duration_days } = req.body;
  try {
    const client = await prisma.internet_clients.findUnique({
      where: { id: client_id }
    });
    if (!client) return res.status(404).json({ error: 'Kliyan pa jwenn' });

    const config = await prisma.mikrotik_config.findFirst({
      where: { tenant_id: client.tenant_id }
    });

    await renewClient(config, client.mikrotik_username, new_profile);

    // Anrejistre peman an
    await prisma.internet_payments.create({
      data: {
        tenant_id: client.tenant_id,
        client_id: client.id,
        amount,
        plan_name: new_profile,
        duration_days,
        renewed_by: req.user?.username || 'admin'
      }
    });

    // Mete a jou plan kliyan an
    await prisma.internet_clients.update({
      where: { id: client_id },
      data: { plan_name: new_profile }
    });

    res.json({ success: true, message: 'Abònman renouvle ak siksè' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { clientAuth, loginClient, getStatus, getPayments, renewSubscription };