// src/hooks/useNetworkStatus.js
import { useState, useEffect, useRef, useCallback } from 'react'

// ✅ URL rasin API a (san /api/v1) pou verifye /health
const API_ROOT = 'https://plusgroup-backend.onrender.com'

/**
 * Detekte konèksyon entènèt REYÈL.
 *
 * navigator.onLine sèl PA fyab — li ka di "online" menm si aparèy la
 * konekte ak yon rezo WiFi/done ki PA gen aksè entènèt reyèl. Nou konfime
 * ak yon ti apèl rapid (timeout 5s) bay backend /health.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef(null)

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false)
      return false
    }
    setChecking(true)
    try {
      const controller = new AbortController()
      const timeoutId   = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${API_ROOT}/health`, {
        signal: controller.signal,
        cache:  'no-store',
      })
      clearTimeout(timeoutId)

      const ok = res.ok
      setIsOnline(ok)
      return ok
    } catch (e) {
      setIsOnline(false)
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()

    const handleOnline  = () => checkConnection()
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verifye chak 20 sèk — detekte si entènèt tonbe san evènman klè
    intervalRef.current = setInterval(checkConnection, 20_000)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalRef.current)
    }
  }, [checkConnection])

  return { isOnline, checking, recheck: checkConnection }
}
