// src/modules/users/user.routes.js
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const bcrypt  = require('bcryptjs');
const prisma  = require('../../config/prisma');

router.use(identifyTenant, authenticate);

// GET — Tout itilizatè tenant an (Admin sèlman)
router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.tenant.id },
    select: {
      id: true, fullName: true, email: true, role: true,
      isActive: true, lastLoginAt: true, preferredLang: true, createdAt: true
    },
    orderBy: { fullName: 'asc' }
  });
  res.json({ success: true, users });
}));

// POST — Kreye itilizatè (Admin sèlman)
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;

  // Verifye limit plan
  const count = await prisma.user.count({ where: { tenantId: req.tenant.id, isActive: true } });
  if (req.tenant.plan && count >= req.tenant.plan.maxUsers) {
    return res.status(403).json({
      success: false,
      message: `Plan ou a limite a ${req.tenant.plan.maxUsers} itilizatè.`
    });
  }

  // Verifye email inik pou tenant an
  const existing = await prisma.user.findFirst({
    where: { tenantId: req.tenant.id, email: email.toLowerCase() }
  });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email sa a deja itilize.' });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: req.tenant.id,
      fullName,
      email: email.toLowerCase(),
      passwordHash: hash,
      role: role || 'cashier',
      phone,
      createdBy: req.user.id
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true }
  });
  res.status(201).json({ success: true, user });
}));

// PUT /:id — Modifye itilizatè (Admin sèlman)
router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const { fullName, role, phone, isActive, permissions, preferredLang } = req.body;

  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id }
  });
  if (!user) return res.status(404).json({ success: false, message: 'Itilizatè pa jwenn.' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { fullName, role, phone, isActive, permissions, preferredLang },
    select: { id: true, fullName: true, email: true, role: true, isActive: true }
  });
  res.json({ success: true, user: updated });
}));

// PATCH /:id/toggle — Aktive/Dezaktive itilizatè (Admin sèlman)
router.patch('/:id/toggle', authorize('admin'), asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id }
  });
  if (!user) return res.status(404).json({ success: false, message: 'Itilizatè pa jwenn.' });

  // Pa kite admin dezaktive tèt li
  if (user.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Ou pa ka dezaktive kont pa ou a.' });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
    select: { id: true, fullName: true, email: true, role: true, isActive: true }
  });
  res.json({
    success: true,
    user: updated,
    message: updated.isActive ? 'Itilizatè aktive.' : 'Itilizatè dezaktive.'
  });
}));

// DELETE /:id — Efase itilizatè (Admin sèlman)
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id }
  });
  if (!user) return res.status(404).json({ success: false, message: 'Itilizatè pa jwenn.' });

  // Pa kite admin efase tèt li
  if (user.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Ou pa ka efase kont pa ou a.' });
  }

  // Retire itilizatè nan tout branch li afekte
  await prisma.branchUser.deleteMany({ where: { userId: req.params.id } });

  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Itilizatè efase.' });
}));

// PATCH /:id/reset-password — Reyinisyalize modpas (Admin sèlman)
router.patch('/:id/reset-password', authorize('admin'), asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Modpas dwe gen omwen 8 karaktè.' });
  }

  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id }
  });
  if (!user) return res.status(404).json({ success: false, message: 'Itilizatè pa jwenn.' });

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash } });
  res.json({ success: true, message: 'Modpas reyinisyalize.' });
}));

module.exports = router;
