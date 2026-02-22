// src/services/api.js
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: 'https://plusgroup-backend.onrender.com/api/v1',  // ← URL dirèk backend
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
// ✅ login aksepte { slug, email, password } epi voye slug nan header
export const authAPI = {
  login: (data) => api.post('/auth/login', data, {
    headers: { 'X-Tenant-Slug': data.slug }
  }),
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
  update:         (id,d) => api.put(`/products/${id}`, d),
  remove:         (id)   => api.delete(`/products/${id}`),
  getCategories:  ()     => api.get('/products/categories/list'),
  createCategory: (data) => api.post('/products/categories/create', data),
  updateCategory: (id,d) => api.put(`/products/categories/${id}`, d),
}

// ── Clients
export const clientAPI = {
  getAll:  (p)    => api.get('/clients', { params: p }),
  getOne:  (id)   => api.get(`/clients/${id}`),
  create:  (data) => api.post('/clients', data),
  update:  (id,d) => api.put(`/clients/${id}`, d),
  remove:  (id)   => api.delete(`/clients/${id}`),
}

// ── Quotes (Devis)
export const quoteAPI = {
  getAll:   (p)    => api.get('/quotes', { params: p }),
  getOne:   (id)   => api.get(`/quotes/${id}`),
  create:   (data) => api.post('/quotes', data),
  update:   (id,d) => api.put(`/quotes/${id}`, d),
  send:     (id)   => api.patch(`/quotes/${id}/send`),
  cancel:   (id)   => api.patch(`/quotes/${id}/cancel`),
  convert:  (id)   => api.post(`/quotes/${id}/convert`),
}

// ── Invoices
export const invoiceAPI = {
  getAll:       (p)    => api.get('/invoices', { params: p }),
  getDashboard: ()     => api.get('/invoices/dashboard'),
  getOne:       (id)   => api.get(`/invoices/${id}`),
  cancel:       (id,d) => api.patch(`/invoices/${id}/cancel`, d),
  addPayment:   (id,d) => api.post(`/invoices/${id}/payment`, d),
  downloadPDF:  (id, size) => api.get(`/invoices/${id}/pdf`, {
    params: { size },
    responseType: 'blob'
  }),
}

// ── Stock
export const stockAPI = {
  getMovements: (p)    => api.get('/stock/movements', { params: p }),
  adjust:       (data) => api.post('/stock/adjust', data),
  purchase:     (data) => api.post('/stock/purchase', data),
}

// ── Reports
export const reportAPI = {
  getSales:       (p) => api.get('/reports/sales', { params: p }),
  getStock:       ()  => api.get('/reports/stock'),
  getTopProducts: (p) => api.get('/reports/top-products', { params: p }),
}

// ── Super Admin (instance separe — pa bezwen X-Tenant-Slug)
const adminAxios = axios.create({
  baseURL: 'https://plusgroup-backend.onrender.com/api/v1/admin',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

adminAxios.interceptors.request.use((config) => {
  try {
    const { token } = JSON.parse(localStorage.getItem('pg-admin') || '{}')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

adminAxios.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pg-admin')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

export const adminAPI = {
  login:        (data)  => adminAxios.post('/login', data),
  getTenants:   (p)     => adminAxios.get('/tenants', { params: p }),
  getTenant:    (id)    => adminAxios.get(`/tenants/${id}`),
  createTenant: (data)  => adminAxios.post('/tenants', data),
  updateStatus: (id, s) => adminAxios.patch(`/tenants/${id}/status`, { status: s }),
  renewSub:     (id, m) => adminAxios.post(`/tenants/${id}/renew`, { months: m }),
  getPlans:     ()      => adminAxios.get('/plans'),
  getStats:     ()      => adminAxios.get('/stats'),
  getExpiring:  ()      => adminAxios.get('/expiring-soon'),
}

export default api
