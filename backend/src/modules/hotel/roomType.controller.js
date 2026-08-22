// backend/src/modules/hotel/roomType.controller.js
const prisma = require('../../lib/prisma')

// ── To chanj USD/HTG jodi a (Paramèt > Taux & Devise), pou pri USD la pa janm antre manyèlman ──
const getUsdRate = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { exchangeRate: true, exchangeRates: true },
  })
  let ratesObj = {}
  try { ratesObj = tenant?.exchangeRates ? JSON.parse(tenant.exchangeRates) : {} } catch { ratesObj = {} }
  return parseFloat(ratesObj.USD || tenant?.exchangeRate || 0) || 0
}

const getAll = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId
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
    const tenantId = req.user?.tenantId
    const { name, description, priceHtg, maxAdults, maxChildren, amenities } = req.body

    if (!name || !priceHtg) {
      return res.status(400).json({ success: false, message: 'Non ak pri obligatwa' })
    }

    const htg = parseFloat(priceHtg)
    const usdRate = await getUsdRate(tenantId)
    const priceUsd = usdRate > 0 ? Math.round((htg / usdRate) * 100) / 100 : 0

    const roomType = await prisma.roomType.create({
      data: {
        tenantId,
        name,
        description,
        priceHtg: htg,
        priceUsd, // toujou kalkile — jamè valè client la voye a
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
    const tenantId = req.user?.tenantId
    const { id } = req.params
    const { name, description, priceHtg, maxAdults, maxChildren, amenities, isActive } = req.body

    const existing = await prisma.roomType.findFirst({ where: { id, tenantId } })
    if (!existing) return res.status(404).json({ success: false, message: 'Tip chanm pa jwenn' })

    // priceUsd toujou kalkile soti nan (nouvo oswa ansyen) priceHtg + to jodi a — jamè aksepte valè client la
    let usdUpdate = {}
    if (priceHtg !== undefined) {
      const htg = parseFloat(priceHtg)
      const usdRate = await getUsdRate(tenantId)
      usdUpdate = { priceUsd: usdRate > 0 ? Math.round((htg / usdRate) * 100) / 100 : 0 }
    }

    const roomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priceHtg    !== undefined && { priceHtg: parseFloat(priceHtg) }),
        ...usdUpdate,
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
    const tenantId = req.user?.tenantId
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
