// ─────────────────────────────────────────────────────────────
// sabotayTabs.jsx — PlanCalendar, ExchangeTab, AdminCashTab, AdminCashConfig
// ✅ Design "Plus Fit"
// ✅ Kalandriye: klike sou yon jou → wè kiyès ki peye / pa peye / touche
// ✅ FIX: invalidateQueries({ queryKey }) — fòm ansyen an te rafrechi TOUT query (egress)
// ✅ FIX: jodi a = getHaitiNow() (DST-aware)
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Settings, RefreshCw, ChevronLeft, ChevronRight, Repeat, Clock, CheckCircle,
  XCircle, Ban, Landmark, StopCircle, AlertTriangle, Star, Trophy, ArrowLeftRight, Inbox, X,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import {
  D, fmt, getAllPaymentDates, getPayoutDateMap, hasOwnerSlot, apiFetch, API_URL, getHaitiNow,
} from './sabotayUtils'
import { T, hexA } from './kane-epay/kaneEpayConstants'
import { Chip, Spinner, Field, AnimatedNumber } from './kane-epay/KaneEpayComponents'

const TAB_STYLES = `
.st-card{background:#fff;border:1px solid var(--border);border-radius:24px;padding:18px;animation:keIn .45s cubic-bezier(.22,1,.36,1) backwards}
.st-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.st-h{margin:0;font-family:var(--display);font-weight:800;font-size:24px;line-height:1;text-transform:uppercase;letter-spacing:.02em;color:var(--ink)}
.st-nav{width:40px;height:40px;border-radius:13px;border:1px solid var(--border);background:#fff;color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.st-nav:hover{background:var(--night);color:#FFC83D;border-color:var(--night)}
.st-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.st-dow{text-align:center;font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--muted);padding:4px 0;text-transform:uppercase}
.st-day{position:relative;height:clamp(44px,9vw,68px);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:var(--bg);border:1.5px solid var(--bd);color:var(--tc);cursor:default;transition:transform .15s,box-shadow .2s;padding:0;font:inherit}
.st-day.has{cursor:pointer}
.st-day.has:hover{transform:translateY(-2px);box-shadow:0 10px 18px -12px rgba(20,21,26,.4)}
.st-day.sel{box-shadow:0 0 0 3px rgba(255,200,61,.65)}
.st-day b{font-family:var(--display);font-weight:800;font-size:18px;line-height:1}
.st-day .dots{display:flex;gap:2px;align-items:center}
.st-day .dots i{width:5px;height:5px;border-radius:50%}
.st-day .tr{position:absolute;top:4px;right:5px}
@media(max-width:520px){.st-cal{gap:4px}.st-day{border-radius:10px}.st-day b{font-size:15px}.st-day .tr{top:2px;right:3px}}
.st-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;font-size:12px;font-weight:700;color:var(--muted)}
.st-legend span{display:flex;align-items:center;gap:6px}
.st-legend i{width:9px;height:9px;border-radius:50%}
.st-mini-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.st-mini-stats>div{background:#fff;border:1px solid var(--border);border-radius:18px;padding:12px 14px;min-width:0}
.st-mini-stats .v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:30px;line-height:1}
.st-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-radius:16px;background:#fff;border:1px solid var(--border)}
.st-list{display:flex;flex-direction:column;gap:7px}
.st-ex{background:#fff;border:1px solid var(--border);border-radius:20px;padding:14px}
.st-ex-sides{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
.st-ex-side{background:var(--soft);border-radius:14px;padding:10px 12px;min-width:0}
.st-ex-side b{display:block;font-size:14px;font-weight:800;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-cash{position:relative;overflow:hidden;border-radius:24px;padding:20px;background:var(--night);color:#f2f1ec}
.st-cash::after{content:'';position:absolute;right:-60px;top:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.3),transparent 65%)}
.st-cash>*{position:relative;z-index:1}
.st-types{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media(max-width:760px){.st-types{grid-template-columns:repeat(2,minmax(0,1fr))}}
.st-type{background:#fff;border:1px solid var(--border);border-radius:18px;padding:14px;min-width:0}
.st-type-ic{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--tbg);color:var(--tc);margin-bottom:10px}
.st-type .v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:24px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`
function useTabStyles() {
  useMemo(() => {
    if (typeof document === 'undefined' || document.getElementById('st-styles')) return
    const el = document.createElement('style')
    el.id = 'st-styles'
    el.textContent = TAB_STYLES
    document.head.appendChild(el)
  }, [])
}

const dmy = (d) => String(d || '').split('T')[0].split('-').reverse().join('/')
const MWA = ['Janvye', 'Fevriye', 'Mas', 'Avril', 'Me', 'Jen', 'Jiyè', 'Out', 'Septanm', 'Oktòb', 'Novanm', 'Desanm']

// ─────────────────────────────────────────────────────────────
// KALANDRIYE
// ─────────────────────────────────────────────────────────────
export function PlanCalendar({ plan }) {
  useTabStyles()
  const { today } = getHaitiNow()
  const [off, setOff] = useState(0)
  const [selDay, setSelDay] = useState(null)
  const allPayDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const payDateSet  = useMemo(() => new Set(allPayDates), [allPayDates])
  const payoutMap   = useMemo(() => getPayoutDateMap(plan), [plan])

  const members = useMemo(() => (plan.members || []).map(m => ({ ...m, payoutDate: payoutMap[m.position] })), [plan.members, payoutMap])

  // Mwa a baze sou dat Ayiti (pa dat aparèy la)
  const [ty, tm] = today.split('-').map(Number)
  const base = new Date(ty, tm - 1 + off, 1)
  const yr = base.getFullYear(), mo = base.getMonth()
  const firstDay = new Date(yr, mo, 1).getDay()
  const daysInMo = new Date(yr, mo + 1, 0).getDate()

  const tColor = (m, d, past) => {
    if (!m.payments?.[d]) return past ? T.red : T.blue
    const t = m.paymentTimings?.[d]
    return t === 'early' ? '#059669' : t === 'late' ? T.orange : T.green
  }

  const dayInfo = (ds) => {
    const payors  = payDateSet.has(ds) ? members.filter(m => m.status !== 'stopped') : []
    const winners = members.filter(m => m.payoutDate === ds || String(m.declaredPayoutDate || '').split('T')[0] === ds)
    return { payors, winners }
  }

  // Stats mwa a
  const monthDates = allPayDates.filter(d => d.startsWith(`${yr}-${String(mo + 1).padStart(2, '0')}`))
  const actives    = members.filter(m => m.status !== 'stopped')
  const monthPaid  = monthDates.reduce((a, d) => a + actives.filter(m => m.payments?.[d]).length, 0)
  const monthExp   = monthDates.filter(d => d <= today).length * actives.length
  const sel        = selDay ? dayInfo(selDay) : null
  const posOff     = hasOwnerSlot(plan) ? 1 : 0

  return (
    <div className="ke-col" style={{ gap: 14 }}>
      <div className="st-mini-stats">
        <div><p className="ke-label-s">Dat peman</p><p className="v">{monthDates.length}</p></div>
        <div><p className="ke-label-s">Peman fèt</p><p className="v" style={{ color: T.green }}>{monthPaid}</p></div>
        <div><p className="ke-label-s">To mwa a</p><p className="v" style={{ color: monthExp && monthPaid / monthExp < .7 ? T.red : T.goldInk }}>{monthExp ? Math.min(100, Math.round((monthPaid / monthExp) * 100)) : 0}%</p></div>
      </div>

      <div className="st-card">
        <div className="st-head">
          <button className="st-nav" onClick={() => { setOff(o => o - 1); setSelDay(null) }} aria-label="Mwa anvan"><ChevronLeft size={18} /></button>
          <div style={{ textAlign: 'center' }}>
            <h3 className="st-h">{MWA[mo]} {yr}</h3>
            {off !== 0 && <button onClick={() => { setOff(0); setSelDay(null) }} style={{ border: 0, background: 'none', color: T.goldInk, fontWeight: 800, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>Retounen jodi a</button>}
          </div>
          <button className="st-nav" onClick={() => { setOff(o => o + 1); setSelDay(null) }} aria-label="Mwa apre"><ChevronRight size={18} /></button>
        </div>

        <div className="st-cal" style={{ marginBottom: 6 }}>
          {['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'].map(d => <div key={d} className="st-dow">{d}</div>)}
        </div>
        <div className="st-cal">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMo }).map((_, i) => {
            const day = i + 1
            const ds  = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isTd = ds === today
            const { payors, winners } = dayInfo(ds)
            const hasA  = payors.length > 0
            const past  = ds < today
            const allP  = hasA && payors.every(m => m.payments?.[ds])
            const someP = payors.some(m => m.payments?.[ds])
            let bg = 'transparent', bd = 'transparent', tc = D.muted
            if (isTd)                           { bg = D.night; bd = D.night; tc = '#FFC83D' }
            else if (hasA && allP)              { bg = hexA(T.green, .1);  bd = hexA(T.green, .3);  tc = T.green }
            else if (hasA && someP)             { bg = hexA(T.orange, .1); bd = hexA(T.orange, .3); tc = T.orange }
            else if (hasA && past)              { bg = hexA(T.red, .08);   bd = hexA(T.red, .28);   tc = T.red }
            else if (hasA)                      { bg = D.soft;             bd = 'rgba(20,21,26,.1)'; tc = D.text }
            else if (winners.length)            { bg = '#fffaf0';          bd = hexA(T.goldDeep, .35); tc = T.goldInk }
            const clickable = hasA || winners.length > 0
            return (
              <button key={day} type="button" disabled={!clickable}
                className={`st-day ${clickable ? 'has' : ''} ${selDay === ds ? 'sel' : ''}`}
                style={{ '--bg': bg, '--bd': bd, '--tc': tc }}
                onClick={() => setSelDay(s => s === ds ? null : ds)}>
                {winners.length > 0 && <Trophy size={10} className="tr" color={isTd ? '#FFC83D' : T.goldDeep} />}
                <b>{day}</b>
                {hasA && (
                  <span className="dots">
                    {payors.slice(0, 3).map(m => <i key={m.id} style={{ background: tColor(m, ds, past) }} />)}
                    {payors.length > 3 && <span style={{ fontSize: 9, fontWeight: 800, color: isTd ? '#f2f1ec' : D.muted }}>+{payors.length - 3}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="st-legend">
          {[['#059669', 'Bonè'], [T.green, 'A lè'], [T.orange, 'Reta'], [T.red, 'Pa peye'], [T.blue, 'Pwochen']].map(([c, l]) => (
            <span key={l}><i style={{ background: c }} />{l}</span>
          ))}
          <span><Trophy size={12} color={T.goldDeep} /> Dat touche</span>
        </div>
      </div>

      {sel && (
        <div className="st-card" style={{ animationDelay: '0s' }}>
          <div className="st-head" style={{ marginBottom: 10 }}>
            <div>
              <span className="ke-label-s">{selDay === today ? 'Jodi a' : 'Jou chwazi'}</span>
              <h3 className="st-h" style={{ marginTop: 4 }}>{dmy(selDay)}</h3>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {sel.payors.length > 0 && <Chip color={T.green}>{sel.payors.filter(m => m.payments?.[selDay]).length}/{sel.payors.length} peye</Chip>}
              <button className="st-nav" style={{ width: 34, height: 34 }} onClick={() => setSelDay(null)} aria-label="Fèmen"><X size={15} /></button>
            </div>
          </div>
          {sel.winners.length > 0 && (
            <div className="st-list" style={{ marginBottom: 10 }}>
              {sel.winners.map(w => (
                <div key={w.id} className="st-row" style={{ background: D.night, borderColor: D.night, color: '#f2f1ec' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, minWidth: 0 }}><Trophy size={15} color="#FFC83D" /> {w.name}</span>
                  <Chip dark>{w.hasWon ? 'Touche' : 'Ap touche'}</Chip>
                </div>
              ))}
            </div>
          )}
          <div className="st-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {[...sel.payors].sort((a, b) => Number(!!a.payments?.[selDay]) - Number(!!b.payments?.[selDay])).map(m => {
              const paid = !!m.payments?.[selDay]
              const c = tColor(m, selDay, selDay < today)
              return (
                <div key={m.id} className="st-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <b style={{ fontFamily: 'var(--display)', fontSize: 17, color: D.muted, flexShrink: 0 }}>{m.isOwnerSlot ? '★' : `#${m.position - posOff}`}</b>
                    <span style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  </span>
                  <Chip color={c} icon={paid ? <CheckCircle size={11} /> : <Clock size={11} />}>
                    {paid ? (m.paymentTimings?.[selDay] === 'early' ? 'Bonè' : m.paymentTimings?.[selDay] === 'late' ? 'Reta' : 'Peye') : selDay < today ? 'Pa peye' : 'Ap tann'}
                  </Chip>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXCHANGE TAB
// ─────────────────────────────────────────────────────────────
export function ExchangeTab({ plan }) {
  useTabStyles()
  const { token } = useAuthStore.getState()
  const slug  = localStorage.getItem('plusgroup-slug')
  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' }

  // ⚠️ EGRESS — pa gen refetchInterval; bouton Rafrechi disponib
  const { data: exchanges = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['sol-exchanges', plan.id],
    queryFn: async () => {
      const res    = await fetch(`${API_URL}/sol/admin/exchange?planId=${plan.id}`, { headers: authH })
      const d      = await res.json()
      const result = d.exchanges || d || []
      return Array.isArray(result) ? result : []
    },
  })

  const [showConfig, setShowConfig] = useState(false)
  const [cfg, setCfg] = useState({ exchangeFeePct: plan.exchangeFeePct ?? 10, exchangeFeeAdminPct: plan.exchangeFeeAdminPct ?? 50 })
  const qc = useQueryClient()

  const saveConfig = useMutation({
    mutationFn: () => apiFetch(`/sabotay/plans/${plan.id}/exchange-config`, { method: 'PATCH', body: JSON.stringify(cfg) }),
    onSuccess: () => {
      // ⚠️ EGRESS — patch lokal (2 chan sèlman) olye rechaje tout plan yo
      qc.setQueryData(['sabotay-plans'], (old) =>
        Array.isArray(old) ? old.map(p => p.id === plan.id ? { ...p, ...cfg } : p) : old)
      setShowConfig(false); toast.success('Konfigirasyon sove!')
    },
    onError: e => toast.error(e.message),
  })

  const STATUS = {
    pending:   { label: 'Annatant', color: T.orange, icon: <Clock size={11} /> },
    accepted:  { label: 'Aksepte',  color: T.green,  icon: <CheckCircle size={11} /> },
    rejected:  { label: 'Refize',   color: T.red,    icon: <XCircle size={11} /> },
    cancelled: { label: 'Anile',    color: T.muted,  icon: <Ban size={11} /> },
  }

  const pending  = exchanges.filter(e => e.status === 'pending')
  const history  = exchanges.filter(e => e.status !== 'pending')
  const accepted = exchanges.filter(e => e.status === 'accepted')

  const calcFee = (ex) => {
    const feePerSlot = plan.exchangeFeePct ?? 10
    const adminPct   = (plan.exchangeFeeAdminPct ?? 50) / 100
    const base       = Math.abs(ex.receiverPosition - ex.initiatorPosition) * feePerSlot
    return { total: Math.round(base), toAdmin: Math.round(base * adminPct), toMember: Math.round(base * (1 - adminPct)) }
  }
  const getMember = (pos) => plan.members?.find(m => m.position === pos)
  const dt = (d) => new Date(d).toLocaleDateString('fr-HT')

  return (
    <div className="ke-col" style={{ gap: 14 }}>
      <div className="st-mini-stats">
        <div><p className="ke-label-s">Total</p><p className="v">{exchanges.length}</p></div>
        <div><p className="ke-label-s">Annatant</p><p className="v" style={{ color: T.orange }}>{pending.length}</p></div>
        <div><p className="ke-label-s">Aksepte</p><p className="v" style={{ color: T.green }}>{accepted.length}</p></div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="ke-btn ke-btn-soft" style={{ height: 40 }} onClick={() => refetch()}><RefreshCw size={14} className={isFetching ? 'ke-spin' : ''} /> Rafrechi</button>
        <button className={`ke-btn ${showConfig ? 'ke-btn-dark' : 'ke-btn-soft'}`} style={{ height: 40 }} onClick={() => setShowConfig(s => !s)}><Settings size={14} /> Frè echanj</button>
      </div>

      {showConfig && (
        <div className="st-card">
          <h3 className="st-h" style={{ fontSize: 20, marginBottom: 14 }}>Konfigirasyon frè echanj</h3>
          <div className="ke-two-r">
            <Field label="Frè pa plas (HTG)">
              <input type="number" min="0" className="ke-input" value={cfg.exchangeFeePct} onChange={e => setCfg(p => ({ ...p, exchangeFeePct: Number(e.target.value) }))} />
            </Field>
            <Field label="Pati admin (%)" hint={`Manm ki desann nan resevwa ${100 - Number(cfg.exchangeFeeAdminPct || 0)}%`}>
              <input type="number" min="0" max="100" className="ke-input" value={cfg.exchangeFeeAdminPct} onChange={e => setCfg(p => ({ ...p, exchangeFeeAdminPct: Number(e.target.value) }))} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="ke-fbtn" onClick={() => setShowConfig(false)}>Anile</button>
            <button className="ke-fbtn main dark" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? <Spinner size={16} /> : <Settings size={16} />} {saveConfig.isPending ? 'Ap sove...' : 'Sove'}
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="ke-col" style={{ gap: 8 }}>
          <span className="ke-label-s" style={{ color: T.orange }}>Annatant ({pending.length})</span>
          {pending.map(ex => {
            const fee = calcFee(ex); const mInit = getMember(ex.initiatorPosition); const mRecv = getMember(ex.receiverPosition)
            return (
              <div key={ex.id} className="st-ex" style={{ borderColor: hexA(T.orange, .35) }}>
                <div className="st-ex-sides">
                  <div className="st-ex-side"><span className="ke-label-s">Inisye</span><b>#{ex.initiatorPosition} {mInit?.name || '—'}</b></div>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: D.night, color: '#FFC83D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeftRight size={17} /></div>
                  <div className="st-ex-side"><span className="ke-label-s">Lòt manm</span><b>#{ex.receiverPosition} {mRecv?.name || '—'}</b></div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                  <Chip color={T.orange}>Frè {fmt(fee.total)} G</Chip>
                  <Chip color={T.goldDeep}>Admin {fmt(fee.toAdmin)} G</Chip>
                  <Chip color={T.green}>Manm {fmt(fee.toMember)} G</Chip>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: D.muted, fontWeight: 600 }}>{dt(ex.createdAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="ke-col" style={{ gap: 8 }}>
          <span className="ke-label-s">Istwa ({history.length})</span>
          <div className="st-list">
            {history.map(ex => {
              const fee = calcFee(ex); const mInit = getMember(ex.initiatorPosition); const mRecv = getMember(ex.receiverPosition); const st = STATUS[ex.status] || STATUS.cancelled
              return (
                <div key={ex.id} className="st-row" style={{ flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <b style={{ fontFamily: 'var(--display)', fontSize: 17, flexShrink: 0 }}>#{ex.initiatorPosition} ⇄ #{ex.receiverPosition}</b>
                    <span style={{ fontSize: 12.5, color: D.muted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mInit?.name || '?'} · {mRecv?.name || '?'}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ex.status === 'accepted' && <b style={{ fontFamily: 'var(--display)', fontSize: 16, color: T.green }}>{fmt(fee.total)} G</b>}
                    <Chip color={st.color} icon={st.icon}>{st.label}</Chip>
                    <span style={{ fontSize: 11.5, color: D.muted }}>{dt(ex.createdAt)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={22} color={T.goldDeep} /></div>}
      {!isLoading && exchanges.length === 0 && (
        <div className="ke-empty">
          <div className="ke-empty-ic"><Repeat size={28} /></div>
          <h3>Pa gen echanj</h3>
          <p>Pa gen okenn demann echanj pozisyon pou plan sa a.</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADMIN CASH TAB
// ─────────────────────────────────────────────────────────────
export function AdminCashTab({ plan }) {
  useTabStyles()
  const { token } = useAuthStore.getState()
  const slug  = localStorage.getItem('plusgroup-slug')
  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-cash', plan.id],
    queryFn: async () => { const res = await fetch(`${API_URL}/sabotay/admin-cash?planId=${plan.id}`, { headers: authH }); return res.json() },
  })

  const TYPE_LABELS = {
    stop_penalty:   { label: 'Penalite kanpe', color: T.orange,   icon: <StopCircle size={17} /> },
    exchange_fee:   { label: 'Frè echanj',     color: T.blue,     icon: <Repeat size={17} /> },
    late_fine:      { label: 'Amand reta',     color: T.red,      icon: <AlertTriangle size={17} /> },
    fee_per_member: { label: 'Frè pwopriyetè', color: T.goldDeep, icon: <Star size={17} /> },
  }

  if (isLoading) return (
    <div className="ke-col" style={{ gap: 12 }}>
      <div className="ke-skel" style={{ height: 130, borderRadius: 24 }} />
      <div className="st-types">{[0, 1, 2, 3].map(i => <div key={i} className="ke-skel" style={{ height: 110, borderRadius: 18 }} />)}</div>
    </div>
  )

  const total   = data?.totalGlobal || 0
  const byType  = data?.byType || {}
  const entries = data?.entries || []

  return (
    <div className="ke-col" style={{ gap: 14 }}>
      <div className="st-cash ke-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <span className="ke-eyebrow" style={{ color: '#FFC83D' }}><Landmark size={13} /> Kès admin</span>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(242,241,236,.6)', fontWeight: 600 }}>{plan.name}</p>
          </div>
          <button className="ke-btn ke-btn-glass sq" onClick={() => refetch()} title="Rafrechi"><RefreshCw size={16} className={isFetching ? 'ke-spin' : ''} /></button>
        </div>
        <p style={{ margin: '14px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'clamp(42px,9vw,60px)', lineHeight: 1, color: '#FFC83D' }}>
          <AnimatedNumber value={total} format={fmt} /><small style={{ fontSize: 16, color: 'rgba(242,241,236,.55)', marginLeft: 6 }}>HTG</small>
        </p>
      </div>

      <div className="st-types">
        {Object.entries(TYPE_LABELS).map(([type, cfg], i) => (
          <div key={type} className="st-type ke-in" style={{ '--tc': cfg.color, '--tbg': hexA(cfg.color, .1), animationDelay: `${.05 + i * .04}s` }}>
            <div className="st-type-ic">{cfg.icon}</div>
            <p className="ke-label-s">{cfg.label}</p>
            <p className="v" style={{ color: byType[type] > 0 ? cfg.color : D.muted }}>{fmt(byType[type] || 0)}</p>
          </div>
        ))}
      </div>

      <div className="st-card">
        <div className="st-head" style={{ marginBottom: 10 }}>
          <h3 className="st-h" style={{ fontSize: 20 }}>Istwa <span style={{ color: D.muted }}>({entries.length})</span></h3>
        </div>
        {entries.length === 0 ? (
          <div className="ke-empty" style={{ border: 0, padding: '16px 0' }}>
            <div className="ke-empty-ic"><Inbox size={26} /></div>
            <h3>Pa gen mouvman</h3>
            <p>Penalite, amand ak frè ap parèt isit la.</p>
          </div>
        ) : (
          <div className="st-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {entries.map(e => {
              const cfg = TYPE_LABELS[e.type] || { label: e.type, color: T.muted, icon: <Landmark size={17} /> }
              return (
                <div key={e.id} className="st-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span className="st-type-ic" style={{ '--tc': cfg.color, '--tbg': hexA(cfg.color, .1), margin: 0, flexShrink: 0 }}>{cfg.icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.memberName || '—'}</b>
                      <span style={{ fontSize: 12, color: D.muted, fontWeight: 600 }}>{cfg.label} · {new Date(e.createdAt).toLocaleDateString('fr-HT')}</span>
                    </span>
                  </span>
                  <b style={{ fontFamily: 'var(--display)', fontSize: 19, color: cfg.color, whiteSpace: 'nowrap' }}>+{fmt(e.amount)}</b>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AdminCashConfig plan={plan} authH={authH} />
    </div>
  )
}

export function AdminCashConfig({ plan, authH }) {
  const qc = useQueryClient()
  const [pct, setPct] = useState(plan.stopPenaltyPct || 0)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/sabotay/plans/${plan.id}`, { method: 'PUT', headers: authH, body: JSON.stringify({ stopPenaltyPct: Number(pct) }) })
      if (!res.ok) throw new Error()
      // ⚠️ EGRESS — patch lokal olye rechaje tout plan yo
      qc.setQueryData(['sabotay-plans'], (old) =>
        Array.isArray(old) ? old.map(p => p.id === plan.id ? { ...p, stopPenaltyPct: Number(pct) } : p) : old)
      toast.success('% penalite sove!')
    } catch { toast.error('Erè pandan sovgad la') }
    finally { setSaving(false) }
  }

  return (
    <div className="st-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: hexA(T.orange, .1), color: T.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={17} /></div>
        <h3 className="st-h" style={{ fontSize: 20 }}>Penalite kanpe (%)</h3>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}>
          <Field hint={Number(pct) > 0 ? `Egzanp: 1 000 HTG → penalite ${fmt(1000 * Number(pct) / 100)} HTG` : 'Pa gen penalite (0%)'}>
            <input type="number" min="0" max="100" className="ke-input" value={pct} onChange={e => setPct(e.target.value)} />
          </Field>
        </div>
        <button className="ke-btn ke-btn-dark" style={{ height: 48 }} onClick={save} disabled={saving}>
          {saving ? <Spinner size={15} /> : <CheckCircle size={16} />} {saving ? 'Ap sove...' : 'Sove'}
        </button>
      </div>
    </div>
  )
}