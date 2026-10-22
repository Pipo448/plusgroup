// src/pages/public/restoPwa.js
// ─── App enstalab « Plus Resto » (PWA) ────────────────────────────────
// Sou paj /resto yo, nou ranplase manifest app jeneral la ak
// /plus-resto.webmanifest (non, ikòn, start_url /resto), nou anrejistre yon
// ti service worker pou /resto/ sèlman, epi nou kenbe evènman
// « beforeinstallprompt » la pou bouton « Enstale app la ».
import { useEffect, useState, useCallback } from 'react'

const MANIFEST = '/plus-resto.webmanifest'
const DISMISS_KEY = 'plusresto-install-dismissed'
let deferred = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

const isStandalone = () => {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
      || /capacitor:|ionic:/.test(window.location.origin)
  } catch { return false }
}

let installed = false
export function setupPlusRestoPwa() {
  if (installed || typeof window === 'undefined') return
  installed = true

  // 1) Manifest Plus Resto (olye manifest app jeneral la)
  let link = document.querySelector('link[rel="manifest"]')
  if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link) }
  if (link.getAttribute('href') !== MANIFEST) link.setAttribute('href', MANIFEST)
  const theme = document.querySelector('meta[name="theme-color"]')
  if (theme) theme.setAttribute('content', '#E8642C')
  let apple = document.querySelector('link[rel="apple-touch-icon"]')
  if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; document.head.appendChild(apple) }
  apple.setAttribute('href', '/plus-resto-192.png')

  // 2) Service worker limite a /resto/ (pa touche rès app la)
  if ('serviceWorker' in navigator && window.isSecureContext && !/capacitor:|ionic:/.test(window.location.origin)) {
    navigator.serviceWorker.register('/plus-resto-sw.js', { scope: '/resto' }).catch(() => { /* pa bloke paj la */ })
  }

  // 3) Bouton « Enstale »
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit() })
  window.addEventListener('appinstalled', () => { deferred = null; try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* */ } emit() })
}

export function usePlusRestoPwa() {
  const [, force] = useState(0)
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false } })
  useEffect(() => {
    setupPlusRestoPwa()
    const fn = () => force((x) => x + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  const install = useCallback(async () => {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* */ }
    deferred = null; force((x) => x + 1)
  }, [])
  const dismiss = useCallback(() => { setDismissed(true); try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* */ } }, [])
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
  const standalone = isStandalone()
  return {
    canInstall: !!deferred && !standalone,
    iosHint: ios && !standalone,
    standalone,
    install,
    dismissed,
    dismiss,
  }
}
