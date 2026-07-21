// src/App.jsx — PLUS GROUP (klinik retire — app separe)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/layout/AppLayout'

import LoginPage      from './pages/auth/LoginPage'
import WelcomePage    from './pages/WelcomePage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import SolLoginPage   from './pages/sol/SolLoginPage'

const Dashboard          = lazy(() => import('./pages/dashboard/Dashboard'))
const ProductsPage       = lazy(() => import('./pages/products/ProductsPage'))
const ClientsPage        = lazy(() => import('./pages/clients/ClientsPage'))
const QuotesPage         = lazy(() => import('./pages/quotes/QuotesPage'))
const QuoteForm          = lazy(() => import('./pages/quotes/QuoteForm'))
const QuoteDetail        = lazy(() => import('./pages/quotes/QuoteDetail'))
// ✅ NOUVO — Devi Dirèk (pwodui/sèvis ki pa nan katalòg estòk)
const DirectQuotesPage   = lazy(() => import('./pages/direct-quotes/DirectQuotesPage'))
const DirectQuoteForm    = lazy(() => import('./pages/direct-quotes/DirectQuoteForm'))
const DirectQuoteDetail  = lazy(() => import('./pages/direct-quotes/DirectQuoteDetail'))
const InvoicesPage       = lazy(() => import('./pages/invoices/InvoicesPage'))
const InvoiceDetail      = lazy(() => import('./pages/invoices/InvoiceDetail'))
const NewInvoicePage     = lazy(() => import('./pages/invoices/NewInvoicePage'))
const StockPage          = lazy(() => import('./pages/stock/StockPage'))
const ReportsPage        = lazy(() => import('./pages/reports/ReportsPage'))
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'))
const UsersPage          = lazy(() => import('./pages/settings/UsersPage'))
// ✅ NOUVO — Paj tès enprimant (Bluetooth / Sunmi / iMin / Telpo)
const PrinterTestPage    = lazy(() => import('./pages/settings/PrinterTestPage'))
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'))
const PlansPage          = lazy(() => import('./pages/plans/PlansPage'))
const BranchAdminPage    = lazy(() => import('./pages/branches/BranchAdminPage'))
const KanePage           = lazy(() => import('./pages/enterprise/KanePage'))
const KaneEpayPage = lazy(() => import('./pages/enterprise/kane-epay/KaneEpayPage'))
const PrePage = lazy(() => import('./pages/enterprise/pre/PrePage'))
const SabotayPage        = lazy(() => import('./pages/enterprise/SabotayPage'))
const MobilPayPage       = lazy(() => import('./pages/enterprise/MobilPayPage'))
const MikwoKrediGuide    = lazy(() => import('./pages/enterprise/MikwoKrediGuide'))
const SolDashboardPage   = lazy(() => import('./pages/sol/SolDashboardPage'))
const HotelDashboard     = lazy(() => import('./pages/hotel/HotelDashboard'))
// ✅ NOUVO — Restoran
const RestaurantMenuPage = lazy(() => import('./pages/restaurant/RestaurantMenuPage'))
const ReservationsPage   = lazy(() => import('./pages/hotel/ReservationsPage'))
const NewReservationPage = lazy(() => import('./pages/hotel/NewReservationPage'))
const ReservationDetail  = lazy(() => import('./pages/hotel/ReservationDetail'))
const NewRoomPage        = lazy(() => import('./pages/hotel/NewRoomPage'))
const RoomTypesPage      = lazy(() => import('./pages/hotel/RoomTypesPage'))
const DryOrdersPage      = lazy(() => import('./pages/dry/DryOrdersPage'))
const DryOrderDetail     = lazy(() => import('./pages/dry/DryOrderDetail'))
const EmployeesPage      = lazy(() => import('./pages/employees/EmployeesPage'))
const ExpensesPage       = lazy(() => import('./pages/expenses/ExpensesPage'))
const MikwoKrediProfit = lazy(() => import('./pages/enterprise/mikwo-kredi/MikwoKrediProfit'))
const AdminFinancesPage = lazy(() => import('./pages/enterprise/AdminFinancesPage'))

// ✅ NOUVO — Paj piblik pwoforma (san otorizasyon, lyen pataje 24è)
const PublicQuote = lazy(() => import('./pages/public/PublicQuote'))
// ✅ NOUVO
const PublicDirectQuote = lazy(() => import('./pages/public/PublicDirectQuote'))
// ✅ NOUVO — Fakti pataje
const PublicInvoice = lazy(() => import('./pages/public/PublicInvoice'))

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

const ProtectedPage = ({ pageKey, children }) => {
  const tenant = useAuthStore(s => s.tenant)
  const ap = tenant?.allowedPages
  if (ap && typeof ap === 'object' && ap[pageKey] === false) {
    return <Navigate to="/app/dashboard" replace />
  }
  return children
}

const RootRedirect = () => {
  const token   = useAuthStore(s => s.token)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <Spinner />
  return token ? <Navigate to="/app/dashboard" replace /> : <WelcomePage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ✅ NOUVO — Wout PIBLIK (san otorizasyon) pou kliyan wè pwoforma a */}
          <Route path="/proforma/:token" element={<PublicQuote />} />
          {/* ✅ NOUVO — Devi Dirèk pataje */}
          <Route path="/devi-direk/:token" element={<PublicDirectQuote />} />
          {/* ✅ NOUVO — Fakti pataje */}
          <Route path="/facture/:token" element={<PublicInvoice />} />

          <Route path="/admin/login"     element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin"           element={<Navigate to="/admin/login" replace />} />

          <Route path="/app/sol/login"     element={<SolLoginPage />} />
          <Route path="/app/sol/dashboard" element={<SolDashboardPage />} />

          <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"       element={<Dashboard />} />
            <Route path="products"        element={<ProtectedPage pageKey="products"><ProductsPage /></ProtectedPage>} />
            <Route path="clients"         element={<ProtectedPage pageKey="clients"><ClientsPage /></ProtectedPage>} />
            <Route path="quotes"          element={<ProtectedPage pageKey="quotes"><QuotesPage /></ProtectedPage>} />
            <Route path="quotes/new"      element={<QuoteForm />} />
            <Route path="quotes/:id"      element={<QuoteDetail />} />
            <Route path="quotes/:id/edit" element={<QuoteForm />} />
            {/* ✅ NOUVO — Devi Dirèk */}
            <Route path="direct-quotes"          element={<ProtectedPage pageKey="direct-quotes"><DirectQuotesPage /></ProtectedPage>} />
            <Route path="direct-quotes/new"      element={<DirectQuoteForm />} />
            <Route path="direct-quotes/:id"      element={<DirectQuoteDetail />} />
            <Route path="direct-quotes/:id/edit" element={<DirectQuoteForm />} />
            <Route path="invoices"        element={<ProtectedPage pageKey="invoices"><InvoicesPage /></ProtectedPage>} />
            <Route path="invoices/new"    element={<NewInvoicePage />} />
            <Route path="invoices/:id"    element={<InvoiceDetail />} />
            <Route path="stock"           element={<ProtectedPage pageKey="stock"><StockPage /></ProtectedPage>} />
            <Route path="reports"         element={<ProtectedPage pageKey="reports"><ReportsPage /></ProtectedPage>} />
            <Route path="settings"        element={<ProtectedPage pageKey="settings"><SettingsPage /></ProtectedPage>} />
            <Route path="settings/users"  element={<ProtectedPage pageKey="users"><UsersPage /></ProtectedPage>} />
            {/* ✅ NOUVO — Paj tès enprimant (aksesib sèlman nan APK) */}
            <Route path="printer-test"    element={<PrinterTestPage />} />
            <Route path="plans"           element={<PlansPage />} />
            <Route path="branches"        element={<ProtectedPage pageKey="branches"><BranchAdminPage /></ProtectedPage>} />

            <Route path="kane"            element={<ProtectedPage pageKey="kane"><KanePage /></ProtectedPage>} />
            <Route path="kane-epay"       element={<ProtectedPage pageKey="kane-epay"><KaneEpayPage /></ProtectedPage>} />
            <Route path="pre"             element={<ProtectedPage pageKey="pre"><PrePage /></ProtectedPage>} />
            <Route path="sabotay"         element={<ProtectedPage pageKey="sabotay"><SabotayPage /></ProtectedPage>} />
            <Route path="mobilpay"        element={<ProtectedPage pageKey="mobilpay"><MobilPayPage /></ProtectedPage>} />
            <Route path="mikwo-kredi-gid" element={<MikwoKrediGuide />} />

            <Route path="hotel"                  element={<ProtectedPage pageKey="hotel"><HotelDashboard /></ProtectedPage>} />
            <Route path="hotel/reservations"     element={<ProtectedPage pageKey="hotel"><ReservationsPage /></ProtectedPage>} />
            <Route path="hotel/reservations/new" element={<ProtectedPage pageKey="hotel"><NewReservationPage /></ProtectedPage>} />
            <Route path="hotel/reservations/:id" element={<ProtectedPage pageKey="hotel"><ReservationDetail /></ProtectedPage>} />
            <Route path="hotel/rooms/new"        element={<ProtectedPage pageKey="hotel"><NewRoomPage /></ProtectedPage>} />
            <Route path="hotel/room-types"       element={<ProtectedPage pageKey="hotel"><RoomTypesPage /></ProtectedPage>} />
            {/* ✅ NOUVO — Restoran */}
            <Route path="restaurant/menu" element={<ProtectedPage pageKey="restaurant"><RestaurantMenuPage /></ProtectedPage>} />
            <Route path="mikwo-profit" element={<ProtectedPage pageKey="pre"><MikwoKrediProfit/></ProtectedPage>}/>

            <Route path="dry"     element={<ProtectedPage pageKey="dry"><DryOrdersPage /></ProtectedPage>} />
            <Route path="dry/:id" element={<ProtectedPage pageKey="dry"><DryOrderDetail /></ProtectedPage>} />

            {/* ✅ RH & Finans — ANDEDAN /app */}
            <Route path="employees" element={<ProtectedPage pageKey="employees"><EmployeesPage /></ProtectedPage>} />
            <Route path="expenses"  element={<ProtectedPage pageKey="expenses"><ExpensesPage /></ProtectedPage>} />
            <Route path="finances"  element={<AdminFinancesPage />} />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}