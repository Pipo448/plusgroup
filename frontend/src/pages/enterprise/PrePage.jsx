// src/pages/enterprise/PrePage.jsx — V5
// Nouvo: Avalize x2, Garanti/Byens, Printer 57mm/80mm, Resi detaye avèk kalandriye + siyati
import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Search, Eye, X, Printer, ChevronLeft, ChevronRight,
  Users, Wallet, TrendingUp, Activity, AlertCircle, RefreshCw,
  CheckCircle, Clock, XCircle, DollarSign, Percent, ArrowDownCircle,
  ShieldCheck, PiggyBank, FileText, Lock, ChevronDown, ChevronUp,
  UserPlus, Home, Bluetooth, BluetoothOff,
} from 'lucide-react'
import { connectPrinter, disconnectPrinter, isPrinterConnected, printPreReceipt } from '../../services/printerService'
import { D, fmt, fmtDate, fmtShort, PAYMENT_METHODS, inputStyle, labelStyle, SHARED_STYLES } from './kaneShared.jsx'

// ─── API ─────────────────────────────────────────────────────
const preAPI = {
  getStats:       ()         => api.get('/pre/stats'),
  getAll:         (p)        => api.get('/pre', { params: p }),
  getOne:         (id)       => api.get(`/pre/${id}`),
  create:         (data)     => api.post('/pre', data),
  paiement:       (id, data) => api.post(`/pre/${id}/paiement`, data),
  cloture:        (id)       => api.post(`/pre/${id}/cloture`),
  echeances:      (id)       => api.get(`/pre/${id}/echeances`),
  kaneSearch:     (q)        => api.get('/pre/kane-epay-search', { params: { q } }),
  enjekteKapital: (data)     => api.post('/pre/kapital/enjekte', data),
  femenKes:       (data)     => api.post('/pre/rapo/femen-kes', data),
  checkKesFemen:  ()         => api.get('/pre/rapo/kes-status'),
}

// ─── Constants ───────────────────────────────────────────────
const STATUTS = {
  actif:   { label: 'Aktif',   color: D.green,  bg: D.greenBg,               icon: <CheckCircle size={11}/> },
  reta:    { label: 'An Reta', color: D.red,    bg: D.redBg,                 icon: <AlertCircle size={11}/> },
  attente: { label: 'Antant',  color: D.orange, bg: D.orangeBg,              icon: <Clock size={11}/> },
  cloture: { label: 'Klotire', color: D.muted,  bg: 'rgba(107,122,153,0.1)', icon: <XCircle size={11}/> },
}

const STATUT_ECH = {
  paye:    { label: 'Peye',   color: D.green,  bg: D.greenBg,               icon: <CheckCircle size={10}/> },
  partiel: { label: 'Pasyèl', color: D.orange, bg: D.orangeBg,              icon: <Clock size={10}/> },
  reta:    { label: 'Reta',   color: D.red,    bg: D.redBg,                 icon: <AlertCircle size={10}/> },
  attente: { label: 'Antant', color: D.muted,  bg: 'rgba(107,122,153,0.1)', icon: <Clock size={10}/> },
}

const PERIODES = [
  { value: 'jounal',    label: 'Chak Jou' },
  { value: 'semaine',   label: 'Semèn'    },
  { value: 'biweekly',  label: '2 Semèn'  },
  { value: 'mois',      label: 'Mwa'      },
  { value: 'trimestre', label: 'Trimès'   },
]

// ─── Kalkil declining balance preview ───────────────────────
function calcPreviewEcheances(kapital, tauxMwa, nbrPeman, frekans) {
  const r = tauxMwa / 100
  const tauxP = (() => {
    switch (frekans) {
      case 'jounal':    return Math.pow(1 + r, 1/30)  - 1
      case 'semaine':   return Math.pow(1 + r, 7/30)  - 1
      case 'biweekly':  return Math.pow(1 + r, 14/30) - 1
      case 'mois':      return r
      case 'trimestre': return Math.pow(1 + r, 3)     - 1
      default:          return r
    }
  })()
  if (!kapital || !tauxMwa || !nbrPeman) return { pmt: 0, totalDu: 0, totalInteret: 0 }
  const pmt = tauxP === 0 ? kapital / nbrPeman
    : kapital * tauxP / (1 - Math.pow(1 + tauxP, -nbrPeman))
  const totalDu      = Math.round(pmt * nbrPeman * 100) / 100
  const totalInteret = Math.round((totalDu - kapital) * 100) / 100
  return { pmt: Math.round(pmt * 100) / 100, totalDu, totalInteret }
}

function calcNbrPeman(dureeEnMois, frekans) {
  switch (frekans) {
    case 'jounal':    return Math.round(dureeEnMois * 30)
    case 'semaine':   return Math.round(dureeEnMois * 4.33)
    case 'biweekly':  return Math.round(dureeEnMois * 2.17)
    case 'mois':      return dureeEnMois
    case 'trimestre': return Math.ceil(dureeEnMois / 3)
    default:          return dureeEnMois
  }
}

// ─── STYLES ──────────────────────────────────────────────────
const PRE_STYLES = `
  .pre-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pre-row:hover   { background: rgba(201,168,76,0.06) !important; }
  .pre-badge       { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .pre-kane-item:hover { background: rgba(201,168,76,0.08) !important; }
  .pre-ech-row:hover   { background: rgba(255,255,255,0.03) !important; }
  @media (min-width: 600px) { .pre-detail-grid { grid-template-columns: repeat(3, 1fr); } }
`

// ─── Enpresyon Resi (57mm oswa 80mm) ─────────────────────────
function genHtmlResi({ pre, echeances = [], tenant, type = 'ouverture', paiement = null, largeur = 80 }) {
  const biz   = tenant?.businessName || tenant?.name || 'PLUS GROUP'
  const tel   = tenant?.phone || ''
  const w     = largeur === 57 ? '57mm' : '80mm'
  const fs    = largeur === 57 ? '8px'  : '10px'
  const fsBig = largeur === 57 ? '11px' : '13px'

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'short', year:'numeric' }) : ''

  const ligneSignature = (label) => `
    <div style="margin-top:8px">
      <div style="font-size:${fs};color:#555;margin-bottom:2px">${label}:</div>
      <div style="border-bottom:1px solid #333;height:20px;margin-bottom:2px"></div>
      <div style="font-size:${fs};color:#555">Non & Siyati</div>
    </div>`

  // Tablo kalandriye pou resi ouverture
  let echeancierHtml = ''
  if (type === 'ouverture' && echeances.length > 0) {
    const lignes = echeances.map(e => `
      <tr>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs}">${e.numero}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs}">${fmtD(e.dat_limit || e.datLimit)}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs};text-align:right">${fmt(e.montant_capital || e.montantCapital)}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs};text-align:right">${fmt(e.montant_interet || e.montantInteret)}</td>
        <td style="padding:2px 3px;border-bottom:1px solid #eee;font-size:${fs};text-align:right;font-weight:700">${fmt(e.montant_total || e.montantTotal)}</td>
      </tr>`).join('')

    echeancierHtml = `
      <div style="border-top:1px dashed #aaa;margin:6px 0;padding-top:5px">
        <div style="font-weight:800;font-size:${fs};margin-bottom:4px;text-align:center">KALANDRIYE REMBOURSEMAN</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:2px 3px;font-size:${fs};text-align:left">#</th>
              <th style="padding:2px 3px;font-size:${fs};text-align:left">Dat</th>
              <th style="padding:2px 3px;font-size:${fs};text-align:right">Kapital</th>
              <th style="padding:2px 3px;font-size:${fs};text-align:right">Enterè</th>
              <th style="padding:2px 3px;font-size:${fs};text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${lignes}</tbody>
          <tfoot>
            <tr style="background:#f5f5f5;font-weight:800">
              <td colspan="2" style="padding:2px 3px;font-size:${fs}">TOTAL</td>
              <td style="padding:2px 3px;font-size:${fs};text-align:right">${fmt(echeances.reduce((s,e)=>s+Number(e.montant_capital||e.montantCapital||0),0))}</td>
              <td style="padding:2px 3px;font-size:${fs};text-align:right">${fmt(echeances.reduce((s,e)=>s+Number(e.montant_interet||e.montantInteret||0),0))}</td>
              <td style="padding:2px 3px;font-size:${fs};text-align:right">${fmt(echeances.reduce((s,e)=>s+Number(e.montant_total||e.montantTotal||0),0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>`
  }

  // Avalize siyati
  let avalizelHtml = ''
  if (type === 'ouverture') {
    if (pre.avalize1Nom) avalizelHtml += ligneSignature(`Avalize 1: ${pre.avalize1Nom}`)
    if (pre.avalize2Nom) avalizelHtml += ligneSignature(`Avalize 2: ${pre.avalize2Nom}`)
  }

  const html = `
    <div style="width:${w};padding:4mm 3mm;font-family:'Courier New',monospace;font-size:${fs};line-height:1.5;color:#1a1a1a">
      <div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:5px;margin-bottom:6px">
        <div style="font-family:Arial;font-weight:900;font-size:${fsBig}">${biz}</div>
        <div style="font-family:Arial;font-size:${fs};color:#444">-- MIKWO KREDI --</div>
        ${tel ? `<div style="font-size:${fs};color:#666">Tel: ${tel}</div>` : ''}
      </div>

      <div style="text-align:center;font-weight:800;font-size:${fsBig};border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:6px">
        ${type === 'ouverture' ? 'KONTRA PRÈ' : type === 'paiement' ? 'RESI PEMAN' : 'KLOTIRE PRÈ'}
      </div>

      <div style="font-size:${fs};margin-bottom:5px">
        <div style="display:flex;justify-content:space-between"><span>No. Prè:</span><b>${pre.numeroPre||''}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Kliyan:</span><b>${pre.clientNom||''}</b></div>
        ${pre.clientPhone ? `<div style="display:flex;justify-content:space-between"><span>Tel:</span><span>${pre.clientPhone}</span></div>` : ''}
        ${pre.clientNifCin ? `<div style="display:flex;justify-content:space-between"><span>CIN/NIF:</span><span>${pre.clientNifCin}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between"><span>Dat:</span><span>${fmtD(new Date())}</span></div>
      </div>

      <div style="border-top:1px dashed #aaa;border-bottom:1px dashed #aaa;padding:5px 0;margin:5px 0;font-size:${fs}">
        <div style="display:flex;justify-content:space-between"><span>Kapital:</span><b>${fmt(pre.montant)} HTG</b></div>
        <div style="display:flex;justify-content:space-between"><span>To enterè:</span><b>${pre.tauxInteret}% / mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span>Dire:</span><b>${pre.dureeEnMois} mwa</b></div>
        <div style="display:flex;justify-content:space-between"><span>Frekans:</span><b>${PERIODES.find(p=>p.value===pre.periode)?.label||pre.periode}</b></div>
        ${pre.garantiByens ? `<div style="display:flex;justify-content:space-between"><span>Garanti:</span><b>${pre.garantiByens}</b></div>` : ''}
        ${Number(pre.montantBloke)>0 ? `<div style="display:flex;justify-content:space-between"><span>Depozit:</span><b>${fmt(pre.montantBloke)} HTG</b></div>` : ''}
        <div style="border-top:1px solid #ccc;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between">
          <b>Total dwe:</b><b style="color:#dc2626">${fmt(pre.totalDu)} HTG</b>
        </div>
        ${type==='paiement'&&paiement ? `<div style="display:flex;justify-content:space-between;margin-top:3px"><span>Peman:</span><b style="color:#16a34a">${fmt(paiement.montant)} HTG</b></div>` : ''}
        ${type==='paiement'&&paiement ? `<div style="display:flex;justify-content:space-between"><span>Rete:</span><b>${fmt(Number(pre.totalDu)-Number(pre.totalPaye))} HTG</b></div>` : ''}
      </div>

      ${echeancierHtml}

      ${type === 'ouverture' ? `
      <div style="border-top:1px dashed #aaa;margin-top:8px;padding-top:6px">
        <div style="font-size:${fs};font-weight:800;text-align:center;margin-bottom:6px">SIYATI</div>
        ${ligneSignature('Emprunteur / Kliyan')}
        ${avalizelHtml}
        ${ligneSignature('Responsab Kredi')}
      </div>` : ''}

      <div style="text-align:center;font-size:${fs};border-top:1px dashed #ccc;margin-top:8px;padding-top:5px">
        <b>Mèsi! / Merci!</b><br/>
        <span style="color:#666;font-size:${fs}">${biz}${tel ? ` — ${tel}` : ''}</span>
      </div>
    </div>`

  return html
}

function ouvrirFenetreImpresyon(html) {
  const w = window.open('', '_blank', 'width=380,height=700')
  if (!w) { toast.error('Pemit popup pou sit sa.'); return }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resi</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:0;background:#fff}
    @media print{@page{margin:0;size:auto}body{margin:0}}</style>
    </head><body>${html}</body></html>`)
  w.document.close()
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => w.close(), 2500) }, 400)
}

// ─── usePrinter — menm jan ak KaneEpayPage ───────────────────
function usePrinter() {
  const [connected,  setConnected]  = useState(isPrinterConnected())
  const [connecting, setConnecting] = useState(false)
  const [printing,   setPrinting]   = useState(false)
  const [largeur,    setLargeur]    = useState(80)

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

  const printPre = useCallback(async ({ pre, echeances = [], tenant, type = 'ouverture', paiement = null }) => {
    if (isPrinterConnected()) {
      setPrinting(true)
      try {
        await printPreReceipt(pre, echeances, tenant, type, paiement, largeur)
        toast.success('Resi enprime! 🖨️')
        return true
      } catch (err) {
        setConnected(false)
        toast.error('Erè printer: ' + (err.message || ''))
        return false
      } finally { setPrinting(false) }
    }
    // Fallback HTML si pa konekte
    const html = genHtmlResi({ pre, echeances, tenant, type, paiement, largeur })
    ouvrirFenetreImpresyon(html)
    return true
  }, [largeur])

  return { connected, connecting, printing, connect, disconnect, printPre, largeur, setLargeur }
}

// ─── UI Atoms ────────────────────────────────────────────────
function Spinner({ size = 14, color = '#fff' }) {
  return <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

function StatCard({ label, value, sub, icon, color, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}15` : D.card, borderRadius: 12, padding: '12px 14px', border: `1px solid ${highlight ? color+'40' : D.cardBorder}`, boxShadow: D.shadow, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: D.muted, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: highlight ? color : D.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
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

// ─── Kalandriye Peman (kolapsib) ─────────────────────────────
function KalandriyeSection({ preId }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['pre-echeances', preId],
    queryFn:  () => preAPI.echeances(preId).then(r => r.data.echeances || []),
    enabled:  open && !!preId,
  })
  const echeances       = data || []
  const totalReta       = echeances.filter(e => e.statut === 'reta' || e.statut === 'partiel').length
  const totalPaye       = echeances.filter(e => e.statut === 'paye').length
  const pct             = echeances.length ? Math.round((totalPaye / echeances.length) * 100) : 0
  const interetKouruTot = echeances.reduce((s, e) => s + Number(e.interet_kouru || 0), 0)
  const prochèn         = echeances.find(e => e.statut !== 'paye')

  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${D.gold}08`, border: `1px solid ${D.gold}25`, borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={14} style={{ color: D.gold }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: D.gold }}>Kalandriye Peman</span>
          {echeances.length > 0 && <span style={{ fontSize: 10, color: D.muted }}>({echeances.length} echeans)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalReta > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: D.red, background: D.redBg, padding: '2px 8px', borderRadius: 4 }}>{totalReta} reta</span>}
          {echeances.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: D.green }}>{pct}%</span>}
          {open ? <ChevronUp size={13} style={{ color: D.muted }} /> : <ChevronDown size={13} style={{ color: D.muted }} />}
        </div>
      </button>

      {open && (
        <div style={{ border: `1px solid ${D.gold}25`, borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Spinner color={D.gold} size={14} /> Ap chaje...
            </div>
          ) : echeances.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: D.muted, fontSize: 12 }}>Pa gen kalandriye disponib</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: D.cardBorder }}>
                {[
                  { label: 'Peye',       val: totalPaye,                      color: D.green  },
                  { label: 'Reta',       val: totalReta,                      color: D.red    },
                  { label: 'Antant',     val: echeances.length-totalPaye-totalReta, color: D.muted },
                  { label: 'Int. Kouru', val: `${fmt(interetKouruTot)} G`,   color: D.orange },
                ].map(item => (
                  <div key={item.label} style={{ background: D.card, padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>{item.label}</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: item.color, margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>

              {prochèn && (
                <div style={{ padding: '10px 14px', background: `${D.blue}08`, borderBottom: `1px solid ${D.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Pwochen Peman</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: prochèn.statut === 'reta' ? D.red : D.text, margin: 0 }}>
                      #{prochèn.numero} — {new Date(prochèn.dat_limit).toLocaleDateString('fr-HT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {prochèn.statut === 'reta' && <p style={{ fontSize: 10, color: D.red, margin: '2px 0 0' }}>⚠️ {prochèn.jou_reta} jou reta</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: prochèn.statut === 'reta' ? D.red : D.blue, margin: 0 }}>
                      {fmt(Number(prochèn.montant_total) + Number(prochèn.interet_kouru || 0) - Number(prochèn.montant_paye || 0))} HTG
                    </p>
                    {Number(prochèn.interet_kouru) > 0 && <p style={{ fontSize: 10, color: D.red, margin: '2px 0 0' }}>Dont {fmt(prochèn.interet_kouru)} HTG enterè kouru</p>}
                  </div>
                </div>
              )}

              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 90px 1fr 70px 70px 65px', gap: 4, padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${D.cardBorder}`, position: 'sticky', top: 0 }}>
                  {['#', 'Dat Limit', 'Balans', 'Capital', 'Enterè', 'Estati'].map(h => (
                    <span key={h} style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', fontWeight: 700 }}>{h}</span>
                  ))}
                </div>
                {echeances.map(e => {
                  const cfg = STATUT_ECH[e.statut] || STATUT_ECH.attente
                  const ik  = Number(e.interet_kouru || 0)
                  const mp  = Number(e.montant_paye  || 0)
                  const reste = Number(e.montant_total) + ik - mp
                  const isReta = e.statut === 'reta' || e.statut === 'partiel'
                  return (
                    <div key={e.id} className="pre-ech-row" style={{ display: 'grid', gridTemplateColumns: '28px 90px 1fr 70px 70px 65px', gap: 4, padding: '7px 12px', borderBottom: `1px solid ${D.cardBorder}`, background: isReta ? `${D.red}05` : 'transparent', transition: 'background 0.1s' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, alignSelf: 'center' }}>{e.numero}</span>
                      <div style={{ alignSelf: 'center' }}>
                        <p style={{ fontSize: 11, color: isReta ? D.red : D.text, margin: 0, fontWeight: isReta ? 700 : 400 }}>
                          {new Date(e.dat_limit).toLocaleDateString('fr-HT', { day: '2-digit', month: 'short' })}
                        </p>
                        {ik > 0 && <p style={{ fontSize: 9, color: D.red, margin: '1px 0 0' }}>+{fmt(ik)} ({e.jou_reta}j)</p>}
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.muted, alignSelf: 'center' }}>{fmt(e.balans_avant)}</span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.gold, alignSelf: 'center' }}>{fmt(e.montant_capital)}</span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.orange, alignSelf: 'center' }}>{fmt(e.montant_interet)}</span>
                      <div style={{ alignSelf: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {mp > 0 && e.statut !== 'paye' && <p style={{ fontSize: 9, color: D.green, margin: '2px 0 0' }}>Peye: {fmt(mp)}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '28px 90px 1fr 70px 70px 65px', gap: 4, padding: '7px 12px', background: 'rgba(255,255,255,0.03)', borderTop: `1px solid ${D.cardBorder}` }}>
                <span /><span style={{ fontSize: 10, fontWeight: 700, color: D.muted }}>TOTAL</span><span />
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.gold }}>{fmt(echeances.reduce((s,e)=>s+Number(e.montant_capital),0))}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: D.orange }}>{fmt(echeances.reduce((s,e)=>s+Number(e.montant_interet),0))}</span>
                <span />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Chèche kont Kane Epay ────────────────────────────────────
function KaneEpaySearch({ onSelect, selected, onClear }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timeout = useRef(null)

  const handleSearch = (val) => {
    setQ(val); clearTimeout(timeout.current)
    if (val.length < 2) { setResults([]); return }
    timeout.current = setTimeout(async () => {
      setLoading(true)
      try { const res = await preAPI.kaneSearch(val); setResults(res.data.accounts || []) }
      catch { setResults([]) }
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
          <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>Pa jwenn kont pou "<strong style={{ color: D.text }}>{q}</strong>"</p>
        </div>
      )}
    </div>
  )
}

// ─── Champ Avalize ───────────────────────────────────────────
function AvalizelSection({ form, set }) {
  const [showAval2, setShowAval2] = useState(!!form.avalize2Nom)
  return (
    <Section icon="🤝" title="Avalize (Opsyonèl)">
      <p style={{ fontSize: 11, color: D.muted, margin: '0 0 10px' }}>Avalize yo siyen pou garanti prè a. Ajoute 1 oswa 2 selon bezwen.</p>

      {/* Avalize 1 */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...labelStyle, color: D.blue }}>Avalize 1</label>
        <div className="ke-form-row">
          <input className="ke-input" style={{ ...inputStyle, flex: 1 }}
            value={form.avalize1Nom || ''} onChange={e => set('avalize1Nom', e.target.value)}
            placeholder="Non konplè avalize 1..." />
          <input className="ke-input" style={{ ...inputStyle, flex: 1 }}
            value={form.avalize1Phone || ''} onChange={e => set('avalize1Phone', e.target.value)}
            placeholder="Telefòn..." />
        </div>
      </div>

      {/* Avalize 2 */}
      {!showAval2 ? (
        <button onClick={() => setShowAval2(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: `1px dashed ${D.cardBorder}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <UserPlus size={13} /> Ajoute Avalize 2 (opsyonèl)
        </button>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...labelStyle, color: D.blue, margin: 0 }}>Avalize 2</label>
            <button onClick={() => { setShowAval2(false); set('avalize2Nom', ''); set('avalize2Phone', '') }}
              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={11} />
            </button>
          </div>
          <div className="ke-form-row">
            <input className="ke-input" style={{ ...inputStyle, flex: 1 }}
              value={form.avalize2Nom || ''} onChange={e => set('avalize2Nom', e.target.value)}
              placeholder="Non konplè avalize 2..." />
            <input className="ke-input" style={{ ...inputStyle, flex: 1 }}
              value={form.avalize2Phone || ''} onChange={e => set('avalize2Phone', e.target.value)}
              placeholder="Telefòn..." />
          </div>
        </div>
      )}
    </Section>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: KREYE PRÈ — V5
// ═══════════════════════════════════════════════════════════════
function ModalCreePre({ onClose, onSuccess, printer, kesFemen }) {
  const { tenant } = useAuthStore()
  const [kaneKont, setKaneKont] = useState(null)
  const [form, setForm] = useState({
    montant: '', tauxInteret: '', dureeEnMois: '6',
    datDebut: new Date().toISOString().split('T')[0],
    periode: 'mois', montantBloke: '',
    method: 'cash', reference: '', notes: '',
    // Nouvo champs V5
    garantiByens: '',
    avalize1Nom: '', avalize1Phone: '',
    avalize2Nom: '', avalize2Phone: '',
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const kapital  = Number(form.montant || 0)
  const nbrPeman = calcNbrPeman(Number(form.dureeEnMois || 1), form.periode)
  const { pmt, totalDu, totalInteret } = calcPreviewEcheances(kapital, Number(form.tauxInteret || 0), nbrPeman, form.periode)

  if (kesFemen) return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={420}>
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <Lock size={40} style={{ color: D.red, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: D.red, margin: '0 0 8px' }}>Kès Fèmen</p>
        <p style={{ fontSize: 13, color: D.muted, margin: '0 0 20px' }}>Ou deja fèmen kès ou jodi a. Pa ka kreye nouvo prè.</p>
        <button className="ke-btn" onClick={onClose} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, cursor: 'pointer' }}>Konprann</button>
      </div>
    </Modal>
  )

  const validate = () => {
    const e = {}
    if (!kaneKont)         e.kane    = 'Chwazi yon kont Kanè Epay obligatwa'
    if (kapital <= 0)      e.montant = 'Montan dwe > 0'
    if (!form.tauxInteret) e.taux    = 'To enterè obligatwa'
    if (!form.dureeEnMois) e.duree   = 'Dire obligatwa'
    setErrors(e); return !Object.keys(e).length
  }

  const mutation = useMutation({
    mutationFn: (d) => preAPI.create(d),
    onSuccess: async (res) => {
      toast.success(`✅ Prè ${res.data.pre.numeroPre} kreye!`)
      onSuccess()
      // Enprime imedyatman avèk kalandriye
      try {
        printer.printPre({
          pre:       res.data.pre,
          echeances: res.data.echeances || [],
          tenant,
          type:      'ouverture',
        })
      } catch {}
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè kreyasyon prè.'),
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      clientNom:      `${kaneKont.firstName} ${kaneKont.lastName}`,
      clientPhone:    kaneKont.phone    || undefined,
      clientNifCin:   kaneKont.nifOrCin || undefined,
      kontKaneEpayId: kaneKont.id,
      montant:        kapital,
      tauxInteret:    Number(form.tauxInteret),
      dureeEnMois:    Number(form.dureeEnMois),
      montantBloke:   Number(form.montantBloke || 0),
      datDebut:       form.datDebut,
      periode:        form.periode,
      method:         form.method,
      reference:      form.reference  || undefined,
      notes:          form.notes      || undefined,
      garantiByens:   form.garantiByens || undefined,
      avalize1Nom:    form.avalize1Nom  || undefined,
      avalize1Phone:  form.avalize1Phone|| undefined,
      avalize2Nom:    form.avalize2Nom  || undefined,
      avalize2Phone:  form.avalize2Phone|| undefined,
    })
  }

  return (
    <Modal onClose={onClose} title="💸 Nouvo Prè" width={600}>

      {/* Kane Epay */}
      <Section icon="🔗" title="Kont Kanè Epay (Obligatwa)">
        <div style={{ marginBottom: 8, padding: '8px 12px', background: `${D.blue}10`, borderRadius: 8, border: `1px solid ${D.blue}25`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={13} style={{ color: D.blue, flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: D.blue, margin: 0 }}>Moun nan dwe gen yon kont Kanè Epay aktif pou li ka prete.</p>
        </div>
        <KaneEpaySearch selected={kaneKont} onSelect={setKaneKont} onClear={() => setKaneKont(null)} />
        {errors.kane && <p style={{ fontSize: 10, color: D.red, margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} /> {errors.kane}</p>}
      </Section>

      {/* Tèm finansye */}
      <Section icon="💰" title="Tèm Finansye">
        <label style={labelStyle}>Montan Kapital (HTG) *</label>
        <input type="number" min="0" step="0.01" className="ke-input"
          style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center', color: D.gold, marginBottom: 10, borderColor: errors.montant ? D.red : undefined }}
          value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="0.00" onFocus={e => e.target.select()} />
        {errors.montant && <p style={{ fontSize: 10, color: D.red, margin: '-6px 0 8px' }}>{errors.montant}</p>}

        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, color: D.orange }}>To Enterè (% / mwa) *</label>
            <div style={{ position: 'relative' }}>
              <input type="number" min="0" max="100" step="0.1" className="ke-input"
                style={{ ...inputStyle, color: D.orange, borderColor: errors.taux ? D.red : `${D.orange}40`, paddingRight: 52 }}
                value={form.tauxInteret} onChange={e => set('tauxInteret', e.target.value)} placeholder="ex: 3" onFocus={e => e.target.select()} />
              <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: D.orange, fontWeight: 700 }}>% / mwa</span>
            </div>
            {errors.taux && <p style={{ fontSize: 10, color: D.red, margin: '3px 0 0' }}>{errors.taux}</p>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, color: D.blue }}>Dire (mwa) *</label>
            <input type="number" min="1" max="120" className="ke-input"
              style={{ ...inputStyle, color: D.blue, borderColor: errors.duree ? D.red : `${D.blue}40` }}
              value={form.dureeEnMois} onChange={e => set('dureeEnMois', e.target.value)} onFocus={e => e.target.select()} />
          </div>
        </div>

        {/* Preview declining balance */}
        {kapital > 0 && form.tauxInteret && (
          <div style={{ marginTop: 12, background: D.card, borderRadius: 10, padding: '12px 14px', border: `1px solid ${D.cardBorder}` }}>
            <p style={{ fontSize: 10, color: D.muted, margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase' }}>Kalkil Declining Balance</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>Peman Fiks</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.blue, margin: 0 }}>{fmt(pmt)} G</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>Total Enterè</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.orange, margin: 0 }}>{fmt(totalInteret)} G</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase' }}>Total Dwe</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: D.green, margin: 0 }}>{fmt(totalDu)} G</p>
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((kapital/totalDu)*100, 100)}%`, background: D.gold }} />
              <div style={{ flex: 1, background: D.orange }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
              <span style={{ color: D.gold }}>💰 {fmt(kapital)}</span>
              <span style={{ color: D.orange }}>📈 +{fmt(totalInteret)}</span>
              <span style={{ color: D.muted }}>{nbrPeman} peman</span>
            </div>
          </div>
        )}

        {/* Depozit bloke */}
        <div style={{ marginTop: 10 }}>
          <label style={{ ...labelStyle, color: D.purple }}>Depozit Bloke (opsyonèl)</label>
          <input type="number" min="0" step="0.01" className="ke-input"
            style={{ ...inputStyle, color: D.purple, borderColor: `${D.purple}40` }}
            value={form.montantBloke} onChange={e => set('montantBloke', e.target.value)}
            placeholder="0.00 — kite vid si pa nesesè" onFocus={e => e.target.select()} />
        </div>

        {/* Garanti / Byens */}
        <div style={{ marginTop: 10 }}>
          <label style={{ ...labelStyle, color: D.gold, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Home size={12} /> Garanti / Byens (opsyonèl)
          </label>
          <textarea className="ke-input" style={{ ...inputStyle, height: 56, resize: 'vertical', fontSize: 12 }}
            value={form.garantiByens} onChange={e => set('garantiByens', e.target.value)}
            placeholder="Ex: Kay nan Pòtoprens, Motosiklèt Honda CG 125, Tè nan Mirebalè..." />
          <p style={{ fontSize: 10, color: D.muted, margin: '3px 0 0' }}>Dekri byens kliyan a ofri kòm garanti pou prè a</p>
        </div>
      </Section>

      {/* Kalandriye */}
      <Section icon="📅" title="Kalandriye Rembourseman">
        <div className="ke-form-row">
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Dat Premye Peman</label>
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
        {pmt > 0 && (
          <div style={{ marginTop: 10, background: `${D.blue}10`, border: `1px solid ${D.blue}25`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: D.muted }}>Chak {PERIODES.find(p => p.value === form.periode)?.label}:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: D.blue }}>{fmt(pmt)} HTG</span>
          </div>
        )}
      </Section>

      {/* Avalize */}
      <AvalizelSection form={form} set={set} />

      {/* Metod Dekèsman */}
      <div className="ke-form-row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
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
        <textarea className="ke-input" style={{ ...inputStyle, height: 56, resize: 'vertical' }}
          value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Rezon, lòt enfòmasyon..." />
      </div>

      {/* Chwazi tay papye */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: D.muted, fontWeight: 600 }}>Tay papye:</span>
        {[57, 80].map(mm => (
          <button key={mm} onClick={() => printer.setLargeur(mm)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${printer.largeur === mm ? D.gold+'60' : D.cardBorder}`, background: printer.largeur === mm ? D.goldDim : 'transparent', color: printer.largeur === mm ? D.gold : D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            {mm}mm
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="ke-btn" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Anile</button>
        <button className="ke-btn" onClick={handleSubmit} disabled={mutation.isPending}
          style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, opacity: mutation.isPending ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {mutation.isPending ? <><Spinner color="#0a1222" /> Ap kreye...</> : <><Printer size={15} /> Kreye + Enprime Kontra</>}
        </button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: PEMAN
// ═══════════════════════════════════════════════════════════════
function ModalPaieman({ pre, onClose, onSuccess, printer, kesFemen }) {
  const { tenant } = useAuthStore()
  const qc = useQueryClient()
  const [form, setForm] = useState({ montant: '', method: 'cash', reference: '' })
  const amt         = Number(form.montant || 0)
  const resteAPayer = Math.max(0, Number(pre.totalDu || 0) - Number(pre.totalPaye || 0))

  if (kesFemen) return (
    <Modal onClose={onClose} title={`💳 Peman — ${pre.numeroPre}`} width={420}>
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <Lock size={40} style={{ color: D.red, margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: D.red, margin: '0 0 8px' }}>Kès Fèmen</p>
        <p style={{ fontSize: 13, color: D.muted, margin: '0 0 20px' }}>Ou pa ka anrejistre peman apre ou fèmen kès la.</p>
        <button className="ke-btn" onClick={onClose} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, cursor: 'pointer' }}>Konprann</button>
      </div>
    </Modal>
  )

  const mutation = useMutation({
    mutationFn: (d) => preAPI.paiement(pre.id, d),
    onSuccess: async (res) => {
      toast.success(`✅ Peman ${fmt(amt)} HTG anrejistre!`)
      qc.invalidateQueries(['pre-echeances', pre.id])
      onSuccess()
      try { printer.printPre({ pre: { ...pre, totalPaye: Number(pre.totalPaye) + amt }, paiement: { montant: amt }, tenant, type: 'paiement' }) } catch {}
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè peman.'),
  })

  return (
    <Modal onClose={onClose} title={`💳 Peman — ${pre.numeroPre}`} width={440}>
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
              <span style={{ fontSize: 12, fontWeight: 700, color: D.green }}>Rete apre peman:</span>
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
    onSuccess: (res) => { toast.success(`✅ ${fmt(amt)} HTG enjekte!`); onSuccess(); onClose() },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erè enjeksyon.'),
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
// MODAL: FEMEN KÈS
// ═══════════════════════════════════════════════════════════════
function ModalRapoKesye({ onClose, onKesFemen }) {
  const [rapo, setRapo] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const handleFemen = async () => {
    setLoading(true)
    try { const res = await preAPI.femenKes({ notes: notes || undefined }); setRapo(res.data.rapo); toast.success('✅ Kès fèmen!'); onKesFemen() }
    catch (e) { toast.error(e.response?.data?.message || 'Erè fèmen kès.') }
    finally { setLoading(false) }
  }
  return (
    <Modal onClose={onClose} title="📊 Fèmen Kès" width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!rapo ? (
          <>
            <div style={{ background: `${D.orange}10`, border: `1px solid ${D.orange}25`, borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: D.orange, margin: 0 }}>⚠️ Apre ou fèmen kès la, ou p ap ka fè okenn tranzaksyon jiskaske demen.</p>
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
                { label: 'Prè Kreye', val: rapo.totalPreKreye,               color: D.gold,   suffix: 'prè' },
                { label: 'Dekèsman',  val: `${fmt(rapo.montantDeseman)} HTG`, color: D.orange, suffix: '' },
                { label: 'Koleksyon', val: `${fmt(rapo.totalKoleksyon)} HTG`, color: D.green,  suffix: '' },
                { label: 'Enterè',    val: `${fmt(rapo.totalEntere)} HTG`,    color: D.purple, suffix: '' },
              ].map(item => (
                <div key={item.label} style={{ background: `${item.color}10`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${item.color}20` }}>
                  <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</p>
                  <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: item.color, margin: 0 }}>{item.val} {item.suffix}</p>
                </div>
              ))}
            </div>
            <button className="ke-btn" onClick={onClose}
              style={{ padding: '13px', borderRadius: 12, border: 'none', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Fèmen</button>
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
  const { data: preData, isLoading } = useQuery({
    queryKey: ['pre-one', preId],
    queryFn:  () => preAPI.getOne(preId).then(r => r.data),
    enabled:  !!preId,
  })
  const qc = useQueryClient()
  const mutCloture = useMutation({
    mutationFn: () => preAPI.cloture(preId),
    onSuccess: () => { toast.success('Prè klotire ✅'); qc.invalidateQueries(['pre-list']); qc.invalidateQueries(['pre-one', preId]); onClose() },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erè klotire.'),
  })

  if (isLoading || !preData?.pre) return (
    <Modal onClose={onClose} title="Detay Prè" width={600}>
      <div style={{ textAlign: 'center', padding: 40, color: D.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Spinner color={D.gold} size={18} /> Ap chaje...
      </div>
    </Modal>
  )

  const pre          = preData.pre
  const resteAPayer  = Math.max(0, Number(pre.totalDu || 0) - Number(pre.totalPaye || 0))
  const pctPaye      = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye) / Number(pre.totalDu)) * 100, 100) : 0
  const interetKouru = Number(pre.interetKouruTotal || 0)

  const handlePrintKontra = async () => {
    try {
      const r = await preAPI.echeances(preId)
      printer.printPre({ pre, echeances: r.data.echeances || [], tenant, type: 'ouverture' })
    } catch {
      printer.printPre({ pre, echeances: [], tenant, type: 'ouverture' })
    }
  }

  return (
    <Modal onClose={onClose} title={`📋 ${pre.numeroPre}`} width={600}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Bannè kliyan */}
        <div style={{ background: D.goldBtn, borderRadius: 14, padding: '14px 16px', color: '#0a1222', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 3px' }}>{pre.clientNom}</p>
            <p style={{ fontSize: 10, opacity: 0.7, margin: 0, fontFamily: 'monospace' }}>{pre.numeroPre}</p>
            {pre.clientPhone    && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>📱 {pre.clientPhone}</p>}
            {pre.clientNifCin   && <p style={{ fontSize: 10, opacity: 0.65, margin: '2px 0 0' }}>ID: {pre.clientNifCin}</p>}
            {pre.kontKaneEpayId && <p style={{ fontSize: 10, opacity: 0.8, margin: '2px 0 0', fontWeight: 700 }}>🔗 Kont Kanè Epay lye</p>}
            {pre.garantiByens   && <p style={{ fontSize: 10, opacity: 0.8, margin: '2px 0 0' }}>🏠 {pre.garantiByens}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <StatutBadge statut={pre.statut} />
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, margin: '6px 0 0' }}>{fmt(pre.montant)} HTG</p>
            <p style={{ fontSize: 10, opacity: 0.6, margin: '1px 0 0' }}>{pre.tauxInteret}% / mwa • {pre.dureeEnMois} mwa • {PERIODES.find(p => p.value === pre.periode)?.label}</p>
          </div>
        </div>

        {/* Avalize */}
        {(pre.avalize1Nom || pre.avalize2Nom) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pre.avalize1Nom && (
              <div style={{ flex: 1, padding: '8px 12px', background: `${D.blue}10`, borderRadius: 10, border: `1px solid ${D.blue}20`, minWidth: 140 }}>
                <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Avalize 1</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: D.blue, margin: 0 }}>{pre.avalize1Nom}</p>
                {pre.avalize1Phone && <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>{pre.avalize1Phone}</p>}
              </div>
            )}
            {pre.avalize2Nom && (
              <div style={{ flex: 1, padding: '8px 12px', background: `${D.blue}10`, borderRadius: 10, border: `1px solid ${D.blue}20`, minWidth: 140 }}>
                <p style={{ fontSize: 9, color: D.muted, margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 700 }}>Avalize 2</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: D.blue, margin: 0 }}>{pre.avalize2Nom}</p>
                {pre.avalize2Phone && <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 0' }}>{pre.avalize2Phone}</p>}
              </div>
            )}
          </div>
        )}

        {/* Barre pwogresyon */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted, marginBottom: 5 }}>
            <span style={{ color: D.green }}>Peye: {fmt(pre.totalPaye || 0)} HTG</span>
            <span style={{ fontWeight: 700, color: pctPaye >= 100 ? D.gold : D.text }}>{Math.round(pctPaye)}%</span>
            <span style={{ color: interetKouru > 0 ? D.red : D.muted }}>
              Rete: {fmt(resteAPayer + interetKouru)} HTG
              {interetKouru > 0 && ` (+ ${fmt(interetKouru)} kouru)`}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${pctPaye}%`, background: pctPaye >= 100 ? D.gold : D.green, transition: 'width 0.4s' }} />
            {interetKouru > 0 && <div style={{ width: `${Math.min((interetKouru/Number(pre.totalDu))*100, 10)}%`, background: D.red }} />}
          </div>
        </div>

        {/* Griy detay */}
        <div className="pre-detail-grid">
          {[
            { label: 'Kapital',    val: `${fmt(pre.montant)} HTG`,   color: D.gold   },
            { label: 'To Enterè', val: `${pre.tauxInteret}% / mwa`, color: D.orange },
            { label: 'Dire',       val: `${pre.dureeEnMois} mwa`,    color: D.blue   },
            { label: 'Total Dwe',  val: `${fmt(pre.totalDu)} HTG`,   color: D.red    },
            { label: 'Total Peye', val: `${fmt(pre.totalPaye||0)} HTG`, color: D.green },
            { label: 'Int. Kouru', val: `${fmt(interetKouru)} HTG`,  color: interetKouru > 0 ? D.red : D.muted },
          ].map(item => (
            <div key={item.label} style={{ background: `${item.color}0f`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${item.color}20` }}>
              <p style={{ fontSize: 10, color: D.muted, margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</p>
              <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: item.color, margin: 0 }}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Garanti */}
        {pre.garantiByens && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: `${D.gold}08`, borderRadius: 10, border: `1px solid ${D.gold}20` }}>
            <Home size={14} style={{ color: D.gold, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 10, color: D.muted, margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase' }}>Garanti / Byens</p>
              <p style={{ fontSize: 12, color: D.text, margin: 0 }}>{pre.garantiByens}</p>
            </div>
          </div>
        )}

        {pre.montantBloke > 0 && (
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

        {/* Boutons aksyon */}
        {pre.statut !== 'cloture' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ke-btn" onClick={onPaieman}
              style={{ flex: 2, padding: '11px', borderRadius: 10, border: `1px solid ${D.green}30`, background: D.greenBg, color: D.green, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <ArrowDownCircle size={14} /> Anrejistre Peman
            </button>
            <button className="ke-btn" onClick={handlePrintKontra}
              style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <Printer size={13} /> Kontra
            </button>
            {resteAPayer <= 0.01 && interetKouru <= 0 && (
              <button className="ke-btn" onClick={() => mutCloture.mutate()} disabled={mutCloture.isPending}
                style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${D.gold}30`, background: D.goldDim, color: D.gold, cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                {mutCloture.isPending ? <Spinner size={12} color={D.gold} /> : <CheckCircle size={13} />} Klotire
              </button>
            )}
          </div>
        )}

        {/* Kalandriye */}
        <KalandriyeSection preId={preId} />

        {/* Istwa peman */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: D.muted, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Istwa Peman ({pre.paiements?.length || 0})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
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
                  <button className="ke-btn" onClick={() => printer.printPre({ pre: { ...pre, totalPaye: Number(px.balanceAvant||0) }, paiement: px, tenant, type: 'paiement' })}
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
  const isAdmin  = user?.role === 'admin'

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selPre,          setSelPre]          = useState(null)
  const [filterStatut,    setFilterStatut]    = useState(null)
  const [kesFemen,        setKesFemen]        = useState(false)
  const searchTimeout = useRef(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = SHARED_STYLES + PRE_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  useEffect(() => {
    preAPI.checkKesFemen().then(r => setKesFemen(r.data.kesFemen === true)).catch(() => {})
  }, [])

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['pre-stats'],
    queryFn:  () => preAPI.getStats().then(r => r.data.stats),
    refetchInterval: 30000,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['pre-list', debouncedSearch, page, filterStatut],
    queryFn:  () => preAPI.getAll({ search: debouncedSearch || undefined, page, limit: 15, ...(filterStatut && { statut: filterStatut }) }).then(r => r.data),
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

      {kesFemen && (
        <div style={{ background: `${D.red}15`, border: `1px solid ${D.red}40`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={16} style={{ color: D.red, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: D.red, margin: 0, fontWeight: 700 }}>Kès fèmen jodi a — Okenn nouvo tranzaksyon p ap aksepte jiskaske demen.</p>
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
          {/* Printer toggle 57/80mm */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[57, 80].map(mm => (
              <button key={mm} onClick={() => printer.setLargeur(mm)}
                style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${printer.largeur === mm ? D.gold+'60' : D.cardBorder}`, background: printer.largeur === mm ? D.goldDim : 'transparent', color: printer.largeur === mm ? D.gold : D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                {mm}mm
              </button>
            ))}
          </div>

          <button className="ke-btn" onClick={() => { refresh(); refetchStats() }}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${D.cardBorder}`, background: D.card, color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} />
          </button>

          {/* ✅ Bluetooth — menm jan ak KaneEpayPage */}
          <button className="ke-btn"
            onClick={printer.connected ? printer.disconnect : printer.connect}
            disabled={printer.connecting}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 11px', borderRadius: 10, border: 'none', cursor: 'pointer', background: printer.connected ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.06)', color: printer.connected ? D.green : D.muted, fontWeight: 700, fontSize: 12 }}>
            {printer.connecting ? <Spinner size={13} color={D.muted} /> : printer.connected ? <Bluetooth size={14} /> : <BluetoothOff size={14} />}
          </button>

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
          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: D.purple }}>{fmt(statsData?.kapitalDisponib || 0)} HTG</span>
        </div>
      )}

      {/* Aktivite mwa */}
      <div style={{ background: D.card, borderRadius: 14, padding: '12px 14px', border: `1px solid ${D.cardBorder}` }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: D.gold, margin: '0 0 10px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.green, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Aktivite Mwa a
        </p>
        <div className="ke-today-grid">
          <StatCard label="Dekèsman Mwa a"   value={`${fmt(statsData?.totalDesèmanMwa  || 0)} G`} icon={<ArrowDownCircle size={17}/>} color={D.orange} highlight />
          <StatCard label="Koleksyon Mwa a"  value={`${fmt(statsData?.totalPaiemanMwa  || 0)} G`} icon={<TrendingUp size={17}/>}      color={D.green}  highlight />
          <StatCard label="Int. Kouru Total" value={`${fmt(statsData?.enterèKouruTotal || 0)} G`} icon={<Percent size={17}/>}         color={D.red}    highlight />
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
              style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1px solid ${filterStatut === f.val ? D.gold+'60' : D.cardBorder}`, background: filterStatut === f.val ? D.goldDim : 'transparent', color: filterStatut === f.val ? D.gold : D.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
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
              const resteAPayer    = Number(pre.totalDu || 0) - Number(pre.totalPaye || 0)
              const pctPaye        = pre.totalDu > 0 ? Math.min((Number(pre.totalPaye) / Number(pre.totalDu)) * 100, 100) : 0
              const cfg            = STATUTS[pre.statut] || STATUTS.attente
              const interetKouruPre = Number(pre.interetKouruTotal || 0)

              return (
                <div key={pre.id} className="pre-row" onClick={() => openDetail(pre)}
                  style={{ background: D.card, border: `1px solid ${pre.statut === 'reta' ? D.red+'30' : D.cardBorder}`, borderRadius: 14, padding: '12px 13px', cursor: 'pointer', boxShadow: D.shadow, transition: 'background 0.15s', animation: 'fadeUp 0.2s ease' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: D.goldDim, border: `1px solid ${D.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: D.gold }}>
                        {pre.clientNom?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold, fontSize: 11, margin: 0 }}>{pre.numeroPre}</p>
                          {pre.kontKaneEpayId && <span style={{ fontSize: 9, color: D.green, fontWeight: 700, background: D.greenBg, padding: '1px 6px', borderRadius: 4 }}>🔗 Kanè</span>}
                          {interetKouruPre > 0 && <span style={{ fontSize: 9, color: D.red, fontWeight: 700, background: D.redBg, padding: '1px 6px', borderRadius: 4 }}>⚠ +{fmt(interetKouruPre)} kouru</span>}
                          {(pre.avalize1Nom || pre.avalize2Nom) && <span style={{ fontSize: 9, color: D.blue, fontWeight: 700, background: `${D.blue}15`, padding: '1px 6px', borderRadius: 4 }}>🤝 Avalize</span>}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pre.clientNom}</p>
                        {pre.clientPhone && <p style={{ fontSize: 11, color: D.muted, margin: '1px 0 0' }}>{pre.clientPhone}</p>}
                        <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>{fmtShort(pre.createdAt)} • {pre.tauxInteret}% / mwa • {pre.dureeEnMois} mwa • {PERIODES.find(p => p.value === pre.periode)?.label}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 900, color: D.gold, margin: 0 }}>{fmt(pre.montant)}</p>
                      <p style={{ fontSize: 10, color: D.muted, margin: '1px 0 3px' }}>HTG</p>
                      <StatutBadge statut={pre.statut} />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4, display: 'flex' }}>
                      <div style={{ width: `${pctPaye}%`, background: pctPaye >= 100 ? D.gold : cfg.color, borderRadius: 2, transition: 'width 0.3s' }} />
                      {interetKouruPre > 0 && <div style={{ width: `${Math.min((interetKouruPre/Number(pre.totalDu))*100, 8)}%`, background: D.red }} />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: D.muted }}>
                      <span style={{ color: D.green }}>Peye: {fmt(pre.totalPaye || 0)} HTG</span>
                      <span style={{ fontWeight: 700, color: D.text }}>{Math.round(pctPaye)}%</span>
                      <span style={{ color: resteAPayer > 0 ? cfg.color : D.green }}>{resteAPayer > 0 ? `Rete: ${fmt(resteAPayer + interetKouruPre)} HTG` : '✅ Konplè'}</span>
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
                      style={{ padding: '8px 13px', borderRadius: 8, border: `1px solid ${D.cardBorder}`, background: 'rgba(255,255,255,0.04)', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Eye size={13} />
                    </button>
                    <button className="ke-btn" onClick={e => { e.stopPropagation(); printer.printPre({ pre, echeances: [], tenant: null, type: 'ouverture' }) }}
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