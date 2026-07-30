// src/hooks/useBarcodeScanner.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Detèksyon Eskanè Kòd Ba (USB/Bluetooth "HID")
// ══════════════════════════════════════════════════════════════
// Prèske tout eskanè kòd ba pòtatif ("ki flashe") aji tankou yon KLAVYE:
// yo "tape" chak chif kòd la youn apre lòt TRÈ VIT (souvan <30ms ant
// chak lèt — yon moun pa ka tape osi vit), epi yo "peze" Antre (Enter)
// otomatikman lè yo fini. Kidonk pa gen okenn pilòt/API espesyal
// nesesè — nou jis "koute" klavye a nan tout paj la, epi nou detekte
// modèl sa a pou distenge yon eskanè ak yon moun k ap tape nòmalman.
import { useEffect, useRef } from 'react'

const MAX_INTERVAL_MS = 40   // si 2 tèks rive pi vit pase sa, se pwobableman yon eskanè
const MIN_CODE_LENGTH = 3    // ka rive yon kòd kout (egzanp kòd entèn)

/**
 * @param {(code: string) => void} onScan - rele ak kòd konplè a lè yon eskanè detekte
 * @param {{ enabled?: boolean, ignoreWhenTyping?: boolean }} options
 *   - enabled: aktive/dezaktive detèksyon an (default true)
 *   - ignoreWhenTyping: si true (default), inyore detèksyon lè fokis la deja
 *     sou yon <input>/<textarea> pou pa "kraze" sezi manyèl nòmal moun ap fè
 */
export function useBarcodeScanner(onScan, { enabled = true, ignoreWhenTyping = true } = {}) {
  const bufferRef    = useRef('')
  const lastTimeRef   = useRef(0)
  const onScanRef     = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return

    const reset = () => { bufferRef.current = '' }

    const handleKeyDown = (e) => {
      // Pa entèfere ak chan tèks nòmal (fòm, rechèch, elatriye) si opsyon an aktive
      const tag = e.target?.tagName
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
      if (ignoreWhenTyping && isEditable) return

      const now = performance.now()
      const elapsed = now - lastTimeRef.current
      lastTimeRef.current = now

      // Si gen twòp tan ki pase depi dènye tèks la, se yon nouvo sekans
      if (elapsed > MAX_INTERVAL_MS && bufferRef.current.length > 0) {
        reset()
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        reset()
        if (code.length >= MIN_CODE_LENGTH) {
          e.preventDefault()
          onScanRef.current?.(code)
        }
        return
      }

      // Sèlman aksepte karaktè yon kòd ba nòmal (chif, lèt, tirè)
      if (e.key.length === 1 && /[a-zA-Z0-9\-_.]/.test(e.key)) {
        bufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [enabled, ignoreWhenTyping])
}
