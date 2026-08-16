// backend/src/modules/security/pin.routes.js
// ✅ Sèl bagay ki rete isit la se "status" — pou konfigire/chanje PIN la,
// itilize wout ki deja egziste: PATCH /api/v1/direct-quotes/my-pin
// (sa a se menm chan 'directQuotePin' ki pataje ant Devi Dirèk, Prè, Kanè Epay).
const express = require('express')
const router  = express.Router()
const { identifyTenant, authenticate } = require('../../middleware/auth')
const pinSvc  = require('./pin.service')

router.use(identifyTenant, authenticate)

// GET /security/pin/status — èske admin sa deja gen yon PIN konfigire
router.get('/status', async (req, res) => {
  try {
    const hasPin = await pinSvc.hasPinSet(req.tenant.id, req.user.id)
    res.json({ hasPin })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router
