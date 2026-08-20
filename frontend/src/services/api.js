// src/services/api.js
import axios from 'axios'
import toast from 'react-hot-toast'
import { getConnectionState } from './connectionState'

const api = axios.create({
  baseURL: 'https://plusgroup-backend.onrender.com/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  try {
    const token    = localStorage.getItem('plusgroup-token')
    const slug     = localStorage.getItem('plusgroup-slug')
    const branchId = localStorage.getItem('plusgroup-branch-id')

    // ✅ FIX: rekèt /admin/... yo dwe itilize TOKEN ADMIN (pg-admin), pa token tenant la —
    // se de sesyon konplètman apa. San sa, tout rekèt admin echwe ak 401.
    const isAdminRequest = config.url?.startsWith('/admin') && !config.url?.includes('/admin/login')
    if (isAdminRequest) {
      try {
        const adminSession = JSON.parse(localStorage.getItem('pg-admin') || 'null')
        if (adminSession?.token) config.headers.Authorization = `Bearer ${adminSession.token}`
      } catch {}
    } else {
      if (token) config.headers.Authorization = `Bearer ${token}`
    }

    if (!config.headers['X-Tenant-Slug'] && slug) {
      config.headers['X-Tenant-Slug'] = slug
    }
    if (branchId) {
      config.headers['X-Branch-Id'] = branchId
    } else {
      delete config.headers['X-Branch-Id']
    }
  } catch {}
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status
    const url     = err.config?.url || ''
    const isLogin = url.includes('/auth/login') || url.includes('/admin/login')
    // ✅ FIX: yon rekèt /admin/... ki echwe se yon pwoblèm SESYON ADMIN — li pa
    // dwe janm efase done tenant yo ni redirije bay '/login' (tenant).
    const isAdminRequest = url.startsWith('/admin')

    if (isLogin) return Promise.reject(err)

    if (status === 401) {
      if (isAdminRequest) {
        // ✅ Sesyon admin ekspire/envalid — retire SÈLMAN sesyon admin lan,
        // redirije bay login ADMIN lan, pa touche done tenant yo.
        localStorage.removeItem('pg-admin')
        if (!window.location.pathname.startsWith('/admin/login')) {
          window.location.href = '/admin/login'
        }
        return Promise.reject(err)
      }
      ['plusgroup-token','plusgroup-user','plusgroup-tenant','plusgroup-slug','plusgroup-lang',
       'plusgroup-branch-id','plusgroup-branch-name']
        .forEach(k => localStorage.removeItem(k))
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status === 402) {
      toast.error('Abònman ekspire. Kontakte administrasyon.', { id: 'expired' })
      return Promise.reject(err)
    }

    if (status === 403) {
      return Promise.reject(err)
    }

    if (status !== 404) {
      // ✅ NOUVO — Pa montre "Erè koneksyon" si nou DEJA konnen nou offline
      // (banyè "Mòd Offline" deja enfòme itilizatè a — pa bezwen spam ak toast anplis).
      // "isNetworkError" = pa gen okenn repons ditou (koneksyon echwe, timeout, elatriye)
      // ✅ KORIJE — itilize eta pataje (verifikasyon REYÈL /health) olye navigator.onLine
      // sèl, ki pa fyab (li ka di "online" menm san vrè aksè entènèt).
      const isNetworkError = !err.response
      if (isNetworkError && !getConnectionState()) {
        return Promise.reject(err)
      }

      const msg = err.response?.data?.message || 'Erè koneksyon. Verifye entènèt ou.'
      toast.error(msg)
    }

    return Promise.reject(err)
  }
)

export const authAPI = {
  login:          (data) => api.post('/auth/login', data, { headers: { 'X-Tenant-Slug': data.slug } }),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
}

export const tenantAPI = {
  getSettings:       ()     => api.get('/tenant/settings'),
  updateSettings:    (data) => api.put('/tenant/settings', data),
  updateRate:        (rate) => api.patch('/tenant/exchange-rate', { exchangeRate: rate }),
  uploadLogo:        (fd)   => api.post('/tenant/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getSequences:      ()     => api.get('/tenant/sequences'),
  // ✅ KORIJE — te manke nèt; ChangeUserPassword.jsx rele l pou ranpli lis
  // itilizatè yo, sa te fè konpozan an kraze paske fonksyon an te undefined.
  getUsers:          ()     => api.get('/users'),
  changeMyPassword:  (data) => api.post('/users/change-password', data),
  resetUserPassword: (data) => api.post('/users/reset-password', data),
}

export const productAPI = {
  getAll:         (p)        => api.get('/products', { params: p }),
  getLowStock:    ()         => api.get('/products/low-stock'),
  getOne:         (id)       => api.get(`/products/${id}`),
  create:         (data)     => api.post('/products', data),
  update:         (id, data) => api.put(`/products/${id}`, data),
  delete:         (id)       => api.delete(`/products/${id}`),
  import:         (data)     => api.post('/products/import', data),
  getCategories:  ()         => api.get('/products/categories'),
  createCategory: (data)     => api.post('/products/categories', data),
  updateCategory: (id, data) => api.put(`/products/categories/${id}`, data),  // ← AJOUTE
  adjustStock:    (id, data) => api.patch(`/products/${id}/stock`, data),
}

export const clientAPI = {
  getAll:  (p)        => api.get('/clients', { params: p }),
  getOne:  (id)       => api.get(`/clients/${id}`),
  create:  (data)     => api.post('/clients', data),
  update:  (id, data) => api.put(`/clients/${id}`, data),
  delete:  (id)       => api.delete(`/clients/${id}`),
}

export const quoteAPI = {
  getAll:       (p)        => api.get('/quotes', { params: p }),
  getOne:       (id)       => api.get(`/quotes/${id}`),
  create:       (data)     => api.post('/quotes', data),
  update:       (id, data) => api.put(`/quotes/${id}`, data),
  delete:       (id)       => api.delete(`/quotes/${id}`),
  send:         (id)       => api.patch(`/quotes/${id}/send`),
  accept:       (id)       => api.patch(`/quotes/${id}/accept`),
  convert:      (id)       => api.post(`/quotes/${id}/convert`),
  cancel:       (id)       => api.patch(`/quotes/${id}/cancel`),
  // ✅ NOUVO — pataje pwoforma piblik (lyen + kòd akse 4 chif)
  share:        (id)       => api.post(`/quotes/${id}/share`),
  revokeShare:  (id)       => api.delete(`/quotes/${id}/share`),
}

export const invoiceAPI = {
  getAll:       (p)        => api.get('/invoices', { params: p }),
  getOne:       (id)       => api.get(`/invoices/${id}`),
  addPayment:   (id, data) => api.post(`/invoices/${id}/payment`, data),
  cancel:       (id, data) => api.patch(`/invoices/${id}/cancel`, data),
  // ✅ KORIJE — aksepte params pou dateFrom/dateTo
  getDashboard: (p)        => api.get('/invoices/dashboard', { params: p }),
  createDirect: (data)     => api.post('/invoices/direct', data),
}

export const stockAPI = {
  getMovements: (p)    => api.get('/stock/movements', { params: p }),
  addMovement:  (data) => {
    if (data.type === 'purchase') {
      return api.post('/stock/purchase', data)
    }
    return api.post('/stock/adjust', data)
  },
}

export const reportAPI = {
  getSummary: (p) => api.get('/reports/summary', { params: p }),
  getSales:   (p) => api.get('/reports/sales',   { params: p }),
  getStock:   (p) => api.get('/reports/stock',   { params: p }),
  getClients: (p) => api.get('/reports/clients', { params: p }),
  getProfit:  (p) => api.get('/reports/profit',  { params: p }),
}

export const userAPI = {
  getAll:  ()         => api.get('/users'),
  create:  (data)     => api.post('/users', data),
  update:  (id, data) => api.put(`/users/${id}`, data),
  delete:  (id)       => api.delete(`/users/${id}`),
  toggle:  (id)       => api.patch(`/users/${id}/toggle`),
}

export const adminAPI = {
  login:          (data)     => api.post('/admin/login', data),
  getStats:       ()         => api.get('/admin/stats'),
  getTenants:     (p)        => api.get('/admin/tenants', { params: p }),
  getTenant:      (id)       => api.get(`/admin/tenants/${id}`),
  createTenant:   (data)     => api.post('/admin/tenants', data),
  updateTenant:   (id, data) => api.put(`/admin/tenants/${id}`, data),
  toggleTenant:   (id)       => api.patch(`/admin/tenants/${id}/toggle`),
  deleteTenant:   (id)       => api.delete(`/admin/tenants/${id}`),
  getPlans:       ()         => api.get('/admin/plans'),
  createPlan:     (data)     => api.post('/admin/plans', data),
  updatePlan:     (id, data) => api.put(`/admin/plans/${id}`, data),
}

export const branchAPI = {
  getAll:          ()                 => api.get('/branches'),
  getOne:          (id)               => api.get(`/branches/${id}`),
  create:          (data)             => api.post('/branches', data),
  update:          (id, data)         => api.put(`/branches/${id}`, data),
  toggle:          (id)               => api.patch(`/branches/${id}/toggle`),
  delete:          (id)               => api.delete(`/branches/${id}`),
  addUser:         (branchId, data)   => api.post(`/branches/${branchId}/users`, data),
  removeUser:      (branchId, userId) => api.delete(`/branches/${branchId}/users/${userId}`),
  getReport:       (branchId, params) => api.get(`/branches/${branchId}/reports`, { params }),
  getGlobalReport: (params)           => api.get('/branches/reports/global', { params }),
  getTenantUsers:  ()                 => api.get('/users'),
}

export const kaneAPI = {
  getBalance:      ()     => api.get('/kane/balance'),
  transfer:        (data) => api.post('/kane/transfer', data),
  getTransactions: ()     => api.get('/kane/transactions'),
}

export const sabotayAPI = {
  getBalance: ()     => api.get('/sabotay/balance'),
  send:       (data) => api.post('/sabotay/send', data),
  getHistory: ()     => api.get('/sabotay/history'),
}

export const mobilPayAPI = {
  getMoncashBalance:      ()     => api.get('/moncash/balance'),
  moncashPayment:         (data) => api.post('/moncash/payment', data),
  getMoncashTransactions: ()     => api.get('/moncash/transactions'),
  getNatcashBalance:      ()     => api.get('/natcash/balance'),
  natcashPayment:         (data) => api.post('/natcash/payment', data),
  getNatcashTransactions: ()     => api.get('/natcash/transactions'),
}

export const internetAPI = {
  // ── Kliyan ───────────────────────────────────────────
  getClients:    (p)        => api.get('/internet/clients', { params: p }),
  getOneClient:  (id)       => api.get(`/internet/clients/${id}`),
  createClient:  (data)     => api.post('/internet/clients', data),
  updateClient:  (id, data) => api.put(`/internet/clients/${id}`, data),
  deleteClient:  (id)       => api.delete(`/internet/clients/${id}`),
  renewClient:   (data)     => api.post('/internet/renew', data),
 
  // ── Mikrotik config ───────────────────────────────────
  getMikrotikConfig:    ()     => api.get('/internet/mikrotik-config'),
  saveMikrotikConfig:   (data) => api.post('/internet/mikrotik-config', data),
  testMikrotikConfig:   ()     => api.post('/internet/mikrotik-config/test'),
 
  // ── Peman ─────────────────────────────────────────────
  getPayments: (p) => api.get('/internet/admin/payments', { params: p }),
}

// ✅ NOUVO — Founisè: kapital, founisè, achte
export const founiseAPI = {
  // ── Kapital ──────────────────────────────────────────
  getKapital:        ()     => api.get('/founise/kapital'),
  getKapitalMouvman: (p)    => api.get('/founise/kapital/mouvman', { params: p }),
  injectKapital:     (data) => api.post('/founise/kapital/enjeksyon', data),

  // ── Founisè ──────────────────────────────────────────
  getAll:  ()         => api.get('/founise/founise'),
  create:  (data)     => api.post('/founise/founise', data),
  update:  (id, data) => api.put(`/founise/founise/${id}`, data),

  // ── Achte ────────────────────────────────────────────
  getAchte:    (p)    => api.get('/founise/achte', { params: p }),
  createAchte: (data) => api.post('/founise/achte', data),
}
 

export default api