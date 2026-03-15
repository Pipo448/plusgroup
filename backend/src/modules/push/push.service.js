// backend/src/services/push.service.js
const webpush = require('web-push')

// ✅ VAPID keys — mete nan .env ou a
// VAPID_PUBLIC_KEY  = kle piblik la
// VAPID_PRIVATE_KEY = kle prive a
// VAPID_EMAIL       = mailto:ou@email.com

webpush.setVapidDetails(
  process.env.VAPID_EMAIL       || 'mailto:admin@plusgroupe.com',
  process.env.VAPID_PUBLIC_KEY  || 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU',
  process.env.VAPID_PRIVATE_KEY || 'HSdko7FKgd6KMUdAq49UR1QvCOLKxeHqcSkTap7ul50'
)

const prisma = require('../config/prisma')

// ── Sove subscription ─────────────────────────────────────────
async function saveSubscription(tenantId, userId, subscription) {
  if (!subscription?.endpoint) throw new Error('Subscription invalide')

  // Upsert — pa kreye duplikay si endpoint la egziste deja
  await prisma.pushSubscription.upsert({
    where:  { endpoint: subscription.endpoint },
    update: {
      p256dh:  subscription.keys?.p256dh  || '',
      auth:    subscription.keys?.auth    || '',
      userId:  userId  || null,
      tenantId,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      userId:   userId || null,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys?.p256dh  || '',
      auth:     subscription.keys?.auth    || '',
    }
  })
}

// ── Efase subscription ────────────────────────────────────────
async function removeSubscription(endpoint) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } })
}

// ── Voye push ba yon sèl abòne ────────────────────────────────
async function sendToOne(sub, payload) {
  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth }
  }
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload))
    return true
  } catch (err) {
    // 410 = subscription ekspire — retire l
    if (err.statusCode === 410 || err.statusCode === 404) {
      await removeSubscription(sub.endpoint).catch(() => {})
    }
    return false
  }
}

// ── Voye push ba tout abòne yon tenant ───────────────────────
async function sendToTenant(tenantId, payload, options = {}) {
  const { roleFilter, userIdFilter } = options

  const where = { tenantId }

  // ✅ Opsyonèl — sèlman admin, oswa yon itilizatè espesifik
  if (userIdFilter) {
    where.userId = userIdFilter
  } else if (roleFilter) {
    where.user = { role: { in: Array.isArray(roleFilter) ? roleFilter : [roleFilter] } }
  }

  const subs = await prisma.pushSubscription.findMany({ where })
  if (!subs.length) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(subs.map(s => sendToOne(s, payload)))
  const sent   = results.filter(r => r.status === 'fulfilled' && r.value).length
  const failed = results.length - sent
  return { sent, failed }
}

// ── Raccourci — voye notifikasyon tipik ──────────────────────
async function notify(tenantId, { title, body, icon, tag, url, data, roleFilter, userIdFilter, requireInteraction = false }) {
  const payload = {
    title: title || 'PlusGroup',
    body:  body  || '',
    icon:  icon  || '/logo.png',
    badge: '/logo.png',
    tag:   tag   || 'plusgroup',
    requireInteraction,
    data:  { url: url || '/app', ...data },
  }
  return sendToTenant(tenantId, payload, { roleFilter, userIdFilter })
}

module.exports = { saveSubscription, removeSubscription, sendToTenant, notify }