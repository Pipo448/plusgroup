// src/modules/restaurant-tables/restaurant-tables.service.js
const prisma = require('../../config/prisma');

// ── TAB ──────────────────────────────────────────────────────────────
const listTables = async (tenantId, branchId) => {
  const tables = await prisma.restaurantTable.findMany({
    where: { tenantId, isActive: true, ...(branchId && { branchId }) },
    include: {
      orders: {
        where: { status: 'louvri' },
        include: { items: true },
        take: 1,
        orderBy: { openedAt: 'desc' },
      },
    },
    orderBy: [{ zone: 'asc' }, { name: 'asc' }],
  });
  // ✅ NOUVO — anbeli sòti a: chak tab gen "kòmandAktif" dirèkteman (pa yon lis)
  return tables.map(t => ({
    ...t,
    kòmandAktif: t.orders[0] || null,
    orders: undefined,
  }));
};

const createTable = (tenantId, data) => {
  if (!data.name?.trim()) throw Object.assign(new Error('Non tab la obligatwa.'), { statusCode: 400 });
  return prisma.restaurantTable.create({
    data: {
      tenantId,
      branchId: data.branchId || null,
      name: data.name.trim(),
      zone: data.zone?.trim() || null,
      seats: Number(data.seats) || 4,
    },
  });
};

const updateTable = async (tenantId, id, data) => {
  const existing = await prisma.restaurantTable.findFirst({ where: { id, tenantId } });
  if (!existing) throw Object.assign(new Error('Tab la pa jwenn.'), { statusCode: 404 });
  return prisma.restaurantTable.update({
    where: { id },
    data: {
      ...('name' in data && { name: data.name?.trim() }),
      ...('zone' in data && { zone: data.zone?.trim() || null }),
      ...('seats' in data && { seats: Number(data.seats) }),
      ...('status' in data && { status: data.status }),
      ...('isActive' in data && { isActive: !!data.isActive }),
    },
  });
};

// ── KÒMAND ───────────────────────────────────────────────────────────
const getOrCreateOrder = async (tenantId, userId, tableId) => {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
  if (!table) throw Object.assign(new Error('Tab la pa jwenn.'), { statusCode: 404 });

  const existing = await prisma.restaurantOrder.findFirst({
    where: { tableId, status: 'louvri' },
    include: { items: { orderBy: { createdAt: 'asc' } }, table: true },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const order = await tx.restaurantOrder.create({
      data: { tenantId, tableId, createdBy: userId },
      include: { items: true, table: true },
    });
    await tx.restaurantTable.update({ where: { id: tableId }, data: { status: 'okipe' } });
    return order;
  });
};

const getOrder = (tenantId, orderId) =>
  prisma.restaurantOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { items: { orderBy: { createdAt: 'asc' } }, table: true },
  });

// ✅ Ajoute yon liy (oswa plizyè) nan yon kòmand louvri
const addItems = async (tenantId, orderId, lignes) => {
  const order = await prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId, status: 'louvri' } });
  if (!order) throw Object.assign(new Error('Kòmand pa jwenn oswa li deja fèmen.'), { statusCode: 404 });
  if (!Array.isArray(lignes) || !lignes.length) throw Object.assign(new Error('Ajoute omwen yon pla.'), { statusCode: 400 });

  await prisma.restaurantOrderItem.createMany({
    data: lignes.map(l => ({
      orderId,
      productId: l.productId || null,
      description: l.description,
      quantity: Number(l.quantity) || 1,
      unitPriceHtg: Number(l.unitPriceHtg) || 0,
      notes: l.notes?.trim() || null,
    })),
  });

  return getOrder(tenantId, orderId);
};

const removeItem = async (tenantId, orderId, itemId) => {
  const order = await prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId, status: 'louvri' } });
  if (!order) throw Object.assign(new Error('Kòmand pa jwenn oswa li deja fèmen.'), { statusCode: 404 });
  await prisma.restaurantOrderItem.deleteMany({ where: { id: itemId, orderId } });
  return getOrder(tenantId, orderId);
};

// ✅ Make tout liy ki "an_atant" kòm "voye" (pou enprime tikè kizin)
const sendToKitchen = async (tenantId, orderId) => {
  const order = await prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId, status: 'louvri' } });
  if (!order) throw Object.assign(new Error('Kòmand pa jwenn oswa li deja fèmen.'), { statusCode: 404 });
  await prisma.restaurantOrderItem.updateMany({
    where: { orderId, kitchenStatus: 'an_atant' },
    data: { kitchenStatus: 'voye' },
  });
  return getOrder(tenantId, orderId);
};

// ✅ Fèmen kòmand lan apre fakti a fin kreye (frontend rele invoiceAPI.createDirect
// AVAN, epi voye n `invoiceId` a isit la pou n mare yo ansanm epi libere tab la).
const closeOrder = async (tenantId, orderId, invoiceId) => {
  const order = await prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId, status: 'louvri' } });
  if (!order) throw Object.assign(new Error('Kòmand pa jwenn oswa li deja fèmen.'), { statusCode: 404 });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.restaurantOrder.update({
      where: { id: orderId },
      data: { status: 'fèmen', closedAt: new Date(), convertedInvoiceId: invoiceId || null },
    });
    await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'lib' } });
    return updated;
  });
};

const cancelOrder = async (tenantId, orderId) => {
  const order = await prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId, status: 'louvri' } });
  if (!order) throw Object.assign(new Error('Kòmand pa jwenn oswa li deja fèmen.'), { statusCode: 404 });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.restaurantOrder.update({ where: { id: orderId }, data: { status: 'anile', closedAt: new Date() } });
    await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'lib' } });
    return updated;
  });
};

module.exports = {
  listTables, createTable, updateTable,
  getOrCreateOrder, getOrder, addItems, removeItem, sendToKitchen, closeOrder, cancelOrder,
};
