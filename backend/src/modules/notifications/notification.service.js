// src/modules/notifications/notification.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// MACHE TOUT kòm li
async function markAllAsRead({ tenantId, userId }) {
  return prisma.notification.updateMany({
    where: { tenantId, isRead: false, OR: [{ userId }, { userId: null }] },
    data: { isRead: true, readAt: new Date() },
  });
}

// EFASE yon notifikasyon
async function deleteNotification({ id, tenantId, userId }) {
  const notif = await prisma.notification.findFirst({
    where: { id, tenantId, OR: [{ userId }, { userId: null }] },
  });
  if (!notif) throw new Error('Notifikasyon pa jwenn');
  return prisma.notification.delete({ where: { id } });
}

// KONTE pa li ankò
async function getUnreadCount({ tenantId, userId }) {
  return prisma.notification.count({
    where: { tenantId, isRead: false, OR: [{ userId }, { userId: null }] },
  });
}

// ─────────────────────────────────────────────
// HELPERS — kreye notif otomatik
// ─────────────────────────────────────────────
async function notifyNewInvoice({ tenantId, invoiceNumber, clientName, totalHtg }) {
  return createNotification({
    tenantId, type: 'invoice_created',
    titleHt: `Nouvo Fakti #${invoiceNumber}`,
    titleFr: `Nouvelle Facture #${invoiceNumber}`,
    titleEn: `New Invoice #${invoiceNumber}`,
    messageHt: `Fakti pou ${clientName} — ${Number(totalHtg).toLocaleString('fr-HT')} HTG`,
    messageFr: `Facture pour ${clientName} — ${Number(totalHtg).toLocaleString('fr-HT')} HTG`,
    messageEn: `Invoice for ${clientName} — ${Number(totalHtg).toLocaleString('fr-HT')} HTG`,
    entityType: 'invoice',
  });
}

async function notifyInvoicePaid({ tenantId, invoiceNumber, clientName }) {
  return createNotification({
    tenantId, type: 'invoice_paid',
    titleHt: `Fakti #${invoiceNumber} Peye ✅`,
    titleFr: `Facture #${invoiceNumber} Payée ✅`,
    titleEn: `Invoice #${invoiceNumber} Paid ✅`,
    messageHt: `${clientName} fin peye fakti a nèt`,
    messageFr: `${clientName} a réglé la facture`,
    messageEn: `${clientName} fully paid the invoice`,
    entityType: 'invoice',
  });
}

async function notifyLowStock({ tenantId, productName, currentQty, threshold }) {
  return createNotification({
    tenantId, type: 'low_stock',
    titleHt: `Stock Ba ⚠️ — ${productName}`,
    titleFr: `Stock Faible ⚠️ — ${productName}`,
    titleEn: `Low Stock ⚠️ — ${productName}`,
    messageHt: `Rès: ${currentQty} (limit: ${threshold})`,
    messageFr: `Restant: ${currentQty} (seuil: ${threshold})`,
    messageEn: `Remaining: ${currentQty} (threshold: ${threshold})`,
    entityType: 'product',
  });
}

async function notifyPaymentReceived({ tenantId, invoiceNumber, amountHtg, method }) {
  const labels = { cash: 'Kach', moncash: 'MonCash', natcash: 'NatCash', card: 'Kat', transfer: 'Transfè', check: 'Chèk', other: 'Lòt' };
  return createNotification({
    tenantId, type: 'payment_received',
    titleHt: `Pèman Resevwa 💰`,
    titleFr: `Paiement Reçu 💰`,
    titleEn: `Payment Received 💰`,
    messageHt: `Fakti #${invoiceNumber} — ${Number(amountHtg).toLocaleString('fr-HT')} HTG via ${labels[method] || method}`,
    messageFr: `Facture #${invoiceNumber} — ${Number(amountHtg).toLocaleString('fr-HT')} HTG via ${labels[method] || method}`,
    messageEn: `Invoice #${invoiceNumber} — ${Number(amountHtg).toLocaleString('fr-HT')} HTG via ${method}`,
    entityType: 'payment',
  });
}

module.exports = {
  createNotification, getNotifications, markAsRead, markAllAsRead,
  deleteNotification, getUnreadCount,
  notifyNewInvoice, notifyInvoicePaid, notifyLowStock, notifyPaymentReceived,
};
