// src/components/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Package, Users, FileText, Receipt,
  Warehouse, TrendingUp, Settings, LogOut,
  Menu, X, Globe, ChevronDown,
  GitBranch, CreditCard, Smartphone, Phone, Lock, ChevronRight,
  Wallet, Hotel, CalendarDays, Tag,
  Bluetooth, BluetoothOff, Printer, Scissors,
  DollarSign, ChevronUp, BookOpen,
  TrendingDown, UserCog, BarChart2, Calculator, Delete, RefreshCw, UtensilsCrossed,
} from 'lucide-react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { authAPI, branchAPI } from '../../services/api'
import api from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { isAndroid, isSunmi } from '../../services/printerService'
import NotificationBell from '../NotificationBell'

const C = {
  sidebarBg:   '#16192a',
  sidebarTop:  '#0f1117',
  navBg:       '#1e2235',
  gold:        '#f5680c',
  goldLt:      '#ff8534',
  goldDim:     'rgba(245,104,12,0.12)',
  goldBorder:  'rgba(245,104,12,0.20)',
  enterprise:  '#C9A84C',
  entDim:      'rgba(201,168,76,0.15)',
  entBorder:   'rgba(201,168,76,0.28)',
  hotel:       '#0EA5E9',
  hotelDim:    'rgba(14,165,233,0.15)',
  hotelBorder: 'rgba(14,165,233,0.28)',
  // ✅ NOUVO — Restoran
  restaurant:       '#DC2626',
  restaurantDim:    'rgba(220,38,38,0.15)',
  restaurantBorder: 'rgba(220,38,38,0.28)',
  dry:         '#8B5CF6',
  dryDim:      'rgba(139,92,246,0.15)',
  dryBorder:   'rgba(139,92,246,0.28)',
  rh:          '#10B981',
  rhDim:       'rgba(16,185,129,0.15)',
  rhBorder:    'rgba(16,185,129,0.28)',
  white:       '#FFFFFF',
  muted:       'rgba(255,255,255,0.45)',
  mutedMd:     'rgba(255,255,255,0.65)',
  border:      'rgba(255,255,255,0.07)',
  borderGold:  'rgba(245,104,12,0.18)',
  red:         '#ef4444',
  green:       '#22c55e',
}

const NAV = [
  { to:'/app/dashboard', icon:LayoutDashboard, labelKey:'nav.dashboard', pageKey:'dashboard' },
  { to:'/app/products',  icon:Package,         labelKey:'nav.products',  pageKey:'products'  },
  { to:'/app/clients',   icon:Users,           labelKey:'nav.clients',   pageKey:'clients'   },
  { to:'/app/quotes',    icon:FileText,        labelKey:'nav.quotes',    pageKey:'quotes'    },
  // ✅ NOUVO — Devi Dirèk
  { to:'/app/direct-quotes', icon:FileText,    labelKey:'nav.directQuotes', pageKey:'direct-quotes', label:'Devi Dirèk' },
  { to:'/app/invoices',  icon:Receipt,         labelKey:'nav.invoices',  pageKey:'invoices'  },
  { to:'/app/stock',     icon:Warehouse,       labelKey:'nav.stock',     pageKey:'stock'     },
  { to:'/app/reports',   icon:TrendingUp,      labelKey:'nav.reports',   pageKey:'reports'   },
]

const MIKWO_KREDI_ITEMS = [
  { to:'/app/kane-epay',       icon:Wallet,     label:'Kanè Epay', pageKey:'kane-epay' },
  { to:'/app/pre',             icon:DollarSign, label:'Prè',       pageKey:'pre'       },
  { to:'/app/mikwo-kredi-gid', icon:BookOpen,   label:'Gid',       pageKey:null        },
  { to:'/app/mikwo-profit',    icon:BarChart2,  label:'Pwofi/Pèt', pageKey:null        },
]

const ENTERPRISE_ITEMS = [
  { to:'/app/kane',     icon:CreditCard, label:'Ti Kanè Kès',      pageKey:'kane'      },
  { to:'/app/sabotay',  icon:Smartphone, label:'Sabotay',           pageKey:'sabotay'   },
  { to:'/app/mobilpay', icon:Phone,      label:'MonCash / NatCash', pageKey:'mobilpay'  },
]

const HOTEL_ITEMS = [
  { to:'/app/hotel',              icon:Hotel,        label:'Dashboard Hotel', end:true  },
  { to:'/app/hotel/reservations', icon:CalendarDays, label:'Rezèvasyon',      end:false },
  { to:'/app/hotel/room-types',   icon:Tag,          label:'Tip Chanm',       end:false },
]

// ✅ NOUVO — Restoran
const RESTAURANT_ITEMS = [
  { to:'/app/restaurant/menu', icon:UtensilsCrossed, labelKey:'nav.restaurant', label:'Meni Restoran', end:true },
]

const LANGS = [
  { code:'ht', name:'Kreyòl',   flag:'🇭🇹' },
  { code:'fr', name:'Français', flag:'🇫🇷' },
  { code:'en', name:'English',  flag:'🇺🇸' },
]

const ROLE_LABELS = {
  admin:         'Admin',
  cashier:       'Kesye',
  stock_manager: 'Jesyonè Estòk',
  viewer:        'Obsèvatè',
}

const logoSrc = (url) => {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('http')) return url
  return url.startsWith('/') ? url : `/${url}`
}

const safeJson = (val, fallback) => {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fallback }
}

const navLinkStyle = (isActive) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'9px 14px', borderRadius:10, marginBottom:3,
  textDecoration:'none',
  background: isActive ? `linear-gradient(90deg,rgba(245,104,12,0.18) 0%,rgba(245,104,12,0.05) 100%)` : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500, fontSize:13,
})

const enterpriseLinkStyle = (isActive) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'9px 14px', borderRadius:10, marginBottom:3,
  textDecoration:'none',
  background: isActive ? C.entDim : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.enterprise}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500, fontSize:13, cursor:'pointer',
})

const hotelLinkStyle = (isActive) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'9px 14px', borderRadius:10, marginBottom:3,
  textDecoration:'none',
  background: isActive ? C.hotelDim : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.hotel}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500, fontSize:13, cursor:'pointer',
})

// ✅ NOUVO — Restoran
const restaurantLinkStyle = (isActive) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'9px 14px', borderRadius:10, marginBottom:3,
  textDecoration:'none',
  background: isActive ? C.restaurantDim : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.restaurant}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500, fontSize:13, cursor:'pointer',
})

// ✅ NOUVO — Kalkilatris flotan globalize, disponib sou TOUT paj sistèm nan
function CalculatorMenu({ isMobile }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('pad') // 'pad' | 'history'
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('plusgroup-calc-history') || '[]') } catch { return [] }
  })
  const calcRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (calcRef.current && !calcRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const persistHistory = (next) => {
    setHistory(next)
    try { localStorage.setItem('plusgroup-calc-history', JSON.stringify(next.slice(0, 50))) } catch {}
  }

  const calc = (a, b, op) => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '×': return a * b
      case '÷': return b !== 0 ? a / b : 0
      default:  return b
    }
  }

  // ✅ NOUVO — ekspresyon konplè a, pou moun wè egzakteman sa l ap antre
  // (egzanp: "6 × 9" pandan l ap tape, "6 × 9 = 54" apre li fin kalkile)
  const [lastExpr, setLastExpr] = useState('')
  const liveExpr = (operator && prevValue != null) ? `${prevValue} ${operator} ${display}` : ''

  const handleBtn = (b) => {
    if (b >= '0' && b <= '9') {
      if (waiting) { setDisplay(b); setWaiting(false); if (!operator) setLastExpr('') }
      else setDisplay(display === '0' ? b : display + b)
      return
    }
    if (b === '.') {
      if (waiting) { setDisplay('0.'); setWaiting(false); return }
      if (!display.includes('.')) setDisplay(display + '.')
      return
    }
    if (b === 'C') { setDisplay('0'); setPrevValue(null); setOperator(null); setWaiting(false); setLastExpr(''); return }
    if (b === '±') { setDisplay(String(parseFloat(display) * -1)); return }
    if (b === '%') { setDisplay(String(parseFloat(display) / 100)); return }
    if (['+', '-', '×', '÷'].includes(b)) {
      const inputValue = parseFloat(display)
      if (prevValue == null) setPrevValue(inputValue)
      else if (operator) {
        const result = calc(prevValue, inputValue, operator)
        setDisplay(String(result))
        setPrevValue(result)
      }
      setWaiting(true)
      setOperator(b)
      return
    }
    if (b === '=') {
      const inputValue = parseFloat(display)
      if (operator && prevValue != null) {
        const result = calc(prevValue, inputValue, operator)
        // ✅ Montre ekspresyon konplè a AK rezilta a apre "="
        setLastExpr(`${prevValue} ${operator} ${inputValue} =`)
        // ✅ NOUVO — anrejistre kalkil la nan istorik, ak dat
        persistHistory([
          { id: `${Date.now()}`, expr: `${prevValue} ${operator} ${inputValue}`, result, at: new Date().toISOString() },
          ...history,
        ])
        setDisplay(String(result))
        setPrevValue(null)
        setOperator(null)
        setWaiting(true)
      }
    }
  }

  const clearHistory = () => persistHistory([])

  // ✅ NOUVO — Efase dènye chif la sèlman (pa tout ekran an tankou C)
  const handleBackspace = () => {
    if (waiting) return
    setDisplay(d => (d.length > 1 ? d.slice(0, -1) : '0'))
  }

  const fmtDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const BTNS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=']

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={calcRef}>
      <button onClick={() => setOpen(o => !o)} title={t('calculator.title')} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
        borderRadius: 10, border: `1px solid ${open ? '#f5680c80' : 'rgba(0,0,0,0.1)'}`,
        background: open ? 'rgba(245,104,12,0.08)' : 'transparent',
        color: open ? C.gold : '#555', cursor: 'pointer', fontSize: 12, fontWeight: 700,
      }}>
        <Calculator size={15}/>
        <span>{t('calculator.title')}</span>
      </button>

      {open && (
        <div style={isMobile ? {
          // ✅ KORIJE — sou mobil, panèl la te ankre a dwat bouton an, e li te
          // depase bò goch ekran an nèt lè bouton an te tou pre bò goch la.
          // Kounye a li fiks e santre sou ekran an, kèlkeswa kote bouton an ye.
          position: 'fixed', top: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, width: 'min(280px, 92vw)',
          background: '#1a1f35', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
        } : {
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100, width: 270,
          background: '#1a1f35', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setTab('pad')} style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: tab === 'pad' ? 'rgba(245,104,12,0.12)' : 'transparent',
              color: tab === 'pad' ? C.gold : 'rgba(255,255,255,0.5)',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
            }}>{t('calculator.title').toUpperCase()}</button>
            <button onClick={() => setTab('history')} style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: tab === 'history' ? 'rgba(245,104,12,0.12)' : 'transparent',
              color: tab === 'history' ? C.gold : 'rgba(255,255,255,0.5)',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
            }}>{t('calculator.history').toUpperCase()}</button>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: '0 10px' }}>
              <X size={14}/>
            </button>
          </div>

          {tab === 'pad' ? (
            <>
              <div style={{ padding: '14px 14px 0', textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'IBM Plex Mono,monospace', minHeight: 16, wordBreak: 'break-all' }}>
                {liveExpr || lastExpr || '\u00A0'}
              </div>
              <div style={{ padding: '4px 14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <button onClick={handleBackspace} title="Efase dènye chif" style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                  padding: 7, cursor: 'pointer', color: '#fff', display: 'flex', flexShrink: 0,
                }}>
                  <Delete size={16}/>
                </button>
                <div style={{ flex: 1, textAlign: 'right', fontSize: 26, fontFamily: 'IBM Plex Mono,monospace', color: '#fff', fontWeight: 700, wordBreak: 'break-all' }}>
                  {display}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
                {BTNS.map((b, i) => (
                  <button key={i} onClick={() => handleBtn(b)} style={{
                    padding: '14px 0', border: 'none', cursor: 'pointer',
                    background: ['÷', '×', '-', '+', '='].includes(b) ? C.gold : ['C', '±', '%'].includes(b) ? 'rgba(255,255,255,0.08)' : '#232841',
                    color: '#fff', fontSize: 16, fontWeight: 700,
                    gridColumn: b === '0' ? 'span 2' : 'span 1',
                  }}>{b}</button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {!history.length ? (
                <p style={{ padding: '24px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {t('calculator.noHistory')}
                </p>
              ) : (
                <>
                  {history.map(h => (
                    <div key={h.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{h.expr} =</span>
                        <span style={{ fontSize: 15, color: '#fff', fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace' }}>{h.result}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{fmtDate(h.at)}</div>
                    </div>
                  ))}
                  <button onClick={clearHistory} style={{
                    width: '100%', padding: '10px 0', border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, fontWeight: 700,
                  }}>
                    {t('calculator.clearHistory')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ✅ NOUVO — Swipe pou refrechi (pull-to-refresh), mache sou APK AK web.
// Detekte yon swipe soti anlè ekran an desann, lè kontni a deja tou anlè.
function PullToRefresh({ children }) {
  const [pullY, setPullY]           = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY   = useRef(0)
  const dragging = useRef(false)
  const scrollRef = useRef(null)

  const THRESHOLD = 70

  const handleTouchStart = (e) => {
    if (refreshing) return
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
      dragging.current = true
    }
  }

  const handleTouchMove = (e) => {
    if (!dragging.current || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setPullY(Math.min(delta * 0.5, 110))
    } else {
      dragging.current = false
      setPullY(0)
    }
  }

  const handleTouchEnd = () => {
    if (!dragging.current) return
    dragging.current = false
    if (pullY >= THRESHOLD) {
      setRefreshing(true)
      setPullY(THRESHOLD)
      // ✅ Refrechi app la nèt — garanti tout done ajou, tankou yon relanse
      setTimeout(() => window.location.reload(), 300)
    } else {
      setPullY(0)
    }
  }

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: pullY, overflow: 'hidden', transition: dragging.current ? 'none' : 'height 0.25s ease',
        color: '#f5680c', flexShrink: 0,
      }}>
        {pullY > 6 && (
          refreshing
            ? <div style={{ width: 22, height: 22, border: '3px solid rgba(245,104,12,0.2)', borderTopColor: '#f5680c', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
            : <RefreshCw size={20} style={{ transform: `rotate(${pullY * 2.4}deg)`, transition: 'transform 0.1s' }}/>
        )}
      </div>
      {children}
    </div>
  )
}

export default function AppLayout() {
  const { user, tenant, token, logout } = useAuthStore()
  const loading = useAuthStore(s => s.loading)
  const { t, i18n } = useTranslation()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [open, setOpen]                 = useState(false)
  const [showLang, setShowLang]         = useState(false)
  const [showBranches, setShowBranches] = useState(false)
  const [branches, setBranches]         = useState([])
  const [isDesktop, setIsDesktop]       = useState(() => window.innerWidth >= 1024)

  const isMikwoActive = location.pathname.startsWith('/app/kane-epay') ||
                        location.pathname.startsWith('/app/pre') ||
                        location.pathname.startsWith('/app/mikwo-kredi-gid')
  const [mikwoOpen, setMikwoOpen] = useState(isMikwoActive)

  const langRef   = useRef(null)
  const branchRef = useRef(null)
  const meCalled  = useRef(false)

  const { connected:btConnected, connecting:btConnecting, printing:btPrinting, connect:btConnect, disconnect:btDisconnect, deviceName } = usePrinterStore()
  const onSunmi      = useMemo(() => isSunmi(), [])
  const hasBluetooth = useMemo(() => typeof navigator !== 'undefined' && !!navigator.bluetooth, [])
  const currentLang  = useMemo(() => LANGS.find(l => l.code === i18n.language) || LANGS[0], [i18n.language])

  const isAdmin = useMemo(() => user?.role === 'admin' || user?.isAdmin === true, [user?.role, user?.isAdmin])

  const isEnterprise = useMemo(() => {
    const planName = tenant?.plan?.name || ''
    return ['antepriz','antrepriz','entreprise','enterprise'].includes(planName.toLowerCase().trim())
  }, [tenant?.plan?.name])

  const planName = tenant?.plan?.name || ''

  const isPageAllowed = useCallback((pageKey) => {
    if (pageKey === null || pageKey === undefined) return true
    const ap = tenant?.allowedPages
    if (!ap || typeof ap !== 'object') return true
    if (ap[pageKey] === false) return false
    return true
  }, [tenant?.allowedPages])

  const currentBranchId   = useMemo(() => localStorage.getItem('plusgroup-branch-id'),   [])  // eslint-disable-line
  const currentBranchName = useMemo(() => localStorage.getItem('plusgroup-branch-name'), [])  // eslint-disable-line

  useEffect(() => {
    const branchId = localStorage.getItem('plusgroup-branch-id')
    if (branchId) api.defaults.headers.common['X-Branch-Id'] = branchId
    else delete api.defaults.headers.common['X-Branch-Id']
  }, [])

  useEffect(() => {
    if (tenant?.slug) api.defaults.headers.common['X-Tenant-Slug'] = tenant.slug
  }, [tenant?.slug])

  useEffect(() => {
    if (!token || meCalled.current) return
    meCalled.current = true
    authAPI.me()
      .then(res => {
        if (res.data?.tenant?.slug) {
          api.defaults.headers.common['X-Tenant-Slug'] = res.data.tenant.slug
          useAuthStore.getState().refreshTenant(res.data.tenant)
        }
      })
      .catch(err => {
        if (err.response?.status === 401) { logout(); navigate('/login', { replace:true }) }
      })
  }, [token])  // eslint-disable-line

  useEffect(() => {
    if (!isAdmin || !token) return
    branchAPI.getAll().then(r => setBranches(r.data?.branches || [])).catch(() => {})
  }, [isAdmin, token])

  useEffect(() => {
    const onDoc = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target)) setShowBranches(false)
      if (langRef.current   && !langRef.current.contains(e.target))   setShowLang(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!isDesktop) document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, isDesktop])

  useEffect(() => { if (isMikwoActive) setMikwoOpen(true) }, [isMikwoActive])
  useEffect(() => { if (!isDesktop) setOpen(false) }, [location.pathname, isDesktop])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('plusgroup-branch-id')
    localStorage.removeItem('plusgroup-branch-name')
    delete api.defaults.headers.common['X-Branch-Id']
    logout(); toast.success('Ou dekonekte.'); navigate('/login')
  }, [logout, navigate])

  const changeLanguage = useCallback((code) => {
    i18n.changeLanguage(code); localStorage.setItem('plusgroup-lang', code); setShowLang(false)
  }, [i18n])

  const handleSwitchBranch = useCallback((branch) => {
    if (!branch.isActive) { toast.error('Branch sa a bloke.'); return }
    if (branch.id === currentBranchId) { setShowBranches(false); return }
    localStorage.setItem('plusgroup-branch-id', branch.id)
    localStorage.setItem('plusgroup-branch-name', branch.name)
    api.defaults.headers.common['X-Branch-Id'] = branch.id
    setShowBranches(false); toast.success(`Branch: ${branch.name}`)
    window.location.href = '/app/dashboard'
  }, [currentBranchId])

  const handleClearBranch = useCallback(() => {
    localStorage.removeItem('plusgroup-branch-id'); localStorage.removeItem('plusgroup-branch-name')
    delete api.defaults.headers.common['X-Branch-Id']
    setShowBranches(false); toast.success('Wè tout branch yo')
    window.location.href = '/app/dashboard'
  }, [])

  const rateItems = useMemo(() => {
    const exchangeRates     = safeJson(tenant?.exchangeRates, {})
    const visibleCurrencies = safeJson(tenant?.visibleCurrencies, ['USD'])
    return visibleCurrencies.map(cur => {
      const rate = Number(exchangeRates[cur] || (cur === 'USD' ? tenant?.exchangeRate : 0) || 0)
      if (!rate) return null
      return { cur, rate }
    }).filter(Boolean)
  }, [tenant?.exchangeRates, tenant?.visibleCurrencies, tenant?.exchangeRate])

  const tenantLogoUrl = useMemo(() => logoSrc(tenant?.logoUrl), [tenant?.logoUrl])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.sidebarTop }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.goldDim}`, borderTop:`3px solid ${C.gold}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const sidebarStyle = {
    position:      isDesktop ? 'relative' : 'fixed',
    inset:         isDesktop ? 'auto' : '0 auto 0 0',
    zIndex:        40,
    width:         isDesktop ? 248 : 'min(248px, 85vw)',
    // ✅ KORIJE — 100vh pa konte ba adrès Chrome mobil la, sa te fè bouton
    // "Dekonekte" a rete kache anba ekran an san posiblite defile jwenn li.
    // 100dvh ajiste otomatikman selon wotè REYÈL vizib navigatè a.
    height:        isDesktop ? '100vh' : '100dvh',
    minHeight:     isDesktop ? '100vh' : undefined,
    // ✅ KORIJE — aside PA dwe defile pou kont pa li ankò. Anvan, li te gen
    // overflowY:auto ki te "vòlè" defilman an nan men <nav> (paske aside a
    // te vin conteneur ki defile a olye nav), e defilman aside a te kache
    // (aside::-webkit-scrollbar display:none), kidonk kontni te disparèt
    // san okenn bare vizib. Kounye a aside rete FIKS, e SÈLMAN <nav>
    // anndan l defile — se la bare vizib la parèt kounye a.
    overflowY:     'hidden',
    background:    `linear-gradient(170deg,${C.sidebarTop} 0%,${C.sidebarBg} 50%,#1a1f35 100%)`,
    display:       'flex',
    flexDirection: 'column',
    transform:     isDesktop ? 'none' : (open ? 'translateX(0)' : 'translateX(-100%)'),
    transition:    'transform 0.25s ease',
    boxShadow:     '4px 0 24px rgba(0,0,0,0.4)',
    borderRight:   `1px solid ${C.border}`,
    flexShrink:    0,
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#F5F0E8', fontFamily:'DM Sans, sans-serif' }}>

      {open && !isDesktop && (
        <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:35, background:'rgba(0,0,0,0.7)' }}/>
      )}

      <aside style={sidebarStyle}>
        <div style={{ height:3, flexShrink:0, background:`linear-gradient(90deg,#b34200 0%,${C.gold} 35%,${C.goldLt} 50%,${C.gold} 65%,#b34200 100%)` }}/>

        {!isDesktop && (
          <button onClick={() => setOpen(false)} style={{ position:'absolute', top:12, right:12, zIndex:50, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:'pointer', color:C.muted, display:'flex' }}>
            <X size={16}/>
          </button>
        )}

        {/* LOGO */}
        <div style={{ padding:'18px 16px 14px', borderBottom:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {tenantLogoUrl
              ? <img src={tenantLogoUrl} alt="logo" style={{ width:44, height:44, borderRadius:12, objectFit:'contain', background:'rgba(255,255,255,0.06)', padding:4, flexShrink:0, boxShadow:`0 0 0 2px ${C.goldBorder}` }}/>
              : <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:`linear-gradient(135deg,${C.gold},${C.goldLt})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff' }}>
                  {tenant?.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
            }
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:C.white, fontWeight:800, fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {tenant?.name || 'PLUS GROUP'}
              </p>
              {currentBranchName
                ? <p style={{ color:C.green, fontSize:10, fontWeight:700, letterSpacing:'0.07em', margin:'3px 0 0', textTransform:'uppercase' }}>📍 {currentBranchName}</p>
                : <p style={{ color:C.gold, fontSize:10, fontWeight:700, letterSpacing:'0.09em', margin:'3px 0 0', textTransform:'uppercase' }}>Innov@tion &amp; Tech</p>
              }
            </div>

            {isAdmin && branches.length > 0 && (
              <div ref={branchRef} style={{ position:'relative', flexShrink:0 }}>
                <button onClick={() => setShowBranches(!showBranches)} title="Chanje branch"
                  style={{ background: showBranches ? `rgba(245,104,12,0.18)` : currentBranchId ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border:`1px solid ${showBranches ? C.goldBorder : currentBranchId ? 'rgba(34,197,94,0.25)' : C.border}`, borderRadius:8, padding:'5px 7px', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  <GitBranch size={12} style={{ color: showBranches ? C.gold : currentBranchId ? C.green : C.muted }}/>
                  <ChevronDown size={11} style={{ color: showBranches ? C.gold : currentBranchId ? C.green : C.muted, transform: showBranches ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
                </button>

                {showBranches && (
                  <div style={{ position:'fixed', top:70, left: isDesktop ? 252 : 16, minWidth:220, maxWidth:'calc(100vw - 32px)', zIndex:9999, background:'#0f1117', border:`1px solid rgba(245,104,12,0.22)`, borderRadius:14, boxShadow:'0 16px 48px rgba(0,0,0,0.65)', overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px 8px', borderBottom:`1px solid rgba(245,104,12,0.10)`, display:'flex', alignItems:'center', gap:6 }}>
                      <GitBranch size={12} style={{ color:C.gold }}/>
                      <span style={{ color:C.gold, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Chanje Branch</span>
                    </div>
                    <button onClick={handleClearBranch} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', cursor:'pointer', background: !currentBranchId ? `rgba(245,104,12,0.10)` : 'transparent', borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:C.gold }}/>
                      <div style={{ flex:1, textAlign:'left' }}>
                        <div style={{ color:'#fff', fontWeight: !currentBranchId ? 700 : 500, fontSize:13 }}>Tout branch yo</div>
                        <div style={{ color:'#475569', fontSize:10 }}>Wè done global</div>
                      </div>
                      {!currentBranchId && <span style={{ fontSize:10, color:C.gold, fontWeight:700, flexShrink:0 }}>✓</span>}
                    </button>
                    {branches.map(branch => {
                      const isCurrent = branch.id === currentBranchId
                      return (
                        <button key={branch.id} onClick={() => handleSwitchBranch(branch)} disabled={!branch.isActive}
                          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', cursor: branch.isActive ? 'pointer' : 'not-allowed', background: isCurrent ? 'rgba(34,197,94,0.10)' : 'transparent', borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: branch.isActive ? C.green : C.red }}/>
                          <div style={{ flex:1, textAlign:'left', minWidth:0 }}>
                            <div style={{ color: branch.isActive ? '#fff' : '#475569', fontWeight: isCurrent ? 700 : 500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{branch.name}</div>
                            <div style={{ color:'#475569', fontSize:10 }}>{branch.isActive ? 'Aktif' : 'Bloke'}</div>
                          </div>
                          {isCurrent ? <span style={{ fontSize:10, color:C.green, fontWeight:700, flexShrink:0 }}>✓</span>
                            : !branch.isActive ? <Lock size={10} style={{ color:'#475569', flexShrink:0 }}/>
                            : <ChevronRight size={12} style={{ color:'#475569', flexShrink:0 }}/>}
                        </button>
                      )
                    })}
                    <button onClick={() => { navigate('/app/branches'); setShowBranches(false) }}
                      style={{ width:'100%', padding:'9px 14px', border:'none', borderTop:`1px solid rgba(245,104,12,0.10)`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:C.gold, fontSize:11, fontWeight:700 }}>
                      <GitBranch size={11}/> Jere Branch yo →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 10px', borderRadius:8, background: isEnterprise ? C.entDim : 'rgba(255,255,255,0.04)', border:`1px solid ${isEnterprise ? C.entBorder : C.border}` }}>
            <span style={{ fontSize:11, color: isEnterprise ? C.enterprise : C.muted, fontWeight:700 }}>{planName || 'Free'}</span>
            {!isEnterprise && <NavLink to="/app/plans" style={{ fontSize:10, color:C.enterprise, textDecoration:'none', fontWeight:700 }}>Upgrade →</NavLink>}
          </div>
        </div>

        {/* NAV */}
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 10px', position:'relative', zIndex:1, WebkitOverflowScrolling:'touch' }}>
          <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.10em', color:C.muted, padding:'6px 6px 6px', fontWeight:700, margin:'0 0 4px' }}>
            Menu prensipal
          </p>

          {NAV.map(({ to, icon:Icon, labelKey, pageKey, label }) => {
            const locked = !isPageAllowed(pageKey)
            return (
              <NavLink key={to} to={locked ? '#' : to}
                onClick={(e) => { if (locked) { e.preventDefault(); return } }}
                style={({ isActive }) => ({ ...navLinkStyle(locked ? false : isActive), opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' })}>
                {({ isActive }) => (<>
                  <Icon size={15} style={{ flexShrink:0, color: locked ? '#475569' : isActive ? C.gold : C.mutedMd }}/>
                  <span style={{ flex:1 }}>{t(labelKey, { defaultValue: label })}</span>
                  {locked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.gold, flexShrink:0 }}/>}
                </>)}
              </NavLink>
            )
          })}

          {isAdmin && isPageAllowed('branches') && (
            <NavLink to="/app/branches"
              style={({ isActive }) => ({ ...navLinkStyle(isActive), background: isActive ? C.entDim : 'transparent', borderLeft: isActive ? `3px solid ${C.enterprise}` : '3px solid transparent' })}>
              {({ isActive }) => (<>
                <GitBranch size={15} style={{ flexShrink:0, color: isActive ? C.enterprise : C.mutedMd }}/>
                <span style={{ flex:1 }}>{t('nav.branches') || 'Branches'}</span>
                {isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise, flexShrink:0 }}/>}
              </>)}
            </NavLink>
          )}

          {/* ═══ ANTREPRIZ ═══ */}
          <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(201,168,76,0.15)`, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:C.enterprise, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>✦ Antrepriz</span>
            <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise }}/>
          </div>

          <NavLink to={!isPageAllowed('kane') ? '#' : '/app/kane'}
            onClick={(e) => { if (!isPageAllowed('kane')) e.preventDefault() }}
            style={({ isActive }) => ({ ...enterpriseLinkStyle(!isPageAllowed('kane') ? false : isActive), opacity: !isPageAllowed('kane') ? 0.4 : 1, cursor: !isPageAllowed('kane') ? 'not-allowed' : 'pointer' })}>
            {({ isActive }) => (<>
              <CreditCard size={15} style={{ flexShrink:0, color: !isPageAllowed('kane') ? '#475569' : isActive ? C.enterprise : C.mutedMd }}/>
              <span style={{ flex:1 }}>Ti Kanè Kès</span>
              {!isPageAllowed('kane') ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise, flexShrink:0 }}/>}
            </>)}
          </NavLink>

          {/* Mikwo Kredi collapse */}
          {(() => {
            const kaneAllowed = isPageAllowed('kane-epay')
            const preAllowed  = isPageAllowed('pre')
            const locked      = !kaneAllowed && !preAllowed
            return (
              <div>
                <button onClick={() => { if (!locked) setMikwoOpen(v => !v) }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, marginBottom:3, background: isMikwoActive ? C.entDim : 'transparent', color: isMikwoActive ? '#ffffff' : C.muted, borderLeft: isMikwoActive ? `3px solid ${C.enterprise}` : '3px solid transparent', fontWeight: isMikwoActive ? 700 : 500, fontSize:13, border:'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, textAlign:'left' }}>
                  <Wallet size={15} style={{ flexShrink:0, color: locked ? '#475569' : isMikwoActive ? C.enterprise : C.mutedMd }}/>
                  <span style={{ flex:1 }}>Mikwo Kredi</span>
                  {locked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/>
                    : mikwoOpen ? <ChevronUp size={13} style={{ color:C.enterprise, flexShrink:0 }}/>
                    : <ChevronDown size={13} style={{ color:C.muted, flexShrink:0 }}/>}
                </button>
                {mikwoOpen && !locked && (
                  <div style={{ marginLeft:14, paddingLeft:12, borderLeft:`2px solid rgba(201,168,76,0.25)`, marginBottom:4 }}>
                    {MIKWO_KREDI_ITEMS.map(({ to, icon:Icon, label, pageKey }) => {
                      const subLocked = !isPageAllowed(pageKey)
                      const isGid     = to === '/app/mikwo-kredi-gid'
                      return (
                        <NavLink key={to} to={subLocked ? '#' : to}
                          onClick={(e) => { if (subLocked) e.preventDefault() }}
                          style={({ isActive }) => ({
                            display:'flex', alignItems:'center', gap:9,
                            padding:'8px 12px', borderRadius:9, marginBottom:2,
                            textDecoration:'none',
                            background: (!subLocked && isActive) ? (isGid ? 'rgba(59,130,246,0.12)' : 'rgba(201,168,76,0.12)') : 'transparent',
                            color: (!subLocked && isActive) ? '#ffffff' : isGid ? 'rgba(147,187,239,0.65)' : C.muted,
                            borderLeft: (!subLocked && isActive) ? `2px solid ${isGid ? '#3B82F6' : C.enterprise}` : '2px solid transparent',
                            fontWeight: (!subLocked && isActive) ? 700 : 400, fontSize:12,
                            opacity: subLocked ? 0.4 : 1, cursor: subLocked ? 'not-allowed' : 'pointer',
                          })}>
                          {({ isActive }) => (<>
                            <Icon size={13} style={{ flexShrink:0, color: subLocked ? '#475569' : isActive ? (isGid ? '#3B82F6' : C.enterprise) : isGid ? 'rgba(147,187,239,0.5)' : C.mutedMd }}/>
                            <span style={{ flex:1 }}>{label}</span>
                            {subLocked ? <Lock size={10} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:5, height:5, borderRadius:'50%', background: isGid ? '#3B82F6' : C.enterprise, flexShrink:0 }}/>}
                          </>)}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {ENTERPRISE_ITEMS.map(({ to, icon:Icon, label, pageKey }) => {
            const locked = !isPageAllowed(pageKey)
            return (
              <NavLink key={to} to={locked ? '#' : to}
                onClick={(e) => { if (locked) e.preventDefault() }}
                style={({ isActive }) => ({ ...enterpriseLinkStyle(locked ? false : isActive), opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' })}>
                {({ isActive }) => (<>
                  <Icon size={15} style={{ flexShrink:0, color: locked ? '#475569' : isActive ? C.enterprise : C.mutedMd }}/>
                  <span style={{ flex:1 }}>{label}</span>
                  {locked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise, flexShrink:0 }}/>}
                </>)}
              </NavLink>
            )
          })}

          {/* ═══ HOTEL ═══ */}
          {(() => {
            const hotelLocked = !isPageAllowed('hotel')
            return (
              <>
                <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(14,165,233,0.15)`, display:'flex', alignItems:'center', gap:8, opacity: hotelLocked ? 0.4 : 1 }}>
                  <span style={{ color:C.hotel, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>🏨 Hotel</span>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.hotel }}/>
                </div>
                {HOTEL_ITEMS.map(({ to, icon:Icon, label, end }) => (
                  <NavLink key={to} to={hotelLocked ? '#' : to} end={end}
                    onClick={(e) => { if (hotelLocked) e.preventDefault() }}
                    style={({ isActive }) => ({ ...hotelLinkStyle(hotelLocked ? false : isActive), opacity: hotelLocked ? 0.4 : 1, cursor: hotelLocked ? 'not-allowed' : 'pointer' })}>
                    {({ isActive }) => (<>
                      <Icon size={15} style={{ flexShrink:0, color: hotelLocked ? '#475569' : isActive ? C.hotel : C.mutedMd }}/>
                      <span style={{ flex:1 }}>{label}</span>
                      {hotelLocked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.hotel, flexShrink:0 }}/>}
                    </>)}
                  </NavLink>
                ))}
              </>
            )
          })()}

          {/* ═══ RESTORAN ═══ */}
          {(() => {
            const restaurantLocked = !isPageAllowed('restaurant')
            return (
              <>
                <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(220,38,38,0.15)`, display:'flex', alignItems:'center', gap:8, opacity: restaurantLocked ? 0.4 : 1 }}>
                  <span style={{ color:C.restaurant, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>🍽️ {t('nav.restaurant')}</span>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.restaurant }}/>
                </div>
                {RESTAURANT_ITEMS.map(({ to, icon:Icon, labelKey, label, end }) => (
                  <NavLink key={to} to={restaurantLocked ? '#' : to} end={end}
                    onClick={(e) => { if (restaurantLocked) e.preventDefault() }}
                    style={({ isActive }) => ({ ...restaurantLinkStyle(restaurantLocked ? false : isActive), opacity: restaurantLocked ? 0.4 : 1, cursor: restaurantLocked ? 'not-allowed' : 'pointer' })}>
                    {({ isActive }) => (<>
                      <Icon size={15} style={{ flexShrink:0, color: restaurantLocked ? '#475569' : isActive ? C.restaurant : C.mutedMd }}/>
                      <span style={{ flex:1 }}>{t(labelKey, { defaultValue: label })}</span>
                      {restaurantLocked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.restaurant, flexShrink:0 }}/>}
                    </>)}
                  </NavLink>
                ))}
              </>
            )
          })()}

          {/* ═══ PRESE ═══ */}
          {(() => {
            const dryLocked = !isPageAllowed('dry')
            return (
              <>
                <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(139,92,246,0.15)`, display:'flex', alignItems:'center', gap:8, opacity: dryLocked ? 0.4 : 1 }}>
                  <span style={{ color:C.dry, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>👔 Prese</span>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.dry }}/>
                </div>
                <NavLink to={dryLocked ? '#' : '/app/dry'}
                  onClick={(e) => { if (dryLocked) e.preventDefault() }}
                  style={({ isActive }) => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, marginBottom:3, textDecoration:'none', background: (!dryLocked && isActive) ? C.dryDim : 'transparent', color: (!dryLocked && isActive) ? '#ffffff' : C.muted, borderLeft: (!dryLocked && isActive) ? `3px solid ${C.dry}` : '3px solid transparent', fontWeight: (!dryLocked && isActive) ? 700 : 500, fontSize:13, opacity: dryLocked ? 0.4 : 1, cursor: dryLocked ? 'not-allowed' : 'pointer' })}>
                  {({ isActive }) => (<>
                    <Scissors size={15} style={{ flexShrink:0, color: dryLocked ? '#475569' : isActive ? C.dry : C.mutedMd }}/>
                    <span style={{ flex:1 }}>Jestyon Prese</span>
                    {dryLocked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.dry, flexShrink:0 }}/>}
                  </>)}
                </NavLink>
              </>
            )
          })()}

          {/* ═══ RH & FINANS ═══ */}
          {(() => {
            const empLocked = !isPageAllowed('employees')
            const expLocked = !isPageAllowed('expenses')
            return (
              <>
                <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(16,185,129,0.15)`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:C.rh, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>💼 RH & Finans</span>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.rh }}/>
                </div>

                {/* Anplwaye */}
                <NavLink to={empLocked ? '#' : '/app/employees'}
                  onClick={(e) => { if (empLocked) e.preventDefault() }}
                  style={({ isActive }) => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, marginBottom:3, textDecoration:'none', background: (!empLocked && isActive) ? C.rhDim : 'transparent', color: (!empLocked && isActive) ? '#ffffff' : C.muted, borderLeft: (!empLocked && isActive) ? `3px solid ${C.rh}` : '3px solid transparent', fontWeight: (!empLocked && isActive) ? 700 : 500, fontSize:13, opacity: empLocked ? 0.4 : 1, cursor: empLocked ? 'not-allowed' : 'pointer' })}>
                  {({ isActive }) => (<>
                    <UserCog size={15} style={{ flexShrink:0, color: empLocked ? '#475569' : isActive ? C.rh : C.mutedMd }}/>
                    <span style={{ flex:1 }}>Anplwaye</span>
                    {empLocked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.rh, flexShrink:0 }}/>}
                  </>)}
                </NavLink>

                {/* Depans */}
                <NavLink to={expLocked ? '#' : '/app/expenses'}
                  onClick={(e) => { if (expLocked) e.preventDefault() }}
                  style={({ isActive }) => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, marginBottom:3, textDecoration:'none', background: (!expLocked && isActive) ? 'rgba(239,68,68,0.12)' : 'transparent', color: (!expLocked && isActive) ? '#ffffff' : C.muted, borderLeft: (!expLocked && isActive) ? '3px solid #EF4444' : '3px solid transparent', fontWeight: (!expLocked && isActive) ? 700 : 500, fontSize:13, opacity: expLocked ? 0.4 : 1, cursor: expLocked ? 'not-allowed' : 'pointer' })}>
                  {({ isActive }) => (<>
                    <TrendingDown size={15} style={{ flexShrink:0, color: expLocked ? '#475569' : isActive ? '#EF4444' : C.mutedMd }}/>
                    <span style={{ flex:1 }}>Depans</span>
                    {expLocked ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/> : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444', flexShrink:0 }}/>}
                  </>)}
                </NavLink>
              </>
            )
          })()}

        </nav>

        {/* SETTINGS + USER */}
        <div style={{ padding:'10px 10px 12px', paddingBottom:38, borderTop:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
          <NavLink to="/app/settings"
            style={({ isActive }) => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, marginBottom:8, textDecoration:'none', background: isActive ? `rgba(245,104,12,0.12)` : 'transparent', color: isActive ? '#fff' : C.muted, borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent', fontSize:13, fontWeight: isActive ? 700 : 500 })}>
            {({ isActive }) => (<>
              <Settings size={15} style={{ color: isActive ? C.gold : C.mutedMd, flexShrink:0 }}/>
              <span>{t('nav.settings')}</span>
            </>)}
          </NavLink>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:`rgba(245,104,12,0.08)`, border:`1px solid ${C.goldBorder}` }}>
            <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg,#ef4444,#dc2626)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14 }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:'#fff', fontSize:12, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.fullName}</p>
              <p style={{ color:C.gold, fontSize:10, fontWeight:600, textTransform:'capitalize', margin:'1px 0 0' }}>{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Dekonekte" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:4, borderRadius:6, display:'flex' }}>
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <header style={{ minHeight:58, background:'#fff', borderBottom:`1px solid rgba(245,104,12,0.15)`, boxShadow:'0 1px 8px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:6, padding:'0 12px', flexShrink:0, position:'relative', zIndex:10, flexWrap:'wrap' }}>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,#C0392B 20%,${C.gold} 50%,#C0392B 80%,transparent)` }}/>

          {!isDesktop && (
            <button onClick={() => setOpen(!open)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1a0533', padding:6, borderRadius:8, display:'flex', flexShrink:0 }}>
              <Menu size={20}/>
            </button>
          )}

          {rateItems.map(({ cur, rate }) => (
            <div key={cur} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:8, background:'linear-gradient(135deg,#FFF8E7,#FFF3D0)', border:'1px solid #f5680c40', fontSize:11, flexShrink:0 }}>
              <span style={{ color:'#b34200', fontWeight:700 }}>1 {cur}</span>
              <span style={{ color:C.gold }}>=</span>
              <span style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:'#1a0533' }}>{rate.toFixed(2)} HTG</span>
            </div>
          ))}

          <div style={{ flex:1 }}/>

          {onSunmi ? (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:10, background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.2)', flexShrink:0 }}>
              <Printer size={13} style={{ color:'#059669' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#059669' }}>Sunmi</span>
            </div>
          ) : hasBluetooth ? (
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              {!btConnected ? (
                <button onClick={btConnect} disabled={btConnecting} title="Konekte printer Bluetooth"
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:10, border:'1px solid rgba(27,42,143,0.2)', background: btConnecting ? 'rgba(27,42,143,0.05)' : 'transparent', color: btConnecting ? '#94a3b8' : '#1B2A8F', cursor: btConnecting ? 'not-allowed' : 'pointer', fontSize:12, fontWeight:700 }}>
                  <Bluetooth size={14}/>
                  {btConnecting ? 'Koneksyon...' : 'BT Printer'}
                </button>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:10, background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.25)' }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:'#059669', boxShadow:'0 0 6px rgba(5,150,105,0.6)' }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:'#059669', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deviceName || 'Printer'}</span>
                    {btPrinting && <div style={{ width:11, height:11, border:'2px solid rgba(5,150,105,0.25)', borderTopColor:'#059669', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>}
                  </div>
                  <button onClick={btDisconnect} title="Dekonekte printer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, background:'rgba(192,57,43,0.07)', border:'1px solid rgba(192,57,43,0.2)', color:'#C0392B', cursor:'pointer' }}>
                    <BluetoothOff size={13}/>
                  </button>
                </>
              )}
            </div>
          ) : null}

          <div style={{ position:'relative', flexShrink:0 }} ref={langRef}>
            <button onClick={() => setShowLang(!showLang)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:10, border:`1px solid ${showLang ? '#f5680c80' : 'rgba(0,0,0,0.1)'}`, background: showLang ? 'rgba(245,104,12,0.08)' : 'transparent', color: showLang ? C.gold : '#555', cursor:'pointer', fontSize:12, fontWeight:700 }}>
              <Globe size={15}/>
              <span style={{ fontSize:15 }}>{currentLang.flag}</span>
              <span style={{ fontSize:10, fontWeight:800 }}>{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={13} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
            </button>
            {showLang && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:100, background:'#fff', borderRadius:12, minWidth:175, boxShadow:'0 12px 40px rgba(0,0,0,0.15)', border:'1px solid rgba(245,104,12,0.2)', overflow:'hidden' }}>
                {LANGS.map(lang => (
                  <button key={lang.code} onClick={() => changeLanguage(lang.code)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', border:'none', cursor:'pointer', background: i18n.language === lang.code ? 'rgba(245,104,12,0.08)' : 'transparent', color: i18n.language === lang.code ? C.gold : '#333', fontWeight: i18n.language === lang.code ? 700 : 500, fontSize:13, borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize:18 }}>{lang.flag}</span>
                    <span style={{ flex:1 }}>{lang.name}</span>
                    {i18n.language === lang.code && <span style={{ color:C.gold }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize:11, fontWeight:800, padding:'5px 10px', borderRadius:99, background:`linear-gradient(135deg,#1a0533,#2d0a4e)`, color:C.gold, letterSpacing:'0.08em', border:`1px solid rgba(245,104,12,0.3)`, flexShrink:0 }}>
            {tenant?.defaultCurrency || 'HTG'}
          </div>

          {/* ✅ NOUVO — Kalkilatris, nan tèt paj la bò kote kloch notifikasyon */}
          <CalculatorMenu isMobile={!isDesktop}/>

          <NotificationBell lang={i18n.language}/>
        </header>

        <PullToRefresh>
          <div style={{ padding:'16px', paddingBottom:46 }}><Outlet /></div>
        </PullToRefresh>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        aside::-webkit-scrollbar { display:none; }
        /* ✅ KORIJE — barre defile gri, senp, vizib — menm estil ak sa ki
           deja sou paj prensipal la, pou moun konnen yo ka desann wè plis
           paj nan meni an (Restoran, Devi Dirèk, elatriye). */
        nav::-webkit-scrollbar { width: 10px; display: block; }
        nav::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.35); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.55); background-clip: padding-box; }
        nav { scrollbar-width: auto; scrollbar-color: rgba(255,255,255,0.35) rgba(255,255,255,0.05); }
      `}</style>

      {/* Kalkilatris kounye a nan tèt paj la (gade header), pa gen bezwen bouton flotan ankò */}
    </div>
  )
}