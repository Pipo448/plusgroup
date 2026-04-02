// src/pages/klinik/klinikShared.jsx
// ─── Design tokens + konpozant patajе pou tout paj Klinik ───

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Koulè sistèm ────────────────────────────────────────────
export const K = {
  // Fon
  bg:         '#0a1628',
  card:       '#0d1f35',
  cardBorder: 'rgba(14,165,233,0.18)',
  overlay:    'rgba(0,0,0,0.88)',

  // Aksan prensipal — ble medikal
  blue:       '#0EA5E9',
  blueBtn:    'linear-gradient(135deg,#0EA5E9,#0369a1)',
  blueDim:    'rgba(14,165,233,0.10)',
  blueBorder: 'rgba(14,165,233,0.25)',

  // Aksan sekondè
  teal:       '#0D9488', tealBg:   'rgba(13,148,136,0.10)',
  green:      '#22c55e', greenBg:  'rgba(34,197,94,0.12)',
  red:        '#ef4444', redBg:    'rgba(239,68,68,0.10)',
  orange:     '#f59e0b', orangeBg: 'rgba(245,158,11,0.10)',
  purple:     '#8B5CF6', purpleBg: 'rgba(139,92,246,0.10)',
  pink:       '#ec4899', pinkBg:   'rgba(236,72,153,0.10)',

  // Tèks
  text:   '#e2eaf5',
  muted:  '#8fa3ba',
  label:  'rgba(14,165,233,0.8)',
  input:  '#050e1d',
  shadow: '0 4px 20px rgba(0,0,0,0.4)',

  // Sekondè
  secBg:     'rgba(14,165,233,0.04)',
  secBorder: 'rgba(14,165,233,0.10)',
}

// ─── Helpers ─────────────────────────────────────────────────
export const fmtDate = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: fr }) } catch { return '—' }
}
export const fmtDateTime = (d) => {
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr }) } catch { return '—' }
}
export const fmtHeure = (d) => {
  try { return format(new Date(d), 'HH:mm', { locale: fr }) } catch { return '—' }
}
export const age = (dateNaissance) => {
  if (!dateNaissance) return '—'
  const diff = Date.now() - new Date(dateNaissance).getTime()
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365))} an`
}

// ─── Enums label ─────────────────────────────────────────────
export const STATUT_RDV = {
  en_attente: { label: 'An Atant',   color: K.orange, bg: K.orangeBg },
  confirme:   { label: 'Konfime',    color: K.blue,   bg: K.blueDim  },
  en_cours:   { label: 'An Kous',    color: K.teal,   bg: K.tealBg   },
  complete:   { label: 'Konplè',     color: K.green,  bg: K.greenBg  },
  annule:     { label: 'Anile',      color: K.red,    bg: K.redBg    },
  absent:     { label: 'Absan',      color: '#6b7a99',bg: 'rgba(107,122,153,0.1)' },
}

export const STATUT_KONSULT = {
  brouillon:  { label: 'Bouyon',     color: K.orange, bg: K.orangeBg },
  complete:   { label: 'Konplè',     color: K.blue,   bg: K.blueDim  },
  signe:      { label: 'Siyen',      color: K.green,  bg: K.greenBg  },
}

export const STATUT_LAB = {
  en_attente: { label: 'An Atant',   color: K.orange, bg: K.orangeBg },
  en_cours:   { label: 'An Kous',    color: K.blue,   bg: K.blueDim  },
  complete:   { label: 'Konplè',     color: K.green,  bg: K.greenBg  },
  annule:     { label: 'Anile',      color: K.red,    bg: K.redBg    },
}

export const STATUT_HOSP = {
  admis:      { label: 'Admis',      color: K.blue,   bg: K.blueDim  },
  en_soin:    { label: 'An Swen',    color: K.teal,   bg: K.tealBg   },
  sorti:      { label: 'Sorti',      color: K.green,  bg: K.greenBg  },
  transfère:  { label: 'Transf.',    color: K.orange, bg: K.orangeBg },
  decede:     { label: 'Desede',     color: K.red,    bg: K.redBg    },
}

export const GROUPE_SANGUIN_LABELS = {
  A_POS:'A+', A_NEG:'A-', B_POS:'B+', B_NEG:'B-',
  AB_POS:'AB+', AB_NEG:'AB-', O_POS:'O+', O_NEG:'O-', INCONNU:'?'
}

export const SEXE_LABELS = { M: 'Gason', F: 'Fi', AUTRE: 'Lòt' }

// Lis tès lab komen
export const TESTS_LAB_COMMUNS = [
  { nom:'NFS (Numération Formule Sanguine)', code:'NFS' },
  { nom:'Glycémie à jeun', code:'GLY' },
  { nom:'Créatininémie', code:'CREAT' },
  { nom:'Uricémie', code:'URIC' },
  { nom:'Transaminases ASAT/ALAT', code:'TRANS' },
  { nom:'Bilirubine totale', code:'BILI' },
  { nom:'Protéinurie', code:'PROT' },
  { nom:'ECBU', code:'ECBU' },
  { nom:'Test VIH', code:'VIH' },
  { nom:'Test Palu / TDR', code:'PALU' },
  { nom:'Typhoïde (Widal)', code:'WIDAL' },
  { nom:'Cholestérol total', code:'CHOL' },
  { nom:'Triglycérides', code:'TG' },
  { nom:'Hémoglobine glyquée HbA1c', code:'HBA1C' },
  { nom:'Test de grossesse (βHCG)', code:'BHCG' },
  { nom:'Groupe sanguin + Rhésus', code:'GS' },
]

// ─── CSS global Klinik ────────────────────────────────────────
export const KLINIK_STYLES = `
  @keyframes kFadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes kSpin    { to{transform:rotate(360deg)} }
  @keyframes kPulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes kSheet   { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }

  .kl-row:hover        { background:rgba(14,165,233,0.05) !important; }
  .kl-btn:active       { transform:scale(0.97); }
  .kl-input:focus      { border-color:#0EA5E9 !important; box-shadow:0 0 0 2px rgba(14,165,233,0.15) !important; outline:none; }
  .kl-tab:hover:not(.active) { background:rgba(255,255,255,0.04) !important; color:#e2eaf5 !important; }
  .kl-modal::-webkit-scrollbar { width:3px }
  .kl-modal::-webkit-scrollbar-thumb { background:rgba(14,165,233,0.25); border-radius:2px }
  .kl-modal input::placeholder, .kl-modal textarea::placeholder { color:#1a2e45 }
  .kl-modal select option { background:#0d1f35; color:#e2eaf5 }

  .kl-grid-4  { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
  .kl-grid-3  { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .kl-grid-2  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .kl-header  { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
  .kl-hright  { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .kl-frow    { display:flex; gap:10px; flex-direction:column; }

  @media(min-width:600px){
    .kl-frow    { flex-direction:row; }
    .kl-sheet   { border-radius:16px !important; margin:20px auto !important; max-height:88vh !important; }
    .kl-overlay { align-items:center !important; }
  }
  @media(max-width:600px){
    .kl-grid-4 { grid-template-columns:1fr 1fr; gap:8px; }
    .kl-grid-3 { grid-template-columns:1fr 1fr; gap:8px; }
    .kl-grid-2 { grid-template-columns:1fr; }
  }
  @media(max-width:380px){
    .kl-grid-4 { grid-template-columns:1fr 1fr; }
    .kl-stat-val { font-size:13px !important; }
  }
`

// ─── Style inputs ─────────────────────────────────────────────
export const inputStyle = {
  width:'100%', padding:'10px 13px', borderRadius:9, fontSize:13,
  border:'1.5px solid rgba(255,255,255,0.09)', outline:'none',
  color:K.text, background:K.input, transition:'border-color 0.15s',
  boxSizing:'border-box', fontFamily:'inherit',
}
export const labelStyle = {
  display:'block', fontSize:11, fontWeight:700, color:K.label,
  marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em',
}

// ─── Atòm UI ─────────────────────────────────────────────────
export function KSpinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{ width:size, height:size, border:`2px solid ${color}30`, borderTopColor:color, borderRadius:'50%', animation:'kSpin 0.8s linear infinite', display:'inline-block', flexShrink:0 }} />
  )
}

export function KBadge({ statut, cfg }) {
  const c = cfg[statut] || { label:statut, color:'#8fa3ba', bg:'rgba(143,163,186,0.1)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:800, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      {c.label}
    </span>
  )
}

export function KStatCard({ label, value, sub, icon, color, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}15` : K.card, borderRadius:12, padding:'12px 14px', border:`1px solid ${highlight ? color+'40' : K.cardBorder}`, display:'flex', alignItems:'center', gap:10, animation:'kFadeUp 0.3s ease' }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', color }}>{icon}</div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:K.muted, margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</p>
        <p className="kl-stat-val" style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color: highlight ? color : K.text, margin:0, whiteSpace:'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize:10, color:K.muted, margin:'1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

export function KSection({ icon, title, children }) {
  return (
    <div style={{ background:K.secBg, border:`1px solid ${K.secBorder}`, borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
      <p style={{ fontSize:11, fontWeight:800, color:K.blue, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

export function KModal({ onClose, title, children, width = 560 }) {
  return (
    <div className="kl-overlay" style={{ position:'fixed', inset:0, zIndex:1000, background:K.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div className="kl-modal kl-sheet" style={{ background:K.card, border:`1px solid ${K.cardBorder}`, borderRadius:'16px 16px 0 0', width:'100%', maxWidth:width, maxHeight:'96vh', overflowY:'auto', boxShadow:'0 -8px 40px rgba(0,0,0,0.6)', animation:'kSheet 0.24s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
          <div style={{ width:34, height:4, borderRadius:2, background:'rgba(255,255,255,0.1)' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px 12px', borderBottom:`1px solid ${K.cardBorder}`, position:'sticky', top:0, background:K.card, zIndex:1 }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:K.text, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'rgba(255,255,255,0.06)', color:K.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:'16px 16px 36px' }}>{children}</div>
      </div>
    </div>
  )
}

export function KVitalTag({ label, value, unit, ok = true }) {
  return (
    <div style={{ background: ok ? K.secBg : K.redBg, borderRadius:8, padding:'8px 12px', border:`1px solid ${ok ? K.secBorder : K.red+'30'}`, textAlign:'center' }}>
      <p style={{ fontSize:9, color:K.muted, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 3px', fontWeight:700 }}>{label}</p>
      <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color: ok ? K.text : K.red, margin:0 }}>
        {value || '—'} {value && <span style={{ fontSize:10, fontWeight:400, color:K.muted }}>{unit}</span>}
      </p>
    </div>
  )
}
