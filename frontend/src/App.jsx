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

// Guard tenant
const PrivateRoute = ({ children }) => {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

// Guard super admin
const AdminRoute = ({ children }) => {
  const session = localStorage.getItem('pg-admin')
  return session ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth tenant */}
        <Route path="/login" element={<LoginPage />} />

        {/* Super Admin */}
        <Route path="/admin/login"     element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin"           element={<Navigate to="/admin/login" replace />} />

        {/* App principal protégé */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
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

        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
