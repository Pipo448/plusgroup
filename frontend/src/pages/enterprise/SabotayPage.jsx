// src/pages/enterprise/SabotayPage.jsx
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users, Plus, X, ChevronRight, ChevronLeft,
  Wallet, Bell, Eye, CheckCircle, Clock,
  Settings, RefreshCw, Trophy, AlertCircle, ArrowLeft, Search,
  Printer, Bluetooth, BluetoothOff, Key, Star, UserCheck,
  Loader, Shuffle, FileText, Edit3, AlertTriangle, Shield,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, printSabotayReceipt
} from '../../services/printerService'

// ─────────────────────────────────────────────────────────────
// API CONFIG
// ─────────────────────────────────────────────────────────────
const SOL_API = import.meta.env.VITE_SOL_API_URL || 'https://plusgroup-backend.onrender.com'
const API_URL = import.meta.env.VITE_API_URL     || 'https://plusgroup-backend.onrender.com/api/v1'

// ─────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────
const FREQ_LABELS = {
  daily:           { ht: 'Chak Jou',       fr: 'Chaque jour',    en: 'Daily'          },
  weekly_saturday: { ht: 'Chak Samdi',     fr: 'Chaque samedi',  en: 'Every Saturday' },
  weekly_monday:   { ht: 'Chak Lendi',     fr: 'Chaque lundi',   en: 'Every Monday'   },
  biweekly:        { ht: 'Chak 15 Jou',   fr: 'Tous les 15 j.', en: 'Every 2 weeks'  },
  monthly:         { ht: 'Chak Mwa',       fr: 'Chaque mois',    en: 'Monthly'        },
  weekdays:        { ht: 'Lendi-Vandredi', fr: 'Lun-Ven',        en: 'Weekdays'       },
}

const OWNER_SLOT_NAME = 'Pwopriyete Sol'

function hasOwnerSlot(plan) {
  return Number(plan.feePerMember) > 0 && Number(plan.feePerMember) === Number(plan.amount)
}
function totalSlots(plan) {
  return hasOwnerSlot(plan) ? Number(plan.maxMembers) + 1 : Number(plan.maxMembers)
}
function memberPayout(plan) {
  return Number(plan.amount) * Number(plan.maxMembers) - Number(plan.feePerMember || 0)
}
function ownerPayout(plan) {
  return Number(plan.amount) * Number(plan.maxMembers)
}

function freqIntervalLabel(frequency, interval = 1) {
  const base = FREQ_LABELS[frequency]?.ht || frequency
  if (!interval || interval <= 1) return base
  const unitMap = {
    daily:'Jou', weekly_saturday:'Samdi', weekly_monday:'Lendi',
    biweekly:'15 Jou', monthly:'Mwa', weekdays:'Jou Travay',
  }
  return `Chak ${interval} ${unitMap[frequency] || base}`
}

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const D = {
  bg:'#060f1e', card:'#0d1b2a', cardHov:'#112236',
  border:'rgba(201,168,76,0.18)', borderSub:'rgba(255,255,255,0.07)',
  gold:'#C9A84C', goldDk:'#8B6914',
  goldBtn:'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:'rgba(201,168,76,0.10)',
  green:'#27ae60', greenBg:'rgba(39,174,96,0.12)',
  red:'#e74c3c',   redBg:'rgba(231,76,60,0.10)',
  blue:'#3B82F6',  blueBg:'rgba(59,130,246,0.10)',
  orange:'#f39c12',orangeBg:'rgba(243,156,18,0.10)',
  purple:'#9b59b6',purpleBg:'rgba(155,89,182,0.10)',
  teal:'#14b8a6',  tealBg:'rgba(20,184,166,0.10)',
  text:'#e8eaf0', muted:'#6b7a99',
  label:'rgba(201,168,76,0.75)', input:'#060f1e',
}

// ─────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes pop     { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @media(min-width:640px){ .m-sheet{border-radius:20px!important;margin:20px!important;max-height:88vh!important;} }
  .m-sheet::-webkit-scrollbar{width:3px}
  .m-sheet::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
  .m-sheet input::placeholder,.m-sheet textarea::placeholder{color:#2a3a54}
  .m-sheet select option{background:#0d1b2a;color:#e8eaf0}
  .plan-card{transition:all 0.18s;}
  .plan-card:hover{background:#112236!important;transform:translateY(-2px);}
  @media(max-width:480px){
    .page-head{flex-direction:column!important;align-items:stretch!important;gap:10px!important;}
    .page-head-actions{justify-content:space-between!important;width:100%!important;}
    .btn-new-plan{flex:1!important;justify-content:center!important;}
    .top-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .stat-card{padding:10px 11px!important;}
    .stat-icon{width:34px!important;height:34px!important;}
    .stat-val{font-size:12px!important;}
    .search-wrap{max-width:100%!important;}
    .plan-card{padding:12px 13px!important;}
    .detail-head{gap:8px!important;margin-bottom:14px!important;}
    .detail-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .member-row{padding:10px 11px!important;}
    .member-pos-badge{width:30px!important;height:30px!important;}
    .member-name{font-size:12px!important;}
    .member-phone{font-size:10px!important;}
    .member-btns button{width:26px!important;height:26px!important;}
    .m-sheet{border-radius:18px 18px 0 0!important;}
    .modal-body{padding:14px 15px 24px!important;}
    .modal-title{font-size:14px!important;}
    .freq-grid{grid-template-columns:1fr 1fr!important;gap:6px!important;}
    .freq-btn{padding:8px 5px!important;font-size:10px!important;}
    .vacct-stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .cal-day span{font-size:10px!important;}
    .tab-btn{padding:7px 12px!important;font-size:11px!important;}
    .pay-date-row{padding:9px 11px!important;}
    .printer-label{display:none!important;}
    .error-banner{flex-wrap:wrap!important;gap:8px!important;}
    .error-banner button{margin-left:0!important;width:100%!important;}
  }
  @media(max-width:360px){ .top-stats{grid-template-columns:1fr!important;} }
`

const fmt = (n) => Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:0,maximumFractionDigits:0})
const inp = {
  width:'100%', padding:'10px 12px', borderRadius:10, fontSize:13,
  border:'1.5px solid rgba(255,255,255,0.09)', outline:'none', fontFamily:'inherit',
  color:D.text, background:D.input, transition:'border-color 0.15s', boxSizing:'border-box',
}
const lbl = {
  display:'block', fontSize:10, fontWeight:700, color:D.label,
  marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em',
}

// ─────────────────────────────────────────────────────────────
// TIMING & SCORE
// ─────────────────────────────────────────────────────────────
function getPaymentTiming(plan, paymentDate) {
  const today = new Date().toISOString().split('T')[0]
  if (paymentDate < today) return 'late'
  const now = new Date()
  const [dueH,dueM] = (plan.dueTime||'08:00').split(':').map(Number)
  const nowMins = now.getHours()*60+now.getMinutes()
  const dueMins = dueH*60+dueM
  if (nowMins < dueMins-15) return 'early'
  if (nowMins <= dueMins+60) return 'onTime'
  return 'late'
}

function getMemberScore(member) {
  const timings = Object.values(member.paymentTimings||{})
  if (!timings.length) return null
  const early=timings.filter(t=>t==='early').length
  const onTime=timings.filter(t=>t==='onTime').length
  const late=timings.filter(t=>t==='late').length
  return { score:Math.round(((early*2+onTime)/(timings.length*2))*100), early, onTime, late }
}

function generateCredentials(name, phone) {
  const first = name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  const last4  = phone.replace(/\D/g,'').slice(-4)
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pw = ''
  for (let i=0;i<6;i++) pw += chars[Math.floor(Math.random()*chars.length)]
  return { username:`${first}${last4}`, password:pw }
}

// ─────────────────────────────────────────────────────────────
// DATE HELPERS — ✅ itilize startDate (pa createdAt)
// ─────────────────────────────────────────────────────────────
function getPlanStartDate(plan) {
  // ✅ Priyorite: startDate → createdAt → jodi a
  return plan.startDate || plan.createdAt || new Date().toISOString()
}

function getPaymentDates(frequency, startDate, count, interval=1) {
  const dates=[], n=Math.max(1,Math.floor(interval)||1)
  let cur = new Date(startDate||Date.now())

  const advanceOnce = () => {
    switch(frequency) {
      case 'daily':           cur.setDate(cur.getDate()+1); break
      case 'weekly_saturday': cur.setDate(cur.getDate()+((6-cur.getDay()+7)%7||7)); break
      case 'weekly_monday':   cur.setDate(cur.getDate()+((1-cur.getDay()+7)%7||7)); break
      case 'biweekly':        cur.setDate(cur.getDate()+14); break
      case 'monthly':         cur.setMonth(cur.getMonth()+1); break
      case 'weekdays':
        do{cur.setDate(cur.getDate()+1)}while([0,6].includes(cur.getDay())); break
      default: cur.setDate(cur.getDate()+1)
    }
  }
  const advance = () => { for(let i=0;i<n;i++) advanceOnce() }

  dates.push(cur.toISOString().split('T')[0])
  for(let i=1;i<count;i++){ advance(); dates.push(new Date(cur).toISOString().split('T')[0]) }
  return dates
}

// ─────────────────────────────────────────────────────────────
// API HELPERS — ✅ apiFetch pou tout routes admin /api/v1/sabotay
// ─────────────────────────────────────────────────────────────
async function apiFetch(path, options={}) {
  const {token} = useAuthStore.getState()
  const slug     = localStorage.getItem('plusgroup-slug')
  const branchId = localStorage.getItem('plusgroup-branch-id')
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${token}`,
      ...(slug     ? {'X-Tenant-Slug': slug}      : {}),
      ...(branchId ? {'X-Branch-Id':  branchId}   : {}),
      ...(options.headers||{}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message||'Erè API')
  return data
}

// solFetch = sèlman pou /api/sol/... (pòtal manm) — pa pou admin
async function solFetch(path, options={}) {
  const {token} = useAuthStore.getState()
  const res = await fetch(`${SOL_API}${path}`, {
    ...options,
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`, ...(options.headers||{})},
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message||'Erè Sol API')
  return data
}

// ─────────────────────────────────────────────────────────────
// PRINTER HOOK
// ─────────────────────────────────────────────────────────────
function usePrinterState() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async()=>{
    if(connecting||connected) return
    setConnecting(true)
    try { const n=await connectPrinter(); setConnected(true); toast.success(`✅ Printer konekte: ${n}`) }
    catch(e){ if(e.name!=='NotFoundError') toast.error('Pa ka konekte printer.') }
    finally { setConnecting(false) }
  },[connecting,connected])

  const disconnect = useCallback(()=>{
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte',{icon:'🔌'})
  },[])

  const print = useCallback(async(plan,member,paidDates,tenant,type)=>{
    if(isPrinterConnected()){
      setPrinting(true)
      try { await printSabotayReceipt(plan,member,paidDates,tenant,type); toast.success('Resi enprime!'); return true }
      catch { setConnected(false); toast.error('Erè printer.'); return false }
      finally { setPrinting(false) }
    }
    printReceiptBrowser(buildReceiptHTML(plan,member,paidDates,tenant,type))
    return true
  },[])

  return {connected,connecting,printing,connect,disconnect,print}
}

// ─────────────────────────────────────────────────────────────
// PRINT HELPERS
// ─────────────────────────────────────────────────────────────
function printReceiptBrowser(html) {
  const w = window.open('','_blank','width=340,height=620')
  if(!w){toast.error('Pemit popup pou sit sa.');return}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff;font-family:'Courier New',monospace;font-size:10px}
    @media print{@page{margin:0;size:80mm auto}body{margin:0}}</style></head><body>${html}</body></html>`)
  w.document.close()
  w.onload=()=>setTimeout(()=>{w.focus();w.print();setTimeout(()=>w.close(),1000)},200)
}

function buildReceiptHTML(plan, member, paidDates=[], tenant, type='peman') {
  const biz    = tenant?.businessName||tenant?.name||'PLUS GROUP'
  const logo   = tenant?.logoUrl?`<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`:`<div style="font-size:20px;text-align:center">🏦</div>`
  const txDate = new Date().toLocaleDateString('fr-HT')+' '+new Date().toLocaleTimeString('fr-HT',{hour:'2-digit',minute:'2-digit'})
  const isOwner= member.isOwnerSlot
  const payout = isOwner ? ownerPayout(plan) : memberPayout(plan)
  const totalPaid=Object.keys(member.payments||{}).filter(d=>member.payments[d]).length
  const amtPaid=totalPaid*plan.amount
  const fineTotal=Object.values(member.fines||{}).reduce((a,b)=>a+Number(b),0)
  const fmtAmt=(n)=>Number(n||0).toLocaleString('fr-HT',{minimumFractionDigits:0})

  return `<div style="width:80mm;padding:4mm 3mm;background:#fff;color:#1a1a1a;font-family:'Courier New',monospace;font-size:10px;line-height:1.5">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:5px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- SABOTAY SOL --</div>
      ${tenant?.phone?`<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>`:''}
      ${tenant?.address?`<div style="font-size:9px;color:#555">${tenant.address}</div>`:''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:5px">
      ${type==='peman'?'RESI PEMAN':type==='tirage'?'RESI TIRAJ AVÈG':'KONT MANM'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Plan:</span><span style="font-weight:700">${plan.name}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Dat:</span><span>${txDate}</span></div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid ${isOwner?'#C9A84C':'#ccc'};margin-bottom:5px;font-size:9px">
      <div style="font-weight:700">${member.name}${isOwner?' ★':''}</div>
      ${member.phone?`<div>${member.phone}</div>`:''}
      <div>Pozisyon #${member.position}</div>
    </div>
    <div style="border-top:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
      ${type==='peman'?`
        <div style="font-weight:700;margin-bottom:3px">Dat Peye:</div>
        ${paidDates.map(d=>`<div style="display:flex;justify-content:space-between"><span>${d.split('-').reverse().join('/')}</span><span style="font-weight:600;color:#16a34a">+${fmtAmt(plan.amount)} HTG</span></div>`).join('')}
        ${fineTotal>0?`<div style="display:flex;justify-content:space-between;color:#e74c3c"><span>Amand:</span><span>+${fmtAmt(fineTotal)} HTG</span></div>`:''}
        <div style="border-top:2px solid #111;padding-top:4px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:Arial;font-weight:900;font-size:12px">TOTAL</span>
          <span style="font-family:Arial;font-weight:900;font-size:13px;color:#16a34a">${fmtAmt(paidDates.length*plan.amount+fineTotal)} HTG</span>
        </div>
      `:type==='tirage'?`
        <div style="text-align:center;padding:8px 0">
          <div style="font-size:9px;color:#555;margin-bottom:4px">Moun Chwazi pa Tiraj:</div>
          <div style="font-family:Arial;font-weight:900;font-size:14px">${member.name}</div>
          <div style="font-size:9px;color:#555">Pozisyon #${member.position}</div>
          <div style="margin-top:6px;font-family:Arial;font-weight:900;font-size:13px;color:#C9A84C">Touche: ${fmtAmt(payout)} HTG</div>
        </div>
      `:`
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Peman fè:</span><span>${totalPaid}/${plan.maxMembers}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Kontribye:</span><span style="font-weight:700;color:#16a34a">${fmtAmt(amtPaid)} HTG</span></div>
        ${fineTotal>0?`<div style="display:flex;justify-content:space-between;margin-bottom:2px;color:#e74c3c"><span>Total Amand:</span><span>${fmtAmt(fineTotal)} HTG</span></div>`:''}
        <div style="border-top:2px solid #111;padding-top:4px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:Arial;font-weight:900;font-size:12px">PRYIM SOL</span>
          <span style="font-family:Arial;font-weight:900;font-size:13px;color:#C9A84C">${fmtAmt(payout)} HTG</span>
        </div>
      `}
    </div>
    ${plan.regleman?`<div style="border-top:1px dashed #ccc;padding-top:4px;margin-top:4px;font-size:8px;color:#555"><div style="font-weight:700;margin-bottom:2px">Regleman Sol:</div>${plan.regleman.substring(0,200)}</div>`:''}
    <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px;margin-top:5px">
      <div style="font-weight:700;font-size:10px">Mèsi! / Merci!</div>
      <div style="color:#666;font-size:8px;margin-top:2px">PlusGroup — Tel: +50942449024</div>
    </div>
  </div>`
}

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
function PayBadge({paid,small}) {
  const sz = small?{padding:'2px 7px',fontSize:9}:{padding:'4px 10px',fontSize:11}
  return (
    <span style={{...sz,borderRadius:20,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4,
      background:paid?D.greenBg:D.redBg,color:paid?D.green:D.red,border:`1px solid ${paid?D.green:D.red}25`}}>
      {paid?<CheckCircle size={small?9:11}/>:<Clock size={small?9:11}/>}
      {paid?'Peye':'Pa Peye'}
    </span>
  )
}

function PrinterBtn({printer}) {
  return (
    <button onClick={printer.connected?printer.disconnect:printer.connect} disabled={printer.connecting}
      style={{display:'flex',alignItems:'center',gap:5,padding:'9px 13px',borderRadius:10,border:'none',
        cursor:'pointer',fontWeight:700,fontSize:12,transition:'all 0.2s',flexShrink:0,
        background:printer.connected?'rgba(39,174,96,0.15)':'rgba(255,255,255,0.06)',
        color:printer.connected?D.green:D.muted}}>
      {printer.connecting
        ?<span style={{width:13,height:13,border:`2px solid ${D.muted}40`,borderTopColor:D.muted,borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block'}}/>
        :printer.connected?<Bluetooth size={14}/>:<BluetoothOff size={14}/>}
      <span className="printer-label">{printer.connected?'Printer OK':'Printer'}</span>
    </button>
  )
}

function Modal({onClose,title,children,width=540}) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',
      display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div className="m-sheet" style={{background:D.card,border:`1px solid ${D.border}`,
        borderRadius:'20px 20px 0 0',width:'100%',maxWidth:width,
        maxHeight:'95vh',overflowY:'auto',boxShadow:'0 -8px 48px rgba(0,0,0,0.7)',
        animation:'sheetUp 0.26s cubic-bezier(0.32,0.72,0,1)'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 2px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:'rgba(255,255,255,0.12)'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 20px 14px',borderBottom:`1px solid ${D.border}`,
          position:'sticky',top:0,background:D.card,zIndex:1}}>
          <h2 className="modal-title" style={{fontSize:15,fontWeight:800,color:'#fff',margin:0}}>{title}</h2>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'none',
            background:'rgba(255,255,255,0.06)',color:D.muted,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <X size={16}/>
          </button>
        </div>
        <div className="modal-body" style={{padding:'18px 20px 28px'}}>{children}</div>
      </div>
    </div>
  )
}

const Sec = ({icon,title,children,col}) => (
  <div style={{background:`rgba(${col||'201,168,76'},0.03)`,border:`1px solid rgba(${col||'201,168,76'},0.12)`,
    borderRadius:12,padding:'13px 14px',marginBottom:12}}>
    <p style={{fontSize:10,fontWeight:800,color:col?`rgb(${col})`:D.gold,textTransform:'uppercase',
      letterSpacing:'0.07em',margin:'0 0 11px',display:'flex',alignItems:'center',gap:6}}>
      <span>{icon}</span>{title}
    </p>
    {children}
  </div>
)

// ─────────────────────────────────────────────────────────────
// MODAL: KREYE / EDITE PLAN
// ─────────────────────────────────────────────────────────────
function ModalCreatePlan({onClose,onSave,loading,initialData=null}) {
  const isEdit = !!initialData
  const [form,setForm] = useState({
    name:'',amount:'',feePerMember:'',penalty:'',
    frequency:'daily',interval:1,maxMembers:'',dueTime:'08:00',regleman:'',startDate:'',
    ...(initialData||{}),
    // ✅ Konvèti startDate pou input[type=date] (YYYY-MM-DD)
    startDate: initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })
  const set=(k,v)=>setForm(p=>({...p,[k]:v}))

  const amt=Number(form.amount)||0, max=Number(form.maxMembers)||0
  const fee=Number(form.feePerMember)||0, intervalN=Math.max(1,Number(form.interval)||1)
  const isOwner=fee>0&&fee===amt
  const totalPool=amt*max, payoutM=totalPool-fee, payoutO=totalPool
  const freqLabel=freqIntervalLabel(form.frequency,intervalN)

  return (
    <Modal onClose={onClose} title={isEdit?'✏️ Modifye Plan':'✚ Kreye Plan Sabotay'} width={560}>
      <div style={{display:'flex',flexDirection:'column',gap:0}}>

        <Sec icon="📋" title="Enfòmasyon Plan">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={lbl}>Non Plan *</label>
              <input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ex: Sol 500 Samdi"/>
            </div>
            <div>
              <label style={lbl}>Montan / Moun (HTG) *</label>
              <input type="number" style={{...inp,color:D.gold,fontWeight:800,fontSize:16,textAlign:'center'}}
                value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="500"/>
            </div>
            <div>
              <label style={lbl}>Kantite Moun Max *</label>
              <input type="number" style={{...inp,color:D.blue,fontWeight:700}}
                value={form.maxMembers} onChange={e=>set('maxMembers',e.target.value)} placeholder="20"/>
            </div>
            <div>
              <label style={lbl}>Lè Peman *</label>
              <input type="time" style={{...inp,color:D.purple,fontWeight:700}}
                value={form.dueTime} onChange={e=>set('dueTime',e.target.value)}/>
            </div>
            {/* ✅ NOUVO: champ startDate */}
            <div>
              <label style={lbl}>Dat Kòmanse Sol *</label>
              <input type="date" style={{...inp,color:D.teal,fontWeight:700}}
                value={form.startDate} onChange={e=>set('startDate',e.target.value)}/>
            </div>
          </div>
        </Sec>

        <Sec icon="💰" title="Frè & Amand" col="243,156,18">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lbl}>Frè pa Manm ki Touche (HTG)</label>
              <input type="number" style={{...inp,color:D.orange}}
                value={form.feePerMember} onChange={e=>set('feePerMember',e.target.value)} placeholder="0"/>
              <p style={{fontSize:10,color:D.muted,margin:'5px 0 0',lineHeight:1.5}}>
                Dedwi sou payout moun ki touche a sèlman.
                {fee>0&&fee===amt&&<><br/><strong style={{color:D.gold}}>= Montan → Plas Pwopriyete Sol ajoute!</strong></>}
              </p>
            </div>
            <div>
              <label style={lbl}>Amand pou Reta (HTG)</label>
              <input type="number" style={{...inp,color:D.red}}
                value={form.penalty} onChange={e=>set('penalty',e.target.value)} placeholder="0"/>
              <p style={{fontSize:10,color:D.muted,margin:'5px 0 0'}}>
                Admin ka ajoute l sou peman reta
              </p>
            </div>
          </div>
          {isOwner&&amt>0&&max>0&&(
            <div style={{marginTop:10,background:'rgba(201,168,76,0.08)',border:`1px solid ${D.gold}30`,
              borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'flex-start',gap:10}}>
              <Shield size={18} style={{color:D.gold,flexShrink:0,marginTop:1}}/>
              <div style={{fontSize:11,color:D.muted,lineHeight:1.6}}>
                <span style={{color:D.gold,fontWeight:800}}>Plas #{max+1} = {OWNER_SLOT_NAME} ajoute otomatik</span><br/>
                Manm regilye touche: <strong style={{color:D.green}}>{fmt(payoutM)} HTG</strong><br/>
                Pwopriyetè touche: <strong style={{color:D.gold}}>{fmt(payoutO)} HTG</strong>
              </div>
            </div>
          )}
          {fee>0&&!isOwner&&amt>0&&(
            <div style={{marginTop:10,background:D.orangeBg,border:`1px solid ${D.orange}30`,
              borderRadius:10,padding:'9px 13px',fontSize:11,color:D.muted}}>
              <span style={{color:D.orange,fontWeight:700}}>Frè simple:</span>{' '}
              Manm touche <strong style={{color:D.green}}>{fmt(totalPool)} − {fmt(fee)} = {fmt(payoutM)} HTG</strong>
            </div>
          )}
        </Sec>

        <Sec icon="🗓" title="Frekans Peman">
          <div className="freq-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8}}>
            {Object.entries(FREQ_LABELS).map(([val,labels])=>(
              <button key={val} className="freq-btn" onClick={()=>set('frequency',val)} style={{
                padding:'9px 6px',borderRadius:9,cursor:'pointer',fontSize:11,fontWeight:600,
                border:`1.5px solid ${form.frequency===val?D.gold:D.borderSub}`,
                background:form.frequency===val?D.goldDim:'transparent',
                color:form.frequency===val?D.gold:D.muted,transition:'all 0.15s'}}>
                {labels.ht}
              </button>
            ))}
          </div>
          <div style={{marginTop:14,borderTop:`1px solid ${D.borderSub}`,paddingTop:13}}>
            <label style={lbl}>Repete Chak Konbyen Fwa?</label>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              {[1,2,3,4].map(n=>(
                <button key={n} onClick={()=>set('interval',n)} style={{
                  width:40,height:40,borderRadius:10,cursor:'pointer',
                  fontFamily:'monospace',fontWeight:800,fontSize:14,flexShrink:0,
                  border:`1.5px solid ${intervalN===n?D.gold:D.borderSub}`,
                  background:intervalN===n?D.goldDim:'transparent',
                  color:intervalN===n?D.gold:D.muted,transition:'all 0.15s'}}>
                  {n}
                </button>
              ))}
              <input type="number" min="1" max="52" value={form.interval}
                onChange={e=>set('interval',Math.max(1,Number(e.target.value)||1))}
                style={{...inp,width:70,textAlign:'center',fontFamily:'monospace',
                  fontWeight:800,color:intervalN>4?D.gold:D.muted,fontSize:15,padding:'8px 6px'}}/>
              <div style={{flex:1,minWidth:110,background:D.goldDim,borderRadius:9,padding:'8px 12px',
                border:`1px solid ${D.border}`,display:'flex',alignItems:'center',gap:7}}>
                <span style={{fontSize:11,color:D.muted}}>Rezilta:</span>
                <span style={{fontSize:12,fontWeight:800,color:D.gold}}>{freqLabel}</span>
              </div>
            </div>
          </div>
        </Sec>

        <Sec icon="📜" title="Regleman Sol (Opsyonèl)" col="20,184,166">
          <textarea rows={4} style={{...inp,resize:'vertical',lineHeight:1.6,fontSize:12}}
            value={form.regleman} onChange={e=>set('regleman',e.target.value)}
            placeholder="Ex: Tout manm dwe peye avan 8h. Peman anreta gen amand. Pa ka transfere plas san pèmisyon admin..."/>
          <p style={{fontSize:10,color:D.muted,margin:'5px 0 0'}}>
            Afiche nan kanè vityèl manm ak sou resi enprime
          </p>
        </Sec>

        {totalPool>0&&(
          <div style={{background:D.greenBg,border:`1px solid ${D.green}30`,borderRadius:12,
            padding:'12px 16px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              {[
                {label:'Pool Total',val:`${fmt(totalPool)} HTG`,color:D.blue},
                {label:'Manm Touche',val:`${fmt(payoutM)} HTG`,color:D.green},
                isOwner?{label:'Pwopriyetè',val:`${fmt(payoutO)} HTG`,color:D.gold}:null,
                Number(form.penalty)>0?{label:'Amand Reta',val:`${fmt(form.penalty)} HTG`,color:D.red}:null,
              ].filter(Boolean).map(({label,val,color})=>(
                <div key={label} style={{textAlign:'center',flex:1,minWidth:80}}>
                  <div style={{fontSize:9,color:D.muted,textTransform:'uppercase',marginBottom:3}}>{label}</div>
                  <div style={{fontFamily:'monospace',fontWeight:900,fontSize:14,color}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:10,
            border:`1px solid ${D.borderSub}`,background:'transparent',color:D.muted,cursor:'pointer',fontWeight:700}}>
            Anile
          </button>
          <button disabled={loading} onClick={()=>{
            if(!form.name||!form.amount||!form.maxMembers) return toast.error('Non, montan, ak kantite moun obligatwa.')
            onSave({...form,amount:Number(form.amount),feePerMember:Number(form.feePerMember||0),
              penalty:Number(form.penalty||0),maxMembers:Number(form.maxMembers),
              dueTime:form.dueTime||'08:00',interval:intervalN,
              startDate:form.startDate||new Date().toISOString().split('T')[0]})
          }} style={{flex:2,padding:'12px',borderRadius:10,border:'none',
            cursor:loading?'default':'pointer',
            background:loading?'rgba(201,168,76,0.3)':D.goldBtn,
            color:'#0a1222',fontWeight:800,fontSize:14,
            display:'flex',alignItems:'center',justifyContent:'center',gap:7,
            boxShadow:'0 4px 16px rgba(201,168,76,0.28)'}}>
            {loading?<Loader size={15} style={{animation:'spin 0.8s linear infinite'}}/>:<Plus size={15}/>}
            {loading?'Ap sove...':(isEdit?'Sove Chanjman':'Kreye Plan')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: ENSKRI KLIYAN
// ─────────────────────────────────────────────────────────────
function ModalAddMember({plan,onClose,onSave,loading}) {
  const slots    = totalSlots(plan)
  const taken    = new Set((plan.members||[]).map(m=>m.position))
  const available= Array.from({length:slots},(_,i)=>i+1).filter(p=>!taken.has(p))
  const [form,setForm]   = useState({name:'',phone:''})
  const [position,setPos]= useState(available[0]||null)
  const [showCreds,setCreds]= useState(null)

  if(showCreds) return <ModalMemberCredentials member={showCreds.member} credentials={showCreds.credentials} onClose={onClose}/>

  const isOwnerPos = hasOwnerSlot(plan) && position===slots
  const isFull     = available.length===0

  return (
    <Modal onClose={onClose} title="👤 Enskri Kliyan" width={460}>
      {isFull?(
        <div style={{textAlign:'center',padding:'24px 0'}}>
          <AlertCircle size={40} style={{color:D.red,marginBottom:12}}/>
          <p style={{color:D.red,fontWeight:700,fontSize:15}}>Plan sa a plen! ({plan.members?.length}/{slots} plas)</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <label style={lbl}>Chwazi Plas *</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {available.map(p=>{
                const isOwn = hasOwnerSlot(plan)&&p===slots
                return (
                  <button key={p} onClick={()=>setPos(p)} style={{
                    width:44,height:44,borderRadius:10,cursor:'pointer',
                    fontFamily:'monospace',fontWeight:800,fontSize:13,position:'relative',
                    border:`2px solid ${position===p?(isOwn?D.gold:D.blue):D.borderSub}`,
                    background:position===p?(isOwn?D.goldDim:D.blueBg):'transparent',
                    color:position===p?(isOwn?D.gold:D.blue):D.muted,transition:'all 0.12s'}}>
                    #{p}
                    {isOwn&&<span style={{position:'absolute',top:-4,right:-4,fontSize:8,
                      background:D.gold,color:'#0a1222',borderRadius:6,padding:'1px 3px',fontWeight:900}}>★</span>}
                  </button>
                )
              })}
            </div>
            {isOwnerPos&&(
              <div style={{marginTop:8,background:D.goldDim,borderRadius:8,padding:'7px 11px',
                fontSize:11,color:D.gold,display:'flex',alignItems:'center',gap:7}}>
                <Shield size={13}/> Plas #{position} = <strong>{OWNER_SLOT_NAME}</strong> — Touche {fmt(ownerPayout(plan))} HTG
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>Non Kliyan *</label>
            <input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Non ak Prenon"/>
          </div>
          <div>
            <label style={lbl}>Telefòn *</label>
            <input style={{...inp,fontSize:16}} inputMode="tel" value={form.phone}
              onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+509 XXXX XXXX"/>
          </div>

          <div style={{background:D.goldDim,borderRadius:10,padding:'10px 14px',fontSize:11,color:D.muted}}>
            <span style={{color:D.gold,fontWeight:700}}>Enfòmasyon Sol:</span>
            <div style={{marginTop:5,display:'flex',gap:10,flexWrap:'wrap'}}>
              <span>💰 {fmt(plan.amount)} HTG / {freqIntervalLabel(plan.frequency,plan.interval)}</span>
              <span>👥 {plan.members?.length||0}/{slots} plas</span>
              <span>🏆 Manm touche: {fmt(memberPayout(plan))} HTG</span>
            </div>
          </div>

          {!isOwnerPos&&(
            <div style={{background:D.purpleBg,border:`1px solid rgba(155,89,182,0.15)`,
              borderRadius:10,padding:'9px 13px',fontSize:11,color:D.muted,
              display:'flex',alignItems:'center',gap:8}}>
              <Key size={13} style={{color:D.purple,flexShrink:0}}/>
              <span>Sistèm ap <strong style={{color:D.purple}}>kreye yon kont</strong> otomatikman pou kliyan an.</span>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:10,
              border:`1px solid ${D.borderSub}`,background:'transparent',color:D.muted,cursor:'pointer',fontWeight:700}}>
              Anile
            </button>
            <button disabled={loading||!position} onClick={()=>{
              if(!form.name||!form.phone) return toast.error('Non ak telefòn obligatwa.')
              if(!position) return toast.error('Chwazi yon plas.')
              const credentials = generateCredentials(form.name,form.phone)
              const isOwnerSlot = hasOwnerSlot(plan)&&position===slots
              // ✅ Pase _cb kòm pati nan data objè (pa kòm 2yèm argument)
              onSave({
                ...form, position, credentials, isOwnerSlot,
                _cb:(saved)=>setCreds({member:saved||{...form,position}, credentials})
              })
            }} style={{flex:2,padding:'12px',borderRadius:10,border:'none',
              cursor:loading?'default':'pointer',
              background:loading?'rgba(201,168,76,0.3)':D.goldBtn,
              color:'#0a1222',fontWeight:800,fontSize:14,
              display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
              {loading?<Loader size={15} style={{animation:'spin 0.8s linear infinite'}}/>:<Users size={15}/>}
              {loading?'Ap enskri...':'Enskri + Kreye Kont'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: KREDANSYÈL
// ─────────────────────────────────────────────────────────────
function ModalMemberCredentials({member,credentials,onClose}) {
  const [copied,setCopied] = useState(false)
  const text = `Non: ${member.name}\nItilizatè: ${credentials.username}\nModpas: ${credentials.password}\nURL: https://app.plusgroupe.com/app/sol/login`
  const copy = ()=>navigator.clipboard?.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})

  return (
    <Modal onClose={onClose} title="🔑 Kont Kliyan Kreye!" width={400}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:D.greenBg,border:`1px solid ${D.green}30`,borderRadius:12,
          padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
          <UserCheck size={22} style={{color:D.green,flexShrink:0}}/>
          <div>
            <p style={{fontSize:13,fontWeight:800,color:D.green,margin:0}}>Kont kreye pou {member.name}</p>
            <p style={{fontSize:11,color:D.muted,margin:'2px 0 0'}}>Kliyan ka konekte pou wè kont li</p>
          </div>
        </div>
        <div style={{background:D.purpleBg,border:`1px solid rgba(155,89,182,0.20)`,borderRadius:14,padding:'16px'}}>
          <p style={{fontSize:10,fontWeight:800,color:D.purple,textTransform:'uppercase',margin:'0 0 12px',
            letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:6}}>
            <Key size={11}/> Enfòmasyon Koneksyon
          </p>
          <div>
            <div style={{fontSize:10,color:D.muted,marginBottom:4}}>URL Login</div>
            <div style={{fontFamily:'monospace',fontSize:11,color:D.teal,
              background:'rgba(0,0,0,0.25)',padding:'7px 12px',borderRadius:8,marginBottom:10,wordBreak:'break-all'}}>
              app.plusgroupe.com/app/sol/login
            </div>
            <div style={{fontSize:10,color:D.muted,marginBottom:4}}>Non Itilizatè</div>
            <div style={{fontFamily:'monospace',fontWeight:800,fontSize:18,color:D.text,
              background:'rgba(0,0,0,0.25)',padding:'10px 14px',borderRadius:8,wordBreak:'break-all',marginBottom:10}}>
              {credentials.username}
            </div>
            <div style={{fontSize:10,color:D.muted,marginBottom:4}}>Modpas Pwovizwa</div>
            <div style={{fontFamily:'monospace',fontWeight:800,fontSize:22,color:D.gold,
              background:'rgba(0,0,0,0.25)',padding:'10px 14px',borderRadius:8,
              letterSpacing:'0.15em',textAlign:'center'}}>
              {credentials.password}
            </div>
          </div>
        </div>
        <p style={{fontSize:11,color:D.muted,margin:0,background:D.redBg,borderRadius:8,padding:'8px 12px'}}>
          ⚠️ Note modpas sa kounye a. Kliyan dwe chanje l apre premye koneksyon.
        </p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={copy} style={{flex:1,padding:'11px',borderRadius:10,
            border:`1px solid ${D.borderSub}`,background:'rgba(255,255,255,0.05)',
            color:copied?D.green:D.muted,cursor:'pointer',fontWeight:700,fontSize:13}}>
            {copied?'✅ Kopye!':'📋 Kopye'}
          </button>
          <button onClick={onClose} style={{flex:2,padding:'11px',borderRadius:10,border:'none',
            background:D.goldBtn,color:'#0a1222',cursor:'pointer',fontWeight:800,fontSize:13}}>
            Fèmen
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: TIRAJ AVÈG
// ─────────────────────────────────────────────────────────────
function ModalBlindDraw({plan,onClose,onConfirm,loading}) {
  const eligible = (plan.members||[]).filter(m=>!m.hasWon&&!m.isOwnerSlot)
  const [chosen,setChosen] = useState(null)
  const [drawn,setDrawn]   = useState(false)
  const [spinning,setSpin] = useState(false)

  const draw = ()=>{
    if(!eligible.length) return
    setSpin(true)
    let count=0
    const max=20+Math.floor(Math.random()*10)
    const iv = setInterval(()=>{
      setChosen(eligible[Math.floor(Math.random()*eligible.length)])
      count++
      if(count>=max){
        clearInterval(iv)
        const winner = eligible[Math.floor(Math.random()*eligible.length)]
        setChosen(winner); setDrawn(true); setSpin(false)
      }
    },80)
  }

  return (
    <Modal onClose={onClose} title="🎲 Tiraj Avèg — San Men" width={460}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {eligible.length===0?(
          <div style={{textAlign:'center',padding:'24px 0',color:D.muted}}>
            <Trophy size={36} style={{marginBottom:10,opacity:0.4,display:'block',margin:'0 auto 10px'}}/>
            <p>Pa gen manm disponib pou tiraj.</p>
          </div>
        ):(
          <>
            <div style={{background:D.blueBg,border:`1px solid ${D.blue}30`,borderRadius:12,
              padding:'10px 14px',fontSize:11,color:D.muted,display:'flex',gap:8,alignItems:'center'}}>
              <Shuffle size={14} style={{color:D.blue,flexShrink:0}}/>
              <span>Admin ap fouye men nan lis la — sistèm ap anrejistre moun ki touche a.</span>
            </div>

            <div style={{background:chosen?D.goldDim:'rgba(255,255,255,0.03)',
              border:`2px solid ${chosen&&drawn?D.gold:D.borderSub}`,
              borderRadius:16,padding:'24px',textAlign:'center',minHeight:120,
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              transition:'all 0.3s'}}>
              {!chosen&&!spinning&&(
                <p style={{color:D.muted,fontSize:13,margin:0}}>Klike "Tire" pou kòmanse</p>
              )}
              {(chosen||spinning)&&(
                <div style={{animation:drawn?'pop 0.4s ease':'none'}}>
                  <p style={{fontSize:10,color:D.muted,textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 8px'}}>
                    {spinning?'🎲 Ap tire...':'🏆 Moun Chwazi'}
                  </p>
                  <p style={{fontSize:22,fontWeight:900,color:drawn?D.gold:D.muted,margin:'0 0 4px',
                    filter:spinning?'blur(2px)':'none',transition:'filter 0.1s'}}>
                    {chosen.name}
                  </p>
                  <p style={{fontSize:12,color:D.muted,margin:'0 0 8px'}}>
                    Pozisyon #{chosen.position} • {chosen.phone}
                  </p>
                  {drawn&&(
                    <div style={{background:D.greenBg,border:`1px solid ${D.green}40`,borderRadius:10,
                      padding:'8px 16px',display:'inline-block'}}>
                      <span style={{fontFamily:'monospace',fontWeight:900,fontSize:16,color:D.green}}>
                        {fmt(memberPayout(plan))} HTG
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{maxHeight:160,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
              {eligible.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'7px 11px',borderRadius:8,
                  background:chosen?.id===m.id?D.goldDim:'rgba(255,255,255,0.02)',
                  border:`1px solid ${chosen?.id===m.id?D.gold:'transparent'}`,transition:'all 0.15s'}}>
                  <span style={{fontSize:12,color:D.text,fontWeight:chosen?.id===m.id?800:400}}>
                    #{m.position} {m.name}
                  </span>
                  <span style={{fontSize:11,color:D.muted}}>{m.phone}</span>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:10}}>
              {!drawn?(
                <button onClick={draw} disabled={spinning} style={{flex:1,padding:'13px',borderRadius:12,
                  border:'none',cursor:spinning?'default':'pointer',
                  background:spinning?'rgba(59,130,246,0.3)':`linear-gradient(135deg,${D.blue},#1d4ed8)`,
                  color:'#fff',fontWeight:800,fontSize:14,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {spinning
                    ?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',
                        borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.5s linear infinite',
                        display:'inline-block'}}/> Ap tire...</>
                    :<><Shuffle size={16}/> Tire</>}
                </button>
              ):(
                <>
                  <button onClick={()=>{setChosen(null);setDrawn(false)}} style={{flex:1,padding:'12px',
                    borderRadius:10,border:`1px solid ${D.borderSub}`,background:'transparent',
                    color:D.muted,cursor:'pointer',fontWeight:700}}>
                    Tire Ankò
                  </button>
                  <button onClick={()=>onConfirm(chosen)} disabled={loading} style={{flex:2,padding:'12px',
                    borderRadius:10,border:'none',cursor:loading?'default':'pointer',
                    background:loading?'rgba(201,168,76,0.3)':D.goldBtn,
                    color:'#0a1222',fontWeight:800,fontSize:14,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                    {loading?<Loader size={14} style={{animation:'spin 0.8s linear infinite'}}/>:<Trophy size={14}/>}
                    {loading?'Ap konfime...':`Konfime ${chosen.name}`}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: MARK PAYMENT + AMAND
// ─────────────────────────────────────────────────────────────
function ModalMarkPayment({member,plan,onClose,onSave,printer}) {
  const {tenant} = useAuthStore()
  const slots    = totalSlots(plan)
  // ✅ itilize startDate (pa createdAt)
  const dates    = useMemo(()=>getPaymentDates(plan.frequency,getPlanStartDate(plan),slots,plan.interval),[plan])
  const today    = new Date().toISOString().split('T')[0]
  const unpaid   = dates.filter(d=>d<=today&&!member.payments?.[d])

  const [sel,setSel]        = useState(unpaid.length===1?[unpaid[0]]:[])
  const [applyFine,setFine] = useState(false)
  const toggle = (d)=>setSel(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d])

  const hasPenalty = Number(plan.penalty)>0
  const lateDates  = sel.filter(d=>d<today)
  const fineAmt    = hasPenalty&&applyFine ? lateDates.length*Number(plan.penalty) : 0
  const baseAmt    = sel.length*Number(plan.amount)
  const totalAmt   = baseAmt+fineAmt

  const handleConfirm = async()=>{
    if(!sel.length) return toast.error('Chwazi omwen yon dat.')
    const timings={}; sel.forEach(d=>{timings[d]=getPaymentTiming(plan,d)})
    const fines={}
    if(applyFine&&hasPenalty) lateDates.forEach(d=>{fines[d]=Number(plan.penalty)})
    onSave(sel,timings,fines)
    await printer.print(plan,member,sel,tenant,'peman')
  }

  return (
    <Modal onClose={onClose} title={`✅ Mache Peye — ${member.name}`} width={480}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:D.goldDim,borderRadius:10,padding:'10px 14px',fontSize:12,color:D.muted}}>
          <span style={{color:D.gold,fontWeight:700}}>Plan: </span>{plan.name} •
          <span style={{color:D.gold,fontWeight:700}}> {fmt(plan.amount)} HTG / dat</span>
          {hasPenalty&&<span style={{color:D.red}}> • Amand reta: {fmt(plan.penalty)} HTG</span>}
        </div>

        {unpaid.length===0?(
          <div style={{textAlign:'center',padding:'20px 0',color:D.green}}>
            <CheckCircle size={36} style={{marginBottom:8,display:'block',margin:'0 auto 8px'}}/>
            <p style={{fontWeight:700}}>Kliyan sa a ajou nan tout peman l!</p>
          </div>
        ):(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{fontSize:11,color:D.muted,margin:0}}>Chwazi dat ou vle mache kòm peye:</p>
              <button onClick={()=>setSel(unpaid)} style={{fontSize:10,color:D.blue,
                background:'none',border:'none',cursor:'pointer',fontWeight:700}}>
                Tout chwazi
              </button>
            </div>

            <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
              {unpaid.map(d=>{
                const isLate=d<today
                return (
                  <div key={d} className="pay-date-row" onClick={()=>toggle(d)} style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'10px 13px',borderRadius:9,cursor:'pointer',
                    background:sel.includes(d)?D.greenBg:'rgba(255,255,255,0.03)',
                    border:`1px solid ${sel.includes(d)?`${D.green}40`:D.borderSub}`,transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontFamily:'monospace',fontSize:12,color:D.text}}>{d.split('-').reverse().join('/')}</span>
                      {isLate&&<span style={{fontSize:9,background:D.orangeBg,color:D.orange,
                        padding:'1px 6px',borderRadius:8,fontWeight:700}}>⚠️ Reta</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:D.gold}}>{fmt(plan.amount)} HTG</span>
                      <div style={{width:18,height:18,borderRadius:5,flexShrink:0,
                        border:`2px solid ${sel.includes(d)?D.green:D.borderSub}`,
                        background:sel.includes(d)?D.green:'transparent',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {sel.includes(d)&&<CheckCircle size={11} color="#fff"/>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {hasPenalty&&lateDates.length>0&&sel.some(d=>d<today)&&(
              <div onClick={()=>setFine(p=>!p)} style={{display:'flex',alignItems:'center',gap:10,
                padding:'10px 13px',borderRadius:10,cursor:'pointer',
                background:applyFine?D.redBg:'rgba(255,255,255,0.03)',
                border:`1px solid ${applyFine?`${D.red}40`:D.borderSub}`,transition:'all 0.15s'}}>
                <div style={{width:18,height:18,borderRadius:5,flexShrink:0,
                  border:`2px solid ${applyFine?D.red:D.borderSub}`,
                  background:applyFine?D.red:'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {applyFine&&<CheckCircle size={11} color="#fff"/>}
                </div>
                <div style={{flex:1}}>
                  <span style={{fontSize:12,fontWeight:700,color:applyFine?D.red:D.muted}}>Ajoute Amand Reta</span>
                  <span style={{fontSize:11,color:D.muted,marginLeft:8}}>
                    {lateDates.length} dat × {fmt(plan.penalty)} = <strong style={{color:D.red}}>{fmt(lateDates.length*Number(plan.penalty))} HTG</strong>
                  </span>
                </div>
                <AlertTriangle size={14} style={{color:D.red,flexShrink:0}}/>
              </div>
            )}

            <div style={{background:D.greenBg,borderRadius:10,padding:'10px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:fineAmt>0?4:0}}>
                <span style={{fontSize:12,color:D.green,fontWeight:700}}>Peman ({sel.length} dat):</span>
                <span style={{fontFamily:'monospace',fontWeight:800,color:D.green}}>{fmt(baseAmt)} HTG</span>
              </div>
              {fineAmt>0&&(
                <>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:D.red}}>+ Amand:</span>
                    <span style={{fontFamily:'monospace',fontWeight:700,color:D.red}}>{fmt(fineAmt)} HTG</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${D.green}30`,paddingTop:6}}>
                    <span style={{fontSize:12,color:D.green,fontWeight:800}}>TOTAL:</span>
                    <span style={{fontFamily:'monospace',fontWeight:900,color:D.green,fontSize:14}}>{fmt(totalAmt)} HTG</span>
                  </div>
                </>
              )}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:10,
                border:`1px solid ${D.borderSub}`,background:'transparent',color:D.muted,cursor:'pointer',fontWeight:700}}>
                Anile
              </button>
              <button onClick={handleConfirm} disabled={printer.printing||!sel.length} style={{
                flex:2,padding:'12px',borderRadius:10,border:'none',cursor:'pointer',
                background:D.goldBtn,color:'#0a1222',fontWeight:800,fontSize:14,
                display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                opacity:printer.printing?0.6:1}}>
                {printer.printing
                  ?<span style={{width:14,height:14,border:'2px solid rgba(0,0,0,0.2)',
                      borderTopColor:'#0a1222',borderRadius:'50%',animation:'spin 0.8s linear infinite',
                      display:'inline-block'}}/>
                  :<><CheckCircle size={15}/><Printer size={13}/></>}
                {printer.printing?'Ap enprime...':'Konfime + Enprime'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// KALANDRIYE — ✅ itilize startDate
// ─────────────────────────────────────────────────────────────
function PlanCalendar({plan}) {
  const [off,setOff] = useState(0)
  const today = new Date().toISOString().split('T')[0]
  const slots = totalSlots(plan)
  const mDates = useMemo(()=>(plan.members||[]).map(m=>({
    ...m, dates:getPaymentDates(plan.frequency,getPlanStartDate(plan),slots,plan.interval)
  })),[plan])

  const now=new Date(); now.setMonth(now.getMonth()+off)
  const yr=now.getFullYear(), mo=now.getMonth()
  const monthStr=now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
  const firstDay=new Date(yr,mo,1).getDay()
  const daysInMo=new Date(yr,mo+1,0).getDate()
  const tColor=(m,d,past)=>{
    if(!m.payments?.[d]) return past?D.red:D.blue
    const t=m.paymentTimings?.[d]
    return t==='early'?'#00d084':t==='onTime'?D.green:t==='late'?D.orange:D.green
  }

  return (
    <div style={{marginTop:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <button onClick={()=>setOff(o=>o-1)} style={{width:34,height:34,borderRadius:8,border:`1px solid ${D.border}`,background:'transparent',color:D.muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronLeft size={14}/></button>
        <span style={{fontWeight:800,fontSize:13,color:'#fff',textTransform:'capitalize'}}>{monthStr}</span>
        <button onClick={()=>setOff(o=>o+1)} style={{width:34,height:34,borderRadius:8,border:`1px solid ${D.border}`,background:'transparent',color:D.muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronRight size={14}/></button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {['Di','Lu','Ma','Me','Je','Ve','Sa'].map(d=><div key={d} style={{textAlign:'center',fontSize:9,fontWeight:800,color:D.muted,padding:'4px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{aspectRatio:'1',borderRadius:8}}/>)}
        {Array.from({length:daysInMo}).map((_,i)=>{
          const day=i+1
          const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isTd=ds===today, payors=mDates.filter(m=>m.dates.includes(ds))
          const hasA=payors.length>0, past=ds<today
          const allP=hasA&&payors.every(m=>m.payments?.[ds])
          const someP=payors.some(m=>m.payments?.[ds])
          let bg='transparent',bc='transparent',tc=D.muted
          if(isTd){bg=D.goldDim;bc=D.gold;tc=D.gold}
          else if(hasA&&allP){bg=D.greenBg;bc=`${D.green}40`;tc=D.green}
          else if(hasA&&someP){bg=D.orangeBg;bc=`${D.orange}40`;tc=D.orange}
          else if(hasA&&past){bg=D.redBg;bc=`${D.red}40`;tc=D.red}
          else if(hasA){bg='rgba(59,130,246,0.08)';bc='rgba(59,130,246,0.25)';tc=D.blue}
          return (
            <div key={day} className="cal-day" style={{aspectRatio:'1',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:bg,border:`1px solid ${bc}`}}>
              <span style={{fontSize:11,fontWeight:isTd||hasA?800:400,color:tc}}>{day}</span>
              {hasA&&<div style={{display:'flex',gap:1,marginTop:1}}>
                {payors.slice(0,3).map(m=><div key={m.id} style={{width:4,height:4,borderRadius:'50%',background:tColor(m,ds,past)}}/>)}
                {payors.length>3&&<span style={{fontSize:7,color:D.muted}}>+{payors.length-3}</span>}
              </div>}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12,fontSize:10,color:D.muted}}>
        {[['#00d084','Bonè ⚡'],[D.green,'Atètan ✅'],[D.orange,'Reta ⚠️'],[D.red,'Pa Peye'],[D.blue,'Pwochen']].map(([c,l])=>(
          <span key={l} style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:c}}/>{l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL KLIYAN — ✅ itilize startDate
// ─────────────────────────────────────────────────────────────
function MemberVirtualAccount({member,plan,onClose,printer}) {
  const {tenant} = useAuthStore()
  const slots   = totalSlots(plan)
  const dates   = useMemo(()=>getPaymentDates(plan.frequency,getPlanStartDate(plan),slots,plan.interval),[plan])
  const winDate = dates[member.position-1]
  const today   = new Date().toISOString().split('T')[0]
  const isOwner = member.isOwnerSlot

  const totalPaid=dates.filter(d=>member.payments?.[d]).length
  const totalDue=dates.filter(d=>d<=today).length
  const amtPaid=totalPaid*plan.amount
  const amtDue=totalDue*plan.amount
  const payout=isOwner?ownerPayout(plan):memberPayout(plan)
  const progress=slots>0?(totalPaid/slots)*100:0
  const isWinner=winDate&&winDate<=today&&!member.hasWon
  const scoreData=getMemberScore(member)
  const fineTotal=Object.values(member.fines||{}).reduce((a,b)=>a+Number(b),0)

  const tBadge=(t)=>{
    if(t==='early') return <span style={{fontSize:8,background:'rgba(0,208,132,0.15)',color:'#00d084',padding:'1px 5px',borderRadius:8,fontWeight:700}}>⚡ Bonè</span>
    if(t==='onTime') return <span style={{fontSize:8,background:D.greenBg,color:D.green,padding:'1px 5px',borderRadius:8,fontWeight:700}}>✅ Atètan</span>
    if(t==='late')   return <span style={{fontSize:8,background:D.orangeBg,color:D.orange,padding:'1px 5px',borderRadius:8,fontWeight:700}}>⚠️ Reta</span>
    return null
  }

  return (
    <Modal onClose={onClose} title={`💳 Kont — ${member.name}`} width={520}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:isOwner?D.goldBtn:'linear-gradient(135deg,#1B2A8F,#0d1b2a)',
          border:isOwner?'none':`1px solid ${D.border}`,
          borderRadius:14,padding:'16px 18px',color:isOwner?'#0a1222':D.text}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
            <div>
              <p style={{fontSize:17,fontWeight:900,margin:'0 0 2px',wordBreak:'break-word'}}>{member.name} {isOwner&&'★'}</p>
              <p style={{fontSize:11,opacity:0.65,margin:0}}>{member.phone}</p>
              <p style={{fontSize:10,opacity:0.6,margin:'3px 0 0'}}>Pozisyon #{member.position} • {isOwner?OWNER_SLOT_NAME:plan.name}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:9,opacity:0.6,margin:'0 0 2px',textTransform:'uppercase',fontWeight:700}}>Kontribisyon</p>
              <p style={{fontFamily:'monospace',fontWeight:900,fontSize:18,margin:'0 0 2px'}}>{fmt(amtPaid)} HTG</p>
              <p style={{fontSize:9,opacity:0.5,margin:0}}>{totalPaid}/{slots} peman</p>
            </div>
          </div>
        </div>

        {isWinner&&!isOwner&&(
          <div style={{background:D.greenBg,border:`1px solid ${D.green}50`,borderRadius:12,
            padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
            <Trophy size={22} style={{color:D.green,flexShrink:0}}/>
            <div>
              <p style={{fontSize:13,fontWeight:800,color:D.green,margin:0}}>🎉 Se Moun sa a ki Touche Jodi a!</p>
              <p style={{fontSize:11,color:D.muted,margin:'2px 0 0'}}>Montan: {fmt(payout)} HTG</p>
            </div>
          </div>
        )}

        <div className="vacct-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8}}>
          {[
            {label:'Deja Peye',    val:`${fmt(amtPaid)} HTG`,                           color:D.green},
            {label:'Rès pou Peye',val:`${fmt(Math.max(0,amtDue-amtPaid))} HTG`,         color:D.red  },
            {label:'Ap Touche',   val:`${fmt(payout)} HTG`,                             color:D.gold },
            {label:'Dat Touche',  val:winDate?winDate.split('-').reverse().join('/'):'—',color:D.blue },
          ].map(({label,val,color})=>(
            <div key={label} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:10,
              padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:9,color:D.muted,textTransform:'uppercase',fontWeight:700,marginBottom:4}}>{label}</div>
              <div style={{fontFamily:'monospace',fontWeight:800,fontSize:12,color,wordBreak:'break-word'}}>{val}</div>
            </div>
          ))}
        </div>

        {fineTotal>0&&(
          <div style={{background:D.redBg,border:`1px solid ${D.red}30`,borderRadius:10,
            padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:D.red,fontWeight:700,display:'flex',alignItems:'center',gap:7}}>
              <AlertTriangle size={14}/> Total Amand Reta
            </span>
            <span style={{fontFamily:'monospace',fontWeight:900,color:D.red}}>{fmt(fineTotal)} HTG</span>
          </div>
        )}

        <div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
            <span style={{fontSize:10,color:D.muted,fontWeight:700}}>PWOGRÈ</span>
            <span style={{fontSize:10,color:D.gold,fontWeight:800}}>{Math.round(progress)}%</span>
          </div>
          <div style={{height:8,borderRadius:8,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:D.goldBtn,borderRadius:8,transition:'width 0.5s'}}/>
          </div>
        </div>

        {scoreData&&(
          <div style={{background:D.blueBg,border:`1px solid rgba(59,130,246,0.15)`,borderRadius:12,padding:'11px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:800,color:D.blue,textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:4}}>
                <Star size={11}/>Pèfòmans
              </span>
              <span style={{fontFamily:'monospace',fontWeight:900,fontSize:16,
                color:scoreData.score>=80?'#00d084':scoreData.score>=50?D.orange:D.red}}>
                {scoreData.score}%
              </span>
            </div>
            <div style={{display:'flex',gap:10,fontSize:10,flexWrap:'wrap'}}>
              <span style={{color:'#00d084',fontWeight:700}}>⚡ {scoreData.early} bonè</span>
              <span style={{color:D.green,fontWeight:700}}>✅ {scoreData.onTime} atètan</span>
              <span style={{color:D.orange,fontWeight:700}}>⚠️ {scoreData.late} reta</span>
            </div>
          </div>
        )}

        {plan.regleman&&(
          <div style={{background:D.tealBg,border:`1px solid ${D.teal}30`,borderRadius:12,padding:'12px 14px'}}>
            <p style={{fontSize:10,fontWeight:800,color:D.teal,textTransform:'uppercase',
              letterSpacing:'0.06em',margin:'0 0 8px',display:'flex',alignItems:'center',gap:6}}>
              <FileText size={11}/> Regleman Sol la
            </p>
            <p style={{fontSize:11,color:D.muted,margin:0,lineHeight:1.7,whiteSpace:'pre-line'}}>
              {plan.regleman}
            </p>
          </div>
        )}

        <button onClick={()=>printer.print(plan,member,[],tenant,'kont')}
          disabled={printer.printing} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,
          padding:'11px',borderRadius:10,border:`1px solid ${D.border}`,
          background:'rgba(255,255,255,0.04)',color:D.muted,cursor:'pointer',
          fontWeight:700,fontSize:13,opacity:printer.printing?0.5:1}}>
          <Printer size={14}/> Enprime Kont
        </button>

        <div>
          <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',color:D.muted,margin:'0 0 8px',letterSpacing:'0.06em'}}>
            Istwa Peman ({totalPaid}/{dates.length})
          </p>
          <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
            {dates.slice(0,40).map((d,i)=>{
              const paid=!!member.payments?.[d]
              const timing=member.paymentTimings?.[d]
              const past=d<=today
              const isWin=i===member.position-1
              const fine=member.fines?.[d]
              return (
                <div key={d} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 12px',borderRadius:9,gap:6,
                  background:isWin?D.goldDim:(paid?D.greenBg:(past?D.redBg:'rgba(255,255,255,0.02)')),
                  border:`1px solid ${isWin?D.border:paid?`${D.green}20`:past?`${D.red}20`:'transparent'}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',flex:1,minWidth:0}}>
                    <span style={{fontSize:10,fontFamily:'monospace',color:D.muted,flexShrink:0}}>{d.split('-').reverse().join('/')}</span>
                    {isWin&&<span style={{fontSize:9,background:D.goldDim,color:D.gold,padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0}}>🏆</span>}
                    {paid&&tBadge(timing)}
                    {fine&&<span style={{fontSize:9,background:D.redBg,color:D.red,padding:'1px 6px',borderRadius:8,fontWeight:700,flexShrink:0}}>+{fmt(fine)} amand</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    <span style={{fontFamily:'monospace',fontSize:11,fontWeight:700,
                      color:paid?D.green:past?D.red:D.muted}}>
                      {paid?`+${fmt(plan.amount)}`:past?`-${fmt(plan.amount)}`:`${fmt(plan.amount)}`} HTG
                    </span>
                    <PayBadge paid={paid} small/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL DETAY PLAN — ✅ itilize startDate
// ─────────────────────────────────────────────────────────────
function PlanDetail({plan,onBack,onAddMember,onPaymentSaved,onBlindDraw,onEditPlan,printer}) {
  const [viewMember,setView] = useState(null)
  const [payMember,setPay]   = useState(null)
  const [tab,setTab]         = useState('members')
  const today = new Date().toISOString().split('T')[0]
  const slots = totalSlots(plan)
  const dates = useMemo(()=>getPaymentDates(plan.frequency,getPlanStartDate(plan),slots,plan.interval),[plan])

  const winIdx  = dates.findIndex(d=>d===today)
  const todayW  = winIdx>=0 ? plan.members?.[winIdx] : null
  const totColl = plan.members?.reduce((acc,m)=>
    acc+Object.keys(m.payments||{}).filter(d=>m.payments[d]).length*plan.amount, 0)||0
  const totExp  = plan.members?.reduce((acc,m)=>
    acc+dates.filter(d=>d<=today).length*plan.amount, 0)||0
  const payout  = memberPayout(plan)

  return (
    <div>
      <div className="detail-head" style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:10,border:`1px solid ${D.border}`,background:'transparent',color:D.muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <ArrowLeft size={16}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{color:D.gold,margin:0,fontSize:17,fontWeight:900,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{plan.name}</h2>
          <p style={{color:D.muted,margin:0,fontSize:11}}>{freqIntervalLabel(plan.frequency,plan.interval)} • {fmt(plan.amount)} HTG / moun</p>
        </div>
        <PrinterBtn printer={printer}/>
        <button onClick={onEditPlan} title="Modifye Plan" style={{width:34,height:34,borderRadius:9,
          border:`1px solid ${D.border}`,background:'transparent',color:D.muted,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Edit3 size={14}/>
        </button>
        <button onClick={onAddMember} style={{padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',
          background:D.goldBtn,color:'#0a1222',fontWeight:800,fontSize:12,
          display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
          <Plus size={13}/><span>Enskri</span>
        </button>
      </div>

      {todayW&&(
        <div style={{background:'linear-gradient(135deg,rgba(39,174,96,0.15),rgba(201,168,76,0.08))',
          border:`1px solid ${D.green}40`,borderRadius:14,padding:'13px 16px',marginBottom:16,
          display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div style={{width:44,height:44,borderRadius:12,background:D.goldBtn,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Trophy size={20} color="#0a1222"/>
          </div>
          <div style={{flex:1,minWidth:100}}>
            <p style={{fontSize:13,fontWeight:800,color:D.green,margin:'0 0 2px'}}>🎉 {todayW.name} ap touche jodi a!</p>
            <p style={{fontSize:11,color:D.muted,margin:0}}>
              Montan: <span style={{color:D.gold,fontWeight:700}}>{fmt(todayW.isOwnerSlot?ownerPayout(plan):payout)} HTG</span>
            </p>
          </div>
          <button style={{padding:'7px 12px',borderRadius:8,border:'none',cursor:'pointer',
            background:D.greenBg,color:D.green,fontWeight:700,fontSize:11,flexShrink:0,
            display:'flex',alignItems:'center',gap:5}}>
            <Bell size={13}/> Notifye
          </button>
        </div>
      )}

      <div className="detail-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:9,marginBottom:16}}>
        {[
          {label:'Plas',       val:`${plan.members?.length||0}/${slots}`, color:D.blue },
          {label:'Kolekte',    val:`${fmt(totColl)} HTG`,                  color:D.green},
          {label:'Rès Atann',  val:`${fmt(Math.max(0,totExp-totColl))} HTG`, color:D.red},
          {label:'Manm Touche',val:`${fmt(payout)} HTG`,                   color:D.gold },
        ].map(({label,val,color})=>(
          <div key={label} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:10,padding:'11px 13px',textAlign:'center'}}>
            <div style={{fontSize:9,color:D.muted,textTransform:'uppercase',fontWeight:700,marginBottom:3}}>{label}</div>
            <div style={{fontFamily:'monospace',fontWeight:800,fontSize:12,color,wordBreak:'break-word'}}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        {[['members','👥 Manm'],['calendar','📅 Kalandriye'],['regleman','📜 Regleman']].map(([t,l])=>(
          <button key={t} className="tab-btn" onClick={()=>setTab(t)} style={{
            padding:'8px 14px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:700,
            border:`1px solid ${tab===t?D.gold:D.borderSub}`,
            background:tab===t?D.goldDim:'transparent',
            color:tab===t?D.gold:D.muted,transition:'all 0.15s'}}>
            {l}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={onBlindDraw} style={{padding:'8px 13px',borderRadius:9,border:`1px solid ${D.blue}40`,
          background:D.blueBg,color:D.blue,fontWeight:700,fontSize:12,cursor:'pointer',
          display:'flex',alignItems:'center',gap:6}}>
          <Shuffle size={13}/> Tiraj Avèg
        </button>
      </div>

      {tab==='members'&&(
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          {!plan.members?.length?(
            <div style={{textAlign:'center',padding:40,color:D.muted}}>
              <Users size={32} style={{opacity:0.3,display:'block',margin:'0 auto 8px'}}/>
              <p style={{margin:0}}>Pa gen manm. Enskri premye kliyan ou!</p>
            </div>
          ):plan.members.map(m=>{
            const due=dates.filter(d=>d<=today).length
            const paid=Object.keys(m.payments||{}).filter(d=>m.payments[d]).length
            const isWin=dates[m.position-1]===today
            const isOwn=m.isOwnerSlot
            const fineTot=Object.values(m.fines||{}).reduce((a,b)=>a+Number(b),0)
            return (
              <div key={m.id} className="member-row" style={{
                background:isOwn
                  ?'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))'
                  :isWin?'linear-gradient(135deg,rgba(39,174,96,0.10),rgba(201,168,76,0.06))':D.card,
                border:`1px solid ${isOwn?`${D.gold}50`:isWin?`${D.green}40`:D.border}`,
                borderRadius:12,padding:'11px 13px'}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div className="member-pos-badge" style={{width:34,height:34,borderRadius:10,flexShrink:0,
                    background:isOwn?D.goldBtn:D.goldDim,border:`1px solid ${D.border}`,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontFamily:'monospace',fontWeight:900,fontSize:12,color:isOwn?'#0a1222':D.gold}}>#{m.position}</span>
                  </div>
                  <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',marginBottom:1}}>
                      <span className="member-name" style={{fontSize:13,fontWeight:700,
                        color:isOwn?D.gold:D.text,overflow:'hidden',textOverflow:'ellipsis',
                        whiteSpace:'nowrap',maxWidth:130}}>
                        {m.name}{isOwn&&' ★'}
                      </span>
                      {isWin&&!isOwn&&<span style={{fontSize:9,background:D.greenBg,color:D.green,padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0}}>🏆</span>}
                      {m.hasWon&&<span style={{fontSize:9,background:D.goldDim,color:D.gold,padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0}}>✓ Touche</span>}
                      {(()=>{const s=getMemberScore(m);return s?(
                        <span style={{fontSize:9,padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0,
                          background:s.score>=80?'rgba(0,208,132,0.12)':s.score>=50?D.orangeBg:D.redBg,
                          color:s.score>=80?'#00d084':s.score>=50?D.orange:D.red}}>
                          ⭐{s.score}%
                        </span>
                      ):null})()}
                    </div>
                    <div className="member-phone" style={{fontSize:11,color:D.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.phone}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,minWidth:60}}>
                    <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,
                      color:paid>=due?D.green:due>0?D.orange:D.muted}}>
                      {paid}/{due}
                    </div>
                    <div style={{fontSize:10,color:D.muted}}>{fmt(paid*plan.amount)}</div>
                    {fineTot>0&&<div style={{fontSize:9,color:D.red}}>+{fmt(fineTot)} amand</div>}
                  </div>
                  <div className="member-btns" style={{display:'flex',gap:5,flexShrink:0}}>
                    <button onClick={()=>setPay(m)} title="Mache Peye"
                      style={{width:30,height:30,borderRadius:8,border:'none',background:D.greenBg,color:D.green,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <CheckCircle size={14}/>
                    </button>
                    <button onClick={()=>setView(m)} title="Kont Vityèl"
                      style={{width:30,height:30,borderRadius:8,border:'none',background:D.goldDim,color:D.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Eye size={14}/>
                    </button>
                  </div>
                </div>
                {due>0&&(
                  <div style={{marginTop:8}}>
                    <div style={{height:4,borderRadius:4,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(100,(paid/due)*100)}%`,background:paid>=due?D.green:D.gold,borderRadius:4}}/>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab==='calendar'&&<PlanCalendar plan={plan}/>}

      {tab==='regleman'&&(
        <div style={{background:D.tealBg,border:`1px solid ${D.teal}25`,borderRadius:14,padding:'18px 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <p style={{fontSize:11,fontWeight:800,color:D.teal,textTransform:'uppercase',
              letterSpacing:'0.07em',margin:0,display:'flex',alignItems:'center',gap:6}}>
              <FileText size={13}/> Regleman Sol la
            </p>
            <button onClick={onEditPlan} style={{fontSize:11,color:D.gold,background:'none',border:'none',
              cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
              <Edit3 size={12}/> Modifye
            </button>
          </div>
          {plan.regleman?(
            <p style={{fontSize:12,color:D.muted,margin:0,lineHeight:1.8,whiteSpace:'pre-line'}}>
              {plan.regleman}
            </p>
          ):(
            <div style={{textAlign:'center',padding:'20px 0',color:D.muted}}>
              <FileText size={28} style={{opacity:0.3,display:'block',margin:'0 auto 8px'}}/>
              <p style={{margin:0,fontSize:12}}>Pa gen regleman pou plan sa a.</p>
              <button onClick={onEditPlan} style={{marginTop:10,padding:'8px 16px',borderRadius:9,
                border:`1px solid ${D.teal}40`,background:D.tealBg,color:D.teal,
                cursor:'pointer',fontWeight:700,fontSize:12}}>
                Ajoute Regleman
              </button>
            </div>
          )}
        </div>
      )}

      {payMember&&(
        <ModalMarkPayment member={payMember} plan={plan} onClose={()=>setPay(null)}
          printer={printer}
          onSave={(dates,timings,fines)=>{
            onPaymentSaved(payMember.id,dates,timings,fines)
            setPay(null)
          }}/>
      )}
      {viewMember&&(
        <MemberVirtualAccount member={viewMember} plan={plan} onClose={()=>setView(null)} printer={printer}/>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function SabotayPage() {
  useEffect(()=>{
    const el = document.createElement('style')
    el.textContent = GLOBAL_STYLES
    document.head.appendChild(el)
    return ()=>document.head.removeChild(el)
  },[])

  const qc      = useQueryClient()
  const {tenant}= useAuthStore()
  const printer = usePrinterState()

  const [selectedPlan,  setSelected]   = useState(null)
  const [showCreate,    setShowCreate]  = useState(false)
  const [editingPlan,   setEditing]     = useState(null)
  const [showAddMember, setAddMember]   = useState(false)
  const [showDraw,      setDraw]        = useState(false)
  const [search,        setSearch]      = useState('')

  // ── Queries — ✅ apiFetch pou /api/v1/sabotay
  const { data:plans=[], isLoading, error, refetch } = useQuery({
    queryKey:['sabotay-plans'],
    queryFn:()=>apiFetch('/sabotay/plans').then(r=>{
      const result = r.plans||r.data||r
      return Array.isArray(result) ? result : []
    }),
    refetchInterval:60000,
  })

  const activePlan = selectedPlan ? plans.find(p=>p.id===selectedPlan.id)||selectedPlan : null

  // ── Mutations — ✅ tout itilize apiFetch
  const createPlan = useMutation({
    mutationFn:(data)=>apiFetch('/sabotay/plans',{method:'POST',body:JSON.stringify(data)}),
    onSuccess:(r)=>{ qc.invalidateQueries(['sabotay-plans']); setShowCreate(false); toast.success('✅ Plan kreye!'); setSelected(r.plan||r) },
    onError:(e)=>toast.error(e.message),
  })
  const updatePlan = useMutation({
    mutationFn:({id,...data})=>apiFetch(`/sabotay/plans/${id}`,{method:'PUT',body:JSON.stringify(data)}),
    onSuccess:()=>{ qc.invalidateQueries(['sabotay-plans']); setEditing(null); toast.success('✅ Plan modifye!') },
    onError:(e)=>toast.error(e.message),
  })

  // ✅ addMember — _cb nan onSuccess (pa 4yèm argument)
  const addMember = useMutation({
    mutationFn:(data)=>{
      const {_cb,...body} = data
      return apiFetch(`/sabotay/plans/${activePlan?.id}/members`,{method:'POST',body:JSON.stringify(body)})
    },
    onSuccess:(r,vars)=>{
      qc.invalidateQueries(['sabotay-plans'])
      if(typeof vars._cb==='function') vars._cb(r.member||r)
      else setAddMember(false)
    },
    onError:(e)=>toast.error(e.message),
  })

  const markPayment = useMutation({
    mutationFn:({memberId,...data})=>apiFetch(`/sabotay/plans/${activePlan?.id}/members/${memberId}/pay`,{method:'POST',body:JSON.stringify(data)}),
    onSuccess:()=>{ qc.invalidateQueries(['sabotay-plans']); toast.success('✅ Peman anrejistre!') },
    onError:(e)=>toast.error(e.message),
  })
  const blindDraw = useMutation({
    mutationFn:(memberId)=>apiFetch(`/sabotay/plans/${activePlan?.id}/blind-draw`,{method:'POST',body:JSON.stringify({memberId})}),
    onSuccess:(r)=>{
      qc.invalidateQueries(['sabotay-plans'])
      setDraw(false)
      toast.success(`🏆 ${r.member?.name||'Manm'} chwazi pa tiraj!`)
      if(activePlan) printer.print(activePlan,r.member||{},[],tenant,'tirage')
    },
    onError:(e)=>toast.error(e.message),
  })

  // ── Derived stats ──
  const totalMembers = plans.reduce((a,p)=>a+(p.members?.length||0),0)
  const totalCollected = plans.reduce((a,p)=>
    a+(p.members||[]).reduce((b,m)=>b+Object.keys(m.payments||{}).filter(d=>m.payments[d]).length*p.amount,0),0)
  const activePlans = plans.filter(p=>p.status!=='closed').length

  const filtered = plans.filter(p=>
    p.name?.toLowerCase().includes(search.toLowerCase())||
    freqIntervalLabel(p.frequency,p.interval).toLowerCase().includes(search.toLowerCase())
  )

  if(isLoading) return (
    <div style={{minHeight:'100vh',background:D.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Loader size={32} style={{color:D.gold,animation:'spin 0.8s linear infinite'}}/>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:D.bg,padding:'16px 16px 80px',fontFamily:'Inter,system-ui,sans-serif',color:D.text,maxWidth:700,margin:'0 auto',boxSizing:'border-box'}}>

      {error&&(
        <div className="error-banner" style={{background:D.redBg,border:`1px solid ${D.red}40`,borderRadius:12,
          padding:'11px 15px',marginBottom:16,display:'flex',alignItems:'center',gap:10,fontSize:12}}>
          <AlertCircle size={15} style={{color:D.red,flexShrink:0}}/>
          <span style={{flex:1,color:D.red}}>{error.message}</span>
          <button onClick={()=>refetch()} style={{padding:'5px 11px',borderRadius:8,border:`1px solid ${D.red}40`,
            background:'transparent',color:D.red,cursor:'pointer',fontWeight:700,fontSize:11,
            display:'flex',alignItems:'center',gap:5,marginLeft:'auto'}}>
            <RefreshCw size={11}/> Reyesye
          </button>
        </div>
      )}

      {activePlan ? (
        <PlanDetail
          plan={activePlan}
          printer={printer}
          onBack={()=>setSelected(null)}
          onAddMember={()=>setAddMember(true)}
          onBlindDraw={()=>setDraw(true)}
          onEditPlan={()=>setEditing(activePlan)}
          onPaymentSaved={(memberId,dates,timings,fines)=>
            markPayment.mutate({memberId,dates,timings,fines})}
        />
      ) : (
        <>
          <div className="page-head" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:12}}>
            <div>
              <h1 style={{color:D.gold,margin:0,fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8}}>
                <Wallet size={20}/> Sabotay Sol
              </h1>
              <p style={{color:D.muted,margin:'3px 0 0',fontSize:12}}>Jesyon Sol — PlusGroup</p>
            </div>
            <div className="page-head-actions" style={{display:'flex',alignItems:'center',gap:8}}>
              <PrinterBtn printer={printer}/>
              <button className="btn-new-plan" onClick={()=>setShowCreate(true)} style={{
                display:'flex',alignItems:'center',gap:7,padding:'10px 16px',borderRadius:11,
                border:'none',cursor:'pointer',fontWeight:800,fontSize:13,
                background:D.goldBtn,color:'#0a1222',
                boxShadow:'0 4px 16px rgba(201,168,76,0.30)'}}>
                <Plus size={15}/> Nouvo Plan
              </button>
            </div>
          </div>

          <div className="top-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:20}}>
            {[
              {label:'Plan Aktif',    val:activePlans,               color:D.gold,   bg:D.goldDim,   icon:<Wallet size={16}/> },
              {label:'Total Manm',   val:totalMembers,               color:D.blue,   bg:D.blueBg,    icon:<Users size={16}/>  },
              {label:'Kolekte (HTG)',val:fmt(totalCollected),         color:D.green,  bg:D.greenBg,   icon:<Trophy size={16}/> },
            ].map(({label,val,color,bg,icon})=>(
              <div key={label} className="stat-card" style={{background:D.card,border:`1px solid ${D.border}`,
                borderRadius:13,padding:'13px 15px',display:'flex',alignItems:'center',gap:12}}>
                <div className="stat-icon" style={{width:38,height:38,borderRadius:10,background:bg,
                  display:'flex',alignItems:'center',justifyContent:'center',color,flexShrink:0}}>
                  {icon}
                </div>
                <div style={{minWidth:0}}>
                  <div className="stat-val" style={{fontFamily:'monospace',fontWeight:900,fontSize:14,color,wordBreak:'break-word'}}>{val}</div>
                  <div style={{fontSize:10,color:D.muted,fontWeight:600}}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="search-wrap" style={{position:'relative',marginBottom:16,maxWidth:360}}>
            <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:D.muted,pointerEvents:'none'}}/>
            <input style={{...inp,paddingLeft:36}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chèche plan..."/>
          </div>

          {filtered.length===0?(
            <div style={{textAlign:'center',padding:'48px 0',color:D.muted}}>
              <Wallet size={40} style={{opacity:0.2,display:'block',margin:'0 auto 12px'}}/>
              <p style={{margin:0,fontSize:14}}>Pa gen plan Sabotay pou kounye a.</p>
              <button onClick={()=>setShowCreate(true)} style={{marginTop:14,padding:'10px 20px',
                borderRadius:10,border:'none',background:D.goldBtn,color:'#0a1222',
                cursor:'pointer',fontWeight:800,fontSize:13}}>
                Kreye Premye Plan
              </button>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {filtered.map(plan=>{
                const slots=totalSlots(plan)
                const filled=plan.members?.length||0
                const pct=slots>0?(filled/slots)*100:0
                const coll=plan.members?.reduce((a,m)=>
                  a+Object.keys(m.payments||{}).filter(d=>m.payments[d]).length*plan.amount,0)||0
                const today=new Date().toISOString().split('T')[0]
                const dates=getPaymentDates(plan.frequency,getPlanStartDate(plan),slots,plan.interval)
                const todayWin=dates.findIndex(d=>d===today)
                const winner=todayWin>=0?plan.members?.[todayWin]:null
                const payout=memberPayout(plan)

                return (
                  <div key={plan.id} className="plan-card" onClick={()=>setSelected(plan)}
                    style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:14,
                      padding:'14px 16px',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10,gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <h3 style={{color:'#fff',margin:'0 0 3px',fontSize:14,fontWeight:800,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{plan.name}</h3>
                        <p style={{color:D.muted,margin:0,fontSize:11}}>
                          {freqIntervalLabel(plan.frequency,plan.interval)} •{' '}
                          <span style={{color:D.gold,fontWeight:700}}>{fmt(plan.amount)} HTG</span>
                          {Number(plan.penalty)>0&&<span style={{color:D.red}}> • Amand {fmt(plan.penalty)}</span>}
                        </p>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'monospace',fontWeight:900,fontSize:13,color:D.green}}>{fmt(coll)} HTG</div>
                        <div style={{fontSize:10,color:D.muted}}>kolekte</div>
                      </div>
                    </div>

                    {winner&&(
                      <div style={{background:D.greenBg,border:`1px solid ${D.green}30`,borderRadius:9,
                        padding:'6px 11px',marginBottom:9,fontSize:11,color:D.green,fontWeight:700,
                        display:'flex',alignItems:'center',gap:6}}>
                        <Trophy size={12}/> {winner.name} ap touche jodi a — {fmt(winner.isOwnerSlot?ownerPayout(plan):payout)} HTG
                      </div>
                    )}

                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:10,color:D.muted}}>{filled}/{slots} manm</span>
                      <span style={{fontSize:10,color:D.gold,fontWeight:700}}>{Math.round(pct)}%</span>
                    </div>
                    <div style={{height:5,borderRadius:5,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:D.goldBtn,borderRadius:5,transition:'width 0.4s'}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:9,fontSize:11,color:D.muted}}>
                      <span>Payout: <strong style={{color:D.gold}}>{fmt(payout)} HTG</strong></span>
                      {plan.regleman&&<span style={{display:'flex',alignItems:'center',gap:3,color:D.teal}}><FileText size={10}/>Regleman</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showCreate&&(
        <ModalCreatePlan onClose={()=>setShowCreate(false)} loading={createPlan.isPending}
          onSave={(data)=>createPlan.mutate(data)}/>
      )}
      {editingPlan&&(
        <ModalCreatePlan initialData={editingPlan} onClose={()=>setEditing(null)}
          loading={updatePlan.isPending}
          onSave={(data)=>updatePlan.mutate({id:editingPlan.id,...data})}/>
      )}
      {showAddMember&&activePlan&&(
        <ModalAddMember plan={activePlan} onClose={()=>setAddMember(false)}
          loading={addMember.isPending}
          onSave={(data)=>addMember.mutate(data)}/>
      )}
      {showDraw&&activePlan&&(
        <ModalBlindDraw plan={activePlan} onClose={()=>setDraw(false)}
          loading={blindDraw.isPending}
          onConfirm={(member)=>blindDraw.mutate(member.id)}/>
      )}
    </div>
  )
}
