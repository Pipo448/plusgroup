// src/modules/branding/branding.service.js
// ─── Koulè anblèm chak tenant (idantite vizyèl) ─────────────────────────
// Yon ti tab endepandan (pa bezwen chanje schema Prisma a). Li kreye
// otomatikman premye fwa yo itilize l — oswa egzekite branding.sql alamen.
const prisma = require('../../config/prisma')

const q = (sql, ...p) => prisma.$queryRawUnsafe(sql, ...p)
const exec = (sql, ...p) => prisma.$executeRawUnsafe(sql, ...p)

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id       TEXT PRIMARY KEY,
  primary_color   TEXT NOT NULL,
  secondary_color TEXT,
  sidebar_style   TEXT NOT NULL DEFAULT 'dark',
  apply_portal    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by      TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`

let ready = null
const ensureTable = () => {
  if (!ready) ready = exec(SETUP_SQL).catch((e) => { ready = null; throw e })
  return ready
}

const HEX = /^#[0-9a-f]{6}$/i
const SIDEBARS = ['dark', 'brand', 'night']

function httpError(status, code, message) {
  const e = new Error(message); e.statusCode = status; e.status = status; e.code = code
  return e
}

const map = (r) => r ? ({
  primary: r.primary_color,
  secondary: r.secondary_color || null,
  sidebar: SIDEBARS.includes(r.sidebar_style) ? r.sidebar_style : 'dark',
  applyPortal: r.apply_portal !== false,
  updatedAt: r.updated_at,
}) : null

const cache = new Map() // tenantId → { at, data }
const TTL = 60 * 1000

async function getBranding(tenantId) {
  const key = String(tenantId)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  await ensureTable()
  const rows = await q('SELECT * FROM tenant_branding WHERE tenant_id = $1 LIMIT 1', key)
  const data = map(rows[0])
  cache.set(key, { at: Date.now(), data })
  return data
}

// Pou pòtal piblik la: sèlman si tenant lan vle menm koulè yo sou pòtal la
async function getPortalBrand(tenantId) {
  try {
    const b = await getBranding(tenantId)
    return b && b.applyPortal ? { primary: b.primary, secondary: b.secondary } : null
  } catch { return null }
}

async function saveBranding(tenantId, userId, body = {}) {
  const primary = String(body.primary || '').trim().toLowerCase()
  const secondary = body.secondary ? String(body.secondary).trim().toLowerCase() : null
  const sidebar = SIDEBARS.includes(body.sidebar) ? body.sidebar : 'dark'
  const applyPortal = body.applyPortal !== false
  if (!HEX.test(primary)) throw httpError(400, 'BAD_COLOR', 'Koulè prensipal la pa valid (egz. #f5680c).')
  if (secondary && !HEX.test(secondary)) throw httpError(400, 'BAD_COLOR', 'Dezyèm koulè a pa valid (egz. #ff8534).')
  await ensureTable()
  await exec(
    `INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color, sidebar_style, apply_portal, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET primary_color = EXCLUDED.primary_color, secondary_color = EXCLUDED.secondary_color,
       sidebar_style = EXCLUDED.sidebar_style, apply_portal = EXCLUDED.apply_portal, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    String(tenantId), primary, secondary, sidebar, applyPortal, userId ? String(userId) : null,
  )
  cache.delete(String(tenantId))
  return getBranding(tenantId)
}

async function resetBranding(tenantId) {
  await ensureTable()
  await exec('DELETE FROM tenant_branding WHERE tenant_id = $1', String(tenantId))
  cache.delete(String(tenantId))
  return null
}

module.exports = { getBranding, getPortalBrand, saveBranding, resetBranding, SETUP_SQL }