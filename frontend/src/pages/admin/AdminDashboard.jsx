// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import axios from 'axios'
import {
  Shield, Plus, Building2, Users, LogOut,
  CheckCircle, XCircle, Clock, X, Star, Crown,
  Zap, CreditCard, ChevronRight, Trash2, ArrowUp, ArrowDown, Minus, KeyRound,
  GitBranch, Power, PowerOff, Lock, Unlock, LayoutGrid,
  LayoutDashboard, Package, FileText, Receipt, Warehouse,
  TrendingUp, Settings, Smartphone, Phone, Wallet,
  History, Edit2, DollarSign, Save, ChevronLeft, UserCog
} from 'lucide-react'

const PDG_PHOTO = "/FB_IMG_1771787479362.jpg"
const PLUS_LOGO = "/PLUS LOGO officiel officiel.png"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function getSubscriptionStatus(endsAt) {
  if (!endsAt) return { daysLeft: null, isExpired: false, isWarning: false, label: '—' }
  const end      = new Date(endsAt)
  const now      = new Date()
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft < 0
  const isWarning = daysLeft >= 0 && daysLeft <= 5
  let label
  if (isExpired)           label = `Ekspire depi ${Math.abs(daysLeft)}j`
  else if (daysLeft === 0) label = '⚠ Jodi a!'
  else if (isWarning)      label = `⚠ ${daysLeft}j rete`
  else                     label = `${daysLeft}j rete`
  return { daysLeft, isExpired, isWarning, label }
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

const WHATSAPP_NUMBER = '50942449024'
const PLAN_ORDER  = ['Estanda', 'Biznis', 'Premyum', 'Antepriz']
const FIXED_PLANS = [
  { id:'5ec2d3ed-2613-4692-bc02-fa884ba861b3', name:'Estanda',  priceMonthly:2500, icon:<Zap size={16}/>,    color:'#8B0000', maxProducts:'10,000',   features:['Jesyon Stòk','Fakti & Devis','Jiska 5 itilizatè'] },
  { id:'e13de13b-5638-43fa-9fc3-3c2da8b50d82', name:'Biznis',   priceMonthly:3000, icon:<Star size={16}/>,   color:'#1B3A6B', maxProducts:'50,000',   features:['Tout nan Estanda','Rapò avanse','Jiska 15 itilizatè','Sèvis'] },
  { id:'613e0786-43cd-487e-aa2c-000158b508db', name:'Premyum',  priceMonthly:4000, icon:<Crown size={16}/>,  color:'#9E9E9E', maxProducts:'100,000',  features:['Tout nan Biznis','Sipò priorite','Itilizatè entelimite','Sèvis'] },
  { id:'96ff3a9d-2b6a-4ef5-9d89-4d7077382d46', name:'Antepriz', priceMonthly:5000, icon:<Shield size={16}/>, color:'#C9A84C', maxProducts:'Ilimite ∞', features:['Tout nan Premyum','Paj Sabotay MonCash','Sipò VIP 24/7','Sèvis'] },
]

const STATUS_STYLES = {
  active:    { bg:'rgba(39,174,96,0.12)',   color:'#27ae60', border:'rgba(39,174,96,0.3)',    label:'Aktif' },
  suspended: { bg:'rgba(192,57,43,0.12)',   color:'#C0392B', border:'rgba(192,57,43,0.3)',    label:'Sipann' },
  pending:   { bg:'rgba(201,168,76,0.12)',  color:'#C9A84C', border:'rgba(201,168,76,0.3)',   label:'Annatant' },
  trial:     { bg:'rgba(26,58,107,0.12)',   color:'#1B3A6B', border:'rgba(26,58,107,0.3)',    label:'Esè' },
  cancelled: { bg:'rgba(100,116,139,0.12)', color:'#64748b', border:'rgba(100,116,139,0.3)', label:'Anile' },
}

const PAGE_DEFINITIONS = [
  { key:'dashboard',  label:'Tablo Bò',         icon:<LayoutDashboard size={14}/>, group:'Prensipal', locked: true },
  { key:'products',   label:'Pwodui',            icon:<Package size={14}/>,         group:'Prensipal' },
  { key:'clients',    label:'Kliyan',            icon:<Users size={14}/>,           group:'Prensipal' },
  { key:'quotes',     label:'Devi',              icon:<FileText size={14}/>,        group:'Prensipal' },
  { key:'invoices',   label:'Fakti',             icon:<Receipt size={14}/>,         group:'Prensipal' },
  { key:'stock',      label:'Estòk',             icon:<Warehouse size={14}/>,       group:'Prensipal' },
  { key:'reports',    label:'Rapò',              icon:<TrendingUp size={14}/>,      group:'Prensipal' },
  { key:'branches',   label:'Branch yo',         icon:<GitBranch size={14}/>,       group:'Jesyon' },
  { key:'settings',   label:'Paramèt',           icon:<Settings size={14}/>,        group:'Jesyon' },
  { key:'users',      label:'Itilizatè',         icon:<Users size={14}/>,           group:'Jesyon' },
  { key:'kane',       label:'Ti Kanè Kès',       icon:<CreditCard size={14}/>,      group:'Antrepriz' },
  { key:'kane-epay',  label:'Kanè Epay',         icon:<Wallet size={14}/>,          group:'Antrepriz' },
  { key:'sabotay',    label:'Sabotay',           icon:<Smartphone size={14}/>,      group:'Antrepriz' },
  { key:'mobilpay',   label:'MonCash / NatCash', icon:<Phone size={14}/>,           group:'Antrepriz' },
  { key:'hotel',      label:'Otèl (Rezèvasyon & Dashboard)', icon:<Building2 size={14}/>, group:'Antrepriz' },
]

const DEFAULT_PAGES = PAGE_DEFINITIONS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {})

// ══════════════════════════════════════════════
// AXIOS
// ══════════════════════════════════════════════
const adminApi = axios.create({ baseURL: 'https://plusgroup-backend.onrender.com/api/v1', timeout: 15000 })
adminApi.interceptors.request.use((config) => {
  try {
    const { token } = JSON.parse(localStorage.getItem('pg-admin') || '{}')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

// ✅ FIX: Pa redirect sou 401 si se yon route sabotay — paske backend sabotay
//    itilize tenant auth, pa admin auth, sa ki kòze dekoneksyon enkorek
adminApi.interceptors.response.use(r => r, err => {
  const url = err.config?.url || ''
  if (err.response?.status === 401 && !url.includes('/sabotay/')) {
    localStorage.removeItem('pg-admin')
    window.location.href = '/admin/login'
  }
  return Promise.reject(err)
})

const getAdmin = () => { try { return JSON.parse(localStorage.getItem('pg-admin') || '{}') } catch { return {} } }

// ══════════════════════════════════════════════
// TICKER
// ══════════════════════════════════════════════
const TickerBanner = () => {
  const msg = "💳 Pou renouvle abònman ou: Voye peman via MonCash / NatCash / Sogebanking / BUH — Apre peman an, pran yon screenshot epi voye l nou sou WhatsApp +509 4244 9024 — Ekip nou an ap konfime abònman ou nan 24 è — Mèsi pou konfyans ou nan PLUS GROUP ✦ "
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:10,
      background:'linear-gradient(90deg, #0a0a0f, #1B3A6B 30%, #8B0000 70%, #0a0a0f)',
      borderTop:'1px solid rgba(201,168,76,0.3)', height:32, overflow:'hidden', display:'flex', alignItems:'center' }}>
      <div style={{ display:'flex', whiteSpace:'nowrap', animation:'ticker 35s linear infinite' }}>
        {[msg, msg].map((m, i) => (
          <span key={i} style={{ color:'#C9A84C', fontSize:11, fontWeight:700, letterSpacing:'0.06em', fontFamily:'DM Sans', paddingRight:80 }}>{m}</span>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// AUDIT LOG MODAL
// ══════════════════════════════════════════════
const ACTION_LABELS = {
  PASSWORD_RESET:       { label:'Modpas Chanje',     color:'#6baed6', bg:'rgba(107,174,214,0.1)',  icon:'🔑' },
  STATUS_CHANGED:       { label:'Statut Chanje',      color:'#C9A84C', bg:'rgba(201,168,76,0.1)',  icon:'🔄' },
  PLAN_CHANGED:         { label:'Plan Chanje',        color:'#a78bfa', bg:'rgba(167,139,250,0.1)', icon:'⭐' },
  SUBSCRIPTION_RENEWED: { label:'Abònman Renouvle',   color:'#27ae60', bg:'rgba(39,174,96,0.1)',   icon:'↻'  },
  TENANT_CREATED:       { label:'Tenant Kreye',       color:'#34d399', bg:'rgba(52,211,153,0.1)',  icon:'🏢' },
  BRANCH_TOGGLED:       { label:'Branch Toggle',      color:'#64a0ed', bg:'rgba(100,160,237,0.1)', icon:'🔀' },
  PAGE_ACCESS_UPDATED:  { label:'Aksè Paj Ajou',      color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  icon:'📄' },
  PRICE_UPDATED:        { label:'Pri Mensyèl Ajou',   color:'#C9A84C', bg:'rgba(201,168,76,0.1)',  icon:'💰' },
}

const AuditLogModal = ({ tenant, onClose }) => {
  const isMobile = useIsMobile()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant?.id) return
    setLoading(true)
    adminApi.get(`/admin/tenants/${tenant.id}/audit`)
      .then(r => setLogs(r.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [tenant?.id])

  const renderDetails = (action, details) => {
    if (!details || Object.keys(details).length === 0) return null
    const tags = []
    if (details.from && details.to)               tags.push(`${details.from} → ${details.to}`)
    if (details.newPlan)                           tags.push(`Plan: ${details.newPlan}`)
    if (details.months)                            tags.push(`+${details.months} mwa`)
    if (details.monthlyPrice !== undefined)        tags.push(`${Number(details.monthlyPrice).toLocaleString()} HTG`)
    if (details.enabled !== undefined)             tags.push(`${details.enabled} aktif / ${details.disabled} dezaktive`)
    if (details.branchSlug)                        tags.push(`/${details.branchSlug} → ${details.isActive ? 'ON' : 'OFF'}`)
    if (tags.length === 0) return null
    return (
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
        {tags.map((t, i) => (
          <span key={i} style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontFamily:'monospace' }}>{t}</span>
        ))}
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', zIndex:2000, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg,#0f172a,#0f1923)', border:'1px solid rgba(201,168,76,0.3)', borderRadius: isMobile?'20px 20px 0 0':18, width:'100%', maxWidth:580, maxHeight: isMobile?'90vh':'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,transparent,#C9A84C 30%,#8B0000 70%,transparent)', flexShrink:0 }}/>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(139,0,0,0.3))', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <History size={17} color="#C9A84C"/>
            </div>
            <div>
              <h3 style={{ color:'#fff', margin:0, fontSize:15, fontFamily:"'Playfair Display'" }}>Istorik Aksyon</h3>
              <p style={{ color:'rgba(201,168,76,0.6)', margin:'2px 0 0', fontSize:11 }}>{tenant?.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><X size={14}/></button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'14px 22px 20px' }}>
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, gap:12 }}>
              <div style={{ width:20, height:20, border:'2px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>Ap chaje...</span>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px' }}>
              <History size={36} color="#1e293b" style={{ marginBottom:12 }}/>
              <p style={{ color:'rgba(255,255,255,0.2)', margin:0, fontSize:13 }}>Pa gen aksyon anrejistreman encore</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {logs.map((log, i) => {
                const meta = ACTION_LABELS[log.action] || { label:log.action, color:'#94a3b8', bg:'rgba(148,163,184,0.1)', icon:'•' }
                const details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {})
                return (
                  <div key={log.id || i} style={{ display:'flex', gap:12, padding:'11px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', alignItems:'flex-start' }}>
                    <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:meta.bg, border:`1px solid ${meta.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{meta.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:meta.color }}>{meta.label}</span>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', flexShrink:0 }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </span>
                      </div>
                      {log.target_email && <p style={{ color:'rgba(255,255,255,0.45)', fontSize:11, margin:'2px 0 0', fontFamily:'monospace' }}>{log.target_email}</p>}
                      {log.actor && <p style={{ color:'rgba(255,255,255,0.2)', fontSize:10, margin:'2px 0 0' }}>par {log.actor}</p>}
                      {renderDetails(log.action, details)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>{logs.length} aksyon anrejistreman</span>
          <button onClick={onClose} style={{ padding:'7px 18px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12, fontWeight:600 }}>Fèmen</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// PAGE ACCESS PANEL
// ══════════════════════════════════════════════
const PageAccessPanel = ({ tenant, pages, onSave, saving, onClose }) => {
  const [localPages, setLocalPages] = useState({ ...DEFAULT_PAGES, ...(pages || {}) })
  const [dirty, setDirty] = useState(false)
  const groups = [...new Set(PAGE_DEFINITIONS.map(p => p.group))]
  const handleToggle = (key, locked) => {
    if (locked) return
    setLocalPages(prev => ({ ...prev, [key]: !prev[key] }))
    setDirty(true)
  }
  const handleSaveAll = () => { onSave(tenant.id, localPages); setDirty(false) }
  const enabledCount  = PAGE_DEFINITIONS.filter(p => localPages[p.key]).length
  const disabledCount = PAGE_DEFINITIONS.filter(p => !localPages[p.key]).length

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <div style={{ background:'linear-gradient(160deg,#0f172a,#0f1923)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:18, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,transparent,#C9A84C 30%,#8B0000 70%,transparent)', borderRadius:'18px 18px 0 0' }}/>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(201,168,76,0.12)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(139,0,0,0.3))', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}><LayoutGrid size={18} color="#C9A84C"/></div>
            <div>
              <h3 style={{ color:'#fff', margin:0, fontSize:15, fontFamily:"'Playfair Display'" }}>Aksè Paj yo</h3>
              <p style={{ color:'rgba(201,168,76,0.6)', margin:'2px 0 0', fontSize:11 }}>{tenant?.name} — aktive / dezaktive paj</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><X size={14}/></button>
        </div>
        <div style={{ padding:'12px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:8, background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.2)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#27ae60' }}/>
            <span style={{ color:'#27ae60', fontSize:11, fontWeight:700 }}>{enabledCount} Aktif</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:8, background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.2)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#C0392B' }}/>
            <span style={{ color:'#C0392B', fontSize:11, fontWeight:700 }}>{disabledCount} Dezaktive</span>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:8, background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)' }}>
            <span style={{ color:'rgba(201,168,76,0.7)', fontSize:10 }}>🔒 Dashboard toujou ON</span>
          </div>
        </div>
        <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:20 }}>
          {groups.map(group => {
            const groupPages = PAGE_DEFINITIONS.filter(p => p.group === group)
            const groupColor = group === 'Antrepriz' ? '#C9A84C' : group === 'Jesyon' ? '#6baed6' : '#fff'
            return (
              <div key={group}>
                <p style={{ color:groupColor, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>{group === 'Antrepriz' ? '✦ ' : ''}{group}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {groupPages.map(page => {
                    const isOn = localPages[page.key] !== false
                    const isLocked = page.locked === true
                    return (
                      <div key={page.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', borderRadius:10, background: isOn ? 'rgba(39,174,96,0.06)' : 'rgba(192,57,43,0.05)', border: `1px solid ${isOn ? 'rgba(39,174,96,0.2)' : 'rgba(192,57,43,0.2)'}`, transition:'all 0.2s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: isOn ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.04)', color: isOn ? '#27ae60' : '#64748b' }}>{page.icon}</div>
                          <div>
                            <p style={{ color: isLocked ? 'rgba(255,255,255,0.5)' : '#fff', fontWeight:600, fontSize:13, margin:0 }}>{page.label}</p>
                            <p style={{ color:'#475569', fontSize:10, margin:0, fontFamily:'monospace' }}>/app/{page.key}</p>
                          </div>
                          {isLocked && <span style={{ fontSize:9, color:'#C9A84C', fontWeight:700, background:'rgba(201,168,76,0.1)', padding:'2px 6px', borderRadius:4, border:'1px solid rgba(201,168,76,0.2)' }}>FIKS</span>}
                        </div>
                        <div onClick={() => handleToggle(page.key, isLocked)} style={{ width:46, height:24, borderRadius:12, cursor: isLocked ? 'not-allowed' : 'pointer', background: isOn ? '#27ae60' : 'rgba(255,255,255,0.1)', border: `1px solid ${isOn ? '#27ae60' : 'rgba(255,255,255,0.15)'}`, position:'relative', transition:'all 0.25s', flexShrink:0, opacity: isLocked ? 0.5 : 1 }}>
                          <div style={{ position:'absolute', top:2, left: isOn ? 'calc(100% - 22px)' : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10, position:'sticky', bottom:0, background:'#0f172a' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Anile</button>
          <button onClick={handleSaveAll} disabled={!dirty || saving} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', cursor: (!dirty || saving) ? 'not-allowed' : 'pointer', background: (!dirty || saving) ? 'rgba(201,168,76,0.2)' : 'linear-gradient(135deg,#27ae60,#1e8449)', color: (!dirty || saving) ? 'rgba(255,255,255,0.3)' : '#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {saving ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap sove...</> : <><CheckCircle size={14}/> {dirty ? 'Sove Chanjman yo' : 'Okenn Chanjman'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// BRANCH PANEL MODAL
// ══════════════════════════════════════════════
const BranchPanel = ({ tenantId, tenantName, branches, onToggle, loadingMap, onClose }) => {
  if (!branches) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <div style={{ background:'#0f172a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:16, padding:28, width:'100%', maxWidth:600, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h3 style={{ color:'#C9A84C', margin:0, fontSize:18 }}><GitBranch size={18} style={{ marginRight:8, verticalAlign:'middle' }}/>Branch: {tenantName}</h3>
            <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:12 }}>Bouton ON/OFF chanje aksè branch — dat abònman pa chanje</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {branches.length === 0 ? (
          <div style={{ textAlign:'center', color:'#64748b', padding:40, background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
            <GitBranch size={32} color="#334155" style={{ marginBottom:8 }}/><p style={{ margin:0 }}>Pa gen branch pou tenant sa a.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {branches.map(branch => {
              const isLoading = loadingMap[branch.id]
              return (
                <div key={branch.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.04)', border:`1px solid ${branch.isActive ? 'rgba(39,174,96,0.25)' : 'rgba(192,57,43,0.25)'}`, borderRadius:10, padding:'12px 16px', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {branch.isActive ? <Unlock size={14} color="#27ae60"/> : <Lock size={14} color="#C0392B"/>}
                      <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{branch.name}</span>
                      <span style={{ color:'#64748b', fontSize:11, fontFamily:'monospace' }}>/{branch.slug}</span>
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:6 }}>
                      <span style={{ color:'#64748b', fontSize:11 }}>👥 {branch._count?.branchUsers || 0} itilizatè</span>
                      <span style={{ color:'#64748b', fontSize:11 }}>📦 {branch._count?.products || 0} pwodui</span>
                      <span style={{ color:'#64748b', fontSize:11 }}>🧾 {branch._count?.invoices || 0} fakti</span>
                    </div>
                    {branch.unlockedAt && <div style={{ color:'#64748b', fontSize:10, marginTop:4 }}>Debloke: {new Date(branch.unlockedAt).toLocaleDateString('fr-FR')}</div>}
                  </div>
                  <button onClick={() => onToggle(tenantId, branch.id)} disabled={isLoading}
                    style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor: isLoading ? 'wait' : 'pointer', fontWeight:700, fontSize:12, minWidth:90, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background: branch.isActive ? 'rgba(192,57,43,0.15)' : 'rgba(39,174,96,0.15)', color: branch.isActive ? '#C0392B' : '#27ae60', opacity: isLoading ? 0.6 : 1 }}>
                    {isLoading ? '...' : branch.isActive ? <><PowerOff size={12}/>Bloke</> : <><Power size={12}/>Aktive</>}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ marginTop:20, padding:14, background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:8, fontSize:11, color:'#94a3b8' }}>
          ℹ️ <strong>Règ:</strong> Bouton ON aktive branch — anplwaye yo ka aksede l. Bouton OFF bloke branch — pa gen aksè. Dat ekspirasyon plan an <em>pa chanje</em>.
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL RESET MODPAS
// ══════════════════════════════════════════════
const ResetPasswordModal = ({ tenant, onClose }) => {
  const isMobile = useIsMobile()
  const [email, setEmail]             = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [result, setResult]           = useState(null)
  const mutation = useMutation({
    mutationFn: (data) => adminApi.post('/admin/tenants/reset-password', data),
    onSuccess: (res) => { setResult({ success: true, message: res.data.message }); toast.success('Modpas chanje avèk siksè!') },
    onError: (e) => { const msg = e.response?.data?.message || 'Erè pandan chanje modpas.'; setResult({ success: false, message: msg }); toast.error(msg) }
  })
  const iStyle = { width:'100%', padding:'12px 14px', borderRadius:10, boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:15, fontFamily:'DM Sans', outline:'none' }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:300, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg, #0f1923, #111827)', borderRadius: isMobile?'20px 20px 0 0':20, width:'100%', maxWidth: isMobile?'100%':460, border:'1px solid rgba(201,168,76,0.25)', boxShadow:'0 30px 80px rgba(0,0,0,0.7)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #C9A84C 40%, #8B0000 70%, transparent)'}}/>
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(139,0,0,0.3))', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}><KeyRound size={20} color="#C9A84C"/></div>
            <div>
              <h3 style={{ color:'#fff', margin:0, fontSize:16, fontFamily:"'Playfair Display'" }}>Chanje Modpas</h3>
              <p style={{ color:'rgba(201,168,76,0.5)', fontSize:11, margin:0 }}>{tenant?.name} — tenant dekonekte otomatikman</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><X size={14}/></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!email.trim() || !newPassword.trim()) return; mutation.mutate({ email: email.trim(), newPassword }) }} style={{ padding:'24px' }}>
          <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:20, background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)' }}>
            <p style={{ color:'rgba(201,168,76,0.8)', fontSize:12, margin:0, lineHeight:1.6 }}>🔑 Apre chanjman an, tenant an ap jwenn <strong>401 Unauthorized</strong> — li dwe konekte ankò ak nouvo modpas la.</p>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Email Itilizatè *</label>
            <input type="email" placeholder="admin@entreprise.ht" value={email} onChange={e => setEmail(e.target.value)} required disabled={mutation.isPending || result?.success} style={{ ...iStyle, opacity: result?.success ? 0.5 : 1 }}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Nouvo Modpas * (min. 6 karaktè)</label>
            <div style={{ position:'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder="Nouvo modpas solid..." value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} disabled={mutation.isPending || result?.success} style={{ ...iStyle, paddingRight:48, opacity: result?.success ? 0.5 : 1 }}/>
              <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:12, padding:4 }}>{showPwd ? '🙈' : '👁'}</button>
            </div>
            {newPassword.length > 0 && (
              <div style={{ marginTop:6, display:'flex', gap:4 }}>
                {[1,2,3,4].map(i => (<div key={i} style={{ flex:1, height:3, borderRadius:99, background: newPassword.length >= i*3 ? (newPassword.length >= 10 ? '#27ae60' : newPassword.length >= 7 ? '#C9A84C' : '#C0392B') : 'rgba(255,255,255,0.08)' }}/>))}
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginLeft:6, alignSelf:'center' }}>{newPassword.length < 7 ? 'Fèb' : newPassword.length < 10 ? 'Mwayen' : 'Solid'}</span>
              </div>
            )}
          </div>
          {result && (
            <div style={{ padding:'12px 14px', borderRadius:10, marginBottom:20, background: result.success ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)', border: `1px solid ${result.success ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}` }}>
              <p style={{ color: result.success ? '#27ae60' : '#E8836A', fontSize:13, margin:0, fontWeight:600 }}>{result.success ? '✅' : '❌'} {result.message}</p>
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, fontWeight:600 }}>{result?.success ? 'Fèmen' : 'Anile'}</button>
            {!result?.success && (
              <button type="submit" disabled={mutation.isPending || !email || newPassword.length < 6}
                style={{ flex:2, padding:'11px', borderRadius:10, border:'none', cursor: (mutation.isPending || !email || newPassword.length < 6) ? 'not-allowed' : 'pointer', background: (mutation.isPending || !email || newPassword.length < 6) ? 'rgba(201,168,76,0.2)' : 'linear-gradient(135deg, #C9A84C, #8B0000)', color: (mutation.isPending || !email || newPassword.length < 6) ? 'rgba(255,255,255,0.3)' : '#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {mutation.isPending ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap chanje...</> : <><KeyRound size={14}/> Chanje Modpas</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL KREYE TENANT
// ══════════════════════════════════════════════
const CreateTenantModal = ({ plans, onClose, onCreated }) => {
  const isMobile = useIsMobile()
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { defaultCurrency:'HTG', defaultLanguage:'ht', subscriptionMonths:1 } })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const iStyle = (e) => ({ width:'100%', padding:'12px 14px', borderRadius:10, boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border: e?'1px solid rgba(192,57,43,0.6)':'1px solid rgba(255,255,255,0.08)', color:'#fff', fontSize:16, fontFamily:'DM Sans', outline:'none' })
  const mutation = useMutation({
    mutationFn: (data) => adminApi.post('/admin/tenants', data),
    onSuccess: (res) => { toast.success(`Entreprise "${res.data.tenant.name}" kreye!`); onCreated?.() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan kreyasyon.')
  })
  const onSubmit = (data) => mutation.mutate({ ...data, planId: selectedPlan||'' })
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)', zIndex:50, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg, #0f1923, #111827)', borderRadius: isMobile?'20px 20px 0 0':24, width:'100%', maxWidth: isMobile?'100%':600, maxHeight:'92vh', overflowY:'auto', border:'1px solid rgba(201,168,76,0.2)', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #C9A84C 40%, #8B0000 70%, transparent)', borderRadius: isMobile?'20px 20px 0 0':'24px 24px 0 0' }}/>
        <div style={{ padding: isMobile?'20px 20px 16px':'24px 28px 20px', borderBottom:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg, #C9A84C, #f0d080)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Building2 size={18} color="#0f1923"/></div>
            <div>
              <h2 style={{ color:'#fff', fontSize: isMobile?15:17, fontWeight:700, margin:0, fontFamily:"'Playfair Display'" }}>Nouvo Entreprise</h2>
              <p style={{ color:'rgba(201,168,76,0.6)', fontSize:11, margin:0 }}>ANREJISTREMAN KLIYAN SaaS</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)', flexShrink:0 }}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: isMobile?16:28, display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <p style={{ color:'rgba(201,168,76,0.8)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 12px', fontFamily:'DM Sans' }}>Chwazi Plan</p>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:10 }}>
              {FIXED_PLANS.map(plan => (
                <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{ padding: isMobile?'12px 10px':'14px 12px', borderRadius:14, cursor:'pointer', border: selectedPlan===plan.id?`2px solid ${plan.color}`:'1px solid rgba(255,255,255,0.08)', background: selectedPlan===plan.id?`${plan.color}18`:'rgba(255,255,255,0.03)', position:'relative', transition:'all 0.2s' }}>
                  {selectedPlan===plan.id && <div style={{ position:'absolute', top:6, right:6, width:16, height:16, borderRadius:'50%', background:plan.color, display:'flex', alignItems:'center', justifyContent:'center' }}><CheckCircle size={10} color="#fff"/></div>}
                  <div style={{ color:plan.color, marginBottom:4 }}>{plan.icon}</div>
                  <p style={{ color:'#fff', fontSize:12, fontWeight:700, margin:'0 0 2px', fontFamily:'DM Sans' }}>{plan.name}</p>
                  <p style={{ color:plan.color, fontSize:13, fontWeight:800, margin:'0 0 4px', fontFamily:"'Playfair Display'" }}>{plan.priceMonthly.toLocaleString()} <span style={{ fontSize:9, fontWeight:500 }}>HTG/mwa</span></p>
                  <p style={{ color:'rgba(255,255,255,0.25)', fontSize:9, margin:0 }}>📦 {plan.maxProducts}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Non Entreprise *</label>
              <input placeholder="Ma Boutik Jacmel" {...register('name', { required:'Non obligatwa' })} style={iStyle(errors.name)}/>
              {errors.name && <p style={{ color:'#E8836A', fontSize:11, marginTop:3 }}>{errors.name.message}</p>}
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Slug (URL) *</label>
              <input placeholder="ma-boutik-jacmel" {...register('slug', { required:'Slug obligatwa', pattern:{value:/^[a-z0-9-]+$/,message:'Lèt miniskil ak tiré sèlman'} })} style={iStyle(errors.slug)}/>
              {errors.slug && <p style={{ color:'#E8836A', fontSize:11, marginTop:3 }}>{errors.slug.message}</p>}
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Dire Abònman (mwa)</label>
              <input type="number" min="1" max="36" defaultValue="1" {...register('subscriptionMonths')} style={iStyle(false)}/>
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Email</label>
              <input type="email" placeholder="contact@entreprise.ht" {...register('email')} style={iStyle(false)}/>
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Telefòn</label>
              <input placeholder="+509 3000-0000" {...register('phone')} style={iStyle(false)}/>
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Devise Defò</label>
              <select {...register('defaultCurrency')} style={{ ...iStyle(false), fontSize:14 }}>
                <option value="HTG">HTG — Goud Ayisyen</option>
                <option value="USD">USD — Dola Ameriken</option>
              </select>
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(201,168,76,0.1)', paddingTop:18 }}>
            <p style={{ color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 12px', fontFamily:'DM Sans' }}>👤 Kont Administratè Entreprise</p>
            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Non Konplè *</label>
                <input placeholder="Jean Baptiste" {...register('adminName', { required:true })} style={iStyle(false)}/>
              </div>
              <div>
                <label style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Email Admin *</label>
                <input type="email" placeholder="admin@entreprise.ht" {...register('adminEmail', { required:true })} style={iStyle(false)}/>
              </div>
              <div>
                <label style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Sans' }}>Modpas *</label>
                <input type="password" placeholder="Min. 8 karaktè" {...register('adminPassword', { required:true, minLength:8 })} style={iStyle(false)}/>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 20px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Anile</button>
            <button type="submit" disabled={mutation.isPending} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 24px', borderRadius:10, flex: isMobile?1:'none', justifyContent:'center', background: mutation.isPending?'rgba(201,168,76,0.3)':'linear-gradient(135deg, #8B0000, #C0392B 50%, #C9A84C)', color:'#fff', border:'none', cursor: mutation.isPending?'not-allowed':'pointer', fontSize:13, fontWeight:700 }}>
              {mutation.isPending?<><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap kreye...</>:<><Plus size={15}/> Kreye Entreprise</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL CHANJE PLAN
// ══════════════════════════════════════════════
const ChangePlanModal = ({ tenant, plans, onClose, onChanged }) => {
  const isMobile = useIsMobile()
  const currentIdx = PLAN_ORDER.indexOf(tenant?.plan?.name)
  const getDir = (name) => { const idx = PLAN_ORDER.indexOf(name); if (idx === currentIdx) return 'same'; return idx > currentIdx ? 'upgrade' : 'downgrade' }
  const mutation = useMutation({
    mutationFn: ({ planId }) => adminApi.patch(`/admin/tenants/${tenant.id}/plan`, { planId }),
    onSuccess: (res) => { toast.success(`Plan chanje → ${res.data.tenant.plan?.name}`); onChanged?.(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })
  const handleSelect = (planId, planName) => {
    const dir = getDir(planName)
    if (dir === 'same') { toast('Kliyan an deja sou plan sa a.', { icon:'ℹ️' }); return }
    const msg = dir === 'upgrade' ? `Monte sou "${planName}"?` : `⚠ Desann sou "${planName}"?\nKliyan an ka pèdi aksè sou kèk fonksyon.`
    if (window.confirm(msg)) mutation.mutate({ planId })
  }
  const displayPlans = plans?.length > 0 ? plans : FIXED_PLANS
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)', zIndex:50, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg, #0f1923, #111827)', borderRadius: isMobile?'20px 20px 0 0':20, width:'100%', maxWidth: isMobile?'100%':500, border:'1px solid rgba(201,168,76,0.2)', boxShadow:'0 30px 80px rgba(0,0,0,0.7)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #C9A84C 40%, #8B0000 70%, transparent)'}}/>
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid rgba(201,168,76,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ color:'#fff', margin:0, fontSize:16, fontFamily:"'Playfair Display'" }}>Chanje Plan</h3>
            <p style={{ color:'rgba(201,168,76,0.5)', fontSize:11, margin:0 }}>{tenant?.name} — kounye a: <strong style={{ color:'#C9A84C' }}>{tenant?.plan?.name||'Okenn'}</strong></p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><X size={14}/></button>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            {[{icon:<ArrowUp size={10}/>,label:'Upgrade',color:'#27ae60',bg:'rgba(39,174,96,0.1)'},{icon:<ArrowDown size={10}/>,label:'Downgrade',color:'#E8836A',bg:'rgba(232,131,106,0.1)'},{icon:<Minus size={10}/>,label:'Kouwè',color:'#C9A84C',bg:'rgba(201,168,76,0.1)'}].map((l,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:6, background:l.bg, color:l.color, fontSize:10, fontWeight:700 }}>{l.icon} {l.label}</div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {displayPlans.map(p => {
              const dir = getDir(p.name); const isCurrent = dir==='same'; const isUp = dir==='upgrade'
              return (
                <button key={p.id} onClick={() => handleSelect(p.id, p.name)} disabled={mutation.isPending}
                  style={{ padding:'14px 16px', borderRadius:12, cursor: isCurrent?'default':'pointer', background: isCurrent?'rgba(201,168,76,0.08)':'rgba(255,255,255,0.03)', border: isCurrent?'1px solid rgba(201,168,76,0.4)': isUp?'1px solid rgba(39,174,96,0.25)':'1px solid rgba(232,131,106,0.2)', color:'#fff', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background: isCurrent?'rgba(201,168,76,0.15)':isUp?'rgba(39,174,96,0.12)':'rgba(232,131,106,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color: isCurrent?'#C9A84C':isUp?'#27ae60':'#E8836A' }}>
                      {isCurrent?<Minus size={13}/>:isUp?<ArrowUp size={13}/>:<ArrowDown size={13}/>}
                    </div>
                    <div>
                      <span style={{ fontWeight:700, fontSize:14, fontFamily:'DM Sans' }}>{p.name}</span>
                      <span style={{ marginLeft:8, fontSize:10, fontWeight:700, color: isCurrent?'#C9A84C':isUp?'#27ae60':'#E8836A' }}>{isCurrent?'✓ Kounye a':isUp?'↑ Upgrade':'↓ Downgrade'}</span>
                    </div>
                  </div>
                  <span style={{ color:'#C9A84C', fontWeight:800, fontSize:14, fontFamily:"'Playfair Display'", flexShrink:0 }}>{Number(p.priceMonthly).toLocaleString()} <span style={{ fontSize:9 }}>HTG</span></span>
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ padding:'0 20px 20px' }}>
          <button onClick={onClose} style={{ width:'100%', padding:'10px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:13 }}>Anile</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL DELETE TENANT
// ══════════════════════════════════════════════
const DeleteModal = ({ tenant, onClose, onDeleted }) => {
  const isMobile = useIsMobile()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const isReady = confirmText === tenant?.slug
  const handleDelete = async () => {
    if (!isReady) return
    setLoading(true)
    try { await adminApi.delete(`/admin/tenants/by-slug/${tenant.slug}`); toast.success(`"${tenant.name}" efase definitifman.`); onDeleted?.(); onClose() }
    catch (e) { toast.error(e.response?.data?.message || 'Erè pandan efase.'); setLoading(false) }
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(8px)', zIndex:300, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg, #0f0a0a, #1a0505)', borderRadius: isMobile?'20px 20px 0 0':20, width:'100%', maxWidth: isMobile?'100%':440, border:'1px solid rgba(192,57,43,0.4)', boxShadow:'0 30px 80px rgba(139,0,0,0.5)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #C0392B 40%, #8B0000 70%, transparent)'}}/>
        <div style={{ padding:'28px 24px', textAlign:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(139,0,0,0.15)', border:'2px solid rgba(192,57,43,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={28} color="#C0392B"/></div>
          <h3 style={{ color:'#fff', fontSize:18, fontFamily:"'Playfair Display'", margin:'0 0 8px' }}>Efase Entreprise?</h3>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, lineHeight:1.6, margin:'0 0 12px' }}>Ou sou pwen efase <strong style={{ color:'#E8836A' }}>{tenant?.name}</strong> definitifman.</p>
          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(139,0,0,0.1)', border:'1px solid rgba(192,57,43,0.2)', marginBottom:20 }}>
            <p style={{ color:'rgba(192,57,43,0.9)', fontSize:12, margin:0, lineHeight:1.6 }}>⚠ <strong>Aksyon sa irreversib.</strong> Tout done (itilizatè, pwodui, fakti, devis, stòk) ap efase pou toujou.</p>
          </div>
          <div style={{ textAlign:'left', marginBottom:20 }}>
            <label style={{ display:'block', color:'rgba(232,131,106,0.7)', fontSize:11, fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Ekri <span style={{ color:'#E8836A', fontFamily:'monospace', background:'rgba(232,131,106,0.1)', padding:'1px 6px', borderRadius:4 }}>{tenant?.slug}</span> pou konfime:</label>
            <input placeholder={tenant?.slug} value={confirmText} onChange={e => setConfirmText(e.target.value)} style={{ width:'100%', padding:'11px 14px', borderRadius:10, boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${isReady?'rgba(192,57,43,0.7)':'rgba(192,57,43,0.3)'}`, color:'#fff', fontSize:14, fontFamily:'monospace', outline:'none', letterSpacing:'0.05em' }}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Anile</button>
            <button onClick={handleDelete} disabled={!isReady || loading}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', cursor: (!isReady||loading)?'not-allowed':'pointer', background: isReady?'linear-gradient(135deg, #8B0000, #C0392B)':'rgba(139,0,0,0.2)', color: isReady?'#fff':'rgba(255,255,255,0.3)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading?<><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap efase...</>:<><Trash2 size={14}/> Efase Definitif</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// INLINE PRICE EDITOR
// ══════════════════════════════════════════════
const PriceEditor = ({ tenantId, currentPrice, onSave, small = false }) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(String(currentPrice || ''))
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    const price = Math.max(0, Number(value) || 0)
    setSaving(true)
    await onSave(tenantId, price)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <input autoFocus type="number" min="0" value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          style={{ width: small?80:100, padding:'3px 7px', borderRadius:6, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.4)', color:'#fff', fontSize: small?11:12, fontFamily:'monospace', outline:'none' }}/>
        <button onClick={handleSave} disabled={saving} style={{ width:22, height:22, borderRadius:5, background:'rgba(39,174,96,0.2)', border:'1px solid rgba(39,174,96,0.4)', color:'#27ae60', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {saving ? <div style={{ width:9, height:9, border:'1px solid rgba(39,174,96,0.4)', borderTopColor:'#27ae60', borderRadius:'50%', animation:'spin 0.6s linear infinite' }}/> : <Save size={10}/>}
        </button>
        <button onClick={() => setEditing(false)} style={{ width:22, height:22, borderRadius:5, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={10}/></button>
      </div>
    )
  }

  return (
    <div onClick={() => { setValue(String(currentPrice || '')); setEditing(true) }}
      style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', padding:'3px 8px', borderRadius:6, background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', width:'fit-content' }}
      title="Klike pou edite pri mensyèl">
      {currentPrice > 0
        ? <span style={{ color:'#C9A84C', fontSize: small?10:12, fontWeight:700, fontFamily:"'Playfair Display'" }}>{Number(currentPrice).toLocaleString()} <span style={{ fontSize:9, fontWeight:500 }}>HTG</span></span>
        : <span style={{ color:'rgba(255,255,255,0.2)', fontSize: small?10:11 }}>— Sete pri</span>
      }
      <Edit2 size={small?9:10} color="rgba(201,168,76,0.5)"/>
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL EDIT MANM SOL
// ══════════════════════════════════════════════
const EditSolMemberModal = ({ member, planId, tenantSlug, onClose, onSaved }) => {
  const isMobile = useIsMobile()
  const [form, setForm] = useState({
    name:        member?.name        || '',
    position:    member?.position    || '',
    phone:       member?.phone       || '',
    username:    member?.username    || '',
    isOwnerSlot: member?.isOwnerSlot || false,
    hasWon:      member?.hasWon      || false,
  })
  const [saving, setSaving] = useState(false)

  const iStyle = { width:'100%', padding:'10px 12px', borderRadius:9, boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, fontFamily:'DM Sans', outline:'none' }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.patch(
        `/sabotay/plans/${planId}/members/${member.id}`,
        form,
        { headers: { 'X-Tenant-Slug': tenantSlug } }
      )
      toast.success(`✅ Manm "${form.name}" ajou!`)
      onSaved?.()
      onClose()
    } catch(e) {
      toast.error(e.response?.data?.message || 'Erè modifikasyon manm.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(10px)', zIndex:3000, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg,#0f172a,#0f1923)', border:'1px solid rgba(201,168,76,0.3)', borderRadius: isMobile?'20px 20px 0 0':18, width:'100%', maxWidth:480, maxHeight: isMobile?'92vh':'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,transparent,#C9A84C 30%,#8B0000 70%,transparent)', flexShrink:0 }}/>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(139,0,0,0.3))', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <UserCog size={17} color="#C9A84C"/>
            </div>
            <div>
              <h3 style={{ color:'#fff', margin:0, fontSize:15, fontFamily:"'Playfair Display'" }}>Edite Manm</h3>
              <p style={{ color:'rgba(201,168,76,0.6)', margin:'2px 0 0', fontSize:11 }}>{member?.name} — pòzisyon {member?.position}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><X size={14}/></button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'18px 22px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Non Manm *</label>
              <input value={form.name} onChange={e => setForm(p=>({...p, name:e.target.value}))} placeholder="Jean Baptiste" style={iStyle}/>
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Pòzisyon (nimewo)</label>
              <input type="number" min="1" value={form.position} onChange={e => setForm(p=>({...p, position:e.target.value}))} placeholder="1" style={iStyle}/>
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Telefòn</label>
              <input value={form.phone} onChange={e => setForm(p=>({...p, phone:e.target.value}))} placeholder="+509 3000-0000" style={iStyle}/>
            </div>
            <div>
              <label style={{ display:'block', color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Username Kont Sol</label>
              <input value={form.username} onChange={e => setForm(p=>({...p, username:e.target.value}))} placeholder="jean.baptiste" style={{ ...iStyle, fontFamily:'monospace' }}/>
              <p style={{ color:'rgba(255,255,255,0.2)', fontSize:10, margin:'4px 0 0' }}>⚠ Chanje username ka afekte koneksyon manm nan</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, background: form.isOwnerSlot ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${form.isOwnerSlot ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                <div>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0 }}>👑 Slot Pwopriyetè</p>
                  <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:'2px 0 0' }}>Manm sa a se pwopriyetè sol la</p>
                </div>
                <div onClick={() => setForm(p=>({...p, isOwnerSlot:!p.isOwnerSlot}))}
                  style={{ width:46, height:24, borderRadius:12, cursor:'pointer', background: form.isOwnerSlot ? '#C9A84C' : 'rgba(255,255,255,0.1)', border:`1px solid ${form.isOwnerSlot ? '#C9A84C' : 'rgba(255,255,255,0.15)'}`, position:'relative', transition:'all 0.25s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: form.isOwnerSlot ? 'calc(100% - 22px)' : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, background: form.hasWon ? 'rgba(39,174,96,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${form.hasWon ? 'rgba(39,174,96,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                <div>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0 }}>🏆 Deja Genyen</p>
                  <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:'2px 0 0' }}>Manm sa a deja resevwa lajan sol la</p>
                </div>
                <div onClick={() => setForm(p=>({...p, hasWon:!p.hasWon}))}
                  style={{ width:46, height:24, borderRadius:12, cursor:'pointer', background: form.hasWon ? '#27ae60' : 'rgba(255,255,255,0.1)', border:`1px solid ${form.hasWon ? '#27ae60' : 'rgba(255,255,255,0.15)'}`, position:'relative', transition:'all 0.25s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: form.hasWon ? 'calc(100% - 22px)' : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0, display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Anile</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            style={{ flex:2, padding:'11px', borderRadius:10, border:'none', cursor:(saving||!form.name.trim())?'not-allowed':'pointer', background:(saving||!form.name.trim())?'rgba(201,168,76,0.2)':'linear-gradient(135deg,#C9A84C,#8B0000)', color:(saving||!form.name.trim())?'rgba(255,255,255,0.3)':'#fff', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {saving ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap sove...</> : <><Save size={14}/> Sove Chanjman</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MODAL DELETE SOL PLAN
// ══════════════════════════════════════════════
const DeleteSolPlanModal = ({ plan, tenantSlug, onClose, onDeleted }) => {
  const isMobile = useIsMobile()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const isReady = confirmText === plan?.name

  const handleDelete = async () => {
    if (!isReady) return
    setLoading(true)
    try {
      await adminApi.delete(
        `/sabotay/plans/${plan.id}`,
        { headers: { 'X-Tenant-Slug': tenantSlug } }
      )
      toast.success(`Plan "${plan.name}" efase!`)
      onDeleted?.()
      onClose()
    } catch(e) {
      toast.error(e.response?.data?.message || 'Erè efase plan.')
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', backdropFilter:'blur(10px)', zIndex:3500, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg,#0f0a0a,#1a0505)', border:'1px solid rgba(192,57,43,0.4)', borderRadius: isMobile?'20px 20px 0 0':18, width:'100%', maxWidth:420, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#C0392B 40%,#8B0000 70%,transparent)' }}/>
        <div style={{ padding:'28px 24px', textAlign:'center' }}>
          <div style={{ width:60, height:60, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(139,0,0,0.15)', border:'2px solid rgba(192,57,43,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Trash2 size={26} color="#C0392B"/>
          </div>
          <h3 style={{ color:'#fff', fontSize:17, fontFamily:"'Playfair Display'", margin:'0 0 8px' }}>Efase Plan Sol?</h3>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, lineHeight:1.6, margin:'0 0 6px' }}>
            Ou sou pwen efase plan <strong style={{ color:'#E8836A' }}>{plan?.name}</strong> definitifman.
          </p>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, margin:'0 0 18px' }}>
            👥 {plan?._count?.members || plan?.members?.length || 0} manm · 💳 {plan?.status || '—'}
          </p>
          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(139,0,0,0.1)', border:'1px solid rgba(192,57,43,0.2)', marginBottom:20, textAlign:'left' }}>
            <p style={{ color:'rgba(192,57,43,0.9)', fontSize:12, margin:0, lineHeight:1.6 }}>⚠ <strong>Aksyon sa irreversib.</strong> Tout manm ak peman ki asosye ak plan sa a ap efase pou toujou.</p>
          </div>
          <div style={{ textAlign:'left', marginBottom:20 }}>
            <label style={{ display:'block', color:'rgba(232,131,106,0.7)', fontSize:11, fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Ekri <span style={{ color:'#E8836A', fontFamily:'monospace', background:'rgba(232,131,106,0.1)', padding:'1px 6px', borderRadius:4 }}>{plan?.name}</span> pou konfime:
            </label>
            <input
              placeholder={plan?.name}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${isReady?'rgba(192,57,43,0.7)':'rgba(192,57,43,0.3)'}`, color:'#fff', fontSize:14, fontFamily:'monospace', outline:'none' }}
            />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Anile</button>
            <button onClick={handleDelete} disabled={!isReady || loading}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', cursor:(!isReady||loading)?'not-allowed':'pointer', background: isReady?'linear-gradient(135deg,#8B0000,#C0392B)':'rgba(139,0,0,0.2)', color: isReady?'#fff':'rgba(255,255,255,0.3)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Ap efase...</> : <><Trash2 size={14}/> Efase Plan</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// SOL MANAGER MODAL (Plans + Manm)
// ══════════════════════════════════════════════
const SolManagerModal = ({ tenant, onClose }) => {
  const isMobile = useIsMobile()
  const [plans, setPlans]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [members, setMembers]           = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [deletePlan, setDeletePlan]     = useState(null)
  const [editMember, setEditMember]     = useState(null)

  const loadPlans = async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/sabotay/plans', {
        headers: { 'X-Tenant-Slug': tenant.slug }
      })
      const result = res.data?.plans || res.data?.data || res.data
      setPlans(Array.isArray(result) ? result : [])
    } catch(e) {
      // ✅ Pa toast 401 paske interceptor pa redirect ankò — afiche mesaj itil
      const status = e.response?.status
      if (status === 401 || status === 403) {
        toast.error('Aksè refize pou tenant sa a.')
      } else {
        toast.error('Erè chajman plans Sol.')
      }
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (plan) => {
    setSelectedPlan(plan)
    setLoadingMembers(true)
    try {
      const res = await adminApi.get(`/sabotay/plans/${plan.id}/members`, {
        headers: { 'X-Tenant-Slug': tenant.slug }
      })
      const result = res.data?.members || res.data?.data || res.data
      setMembers(Array.isArray(result) ? result : [])
    } catch(e) {
      toast.error('Erè chajman manm yo.')
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => { loadPlans() }, [])

  const solStatusColor = (status) => {
    if (status === 'active')    return { color:'#27ae60', bg:'rgba(39,174,96,0.1)',  border:'rgba(39,174,96,0.25)',   label:'Aktif' }
    if (status === 'completed') return { color:'#C9A84C', bg:'rgba(201,168,76,0.1)', border:'rgba(201,168,76,0.25)',  label:'Konplete' }
    if (status === 'paused')    return { color:'#6baed6', bg:'rgba(107,174,214,0.1)',border:'rgba(107,174,214,0.25)', label:'Poz' }
    return { color:'#64748b', bg:'rgba(100,116,139,0.1)', border:'rgba(100,116,139,0.25)', label: status || '—' }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', backdropFilter:'blur(10px)', zIndex:2500, display:'flex', alignItems: isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?0:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'linear-gradient(160deg,#0f172a,#0a1628)', border:'1px solid rgba(201,168,76,0.3)', borderRadius: isMobile?'20px 20px 0 0':20, width:'100%', maxWidth:680, maxHeight: isMobile?'93vh':'88vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,transparent,#C9A84C 30%,#8B0000 70%,transparent)', flexShrink:0 }}/>

        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {selectedPlan && (
              <button onClick={() => setSelectedPlan(null)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)', flexShrink:0 }}>
                <ChevronLeft size={14}/>
              </button>
            )}
            <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(139,0,0,0.3))', border:'1px solid rgba(201,168,76,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Smartphone size={17} color="#C9A84C"/>
            </div>
            <div>
              <h3 style={{ color:'#fff', margin:0, fontSize:15, fontFamily:"'Playfair Display'" }}>
                {selectedPlan ? `Manm — ${selectedPlan.name}` : 'Sabotay Sol'}
              </h3>
              <p style={{ color:'rgba(201,168,76,0.6)', margin:'2px 0 0', fontSize:11 }}>
                {tenant?.name} {selectedPlan ? `· ${members.length} manm` : `· ${plans.length} plan`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)' }}><X size={14}/></button>
        </div>

        {/* Kò */}
        <div style={{ overflowY:'auto', flex:1, padding:'14px 22px 20px' }}>

          {/* VYÈ PLANS */}
          {!selectedPlan && (
            loading ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, gap:12 }}>
                <div style={{ width:20, height:20, border:'2px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>Ap chaje plans...</span>
              </div>
            ) : plans.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px 20px' }}>
                <Smartphone size={36} color="#1e293b" style={{ marginBottom:12 }}/>
                <p style={{ color:'rgba(255,255,255,0.2)', margin:0, fontSize:13 }}>Pa gen plan Sol pou tenant sa a</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {plans.map(plan => {
                  const sc = solStatusColor(plan.status)
                  const memberCount = plan._count?.members ?? plan.members?.length ?? 0
                  return (
                    <div key={plan.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', transition:'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{plan.name}</span>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{sc.label}</span>
                        </div>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                          <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>👥 {memberCount} manm</span>
                          {plan.feePerMember && <span style={{ color:'rgba(201,168,76,0.6)', fontSize:11 }}>💰 {Number(plan.feePerMember).toLocaleString()} HTG</span>}
                          {plan.interval && <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>🔁 {plan.interval}</span>}
                          {plan.startDate && <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>📅 {formatDate(plan.startDate)}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button onClick={() => loadMembers(plan)}
                          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:8, background:'rgba(107,174,214,0.12)', border:'1px solid rgba(107,174,214,0.25)', color:'#6baed6', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                          <Users size={11}/> Manm
                        </button>
                        <button onClick={() => setDeletePlan(plan)}
                          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, background:'rgba(139,0,0,0.1)', border:'1px solid rgba(192,57,43,0.25)', color:'#E8836A', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* VYÈ MANM */}
          {selectedPlan && (
            loadingMembers ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, gap:12 }}>
                <div style={{ width:20, height:20, border:'2px solid rgba(201,168,76,0.3)', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>Ap chaje manm yo...</span>
              </div>
            ) : members.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px 20px' }}>
                <Users size={36} color="#1e293b" style={{ marginBottom:12 }}/>
                <p style={{ color:'rgba(255,255,255,0.2)', margin:0, fontSize:13 }}>Pa gen manm nan plan sa a</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {members.map(member => (
                  <div key={member.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:11, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background: member.isOwnerSlot ? 'linear-gradient(135deg,#C9A84C,#9a7d32)' : 'linear-gradient(135deg,#1B3A6B,#2d5fa6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:800, flexShrink:0 }}>
                      {member.isOwnerSlot ? '👑' : (member.position || '?')}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{member.name}</span>
                        {member.hasWon && <span style={{ fontSize:9, color:'#27ae60', background:'rgba(39,174,96,0.1)', padding:'1px 6px', borderRadius:4, border:'1px solid rgba(39,174,96,0.2)', fontWeight:700 }}>🏆 Genyen</span>}
                        {member.isOwnerSlot && <span style={{ fontSize:9, color:'#C9A84C', background:'rgba(201,168,76,0.1)', padding:'1px 6px', borderRadius:4, border:'1px solid rgba(201,168,76,0.2)', fontWeight:700 }}>Pwopriyetè</span>}
                      </div>
                      <div style={{ display:'flex', gap:10, marginTop:2 }}>
                        {member.username && <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>@{member.username}</span>}
                        {member.phone && <span style={{ color:'rgba(255,255,255,0.25)', fontSize:10 }}>{member.phone}</span>}
                        <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>Pòz #{member.position || '—'}</span>
                      </div>
                    </div>
                    <button onClick={() => setEditMember(member)}
                      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'6px 12px', borderRadius:8, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', color:'#C9A84C', cursor:'pointer', fontSize:11, fontWeight:700, flexShrink:0 }}>
                      <Edit2 size={11}/> Edite
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>
            {selectedPlan ? `${members.length} manm nan "${selectedPlan.name}"` : `${plans.length} plan Sol total`}
          </span>
          <button onClick={onClose} style={{ padding:'7px 18px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12, fontWeight:600 }}>Fèmen</button>
        </div>
      </div>

      {/* Sub-modals */}
      {deletePlan && (
        <DeleteSolPlanModal
          plan={deletePlan}
          tenantSlug={tenant.slug}
          onClose={() => setDeletePlan(null)}
          onDeleted={() => { setDeletePlan(null); loadPlans() }}
        />
      )}
      {editMember && (
        <EditSolMemberModal
          member={editMember}
          planId={selectedPlan?.id}
          tenantSlug={tenant.slug}
          onClose={() => setEditMember(null)}
          onSaved={() => { setEditMember(null); loadMembers(selectedPlan) }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// TENANT CARD — MOBIL
// ══════════════════════════════════════════════
const TenantCard = ({ t, onRenew, onChangePlan, onToggleStatus, onDelete, onResetPwd, onBranch, onPages, onAudit, onSavePrice, onSol, monthlyPrice }) => {
  const { label, isExpired, isWarning, daysLeft } = getSubscriptionStatus(t.subscriptionEndsAt)
  const ss = STATUS_STYLES[t.status] || STATUS_STYLES.pending
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:16, padding:16, marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg, #8B0000, #C9A84C)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:800, flexShrink:0 }}>{t.name.charAt(0).toUpperCase()}</div>
          <div>
            <p style={{ fontWeight:700, color:'#fff', margin:0, fontSize:14 }}>{t.name}</p>
            <span style={{ fontFamily:'monospace', fontSize:10, color:'rgba(201,168,76,0.7)', background:'rgba(201,168,76,0.06)', padding:'1px 6px', borderRadius:4 }}>{t.slug}</span>
          </div>
        </div>
        <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, fontSize:11, fontWeight:700 }}>{ss.label}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
        {[
          { lbl:'Plan', val:t.plan?.name||'—', color:'rgba(255,255,255,0.8)' },
          { lbl:'Itilizatè', val:`👥 ${t._count?.users||0}`, color:'rgba(255,255,255,0.8)' },
          { lbl:'Ekspire', val: daysLeft===null?'—':label, color: daysLeft===null?'rgba(255,255,255,0.2)':isExpired?'#E8836A':isWarning?'#C9A84C':'#27ae60', sub: t.subscriptionEndsAt?formatDate(t.subscriptionEndsAt):null },
        ].map((item,i) => (
          <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'8px 10px' }}>
            <p style={{ color:'rgba(201,168,76,0.5)', fontSize:9, fontWeight:700, textTransform:'uppercase', margin:'0 0 2px' }}>{item.lbl}</p>
            <p style={{ color:item.color, fontSize:11, fontWeight:700, margin:0 }}>{item.val}</p>
            {item.sub && <p style={{ color:'rgba(255,255,255,0.2)', fontSize:9, margin:'2px 0 0' }}>{item.sub}</p>}
          </div>
        ))}
      </div>
      <div style={{ marginBottom:10, padding:'8px 10px', borderRadius:10, background:'rgba(201,168,76,0.04)', border:'1px solid rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'rgba(201,168,76,0.5)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>💰 Pri Mensyèl</span>
        <PriceEditor tenantId={t.id} currentPrice={monthlyPrice} onSave={onSavePrice} small/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        <button onClick={() => { if(window.confirm(`Renouvle "${t.name}" +1 mwa?`)) onRenew(t.id) }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.25)', color:'#27ae60', cursor:'pointer', fontSize:12, fontWeight:700 }}>↻ +1 Mwa</button>
        <button onClick={() => onChangePlan(t)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', color:'#C9A84C', cursor:'pointer', fontSize:12, fontWeight:700 }}><Crown size={12}/> Plan</button>
        <button onClick={() => onBranch(t)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(100,148,237,0.12)', border:'1px solid rgba(100,148,237,0.25)', color:'#64a0ed', cursor:'pointer', fontSize:12, fontWeight:700 }}><GitBranch size={12}/> Branch ({t._count?.branches||0})</button>
        <button onClick={() => onPages(t)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)', color:'#a78bfa', cursor:'pointer', fontSize:12, fontWeight:700 }}><LayoutGrid size={12}/> Paj yo</button>
        <button onClick={() => onResetPwd(t)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(26,58,107,0.15)', border:'1px solid rgba(26,58,107,0.35)', color:'#6baed6', cursor:'pointer', fontSize:12, fontWeight:700 }}><KeyRound size={12}/> Modpas</button>
        <button onClick={() => onAudit(t)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b', cursor:'pointer', fontSize:12, fontWeight:700 }}><History size={12}/> Istorik</button>
        <button onClick={() => onSol(t)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(139,0,0,0.12)', border:'1px solid rgba(192,57,43,0.3)', color:'#E8836A', cursor:'pointer', fontSize:12, fontWeight:700 }}><Smartphone size={12}/> Sol</button>
        {t.status==='active'
          ? <button onClick={() => { if(window.confirm(`Sipann "${t.name}"?`)) onToggleStatus(t.id,'suspended') }} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(139,0,0,0.1)', border:'1px solid rgba(139,0,0,0.25)', color:'#E8836A', cursor:'pointer', fontSize:12, fontWeight:700 }}><XCircle size={12}/> Sipann</button>
          : <button onClick={() => onToggleStatus(t.id,'active')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.25)', color:'#27ae60', cursor:'pointer', fontSize:12, fontWeight:700 }}><CheckCircle size={12}/> Aktive</button>
        }
        <button onClick={() => onDelete(t)} style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'9px', borderRadius:8, background:'rgba(139,0,0,0.08)', border:'1px solid rgba(139,0,0,0.2)', color:'rgba(192,57,43,0.8)', cursor:'pointer', fontSize:12, fontWeight:700 }}><Trash2 size={12}/> Efase Entreprise</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const qc       = useQueryClient()

  const [showCreate,    setShowCreate]   = useState(false)
  const [changePlanT,   setChangePlanT]  = useState(null)
  const [deleteT,       setDeleteT]      = useState(null)
  const [resetPwdT,     setResetPwdT]    = useState(null)
  const [branchView,    setBranchView]   = useState(null)
  const [branchesData,  setBranchesData] = useState({})
  const [branchLoading, setBranchLoading]= useState({})
  const [pageViewT,     setPageViewT]    = useState(null)
  const [pagesData,     setPagesData]    = useState({})
  const [pageSaving,    setPageSaving]   = useState(false)
  const [auditViewT,    setAuditViewT]   = useState(null)
  const [monthlyPrices, setMonthlyPrices]= useState({})
  const [solViewT,      setSolViewT]     = useState(null)

  const { admin } = getAdmin()
  if (!localStorage.getItem('pg-admin')) { navigate('/admin/login'); return null }

  const { data: statsData }    = useQuery({ queryKey:['admin-stats'],    queryFn:() => adminApi.get('/admin/stats').then(r=>r.data) })
  const { data: tenantsData }  = useQuery({ queryKey:['admin-tenants'],  queryFn:() => adminApi.get('/admin/tenants').then(r=>r.data) })
  const { data: plansData }    = useQuery({ queryKey:['admin-plans'],    queryFn:() => adminApi.get('/admin/plans').then(r=>r.data) })
  const { data: expiringData } = useQuery({ queryKey:['admin-expiring'], queryFn:() => adminApi.get('/admin/expiring').then(r=>r.data), refetchInterval:5*60*1000 })

  const tenants  = tenantsData?.tenants  || []
  const plans    = plansData?.plans      || []
  const expiring = expiringData?.expiring || []

  // Jis anba query `expiringData`:
const { data: solOverview } = useQuery({
  queryKey: ['admin-sol-overview'],
  queryFn: () => adminApi.get('/sabotay/admin/overview').then(r => r.data),
  refetchInterval: 5 * 60 * 1000,
})
const sol = solOverview?.summary

  useEffect(() => {
    if (tenants.length > 0) {
      const prices = {}
      tenants.forEach(t => { prices[t.id] = t.monthlyPrice || 0 })
      setMonthlyPrices(prices)
    }
  }, [tenants])

  const totalMonthly  = Object.values(monthlyPrices).reduce((s, p) => s + (Number(p) || 0), 0)
  const activeRevenue = tenants.filter(t => t.status === 'active').reduce((s, t) => s + (Number(monthlyPrices[t.id]) || 0), 0)

  const invalidateAll = () => {
    qc.invalidateQueries(['admin-tenants'])
    qc.invalidateQueries(['admin-stats'])
    qc.invalidateQueries(['admin-expiring'])
  }

  const statusMutation = useMutation({
    mutationFn: ({id, status}) => adminApi.patch(`/admin/tenants/${id}/status`, { status }),
    onSuccess: () => { toast.success('Statut ajou!'); invalidateAll() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })
  const renewMutation = useMutation({
    mutationFn: ({id, months}) => adminApi.post(`/admin/tenants/${id}/renew`, { months }),
    onSuccess: (res) => { toast.success(res.data.message); invalidateAll() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  const loadBranches = async (tenant) => {
    try {
      const res = await adminApi.get(`/admin/tenants/${tenant.id}/branches`)
      setBranchesData(prev => ({ ...prev, [tenant.id]: res.data.branches || [] }))
      setBranchView(tenant.id)
    } catch { toast.error('Erè chajman branch yo.') }
  }

  const toggleBranch = async (tenantId, branchId) => {
    setBranchLoading(prev => ({ ...prev, [branchId]: true }))
    try {
      const res = await adminApi.patch(`/admin/tenants/${tenantId}/branches/${branchId}/toggle`)
      const updated = res.data.branch
      setBranchesData(prev => ({ ...prev, [tenantId]: (prev[tenantId] || []).map(b => b.id === branchId ? updated : b) }))
      toast.success(updated.isActive ? '✅ Branch debloke!' : '🔒 Branch bloke!')
    } catch (e) { toast.error(e.response?.data?.message || 'Erè toggle branch')
    } finally { setBranchLoading(prev => ({ ...prev, [branchId]: false })) }
  }

  const loadPages = async (tenant) => {
    try {
      const res = await adminApi.get(`/admin/tenants/${tenant.id}/pages`)
      setPagesData(prev => ({ ...prev, [tenant.id]: res.data.pages || DEFAULT_PAGES }))
      setPageViewT(tenant)
    } catch {
      setPagesData(prev => ({ ...prev, [tenant.id]: { ...DEFAULT_PAGES, ...(tenant.allowedPages || {}) } }))
      setPageViewT(tenant)
    }
  }

  const savePages = async (tenantId, pages) => {
    setPageSaving(true)
    try {
      await adminApi.patch(`/admin/tenants/${tenantId}/pages`, { pages })
      setPagesData(prev => ({ ...prev, [tenantId]: pages }))
      toast.success('✅ Aksè paj yo sove!')
      invalidateAll()
    } catch (e) { toast.error(e.response?.data?.message || 'Erè sove paj yo.')
    } finally { setPageSaving(false) }
  }

  const saveMonthlyPrice = async (tenantId, price) => {
    try {
      await adminApi.patch(`/admin/tenants/${tenantId}/monthly-price`, { monthlyPrice: price })
      setMonthlyPrices(prev => ({ ...prev, [tenantId]: price }))
      toast.success(`💰 Pri ajou: ${price.toLocaleString()} HTG/mwa`)
    } catch (e) { toast.error(e.response?.data?.message || 'Erè sove pri.') }
  }

  const handleLogout = () => { localStorage.removeItem('pg-admin'); navigate('/admin/login'); toast.success('Ou dekonekte.') }

  const statCards = [
    { label:'Total Entreprise', value:statsData?.stats?.tenants?.total||0,  icon:<Building2 size={18}/>,   grad:'linear-gradient(135deg,#1B3A6B,#2d5fa6)', glow:'rgba(26,58,107,0.5)' },
    { label:'Entreprise Aktif', value:statsData?.stats?.tenants?.active||0, icon:<CheckCircle size={18}/>, grad:'linear-gradient(135deg,#27ae60,#1e8449)', glow:'rgba(39,174,96,0.5)' },
    { label:'Annatant',         value:statsData?.stats?.tenants?.pending||0, icon:<Clock size={18}/>,      grad:'linear-gradient(135deg,#C9A84C,#9a7d32)', glow:'rgba(201,168,76,0.5)' },
    { label:'Total Itilizatè',  value:statsData?.stats?.users?.total||0,    icon:<Users size={18}/>,       grad:'linear-gradient(135deg,#8B0000,#C0392B)', glow:'rgba(139,0,0,0.5)' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg, #0a0a0f 0%, #0d1b2a 50%, #0f0a00 100%)', fontFamily:'DM Sans, sans-serif', position:'relative' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, backgroundImage:'linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px)', backgroundSize:'80px 80px' }}/>

      {/* HEADER */}
      <header style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.12)', height: isMobile?58:66, padding: isMobile?'0 16px':'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:40, boxShadow:'0 4px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg, transparent, #C9A84C 30%, #8B0000 70%, transparent)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap: isMobile?8:12 }}>
          <div style={{ width: isMobile?34:42, height: isMobile?34:42, borderRadius:10, background:'linear-gradient(135deg,#C9A84C,#8B0000)', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={isMobile?16:20} color="#fff"/></div>
          <div>
            <p style={{ color:'#fff', fontSize: isMobile?14:16, fontWeight:800, margin:0, letterSpacing:'0.04em', fontFamily:"'Playfair Display', serif" }}>PLUS GROUP</p>
            {!isMobile && <p style={{ color:'#C9A84C', fontSize:9, margin:0, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase' }}>✦ Super Admin Panel ✦</p>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: isMobile?8:16 }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(201,168,76,0.2)', border:'2px solid rgba(201,168,76,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={14} color="#C9A84C"/></div>
              <div>
                <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0 }}>{admin?.name||'PLUS GROUP Admin'}</p>
                <p style={{ color:'#C9A84C', fontSize:10, margin:0, letterSpacing:'0.06em' }}>✦ Direktè Jeneral</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ background:'rgba(139,0,0,0.15)', border:'1px solid rgba(139,0,0,0.3)', borderRadius:10, padding: isMobile?'7px 10px':'8px 16px', cursor:'pointer', color:'rgba(232,131,106,0.8)', display:'flex', alignItems:'center', gap: isMobile?0:6, fontSize:12, fontWeight:600 }}>
            <LogOut size={14}/>{!isMobile&&' Dekonekte'}
          </button>
        </div>
      </header>

      <main style={{ padding: isMobile?'16px 12px':'28px', maxWidth:1200, margin:'0 auto', position:'relative', zIndex:1, paddingBottom:80 }}>

        {/* ALÈTE EKSPIRE */}
        {expiring.length > 0 && (
          <div style={{ background:'linear-gradient(135deg, rgba(139,0,0,0.3), rgba(192,57,43,0.2))', border:'1px solid rgba(192,57,43,0.4)', borderRadius:16, padding: isMobile?'12px 14px':'14px 20px', marginBottom: isMobile?14:20, display:'flex', alignItems:'flex-start', gap:10 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
            <div>
              <p style={{ color:'#E8836A', fontSize: isMobile?12:13, fontWeight:700, margin:'0 0 4px', fontFamily:"'Playfair Display'" }}>{expiring.length} entreprise ekspire nan 5 jou!</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {expiring.slice(0, isMobile?2:3).map(t => (
                  <p key={t.id} style={{ color:'rgba(232,131,106,0.7)', fontSize:11, margin:0 }}>• <strong style={{ color:'rgba(232,131,106,0.9)' }}>{t.name}</strong> — {formatDate(t.subscriptionEndsAt)}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap: isMobile?10:14, marginBottom: isMobile?16:24 }}>
          {statCards.map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:18, padding: isMobile?'14px 16px':'20px', position:'relative', overflow:'hidden', backdropFilter:'blur(10px)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.grad, borderRadius:'18px 18px 0 0' }}/>
              <div style={{ width: isMobile?36:42, height: isMobile?36:42, borderRadius:12, background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', marginBottom: isMobile?8:12, boxShadow:`0 4px 16px ${s.glow}` }}>{s.icon}</div>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize: isMobile?9:10, fontWeight:700, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em', lineHeight:1.3 }}>{s.label}</p>
              <p style={{ color:'#fff', fontSize: isMobile?24:30, fontWeight:800, margin:0, fontFamily:"'Playfair Display', serif" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* REVNI MENSYÈL */}
        {totalMonthly > 0 && (
          <div style={{ background:'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(139,0,0,0.12))', border:'1px solid rgba(201,168,76,0.25)', borderRadius:18, padding: isMobile?'14px 16px':'18px 24px', marginBottom: isMobile?16:24, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,#C9A84C 40%,#8B0000 80%,transparent)' }}/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width: isMobile?40:48, height: isMobile?40:48, borderRadius:14, background:'linear-gradient(135deg,#C9A84C,#9a7d32)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(201,168,76,0.3)' }}>
                  <DollarSign size={isMobile?18:22} color="#0f1923"/>
                </div>
                <div>
                  <p style={{ color:'rgba(201,168,76,0.6)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 2px' }}>Revni Mensyèl Total</p>
                  <p style={{ color:'#C9A84C', fontSize: isMobile?22:28, fontWeight:800, margin:0, fontFamily:"'Playfair Display'" }}>{totalMonthly.toLocaleString()} <span style={{ fontSize:14, fontWeight:500, color:'rgba(201,168,76,0.6)' }}>HTG</span></p>
                  <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:'2px 0 0' }}>≈ {Math.round(totalMonthly / 132.5).toLocaleString()} USD</p>
                </div>
              </div>
              {!isMobile && (
                <div style={{ display:'flex', gap:24 }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ color:'rgba(39,174,96,0.6)', fontSize:9, fontWeight:700, textTransform:'uppercase', margin:'0 0 2px' }}>Aktif sèlman</p>
                    <p style={{ color:'#27ae60', fontSize:18, fontWeight:800, margin:0, fontFamily:"'Playfair Display'" }}>{activeRevenue.toLocaleString()} HTG</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontWeight:700, textTransform:'uppercase', margin:'0 0 2px' }}>Tenant ak pri</p>
                    <p style={{ color:'rgba(255,255,255,0.6)', fontSize:18, fontWeight:800, margin:0 }}>{Object.values(monthlyPrices).filter(p => p > 0).length}/{tenants.length}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {sol && (
  <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:18, padding: isMobile?'14px 16px':'18px 24px', marginBottom: isMobile?16:24 }}>
    <p style={{ color:'rgba(201,168,76,0.7)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 14px', display:'flex', alignItems:'center', gap:6 }}>
      <Smartphone size={12}/> Sabotay Sol — Vue Jeneral
    </p>
    <div style={{ display:'grid', gridTemplateColumns: isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:10 }}>
      {[
        { label:'Total Plan',    val: sol.totalPlans,    color:'#6baed6' },
        { label:'Plan Aktif',    val: sol.activePlans,   color:'#27ae60' },
        { label:'Total Manm',   val: sol.totalMembers,  color:'#C9A84C' },
        { label:'Revni Estime', val: `${Number(sol.totalRevenue||0).toLocaleString()} HTG`, color:'#E8836A' },
      ].map(({ label, val, color }) => (
        <div key={label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}20`, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontWeight:700, textTransform:'uppercase', margin:'0 0 4px' }}>{label}</p>
          <p style={{ color, fontSize: isMobile?16:20, fontWeight:800, margin:0, fontFamily:"'Playfair Display'" }}>{val}</p>
        </div>
      ))}
    </div>
  </div>
)}

        {/* TABLEAU */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:20, overflow:'hidden', backdropFilter:'blur(10px)', boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ padding: isMobile?'14px 16px':'18px 24px', borderBottom:'1px solid rgba(201,168,76,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(201,168,76,0.03)' }}>
            <div>
              <h3 style={{ margin:0, fontSize: isMobile?14:15, fontWeight:700, color:'#fff', fontFamily:"'Playfair Display'" }}>Entreprise yo ({tenants.length})</h3>
              {!isMobile && <p style={{ margin:0, fontSize:10, color:'rgba(201,168,76,0.6)', letterSpacing:'0.06em' }}>KLIYAN SaaS AKTIF</p>}
            </div>
            <button onClick={() => setShowCreate(true)} style={{ display:'inline-flex', alignItems:'center', gap: isMobile?4:8, padding: isMobile?'8px 14px':'10px 20px', borderRadius:10, background:'linear-gradient(135deg, #8B0000, #C0392B 50%, #C9A84C)', color:'#fff', border:'none', cursor:'pointer', fontSize: isMobile?12:13, fontWeight:700, boxShadow:'0 4px 20px rgba(139,0,0,0.4)' }}>
              <Plus size={14}/>{isMobile?'Nouvo':'Nouvo Entreprise'}
            </button>
          </div>

          {/* MOBIL */}
          {isMobile ? (
            <div style={{ padding:'12px' }}>
              {!tenants.length
                ? <div style={{ padding:'50px 16px', textAlign:'center' }}><p style={{ color:'rgba(255,255,255,0.25)', fontWeight:600, margin:0 }}>Pa gen entreprise</p></div>
                : tenants.map(t => (
                    <TenantCard key={t.id} t={t}
                      monthlyPrice={monthlyPrices[t.id] || 0}
                      onRenew={(id) => renewMutation.mutate({ id, months:1 })}
                      onChangePlan={(t) => setChangePlanT(t)}
                      onToggleStatus={(id, status) => statusMutation.mutate({ id, status })}
                      onDelete={(t) => setDeleteT(t)}
                      onResetPwd={(t) => setResetPwdT(t)}
                      onBranch={(t) => loadBranches(t)}
                      onPages={(t) => loadPages(t)}
                      onAudit={(t) => setAuditViewT(t)}
                      onSol={(t) => setSolViewT(t)}
                      onSavePrice={saveMonthlyPrice}/>
                  ))
              }
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,0,0,0.2)' }}>
                  {['Entreprise','Slug','Plan','Itilizatè','Statut','Ekspirasyon','Pri Mensyèl','Aksyon'].map((h,i) => (
                    <th key={i} style={{ padding:'10px 16px', textAlign:'left', paddingLeft: i===0?24:16, fontSize:9, fontWeight:700, color:'rgba(201,168,76,0.6)', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'1px solid rgba(201,168,76,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!tenants.length
                  ? <tr><td colSpan={8} style={{ padding:'70px 24px', textAlign:'center' }}>
                      <p style={{ color:'rgba(255,255,255,0.25)', fontWeight:600, margin:'0 0 6px' }}>Pa gen entreprise</p>
                      <p style={{ color:'rgba(255,255,255,0.12)', fontSize:13, margin:0 }}>Klike "Nouvo Entreprise" pou kòmanse</p>
                    </td></tr>
                  : tenants.map((t, idx) => {
                      const ss = STATUS_STYLES[t.status] || STATUS_STYLES.pending
                      const { label, isExpired, isWarning, daysLeft } = getSubscriptionStatus(t.subscriptionEndsAt)
                      return (
                        <tr key={t.id} style={{ borderBottom: idx<tenants.length-1?'1px solid rgba(255,255,255,0.04)':'none' }}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,0.03)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'14px 16px 14px 24px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, #8B0000, #C9A84C)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:15, fontWeight:800, flexShrink:0 }}>{t.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <p style={{ fontWeight:700, color:'#fff', margin:0, fontSize:13 }}>{t.name}</p>
                                {t.email && <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>{t.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:'14px 16px' }}>
                            <span style={{ fontFamily:'monospace', fontSize:11, color:'rgba(201,168,76,0.7)', background:'rgba(201,168,76,0.06)', padding:'2px 8px', borderRadius:6, border:'1px solid rgba(201,168,76,0.1)' }}>{t.slug}</span>
                          </td>
                          <td style={{ padding:'14px 16px', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{t.plan?.name||<span style={{ color:'rgba(255,255,255,0.2)' }}>—</span>}</td>
                          <td style={{ padding:'14px 16px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <Users size={12} color="rgba(201,168,76,0.6)"/>
                              <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>{t._count?.users||0}</span>
                            </div>
                          </td>
                          <td style={{ padding:'14px 16px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, fontSize:11, fontWeight:700 }}>{ss.label}</span>
                          </td>
                          <td style={{ padding:'14px 16px' }}>
                            {daysLeft!==null ? (
                              <div>
                                <span style={{ fontSize:11, fontWeight:700, color: isExpired?'#E8836A':isWarning?'#C9A84C':'#27ae60' }}>{label}</span>
                                <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', margin:'1px 0 0' }}>{formatDate(t.subscriptionEndsAt)}</p>
                              </div>
                            ) : <span style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>—</span>}
                          </td>
                          <td style={{ padding:'14px 16px' }}>
                            <PriceEditor tenantId={t.id} currentPrice={monthlyPrices[t.id] || 0} onSave={saveMonthlyPrice}/>
                          </td>
                          <td style={{ padding:'14px 16px' }}>
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              <button onClick={() => { if(window.confirm(`Renouvle "${t.name}" +1 mwa?`)) renewMutation.mutate({id:t.id,months:1}) }}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.25)', color:'#27ae60', cursor:'pointer', fontSize:11, fontWeight:700 }}>↻ +1 Mwa</button>
                              <button onClick={() => setChangePlanT(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', color:'#C9A84C', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <Crown size={11}/> Plan</button>
                              <button onClick={() => loadBranches(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(100,148,237,0.12)', border:'1px solid rgba(100,148,237,0.25)', color:'#64a0ed', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <GitBranch size={11}/> Branch ({t._count?.branches||0})</button>
                              <button onClick={() => loadPages(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)', color:'#a78bfa', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <LayoutGrid size={11}/> Paj yo</button>
                              <button onClick={() => setResetPwdT(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(26,58,107,0.15)', border:'1px solid rgba(26,58,107,0.35)', color:'#6baed6', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <KeyRound size={11}/> Modpas</button>
                              <button onClick={() => setAuditViewT(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <History size={11}/> Istorik</button>
                              {/* Bouton Sol */}
                              <button onClick={() => setSolViewT(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(139,0,0,0.1)', border:'1px solid rgba(192,57,43,0.3)', color:'#E8836A', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <Smartphone size={11}/> Sol</button>
                              {t.status==='active'
                                ? <button onClick={() => { if(window.confirm(`Sipann "${t.name}"?`)) statusMutation.mutate({id:t.id,status:'suspended'}) }}
                                    style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(139,0,0,0.1)', border:'1px solid rgba(139,0,0,0.25)', color:'#E8836A', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                    <XCircle size={11}/> Sipann</button>
                                : <button onClick={() => statusMutation.mutate({id:t.id,status:'active'})}
                                    style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.25)', color:'#27ae60', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                    <CheckCircle size={11}/> Aktive</button>
                              }
                              <button onClick={() => setDeleteT(t)}
                                style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:6, background:'rgba(139,0,0,0.08)', border:'1px solid rgba(139,0,0,0.2)', color:'rgba(192,57,43,0.8)', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                <Trash2 size={11}/> Efase</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop:24, textAlign:'center' }}>
          <p style={{ color:'rgba(255,255,255,0.12)', fontSize:10, margin:0, letterSpacing:'0.08em' }}>© 2025 PLUS GROUP — Innov@tion & Tech · Ouanaminthe, Haïti</p>
        </div>
      </main>

      {/* MODALS */}
      {showCreate   && <CreateTenantModal plans={plans} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); invalidateAll() }}/>}
      {changePlanT  && <ChangePlanModal tenant={changePlanT} plans={plans} onClose={() => setChangePlanT(null)} onChanged={invalidateAll}/>}
      {deleteT      && <DeleteModal tenant={deleteT} onClose={() => setDeleteT(null)} onDeleted={() => { setDeleteT(null); invalidateAll() }}/>}
      {resetPwdT    && <ResetPasswordModal tenant={resetPwdT} onClose={() => setResetPwdT(null)}/>}
      {branchView   && <BranchPanel tenantId={branchView} tenantName={tenants.find(t => t.id === branchView)?.name || ''} branches={branchesData[branchView]} onToggle={toggleBranch} loadingMap={branchLoading} onClose={() => setBranchView(null)}/>}
      {pageViewT    && <PageAccessPanel tenant={pageViewT} pages={pagesData[pageViewT.id]} onSave={savePages} saving={pageSaving} onClose={() => setPageViewT(null)}/>}
      {auditViewT   && <AuditLogModal tenant={auditViewT} onClose={() => setAuditViewT(null)}/>}
      {solViewT     && <SolManagerModal tenant={solViewT} onClose={() => setSolViewT(null)}/>}

      <TickerBanner/>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes ticker { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
}
