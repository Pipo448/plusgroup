// src/pages/enterprise/kaneShared.jsx
// ─── Shared utils, design tokens, and UI atoms ───────────────
// Itilize nan KaneEpayPage.jsx AK PrePage.jsx
// ⚠️  PA MODIFYE òd export yo — KaneEpayPage.jsx depann sou yo

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Helpers ────────────────────────────────────────────────
export const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '' }
}

export const fmtShort = (d) => {
  try { return format(new Date(d), 'dd/MM HH:mm', { locale: fr }) } catch { return '' }
}

export function getAccountPrefix(tenant) {
  const name  = tenant?.businessName || tenant?.name || ''
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length)      return 'KE'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ─── Constants ───────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Kach'      },
  { value: 'moncash',  label: 'MonCash'   },
  { value: 'natcash',  label: 'NatCash'   },
  { value: 'transfer', label: 'Virement'  },
  { value: 'card',     label: 'Kat Kredi' },
  { value: 'check',    label: 'Chèk'      },
]

// ─── Design tokens ───────────────────────────────────────────
export const D = {
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
  purple:     '#8B5CF6', purpleBg:'rgba(139,92,246,0.10)',
  teal:       '#0891B2', tealBg:  'rgba(8,145,178,0.10)',
  text:       '#e8eaf0',
  muted:      '#6b7a99',
  label:      'rgba(201,168,76,0.75)',
  input:      '#060f1e',
  shadow:     '0 4px 20px rgba(0,0,0,0.4)',
}

// ─── Shared CSS (append nan KaneEpayPage AK PrePage) ─────────
export const SHARED_STYLES = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sheetUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }

  .ke-modal::-webkit-scrollbar       { width: 3px }
  .ke-modal::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px }
  .ke-modal input::placeholder,
  .ke-modal textarea::placeholder    { color: #2a3a54 }
  .ke-modal select option            { background: #0d1b2a; color: #e8eaf0 }
  .ke-row:hover                      { background: rgba(201,168,76,0.06) !important; }
  .ke-btn:active                     { transform: scale(0.97); }
  .ke-input:focus                    { border-color: #C9A84C !important; box-shadow: 0 0 0 2px rgba(201,168,76,0.14) !important; outline: none; }
  .ke-tab-btn:hover                  { background: rgba(201,168,76,0.08) !important; }

  .ke-stats-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ke-today-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ke-header       { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .ke-header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ke-form-row     { display: flex; flex-direction: column; gap: 10px; }
  .ke-sheet        { border-radius: 0 !important; margin: 0 !important; max-height: 96vh !important; }

  @media (min-width: 480px) {
    .ke-today-grid  { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 600px) {
    .ke-stats-grid  { grid-template-columns: repeat(3, 1fr); }
    .ke-form-row    { flex-direction: row; }
    .ke-sheet       { border-radius: 20px !important; margin: 20px auto !important; max-height: 88vh !important; }
    .ke-overlay     { align-items: center !important; }
  }
  @media (min-width: 900px) {
    .ke-stats-grid  { grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .ke-today-grid  { gap: 12px; }
  }
  @media (max-width: 380px) {
    .ke-stat-val    { font-size: 12px !important; }
    .ke-stat-label  { font-size: 9px  !important; }
  }
`

// ─── Shared inline styles ────────────────────────────────────
export const inputStyle = {
  width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14,
  border: '1.5px solid rgba(255,255,255,0.09)', outline: 'none',
  color: D.text, background: D.input, transition: 'border-color 0.15s',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

export const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: D.label,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}
