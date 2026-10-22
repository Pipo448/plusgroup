// src/modules/restaurant/restaurant.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const svc = require('./restaurant.service');
const pub = require('./restaurant.public.service');
const sales = require('./restaurant.sales.service');
const { handle } = require('./restaurant.db');

const tenantNameOf = (req) => req.tenant?.businessName || req.tenant?.name || 'Restoran';
const tenantSlugOf = (req) => req.tenant?.slug || null;

// ══════════════════════════════════════════════
// MENI
// ══════════════════════════════════════════════
const getMenu = asyncHandler(async (req, res) => {
  const data = await svc.getMenu(req.tenant.id, { ...req.query, branchId: req.branchId || undefined });
  res.json({ success: true, ...data });
});

const getLowStock = asyncHandler(async (req, res) => {
  const data = await svc.getLowStock(req.tenant.id, req.branchId || undefined);
  res.json({ success: true, products: data });
});

const getMenuItem = asyncHandler(async (req, res) => {
  const data = await svc.getMenuItem(req.tenant.id, req.params.id);
  res.json({ success: true, product: data });
});

const createMenuItem = asyncHandler(async (req, res) => {
  const data = await svc.createMenuItem(req.tenant.id, req.user.id, {
    ...req.body,
    branchId: req.body.branchId || req.branchId || null,
  });
  pub.invalidatePortalCache(req.tenant.id);
  res.status(201).json({ success: true, product: data });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const data = await svc.updateMenuItem(req.tenant.id, req.params.id, req.user.id, req.body);
  pub.invalidatePortalCache(req.tenant.id);
  res.json({ success: true, product: data });
});

const removeMenuItem = asyncHandler(async (req, res) => {
  const result = await svc.removeMenuItem(req.tenant.id, req.params.id);
  pub.invalidatePortalCache(req.tenant.id);
  res.json({
    success: true,
    message: result?.message || 'Atik meni siprime avèk siksè.',
    soft: result?.soft || false,
  });
});

const adjustStock = asyncHandler(async (req, res) => {
  const data = await svc.adjustStock(req.tenant.id, req.params.id, req.user.id, { ...req.body, branchId: req.branchId || undefined });
  pub.invalidatePortalCache(req.tenant.id);
  res.json({ success: true, product: data });
});

const getCategories = asyncHandler(async (req, res) => {
  const data = await svc.getCategories(req.tenant.id, req.branchId || undefined);
  res.json({ success: true, categories: data });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await svc.createCategory(req.tenant.id, req.branchId || null, req.body);
  pub.invalidatePortalCache(req.tenant.id);
  res.status(201).json({ success: true, category: data });
});

const updateCategory = asyncHandler(async (req, res) => {
  const data = await svc.updateCategory(req.tenant.id, req.params.id, req.body);
  pub.invalidatePortalCache(req.tenant.id);
  res.json({ success: true, category: data });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await svc.deleteCategory(req.tenant.id, req.params.id);
  pub.invalidatePortalCache(req.tenant.id);
  res.json({ success: true, message: 'Kategori siprime.' });
});

// ══════════════════════════════════════════════
// REZIME + PÒTAL
// ══════════════════════════════════════════════
const getSummary = handle(async (req, res) => {
  const data = await svc.getSummary(req.tenant.id, req.branchId || undefined);
  res.json({ success: true, tenant: { id: req.tenant.id, name: tenantNameOf(req) }, summary: data });
});

const getPortalSettings = handle(async (req, res) => {
  const settings = await svc.getPortalSettings(req.tenant.id, tenantNameOf(req), tenantSlugOf(req));
  res.json({ success: true, tenant: { id: req.tenant.id, name: tenantNameOf(req) }, settings: { ...settings, allowed: sales.portalAllowed(req.tenant) } });
});

const savePortalSettings = handle(async (req, res) => {
  const allowed = sales.portalAllowed(req.tenant);
  const settings = await svc.savePortalSettings(req.tenant.id, tenantNameOf(req), req.body || {}, tenantSlugOf(req), allowed);
  pub.invalidatePortalCache(req.tenant.id);
  res.json({ success: true, settings: { ...settings, allowed } });
});

// ══════════════════════════════════════════════
// KÒMAND AN LIY
// ══════════════════════════════════════════════
const listOnlineOrders = handle(async (req, res) => {
  const orders = await svc.listOnlineOrders(req.tenant.id, { status: req.query.status, scope: req.query.scope });
  res.json({ success: true, orders });
});

const countNewOrders = handle(async (req, res) => {
  res.json({ success: true, count: await svc.countNewOrders(req.tenant.id) });
});

const updateOrderStatus = handle(async (req, res) => {
  const order = await svc.updateOrderStatus(req.tenant.id, req.params.id, req.body?.status, req.user);
  res.json({ success: true, order });
});

const linkOrderInvoice = handle(async (req, res) => {
  const order = await svc.linkOrderInvoice(req.tenant.id, req.params.id, req.body?.invoiceId);
  res.json({ success: true, order });
});

// ══════════════════════════════════════════════
// REZÈVASYON
// ══════════════════════════════════════════════
const listReservations = handle(async (req, res) => {
  const reservations = await svc.listReservations(req.tenant.id, req.query);
  res.json({ success: true, reservations });
});

const createReservation = handle(async (req, res) => {
  const reservation = await svc.createReservationStaff(req.tenant.id, req.body || {});
  res.status(201).json({ success: true, reservation });
});

const updateReservation = handle(async (req, res) => {
  const reservation = await svc.updateReservation(req.tenant.id, req.params.id, req.body || {});
  res.json({ success: true, reservation });
});

// ══════════════════════════════════════════════
// VANT, RAPÒ, TABLO BÒ, PREFERANS
// ══════════════════════════════════════════════
const recordSale = handle(async (req, res) => {
  const r = await sales.recordSale(req.tenant.id, req.branchId, req.user, req.body || {});
  res.status(r.created ? 201 : 200).json({ success: true, ...r });
});

// Kesye wè SÈLMAN pwòp vant li; admin ka filtre pa kesye
const getReport = handle(async (req, res) => {
  const role = req.user?.role;
  const cashierId = role === 'admin' || req.user?.isAdmin ? (req.query.cashierId || undefined) : req.user?.id;
  const report = await sales.getReport(req.tenant.id, { from: req.query.from, to: req.query.to, cashierId, branchId: req.branchId });
  res.json({ success: true, tenant: { name: tenantNameOf(req) }, scope: cashierId ? 'cashier' : 'all', cashier: cashierId ? (req.user?.fullName || req.user?.email) : null, report });
});

const getDashboard = handle(async (req, res) => {
  res.json({ success: true, tenant: { name: tenantNameOf(req) }, dashboard: await sales.getDashboard(req.tenant.id, req.branchId) });
});

const getPrefs = handle(async (req, res) => {
  res.json({ success: true, prefs: await sales.getPrefs(req.tenant) });
});

const setPrefs = handle(async (req, res) => {
  res.json({ success: true, prefs: await sales.setDashboardMode(req.tenant, req.body?.dashboardMode ?? req.body?.mode) });
});

module.exports = {
  recordSale, getReport, getDashboard, getPrefs, setPrefs,
  getMenu, getLowStock, getMenuItem, createMenuItem, updateMenuItem, removeMenuItem, adjustStock,
  getCategories, createCategory, updateCategory, deleteCategory,
  getSummary, getPortalSettings, savePortalSettings,
  listOnlineOrders, countNewOrders, updateOrderStatus, linkOrderInvoice,
  listReservations, createReservation, updateReservation,
};
