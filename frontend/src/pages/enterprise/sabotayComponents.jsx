// ─────────────────────────────────────────────────────────────
// sabotayComponents.jsx — UI Atoms, Modals, Tabs
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  X, ChevronRight, ChevronLeft, Eye, CheckCircle, Clock,
  Settings, RefreshCw, Trophy, AlertCircle, Search,
  Printer, Bluetooth, BluetoothOff, Key, Star, UserCheck,
  Loader, Shuffle, FileText, Edit3, AlertTriangle,
  Lock, Unlock, UserMinus, TrendingUp, Info,
  StopCircle, Plus, Users, ArrowLeft, Wallet,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printSabotayReceipt } from '../../services/printerService'
import {
  D, inp, lbl, fmt, FREQ_LABELS, MEMBER_STATUS, PLAN_STATUS, RELATIONSHIPS,
  getAllPaymentDates, getPayoutDate, getPayoutDateMap, computeMemberStatus,
  memberPayout, ownerPayout, getMemberScore, getMemberSlots, getPaymentTiming,
  hasOwnerSlot, totalActiveSlots, calcMemberDepoRezev, generateCredentials,
  buildReceiptHTML, printReceiptBrowser, freqFullLabel, apiFetch,
  API_URL, calcDepoRezev,
} from './sabotayUtils'

// ─────────────────────────────────────────────────────────────
// HELPERS — Konvèsyon ant 12h (AM/PM) ak 24h ("HH:MM")
// ─────────────────────────────────────────────────────────────
function parse24To12(value) {
  const [h24, m] = (value || '00:00').split(':').map(Number)
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return { h12, m: m || 0, period }
}

function format12To24(h12, m, period) {
  let h24 = Number(h12)
  if (period === 'AM' && h24 === 12) h24 = 0
  else if (period === 'PM' && h24 !== 12) h24 = h24 + 12
  return `${String(h24).padStart(2, '0')}:${String(Number(m)).padStart(2, '0')}`
}

function format24ToDisplay12(value) {
  const { h12, m, period } = parse24To12(value)
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// ─────────────────────────────────────────────────────────────
// TIME PICKER 12h — Òdè / Minit / AM/PM
// Stoke "HH:MM" 24h, men afiche 12h pou itilizatè a
// ─────────────────────────────────────────────────────────────
function TimePicker12h({ value, onChange, color }) {
  const { h12, m, period } = parse24To12(value)

  const update = (newH12, newM, newPeriod) => {
    onChange(format12To24(newH12, newM, newPeriod))
  }

  const selStyle = {
    ...inp,
    color,
    padding: '8px 4px',
    fontWeight: 700,
    fontSize: 13,
    textAlign: 'center',
    appearance: 'none',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select value={h12} onChange={e => update(Number(e.target.value), m, period)} style={selStyle}>
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <span style={{ color: D.muted, fontWeight: 800, flexShrink: 0 }}>:</span>
      <select value={m} onChange={e => update(h12, Number(e.target.value), period)} style={selStyle}>
        {Array.from({ length: 60 }, (_, i) => i).map(n => (
          <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
        ))}
      </select>
      <select value={period} onChange={e => update(h12, m, e.target.value)} style={{ ...selStyle, color: period === 'AM' ? D.blue : D.gold }}>
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

// ─────────────────────────────────────────────────────────────
// MODAL: KREYE / EDITE PLAN
// ─────────────────────────────────────────────────────────────
export function ModalCreatePlan({ onClose, onSave, loading, initialData = null }) {
  const isEdit = !!initialData
  const [form, setForm] = useState({
    name: '', amount: '', feePerMember: '', penalty: '', warningDelayDays: 3,
    frequency: 'daily', interval: 1, maxMembers: '', dueTime: '08:00',
    dueTimeEnd: '15:00', regleman: '', startDate: '',
    ...(initialData || {}),
    startDate: initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const amt = Number(form.amount) || 0
  const fee = Number(form.feePerMember) || 0
  const intervalN = Math.max(1, Number(form.interval) || 1)
  const previewMembers = Number(form.maxMembers) || 0
  const payoutM = amt * previewMembers - fee

  // ✅ Validasyon fenèt peman: kòmansman dwe pi piti pase fen
  const timeWindowValid = form.dueTime < form.dueTimeEnd
  const windowDisplay = timeWindowValid
    ? `${format24ToDisplay12(form.dueTime)} → ${format24ToDisplay12(form.dueTimeEnd)}`
    : '⚠️ Lè kòmansman dwe pi piti pase lè fen'

  return (
    <Modal onClose={onClose} title={isEdit ? '✏️ Modifye Plan' : '✚ Kreye Plan Sabotay'} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <Sec icon="📋" title="Enfòmasyon Plan">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Non Plan *</label>
              <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Sol 500 Samdi" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Montan / Moun (HTG) *</label>
              <input type="number" style={{ ...inp, color: D.gold, fontWeight: 800, fontSize: 16, textAlign: 'center' }}
                value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="500" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Dat Kòmanse Sol *</label>
              <input type="date" style={{ ...inp, color: D.teal, fontWeight: 700 }}
                value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
          </div>

          {/* ✅ NOUVO: Fenèt Peman ak fòma 12h AM/PM */}
          <div style={{ marginTop: 14, background: 'rgba(155,89,182,0.05)', border: `1px solid rgba(155,89,182,0.15)`, borderRadius: 12, padding: '13px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: D.purple, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 11px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={11} /> Fenèt Peman (Lè Manm Dwe Peye)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>🟢 Kòmansman *</label>
                <TimePicker12h value={form.dueTime} onChange={v => set('dueTime', v)} color={D.purple} />
              </div>
              <div>
                <label style={lbl}>🔴 Fen (Deadline) *</label>
                <TimePicker12h value={form.dueTimeEnd} onChange={v => set('dueTimeEnd', v)} color={D.red} />
              </div>
            </div>

            {/* Eksplikasyon vizyèl */}
            <div style={{ marginTop: 10, fontSize: 10, color: D.muted, lineHeight: 1.7, background: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: '9px 12px' }}>
              <div style={{ marginBottom: 5, fontWeight: 700, color: timeWindowValid ? D.teal : D.red }}>
                Fenèt aktyèl: <strong>{windowDisplay}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span><strong style={{ color: '#00d084' }}>⚡ Avan {format24ToDisplay12(form.dueTime)}</strong> → "Avan lè" (+3 pwen)</span>
                <span><strong style={{ color: D.green }}>✅ Nan fenèt la ({windowDisplay})</strong> → "Nan lè a" (+1 pwen)</span>
                <span><strong style={{ color: D.orange }}>⚠️ Apre {format24ToDisplay12(form.dueTimeEnd)}</strong> → "Apre lè" (-1 pwen)</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, background: 'rgba(59,130,246,0.08)', border: `1px solid rgba(59,130,246,0.2)`,
            borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11 }}>
            <Info size={14} style={{ color: D.blue, flexShrink: 0, marginTop: 1 }} />
            <div style={{ color: D.muted, lineHeight: 1.6 }}>
              <strong style={{ color: D.blue }}>Sol Ouvè:</strong> Moun ka antre toutan.
              Admin sèlman ka <strong style={{ color: D.text }}>fèmen plan la</strong> lè l vle.
              {previewMembers > 0 && <><br /><span style={{ color: D.gold }}>Previw ak {previewMembers} manm: Payout = {fmt(payoutM)} HTG</span></>}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ ...lbl, color: 'rgba(107,122,153,0.8)' }}>Previzyon (pa obligatwa) — Konbyen manm ou atann?</label>
            <input type="number" style={{ ...inp, color: D.muted, fontSize: 12 }}
              value={form.maxMembers} onChange={e => set('maxMembers', e.target.value)} placeholder="Ex: 20 (previw sèlman)" />
          </div>
        </Sec>

        <Sec icon="💰" title="Frè & Amand" col="243,156,18">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Frè pa Manm ki Touche (HTG)</label>
              <input type="number" style={{ ...inp, color: D.orange }}
                value={form.feePerMember} onChange={e => set('feePerMember', e.target.value)} placeholder="0" />
              {fee > 0 && fee === amt && <p style={{ fontSize: 10, color: D.gold, margin: '4px 0 0', fontWeight: 700 }}>= Montan → Plas Pwopriyete Sol!</p>}
            </div>
            <div>
              <label style={lbl}>Amand pou Reta (HTG)</label>
              <input type="number" style={{ ...inp, color: D.red }}
                value={form.penalty} onChange={e => set('penalty', e.target.value)} placeholder="0" />
            </div>
          </div>
        </Sec>

        <Sec icon="⚠️" title="Delay Avètisman & Blokaj" col="231,76,60">
          <div style={{ marginBottom: 10, fontSize: 11, color: D.muted, lineHeight: 1.6 }}>
            Si yon manm pa peye apre <strong style={{ color: D.text }}>X jou</strong> reta,
            sistèm ap <strong style={{ color: D.red }}>bloke kont li otomatikman</strong>.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Jou Reta Anvan Avètisman</label>
              <input type="number" min="0" style={{ ...inp, color: D.orange }}
                value={form.warningDelayDays}
                onChange={e => set('warningDelayDays', Number(e.target.value) || 0)} placeholder="3" />
              <p style={{ fontSize: 10, color: D.muted, margin: '4px 0 0' }}>0 = pa gen avètisman otomatik</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
              background: 'rgba(231,76,60,0.06)', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: D.muted }}>
              {Number(form.warningDelayDays) > 0 ? (
                <>
                  <span style={{ color: D.orange, fontWeight: 700, marginBottom: 4 }}>⚠️ Avètisman: +{form.warningDelayDays} jou reta</span>
                  <span style={{ color: D.red, fontWeight: 700 }}>🔒 Blokaj: apre avètisman an</span>
                </>
              ) : <span>Blokaj manyèl sèlman</span>}
            </div>
          </div>
        </Sec>

        <Sec icon="🗓" title="Frekans Peman">
          <div className="freq-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 }}>
            {Object.entries(FREQ_LABELS).map(([val, labels]) => (
              <button key={val} className="freq-btn" onClick={() => set('frequency', val)} style={{
                padding: '9px 6px', borderRadius: 9, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${form.frequency === val ? D.gold : D.borderSub}`,
                background: form.frequency === val ? D.goldDim : 'transparent',
                color: form.frequency === val ? D.gold : D.muted, transition: 'all 0.15s' }}>
                {labels.ht}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14, borderTop: `1px solid ${D.borderSub}`, paddingTop: 13 }}>
            <label style={lbl}>Touche chak konbyen sik?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => set('interval', n)} style={{
                  width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, flexShrink: 0,
                  border: `1.5px solid ${intervalN === n ? D.gold : D.borderSub}`,
                  background: intervalN === n ? D.goldDim : 'transparent',
                  color: intervalN === n ? D.gold : D.muted, transition: 'all 0.15s' }}>
                  {n}
                </button>
              ))}
              <input type="number" min="1" max="52" value={form.interval}
                onChange={e => set('interval', Math.max(1, Number(e.target.value) || 1))}
                style={{ ...inp, width: 70, textAlign: 'center', fontFamily: 'monospace', fontWeight: 800,
                  color: intervalN > 4 ? D.gold : D.muted, fontSize: 15, padding: '8px 6px' }} />
            </div>
          </div>
        </Sec>

        <Sec icon="📜" title="Regleman Sol (Opsyonèl)" col="20,184,166">
          <textarea rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontSize: 12 }}
            value={form.regleman} onChange={e => set('regleman', e.target.value)}
            placeholder="Ex: Tout manm dwe peye avan 8h. Peman anreta gen amand..." />
        </Sec>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10,
            border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>
            Anile
          </button>
          <button disabled={loading} onClick={() => {
            if (!form.name || !form.amount) return toast.error('Non ak montan obligatwa.')
            // ✅ Validasyon: kòmansman fenèt peman dwe pi piti pase fen
            if (form.dueTime >= form.dueTimeEnd) {
              return toast.error('⚠️ Lè kòmansman fenèt peman dwe pi piti pase lè fen.')
            }
            onSave({
              ...form, amount: Number(form.amount), feePerMember: Number(form.feePerMember || 0),
              penalty: Number(form.penalty || 0), warningDelayDays: Number(form.warningDelayDays || 0),
              maxMembers: Number(form.maxMembers || 0), dueTime: form.dueTime || '08:00',
              dueTimeEnd: form.dueTimeEnd || '15:00', interval: intervalN,
              startDate: form.startDate || new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'open',
            })
          }} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn,
            color: '#0a1222', fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 4px 16px rgba(201,168,76,0.28)' }}>
            {loading ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={15} />}
            {loading ? 'Ap sove...' : (isEdit ? 'Sove Chanjman' : 'Kreye Plan')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: TIRAJ AVÈG
// ─────────────────────────────────────────────────────────────
export function ModalBlindDraw({ plan, onClose, onConfirm, loading }) {
  const eligible = (plan.members || []).filter(m => !m.hasWon && !m.isOwnerSlot && m.status === 'active')
  const [chosen, setChosen] = useState(null)
  const [drawn,  setDrawn]  = useState(false)
  const [spinning, setSpin] = useState(false)

  const draw = () => {
    if (!eligible.length) return
    setSpin(true)
    let count = 0
    const max = 20 + Math.floor(Math.random() * 10)
    const iv = setInterval(() => {
      setChosen(eligible[Math.floor(Math.random() * eligible.length)])
      count++
      if (count >= max) {
        clearInterval(iv)
        const winner = eligible[Math.floor(Math.random() * eligible.length)]
        setChosen(winner); setDrawn(true); setSpin(false)
      }
    }, 80)
  }

  return (
    <Modal onClose={onClose} title="🎲 Tiraj Avèg — San Men" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {eligible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: D.muted }}>
            <Trophy size={36} style={{ marginBottom: 10, opacity: 0.4, display: 'block', margin: '0 auto 10px' }} />
            <p>Pa gen manm aktif disponib pou tiraj.</p>
          </div>
        ) : (
          <>
            <div style={{ background: D.blueBg, border: `1px solid ${D.blue}30`, borderRadius: 12,
              padding: '10px 14px', fontSize: 11, color: D.muted, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Shuffle size={14} style={{ color: D.blue, flexShrink: 0 }} />
              <span>Sèlman manm AKTIF ki patisipe nan tiraj la ({eligible.length} moun).</span>
            </div>
            <div style={{ background: chosen ? D.goldDim : 'rgba(255,255,255,0.03)',
              border: `2px solid ${chosen && drawn ? D.gold : D.borderSub}`,
              borderRadius: 16, padding: '24px', textAlign: 'center', minHeight: 120,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {!chosen && !spinning && <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>Klike "Tire" pou kòmanse</p>}
              {(chosen || spinning) && (
                <div style={{ animation: drawn ? 'pop 0.4s ease' : 'none' }}>
                  <p style={{ fontSize: 10, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                    {spinning ? '🎲 Ap tire...' : '🏆 Moun Chwazi'}
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: drawn ? D.gold : D.muted, margin: '0 0 4px',
                    filter: spinning ? 'blur(2px)' : 'none' }}>
                    {chosen.name}
                  </p>
                  <p style={{ fontSize: 12, color: D.muted, margin: '0 0 8px' }}>
                    Pozisyon #{chosen.position} • {chosen.phone}
                  </p>
                  {drawn && (
                    <div style={{ background: D.greenBg, border: `1px solid ${D.green}40`, borderRadius: 10, padding: '8px 16px', display: 'inline-block' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: D.green }}>
                        {fmt(memberPayout(plan))} HTG
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {eligible.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 11px', borderRadius: 8,
                  background: chosen?.id === m.id ? D.goldDim : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${chosen?.id === m.id ? D.gold : 'transparent'}` }}>
                  <span style={{ fontSize: 12, color: D.text, fontWeight: chosen?.id === m.id ? 800 : 400 }}>
                    #{m.position} {m.name}
                  </span>
                  <span style={{ fontSize: 11, color: D.muted }}>{m.phone}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {!drawn ? (
                <button onClick={draw} disabled={spinning} style={{ flex: 1, padding: '13px', borderRadius: 12,
                  border: 'none', cursor: spinning ? 'default' : 'pointer',
                  background: spinning ? 'rgba(59,130,246,0.3)' : `linear-gradient(135deg,${D.blue},#1d4ed8)`,
                  color: '#fff', fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {spinning ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.5s linear infinite', display: 'inline-block' }} /> Ap tire...</> : <><Shuffle size={16} /> Tire</>}
                </button>
              ) : (
                <>
                  <button onClick={() => { setChosen(null); setDrawn(false) }} style={{ flex: 1, padding: '12px',
                    borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent',
                    color: D.muted, cursor: 'pointer', fontWeight: 700 }}>
                    Tire Ankò
                  </button>
                  <button onClick={() => onConfirm(chosen)} disabled={loading} style={{ flex: 2, padding: '12px',
                    borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
                    background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn,
                    color: '#0a1222', fontWeight: 800, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trophy size={14} />}
                    {loading ? 'Ap konfime...' : `Konfime ${chosen.name}`}
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
// MODAL: MARK PAYMENT
// ─────────────────────────────────────────────────────────────
export function ModalMarkPayment({ member, plan, onClose, onSave, printer }) {
  const { tenant } = useAuthStore()
  const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
  const allDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const unpaid   = allDates.filter(d => !member.payments?.[d])

  const [sel,      setSel]      = useState(unpaid.length === 1 ? [unpaid[0]] : [])
  const [applyFine, setFine]    = useState(false)
  const [pdfReady, setPdfReady] = useState(false)

  const toggle = (d) => setSel(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  const samePhoneMembers = useMemo(() =>
    (plan.members || []).filter(m => m.phone === member.phone && m.id !== member.id && m.status !== 'stopped'),
    [plan.members, member])
  const allPayingSlots = useMemo(() => [member, ...samePhoneMembers], [member, samePhoneMembers])
  const slotCount = allPayingSlots.length

  const hasPenalty = Number(plan.penalty) > 0
  const lateDates  = sel.filter(d => d < today)
  const fineAmt    = hasPenalty && applyFine ? lateDates.length * Number(plan.penalty) : 0
  const baseAmt    = sel.length * Number(plan.amount) * slotCount
  const totalAmt   = baseAmt + fineAmt
  const isBlocked  = member.status === 'blocked'

  const handleDownloadPDF = () => {
    const html = buildReceiptHTML(plan, member, sel, tenant, 'peman', allPayingSlots)
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi ${member.name}</title>
      <style>* { box-sizing: border-box; } body { font-family: 'Courier New', monospace; background: #fff; }</style>
    </head><body>${html}</body></html>`
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const win  = window.open(url, '_blank')
    if (win) win.onload = () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 500) }
  }

  const handleConfirm = async () => {
    if (!sel.length) return toast.error('Chwazi omwen yon dat.')
    const timings = {}; sel.forEach(d => { timings[d] = getPaymentTiming(plan, d) })
    const fines = {}
    if (applyFine && hasPenalty) lateDates.forEach(d => { fines[d] = Number(plan.penalty) })
    onSave(member.id, sel, timings, fines)
    for (const other of samePhoneMembers) {
      const otherUnpaid = sel.filter(d => !other.payments?.[d])
      if (otherUnpaid.length > 0) {
        const otherTimings = {}; otherUnpaid.forEach(d => { otherTimings[d] = getPaymentTiming(plan, d) })
        onSave(other.id, otherUnpaid, otherTimings, {})
      }
    }
    await printer.print(plan, member, sel, tenant, 'peman', allPayingSlots)
    setPdfReady(true)
  }

  return (
    <Modal onClose={onClose} title={`✅ Mache Peye — ${member.name}`} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: D.goldDim, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: D.muted }}>
          <span style={{ color: D.gold, fontWeight: 700 }}>Plan: </span>{plan.name} •
          <span style={{ color: D.gold, fontWeight: 700 }}> {fmt(plan.amount)} HTG / dat</span>
          {slotCount > 1 && <span style={{ color: D.blue, fontWeight: 700 }}> × {slotCount} men = <strong>{fmt(plan.amount * slotCount)} HTG/dat</strong></span>}
          {hasPenalty && <span style={{ color: D.red }}> • Amand reta: {fmt(plan.penalty)} HTG</span>}
        </div>

        {isBlocked && (
          <div style={{ background: D.orangeBg, border: `1px solid ${D.orange}40`, borderRadius: 10,
            padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <Lock size={14} style={{ color: D.orange, flexShrink: 0 }} />
            <span style={{ color: D.orange, fontWeight: 700 }}>Kont sa a bloke. Peman an ap debloke l otomatikman.</span>
          </div>
        )}

        {unpaid.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: D.green }}>
            <CheckCircle size={36} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 700 }}>Kliyan sa a ajou nan tout peman l!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Chwazi dat ou vle mache kòm peye:</p>
              <button onClick={() => setSel(unpaid)} style={{ fontSize: 10, color: D.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Tout chwazi
              </button>
            </div>

            {/* ─── DEPO REZÈV INFO ─── */}
            {(() => {
              const futureSel = sel.filter(d => d > today)
              if (futureSel.length === 0) return null
              const depoAmt = futureSel.length * Number(plan.amount) * slotCount
              return (
                <div style={{ background: 'rgba(20,184,166,0.08)', border: `1px solid ${D.teal}30`,
                  borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 11 }}>
                  <span style={{ fontSize: 16 }}>💰</span>
                  <div>
                    <span style={{ color: D.teal, fontWeight: 700 }}>Depo Rezèv: </span>
                    <span style={{ color: D.text, fontWeight: 800 }}>{fmt(depoAmt)} HTG</span>
                    <span style={{ color: D.muted }}> ({futureSel.length} dat alavans ap anrejistre kòm rezèv)</span>
                  </div>
                </div>
              )
            })()}

            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {unpaid.map(d => {
                const isLate = d < today
                const isFuture = d > today
                const montanDat = plan.amount * slotCount
                return (
                  <div key={d} className="pay-date-row" onClick={() => toggle(d)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 13px', borderRadius: 9, cursor: 'pointer',
                    background: sel.includes(d) ? (isFuture ? 'rgba(20,184,166,0.08)' : D.greenBg) : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${sel.includes(d) ? (isFuture ? `${D.teal}40` : `${D.green}40`) : D.borderSub}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: D.text }}>{d.split('-').reverse().join('/')}</span>
                      {isLate && <span style={{ fontSize: 9, background: D.orangeBg, color: D.orange, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>⚠️ Reta</span>}
                      {isFuture && <span style={{ fontSize: 9, background: 'rgba(20,184,166,0.12)', color: D.teal, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>💰 Rezèv</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {slotCount > 1 ? (
                        <span style={{ fontSize: 11, color: D.muted }}>
                          {slotCount}×{fmt(plan.amount)} = <strong style={{ color: isFuture ? D.teal : D.gold, marginLeft: 4 }}>{fmt(montanDat)} HTG</strong>
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: isFuture ? D.teal : D.gold }}>{fmt(plan.amount)} HTG</span>
                      )}
                      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${sel.includes(d) ? (isFuture ? D.teal : D.green) : D.borderSub}`,
                        background: sel.includes(d) ? (isFuture ? D.teal : D.green) : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sel.includes(d) && <CheckCircle size={11} color="#fff" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {hasPenalty && lateDates.length > 0 && sel.some(d => d < today) && (
              <div onClick={() => setFine(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 13px', borderRadius: 10, cursor: 'pointer',
                background: applyFine ? D.redBg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${applyFine ? `${D.red}40` : D.borderSub}` }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${applyFine ? D.red : D.borderSub}`,
                  background: applyFine ? D.red : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {applyFine && <CheckCircle size={11} color="#fff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: applyFine ? D.red : D.muted }}>Ajoute Amand Reta</span>
                  <span style={{ fontSize: 11, color: D.muted, marginLeft: 8 }}>
                    {lateDates.length} dat × {fmt(plan.penalty)} = <strong style={{ color: D.red }}>{fmt(lateDates.length * Number(plan.penalty))} HTG</strong>
                  </span>
                </div>
                <AlertTriangle size={14} style={{ color: D.red, flexShrink: 0 }} />
              </div>
            )}

            <div style={{ background: D.greenBg, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: fineAmt > 0 ? 4 : 0 }}>
                <span style={{ fontSize: 12, color: D.green, fontWeight: 700 }}>
                  Peman ({sel.length} dat{slotCount > 1 ? ` × ${slotCount} men` : ''}):
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.green }}>{fmt(baseAmt)} HTG</span>
              </div>
              {fineAmt > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: D.red }}>+ Amand:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: D.red }}>{fmt(fineAmt)} HTG</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${D.green}30`, paddingTop: 6 }}>
                    <span style={{ fontSize: 12, color: D.green, fontWeight: 800 }}>TOTAL:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color: D.green, fontSize: 14 }}>{fmt(totalAmt)} HTG</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10,
                border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>
                Anile
              </button>
              {pdfReady && (
                <button onClick={handleDownloadPDF} style={{ flex: 1, padding: '12px', borderRadius: 10,
                  border: `1px solid ${D.blue}40`, background: D.blueBg, color: D.blue,
                  cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  📄 PDF
                </button>
              )}
              <button onClick={handleConfirm} disabled={printer.printing || !sel.length} style={{
                flex: 2, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: printer.printing ? 0.6 : 1 }}>
                {printer.printing
                  ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a1222', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  : <><CheckCircle size={15} /><Printer size={13} /></>}
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
// MODAL: AKSYON ADMIN SOU MANM
// ─────────────────────────────────────────────────────────────
export function ModalMemberAction({ member, plan, action, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')

  const configs = {
    block:   { title: `🔒 Bloke — ${member.name}`,    color: D.red,    bg: D.redBg,    icon: <Lock size={22} style={{ color: D.red }} />,       desc: 'Kont manm sa a ap bloke. Li pa ka resevwa kòb li jiskaske li peye ariye a.', btnLabel: 'Bloke Kont',          btnColor: `linear-gradient(135deg,${D.red},#8B1A1A)` },
    unblock: { title: `🔓 Debloke — ${member.name}`,  color: D.green,  bg: D.greenBg,  icon: <Unlock size={22} style={{ color: D.green }} />,    desc: 'Admin ap debloke kont manm sa a.',                                            btnLabel: 'Debloke Kont',        btnColor: `linear-gradient(135deg,${D.green},#145A32)` },
    stop:    { title: `⏸️ Kanpe — ${member.name}`,    color: D.orange, bg: D.orangeBg, icon: <StopCircle size={22} style={{ color: D.orange }} />, desc: 'Manm sa a ap kanpe patisipasyon li.',                                        btnLabel: 'Kanpe Patisipasyon',  btnColor: `linear-gradient(135deg,${D.orange},#8B5A00)` },
    resume:  { title: `▶️ Reprann — ${member.name}`,  color: D.blue,   bg: D.blueBg,   icon: <UserCheck size={22} style={{ color: D.blue }} />,  desc: 'Manm sa a ap reprann patisipasyon aktif li.',                                 btnLabel: 'Reprann Patisipasyon', btnColor: `linear-gradient(135deg,${D.blue},#1A3A8B)` },
  }

  const cfg = configs[action]
  if (!cfg) return null

  const stoppedPayout = useMemo(() => {
    if (action !== 'stop') return 0
    const allDates = getAllPaymentDates(plan)
    const paidCount = allDates.filter(d => member.payments?.[d]).length
    return paidCount * Number(plan.amount)
  }, [action, plan, member])

  return (
    <Modal onClose={onClose} title={cfg.title} width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {cfg.icon}
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: cfg.color, margin: '0 0 4px' }}>{member.name}</p>
            <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Pozisyon #{member.position} • {member.phone}</p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: D.muted, margin: 0, lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 13px' }}>{cfg.desc}</p>
        {action === 'stop' && stoppedPayout > 0 && (
          <div style={{ background: D.goldDim, border: `1px solid ${D.gold}30`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: D.muted }}>Kontribisyon li deja fè:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold }}>{fmt(stoppedPayout)} HTG</span>
            </div>
            <p style={{ fontSize: 10, color: D.muted, margin: '6px 0 0' }}>Li ap resevwa montan sa lè sol la fini.</p>
          </div>
        )}
        <div>
          <label style={lbl}>Rezon (opsyonèl)</label>
          <input style={inp} value={reason} onChange={e => setReason(e.target.value)}
            placeholder={action === 'stop' ? 'Ex: Moun lan demenaje...' : 'Ex: Ariye regle...'} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button onClick={() => onConfirm(action, reason)} disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            cursor: loading ? 'default' : 'pointer', background: loading ? 'rgba(201,168,76,0.3)' : cfg.btnColor,
            color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            {loading ? 'Ap trete...' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: FÈMEN PLAN
// ─────────────────────────────────────────────────────────────
export function ModalClosePlan({ plan, onClose, onConfirm, loading }) {
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
        <div style={{ background: D.redBg, border: `1px solid ${D.red}30`, borderRadius: 12, padding: '12px 16px', fontSize: 12, color: D.muted, lineHeight: 1.7 }}>
          <p style={{ color: D.red, fontWeight: 800, fontSize: 13, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertCircle size={15} /> Aksyon sa pa ka defèt!
          </p>
          Plan <strong style={{ color: D.text }}>{plan.name}</strong> ap fèmen definitivman.
        </div>
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: D.muted, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total manm aktif:</span><span style={{ color: D.text, fontWeight: 700 }}>{activeMembers.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Manm ki poko touche:</span><span style={{ color: D.orange, fontWeight: 700 }}>{pendingPayout}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${D.border}`, paddingTop: 7 }}>
              <span>Total kontribisyon kolekte:</span>
              <span style={{ color: D.green, fontWeight: 800, fontFamily: 'monospace' }}>{fmt(totalToDistribute)} HTG</span>
            </div>
          </div>
        </div>
        {pendingPayout > 0 && (
          <div style={{ background: D.goldDim, border: `1px solid ${D.gold}30`, borderRadius: 10, padding: '10px 13px', fontSize: 11, color: D.muted }}>
            <span style={{ color: D.gold, fontWeight: 700 }}>⚠️ Enpòtan:</span> {pendingPayout} manm poko touche.
          </div>
        )}
        <div>
          <label style={lbl}>Tape "FEMEN" pou konfime</label>
          <input style={{ ...inp, textAlign: 'center', fontWeight: 800, fontSize: 15, borderColor: confirm === 'FEMEN' ? D.red : undefined }}
            value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())} placeholder="FEMEN" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button onClick={onConfirm} disabled={loading || confirm !== 'FEMEN'} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            cursor: (loading || confirm !== 'FEMEN') ? 'not-allowed' : 'pointer',
            background: (loading || confirm !== 'FEMEN') ? 'rgba(231,76,60,0.3)' : `linear-gradient(135deg,${D.red},#8B1A1A)`,
            color: '#fff', fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: confirm !== 'FEMEN' ? 0.5 : 1 }}>
            {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <StopCircle size={14} />}
            {loading ? 'Ap fèmen...' : 'Fèmen Plan Definitiv'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: ENSKRI MANM
// ─────────────────────────────────────────────────────────────
export function ModalAddMember({ plan, onClose, onSave, loading, onShowCreds }) {
  const { availableSlots, ownerSlotAvailable, ownerMember } = useMemo(() => {
    const taken = new Set((plan.members || []).map(m => m.position))
    const maxPos = Math.max(0, ...(plan.members || []).map(m => m.position))
    const ownerMember = (plan.members || []).find(m => m.isOwnerSlot)
    const ownerSlotAvailable = hasOwnerSlot(plan) && !taken.has(1)
    const PREVIEW_SLOTS = 10
    const gaps = Array.from({ length: maxPos }, (_, i) => i + 1).filter(p => !taken.has(p) && p !== 1)
    const futureSlots = Array.from({ length: PREVIEW_SLOTS }, (_, i) => maxPos + 1 + i)
    const allPos = [...gaps, ...futureSlots]
    const availableSlots = allPos.map(pos => ({ position: pos, date: getPayoutDate(plan, pos) }))
    return { availableSlots, ownerSlotAvailable, ownerMember }
  }, [plan])

  const [selectedSlots,    setSelectedSlots]    = useState([])
  const [ownerMode,        setOwnerMode]        = useState(false)
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false)
  const [tab,              setTab]              = useState('info')
  const [form, setForm] = useState({ name: '', phone: '', cin: '', nif: '', address: '', referenceName: '', referencePhone: '', relationship: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [photoPreview, setPhotoPreview] = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [photoB64, setPhotoB64] = useState(null)
  const [idPhotoB64, setIdPhotoB64] = useState(null)
  const [existingAccount, setExistingAccount] = useState(null)
  const [checkingPhone, setCheckingPhone] = useState(false)

  const positions = ownerMode ? [1] : selectedSlots.map(s => s.position)
  const currentActive = (plan.members || []).filter(m => m.status !== 'stopped').length
  const projectedTotal = currentActive + positions.length
  const projectedMemberPay = Math.max(0, Number(plan.amount) * projectedTotal - Number(plan.feePerMember || 0))
  const projectedOwnerPay  = Number(plan.amount) * projectedTotal
  const totalPerCycle = positions.length * Number(plan.amount)

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
      const slug = localStorage.getItem('plusgroup-slug')
      const { token } = useAuthStore.getState()
      const res = await fetch(`${API_URL}/sabotay/sol-account?phone=${encodeURIComponent(phone)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' } })
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
    const firstPos = finalPositions[0]
    const credentials = existingAccount ? null : generateCredentials(form.name, form.phone)
    const payoutDatesMap = {}
    finalPositions.forEach(p => { payoutDatesMap[p] = getPayoutDate(plan, p) })
    onSave({
      ...form, position: firstPos, positions: finalPositions, credentials, isOwnerSlot,
      cin: form.cin || null, nif: form.nif || null, address: form.address || null,
      photoUrl: photoB64 || null, idPhotoUrl: idPhotoB64 || null,
      referenceName: form.referenceName || null, referencePhone: form.referencePhone || null,
      relationship: form.relationship || null, preferredDate: payoutDatesMap[firstPos] || null,
    _cb: (saved) => onShowCreds({
  member: saved || { ...form, position: firstPos, positions: finalPositions },
  credentials: existingAccount
    ? { username: existingAccount.username, password: null, isExisting: true }
    : { ...credentials, username: saved?.username || credentials?.username },
  positions: finalPositions, payoutDates: payoutDatesMap,
}),
    })
  }

  const handleSubmit = () => {
    if (!form.name)  return toast.error('Non manm obligatwa.')
    if (!form.phone) return toast.error('Telefòn obligatwa.')
    if (ownerMode) { setShowOwnerConfirm(true) }
    else {
      if (!selectedSlots.length) return toast.error('Chwazi omwen yon dat.')
      doSave(false, positions)
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: 'none',
    background: active ? D.goldDim : 'transparent', color: active ? D.gold : D.muted,
    borderBottom: active ? `2px solid ${D.gold}` : '2px solid transparent', transition: 'all 0.15s',
  })

  const imgBox = { width: '100%', height: 90, borderRadius: 10, border: `1px solid ${D.border}`, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }

  return (
    <Modal onClose={onClose} title="👤 Enskri Manm Sol" width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!ownerSlotAvailable && hasOwnerSlot(plan) && ownerMember && (
          <div style={{ background: D.goldDim, border: `1px solid ${D.gold}40`, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Star size={16} style={{ color: D.gold, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: D.gold, margin: '0 0 2px' }}>Pwopriyete Sol — {ownerMember.name}</p>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Tape menm nimewo pou ajoute nouvo men.</p>
            </div>
          </div>
        )}

        {ownerSlotAvailable && (
          <button onClick={() => { setOwnerMode(o => !o); setSelectedSlots([]) }} style={{
            width: '100%', padding: '11px 14px', borderRadius: 12,
            border: `2px solid ${ownerMode ? D.gold : `${D.gold}50`}`,
            background: ownerMode ? D.goldBtn : D.goldDim, color: ownerMode ? '#0a1222' : D.gold,
            cursor: 'pointer', fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Star size={14} />
            {ownerMode ? '⭐ Mode Pwopriyete Aktif — Plas #1' : 'Enskri kòm Pwopriyete Sol (Plas #1)'}
          </button>
        )}

        {!ownerMode && (
          <div style={{ background: D.goldDim, borderRadius: 12, padding: '12px 14px' }}>
            <label style={{ ...lbl, marginBottom: 8 }}>📅 Chwazi Dat Touche</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {availableSlots.map(slot => {
                const isActive = !!selectedSlots.find(s => s.position === slot.position)
                const dateDisp = slot.date ? slot.date.split('-').reverse().join('/') : '—'
                const isNewest = slot.position === Math.max(...availableSlots.map(s => s.position))
                return (
                  <button key={slot.position} onClick={() => toggleSlot(slot)} style={{
                    padding: '9px 11px', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 76, position: 'relative',
                    border: `2px solid ${isActive ? D.blue : isNewest ? `${D.gold}50` : D.borderSub}`,
                    background: isActive ? D.blueBg : isNewest ? 'rgba(201,168,76,0.05)' : 'transparent' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: isActive ? D.blue : isNewest ? D.gold : D.text }}>{dateDisp}</span>
                    <span style={{ fontSize: 9, color: isActive ? D.blue : D.muted, marginTop: 2 }}>Men #{slot.position}</span>
                    {isNewest && !isActive && <span style={{ fontSize: 8, color: D.gold }}>NOUVO</span>}
                    {isActive && <span style={{ position: 'absolute', top: -5, right: -5, background: D.blue, color: '#fff', borderRadius: 6, padding: '1px 4px', fontSize: 8, fontWeight: 900 }}>✓</span>}
                  </button>
                )
              })}
            </div>
            {selectedSlots.length > 0 && (
              <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '9px 12px' }}>
                {selectedSlots.map(s => (
                  <div key={s.position} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted, marginBottom: 3 }}>
                    <span style={{ color: D.text, fontWeight: 600 }}>Men #{s.position}</span>
                    <span style={{ display: 'flex', gap: 10 }}>
                      <span>📅 {s.date?.split('-').reverse().join('/') || '—'}</span>
                      <span style={{ color: D.green }}>🏆 {fmt(projectedMemberPay)} HTG</span>
                    </span>
                  </div>
                ))}
                {selectedSlots.length > 1 && (
                  <div style={{ borderTop: `1px solid ${D.borderSub}`, paddingTop: 6, marginTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: D.muted }}>Peman pa sik:</span>
                    <span style={{ color: D.orange, fontWeight: 700 }}>{selectedSlots.length} × {fmt(plan.amount)} HTG = {fmt(totalPerCycle)} HTG</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${D.borderSub}` }}>
          {[['info', '👤 Enfòmasyon'], ['kyc', '🪪 KYC'], ['ref', '📞 Referans']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={lbl}>Non Manm *</label>
              <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Non ak Prenon" />
            </div>
            <div>
              <label style={lbl}>Telefòn * {checkingPhone && <span style={{ color: D.muted, fontWeight: 400 }}>ap verifye...</span>}</label>
              <input style={{ ...inp, fontSize: 16 }} inputMode="tel" value={form.phone}
                onChange={e => { set('phone', e.target.value); checkPhone(e.target.value) }} placeholder="+509 XXXX XXXX" />
            </div>
            {existingAccount && (
              <div style={{ background: 'rgba(20,184,166,0.08)', border: `1px solid ${D.teal}40`, borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <UserCheck size={18} style={{ color: D.teal, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: D.teal, margin: '0 0 3px' }}>♻️ Kont Sol egziste — {existingAccount.memberName}</p>
                  <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Username: <strong style={{ fontFamily: 'monospace' }}>{existingAccount.username}</strong></p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'kyc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>CIN</label><input style={inp} value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="1-23-456789-0" /></div>
              <div><label style={lbl}>NIF</label><input style={inp} value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000-123-456-7" /></div>
            </div>
            <div><label style={lbl}>Adres</label><input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Foto Kliyan</label>
                <label htmlFor="sol-photo-upload" style={imgBox}>
                  {photoPreview ? <img src={photoPreview} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: D.muted }}><div style={{ fontSize: 24 }}>📷</div><div style={{ fontSize: 9 }}>Klike pou foto</div></div>}
                  <input id="sol-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e, 'photo')} />
                </label>
              </div>
              <div>
                <label style={lbl}>Foto Pyes Idantite</label>
                <label htmlFor="sol-id-upload" style={imgBox}>
                  {idPhotoPreview ? <img src={idPhotoPreview} alt="id" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: D.muted }}><div style={{ fontSize: 24 }}>🪪</div><div style={{ fontSize: 9 }}>CIN / Paspo</div></div>}
                  <input id="sol-id-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e, 'idPhoto')} />
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === 'ref' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div><label style={lbl}>Non Moun Referans</label><input style={inp} value={form.referenceName} onChange={e => set('referenceName', e.target.value)} placeholder="Non ak Prenon referans" /></div>
            <div><label style={lbl}>Telefòn Referans</label><input style={inp} inputMode="tel" value={form.referencePhone} onChange={e => set('referencePhone', e.target.value)} placeholder="+509 XXXX XXXX" /></div>
            <div>
              <label style={lbl}>Relasyon</label>
              <select style={{ ...inp, appearance: 'none', cursor: 'pointer' }} value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option value="">— Chwazi relasyon —</option>
                {RELATIONSHIPS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {ownerMode && showOwnerConfirm && (
          <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 14, padding: '16px 15px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: D.gold, margin: '0 0 8px' }}>⭐ Konfime Men Pwopriyete Sol</p>
            <p style={{ fontSize: 11, color: D.muted, margin: '0 0 12px', lineHeight: 1.7 }}>
              Plas #1 = <strong style={{ color: D.gold }}>Men Pwopriyete</strong>. Li ap kolekte{' '}
              <strong style={{ color: D.text }}>{fmt(projectedOwnerPay)} HTG</strong>. Lòt manm: <strong style={{ color: D.green }}>{fmt(projectedMemberPay)} HTG</strong>.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowOwnerConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>← Tounen</button>
              <button disabled={loading} onClick={() => { setShowOwnerConfirm(false); doSave(true, [1]) }} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Star size={13} />}
                Wi, Kreye Men Pwopriyete
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button disabled={loading || showOwnerConfirm || (!ownerMode && selectedSlots.length === 0)} onClick={handleSubmit} style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            opacity: (!ownerMode && selectedSlots.length === 0) ? 0.5 : 1 }}>
            {loading ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : ownerMode ? <Star size={15} /> : <Users size={15} />}
            {loading ? 'Ap enskri...' : ownerMode ? 'Enskri Pwopriyete Sol' : selectedSlots.length > 1 ? `Enskri — ${selectedSlots.length} Men (${fmt(totalPerCycle)} HTG/sik)` : selectedSlots.length === 1 ? 'Enskri — 1 Men' : 'Chwazi Dat Anvan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: KREDANSYÈL
// ─────────────────────────────────────────────────────────────
export function ModalMemberCredentials({ member, credentials, onClose, positions, payoutDates }) {
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
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: D.teal, background: 'rgba(0,0,0,0.25)', padding: '7px 12px', borderRadius: 8, marginBottom: 10 }}>app.plusgroupe.com/app/sol/login</div>
          <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>Non Itilizatè</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: D.text, background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 8, marginBottom: 10 }}>{credentials?.username}</div>
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
// KALANDRIYE
// ─────────────────────────────────────────────────────────────
export function PlanCalendar({ plan }) {
  const [off, setOff] = useState(0)
  const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
  const allPayDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const payoutMap   = useMemo(() => getPayoutDateMap(plan), [plan])

  const mDates = useMemo(() => (plan.members || []).map(m => ({
    ...m, payDates: allPayDates, payoutDate: payoutMap[m.position],
  })), [plan, allPayDates, payoutMap])

  const now = new Date(); now.setMonth(now.getMonth() + off)
  const yr = now.getFullYear(), mo = now.getMonth()
  const monthStr = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay = new Date(yr, mo, 1).getDay()
  const daysInMo = new Date(yr, mo + 1, 0).getDate()

  const tColor = (m, d, past) => {
    if (!m.payments?.[d]) return past ? D.red : D.blue
    const t = m.paymentTimings?.[d]
    return t === 'early' ? '#00d084' : t === 'onTime' ? D.green : t === 'late' ? D.orange : D.green
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setOff(o => o - 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} /></button>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#fff', textTransform: 'capitalize' }}>{monthStr}</span>
        <button onClick={() => setOff(o => o + 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: D.muted, padding: '4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ aspectRatio: '1', borderRadius: 8 }} />)}
        {Array.from({ length: daysInMo }).map((_, i) => {
          const day = i + 1
          const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isTd = ds === today
          const payors = mDates.filter(m => m.payDates.includes(ds) && m.status !== 'stopped')
          const winners = mDates.filter(m => m.payoutDate === ds)
          const hasA = payors.length > 0, past = ds < today
          const allP = hasA && payors.every(m => m.payments?.[ds])
          const someP = payors.some(m => m.payments?.[ds])
          let bg = 'transparent', bc = 'transparent', tc = D.muted
          if (isTd) { bg = D.goldDim; bc = D.gold; tc = D.gold }
          else if (winners.length > 0 && !hasA) { bg = 'rgba(201,168,76,0.15)'; bc = `${D.gold}60`; tc = D.gold }
          else if (hasA && allP) { bg = D.greenBg; bc = `${D.green}40`; tc = D.green }
          else if (hasA && someP) { bg = D.orangeBg; bc = `${D.orange}40`; tc = D.orange }
          else if (hasA && past) { bg = D.redBg; bc = `${D.red}40`; tc = D.red }
          else if (hasA) { bg = 'rgba(59,130,246,0.08)'; bc = 'rgba(59,130,246,0.25)'; tc = D.blue }
          return (
            <div key={day} className="cal-day" style={{ aspectRatio: '1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${bc}` }}>
              <span style={{ fontSize: 11, fontWeight: isTd || hasA ? 800 : 400, color: tc }}>{day}</span>
              {winners.length > 0 && <span style={{ fontSize: 8, color: D.gold }}>🏆</span>}
              {hasA && <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
                {payors.slice(0, 3).map(m => <div key={m.id} style={{ width: 4, height: 4, borderRadius: '50%', background: tColor(m, ds, past) }} />)}
                {payors.length > 3 && <span style={{ fontSize: 7, color: D.muted }}>+{payors.length - 3}</span>}
              </div>}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, fontSize: 10, color: D.muted }}>
        {[['#00d084', 'Bonè ⚡'], [D.green, 'Atètan ✅'], [D.orange, 'Reta ⚠️'], [D.red, 'Pa Peye'], [D.blue, 'Pwochen'], [D.gold, '🏆 Dat Touche']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL MANM — ak Depo Rezèv
// ─────────────────────────────────────────────────────────────
export function MemberVirtualAccount({ member, plan, onClose, printer, allMemberSlots }) {
  const { tenant } = useAuthStore()
  const allDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const multiSlots = allMemberSlots && allMemberSlots.length > 1
  const [activeSlotIdx, setActiveSlotIdx] = useState(0)
  const activeMember = multiSlots ? allMemberSlots[activeSlotIdx] : member
  const [solAccount, setSolAccount] = useState(null)

  const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
  useEffect(() => {
  const fetchSolAccount = async () => {
    try {
      const { token } = useAuthStore.getState()
      const slug = localStorage.getItem('plusgroup-slug')
      const res = await fetch(
        `${API_URL}/sol/members/${activeMember.id}/check`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' } }
      )
      if (res.ok) {
        const data = await res.json()
        setSolAccount(data.account || null)
      }
    } catch { }
  }
  fetchSolAccount()
}, [activeMember.id])
  const isOwner = activeMember.isOwnerSlot
  const payoutDate = getPayoutDate(plan, activeMember.position)

  const allSlotsList = allMemberSlots || [activeMember]

  // ─── Peman Nòmal (jiskaske jodi a) ───
  const totalPaid = allSlotsList.reduce((acc, slot) =>
    acc + allDates.filter(d => slot.payments?.[d] && d <= today).length, 0)
  const totalDue  = allDates.filter(d => d <= today).length
  const amtPaid   = totalPaid * plan.amount
  const amtDue    = totalDue * plan.amount * allSlotsList.length

  // ─── DEPO REZÈV — peman alavans (apre jodi a) ───
  const depoRezev = allSlotsList.reduce((acc, slot) =>
    acc + calcMemberDepoRezev(slot, plan, today), 0)

  const payout = isOwner ? ownerPayout(plan) : memberPayout(plan)
  const progress = allDates.length > 0 ? (totalPaid / allDates.length) * 100 : 0
  const scoreData = getMemberScore(activeMember)
  const fineTotal = Object.values(activeMember.fines || {}).reduce((a, b) => a + Number(b), 0)
  const memberStatus = computeMemberStatus(activeMember, plan, today)

  // Evolisyon sol la
  const totalMbrs = (plan.members || []).filter(m => m.status !== 'stopped').length
  const totalPaidAll = (plan.members || []).reduce((acc, m) =>
    acc + allDates.filter(d => m.payments?.[d] && d <= today).length * plan.amount, 0)
  const totalExpectedAll = totalMbrs * totalDue * plan.amount
  const solProgress = totalExpectedAll > 0 ? (totalPaidAll / totalExpectedAll) * 100 : 0

  const tBadge = (t) => {
    if (t === 'early')  return <span style={{ fontSize: 8, background: 'rgba(0,208,132,0.15)', color: '#00d084', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>⚡ Bonè</span>
    if (t === 'onTime') return <span style={{ fontSize: 8, background: D.greenBg, color: D.green, padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>✅ Atètan</span>
    if (t === 'late')   return <span style={{ fontSize: 8, background: D.orangeBg, color: D.orange, padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>⚠️ Reta</span>
    return null
  }

  return (
    <Modal onClose={onClose} title={`💳 Kont — ${activeMember.name}`} width={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {multiSlots && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: D.muted, fontWeight: 700, alignSelf: 'center', marginRight: 4 }}>MEN:</span>
              {allMemberSlots.map((slot, idx) => (
                <button key={slot.id || idx} onClick={() => setActiveSlotIdx(idx)} style={{
                  padding: '6px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: 'none',
                  background: activeSlotIdx === idx ? D.blueBg : 'rgba(255,255,255,0.05)',
                  color: activeSlotIdx === idx ? D.blue : D.muted,
                  outline: activeSlotIdx === idx ? `1.5px solid ${D.blue}` : '1.5px solid transparent' }}>
                  Men #{slot.position}
                  {getPayoutDate(plan, slot.position) && (
                    <span style={{ fontSize: 9, color: D.muted, marginLeft: 5 }}>
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
        <div style={{ background: isOwner ? D.goldBtn : 'linear-gradient(135deg,#1B2A8F,#0d1b2a)', border: isOwner ? 'none' : `1px solid ${D.border}`, borderRadius: 14, padding: '16px 18px', color: isOwner ? '#0a1222' : D.text }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 2px' }}>{activeMember.name} {isOwner && '★'}</p>
              <p style={{ fontSize: 11, opacity: 0.65, margin: 0 }}>{activeMember.phone}</p>
              <p style={{ fontSize: 10, opacity: 0.6, margin: '3px 0 0' }}>Pozisyon #{activeMember.position} • {plan.name}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, opacity: 0.6, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Kontribisyon</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, margin: '0 0 2px' }}>{fmt(amtPaid)} HTG</p>
              <p style={{ fontSize: 9, opacity: 0.5, margin: 0 }}>{totalPaid}/{allDates.length} peman</p>
            </div>
          </div>
        </div>

        {/* ─── DEPO REZÈV BADGE ─── */}
        {depoRezev > 0 && (
          <div style={{ background: 'rgba(20,184,166,0.10)', border: `1px solid ${D.teal}35`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 22 }}>💰</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: D.teal, margin: '0 0 2px' }}>Depo Rezèv Disponib</p>
                <p style={{ fontSize: 10, color: D.muted, margin: 0 }}>Kòb manm sa a deja peye alavans pou jou ki vini apre jodi a</p>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: D.teal }}>{fmt(depoRezev)} HTG</div>
              <div style={{ fontSize: 9, color: D.muted }}>alavans</div>
            </div>
          </div>
        )}

        {/* Avètisman bloke */}
        {memberStatus === 'blocked' && (
          <div style={{ background: D.redBg, border: `1px solid ${D.red}40`, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12 }}>
            <Lock size={16} style={{ color: D.red, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 800, color: D.red, margin: '0 0 2px' }}>🔒 Kont Bloke</p>
              <p style={{ color: D.muted, margin: 0, fontSize: 11 }}>Manm sa dwe peye ariye a. Sèlman admin ka debloke l.</p>
            </div>
          </div>
        )}

        {activeMember.status === 'stopped' && (
          <div style={{ background: D.orangeBg, border: `1px solid ${D.orange}40`, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12 }}>
            <StopCircle size={16} style={{ color: D.orange, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 800, color: D.orange, margin: '0 0 2px' }}>⏸️ Kanpe</p>
              <p style={{ color: D.muted, margin: 0, fontSize: 11 }}>Li ap resevwa <strong style={{ color: D.gold }}>{fmt(amtPaid)} HTG</strong> lè sol la fini.</p>
            </div>
          </div>
        )}

        {/* Evolisyon sol */}
        <div style={{ background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.15)`, borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={11} /> Evolisyon Sol la ({totalMbrs} manm aktif)
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
            <span style={{ color: D.muted }}>Total kolekte vs atann:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: D.blue }}>{fmt(totalPaidAll)} / {fmt(totalExpectedAll)} HTG</span>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${Math.min(100, solProgress)}%`, background: 'linear-gradient(90deg,#3B82F6,#1B2A8F)', borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: D.muted }}>
            <span>Sol la: <strong style={{ color: solProgress >= 90 ? D.green : solProgress >= 60 ? D.orange : D.red }}>{Math.round(solProgress)}% ajou</strong></span>
            <span>Kalandriye: <strong style={{ color: D.text }}>{allDates.length} sik total</strong></span>
          </div>
        </div>

        {/* Stats manm */}
        <div className="vacct-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8 }}>
          {[
            { label: 'Deja Peye',       val: `${fmt(amtPaid)} HTG`,                             color: D.green },
            { label: 'Rès pou Peye',    val: `${fmt(Math.max(0, amtDue - amtPaid))} HTG`,       color: D.red   },
            { label: 'Depo Rezèv 💰',   val: `${fmt(depoRezev)} HTG`,                           color: D.teal  },
            { label: 'Ap Touche',       val: `${fmt(payout)} HTG`,                              color: D.gold  },
            { label: 'Dat Touche',      val: payoutDate ? payoutDate.split('-').reverse().join('/') : '—', color: D.blue },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color, wordBreak: 'break-word' }}>{val}</div>
            </div>
          ))}
        </div>

        {fineTotal > 0 && (
          <div style={{ background: D.redBg, border: `1px solid ${D.red}30`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: D.red, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><AlertTriangle size={14} /> Total Amand Reta</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, color: D.red }}>{fmt(fineTotal)} HTG</span>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: D.muted, fontWeight: 700 }}>PWOGRÈ MANM</span>
            <span style={{ fontSize: 10, color: D.gold, fontWeight: 800 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: D.goldBtn, borderRadius: 8 }} />
          </div>
        </div>

        {scoreData && (
          <div style={{ background: D.blueBg, border: `1px solid rgba(59,130,246,0.15)`, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={11} />Pèfòmans
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: scoreData.score >= 80 ? '#00d084' : scoreData.score >= 50 ? D.orange : D.red }}>{scoreData.score}%</span>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, flexWrap: 'wrap' }}>
              <span style={{ color: '#00d084', fontWeight: 700 }}>⚡ {scoreData.early} bonè</span>
              <span style={{ color: D.green, fontWeight: 700 }}>✅ {scoreData.onTime} a lè</span>
              <span style={{ color: D.orange, fontWeight: 700 }}>⚠️ {scoreData.late} reta</span>
            </div>
          </div>
        )}

        <button onClick={() => printer.print(plan, activeMember, [], tenant, 'kont')} disabled={printer.printing}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 10,
            border: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          <Printer size={14} /> Enprime Kont
        </button>

        {solAccount && (
  <div style={{ background: 'rgba(155,89,182,0.08)', border: `1px solid rgba(155,89,182,0.25)`, borderRadius: 12, padding: '14px 16px' }}>
    <p style={{ fontSize: 10, fontWeight: 800, color: D.purple, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Key size={11} /> Kont Sol — Enfòmasyon Koneksyon
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 10, color: D.muted, marginBottom: 3 }}>Non Itilizatè</div>
        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: D.text, background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
          {solAccount.username}
        </div>
      </div>
      {solAccount.plainPassword && (
        <div>
          <div style={{ fontSize: 10, color: D.muted, marginBottom: 3 }}>Modpas</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: D.gold, background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8, letterSpacing: '0.12em', textAlign: 'center' }}>
            {solAccount.plainPassword}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: D.muted }}>🔗 app.plusgroupe.com/app/sol/login</div>
    </div>
  </div>
)}

        {/* Istwa peman */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: D.muted, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Istwa Peman ({totalPaid}/{allDates.length})
          </p>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {allDates.slice(0, 60).map(d => {
              const paid = !!activeMember.payments?.[d]
              const timing = activeMember.paymentTimings?.[d]
              const past = d <= today
              const isFuture = d > today
              const isPayoutDay = getPayoutDate(plan, activeMember.position) === d
              const fine = activeMember.fines?.[d]
              const isDepo = paid && isFuture

              return (
                <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 9, gap: 6,
                  background: isPayoutDay ? D.goldDim : isDepo ? 'rgba(20,184,166,0.08)' : paid ? D.greenBg : past ? D.redBg : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isPayoutDay ? D.border : isDepo ? `${D.teal}20` : paid ? `${D.green}20` : past ? `${D.red}20` : 'transparent'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: D.muted, flexShrink: 0 }}>{d.split('-').reverse().join('/')}</span>
                    {isPayoutDay && <span style={{ fontSize: 9, background: D.goldDim, color: D.gold, padding: '1px 6px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>🏆 Touche</span>}
                    {isDepo && <span style={{ fontSize: 9, background: 'rgba(20,184,166,0.12)', color: D.teal, padding: '1px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>💰 Rezèv</span>}
                    {paid && !isDepo && tBadge(timing)}
                    {fine && <span style={{ fontSize: 9, background: D.redBg, color: D.red, padding: '1px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>+{fmt(fine)} amand</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: paid ? (isDepo ? D.teal : D.green) : past ? D.red : D.muted }}>
                      {paid ? `+${fmt(plan.amount)}` : past ? `-${fmt(plan.amount)}` : `${fmt(plan.amount)}`} HTG
                    </span>
                    <PayBadge paid={paid} small />
                    {paid && (
                      <button onClick={() => printer.print(plan, activeMember, [d], tenant, 'peman', allMemberSlots || [activeMember])}
                        title="Re-enprime resi" style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Printer size={11} />
                      </button>
                    )}
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
// EXCHANGE TAB
// ─────────────────────────────────────────────────────────────
export function ExchangeTab({ plan }) {
  const { token } = useAuthStore.getState ? useAuthStore.getState() : useAuthStore()
  const slug = localStorage.getItem('plusgroup-slug')
  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' }

  const { data: exchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['sol-exchanges', plan.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/sol/admin/exchange?planId=${plan.id}`, { headers: authH })
      const d = await res.json()
      const result = d.exchanges || d || []
      return Array.isArray(result) ? result : []
    },
    refetchInterval: 30000,
  })

  const [showConfig, setShowConfig] = useState(false)
  const [cfg, setCfg] = useState({ exchangeFeePct: plan.exchangeFeePct ?? 10, exchangeFeeAdminPct: plan.exchangeFeeAdminPct ?? 50 })
  const qc = useQueryClient()

  const saveConfig = useMutation({
  mutationFn: () => apiFetch(`/sabotay/plans/${plan.id}/exchange-config`, {
    method: 'PATCH',
    body: JSON.stringify(cfg)
  }),
  onSuccess: () => { qc.invalidateQueries(['sabotay-plans']); setShowConfig(false); toast.success('✅ Konfigirasyon sove!') },
  onError: e => toast.error(e.message),
})

  const STATUS = {
    pending:  { label: 'Annatandan', color: D.orange, bg: D.orangeBg, icon: '⏳' },
    accepted: { label: 'Aksepte',    color: D.green,  bg: D.greenBg,  icon: '✅' },
    rejected: { label: 'Refize',     color: D.red,    bg: D.redBg,    icon: '❌' },
    cancelled:{ label: 'Anile',      color: D.muted,  bg: 'rgba(255,255,255,0.04)', icon: '🚫' },
  }

  const pending = exchanges.filter(e => e.status === 'pending')
  const history = exchanges.filter(e => e.status !== 'pending')

  const calcFee = (ex) => {
    const feePerSlot = plan.exchangeFeePct ?? 10
    const adminPct   = (plan.exchangeFeeAdminPct ?? 50) / 100
    const diff       = Math.abs(ex.receiverPosition - ex.initiatorPosition)
    const base       = diff * feePerSlot
    return { total: Math.round(base), toAdmin: Math.round(base * adminPct), toMember: Math.round(base * (1 - adminPct)) }
  }

  const getMember = (pos) => plan.members?.find(m => m.position === pos)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Total', val: exchanges.length, color: D.blue }, { label: 'Annatandan', val: pending.length, color: D.orange }, { label: 'Aksepte', val: exchanges.filter(e => e.status === 'accepted').length, color: D.green }].map(({ label, val, color }) => (
            <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 9, padding: '7px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color }}>{val}</div>
              <div style={{ fontSize: 9, color: D.muted, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowConfig(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
          <Settings size={13} /> Konfigire Frè
        </button>
      </div>

      {showConfig && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={12} /> Konfigirasyon Frè Echanj
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Frè Echanj pa Plas (HTG)</label>
              <input type="number" min="0" style={{ ...inp, color: D.orange }} value={cfg.exchangeFeePct} onChange={e => setCfg(p => ({ ...p, exchangeFeePct: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={lbl}>Pati Admin (%)</label>
              <input type="number" min="0" max="100" style={{ ...inp, color: D.gold }} value={cfg.exchangeFeeAdminPct} onChange={e => setCfg(p => ({ ...p, exchangeFeeAdminPct: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => setShowConfig(false)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
            <button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', background: saveConfig.isPending ? 'rgba(59,130,246,0.3)' : `linear-gradient(135deg,${D.blue},#1d4ed8)`, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {saveConfig.isPending ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Settings size={13} />}
              {saveConfig.isPending ? 'Ap sove...' : 'Sove Konfigirasyon'}
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.orange, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>⏳ Annatandan ({pending.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pending.map(ex => {
              const fee = calcFee(ex); const mInit = getMember(ex.initiatorPosition); const mRecv = getMember(ex.receiverPosition)
              return (
                <div key={ex.id} style={{ background: D.card, border: `1px solid ${D.orange}30`, borderRadius: 12, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '7px 10px' }}>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 2 }}>Inisye</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>#{ex.initiatorPosition} {mInit?.name || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 18 }}>⇄</div>
                      <div style={{ fontSize: 9, color: D.orange, fontWeight: 700 }}>Frè: {fmt(fee.total)} HTG</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '7px 10px' }}>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 2 }}>Lòt Manm</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>#{ex.receiverPosition} {mRecv?.name || '—'}</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 11px', fontSize: 10, color: D.muted, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>Frè total: <strong style={{ color: D.orange }}>{fmt(fee.total)} HTG</strong></span>
                    <span>→ Admin: <strong style={{ color: D.gold }}>{fmt(fee.toAdmin)} HTG</strong></span>
                    <span>→ Manm desann: <strong style={{ color: D.green }}>{fmt(fee.toMember)} HTG</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: D.muted }}>📅 {new Date(ex.createdAt).toLocaleDateString('fr-HT')}</span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: STATUS[ex.status]?.bg, color: STATUS[ex.status]?.color }}>
                      {STATUS[ex.status]?.icon} {STATUS[ex.status]?.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Istwa ({history.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {history.map(ex => {
              const fee = calcFee(ex); const mInit = getMember(ex.initiatorPosition); const mRecv = getMember(ex.receiverPosition); const st = STATUS[ex.status] || STATUS.cancelled
              return (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '9px 13px', border: `1px solid ${D.borderSub}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.text, minWidth: 80 }}>#{ex.initiatorPosition} → #{ex.receiverPosition}</span>
                  <span style={{ fontSize: 11, color: D.muted, flex: 1, minWidth: 100 }}>{mInit?.name || '?'} ⇄ {mRecv?.name || '?'}</span>
                  {ex.status === 'accepted' && <span style={{ fontSize: 10, color: D.green, fontFamily: 'monospace', fontWeight: 700 }}>{fmt(fee.total)} HTG</span>}
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: st.bg, color: st.color, flexShrink: 0 }}>{st.icon} {st.label}</span>
                  <span style={{ fontSize: 9, color: D.muted, flexShrink: 0 }}>{new Date(ex.createdAt).toLocaleDateString('fr-HT')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && exchanges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: D.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13 }}>Pa gen echanj pozisyon pou plan sa a.</p>
        </div>
      )}
      {isLoading && <div style={{ textAlign: 'center', padding: 24 }}><Loader size={22} style={{ color: D.gold, animation: 'spin 0.8s linear infinite' }} /></div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADMIN CASH TAB
// ─────────────────────────────────────────────────────────────
export function AdminCashTab({ plan }) {
  const { token } = useAuthStore.getState()
  const slug = localStorage.getItem('plusgroup-slug')
  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-cash', plan.id],
    queryFn: async () => { const res = await fetch(`${API_URL}/sabotay/admin-cash?planId=${plan.id}`, { headers: authH }); return res.json() },
    refetchInterval: 30000,
  })

  const TYPE_LABELS = {
    stop_penalty:  { label: 'Penalite Kanpe',   color: D.orange, icon: '⏸️' },
    exchange_fee:  { label: 'Frè Echanj',       color: D.blue,   icon: '🔄' },
    late_fine:     { label: 'Amand Reta',        color: D.red,    icon: '⚠️' },
    fee_per_member:{ label: 'Frè Pwopriyete',   color: D.gold,   icon: '⭐' },
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 32 }}><Loader size={22} style={{ color: D.gold, animation: 'spin 0.8s linear infinite' }} /></div>

  const total   = data?.totalGlobal || 0
  const byType  = data?.byType || {}
  const entries = data?.entries || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.05))', border: `1px solid ${D.gold}40`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>💰 Total Kès Admin</p>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Plan: {plan.name}</p>
        </div>
        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: D.gold }}>{fmt(total)} HTG</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
        {Object.entries(TYPE_LABELS).map(([type, cfg]) => (
          <div key={type} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{cfg.icon}</div>
            <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{cfg.label}</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: byType[type] > 0 ? cfg.color : D.muted }}>{fmt(byType[type] || 0)} HTG</div>
          </div>
        ))}
      </div>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Istwa ({entries.length})</p>
          <button onClick={refetch} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={12} /></button>
        </div>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: D.muted }}><p style={{ margin: 0, fontSize: 13 }}>Pa gen mouvman pou kounye a.</p></div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {entries.map(e => {
              const cfg = TYPE_LABELS[e.type] || { label: e.type, color: D.muted, icon: '💵' }
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${D.borderSub}`, gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.memberName || '—'}</div>
                      <div style={{ fontSize: 10, color: D.muted }}>{cfg.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: cfg.color }}>+{fmt(e.amount)} HTG</div>
                    <div style={{ fontSize: 9, color: D.muted }}>{new Date(e.createdAt).toLocaleDateString('fr-HT')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <AdminCashConfig plan={plan} authH={authH} />
    </div>
  )
}

export function AdminCashConfig({ plan, authH }) {
  const qc = useQueryClient()
  const [pct, setPct] = useState(plan.stopPenaltyPct || 0)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`${API_URL}/sabotay/plans/${plan.id}`, { method: 'PUT', headers: authH, body: JSON.stringify({ stopPenaltyPct: Number(pct) }) })
      qc.invalidateQueries(['sabotay-plans'])
      toast.success('✅ % Penalite sove!')
    } catch { toast.error('Erè sove') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'rgba(243,156,18,0.06)', border: `1px solid ${D.orange}30`, borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: D.orange, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>⚙️ Konfigirasyon Penalite Kanpe</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>% Penalite si Manm Kanpe</label>
          <input type="number" min="0" max="100" style={{ ...inp, color: D.orange }} value={pct} onChange={e => setPct(e.target.value)} />
          <p style={{ fontSize: 10, color: D.muted, margin: '4px 0 0' }}>{Number(pct) > 0 ? `Egzanp: 1000 HTG → Penalite ${fmt(1000 * Number(pct) / 100)} HTG` : 'Pa gen penalite (0%)'}</p>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, minHeight: 42, flexShrink: 0 }}>
          {saving ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
          {saving ? 'Ap sove...' : 'Sove'}
        </button>
      </div>
    </div>
  )
}