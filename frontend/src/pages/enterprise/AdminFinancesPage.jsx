// src/pages/enterprise/AdminFinancesPage.jsx
// Jesyon Finansye Konplè — Admin Dashboard (Mobile-First Responsive)
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PiggyBank,
  ShoppingCart, Tag, Users, Plus, RefreshCw, Calendar, X,
  CheckCircle, Clock, Trash2, Edit, AlertCircle, ArrowDownCircle,
  ArrowUpCircle, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react'

const API = import.meta.env.VITE_API || ''
const api = (path, opts = {}) => {
  const token = localStorage.getItem('token')
  return fetch(`${API}/api/v1/admin-finances${path}`, {
    ...opts,
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}`, ...opts.headers },
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d })
}

const fmt = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits: 2 }).replace(/\u00A0/g,' ').replace(/\u202F/g,' ')
const fmtShort = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits: 0 }).replace(/\u00A0/g,' ').replace(/\u202F/g,' ')
const fmtD = (d) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-HT') } catch { return '' } }

const D = {
  bg:'#04090f', card:'#0a1520', cardBorder:'rgba(201,168,76,0.12)',
  gold:'#C9A84C', goldDim:'rgba(201,168,76,0.08)', goldBtn:'linear-gradient(135deg,#E8C87A 0%,#C9A84C 50%,#8B6914 100%)',
  text:'#f0f4ff', muted:'#5a6a82', mutedLt:'#8899aa',
  green:'#22c55e', greenBg:'rgba(34,197,94,0.10)',
  red:'#ef4444', redBg:'rgba(239,68,68,0.10)',
  orange:'#f59e0b', orangeBg:'rgba(245,158,11,0.10)',
  blue:'#60a5fa', blueBg:'rgba(96,165,250,0.10)',
  purple:'#a78bfa', purpleBg:'rgba(167,139,250,0.10)',
  teal:'#14b8a6', tealBg:'rgba(20,184,166,0.08)',
  shadow:'0 2px 12px rgba(0,0,0,0.3)',
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }

  .af-root { font-family:'DM Sans',sans-serif; padding:14px; max-width:900px; margin:0 auto; padding-bottom:90px; }
  .af-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px; }
  .af-header h1 { font-size:18px; font-weight:900; color:${D.gold}; margin:0 0 2px; display:flex; align-items:center; gap:6px; }
  .af-header p { font-size:11px; color:${D.muted}; margin:0; }

  .af-date-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  .af-date-input { padding:7px 8px; border-radius:8px; border:1px solid ${D.cardBorder}; background:${D.card}; color:${D.text}; font-size:12px; font-family:inherit; width:130px; }
  .af-icon-btn { width:34px; height:34px; min-width:34px; border-radius:8px; border:1px solid ${D.cardBorder}; background:${D.card}; color:${D.muted}; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .af-icon-btn:active { transform:scale(0.95); }

  .af-hero { background:linear-gradient(135deg,#0f2040,#0c1a30); border:1px solid ${D.cardBorder}; border-radius:16px; padding:18px 20px; position:relative; overflow:hidden; margin-bottom:14px; }
  .af-hero::after { content:''; position:absolute; top:-40px; right:-40px; width:180px; height:180px; background:radial-gradient(circle,rgba(201,168,76,0.08),transparent 70%); pointer-events:none; }
  .af-hero-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; position:relative; z-index:1; }
  .af-hero-label { font-size:9px; color:${D.muted}; text-transform:uppercase; font-weight:700; letter-spacing:0.06em; margin:0 0 3px; }
  .af-hero-amount { font-family:monospace; font-weight:900; font-size:28px; margin:0; }
  .af-hero-sub { font-size:10px; color:${D.muted}; margin:3px 0 0; }
  .af-hero-today { display:flex; gap:16px; }
  .af-hero-today-item { text-align:center; }
  .af-hero-today-label { font-size:9px; color:${D.muted}; text-transform:uppercase; margin:0 0 2px; }
  .af-hero-today-val { font-family:monospace; font-weight:800; font-size:15px; margin:0; }

  .af-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
  .af-stat { background:${D.card}; border:1px solid ${D.cardBorder}; border-radius:12px; padding:12px; }
  .af-stat-top { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
  .af-stat-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .af-stat-label { font-size:9px; font-weight:700; color:${D.muted}; text-transform:uppercase; letter-spacing:0.04em; }
  .af-stat-val { font-family:monospace; font-weight:800; font-size:14px; margin:0; }
  .af-stat-sub { font-size:9px; color:${D.muted}; margin:2px 0 0; }

  .af-sol-bar { background:${D.purpleBg}; border:1px solid rgba(167,139,250,0.3); border-radius:10px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:14px; }

  .af-tabs { display:flex; gap:3px; background:rgba(255,255,255,0.03); border:1px solid ${D.cardBorder}; border-radius:11px; padding:3px; margin-bottom:14px; overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .af-tab { flex:0 0 auto; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700; border:none; display:flex; align-items:center; gap:4px; white-space:nowrap; font-family:inherit; transition:all 0.15s; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }

  .af-add-btn { padding:12px 18px; border-radius:12px; border:none; color:#fff; font-weight:800; font-size:13px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-family:inherit; -webkit-tap-highlight-color:transparent; touch-action:manipulation; margin-bottom:10px; }
  .af-add-btn:active { transform:scale(0.97); opacity:0.9; }

  .af-tx-row { background:${D.card}; border:1px solid ${D.cardBorder}; border-radius:12px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
  .af-tx-desc { font-size:13px; font-weight:700; color:${D.text}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .af-tx-meta { font-size:10px; color:${D.muted}; margin-top:2px; display:flex; gap:6px; flex-wrap:wrap; }
  .af-tx-amount { font-family:monospace; font-weight:800; font-size:14px; white-space:nowrap; }
  .af-tx-badge { font-size:8px; padding:1px 5px; border-radius:4px; font-weight:700; }
  .af-tx-del { background:none; border:none; color:${D.muted}; cursor:pointer; padding:6px; border-radius:6px; -webkit-tap-highlight-color:transparent; }
  .af-tx-del:active { background:rgba(239,68,68,0.15); }

  .af-empty { text-align:center; padding:36px 16px; color:${D.muted}; background:${D.card}; border-radius:14px; border:1px dashed ${D.cardBorder}; }

  .af-pag { display:flex; justify-content:center; gap:8px; align-items:center; margin-top:10px; }
  .af-pag-btn { width:32px; height:32px; border-radius:8px; border:1px solid ${D.cardBorder}; background:${D.card}; color:${D.muted}; cursor:pointer; display:flex; align-items:center; justify-content:center; }

  .af-kat-row { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
  .af-kat-label { font-size:11px; color:${D.text}; font-weight:600; width:70px; flex-shrink:0; }
  .af-kat-bar-track { flex:1; height:6px; border-radius:4px; background:rgba(255,255,255,0.06); overflow:hidden; }
  .af-kat-bar-fill { height:100%; border-radius:4px; background:${D.red}; transition:width 0.5s; }
  .af-kat-val { font-family:monospace; font-size:11px; font-weight:700; color:${D.red}; width:80px; text-align:right; flex-shrink:0; }

  /* MODAL */
  .af-overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:flex-end; justify-content:center; animation:fadeIn 0.2s; }
  .af-modal { background:linear-gradient(160deg,#0f1e30,#0a1520); border:1px solid ${D.cardBorder}; border-radius:20px 20px 0 0; width:100%; max-width:500px; padding:20px; max-height:92vh; overflow-y:auto; animation:slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
  .af-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
  .af-modal-title { font-size:16px; font-weight:800; color:${D.gold}; margin:0; }
  .af-modal-close { background:none; border:none; color:${D.muted}; cursor:pointer; padding:6px; }
  .af-field { margin-bottom:12px; }
  .af-field-label { display:block; font-size:10px; font-weight:700; color:${D.gold}; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em; }
  .af-input { width:100%; padding:11px 12px; border-radius:10px; border:1px solid ${D.cardBorder}; background:rgba(255,255,255,0.04); color:${D.text}; font-size:14px; outline:none; box-sizing:border-box; font-family:inherit; -webkit-appearance:none; }
  .af-input:focus { border-color:rgba(201,168,76,0.5); box-shadow:0 0 0 3px rgba(201,168,76,0.08); }
  .af-row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .af-submit { width:100%; padding:14px; border-radius:12px; border:none; background:${D.goldBtn}; color:#0a1222; font-weight:800; font-size:14px; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px; }
  .af-submit:active { transform:scale(0.98); }
  .af-submit:disabled { opacity:0.5; }
  .af-profit-box { background:${D.greenBg}; border:1px solid rgba(34,197,94,0.3); border-radius:10px; padding:10px 14px; margin-bottom:12px; display:flex; align-items:center; gap:8px; }

  /* RESPONSIVE */
  @media (min-width:600px) {
    .af-overlay { align-items:center; }
    .af-modal { border-radius:20px; animation:fadeIn 0.25s; }
    .af-hero-amount { font-size:34px; }
    .af-stats { grid-template-columns:repeat(3,1fr); }
    .af-stat-val { font-size:16px; }
  }
  @media (max-width:599px) {
    .af-root { padding:10px 10px 90px; }
    .af-header h1 { font-size:16px; }
    .af-date-input { width:110px; font-size:11px; padding:6px 6px; }
    .af-hero { padding:14px 14px; border-radius:14px; }
    .af-hero-amount { font-size:24px; }
    .af-hero-today { gap:12px; }
    .af-hero-today-val { font-size:13px; }
    .af-stats { grid-template-columns:1fr 1fr; gap:6px; }
    .af-stat { padding:10px; border-radius:10px; }
    .af-stat-icon { width:24px; height:24px; border-radius:6px; }
    .af-stat-val { font-size:13px; }
    .af-stat-label { font-size:8px; }
    .af-tabs { gap:2px; padding:2px; }
    .af-tab { padding:7px 8px; font-size:10px; gap:3px; }
    .af-tx-row { padding:9px 10px; border-radius:10px; }
    .af-tx-desc { font-size:12px; }
    .af-tx-amount { font-size:13px; }
    .af-add-btn { font-size:12px; padding:11px 14px; width:100%; justify-content:center; }
    .af-modal { padding:16px; }
    .af-input { font-size:16px; padding:12px; } /* prevent zoom on iOS */
    .af-kat-label { width:60px; font-size:10px; }
    .af-kat-val { width:70px; font-size:10px; }
  }
  @media (max-width:380px) {
    .af-stats { grid-template-columns:1fr; }
    .af-hero-inner { flex-direction:column; align-items:flex-start; }
    .af-hero-today { width:100%; justify-content:space-between; }
    .af-row2 { grid-template-columns:1fr; }
  }
`

const TABS = [
  { id:'rezime',   label:'Rezime',    icon:<Wallet size={13}/>,        color:D.gold },
  { id:'depans',   label:'Depans',    icon:<TrendingDown size={13}/>,  color:D.red },
  { id:'prevwa',   label:'Prevwa',    icon:<Calendar size={13}/>,      color:D.orange },
  { id:'revni',    label:'Revni',     icon:<TrendingUp size={13}/>,    color:D.green },
  { id:'achavant', label:'Acha/Vant', icon:<ShoppingCart size={13}/>,  color:D.blue },
  { id:'sol',      label:'Sol',       icon:<Users size={13}/>,         color:D.purple },
]

const CATEGORIES_DEPANS = ['Loye','Sale','Manje','Transpor','Elektrik','Entenet','Telefon','Materyel','Komisyon','Lot']

// ═══════════════════════════════════════════════════════════════
// STAT CARD
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
// MODAL AJOUTE
// ═══════════════════════════════════════════════════════════════
function ModalAjoute({ type, onClose, onSuccess }) {
  const [form, setForm] = useState({
    description:'', amount:'', category:'', costPrice:'', sellPrice:'', quantity:'1',
    personName:'', personPhone:'', date: new Date().toISOString().split('T')[0],
    dueDate:'', notes:'',
  })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  const labels = {
    depans:'Depans', depans_prevwa:'Depans Prevwa', revni:'Revni',
    acha:'Acha', vant:'Vant', depo_sol:'Depo Sol', peman_sol:'Peman Sol',
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
            <select className="af-input" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">-- Chwazi --</option>
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
          <textarea className="af-input" style={{ minHeight:44, resize:'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Detay..." />
        </div>

        {isVant && form.costPrice && form.amount && (
          <div className="af-profit-box">
            <TrendingUp size={14} style={{ color:D.green, flexShrink:0 }} />
            <span style={{ fontSize:12, color:D.green, fontWeight:700 }}>
              Benefis: {fmt((Number(form.amount) - Number(form.costPrice)) * Number(form.quantity||1))} HTG
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
// LIS TRANZAKSYON
// ═══════════════════════════════════════════════════════════════
function TxList({ type, debutDate, finDate, refresh: refreshKey }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-fin-list', type, debutDate, finDate, page, refreshKey],
    queryFn: () => api(`?type=${type}&debutDate=${debutDate}&finDate=${finDate}&page=${page}&limit=15`),
  })

  const transactions = data?.transactions || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 15) || 1
  const isPositive = ['revni','vant','depo_sol'].includes(type)
  const typeColors = { depans:D.red, depans_prevwa:D.orange, revni:D.green, acha:D.blue, vant:D.teal, depo_sol:D.purple, peman_sol:D.orange }
  const color = typeColors[type] || D.gold

  const handleDelete = async (id) => {
    if (!window.confirm('Efase tranzaksyon sa?')) return
    try { await api(`/${id}`, { method:'DELETE' }); toast.success('Efase!') } catch(e) { toast.error(e.message) }
  }

  if (isLoading) return <div style={{ textAlign:'center', padding:24, color:D.muted }}><div style={{ width:20, height:20, border:`2px solid ${D.gold}30`, borderTopColor:D.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/></div>

  if (!transactions.length) return (
    <div className="af-empty">
      <DollarSign size={28} style={{ opacity:0.2, margin:'0 auto 8px', display:'block' }}/>
      <p style={{ margin:0, fontSize:13 }}>Pa gen tranzaksyon pou peryod sa</p>
    </div>
  )

  return (
    <>
      <p style={{ fontSize:11, color:D.muted, margin:'0 0 6px' }}>{total} tranzaksyon</p>
      {transactions.map(tx => (
        <div key={tx.id} className="af-tx-row">
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              <span className="af-tx-desc">{tx.description}</span>
              {tx.category && <span className="af-tx-badge" style={{ background:D.goldDim, color:D.gold }}>{tx.category}</span>}
              {tx.isPaid && <span className="af-tx-badge" style={{ background:D.greenBg, color:D.green }}>Peye</span>}
            </div>
            <div className="af-tx-meta">
              <span>{fmtD(tx.dueDate || tx.date)}</span>
              {tx.personName && <span>👤 {tx.personName}</span>}
              {tx.profit != null && <span style={{ color:D.green }}>+{fmtShort(tx.profit)} G</span>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <span className="af-tx-amount" style={{ color }}>
              {isPositive ? '+' : '-'}{fmtShort(tx.amount)} G
            </span>
            <button className="af-tx-del" onClick={() => handleDelete(tx.id)}><Trash2 size={13}/></button>
          </div>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="af-pag">
          <button className="af-pag-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}><ChevronLeft size={14}/></button>
          <span style={{ fontSize:12, color:D.text, fontWeight:700 }}>{page}/{totalPages}</span>
          <button className="af-pag-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}><ChevronRight size={14}/></button>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAJ PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function AdminFinancesPage() {
  const qc = useQueryClient()
  const [tab, setTab]     = useState('rezime')
  const [modal, setModal] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const now = new Date()
  const [debutDate, setDebutDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [finDate, setFinDate]     = useState(now.toISOString().split('T')[0])

  const { data: summary } = useQuery({
    queryKey: ['admin-fin-summary', debutDate, finDate, refreshKey],
    queryFn: () => api(`/summary?debutDate=${debutDate}&finDate=${finDate}`),
  })

  const refresh = () => { setRefreshKey(k => k+1); qc.invalidateQueries(['admin-fin-summary']); qc.invalidateQueries(['admin-fin-list']) }
  const s = summary || {}

  useEffect(() => {
    const el = document.createElement('style'); el.id = 'af-styles'; el.textContent = STYLES
    document.head.appendChild(el)
    return () => document.getElementById('af-styles')?.remove()
  }, [])

  return (
    <div className="af-root">

      {/* Header */}
      <div className="af-header">
        <div>
          <h1><PiggyBank size={18}/> Jesyon Finansye</h1>
          <p>Kontwole depans, revni, acha/vant ak sol</p>
        </div>
        <div className="af-date-row">
          <input type="date" className="af-date-input" value={debutDate} onChange={e => setDebutDate(e.target.value)}/>
          <span style={{ color:D.muted, fontSize:12 }}>→</span>
          <input type="date" className="af-date-input" value={finDate} onChange={e => setFinDate(e.target.value)}/>
          <button className="af-icon-btn" onClick={refresh}><RefreshCw size={14}/></button>
        </div>
      </div>

      {/* Hero — Balans */}
      <div className="af-hero">
        <div className="af-hero-inner">
          <div>
            <p className="af-hero-label">Balans Peryod la</p>
            <p className="af-hero-amount" style={{ color: (s.vreBenefis||0) >= 0 ? D.green : D.red }}>
              {(s.vreBenefis||0) >= 0 ? '+' : ''}{fmt(s.vreBenefis||0)} <span style={{ fontSize:13, color:D.muted }}>HTG</span>
            </p>
            <p className="af-hero-sub">Revni + Benefis Vant - Depans</p>
          </div>
          <div className="af-hero-today">
            <div className="af-hero-today-item">
              <p className="af-hero-today-label">Antre Jodi</p>
              <p className="af-hero-today-val" style={{ color:D.green }}>+{fmtShort(s.revniJodi||0)}</p>
            </div>
            <div className="af-hero-today-item">
              <p className="af-hero-today-label">Soti Jodi</p>
              <p className="af-hero-today-val" style={{ color:D.red }}>-{fmtShort(s.depansJodi||0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="af-stats">
        <StatCard label="Depans"    value={`-${fmtShort(s.depans?.total||0)}`}   icon={<TrendingDown size={14}/>}    color={D.red}    sub={`${s.depans?.count||0} tx`}/>
        <StatCard label="Revni"     value={`+${fmtShort(s.revni?.total||0)}`}    icon={<TrendingUp size={14}/>}      color={D.green}  sub={`${s.revni?.count||0} tx`}/>
        <StatCard label="Acha"      value={`-${fmtShort(s.acha?.total||0)}`}     icon={<ShoppingCart size={14}/>}    color={D.blue}   sub={`${s.acha?.count||0} acha`}/>
        <StatCard label="Vant"      value={`+${fmtShort(s.vant?.total||0)}`}     icon={<Tag size={14}/>}             color={D.teal}   sub={`Benefis: ${fmtShort(s.vant?.profit||0)}`}/>
        <StatCard label="Depo Sol"  value={`+${fmtShort(s.depoSol?.total||0)}`}  icon={<ArrowDownCircle size={14}/>} color={D.purple} sub="Pa pou ou"/>
        <StatCard label="Peman Sol" value={`-${fmtShort(s.pemanSol?.total||0)}`} icon={<ArrowUpCircle size={14}/>}   color={D.orange} sub="Bay manm"/>
      </div>

      {/* Sol Balans */}
      {(s.depoSol?.total > 0 || s.pemanSol?.total > 0) && (
        <div className="af-sol-bar">
          <span style={{ fontSize:11, color:D.purple, fontWeight:700 }}>🔄 Balans Sol:</span>
          <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color: (s.solBalans||0) >= 0 ? D.purple : D.red }}>
            {fmt(s.solBalans||0)} HTG
          </span>
        </div>
      )}

      {/* Depans pa Kategori */}
      {s.depansParKat?.length > 0 && tab === 'rezime' && (
        <div style={{ background:D.card, border:`1px solid ${D.cardBorder}`, borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:700, color:D.red, margin:'0 0 8px', textTransform:'uppercase' }}>Depans pa Kategori</p>
          {s.depansParKat.map((k,i) => {
            const pct = s.depans?.total > 0 ? (k.total / s.depans.total) * 100 : 0
            return (
              <div key={i} className="af-kat-row">
                <span className="af-kat-label">{k.category || 'Lot'}</span>
                <div className="af-kat-bar-track"><div className="af-kat-bar-fill" style={{ width:`${pct}%` }}/></div>
                <span className="af-kat-val">{fmtShort(k.total)} G</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="af-tabs">
        {TABS.map(t => (
          <button key={t.id} className="af-tab" onClick={() => setTab(t.id)} style={{
            background: tab===t.id ? D.goldDim : 'transparent',
            color: tab===t.id ? D.gold : D.muted,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Rezime — 10 dènye */}
      {tab === 'rezime' && s.dernye10?.length > 0 && (
        <div style={{ background:D.card, border:`1px solid ${D.cardBorder}`, borderRadius:12, padding:'12px 14px' }}>
          <p style={{ fontSize:10, fontWeight:700, color:D.gold, margin:'0 0 8px', textTransform:'uppercase' }}>10 Denye Tranzaksyon</p>
          {s.dernye10.map((tx,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom: i < s.dernye10.length-1 ? `1px solid ${D.cardBorder}` : 'none', gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:12, fontWeight:600, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{tx.description}</span>
                <span style={{ fontSize:9, color:D.muted }}>{tx.type} • {fmtD(tx.date)}</span>
              </div>
              <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, flexShrink:0, color: ['revni','vant','depo_sol'].includes(tx.type) ? D.green : D.red }}>
                {['revni','vant','depo_sol'].includes(tx.type) ? '+' : '-'}{fmtShort(tx.amount)} G
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Depans */}
      {tab === 'depans' && (
        <>
          <button className="af-add-btn" style={{ background:D.redBg, color:D.red, border:`1px solid ${D.red}30` }} onClick={() => setModal('depans')}>
            <Plus size={14}/> Ajoute Depans
          </button>
          <TxList type="depans" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Depans Prevwa */}
      {tab === 'prevwa' && (
        <>
          <button className="af-add-btn" style={{ background:D.orangeBg, color:D.orange, border:`1px solid ${D.orange}30` }} onClick={() => setModal('depans_prevwa')}>
            <Calendar size={14}/> Depans Prevwa
          </button>
          <TxList type="depans_prevwa" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Revni */}
      {tab === 'revni' && (
        <>
          <button className="af-add-btn" style={{ background:D.greenBg, color:D.green, border:`1px solid ${D.green}30` }} onClick={() => setModal('revni')}>
            <TrendingUp size={14}/> Ajoute Revni
          </button>
          <TxList type="revni" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Acha / Vant */}
      {tab === 'achavant' && (
        <>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <button className="af-add-btn" style={{ background:D.blueBg, color:D.blue, border:`1px solid ${D.blue}30`, flex:'1 1 140px' }} onClick={() => setModal('acha')}>
              <ShoppingCart size={14}/> Acha
            </button>
            <button className="af-add-btn" style={{ background:D.tealBg, color:D.teal, border:`1px solid ${D.teal}30`, flex:'1 1 140px' }} onClick={() => setModal('vant')}>
              <Tag size={14}/> Vant
            </button>
          </div>
          <p style={{ fontSize:11, fontWeight:700, color:D.blue, margin:'4px 0' }}>Acha yo:</p>
          <TxList type="acha" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
          <p style={{ fontSize:11, fontWeight:700, color:D.teal, margin:'10px 0 4px' }}>Vant yo:</p>
          <TxList type="vant" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {/* Sol */}
      {tab === 'sol' && (
        <>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <button className="af-add-btn" style={{ background:D.purpleBg, color:D.purple, border:`1px solid ${D.purple}30`, flex:'1 1 140px' }} onClick={() => setModal('depo_sol')}>
              <ArrowDownCircle size={14}/> Depo Sol
            </button>
            <button className="af-add-btn" style={{ background:D.orangeBg, color:D.orange, border:`1px solid ${D.orange}30`, flex:'1 1 140px' }} onClick={() => setModal('peman_sol')}>
              <ArrowUpCircle size={14}/> Peman Sol
            </button>
          </div>
          <p style={{ fontSize:11, fontWeight:700, color:D.purple, margin:'4px 0' }}>Depo Sol:</p>
          <TxList type="depo_sol" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
          <p style={{ fontSize:11, fontWeight:700, color:D.orange, margin:'10px 0 4px' }}>Peman Sol:</p>
          <TxList type="peman_sol" debutDate={debutDate} finDate={finDate} refresh={refreshKey}/>
        </>
      )}

      {modal && <ModalAjoute type={modal} onClose={() => setModal(null)} onSuccess={refresh}/>}
    </div>
  )
}
