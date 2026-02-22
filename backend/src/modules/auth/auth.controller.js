// src/modules/auth/auth.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email ak modpas obligatwa.' });
  }
  const result = await authService.login(req.tenant.id, email, password);
  res.json({ success: true, ...result });
});

const logout = asyncHandler(async (req, res) => {
  // Avec JWT stateless, le logout est côté client
  // On log juste l'action
  res.json({ success: true, message: 'Ou dekonekte avèk siksè.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email obligatwa.' });
  await authService.forgotPassword(req.tenant.id, email);
  res.json({ success: true, message: 'Si email la egziste, yon lyen reyinisyalizasyon voye.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token ak nouvo modpas obligatwa.' });
  }
  await authService.resetPassword(req.tenant.id, token, password);
  res.json({ success: true, message: 'Modpas chanje avèk siksè.' });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    tenant: {
      id: req.tenant.id,
      name: req.tenant.name,
      slug: req.tenant.slug,
      logoUrl: req.tenant.logoUrl,
      primaryColor: req.tenant.primaryColor,
      defaultCurrency: req.tenant.defaultCurrency,
      defaultLanguage: req.tenant.defaultLanguage,
      exchangeRate: req.tenant.exchangeRate,
      taxRate: req.tenant.taxRate,
      receiptSize: req.tenant.receiptSize,                  // ✅ Ajoute
      subscriptionEndsAt: req.tenant.subscriptionEndsAt,    // ✅ Ajoute — pou konte jou
    }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Tout champ yo obligatwa.' });
  }
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ success: true, message: 'Modpas chanje avèk siksè.' });
});

module.exports = { login, logout, forgotPassword, resetPassword, getMe, changePassword };
