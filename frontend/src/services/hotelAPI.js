// src/services/hotelAPI.js
// Ajoute sa nan fichye api.js ou a, oswa enpòte l separe

import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'https://plusgroup-backend.onrender.com/api/v1'

const getHeaders = () => {
  const token  = localStorage.getItem('token')
  const tenant = localStorage.getItem('tenantSlug')
  const branch = localStorage.getItem('branchId')
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': tenant,
    ...(branch && { 'X-Branch-Id': branch }),
  }
}

export const hotelAPI = {
  // Room Types
  getRoomTypes:    ()       => axios.get(`${API}/hotel/room-types`, { headers: getHeaders() }),
  createRoomType:  (data)   => axios.post(`${API}/hotel/room-types`, data, { headers: getHeaders() }),
  updateRoomType:  (id, d)  => axios.put(`${API}/hotel/room-types/${id}`, d, { headers: getHeaders() }),
  deleteRoomType:  (id)     => axios.delete(`${API}/hotel/room-types/${id}`, { headers: getHeaders() }),

  // Rooms
  getRooms:        (p)      => axios.get(`${API}/hotel/rooms`, { params: p, headers: getHeaders() }),
  getAvailableRooms:(p)     => axios.get(`${API}/hotel/rooms/available`, { params: p, headers: getHeaders() }),
  getRoom:         (id)     => axios.get(`${API}/hotel/rooms/${id}`, { headers: getHeaders() }),
  createRoom:      (data)   => axios.post(`${API}/hotel/rooms`, data, { headers: getHeaders() }),
  updateRoom:      (id, d)  => axios.put(`${API}/hotel/rooms/${id}`, d, { headers: getHeaders() }),
  updateRoomStatus:(id, status) => axios.patch(`${API}/hotel/rooms/${id}/status`, { status }, { headers: getHeaders() }),

  // Reservations
  getReservations: (p)      => axios.get(`${API}/hotel/reservations`, { params: p, headers: getHeaders() }),
  getReservation:  (id)     => axios.get(`${API}/hotel/reservations/${id}`, { headers: getHeaders() }),
  createReservation:(data)  => axios.post(`${API}/hotel/reservations`, data, { headers: getHeaders() }),
  checkIn:         (id)     => axios.patch(`${API}/hotel/reservations/${id}/check-in`, {}, { headers: getHeaders() }),
  checkOut:        (id, d)  => axios.patch(`${API}/hotel/reservations/${id}/check-out`, d, { headers: getHeaders() }),
  cancelReservation:(id, d) => axios.patch(`${API}/hotel/reservations/${id}/cancel`, d, { headers: getHeaders() }),

  // Services
  getServices:     (id)     => axios.get(`${API}/hotel/reservations/${id}/services`, { headers: getHeaders() }),
  addService:      (id, d)  => axios.post(`${API}/hotel/reservations/${id}/services`, d, { headers: getHeaders() }),
  removeService:   (sid)    => axios.delete(`${API}/hotel/services/${sid}`, { headers: getHeaders() }),

  // Payments
  getPayments:     (id)     => axios.get(`${API}/hotel/reservations/${id}/payments`, { headers: getHeaders() }),
  addPayment:      (id, d)  => axios.post(`${API}/hotel/reservations/${id}/payments`, d, { headers: getHeaders() }),
}
