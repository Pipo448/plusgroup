// src/modules/products/product.service.js
const prisma = require('../../config/prisma');

// ── GET ALL (avec filtre, tri, pagination)
const getAll = async (tenantId, { search, categoryId, isActive, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' }) => {
  const where = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { nameFr: { contains: search, mode: 'insensitive' } }
      ]
    }),
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive: isActive === 'true' })
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, nameFr: true, color: true } }
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: Number(limit)
    }),
    prisma.product.count({ where })
  ]);

  return { products, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
};

// ── GET ONE
const getOne = async (tenantId, id) => {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      category: true,
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
  // ── Verifye limit plan (maxProducts) ──────────────────────────────
  // Konte sèlman pwodui ki gen stock aktif (quantity > 0 ak isActive: true)
  // Lojik: yon fwa pwodui a vann (quantity = 0), li libere yon plas
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: { select: { maxProducts: true, name: true } } }
  });

  if (tenant?.plan?.maxProducts != null) {
    const maxProducts = tenant.plan.maxProducts;

    // Konte pwodui ki nan stock kounye a (quantity > 0 + isActive)
    const activeStockCount = await prisma.product.count({
      where: {
        tenantId,
        isActive: true,
        isService: false,      // sèvis pa konte nan stock limit
        quantity: { gt: 0 }    // sèlman sa ki gen stock reyèl
      }
    });

    // Verifye si nouvo pwodui sa ap depase limit lan
    const newProductQty = Number(data.quantity) || 0;
    const isService     = data.isService || false;

    if (!isService && newProductQty > 0 && activeStockCount >= maxProducts) {
      throw Object.assign(
        new Error(
          `Ou rive nan limit plan "${tenant.plan.name}" ou a (${maxProducts} pwodui nan stock). ` +
          `Vann kèk pwodui pou libere plas, oswa ogmante plan ou.`
        ),
        { statusCode: 403 }
      );
    }
  }
  // ─────────────────────────────────────────────────────────────────

  // Vérifier code unique si fourni
  if (data.code) {
    const exists = await prisma.product.findUnique({ where: { tenantId_code: { tenantId, code: data.code } } });
    if (exists) throw Object.assign(new Error('Kòd pwodui sa deja egziste.'), { statusCode: 409 });
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      createdBy: userId,
      name: data.name,
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      code: data.code,
      description: data.description,
      categoryId: data.categoryId,
      unit: data.unit || 'unité',
      priceHtg: data.priceHtg || 0,
      priceUsd: data.priceUsd || 0,
      costPriceHtg: data.costPriceHtg || 0,
      quantity: data.quantity || 0,
      alertThreshold: data.alertThreshold || 5,
      imageUrl: data.imageUrl,
      isService: data.isService || false,
    },
    include: { category: { select: { id: true, name: true } } }
  });

  // Enregistrer mouvement stock initial si quantité > 0
  if (Number(data.quantity) > 0) {
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: product.id,
        movementType: 'purchase',
        quantityBefore: 0,
        quantityChange: Number(data.quantity),
        quantityAfter: Number(data.quantity),
        notes: 'Stock inisyal',
        createdBy: userId
      }
    });
  }

  return product;
};

// ── UPDATE
const update = async (tenantId, id, userId, data) => {
  const existing = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existing) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });

  // Vérifier code unique si modifié
  if (data.code && data.code !== existing.code) {
    const dup = await prisma.product.findFirst({ where: { tenantId, code: data.code, NOT: { id } } });
    if (dup) throw Object.assign(new Error('Kòd sa deja itilize.'), { statusCode: 409 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      code: data.code,
      description: data.description,
      categoryId: data.categoryId,
      unit: data.unit,
      priceHtg: data.priceHtg,
      priceUsd: data.priceUsd,
      costPriceHtg: data.costPriceHtg,
      alertThreshold: data.alertThreshold,
      imageUrl: data.imageUrl,
      isService: data.isService,
      isActive: data.isActive
    },
    include: { category: { select: { id: true, name: true } } }
  });

  return product;
};

// ── ADJUST STOCK (manuel)
const adjustStock = async (tenantId, productId, userId, { quantity, type, notes }) => {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });

  const qtyBefore = Number(product.quantity);
  const qtyChange = type === 'add' ? Number(quantity) : -Number(quantity);
  const qtyAfter  = qtyBefore + qtyChange;

  if (qtyAfter < 0) throw Object.assign(new Error('Stock pa kapab negatif.'), { statusCode: 400 });

  const [updatedProduct] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { quantity: qtyAfter }
    }),
    prisma.stockMovement.create({
      data: {
        tenantId, productId,
        movementType: 'adjustment',
        quantityBefore: qtyBefore,
        quantityChange: qtyChange,
        quantityAfter: qtyAfter,
        notes,
        createdBy: userId
      }
    })
  ]);

  return updatedProduct;
};

// ── DELETE (soft delete)
const remove = async (tenantId, id) => {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw Object.assign(new Error('Pwodui pa jwenn.'), { statusCode: 404 });

  await prisma.product.update({ where: { id }, data: { isActive: false } });
};

// ── LOW STOCK ALERT
const getLowStock = async (tenantId) => {
  return prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      isService: false,
      quantity: { lte: prisma.product.fields.alertThreshold }
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { quantity: 'asc' }
  });
};

// ── CATEGORIES
const getCategories = async (tenantId) => {
  return prisma.productCategory.findMany({
    where: { tenantId, isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' }
  });
};

const createCategory = async (tenantId, data) => {
  return prisma.productCategory.create({
    data: { tenantId, name: data.name, nameFr: data.nameFr, nameEn: data.nameEn, color: data.color, description: data.description }
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
