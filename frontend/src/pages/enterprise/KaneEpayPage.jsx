// src/pages/enterprise/KaneEpayPage.jsx
import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, Search, ArrowDownCircle, ArrowUpCircle, Eye,
  X, Printer, ChevronLeft, ChevronRight, Users, Wallet,
  TrendingUp, Activity, CreditCard, AlertCircle,
  Bluetooth, BluetoothOff,
} from 'lucide-react'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, printKaneReceipt
} from '../../services/printerService'

// ─── API wrapper ─────────────────────────────────────────────
const kaneAPI = {
  getStats: ()         => api.get('/kane-epay/stats'),
  getAll:   (p)        => api.get('/kane-epay', { params: p }),
  getOne:   (id)       => api.get(`/kane-epay/${id}`),
  create:   (data)     => api.post('/kane-epay', data),
  deposit:  (id, data) => api.post(`/kane-epay/${id}/deposit`, data),
  withdraw: (id, data) => api.post(`/kane-epay/${id}/withdraw`, data),
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '' }
}

function getAccountPrefix(tenant) {
  const name  = tenant?.businessName || tenant?.name || ''
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length)   return 'KE'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Kach'      },
  { value: 'moncash',  label: 'MonCash'   },
  { value: 'natcash',  label: 'NatCash'   },
  { value: 'transfer', label: 'Virement'  },
  { value: 'card',     label: 'Kat Kredi' },
  { value: 'check',    label: 'Chèk'      },
]

const FAMILY_RELATIONS = [
  'Manman','Papa','Sè','Frè','Kouzen','Kouzin',
  'Madanm','Mari','Bofis','Bofre','Belmè','Belsè',
  'Grann','Granpap','Pitit Fi','Pitit Gason','Tonton','Tante',
]

// ─── Design tokens ───────────────────────────────────────────
const D = {
  card:       '#0d1b2a',
  cardBorder: 'rgba(201,168,76,0.18)',
  overlay:    'rgba(0,0,0,0.88)',
  gold:       '#C9A84C',
  goldBtn:    'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:    'rgba(201,168,76,0.10)',
  secBg:      'rgba(201,168,76,0.04)',
  secBorder:  'rgba(201,168,76,0.11)',
  green:      '#27ae60', greenBg: 'rgba(39,174,96,0.12)',
  red:        '#C0392B', redBg:   'rgba(192,57,43,0.10)',
  orange:     '#D97706', orangeBg:'rgba(217,119,6,0.10)',
  blue:       '#3B82F6', blueBg:  'rgba(59,130,246,0.10)',
  text:       '#e8eaf0',
  muted:      '#6b7a99',
  label:      'rgba(201,168,76,0.75)',
  input:      '#060f1e',
  shadow:     '0 4px 20px rgba(0,0,0,0.4)',
}

// ─── Global CSS ───────────────────────────────────────────────
const STYLES = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sheetUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }

  .ke-modal::-webkit-scrollbar       { width: 3px }
  .ke-modal::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px }
  .ke-modal input::placeholder,
  .ke-modal textarea::placeholder    { color: #2a3a54 }
  .ke-modal select option            { background: #0d1b2a; color: #e8eaf0 }
  .ke-row:hover                      { background: rgba(201,168,76,0.06) !important; }
  .ke-photo-box:hover                { border-color: rgba(201,168,76,0.5) !important; background: rgba(201,168,76,0.04) !important; }
  .ke-btn:active                     { transform: scale(0.97); }
  .ke-input:focus                    { border-color: #C9A84C !important; box-shadow: 0 0 0 2px rgba(201,168,76,0.14) !important; outline: none; }

  /* ── Responsive ── */
  /* Mobile first — base styles */
  .ke-stats-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ke-today-grid    { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .ke-header        { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .ke-header-right  { display: flex; gap: 8px; align-items: center; }
  .ke-form-row      { display: flex; flex-direction: column; gap: 10px; }
  .ke-photo-grid    { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .ke-acc-row-btns  { display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(201,168,76,0.1); }

  /* Tablet 600px+ */
  @media (min-width: 600px) {
    .ke-stats-grid   { grid-template-columns: repeat(3, 1fr); }
    .ke-form-row     { flex-direction: row; }
    .ke-photo-grid   { grid-template-columns: 1fr 1fr; }
    .ke-sheet        { border-radius: 20px !important; margin: 20px auto !important; max-height: 88vh !important; }
    .ke-overlay      { align-items: center !important; }
  }

  /* Desktop 900px+ */
  @media (min-width: 900px) {
    .ke-today-grid  { gap: 12px; }
    .ke-stats-grid  { gap: 12px; }
  }

  /* Very small phones */
  @media (max-width: 380px) {
    .ke-stats-grid  { grid-template-columns: 1fr; }
    .ke-today-grid  { grid-template-columns: 1fr; }
    .ke-stat-val    { font-size: 13px !important; }
    .ke-acc-num     { font-size: 10px !important; }
    .ke-acc-name    { font-size: 13px !important; }
    .ke-header-title{ font-size: 17px !important; }
  }
`

// ─── Receipt builder ─────────────────────────────────────────
function buildReceiptHTML(account, transaction, tenant, type = 'ouverture') {
  const biz  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : ''
  const labels = { ouverture: 'OUVERTURE KONT', depot: 'DEPO / DÉPÔT', retrait: 'RETRÈ / RETRAIT' }
  const color  = type === 'retrait' ? '#dc2626' : '#16a34a'
  const txDate = transaction?.createdAt ? fmtDate(transaction.createdAt) : fmtDate(new Date())

  return `<div style="width:80mm;padding:4mm 3mm;font-family:'Courier New',monospace;font-size:10px;line-height:1.5;color:#1a1a1a">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- KANÈ EPAY --</div>
      ${tenant?.phone   ? `<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>` : ''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
      ${labels[type] || 'TRANZAKSYON'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">No. Kont:</span><b>${account.accountNumber}</b></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Dat:</span><span>${txDate}</span></div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid #ccc;margin-bottom:5px;font-size:9px">
      <b>${account.firstName} ${account.lastName}</b>
      ${account.phone ? `<div>Tel: ${account.phone}</div>` : ''}
      ${account.nifOrCin ? `<div>NIF/CIN: ${account.nifOrCin}</div>` : ''}
      ${account.familyRelation ? `<div>Ref: ${account.familyRelation} — ${account.familyName || ''}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
      ${type === 'ouverture' ? `
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Montan:</span><b>${fmt(account.openingAmount)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Frè:</span><span style="color:#dc2626">- ${fmt(account.kaneFee)} HTG</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Bloke:</span><span style="color:#d97706">- ${fmt(account.lockedAmount)} HTG</span></div>
      ` : `<div style="display:flex;justify-content:space-between"><span style="color:#555">Balans anvan:</span><span>${fmt(transaction?.balanceBefore)} HTG</span></div>`}
      <div style="border-top:2px solid #111;padding-top:4px;margin-top:3px;display:flex;justify-content:space-between">
        <b style="font-family:Arial;font-size:12px">${type === 'retrait' ? 'RETRÈ' : type === 'depot' ? 'DEPO' : 'BALANS'}</b>
        <b style="font-family:Arial;font-size:14px;color:${color}">${type === 'ouverture' ? fmt(account.balance) : fmt(transaction?.amount)} HTG</b>
      </div>
      ${type !== 'ouverture' ? `<div style="display:flex;justify-content:space-between;margin-top:3px"><span style="color:#555">Nouvo balans:</span><b style="color:#16a34a">${fmt(transaction?.balanceAfter)} HTG</b></div>` : ''}
    </div>
    ${transaction?.method ? `<div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Metod:</span><b>${transaction.method.toUpperCase()}</b></div>
      ${transaction.reference ? `<div style="display:flex;justify-content:space-between"><span style="color:#555">Ref:</span><span>${transaction.reference}</span></div>` : ''}
    </div>` : ''}
    <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
      <b>Mèsi! / Merci!</b><br/>
      <span style="color:#666;font-size:8px">PlusGroup — Tel: +50942449024</span>
    </div>
  </div>`
}

function printReceiptBrowser(html) {
  const w = window.open('', '_blank', 'width=340,height=620')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff}@media print{@page{margin:0;size:80mm auto}body{margin:0}}</style>
    </head><body>${html}</body></html>`)
  w.document.close()
  w.onload = () => setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 1000) }, 200)
}

// ─── Printer hook ─────────────────────────────────────────────
function usePrinter() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const name = await connectPrinter()
      setConnected(true)
      toast.success(`✅ ${name} konekte`)
    } catch (e) {
      if (e.name !== 'NotFoundError') toast.error('Pa ka konekte printer.')
    } finally { setConnecting(false) }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  const print = useCallback(async (account, transaction, tenant, type) => {
    if (isPrinterConnected()) {
      setPrinting(true)
      try {
        await printKaneReceipt(account, transaction, tenant, type)
        toast.success('Resi enprime!'); return true
      } catch {
        setConnected(false); toast.error('Erè printer.'); return false
      } finally { setPrinting(false) }
    }
    printReceiptBrowser(buildReceiptHTML(account, transaction, tenant, type))
    return true
  }, [])

  return { connected, connecting, printing, connect, disconnect, print }
}

// ─── UI Atoms ─────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14,
  border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none',
  color: D.text, background: D.input, transition: 'border-color 0.15s',
  boxSizing: 'border-box', fontFamily: 'inherit',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: D.label,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

function StatCard({ label, value, sub, icon, color }) {
  return (
    <div style={{
      background: D.card, borderRadius: 12, padding: '12px 14px',
      border: `1px solid ${D.cardBorder}`, boxShadow: D.shadow,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${color}22`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: D.muted, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
        <p className="ke-stat-val" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

function Spinner({ size = 14, color = '#fff' }) {
  return <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

function Section({ icon, title, children }) {
  return (
    <div style={{ background: D.secBg, border: `1px solid ${D.secBorder}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

function PhotoBox({ label, icon, preview, inputId, onChange, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <label htmlFor={inputId} className="ke-photo-box" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 100, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', position: 'relative',
        border: `2px dashed ${preview ? D.gold : 'rgba(255,255,255,0.10)'}`,
        background: preview ? 'transparent' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.18s',
      }}>
        {preview
          ? <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <>
              <span style={{ fontSize: 24, marginBottom: 5 }}>{icon}</span>
              <span style={{ fontSize: 10, color: D.muted, textAlign: 'center', padding: '0 8px' }}>{hint}</span>
            </>}
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange} />
      </label>
      {preview && <p style={{ fontSize: 10, color: D.green, margin: '3px 0 0', textAlign: 'center', fontWeight: 600 }}>✅ Chwazi</p>}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────
function Modal({ onClose, title, children, width = 540 }) {
  return (
    <div className="ke-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: D.overlay, backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div className="ke-modal ke-sheet" style={{
        background: D.card, border: `1px solid ${D.cardBorder}`,
        borderRadius: '18px 18px 0 0', width: '100%', maxWidth: width,
        maxHeight: '96vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
        animation: 'sheetUp 0.24s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 12px', borderBottom: `1px solid ${D.cardBorder}`,
          position: 'sticky', top: 0, background: D.card, zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: D.muted,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={15} /></button>
        </div>
        <div style={{ padding: '16px 16px 36px' }}>{children}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE KONT
// ═══════════════════════════════════════════════════════════════
function ModalCreate({ onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const prefix = getAccountPrefix(tenant)

  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', nifOrCin: '', phone: '',
    familyRelation: '', familyName: '',
    openingAmount: '', kaneFee: '', lockedAmount: '',
    method: 'cash', reference: '',
  })
  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [photoB64,       setPhotoB64]       = useState(null)
  const [idPhotoB64,     setIdPhotoB64]     = useState(null)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const opening = Number(form.openingAmount || 0)
  const fee     = Number(form.kaneFee     || 0)
  const locked  = Number(form.lockedAmount || 0)
  const balance = opening - fee - locked
  const balOk   = balance >= 0

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = (ev) => {
      const b64 = ev.target.result
      if (type === 'photo')   { setPhotoPreview(b64);   setPhotoB64(b64)   }
      if (type === 'idPhoto') { setIdPhotoPreview(b64); setIdPhotoB64(b64) }
    }
    r.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Obligatwa'
    if (!form.lastName.trim())  e.lastName  = 'Obligatwa'
    if (opening <= 0)           e.opening   = 'Montan dwe > 0'
    if (!balOk)                 e.balance   = 'Frè + Bloke plis ke total'
    setErrors(e); return !Object.keys(e).length
  }

  const mutation = useMutation({
    mutationFn: (d) => kaneAPI.create(d),
    onSuccess: async (res) => {
      const acc = res.data.account
      toast.success(`✅ Kont ${acc.accountNumber} kreye!`)
      await printer.print(acc, { createdAt: new Date(), method: form.method, reference: form.reference }, tenant, 'ouverture')
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan enskripsyon.'),
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      address: form.address || undefined, nifOrCin: form.nifOrCin || undefined,
      phone: form.phone || undefined,
      familyRelation: form.familyRelation || undefined, familyName: form.familyName || undefined,
      openingAmount: opening, kaneFee: fee, lockedAmount: locked,
      method: form.method, reference: form.reference || undefined,
      accountPrefix: prefix,
      photoUrl:   photoB64   || undefined,
      idPhotoUrl: idPhotoB64 || undefined,
    })
  }

  return (
    <Modal onClose={onClose} title={`✚ Nouvo Kont — ${prefix}`} width={580}>
      {/* Prefiks preview */}
      <div style={{ background: D.goldDim, border: `1px solid ${D.gold}30`, borderRadius: 10, padding: '8px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: D.gold, fontWeight: 700 }}>Nimewo kont:</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, color: D.text, fontSize: 13 }}>{prefix}-{new Date().getFullYear()}-XXXXX</span>
        <span style={{ fontSize: 10, color: D.muted }}>(otomatik)</span>
      </div>

      <Section icon="👤" title="Enfòmasyon Titilè">
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Prenon *</label>
            <input className="ke-input" style={{ ...inputStyle, borderColor: errors.firstName ? D.red : undefined }}
              value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Prenon..." />
            {errors.firstName && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.firstName}</p>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Non *</label>
            <input className="ke-input" style={{ ...inputStyle, borderColor: errors.lastName ? D.red : undefined }}
              value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Non..." />
            {errors.lastName && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.lastName}</p>}
          </div>
        </div>
        <div className="ke-form-row" style={{ marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>NIF / CIN</label>
            <input className="ke-input" style={inputStyle} value={form.nifOrCin} onChange={e => set('nifOrCin', e.target.value)} placeholder="001-234-5678" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Telefòn</label>
            <input className="ke-input" style={inputStyle} inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XXXX XXXX" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={labelStyle}>Adrès</label>
          <input className="ke-input" style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." />
        </div>
      </Section>

      <Section icon="📸" title="Foto KYC">
        <div className="ke-photo-grid">
          <PhotoBox label="Foto Kliyan (opsyonèl)" icon="📷" preview={photoPreview}
            inputId="ke-photo" onChange={e => handlePhoto(e, 'photo')} hint="Foto fas kliyan" />
          <PhotoBox label="Foto Kat Idantite" icon="🪪" preview={idPhotoPreview}
            inputId="ke-idphoto" onChange={e => handlePhoto(e, 'idPhoto')} hint="CIN, Paspo, lòt ID" />
        </div>
      </Section>

      <Section icon="👨‍👩‍👧" title="Referans Fanmi">
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Relasyon</label>
            <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.familyRelation} onChange={e => set('familyRelation', e.target.value)}>
              <option value="">— Chwazi —</option>
              {FAMILY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Non Referans</label>
            <input className="ke-input" style={inputStyle} value={form.familyName} onChange={e => set('familyName', e.target.value)} placeholder="Non..." />
          </div>
        </div>
      </Section>

      <Section icon="💰" title="Montan Ouverture">
        <label style={labelStyle}>Montan Total (HTG) *</label>
        <input type="number" min="0" step="0.01" className="ke-input"
          style={{ ...inputStyle, fontSize: 20, fontWeight: 800, textAlign: 'center', color: D.gold, marginBottom: 10, borderColor: errors.opening ? D.red : undefined }}
          value={form.openingAmount} onChange={e => set('openingAmount', e.target.value)}
          placeholder="0.00" onFocus={e => e.target.select()} />
        {errors.opening && <p style={{ fontSize: 10, color: D.red, margin: '-8px 0 8px' }}>{errors.opening}</p>}

        {opening > 0 && (
          <>
            <div className="ke-form-row">
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: `${D.red}cc` }}>Frè Kanè (HTG)</label>
                <input type="number" min="0" step="0.01" className="ke-input"
                  style={{ ...inputStyle, color: D.red, borderColor: `${D.red}40` }}
                  value={form.kaneFee} onChange={e => set('kaneFee', e.target.value)} placeholder="0.00" onFocus={e => e.target.select()} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, color: D.orange }}>Montan Bloke (HTG)</label>
                <input type="number" min="0" step="0.01" className="ke-input"
                  style={{ ...inputStyle, color: D.orange, borderColor: `${D.orange}40` }}
                  value={form.lockedAmount} onChange={e => set('lockedAmount', e.target.value)} placeholder="0.00" onFocus={e => e.target.select()} />
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: 10, borderRadius: 6, overflow: 'hidden', height: 8, background: 'rgba(255,255,255,0.06)', display: 'flex' }}>
              {fee > 0    && <div style={{ width: `${Math.min((fee/opening)*100,100)}%`,    background: D.red,    transition: 'width 0.3s' }} />}
              {locked > 0 && <div style={{ width: `${Math.min((locked/opening)*100,100)}%`, background: D.orange, transition: 'width 0.3s' }} />}
              {balance > 0 && <div style={{ flex: 1, background: D.green }} />}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, fontWeight: 700, flexWrap: 'wrap' }}>
              {fee    > 0 && <span style={{ color: D.red    }}>🔴 Frè: {fmt(fee)}</span>}
              {locked > 0 && <span style={{ color: D.orange }}>🟠 Bloke: {fmt(locked)}</span>}
              <span style={{ color: balOk ? D.green : D.red }}>🟢 Balans: {fmt(balance)} HTG</span>
            </div>
            {errors.balance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: D.redBg, borderRadius: 8, marginTop: 8 }}>
                <AlertCircle size={12} style={{ color: D.red }} />
                <span style={{ fontSize: 11, color: D.red }}>{errors.balance}</span>
              </div>
            )}
          </>
        )}
      </Section>

      <div className="ke-form-row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Metod Peman</label>
          <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.method} onChange={e => set('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Referans</label>
          <input className="ke-input" style={inputStyle} value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="MCash #12345" />
        </div>
      </div>

      {opening > 0 && balOk && (
        <div style={{ background: D.greenBg, border: `1px solid ${D.green}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: D.green, fontWeight: 700 }}>✅ Balans ouverture:</span>
          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: D.green }}>{fmt(balance)} HTG</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="ke-btn" onClick={onClose} style={{
          flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14,
        }}>Anile</button>
        <button className="ke-btn" onClick={handleSubmit} disabled={mutation.isPending || !balOk} style={{
          flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14,
          opacity: mutation.isPending || !balOk ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          {mutation.isPending ? <><Spinner color="#0a1222" /> Ap kreye...</> : <><Printer size={15} /> Kreye + Enprime</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DEPO / RETRÈ
// ═══════════════════════════════════════════════════════════════
function ModalTx({ account, type, onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ amount: '', method: 'cash', reference: '' })
  const amt      = Number(form.amount || 0)
  const isW      = type === 'retrait'
  const color    = isW ? D.red : D.green
  const bal      = Number(account.balance)

  const mutation = useMutation({
    mutationFn: (d) => isW ? kaneAPI.withdraw(account.id, d) : kaneAPI.deposit(account.id, d),
    onSuccess: async (res) => {
      const { transaction } = res.data
      toast.success(`${isW ? 'Retrè' : 'Depo'} ${fmt(transaction.amount)} HTG ✅`)
      await printer.print(account, transaction, tenant, type)
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè tranzaksyon.'),
  })

  const disabled = mutation.isPending || amt <= 0 || (isW && amt > bal)

  return (
    <Modal onClose={onClose} title={`${isW ? '↑ Retrè' : '↓ Depo'} — ${account.accountNumber}`} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Kont info */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px', border: `1px solid ${D.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: D.text, margin: 0 }}>{account.firstName} {account.lastName}</p>
            <p style={{ fontSize: 11, color: D.muted, margin: '2px 0 0', fontFamily: 'monospace' }}>{account.accountNumber}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px' }}>Balans</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: D.green, margin: 0 }}>{fmt(bal)} HTG</p>
          </div>
        </div>

        {/* Montant */}
        <div>
          <label style={{ ...labelStyle, color }}>{isW ? 'Montan Retrè' : 'Montan Depo'} (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize: 24, fontWeight: 800, textAlign: 'center', borderColor: `${color}50`, color }}
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus />
        </div>

        {amt > 0 && (
          <div style={{ background: isW ? D.redBg : D.greenBg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${color}25` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color }}>
              <span>Nouvo balans:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 15 }}>
                {isW && amt > bal
                  ? <span style={{ color: D.red }}>⚠ Ensifizàn!</span>
                  : `${fmt(isW ? bal - amt : bal + amt)} HTG`}
              </span>
            </div>
          </div>
        )}

        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Metod</label>
            <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Referans</label>
            <input className="ke-input" style={inputStyle} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="MCash #..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ke-btn" onClick={onClose} style={{
            flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14,
          }}>Anile</button>
          <button className="ke-btn"
            onClick={() => mutation.mutate({ amount: amt, method: form.method, reference: form.reference || undefined })}
            disabled={disabled}
            style={{
              flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
              background: `linear-gradient(135deg,${color},${color}bb)`,
              color: '#fff', fontWeight: 800, fontSize: 14, opacity: disabled ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            {mutation.isPending ? <Spinner /> : isW ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
            {mutation.isPending ? 'Ap trete...' : `Konfime ${isW ? 'Retrè' : 'Depo'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY
// ═══════════════════════════════════════════════════════════════
function ModalDetail({ accountId, onClose, onDepo, onRetrait, printer }) {
  const { tenant } = useAuthStore()
  const { data: account, isLoading } = useQuery({
    queryKey: ['kane-account', accountId],
    queryFn: () => kaneAPI.getOne(accountId).then(r => r.data.account),
    enabled: !!accountId,
  })

  const TX = {
    ouverture: { color: '#C9A84C', bg: 'rgba(201,168,76,0.10)', label: 'Ouverture', icon: '🏦' },
    depot:     { color: D.green,   bg: D.greenBg,               label: 'Depo',      icon: '↓'  },
    retrait:   { color: D.red,     bg: D.redBg,                 label: 'Retrè',     icon: '↑'  },
  }

  if (isLoading || !account) return (
    <Modal onClose={onClose} title="Detay Kont" width={580}>
      <div style={{ textAlign: 'center', padding: 40, color: D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Spinner color={D.gold} size={18} /> Ap chaje...
      </div>
    </Modal>
  )

  return (
    <Modal onClose={onClose} title={`📋 ${account.accountNumber}`} width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Kat */}
        <div style={{ background: D.goldBtn, borderRadius: 14, padding: '14px 16px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.firstName} {account.lastName}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{account.accountNumber}</p>
            {account.nifOrCin       && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>NIF: {account.nifOrCin}</p>}
            {account.phone          && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>📱 {account.phone}</p>}
            {account.familyRelation && <p style={{ fontSize: 10, opacity: 0.7,  margin: '2px 0 0' }}>👨‍👩‍👧 {account.familyRelation}: {account.familyName || ''}</p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '0 0 2px' }}>BALANS</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, margin: 0 }}>{fmt(account.balance)} HTG</p>
            {Number(account.lockedAmount) > 0 && <p style={{ fontSize: 9, opacity: 0.5, margin: '2px 0 0' }}>🔒 {fmt(account.lockedAmount)} HTG bloke</p>}
          </div>
        </div>

        {/* Foto KYC */}
        {(account.photoUrl || account.idPhotoUrl) && (
          <div style={{ display: 'grid', gridTemplateColumns: account.photoUrl && account.idPhotoUrl ? '1fr 1fr' : '1fr', gap: 10 }}>
            {account.photoUrl   && <div><p style={{ ...labelStyle, marginBottom: 5 }}>Foto Kliyan</p><img src={account.photoUrl}   alt="foto" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10, border: `1px solid ${D.cardBorder}` }} /></div>}
            {account.idPhotoUrl && <div><p style={{ ...labelStyle, marginBottom: 5 }}>Kat Idantite</p><img src={account.idPhotoUrl} alt="id"   style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10, border: `1px solid ${D.cardBorder}` }} /></div>}
          </div>
        )}

        {/* Aksyon */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ke-btn" onClick={onDepo} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${D.green}30`, background: D.greenBg, color: D.green, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ArrowDownCircle size={14} /> Depo
          </button>
          <button className="ke-btn" onClick={onRetrait} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${D.red}30`, background: D.redBg, color: D.red, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ArrowUpCircle size={14} /> Retrè
          </button>
          <button className="ke-btn" onClick={() => printer.print(account, account.transactions?.[0], tenant, 'ouverture')} disabled={printer.printing}
            style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Printer size={14} />
          </button>
        </div>

        {/* Istwa */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: D.muted, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Istwa ({account.transactions?.length || 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
            {!account.transactions?.length
              ? <p style={{ textAlign: 'center', color: D.muted, fontSize: 12, padding: 20 }}>Pa gen tranzaksyon</p>
              : account.transactions.map(tx => {
                  const cfg = TX[tx.type] || TX.ouverture
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}20` }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: cfg.color, flexShrink: 0 }}>
                            {tx.type === 'retrait' ? '-' : '+'}{fmt(tx.amount)} HTG
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fmtDate(tx.createdAt)} • {tx.method}{tx.reference ? ` • ${tx.reference}` : ''}
                        </p>
                      </div>
                      <button className="ke-btn" onClick={() => printer.print(account, tx, tenant, tx.type)} disabled={printer.printing}
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Printer size={11} />
                      </button>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function KaneEpayPage() {
  const qc      = useQueryClient()
  const printer = usePrinter()
  const { tenant } = useAuthStore()

  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const [modal,  setModal]  = useState(null)   // 'create' | 'detail' | 'depot' | 'retrait'
  const [selAcc, setSelAcc] = useState(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const { data: statsData } = useQuery({
    queryKey: ['kane-stats'],
    queryFn: () => kaneAPI.getStats().then(r => r.data.stats),
    refetchInterval: 60000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['kane-accounts', search, page],
    queryFn: () => kaneAPI.getAll({ search: search || undefined, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  })

  const accounts   = listData?.accounts || []
  const total      = listData?.total    || 0
  const totalPages = Math.ceil(total / 15) || 1

  const refresh = () => {
    qc.invalidateQueries(['kane-accounts'])
    qc.invalidateQueries(['kane-stats'])
    if (selAcc) qc.invalidateQueries(['kane-account', selAcc.id])
  }

  const openDetail  = (acc) => { setSelAcc(acc); setModal('detail')  }
  const openDepo    = (acc) => { setSelAcc(acc); setModal('depot')   }
  const openRetrait = (acc) => { setSelAcc(acc); setModal('retrait') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'DM Sans, sans-serif', padding: '14px 14px 80px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div className="ke-header">
        <div>
          <h1 className="ke-header-title" style={{ fontSize: 19, fontWeight: 900, color: D.gold, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <CreditCard size={19} /> Kanè Epay
          </h1>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Kont depo ak retrè</p>
        </div>
        <div className="ke-header-right">
          {/* Printer toggle */}
          <button className="ke-btn"
            onClick={printer.connected ? printer.disconnect : printer.connect}
            disabled={printer.connecting}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '9px 11px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
              color: printer.connected ? D.green : D.muted,
              fontWeight: 700, fontSize: 12,
            }}>
            {printer.connecting
              ? <Spinner size={13} color={D.muted} />
              : printer.connected ? <Bluetooth size={14} /> : <BluetoothOff size={14} />}
            <span className="ke-hide-xs">{printer.connected ? 'Printer' : 'Printer'}</span>
          </button>

          {/* Nouvo kont */}
          <button className="ke-btn" onClick={() => setModal('create')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 15px',
            borderRadius: 12, border: 'none', cursor: 'pointer',
            background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13,
            boxShadow: '0 4px 14px rgba(201,168,76,0.28)', whiteSpace: 'nowrap',
          }}>
            <Plus size={15} /> Nouvo Kont
          </button>
        </div>
      </div>

      {/* ── Stats ranje 1: jeneral ── */}
      <div className="ke-stats-grid">
        <StatCard label="Total Kont"  value={statsData?.totalAccounts  || 0} icon={<Users size={17}/>}    color={D.gold}  />
        <StatCard label="Kont Aktif"  value={statsData?.activeAccounts || 0} icon={<Activity size={17}/>} color={D.green} />
        <StatCard label="Total Balans" value={fmt(statsData?.totalBalance || 0)} sub="HTG" icon={<Wallet size={17}/>} color={D.blue} />
      </div>

      {/* ── Stats ranje 2: jodi a ── */}
      <div className="ke-today-grid">
        <StatCard label="Depo Jodi a"  value={fmt(statsData?.todayDepositAmount  || 0)} sub="HTG" icon={<ArrowDownCircle size={17}/>} color={D.green}  />
        <StatCard label="Retrè Jodi a" value={fmt(statsData?.todayWithdrawAmount || 0)} sub="HTG" icon={<ArrowUpCircle size={17}/>}   color={D.red}    />
        <StatCard label="Tranzaksyon"  value={statsData?.todayTransactions || 0}         sub="jodi a" icon={<TrendingUp size={17}/>}  color={D.orange} />
      </div>

      {/* ── Rechèch ── */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
        <input className="ke-input" style={{ ...inputStyle, paddingLeft: 36 }}
          placeholder="Chèche non, nimewo, NIF..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {/* ── Lis kont ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: D.muted, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Spinner color={D.gold} size={18} /> Ap chaje...
        </div>
      ) : !accounts.length ? (
        <div style={{ textAlign: 'center', color: D.muted, padding: 50, background: D.card, borderRadius: 16, border: `1px dashed ${D.cardBorder}` }}>
          <CreditCard size={34} style={{ opacity: 0.25, margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{search ? 'Pa jwenn rezilta' : 'Pa gen kont Kanè Epay'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map(acc => (
            <div key={acc.id} className="ke-row" onClick={() => openDetail(acc)} style={{
              background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: 14,
              padding: '12px 13px', cursor: 'pointer', boxShadow: D.shadow, transition: 'background 0.15s',
              animation: 'fadeUp 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                  {acc.photoUrl && (
                    <img src={acc.photoUrl} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: `1px solid ${D.cardBorder}` }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p className="ke-acc-num" style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold, fontSize: 11, margin: '0 0 2px' }}>{acc.accountNumber}</p>
                    <p className="ke-acc-name" style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.firstName} {acc.lastName}</p>
                    {acc.phone && <p style={{ fontSize: 11, color: D.muted, margin: '1px 0 0' }}>{acc.phone}</p>}
                    <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0', fontFamily: 'monospace' }}>{fmtDate(acc.createdAt)}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, color: D.green, margin: 0 }}>{fmt(acc.balance)}</p>
                  <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>HTG</p>
                  {Number(acc.lockedAmount) > 0 && <p style={{ fontSize: 10, color: D.orange, margin: '2px 0 0' }}>🔒 {fmt(acc.lockedAmount)}</p>}
                  <p style={{ fontSize: 9, margin: '3px 0 0', fontWeight: 700, color: acc.idPhotoUrl ? D.green : D.orange }}>
                    {acc.idPhotoUrl ? '✅ KYC' : '⚠ KYC'}
                  </p>
                </div>
              </div>

              <div className="ke-acc-row-btns">
                <button className="ke-btn" onClick={e => { e.stopPropagation(); openDepo(acc) }}
                  style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none', background: D.greenBg, color: D.green, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ArrowDownCircle size={13} /> Depo
                </button>
                <button className="ke-btn" onClick={e => { e.stopPropagation(); openRetrait(acc) }}
                  style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none', background: D.redBg, color: D.red, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ArrowUpCircle size={13} /> Retrè
                </button>
                <button className="ke-btn" onClick={e => { e.stopPropagation(); openDetail(acc) }}
                  style={{ padding: '8px 13px', borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Eye size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 2px' }}>
          <span style={{ fontSize: 12, color: D.muted }}>{total} kont total</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="ke-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.text, minWidth: 50, textAlign: 'center' }}>{page} / {totalPages}</span>
            <button className="ke-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'create' && (
        <ModalCreate onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
      {modal === 'detail' && selAcc && (
        <ModalDetail accountId={selAcc.id} onClose={() => setModal(null)}
          onDepo={() => setModal('depot')} onRetrait={() => setModal('retrait')} printer={printer} />
      )}
      {(modal === 'depot' || modal === 'retrait') && selAcc && (
        <ModalTx account={selAcc} type={modal} onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
    </div>
  )
}
