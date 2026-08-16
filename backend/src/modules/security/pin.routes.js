// backend/src/modules/security/pin.routes.js
const express = require('express')
const router  = express.Router()
const { identifyTenant, authenticate } = require('../../middleware/auth')
const pinSvc  = require('./pin.service')

router.use(identifyTenant, authenticate)

// GET /security/pin/status — èske itilizatè a deja gen yon PIN
router.get('/status', async (req, res) => {
  try {
    const hasPin = await pinSvc.hasPinSet(req.user.id)
    res.json({ hasPin })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// POST /security/pin/setup — kreye PIN pou premye fwa (pa mande ansyen PIN)
router.post('/setup', async (req, res) => {
  try {
    const already = await pinSvc.hasPinSet(req.user.id)
    if (already) return res.status(400).json({ message: 'Ou deja gen yon PIN. Itilize "chanje PIN" pito.' })
    const { pin, confirmPin } = req.body
    if (pin !== confirmPin) return res.status(400).json({ message: 'De PIN yo pa menm.' })
    await pinSvc.setPin(req.user.id, pin)
    res.json({ success: true, message: 'PIN kreye avèk siksè.' })
  } catch (e) { res.status(400).json({ message: e.message }) }
})

// POST /security/pin/change — chanje PIN (mande ansyen PIN)
router.post('/change', async (req, res) => {
  try {
    const { oldPin, newPin, confirmPin } = req.body
    if (newPin !== confirmPin) return res.status(400).json({ message: 'De PIN yo pa menm.' })
    await pinSvc.changePin(req.user.id, oldPin, newPin)
    res.json({ success: true, message: 'PIN chanje avèk siksè.' })
  } catch (e) { res.status(400).json({ message: e.message }) }
})

module.exports = router
