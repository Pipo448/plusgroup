// src/components/NotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, X,
  ShoppingCart, CreditCard, AlertTriangle, Info,
  Package, UserCheck, TrendingDown, Tag, BellOff, BellRing,
} from 'lucide-react';
import api from '../services/api';

const POLL_INTERVAL  = 20_000
const LIMIT          = 15
const VAPID_PUBLIC_KEY = 'BNF9hgxjoniUXcgyOV7dWIfE5_-edySbwFKLS93Fvp3eYZqaj028sMuwChP-OZTHr9mLjUWxggkgn6H7NtgSpMU'

// ── Koulè ak icòn pa tip ──────────────────────────────────────
const TYPE_CONFIG = {
  invoice_created:  { icon: ShoppingCart,  color: '#1B2A8F', bg: '#EFF2FF', label: { ht:'Vant',       fr:'Vente',         en:'Sale'       } },
  invoice_paid:     { icon: CheckCheck,    color: '#16a34a', bg: '#F0FDF4', label: { ht:'Peye',       fr:'Payé',          en:'Paid'       } },
  payment_received: { icon: CreditCard,    color: '#0891b2', bg: '#ECFEFF', label: { ht:'Pèman',      fr:'Paiement',      en:'Payment'    } },
  low_stock:        { icon: AlertTriangle, color: '#ea580c', bg: '#FFF7ED', label: { ht:'Stòk Ba',    fr:'Stock Bas',     en:'Low Stock'  } },
  out_of_stock:     { icon: Package,       color: '#dc2626', bg: '#FEF2F2', label: { ht:'Stòk Vid',   fr:'Rupture',       en:'Out Stock'  } },
  employee_sale:    { icon: Tag,           color: '#7c3aed', bg: '#F5F3FF', label: { ht:'Anplwaye',   fr:'Employé',       en:'Employee'   } },
  employee_action:  { icon: UserCheck,     color: '#0284c7', bg: '#F0F9FF', label: { ht:'Aksyon',     fr:'Action',        en:'Action'     } },
  stock_alert:      { icon: TrendingDown,  color: '#d97706', bg: '#FFFBEB', label: { ht:'Alèt Stòk',  fr:'Alerte Stock',  en:'Stock Alert'} },
  default:          { icon: Info,          color: '#6b7280', bg: '#F9FAFB', label: { ht:'Info',        fr:'Info',          en:'Info'       } },
}
const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default

function timeAgo(dateStr, lang = 'ht') {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return lang === 'fr' ? "À l'instant" : lang === 'en' ? 'Just now'        : 'Kounye a'
  if (diff < 3600)  { const m = Math.floor(diff/60);   return lang === 'fr' ? `Il y a ${m}min` : lang === 'en' ? `${m}m ago` : `${m}min pase` }
  if (diff < 86400) { const h = Math.floor(diff/3600); return lang === 'fr' ? `Il y a ${h}h`   : lang === 'en' ? `${h}h ago` : `${h}h pase` }
  const d = Math.floor(diff/86400)
  return lang === 'fr' ? `Il y a ${d}j` : lang === 'en' ? `${d}d ago` : `${d}j pase`
}

const CATEGORIES = [
  { key: 'all',      ht: 'Tout',     fr: 'Tout',     en: 'All'       },
  { key: 'stock',    ht: 'Stòk',     fr: 'Stock',    en: 'Stock'     },
  { key: 'sales',    ht: 'Vant',     fr: 'Ventes',   en: 'Sales'     },
  { key: 'employee', ht: 'Anplwaye', fr: 'Employés', en: 'Employees' },
]
const CATEGORY_TYPES = {
  stock:    ['low_stock', 'out_of_stock', 'stock_alert'],
  sales:    ['invoice_created', 'invoice_paid', 'payment_received'],
  employee: ['employee_sale', 'employee_action'],
}

// ── Konvèti VAPID public key nan Uint8Array ────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// ── Son notifikasyon ──────────────────────────────────────────
function playNotifSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* silans si pa sipote */ }
}

// ─────────────────────────────────────────────────────────────
export default function NotificationBell({ lang = 'ht' }) {
  const [open, setOpen]             = useState(false)
  const [notifications, setNotifs]  = useState([])
  const [unreadCount, setUnread]    = useState(0)
  const [loading, setLoading]       = useState(false)
  const [page, setPage]             = useState(0)
  const [hasMore, setHasMore]       = useState(false)
  const [total, setTotal]           = useState(0)
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 640)
  const [category, setCategory]     = useState('all')
  const [shake, setShake]           = useState(false)

  // ✅ Push notification state
  const [pushPermission, setPushPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [pushEnabled, setPushEnabled]       = useState(false)
  const [pushLoading, setPushLoading]       = useState(false)
  const [swReg, setSwReg]                   = useState(null)

  const prevUnread = useRef(0)
  const panelRef   = useRef(null)

  // ── Rezize ────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // ── Bloke scroll sou mobile ───────────────────────────────
  useEffect(() => {
    if (isMobile) document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, isMobile])

  // ✅ Anrejistre Service Worker lè app la chaje ─────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/service-worker.js')
      .then(async (reg) => {
        setSwReg(reg)
        // Verifye si abònman egziste deja
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          setPushEnabled(true)
          setPushPermission('granted')
        }
      })
      .catch(err => console.warn('SW enrejistreman echwe:', err))
  }, [])

  // ✅ Mande pèmisyon + abòne pou Push ──────────────────────
  const enablePush = useCallback(async () => {
    if (!swReg || pushLoading) return
    setPushLoading(true)
    try {
      // 1. Mande pèmisyon
      const perm = await Notification.requestPermission()
      setPushPermission(perm)
      if (perm !== 'granted') {
        setPushLoading(false)
        return
      }

      // 2. Kreye subscription
      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // 3. Voye subscription bay backend
      await api.post('/push/subscribe', { subscription: subscription.toJSON() })
      setPushEnabled(true)

      // 4. Teste imedyatman — notifikasyon byenveni
      new Notification('PlusGroup ✅', {
        body:  lang === 'fr' ? 'Notifications activées!' : lang === 'en' ? 'Notifications enabled!' : 'Notifikasyon aktive!',
        icon:  '/logo.png',
        badge: '/logo.png',
      })
    } catch (err) {
      console.error('Push abònman echwe:', err)
    } finally {
      setPushLoading(false)
    }
  }, [swReg, pushLoading, lang])

  // ✅ Dezaktive push ────────────────────────────────────────
  const disablePush = useCallback(async () => {
    if (!swReg) return
    try {
      const sub = await swReg.pushManager.getSubscription()
      if (sub) {
        await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setPushEnabled(false)
    } catch (err) {
      console.error('Push dezabònman echwe:', err)
    }
  }, [swReg])

  // ── Fetch notifikasyon ────────────────────────────────────
  const fetchNotifs = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const offset     = reset ? 0 : page * LIMIT
      const typeFilter = category !== 'all' ? CATEGORY_TYPES[category]?.join(',') : undefined
      const { data }   = await api.get('/notifications', {
        params: { limit: LIMIT, offset, ...(typeFilter && { types: typeFilter }) }
      })
      if (data.success) {
        setNotifs(prev => reset ? data.notifications : [...prev, ...data.notifications])
        setUnread(data.unreadCount)
        setTotal(data.total)
        setHasMore((reset ? LIMIT : (page + 1) * LIMIT) < data.total)
        if (reset) setPage(0)
      }
    } catch (err) {
      console.error('Notifikasyon pa chaje:', err)
    } finally {
      setLoading(false)
    }
  }, [page, category])

  // ✅ Poll — anime klòch + son si nouvo ────────────────────
  const pollUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count')
      if (data.success) {
        const newCount = data.unreadCount
        if (newCount > prevUnread.current) {
          setShake(true)
          setTimeout(() => setShake(false), 800)
          playNotifSound()   // ✅ Son!
          if (open) fetchNotifs(true)
        }
        prevUnread.current = newCount
        setUnread(newCount)
      }
    } catch {}
  }, [open, fetchNotifs])

  useEffect(() => {
    pollUnread()
    const interval = setInterval(pollUnread, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [pollUnread])

  useEffect(() => {
    if (open) fetchNotifs(true)
  }, [open, category])

  // ── Fèmen si klike deyò ───────────────────────────────────
  useEffect(() => {
    if (isMobile) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  // ── Aksyon ────────────────────────────────────────────────
  const handleRead = async (id, e) => {
    e.stopPropagation()
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const handleMarkAll = async () => {
    try {
      await api.patch('/notifications/mark-all-read')
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnread(0)
    } catch {}
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/notifications/${id}`)
      setNotifs(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
    } catch {}
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
    fetchNotifs(false)
  }

  const getField = (n, field) =>
    n[`${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`] ||
    n[`${field}Ht`] || n[`${field}Fr`] || ''

  const i18n = {
    title:   lang === 'fr' ? 'Notifications' : lang === 'en' ? 'Notifications' : 'Notifikasyon',
    markAll: lang === 'fr' ? 'Tout lu'       : lang === 'en' ? 'Mark all'      : 'Mache tout',
    empty:   lang === 'fr' ? 'Aucune notification' : lang === 'en' ? 'No notifications' : 'Pa gen notifikasyon',
    more:    lang === 'fr' ? 'Voir plus'     : lang === 'en' ? 'Load more'     : 'Wè plis',
    notifs:  lang === 'fr' ? 'notification(s)' : lang === 'en' ? 'notification(s)' : 'notifikasyon',
    enablePush:  lang === 'fr' ? 'Activer les notifications' : lang === 'en' ? 'Enable notifications' : 'Aktive notifikasyon',
    disablePush: lang === 'fr' ? 'Désactiver' : lang === 'en' ? 'Disable' : 'Dezaktive',
    pushBlocked: lang === 'fr' ? 'Notifications bloquées' : lang === 'en' ? 'Notifications blocked' : 'Notifikasyon bloke',
  }

  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window

  const panelStyle = isMobile ? {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    width: '100%', background: '#fff',
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 -12px 50px rgba(0,0,0,0.18)',
    zIndex: 9999, maxHeight: '88vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animation: 'slideUpPanel 0.28s cubic-bezier(0.32,0.72,0,1)',
  } : {
    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
    width: '390px', maxWidth: 'calc(100vw - 20px)',
    background: '#fff', borderRadius: '18px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
    border: '1px solid #e5e7eb', zIndex: 9999,
    overflow: 'hidden',
    animation: 'fadeInDown 0.2s ease',
  }

  return (
    <>
      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0)}
          15%{transform:rotate(18deg)} 30%{transform:rotate(-16deg)}
          45%{transform:rotate(12deg)} 60%{transform:rotate(-8deg)}
          75%{transform:rotate(4deg)}
        }
        @keyframes slideUpPanel {
          from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1}
        }
        @keyframes fadeInDown {
          from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes pulse-dot {
          0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7}
        }
        .notif-item:hover       { background:#f8faff !important; }
        .notif-action-btn:hover { opacity:0.8; transform:scale(1.08); }
        .notif-action-btn       { transition:all 0.15s; }
        .cat-btn:hover          { border-color:#1B2A8F !important; color:#1B2A8F !important; }
        .load-more-btn:hover    { background:#EFF2FF !important; color:#1B2A8F !important; }
        .push-btn:hover         { opacity:0.85; }
      `}</style>

      {/* Overlay mobile */}
      {open && isMobile && (
        <div onClick={() => setOpen(false)} style={{
          position:'fixed', inset:0, zIndex:9998,
          background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)',
        }} />
      )}

      <div style={{ position:'relative', display:'inline-block' }} ref={!isMobile ? panelRef : null}>

        {/* ── BOUTON KLÒCH ──────────────────────────────────── */}
        <button onClick={() => setOpen(o => !o)} style={{
          position:'relative', background: open ? '#EFF2FF' : 'transparent',
          border: open ? '1px solid #c7d2fe' : '1px solid transparent',
          cursor:'pointer', padding:'7px', borderRadius:'10px',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: open ? '#1B2A8F' : '#6b7280', transition:'all 0.2s',
        }}>
          <Bell size={22} style={{
            animation: shake ? 'bellShake 0.8s ease' : 'none',
            transformOrigin:'top center',
          }} />
          {unreadCount > 0 && (
            <span style={{
              position:'absolute', top:'1px', right:'1px',
              background:'#ef4444', color:'#fff',
              fontSize:'10px', fontWeight:'800', borderRadius:'10px',
              padding:'1px 5px', minWidth:'18px', textAlign:'center',
              lineHeight:'16px', border:'2px solid #fff',
              animation: shake ? 'pulse-dot 0.8s ease' : 'none',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── PANEL ─────────────────────────────────────────── */}
        {open && (
          <div style={panelStyle} ref={isMobile ? panelRef : null}>

            {isMobile && (
              <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 2px', flexShrink:0 }}>
                <div style={{ width:44, height:5, borderRadius:3, background:'#d1d5db' }} />
              </div>
            )}

            {/* Header */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding: isMobile ? '12px 18px 14px' : '14px 18px',
              borderBottom:'1px solid #f3f4f6', background:'#fafafa', flexShrink:0,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{
                  width:34, height:34, borderRadius:10,
                  background:'linear-gradient(135deg,#1B2A8F,#2D3FBF)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 3px 10px rgba(27,42,143,0.3)',
                }}>
                  <Bell size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize: isMobile ? 16 : 14, color:'#111827', lineHeight:1.2 }}>
                    {i18n.title}
                  </div>
                  {total > 0 && <div style={{ fontSize:11, color:'#9ca3af' }}>{total} {i18n.notifs}</div>}
                </div>
                {unreadCount > 0 && (
                  <span style={{ background:'#1B2A8F', color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:800 }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAll} style={{
                    background:'none', border:'1px solid #e5e7eb', borderRadius:8,
                    cursor:'pointer', padding: isMobile ? '8px 14px' : '5px 10px',
                    fontSize:12, color:'#1B2A8F', fontWeight:700,
                    display:'flex', alignItems:'center', gap:4,
                    minHeight: isMobile ? 40 : 'auto',
                  }}>
                    <CheckCheck size={13} /> {i18n.markAll}
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  padding: isMobile ? 8 : 5, borderRadius:8, color:'#9ca3af',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  minWidth: isMobile ? 40 : 'auto', minHeight: isMobile ? 40 : 'auto',
                }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ✅ Bannè Push Permission ────────────────────── */}
            {pushSupported && pushPermission !== 'denied' && (
              <div style={{
                padding: '10px 16px',
                background: pushEnabled ? 'rgba(22,163,74,0.06)' : 'rgba(27,42,143,0.05)',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                flexShrink: 0,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  {pushEnabled
                    ? <BellRing size={15} style={{ color:'#16a34a', flexShrink:0 }} />
                    : <BellOff  size={15} style={{ color:'#1B2A8F', flexShrink:0 }} />
                  }
                  <span style={{ fontSize:12, color: pushEnabled ? '#16a34a' : '#374151', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {pushEnabled
                      ? (lang === 'fr' ? 'Notifications push activées' : lang === 'en' ? 'Push notifications on' : 'Push notifikasyon aktive ✅')
                      : (lang === 'fr' ? 'Recevoir des alertes sur ce téléphone' : lang === 'en' ? 'Get alerts on this device' : 'Resevwa alèt sou telefon sa a')
                    }
                  </span>
                </div>
                <button
                  className="push-btn"
                  onClick={pushEnabled ? disablePush : enablePush}
                  disabled={pushLoading}
                  style={{
                    flexShrink:0, padding:'6px 12px', borderRadius:8, border:'none',
                    cursor: pushLoading ? 'default' : 'pointer', fontSize:11, fontWeight:700,
                    background: pushEnabled ? '#fee2e2' : '#1B2A8F',
                    color: pushEnabled ? '#dc2626' : '#fff',
                    transition:'all 0.15s', opacity: pushLoading ? 0.6 : 1,
                  }}>
                  {pushLoading ? '...' : pushEnabled ? i18n.disablePush : i18n.enablePush}
                </button>
              </div>
            )}

            {/* Pèmisyon bloke */}
            {pushSupported && pushPermission === 'denied' && (
              <div style={{
                padding:'8px 16px', background:'#fff7ed', borderBottom:'1px solid #fed7aa',
                display:'flex', alignItems:'center', gap:6, flexShrink:0,
              }}>
                <AlertTriangle size={13} style={{ color:'#ea580c', flexShrink:0 }} />
                <span style={{ fontSize:11, color:'#9a3412' }}>
                  {i18n.pushBlocked} — {lang === 'fr' ? 'Modifiez les paramètres du navigateur' : lang === 'en' ? 'Update browser settings' : 'Chanje paramèt navigatè a'}
                </span>
              </div>
            )}

            {/* Filtè kategori */}
            <div style={{
              display:'flex', gap:6, padding: isMobile ? '10px 16px' : '8px 16px',
              borderBottom:'1px solid #f3f4f6', background:'#fff',
              overflowX:'auto', WebkitOverflowScrolling:'touch',
              scrollbarWidth:'none', flexShrink:0,
            }}>
              {CATEGORIES.map(c => {
                const active = category === c.key
                return (
                  <button key={c.key} className="cat-btn" onClick={() => setCategory(c.key)} style={{
                    flexShrink:0, padding: isMobile ? '7px 14px' : '5px 12px',
                    borderRadius:20, fontSize:12, fontWeight:700,
                    cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s',
                    background: active ? '#1B2A8F' : '#f3f4f6',
                    color:      active ? '#fff'    : '#6b7280',
                    border:`1.5px solid ${active ? '#1B2A8F' : '#e5e7eb'}`,
                    minHeight: isMobile ? 36 : 'auto',
                  }}>
                    {c[lang] || c.ht}
                  </button>
                )
              })}
            </div>

            {/* Liste notifikasyon */}
            <div style={{
              overflowY:'auto', flex:1,
              maxHeight: isMobile ? undefined : '380px',
              WebkitOverflowScrolling:'touch',
            }}>
              {loading && notifications.length === 0 ? (
                <div style={{ padding:'48px 20px', textAlign:'center', color:'#9ca3af' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>⏳</div>
                  <div style={{ fontSize:14 }}>
                    {lang === 'fr' ? 'Chargement...' : lang === 'en' ? 'Loading...' : 'Chajman...'}
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding:'56px 20px', textAlign:'center', color:'#9ca3af' }}>
                  <div style={{ width:64, height:64, borderRadius:20, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                    <Bell size={28} color="#d1d5db" />
                  </div>
                  <div style={{ fontSize: isMobile ? 15 : 14, fontWeight:600, color:'#6b7280' }}>
                    {i18n.empty}
                  </div>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg     = getConfig(n.type)
                  const IconCmp = cfg.icon
                  return (
                    <div key={n.id} className="notif-item" style={{
                      display:'flex', alignItems:'flex-start', gap:12,
                      padding: isMobile ? '14px 16px' : '12px 18px',
                      background: n.isRead ? '#fff' : '#eff6ff',
                      borderBottom:'1px solid #f3f4f6',
                      transition:'background 0.2s', position:'relative',
                    }}>
                      {!n.isRead && (
                        <div style={{
                          position:'absolute', left: isMobile ? 6 : 8, top:'50%',
                          transform:'translateY(-50%)',
                          width:6, height:6, borderRadius:'50%', background:'#1B2A8F',
                        }} />
                      )}
                      <div style={{
                        width: isMobile ? 42 : 36, height: isMobile ? 42 : 36,
                        borderRadius:11, flexShrink:0,
                        background:cfg.bg, color:cfg.color,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        marginLeft: !n.isRead ? (isMobile ? 8 : 6) : 0,
                      }}>
                        <IconCmp size={isMobile ? 18 : 16} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                          <span style={{
                            fontSize:10, fontWeight:800, textTransform:'uppercase',
                            letterSpacing:'0.05em', color:cfg.color,
                            background:cfg.bg, padding:'1px 7px', borderRadius:99,
                          }}>
                            {cfg.label[lang] || cfg.label.ht}
                          </span>
                        </div>
                        <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: isMobile ? 14 : 13, color:'#111827', lineHeight:1.35 }}>
                          {getField(n, 'title')}
                        </div>
                        <div style={{ fontSize: isMobile ? 13 : 12, color:'#6b7280', marginTop:3, lineHeight:1.5 }}>
                          {getField(n, 'message')}
                        </div>
                        <div style={{ fontSize:11, color:'#9ca3af', marginTop:5 }}>
                          {timeAgo(n.createdAt, lang)}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                        {!n.isRead && (
                          <button className="notif-action-btn" onClick={(e) => handleRead(n.id, e)} title="Mache li" style={{
                            background:'#1B2A8F18', border:'none', borderRadius:8, cursor:'pointer', color:'#1B2A8F',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            minWidth: isMobile ? 38 : 28, minHeight: isMobile ? 38 : 28,
                          }}>
                            <Check size={14} />
                          </button>
                        )}
                        <button className="notif-action-btn" onClick={(e) => handleDelete(n.id, e)} title="Efase" style={{
                          background:'#fee2e2', border:'none', borderRadius:8, cursor:'pointer', color:'#ef4444',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          minWidth: isMobile ? 38 : 28, minHeight: isMobile ? 38 : 28,
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
              {hasMore && (
                <div style={{ padding:'12px 16px', textAlign:'center' }}>
                  <button className="load-more-btn" onClick={loadMore} disabled={loading} style={{
                    background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:10,
                    cursor:'pointer', padding:'10px 28px', fontSize:13, color:'#6b7280',
                    fontWeight:600, minHeight:42, width: isMobile ? '100%' : 'auto', transition:'all 0.15s',
                  }}>
                    {loading ? '...' : i18n.more}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            {total > 0 && (
              <div style={{
                padding:'10px 18px', borderTop:'1px solid #f3f4f6',
                background:'#fafafa', textAlign:'center',
                fontSize:12, color:'#9ca3af', flexShrink:0,
              }}>
                {total} {i18n.notifs}
                {unreadCount > 0 && (
                  <span style={{ color:'#1B2A8F', fontWeight:700, marginLeft:6 }}>
                    · {unreadCount} {lang === 'fr' ? 'non lues' : lang === 'en' ? 'unread' : 'pa li'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}