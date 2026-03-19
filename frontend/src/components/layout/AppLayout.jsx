// src/components/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Package, Users, FileText, Receipt,
  Warehouse, TrendingUp, Settings, LogOut,
  Menu, X, Globe, ChevronDown,
  GitBranch, CreditCard, Smartphone, Phone, Lock, ChevronRight,
  Wallet, Hotel, CalendarDays, Tag,
  Bluetooth, BluetoothOff, Printer, Shirt, 
} from 'lucide-react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { authAPI, branchAPI } from '../../services/api'
import api from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { isAndroid } from '../../services/printerService'
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
  dry:         '#8B5CF6',
  dryDim:      'rgba(139,92,246,0.15)',
  dryBorder:   'rgba(139,92,246,0.28)',
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
  { to:'/app/invoices',  icon:Receipt,         labelKey:'nav.invoices',  pageKey:'invoices'  },
  { to:'/app/stock',     icon:Warehouse,       labelKey:'nav.stock',     pageKey:'stock'     },
  { to:'/app/reports',   icon:TrendingUp,      labelKey:'nav.reports',   pageKey:'reports'   },
]

const ENTERPRISE_ITEMS = [
  { to:'/app/kane',      icon:CreditCard, label:'Ti Kanè Kès',      pageKey:'kane'      },
  { to:'/app/kane-epay', icon:Wallet,     label:'Kanè Epay',         pageKey:'kane-epay' },
  { to:'/app/sabotay',   icon:Smartphone, label:'Sabotay',           pageKey:'sabotay'   },
  { to:'/app/mobilpay',  icon:Phone,      label:'MonCash / NatCash', pageKey:'mobilpay'  },
]

const HOTEL_ITEMS = [
  { to:'/app/hotel',              icon:Hotel,        label:'Dashboard Hotel', end:true  },
  { to:'/app/hotel/reservations', icon:CalendarDays, label:'Rezèvasyon',      end:false },
  { to:'/app/hotel/room-types',   icon:Tag,          label:'Tip Chanm',       end:false },
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
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 14px', borderRadius: 10, marginBottom: 3,
  textDecoration: 'none',
  background: isActive
    ? `linear-gradient(90deg, rgba(245,104,12,0.18) 0%, rgba(245,104,12,0.05) 100%)`
    : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500,
  fontSize: 13,
})

const enterpriseLinkStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 14px', borderRadius: 10, marginBottom: 3,
  textDecoration: 'none',
  background: isActive ? C.entDim : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.enterprise}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500,
  fontSize: 13,
  cursor: 'pointer',
})

const hotelLinkStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 14px', borderRadius: 10, marginBottom: 3,
  textDecoration: 'none',
  background: isActive ? C.hotelDim : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  borderLeft: isActive ? `3px solid ${C.hotel}` : '3px solid transparent',
  fontWeight: isActive ? 700 : 500,
  fontSize: 13,
  cursor: 'pointer',
})

export default function AppLayout() {
  const { user, tenant, token, logout } = useAuthStore()
  const loading = useAuthStore(s => s.loading)
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen]                 = useState(false)
  const [showLang, setShowLang]         = useState(false)
  const [showBranches, setShowBranches] = useState(false)
  const [branches, setBranches]         = useState([])
  const [isDesktop, setIsDesktop]       = useState(() => window.innerWidth >= 1024)
  const langRef   = useRef(null)
  const branchRef = useRef(null)
  const meCalled  = useRef(false)

  // ✅ Printer global store
  const {
    connected:  btConnected,
    connecting: btConnecting,
    printing:   btPrinting,
    connect:    btConnect,
    disconnect: btDisconnect,
    deviceName,
  } = usePrinterStore()

  // ✅ Cache yon fwa — pa rele regex chak render
  const onAndroid = useMemo(() => isAndroid(), [])

  // ✅ Montre bouton BT sèlman si navigator.bluetooth disponib
  const hasBluetooth = useMemo(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth,
    []
  )

  const currentLang = useMemo(
    () => LANGS.find(l => l.code === i18n.language) || LANGS[0],
    [i18n.language]
  )

  const isAdmin = useMemo(
    () => user?.role === 'admin' || user?.isAdmin === true,
    [user?.role, user?.isAdmin]
  )

  const isEnterprise = useMemo(() => {
    const planName = tenant?.plan?.name || ''
    return ['antepriz', 'antrepriz', 'entreprise', 'enterprise']
      .includes(planName.toLowerCase().trim())
  }, [tenant?.plan?.name])

  const planName = tenant?.plan?.name || ''

  const isPageAllowed = useCallback((pageKey) => {
    const ap = tenant?.allowedPages
    if (!ap || typeof ap !== 'object') return true
    if (ap[pageKey] === false) return false
    return true
  }, [tenant?.allowedPages])

  const currentBranchId = useMemo(
    () => localStorage.getItem('plusgroup-branch-id'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const currentBranchName = useMemo(
    () => localStorage.getItem('plusgroup-branch-name'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

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
        if (err.response?.status === 401) {
          logout()
          navigate('/login', { replace: true })
        }
      })
  }, [token]) // eslint-disable-line

  useEffect(() => {
    if (!isAdmin || !token) return
    branchAPI.getAll()
      .then(r => setBranches(r.data?.branches || []))
      .catch(() => {})
  }, [isAdmin, token])

  useEffect(() => {
    const onDoc = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target)) setShowBranches(false)
      if (langRef.current && !langRef.current.contains(e.target)) setShowLang(false)
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

  const handleLogout = useCallback(() => {
    localStorage.removeItem('plusgroup-branch-id')
    localStorage.removeItem('plusgroup-branch-name')
    delete api.defaults.headers.common['X-Branch-Id']
    logout()
    toast.success('Ou dekonekte.')
    navigate('/login')
  }, [logout, navigate])

  const changeLanguage = useCallback((code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('plusgroup-lang', code)
    setShowLang(false)
  }, [i18n])

  const handleSwitchBranch = useCallback((branch) => {
    if (!branch.isActive) { toast.error('Branch sa a bloke.'); return }
    if (branch.id === currentBranchId) { setShowBranches(false); return }
    localStorage.setItem('plusgroup-branch-id', branch.id)
    localStorage.setItem('plusgroup-branch-name', branch.name)
    api.defaults.headers.common['X-Branch-Id'] = branch.id
    setShowBranches(false)
    toast.success(`Branch: ${branch.name}`)
    window.location.href = '/app/dashboard'
  }, [currentBranchId])

  const handleClearBranch = useCallback(() => {
    localStorage.removeItem('plusgroup-branch-id')
    localStorage.removeItem('plusgroup-branch-name')
    delete api.defaults.headers.common['X-Branch-Id']
    setShowBranches(false)
    toast.success('Wè tout branch yo')
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: C.sidebarTop }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.goldDim}`, borderTop:`3px solid ${C.gold}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const sidebarStyle = {
    position:      isDesktop ? 'relative' : 'fixed',
    inset:         isDesktop ? 'auto' : '0 auto 0 0',
    zIndex:        40,
    width:         248,
    minHeight:     '100vh',
    background:    `linear-gradient(170deg, ${C.sidebarTop} 0%, ${C.sidebarBg} 50%, #1a1f35 100%)`,
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
        <div onClick={() => setOpen(false)} style={{
          position:'fixed', inset:0, zIndex:35,
          background:'rgba(0,0,0,0.7)',
        }}/>
      )}

      <aside style={sidebarStyle}>
        <div style={{
          height: 3, flexShrink: 0,
          background: `linear-gradient(90deg, #b34200 0%, ${C.gold} 35%, ${C.goldLt} 50%, ${C.gold} 65%, #b34200 100%)`,
        }}/>

        {!isDesktop && (
          <button onClick={() => setOpen(false)} style={{
            position:'absolute', top:12, right:12, zIndex:50,
            background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`,
            borderRadius:8, padding:6, cursor:'pointer', color:C.muted, display:'flex',
          }}>
            <X size={16}/>
          </button>
        )}

        {/* ── LOGO ZONE ── */}
        <div style={{ padding:'18px 16px 14px', borderBottom:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {tenantLogoUrl
              ? <img src={tenantLogoUrl} alt="logo" style={{
                  width:44, height:44, borderRadius:12, objectFit:'contain',
                  background:'rgba(255,255,255,0.06)', padding:4, flexShrink:0,
                  boxShadow:`0 0 0 2px ${C.goldBorder}`,
                }}/>
              : <div style={{
                  width:44, height:44, borderRadius:12, flexShrink:0,
                  background:`linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, fontWeight:900, color:'#fff',
                }}>
                  {tenant?.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
            }

            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:C.white, fontWeight:800, fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {tenant?.name || 'PLUS GROUP'}
              </p>
              {currentBranchName
                ? <p style={{ color:C.green, fontSize:10, fontWeight:700, letterSpacing:'0.07em', margin:'3px 0 0', textTransform:'uppercase' }}>
                    📍 {currentBranchName}
                  </p>
                : <p style={{ color:C.gold, fontSize:10, fontWeight:700, letterSpacing:'0.09em', margin:'3px 0 0', textTransform:'uppercase' }}>
                    Innov@tion &amp; Tech
                  </p>
              }
            </div>

            {isAdmin && branches.length > 0 && (
              <div ref={branchRef} style={{ position:'relative', flexShrink:0 }}>
                <button
                  onClick={() => setShowBranches(!showBranches)}
                  title="Chanje branch"
                  style={{
                    background: showBranches ? `rgba(245,104,12,0.18)` : currentBranchId ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${showBranches ? C.goldBorder : currentBranchId ? 'rgba(34,197,94,0.25)' : C.border}`,
                    borderRadius:8, padding:'5px 7px', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:3,
                  }}
                >
                  <GitBranch size={12} style={{ color: showBranches ? C.gold : currentBranchId ? C.green : C.muted }}/>
                  <ChevronDown size={11} style={{
                    color: showBranches ? C.gold : currentBranchId ? C.green : C.muted,
                    transform: showBranches ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}/>
                </button>

                {showBranches && (
                  <div style={{ position:'fixed', top:70, left:252, minWidth:220, zIndex:9999, background:'#0f1117', border:`1px solid rgba(245,104,12,0.22)`, borderRadius:14, boxShadow:'0 16px 48px rgba(0,0,0,0.65)', overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px 8px', borderBottom:`1px solid rgba(245,104,12,0.10)`, display:'flex', alignItems:'center', gap:6 }}>
                      <GitBranch size={12} style={{ color:C.gold }}/>
                      <span style={{ color:C.gold, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Chanje Branch</span>
                    </div>

                    <button onClick={handleClearBranch}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', cursor:'pointer', background: !currentBranchId ? `rgba(245,104,12,0.10)` : 'transparent', borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
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
                          {isCurrent
                            ? <span style={{ fontSize:10, color:C.green, fontWeight:700, flexShrink:0 }}>✓</span>
                            : !branch.isActive
                              ? <Lock size={10} style={{ color:'#475569', flexShrink:0 }}/>
                              : <ChevronRight size={12} style={{ color:'#475569', flexShrink:0 }}/>
                          }
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

          <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 10px', borderRadius:8, background: isEnterprise ? C.entDim : 'rgba(255,255,255,0.04)', border: `1px solid ${isEnterprise ? C.entBorder : C.border}` }}>
            <span style={{ fontSize:11, color: isEnterprise ? C.enterprise : C.muted, fontWeight:700 }}>
              {planName || 'Free'}
            </span>
            {!isEnterprise && (
              <NavLink to="/app/plans" style={{ fontSize:10, color:C.enterprise, textDecoration:'none', fontWeight:700 }}>
                Upgrade →
              </NavLink>
            )}
          </div>
        </div>

        {/* ── NAV ── */}
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 10px', position:'relative', zIndex:1, scrollbarWidth:'none' }}>
          <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.10em', color:C.muted, padding:'6px 6px 6px', fontWeight:700, margin:'0 0 4px' }}>
            Menu prensipal
          </p>

          {NAV.map(({ to, icon: Icon, labelKey, pageKey }) => {
            const locked = !isPageAllowed(pageKey)
            return (
              <NavLink key={to} to={locked ? '#' : to}
                onClick={(e) => { if (locked) { e.preventDefault(); return } setOpen(false) }}
                style={({ isActive }) => ({
                  ...navLinkStyle(locked ? false : isActive),
                  opacity: locked ? 0.4 : 1,
                  cursor:  locked ? 'not-allowed' : 'pointer',
                })}>
                {({ isActive }) => (<>
                  <Icon size={15} style={{ flexShrink:0, color: locked ? '#475569' : isActive ? C.gold : C.mutedMd }}/>
                  <span style={{ flex:1 }}>{t(labelKey)}</span>
                  {locked
                    ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/>
                    : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.gold, flexShrink:0 }}/>
                  }
                </>)}
              </NavLink>
            )
          })}

          {isAdmin && isPageAllowed('branches') && (
            <NavLink to="/app/branches" onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                ...navLinkStyle(isActive),
                background: isActive ? C.entDim : 'transparent',
                borderLeft: isActive ? `3px solid ${C.enterprise}` : '3px solid transparent',
              })}>
              {({ isActive }) => (<>
                <GitBranch size={15} style={{ flexShrink:0, color: isActive ? C.enterprise : C.mutedMd }}/>
                <span style={{ flex:1 }}>{t('nav.branches') || 'Branches'}</span>
                {isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise, flexShrink:0 }}/>}
              </>)}
            </NavLink>
          )}

          {/* ── ANTREPRIZ ── */}
          <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(201,168,76,0.15)`, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:C.enterprise, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>✦ Antrepriz</span>
            <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise }}/>
          </div>

          {ENTERPRISE_ITEMS.map(({ to, icon: Icon, label, pageKey }) => {
            const locked = !isPageAllowed(pageKey)
            return (
              <NavLink key={to} to={locked ? '#' : to}
                onClick={(e) => { if (locked) { e.preventDefault(); return } setOpen(false) }}
                style={({ isActive }) => ({
                  ...enterpriseLinkStyle(locked ? false : isActive),
                  opacity: locked ? 0.4 : 1,
                  cursor:  locked ? 'not-allowed' : 'pointer',
                })}>
                {({ isActive }) => (<>
                  <Icon size={15} style={{ flexShrink:0, color: locked ? '#475569' : isActive ? C.enterprise : C.mutedMd }}/>
                  <span style={{ flex:1 }}>{label}</span>
                  {locked
                    ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/>
                    : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise, flexShrink:0 }}/>
                  }
                </>)}
              </NavLink>
            )
          })}

          {/* ── HOTEL ── */}
          {(() => {
            const hotelLocked = !isPageAllowed('hotel')
            return (
              <>
                <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(14,165,233,0.15)`, display:'flex', alignItems:'center', gap:8, opacity: hotelLocked ? 0.4 : 1 }}>
                  <span style={{ color:C.hotel, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>🏨 Hotel</span>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.hotel }}/>
                </div>
                {HOTEL_ITEMS.map(({ to, icon: Icon, label, end }) => (
                  <NavLink key={to} to={hotelLocked ? '#' : to} end={end}
                    onClick={(e) => { if (hotelLocked) { e.preventDefault(); return } setOpen(false) }}
                    style={({ isActive }) => ({
                      ...hotelLinkStyle(hotelLocked ? false : isActive),
                      opacity: hotelLocked ? 0.4 : 1,
                      cursor:  hotelLocked ? 'not-allowed' : 'pointer',
                    })}>
                    {({ isActive }) => (<>
                      <Icon size={15} style={{ flexShrink:0, color: hotelLocked ? '#475569' : isActive ? C.hotel : C.mutedMd }}/>
                      <span style={{ flex:1 }}>{label}</span>
                      {hotelLocked
                        ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/>
                        : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.hotel, flexShrink:0 }}/>
                      }
                    </>)}
                  </NavLink>
                ))}
              </>
            )
          })()}
        </nav>

        {/* ── PRESE ── */}
{(() => {
  const dryLocked = !isPageAllowed('dry')
  return (
    <>
      <div style={{ margin:'14px 4px 8px', paddingTop:12, borderTop:`1px solid rgba(139,92,246,0.15)`, display:'flex', alignItems:'center', gap:8, opacity: dryLocked ? 0.4 : 1 }}>
        <span style={{ color:C.dry, fontSize:10, fontWeight:800, letterSpacing:'0.10em', textTransform:'uppercase' }}>👔 Prese</span>
        <div style={{ width:6, height:6, borderRadius:'50%', background:C.dry }}/>
      </div>
      <NavLink to={dryLocked ? '#' : '/app/dry'}
        onClick={(e) => { if (dryLocked) { e.preventDefault(); return } setOpen(false) }}
        style={({ isActive }) => ({
          display:'flex', alignItems:'center', gap:10,
          padding:'9px 14px', borderRadius:10, marginBottom:3,
          textDecoration:'none',
          background: (!dryLocked && isActive) ? C.dryDim : 'transparent',
          color: (!dryLocked && isActive) ? '#ffffff' : C.muted,
          borderLeft: (!dryLocked && isActive) ? `3px solid ${C.dry}` : '3px solid transparent',
          fontWeight: (!dryLocked && isActive) ? 700 : 500,
          fontSize:13,
          opacity: dryLocked ? 0.4 : 1,
          cursor: dryLocked ? 'not-allowed' : 'pointer',
        })}>
        {({ isActive }) => (<>
          <Shirt size={15} style={{ flexShrink:0, color: dryLocked ? '#475569' : isActive ? C.dry : C.mutedMd }}/>
          <span style={{ flex:1 }}>Jestyon Prese</span>
          {dryLocked
            ? <Lock size={11} style={{ color:'#475569', flexShrink:0 }}/>
            : isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.dry, flexShrink:0 }}/>
          }
        </>)}
      </NavLink>
    </>
  )
})()}

        {/* ── SETTINGS + USER ── */}
        <div style={{ padding:'10px 10px 12px', paddingBottom:38, borderTop:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
          <NavLink to="/app/settings" onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 14px', borderRadius:10, marginBottom:8, textDecoration:'none',
              background: isActive ? `rgba(245,104,12,0.12)` : 'transparent',
              color: isActive ? '#fff' : C.muted,
              borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
              fontSize:13, fontWeight: isActive ? 700 : 500,
            })}>
            {({ isActive }) => (<>
              <Settings size={15} style={{ color: isActive ? C.gold : C.mutedMd, flexShrink:0 }}/>
              <span>{t('nav.settings')}</span>
            </>)}
          </NavLink>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:`rgba(245,104,12,0.08)`, border:`1px solid ${C.goldBorder}` }}>
            <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg, #ef4444, #dc2626)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14 }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:'#fff', fontSize:12, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.fullName}
              </p>
              <p style={{ color:C.gold, fontSize:10, fontWeight:600, textTransform:'capitalize', margin:'1px 0 0' }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </p>
            </div>
            <button onClick={handleLogout} title="Dekonekte" style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:4, borderRadius:6, display:'flex' }}>
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        <header style={{
          minHeight:58, background:'#fff',
          borderBottom:`1px solid rgba(245,104,12,0.15)`,
          boxShadow:'0 1px 8px rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', gap:6,
          padding:'0 12px', flexShrink:0, position:'relative', zIndex:10,
          flexWrap:'wrap',
        }}>
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

          {/* ══════════════════════════════════════════
              ✅ BLUETOOTH PRINTER — Global header
              Konekte yon fwa, sèvi pou tout paj
          ══════════════════════════════════════════ */}

          {/* Sou Android — montre Sunmi indicator */}
          {onAndroid && (
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'4px 10px', borderRadius:10,
              background:'rgba(5,150,105,0.08)',
              border:'1px solid rgba(5,150,105,0.2)',
              flexShrink:0,
            }}>
              <Printer size={13} style={{ color:'#059669' }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#059669' }}>Sunmi</span>
            </div>
          )}

          {/* Sou non-Android avèk Web Bluetooth — bouton konekte/dekonekte */}
          {!onAndroid && hasBluetooth && (
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              {!btConnected ? (
                /* ── PA konekte — bouton konekte */
                <button
                  onClick={btConnect}
                  disabled={btConnecting}
                  title="Konekte printer Bluetooth"
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'5px 12px', borderRadius:10,
                    border:'1px solid rgba(27,42,143,0.2)',
                    background: btConnecting ? 'rgba(27,42,143,0.05)' : 'transparent',
                    color: btConnecting ? '#94a3b8' : '#1B2A8F',
                    cursor: btConnecting ? 'not-allowed' : 'pointer',
                    fontSize:12, fontWeight:700,
                  }}
                >
                  <Bluetooth size={14}/>
                  {btConnecting ? 'Koneksyon...' : 'BT Printer'}
                </button>
              ) : (
                /* ── Konekte — indicator + bouton dekonekte */
                <>
                  <div style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'5px 10px', borderRadius:10,
                    background:'rgba(5,150,105,0.08)',
                    border:'1px solid rgba(5,150,105,0.25)',
                  }}>
                    {/* Dot vèt + glow */}
                    <div style={{
                      width:7, height:7, borderRadius:'50%',
                      background:'#059669',
                      boxShadow:'0 0 6px rgba(5,150,105,0.6)',
                    }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:'#059669', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {deviceName || 'Printer'}
                    </span>
                    {/* Spinner pandan enpresyon */}
                    {btPrinting && (
                      <div style={{
                        width:11, height:11,
                        border:'2px solid rgba(5,150,105,0.25)',
                        borderTopColor:'#059669',
                        borderRadius:'50%',
                        animation:'spin 0.8s linear infinite',
                        flexShrink:0,
                      }}/>
                    )}
                  </div>
                  {/* Bouton dekonekte */}
                  <button
                    onClick={btDisconnect}
                    title="Dekonekte printer"
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'center',
                      width:30, height:30, borderRadius:8,
                      background:'rgba(192,57,43,0.07)',
                      border:'1px solid rgba(192,57,43,0.2)',
                      color:'#C0392B', cursor:'pointer',
                    }}
                  >
                    <BluetoothOff size={13}/>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════ */}

          {/* Lang selector */}
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

          <NotificationBell lang={i18n.language}/>
        </header>

        <main style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'16px', paddingBottom:46 }}><Outlet /></div>
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        aside::-webkit-scrollbar { display:none; }
        nav::-webkit-scrollbar   { display:none; }
      `}</style>
    </div>
  )
}