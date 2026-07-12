// src/modules/invoices/invoice.service.js
const prisma = require('../../config/prisma');
const {
  notifyNewInvoice,
  notifyInvoicePaid,
  notifyPaymentReceived,
  notifyLowStock,
} = require('../notifications/notification.service');

// ── Haiti = UTC-5
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
      payments: { orderBy: { paymentDate: 'asc' } },
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
    items = [],
    // ✅ NOUVO — pou vant offline: dat egzat vant lan (pa dat senkwonizasyon an)
    issueDate,
    // ✅ NOUVO — pèmèt estòk vin negatif (itilize pandan senkwonizasyon vant offline yo,
    // paske machandiz la deja soti fizikman menm si backend pa t konnen sa lè sa a)
    allowNegativeStock,
    // ✅ NOUVO — peman ki fèt AN MENM TAN ak kreyasyon fakti a (mache offline tou)
    payment,
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
        // ✅ NOUVO — itilize dat egzat vant lan si li bay (enpòtan pou vant offline
        // ki senkwonize an reta — konsa fakti a gen dat REYÈL vant lan, pa dat sync)
        issueDate: issueDate ? new Date(issueDate) : undefined,
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
          const rawStockAfter = stockBefore - Number(item.quantity);
          // ✅ KORIJE — si allowNegativeStock (vant offline ki senkwonize), kite valè
          // reyèl la (ka negatif) pou n ka detekte "oversell". Sinon, kenbe defo a
          // (pa desann anba 0) pou vant nòmal an dirèk.
          stockAfter = allowNegativeStock ? rawStockAfter : Math.max(0, rawStockAfter);

          await tx.product.update({ where: { id: item.productId }, data: { quantity: stockAfter } });
          await tx.stockMovement.create({
            data: {
              tenantId, branchId: branchId || null, productId: item.productId,
              movementType: 'sale', referenceId: inv.id, referenceType: 'invoice_direct',
              quantityBefore: stockBefore, quantityChange: -Number(item.quantity),
              quantityAfter: stockAfter,
              notes: allowNegativeStock && stockAfter < 0
                ? `Fakti dirèk ${invoiceNumber} (⚠️ SENKWONIZE OFFLINE — ESTÒK NEGATIF)`
                : `Fakti dirèk ${invoiceNumber}`,
              createdBy: userId
            }
          });

          // ✅ NOUVO — Avèti si estòk vin negatif (oversell pandan offline)
          if (stockAfter < 0) {
            notifyLowStock({
              tenantId,
              productName: `⚠️ ${product.name} (ESTÒK NEGATIF)`,
              currentQty: stockAfter,
              threshold: 0
            }).catch(() => {});
          } else if (product.alertThreshold && stockAfter <= Number(product.alertThreshold)) {
            notifyLowStock({
              tenantId,
              productName: product.name,
              currentQty: stockAfter,
              threshold: Number(product.alertThreshold)
            }).catch(() => {});
          }
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
    // ✅ NOUVO — Si peman bay AN MENM TAN ak kreyasyon fakti a (vant dirèk ki peye,
    // ni online ni offline), kreye Payment la epi mete estati fakti a ajou nan MENM
    // transaksyon an (atomik — tou de reyisi ansanm oswa echwe ansanm)
    if (payment && (Number(payment.amountHtg) > 0 || Number(payment.amountUsd) > 0)) {
      const VALID_METHODS = ['cash', 'card', 'transfer', 'moncash', 'natcash', 'check', 'credit', 'other'];
      const method = VALID_METHODS.includes(payment.method) ? payment.method : 'cash';
      const paidHtg = Number(payment.amountHtg || 0);
      const paidUsd = Number(payment.amountUsd || 0);

      await tx.payment.create({
        data: {
          tenantId, invoiceId: inv.id,
          amountHtg: paidHtg, amountUsd: paidUsd,
          currency: currency || 'HTG', exchangeRate: rate,
          method,
          amountGiven: Number(payment.amountGiven || 0),
          change: Number(payment.change || 0),
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
          createdBy: userId,
        }
      });

      const balanceHtg = Math.max(0, Number(totalHtg || 0) - paidHtg);
      const balanceUsd = Math.max(0, Number(totalUsd || 0) - paidUsd);
      let newStatus = 'partial';
      if (balanceHtg <= 0) newStatus = 'paid';
      if (paidHtg === 0) newStatus = 'unpaid';

      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          amountPaidHtg: paidHtg, amountPaidUsd: paidUsd,
          balanceDueHtg: balanceHtg, balanceDueUsd: balanceUsd,
          status: newStatus,
        }
      });
    }

    await tx.invoice.update({ where: { id: inv.id }, data: { stockDecremented: true } });
    return inv;
  });

  notifyNewInvoice({
    tenantId,
    invoiceNumber,
    clientName: clientSnapshot?.name || 'Kliyan enkoni',
    totalHtg: Number(totalHtg || 0)
  }).catch(() => {});

  // ✅ NOUVO — Notifikasyon peman si te gen yon peman atache ak kreyasyon an
  if (payment && (Number(payment.amountHtg) > 0 || Number(payment.amountUsd) > 0)) {
    notifyPaymentReceived({
      tenantId,
      invoiceNumber,
      amountHtg: Number(payment.amountHtg || 0),
      method: payment.method || 'cash'
    }).catch(() => {});

    if (Number(payment.amountHtg || 0) >= Number(totalHtg || 0)) {
      notifyInvoicePaid({
        tenantId,
        invoiceNumber,
        clientName: clientSnapshot?.name || 'Kliyan enkoni'
      }).catch(() => {});
    }
  }

  return getOne(tenantId, invoice.id);
};

// ── DASHBOARD
const getDashboard = async (tenantId, branchId, dateFrom = null, dateTo = null) => {
  const bf = branchId ? { branchId } : {};
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

  // ✅ Valide method — 'credit' aksepte; tout lòt valè enkoni → 'cash'
  const VALID_METHODS = ['cash', 'card', 'transfer', 'moncash', 'natcash', 'check', 'credit', 'other'];
  const method = VALID_METHODS.includes(data.method) ? data.method : 'cash';

  // ✅ dueDate — dat limit peman kredi, sove sou peman an
  const dueDate = data.dueDate ? new Date(data.dueDate) : null;

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      invoiceId,
      amountHtg,
      amountUsd,
      currency:     data.currency    || invoice.currency,
      exchangeRate: data.exchangeRate || invoice.exchangeRate,
      method,
      reference:    data.reference   || null,
      paymentDate:  data.paymentDate  ? new Date(data.paymentDate) : new Date(),
      dueDate,
      amountGiven:  Number(data.amountGiven || 0),   // ✅ kòb kliyan te bay
      change:       Number(data.change || 0),         // ✅ monnen remèt
      notes:        data.notes        || null,
      createdBy:    userId,
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
      amountPaidHtg: totalPaidHtg,
      amountPaidUsd: totalPaidUsd,
      balanceDueHtg: Math.max(0, balanceDueHtg),
      balanceDueUsd: Math.max(0, balanceDueUsd),
      status: newStatus,
      // ✅ Si se kredi (gen balans), sove dueDate sou fakti a tou pou resi HTML la
      ...(dueDate && balanceDueHtg > 0 ? { dueDate } : {}),
    }
  });

  notifyPaymentReceived({
    tenantId,
    invoiceNumber: invoice.invoiceNumber,
    amountHtg,
    method
  }).catch(() => {});

  if (newStatus === 'paid') {
    notifyInvoicePaid({
      tenantId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientSnapshot?.name || 'Kliyan enkoni'
    }).catch(() => {});
  }

  return { payment, newStatus, balanceDueHtg: Math.max(0, balanceDueHtg) };
};

module.exports = { getAll, getOne, getDashboard, cancel, addPayment, createDirect };