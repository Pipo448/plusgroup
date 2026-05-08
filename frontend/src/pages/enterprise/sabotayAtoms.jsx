// ─────────────────────────────────────────────────────────────
// sabotayAtoms.jsx — Helpers, usePrinterState, UI Atoms, Modal, Sec
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'
import { X, CheckCircle, Clock, Bluetooth, BluetoothOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printSabotayReceipt } from '../../services/printerService'
import {
  D, MEMBER_STATUS, PLAN_STATUS,
  buildReceiptHTML, printReceiptBrowser,
} from './sabotayUtils'

// ─────────────────────────────────────────────────────────────
// HELPERS — Konvèsyon 12h (AM/PM) ↔ 24h ("HH:MM")
// ─────────────────────────────────────────────────────────────
export function parse24To12(value) {
  const [h24, m] = (value || '00:00').split(':').map(Number)
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return { h12, m: m || 0, period }
}

export function format12To24(h12, m, period) {
  let h24 = Number(h12)
  if (period === 'AM' && h24 === 12) h24 = 0
  else if (period === 'PM' && h24 !== 12) h24 = h24 + 12
  return `${String(h24).padStart(2, '0')}:${String(Number(m)).padStart(2, '0')}`
}

export function format24ToDisplay12(value) {
  const { h12, m, period } = parse24To12(value)
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// ─────────────────────────────────────────────────────────────
// TIME PICKER 12h
// ─────────────────────────────────────────────────────────────
export function TimePicker12h({ value, onChange, color }) {
  const { h12, m, period } = parse24To12(value)
  const update = (newH12, newM, newPeriod) => onChange(format12To24(newH12, newM, newPeriod))
  const selStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.09)',
    borderRadius: 8, color, padding: '8px 4px', fontWeight: 700, fontSize: 13,
    textAlign: 'center', appearance: 'none', cursor: 'pointer', flex: 1, minWidth: 0,
  }
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select value={h12} onChange={e => update(Number(e.target.value), m, period)} style={selStyle}>
        {[12,1,2,3,4,5,6,7,8,9,10,11].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <span style={{ color: D.muted, fontWeight: 800, flexShrink: 0 }}>:</span>
      <select value={m} onChange={e => update(h12, Number(e.target.value), period)} style={selStyle}>
        {Array.from({ length: 60 }, (_, i) => i).map(n => (
          <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
        ))}
      </select>
      <select value={period} onChange={e => update(h12, m, e.target.value)}
        style={{ ...selStyle, color: period === 'AM' ? D.blue : D.gold }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PRINTER HOOK
// ─────────────────────────────────────────────────────────────
export function usePrinterState() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const n = await connectPrinter()
      setConnected(true)
      toast.success(`✅ Printer konekte: ${n}`)
    } catch (e) {
      if (e.name !== 'NotFoundError') toast.error('Pa ka konekte printer.')
    } finally { setConnecting(false) }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  const print = useCallback(async (plan, member, paidDates, tenant, type, allSlots = []) => {
    if (isPrinterConnected()) {
      setPrinting(true)
      try {
        await printSabotayReceipt(plan, member, paidDates, tenant, type, allSlots)
        toast.success('Resi enprime!')
        return true
      } catch {
        setConnected(false); toast.error('Erè printer.'); return false
      } finally { setPrinting(false) }
    }
    printReceiptBrowser(buildReceiptHTML(plan, member, paidDates, tenant, type, allSlots))
    return true
  }, [])

  return { connected, connecting, printing, connect, disconnect, print }
}

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
export function PayBadge({ paid, small }) {
  const sz = small ? { padding: '2px 7px', fontSize: 9 } : { padding: '4px 10px', fontSize: 11 }
  return (
    <span style={{ ...sz, borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
      background: paid ? D.greenBg : D.redBg, color: paid ? D.green : D.red,
      border: `1px solid ${paid ? D.green : D.red}25` }}>
      {paid ? <CheckCircle size={small ? 9 : 11} /> : <Clock size={small ? 9 : 11} />}
      {paid ? 'Peye' : 'Pa Peye'}
    </span>
  )
}

export function MemberStatusBadge({ status, small }) {
  const cfg = MEMBER_STATUS[status] || MEMBER_STATUS.active
  const sz  = small ? { padding: '2px 6px', fontSize: 9 } : { padding: '3px 9px', fontSize: 11 }
  return (
    <span style={{ ...sz, borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

export function PlanStatusBadge({ status }) {
  const cfg = PLAN_STATUS[status] || PLAN_STATUS.open
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 10,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  )
}

export function ReceiptSizeBtn() {
  const [size, setSize] = useState(() => localStorage.getItem('receipt_size') || '80mm')
  const toggle = () => {
    const next = size === '80mm' ? '57mm' : '80mm'
    setSize(next); localStorage.setItem('receipt_size', next)
    toast(`🖨️ Resi: ${next}`, { icon: '📄' })
  }
  return (
    <button onClick={toggle} title={`Fòma resi: ${size}`} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '9px 11px', borderRadius: 10,
      border: `1px solid ${size === '57mm' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.09)'}`,
      background: size === '57mm' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)',
      color: size === '57mm' ? '#3B82F6' : '#6b7a99',
      cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all 0.2s', flexShrink: 0,
    }}>
      🖨️ {size}
    </button>
  )
}

export function PrinterBtn({ printer }) {
  return (
    <button onClick={printer.connected ? printer.disconnect : printer.connect}
      disabled={printer.connecting}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 10,
        border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 0.2s', flexShrink: 0,
        background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
        color: printer.connected ? D.green : D.muted }}>
      {printer.connecting
        ? <span style={{ width: 13, height: 13, border: `2px solid ${D.muted}40`, borderTopColor: D.muted, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
        : printer.connected ? <Bluetooth size={14} /> : <BluetoothOff size={14} />}
      <span className="printer-label">{printer.connected ? 'Printer OK' : 'Printer'}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────
export function Modal({ onClose, title, children, width = 540 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="m-sheet" style={{ background: D.card, border: `1px solid ${D.border}`,
        borderRadius: '20px 20px 0 0', width: '100%', maxWidth: width, maxHeight: '95vh',
        overflowY: 'auto', boxShadow: '0 -8px 48px rgba(0,0,0,0.7)',
        animation: 'sheetUp 0.26s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 14px', borderBottom: `1px solid ${D.border}`,
          position: 'sticky', top: 0, background: D.card, zIndex: 1 }}>
          <h2 className="modal-title" style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ padding: '18px 20px 28px' }}>{children}</div>
      </div>
    </div>
  )
}

export const Sec = ({ icon, title, children, col }) => (
  <div style={{ background: `rgba(${col || '201,168,76'},0.03)`, border: `1px solid rgba(${col || '201,168,76'},0.12)`,
    borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
    <p style={{ fontSize: 10, fontWeight: 800, color: col ? `rgb(${col})` : D.gold, textTransform: 'uppercase',
      letterSpacing: '0.07em', margin: '0 0 11px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{icon}</span>{title}
    </p>
    {children}
  </div>
)
