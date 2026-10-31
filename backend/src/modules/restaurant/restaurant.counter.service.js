// src/modules/restaurant/restaurant.counter.service.js
// ─── KÈS / VANN KONTWA — kliyan ki vin achte devan kès la ──────────────
// • Katalòg: tout plat meni an + pwodui estòk POS pataje yo, ak kategori ak kalite
//   (manje / bwason) — yon sèl apèl pou griy kès la.
// • Tikè: chak vant jwenn yon NIMEWO KÒMAND (#1, #2… rekòmanse chak jou, lè Ayiti)
//   ak non kliyan an (opsyonèl) pou rele l lè manje a pare.
// • Swivi: an preparasyon → pare → bay kliyan (tablo « Kòmand k ap prepare »).
// Tikè a kreye APRE peman; client_ref anpeche yon doub klik kreye 2 tikè.
const productSvc = require('../products/product.service');
const kinds = require('./restaurant.kinds.service');
const shared = require('./restaurant.shared.service');
const { q, httpError, newId, num, round2, clean, digits, haitiNow, getPrisma } = require('./restaurant.db');

const MODULE = 'restaurant';
const MODES = ['takeaway', 'dinein', 'delivery'];
const STATUSES = ['prep', 'ready', 'served', 'cancelled'];

// ── Katalòg kès la ───────────────────────────────────────────────────
const catalogCache = new Map(); // tenantId → { at, data }
async function getCatalog(tenantId) {
  const key = String(tenantId);
  const hit = catalogCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 1000) return hit.data;
  const [res, sh, kmap] = await Promise.all([
    productSvc.getAll(tenantId, { module: MODULE, page: 1, limit: 1000 }).catch(() => null),
    shared.getSharedProducts(tenantId).catch(() => []),
    kinds.getKindMap(tenantId).catch(() => null),
  ]);
  const own = res?.products || res?.data || [];
  const items = [...own, ...(sh || [])].map((p) => ({
    id: String(p.id),
    name: p.name,
    priceHtg: num(p.priceHtg ?? p.price),
    imageUrl: p.imageUrl || p.thumbnailUrl || null,
    quantity: p.quantity == null ? null : num(p.quantity),
    unit: p.unit || null,
    categoryId: p.categoryId ? String(p.categoryId) : (p.category?.id ? String(p.category.id) : null),
    kind: kinds.kindOf(kmap, p.id, p.name),
    shared: !!p.shared,
  })).filter((p) => p.name && p.priceHtg >= 0);
  const used = new Set(items.map((i) => i.categoryId).filter(Boolean));
  const categories = (kmap?.categories || [])
    .filter((c) => used.has(String(c.id)))
    .map((c) => ({ id: String(c.id), name: c.name, kind: c.kind }));
  const data = { categories, items };
  catalogCache.set(key, { at: Date.now(), data });
  return data;
}
const invalidate = (tenantId) => catalogCache.delete(String(tenantId));

// ── Estòk an dirèk (san kach) ────────────────────────────────────────
// Pwodui ki pa sèvis sèlman (sèvis pa gen estòk pou konte).
async function freshProducts(tenantId, ids) {
  const list = [...new Set((ids || []).map(String).filter(Boolean))].slice(0, 1000);
  if (!list.length) return [];
  const rows = await getPrisma().product.findMany({ where: { tenantId, id: { in: list } } });
  return rows.filter((p) => !p.isService && p.quantity != null);
}

// Kantite estòk aktyèl pou griy kès la: { productId: quantity }
async function getStock(tenantId) {
  const cat = await getCatalog(tenantId);
  const rows = await freshProducts(tenantId, cat.items.map((i) => i.id));
  return Object.fromEntries(rows.map((p) => [String(p.id), num(p.quantity)]));
}

// Verifye estòk la ANVAN fakti a kreye. Si pa gen ase → 409 ak lis pwodui yo.
async function checkStock(tenantId, items = []) {
  const want = new Map();
  for (const i of Array.isArray(items) ? items : []) {
    if (!i?.productId) continue;
    const k = String(i.productId);
    want.set(k, (want.get(k) || 0) + Math.max(0, num(i.qty)));
  }
  if (!want.size) return { ok: true, shortages: [] };
  const rows = await freshProducts(tenantId, [...want.keys()]);
  const shortages = rows
    .map((p) => ({ productId: String(p.id), name: p.name, available: Math.max(0, num(p.quantity)), requested: want.get(String(p.id)) || 0 }))
    .filter((x) => x.requested > x.available);
  if (shortages.length) {
    const err = httpError(409, 'STOCK_SHORT',
      `Pa gen ase estòk: ${shortages.map((x) => `${x.name} (rete ${x.available})`).join(', ')}.`);
    err.details = { shortages };
    throw err;
  }
  return { ok: true, shortages: [] };
}

// ── Tikè ─────────────────────────────────────────────────────────────
const mapTicket = (r) => ({
  id: r.id,
  number: Number(r.number),
  day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
  customerName: r.customer_name || null,
  customerPhone: r.customer_phone || null,
  address: r.address || null,
  mode: r.mode,
  notes: r.notes || null,
  items: Array.isArray(r.items) ? r.items : (typeof r.items === 'string' ? JSON.parse(r.items) : []),
  totalHtg: num(r.total_htg),
  status: r.status,
  invoiceId: r.invoice_id || null,
  cashierName: r.cashier_name || null,
  createdAt: r.created_at,
  readyAt: r.ready_at || null,
  servedAt: r.served_at || null,
});

async function createTicket(tenantId, branchId, user, body = {}) {
  const clientRef = clean(body.clientRef, 80);
  if (!clientRef) throw httpError(400, 'REF_REQUIRED', 'Referans tikè a manke.');
  // Idanpotan: menm client_ref = menm tikè (doub klik, rezo ki koupe…)
  const existing = await q('SELECT * FROM resto_counter_tickets WHERE tenant_id = $1 AND client_ref = $2 LIMIT 1', String(tenantId), clientRef);
  if (existing[0]) return { ticket: mapTicket(existing[0]), created: false };

  const kmap = await kinds.getKindMap(tenantId).catch(() => null);
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 200).map((i) => ({
    productId: i.productId ? String(i.productId) : null,
    name: clean(i.name, 150),
    qty: num(i.qty),
    unitPrice: round2(i.unitPrice),
  })).filter((i) => i.name && i.qty > 0);
  if (!items.length) throw httpError(400, 'EMPTY', 'Tikè a vid.');
  items.forEach((i) => { i.kind = kinds.kindOf(kmap, i.productId, i.name); });
  const mode = MODES.includes(body.mode) ? body.mode : 'takeaway';
  // Bwason sèlman: pa gen anyen pou kizin prepare — kliyan an resevwa l touswit
  const status = items.some((i) => i.kind !== 'drink') ? 'prep' : 'served';
  const day = haitiNow().date;
  const total = round2(body.totalHtg != null ? body.totalHtg : items.reduce((s, i) => s + i.qty * i.unitPrice, 0));

  for (let attempt = 0; attempt < 6; attempt++) {
    const rows = await q(
      `INSERT INTO resto_counter_tickets (id, tenant_id, branch_id, day, number, client_ref, customer_name, customer_phone, address, mode,
         notes, items, total_htg, status, invoice_id, cashier_id, cashier_name, served_at)
       SELECT $1, $2, $3, $4::date, COALESCE(MAX(number), 0) + 1, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16,
              CASE WHEN $13 = 'served' THEN NOW() ELSE NULL END
         FROM resto_counter_tickets WHERE tenant_id = $2 AND day = $4::date
       ON CONFLICT DO NOTHING RETURNING *`,
      newId(), String(tenantId), branchId ? String(branchId) : null, day, clientRef,
      clean(body.customerName, 60) || null, digits(body.customerPhone).slice(0, 15) || null, clean(body.address, 200) || null, mode,
      clean(body.notes, 300) || null, JSON.stringify(items), total, status, body.invoiceId ? String(body.invoiceId) : null,
      user?.id ? String(user.id) : null, user?.fullName || user?.name || user?.email || null,
    );
    if (rows[0]) {
      // Fakti a te deja bese estòk la: griy kès la dwe wè nouvo kantite yo touswit
      invalidate(tenantId); shared.invalidate(tenantId);
      return { ticket: mapTicket(rows[0]), created: true };
    }
    // Konfli: swa client_ref (lòt demann te deja kreye l), swa nimewo (2 kès an menm tan) → re-eseye
    const again = await q('SELECT * FROM resto_counter_tickets WHERE tenant_id = $1 AND client_ref = $2 LIMIT 1', String(tenantId), clientRef);
    if (again[0]) return { ticket: mapTicket(again[0]), created: false };
  }
  throw httpError(409, 'NUMBER_BUSY', 'Pa ka bay tikè a yon nimewo. Eseye ankò.');
}

// Tikè jodi a: aktif yo (prep/ready) + kèk dènye ki fini
async function listTickets(tenantId, { scope = 'active' } = {}) {
  const day = haitiNow().date;
  const rows = scope === 'today'
    ? await q(`SELECT * FROM resto_counter_tickets WHERE tenant_id = $1 AND day = $2::date ORDER BY number DESC LIMIT 300`, String(tenantId), day)
    : await q(`SELECT * FROM resto_counter_tickets WHERE tenant_id = $1 AND status IN ('prep','ready')
                 AND created_at > NOW() - INTERVAL '18 hours' ORDER BY number ASC LIMIT 100`, String(tenantId));
  const stats = await q(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(total_htg), 0) AS total FROM resto_counter_tickets
      WHERE tenant_id = $1 AND day = $2::date AND status <> 'cancelled'`, String(tenantId), day);
  return { tickets: rows.map(mapTicket), today: { count: stats[0]?.n || 0, total: num(stats[0]?.total) } };
}

async function updateTicketStatus(tenantId, id, status) {
  if (!STATUSES.includes(status)) throw httpError(400, 'BAD_STATUS', 'Estati a pa valid.');
  const rows = await q(
    `UPDATE resto_counter_tickets SET status = $3,
        ready_at = CASE WHEN $3 = 'ready' THEN COALESCE(ready_at, NOW()) ELSE ready_at END,
        served_at = CASE WHEN $3 = 'served' THEN NOW() ELSE served_at END
      WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    String(tenantId), String(id), status,
  );
  if (!rows[0]) throw httpError(404, 'NOT_FOUND', 'Tikè a pa jwenn.');
  return mapTicket(rows[0]);
}

module.exports = { getCatalog, invalidate, getStock, checkStock, createTicket, listTickets, updateTicketStatus };
