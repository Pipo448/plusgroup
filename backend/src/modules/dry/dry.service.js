// src/modules/dry/dry.service.js
const prisma = require('../../config/prisma')

const getNextOrderNumber = async (tenantId) => {
  const year = new Date().getFullYear()
  const seq  = await prisma.documentSequence.upsert({
    where:  { tenantId_documentType: { tenantId, documentType: 'dry_order' } },
    create: { tenantId, documentType: 'dry_order', prefix: 'PRE', lastNumber: 0, currentYear: year },
    update: {}
  })
  const lastNumber = seq.currentYear < year ? 0 : seq.lastNumber
  const next       = lastNumber + 1
  await prisma.documentSequence.update({
    where: { tenantId_documentType: { tenantId, documentType: 'dry_order' } },
    data:  { lastNumber: next, currentYear: year }
  })
  return `${seq.prefix}-${year}-${String(next).padStart(4, '0')}`
}

const getAll = async (tenantId, { status, search, page = 1, limit = 20, branchId, dateFrom, dateTo }) => {
  const where = {
    tenantId,
    ...(branchId && { branchId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { clientName:  { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search, mode: 'insensitive' } },
      ]
    }),
    ...(dateFrom && dateTo && {
      depositDate: {
        gte: new Date(`${dateFrom}T05:00:00.000Z`),
        lte: new Date(new Date(`${dateTo}T05:00:00.000Z`).getTime() + 86400000 - 1),
      }
    })
  }
  const [orders, total] = await Promise.all([
    prisma.dryOrder.findMany({
      where,
      include: {
        items:    { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
        creator:  { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take:  Number(limit),
    }),
    prisma.dryOrder.count({ where })
  ])
  return { orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
}

const getOne = async (tenantId, id) => {
  const order = await prisma.dryOrder.findFirst({
    where: { id, tenantId },
    include: {
      items:    { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      creator:  { select: { fullName: true } },
      tenant:   { select: { name: true, phone: true, address: true, logoUrl: true, businessName: true } },
    }
  })
  if (!order) throw Object.assign(new Error('Lod pa jwenn.'), { statusCode: 404 })
  return order
}

const create = async (tenantId, userId, data) => {
  const {
    clientName, clientPhone, pickupDate, notes, branchId,
    items = [], depositAmount = 0, paymentMethod = 'cash',
  } = data

  if (!clientName?.trim()) throw Object.assign(new Error('Non kliyan obligatwa.'), { statusCode: 400 })
  if (!pickupDate)         throw Object.assign(new Error('Dat pou tounen obligatwa.'), { statusCode: 400 })
  if (!items.length)       throw Object.assign(new Error('Omwen yon atik obligatwa.'), { statusCode: 400 })

  const orderNumber = await getNextOrderNumber(tenantId)
  const totalHtg    = items.reduce((s, it) => s + Number(it.unitPriceHtg || 0) * Number(it.quantity || 1), 0)
  const deposit     = Math.min(Number(depositAmount || 0), totalHtg)
  const balanceDue  = totalHtg - deposit

  const order = await prisma.$transaction(async (tx) => {
    const ord = await tx.dryOrder.create({
      data: {
        tenantId, branchId: branchId || null, orderNumber,
        clientName: clientName.trim(), clientPhone: clientPhone?.trim() || null,
        depositDate: new Date(), pickupDate: new Date(pickupDate),
        status: 'received', totalHtg, amountPaidHtg: deposit,
        balanceDueHtg: balanceDue, notes: notes || null, createdBy: userId,
      }
    })
    for (const [idx, item] of items.entries()) {
      const qty  = Number(item.quantity || 1)
      const prix = Number(item.unitPriceHtg || 0)
      await tx.dryOrderItem.create({
        data: {
          tenantId, orderId: ord.id,
          service:      item.service     || 'presaj',
          description:  item.description || 'Rad',
          color:        item.color       || null,
          quantity:     qty, unitPriceHtg: prix, totalHtg: qty * prix,
          notes:        item.notes || null, sortOrder: idx,
        }
      })
    }
    if (deposit > 0) {
      await tx.dryPayment.create({
        data: {
          tenantId, orderId: ord.id, amountHtg: deposit, method: paymentMethod,
          amountGiven: Number(data.amountGiven || deposit),
          change:      Number(data.change || 0),
          paymentDate: new Date(), notes: 'Depozit', createdBy: userId,
        }
      })
    }
    return ord
  })
  return getOne(tenantId, order.id)
}

const updateStatus = async (tenantId, id, status, cancelReason) => {
  const order = await prisma.dryOrder.findFirst({ where: { id, tenantId } })
  if (!order) throw Object.assign(new Error('Lod pa jwenn.'), { statusCode: 404 })

  const valid = {
    received: ['processing','cancelled'], processing: ['ready','cancelled'],
    ready: ['delivered','cancelled'], delivered: [], cancelled: [],
  }
  if (!valid[order.status]?.includes(status))
    throw Object.assign(new Error(`Pa ka chanje statut ${order.status} → ${status}`), { statusCode: 400 })

  return prisma.dryOrder.update({
    where: { id },
    data: {
      status,
      ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
      ...(status === 'cancelled' ? { cancelReason: cancelReason || null } : {}),
    }
  })
}

const addPayment = async (tenantId, orderId, userId, data) => {
  const order = await prisma.dryOrder.findFirst({ where: { id: orderId, tenantId } })
  if (!order)                       throw Object.assign(new Error('Lod pa jwenn.'), { statusCode: 404 })
  if (order.status === 'cancelled') throw Object.assign(new Error('Lod anile.'), { statusCode: 400 })

  const amountHtg   = Number(data.amountHtg || 0)
  if (amountHtg <= 0) throw Object.assign(new Error('Montan dwe plis ke 0.'), { statusCode: 400 })

  const VALID_METHODS = ['cash','card','transfer','moncash','natcash','check','credit','other']
  const method = VALID_METHODS.includes(data.method) ? data.method : 'cash'

  await prisma.dryPayment.create({
    data: {
      tenantId, orderId, amountHtg, method,
      reference:   data.reference   || null,
      amountGiven: Number(data.amountGiven || 0),
      change:      Number(data.change || 0),
      paymentDate: new Date(), notes: data.notes || null, createdBy: userId,
    }
  })

  const agg     = await prisma.dryPayment.aggregate({ where: { orderId }, _sum: { amountHtg: true } })
  const paid    = Number(agg._sum.amountHtg || 0)
  const balance = Math.max(0, Number(order.totalHtg) - paid)

  await prisma.dryOrder.update({ where: { id: orderId }, data: { amountPaidHtg: paid, balanceDueHtg: balance } })
  return getOne(tenantId, orderId)
}

const getDashboard = async (tenantId, branchId) => {
  const bf = branchId ? { branchId } : {}
  const [received, processing, ready, delivered] = await Promise.all([
    prisma.dryOrder.count({ where: { tenantId, ...bf, status: 'received'   } }),
    prisma.dryOrder.count({ where: { tenantId, ...bf, status: 'processing' } }),
    prisma.dryOrder.count({ where: { tenantId, ...bf, status: 'ready'      } }),
    prisma.dryOrder.aggregate({ where: { tenantId, ...bf, status: 'delivered' }, _count: true, _sum: { totalHtg: true } }),
  ])
  return { received, processing, ready, delivered }
}

module.exports = { getAll, getOne, create, updateStatus, addPayment, getDashboard }
