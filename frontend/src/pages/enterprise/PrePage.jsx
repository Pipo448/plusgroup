// src/pages/enterprise/PrePage.jsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Search, Eye, X, Printer, ChevronLeft, ChevronRight,
  Users, Wallet, TrendingUp, Activity, AlertCircle, RefreshCw,
  Bluetooth, BluetoothOff, CheckCircle, Clock, XCircle,
  DollarSign, CalendarClock, Percent, UserPlus, ArrowDownCircle,
} from 'lucide-react'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected,
} from '../../services/printerService'

// ─── Import shared tokens (menm ke KaneEpayPage) ─────────────
import {
  D, fmt, fmtDate, fmtShort, getAccountPrefix,
  PAYMENT_METHODS, inputStyle, labelStyle, SHARED_STYLES,
} from './kaneShared.jsx'

// ─── API wrapper ─────────────────────────────────────────────
const preAPI = {
  getStats:   ()         => api.get('/pre/stats'),
  getAll:     (p)        => api.get('/pre', { params: p }),
  getOne:     (id)       => api.get(`/pre/${id}`),
  create:     (data)     => api.post('/pre', data),
  paiement:   (id, data) => api.post(`/pre/${id}/paiement`, data),
  cloture:    (id)       => api.post(`/pre/${id}/cloture`),
}

// ─── Helpers prè ─────────────────────────────────────────────
const STATUTS = {
  actif:    { label: 'Aktif',    color: D.green,  bg: D.greenBg,  icon: <CheckCircle size={11}/> },
  reta:     { label: 'An Reta',  color: D.red,    bg: D.redBg,    icon: <AlertCircle size={11}/> },
  attente:  { label: 'Antant',   color: D.orange, bg: D.orangeBg, icon: <Clock size={11}/> },
  cloture:  { label: 'Klotire',  color: D.muted,  bg: 'rgba(107,122,153,0.1)', icon: <XCircle size={11}/> },
}

const PERIODES = [
  { value: 'semaine',  label: 'Semèn'    },
  { value: 'biweekly', label: '2 Semèn'  },
  { value: 'mois',     label: 'Mwa'      },
  { value: 'trimestre',label: 'Trimès'   },
  { value: 'unique',   label: 'Yon sèl peman' },
]

// Kalkil enterè senp — kapital × to × (durasyon/12)
function calcInteretSimple(kapital, tauxPct, dureeEnMois) {
  const k = Number(kapital || 0)
  const t = Number(tauxPct || 0) / 100
  const d = Number(dureeEnMois || 1)
  const interet = k * t * (d / 12)
  const total   = k + interet
  return { interet: Math.round(interet * 100) / 100, total: Math.round(total * 100) / 100 }
}

// Kalkil montann peman peryodik
function calcPaiementPeriodique(total, periode, dureeEnMois) {
  if (periode === 'unique')    return total
  if (periode === 'semaine')   return total / Math.ceil(dureeEnMois * 4.33)
  if (periode === 'biweekly')  return total / Math.ceil(dureeEnMois * 2.17)
  if (periode === 'trimestre') return total / Math.ceil(dureeEnMois / 3)
  return total / dureeEnMois // mois
}

// ─── CSS addisyonèl pou Pre ───────────────────────────────────
const PRE_STYLES = `
  .pre-photo-grid  { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .pre-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media (min-width: 600px) {
    .pre-photo-grid  { grid-template-columns: 1fr 1fr; }
    .pre-detail-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .pre-row:hover { background: rgba(201,168,76,0.06) !important; }
  .pre-badge     { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; }
`

// ─── Printer hook (menm logic ke KaneEpayPage) ────────────────
function usePrinter() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try {
      const name = await connectPrinter()
      setConnected(true)
      toast.success(`✅ ${name} konekte`)
    } catch (e) {
      if (e.name !== 'NotFoundError') toast.error('Pa ka konekte printer.')
    } finally { setConnecting(false) }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  // Print resi prè nan browser si BT pa disponib
  const printPre = useCallback((pre, tenant, type = 'ouverture') => {
    const biz  = tenant?.businessName || tenant?.name || 'PLUS GROUP'
    const { interet } = calcInteretSimple(pre.montant, pre.tauxInteret, pre.dureeEnMois)
    const totalDu = Number(pre.montant) + interet

    const html = `<div style="width:80mm;padding:4mm 3mm;font-family:'Courier New',monospace;font-size:10px;line-height:1.5;color:#1a1a1a">
      <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
        <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
        <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- PRÈ / MIKWO KREDI --</div>
      </div>
      <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
        ${type === 'ouverture' ? 'KONTRA PRÈ' : type === 'paiement' ? 'RESI PAIEMAN' : 'KLOTIRE PRÈ'}
      </div>
      <div style="font-size:9px;margin-bottom:5px">
        <div style="display:flex;justify-content:space-between"><span style="color:#555">No. Prè:</span><b>${pre.numeroPre || pre.id}</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Kliyan:</span><b>${pre.clientNom || ''}</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Dat:</span><span>${fmtDate(new Date())}</span></div>
      </div>
      <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Kapital:</span><b>${fmt(pre.montant)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">To enterè:</span><b>${pre.tauxInteret}% / an</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Durasyon:</span><b>${pre.dureeEnMois} mwa</b></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #ccc;margin-top:4px;padding-top:4px">
          <b>Total dwe:</b><b style="color:#dc2626">${fmt(totalDu)} HTG</b>
        </div>
        ${type === 'paiement' && pre._paiement ? `<div style="display:flex;justify-content:space-between;margin-top:3px"><span style="color:#555">Paieman:</span><b style="color:#16a34a">${fmt(pre._paiement.montant)} HTG</b></div>` : ''}
      </div>
      <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
        <b>Mèsi! / Merci!</b><br/>
        <span style="color:#666;font-size:8px">PlusGroup — Tel: +50942449024</span>
      </div>
    </div>`

    const w = window.open('', '_blank', 'width=340,height=620')
    if (!w) { toast.error('Pemit popup pou sit sa.'); return }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi Prè</title>
      <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff}
      @media print{@page{margin:0;size:80mm auto}body{margin:0}}</style>
      </head><body>${html}</body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2000) }, 300)
  }, [])

  return { connected, connecting, printing, connect, disconnect, printPre }
}

// ─── UI Atoms (menm style ke KaneEpayPage) ───────────────────
function Spinner({ size = 14, color = '#fff' }) {
  return <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

function StatCard({ label, value, sub, icon, color, highlight }) {
  return (
    <div style={{
      background: highlight ? `${color}15` : D.card,
      borderRadius: 12, padding: '12px 14px',
      border: `1px solid ${highlight ? color + '40' : D.cardBorder}`,
      boxShadow: D.shadow,
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'fadeUp 0.3s ease',
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: D.muted, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
        <p className="ke-stat-val" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: highlight ? color : D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div style={{ background: D.secBg, border: `1px solid ${D.secBorder}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

function Modal({ onClose, title, children, width = 540 }) {
  return (
    <div className="ke-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: D.overlay, backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div className="ke-modal ke-sheet" style={{
        background: D.card, border: `1px solid ${D.cardBorder}`,
        borderRadius: '18px 18px 0 0', width: '100%', maxWidth: width,
        maxHeight: '96vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
        animation: 'sheetUp 0.24s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 12px', borderBottom: `1px solid ${D.cardBorder}`,
          position: 'sticky', top: 0, background: D.card, zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', color: D.muted,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={15} /></button>
        </div>
        <div style={{ padding: '16px 16px 36px' }}>{children}</div>
      </div>
    </div>
  )
}

function StatutBadge({ statut }) {
  const cfg = STATUTS[statut] || STATUTS.attente
  return (
    <span className="pre-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE PRÈ
// ═══════════════════════════════════════════════════════════════
function ModalCreePre({ onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()

  const [form, setForm] = useState({
    clientNom: '', clientPhone: '', clientNifCin: '', clientAdres: '',
    montant: '', tauxInteret: '18', dureeEnMois: '6',
    datDebut: new Date().toISOString().split('T')[0],
    periode: 'mois',
    method: 'cash', reference: '', notes: '',
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const kapital = Number(form.montant || 0)
  const { interet, total } = calcInteretSimple(kapital, form.tauxInteret, form.dureeEnMois)
  const paiementPeriodique = kapital > 0 ? calcPaiementPeriodique(total, form.periode, Number(form.dureeEnMois)) : 0

  const validate = () => {
    const e = {}
    if (!form.clientNom.trim())  e.clientNom = 'Obligatwa'
    if (kapital <= 0)            e.montant   = 'Montan dwe > 0'
    if (!form.tauxInteret)       e.taux      = 'Taux obligatwa'
    if (!form.dureeEnMois)       e.duree     = 'Durasyon obligatwa'
    setErrors(e); return !Object.keys(e).length
  }

  const mutation = useMutation({
    mutationFn: (d) => preAPI.create(d),
    onSuccess: async (res) => {
      const pre = res.data.pre
      toast.success(`✅ Prè ${pre.numeroPre} kreye!`)
      onSuccess()
      onClose()
      try { printer.printPre(pre, tenant, 'ouverture') } catch { /* silans */ }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan kreyasyon prè.'),
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      clientNom:    form.clientNom.trim(),
      clientPhone:  form.clientPhone  || undefined,
      clientNifCin: form.clientNifCin || undefined,
      clientAdres:  form.clientAdres  || undefined,
      montant:      kapital,
      tauxInteret:  Number(form.tauxInteret),
      dureeEnMois:  Number(form.dureeEnMois),
      datDebut:     form.datDebut,
      periode:      form.periode,
      method:       form.method,
      reference:    form.reference || undefined,
      notes:        form.notes     || undefined,
    })
  }

  return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={580}>
      {/* Kliyan */}
      <Section icon="👤" title="Enfòmasyon Kliyan">
        <div>
          <label style={labelStyle}>Non Konplè *</label>
          <input className="ke-input" style={{ ...inputStyle, borderColor: errors.clientNom ? D.red : undefined }}
            value={form.clientNom} onChange={e => set('clientNom', e.target.value)} placeholder="Non ak Prenon..." />
          {errors.clientNom && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.clientNom}</p>}
        </div>
        <div className="ke-form-row" style={{ marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Telefòn</label>
            <input className="ke-input" style={inputStyle} inputMode="tel"
              value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} placeholder="+509 XXXX XXXX" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>NIF / CIN</label>
            <input className="ke-input" style={inputStyle}
              value={form.clientNifCin} onChange={e => set('clientNifCin', e.target.value)} placeholder="001-234-5678" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={labelStyle}>Adrès</label>
          <input className="ke-input" style={inputStyle}
            value={form.clientAdres} onChange={e => set('clientAdres', e.target.value)} placeholder="Vil, Depatman..." />
        </div>
      </Section>

      {/* Detay prè */}
      <Section icon="💰" title="Detay Prè">
        {/* Kapital */}
        <label style={labelStyle}>Montan Kapital (HTG) *</label>
        <input type="number" min="0" step="0.01" className="ke-input"
          style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold, marginBottom: 10, borderColor: errors.montant ? D.red : undefined }}
          value={form.montant} onChange={e => set('montant', e.target.value)}
          placeholder="0.00" onFocus={e => e.target.select()} />
        {errors.montant && <p style={{ fontSize: 10, color: D.red, margin: '-6px 0 8px' }}>{errors.montant}</p>}

        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, color: D.orange }}>To Enterè (% / an) *</label>
            <div style={{ position: 'relative' }}>
              <input type="number" min="0" max="200" step="0.5" className="ke-input"
                style={{ ...inputStyle, color: D.orange, borderColor: `${D.orange}40`, paddingRight: 36, borderColor: errors.taux ? D.red : `${D.orange}40` }}
                value={form.tauxInteret} onChange={e => set('tauxInteret', e.target.value)} onFocus={e => e.target.select()} />
              <Percent size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: D.orange }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, color: D.blue }}>Durasyon (mwa) *</label>
            <input type="number" min="1" max="120" className="ke-input"
              style={{ ...inputStyle, color: D.blue, borderColor: errors.duree ? D.red : `${D.blue}40` }}
              value={form.dureeEnMois} onChange={e => set('dureeEnMois', e.target.value)} onFocus={e => e.target.select()} />
          </div>
        </div>

        {/* Vizializasyon kalkil */}
        {kapital > 0 && (
          <div style={{ marginTop: 12, background: D.card, borderRadius: 10, padding: '12px 14px', border: `1px solid ${D.cardBorder}` }}>
            {/* Barre pwopòsyon */}
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', display: 'flex', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${Math.min((kapital / (kapital + interet)) * 100, 100)}%`, background: D.gold, transition: 'width 0.3s' }} />
              <div style={{ flex: 1, background: D.orange }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: D.gold }}>💰 Kapital: {fmt(kapital)} HTG</span>
              <span style={{ color: D.orange }}>📈 Enterè: +{fmt(interet)} HTG</span>
              <span style={{ color: D.green }}>✅ Total: {fmt(total)} HTG</span>
            </div>
          </div>
        )}
      </Section>

      {/* Rembourseman */}
      <Section icon="📅" title="Kalann Rembourseman">
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Dat Kòmansman</label>
            <input type="date" className="ke-input" style={{ ...inputStyle, colorScheme: 'dark' }}
              value={form.datDebut} onChange={e => set('datDebut', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Frekans Peman</label>
            <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.periode} onChange={e => set('periode', e.target.value)}>
              {PERIODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Rezime peman */}
        {kapital > 0 && (
          <div style={{ marginTop: 10, background: `${D.blue}10`, border: `1px solid ${D.blue}25`, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: D.muted }}>Chak {PERIODES.find(p => p.value === form.periode)?.label}:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: D.blue }}>{fmt(paiementPeriodique)} HTG</span>
            </div>
            {form.periode !== 'unique' && (
              <p style={{ fontSize: 10, color: D.muted, margin: '4px 0 0' }}>
                ≈ {form.periode === 'semaine' ? Math.ceil(Number(form.dureeEnMois) * 4.33) :
                   form.periode === 'biweekly' ? Math.ceil(Number(form.dureeEnMois) * 2.17) :
                   form.periode === 'trimestre' ? Math.ceil(Number(form.dureeEnMois) / 3) :
                   Number(form.dureeEnMois)} peman total
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Metod desèman */}
      <div className="ke-form-row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Metod Desèman</label>
          <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.method} onChange={e => set('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Referans</label>
          <input className="ke-input" style={inputStyle}
            value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="MCash #12345" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nòt (opsyonèl)</label>
        <textarea className="ke-input" style={{ ...inputStyle, height: 60, resize: 'vertical' }}
          value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Rezon prè, garanti, lòt enfòmasyon..." />
      </div>

      {/* Rezime final */}
      {kapital > 0 && (
        <div style={{ background: `${D.gold}0f`, border: `1px solid ${D.gold}30`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div style={{ color: D.muted }}>Kapital: <strong style={{ color: D.gold }}>{fmt(kapital)} HTG</strong></div>
            <div style={{ color: D.muted }}>To: <strong style={{ color: D.orange }}>{form.tauxInteret}% / an</strong></div>
            <div style={{ color: D.muted }}>Durasyon: <strong style={{ color: D.blue }}>{form.dureeEnMois} mwa</strong></div>
            <div style={{ color: D.muted }}>Total dwe: <strong style={{ color: D.green }}>{fmt(total)} HTG</strong></div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="ke-btn" onClick={onClose} style={{
          flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14,
        }}>Anile</button>
        <button className="ke-btn" onClick={handleSubmit} disabled={mutation.isPending} style={{
          flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14,
          opacity: mutation.isPending ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          {mutation.isPending ? <><Spinner color="#0a1222" /> Ap kreye...</> : <><Printer size={15} /> Kreye + Enprime</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: ANREJISTRE PAIEMAN
// ═══════════════════════════════════════════════════════════════
function ModalPaieman({ pre, onClose, onSuccess, printer }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ montant: '', method: 'cash', reference: '' })
  const amt = Number(form.montant || 0)

  const resteAPayer = Number(pre.totalDu || 0) - Number(pre.totalPaye || 0)

  const mutation = useMutation({
    mutationFn: (d) => preAPI.paiement(pre.id, d),
    onSuccess: async (res) => {
      toast.success(`✅ Paieman ${fmt(amt)} HTG anrejistre!`)
      onSuccess()
      onClose()
      try { printer.printPre({ ...pre, _paiement: { montant: amt } }, tenant, 'paiement') } catch { /* silans */ }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè paieman.'),
  })

  const disabled = mutation.isPending || amt <= 0

  return (
    <Modal onClose={onClose} title={`💳 Paieman — ${pre.numeroPre}`} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Info prè */}
        <div style={{ background: D.goldBtn, borderRadius: 12, padding: '12px 14px', color: '#0a1222' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, margin: '0 0 2px' }}>{pre.clientNom}</p>
              <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, opacity: 0.6, margin: '0 0 2px' }}>Kapital</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, margin: 0 }}>{fmt(pre.montant)} HTG</p>
            </div>
          </div>
        </div>

        {/* Rezime dèt */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: D.greenBg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.green}20` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase' }}>Deja Peye</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.green, margin: 0 }}>{fmt(pre.totalPaye || 0)} HTG</p>
          </div>
          <div style={{ background: D.redBg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.red}20` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase' }}>Rete Pou Peye</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.red, margin: 0 }}>{fmt(resteAPayer)} HTG</p>
          </div>
        </div>

        {/* Input montan */}
        <div>
          <label style={{ ...labelStyle, color: D.green }}>Montan Paieman (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize: 26, fontWeight: 800, textAlign: 'center', borderColor: `${D.green}50`, color: D.green }}
            value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus />
        </div>

        {/* Bouton montan rapid */}
        {resteAPayer > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[resteAPayer, resteAPayer / 2, resteAPayer / 4].filter(v => v > 0).map((v, i) => (
              <button key={i} className="ke-btn" onClick={() => setForm(p => ({ ...p, montant: v.toFixed(2) }))}
                style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${D.green}30`, background: D.greenBg, color: D.green, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                {i === 0 ? 'Tout' : i === 1 ? '½' : '¼'} ({fmt(v)})
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        {amt > 0 && (
          <div style={{ background: D.greenBg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${D.green}25` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: D.green }}>Rete apre paieman:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: resteAPayer - amt <= 0 ? D.gold : D.green }}>
                {fmt(Math.max(0, resteAPayer - amt))} HTG
                {resteAPayer - amt <= 0 && ' 🎉'}
              </span>
            </div>
          </div>
        )}

        {/* Metod */}
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Metod Peman</label>
            <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Referans</label>
            <input className="ke-input" style={inputStyle}
              value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="MCash #..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ke-btn" onClick={onClose} style={{
            flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14,
          }}>Anile</button>
          <button className="ke-btn"
            onClick={() => mutation.mutate({ montant: amt, method: form.method, reference: form.reference || undefined })}
            disabled={disabled}
            style={{
              flex: 2, padding: '13px', borderRadius: 12, border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: `linear-gradient(135deg,${D.green},${D.green}bb)`,
              color: '#fff', fontWeight: 800, fontSize: 14, opacity: disabled ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            {mutation.isPending ? <><Spinner /> Ap anrejistre...</> : <><ArrowDownCircle size={15} /> Konfime Paieman</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: DETAY PRÈ
// ═══════════════════════════════════════════════════════════════
function ModalDetailPre({ preId, onClose, onPaieman, printer }) {
  const { tenant } = useAuthStore()
  const { data: pre, isLoading } = useQuery({
    queryKey: ['pre-one', preId],
    queryFn: () => preAPI.getOne(preId).then(r => r.data.pre),
    enabled: !!preId,
  })

  const qc = useQueryClient()
  const mutCloture = useMutation({
    mutationFn: () => preAPI.cloture(preId),
    onSuccess: () => { toast.success('Prè klotire ✅'); qc.invalidateQueries(['pre-list']); qc.invalidateQueries(['pre-one', preId]); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè klotire.'),
  })

  if (isLoading || !pre) return (
    <Modal onClose={onClose} title="Detay Prè" width={580}>
      <div style={{ textAlign: 'center', padding: 40, color: D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Spinner color={D.gold} size={18} /> Ap chaje...
      </div>
    </Modal>
  )

  const resteAPayer = Number(pre.totalDu || 0) - Number(pre.totalPaye || 0)
  const pctPaye = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye) / Number(pre.totalDu)) * 100, 100) : 0

  return (
    <Modal onClose={onClose} title={`📋 ${pre.numeroPre}`} width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Bannè */}
        <div style={{ background: D.goldBtn, borderRadius: 14, padding: '14px 16px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 3px' }}>{pre.clientNom}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
            {pre.clientPhone   && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>📱 {pre.clientPhone}</p>}
            {pre.clientNifCin  && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>ID: {pre.clientNifCin}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatutBadge statut={pre.statut} />
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, margin: '6px 0 0' }}>{fmt(pre.montant)} HTG</p>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '1px 0 0' }}>Total dwe: {fmt(pre.totalDu)} HTG</p>
          </div>
        </div>

        {/* Barre pwogresyon */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted, marginBottom: 5 }}>
            <span>Peye: {fmt(pre.totalPaye || 0)} HTG</span>
            <span style={{ fontWeight: 700, color: pctPaye >= 100 ? D.gold : D.text }}>{Math.round(pctPaye)}%</span>
            <span>Rete: {fmt(resteAPayer)} HTG</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pctPaye}%`, background: pctPaye >= 100 ? D.gold : D.green, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
        </div>

        {/* Detay finansye */}
        <div className="pre-detail-grid">
          {[
            { label: 'Kapital', val: `${fmt(pre.montant)} HTG`, color: D.gold },
            { label: 'To Enterè', val: `${pre.tauxInteret}% / an`, color: D.orange },
            { label: 'Durasyon', val: `${pre.dureeEnMois} mwa`, color: D.blue },
            { label: 'Total Dwe', val: `${fmt(pre.totalDu)} HTG`, color: D.red },
            { label: 'Total Peye', val: `${fmt(pre.totalPaye || 0)} HTG`, color: D.green },
            { label: 'Frekans', val: PERIODES.find(p => p.value === pre.periode)?.label || pre.periode, color: D.purple },
          ].map(item => (
            <div key={item.label} style={{ background: `${item.color}0f`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${item.color}20` }}>
              <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: item.color, margin: 0 }}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Nòt */}
        {pre.notes && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.cardBorder}` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Nòt</p>
            <p style={{ fontSize: 13, color: D.text, margin: 0 }}>{pre.notes}</p>
          </div>
        )}

        {/* Aksyon */}
        {pre.statut !== 'cloture' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ke-btn" onClick={onPaieman} style={{
              flex: 2, padding: '11px', borderRadius: 10, border: 'none',
              background: D.greenBg, color: D.green, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              border: `1px solid ${D.green}30`,
            }}><ArrowDownCircle size={14} /> Anrejistre Paieman</button>
            <button className="ke-btn" onClick={() => printer.printPre(pre, tenant, 'ouverture')} disabled={printer.printing}
              style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Printer size={14} />
            </button>
            {resteAPayer <= 0 && (
              <button className="ke-btn" onClick={() => mutCloture.mutate()} disabled={mutCloture.isPending}
                style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${D.gold}30`, background: D.goldDim, color: D.gold, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                {mutCloture.isPending ? <Spinner size={12} color={D.gold} /> : <CheckCircle size={13} />} Klotire
              </button>
            )}
          </div>
        )}

        {/* Istwa paieman */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: D.muted, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Istwa Paieman ({pre.paiements?.length || 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {!pre.paiements?.length
              ? <p style={{ textAlign: 'center', color: D.muted, fontSize: 12, padding: 20 }}>Pa gen paieman toujou</p>
              : pre.paiements.map(px => (
                <div key={px.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10, background: D.greenBg, border: `1px solid ${D.green}20` }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${D.green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowDownCircle size={13} style={{ color: D.green }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: D.green }}>Paieman</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: D.green }}>+{fmt(px.montant)} HTG</span>
                    </div>
                    <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>
                      {fmtDate(px.createdAt)} • {px.method}{px.reference ? ` • ${px.reference}` : ''}
                    </p>
                  </div>
                  <button className="ke-btn" onClick={() => printer.printPre({ ...pre, _paiement: px }, tenant, 'paiement')}
                    style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Printer size={11} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRENSIPAL — PRÈ
// ═══════════════════════════════════════════════════════════════
export default function PrePage() {
  const qc      = useQueryClient()
  const printer = usePrinter()

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selPre,          setSelPre]          = useState(null)
  const [filterStatut,    setFilterStatut]    = useState(null)
  const searchTimeout = useRef(null)

  // Injecte SHARED_STYLES + PRE_STYLES yon sèl fwa
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = SHARED_STYLES + PRE_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['pre-stats'],
    queryFn: () => preAPI.getStats().then(r => r.data.stats),
    refetchInterval: 30000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['pre-list', debouncedSearch, page, filterStatut],
    queryFn: () => preAPI.getAll({
      search: debouncedSearch || undefined,
      page, limit: 15,
      ...(filterStatut && { statut: filterStatut }),
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const prets       = listData?.prets    || []
  const total       = listData?.total    || 0
  const totalPages  = Math.ceil(total / 15) || 1

  const refresh = () => {
    qc.invalidateQueries(['pre-list'])
    qc.invalidateQueries(['pre-stats'])
    if (selPre) qc.invalidateQueries(['pre-one', selPre.id])
  }

  const openDetail  = (pre) => { setSelPre(pre); setModal('detail')  }
  const openPaieman = (pre) => { setSelPre(pre); setModal('paieman') }

  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  const totalPortfeuye = statsData?.totalPortfeuye || 0
  const totalPaieman   = statsData?.totalPaiemanMwa || 0
  const retaCount      = statsData?.totalEnReta     || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'DM Sans, sans-serif', padding: '14px 14px 80px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div className="ke-header">
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: D.gold, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <DollarSign size={19} /> Mikwo Kredi — Prè
          </h1>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Jere, suiv ak kolekte prè yo</p>
        </div>
        <div className="ke-header-right">
          <button className="ke-btn" onClick={() => { refresh(); refetchStats() }}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} />
          </button>

          {/* Bluetooth */}
          <button className="ke-btn"
            onClick={printer.connected ? printer.disconnect : printer.connect}
            disabled={printer.connecting}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '9px 11px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)',
              color: printer.connected ? D.green : D.muted,
              fontWeight: 700, fontSize: 12,
            }}>
            {printer.connecting ? <Spinner size={13} color={D.muted} /> : printer.connected ? <Bluetooth size={14} /> : <BluetoothOff size={14} />}
          </button>

          <button className="ke-btn" onClick={() => setModal('create')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 15px',
            borderRadius: 12, border: 'none', cursor: 'pointer',
            background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13,
            boxShadow: '0 4px 14px rgba(201,168,76,0.28)', whiteSpace: 'nowrap',
          }}>
            <Plus size={15} /> Nouvo Prè
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="ke-stats-grid">
        <StatCard label="Total Prè"    value={statsData?.totalPrets    || 0}             icon={<Users size={17}/>}       color={D.gold}   />
        <StatCard label="Prè Aktif"    value={statsData?.pretsActifs   || 0}             icon={<Activity size={17}/>}    color={D.green}  />
        <StatCard label="Pòtfèy"       value={`${fmt(totalPortfeuye)} G`}                icon={<Wallet size={17}/>}      color={D.blue}   />
        <StatCard label="An Reta"      value={retaCount}                                 icon={<AlertCircle size={17}/>} color={D.red}    />
      </div>

      {/* ── Aktivite mwa a ── */}
      <div style={{ background: D.card, borderRadius: 14, padding: '12px 14px', border: `1px solid ${D.cardBorder}` }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: D.gold, margin: '0 0 10px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.green, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Aktivite Mwa a
        </p>
        <div className="ke-today-grid">
          <StatCard label="Desèman Mwa a"  value={`${fmt(statsData?.totalDesèmanMwa || 0)} G`} icon={<ArrowDownCircle size={17}/>} color={D.orange} highlight />
          <StatCard label="Koleksyon Mwa a" value={`${fmt(totalPaieman)} G`}                    icon={<TrendingUp size={17}/>}      color={D.green}  highlight />
          <StatCard label="Enterè Kolekte"  value={`${fmt(statsData?.enterèMwa || 0)} G`}       icon={<Percent size={17}/>}         color={D.purple} highlight />
        </div>
      </div>

      {/* ── Rechèch + Filtre ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
          <input className="ke-input" style={{ ...inputStyle, paddingLeft: 36 }}
            placeholder="Chèche non, nimewo prè..."
            value={search} onChange={handleSearch} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { val: null,      label: 'Tout'     },
            { val: 'actif',   label: '✅ Aktif'  },
            { val: 'reta',    label: '🔴 An Reta' },
            { val: 'cloture', label: '⚫ Klotire' },
          ].map(f => (
            <button key={String(f.val)} className="ke-tab-btn ke-btn"
              onClick={() => { setFilterStatut(f.val); setPage(1) }}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1px solid ${filterStatut === f.val ? D.gold + '60' : D.cardBorder}`,
                background: filterStatut === f.val ? D.goldDim : 'transparent',
                color: filterStatut === f.val ? D.gold : D.muted,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Lis prè ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: D.muted, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Spinner color={D.gold} size={18} /> Ap chaje...
        </div>
      ) : !prets.length ? (
        <div style={{ textAlign: 'center', color: D.muted, padding: 50, background: D.card, borderRadius: 16, border: `1px dashed ${D.cardBorder}` }}>
          <DollarSign size={34} style={{ opacity: 0.25, margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{search ? 'Pa jwenn rezilta' : 'Pa gen prè pou kounye a'}</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{total} prè • paj {page}/{totalPages}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prets.map(pre => {
              const resteAPayer = Number(pre.totalDu || 0) - Number(pre.totalPaye || 0)
              const pctPaye = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye) / Number(pre.totalDu)) * 100, 100) : 0
              const cfg = STATUTS[pre.statut] || STATUTS.attente

              return (
                <div key={pre.id} className="pre-row" onClick={() => openDetail(pre)} style={{
                  background: D.card, border: `1px solid ${pre.statut === 'reta' ? D.red + '30' : D.cardBorder}`,
                  borderRadius: 14, padding: '12px 13px', cursor: 'pointer',
                  boxShadow: D.shadow, transition: 'background 0.15s',
                  animation: 'fadeUp 0.2s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    {/* Gauche: avatar + info */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: D.goldDim, border: `1px solid ${D.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: D.gold }}>
                        {pre.clientNom?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold, fontSize: 11, margin: '0 0 2px' }}>{pre.numeroPre}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pre.clientNom}</p>
                        {pre.clientPhone && <p style={{ fontSize: 11, color: D.muted, margin: '1px 0 0' }}>{pre.clientPhone}</p>}
                        <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>{fmtShort(pre.createdAt)} • {pre.tauxInteret}% / an • {pre.dureeEnMois} mwa</p>
                      </div>
                    </div>

                    {/* Dwat: montan + estati */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, color: D.gold, margin: 0 }}>{fmt(pre.montant)}</p>
                      <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 3px' }}>HTG</p>
                      <StatutBadge statut={pre.statut} />
                    </div>
                  </div>

                  {/* Barre pwogresyon */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${pctPaye}%`, background: pctPaye >= 100 ? D.gold : cfg.color, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: D.muted }}>
                      <span style={{ color: D.green }}>Peye: {fmt(pre.totalPaye || 0)} HTG</span>
                      <span style={{ fontWeight: 700, color: D.text }}>{Math.round(pctPaye)}%</span>
                      <span style={{ color: resteAPayer > 0 ? cfg.color : D.green }}>
                        {resteAPayer > 0 ? `Rete: ${fmt(resteAPayer)} HTG` : '✅ Konplè'}
                      </span>
                    </div>
                  </div>

                  {/* Boutons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid rgba(201,168,76,0.1)` }}>
                    {pre.statut !== 'cloture' && (
                      <button className="ke-btn" onClick={e => { e.stopPropagation(); openPaieman(pre) }}
                        style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none', background: D.greenBg, color: D.green, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <ArrowDownCircle size={13} /> Paieman
                      </button>
                    )}
                    <button className="ke-btn" onClick={e => { e.stopPropagation(); openDetail(pre) }}
                      style={{ padding: '8px 13px', borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={13} />
                    </button>
                    <button className="ke-btn" onClick={e => { e.stopPropagation(); printer.printPre(pre, null, 'ouverture') }}
                      style={{ padding: '8px 13px', borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Printer size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 2px' }}>
          <span style={{ fontSize: 12, color: D.muted }}>{total} prè total</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="ke-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.text, minWidth: 50, textAlign: 'center' }}>{page} / {totalPages}</span>
            <button className="ke-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'create' && (
        <ModalCreePre onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
      {modal === 'detail' && selPre && (
        <ModalDetailPre preId={selPre.id} onClose={() => setModal(null)} onPaieman={() => setModal('paieman')} printer={printer} />
      )}
      {modal === 'paieman' && selPre && (
        <ModalPaieman pre={selPre} onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}
    </div>
  )
}
