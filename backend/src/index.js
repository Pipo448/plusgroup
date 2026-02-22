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

const app  = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================

// Sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }  // ✅ Pèmèt imaj/fichye chaje cross-origin
}));

// ✅ CORS KORIJE - Aksepte tou de frontend yo (port 3000 ak 5173)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://plusgroup-frontend.onrender.com',  // ← AJOUTE SA!
    /\.plusinnovation\.ht$/,
    /\.onrender\.com$/  // ← AJOUTE SA TOU (aksepte tout Render apps)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug']
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { success: false, message: 'Twòp demann. Tanpri tann yon ti tan.' }
}));

// Rate limiting strict pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Twòp tantativ. Tann 15 minit.' }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

// Fichiers statiques (logos, images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================================
// ROUTES
// ============================================================

const API = '/api/v1';

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    app: 'PLUS GROUP — Innov@tion & Tech SaaS API',
    version: process.env.APP_VERSION || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Super Admin
app.use(`${API}/admin`, adminRoutes);

// Auth (avec rate limiting)
app.use(`${API}/auth`, authLimiter, authRoutes);

// Routes protégées (nécessitent tenant + user auth)
app.use(`${API}/tenant`, tenantRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/clients`, clientRoutes);
app.use(`${API}/quotes`, quoteRoutes);
app.use(`${API}/invoices`, invoiceRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/stock`, stockRoutes);
app.use(`${API}/reports`, reportRoutes);

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
  logger.info(`✅ CORS aktivé pou: localhost:3000, localhost:5173`);
});

module.exports = app;
