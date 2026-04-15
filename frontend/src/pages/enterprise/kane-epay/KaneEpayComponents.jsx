// src/pages/enterprise/kane-epay/KaneEpayComponents.jsx
import { X, AlertCircle } from 'lucide-react'
import { D, inputStyle, labelStyle } from '../kaneShared.jsx'
import { fmt } from './kaneEpayUtils'
import { PAYMENT_METHODS } from './kaneEpayConstants'

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 14, color = '#fff' }) {
  return <span style={{ width:size, height:size, border:`2px solid ${color}30`, borderTopColor:color, borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block', flexShrink:0 }}/>
}

// ─── StatCard ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon, color, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}15` : D.card, borderRadius:12, padding:'12px 14px', border:`1px solid ${highlight ? color+'40' : D.cardBorder}`, boxShadow:D.shadow, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', color }}>{icon}</div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:D.muted, margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</p>
        <p className="ke-stat-val" style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color: highlight ? color : D.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize:10, color:D.muted, margin:'1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────
export function Section({ icon, title, children }) {
  return (
    <div style={{ background:D.secBg, border:`1px solid ${D.secBorder}`, borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
      <p style={{ fontSize:11, fontWeight:800, color:D.gold, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────
export function Modal({ onClose, title, children, width = 540 }) {
  return (
    <div className="ke-overlay" style={{ position:'fixed', inset:0, zIndex:1000, background:D.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div className="ke-modal ke-sheet" style={{ background:D.card, border:`1px solid ${D.cardBorder}`, borderRadius:'18px 18px 0 0', width:'100%', maxWidth:width, maxHeight:'96vh', overflowY:'auto', boxShadow:'0 -8px 40px rgba(0,0,0,0.7)', animation:'sheetUp 0.24s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
          <div style={{ width:34, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px 12px', borderBottom:`1px solid ${D.cardBorder}`, position:'sticky', top:0, background:D.card, zIndex:1 }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'rgba(255,255,255,0.06)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={15}/></button>
        </div>
        <div style={{ padding:'16px 16px 36px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── PhotoBox ────────────────────────────────────────────────
export function PhotoBox({ label, icon, preview, inputId, onChange, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <label htmlFor={inputId} className="ke-photo-box" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:100, borderRadius:10, cursor:'pointer', overflow:'hidden', position:'relative', border:`2px dashed ${preview ? D.gold : 'rgba(255,255,255,0.10)'}`, background: preview ? 'transparent' : 'rgba(255,255,255,0.02)', transition:'all 0.18s' }}>
        {preview
          ? <img src={preview} alt={label} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <><span style={{ fontSize:24, marginBottom:5 }}>{icon}</span><span style={{ fontSize:10, color:D.muted, textAlign:'center', padding:'0 8px' }}>{hint}</span></>}
        <input id={inputId} type="file" accept="image/*" style={{ display:'none' }} onChange={onChange}/>
      </label>
      {preview && <p style={{ fontSize:10, color:D.green, margin:'3px 0 0', textAlign:'center', fontWeight:600 }}>✅ Chwazi</p>}
    </div>
  )
}

// ─── BalanceBar ──────────────────────────────────────────────
export function BalanceBar({ opening, fee, locked }) {
  const balance = opening - fee - locked
  const balOk   = balance >= 0
  return (
    <>
      <div style={{ marginTop:10, borderRadius:6, overflow:'hidden', height:8, background:'rgba(255,255,255,0.06)', display:'flex' }}>
        {fee    > 0 && <div style={{ width:`${Math.min((fee/opening)*100,100)}%`,    background:'#C0392B', transition:'width 0.3s' }}/>}
        {locked > 0 && <div style={{ width:`${Math.min((locked/opening)*100,100)}%`, background:'#D97706', transition:'width 0.3s' }}/>}
        {balance > 0 && <div style={{ flex:1, background:'#27ae60' }}/>}
      </div>
      <div style={{ display:'flex', gap:12, marginTop:6, fontSize:11, fontWeight:700, flexWrap:'wrap' }}>
        {fee    > 0 && <span style={{ color:'#C0392B' }}>🔴 Frè: {fmt(fee)}</span>}
        {locked > 0 && <span style={{ color:'#D97706' }}>🟠 Bloke: {fmt(locked)}</span>}
        <span style={{ color: balOk ? '#27ae60' : '#C0392B' }}>🟢 Balans: {fmt(balance)} HTG</span>
      </div>
      {!balOk && (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'rgba(192,57,43,0.10)', borderRadius:8, marginTop:8 }}>
          <AlertCircle size={12} style={{ color:'#C0392B' }}/>
          <span style={{ fontSize:11, color:'#C0392B' }}>Frè + Bloke plis ke total</span>
        </div>
      )}
    </>
  )
}
