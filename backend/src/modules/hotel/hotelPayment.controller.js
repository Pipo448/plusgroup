// backend/src/modules/hotel/hotelPayment.controller.js
const prisma = require('../../lib/prisma')

const getByReservation = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.tenant?.id
    const { id: reservationId } = req.params

    const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })

    const payments = await prisma.hotelPayment.findMany({
      where:   { reservationId, tenantId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ success: true, data: payments })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const add = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.tenant?.id
    const userId   = req.userId   || req.user?.id
    const { id: reservationId } = req.params
    const { amountHtg, method, type = 'payment', reference, notes } = req.body

    if (!amountHtg || parseFloat(amountHtg) <= 0) {
      return res.status(400).json({ success: false, message: 'Montan obligatwa' })
    }

    const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })

    // Kap defansif — sèlman pou peman estanda ('payment'); pa aplike sou depo/kalòn lòt tip ki gen pwòp semantik yo
    const requested   = parseFloat(amountHtg)
    const currentPaid = parseFloat(reservation.amountPaidHtg)
    const totalHtg    = parseFloat(reservation.totalHtg)
    const remaining   = Math.max(0, totalHtg - currentPaid)
    const amount      = type === 'payment' ? Math.min(requested, remaining) : requested

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Rezèvasyon sa deja peye — pa gen balans ki rete' })
    }

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.hotelPayment.create({
        data: {
          tenantId,
          reservationId,
          amountHtg: amount,
          method:    method || 'cash',
          type,
          reference,
          notes,
          createdBy: userId,
        },
      })

      // Mete ajou balans
      const newAmountPaid = parseFloat(reservation.amountPaidHtg) + amount
      const newBalance    = Math.max(0, parseFloat(reservation.totalHtg) - newAmountPaid)

      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          amountPaidHtg: newAmountPaid,
          balanceDueHtg: newBalance,
        },
      })

      // ── Fakti a egziste depi Check-in — senkronize l ak nouvo peman an
      if (reservation.invoiceId) {
        await tx.invoice.update({
          where: { id: reservation.invoiceId },
          data: {
            amountPaidHtg: newAmountPaid,
            balanceDueHtg: newBalance,
            status:        newBalance <= 0 ? 'paid' : 'partial',
          },
        })
      }

      return p
    })

    res.status(201).json({ success: true, data: payment })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getByReservation, add }
