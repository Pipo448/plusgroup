// src/modules/notifications/notification.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Enpòte push service
const pushSvc = require('../push/push.service');

// ─────────────────────────────────────────────
// ✅ Voye Push bay tout admin yon tenant
// ─────────────────────────────────────────────
async function sendPushToAdmins(tenantId, { title, body, tag, url }) {
  try {
    await pushSvc.notify(tenantId, {
      title,
      body,
      tag:         tag  || 'plusgroup-notif',
      url:         url  || '/app/dashboard',
      roleFilter:  'admin',   // ← sèlman admin yo resevwa push
    })
  } catch (err) {
    // Pa janm kase flux prensipal la si push echwe
    console.warn('[Push] Echwe voye push:', err?.message)
  }
}

// ─────────────────────────────────────────────
// KREYE yon notifikasyon (itilize pa lòt sèvis)
// ─────────────────────────────────────────────
async function createNotification({ tenantId, userId = null, type, titleHt, titleFr, titleEn, messageHt, messageFr, messageEn, entityType = null, entityId = null }) {
  return prisma.notification.create({
    data: { tenantId, userId, type, titleHt, titleFr, titleEn, messageHt, messageFr, messageEn, entityType, entityId },
  });
}

// ─────────────────────────────────────────────
// JWENN tout notifikasyon pou yon tenant/user
// ─────────────────────────────────────────────
async function getNotifications({ tenantId, userId, limit = 20, offset = 0, unreadOnly = false }) {
  const where = {
    tenantId,
    OR: [{ userId: userId }, { userId: null }],
  };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip: Number(offset) }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { tenantId, isRead: false, OR: [{ userId }, { userId: null }] } }),
  ]);

  return { notifications, total, unreadCount };
}

// ─────────────────────────────────────────────
// MACHE yon notifikasyon kòm li
// ─────────────────────────────────────────────
async function markAsRead({ id, tenantId, userId }) {
  const notif = await prisma.notification.findFirst({
    where: { id, tenantId, OR: [{ userId }, { userId: null }] },
  });
  if (!notif) throw new Error('Notifikasyon pa jwenn');
  return prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
}

async function markAllAsRead({ tenantId, userId }) {
  return prisma.notification.updateMany({
    where: { tenantId, isRead: false, OR: [{ userId }, { userId: null }] },
    data: { isRead: true, readAt: new Date() },
  });
}

async function deleteNotification({ id, tenantId, userId }) {
  const notif = await prisma.notification.findFirst({
    where: { id, tenantId, OR: [{ userId }, { userId: null }] },
  });
  if (!notif) throw new Error('Notifikasyon pa jwenn');
  return prisma.notification.delete({ where: { id } });
}

async function getUnreadCount({ tenantId, userId }) {
  return prisma.notification.count({
    where: { tenantId, isRead: false, OR: [{ userId }, { userId: null }] },
  });
}

// ─────────────────────────────────────────────
// HELPERS — kreye notif + voye push bay admin
// ─────────────────────────────────────────────

async function notifyNewInvoice({ tenantId, invoiceNumber, clientName, totalHtg }) {
  const title = `Nouvo Fakti #${invoiceNumber}`
  const body  = `Fakti pou ${clientName} — ${Number(totalHtg).toLocaleString('fr-HT')} HTG`

  // ✅ Kreye notif BD + voye push paralèl
  await Promise.all([
    createNotification({
      tenantId, type: 'invoice_created',
      titleHt: title,
      titleFr: `Nouvelle Facture #${invoiceNumber}`,
      titleEn: `New Invoice #${invoiceNumber}`,
      messageHt: body,
      messageFr: `Facture pour ${clientName} — ${Number(totalHtg).toLocaleString('fr-HT')} HTG`,
      messageEn: `Invoice for ${clientName} — ${Number(totalHtg).toLocaleString('fr-HT')} HTG`,
      entityType: 'invoice',
    }),
    sendPushToAdmins(tenantId, {
      title,
      body,
      tag: 'invoice-new',
      url: '/app/invoices',
    }),
  ])
}

async function notifyInvoicePaid({ tenantId, invoiceNumber, clientName }) {
  const title = `Fakti #${invoiceNumber} Peye ✅`
  const body  = `${clientName} fin peye fakti a nèt`

  await Promise.all([
    createNotification({
      tenantId, type: 'invoice_paid',
      titleHt: title,
      titleFr: `Facture #${invoiceNumber} Payée ✅`,
      titleEn: `Invoice #${invoiceNumber} Paid ✅`,
      messageHt: body,
      messageFr: `${clientName} a réglé la facture`,
      messageEn: `${clientName} fully paid the invoice`,
      entityType: 'invoice',
    }),
    sendPushToAdmins(tenantId, {
      title,
      body,
      tag: 'invoice-paid',
      url: '/app/invoices',
    }),
  ])
}

async function notifyLowStock({ tenantId, productName, currentQty, threshold }) {
  const title = `Stòk Ba ⚠️ — ${productName}`
  const body  = `Rès: ${currentQty} (limit: ${threshold})`

  await Promise.all([
    createNotification({
      tenantId, type: 'low_stock',
      titleHt: title,
      titleFr: `Stock Faible ⚠️ — ${productName}`,
      titleEn: `Low Stock ⚠️ — ${productName}`,
      messageHt: body,
      messageFr: `Restant: ${currentQty} (seuil: ${threshold})`,
      messageEn: `Remaining: ${currentQty} (threshold: ${threshold})`,
      entityType: 'product',
    }),
    sendPushToAdmins(tenantId, {
      title,
      body,
      tag: 'low-stock',
      url: '/app/stock',
    }),
  ])
}

async function notifyPaymentReceived({ tenantId, invoiceNumber, amountHtg, method }) {
  const labels = { cash: 'Kach', moncash: 'MonCash', natcash: 'NatCash', card: 'Kat', transfer: 'Transfè', check: 'Chèk', other: 'Lòt' }
  const title  = `Pèman Resevwa 💰`
  const body   = `Fakti #${invoiceNumber} — ${Number(amountHtg).toLocaleString('fr-HT')} HTG via ${labels[method] || method}`

  await Promise.all([
    createNotification({
      tenantId, type: 'payment_received',
      titleHt: title,
      titleFr: `Paiement Reçu 💰`,
      titleEn: `Payment Received 💰`,
      messageHt: body,
      messageFr: `Facture #${invoiceNumber} — ${Number(amountHtg).toLocaleString('fr-HT')} HTG via ${labels[method] || method}`,
      messageEn: `Invoice #${invoiceNumber} — ${Number(amountHtg).toLocaleString('fr-HT')} HTG via ${method}`,
      entityType: 'payment',
    }),
    sendPushToAdmins(tenantId, {
      title,
      body,
      tag: 'payment-received',
      url: '/app/invoices',
    }),
  ])
}

module.exports = {
  createNotification, getNotifications, markAsRead, markAllAsRead,
  deleteNotification, getUnreadCount,
  notifyNewInvoice, notifyInvoicePaid, notifyLowStock, notifyPaymentReceived,
};
