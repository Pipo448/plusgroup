// ============================================================
// PLUS GROUP — Innov@tion & Tech | SaaS API
// src/index.js — Point d'entrée principal
// ============================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const adminRoutes   = require('./modules/admin/admin.routes');
const authRoutes    = require('./modules/auth/auth.routes');
const tenantRoutes  = require('./modules/tenants/tenant.routes');
const userRoutes    = require('./modules/users/user.routes');
const productRoutes = require('./modules/products/product.routes');
const clientRoutes  = require('./modules/clients/client.routes');
const quoteRoutes   = require('./modules/quotes/quote.routes');
const invoiceRoutes = require('./modules/invoices/invoice.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const stockRoutes   = require('./modules/stock/stock.routes');
const reportRoutes  = require('./modules/reports/report.routes');
const branchRoutes  = require('./modules/branches/branch.routes');
const notifRoutes   = require('./modules/notifications/notification.routes');
const kaneEpayRoutes    = require('./modules/kane-epay/kane-epay.routes');
const tenantPagesRoutes = require('./modules/admin/tenant-pages.routes'); // ✅ NOUVO

// ✅ Enterprise routes (Plan Antepriz sèlman)
const { kaneRouter, sabotayRouter, moncashRouter, natcashRouter } = require('./routes/enterprise.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://plusgroup-frontend.onrender.com',
    'https://app.plusgroupe.com',
    'https://plusgroupe.com',
    /\.plusgroupe\.com$/,
    /\.plusinnovation\.ht$/,
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'X-Branch-Id']
}));

// ✅ FIX CLOUDFLARE CACHE
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Twòp demann. Tanpri tann yon ti tan.' }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Twòp tantativ echèk. Tann 15 minit.' }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================================
// ROUTES
// ============================================================

const API = '/api/v1';

app.get('/', (req, res) => {
  res.json({
    success: true,
    app: 'PLUS GROUP — Innov@tion & Tech SaaS API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health:          '/health',
      setupSuperAdmin: '/api/v1/admin/setup-superadmin',
      admin:           '/api/v1/admin/*',
      auth:            '/api/v1/auth/*',
      branches:        '/api/v1/branches/*',
      notifications:   '/api/v1/notifications/*',
      kane:            '/api/v1/kane/*',
      sabotay:         '/api/v1/sabotay/*',
      moncash:         '/api/v1/moncash/*',
      natcash:         '/api/v1/natcash/*',
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    app: 'PLUS GROUP — Innov@tion & Tech SaaS API',
    version: process.env.APP_VERSION || '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Super Admin
app.use(`${API}/admin`, adminRoutes);

// Auth
app.use(`${API}/auth`, authLimiter, authRoutes);

// Routes protégées
app.use(`${API}/tenant`,        tenantRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/products`,      productRoutes);
app.use(`${API}/clients`,       clientRoutes);
app.use(`${API}/quotes`,        quoteRoutes);
app.use(`${API}/invoices`,      invoiceRoutes);
app.use(`${API}/payments`,      paymentRoutes);
app.use(`${API}/stock`,         stockRoutes);
app.use(`${API}/reports`,       reportRoutes);
app.use(`${API}/branches`,      branchRoutes);
app.use(`${API}/notifications`, notifRoutes);
app.use(`${API}/kane-epay`,     kaneEpayRoutes);

// ✅ NOUVO — Page access control pa tenant
app.use(`${API}/admin/tenants/:id/pages`, tenantPagesRoutes);

// ✅ Enterprise routes
app.use(`${API}/kane`,    kaneRouter);
app.use(`${API}/sabotay`, sabotayRouter);
app.use(`${API}/moncash`, moncashRouter);
app.use(`${API}/natcash`, natcashRouter);

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

// ============================================================
// DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
  logger.info(`🚀 PLUS GROUP SaaS API démarré sur le port ${PORT}`);
  logger.info(`📦 Environnement: ${process.env.NODE_ENV}`);
  logger.info(`🌐 URL: ${process.env.API_URL}`);
  logger.info(`✅ CORS aktivé pou: localhost, plusgroup-frontend.onrender.com, app.plusgroupe.com`);
});

module.exports = app;
