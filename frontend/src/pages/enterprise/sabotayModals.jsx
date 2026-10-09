// ─────────────────────────────────────────────────────────────
// sabotayModals.jsx — Modals: CreatePlan, BlindDraw, MarkPayment,
//                    MemberAction, DeclarePayout, ClosePlan, Credentials, VirtualAccount
// ✅ Design "Plus Fit" (menm modal ak Kanè Epay / Prè)
// ✅ FIX: dat "jodi a" kounye a soti nan getHaitiNow() (DST-aware) — pa UTC-5 fiks ankò
// ✅ NOUVO: apre peman → resi imaj/PDF pou pataje (WhatsApp), kont manm pataje
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Clock, CheckCircle, Trophy, AlertCircle, Printer, Key, Star, UserCheck,
  Shuffle, Info, AlertTriangle, Lock, Unlock, StopCircle, Plus, TrendingUp,
  Calendar, Edit3, Wallet, FileText, Coins, Copy, Share2, PiggyBank, Receipt,
  CalendarDays, ShieldAlert, Repeat, Phone, Hash, Link2, CircleDollarSign,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Modal, Sec, TimePicker12h, format24ToDisplay12, MemberStatusBadge, ModalSolReceipt } from './sabotayAtoms'
import {
  D, fmt, FREQ_LABELS,
  getAllPaymentDates, getPayoutDate, computeMemberStatus,
  memberPayout, ownerPayout, getMemberScore, getPaymentTiming,
  calcMemberDepoRezev, apiFetch, API_URL, normalizePhone, getHaitiNow, hasOwnerSlot,
} from './sabotayUtils'
import { T, hexA } from './kane-epay/kaneEpayConstants'
import { Chip, Track, Spinner, Field } from './kane-epay/KaneEpayComponents'

// Pozisyon jan admin wè l nan lis la (plas pwopriyetè a = ★, lòt yo dekale)
const posLabel = (plan, m) => m?.isOwnerSlot ? '★' : `#${(m?.position || 0) - (hasOwnerSlot(plan) ? 1 : 0)}`
const dmy = (d) => String(d || '').split('T')[0].split('-').reverse().join('/')

// Ti CSS espesifik pou modal sabotay yo
const SM_STYLES = `
.sm-opt{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:8px}
.sm-opt button{height:46px;border-radius:13px;border:1.5px solid var(--border);background:#fff;font:700 13px var(--body);color:var(--muted);cursor:pointer;transition:all .2s}
.sm-opt button.on{background:var(--night);border-color:var(--night);color:#FFC83D}
.sm-num{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sm-num button{width:46px;height:46px;border-radius:13px;border:1.5px solid var(--border);background:#fff;font-family:var(--display);font-weight:800;font-size:20px;color:var(--muted);cursor:pointer;transition:all .2s}
.sm-num button.on{background:var(--night);border-color:var(--night);color:#FFC83D}
.sm-dates{display:flex;flex-direction:column;gap:7px;max-height:260px;overflow-y:auto;padding-right:2px}
.sm-date{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border-radius:15px;cursor:pointer;background:#fff;border:1.5px solid var(--border);transition:all .18s;user-select:none}
.sm-date:hover{border-color:rgba(20,21,26,.2)}
.sm-date.on{border-color:var(--dc);background:var(--dbg)}
.sm-date .d{font-family:var(--display);font-weight:800;font-size:19px;line-height:1;color:var(--ink)}
.sm-box{width:22px;height:22px;border-radius:7px;border:2px solid rgba(20,21,26,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .18s}
.sm-date.on .sm-box,.sm-tog.on .sm-box{background:var(--dc);border-color:var(--dc)}
.sm-tog{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:15px;cursor:pointer;border:1.5px solid var(--border);background:#fff;transition:all .18s;user-select:none}
.sm-tog.on{border-color:var(--dc);background:var(--dbg)}
.sm-hero{position:relative;overflow:hidden;border-radius:22px;padding:18px;background:var(--night);color:#f2f1ec}
.sm-hero::after{content:'';position:absolute;right:-50px;top:-70px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.28),transparent 65%);pointer-events:none}
.sm-hero>*{position:relative;z-index:1}
.sm-hero .big{font-family:var(--display);font-weight:800;font-size:40px;line-height:1;color:#FFC83D;margin:6px 0 0;white-space:nowrap}
.sm-hero .big small{font-size:14px;color:rgba(242,241,236,.55);margin-left:5px}
.sm-hero .nm{font-family:var(--display);font-weight:800;font-size:26px;line-height:1.05;text-transform:uppercase;margin:0;overflow-wrap:anywhere}
.sm-hero .sub{font-size:12.5px;color:rgba(242,241,236,.6);font-weight:600;margin:4px 0 0}
.sm-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.sm-kv>div{background:var(--soft);border-radius:16px;padding:12px 14px;min-width:0}
.sm-kv .v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:24px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sm-hist{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;padding-right:2px}
.sm-hrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;border-radius:14px;background:#fff;border:1px solid var(--border)}
.sm-hrow .d{font-family:var(--display);font-weight:800;font-size:17px;line-height:1;color:var(--ink);flex-shrink:0}
.sm-mini{width:30px;height:30px;border-radius:10px;border:0;background:var(--soft);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.sm-mini:hover{background:var(--night);color:#FFC83D}
.sm-cred{background:var(--soft);border-radius:14px;padding:11px 14px;font-weight:800;color:var(--ink);word-break:break-all}
.sm-draw{border-radius:22px;padding:26px 18px;text-align:center;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--soft);border:2px dashed rgba(20,21,26,.12);transition:all .3s}
.sm-draw.done{background:var(--night);border:2px solid var(--night);color:#f2f1ec}
.sm-slot{padding:0 13px;height:38px;border-radius:12px;border:1.5px solid var(--border);background:#fff;font:700 12.5px var(--body);color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:6px}
.sm-slot.on{background:var(--night);border-color:var(--night);color:#f2f1ec}
`
function useSmStyles() {
  useEffect(() => {
    if (document.getElementById('sm-styles')) return
    const el = document.createElement('style')
    el.id = 'sm-styles'
    el.textContent = SM_STYLES
    document.head.appendChild(el)
  }, [])
}

// ─────────────────────────────────────────────────────────────
// MODAL: KREYE / EDITE PLAN
// ─────────────────────────────────────────────────────────────
export function ModalCreatePlan({ onClose, onSave, loading, initialData = null }) {
  useSmStyles()
  const isEdit = !!initialData
  const { today } = getHaitiNow()
  const [form, setForm] = useState({
    name: '', amount: '', feePerMember: '', penalty: '', warningDelayDays: 3, stopPenaltyAmount: 0,
    frequency: 'daily', interval: 1, maxMembers: '', dueTime: '08:00',
    dueTimeEnd: '15:00', regleman: '',
    ...(initialData || {}),
    startDate: initialData?.startDate ? String(initialData.startDate).split('T')[0] : today,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const amt             = Number(form.amount) || 0
  const fee             = Number(form.feePerMember) || 0
  const intervalN       = Math.max(1, Number(form.interval) || 1)
  const previewMembers  = Number(form.maxMembers) || 0
  const payoutM         = amt * previewMembers - fee
  const timeWindowValid = form.dueTime < form.dueTimeEnd
  const windowDisplay   = timeWindowValid
    ? `${format24ToDisplay12(form.dueTime)} → ${format24ToDisplay12(form.dueTimeEnd)}`
    : 'Lè kòmansman dwe pi piti pase lè fen'

  const submit = () => {
    if (!form.name || !form.amount) return toast.error('Non ak montan obligatwa.')
    if (form.dueTime >= form.dueTimeEnd) return toast.error('Lè kòmansman fenèt peman dwe pi piti pase lè fen.')
    onSave({
      ...form, amount: Number(form.amount), feePerMember: Number(form.feePerMember || 0),
      penalty: Number(form.penalty || 0), warningDelayDays: Number(form.warningDelayDays || 0), stopPenaltyAmount: Number(form.stopPenaltyAmount || 0),
      maxMembers: Number(form.maxMembers || 0), dueTime: form.dueTime || '08:00',
      dueTimeEnd: form.dueTimeEnd || '15:00', interval: intervalN,
      startDate: form.startDate || today,
      status: initialData?.status || 'open',
    })
  }

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main gold" disabled={loading} onClick={submit}>
        {loading ? <Spinner size={16} /> : isEdit ? <CheckCircle size={17} /> : <Plus size={17} />}
        {loading ? 'Ap sove...' : (isEdit ? 'Sove chanjman' : 'Kreye plan')}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title={isEdit ? 'Modifye plan' : 'Nouvo plan sol'} subtitle={isEdit ? initialData?.name : 'Sabotay · Konfigirasyon konplè'}
      icon={isEdit ? <Edit3 size={20} /> : <Coins size={20} />} width={600} footer={footer}>

      {/* Previzyon an dirèk */}
      <div className="sm-hero" style={{ marginBottom: 14 }}>
        <span className="ke-eyebrow" style={{ color: '#FFC83D' }}>Previzyon</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p className="nm">{form.name || 'Non plan an'}</p>
            <p className="sub">{FREQ_LABELS[form.frequency]?.ht || form.frequency}{intervalN > 1 ? ` · touche chak ${intervalN} sik` : ''}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="big">{fmt(amt)}<small>HTG / moun</small></p>
          </div>
        </div>
        {previewMembers > 0 && amt > 0 && (
          <p style={{ margin: '12px 0 0', fontSize: 12.5, fontWeight: 700, color: 'rgba(242,241,236,.75)' }}>
            Ak {previewMembers} manm → chak moun touche <b style={{ color: '#4ade80' }}>{fmt(payoutM)} HTG</b>
          </p>
        )}
      </div>

      <Sec icon={<FileText size={15} />} title="Enfòmasyon plan">
        <div className="ke-col" style={{ gap: 12 }}>
          <Field label="Non plan *">
            <input className="ke-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Sol 500 Samdi" />
          </Field>
          <div className="ke-two-r">
            <Field label="Montan / moun (HTG) *">
              <input type="number" inputMode="decimal" className="ke-input" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22 }}
                value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="500" />
            </Field>
            <Field label="Dat kòmanse sol *">
              <input type="date" className="ke-input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </Field>
          </div>
          <Field label="Kantite manm prevwa (opsyonèl)" hint="Pou previzyon sèlman — sol la rete ouvè, moun ka antre toutan.">
            <input type="number" inputMode="numeric" className="ke-input" value={form.maxMembers} onChange={e => set('maxMembers', e.target.value)} placeholder="Ex: 20" />
          </Field>
        </div>
      </Sec>

      <Sec icon={<Clock size={15} />} title="Fenèt peman" col="124,58,237">
        <div className="ke-two">
          <Field label="Kòmansman *"><TimePicker12h value={form.dueTime} onChange={v => set('dueTime', v)} /></Field>
          <Field label="Fen (limit) *"><TimePicker12h value={form.dueTimeEnd} onChange={v => set('dueTimeEnd', v)} /></Field>
        </div>
        <div className="ke-summary">
          <div className="line"><span>Fenèt aktyèl</span><b style={{ color: timeWindowValid ? T.teal : T.red }}>{windowDisplay}</b></div>
          <div className="line"><span>Avan {format24ToDisplay12(form.dueTime)}</span><b style={{ color: '#059669' }}>Avan lè · +3 pwen</b></div>
          <div className="line"><span>Nan fenèt la</span><b style={{ color: T.green }}>Nan lè · +1 pwen</b></div>
          <div className="line"><span>Apre {format24ToDisplay12(form.dueTimeEnd)}</span><b style={{ color: T.orange }}>Apre lè · -1 pwen</b></div>
        </div>
      </Sec>

      <Sec icon={<Repeat size={15} />} title="Frekans peman">
        <div className="sm-opt">
          {Object.entries(FREQ_LABELS).map(([val, labels]) => (
            <button key={val} className={form.frequency === val ? 'on' : ''} onClick={() => set('frequency', val)}>{labels.ht}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="ke-label">Touche chak konbyen sik?</label>
          <div className="sm-num">
            {[1, 2, 3, 4].map(n => (
              <button key={n} className={intervalN === n ? 'on' : ''} onClick={() => set('interval', n)}>{n}</button>
            ))}
            <input type="number" min="1" max="52" value={form.interval} className="ke-input"
              onChange={e => set('interval', Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 80, height: 46, textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20 }} />
          </div>
        </div>
      </Sec>

      <Sec icon={<CircleDollarSign size={15} />} title="Frè & amand" col="217,119,6">
        <div className="ke-two">
          <Field label="Frè pa manm ki touche" hint={fee > 0 && fee === amt ? '= Montan → plas pwopriyetè sol!' : null}>
            <input type="number" inputMode="decimal" className="ke-input" value={form.feePerMember} onChange={e => set('feePerMember', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Amand pou reta">
            <input type="number" inputMode="decimal" className="ke-input" value={form.penalty} onChange={e => set('penalty', e.target.value)} placeholder="0" />
          </Field>
        </div>
      </Sec>

      <Sec icon={<ShieldAlert size={15} />} title="Avètisman & blokaj" col="220,38,38">
        <div className="ke-two-r">
          <Field label="Jou reta anvan blokaj" hint="0 = blokaj manyèl sèlman">
            <input type="number" min="0" className="ke-input" value={form.warningDelayDays}
              onChange={e => set('warningDelayDays', Number(e.target.value) || 0)} placeholder="3" />
          </Field>
          <Field label="Penalite kanpe (HTG)" hint="Dedwi sou kòb manm nan deja peye si w kanpe l.">
            <input type="number" min="0" className="ke-input" value={form.stopPenaltyAmount}
              onChange={e => set('stopPenaltyAmount', Number(e.target.value) || 0)} placeholder="0" />
          </Field>
        </div>
        {Number(form.warningDelayDays) > 0 && (
          <div className="ke-alert" style={{ '--c': T.red, '--cbg': hexA(T.red, .06), '--cbd': hexA(T.red, .2), marginTop: 12 }}>
            <Lock size={16} />
            <div>Kont lan ap <b>bloke otomatikman</b> apre <b>{form.warningDelayDays} jou</b> reta.</div>
          </div>
        )}
      </Sec>

      <Sec icon={<FileText size={15} />} title="Regleman (opsyonèl)" col="13,148,136">
        <textarea rows={4} className="ke-input" value={form.regleman} onChange={e => set('regleman', e.target.value)}
          placeholder="Ex: Tout manm dwe peye avan 8h. Peman an reta gen amand..." />
      </Sec>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: TIRAJ AVÈG
// ─────────────────────────────────────────────────────────────
export function ModalBlindDraw({ plan, onClose, onConfirm, loading }) {
  useSmStyles()
  const eligible = (plan.members || []).filter(m => !m.hasWon && !m.isOwnerSlot && m.status === 'active')
  const [chosen,   setChosen] = useState(null)
  const [drawn,    setDrawn]  = useState(false)
  const [spinning, setSpin]   = useState(false)

  const draw = () => {
    if (!eligible.length) return
    setSpin(true); setDrawn(false)
    let count = 0
    const max = 20 + Math.floor(Math.random() * 10)
    const iv = setInterval(() => {
      setChosen(eligible[Math.floor(Math.random() * eligible.length)])
      count++
      if (count >= max) {
        clearInterval(iv)
        setChosen(eligible[Math.floor(Math.random() * eligible.length)]); setDrawn(true); setSpin(false)
      }
    }, 80)
  }

  const footer = eligible.length === 0 ? <button className="ke-fbtn" onClick={onClose}>Fèmen</button> : !drawn ? (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main dark" onClick={draw} disabled={spinning}>
        {spinning ? <><Spinner size={16} /> Ap tire...</> : <><Shuffle size={17} /> Tire</>}
      </button>
    </>
  ) : (
    <>
      <button className="ke-fbtn" onClick={draw}><Shuffle size={16} /> Ankò</button>
      <button className="ke-fbtn main gold" onClick={() => onConfirm(chosen)} disabled={loading}>
        {loading ? <Spinner size={16} /> : <Trophy size={17} />} {loading ? 'Ap konfime...' : `Konfime ${chosen.name}`}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Tiraj avèg" subtitle={`${plan.name} · ${eligible.length} moun kalifye`} icon={<Shuffle size={20} />} width={480} footer={footer}>
      {eligible.length === 0 ? (
        <div className="ke-empty" style={{ border: 0, padding: '20px 0' }}>
          <div className="ke-empty-ic"><Trophy size={28} /></div>
          <h3>Pa gen moun disponib</h3>
          <p>Pa gen manm aktif ki poko touche pou tiraj la.</p>
        </div>
      ) : (
        <div className="ke-col" style={{ gap: 14 }}>
          <div className={`sm-draw ${drawn ? 'done' : ''}`}>
            {!chosen && !spinning && <p style={{ color: D.muted, fontSize: 14, fontWeight: 700, margin: 0 }}>Peze « Tire » pou kòmanse</p>}
            {chosen && (
              <div style={{ animation: drawn ? 'pop .4s ease' : 'none' }}>
                <span className="ke-eyebrow" style={{ color: drawn ? '#FFC83D' : D.muted }}>{spinning ? 'Ap tire...' : 'Moun chwazi'}</span>
                <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, lineHeight: 1.05, textTransform: 'uppercase', margin: '8px 0 4px', filter: spinning ? 'blur(1.5px)' : 'none', color: drawn ? '#f2f1ec' : D.text }}>
                  {chosen.name}
                </p>
                <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: drawn ? 'rgba(242,241,236,.6)' : D.muted }}>Pozisyon {posLabel(plan, chosen)} · {chosen.phone}</p>
                {drawn && <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 36, lineHeight: 1, color: '#4ade80', margin: '12px 0 0' }}>{fmt(memberPayout(plan))} <small style={{ fontSize: 14, color: 'rgba(242,241,236,.55)' }}>HTG</small></p>}
              </div>
            )}
          </div>
          <div className="sm-hist" style={{ maxHeight: 180 }}>
            {eligible.map(m => (
              <div key={m.id} className="sm-hrow" style={chosen?.id === m.id ? { borderColor: D.night, background: D.soft } : undefined}>
                <span style={{ fontSize: 13, fontWeight: chosen?.id === m.id ? 800 : 600, color: D.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <b style={{ fontFamily: 'var(--display)', fontSize: 16, marginRight: 6 }}>{posLabel(plan, m)}</b>{m.name}
                </span>
                <span style={{ fontSize: 12, color: D.muted, flexShrink: 0 }}>{m.phone}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: MAKE PEMAN
// ✅ Apre konfimasyon → resi (imaj / PDF / termik) pou pataje
// ─────────────────────────────────────────────────────────────
export function ModalMarkPayment({ member, plan, onClose, onSave, printer }) {
  useSmStyles()
  const { tenant } = useAuthStore()
  const { today, currentTime } = getHaitiNow()
  const allDates = useMemo(() => getAllPaymentDates(plan), [plan])
  const unpaid   = allDates.filter(d => !member.payments?.[d])

  const [sel,       setSel]      = useState([])  // ✅ Pa gen okenn dat ki tcheke otomatikman — kesye a chwazi
  const [applyFine, setFine]     = useState(false)
  const [receipt,   setReceipt]  = useState(null)
  const [saving,    setSaving]   = useState(false)

  const manualTimeOn = !!plan.manualPaymentTime
  const [useManualTime, setUseManualTime] = useState(false)
  const [manualDate, setManualDate] = useState(today)
  const [manualHour, setManualHour] = useState(currentTime)

  const toggle = (d) => setSel(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  const samePhoneMembers = useMemo(() =>
    (plan.members || []).filter(m => normalizePhone(m.phone) === normalizePhone(member.phone) && normalizePhone(member.phone) && m.id !== member.id && m.status !== 'stopped'),
    [plan.members, member])
  const allPayingSlots = useMemo(() => [member, ...samePhoneMembers], [member, samePhoneMembers])
  const slotCount = allPayingSlots.length

  const hasPenalty = Number(plan.penalty) > 0
  // Jou referans: dat kliyan an te peye a (lè manyèl) oswa jodi a
  const refDay     = (manualTimeOn && useManualTime && manualDate) ? manualDate : today
  const lateDates  = sel.filter(d => d < refDay)
  const futureSel  = sel.filter(d => d > today)
  const fineAmt    = hasPenalty && applyFine ? lateDates.length * Number(plan.penalty) : 0
  const baseAmt    = sel.length * Number(plan.amount) * slotCount
  const totalAmt   = baseAmt + fineAmt
  const isBlocked  = member.status === 'blocked'

  const handleConfirm = async () => {
    if (!sel.length) return toast.error('Chwazi omwen yon dat.')
    setSaving(true)
    // ✅ Lè manyèl → badj (bonè / a lè / reta) kalkile ak lè kliyan an te peye a
    const at = (manualTimeOn && useManualTime) ? { date: manualDate, time: manualHour } : null
    const timings = {}; sel.forEach(d => { timings[d] = getPaymentTiming(plan, d, at) })
    const fines = {}
    if (applyFine && hasPenalty) lateDates.forEach(d => { fines[d] = Number(plan.penalty) })
    const paidAt = (manualTimeOn && useManualTime) ? `${manualDate}T${manualHour}:00` : null
    try {
      const jobs = [Promise.resolve(onSave(member.id, sel, timings, fines, paidAt))]
      for (const other of samePhoneMembers) {
        const otherUnpaid = sel.filter(d => !other.payments?.[d])
        if (otherUnpaid.length > 0) {
          const otherTimings = {}; otherUnpaid.forEach(d => { otherTimings[d] = getPaymentTiming(plan, d, at) })
          jobs.push(Promise.resolve(onSave(other.id, otherUnpaid, otherTimings, {}, paidAt)))
        }
      }
      await Promise.all(jobs)
    } catch {
      setSaving(false)
      return  // toast deja parèt nan mutation an
    }
    // Manm ak peman yo ajou pou resi a (cache a ka poko rafrechi)
    const mark = (m, extraFines = {}) => ({
      ...m,
      payments: { ...(m.payments || {}), ...Object.fromEntries(sel.map(d => [d, true])) },
      paymentTimings: { ...(m.paymentTimings || {}), ...timings },
      fines: { ...(m.fines || {}), ...extraFines },
    })
    const paidMember = mark(member, fines)
    const paidSlots  = [paidMember, ...samePhoneMembers.map(o => mark(o))]
    // Enprimant termik konekte → enprime otomatikman (menm jan anvan)
    if (printer?.connected) await printer.print(plan, paidMember, sel, tenant, 'peman', paidSlots, paidAt)
    setSaving(false)
    setReceipt({ plan, member: paidMember, paidDates: sel, tenant, type: 'peman', allSlots: paidSlots, paidAt })
  }

  if (receipt) return <ModalSolReceipt data={receipt} printer={printer} onClose={onClose} />

  const footer = unpaid.length === 0 ? <button className="ke-fbtn" onClick={onClose}>Fèmen</button> : (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main green" onClick={handleConfirm} disabled={saving || printer?.printing || !sel.length}>
        {saving || printer?.printing ? <Spinner size={16} /> : <CheckCircle size={17} />}
        {saving ? 'Ap anrejistre...' : `Konfime ${sel.length ? fmt(totalAmt) + ' HTG' : ''}`}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Make peman" subtitle={`${member.name} · ${plan.name}`} icon={<Wallet size={20} />} width={520} footer={footer}>
      <div className="ke-col" style={{ gap: 12 }}>
        <div className="sm-hero" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <span className="ke-eyebrow" style={{ color: 'rgba(242,241,236,.6)' }}>Pa dat</span>
              <p className="big" style={{ fontSize: 32, margin: '4px 0 0' }}>{fmt(plan.amount * slotCount)}<small>HTG</small></p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {slotCount > 1 && <Chip dark icon={<Hash size={11} />}>{slotCount} men × {fmt(plan.amount)}</Chip>}
              {hasPenalty && <Chip dark icon={<AlertTriangle size={11} />}>Amand {fmt(plan.penalty)}</Chip>}
              <Chip dark icon={<Clock size={11} />}>{unpaid.length} dat rete</Chip>
            </div>
          </div>
        </div>

        {isBlocked && (
          <div className="ke-alert" style={{ '--c': T.orange, '--cbg': hexA(T.orange, .08), '--cbd': hexA(T.orange, .3), margin: 0 }}>
            <Lock size={16} /><div>Kont sa a <b>bloke</b>. Peman an ap debloke l otomatikman.</div>
          </div>
        )}

        {manualTimeOn && unpaid.length > 0 && (
          <div>
            <div className={`sm-tog ${useManualTime ? 'on' : ''}`} style={{ '--dc': T.violet, '--dbg': hexA(T.violet, .06) }} onClick={() => setUseManualTime(v => !v)}>
              <div className="sm-box">{useManualTime && <CheckCircle size={13} color="#fff" />}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: useManualTime ? T.violet : D.muted, flex: 1 }}>Antre lè kliyan an te reyèlman peye a</span>
              <Clock size={16} color={useManualTime ? T.violet : D.muted} />
            </div>
            {useManualTime && (
              <div className="ke-two" style={{ marginTop: 10 }}>
                <input type="date" className="ke-input" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                <TimePicker12h value={manualHour} onChange={setManualHour} />
              </div>
            )}
          </div>
        )}

        {unpaid.length === 0 ? (
          <div className="ke-empty" style={{ border: 0, padding: '18px 0' }}>
            <div className="ke-empty-ic" style={{ background: hexA(T.green, .1), color: T.green }}><CheckCircle size={28} /></div>
            <h3>Kliyan an ajou</h3>
            <p>Tout peman yo fèt deja.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="ke-label" style={{ margin: 0 }}>Chwazi dat yo ({sel.length})</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {sel.length > 0 && <button className="ke-btn ke-btn-soft" style={{ height: 32, padding: '0 11px', fontSize: 12 }} onClick={() => setSel([])}>Retire</button>}
                <button className="ke-btn ke-btn-soft" style={{ height: 32, padding: '0 11px', fontSize: 12 }} onClick={() => setSel(unpaid)}>Tout</button>
              </div>
            </div>

            <div className="sm-dates">
              {unpaid.map(d => {
                const isLate = d < refDay, isFuture = d > refDay, isToday = d === today
                const c = isFuture ? T.teal : isLate ? T.orange : T.green
                return (
                  <div key={d} className={`sm-date ${sel.includes(d) ? 'on' : ''}`} style={{ '--dc': c, '--dbg': hexA(c, .06) }} onClick={() => toggle(d)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
                      <div className="sm-box">{sel.includes(d) && <CheckCircle size={13} color="#fff" />}</div>
                      <span className="d">{dmy(d)}</span>
                      {isToday && <Chip color={T.green}>Jodi a</Chip>}
                      {isLate && <Chip color={T.orange} icon={<AlertTriangle size={10} />}>Reta</Chip>}
                      {isFuture && <Chip color={T.teal} icon={<PiggyBank size={10} />}>Rezèv</Chip>}
                    </div>
                    <b style={{ fontFamily: 'var(--display)', fontSize: 18, color: c, whiteSpace: 'nowrap' }}>{fmt(plan.amount * slotCount)}</b>
                  </div>
                )
              })}
            </div>

            {hasPenalty && lateDates.length > 0 && (
              <div className={`sm-tog ${applyFine ? 'on' : ''}`} style={{ '--dc': T.red, '--dbg': hexA(T.red, .05) }} onClick={() => setFine(p => !p)}>
                <div className="sm-box">{applyFine && <CheckCircle size={13} color="#fff" />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: applyFine ? T.red : D.text }}>Ajoute amand reta</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: D.muted }}>{lateDates.length} dat × {fmt(plan.penalty)} = <b style={{ color: T.red }}>{fmt(lateDates.length * Number(plan.penalty))} HTG</b></p>
                </div>
                <AlertTriangle size={16} color={T.red} />
              </div>
            )}

            {sel.length > 0 && (
              <div className="ke-summary" style={{ marginTop: 0 }}>
                <div className="line"><span>Peman · {sel.length} dat{slotCount > 1 ? ` × ${slotCount} men` : ''}</span><b>{fmt(baseAmt)} HTG</b></div>
                {futureSel.length > 0 && <div className="line"><span><PiggyBank size={13} /> Ladan l depo rezèv</span><b style={{ color: T.teal }}>{fmt(futureSel.length * Number(plan.amount) * slotCount)} HTG</b></div>}
                {fineAmt > 0 && <div className="line"><span>+ Amand</span><b style={{ color: T.red }}>{fmt(fineAmt)} HTG</b></div>}
                <div className="total"><span>Total</span><b style={{ color: T.green }}>{fmt(totalAmt)} <small style={{ fontSize: 14, color: D.muted }}>HTG</small></b></div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: AKSYON ADMIN SOU MANM
// ─────────────────────────────────────────────────────────────
export function ModalMemberAction({ member, plan, action, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  const configs = {
    block:   { title: 'Bloke kont',          color: T.red,    icon: <Lock size={20} />,       desc: 'Kont manm sa a ap bloke. Li p ap ka kontinye san admin debloke l.', btn: 'Bloke kont',          cls: 'red'    },
    unblock: { title: 'Debloke kont',        color: T.green,  icon: <Unlock size={20} />,     desc: 'Admin ap debloke kont manm sa a.',                                btn: 'Debloke kont',        cls: 'green'  },
    stop:    { title: 'Kanpe patisipasyon',  color: T.orange, icon: <StopCircle size={20} />, desc: 'Manm sa a ap kanpe patisipasyon li nan sol la.',                   btn: 'Kanpe patisipasyon',  cls: 'orange' },
    resume:  { title: 'Reprann patisipasyon', color: T.blue,  icon: <UserCheck size={20} />,  desc: 'Manm sa a ap reprann patisipasyon aktif li.',                      btn: 'Reprann',             cls: 'dark'   },
  }
  const cfg = configs[action]
  const stoppedPayout = useMemo(() => {
    if (action !== 'stop') return 0
    return getAllPaymentDates(plan).filter(d => member.payments?.[d]).length * Number(plan.amount)
  }, [action, plan, member])
  if (!cfg) return null
  const penalty = Math.min(stoppedPayout, Number(plan.stopPenaltyAmount || 0))

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className={`ke-fbtn main ${cfg.cls}`} onClick={() => onConfirm(action, reason)} disabled={loading}>
        {loading ? <Spinner size={16} /> : cfg.icon} {loading ? 'Ap trete...' : cfg.btn}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title={cfg.title} subtitle={`${member.name} · ${posLabel(plan, member)}`} icon={cfg.icon} width={460} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: hexA(cfg.color, .07), border: `1px solid ${hexA(cfg.color, .22)}`, borderRadius: 18, padding: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: cfg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{cfg.icon}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: D.text }}>{member.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: D.muted, fontWeight: 600 }}>Pozisyon {posLabel(plan, member)} · {member.phone}</p>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: '#3a3d48', margin: 0, lineHeight: 1.6 }}>{cfg.desc}</p>
        {action === 'stop' && stoppedPayout > 0 && (
          <div className="ke-summary" style={{ marginTop: 0 }}>
            <div className="line"><span>Kontribisyon deja fèt</span><b>{fmt(stoppedPayout)} HTG</b></div>
            {penalty > 0 && <div className="line"><span>− Penalite kanpe</span><b style={{ color: T.red }}>{fmt(penalty)} HTG</b></div>}
            <div className="total"><span>L ap resevwa lè plan fèmen</span><b style={{ color: T.goldInk }}>{fmt(stoppedPayout - penalty)}</b></div>
          </div>
        )}
        <Field label="Rezon (opsyonèl)">
          <input className="ke-input" value={reason} onChange={e => setReason(e.target.value)}
            placeholder={action === 'stop' ? 'Ex: Moun lan demenaje...' : 'Ex: Ariye regle...'} />
        </Field>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: DEKLARE DAT PEMAN (pwomès — SEPARE de "Konfime Touche")
// ─────────────────────────────────────────────────────────────
export function ModalDeclarePayout({ member, plan, onClose, onConfirm, loading }) {
  const { today } = getHaitiNow()
  const [date, setDate] = useState(member.declaredPayoutDate ? String(member.declaredPayoutDate).split('T')[0] : today)
  const auto = getPayoutDate(plan, member.position)

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main dark" onClick={() => onConfirm(date)} disabled={loading || !date}>
        {loading ? <Spinner size={16} /> : <Calendar size={17} />} {loading ? 'Ap sove...' : 'Deklare dat la'}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Deklare dat peman" subtitle={`${member.name} · ${member.phone}`} icon={<CalendarDays size={20} />} width={440} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div className="sm-hero" style={{ textAlign: 'center' }}>
          <span className="ke-eyebrow" style={{ color: '#FFC83D' }}>Dat pwomès</span>
          <p className="big" style={{ fontSize: 46, color: '#f2f1ec' }}>{date ? dmy(date) : '—'}</p>
          {auto && <p className="sub">Dat otomatik pozisyon an: {dmy(auto)}</p>}
        </div>
        <Field label="Dat li pral touche">
          <input type="date" className="ke-input" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <div className="ke-alert" style={{ '--c': T.blue, '--cbg': hexA(T.blue, .06), '--cbd': hexA(T.blue, .2), margin: 0 }}>
          <Info size={16} />
          <div>Sa a se yon <b>pwomès dat</b> — li PA make manm nan kòm touche. Manm nan ap wè dat la nan kont sol li. Lè peman an fèt tout bon, itilize <b>Konfime touche</b>.</div>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: FÈMEN PLAN
// ─────────────────────────────────────────────────────────────
export function ModalClosePlan({ plan, onClose, onConfirm, loading }) {
  const [confirm, setConfirm] = useState('')
  const allD              = useMemo(() => getAllPaymentDates(plan), [plan])
  const activeMembers     = (plan.members || []).filter(m => m.status !== 'stopped' && !m.hasWon)
  const pendingPayout     = activeMembers.length
  const totalToDistribute = activeMembers.reduce((a, m) => a + allD.filter(d => m.payments?.[d]).length * Number(plan.amount), 0)
  const ok = confirm === 'FEMEN'

  const footer = (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className="ke-fbtn main red" onClick={onConfirm} disabled={loading || !ok}>
        {loading ? <Spinner size={16} /> : <StopCircle size={17} />} {loading ? 'Ap fèmen...' : 'Fèmen definitivman'}
      </button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Fèmen plan sol la" subtitle={plan.name} icon={<StopCircle size={20} />} width={480} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div className="ke-alert" style={{ '--c': T.red, '--cbg': hexA(T.red, .07), '--cbd': hexA(T.red, .25), margin: 0 }}>
          <AlertCircle size={17} /><div><b>Aksyon sa pa ka defèt!</b> Plan <b>{plan.name}</b> ap fèmen definitivman.</div>
        </div>
        <div className="sm-kv">
          <div><p className="ke-label-s">Manm aktif</p><p className="v">{activeMembers.length}</p></div>
          <div><p className="ke-label-s">Poko touche</p><p className="v" style={{ color: T.orange }}>{pendingPayout}</p></div>
          <div><p className="ke-label-s">Total kolekte</p><p className="v" style={{ color: T.green }}>{fmt(totalToDistribute)}</p></div>
        </div>
        {pendingPayout > 0 && (
          <div className="ke-alert" style={{ '--c': T.orange, '--cbg': hexA(T.orange, .08), '--cbd': hexA(T.orange, .3), margin: 0 }}>
            <AlertTriangle size={16} /><div><b>{pendingPayout} manm</b> poko touche.</div>
          </div>
        )}
        <Field label='Tape "FEMEN" pou konfime'>
          <input className={`ke-input ${confirm && !ok ? 'err' : ''}`} style={{ textAlign: 'center', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, letterSpacing: '.18em', borderColor: ok ? T.red : undefined }}
            value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())} placeholder="FEMEN" />
        </Field>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL: KREDANSYÈL
// ─────────────────────────────────────────────────────────────
export function ModalMemberCredentials({ member, credentials, onClose, positions, payoutDates }) {
  useSmStyles()
  const [copied, setCopied] = useState(false)
  const isExisting = credentials?.isExisting
  const url = 'https://app.plusgroupe.com/app/sol/login'
  const text = isExisting
    ? `Non: ${member.name}\nItilizatè: ${credentials.username}\nURL: ${url}`
    : `Non: ${member.name}\nItilizatè: ${credentials?.username}\nModpas: ${credentials?.password}\nURL: ${url}`
  const copy = () => navigator.clipboard?.writeText(text)
    .then(() => { setCopied(true); toast.success('Kopye!'); setTimeout(() => setCopied(false), 2000) })
    .catch(() => toast.error('Pa ka kopye.'))
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Kont Sol', text }) } catch { /* anile */ } }
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const footer = (
    <>
      <button className="ke-fbtn" onClick={copy}>{copied ? <CheckCircle size={17} color={T.green} /> : <Copy size={17} />} {copied ? 'Kopye' : 'Kopye'}</button>
      <button className="ke-fbtn" onClick={share}><Share2 size={17} /> Voye</button>
      <button className="ke-fbtn main gold" onClick={onClose}>Fini</button>
    </>
  )

  return (
    <Modal onClose={onClose} title={isExisting ? 'Pozisyon ajoute' : 'Kont kliyan kreye'} subtitle={member.name} icon={<Key size={20} />} width={460} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div className="sm-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15, background: '#4ade80', color: '#0b0c0f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UserCheck size={22} /></div>
            <div style={{ minWidth: 0 }}>
              <p className="nm" style={{ fontSize: 22 }}>{member.name}</p>
              <p className="sub">{isExisting ? 'Nouvo men ajoute sou kont li' : 'Kont sol la pare'}</p>
            </div>
          </div>
        </div>

        {positions && positions.length > 0 && (
          <div className="sm-hist" style={{ maxHeight: 160 }}>
            {positions.map(p => (
              <div key={p} className="sm-hrow">
                <span className="d">Men #{p}</span>
                <Chip color={T.blue} icon={<Calendar size={10} />}>{payoutDates?.[p] ? dmy(payoutDates[p]) : '—'}</Chip>
              </div>
            ))}
          </div>
        )}

        <div className="ke-col" style={{ gap: 10 }}>
          <div><label className="ke-label"><Link2 size={11} style={{ verticalAlign: '-1px' }} /> URL koneksyon</label><div className="sm-cred" style={{ color: T.teal, fontSize: 13 }}>app.plusgroupe.com/app/sol/login</div></div>
          <div><label className="ke-label">Non itilizatè</label><div className="sm-cred" style={{ fontSize: 18 }}>{credentials?.username}</div></div>
          {!isExisting && credentials?.password && (
            <div><label className="ke-label">Modpas pwovizwa</label>
              <div className="sm-cred" style={{ background: D.night, color: '#FFC83D', fontFamily: 'var(--display)', fontSize: 30, letterSpacing: '.18em', textAlign: 'center' }}>{credentials.password}</div>
            </div>
          )}
        </div>
        {!isExisting && (
          <div className="ke-alert" style={{ '--c': T.red, '--cbg': hexA(T.red, .06), '--cbd': hexA(T.red, .2), margin: 0 }}>
            <AlertTriangle size={16} /><div>Note modpas sa kounye a. Kliyan an dwe chanje l apre premye koneksyon.</div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// KONT VITYÈL MANM
// ✅ Pataje kont lan an imaj, pataje resi chak peman
// ─────────────────────────────────────────────────────────────
export function MemberVirtualAccount({ member, plan, onClose, printer, allMemberSlots }) {
  useSmStyles()
  const { tenant } = useAuthStore()
  const allDates   = useMemo(() => getAllPaymentDates(plan), [plan])
  const multiSlots = allMemberSlots && allMemberSlots.length > 1
  const [activeSlotIdx, setActiveSlotIdx] = useState(0)
  const activeMember = multiSlots ? allMemberSlots[activeSlotIdx] : member
  const [solAccount, setSolAccount] = useState(null)
  const [share, setShare] = useState(null)
  const [showPass, setShowPass] = useState(false)

  const { today, currentTime } = getHaitiNow()

  useEffect(() => {
    let alive = true
    const fetchSolAccount = async () => {
      try {
        const { token } = useAuthStore.getState()
        const slug = localStorage.getItem('plusgroup-slug')
        const res  = await fetch(`${API_URL}/sol/members/${activeMember.id}/check`,
          { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' } })
        if (res.ok && alive) { const data = await res.json(); setSolAccount(data.account || null) }
      } catch { /* pa gen kont sol */ }
    }
    fetchSolAccount()
    return () => { alive = false }
  }, [activeMember.id])

  const isOwner      = activeMember.isOwnerSlot
  const payoutDate   = getPayoutDate(plan, activeMember.position)
  const allSlotsList = allMemberSlots || [activeMember]

  const totalPaid = allSlotsList.reduce((acc, slot) => acc + allDates.filter(d => slot.payments?.[d] && d <= today).length, 0)
  const totalDue  = allDates.filter(d => d <= today).length
  const amtPaid   = totalPaid * plan.amount
  const amtDue    = totalDue * plan.amount * allSlotsList.length
  const depoRezev = allSlotsList.reduce((acc, slot) => acc + calcMemberDepoRezev(slot, plan, today), 0)
  const payout    = isOwner ? ownerPayout(plan) : memberPayout(plan)
  const paidAll   = allDates.filter(d => activeMember.payments?.[d]).length
  const progress  = allDates.length > 0 ? (paidAll / allDates.length) * 100 : 0
  const scoreData = getMemberScore(activeMember)
  const fineTotal = Object.values(activeMember.fines || {}).reduce((a, b) => a + Number(b), 0)
  const memberStatus = computeMemberStatus(activeMember, plan, today, currentTime)

  const totalMbrs        = (plan.members || []).filter(m => m.status !== 'stopped').length
  const totalPaidAll     = (plan.members || []).filter(m => m.status !== 'stopped').reduce((acc, m) => acc + allDates.filter(d => m.payments?.[d] && d <= today).length * plan.amount, 0)
  const totalExpectedAll = totalMbrs * totalDue * plan.amount
  const solProgress      = totalExpectedAll > 0 ? (totalPaidAll / totalExpectedAll) * 100 : 0

  const tChip = (t) => {
    if (t === 'early')  return <Chip color="#059669">Bonè</Chip>
    if (t === 'onTime') return <Chip color={T.green}>A lè</Chip>
    if (t === 'late')   return <Chip color={T.orange}>Reta</Chip>
    return null
  }

  const shareData = (type, dates = []) => ({ plan, member: activeMember, paidDates: dates, tenant, type, allSlots: allMemberSlots || [activeMember] })

  if (share) return <ModalSolReceipt data={share} printer={printer} onClose={() => setShare(null)} />

  const footer = (
    <>
      <button className="ke-fbtn" style={{ flex: '0 0 52px', padding: 0 }} title="Enprime kont" disabled={printer.printing}
        onClick={() => printer.print(plan, activeMember, [], tenant, 'kont')}>
        {printer.printing ? <Spinner size={16} /> : <Printer size={18} />}
      </button>
      <button className="ke-fbtn" onClick={onClose}>Fèmen</button>
      <button className="ke-fbtn main dark" onClick={() => setShare(shareData('kont'))}><Share2 size={17} /> Pataje kont</button>
    </>
  )

  return (
    <Modal onClose={onClose} title="Kont manm" subtitle={`${plan.name} · ${activeMember.name}`} icon={<Wallet size={20} />} width={580} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>
        {multiSlots && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="ke-label-s" style={{ marginRight: 4 }}>Men</span>
            {allMemberSlots.map((slot, idx) => (
              <button key={slot.id || idx} className={`sm-slot ${activeSlotIdx === idx ? 'on' : ''}`} onClick={() => setActiveSlotIdx(idx)}>
                {posLabel(plan, slot)}
                {getPayoutDate(plan, slot.position) && <span style={{ fontSize: 11, opacity: .7 }}>· {dmy(getPayoutDate(plan, slot.position))}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Kat kont lan */}
        <div className="sm-hero" style={isOwner ? { background: 'linear-gradient(135deg,#FFD45C,#E0A410)', color: '#0b0c0f' } : undefined}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p className="nm">{activeMember.name} {isOwner && '★'}</p>
              <p className="sub" style={isOwner ? { color: 'rgba(11,12,15,.65)' } : undefined}>
                <Phone size={11} style={{ verticalAlign: '-1px' }} /> {activeMember.phone} · Pozisyon {posLabel(plan, activeMember)}
                {activeMember.permanentId ? ` · ID ${activeMember.permanentId}` : ''}
              </p>
              <div style={{ marginTop: 10 }}><MemberStatusBadge status={memberStatus} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="ke-eyebrow" style={{ color: isOwner ? 'rgba(11,12,15,.6)' : 'rgba(242,241,236,.6)' }}>Kontribisyon</span>
              <p className="big" style={isOwner ? { color: '#0b0c0f' } : undefined}>{fmt(amtPaid)}<small style={isOwner ? { color: 'rgba(11,12,15,.55)' } : undefined}>HTG</small></p>
              <p className="sub" style={isOwner ? { color: 'rgba(11,12,15,.65)' } : undefined}>{paidAll}/{allDates.length} peman</p>
            </div>
          </div>
          <div style={{ marginTop: 14 }}><Track pct={progress} color={isOwner ? '#0b0c0f' : '#FFC83D'} dark={!isOwner} /></div>
        </div>

        {memberStatus === 'blocked' && (
          <div className="ke-alert" style={{ '--c': T.red, '--cbg': hexA(T.red, .07), '--cbd': hexA(T.red, .25), margin: 0 }}>
            <Lock size={16} /><div><b>Kont bloke.</b> Manm sa dwe peye ariye. Sèlman admin ka debloke l.</div>
          </div>
        )}
        {activeMember.status === 'stopped' && (
          <div className="ke-alert" style={{ '--c': T.orange, '--cbg': hexA(T.orange, .08), '--cbd': hexA(T.orange, .3), margin: 0 }}>
            <StopCircle size={16} /><div><b>Kanpe.</b> Li ap resevwa <b>{fmt(Number(activeMember.stopRefundAmount ?? amtPaid))} HTG</b> lè sol la fini.</div>
          </div>
        )}

        <div className="sm-kv">
          <div><p className="ke-label-s">Deja peye</p><p className="v" style={{ color: T.green }}>{fmt(amtPaid)}</p></div>
          <div><p className="ke-label-s">Rès pou peye</p><p className="v" style={{ color: T.red }}>{fmt(Math.max(0, amtDue - amtPaid))}</p></div>
          <div><p className="ke-label-s">Ap touche</p><p className="v" style={{ color: T.goldInk }}>{fmt(payout)}</p></div>
          <div><p className="ke-label-s">Dat touche</p><p className="v" style={{ color: T.blue }}>{payoutDate ? dmy(payoutDate) : '—'}</p></div>
          {depoRezev > 0 && <div><p className="ke-label-s">Depo rezèv</p><p className="v" style={{ color: T.teal }}>{fmt(depoRezev)}</p></div>}
          {fineTotal > 0 && <div><p className="ke-label-s">Amand</p><p className="v" style={{ color: T.red }}>{fmt(fineTotal)}</p></div>}
        </div>

        {/* Evolisyon sol la */}
        <div style={{ background: '#fff', border: `1px solid ${D.border}`, borderRadius: 18, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <span className="ke-label-s" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={13} /> Sol la · {totalMbrs} manm aktif</span>
            <b style={{ fontFamily: 'var(--display)', fontSize: 20, color: solProgress >= 90 ? T.green : solProgress >= 60 ? T.orange : T.red }}>{Math.round(solProgress)}% ajou</b>
          </div>
          <Track pct={solProgress} color={solProgress >= 90 ? T.green : solProgress >= 60 ? T.orange : T.red} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: D.muted, fontWeight: 600, gap: 8, flexWrap: 'wrap' }}>
            <span>{fmt(totalPaidAll)} / {fmt(totalExpectedAll)} HTG</span>
            <span>{allDates.length} sik total</span>
          </div>
        </div>

        {scoreData && (
          <div style={{ background: '#fff', border: `1px solid ${D.border}`, borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <span className="ke-label-s" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={13} /> Pèfòmans</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <Chip color="#059669">{scoreData.early} bonè</Chip>
                <Chip color={T.green}>{scoreData.onTime} a lè</Chip>
                <Chip color={T.orange}>{scoreData.late} reta</Chip>
              </div>
            </div>
            <b style={{ fontFamily: 'var(--display)', fontSize: 40, lineHeight: 1, color: scoreData.score >= 80 ? T.green : scoreData.score >= 50 ? T.orange : T.red }}>{scoreData.score}%</b>
          </div>
        )}

        {solAccount && (
          <div style={{ background: D.soft, borderRadius: 18, padding: '14px 16px' }}>
            <span className="ke-label-s" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><Key size={13} /> Kont sol — koneksyon</span>
            <div className="ke-two-r">
              <div><label className="ke-label">Itilizatè</label><div className="sm-cred" style={{ background: '#fff' }}>{solAccount.username}</div></div>
              {solAccount.plainPassword && (
                <div><label className="ke-label">Modpas</label>
                  <div className="sm-cred" onClick={() => setShowPass(s => !s)} style={{ background: D.night, color: '#FFC83D', cursor: 'pointer', letterSpacing: '.12em', textAlign: 'center' }}>
                    {showPass ? solAccount.plainPassword : '••••••  (peze pou wè)'}
                  </div>
                </div>
              )}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: D.muted, fontWeight: 600 }}>app.plusgroupe.com/app/sol/login</p>
          </div>
        )}

        <div>
          <label className="ke-label">Istwa peman ({paidAll}/{allDates.length})</label>
          <div className="sm-hist">
            {allDates.slice(0, 90).map(d => {
              const paid        = !!activeMember.payments?.[d]
              const timing      = activeMember.paymentTimings?.[d]
              const past        = d <= today
              const isFuture    = d > today
              const isPayoutDay = payoutDate === d
              const fine        = activeMember.fines?.[d]
              const isDepo      = paid && isFuture
              const c = paid ? (isDepo ? T.teal : T.green) : past ? T.red : D.muted
              return (
                <div key={d} className="sm-hrow" style={isPayoutDay ? { background: '#fffaf0', borderColor: hexA(T.goldDeep, .4) } : undefined}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span className="d">{dmy(d)}</span>
                    {isPayoutDay && <Chip color={T.goldDeep} icon={<Trophy size={10} />}>Touche</Chip>}
                    {isDepo && <Chip color={T.teal}>Rezèv</Chip>}
                    {paid && !isDepo && tChip(timing)}
                    {fine && <Chip color={T.red}>+{fmt(fine)} amand</Chip>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <b style={{ fontFamily: 'var(--display)', fontSize: 17, color: c, whiteSpace: 'nowrap' }}>
                      {paid ? `+${fmt(plan.amount)}` : past ? `−${fmt(plan.amount)}` : fmt(plan.amount)}
                    </b>
                    {paid && (
                      <>
                        <button className="sm-mini" title="Pataje resi" onClick={() => setShare(shareData('peman', [d]))}><Receipt size={14} /></button>
                        <button className="sm-mini" title="Re-enprime resi" onClick={() => printer.print(plan, activeMember, [d], tenant, 'peman', allMemberSlots || [activeMember])}><Printer size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}