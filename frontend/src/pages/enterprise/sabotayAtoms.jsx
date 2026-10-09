// ─────────────────────────────────────────────────────────────
// sabotayAtoms.jsx — Helpers, usePrinterState, UI Atoms, Modal, Sec
// ✅ Design "Plus Fit" (menm baz ak Kanè Epay / Prè)
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react'
import {
  CheckCircle, Clock, Bluetooth, BluetoothOff, Printer as PrinterIcon,
  Image as ImageIcon, FileDown, Receipt, Share2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, printSabotayReceipt, onPrinterStatus,
  isNativeApp, ensureNativePrinter, getNativePrinter, forgetNativePrinter,
} from '../../services/printerService'
import { useNavigate } from 'react-router-dom'
import {
  D, MEMBER_STATUS, PLAN_STATUS,
  buildReceiptHTML, printReceiptBrowser, printReceiptDirect,
  buildSolShareHTML, shareSolReceipt, SOL_RECEIPT_WIDTH,
} from './sabotayUtils'
import { Modal as KeModal } from './kane-epay/KaneEpayComponents'

const hexA = (hex, a) => {
  const n = parseInt(String(hex).replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

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
export function TimePicker12h({ value, onChange, color = D.text }) {
  const { h12, m, period } = parse24To12(value)
  const update = (newH12, newM, newPeriod) => onChange(format12To24(newH12, newM, newPeriod))
  const selStyle = {
    background: D.soft, border: `1.5px solid ${D.border}`, borderRadius: 12, color,
    padding: '11px 4px', fontWeight: 800, fontSize: 15, fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif",
    textAlign: 'center', textAlignLast: 'center', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', flex: 1, minWidth: 0, outline: 'none',
  }
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <select value={h12} onChange={e => update(Number(e.target.value), m, period)} style={selStyle}>
        {[12,1,2,3,4,5,6,7,8,9,10,11].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <span style={{ color: D.muted, fontWeight: 800, flexShrink: 0 }}>:</span>
      <select value={m} onChange={e => update(h12, Number(e.target.value), period)} style={selStyle}>
        {Array.from({ length: 60 }, (_, i) => i).map(n => <option key={n} value={n}>{String(n).padStart(2, '0')}</option>)}
      </select>
      <select value={period} onChange={e => update(h12, m, e.target.value)}
        style={{ ...selStyle, background: D.night, color: period === 'AM' ? '#6ec8ff' : '#FFC83D', border: 'none' }}>
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
  const navigate = useNavigate()
  const native   = isNativeApp()
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  // ✅ Swiv eta enprimant lan (rekoneksyon otomatik, dekoneksyon, lòt paj ki konekte l)
  useEffect(() => {
    setConnected(isPrinterConnected())
    if (native) ensureNativePrinter().then(r => setConnected(!!r)).catch(() => {})
    return onPrinterStatus(setConnected)
  }, [native])

  const goSetup = useCallback(() => {
    toast('Konekte enprimant lan nan « Tès Enprimant » an premye.', { icon: '🖨️' })
    navigate('/app/printer-test')
  }, [navigate])

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      if (native) {
        // APK: rekonekte dènye enprimant lan; si pa genyen, ale nan paj konfigirasyon an
        const info = await ensureNativePrinter()
        if (info) { setConnected(true); toast.success('✅ Printer prè') }
        else goSetup()
        return
      }
      const n = await connectPrinter()
      setConnected(true)
      toast.success(`✅ Printer konekte: ${n}`)
    } catch (e) {
      if (e.name !== 'NotFoundError') toast.error('Pa ka konekte printer.')
    } finally { setConnecting(false) }
  }, [connecting, connected, native, goSetup])

  const disconnect = useCallback(async () => {
    if (native) {
      try { const P = await getNativePrinter(); await P?.disconnectBluetoothPrinter?.() } catch { /* */ }
      forgetNativePrinter()
      setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
      return
    }
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
  }, [native])

  const print = useCallback(async (plan, member, paidDates, tenant, type, allSlots = [], paidAt = null) => {
    // ✅ APK ANDROID — toujou pase nan plugin natif la (window.print pa mache nan APK)
    if (native) {
      setPrinting(true)
      try {
        await printSabotayReceipt(plan, member, paidDates, tenant, type, allSlots, paidAt)
        setConnected(true)
        toast.success('Resi enprime!')
        return true
      } catch (e) {
        setConnected(false)
        if (e?.message === 'NATIVE_PRINTER_NOT_READY') goSetup()
        else toast.error('Erè printer: ' + (e?.message || e))
        return false
      } finally { setPrinting(false) }
    }
    if (isPrinterConnected()) {
      setPrinting(true)
      try {
        await printSabotayReceipt(plan, member, paidDates, tenant, type, allSlots, paidAt)
        toast.success('Resi enprime!')
        return true
      } catch {
        setConnected(false); toast.error('Erè printer.'); return false
      } finally { setPrinting(false) }
    }
    // ✅ Navigatè san Bluetooth: enprime DIREK (pa gen fenèt previzyon)
    let size = '80mm'
    try { size = localStorage.getItem('receipt_size') || tenant?.receiptSize || '80mm' } catch { /* */ }
    await printReceiptDirect(buildReceiptHTML(plan, member, paidDates, tenant, type, allSlots, paidAt), size)
    return true
  }, [native, goSetup])

  return { connected, connecting, printing, connect, disconnect, print }
}

// ─────────────────────────────────────────────────────────────
// UI ATOMS (chips)
// ─────────────────────────────────────────────────────────────
const chip = (color, small) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
  padding: small ? '3px 8px' : '5px 11px', borderRadius: 999,
  fontSize: small ? 10.5 : 11.5, fontWeight: 800, letterSpacing: '.03em',
  color, background: hexA(color, 0.1),
})

export function PayBadge({ paid, small }) {
  const c = paid ? D.green : D.red
  return (
    <span style={chip(c, small)}>
      {paid ? <CheckCircle size={small ? 10 : 12} /> : <Clock size={small ? 10 : 12} />}
      {paid ? 'Peye' : 'Pa peye'}
    </span>
  )
}

const STATUS_COLORS = { active: D.green, blocked: D.red, stopped: D.orange, finished: D.gold, late: D.orange }
export function MemberStatusBadge({ status, small }) {
  const cfg = MEMBER_STATUS[status] || MEMBER_STATUS.active
  return <span style={chip(STATUS_COLORS[status] || D.green, small)}>{cfg.icon} {cfg.label}</span>
}

const PLAN_COLORS = { open: D.green, closed: D.red, finished: D.gold }
export function PlanStatusBadge({ status, dark }) {
  const cfg = PLAN_STATUS[status] || PLAN_STATUS.open
  const c = PLAN_COLORS[status] || D.green
  return (
    <span style={dark
      ? { ...chip(c), color: status === 'open' ? '#4ade80' : status === 'closed' ? '#ff7b7b' : '#FFC83D', background: 'rgba(255,255,255,0.08)' }
      : chip(c)}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />{cfg.label}
    </span>
  )
}

// Bouton "glass" pou hero nwa a
export function ReceiptSizeBtn() {
  const [size, setSize] = useState(() => { try { return localStorage.getItem('receipt_size') || '80mm' } catch { return '80mm' } })
  const toggle = () => {
    const next = size === '80mm' ? '57mm' : '80mm'
    setSize(next)
    try { localStorage.setItem('receipt_size', next) } catch {}
    toast(`Resi: ${next}`, { icon: '📄' })
  }
  return (
    <button onClick={toggle} title={`Fòma resi: ${size}`} className="ke-btn ke-btn-glass"
      style={{ width: 'auto', padding: '0 14px', fontFamily: 'var(--display)', fontSize: 17, fontWeight: 800, letterSpacing: '.04em' }}>
      {size.replace('mm', '')}<span style={{ fontSize: 12, opacity: .6 }}>mm</span>
    </button>
  )
}

export function PrinterBtn({ printer }) {
  return (
    <button onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}
      className={`ke-btn ke-btn-glass${printer.connected ? ' on' : ''}`} title={printer.connected ? 'Dekonekte printer' : 'Konekte printer Bluetooth'}>
      {printer.connecting
        ? <span className="ke-spinner" style={{ width: 15, height: 15 }} />
        : printer.connected ? <Bluetooth size={17} /> : <BluetoothOff size={17} />}
      <span className="lbl">{printer.connected ? 'Printer OK' : 'Printer'}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL — itilize Modal Kanè Epay la (bottom-sheet sou mobil)
// ─────────────────────────────────────────────────────────────
export function Modal({ onClose, title, children, width = 540, subtitle, icon, footer, dismissible }) {
  return (
    <KeModal onClose={onClose} title={title} subtitle={subtitle} icon={icon} width={width} footer={footer} dismissible={dismissible}>
      {children}
    </KeModal>
  )
}

// Seksyon fòm — `col` = "r,g,b" (koulè aksan)
export const Sec = ({ icon, title, children, col }) => {
  const accent = col ? `rgb(${col})` : D.gold
  return (
    <div style={{ border: `1px solid ${D.border}`, borderRadius: 20, padding: 16, marginBottom: 14, background: D.card }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: D.night, color: col ? accent : '#FFC83D', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</span>
        <p style={{ margin: 0, fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '.05em', textTransform: 'uppercase', color: D.text }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ✅ NOUVO: Resi pou pataje (Imaj WhatsApp / PDF) + aperçu
// ─────────────────────────────────────────────────────────────
function HtmlPreview({ html, width = SOL_RECEIPT_WIDTH }) {
  const wrapRef = useRef(null)
  const innerRef = useRef(null)
  const [box, setBox] = useState({ scale: 1, h: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || width
      const scale = Math.min(1, w / width)
      setBox({ scale, h: (innerRef.current?.scrollHeight || 0) * scale })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(wrapRef.current)
    document.fonts?.ready?.then(measure).catch(() => {})
    return () => ro?.disconnect()
  }, [html, width])
  return (
    <div ref={wrapRef} className="ke-rcpt-wrap" style={{ height: box.h || undefined }}>
      <div ref={innerRef} className="ke-rcpt-inner" style={{ width, transform: `scale(${box.scale})`, margin: box.scale < 1 ? 0 : '0 auto' }}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

export function ModalSolReceipt({ data, onClose, printer }) {
  const [busy, setBusy] = useState(false)
  const run = async (fmtOut) => {
    setBusy(fmtOut)
    try { const ok = await shareSolReceipt(data, fmtOut); if (ok) toast.success(fmtOut === 'png' ? 'Imaj resi a pare!' : 'PDF la pare!') }
    catch { toast.error('Erè pandan kreyasyon resi a.') }
    finally { setBusy(false) }
  }
  const footer = (
    <>
      <button className="ke-fbtn" style={{ flex: '0 0 52px', padding: 0 }} title="Enprime (termik)" disabled={printer?.printing}
        onClick={() => printer?.print(data.plan, data.member, data.paidDates || [], data.tenant, data.type || 'peman', data.allSlots || [], data.paidAt || null)}>
        {printer?.printing ? <span className="ke-spinner" style={{ width: 15, height: 15 }} /> : <PrinterIcon size={18} />}
      </button>
      <button className="ke-fbtn" onClick={() => run('pdf')} disabled={!!busy}>
        {busy === 'pdf' ? <span className="ke-spinner" style={{ width: 15, height: 15 }} /> : <FileDown size={18} />} PDF
      </button>
      <button className="ke-fbtn main dark" onClick={() => run('png')} disabled={!!busy}>
        {busy === 'png' ? <span className="ke-spinner" style={{ width: 15, height: 15 }} /> : <ImageIcon size={18} />} Pataje imaj
      </button>
    </>
  )
  return (
    <Modal onClose={onClose} dismissible width={520} footer={footer} icon={<Receipt size={20} />}
      title={data.type === 'kont' ? 'Kont manm' : 'Resi peman'} subtitle={`${data.plan?.name} · ${data.member?.name}`}>
      <HtmlPreview html={buildSolShareHTML(data)} />
      <p className="ke-rcpt-note"><Share2 size={14} /> Imaj la parèt dirèkteman nan WhatsApp. PDF la bon pou imèl oswa pou enprime.</p>
    </Modal>
  )
}

// Ti bouton switch (pou paramèt plan yo)
export function Switch({ on, onClick, color = D.night, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on}
      style={{ position: 'relative', width: 48, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: on ? color : 'rgba(20,21,26,0.12)', transition: 'background .25s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: on ? '#FFC83D' : '#fff',
        transition: 'left .28s cubic-bezier(.3,1.3,.5,1)', boxShadow: '0 2px 6px rgba(0,0,0,.25)' }} />
    </button>
  )
}