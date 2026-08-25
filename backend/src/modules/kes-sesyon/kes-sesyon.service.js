// src/modules/kes-sesyon/kes-sesyon.service.js
const prisma = require('../../config/prisma');

const louvriSesyon = async (tenantId, userId, { fonKesOuveti, notes }) => {
  const fon = Number(fonKesOuveti);
  if (fon == null || fon < 0 || Number.isNaN(fon)) {
    throw Object.assign(new Error('Fon kès inisyal la envalid.'), { statusCode: 400 });
  }

  const dejaLouvri = await prisma.pg_kes_sesyon.findFirst({
    where: { tenant_id: tenantId, user_id: userId, status: 'louvri' },
  });
  if (dejaLouvri) {
    throw Object.assign(new Error('Ou gen yon sesyon kès ki deja louvri. Fèmen l anvan w louvri yon lòt.'), { statusCode: 409 });
  }

  return prisma.pg_kes_sesyon.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      fon_kes_ouveti: fon,
      notes: notes?.trim() || null,
    },
  });
};

const getSesyonAktif = (tenantId, userId) =>
  prisma.pg_kes_sesyon.findFirst({
    where: { tenant_id: tenantId, user_id: userId, status: 'louvri' },
  });

const femenSesyon = async (tenantId, userId, sesyonId, { fonKesFemen, notes }) => {
  const sesyon = await prisma.pg_kes_sesyon.findFirst({
    where: { id: sesyonId, tenant_id: tenantId, user_id: userId },
  });
  if (!sesyon) throw Object.assign(new Error('Sesyon pa jwenn.'), { statusCode: 404 });
  if (sesyon.status !== 'louvri') throw Object.assign(new Error('Sesyon sa a deja fèmen.'), { statusCode: 400 });

  const femen = Number(fonKesFemen);
  if (femen == null || femen < 0 || Number.isNaN(femen)) {
    throw Object.assign(new Error('Kantite kòb konte a envalid.'), { statusCode: 400 });
  }

  const closedAt = new Date();

  // ✅ KORIJE — lè admin anile/efase yon fakti (egzanp yon doub kreyasyon
  // pa aksidan), fakti a chanje estati pou 'cancelled' men peman ki te
  // asosye ak li a RETE nan tab payments. Si nou pa filtre sa, "Vant
  // Kach" ap toujou konte kòb yon vant ki anile — sa fè li pa matche ak
  // Tablo Bò a, ki deja eskli fakti anile yo. Menm règ la kounye a
  // aplike toude kote.
  const vantKachAgg = await prisma.payment.aggregate({
    where: {
      tenantId,
      createdBy: userId,
      method: 'cash',
      paymentDate: { gte: sesyon.opened_at, lte: closedAt },
      invoice: { status: { not: 'cancelled' } },
    },
    _sum: { amountHtg: true },
  });
  const vantKach = Number(vantKachAgg._sum.amountHtg || 0);
  const ouveti   = Number(sesyon.fon_kes_ouveti);
  const atann    = Math.round((ouveti + vantKach) * 100) / 100;
  const eka      = Math.round((femen - atann) * 100) / 100;

  return prisma.pg_kes_sesyon.update({
    where: { id: sesyonId },
    data: {
      fon_kes_femen: femen,
      vant_kach: vantKach,
      atann,
      eka,
      status: 'femen',
      closed_at: closedAt,
      notes: notes?.trim() || sesyon.notes,
    },
  });
};

const listSesyon = (tenantId, { userId, dateFrom, dateTo, limit = 50 } = {}) =>
  prisma.pg_kes_sesyon.findMany({
    where: {
      tenant_id: tenantId,
      ...(userId && { user_id: userId }),
      ...(dateFrom && dateTo && { opened_at: { gte: new Date(dateFrom), lte: new Date(`${dateTo}T23:59:59.999Z`) } }),
    },
    include: { user: { select: { fullName: true } } },
    orderBy: { opened_at: 'desc' },
    take: Number(limit),
  });

module.exports = { louvriSesyon, getSesyonAktif, femenSesyon, listSesyon };