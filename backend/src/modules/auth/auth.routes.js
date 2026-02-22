// ============================================================
// src/modules/auth/auth.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate } = require('../../middleware/auth');
const ctrl = require('./auth.controller');

// POST /api/v1/auth/login
router.post('/login', identifyTenant, ctrl.login);

// POST /api/v1/auth/logout
router.post('/logout', identifyTenant, authenticate, ctrl.logout);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', identifyTenant, ctrl.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', identifyTenant, ctrl.resetPassword);

// GET  /api/v1/auth/me
router.get('/me', identifyTenant, authenticate, ctrl.getMe);

// PATCH /api/v1/auth/change-password
router.patch('/change-password', identifyTenant, authenticate, ctrl.changePassword);

module.exports = router;
