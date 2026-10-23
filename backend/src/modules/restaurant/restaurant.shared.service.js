// src/modules/restaurant/restaurant.shared.service.js
// ─── YON SÈL ESTÒK: pwodui POS (module "general") nan meni restoran an ──
// Restoran an chwazi pwodui ki deja nan Pwodui/Estòk la (egz. Coca, Prestige,
// dlo) epi mete yo nan yon kategori meni. Pa gen KOPI: tab yo, kòmand an liy
// ak fakti yo itilize MENM pwodui a (menm id), kidonk lè yon Prestige vann
// nan restoran an, se estòk POS la ki bese — e vis vèsa.

const productSvc = require('../products/product.service');
const { q, exec, httpError, num, getPrisma } = require('./restaurant.db');

const cache = new Map(); // tenantId → { at, data }
const invalidate = (tenantId) => cache.delete(String(tenantId));

async function links(tenantId) {
  return q('SELECT product_id, category_id, position FROM resto_shared_products WHERE tenant_id = $1 ORDER BY position, created_at', String(tenantId));
}

// Pwodui pataje yo, menm fòma ak productSvc.getAll (san gwo imaj)
async function getSharedProducts(tenantId) {
  const key = String(tenantId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.data;
  const rows = await links(tenantId);
  if (!rows.length) { cache.set(key, { at: Date.now(), data: [] }); return []; }
  const ids = rows.map((r) => r.product_id);
  const catOf = new Map(rows.map((r) => [String(r.product_id), r.category_id ? String(r.category_id) : null]));
  const prisma = getPrisma();
  const [products, cats] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, id: { in: ids }, isActive: true },
      select: {
        id: true, name: true, description: true, unit: true, priceHtg: true, priceUsd: true, quantity: true,
        alertThreshold: true, thumbnailUrl: true, isActive: true, updatedAt: true, createdAt: true, module: true, code: true,
      },
    }),
    productSvc.getCategories(tenantId, undefined, 'restaurant').catch(() => []),
  ]);
  const catName = new Map((Array.isArray(cats) ? cats : []).map((c) => [String(c.id), c]));
  const order = new Map(ids.map((id, i) => [String(id), i]));
  const data = products
    .sort((a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0))
    .map(({ thumbnailUrl, ...p }) => {
      const cid = catOf.get(String(p.id));
      const c = cid ? catName.get(cid) : null;
      return { ...p, imageUrl: thumbnailUrl || null, categoryId: c ? String(c.id) : null, category: c ? { id: String(c.id), name: c.name } : null, shared: true };
    });
  cache.set(key, { at: Date.now(), data });
  return data;
}

// Chèche nan estòk jeneral la (pou ajoute nan meni an)
async function searchStock(tenantId, search) {
  const [res, rows] = await Promise.all([
    productSvc.getAll(tenantId, { module: 'general', search: search || undefined, page: 1, limit: 30 }),
    links(tenantId),
  ]);
  const linked = new Set(rows.map((r) => String(r.product_id)));
  return (res?.products || []).filter((p) => !p.isService).map((p) => ({ ...p, linked: linked.has(String(p.id)) }));
}

async function addShared(tenantId, productIds, categoryId) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map(String))].slice(0, 100);
  if (!ids.length) throw httpError(400, 'SHARED_EMPTY', 'Chwazi omwen yon pwodui.');
  const prisma = getPrisma();
  const ok = await prisma.product.findMany({ where: { tenantId, id: { in: ids }, isActive: true, module: 'general' }, select: { id: true } });
  const pos = await q('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM resto_shared_products WHERE tenant_id = $1', String(tenantId));
  let p = num(pos[0]?.p);
  for (const { id } of ok) {
    await exec(
      `INSERT INTO resto_shared_products (tenant_id, product_id, category_id, position) VALUES ($1,$2,$3,$4)
       ON CONFLICT (tenant_id, product_id) DO UPDATE SET category_id = EXCLUDED.category_id`,
      String(tenantId), String(id), categoryId ? String(categoryId) : null, p++,
    );
  }
  invalidate(tenantId);
  return { added: ok.length };
}

async function updateShared(tenantId, productId, { categoryId }) {
  await exec('UPDATE resto_shared_products SET category_id = $3 WHERE tenant_id = $1 AND product_id = $2',
    String(tenantId), String(productId), categoryId ? String(categoryId) : null);
  invalidate(tenantId);
}

async function removeShared(tenantId, productId) {
  // Retire l nan meni an sèlman — pwodui a rete nan estòk jeneral la
  await exec('DELETE FROM resto_shared_products WHERE tenant_id = $1 AND product_id = $2', String(tenantId), String(productId));
  invalidate(tenantId);
}

module.exports = { getSharedProducts, searchStock, addShared, updateShared, removeShared, invalidate };