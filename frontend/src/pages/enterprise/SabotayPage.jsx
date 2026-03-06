// src/pages/enterprise/SabotayPage.jsx
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users, Plus, X, Calendar, ChevronRight, ChevronLeft,
  Wallet, TrendingUp, Bell, Eye, CheckCircle, Clock,
  Settings, RefreshCw, Trophy, AlertCircle, ArrowLeft, Search,
  Printer, Bluetooth, BluetoothOff,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, printSabotayReceipt
} from '../../services/printerService'

// ─────────────────────────────────────────────────────────────
// MOCK DATA (retire lè backend prè)
// ─────────────────────────────────────────────────────────────
let _nextPlanId  = 4
let _nextMemberId = 10

const MOCK_PLANS = [
  {
    id: 1, name: 'Sol 100 Jou', amount: 100, fee: 10,
    frequency: 'daily', maxMembers: 20,
    members: [
      { id: 1, name: 'Marie Joseph',   phone: '+509 3714-0001', position: 1,  joinedAt: '2025-01-01', payments: { '2025-03-01': true, '2025-03-02': true, '2025-03-03': false } },
      { id: 2, name: 'Jean Pierre',    phone: '+509 3714-0002', position: 2,  joinedAt: '2025-01-02', payments: { '2025-03-01': true, '2025-03-02': false } },
      { id: 3, name: 'Rose Dorval',    phone: '+509 3714-0003', position: 3,  joinedAt: '2025-01-03', payments: { '2025-03-01': true } },
      { id: 4, name: 'Claude Moreau',  phone: '+509 3714-0004', position: 4,  joinedAt: '2025-01-04', payments: {} },
      { id: 5, name: 'Anne Bertrand',  phone: '+509 3714-0005', position: 5,  joinedAt: '2025-01-05', payments: { '2025-03-01': true, '2025-03-02': true } },
    ],
    createdAt: '2025-01-01',
    active: true,
  },
  {
    id: 2, name: 'Sol 500 Samdi', amount: 500, fee: 50,
    frequency: 'weekly_saturday', maxMembers: 10,
    members: [
      { id: 6, name: 'Paul Estimé',    phone: '+509 3714-0006', position: 1,  joinedAt: '2025-01-05', payments: { '2025-03-01': true } },
      { id: 7, name: 'Lucie Francois', phone: '+509 3714-0007', position: 2,  joinedAt: '2025-01-06', payments: {} },
      { id: 8, name: 'Marc Antoine',   phone: '+509 3714-0008', position: 3,  joinedAt: '2025-01-07', payments: { '2025-03-01': true } },
    ],
    createdAt: '2025-01-05',
    active: true,
  },
  {
    id: 3, name: 'Sol 1000 Mwa', amount: 1000, fee: 100,
    frequency: 'monthly', maxMembers: 15,
    members: [
      { id: 9, name: 'Simone Lafleur', phone: '+509 3714-0009', position: 1, joinedAt: '2025-01-10', payments: { '2025-03-01': true } },
    ],
    createdAt: '2025-01-10',
    active: true,
  },
]

const FREQ_LABELS = {
  daily:            { ht: 'Chak Jou',       fr: 'Chaque jour',    en: 'Daily'          },
  weekly_saturday:  { ht: 'Chak Samdi',     fr: 'Chaque samedi',  en: 'Every Saturday' },
  weekly_monday:    { ht: 'Chak Lendi',     fr: 'Chaque lundi',   en: 'Every Monday'   },
  biweekly:         { ht: 'Chak 15 Jou',   fr: 'Tous les 15 j.', en: 'Every 2 weeks'  },
  monthly:          { ht: 'Chak Mwa',       fr: 'Chaque mois',    en: 'Monthly'        },
  weekdays:         { ht: 'Lendi-Vandredi', fr: 'Lun-Ven',        en: 'Weekdays'       },
}

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const D = {
  bg:         '#060f1e',
  card:       '#0d1b2a',
  cardHov:    '#112236',
  border:     'rgba(201,168,76,0.18)',
  borderSub:  'rgba(255,255,255,0.07)',
  gold:       '#C9A84C',
  goldDk:     '#8B6914',
  goldBtn:    'linear-gradient(135deg,#C9A84C,#8B6914)',
  goldDim:    'rgba(201,168,76,0.10)',
  green:      '#27ae60', greenBg: 'rgba(39,174,96,0.12)',
  red:        '#e74c3c', redBg:   'rgba(231,76,60,0.10)',
  blue:       '#3B82F6', blueBg:  'rgba(59,130,246,0.10)',
  orange:     '#f39c12', orangeBg:'rgba(243,156,18,0.10)',
  purple:     '#9b59b6', purpleBg:'rgba(155,89,182,0.10)',
  text:       '#e8eaf0',
  muted:      '#6b7a99',
  label:      'rgba(201,168,76,0.75)',
  input:      '#060f1e',
  shadow:     '0 8px 32px rgba(0,0,0,0.55)',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// ─────────────────────────────────────────────────────────────
// PRINTER HOOK — Bluetooth ESC/POS
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
      if (err.name !== 'NotFoundError') {
        toast.error('Pa ka konekte printer. Asire Bluetooth aktive.')
      }
    } finally {
      setConnecting(false)
    }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter()
    setConnected(false)
    toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  // ── ESC/POS si konekte, sinon browser popup
  const print = useCallback(async (plan, member, paidDates, tenant, type) => {
    if (isPrinterConnected()) {
      setPrinting(true)
      try {
        await printSabotayReceipt(plan, member, paidDates, tenant, type)
        toast.success('Resi enprime!')
        return true
      } catch (err) {
        setConnected(false)
        toast.error('Erè printer. Eseye konekte ankò.')
        return false
      } finally {
        setPrinting(false)
      }
    }
    // Fallback browser
    printReceiptBrowser(buildReceiptHTML(plan, member, paidDates, tenant, type))
    return true
  }, [])

  return { connected, connecting, printing, connect, disconnect, print }
}

// ─────────────────────────────────────────────────────────────
// BROWSER PRINT FALLBACK
// ─────────────────────────────────────────────────────────────
function printReceiptBrowser(html) {
  const w = window.open('', '_blank', 'width=340,height=620')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>Resi Sabotay</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff;font-family:'Courier New',monospace;font-size:10px}
    @media print{@page{margin:0;size:80mm auto}body{margin:0}}</style>
  </head><body>${html}</body></html>`)
  w.document.close()
  w.onload = () => { setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 1000) }, 200) }
}

function buildReceiptHTML(plan, member, paidDates = [], tenant, type = 'peman') {
  const biz    = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const logo   = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" style="height:34px;display:block;margin:0 auto 4px;max-width:100%;object-fit:contain"/>`
    : ''
  const now    = new Date()
  const txDate = now.toLocaleDateString('fr-HT') + ' ' + now.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' })
  const payout = (plan.amount * plan.maxMembers) - (plan.fee || 0)
  const totalPaid = Object.keys(member.payments || {}).filter(d => member.payments[d]).length
  const amountPaid = totalPaid * plan.amount
  const totalAmount = paidDates.length * plan.amount

  const fmtAmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

  return `<div style="width:80mm;padding:4mm 3mm;background:#fff;color:#1a1a1a;font-family:'Courier New',monospace;font-size:10px;line-height:1.5">
    <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:5px">
      ${logo}
      <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
      <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- SABOTAY SOL --</div>
      ${tenant?.phone   ? `<div style="font-size:9px;color:#555">Tel: ${tenant.phone}</div>` : ''}
      ${tenant?.address ? `<div style="font-size:9px;color:#555">${tenant.address}</div>`   : ''}
    </div>
    <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:5px">
      ${type === 'peman' ? 'RESI PEMAN' : 'KONT MANM'}
    </div>
    <div style="font-size:9px;margin-bottom:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Plan:</span><span style="font-weight:700">${plan.name}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#555">Dat:</span><span>${txDate}</span></div>
    </div>
    <div style="background:#f8f8f8;padding:4px 6px;border-radius:3px;border-left:2px solid #ccc;margin-bottom:5px;font-size:9px">
      <div style="font-weight:700">${member.name}</div>
      ${member.phone ? `<div>${member.phone}</div>` : ''}
      <div>Pozisyon #${member.position}</div>
    </div>
    <div style="border-top:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
      ${type === 'peman' ? `
        <div style="font-weight:700;margin-bottom:3px">Dat Peye:</div>
        ${paidDates.map(d => `<div style="display:flex;justify-content:space-between"><span>${d.split('-').reverse().join('/')}</span><span style="font-weight:600;color:#16a34a">+${fmtAmt(plan.amount)} HTG</span></div>`).join('')}
        <div style="border-top:2px solid #111;padding-top:4px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:Arial;font-weight:900;font-size:12px">TOTAL</span>
          <span style="font-family:Arial;font-weight:900;font-size:13px;color:#16a34a">${fmtAmt(totalAmount)} HTG</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px"><span style="color:#555">Kontribisyon total:</span><span style="font-weight:700">${fmtAmt(amountPaid)} HTG</span></div>
      ` : `
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Montan/peman:</span><span>${fmtAmt(plan.amount)} HTG</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Peman fè:</span><span>${totalPaid}/${plan.maxMembers}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#555">Kontribye:</span><span style="font-weight:700;color:#16a34a">${fmtAmt(amountPaid)} HTG</span></div>
        <div style="border-top:2px solid #111;padding-top:4px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:Arial;font-weight:900;font-size:12px">PRYIM SOL</span>
          <span style="font-family:Arial;font-weight:900;font-size:13px;color:#C9A84C">${fmtAmt(payout)} HTG</span>
        </div>
      `}
    </div>
    <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
      <div style="font-weight:700;font-size:10px">Mèsi! / Merci!</div>
      <div style="color:#666;font-size:8px;margin-top:2px">PlusGroup — Tel: +50942449024</div>
    </div>
  </div>`
}

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────
function getPaymentDates(frequency, startDate, count) {
  const dates = []
  const start = new Date(startDate || Date.now())
  let cur = new Date(start)

  const advance = () => {
    switch (frequency) {
      case 'daily':           cur.setDate(cur.getDate() + 1); break
      case 'weekly_saturday': cur.setDate(cur.getDate() + ((6 - cur.getDay() + 7) % 7 || 7)); break
      case 'weekly_monday':   cur.setDate(cur.getDate() + ((1 - cur.getDay() + 7) % 7 || 7)); break
      case 'biweekly':        cur.setDate(cur.getDate() + 14); break
      case 'monthly':         cur.setMonth(cur.getMonth() + 1); break
      case 'weekdays':
        do { cur.setDate(cur.getDate() + 1) } while ([0,6].includes(cur.getDay()))
        break
      default: cur.setDate(cur.getDate() + 1)
    }
  }

  dates.push(cur.toISOString().split('T')[0])
  for (let i = 1; i < count; i++) {
    advance()
    dates.push(new Date(cur).toISOString().split('T')[0])
  }
  return dates
}

// ─────────────────────────────────────────────────────────────
// INPUT STYLE
// ─────────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
  border: `1.5px solid rgba(255,255,255,0.09)`, outline: 'none', fontFamily: 'inherit',
  color: D.text, background: D.input, transition: 'border-color 0.15s', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: 10, fontWeight: 700, color: D.label,
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em',
}

function PayBadge({ paid, small }) {
  const size = small ? { padding: '2px 7px', fontSize: 9 } : { padding: '4px 10px', fontSize: 11 }
  return (
    <span style={{
      ...size, borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
      background: paid ? D.greenBg : D.redBg,
      color: paid ? D.green : D.red,
      border: `1px solid ${paid ? D.green : D.red}25`,
    }}>
      {paid ? <CheckCircle size={small?9:11}/> : <Clock size={small?9:11}/>}
      {paid ? 'Peye' : 'Pa Peye'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────
function Modal({ onClose, title, children, width = 540 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @media(min-width:640px){ .m-sheet{ border-radius:20px!important; margin:20px!important; max-height:88vh!important; } }
        .m-sheet::-webkit-scrollbar{width:3px}
        .m-sheet::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        .m-sheet input::placeholder,.m-sheet textarea::placeholder{color:#2a3a54}
        .m-sheet select option{background:#0d1b2a;color:#e8eaf0}
      `}</style>
      <div className="m-sheet" style={{
        background: D.card, border: `1px solid ${D.border}`,
        borderRadius: '20px 20px 0 0', width: '100%', maxWidth: width,
        maxHeight: '95vh', overflowY: 'auto',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.7)',
        animation: 'sheetUp 0.26s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 2px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)' }}/>
        </div>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 20px 14px', borderBottom:`1px solid ${D.border}`,
          position:'sticky', top:0, background:D.card, zIndex:1,
        }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:'#fff', margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:8, border:'none',
            background:'rgba(255,255,255,0.06)', color:D.muted, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}><X size={16}/></button>
        </div>
        <div style={{ padding:'18px 20px 28px' }}>{children}</div>
      </div>
    </div>
  )
}

const Sec = ({ icon, title, children }) => (
  <div style={{ background:'rgba(201,168,76,0.03)', border:`1px solid rgba(201,168,76,0.10)`, borderRadius:12, padding:'13px 14px', marginBottom:12 }}>
    <p style={{ fontSize:10, fontWeight:800, color:D.gold, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 11px', display:'flex', alignItems:'center', gap:6 }}>
      <span>{icon}</span>{title}
    </p>
    {children}
  </div>
)

// ─────────────────────────────────────────────────────────────
// MODAL: KREYE NOUVO PLAN SOL
// ─────────────────────────────────────────────────────────────
function ModalCreatePlan({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', amount: '', fee: '', frequency: 'daily', maxMembers: '' })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const totalPool = form.amount && form.maxMembers ? Number(form.amount) * Number(form.maxMembers) : 0
  const payout = totalPool - Number(form.fee || 0)

  return (
    <Modal onClose={onClose} title="✚ Kreye Plan Sabotay" width={520}>
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        <Sec icon="📋" title="Enfòmasyon Plan">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Non Plan *</label>
              <input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ex: Sol 500 Samdi" />
            </div>
            <div>
              <label style={lbl}>Montan pou Chak Moun (HTG) *</label>
              <input type="number" style={{...inp, color:D.gold, fontWeight:800, fontSize:16, textAlign:'center'}}
                value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="500" />
            </div>
            <div>
              <label style={lbl}>Frè (HTG)</label>
              <input type="number" style={{...inp, color:D.red}}
                value={form.fee} onChange={e=>set('fee',e.target.value)} placeholder="50" />
            </div>
            <div>
              <label style={lbl}>Kantite Moun Max *</label>
              <input type="number" style={{...inp, color:D.blue, fontWeight:700}}
                value={form.maxMembers} onChange={e=>set('maxMembers',e.target.value)} placeholder="20" />
            </div>
          </div>
        </Sec>
        <Sec icon="🗓" title="Frekans Peman">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
            {Object.entries(FREQ_LABELS).map(([val, labels]) => (
              <button key={val} onClick={()=>set('frequency',val)} style={{
                padding:'9px 6px', borderRadius:9, cursor:'pointer', fontSize:11, fontWeight:600,
                border:`1.5px solid ${form.frequency===val ? D.gold : D.borderSub}`,
                background: form.frequency===val ? D.goldDim : 'transparent',
                color: form.frequency===val ? D.gold : D.muted, transition:'all 0.15s',
              }}>{labels.ht}</button>
            ))}
          </div>
        </Sec>
        {totalPool > 0 && (
          <div style={{ background:D.greenBg, border:`1px solid ${D.green}30`, borderRadius:12, padding:'12px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:D.muted, textTransform:'uppercase', marginBottom:3 }}>Total Pool</div>
                <div style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color:D.gold }}>{fmt(totalPool)} HTG</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:D.muted, textTransform:'uppercase', marginBottom:3 }}>Frè</div>
                <div style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color:D.red }}>-{fmt(form.fee||0)} HTG</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:D.muted, textTransform:'uppercase', marginBottom:3 }}>Moun ap Touche</div>
                <div style={{ fontFamily:'monospace', fontWeight:900, fontSize:18, color:D.green }}>{fmt(payout)} HTG</div>
              </div>
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:10, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700, fontSize:14 }}>Anile</button>
          <button onClick={()=>{
            if(!form.name||!form.amount||!form.maxMembers) return toast.error('Non, montan, ak kantite moun obligatwa.')
            onSave({...form, amount:Number(form.amount), fee:Number(form.fee||0), maxMembers:Number(form.maxMembers)})
          }} style={{
            flex:2, padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
            background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            boxShadow:'0 4px 16px rgba(201,168,76,0.28)',
          }}><Plus size={15}/> Kreye Plan</button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: ENSKRI KLIYAN NAN PLAN
// ─────────────────────────────────────────────────────────────
function ModalAddMember({ plan, onClose, onSave }) {
  const [form, setForm] = useState({ name:'', phone:'' })
  const nextPos = (plan.members?.length || 0) + 1
  const isFull  = nextPos > plan.maxMembers

  return (
    <Modal onClose={onClose} title={`👤 Enskri Kliyan — ${plan.name}`} width={440}>
      {isFull ? (
        <div style={{ textAlign:'center', padding:'24px 0' }}>
          <AlertCircle size={40} style={{ color:D.red, marginBottom:12 }}/>
          <p style={{ color:D.red, fontWeight:700, fontSize:15 }}>Plan sa a plen! ({plan.maxMembers}/{plan.maxMembers} moun)</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:D.goldDim, border:`1px solid ${D.border}`, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:D.muted }}>Pozisyon li ap okipe:</span>
            <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:20, color:D.gold }}>#{nextPos}</span>
          </div>
          <div>
            <label style={lbl}>Non Kliyan *</label>
            <input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Non ak Prenon" />
          </div>
          <div>
            <label style={lbl}>Telefòn *</label>
            <input style={inp} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+509 XXXX XXXX" />
          </div>
          <div style={{ background:D.goldDim, borderRadius:10, padding:'10px 14px', fontSize:12, color:D.muted }}>
            <span style={{ color:D.gold, fontWeight:700 }}>Enfòmasyon Sol:</span>
            <div style={{ marginTop:6, display:'flex', gap:16, flexWrap:'wrap' }}>
              <span>💰 {fmt(plan.amount)} HTG / {FREQ_LABELS[plan.frequency]?.ht}</span>
              <span>👥 {plan.members?.length||0}/{plan.maxMembers} moun</span>
              <span>🏆 Touche: {fmt((plan.amount * plan.maxMembers) - plan.fee)} HTG</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:10, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
            <button onClick={()=>{
              if(!form.name||!form.phone) return toast.error('Non ak telefòn obligatwa.')
              onSave({...form, position:nextPos})
            }} style={{
              flex:2, padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
              background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:14,
              display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            }}><Users size={15}/> Enskri Kliyan</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// KALANDRIYE PLAN
// ─────────────────────────────────────────────────────────────
function PlanCalendar({ plan }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const today = new Date().toISOString().split('T')[0]

  const memberDates = useMemo(() => {
    return (plan.members || []).map(m => ({
      ...m,
      dates: getPaymentDates(plan.frequency, plan.createdAt, plan.maxMembers),
    }))
  }, [plan])

  const now = new Date()
  now.setMonth(now.getMonth() + monthOffset)
  const year  = now.getFullYear()
  const month = now.getMonth()
  const monthStr = now.toLocaleDateString('fr-FR', { month:'long', year:'numeric' })

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function getDateInfo(dateStr) {
    const payors = memberDates.filter(m => m.dates.includes(dateStr))
    const winner = memberDates.find((m, i) => m.dates[i] === dateStr)
    return { payors, winner: winner || null }
  }

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <button onClick={()=>setMonthOffset(o=>o-1)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.border}`, background:'transparent', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronLeft size={14}/>
        </button>
        <span style={{ fontWeight:800, fontSize:13, color:D.text, textTransform:'capitalize' }}>{monthStr}</span>
        <button onClick={()=>setMonthOffset(o=>o+1)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${D.border}`, background:'transparent', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronRight size={14}/>
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {['Di','Lu','Ma','Me','Je','Ve','Sa'].map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:800, color:D.muted, padding:'4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} style={{ aspectRatio:'1', borderRadius:8 }}/>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = dateStr === today
          const { payors } = getDateInfo(dateStr)
          const hasActivity = payors.length > 0
          const isPast = dateStr < today
          const allPaid  = payors.length > 0 && payors.every(m => m.payments?.[dateStr])
          const somePaid = payors.some(m => m.payments?.[dateStr])

          let bg = 'transparent', borderColor = 'transparent', textColor = D.muted
          if (isToday) { bg = D.goldDim; borderColor = D.gold; textColor = D.gold }
          else if (hasActivity && allPaid)  { bg = D.greenBg;  borderColor = `${D.green}40`;  textColor = D.green  }
          else if (hasActivity && somePaid) { bg = D.orangeBg; borderColor = `${D.orange}40`; textColor = D.orange }
          else if (hasActivity && isPast)   { bg = D.redBg;    borderColor = `${D.red}40`;    textColor = D.red    }
          else if (hasActivity) { bg = 'rgba(59,130,246,0.08)'; borderColor = 'rgba(59,130,246,0.25)'; textColor = D.blue }

          return (
            <div key={day} style={{
              aspectRatio:'1', borderRadius:8, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              background:bg, border:`1px solid ${borderColor}`,
              cursor: hasActivity ? 'pointer' : 'default',
            }}>
              <span style={{ fontSize:11, fontWeight: isToday||hasActivity ? 800 : 400, color:textColor }}>{day}</span>
              {hasActivity && (
                <div style={{ display:'flex', gap:1, marginTop:1 }}>
                  {payors.slice(0,3).map(m => (
                    <div key={m.id} style={{ width:4, height:4, borderRadius:'50%', background: m.payments?.[dateStr] ? D.green : (isPast ? D.red : D.blue) }}/>
                  ))}
                  {payors.length > 3 && <span style={{ fontSize:7, color:D.muted }}>+{payors.length-3}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:12, fontSize:10, color:D.muted }}>
        <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:D.green,  marginRight:4 }}/>Tout Peye</span>
        <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:D.orange, marginRight:4 }}/>Pasyèl</span>
        <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:D.red,    marginRight:4 }}/>Pa Peye</span>
        <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:D.blue,   marginRight:4 }}/>Pwochen</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL KLIYAN
// ─────────────────────────────────────────────────────────────
function MemberVirtualAccount({ member, plan, onClose, printer }) {
  const { tenant } = useAuthStore()
  const dates    = useMemo(()=> getPaymentDates(plan.frequency, plan.createdAt, plan.maxMembers), [plan])
  const winDate  = dates[member.position - 1]
  const today    = new Date().toISOString().split('T')[0]

  const totalPaid  = dates.filter(d => member.payments?.[d]).length
  const totalDue   = dates.filter(d => d <= today).length
  const amountPaid = totalPaid * plan.amount
  const amountDue  = totalDue  * plan.amount
  const payout     = (plan.amount * plan.maxMembers) - plan.fee
  const progress   = plan.maxMembers > 0 ? (totalPaid / plan.maxMembers) * 100 : 0
  const isWinner   = winDate <= today && !member.payments?.[winDate]

  return (
    <Modal onClose={onClose} title={`💳 Kont — ${member.name}`} width={500}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {/* Header */}
        <div style={{ background:D.goldBtn, borderRadius:14, padding:'16px 18px', color:'#0a1222' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
            <div>
              <p style={{ fontSize:18, fontWeight:900, margin:'0 0 2px' }}>{member.name}</p>
              <p style={{ fontSize:11, opacity:0.65, margin:0 }}>{member.phone}</p>
              <p style={{ fontSize:10, opacity:0.6, margin:'3px 0 0' }}>Pozisyon #{member.position} • {plan.name}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:9, opacity:0.6, margin:'0 0 2px', textTransform:'uppercase', fontWeight:700 }}>Kontribisyon</p>
              <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:20, margin:'0 0 2px' }}>{fmt(amountPaid)} HTG</p>
              <p style={{ fontSize:9, opacity:0.5, margin:0 }}>{totalPaid}/{plan.maxMembers} peman</p>
            </div>
          </div>
        </div>

        {isWinner && (
          <div style={{ background:'rgba(39,174,96,0.15)', border:`1px solid ${D.green}50`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <Trophy size={22} style={{ color:D.green, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:D.green, margin:0 }}>🎉 Se Moun sa a ki Touche Jodi a!</p>
              <p style={{ fontSize:11, color:D.muted, margin:'2px 0 0' }}>Montan: {fmt(payout)} HTG</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10 }}>
          {[
            { label:'Deja Peye',    val:`${fmt(amountPaid)} HTG`,                              color:D.green },
            { label:'Rès pou Peye', val:`${fmt(Math.max(0,amountDue-amountPaid))} HTG`,        color:D.red   },
            { label:'Ap Touche',    val:`${fmt(payout)} HTG`,                                  color:D.gold  },
            { label:'Dat Touche',   val: winDate ? winDate.split('-').reverse().join('/') : '—', color:D.blue  },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontSize:9, color:D.muted, textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Pwogrè */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:10, color:D.muted, fontWeight:700 }}>PWOGRÈ</span>
            <span style={{ fontSize:10, color:D.gold, fontWeight:800 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height:8, borderRadius:8, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background:D.goldBtn, borderRadius:8, transition:'width 0.5s' }}/>
          </div>
        </div>

        {/* ✅ Bouton Enprime Kont */}
        <button
          onClick={() => printer.print(plan, member, [], tenant, 'kont')}
          disabled={printer.printing}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            padding:'10px', borderRadius:10, border:`1px solid ${D.border}`,
            background:'rgba(255,255,255,0.04)', color:D.muted, cursor:'pointer',
            fontWeight:700, fontSize:13, opacity: printer.printing ? 0.5 : 1,
          }}>
          <Printer size={14}/> Enprime Kont
        </button>

        {/* Istwa peman */}
        <div>
          <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', color:D.muted, margin:'0 0 8px', letterSpacing:'0.06em' }}>
            Istwa Peman ({totalPaid}/{dates.length})
          </p>
          <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
            {dates.slice(0, 30).map((d, i) => {
              const paid   = !!member.payments?.[d]
              const isPast = d <= today
              const isWin  = i === member.position - 1
              return (
                <div key={d} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 12px', borderRadius:9,
                  background: isWin ? D.goldDim : (paid ? D.greenBg : (isPast ? D.redBg : 'rgba(255,255,255,0.02)')),
                  border:`1px solid ${isWin ? D.border : (paid ? `${D.green}20` : (isPast ? `${D.red}20` : 'transparent'))}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, fontFamily:'monospace', color:D.muted }}>{d.split('-').reverse().join('/')}</span>
                    {isWin && <span style={{ fontSize:9, background:D.goldDim, color:D.gold, padding:'1px 6px', borderRadius:10, fontWeight:700 }}>🏆 Touche</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color: paid ? D.green : (isPast ? D.red : D.muted) }}>
                      {paid ? `+${fmt(plan.amount)}` : isPast ? `-${fmt(plan.amount)}` : `${fmt(plan.amount)}`} HTG
                    </span>
                    <PayBadge paid={paid} small />
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
// MODAL: MACHE PEYE KLIYAN
// ─────────────────────────────────────────────────────────────
function ModalMarkPayment({ member, plan, onClose, onSave, printer }) {
  const { tenant } = useAuthStore()
  const dates = useMemo(()=> getPaymentDates(plan.frequency, plan.createdAt, plan.maxMembers), [plan])
  const today = new Date().toISOString().split('T')[0]
  const unpaidDates = dates.filter(d => d <= today && !member.payments?.[d])

  const [selectedDates, setSelectedDates] = useState(
    unpaidDates.length === 1 ? [unpaidDates[0]] : []
  )
  const toggle = (d) => setSelectedDates(p => p.includes(d) ? p.filter(x=>x!==d) : [...p, d])

  const handleConfirm = async () => {
    if (!selectedDates.length) return toast.error('Chwazi omwen yon dat.')
    onSave(selectedDates)
    // ✅ Enprime resi apre konfirmasyon
    await printer.print(plan, member, selectedDates, tenant, 'peman')
  }

  return (
    <Modal onClose={onClose} title={`✅ Mache Peye — ${member.name}`} width={460}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:D.goldDim, borderRadius:10, padding:'10px 14px', fontSize:12, color:D.muted }}>
          <span style={{ color:D.gold, fontWeight:700 }}>Plan: </span>{plan.name} •
          <span style={{ color:D.gold, fontWeight:700 }}> Montan: </span>{fmt(plan.amount)} HTG / dat
        </div>
        {unpaidDates.length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:D.green }}>
            <CheckCircle size={36} style={{ marginBottom:8 }}/>
            <p style={{ fontWeight:700 }}>Kliyan sa a ajou nan tout peman l!</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize:11, color:D.muted, margin:0 }}>Chwazi dat ou vle mache kòm peye:</p>
            <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
              {unpaidDates.map(d => (
                <div key={d} onClick={()=>toggle(d)} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 13px', borderRadius:9, cursor:'pointer',
                  background: selectedDates.includes(d) ? D.greenBg : 'rgba(255,255,255,0.03)',
                  border:`1px solid ${selectedDates.includes(d) ? `${D.green}40` : D.borderSub}`,
                  transition:'all 0.15s',
                }}>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:D.text }}>{d.split('-').reverse().join('/')}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:D.gold }}>{fmt(plan.amount)} HTG</span>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${selectedDates.includes(d) ? D.green : D.borderSub}`, background: selectedDates.includes(d) ? D.green : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {selectedDates.includes(d) && <CheckCircle size={11} color="#fff"/>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:D.greenBg, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:D.green, fontWeight:700 }}>Total Chwazi:</span>
              <span style={{ fontFamily:'monospace', fontWeight:800, color:D.green }}>{fmt(selectedDates.length * plan.amount)} HTG</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:10, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
              <button onClick={handleConfirm} disabled={printer.printing}
                style={{
                  flex:2, padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
                  background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:14,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  opacity: printer.printing ? 0.6 : 1,
                }}>
                {printer.printing
                  ? <span style={{ width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#0a1222', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                  : <><CheckCircle size={15}/> <Printer size={13}/></>}
                {printer.printing ? 'Ap enprime...' : 'Konfime + Enprime'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL DETAY PLAN
// ─────────────────────────────────────────────────────────────
function PlanDetail({ plan, onBack, onAddMember, onPaymentSaved, printer }) {
  const [viewMember, setViewMember] = useState(null)
  const [payMember,  setPayMember]  = useState(null)
  const [tab,        setTab]        = useState('members')

  const today  = new Date().toISOString().split('T')[0]
  const dates  = useMemo(()=> getPaymentDates(plan.frequency, plan.createdAt, plan.maxMembers), [plan])

  const todayWinnerIdx = dates.findIndex(d => d === today)
  const todayWinner    = todayWinnerIdx >= 0 ? plan.members?.[todayWinnerIdx] : null

  const totalCollected = plan.members?.reduce((acc, m) =>
    acc + Object.keys(m.payments||{}).filter(d=>m.payments[d]).length * plan.amount, 0) || 0
  const totalExpected  = plan.members?.reduce((acc, m) =>
    acc + dates.filter(d => d <= today).length * plan.amount, 0) || 0
  const payout = (plan.amount * plan.maxMembers) - plan.fee

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${D.border}`, background:'transparent', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ArrowLeft size={16}/>
        </button>
        <div style={{ flex:1 }}>
          <h2 style={{ color:D.gold, margin:0, fontSize:18, fontWeight:900 }}>{plan.name}</h2>
          <p style={{ color:D.muted, margin:0, fontSize:12 }}>{FREQ_LABELS[plan.frequency]?.ht} • {fmt(plan.amount)} HTG / moun</p>
        </div>
        <button onClick={onAddMember} style={{
          padding:'9px 14px', borderRadius:10, border:'none', cursor:'pointer',
          background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:12,
          display:'flex', alignItems:'center', gap:6,
        }}><Plus size={13}/> Enskri</button>
      </div>

      {/* Alèt touche jodi a */}
      {todayWinner && (
        <div style={{ background:'linear-gradient(135deg,rgba(39,174,96,0.15),rgba(201,168,76,0.08))', border:`1px solid ${D.green}40`, borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:D.goldBtn, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Trophy size={20} color="#0a1222"/>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:D.green, margin:'0 0 2px' }}>🎉 {todayWinner.name} ap touche jodi a!</p>
            <p style={{ fontSize:11, color:D.muted, margin:0 }}>Montan: <span style={{ color:D.gold, fontWeight:700 }}>{fmt(payout)} HTG</span> • Pozisyon #{todayWinner.position}</p>
          </div>
          <button style={{ marginLeft:'auto', padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', background:D.greenBg, color:D.green, fontWeight:700, fontSize:11, flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
            <Bell size={13}/> Notifye
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
        {[
          { label:'Moun',      val:`${plan.members?.length||0}/${plan.maxMembers}`,              color:D.blue  },
          { label:'Kolekte',   val:`${fmt(totalCollected)} HTG`,                                  color:D.green },
          { label:'Rès Atann', val:`${fmt(Math.max(0,totalExpected-totalCollected))} HTG`,        color:D.red   },
          { label:'Pryim Sol', val:`${fmt(payout)} HTG`,                                          color:D.gold  },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:10, padding:'11px 13px', textAlign:'center' }}>
            <div style={{ fontSize:9, color:D.muted, textTransform:'uppercase', fontWeight:700, marginBottom:3 }}>{label}</div>
            <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:13, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['members','👥 Manm'],['calendar','📅 Kalandriye']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
            border:`1px solid ${tab===t ? D.gold : D.borderSub}`,
            background: tab===t ? D.goldDim : 'transparent',
            color: tab===t ? D.gold : D.muted,
          }}>{l}</button>
        ))}
      </div>

      {tab === 'members' && (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {!plan.members?.length ? (
            <div style={{ textAlign:'center', padding:40, color:D.muted }}>
              <Users size={32} style={{ opacity:0.3, display:'block', margin:'0 auto 8px' }}/>
              <p style={{ margin:0 }}>Pa gen manm. Enskri premye kliyan ou!</p>
            </div>
          ) : plan.members.map(m => {
            const due  = dates.filter(d => d <= today).length
            const paid = Object.keys(m.payments||{}).filter(d=>m.payments[d]).length
            const isWin = dates[m.position-1] === today
            return (
              <div key={m.id} style={{
                background: isWin ? 'linear-gradient(135deg,rgba(39,174,96,0.10),rgba(201,168,76,0.06))' : D.card,
                border:`1px solid ${isWin ? `${D.green}40` : D.border}`,
                borderRadius:12, padding:'11px 14px',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:D.goldDim, border:`1px solid ${D.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:13, color:D.gold }}>#{m.position}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:D.text }}>{m.name}</span>
                      {isWin && <span style={{ fontSize:9, background:D.greenBg, color:D.green, padding:'1px 7px', borderRadius:10, fontWeight:700, border:`1px solid ${D.green}30` }}>🏆 Touche Jodi</span>}
                    </div>
                    <div style={{ fontSize:11, color:D.muted, marginTop:1 }}>{m.phone}</div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:70 }}>
                    <div style={{ fontFamily:'monospace', fontSize:11, color: paid>=due ? D.green : (due>0?D.orange:D.muted), fontWeight:700 }}>
                      {paid}/{due} peye
                    </div>
                    <div style={{ fontSize:10, color:D.muted }}>{fmt(paid*plan.amount)} HTG</div>
                  </div>
                  <div style={{ display:'flex', gap:5 }}>
                    <button onClick={()=>setPayMember(m)} title="Mache Peye"
                      style={{ width:28, height:28, borderRadius:7, border:'none', background:D.greenBg, color:D.green, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <CheckCircle size={13}/>
                    </button>
                    <button onClick={()=>setViewMember(m)} title="Kont Vityèl"
                      style={{ width:28, height:28, borderRadius:7, border:'none', background:D.goldDim, color:D.gold, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Eye size={13}/>
                    </button>
                  </div>
                </div>
                {due > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ height:4, borderRadius:4, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100,(paid/due)*100)}%`, background: paid>=due ? D.green : D.gold, borderRadius:4 }}/>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'calendar' && <PlanCalendar plan={plan}/>}

      {viewMember && (
        <MemberVirtualAccount member={viewMember} plan={plan} onClose={()=>setViewMember(null)} printer={printer}/>
      )}
      {payMember && (
        <ModalMarkPayment
          member={payMember} plan={plan}
          onClose={()=>setPayMember(null)}
          printer={printer}
          onSave={(selectedDates)=>{
            onPaymentSaved(plan.id, payMember.id, selectedDates)
            setPayMember(null)
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function SabotayPage() {
  const { tenant }  = useAuthStore()
  const printer     = usePrinterState()

  const [plans,        setPlans]        = useState(MOCK_PLANS)
  const [activePlan,   setActivePlan]   = useState(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [addMemberFor, setAddMemberFor] = useState(null)
  const [search,       setSearch]       = useState('')

  const today = new Date().toISOString().split('T')[0]

  const totalPlans     = plans.length
  const totalMembers   = plans.reduce((a,p)=>(a+(p.members?.length||0)),0)
  const totalCollected = plans.reduce((acc,p)=> acc + (p.members||[]).reduce((a,m)=>
    a + Object.keys(m.payments||{}).filter(d=>m.payments[d]).length * p.amount, 0), 0)
  const todayWinners   = plans.flatMap(p => {
    const dates = getPaymentDates(p.frequency, p.createdAt, p.maxMembers)
    const idx   = dates.findIndex(d => d === today)
    return idx >= 0 && p.members?.[idx] ? [{ plan:p, member:p.members[idx] }] : []
  })

  const filteredPlans = plans.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreatePlan = (data) => {
    const newPlan = { ...data, id: _nextPlanId++, members:[], createdAt: today, active:true }
    setPlans(p => [...p, newPlan])
    toast.success(`Plan "${data.name}" kreye!`)
    setShowCreate(false)
  }

  const handleAddMember = (planId, memberData) => {
    setPlans(p => p.map(plan =>
      plan.id !== planId ? plan : {
        ...plan,
        members: [...(plan.members||[]), { ...memberData, id: _nextMemberId++, joinedAt: today, payments: {} }]
      }
    ))
    toast.success(`${memberData.name} enskri nan plan!`)
    setAddMemberFor(null)
    setActivePlan(prev => prev?.id === planId
      ? { ...prev, members: [...(prev.members||[]), { ...memberData, id:_nextMemberId-1, joinedAt:today, payments:{} }] }
      : prev
    )
  }

  const handlePaymentSaved = (planId, memberId, selectedDates) => {
    const updateMembers = (members) => members.map(m => {
      if (m.id !== memberId) return m
      const newPays = { ...m.payments }
      selectedDates.forEach(d => { newPays[d] = true })
      return { ...m, payments: newPays }
    })
    setPlans(p => p.map(plan =>
      plan.id !== planId ? plan : { ...plan, members: updateMembers(plan.members) }
    ))
    setActivePlan(prev => {
      if (!prev || prev.id !== planId) return prev
      return { ...prev, members: updateMembers(prev.members) }
    })
    toast.success(`${selectedDates.length} peman anrejistre!`)
  }

  // ── Vue detay plan
  if (activePlan) {
    const freshPlan = plans.find(p => p.id === activePlan.id) || activePlan
    return (
      <div style={{ padding:'0 0 60px', fontFamily:'DM Sans, sans-serif', maxWidth:860, margin:'0 auto' }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
          @media(min-width:640px){.m-sheet{border-radius:20px!important;margin:20px!important;max-height:88vh!important;}}
          .m-sheet::-webkit-scrollbar{width:3px} .m-sheet::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
          .m-sheet input::placeholder,.m-sheet textarea::placeholder{color:#2a3a54}
          .m-sheet select option{background:#0d1b2a;color:#e8eaf0}
        `}</style>

        {/* Bouton Printer nan detay */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
          <button
            onClick={printer.connected ? printer.disconnect : printer.connect}
            disabled={printer.connecting}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'7px 12px', borderRadius:9, border:'none', cursor:'pointer',
              background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
              color: printer.connected ? D.green : D.muted,
              fontWeight:700, fontSize:11,
            }}>
            {printer.connecting
              ? <span style={{ width:12, height:12, border:`2px solid ${D.muted}40`, borderTopColor:D.muted, borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
              : printer.connected ? <Bluetooth size={13}/> : <BluetoothOff size={13}/>}
            {printer.connected ? 'Printer OK' : 'Printer'}
          </button>
        </div>

        <PlanDetail
          plan={freshPlan}
          onBack={()=>setActivePlan(null)}
          onAddMember={()=>setAddMemberFor(freshPlan)}
          onPaymentSaved={handlePaymentSaved}
          printer={printer}
        />
        {addMemberFor && (
          <ModalAddMember
            plan={addMemberFor}
            onClose={()=>setAddMemberFor(null)}
            onSave={(data)=>handleAddMember(addMemberFor.id, data)}
          />
        )}
      </div>
    )
  }

  // ── Vue prensipal
  return (
    <div style={{ padding:'0 0 60px', fontFamily:'DM Sans, sans-serif', maxWidth:860, margin:'0 auto' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @media(min-width:640px){.m-sheet{border-radius:20px!important;margin:20px!important;max-height:88vh!important;}}
        .m-sheet::-webkit-scrollbar{width:3px} .m-sheet::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        .m-sheet input::placeholder,.m-sheet textarea::placeholder{color:#2a3a54}
        .m-sheet select option{background:#0d1b2a;color:#e8eaf0}
        .plan-card:hover{background:#112236!important;transform:translateY(-2px);}
        .plan-card{transition:all 0.18s;}
        @media(max-width:640px){
          .top-stats{grid-template-columns:1fr 1fr!important;}
          .page-head{flex-direction:column;align-items:flex-start!important;}
        }
      `}</style>

      {/* Header */}
      <div className="page-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:900, color:D.gold, margin:'0 0 3px', display:'flex', alignItems:'center', gap:8 }}>
            <Users size={20}/> Sabotay Sol
          </h1>
          <p style={{ fontSize:12, color:D.muted, margin:0 }}>Sistèm sol wotatif pou kliyan yo</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* ✅ Bouton Printer Bluetooth */}
          <button
            onClick={printer.connected ? printer.disconnect : printer.connect}
            disabled={printer.connecting}
            title={printer.connected ? 'Dekonekte printer' : 'Konekte printer Bluetooth'}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'9px 12px', borderRadius:10, border:'none', cursor:'pointer',
              background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
              color: printer.connected ? D.green : D.muted,
              fontWeight:700, fontSize:12, transition:'all 0.2s',
            }}>
            {printer.connecting
              ? <span style={{ width:13, height:13, border:`2px solid ${D.muted}40`, borderTopColor:D.muted, borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
              : printer.connected ? <Bluetooth size={14}/> : <BluetoothOff size={14}/>}
            {printer.connected ? 'Printer OK' : 'Printer'}
          </button>

          <button onClick={()=>setShowCreate(true)} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'10px 18px', borderRadius:12, border:'none', cursor:'pointer',
            background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:13,
            boxShadow:'0 4px 16px rgba(201,168,76,0.28)', whiteSpace:'nowrap',
          }}><Plus size={15}/> Nouvo Plan</button>
        </div>
      </div>

      {/* Alèt moun ki ap touche jodi a */}
      {todayWinners.length > 0 && (
        <div style={{ marginBottom:16, display:'flex', flexDirection:'column', gap:8 }}>
          {todayWinners.map(({ plan, member }) => (
            <div key={`${plan.id}-${member.id}`} style={{
              background:'linear-gradient(135deg,rgba(201,168,76,0.12),rgba(39,174,96,0.08))',
              border:`1px solid ${D.gold}40`, borderRadius:14, padding:'12px 16px',
              display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            }}>
              <Trophy size={20} style={{ color:D.gold, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:800, color:D.gold, margin:'0 0 1px' }}>
                  🎉 {member.name} — {plan.name}
                </p>
                <p style={{ fontSize:11, color:D.muted, margin:0 }}>
                  Touche: <span style={{ color:D.green, fontWeight:700 }}>{fmt((plan.amount*plan.maxMembers)-plan.fee)} HTG</span>
                </p>
              </div>
              <button style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${D.gold}40`, background:D.goldDim, color:D.gold, fontWeight:700, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                <Bell size={12}/> Notifye
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="top-stats" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:11, marginBottom:20 }}>
        {[
          { label:'Total Plan',    val:totalPlans,              icon:<Settings size={17}/>,  color:D.gold   },
          { label:'Total Manm',    val:totalMembers,            icon:<Users size={17}/>,     color:D.blue   },
          { label:'Total Kolekte', val:`${fmt(totalCollected)} HTG`, icon:<Wallet size={17}/>, color:D.green },
          { label:'Touche Jodi',   val:todayWinners.length,     icon:<Trophy size={17}/>,    color:D.orange },
        ].map(({ label, val, icon, color }) => (
          <div key={label} style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:14, padding:'13px 15px', display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ width:40, height:40, borderRadius:11, flexShrink:0, background:`linear-gradient(135deg,${color},${color}CC)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff' }}>{icon}</span>
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', color:D.muted, letterSpacing:'0.06em', marginBottom:2 }}>{label}</div>
              <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:D.text }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Rechèch */}
      <div style={{ position:'relative', maxWidth:380, marginBottom:16 }}>
        <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:D.muted, pointerEvents:'none' }}/>
        <input style={{ ...inp, paddingLeft:34 }} placeholder="Chèche plan..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Lis plan */}
      {filteredPlans.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, background:D.card, borderRadius:16, border:`1px dashed ${D.border}` }}>
          <Users size={38} style={{ color:D.muted, opacity:0.3, display:'block', margin:'0 auto 10px' }}/>
          <p style={{ color:D.muted, margin:0, fontSize:13 }}>Pa gen plan. Kreye premye plan ou!</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filteredPlans.map(plan => {
            const dates = getPaymentDates(plan.frequency, plan.createdAt, plan.maxMembers)
            const collected = (plan.members||[]).reduce((acc,m)=>
              acc + Object.keys(m.payments||{}).filter(d=>m.payments[d]).length * plan.amount, 0)
            const expected  = (plan.members||[]).reduce((acc,m)=>
              acc + dates.filter(d=>d<=today).length * plan.amount, 0)
            const pct       = expected > 0 ? Math.min(100,(collected/expected)*100) : 0
            const payout    = (plan.amount * plan.maxMembers) - plan.fee
            const isWinToday = dates.findIndex(d=>d===today) >= 0 && plan.members?.[dates.findIndex(d=>d===today)]

            return (
              <div key={plan.id} className="plan-card"
                onClick={()=>setActivePlan(plan)}
                style={{ background:D.card, border:`1px solid ${isWinToday?`${D.gold}60`:D.border}`, borderRadius:14, padding:'14px 16px', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:D.goldBtn, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:18 }}>🏦</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:800, color:D.text }}>{plan.name}</span>
                      {isWinToday && <span style={{ fontSize:9, background:D.greenBg, color:D.green, padding:'1px 7px', borderRadius:10, fontWeight:700, border:`1px solid ${D.green}30` }}>🏆 Touche Jodi</span>}
                    </div>
                    <div style={{ display:'flex', gap:10, fontSize:11, color:D.muted, flexWrap:'wrap' }}>
                      <span style={{ color:D.gold, fontWeight:700 }}>{fmt(plan.amount)} HTG</span>
                      <span>•</span>
                      <span>{FREQ_LABELS[plan.frequency]?.ht}</span>
                      <span>•</span>
                      <span style={{ color: plan.members?.length>=plan.maxMembers ? D.red : D.muted }}>
                        {plan.members?.length||0}/{plan.maxMembers} manm
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:9, color:D.muted, textTransform:'uppercase', marginBottom:2 }}>Pryim Sol</div>
                    <div style={{ fontFamily:'monospace', fontWeight:900, fontSize:15, color:D.green }}>{fmt(payout)} HTG</div>
                  </div>
                  <ChevronRight size={16} style={{ color:D.muted, flexShrink:0 }}/>
                </div>
                {expected > 0 && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:9, color:D.muted }}>Kolekte: {fmt(collected)} HTG</span>
                      <span style={{ fontSize:9, color:D.gold, fontWeight:700 }}>{Math.round(pct)}%</span>
                    </div>
                    <div style={{ height:5, borderRadius:4, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:D.goldBtn, borderRadius:4, transition:'width 0.5s' }}/>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <ModalCreatePlan onClose={()=>setShowCreate(false)} onSave={handleCreatePlan}/>
      )}
    </div>
  )
}
