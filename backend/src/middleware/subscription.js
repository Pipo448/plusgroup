// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
//
// Lojik: Apre dat ekspirasyon + 5 jou gras, rejte tout demand
// (eksepte /auth/logout pou kliyan an ka dekonekte).
//
// SA POU FÈ:
// 1. Kreye fichye sa nan: src/middleware/subscription.js
// 2. Aplike li sou wout pwoteje yo nan index.js (gade an ba)
//
// ═══════════════════════════════════════════════════════════════

const GRACE_DAYS = 5

/**
 * Middleware ki tcheke si abònman tenant la ekspire + gras peryòd pase
 * Bezwen `identifyTenant` te kouri anvan li (req.tenant dwe egziste)
 */
function enforceSubscription(req, res, next) {
  try {
    // Si pa gen tenant (egz: wout piblik), pase
    if (!req.tenant) return next()

    const endsAt = req.tenant.subscriptionEndsAt
    if (!endsAt) return next()  // Pa gen dat — pa bloke (defo trust)

    const expireDate = new Date(endsAt)
    if (isNaN(expireDate.getTime())) return next()

    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24
    const expireMidnight = new Date(expireDate.getFullYear(), expireDate.getMonth(), expireDate.getDate())
    const todayMidnight  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysInGrace = Math.round((todayMidnight.getTime() - expireMidnight.getTime()) / msPerDay)

    // Sèlman bloke si pase gras peryòd la
    if (daysInGrace > GRACE_DAYS) {
      return res.status(402).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Abònman ekspire — Kontakte Plus Group: +509 4244-9024',
        expiredAt: expireDate.toISOString(),
        daysInGrace,
        gracePeriod: GRACE_DAYS,
      })
    }

    next()
  } catch (err) {
    // An ka erè kalkil, pa bloke (fail-open pou evite zafè)
    console.error('[subscription middleware] erè:', err)
    next()
  }
}

module.exports = { enforceSubscription, GRACE_DAYS }

// ═══════════════════════════════════════════════════════════════
// KÒMAN POU ITILIZE NAN index.js:
// ═══════════════════════════════════════════════════════════════
//
// 1. Enpòte:
//    const { enforceSubscription } = require('./middleware/subscription')
//
// 2. Aplike apre middleware tenant identifikasyon, anvan wout sansib yo:
//
//    // Wout SAN bloke (login, logout, payment, etc)
//    app.use(`${API}/auth`, authLimiter, authRoutes)  // login dwe travay menm si bloke
//
//    // ⭐ Aplike sou wout pwoteje yo
//    // OPSYON A: Tcheke chak modil endividyèl
//    app.use(`${API}/klinik`, enforceSubscriptionWithIdentify, klinikRoutes)
//
//    // OPSYON B (rekòmande): Aplike global sou tout API protected
//    // Nesesite tenant te idantifye deja (nan auth middleware modil yo)
//
// ⚠️ NÒT ENPÒTAN:
// - Middleware sa bezwen `req.tenant` deja defini (pa `identifyTenant`)
// - Si w aplike avan auth, li pa ap mache
// - Pi bon kote: ajoute li direkteman nan klinik.routes.js a tèt fichye a
//
// Egzanp pou klinik.routes.js:
//   const { enforceSubscription } = require('../middleware/subscription')
//   router.use(identifyTenant, authenticate, enforceSubscription)
//
// ═══════════════════════════════════════════════════════════════
