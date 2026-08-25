// ============================================================
// PLUS GROUP — Innov@tion & Tech | SaaS API v2.0.1
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
// ✅ NOUVO — Devi Dirèk (pwodui/sèvis ki pa nan katalòg estòk)
const directQuoteRoutes = require('./modules/direct-quotes/direct-quote.routes');
// ✅ NOUVO — Restoran (Meni Manje/Bwason)
const restaurantRoutes = require('./modules/restaurant/restaurant.routes');
const invoiceRoutes = require('./modules/invoices/invoice.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const stockRoutes   = require('./modules/stock/stock.routes');
const reportRoutes  = require('./modules/reports/report.routes');
const branchRoutes  = require('./modules/branches/branch.routes');
const notifRoutes   = require('./modules/notifications/notification.routes');
const kaneEpayRoutes    = require('./modules/kane-epay/kane-epay.routes');
const tenantPagesRoutes = require('./modules/admin/tenant-pages.routes');
const sabotayRoutes = require('./modules/sabotay/sabotay.routes');
const solRoutes = require('./routes/sol.routes');
const hotelRoutes = require('./modules/hotel/hotel.routes')
const dashboardFullRoute = require('./modules/reports/dashboard-full.route');
const pushRoutes = require('./modules/push/push.routes')
const dryRoutes = require('./modules/dry/dry.routes')
const preRoutes = require('./routes/pre.routes')
const klinikRoutes = require('./routes/klinik.routes')   // ✅ NOUVO
const pgEmployeesRoutes = require('./routes/pg-employees.routes')
const pgExpensesRoutes  = require('./routes/pg-expenses.routes')
const mikwoExpensesRoutes = require('./routes/mikwo-expenses.routes')
const mikwoProfitRoutes   = require('./routes/mikwo-profit.routes')
const internetRoutes      = require('./modules/internet/internet.routes')
const adminFinRoutes      = require('./routes/admin-finances.routes')
// ⚠️ NOUVO — Pòtal Ajan (kandidati piblik, login, dashboard ajan)
const agentRoutes         = require('./modules/agents/agent.routes')
// ⚠️ NOUVO — Enskripsyon otonòm antrepriz (piblik + lis plan)
const publicSignupRoutes  = require('./modules/tenants/public-signup.routes')
// ✅ NOUVO — Sekirite: PIN pou aksyon sansib (efasman finansye)
const securityRoutes      = require('./modules/security/pin.routes')
// ✅ NOUVO — Founisè: kapital, founisè, achte (alimante estòk + pri kout)
const founiseRoutes       = require('./modules/founise/founise.routes')
// ✅ NOUVO — Sesyon Kès (kontwòl kòb pa kesye) + Kontwòl Estòk (rapò konte fizik)
const kesSesyonRoutes     = require('./modules/kes-sesyon/kes-sesyon.routes')
const estokKontwolRoutes  = require('./modules/estok-kontwol/estok-kontwol.routes')
// ✅ NOUVO — Restoran: tab ak kòmand louvri
const restaurantTablesRoutes = require('./modules/restaurant-tables/restaurant-tables.routes')

// ✅ Scheduler — cron jobs (Sabotay Sol reminders)
const { startScheduler } = require('./jobs/scheduler')

// ✅ Enterprise routes (Plan Antrepriz sèlman)
const { kaneRouter, moncashRouter, natcashRouter } = require('./routes/enterprise.routes');

const app  = require('express')();
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
    /\.onrender\.com$/,
    // ✅ NOUVO — Capacitor Android / iOS (APK)
    'https://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    /^http:\/\/localhost(:\d+)?$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'X-Branch-Id']
}));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
});

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
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// ✅ KOREKSYON KRITIK — tenantPagesRoutes DOIT vini ANVAN adminRoutes
app.use(`${API}/admin/tenants/:id/pages`, tenantPagesRoutes);

// Super Admin
app.use(`${API}/admin`, adminRoutes);

// Auth
app.use(`${API}/auth`, authLimiter, authRoutes);

// ✅ NOUVO — Sekirite: PIN pou aksyon sansib (setup/status/change)
app.use(`${API}/security`, securityRoutes);

// Routes protégées
app.use(`${API}/tenant`,        tenantRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/products`,      productRoutes);
app.use(`${API}/clients`,       clientRoutes);
app.use(`${API}/quotes`,        quoteRoutes);
// ✅ NOUVO — Devi Dirèk
app.use(`${API}/direct-quotes`, directQuoteRoutes);
// ✅ NOUVO — Restoran
app.use(`${API}/restaurant`, restaurantRoutes);
app.use(`${API}/invoices`,      invoiceRoutes);
app.use(`${API}/payments`,      paymentRoutes);
app.use(`${API}/stock`,         stockRoutes);
app.use(`${API}/reports`,       reportRoutes);
app.use(`${API}/branches`,      branchRoutes);
app.use(`${API}/notifications`, notifRoutes);
app.use(`${API}/kane-epay`,     kaneEpayRoutes);
app.use(`${API}/hotel`,         hotelRoutes)
app.use(`${API}/dashboard`,     dashboardFullRoute);
app.use('/api/v1/push',         pushRoutes);
app.use('/api/v1/dry',          dryRoutes)
app.use(`${API}/pre`,           preRoutes)
app.use(`${API}/klinik`,        klinikRoutes)    // ✅ NOUVO
app.use(`${API}/pg-employees`, pgEmployeesRoutes)
app.use(`${API}/pg-expenses`,  pgExpensesRoutes)
// ✅ NOUVO — Founisè: kapital, founisè, achte
app.use(`${API}/founise`,      founiseRoutes)
// ✅ NOUVO — Sesyon Kès + Kontwòl Estòk
app.use(`${API}/kes-sesyon`,     kesSesyonRoutes)
app.use(`${API}/estok-kontwol`,  estokKontwolRoutes)
// ✅ NOUVO — Restoran: tab ak kòmand
app.use(`${API}/restaurant-tables`, restaurantTablesRoutes)
app.use(`${API}/mikwo-expenses`, mikwoExpensesRoutes)
app.use(`${API}/mikwo-profit`,   mikwoProfitRoutes)
app.use(`${API}/internet`,   internetRoutes);
app.use(`${API}/admin-finances`, adminFinRoutes);
// ⚠️ NOUVO — Pòtal Ajan
app.use(`${API}/agents`, agentRoutes);
// ⚠️ NOUVO — Enskripsyon otonòm antrepriz (piblik)
app.use(`${API}/public`, publicSignupRoutes);

// ✅ SABOTAY
app.use(`${API}/sabotay`,       sabotayRoutes);

// ✅ Sol Member Portal
app.use(`${API}/sol`,           solRoutes);
app.use('/api/sol',             solRoutes);

// ✅ Enterprise routes
app.use(`${API}/kane`,    kaneRouter);
app.use(`${API}/moncash`, moncashRouter);
app.use(`${API}/natcash`, natcashRouter);

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

// ============================================================
// DÉMARRAGE
// ============================================================

const server = require('http').createServer(app);
server.listen(PORT, () => {
  logger.info(`🚀 PLUS GROUP SaaS API démarré sur le port ${PORT}`);
  logger.info(`📦 Environnement: ${process.env.NODE_ENV}`);
  logger.info(`🌐 URL: ${process.env.API_URL}`);
  logger.info(`✅ CORS aktivé pou: localhost, plusgroup-frontend.onrender.com, app.plusgroupe.com, Capacitor APK`);

  startScheduler();
});

module.exports = app;