// src/modules/auth/auth.service.js
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const prisma  = require('../../config/prisma');

// Générer token JWT
const generateToken = (userId, tenantId, role) => {
  return jwt.sign(
    { userId, tenantId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Login
const login = async (tenantId, email, password) => {
  const user = await prisma.user.findFirst({
    where: { tenantId, email: email.toLowerCase().trim(), isActive: true }
  });

  if (!user) {
    throw Object.assign(new Error('Email oswa modpas pa kòrèk.'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Email oswa modpas pa kòrèk.'), { statusCode: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // ← NOUVO: chèche tenant ak plan
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          features: true,
          maxProducts: true,
          priceMonthly: true
        }
      }
    }
  });

  const token = generateToken(user.id, tenantId, user.role);

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      preferredLang: user.preferredLang,
      avatarUrl: user.avatarUrl
    },
    tenant  // ← NOUVO: tenant + plan nan response
  };
};
// ── Forgot Password
const forgotPassword = async (tenantId, email) => {
  const user = await prisma.user.findFirst({
    where: { tenantId, email: email.toLowerCase().trim(), isActive: true }
  });

  if (!user) return; // Ne pas révéler si l'email existe

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires
    }
  });

  // TODO: Envoyer email avec lien reset
  // await sendEmail({ to: user.email, template: 'reset-password', data: { token } })
  console.log(`[DEV] Reset token pou ${email}: ${token}`);
};

// ── Reset Password
const resetPassword = async (tenantId, token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      tenantId,
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() }
    }
  });

  if (!user) {
    throw Object.assign(new Error('Token invalid oswa ekspire.'), { statusCode: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  });
};

// ── Change Password
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Modpas aktyèl pa kòrèk.'), { statusCode: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
};

module.exports = { login, forgotPassword, resetPassword, changePassword };
