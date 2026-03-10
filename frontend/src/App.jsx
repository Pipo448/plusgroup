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
import NewInvoicePage from './pages/invoices/NewInvoicePage'

// ✅ Paj Enterprise + Branch
import BranchAdminPage from './pages/branches/BranchAdminPage'
import KanePage        from './pages/enterprise/KanePage'
import KaneEpayPage    from './pages/enterprise/KaneEpayPage'
import SabotayPage     from './pages/enterprise/SabotayPage'
import MobilPayPage    from './pages/enterprise/MobilPayPage'

// ✅ Plans Page
import PlansPage from './pages/plans/PlansPage'

// ✅ Welcome Page
import WelcomePage from './pages/WelcomePage'

// ✅ Sol Member Portal
import SolLoginPage     from './pages/sol/SolLoginPage'
import SolDashboardPage from './pages/sol/SolDashboardPage'

// ✅ Hotel
import HotelDashboard    from './pages/hotel/HotelDashboard'
import ReservationsPage  from './pages/hotel/ReservationsPage'
import NewReservationPage from './pages/hotel/NewReservationPage'
import ReservationDetail from './pages/hotel/ReservationDetail'
import NewRoomPage from './pages/hotel/NewRoomPage'
import RoomTypesPage from './pages/hotel/RoomTypesPage'

const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#070a0f' }}>
    <div style={{ width:40, height:40, border:'3px solid rgba(255,107,0,0.2)', borderTop:'3px solid #FF6B00', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

const PrivateRoute = ({ children }) => {
  const token   = useAuthStore(s => s.token)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <Spinner />
  return token ? children : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }) => {
  const session = localStorage.getItem('pg-admin')
  return session ? children : <Navigate to="/admin/login" replace />
}

// ✅ Verifye si super admin te bloke paj la
const ProtectedPage = ({ pageKey, children }) => {
  const tenant = useAuthStore(s => s.tenant)
  const ap = tenant?.allowedPages
const ProtectedPage = ({ pageKey, children }) => {
  const tenant = useAuthStore(s => s.tenant)
  const ap = tenant?.allowedPages
  if (ap && typeof ap === 'object' && ap[pageKey] === false) {
    return <Navigate to="/app/dashboard" replace />
  }
  return children
}
  if (ap && typeof ap === 'object' && ap[pageKey] === false) {
    return <Navigate to="/app/dashboard" replace />
  }
  return children
}

// ✅ Si deja konekte → ale nan dashboard, sinon → WelcomePage
const RootRedirect = () => {
  const token   = useAuthStore(s => s.token)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <Spinner />
  return token
    ? <Navigate to="/app/dashboard" replace />
    : <WelcomePage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ✅ Root — WelcomePage (si pa konekte) sinon dashboard */}
        <Route path="/" element={<RootRedirect />} />

        {/* ✅ Welcome direct access */}
        <Route path="/welcome" element={<WelcomePage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Super Admin */}
        <Route path="/admin/login"     element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin"           element={<Navigate to="/admin/login" replace />} />

        {/* ✅ Sol Member Portal — ANDEYÒ PrivateRoute (manm pa gen token admin) */}
        <Route path="/app/sol/login"     element={<SolLoginPage />} />
        <Route path="/app/sol/dashboard" element={<SolDashboardPage />} />

        {/* ✅ App principal */}
        <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="products"         element={<ProtectedPage pageKey="products"><ProductsPage /></ProtectedPage>} />
          <Route path="clients"          element={<ProtectedPage pageKey="clients"><ClientsPage /></ProtectedPage>} />
          <Route path="quotes"           element={<ProtectedPage pageKey="quotes"><QuotesPage /></ProtectedPage>} />
          <Route path="quotes/new"       element={<QuoteForm />} />
          <Route path="quotes/:id"       element={<QuoteDetail />} />
          <Route path="quotes/:id/edit"  element={<QuoteForm />} />
          <Route path="invoices"         element={<ProtectedPage pageKey="invoices"><InvoicesPage /></ProtectedPage>} />
          <Route path="invoices/new"     element={<NewInvoicePage />} />
          <Route path="invoices/:id"     element={<InvoiceDetail />} />
          <Route path="stock"            element={<ProtectedPage pageKey="stock"><StockPage /></ProtectedPage>} />
          <Route path="reports"          element={<ProtectedPage pageKey="reports"><ReportsPage /></ProtectedPage>} />
          <Route path="settings"         element={<ProtectedPage pageKey="settings"><SettingsPage /></ProtectedPage>} />
          <Route path="settings/users"   element={<ProtectedPage pageKey="users"><UsersPage /></ProtectedPage>} />

          {/* ✅ Plans */}
          <Route path="plans"            element={<PlansPage />} />

          {/* ✅ Branch Management */}
          <Route path="branches"         element={<ProtectedPage pageKey="branches"><BranchAdminPage /></ProtectedPage>} />

          {/* ✅ Enterprise */}
          <Route path="kane"             element={<ProtectedPage pageKey="kane"><KanePage /></ProtectedPage>} />
          <Route path="kane-epay"        element={<ProtectedPage pageKey="kane-epay"><KaneEpayPage /></ProtectedPage>} />
          <Route path="sabotay"          element={<ProtectedPage pageKey="sabotay"><SabotayPage /></ProtectedPage>} />
          <Route path="mobilpay"         element={<ProtectedPage pageKey="mobilpay"><MobilPayPage /></ProtectedPage>} />

          {/* ✅ Hotel */}
          <Route path="hotel"                       element={<ProtectedPage pageKey="hotel"><HotelDashboard /></ProtectedPage>} />
          <Route path="hotel/reservations"          element={<ProtectedPage pageKey="hotel"><ReservationsPage /></ProtectedPage>} />
          <Route path="hotel/reservations/new"      element={<ProtectedPage pageKey="hotel"><NewReservationPage /></ProtectedPage>} />
          <Route path="hotel/reservations/:id"      element={<ProtectedPage pageKey="hotel"><ReservationDetail /></ProtectedPage>} />
          <Route path="hotel/rooms/new" element={<ProtectedPage pageKey="hotel"><NewRoomPage /></ProtectedPage>} />
          <Route path="hotel/room-types" element={<ProtectedPage pageKey="hotel"><RoomTypesPage /></ProtectedPage>} />
        </Route>

        {/* Legacy redirects */}
        <Route path="/dashboard"      element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/products"       element={<Navigate to="/app/products"  replace />} />
        <Route path="/clients"        element={<Navigate to="/app/clients"   replace />} />
        <Route path="/quotes/*"       element={<Navigate to="/app/quotes"    replace />} />
        <Route path="/invoices/*"     element={<Navigate to="/app/invoices"  replace />} />
        <Route path="/stock"          element={<Navigate to="/app/stock"     replace />} />
        <Route path="/reports"        element={<Navigate to="/app/reports"   replace />} />
        <Route path="/settings/users" element={<Navigate to="/app/settings/users" replace />} />
        <Route path="/settings"       element={<Navigate to="/app/settings"  replace />} />
        <Route path="/branches"       element={<Navigate to="/app/branches"  replace />} />
        <Route path="/kane"           element={<Navigate to="/app/kane"      replace />} />
        <Route path="/kane-epay"      element={<Navigate to="/app/kane-epay" replace />} />
        <Route path="/sabotay"        element={<Navigate to="/app/sabotay"   replace />} />
        <Route path="/mobilpay"       element={<Navigate to="/app/mobilpay"  replace />} />
        <Route path="/plans"          element={<Navigate to="/app/plans"     replace />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}