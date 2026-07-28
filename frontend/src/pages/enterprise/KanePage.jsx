// src/pages/enterprise/KanePage.jsx
// Epay Jounalye — Kontra Epay Fòse Chak Jou (ak Bonis Fidelite)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Wallet, Plus, Search, RefreshCw, X, Trophy, Ban, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

// 3mo→2, 6mo→5, 9mo→10, 12mo→15, 24mo→20 (jou bonus) — dwe menm ak backend lan
const BONUS_DAYS = { 3: 2, 6: 5, 9: 10, 12: 15, 24: 20 }
const DURATIONS = [3, 6, 9, 12, 24]

const C = {
  modalBg: '#0f1c2e', modalBorder: 'rgba(255,255,255,0.08)', overlay: 'rgba(0,0,0,0.85)',
  input: '#0d1829', inputBorder: 'rgba(255,255,255,0.1)',
  secBg: 'rgba(255,255,255,0.03)', secBorder: 'rgba(255,255,255,0.07)',
  text: '#e8eaf0', muted: '#6b7a99', label: 'rgba(201,168,76,0.75)',
  gold: '#C9A84C', goldBtn: 'linear-gradient(135deg,#C9A84C,#8B6914)',
  card: 'rgba(13,27,42,0.7)', cardBorder: 'rgba(201,168,76,0.18)',
  green: '#27ae60', red: '#C0392B',
}

const STATUS_STYLE = {
  active:    { bg: 'rgba(201,168,76,0.15)', color: C.gold, label: 'Aktif' },
  completed: { bg: 'rgba(39,174,96,0.15)',  color: C.green, label: 'Fini' },
  cancelled: { bg: 'rgba(192,57,43,0.15)',  color: C.red, label: 'Anile' },
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT')

const baseInput = {
  padding: '10px 13px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
  background: C.input, border: `1px solid ${C.inputBorder}`, color: C.text,
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

const Field = ({ label, half, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: half ? '1 1 calc(50% - 5px)' : '1 1 100%', minWidth: half ? 120 : 0 }}>
    <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: C.label }}>{label}</label>
    {children}
  </div>
)

/* ─── GRID KALANDRIYE (30 kazye pou yon sik) ─── */
function CycleGrid({ cycle, compact }) {
  const cellStyle = (status) => ({
    width: compact ? 10 : 26, height: compact ? 10 : 26, borderRadius: compact ? 3 : 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: compact ? 0 : 9, fontWeight: 700,
    background: status === 'paid' ? 'rgba(39,174,96,0.85)'
              : status === 'missed' ? 'rgba(192,57,43,0.85)'
              : 'rgba(255,255,255,0.05)',
    border: status === 'pending' ? `1px dashed ${C.cardBorder}` : 'none',
    color: '#fff',
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 30 : 10}, 1fr)`, gap: compact ? 2 : 4 }}>
      {cycle.cells.map(cell => (
        <div key={cell.dayNumber} style={cellStyle(cell.status)} title={`Jou ${cell.dayNumber} — ${cell.status}`}>
          {!compact && (cell.status === 'paid' ? '✓' : cell.status === 'missed' ? '✕' : cell.dayNumber)}
        </div>
      ))}
    </div>
  )
}

/* ─── MODAL DETAY KONTRA + PEMAN ─── */
function ContractDetailModal({ contractId, onClose }) {
  const qc = useQueryClient()
  const [openCycles, setOpenCycles] = useState({})
  const [payDays, setPayDays] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['epay-jounalye', contractId],
    queryFn: () => api.get(`/kane/${contractId}`).then(r => r.data.contract),
  })

  const payMutation = useMutation({
    mutationFn: (daysCount) => api.post(`/kane/${contractId}/pay`, { daysCount }),
    onSuccess: (res) => {
      const n = res?.data?.daysPaid || 1
      toast.success(n > 1 ? `${n} jou anrejistre!` : 'Pèman jodi a anrejistre!')
      setPayDays(1)
      qc.invalidateQueries({ queryKey: ['epay-jounalye', contractId] })
      qc.invalidateQueries({ queryKey: ['epay-jounalye-list'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erè pèman.'),
  })

  if (isLoading || !data) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ color: C.muted }}>Chajman...</div>
      </div>
    )
  }

  const activeCycleIdx = Math.min(Math.floor(data.daysPaid / 30), data.calendar.length - 1)

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.modalBg, border: `1px solid ${C.modalBorder}`, borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.modalBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{data.clientFirstName} {data.clientLastName}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>#{data.contractNumber} · {data.durationMonths} mwa · {fmt(data.dailyAmount)} {data.currency}/jou</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.muted, cursor: 'pointer', width: 32, height: 32, borderRadius: 8 }}><X size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bonis banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
            background: data.bonusStillEligible ? 'rgba(201,168,76,0.1)' : 'rgba(192,57,43,0.08)',
            border: `1px solid ${data.bonusStillEligible ? 'rgba(201,168,76,0.3)' : 'rgba(192,57,43,0.25)'}`,
          }}>
            {data.bonusStillEligible ? <Trophy size={18} color={C.gold} /> : <Ban size={18} color={C.red} />}
            <div style={{ fontSize: 13 }}>
              {data.bonusStillEligible
                ? <span style={{ color: C.gold }}>Bonis fidelite toujou aktif — <strong>+{data.bonusDaysEligible} jou</strong> ({fmt(data.bonusDaysEligible * data.dailyAmount)} {data.currency}) si li kontinye san rate.</span>
                : <span style={{ color: C.red }}>Bonis fidelite pèdi — kliyan an rate omwen yon jou. Li ap resevwa kòb li san bonis.</span>}
            </div>
          </div>

          {/* Estatistik */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'Jou Peye', val: `${data.daysPaid}/${data.totalDaysPlanned}` },
              { label: 'Total Peye', val: `${fmt(data.totalPaid)} ${data.currency}` },
              { label: 'Objektif', val: `${fmt(data.totalObjective)} ${data.currency}` },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{s.val}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Kalandriye pa sik */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.calendar.map((cycle, idx) => {
              const isActive = idx === activeCycleIdx
              const isOpen = openCycles[idx] ?? isActive
              const paidCount = cycle.cells.filter(c => c.status === 'paid').length
              const missedCount = cycle.cells.filter(c => c.status === 'missed').length
              return (
                <div key={cycle.cycleNumber} style={{ background: C.secBg, border: `1px solid ${C.secBorder}`, borderRadius: 10, padding: 12 }}>
                  <div
                    onClick={() => setOpenCycles(o => ({ ...o, [idx]: !isOpen }))}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isOpen ? 10 : 0 }}
                  >
                    <span style={{ color: C.gold, fontWeight: 700, fontSize: 12 }}>Sik {cycle.cycleNumber}</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>
                      {paidCount}/{cycle.cells.length} peye {missedCount > 0 && `· ${missedCount} rate`}
                    </span>
                  </div>
                  <CycleGrid cycle={cycle} compact={!isOpen} />
                </div>
              )
            })}
          </div>
        </div>

        {data.status === 'active' && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.modalBorder}`, background: 'rgba(0,0,0,0.2)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
              <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: C.label }}>KONBYEN JOU</label>
              <input
                type="number" min={1} max={data.totalDaysPlanned - data.daysPaid}
                value={payDays}
                onChange={e => setPayDays(Math.max(1, Math.min(Number(e.target.value) || 1, data.totalDaysPlanned - data.daysPaid)))}
                style={{ ...baseInput, padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}
              />
            </div>
            <button onClick={() => payMutation.mutate(payDays)} disabled={payMutation.isPending} style={{
              flex: 1, padding: '13px', borderRadius: 10, border: 'none',
              background: C.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <CheckCircle2 size={16} />
              {payMutation.isPending ? 'Ap anrejistre...' : `Peye ${payDays} jou — ${fmt(payDays * data.dailyAmount)} ${data.currency}`}
            </button>
          </div>
        )}
        {data.status === 'completed' && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.modalBorder}`, background: 'rgba(39,174,96,0.06)', textAlign: 'center' }}>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 15 }}>🎉 Kontra fini — {fmt(data.finalPayoutAmount)} {data.currency}</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── MODAL NOUVO KONTRA ─── */
function NewContractModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    clientFirstName: '', clientLastName: '', clientPhone: '', clientNifCin: '', clientAddress: '',
    dailyAmount: '', durationMonths: 3, currency: 'HTG', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const bonusDays = BONUS_DAYS[form.durationMonths] || 0
  const dailyNum = Number(form.dailyAmount) || 0
  const bonusValue = bonusDays * dailyNum
  const totalObjective = dailyNum * form.durationMonths * 30

  const handleSave = () => {
    if (!form.clientFirstName.trim() || !form.clientLastName.trim()) return toast.error('Prenon ak non obligatwa.')
    if (!dailyNum || dailyNum <= 0) return toast.error('Montan chak jou obligatwa.')
    onSave(form)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.modalBg, border: `1px solid ${C.modalBorder}`, borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.modalBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={17} color="#0a1222" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Nouvo Kontra Epay Jounalye</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.muted, cursor: 'pointer', width: 32, height: 32, borderRadius: 8 }}><X size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Field label="PRENON *" half><input value={form.clientFirstName} onChange={e => set('clientFirstName', e.target.value)} style={baseInput} placeholder="Fredelyn" /></Field>
            <Field label="NON *" half><input value={form.clientLastName} onChange={e => set('clientLastName', e.target.value)} style={baseInput} placeholder="Jean" /></Field>
            <Field label="TELEFÒN" half><input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} style={baseInput} placeholder="+509 XXXX XXXX" /></Field>
            <Field label="NIF / CIN" half><input value={form.clientNifCin} onChange={e => set('clientNifCin', e.target.value)} style={baseInput} placeholder="001-234-5678" /></Field>
            <Field label="ADRÈS"><input value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)} style={baseInput} placeholder="Vil, Depatman..." /></Field>
          </div>

          <div style={{ borderTop: `1px solid ${C.secBorder}`, paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Field label="MONTAN CHAK JOU *" half>
              <input type="number" value={form.dailyAmount} onChange={e => set('dailyAmount', e.target.value)} style={{ ...baseInput, color: C.gold, fontWeight: 700 }} placeholder="100" />
            </Field>
            <Field label="MONÈ" half>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={{ ...baseInput, cursor: 'pointer' }}>
                <option value="HTG">HTG</option>
                <option value="USD">USD</option>
              </select>
            </Field>
            <Field label="DIRE KONTRA">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => set('durationMonths', d)} style={{
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${form.durationMonths === d ? C.gold : C.inputBorder}`,
                    background: form.durationMonths === d ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: form.durationMonths === d ? C.gold : C.muted,
                  }}>{d} mwa (+{BONUS_DAYS[d]}j)</button>
                ))}
              </div>
            </Field>
          </div>

          {dailyNum > 0 && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: C.text, lineHeight: 1.7 }}>
              🎯 Objektif total: <strong style={{ color: C.gold }}>{fmt(totalObjective)} {form.currency}</strong> sou {form.durationMonths * 30} jou<br />
              🏆 Bonis si san rate: <strong style={{ color: C.gold }}>+{bonusDays} jou</strong> = <strong style={{ color: C.gold }}>{fmt(bonusValue)} {form.currency}</strong> anplis
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.modalBorder}`, display: 'flex', gap: 10, background: 'rgba(0,0,0,0.2)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.12)`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Anile</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.goldBtn, color: '#0a1222', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>
            {saving ? 'Ap kreye...' : 'Kreye Kontra'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── PAJ PRENSIPAL ─── */
export default function KanePage() {
  const { tenant } = useAuthStore()
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['epay-jounalye-list', filter, search],
    queryFn: () => api.get('/kane', { params: { status: filter !== 'all' ? filter : undefined, search: search || undefined } }).then(r => r.data),
    placeholderData: { contracts: [], stats: { totalContracts: 0, activeContracts: 0, completedContracts: 0, totalCollected: 0 } },
  })

  const contracts = data?.contracts || []
  const stats = data?.stats || { totalContracts: 0, activeContracts: 0, completedContracts: 0, totalCollected: 0 }

  const createMutation = useMutation({
    mutationFn: (form) => api.post('/kane', form),
    onSuccess: () => {
      toast.success('Kontra kreye!')
      qc.invalidateQueries({ queryKey: ['epay-jounalye-list'] })
      setShowNew(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erè kreye kontra.'),
  })

  const cardStyle = { background: 'rgba(13,27,42,0.7)', border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 16, textAlign: 'center' }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: C.gold, margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={22} />Epay Jounalye</h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>Kontra epay fòse chak jou, ak bonis fidelite</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => refetch()} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}><RefreshCw size={14} /></button>
          <button onClick={() => setShowNew(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: C.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} />Nouvo Kontra
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Kontra Aktif', val: stats.activeContracts, color: C.gold },
          { label: 'Kontra Fini', val: stats.completedContracts, color: C.green },
          { label: 'Total Kolekte', val: `${fmt(stats.totalCollected)} HTG`, color: C.gold },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ color: s.color, fontWeight: 800, fontSize: 18 }}>{s.val}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chèche..." style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, fontSize: 13, background: 'rgba(13,27,42,0.7)', border: `1px solid ${C.cardBorder}`, color: '#fff', boxSizing: 'border-box' }} />
        </div>
        {['all', 'active', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: filter === s ? 700 : 400,
            border: `1px solid ${filter === s ? C.gold : 'rgba(255,255,255,0.07)'}`,
            background: filter === s ? 'rgba(201,168,76,0.1)' : 'transparent',
            color: filter === s ? C.gold : C.muted,
          }}>{{ all: 'Tout', active: 'Aktif', completed: 'Fini', cancelled: 'Anile' }[s]}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: 60 }}>Chajman...</div>
      ) : contracts.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: 60, background: 'rgba(13,27,42,0.5)', borderRadius: 12, border: `1px dashed ${C.cardBorder}` }}>
          <Wallet size={40} color="#334155" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>Pa gen kontra. Kreye premye kontra Epay Jounalye a!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contracts.map(c => {
            const ss = STATUS_STYLE[c.status] || STATUS_STYLE.active
            const pct = Math.round((c.daysPaid / c.totalDaysPlanned) * 100)
            return (
              <div key={c.id} onClick={() => setSelectedId(c.id)} style={{
                background: 'rgba(13,27,42,0.7)', border: `1px solid ${C.cardBorder}`, borderRadius: 10,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer',
              }}>
                <div style={{ minWidth: 90 }}>
                  <div style={{ color: C.muted, fontSize: 10 }}>Nimewo</div>
                  <div style={{ color: C.gold, fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>#{c.contractNumber}</div>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{c.clientFirstName} {c.clientLastName}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{c.daysPaid}/{c.totalDaysPlanned} jou · {fmt(c.dailyAmount)} {c.currency}/jou</div>
                </div>
                <div style={{ minWidth: 90, textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{pct}%</div>
                  <div style={{ color: C.muted, fontSize: 10 }}>fèt</div>
                </div>
                {c.bonusStillEligible
                  ? <Trophy size={16} color={C.gold} title="Bonis aktif" />
                  : <Ban size={16} color={C.red} title="Bonis pèdi" />}
                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color, minWidth: 60, textAlign: 'center' }}>
                  {ss.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <NewContractModal onClose={() => setShowNew(false)} saving={createMutation.isPending} onSave={(form) => createMutation.mutate(form)} />
      )}
      {selectedId && (
        <ContractDetailModal contractId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
