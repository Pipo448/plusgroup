// ─────────────────────────────────────────────────────────────
// SabotayPage.jsx — Paj prensipal Sabotay Sol
// ✅ Design "Plus Fit" (menm konsèp ak Gym / Kanè Epay / Prè)
// ✅ Lojik pozisyon dinamik, currentTime/dueTimeEnd, egress — menm jan
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Wallet, Plus, Users, Trophy, CheckCircle, AlertTriangle, AlertCircle,
  RefreshCw, TrendingUp, Search, FileText, Zap, X, PiggyBank, Inbox, Coins,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

import {
  GLOBAL_STYLES, fmt, freqFullLabel,
  getAllPaymentDates, computeMemberStatus, memberPayout, ownerPayout,
  calcDepoRezev, apiFetch, getHaitiNow,
} from './sabotayUtils'

import {
  usePrinterState, ReceiptSizeBtn, PrinterBtn, PlanStatusBadge,
  ModalCreatePlan, ModalBlindDraw, ModalAddMember, ModalClosePlan, ModalMemberCredentials,
} from './sabotayComponents'

import PlanDetail from './PlanDetail'
import { useSabotayMutations } from './useSabotayMutations'
import { KANE_STYLES, T, hexA, todayLabel } from './kane-epay/kaneEpayConstants'
import { StatCard, GlassStat, Ring, AnimatedNumber, AnimatedInt, Track, Chip, Spinner, fmtInt } from './kane-epay/KaneEpayComponents'

const SAB_STYLES = `
.sab-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
@media(max-width:1000px){.sab-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.sab-stats{gap:12px}}
.sab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}
@media(max-width:420px){.sab-grid{grid-template-columns:1fr}}
.sab-plan{position:relative;overflow:hidden;background:#fff;border:1px solid rgba(20,21,26,.08);border-radius:24px;padding:18px;cursor:pointer;display:flex;flex-direction:column;gap:14px;outline:none;animation:keIn .55s cubic-bezier(.22,1,.36,1) backwards;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s}
.sab-plan::before{content:'';position:absolute;width:160px;height:160px;border-radius:50%;right:-55px;top:-80px;background:var(--pbg);transition:transform .5s cubic-bezier(.22,1,.36,1)}
.sab-plan:hover,.sab-plan:focus-visible{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,21,26,.32);border-color:rgba(20,21,26,.14)}
.sab-plan:hover::before{transform:scale(1.15)}
.sab-plan>*{position:relative}
.sab-plan h3{margin:0;font-family:var(--display);font-weight:800;font-size:24px;line-height:1.05;text-transform:uppercase;letter-spacing:.02em;color:var(--ink);overflow-wrap:anywhere}
.sab-plan .meta{margin:4px 0 0;font-size:12.5px;color:var(--muted);font-weight:600}
.sab-money{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sab-money>div{border-radius:16px;padding:12px 14px;background:var(--soft);min-width:0}
.sab-money .v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:28px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sab-win{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--night);color:#f2f1ec;font-size:12.5px;font-weight:700}
.sab-win b{color:#FFC83D;font-family:var(--display);font-size:17px;letter-spacing:.02em}
.sab-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;font-weight:700;color:var(--muted)}
`

// ─────────────────────────────────────────────────────────────
export default function SabotayPage() {
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'sabotay-page-styles'
    el.textContent = KANE_STYLES + GLOBAL_STYLES + SAB_STYLES
    document.head.appendChild(el)
    return () => document.getElementById('sabotay-page-styles')?.remove()
  }, [])

  // Tick chak 30s pou aktyalize `currentTime`
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const { tenant } = useAuthStore()
  const printer    = usePrinterState()

  // ✅ Plan ki louvri a sonje (localStorage) — si APK a rechaje lè w tounen sou li,
  // ou retounen sou menm plan an olye lis la. Ekspire apre 12è.
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem('sab-open-plan') || 'null')
      return v && Date.now() - v.t < 12 * 3600e3 ? v.id : null
    } catch { return null }
  })
  const setSelected = (plan) => {
    const id = plan?.id ?? null
    setSelectedId(id)
    try { id ? localStorage.setItem('sab-open-plan', JSON.stringify({ id, t: Date.now() })) : localStorage.removeItem('sab-open-plan') } catch { /* */ }
  }
  const [showCreate,    setShowCreate]  = useState(false)
  const [editingPlan,   setEditing]     = useState(null)
  const [showAddMember, setAddMember]   = useState(false)
  const [showDraw,      setDraw]        = useState(false)
  const [showClosePlan, setClosePlan]   = useState(false)
  const [memberCreds,   setMemberCreds] = useState(null)
  const [search,        setSearch]      = useState('')
  const [statusFilter,  setStatusFilter] = useState('all')

  // ⚠️ EGRESS — pa gen refetchInterval; bouton Rafrechi + refetchOnWindowFocus sifi
  const { data: plans = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['sabotay-plans'],
    queryFn: () => apiFetch('/sabotay/plans').then(r => {
      const result = r.plans || r.data || r
      return Array.isArray(result) ? result : []
    }),
  })

  const activePlan = selectedId != null ? plans.find(p => String(p.id) === String(selectedId)) || null : null

  const mutations = useSabotayMutations({
    activePlan, tenant, printer,
    onCreateDone: (plan) => { setShowCreate(false); setSelected(plan) },
    onEditDone:   () => { refetch(); setEditing(null) },
    onAddDone:    (saved, credentials) => {
      setAddMember(false)
      if (credentials) setMemberCreds({ member: saved, credentials })
    },
    onCloseDone: () => setClosePlan(false),
  })

  const { today, currentTime } = getHaitiNow()

  // ─── Stats global ─────────────────────────────────────────
  const totalMembers    = plans.reduce((a, p) => a + (p.members?.length || 0), 0)
  const totalCollected  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => m.status !== 'stopped').reduce((b, m) => {
      const allD = getAllPaymentDates(p)
      return b + allD.filter(d => m.payments?.[d] && d <= today).length * p.amount
    }, 0), 0)
  const todayCollected  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => m.status !== 'stopped')
      .reduce((b, m) => b + (m.payments?.[today] ? Number(p.amount) : 0), 0), 0)
  const depoRezevGlobal = plans.reduce((a, p) => a + calcDepoRezev(p, today), 0)
  const activePlans     = plans.filter(p => p.status !== 'closed' && p.status !== 'finished').length
  const globalWarnings  = plans.reduce((a, p) =>
    a + (p.members || []).filter(m => {
      const s = computeMemberStatus(m, p, today, currentTime)
      return s === 'blocked' || s === 'late'
    }).length, 0)
  const activeMembersAll = plans.reduce((a, p) => a + (p.members || []).filter(m => m.status !== 'stopped').length, 0)
  const upToDate = activeMembersAll ? Math.max(0, activeMembersAll - globalWarnings) / activeMembersAll : 1
  const winnersToday = plans.reduce((a, p) => a + (p.members || []).filter(m => String(m.declaredPayoutDate || '').split('T')[0] === today).length, 0)

  const q = search.toLowerCase()
  const filtered = plans.filter(p =>
    (statusFilter === 'all' || (statusFilter === 'open' ? (p.status || 'open') === 'open' : (p.status === 'closed' || p.status === 'finished'))) &&
    (p.name?.toLowerCase().includes(q) || freqFullLabel(p).toLowerCase().includes(q))
  )
  const nOpen = plans.filter(p => (p.status || 'open') === 'open').length

  const modals = (
    <>
      {showCreate && (
        <ModalCreatePlan loading={mutations.createPlan.isPending}
          onClose={() => setShowCreate(false)}
          onSave={(data) => mutations.createPlan.mutate(data)} />
      )}
      {editingPlan && (
        <ModalCreatePlan initialData={editingPlan} loading={mutations.updatePlan.isPending}
          onClose={() => setEditing(null)}
          onSave={(data) => mutations.updatePlan.mutate({ id: editingPlan.id, ...data })} />
      )}
      {showAddMember && activePlan && (
        <ModalAddMember plan={activePlan} loading={mutations.addMember.isPending}
          onClose={() => setAddMember(false)}
          onSave={(data) => mutations.addMember.mutate(data)}
          onShowCreds={(data) => { setMemberCreds(data); setAddMember(false) }} />
      )}
      {showDraw && activePlan && (
        <ModalBlindDraw plan={activePlan} loading={mutations.blindDraw.isPending}
          onClose={() => setDraw(false)}
          onConfirm={(member) => mutations.blindDraw.mutate(member.id)} />
      )}
      {showClosePlan && activePlan && (
        <ModalClosePlan plan={activePlan} loading={mutations.closePlan.isPending}
          onClose={() => setClosePlan(false)}
          onConfirm={() => mutations.closePlan.mutate(activePlan.id)} />
      )}
      {memberCreds && (
        <ModalMemberCredentials member={memberCreds.member} credentials={memberCreds.credentials}
          positions={memberCreds.positions} payoutDates={memberCreds.payoutDates}
          onClose={() => setMemberCreds(null)} />
      )}
    </>
  )

  if (isLoading) return (
    <div className="ke-scope ke-page">
      <div className="ke-skel" style={{ height: 300, borderRadius: 28 }} />
      <div className="sab-stats">{[0,1,2,3].map(i => <div key={i} className="ke-skel" style={{ height: 170, borderRadius: 24 }} />)}</div>
      <div className="sab-grid">{[0,1,2].map(i => <div key={i} className="ke-skel" style={{ height: 240, borderRadius: 24 }} />)}</div>
    </div>
  )

  return (
    <div className="ke-scope ke-page">
      {error && (
        <div className="ke-alert" style={{ '--c': T.red, '--cbg': hexA(T.red, .07), '--cbd': hexA(T.red, .25), alignItems: 'center' }}>
          <AlertCircle size={17} />
          <div style={{ flex: 1 }}>{error.message}</div>
          <button className="ke-btn ke-btn-soft" style={{ height: 38 }} onClick={() => refetch()}><RefreshCw size={14} /> Reyesye</button>
        </div>
      )}

      {activePlan ? (
        <PlanDetail
          plan={activePlan}
          printer={printer}
          onBack={() => setSelected(null)}
          onAddMember={() => setAddMember(true)}
          onBlindDraw={() => setDraw(true)}
          onEditPlan={() => setEditing(activePlan)}
          onClosePlan={() => setClosePlan(true)}
          onToggleDynamic={(planId) => mutations.toggleDynamic.mutate(planId)}
          onToggleManualTime={(planId) => mutations.toggleManualTime.mutate(planId)}
          onToggleHidePosition={(planId) => mutations.toggleHidePosition.mutate(planId)}
          onRecalculate={(planId) => mutations.recalculate.mutate(planId)}
          onMemberAction={(memberId, action, reason, payoutDate) =>
            mutations.memberAction.mutate({ planId: activePlan.id, memberId, action, reason, payoutDate })}
          onPaymentSaved={(memberId, dates, timings, fines, paidAt) =>
            mutations.markPayment.mutateAsync({ memberId, dates, timings, fines, paidAt })}
          onAdjustPosition={(memberId, steps) =>
            mutations.adjustPosition.mutate({ planId: activePlan.id, memberId, steps })}
        />
      ) : (
        <>
          {/* ════════ HERO ════════ */}
          <section className="ke-hero ke-in">
            <div className="ke-hero-glow" />
            <div className="ke-hero-grid" />
            <div className="ke-hero-body">
              <div style={{ minWidth: 0 }}>
                <div className="ke-hero-top">
                  <div className="ke-hero-head">
                    <div className="ke-logo"><Coins size={26} strokeWidth={2.4} /></div>
                    <div style={{ minWidth: 0 }}>
                      <span className="ke-eyebrow"><span className="ke-live" />{todayLabel()} · {currentTime}</span>
                      <h1 className="ke-title">Sabotay Sol</h1>
                      <p className="ke-sub">Jesyon sol ak manm — PlusGroup</p>
                    </div>
                  </div>
                  <div className="ke-hero-actions">
                    <button className="ke-btn ke-btn-glass sq" title="Rafrechi" onClick={() => refetch()}>
                      <RefreshCw size={17} className={isFetching ? 'ke-spin' : ''} />
                    </button>
                    <PrinterBtn printer={printer} />
                    <ReceiptSizeBtn />
                    <button className="ke-btn ke-btn-gold ke-hide-sm" onClick={() => setShowCreate(true)}>
                      <Plus size={17} /> Nouvo plan
                    </button>
                  </div>
                </div>

                <div className="ke-hero-bottom">
                  <div>
                    <span className="ke-big-l"><Wallet size={14} /> Total kolekte</span>
                    <p className="ke-big"><AnimatedNumber value={totalCollected} format={fmt} duration={1500} /><small>HTG</small></p>
                    <span className="ke-net" style={{ color: '#FFC83D' }}><Trophy size={14} /> {winnersToday} ap touche jodi a</span>
                  </div>
                  <GlassStat format={fmt} label="Kolekte jodi a" icon={<CheckCircle size={14} />} num={todayCollected} color={T.greenD}
                    pct={totalCollected > 0 ? (todayCollected / totalCollected) * 100 * 5 : 0} sub={`${activePlans} plan aktif`} />
                  <GlassStat format={fmt} label="Depo rezèv" icon={<PiggyBank size={14} />} num={depoRezevGlobal} color={T.blueD}
                    pct={totalCollected > 0 ? (depoRezevGlobal / totalCollected) * 100 : 0} sub="Peman alavans" />
                </div>
              </div>

              <div className="ke-hero-side">
                <Ring value={upToDate} size={170} color={upToDate >= .9 ? T.gold : upToDate >= .75 ? '#fb923c' : T.redD} />
                <div className="ke-side-txt" style={{ textAlign: 'center' }}>
                  <span className="ke-eyebrow ke-side-l"><Users size={14} /> Manm ajou</span>
                  <p className="ke-side-v"><AnimatedInt value={activeMembersAll - globalWarnings} /> <span>/ {activeMembersAll}</span></p>
                  <p className="ke-side-s">{globalWarnings > 0 ? `${globalWarnings} an reta / bloke` : 'Tout moun ajou'}</p>
                </div>
              </div>
            </div>
          </section>

          {globalWarnings > 0 && (
            <div className="ke-alert" style={{ '--c': T.orange, '--cbg': hexA(T.orange, .08), '--cbd': hexA(T.orange, .3) }}>
              <AlertTriangle size={17} />
              <div><b>{globalWarnings} manm</b> an reta oswa bloke nan tout plan yo.</div>
            </div>
          )}

          {/* ════════ STATS ════════ */}
          <div className="sab-stats">
            <StatCard label="Plan aktif"   num={activePlans}     icon={<Wallet size={21} />}      color={T.orange} pct={plans.length ? (activePlans / plans.length) * 100 : 0} pill={`${plans.length} total`} delay={.06} />
            <StatCard label="Total manm"   num={totalMembers}    icon={<Users size={21} />}       color={T.teal}   pct={100} delay={.1} />
            <StatCard label="Kolekte jodi a" num={todayCollected} format={fmt} suffix="G" icon={<CheckCircle size={21} />} color={T.green} pct={totalCollected ? (todayCollected / totalCollected) * 100 * 5 : 0} delay={.14} />
            <StatCard label="Manm an reta" num={globalWarnings}  icon={<AlertTriangle size={21} />} color={T.red}  pct={activeMembersAll ? (globalWarnings / activeMembersAll) * 100 : 0}
              pill={activeMembersAll ? `${Math.round((globalWarnings / activeMembersAll) * 100)}%` : null} delay={.18} />
          </div>

          {/* ════════ PLAN YO ════════ */}
          <div className="ke-section-head ke-in" style={{ animationDelay: '.22s' }}>
            <h2>Plan sol yo</h2>
            <span className="ke-count">{plans.length}</span>
            <span className="ke-rule" />
          </div>

          <div className="ke-toolbar ke-in" style={{ animationDelay: '.26s' }}>
            <div className="ke-search">
              <Search size={19} className="lead" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chèche plan, frekans..." aria-label="Chèche plan" />
              {search && <button className="clr" onClick={() => setSearch('')} aria-label="Efase"><X size={15} /></button>}
            </div>
            <div className="ke-tabs" role="tablist">
              <span className="ke-tabs-pill" style={{ transform: `translateX(${['all', 'open', 'closed'].indexOf(statusFilter) * 100}%)` }} />
              {[['all', 'Tout', plans.length], ['open', 'Ouvè', nOpen], ['closed', 'Fèmen', plans.length - nOpen]].map(([k, l, n]) => (
                <button key={k} className={statusFilter === k ? 'on' : ''} onClick={() => setStatusFilter(k)}>{l}<span className="n">{n}</span></button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="ke-empty ke-in">
              <div className="ke-empty-ic">{search ? <Search size={28} /> : <Inbox size={28} />}</div>
              <h3>{search ? 'Pa jwenn plan' : 'Pa gen plan sol ankò'}</h3>
              <p>{search ? 'Eseye yon lòt non.' : 'Kreye premye plan Sabotay la pou kòmanse.'}</p>
              {!search && <button className="ke-btn ke-btn-dark" onClick={() => setShowCreate(true)}><Plus size={17} /> Kreye premye plan</button>}
            </div>
          ) : (
            <div className="sab-grid">
              {filtered.map((plan, i) => {
                const activeMbrs = (plan.members || []).filter(m => m.status !== 'stopped')
                const allD       = getAllPaymentDates(plan)
                const coll       = activeMbrs.reduce((a, m) => a + allD.filter(d => m.payments?.[d] && d <= today).length * plan.amount, 0) || 0
                const expected   = activeMbrs.length * allD.filter(d => d <= today).length * plan.amount
                const winner     = plan.members?.find(m => String(m.declaredPayoutDate || '').split('T')[0] === today) || null
                const payout     = memberPayout(plan)
                const planDepo   = calcDepoRezev(plan, today)
                const warnings   = (plan.members || []).filter(m => {
                  const s = computeMemberStatus(m, plan, today, currentTime)
                  return s === 'blocked' || s === 'late'
                }).length
                const isOpen = (plan.status || 'open') === 'open'
                const pct    = expected > 0 ? Math.min(100, (coll / expected) * 100) : 0
                return (
                  <div key={plan.id} className="sab-plan" tabIndex={0} role="button"
                    style={{ animationDelay: `${Math.min(i, 12) * .045}s`, '--pbg': hexA(isOpen ? T.gold : T.red, .12) }}
                    onClick={() => setSelected(plan)} onKeyDown={e => { if (e.key === 'Enter') setSelected(plan) }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3>{plan.name}</h3>
                        <p className="meta">{freqFullLabel(plan)}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                        <PlanStatusBadge status={plan.status || 'open'} />
                        {plan.dynamicPositions && <Chip color={T.blue} icon={<Zap size={11} />}>Dinamik</Chip>}
                        {warnings > 0 && <Chip color={T.red} icon={<AlertTriangle size={11} />}>{warnings}</Chip>}
                      </div>
                    </div>

                    <div className="sab-money">
                      <div><p className="ke-label-s">Montan / moun</p><p className="v" style={{ color: T.goldInk }}>{fmt(plan.amount)}<small style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>G</small></p></div>
                      <div><p className="ke-label-s">Kolekte</p><p className="v" style={{ color: T.green }}>{fmt(coll)}<small style={{ fontSize: 12, color: T.muted, marginLeft: 4 }}>G</small></p></div>
                    </div>

                    {winner && (
                      <div className="sab-win">
                        <Trophy size={16} color="#FFC83D" />
                        <span style={{ flex: 1, minWidth: 0 }}>{winner.name} ap touche jodi a</span>
                        <b>{fmt(winner.isOwnerSlot ? ownerPayout(plan) : payout)} G</b>
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
                        <span>{activeMbrs.length} manm · {allD.length} sik</span>
                        <span style={{ color: pct >= 90 ? T.green : pct >= 60 ? T.orange : T.red }}>{Math.round(pct)}% ajou</span>
                      </div>
                      <Track pct={pct} color={pct >= 90 ? T.green : pct >= 60 ? T.orange : T.red} />
                    </div>

                    <div className="sab-foot">
                      <span>Touche: <b style={{ color: T.ink, fontFamily: 'var(--display)', fontSize: 17 }}>{fmt(payout)} G</b></span>
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {planDepo > 0 && <Chip color={T.teal} icon={<PiggyBank size={11} />}>{fmt(planDepo)}</Chip>}
                        {Number(plan.penalty) > 0 && <Chip color={T.red}>Amand {fmt(plan.penalty)}</Chip>}
                        {plan.regleman && <Chip color={T.teal} icon={<FileText size={11} />}>Regleman</Chip>}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button className="ke-fab" onClick={() => setShowCreate(true)}><Plus size={20} /> Nouvo plan</button>
        </>
      )}

      {modals}
    </div>
  )
}