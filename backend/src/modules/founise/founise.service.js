// src/modules/founise/founise.service.js
const prisma = require('../../config/prisma');

// ── KAPITAL — balans disponib = SUM(enjeksyon) - SUM(achte)
const getKapitalBalans = async (tenantId) => {
  const [enjeksyon, achte] = await Promise.all([
    prisma.pg_kapital.aggregate({ where: { tenant_id: tenantId, type: 'enjeksyon' }, _sum: { montant: true } }),
    prisma.pg_kapital.aggregate({ where: { tenant_id: tenantId, type: 'achte' }, _sum: { montant: true } }),
  ]);
  const totalEnjeksyon = Number(enjeksyon._sum.montant || 0);
  const totalAchte     = Number(achte._sum.montant || 0);
  return {
    disponib: totalEnjeksyon - totalAchte,
    totalEnjeksyon,
    totalAchte,
  };
};

const listKapitalMouvman = (tenantId, { limit = 50 } = {}) =>
  prisma.pg_kapital.findMany({
    where: { tenant_id: tenantId },
    include: { achte: { include: { founise: { select: { non: true } } } } },
    orderBy: { created_at: 'desc' },
    take: Number(limit),
  });

const injectKapital = async (tenantId, userId, { montant, notes }) => {
  const amt = Number(montant);
  if (!amt || amt <= 0) throw Object.assign(new Error('Montant envalid pou enjeksyon kapital la.'), { statusCode: 400 });
  return prisma.pg_kapital.create({
    data: {
      tenant_id: tenantId,
      montant: amt,
      type: 'enjeksyon',
      notes: notes?.trim() || null,
      created_by: userId,
    },
  });
};

// ── FOUNISÈ — CRUD
const listFounise = (tenantId) =>
  prisma.pg_founise.findMany({
    where: { tenant_id: tenantId, aktif: true },
    orderBy: { non: 'asc' },
  });

const createFounise = (tenantId, userId, data) => {
  if (!data.non?.trim()) throw Object.assign(new Error('Non founisè a obligatwa.'), { statusCode: 400 });
  return prisma.pg_founise.create({
    data: {
      tenant_id: tenantId,
      non: data.non.trim(),
      telefon: data.telefon?.trim() || null,
      email: data.email?.trim() || null,
      adres: data.adres?.trim() || null,
      notes: data.notes?.trim() || null,
      created_by: userId,
    },
  });
};

const updateFounise = async (tenantId, id, data) => {
  const existing = await prisma.pg_founise.findFirst({ where: { id, tenant_id: tenantId } });
  if (!existing) throw Object.assign(new Error('Founisè pa jwenn.'), { statusCode: 404 });
  return prisma.pg_founise.update({
    where: { id },
    data: {
      ...('non' in data && { non: data.non?.trim() }),
      ...('telefon' in data && { telefon: data.telefon?.trim() || null }),
      ...('email' in data && { email: data.email?.trim() || null }),
      ...('adres' in data && { adres: data.adres?.trim() || null }),
      ...('notes' in data && { notes: data.notes?.trim() || null }),
      ...('aktif' in data && { aktif: !!data.aktif }),
      updated_at: new Date(),
    },
  });
};

// ── ACHTE — kreye yon achte kay yon founisè. Nan YON SÈL tranzaksyon:
//   1. Kreye liy pg_achte a
//   2. Si gen product_id: monte Product.quantity + kreye StockMovement +
//      ranplase Product.costPriceHtg ak pri kout la (dènye pri kout la genyen)
//   3. Soti menm montan an nan kapital disponib la (liy pg_kapital type='achte')
const createAchte = async (tenantId, userId, data) => {
  const { founiseId, productId, deskripsyon, branchId } = data;
  const kantite = Number(data.kantite);
  const priKoutInite = Number(data.priKoutInite);

  if (!founiseId) throw Object.assign(new Error('Founisè obligatwa.'), { statusCode: 400 });
  if (!kantite || kantite <= 0) throw Object.assign(new Error('Kantite envalid.'), { statusCode: 400 });
  if (priKoutInite == null || priKoutInite < 0) throw Object.assign(new Error('Pri kout envalid.'), { statusCode: 400 });
  if (!productId && !deskripsyon?.trim()) throw Object.assign(new Error('Chwazi yon pwodwi oswa ekri yon deskripsyon.'), { statusCode: 400 });

  const founise = await prisma.pg_founise.findFirst({ where: { id: founiseId, tenant_id: tenantId } });
  if (!founise) throw Object.assign(new Error('Founisè pa jwenn.'), { statusCode: 404 });

  const totalHtg = Math.round(kantite * priKoutInite * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const achte = await tx.pg_achte.create({
      data: {
        tenant_id: tenantId,
        founise_id: founiseId,
        product_id: productId || null,
        deskripsyon: deskripsyon?.trim() || null,
        kantite,
        pri_kout_inite: priKoutInite,
        total_htg: totalHtg,
        dat_acha: data.datAcha ? new Date(data.datAcha) : undefined,
        notes: data.notes?.trim() || null,
        created_by: userId,
      },
    });

    if (productId) {
      const product = await tx.product.findFirst({ where: { id: productId, tenantId } });
      if (!product) throw Object.assign(new Error('Pwodwi pa jwenn.'), { statusCode: 404 });

      const qtyBefore = Number(product.quantity);
      const qtyAfter  = qtyBefore + kantite;

      // ✅ Pri kout pwodwi a AP TOUJOU ranplase pa dènye pri kout achte a —
      // se sa ki fè Benefis sou Tablo Bò a rete egzat san w pa gen pou w
      // antre pri kout la de fwa.
      await tx.product.update({
        where: { id: productId },
        data: { quantity: qtyAfter, costPriceHtg: priKoutInite },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          branchId: branchId || product.branchId || null,
          productId,
          movementType: 'purchase',
          quantityBefore: qtyBefore,
          quantityChange: kantite,
          quantityAfter: qtyAfter,
          notes: `Acha kay ${founise.non}`,
          createdBy: userId,
        },
      });
    }

    await tx.pg_kapital.create({
      data: {
        tenant_id: tenantId,
        montant: totalHtg,
        type: 'achte',
        achte_id: achte.id,
        notes: `Acha kay ${founise.non}${deskripsyon ? ' — ' + deskripsyon : ''}`,
        created_by: userId,
      },
    });

    return achte;
  });
};

const listAchte = (tenantId, { founiseId, limit = 50 } = {}) =>
  prisma.pg_achte.findMany({
    where: { tenant_id: tenantId, ...(founiseId && { founise_id: founiseId }) },
    include: {
      founise: { select: { non: true } },
      product: { select: { name: true, unit: true } },
    },
    orderBy: { created_at: 'desc' },
    take: Number(limit),
  });

module.exports = {
  getKapitalBalans, listKapitalMouvman, injectKapital,
  listFounise, createFounise, updateFounise,
  createAchte, listAchte,
};
