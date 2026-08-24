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

// ✅ KORIJE — Plizyè kontwòl an yon sèl fwa. TRETE AN PARALÈL (Promise.
// allSettled) olye youn apre lòt: pou 16+ pwodwi, trete yo an sekans te ka
// pran plis pase 15 segonn (timeout navigatè a), byenke backend lan te
// kontinye anrejistre yo an silans — sa te bay yon "erè" bò kote kesye a
// pandan done yo te deja ap sove. An paralèl, tout 16 (oswa plis) liy yo
// fèt an menm tan, kidonk repons lan rive byen vit.
const createKontwolBatch = async (tenantId, userId, data) => {
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  if (!lignes.length) throw Object.assign(new Error('Ajoute omwen yon liy kontwòl.'), { statusCode: 400 });

  const results = await Promise.allSettled(
    lignes.map(l => createKontwol(tenantId, userId, {
      productId: l.productId,
      kantiteKonte: l.kantiteKonte,
      notes: l.notes,
    }))
  );

  const rezilta = [];
  const erè = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') rezilta.push(r.value);
    else erè.push({ productId: lignes[i].productId, message: r.reason?.message || 'Erè enkoni.' });
  });

  return { kontwol: rezilta, kontwolReyisi: rezilta.length, kontwolEchwe: erè.length, erè };
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

module.exports = { createKontwol, createKontwolBatch, listKontwol };
