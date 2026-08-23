// backend/src/modules/hotel/hotelService.controller.js
const prisma = require('../../lib/prisma')

const getByReservation = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.tenant?.id
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
    // ── Kovansyon aksè itilizatè a varye ant kontwolè yo nan pwojè a
    // (req.userId dirèk vs req.user?.id). Aksepte 2 pou evite yon
    // 'createdBy' vid ki fè Prisma rejte tout ekriti a ak yon 500.
    const tenantId = req.tenantId || req.user?.tenantId || req.tenant?.id
    const userId   = req.userId   || req.user?.id
    const branchId = req.branchId
    const { id: reservationId } = req.params
    const { productId, quantity, notes } = req.body

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Ou dwe chwazi yon pwodui nan stock — antre manyèl pa aksepte' })
    }

    const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })
    if (['checked_out', 'cancelled'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Pa ka ajoute sèvis — rezèvasyon fini' })
    }

    const qty = parseFloat(quantity || 1)

    // ── Non/pri toujou soti nan pwodui a — jamè fè konfyans a valè fwontyè a.
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId } })
    if (!product) return res.status(404).json({ success: false, message: 'Pwodui pa jwenn' })
    if (!product.isActive) return res.status(400).json({ success: false, message: 'Pwodui sa inaktif' })

    // ── Sèvis (isService:true, egz. Lavaj/Masaj) pa gen stock fizik — pa verifye kantite
    if (!product.isService && Number(product.quantity) < qty) {
      return res.status(400).json({ success: false, message: `Sèlman ${product.quantity} ${product.unit || 'unité'} disponib nan stock pou "${product.name}"` })
    }

    const finalPrice = parseFloat(product.priceHtg)
    const totalHtg    = qty * finalPrice

    const service = await prisma.$transaction(async (tx) => {
      const s = await tx.hotelService.create({
        data: {
          tenantId,
          reservationId,
          productId,
          type:         'other',
          description:  product.name,
          quantity:     qty,
          unitPriceHtg: finalPrice,
          totalHtg,
          notes,
          createdBy: userId,
        },
        include: { product: { select: { id: true, name: true } } },
      })

      // ── Dekremante stock — sèlman pou pwodui fizik (pa sèvis)
      if (!product.isService) {
        const qtyBefore = Number(product.quantity)
        const qtyAfter  = qtyBefore - qty
        await tx.product.update({ where: { id: productId }, data: { quantity: qtyAfter } })
        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId:       branchId || null,
            productId,
            movementType:   'adjustment',
            quantityBefore: qtyBefore,
            quantityChange: -qty,
            quantityAfter:  qtyAfter,
            notes:          `Sèvis rezèvasyon ${reservation.reservationNumber} (Hotel)`,
            createdBy:      userId,
          },
        })
      }

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
    const tenantId = req.tenantId || req.user?.tenantId || req.tenant?.id
    const userId   = req.userId   || req.user?.id
    const branchId = req.branchId
    const { serviceId } = req.params

    const service = await prisma.hotelService.findFirst({ where: { id: serviceId, tenantId } })
    if (!service) return res.status(404).json({ success: false, message: 'Sèvis pa jwenn' })

    await prisma.$transaction(async (tx) => {
      await tx.hotelService.delete({ where: { id: serviceId } })

      // ── Restore stock — sèvis la efase, kidonk atik la pa t reyèlman konsome
      if (service.productId) {
        const product = await tx.product.findFirst({ where: { id: service.productId, tenantId } })
        if (product) {
          const qtyBefore = Number(product.quantity)
          const qtyAfter  = qtyBefore + Number(service.quantity)
          await tx.product.update({ where: { id: service.productId }, data: { quantity: qtyAfter } })
          await tx.stockMovement.create({
            data: {
              tenantId,
              branchId:       branchId || null,
              productId:      service.productId,
              movementType:   'adjustment',
              quantityBefore: qtyBefore,
              quantityChange: Number(service.quantity),
              quantityAfter:  qtyAfter,
              notes:          `Sèvis retire — restorasyon stock (Hotel)`,
              createdBy:      userId,
            },
          })
        }
      }

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
