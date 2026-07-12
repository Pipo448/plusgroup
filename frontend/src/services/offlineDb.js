// src/services/offlineDb.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Baz done lokal (IndexedDB) pou mòd Offline
// Sèvi pou: (1) cache pwodwi/kliyan pou rechèch san entènèt,
//           (2) file datant vant ki fèt pandan pa gen entènèt.
// PA bezwen okenn depandans ekstèn — API IndexedDB natif navigatè a.
// ══════════════════════════════════════════════════════════════

const DB_NAME    = 'plusgroup_offline'
const DB_VERSION = 1

const STORES = {
  PRODUCTS:      'products_cache',
  CLIENTS:       'clients_cache',
  PENDING_SALES: 'pending_sales',
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.CLIENTS)) {
        db.createObjectStore(STORES.CLIENTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.PENDING_SALES)) {
        db.createObjectStore(STORES.PENDING_SALES, { keyPath: 'localId' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function withStore(storeName, mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const out   = fn(store)
    tx.oncomplete = () => resolve(out)
    tx.onerror     = () => reject(tx.error)
  }))
}

function getAllFromStore(storeName) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req   = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror   = () => reject(req.error)
  }))
}

// ══════════════════════════════════════════════════════════════
// PWODWI — Cache pou rechèch offline
// ══════════════════════════════════════════════════════════════

export async function cacheProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return
  await withStore(STORES.PRODUCTS, 'readwrite', (store) => {
    products.forEach(p => store.put(p))
  })
}

export function getAllCachedProducts() {
  return getAllFromStore(STORES.PRODUCTS)
}

export async function searchCachedProducts(query, limit = 8) {
  const all = await getAllCachedProducts()
  const q = (query || '').toLowerCase().trim()
  if (!q) return all.slice(0, limit)
  return all
    .filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q)
    )
    .slice(0, limit)
}

// ✅ Ajiste kantite estòk lokal apre yon vant offline (pou rechèch pwochen an
// montre bon kantite ki rete, san bezwen re-kontakte backend)
export async function adjustCachedProductStock(productId, qtyDelta) {
  if (!productId) return
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORES.PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORES.PRODUCTS)
    const req   = store.get(productId)
    req.onsuccess = () => {
      const product = req.result
      if (product) {
        product.quantity = Number(product.quantity || 0) + qtyDelta
        store.put(product)
      }
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

// ══════════════════════════════════════════════════════════════
// KLIYAN — Cache pou rechèch offline
// ══════════════════════════════════════════════════════════════

export async function cacheClients(clients) {
  if (!Array.isArray(clients) || clients.length === 0) return
  await withStore(STORES.CLIENTS, 'readwrite', (store) => {
    clients.forEach(c => store.put(c))
  })
}

export function getAllCachedClients() {
  return getAllFromStore(STORES.CLIENTS)
}

export async function searchCachedClients(query, limit = 8) {
  const all = await getAllCachedClients()
  const q = (query || '').toLowerCase().trim()
  if (!q) return all.slice(0, limit)
  return all
    .filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
    .slice(0, limit)
}

// ══════════════════════════════════════════════════════════════
// VANT AN ATANT (Pending Sales) — File Datant Offline
// ══════════════════════════════════════════════════════════════

export async function queueSale(payload) {
  const localId = 'offline-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  const record = {
    localId,
    payload,
    createdAt: new Date().toISOString(),
    status:    'pending',   // pending | syncing | failed
    retries:   0,
    lastError: null,
  }
  await withStore(STORES.PENDING_SALES, 'readwrite', (store) => {
    store.put(record)
  })
  return record
}

export async function getPendingSales() {
  const all = await getAllFromStore(STORES.PENDING_SALES)
  return all.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function countPendingSales() {
  const all = await getPendingSales()
  return all.length
}

export async function removePendingSale(localId) {
  await withStore(STORES.PENDING_SALES, 'readwrite', (store) => {
    store.delete(localId)
  })
}

export async function updatePendingSale(localId, changes) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORES.PENDING_SALES, 'readwrite')
    const store = tx.objectStore(STORES.PENDING_SALES)
    const req   = store.get(localId)
    req.onsuccess = () => {
      const record = req.result
      if (record) {
        Object.assign(record, changes)
        store.put(record)
      }
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}
