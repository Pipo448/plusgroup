// src/hooks/useBarcodeScanner.js
import { useEffect, useRef } from 'react'

// ✅ Skanè kòd ba FIZIK (USB / Bluetooth) — li fonksyone tankou yon klavye: li tape kòd la
// trè vit (< 50ms pa karaktè) epi li fini ak Enter. Pa gen okenn chan pou fokis.
// Kamera telefòn: gade components/BarcodeCameraModal.jsx

// Ti bip + vibrasyon pou kesye a konnen kòd la li
export function scanFeedback(ok = true) {
  try { navigator.vibrate?.(ok ? 60 : [60, 40, 60]) } catch { /* pa grav */ }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'square'; o.frequency.value = ok ? 1100 : 300
    g.gain.value = 0.05
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + (ok ? 0.08 : 0.22))
    setTimeout(() => ctx.close?.(), 400)
  } catch { /* pa grav */ }
}

// Retire kòd la ki te tape nan chan ki gen fokis la (pou li pa rete nan rechèch/kantite)
function clearTypedCode(code) {
  const el = document.activeElement
  if (!el || !(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
  try {
    const val = String(el.value ?? '')
    if (!val.endsWith(code)) return
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
    if (!setter) return
    setter.call(el, val.slice(0, val.length - code.length))
    el.dispatchEvent(new Event('input', { bubbles: true }))   // React wè chanjman an
  } catch { /* pa grav */ }
}

export function useBarcodeScanner(onScan, enabled = true) {
  const cb = useRef(onScan)
  cb.current = onScan
  useEffect(() => {
    if (!enabled) return
    let buf = '', last = 0, fast = 0
    const reset = () => { buf = ''; fast = 0 }
    const h = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const now = performance.now()
      if (e.key === 'Enter') {
        if (buf.length >= 4 && fast >= buf.length - 1) {
          e.preventDefault(); e.stopPropagation()
          const code = buf; reset()
          clearTypedCode(code)
          scanFeedback(true)
          cb.current(code)
        } else reset()
        return
      }
      if (e.key.length !== 1) return
      if (now - last > 50) { buf = ''; fast = 0 } else fast++
      buf += e.key; last = now
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [enabled])
}

// Chèche yon pwodwi pa kòd ba (oswa kòd pwodwi) — match egzak. Offline → cache lokal.
export async function lookupProduct(code, { productAPI, online = true, searchCached } = {}) {
  const c = String(code).trim()
  const match = (list) => (list || []).find(p => p.barcode === c || p.code === c) || null
  if (online && productAPI) {
    try {
      const r = await productAPI.getAll({ search: c, limit: 10 })
      return match(r.data?.products)
    } catch { /* tonbe sou cache */ }
  }
  if (searchCached) {
    try { return match(await searchCached(c, 10)) } catch { /* pa grav */ }
  }
  return null
}

export default useBarcodeScanner
