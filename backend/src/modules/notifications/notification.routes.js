// src/modules/notifications/notification.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const ctrl = require('./notification.controller');

router.use(identifyTenant, authenticate);

router.get('/',                   ctrl.getAll);           // jwenn tout notif
router.get('/unread-count',       ctrl.getUnreadCount);   // konte pa li ankò
router.patch('/mark-all-read',    ctrl.markAllAsRead);    // mache tout kòm li
router.patch('/:id/read',         ctrl.markAsRead);       // mache 1 kòm li
router.delete('/:id',             ctrl.deleteOne);        // efase 1

module.exports = router;
