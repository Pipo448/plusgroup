// ─────────────────────────────────────────────────────────────
// sabotayTabs.jsx — PlanCalendar, ExchangeTab, AdminCashTab, AdminCashConfig
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Settings, RefreshCw, Loader, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import {
  D, inp, lbl, fmt,
  getAllPaymentDates, getPayoutDate, getPayoutDateMap,
  apiFetch, API_URL,
} from './sabotayUtils'

// ─────────────────────────────────────────────────────────────
// KALANDRIYE
// ─────────────────────────────────────────────────────────────
export function PlanCalendar({ plan }) {
  const [off, setOff] = useState(0)
  const today      = new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0]
  const allPayDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const payoutMap   = useMemo(() => getPayoutDateMap(plan), [plan])

  const mDates = useMemo(() => (plan.members || []).map(m => ({
    ...m, payDates: allPayDates, payoutDate: payoutMap[m.position],
  })), [plan, allPayDates, payoutMap])

  const now = new Date(); now.setMonth(now.getMonth() + off)
  const yr = now.getFullYear(), mo = now.getMonth()
  const monthStr  = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay  = new Date(yr, mo, 1).getDay()
  const daysInMo  = new Date(yr, mo + 1, 0).getDate()

  const tColor = (m, d, past) => {
    if (!m.payments?.[d]) return past ? D.red : D.blue
    const t = m.paymentTimings?.[d]
    return t === 'early' ? '#00d084' : t === 'onTime' ? D.green : t === 'late' ? D.orange : D.green
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setOff(o => o - 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} /></button>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#fff', textTransform: 'capitalize' }}>{monthStr}</span>
        <button onClick={() => setOff(o => o + 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: D.muted, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ aspectRatio: '1', borderRadius: 8 }} />)}
        {Array.from({ length: daysInMo }).map((_, i) => {
          const day = i + 1
          const ds  = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isTd    = ds === today
          const payors  = mDates.filter(m => m.payDates.includes(ds) && m.status !== 'stopped')
          const winners = mDates.filter(m => m.payoutDate === ds)
          const hasA    = payors.length > 0
          const past    = ds < today
          const allP    = hasA && payors.every(m => m.payments?.[ds])
          const someP   = payors.some(m => m.payments?.[ds])
          let bg = 'transparent', bc = 'transparent', tc = D.muted
          if (isTd) { bg = D.goldDim; bc = D.gold; tc = D.gold }
          else if (winners.length > 0 && !hasA) { bg = 'rgba(201,168,76,0.15)'; bc = `${D.gold}60`; tc = D.gold }
          else if (hasA && allP)  { bg = D.greenBg;  bc = `${D.green}40`;  tc = D.green }
          else if (hasA && someP) { bg = D.orangeBg; bc = `${D.orange}40`; tc = D.orange }
          else if (hasA && past)  { bg = D.redBg;    bc = `${D.red}40`;    tc = D.red }
          else if (hasA)          { bg = 'rgba(59,130,246,0.08)'; bc = 'rgba(59,130,246,0.25)'; tc = D.blue }
          return (
            <div key={day} className="cal-day" style={{ aspectRatio: '1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${bc}` }}>
              <span style={{ fontSize: 11, fontWeight: isTd || hasA ? 800 : 400, color: tc }}>{day}</span>
              {winners.length > 0 && <span style={{ fontSize: 8, color: D.gold }}>🏆</span>}
              {hasA && <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
                {payors.slice(0, 3).map(m => <div key={m.id} style={{ width: 4, height: 4, borderRadius: '50%', background: tColor(m, ds, past) }} />)}
                {payors.length > 3 && <span style={{ fontSize: 7, color: D.muted }}>+{payors.length - 3}</span>}
              </div>}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, fontSize: 10, color: D.muted }}>
        {[['#00d084', 'Bonè ⚡'], [D.green, 'Atètan ✅'], [D.orange, 'Reta ⚠️'], [D.red, 'Pa Peye'], [D.blue, 'Pwochen'], [D.gold, '🏆 Dat Touche']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXCHANGE TAB
// ─────────────────────────────────────────────────────────────
export function ExchangeTab({ plan }) {
  const { token } = useAuthStore.getState ? useAuthStore.getState() : useAuthStore()
  const slug  = localStorage.getItem('plusgroup-slug')
  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' }

  const { data: exchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['sol-exchanges', plan.id],
    queryFn: async () => {
      const res    = await fetch(`${API_URL}/sol/admin/exchange?planId=${plan.id}`, { headers: authH })
      const d      = await res.json()
      const result = d.exchanges || d || []
      return Array.isArray(result) ? result : []
    },
    refetchInterval: 30000,
  })

  const [showConfig, setShowConfig] = useState(false)
  const [cfg, setCfg] = useState({ exchangeFeePct: plan.exchangeFeePct ?? 10, exchangeFeeAdminPct: plan.exchangeFeeAdminPct ?? 50 })
  const qc = useQueryClient()

  const saveConfig = useMutation({
    mutationFn: () => apiFetch(`/sabotay/plans/${plan.id}/exchange-config`, {
      method: 'PATCH', body: JSON.stringify(cfg),
    }),
    onSuccess: () => { qc.invalidateQueries(['sabotay-plans']); setShowConfig(false); toast.success('✅ Konfigirasyon sove!') },
    onError:   e => toast.error(e.message),
  })

  const STATUS = {
    pending:   { label: 'Annatandan', color: D.orange, bg: D.orangeBg,            icon: '⏳' },
    accepted:  { label: 'Aksepte',    color: D.green,  bg: D.greenBg,             icon: '✅' },
    rejected:  { label: 'Refize',     color: D.red,    bg: D.redBg,               icon: '❌' },
    cancelled: { label: 'Anile',      color: D.muted,  bg: 'rgba(255,255,255,0.04)', icon: '🚫' },
  }

  const pending = exchanges.filter(e => e.status === 'pending')
  const history = exchanges.filter(e => e.status !== 'pending')

  const calcFee = (ex) => {
    const feePerSlot = plan.exchangeFeePct ?? 10
    const adminPct   = (plan.exchangeFeeAdminPct ?? 50) / 100
    const diff       = Math.abs(ex.receiverPosition - ex.initiatorPosition)
    const base       = diff * feePerSlot
    return { total: Math.round(base), toAdmin: Math.round(base * adminPct), toMember: Math.round(base * (1 - adminPct)) }
  }

  const getMember = (pos) => plan.members?.find(m => m.position === pos)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Total', val: exchanges.length, color: D.blue }, { label: 'Annatandan', val: pending.length, color: D.orange }, { label: 'Aksepte', val: exchanges.filter(e => e.status === 'accepted').length, color: D.green }].map(({ label, val, color }) => (
            <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 9, padding: '7px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color }}>{val}</div>
              <div style={{ fontSize: 9, color: D.muted, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowConfig(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
          <Settings size={13} /> Konfigire Frè
        </button>
      </div>

      {showConfig && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: D.blue, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={12} /> Konfigirasyon Frè Echanj
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>Frè Echanj pa Plas (HTG)</label>
              <input type="number" min="0" style={{ ...inp, color: D.orange }} value={cfg.exchangeFeePct} onChange={e => setCfg(p => ({ ...p, exchangeFeePct: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={lbl}>Pati Admin (%)</label>
              <input type="number" min="0" max="100" style={{ ...inp, color: D.gold }} value={cfg.exchangeFeeAdminPct} onChange={e => setCfg(p => ({ ...p, exchangeFeeAdminPct: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => setShowConfig(false)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
            <button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', background: saveConfig.isPending ? 'rgba(59,130,246,0.3)' : `linear-gradient(135deg,${D.blue},#1d4ed8)`, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {saveConfig.isPending ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Settings size={13} />}
              {saveConfig.isPending ? 'Ap sove...' : 'Sove Konfigirasyon'}
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.orange, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>⏳ Annatandan ({pending.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pending.map(ex => {
              const fee = calcFee(ex); const mInit = getMember(ex.initiatorPosition); const mRecv = getMember(ex.receiverPosition)
              return (
                <div key={ex.id} style={{ background: D.card, border: `1px solid ${D.orange}30`, borderRadius: 12, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '7px 10px' }}>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 2 }}>Inisye</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>#{ex.initiatorPosition} {mInit?.name || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 18 }}>⇄</div>
                      <div style={{ fontSize: 9, color: D.orange, fontWeight: 700 }}>Frè: {fmt(fee.total)} HTG</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '7px 10px' }}>
                      <div style={{ fontSize: 10, color: D.muted, marginBottom: 2 }}>Lòt Manm</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: D.text }}>#{ex.receiverPosition} {mRecv?.name || '—'}</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '7px 11px', fontSize: 10, color: D.muted, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>Frè total: <strong style={{ color: D.orange }}>{fmt(fee.total)} HTG</strong></span>
                    <span>→ Admin: <strong style={{ color: D.gold }}>{fmt(fee.toAdmin)} HTG</strong></span>
                    <span>→ Manm desann: <strong style={{ color: D.green }}>{fmt(fee.toMember)} HTG</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: D.muted }}>📅 {new Date(ex.createdAt).toLocaleDateString('fr-HT')}</span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: STATUS[ex.status]?.bg, color: STATUS[ex.status]?.color }}>
                      {STATUS[ex.status]?.icon} {STATUS[ex.status]?.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Istwa ({history.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {history.map(ex => {
              const fee = calcFee(ex); const mInit = getMember(ex.initiatorPosition); const mRecv = getMember(ex.receiverPosition); const st = STATUS[ex.status] || STATUS.cancelled
              return (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '9px 13px', border: `1px solid ${D.borderSub}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: D.text, minWidth: 80 }}>#{ex.initiatorPosition} → #{ex.receiverPosition}</span>
                  <span style={{ fontSize: 11, color: D.muted, flex: 1, minWidth: 100 }}>{mInit?.name || '?'} ⇄ {mRecv?.name || '?'}</span>
                  {ex.status === 'accepted' && <span style={{ fontSize: 10, color: D.green, fontFamily: 'monospace', fontWeight: 700 }}>{fmt(fee.total)} HTG</span>}
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: st.bg, color: st.color, flexShrink: 0 }}>{st.icon} {st.label}</span>
                  <span style={{ fontSize: 9, color: D.muted, flexShrink: 0 }}>{new Date(ex.createdAt).toLocaleDateString('fr-HT')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && exchanges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: D.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13 }}>Pa gen echanj pozisyon pou plan sa a.</p>
        </div>
      )}
      {isLoading && <div style={{ textAlign: 'center', padding: 24 }}><Loader size={22} style={{ color: D.gold, animation: 'spin 0.8s linear infinite' }} /></div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADMIN CASH TAB
// ─────────────────────────────────────────────────────────────
export function AdminCashTab({ plan }) {
  const { token } = useAuthStore.getState()
  const slug  = localStorage.getItem('plusgroup-slug')
  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-cash', plan.id],
    queryFn: async () => { const res = await fetch(`${API_URL}/sabotay/admin-cash?planId=${plan.id}`, { headers: authH }); return res.json() },
    refetchInterval: 30000,
  })

  const TYPE_LABELS = {
    stop_penalty:   { label: 'Penalite Kanpe',  color: D.orange, icon: '⏸️' },
    exchange_fee:   { label: 'Frè Echanj',      color: D.blue,   icon: '🔄' },
    late_fine:      { label: 'Amand Reta',       color: D.red,    icon: '⚠️' },
    fee_per_member: { label: 'Frè Pwopriyete',  color: D.gold,   icon: '⭐' },
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 32 }}><Loader size={22} style={{ color: D.gold, animation: 'spin 0.8s linear infinite' }} /></div>

  const total   = data?.totalGlobal || 0
  const byType  = data?.byType || {}
  const entries = data?.entries || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.05))', border: `1px solid ${D.gold}40`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>💰 Total Kès Admin</p>
          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Plan: {plan.name}</p>
        </div>
        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: D.gold }}>{fmt(total)} HTG</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
        {Object.entries(TYPE_LABELS).map(([type, cfg]) => (
          <div key={type} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{cfg.icon}</div>
            <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{cfg.label}</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: byType[type] > 0 ? cfg.color : D.muted }}>{fmt(byType[type] || 0)} HTG</div>
          </div>
        ))}
      </div>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Istwa ({entries.length})</p>
          <button onClick={refetch} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={12} /></button>
        </div>
        {entries.length === 0
          ? <div style={{ textAlign: 'center', padding: '28px 0', color: D.muted }}><p style={{ margin: 0, fontSize: 13 }}>Pa gen mouvman pou kounye a.</p></div>
          : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {entries.map(e => {
                const cfg = TYPE_LABELS[e.type] || { label: e.type, color: D.muted, icon: '💵' }
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${D.borderSub}`, gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.memberName || '—'}</div>
                        <div style={{ fontSize: 10, color: D.muted }}>{cfg.label}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: cfg.color }}>+{fmt(e.amount)} HTG</div>
                      <div style={{ fontSize: 9, color: D.muted }}>{new Date(e.createdAt).toLocaleDateString('fr-HT')}</div>
                    </div>
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
      await fetch(`${API_URL}/sabotay/plans/${plan.id}`, { method: 'PUT', headers: authH, body: JSON.stringify({ stopPenaltyPct: Number(pct) }) })
      qc.invalidateQueries(['sabotay-plans'])
      toast.success('✅ % Penalite sove!')
    } catch { toast.error('Erè sove') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'rgba(243,156,18,0.06)', border: `1px solid ${D.orange}30`, borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: D.orange, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>⚙️ Konfigirasyon Penalite Kanpe</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>% Penalite si Manm Kanpe</label>
          <input type="number" min="0" max="100" style={{ ...inp, color: D.orange }} value={pct} onChange={e => setPct(e.target.value)} />
          <p style={{ fontSize: 10, color: D.muted, margin: '4px 0 0' }}>{Number(pct) > 0 ? `Egzanp: 1000 HTG → Penalite ${fmt(1000 * Number(pct) / 100)} HTG` : 'Pa gen penalite (0%)'}</p>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, minHeight: 42, flexShrink: 0 }}>
          {saving ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
          {saving ? 'Ap sove...' : 'Sove'}
        </button>
      </div>
    </div>
  )
}
