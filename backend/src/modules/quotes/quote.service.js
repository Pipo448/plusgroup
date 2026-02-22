// src/modules/quotes/quote.service.js
const prisma = require('../../config/prisma');

// ── Générer numéro devis (par entreprise)
const generateQuoteNumber = async (tenantId) => {
  const year = new Date().getFullYear();

  const seq = await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId, documentType: 'quote' } },
    create: { tenantId, documentType: 'quote', prefix: 'DEV', lastNumber: 1, currentYear: year },
    update: {
      lastNumber: {
        increment: 1
      },
      currentYear: year
    }
  });

  // Reset si nouvelle année
  if (seq.yearReset && seq.currentYear < year) {
    await prisma.documentSequence.update({
      where: { tenantId_documentType: { tenantId, documentType: 'quote' } },
      data: { lastNumber: 1, currentYear: year }
    });
    return `DEV-${year}-0001`;
  }

  return `${seq.prefix}-${year}-${String(seq.lastNumber).padStart(4, '0')}`;
};

// ── Calculer totaux
const calculateTotals = (items, discountType, discountValue, taxRate, exchangeRate) => {
  let subtotalHtg = 0;
  let subtotalUsd = 0;

  for (const item of items) {
    const lineHtg = Number(item.unitPriceHtg) * Number(item.quantity) * (1 - Number(item.discountPct || 0) / 100);
    const lineUsd = Number(item.unitPriceUsd) * Number(item.quantity) * (1 - Number(item.discountPct || 0) / 100);
    item.totalHtg = Math.round(lineHtg * 100) / 100;
    item.totalUsd = Math.round(lineUsd * 100) / 100;
    subtotalHtg += lineHtg;
    subtotalUsd += lineUsd;
  }

  // Remise globale
  let discountHtg = 0, discountUsd = 0;
  if (discountType === 'percent') {
    discountHtg = subtotalHtg * Number(discountValue) / 100;
    discountUsd = subtotalUsd * Number(discountValue) / 100;
  } else {
    discountHtg = Number(discountValue);
    discountUsd = Number(discountValue) / Number(exchangeRate);
  }

  const afterDiscHtg = subtotalHtg - discountHtg;
  const afterDiscUsd = subtotalUsd - discountUsd;

  const taxHtg = afterDiscHtg * Number(taxRate) / 100;
  const taxUsd = afterDiscUsd * Number(taxRate) / 100;

  return {
    subtotalHtg: Math.round(subtotalHtg * 100) / 100,
    subtotalUsd: Math.round(subtotalUsd * 100) / 100,
    discountHtg: Math.round(discountHtg * 100) / 100,
    discountUsd: Math.round(discountUsd * 100) / 100,
    taxHtg: Math.round(taxHtg * 100) / 100,
    taxUsd: Math.round(taxUsd * 100) / 100,
    totalHtg: Math.round((afterDiscHtg + taxHtg) * 100) / 100,
    totalUsd: Math.round((afterDiscUsd + taxUsd) * 100) / 100
  };
};

// ── GET ALL
const getAll = async (tenantId, { status, clientId, search, page = 1, limit = 20 }) => {
  const where = {
    tenantId,
    ...(status && { status }),
    ...(clientId && { clientId }),
    ...(search && {
      OR: [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } }
      ]
    })
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        creator: { select: { fullName: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit)
    }),
    prisma.quote.count({ where })
  ]);

  return { quotes, total, page: Number(page), pages: Math.ceil(total / limit) };
};

// ── GET ONE
const getOne = async (tenantId, id) => {
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    include: {
      client: true,
      items: {
        include: { product: { select: { id: true, name: true, code: true, unit: true } } },
        orderBy: { sortOrder: 'asc' }
      },
      creator: { select: { fullName: true } },
      invoice: { select: { id: true, invoiceNumber: true, status: true } }
    }
  });

  if (!quote) throw Object.assign(new Error('Devis pa jwenn.'), { statusCode: 404 });
  return quote;
};

// ── CREATE
const create = async (tenantId, userId, data) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const quoteNumber = await generateQuoteNumber(tenantId);
  const exchangeRate = data.exchangeRate || Number(tenant.exchangeRate);

  // Snapshot client
  let clientSnapshot = data.clientSnapshot || {};
  if (data.clientId) {
    const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId } });
    if (client) {
      clientSnapshot = {
        id: client.id, name: client.name, email: client.email,
        phone: client.phone, address: client.address, nif: client.nif
      };
    }
  }

  // Préparer items avec snapshots produits
  const items = [];
  for (const item of data.items || []) {
    const product = await prisma.product.findFirst({ where: { id: item.productId, tenantId } });
    const snapshot = product
      ? { id: product.id, name: product.name, code: product.code, unit: product.unit }
      : (item.productSnapshot || {});

    items.push({
      productId: item.productId,
      productSnapshot: snapshot,
      quantity: Number(item.quantity),
      unitPriceHtg: Number(item.unitPriceHtg || product?.priceHtg || 0),
      unitPriceUsd: Number(item.unitPriceUsd || product?.priceUsd || 0),
      discountPct: Number(item.discountPct || 0),
      sortOrder: item.sortOrder || 0,
      notes: item.notes
    });
  }

  const totals = calculateTotals(
    items,
    data.discountType || 'amount',
    data.discountValue || 0,
    data.taxRate ?? Number(tenant.taxRate),
    exchangeRate
  );

  const quote = await prisma.quote.create({
    data: {
      tenantId,
      quoteNumber,
      clientId: data.clientId,
      clientSnapshot,
      currency: data.currency || tenant.defaultCurrency,
      exchangeRate,
      discountType: data.discountType || 'amount',
      discountValue: Number(data.discountValue || 0),
      taxRate: Number(data.taxRate ?? tenant.taxRate),
      ...totals,
      status: 'draft',
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      notes: data.notes,
      terms: data.terms,
      createdBy: userId,
      items: {
        create: items.map(item => ({
          ...item,
          tenantId,
          totalHtg: item.totalHtg,
          totalUsd: item.totalUsd
        }))
      }
    },
    include: {
      items: true,
      client: { select: { id: true, name: true } }
    }
  });

  return quote;
};

// ── UPDATE (seulement si draft ou sent)
const update = async (tenantId, id, userId, data) => {
  const quote = await prisma.quote.findFirst({ where: { id, tenantId } });
  if (!quote) throw Object.assign(new Error('Devis pa jwenn.'), { statusCode: 404 });

  if (['converted', 'cancelled'].includes(quote.status)) {
    throw Object.assign(new Error('Devis konvèti oswa anile pa ka modifye.'), { statusCode: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const exchangeRate = data.exchangeRate || Number(quote.exchangeRate);

  // Recalculer items si fournis
  let items = [];
  if (data.items) {
    for (const item of data.items) {
      const product = item.productId
        ? await prisma.product.findFirst({ where: { id: item.productId, tenantId } })
        : null;
      const snapshot = product
        ? { id: product.id, name: product.name, code: product.code, unit: product.unit }
        : (item.productSnapshot || {});

      items.push({
        productId: item.productId,
        productSnapshot: snapshot,
        quantity: Number(item.quantity),
        unitPriceHtg: Number(item.unitPriceHtg || product?.priceHtg || 0),
        unitPriceUsd: Number(item.unitPriceUsd || product?.priceUsd || 0),
        discountPct: Number(item.discountPct || 0),
        sortOrder: item.sortOrder || 0,
        notes: item.notes
      });
    }

    const totals = calculateTotals(items, data.discountType, data.discountValue, data.taxRate, exchangeRate);

    // Supprimer anciens items et recréer
    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

    return prisma.quote.update({
      where: { id },
      data: {
        clientId: data.clientId,
        clientSnapshot: data.clientSnapshot || quote.clientSnapshot,
        currency: data.currency,
        exchangeRate,
        discountType: data.discountType,
        discountValue: Number(data.discountValue || 0),
        taxRate: Number(data.taxRate ?? quote.taxRate),
        ...totals,
        issueDate: data.issueDate ? new Date(data.issueDate) : quote.issueDate,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : quote.expiryDate,
        notes: data.notes,
        terms: data.terms,
        items: {
          create: items.map(item => ({
            ...item,
            tenantId,
            totalHtg: item.totalHtg,
            totalUsd: item.totalUsd
          }))
        }
      },
      include: { items: true, client: { select: { id: true, name: true } } }
    });
  }

  // Mise à jour simple sans items
  return prisma.quote.update({ where: { id }, data: { notes: data.notes, terms: data.terms, expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined } });
};

// ── SEND (changer statut → sent)
const send = async (tenantId, id) => {
  const quote = await prisma.quote.findFirst({ where: { id, tenantId } });
  if (!quote) throw Object.assign(new Error('Devis pa jwenn.'), { statusCode: 404 });
  if (quote.status !== 'draft') throw Object.assign(new Error('Se sèlman devis brouyon yo ka voye.'), { statusCode: 400 });

  return prisma.quote.update({ where: { id }, data: { status: 'sent' } });
};

// ── CANCEL
const cancel = async (tenantId, id) => {
  const quote = await prisma.quote.findFirst({ where: { id, tenantId } });
  if (!quote) throw Object.assign(new Error('Devis pa jwenn.'), { statusCode: 404 });
  if (quote.status === 'converted') throw Object.assign(new Error('Devis konvèti pa ka anile.'), { statusCode: 400 });

  return prisma.quote.update({ where: { id }, data: { status: 'cancelled' } });
};

// ── CONVERT TO INVOICE ← règle critique
const convertToInvoice = async (tenantId, id, userId) => {
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId },
    include: { items: true, client: true }
  });

  if (!quote) throw Object.assign(new Error('Devis pa jwenn.'), { statusCode: 404 });

  if (quote.status === 'converted') {
    throw Object.assign(new Error('Devis sa deja konvèti an facture.'), { statusCode: 400 });
  }
  if (quote.status === 'cancelled') {
    throw Object.assign(new Error('Devis anile pa ka konvèti.'), { statusCode: 400 });
  }
  if (quote.items.length === 0) {
    throw Object.assign(new Error('Devis dwe gen omwen yon atik.'), { statusCode: 400 });
  }

  // Générer numéro facture
  const year = new Date().getFullYear();
  const invoiceSeq = await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId, documentType: 'invoice' } },
    create: { tenantId, documentType: 'invoice', prefix: 'FAC', lastNumber: 1, currentYear: year },
    update: { lastNumber: { increment: 1 }, currentYear: year }
  });

  const invoiceNumber = `${invoiceSeq.prefix}-${year}-${String(invoiceSeq.lastNumber).padStart(4, '0')}`;

  // Transaction: créer facture + marquer devis converti
  const [invoice] = await prisma.$transaction([
    // Créer la facture
    prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        quoteId: quote.id,
        clientId: quote.clientId,
        clientSnapshot: quote.clientSnapshot,
        currency: quote.currency,
        exchangeRate: quote.exchangeRate,
        subtotalHtg: quote.subtotalHtg,
        subtotalUsd: quote.subtotalUsd,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountHtg: quote.discountHtg,
        discountUsd: quote.discountUsd,
        taxRate: quote.taxRate,
        taxHtg: quote.taxHtg,
        taxUsd: quote.taxUsd,
        totalHtg: quote.totalHtg,
        totalUsd: quote.totalUsd,
        balanceDueHtg: quote.totalHtg,
        balanceDueUsd: quote.totalUsd,
        status: 'unpaid',
        issueDate: new Date(),
        notes: quote.notes,
        terms: quote.terms,
        createdBy: userId,
        items: {
          create: quote.items.map(item => ({
            tenantId,
            productId: item.productId,
            productSnapshot: item.productSnapshot,
            quantity: item.quantity,
            unitPriceHtg: item.unitPriceHtg,
            unitPriceUsd: item.unitPriceUsd,
            discountPct: item.discountPct,
            totalHtg: item.totalHtg,
            totalUsd: item.totalUsd,
            sortOrder: item.sortOrder,
            notes: item.notes
          }))
        }
      },
      include: {
        items: true,
        client: { select: { id: true, name: true } }
      }
    }),
    // Marquer devis converti
    prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: 'converted',
        convertedAt: new Date()
      }
    })
  ]);

  // Décrémenter le stock (hors transaction pour éviter timeout)
  await decrementStock(invoice.id, tenantId, userId);

  return invoice;
};

// ── Décrémenter stock après création facture
const decrementStock = async (invoiceId, tenantId, userId) => {
  const items = await prisma.invoiceItem.findMany({
    where: { invoiceId },
    include: { product: true }
  });

  for (const item of items) {
    if (!item.productId || !item.product) continue;

    const qtyBefore = Number(item.product.quantity);
    const qtyChange = -Number(item.quantity);
    const qtyAfter  = qtyBefore + qtyChange;

    await prisma.$transaction([
      prisma.product.update({
        where: { id: item.productId },
        data: { quantity: Math.max(0, qtyAfter) }
      }),
      prisma.invoiceItem.update({
        where: { id: item.id },
        data: { stockBefore: qtyBefore, stockAfter: Math.max(0, qtyAfter) }
      }),
      prisma.stockMovement.create({
        data: {
          tenantId, productId: item.productId,
          movementType: 'sale',
          referenceId: invoiceId,
          referenceType: 'invoice',
          quantityBefore: qtyBefore,
          quantityChange: qtyChange,
          quantityAfter: Math.max(0, qtyAfter),
          createdBy: userId
        }
      })
    ]);
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { stockDecremented: true } });
};

module.exports = { getAll, getOne, create, update, send, cancel, convertToInvoice };
