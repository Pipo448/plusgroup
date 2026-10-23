// src/modules/restaurant/restaurant.sales.service.js
// ─── Restoran: vant, rapò, tablo bò, preferans, aksè ──────────────────
// Chak vant (tab fèmen oswa kòmand an liy livre) anrejistre nan resto_sales
// ak metòd peman, rabè, kesye ak sèvè, pou rapò yo egzak san depann de fòma fakti a.

const { q, exec, httpError, newId, num, round2, clean, haitiNow, addDays, getPrisma } = require('./restaurant.db');
const kindSvc = require('./restaurant.kinds.service');

const TZ = 'America/Port-au-Prince';
const SALE_METHODS = ['cash', 'moncash', 'natcash', 'card'];

// ── Aksè (allowedPages Super Admin lan) ───────────────────────────────
function pagesOf(tenant) {
  let ap = tenant?.allowedPages;
  if (typeof ap === 'string') { try { ap = JSON.parse(ap); } catch { ap = null; } }
  return ap && typeof ap === 'object' ? ap : {};
}
// Pòtal kliyan an mande pèmisyon espesyal Super Admin lan: allowedPages['restaurant-portal'] === true
const portalAllowed = (tenant) => pagesOf(tenant)['restaurant-portal'] === true;

const MODULE_KEYS = ['hotel', 'gym', 'dry', 'pre', 'kane-epay', 'sabotay', 'klinik', 'kane', 'mobilpay'];
// Tenant "restoran sèlman": restoran aktive, okenn lòt modil espesyal pa aktive
const restaurantOnly = (tenant) => {
  const ap = pagesOf(tenant);
  return ap.restaurant === true && !MODULE_KEYS.some((k) => ap[k] === true);
};

// ── Preferans tablo bò ────────────────────────────────────────────────
async function getPrefs(tenant) {
  const r = await q('SELECT dashboard_mode FROM resto_portal_settings WHERE tenant_id = $1', String(tenant.id));
  const mode = r[0]?.dashboard_mode || null;
  const only = restaurantOnly(tenant);
  return {
    dashboardMode: mode,
    restaurantOnly: only,
    // Otomatik: tenant restoran sèlman → tablo restoran; sinon tablo jeneral
    useRestoDashboard: mode ? mode === 'resto' : only,
    restaurantEnabled: pagesOf(tenant).restaurant === true,
    portalAllowed: portalAllowed(tenant),
  };
}

async function setDashboardMode(tenant, mode) {
  const m = mode === 'resto' || mode === 'general' ? mode : null;
  await exec(
    `INSERT INTO resto_portal_settings (tenant_id, dashboard_mode) VALUES ($1, $2)
     ON CONFLICT (tenant_id) DO UPDATE SET dashboard_mode = EXCLUDED.dashboard_mode, updated_at = NOW()`,
    String(tenant.id), m,
  );
  return getPrefs(tenant);
}

// ── Anrejistre yon vant ───────────────────────────────────────────────
async function serverOfTableOrder(tenantId, orderId) {
  try {
    const o = await getPrisma().restaurantOrder.findFirst({ where: { id: String(orderId), tenantId: String(tenantId) }, include: { creator: true } });
    if (!o) return {};
    const c = o.creator || {};
    return { id: o.createdBy || null, name: c.fullName || c.name || c.firstName || c.email || null };
  } catch (_) { return {}; }
}

async function recordSale(tenantId, branchId, user, body) {
  const source = body.source === 'online' ? 'online' : 'table';
  const refId = clean(body.refId, 80);
  if (!refId) throw httpError(400, 'REF_REQUIRED', 'Referans vant lan manke.');
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 200).map((i) => ({
    productId: i.productId ? String(i.productId) : null,
    name: clean(i.name, 150),
    qty: num(i.qty),
    unitPrice: round2(i.unitPrice),
  })).filter((i) => i.name && i.qty > 0);
  // ✅ NOUVO — make chak liy « food » oswa « drink » pou rapò manje / bwason
  const kmap = await kindSvc.getKindMap(tenantId).catch(() => null);
  items.forEach((i) => { i.kind = kindSvc.kindOf(kmap, i.productId, i.name); });
  const subtotal = round2(items.reduce((s, i) => s + i.qty * i.unitPrice, 0));
  const discountPct = Math.min(100, Math.max(0, num(body.discountPct)));
  const discount = round2(subtotal * discountPct / 100);
  const deliveryFee = round2(Math.max(0, num(body.deliveryFee)));
  const total = round2(subtotal - discount + deliveryFee);
  const method = SALE_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash';
  const server = source === 'table' ? await serverOfTableOrder(tenantId, refId) : {};

  const rows = await q(
    `INSERT INTO resto_sales (id, tenant_id, branch_id, source, ref_id, ref_label, invoice_id, items, subtotal_htg, discount_pct,
       discount_htg, delivery_fee_htg, total_htg, payment_method, amount_given, change_htg, cashier_id, cashier_name, server_id, server_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (tenant_id, source, ref_id) DO NOTHING RETURNING id`,
    newId(), String(tenantId), branchId ? String(branchId) : null, source, refId, clean(body.refLabel, 80) || null,
    body.invoiceId ? String(body.invoiceId) : null, JSON.stringify(items), subtotal, discountPct, discount, deliveryFee, total, method,
    body.amountGiven != null ? round2(body.amountGiven) : null, body.change != null ? round2(body.change) : null,
    user?.id ? String(user.id) : null, user?.fullName || user?.name || user?.email || null,
    server.id ? String(server.id) : null, server.name || null,
  );
  return { created: rows.length > 0, total };
}

// ── Filtè dat (jou Ayiti) ─────────────────────────────────────────────
function range(from, to) {
  const today = haitiNow().date;
  const f = /^\d{4}-\d{2}-\d{2}$/.test(String(from)) ? String(from) : today;
  const t = /^\d{4}-\d{2}-\d{2}$/.test(String(to)) ? String(to) : f;
  return { from: f <= t ? f : t, to: f <= t ? t : f };
}
const DAY_SQL = `(created_at AT TIME ZONE '${TZ}')::date`;

// ── Rapò vant ─────────────────────────────────────────────────────────
async function getReport(tenantId, { from, to, cashierId, branchId } = {}) {
  const r = range(from, to);
  const params = [String(tenantId), r.from, r.to];
  let where = `tenant_id = $1 AND ${DAY_SQL} BETWEEN $2::date AND $3::date`;
  if (cashierId) { params.push(String(cashierId)); where += ` AND cashier_id = $${params.length}`; }
  if (branchId) { params.push(String(branchId)); where += ` AND branch_id = $${params.length}`; }

  const [tot, byMethod, bySource, byCashier, byServer, top, hourly, daily, list, byKind] = await Promise.all([
    q(`SELECT COUNT(*)::int AS n, COALESCE(SUM(subtotal_htg),0) AS gross, COALESCE(SUM(discount_htg),0) AS disc,
         COALESCE(SUM(delivery_fee_htg),0) AS fees, COALESCE(SUM(total_htg),0) AS net FROM resto_sales WHERE ${where}`, ...params),
    q(`SELECT payment_method AS k, COUNT(*)::int AS n, SUM(total_htg) AS total FROM resto_sales WHERE ${where} GROUP BY 1 ORDER BY 3 DESC`, ...params),
    q(`SELECT source AS k, COUNT(*)::int AS n, SUM(total_htg) AS total FROM resto_sales WHERE ${where} GROUP BY 1 ORDER BY 3 DESC`, ...params),
    q(`SELECT COALESCE(cashier_name, '—') AS k, COUNT(*)::int AS n, SUM(total_htg) AS total FROM resto_sales WHERE ${where} GROUP BY 1 ORDER BY 3 DESC`, ...params),
    q(`SELECT COALESCE(server_name, '—') AS k, COUNT(*)::int AS n, SUM(total_htg) AS total FROM resto_sales WHERE ${where} AND source = 'table' GROUP BY 1 ORDER BY 3 DESC`, ...params),
    q(`SELECT i->>'name' AS name, MAX(COALESCE(i->>'kind', 'food')) AS kind, SUM((i->>'qty')::numeric) AS qty, SUM((i->>'qty')::numeric * (i->>'unitPrice')::numeric) AS total
       FROM resto_sales, jsonb_array_elements(items) i WHERE ${where} GROUP BY 1 ORDER BY 4 DESC LIMIT 30`, ...params),
    q(`SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE '${TZ}')::int AS h, SUM(total_htg) AS total, COUNT(*)::int AS n
       FROM resto_sales WHERE ${where} GROUP BY 1 ORDER BY 1`, ...params),
    q(`SELECT ${DAY_SQL}::text AS d, SUM(total_htg) AS total, COUNT(*)::int AS n FROM resto_sales WHERE ${where} GROUP BY 1 ORDER BY 1`, ...params),
    q(`SELECT id, source, ref_label, total_htg, payment_method, cashier_name, server_name, discount_htg, created_at
       FROM resto_sales WHERE ${where} ORDER BY created_at DESC LIMIT 300`, ...params),
    // ✅ NOUVO — manje vs bwason (ansyen vant san kalite → manje)
    q(`SELECT COALESCE(i->>'kind', 'food') AS k, SUM((i->>'qty')::numeric) AS qty, SUM((i->>'qty')::numeric * (i->>'unitPrice')::numeric) AS total
       FROM resto_sales, jsonb_array_elements(items) i WHERE ${where} GROUP BY 1 ORDER BY 3 DESC`, ...params),
  ]);
  const kv = (rows) => rows.map((x) => ({ key: x.k, count: num(x.n), total: num(x.total) }));
  const t = tot[0] || {};
  return {
    from: r.from, to: r.to,
    totals: { count: num(t.n), gross: num(t.gross), discount: num(t.disc), deliveryFees: num(t.fees), net: num(t.net), avgTicket: num(t.n) ? round2(num(t.net) / num(t.n)) : 0 },
    byMethod: kv(byMethod), bySource: kv(bySource), byCashier: kv(byCashier), byServer: kv(byServer).filter((x) => x.key),
    topItems: top.filter((x) => x.kind !== 'drink').slice(0, 10).map((x) => ({ name: x.name, qty: num(x.qty), total: num(x.total), kind: 'food' })),
    topDrinks: top.filter((x) => x.kind === 'drink').slice(0, 10).map((x) => ({ name: x.name, qty: num(x.qty), total: num(x.total), kind: 'drink' })),
    byKind: byKind.map((x) => ({ key: x.k === 'drink' ? 'drink' : 'food', qty: num(x.qty), total: num(x.total) })),
    hourly: hourly.map((x) => ({ hour: num(x.h), total: num(x.total), count: num(x.n) })),
    daily: daily.map((x) => ({ date: x.d, total: num(x.total), count: num(x.n) })),
    sales: list.map((x) => ({ id: x.id, source: x.source, label: x.ref_label, total: num(x.total_htg), method: x.payment_method, cashier: x.cashier_name, server: x.server_name, discount: num(x.discount_htg), at: x.created_at })),
  };
}

// ── Tablo bò restoran ─────────────────────────────────────────────────
async function getDashboard(tenantId, branchId) {
  const today = haitiNow().date;
  const yesterday = addDays(today, -1);
  const weekStart = addDays(today, -6);
  const tid = String(tenantId);

  const safe = (p, d) => p.catch(() => d);
  const [rToday, rYest, week, tables, openTotal, online, resv, upcoming] = await Promise.all([
    getReport(tenantId, { from: today, to: today, branchId }),
    q(`SELECT COALESCE(SUM(total_htg),0) AS net, COUNT(*)::int AS n FROM resto_sales WHERE tenant_id = $1 AND ${DAY_SQL} = $2::date`, tid, yesterday),
    q(`SELECT ${DAY_SQL}::text AS d, SUM(total_htg) AS total FROM resto_sales WHERE tenant_id = $1 AND ${DAY_SQL} BETWEEN $2::date AND $3::date GROUP BY 1`, tid, weekStart, today),
    safe(q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'okipe')::int AS busy FROM "RestaurantTable" WHERE tenant_id = $1 AND is_active = TRUE`, tid), [{}]),
    safe(q(`SELECT COALESCE(SUM(i.quantity * i.unit_price_htg),0) AS total, COUNT(DISTINCT o.id)::int AS n FROM "RestaurantOrder" o
            JOIN "RestaurantOrderItem" i ON i.order_id = o.id WHERE o.tenant_id = $1 AND o.status = 'louvri'`, tid), [{}]),
    q(`SELECT COUNT(*) FILTER (WHERE status = 'nouvo')::int AS nouvo,
              COUNT(*) FILTER (WHERE status IN ('konfime','nan_kizin','pare','sou_wout'))::int AS aktif
       FROM resto_online_orders WHERE tenant_id = $1`, tid),
    q(`SELECT COUNT(*)::int AS n, COALESCE(SUM(party_size),0)::int AS guests FROM resto_reservations
       WHERE tenant_id = $1 AND res_date = $2::date AND status NOT IN ('anile','pa_vini')`, tid, today),
    q(`SELECT code, customer_name, party_size, res_time, status, table_name FROM resto_reservations
       WHERE tenant_id = $1 AND res_date = $2::date AND status IN ('an_atant','konfime') ORDER BY res_time LIMIT 5`, tid, today),
  ]);

  const byDay = Object.fromEntries(week.map((x) => [x.d, num(x.total)]));
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = addDays(weekStart, i); return { date: d, total: byDay[d] || 0 }; });
  const yNet = num(rYest[0]?.net);
  return {
    date: today,
    sales: {
      today: rToday.totals.net, count: rToday.totals.count, avgTicket: rToday.totals.avgTicket,
      yesterday: yNet, changePct: yNet > 0 ? Math.round(((rToday.totals.net - yNet) / yNet) * 100) : null,
      discount: rToday.totals.discount,
    },
    byMethod: rToday.byMethod, bySource: rToday.bySource, byKind: rToday.byKind, topItems: rToday.topItems.slice(0, 5), topDrinks: rToday.topDrinks.slice(0, 5), hourly: rToday.hourly, last7,
    tables: { total: num(tables[0]?.total), busy: num(tables[0]?.busy), openTotal: num(openTotal[0]?.total), openOrders: num(openTotal[0]?.n) },
    online: { nouvo: num(online[0]?.nouvo), active: num(online[0]?.aktif) },
    reservations: {
      count: num(resv[0]?.n), guests: num(resv[0]?.guests),
      upcoming: upcoming.map((x) => ({ code: x.code, name: x.customer_name, party: num(x.party_size), time: x.res_time, status: x.status, table: x.table_name })),
    },
  };
}

module.exports = { pagesOf, portalAllowed, restaurantOnly, getPrefs, setDashboardMode, recordSale, getReport, getDashboard };