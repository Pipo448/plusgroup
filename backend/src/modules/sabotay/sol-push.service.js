// backend/src/modules/sabotay/sol-push.service.js
// ✅ Push notifications pou manm Sol yo

const webpush = require('web-push')
const prisma  = require('../../config/prisma')

webpush.setVapidDetails(
  process.env.VAPID_EMAIL       || 'mailto:admin@plusgroupe.com',
  process.env.VAPID_PUBLIC_KEY  || 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU',
  process.env.VAPID_PRIVATE_KEY || 'HSdko7FKgd6KMUdAq49UR1QvCOLKxeHqcSkTap7ul50'
)

// ── Sove subscription manm Sol ────────────────────────────────
async function saveSolSubscription(tenantId, accountId, memberId, subscription) {
  if (!subscription?.endpoint) throw new Error('Subscription invalide')

  await prisma.solPushSubscription.upsert({
    where:  { endpoint: subscription.endpoint },
    update: {
      p256dh:    subscription.keys?.p256dh || '',
      auth:      subscription.keys?.auth   || '',
      accountId,
      tenantId,
      memberId,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      accountId,
      memberId,
      endpoint:  subscription.endpoint,
      p256dh:    subscription.keys?.p256dh || '',
      auth:      subscription.keys?.auth   || '',
    }
  })
}

// ── Efase subscription ────────────────────────────────────────
async function removeSolSubscription(endpoint) {
  await prisma.solPushSubscription.deleteMany({ where: { endpoint } })
}

// ── Voye push ba yon sèl abòne Sol ───────────────────────────
async function sendToOneSol(sub, payload) {
  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth }
  }
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload))
    return true
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await removeSolSubscription(sub.endpoint).catch(() => {})
    }
    return false
  }
}

// ── Voye push ba yon manm espesifik ──────────────────────────
async function sendToSolMember(memberId, payload) {
  const subs = await prisma.solPushSubscription.findMany({
    where: { memberId }
  })
  if (!subs.length) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(subs.map(s => sendToOneSol(s, payload)))
  const sent    = results.filter(r => r.status === 'fulfilled' && r.value).length
  return { sent, failed: results.length - sent }
}

// ── Voye push ba plizyè manm ──────────────────────────────────
async function sendToSolMembers(memberIds, payload) {
  if (!memberIds.length) return { sent: 0, failed: 0 }

  const subs = await prisma.solPushSubscription.findMany({
    where: { memberId: { in: memberIds } }
  })
  if (!subs.length) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(subs.map(s => sendToOneSol(s, payload)))
  const sent    = results.filter(r => r.status === 'fulfilled' && r.value).length
  return { sent, failed: results.length - sent }
}

module.exports = {
  saveSolSubscription,
  removeSolSubscription,
  sendToSolMember,
  sendToSolMembers,
}
