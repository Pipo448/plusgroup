// src/modules/founise/founise.service.js
const prisma = require('../../config/prisma');

// ✅ NOUVO — Ayiti se UTC-4. Si nou kite Postgres CURRENT_DATE deside dat
// yon achte otomatikman, li kalkile dat la an UTC (lè sèvè a), pa lè
// Ayiti a — yon achte fèt aswè (Ayiti) ka anrejistre ak dat DEMEN pa
// erè. Menm koreksyon egzat ak "getHaitiDateStr" nan dashboard-full.route.js.
const getHaitiDateStr = (d = new Date()) =>
  d.toLocaleDateString('en-CA', { timeZone: 'America/Port-au-Prince' }); // → "YYYY-MM-DD"

// ── KAPITAL — balans disponib = SUM(enjeksyon) - SUM(achte) - SUM(fre)
// ✅ KORIJE — Depans jeneral yo (pg_expenses, paj "Depans") rete SEPARE:
// yo afekte Benefis (vant − depans) sou Tablo Bò a, men PA Kapital
// Founisè a. Kapital Founisè a swiv sèlman lajan ki soti dirèkteman nan
// aktivite Founisè: Achte machandiz + Frè adisyonèl ki mare ak yon achte
// (transpò, elt. — antre nan menm fòm Achte a, pa nan paj Depans).
const getKapitalBalans = async (tenantId) => {
  const [enjeksyon, achte, fre] = await Promise.all([
    prisma.pg_kapital.aggregate({ where: { tenant_id: tenantId, type: 'enjeksyon' }, _sum: { montant: true } }),
    prisma.pg_kapital.aggregate({ where: { tenant_id: tenantId, type: 'achte' }, _sum: { montant: true } }),
    prisma.pg_kapital.aggregate({ where: { tenant_id: tenantId, type: 'fre' }, _sum: { montant: true } }),
  ]);
  const totalEnjeksyon = Number(enjeksyon._sum.montant || 0);
  const totalAchte     = Number(achte._sum.montant || 0);
  const totalFre        = Number(fre._sum.montant || 0);
  return {
    disponib: totalEnjeksyon - totalAchte - totalFre,
    totalEnjeksyon,
    totalAchte,
    totalFre,
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
        // ✅ KORIJE — pa kite Postgres CURRENT_DATE (UTC) deside; sèvi ak
        // dat Ayiti a si pa gen dat espesifik bay.
        dat_acha: new Date(data.datAcha || getHaitiDateStr()),
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

// ✅ NOUVO — Plizyè liy achte (plizyè pwodwi) kay YON SÈL founisè, nan yon
// sèl tranzaksyon: si yon liy echwe, TOUT bagay tounen an aryè (pa gen
// risk kite estòk/kapital nan yon eta ki pa koherán).
const createAchteBatch = async (tenantId, userId, data) => {
  const { founiseId, branchId } = data;
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  // ✅ NOUVO — Lòt Frè (transpò, chaje/dechaje, elt.) mare ak menm achte sa
  // a — soti nan Kapital tou, men kòm yon kategori apa ('fre') pou l pa
  // melanje ak pri machandiz yo.
  const fraAdisyonel = Number(data.fraAdisyonel) || 0;
  const fraDeskripsyon = data.fraDeskripsyon?.trim() || 'Lòt frè (transpò, elt.)';

  if (!founiseId) throw Object.assign(new Error('Founisè obligatwa.'), { statusCode: 400 });
  if (!lignes.length) throw Object.assign(new Error('Ajoute omwen yon liy achte.'), { statusCode: 400 });
  if (fraAdisyonel < 0) throw Object.assign(new Error('Frè adisyonèl envalid.'), { statusCode: 400 });

  const founise = await prisma.pg_founise.findFirst({ where: { id: founiseId, tenant_id: tenantId } });
  if (!founise) throw Object.assign(new Error('Founisè pa jwenn.'), { statusCode: 404 });

  // Valide chak liy anvan n antre nan tranzaksyon an
  const parsed = lignes.map((l, i) => {
    const kantite = Number(l.kantite);
    const priKoutInite = Number(l.priKoutInite);
    if (!kantite || kantite <= 0) throw Object.assign(new Error(`Liy ${i + 1}: kantite envalid.`), { statusCode: 400 });
    if (priKoutInite == null || priKoutInite < 0) throw Object.assign(new Error(`Liy ${i + 1}: pri kout envalid.`), { statusCode: 400 });
    if (!l.productId && !l.deskripsyon?.trim()) throw Object.assign(new Error(`Liy ${i + 1}: chwazi yon pwodwi oswa ekri yon deskripsyon.`), { statusCode: 400 });
    return {
      productId: l.productId || null,
      deskripsyon: l.deskripsyon?.trim() || null,
      kantite,
      priKoutInite,
      totalHtg: Math.round(kantite * priKoutInite * 100) / 100,
      notes: l.notes?.trim() || null,
    };
  });

  const grandTotal = Math.round(parsed.reduce((acc, l) => acc + l.totalHtg, 0) * 100) / 100;

  return prisma.$transaction(async (tx) => {
    const achteCreated = [];

    for (const l of parsed) {
      const achte = await tx.pg_achte.create({
        data: {
          tenant_id: tenantId,
          founise_id: founiseId,
          product_id: l.productId,
          deskripsyon: l.deskripsyon,
          kantite: l.kantite,
          pri_kout_inite: l.priKoutInite,
          total_htg: l.totalHtg,
          // ✅ KORIJE — pa kite Postgres CURRENT_DATE (UTC) deside; sèvi ak
          // dat Ayiti a si pa gen dat espesifik bay.
          dat_acha: new Date(data.datAcha || getHaitiDateStr()),
          notes: l.notes,
          created_by: userId,
        },
      });
      achteCreated.push(achte);

      if (l.productId) {
        const product = await tx.product.findFirst({ where: { id: l.productId, tenantId } });
        if (!product) throw Object.assign(new Error('Pwodwi pa jwenn.'), { statusCode: 404 });

        const qtyBefore = Number(product.quantity);
        const qtyAfter  = qtyBefore + l.kantite;

        await tx.product.update({
          where: { id: l.productId },
          data: { quantity: qtyAfter, costPriceHtg: l.priKoutInite },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId: branchId || product.branchId || null,
            productId: l.productId,
            movementType: 'purchase',
            quantityBefore: qtyBefore,
            quantityChange: l.kantite,
            quantityAfter: qtyAfter,
            notes: `Acha kay ${founise.non}`,
            createdBy: userId,
          },
        });
      }
    }

    // ✅ Yon SÈL liy kapital pou tout acha a (pa youn pa liy) — pi klè nan
    // istorik kapital la: "Acha kay X — 4 atik"
    await tx.pg_kapital.create({
      data: {
        tenant_id: tenantId,
        montant: grandTotal,
        type: 'achte',
        achte_id: achteCreated[0]?.id || null,
        notes: `Acha kay ${founise.non} — ${parsed.length} atik`,
        created_by: userId,
      },
    });

    // ✅ NOUVO — Frè adisyonèl (transpò, elt.), sèlman si li ranpli
    if (fraAdisyonel > 0) {
      await tx.pg_kapital.create({
        data: {
          tenant_id: tenantId,
          montant: fraAdisyonel,
          type: 'fre',
          achte_id: achteCreated[0]?.id || null,
          notes: `${fraDeskripsyon} — Acha kay ${founise.non}`,
          created_by: userId,
        },
      });
    }

    return { achte: achteCreated, total: grandTotal, fraAdisyonel };
  });
};

// ✅ MODIFYE — ajoute filt dat (dateFrom/dateTo) epi enkli pri vant AKTYÈL
// pwodwi a (product.priceHtg), pou fwontèn nan ka kalkile benefis pwojte
// pou nenpòt achte, menm si yo te antre yo youn pa youn (pa nan menm
// panye) — dat achte a (dat_acha) se referans lan, pa dat kreyasyon an.
const listAchte = (tenantId, { founiseId, dateFrom, dateTo, limit = 50 } = {}) =>
  prisma.pg_achte.findMany({
    where: {
      tenant_id: tenantId,
      ...(founiseId && { founise_id: founiseId }),
      ...(dateFrom && dateTo && { dat_acha: { gte: new Date(dateFrom), lte: new Date(`${dateTo}T23:59:59.999Z`) } }),
    },
    include: {
      founise: { select: { non: true } },
      product: { select: { name: true, unit: true, priceHtg: true } },
    },
    orderBy: { created_at: 'desc' },
    take: Number(limit),
  });

module.exports = {
  getKapitalBalans, listKapitalMouvman, injectKapital,
  listFounise, createFounise, updateFounise,
  createAchte, createAchteBatch, listAchte,
};