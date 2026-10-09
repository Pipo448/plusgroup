// src/hooks/useRestoreLastRoute.js
// ─────────────────────────────────────────────────────────────
// ✅ APK (Capacitor): lè Android fèmen WebView la pandan w nan yon lòt app,
// app la te rekòmanse sou "/" → tableau de bò. Sa a sonje dènye paj /app/...
// ou te ye a, epi RootRedirect (App.jsx) remete w ladan l.
// ─────────────────────────────────────────────────────────────
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const KEY    = 'pg-last-route'
const MAX_MS = 12 * 60 * 60 * 1000   // 12è — apre sa li kòmanse sou tableau de bò nòmalman

const isRestorable = (path) =>
  typeof path === 'string' && path.startsWith('/app/') && !path.startsWith('/app/sol/')

// Konpozan envizib — mete l YON FWA andedan <BrowserRouter>
export function RouteMemory() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (!isRestorable(pathname)) return
    try { localStorage.setItem(KEY, JSON.stringify({ path: pathname + search, t: Date.now() })) } catch { /* */ }
  }, [pathname, search])
  return null
}

// Dènye paj valab la (oswa null)
export function getLastRoute() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!v || !isRestorable(v.path) || Date.now() - v.t > MAX_MS) return null
    return v.path
  } catch { return null }
}

export const clearLastRoute = () => { try { localStorage.removeItem(KEY) } catch { /* */ } }