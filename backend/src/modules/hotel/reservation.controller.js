// backend/src/modules/hotel/reservation.controller.js
const prisma = require('../../lib/prisma')

const generateReservationNumber = async (tenantId) => {
  const year  = new Date().getFullYear()
  const count = await prisma.reservation.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  })
  return `RES-${year}-${String(count + 1).padStart(4, '0')}`
}

// ── To chanj USD/HTG jodi a (Paramèt > Taux & Devise) ──
const getUsdRate = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { exchangeRate: true, exchangeRates: true },
  })
  let ratesObj = {}
  try { ratesObj = tenant?.exchangeRates ? JSON.parse(tenant.exchangeRates) : {} } catch { ratesObj = {} }
  return parseFloat(ratesObj.USD || tenant?.exchangeRate || 1) || 1
}

const generateInvoiceNumber = async (tenantId) => {
  const year  = new Date().getFullYear()
  const count = await prisma.invoice.count({ where: { tenantId } })
  return `FAK-${year}-${String(count + 1).padStart(4, '0')}`
}

const getAll = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const { status, type, page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      tenantId,
      ...(branchId && { branchId }),
      ...(status   && { status }),
      ...(type     && { type }),
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          room:     { include: { roomType: true } },
          client:   { select: { id: true, name: true, phone: true } },
          services: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.reservation.count({ where }),
    ])

    res.json({ success: true, data: reservations, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const getOne = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const { id }   = req.params

    const reservation = await prisma.reservation.findFirst({
      where:   { id, tenantId },
      include: {
        room:     { include: { roomType: true } },
        client:   true,
        services: { include: { product: true } },
        payments: true,
        invoice:  true,
      },
    })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })
    res.json({ success: true, data: reservation })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const create = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const userId   = req.user?.id

    const {
      roomId, clientId, adults, children,
      checkIn, checkOut, depositHtg, source, notes,
      // Type
      type = 'nuit',
      // Moman fields
      momentDurationMinutes, momentStartTime, momentEndTime,
      // ── NOUVO: enfo envite espesifik a rezèvasyon sa a (pa mele ak pwofil Kliyan jeneral)
      guestIdPhotoUrl, guestAddress, guestNif,
      // ── NOUVO: metòd peman pou depo/peman inisyal la (moman check-in dirèkteman nan kreyasyon)
      paymentMethod = 'cash',
    } = req.body

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Chanm, check-in ak check-out obligatwa' })
    }

    const room = await prisma.room.findFirst({
      where:   { id: roomId, tenantId },
      include: { roomType: true },
    })
    if (!room) return res.status(404).json({ success: false, message: 'Chanm pa jwenn' })

    // Konfli rezèvasyon
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId,
        status:   { in: ['confirmed', 'checked_in'] },
        checkIn:  { lte: new Date(checkOut) },
        checkOut: { gte: new Date(checkIn) },
      },
    })
    if (conflict) return res.status(400).json({ success: false, message: 'Chanm sa deja rezève pou peryòd sa' })

    // Snapshot kliyan
    let clientSnapshot = { name: 'Kliyan Anonim' }
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
      if (client) clientSnapshot = { id: client.id, name: client.name, phone: client.phone, email: client.email }
    }

    const reservationNumber = await generateReservationNumber(tenantId)
    const deposit = parseFloat(depositHtg || 0)

    // ── Kalkil selon type ──
    let nights        = 0
    let pricePerNight = 0
    let roomTotalHtg  = 0
    let roomStatus    = 'reserved'

    if (type === 'nuit') {
      // ── MODE NUIT
      nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
      if (nights <= 0) return res.status(400).json({ success: false, message: 'Dat yo pa valid' })
      pricePerNight = parseFloat(room.roomType.priceHtg)
      roomTotalHtg  = pricePerNight * nights
      roomStatus    = 'reserved'

    } else {
      // ── MODE MOMAN
      if (!momentDurationMinutes || !momentStartTime) {
        return res.status(400).json({ success: false, message: 'Durasyon ak lè kòmanse obligatwa pou moman' })
      }
      if (!room.roomType.momentPriceHtg) {
        return res.status(400).json({ success: false, message: 'Tip chanm sa pa gen pri moman defini' })
      }
      pricePerNight = parseFloat(room.roomType.momentPriceHtg) // pri fiks moman
      roomTotalHtg  = pricePerNight
      nights        = 0
      roomStatus    = 'occupied' // moman → occupied dirèkteman
    }

    // ── Moman check-in otomatikman nan kreyasyon → jenere Fakti dirèkteman (menm lojik ak check-in Nuit)
    let invoiceForMoman = null
    if (type === 'moman') {
      const usdRate = await getUsdRate(tenantId)
      const invoiceNumber = await generateInvoiceNumber(tenantId)
      invoiceForMoman = { invoiceNumber, exchangeRate: usdRate }
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.create({
        data: {
          tenantId,
          branchId:             branchId || null,
          reservationNumber,
          roomId,
          clientId:             clientId || null,
          clientSnapshot,
          adults:               parseInt(adults || 1),
          children:             parseInt(children || 0),
          type,
          checkIn:              new Date(checkIn),
          checkOut:             new Date(checkOut),
          nights,
          // Moman fields
          ...(type === 'moman' && {
            momentDurationMinutes: parseInt(momentDurationMinutes),
            momentStartTime:      momentStartTime ? new Date(momentStartTime) : null,
            momentEndTime:        momentEndTime   ? new Date(momentEndTime)   : null,
          }),
          pricePerNight,
          roomTotalHtg,
          totalHtg:             roomTotalHtg,
          depositHtg:           deposit,
          amountPaidHtg:        deposit,
          balanceDueHtg:        roomTotalHtg - deposit,
          status:               type === 'moman' ? 'checked_in' : 'confirmed',
          source:               source || 'walk-in',
          notes,
          createdBy:            userId,
          ...(type === 'moman' && { checkedInAt: new Date() }),
          // Enfo envite (opsyonèl)
          ...(guestIdPhotoUrl !== undefined && { guestIdPhotoUrl }),
          ...(guestAddress    !== undefined && { guestAddress }),
          ...(guestNif        !== undefined && { guestNif }),
        },
        include: {
          room:   { include: { roomType: true } },
          client: { select: { id: true, name: true, phone: true } },
        },
      })

      await tx.room.update({ where: { id: roomId }, data: { status: roomStatus } })

      if (deposit > 0) {
        await tx.hotelPayment.create({
          data: {
            tenantId,
            reservationId: r.id,
            amountHtg:     deposit,
            method:        paymentMethod,
            type:          'deposit',
            createdBy:     userId,
          },
        })
      }

      // ── Moman: fakti kreye dirèkteman paske li deja check-in
      let invoice = null
      if (type === 'moman' && invoiceForMoman) {
        invoice = await tx.invoice.create({
          data: {
            tenantId,
            branchId:         branchId || null,
            invoiceNumber:    invoiceForMoman.invoiceNumber,
            clientId:         r.clientId,
            clientSnapshot:   r.clientSnapshot,
            currency:         'HTG',
            exchangeRate:     invoiceForMoman.exchangeRate,
            subtotalHtg:      roomTotalHtg,
            totalHtg:         roomTotalHtg,
            amountPaidHtg:    deposit,
            balanceDueHtg:    Math.max(0, roomTotalHtg - deposit),
            status:           deposit >= roomTotalHtg ? 'paid' : (deposit > 0 ? 'partial' : 'unpaid'),
            notes:            `Check-in ${r.reservationNumber} (Moman)`,
            createdBy:        userId,
            stockDecremented: false,
          },
        })
        await tx.reservation.update({ where: { id: r.id }, data: { invoiceId: invoice.id } })
      }

      return { ...r, invoiceId: invoice?.id || r.invoiceId, invoice }
    })

    res.status(201).json({ success: true, data: reservation })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const checkIn = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const userId   = req.user?.id
    const { id }   = req.params
    const {
      paymentAmountHtg, paymentMethod = 'cash',
      guestIdPhotoUrl, guestAddress, guestNif,
    } = req.body

    const reservation = await prisma.reservation.findFirst({
      where:   { id, tenantId },
      include: { payments: true },
    })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })

    if (reservation.type === 'moman') {
      return res.status(400).json({ success: false, message: 'Moman yo otomatikman checked-in nan kreyasyon' })
    }
    if (reservation.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: `Pa ka check-in — estati: ${reservation.status}` })
    }

    // ── Peman ki fèt kounye a (nan Check-in), anplis depo ki te deja egziste ──
    const paymentNow  = parseFloat(paymentAmountHtg || 0)
    const alreadyPaid = reservation.payments.reduce((sum, p) => sum + parseFloat(p.amountHtg), 0)
    const totalPaid   = alreadyPaid + paymentNow
    const totalHtg    = parseFloat(reservation.totalHtg)
    const balanceDue  = Math.max(0, totalHtg - totalPaid)

    const usdRate        = await getUsdRate(tenantId)
    const invoiceNumber  = await generateInvoiceNumber(tenantId)

    const updated = await prisma.$transaction(async (tx) => {
      // ── Fakti kreye depi Check-in — se la premye moman kliyan an ofisyèlman antre
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          branchId:         branchId || null,
          invoiceNumber,
          clientId:         reservation.clientId,
          clientSnapshot:   reservation.clientSnapshot,
          currency:         'HTG',
          exchangeRate:     usdRate,
          subtotalHtg:      totalHtg,
          totalHtg,
          amountPaidHtg:    totalPaid,
          balanceDueHtg:    balanceDue,
          status:           balanceDue <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid'),
          notes:            `Check-in ${reservation.reservationNumber}`,
          createdBy:        userId,
          stockDecremented: false,
        },
      })

      if (paymentNow > 0) {
        await tx.hotelPayment.create({
          data: {
            tenantId,
            reservationId: id,
            amountHtg:     paymentNow,
            method:        paymentMethod,
            type:          'payment',
            createdBy:     userId,
          },
        })
      }

      const r = await tx.reservation.update({
        where: { id },
        data: {
          status:         'checked_in',
          checkedInAt:    new Date(),
          amountPaidHtg:  totalPaid,
          balanceDueHtg:  balanceDue,
          invoiceId:      invoice.id,
          ...(guestIdPhotoUrl !== undefined && { guestIdPhotoUrl }),
          ...(guestAddress    !== undefined && { guestAddress }),
          ...(guestNif        !== undefined && { guestNif }),
        },
        include: { room: { include: { roomType: true } }, payments: true },
      })
      await tx.room.update({ where: { id: reservation.roomId }, data: { status: 'occupied' } })
      return { reservation: r, invoice }
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const checkOut = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const branchId = req.branchId
    const userId   = req.user?.id
    const { id }   = req.params
    const { paymentMethod = 'cash', notes, momentExtraHours = 0 } = req.body

    const reservation = await prisma.reservation.findFirst({
      where:   { id, tenantId },
      include: { services: true, payments: true, room: { include: { roomType: true } } },
    })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })
    if (reservation.status !== 'checked_in') {
      return res.status(400).json({ success: false, message: `Pa ka check-out — estati: ${reservation.status}` })
    }

    // ── Kalkil total selon type
    let roomTotalHtg       = parseFloat(reservation.roomTotalHtg)
    let momentExtraChargeHtg = 0

    if (reservation.type === 'moman' && momentExtraHours > 0) {
      const perHour = parseFloat(reservation.room.roomType.momentPricePerHourHtg || 0)
      momentExtraChargeHtg = perHour * parseInt(momentExtraHours)
      roomTotalHtg += momentExtraChargeHtg
    }

    const servicesTotalHtg = reservation.services.reduce((sum, s) => sum + parseFloat(s.totalHtg), 0)
    const totalHtg         = roomTotalHtg + servicesTotalHtg
    const alreadyPaid      = reservation.payments.reduce((sum, p) => sum + parseFloat(p.amountHtg), 0)
    const balanceDue       = totalHtg - alreadyPaid

    // ── To chanj jodi a — sèlman itilize si nou dwe kreye yon fakti fallback (ansyen done san fakti check-in)
    const usdRate = await getUsdRate(tenantId)

    const result = await prisma.$transaction(async (tx) => {
      let invoice

      if (reservation.invoiceId) {
        // ── Fakti a deja egziste (kreye nan Check-in) — jis mete l ajou ak fèmen li, PA kreye yon dezyèm
        invoice = await tx.invoice.update({
          where: { id: reservation.invoiceId },
          data: {
            subtotalHtg:   totalHtg,
            totalHtg,
            amountPaidHtg: alreadyPaid, // ap ajou ankò pi ba a apre peman final la
            balanceDueHtg: Math.max(0, balanceDue),
            status:        balanceDue <= 0 ? 'paid' : 'partial',
            notes:         `Check-out ${reservation.reservationNumber}${reservation.type === 'moman' ? ' (Moman)' : ''}`,
          },
        })
      } else {
        // ── Fallback — ansyen rezèvasyon ki pa t gen fakti check-in (done anvan chanjman sa a)
        const invoiceNumber = await generateInvoiceNumber(tenantId)
        invoice = await tx.invoice.create({
          data: {
            tenantId,
            branchId:         branchId || null,
            invoiceNumber,
            clientId:         reservation.clientId,
            clientSnapshot:   reservation.clientSnapshot,
            currency:         'HTG',
            exchangeRate:     usdRate,
            subtotalHtg:      totalHtg,
            totalHtg,
            amountPaidHtg:    alreadyPaid,
            balanceDueHtg:    Math.max(0, balanceDue),
            status:           balanceDue <= 0 ? 'paid' : 'partial',
            notes:            `Check-out ${reservation.reservationNumber}${reservation.type === 'moman' ? ' (Moman)' : ''}`,
            createdBy:        userId,
            stockDecremented: false,
          },
        })
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status:               'checked_out',
          checkedOutAt:         new Date(),
          roomTotalHtg,
          servicesTotalHtg,
          totalHtg,
          amountPaidHtg:        alreadyPaid,
          balanceDueHtg:        Math.max(0, balanceDue),
          invoiceId:            invoice.id,
          // Moman extra
          ...(reservation.type === 'moman' && momentExtraHours > 0 && {
            momentExtraHours:     parseInt(momentExtraHours),
            momentExtraChargeHtg,
          }),
        },
        include: { room: { include: { roomType: true } }, services: true, payments: true },
      })

      // ── Peman final — balans rès la peye konplè nan check-out (menm konpòtman ak anvan)
      if (balanceDue > 0) {
        await tx.hotelPayment.create({
          data: {
            tenantId,
            reservationId: id,
            amountHtg:     balanceDue,
            method:        paymentMethod,
            type:          'payment',
            notes,
            createdBy:     userId,
          },
        })
        // Fakti a ajou ak montan final la apre peman an
        invoice = await tx.invoice.update({
          where: { id: invoice.id },
          data:  { amountPaidHtg: totalHtg, balanceDueHtg: 0, status: 'paid' },
        })
      }

      await tx.room.update({ where: { id: reservation.roomId }, data: { status: 'cleaning' } })

      return { reservation: updated, invoice }
    })

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const cancel = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const { id }   = req.params
    const { cancelReason } = req.body

    const reservation = await prisma.reservation.findFirst({ where: { id, tenantId } })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })
    if (['checked_out', 'cancelled'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Pa ka anile rezèvasyon sa' })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.update({
        where: { id },
        data:  { status: 'cancelled', cancelledAt: new Date(), cancelReason },
      })
      await tx.room.update({ where: { id: reservation.roomId }, data: { status: 'available' } })
      return r
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── Pwolonje moman (ajoute tan)
const extendMoment = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
    const { id }   = req.params
    const { extraMinutes } = req.body

    if (!extraMinutes || extraMinutes <= 0) {
      return res.status(400).json({ success: false, message: 'extraMinutes obligatwa' })
    }

    const reservation = await prisma.reservation.findFirst({
      where:   { id, tenantId },
      include: { room: { include: { roomType: true } } },
    })
    if (!reservation) return res.status(404).json({ success: false, message: 'Rezèvasyon pa jwenn' })
    if (reservation.type !== 'moman') return res.status(400).json({ success: false, message: 'Sèlman moman ka pwolonje' })
    if (reservation.status !== 'checked_in') return res.status(400).json({ success: false, message: 'Rezèvasyon pa aktif' })

    const newDuration = (reservation.momentDurationMinutes || 0) + parseInt(extraMinutes)
    const newEndTime  = reservation.momentEndTime
      ? new Date(new Date(reservation.momentEndTime).getTime() + extraMinutes * 60000)
      : new Date(Date.now() + extraMinutes * 60000)
    const newCheckOut = newEndTime

    // Kalkil chaj siplemantè si gen prix pa zèd
    const perHour    = parseFloat(reservation.room.roomType.momentPricePerHourHtg || 0)
    const extraHours = Math.ceil(extraMinutes / 60)
    const extraCharge = perHour > 0 ? perHour * extraHours : 0

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        momentDurationMinutes: newDuration,
        momentEndTime:         newEndTime,
        checkOut:              newCheckOut,
        roomTotalHtg: {
          increment: extraCharge,
        },
        totalHtg: {
          increment: extraCharge,
        },
        balanceDueHtg: {
          increment: extraCharge,
        },
      },
      include: { room: { include: { roomType: true } } },
    })

    res.json({ success: true, data: updated, extraCharge })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getAll, getOne, create, checkIn, checkOut, cancel, extendMoment }
