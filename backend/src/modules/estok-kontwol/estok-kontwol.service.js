// src/modules/estok-kontwol/estok-kontwol.service.js
const prisma = require('../../config/prisma');

const createKontwol = async (tenantId, userId, { productId, kantiteKonte, notes }) => {
  const konte = Number(kantiteKonte);
  if (!productId) throw Object.assign(new Error('Chwazi yon pwodwi.'), { statusCode: 400 });
  if (konte == null || konte < 0 || Number.isNaN(konte)) {
    throw Object.assign(new Error('Kantite konte a envalid.'), { statusCode: 400 });
  }

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw Object.assign(new Error('Pwodwi pa jwenn.'), { statusCode: 404 });

  const kantiteSistem = Number(product.quantity);
  const eka = Math.round((konte - kantiteSistem) * 1000) / 1000;

  return prisma.pg_estok_kontwol.create({
    data: {
      tenant_id: tenantId,
      product_id: productId,
      kantite_sistem: kantiteSistem,
      kantite_konte: konte,
      eka,
      notes: notes?.trim() || null,
      created_by: userId,
    },
    include: { product: { select: { name: true, unit: true } } },
  });
};

const listKontwol = (tenantId, { productId, dateFrom, dateTo, limit = 50 } = {}) =>
  prisma.pg_estok_kontwol.findMany({
    where: {
      tenant_id: tenantId,
      ...(productId && { product_id: productId }),
      ...(dateFrom && dateTo && { created_at: { gte: new Date(dateFrom), lte: new Date(`${dateTo}T23:59:59.999Z`) } }),
    },
    include: {
      product: { select: { name: true, unit: true } },
      creator: { select: { fullName: true } },
    },
    orderBy: { created_at: 'desc' },
    take: Number(limit),
  });

module.exports = { createKontwol, listKontwol };
