// src/modules/restaurant/restaurant.service.js
// ─── Restoran: Meni, Pòtal, Kòmand an liy, Rezèvasyon ─────────────────
// Meni an reyitilize KONPLÈTMAN modèl Product/ProductCategory ak tout
// mekanis estòk, mouvman, ak entegrasyon Fakti/Devi ki deja egziste —
// jis ak tag module="restaurant" pou separe l de katalòg jeneral la.
// Kòmand an liy ak rezèvasyon yo nan pwòp tab pa yo (wè restaurant.db.js).

const productSvc = require('../products/product.service');
const {
  q, exec, httpError, newId, num, round2, clean, digits, slugify, haitiNow, toDateStr,
} = require('./restaurant.db');

const MODULE = 'restaurant';

// ══════════════════════════════════════════════
// MENI (Manje/Bwason)
// ══════════════════════════════════════════════
const getMenu = (tenantId, params) => productSvc.getAll(tenantId, { ...params, module: MODULE });
const getMenuItem = (tenantId, id) => productSvc.getOne(tenantId, id);
const createMenuItem = (tenantId, userId, data) => productSvc.create(tenantId, userId, { ...data, module: MODULE });
const updateMenuItem = (tenantId, id, userId, data) => productSvc.update(tenantId, id, userId, { ...data, module: MODULE });
const removeMenuItem = (tenantId, id) => productSvc.remove(tenantId, id);
const adjustStock = (tenantId, id, userId, data) => productSvc.adjustStock(tenantId, id, userId, data);
const getLowStock = (tenantId, branchId) => productSvc.getLowStock(tenantId, branchId, MODULE);

// ── KATEGORI MENI (egzanp: Antre, Pla Prensipal, Bwason, Desè)
const getCategories = (tenantId, branchId) => productSvc.getCategories(tenantId, branchId, MODULE);
const createCategory = (tenantId, branchId, data) => productSvc.createCategory(tenantId, branchId, { ...data, module: MODULE });
const updateCategory = (tenantId, id, data) => productSvc.updateCategory(tenantId, id, data);
const deleteCategory = (tenantId, id) => productSvc.deleteCategory(tenantId, id);

// ══════════════════════════════════════════════
// PARAMÈT PÒTAL
// ══════════════════════════════════════════════
const DEFAULT_SLOTS = ['12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
const PAYMENT_METHODS = ['cash', 'moncash', 'natcash'];

// Slug pa defo: slug tenant an (deja inik nan sistèm nan), sinon non tenant an
function mapSettings(r, tenantName, tenantSlug) {
  const defSlug = slugify(tenantSlug || tenantName);
  if (!r) {
    return {
      exists: false, slug: defSlug, enabled: false, acceptOrders: true, acceptReservations: true,
      acceptingNow: true, deliveryEnabled: true, pickupEnabled: true, deliveryFeeHtg: 0, minOrderHtg: 0,
      prepMinutes: 30, phone: '', whatsapp: '', address: '', hoursText: '', welcomeMessage: '',
      paymentMethods: ['cash'], moncashNumber: '', reservationSlots: DEFAULT_SLOTS, slotCapacity: 4, maxParty: 12,
    };
  }
  return {
    exists: true,
    slug: r.slug || defSlug,
    enabled: !!r.enabled,
    acceptOrders: !!r.accept_orders,
    acceptReservations: !!r.accept_reservations,
    acceptingNow: !!r.accepting_now,
    deliveryEnabled: !!r.delivery_enabled,
    pickupEnabled: !!r.pickup_enabled,
    deliveryFeeHtg: num(r.delivery_fee_htg),
    minOrderHtg: num(r.min_order_htg),
    prepMinutes: num(r.prep_minutes) || 30,
    phone: r.phone || '',
    whatsapp: r.whatsapp || '',
    address: r.address || '',
    hoursText: r.hours_text || '',
    welcomeMessage: r.welcome_message || '',
    paymentMethods: Array.isArray(r.payment_methods) && r.payment_methods.length ? r.payment_methods : ['cash'],
    moncashNumber: r.moncash_number || '',
    reservationSlots: Array.isArray(r.reservation_slots) && r.reservation_slots.length ? r.reservation_slots : DEFAULT_SLOTS,
    slotCapacity: num(r.slot_capacity) || 4,
    maxParty: num(r.max_party) || 12,
  };
}

async function getSettingsRow(tenantId) {
  const rows = await q('SELECT * FROM resto_portal_settings WHERE tenant_id = $1', String(tenantId));
  return rows[0] || null;
}

async function getPortalSettings(tenantId, tenantName, tenantSlug) {
  return mapSettings(await getSettingsRow(tenantId), tenantName, tenantSlug);
}

async function savePortalSettings(tenantId, tenantName, data, tenantSlug, allowed = true) {
  const cur = await getPortalSettings(tenantId, tenantName, tenantSlug);
  const s = { ...cur, ...data };
  // Se Super Admin lan sèlman ki ka bay dwa pou pòtal la aktive (allowedPages['restaurant-portal'])
  if (s.enabled && !allowed) throw httpError(403, 'PORTAL_NOT_ALLOWED', 'Pòtal kliyan an poko otorize pou antrepriz sa a.');

  const slug = slugify(s.slug || tenantSlug || tenantName);
  if (!slug || slug.length < 3) throw httpError(400, 'SLUG_INVALID', 'Lyen pòtal la twò kout.');
  const taken = await q('SELECT tenant_id FROM resto_portal_settings WHERE slug = $1 AND tenant_id <> $2', slug, String(tenantId));
  if (taken.length) throw httpError(409, 'SLUG_TAKEN', 'Lyen sa a deja pran.');

  const slots = (Array.isArray(s.reservationSlots) ? s.reservationSlots : [])
    .map((x) => String(x).trim()).filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x));
  const uniqSlots = [...new Set(slots)].sort();
  const methods = (Array.isArray(s.paymentMethods) ? s.paymentMethods : ['cash']).filter((m) => PAYMENT_METHODS.includes(m));

  await exec(
    `INSERT INTO resto_portal_settings (tenant_id, slug, enabled, accept_orders, accept_reservations, accepting_now,
       delivery_enabled, pickup_enabled, delivery_fee_htg, min_order_htg, prep_minutes, phone, whatsapp, address,
       hours_text, welcome_message, payment_methods, moncash_number, reservation_slots, slot_capacity, max_party, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19::jsonb,$20,$21,NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       slug=EXCLUDED.slug, enabled=EXCLUDED.enabled, accept_orders=EXCLUDED.accept_orders,
       accept_reservations=EXCLUDED.accept_reservations, accepting_now=EXCLUDED.accepting_now,
       delivery_enabled=EXCLUDED.delivery_enabled, pickup_enabled=EXCLUDED.pickup_enabled,
       delivery_fee_htg=EXCLUDED.delivery_fee_htg, min_order_htg=EXCLUDED.min_order_htg,
       prep_minutes=EXCLUDED.prep_minutes, phone=EXCLUDED.phone, whatsapp=EXCLUDED.whatsapp,
       address=EXCLUDED.address, hours_text=EXCLUDED.hours_text, welcome_message=EXCLUDED.welcome_message,
       payment_methods=EXCLUDED.payment_methods, moncash_number=EXCLUDED.moncash_number,
       reservation_slots=EXCLUDED.reservation_slots, slot_capacity=EXCLUDED.slot_capacity,
       max_party=EXCLUDED.max_party, updated_at=NOW()`,
    String(tenantId), slug, !!s.enabled, !!s.acceptOrders, !!s.acceptReservations, !!s.acceptingNow,
    !!s.deliveryEnabled, !!s.pickupEnabled, round2(Math.max(0, num(s.deliveryFeeHtg))), round2(Math.max(0, num(s.minOrderHtg))),
    Math.min(240, Math.max(5, Math.round(num(s.prepMinutes) || 30))),
    clean(s.phone, 40), clean(s.whatsapp, 40), clean(s.address, 200), clean(s.hoursText, 200), clean(s.welcomeMessage, 300),
    JSON.stringify(methods.length ? methods : ['cash']), clean(s.moncashNumber, 40),
    JSON.stringify(uniqSlots.length ? uniqSlots : DEFAULT_SLOTS),
    Math.min(100, Math.max(1, Math.round(num(s.slotCapacity) || 4))),
    Math.min(100, Math.max(1, Math.round(num(s.maxParty) || 12))),
  );
  return getPortalSettings(tenantId, tenantName, tenantSlug);
}

// ══════════════════════════════════════════════
// REZIME (pou tablodbò restoran an)
// ══════════════════════════════════════════════
async function getSummary(tenantId, branchId) {
  const today = haitiNow().date;
  const [menu, low, cats, orders, resv] = await Promise.all([
    productSvc.getAll(tenantId, { module: MODULE, branchId, page: 1, limit: 1 }).catch(() => null),
    productSvc.getLowStock(tenantId, branchId, MODULE).catch(() => []),
    productSvc.getCategories(tenantId, branchId, MODULE).catch(() => []),
    q(`SELECT
         COUNT(*) FILTER (WHERE status = 'nouvo')::int AS nouvo,
         COUNT(*) FILTER (WHERE status IN ('konfime','nan_kizin','pare','sou_wout'))::int AS aktif
       FROM resto_online_orders WHERE tenant_id = $1`, String(tenantId)),
    q(`SELECT COUNT(*)::int AS n FROM resto_reservations
       WHERE tenant_id = $1 AND res_date = $2::date AND status NOT IN ('anile','pa_vini')`, String(tenantId), today),
  ]);
  return {
    menuItems: num(menu?.total ?? menu?.count ?? (menu?.products || []).length),
    lowStock: Array.isArray(low) ? low.length : 0,
    categories: Array.isArray(cats) ? cats.length : 0,
    newOrders: num(orders[0]?.nouvo),
    activeOrders: num(orders[0]?.aktif),
    reservationsToday: num(resv[0]?.n),
  };
}

// ══════════════════════════════════════════════
// KÒMAND AN LIY (bò staff)
// ══════════════════════════════════════════════
const ORDER_FLOW = {
  nouvo: ['konfime', 'anile'],
  konfime: ['nan_kizin', 'anile'],
  nan_kizin: ['pare', 'anile'],
  pare: ['sou_wout', 'livre', 'anile'],
  sou_wout: ['livre', 'anile'],
  livre: [],
  anile: [],
};

function mapOrder(r) {
  return {
    id: r.id,
    code: r.code,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerAddress: r.customer_address || '',
    mode: r.mode,
    paymentMethod: r.payment_method,
    notes: r.notes || '',
    items: Array.isArray(r.items) ? r.items : [],
    subtotalHtg: num(r.subtotal_htg),
    deliveryFeeHtg: num(r.delivery_fee_htg),
    totalHtg: num(r.total_htg),
    status: r.status,
    history: Array.isArray(r.history) ? r.history : [],
    invoiceId: r.invoice_id || null,
    rating: r.rating == null ? null : num(r.rating),
    review: r.review || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function listOnlineOrders(tenantId, { status, scope } = {}) {
  const params = [String(tenantId)];
  let where = 'tenant_id = $1';
  if (status && ORDER_FLOW[status]) { params.push(status); where += ` AND status = $${params.length}`; }
  else if (scope === 'history') where += ` AND status IN ('livre','anile') AND created_at > NOW() - INTERVAL '30 days'`;
  else where += ` AND (status NOT IN ('livre','anile') OR updated_at > NOW() - INTERVAL '12 hours')`;
  const rows = await q(`SELECT * FROM resto_online_orders WHERE ${where} ORDER BY created_at DESC LIMIT 200`, ...params);
  return rows.map(mapOrder);
}

async function countNewOrders(tenantId) {
  const r = await q(`SELECT COUNT(*)::int AS n FROM resto_online_orders WHERE tenant_id = $1 AND status = 'nouvo'`, String(tenantId));
  return num(r[0]?.n);
}

async function getOrderRow(tenantId, id) {
  const rows = await q('SELECT * FROM resto_online_orders WHERE tenant_id = $1 AND id = $2', String(tenantId), String(id));
  if (!rows[0]) throw httpError(404, 'ORDER_NOT_FOUND', 'Kòmand pa jwenn.');
  return rows[0];
}

async function updateOrderStatus(tenantId, id, status, user) {
  const row = await getOrderRow(tenantId, id);
  const allowed = ORDER_FLOW[row.status] || [];
  if (!allowed.includes(status)) throw httpError(400, 'BAD_TRANSITION', 'Chanjman estati sa a pa posib.');
  if (status === 'sou_wout' && row.mode !== 'delivery') throw httpError(400, 'BAD_TRANSITION', 'Kòmand sa a pa pou livrezon.');
  const entry = { status, at: new Date().toISOString(), by: user?.name || user?.email || null };
  const rows = await q(
    `UPDATE resto_online_orders SET status = $3, history = history || $4::jsonb, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    String(tenantId), String(id), status, JSON.stringify([entry]),
  );
  return mapOrder(rows[0]);
}

async function linkOrderInvoice(tenantId, id, invoiceId) {
  await getOrderRow(tenantId, id);
  const rows = await q(
    `UPDATE resto_online_orders SET invoice_id = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    String(tenantId), String(id), invoiceId ? String(invoiceId) : null,
  );
  return mapOrder(rows[0]);
}

// ══════════════════════════════════════════════
// REZÈVASYON (bò staff)
// ══════════════════════════════════════════════
const RESV_STATUSES = ['an_atant', 'konfime', 'chita', 'fini', 'anile', 'pa_vini'];

function mapReservation(r) {
  return {
    id: r.id,
    code: r.code,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email || '',
    partySize: num(r.party_size),
    date: toDateStr(r.res_date),
    time: r.res_time,
    notes: r.notes || '',
    status: r.status,
    tableId: r.table_id || null,
    tableName: r.table_name || '',
    source: r.source,
    createdAt: r.created_at,
  };
}

async function listReservations(tenantId, { date, from, to } = {}) {
  const params = [String(tenantId)];
  let where = 'tenant_id = $1';
  if (date) { params.push(String(date).slice(0, 10)); where += ` AND res_date = $${params.length}::date`; }
  else {
    params.push(String(from || haitiNow().date).slice(0, 10)); where += ` AND res_date >= $${params.length}::date`;
    if (to) { params.push(String(to).slice(0, 10)); where += ` AND res_date <= $${params.length}::date`; }
  }
  const rows = await q(`SELECT * FROM resto_reservations WHERE ${where} ORDER BY res_date ASC, res_time ASC LIMIT 500`, ...params);
  return rows.map(mapReservation);
}

async function genCode(table, tenantId, prefix) {
  for (let i = 0; i < 8; i++) {
    const code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}${i > 4 ? Math.floor(Math.random() * 10) : ''}`;
    const r = await q(`SELECT 1 FROM ${table} WHERE tenant_id = $1 AND code = $2`, String(tenantId), code);
    if (!r.length) return code;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function validateReservationInput(data, maxParty) {
  const name = clean(data.customerName || data.name, 80);
  const phone = clean(data.customerPhone || data.phone, 30);
  const partySize = Math.round(num(data.partySize));
  const date = String(data.date || '').slice(0, 10);
  const time = String(data.time || '').slice(0, 5);
  if (name.length < 2) throw httpError(400, 'NAME_REQUIRED', 'Non obligatwa.');
  if (digits(phone).length < 8) throw httpError(400, 'PHONE_INVALID', 'Nimewo telefòn pa bon.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError(400, 'DATE_INVALID', 'Dat pa bon.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw httpError(400, 'TIME_INVALID', 'Lè pa bon.');
  if (partySize < 1 || partySize > (maxParty || 50)) throw httpError(400, 'PARTY_INVALID', 'Kantite moun pa bon.');
  return { name, phone, partySize, date, time, email: clean(data.customerEmail || data.email, 120), notes: clean(data.notes, 300) };
}

async function insertReservation(tenantId, v, source) {
  const code = await genCode('resto_reservations', tenantId, 'RZ');
  const rows = await q(
    `INSERT INTO resto_reservations (id, tenant_id, code, customer_name, customer_phone, customer_email, party_size,
       res_date, res_time, notes, status, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11,$12) RETURNING *`,
    newId(), String(tenantId), code, v.name, v.phone, v.email || null, v.partySize, v.date, v.time, v.notes || null,
    source === 'staff' ? 'konfime' : 'an_atant', source,
  );
  return mapReservation(rows[0]);
}

async function createReservationStaff(tenantId, data) {
  const v = validateReservationInput(data, 100);
  return insertReservation(tenantId, v, 'staff');
}

async function updateReservation(tenantId, id, data) {
  const rows = await q('SELECT * FROM resto_reservations WHERE tenant_id = $1 AND id = $2', String(tenantId), String(id));
  if (!rows[0]) throw httpError(404, 'RESV_NOT_FOUND', 'Rezèvasyon pa jwenn.');
  const cur = rows[0];
  const status = data.status && RESV_STATUSES.includes(data.status) ? data.status : cur.status;
  const tableId = data.tableId !== undefined ? (data.tableId ? String(data.tableId) : null) : cur.table_id;
  const tableName = data.tableName !== undefined ? clean(data.tableName, 60) : cur.table_name;
  const partySize = data.partySize ? Math.max(1, Math.round(num(data.partySize))) : num(cur.party_size);
  const time = data.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.time) ? data.time : cur.res_time;
  const date = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : toDateStr(cur.res_date);
  const notes = data.notes !== undefined ? clean(data.notes, 300) : cur.notes;
  const out = await q(
    `UPDATE resto_reservations SET status=$3, table_id=$4, table_name=$5, party_size=$6, res_time=$7, res_date=$8::date,
       notes=$9, updated_at=NOW() WHERE tenant_id=$1 AND id=$2 RETURNING *`,
    String(tenantId), String(id), status, tableId, tableName || null, partySize, time, date, notes || null,
  );
  return mapReservation(out[0]);
}

module.exports = {
  MODULE, DEFAULT_SLOTS, PAYMENT_METHODS,
  // meni
  getMenu, getMenuItem, createMenuItem, updateMenuItem, removeMenuItem, adjustStock, getLowStock,
  getCategories, createCategory, updateCategory, deleteCategory,
  // pòtal
  getSettingsRow, mapSettings, getPortalSettings, savePortalSettings,
  // rezime
  getSummary,
  // kòmand
  mapOrder, listOnlineOrders, countNewOrders, updateOrderStatus, linkOrderInvoice, genCode,
  // rezèvasyon
  mapReservation, listReservations, createReservationStaff, updateReservation, validateReservationInput, insertReservation,
};
