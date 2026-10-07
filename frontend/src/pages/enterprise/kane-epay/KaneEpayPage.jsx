// src/pages/enterprise/kane-epay/KaneEpayPage.jsx
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Tablo bò (menm konsèp ak Gym "Plus Fit")
// Hero nwa + gwo chif lò, wonn aktivite, kat stat blan, lis kont anime
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import toast from 'react-hot-toast'
import {
  Search, ArrowDownCircle, ArrowUpCircle, Eye, X, ChevronLeft, ChevronRight,
  Users, UserCheck, Wallet, TrendingUp, TrendingDown, CreditCard, UserPlus,
  Bluetooth, BluetoothOff, RefreshCw, Lock, FileText, Trash2, Phone,
  ShieldCheck, ShieldAlert, Inbox, Activity,
} from 'lucide-react'
import { fmt, usePrinter } from './kaneEpayUtils'
import { KANE_STYLES, T, hexA, todayLabel } from './kaneEpayConstants'
import { kaneAPI } from './kaneEpayAPI'
import {
  Spinner, StatCard, GlassStat, Ring, AnimatedNumber, AnimatedInt, Avatar,
  AccountSkeleton, Chip, avatarColors,
} from './KaneEpayComponents'
import { ModalCreate, ModalTx, ModalDetail, ModalRapoKesyeKane } from './KaneEpayModals'
import PinConfirmModal from '../../../components/PinConfirmModal'

const PAGE_SIZE = 15
const FILTERS = [
  { val: null,  label: 'Tout'    },
  { val: true,  label: 'Aktif'   },
  { val: false, label: 'Inaktif' },
]

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
  const hasKyc = !!acc.idPhotoUrl
  const locked = Number(acc.lockedAmount) > 0
  const off    = acc.isActive === false
  const [a1]   = avatarColors(`${acc.firstName}${acc.lastName}${acc.accountNumber}`)
  const stop   = (fn) => (e) => { e.stopPropagation(); fn(acc) }

  return (
    <div className={`ke-acc${off ? ' off' : ''}`} tabIndex={0} role="button"
      style={{ animationDelay: `${Math.min(index, 12) * 0.045}s`, '--abg': hexA(a1, .1) }}
      onClick={() => onOpen(acc)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(acc) }}>
      <div className="ke-acc-head">
        <Avatar account={acc} />
        <div className="ke-acc-id">
          <p className="ke-acc-no">{acc.accountNumber}</p>
          <p className="ke-acc-name">{acc.firstName} {acc.lastName}</p>
          {acc.phone && <p className="ke-acc-meta"><Phone size={12} /> {acc.phone}</p>}
        </div>
        <div className="ke-badges">
          <Chip color={hasKyc ? T.green : T.orange} icon={hasKyc ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}>KYC</Chip>
          {off && <Chip color={T.muted}>Inaktif</Chip>}
        </div>
      </div>

      <div className="ke-acc-bal">
        <div style={{ minWidth: 0 }}>
          <p className="ke-label-s">Balans</p>
          <p className="v">{fmt(acc.balance)}<small>HTG</small></p>
        </div>
        {locked && <Chip color={T.orange} icon={<Lock size={11} />}>{fmt(acc.lockedAmount)}</Chip>}
      </div>

      <div className={`ke-acts${isAdmin ? ' adm' : ''}`}>
        <button className="ke-act dep" onClick={stop(onDepo)} disabled={kesFemen}>
          {kesFemen ? <Lock size={13} /> : <ArrowDownCircle size={16} />} Depo
        </button>
        <button className="ke-act ret" onClick={stop(onRetrait)} disabled={kesFemen}>
          {kesFemen ? <Lock size={13} /> : <ArrowUpCircle size={16} />} Retrè
        </button>
        <button className="ke-act ic" title="Wè detay" onClick={stop(onOpen)}><Eye size={17} /></button>
        {isAdmin && <button className="ke-act ic danger" title="Efase kont" onClick={stop(onDelete)}><Trash2 size={16} /></button>}
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
    queryKey: ['kes-status'],
    queryFn:  () => kaneAPI.checkKesFemen().then(r => r.data),
    staleTime: 30000, refetchInterval: 30000,
  })
  const kesFemen = kesData?.kesFemen === true

  const { data: statsData, refetch: refetchStats, isFetching: statsFetching } = useQuery({
    queryKey: ['kane-stats'],
    queryFn:  () => kaneAPI.getStats().then(r => r.data.stats),
    staleTime: 60000, refetchInterval: 60000,
  })

  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey: ['kane-accounts', debouncedSearch, page, filterActive],
    queryFn:  () => kaneAPI.getAll({ search: debouncedSearch||undefined, page, limit: PAGE_SIZE, ...(filterActive!==null && { isActive: filterActive }) }).then(r => r.data),
    staleTime: 30000,
    placeholderData: (prev) => prev,   // React Query v5
  })

  const accounts   = listData?.accounts || []
  const total      = listData?.total    || 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const liveSel    = (selAcc && accounts.find(a => a.id === selAcc.id)) || selAcc

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
  const goPage = (p) => { setPage(p); gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const confirmDelete = async (pin) => {
    try {
      await kaneAPI.deleteAccount(delTarget.id, pin)
      toast.success('Kont efase!')
      setDelTarget(null); refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erè efase kont.')
      throw err
    }
  }

  // ── Kalkil ──
  const s         = statsData || {}
  const dep       = Number(s.todayDepositAmount  || 0)
  const ret       = Number(s.todayWithdrawAmount || 0)
  const net       = dep - ret
  const flow      = dep + ret
  const totalBal  = Number(s.totalBalance || 0)
  const totalAcc  = Number(s.totalAccounts  || 0)
  const activeAcc = Number(s.activeAccounts || 0)
  const newToday  = Number(s.todayNewAccounts || 0)
  const activeRat = totalAcc ? activeAcc / totalAcc : 0
  const avgBal    = totalAcc ? totalBal / totalAcc : 0
  const pct       = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
  const filterIdx = FILTERS.findIndex(f => f.val === filterActive)

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
                <div className="ke-logo"><CreditCard size={26} strokeWidth={2.4} /></div>
                <div style={{ minWidth: 0 }}>
                  <span className="ke-eyebrow"><span className={`ke-live${kesFemen ? ' off' : ''}`} />{todayLabel()} · {kesFemen ? 'Kès fèmen' : 'Kès louvri'}</span>
                  <h1 className="ke-title">Kanè Epay</h1>
                  <p className="ke-sub">Tablo jesyon kont depo ak retrè</p>
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
                {!kesFemen && (
                  <button className="ke-btn ke-btn-glass" title="Fèmen kès" onClick={() => setModal('rapo')}>
                    <FileText size={17} /><span className="lbl">Fèmen kès</span>
                  </button>
                )}
                <button className="ke-btn ke-btn-gold ke-hide-sm" disabled={kesFemen} onClick={() => !kesFemen && setModal('create')}>
                  {kesFemen ? <Lock size={17} /> : <UserPlus size={17} />} {kesFemen ? 'Kès fèmen' : 'Nouvo kont'}
                </button>
              </div>
            </div>

            <div className="ke-hero-bottom">
              <div>
                <span className="ke-big-l"><Wallet size={14} /> Total balans</span>
                <p className="ke-big"><AnimatedNumber value={totalBal} duration={1500} /><small>HTG</small></p>
                <span className="ke-net" style={{ color: net >= 0 ? T.greenD : T.redD }}>
                  {net >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  Nèt jodi a <AnimatedNumber value={net} signed /> G
                </span>
              </div>
              <GlassStat label="Depo jodi a"  icon={<ArrowDownCircle size={14} />} num={dep} color={T.greenD} pct={pct(dep, flow)}
                sub={`${pct(dep, flow)}% mouvman · ${s.todayTransactions || 0} tx`} />
              <GlassStat label="Retrè jodi a" icon={<ArrowUpCircle size={14} />}   num={ret} color={T.redD}   pct={pct(ret, flow)}
                sub={`${pct(ret, flow)}% mouvman jodi a`} />
            </div>
          </div>

          <div className="ke-hero-side">
            <Ring value={activeRat} size={170} />
            <div className="ke-side-txt" style={{ textAlign: 'center' }}>
              <span className="ke-eyebrow ke-side-l"><Activity size={14} /> To aktivite</span>
              <p className="ke-side-v"><AnimatedInt value={activeAcc} /> <span>/ {totalAcc}</span></p>
              <p className="ke-side-s">Kont aktif</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ STATS ════════ */}
      <div className="ke-stats">
        <StatCard label="Total kont"    num={totalAcc}  icon={<Users size={21} />}     color={T.teal}   pct={100} delay={0.08} />
        <StatCard label="Kont aktif"    num={activeAcc} icon={<UserCheck size={21} />} color={T.green}  pct={pct(activeAcc, totalAcc)} pill={`${pct(activeAcc, totalAcc)}%`} delay={0.14} />
        <StatCard label="Mwayèn balans" num={avgBal} format={fmt} suffix="G" icon={<Wallet size={21} />} color={T.orange} pct={pct(avgBal, Math.max(...accounts.map(a => Number(a.balance) || 0), avgBal))} delay={0.2} />
        <StatCard label="Nouvo jodi a"  num={newToday}  icon={<UserPlus size={21} />}  color={T.violet} pct={pct(newToday, totalAcc)} pill={`${pct(newToday, totalAcc)}%`} delay={0.26} />
      </div>

      {/* ════════ KONT ════════ */}
      <div className="ke-section-head ke-in" style={{ animationDelay: '.3s' }}>
        <h2>Kont kliyan</h2>
        <span className="ke-count">{total}</span>
        <span className="ke-rule" />
        {isFetching && !isLoading && <span className="ke-updating"><Spinner size={12} /> Ap mete ajou</span>}
      </div>

      <div className="ke-toolbar ke-in" style={{ animationDelay: '.34s' }}>
        <div className="ke-search">
          <Search size={19} className="lead" />
          <input placeholder="Chèche non, nimewo kont, telefòn..." value={search} onChange={handleSearch} aria-label="Chèche kont" />
          {search && <button className="clr" onClick={clearSearch} aria-label="Efase rechèch"><X size={15} /></button>}
        </div>
        <div className="ke-tabs" role="tablist">
          <span className="ke-tabs-pill" style={{ transform: `translateX(${filterIdx * 100}%)` }} />
          {FILTERS.map(f => (
            <button key={String(f.val)} role="tab" aria-selected={filterActive === f.val}
              className={filterActive === f.val ? 'on' : ''} onClick={() => { setFilterActive(f.val); setPage(1) }}>
              {f.label}
              {f.val === null && <span className="n">{totalAcc}</span>}
              {f.val === true && <span className="n">{activeAcc}</span>}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="ke-grid">{Array.from({ length: 6 }).map((_, i) => <AccountSkeleton key={i} i={i} />)}</div>
      ) : !accounts.length ? (
        <div className="ke-empty ke-in">
          <div className="ke-empty-ic">{search ? <Search size={28} /> : <Inbox size={28} />}</div>
          <h3>{search ? 'Pa jwenn rezilta' : 'Pa gen kont ankò'}</h3>
          <p>{search ? `Pa gen kont pou « ${debouncedSearch || search} ».` : 'Kreye premye kont Kanè Epay la pou kòmanse.'}</p>
          {search
            ? <button className="ke-btn ke-btn-soft" onClick={clearSearch}><X size={16} /> Efase rechèch</button>
            : !kesFemen && <button className="ke-btn ke-btn-dark" onClick={() => setModal('create')}><UserPlus size={17} /> Nouvo kont</button>}
        </div>
      ) : (
        <div className="ke-grid" ref={gridRef}>
          {accounts.map((acc, i) => (
            <AccountCard key={acc.id} acc={acc} index={i} kesFemen={kesFemen} isAdmin={isAdmin}
              onOpen={openDetail} onDepo={openDepo} onRetrait={openRetrait} onDelete={setDelTarget} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="ke-pager">
          <span>Paj {page} sou {totalPages} · {total} kont</span>
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

      {!kesFemen && <button className="ke-fab" onClick={() => setModal('create')}><UserPlus size={20} /> Nouvo kont</button>}

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