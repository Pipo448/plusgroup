// src/modules/notifications/notification.controller.js
// ⚠️ KORIJE — req.tenantId → req.tenant.id (auth.js sete req.tenant, pa req.tenantId)

const notifService = require('./notification.service');

// GET /notifications?limit=20&offset=0&unreadOnly=false
exports.getAll = async (req, res) => {
  try {
    const { limit = 20, offset = 0, unreadOnly = 'false' } = req.query;
    const result = await notifService.getNotifications({
      tenantId: req.tenant.id,   // ⚠️ KORIJE
      userId: req.user.id,
      limit: Math.min(Number(limit), 50),
      offset: Number(offset),
      unreadOnly: unreadOnly === 'true',
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await notifService.getUnreadCount({
      tenantId: req.tenant.id,   // ⚠️ KORIJE
      userId: req.user.id,
    });
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await notifService.markAsRead({
      id: req.params.id,
      tenantId: req.tenant.id,   // ⚠️ KORIJE
      userId: req.user.id,
    });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// PATCH /notifications/mark-all-read
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await notifService.markAllAsRead({
      tenantId: req.tenant.id,   // ⚠️ KORIJE
      userId: req.user.id,
    });
    res.json({ success: true, updated: result.count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /notifications/:id
exports.deleteOne = async (req, res) => {
  try {
    await notifService.deleteNotification({
      id: req.params.id,
      tenantId: req.tenant.id,   // ⚠️ KORIJE
      userId: req.user.id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};
