// src/modules/restaurant/restaurant.flyers.service.js
// ─── Flyer meni (imaj) ────────────────────────────────────────────────
// Restoran an telechaje flyer/afich meni li (JPG, PNG, WebP). Nou rezize l
// (max 1800 px) epi konvèti l an WebP pou l lejè (ekonomi egress), epi nou
// sèvi l sou pòtal la ak yon kach 7 jou (?v= chanje lè imaj la chanje).

const { q, exec, httpError, newId, clean } = require('./restaurant.db');

const MAX_FLYERS = 6;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;   // sa frontend lan voye (apre konpresyon li)
const MAX_STORED_BYTES = 2.5 * 1024 * 1024; // sa nou sove
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

let sharp = null;
try { sharp = require('sharp'); } catch { sharp = null; } // sharp deja itilize nan tenant.routes.js

// Kach lis la (san imaj yo) pou pòtal la — 60 s
const listCache = new Map();
const invalidate = (tenantId) => listCache.delete(String(tenantId));

const mapRow = (r) => ({
  id: r.id,
  title: r.title || '',
  width: r.width || null,
  height: r.height || null,
  bytes: r.bytes || null,
  v: r.updated_at ? new Date(r.updated_at).getTime() : 0,
});

async function listFlyers(tenantId) {
  const key = String(tenantId);
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.data;
  const rows = await q(
    `SELECT id, title, width, height, bytes, updated_at FROM resto_flyers
     WHERE tenant_id = $1 ORDER BY position ASC, created_at ASC`, key,
  );
  const data = rows.map(mapRow);
  listCache.set(key, { at: Date.now(), data });
  return data;
}

function parseDataUrl(src) {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(src || ''));
  if (!m) throw httpError(400, 'FLYER_INVALID', 'Imaj la pa valid.');
  const mime = m[1].toLowerCase();
  if (!ALLOWED.includes(mime)) throw httpError(400, 'FLYER_TYPE', 'Sèlman JPG, PNG oswa WebP.');
  const buffer = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) throw httpError(400, 'FLYER_INVALID', 'Imaj la pa valid.');
  if (buffer.length > MAX_INPUT_BYTES) throw httpError(413, 'FLYER_TOO_BIG', 'Imaj la twò lou.');
  return { mime, buffer };
}

async function optimize({ mime, buffer }) {
  if (!sharp) return { mime, buffer, width: null, height: null };
  try {
    const out = await sharp(buffer, { failOn: 'none' })
      .rotate() // respekte oryantasyon foto telefòn
      .resize({ width: 1800, height: 2600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { mime: 'image/webp', buffer: out.data, width: out.info.width, height: out.info.height };
  } catch {
    return { mime, buffer, width: null, height: null };
  }
}

async function addFlyer(tenantId, body = {}) {
  const key = String(tenantId);
  const count = await q('SELECT COUNT(*)::int AS n FROM resto_flyers WHERE tenant_id = $1', key);
  if ((count[0]?.n || 0) >= MAX_FLYERS) throw httpError(400, 'FLYER_LIMIT', `Maksimòm ${MAX_FLYERS} flyer.`);

  const img = await optimize(parseDataUrl(body.image));
  if (img.buffer.length > MAX_STORED_BYTES) throw httpError(413, 'FLYER_TOO_BIG', 'Imaj la twò lou.');
  const width = img.width || (Number(body.width) > 0 ? Math.round(Number(body.width)) : null);
  const height = img.height || (Number(body.height) > 0 ? Math.round(Number(body.height)) : null);

  const pos = await q('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM resto_flyers WHERE tenant_id = $1', key);
  const id = newId();
  await exec(
    `INSERT INTO resto_flyers (id, tenant_id, title, image, mime, width, height, bytes, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    id, key, clean(body.title, 80) || null, img.buffer.toString('base64'), img.mime,
    width, height, img.buffer.length, Number(pos[0]?.p) || 0,
  );
  invalidate(key);
  return (await listFlyers(key)).find((f) => f.id === id);
}

async function updateFlyer(tenantId, id, body = {}) {
  const key = String(tenantId);
  const rows = await q('SELECT id, position FROM resto_flyers WHERE tenant_id = $1 ORDER BY position ASC, created_at ASC', key);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) throw httpError(404, 'NOT_FOUND', 'Flyer pa jwenn.');

  if (body.title !== undefined) {
    await exec('UPDATE resto_flyers SET title = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2', key, id, clean(body.title, 80) || null);
  }
  if (body.move === 'up' || body.move === 'down') {
    const j = body.move === 'up' ? idx - 1 : idx + 1;
    if (j >= 0 && j < rows.length) {
      const order = rows.map((r) => r.id);
      [order[idx], order[j]] = [order[j], order[idx]];
      for (let i = 0; i < order.length; i += 1) {
        await exec('UPDATE resto_flyers SET position = $3 WHERE tenant_id = $1 AND id = $2', key, order[i], i);
      }
    }
  }
  invalidate(key);
  return listFlyers(key);
}

async function deleteFlyer(tenantId, id) {
  const key = String(tenantId);
  const n = await exec('DELETE FROM resto_flyers WHERE tenant_id = $1 AND id = $2', key, id);
  if (!n) throw httpError(404, 'NOT_FOUND', 'Flyer pa jwenn.');
  invalidate(key);
  return listFlyers(key);
}

async function getFlyerImage(tenantId, id) {
  const rows = await q('SELECT image, mime FROM resto_flyers WHERE tenant_id = $1 AND id = $2', String(tenantId), String(id));
  if (!rows[0]) throw httpError(404, 'NOT_FOUND', 'Flyer pa jwenn.');
  return { type: rows[0].mime || 'image/webp', buffer: Buffer.from(rows[0].image, 'base64') };
}

module.exports = { listFlyers, addFlyer, updateFlyer, deleteFlyer, getFlyerImage, MAX_FLYERS };