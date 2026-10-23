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
  // Ki tablo bò pou montre: 'resto' (tablo restoran) | 'general' | NULL (otomatik)
  `ALTER TABLE resto_portal_settings ADD COLUMN IF NOT EXISTS dashboard_mode TEXT`,
  // Kalite chak kategori meni: 'food' (manje → kizin) oswa 'drink' (bwason → pa ale nan kizin)
  `CREATE TABLE IF NOT EXISTS resto_category_meta (
    tenant_id    TEXT NOT NULL,
    category_id  TEXT NOT NULL,
    kind         TEXT NOT NULL DEFAULT 'food',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, category_id)
  )`,
  // Flyer meni (imaj meni restoran an fè deja: afich, flyer) — pòtal + kòd QR
  `CREATE TABLE IF NOT EXISTS resto_flyers (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    title       TEXT,
    image       TEXT NOT NULL,
    mime        TEXT NOT NULL DEFAULT 'image/webp',
    width       INTEGER,
    height      INTEGER,
    bytes       INTEGER,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_resto_flyers_tenant ON resto_flyers (tenant_id, position)`,
  // Anyè « Plus Resto » (restoran toupre kliyan an): pozisyon, vil, kalite manje
  `ALTER TABLE resto_portal_settings
     ADD COLUMN IF NOT EXISTS listed    BOOLEAN NOT NULL DEFAULT TRUE,
     ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS city      TEXT,
     ADD COLUMN IF NOT EXISTS cuisine   TEXT`,
  // Chak vant restoran (tab fèmen oswa kòmand an liy livre) — baz rapò vant ak tablo a
  `CREATE TABLE IF NOT EXISTS resto_sales (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    branch_id       TEXT,
    source          TEXT NOT NULL,
    ref_id          TEXT NOT NULL,
    ref_label       TEXT,
    invoice_id      TEXT,
    items           JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_htg    NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_htg    NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee_htg NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_htg       NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    amount_given    NUMERIC(12,2),
    change_htg      NUMERIC(12,2),
    cashier_id      TEXT,
    cashier_name    TEXT,
    server_id       TEXT,
    server_name     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, source, ref_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_resto_sales_tenant_date ON resto_sales (tenant_id, created_at DESC)`,
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