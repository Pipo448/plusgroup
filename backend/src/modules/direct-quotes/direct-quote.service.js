// src/modules/direct-quotes/direct-quote.service.js
const prisma = require('../../config/prisma');
const crypto = require('crypto');
const { notifyDirectQuoteAuthRequest } = require('../notifications/notification.service');

// ── Jwenn pwochen nimewo Devi Dirèk (sekans separe de Devi/Fakti nòmal)
const getNextDirectQuoteNumber = async (tenantId) => {
  const year = new Date().getFullYear();
  const seq = await prisma.documentSequence.upsert({
    where:  { tenantId_documentType: { tenantId, documentType: 'direct_quote' } },
    create: { tenantId, documentType: 'direct_quote', prefix: 'DD', lastNumber: 0, currentYear: year },
    update: {}
  });
  const lastNumber = seq.currentYear < year ? 0 : seq.lastNumber;
  const nextNumber = lastNumber + 1;
  await prisma.documentSequence.update({
    where: { tenantId_documentType: { tenantId, documentType: 'direct_quote' } },
    data: { lastNumber: nextNumber, currentYear: year }
  });
  return `${seq.prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
};

// ── GET ALL
const getAll = async (tenantId, { status, search, page = 1, limit = 20, branchId }) => {
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }),
  };

  const [directQuotes, total] = await Promise.all([
    prisma.directQuote.findMany({
      where,
      include: {
        client:      { select: { id: true, name: true, phone: true } },
        creator:     { select: { fullName: true } },
        authorizer:  { select: { fullName: true } },
        _count:      { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit)
    }),
    prisma.directQuote.count({ where })
  ]);

  return { directQuotes, total, page: Number(page), pages: Math.ceil(total / limit) };
};

// ── GET ONE
const getOne = async (tenantId, id) => {
  const dq = await prisma.directQuote.findFirst({
    where: { id, tenantId },
    include: {
      client:     true,
      items:      { orderBy: { sortOrder: 'asc' } },
      creator:    { select: { fullName: true } },
      authorizer: { select: { fullName: true } },
      tenant:     { select: { name: true, address: true, phone: true, email: true, logoUrl: true } }
    }
  });
  if (!dq) throw Object.assign(new Error('Devi Dirèk pa jwenn.'), { statusCode: 404 });
  return dq;
};

// ── Kalkile total yon liy + total jeneral
const computeTotals = (items, discountValue = 0, discountType = 'amount', exchangeRate) => {
  const computedItems = items.map((it, idx) => {
    const qty      = Number(it.quantity || 0);
    const price    = Number(it.unitPriceHtg || 0);
    const discAmt  = Number(it.discountAmt || 0);
    const totalHtg = Math.max(0, qty * price - discAmt);
    return {
      description:  String(it.description || '').trim(),
      // ✅ NOUVO — foto pwodui a ak gwosè (opsyonèl)
      imageUrl:     it.imageUrl || null,
      size:         it.size ? String(it.size).trim() : null,
      quantity:     qty,
      unitPriceHtg: price,
      unitPriceUsd: exchangeRate ? price / exchangeRate : 0,
      discountAmt:  discAmt,
      totalHtg,
      totalUsd:     exchangeRate ? totalHtg / exchangeRate : 0,
      sortOrder:    idx,
      notes:        it.notes || null,
    };
  });

  const subtotalHtg = computedItems.reduce((sum, it) => sum + it.totalHtg, 0);
  const discountHtg = discountType === 'percent'
    ? subtotalHtg * (Number(discountValue) / 100)
    : Number(discountValue || 0);
  const totalHtg = Math.max(0, subtotalHtg - discountHtg);

  return { computedItems, subtotalHtg, discountHtg, totalHtg };
};

// ── CREATE — ak otorizasyon PIN admin si se yon kesye ki kreye l
const create = async (tenantId, userId, userRole, data) => {
  const {
    clientId, clientSnapshot, currency, exchangeRate,
    discountType, discountValue,
    expiryDate, notes, terms, branchId,
    items = [],
  } = data;

  if (!items.length) throw Object.assign(new Error('Devi Dirèk dwe gen omwen yon atik.'), { statusCode: 400 });
  for (const it of items) {
    if (!it.description || !String(it.description).trim()) {
      throw Object.assign(new Error('Chak atik dwe gen yon deskripsyon.'), { statusCode: 400 });
    }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { exchangeRate: true }
  });
  const rate = exchangeRate || Number(tenant.exchangeRate);

  const { computedItems, subtotalHtg, discountHtg, totalHtg } = computeTotals(items, discountValue, discountType, rate);
  const quoteNumber = await getNextDirectQuoteNumber(tenantId);

  // ✅ MODIFYE — Kesye a anrejistre SAN okenn kòd. Si se yon admin ki
  // kreye l, li otorize pwòp tèt li otomatikman. Si se yon kesye,
  // devi a rete "an atant" (authorizedBy = null) jiskaske yon admin
  // antre PWÒP PIN pa li pou otorize l.
  const isAdmin = userRole === 'admin';

  const dq = await prisma.$transaction(async (tx) => {
    const created = await tx.directQuote.create({
      data: {
        tenantId, branchId: branchId || null, quoteNumber,
        clientId: clientId || null, clientSnapshot: clientSnapshot || {},
        currency: currency || 'HTG', exchangeRate: rate,
        subtotalHtg, subtotalUsd: rate ? subtotalHtg / rate : 0,
        discountType: discountType || 'amount', discountValue: Number(discountValue || 0),
        discountHtg, discountUsd: rate ? discountHtg / rate : 0,
        totalHtg, totalUsd: rate ? totalHtg / rate : 0,
        expiryDate: expiryDate ? new Date(`${expiryDate}T05:00:00.000Z`) : null,
        notes, terms,
        createdBy: userId,
        // ✅ Admin otorize pwòp tèt li imedyatman; kesye rete an atant
        authorizedBy: isAdmin ? userId : null,
        authorizedAt: isAdmin ? new Date() : null,
      }
    });

    await tx.directQuoteItem.createMany({
      data: computedItems.map(it => ({ ...it, tenantId, directQuoteId: created.id }))
    });

    return created;
  });

  // ✅ Si se yon kesye ki kreye l — avèti TOUT admin yo (push + notifikasyon,
  // menm si app la an background). Admin yo ap ouvri devi a pou wè tout
  // detay li, epi antre PWÒP PIN pa yo pou otorize l.
  if (!isAdmin) {
    const admins = await prisma.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      select: { id: true }
    });
    const cashier = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    notifyDirectQuoteAuthRequest({
      tenantId,
      cashierName: cashier?.fullName || 'Yon kesye',
      adminIds: admins.map(a => a.id),
      directQuoteId: dq.id,
      quoteNumber: dq.quoteNumber,
    }).catch(() => {});
  }

  return getOne(tenantId, dq.id);
};

// ✅ NOUVO — Admin otorize yon Devi Dirèk yon kesye kreye, ak PWÒP PIN pa li.
const authorize = async (tenantId, id, adminUserId, pin) => {
  if (!pin || !/^\d{4}$/.test(String(pin).trim())) {
    throw Object.assign(new Error('PIN dwe gen egzakteman 4 chif.'), { statusCode: 400 });
  }
  const admin = await prisma.user.findFirst({
    where: { id: adminUserId, tenantId, role: 'admin', isActive: true }
  });
  if (!admin || admin.directQuotePin !== String(pin).trim()) {
    throw Object.assign(new Error('PIN pa kòrèk.'), { statusCode: 401 });
  }
  const dq = await prisma.directQuote.findFirst({ where: { id, tenantId } });
  if (!dq) throw Object.assign(new Error('Devi Dirèk pa jwenn.'), { statusCode: 404 });

  await prisma.directQuote.update({
    where: { id },
    data: { authorizedBy: adminUserId, authorizedAt: new Date() }
  });

  return getOne(tenantId, id);
};

// ── UPDATE (sèlman si status === draft)
const update = async (tenantId, id, userId, userRole, data) => {
  const existing = await prisma.directQuote.findFirst({ where: { id, tenantId } });
  if (!existing) throw Object.assign(new Error('Devi Dirèk pa jwenn.'), { statusCode: 404 });
  if (existing.status !== 'draft') throw Object.assign(new Error('Ou pa ka modifye yon Devi Dirèk ki pa an bouyon.'), { statusCode: 400 });

  const { clientId, clientSnapshot, discountType, discountValue, expiryDate, notes, terms, items = [] } = data;
  const rate = Number(existing.exchangeRate);
  const { computedItems, subtotalHtg, discountHtg, totalHtg } = computeTotals(items, discountValue, discountType, rate);

  // ✅ NOUVO — Si se yon kesye (pa admin) ki modifye devi a, e li te deja
  // otorize, retire otorizasyon an epi mande yon NOUVO otorizasyon admin.
  const isAdmin = userRole === 'admin';
  const shouldResetAuth = !isAdmin && !!existing.authorizedBy;

  await prisma.$transaction(async (tx) => {
    await tx.directQuoteItem.deleteMany({ where: { directQuoteId: id } });
    await tx.directQuoteItem.createMany({
      data: computedItems.map(it => ({ ...it, tenantId, directQuoteId: id }))
    });
    await tx.directQuote.update({
      where: { id },
      data: {
        clientId: clientId || null, clientSnapshot: clientSnapshot || existing.clientSnapshot,
        discountType: discountType || 'amount', discountValue: Number(discountValue || 0),
        subtotalHtg, subtotalUsd: rate ? subtotalHtg / rate : 0,
        discountHtg, discountUsd: rate ? discountHtg / rate : 0,
        totalHtg, totalUsd: rate ? totalHtg / rate : 0,
        expiryDate: expiryDate ? new Date(`${expiryDate}T05:00:00.000Z`) : existing.expiryDate,
        notes, terms,
        ...(shouldResetAuth ? { authorizedBy: null, authorizedAt: null } : {}),
      }
    });
  });

  if (shouldResetAuth) {
    const admins = await prisma.user.findMany({
      where: { tenantId, role: 'admin', isActive: true },
      select: { id: true }
    });
    const cashier = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
    notifyDirectQuoteAuthRequest({
      tenantId,
      cashierName: cashier?.fullName || 'Yon kesye',
      adminIds: admins.map(a => a.id),
      directQuoteId: id,
      quoteNumber: existing.quoteNumber,
      isModification: true,
    }).catch(() => {});
  }

  return getOne(tenantId, id);
};

const send   = async (tenantId, id) => prisma.directQuote.update({ where: { id }, data: { status: 'sent' } });
const cancel = async (tenantId, id) => prisma.directQuote.update({ where: { id }, data: { status: 'cancelled' } });

// ── KONVÈTI an Fakti — kreye yon Fakti nòmal ak liy ALAMEN (san pwodui,
// san afekte estòk), swiv menm patwon ak invoice.service.createDirect
const convertToInvoice = async (tenantId, id, userId, userRole) => {
  const dq = await getOne(tenantId, id);
  if (dq.status === 'cancelled') throw Object.assign(new Error('Pa ka konvèti yon Devi Dirèk ki anile.'), { statusCode: 400 });
  // ✅ NOUVO — Aksyon sa a bloke pou kesye jiskaske yon admin otorize devi a
  if (userRole !== 'admin' && !dq.authorizedBy) {
    throw Object.assign(new Error('Devi sa a poko otorize pa yon admin.'), { statusCode: 403 });
  }
  if (dq.status === 'converted') throw Object.assign(new Error('Devi Dirèk sa deja konvèti.'), { statusCode: 400 });

  const { getNextInvoiceNumber } = require('../invoices/invoice.service');

  const invoiceNumber = await getNextInvoiceNumber(tenantId);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId, branchId: dq.branchId, invoiceNumber, quoteId: null,
        clientId: dq.clientId, clientSnapshot: dq.clientSnapshot,
        currency: dq.currency, exchangeRate: dq.exchangeRate,
        subtotalHtg: dq.subtotalHtg, subtotalUsd: dq.subtotalUsd,
        discountType: dq.discountType, discountValue: dq.discountValue,
        discountHtg: dq.discountHtg, discountUsd: dq.discountUsd,
        totalHtg: dq.totalHtg, totalUsd: dq.totalUsd,
        balanceDueHtg: dq.totalHtg, balanceDueUsd: dq.totalUsd,
        notes: `[Konvèti soti Devi Dirèk ${dq.quoteNumber}]\n${dq.notes || ''}`.trim(),
        terms: dq.terms, createdBy: userId, stockDecremented: true,
      }
    });

    await tx.invoiceItem.createMany({
      data: dq.items.map((it, idx) => ({
        tenantId, invoiceId: inv.id, productId: null,
        productSnapshot: { name: it.description, direct: true },
        quantity: it.quantity, unitPriceHtg: it.unitPriceHtg, unitPriceUsd: it.unitPriceUsd,
        discountPct: 0, totalHtg: it.totalHtg, totalUsd: it.totalUsd, sortOrder: idx,
      }))
    });

    await tx.directQuote.update({
      where: { id }, data: { status: 'converted', convertedToInvoiceId: inv.id, convertedAt: new Date() }
    });

    return inv;
  });

  return invoice;
};

// ── Jenere lyen piblik (dirèk, san kòd — menm mekanis ak Quote)
const generatePublicLink = async (tenantId, id, userRole) => {
  const dq = await prisma.directQuote.findFirst({ where: { id, tenantId } });
  if (!dq) throw Object.assign(new Error('Devi Dirèk pa jwenn.'), { statusCode: 404 });
  if (dq.status === 'cancelled') throw Object.assign(new Error('Pa ka pataje yon Devi Dirèk anile.'), { statusCode: 400 });
  // ✅ NOUVO — Aksyon sa a bloke pou kesye jiskaske yon admin otorize devi a
  if (userRole !== 'admin' && !dq.authorizedBy) {
    throw Object.assign(new Error('Devi sa a poko otorize pa yon admin.'), { statusCode: 403 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const updated = await prisma.directQuote.update({
    where: { id },
    data: { publicToken: token, publicViewedAt: null, publicViewCount: 0 }
  });

  return { token, quoteNumber: updated.quoteNumber };
};

const revokePublicLink = async (tenantId, id) => {
  const dq = await prisma.directQuote.findFirst({ where: { id, tenantId } });
  if (!dq) throw Object.assign(new Error('Devi Dirèk pa jwenn.'), { statusCode: 404 });
  return prisma.directQuote.update({
    where: { id }, data: { publicToken: null, publicViewedAt: null, publicViewCount: 0 }
  });
};

const getByPublicToken = async (token) => {
  if (!token || token.length < 32) throw Object.assign(new Error('Lyen envalid.'), { statusCode: 404 });

  const dq = await prisma.directQuote.findFirst({
    where: { publicToken: token },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true, address: true } },
      items:  { orderBy: { sortOrder: 'asc' } },
      tenant: { select: { id: true, name: true, slug: true, logoUrl: true, bannerUrl: true, address: true, phone: true, email: true, website: true, primaryColor: true } }
    }
  });
  if (!dq || !dq.publicToken) throw Object.assign(new Error('Devi sa pa egziste oswa lyen an pa valid.'), { statusCode: 404 });

  prisma.directQuote.update({
    where: { id: dq.id },
    data: { publicViewCount: { increment: 1 }, publicViewedAt: dq.publicViewedAt || new Date() }
  }).catch(err => console.error('[PublicDirectQuote] Failed to update view count:', err.message));

  return { quote: dq };
};

// ── RAPÒ — total Devi Dirèk yo, TOTALMAN separe de rapò lavant/estòk
const getReport = async (tenantId, { dateFrom, dateTo, branchId } = {}) => {
  const where = {
    tenantId,
    status: { not: 'cancelled' },
    ...(branchId && { branchId }),
    ...(dateFrom && dateTo && {
      issueDate: {
        gte: new Date(`${dateFrom}T05:00:00.000Z`),
        lte: new Date(new Date(`${dateTo}T05:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    }),
  };

  const [totals, byStatus, list] = await Promise.all([
    prisma.directQuote.aggregate({ where, _sum: { totalHtg: true, totalUsd: true }, _count: true }),
    prisma.directQuote.groupBy({ by: ['status'], where: { tenantId, ...(branchId && { branchId }) }, _sum: { totalHtg: true }, _count: true }),
    prisma.directQuote.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 50,
      include: { client: { select: { name: true } }, creator: { select: { fullName: true } } }
    })
  ]);

  return { totals, byStatus, list };
};

module.exports = {
  getAll, getOne, create, update, send, cancel, convertToInvoice, authorize,
  generatePublicLink, revokePublicLink, getByPublicToken, getReport,
};
