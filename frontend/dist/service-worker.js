// public/service-worker.js
// ✅ Service Worker — resevwa Push Notifications menm si app la fèmen

const APP_NAME = 'PlusGroup'

// ── Resevwa push evènman ──────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try { data = event.data.json() }
  catch { data = { title: APP_NAME, body: event.data.text() } }

  const title   = data.title || APP_NAME
  const options = {
    body:    data.body    || '',
    icon:    data.icon    || '/logo.png',
    badge:   data.badge   || '/logo.png',
    tag:     data.tag     || 'plusgroup-notif',
    data:    data.data    || {},
    vibrate: [200, 100, 200],   // ✅ vibrasyon pou Android
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── Klike sou notifikasyon — ouvri app la ────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si app la deja ouvè — fè li vin devan
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (url !== '/') client.navigate(url)
          return
        }
      }
      // Sinon ouvri yon nouvo fenèt
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Fèmen notifikasyon ────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // Kapab trakè analytics isit si nesesè
})

// ── Aktive service worker imedyatman ─────────────────────────
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
