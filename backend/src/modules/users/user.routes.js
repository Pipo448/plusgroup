// ============================================================
// src/modules/users/user.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { identifyTenant, authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const bcrypt  = require('bcryptjs');
const prisma  = require('../../config/prisma');

router.use(identifyTenant, authenticate);

// GET tous les utilisateurs
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

// CREATE utilisateur
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;

  // Vérifier limite plan
  const count = await prisma.user.count({ where: { tenantId: req.tenant.id, isActive: true } });
  if (req.tenant.plan && count >= req.tenant.plan.maxUsers) {
    return res.status(403).json({ success: false, message: `Plan ou a limite a ${req.tenant.plan.maxUsers} itilizatè.` });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: req.tenant.id,
      fullName, email: email.toLowerCase(),
      passwordHash: hash,
      role: role || 'cashier',
      phone,
      createdBy: req.user.id
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true }
  });
  res.status(201).json({ success: true, user });
}));

// UPDATE utilisateur
router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const { fullName, role, phone, isActive, permissions, preferredLang } = req.body;
  const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id } });
  if (!user) return res.status(404).json({ success: false, message: 'Itilizatè pa jwenn.' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { fullName, role, phone, isActive, permissions, preferredLang },
    select: { id: true, fullName: true, email: true, role: true, isActive: true }
  });
  res.json({ success: true, user: updated });
}));

// RESET password utilisateur (par admin)
router.patch('/:id/reset-password', authorize('admin'), asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash } });
  res.json({ success: true, message: 'Modpas reyinisyalize.' });
}));

module.exports = router;
