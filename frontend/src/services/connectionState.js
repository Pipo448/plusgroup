// src/services/connectionState.js
// ══════════════════════════════════════════════════════════════
// Eta konèksyon PATAJE ant useNetworkStatus.js (ki fè verifikasyon
// reyèl la) ak api.js (ki bezwen konnen rezilta a pou pa montre
// toast "Erè koneksyon" san rezon lè nou deja konnen n offline).
//
// navigator.onLine PA fyab (li ka di "online" menm san vrè aksè
// entènèt) — se poutèt sa nou itilize yon eta pataje ki soti nan
// verifikasyon REYÈL (apèl /health) olye navigator.onLine sèl.
// ══════════════════════════════════════════════════════════════

let isOnline = navigator.onLine
const listeners = new Set()

export function setConnectionState(online) {
  if (isOnline === online) return
  isOnline = online
  listeners.forEach(cb => { try { cb(isOnline) } catch (e) { /* ignore */ } })
}

export function getConnectionState() {
  return isOnline
}

export function onConnectionChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
