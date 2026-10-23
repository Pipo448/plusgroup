// src/modules/restaurant/restaurant.public.service.js
// ─── Pòtal piblik kliyan: meni, kòmand an liy, swivi, rezèvasyon ──────
// Pa gen otantifikasyon isit la: tenant an idantifye pa non li nan URL la
// (/resto/:slug). Pri yo toujou kalkile sou sèvè a, jamè soti nan kliyan an.

const productSvc = require('../products/product.service');
const svc = require('./restaurant.service');
const { portalAllowed } = require('./restaurant.sales.service');
const flyerSvc = require('./restaurant.flyers.service');
const kindSvc = require('./restaurant.kinds.service');
const sharedSvc = require('./restaurant.shared.service');
const {
  q, getPrisma, httpError, newId, num, round2, clean, digits, slugify, haitiNow, addDays,
} = require('./restaurant.db');

// ── Chèche tenant an pa slug ─────────────────────────────────────────
let tenantMeta = null;
function getTenantMeta() {
  if (tenantMeta) return tenantMeta;
  let fields = []; let idType = 'String';
  try {
    const { Prisma } = require('@prisma/client');
    const model = (Prisma.dmmf?.datamodel?.models || []).find((m) => m.name.toLowerCase() === 'tenant');
    if (model) {
      fields = model.fields.map((f) => f.name);
      idType = (model.fields.find((f) => f.name === 'id') || {}).type || 'String';
    }
  } catch (_) { /* dmmf pa disponib */ }
  tenantMeta = { fields, idType };
  return tenantMeta;
}
const castId = (id) => (getTenantMeta().idType === 'Int' ? Number(id) : String(id));
const has = (f) => getTenantMeta().fields.includes(f);

async function findTenantById(id) {
  const prisma = getPrisma();
  try { return await prisma.tenant.findFirst({ where: { id: castId(id) } }); } catch (_) { return null; }
}

const slugCache = new Map(); // slug → { tenantId, at }
async function resolveTenant(slugRaw) {
  const slug = slugify(slugRaw);
  if (!slug) throw httpError(404, 'PORTAL_NOT_FOUND', 'Restoran pa jwenn.');

  const hit = slugCache.get(slug);
  let tenantId = hit && Date.now() - hit.at < 5 * 60 * 1000 ? hit.tenantId : null;

  if (!tenantId) {
    // 1) slug ki anrejistre nan paramèt pòtal la
    const r = await q('SELECT tenant_id FROM resto_portal_settings WHERE slug = $1', slug);
    if (r[0]) tenantId = r[0].tenant_id;
  }
  if (!tenantId) {
    // 2) chan slug/subdomain tenant an si li egziste
    const prisma = getPrisma();
    for (const f of ['slug', 'subdomain', 'code', 'handle', 'username']) {
      if (!has(f)) continue;
      try {
        const t = await prisma.tenant.findFirst({ where: { [f]: slug } });
        if (t) { tenantId = String(t.id); break; }
      } catch (_) { /* kontinye */ }
    }
  }
  if (!tenantId) {
    // 3) non tenant an (slugify) — egz. "Chez Marie Resto" → chez-marie-resto
    try {
      const all = await getPrisma().tenant.findMany({ select: { id: true, name: true } });
      const t = all.find((x) => slugify(x.name) === slug);
      if (t) tenantId = String(t.id);
    } catch (_) { /* kontinye */ }
  }
  if (!tenantId) throw httpError(404, 'PORTAL_NOT_FOUND', 'Restoran pa jwenn.');
  slugCache.set(slug, { tenantId, at: Date.now() });

  const tenant = await findTenantById(tenantId);
  if (!tenant) throw httpError(404, 'PORTAL_NOT_FOUND', 'Restoran pa jwenn.');
  if (tenant.isActive === false || tenant.active === false || ['suspended', 'inactive', 'blocked'].includes(String(tenant.status || '').toLowerCase())) {
    throw httpError(404, 'PORTAL_NOT_FOUND', 'Restoran pa jwenn.');
  }
  // Super Admin lan dwe otorize pòtal la pou tenant sa a
  if (!portalAllowed(tenant)) throw httpError(403, 'PORTAL_DISABLED', 'Pòtal la pa aktive.');
  const row = await svc.getSettingsRow(tenantId);
  const tenantName = tenant.businessName || tenant.name || 'Restoran';
  const settings = svc.mapSettings(row, tenantName, tenant.slug);
  if (!settings.enabled) throw httpError(403, 'PORTAL_DISABLED', 'Pòtal la pa aktive.');
  return { tenantId: String(tenantId), tenant, tenantName, settings };
}

// ── Meni piblik (kach 60s pou ekonomize trafik DB) ─────────────────────
const menuCache = new Map(); // tenantId → { at, data }
async function getPublicMenu(tenantId) {
  const hit = menuCache.get(tenantId);
  if (hit && Date.now() - hit.at < 60 * 1000) return hit.data;

  const [res, cats] = await Promise.all([
    productSvc.getAll(castId(tenantId), { module: svc.MODULE, page: 1, limit: 500 }),
    productSvc.getCategories(castId(tenantId), undefined, svc.MODULE).catch(() => []),
  ]);
  // ✅ NOUVO — pwodui estòk jeneral ki pataje ak restoran an (yon sèl estòk)
  const sharedProducts = await sharedSvc.getSharedProducts(castId(tenantId)).catch(() => []);
  const products = [...(res?.products || res?.data || []), ...sharedProducts].filter((p) => p && p.isActive !== false && !p.deletedAt);
  const items = products.map((p) => ({
    id: String(p.id),
    name: p.name,
    description: p.description || '',
    priceHtg: num(p.priceHtg),
    priceUsd: num(p.priceUsd),
    unit: p.unit || '',
    categoryId: p.categoryId ? String(p.categoryId) : null,
    category: p.category?.name || null,
    available: num(p.quantity) > 0,
    hasImage: !!p.imageUrl,
    v: p.updatedAt ? new Date(p.updatedAt).getTime() : 0,
  }));
  const usedCats = new Set(items.map((i) => i.categoryId).filter(Boolean));
  const kinded = await kindSvc.withKinds(tenantId, Array.isArray(cats) ? cats : []).catch(() => cats || []);
  const catKind = new Map(kinded.map((c) => [String(c.id), c.kind]));
  items.forEach((i) => { i.kind = (i.categoryId && catKind.get(i.categoryId)) || kindSvc.guessKind(i.name); });
  const categories = kinded
    .map((c) => ({ id: String(c.id), name: c.name, kind: c.kind || 'food' }))
    .filter((c) => usedCats.has(c.id));
  const data = { items, categories, byId: new Map(items.map((i) => [i.id, i])) };
  menuCache.set(tenantId, { at: Date.now(), data });
  return data;
}

async function getPortal(slug) {
  const { tenantId, tenant, tenantName, settings } = await resolveTenant(slug);
  const menu = await getPublicMenu(tenantId);
  const logo = tenant.logoUrl || tenant.logo || null;
  const rating = await getRatingSummary(tenantId);
  const flyers = await flyerSvc.listFlyers(tenantId).catch(() => []);
  return {
    flyers: flyers.map((f) => ({ id: f.id, title: f.title, width: f.width, height: f.height, v: f.v })),
    restaurant: {
      name: tenantName,
      slug: settings.slug,
      hasLogo: !!logo,
      exchangeRate: num(tenant.exchangeRate) || null,
      phone: settings.phone, whatsapp: settings.whatsapp, address: settings.address,
      hoursText: settings.hoursText, welcomeMessage: settings.welcomeMessage,
      rating: rating.avg, ratingCount: rating.count,
    },
    settings: {
      acceptOrders: settings.acceptOrders && settings.acceptingNow,
      ordersPaused: settings.acceptOrders && !settings.acceptingNow,
      acceptReservations: settings.acceptReservations,
      deliveryEnabled: settings.deliveryEnabled,
      pickupEnabled: settings.pickupEnabled,
      deliveryFeeHtg: settings.deliveryFeeHtg,
      minOrderHtg: settings.minOrderHtg,
      prepMinutes: settings.prepMinutes,
      paymentMethods: settings.paymentMethods,
      moncashNumber: settings.moncashNumber,
      maxParty: settings.maxParty,
    },
    categories: menu.categories,
    items: menu.items,
  };
}

// ── Nòt restoran an (mwayèn 180 dènye jou, kach 5 min) ───────────────
const ratingCache = new Map();
async function getRatingSummary(tenantId) {
  const hit = ratingCache.get(tenantId);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.data;
  const r = await q(
    `SELECT ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(rating)::int AS n FROM resto_online_orders
     WHERE tenant_id = $1 AND rating IS NOT NULL AND rated_at > NOW() - INTERVAL '180 days'`, tenantId,
  );
  const data = { avg: r[0]?.avg == null ? null : num(r[0].avg), count: num(r[0]?.n) };
  ratingCache.set(tenantId, { at: Date.now(), data });
  return data;
}

// ── Imaj (base64 nan DB → binè ak kach navigatè) ─────────────────────
function decodeImage(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return { redirect: src };
  // Logo/foto ki sove kòm fichye (/uploads/...) — sèvi pa express.static nan index.js
  if (src.startsWith('/uploads/') || src.startsWith('uploads/')) return { redirect: src.startsWith('/') ? src : `/${src}` };
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(src);
  if (!m) return null;
  return { type: m[1], buffer: Buffer.from(m[2], 'base64') };
}

async function getItemImage(slug, productId) {
  const { tenantId } = await resolveTenant(slug);
  const menu = await getPublicMenu(tenantId);
  if (!menu.byId.has(String(productId))) throw httpError(404, 'NOT_FOUND', 'Imaj pa jwenn.');
  const p = await productSvc.getOne(castId(tenantId), productId);
  const img = decodeImage(p?.imageUrl);
  if (!img) throw httpError(404, 'NOT_FOUND', 'Imaj pa jwenn.');
  return img;
}

async function getFlyerImage(slug, id) {
  const { tenantId } = await resolveTenant(slug);
  return flyerSvc.getFlyerImage(tenantId, id);
}

async function getLogo(slug) {
  const { tenant } = await resolveTenant(slug);
  const img = decodeImage(tenant.logoUrl || tenant.logo);
  if (!img) throw httpError(404, 'NOT_FOUND', 'Logo pa jwenn.');
  return img;
}

// ── Kreye kòmand ─────────────────────────────────────────────────────
async function createOrder(slug, body) {
  const { tenantId, settings } = await resolveTenant(slug);
  if (!settings.acceptOrders) throw httpError(403, 'ORDERS_DISABLED', 'Restoran an pa pran kòmand an liy.');
  if (!settings.acceptingNow) throw httpError(403, 'ORDERS_PAUSED', 'Restoran an pa pran kòmand kounye a.');
  if (body.website) throw httpError(400, 'SPAM', 'Demann refize.');

  const mode = body.mode === 'delivery' ? 'delivery' : 'pickup';
  if (mode === 'delivery' && !settings.deliveryEnabled) throw httpError(400, 'MODE_UNAVAILABLE', 'Livrezon pa disponib.');
  if (mode === 'pickup' && !settings.pickupEnabled) throw httpError(400, 'MODE_UNAVAILABLE', 'Pran sou plas pa disponib.');

  const c = body.customer || {};
  const name = clean(c.name, 80);
  const phone = clean(c.phone, 30);
  const address = clean(c.address, 250);
  if (name.length < 2) throw httpError(400, 'NAME_REQUIRED', 'Non obligatwa.');
  if (digits(phone).length < 8) throw httpError(400, 'PHONE_INVALID', 'Nimewo telefòn pa bon.');
  if (mode === 'delivery' && address.length < 5) throw httpError(400, 'ADDRESS_REQUIRED', 'Adrès obligatwa pou livrezon.');

  const paymentMethod = settings.paymentMethods.includes(body.paymentMethod) ? body.paymentMethod : settings.paymentMethods[0] || 'cash';

  const raw = Array.isArray(body.items) ? body.items : [];
  if (!raw.length) throw httpError(400, 'CART_EMPTY', 'Panye a vid.');
  if (raw.length > 50) throw httpError(400, 'CART_TOO_BIG', 'Twòp atik.');

  menuCache.delete(tenantId); // toujou verifye ak done fre
  const menu = await getPublicMenu(tenantId);
  const merged = new Map();
  for (const it of raw) {
    const id = String(it.productId || it.id || '');
    const qty = Math.round(num(it.qty || it.quantity));
    if (!id || qty < 1 || qty > 50) throw httpError(400, 'ITEM_INVALID', 'Atik pa bon.');
    const p = menu.byId.get(id);
    if (!p) throw httpError(400, 'ITEM_NOT_FOUND', 'Yon atik pa egziste ankò.');
    if (!p.available) throw httpError(400, 'ITEM_UNAVAILABLE', `${p.name} pa disponib.`);
    const prev = merged.get(id);
    merged.set(id, { productId: id, name: p.name, unitPriceHtg: p.priceHtg, qty: (prev ? prev.qty : 0) + qty, note: clean(it.note, 120) || (prev && prev.note) || '' });
  }
  const items = [...merged.values()].map((i) => ({ ...i, totalHtg: round2(i.unitPriceHtg * i.qty) }));
  const subtotal = round2(items.reduce((s, i) => s + i.totalHtg, 0));
  if (settings.minOrderHtg > 0 && subtotal < settings.minOrderHtg) throw httpError(400, 'MIN_ORDER', 'Montan minimòm pa rive.');
  const fee = mode === 'delivery' ? round2(settings.deliveryFeeHtg) : 0;
  const total = round2(subtotal + fee);

  const code = await svc.genCode('resto_online_orders', tenantId, 'PR');
  const history = [{ status: 'nouvo', at: new Date().toISOString(), by: 'kliyan' }];
  const rows = await q(
    `INSERT INTO resto_online_orders (id, tenant_id, code, customer_name, customer_phone, customer_address, mode,
       payment_method, notes, items, subtotal_htg, delivery_fee_htg, total_htg, status, history)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,'nouvo',$14::jsonb) RETURNING *`,
    newId(), tenantId, code, name, phone, mode === 'delivery' ? address : null, mode, paymentMethod,
    clean(body.notes, 300) || null, JSON.stringify(items), subtotal, fee, total, JSON.stringify(history),
  );
  return publicOrder(rows[0], settings);
}

function publicOrder(r, settings) {
  const o = svc.mapOrder(r);
  return {
    code: o.code, status: o.status, mode: o.mode, paymentMethod: o.paymentMethod,
    customerName: o.customerName, items: o.items.map(({ name, qty, unitPriceHtg, totalHtg, note }) => ({ name, qty, unitPriceHtg, totalHtg, note })),
    subtotalHtg: o.subtotalHtg, deliveryFeeHtg: o.deliveryFeeHtg, totalHtg: o.totalHtg,
    history: o.history.map(({ status, at }) => ({ status, at })),
    rating: o.rating, review: o.review,
    prepMinutes: settings?.prepMinutes || 30, createdAt: o.createdAt,
    phoneLast4: digits(o.customerPhone).slice(-4),
  };
}

async function trackOrder(slug, code, phone) {
  const { tenantId, settings } = await resolveTenant(slug);
  const rows = await q('SELECT * FROM resto_online_orders WHERE tenant_id = $1 AND code = $2', tenantId, String(code || '').toUpperCase());
  const r = rows[0];
  const last4 = digits(phone).slice(-4);
  if (!r || last4.length < 4 || digits(r.customer_phone).slice(-4) !== last4) throw httpError(404, 'ORDER_NOT_FOUND', 'Kòmand pa jwenn.');
  return publicOrder(r, settings);
}

// Kliyan an bay yon nòt (yon sèl fwa) apre kòmand lan livre
async function rateOrder(slug, code, body) {
  const { tenantId } = await resolveTenant(slug);
  const rows = await q('SELECT * FROM resto_online_orders WHERE tenant_id = $1 AND code = $2', tenantId, String(code || '').toUpperCase());
  const r = rows[0];
  const last4 = digits(body.phone).slice(-4);
  if (!r || last4.length < 4 || digits(r.customer_phone).slice(-4) !== last4) throw httpError(404, 'ORDER_NOT_FOUND', 'Kòmand pa jwenn.');
  if (r.status !== 'livre') throw httpError(400, 'NOT_DELIVERED', 'Kòmand lan poko livre.');
  if (r.rating != null) throw httpError(409, 'ALREADY_RATED', 'Ou deja bay nòt.');
  const rating = Math.round(num(body.rating));
  if (rating < 1 || rating > 5) throw httpError(400, 'RATING_INVALID', 'Nòt la pa bon.');
  await q('UPDATE resto_online_orders SET rating = $3, review = $4, rated_at = NOW() WHERE tenant_id = $1 AND id = $2', tenantId, r.id, rating, clean(body.review, 300) || null);
  ratingCache.delete(tenantId);
  return { rating };
}

// ── Rezèvasyon ───────────────────────────────────────────────────────
async function availability(slug, date) {
  const { tenantId, settings } = await resolveTenant(slug);
  if (!settings.acceptReservations) throw httpError(403, 'RESV_DISABLED', 'Rezèvasyon pa disponib.');
  const now = haitiNow();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : now.date;
  if (d < now.date || d > addDays(now.date, 60)) throw httpError(400, 'DATE_INVALID', 'Dat pa bon.');
  const rows = await q(
    `SELECT res_time, COUNT(*)::int AS n FROM resto_reservations
     WHERE tenant_id = $1 AND res_date = $2::date AND status NOT IN ('anile','pa_vini') GROUP BY res_time`,
    tenantId, d,
  );
  const used = Object.fromEntries(rows.map((r) => [r.res_time, num(r.n)]));
  return {
    date: d,
    slots: settings.reservationSlots.map((t) => ({
      time: t,
      available: (used[t] || 0) < settings.slotCapacity && !(d === now.date && t <= now.time),
    })),
    maxParty: settings.maxParty,
  };
}

async function createReservation(slug, body) {
  const { tenantId, settings } = await resolveTenant(slug);
  if (!settings.acceptReservations) throw httpError(403, 'RESV_DISABLED', 'Rezèvasyon pa disponib.');
  if (body.website) throw httpError(400, 'SPAM', 'Demann refize.');
  const v = svc.validateReservationInput(body, settings.maxParty);
  const av = await availability(slug, v.date);
  const slot = av.slots.find((s) => s.time === v.time);
  if (!slot || !slot.available) throw httpError(409, 'SLOT_FULL', 'Lè sa a pa disponib ankò.');
  const r = await svc.insertReservation(tenantId, v, 'online');
  return { code: r.code, status: r.status, date: r.date, time: r.time, partySize: r.partySize, customerName: r.customerName };
}

async function trackReservation(slug, code, phone) {
  const { tenantId } = await resolveTenant(slug);
  const rows = await q('SELECT * FROM resto_reservations WHERE tenant_id = $1 AND code = $2', tenantId, String(code || '').toUpperCase());
  const r = rows[0];
  const last4 = digits(phone).slice(-4);
  if (!r || last4.length < 4 || digits(r.customer_phone).slice(-4) !== last4) throw httpError(404, 'RESV_NOT_FOUND', 'Rezèvasyon pa jwenn.');
  const m = svc.mapReservation(r);
  return { code: m.code, status: m.status, date: m.date, time: m.time, partySize: m.partySize, customerName: m.customerName };
}

// ══════════════════════════════════════════════
// ANYÈ « PLUS RESTO » — tout restoran ki gen pòtal aktif, ranje pa distans
// ══════════════════════════════════════════════
const TENANT_OFF = (t) => !t || t.isActive === false || t.active === false
  || ['suspended', 'inactive', 'blocked', 'cancelled'].includes(String(t.status || '').toLowerCase());

let dirCache = null; // { at, list }
const DIR_TTL = 3 * 60 * 1000;

async function buildDirectory() {
  if (dirCache && Date.now() - dirCache.at < DIR_TTL) return dirCache.list;
  const rows = await q('SELECT * FROM resto_portal_settings WHERE enabled = TRUE AND listed IS NOT FALSE');
  const list = [];
  for (const row of rows) {
    const tenant = await findTenantById(row.tenant_id);
    if (TENANT_OFF(tenant) || !portalAllowed(tenant)) continue; // Super Admin lan dwe otorize pòtal la
    const name = tenant.businessName || tenant.name || 'Restoran';
    const st = svc.mapSettings(row, name, tenant.slug);
    const [rating, menu] = await Promise.all([
      getRatingSummary(String(row.tenant_id)).catch(() => ({ avg: null, count: 0 })),
      getPublicMenu(String(row.tenant_id)).catch(() => ({ items: [] })),
    ]);
    const cover = menu.items.find((i) => i.hasImage && i.available) || menu.items.find((i) => i.hasImage);
    list.push({
      slug: st.slug,
      name,
      city: st.city,
      cuisine: st.cuisine,
      address: st.address,
      hoursText: st.hoursText,
      lat: st.latitude,
      lng: st.longitude,
      hasLogo: !!(tenant.logoUrl || tenant.logo),
      cover: cover ? { id: cover.id, v: cover.v } : null,
      dishes: menu.items.filter((i) => i.available).length,
      rating: rating.avg,
      ratingCount: rating.count,
      open: st.acceptOrders && st.acceptingNow,
      acceptOrders: st.acceptOrders,
      acceptReservations: st.acceptReservations,
      delivery: st.deliveryEnabled,
      pickup: st.pickupEnabled,
      deliveryFeeHtg: st.deliveryFeeHtg,
      prepMinutes: st.prepMinutes,
    });
  }
  dirCache = { at: Date.now(), list };
  return list;
}

// Distans an km (fòmil Haversine)
function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fold = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function listDirectory({ lat, lng, q: query, city, delivery, open } = {}) {
  const base = await buildDirectory();
  const la = Number(lat), lo = Number(lng);
  const hasPos = lat != null && lng != null && lat !== '' && lng !== '' && Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  const needle = fold(query).trim();
  const cityF = fold(city).trim();

  let list = base.map((r) => ({
    ...r,
    distanceKm: hasPos && r.lat != null && r.lng != null ? Math.round(distanceKm(la, lo, r.lat, r.lng) * 10) / 10 : null,
  }));
  if (needle) list = list.filter((r) => [r.name, r.cuisine, r.city, r.address].some((f) => fold(f).includes(needle)));
  if (cityF) list = list.filter((r) => fold(r.city) === cityF);
  if (String(delivery) === '1') list = list.filter((r) => r.delivery && r.acceptOrders);
  if (String(open) === '1') list = list.filter((r) => r.open);

  list.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return (Number(b.open) - Number(a.open)) || ((b.rating || 0) - (a.rating || 0)) || a.name.localeCompare(b.name);
  });

  const cities = [...new Set(base.map((r) => r.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return { restaurants: list.slice(0, 100), cities, total: base.length, located: hasPos };
}

function invalidatePortalCache(tenantId) {
  menuCache.delete(String(tenantId));
  kindSvc.invalidate(tenantId);
  sharedSvc.invalidate(tenantId);
  slugCache.clear();
  dirCache = null;
}

module.exports = {
  resolveTenant, getPortal, getItemImage, getLogo, getFlyerImage, createOrder, trackOrder, rateOrder,
  availability, createReservation, trackReservation, invalidatePortalCache, listDirectory,
};