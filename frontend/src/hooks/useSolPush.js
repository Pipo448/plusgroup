// src/hooks/useSolPush.js
// ✅ Hook pou pòtal Sol — mande pèmisyon push + sove subscription

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
const SOL_API_BASE    = '/api/sol'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function useSolPush(token) {
  const [permission,   setPermission]   = useState('Notification' in window ? Notification.permission : 'unsupported')
  const [pushEnabled,  setPushEnabled]  = useState(false)
  const [pushLoading,  setPushLoading]  = useState(false)
  const [swReg,        setSwReg]        = useState(null)

  // ── Anrejistre Service Worker ─────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/service-worker.js')
      .then(async (reg) => {
        setSwReg(reg)
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          setPushEnabled(true)
          setPermission('granted')
        }
      })
      .catch(err => console.warn('[SolPush] SW echwe:', err))
  }, [])

  // ── Aktive push ───────────────────────────────────────────
  const enablePush = useCallback(async () => {
    if (!swReg || pushLoading || !token) return
    setPushLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Voye subscription bay backend Sol
      await fetch(`${SOL_API_BASE}/push/subscribe`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      setPushEnabled(true)

      // Notifikasyon byenveni
      new Notification('Sol — PlusGroup ✅', {
        body:  'Ou ap resevwa avètisman peman kounye a!',
        icon:  '/logo.png',
        badge: '/logo.png',
      })
    } catch (err) {
      console.error('[SolPush] Echwe:', err)
    } finally {
      setPushLoading(false)
    }
  }, [swReg, pushLoading, token])

  // ── Dezaktive push ────────────────────────────────────────
  const disablePush = useCallback(async () => {
    if (!swReg || !token) return
    try {
      const sub = await swReg.pushManager.getSubscription()
      if (sub) {
        await fetch(`${SOL_API_BASE}/push/unsubscribe`, {
          method:  'DELETE',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPushEnabled(false)
    } catch (err) {
      console.error('[SolPush] Dezabònman echwe:', err)
    }
  }, [swReg, token])

  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window

  return {
    pushSupported,
    permission,
    pushEnabled,
    pushLoading,
    enablePush,
    disablePush,
  }
}
