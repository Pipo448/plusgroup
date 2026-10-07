// src/pages/enterprise/kane-epay/KaneEpayPage.jsx
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Paj prensipal (design premium, anime, responsive)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import toast from 'react-hot-toast'
import {
  Search, ArrowDownCircle, ArrowUpCircle, Eye, X,
  ChevronLeft, ChevronRight, Users, Wallet, TrendingUp, TrendingDown,
  Activity, CreditCard, UserPlus, Bluetooth, BluetoothOff, RefreshCw,
  Lock, FileText, Trash2, Phone, ShieldCheck, ShieldAlert, Inbox, Layers,
  CheckCircle2, MinusCircle,
} from 'lucide-react'
import { fmt, usePrinter } from './kaneEpayUtils'
import { KANE_STYLES, T } from './kaneEpayConstants'
import { kaneAPI } from './kaneEpayAPI'
import { Spinner, StatCard, TodayTile, AnimatedNumber, AnimatedInt, Avatar, AccountSkeleton } from './KaneEpayComponents'
import { ModalCreate, ModalTx, ModalDetail, ModalRapoKesyeKane } from './KaneEpayModals'
import PinConfirmModal from '../../../components/PinConfirmModal'

const PAGE_SIZE = 15
const FILTERS = [
  { val: null,  label: 'Tout',    icon: Layers },
  { val: true,  label: 'Aktif',   icon: CheckCircle2 },
  { val: false, label: 'Inaktif', icon: MinusCircle },
]

// Lis paj ak "…" (1 … 4 5 6 … 12)
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

// ─── Kat yon kont ────────────────────────────────────────────
function AccountCard({ acc, index, kesFemen, isAdmin, onOpen, onDepo, onRetrait, onDelete }) {
  const hasKyc  = !!acc.idPhotoUrl
  const locked  = Number(acc.lockedAmount) > 0
  const off     = acc.isActive === false
  const stop    = (fn) => (e) => { e.stopPropagation(); fn(acc) }

  return (
    <div className={`ke-acc${off ? ' off' : ''}`} tabIndex={0} role="button"
      style={{ animationDelay: `${Math.min(index, 12) * 0.045}s` }}
      onClick={() => onOpen(acc)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(acc) }}>
      <div className="ke-acc-head">
        <Avatar account={acc} />
        <div className="ke-acc-id">
          <p className="ke-acc-no">{acc.accountNumber}</p>
          <p className="ke-acc-name">{acc.firstName} {acc.lastName}</p>
          {acc.phone && <p className="ke-acc-phone"><Phone size={11} /> {acc.phone}</p>}
        </div>
        <div className="ke-badges">
          <span className="ke-badge" style={{ '--c': hasKyc ? T.green : T.orange }}>
            {hasKyc ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />} KYC
          </span>
          {off && <span className="ke-badge" style={{ '--c': T.muted }}>Inaktif</span>}
        </div>
      </div>

      <div className="ke-acc-bal">
        <div style={{ minWidth: 0 }}>
          <p className="l">Balans</p>
          <p className="v ke-num">{fmt(acc.balance)}<small>HTG</small></p>
        </div>
        {locked && <span className="ke-lock"><Lock size={11} /> {fmt(acc.lockedAmount)}</span>}
      </div>

      <div className={`ke-acc-acts${isAdmin ? ' adm' : ''}`}>
        <button className="ke-act dep" onClick={stop(onDepo)} disabled={kesFemen}>
          {kesFemen ? <Lock size={13} /> : <ArrowDownCircle size={15} />} Depo
        </button>
        <button className="ke-act ret" onClick={stop(onRetrait)} disabled={kesFemen}>
          {kesFemen ? <Lock size={13} /> : <ArrowUpCircle size={15} />} Retrè
        </button>
        <button className="ke-act ghost" title="Wè detay" onClick={stop(onOpen)}><Eye size={16} /></button>
        {isAdmin && <button className="ke-act del" title="Efase kont" onClick={stop(onDelete)}><Trash2 size={15} /></button>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function KaneEpayPage() {
  const qc      = useQueryClient()
  const printer = usePrinter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [modal,           setModal]           = useState(null)
  const [selAcc,          setSelAcc]          = useState(null)
  const [filterActive,    setFilterActive]    = useState(null)
  const [delTarget,       setDelTarget]       = useState(null)
  const searchTimeout = useRef(null)
  const gridRef       = useRef(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-kane-epay', '')
    el.textContent = KANE_STYLES
    document.head.appendChild(el)
    return () => { document.head.removeChild(el); clearTimeout(searchTimeout.current) }
  }, [])

  const { data: kesData } = useQuery({
    queryKey:        ['kes-status'],
    queryFn:         () => kaneAPI.checkKesFemen().then(r => r.data),
    staleTime:       30000,
    refetchInterval: 30000,
  })
  const kesFemen = kesData?.kesFemen === true

  const { data: statsData, refetch: refetchStats, isFetching: statsFetching } = useQuery({
    queryKey:        ['kane-stats'],
    queryFn:         () => kaneAPI.getStats().then(r => r.data.stats),
    staleTime:       60000,
    refetchInterval: 60000,
  })

  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey:        ['kane-accounts', debouncedSearch, page, filterActive],
    queryFn:         () => kaneAPI.getAll({ search: debouncedSearch||undefined, page, limit: PAGE_SIZE, ...(filterActive!==null && { isActive: filterActive }) }).then(r => r.data),
    staleTime:       30000,
    placeholderData: (prev) => prev,   // ✅ React Query v5 (ranplase keepPreviousData)
  })

  const accounts   = listData?.accounts || []
  const total      = listData?.total    || 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  // ✅ Toujou itilize vèsyon kont ki pi fre a (balans ajou apre depo/retrè)
  const liveSel = (selAcc && accounts.find(a => a.id === selAcc.id)) || selAcc

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['kane-accounts'] })
    qc.invalidateQueries({ queryKey: ['kane-stats'] })
    if (selAcc) qc.invalidateQueries({ queryKey: ['kane-account', selAcc.id] })
  }

  const openDetail  = (acc) => { setSelAcc(acc); setModal('detail')  }
  const openDepo    = (acc) => { if (kesFemen) return; setSelAcc(acc); setModal('depot')   }
  const openRetrait = (acc) => { if (kesFemen) return; setSelAcc(acc); setModal('retrait') }

  const handleSearch = (e) => {
    const val = e.target.value; setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }
  const clearSearch = () => { setSearch(''); setDebouncedSearch(''); setPage(1) }

  const goPage = (p) => {
    setPage(p)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ✅ Efase kont depi lis la — mande PIN (backend la egzije l)
  const confirmDelete = async (pin) => {
    try {
      await kaneAPI.deleteAccount(delTarget.id, pin)
      toast.success('Kont efase!')
      setDelTarget(null)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erè efase kont.')
      throw err
    }
  }

  // ── Kalkil stats ──
  const s          = statsData || {}
  const dep        = Number(s.todayDepositAmount  || 0)
  const ret        = Number(s.todayWithdrawAmount || 0)
  const todayNet   = dep - ret
  const flowTotal  = dep + ret
  const depPct     = flowTotal > 0 ? (dep / flowTotal) * 100 : 0
  const totalAcc   = Number(s.totalAccounts  || 0)
  const activeAcc  = Number(s.activeAccounts || 0)
  const activeRat  = totalAcc ? activeAcc / totalAcc : 0
  const avgBal     = totalAcc ? Number(s.totalBalance || 0) / totalAcc : 0
  const filterIdx  = FILTERS.findIndex(f => f.val === filterActive)

  return (
    <div className="ke-scope ke-page">

      {/* ── Bannè kès fèmen ── */}
      {kesFemen && (
        <div className="ke-lockbar" role="status">
          <div className="ke-lockbar-ic"><Lock size={17} /></div>
          <p><b>Kès fèmen jodi a.</b> Okenn nouvo tranzaksyon p ap aksepte jiskaske demen.</p>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="ke-hero">
        <span className="ke-orb a" /><span className="ke-orb b" />
        <div className="ke-hero-in">
          <div className="ke-hero-top">
            <div className="ke-brand">
              <div className="ke-brand-ic"><CreditCard size={22} /></div>
              <div style={{ minWidth: 0 }}>
                <h1 className="ke-title">Kanè Epay</h1>
                <p className="ke-sub">
                  <span className={`ke-live${kesFemen ? ' off' : ''}`} />
                  {kesFemen ? 'Kès fèmen' : 'Kès louvri'} · Kont depo ak retrè
                </p>
              </div>
            </div>
            <div className="ke-actions">
              <button className="ke-icbtn" title="Rafrechi" onClick={() => { refresh(); refetchStats() }}>
                <RefreshCw size={16} className={isFetching || statsFetching ? 'ke-spin' : ''} />
              </button>
              <button className={`ke-icbtn${printer.connected ? ' on' : ''}`} title={printer.connected ? 'Dekonekte printer' : 'Konekte printer Bluetooth'}
                onClick={printer.connected ? printer.disconnect : printer.connect} disabled={printer.connecting}>
                {printer.connecting ? <Spinner size={14} /> : printer.connected ? <Bluetooth size={16} /> : <BluetoothOff size={16} />}
                <span className="lbl">{printer.connected ? 'Printer OK' : 'Printer'}</span>
              </button>
              {!kesFemen && (
                <button className="ke-icbtn warn" title="Fèmen kès" onClick={() => setModal('rapo')}>
                  <FileText size={16} /><span className="lbl">Fèmen Kès</span>
                </button>
              )}
              <button className="ke-btn-gold ke-hide-sm" disabled={kesFemen} onClick={() => !kesFemen && setModal('create')}>
                {kesFemen ? <Lock size={16} /> : <UserPlus size={16} />} {kesFemen ? 'Kès Fèmen' : 'Nouvo Kont'}
              </button>
            </div>
          </div>

          <div className="ke-hero-mid">
            <div>
              <div className="ke-bal-lbl"><Wallet size={13} /> Total balans · tout kont</div>
              <div className="ke-bal">
                <AnimatedNumber value={s.totalBalance} duration={1400} />
                <small>HTG</small>
              </div>
              <div className="ke-bal-meta">
                <span><b><AnimatedInt value={totalAcc} /></b> kont</span>
                <span>Mwayèn <b>{fmt(avgBal)} G</b> / kont</span>
              </div>
              <div className="ke-flow">
                <div className="ke-flow-head"><span>Mouvman jodi a</span><span>{s.todayTransactions || 0} tranzaksyon</span></div>
                <div className="ke-flow-bar">
                  {flowTotal > 0 ? (
                    <>
                      {dep > 0 && <i style={{ width: `${depPct}%`, background: `linear-gradient(90deg,#17A86C,${T.green})` }} />}
                      {ret > 0 && <i style={{ flex: 1, background: `linear-gradient(90deg,${T.red},#FF8F9B)` }} />}
                    </>
                  ) : <i style={{ width: '100%', background: 'rgba(255,255,255,.06)', animation: 'none' }} />}
                </div>
                <div className="ke-legend">
                  <span style={{ color: T.green }}>Depo {Math.round(depPct)}%</span>
                  <span style={{ color: T.red }}>Retrè {flowTotal > 0 ? 100 - Math.round(depPct) : 0}%</span>
                </div>
              </div>
            </div>

            <div className="ke-today">
              <TodayTile label="Depo jodi a"  num={dep} color={T.green} icon={<ArrowDownCircle size={15} />} sub={`${s.todayTransactions || 0} tx total`} delay={0.12} />
              <TodayTile label="Retrè jodi a" num={ret} color={T.red}   icon={<ArrowUpCircle size={15} />}   sub="Lajan ki soti" delay={0.2} />
              <TodayTile label="Nèt jodi a"   num={todayNet} signed color={todayNet >= 0 ? T.green : T.red}
                icon={todayNet >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} sub="Depo − Retrè" delay={0.28} />
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI ── */}
      <div className="ke-kpis">
        <StatCard label="Total kont"   num={totalAcc}  format={n => Math.round(n)} icon={<Users size={17} />}    color={T.gold}   sub="Tout kont Kanè"    delay={0.06} />
        <StatCard label="Kont aktif"   num={activeAcc} format={n => Math.round(n)} icon={<Activity size={17} />} color={T.green}  sub={`${totalAcc - activeAcc} inaktif`} ring={activeRat} delay={0.12} />
        <StatCard label="Mwayèn balans" num={avgBal} suffix="G" icon={<Wallet size={17} />} color={T.blue} sub="Pa kont" delay={0.18} />
        <StatCard label="Nouvo jodi a" num={Number(s.todayNewAccounts || 0)} format={n => Math.round(n)} icon={<UserPlus size={17} />} color={T.violet} sub="Kont kreye jodi a" delay={0.24} />
      </div>

      {/* ── Rechèch + Filtre ── */}
      <div className="ke-toolbar">
        <div className="ke-search">
          <input placeholder="Chèche non, nimewo kont, telefòn..." value={search} onChange={handleSearch} aria-label="Chèche kont" />
          <Search size={17} className="ic" />
          {search && <button className="clr" onClick={clearSearch} aria-label="Efase rechèch"><X size={14} /></button>}
        </div>
        <div className="ke-seg" role="tablist">
          <span className="ke-seg-pill" style={{ transform: `translateX(${filterIdx * 100}%)` }} />
          {FILTERS.map(f => {
            const Ic = f.icon
            return (
              <button key={String(f.val)} role="tab" aria-selected={filterActive === f.val}
                className={filterActive === f.val ? 'on' : ''} onClick={() => { setFilterActive(f.val); setPage(1) }}>
                <Ic size={14} />{f.label}
              </button>
            )
          })}
        </div>
        <div className="ke-meta">
          <span>
            <b>{total}</b> kont{debouncedSearch ? <> pou « <b>{debouncedSearch}</b> »</> : ''} · paj {page}/{totalPages}
          </span>
          {isFetching && !isLoading && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.gold2 }}><Spinner size={11} /> Ap mete ajou</span>}
        </div>
      </div>

      {/* ── Lis kont ── */}
      {isLoading ? (
        <div className="ke-grid">{Array.from({ length: 6 }).map((_, i) => <AccountSkeleton key={i} i={i} />)}</div>
      ) : !accounts.length ? (
        <div className="ke-empty">
          <div className="ke-empty-ic">{search ? <Search size={30} /> : <Inbox size={30} />}</div>
          <h3>{search ? 'Pa jwenn rezilta' : 'Pa gen kont Kanè Epay ankò'}</h3>
          <p>{search ? 'Eseye yon lòt non oswa nimewo kont.' : 'Kreye premye kont lan pou kòmanse.'}</p>
          {search
            ? <button className="ke-icbtn" onClick={clearSearch} style={{ margin: '0 auto' }}><X size={15} /> Efase rechèch</button>
            : !kesFemen && <button className="ke-btn-gold" onClick={() => setModal('create')}><UserPlus size={16} /> Nouvo Kont</button>}
        </div>
      ) : (
        <div className="ke-grid" ref={gridRef}>
          {accounts.map((acc, i) => (
            <AccountCard key={acc.id} acc={acc} index={i} kesFemen={kesFemen} isAdmin={isAdmin}
              onOpen={openDetail} onDepo={openDepo} onRetrait={openRetrait} onDelete={setDelTarget} />
          ))}
        </div>
      )}

      {/* ── Pajinasyon ── */}
      {totalPages > 1 && (
        <div className="ke-pager">
          <span>{total} kont</span>
          <div className="ke-pages">
            <button className="ke-pg" onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Paj anvan"><ChevronLeft size={16} /></button>
            <span className="ke-pcur">{page} / {totalPages}</span>
            <div className="ke-pnums">
              {pageList(page, totalPages).map(p => typeof p === 'number'
                ? <button key={p} className={`ke-pg${p === page ? ' on' : ''}`} onClick={() => p !== page && goPage(p)}>{p}</button>
                : <span key={p} className="ke-pg dots">…</span>)}
            </div>
            <button className="ke-pg" onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Paj apre"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* ── FAB mobil ── */}
      {!kesFemen && (
        <button className="ke-fab" onClick={() => setModal('create')}><UserPlus size={19} /> Nouvo Kont</button>
      )}

      {/* ── Modal yo ── */}
      {modal==='create' && <ModalCreate onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />}
      {modal==='rapo'   && <ModalRapoKesyeKane onClose={() => setModal(null)} onKesFemen={() => qc.invalidateQueries({ queryKey: ['kes-status'] })} statsKane={statsData} />}
      {modal==='detail' && selAcc && (
        <ModalDetail accountId={selAcc.id} kesFemen={kesFemen} printer={printer}
          onClose={() => setModal(null)}
          onDepo={() => !kesFemen && setModal('depot')}
          onRetrait={() => !kesFemen && setModal('retrait')} />
      )}
      {(modal==='depot'||modal==='retrait') && liveSel && !kesFemen && (
        <ModalTx account={liveSel} type={modal} onClose={() => setModal(null)} onSuccess={refresh} printer={printer} />
      )}

      {delTarget && (
        <PinConfirmModal
          title="Efase Kont"
          message={`Efase kont ${delTarget.accountNumber} — ${delTarget.firstName} ${delTarget.lastName}? Tout tranzaksyon ap efase. IREVÈSIB.`}
          onConfirm={confirmDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}