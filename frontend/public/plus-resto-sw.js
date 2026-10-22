// plus-resto-sw.js — Service worker app Plus Resto (scope: /resto)
// Estrateji: rezo an premye pou paj yo (toujou ajou), ak yon kopi pou lè pa gen
// entènèt. Li PA kach API yo (kòmand, pri) — sa toujou soti dirèkteman nan sèvè a.
const CACHE = 'plus-resto-v1'
const SHELL = ['/resto', '/plus-resto-192.png', '/plus-resto-512.png', '/plus-resto.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('plus-resto-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api')) return // done yo toujou soti nan rezo a

  // Navigasyon (/resto, /resto/:slug): rezo an premye, kopi si pa gen rezo
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put('/resto', copy)).catch(() => {})
        return res
      }).catch(() => caches.match('/resto').then((r) => r || Response.error())),
    )
    return
  }
  // Fichye JS/CSS/imaj build la (non yo gen hash): kach an premye
  if (/\.(js|css|png|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}) }
        return res
      })),
    )
  }
})
