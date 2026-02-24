// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppLayout      from './components/layout/AppLayout'
import LoginPage      from './pages/auth/LoginPage'
import Dashboard      from './pages/dashboard/Dashboard'
import ProductsPage   from './pages/products/ProductsPage'
import ClientsPage    from './pages/clients/ClientsPage'
import QuotesPage     from './pages/quotes/QuotesPage'
import QuoteForm      from './pages/quotes/QuoteForm'
import QuoteDetail    from './pages/quotes/QuoteDetail'
import InvoicesPage   from './pages/invoices/InvoicesPage'
import InvoiceDetail  from './pages/invoices/InvoiceDetail'
import StockPage      from './pages/stock/StockPage'
import ReportsPage    from './pages/reports/ReportsPage'
import SettingsPage   from './pages/settings/SettingsPage'
import UsersPage      from './pages/settings/UsersPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'

// ✅ Guard tenant — tann loading anvan deside
const PrivateRoute = ({ children }) => {
  const token   = useAuthStore(s => s.token)
  const loading = useAuthStore(s => s.loading)

  // Tann verifikasyon token fin fèt anvan redirect
  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a'
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #1e40af',
        borderTop: '3px solid #60a5fa',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return token ? children : <Navigate to="/login" replace />
}

// Guard super admin
const AdminRoute = ({ children }) => {
  const session = localStorage.getItem('pg-admin')
  return session ? children : <Navigate to="/admin/login" replace />
}

// ✅ ROOT ROUTE HANDLER - Fix pou apèsi/crash
const RootRedirect = () => {
  const token   = useAuthStore(s => s.token)
  const loading = useAuthStore(s => s.loading)

  // Tann loading fini anvan redirect
  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a'
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #1e40af',
        borderTop: '3px solid #60a5fa',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Redirect selon si user konekte oswa pa
  return token 
    ? <Navigate to="/dashboard" replace /> 
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ✅ ROOT ROUTE - Redirect smooth san apèsi */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth tenant */}
        <Route path="/login" element={<LoginPage />} />

        {/* Super Admin */}
        <Route path="/admin/login"     element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin"           element={<Navigate to="/admin/login" replace />} />

        {/* App principal protégé */}
        <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="products"         element={<ProductsPage />} />
          <Route path="clients"          element={<ClientsPage />} />
          <Route path="quotes"           element={<QuotesPage />} />
          <Route path="quotes/new"       element={<QuoteForm />} />
          <Route path="quotes/:id"       element={<QuoteDetail />} />
          <Route path="quotes/:id/edit"  element={<QuoteForm />} />
          <Route path="invoices"         element={<InvoicesPage />} />
          <Route path="invoices/:id"     element={<InvoiceDetail />} />
          <Route path="stock"            element={<StockPage />} />
          <Route path="reports"          element={<ReportsPage />} />
          <Route path="settings"         element={<SettingsPage />} />
          <Route path="settings/users"   element={<UsersPage />} />
        </Route>

        {/* ✅ Legacy routes - redirect to /app structure */}
        <Route path="/dashboard"        element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/products"         element={<Navigate to="/app/products" replace />} />
        <Route path="/clients"          element={<Navigate to="/app/clients" replace />} />
        <Route path="/quotes"           element={<Navigate to="/app/quotes" replace />} />
        <Route path="/quotes/*"         element={<Navigate to="/app/quotes" replace />} />
        <Route path="/invoices"         element={<Navigate to="/app/invoices" replace />} />
        <Route path="/invoices/*"       element={<Navigate to="/app/invoices" replace />} />
        <Route path="/stock"            element={<Navigate to="/app/stock" replace />} />
        <Route path="/reports"          element={<Navigate to="/app/reports" replace />} />
        <Route path="/settings"         element={<Navigate to="/app/settings" replace />} />
        <Route path="/settings/*"       element={<Navigate to="/app/settings" replace />} />

        {/* ✅ Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
