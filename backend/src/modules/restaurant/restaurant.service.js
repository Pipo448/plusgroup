// src/modules/restaurant/restaurant.service.js
// ─── Restoran: Meni (Manje/Bwason) ──────────────────────────
// Reyitilize KONPLÈTMAN modèl Product/ProductCategory ak tout mekanis
// estòk, mouvman, ak entegrasyon Fakti/Devi ki deja egziste — jis ak
// tag module="restaurant" pou separe l de katalòg jeneral la.

const productSvc = require('../products/product.service');

const MODULE = 'restaurant';

// ── MENI (Manje/Bwason)
const getMenu = (tenantId, params) =>
  productSvc.getAll(tenantId, { ...params, module: MODULE });

const getMenuItem = (tenantId, id) => productSvc.getOne(tenantId, id);

const createMenuItem = (tenantId, userId, data) =>
  productSvc.create(tenantId, userId, { ...data, module: MODULE });

const updateMenuItem = (tenantId, id, userId, data) =>
  productSvc.update(tenantId, id, userId, { ...data, module: MODULE });

const removeMenuItem = (tenantId, id) => productSvc.remove(tenantId, id);

const adjustStock = (tenantId, id, userId, data) =>
  productSvc.adjustStock(tenantId, id, userId, data);

const getLowStock = (tenantId, branchId) =>
  productSvc.getLowStock(tenantId, branchId, MODULE);

// ── KATEGORI MENI (egzanp: Antre, Pla Prensipal, Bwason, Desè)
const getCategories = (tenantId, branchId) =>
  productSvc.getCategories(tenantId, branchId, MODULE);

const createCategory = (tenantId, branchId, data) =>
  productSvc.createCategory(tenantId, branchId, { ...data, module: MODULE });

const updateCategory = (tenantId, id, data) =>
  productSvc.updateCategory(tenantId, id, data);

const deleteCategory = (tenantId, id) =>
  productSvc.deleteCategory(tenantId, id);

module.exports = {
  getMenu, getMenuItem, createMenuItem, updateMenuItem, removeMenuItem,
  adjustStock, getLowStock,
  getCategories, createCategory, updateCategory, deleteCategory,
};
