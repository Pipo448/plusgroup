// backend/src/modules/hotel/roomType.controller.js
const prisma = require('../../lib/prisma')

const getAll = async (req, res) => {
  try {
    const { tenantId } = req
    const roomTypes = await prisma.roomType.findMany({
      where: { tenantId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { priceHtg: 'asc' },
    })
    res.json({ success: true, data: roomTypes })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const create = async (req, res) => {
  try {
    const { tenantId } = req
    const { name, description, priceHtg, priceUsd, maxAdults, maxChildren, amenities } = req.body

    if (!name || !priceHtg) {
      return res.status(400).json({ success: false, message: 'Non ak pri obligatwa' })
    }

    const roomType = await prisma.roomType.create({
      data: {
        tenantId,
        name,
        description,
        priceHtg: parseFloat(priceHtg),
        priceUsd: parseFloat(priceUsd || 0),
        maxAdults: parseInt(maxAdults || 2),
        maxChildren: parseInt(maxChildren || 1),
        amenities: amenities || [],
      },
    })
    res.status(201).json({ success: true, data: roomType })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const update = async (req, res) => {
  try {
    const { tenantId } = req
    const { id } = req.params
    const { name, description, priceHtg, priceUsd, maxAdults, maxChildren, amenities, isActive } = req.body

    const existing = await prisma.roomType.findFirst({ where: { id, tenantId } })
    if (!existing) return res.status(404).json({ success: false, message: 'Tip chanm pa jwenn' })

    const roomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priceHtg    !== undefined && { priceHtg: parseFloat(priceHtg) }),
        ...(priceUsd    !== undefined && { priceUsd: parseFloat(priceUsd) }),
        ...(maxAdults   !== undefined && { maxAdults: parseInt(maxAdults) }),
        ...(maxChildren !== undefined && { maxChildren: parseInt(maxChildren) }),
        ...(amenities   !== undefined && { amenities }),
        ...(isActive    !== undefined && { isActive }),
      },
    })
    res.json({ success: true, data: roomType })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const remove = async (req, res) => {
  try {
    const { tenantId } = req
    const { id } = req.params

    const existing = await prisma.roomType.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { rooms: true } } },
    })
    if (!existing) return res.status(404).json({ success: false, message: 'Tip chanm pa jwenn' })
    if (existing._count.rooms > 0) {
      return res.status(400).json({ success: false, message: 'Pa ka efase — gen chanm ki itilize tip sa' })
    }

    await prisma.roomType.delete({ where: { id } })
    res.json({ success: true, message: 'Efase' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getAll, create, update, remove }
