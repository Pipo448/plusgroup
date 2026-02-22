// src/modules/invoices/invoice.service.js
const prisma = require('../../config/prisma');

// ── GET ALL
const getAll = async (tenantId, { status, clientId, search, page = 1, limit = 20, dateFrom, dateTo }) => {
  const where = {
    tenantId,
    ...(status && { status }),
    ...(clientId && { clientId }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }),
    ...(dateFrom && dateTo && {
      issueDate: { gte: new Date(dateFrom), lte: new Date(dateTo) }
    })
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        creator: { select: { fullName: true } },
        _count: { select: { items: true, payments: true } }
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

  // ✅ Si invoice pa gen notes/terms, pran yo nan devis orijinal la
  if (!invoice.notes && invoice.quote?.notes) invoice.notes = invoice.quote.notes;
  if (!invoice.terms && invoice.quote?.terms) invoice.terms = invoice.quote.terms;

  return invoice;
};

// ── DASHBOARD (résumé rapide)
const getDashboard = async (tenantId) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalUnpaid, totalPaid, totalPartial, recentInvoices, topClients] = await Promise.all([
    // Total impayé
    prisma.invoice.aggregate({
      where: { tenantId, status: 'unpaid' },
      _sum: { balanceDueHtg: true, balanceDueUsd: true },
      _count: true
    }),
    // Total payé ce mois
    prisma.invoice.aggregate({
      where: { tenantId, status: 'paid', issueDate: { gte: startOfMonth } },
      _sum: { totalHtg: true, totalUsd: true },
      _count: true
    }),
    // Partiellement payé
    prisma.invoice.aggregate({
      where: { tenantId, status: 'partial' },
      _sum: { balanceDueHtg: true },
      _count: true
    }),
    // 5 dernières factures
    prisma.invoice.findMany({
      where: { tenantId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    // Top clients
    prisma.invoice.groupBy({
      by: ['clientId'],
      where: { tenantId, status: { not: 'cancelled' } },
      _sum: { totalHtg: true },
      _count: true,
      orderBy: { _sum: { totalHtg: 'desc' } },
      take: 5
    })
  ]);

  return { totalUnpaid, totalPaid, totalPartial, recentInvoices, topClients };
};

// ── CANCEL
const cancel = async (tenantId, id, userId, reason) => {
  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
  if (!invoice) throw Object.assign(new Error('Facture pa jwenn.'), { statusCode: 404 });
  if (invoice.status === 'cancelled') throw Object.assign(new Error('Facture deja anile.'), { statusCode: 400 });

  // Restaurer stock si déjà décrémenté
  if (invoice.stockDecremented) {
    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId: id },
      include: { product: true }
    });

    for (const item of items) {
      if (!item.productId) continue;
      const qtyBefore = Number(item.product.quantity);
      const qtyAfter  = qtyBefore + Number(item.quantity);

      await prisma.$transaction([
        prisma.product.update({ where: { id: item.productId }, data: { quantity: qtyAfter } }),
        prisma.stockMovement.create({
          data: {
            tenantId, productId: item.productId,
            movementType: 'return_item',
            referenceId: id, referenceType: 'invoice_cancel',
            quantityBefore: qtyBefore, quantityChange: Number(item.quantity), quantityAfter: qtyAfter,
            notes: `Anilasyon facture ${invoice.invoiceNumber}`,
            createdBy: userId
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

  // Créer paiement
  const payment = await prisma.payment.create({
    data: {
      tenantId,
      invoiceId,
      amountHtg, amountUsd,
      currency: data.currency || invoice.currency,
      exchangeRate: data.exchangeRate || invoice.exchangeRate,
      method: data.method || 'cash',
      reference: data.reference,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      notes: data.notes,
      createdBy: userId
    }
  });

  // Recalculer totaux payés
  const allPayments = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amountHtg: true, amountUsd: true }
  });

  const totalPaidHtg = Number(allPayments._sum.amountHtg || 0);
  const totalPaidUsd = Number(allPayments._sum.amountUsd || 0);
  const balanceDueHtg = Number(invoice.totalHtg) - totalPaidHtg;
  const balanceDueUsd = Number(invoice.totalUsd) - totalPaidUsd;

  let newStatus = 'partial';
  if (balanceDueHtg <= 0) newStatus = 'paid';
  if (totalPaidHtg === 0) newStatus = 'unpaid';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaidHtg: totalPaidHtg,
      amountPaidUsd: totalPaidUsd,
      balanceDueHtg: Math.max(0, balanceDueHtg),
      balanceDueUsd: Math.max(0, balanceDueUsd),
      status: newStatus
    }
  });

  return { payment, newStatus, balanceDueHtg: Math.max(0, balanceDueHtg) };
};

module.exports = { getAll, getOne, getDashboard, cancel, addPayment };

// ============================================================
// src/modules/invoices/invoice.controller.js
// ============================================================
// NOTE: fichier séparé en production, inline ici pour concision
