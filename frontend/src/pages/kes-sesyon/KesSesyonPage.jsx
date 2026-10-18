// src/pages/kes-sesyon/KesSesyonPage.jsx — Plus Fit redesign
// ✅ KORIJE: lè yo te afiche an lè aparèy la (pa lè Ayiti); fèmen sesyon an te fèt san
//            konfimasyon (aksyon definitif); bouton « retounen » pa t mache si paj la te
//            louvri dirèkteman; montan negatif te aksepte
// ✅ NOUVO:  kalkilatè biyè/monnen pou konte tiwa a, kwonomèt sesyon an an dirèk, montan
//            rapid pou fon kès la, fenèt konfimasyon anvan fèmen, KPI ak filt istorik
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kesSesyonAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { printReportUSB, printReportBluetooth } from '../../utils/printReport'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Wallet, Printer, Lock, Unlock, History, Bluetooth, X, Calculator, RefreshCw,
  Check, Clock, TrendingUp, TrendingDown, Layers, Minus, Plus, User,
} from 'lucide-react'
import '../invoices/invoices.css'

// ✅ Espas nòmal (pa « espas san koupe ») — enprimant tèmik la montre « ? » sinon
const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ' ').replace(/ /g, ' ')
const fmt0 = (n) => fmt(n).replace(/,00$/, '')
// ✅ KORIJE — toujou an lè Ayiti
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-HT', { timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const ekaColor = (e) => e > 0 ? 'var(--ok)' : e < 0 ? 'var(--bad)' : 'var(--muted)'
const ekaLabel = (e) => e > 0 ? 'Siplis' : e < 0 ? 'Manko' : 'Ekzat'

// Biyè ak monnen goud
const DENOMS = [
  { v: 1000, c: '#7C3AED', t: 'biyè' }, { v: 500, c: '#DC2626', t: 'biyè' }, { v: 250, c: '#0284C7', t: 'biyè' },
  { v: 100, c: '#059669', t: 'biyè' }, { v: 50, c: '#D97706', t: 'biyè' }, { v: 25, c: '#B45309', t: 'biyè' },
  { v: 10, c: '#64748B', t: 'monnen' }, { v: 5, c: '#64748B', t: 'monnen' }, { v: 1, c: '#64748B', t: 'monnen' },
]

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

function useEsc(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

function useCountUp(value, ms = 600) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, money, sign }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{sign}{money ? fmt0(Math.round(v)) : Math.round(v)}{money && <small>HTG</small>}</div>
    </div>
  )
}

const duration = (from, now) => {
  const m = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h}è ${String(m % 60).padStart(2, '0')}min` : `${m} min`
}

// ════════════════════════════════════════════════════════════
// Kalkilatè biyè
// ════════════════════════════════════════════════════════════
function BillCounter({ onApply, onClose }) {
  const [n, setN] = useState({})
  useEsc(onClose)
  const total = DENOMS.reduce((s, d) => s + d.v * Number(n[d.v] || 0), 0)
  const shown = useCountUp(total, 300)
  const set = (v, q) => setN(x => ({ ...x, [v]: Math.max(0, Number(q) || 0) }))
  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 560 }}>
        <div className="iv-sheet-h" style={{ background: 'radial-gradient(120% 140% at 100% 0%, #059669, #0F1A5C 75%)' }}>
          <h3><Calculator size={18} style={{ verticalAlign: '-2px' }}/> Konte tiwa a</h3>
          <p>Antre konbyen biyè/monnen ou genyen pou chak valè</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b">
          <div className="ks-bills">
            {DENOMS.map((d, i) => {
              const q = Number(n[d.v] || 0)
              return (
                <div key={d.v} className={`ks-bill a-up ${q ? 'on' : ''}`} style={{ '--bc': d.c, animationDelay: `${i * 25}ms` }}>
                  <div className="h"><b>{d.v}</b><small>{d.t}</small></div>
                  <div className="pd-qty">
                    <button type="button" onClick={() => set(d.v, q - 1)}><Minus size={13}/></button>
                    <input type="number" min="0" inputMode="numeric" value={n[d.v] ?? ''} placeholder="0" onFocus={e => e.target.select()} onChange={e => set(d.v, e.target.value)}/>
                    <button type="button" onClick={() => set(d.v, q + 1)}><Plus size={13}/></button>
                  </div>
                  <div className="sub">{q ? `= ${fmt0(q * d.v)}` : ' '}</div>
                </div>
              )
            })}
          </div>
          <div className="iv-rtotal" style={{ marginTop: 0 }}>
            <span>Total tiwa a</span>
            <span className="num">{fmt(shown)}<small>HTG</small></span>
          </div>
          <div className="iv-sheet-f">
            <button type="button" className="iv-act" onClick={() => setN({})}>Rekòmanse</button>
            <button type="button" className="iv-btn-main" disabled={!total} onClick={() => onApply(total)}><Check size={16}/> Itilize {fmt0(total)} HTG</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Detay sesyon
// ════════════════════════════════════════════════════════════
const SesyonDetailModal = ({ sesyon, onClose, onPrintUSB, onPrintBT }) => {
  useEsc(onClose)
  const eka = Number(sesyon.eka || 0)
  const rows = [
    ['Fon kès inisyal', sesyon.fon_kes_ouveti],
    ['Vant kach pandan sesyon an', sesyon.vant_kach],
    ['Total ki te dwe la', sesyon.atann],
    ['Kantite kesye a konte', sesyon.fon_kes_femen],
  ]
  return (
    <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 440 }}>
        <div className="iv-sheet-h">
          <h3><Wallet size={18} style={{ verticalAlign: '-2px' }}/> {sesyon.user?.fullName || 'Sesyon kès'}</h3>
          <p>{fmtDate(sesyon.opened_at)} → {fmtDate(sesyon.closed_at)}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b">
          <div>
            {rows.map(([l, v]) => <div key={l} className="iv-rrow" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><span>{l}</span><span className="num">{fmt(v)} HTG</span></div>)}
          </div>
          <div className={`iv-paidbox ${eka < 0 ? 'bad' : 'ok'}`} style={eka === 0 ? { background: 'var(--soft)', color: 'var(--muted)' } : undefined}>
            <span>{eka > 0 ? <TrendingUp size={14}/> : eka < 0 ? <TrendingDown size={14}/> : <Check size={14}/>} {ekaLabel(eka)}</span>
            <span className="num" style={{ fontSize: 26 }}>{eka > 0 ? '+' : ''}{fmt(eka)} HTG</span>
          </div>
          {sesyon.notes && <p className="iv-note" style={{ margin: 0 }}><b>Nòt:</b> {sesyon.notes}</p>}
          <div className="iv-sheet-f">
            <button className="iv-act" onClick={onPrintBT}><Bluetooth size={15}/> BT</button>
            <button className="iv-btn-main" onClick={onPrintUSB}><Printer size={15}/> Enprime (USB)</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function KesSesyonPage() {
  const navigate = useNavigate()
  const { tenant, user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const isMobile = useIsMobile()
  const now = useNow()

  const [fonOuveti, setFonOuveti]       = useState('')
  const [fonFemen, setFonFemen]         = useState('')
  const [notes, setNotes]               = useState('')
  const [dernyeSesyon, setDernyeSesyon] = useState(null)
  const [sesyonDetay, setSesyonDetay]   = useState(null)
  const [showBills, setShowBills]       = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [histFilter, setHistFilter]     = useState('')

  const { data: aktifData, isLoading: loadingAktif } = useQuery({ queryKey: ['kes-sesyon-aktif'], queryFn: () => kesSesyonAPI.getAktif() })
  const sesyonAktif = aktifData?.data?.sesyon || null

  const { data: histData } = useQuery({ queryKey: ['kes-sesyon-list'], queryFn: () => kesSesyonAPI.getAll({ limit: 30 }), enabled: isAdmin })
  const historik = histData?.data?.sesyon || []

  const louvriMutation = useMutation({
    mutationFn: () => kesSesyonAPI.louvri({ fonKesOuveti: Number(fonOuveti), notes: notes.trim() }),
    onSuccess: () => {
      toast.success('Sesyon kès louvri.')
      setFonOuveti(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['kes-sesyon-aktif'] })
      qc.invalidateQueries({ queryKey: ['kes-sesyon-list'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan louvri sesyon an.'),
  })

  const femenMutation = useMutation({
    mutationFn: () => kesSesyonAPI.femen(sesyonAktif.id, { fonKesFemen: Number(fonFemen), notes: notes.trim() }),
    onSuccess: (res) => {
      toast.success('Sesyon fèmen.')
      setDernyeSesyon(res.data.sesyon)
      setFonFemen(''); setNotes(''); setConfirmClose(false)
      qc.invalidateQueries({ queryKey: ['kes-sesyon-aktif'] })
      qc.invalidateQueries({ queryKey: ['kes-sesyon-list'] })
    },
    onError: (e) => { toast.error(e.response?.data?.message || 'Erè pandan fèmen sesyon an.'); setConfirmClose(false) },
  })

  const louvri = () => {
    if (fonOuveti === '' || Number(fonOuveti) < 0) return toast.error('Antre fon kès inisyal la (0 oswa plis).')
    louvriMutation.mutate()
  }
  const femen = () => {
    if (fonFemen === '' || Number(fonFemen) < 0) return toast.error('Antre kantite kòb ou konte nan tiwa a.')
    setConfirmClose(true)   // ✅ NOUVO — konfimasyon anvan yon aksyon definitif
  }

  const buildSesyonFiche = (s) => {
    const eka = Number(s.eka || 0)
    return {
      tenant,
      title: 'Fich Sesyon Kès',
      subtitle: s.user?.fullName || '',
      meta: [{ label: 'Louvri', value: fmtDate(s.opened_at) }, { label: 'Fèmen', value: fmtDate(s.closed_at) }],
      rows: [
        { label: 'Fon Kès Inisyal', value: `${fmt(s.fon_kes_ouveti)} HTG` },
        { label: 'Vant Kach', value: `${fmt(s.vant_kach)} HTG` },
        { label: 'Total Atann', value: `${fmt(s.atann)} HTG`, strong: true },
        { label: 'Kantite Konte', value: `${fmt(s.fon_kes_femen)} HTG`, strong: true },
        { label: ekaLabel(eka), value: `${eka > 0 ? '+' : ''}${fmt(eka)} HTG`, strong: true, color: eka > 0 ? 'color-green' : eka < 0 ? 'color-red' : '' },
      ],
    }
  }
  const printSesyonUSB = (s) => printReportUSB(buildSesyonFiche(s))
  const printSesyonBT  = (s) => printReportBluetooth(buildSesyonFiche(s)).catch(e => toast.error(e.message || 'Pa gen enprimant Bluetooth konekte.'))

  const hist = useMemo(() => {
    const closed = historik.filter(s => s.status === 'femen')
    return {
      count: historik.length,
      manko: closed.reduce((a, s) => a + Math.min(0, Number(s.eka || 0)), 0),
      siplis: closed.reduce((a, s) => a + Math.max(0, Number(s.eka || 0)), 0),
      aktif: historik.filter(s => s.status !== 'femen').length,
    }
  }, [historik])
  const histList = historik.filter(s => {
    if (histFilter === 'aktif') return s.status !== 'femen'
    if (histFilter === 'manko') return s.status === 'femen' && Number(s.eka) < 0
    if (histFilter === 'siplis') return s.status === 'femen' && Number(s.eka) > 0
    return true
  })

  return (
    <div className="iv" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: sesyonAktif ? 'radial-gradient(circle, rgba(52,211,153,.45), transparent 65%)' : undefined }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico"><Wallet size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Kès'}</p>
            <h1>Sesyon kès</h1>
            <p className="sub">Louvri, konte epi fèmen tiwa ou — sistèm nan kalkile si gen manko.</p>
          </div>
          {sesyonAktif && <span className="ks-live"><i/> AKTIF · {duration(sesyonAktif.opened_at, now)}</span>}
        </div>
        {isAdmin && historik.length > 0 && (
          <div className="iv-kpis">
            <Kpi label="Sesyon (30 dènye)" value={hist.count} icon={Layers} delay={80}/>
            <Kpi label="Total siplis" value={hist.siplis} icon={TrendingUp} delay={160} tone="green" money sign="+"/>
            <Kpi label="Total manko" value={Math.abs(hist.manko)} icon={TrendingDown} delay={240} tone={hist.manko ? 'red' : ''} money sign={hist.manko ? '−' : ''}/>
          </div>
        )}
      </section>

      {/* ══════════ SESYON AKTYÈL ══════════ */}
      <section className="iv-sec a-up focus" style={{ animationDelay: '80ms', marginBottom: 18 }}>
        {loadingAktif ? (
          [60, 40, 80].map((w, i) => <div key={i} className="iv-sk" style={{ width: `${w}%`, marginBottom: 14 }}/>)
        ) : !sesyonAktif ? (
          <>
            <div className="iv-sec-h">
              <div className="n" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}><Unlock size={17}/></div>
              <div><p className="eb">Kòmanse jounen an</p><h3>Louvri sesyon</h3></div>
            </div>
            <div style={{ maxWidth: 440 }}>
              <label className="iv-lbl">Fon kès inisyal (HTG) *</label>
              <input type="number" step="0.01" min="0" inputMode="decimal" className="iv-inp money big" value={fonOuveti} onChange={e => setFonOuveti(e.target.value)} placeholder="0.00" autoFocus onKeyDown={e => e.key === 'Enter' && louvri()}/>
              <div className="iv-quick">
                {[0, 500, 1000, 2000, 5000].map(v => <button key={v} type="button" className={Number(fonOuveti) === v && fonOuveti !== '' ? 'ex' : ''} onClick={() => setFonOuveti(String(v))}>{fmt0(v)}</button>)}
                <button type="button" onClick={() => setShowBills(true)}><Calculator size={12} style={{ verticalAlign: '-1px' }}/> Konte biyè</button>
              </div>
              <label className="iv-lbl" style={{ marginTop: 14 }}>Nòt (opsyonèl)</label>
              <input className="iv-inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Egz: tiwa 2"/>
              <button onClick={louvri} disabled={louvriMutation.isPending} className="iv-btn-main" style={{ width: '100%', minHeight: 52, marginTop: 16, background: 'linear-gradient(135deg,#059669,#10B981)', boxShadow: '0 10px 24px rgba(5,150,105,.35)' }}>
                {louvriMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Unlock size={16}/>} {louvriMutation.isPending ? 'N ap louvri...' : 'Louvri sesyon'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="iv-sec-h">
              <div className="n ok"><Lock size={17}/></div>
              <div><p className="eb">Depi {fmtDate(sesyonAktif.opened_at)}</p><h3>Sesyon louvri</h3></div>
              <div className="r"><span className="iv-pill"><Clock size={11}/> {duration(sesyonAktif.opened_at, now)}</span></div>
            </div>
            <div className="ks-result" style={{ marginBottom: 16 }}>
              <div><small>Fon kès inisyal</small><span className="num">{fmt0(sesyonAktif.fon_kes_ouveti)}</span></div>
              <div><small>Kesye</small><span style={{ fontWeight: 800, fontSize: 14 }}>{sesyonAktif.user?.fullName || user?.fullName || '—'}</span></div>
            </div>
            <div style={{ maxWidth: 440 }}>
              <label className="iv-lbl">Kantite kòb ou konte nan tiwa a (HTG) *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" step="0.01" min="0" inputMode="decimal" className="iv-inp money big" value={fonFemen} onChange={e => setFonFemen(e.target.value)} placeholder="0.00" autoFocus onKeyDown={e => e.key === 'Enter' && femen()}/>
                <button type="button" className="iv-act" style={{ minHeight: 56, flexShrink: 0 }} onClick={() => setShowBills(true)} title="Konte biyè pa biyè">
                  <Calculator size={17}/>{!isMobile && ' Biyè'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>💡 Klike « Biyè » pou konte tiwa a biyè pa biyè — total la ranpli poukont li.</p>
              <label className="iv-lbl" style={{ marginTop: 14 }}>Nòt (opsyonèl)</label>
              <input className="iv-inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Egz: 1 biyè 500 dechire"/>
              <button onClick={femen} disabled={femenMutation.isPending} className="iv-btn-main" style={{ width: '100%', minHeight: 52, marginTop: 16 }}>
                {femenMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Lock size={16}/>} {femenMutation.isPending ? 'N ap fèmen...' : 'Fèmen sesyon'}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ══════════ REZILTA ══════════ */}
      {dernyeSesyon && (() => {
        const eka = Number(dernyeSesyon.eka || 0)
        return (
          <section className="iv-sec a-up" style={{ marginBottom: 18, borderColor: eka < 0 ? 'rgba(220,38,38,.4)' : 'rgba(5,150,105,.4)' }}>
            <div className="iv-sec-h" style={{ flexWrap: 'wrap' }}>
              <div className={`n ${eka >= 0 ? 'ok' : ''}`} style={eka < 0 ? { background: 'linear-gradient(135deg,#DC2626,#EF4444)' } : undefined}>{eka < 0 ? <TrendingDown size={17}/> : <Check size={18}/>}</div>
              <div><p className="eb">Sesyon fèmen</p><h3>Rezilta</h3></div>
              <div className="r" style={{ display: 'flex', gap: 8 }}>
                <button className="iv-act" onClick={() => printSesyonBT(dernyeSesyon)}><Bluetooth size={14}/> BT</button>
                <button className="iv-act" onClick={() => printSesyonUSB(dernyeSesyon)}><Printer size={14}/> USB</button>
              </div>
            </div>
            <div className="ks-result">
              <div><small>Vant kach</small><span className="num">{fmt0(dernyeSesyon.vant_kach)}</span></div>
              <div><small>Total atann</small><span className="num">{fmt0(dernyeSesyon.atann)}</span></div>
              <div><small>Konte</small><span className="num">{fmt0(dernyeSesyon.fon_kes_femen)}</span></div>
              <div style={{ background: eka > 0 ? 'var(--okBg)' : eka < 0 ? 'var(--badBg)' : 'var(--soft)' }}>
                <small>{ekaLabel(eka)}</small><span className="num" style={{ color: ekaColor(eka) }}>{eka > 0 ? '+' : ''}{fmt0(eka)}</span>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ══════════ ISTORIK (admin) ══════════ */}
      {isAdmin && (
        <section className="iv-sec a-up" style={{ animationDelay: '140ms' }}>
          <div className="iv-sec-h" style={{ flexWrap: 'wrap' }}>
            <div className="n"><History size={17}/></div>
            <div><p className="eb">Tout kesye</p><h3>Istorik sesyon</h3></div>
          </div>
          <div className="iv-chips" style={{ marginBottom: 12 }}>
            {[{ v: '', l: `Tout (${hist.count})` }, { v: 'aktif', l: `Aktif (${hist.aktif})` }, { v: 'manko', l: 'Manko' }, { v: 'siplis', l: 'Siplis' }].map(o => (
              <button key={o.v} type="button" className={`iv-chip ${histFilter === o.v ? 'on' : ''}`} onClick={() => setHistFilter(o.v)}>{o.l}</button>
            ))}
          </div>
          {histList.length === 0 ? (
            <p className="iv-note" style={{ textAlign: 'center', margin: 0 }}>{historik.length ? 'Pa gen sesyon nan filt sa a.' : 'Pa gen sesyon anrejistre ankò.'}</p>
          ) : histList.map((s, i) => {
            const closed = s.status === 'femen'
            const eka = Number(s.eka || 0)
            return (
              <div key={s.id} className="ks-hist" style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, cursor: closed ? 'pointer' : 'default', borderLeft: `4px solid ${!closed ? '#34D399' : eka < 0 ? '#DC2626' : eka > 0 ? '#059669' : '#CBD5E1'}` }}
                onClick={() => closed && setSesyonDetay(s)}>
                <span className="iv-avatar" style={{ background: closed ? '#1B2A8F' : '#059669', width: 40, height: 40 }}>{s.user?.fullName?.[0]?.toUpperCase() || <User size={15}/>}</span>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 13, display: 'block' }}>{s.user?.fullName || '—'}</b>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(s.opened_at)}{closed ? ` → ${fmtDate(s.closed_at)}` : ` · ${duration(s.opened_at, now)}`}</span>
                </div>
                {closed
                  ? <span className="iv-badge" style={{ background: eka > 0 ? 'var(--okBg)' : eka < 0 ? 'var(--badBg)' : 'var(--grayBg)', color: ekaColor(eka), fontSize: 12 }}>{eka > 0 ? '+' : ''}{fmt0(eka)} HTG</span>
                  : <span className="iv-badge" style={{ background: 'var(--okBg)', color: 'var(--ok)' }}>● Aktif</span>}
                {closed && (
                  <div className="acts" style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="iv-mini" title="Enprime (USB)" onClick={() => printSesyonUSB(s)}><Printer size={13}/></button>
                    <button className="iv-mini" title="Enprime BT" onClick={() => printSesyonBT(s)}><Bluetooth size={13}/></button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {showBills && (
        <BillCounter onClose={() => setShowBills(false)} onApply={(total) => {
          if (sesyonAktif) setFonFemen(String(total)); else setFonOuveti(String(total))
          setShowBills(false)
          toast.success(`${fmt0(total)} HTG antre.`)
        }}/>
      )}

      {/* ✅ NOUVO — konfimasyon anvan fèmen */}
      {confirmClose && sesyonAktif && (
        <div className="iv-overlay sheet" onClick={e => e.target === e.currentTarget && !femenMutation.isPending && setConfirmClose(false)}>
          <div className="iv-sheet" style={{ maxWidth: 420 }}>
            <div className="iv-sheet-h">
              <h3><Lock size={18} style={{ verticalAlign: '-2px' }}/> Fèmen sesyon an?</h3>
              <p>Ou p ap ka modifye montan an apre sa.</p>
              <button className="x" onClick={() => setConfirmClose(false)} aria-label="Fèmen"><X size={17}/></button>
            </div>
            <div className="iv-sheet-b">
              <div>
                <div className="iv-rrow" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><span>Louvri depi</span><span>{duration(sesyonAktif.opened_at, now)}</span></div>
                <div className="iv-rrow" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><span>Fon kès inisyal</span><span className="num">{fmt(sesyonAktif.fon_kes_ouveti)}</span></div>
              </div>
              <div className="iv-rtotal" style={{ marginTop: 0 }}>
                <span>Ou konte</span>
                <span className="num">{fmt(fonFemen)}<small>HTG</small></span>
              </div>
              <div className="iv-sheet-f">
                <button className="iv-act" onClick={() => setConfirmClose(false)} disabled={femenMutation.isPending}>Tounen</button>
                <button className="iv-btn-main" onClick={() => femenMutation.mutate()} disabled={femenMutation.isPending}>
                  {femenMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Lock size={16}/>} {femenMutation.isPending ? 'N ap fèmen...' : 'Wi, fèmen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sesyonDetay && (
        <SesyonDetailModal sesyon={sesyonDetay} onClose={() => setSesyonDetay(null)}
          onPrintUSB={() => printSesyonUSB(sesyonDetay)} onPrintBT={() => printSesyonBT(sesyonDetay)}/>
      )}
    </div>
  )
}