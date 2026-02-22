// src/components/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Package, Users, FileText, Receipt,
  BarChart3, Settings, LogOut, Bell, Warehouse,
  TrendingUp, Menu, X, Globe, ChevronDown
} from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import api from '../../services/api'

// ── Koulè PLUS GROUP
const C = {
  black:   '#0A0A0F',
  darkBg:  '#111118',
  navBg:   '#13131C',
  gold:    '#C9A84C',
  goldLt:  '#F0D080',
  goldDim: 'rgba(201,168,76,0.15)',
  red:     '#C0392B',
  redBrt:  '#E74C3C',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  border:  'rgba(201,168,76,0.12)',
}

const NAV = [
  { to:'/dashboard', icon:LayoutDashboard, labelKey:'nav.dashboard' },
  { to:'/products',  icon:Package,          labelKey:'nav.products'  },
  { to:'/clients',   icon:Users,            labelKey:'nav.clients'   },
  { to:'/quotes',    icon:FileText,         labelKey:'nav.quotes'    },
  { to:'/invoices',  icon:Receipt,          labelKey:'nav.invoices'  },
  { to:'/stock',     icon:Warehouse,        labelKey:'nav.stock'     },
  { to:'/reports',   icon:TrendingUp,       labelKey:'nav.reports'   },
]

const LANGS = [
  { code:'ht', name:'Kreyòl', flag:'🇭🇹' },
  { code:'fr', name:'Français', flag:'🇫🇷' },
  { code:'en', name:'English', flag:'🇺🇸' },
]

const logoSrc = (url) => {
  if (!url) return null
  if (url.startsWith('http')) return url
  return url.startsWith('/') ? url : `/${url}`
}

export default function AppLayout() {
  const { user, tenant, token, setAuth, logout } = useAuthStore()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showLang, setShowLang] = useState(false)

  const currentLang = LANGS.find(l => l.code === i18n.language) || LANGS[0]

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('pg-auth') || '{}')
      const auth = raw?.state || raw
      if (auth?.tenant?.slug) api.defaults.headers.common['X-Tenant-Slug'] = auth.tenant.slug
    } catch {}
  }, [])

  useEffect(() => {
    if (token && !tenant) {
      authAPI.me().then(res => {
        if (res.data?.tenant?.slug) {
          api.defaults.headers.common['X-Tenant-Slug'] = res.data.tenant.slug
          setAuth(token, res.data.user, res.data.tenant)
        }
      }).catch(() => { logout(); navigate('/login') })
    } else if (token && tenant?.slug) {
      api.defaults.headers.common['X-Tenant-Slug'] = tenant.slug
    }
  }, [token, tenant])

  const handleLogout = () => {
    logout(); toast.success('Ou dekonekte.'); navigate('/login')
  }

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('plusgroup-lang', code)
    setShowLang(false)
    window.location.reload()
  }

  const tenantLogoUrl = logoSrc(tenant?.logoUrl)

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#F5F0E8', fontFamily:'DM Sans, sans-serif' }}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        position:'fixed', inset:'0 auto 0 0', zIndex:40, width:252,
        background:`linear-gradient(180deg, ${C.black} 0%, ${C.darkBg} 40%, ${C.navBg} 100%)`,
        display:'flex', flexDirection:'column',
        transform: open ? 'translateX(0)' : undefined,
        transition:'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow:'4px 0 32px rgba(0,0,0,0.5)',
        borderRight:`1px solid ${C.border}`,
      }}
        className="lg:relative lg:translate-x-0"
      >
        {/* Ligne or animée en haut */}
        <div style={{
          height:3,
          background:'linear-gradient(90deg, transparent 0%, #8B6914 15%, #C9A84C 35%, #F0D080 50%, #C9A84C 65%, #8B6914 85%, transparent 100%)',
          animation:'shimmer 3s linear infinite',
          backgroundSize:'200% 100%',
        }}/>

        {/* ── Logo zone ── */}
        <div style={{ padding:'20px 16px 16px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {tenantLogoUrl ? (
              <img src={tenantLogoUrl} alt="logo"
                style={{ width:48, height:48, borderRadius:12, objectFit:'contain',
                  background:'#fff', padding:5, boxShadow:`0 0 0 2px ${C.gold}40`, display:'block', flexShrink:0 }}
                onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }}
              />
            ) : null}
            <div style={{
              width:48, height:48, borderRadius:12, flexShrink:0,
              background:`linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
              display: tenantLogoUrl ? 'none' : 'flex',
              alignItems:'center', justifyContent:'center',
              boxShadow:`0 4px 20px ${C.gold}50`,
              fontSize:20, fontWeight:900, color:C.black,
            }}>
              {tenant?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:C.white, fontWeight:800, fontSize:13, margin:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {tenant?.name || 'PLUS GROUP'}
              </p>
              <p style={{ color:C.gold, fontSize:9, fontWeight:700, letterSpacing:'0.1em', margin:'3px 0 0', textTransform:'uppercase' }}>
                Innov@tion & Tech
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex:1, overflowY:'auto', padding:'10px 8px' }}>
          {NAV.map(({ to, icon:Icon, labelKey }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:10, marginBottom:2,
                textDecoration:'none',
                transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                background: isActive
                  ? `linear-gradient(135deg, ${C.gold}22, ${C.gold}0C)`
                  : 'transparent',
                color: isActive ? C.goldLt : C.muted,
                borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize:13,
                boxShadow: isActive ? `inset 0 0 20px ${C.gold}08` : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} style={{
                    flexShrink:0,
                    color: isActive ? C.gold : C.muted,
                    filter: isActive ? `drop-shadow(0 0 6px ${C.gold}80)` : 'none',
                    transition:'all 0.2s'
                  }}/>
                  <span>{t(labelKey)}</span>
                  {isActive && (
                    <div style={{
                      marginLeft:'auto', width:6, height:6, borderRadius:'50%',
                      background:C.gold, boxShadow:`0 0 8px ${C.gold}`
                    }}/>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Bottom ── */}
        <div style={{ padding:'10px 8px', borderTop:`1px solid ${C.border}` }}>
          <NavLink to="/settings" onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 12px', borderRadius:10, marginBottom:8,
              textDecoration:'none', transition:'all 0.2s',
              background: isActive ? `${C.gold}15` : 'transparent',
              color: isActive ? C.goldLt : C.muted,
              borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
              fontSize:13, fontWeight: isActive ? 700 : 500,
            })}>
            {({ isActive }) => (
              <><Settings size={16} style={{ color: isActive ? C.gold : C.muted }}/><span>{t('nav.settings')}</span></>
            )}
          </NavLink>

          {/* User card */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'10px 12px', borderRadius:12,
            background:`linear-gradient(135deg, ${C.gold}10, transparent)`,
            border:`1px solid ${C.gold}25`,
          }}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              background:`linear-gradient(135deg, ${C.red}, ${C.redBrt})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:C.white, fontWeight:800, fontSize:14,
              boxShadow:`0 2px 10px ${C.red}60`,
            }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:C.white, fontSize:12, fontWeight:700, margin:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.fullName}
              </p>
              <p style={{ color:C.gold, fontSize:10, fontWeight:600, textTransform:'capitalize', margin:'1px 0 0' }}>
                {user?.role}
              </p>
            </div>
            <button onClick={handleLogout} title="Dekonekte"
              style={{ background:'none', border:'none', cursor:'pointer',
                color:C.muted, padding:4, borderRadius:6, transition:'all 0.15s', display:'flex' }}
              onMouseEnter={e => { e.currentTarget.style.color=C.redBrt; e.currentTarget.style.transform='scale(1.15)' }}
              onMouseLeave={e => { e.currentTarget.style.color=C.muted;  e.currentTarget.style.transform='scale(1)' }}
            >
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:30 }} onClick={() => setOpen(false)}/>}

      {/* ══ MAIN ══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden',
        marginLeft: 0 }} className="lg:ml-[252px]">

        {/* ── Header ── */}
        <header style={{
          height:58, background:'#fff',
          borderBottom:`1px solid rgba(201,168,76,0.2)`,
          boxShadow:'0 2px 20px rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', gap:10,
          padding:'0 20px', flexShrink:0, position:'relative', zIndex:10
        }}>
          {/* Ligne dégradée en bas */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:2,
            background:'linear-gradient(90deg, transparent, #C0392B 20%, #C9A84C 50%, #C0392B 80%, transparent)'
          }}/>

          {/* Menu mobile */}
          <button onClick={() => setOpen(!open)}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.black,
              padding:6, borderRadius:8, display:'flex', transition:'all 0.15s' }}
            className="lg:hidden"
            onMouseEnter={e => e.currentTarget.style.background='#f5f0e8'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
          >
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>

          {/* Taux */}
          <div style={{
            display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:8,
            background:'linear-gradient(135deg,#FFF8E7,#FFF3D0)', border:'1px solid #F0D080', fontSize:12
          }}>
            <span style={{ color:'#8B6914', fontWeight:700 }}>1 USD</span>
            <span style={{ color:C.gold }}>=</span>
            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontWeight:800, color:C.black }}>
              {Number(tenant?.exchangeRate || 132).toFixed(2)} HTG
            </span>
          </div>

          <div style={{ flex:1 }}/>

          {/* ✅ LANGUAGE SWITCHER - AKOTE HTG! */}
          <div style={{ position:'relative' }}>
            <button
              onClick={() => setShowLang(!showLang)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'5px 12px', borderRadius:10,
                border:`1px solid ${showLang ? C.gold+'80' : 'rgba(0,0,0,0.1)'}`,
                background: showLang ? `${C.gold}15` : 'transparent',
                color: showLang ? C.gold : '#555',
                cursor:'pointer', transition:'all 0.2s',
                fontSize:12, fontWeight:700,
              }}
              onMouseEnter={e => { if(!showLang) { e.currentTarget.style.background='#FFF8E7'; e.currentTarget.style.borderColor=C.gold }}}
              onMouseLeave={e => { if(!showLang) { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(0,0,0,0.1)' }}}
            >
              <Globe size={16}/>
              <span style={{ fontSize:16 }}>{currentLang.flag}</span>
              <span style={{ fontSize:11, fontWeight:800 }}>{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={14} style={{ 
                transform: showLang ? 'rotate(180deg)' : 'none',
                transition:'transform 0.2s'
              }}/>
            </button>

            {showLang && (
              <div style={{
                position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:100,
                background:'#fff', borderRadius:12, minWidth:180,
                boxShadow:'0 12px 40px rgba(0,0,0,0.15)',
                border:`1px solid ${C.gold}30`,
                overflow:'hidden',
                animation:'dropDown 0.2s ease'
              }}>
                {LANGS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    style={{
                      width:'100%', display:'flex', alignItems:'center', gap:12,
                      padding:'12px 16px', border:'none', cursor:'pointer',
                      background: i18n.language === lang.code ? `${C.gold}15` : 'transparent',
                      color: i18n.language === lang.code ? C.gold : '#333',
                      fontWeight: i18n.language === lang.code ? 700 : 500,
                      fontSize:13, transition:'all 0.15s',
                      borderBottom:'1px solid rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={e => { if(i18n.language !== lang.code) e.currentTarget.style.background='#F5F0E8' }}
                    onMouseLeave={e => { if(i18n.language !== lang.code) e.currentTarget.style.background='transparent' }}
                  >
                    <span style={{ fontSize:20 }}>{lang.flag}</span>
                    <span style={{ flex:1 }}>{lang.name}</span>
                    {i18n.language === lang.code && (
                      <span style={{ color:C.gold, fontWeight:'bold', fontSize:16 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Devise badge */}
          <div style={{
            fontSize:11, fontWeight:800, padding:'5px 12px', borderRadius:99,
            background:`linear-gradient(135deg, ${C.black}, #1a1a28)`,
            color:C.gold, letterSpacing:'0.08em', border:`1px solid ${C.gold}40`,
            boxShadow:`0 2px 10px ${C.black}40`
          }}>
            {tenant?.defaultCurrency || 'HTG'}
          </div>

          {/* Notif */}
          <button style={{
            position:'relative', background:'none', border:'none', cursor:'pointer',
            color:'#555', padding:8, borderRadius:10, transition:'all 0.15s', display:'flex'
          }}
            onMouseEnter={e => { e.currentTarget.style.background='#FFF8E7'; e.currentTarget.style.color=C.gold; e.currentTarget.style.transform='scale(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#555'; e.currentTarget.style.transform='scale(1)' }}
          >
            <Bell size={19}/>
            <span style={{
              position:'absolute', top:7, right:7, width:8, height:8,
              borderRadius:'50%', background:C.red, border:'2px solid #fff',
              animation:'pulse 2s infinite'
            }}/>
          </button>
        </header>

        {/* Content */}
        <main style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'24px' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @keyframes dropDown {
          from { opacity:0; transform:translateY(-10px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes pulse {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(192,57,43,0.5) }
          50%      { opacity:0.8; box-shadow:0 0 0 5px rgba(192,57,43,0) }
        }
        .lg\\:relative { position: static !important; }
        .lg\\:translate-x-0 { transform: translateX(0) !important; }
        @media (max-width:1023px) {
          .lg\\:relative { position: fixed !important; }
          aside { transform: translateX(-100%); }
          aside.open { transform: translateX(0) !important; }
          .lg\\:ml-\\[252px\\] { margin-left: 0 !important; }
        }
        @media (min-width:1024px) {
          .lg\\:hidden { display:none !important; }
          .lg\\:ml-\\[252px\\] { margin-left: 252px; }
        }
        button { position: relative; overflow: hidden; }
        button::after {
          content:''; position:absolute; inset:0;
          background:radial-gradient(circle, rgba(201,168,76,0.3) 0%, transparent 70%);
          opacity:0; transition:opacity 0.3s;
          pointer-events:none;
        }
        button:active::after { opacity:1; }
        a[href], button { transition: transform 0.1s ease, box-shadow 0.1s ease; }
        a[href]:active, button:active { transform: scale(0.97); }
        nav a:active { transform: scale(0.98) translateX(2px); }
      `}</style>
    </div>
  )
}
