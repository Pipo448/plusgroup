// src/modules/restaurant/restaurant.kinds.service.js
// ─── Manje oswa Bwason ────────────────────────────────────────────────
// Chak kategori meni gen yon « kalite »: 'food' (manje → tikè kizin) oswa
// 'drink' (bwason → PA ale nan kizin; kesye/sèvè sèvi l dirèkteman).
// Si restoran an poko chwazi, nou devine apati non kategori a oswa plat la.

const productSvc = require('../products/product.service');
const { q, exec } = require('./restaurant.db');

const MODULE = 'restaurant';
const KINDS = ['food', 'drink'];
const DRINK_RE = /(bwason|boisson|drink|bebida|beverage|bar\b|ji\b|jus\b|juice|jugo|kola|cola|coca|pepsi|sprite|fanta|soda|gazeuse|malta|byè|biere|bière|beer|cerveza|prestige|heineken|presidente|kronenbourg|vin\b|wine|vino|rhum|rum|ron\b|barbancourt|clairin|kleren|whisky|vodka|cocktail|kokteyl|kremas|cremas|likè|liqueur|ponch|punch|tafia|dlo\b|eau\b|water|agua|kafe|café|coffee|cafe\b|te\b|thé|tea\b|lèt\b|lait|milk|smoothie|milkshake|limonad|limonade|lemonade|energy|red bull)/i;

const guessKind = (name) => (DRINK_RE.test(String(name || '')) ? 'drink' : 'food');

// ── Kach (60 s) pa tenant ─────────────────────────────────────────────
const cache = new Map();
const invalidate = (tenantId) => cache.delete(String(tenantId));

async function getMeta(tenantId) {
  const rows = await q('SELECT category_id, kind FROM resto_category_meta WHERE tenant_id = $1', String(tenantId));
  return new Map(rows.map((r) => [String(r.category_id), KINDS.includes(r.kind) ? r.kind : 'food']));
}

// Kategori yo ak kalite yo
async function withKinds(tenantId, categories) {
  const meta = await getMeta(tenantId).catch(() => new Map());
  return (Array.isArray(categories) ? categories : []).map((c) => ({
    ...c,
    kind: meta.get(String(c.id)) || guessKind(c.name),
    kindAuto: !meta.has(String(c.id)),
  }));
}

async function setCategoryKind(tenantId, categoryId, kind) {
  if (!KINDS.includes(kind) || !categoryId) return;
  await exec(
    `INSERT INTO resto_category_meta (tenant_id, category_id, kind) VALUES ($1,$2,$3)
     ON CONFLICT (tenant_id, category_id) DO UPDATE SET kind = EXCLUDED.kind, updated_at = NOW()`,
    String(tenantId), String(categoryId), kind,
  );
  invalidate(tenantId);
}

// Kat tout plat yo: productId → kalite (pou kizin, rapò, pòtal)
async function getKindMap(tenantId) {
  const key = String(tenantId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.data;
  const [cats, res, sharedList] = await Promise.all([
    productSvc.getCategories(tenantId, undefined, MODULE).catch(() => []),
    productSvc.getAll(tenantId, { module: MODULE, page: 1, limit: 2000 }).catch(() => null),
    require('./restaurant.shared.service').getSharedProducts(tenantId).catch(() => []),
  ]);
  const categories = await withKinds(tenantId, cats);
  const catKind = new Map(categories.map((c) => [String(c.id), c.kind]));
  const byProduct = new Map();
  for (const p of [...(res?.products || res?.data || []), ...(sharedList || [])]) {
    const k = p.categoryId ? catKind.get(String(p.categoryId)) : null;
    byProduct.set(String(p.id), k || guessKind(p.name));
  }
  const data = { categories, byProduct };
  cache.set(key, { at: Date.now(), data });
  return data;
}

const kindOf = (map, productId, name) => (productId && map?.byProduct?.get(String(productId))) || guessKind(name);

module.exports = { KINDS, guessKind, withKinds, setCategoryKind, getKindMap, kindOf, invalidate };