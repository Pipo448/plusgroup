// src/components/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Package, Users, FileText, Receipt,
  Warehouse, TrendingUp, Settings, LogOut, Bell,
  Menu, X, Globe, ChevronDown,
  GitBranch, CreditCard, Smartphone, Phone, Lock,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import api from '../../services/api'

const C = {
  black:'#1a0533', darkBg:'#2d0a4e', navBg:'#1f0a3a',
  gold:'#f5680c', goldLt:'#ff8534',
  red:'#C0392B', redBrt:'#E74C3C',
  white:'#FFFFFF', muted:'rgba(255,255,255,0.55)',
  border:'rgba(245,104,12,0.15)',
  enterprise: '#C9A84C',
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

const ENTERPRISE_ITEMS = [
  { to:'/app/kane',     icon:CreditCard,  label:'Ti Kanè Kès'      },
  { to:'/app/sabotay',  icon:Smartphone,  label:'Sabotay'           },
  { to:'/app/mobilpay', icon:Phone,       label:'MonCash / NatCash' },
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

const safeJson = (val, fallback) => {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fallback }
}

// ── Style pou nav link nòmal
const navLinkStyle = (isActive) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'9px 12px', borderRadius:10, marginBottom:2,
  textDecoration:'none', transition:'all 0.2s',
  background: isActive ? `linear-gradient(90deg,rgba(245,104,12,0.22),rgba(245,104,12,0.06))` : 'transparent',
  color: isActive ? '#ffffff' : C.muted,
  border: isActive ? `1px solid rgba(245,104,12,0.22)` : '1px solid transparent',
  fontWeight: isActive ? 700 : 500, fontSize:13,
  boxShadow: isActive ? '0 2px 12px rgba(245,104,12,0.12)' : 'none',
})

// ── Style pou nav link Enterprise
const enterpriseLinkStyle = (isActive, locked) => ({
  display:'flex', alignItems:'center', gap:10,
  padding:'9px 12px', borderRadius:10, marginBottom:2,
  textDecoration:'none', transition:'all 0.2s',
  background: isActive && !locked ? `rgba(201,168,76,0.18)` : 'transparent',
  color: locked ? 'rgba(255,255,255,0.3)' : (isActive ? '#ffffff' : C.muted),
  border: isActive && !locked ? `1px solid rgba(201,168,76,0.3)` : '1px solid transparent',
  fontWeight: isActive && !locked ? 700 : 500, fontSize:13,
  cursor: locked ? 'not-allowed' : 'pointer',
})

export default function AppLayout() {
  const { user, tenant, token, setAuth, logout } = useAuthStore()
  const loading = useAuthStore(s => s.loading)
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen]           = useState(false)
  const [showLang, setShowLang]   = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const langRef = useRef(null)

  const currentLang = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  // ── Kalkile dwa itilizatè
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  const planName = tenant?.plan?.name || ''
  const isEnterprise = ['antepriz', 'antrepriz', 'entreprise', 'enterprise']
    .includes(planName.toLowerCase().trim())

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
  }, [tenant?.slug])

  useEffect(() => {
    if (!token || tenant) return
    authAPI.me()
      .then(res => {
        if (res.data?.tenant?.slug) {
          api.defaults.headers.common['X-Tenant-Slug'] = res.data.tenant.slug
          setAuth(token, res.data.user, res.data.tenant)
        }
      })
      .catch(err => {
        if (err.response?.status === 401) {
          logout()
          navigate('/login', { replace: true })
        }
      })
  }, [token, tenant])

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

  const exchangeRates     = safeJson(tenant?.exchangeRates, {})
  const visibleCurrencies = safeJson(tenant?.visibleCurrencies, ['USD'])

  const rateItems = visibleCurrencies.map(cur => {
    const rate = Number(
      exchangeRates[cur] ||
      (cur === 'USD' ? tenant?.exchangeRate : 0) ||
      0
    )
    if (!rate) return null
    return { cur, rate }
  }).filter(Boolean)

  const tenantLogoUrl = logoSrc(tenant?.logoUrl)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1a0533' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(245,104,12,0.3)', borderTop:'3px solid #f5680c', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const sidebarStyle = {
    position: isDesktop ? 'relative' : 'fixed',
    inset: isDesktop ? 'auto' : '0 auto 0 0',
    zIndex: 40, width: 252,
    background: `linear-gradient(160deg, ${C.black} 0%, ${C.darkBg} 45%, ${C.navBg} 100%)`,
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
        {/* Bann oreanj anlè */}
        <div style={{
          height:3,
          background:'linear-gradient(90deg,transparent,#b34200 10%,#f5680c 35%,#ff8534 50%,#f5680c 65%,#b34200 90%,transparent)',
          animation:'shimmer 3s linear infinite', backgroundSize:'200% 100%',
        }}/>

        {/* Efè limyè oreanj anlè */}
        <div style={{
          position:'absolute', top:-60, left:-40, width:220, height:220,
          background:'radial-gradient(circle, rgba(245,104,12,0.15) 0%, transparent 70%)',
          pointerEvents:'none',
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
        <div style={{ padding:'20px 16px 16px', borderBottom:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {tenantLogoUrl
              ? <img src={tenantLogoUrl} alt="logo" style={{ width:48, height:48, borderRadius:12, objectFit:'contain', background:'rgba(255,255,255,0.08)', padding:5, boxShadow:`0 0 0 2px rgba(245,104,12,0.35)`, flexShrink:0 }}/>
              : <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, background:`linear-gradient(135deg,${C.gold},${C.goldLt})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff', boxShadow:`0 4px 20px rgba(245,104,12,0.4)` }}>
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

          {/* Badge plan */}
          <div style={{
            marginTop:10, display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'5px 10px', borderRadius:8,
            background: isEnterprise ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isEnterprise ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <span style={{ fontSize:11, color: isEnterprise ? C.enterprise : '#475569', fontWeight:700 }}>
              {planName || 'Free'}
            </span>
            {!isEnterprise && (
              <NavLink to="/app/settings" style={{ fontSize:10, color:C.enterprise, textDecoration:'none', fontWeight:700 }}>
                Upgrade →
              </NavLink>
            )}
          </div>
        </div>

        {/* ══ Navigation ══ */}
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 8px', position:'relative', zIndex:1 }}>

          {/* Menu prensipal */}
          {NAV.map(({ to, icon:Icon, labelKey }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              style={({ isActive }) => navLinkStyle(isActive)}>
              {({ isActive }) => (
                <>
                  <Icon size={16} style={{ flexShrink:0, color: isActive ? C.gold : C.muted, filter: isActive ? 'drop-shadow(0 0 4px rgba(245,104,12,0.6))' : 'none' }}/>
                  <span>{t(labelKey)}</span>
                  {isActive && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.gold, boxShadow:`0 0 8px ${C.gold}` }}/>}
                </>
              )}
            </NavLink>
          ))}

          {/* ── Branches (admin sèlman) */}
          {isAdmin && (
            <NavLink to="/app/branches" onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                ...navLinkStyle(isActive),
                background: isActive ? `rgba(201,168,76,0.18)` : 'transparent',
                border: isActive ? `1px solid rgba(201,168,76,0.3)` : '1px solid transparent',
              })}>
              {({ isActive }) => (
                <>
                  <GitBranch size={16} style={{ flexShrink:0, color: isActive ? C.enterprise : C.muted }}/>
                  <span>{t('nav.branches') || 'Branches'}</span>
                  {isActive && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.enterprise, boxShadow:`0 0 8px ${C.enterprise}` }}/>}
                </>
              )}
            </NavLink>
          )}

          {/* ── Divider Antepriz */}
          <div style={{
            margin:'10px 4px 6px', paddingTop:10,
            borderTop:`1px solid rgba(201,168,76,0.18)`,
            display:'flex', alignItems:'center', gap:8,
          }}>
            <span style={{ color: isEnterprise ? C.enterprise : '#334155', fontSize:10, fontWeight:700, letterSpacing:'0.1em' }}>
              ✦ ANTEPRIZ
            </span>
            {isEnterprise && (
              <div style={{ width:6, height:6, borderRadius:'50%', background:C.enterprise, animation:'pulse 2s infinite' }}/>
            )}
          </div>

          {/* ── Enterprise Items */}
          {ENTERPRISE_ITEMS.map(({ to, icon:Icon, label }) => {
            const locked = !isEnterprise
            return (
              <NavLink
                key={to}
                to={locked ? '#' : to}
                onClick={(e) => {
                  if (locked) { e.preventDefault(); return }
                  setOpen(false)
                }}
                style={({ isActive }) => enterpriseLinkStyle(isActive, locked)}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} style={{
                      flexShrink:0,
                      color: locked ? '#334155' : (isActive ? C.enterprise : C.muted),
                    }}/>
                    <span style={{ color: locked ? '#334155' : undefined }}>{label}</span>
                    {locked
                      ? <Lock size={11} style={{ marginLeft:'auto', color:'#334155', flexShrink:0 }}/>
                      : isActive && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.enterprise, boxShadow:`0 0 8px ${C.enterprise}` }}/>
                    }
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* ══ Settings + User ══ */}
        <div style={{ padding:'10px 8px', borderTop:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
          <NavLink to="/app/settings" onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:10, marginBottom:8, textDecoration:'none',
              background: isActive ? `rgba(245,104,12,0.15)` : 'transparent',
              color: isActive ? '#ffffff' : C.muted,
              border: isActive ? `1px solid rgba(245,104,12,0.22)` : '1px solid transparent',
              fontSize:13, fontWeight: isActive ? 700 : 500,
            })}>
            {({ isActive }) => (<><Settings size={16} style={{ color: isActive ? C.gold : C.muted }}/><span>{t('nav.settings')}</span></>)}
          </NavLink>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:`linear-gradient(135deg,rgba(245,104,12,0.12),transparent)`, border:`1px solid rgba(245,104,12,0.2)` }}>
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

      {/* ══ MAIN CONTENT AREA ══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        {/* Header */}
        <header style={{
          minHeight:58, background:'#fff',
          borderBottom:`1px solid rgba(245,104,12,0.15)`,
          boxShadow:'0 2px 20px rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', gap:6,
          padding:'0 12px', flexShrink:0, position:'relative', zIndex:10,
          flexWrap:'wrap',
        }}>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#C0392B 20%,#f5680c 50%,#C0392B 80%,transparent)' }}/>

          {!isDesktop && (
            <button onClick={() => setOpen(!open)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1a0533', padding:6, borderRadius:8, display:'flex', flexShrink:0 }}>
              <Menu size={20}/>
            </button>
          )}

          {rateItems.map(({ cur, rate }) => (
            <div key={cur} style={{
              display:'flex', alignItems:'center', gap:4,
              padding:'4px 8px', borderRadius:8,
              background:'linear-gradient(135deg,#FFF8E7,#FFF3D0)',
              border:'1px solid #f5680c40', fontSize:11, flexShrink:0,
            }}>
              <span style={{ color:'#b34200', fontWeight:700 }}>1 {cur}</span>
              <span style={{ color:'#f5680c' }}>=</span>
              <span style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:'#1a0533' }}>
                {rate.toFixed(2)} HTG
              </span>
            </div>
          ))}

          <div style={{ flex:1 }}/>

          {/* Lang Switcher */}
          <div style={{ position:'relative', flexShrink:0 }} ref={langRef}>
            <button onClick={() => setShowLang(!showLang)} style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:10,
              border:`1px solid ${showLang ? '#f5680c80' : 'rgba(0,0,0,0.1)'}`,
              background: showLang ? 'rgba(245,104,12,0.08)' : 'transparent',
              color: showLang ? '#f5680c' : '#555', cursor:'pointer', fontSize:12, fontWeight:700,
            }}>
              <Globe size={15}/>
              <span style={{ fontSize:15 }}>{currentLang.flag}</span>
              <span style={{ fontSize:10, fontWeight:800 }}>{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={13} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
            </button>

            {showLang && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:100, background:'#fff', borderRadius:12, minWidth:175, boxShadow:'0 12px 40px rgba(0,0,0,0.15)', border:'1px solid rgba(245,104,12,0.2)', overflow:'hidden' }}>
                {LANGS.map(lang => (
                  <button key={lang.code} onClick={() => changeLanguage(lang.code)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:10,
                    padding:'11px 14px', border:'none', cursor:'pointer',
                    background: i18n.language === lang.code ? 'rgba(245,104,12,0.08)' : 'transparent',
                    color: i18n.language === lang.code ? '#f5680c' : '#333',
                    fontWeight: i18n.language === lang.code ? 700 : 500,
                    fontSize:13, borderBottom:'1px solid rgba(0,0,0,0.05)',
                  }}>
                    <span style={{ fontSize:18 }}>{lang.flag}</span>
                    <span style={{ flex:1 }}>{lang.name}</span>
                    {i18n.language === lang.code && <span style={{ color:'#f5680c' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Devise */}
          <div style={{ fontSize:11, fontWeight:800, padding:'5px 10px', borderRadius:99, background:`linear-gradient(135deg,#1a0533,#2d0a4e)`, color:'#f5680c', letterSpacing:'0.08em', border:'1px solid rgba(245,104,12,0.3)', flexShrink:0 }}>
            {tenant?.defaultCurrency || 'HTG'}
          </div>

          {/* Notif */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color:'#555', padding:7, borderRadius:10, display:'flex', flexShrink:0 }}
            >
              <Bell size={18}/>
              <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:C.red, border:'2px solid #fff', animation:'pulse 2s infinite' }}/>
            </button>

            {showNotif && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:320, background:'#fff', borderRadius:16, boxShadow:'0 16px 48px rgba(0,0,0,0.15)', border:'1px solid rgba(0,0,0,0.08)', zIndex:999, overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>Notifikasyon</span>
                  <button onClick={() => setShowNotif(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#999' }}>✕</button>
                </div>
                <div style={{ padding:24, textAlign:'center', color:'#aaa', fontSize:13 }}>
                  <Bell size={32} style={{ marginBottom:8, opacity:0.3 }}/>
                  <p>Pa gen notifikasyon pou kounye a</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'16px' }}><Outlet /></div>
        </main>

      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,0.5)} 50%{box-shadow:0 0 0 5px rgba(192,57,43,0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
