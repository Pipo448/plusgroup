// src/pages/enterprise/kane-epay/kaneEpayAPI.js
import api from '../../../services/api'

export const kaneAPI = {
  getStats:      ()         => api.get('/kane-epay/stats'),
  getAll:        (p)        => api.get('/kane-epay', { params: p }),
  getOne:        (id)       => api.get(`/kane-epay/${id}`),
  create:        (data)     => api.post('/kane-epay', data),
  deposit:       (id, data) => api.post(`/kane-epay/${id}/deposit`, data),
  withdraw:      (id, data) => api.post(`/kane-epay/${id}/withdraw`, data),
  checkKesFemen: ()         => api.get('/pre/rapo/kes-status'),
  femenKes:      (data)     => api.post('/pre/rapo/femen-kes', data),
  // ✅ Admin delete — mande PIN
  deleteTransaction: (txId, pin) => api.delete(`/kane-epay/transactions/${txId}`, { data: { pin } }),
  deleteAccount:     (id, pin)   => api.delete(`/kane-epay/${id}`, { data: { pin } }),
}
