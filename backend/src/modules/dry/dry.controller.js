// src/modules/dry/dry.controller.js
const { asyncHandler } = require('../../middleware/errorHandler')
const svc = require('./dry.service')

const getAll       = asyncHandler(async (req, res) => {
  const data = await svc.getAll(req.tenant.id, { ...req.query, branchId: req.branchId || undefined })
  res.json({ success: true, ...data })
})

const getOne       = asyncHandler(async (req, res) => {
  const data = await svc.getOne(req.tenant.id, req.params.id)
  res.json({ success: true, order: data })
})

const create       = asyncHandler(async (req, res) => {
  const data = await svc.create(req.tenant.id, req.user.id, {
    ...req.body, branchId: req.body.branchId || req.branchId || null
  })
  res.status(201).json({ success: true, order: data, message: 'Lod prese kreye.' })
})

const updateStatus = asyncHandler(async (req, res) => {
  const { status, cancelReason } = req.body
  const data = await svc.updateStatus(req.tenant.id, req.params.id, status, cancelReason)
  res.json({ success: true, order: data, message: 'Statut mete ajou.' })
})

const addPayment   = asyncHandler(async (req, res) => {
  const data = await svc.addPayment(req.tenant.id, req.params.id, req.user.id, req.body)
  res.json({ success: true, order: data, message: 'Peman anrejistre.' })
})

const getDashboard = asyncHandler(async (req, res) => {
  const data = await svc.getDashboard(req.tenant.id, req.branchId || null)
  res.json({ success: true, dashboard: data })
})

const getCatalog       = asyncHandler(async (req, res) => {
  const items = await svc.getCatalog(req.tenant.id)
  res.json({ success: true, items })
})

const createCatalogItem = asyncHandler(async (req, res) => {
  const item = await svc.createCatalogItem(req.tenant.id, req.body)
  res.status(201).json({ success: true, item, message: 'Atik ajoute nan katalòg.' })
})

const updateCatalogItem = asyncHandler(async (req, res) => {
  const item = await svc.updateCatalogItem(req.tenant.id, req.params.id, req.body)
  res.json({ success: true, item, message: 'Atik mete ajou.' })
})

const deleteCatalogItem = asyncHandler(async (req, res) => {
  await svc.deleteCatalogItem(req.tenant.id, req.params.id)
  res.json({ success: true, message: 'Atik retire nan katalòg.' })
})

module.exports = {
  getAll, getOne, create, updateStatus, addPayment, getDashboard,
  getCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem,
}
