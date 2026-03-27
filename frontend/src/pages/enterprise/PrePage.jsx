// src/pages/enterprise/PrePage.jsx  — V3
// Chanjman: tradiksyon, blokaj Kane Epay obligatwa, blokaj kès fèmen
import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { EcheancierSection } from './EcheancierSection'
import {
  Plus, Search, Eye, X, Printer, ChevronLeft, ChevronRight,
  Users, Wallet, TrendingUp, Activity, AlertCircle, RefreshCw,
  CheckCircle, Clock, XCircle, DollarSign, Percent, ArrowDownCircle,
  ShieldCheck, PiggyBank, FileText, Lock,
} from 'lucide-react'
import {
  connectPrinter, disconnectPrinter, isPrinterConnected,
} from '../../services/printerService'
import {
  D, fmt, fmtDate, fmtShort, PAYMENT_METHODS, inputStyle, labelStyle, SHARED_STYLES,
} from './kaneShared.jsx'

// ─── API ─────────────────────────────────────────────────────
const preAPI = {
  getStats:       ()         => api.get('/pre/stats'),
  getAll:         (p)        => api.get('/pre', { params: p }),
  getOne:         (id)       => api.get(`/pre/${id}`),
  create:         (data)     => api.post('/pre', data),
  paiement:       (id, data) => api.post(`/pre/${id}/paiement`, data),
  cloture:        (id)       => api.post(`/pre/${id}/cloture`),
  kaneSearch:     (q)        => api.get('/pre/kane-epay-search', { params: { q } }),
  enjekteKapital: (data)     => api.post('/pre/kapital/enjekte', data),
  femenKes:       (data)     => api.post('/pre/rapo/femen-kes', data),
  // ✅ Verifye si kès deja fèmen jodi a
  checkKesFemen:  ()         => api.get('/pre/rapo/kes-status'),
}

// ─── Constants ───────────────────────────────────────────────
const STATUTS = {
  actif:   { label: 'Aktif',   color: D.green,  bg: D.greenBg,  icon: <CheckCircle size={11}/> },
  reta:    { label: 'An Reta', color: D.red,    bg: D.redBg,    icon: <AlertCircle size={11}/> },
  attente: { label: 'Antant',  color: D.orange, bg: D.orangeBg, icon: <Clock size={11}/> },
  cloture: { label: 'Klotire', color: D.muted,  bg: 'rgba(107,122,153,0.1)', icon: <XCircle size={11}/> },
}

const PERIODES = [
  { value: 'semaine',   label: 'Semèn'         },
  { value: 'biweekly',  label: '2 Semèn'       },
  { value: 'mois',      label: 'Mwa'           },
  { value: 'trimestre', label: 'Trimès'        },
  { value: 'unique',    label: 'Yon sèl peman' },
]

function calcTotalDu(kapital, tauxParMwa, dureeEnMois) {
  const k = Number(kapital || 0)
  const t = Number(tauxParMwa || 0) / 100
  const d = Number(dureeEnMois || 1)
  const interet = k * t * d
  return { interet: Math.round(interet * 100) / 100, total: Math.round((k + interet) * 100) / 100 }
}

function calcPaiementPeriodique(total, periode, dureeEnMois) {
  if (periode === 'unique')    return total
  if (periode === 'semaine')   return total / Math.ceil(dureeEnMois * 4.33)
  if (periode === 'biweekly')  return total / Math.ceil(dureeEnMois * 2.17)
  if (periode === 'trimestre') return total / Math.ceil(dureeEnMois / 3)
  return total / dureeEnMois
}

const PRE_STYLES = `
  .pre-detail-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pre-row:hover    { background: rgba(201,168,76,0.06) !important; }
  .pre-badge        { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .pre-kane-item:hover { background: rgba(201,168,76,0.08) !important; }
  @media (min-width: 600px) {
    .pre-detail-grid { grid-template-columns: repeat(3, 1fr); }
  }
`

// ─── Printer hook ─────────────────────────────────────────────
function usePrinter() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)

  const connect = useCallback(async () => {
    if (connecting || connected) return
    setConnecting(true)
    try { const n = await connectPrinter(); setConnected(true); toast.success(`✅ ${n} konekte`) }
    catch (e) { if (e.name !== 'NotFoundError') toast.error('Pa ka konekte printer.') }
    finally { setConnecting(false) }
  }, [connecting, connected])

  const disconnect = useCallback(() => {
    disconnectPrinter(); setConnected(false); toast('Printer dekonekte', { icon: '🔌' })
  }, [])

  const printPre = useCallback((pre, tenant, type = 'ouverture') => {
    const biz = tenant?.businessName || tenant?.name || 'PLUS GROUP'
    const { interet } = calcTotalDu(pre.montant, pre.tauxInteret, pre.dureeEnMois)
    const html = `<div style="width:80mm;padding:4mm 3mm;font-family:'Courier New',monospace;font-size:10px;line-height:1.5;color:#1a1a1a">
      <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
        <div style="font-family:Arial;font-weight:900;font-size:13px">${biz}</div>
        <div style="font-family:Arial;font-weight:700;font-size:10px;color:#444">-- MIKWO KREDI --</div>
      </div>
      <div style="text-align:center;font-family:Arial;font-weight:800;font-size:11px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
        ${type === 'ouverture' ? 'KONTRA PRÈ' : type === 'paiement' ? 'RESI PEMAN' : 'KLOTIRE PRÈ'}
      </div>
      <div style="font-size:9px;margin-bottom:5px">
        <div style="display:flex;justify-content:space-between"><span style="color:#555">No. Prè:</span><b>${pre.numeroPre || pre.id}</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Kliyan:</span><b>${pre.clientNom || ''}</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Dat:</span><span>${fmtDate(new Date())}</span></div>
      </div>
      <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:9px">
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Kapital:</span><b>${fmt(pre.montant)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">To enterè:</span><b>${pre.tauxInteret}% / mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#555">Dire:</span><b>${pre.dureeEnMois} mwa</b></div>
        ${Number(pre.montantBloke) > 0 ? `<div style="display:flex;justify-content:space-between"><span style="color:#555">Depozit bloke:</span><b>${fmt(pre.montantBloke)} HTG</b></div>` : ''}
        <div style="border-top:1px solid #ccc;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between">
          <b>Total dwe:</b><b style="color:#dc2626">${fmt(Number(pre.montant) + interet)} HTG</b>
        </div>
        ${type === 'paiement' && pre._paiement ? `<div style="display:flex;justify-content:space-between;margin-top:3px"><span style="color:#555">Peman:</span><b style="color:#16a34a">${fmt(pre._paiement.montant)} HTG</b></div>` : ''}
      </div>
      <div style="text-align:center;font-size:9px;border-top:1px dashed #ccc;padding-top:5px">
        <b>Mèsi! / Merci!</b><br/><span style="color:#666;font-size:8px">PlusGroup — Tel: +50942449024</span>
      </div>
    </div>`
    const w = window.open('', '_blank', 'width=340,height=620')
    if (!w) { toast.error('Pemit popup pou sit sa.'); return }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
      <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff}
      @media print{@page{margin:0;size:80mm auto}body{margin:0}}</style>
      </head><body>${html}</body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2000) }, 300)
  }, [])

  return { connected, connecting, connect, disconnect, printPre }
}

// ─── UI Atoms ────────────────────────────────────────────────
function Spinner({ size = 14, color = '#fff' }) {
  return <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

function StatCard({ label, value, sub, icon, color, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}15` : D.card, borderRadius: 12, padding: '12px 14px', border: `1px solid ${highlight ? color + '40' : D.cardBorder}`, boxShadow: D.shadow, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeUp 0.3s ease' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
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
    <div className="ke-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: D.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="ke-modal ke-sheet" style={{ background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: '18px 18px 0 0', width: '100%', maxWidth: width, maxHeight: '96vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', animation: 'sheetUp 0.24s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: `1px solid ${D.cardBorder}`, position: 'sticky', top: 0, background: D.card, zIndex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
        </div>
        <div style={{ padding: '16px 16px 36px' }}>{children}</div>
      </div>
    </div>
  )
}

function StatutBadge({ statut }) {
  const cfg = STATUTS[statut] || STATUTS.attente
  return <span className="pre-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>{cfg.icon} {cfg.label}</span>
}

// ─── Komponan: Chèche kliyan Kane Epay ───────────────────────
function KaneEpaySearch({ onSelect, selected, onClear }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timeout = useRef(null)

  const handleSearch = (val) => {
    setQ(val)
    clearTimeout(timeout.current)
    if (val.length < 2) { setResults([]); return }
    timeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await preAPI.kaneSearch(val)
        setResults(res.data.accounts || [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }

  if (selected) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: D.greenBg, border: `1px solid ${D.green}30` }}>
      {selected.photoUrl
        ? <img src={selected.photoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
        : <div style={{ width: 34, height: 34, borderRadius: 8, background: D.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.gold, fontWeight: 800, fontSize: 13 }}>
            {selected.firstName?.[0]}{selected.lastName?.[0]}
          </div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D.text }}>{selected.firstName} {selected.lastName}</p>
        <p style={{ margin: 0, fontSize: 10, color: D.muted, fontFamily: 'monospace' }}>{selected.accountNumber} • {fmt(selected.balance)} HTG</p>
      </div>
      <button onClick={onClear} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.07)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={13} />
      </button>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
        <input className="ke-input" style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }}
          placeholder="Chèche pa non, nimewo, telefòn..." value={q}
          onChange={e => handleSearch(e.target.value)} />
        {loading && <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)' }}><Spinner size={12} color={D.gold} /></span>}
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: D.shadow }}>
          {results.map(acc => (
            <button key={acc.id} className="pre-kane-item" onClick={() => { onSelect(acc); setQ(''); setResults([]) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: `1px solid ${D.cardBorder}`, textAlign: 'left' }}>
              {acc.photoUrl
                ? <img src={acc.photoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: 7, background: D.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.gold, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                    {acc.firstName?.[0]}{acc.lastName?.[0]}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: D.text }}>{acc.firstName} {acc.lastName}</p>
                <p style={{ margin: 0, fontSize: 10, color: D.muted, fontFamily: 'monospace' }}>{acc.accountNumber} • {fmt(acc.balance)} HTG</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && results.length === 0 && !loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: D.card, border: `1px solid ${D.cardBorder}`, borderRadius: 10, marginTop: 4, padding: '12px', textAlign: 'center', boxShadow: D.shadow }}>
          <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>Pa jwenn kont Kane Epay pou "<strong style={{ color: D.text }}>{q}</strong>"</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE PRÈ
// ✅ Kane Epay OBLIGATWA — pa gen opsyon "tape manyèlman"
// ═══════════════════════════════════════════════════════════════
function ModalCreePre({ onClose, onSuccess, printer, kesFemen }) {
  const { tenant } = useAuthStore()
  const [kaneKont, setKaneKont] = useState(null)
  const [form, setForm] = useState({
    montant: '', tauxInteret: '', dureeEnMois: '6',
    datDebut: new Date().toISOString().split('T')[0],
    periode: 'mois', montantBloke: '',
    method: 'cash', reference: '', notes: '',
  })
  const [errors, setErrors] = useState({})
  const [echeances, setEcheances] = useState([])
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const kapital = Number(form.montant || 0)
  const { interet, total } = calcTotalDu(kapital, form.tauxInteret, form.dureeEnMois)
  const paiementPeriodique = kapital > 0 ? calcPaiementPeriodique(total, form.periode, Number(form.dureeEnMois)) : 0

  // ✅ Bloke si kès fèmen
  if (kesFemen) return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={480}>
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <Lock size={40} style={{ color: D.red, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: D.red, margin: '0 0 8px' }}>Kès Fèmen</p>
        <p style={{ fontSize: 13, color: D.muted, margin: '0 0 20px' }}>
          Ou deja fèmen kès ou jodi a. Ou pa ka fè okenn tranzaksyon pou rès jounen an.
        </p>
        <button className="ke-btn" onClick={onClose}
          style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, cursor: 'pointer' }}>
          Konprann
        </button>
      </div>
    </Modal>
  )

  const validate = () => {
    const e = {}
    if (!kaneKont)            e.kane     = 'Chwazi yon kont Kanè Epay obligatwa'
    if (kapital <= 0)         e.montant  = 'Montan dwe > 0'
    if (!form.tauxInteret)    e.taux     = 'To obligatwa'
    if (!form.dureeEnMois)    e.duree    = 'Dire obligatwa'
    setErrors(e); return !Object.keys(e).length
  }

  const mutation = useMutation({
    mutationFn: (d) => preAPI.create(d),
    onSuccess: async (res) => {
      toast.success(`✅ Prè ${res.data.pre.numeroPre} kreye!`)
      onSuccess(); onClose()
      try { printer.printPre(res.data.pre, tenant, 'ouverture') } catch {}
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè kreyasyon prè.'),
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      clientNom:      `${kaneKont.firstName} ${kaneKont.lastName}`,
      clientPhone:    kaneKont.phone     || undefined,
      clientNifCin:   kaneKont.nifOrCin  || undefined,
      kontKaneEpayId: kaneKont.id,
      montant:        kapital,
      tauxInteret:    Number(form.tauxInteret),
      dureeEnMois:    Number(form.dureeEnMois),
      montantBloke:   Number(form.montantBloke || 0),
      datDebut:       form.datDebut,
      periode:        form.periode,
      method:         form.method,
      reference:      form.reference || undefined,
      notes:          form.notes     || undefined,
    })
  }

  return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={580}>

      {/* ✅ Kont Kane Epay OBLIGATWA */}
      <Section icon="🔗" title="Kont Kanè Epay (Obligatwa)">
        <div style={{ marginBottom: 8, padding: '8px 12px', background: `${D.blue}10`, borderRadius: 8, border: `1px solid ${D.blue}25`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={13} style={{ color: D.blue, flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: D.blue, margin: 0 }}>Moun nan dwe gen yon kont Kanè Epay aktif pou li ka prete.</p>
        </div>
        <KaneEpaySearch selected={kaneKont} onSelect={setKaneKont} onClear={() => setKaneKont(null)} />
        {errors.kane && <p style={{ fontSize: 10, color: D.red, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> {errors.kane}
        </p>}
      </Section>

      {/* Tèm finansye */}
      <Section icon="💰" title="Tèm Finansye">
        <label style={labelStyle}>Montan Kapital (HTG) *</label>
        <input type="number" min="0" step="0.01" className="ke-input"
          style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold, marginBottom: 10, borderColor: errors.montant ? D.red : undefined }}
          value={form.montant} onChange={e => set('montant', e.target.value)}
          placeholder="0.00" onFocus={e => e.target.select()} />
        {errors.montant && <p style={{ fontSize: 10, color: D.red, margin: '-6px 0 8px' }}>{errors.montant}</p>}

        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, color: D.orange }}>To Enterè (% / mwa) *</label>
            <div style={{ position: 'relative' }}>
              <input type="number" min="0" max="100" step="0.1" className="ke-input"
                style={{ ...inputStyle, color: D.orange, borderColor: errors.taux ? D.red : `${D.orange}40`, paddingRight: 52 }}
                value={form.tauxInteret} onChange={e => set('tauxInteret', e.target.value)}
                placeholder="ex: 5" onFocus={e => e.target.select()} />
              <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: D.orange, fontWeight: 700 }}>% / mwa</span>
            </div>
            {errors.taux && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.taux}</p>}
          </div>
          <div style={{ flex: 1 }}>
            {/* ✅ Dire (olye Durasyon) */}
            <label style={{ ...labelStyle, color: D.blue }}>Dire (mwa) *</label>
            <input type="number" min="1" max="120" className="ke-input"
              style={{ ...inputStyle, color: D.blue, borderColor: errors.duree ? D.red : `${D.blue}40` }}
              value={form.dureeEnMois} onChange={e => set('dureeEnMois', e.target.value)}
              onFocus={e => e.target.select()} />
          </div>
        </div>

        {kapital > 0 && form.tauxInteret && (
          <div style={{ marginTop: 12, background: D.card, borderRadius: 10, padding: '12px 14px', border: `1px solid ${D.cardBorder}` }}>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', display: 'flex', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${Math.min((kapital / total) * 100, 100)}%`, background: D.gold, transition: 'width 0.3s' }} />
              <div style={{ flex: 1, background: D.orange }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: D.gold }}>💰 Kapital: {fmt(kapital)} HTG</span>
              <span style={{ color: D.orange }}>📈 Enterè: +{fmt(interet)} HTG</span>
              <span style={{ color: D.green }}>✅ Total: {fmt(total)} HTG</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <label style={{ ...labelStyle, color: D.purple }}>
            Depozit Bloke (opsyonèl)
            <span style={{ fontWeight: 400, color: D.muted, marginLeft: 6 }}>— pa obligatwa</span>
          </label>
          <input type="number" min="0" step="0.01" className="ke-input"
            style={{ ...inputStyle, color: D.purple, borderColor: `${D.purple}40` }}
            value={form.montantBloke} onChange={e => set('montantBloke', e.target.value)}
            placeholder="0.00 — kite vid si pa nesesè" onFocus={e => e.target.select()} />
          {Number(form.montantBloke) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '6px 10px', background: `${D.purple}10`, borderRadius: 8, border: `1px solid ${D.purple}25` }}>
              <ShieldCheck size={12} style={{ color: D.purple }} />
              <span style={{ fontSize: 11, color: D.purple }}>Kliyan dwe depoze {fmt(form.montantBloke)} HTG avan l resevwa prè a</span>
            </div>
          )}
        </div>
      </Section>

      {/* ✅ Kalandriye Rembourseman (olye Kalann) */}
      <Section icon="📅" title="Kalandriye Rembourseman">
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
        {kapital > 0 && form.tauxInteret && (
          <div style={{ marginTop: 10, background: `${D.blue}10`, border: `1px solid ${D.blue}25`, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: D.muted }}>Chak {PERIODES.find(p => p.value === form.periode)?.label}:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: D.blue }}>{fmt(paiementPeriodique)} HTG</span>
            </div>
          </div>
        )}
      </Section>

      {/* Metod Dekèsman */}
      <div className="ke-form-row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          {/* ✅ Dekèsman (olye Desèman) */}
          <label style={labelStyle}>Metod Dekèsman</label>
          <select className="ke-input" style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.method} onChange={e => set('method', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Referans</label>
          <input className="ke-input" style={inputStyle}
            value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="MCash #..." />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nòt</label>
        <textarea className="ke-input" style={{ ...inputStyle, height: 60, resize: 'vertical' }}
          value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Rezon, garanti, lòt enfòmasyon..." />
      </div>

      {kapital > 0 && form.tauxInteret && (
        <div style={{ background: `${D.gold}0f`, border: `1px solid ${D.gold}30`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          <div style={{ color: D.muted }}>Kapital: <strong style={{ color: D.gold }}>{fmt(kapital)} HTG</strong></div>
          <div style={{ color: D.muted }}>To: <strong style={{ color: D.orange }}>{form.tauxInteret}% / mwa</strong></div>
          <div style={{ color: D.muted }}>Dire: <strong style={{ color: D.blue }}>{form.dureeEnMois} mwa</strong></div>
          <div style={{ color: D.muted }}>Total dwe: <strong style={{ color: D.green }}>{fmt(total)} HTG</strong></div>
          {Number(form.montantBloke) > 0 && (
            <div style={{ color: D.muted, gridColumn: '1/-1' }}>Depozit bloke: <strong style={{ color: D.purple }}>{fmt(form.montantBloke)} HTG</strong></div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Anile</button>
        <button className="ke-btn" onClick={handleSubmit} disabled={mutation.isPending}
          style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, opacity: mutation.isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {mutation.isPending ? <><Spinner color="#0a1222" /> Ap kreye...</> : <><Printer size={15} /> Kreye + Enprime</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: PAIEMAN — ✅ Bloke si kès fèmen
// ═══════════════════════════════════════════════════════════════
function ModalPaieman({ pre, onClose, onSuccess, printer, kesFemen }) {
  const { tenant } = useAuthStore()
  const [form, setForm] = useState({ montant: '', method: 'cash', reference: '' })
  const amt = Number(form.montant || 0)
  const resteAPayer = Number(pre.totalDu || 0) - Number(pre.totalPaye || 0)

  // ✅ Bloke si kès fèmen
  if (kesFemen) return (
    <Modal onClose={onClose} title={`💳 Peman — ${pre.numeroPre}`} width={420}>
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <Lock size={40} style={{ color: D.red, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: D.red, margin: '0 0 8px' }}>Kès Fèmen</p>
        <p style={{ fontSize: 13, color: D.muted, margin: '0 0 20px' }}>
          Ou deja fèmen kès ou jodi a. Ou pa ka anrejistre okenn peman pou rès jounen an.
        </p>
        <button className="ke-btn" onClick={onClose}
          style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, cursor: 'pointer' }}>
          Konprann
        </button>
      </div>
    </Modal>
  )

  const mutation = useMutation({
    mutationFn: (d) => preAPI.paiement(pre.id, d),
    onSuccess: async (res) => {
      toast.success(`✅ Peman ${fmt(amt)} HTG anrejistre!`)
      onSuccess(); onClose()
      try { printer.printPre({ ...pre, _paiement: { montant: amt } }, tenant, 'paiement') } catch {}
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè peman.'),
  })

  return (
    <Modal onClose={onClose} title={`💳 Peman — ${pre.numeroPre}`} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: D.goldBtn, borderRadius: 12, padding: '12px 14px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, margin: '0 0 2px' }}>{pre.clientNom}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '0 0 2px' }}>To: {pre.tauxInteret}% / mwa</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, margin: 0 }}>{fmt(pre.montant)} HTG</p>
          </div>
        </div>

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

        <div>
          <label style={{ ...labelStyle, color: D.green }}>Montan Peman (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize: 26, fontWeight: 800, textAlign: 'center', borderColor: `${D.green}50`, color: D.green }}
            value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus />
        </div>

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

        {amt > 0 && (
          <div style={{ background: D.greenBg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${D.green}25` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: D.green }}>Rete apre:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: resteAPayer - amt <= 0 ? D.gold : D.green }}>
                {fmt(Math.max(0, resteAPayer - amt))} HTG {resteAPayer - amt <= 0 && '🎉'}
              </span>
            </div>
          </div>
        )}

        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Metod</label>
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
          <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Anile</button>
          <button className="ke-btn"
            onClick={() => mutation.mutate({ montant: amt, method: form.method, reference: form.reference || undefined })}
            disabled={mutation.isPending || amt <= 0}
            style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: mutation.isPending || amt <= 0 ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${D.green},${D.green}bb)`, color: '#fff', fontWeight: 800, fontSize: 14, opacity: mutation.isPending || amt <= 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {mutation.isPending ? <><Spinner /> Ap anrejistre...</> : <><ArrowDownCircle size={15} /> Konfime Peman</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: ENJEKTE KAPITAL
// ═══════════════════════════════════════════════════════════════
function ModalKapital({ onClose, onSuccess }) {
  const [form, setForm] = useState({ montant: '', notes: '' })
  const amt = Number(form.montant || 0)

  const mutation = useMutation({
    mutationFn: (d) => preAPI.enjekteKapital(d),
    onSuccess: (res) => {
      toast.success(`✅ ${fmt(amt)} HTG enjekte! Disponib: ${fmt(res.data.kapitalDisponib)} HTG`)
      onSuccess(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè enjeksyon.'),
  })

  return (
    <Modal onClose={onClose} title="💼 Enjekte Kapital" width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: `${D.purple}10`, border: `1px solid ${D.purple}25`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PiggyBank size={16} style={{ color: D.purple, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: D.purple, margin: 0 }}>Lajan ou enjekte a ap disponib pou kesye yo ka prète kliyan.</p>
        </div>
        <div>
          <label style={{ ...labelStyle, color: D.purple }}>Montan (HTG) *</label>
          <input type="number" min="0.01" step="0.01" className="ke-input"
            style={{ ...inputStyle, fontSize: 26, fontWeight: 800, textAlign: 'center', color: D.purple, borderColor: `${D.purple}50` }}
            value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
            placeholder="0.00" onFocus={e => e.target.select()} autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Nòt (opsyonèl)</label>
          <input className="ke-input" style={inputStyle}
            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Sous lajan, rezon..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Anile</button>
          <button className="ke-btn" onClick={() => mutation.mutate({ montant: amt, notes: form.notes || undefined })}
            disabled={mutation.isPending || amt <= 0}
            style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: mutation.isPending || amt <= 0 ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${D.purple},${D.purple}bb)`, color: '#fff', fontWeight: 800, fontSize: 14, opacity: mutation.isPending || amt <= 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {mutation.isPending ? <><Spinner /> Ap enjekte...</> : <><PiggyBank size={15} /> Konfime Enjeksyon</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: RAPO KESYE — Fèmen Kès
// ═══════════════════════════════════════════════════════════════
function ModalRapoKesye({ onClose, onKesFemen }) {
  const [rapo, setRapo] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFemen = async () => {
    setLoading(true)
    try {
      const res = await preAPI.femenKes({ notes: notes || undefined })
      setRapo(res.data.rapo)
      toast.success('✅ Kès fèmen avèk siksè!')
      onKesFemen() // ✅ Avize paj prensipal la kès fèmen
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erè fèmen kès.')
    } finally { setLoading(false) }
  }

  return (
    <Modal onClose={onClose} title="📊 Fèmen Kès — Rapo Kesye" width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!rapo ? (
          <>
            <div style={{ background: `${D.orange}10`, border: `1px solid ${D.orange}25`, borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: D.orange, margin: 0 }}>
                ⚠️ Apre ou fèmen kès la, ou p ap ka fè okenn tranzaksyon pou rès jounen an.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Nòt (opsyonèl)</label>
              <textarea className="ke-input" style={{ ...inputStyle, height: 60, resize: 'vertical' }}
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Obsèvasyon, pwoblèm..." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Anile</button>
              <button className="ke-btn" onClick={handleFemen} disabled={loading}
                style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${D.orange},${D.orange}bb)`, color: '#fff', fontWeight: 800, fontSize: 14, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {loading ? <><Spinner /> Ap jenere...</> : <><FileText size={15} /> Fèmen Kès</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: D.greenBg, border: `1px solid ${D.green}30`, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
              <CheckCircle size={28} style={{ color: D.green, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: D.green, margin: '0 0 4px' }}>Kès Fèmen ✅</p>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{rapo.date}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Prè Kreye',   val: rapo.totalPreKreye,                     color: D.gold,   suffix: 'prè' },
                { label: 'Dekèsman',    val: `${fmt(rapo.montantDeseman)} HTG`,       color: D.orange, suffix: '' },
                { label: 'Koleksyon',   val: `${fmt(rapo.totalKoleksyon)} HTG`,       color: D.green,  suffix: '' },
                { label: 'Enterè',      val: `${fmt(rapo.totalEntere)} HTG`,          color: D.purple, suffix: '' },
              ].map(item => (
                <div key={item.label} style={{ background: `${item.color}10`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${item.color}20` }}>
                  <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</p>
                  <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: item.color, margin: 0 }}>{item.val} {item.suffix}</p>
                </div>
              ))}
            </div>
            <div style={{ background: `${D.red}10`, border: `1px solid ${D.red}25`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={14} style={{ color: D.red, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: D.red, margin: 0, fontWeight: 600 }}>Kès fèmen — Okenn tranzaksyon p ap posib pou rès jounen an.</p>
            </div>
            <button className="ke-btn" onClick={onClose}
              style={{ padding: '13px', borderRadius: 12, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Fèmen
            </button>
          </>
        )}
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
    queryFn: () => preAPI.getOne(preId).then(r => { setEcheances(r.data.echeances || []); return r.data.pre })
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
        <div style={{ background: D.goldBtn, borderRadius: 14, padding: '14px 16px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 3px' }}>{pre.clientNom}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
            {pre.clientPhone   && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>📱 {pre.clientPhone}</p>}
            {pre.clientNifCin  && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>ID: {pre.clientNifCin}</p>}
            {pre.kontKaneEpayId && <p style={{ fontSize: 10, opacity: 0.8, margin: '2px 0 0', fontWeight: 700 }}>🔗 Kont Kanè Epay lye</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatutBadge statut={pre.statut} />
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, margin: '6px 0 0' }}>{fmt(pre.montant)} HTG</p>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '1px 0 0' }}>{pre.tauxInteret}% / mwa • {pre.dureeEnMois} mwa</p>
          </div>
        </div>

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

        <div className="pre-detail-grid">
          {[
            { label: 'Kapital',    val: `${fmt(pre.montant)} HTG`,                                          color: D.gold   },
            { label: 'To Enterè', val: `${pre.tauxInteret}% / mwa`,                                        color: D.orange },
            { label: 'Dire',      val: `${pre.dureeEnMois} mwa`,                                           color: D.blue   },
            { label: 'Total Dwe', val: `${fmt(pre.totalDu)} HTG`,                                          color: D.red    },
            { label: 'Total Peye',val: `${fmt(pre.totalPaye || 0)} HTG`,                                   color: D.green  },
            { label: 'Frekans',   val: PERIODES.find(p => p.value === pre.periode)?.label || pre.periode,  color: D.purple },
          ].map(item => (
            <div key={item.label} style={{ background: `${item.color}0f`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${item.color}20` }}>
              <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: item.color, margin: 0 }}>{item.val}</p>
            </div>
          ))}
        </div>

        {Number(pre.montantBloke) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: `${D.purple}10`, borderRadius: 10, border: `1px solid ${D.purple}25` }}>
            <ShieldCheck size={14} style={{ color: D.purple, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: D.purple, margin: 0 }}>Depozit bloke: <strong>{fmt(pre.montantBloke)} HTG</strong></p>
          </div>
        )}

        {pre.notes && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${D.cardBorder}` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Nòt</p>
            <p style={{ fontSize: 13, color: D.text, margin: 0 }}>{pre.notes}</p>
          </div>
        )}

        {pre.statut !== 'cloture' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ke-btn" onClick={onPaieman}
              style={{ flex: 2, padding: '11px', borderRadius: 10, border: `1px solid ${D.green}30`, background: D.greenBg, color: D.green, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ArrowDownCircle size={14} /> Anrejistre Peman
            </button>
            <button className="ke-btn" onClick={() => printer.printPre(pre, tenant, 'ouverture')}
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

        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: D.muted, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Istwa Peman ({pre.paiements?.length || 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {!pre.paiements?.length
              ? <p style={{ textAlign: 'center', color: D.muted, fontSize: 12, padding: 20 }}>Pa gen peman toujou</p>
              : pre.paiements.map(px => (
                <div key={px.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10, background: D.greenBg, border: `1px solid ${D.green}20` }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${D.green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowDownCircle size={13} style={{ color: D.green }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: D.green }}>Peman</span>
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
// PAGE PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function PrePage() {
  const qc      = useQueryClient()
  const printer = usePrinter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selPre,          setSelPre]          = useState(null)
  const [filterStatut,    setFilterStatut]    = useState(null)
  // ✅ State pou blokaj kès fèmen
  const [kesFemen,        setKesFemen]        = useState(false)
  const searchTimeout = useRef(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = SHARED_STYLES + PRE_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  // ✅ Verifye si kès deja fèmen jodi a lè paj la chaje
  useEffect(() => {
    preAPI.checkKesFemen()
      .then(r => setKesFemen(r.data.kesFemen === true))
      .catch(() => {}) // silans si route pa disponib toujou
  }, [])

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['pre-stats'],
    queryFn: () => preAPI.getStats().then(r => r.data.stats),
    refetchInterval: 30000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['pre-list', debouncedSearch, page, filterStatut],
    queryFn: () => preAPI.getAll({ search: debouncedSearch || undefined, page, limit: 15, ...(filterStatut && { statut: filterStatut }) }).then(r => r.data),
    keepPreviousData: true,
  })

  const prets      = listData?.prets   || []
  const total      = listData?.total   || 0
  const totalPages = Math.ceil(total / 15) || 1

  const refresh = () => { qc.invalidateQueries(['pre-list']); qc.invalidateQueries(['pre-stats']); if (selPre) qc.invalidateQueries(['pre-one', selPre.id]) }

  const openDetail  = (pre) => { setSelPre(pre); setModal('detail')  }
  const openPaieman = (pre) => { setSelPre(pre); setModal('paieman') }

  const handleSearch = (e) => {
    const val = e.target.value; setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'DM Sans, sans-serif', padding: '14px 14px 80px', maxWidth: 900, margin: '0 auto' }}>

      {/* ✅ Bannè kès fèmen */}
      {kesFemen && (
        <div style={{ background: `${D.red}15`, border: `1px solid ${D.red}40`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={16} style={{ color: D.red, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: D.red, margin: 0, fontWeight: 700 }}>
            Kès fèmen jodi a — Okenn nouvo tranzaksyon p ap aksepte jiskaske demen.
          </p>
        </div>
      )}

      {/* Header */}
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

          {/* Fèmen Kès — kache si deja fèmen */}
          {!kesFemen && (
            <button className="ke-btn" onClick={() => setModal('rapo')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 10, border: `1px solid ${D.orange}30`, background: `${D.orange}10`, color: D.orange, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              <FileText size={14} /> Fèmen Kès
            </button>
          )}

          {isAdmin && (
            <button className="ke-btn" onClick={() => setModal('kapital')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 10, border: `1px solid ${D.purple}30`, background: `${D.purple}10`, color: D.purple, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              <PiggyBank size={14} /> Kapital
            </button>
          )}

          {/* ✅ Bouton Nouvo Prè — bloke si kès fèmen */}
          <button className="ke-btn" onClick={() => !kesFemen && setModal('create')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 15px', borderRadius: 12, border: 'none', cursor: kesFemen ? 'not-allowed' : 'pointer', background: kesFemen ? 'rgba(255,255,255,0.08)' : D.goldBtn, color: kesFemen ? D.muted : '#0a1222', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', opacity: kesFemen ? 0.5 : 1 }}>
            {kesFemen ? <Lock size={15} /> : <Plus size={15} />}
            {kesFemen ? 'Kès Fèmen' : 'Nouvo Prè'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ke-stats-grid">
        <StatCard label="Total Prè"  value={statsData?.totalPrets    || 0}              icon={<Users size={17}/>}       color={D.gold}  />
        <StatCard label="Prè Aktif"  value={statsData?.pretsActifs   || 0}              icon={<Activity size={17}/>}    color={D.green} />
        <StatCard label="Pòtfèy"     value={`${fmt(statsData?.totalPortfeuye || 0)} G`} icon={<Wallet size={17}/>}      color={D.blue}  />
        <StatCard label="An Reta"    value={statsData?.totalEnReta   || 0}              icon={<AlertCircle size={17}/>} color={D.red}   />
      </div>

      {isAdmin && (
        <div style={{ background: D.card, borderRadius: 12, padding: '12px 16px', border: `1px solid ${D.purple}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PiggyBank size={16} style={{ color: D.purple }} />
            <span style={{ fontSize: 12, color: D.muted, fontWeight: 600 }}>Kapital disponib pou prète:</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: D.purple }}>
            {fmt(statsData?.kapitalDisponib || 0)} HTG
          </span>
        </div>
      )}

      {/* Aktivite mwa a */}
      <div style={{ background: D.card, borderRadius: 14, padding: '12px 14px', border: `1px solid ${D.cardBorder}` }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: D.gold, margin: '0 0 10px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.green, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Aktivite Mwa a
        </p>
        <div className="ke-today-grid">
          {/* ✅ Dekèsman (olye Desèman) */}
          <StatCard label="Dekèsman Mwa a"  value={`${fmt(statsData?.totalDesèmanMwa || 0)} G`} icon={<ArrowDownCircle size={17}/>} color={D.orange} highlight />
          <StatCard label="Koleksyon Mwa a" value={`${fmt(statsData?.totalPaiemanMwa || 0)} G`} icon={<TrendingUp size={17}/>}      color={D.green}  highlight />
          <StatCard label="Enterè Kolekte"  value={`${fmt(statsData?.enterèMwa       || 0)} G`} icon={<Percent size={17}/>}         color={D.purple} highlight />
        </div>
      </div>

      {/* Rechèch + Filtre */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted, pointerEvents: 'none' }} />
          <input className="ke-input" style={{ ...inputStyle, paddingLeft: 36 }}
            placeholder="Chèche non, nimewo prè..." value={search} onChange={handleSearch} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { val: null,      label: 'Tout'      },
            { val: 'actif',   label: '✅ Aktif'   },
            { val: 'reta',    label: '🔴 An Reta' },
            { val: 'cloture', label: '⚫ Klotire' },
          ].map(f => (
            <button key={String(f.val)} className="ke-tab-btn ke-btn"
              onClick={() => { setFilterStatut(f.val); setPage(1) }}
              style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1px solid ${filterStatut === f.val ? D.gold + '60' : D.cardBorder}`, background: filterStatut === f.val ? D.goldDim : 'transparent', color: filterStatut === f.val ? D.gold : D.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lis prè */}
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
                <div key={pre.id} className="pre-row" onClick={() => openDetail(pre)} style={{ background: D.card, border: `1px solid ${pre.statut === 'reta' ? D.red + '30' : D.cardBorder}`, borderRadius: 14, padding: '12px 13px', cursor: 'pointer', boxShadow: D.shadow, transition: 'background 0.15s', animation: 'fadeUp 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: D.goldDim, border: `1px solid ${D.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: D.gold }}>
                        {pre.clientNom?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold, fontSize: 11, margin: 0 }}>{pre.numeroPre}</p>
                          {pre.kontKaneEpayId && <span style={{ fontSize: 9, color: D.green, fontWeight: 700, background: D.greenBg, padding: '1px 6px', borderRadius: 4 }}>🔗 Kanè Epay</span>}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pre.clientNom}</p>
                        {pre.clientPhone && <p style={{ fontSize: 11, color: D.muted, margin: '1px 0 0' }}>{pre.clientPhone}</p>}
                        <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>{fmtShort(pre.createdAt)} • {pre.tauxInteret}% / mwa • {pre.dureeEnMois} mwa</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, color: D.gold, margin: 0 }}>{fmt(pre.montant)}</p>
                      <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 3px' }}>HTG</p>
                      <StatutBadge statut={pre.statut} />
                      {Number(pre.montantBloke) > 0 && <p style={{ fontSize: 9, color: D.purple, margin: '3px 0 0', fontWeight: 700 }}>🔒 {fmt(pre.montantBloke)}</p>}
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${pctPaye}%`, background: pctPaye >= 100 ? D.gold : cfg.color, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: D.muted }}>
                      <span style={{ color: D.green }}>Peye: {fmt(pre.totalPaye || 0)} HTG</span>
                      <span style={{ fontWeight: 700, color: D.text }}>{Math.round(pctPaye)}%</span>
                      <span style={{ color: resteAPayer > 0 ? cfg.color : D.green }}>{resteAPayer > 0 ? `Rete: ${fmt(resteAPayer)} HTG` : '✅ Konplè'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid rgba(201,168,76,0.1)` }}>
                    {pre.statut !== 'cloture' && (
                      <button className="ke-btn" onClick={e => { e.stopPropagation(); openPaieman(pre) }}
                        style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none', background: kesFemen ? 'rgba(255,255,255,0.05)' : D.greenBg, color: kesFemen ? D.muted : D.green, cursor: kesFemen ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {kesFemen ? <Lock size={12} /> : <ArrowDownCircle size={13} />} Peman
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

      {/* Pagination */}
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

      {/* Modals */}
      {modal === 'create'  && <ModalCreePre   onClose={() => setModal(null)} onSuccess={refresh} printer={printer} kesFemen={kesFemen} />}
      {modal === 'kapital' && <ModalKapital   onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal === 'rapo'    && <ModalRapoKesye onClose={() => setModal(null)} onKesFemen={() => setKesFemen(true)} />}
      {modal === 'detail'  && selPre && <ModalDetailPre preId={selPre.id} onClose={() => setModal(null)} onPaieman={() => setModal('paieman')} printer={printer} />}
      {modal === 'paieman' && selPre && <ModalPaieman   pre={selPre} onClose={() => setModal(null)} onSuccess={refresh} printer={printer} kesFemen={kesFemen} />}
    </div>
  )
}