// backend/src/modules/hotel/hotelService.controller.js
const prisma = require('../../lib/prisma')

const getByReservation = async (req, res) => {
  try {
    const { tenantId } = req
    const { id: reservationId } = req.params

    const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })

    const services = await prisma.hotelService.findMany({
      where:   { reservationId, tenantId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ success: true, data: services })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const add = async (req, res) => {
  try {
    const { tenantId, userId } = req
    const { id: reservationId } = req.params
    const { productId, type, description, quantity, unitPriceHtg, notes } = req.body

    const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })
    if (['checked_out', 'cancelled'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Pa ka ajoute sèvis — rezèvasyon fini' })
    }
    if (!description || !unitPriceHtg) {
      return res.status(400).json({ success: false, message: 'Deskripsyon ak pri obligatwa' })
    }

    const qty      = parseFloat(quantity || 1)
    const price    = parseFloat(unitPriceHtg)
    const totalHtg = qty * price

    const service = await prisma.$transaction(async (tx) => {
      const s = await tx.hotelService.create({
        data: {
          tenantId,
          reservationId,
          productId:   productId || null,
          type:        type || 'other',
          description,
          quantity:    qty,
          unitPriceHtg: price,
          totalHtg,
          notes,
          createdBy: userId,
        },
        include: { product: { select: { id: true, name: true } } },
      })

      // Rekalkile total rezèvasyon
      const allServices       = await tx.hotelService.findMany({ where: { reservationId } })
      const servicesTotalHtg  = allServices.reduce((sum, sv) => sum + parseFloat(sv.totalHtg), 0)
      const newTotal          = parseFloat(reservation.roomTotalHtg) + servicesTotalHtg
      const newBalance        = newTotal - parseFloat(reservation.amountPaidHtg)

      await tx.reservation.update({
        where: { id: reservationId },
        data:  { servicesTotalHtg, totalHtg: newTotal, balanceDueHtg: Math.max(0, newBalance) },
      })

      return s
    })

    res.status(201).json({ success: true, data: service })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const remove = async (req, res) => {
  try {
    const { tenantId } = req
    const { serviceId } = req.params

    const service = await prisma.hotelService.findFirst({ where: { id: serviceId, tenantId } })
    if (!service) return res.status(404).json({ success: false, message: 'Sèvis pa jwenn' })

    await prisma.$transaction(async (tx) => {
      await tx.hotelService.delete({ where: { id: serviceId } })

      const reservation      = await tx.reservation.findFirst({ where: { id: service.reservationId } })
      const allServices      = await tx.hotelService.findMany({ where: { reservationId: service.reservationId } })
      const servicesTotalHtg = allServices.reduce((sum, sv) => sum + parseFloat(sv.totalHtg), 0)
      const newTotal         = parseFloat(reservation.roomTotalHtg) + servicesTotalHtg
      const newBalance       = newTotal - parseFloat(reservation.amountPaidHtg)

      await tx.reservation.update({
        where: { id: service.reservationId },
        data:  { servicesTotalHtg, totalHtg: newTotal, balanceDueHtg: Math.max(0, newBalance) },
      })
    })

    res.json({ success: true, message: 'Sèvis efase' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getByReservation, add, remove }
