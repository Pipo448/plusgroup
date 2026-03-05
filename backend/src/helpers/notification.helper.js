// src/helpers/notification.helper.js
// ══════════════════════════════════════════════════════════════════════════════
// Itilize fonksyon sa yo pou kreye notifikasyon otomatik
// nan nenpòt controller ki gen aksyon enpòtan
// ══════════════════════════════════════════════════════════════════════════════
const prisma = require('../config/prisma');

/**
 * Kreye yon notifikasyon pou yon oswa plizyè itilizatè
 * @param {object} opts
 * @param {string}   opts.tenantId
 * @param {string[]} opts.userIds     - [] = voye a tout admin
 * @param {string}   opts.type
 * @param {string}   opts.titleHt
 * @param {string}   opts.titleFr
 * @param {string}   opts.messageHt
 * @param {string}   opts.messageFr
 * @param {object}   [opts.meta]      - done adisyonèl (opsyonèl)
 */
async function createNotification({ tenantId, userIds = [], type, titleHt, titleFr, messageHt, messageFr, meta = {} }) {
  try {
    // Si userIds vid, voye a tout admin tenant an
    let targets = userIds;
    if (!targets.length) {
      const admins = await prisma.user.findMany({
        where: { tenantId, role: 'admin', isActive: true },
        select: { id: true },
      });
      targets = admins.map(a => a.id);
    }
    if (!targets.length) return;

    await prisma.notification.createMany({
      data: targets.map(userId => ({
        tenantId,
        userId,
        type,
        titleHt,
        titleFr:   titleFr   || titleHt,
        titleEn:   titleFr   || titleHt,
        messageHt,
        messageFr: messageFr || messageHt,
        messageEn: messageFr || messageHt,
        meta,
        isRead: false,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    // Notifikasyon pa dwe bloke lòt operasyon
    console.error('[Notification] Echèk kreye notifikasyon:', err.message);
  }
}

// ── STÒK ─────────────────────────────────────────────────────────────────────

/**
 * Notifye admin ak tout anplwaye si stòk yon pwodui tonbe ba
 * Rele sa apre chak vant oswa ajisteman stòk
 */
async function checkAndNotifyLowStock({ tenantId, product }) {
  try {
    if (!product || product.quantity > product.alertThreshold) return;

    const isZero = Number(product.quantity) <= 0;

    // Evite spam — pa renvoye si yon notifikasyon egziste deja nan dènye 2 zè
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: isZero ? 'out_of_stock' : 'low_stock',
        meta: { path: ['productId'], equals: product.id },
        createdAt: { gte: twoHoursAgo },
      },
    });
    if (existing) return; // Deja notifye resamman

    // Jwenn tout itilizatè aktif (admin + kasye + jestyon stòk)
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, role: true },
    });
    // Kasye wè alèt stòk tou — yo ki fè vant
    const targetIds = users.map(u => u.id);

    if (isZero) {
      await createNotification({
        tenantId,
        userIds: targetIds,
        type: 'out_of_stock',
        titleHt: `⚠️ Stòk vid — ${product.name}`,
        titleFr: `⚠️ Rupture de stock — ${product.name}`,
        messageHt: `Pwodui "${product.name}" (${product.code || ''}) pa gen stòk ankò. Fè yon komand touswit.`,
        messageFr: `Le produit "${product.name}" n'a plus de stock. Passez une commande immédiatement.`,
        meta: { productId: product.id, productName: product.name, quantity: product.quantity },
      });
    } else {
      await createNotification({
        tenantId,
        userIds: targetIds,
        type: 'low_stock',
        titleHt: `📉 Stòk ba — ${product.name}`,
        titleFr: `📉 Stock bas — ${product.name}`,
        messageHt: `${product.name} gen sèlman ${Number(product.quantity)} inite ki rete (minimòm: ${product.alertThreshold}).`,
        messageFr: `${product.name} n'a plus que ${Number(product.quantity)} unité(s) (minimum: ${product.alertThreshold}).`,
        meta: { productId: product.id, productName: product.name, quantity: product.quantity, threshold: product.alertThreshold },
      });
    }
  } catch (err) {
    console.error('[Notification] checkAndNotifyLowStock echèk:', err.message);
  }
}

// ── VANT / FAKTI ──────────────────────────────────────────────────────────────

/**
 * Notifye admin lè yon anplwaye fè yon vant
 * Rele sa nan invoice.controller.js apre kreye fakti
 */
async function notifyEmployeeSale({ tenantId, employee, invoice, total, currency = 'HTG' }) {
  await createNotification({
    tenantId,
    userIds: [], // → admin sèlman
    type: 'employee_sale',
    titleHt: `🛒 Vant pa ${employee.fullName}`,
    titleFr: `🛒 Vente par ${employee.fullName}`,
    messageHt: `${employee.fullName} fè yon vant ${Number(total).toLocaleString('fr-HT', {minimumFractionDigits:2})} ${currency}. Fakti #${invoice.invoiceNumber}.`,
    messageFr: `${employee.fullName} a effectué une vente de ${Number(total).toLocaleString('fr-HT', {minimumFractionDigits:2})} ${currency}. Facture #${invoice.invoiceNumber}.`,
    meta: { employeeId: employee.id, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, total },
  });
}

/**
 * Notifye admin lè yon pèman reçu
 */
async function notifyPaymentReceived({ tenantId, employee, invoice, amount, currency = 'HTG' }) {
  await createNotification({
    tenantId,
    userIds: [], // → admin sèlman
    type: 'payment_received',
    titleHt: `💳 Pèman reçu — #${invoice.invoiceNumber}`,
    titleFr: `💳 Paiement reçu — #${invoice.invoiceNumber}`,
    messageHt: `${employee?.fullName || 'Sistèm'} anrejistre yon pèman ${Number(amount).toLocaleString('fr-HT', {minimumFractionDigits:2})} ${currency} pou fakti #${invoice.invoiceNumber}.`,
    messageFr: `${employee?.fullName || 'Système'} a enregistré un paiement de ${Number(amount).toLocaleString('fr-HT', {minimumFractionDigits:2})} ${currency} pour la facture #${invoice.invoiceNumber}.`,
    meta: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amount, employeeId: employee?.id },
  });
}

/**
 * Notifye admin lè yon anplwaye fè yon aksyon enpòtan
 * (kreye kliyan, siprime, chanje pri, etc.)
 */
async function notifyEmployeeAction({ tenantId, employee, action, details, detailsFr }) {
  await createNotification({
    tenantId,
    userIds: [], // → admin sèlman
    type: 'employee_action',
    titleHt: `👤 Aksyon — ${employee.fullName}`,
    titleFr: `👤 Action — ${employee.fullName}`,
    messageHt: `${employee.fullName}: ${details}`,
    messageFr: `${employee.fullName}: ${detailsFr || details}`,
    meta: { employeeId: employee.id, employeeName: employee.fullName, action },
  });
}

module.exports = {
  createNotification,
  checkAndNotifyLowStock,
  notifyEmployeeSale,
  notifyPaymentReceived,
  notifyEmployeeAction,
};
