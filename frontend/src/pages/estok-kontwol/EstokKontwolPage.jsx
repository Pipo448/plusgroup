// src/pages/estok-kontwol/EstokKontwolPage.jsx — Plus Fit redesign
// ✅ KORIJE: fòma kantite a te montre « 10,000 » pou 10 (sanble 10 mil!); filt rechèch la
//            te rechaje jiska 500 pwodwi pou CHAK lèt (gwo egress) → kounye a filt lokal;
//            sèvis yo (san stòk) pa parèt ankò; kantite sistèm nan rafrechi apre konfimasyon
// ✅ NOUVO:  diferans an dirèk sou chak liy (+ valè HTG manko a), rezime Siplis/Manko,
//            konte yo sove otomatikman (si paj la fèmen, ou pa pèdi travay ou), avètisman
//            si w kite paj la san konfime, filt « sèlman sa m konte » / « sèlman diferans »
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estokKontwolAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { printReportUSB, printReportBluetooth } from '../../utils/printReport'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ClipboardCheck, Printer, Search, Zap, Bluetooth, RefreshCw, Package, Check,
  TrendingUp, TrendingDown, Eraser, Filter, History, AlertTriangle,
} from 'lucide-react'
import '../invoices/invoices.css'

const DRAFT_KEY = 'pg-kontwol-draft'
const clean = (s) => String(s).replace(/ /g, ' ').replace(/ /g, ' ')
// ✅ KORIJE — 10 → « 10 » (pa « 10,000 »), 12.5 → « 12,5 »; espas nòmal pou enprimant tèmik la
const fmt  = (n) => clean(Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 3 }))
const fmtM = (n) => clean(Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-HT', { timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const ekaColor = (e) => e > 0 ? 'var(--ok)' : e < 0 ? 'var(--bad)' : 'var(--muted)'
const ekaLabel = (e) => e > 0 ? 'Siplis' : e < 0 ? 'Manko' : 'Ekzat'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
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

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, unit }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{unit ? fmtM(Math.round(v)).replace(',00', '') : Math.round(v)}{unit && <small>{unit}</small>}</div>
    </div>
  )
}

export default function EstokKontwolPage() {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const qc = useQueryClient()
  const isMobile = useIsMobile()

  const [filtreKategori, setFiltreKategori] = useState('')
  const [filtreChèche, setFiltreChèche]     = useState('')
  const [vi, setVi]                         = useState('tout')   // tout | konte | diferans
  const [konte, setKonte]                   = useState(() => {
    // ✅ NOUVO — rekipere konte ki pa t konfime (24è)
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (d && Date.now() - d.t < 864e5 && Object.keys(d.konte || {}).length) return d.konte
    } catch { /* */ }
    return {}
  })
  const [dènyeRezime, setDènyeRezime] = useState(null)
  const [sèlmanDiferans, setSèlmanDiferans] = useState(false)

  useEffect(() => {
    const n = Object.values(konte).filter(v => v !== '' && v != null).length
    if (n) toast(`${n} kantite ou te konte deja rekipere.`, { icon: '📋' })
  }, []) // eslint-disable-line

  // Sove konte yo otomatikman
  useEffect(() => {
    try {
      if (Object.keys(konte).length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ t: Date.now(), konte }))
      else localStorage.removeItem(DRAFT_KEY)
    } catch { /* */ }
  }, [konte])

  const { data: categoriesData } = useQuery({ queryKey: ['product-categories'], queryFn: () => productAPI.getCategories(), staleTime: 5 * 60_000 })
  const categories = categoriesData?.data?.categories || []

  // ✅ KORIJE — rechèch la pa nan kle a ankò: lis la chaje YON FWA pa kategori,
  // epi filt pa non an fèt lokalman (anvan sa: jiska 500 pwodwi pou chak lèt tape)
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts, isRefetching } = useQuery({
    queryKey: ['products-all-kontwol', filtreKategori],
    queryFn: () => productAPI.getAll({ categoryId: filtreKategori || undefined, limit: 500 }),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const allProducts = useMemo(() => (productsData?.data?.products || []).filter(p => !p.isService), [productsData])

  const rowOf = (p) => {
    const raw = konte[p.id]
    const gen = raw !== '' && raw != null
    const eka = gen ? Number(raw) - Number(p.quantity || 0) : null
    const unitVal = Number(p.costPriceHtg || p.priceHtg || 0)
    return { gen, eka, val: eka != null ? eka * unitVal : 0 }
  }

  const products = useMemo(() => {
    const q = filtreChèche.trim().toLowerCase()
    return allProducts.filter(p => {
      if (q && !(`${p.name} ${p.code || ''}`.toLowerCase().includes(q))) return false
      const r = rowOf(p)
      if (vi === 'konte' && !r.gen) return false
      if (vi === 'diferans' && !(r.gen && r.eka !== 0)) return false
      return true
    })
  }, [allProducts, filtreChèche, vi, konte]) // eslint-disable-line

  // Rezime tout sa ki konte (menm si yo pa vizib ak filt la)
  const sum = useMemo(() => {
    const byId = Object.fromEntries(allProducts.map(p => [p.id, p]))
    const s = { konte: 0, ekzat: 0, siplis: 0, manko: 0, valManko: 0 }
    Object.entries(konte).forEach(([id, v]) => {
      if (v === '' || v == null) return
      s.konte += 1
      const p = byId[id]
      if (!p) return
      const r = rowOf(p)
      if (r.eka === 0) s.ekzat += 1
      else if (r.eka > 0) s.siplis += 1
      else { s.manko += 1; s.valManko += Math.abs(r.val) }
    })
    return s
  }, [konte, allProducts]) // eslint-disable-line

  const kantiteRanpli = Object.entries(konte).filter(([, v]) => v !== '' && v != null)

  // ✅ NOUVO — avèti si moun nan kite paj la ak konte ki pa konfime
  useEffect(() => {
    if (!kantiteRanpli.length) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [kantiteRanpli.length])

  const { data: histData } = useQuery({ queryKey: ['estok-kontwol-list'], queryFn: () => estokKontwolAPI.getAll({ limit: 40 }) })
  const historik = histData?.data?.kontwol || []
  const historikAfiche = sèlmanDiferans ? historik.filter(k => Number(k.eka) !== 0) : historik

  const batchMutation = useMutation({
    mutationFn: (data) => estokKontwolAPI.createBatch(data),
    onSuccess: (res) => {
      const { kontwolReyisi, kontwolEchwe, kontwol } = res.data
      toast.success(`${kontwolReyisi} kontwòl anrejistre${kontwolEchwe > 0 ? ` (${kontwolEchwe} echwe)` : ''}.`)
      setDènyeRezime(kontwol)
      setKonte({})
      qc.invalidateQueries({ queryKey: ['estok-kontwol-list'] })
      // ✅ kantite sistèm yo ka chanje apre kontwòl la
      qc.invalidateQueries({ queryKey: ['products-all-kontwol'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      setTimeout(() => document.getElementById('kc-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan anrejistreman an.'),
  })

  const handleSubmit = () => {
    if (!kantiteRanpli.length) return toast.error('Antre kantite pou omwen yon pwodwi.')
    const msg = `Konfime ${sum.konte} kontwòl?\n\n✓ Ekzat: ${sum.ekzat}\n▲ Siplis: ${sum.siplis}\n▼ Manko: ${sum.manko}${sum.valManko ? ` (≈ ${fmtM(sum.valManko)} HTG)` : ''}`
    if (!confirm(msg)) return
    batchMutation.mutate({ lignes: kantiteRanpli.map(([productId, v]) => ({ productId, kantiteKonte: Number(v) })) })
  }

  const ranpliAkSistèm = () => {
    if (!products.length) return
    setKonte(k => {
      const nouvo = { ...k }
      products.forEach(p => { if (nouvo[p.id] === undefined || nouvo[p.id] === '') nouvo[p.id] = String(Number(p.quantity || 0)) })
      return nouvo
    })
    toast.success(`${products.length} pwodwi ranpli ak kantite sistèm nan — chanje sèlman sa ki diferan.`)
  }

  const efaseTout = () => { if (confirm('Efase tout kantite ou konte yo?')) setKonte({}) }

  const buildKontwolFiche = (k) => {
    const eka = Number(k.eka)
    return {
      tenant,
      title: 'Fich Kontwòl Estòk',
      subtitle: k.product?.name || '',
      meta: [{ label: 'Dat', value: fmtDate(k.created_at) }, { label: 'Kontwole pa', value: k.creator?.fullName || '—' }],
      rows: [
        { label: 'Kantite Sistèm', value: `${fmt(k.kantite_sistem)} ${k.product?.unit || ''}` },
        { label: 'Kantite Konte', value: `${fmt(k.kantite_konte)} ${k.product?.unit || ''}`, strong: true },
        { label: ekaLabel(eka), value: `${eka > 0 ? '+' : ''}${fmt(eka)} ${k.product?.unit || ''}`, strong: true, color: eka > 0 ? 'color-green' : eka < 0 ? 'color-red' : '' },
      ],
    }
  }
  const printKontwolUSB = (k) => printReportUSB(buildKontwolFiche(k))
  const printKontwolBT  = (k) => printReportBluetooth(buildKontwolFiche(k)).catch(e => toast.error(e.message || 'Pa gen enprimant Bluetooth konekte.'))

  const histManko = historik.filter(k => Number(k.eka) < 0).length

  return (
    <div className="iv" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: isMobile ? 90 : 24 }}>
      <section className="iv-hero">
        <div className="glow" style={{ background: 'radial-gradient(circle, rgba(20,184,166,.5), transparent 65%)' }}/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#2DD4BF" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <button className="back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app'))} aria-label="Retounen"><ArrowLeft size={18}/></button>
          <div className="ico teal"><ClipboardCheck size={24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Estòk'}</p>
            <h1>Kontwòl estòk</h1>
            <p className="sub">Konte fizik — konpare ak sa sistèm nan genyen, epi jwenn manko yo.</p>
          </div>
        </div>
        <div className="iv-kpis">
          <Kpi label="Konte"  value={sum.konte}  icon={ClipboardCheck} delay={80}/>
          <Kpi label="Siplis" value={sum.siplis} icon={TrendingUp}     delay={160} tone="green"/>
          <Kpi label={sum.valManko ? `Manko · ${fmtM(sum.valManko).replace(',00', '')} HTG` : 'Manko'} value={sum.manko} icon={TrendingDown} delay={240} tone={sum.manko ? 'red' : ''}/>
        </div>
      </section>

      {/* ══════════ NOUVO KONTWÒL ══════════ */}
      <section className="iv-sec a-up" style={{ animationDelay: '80ms', marginBottom: 18 }}>
        <div className="iv-sec-h" style={{ flexWrap: 'wrap' }}>
          <div className="n"><ClipboardCheck size={17}/></div>
          <div><p className="eb">Etap 1 · Konte</p><h3>Nouvo kontwòl</h3></div>
          <div className="r" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="iv-act icon" onClick={() => refetchProducts()} disabled={isRefetching} title="Rafrechi kantite sistèm yo">
              <RefreshCw size={15} className={isRefetching ? 'spin' : ''}/>
            </button>
            {sum.konte > 0 && <button className="iv-act danger" onClick={efaseTout}><Eraser size={14}/> Efase</button>}
            <button className="iv-act" style={{ borderColor: '#C9A84C', color: '#8B6914', background: 'rgba(201,168,76,.08)' }} onClick={ranpliAkSistèm} disabled={!products.length}>
              <Zap size={14}/> Kòmanse ak sistèm nan
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="iv-search" style={{ flex: '1 1 220px' }}>
            <Search size={16}/>
            <input value={filtreChèche} onChange={e => setFiltreChèche(e.target.value)} placeholder="Filtre pa non oswa kòd..."/>
          </div>
          <select className="iv-inp" style={{ flex: isMobile ? '1 1 100%' : '0 1 220px' }} value={filtreKategori} onChange={e => setFiltreKategori(e.target.value)}>
            <option value="">Tout kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="iv-chips" style={{ marginBottom: 12 }}>
          {[{ v: 'tout', l: `Tout (${allProducts.length})` }, { v: 'konte', l: `Sa m konte (${sum.konte})` }, { v: 'diferans', l: `Diferans (${sum.siplis + sum.manko})` }].map(o => (
            <button key={o.v} type="button" className={`iv-chip ${vi === o.v ? 'on' : ''}`} onClick={() => setVi(o.v)}>
              {o.v === 'diferans' ? <AlertTriangle size={12}/> : <Filter size={12}/>} {o.l}
            </button>
          ))}
        </div>

        <div className="kc-head"><span>Pwodwi</span><span style={{ textAlign: 'right' }}>Sistèm</span><span style={{ textAlign: 'right' }}>Konte</span><span style={{ textAlign: 'right' }}>Diferans</span></div>
        <div className="kc-list">
          {loadingProducts ? (
            Array(6).fill(0).map((_, i) => <div key={i} className="kc-row"><div className="iv-sk" style={{ width: '60%' }}/><div className="iv-sk"/><div className="iv-sk"/><div className="iv-sk"/></div>)
          ) : products.length === 0 ? (
            <p className="iv-note" style={{ textAlign: 'center' }}>{vi !== 'tout' ? 'Pa gen pwodwi nan vi sa a.' : 'Pa gen pwodwi ki matche filt la.'}</p>
          ) : products.map(p => {
            const r = rowOf(p)
            const cls = !r.gen ? '' : r.eka > 0 ? 'plus' : r.eka < 0 ? 'minus' : 'set'
            return (
              <div key={p.id} className={`kc-row ${cls}`}>
                <div className="nm">
                  <span className="iv-thumb" style={{ backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined }}>{!p.imageUrl && <Package size={14} color="#0F766E"/>}</span>
                  <div style={{ minWidth: 0 }}><b>{p.name}</b><small>{[p.code, p.unit].filter(Boolean).join(' · ')}</small></div>
                </div>
                <span className="sys">{fmt(p.quantity)}</span>
                <input type="number" step="0.001" min="0" inputMode="decimal" className="iv-inp money" value={konte[p.id] ?? ''} placeholder="—"
                  onFocus={e => e.target.select()}
                  onChange={e => setKonte(k => ({ ...k, [p.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { const all = [...document.querySelectorAll('.kc-row input')]; all[all.indexOf(e.target) + 1]?.focus() } }}/>
                <div className={`kc-diff ${r.gen ? '' : 'empty'}`} style={{ color: r.gen ? ekaColor(r.eka) : 'var(--line2)' }}>
                  {r.gen ? `${r.eka > 0 ? '+' : ''}${fmt(r.eka)}` : '—'}
                  {r.gen && r.eka !== 0 && r.val !== 0 && <small>{r.val > 0 ? '+' : '−'}{fmtM(Math.abs(r.val))} HTG</small>}
                  {r.gen && r.eka === 0 && <small>Ekzat ✓</small>}
                </div>
              </div>
            )
          })}
        </div>
        {allProducts.length >= 500 && <p className="iv-note">ℹ️ Se 500 premye pwodwi yo ki afiche — chwazi yon kategori pou wè rès yo.</p>}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1.5px dashed var(--line2)' }}>
          <div className="kc-sum">
            <div><small>Konte</small><span className="num">{sum.konte}</span></div>
            <div><small>Ekzat</small><span className="num" style={{ color: 'var(--muted)' }}>{sum.ekzat}</span></div>
            <div><small>Siplis</small><span className="num" style={{ color: 'var(--ok)' }}>{sum.siplis}</span></div>
            <div><small>Manko</small><span className="num" style={{ color: 'var(--bad)' }}>{sum.manko}</span></div>
          </div>
          {!isMobile && (
            <button onClick={handleSubmit} disabled={batchMutation.isPending || !kantiteRanpli.length} className={`iv-btn-main ${kantiteRanpli.length ? 'pulse' : ''}`} style={{ width: '100%', minHeight: 52, marginTop: 12 }}>
              {batchMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Check size={16}/>}
              {batchMutation.isPending ? 'N ap sove...' : `Konfime tout (${kantiteRanpli.length})`}
            </button>
          )}
          {kantiteRanpli.length > 0 && <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 0' }}>💾 Konte yo sove otomatikman sou aparèy sa a jiskaske w konfime.</p>}
        </div>
      </section>

      {/* ══════════ REZILTA ══════════ */}
      {dènyeRezime?.length > 0 && (
        <section id="kc-result" className="iv-sec a-up" style={{ marginBottom: 18, borderColor: 'rgba(5,150,105,.35)' }}>
          <div className="iv-sec-h">
            <div className="n ok"><Check size={18}/></div>
            <div><p className="eb">Etap 2 · Rezilta</p><h3>Dènye kontwòl yo</h3></div>
            <div className="r"><span className="iv-pill">{dènyeRezime.length} anrejistre</span></div>
          </div>
          {dènyeRezime.map((k, i) => <HistRow key={k.id} k={k} i={i} onUSB={printKontwolUSB} onBT={printKontwolBT}/>)}
        </section>
      )}

      {/* ══════════ ISTORIK ══════════ */}
      <section className="iv-sec a-up" style={{ animationDelay: '140ms' }}>
        <div className="iv-sec-h" style={{ flexWrap: 'wrap' }}>
          <div className="n"><History size={17}/></div>
          <div><p className="eb">{historik.length} dènye · {histManko} manko</p><h3>Istorik kontwòl</h3></div>
          <div className="r">
            <button className={`iv-chip ${sèlmanDiferans ? 'on' : ''}`} onClick={() => setSèlmanDiferans(v => !v)}>
              <AlertTriangle size={12}/> {sèlmanDiferans ? 'Sèlman diferans' : 'Montre sèlman diferans'}
            </button>
          </div>
        </div>
        {historikAfiche.length === 0 ? (
          <p className="iv-note" style={{ textAlign: 'center', margin: 0 }}>{sèlmanDiferans ? 'Pa gen okenn diferans — tout kontwòl te ekzat. 🎉' : 'Pa gen kontwòl anrejistre ankò.'}</p>
        ) : historikAfiche.map((k, i) => <HistRow key={k.id} k={k} i={i} onUSB={printKontwolUSB} onBT={printKontwolBT} showDate/>)}
      </section>

      {isMobile && (
        <div className="iv-mbar">
          <div className="l">
            <small>{sum.konte} konte · {sum.manko} manko</small>
            <span className="num" style={{ display: 'inline-block', color: sum.manko ? '#FCA5A5' : '#FFC83D' }}>{sum.siplis + sum.manko} diferans</span>
          </div>
          <button onClick={handleSubmit} disabled={batchMutation.isPending || !kantiteRanpli.length} className="iv-btn-main" style={{ minHeight: 50 }}>
            {batchMutation.isPending ? <RefreshCw size={16} className="spin"/> : <Check size={16}/>} Konfime
          </button>
        </div>
      )}
    </div>
  )
}

function HistRow({ k, i, onUSB, onBT, showDate }) {
  const eka = Number(k.eka)
  return (
    <div className="kc-hist" style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, borderLeft: `4px solid ${eka > 0 ? '#059669' : eka < 0 ? '#DC2626' : '#CBD5E1'}` }}>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.product?.name}</b>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span className="mono">{fmt(k.kantite_sistem)} → {fmt(k.kantite_konte)}</span>
          {showDate && <> · {fmtDate(k.created_at)} · {k.creator?.fullName || '—'}</>}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="iv-badge" style={{ background: eka > 0 ? 'var(--okBg)' : eka < 0 ? 'var(--badBg)' : 'var(--grayBg)', color: ekaColor(eka), fontSize: 12 }}>
          {eka > 0 ? '+' : ''}{fmt(eka)} · {ekaLabel(eka)}
        </span>
        <button className="iv-mini" title="Enprime (USB)" onClick={() => onUSB(k)}><Printer size={13}/></button>
        <button className="iv-mini" title="Enprime BT" onClick={() => onBT(k)}><Bluetooth size={13}/></button>
      </div>
    </div>
  )
}