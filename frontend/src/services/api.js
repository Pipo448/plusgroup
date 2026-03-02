// src/services/api.js
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: 'https://plusgroup-backend.onrender.com/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// ✅ Request: ajoute token + slug automatiquement
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('plusgroup-token')
    const slug  = localStorage.getItem('plusgroup-slug')

    if (token) config.headers.Authorization = `Bearer ${token}`
    if (!config.headers['X-Tenant-Slug'] && slug) {
      config.headers['X-Tenant-Slug'] = slug
    }
  } catch {}
  return config
})

// Response: gestion erreurs globales
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const isLoginRoute = err.config?.url?.includes('/auth/login')

    if (isLoginRoute) return Promise.reject(err)

    if (status === 401) {
      ['plusgroup-token','plusgroup-user','plusgroup-tenant','plusgroup-slug','plusgroup-lang']
        .forEach(k => localStorage.removeItem(k))
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status === 402) {
      toast.error('Abònman ekspire. Kontakte administrasyon.', { id: 'expired' })
      return Promise.reject(err)
    }

    if (status !== 404) {
      const msg = err.response?.data?.message || 'Erè koneksyon. Verifye entènèt ou.'
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// ── Auth
export const authAPI = {
  login:          (data) => api.post('/auth/login', data, { headers: { 'X-Tenant-Slug': data.slug } }),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
}

// ── Tenant
export const tenantAPI = {
  getSettings:    ()     => api.get('/tenant/settings'),
  updateSettings: (data) => api.put('/tenant/settings', data),
  updateRate:     (rate) => api.patch('/tenant/exchange-rate', { exchangeRate: rate }),
  uploadLogo:     (fd)   => api.post('/tenant/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getSequences:   ()     => api.get('/tenant/sequences'),
}

// ── Products
export const productAPI = {
  getAll:         (p)    => api.get('/products', { params: p }),
  getLowStock:    ()     => api.get('/products/low-stock'),
  getOne:         (id)   => api.get(`/products/${id}`),
  create:         (data) => api.post('/products', data),
  update:         (id, data) => api.put(`/products/${id}`, data),
  delete:         (id)   => api.delete(`/products/${id}`),
  import:         (data) => api.post('/products/import', data),
  getCategories:  ()     => api.get('/products/categories'),
  createCategory: (data) => api.post('/products/categories', data),
  adjustStock:    (id, data) => api.patch(`/products/${id}/stock`, data),
}

// ── Clients
export const clientAPI = {
  getAll:  (p)    => api.get('/clients', { params: p }),
  getOne:  (id)   => api.get(`/clients/${id}`),
  create:  (data) => api.post('/clients', data),
  update:  (id, data) => api.put(`/clients/${id}`, data),
  delete:  (id)   => api.delete(`/clients/${id}`),
}

// ── Quotes
export const quoteAPI = {
  getAll:    (p)    => api.get('/quotes', { params: p }),
  getOne:    (id)   => api.get(`/quotes/${id}`),
  create:    (data) => api.post('/quotes', data),
  update:    (id, data) => api.put(`/quotes/${id}`, data),
  delete:    (id)   => api.delete(`/quotes/${id}`),
  send:      (id)   => api.patch(`/quotes/${id}/send`),
  accept:    (id)   => api.patch(`/quotes/${id}/accept`),
  convert:   (id)   => api.post(`/quotes/${id}/convert`),
  cancel:    (id)   => api.patch(`/quotes/${id}/cancel`),
}

// ── Invoices
export const invoiceAPI = {
  getAll:        (p)    => api.get('/invoices', { params: p }),
  getOne:        (id)   => api.get(`/invoices/${id}`),
  addPayment:    (id, data) => api.post(`/invoices/${id}/payments`, data),
  cancel:        (id, data) => api.patch(`/invoices/${id}/cancel`, data),
}

// ── Stock
export const stockAPI = {
  getMovements: (p)    => api.get('/stock/movements', { params: p }),
  addMovement:  (data) => api.post('/stock/movements', data),
}

// ── Reports
export const reportAPI = {
  getSummary:  (p) => api.get('/reports/summary', { params: p }),
  getSales:    (p) => api.get('/reports/sales', { params: p }),
  getStock:    (p) => api.get('/reports/stock', { params: p }),
  getClients:  (p) => api.get('/reports/clients', { params: p }),
}

// ── Users (Admin sèlman)
export const userAPI = {
  getAll:  ()     => api.get('/auth/users'),
  create:  (data) => api.post('/auth/users', data),
  update:  (id, data) => api.put(`/auth/users/${id}`, data),
  delete:  (id)   => api.delete(`/auth/users/${id}`),
  toggle:  (id)   => api.patch(`/auth/users/${id}/toggle`),
}

// ══════════════════════════════════════════════════════
// ── BRANCHES — NOUVO (Multi-Branch System)
// Admin tenant: kreye, jere, aktive/bloke branch
// Anplwaye: wè sèlman branch aktif pa yo
// ══════════════════════════════════════════════════════
export const branchAPI = {
  // Lis branch yo (admin=tout, anplwaye=pa yo)
  getAll: () => api.get('/branches'),

  // Detay yon branch
  getOne: (id) => api.get(`/branches/${id}`),

  // Kreye branch (admin sèlman)
  create: (data) => api.post('/branches', data),

  // Modifye branch
  update: (id, data) => api.put(`/branches/${id}`, data),

  // Toggle ON/OFF (admin sèlman)
  toggle: (id) => api.patch(`/branches/${id}/toggle`),

  // Efase branch
  delete: (id) => api.delete(`/branches/${id}`),

  // ── Jesyon Itilizatè Branch
  addUser:    (branchId, data)   => api.post(`/branches/${branchId}/users`, data),
  removeUser: (branchId, userId) => api.delete(`/branches/${branchId}/users/${userId}`),

  // ── Rapò
  getReport:      (branchId, params) => api.get(`/branches/${branchId}/reports`, { params }),
  getGlobalReport:(params)           => api.get('/branches/reports/global', { params }),
}

export default api
