// src/services/offlineSync.js
import { invoiceAPI } from './api'
import {
  getPendingSales,
  removePendingSale,
  updatePendingSale,
  countPendingSales,
} from './offlineDb'

let syncing = false
const listeners = new Set()

/**
 * Abòne yon fonksyon pou tande evènman senkwonizasyon.
 * Retounen yon fonksyon pou "unsubscribe".
 */
export function onSyncEvent(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emit(event) {
  listeners.forEach(cb => { try { cb(event) } catch (e) { /* ignore */ } })
}

/**
 * Voye tout vant ki nan file datant lan bay backend, YONN PA YONN
 * (pa an menm tan) pou pwoteje lòd ak koyerans estòk la.
 */
export async function syncPendingSales() {
  if (syncing) return { synced: 0, failed: 0 }
  syncing = true
  let synced = 0, failed = 0

  try {
    const pending = await getPendingSales()
    if (pending.length === 0) return { synced: 0, failed: 0 }

    emit({ type: 'sync-start', total: pending.length })

    for (const sale of pending) {
      try {
        await updatePendingSale(sale.localId, { status: 'syncing' })

        const res = await invoiceAPI.createDirect({
          ...sale.payload,
          // Pèmèt estòk vin negatif si 2 aparèy te vann menm dènye pwodwi a
          // pandan yo tou de te offline — machandiz la deja soti fizikman.
          allowNegativeStock: true,
        })

        await removePendingSale(sale.localId)
        synced++
        emit({ type: 'sale-synced', localId: sale.localId, invoice: res.data.invoice })

      } catch (err) {
        failed++
        await updatePendingSale(sale.localId, {
          status:    'failed',
          retries:   (sale.retries || 0) + 1,
          lastError: err.response?.data?.message || err.message,
        })
        emit({ type: 'sale-failed', localId: sale.localId, error: err.message })
      }
    }
  } finally {
    syncing = false
    emit({ type: 'sync-end', synced, failed })
  }

  return { synced, failed }
}

export function isSyncing() {
  return syncing
}

export { countPendingSales }
