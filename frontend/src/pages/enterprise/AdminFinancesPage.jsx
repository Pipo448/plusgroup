// src/pages/enterprise/AdminFinancesPage.jsx
// Jesyon Finansye — Admin Only (Orange + Ble = Plus Group)
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PiggyBank,
  ShoppingCart, Tag, Users, Plus, RefreshCw, Calendar, X,
  Trash2, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight,
  Briefcase, CreditCard, Eye,
} from 'lucide-react'

const API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const api = (path, opts = {}) => {
  const pgAuth = JSON.parse(localStorage.getItem('pg-auth') || '{}')
  const token  = pgAuth?.state?.token || ''
  const slug   = localStorage.getItem('plusgroup-slug') || pgAuth?.state?.tenant?.slug || ''
  return fetch(`${API}/api/v1/admin-finances${path}`, {
    ...opts,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Slug': slug,
      ...opts.headers,
    },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d })
}

const fmtN = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits: 2 }).replace(/\u00A0/g,' ').replace(/\u202F/g,' ')
const fmtS = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits: 0 }).replace(/\u00A0/g,' ').replace(/\u202F/g,' ')
const fmtD = (d) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-HT') } catch { return '' } }

// ✅ KOULE PLUS GROUP — Orange + Ble
const C = {
  bg:'#04090f', card:'#0b1420', cardBorder:'rgba(255,107,0,0.12)', shadow:'0 2px 10px rgba(0,0,0,0.3)',
  orange:'#FF6B00', orangeLight:'#FF8C33', orangeDim:'rgba(255,107,0,0.08)', orangeBg:'rgba(255,107,0,0.12)',
  orangeBtn:'linear-gradient(135deg,#FF8C33 0%,#FF6B00 50%,#CC5500 100%)',
  blue:'#3B82F6', blueDim:'rgba(59,130,246,0.08)', blueBg:'rgba(59,130,246,0.12)',
  text:'#f0f4ff', muted:'#6a7a94', mutedLt:'#8899aa',
  green:'#22c55e', greenBg:'rgba(34,197,94,0.12)',
  red:'#ef4444', redBg:'rgba(239,68,68,0.12)',
  yellow:'#f59e0b', yellowBg:'rgba(245,158,11,0.12)',
  purple:'#a78bfa', purpleBg:'rgba(167,139,250,0.12)',
  teal:'#14b8a6', tealBg:'rgba(20,184,166,0.10)',
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  @keyframes afFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes afSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes afSpin { to{transform:rotate(360deg)} }

  .af-root { font-family:'DM Sans',sans-serif; padding:14px; max-width:900px; margin:0 auto; padding-bottom:90px; }

  .af-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
  .af-header h1 { font-size:18px; font-weight:900; color:${C.orange}; margin:0 0 2px; display:flex; align-items:center; gap:6px; }
  .af-header p { font-size:11px; color:${C.muted}; margin:0; }
  .af-date-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  .af-date-input { padding:7px 8px; border-radius:8px; border:1px solid ${C.cardBorder}; background:${C.card}; color:${C.text}; font-size:12px; font-family:inherit; width:125px; }
  .af-icon-btn { width:34px; height:34px; min-width:34px; border-radius:8px; border:1px solid ${C.cardBorder}; background:${C.card}; color:${C.muted}; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .af-icon-btn:active { transform:scale(0.95); }

  /* HERO */
  .af-hero { background:linear-gradient(135deg,#0c1a30,#0f2040,#0c1830); border:1px solid ${C.cardBorder}; border-radius:16px; padding:18px 20px; position:relative; overflow:hidden; margin-bottom:12px; }
  .af-hero::after { content:''; position:absolute; top:-50px; right:-50px; width:200px; height:200px; background:radial-gradient(circle,rgba(255,107,0,0.06),transparent 70%); pointer-events:none; }
  .af-hero-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; position:relative; z-index:1; }
  .af-hero-label { font-size:9px; color:${C.muted}; text-transform:uppercase; font-weight:700; letter-spacing:0.06em; margin:0 0 3px; }
  .af-hero-amount { font-family:'JetBrains Mono',monospace; font-weight:900; font-size:28px; margin:0; line-height:1.1; }
  .af-hero-sub { font-size:10px; color:${C.muted}; margin:3px 0 0; }
  .af-hero-today { display:flex; gap:16px; }
  .af-hero-today-item { text-align:center; }
  .af-hero-today-label { font-size:9px; color:${C.muted}; text-transform:uppercase; margin:0 0 2px; }
  .af-hero-today-val { font-family:monospace; font-weight:800; font-size:14px; margin:0; }

  /* KAPITAL BAR */
  .af-kapital { background:${C.blueBg}; border:1px solid ${C.blue}35; border-radius:12px; padding:14px 16px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  .af-kapital-left { display:flex; align-items:center; gap:8px; }
  .af-kapital-icon { width:36px; height:36px; border-radius:10px; background:${C.blueDim}; display:flex; align-items:center; justify-content:center; color:${C.blue}; }
  .af-kapital-val { font-family:monospace; font-weight:900; font-size:20px; color:${C.blue}; }
  .af-kapital-btn { padding:8px 14px; border-radius:8px; border:1px solid ${C.blue}40; background:${C.blueDim}; color:${C.blue}; cursor:pointer; font-weight:700; font-size:11px; font-family:inherit; display:flex; align-items:center; gap:4px; }
  .af-kapital-btn:active { transform:scale(0.97); }

  /* STATS GRID */
  .af-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
  .af-stat { background:${C.card}; border:1px solid ${C.cardBorder}; border-radius:12px; padding:11px; }
  .af-stat-top { display:flex; align-items:center; gap:6px; margin-bottom:5px; }
  .af-stat-icon { width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .af-stat-label { font-size:9px; font-weight:700; color:${C.muted}; text-transform:uppercase; letter-spacing:0.04em; }
  .af-stat-val { font-family:monospace; font-weight:800; font-size:14px; margin:0; }
  .af-stat-sub { font-size:9px; color:${C.muted}; margin:2px 0 0; }

  /* SOL BALANS */
  .af-sol-bar { background:${C.purpleBg}; border:1px solid ${C.purple}30; border-radius:10px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:12px; }

  /* TABS */
  .af-tabs { display:flex; gap:2px; background:rgba(255,255,255,0.03); border:1px solid ${C.cardBorder}; border-radius:11px; padding:3px; margin-bottom:12px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .af-tabs::-webkit-scrollbar { display:none; }
  .af-tab { flex:0 0 auto; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700; border:none; display:flex; align-items:center; gap:3px; white-space:nowrap; font-family:inherit; transition:all 0.15s; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }

  /* ADD BUTTON */
  .af-add-btn { padding:11px 16px; border-radius:10px; border:none; font-weight:800; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; font-family:inherit; -webkit-tap-highlight-color:transparent; touch-action:manipulation; margin-bottom:8px; }
  .af-add-btn:active { transform:scale(0.97); opacity:0.9; }

  /* TX LIST */
  .af-tx-row { background:${C.card}; border:1px solid ${C.cardBorder}; border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px; }
  .af-tx-desc { font-size:12px; font-weight:700; color:${C.text}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .af-tx-meta { font-size:10px; color:${C.muted}; margin-top:2px; display:flex; gap:5px; flex-wrap:wrap; }
  .af-tx-amount { font-family:monospace; font-weight:800; font-size:13px; white-space:nowrap; }
  .af-tx-badge { font-size:8px; padding:1px 5px; border-radius:4px; font-weight:700; }
  .af-tx-del { background:none; border:none; color:${C.muted}; cursor:pointer; padding:6px; border-radius:6px; -webkit-tap-highlight-color:transparent; }
  .af-tx-del:active { background:${C.redBg}; }
  .af-empty { text-align:center; padding:32px 14px; color:${C.muted}; background:${C.card}; border-radius:12px; border:1px dashed ${C.cardBorder}; }
  .af-pag { display:flex; justify-content:center; gap:8px; align-items:center; margin-top:8px; }
  .af-pag-btn { width:30px; height:30px; border-radius:7px; border:1px solid ${C.cardBorder}; background:${C.card}; color:${C.muted}; cursor:pointer; display:flex; align-items:center; justify-content:center; }

  /* KAT BREAKDOWN */
  .af-kat-row { display:flex; align-items:center; gap:8px; margin-bottom:3px; }
  .af-kat-label { font-size:10px; color:${C.text}; font-weight:600; width:65px; flex-shrink:0; }
  .af-kat-track { flex:1; height:5px; border-radius:3px; background:rgba(255,255,255,0.06); overflow:hidden; }
  .af-kat-fill { height:100%; border-radius:3px; transition:width 0.5s; }
  .af-kat-val { font-family:monospace; font-size:10px; font-weight:700; width:75px; text-align:right; flex-shrink:0; }

  /* MODAL */
  .af-overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:flex-end; justify-content:center; animation:afFadeIn 0.2s; }
  .af-modal { background:linear-gradient(160deg,#0f1e30,#0a1520); border:1px solid ${C.cardBorder}; border-radius:20px 20px 0 0; width:100%; max-width:500px; padding:20px; max-height:92vh; overflow-y:auto; animation:afSlideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
  .af-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .af-modal-title { font-size:16px; font-weight:800; color:${C.orange}; margin:0; }
  .af-modal-close { background:none; border:none; color:${C.muted}; cursor:pointer; padding:6px; }
  .af-field { margin-bottom:11px; }
  .af-field-label { display:block; font-size:10px; font-weight:700; color:${C.orange}; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em; }
  .af-input { width:100%; padding:11px 12px; border-radius:10px; border:1px solid ${C.cardBorder}; background:rgba(255,255,255,0.05); color:${C.text}; font-size:14px; outline:none; box-sizing:border-box; font-family:inherit; -webkit-appearance:none; }
  .af-input:focus { border-color:${C.orange}80; box-shadow:0 0 0 3px ${C.orangeDim}; }
  .af-select { width:100%; padding:11px 12px; border-radius:10px; border:1px solid ${C.cardBorder}; background:#0d1825; color:${C.text}; font-size:14px; outline:none; box-sizing:border-box; font-family:inherit; -webkit-appearance:none; appearance:none; background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236a7a94' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e"); background-repeat:no-repeat; background-position:right 10px center; background-size:16px; cursor:pointer; }
  .af-select:focus { border-color:${C.orange}80; box-shadow:0 0 0 3px ${C.orangeDim}; }
  .af-select option { background:#0d1825; color:${C.text}; padding:10px; font-size:14px; }
  .af-row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .af-submit { width:100%; padding:13px; border-radius:12px; border:none; background:${C.orangeBtn}; color:#fff; font-weight:800; font-size:14px; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px; }
  .af-submit:active { transform:scale(0.98); }
  .af-submit:disabled { opacity:0.5; }
  .af-profit-box { background:${C.greenBg}; border:1px solid ${C.green}30; border-radius:10px; padding:10px 14px; margin-bottom:11px; display:flex; align-items:center; gap:8px; }

  /* RESPONSIVE */
  @media (min-width:600px) {
    .af-overlay { align-items:center; }
    .af-modal { border-radius:20px; animation:afFadeIn 0.25s; }
    .af-hero-amount { font-size:32px; }
  }
  @media (max-width:599px) {
    .af-root { padding:10px 10px 90px; }
    .af-header h1 { font-size:15px; }
    .af-date-input { width:108px; font-size:11px; padding:6px; }
    .af-hero { padding:14px; border-radius:14px; }
    .af-hero-amount { font-size:22px; }
    .af-hero-today-val { font-size:13px; }
    .af-stats { grid-template-columns:1fr 1fr; gap:6px; }
    .af-stat { padding:9px; border-radius:10px; }
    .af-stat-val { font-size:12px; }
    .af-stat-label { font-size:8px; }
    .af-tabs { gap:2px; }
    .af-tab { padding:7px 8px; font-size:10px; }
    .af-add-btn { font-size:11px; padding:10px 12px; width:100%; justify-content:center; }
    .af-modal { padding:16px; }
    .af-input, .af-select { font-size:16px; padding:12px; }
    .af-kapital-val { font-size:17px; }
  }
  @media (max-width:380px) {
    .af-stats { grid-template-columns:1fr; }
    .af-hero-inner { flex-direction:column; align-items:flex-start; }
    .af-hero-today { width:100%; justify-content:space-between; }
    .af-row2 { grid-template-columns:1fr; }
  }
`

const TABS = [
  { id:'rezime',   label:'Rezime',    icon:<Wallet size={13}/>,        color:C.orange },
  { id:'depans',   label:'Depans',    icon:<TrendingDown size={13}/>,  color:C.red },
  { id:'prevwa',   label:'Prevwa',    icon:<Calendar size={13}/>,      color:C.yellow },
  { id:'revni',    label:'Revni',     icon:<TrendingUp size={13}/>,    color:C.green },
  { id:'envesti',  label:'Envesti',   icon:<Briefcase size={13}/>,     color:C.blue },
  { id:'vant',     label:'Vant',      icon:<Tag size={13}/>,           color:C.teal },
  { id:'sol',      label:'Sol',       icon:<Users size={13}/>,         color:C.purple },
]

const CATEGORIES_DEPANS = ['Loye','Sale','Manje','Transpor','Elektrik','Entenet','Telefon','Materyel','Komisyon','Lot']

// ═══════════════════════════════════════════════════════════════
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="af-stat">
      <div className="af-stat-top">
        <div className="af-stat-icon" style={{ background:`${color}15`, color }}>{icon}</div>
        <span className="af-stat-label">{label}</span>
      </div>
      <p className="af-stat-val" style={{ color }}>{value}</p>
      {sub && <p className="af-stat-sub">{sub}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
function ModalAjoute({ type, onClose, onSuccess }) {
  const [form, setForm] = useState({
    description:'', amount:'', category:'', costPrice:'', sellPrice:'', quantity:'1',
    personName:'', personPhone:'', date: new Date(Date.now() - 5*60*60*1000).toISOString().split('T')[0],
    dueDate:'', notes:'',
  })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  const labels = {
    depans:'Depans', depans_prevwa:'Depans Prevwa', revni:'Revni',
    acha:'Envestisman', vant:'Vant', depo_sol:'Depo Sol', peman_sol:'Peman Sol', kapital:'Kapital',
  }

  const submit = async () => {
    if (!form.description.trim()) return toast.error('Deskripsyon obligatwa')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Montan dwe > 0')
    setLoading(true)
    try {
      await api('', { method:'POST', body: JSON.stringify({
        type, ...form,
        amount: Number(form.amount),
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        sellPrice: form.sellPrice ? Number(form.sellPrice) : undefined,
        quantity: Number(form.quantity||1),
      })})
      toast.success('Anrejistre!'); onSuccess(); onClose()
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const isSol  = type === 'depo_sol' || type === 'peman_sol'
  const isVant = type === 'vant'
  const isAcha = type === 'acha'

  return (
    <div className="af-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="af-modal">
        <div className="af-modal-header">
          <h3 className="af-modal-title">+ {labels[type] || type}</h3>
          <button className="af-modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="af-field">
          <label className="af-field-label">Deskripsyon</label>
          <input className="af-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ki sa..." />
        </div>

        <div className="af-row2">
          <div className="af-field">
            <label className="af-field-label">Montan (HTG)</label>
            <input type="number" inputMode="decimal" className="af-input" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
          </div>
          <div className="af-field">
            <label className="af-field-label">{type==='depans_prevwa' ? 'Dat Prevwa' : 'Dat'}</label>
            <input type="date" className="af-input" value={type==='depans_prevwa' ? form.dueDate : form.date} onChange={e => set(type==='depans_prevwa' ? 'dueDate' : 'date', e.target.value)} />
          </div>
        </div>

        {(type==='depans' || type==='depans_prevwa') && (
          <div className="af-field">
            <label className="af-field-label">Kategori</label>
            <select className="af-select" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">-- Chwazi Kategori --</option>
              {CATEGORIES_DEPANS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>
        )}

        {(isAcha || isVant) && (
          <div className="af-row2">
            <div className="af-field">
              <label className="af-field-label">Pri Achte</label>
              <input type="number" inputMode="decimal" className="af-input" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0" />
            </div>
            {isVant && (
              <div className="af-field">
                <label className="af-field-label">Pri Vann</label>
                <input type="number" inputMode="decimal" className="af-input" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} placeholder="0" />
              </div>
            )}
            <div className="af-field">
              <label className="af-field-label">Kantite</label>
              <input type="number" inputMode="numeric" className="af-input" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="1" />
            </div>
          </div>
        )}

        {isSol && (
          <div className="af-row2">
            <div className="af-field">
              <label className="af-field-label">Non Moun</label>
              <input className="af-input" value={form.personName} onChange={e => set('personName', e.target.value)} placeholder="Non manm" />
            </div>
            <div className="af-field">
              <label className="af-field-label">Telefon</label>
              <input className="af-input" inputMode="tel" value={form.personPhone} onChange={e => set('personPhone', e.target.value)} placeholder="+509..." />
            </div>
          </div>
        )}

        <div className="af-field">
          <label className="af-field-label">Not (opsyonel)</label>
          <textarea className="af-input" style={{ minHeight:40, resize:'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Detay..." />
        </div>

        {isVant && form.costPrice && form.amount && (
          <div className="af-profit-box">
            <TrendingUp size={14} style={{ color:C.green, flexShrink:0 }} />
            <span style={{ fontSize:12, color:C.green, fontWeight:700 }}>
              Benefis: {fmtN((Number(form.amount) - Number(form.costPrice)) * Number(form.quantity||1))} HTG
            </span>
          </div>
        )}

        <button className="af-submit" onClick={submit} disabled={loading}>
          {loading ? 'Ap anrejistre...' : '+ Anrejistre'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
function TxList({ type, debutDate, finDate, refresh: refreshKey }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-fin-list', type, debutDate, finDate, page, refreshKey],
    queryFn: () => api(`?type=${type}&debutDate=${debutDate}&finDate=${finDate}&page=${page}&limit=15`),
  })

  const transactions = data?.transactions || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 15) || 1
  const isPositive = ['revni','vant','depo_sol','kapital'].includes(type)
  const colors = { depans:C.red, depans_prevwa:C.yellow, revni:C.green, acha:C.blue, vant:C.teal, depo_sol:C.purple, peman_sol:C.yellow, kapital:C.blue }
  const color = colors[type] || C.orange

  const handleDelete = async (id) => {
    if (!window.confirm('Efase tranzaksyon sa?')) return
    try {
      await api(`/${id}`, { method:'DELETE' })
      toast.success('Efase!')
      qc.invalidateQueries(['admin-fin-list'])
      qc.invalidateQueries(['admin-fin-summary'])
    } catch(e) { toast.error(e.message) }
  }

  if (isLoading) return <div style={{ textAlign:'center', padding:20, color:C.muted }}><div style={{ width:18, height:18, border:`2px solid ${C.orange}30`, borderTopColor:C.orange, borderRadius:'50%', animation:'afSpin 0.8s linear infinite', margin:'0 auto' }}/></div>

  if (!transactions.length) return (
    <div className="af-empty">
      <DollarSign size={26} style={{ opacity:0.2, margin:'0 auto 6px', display:'block' }}/>
      <p style={{ margin:0, fontSize:12 }}>Pa gen tranzaksyon</p>
    </div>
  )

  return (
    <>
      <p style={{ fontSize:10, color:C.muted, margin:'0 0 5px' }}>{total} tranzaksyon</p>
      {transactions.map(tx => (
        <div key={tx.id} className="af-tx-row">
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
              <span className="af-tx-desc">{tx.description}</span>
              {tx.category && <span className="af-tx-badge" style={{ background:C.orangeDim, color:C.orange }}>{tx.category}</span>}
              {tx.isPaid && <span className="af-tx-badge" style={{ background:C.greenBg, color:C.green }}>Peye</span>}
            </div>
            <div className="af-tx-meta">
              <span>{fmtD(tx.dueDate || tx.date)}</span>
              {tx.personName && <span>👤 {tx.personName}</span>}
              {tx.profit != null && <span style={{ color:C.green }}>+{fmtS(tx.profit)}</span>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <span className="af-tx-amount" style={{ color }}>{isPositive ? '+' : '-'}{fmtS(tx.amount)} G</span>
            <button className="af-tx-del" onClick={() => handleDelete(tx.id)}><Trash2 size={12}/></button>
          </div>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="af-pag">
          <button className="af-pag-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}><ChevronLeft size={13}/></button>
          <span style={{ fontSize:11, color:C.text, fontWeight:700 }}>{page}/{totalPages}</span>
          <button className="af-pag-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}><ChevronRight size={13}/></button>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAJ PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function AdminFinancesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab]     = useState('rezime')
  const [modal, setModal] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // ✅ Admin sèlman
  const isAdmin = user?.role === 'admin'

  const now = new Date()
  const [debutDate, setDebutDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [finDate, setFinDate]     = useState(now.toISOString().split('T')[0])

  const { data: summary } = useQuery({
    queryKey: ['admin-fin-summary', debutDate, finDate, refreshKey],
    queryFn: () => api(`/summary?debutDate=${debutDate}&finDate=${finDate}`),
    enabled: isAdmin,
  })

  const refresh = () => { setRefreshKey(k => k+1); qc.invalidateQueries(['admin-fin-summary']); qc.invalidateQueries(['admin-fin-list']) }
  const s = summary || {}

  // Kapital disponib = kapital + revni + vant - depans - envesti + depo_sol - peman_sol
  const kapitalDisponib = (s.kapital?.total||0) + (s.revni?.total||0) + (s.vant?.total||0) + (s.depoSol?.total||0) - (s.depans?.total||0) - (s.acha?.total||0) - (s.pemanSol?.total||0)

  useEffect(() => {
    const el = document.createElement('style'); el.id = 'af-styles'; el.textContent = STYLES
    document.head.appendChild(el)
    return () => document.getElementById('af-styles')?.remove()
  }, [])

  if (!isAdmin) return (
    <div style={{ textAlign:'center', padding:60, color:C.muted, fontFamily:'DM Sans,sans-serif' }}>
      <PiggyBank size={40} style={{ opacity:0.2, margin:'0 auto 12px', display:'block' }}/>
      <p style={{ fontSize:14, fontWeight:700 }}>Paj sa se pou Admin sèlman</p>
    </div>
  )

  return (
    <div className="af-root">

      {/* Header */}
      <div className="af-header">
        <div>
          <h1><PiggyBank size={17}/> Jesyon Finansye</h1>
          <p>Kontwole depans, revni, envestisman ak sol</p>
        </div>
        <div className="af-date-row">
          <input type="date" className="af-date-input" value={debutDate} onChange={e => setDebutDate(e.target.value)}/>
          <span style={{ color:C.muted, fontSize:11 }}>→</span>
          <input type="date" className="af-date-input" value={finDate} onChange={e => setFinDate(e.target.value)}/>
          <button className="af-icon-btn" onClick={refresh}><RefreshCw size={13}/></button>
        </div>
      </div>

      {/* ✅ KAPITAL DISPONIB */}
      <div className="af-kapital">
        <div className="af-kapital-left">
          <div className="af-kapital-icon"><CreditCard size={18}/></div>
          <div>
            <p style={{ fontSize:9, color:C.muted, margin:0, textTransform:'uppercase', fontWeight:700 }}>Kapital Disponib</p>
            <p className="af-kapital-val">{fmtN(kapitalDisponib)} <span style={{ fontSize:11, color:C.muted }}>HTG</span></p>
          </div>
        </div>
        <button className="af-kapital-btn" onClick={() => setModal('kapital')}>
          <Plus size={13}/> Ajoute Kapital
        </button>
      </div>

      {/* Hero — Benefis */}
      <div className="af-hero">
        <div className="af-hero-inner">
          <div>
            <p className="af-hero-label">Benefis Peryod la</p>
            <p className="af-hero-amount" style={{ color: (s.vreBenefis||0) >= 0 ? C.green : C.red }}>
              {(s.vreBenefis||0) >= 0 ? '+' : ''}{fmtN(s.vreBenefis||0)} <span style={{ fontSize:12, color:C.muted }}>HTG</span>
            </p>
            <p className="af-hero-sub">Revni + Benefis Vant - Depans</p>
          </div>
          <div className="af-hero-today">
            <div className="af-hero-today-item">
              <p className="af-hero-today-label">Antre Jodi</p>
              <p className="af-hero-today-val" style={{ color:C.green }}>+{fmtS(s.revniJodi||0)}</p>
            </div>
            <div className="af-hero-today-item">
              <p className="af-hero-today-label">Soti Jodi</p>
              <p className="af-hero-today-val" style={{ color:C.red }}>-{fmtS(s.depansJodi||0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="af-stats">
        <StatCard label="Depans"     value={`-${fmtS(s.depans?.total||0)}`}   icon={<TrendingDown size={13}/>}    color={C.red}    sub={`${s.depans?.count||0} tx`}/>
        <StatCard label="Revni"      value={`+${fmtS(s.revni?.total||0)}`}    icon={<TrendingUp size={13}/>}      color={C.green}  sub={`${s.revni?.count||0} tx`}/>
        <StatCard label="Envesti"    value={`-${fmtS(s.acha?.total||0)}`}     icon={<Briefcase size={13}/>}       color={C.blue}   sub={`${s.acha?.count||0} acha`}/>
        <StatCard label="Vant"       value={`+${fmtS(s.vant?.total||0)}`}     icon={<Tag size={13}/>}             color={C.teal}   sub={`Benefis: ${fmtS(s.vant?.profit||0)}`}/>
        <StatCard label="Depo Sol"   value={`+${fmtS(s.depoSol?.total||0)}`}  icon={<ArrowDownCircle size={13}/>} color={C.purple} sub="Pa pou ou"/>
        <StatCard label="Peman Sol"  value={`-${fmtS(s.pemanSol?.total||0)}`} icon={<ArrowUpCircle size={13}/>}   color={C.yellow} sub="Bay manm"/>
      </div>

      {/* Sol Balans */}
      {(s.depoSol?.total > 0 || s.pemanSol?.total > 0) && (
        <div className="af-sol-bar">
          <span style={{ fontSize:11, color:C.purple, fontWeight:700 }}>🔄 Balans Sol (kob manm yo):</span>
          <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:14, color: (s.solBalans||0) >= 0 ? C.purple : C.red }}>
            {fmtN(s.solBalans||0)} HTG
          </span>
        </div>
      )}

      {/* Depans pa Kategori */}
      {s.depansParKat?.length > 0 && tab === 'rezime' && (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:12, padding:'11px 14px', marginBottom:12 }}>
          <p style={{ fontSize:10, fontWeight:700, color:C.red, margin:'0 0 7px', textTransform:'uppercase' }}>Depans pa Kategori</p>
          {s.depansParKat.map((k,i) => {
            const pct = s.depans?.total > 0 ? (k.total / s.depans.total) * 100 : 0
            return (
              <div key={i} className="af-kat-row">
                <span className="af-kat-label">{k.category || 'Lot'}</span>
                <div className="af-kat-track"><div className="af-kat-fill" style={{ width:`${pct}%`, background:C.red }}/></div>
                <span className="af-kat-val" style={{ color:C.red }}>{fmtS(k.total)} G</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="af-tabs">
        {TABS.map(t => (
          <button key={t.id} className="af-tab" onClick={() => setTab(t.id)} style={{
            background: tab===t.id ? C.orangeDim : 'transparent',
            color: tab===t.id ? C.orange : C.muted,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Rezime */}
      {tab === 'rezime' && s.dernye10?.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.cardBorder}`, borderRadius:12, padding:'11px 14px' }}>
          <p style={{ fontSize:10, fontWeight:700, color:C.orange, margin:'0 0 7px', textTransform:'uppercase' }}>10 Denye Tranzaksyon</p>
          {s.dernye10.map((tx,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom: i < s.dernye10.length-1 ? `1px solid ${C.cardBorder}` : 'none', gap:6 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:11, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{tx.description}</span>
                <span style={{ fontSize:9, color:C.muted }}>{tx.type==='acha'?'envesti':tx.type} • {fmtD(tx.date)}</span>
              </div>
              <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:11, flexShrink:0, color: ['revni','vant','depo_sol','kapital'].includes(tx.type) ? C.green : C.red }}>
                {['revni','vant','depo_sol','kapital'].includes(tx.type) ? '+' : '-'}{fmtS(tx.amount)} G
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Depans */}
      {tab === 'depans' && (
        <>
          <button className="af-add-btn" style={{ background:C.redBg, color:C.red, border:`1px solid ${C.red}30` }} onClick={() => setModal('depans')}>
            <Plus size={13}/> Ajoute Depans
          </button>
          <TxList type="depans" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Depans Prevwa */}
      {tab === 'prevwa' && (
        <>
          <button className="af-add-btn" style={{ background:C.yellowBg, color:C.yellow, border:`1px solid ${C.yellow}30` }} onClick={() => setModal('depans_prevwa')}>
            <Calendar size={13}/> Depans Prevwa
          </button>
          <TxList type="depans_prevwa" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Revni */}
      {tab === 'revni' && (
        <>
          <button className="af-add-btn" style={{ background:C.greenBg, color:C.green, border:`1px solid ${C.green}30` }} onClick={() => setModal('revni')}>
            <TrendingUp size={13}/> Ajoute Revni
          </button>
          <TxList type="revni" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* ✅ Envesti (ansyen Acha) */}
      {tab === 'envesti' && (
        <>
          <button className="af-add-btn" style={{ background:C.blueBg, color:C.blue, border:`1px solid ${C.blue}30` }} onClick={() => setModal('acha')}>
            <Briefcase size={13}/> Nouvo Envestisman
          </button>
          <TxList type="acha" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Vant */}
      {tab === 'vant' && (
        <>
          <button className="af-add-btn" style={{ background:C.tealBg, color:C.teal, border:`1px solid ${C.teal}30` }} onClick={() => setModal('vant')}>
            <Tag size={13}/> Nouvo Vant
          </button>
          <TxList type="vant" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Sol */}
      {tab === 'sol' && (
        <>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
            <button className="af-add-btn" style={{ background:C.purpleBg, color:C.purple, border:`1px solid ${C.purple}30`, flex:'1 1 130px' }} onClick={() => setModal('depo_sol')}>
              <ArrowDownCircle size={13}/> Depo Sol
            </button>
            <button className="af-add-btn" style={{ background:C.yellowBg, color:C.yellow, border:`1px solid ${C.yellow}30`, flex:'1 1 130px' }} onClick={() => setModal('peman_sol')}>
              <ArrowUpCircle size={13}/> Peman Sol
            </button>
          </div>
          <p style={{ fontSize:10, fontWeight:700, color:C.purple, margin:'4px 0' }}>Depo Sol (kob ki antre):</p>
          <TxList type="depo_sol" debutDate="2000-01-01" finDate="2099-12-31" refresh={refreshKey}/>
          <p style={{ fontSize:10, fontWeight:700, color:C.yellow, margin:'10px 0 4px' }}>Peman Sol (kob ki soti):</p>
          <TxList type="peman_sol" debutDate="2000-01-01" finDate="2099-12-31" refresh={refreshKey}/>
        </>
      )}

      {modal && <ModalAjoute type={modal} onClose={() => setModal(null)} onSuccess={refresh}/>}
    </div>
  )
}