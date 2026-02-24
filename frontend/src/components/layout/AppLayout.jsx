// src/components/layout/AppLayout.jsx
// ✅ Koreksyon:
//    - Pa flash app anvan login — verifye token ANVAN mount
//    - Peso (DOP) + tout lòt monè afiche anlè tankou USD
//    - Responsive mobil

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Package, Users, FileText, Receipt,
  Warehouse, TrendingUp, Settings, LogOut, Bell,
  Menu, X, Globe, ChevronDown
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import api from '../../services/api'

const C = {
  black:'#0A0A0F', darkBg:'#111118', navBg:'#13131C',
  gold:'#C9A84C', goldLt:'#F0D080',
  red:'#C0392B', redBrt:'#E74C3C',
  white:'#FFFFFF', muted:'rgba(255,255,255,0.45)',
  border:'rgba(201,168,76,0.12)',
}

const NAV = [
  { to:'/app/dashboard', icon:LayoutDashboard, labelKey:'nav.dashboard' },
  { to:'/app/products',  icon:Package,         labelKey:'nav.products'  },
  { to:'/app/clients',   icon:Users,           labelKey:'nav.clients'   },
  { to:'/app/quotes',    icon:FileText,        labelKey:'nav.quotes'    },
  { to:'/app/invoices',  icon:Receipt,         labelKey:'nav.invoices'  },
  { to:'/app/stock',     icon:Warehouse,       labelKey:'nav.stock'     },
  { to:'/app/reports',   icon:TrendingUp,      labelKey:'nav.reports'   },
]

const LANGS = [
  { code:'ht', name:'Kreyòl',   flag:'🇭🇹' },
  { code:'fr', name:'Français', flag:'🇫🇷' },
  { code:'en', name:'English',  flag:'🇺🇸' },
]

const logoSrc = (url) => {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('http')) return url
  return url.startsWith('/') ? url : `/${url}`
}

const parseJson = (val, fallback) => {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fallback }
}

// Noms monè pou afichaj
const CURRENCY_LABELS = {
  USD: 'USD', DOP: 'DOP', EUR: 'EUR', CAD: 'CAD',
}

export default function AppLayout() {
  const { user, tenant, token, setAuth, logout } = useAuthStore()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen]           = useState(false)
  const [showLang, setShowLang]   = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  // ✅ Pa montre kontni si pa fini verifye token
  const [authChecked, setAuthChecked] = useState(false)
  const langRef = useRef(null)

  const currentLang = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  const exchangeRates     = parseJson(tenant?.exchangeRates, {})
  const visibleCurrencies = parseJson(tenant?.visibleCurrencies, ['USD'])
  const showExchangeRate  = tenant?.showExchangeRate !== false

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setShowLang(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!isDesktop) document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, isDesktop])

  useEffect(() => {
    if (tenant?.slug) {
      api.defaults.headers.common['X-Tenant-Slug'] = tenant.slug
    }
  }, [tenant])

  // ✅ FIX: Verifye token yon sèl fwa — si valid kite, si 401 logout
  // Pa redirect si token+tenant deja la (evite flash)
  useEffect(() => {
    if (!token) {
      // Pa gen token — redirect imedyatman
      navigate('/login', { replace: true })
      return
    }

    if (tenant) {
      // Token + tenant la — tout bon, pa bezwen API call
      api.defaults.headers.common['X-Tenant-Slug'] = tenant.slug
      setAuthChecked(true)
      return
    }

    // Token la men tenant manke — refresh depi API
    authAPI.me()
      .then(res => {
        if (res.data?.tenant?.slug) {
          api.defaults.headers.common['X-Tenant-Slug'] = res.data.tenant.slug
          setAuth(token, res.data.user, res.data.tenant)
        }
        setAuthChecked(true)
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          logout()
          navigate('/login', { replace: true })
        } else {
          // Lòt erè rezo — kite user rete
          setAuthChecked(true)
        }
      })
  }, []) // ✅ Run yon sèl fwa sèlman — pa re-run chak fwa tenant chanje

  const handleLogout = () => {
    logout()
    toast.success('Ou dekonekte.')
    navigate('/login')
  }

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('plusgroup-lang', code)
    setShowLang(false)
  }

  const tenantLogoUrl = logoSrc(tenant?.logoUrl)

  // ✅ rateItems — montre TOUT monè vizib (USD, DOP, etc.)
  const rateItems = showExchangeRate
    ? visibleCurrencies
        .map(currency => {
          const fromMap = (exchangeRates && typeof exchangeRates === 'object')
            ? exchangeRates[currency]
            : undefined
          // Fallback pou USD si pa gen rate nan map
          const rate = fromMap ?? (currency === 'USD' ? Number(tenant?.exchangeRate || 0) : 0)
          if (!rate || Number(rate) <= 0) return null
          return { currency, rate: Number(rate), label: CURRENCY_LABELS[currency] || currency }
        })
        .filter(Boolean)
    : []

  // ✅ Montre spinner pandan verifye auth — evite flash app anvan login
  if (!authChecked && !tenant) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0A0A0F' }}>
        <div style={{ width:36, height:36, border:'3px solid #C9A84C40', borderTop:'3px solid #C9A84C', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const sidebarStyle = {
    position: isDesktop ? 'relative' : 'fixed',
    inset: isDesktop ? 'auto' : '0 auto 0 0',
    zIndex: 40, width: 252,
    background: `linear-gradient(180deg, ${C.black} 0%, ${C.darkBg} 40%, ${C.navBg} 100%)`,
    display: 'flex', flexDirection: 'column',
    transform: isDesktop ? 'none' : (open ? 'translateX(0)' : 'translateX(-100%)'),
    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
    borderRight: `1px solid ${C.border}`,
    flexShrink: 0,
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#F5F0E8', fontFamily:'DM Sans, sans-serif' }}>

      {open && !isDesktop && (
        <div onClick={() => setOpen(false)} style={{
          position:'fixed', inset:0, zIndex:35,
          background:'rgba(0,0,0,0.75)', backdropFilter:'blur(2px)',
        }}/>
      )}

      {/* ══ SIDEBAR ══ */}
      <aside style={sidebarStyle}>
        <div style={{
          height:3,
          background:'linear-gradient(90deg,transparent,#8B6914 15%,#C9A84C 35%,#F0D080 50%,#C9A84C 65%,#8B6914 85%,transparent)',
          animation:'shimmer 3s linear infinite', backgroundSize:'200% 100%',
        }}/>

        {!isDesktop && (
          <button onClick={() => setOpen(false)} style={{
            position:'absolute', top:12, right:12, zIndex:50,
            background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`,
            borderRadius:8, padding:6, cursor:'pointer', color:C.muted, display:'flex',
          }}>
            <X size={16}/>
          </button>
        )}

        {/* Logo zone */}
        <div style={{ padding:'20px 16px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {tenantLogoUrl
              ? <img src={tenantLogoUrl} alt="logo" style={{ width:48, height:48, borderRadius:12, objectFit:'contain', background:'#fff', padding:5, boxShadow:`0 0 0 2px ${C.gold}40`, flexShrink:0 }}/>
              : <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, background:`linear-gradient(135deg,${C.gold},${C.goldLt})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:C.black, boxShadow:`0 4px 20px ${C.gold}50` }}>
                  {tenant?.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
            }
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:C.white, fontWeight:800, fontSize:13, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {tenant?.name || 'PLUS GROUP'}
              </p>
              <p style={{ color:C.gold, fontSize:9, fontWeight:700, letterSpacing:'0.1em', margin:'3px 0 0', textTransform:'uppercase' }}>
                Innov@tion & Tech
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 8px' }}>
          {NAV.map(({ to, icon:Icon, labelKey }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:10, marginBottom:2,
                textDecoration:'none', transition:'all 0.2s',
                background: isActive ? `linear-gradient(135deg,${C.gold}22,${C.gold}0C)` : 'transparent',
                color: isActive ? C.goldLt : C.muted,
                borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                fontWeight: isActive ? 700 : 500, fontSize:13,
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={16} style={{ flexShrink:0, color: isActive ? C.gold : C.muted }}/>
                  <span>{t(labelKey)}</span>
                  {isActive && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.gold, boxShadow:`0 0 8px ${C.gold}` }}/>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Settings + User */}
        <div style={{ padding:'10px 8px', borderTop:`1px solid ${C.border}` }}>
          <NavLink to="/app/settings" onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:10, marginBottom:8, textDecoration:'none',
              background: isActive ? `${C.gold}15` : 'transparent',
              color: isActive ? C.goldLt : C.muted,
              borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
              fontSize:13, fontWeight: isActive ? 700 : 500,
            })}>
            {({ isActive }) => (<><Settings size={16} style={{ color: isActive ? C.gold : C.muted }}/><span>{t('nav.settings')}</span></>)}
          </NavLink>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:`linear-gradient(135deg,${C.gold}10,transparent)`, border:`1px solid ${C.gold}25` }}>
            <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg,${C.red},${C.redBrt})`, display:'flex', alignItems:'center', justifyContent:'center', color:C.white, fontWeight:800, fontSize:14 }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:C.white, fontSize:12, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.fullName}</p>
              <p style={{ color:C.gold, fontSize:10, fontWeight:600, textTransform:'capitalize', margin:'1px 0 0' }}>{user?.role}</p>
            </div>
            <button onClick={handleLogout} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:4, borderRadius:6, display:'flex' }}>
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        {/* Header */}
        <header style={{
          minHeight:58, background:'#fff',
          borderBottom:`1px solid rgba(201,168,76,0.2)`,
          boxShadow:'0 2px 20px rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', gap:6,
          padding:'0 12px 0 16px', flexShrink:0, position:'relative', zIndex:10,
          flexWrap:'wrap',
        }}>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#C0392B 20%,#C9A84C 50%,#C0392B 80%,transparent)' }}/>

          {!isDesktop && (
            <button onClick={() => setOpen(!open)} style={{ background:'none', border:'none', cursor:'pointer', color:C.black, padding:6, borderRadius:8, display:'flex', flexShrink:0 }}>
              <Menu size={20}/>
            </button>
          )}

          {/* ✅ Taux yo — USD, DOP, ak tout lòt monè vizib */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            {rateItems.map(({ currency, rate, label }) => (
              <div key={currency} style={{
                display:'flex', alignItems:'center', gap:4,
                padding:'4px 8px', borderRadius:8,
                background:'linear-gradient(135deg,#FFF8E7,#FFF3D0)',
                border:'1px solid #F0D080', fontSize:11, flexShrink:0,
              }}>
                <span style={{ color:'#8B6914', fontWeight:700 }}>1 {label}</span>
                <span style={{ color:C.gold }}>=</span>
                <span style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:C.black }}>
                  {rate.toFixed(2)} HTG
                </span>
              </div>
            ))}
          </div>

          <div style={{ flex:1 }}/>

          {/* Lang Switcher */}
          <div style={{ position:'relative', flexShrink:0 }} ref={langRef}>
            <button onClick={() => setShowLang(!showLang)} style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:10,
              border:`1px solid ${showLang ? C.gold+'80' : 'rgba(0,0,0,0.1)'}`,
              background: showLang ? `${C.gold}15` : 'transparent',
              color: showLang ? C.gold : '#555', cursor:'pointer', fontSize:12, fontWeight:700,
            }}>
              <Globe size={15}/>
              <span style={{ fontSize:15 }}>{currentLang.flag}</span>
              <span style={{ fontSize:10, fontWeight:800 }}>{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={13} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
            </button>

            {showLang && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:100, background:'#fff', borderRadius:12, minWidth:175, boxShadow:'0 12px 40px rgba(0,0,0,0.15)', border:`1px solid ${C.gold}30`, overflow:'hidden', animation:'dropDown 0.2s ease' }}>
                {LANGS.map(lang => (
                  <button key={lang.code} onClick={() => changeLanguage(lang.code)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:10,
                    padding:'11px 14px', border:'none', cursor:'pointer',
                    background: i18n.language === lang.code ? `${C.gold}15` : 'transparent',
                    color: i18n.language === lang.code ? C.gold : '#333',
                    fontWeight: i18n.language === lang.code ? 700 : 500,
                    fontSize:13, borderBottom:'1px solid rgba(0,0,0,0.05)',
                  }}>
                    <span style={{ fontSize:18 }}>{lang.flag}</span>
                    <span style={{ flex:1 }}>{lang.name}</span>
                    {i18n.language === lang.code && <span style={{ color:C.gold }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Devise defò */}
          <div style={{ fontSize:11, fontWeight:800, padding:'5px 10px', borderRadius:99, background:`linear-gradient(135deg,${C.black},#1a1a28)`, color:C.gold, letterSpacing:'0.08em', border:`1px solid ${C.gold}40`, flexShrink:0 }}>
            {tenant?.defaultCurrency || 'HTG'}
          </div>

          {/* Notif */}
          <button style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color:'#555', padding:7, borderRadius:10, display:'flex', flexShrink:0 }}>
            <Bell size={18}/>
            <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:C.red, border:'2px solid #fff', animation:'pulse 2s infinite' }}/>
          </button>
        </header>

        <main style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'16px' }}><Outlet /></div>
        </main>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes dropDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,0.5)} 50%{box-shadow:0 0 0 5px rgba(192,57,43,0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
