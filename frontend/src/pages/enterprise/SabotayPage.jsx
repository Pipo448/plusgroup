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
  Lock, Unlock, UserX, UserMinus, TrendingUp, Info,
  XCircle, StopCircle,
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

// ─── STATUT MANM ────────────────────────────────────────────
const MEMBER_STATUS = {
  active:   { label: 'Aktif',    color: '#27ae60', bg: 'rgba(39,174,96,0.12)',    icon: '✅' },
  blocked:  { label: 'Bloke',    color: '#e74c3c', bg: 'rgba(231,76,60,0.12)',    icon: '🔒' },
  stopped:  { label: 'Kanpe',    color: '#f39c12', bg: 'rgba(243,156,18,0.12)',   icon: '⏸️' },
  finished: { label: 'Touche',   color: '#C9A84C', bg: 'rgba(201,168,76,0.12)',   icon: '🏆' },
  late:     { label: 'Reta',     color: '#e67e22', bg: 'rgba(230,126,34,0.10)',   icon: '⚠️' },
}

// ─── STATUT PLAN ─────────────────────────────────────────────
const PLAN_STATUS = {
  open:    { label: 'Ouvè',   color: '#27ae60', bg: 'rgba(39,174,96,0.12)'  },
  closed:  { label: 'Fèmen',  color: '#e74c3c', bg: 'rgba(231,76,60,0.10)' },
  finished:{ label: 'Fini',   color: '#C9A84C', bg: 'rgba(201,168,76,0.10)'},
}

const OWNER_SLOT_NAME = 'Pwopriyete Sol'

function hasOwnerSlot(plan) {
  return Number(plan.feePerMember) > 0 && Number(plan.feePerMember) === Number(plan.amount)
}

// Sol ouvè: kantite manm pa fikse — sèlman ceux ki deja antre
function totalSlots(plan) {
  const activeMembers = displayMembers.filter(m => m.status !== 'stopped').length
  if (plan.status === 'closed' || plan.status === 'finished') {
    // Lè plan fèmen: sèvi ak kantite manm ki te antre yo
    return Math.max(activeMembers, plan.members?.length || 0)
  }
  // Plan ouvè: pa gen limit fikse — kalandriye ap pwolonje ofiramezi
  return plan.members?.length || 0
}

function memberPayout(plan) {
  const slots = totalActiveSlots(plan)
  return Math.max(0, Number(plan.amount) * slots - Number(plan.feePerMember || 0))
}

function ownerPayout(plan) {
  const slots = totalActiveSlots(plan)
  return Math.max(0, Number(plan.amount) * slots - Number(plan.feePerMember || 0))
}

function totalActiveSlots(plan) {
  return (plan.members || [])
    .filter(m => m.status !== 'stopped')
    .reduce((acc, m) => {
      const slots = (m.positions && Array.isArray(m.positions) && m.positions.length > 1)
        ? m.positions.length
        : 1
      return acc + slots
    }, 0)
}
// ─────────────────────────────────────────────────────────────
// KALANDRIYE DINAMIK — pwolonje selon manm ki antre
// Manm ki antre yo jwenn dat selon lòd enskripsyon yo
// ─────────────────────────────────────────────────────────────
function getPaymentDates(frequency, startDate, count) {
  if (count <= 0) return []
  const dates = []
  let cur = new Date(startDate || Date.now())

  const advanceOnce = () => {
    switch (frequency) {
      case 'daily':           cur.setDate(cur.getDate() + 1); break
      case 'weekly_saturday': cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      case 'weekly_monday':   cur.setDate(cur.getDate() + ((1 - cur.getDay() + 7) % 7 || 7)); break
      case 'biweekly':        cur.setDate(cur.getDate() + 14); break
      case 'monthly':         cur.setMonth(cur.getMonth() + 1); break
      case 'weekdays':
        do { cur.setDate(cur.getDate() + 1) } while ([0, 6].includes(cur.getDay())); break
      default: cur.setDate(cur.getDate() + 1)
    }
  }

  dates.push(new Date(cur).toISOString().split('T')[0])
  for (let i = 1; i < count; i++) {
    advanceOnce()
    dates.push(new Date(cur).toISOString().split('T')[0])
  }
  return dates
}

function getPlanStartDate(plan) {
  return plan.startDate || plan.createdAt || new Date().toISOString()
}

// Kalkile dat touche pou yon manm selon pozisyon li ak interval
// Kalandriye baze sou kantite manm AKTIF yo (pa fikse)
function getPayoutDate(plan, position) {
  const interval = Math.max(1, Math.floor(plan.interval) || 1)
  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const slots = Math.max(activeMembers.length, position)
  const totalCycles = slots * interval
  const allDates = getPaymentDates(plan.frequency, getPlanStartDate(plan), totalCycles)
  const idx = (position * interval) - 1
  return allDates[Math.min(idx, allDates.length - 1)] || null
}

// Retounen tout dat peman selon kantite manm aktyèl yo
function getAllPaymentDates(plan) {
  const interval = Math.max(1, Math.floor(plan.interval) || 1)
  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const slots = activeMembers.length || 1
  const totalCycles = slots * interval
  return getPaymentDates(plan.frequency, getPlanStartDate(plan), totalCycles)
}

// Map pozisyon → dat touche (dinamik)
function getPayoutDateMap(plan) {
  const map = {}
  const members = (plan.members || [])
  members.forEach(m => {
    map[m.position] = getPayoutDate(plan, m.position)
  })
  return map
}

// ─────────────────────────────────────────────────────────────
// KALKILE STATUT MANM OTOMATIK
// ─────────────────────────────────────────────────────────────
function computeMemberStatus(member, plan, today) {
  if (member.status === 'stopped') return 'stopped'
  if (member.status === 'blocked') return 'blocked'
  if (member.hasWon)               return 'finished'

  const allDates = getAllPaymentDates(plan)
  const pastDates = allDates.filter(d => d <= today)
  if (!pastDates.length) return 'active'

  const unpaidPast = pastDates.filter(d => !member.payments?.[d])
  if (!unpaidPast.length) return 'active'

  // Verifye delay avètisman
  const lateDays = plan.warningDelayDays || 0
  const latestUnpaid = unpaidPast[0]
  const daysDiff = Math.floor((new Date(today) - new Date(latestUnpaid)) / 86400000)

  if (lateDays > 0 && daysDiff >= lateDays) return 'blocked'
  return 'late'
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
  .m-sheet::-webkit-scrollbar{width:8px}
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

function freqFullLabel(plan) {
  const n = Math.max(1, Math.floor(plan.interval) || 1)
  const base = FREQ_LABELS[plan.frequency]?.ht || plan.frequency
  if (n <= 1) return `Peye ${base} • Touche ${base}`
  return `Peye ${base} • Touche chak ${n}yèm`
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

function getMemberSlots(plan, phone) {
  if (!phone || !plan.members) return []
  return plan.members.filter(m => m.phone === phone)
}

// ─────────────────────────────────────────────────────────────
// API HELPERS
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
  setTimeout(()=>{w.focus();w.print();setTimeout(()=>w.close(),2000)},300)
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
  const interval = Math.max(1, Math.floor(plan.interval) || 1)
  const activeMbrs = (plan.members||[]).filter(m=>m.status!=='stopped').length

  return `<div style="width:80mm;padding:4mm 3mm;background:#fff;color:#1a1a1a;font-family:'Courier New',monospace;font-size:10px;line-height:1.5">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:5px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- SABOTAY SOL --</div>
      ${tenant?.phone?`<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>`:''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:5px">
      ${type==='peman'?'RESI PEMAN':type==='tirage'?'RESI TIRAJ AVÈG':type==='kanpe'?'KONFIRMASYON KANPE':'KONT MANM'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Plan:</span><span style="font-weight:700">${plan.name}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Frekans:</span><span>${FREQ_LABELS[plan.frequency]?.ht||plan.frequency}${interval>1?` (touche chak ${interval}yèm)`:''}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Manm Aktif:</span><span>${activeMbrs}</span></div>
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
      `:type==='kanpe'?`
        <div style="text-align:center;padding:8px 0;color:#e74c3c">
          <div style="font-weight:700">Manm sa a kanpe nan sol la.</div>
          <div style="font-size:9px;margin-top:4px">Li ka resevwa kòb li lè sol la fini.</div>
        </div>
      `:`
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Peman fè:</span><span>${totalPaid}</span></div>
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

function MemberStatusBadge({ status, small }) {
  const cfg = MEMBER_STATUS[status] || MEMBER_STATUS.active
  const sz  = small ? { padding: '2px 6px', fontSize: 9 } : { padding: '3px 9px', fontSize: 11 }
  return (
    <span style={{ ...sz, borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function PlanStatusBadge({ status }) {
  const cfg = PLAN_STATUS[status] || PLAN_STATUS.open
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 10,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
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
// Nouvo: warningDelayDays, plan toujou ouvè jiskaske admin fèmen l
// ─────────────────────────────────────────────────────────────
function ModalCreatePlan({onClose,onSave,loading,initialData=null}) {
  const isEdit = !!initialData
  const [form,setForm] = useState({
    name:'',amount:'',feePerMember:'',penalty:'',warningDelayDays:3,
    frequency:'daily',interval:1,maxMembers:'',dueTime:'08:00',regleman:'',startDate:'',
    ...(initialData||{}),
    startDate: initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })
  const set=(k,v)=>setForm(p=>({...p,[k]:v}))

  const amt=Number(form.amount)||0
  const fee=Number(form.feePerMember)||0
  const intervalN=Math.max(1,Number(form.interval)||1)
  const isOwner=fee>0&&fee===amt
  const previewMembers = Number(form.maxMembers)||0
  const totalPool = amt * previewMembers
  const payoutM = totalPool - fee
  const payoutO = totalPool
  const freqName = FREQ_LABELS[form.frequency]?.ht || form.frequency

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
              <label style={lbl}>Lè Peman *</label>
              <input type="time" style={{...inp,color:D.purple,fontWeight:700}}
                value={form.dueTime} onChange={e=>set('dueTime',e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Dat Kòmanse Sol *</label>
              <input type="date" style={{...inp,color:D.teal,fontWeight:700}}
                value={form.startDate} onChange={e=>set('startDate',e.target.value)}/>
            </div>
          </div>

          {/* INFO: Sol ouvè, pa gen limit fikse */}
          <div style={{marginTop:10,background:'rgba(59,130,246,0.08)',border:`1px solid rgba(59,130,246,0.2)`,
            borderRadius:10,padding:'10px 13px',display:'flex',alignItems:'flex-start',gap:8,fontSize:11}}>
            <Info size={14} style={{color:D.blue,flexShrink:0,marginTop:1}}/>
            <div style={{color:D.muted,lineHeight:1.6}}>
              <strong style={{color:D.blue}}>Sol Ouvè:</strong> Moun ka antre toutan.
              Admin sèlman ka <strong style={{color:D.text}}>fèmen plan la</strong> lè l vle.
              Kalandriye ap pwolonje otomatikman ak chak nouvo manm.
              {previewMembers > 0 && <><br/><span style={{color:D.gold}}>Previw ak {previewMembers} manm: Payout = {fmt(payoutM)} HTG</span></>}
            </div>
          </div>

          {/* Champ pou previw sèlman */}
          <div style={{marginTop:10}}>
            <label style={{...lbl,color:'rgba(107,122,153,0.8)'}}>Previzyon (pa obligatwa) — Konbyen manm ou atann?</label>
            <input type="number" style={{...inp,color:D.muted,fontSize:12}}
              value={form.maxMembers} onChange={e=>set('maxMembers',e.target.value)} placeholder="Ex: 20 (previw sèlman)"/>
          </div>
        </Sec>

        <Sec icon="💰" title="Frè & Amand" col="243,156,18">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lbl}>Frè pa Manm ki Touche (HTG)</label>
              <input type="number" style={{...inp,color:D.orange}}
                value={form.feePerMember} onChange={e=>set('feePerMember',e.target.value)} placeholder="0"/>
              {fee>0&&fee===amt&&<p style={{fontSize:10,color:D.gold,margin:'4px 0 0',fontWeight:700}}>= Montan → Plas Pwopriyete Sol!</p>}
            </div>
            <div>
              <label style={lbl}>Amand pou Reta (HTG)</label>
              <input type="number" style={{...inp,color:D.red}}
                value={form.penalty} onChange={e=>set('penalty',e.target.value)} placeholder="0"/>
            </div>
          </div>
        </Sec>

        {/* ─── NOUVO: Delay Avètisman + Blokaj ─── */}
        <Sec icon="⚠️" title="Delay Avètisman & Blokaj" col="231,76,60">
          <div style={{marginBottom:10,fontSize:11,color:D.muted,lineHeight:1.6}}>
            Si yon manm pa peye apre <strong style={{color:D.text}}>X jou</strong> reta,
            sistèm ap voye avètisman epi <strong style={{color:D.red}}>bloke kont li otomatikman</strong>.
            Sèlman <strong style={{color:D.gold}}>admin</strong> ka debloke l.
            Manm ki bloke a <strong style={{color:D.text}}>pa pèdi dwa touche</strong> — li dwe peye anvan pou debloke.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lbl}>Jou Reta Anvan Avètisman</label>
              <input type="number" min="0" style={{...inp,color:D.orange}}
                value={form.warningDelayDays} onChange={e=>set('warningDelayDays',Number(e.target.value)||0)}
                placeholder="3"/>
              <p style={{fontSize:10,color:D.muted,margin:'4px 0 0'}}>0 = pa gen avètisman otomatik</p>
            </div>
            <div style={{display:'flex',flexDirection:'column',justifyContent:'center',
              background:'rgba(231,76,60,0.06)',borderRadius:10,padding:'10px 12px',fontSize:11,color:D.muted}}>
              {Number(form.warningDelayDays) > 0 ? (
                <>
                  <span style={{color:D.orange,fontWeight:700,marginBottom:4}}>⚠️ Avètisman: +{form.warningDelayDays} jou reta</span>
                  <span style={{color:D.red,fontWeight:700}}>🔒 Blokaj: apre avètisman an</span>
                </>
              ) : (
                <span style={{color:D.muted}}>Blokaj manyèl sèlman</span>
              )}
            </div>
          </div>
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
            <label style={lbl}>Touche chak konbyen sik?</label>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:8}}>
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
            </div>
          </div>
        </Sec>

        <Sec icon="📜" title="Regleman Sol (Opsyonèl)" col="20,184,166">
          <textarea rows={3} style={{...inp,resize:'vertical',lineHeight:1.6,fontSize:12}}
            value={form.regleman} onChange={e=>set('regleman',e.target.value)}
            placeholder="Ex: Tout manm dwe peye avan 8h. Peman anreta gen amand..."/>
        </Sec>

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:10,
            border:`1px solid ${D.borderSub}`,background:'transparent',color:D.muted,cursor:'pointer',fontWeight:700}}>
            Anile
          </button>
          <button disabled={loading} onClick={()=>{
            if(!form.name||!form.amount) return toast.error('Non ak montan obligatwa.')
            onSave({...form,amount:Number(form.amount),feePerMember:Number(form.feePerMember||0),
              penalty:Number(form.penalty||0),
              warningDelayDays:Number(form.warningDelayDays||0),
              maxMembers:Number(form.maxMembers||0),
              dueTime:form.dueTime||'08:00',interval:intervalN,
              startDate:form.startDate||new Date().toISOString().split('T')[0],
              status:'open'})
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
// MODAL: TIRAJ AVÈG
// ─────────────────────────────────────────────────────────────
function ModalBlindDraw({plan,onClose,onConfirm,loading}) {
  const eligible = (plan.members||[]).filter(m=>!m.hasWon&&!m.isOwnerSlot&&m.status==='active')
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
            <p>Pa gen manm aktif disponib pou tiraj.</p>
          </div>
        ):(
          <>
            <div style={{background:D.blueBg,border:`1px solid ${D.blue}30`,borderRadius:12,
              padding:'10px 14px',fontSize:11,color:D.muted,display:'flex',gap:8,alignItems:'center'}}>
              <Shuffle size={14} style={{color:D.blue,flexShrink:0}}/>
              <span>Sèlman manm AKTIF ki patisipe nan tiraj la ({eligible.length} moun).</span>
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
  const today    = new Date().toISOString().split('T')[0]

  const allDates = useMemo(()=>getAllPaymentDates(plan),[plan])
  const unpaid = allDates.filter(d => !member.payments?.[d])

  const [sel,setSel]        = useState(unpaid.length===1?[unpaid[0]]:[])
  const [applyFine,setFine] = useState(false)
  const toggle = (d)=>setSel(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d])

  const hasPenalty = Number(plan.penalty)>0
  const lateDates  = sel.filter(d=>d<today)
  const fineAmt    = hasPenalty&&applyFine ? lateDates.length*Number(plan.penalty) : 0
  const baseAmt    = sel.length*Number(plan.amount)
  const totalAmt   = baseAmt+fineAmt

  // Si manm te bloke, peman ap debloke li otomatikman
  const isBlocked = member.status === 'blocked'

  const handleConfirm = async()=>{
    if(!sel.length) return toast.error('Chwazi omwen yon dat.')
    const timings={}; sel.forEach(d=>{timings[d]=getPaymentTiming(plan,d)})
    const fines={}
    if(applyFine&&hasPenalty) lateDates.forEach(d=>{fines[d]=Number(plan.penalty)})

    // Mache peye manm prensipal la
    onSave(member.id, sel, timings, fines)

    // Mache peye lòt men ki gen menm telefòn tou (si yo pa peye deja)
    const samePhoneMembers = (plan.members||[]).filter(
      m => m.phone === member.phone && m.id !== member.id && m.status !== 'stopped'
    )
    for (const otherMember of samePhoneMembers) {
      const otherUnpaid = sel.filter(d => !otherMember.payments?.[d])
      if (otherUnpaid.length > 0) {
        const otherTimings = {}
        otherUnpaid.forEach(d => { otherTimings[d] = getPaymentTiming(plan, d) })
        onSave(otherMember.id, otherUnpaid, otherTimings, {})
      }
    }

    if (samePhoneMembers.length > 0) {
      toast.success(`✅ Peman anrejistre pou ${samePhoneMembers.length + 1} men!`)
    }

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

        {/* Avètisman si manm bloke */}
        {isBlocked && (
          <div style={{background:D.orangeBg,border:`1px solid ${D.orange}40`,borderRadius:10,
            padding:'10px 13px',display:'flex',alignItems:'center',gap:8,fontSize:11}}>
            <Lock size={14} style={{color:D.orange,flexShrink:0}}/>
            <span style={{color:D.orange,fontWeight:700}}>
              Kont sa a bloke. Peman an ap debloke l otomatikman.
            </span>
          </div>
        )}

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
// MODAL: AKSYON ADMIN SOU MANM (bloke, debloke, kanpe)
// ─────────────────────────────────────────────────────────────
function ModalMemberAction({ member, plan, action, onClose, onConfirm, loading, printer }) {
  const { tenant } = useAuthStore()
  const [reason, setReason] = useState('')

  const configs = {
    block: {
      title: `🔒 Bloke — ${member.name}`,
      color: D.red, bg: D.redBg,
      icon: <Lock size={22} style={{ color: D.red }} />,
      desc: 'Kont manm sa a ap bloke. Li pap ka resevwa kòb li jiskaske li peye ariye a ak admin debloke l.',
      btnLabel: 'Bloke Kont',
      btnColor: `linear-gradient(135deg,${D.red},#8B1A1A)`,
    },
    unblock: {
      title: `🔓 Debloke — ${member.name}`,
      color: D.green, bg: D.greenBg,
      icon: <Unlock size={22} style={{ color: D.green }} />,
      desc: 'Admin ap debloke kont manm sa a. Li ap ka resevwa kòb li lè sol la fini.',
      btnLabel: 'Debloke Kont',
      btnColor: `linear-gradient(135deg,${D.green},#145A32)`,
    },
    stop: {
      title: `⏸️ Kanpe — ${member.name}`,
      color: D.orange, bg: D.orangeBg,
      icon: <StopCircle size={22} style={{ color: D.orange }} />,
      desc: 'Manm sa a ap kanpe patisipasyon li. Li pap peye ankò men li ka resevwa pòsyon kontribisyon li deja fè a lè sol la fini.',
      btnLabel: 'Kanpe Patisipasyon',
      btnColor: `linear-gradient(135deg,${D.orange},#8B5A00)`,
    },
    resume: {
      title: `▶️ Reprann — ${member.name}`,
      color: D.blue, bg: D.blueBg,
      icon: <UserCheck size={22} style={{ color: D.blue }} />,
      desc: 'Manm sa a ap reprann patisipasyon aktif li nan sol la.',
      btnLabel: 'Reprann Patisipasyon',
      btnColor: `linear-gradient(135deg,${D.blue},#1A3A8B)`,
    },
  }

  const cfg = configs[action]
  if (!cfg) return null

  // Kalkile sa manm ki kanpe ap touche (kontribisyon pworarata)
  const stoppedPayout = useMemo(() => {
    if (action !== 'stop') return 0
    const allDates = getAllPaymentDates(plan)
    const paidCount = allDates.filter(d => member.payments?.[d]).length
    return paidCount * Number(plan.amount)
  }, [action, plan, member])

  return (
    <Modal onClose={onClose} title={cfg.title} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 12,
          padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {cfg.icon}
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: cfg.color, margin: '0 0 4px' }}>{member.name}</p>
            <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Pozisyon #{member.position} • {member.phone}</p>
          </div>
        </div>

        <p style={{ fontSize: 12, color: D.muted, margin: 0, lineHeight: 1.7,
          background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 13px' }}>
          {cfg.desc}
        </p>

        {/* Si kanpe: montre sa l pral resevwa */}
        {action === 'stop' && stoppedPayout > 0 && (
          <div style={{ background: D.goldDim, border: `1px solid ${D.gold}30`, borderRadius: 10,
            padding: '10px 14px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: D.muted }}>Kontribisyon li deja fè:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold }}>{fmt(stoppedPayout)} HTG</span>
            </div>
            <p style={{ fontSize: 10, color: D.muted, margin: '6px 0 0' }}>
              Li ap resevwa montan sa lè sol la fini (si li pa t touche deja).
            </p>
          </div>
        )}

        {/* Razon (opsyonèl) */}
        <div>
          <label style={lbl}>Rezon (opsyonèl)</label>
          <input style={inp} value={reason} onChange={e => setReason(e.target.value)}
            placeholder={action === 'stop' ? 'Ex: Moun lan demenaje...' : 'Ex: Ariye regle...'}/>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10,
            border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted,
            cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button onClick={() => onConfirm(action, reason)} disabled={loading}
            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(201,168,76,0.3)' : cfg.btnColor,
              color: '#fff', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            {loading ? 'Ap trete...' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: FÈMEN PLAN (Admin sèlman)
// ─────────────────────────────────────────────────────────────
function ModalClosePlan({ plan, onClose, onConfirm, loading }) {
  const [confirm, setConfirm] = useState('')
  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped' && !m.hasWon)
  const pendingPayout = activeMembers.filter(m => !m.hasWon).length
  const totalToDistribute = activeMembers.reduce((a, m) => {
    const allD = getAllPaymentDates(plan)
    return a + allD.filter(d => m.payments?.[d]).length * Number(plan.amount)
  }, 0)

  return (
    <Modal onClose={onClose} title="🛑 Fèmen Plan Sol la" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: D.redBg, border: `1px solid ${D.red}30`, borderRadius: 12,
          padding: '12px 16px', fontSize: 12, color: D.muted, lineHeight: 1.7 }}>
          <p style={{ color: D.red, fontWeight: 800, fontSize: 13, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertCircle size={15} /> Aksyon sa pa ka defèt!
          </p>
          Plan <strong style={{ color: D.text }}>{plan.name}</strong> ap fèmen definitivman.
          Pa gen nouvo manm ki ka antre apre sa.
        </div>

        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: D.muted, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total manm aktif:</span>
              <span style={{ color: D.text, fontWeight: 700 }}>{activeMembers.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Manm ki poko touche:</span>
              <span style={{ color: D.orange, fontWeight: 700 }}>{pendingPayout}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${D.border}`, paddingTop: 7 }}>
              <span>Total kontribisyon kolekte:</span>
              <span style={{ color: D.green, fontWeight: 800, fontFamily: 'monospace' }}>{fmt(totalToDistribute)} HTG</span>
            </div>
          </div>
        </div>

        {pendingPayout > 0 && (
          <div style={{ background: D.goldDim, border: `1px solid ${D.gold}30`, borderRadius: 10,
            padding: '10px 13px', fontSize: 11, color: D.muted }}>
            <span style={{ color: D.gold, fontWeight: 700 }}>⚠️ Enpòtan:</span> {pendingPayout} manm poko touche.
            Yo ap resevwa kontribisyon yo deja fè lè plan la fèmen.
          </div>
        )}

        <div>
          <label style={lbl}>Tape "FEMEN" pou konfime</label>
          <input style={{ ...inp, textAlign: 'center', fontWeight: 800, fontSize: 15,
            borderColor: confirm === 'FEMEN' ? D.red : undefined }}
            value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())}
            placeholder="FEMEN" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10,
            border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted,
            cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button onClick={onConfirm} disabled={loading || confirm !== 'FEMEN'}
            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              cursor: (loading || confirm !== 'FEMEN') ? 'not-allowed' : 'pointer',
              background: (loading || confirm !== 'FEMEN') ? 'rgba(231,76,60,0.3)' : `linear-gradient(135deg,${D.red},#8B1A1A)`,
              color: '#fff', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              opacity: confirm !== 'FEMEN' ? 0.5 : 1 }}>
            {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <StopCircle size={14} />}
            {loading ? 'Ap fèmen...' : 'Fèmen Plan Definitiv'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// KALANDRIYE — Dinamik selon manm yo
// ─────────────────────────────────────────────────────────────
function PlanCalendar({plan}) {
  const [off,setOff] = useState(0)
  const today = new Date().toISOString().split('T')[0]

  const allPayDates = useMemo(()=>getAllPaymentDates(plan),[plan])
  const payoutMap   = useMemo(()=>getPayoutDateMap(plan),[plan])

  const mDates = useMemo(()=>(plan.members||[]).map(m=>({
    ...m,
    payDates: allPayDates,
    payoutDate: payoutMap[m.position],
  })),[plan, allPayDates, payoutMap])

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
          const isTd=ds===today
          const payors=mDates.filter(m=>m.payDates.includes(ds)&&m.status!=='stopped')
          const winners=mDates.filter(m=>m.payoutDate===ds)
          const hasA=payors.length>0, past=ds<today
          const allP=hasA&&payors.every(m=>m.payments?.[ds])
          const someP=payors.some(m=>m.payments?.[ds])
          let bg='transparent',bc='transparent',tc=D.muted
          if(isTd){bg=D.goldDim;bc=D.gold;tc=D.gold}
          else if(winners.length>0&&!hasA){bg='rgba(201,168,76,0.15)';bc=`${D.gold}60`;tc=D.gold}
          else if(hasA&&allP){bg=D.greenBg;bc=`${D.green}40`;tc=D.green}
          else if(hasA&&someP){bg=D.orangeBg;bc=`${D.orange}40`;tc=D.orange}
          else if(hasA&&past){bg=D.redBg;bc=`${D.red}40`;tc=D.red}
          else if(hasA){bg='rgba(59,130,246,0.08)';bc='rgba(59,130,246,0.25)';tc=D.blue}
          return (
            <div key={day} className="cal-day" style={{aspectRatio:'1',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:bg,border:`1px solid ${bc}`}}>
              <span style={{fontSize:11,fontWeight:isTd||hasA?800:400,color:tc}}>{day}</span>
              {winners.length>0&&<span style={{fontSize:8,color:D.gold}}>🏆</span>}
              {hasA&&<div style={{display:'flex',gap:1,marginTop:1}}>
                {payors.slice(0,3).map(m=><div key={m.id} style={{width:4,height:4,borderRadius:'50%',background:tColor(m,ds,past)}}/>)}
                {payors.length>3&&<span style={{fontSize:7,color:D.muted}}>+{payors.length-3}</span>}
              </div>}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12,fontSize:10,color:D.muted}}>
        {[['#00d084','Bonè ⚡'],[D.green,'Atètan ✅'],[D.orange,'Reta ⚠️'],[D.red,'Pa Peye'],[D.blue,'Pwochen'],[D.gold,'🏆 Dat Touche']].map(([c,l])=>(
          <span key={l} style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:c}}/>{l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL — ak evolisyon sol la pou manm
// ─────────────────────────────────────────────────────────────
function MemberVirtualAccount({member,plan,onClose,printer,allMemberSlots}) {
  const {tenant} = useAuthStore()
  const interval = Math.max(1, Math.floor(plan.interval) || 1)
  const allDates = useMemo(()=>getAllPaymentDates(plan),[plan])

  const multiSlots = allMemberSlots && allMemberSlots.length > 1
  const [activeSlotIdx, setActiveSlotIdx] = useState(0)
  const activeMember = multiSlots ? allMemberSlots[activeSlotIdx] : member

  const payoutDate = getPayoutDate(plan, activeMember.position)
  const today   = new Date().toISOString().split('T')[0]
  const isOwner = activeMember.isOwnerSlot

  const totalPaid=allDates.filter(d=>activeMember.payments?.[d]).length
  const totalDue=allDates.filter(d=>d<=today).length
  const amtPaid=totalPaid*plan.amount
  const amtDue=totalDue*plan.amount
  const payout=isOwner?ownerPayout(plan):memberPayout(plan)
  const progress=allDates.length>0?(totalPaid/allDates.length)*100:0
  const isWinner=payoutDate&&payoutDate<=today&&!activeMember.hasWon
  const scoreData=getMemberScore(activeMember)
  const fineTotal=Object.values(activeMember.fines||{}).reduce((a,b)=>a+Number(b),0)
  const memberStatus = computeMemberStatus(activeMember, plan, today)

  // Evolisyon sol la (% total plan)
  const totalMbrs = (plan.members || []).filter(m => m.status !== 'stopped').length
  const totalPaidAll = (plan.members || []).reduce((acc, m) =>
    acc + allDates.filter(d => m.payments?.[d]).length * plan.amount, 0)
  const totalExpectedAll = totalMbrs * totalDue * plan.amount
  const solProgress = totalExpectedAll > 0 ? (totalPaidAll / totalExpectedAll) * 100 : 0

  const tBadge=(t)=>{
    if(t==='early') return <span style={{fontSize:8,background:'rgba(0,208,132,0.15)',color:'#00d084',padding:'1px 5px',borderRadius:8,fontWeight:700}}>⚡ Bonè</span>
    if(t==='onTime') return <span style={{fontSize:8,background:D.greenBg,color:D.green,padding:'1px 5px',borderRadius:8,fontWeight:700}}>✅ Atètan</span>
    if(t==='late')   return <span style={{fontSize:8,background:D.orangeBg,color:D.orange,padding:'1px 5px',borderRadius:8,fontWeight:700}}>⚠️ Reta</span>
    return null
  }

  return (
    <Modal onClose={onClose} title={`💳 Kont — ${activeMember.name}`} width={540}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>

        {/* Statut manm */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {multiSlots && (
  <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}>
    <span style={{fontSize:10,color:D.muted,fontWeight:700,
      alignSelf:'center',marginRight:4}}>MEN:</span>
    {allMemberSlots.map((slot, idx) => (
      <button key={slot.id || idx} onClick={() => setActiveSlotIdx(idx)} style={{
        padding:'6px 13px', borderRadius:8, cursor:'pointer',
        fontSize:11, fontWeight:700, border:'none',
        background: activeSlotIdx===idx ? D.blueBg : 'rgba(255,255,255,0.05)',
        color: activeSlotIdx===idx ? D.blue : D.muted,
        outline: activeSlotIdx===idx ? `1.5px solid ${D.blue}` : '1.5px solid transparent',
        transition:'all 0.15s',
      }}>
        Men #{slot.position}
        {getPayoutDate(plan, slot.position) && (
          <span style={{fontSize:9,color:D.muted,marginLeft:5}}>
            📅 {getPayoutDate(plan, slot.position)?.split('-').reverse().join('/')}
          </span>
        )}
      </button>
    ))}
  </div>
)}
          <MemberStatusBadge status={memberStatus} />
        </div>

        {/* Kart tèt */}
        <div style={{background:isOwner?D.goldBtn:'linear-gradient(135deg,#1B2A8F,#0d1b2a)',
          border:isOwner?'none':`1px solid ${D.border}`,
          borderRadius:14,padding:'16px 18px',color:isOwner?'#0a1222':D.text}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
            <div>
              <p style={{fontSize:17,fontWeight:900,margin:'0 0 2px',wordBreak:'break-word'}}>{activeMember.name} {isOwner&&'★'}</p>
              <p style={{fontSize:11,opacity:0.65,margin:0}}>{activeMember.phone}</p>
              <p style={{fontSize:10,opacity:0.6,margin:'3px 0 0'}}>Pozisyon #{activeMember.position} • {plan.name}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:9,opacity:0.6,margin:'0 0 2px',textTransform:'uppercase',fontWeight:700}}>Kontribisyon</p>
              <p style={{fontFamily:'monospace',fontWeight:900,fontSize:18,margin:'0 0 2px'}}>{fmt(amtPaid)} HTG</p>
              <p style={{fontSize:9,opacity:0.5,margin:0}}>{totalPaid}/{allDates.length} peman</p>
            </div>
          </div>
        </div>

        {/* Avètisman si bloke */}
        {(memberStatus === 'blocked' || activeMember.status === 'blocked') && (
          <div style={{background:D.redBg,border:`1px solid ${D.red}40`,borderRadius:12,
            padding:'11px 14px',display:'flex',alignItems:'center',gap:9,fontSize:12}}>
            <Lock size={16} style={{color:D.red,flexShrink:0}}/>
            <div>
              <p style={{fontWeight:800,color:D.red,margin:'0 0 2px'}}>🔒 Kont Bloke</p>
              <p style={{color:D.muted,margin:0,fontSize:11}}>
                Manm sa dwe peye ariye a. Sèlman admin ka debloke l apre peman.
              </p>
            </div>
          </div>
        )}

        {/* Avètisman si kanpe */}
        {activeMember.status === 'stopped' && (
          <div style={{background:D.orangeBg,border:`1px solid ${D.orange}40`,borderRadius:12,
            padding:'11px 14px',display:'flex',alignItems:'center',gap:9,fontSize:12}}>
            <StopCircle size={16} style={{color:D.orange,flexShrink:0}}/>
            <div>
              <p style={{fontWeight:800,color:D.orange,margin:'0 0 2px'}}>⏸️ Kanpe</p>
              <p style={{color:D.muted,margin:0,fontSize:11}}>
                Manm sa kanpe. Li ap resevwa <strong style={{color:D.gold}}>{fmt(amtPaid)} HTG</strong> lè sol la fini.
              </p>
            </div>
          </div>
        )}

        {/* ─── Evolisyon Sol la ─── */}
        <div style={{background:'rgba(59,130,246,0.06)',border:`1px solid rgba(59,130,246,0.15)`,
          borderRadius:12,padding:'12px 14px'}}>
          <p style={{fontSize:10,fontWeight:800,color:D.blue,textTransform:'uppercase',
            letterSpacing:'0.06em',margin:'0 0 10px',display:'flex',alignItems:'center',gap:6}}>
            <TrendingUp size={11}/> Evolisyon Sol la ({totalMbrs} manm aktif)
          </p>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11}}>
            <span style={{color:D.muted}}>Total kolekte vs atann:</span>
            <span style={{fontFamily:'monospace',fontWeight:700,color:D.blue}}>
              {fmt(totalPaidAll)} / {fmt(totalExpectedAll)} HTG
            </span>
          </div>
          <div style={{height:8,borderRadius:8,background:'rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:8}}>
            <div style={{height:'100%',width:`${Math.min(100,solProgress)}%`,
              background:'linear-gradient(90deg,#3B82F6,#1B2A8F)',borderRadius:8,transition:'width 0.5s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:D.muted}}>
            <span>Sol la: <strong style={{color:solProgress>=90?D.green:solProgress>=60?D.orange:D.red}}>{Math.round(solProgress)}% ajou</strong></span>
            <span>Kalandriye: <strong style={{color:D.text}}>{allDates.length} sik total</strong></span>
          </div>
        </div>

        {/* Stats manm */}
        <div className="vacct-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8}}>
          {[
            {label:'Deja Peye',    val:`${fmt(amtPaid)} HTG`,                           color:D.green},
            {label:'Rès pou Peye',val:`${fmt(Math.max(0,amtDue-amtPaid))} HTG`,         color:D.red  },
            {label:'Ap Touche',   val:`${fmt(payout)} HTG`,                             color:D.gold },
            {label:'Dat Touche',  val:payoutDate?payoutDate.split('-').reverse().join('/'):'—',color:D.blue },
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
            <span style={{fontSize:10,color:D.muted,fontWeight:700}}>PWOGRÈ MANM</span>
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

        <button onClick={()=>printer.print(plan,activeMember,[],tenant,'kont')}
          disabled={printer.printing} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,
          padding:'11px',borderRadius:10,border:`1px solid ${D.border}`,
          background:'rgba(255,255,255,0.04)',color:D.muted,cursor:'pointer',
          fontWeight:700,fontSize:13,opacity:printer.printing?0.5:1}}>
          <Printer size={14}/> Enprime Kont
        </button>

        {/* Istwa peman */}
        <div>
          <p style={{fontSize:10,fontWeight:800,textTransform:'uppercase',color:D.muted,margin:'0 0 8px',letterSpacing:'0.06em'}}>
            Istwa Peman ({totalPaid}/{allDates.length})
          </p>
          <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
            {allDates.slice(0,60).map((d)=>{
              const paid=!!activeMember.payments?.[d]
              const timing=activeMember.paymentTimings?.[d]
              const past=d<=today
              const isPayoutDay = getPayoutDate(plan, activeMember.position) === d
              const fine=activeMember.fines?.[d]
              return (
                <div key={d} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 12px',borderRadius:9,gap:6,
                  background:isPayoutDay?D.goldDim:(paid?D.greenBg:(past?D.redBg:'rgba(255,255,255,0.02)')),
                  border:`1px solid ${isPayoutDay?D.border:paid?`${D.green}20`:past?`${D.red}20`:'transparent'}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',flex:1,minWidth:0}}>
                    <span style={{fontSize:10,fontFamily:'monospace',color:D.muted,flexShrink:0}}>{d.split('-').reverse().join('/')}</span>
                    {isPayoutDay&&<span style={{fontSize:9,background:D.goldDim,color:D.gold,padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0}}>🏆 Touche</span>}
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
// PANEL DETAY PLAN
// ─────────────────────────────────────────────────────────────
function ExchangeTab({ plan }) {
  const { token } = useAuthStore.getState ? useAuthStore.getState() : useAuthStore()
  const slug      = localStorage.getItem('plusgroup-slug')
 
  const authH = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': slug || '',
  }
 
  // ── Fetch exchanges ──
  const { data: exchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['sol-exchanges', plan.id],
    queryFn: async () => {
  const res = await fetch(`${API_URL}/sol/admin/exchange?planId=${plan.id}`, { headers: authH })
  const d   = await res.json()
  const result = d.exchanges || d || []
  return Array.isArray(result) ? result : []
},

    refetchInterval: 30000,
  })
 
  // ── Config frè ──
  const [showConfig, setShowConfig] = useState(false)
  const [cfg, setCfg] = useState({
    exchangeFeePct:      plan.exchangeFeePct      ?? 10,
    exchangeFeeAdminPct: plan.exchangeFeeAdminPct ?? 50,
  })
  const qc = useQueryClient()
 
  const saveConfig = useMutation({
    mutationFn: () => fetch(`${API_URL}/sol/admin/exchange/${plan.id}/config`, {
      method: 'PATCH',
      headers: authH,
      body: JSON.stringify(cfg),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries(['sabotay-plans'])
      setShowConfig(false)
      toast.success('✅ Konfigirasyon sove!')
    },
    onError: e => toast.error(e.message),
  })
 
  // ── Status badges ──
  const STATUS = {
    pending:  { label: 'Annatandan', color: D.orange, bg: D.orangeBg, icon: '⏳' },
    accepted: { label: 'Aksepte',    color: D.green,  bg: D.greenBg,  icon: '✅' },
    rejected: { label: 'Refize',     color: D.red,    bg: D.redBg,    icon: '❌' },
    cancelled:{ label: 'Anile',      color: D.muted,  bg: 'rgba(255,255,255,0.04)', icon: '🚫' },
  }
 
  const pending  = exchanges.filter(e => e.status === 'pending')
  const history  = exchanges.filter(e => e.status !== 'pending')
 
  // Kalkil frè pou yon echanj
  const calcFee = (ex) => {
    const feePct   = (plan.exchangeFeePct      ?? 10) / 100
    const adminPct = (plan.exchangeFeeAdminPct ?? 50) / 100
    const diff     = Math.abs(ex.receiverPosition - ex.initiatorPosition)
    const base     = diff * Number(plan.amount) * feePct
    return {
      total:    Math.round(base),
      toAdmin:  Math.round(base * adminPct),
      toMember: Math.round(base * (1 - adminPct)),
    }
  }
 
  const getMember = (pos) => plan.members?.find(m => m.position === pos)
 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 
      {/* ── HEADER: stats + config ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Total', val: exchanges.length, color: D.blue },
            { label: 'Annatandan', val: pending.length, color: D.orange },
            { label: 'Aksepte', val: exchanges.filter(e => e.status === 'accepted').length, color: D.green },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: D.card, border: `1px solid ${D.border}`, borderRadius: 9,
              padding: '7px 12px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color }}>{val}</div>
              <div style={{ fontSize: 9, color: D.muted, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowConfig(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 9,
          border: `1px solid ${D.border}`, background: 'transparent',
          color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12,
        }}>
          <Settings size={13} /> Konfigire Frè
        </button>
      </div>
 
      {/* ── CONFIG PANEL ── */}
      {showConfig && (
        <div style={{
          background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.2)`,
          borderRadius: 12, padding: '14px 16px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: D.blue, textTransform: 'uppercase',
            letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={12} /> Konfigirasyon Frè Echanj
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Frè Total Echanj (%)</label>
              <input type="number" min="0" max="100" style={{ ...inp, color: D.orange }}
                value={cfg.exchangeFeePct}
                onChange={e => setCfg(p => ({ ...p, exchangeFeePct: Number(e.target.value) }))} />
              <p style={{ fontSize: 10, color: D.muted, margin: '4px 0 0', lineHeight: 1.5 }}>
                Kalkile sou diferans pozisyon × montan plan
              </p>
            </div>
            <div>
              <label style={lbl}>Pati Admin (%)</label>
              <input type="number" min="0" max="100" style={{ ...inp, color: D.gold }}
                value={cfg.exchangeFeeAdminPct}
                onChange={e => setCfg(p => ({ ...p, exchangeFeeAdminPct: Number(e.target.value) }))} />
              <p style={{ fontSize: 10, color: D.muted, margin: '4px 0 0', lineHeight: 1.5 }}>
                Rès la ale bay manm ki desann nan
              </p>
            </div>
          </div>
          {/* Egzanp */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '9px 12px',
            fontSize: 11, color: D.muted, marginBottom: 12, lineHeight: 1.7 }}>
            <strong style={{ color: D.text }}>Egzanp:</strong> Men #2 vle achte Men #8 (diferans: 6 plas)
            <br />
            Frè total = 6 × {fmt(plan.amount)} × {cfg.exchangeFeePct}% ={' '}
            <strong style={{ color: D.orange }}>
              {fmt(Math.round(6 * Number(plan.amount) * cfg.exchangeFeePct / 100))} HTG
            </strong>
            <br />
            → Admin: <strong style={{ color: D.gold }}>
              {fmt(Math.round(6 * Number(plan.amount) * cfg.exchangeFeePct / 100 * cfg.exchangeFeeAdminPct / 100))} HTG
            </strong>{' '}
            | Manm ki desann: <strong style={{ color: D.green }}>
              {fmt(Math.round(6 * Number(plan.amount) * cfg.exchangeFeePct / 100 * (1 - cfg.exchangeFeeAdminPct / 100)))} HTG
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => setShowConfig(false)} style={{
              flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${D.borderSub}`,
              background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700,
            }}>Anile</button>
            <button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} style={{
              flex: 2, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: saveConfig.isPending ? 'rgba(59,130,246,0.3)' : `linear-gradient(135deg,${D.blue},#1d4ed8)`,
              color: '#fff', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              {saveConfig.isPending ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Settings size={13} />}
              {saveConfig.isPending ? 'Ap sove...' : 'Sove Konfigirasyon'}
            </button>
          </div>
        </div>
      )}
 
      {/* ── ECHANJ ANNATANDAN ── */}
      {pending.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.orange, textTransform: 'uppercase',
            letterSpacing: '0.07em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⏳ Annatandan ({pending.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pending.map(ex => {
              const fee      = calcFee(ex)
              const mInit    = getMember(ex.initiatorPosition)
              const mRecv    = getMember(ex.receiverPosition)
              const isUp     = ex.receiverPosition < ex.initiatorPosition // moun ki MONTE
 
              return (
                <div key={ex.id} style={{
                  background: D.card, border: `1px solid ${D.orange}30`,
                  borderRadius: 12, padding: '13px 15px',
                }}>
                  {/* Tèt: 2 manm + flèch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    {/* Inisiateur */}
                    <div style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)',
                      borderRadius: 9, padding: '7px 10px' }}>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 2 }}>Inisye</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>
                        #{ex.initiatorPosition} {mInit?.name || '—'}
                      </div>
                      <div style={{ fontSize: 10, color: D.muted }}>{mInit?.phone || ''}</div>
                    </div>
 
                    {/* Flèch echanj */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 18 }}>⇄</div>
                      <div style={{ fontSize: 9, color: D.orange, fontWeight: 700 }}>
                        Frè: {fmt(fee.total)} HTG
                      </div>
                    </div>
 
                    {/* Reseveur */}
                    <div style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)',
                      borderRadius: 9, padding: '7px 10px' }}>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 2 }}>Lòt Manm</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>
                        #{ex.receiverPosition} {mRecv?.name || '—'}
                      </div>
                      <div style={{ fontSize: 10, color: D.muted }}>{mRecv?.phone || ''}</div>
                    </div>
                  </div>
 
                  {/* Detay frè */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8,
                    padding: '7px 11px', fontSize: 10, color: D.muted,
                    display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span>Frè total: <strong style={{ color: D.orange }}>{fmt(fee.total)} HTG</strong></span>
                    <span>→ Admin: <strong style={{ color: D.gold }}>{fmt(fee.toAdmin)} HTG</strong></span>
                    <span>→ Manm desann: <strong style={{ color: D.green }}>{fmt(fee.toMember)} HTG</strong></span>
                  </div>
 
                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 10, color: D.muted }}>
                      📅 {new Date(ex.createdAt).toLocaleDateString('fr-HT')}
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                      background: STATUS[ex.status]?.bg, color: STATUS[ex.status]?.color,
                    }}>
                      {STATUS[ex.status]?.icon} {STATUS[ex.status]?.label}
                    </span>
                    {ex.initiatorAccepted && !ex.receiverAccepted && (
                      <span style={{ fontSize: 9, color: D.blue }}>Annatandan akseptasyon lòt manm</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
 
      {/* ── ISTWA ECHANJ ── */}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.muted, textTransform: 'uppercase',
            letterSpacing: '0.07em', margin: '0 0 8px' }}>
            Istwa ({history.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {history.map(ex => {
              const fee   = calcFee(ex)
              const mInit = getMember(ex.initiatorPosition)
              const mRecv = getMember(ex.receiverPosition)
              const st    = STATUS[ex.status] || STATUS.cancelled
              return (
                <div key={ex.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 10,
                  padding: '9px 13px', border: `1px solid ${D.borderSub}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.text, minWidth: 80 }}>
                    #{ex.initiatorPosition} → #{ex.receiverPosition}
                  </span>
                  <span style={{ fontSize: 11, color: D.muted, flex: 1, minWidth: 100 }}>
                    {mInit?.name || '?'} ⇄ {mRecv?.name || '?'}
                  </span>
                  {ex.status === 'accepted' && (
                    <span style={{ fontSize: 10, color: D.green, fontFamily: 'monospace', fontWeight: 700 }}>
                      {fmt(fee.total)} HTG
                    </span>
                  )}
                  <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                    background: st.bg, color: st.color, flexShrink: 0,
                  }}>
                    {st.icon} {st.label}
                  </span>
                  <span style={{ fontSize: 9, color: D.muted, flexShrink: 0 }}>
                    {new Date(ex.createdAt).toLocaleDateString('fr-HT')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
 
      {/* ── EMPTY STATE ── */}
      {!isLoading && exchanges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: D.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13 }}>Pa gen echanj pozisyon pou plan sa a.</p>
          <p style={{ margin: '6px 0 0', fontSize: 11 }}>
            Manm yo ka inisye echanj sou pòtal Sol yo.
          </p>
        </div>
      )}
 
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Loader size={22} style={{ color: D.gold, animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </div>
  )
}

function PlanDetail({plan,onBack,onAddMember,onPaymentSaved,onBlindDraw,onEditPlan,onClosePlan,onMemberAction,printer}) {
  const [viewMember,setView]       = useState(null)
  const [viewMemberSlots,setSlots] = useState(null)
  const [payMember,setPay]         = useState(null)
  const [actionModal,setAction]    = useState(null) // {member, action}
  const [tab,setTab]               = useState('members')
  const today = new Date().toISOString().split('T')[0]

  const allDates = useMemo(()=>getAllPaymentDates(plan),[plan])
  const payoutMap = useMemo(()=>getPayoutDateMap(plan),[plan])
  const [confirmingPayout, setConfirmingPayout] = useState(null) // memberId

  const todayWinPos = Object.entries(payoutMap).find(([pos, d])=>d===today)
  const todayWinner = todayWinPos ? plan.members?.find(m=>m.position===Number(todayWinPos[0])) : null

  const activeMembers = (plan.members || []).filter(m => m.status !== 'stopped')
  const totColl = activeMembers.reduce((acc,m)=>
    acc+allDates.filter(d=>m.payments?.[d]).length*plan.amount, 0)||0
  const totExp  = activeMembers.reduce((acc,m)=>
    acc+allDates.filter(d=>d<=today).length*plan.amount, 0)||0
  const payout  = memberPayout(plan)

  // Konte bloke ak reta
  const blockedCount  = (plan.members || []).filter(m => computeMemberStatus(m, plan, today) === 'blocked').length
  const lateCount     = (plan.members || []).filter(m => computeMemberStatus(m, plan, today) === 'late').length
  const stoppedCount  = (plan.members || []).filter(m => m.status === 'stopped').length
  const displayMembers = useMemo(() => {
  return (plan.members || []).flatMap(m => {
    // Metòd 1: positions array dirèk sou manm nan
    if (m.positions && Array.isArray(m.positions) && m.positions.length > 1) {
      return m.positions.map(pos => ({
        ...m,
        position: pos,
        _virtualKey: `${m.id}-${pos}`,
      }))
    }
    // Metòd 2: backend retounen chak men kòm yon rekò separe — 
    // lis la deja ekspanse, jis ajoute _virtualKey
    return [{ ...m, _virtualKey: `${m.id}-${m.position}` }]
  })
}, [plan.members])

  const handleViewMember = (m) => {
    const slots = getMemberSlots(plan, m.phone)
    setView(m)
    setSlots(slots.length > 1 ? slots : null)
  }

  return (
    <div>
      <div className="detail-head" style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:10,border:`1px solid ${D.border}`,background:'transparent',color:D.muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <ArrowLeft size={16}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <h2 style={{color:D.gold,margin:0,fontSize:17,fontWeight:900,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{plan.name}</h2>
            <PlanStatusBadge status={plan.status || 'open'} />
          </div>
          <p style={{color:D.muted,margin:0,fontSize:11}}>{freqFullLabel(plan)} • {fmt(plan.amount)} HTG / moun</p>
        </div>
        <PrinterBtn printer={printer}/>
        <button onClick={onEditPlan} title="Modifye Plan" style={{width:34,height:34,borderRadius:9,
          border:`1px solid ${D.border}`,background:'transparent',color:D.muted,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Edit3 size={14}/>
        </button>
        {/* Bouton Fèmen Plan (admin sèlman) */}
        {plan.status !== 'closed' && plan.status !== 'finished' && (
          <button onClick={onClosePlan} title="Fèmen Plan" style={{width:34,height:34,borderRadius:9,
            border:`1px solid ${D.red}40`,background:D.redBg,color:D.red,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <StopCircle size={14}/>
          </button>
        )}
        {plan.status !== 'closed' && plan.status !== 'finished' && (
          <button onClick={onAddMember} style={{padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',
            background:D.goldBtn,color:'#0a1222',fontWeight:800,fontSize:12,
            display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
            <Plus size={13}/><span>Enskri</span>
          </button>
        )}
      </div>

      {/* Avètisman si bloke/reta */}
      {(blockedCount > 0 || lateCount > 0) && (
        <div style={{background:D.redBg,border:`1px solid ${D.red}30`,borderRadius:12,
          padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:11}}>
          <AlertTriangle size={14} style={{color:D.red,flexShrink:0}}/>
          <div style={{flex:1,color:D.muted}}>
            {blockedCount > 0 && <span style={{color:D.red,fontWeight:700}}>{blockedCount} kont bloke</span>}
            {blockedCount > 0 && lateCount > 0 && <span style={{color:D.muted}}> • </span>}
            {lateCount > 0    && <span style={{color:D.orange,fontWeight:700}}>{lateCount} manm an reta</span>}
            {stoppedCount > 0 && <span style={{color:D.muted}}> • {stoppedCount} kanpe</span>}
          </div>
        </div>
      )}

      {/* Plan fèmen banner */}
      {(plan.status === 'closed' || plan.status === 'finished') && (
        <div style={{background:'rgba(231,76,60,0.08)',border:`1px solid ${D.red}30`,borderRadius:12,
          padding:'11px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10,fontSize:12}}>
          <StopCircle size={15} style={{color:D.red,flexShrink:0}}/>
          <span style={{color:D.red,fontWeight:700}}>Plan sa a fèmen. Pa gen nouvo enskripsyon ki posib.</span>
        </div>
      )}

      {todayWinner&&(
        <div style={{background:'linear-gradient(135deg,rgba(39,174,96,0.15),rgba(201,168,76,0.08))',
          border:`1px solid ${D.green}40`,borderRadius:14,padding:'13px 16px',marginBottom:16,
          display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div style={{width:44,height:44,borderRadius:12,background:D.goldBtn,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Trophy size={20} color="#0a1222"/>
          </div>
          <div style={{flex:1,minWidth:100}}>
            <p style={{fontSize:13,fontWeight:800,color:D.green,margin:'0 0 2px'}}>🎉 {todayWinner.name} ap touche jodi a! (Plas #{todayWinner.position})</p>
            <p style={{fontSize:11,color:D.muted,margin:0}}>
              Montan: <span style={{color:D.gold,fontWeight:700}}>{fmt(todayWinner.isOwnerSlot?ownerPayout(plan):payout)} HTG</span>
            </p>
          </div>
        </div>
      )}

      <div className="detail-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:9,marginBottom:16}}>
        {[
          {label:'Manm Aktif',     val:`${activeMembers.length}`, color:D.blue },
          {label:'Kolekte',        val:`${fmt(totColl)} HTG`,      color:D.green},
          {label:'Rès Atann',      val:`${fmt(Math.max(0,totExp-totColl))} HTG`, color:D.red},
          {label:'Manm Touche',    val:`${fmt(payout)} HTG`,       color:D.gold },
        ].map(({label,val,color})=>(
          <div key={label} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:10,padding:'11px 13px',textAlign:'center'}}>
            <div style={{fontSize:9,color:D.muted,textTransform:'uppercase',fontWeight:700,marginBottom:3}}>{label}</div>
            <div style={{fontFamily:'monospace',fontWeight:800,fontSize:12,color,wordBreak:'break-word'}}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        {[['members','👥 Manm'],['calendar','📅 Kalandriye'],['exchange','🔄 Echanj'],['regleman','📜 Regleman']].map(
          ([t,l]) => <button key={t} className="tab-btn" onClick={()=>setTab(t)} style={{
            padding:'8px 14px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:700,
            border:`1px solid ${tab===t?D.gold:D.borderSub}`,
            background:tab===t?D.goldDim:'transparent',
            color:tab===t?D.gold:D.muted,transition:'all 0.15s'}}>
            {l}
          </button>
        )}
        <div style={{flex:1}}/>
        <button onClick={onBlindDraw} disabled={plan.status==='closed'||plan.status==='finished'}
          style={{padding:'8px 13px',borderRadius:9,border:`1px solid ${D.blue}40`,
          background:D.blueBg,color:D.blue,fontWeight:700,fontSize:12,cursor:'pointer',
          display:'flex',alignItems:'center',gap:6,
          opacity:(plan.status==='closed'||plan.status==='finished')?0.4:1}}>
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
          ):displayMembers.map(m=>{
            const due=allDates.filter(d=>d<=today).length
            const paid=allDates.filter(d=>m.payments?.[d]).length
            const payoutDate=payoutMap[m.position]
            const isWin=payoutDate===today
            const isOwn=m.isOwnerSlot
            const fineTot=Object.values(m.fines||{}).reduce((a,b)=>a+Number(b),0)
            const mStatus = computeMemberStatus(m, plan, today)
            const samePhoneSlots = getMemberSlots(plan, m.phone)
            const hasMultiSlot = samePhoneSlots.length > 1
            const isStopped = m.status === 'stopped'

            return (
              <div key={m._virtualKey || m.id} className="member-row" style={{
                background:isStopped?'rgba(243,156,18,0.05)':
                  isOwn?'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))':
                  isWin?'linear-gradient(135deg,rgba(39,174,96,0.10),rgba(201,168,76,0.06))':D.card,
                border:`1px solid ${isStopped?`${D.orange}30`:isOwn?`${D.gold}50`:isWin?`${D.green}40`:D.border}`,
                borderRadius:12,padding:'11px 13px',
                opacity: isStopped ? 0.75 : 1}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div className="member-pos-badge" style={{width:34,height:34,borderRadius:10,flexShrink:0,
                    background:isOwn?D.goldBtn:D.goldDim,border:`1px solid ${D.border}`,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontFamily:'monospace',fontWeight:900,fontSize:11,color:isOwn?'#0a1222':D.gold}}>
  {isOwn ? '★' : `#${hasOwnerSlot(plan) ? m.position - 1 : m.position}`}
</span>
                  </div>
                  <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap',marginBottom:1}}>
                     <span className="member-name" style={{fontSize:13,fontWeight:700,
  color:isStopped?D.orange:isOwn?D.gold:D.text,
  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>
  {isOwn ? 'Pwopriyete Sol' : m.name}
</span>
{isOwn && (
  <span style={{fontSize:10,color:D.gold,opacity:0.65,
    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130,
    display:'block'}}>
    ({m.name})
  </span>
)}
                      {isWin&&!isOwn&&<span style={{fontSize:9,background:D.greenBg,color:D.green,padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0}}>🏆</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span className="member-phone" style={{fontSize:11,color:D.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.phone}</span>
                      {payoutDate&&!isStopped&&(
                        <span style={{fontSize:9,color:D.blue}}>
                          🏆 {payoutDate.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,minWidth:60}}>
                    {isStopped ? (
                      <div style={{fontSize:10,color:D.orange,fontWeight:700}}>
                        {fmt(paid*plan.amount)} HTG<br/>
                        <span style={{fontSize:9,color:D.muted}}>kontribiye</span>
                      </div>
                    ) : (
                      <>
                        <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,
                          color:paid>=due?D.green:due>0?D.orange:D.muted}}>
                          {paid}/{due}
                        </div>
                        <div style={{fontSize:10,color:D.muted}}>{fmt(paid*plan.amount)}</div>
                        {fineTot>0&&<div style={{fontSize:9,color:D.red}}>+{fmt(fineTot)} amand</div>}
                      </>
                    )}
                  </div>
                  <div className="member-btns" style={{display:'flex',gap:4,flexShrink:0}}>
                    {/* Mache Peye — sèlman si pa fèmen */}
                    {!isStopped && plan.status !== 'finished' && (
                      <button onClick={()=>setPay(m)} title="Mache Peye"
                        style={{width:30,height:30,borderRadius:8,border:'none',background:D.greenBg,color:D.green,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <CheckCircle size={14}/>
                      </button>
                    )}
                    {/* Wè Kont */}
                    <button onClick={()=>handleViewMember(m)} title="Kont Vityèl"
                      style={{width:30,height:30,borderRadius:8,border:'none',background:D.goldDim,color:D.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Eye size={14}/>
                    </button>
                    {/* Aksyon Admin: bloke/debloke/kanpe */}
                    <button onClick={()=>setAction({ member: m, action: mStatus === 'blocked' ? 'unblock' : isStopped ? 'resume' : 'block' })}
                      title={mStatus === 'blocked' ? 'Debloke' : isStopped ? 'Reprann' : 'Bloke/Kanpe'}
                      style={{width:30,height:30,borderRadius:8,border:'none',
                        background: mStatus === 'blocked' ? D.greenBg : isStopped ? D.blueBg : D.redBg,
                        color: mStatus === 'blocked' ? D.green : isStopped ? D.blue : D.red,
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {mStatus === 'blocked' ? <Unlock size={13}/> : isStopped ? <UserCheck size={13}/> : <Lock size={13}/>}
                    </button>
                  </div>
                </div>
                {due>0&&!isStopped&&(
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

      {/* Bouton Konfime Touche — si se dat touche jodi a oswa pase */}
{!isStopped && !m.hasWon && payoutDate && payoutDate <= today && (
  <button
    onClick={() => setConfirmingPayout(m)}
    title="Konfime Touche"
    style={{width:30,height:30,borderRadius:8,border:'none',
      background:'rgba(201,168,76,0.2)',color:D.gold,
      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <Trophy size={13}/>
  </button>
)}
{/* Badge si deja touche */}
{m.hasWon && (
  <span style={{fontSize:9,background:D.goldDim,color:D.gold,
    padding:'2px 7px',borderRadius:10,fontWeight:800,flexShrink:0}}>
    🏆 Touche
  </span>
)}

      {tab==='calendar'&&<PlanCalendar plan={plan}/>}

      {tab==='exchange'&&<ExchangeTab plan={plan}/>}{tab==='regleman'&&(
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
            </div>
          )}
        </div>
      )}

      {payMember&&(
        <ModalMarkPayment member={payMember} plan={plan} onClose={()=>setPay(null)}
          printer={printer}
        onSave={(memberId,dates,timings,fines)=>{
  onPaymentSaved(memberId,dates,timings,fines)
  setPay(null)
}}
/>
)}

      {viewMember&&(
        <MemberVirtualAccount
          member={viewMember}
          plan={plan}
          onClose={()=>{setView(null);setSlots(null)}}
          printer={printer}
          allMemberSlots={viewMemberSlots}
        />
      )}

      {actionModal && (
        <ModalMemberAction
          member={actionModal.member}
          plan={plan}
          action={actionModal.action}
          onClose={() => setAction(null)}
          loading={false}
          printer={printer}
          onConfirm={(action, reason) => {
            onMemberAction(actionModal.member.id, action, reason)
            setAction(null)
          }}
        />
      )}
    </div>
  )
}

{confirmingPayout && (
  <Modal onClose={() => setConfirmingPayout(null)}
    title={`🏆 Konfime Touche — ${confirmingPayout.name}`} width={420}>
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{background:D.goldDim,border:`1px solid ${D.gold}40`,
        borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
        <Trophy size={32} style={{color:D.gold,marginBottom:8}}/>
        <p style={{fontSize:16,fontWeight:900,color:D.gold,margin:'0 0 4px'}}>
          {confirmingPayout.name}
        </p>
        <p style={{fontSize:13,color:D.green,fontWeight:800,margin:0}}>
          {fmt(memberPayout(plan))} HTG
        </p>
      </div>
      <p style={{fontSize:12,color:D.muted,margin:0,lineHeight:1.7,
        background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'10px 13px'}}>
        Aksyon sa ap <strong style={{color:D.text}}>mache manm sa kòm touche</strong> epi
        voye yon <strong style={{color:D.teal}}>notifikasyon</strong> nan kont Sol li.
      </p>
      <div style={{display:'flex',gap:10}}>
        <button onClick={() => setConfirmingPayout(null)}
          style={{flex:1,padding:'12px',borderRadius:10,
            border:`1px solid ${D.borderSub}`,background:'transparent',
            color:D.muted,cursor:'pointer',fontWeight:700}}>
          Anile
        </button>
        <button onClick={() => {
          onMemberAction(confirmingPayout.id, 'payout', '')
          setConfirmingPayout(null)
        }} style={{flex:2,padding:'12px',borderRadius:10,border:'none',
          cursor:'pointer',background:D.goldBtn,color:'#0a1222',
          fontWeight:800,fontSize:14,
          display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
          <Trophy size={15}/> Konfime Touche
        </button>
      </div>
    </div>
  </Modal>
)}



// ─────────────────────────────────────────────────────────────
// RELASYON
// ─────────────────────────────────────────────────────────────
const RELATIONSHIPS = [
  { val: 'conjoint',  label: '💑 Konjwen / Konjwèt' },
  { val: 'parent',    label: '👪 Manman / Papa'      },
  { val: 'fre_se',    label: '👫 Frè / Sè'           },
  { val: 'pitit',     label: '👶 Pitit'               },
  { val: 'zanmi',     label: '🤝 Zanmi'              },
  { val: 'koleg',     label: '💼 Kolèg Travay'       },
  { val: 'lot',       label: '🔗 Lòt'                },
]
// ─────────────────────────────────────────────────────────────
// MODAL: ENSKRI MANM SOL
// - Chwazi dat (pa pozisyon) — sistèm kalkile pozisyon otomatik
// - Bouton separe pou Men Pwopriyete (plas #1)
// - Multi-men: chwazi 2+ dat → 1 kont Sol
// - Kalkil payout PROJETE (ak nouvo manm yo)
// ─────────────────────────────────────────────────────────────
function ModalAddMember({ plan, onClose, onSave, loading, onShowCreds }) {

  // === SLOTS DISPONIB (pozisyon + dat korespondan) ===
  const { availableSlots, ownerSlotAvailable } = useMemo(() => {
    const taken     = new Set((plan.members || []).map(m => m.position))
    const maxPos    = Math.max(0, ...(plan.members || []).map(m => m.position))
    const nextPos   = maxPos + 1

    // Pwopriyete disponib sèlman si feePerMember===amount ak plas #1 lib
    const ownerSlotAvailable = hasOwnerSlot(plan) && !taken.has(1)

    // Pozisyon lib (gap + prochèn) — exclure #1 si owner slot
    const PREVIEW_SLOTS = 10
const gaps = Array.from({ length: maxPos }, (_, i) => i + 1)
  .filter(p => !taken.has(p) && p !== 1)

  const futureSlots = Array.from(
  { length: PREVIEW_SLOTS },
  (_, i) => maxPos + 1 + i
)

const allPos = [...gaps, ...futureSlots]

    const availableSlots = allPos.map(pos => ({
      position: pos,
      date: getPayoutDate(plan, pos),
    }))

    return { availableSlots, ownerSlotAvailable }
  }, [plan])

  // === STATE ===
  const [selectedSlots,    setSelectedSlots]    = useState([])   // [{position, date}]
  const [ownerMode,        setOwnerMode]        = useState(false)
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false)
  const [tab,              setTab]              = useState('info')
  const [form, setForm] = useState({
    name: '', phone: '',
    cin: '', nif: '', address: '',
    referenceName: '', referencePhone: '', relationship: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [photoB64,       setPhotoB64]       = useState(null)
  const [idPhotoB64,     setIdPhotoB64]     = useState(null)
  const [existingAccount,  setExistingAccount]  = useState(null)
  const [checkingPhone,    setCheckingPhone]    = useState(false)

  // Pozisyon chwazi (owner = [1], sinon slots chwazi yo)
  const positions = ownerMode ? [1] : selectedSlots.map(s => s.position)

  // === KALKIL PAYOUT PROJETE (ak nouvo manm yo konte ladan) ===
  const currentActive       = (plan.members || []).filter(m => m.status !== 'stopped').length
  const projectedTotal      = currentActive + positions.length
  const projectedMemberPay  = Math.max(0, Number(plan.amount) * projectedTotal - Number(plan.feePerMember || 0))
  const projectedOwnerPay   = Number(plan.amount) * projectedTotal
  const totalPerCycle       = positions.length * Number(plan.amount)

  // === HELPERS ===
  const toggleSlot = (slot) => {
    setOwnerMode(false)
    setSelectedSlots(prev =>
      prev.find(s => s.position === slot.position)
        ? prev.filter(s => s.position !== slot.position)
        : [...prev, slot]
    )
  }

  const checkPhone = useCallback(async (phone) => {
    if (phone.replace(/\D/g, '').length < 8) { setExistingAccount(null); return }
    setCheckingPhone(true)
    try {
      const slug    = localStorage.getItem('plusgroup-slug')
      const { token } = useAuthStore.getState()
      const res = await fetch(
        `${API_URL}/sabotay/sol-account?phone=${encodeURIComponent(phone)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' } }
      )
      const data = await res.json()
      setExistingAccount(res.ok ? (data.account || null) : null)
    } catch { setExistingAccount(null) }
    finally { setCheckingPhone(false) }
  }, [])

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      if (type === 'photo')   { setPhotoPreview(b64); setPhotoB64(b64) }
      if (type === 'idPhoto') { setIdPhotoPreview(b64); setIdPhotoB64(b64) }
    }
    reader.readAsDataURL(file)
  }

  const doSave = (isOwnerSlot, finalPositions) => {
    const firstPos   = finalPositions[0]
    const credentials = existingAccount ? null : generateCredentials(form.name, form.phone)
    const payoutDatesMap = {}
    finalPositions.forEach(p => { payoutDatesMap[p] = getPayoutDate(plan, p) })

    onSave({
      ...form,
      position: firstPos,
      positions: finalPositions,
      credentials,
      isOwnerSlot,
      cin:            form.cin            || null,
      nif:            form.nif            || null,
      address:        form.address        || null,
      photoUrl:       photoB64            || null,
      idPhotoUrl:     idPhotoB64          || null,
      referenceName:  form.referenceName  || null,
      referencePhone: form.referencePhone || null,
      relationship:   form.relationship   || null,
      preferredDate:  payoutDatesMap[firstPos] || null,
      _cb: (saved) => onShowCreds({
        member: saved || { ...form, position: firstPos, positions: finalPositions },
        credentials: existingAccount
          ? { username: existingAccount.username, password: null, isExisting: true }
          : credentials,
        positions:    finalPositions,
        payoutDates:  payoutDatesMap,
      }),
    })
  }

  const handleSubmit = () => {
    if (!form.name)  return toast.error('Non manm obligatwa.')
    if (!form.phone) return toast.error('Telefòn obligatwa.')
    if (ownerMode) {
      setShowOwnerConfirm(true)
    } else {
      if (!selectedSlots.length) return toast.error('Chwazi omwen yon dat.')
      doSave(false, positions)
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
    fontSize: 11, fontWeight: 700, border: 'none',
    background: active ? D.goldDim : 'transparent',
    color: active ? D.gold : D.muted,
    borderBottom: active ? `2px solid ${D.gold}` : '2px solid transparent',
    transition: 'all 0.15s',
  })

  const imgBox = {
    width: '100%', height: 90, borderRadius: 10,
    border: `1px solid ${D.border}`, background: 'rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', overflow: 'hidden',
  }

  return (
    <Modal onClose={onClose} title="👤 Enskri Manm Sol" width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── BOUTON MEN PWOPRIYETE (si disponib) ── */}
        {ownerSlotAvailable && (
          <button
            onClick={() => { setOwnerMode(o => !o); setSelectedSlots([]) }}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              border: `2px solid ${ownerMode ? D.gold : `${D.gold}50`}`,
              background: ownerMode ? D.goldBtn : D.goldDim,
              color: ownerMode ? '#0a1222' : D.gold,
              cursor: 'pointer', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.18s',
            }}
          >
            <Star size={14} />
            {ownerMode ? '⭐ Mode Pwopriyete Aktif — Plas #1' : 'Enskri kòm Pwopriyete Sol (Plas #1)'}
          </button>
        )}

        {/* Detay owner mode */}
        {ownerMode && (
          <div style={{ background: 'rgba(201,168,76,0.07)', border: `1px solid ${D.gold}40`,
            borderRadius: 10, padding: '10px 13px', fontSize: 11, color: D.muted, lineHeight: 1.7 }}>
            <span style={{ color: D.gold, fontWeight: 700 }}>Pwopriyete</span> kolekte totalite kòb sol la —
            {' '}<strong style={{ color: D.gold }}>{fmt(projectedOwnerPay)} HTG</strong>{' '}
            (fè a kouvri kontribisyon li, li pa peye separeman).
          </div>
        )}

        {/* ── CHWAZI DAT (sèlman si pa owner mode) ── */}
        {!ownerMode && (
          <div style={{ background: D.goldDim, borderRadius: 12, padding: '12px 14px' }}>
            <label style={{ ...lbl, marginBottom: 8 }}>📅 Chwazi Dat Touche</label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {availableSlots.map(slot => {
                const isActive  = !!selectedSlots.find(s => s.position === slot.position)
                const dateDisp  = slot.date ? slot.date.split('-').reverse().join('/') : '—'
                const isNewest  = slot.position === Math.max(...availableSlots.map(s => s.position))
                return (
                  <button key={slot.position} onClick={() => toggleSlot(slot)} style={{
                    padding: '9px 11px', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 76,
                    position: 'relative', transition: 'all 0.12s',
                    border: `2px solid ${isActive ? D.blue : isNewest ? `${D.gold}50` : D.borderSub}`,
                    background: isActive ? D.blueBg : isNewest ? 'rgba(201,168,76,0.05)' : 'transparent',
                  }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11,
                      color: isActive ? D.blue : isNewest ? D.gold : D.text }}>
                      {dateDisp}
                    </span>
                    <span style={{ fontSize: 9, color: isActive ? D.blue : D.muted, marginTop: 2 }}>
                      Men #{slot.position}
                    </span>
                    {isNewest && !isActive && (
                      <span style={{ fontSize: 8, color: D.gold }}>NOUVO</span>
                    )}
                    {isActive && (
                      <span style={{
                        position: 'absolute', top: -5, right: -5,
                        background: D.blue, color: '#fff',
                        borderRadius: 6, padding: '1px 4px', fontSize: 8, fontWeight: 900,
                      }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Rezime men chwazi */}
            {selectedSlots.length > 0 && (
              <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '9px 12px' }}>
                {selectedSlots.map(s => (
                  <div key={s.position} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 11, color: D.muted, marginBottom: 3,
                  }}>
                    <span style={{ color: D.text, fontWeight: 600 }}>Men #{s.position}</span>
                    <span style={{ display: 'flex', gap: 10 }}>
                      <span>📅 {s.date?.split('-').reverse().join('/') || '—'}</span>
                      <span style={{ color: D.green }}>🏆 {fmt(projectedMemberPay)} HTG</span>
                    </span>
                  </div>
                ))}
                {selectedSlots.length > 1 && (
                  <div style={{
                    borderTop: `1px solid ${D.borderSub}`, paddingTop: 6, marginTop: 5,
                    display: 'flex', justifyContent: 'space-between', fontSize: 11,
                  }}>
                    <span style={{ color: D.muted }}>Peman pa sik:</span>
                    <span style={{ color: D.orange, fontWeight: 700 }}>
                      {selectedSlots.length} × {fmt(plan.amount)} HTG = {fmt(totalPerCycle)} HTG
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${D.borderSub}` }}>
          {[['info', '👤 Enfòmasyon'], ['kyc', '🪪 KYC'], ['ref', '📞 Referans']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={lbl}>Non Manm *</label>
              <input style={inp} value={form.name}
                onChange={e => set('name', e.target.value)} placeholder="Non ak Prenon" />
            </div>
            <div>
              <label style={lbl}>
                Telefòn *{' '}
                {checkingPhone && <span style={{ color: D.muted, fontWeight: 400 }}>ap verifye...</span>}
              </label>
              <input style={{ ...inp, fontSize: 16 }} inputMode="tel" value={form.phone}
                onChange={e => { set('phone', e.target.value); checkPhone(e.target.value) }}
                placeholder="+509 XXXX XXXX" />
            </div>
            {existingAccount && (
              <div style={{
                background: 'rgba(20,184,166,0.08)', border: `1px solid ${D.teal}40`,
                borderRadius: 10, padding: '10px 13px',
                display: 'flex', alignItems: 'flex-start', gap: 9,
              }}>
                <UserCheck size={18} style={{ color: D.teal, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: D.teal, margin: '0 0 3px' }}>
                    ♻️ Kont Sol egziste — {existingAccount.memberName}
                  </p>
                  <p style={{ fontSize: 11, color: D.muted, margin: 0, lineHeight: 1.6 }}>
                    Nouvo men ap ajoute nan <strong style={{ color: D.text }}>menm kont lan</strong>.<br />
                    Username: <strong style={{ color: D.text, fontFamily: 'monospace' }}>{existingAccount.username}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'kyc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>CIN</label>
                <input style={inp} value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="1-23-456789-0" />
              </div>
              <div>
                <label style={lbl}>NIF</label>
                <input style={inp} value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000-123-456-7" />
              </div>
            </div>
            <div>
              <label style={lbl}>Adres</label>
              <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Foto Kliyan</label>
                <label htmlFor="sol-photo-upload" style={{ ...imgBox, cursor: 'pointer' }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ textAlign: 'center', color: D.muted }}><div style={{ fontSize: 24 }}>📷</div><div style={{ fontSize: 9 }}>Klike pou foto</div></div>}
                  <input id="sol-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e, 'photo')} />
                </label>
              </div>
              <div>
                <label style={lbl}>Foto Pyes Idantite</label>
                <label htmlFor="sol-id-upload" style={{ ...imgBox, cursor: 'pointer' }}>
                  {idPhotoPreview
                    ? <img src={idPhotoPreview} alt="id" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ textAlign: 'center', color: D.muted }}><div style={{ fontSize: 24 }}>🪪</div><div style={{ fontSize: 9 }}>CIN / Paspo</div></div>}
                  <input id="sol-id-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e, 'idPhoto')} />
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === 'ref' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={lbl}>Non Moun Referans</label>
              <input style={inp} value={form.referenceName}
                onChange={e => set('referenceName', e.target.value)} placeholder="Non ak Prenon referans" />
            </div>
            <div>
              <label style={lbl}>Telefòn Referans</label>
              <input style={inp} inputMode="tel" value={form.referencePhone}
                onChange={e => set('referencePhone', e.target.value)} placeholder="+509 XXXX XXXX" />
            </div>
            <div>
              <label style={lbl}>Relasyon</label>
              <select style={{ ...inp, appearance: 'none', cursor: 'pointer' }}
                value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option value="">— Chwazi relasyon —</option>
                {RELATIONSHIPS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── KONFIRMASYON 2 ETAP — MEN PWOPRIYETE ── */}
        {ownerMode && showOwnerConfirm && (
          <div style={{
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: 14, padding: '16px 15px',
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: D.gold, margin: '0 0 8px' }}>
              ⭐ Konfime Men Pwopriyete Sol
            </p>
            <p style={{ fontSize: 11, color: D.muted, margin: '0 0 12px', lineHeight: 1.7 }}>
              Plas #1 se <strong style={{ color: D.gold }}>Men Pwopriyete Sol la</strong>.
              Li ap kolekte <strong style={{ color: D.text }}>{fmt(projectedOwnerPay)} HTG</strong>{' '}
              san frè. Lòt manm yo ap touche{' '}
              <strong style={{ color: D.green }}>{fmt(projectedMemberPay)} HTG</strong> chak.
              Desizyon sa <strong style={{ color: D.red }}>pa ka chanje</strong> apre.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowOwnerConfirm(false)} style={{
                flex: 1, padding: '10px', borderRadius: 9,
                border: `1px solid ${D.borderSub}`, background: 'transparent',
                color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>← Tounen</button>
              <button
                disabled={loading}
                onClick={() => {
                  setShowOwnerConfirm(false)
                  doSave(true, [1])
                }}
                style={{
                  flex: 2, padding: '10px', borderRadius: 9, border: 'none',
                  cursor: 'pointer', background: D.goldBtn, color: '#0a1222',
                  fontWeight: 800, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {loading ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Star size={13} />}
                Wi, Kreye Men Pwopriyete
              </button>
            </div>
          </div>
        )}

        {/* ── BOUTON FINAL ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', borderRadius: 10,
            border: `1px solid ${D.borderSub}`, background: 'transparent',
            color: D.muted, cursor: 'pointer', fontWeight: 700,
          }}>Anile</button>

          <button
            disabled={loading || showOwnerConfirm || (!ownerMode && selectedSlots.length === 0)}
            onClick={handleSubmit}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn,
              color: '#0a1222', fontWeight: 800, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              opacity: (!ownerMode && selectedSlots.length === 0) ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading
              ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
              : ownerMode
                ? <Star size={15} />
                : <Users size={15} />}
            {loading
              ? 'Ap enskri...'
              : ownerMode
                ? 'Enskri Pwopriyete Sol'
                : selectedSlots.length > 1
                  ? `Enskri — ${selectedSlots.length} Men (${fmt(totalPerCycle)} HTG/sik)`
                  : selectedSlots.length === 1
                    ? 'Enskri — 1 Men'
                    : 'Chwazi Dat Anvan'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: KREDANSYÈL
// ─────────────────────────────────────────────────────────────
function ModalMemberCredentials({ member, credentials, onClose, positions, payoutDates }) {
  const [copied, setCopied] = useState(false)
  const isExisting = credentials?.isExisting

  const text = isExisting
    ? `Non: ${member.name}\nItilizatè: ${credentials.username}\nURL: https://app.plusgroupe.com/app/sol/login`
    : `Non: ${member.name}\nItilizatè: ${credentials?.username}\nModpas: ${credentials?.password}\nURL: https://app.plusgroupe.com/app/sol/login`

  const copy = () => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })

  return (
    <Modal onClose={onClose} title={isExisting ? '🔗 Pozisyon Ajoute!' : '🔑 Kont Kliyan Kreye!'} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: isExisting ? 'rgba(20,184,166,0.1)' : D.greenBg, border: `1px solid ${isExisting ? D.teal : D.green}30`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCheck size={22} style={{ color: isExisting ? D.teal : D.green, flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 800, color: isExisting ? D.teal : D.green, margin: 0 }}>
            {isExisting ? `Men ajoute pou ${member.name}` : `Kont kreye pou ${member.name}`}
          </p>
        </div>

        {positions && positions.length > 0 && (
          <div style={{ background: D.goldDim, borderRadius: 12, padding: '11px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: D.gold, textTransform: 'uppercase', margin: '0 0 8px' }}>Men Enskri</p>
            {positions.map(p => (
              <div key={p} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 7, marginBottom: 4 }}>
                <span style={{ color: D.text, fontWeight: 600 }}>Men #{p}</span>
                <span style={{ color: D.muted }}>📅 {payoutDates?.[p]?.split('-').reverse().join('/') || '—'}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: D.purpleBg, border: `1px solid rgba(155,89,182,0.20)`, borderRadius: 14, padding: '16px' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.purple, textTransform: 'uppercase', margin: '0 0 12px', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Key size={11} /> Enfòmasyon Koneksyon
          </p>
          <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>URL Login</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: D.teal, background: 'rgba(0,0,0,0.25)', padding: '7px 12px', borderRadius: 8, marginBottom: 10, wordBreak: 'break-all' }}>app.plusgroupe.com/app/sol/login</div>
          <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>Non Itilizatè</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: D.text, background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 8, wordBreak: 'break-all', marginBottom: 10 }}>{credentials?.username}</div>
          {!isExisting && credentials?.password && (
            <>
              <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>Modpas Pwovizwa</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 22, color: D.gold, background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 8, letterSpacing: '0.15em', textAlign: 'center' }}>{credentials.password}</div>
            </>
          )}
        </div>

        {!isExisting && <p style={{ fontSize: 11, color: D.muted, margin: 0, background: D.redBg, borderRadius: 8, padding: '8px 12px' }}>⚠️ Note modpas sa kounye a. Kliyan dwe chanje l apre premye koneksyon.</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={copy} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'rgba(255,255,255,0.05)', color: copied ? D.green : D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            {copied ? '✅ Kopye!' : '📋 Kopye'}
          </button>
          <button onClick={onClose} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>Fèmen</button>
        </div>
      </div>
    </Modal>
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

  const qc       = useQueryClient()
  const {tenant} = useAuthStore()
  const printer  = usePrinterState()

  const [selectedPlan,  setSelected]   = useState(null)
  const [showCreate,    setShowCreate]  = useState(false)
  const [editingPlan,   setEditing]     = useState(null)
  const [showAddMember, setAddMember]   = useState(false)
  const [showDraw,      setDraw]        = useState(false)
  const [showClosePlan, setClosePlan]   = useState(false)
  const [search,        setSearch]      = useState('')
  const [memberCreds,   setMemberCreds] = useState(null)

  const { data:plans=[], isLoading, error, refetch } = useQuery({
    queryKey:['sabotay-plans'],
    queryFn:()=>apiFetch('/sabotay/plans').then(r=>{
      const result = r.plans||r.data||r
      return Array.isArray(result) ? result : []
    }),
    refetchInterval:60000,
  })

  const activePlan = selectedPlan ? plans.find(p=>p.id===selectedPlan.id)||selectedPlan : null

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

  const closePlan = useMutation({
    mutationFn:(id)=>apiFetch(`/sabotay/plans/${id}/close`,{method:'POST'}),
    onSuccess:()=>{
      qc.invalidateQueries(['sabotay-plans'])
      setClosePlan(false)
      toast.success('✅ Plan fèmen!')
    },
    onError:(e)=>toast.error(e.message),
  })

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

  // ─── Aksyon sou manm: bloke, debloke, kanpe, reprann ───
  const memberAction = useMutation({
    mutationFn:({planId, memberId, action, reason})=>apiFetch(
      `/sabotay/plans/${planId}/members/${memberId}/action`,
      {method:'POST',body:JSON.stringify({action,reason})}
    ),
    onSuccess:(r, vars)=>{
      qc.invalidateQueries(['sabotay-plans'])
      const labels = { block:'🔒 Bloke!', unblock:'🔓 Debloke!', stop:'⏸️ Kanpe!', resume:'▶️ Reprann!' }
      toast.success(labels[vars.action] || '✅ Fèt!')
    },
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

  const today = new Date().toISOString().split('T')[0]
  const totalMembers   = plans.reduce((a,p)=>a+(p.members?.length||0),0)
  const totalCollected = plans.reduce((a,p)=>
    a+(p.members||[]).filter(m=>m.status!=='stopped').reduce((b,m)=>{
      const allD = getAllPaymentDates(p)
      return b+allD.filter(d=>m.payments?.[d]).length*p.amount
    },0),0)
  const activePlans = plans.filter(p=>p.status!=='closed'&&p.status!=='finished').length

  // Konte avètisman global
  const globalWarnings = plans.reduce((a, p) => {
    return a + (p.members || []).filter(m => {
      const s = computeMemberStatus(m, p, today)
      return s === 'blocked' || s === 'late'
    }).length
  }, 0)

  const filtered = plans.filter(p=>
    p.name?.toLowerCase().includes(search.toLowerCase())||
    freqFullLabel(p).toLowerCase().includes(search.toLowerCase())
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
          onClosePlan={()=>setClosePlan(true)}
          onMemberAction={(memberId, action, reason) =>
            memberAction.mutate({ planId: activePlan.id, memberId, action, reason })
          }
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

          {/* Avètisman global */}
          {globalWarnings > 0 && (
            <div style={{background:D.orangeBg,border:`1px solid ${D.orange}30`,borderRadius:12,
              padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10,fontSize:11}}>
              <AlertTriangle size={14} style={{color:D.orange,flexShrink:0}}/>
              <span style={{color:D.orange,fontWeight:700}}>
                {globalWarnings} manm an reta oswa bloke nan tout plan yo.
              </span>
            </div>
          )}

          <div className="top-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:20}}>
            {[
              {label:'Plan Aktif',    val:activePlans,       color:D.gold,   bg:D.goldDim,   icon:<Wallet size={16}/>  },
              {label:'Total Manm',   val:totalMembers,       color:D.blue,   bg:D.blueBg,    icon:<Users size={16}/>   },
              {label:'Kolekte (HTG)',val:fmt(totalCollected), color:D.green,  bg:D.greenBg,   icon:<Trophy size={16}/>  },
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
                const activeMbrs = (plan.members||[]).filter(m=>m.status!=='stopped')
                const filled     = activeMbrs.length
                const allD       = getAllPaymentDates(plan)
                const coll       = activeMbrs.reduce((a,m)=>a+allD.filter(d=>m.payments?.[d]).length*plan.amount,0)||0
                const payMap     = getPayoutDateMap(plan)
                const todayWinE  = Object.entries(payMap).find(([,d])=>d===today)
                const winner     = todayWinE ? plan.members?.find(m=>m.position===Number(todayWinE[0])) : null
                const payout     = memberPayout(plan)
                const warnings   = (plan.members||[]).filter(m=>{
                  const s = computeMemberStatus(m, plan, today)
                  return s==='blocked'||s==='late'
                }).length

                return (
                  <div key={plan.id} className="plan-card" onClick={()=>setSelected(plan)}
                    style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:14,
                      padding:'14px 16px',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10,gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap'}}>
                          <h3 style={{color:'#fff',margin:0,fontSize:14,fontWeight:800,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{plan.name}</h3>
                          <PlanStatusBadge status={plan.status||'open'}/>
                          {warnings > 0 && (
                            <span style={{fontSize:9,background:D.redBg,color:D.red,padding:'2px 7px',borderRadius:10,fontWeight:700}}>
                              ⚠️ {warnings}
                            </span>
                          )}
                        </div>
                        <p style={{color:D.muted,margin:0,fontSize:11}}>
                          {freqFullLabel(plan)} •{' '}
                          <span style={{color:D.gold,fontWeight:700}}>{fmt(plan.amount)} HTG</span>
                          {Number(plan.penalty)>0&&<span style={{color:D.red}}> • Amand {fmt(plan.penalty)}</span>}
                          {Number(plan.warningDelayDays)>0&&<span style={{color:D.orange}}> • ⚠️ {plan.warningDelayDays}j reta</span>}
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
                      <span style={{fontSize:10,color:D.muted}}>{filled} manm aktif • {allD.length} sik total</span>
                      <span style={{fontSize:10,color:plan.status==='open'?D.green:D.red,fontWeight:700}}>
                        {plan.status==='open'?'🟢 Ouvè':'🔴 Fèmen'}
                      </span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:11,color:D.muted}}>
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

      {/* ─── MODALS ─── */}
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
        <ModalAddMember
          plan={activePlan}
          onClose={()=>setAddMember(false)}
          loading={addMember.isPending}
          onSave={(data)=>addMember.mutate(data)}
          onShowCreds={(data)=>{ setMemberCreds(data); setAddMember(false) }}
        />
      )}
      {showDraw&&activePlan&&(
        <ModalBlindDraw plan={activePlan} onClose={()=>setDraw(false)}
          loading={blindDraw.isPending}
          onConfirm={(member)=>blindDraw.mutate(member.id)}/>
      )}
      {showClosePlan&&activePlan&&(
        <ModalClosePlan
          plan={activePlan}
          onClose={()=>setClosePlan(false)}
          loading={closePlan.isPending}
          onConfirm={()=>closePlan.mutate(activePlan.id)}
        />
      )}
      {memberCreds&&(
        <ModalMemberCredentials
          member={memberCreds.member}
          credentials={memberCreds.credentials}
          positions={memberCreds.positions}
          payoutDates={memberCreds.payoutDates}
          onClose={()=>setMemberCreds(null)}
        />
      )}
    </div>
  )
}
