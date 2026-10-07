// src/pages/enterprise/pre/PrePage.jsx
// ═══════════════════════════════════════════════════════════════
// MIKWO KREDI (Prè) — Tablo bò, menm konsèp ak Gym "Plus Fit" / Kanè Epay
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import toast from 'react-hot-toast'
import {
  Plus, Search, Eye, Printer, ChevronLeft, ChevronRight, X, Users, Wallet, Activity,
  AlertCircle, RefreshCw, Percent, ArrowDownCircle, ArrowUpCircle, PiggyBank, FileText,
  Lock, Bluetooth, BluetoothOff, Trash2, CheckCircle, Clock, Landmark, Inbox, ShieldCheck,
} from 'lucide-react'
import { fmt, fmtShort } from '../kane-epay/kaneEpayUtils'
import { KANE_STYLES, T, hexA, todayLabel } from '../kane-epay/kaneEpayConstants'
import { STATUTS, PERIODES, PRE_STYLES, FILTRES } from './preConstants'
import { preAPI } from './preAPI'
import { usePrinter } from './preUtils'
import {
  Spinner, StatCard, GlassStat, Ring, AnimatedNumber, AnimatedInt, Track,
  NameAvatar, KaneTag, KouruTag,
} from './PreComponents'
import { ModalCreePre, ModalPaieman, ModalKapital, ModalRapoKesye, ModalDetailPre } from './PreModals'
import PinConfirmModal from '../../../components/PinConfirmModal'

const PAGE_SIZE = 15

function pageList(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out = [1]
  const s = Math.max(2, cur - 1), e = Math.min(total - 1, cur + 1)
  if (s > 2) out.push('…a')
  for (let i = s; i <= e; i++) out.push(i)
  if (e < total - 1) out.push('…b')
  out.push(total)
  return out
}

// ─── Kat yon prè ─────────────────────────────────────────────
function PreCard({ pre, index, kesFemen, isAdmin, onOpen, onPay, onPrint, onDelete }) {
  const cfg          = STATUTS[pre.statut] || STATUTS.attente
  const totalDu      = Number(pre.totalDu || 0)
  const totalPaye    = Number(pre.totalPaye || 0)
  const kouru        = Number(pre.interetKouruTotal || 0)
  const rete         = totalDu - totalPaye
  const pct          = totalDu > 0 ? Math.min((totalPaye / totalDu) * 100, 100) : 0
  const maxJouReta   = Number(pre.maxJouReta || 0)
  const canPay       = !['cloture', 'attente', 'annule'].includes(pre.statut)
  let barColor = T.muted
  if (pre.statut === 'actif' || pre.statut === 'cloture') barColor = T.green
  else if (pre.statut === 'reta') barColor = maxJouReta >= 30 ? T.red : T.orange
  const stop = (fn) => (e) => { e.stopPropagation(); fn(pre) }

  return (
    <div className={`pre-card${pre.statut === 'reta' ? ' reta' : ''}`} tabIndex={0} role="button"
      style={{ animationDelay: `${Math.min(index, 12) * .045}s`, '--sbg': hexA(cfg.color, .09) }}
      onClick={() => onOpen(pre)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(pre) }}>
      <div className="pre-head">
        <NameAvatar nom={pre.clientNom} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="ke-acc-no">{pre.numeroPre}</p>
          <p className="ke-acc-name">{pre.clientNom}</p>
          <p className="ke-acc-meta">{fmtShort(pre.createdAt)} · {pre.tauxInteret}% / mwa · {PERIODES.find(p => p.value === pre.periode)?.label}</p>
        </div>
        <span className="ke-chip" style={{ '--c': cfg.color, '--cbg': cfg.bg, flex: 'none' }}>{cfg.icon}{cfg.label.replace(' Apwobasyon', '')}</span>
      </div>

      {(pre.kontKaneEpayId || kouru > 0) && (
        <div className="pre-tags" style={{ marginTop: -4 }}>
          {pre.kontKaneEpayId && <KaneTag />}
          {kouru > 0 && <KouruTag />}
          {pre.statut === 'reta' && maxJouReta > 0 && <span className="ke-chip" style={{ '--c': T.red, '--cbg': hexA(T.red, .09) }}><Clock size={11} />{maxJouReta} jou reta</span>}
        </div>
      )}

      <div className="pre-prog">
        <div className="pre-prog-top">
          <div style={{ minWidth: 0 }}>
            <p className="ke-label-s">Kapital</p>
            <p className="pre-amt-v">{fmt(pre.montant)}<small>HTG</small></p>
          </div>
          <span className="pct" style={{ color: barColor === T.muted ? T.ink : barColor }}>{Math.round(pct)}%</span>
        </div>
        <Track pct={pct} color={barColor} />
        <div className="pre-prog-row">
          <span style={{ color: T.green }}>Peye {fmt(totalPaye)}</span>
          <span style={{ color: rete > 0 ? cfg.color : T.green }}>{rete > 0 ? `Rete ${fmt(rete + kouru)}` : 'Konplè ✓'}</span>
        </div>
      </div>

      <div className="ke-acts" style={{ gridTemplateColumns: `1fr ${canPay ? 'auto ' : ''}auto${isAdmin ? ' auto' : ''}` }}>
        {canPay ? (
          <button className="ke-act dep" onClick={stop(onPay)} disabled={kesFemen}>{kesFemen ? <Lock size={13} /> : <ArrowDownCircle size={16} />} Peman</button>
        ) : (
          <button className="ke-act ic" style={{ width: 'auto', padding: '0 14px', gap: 6 }} onClick={stop(onOpen)}><Eye size={16} /> Wè detay</button>
        )}
        {canPay && <button className="ke-act ic" title="Wè detay" onClick={stop(onOpen)}><Eye size={17} /></button>}
        <button className="ke-act ic" title="Enprime kontra" onClick={stop(onPrint)}><Printer size={16} /></button>
        {isAdmin && <button className="ke-act ic danger" title="Efase prè" onClick={stop(onDelete)}><Trash2 size={16} /></button>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function PrePage() {
  const qc      = useQueryClient()
  const printer = usePrinter()
  const { user, tenant } = useAuthStore()
  const isAdmin  = user?.role === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selPre,          setSelPre]          = useState(null)
  const [filterStatut,    setFilterStatut]    = useState(null)
  const [deleteTarget,    setDeleteTarget]    = useState(null)
  const [deleting,        setDeleting]        = useState(false)
  const searchTimeout = useRef(null)
  const listRef       = useRef(null)

  const goToFilter = (statut) => {
    setFilterStatut(statut); setPage(1)
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-pre', '')
    el.textContent = KANE_STYLES + PRE_STYLES
    document.head.appendChild(el)
    return () => { document.head.removeChild(el); clearTimeout(searchTimeout.current) }
  }, [])

  // Lyen dirèk soti nan notifikasyon (/app/pre?preId=xxx)
  useEffect(() => {
    const preIdFromUrl = searchParams.get('preId')
    if (preIdFromUrl) {
      setSelPre({ id: preIdFromUrl }); setModal('detail')
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('preId'); return p }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // EGRESS: pa gen refetchInterval — refetchOnWindowFocus sifi
  const { data: kesData } = useQuery({
    queryKey: ['kes-status'],
    queryFn:  () => preAPI.checkKesFermen().then(r => r.data),
    staleTime: 0, refetchOnWindowFocus: true,
  })
  const kesFemen = kesData?.kesFemen === true

  const { data: statsData, refetch: refetchStats, isFetching: statsFetching } = useQuery({
    queryKey: ['pre-stats'],
    queryFn:  () => preAPI.getStats().then(r => r.data.stats),
  })

  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey: ['pre-list', debouncedSearch, page, filterStatut],
    queryFn:  () => preAPI.getAll({ search: debouncedSearch||undefined, page, limit: PAGE_SIZE, ...(filterStatut && { statut: filterStatut }) }).then(r => r.data),
    placeholderData: (prev) => prev,   // React Query v5
  })

  const prets      = listData?.prets || []
  const total      = listData?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const liveSel    = (selPre && prets.find(p => p.id === selPre.id)) || selPre

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pre-list'] })
    qc.invalidateQueries({ queryKey: ['pre-stats'] })
    if (selPre) qc.invalidateQueries({ queryKey: ['pre-one', selPre.id] })
  }
  const openDetail  = (pre) => { setSelPre(pre); setModal('detail')  }
  const openPaieman = (pre) => { if (kesFemen) return; setSelPre(pre); setModal('paieman') }

  const handleSearch = (e) => {
    const val = e.target.value; setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }
  const clearSearch = () => { setSearch(''); setDebouncedSearch(''); setPage(1) }
  const goPage = (p) => { setPage(p); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const confirmDeletePre = async (pin) => {
    setDeleting(true)
    try {
      await preAPI.deletePre(deleteTarget.id, pin)
      toast.success('Prè efase!')
      setDeleteTarget(null); refresh()
    } catch (e) { toast.error(e.response?.data?.message || 'Erè efase prè.'); throw e }
    finally { setDeleting(false) }
  }

  // ── Kalkil ──
  const s          = statsData || {}
  const nTotal     = Number(s.totalPrets || 0)
  const nAtant     = Number(s.pretsAnAtant || 0)
  const nAktif     = Number(s.pretsActifs || 0)
  const nFini      = Number(s.pretsKlotire || 0)
  const nReta      = Number(s.totalEnReta || 0)
  const portfeuye  = Number(s.totalPortfeuye || 0)
  const kolJodi    = Number(s.totalPaiemanJodi || 0)
  const desJodi    = Number(s.totalDesèmanJodi || 0)
  const flowJodi   = kolJodi + desJodi
  const par        = s.par && s.par.total > 0 ? s.par : null
  const par30      = par ? Number(par.par30Ratio || 0) : 0
  const health     = par ? Math.max(0, 1 - par30 / 100) : (nAktif + nReta > 0 ? nAktif / (nAktif + nReta) : 1)
  const pct        = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
  const parColor   = (r) => (r >= 10 ? T.red : r >= 5 ? T.orange : T.green)

  return (
    <div className="ke-scope ke-page">

      {kesFemen && (
        <div className="ke-lockbar ke-in" role="status">
          <div className="ke-lockbar-ic"><Lock size={18} /></div>
          <p><b>Kès fèmen jodi a</b>Okenn nouvo tranzaksyon p ap aksepte jiskaske demen.</p>
        </div>
      )}

      {/* ════════ HERO ════════ */}
      <section className="ke-hero ke-in">
        <div className="ke-hero-glow" />
        <div className="ke-hero-grid" />
        <div className="ke-hero-body">
          <div style={{ minWidth: 0 }}>
            <div className="ke-hero-top">
              <div className="ke-hero-head">
                <div className="ke-logo"><Landmark size={26} strokeWidth={2.4} /></div>
                <div style={{ minWidth: 0 }}>
                  <span className="ke-eyebrow"><span className={`ke-live${kesFemen ? ' off' : ''}`} />{todayLabel()} · {kesFemen ? 'Kès fèmen' : 'Kès louvri'}</span>
                  <h1 className="ke-title">Mikwo Kredi</h1>
                  <p className="ke-sub">Jere, suiv ak kolekte prè yo</p>
                </div>
              </div>
              <div className="ke-hero-actions">
                <button className="ke-btn ke-btn-glass sq" title="Rafrechi" onClick={() => { refresh(); refetchStats() }}>
                  <RefreshCw size={17} className={isFetching || statsFetching ? 'ke-spin' : ''} />
                </button>
                <button className={`ke-btn ke-btn-glass${printer.connected ? ' on' : ''}`} title={printer.connected ? 'Dekonekte printer' : 'Konekte printer Bluetooth'}
                  onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}>
                  {printer.connecting ? <Spinner size={15} /> : printer.connected ? <Bluetooth size={17} /> : <BluetoothOff size={17} />}
                  <span className="lbl">{printer.connected ? 'Printer OK' : 'Printer'}</span>
                </button>
                <button className="ke-btn ke-btn-glass" title="Chanje tay papye resi a" onClick={() => printer.setLargeur(printer.largeur === 80 ? 57 : 80)}
                  style={{ width: 'auto', padding: '0 14px', fontFamily: 'var(--display)', fontSize: 17, fontWeight: 800, letterSpacing: '.04em' }}>
                  {printer.largeur}<span style={{ fontSize: 12, opacity: .6 }}>mm</span>
                </button>
                {!kesFemen && (
                  <button className="ke-btn ke-btn-glass" title="Fèmen kès" onClick={() => setModal('rapo')}><FileText size={17} /><span className="lbl">Fèmen kès</span></button>
                )}
                {isAdmin && (
                  <button className="ke-btn ke-btn-glass" title="Enjekte kapital" onClick={() => setModal('kapital')}><PiggyBank size={17} /><span className="lbl">Kapital</span></button>
                )}
                <button className="ke-btn ke-btn-gold ke-hide-sm" disabled={kesFemen} onClick={() => !kesFemen && setModal('create')}>
                  {kesFemen ? <Lock size={17} /> : <Plus size={17} />} {kesFemen ? 'Kès fèmen' : 'Nouvo prè'}
                </button>
              </div>
            </div>

            <div className="ke-hero-bottom">
              <div>
                <span className="ke-big-l"><Wallet size={14} /> Pòtfèy aktif</span>
                <p className="ke-big"><AnimatedNumber value={portfeuye} duration={1500} /><small>HTG</small></p>
                {isAdmin ? (
                  <span className="ke-net" style={{ color: '#c4b5fd' }}><PiggyBank size={14} /> Kapital disponib <AnimatedNumber value={s.kapitalDisponib || 0} /> G</span>
                ) : (
                  <span className="ke-net" style={{ color: T.gold }}><Percent size={14} /> Enterè kouru <AnimatedNumber value={s.enterèKouruTotal || 0} /> G</span>
                )}
              </div>
              <GlassStat label="Koleksyon jodi a" icon={<ArrowDownCircle size={14} />} num={kolJodi} color={T.greenD} pct={pct(kolJodi, flowJodi)}
                sub={`Mwa a: ${fmt(s.totalPaiemanMwa || 0)} G`} />
              <GlassStat label="Dekèsman jodi a" icon={<ArrowUpCircle size={14} />} num={desJodi} color={T.gold} pct={pct(desJodi, flowJodi)}
                sub={`Mwa a: ${fmt(s.totalDesèmanMwa || 0)} G`} />
            </div>
          </div>

          <div className="ke-hero-side">
            <Ring value={health} size={170} color={health >= .9 ? T.gold : health >= .8 ? '#fb923c' : T.redD} />
            <div className="ke-side-txt" style={{ textAlign: 'center' }}>
              <span className="ke-eyebrow ke-side-l"><ShieldCheck size={14} /> Sante pòtfèy</span>
              <p className="ke-side-v"><AnimatedInt value={nAktif} /> <span>/ {nAktif + nReta}</span></p>
              <p className="ke-side-s">{par ? `PAR30: ${par30}%` : 'Prè san reta'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ STATS (klike = filtre) ════════ */}
      <div className="pre-stats">
        <StatCard label="Total prè"   num={nTotal} icon={<Users size={21} />}       color={T.teal}   pct={100}                 onClick={() => goToFilter(null)}      active={filterStatut === null}      delay={.06} />
        <StatCard label="An atant"    num={nAtant} icon={<Clock size={21} />}       color={T.orange} pct={pct(nAtant, nTotal)} pill={nAtant > 0 ? 'Apwouve' : null} onClick={() => goToFilter('attente')} active={filterStatut === 'attente'} delay={.1} />
        <StatCard label="Prè aktif"   num={nAktif} icon={<Activity size={21} />}    color={T.green}  pct={pct(nAktif, nTotal)} pill={`${pct(nAktif, nTotal)}%`} onClick={() => goToFilter('actif')} active={filterStatut === 'actif'} delay={.14} />
        <StatCard label="An reta"     num={nReta}  icon={<AlertCircle size={21} />} color={T.red}    pct={pct(nReta, nTotal)}  pill={`${pct(nReta, nTotal)}%`}  onClick={() => goToFilter('reta')}  active={filterStatut === 'reta'}  delay={.18} />
        <StatCard label="Prè fini"    num={nFini}  icon={<CheckCircle size={21} />} color={T.blue}   pct={pct(nFini, nTotal)}  onClick={() => goToFilter('cloture')} active={filterStatut === 'cloture'} delay={.22} />
        <StatCard label="Enterè kouru" num={Number(s.enterèKouruTotal || 0)} format={fmt} suffix="G" icon={<Percent size={21} />} color={T.violet} pct={pct(Number(s.enterèKouruTotal || 0), portfeuye)} delay={.26} />
      </div>

      {/* ════════ AKTIVITE ════════ */}
      <div className="pre-panel ke-in" style={{ animationDelay: '.3s' }}>
        <div className="ke-sh"><h3>Aktivite</h3><span className="ke-rule" /></div>
        <div className="pre-four">
          {[
            { l: 'Koleksyon jodi a', v: kolJodi, c: T.green },
            { l: 'Dekèsman jodi a',  v: desJodi, c: T.orange },
            { l: 'Koleksyon mwa a',  v: Number(s.totalPaiemanMwa || 0), c: T.green },
            { l: 'Dekèsman mwa a',   v: Number(s.totalDesèmanMwa || 0), c: T.orange },
          ].map((t, i) => (
            <div key={t.l} className="ke-mtile" style={{ '--c': t.c, '--cbg': hexA(t.c, .07), animationDelay: `${.32 + i * .04}s` }}>
              <p className="ke-label-s">{t.l}</p>
              <p className="v"><AnimatedNumber value={t.v} /> <small style={{ fontSize: 12, color: T.muted }}>G</small></p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ PAR ════════ */}
      {par && (
        <div className="pre-panel ke-in" style={{ animationDelay: '.36s' }}>
          <div className="ke-sh"><h3>Risk pòtfèy (PAR)</h3><span className="ke-rule" /></div>
          <div className="pre-par">
            {[
              { l: 'PAR 30', r: Number(par.par30Ratio || 0), a: par.par30 },
              { l: 'PAR 60', r: Number(par.par60Ratio || 0), a: par.par60 },
              { l: 'PAR 90', r: Number(par.par90Ratio || 0), a: par.par90 },
            ].map(p => {
              const c = parColor(p.r)
              return (
                <div key={p.l} className="pre-par-c" style={{ '--c': c, '--cbg': hexA(c, .07) }}>
                  <p className="ke-label-s">{p.l}</p>
                  <p className="v"><AnimatedNumber value={p.r} format={n => Number(n).toFixed(1)} /><small>%</small></p>
                  <p className="s">{fmt(p.a)} G an risk</p>
                  <Track pct={Math.min(100, p.r * 5)} color={c} />
                </div>
              )
            })}
          </div>
          <p className="pre-note">PAR30 = pousantaj pòtfèy ki gen omwen yon echeans an reta 30 jou oswa plis. Pòtfèy total kalkile sou {fmt(par.total)} HTG. Ba a plen lè PAR rive 20%.</p>
        </div>
      )}

      {/* ════════ LIS PRÈ ════════ */}
      <div className="ke-section-head ke-in" ref={listRef} style={{ animationDelay: '.4s', scrollMarginTop: 16 }}>
        <h2>Prè yo</h2>
        <span className="ke-count">{total}</span>
        <span className="ke-rule" />
        {isFetching && !isLoading && <span className="ke-updating"><Spinner size={12} /> Ap mete ajou</span>}
      </div>

      <div className="ke-toolbar ke-in" style={{ animationDelay: '.44s' }}>
        <div className="ke-search">
          <Search size={19} className="lead" />
          <input placeholder="Chèche non kliyan, nimewo prè..." value={search} onChange={handleSearch} aria-label="Chèche prè" />
          {search && <button className="clr" onClick={clearSearch} aria-label="Efase rechèch"><X size={15} /></button>}
        </div>
        <div className="pre-ftabs" role="tablist">
          {FILTRES.map(f => {
            const c = f.val ? STATUTS[f.val]?.color : null
            return (
              <button key={String(f.val)} role="tab" aria-selected={filterStatut === f.val} className={filterStatut === f.val ? 'on' : ''}
                onClick={() => { setFilterStatut(f.val); setPage(1) }}>
                {c && <span className="dot" style={{ background: c }} />}{f.label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="pre-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pre-card" style={{ cursor: 'default', animationDelay: `${i * .05}s` }}>
              <div style={{ display: 'flex', gap: 12 }}><div className="ke-skel" style={{ width: 48, height: 48, borderRadius: 16 }} /><div style={{ flex: 1 }}><div className="ke-skel" style={{ width: '40%', height: 11, marginBottom: 8 }} /><div className="ke-skel" style={{ width: '70%', height: 15 }} /></div></div>
              <div className="ke-skel" style={{ height: 86, borderRadius: 18 }} />
              <div className="ke-skel" style={{ height: 42, borderRadius: 13 }} />
            </div>
          ))}
        </div>
      ) : !prets.length ? (
        <div className="ke-empty ke-in">
          <div className="ke-empty-ic">{search ? <Search size={28} /> : <Inbox size={28} />}</div>
          <h3>{search ? 'Pa jwenn rezilta' : filterStatut ? 'Pa gen prè nan kategori sa' : 'Pa gen prè ankò'}</h3>
          <p>{search ? `Pa gen prè pou « ${debouncedSearch || search} ».` : filterStatut ? 'Eseye yon lòt filtè.' : 'Kreye premye prè a pou kòmanse.'}</p>
          {search ? <button className="ke-btn ke-btn-soft" onClick={clearSearch}><X size={16} /> Efase rechèch</button>
            : filterStatut ? <button className="ke-btn ke-btn-soft" onClick={() => setFilterStatut(null)}>Wè tout prè yo</button>
            : !kesFemen && <button className="ke-btn ke-btn-dark" onClick={() => setModal('create')}><Plus size={17} /> Nouvo prè</button>}
        </div>
      ) : (
        <div className="pre-grid">
          {prets.map((pre, i) => (
            <PreCard key={pre.id} pre={pre} index={i} kesFemen={kesFemen} isAdmin={isAdmin}
              onOpen={openDetail} onPay={openPaieman}
              onPrint={(p) => printer.printPre({ pre: p, echeances: [], tenant, type: 'ouverture' })}
              onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="ke-pager">
          <span>Paj {page} sou {totalPages} · {total} prè</span>
          <div className="ke-pages">
            <button className="ke-pg" onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Paj anvan"><ChevronLeft size={17} /></button>
            <span className="ke-pcur">{page} / {totalPages}</span>
            <div className="ke-pnums">
              {pageList(page, totalPages).map(p => typeof p === 'number'
                ? <button key={p} className={`ke-pg${p === page ? ' on' : ''}`} onClick={() => p !== page && goPage(p)}>{p}</button>
                : <span key={p} className="ke-pg dots">…</span>)}
            </div>
            <button className="ke-pg" onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Paj apre"><ChevronRight size={17} /></button>
          </div>
        </div>
      )}

      {!kesFemen && <button className="ke-fab" onClick={() => setModal('create')}><Plus size={20} /> Nouvo prè</button>}

      {modal==='create'  && <ModalCreePre   onClose={() => setModal(null)} onSuccess={refresh} printer={printer} kesFemen={kesFemen} />}
      {modal==='kapital' && <ModalKapital   onClose={() => setModal(null)} onSuccess={refresh} />}
      {modal==='rapo'    && <ModalRapoKesye onClose={() => setModal(null)} onKesFemen={() => qc.invalidateQueries({ queryKey: ['kes-status'] })} />}
      {modal==='detail'  && selPre && <ModalDetailPre preId={selPre.id} kesFemen={kesFemen} onClose={() => setModal(null)} onPaieman={(p) => { if (!kesFemen) { setSelPre(p || selPre); setModal('paieman') } }} printer={printer} />}
      {modal==='paieman' && liveSel && <ModalPaieman pre={liveSel} onClose={() => setModal(null)} onSuccess={refresh} printer={printer} kesFemen={kesFemen} />}

      {deleteTarget && (
        <PinConfirmModal
          title="Efase Prè"
          message={`Efase prè ${deleteTarget.numeroPre} — ${deleteTarget.clientNom}? Aksyon sa IREVÈSIB.`}
          loading={deleting}
          onConfirm={confirmDeletePre}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}