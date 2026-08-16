// backend/src/modules/security/pin.service.js
const bcrypt = require('bcryptjs') // ranplase ak 'bcrypt' si se sa w deja itilize pou login
const prisma = require('../../config/prisma')

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

function isValidPinFormat(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin)
}

async function getPinRow(userId) {
  const rows = await prisma.$queryRaw`
    SELECT action_pin_hash, action_pin_attempts, action_pin_locked_until
    FROM users WHERE id = ${userId} LIMIT 1
  `
  return rows[0] || null
}

async function hasPinSet(userId) {
  const row = await getPinRow(userId)
  return !!row?.action_pin_hash
}

async function setPin(userId, newPin) {
  if (!isValidPinFormat(newPin)) throw new Error('PIN dwe gen 4 a 6 chif.')
  const hash = await bcrypt.hash(newPin, 10)
  await prisma.$executeRaw`
    UPDATE users SET action_pin_hash = ${hash}, action_pin_attempts = 0, action_pin_locked_until = NULL
    WHERE id = ${userId}
  `
}

async function changePin(userId, oldPin, newPin) {
  await verifyPin(userId, oldPin)
  await setPin(userId, newPin)
}

// ✅ Verifye PIN — jete Error si li mal, si li bloke, oswa si li poko konfigire
async function verifyPin(userId, pin) {
  if (!pin) throw new Error('PIN obligatwa pou aksyon sa a.')
  const row = await getPinRow(userId)
  if (!row?.action_pin_hash) throw new Error('Ou poko konfigire yon PIN sekirite. Ale nan Paramèt pou kreye youn.')

  if (row.action_pin_locked_until && new Date(row.action_pin_locked_until) > new Date()) {
    const minsLeft = Math.ceil((new Date(row.action_pin_locked_until) - new Date()) / 60000)
    throw new Error(`Twòp tantativ. Tann ${minsLeft} minit anvan w eseye ankò.`)
  }

  const ok = await bcrypt.compare(String(pin), row.action_pin_hash)
  if (!ok) {
    const attempts = (row.action_pin_attempts || 0) + 1
    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000)
      await prisma.$executeRaw`
        UPDATE users SET action_pin_attempts = ${attempts}, action_pin_locked_until = ${lockUntil}
        WHERE id = ${userId}
      `
      throw new Error(`PIN pa kòrèk. Kont bloke pou ${LOCK_MINUTES} minit apre ${MAX_ATTEMPTS} tantativ.`)
    }
    await prisma.$executeRaw`UPDATE users SET action_pin_attempts = ${attempts} WHERE id = ${userId}`
    throw new Error(`PIN pa kòrèk. (${MAX_ATTEMPTS - attempts} tantativ rete)`)
  }

  // Siksè — reset konpteur
  await prisma.$executeRaw`UPDATE users SET action_pin_attempts = 0, action_pin_locked_until = NULL WHERE id = ${userId}`
}

module.exports = { isValidPinFormat, hasPinSet, setPin, changePin, verifyPin }
