// src/pages/enterprise/KanePage.jsx
// Epay Jounalye — Kontra Epay Fòse Chak Jou (ak Bonis Fidelite)
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Wallet, Plus, Search, RefreshCw, X, Trophy, Ban, CheckCircle2, Sparkles, Edit2, Trash2, AlertTriangle } from 'lucide-react'
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
  gold: '#C9A84C', goldBtn: 'linear-gradient(135deg,#E4C468,#8B6914)',
  card: 'rgba(13,27,42,0.7)', cardBorder: 'rgba(201,168,76,0.18)',
  green: '#27ae60', red: '#C0392B',
}

const STATUS_STYLE = {
  active:    { bg: 'rgba(201,168,76,0.15)', color: C.gold, label: 'Aktif' },
  completed: { bg: 'rgba(39,174,96,0.15)',  color: C.green, label: 'Fini' },
  cancelled: { bg: 'rgba(192,57,43,0.15)',  color: C.red, label: 'Anile' },
}

// ── Palèt paj prensipal la (fon BLAN — separe de C ki sèvi pou modal fonse yo) ──
const L = {
  cardBg: '#FFFFFF', border: '#ECE4D3', text: '#1E2433', muted: '#7B8394', softBg: '#FAF8F2',
  orange: '#F5680C', gold: '#C9A84C', navy: '#0F172A', green: '#16A34A', red: '#DC2626',
  gradGold:   'linear-gradient(135deg, #F5680C 0%, #E4A730 100%)',
  gradGreen:  'linear-gradient(135deg, #16A34A 0%, #4ADE80 100%)',
  gradNavy:   'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
  shadow: '0 2px 12px rgba(15,23,42,0.06)',
}
const LIST_STATUS = {
  active:    { pill: '#FEF3E2', pillText: '#B45309', accent: L.orange, label: 'Aktif' },
  completed: { pill: '#DCFCE7', pillText: '#15803D', accent: L.green,  label: 'Fini' },
  cancelled: { pill: '#FEE2E2', pillText: '#B91C1C', accent: '#94A3B8', label: 'Anile' },
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT')

const useIsMobile = () => {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < 720 : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 720)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

const baseInput = {
  padding: '10px 13px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
  background: C.input, border: `1px solid ${C.inputBorder}`, color: C.text,
  outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
}

const Field = ({ label, half, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: half ? '1 1 calc(50% - 5px)' : '1 1 100%', minWidth: half ? 120 : 0 }}>
    <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: C.label }}>{label}</label>
    {children}
  </div>
)

/* ─── STIL GLOBAL: keyframes, hover, ak règ responsive mobil ─── */
function GlobalStyles() {
  return (
    <style>{`
      @keyframes ejFadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
      @keyframes ejScaleIn { from { opacity:0; transform:scale(0.94) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
      @keyframes ejPop { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
      @keyframes ejShimmer { 0% { background-position:-120px 0 } 100% { background-position:120px 0 } }
      @keyframes ejGlowPulse { 0%,100% { box-shadow:0 0 0 0 rgba(201,168,76,0.35) } 50% { box-shadow:0 0 0 7px rgba(201,168,76,0) } }
      @keyframes ejSpin { to { transform:rotate(360deg) } }
      @keyframes ejBgDrift { 0% { background-position:0% 50% } 50% { background-position:100% 50% } 100% { background-position:0% 50% } }

      .ej-page { animation: ejFadeUp 0.4s ease both; }
      .ej-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; animation: ejFadeUp 0.35s ease both; }
      .ej-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(15,23,42,0.12); border-color: rgba(201,168,76,0.5) !important; }
      .ej-card:active { transform: translateY(0px) scale(0.995); }
      .ej-stat:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(15,23,42,0.18); }
      .ej-stat { transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .ej-btn { transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease; }
      .ej-btn:hover { transform: translateY(-1px); filter: brightness(1.08); box-shadow: 0 6px 18px rgba(201,168,76,0.25); }
      .ej-btn:active { transform: translateY(0); filter: brightness(0.97); }
      .ej-icon-btn { transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease; }
      .ej-icon-btn:hover { background: rgba(201,168,76,0.14) !important; color: #C9A84C !important; transform: rotate(8deg); }
      .ej-filter-btn { transition: all 0.15s ease; }
      .ej-filter-btn:hover { border-color: rgba(201,168,76,0.5) !important; color: #C9A84C !important; }
      .ej-input:focus { border-color: #C9A84C !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.15); }
      .ej-duration-btn { transition: all 0.15s ease; }
      .ej-duration-btn:hover { border-color: #C9A84C !important; transform: translateY(-1px); }
      .ej-modal-backdrop { animation: ejFadeUp 0.2s ease both; }
      .ej-modal { animation: ejScaleIn 0.28s cubic-bezier(0.16,1,0.3,1) both; }
      .ej-cell-pop { animation: ejPop 0.28s ease both; }
      .ej-progress-track { background: rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; position: relative; }
      .ej-progress-fill {
        height: 100%; border-radius: 20px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
        background-image: linear-gradient(90deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%);
        background-size: 24px 24px;
      }
      .ej-bonus-active { animation: ejGlowPulse 2.4s ease-in-out infinite; }
      .ej-spin { animation: ejSpin 0.8s linear infinite; }
      .ej-cta-shimmer {
        background-image: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
        background-size: 200% 100%;
        animation: ejShimmer 2.6s linear infinite;
      }
      .ej-close-btn { transition: background 0.15s ease, transform 0.15s ease; }
      .ej-close-btn:hover { background: rgba(255,255,255,0.14) !important; transform: rotate(90deg); }
      .ej-row-item { animation: ejFadeUp 0.3s ease both; }

      @media (max-width: 720px) {
        .ej-container { padding: 14px !important; }
        .ej-stats-grid { grid-template-columns: 1fr 1fr !important; }
        .ej-stats-grid > div:last-child { grid-column: span 2; }
        .ej-header { flex-direction: column !important; align-items: stretch !important; }
        .ej-header-actions { justify-content: flex-end; }
        .ej-list-item { flex-wrap: wrap !important; }
        .ej-list-item .ej-li-name { order: 1; flex-basis: 100% !important; }
        .ej-list-item .ej-li-pct { order: 2; }
        .ej-list-item .ej-li-badge { order: 3; }
        .ej-modal-outer { padding: 0 !important; align-items: flex-end !important; }
        .ej-modal { max-width: 100% !important; width: 100% !important; border-radius: 20px 20px 0 0 !important; max-height: 94vh !important; }
        .ej-detail-stats { grid-template-columns: 1fr 1fr !important; }
        .ej-detail-stats > div:first-child { grid-column: span 2; }
      }
    `}</style>
  )
}

/* ─── BA PWOGRÈ ANIME ─── */
function ProgressBar({ pct, color }) {
  return (
    <div className="ej-progress-track" style={{ height: 6, width: '100%' }}>
      <div className="ej-progress-fill ej-cta-shimmer" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

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
      {cycle.cells.map((cell, i) => (
        <div key={cell.dayNumber} className="ej-cell-pop" style={{ ...cellStyle(cell.status), animationDelay: `${Math.min(i * 12, 300)}ms` }} title={`Jou ${cell.dayNumber} — ${cell.status}`}>
          {!compact && (cell.status === 'paid' ? '✓' : cell.status === 'missed' ? '✕' : cell.dayNumber)}
        </div>
      ))}
    </div>
  )
}

/* ─── MODAL DETAY KONTRA + PEMAN ─── */
function ContractDetailModal({ contractId, onClose }) {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [openCycles, setOpenCycles] = useState({})
  const [payDays, setPayDays] = useState(1)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: config } = useQuery({
    queryKey: ['epay-jounalye-config'],
    queryFn: () => api.get('/kane/config').then(r => r.data),
    staleTime: Infinity,
  })
  const maxAdvanceDays = config?.maxAdvanceDays ?? 10
  const minRenewalDays = config?.minRenewalDays ?? 2

  const { data, isLoading } = useQuery({
    queryKey: ['epay-jounalye', contractId],
    queryFn: () => api.get(`/kane/${contractId}`).then(r => r.data.contract),
  })

  const editMutation = useMutation({
    mutationFn: (form) => api.put(`/kane/${contractId}`, form),
    onSuccess: () => {
      toast.success('Kontra modifye!')
      setShowEdit(false)
      qc.invalidateQueries({ queryKey: ['epay-jounalye', contractId] })
      qc.invalidateQueries({ queryKey: ['epay-jounalye-list'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erè modifikasyon.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/kane/${contractId}`),
    onSuccess: () => {
      toast.success('Kontra siprime.')
      qc.invalidateQueries({ queryKey: ['epay-jounalye-list'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erè siprime kontra.'),
  })

  const payMutation = useMutation({
    mutationFn: (daysCount) => api.post(`/kane/${contractId}/pay`, { daysCount }),
    onSuccess: (res) => {
      const n = res?.data?.daysPaid || 1
      if (res?.data?.bonusJustForfeited) {
        const reason = res.data.forfeitReason === 'too_early'
          ? 'ou te ranpli twò bonè (plizyè jou te rete nan depo anvan an).'
          : 'peman sa a depase limit jou davans lan.'
        toast.error(`⚠️ Bonis pèdi — ${reason}`, { duration: 6000 })
      } else {
        toast.success(n > 1 ? `${n} jou anrejistre!` : 'Pèman jodi a anrejistre!')
      }
      setPayDays(1)
      qc.invalidateQueries({ queryKey: ['epay-jounalye', contractId] })
      qc.invalidateQueries({ queryKey: ['epay-jounalye-list'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erè pèman.'),
  })

  if (isLoading || !data) {
    return createPortal(
      <div className="ej-modal-backdrop" style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <RefreshCw className="ej-spin" size={22} color={C.gold} />
      </div>,
      document.body
    )
  }

  const startStr = data.startDate ? new Date(data.startDate).toISOString().slice(0, 10) : null
  const todayStr = new Date().toISOString().slice(0, 10)
  const daysElapsed = startStr ? Math.max(0, Math.round((new Date(todayStr) - new Date(startStr)) / 86400000)) : 0
  const dueStrict = Math.min(daysElapsed + 1, data.totalDaysPlanned)
  const bufferBefore = data.daysPaid - dueStrict
  const isFirstDeposit = data.daysPaid === 0
  const tooEarlyRenewal = !isFirstDeposit && bufferBefore > minRenewalDays
  const exceedsMaxBuffer = (data.daysPaid + payDays - dueStrict) > maxAdvanceDays
  const wouldForfeitBonus = data.bonusStillEligible && (tooEarlyRenewal || exceedsMaxBuffer)

  const activeCycleIdx = Math.min(Math.floor(data.daysPaid / 30), data.calendar.length - 1)
  const pct = Math.round((data.daysPaid / data.totalDaysPlanned) * 100)

  return (
    <>
    {createPortal(
    <div className="ej-modal-backdrop ej-modal-outer" style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div className="ej-modal" style={{ background: C.modalBg, border: `1px solid ${C.modalBorder}`, borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.modalBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{data.clientFirstName} {data.clientLastName}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>#{data.contractNumber} · {data.durationMonths} mwa · {fmt(data.dailyAmount)} {data.currency}/jou</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setShowEdit(true)} className="ej-icon-btn" title="Modifye kontra"
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.muted, cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={14} />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="ej-icon-btn" title="Siprime kontra"
              style={{ background: 'rgba(192,57,43,0.12)', border: 'none', color: C.red, cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="ej-close-btn" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.muted, cursor: 'pointer', width: 32, height: 32, borderRadius: 8 }}><X size={15} /></button>
          </div>
        </div>

        {confirmDelete && (
          <div style={{ padding: '14px 22px', background: 'rgba(192,57,43,0.1)', borderBottom: `1px solid rgba(192,57,43,0.25)`, display: 'flex', alignItems: 'center', gap: 10, animation: 'ejFadeUp 0.2s ease both' }}>
            <AlertTriangle size={18} color={C.red} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12.5, color: C.text }}>
              Siprime kontra sa a defenitivman, ansanm ak tout istwa peman li yo? Aksyon sa a <strong>pa ka anile</strong>.
            </div>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid rgba(255,255,255,0.15)`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Anile</button>
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: C.red, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {deleteMutation.isPending && <RefreshCw className="ej-spin" size={12} />} Wi, Siprime
            </button>
          </div>
        )}

        <div style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bonis banner */}
          <div className={data.bonusStillEligible ? 'ej-bonus-active' : ''} style={{
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

          {/* Ba pwogrè */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: C.muted }}>
              <span>{data.daysPaid}/{data.totalDaysPlanned} jou peye</span>
              <span style={{ color: C.gold, fontWeight: 700 }}>{pct}%</span>
            </div>
            <ProgressBar pct={pct} color={C.goldBtn} />
          </div>

          {/* Estatistik */}
          <div className="ej-detail-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
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
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.modalBorder}`, background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wouldForfeitBonus && (
              <div style={{ fontSize: 11.5, color: C.red, background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '8px 10px', animation: 'ejFadeUp 0.25s ease both' }}>
                ⚠️ {tooEarlyRenewal
                  ? `Ou gen tan ap ranpli twò bonè — rete ${bufferBefore} jou nan sa w deja peye. Tann jiskaske li rive ${minRenewalDays} jou oswa mwens.`
                  : `${payDays} jou sa a depase limit ${maxAdvanceDays} jou davans lan.`} Bonis fidelite a ap pèdi si w kontinye.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
                <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: C.label }}>KONBYEN JOU</label>
                <input
                  className="ej-input"
                  type="number" min={1} max={data.totalDaysPlanned - data.daysPaid}
                  value={payDays}
                  onChange={e => setPayDays(Math.max(1, Math.min(Number(e.target.value) || 1, data.totalDaysPlanned - data.daysPaid)))}
                  style={{ ...baseInput, padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
              <button onClick={() => payMutation.mutate(payDays)} disabled={payMutation.isPending} className="ej-btn" style={{
                flex: 1, padding: '13px', borderRadius: 10, border: 'none',
                background: wouldForfeitBonus ? 'linear-gradient(135deg,#C0392B,#8B2318)' : C.goldBtn,
                color: wouldForfeitBonus ? '#fff' : '#0a1222', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {payMutation.isPending ? <RefreshCw className="ej-spin" size={16} /> : <CheckCircle2 size={16} />}
                {payMutation.isPending ? 'Ap anrejistre...' : `Peye ${payDays} jou — ${fmt(payDays * data.dailyAmount)} ${data.currency}`}
              </button>
            </div>
          </div>
        )}
        {data.status === 'completed' && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.modalBorder}`, background: 'rgba(39,174,96,0.06)', textAlign: 'center' }}>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Sparkles size={17} /> Kontra fini — {fmt(data.finalPayoutAmount)} {data.currency}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
    )}
    {showEdit && (
      <NewContractModal
        onClose={() => setShowEdit(false)}
        saving={editMutation.isPending}
        onSave={(form) => editMutation.mutate(form)}
        initialData={data}
        isEdit
        lockAmountFields={data.daysPaid > 0}
      />
    )}
    </>
  )
}

/* ─── MODAL NOUVO KONTRA ─── */
function NewContractModal({ onClose, onSave, saving, initialData = null, isEdit = false, lockAmountFields = false }) {
  const [form, setForm] = useState({
    clientFirstName: initialData?.clientFirstName || '', clientLastName: initialData?.clientLastName || '',
    clientPhone: initialData?.clientPhone || '', clientNifCin: initialData?.clientNifCin || '', clientAddress: initialData?.clientAddress || '',
    dailyAmount: initialData?.dailyAmount != null ? String(initialData.dailyAmount) : '',
    durationMonths: initialData?.durationMonths || 3, currency: initialData?.currency || 'HTG', notes: initialData?.notes || '',
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

  return createPortal(
    <div className="ej-modal-backdrop ej-modal-outer" style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div className="ej-modal" style={{ background: C.modalBg, border: `1px solid ${C.modalBorder}`, borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.modalBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldBtn, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={17} color="#0a1222" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{isEdit ? 'Modifye Kontra' : 'Nouvo Kontra Epay Jounalye'}</span>
          </div>
          <button onClick={onClose} className="ej-close-btn" style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: C.muted, cursor: 'pointer', width: 32, height: 32, borderRadius: 8 }}><X size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isEdit && lockAmountFields && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: C.gold }}>
              ℹ️ Kontra a deja gen peman — sèlman enfòmasyon kliyan an ka korije.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Field label="PRENON *" half><input className="ej-input" value={form.clientFirstName} onChange={e => set('clientFirstName', e.target.value)} style={baseInput} placeholder="Fredelyn" /></Field>
            <Field label="NON *" half><input className="ej-input" value={form.clientLastName} onChange={e => set('clientLastName', e.target.value)} style={baseInput} placeholder="Jean" /></Field>
            <Field label="TELEFÒN" half><input className="ej-input" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} style={baseInput} placeholder="+509 XXXX XXXX" /></Field>
            <Field label="NIF / CIN" half><input className="ej-input" value={form.clientNifCin} onChange={e => set('clientNifCin', e.target.value)} style={baseInput} placeholder="001-234-5678" /></Field>
            <Field label="ADRÈS"><input className="ej-input" value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)} style={baseInput} placeholder="Vil, Depatman..." /></Field>
          </div>

          <div style={{ borderTop: `1px solid ${C.secBorder}`, paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, opacity: lockAmountFields ? 0.5 : 1, pointerEvents: lockAmountFields ? 'none' : 'auto' }}>
            <Field label="MONTAN CHAK JOU *" half>
              <input className="ej-input" type="number" value={form.dailyAmount} onChange={e => set('dailyAmount', e.target.value)} style={{ ...baseInput, color: C.gold, fontWeight: 700 }} placeholder="100" disabled={lockAmountFields} />
            </Field>
            <Field label="MONÈ" half>
              <select className="ej-input" value={form.currency} onChange={e => set('currency', e.target.value)} style={{ ...baseInput, cursor: 'pointer' }} disabled={lockAmountFields}>
                <option value="HTG">HTG</option>
                <option value="USD">USD</option>
              </select>
            </Field>
            <Field label="DIRE KONTRA">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => !lockAmountFields && set('durationMonths', d)} className="ej-duration-btn" style={{
                    padding: '8px 12px', borderRadius: 8, cursor: lockAmountFields ? 'default' : 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1px solid ${form.durationMonths === d ? C.gold : C.inputBorder}`,
                    background: form.durationMonths === d ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: form.durationMonths === d ? C.gold : C.muted,
                  }}>{d} mwa (+{BONUS_DAYS[d]}j)</button>
                ))}
              </div>
            </Field>
          </div>

          {dailyNum > 0 && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: C.text, lineHeight: 1.7, animation: 'ejFadeUp 0.25s ease both' }}>
              🎯 Objektif total: <strong style={{ color: C.gold }}>{fmt(totalObjective)} {form.currency}</strong> sou {form.durationMonths * 30} jou<br />
              🏆 Bonis si san rate: <strong style={{ color: C.gold }}>+{bonusDays} jou</strong> = <strong style={{ color: C.gold }}>{fmt(bonusValue)} {form.currency}</strong> anplis
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.modalBorder}`, display: 'flex', gap: 10, background: 'rgba(0,0,0,0.2)' }}>
          <button onClick={onClose} className="ej-btn" style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.12)`, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Anile</button>
          <button onClick={handleSave} disabled={saving} className="ej-btn" style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: C.goldBtn, color: '#0a1222', cursor: 'pointer', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && <RefreshCw className="ej-spin" size={14} />} {saving ? (isEdit ? 'Ap sove...' : 'Ap kreye...') : (isEdit ? 'Sove Chanjman' : 'Kreye Kontra')}
          </button>
        </div>
      </div>
    </div>,
    document.body
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

  return (
    <div className="ej-page ej-container" style={{ padding: '24px', maxWidth: 940, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalStyles />

      <div className="ej-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: L.gradGold, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(245,104,12,0.28)', flexShrink: 0 }}>
            <Wallet size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: L.navy, margin: 0, fontSize: 21, fontWeight: 800 }}>Epay Jounalye</h1>
            <p style={{ color: L.muted, margin: '2px 0 0', fontSize: 13 }}>Kontra epay fòse chak jou, ak bonis fidelite</p>
          </div>
        </div>
        <div className="ej-header-actions" style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => refetch()} className="ej-icon-btn" style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${L.border}`, background: L.cardBg, color: L.muted, cursor: 'pointer', boxShadow: L.shadow }}><RefreshCw size={14} /></button>
          <button onClick={() => setShowNew(true)} className="ej-btn" style={{ padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: L.gradGold, color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 6px 16px rgba(245,104,12,0.28)' }}>
            <Plus size={15} />Nouvo Kontra
          </button>
        </div>
      </div>

      <div className="ej-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Kontra Aktif', val: stats.activeContracts, grad: L.gradGold, icon: <Trophy size={18} color="#fff" /> },
          { label: 'Kontra Fini', val: stats.completedContracts, grad: L.gradGreen, icon: <Sparkles size={18} color="#fff" /> },
          { label: 'Total Kolekte', val: `${fmt(stats.totalCollected)} HTG`, grad: L.gradNavy, icon: <Wallet size={18} color="#fff" /> },
        ].map((s, i) => (
          <div key={s.label} className="ej-stat" style={{
            background: s.grad, borderRadius: 16, padding: '18px 18px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(15,23,42,0.12)', animation: 'ejFadeUp 0.4s ease both', animationDelay: `${i * 60}ms`,
          }}>
            <div style={{ position: 'absolute', top: -14, right: -14, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>{s.val}</div>
              {s.icon}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 6, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: L.muted }} />
          <input className="ej-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Chèche non, nimewo, telefòn..." style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, fontSize: 13, background: L.cardBg, border: `1px solid ${L.border}`, color: L.text, boxSizing: 'border-box', boxShadow: L.shadow, transition: 'border-color 0.15s, box-shadow 0.15s' }} />
        </div>
        {['all', 'active', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className="ej-filter-btn" style={{
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: filter === s ? 700 : 500,
            border: `1px solid ${filter === s ? L.orange : L.border}`,
            background: filter === s ? L.gradGold : L.cardBg,
            color: filter === s ? '#fff' : L.muted,
            boxShadow: filter === s ? '0 4px 12px rgba(245,104,12,0.25)' : L.shadow,
          }}>{{ all: 'Tout', active: 'Aktif', completed: 'Fini', cancelled: 'Anile' }[s]}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: L.muted, padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <RefreshCw className="ej-spin" size={20} color={L.orange} /> Chajman...
        </div>
      ) : contracts.length === 0 ? (
        <div style={{ textAlign: 'center', color: L.muted, padding: 60, background: L.softBg, borderRadius: 16, border: `1.5px dashed ${L.border}`, animation: 'ejFadeUp 0.35s ease both' }}>
          <Wallet size={40} color={L.orange} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Pa gen kontra. Kreye premye kontra Epay Jounalye a!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contracts.map((c, i) => {
            const ls = LIST_STATUS[c.status] || LIST_STATUS.active
            const pct = Math.round((c.daysPaid / c.totalDaysPlanned) * 100)
            const initials = `${c.clientFirstName?.[0] || ''}${c.clientLastName?.[0] || ''}`.toUpperCase()
            return (
              <div key={c.id} onClick={() => setSelectedId(c.id)} className="ej-card ej-row-item ej-list-item" style={{
                background: L.cardBg, border: `1px solid ${L.border}`, borderRadius: 14, boxShadow: L.shadow,
                borderLeft: `4px solid ${ls.accent}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer',
                animationDelay: `${Math.min(i * 45, 400)}ms`,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: L.gradGold, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>{initials || '?'}</div>

                <div className="ej-li-name" style={{ flex: 1, minWidth: 170 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: L.text, fontWeight: 700, fontSize: 14.5 }}>{c.clientFirstName} {c.clientLastName}</span>
                    <span style={{ color: L.gold, fontWeight: 700, fontFamily: 'monospace', fontSize: 11.5 }}>#{c.contractNumber}</span>
                  </div>
                  <div style={{ color: L.muted, fontSize: 12, margin: '3px 0 7px' }}>{c.daysPaid}/{c.totalDaysPlanned} jou · {fmt(c.dailyAmount)} {c.currency}/jou</div>
                  <ProgressBar pct={pct} color={c.status === 'completed' ? L.gradGreen : L.gradGold} />
                </div>

                <div className="ej-li-pct" style={{ minWidth: 46, textAlign: 'right' }}>
                  <div style={{ color: L.navy, fontWeight: 800, fontSize: 16 }}>{pct}%</div>
                  <div style={{ color: L.muted, fontSize: 10 }}>fèt</div>
                </div>

                {c.bonusStillEligible
                  ? <Trophy size={17} color={L.gold} title="Bonis aktif" />
                  : <Ban size={17} color={L.red} title="Bonis pèdi" />}

                <span className="ej-li-badge" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ls.pill, color: ls.pillText, minWidth: 60, textAlign: 'center' }}>
                  {ls.label}
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