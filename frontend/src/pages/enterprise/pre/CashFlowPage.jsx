// src/pages/enterprise/pre/CashFlowPage.jsx
// ═══════════════════════════════════════════════════════════════
// KÒB ANTRE / SOTI — Prè + Kanè Epay + Ti Kanè Kès (separe + global)
// Menm konsèp ak Gym "Plus Fit" / Kanè Epay
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw, Landmark, CreditCard, PiggyBank,
  TrendingUp, TrendingDown, ArrowLeftRight, Info, CalendarRange,
} from 'lucide-react'
import { fmt } from '../kane-epay/kaneEpayUtils'
import { KANE_STYLES, T, hexA } from '../kane-epay/kaneEpayConstants'
import { PRE_STYLES } from './preConstants'
import { preAPI } from './preAPI'
import { Spinner, GlassStat, AnimatedNumber, Alert } from './PreComponents'

// ✅ Dat lokal (pa UTC) — evite jou a chanje apre 8è diswa an Ayiti
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const today = () => iso(new Date())
const firstOfMonth = () => { const n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth(), 1)) }
const fmtD = (s) => { try { return new Date(`${s}T12:00:00`).toLocaleDateString('fr-HT', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return s } }

const PRESETS = [
  { k: 'jodi',  l: 'Jodi a',     r: () => [today(), today()] },
  { k: '7j',    l: '7 jou',      r: () => { const d = new Date(); d.setDate(d.getDate() - 6); return [iso(d), today()] } },
  { k: 'mwa',   l: 'Mwa sa',     r: () => [firstOfMonth(), today()] },
  { k: 'mwa-1', l: 'Mwa pase',   r: () => { const n = new Date(); return [iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), iso(new Date(n.getFullYear(), n.getMonth(), 0))] } },
]

const MODULES = [
  { key: 'pre',       title: 'Mikwo Kredi',  sub: 'Prè — koleksyon / dekèsman', icon: Landmark,   color: T.teal },
  { key: 'kaneEpay',  title: 'Kanè Epay',    sub: 'Depo / retrè kont',          icon: CreditCard, color: T.orange },
  { key: 'tikaneKes', title: 'Ti Kanè Kès',  sub: 'Epay jounalye',              icon: PiggyBank,  color: T.violet },
]

function FlowCard({ mod, data, delay }) {
  const Ic    = mod.icon
  const antre = Number(data?.antre || 0)
  const soti  = Number(data?.soti  || 0)
  const nèt   = Number(data?.nèt ?? antre - soti)
  const sum   = antre + soti
  const [w, setW] = useState(0)
  useEffect(() => { const id = setTimeout(() => setW(sum > 0 ? (antre / sum) * 100 : 0), 150); return () => clearTimeout(id) }, [antre, sum])

  return (
    <div className="cf-mod" style={{ '--cbg': hexA(mod.color, .09), animationDelay: `${delay}s` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ke-stat-ic" style={{ '--c': mod.color, '--cbg': hexA(mod.color, .12) }}><Ic size={21} /></div>
        <div style={{ minWidth: 0 }}><h3>{mod.title}</h3><p className="sub">{mod.sub}</p></div>
      </div>
      <div className="cf-io">
        <div>
          <p className="ke-label-s" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ArrowDownCircle size={12} color={T.green} /> Antre</p>
          <p className="v" style={{ color: T.green }}><AnimatedNumber value={antre} /></p>
        </div>
        <div>
          <p className="ke-label-s" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ArrowUpCircle size={12} color={T.red} /> Soti</p>
          <p className="v" style={{ color: T.red }}><AnimatedNumber value={soti} /></p>
        </div>
      </div>
      <div className="cf-split" aria-label={`Antre ${Math.round(w)}%`}>
        {sum > 0 ? (<><i style={{ width: `${w}%`, background: T.green }} /><i style={{ flex: 1, background: T.red, opacity: w ? 1 : 0 }} /></>) : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: T.muted, marginTop: 7 }}>
        <span>{sum > 0 ? Math.round((antre / sum) * 100) : 0}% antre</span>
        <span>{sum > 0 ? Math.round((soti / sum) * 100) : 0}% soti</span>
      </div>
      <div className="cf-net">
        <p className="ke-label-s">Nèt</p>
        <b style={{ color: nèt >= 0 ? T.green : T.red }}><AnimatedNumber value={nèt} signed /><small>HTG</small></b>
      </div>
    </div>
  )
}

export default function CashFlowPage() {
  const [debutDate, setDebutDate] = useState(firstOfMonth())
  const [finDate, setFinDate]     = useState(today())

  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-cashflow', '')
    el.textContent = KANE_STYLES + PRE_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pre-cash-flow', debutDate, finDate],
    queryFn:  () => preAPI.cashFlow({ debutDate, finDate }).then(r => r.data),
    enabled:  !!debutDate && !!finDate && debutDate <= finDate,
    placeholderData: (prev) => prev,
  })

  const activePreset = PRESETS.find(p => { const [a, b] = p.r(); return a === debutDate && b === finDate })?.k
  const g     = data?.global || {}
  const gIn   = Number(g.antre || 0), gOut = Number(g.soti || 0)
  const gNet  = Number(g.nèt ?? gIn - gOut)
  const gSum  = gIn + gOut
  const pct   = (a) => (gSum > 0 ? Math.round((a / gSum) * 100) : 0)
  const badRange = debutDate > finDate

  return (
    <div className="ke-scope ke-page">
      {/* ════════ HERO ════════ */}
      <section className="ke-hero ke-in">
        <div className="ke-hero-glow" />
        <div className="ke-hero-grid" />
        <div className="ke-hero-body">
          <div style={{ minWidth: 0 }}>
            <div className="ke-hero-top">
              <div className="ke-hero-head">
                <div className="ke-logo"><ArrowLeftRight size={26} strokeWidth={2.4} /></div>
                <div style={{ minWidth: 0 }}>
                  <span className="ke-eyebrow"><span className="ke-live" />{fmtD(debutDate)} → {fmtD(finDate)}</span>
                  <h1 className="ke-title">Kòb antre / soti</h1>
                  <p className="ke-sub">Prè + Kanè Epay + Ti Kanè Kès — separe ak global</p>
                </div>
              </div>
            </div>
            <div className="ke-hero-bottom cf-bottom">
              <div>
                <span className="ke-big-l">{gNet >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} Nèt global</span>
                <p className="ke-big" style={{ color: gNet >= 0 ? T.gold : T.redD }}>
                  {isLoading ? '—' : <AnimatedNumber value={gNet} signed duration={1400} />}<small>HTG</small>
                </p>
                <span className="ke-net" style={{ color: 'rgba(242,241,236,.75)' }}>Tou 3 modil yo ansanm</span>
              </div>
              <GlassStat label="Antre global" icon={<ArrowDownCircle size={14} />} num={gIn}  color={T.greenD} pct={pct(gIn)}  sub={`${pct(gIn)}% mouvman`} />
              <GlassStat label="Soti global"  icon={<ArrowUpCircle size={14} />}   num={gOut} color={T.redD}   pct={pct(gOut)} sub={`${pct(gOut)}% mouvman`} />
            </div>
          </div>

          {/* Peryòd */}
          <div className="ke-hero-side" style={{ alignItems: 'stretch' }}>
            <div className="cf-period">
              <span className="ke-eyebrow"><CalendarRange size={14} /> Peryòd</span>
              <div className="cf-presets">
                {PRESETS.map(p => (
                  <button key={p.k} className={activePreset === p.k ? 'on' : ''} onClick={() => { const [a, b] = p.r(); setDebutDate(a); setFinDate(b) }}>{p.l}</button>
                ))}
              </div>
              <div className="cf-dates">
                <div><label>Depi</label><input type="date" value={debutDate} max={finDate} onChange={e => setDebutDate(e.target.value)} /></div>
                <div><label>Jiska</label><input type="date" value={finDate} min={debutDate} onChange={e => setFinDate(e.target.value)} /></div>
              </div>
              <button className="ke-btn ke-btn-gold" onClick={() => refetch()} disabled={isFetching || badRange}>
                {isFetching ? <Spinner size={15} /> : <RefreshCw size={16} />} {isFetching ? 'Ap chaje...' : 'Rafrechi'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {badRange && <Alert color={T.red}>Dat "Depi" a dwe vini anvan dat "Jiska" a.</Alert>}

      <div className="ke-section-head ke-in" style={{ animationDelay: '.15s' }}>
        <h2>Pa modil</h2><span className="ke-rule" />
        {isFetching && !isLoading && <span className="ke-updating"><Spinner size={12} /> Ap mete ajou</span>}
      </div>

      {isLoading ? (
        <div className="cf-mods">{[0, 1, 2].map(i => <div key={i} className="ke-skel" style={{ height: 290, borderRadius: 24 }} />)}</div>
      ) : !data ? (
        <div className="ke-empty"><div className="ke-empty-ic"><ArrowLeftRight size={28} /></div><h3>Pa gen done</h3><p>Chwazi yon lòt peryòd.</p></div>
      ) : (
        <div className="cf-mods">
          {MODULES.map((m, i) => <FlowCard key={m.key} mod={m} data={data[m.key]} delay={.18 + i * .06} />)}
        </div>
      )}

      {data && (
        <Alert color={T.blue} icon={<Info size={17} />}>
          Peryòd: <b>{fmtD(data.periode?.debutDate || debutDate)} → {fmtD(data.periode?.finDate || finDate)}</b>.
          {' '}"Soti" pou Prè baze sou dat <b>apwobasyon</b> an (lè lajan an reyèlman dekèse), pa dat demand lan.
          {' '}"Soti" pou Ti Kanè Kès gen ladan l ranbousman kontra ki fini <b>ak</b> kontra ki kase (mwens penalite).
        </Alert>
      )}
    </div>
  )
}