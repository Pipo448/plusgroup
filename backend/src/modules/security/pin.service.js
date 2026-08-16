// backend/src/modules/security/pin.service.js
// ✅ Reyitilize menm chan 'directQuotePin' (User model) ki deja itilize pou
// otorizasyon Devi Dirèk yo — sa fè YON SÈL PIN admin pou tout aksyon sansib
// (Devi Dirèk, Prè, Kanè Epay), menm konvansyon egzat ak direct-quote.service.js.
const prisma = require('../../config/prisma')

// ✅ Verifye PIN admin — jete Error si fòma pa bon, itilizatè pa admin,
// PIN poko konfigire, oswa PIN pa kòrèk.
async function verifyPin(tenantId, userId, pin) {
  if (!pin || !/^\d{4}$/.test(String(pin).trim())) {
    throw Object.assign(new Error('PIN dwe gen egzakteman 4 chif.'), { statusCode: 400 })
  }

  const admin = await prisma.user.findFirst({
    where: { id: userId, tenantId, role: 'admin', isActive: true },
    select: { directQuotePin: true },
  })
  if (!admin) {
    throw Object.assign(new Error('Itilizatè pa jwenn oswa pa gen wòl admin.'), { statusCode: 403 })
  }
  if (!admin.directQuotePin) {
    throw Object.assign(new Error('Ou poko konfigire PIN otorizasyon ou. Ale nan paramèt pou kreye youn.'), { statusCode: 400 })
  }
  if (admin.directQuotePin !== String(pin).trim()) {
    throw Object.assign(new Error('PIN pa kòrèk.'), { statusCode: 401 })
  }
}

// ✅ Èske admin sa deja gen yon PIN konfigire — pou fwontal la ka gide l
// al konfigire youn si li poko genyen, anvan li menm eseye yon aksyon sansib.
async function hasPinSet(tenantId, userId) {
  const admin = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { directQuotePin: true },
  })
  return !!admin?.directQuotePin
}

module.exports = { verifyPin, hasPinSet }
