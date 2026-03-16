self.addEventListener('push', function(event) {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Sol PlusGroup', {
      body:  data.body  || '',
      icon:  data.icon  || '/logo.png',
      badge: data.badge || '/logo.png',
      tag:   data.tag   || 'sol-notification',
      requireInteraction: data.requireInteraction || false,
      data:  data.data  || {},
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/app/sol/dashboard')
  )
})