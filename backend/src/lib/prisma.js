// src/lib/prisma.js
// ⭐ Re-ekspòte singleton pataje a nan src/config/prisma.js — pa kreye yon
//    dezyèm PrismaClient. Sa evite gaspiyaj memwa (chak PrismaClient gen
//    pwòp pisin koneksyon pa li, plizyè enstans lakòz OOM sou Render).
module.exports = require('../config/prisma')
