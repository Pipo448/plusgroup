// src/modules/products/product.service.js
const prisma = require('../../config/prisma');
// ⚠️ KORIJE EGRESS — `sharp` konprese imaj pwodui yo AVAN yo antre nan
// baz done a (si l pa enstale: npm install sharp).
const sharp  = require('sharp');

// ⚠️ KORIJE EGRESS — `imageUrl` rive dirèkteman kòm yon base64 BRIT nan
// `data.imageUrl` (frontend ankode l epi voye l nan JSON, pa Multer).
// San konpresyon, yon sèl foto telefòn (2-5MB) te ka miltipliye pa 200
// pwodui sou yon sèl paj (`GET /products?limit=200`) — sa egzakteman sa
// ki te lakòz repons 26.8MB nou wè nan log Render yo, e menm yon rechèch
// limite a 8 rezilta te ka fè 1.7MB. Fonksyon sa a rezize (max 600px lajè)
// epi konvèti an WebP kalite 75% anvan nenpòt pwodui sove — menm apwòch
// nou te itilize pou logo tenant la.
async function compressImageDataUri(dataUri, { maxWidth = 600, quality = 75 } = {}) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return dataUri;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUri;
  const [, mimeType, base64Data] = match;
  if (mimeType === 'image/svg+xml') return dataUri; // deja vektè, pa gen "poids" pou konprese
  try {
    const inputBuffer = Buffer.from(base64Data, 'base64');
    const outBuffer = await sharp(inputBuffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    return `data:image/webp;base64,${outBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[product] Erè konpresyon imaj:', err.message);
    return dataUri; // ✅ filè sekirite — pa bloke kreyasyon/modifikasyon pwodui a
  }
}

// ⚠️ KORIJE EGRESS — ti vèsyon TRÈ piti (100px, 60% kalite) pou lis/griy
// pwodui yo. Paj lis la montre yon imaj ~64px — pa gen rezon pou l resevwa
// vèsyon 600px "konplè" a. Sa redwi anpil egrès Supabase sou
// `GET /products` ki se youn nan apèl ki pi souvan rele yo.
async function compressThumbnailDataUri(dataUri, { maxWidth = 100, quality = 60 } = {}) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return dataUri;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUri;
  const [, mimeType, base64Data] = match;
  if (mimeType === 'image/svg+xml') return dataUri;
  try {
    const inputBuffer = Buffer.from(base64Data, 'base64');
    const outBuffer = await sharp(inputBuffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    return `data:image/webp;base64,${outBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[product] Erè konpresyon thumbnail:', err.message);
    return null; // pa gen filè sekirite isit la — si l echwe, pa gen thumbnail, imageUrl rete sous verite a
  }
}

// ── GET ALL — default isActive=true si frontend pa pase parameter
const getAll = async (tenantId, { search, categoryId, isActive, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', branchId, module }) => {
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    // ✅ Si frontend pa pase isActive, montre SÈLMAN aktif yo pa default
    // Si ou vle wè inaktif yo, pase ?isActive=false eksplisitman
    isActive: isActive === undefined ? true : isActive === 'true',
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { nameFr: { contains: search, mode: 'insensitive' } }
      ]
    }),
    ...(categoryId && { categoryId }),
    // ✅ NOUVO — filtre pa modil ("general" oswa "restaurant"). Si pa pase,
    // pa gen filtraj (konpòtman ansyen an rete entak pou apèl ki egziste deja).
    ...(module && { module }),
  };

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
      // ⚠️ KORIJE EGRESS — `select` eksplisit (pa `omit`, ki mande yon vèsyon
      // Prisma Client pi resan ke sa ki deploye sou Render) ki eskli
      // `imageUrl` (gwo) dirèkteman nan nivo Prisma/DB. Egrès Supabase konte
      // sou transfè Postgres → backend, kidonk retire chan an APRE query a
      // fin kouri pa t ap sove anyen; isit la Postgres pa menm voye done sa
      // a bay backend la.
      select: {
        id: true,
        tenantId: true,
        categoryId: true,
        code: true,
        name: true,
        nameFr: true,
        nameEn: true,
        description: true,
        unit: true,
        priceHtg: true,
        priceUsd: true,
        costPriceHtg: true,
        quantity: true,
        alertThreshold: true,
        thumbnailUrl: true,
        isActive: true,
        isService: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        branchId: true,
        packLabel: true,
        packSize: true,
        packPriceHtg: true,
        module: true,
        wholesaleMinQty: true,
        wholesalePriceHtg: true,
        wholesalePriceUsd: true,
        category: { select: { id: true, name: true, nameFr: true, color: true } },
        // ✅ NOUVO — nivo pri an gwo, triye pa sèy kantite pou frontend afiche yo nan lòd
        priceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: Number(limit)
    }),
    prisma.product.count({ where })
  ]);

  // ⚠️ KORIJE EGRESS — frontend kontinye li `product.imageUrl` nòmalman; isit
  // la nou ranpli `imageUrl` ak ti thumbnail la (pa gwo vèsyon an) pou lis la.
  // Zewo chanjman nesesè sou frontend.
  const products = rawProducts.map(({ thumbnailUrl, ...p }) => ({
    ...p,
    imageUrl: thumbnailUrl || null,
  }));

  return { products, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
};

// ── GET ONE
const getOne = async (tenantId, id) => {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      category: true,
      // ✅ NOUVO
      priceTiers: { orderBy: { minQty: 'asc' } },
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { creator: { select: { fullName: true } } }
      }
    }
  });
  if (!product) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });
  return product;
};

// ── CREATE
const create = async (tenantId, userId, data) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: { select: { maxProducts: true, name: true } } }
  });

  if (tenant?.plan?.maxProducts != null) {
    const maxProducts    = tenant.plan.maxProducts;
    const activeStockCount = await prisma.product.count({
      where: { tenantId, isActive: true, isService: false, quantity: { gt: 0 } }
    });
    const newProductQty = Number(data.quantity) || 0;
    const isService     = data.isService || false;
    if (!isService && newProductQty > 0 && activeStockCount >= maxProducts) {
      throw Object.assign(
        new Error(`Ou rive nan limit plan "${tenant.plan.name}" ou a (${maxProducts} pwodui nan stock). Vann kèk pwodui pou libere plas, oswa ogmante plan ou.`),
        { statusCode: 403 }
      );
    }
  }

  // ⚠️ KORIJE — chan "code" opsyonèl la ka rive kòm "" (tèks vid) soti nan
  // fòm frontend lan. Contrainte inik (tenant_id, code) konsidere 2 tèks vid
  // kòm idantik (kontrèman ak NULL ki toujou diferan), kidonk san normalize
  // sa a, DEZYÈM pwodui san kòd la toujou echwe ak "Unique constraint failed".
  const code = (data.code && data.code.trim() !== '') ? data.code.trim() : null;

  if (code) {
    const exists = await prisma.product.findUnique({ where: { tenantId_code: { tenantId, code } } });
    if (exists) throw Object.assign(new Error('Kòd pwodui sa deja egziste.'), { statusCode: 409 });
  }

  // ⚠️ KORIJE EGRESS — konprese/rezize AVAN nou sove. Nou kreye 2 vèsyon:
  // youn gwo (pou paj detay/edisyon) e youn ti piti (pou lis/griy).
  const compressedImageUrl     = await compressImageDataUri(data.imageUrl);
  const compressedThumbnailUrl = await compressThumbnailDataUri(data.imageUrl);

  const product = await prisma.product.create({
    data: {
      tenantId,
      createdBy:      userId,
      branchId:       data.branchId || null,
      name:           data.name,
      nameFr:         data.nameFr,
      nameEn:         data.nameEn,
      code:           code,
      description:    data.description,
      categoryId:     data.categoryId,
      unit:           data.unit || 'unité',
      priceHtg:       data.priceHtg || 0,
      priceUsd:       data.priceUsd || 0,
      costPriceHtg:   data.costPriceHtg || 0,
      quantity:       data.quantity || 0,
      alertThreshold: data.alertThreshold || 5,
      imageUrl:       compressedImageUrl,
      thumbnailUrl:   compressedThumbnailUrl,
      isService:      data.isService || false,
      // ✅ NOUVO — "general" (pa defo) oswa "restaurant" pou Meni Restoran
      module:         data.module || 'general',
      // ── Vant an gwo (bwat) ──
      packLabel:      data.packLabel || null,
      packSize:       (data.packSize != null && data.packSize !== '') ? Number(data.packSize) : null,
      packPriceHtg:   (data.packPriceHtg != null && data.packPriceHtg !== '') ? Number(data.packPriceHtg) : null,
      // ✅ NOUVO — Nivo pri an gwo (plizyè): kreye chak nivo an menm tan
      // ak pwodwi a. Filtre liy ki manke minQty/priceHtg (pwoteksyon si
      // frontend voye yon liy vid pa erè).
      priceTiers: {
        create: (data.priceTiers || [])
          .filter(t => t.minQty && t.priceHtg)
          .map(t => ({
            tenantId,
            minQty:        Number(t.minQty),
            priceHtg:      Number(t.priceHtg),
            priceUsd:      (t.priceUsd != null && t.priceUsd !== '') ? Number(t.priceUsd) : null,
            // ✅ NOUVO — pri total pou pakè a (egz. 1750 pou 3), sove tèl
            // kèl pou kalkil egzat nan fakti/devi (evite erè awondisman)
            totalPriceHtg: (t.totalPriceHtg != null && t.totalPriceHtg !== '') ? Number(t.totalPriceHtg) : null,
            label:         t.label?.trim() || null,
          }))
      },
    },
    include: { category: { select: { id: true, name: true } }, priceTiers: true }
  });

  if (Number(data.quantity) > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        branchId:       data.branchId || null,
        productId:      product.id,
        movementType:   'purchase',
        quantityBefore: 0,
        quantityChange: Number(data.quantity),
        quantityAfter:  Number(data.quantity),
        notes:          'Stock inisyal',
        createdBy:      userId
      }
    });
  }

  return product;
};

// ── UPDATE
const update = async (tenantId, id, userId, data) => {
  const existing = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existing) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });

  // ⚠️ KORIJE — menm nòmalizasyon ak create(): "" → null
  const code = (data.code && data.code.trim() !== '') ? data.code.trim() : null;

  if (code && code !== existing.code) {
    const dup = await prisma.product.findFirst({ where: { tenantId, code, NOT: { id } } });
    if (dup) throw Object.assign(new Error('Kòd sa deja itilize.'), { statusCode: 409 });
  }

  // ⚠️ KORIJE EGRESS — sèlman konprese si yon NOUVO imaj voye (data: URI).
  // Si `imageUrl` pa chanje (frontend ka renvoye menm lyen/URL ki te deja
  // konprese a), pa gen rezon pou re-konprese l ankò.
  const compressedImageUrl     = await compressImageDataUri(data.imageUrl);
  const compressedThumbnailUrl = await compressThumbnailDataUri(data.imageUrl);

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name, nameFr: data.nameFr, nameEn: data.nameEn,
      code, description: data.description,
      categoryId: data.categoryId, unit: data.unit,
      priceHtg: data.priceHtg, priceUsd: data.priceUsd,
      costPriceHtg: data.costPriceHtg, alertThreshold: data.alertThreshold,
      imageUrl: compressedImageUrl, thumbnailUrl: compressedThumbnailUrl,
      isService: data.isService, isActive: data.isActive,
      // ✅ NOUVO — modil (general/restaurant), sèlman si voye eksplisitman
      ...(('module' in data) && { module: data.module }),
      // ── Vant an gwo (bwat) — sèlman si frontend voye yo (pa kraze lòt apèl PUT) ──
      ...(('packLabel' in data)    && { packLabel: data.packLabel || null }),
      ...(('packSize' in data)     && { packSize: (data.packSize != null && data.packSize !== '') ? Number(data.packSize) : null }),
      ...(('packPriceHtg' in data) && { packPriceHtg: (data.packPriceHtg != null && data.packPriceHtg !== '') ? Number(data.packPriceHtg) : null }),
      // ✅ NOUVO — Nivo pri an gwo: sèlman si 'priceTiers' prezan nan body
      // la. Estrateji "ranplase tout" — efase ansyen nivo yo, kreye nouvo
      // lis la. Pi senp e san danje paske frontend voye TOUT lis la chak
      // fwa (pa yon "diff" pasyèl), kidonk pa gen risk pèdi yon nivo.
      ...(('priceTiers' in data) && {
        priceTiers: {
          deleteMany: {},
          create: (data.priceTiers || [])
            .filter(t => t.minQty && t.priceHtg)
            .map(t => ({
              tenantId,
              minQty:        Number(t.minQty),
              priceHtg:      Number(t.priceHtg),
              priceUsd:      (t.priceUsd != null && t.priceUsd !== '') ? Number(t.priceUsd) : null,
              // ✅ NOUVO — menm rezon ak create()
              totalPriceHtg: (t.totalPriceHtg != null && t.totalPriceHtg !== '') ? Number(t.totalPriceHtg) : null,
              label:         t.label?.trim() || null,
            }))
        }
      }),
    },
    include: { category: { select: { id: true, name: true } }, priceTiers: true }
  });
};

// ── ADJUST STOCK
const adjustStock = async (tenantId, productId, userId, { quantity, type, notes, branchId }) => {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });

  const qtyBefore = Number(product.quantity);
  const qtyChange = type === 'add' ? Number(quantity) : -Number(quantity);
  const qtyAfter  = qtyBefore + qtyChange;

  if (qtyAfter < 0) throw Object.assign(new Error('Stock pa kapab negatif.'), { statusCode: 400 });

  const [updatedProduct] = await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { quantity: qtyAfter } }),
    prisma.stockMovement.create({
      data: {
        tenantId, branchId: branchId || null, productId,
        movementType: 'adjustment',
        quantityBefore: qtyBefore, quantityChange: qtyChange, quantityAfter: qtyAfter,
        notes, createdBy: userId
      }
    })
  ]);

  return updatedProduct;
};

// ── DELETE — eseye hard delete; nenpòt erè → tonbe sou soft delete otomatikman
const remove = async (tenantId, id) => {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });

  try {
    // Eseye siprime nèt
    await prisma.product.delete({ where: { id } });
    return { soft: false, message: 'Pwodwi siprime nèt.' };
  } catch (err) {
    // Log erè a pou debug (w ap wè l nan Render Logs)
    console.error('[Product DELETE] Hard delete failed, fallback to soft:', {
      productId: id,
      code: err.code,
      message: err.message,
      meta: err.meta
    });

    // Nenpòt erè (FK, constraint, oswa lòt) → fè soft delete
    // Sa pwoteje entegrite done yo: fakti, quote, mouvman stòk yo rete valid
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return {
      soft: true,
      message: 'Pwodwi a gen istorik nan sistèm nan (fakti, quote, elatriye) — li mete inaktif.'
    };
  }
};

// ── LOW STOCK
const getLowStock = async (tenantId, branchId, module) => {
  const rawProducts = await prisma.product.findMany({
    where: {
      tenantId,
      ...(branchId && { branchId }),
      ...(module && { module }),
      isActive:  true,
      isService: false,
      quantity:  { lte: prisma.product.fields.alertThreshold }
    },
    // ⚠️ KORIJE EGRESS — menm apwòch ak getAll(): `select` eksplisit (pa
    // `omit`, pa sipòte sou vèsyon Prisma Client ki deploye a) ki eskli
    // `imageUrl` gwo a, sèvi ak thumbnail la nan plas li.
    select: {
      id: true,
      tenantId: true,
      categoryId: true,
      code: true,
      name: true,
      nameFr: true,
      nameEn: true,
      description: true,
      unit: true,
      priceHtg: true,
      priceUsd: true,
      costPriceHtg: true,
      quantity: true,
      alertThreshold: true,
      thumbnailUrl: true,
      isActive: true,
      isService: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      branchId: true,
      packLabel: true,
      packSize: true,
      packPriceHtg: true,
      module: true,
      wholesaleMinQty: true,
      wholesalePriceHtg: true,
      wholesalePriceUsd: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { quantity: 'asc' }
  });

  return rawProducts.map(({ thumbnailUrl, ...p }) => ({
    ...p,
    imageUrl: thumbnailUrl || null,
  }));
};

// ── CATEGORIES
const getCategories = async (tenantId, branchId, module) => {
  return prisma.productCategory.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(branchId && { branchId }),
      ...(module && { module }),
    },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' }
  });
};

const createCategory = async (tenantId, branchId, data) => {
  return prisma.productCategory.create({
    data: {
      tenantId,
      branchId: branchId || null,
      name:        data.name,
      nameFr:      data.nameFr,
      nameEn:      data.nameEn,
      color:       data.color,
      description: data.description,
      // ✅ NOUVO
      module:      data.module || 'general',
    }
  });
};

const updateCategory = async (tenantId, id, data) => {
  const cat = await prisma.productCategory.findFirst({ where: { id, tenantId } });
  if (!cat) throw Object.assign(new Error('Kategori pa jwenn.'), { statusCode: 404 });
  return prisma.productCategory.update({ where: { id }, data });
};

const deleteCategory = async (tenantId, id) => {
  const cat = await prisma.productCategory.findFirst({ where: { id, tenantId } });
  if (!cat) throw Object.assign(new Error('Kategori pa jwenn.'), { statusCode: 404 });
  await prisma.productCategory.update({ where: { id }, data: { isActive: false } });
};

module.exports = { getAll, getOne, create, update, remove, adjustStock, getLowStock, getCategories, createCategory, updateCategory, deleteCategory };