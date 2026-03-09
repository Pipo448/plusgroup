// src/routes/hotel.routes.js
import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { extractBranch } from '../middleware/branch.middleware.js';
import * as roomTypeCtrl from '../controllers/hotel/roomType.controller.js';
import * as roomCtrl from '../controllers/hotel/room.controller.js';
import * as reservationCtrl from '../controllers/hotel/reservation.controller.js';
import * as serviceCtrl from '../controllers/hotel/hotelService.controller.js';
import * as paymentCtrl from '../controllers/hotel/hotelPayment.controller.js';

const router = express.Router();

// Tout routes bezwen otantifikasyon + branch
router.use(authenticate, extractBranch);

// ── Room Types (Admin sèlman)
router.get('/room-types',            requireAdmin, roomTypeCtrl.getAll);
router.post('/room-types',           requireAdmin, roomTypeCtrl.create);
router.put('/room-types/:id',        requireAdmin, roomTypeCtrl.update);
router.delete('/room-types/:id',     requireAdmin, roomTypeCtrl.remove);

// ── Rooms
router.get('/rooms',                 roomCtrl.getAll);
router.get('/rooms/available',       roomCtrl.getAvailable);
router.get('/rooms/:id',             roomCtrl.getOne);
router.post('/rooms',                requireAdmin, roomCtrl.create);
router.put('/rooms/:id',             requireAdmin, roomCtrl.update);
router.patch('/rooms/:id/status',    requireAdmin, roomCtrl.updateStatus);

// ── Reservations
router.get('/reservations',          reservationCtrl.getAll);
router.get('/reservations/:id',      reservationCtrl.getOne);
router.post('/reservations',         reservationCtrl.create);
router.patch('/reservations/:id/check-in',   reservationCtrl.checkIn);
router.patch('/reservations/:id/check-out',  reservationCtrl.checkOut);
router.patch('/reservations/:id/cancel',     reservationCtrl.cancel);

// ── Services anplis
router.get('/reservations/:id/services',     serviceCtrl.getByReservation);
router.post('/reservations/:id/services',    serviceCtrl.add);
router.delete('/services/:serviceId',        serviceCtrl.remove);

// ── Peman hotel
router.get('/reservations/:id/payments',     paymentCtrl.getByReservation);
router.post('/reservations/:id/payments',    paymentCtrl.add);

export default router;
