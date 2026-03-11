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
  X, Printer, ChevronLeft, Users, Wallet,
  TrendingUp, Activity, CreditCard, AlertCircle,
  Bluetooth, BluetoothOff, Camera, IdCard,
} from 'lucide-react'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, printKaneReceipt
} from '../../services/printerService'

const kaneAPI = {
  getStats: ()         => api.get('/kane-epay/stats'),
  getAll:   (p)        => api.get('/kane-epay', { params: p }),
  getOne:   (id)       => api.get(`/kane-epay/${id}`),
  create:   (data)     => api.post('/kane-epay', data),
  deposit:  (id, data) => api.post(`/kane-epay/${id}/deposit`, data),
  withdraw: (id, data) => api.post(`/kane-epay/${id}/withdraw`, data),
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '' }
}

// ─────────────────────────────────────────────────────────────
// Jenere prefiks nimewo kont depi non biznis tenant la
// "BlueCore Solutions" → "BS", "Plus Group" → "PG"
// ─────────────────────────────────────────────────────────────
function getAccountPrefix(tenant) {
  const name = tenant?.businessName || tenant?.name || ''
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'KE'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  // 2 premye lèt: premye lèt chak mo (jiska 2 mo)
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

const D = {
  card:       '#0d1b2a',
  cardDk:     '#060f1e',
  cardBorder: 'rgba(201,168,76,0.18)',
  secBg:      'rgba(201,168,76,0.04)',
  secBorder:  'rgba(201,168,76,0.11)',
  overlay:    'rgba(0,0,0,0.88)',
  gold:       '#C9A84C',
  goldDk:     '#8B6914',
  goldBtn:    'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:    'rgba(201,168,76,0.10)',
  green:      '#27ae60', greenBg: 'rgba(39,174,96,0.12)',
  red:        '#C0392B', redBg:   'rgba(192,57,43,0.10)',
  orange:     '#D97706', orangeBg:'rgba(217,119,6,0.10)',
  blue:       '#3B82F6', blueBg:  'rgba(59,130,246,0.10)',
  text:       '#e8eaf0',
  muted:      '#6b7a99',
  label:      'rgba(201,168,76,0.75)',
  input:      '#060f1e',
  shadow:     '0 8px 32px rgba(0,0,0,0.55)',
}

// ─────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes sheetUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  .kane-modal::-webkit-scrollbar{width:3px}
  .kane-modal::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.25);border-radius:2px}
  .kane-modal input::placeholder,.kane-modal textarea::placeholder{color:#2a3a54}
  .kane-modal select option{background:#0d1b2a;color:#e8eaf0}
  .kane-row:hover{background:rgba(201,168,76,0.06)!important;}
  .photo-upload-box:hover{border-color:rgba(201,168,76,0.5)!important;background:rgba(201,168,76,0.05)!important;}

  @media(min-width:600px){
    .kane-sheet{ border-radius:20px!important; margin:20px!important; max-height:88vh!important; }
    .kane-overlay{ align-items:center!important; }
  }
  @media(max-width:480px){
    .kane-header{flex-wrap:wrap!important;gap:8px!important;}
    .kane-header-actions{width:100%!important;justify-content:space-between!important;}
    .kane-btn-new{flex:1!important;justify-content:center!important;}
    .kane-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .kane-stat-card{padding:10px 11px!important;}
    .kane-stat-icon{width:34px!important;height:34px!important;}
    .kane-acc-name{font-size:13px!important;}
    .kane-acc-balance{font-size:14px!important;}
    .kane-sheet{border-radius:18px 18px 0 0!important;}
    .kane-modal-body{padding:14px 15px 28px!important;}
    .kane-modal-title{font-size:13px!important;}
    .kane-form-row{flex-direction:column!important;}
    .kane-tx-amount{font-size:20px!important;}
    .kane-photo-grid{grid-template-columns:1fr!important;}
  }
  @media(max-width:360px){
    .kane-stats{grid-template-columns:1fr!important;}
  }
`

// ─────────────────────────────────────────────────────────────
// PRINTER HOOK
// ─────────────────────────────────────────────────────────────
function usePrinterState() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const name = await connectPrinter()
      setConnected(true)
      toast.success(`✅ Printer konekte: ${name}`)
    } catch (err) {
      if (err.name !== 'NotFoundError') toast.error('Pa ka konekte printer.')
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

function printReceiptBrowser(html) {
  const w = window.open('', '_blank', 'width=340,height=620')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff;font-family:'Courier New',monospace;font-size:10px}
    @media print{@page{margin:0;size:80mm auto}body{margin:0}}</style></head><body>${html}</body></html>`)
  w.document.close()
  w.onload = () => setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 1000) }, 200)
}

function buildReceiptHTML(account, transaction, tenant, type = 'ouverture') {
  const biz  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : ''
  const txLabels = { ouverture:'OUVERTURE KONT', depot:'DEPO / DÉPÔT', retrait:'RETRÈ / RETRAIT' }
  const txColor = type === 'retrait' ? '#dc2626' : '#16a34a'
  const txDate = transaction?.createdAt ? fmtDate(transaction.createdAt) : fmtDate(new Date())

  return `<div style="width:80mm;padding:4mm 3mm;background:#fff;color:#1a1a1a;font-family:'Courier New',monospace;font-size:10px;line-height:1.5">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:5px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- KANÈ EPAY --</div>
      ${tenant?.phone   ? `<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>` : ''}
      ${tenant?.address ? `<div style="font-size:9px;color:#555">${tenant.address}</div>`   : ''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:5px">
      ${txLabels[type] || 'TRANZAKSYON'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">No. Kont:</span><span style="font-weight:800">${account.accountNumber}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Dat:</span><span>${txDate}</span></div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid #ccc;margin-bottom:5px;font-size:9px">
      <div style="font-weight:700">${account.firstName} ${account.lastName}</div>
      ${account.address        ? `<div>${account.address}</div>`                                                    : ''}
      ${account.nifOrCin       ? `<div>NIF/CIN: ${account.nifOrCin}</div>`                                          : ''}
      ${account.phone          ? `<div>Tel: ${account.phone}</div>`                                                  : ''}
      ${account.familyRelation ? `<div>Referans: ${account.familyRelation} — ${account.familyName || ''}</div>`     : ''}
    </div>
    <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
      ${type === 'ouverture' ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Montan ouverture:</span><span style="font-weight:700">${fmt(account.openingAmount)} HTG</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Frè kanè:</span><span style="color:#dc2626;font-weight:600">- ${fmt(account.kaneFee)} HTG</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Montan bloke:</span><span style="color:#d97706;font-weight:600">- ${fmt(account.lockedAmount)} HTG</span></div>
      ` : `<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Balans anvan:</span><span>${fmt(transaction?.balanceBefore)} HTG</span></div>`}
      <div style="border-top:2px solid #111;padding-top:4px;margin-top:3px;display:flex;justify-content:space-between">
        <span style="font-weight:900;font-family:Arial;font-size:12px">${type === 'retrait' ? 'RETRÈ' : type === 'depot' ? 'DEPO' : 'BALANS'}</span>
        <span style="font-family:Arial;font-weight:900;font-size:13px;color:${txColor}">${type === 'ouverture' ? fmt(account.balance) : fmt(transaction?.amount)} HTG</span>
      </div>
      ${type !== 'ouverture' ? `<div style="display:flex;justify-content:space-between;margin-top:3px"><span style="color:#555">Nouvo balans:</span><span style="font-weight:800;color:#16a34a">${fmt(transaction?.balanceAfter)} HTG</span></div>` : ''}
    </div>
    ${transaction?.method ? `<div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Metod:</span><span style="font-weight:600;text-transform:uppercase">${transaction.method}</span></div>
      ${transaction.reference ? `<div style="display:flex;justify-content:space-between"><span style="color:#555">Ref:</span><span>${transaction.reference}</span></div>` : ''}
    </div>` : ''}
    <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
      <div style="font-weight:700;font-size:10px">Mèsi! / Merci!</div>
      <div style="color:#666;font-size:8px;margin-top:2px">PlusGroup — Tel: +50942449024</div>
    </div>
  </div>`
}

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="kane-stat-card" style={{
      background: D.card, borderRadius: 14, padding: '14px 16px',
      border: `1px solid ${D.cardBorder}`, boxShadow: D.shadow,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div className="kane-stat-icon" style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg,${color},${color}CC)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${color}40`,
      }}>
        <span style={{ color: '#fff' }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.muted, margin: '0 0 3px', whiteSpace: 'nowrap' }}>{label}</p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14,
  border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none', fontFamily: 'inherit',
  color: D.text, background: D.input, transition: 'border-color 0.15s', boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: D.label,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const Section = ({ icon, title, children }) => (
  <div style={{ background: D.secBg, border: `1px solid ${D.secBorder}`, borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
    <p style={{ fontSize: 11, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{icon}</span>{title}
    </p>
    {children}
  </div>
)

function Modal({ onClose, children, title, width = 520 }) {
  return (
    <div className="kane-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: D.overlay, backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div className="kane-modal kane-sheet" style={{
        background: D.card,
        border: `1px solid ${D.cardBorder}`,
        borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: width,
        maxHeight: '95vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.75)',
        animation: 'sheetUp 0.26s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px 14px',
          borderBottom: `1px solid ${D.cardBorder}`,
          position: 'sticky', top: 0, background: D.card, zIndex: 1,
        }}>
          <h2 className="kane-modal-title" style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><X size={16} /></button>
        </div>
        <div className="kane-modal-body" style={{ padding: '18px 18px 32px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PHOTO UPLOAD BOX — reutilizab
// ─────────────────────────────────────────────────────────────
function PhotoUploadBox({ label, icon, preview, inputId, onChange, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <label htmlFor={inputId} className="photo-upload-box" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 110, borderRadius: 12, cursor: 'pointer', overflow: 'hidden', position: 'relative',
        border: `2px dashed ${preview ? D.gold : 'rgba(255,255,255,0.12)'}`,
        background: preview ? 'transparent' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.18s',
      }}>
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0,
              transition: 'opacity 0.18s',
            }} className="photo-overlay">
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>Chanje foto</span>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: 28, marginBottom: 6 }}>{icon}</span>
            <span style={{ fontSize: 10, color: D.muted, fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>
              {hint || 'Klike pou chwazi foto'}
            </span>
          </>
        )}
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange} />
      </label>
      {preview && (
        <p style={{ fontSize: 10, color: D.green, margin: '4px 0 0', textAlign: 'center', fontWeight: 600 }}>
          ✅ Foto chwazi
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: NOUVO KONT
// ═══════════════════════════════════════════════════════════════
function ModalCreateAccount({ onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const prefix = getAccountPrefix(tenant)

  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', nifOrCin: '', phone: '',
    familyRelation: '', familyName: '',
    openingAmount: '', kaneFee: '', lockedAmount: '',
    method: 'cash', reference: '',
  })
  const [errors,   setErrors]   = useState({})
  const [focusKey, setFocusKey] = useState(null)

  // Photos
  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [photoB64,       setPhotoB64]       = useState(null)
  const [idPhotoB64,     setIdPhotoB64]     = useState(null)

  const opening = Number(form.openingAmount || 0)
  const fee     = Number(form.kaneFee || 0)
  const locked  = Number(form.lockedAmount || 0)
  const balance = opening - fee - locked
  const isValid = balance >= 0

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const inp = (key, extra = {}) => ({
    ...inputStyle,
    ...(focusKey === key ? { borderColor: D.gold, boxShadow: '0 0 0 2px rgba(201,168,76,0.14)' } : {}),
    ...extra,
    onFocus: () => setFocusKey(key),
    onBlur:  () => setFocusKey(null),
  })

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      if (type === 'photo')   { setPhotoPreview(b64);   setPhotoB64(b64)   }
      if (type === 'idPhoto') { setIdPhotoPreview(b64); setIdPhotoB64(b64) }
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Obligatwa'
    if (!form.lastName.trim())  e.lastName  = 'Obligatwa'
    if (!form.openingAmount || opening <= 0) e.openingAmount = 'Montan dwe plis ke 0'
    if (fee < 0)    e.kaneFee      = 'Negatif pa pèmèt'
    if (locked < 0) e.lockedAmount = 'Negatif pa pèmèt'
    if (!isValid)   e.balance      = 'Frè + Bloke pa ka plis ke total'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: (data) => kaneAPI.create(data),
    onSuccess: async (res) => {
      toast.success(`Kont ${res.data.account.accountNumber} kreye!`)
      await printer.print(
        res.data.account,
        { createdAt: new Date(), method: form.method, reference: form.reference },
        tenant, 'ouverture'
      )
      onSuccess(res.data.account)
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan enskripsyon.')
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      address: form.address.trim() || undefined, nifOrCin: form.nifOrCin.trim() || undefined,
      phone: form.phone.trim() || undefined,
      familyRelation: form.familyRelation || undefined, familyName: form.familyName.trim() || undefined,
      openingAmount: opening, kaneFee: fee, lockedAmount: locked,
      method: form.method, reference: form.reference.trim() || undefined,
      // Prefiks pou backend itilize nan nimewo kont
      accountPrefix: prefix,
      // Foto (base64) — backend dwe sove yo
      photoUrl:   photoB64   || undefined,
      idPhotoUrl: idPhotoB64 || undefined,
    })
  }

  return (
    <Modal onClose={onClose} title={`✚ Nouvo Kont Kanè Epay — ${prefix}`} width={580}>
      {/* Afiche prefiks ki pral itilize */}
      <div style={{ background: D.goldDim, border: `1px solid ${D.gold}30`, borderRadius: 10, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ color: D.gold, fontWeight: 700 }}>Nimewo kont:</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, color: D.text, fontSize: 14 }}>
          {prefix}-{new Date().getFullYear()}-XXXXX
        </span>
        <span style={{ color: D.muted, fontSize: 11 }}>(jenere otomatik)</span>
      </div>

      <Section icon="👤" title="Enfòmasyon Titilè">
        <div className="kane-form-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Prenon *</label>
            <input style={inp('firstName', { borderColor: errors.firstName ? D.red : undefined })}
              value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Fredelyn" />
            {errors.firstName && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.firstName}</p>}
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Non *</label>
            <input style={inp('lastName', { borderColor: errors.lastName ? D.red : undefined })}
              value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Jean" />
            {errors.lastName && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.lastName}</p>}
          </div>
        </div>
        <div className="kane-form-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Nif / CIN</label>
            <input style={inp('nifOrCin')} value={form.nifOrCin} onChange={e => set('nifOrCin', e.target.value)} placeholder="001-234-5678" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Telefòn</label>
            <input style={inp('phone')} inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+509 XXXX XXXX" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={labelStyle}>Adrès</label>
          <input style={inp('address')} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." />
        </div>
      </Section>

      {/* ─── FOTO KYC ─── */}
      <Section icon="📸" title="Foto KYC">
        <div className="kane-photo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <PhotoUploadBox
            label="Foto Kliyan (Opsyonèl)"
            icon="📷"
            preview={photoPreview}
            inputId="kane-photo-upload"
            onChange={e => handlePhoto(e, 'photo')}
            hint="Foto fas kliyan a"
          />
          <PhotoUploadBox
            label="Foto Kat Idantite *"
            icon="🪪"
            preview={idPhotoPreview}
            inputId="kane-id-upload"
            onChange={e => handlePhoto(e, 'idPhoto')}
            hint="CIN, Paspo, oswa lòt ID"
          />
        </div>
        {!idPhotoPreview && (
          <p style={{ fontSize: 10, color: D.orange, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle size={11} /> Foto kat idantite rekòmande pou KYC konplè
          </p>
        )}
      </Section>

      <Section icon="👨‍👩‍👧" title="Referans Fanmi">
        <div className="kane-form-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Relasyon</label>
            <select style={inp('relation', { cursor: 'pointer' })} value={form.familyRelation} onChange={e => set('familyRelation', e.target.value)}>
              <option value="">— Chwazi —</option>
              {FAMILY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Non Referans</label>
            <input style={inp('familyName')} value={form.familyName} onChange={e => set('familyName', e.target.value)} placeholder="Non..." />
          </div>
        </div>
      </Section>

      <Section icon="💰" title="Montan Ouverture">
        <div>
          <label style={labelStyle}>Montan Total Depoze *</label>
          <input type="number" min="0" step="0.01"
            style={inp('openingAmount', { fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold, borderColor: errors.openingAmount ? D.red : undefined })}
            value={form.openingAmount} onChange={e => set('openingAmount', e.target.value)}
            placeholder="0.00" onFocus={e => { setFocusKey('openingAmount'); e.target.select() }} onBlur={() => setFocusKey(null)} />
          {errors.openingAmount && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.openingAmount}</p>}
        </div>
        {opening > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="kane-form-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ ...labelStyle, color: `${D.red}cc` }}>Frè Kanè (HTG)</label>
                <input type="number" min="0" step="0.01"
                  style={inp('kaneFee', { borderColor: `${D.red}50`, color: D.red, fontWeight: 700 })}
                  value={form.kaneFee} onChange={e => set('kaneFee', e.target.value)} placeholder="0.00"
                  onFocus={e => { setFocusKey('kaneFee'); e.target.select() }} onBlur={() => setFocusKey(null)} />
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ ...labelStyle, color: D.orange }}>Montan Bloke (HTG)</label>
                <input type="number" min="0" step="0.01"
                  style={inp('lockedAmount', { borderColor: `${D.orange}50`, color: D.orange, fontWeight: 700 })}
                  value={form.lockedAmount} onChange={e => set('lockedAmount', e.target.value)} placeholder="0.00"
                  onFocus={e => { setFocusKey('lockedAmount'); e.target.select() }} onBlur={() => setFocusKey(null)} />
              </div>
            </div>
            <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: `1px solid ${D.cardBorder}` }}>
              <div style={{ display: 'flex', height: 10 }}>
                {fee > 0     && <div style={{ width: `${(fee/opening)*100}%`,    background: D.red,    transition: 'width 0.3s' }} />}
                {locked > 0  && <div style={{ width: `${(locked/opening)*100}%`, background: D.orange, transition: 'width 0.3s' }} />}
                {balance > 0 && <div style={{ flex: 1, background: D.green,      transition: 'width 0.3s' }} />}
              </div>
              <div style={{ display: 'flex', padding: '7px 10px', gap: 10, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                <span style={{ color: D.red    }}>🔴 Frè: {fmt(fee)}</span>
                <span style={{ color: D.orange }}>🟠 Bloke: {fmt(locked)}</span>
                <span style={{ color: D.green  }}>🟢 Balans: {fmt(balance)} HTG</span>
              </div>
            </div>
            {errors.balance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: D.redBg, borderRadius: 8, marginTop: 8, border: `1px solid ${D.red}30` }}>
                <AlertCircle size={13} style={{ color: D.red, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: D.red, margin: 0, fontWeight: 600 }}>{errors.balance}</p>
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="kane-form-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelStyle}>Metod Peman</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.method} onChange={e => set('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={labelStyle}>Referans (opsyonèl)</label>
          <input style={inputStyle} value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="MCash #12345" />
        </div>
      </div>

      {opening > 0 && isValid && (
        <div style={{ background: D.greenBg, border: `1px solid ${D.green}30`, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: D.green, fontWeight: 700 }}>✅ Balans ouverture:</span>
            <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 900, color: D.green }}>{fmt(balance)} HTG</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '13px', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14,
        }}>Anile</button>
        <button onClick={handleSubmit} disabled={mutation.isPending || !isValid} style={{
          flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14,
          opacity: mutation.isPending || !isValid ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          boxShadow: '0 4px 16px rgba(201,168,76,0.28)',
        }}>
          {mutation.isPending
            ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Ap kreye...</>
            : <><Printer size={15} /> Kreye + Enprime Resi</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DEPO / RETRÈ
// ═══════════════════════════════════════════════════════════════
function ModalTransaction({ account, type, onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ amount: '', method: 'cash', reference: '' })
  const amt       = Number(form.amount || 0)
  const isWithdraw= type === 'retrait'
  const color     = isWithdraw ? D.red : D.green
  const balance   = Number(account.balance)

  const mutation = useMutation({
    mutationFn: (data) => isWithdraw ? kaneAPI.withdraw(account.id, data) : kaneAPI.deposit(account.id, data),
    onSuccess: async (res) => {
      const { transaction } = res.data
      toast.success(`${isWithdraw ? 'Retrè' : 'Depo'} ${fmt(transaction.amount)} HTG anrejistre!`)
      await printer.print(account, transaction, tenant, type)
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè tranzaksyon.')
  })

  return (
    <Modal onClose={onClose} title={`${isWithdraw ? '↑ Retrè' : '↓ Depo'} — ${account.accountNumber}`} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px', border: `1px solid ${D.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.firstName} {account.lastName}</p>
            <p style={{ fontSize: 11, color: D.muted, margin: '2px 0 0', fontFamily: 'monospace' }}>{account.accountNumber}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px', fontWeight: 700 }}>Balans</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: D.green, margin: 0 }}>{fmt(balance)} HTG</p>
          </div>
        </div>

        <div>
          <label style={{ ...labelStyle, color }}>{isWithdraw ? 'Montan Retrè' : 'Montan Depo'} (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="kane-tx-amount"
            style={{ ...inputStyle, fontSize: 26, fontWeight: 800, textAlign: 'center', borderColor: `${color}60`, color }}
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus />
        </div>

        {amt > 0 && (
          <div style={{ background: isWithdraw ? D.redBg : D.greenBg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${color}25` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color }}>
              <span>Nouvo balans:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 15 }}>
                {isWithdraw
                  ? amt > balance
                    ? <span style={{ color: D.red }}>⚠ Ensifizàn!</span>
                    : `${fmt(balance - amt)} HTG`
                  : `${fmt(balance + amt)} HTG`}
              </span>
            </div>
          </div>
        )}

        <div className="kane-form-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 130px' }}>
            <label style={labelStyle}>Metod</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label style={labelStyle}>Referans</label>
            <input style={inputStyle} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="MCash #..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '13px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14,
          }}>Anile</button>
          <button
            onClick={() => mutation.mutate({ amount: amt, method: form.method, reference: form.reference || undefined })}
            disabled={mutation.isPending || amt <= 0 || (isWithdraw && amt > balance)}
            style={{
              flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg,${color},${color}CC)`,
              color: '#fff', fontWeight: 800, fontSize: 14,
              opacity: mutation.isPending || amt <= 0 || (isWithdraw && amt > balance) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            {mutation.isPending
              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              : isWithdraw ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
            {mutation.isPending ? 'Ap trete...' : `Konfime ${isWithdraw ? 'Retrè' : 'Depo'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY KONT
// ═══════════════════════════════════════════════════════════════
function ModalDetail({ accountId, onClose, onDepo, onRetrait, printer }) {
  const { tenant } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['kane-account', accountId],
    queryFn: () => kaneAPI.getOne(accountId).then(r => r.data.account),
    enabled: !!accountId,
  })

  if (isLoading || !data) return (
    <Modal onClose={onClose} title="Detay Kont" width={580}>
      <div style={{ textAlign: 'center', padding: 40, color: D.muted }}>Ap chaje...</div>
    </Modal>
  )

  const TX_CONFIG = {
    ouverture: { color: D.gold,  bg: D.goldDim, label: 'Ouverture', icon: '🏦' },
    depot:     { color: D.green, bg: D.greenBg, label: 'Depo',      icon: '↓'  },
    retrait:   { color: D.red,   bg: D.redBg,   label: 'Retrè',     icon: '↑'  },
  }

  return (
    <Modal onClose={onClose} title={`📋 ${data.accountNumber}`} width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Kat kont */}
        <div style={{
          background: D.goldBtn, borderRadius: 14, padding: '14px 16px', color: '#0a1222',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.firstName} {data.lastName}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{data.accountNumber}</p>
            {data.nifOrCin       && <p style={{ fontSize: 10, opacity: 0.6, margin: '2px 0 0' }}>NIF: {data.nifOrCin}</p>}
            {data.phone          && <p style={{ fontSize: 10, opacity: 0.6, margin: '2px 0 0' }}>📱 {data.phone}</p>}
            {data.familyRelation && <p style={{ fontSize: 10, opacity: 0.7, margin: '2px 0 0' }}>👨‍👩‍👧 {data.familyRelation}: {data.familyName || ''}</p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '0 0 2px', textTransform: 'uppercase' }}>Balans</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, margin: 0 }}>{fmt(data.balance)} HTG</p>
            {Number(data.lockedAmount) > 0 && <p style={{ fontSize: 9, opacity: 0.5, margin: '2px 0 0' }}>Bloke: {fmt(data.lockedAmount)} HTG</p>}
          </div>
        </div>

        {/* Foto KYC si disponib */}
        {(data.photoUrl || data.idPhotoUrl) && (
          <div style={{ display: 'grid', gridTemplateColumns: data.photoUrl && data.idPhotoUrl ? '1fr 1fr' : '1fr', gap: 10 }}>
            {data.photoUrl && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 6 }}>Foto Kliyan</p>
                <img src={data.photoUrl} alt="Foto kliyan" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10, border: `1px solid ${D.cardBorder}` }} />
              </div>
            )}
            {data.idPhotoUrl && (
              <div>
                <p style={{ ...labelStyle, marginBottom: 6 }}>Kat Idantite</p>
                <img src={data.idPhotoUrl} alt="Kat idantite" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10, border: `1px solid ${D.cardBorder}` }} />
              </div>
            )}
          </div>
        )}

        {/* Bouton aksyon */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onDepo} style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: `1px solid ${D.green}30`, cursor: 'pointer', background: D.greenBg, color: D.green, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ArrowDownCircle size={15} /> Depo
          </button>
          <button onClick={onRetrait} style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: `1px solid ${D.red}30`, cursor: 'pointer', background: D.redBg, color: D.red, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ArrowUpCircle size={15} /> Retrè
          </button>
          <button
            onClick={() => printer.print(data, data.transactions?.[0], tenant, 'ouverture')}
            disabled={printer.printing}
            style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Printer size={14} />
          </button>
        </div>

        {/* Istwa tranzaksyon */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.muted, margin: '0 0 8px' }}>
            Istwa ({data.transactions?.length || 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {!data.transactions?.length
              ? <p style={{ textAlign: 'center', color: D.muted, fontSize: 12, padding: 16 }}>Pa gen tranzaksyon</p>
              : data.transactions.map(tx => {
                  const cfg = TX_CONFIG[tx.type] || TX_CONFIG.ouverture
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}20` }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: cfg.color, flexShrink: 0 }}>
                            {tx.type === 'retrait' ? '-' : '+'}{fmt(tx.amount)} HTG
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: D.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fmtDate(tx.createdAt)} • {tx.method}
                          {tx.reference && ` • ${tx.reference}`}
                        </div>
                      </div>
                      <button
                        onClick={() => printer.print(data, tx, tenant, tx.type)}
                        disabled={printer.printing}
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.05)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
  const printer = usePrinterState()
  const { tenant } = useAuthStore()

  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const [modal,  setModal]  = useState(null)
  const [selAcc, setSelAcc] = useState(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = GLOBAL_STYLES
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
  const totalPages = Math.ceil(total / 15)

  const refresh = () => {
    qc.invalidateQueries(['kane-accounts'])
    qc.invalidateQueries(['kane-stats'])
    if (selAcc) qc.invalidateQueries(['kane-account', selAcc?.id])
  }

  const openDetail  = (acc) => { setSelAcc(acc); setModal('detail')  }
  const openDepo    = (acc) => { setSelAcc(acc); setModal('depot')   }
  const openRetrait = (acc) => { setSelAcc(acc); setModal('retrait') }

  // Stats kalkile
  const todayDepo    = statsData?.todayDeposits    || statsData?.todayDepositAmount   || 0
  const todayRetrait = statsData?.todayWithdrawals || statsData?.todayWithdrawAmount  || 0
  const todayCount   = statsData?.todayTransactions || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'DM Sans, sans-serif', padding: '16px', paddingBottom: 60 }}>

      {/* Header */}
      <div className="kane-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: D.gold, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={20} /> Kanè Epay
          </h1>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Kont depo ak retrè</p>
        </div>
        <div className="kane-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={printer.connected ? printer.disconnect : printer.connect}
            disabled={printer.connecting}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
              color: printer.connected ? D.green : D.muted,
              fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
            }}>
            {printer.connecting
              ? <span style={{ width: 13, height: 13, border: `2px solid ${D.muted}40`, borderTopColor: D.muted, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              : printer.connected ? <Bluetooth size={14} /> : <BluetoothOff size={14} />}
            <span>{printer.connected ? 'OK' : 'Printer'}</span>
          </button>

          <button className="kane-btn-new" onClick={() => setModal('create')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13,
            boxShadow: '0 4px 16px rgba(201,168,76,0.28)', whiteSpace: 'nowrap',
          }}>
            <Plus size={15} /> Nouvo Kont
          </button>
        </div>
      </div>

      {/* ─── STATS — 6 kart ─── */}
      <div className="kane-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {/* Ranje 1: Rezime jeneral */}
        <StatCard
          label="Total Kont"
          value={statsData?.totalAccounts || 0}
          icon={<Users size={18}/>}
          color={D.gold}
        />
        <StatCard
          label="Kont Aktif"
          value={statsData?.activeAccounts || 0}
          icon={<Activity size={18}/>}
          color={D.green}
        />
        <StatCard
          label="Total Balans"
          value={`${fmt(statsData?.totalBalance || 0)}`}
          sub="HTG"
          icon={<Wallet size={18}/>}
          color="#3B82F6"
        />
      </div>

      {/* Ranje 2: Aktivite jodi a */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <StatCard
          label="Depo Jodi a"
          value={`${fmt(todayDepo)}`}
          sub="HTG"
          icon={<ArrowDownCircle size={18}/>}
          color={D.green}
        />
        <StatCard
          label="Retrè Jodi a"
          value={`${fmt(todayRetrait)}`}
          sub="HTG"
          icon={<ArrowUpCircle size={18}/>}
          color={D.red}
        />
        <StatCard
          label="Tranzaksyon"
          value={todayCount}
          sub="jodi a"
          icon={<TrendingUp size={18}/>}
          color={D.orange}
        />
      </div>

      {/* Rechèch */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
        <input
          style={{ ...inputStyle, paddingLeft: 36 }}
          placeholder="Chèche non, nimewo, NIF..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Lis kont */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: D.muted, padding: 40 }}>Ap chaje...</div>
      ) : !accounts.length ? (
        <div style={{ textAlign: 'center', color: D.muted, padding: 50, background: D.card, borderRadius: 16, border: `1px dashed ${D.cardBorder}` }}>
          <CreditCard size={36} style={{ opacity: 0.3, marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{search ? 'Pa jwenn rezilta' : 'Pa gen kont Kanè Epay'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {accounts.map(acc => (
              <div key={acc.id} className="kane-row" onClick={() => openDetail(acc)}
                style={{
                  background: D.card, border: `1px solid ${D.cardBorder}`,
                  borderRadius: 14, padding: '13px 14px', cursor: 'pointer',
                  boxShadow: D.shadow, transition: 'background 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Foto miniatiure si disponib */}
                    {acc.photoUrl && (
                      <img src={acc.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${D.cardBorder}` }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold, fontSize: 11, marginBottom: 3 }}>{acc.accountNumber}</div>
                      <div className="kane-acc-name" style={{ fontSize: 14, fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.firstName} {acc.lastName}
                      </div>
                      {acc.phone && <div style={{ fontSize: 11, color: D.muted, marginTop: 1 }}>{acc.phone}</div>}
                      <div style={{ fontSize: 10, color: D.muted, marginTop: 2, fontFamily: 'monospace' }}>{fmtDate(acc.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="kane-acc-balance" style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: D.green }}>{fmt(acc.balance)}</div>
                    <div style={{ fontSize: 10, color: D.muted }}>HTG</div>
                    {Number(acc.lockedAmount) > 0 && <div style={{ fontSize: 10, color: D.orange, marginTop: 2 }}>🔒 {fmt(acc.lockedAmount)}</div>}
                    {/* Badge KYC */}
                    {acc.idPhotoUrl
                      ? <div style={{ fontSize: 9, color: D.green, marginTop: 3, fontWeight: 700 }}>✅ KYC</div>
                      : <div style={{ fontSize: 9, color: D.orange, marginTop: 3, fontWeight: 700 }}>⚠ KYC</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: `1px solid ${D.cardBorder}`, paddingTop: 10 }}>
                  <button onClick={e => { e.stopPropagation(); openDepo(acc) }}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: D.greenBg, color: D.green, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <ArrowDownCircle size={13} /> Depo
                  </button>
                  <button onClick={e => { e.stopPropagation(); openRetrait(acc) }}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: D.redBg, color: D.red, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <ArrowUpCircle size={13} /> Retrè
                  </button>
                  <button onClick={e => { e.stopPropagation(); openDetail(acc) }}
                    style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px' }}>
              <span style={{ fontSize: 12, color: D.muted }}>{total} kont</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, color: D.text, fontWeight: 700, padding: '0 6px' }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(180deg)' }}>
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      {modal === 'create' && (
        <ModalCreateAccount onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
      {modal === 'detail' && selAcc && (
        <ModalDetail accountId={selAcc.id} onClose={() => setModal(null)}
          onDepo={() => setModal('depot')} onRetrait={() => setModal('retrait')}
          printer={printer} />
      )}
      {modal === 'depot' && selAcc && (
        <ModalTransaction account={selAcc} type="depot" onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
      {modal === 'retrait' && selAcc && (
        <ModalTransaction account={selAcc} type="retrait" onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
    </div>
  )
}
