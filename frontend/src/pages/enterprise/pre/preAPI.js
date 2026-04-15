// src/pages/enterprise/pre/preAPI.js
import api from '../../../services/api'

export const preAPI = {
  getStats:       ()           => api.get('/pre/stats'),
  getAll:         (p)          => api.get('/pre', { params: p }),
  getOne:         (id)         => api.get(`/pre/${id}`),
  create:         (data)       => api.post('/pre', data),
  paiement:       (id, data)   => api.post(`/pre/${id}/paiement`, data),
  cloture:        (id)         => api.post(`/pre/${id}/cloture`),
  echeances:      (id)         => api.get(`/pre/${id}/echeances`),
  kaneSearch:     (q)          => api.get('/pre/kane-epay-search', { params: { q } }),
  enjekteKapital: (data)       => api.post('/pre/kapital/enjekte', data),
  femenKes:       (data)       => api.post('/pre/rapo/femen-kes', data),
  checkKesFermen: ()           => api.get('/pre/rapo/kes-status'),
  // ✅ Admin edit kapital (5 minit)
  updateKapital:  (id, data)   => api.put(`/pre/kapital/${id}`, data),
  // ✅ Admin delete
  deletePre:      (id)         => api.delete(`/pre/${id}`),
  deletePaiement: (preId, pId) => api.delete(`/pre/${preId}/paiement/${pId}`),
  deleteKapital:  (id)         => api.delete(`/pre/kapital/${id}`),
}