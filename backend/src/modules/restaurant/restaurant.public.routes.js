// src/modules/restaurant/restaurant.public.routes.js
// Wout PIBLIK pòtal kliyan an — PA GEN otantifikasyon.
// Monte l nan index.js AVAN nenpòt middleware auth global:
//   app.use('/api/public/resto', require('./src/modules/restaurant/restaurant.public.routes'));
const express = require('express');
const router  = express.Router();
const pub = require('./restaurant.public.service');
const { handle } = require('./restaurant.db');

// ── Limit senp pa IP pou anpeche spam (8 demann / 10 minit pa wout)
const hits = new Map();
function rateLimit(max = 8, windowMs = 10 * 60 * 1000) {
  return (req, res, next) => {
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || 'x';
    const key = `${ip}|${req.baseUrl}${req.route?.path || req.path}`;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ success: false, code: 'TOO_MANY', message: 'Twòp demann. Eseye pita.' });
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    next();
  };
}

const sendImage = (img, res) => {
  if (img.redirect) return res.redirect(302, img.redirect);
  res.set('Content-Type', img.type);
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.send(img.buffer);
};

// ── Anyè Plus Resto: GET /public/resto?lat=&lng=&q=&city=&delivery=1&open=1
// (dwe vini ANVAN '/:slug')
router.get('/', rateLimit(120, 60 * 1000), handle(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ success: true, ...(await pub.listDirectory(req.query)) });
}));

router.get('/:slug', handle(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ success: true, ...(await pub.getPortal(req.params.slug)) });
}));

router.get('/:slug/logo', handle(async (req, res) => sendImage(await pub.getLogo(req.params.slug), res)));

router.get('/:slug/image/:productId', handle(async (req, res) => sendImage(await pub.getItemImage(req.params.slug, req.params.productId), res)));

router.post('/:slug/orders', rateLimit(6), handle(async (req, res) => {
  const order = await pub.createOrder(req.params.slug, req.body || {});
  res.status(201).json({ success: true, order });
}));

router.get('/:slug/orders/:code', rateLimit(120), handle(async (req, res) => {
  const order = await pub.trackOrder(req.params.slug, req.params.code, req.query.phone);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, order });
}));

router.post('/:slug/orders/:code/rating', rateLimit(10), handle(async (req, res) => {
  res.json({ success: true, ...(await pub.rateOrder(req.params.slug, req.params.code, req.body || {})) });
}));

router.get('/:slug/reservations/availability', handle(async (req, res) => {
  res.json({ success: true, ...(await pub.availability(req.params.slug, req.query.date)) });
}));

router.post('/:slug/reservations', rateLimit(6), handle(async (req, res) => {
  const reservation = await pub.createReservation(req.params.slug, req.body || {});
  res.status(201).json({ success: true, reservation });
}));

router.get('/:slug/reservations/:code', rateLimit(60), handle(async (req, res) => {
  const reservation = await pub.trackReservation(req.params.slug, req.params.code, req.query.phone);
  res.json({ success: true, reservation });
}));

module.exports = router;
