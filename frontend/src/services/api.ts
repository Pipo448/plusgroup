import axios, { AxiosInstance } from 'axios';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'moncoeur';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': TENANT_SLUG,
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('plusgroup-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('plusgroup-token');
      localStorage.removeItem('plusgroup-user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ============================================
// AUTH ENDPOINTS
// ============================================
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getMe: () =>
    api.get('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }),
};

// ============================================
// PRODUCTS ENDPOINTS
// ============================================
export const productsAPI = {
  getAll: (params?: any) =>
    api.get('/products', { params }),
  
  getOne: (id: string) =>
    api.get(`/products/${id}`),
  
  create: (data: any) =>
    api.post('/products', data),
  
  update: (id: string, data: any) =>
    api.put(`/products/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/products/${id}`),
  
  getLowStock: () =>
    api.get('/products/low-stock'),
  
  getCategories: () =>
    api.get('/products/categories/list'),
};

// ============================================
// CLIENTS ENDPOINTS
// ============================================
export const clientsAPI = {
  getAll: (params?: any) =>
    api.get('/clients', { params }),
  
  getOne: (id: string) =>
    api.get(`/clients/${id}`),
  
  create: (data: any) =>
    api.post('/clients', data),
  
  update: (id: string, data: any) =>
    api.put(`/clients/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/clients/${id}`),
};

// ============================================
// QUOTES ENDPOINTS
// ============================================
export const quotesAPI = {
  getAll: (params?: any) =>
    api.get('/quotes', { params }),
  
  getOne: (id: string) =>
    api.get(`/quotes/${id}`),
  
  create: (data: any) =>
    api.post('/quotes', data),
  
  update: (id: string, data: any) =>
    api.put(`/quotes/${id}`, data),
  
  send: (id: string) =>
    api.patch(`/quotes/${id}/send`),
  
  cancel: (id: string) =>
    api.patch(`/quotes/${id}/cancel`),
  
  convertToInvoice: (id: string) =>
    api.post(`/quotes/${id}/convert`),
};

// ============================================
// INVOICES ENDPOINTS
// ============================================
export const invoicesAPI = {
  getAll: (params?: any) =>
    api.get('/invoices', { params }),
  
  getOne: (id: string) =>
    api.get(`/invoices/${id}`),
  
  getDashboard: () =>
    api.get('/invoices/dashboard'),
  
  cancel: (id: string, reason: string) =>
    api.patch(`/invoices/${id}/cancel`, { reason }),
  
  addPayment: (id: string, data: any) =>
    api.post(`/invoices/${id}/payment`, data),
};

// ============================================
// STOCK ENDPOINTS
// ============================================
export const stockAPI = {
  getMovements: (params?: any) =>
    api.get('/stock/movements', { params }),
  
  adjust: (data: any) =>
    api.post('/stock/adjust', data),
  
  purchase: (data: any) =>
    api.post('/stock/purchase', data),
};

// ============================================
// REPORTS ENDPOINTS
// ============================================
export const reportsAPI = {
  getSales: (params?: any) =>
    api.get('/reports/sales', { params }),
  
  getStock: () =>
    api.get('/reports/stock'),
  
  getTopProducts: (params?: any) =>
    api.get('/reports/top-products', { params }),
};

// ============================================
// TENANT SETTINGS ENDPOINTS
// ============================================
export const tenantAPI = {
  getSettings: () =>
    api.get('/tenant/settings'),
  
  updateSettings: (data: any) =>
    api.put('/tenant/settings', data),
  
  updateExchangeRate: (exchangeRate: number) =>
    api.patch('/tenant/exchange-rate', { exchangeRate }),
  
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/tenant/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
