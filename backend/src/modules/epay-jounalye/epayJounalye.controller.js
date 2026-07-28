// src/modules/epay-jounalye/epayJounalye.controller.js
const { asyncHandler } = require('../../middleware/errorHandler')
const svc = require('./epayJounalye.service')

const getAll = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, { ...req.query, branchId: req.branchId || req.query.branchId })
  res.json({ success: true, ...data })
})

const getOne = asyncHandler(async (req, res) => {
  const contract = await svc.getOne(req.tenant.id, req.params.id)
  res.json({ success: true, contract })
})

const create = asyncHandler(async (req, res) => {
  const contract = await svc.create(req.tenant.id, req.user.id, {
    ...req.body,
    branchId: req.body.branchId || req.branchId || null
  })
  res.status(201).json({ success: true, contract })
})

const recordPayment = asyncHandler(async (req, res) => {
  const data = await svc.recordPayment(req.tenant.id, req.params.id, req.user.id, req.body)
  res.status(201).json({ success: true, ...data })
})

const cancel = asyncHandler(async (req, res) => {
  const contract = await svc.cancel(req.tenant.id, req.params.id)
  res.json({ success: true, contract })
})

const getConfig = asyncHandler(async (req, res) => {
  res.json({ success: true, bonusDays: svc.BONUS_DAYS, allowedDurations: svc.ALLOWED_DURATIONS })
})

module.exports = { getAll, getOne, create, recordPayment, cancel, getConfig }
