// backend/src/modules/push/push.routes.js
const express = require('express')
const router  = express.Router()
const { identifyTenant, authenticate } = require('../../middleware/auth')
const { asyncHandler } = require('../../middleware/errorHandler')
const pushSvc = require('./push.service')

router.use(identifyTenant, authenticate)

// POST /api/v1/push/subscribe — sove subscription
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { subscription } = req.body
  if (!subscription) return res.status(400).json({ success: false, message: 'Subscription obligatwa' })

  await pushSvc.saveSubscription(req.tenant.id, req.user.id, subscription)
  res.json({ success: true, message: 'Push subscription anrejistre.' })
}))

// DELETE /api/v1/push/unsubscribe — retire subscription
router.delete('/unsubscribe', asyncHandler(async (req, res) => {
  const { endpoint } = req.body
  if (endpoint) await pushSvc.removeSubscription(endpoint)
  res.json({ success: true })
}))

// GET /api/v1/push/vapid-public-key — retounen kle piblik la
router.get('/vapid-public-key', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'
  })
}))

module.exports = router