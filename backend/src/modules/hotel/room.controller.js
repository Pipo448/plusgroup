// backend/src/modules/hotel/room.controller.js
const prisma = require('../../lib/prisma')

const getAll = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const rooms = await prisma.room.findMany({
      where: { tenantId, ...(branchId && { branchId }) },
      include: {
        roomType: true,
        reservations: {
          where: { status: { in: ['confirmed', 'checked_in'] } },
          select: { id: true, status: true, checkIn: true, checkOut: true, clientSnapshot: true },
          take: 1,
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })
    res.json({ success: true, data: rooms })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getAvailable = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const { checkIn, checkOut } = req.query

    const busyRoomIds = checkIn && checkOut
      ? (await prisma.reservation.findMany({
          where: {
            tenantId,
            status: { in: ['confirmed', 'checked_in'] },
            checkIn:  { lte: new Date(checkOut) },
            checkOut: { gte: new Date(checkIn) },
          },
          select: { roomId: true },
        })).map(r => r.roomId)
      : []

    const rooms = await prisma.room.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        isActive: true,
        status: 'available',
        id: { notIn: busyRoomIds },
      },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })
    res.json({ success: true, data: rooms })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getOne = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const { id } = req.params
    const room = await prisma.room.findFirst({
      where: { id, tenantId },
      include: {
        roomType: true,
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { client: { select: { id: true, name: true, phone: true } } },
        },
      },
    })
    if (!room) return res.status(404).json({ success: false, message: 'Chanm pa jwenn' })
    res.json({ success: true, data: room })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const create = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const { roomTypeId, number, floor, description } = req.body

    if (!roomTypeId || !number) {
      return res.status(400).json({ success: false, message: 'Tip chanm ak nimewo obligatwa' })
    }

    const room = await prisma.room.create({
      data: {
        tenant:      { connect: { id: tenantId } },
        roomType:    { connect: { id: roomTypeId } },
        ...(branchId && { branch: { connect: { id: branchId } } }),
        number,
        floor:       (floor !== undefined && floor !== null && floor !== '') ? parseInt(floor) : 0,
        description: description || null,
      },
      include: { roomType: true },
    })
    res.status(201).json({ success: true, data: room })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Nimewo chanm sa deja egziste' })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

const update = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const { id } = req.params
    const { roomTypeId, number, floor, description, isActive } = req.body

    const existing = await prisma.room.findFirst({ where: { id, tenantId } })
    if (!existing) return res.status(404).json({ success: false, message: 'Chanm pa jwenn' })

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(roomTypeId   !== undefined && { roomTypeId }),
        ...(number       !== undefined && { number }),
        ...(floor        !== undefined && { floor: parseInt(floor) }),
        ...(description  !== undefined && { description }),
        ...(isActive     !== undefined && { isActive }),
      },
      include: { roomType: true },
    })
    res.json({ success: true, data: room })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const updateStatus = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estati pa valid' })
    }

    const existing = await prisma.room.findFirst({ where: { id, tenantId } })
    if (!existing) return res.status(404).json({ success: false, message: 'Chanm pa jwenn' })

    const room = await prisma.room.update({
      where: { id },
      data: { status },
      include: { roomType: true },
    })
    res.json({ success: true, data: room })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getAll, getAvailable, getOne, create, update, updateStatus }