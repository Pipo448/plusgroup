// src/components/layout/AppLayout.jsx — Plus Fit redesign
// ✅ KORIJE:
//   • Lè w chanje paj, nouvo paj la te louvri nan menm pozisyon defilman ak ansyen an
//     (egz. ou te anba nèt nan Pwodui → Kliyan te louvri anba tou) → kounye a li remonte anlè
//   • « Rale pou rafrechi » te rechaje TOUT app la (window.reload) → tout done yo te
//     telechaje ankò (kota Supabase!). Kounye a se sèlman done paj ou ap gade a ki rafrechi
//   • Sou telefòn, header a te fè 2 liy (to yo + bouton yo) e li te manje plas paj la →
//     kounye a se yon sèl liy; Lang ak Lajan an deplase nan meni an
//   • Espas vid anba paj yo (pou ansyen bann ki te kole anba a) retire
//   • localStorage ki pa disponib (navigatè prive) te ka kraze layout la
//   • Kalkilatris: 0.1 + 0.2 te bay 0.30000000000000004; dat istorik la pa t an lè Ayiti
//   • Meni mobil la pa t fèmen ak bouton Escape
// ✅ NOUVO:
//   • Animasyon antre pou chak paj + ba pwogresyon oranj anlè lè w chanje paj
//   • Rechèch nan meni an (tape « fak » → Fakti) — rakousi Ctrl+K
//   • Sidebar ka vin piti (sèlman ikòn) sou òdinatè, li sonje chwa ou
//   • Glise meni an sou bò goch pou fèmen l sou telefòn
//   • Kalkilatris: klavye òdinatè a mache (chif, + − × ÷, Enter, Backspace), klike sou yon
//     kalkil nan istorik la pou reitilize rezilta a
//   • Bann « Ou pa konekte ak entènèt » lè koneksyon an tonbe
//   • Bouton « remonte anlè » lè w desann lwen nan yon paj
import { createPortal } from 'react-dom'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Package, Users, FileText, Receipt, Warehouse, TrendingUp, Settings, LogOut,
  Menu, X, Globe, ChevronDown, GitBranch, CreditCard, Smartphone, Phone, Lock, ChevronRight,
  Wallet, Hotel, CalendarDays, Tag, Bluetooth, BluetoothOff, Printer, Scissors, DollarSign, BookOpen,
  TrendingDown, UserCog, BarChart2, Calculator, Delete, RefreshCw, UtensilsCrossed, Truck, ClipboardCheck,
  Banknote, Search, ChevronsLeft, ArrowUp, WifiOff, Crown, FilePlus2, ShoppingBag, Globe2, PieChart, Palette,
} from 'lucide-react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import api, { authAPI, branchAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { isSunmi } from '../../services/printerService'
import NotificationBell from '../NotificationBell'
// ✅ NOUVO — Tradiksyon modil Restoran (4 lang) pou tit meni yo
import { ensureRestoI18n } from '../../pages/restaurant/restoI18n'
// ✅ NOUVO — Tradiksyon tout seksyon/modil meni an (4 lang)
import { ensureLayoutI18n } from './layoutI18n'
// ✅ NOUVO — koulè anblèm tenant lan (meni, tèt paj, bouton, modil Restoran)
import { useTenantBrand } from '../../theme/tenantBrand'
import './layout.css'

const TZ = 'America/Port-au-Prince'
const COL_KEY = 'pg-sidebar-col'
const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
  del: (k) => { try { localStorage.removeItem(k) } catch {} },
}

const COLORS = { acc: 'var(--brand-on-dark, #f5680c)', ent: '#C9A84C', hotel: '#0EA5E9', resto: '#DC2626', gym: '#14B8A6', dry: '#8B5CF6', rh: '#10B981' }

const LANGS = [
  { code: 'ht', name: 'Kreyòl', flag: '🇭🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]
// Paj ki FÈMEN pa default (Super Admin dwe aktive yo) — menm lis ak App.jsx
const STRICT_PAGES = ['kes-sesyon', 'estok-kontwol', 'restaurant-portal']
const ROLE_LABELS = { admin: 'Admin', cashier: 'Kesye', stock_manager: 'Jesyonè Estòk', viewer: 'Obsèvatè' }

const logoSrc = (url) => !url ? null : (url.startsWith('data:') || url.startsWith('http')) ? url : (url.startsWith('/') ? url : `/${url}`)
const tr = (t, k, fb) => { const v = t(k); return v && v !== k ? v : fb }
const safeJson = (val, fb) => { if (!val) return fb; if (typeof val === 'object') return val; try { return JSON.parse(val) } catch { return fb } }

// ════════════════════════════════════════════════════════════
// Kalkilatris
// ════════════════════════════════════════════════════════════
const fix = (n) => (Number.isFinite(n) ? +n.toPrecision(12) : 0)

function CalculatorMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('pad')
  const [display, setDisplay] = useState('0')
  const [prevValue, setPrevValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [lastExpr, setLastExpr] = useState('')
  const [hit, setHit] = useState(null)
  const [history, setHistory] = useState(() => { try { return JSON.parse(ls.get('plusgroup-calc-history') || '[]') } catch { return [] } })
  const ref = useRef(null)
  const title = tr(t, 'calculator.title', 'Kalkilatris')

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const persist = (next) => { setHistory(next); ls.set('plusgroup-calc-history', JSON.stringify(next.slice(0, 50))) }
  const calc = (a, b, op) => fix(op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : op === '÷' ? (b !== 0 ? a / b : 0) : b)
  const liveExpr = operator && prevValue != null ? `${prevValue} ${operator} ${waiting ? '' : display}` : ''

  const press = (b) => {
    setHit(b); setTimeout(() => setHit(null), 120)
    if (b >= '0' && b <= '9') {
      if (waiting) { setDisplay(b); setWaiting(false); if (!operator) setLastExpr('') }
      else setDisplay(d => (d === '0' ? b : d.length >= 15 ? d : d + b))
      return
    }
    if (b === '.') { if (waiting) { setDisplay('0.'); setWaiting(false); return } if (!display.includes('.')) setDisplay(display + '.'); return }
    if (b === 'C') { setDisplay('0'); setPrevValue(null); setOperator(null); setWaiting(false); setLastExpr(''); return }
    if (b === '±') { setDisplay(String(fix(parseFloat(display) * -1))); return }
    if (b === '%') { setDisplay(String(fix(parseFloat(display) / 100))); return }
    if (['+', '-', '×', '÷'].includes(b)) {
      const v = parseFloat(display)
      if (prevValue == null) setPrevValue(v)
      else if (operator && !waiting) { const r = calc(prevValue, v, operator); setDisplay(String(r)); setPrevValue(r) }
      setWaiting(true); setOperator(b); return
    }
    if (b === '=') {
      const v = parseFloat(display)
      if (operator && prevValue != null) {
        const r = calc(prevValue, v, operator)
        setLastExpr(`${prevValue} ${operator} ${v} =`)
        persist([{ id: `${Date.now()}`, expr: `${prevValue} ${operator} ${v}`, result: r, at: new Date().toISOString() }, ...history])
        setDisplay(String(r)); setPrevValue(null); setOperator(null); setWaiting(true)
      }
    }
  }
  const back = () => { if (!waiting) setDisplay(d => (d.length > 1 ? d.slice(0, -1) : '0')) }

  // ✅ Klavye òdinatè a
  useEffect(() => {
    if (!open) return
    const h = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable || e.ctrlKey || e.metaKey) return
      const map = { '*': '×', x: '×', '/': '÷', '+': '+', '-': '-', Enter: '=', '=': '=', ',': '.', '.': '.', '%': '%', c: 'C', C: 'C', Delete: 'C' }
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key) }
      else if (map[e.key]) { e.preventDefault(); press(map[e.key]) }
      else if (e.key === 'Backspace') { e.preventDefault(); back() }
      else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const fmtDate = (iso) => new Date(iso).toLocaleString('fr-HT', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const BTNS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=']

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ref}>
      <button className={`lay-hb ${open ? 'on' : ''}`} onClick={() => setOpen(o => !o)} title={title} aria-label={title}>
        <Calculator size={16}/><span className="t">{title}</span>
      </button>
      {open && (
        <div className="lay-calc" role="dialog" aria-label={title}>
          <div className="tabs">
            <button className={tab === 'pad' ? 'on' : ''} onClick={() => setTab('pad')}>{title.toUpperCase()}</button>
            <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>{tr(t, 'calculator.history', 'Istorik').toUpperCase()}{history.length ? ` · ${history.length}` : ''}</button>
            <button className="x" onClick={() => setOpen(false)} aria-label="Fèmen"><X size={14}/></button>
          </div>
          {tab === 'pad' ? (
            <>
              <div className="ex">{liveExpr || lastExpr || ' '}</div>
              <div className="disp">
                <button onClick={back} title="Efase dènye chif" aria-label="Efase"><Delete size={16}/></button>
                <b>{display}</b>
              </div>
              <div className="pad">
                {BTNS.map((b, i) => (
                  <button key={i} onClick={() => press(b)} className={`${['÷', '×', '-', '+', '='].includes(b) ? 'op' : ['C', '±', '%'].includes(b) ? 'fn' : ''} ${b === '0' ? 'z' : ''} ${hit === b ? 'hit' : ''}`}>{b}</button>
                ))}
              </div>
              <div className="kb">Klavye a mache: chif, + − * /, Enter, Backspace, C</div>
            </>
          ) : (
            <div className="hist">
              {!history.length ? (
                <p style={{ padding: '24px 14px', textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 12, margin: 0 }}>{tr(t, 'calculator.noHistory', 'Pa gen kalkil ankò')}</p>
              ) : (
                <>
                  {history.map(h => (
                    <div key={h.id} className="h" title="Itilize rezilta sa a" onClick={() => { setDisplay(String(h.result)); setPrevValue(null); setOperator(null); setWaiting(true); setLastExpr(`${h.expr} =`); setTab('pad') }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontFamily: 'monospace' }}>{h.expr} =</span>
                        <span style={{ fontSize: 15, color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>{h.result}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{fmtDate(h.at)}</div>
                    </div>
                  ))}
                  <button onClick={() => persist([])} style={{ width: '100%', padding: '11px 0', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,.1)', color: '#f87171', fontSize: 12, fontWeight: 800 }}>
                    {tr(t, 'calculator.clearHistory', 'Efase istorik la')}
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

// ════════════════════════════════════════════════════════════
// Zòn defilman + « rale pou rafrechi » (rafrechi sèlman done yo)
// ════════════════════════════════════════════════════════════
function ScrollArea({ children, pathname }) {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const ref = useRef(null)
  const startY = useRef(0)
  const dragging = useRef(false)
  const pullRef = useRef(0)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const THRESHOLD = 70

  // ✅ Chak nouvo paj kòmanse anlè
  useEffect(() => { ref.current?.scrollTo({ top: 0 }) }, [pathname])

  const onScroll = () => setShowTop((ref.current?.scrollTop || 0) > 700)
  const setPull = (v) => { pullRef.current = v; setPullY(v) }

  const onStart = (e) => {
    if (refreshing || (ref.current?.scrollTop || 0) > 0) return
    startY.current = e.touches[0].clientY
    dragging.current = true
  }
  const onMove = (e) => {
    if (!dragging.current || refreshing) return
    const d = e.touches[0].clientY - startY.current
    if (d > 0) setPull(Math.min(d * 0.5, 110))
    else { dragging.current = false; setPull(0) }
  }
  const onEnd = async () => {
    if (!dragging.current) return
    dragging.current = false
    if (pullRef.current >= THRESHOLD) {
      setRefreshing(true); setPull(56)
      try {
        // ✅ Rafrechi SÈLMAN rekèt ki aktif sou paj la (pa tout app la)
        await Promise.all([qc.invalidateQueries({ refetchType: 'active' }), new Promise(r => setTimeout(r, 500))])
        toast.success(tr(t, 'lay.refreshed', 'Done yo rafrechi'), { id: 'ptr', duration: 1200 })
      } finally { setRefreshing(false); setPull(0) }
    } else setPull(0)
  }

  return (
    <div ref={ref} id="app-scroll" className="lay-scroll" onScroll={onScroll} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <div className="lay-ptr" style={{ height: pullY, transition: dragging.current ? 'none' : 'height .25s ease' }}>
        {pullY > 6 && (refreshing ? <div className="sp"/> : <RefreshCw size={20} style={{ transform: `rotate(${pullY * 2.6}deg)`, opacity: Math.min(1, pullY / THRESHOLD) }}/>)}
      </div>
      {children}
      {showTop && <button className="lay-top" onClick={() => ref.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={tr(t, 'lay.backTop', 'Remonte anlè')}><ArrowUp size={18}/></button>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function AppLayout() {
  const { user, tenant, token, logout } = useAuthStore()
  const loading = useAuthStore(s => s.loading)
  useTenantBrand(tenant?.id)
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const [open, setOpen] = useState(false)
  const [col, setCol] = useState(() => ls.get(COL_KEY) === '1')
  const [showLang, setShowLang] = useState(false)
  const [showBranches, setShowBranches] = useState(false)
  const [branches, setBranches] = useState([])
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  const [find, setFind] = useState('')
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  const [openGroups, setOpenGroups] = useState({})
  const [prog, setProg] = useState(0)

  const langRef = useRef(null)
  const branchRef = useRef(null)
  const branchMenuRef = useRef(null)
  const findRef = useRef(null)
  const meCalled = useRef(false)
  const touchX = useRef(null)
  const [branchMenuPos, setBranchMenuPos] = useState({ top: 70, left: 16 })

  const { connected: btConnected, connecting: btConnecting, printing: btPrinting, connect: btConnect, disconnect: btDisconnect, deviceName } = usePrinterStore()
  const onSunmi = useMemo(() => { try { return isSunmi() } catch { return false } }, [])
  const hasBluetooth = useMemo(() => typeof navigator !== 'undefined' && !!navigator.bluetooth, [])
  ensureRestoI18n(i18n)
  ensureLayoutI18n(i18n)
  const lang = (i18n.language || 'ht').substring(0, 2)
  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0]
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  const planName = tenant?.plan?.name || ''
  const isEnterprise = ['antepriz', 'antrepriz', 'entreprise', 'enterprise'].includes(planName.toLowerCase().trim())
  const currentBranchId = useMemo(() => ls.get('plusgroup-branch-id'), [])
  const currentBranchName = useMemo(() => ls.get('plusgroup-branch-name'), [])

  const isPageAllowed = useCallback((pageKey) => {
    if (pageKey === null || pageKey === undefined) return true
    let ap = tenant?.allowedPages
    if (typeof ap === 'string') { try { ap = JSON.parse(ap) } catch { ap = null } }
    // ✅ NOUVO — Sesyon Kès, Kontwòl Estòk, Pòtal restoran: parèt SÈLMAN si Super Admin lan aktive yo
    if (STRICT_PAGES.includes(pageKey)) return !!(ap && ap[pageKey] === true)
    return !(ap && typeof ap === 'object' && ap[pageKey] === false)
  }, [tenant?.allowedPages])

  // ── Efè sistèm (header API, /me, branch) ──
  useEffect(() => {
    const id = ls.get('plusgroup-branch-id')
    if (id) api.defaults.headers.common['X-Branch-Id'] = id
    else delete api.defaults.headers.common['X-Branch-Id']
  }, [])
  useEffect(() => { if (tenant?.slug) api.defaults.headers.common['X-Tenant-Slug'] = tenant.slug }, [tenant?.slug])
  useEffect(() => {
    if (!token || meCalled.current) return
    meCalled.current = true
    authAPI.me().then(res => {
      if (res.data?.tenant?.slug) {
        api.defaults.headers.common['X-Tenant-Slug'] = res.data.tenant.slug
        useAuthStore.getState().refreshTenant?.(res.data.tenant)
      }
    }).catch(err => { if (err.response?.status === 401) { logout(); navigate('/login', { replace: true }) } })
  }, [token]) // eslint-disable-line
  useEffect(() => {
    if (!isAdmin || !token) return
    branchAPI.getAll().then(r => setBranches(r.data?.branches || [])).catch(() => {})
  }, [isAdmin, token])

  // ── Pozisyon meni branch ──
  const updateBranchMenuPos = useCallback(() => {
    if (!branchRef.current) return
    const rect = branchRef.current.getBoundingClientRect()
    let left = rect.left
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256
    if (left < 16) left = 16
    setBranchMenuPos({ top: rect.bottom + 8, left })
  }, [])
  useEffect(() => {
    if (!showBranches) return
    updateBranchMenuPos()
    window.addEventListener('resize', updateBranchMenuPos)
    window.addEventListener('scroll', updateBranchMenuPos, true)
    return () => { window.removeEventListener('resize', updateBranchMenuPos); window.removeEventListener('scroll', updateBranchMenuPos, true) }
  }, [showBranches, updateBranchMenuPos])

  useEffect(() => {
    const onDoc = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target) && branchMenuRef.current && !branchMenuRef.current.contains(e.target)) setShowBranches(false)
      if (langRef.current && !langRef.current.contains(e.target)) setShowLang(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('resize', onResize); window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (!isDesktop) document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, isDesktop])

  // Chanjman paj: fèmen meni mobil, ba pwogresyon
  useEffect(() => { if (!isDesktop) setOpen(false); setProg(p => p + 1); setShowLang(false) }, [path]) // eslint-disable-line
  useEffect(() => { ls.set(COL_KEY, col ? '1' : '0') }, [col])

  // Escape fèmen meni an · Ctrl+K louvri rechèch meni an
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { setOpen(false); setShowLang(false); setShowBranches(false) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isDesktop) setCol(false); else setOpen(true)
        setTimeout(() => findRef.current?.focus(), 80)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isDesktop])

  const handleLogout = useCallback(() => {
    ls.del('plusgroup-branch-id'); ls.del('plusgroup-branch-name')
    delete api.defaults.headers.common['X-Branch-Id']
    logout(); toast.success(tr(t, 'header.loggedOutSuccess', 'Ou dekonekte')); navigate('/login')
  }, [logout, navigate, t])

  const changeLanguage = useCallback((code) => { i18n.changeLanguage(code); ls.set('plusgroup-lang', code); setShowLang(false) }, [i18n])

  const handleSwitchBranch = useCallback((branch) => {
    if (!branch.isActive) { toast.error('Branch sa a bloke.'); return }
    if (branch.id === currentBranchId) { setShowBranches(false); return }
    ls.set('plusgroup-branch-id', branch.id); ls.set('plusgroup-branch-name', branch.name)
    api.defaults.headers.common['X-Branch-Id'] = branch.id
    setShowBranches(false); toast.success(`Branch: ${branch.name}`)
    window.location.href = '/app/dashboard'
  }, [currentBranchId])

  const handleClearBranch = useCallback(() => {
    ls.del('plusgroup-branch-id'); ls.del('plusgroup-branch-name')
    delete api.defaults.headers.common['X-Branch-Id']
    setShowBranches(false); toast.success('Wè tout branch yo')
    window.location.href = '/app/dashboard'
  }, [])

  const rateItems = useMemo(() => {
    const rates = safeJson(tenant?.exchangeRates, {})
    const vis = safeJson(tenant?.visibleCurrencies, ['USD'])
    return (Array.isArray(vis) ? vis : []).map(cur => {
      const rate = Number(rates[cur] || (cur === 'USD' ? tenant?.exchangeRate : 0) || 0)
      return rate ? { cur, rate } : null
    }).filter(Boolean)
  }, [tenant?.exchangeRates, tenant?.visibleCurrencies, tenant?.exchangeRate])

  const tenantLogoUrl = useMemo(() => logoSrc(tenant?.logoUrl), [tenant?.logoUrl])

  // ✅ NOUVO — Kantite nouvo kòmand an liy (badge nan meni an). Ti demann (yon chif),
  // chak 60s, sèlman si modil Restoran an aktive pou tenant lan; kanpe lè onglè a kache.
  const restoOn = tenant?.allowedPages?.restaurant === true
  const [restoNew, setRestoNew] = useState(0)
  useEffect(() => {
    if (!restoOn || !token) return undefined
    let alive = true
    const tick = () => {
      if (document.hidden) return
      api.get('/restaurant/online-orders/count').then(r => { if (alive) setRestoNew(r.data?.count || 0) }).catch(() => {})
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [restoOn, token])

  // ── Estrikti meni an (done) ──
  const L = (k, fb) => tr(t, k, fb)
  const SECTIONS = useMemo(() => [
    { key: 'main', title: L('lay.mainMenu', 'Meni prensipal'), color: COLORS.acc, items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: L('lay.dashboard', 'Tablo bò'), pageKey: 'dashboard' },
      { to: '/app/products', icon: Package, label: L('lay.products', 'Pwodui'), pageKey: 'products' },
      { to: '/app/clients', icon: Users, label: L('lay.clients', 'Kliyan'), pageKey: 'clients' },
      { to: '/app/quotes', icon: FileText, label: L('lay.quotes', 'Devi'), pageKey: 'quotes' },
      { to: '/app/direct-quotes', icon: FilePlus2, label: L('lay.directQuotes', 'Devi Dirèk'), pageKey: 'direct-quotes' },
      { to: '/app/invoices', icon: Receipt, label: L('lay.invoices', 'Fakti'), pageKey: 'invoices' },
      { to: '/app/stock', icon: Warehouse, label: L('lay.stock', 'Estòk'), pageKey: 'stock' },
      { to: '/app/reports', icon: TrendingUp, label: L('lay.reports', 'Rapò'), pageKey: 'reports' },
      { to: '/app/kes-sesyon', icon: Wallet, label: L('lay.kesSesyon', 'Sesyon Kès'), pageKey: 'kes-sesyon' },
      { to: '/app/estok-kontwol', icon: ClipboardCheck, label: L('lay.estokKontwol', 'Kontwòl Estòk'), pageKey: 'estok-kontwol' },
      { to: '/app/branches', icon: GitBranch, label: L('lay.branches', 'Branch'), pageKey: 'branches', adminOnly: true, color: COLORS.ent },
    ] },
    { key: 'ent', title: L('lay.enterprise', '✦ Antrepriz'), color: COLORS.ent, items: [
      { to: '/app/kane', icon: CreditCard, label: L('lay.kane', 'Ti Kanè Kès'), pageKey: 'kane' },
      { group: 'mikwo', icon: Wallet, label: L('lay.mikwo', 'Mikwo Kredi'), show: isPageAllowed('kane-epay') || isPageAllowed('pre'), match: ['/app/kane-epay', '/app/pre', '/app/mikwo-kredi-gid', '/app/mikwo-profit'], children: [
        { to: '/app/kane-epay', icon: Wallet, label: L('lay.kaneEpay', 'Kanè Epay'), pageKey: 'kane-epay', end: true },
        { to: '/app/pre', icon: DollarSign, label: L('lay.pre', 'Prè'), pageKey: 'pre', end: true },
        { to: '/app/pre/cash-flow', icon: RefreshCw, label: L('lay.cashFlow', 'Rapò Antre/Soti'), pageKey: 'pre', end: true },
        { to: '/app/mikwo-kredi-gid', icon: BookOpen, label: L('lay.guide', 'Gid'), pageKey: null, end: true, color: '#3B82F6' },
        { to: '/app/mikwo-profit', icon: BarChart2, label: L('lay.profit', 'Pwofi/Pèt'), pageKey: null, end: true },
      ] },
      { to: '/app/sabotay', icon: Smartphone, label: L('lay.sabotay', 'Sabotay'), pageKey: 'sabotay' },
      { to: '/app/mobilpay', icon: Phone, label: L('lay.mobilpay', 'MonCash / NatCash'), pageKey: 'mobilpay' },
    ] },
    { key: 'hotel', title: L('lay.hotel', '🏨 Hotel'), color: COLORS.hotel, pageKey: 'hotel', items: [
      { to: '/app/hotel', icon: Hotel, label: L('lay.hotelDash', 'Dashboard Hotel'), end: true },
      { to: '/app/hotel/reservations', icon: CalendarDays, label: L('lay.hotelResv', 'Rezèvasyon') },
      { to: '/app/hotel/room-types', icon: Tag, label: L('lay.roomTypes', 'Tip Chanm') },
    ] },
    { key: 'resto', title: L('lay.restaurant', '🍽️ Restoran'), color: COLORS.resto, pageKey: 'restaurant', items: [
      { to: '/app/restaurant/dashboard', icon: PieChart, label: L('resto.nav.dashboard', 'Tablo Restoran'), end: true },
      { to: '/app/restaurant/tables', icon: Users, label: L('resto.nav.tablesNav', 'Tab & Kòmand'), end: true },
      { to: '/app/restaurant/menu', icon: UtensilsCrossed, label: L('resto.nav.menuNav', 'Meni'), end: true },
      { to: '/app/restaurant/orders', icon: ShoppingBag, label: L('resto.nav.orders', 'Kòmand an liy'), end: true, badge: restoNew, pageKey: 'restaurant-portal' },
      { to: '/app/restaurant/reservations', icon: CalendarDays, label: L('resto.nav.reservations', 'Rezèvasyon'), end: true },
      { to: '/app/restaurant/report', icon: BarChart2, label: L('resto.nav.report', 'Rapò vant'), end: true, roles: ['admin', 'cashier'] },
      { to: '/app/restaurant/portal', icon: Globe2, label: L('resto.nav.portal', 'Pòtal kliyan'), end: true, pageKey: 'restaurant-portal', adminOnly: true },
    ] },
    { key: 'gym', title: `💪 ${L('gym.title', 'Jim')}`, color: COLORS.gym, pageKey: 'gym', items: [
      { to: '/app/gym', icon: LayoutDashboard, label: L('gym.nav.dashboard', 'Tablo Jim'), end: true },
      { to: '/app/gym/members', icon: Users, label: L('gym.nav.members', 'Manm') },
      { to: '/app/gym/classes', icon: BookOpen, label: L('gym.nav.classes', 'Kou') },
      { to: '/app/gym/plans', icon: CreditCard, label: L('gym.nav.plans', 'Plan') },
      { to: '/app/gym/daily-payment', icon: Banknote, label: L('gym.nav.dailyPayment', 'Peman jounen') },
    ] },
    { key: 'dry', title: L('lay.dry', '👔 Prese'), color: COLORS.dry, pageKey: 'dry', items: [
      { to: '/app/dry', icon: Scissors, label: L('lay.dryManage', 'Jestyon Prese') },
    ] },
    { key: 'rh', title: L('lay.rh', '💼 RH & Finans'), color: COLORS.rh, items: [
      { to: '/app/employees', icon: UserCog, label: L('lay.employees', 'Anplwaye'), pageKey: 'employees' },
      { to: '/app/expenses', icon: TrendingDown, label: L('lay.expenses', 'Depans'), pageKey: 'expenses', color: '#EF4444' },
      { to: '/app/founise', icon: Truck, label: L('lay.founise', 'Founisè'), pageKey: 'founise', color: '#FF6B00' },
    ] },
  ], [t, i18n.language, isPageAllowed, restoNew]) // eslint-disable-line

  const q = find.trim().toLowerCase()
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const visibleSections = useMemo(() => SECTIONS
    .filter(s => isPageAllowed(s.pageKey))
    .map(s => ({
      ...s,
      items: s.items.map(it => {
        if (it.group) {
          if (!it.show) return null
          const kids = it.children.filter(c => isPageAllowed(c.pageKey) && (!q || norm(c.label).includes(norm(q)) || norm(it.label).includes(norm(q))))
          return kids.length ? { ...it, children: kids } : null
        }
        if (!isPageAllowed(it.pageKey) || (it.adminOnly && !isAdmin)) return null
        // ✅ NOUVO — paj ki rezève pou kèk wòl (egz. Rapò vant: admin + kesye)
        if (it.roles && !isAdmin && !it.roles.includes(user?.role)) return null
        if (q && !norm(it.label).includes(norm(q))) return null
        return it
      }).filter(Boolean),
    }))
    .filter(s => s.items.length), [SECTIONS, isPageAllowed, isAdmin, q, user?.role, tenant?.allowedPages])

  const firstMatch = useMemo(() => {
    for (const s of visibleSections) for (const it of s.items) { if (it.to) return it.to; if (it.children?.[0]) return it.children[0].to }
    return null
  }, [visibleSections])

  let delay = 0
  const renderItem = (it, color) => {
    const c = it.color || color
    const d = Math.min(delay++, 25) * 18
    if (it.group) {
      const active = it.match.some(m => path.startsWith(m))
      const opened = q ? true : (openGroups[it.group] ?? active)
      return (
        <div key={it.group}>
          <button type="button" className={`lay-it ${active ? 'on' : ''}`} style={{ '--c': c, animationDelay: `${d}ms` }} data-tip={it.label} title={col && isDesktop ? it.label : undefined}
            onClick={() => { if (col && isDesktop) { setCol(false); setOpenGroups(g => ({ ...g, [it.group]: true })) } else setOpenGroups(g => ({ ...g, [it.group]: !opened })) }}>
            <it.icon size={16}/><span className="l">{it.label}</span><ChevronDown size={14} className={`chev ${opened ? 'op' : ''}`}/>
          </button>
          {opened && (
            <div className="lay-sub" style={{ '--c': c }}>
              {it.children.map(ch => renderItem(ch, c))}
            </div>
          )}
        </div>
      )
    }
    return (
      <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `lay-it ${isActive ? 'on' : ''}`} style={{ '--c': c, animationDelay: `${d}ms` }} data-tip={it.label} title={col && isDesktop ? it.label : undefined}
        onClick={() => setFind('')}>
        {({ isActive }) => (<><it.icon size={16}/><span className="l">{it.label}</span>{it.badge > 0 && <span className="bdg">{it.badge > 99 ? '99+' : it.badge}</span>}{isActive && !it.badge && <span className="dot"/>}</>)}
      </NavLink>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117' }}>
      <div style={{ width: 38, height: 38, border: '3px solid rgba(var(--brand-rgb, 245,104,12),.15)', borderTopColor: 'var(--brand-on-dark, #f5680c)', borderRadius: '50%', animation: 'lay-spin .8s linear infinite' }}/>
      <style>{'@keyframes lay-spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  )

  return (
    <div className={`lay ${col && isDesktop ? 'col' : ''} ${open ? 'open' : ''}`}>
      {open && !isDesktop && <div className="lay-overlay" onClick={() => setOpen(false)}/>}

      {/* ════════════ SIDEBAR ════════════ */}
      <aside className="lay-side"
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => { if (touchX.current != null && e.changedTouches[0].clientX - touchX.current < -60) setOpen(false); touchX.current = null }}>
        <div className="bar"/>

        <div className="lay-brand">
          <div className="r">
            <div className="lay-logo" title={tenant?.name || 'PLUS GROUP'}>
              {tenantLogoUrl ? <img src={tenantLogoUrl} alt="logo" onError={e => { e.currentTarget.style.display = 'none' }}/> : (tenant?.name?.charAt(0)?.toUpperCase() || 'P')}
            </div>
            <div className="nm">
              <b>{tenant?.name || 'PLUS GROUP'}</b>
              {currentBranchName ? <small className="br">📍 {currentBranchName}</small> : <small>Innov@tion &amp; Tech</small>}
            </div>
            {isAdmin && branches.length > 0 && (
              <div ref={branchRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button className={`lay-ib ${showBranches ? 'on' : currentBranchId ? 'grn' : ''}`} onClick={() => setShowBranches(s => !s)} title={L('lay.changeBranch', 'Chanje branch')} aria-label={L('lay.changeBranch', 'Chanje branch')}>
                  <GitBranch size={13}/>
                </button>
                {showBranches && createPortal(
                  <div ref={branchMenuRef} style={{ position: 'fixed', top: branchMenuPos.top, left: branchMenuPos.left, minWidth: 230, maxWidth: 'calc(100vw - 32px)', zIndex: 9999, background: 'var(--side-top, #0f1117)', border: '1px solid rgba(var(--brand-rgb, 245,104,12),.22)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,.65)', overflow: 'hidden', fontFamily: 'Manrope, sans-serif', animation: 'lay-pop .18s both' }}>
                    <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(var(--brand-rgb, 245,104,12),.1)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-on-dark, #f5680c)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      <GitBranch size={12}/> {L('lay.changeBranch', 'Chanje branch')}
                    </div>
                    <button onClick={handleClearBranch} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', cursor: 'pointer', background: !currentBranchId ? 'rgba(var(--brand-rgb, 245,104,12),.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-on-dark, #f5680c)' }}/>
                      <span style={{ flex: 1, textAlign: 'left' }}><b style={{ display: 'block', color: '#fff', fontSize: 13 }}>{L('lay.allBranches', 'Tout branch yo')}</b><small style={{ color: '#64748b', fontSize: 10 }}>{L('lay.globalData', 'Wè done global')}</small></span>
                      {!currentBranchId && <span style={{ color: 'var(--brand-on-dark, #f5680c)', fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </button>
                    {branches.map(b => {
                      const cur = b.id === currentBranchId
                      return (
                        <button key={b.id} onClick={() => handleSwitchBranch(b)} disabled={!b.isActive} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', cursor: b.isActive ? 'pointer' : 'not-allowed', background: cur ? 'rgba(34,197,94,.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.isActive ? '#22c55e' : '#ef4444', flexShrink: 0 }}/>
                          <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}><b style={{ display: 'block', color: b.isActive ? '#fff' : '#64748b', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</b><small style={{ color: '#64748b', fontSize: 10 }}>{b.isActive ? L('lay.active', 'Aktif') : L('lay.blocked', 'Bloke')}</small></span>
                          {cur ? <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 800 }}>✓</span> : !b.isActive ? <Lock size={11} color="#64748b"/> : <ChevronRight size={13} color="#64748b"/>}
                        </button>
                      )
                    })}
                    <button onClick={() => { navigate('/app/branches'); setShowBranches(false) }} style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-on-dark, #f5680c)', fontSize: 11.5, fontWeight: 800 }}>
                      <GitBranch size={12}/> {L('lay.manageBranches', 'Jere branch yo →')}
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            )}
            {!isDesktop && <button className="lay-ib" onClick={() => setOpen(false)} aria-label="Fèmen meni"><X size={15}/></button>}
          </div>
          <div className={`lay-plan ${isEnterprise ? 'ent' : ''}`}>
            <span>{isEnterprise && <Crown size={12}/>}{planName || 'Free'}</span>
            {!isEnterprise && <NavLink to="/app/plans">{L('lay.upgrade', 'Upgrade →')}</NavLink>}
          </div>
        </div>

        <div className="lay-find">
          <Search size={14}/>
          <input ref={findRef} value={find} onChange={e => setFind(e.target.value)} placeholder={L('lay.search', 'Chèche yon paj…')}
            onKeyDown={e => { if (e.key === 'Enter' && firstMatch) { navigate(firstMatch); setFind('') } if (e.key === 'Escape') setFind('') }}/>
          {find ? <button onClick={() => setFind('')} aria-label="Efase"><X size={13}/></button> : isDesktop && <kbd>Ctrl K</kbd>}
        </div>

        <nav className="lay-nav">
          {visibleSections.length ? visibleSections.map(s => (
            <div key={s.key}>
              <div className="lay-sec" style={{ '--c': s.color }}>{s.title}</div>
              {s.items.map(it => renderItem(it, s.color))}
            </div>
          )) : <div className="lay-empty">{t('lay.noMatch', { q: find, defaultValue: `Okenn paj pa koresponn ak « ${find} »` })}</div>}
        </nav>

        <div className="lay-foot">
          {/* Lang + lajan — sou telefòn yo la (header a twò sere) */}
          <div className="lay-mprefs">
            {LANGS.map(l => <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => changeLanguage(l.code)} title={l.name}>{l.flag} {l.code.toUpperCase()}</button>)}
            <span>{tenant?.defaultCurrency || 'HTG'}</span>
          </div>
          {isAdmin && isPageAllowed('settings') && (
            <NavLink to="/app/settings/branding" className={({ isActive }) => `lay-it ${isActive ? 'on' : ''}`} style={{ '--c': COLORS.acc }} data-tip={L('lay.branding', 'Koulè biznis')}>
              <Palette size={16}/><span className="l">{L('lay.branding', 'Koulè biznis')}</span>
            </NavLink>
          )}
          <NavLink to="/app/settings" end className={({ isActive }) => `lay-it ${isActive ? 'on' : ''}`} style={{ '--c': COLORS.acc }} data-tip={L('nav.settings', 'Paramèt')}>
            <Settings size={16}/><span className="l">{L('nav.settings', 'Paramèt')}</span>
          </NavLink>
          <div className="lay-user" title={col ? user?.fullName : undefined}>
            <div className="av">{user?.fullName?.trim()?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="who"><b>{user?.fullName || '—'}</b><small>{L(`lay.roles.${user?.role}`, ROLE_LABELS[user?.role] || user?.role)}</small></div>
            <button className="lo" onClick={handleLogout} title={L('lay.logout', 'Dekonekte')} aria-label={L('lay.logout', 'Dekonekte')}><LogOut size={16}/></button>
          </div>
          {isDesktop && (
            <button className="lay-collapse" onClick={() => setCol(c => !c)} title={col ? L('lay.expand', 'Agrandi meni an') : L('lay.collapse', 'Redwi meni an')}>
              <ChevronsLeft size={15}/><span>{L('lay.collapse', 'Redwi meni an')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ════════════ PRENSIPAL ════════════ */}
      <div className="lay-main">
        <header className="lay-head">
          {prog > 1 && <div key={prog} className="lay-prog"/>}
          <button className="lay-burger" onClick={() => setOpen(o => !o)} aria-label="Meni"><Menu size={20}/></button>

          <div className="lay-rates">
            {rateItems.map(({ cur, rate }, i) => (
              <div key={cur} className="lay-rate" style={{ animationDelay: `${i * 60}ms` }}>
                <b>1 {cur}</b><i>=</i><span>{rate.toFixed(2)} HTG</span>
              </div>
            ))}
          </div>

          <div className="lay-spacer"/>

          {onSunmi ? (
            <span className="lay-hb ok" title="Enprimant Sunmi"><Printer size={14}/><span className="t">Sunmi</span></span>
          ) : hasBluetooth ? (
            !btConnected ? (
              <button className="lay-hb bt" onClick={btConnect} disabled={btConnecting} title="Konekte printer Bluetooth" aria-label="Konekte printer Bluetooth">
                {btConnecting ? <RefreshCw size={14} style={{ animation: 'lay-spin 1s linear infinite' }}/> : <Bluetooth size={15}/>}
                <span className="t">{btConnecting ? 'Koneksyon…' : 'BT Printer'}</span>
              </button>
            ) : (
              <>
                <span className="lay-hb ok" title={deviceName || 'Printer'}>
                  <i/>{btPrinting ? <RefreshCw size={12} style={{ animation: 'lay-spin 1s linear infinite' }}/> : <Printer size={13}/>}
                  <span className="t" style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>{deviceName || 'Printer'}</span>
                </span>
                <button className="lay-hb bad" onClick={btDisconnect} title="Dekonekte printer" aria-label="Dekonekte printer"><BluetoothOff size={14}/></button>
              </>
            )
          ) : null}

          <div className="lay-hide-m" style={{ position: 'relative', flexShrink: 0 }} ref={langRef}>
            <button className={`lay-hb ${showLang ? 'on' : ''}`} onClick={() => setShowLang(s => !s)} aria-label="Lang">
              <Globe size={15}/><span style={{ fontSize: 15 }}>{currentLang.flag}</span><span style={{ fontSize: 10.5, fontWeight: 800 }}>{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={13} style={{ transform: showLang ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
            </button>
            {showLang && (
              <div className="lay-dd">
                {LANGS.map(l => (
                  <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => changeLanguage(l.code)}>
                    <span style={{ fontSize: 18 }}>{l.flag}</span><span style={{ flex: 1, textAlign: 'left' }}>{l.name}</span>{lang === l.code && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lay-cur lay-hide-m">{tenant?.defaultCurrency || 'HTG'}</div>
          <CalculatorMenu/>
          <NotificationBell lang={i18n.language}/>
        </header>

        {!online && <div className="lay-off"><WifiOff size={14}/> {L('lay.offline', 'Ou pa konekte ak entènèt — kèk done ka pa ajou.')}</div>}

        <ScrollArea pathname={path}>
          <div key={path} className="lay-page"><Outlet/></div>
        </ScrollArea>
      </div>
    </div>
  )
}