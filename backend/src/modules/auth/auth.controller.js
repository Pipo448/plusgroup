// src/modules/auth/auth.controller.js
const { asyncHandler } = require('../../middleware/errorHandler');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email ak modpas obligatwa.' });
  }
  const result = await authService.login(req.tenant.id, email, password);

  res.json({
    success: true,
    ...result,
    tenant: {
      ...(result.tenant || {}),
      plan: result.tenant?.plan || req.tenant?.plan || null,
    },
    branches: result.branches || result.user?.branches || [],
  });
});

const logout = asyncHandler(async (req, res) => {
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
  // ⚠️ KORIJE EGRESS — `logoUrl` la se yon imaj base64 KONPLÈ (ka fè
  // plizyè santèn KB, jiska 1MB+) e li te vwayaje sou CHAK apèl
  // `/auth/me` — yon wout ki rele CHAK fwa yon paj chaje/moun navige nan
  // aplikasyon an. Se sa ki lakòz repons 275KB-1161KB repete nan log yo.
  // Frontend a deja gen `tenant.logoUrl` sove nan `authStore` (persist,
  // depi login) e li gen `refreshTenant()` pou aktyalize l apre yon chanjman
  // logo — donk `/auth/me` pa bezwen repete l chak fwa. Si w vle logo a
  // toujou disponib apre yon rafrechisman paj (F5), itilize `/tenant/settings`
  // (ki deja retounen l) olye `/auth/me`.
  res.json({
    success: true,
    user: req.user,
    tenant: {
      id:                 req.tenant.id,
      name:               req.tenant.name,
      slug:               req.tenant.slug,
      primaryColor:       req.tenant.primaryColor,
      defaultCurrency:    req.tenant.defaultCurrency,
      defaultLanguage:    req.tenant.defaultLanguage,
      phone:              req.tenant.phone,
      address:            req.tenant.address,
      exchangeRate:       req.tenant.exchangeRate,
      exchangeRates:      req.tenant.exchangeRates,
      visibleCurrencies:  req.tenant.visibleCurrencies,
      showExchangeRate:   req.tenant.showExchangeRate,
      showQrCode:         req.tenant.showQrCode,
      taxRate:            req.tenant.taxRate,
      receiptSize:        req.tenant.receiptSize,
      subscriptionEndsAt: req.tenant.subscriptionEndsAt,
      plan:               req.tenant.plan,
      // ✅ KOREKSYON — allowedPages te manke, sidebar ak ProtectedPage pa te fonksyone
      allowedPages:       req.tenant.allowedPages ?? null,
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