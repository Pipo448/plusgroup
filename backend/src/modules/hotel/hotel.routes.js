// backend/src/modules/hotel/hotel.routes.js
const express = require('express')
const router  = express.Router()
const roomTypeCtrl    = require('./roomType.controller')
const roomCtrl        = require('./room.controller')
const reservationCtrl = require('./reservation.controller')
const serviceCtrl     = require('./hotelService.controller')
const paymentCtrl     = require('./hotelPayment.controller')
const { identifyTenant, authenticate } = require('../../middleware/auth')

// Tout routes pwoteje
router.use(identifyTenant, authenticate)

// ── Room Types ─────────────────────────────────────────────────
router.get('/room-types',        roomTypeCtrl.getAll)
router.post('/room-types',       roomTypeCtrl.create)
router.put('/room-types/:id',    roomTypeCtrl.update)
router.delete('/room-types/:id', roomTypeCtrl.remove)

// ── Rooms ──────────────────────────────────────────────────────
// ✅ /available DOIT vini ANVAN /:id
router.get('/rooms/available',    roomCtrl.getAvailable)
router.get('/rooms',              roomCtrl.getAll)
router.get('/rooms/:id',          roomCtrl.getOne)
router.post('/rooms',             roomCtrl.create)
router.put('/rooms/:id',          roomCtrl.update)
router.patch('/rooms/:id/status', roomCtrl.updateStatus)

// ── Reservations ───────────────────────────────────────────────
router.get('/reservations',                 reservationCtrl.getAll)
router.get('/reservations/:id',             reservationCtrl.getOne)
router.post('/reservations',                reservationCtrl.create)
router.patch('/reservations/:id/check-in',  reservationCtrl.checkIn)
router.patch('/reservations/:id/check-out', reservationCtrl.checkOut)
router.patch('/reservations/:id/cancel',    reservationCtrl.cancel)

// ── Services anplis ────────────────────────────────────────────
router.get('/reservations/:id/services',  serviceCtrl.getByReservation)
router.post('/reservations/:id/services', serviceCtrl.add)
router.delete('/services/:serviceId',     serviceCtrl.remove)

// ── Peman hotel ────────────────────────────────────────────────
router.get('/reservations/:id/payments',  paymentCtrl.getByReservation)
router.post('/reservations/:id/payments', paymentCtrl.add)

module.exports = router
