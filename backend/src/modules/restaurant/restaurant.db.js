// src/modules/restaurant/restaurant.db.js
// ─── Restoran: koneksyon DB, oto-setup tab yo, ak ti zouti ──────────
// Tab pòtal la (kòmand an liy, rezèvasyon, paramèt) kreye otomatikman
// premye fwa yon wout restoran itilize — menm jan ak tab odit la.
// Si w prefere fè l alamen, egzekite restaurant.sql nan Supabase/pgAdmin.

let prismaRef = null;

function getPrisma() {
  if (prismaRef) return prismaRef;
  // src/config/prisma.js se kliyan Prisma PLUS GROUP la (menm ak restaurant-tables.service.js)
  const candidates = [
    '../../config/prisma', '../../config/database', '../../config/db',
    '../../lib/prisma', '../../utils/prisma', '../../prisma', '../../db',
  ];
  for (const p of candidates) {
    try {
      const m = require(p);
      const c = (m && (m.prisma || m.default || m.db)) || m;
      if (c && typeof c.$queryRawUnsafe === 'function') { prismaRef = c; return prismaRef; }
    } catch (_) { /* eseye pwochen chemen an */ }
  }
  const { PrismaClient } = require('@prisma/client');
  prismaRef = new PrismaClient();
  return prismaRef;
}

const q = (sql, ...params) => getPrisma().$queryRawUnsafe(sql, ...params);
const exec = (sql, ...params) => getPrisma().$executeRawUnsafe(sql, ...params);

const SETUP_SQL = [
  `CREATE TABLE IF NOT EXISTS resto_portal_settings (
    tenant_id            TEXT PRIMARY KEY,
    slug                 TEXT UNIQUE,
    enabled              BOOLEAN NOT NULL DEFAULT FALSE,
    accept_orders        BOOLEAN NOT NULL DEFAULT TRUE,
    accept_reservations  BOOLEAN NOT NULL DEFAULT TRUE,
    accepting_now        BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    pickup_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_fee_htg     NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_order_htg        NUMERIC(12,2) NOT NULL DEFAULT 0,
    prep_minutes         INTEGER NOT NULL DEFAULT 30,
    phone                TEXT,
    whatsapp             TEXT,
    address              TEXT,
    hours_text           TEXT,
    welcome_message      TEXT,
    payment_methods      JSONB NOT NULL DEFAULT '["cash"]'::jsonb,
    moncash_number       TEXT,
    reservation_slots    JSONB NOT NULL DEFAULT '["12:00","12:30","13:00","13:30","18:00","18:30","19:00","19:30","20:00","20:30"]'::jsonb,
    slot_capacity        INTEGER NOT NULL DEFAULT 4,
    max_party            INTEGER NOT NULL DEFAULT 12,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS resto_online_orders (
    id                TEXT PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    code              TEXT NOT NULL,
    customer_name     TEXT NOT NULL,
    customer_phone    TEXT NOT NULL,
    customer_address  TEXT,
    mode              TEXT NOT NULL DEFAULT 'pickup',
    payment_method    TEXT NOT NULL DEFAULT 'cash',
    notes             TEXT,
    items             JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_htg      NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee_htg  NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_htg         NUMERIC(12,2) NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'nouvo',
    history           JSONB NOT NULL DEFAULT '[]'::jsonb,
    invoice_id        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_resto_orders_tenant_status ON resto_online_orders (tenant_id, status, created_at DESC)`,
  // Nòt kliyan an bay apre livrezon (1–5) + ti kòmantè
  `ALTER TABLE resto_online_orders ADD COLUMN IF NOT EXISTS rating INTEGER`,
  `ALTER TABLE resto_online_orders ADD COLUMN IF NOT EXISTS review TEXT`,
  `ALTER TABLE resto_online_orders ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS resto_reservations (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    code            TEXT NOT NULL,
    customer_name   TEXT NOT NULL,
    customer_phone  TEXT NOT NULL,
    customer_email  TEXT,
    party_size      INTEGER NOT NULL DEFAULT 2,
    res_date        DATE NOT NULL,
    res_time        TEXT NOT NULL,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'an_atant',
    table_id        TEXT,
    table_name      TEXT,
    source          TEXT NOT NULL DEFAULT 'online',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_resto_resv_tenant_date ON resto_reservations (tenant_id, res_date, res_time)`,
];

let setupPromise = null;
function ensureTables() {
  if (!setupPromise) {
    setupPromise = (async () => {
      for (const sql of SETUP_SQL) await exec(sql);
    })().catch((e) => { setupPromise = null; throw e; });
  }
  return setupPromise;
}

// ── Ti zouti ─────────────────────────────────────────────────────────
const crypto = require('crypto');
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(num(n) * 100) / 100;
const digits = (s) => String(s || '').replace(/\D/g, '');
const clean = (s, max = 300) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, max);

function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function httpError(status, code, message) {
  const e = new Error(message || code);
  e.statusCode = status; e.status = status; e.code = code;
  return e;
}

// Repons JSON ak `code` pou frontend lan ka tradui mesaj la nan 4 lang yo.
function handle(fn) {
  return async (req, res) => {
    try {
      await ensureTables();
      await fn(req, res);
    } catch (e) {
      const status = e.statusCode || e.status || 500;
      if (status >= 500) console.error('[restaurant]', e);
      res.status(status).json({ success: false, code: e.code || 'SERVER_ERROR', message: status >= 500 ? 'Erè sèvè.' : e.message });
    }
  };
}

// Dat ak lè Ayiti (America/Port-au-Prince)
function haitiNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Port-au-Prince', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => (parts.find((p) => p.type === t) || {}).value;
  const hour = g('hour') === '24' ? '00' : g('hour');
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hour}:${g('minute')}` };
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const toDateStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10));

module.exports = {
  getPrisma, q, exec, ensureTables, handle, httpError,
  newId, num, round2, digits, clean, slugify, haitiNow, addDays, toDateStr,
};