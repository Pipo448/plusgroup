// src/pages/restaurant/restoApi.js
// Tout apèl API modil Restoran an. Li itilize menm instans axios app la
// (services/api) pou otantifikasyon ak tenant an rete menm jan.
import api from '../../services/api'

const data = (p) => p.then((r) => r.data)

// ── STAFF ─────────────────────────────────────────────────────────────
export const restoApi = {
  summary: () => data(api.get('/restaurant/summary')),
  dashboard: () => data(api.get('/restaurant/dashboard')),
  prefs: () => data(api.get('/restaurant/prefs')).then((d) => d.prefs),
  setPrefs: (dashboardMode) => data(api.put('/restaurant/prefs', { dashboardMode })).then((d) => d.prefs),
  // Anrejistre yon vant (idanpotan: menm source+refId pa janm konte 2 fwa)
  recordSale: (payload) => data(api.post('/restaurant/sales', payload)),
  salesReport: (params) => data(api.get('/restaurant/sales/report', { params })),

  menu: (params) => data(api.get('/restaurant/menu', { params })),
  createItem: (payload) => data(api.post('/restaurant/menu', payload)),
  updateItem: (id, payload) => data(api.put(`/restaurant/menu/${id}`, payload)),
  deleteItem: (id) => data(api.delete(`/restaurant/menu/${id}`)),

  categories: () => data(api.get('/restaurant/menu/categories')).then((d) => d.categories || []),
  createCategory: (payload) => data(api.post('/restaurant/menu/categories', payload)),
  updateCategory: (id, payload) => data(api.put(`/restaurant/menu/categories/${id}`, payload)),
  deleteCategory: (id) => data(api.delete(`/restaurant/menu/categories/${id}`)),

  portalSettings: () => data(api.get('/restaurant/portal/settings')),
  savePortalSettings: (payload) => data(api.put('/restaurant/portal/settings', payload)),
  // Flyer meni (imaj)
  flyers: () => data(api.get('/restaurant/flyers')),
  addFlyer: (payload) => data(api.post('/restaurant/flyers', payload)),
  updateFlyer: (id, body) => data(api.patch(`/restaurant/flyers/${encodeURIComponent(id)}`, body)),
  deleteFlyer: (id) => data(api.delete(`/restaurant/flyers/${encodeURIComponent(id)}`)),
  // Imaj la pou staff la (ak token) → Blob
  flyerBlob: (id, v) => api.get(`/restaurant/flyers/${encodeURIComponent(id)}/image`, { params: { v }, responseType: 'blob' }).then((r) => r.data),

  onlineOrders: (params) => data(api.get('/restaurant/online-orders', { params })).then((d) => d.orders || []),
  newOrdersCount: () => data(api.get('/restaurant/online-orders/count')).then((d) => d.count || 0),
  setOrderStatus: (id, status) => data(api.patch(`/restaurant/online-orders/${id}/status`, { status })),
  linkOrderInvoice: (id, invoiceId) => data(api.patch(`/restaurant/online-orders/${id}/invoice`, { invoiceId })),

  reservations: (params) => data(api.get('/restaurant/reservations', { params })).then((d) => d.reservations || []),
  createReservation: (payload) => data(api.post('/restaurant/reservations', payload)),
  updateReservation: (id, payload) => data(api.patch(`/restaurant/reservations/${id}`, payload)),
}

// ── PIBLIK (pòtal kliyan) ─────────────────────────────────────────────
const enc = encodeURIComponent
export const publicApi = {
  portal: (slug) => data(api.get(`/public/resto/${enc(slug)}`)),
  availability: (slug, date) => data(api.get(`/public/resto/${enc(slug)}/reservations/availability`, { params: { date } })),
  createOrder: (slug, payload) => data(api.post(`/public/resto/${enc(slug)}/orders`, payload)).then((d) => d.order),
  trackOrder: (slug, code, phone) => data(api.get(`/public/resto/${enc(slug)}/orders/${enc(code)}`, { params: { phone } })).then((d) => d.order),
  createReservation: (slug, payload) => data(api.post(`/public/resto/${enc(slug)}/reservations`, payload)).then((d) => d.reservation),
  imageUrl: (slug, id, v) => `${apiBase()}/public/resto/${enc(slug)}/image/${enc(id)}${v ? `?v=${v}` : ''}`,
  logoUrl: (slug) => `${apiBase()}/public/resto/${enc(slug)}/logo`,
  // Anyè Plus Resto: restoran ki toupre (lat/lng opsyonèl), chèch, vil, filtè
  directory: (params) => data(api.get('/public/resto', { params })),
  flyerUrl: (slug, id, v) => `${apiBase()}/public/resto/${enc(slug)}/flyer/${enc(id)}${v ? `?v=${v}` : ''}`,
}

function apiBase() {
  return String(api.defaults?.baseURL || '/api').replace(/\/+$/, '')
}

// Kòd erè backend lan (PORTAL_NOT_FOUND, SLOT_FULL...) → kle tradiksyon
export const errorCode = (e) => e?.response?.data?.code || (e?.response?.status === 429 ? 'TOO_MANY' : 'generic')
export const errorMessage = (e) => e?.response?.data?.message

// ── Chemen paj yo nan app la (chanje prefiks la si wout ou yo diferan) ──
export const RESTO_BASE = '/app/restaurant'
export const RESTO_PATHS = {
  menu: `${RESTO_BASE}/menu`,
  tables: `${RESTO_BASE}/tables`,
  orders: `${RESTO_BASE}/orders`,
  reservations: `${RESTO_BASE}/reservations`,
  portal: `${RESTO_BASE}/portal`,
  dashboard: `${RESTO_BASE}/dashboard`,
  report: `${RESTO_BASE}/report`,
}
// Lyen piblik pòtal kliyan an
// Nan APK la (Capacitor) origin nan se localhost — lyen pou pataje a dwe toujou app.plusgroupe.com
export const PUBLIC_ORIGIN = /localhost|capacitor:|ionic:/.test(window.location.origin) ? 'https://app.plusgroupe.com' : window.location.origin
export const portalUrl = (slug) => `${PUBLIC_ORIGIN}/resto/${slug}`
export const directoryUrl = () => `${PUBLIC_ORIGIN}/resto`
export const rateOrder = (slug, code, payload) => data(api.post(`/public/resto/${encodeURIComponent(slug)}/orders/${encodeURIComponent(code)}/rating`, payload))
// Lyen swivi kòmand pou voye bay kliyan an (WhatsApp)
export const trackUrl = (slug, code, last4) => `${PUBLIC_ORIGIN}/resto/${slug}?v=track&code=${encodeURIComponent(code)}&p=${last4}`
// Nimewo WhatsApp (ajoute 509 si se 8 chif ayisyen)
export const waNumber = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length === 8 ? `509${d}` : d }
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`