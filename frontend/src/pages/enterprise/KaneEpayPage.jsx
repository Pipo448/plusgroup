// src/pages/enterprise/KaneEpayPage.jsx
import { useState, useRef } from 'react'
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
} from 'lucide-react'

// ── API calls ─────────────────────────────────────────────────
const kaneAPI = {
  getStats:    ()           => api.get('/kane-epay/stats'),
  getAll:      (p)          => api.get('/kane-epay', { params: p }),
  getOne:      (id)         => api.get(`/kane-epay/${id}`),
  create:      (data)       => api.post('/kane-epay', data),
  deposit:     (id, data)   => api.post(`/kane-epay/${id}/deposit`, data),
  withdraw:    (id, data)   => api.post(`/kane-epay/${id}/withdraw`, data),
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '' }
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

// ── Design tokens — DARK THEME (menm ak Create Branch) ────────
const D = {
  // Dark backgrounds
  card:     '#0d1b2a',
  cardDk:   '#060f1e',
  cardBorder:'rgba(201,168,76,0.18)',
  secBg:    'rgba(201,168,76,0.04)',
  secBorder:'rgba(201,168,76,0.11)',
  overlay:  'rgba(0,0,0,0.88)',

  // Accent
  gold:    '#C9A84C',
  goldDk:  '#8B6914',
  goldBtn: 'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim: 'rgba(201,168,76,0.10)',

  // Status
  green:   '#27ae60', greenBg: 'rgba(39,174,96,0.12)',
  red:     '#C0392B', redBg:   'rgba(192,57,43,0.10)',
  orange:  '#D97706', orangeBg:'rgba(217,119,6,0.10)',
  blue:    '#3B82F6', blueDim: 'rgba(59,130,246,0.10)',

  // Text
  text:    '#e8eaf0',
  muted:   '#6b7a99',
  label:   'rgba(201,168,76,0.75)',

  // Input
  input:       '#060f1e',
  inputBorder: 'rgba(255,255,255,0.09)',

  shadow: '0 8px 32px rgba(0,0,0,0.55)',
}

// ── Enprime resi ──────────────────────────────────────────────
function printReceipt(html, title = 'Resi') {
  const w = window.open('', '_blank', 'width=340,height=620')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin:0; padding:0; background:#fff;
             font-family:'Courier New',monospace; font-size:10px; }
      @media print { @page { margin:0; size:80mm auto; } body { margin:0; } }
    </style>
  </head><body>${html}</body></html>`)
  w.document.close()
  w.onload = () => { setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 1000) }, 200) }
}

function buildReceiptHTML(account, transaction, tenant, type = 'ouverture') {
  const biz  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo = tenant?.logoUrl ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>` : ''
  const txTypeLabel = type === 'ouverture' ? 'OUVERTURE KONT' : type === 'depot' ? 'DEPO / DÉPÔT' : 'RETRÈ / RETRAIT'
  const txColor     = type === 'retrait' ? '#dc2626' : '#16a34a'

  return `
  <div style="width:80mm;padding:4mm 3mm;background:#fff;color:#1a1a1a;font-family:'Courier New',monospace;font-size:10px;line-height:1.5">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:5px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      ${tenant?.phone   ? `<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>` : ''}
      ${tenant?.address ? `<div style="font-size:9px;color:#555">${tenant.address}</div>` : ''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;letter-spacing:1px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:5px">
      KANÈ EPAY — ${txTypeLabel}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between">
        <span style="color:#555">No. Kont:</span>
        <span style="font-weight:800;font-family:Arial;font-size:11px">${account.accountNumber}</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#555">Dat:</span>
        <span>${fmtDate(transaction?.createdAt || new Date())}</span>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid #ccc;margin-bottom:5px;font-size:9px">
      <div style="font-weight:700;font-size:10px">${account.firstName} ${account.lastName}</div>
      ${account.address  ? `<div>${account.address}</div>` : ''}
      ${account.nifOrCin ? `<div>NIF/CIN: ${account.nifOrCin}</div>` : ''}
      ${account.phone    ? `<div>Tel: ${account.phone}</div>` : ''}
      ${account.familyRelation ? `<div>Referans: ${account.familyRelation} — ${account.familyName || ''}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
      ${type === 'ouverture' ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="color:#555">Montan ouverture:</span>
          <span style="font-weight:700">${fmt(account.openingAmount)} HTG</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="color:#555">Frè kanè:</span>
          <span style="color:#dc2626;font-weight:600">- ${fmt(account.kaneFee)} HTG</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="color:#555">Montan bloke:</span>
          <span style="color:#d97706;font-weight:600">- ${fmt(account.lockedAmount)} HTG</span>
        </div>
      ` : `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="color:#555">Balans anvan:</span>
          <span>${fmt(transaction?.balanceBefore)} HTG</span>
        </div>
      `}
      <div style="border-top:2px solid #111;padding-top:4px;margin-top:3px;display:flex;justify-content:space-between">
        <span style="font-weight:900;font-family:Arial;font-size:12px">${type === 'retrait' ? 'RETRÈ' : type === 'depot' ? 'DEPO' : 'BALANS'}</span>
        <span style="font-family:Arial;font-weight:900;font-size:13px;color:${txColor}">
          ${type === 'ouverture' ? fmt(account.balance) : fmt(transaction?.amount)} HTG
        </span>
      </div>
      ${type !== 'ouverture' ? `
        <div style="display:flex;justify-content:space-between;margin-top:3px">
          <span style="color:#555">Nouvo balans:</span>
          <span style="font-weight:800;color:#16a34a">${fmt(transaction?.balanceAfter)} HTG</span>
        </div>
      ` : ''}
    </div>
    ${transaction?.method ? `
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between">
        <span style="color:#555">Metod:</span>
        <span style="font-weight:600;text-transform:uppercase">${transaction.method}</span>
      </div>
      ${transaction.reference ? `<div style="display:flex;justify-content:space-between"><span style="color:#555">Ref:</span><span>${transaction.reference}</span></div>` : ''}
    </div>` : ''}
    <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
      <div style="font-weight:700;font-size:10px">Mèsi! / Merci!</div>
      <div style="color:#666;font-size:8px;margin-top:2px">PLUS GROUP — Kanè Epay</div>
      <div style="color:#999;font-size:8px;font-family:monospace">${account.accountNumber}</div>
    </div>
  </div>`
}

// ── StatCard ──────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: D.card, borderRadius: 16, padding: '18px 20px',
      border: `1px solid ${D.cardBorder}`, boxShadow: D.shadow,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `linear-gradient(135deg,${color},${color}CC)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 14px ${color}40`,
      }}>
        <span style={{ color: '#fff' }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: D.muted, margin: '0 0 3px' }}>{label}</p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: D.text, margin: 0 }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Modal wrapper — DARK ──────────────────────────────────────
function Modal({ onClose, children, title, width = 520 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: D.overlay, backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        .dk-modal::-webkit-scrollbar{width:3px}
        .dk-modal::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.25);border-radius:2px}
        .dk-modal input::placeholder,.dk-modal textarea::placeholder{color:#2a3a54}
        .dk-modal select option{background:#0d1b2a;color:#e8eaf0}
      `}</style>
      <div className="dk-modal" style={{
        background: D.card,
        border: `1px solid ${D.cardBorder}`,
        borderRadius: 20, width: '100%', maxWidth: width,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 28px 80px rgba(0,0,0,0.75)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: `1px solid ${D.cardBorder}`,
          position: 'sticky', top: 0,
          background: D.card,
          zIndex: 1, borderRadius: '20px 20px 0 0',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={16} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Input styles — DARK ───────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
  border: `1.5px solid ${D.inputBorder}`, outline: 'none', fontFamily: 'inherit',
  color: D.text, background: D.input,
  transition: 'border-color 0.15s', boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: D.label,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

// ── Section wrapper — DARK ────────────────────────────────────
const Section = ({ icon, title, children }) => (
  <div style={{
    background: D.secBg, border: `1px solid ${D.secBorder}`,
    borderRadius: 12, padding: '14px 16px',
  }}>
    <p style={{ fontSize: 11, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{icon}</span>{title}
    </p>
    {children}
  </div>
)

// ═══════════════════════════════════════════════════════════════
// MODAL: ENSKRIPSYON NOUVO KONT
// ═══════════════════════════════════════════════════════════════
function ModalCreateAccount({ onClose, onSuccess }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', nifOrCin: '', phone: '',
    familyRelation: '', familyName: '',
    openingAmount: '', kaneFee: '', lockedAmount: '',
    method: 'cash', reference: '',
  })
  const [errors, setErrors] = useState({})
  const [focusKey, setFocusKey] = useState(null)

  const opening = Number(form.openingAmount || 0)
  const fee     = Number(form.kaneFee       || 0)
  const locked  = Number(form.lockedAmount  || 0)
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
    onSuccess: (res) => {
      toast.success(`Kont ${res.data.account.accountNumber} kreye!`)
      const html = buildReceiptHTML(
        res.data.account,
        { createdAt: new Date(), method: form.method, reference: form.reference },
        tenant, 'ouverture'
      )
      printReceipt(html, `Enskripsyon — ${res.data.account.accountNumber}`)
      onSuccess(res.data.account)
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan enskripsyon.')
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      firstName:     form.firstName.trim(),
      lastName:      form.lastName.trim(),
      address:       form.address.trim()       || undefined,
      nifOrCin:      form.nifOrCin.trim()      || undefined,
      phone:         form.phone.trim()         || undefined,
      familyRelation:form.familyRelation       || undefined,
      familyName:    form.familyName.trim()    || undefined,
      openingAmount: opening,
      kaneFee:       fee,
      lockedAmount:  locked,
      method:        form.method,
      reference:     form.reference.trim()     || undefined,
    })
  }

  return (
    <Modal onClose={onClose} title="✚ Nouvo Kont Kanè Epay" width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Enfòmasyon titilè ── */}
        <Section icon="👤" title="Enfòmasyon Titilè">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Prenon *</label>
              <input style={inp('firstName', { borderColor: errors.firstName ? D.red : undefined })}
                value={form.firstName} onChange={e => set('firstName', e.target.value)}
                placeholder="Fredelyn" />
              {errors.firstName && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.firstName}</p>}
            </div>
            <div>
              <label style={labelStyle}>Non *</label>
              <input style={inp('lastName', { borderColor: errors.lastName ? D.red : undefined })}
                value={form.lastName} onChange={e => set('lastName', e.target.value)}
                placeholder="Jean" />
              {errors.lastName && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.lastName}</p>}
            </div>
            <div>
              <label style={labelStyle}>Nif / CIN</label>
              <input style={inp('nifOrCin')} value={form.nifOrCin}
                onChange={e => set('nifOrCin', e.target.value)} placeholder="Ex: 001-234-5678" />
            </div>
            <div>
              <label style={labelStyle}>Telefòn</label>
              <input style={inp('phone')} value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="+509 XXXX XXXX" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Adrès</label>
              <input style={inp('address')} value={form.address}
                onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." />
            </div>
          </div>
        </Section>

        {/* ── Referans Fanmi ── */}
        <Section icon="👨‍👩‍👧" title="Referans Fanmi">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Relasyon</label>
              <select style={inp('relation', { cursor: 'pointer' })}
                value={form.familyRelation} onChange={e => set('familyRelation', e.target.value)}>
                <option value="">— Chwazi relasyon —</option>
                {FAMILY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Non Referans</label>
              <input style={inp('familyName')} value={form.familyName}
                onChange={e => set('familyName', e.target.value)}
                placeholder="Non referans lan..." />
            </div>
          </div>
        </Section>

        {/* ── Finansye ── */}
        <Section icon="💰" title="Montan Ouverture">
          <div style={{ width: '100%' }}>
            <label style={labelStyle}>Montan Total Kliyan Depoze *</label>
            <input type="number" min="0" step="0.01"
              style={inp('openingAmount', {
                fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold,
                borderColor: errors.openingAmount ? D.red : undefined,
              })}
              value={form.openingAmount} onChange={e => set('openingAmount', e.target.value)}
              placeholder="0.00" onFocus={e => { setFocusKey('openingAmount'); e.target.select() }}
              onBlur={() => setFocusKey(null)} />
            {errors.openingAmount && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.openingAmount}</p>}
          </div>

          {opening > 0 && (
            <div style={{ marginTop: 14, width: '100%' }}>
              <p style={{ fontSize: 11, color: D.muted, margin: '0 0 10px', fontWeight: 600 }}>
                Ajiste distribisyon {fmt(opening)} HTG a:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, color: `${D.red}cc` }}>Frè Kanè (HTG)</label>
                  <input type="number" min="0" step="0.01" max={opening}
                    style={inp('kaneFee', { borderColor: `${D.red}50`, color: D.red, fontWeight: 700 })}
                    value={form.kaneFee} onChange={e => set('kaneFee', e.target.value)}
                    placeholder="0.00" onFocus={e => { setFocusKey('kaneFee'); e.target.select() }}
                    onBlur={() => setFocusKey(null)} />
                  {errors.kaneFee && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.kaneFee}</p>}
                </div>
                <div>
                  <label style={{ ...labelStyle, color: D.orange }}>Montan Bloke (HTG)</label>
                  <input type="number" min="0" step="0.01" max={opening - fee}
                    style={inp('lockedAmount', { borderColor: `${D.orange}50`, color: D.orange, fontWeight: 700 })}
                    value={form.lockedAmount} onChange={e => set('lockedAmount', e.target.value)}
                    placeholder="0.00" onFocus={e => { setFocusKey('lockedAmount'); e.target.select() }}
                    onBlur={() => setFocusKey(null)} />
                </div>
              </div>

              {/* Vizializasyon balans */}
              <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: `1px solid ${D.cardBorder}` }}>
                <div style={{ display: 'flex', height: 10 }}>
                  {fee > 0    && <div style={{ width:`${(fee/opening)*100}%`,    background: D.red,    transition:'width 0.3s' }} />}
                  {locked > 0 && <div style={{ width:`${(locked/opening)*100}%`, background: D.orange, transition:'width 0.3s' }} />}
                  {balance > 0 && <div style={{ flex: 1, background: D.green,   transition:'width 0.3s' }} />}
                </div>
                <div style={{ display:'flex', padding:'8px 12px', gap:16, fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.03)', flexWrap:'wrap' }}>
                  <span style={{ color: D.red    }}>🔴 Frè: {fmt(fee)} HTG</span>
                  <span style={{ color: D.orange }}>🟠 Bloke: {fmt(locked)} HTG</span>
                  <span style={{ color: D.green  }}>🟢 Disponib: {fmt(balance)} HTG</span>
                </div>
              </div>
              {errors.balance && (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background: D.redBg, borderRadius:8, marginTop:8 }}>
                  <AlertCircle size={13} style={{ color: D.red, flexShrink:0 }} />
                  <p style={{ fontSize:11, color: D.red, margin:0, fontWeight:600 }}>{errors.balance}</p>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Peman ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Metod Peman</label>
            <select style={inp('method', { cursor: 'pointer' })}
              value={form.method} onChange={e => set('method', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Referans (opsyonèl)</label>
            <input style={inp('reference')} value={form.reference}
              onChange={e => set('reference', e.target.value)} placeholder="MCash #12345" />
          </div>
        </div>

        {/* ── Rezime final ── */}
        {opening > 0 && isValid && (
          <div style={{ background: D.greenBg, border:`1px solid ${D.green}30`, borderRadius:12, padding:'12px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color: D.green, fontWeight:700 }}>✅ Balans ouverture:</span>
              <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:900, color: D.green }}>{fmt(balance)} HTG</span>
            </div>
          </div>
        )}

        {/* ── Bouton ── */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
          <button onClick={onClose} style={{
            padding:'10px 20px', borderRadius:10,
            border:`1px solid rgba(255,255,255,0.1)`,
            background:'transparent', color: D.muted,
            cursor:'pointer', fontWeight:700, fontSize:13,
          }}>Anile</button>
          <button onClick={handleSubmit} disabled={mutation.isPending || !isValid} style={{
            padding:'10px 24px', borderRadius:10, border:'none', cursor:'pointer',
            background: D.goldBtn,
            color:'#0a1222', fontWeight:800, fontSize:13,
            opacity: mutation.isPending || !isValid ? 0.6 : 1,
            display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 4px 16px rgba(201,168,76,0.28)',
          }}>
            {mutation.isPending
              ? <><span style={{ width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#0a1222', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> Ap kreye...</>
              : <><Printer size={14} /> Kreye + Enprime Resi</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DEPO / RETRÈ
// ═══════════════════════════════════════════════════════════════
function ModalTransaction({ account, type, onClose, onSuccess }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' })
  const amt = Number(form.amount || 0)
  const isWithdraw = type === 'retrait'
  const color   = isWithdraw ? D.red : D.green
  const balance = Number(account.balance)

  const mutation = useMutation({
    mutationFn: (data) => isWithdraw
      ? kaneAPI.withdraw(account.id, data)
      : kaneAPI.deposit(account.id, data),
    onSuccess: (res) => {
      const { transaction } = res.data
      toast.success(`${isWithdraw ? 'Retrè' : 'Depo'} ${fmt(transaction.amount)} HTG anrejistre!`)
      const html = buildReceiptHTML(account, transaction, tenant, type)
      printReceipt(html, `${isWithdraw ? 'Retrè' : 'Depo'} — ${account.accountNumber}`)
      onSuccess()
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè tranzaksyon.')
  })

  return (
    <Modal onClose={onClose} title={`${isWithdraw ? '↑ Retrè' : '↓ Depo'} — ${account.accountNumber}`} width={460}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Info kont */}
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px 16px', border:`1px solid ${D.cardBorder}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color: D.text, margin:0 }}>{account.firstName} {account.lastName}</p>
            <p style={{ fontSize:11, color: D.muted, margin:'2px 0 0', fontFamily:'monospace' }}>{account.accountNumber}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, color: D.muted, margin:'0 0 2px', textTransform:'uppercase', fontWeight:700 }}>Balans</p>
            <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color: D.green, margin:0 }}>{fmt(balance)} HTG</p>
          </div>
        </div>

        {/* Montan */}
        <div>
          <label style={{ ...labelStyle, color }}>{isWithdraw ? 'Montan Retrè' : 'Montan Depo'} (HTG) *</label>
          <input type="number" min="0.01" step="0.01"
            style={{ ...inputStyle, fontSize:24, fontWeight:800, textAlign:'center', borderColor:`${color}60`, color }}
            value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus />
        </div>

        {/* Rezime */}
        {amt > 0 && (
          <div style={{ background: isWithdraw ? D.redBg : D.greenBg, borderRadius:10, padding:'10px 14px', border:`1px solid ${color}25` }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color }}>
              <span>Nouvo balans apre {isWithdraw ? 'retrè' : 'depo'}:</span>
              <span style={{ fontFamily:'monospace', fontSize:14 }}>
                {isWithdraw
                  ? amt > balance
                    ? <span style={{ color: D.red }}>⚠ Ensifizàn!</span>
                    : `${fmt(balance - amt)} HTG`
                  : `${fmt(balance + amt)} HTG`
                }
              </span>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={labelStyle}>Metod</label>
            <select style={{ ...inputStyle, cursor:'pointer' }}
              value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Referans</label>
            <input style={inputStyle} value={form.reference}
              onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
              placeholder="MCash #..." />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{
            padding:'10px 20px', borderRadius:10,
            border:`1px solid rgba(255,255,255,0.1)`,
            background:'transparent', color: D.muted,
            cursor:'pointer', fontWeight:700, fontSize:13,
          }}>Anile</button>
          <button onClick={() => mutation.mutate({ amount: amt, method: form.method, reference: form.reference || undefined })}
            disabled={mutation.isPending || amt <= 0 || (isWithdraw && amt > balance)}
            style={{
              padding:'10px 22px', borderRadius:10, border:'none', cursor:'pointer',
              background:`linear-gradient(135deg,${color},${color}CC)`,
              color:'#fff', fontWeight:800, fontSize:13,
              opacity: mutation.isPending || amt <= 0 || (isWithdraw && amt > balance) ? 0.5 : 1,
              display:'flex', alignItems:'center', gap:6,
            }}>
            {mutation.isPending
              ? <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} />
              : isWithdraw ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />
            }
            {mutation.isPending ? 'Ap trete...' : `Konfime ${isWithdraw ? 'Retrè' : 'Depo'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY KONT + ISTWA TRANZAKSYON
// ═══════════════════════════════════════════════════════════════
function ModalDetail({ accountId, onClose, onDepo, onRetrait }) {
  const { tenant } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['kane-account', accountId],
    queryFn: () => kaneAPI.getOne(accountId).then(r => r.data.account),
    enabled: !!accountId,
  })

  if (isLoading || !data) return (
    <Modal onClose={onClose} title="Detay Kont" width={620}>
      <div style={{ textAlign:'center', padding:40, color: D.muted }}>Ap chaje...</div>
    </Modal>
  )

  const TX_CONFIG = {
    ouverture: { color: D.gold,  bg: D.goldDim,  label:'Ouverture', icon:'🏦' },
    depot:     { color: D.green, bg: D.greenBg,  label:'Depo',      icon:'↓'  },
    retrait:   { color: D.red,   bg: D.redBg,    label:'Retrè',     icon:'↑'  },
  }

  return (
    <Modal onClose={onClose} title={`📋 Kont — ${data.accountNumber}`} width={620}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Info kont */}
        <div style={{
          background: D.goldBtn,
          borderRadius:14, padding:'16px 20px', color:'#0a1222',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12,
        }}>
          <div>
            <p style={{ fontSize:18, fontWeight:900, margin:'0 0 4px' }}>{data.firstName} {data.lastName}</p>
            <p style={{ fontSize:11, opacity:0.7, margin:'0 0 2px', fontFamily:'monospace' }}>{data.accountNumber}</p>
            {data.nifOrCin && <p style={{ fontSize:10, opacity:0.6, margin:0 }}>NIF/CIN: {data.nifOrCin}</p>}
            {data.familyRelation && <p style={{ fontSize:10, opacity:0.7, margin:'2px 0 0' }}>👨‍👩‍👧 {data.familyRelation}: {data.familyName || ''}</p>}
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, opacity:0.6, margin:'0 0 3px', textTransform:'uppercase' }}>Balans Disponib</p>
            <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:22, margin:'0 0 4px' }}>{fmt(data.balance)} HTG</p>
            <p style={{ fontSize:9, opacity:0.5, margin:0 }}>Bloke: {fmt(data.lockedAmount)} HTG</p>
          </div>
        </div>

        {/* Bouton aksyon */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onDepo} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${D.green}30`, cursor:'pointer', background: D.greenBg, color: D.green, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <ArrowDownCircle size={16} /> Depo
          </button>
          <button onClick={onRetrait} style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${D.red}30`, cursor:'pointer', background: D.redBg, color: D.red, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <ArrowUpCircle size={16} /> Retrè
          </button>
          <button onClick={() => {
            const html = buildReceiptHTML(data, data.transactions?.[0], tenant, 'ouverture')
            printReceipt(html, `Kont — ${data.accountNumber}`)
          }} style={{ padding:'10px 14px', borderRadius:10, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color: D.muted, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <Printer size={14} />
          </button>
        </div>

        {/* Istwa tranzaksyon */}
        <div>
          <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color: D.muted, margin:'0 0 10px' }}>
            Istwa Tranzaksyon ({data.transactions?.length || 0})
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
            {!data.transactions?.length
              ? <p style={{ textAlign:'center', color: D.muted, fontSize:12, padding:16 }}>Pa gen tranzaksyon</p>
              : data.transactions.map(tx => {
                  const cfg = TX_CONFIG[tx.type] || TX_CONFIG.ouverture
                  return (
                    <div key={tx.id} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'10px 14px', borderRadius:12,
                      background: cfg.bg, border:`1px solid ${cfg.color}20`,
                    }}>
                      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:`${cfg.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:12, fontWeight:700, color: cfg.color }}>{cfg.label}</span>
                          <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color: cfg.color }}>
                            {tx.type === 'retrait' ? '-' : '+'}{fmt(tx.amount)} HTG
                          </span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                          <span style={{ fontSize:10, color: D.muted }}>{fmtDate(tx.createdAt)} • {tx.method}</span>
                          <span style={{ fontSize:10, color: D.muted, fontFamily:'monospace' }}>Bal: {fmt(tx.balanceAfter)} HTG</span>
                        </div>
                        {tx.reference && <span style={{ fontSize:9, color: D.muted }}>Ref: {tx.reference}</span>}
                      </div>
                      <button onClick={() => {
                        const html = buildReceiptHTML(data, tx, tenant, tx.type)
                        printReceipt(html, `${cfg.label} — ${data.accountNumber}`)
                      }} title="Enprime resi"
                        style={{ width:30, height:30, borderRadius:8, border:'none', background:'rgba(255,255,255,0.05)', color: D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Printer size={12} />
                      </button>
                    </div>
                  )
                })
            }
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
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const [modal,  setModal]  = useState(null)
  const [selAcc, setSelAcc] = useState(null)

  const { data: statsData } = useQuery({
    queryKey: ['kane-stats'],
    queryFn: () => kaneAPI.getStats().then(r => r.data.stats),
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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, fontFamily:'DM Sans, sans-serif', paddingBottom:50 }}>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .kane-row:hover { background: rgba(201,168,76,0.06) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color: D.gold, margin:'0 0 3px', display:'flex', alignItems:'center', gap:8 }}>
            <CreditCard size={22} /> Kanè Epay
          </h1>
          <p style={{ fontSize:12, color: D.muted, margin:0 }}>Sistèm kont depo ak retrè pou kliyan yo</p>
        </div>
        <button onClick={() => setModal('create')} style={{
          display:'flex', alignItems:'center', gap:7,
          padding:'10px 20px', borderRadius:12, border:'none', cursor:'pointer',
          background: D.goldBtn,
          color:'#0a1222', fontWeight:800, fontSize:13,
          boxShadow:'0 4px 16px rgba(201,168,76,0.28)',
        }}>
          <Plus size={15} /> Nouvo Kont
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
        <StatCard label="Total Kont"       value={statsData?.totalAccounts    || 0}                      icon={<Users size={20}/>}     color={D.gold}   />
        <StatCard label="Kont Aktif"       value={statsData?.activeAccounts   || 0}                      icon={<Activity size={20}/>}  color={D.green}  />
        <StatCard label="Total Balans"     value={`${fmt(statsData?.totalBalance || 0)} HTG`}             icon={<Wallet size={20}/>}    color="#3B82F6"  />
        <StatCard label="Tranzaksyon Jodi" value={statsData?.todayTransactions || 0}                      icon={<TrendingUp size={20}/>} color={D.orange} />
      </div>

      {/* ── Recherch ── */}
      <div style={{ position:'relative', maxWidth:400 }}>
        <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color: D.muted, pointerEvents:'none' }} />
        <input
          style={{ ...inputStyle, paddingLeft:36, fontSize:13 }}
          placeholder="Chèche pa non, nimewo kont, NIF..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* ── Tablo ── */}
      <div style={{ background: D.card, borderRadius:20, overflow:'hidden', boxShadow: D.shadow, border:`1px solid ${D.cardBorder}` }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr style={{ background:'rgba(201,168,76,0.06)' }}>
                {['No. Kont','Titilè','NIF/CIN','Frè Kanè','Bloke','Balans Disponib','Dat Ouverture','Aksyon'].map((h, i) => (
                  <th key={i} style={{
                    padding:'11px 14px', fontSize:10, fontWeight:800, color: D.gold,
                    textTransform:'uppercase', letterSpacing:'0.07em',
                    borderBottom:`1px solid ${D.cardBorder}`,
                    textAlign: i >= 3 && i <= 5 ? 'right' : i === 7 ? 'center' : 'left',
                    whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color: D.muted, fontSize:13 }}>Ap chaje...</td></tr>
                : !accounts.length
                ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40 }}>
                    <div style={{ color: D.muted }}>
                      <CreditCard size={36} style={{ opacity:0.3, marginBottom:8 }} />
                      <p style={{ fontSize:13, fontWeight:700, margin:0 }}>
                        {search ? 'Pa jwenn rezilta' : 'Pa gen kont Kanè Epay'}
                      </p>
                    </div>
                  </td></tr>
                : accounts.map((acc, idx) => (
                    <tr key={acc.id} className="kane-row"
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom:`1px solid ${D.cardBorder}`, cursor:'pointer', transition:'background 0.15s' }}
                      onClick={() => openDetail(acc)}>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontFamily:'monospace', fontWeight:800, color: D.gold, fontSize:12 }}>{acc.accountNumber}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, color: D.text }}>
                        {acc.firstName} {acc.lastName}
                        {acc.phone && <div style={{ fontSize:10, color: D.muted }}>{acc.phone}</div>}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:11, color: D.muted, fontFamily:'monospace' }}>
                        {acc.nifOrCin || '—'}
                      </td>
                      <td style={{ padding:'11px 14px', textAlign:'right' }}>
                        <span style={{ fontFamily:'monospace', fontSize:12, color: D.red, fontWeight:700 }}>{fmt(acc.kaneFee)}</span>
                      </td>
                      <td style={{ padding:'11px 14px', textAlign:'right' }}>
                        <span style={{ fontFamily:'monospace', fontSize:12, color: D.orange, fontWeight:700 }}>{fmt(acc.lockedAmount)}</span>
                      </td>
                      <td style={{ padding:'11px 14px', textAlign:'right' }}>
                        <span style={{ fontFamily:'monospace', fontSize:13, color: D.green, fontWeight:800 }}>{fmt(acc.balance)} HTG</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:11, color: D.muted, fontFamily:'monospace' }}>
                        {fmtDate(acc.createdAt)}
                      </td>
                      <td style={{ padding:'11px 14px', textAlign:'center' }}>
                        <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                          <button onClick={e => { e.stopPropagation(); openDepo(acc) }} title="Depo"
                            style={{ width:30, height:30, borderRadius:7, border:'none', background: D.greenBg, color: D.green, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <ArrowDownCircle size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); openRetrait(acc) }} title="Retrè"
                            style={{ width:30, height:30, borderRadius:7, border:'none', background: D.redBg, color: D.red, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <ArrowUpCircle size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); openDetail(acc) }} title="Detay"
                            style={{ width:30, height:30, borderRadius:7, border:'none', background:'rgba(255,255,255,0.05)', color: D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginasyon */}
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderTop:`1px solid ${D.cardBorder}`, background:'rgba(201,168,76,0.04)' }}>
            <span style={{ fontSize:12, color: D.muted }}>{total} kont total</span>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color: D.muted, cursor: page===1 ? 'default':'pointer', opacity: page===1 ? 0.4:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ display:'flex', alignItems:'center', fontSize:12, color: D.text, fontWeight:700, padding:'0 8px' }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.cardBorder}`, background:'rgba(255,255,255,0.04)', color: D.muted, cursor: page===totalPages ? 'default':'pointer', opacity: page===totalPages ? 0.4:1, display:'flex', alignItems:'center', justifyContent:'center', transform:'rotate(180deg)' }}>
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modal === 'create' && (
        <ModalCreateAccount onClose={() => setModal(null)} onSuccess={refresh} />
      )}
      {modal === 'detail' && selAcc && (
        <ModalDetail accountId={selAcc.id} onClose={() => setModal(null)}
          onDepo={() => setModal('depot')} onRetrait={() => setModal('retrait')} />
      )}
      {modal === 'depot' && selAcc && (
        <ModalTransaction account={selAcc} type="depot" onClose={() => setModal(null)} onSuccess={refresh} />
      )}
      {modal === 'retrait' && selAcc && (
        <ModalTransaction account={selAcc} type="retrait" onClose={() => setModal(null)} onSuccess={refresh} />
      )}
    </div>
  )
}