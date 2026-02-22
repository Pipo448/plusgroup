// src/modules/clients/client.service.js
const prisma = require('../../config/prisma');

const getAll = async (tenantId, { search, page = 1, limit = 20 }) => {
  const where = {
    tenantId,
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { _count: { select: { invoices: true, quotes: true } } },
      orderBy: { name: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.client.count({ where })
  ]);

  return { clients, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getOne = async (tenantId, id) => {
  const client = await prisma.client.findFirst({
    where: { id, tenantId },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, invoiceNumber: true, totalHtg: true, status: true, issueDate: true }
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, quoteNumber: true, totalHtg: true, status: true, issueDate: true }
      }
    }
  });
  if (!client) throw Object.assign(new Error('Kliyan pa jwenn.'), { statusCode: 404 });
  return client;
};

const create = async (tenantId, userId, data) => {
  return prisma.client.create({
    data: {
      tenantId,
      createdBy: userId,
      name: data.name,
      clientType: data.clientType || 'individual',
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      phone2: data.phone2,
      address: data.address,
      city: data.city,
      nif: data.nif,
      creditLimit: Number(data.creditLimit || 0),
      preferredCurrency: data.preferredCurrency || 'HTG',
      notes: data.notes
    }
  });
};

const update = async (tenantId, id, data) => {
  const client = await prisma.client.findFirst({ where: { id, tenantId } });
  if (!client) throw Object.assign(new Error('Kliyan pa jwenn.'), { statusCode: 404 });
  return prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      clientType: data.clientType,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      phone2: data.phone2,
      address: data.address,
      city: data.city,
      nif: data.nif,
      creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : undefined,
      preferredCurrency: data.preferredCurrency,
      notes: data.notes,
      isActive: data.isActive
    }
  });
};

const remove = async (tenantId, id) => {
  const client = await prisma.client.findFirst({ where: { id, tenantId } });
  if (!client) throw Object.assign(new Error('Kliyan pa jwenn.'), { statusCode: 404 });
  await prisma.client.update({ where: { id }, data: { isActive: false } });
};

module.exports = { getAll, getOne, create, update, remove };
