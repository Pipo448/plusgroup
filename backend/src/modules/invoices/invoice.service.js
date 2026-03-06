// src/modules/invoices/invoice.service.js
const prisma = require('../../config/prisma');

// ── Haiti = UTC-5
// '2026-03-05' minwi Haiti     = 2026-03-05T05:00:00.000Z  (gte)
// '2026-03-05' 11:59pm Haiti   = 2026-03-06T04:59:59.999Z  (lte)
//
// BUG ki te la: gte = lte = T05:00Z → 0 rezilta lè dateFrom=dateTo
// FIX: lte = T05:00Z + 24h - 1ms = jou apre T04:59:59.999Z
const haitiRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return {};
  const gte = new Date(`${dateFrom}T05:00:00.000Z`);
  const lte = new Date(new Date(`${dateTo}T05:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000 - 1);
  return { gte, lte };
};

// ── Jwenn nimewo fakti nextval
const getNextInvoiceNumber = async (tenantId) => {
  const year = new Date().getFullYear();
  const seq = await prisma.documentSequence.upsert({
    where:  { tenantId_documentType: { tenantId, documentType: 'invoice' } },
    create: { tenantId, documentType: 'invoice', prefix: 'FAC', lastNumber: 0, currentYear: year },
    update: {}
  });
  const lastNumber = seq.currentYear < year ? 0 : seq.lastNumber;
  const nextNumber = lastNumber + 1;
  await prisma.documentSequence.update({
    where: { tenantId_documentType: { tenantId, documentType: 'invoice' } },
    data: { lastNumber: nextNumber, currentYear: year }
  });
  return `${seq.prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
};

// ── GET ALL
const getAll = async (tenantId, { status, clientId, search, page = 1, limit = 20, dateFrom, dateTo, branchId }) => {
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(status && { status }),
    ...(clientId && { clientId }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }),
    ...(dateFrom && dateTo && { issueDate: haitiRange(dateFrom, dateTo) })
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        client:  { select: { id: true, name: true, phone: true } },
        creator: { select: { fullName: true } },
        _count:  { select: { items: true, payments: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit)
    }),
    prisma.invoice.count({ where })
  ]);

  return { invoices, total, page: Number(page), pages: Math.ceil(total / limit) };
};

// ── GET ONE
const getOne = async (tenantId, id) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId },
    include: {
      client: true,
      items: {
        include: { product: { select: { id: true, name: true, code: true, unit: true } } },
        orderBy: { sortOrder: 'asc' }
      },
      payments:  { orderBy: { paymentDate: 'desc' } },
      quote:     { select: { id: true, quoteNumber: true, notes: true, terms: true } },
      creator:   { select: { fullName: true } },
      canceller: { select: { fullName: true } },
      tenant:    { select: { name: true, address: true, phone: true, email: true, exchangeRate: true } }
    }
  });
  if (!invoice) throw Object.assign(new Error('Facture pa jwenn.'), { statusCode: 404 });
  if (!invoice.notes && invoice.quote?.notes) invoice.notes = invoice.quote.notes;
  if (!invoice.terms && invoice.quote?.terms) invoice.terms = invoice.quote.terms;
  return invoice;
};

// ── CREATE DIRECT
const createDirect = async (tenantId, userId, data) => {
  const {
    clientId, clientSnapshot, currency, exchangeRate,
    subtotalHtg, subtotalUsd,
    discountType, discountValue, discountHtg, discountUsd,
    taxRate, taxHtg, taxUsd,
    totalHtg, totalUsd,
    dueDate, notes, terms, branchId,
    items = []
  } = data;

  if (!items.length) throw Object.assign(new Error('Fakti dwe gen omwen yon pwodui.'), { statusCode: 400 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { requireQuote: true, exchangeRate: true, taxRate: true }
  });

  if (tenant.requireQuote) throw Object.assign(new Error('Biznis ou obligе pase pa yon devi avan li ka fè fakti.'), { statusCode: 403 });

  const invoiceNumber = await getNextInvoiceNumber(tenantId);
  const rate = exchangeRate || Number(tenant.exchangeRate);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId, branchId: branchId || null, invoiceNumber, quoteId: null,
        clientId: clientId || null, clientSnapshot: clientSnapshot || {},
        currency: currency || 'HTG', exchangeRate: rate,
        subtotalHtg: Number(subtotalHtg || 0), subtotalUsd: Number(subtotalUsd || 0),
        discountType: discountType || 'amount', discountValue: Number(discountValue || 0),
        discountHtg: Number(discountHtg || 0), discountUsd: Number(discountUsd || 0),
        taxRate: Number(taxRate || tenant.taxRate || 0),
        taxHtg: Number(taxHtg || 0), taxUsd: Number(taxUsd || 0),
        totalHtg: Number(totalHtg || 0), totalUsd: Number(totalUsd || 0),
        balanceDueHtg: Number(totalHtg || 0), balanceDueUsd: Number(totalUsd || 0),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes, terms, createdBy: userId
      }
    });

    for (const [idx, item] of items.entries()) {
      let stockBefore = null, stockAfter = null;
      if (item.productId) {
        const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
        if (product && !product.isService) {
          stockBefore = Number(product.quantity);
          stockAfter  = stockBefore - Number(item.quantity);
          await tx.product.update({ where: { id: item.productId }, data: { quantity: Math.max(0, stockAfter) } });
          await tx.stockMovement.create({
            data: {
              tenantId, branchId: branchId || null, productId: item.productId,
              movementType: 'sale', referenceId: inv.id, referenceType: 'invoice_direct',
              quantityBefore: stockBefore, quantityChange: -Number(item.quantity),
              quantityAfter: Math.max(0, stockAfter),
              notes: `Fakti dirèk ${invoiceNumber}`, createdBy: userId
            }
          });
        }
      }
      await tx.invoiceItem.create({
        data: {
          tenantId, invoiceId: inv.id,
          productId: item.productId || null, productSnapshot: item.productSnapshot || {},
          quantity: Number(item.quantity),
          unitPriceHtg: Number(item.unitPriceHtg || 0), unitPriceUsd: Number(item.unitPriceUsd || 0),
          discountPct: Number(item.discountPct || 0),
          totalHtg: Number(item.totalHtg || 0), totalUsd: Number(item.totalUsd || 0),
          stockBefore, stockAfter, sortOrder: idx, notes: item.notes || null
        }
      });
    }
    await tx.invoice.update({ where: { id: inv.id }, data: { stockDecremented: true } });
    return inv;
  });

  return getOne(tenantId, invoice.id);
};

// ── DASHBOARD
const getDashboard = async (tenantId, branchId, dateFrom = null, dateTo = null) => {
  const bf = branchId ? { branchId } : {};
  // ✅ FIX: haitiRange retounen { gte, lte } — ajoute nan createdAt
  const df = (dateFrom && dateTo) ? { createdAt: haitiRange(dateFrom, dateTo) } : {};

  const [totalUnpaid, totalPaid, totalPartial, recentInvoices, topClients] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantId, ...bf, ...df, status: 'unpaid' },
      _sum: { balanceDueHtg: true, balanceDueUsd: true }, _count: true
    }),
    prisma.invoice.aggregate({
      where: { tenantId, ...bf, ...df, status: 'paid' },
      _sum: { totalHtg: true, totalUsd: true }, _count: true
    }),
    prisma.invoice.aggregate({
      where: { tenantId, ...bf, ...df, status: 'partial' },
      _sum: { balanceDueHtg: true }, _count: true
    }),
    prisma.invoice.findMany({
      where: { tenantId, ...bf },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 5
    }),
    prisma.invoice.groupBy({
      by: ['clientId'],
      where: { tenantId, ...bf, status: { not: 'cancelled' } },
      _sum: { totalHtg: true }, _count: true,
      orderBy: { _sum: { totalHtg: 'desc' } }, take: 5
    })
  ]);

  return { totalUnpaid, totalPaid, totalPartial, recentInvoices, topClients };
};

// ── CANCEL
const cancel = async (tenantId, id, userId, reason) => {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
  if (!invoice) throw Object.assign(new Error('Facture pa jwenn.'), { statusCode: 404 });
  if (invoice.status === 'cancelled') throw Object.assign(new Error('Facture deja anile.'), { statusCode: 400 });

  if (invoice.stockDecremented) {
    const items = await prisma.invoiceItem.findMany({ where: { invoiceId: id }, include: { product: true } });
    for (const item of items) {
      if (!item.productId) continue;
      const qtyBefore = Number(item.product.quantity);
      const qtyAfter  = qtyBefore + Number(item.quantity);
      await prisma.$transaction([
        prisma.product.update({ where: { id: item.productId }, data: { quantity: qtyAfter } }),
        prisma.stockMovement.create({
          data: {
            tenantId, productId: item.productId,
            movementType: 'return_item', referenceId: id, referenceType: 'invoice_cancel',
            quantityBefore: qtyBefore, quantityChange: Number(item.quantity), quantityAfter: qtyAfter,
            notes: `Anilasyon facture ${invoice.invoiceNumber}`, createdBy: userId
          }
        })
      ]);
    }
  }

  return prisma.invoice.update({
    where: { id },
    data: { status: 'cancelled', cancelledBy: userId, cancelledAt: new Date(), cancelReason: reason }
  });
};

// ── ADD PAYMENT
const addPayment = async (tenantId, invoiceId, userId, data) => {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) throw Object.assign(new Error('Facture pa jwenn.'), { statusCode: 404 });
  if (invoice.status === 'cancelled') throw Object.assign(new Error('Facture anile pa ka resevwa peman.'), { statusCode: 400 });
  if (invoice.status === 'paid') throw Object.assign(new Error('Facture deja peye.'), { statusCode: 400 });

  const amountHtg = Number(data.amountHtg || 0);
  const amountUsd = Number(data.amountUsd || 0);

  const payment = await prisma.payment.create({
    data: {
      tenantId, invoiceId, amountHtg, amountUsd,
      currency: data.currency || invoice.currency,
      exchangeRate: data.exchangeRate || invoice.exchangeRate,
      method: data.method || 'cash', reference: data.reference,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      notes: data.notes, createdBy: userId
    }
  });

  const allPayments = await prisma.payment.aggregate({
    where: { invoiceId }, _sum: { amountHtg: true, amountUsd: true }
  });

  const totalPaidHtg  = Number(allPayments._sum.amountHtg || 0);
  const totalPaidUsd  = Number(allPayments._sum.amountUsd || 0);
  const balanceDueHtg = Number(invoice.totalHtg) - totalPaidHtg;
  const balanceDueUsd = Number(invoice.totalUsd) - totalPaidUsd;

  let newStatus = 'partial';
  if (balanceDueHtg <= 0) newStatus = 'paid';
  if (totalPaidHtg === 0) newStatus = 'unpaid';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaidHtg: totalPaidHtg, amountPaidUsd: totalPaidUsd,
      balanceDueHtg: Math.max(0, balanceDueHtg), balanceDueUsd: Math.max(0, balanceDueUsd),
      status: newStatus
    }
  });

  return { payment, newStatus, balanceDueHtg: Math.max(0, balanceDueHtg) };
};

module.exports = { getAll, getOne, getDashboard, cancel, addPayment, createDirect };