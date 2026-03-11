// frontend/src/pages/enterprise/SabotayPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users, Plus, ChevronDown, ChevronUp, Trash2, Edit2,
  CheckCircle, Shield, Key, Loader, AlertCircle, UserCheck,
  DollarSign, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://plusgroup-backend.onrender.com/api/v1'
const OWNER_SLOT_NAME = 'Plas Patwon'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const D = {
  bg:        '#0a1222',
  card:      '#0f1c35',
  border:    'rgba(201,168,76,0.18)',
  borderSub: 'rgba(255,255,255,0.07)',
  gold:      '#c9a84c',
  goldBtn:   'linear-gradient(135deg,#c9a84c,#e8c96a)',
  goldDim:   'rgba(201,168,76,0.10)',
  text:      '#e8eaf0',
  muted:     '#6b7a9a',
  blue:      '#3b82f6',
  blueBg:    'rgba(59,130,246,0.08)',
  green:     '#22c55e',
  greenBg:   'rgba(34,197,94,0.08)',
  red:       '#ef4444',
  redBg:     'rgba(239,68,68,0.08)',
  teal:      '#14b8a6',
  tealBg:    'rgba(20,184,166,0.08)',
  purple:    '#9b59b6',
  purpleBg:  'rgba(155,89,182,0.08)',
  yellow:    '#f59e0b',
}
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }
const inp = { width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${D.borderSub}`, color: D.text, outline: 'none', boxSizing: 'border-box' }

// ─────────────────────────────────────────────────────────────
// ✅ LOJIK INTERVAL — DEFINISYON KÒRÈK
//
//  interval = espas ant 2 KOLEKSYON (touche), PAS ant peman
//
//  Manm yo toujou peye CHAK PERYÒD (frekans debaz)
//  Men yo TOUCHE chak (interval) peryòd
//
//  Egzanp: daily + 30 manm + interval=2
//  ─────────────────────────────────────
//  • Manm peye:  CHAK JOU  (frekans debaz)
//  • Manm touche: CHAK 2 JOU (1 × interval)
//  • Total peryòd peman = 30 × 2 = 60 jou
//  • Manm #1  touche jou 2   (1 × 2)
//  • Manm #2  touche jou 4   (2 × 2)
//  • Manm #30 touche jou 60  (30 × 2)
//  • Payout = 100 × 30 × 2 - frè = 6000 HTG
// ─────────────────────────────────────────────────────────────

const BASE_DAYS = {
  daily: 1, saturday: 7, weekly_saturday: 7,
  weekly: 5, weekly_monday: 5, biweekly: 15,
  monthly: 30, weekdays: 1,
}
function baseDays(freq) { return BASE_DAYS[freq] || 7 }

// Dat koleksyon (touche) pou pozisyon p
// = startDate + p × interval × baseDays
function collectDate(startDate, freq, pos, interval = 1) {
  const d = new Date(startDate)
  d.setDate(d.getDate() + pos * interval * baseDays(freq))
  return d.toISOString().split('T')[0]
}

// Total peryòd peman ke manm dwe peye
// = maxMembers × interval
function totalRounds(maxMembers, interval = 1) {
  return maxMembers * interval
}

// Dat pou peryòd i (1-indexed) — chak frekans debaz, pa interval
function payPeriodDate(startDate, freq, round) {
  const d = new Date(startDate)
  d.setDate(d.getDate() + (round - 1) * baseDays(freq))
  return d.toISOString().split('T')[0]
}

const FREQ_LABELS = {
  daily: 'Chak Jou', weekly: 'Chak Semèn (Lendi)', weekly_monday: 'Chak Semèn (Lendi)',
  saturday: 'Chak Samdi', weekly_saturday: 'Chak Samdi', biweekly: 'Chak 15 Jou',
  monthly: 'Chak Mwa', weekdays: 'Jou Ouvrab',
}
const fmt     = n  => Number(n || 0).toLocaleString('fr-HT')
const fmtDate = d  => d ? new Date(d).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
const ddmm    = iso => iso ? iso.split('-').reverse().join('/') : '—'

// ─────────────────────────────────────────────────────────────
// HELPERS PLAN
// ─────────────────────────────────────────────────────────────
function hasOwnerSlot(plan) { return Number(plan.feePerMember || 0) === Number(plan.amount) }
function totalSlots(plan)   { return Number(plan.maxMembers) + (hasOwnerSlot(plan) ? 1 : 0) }

// ✅ Payout kòrèk = montant × (maxMembers × interval) - frè
function memberPayout(plan) {
  const n   = Number(plan.maxMembers)
  const amt = Number(plan.amount)
  const itv = Number(plan.interval || 1)
  const fee = Number(plan.feePerMember || 0)
  if (fee === amt) return amt * n * itv - fee          // plas patwon dedwi sèlman frè patwon
  return amt * n * itv - Number(plan.fee || 0)
}
function ownerPayout(plan) { return Number(plan.amount) * Number(plan.maxMembers) * Number(plan.interval || 1) }

function genCreds(name, phone) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''; for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  const user = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ')[0].replace(/[^a-z0-9]/g, '') + phone.replace(/\D/g,'').slice(-4)
  return { username: user, password: pw }
}

const RELS = [
  { val: 'conjoint', label: '💑 Konjwen / Konjwèt' },
  { val: 'parent',   label: '👪 Manman / Papa' },
  { val: 'fre_se',   label: '👫 Frè / Sè' },
  { val: 'pitit',    label: '👶 Pitit' },
  { val: 'zanmi',    label: '🤝 Zanmi' },
  { val: 'koleg',    label: '💼 Kolèg Travay' },
  { val: 'lot',      label: '🔗 Lòt' },
]

// ─────────────────────────────────────────────────────────────
// API HOOK
// ─────────────────────────────────────────────────────────────
function useApi() {
  const { token, tenantSlug } = useAuthStore()
  const h = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(tenantSlug && { 'X-Tenant-Slug': tenantSlug }) }
  return {
    get:   url       => fetch(`${API_URL}${url}`, { headers: h }).then(r => r.json()),
    post:  (url, b)  => fetch(`${API_URL}${url}`, { method: 'POST',   headers: h, body: JSON.stringify(b) }).then(r => r.json()),
    put:   (url, b)  => fetch(`${API_URL}${url}`, { method: 'PUT',    headers: h, body: JSON.stringify(b) }).then(r => r.json()),
    del:   url       => fetch(`${API_URL}${url}`, { method: 'DELETE', headers: h }).then(r => r.json()),
    h, token, tenantSlug,
  }
}

// ─────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────
function Modal({ onClose, title, children, width = 460 }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:D.card, borderRadius:18, padding:'22px 22px 20px', border:`1px solid ${D.border}`, width:'100%', maxWidth:width, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, color:D.gold, fontSize:15, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:D.muted, cursor:'pointer', fontSize:22 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL — Kreye / Modifye Plan
// ─────────────────────────────────────────────────────────────
function ModalPlan({ plan, onClose, onSave, loading }) {
  const isEdit = !!plan?.id
  const [f, setF] = useState({
    name:         plan?.name         || '',
    frequency:    plan?.frequency    || 'weekly_saturday',
    amount:       plan?.amount       || '',
    maxMembers:   plan?.maxMembers   || '',
    fee:          plan?.fee          || 0,
    feePerMember: plan?.feePerMember || 0,
    penalty:      plan?.penalty      || 0,
    interval:     plan?.interval     || 1,
    dueTime:      plan?.dueTime      || '08:00',
    startDate:    plan?.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    regleman:     plan?.regleman || '',
    status:       plan?.status   || 'active',
  })
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))

  const itv       = Number(f.interval || 1)
  const n         = Number(f.maxMembers || 0)
  const bd        = baseDays(f.frequency)
  const rounds    = totalRounds(n, itv)
  const totalDays = rounds * bd
  const dLabel    = totalDays >= 30 ? `~${Math.round(totalDays / 30)} mwa` : `${totalDays} jou`
  const payout    = n > 0 && f.amount ? memberPayout({ ...f }) : 0

  const FREQS = [
    ['weekly_saturday','🗓️ Chak Samdi'],['weekly','🗓️ Chak Semèn (Lendi)'],
    ['daily','📅 Chak Jou'],['biweekly','📅 Chak 15 Jou'],['monthly','📅 Chak Mwa'],
  ]

  return (
    <Modal onClose={onClose} title={isEdit ? '✏️ Modifye Plan' : '➕ Nouvo Plan Sol'} width={530}>
      <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Non Plan *</label>
            <input style={inp} value={f.name} onChange={e => s('name', e.target.value)} placeholder="Ex: Sol Samdi A" />
          </div>
          <div>
            <label style={lbl}>Montant pa Peryòd (HTG) *</label>
            <input style={inp} type="number" min="1" value={f.amount} onChange={e => s('amount', e.target.value)} placeholder="Ex: 100" />
          </div>
          <div>
            <label style={lbl}>Kantite Manm *</label>
            <input style={inp} type="number" min="2" value={f.maxMembers} onChange={e => s('maxMembers', e.target.value)} placeholder="Ex: 30" />
          </div>

          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Frekans Peman *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {FREQS.map(([v, l]) => (
                <button key={v} onClick={() => s('frequency', v)} style={{
                  padding:'8px 13px', borderRadius:9, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                  background: f.frequency === v ? D.goldDim : 'rgba(255,255,255,0.04)',
                  color:      f.frequency === v ? D.gold    : D.muted,
                  border:     `2px solid ${f.frequency === v ? D.gold + '60' : D.borderSub}`,
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* ── INTERVAL ── */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Espas ant Koleksyon (Interval)</label>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              {[1,2,3,4,5,7,10].map(v => (
                <button key={v} onClick={() => s('interval', v)} style={{
                  width:40, height:40, borderRadius:10, border:'none', cursor:'pointer', fontWeight:900, fontSize:14,
                  background: itv === v ? D.goldDim : 'rgba(255,255,255,0.04)',
                  color:      itv === v ? D.gold    : D.muted,
                  border:     `2px solid ${itv === v ? D.gold + '60' : D.borderSub}`,
                }}>{v}</button>
              ))}
              <input type="number" min="1" max="100" value={f.interval}
                onChange={e => s('interval', Number(e.target.value))}
                style={{ ...inp, width:65, textAlign:'center', fontWeight:800, padding:'8px' }} />
            </div>

            {/* ── Eksplikasyon vizèl ── */}
            {n > 0 && f.amount ? (
              <div style={{ background:'rgba(20,184,166,0.08)', border:`1px solid ${D.teal}30`, borderRadius:11, padding:'12px 14px' }}>
                <p style={{ fontSize:11, fontWeight:800, color:D.teal, margin:'0 0 8px' }}>📊 Kalkilasyon ak interval = {itv}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:11 }}>
                  <span style={{ color:D.muted }}>📅 Manm peye:
                    <strong style={{ color:D.text }}> {FREQ_LABELS[f.frequency]}</strong>
                  </span>
                  <span style={{ color:D.muted }}>🏆 Manm touche:
                    <strong style={{ color:D.gold }}> Chak {itv > 1 ? `${itv} × ${FREQ_LABELS[f.frequency]}` : FREQ_LABELS[f.frequency]}</strong>
                  </span>
                  <span style={{ color:D.muted }}>🔄 Total peryòd peman:
                    <strong style={{ color:D.text }}> {rounds} ({n} manm × {itv})</strong>
                  </span>
                  <span style={{ color:D.muted }}>⏱️ Dirasyon sol:
                    <strong style={{ color:D.text }}> {dLabel}</strong>
                  </span>
                  <span style={{ color:D.muted, gridColumn:'1/-1' }}>💵 Chak manm pral touche:
                    <strong style={{ color:D.green }}> {fmt(payout)} HTG</strong>
                    <span style={{ color:D.muted }}> ({fmt(f.amount)} × {n} manm × {itv} interval)</span>
                  </span>
                </div>
                {itv > 1 && f.startDate && (
                  <div style={{ marginTop:8, background:D.goldDim, borderRadius:8, padding:'7px 11px', fontSize:10, color:D.gold }}>
                    💡 Manm #1 touche {ddmm(collectDate(f.startDate, f.frequency, 1, itv))} •
                    Manm #2 touche {ddmm(collectDate(f.startDate, f.frequency, 2, itv))} •
                    Manm #{n} touche {ddmm(collectDate(f.startDate, f.frequency, n, itv))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div>
            <label style={lbl}>Dat Kòmanse</label>
            <input style={inp} type="date" value={f.startDate} onChange={e => s('startDate', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Lè Peman</label>
            <input style={inp} type="time" value={f.dueTime} onChange={e => s('dueTime', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Frè Admin (HTG)</label>
            <input style={inp} type="number" min="0" value={f.fee} onChange={e => s('fee', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Frè p/Manm (HTG)</label>
            <input style={inp} type="number" min="0" value={f.feePerMember} onChange={e => s('feePerMember', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Penalite Anreta (HTG)</label>
            <input style={inp} type="number" min="0" value={f.penalty} onChange={e => s('penalty', e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <label style={lbl}>Estati</label>
              <select style={{ ...inp, cursor:'pointer' }} value={f.status} onChange={e => s('status', e.target.value)}>
                <option value="active">Aktif</option>
                <option value="paused">Suspann</option>
                <option value="completed">Fini</option>
              </select>
            </div>
          )}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>Règleman (Opsyonèl)</label>
            <textarea style={{ ...inp, minHeight:60, resize:'vertical' }} value={f.regleman} onChange={e => s('regleman', e.target.value)} placeholder="Règ ak kondisyon plan an..." />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button disabled={loading} onClick={() => onSave(f)} style={{ flex:2, padding:11, borderRadius:10, border:'none', cursor:'pointer', background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            {loading ? <Loader size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <Plus size={14} />}
            {loading ? 'Ap sove...' : (isEdit ? 'Mete Ajou' : 'Kreye Plan')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL — Ajoute Manm
// ✅ Plizyè plas pou yon sèl moun (yon sèl kont Sol)
// ✅ Dat koleksyon kalkile selon interval kòrèk
// ─────────────────────────────────────────────────────────────
function ModalAddMember({ plan, onClose, onSave, loading }) {
  const { token, tenantSlug } = useAuthStore()
  const itv       = Number(plan.interval || 1)
  const slots     = totalSlots(plan)
  const taken     = new Set((plan.members || []).map(m => m.position))
  const available = Array.from({ length: slots }, (_, i) => i + 1).filter(p => !taken.has(p))

  // Dat koleksyon pou chak plas
  const cDates = useMemo(() => {
    const m = {}
    available.forEach(p => { m[p] = collectDate(plan.startDate || plan.createdAt, plan.frequency, p, itv) })
    return m
  }, [plan, available, itv])

  // ── Multi-plas mode
  const [multiMode, setMultiMode]   = useState(false)
  const [selMulti,  setSelMulti]    = useState([])
  const [selSingle, setSelSingle]   = useState(available[0] || null)

  const positions = multiMode ? selMulti : (selSingle ? [selSingle] : [])

  function togglePos(p) {
    if (!multiMode) { setSelSingle(p); return }
    setSelMulti(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))
  }

  const [tab, setTab] = useState('info')
  const [form, setForm] = useState({ name:'', phone:'', cin:'', nif:'', address:'', referenceName:'', referencePhone:'', relationship:'' })
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [photoB64,   setPhotoB64]   = useState(null)
  const [idPhotoB64, setIdPhotoB64] = useState(null)
  const [pPrev,      setPPrev]      = useState(null)
  const [iPrev,      setIPrev]      = useState(null)

  const [existing,   setExisting]   = useState(null)
  const [checking,   setChecking]   = useState(false)

  const isFull = available.length === 0

  const checkPhone = useCallback(async (phone) => {
    if (phone.replace(/\D/g,'').length < 8) { setExisting(null); return }
    setChecking(true)
    try {
      const res = await fetch(`${API_URL}/sabotay/sol-account?phone=${encodeURIComponent(phone.trim())}`, { headers: { Authorization:`Bearer ${token}`, 'X-Tenant-Slug': tenantSlug || '' } })
      if (res.ok) { const d = await res.json(); setExisting(d.account || null) } else setExisting(null)
    } catch { setExisting(null) } finally { setChecking(false) }
  }, [token, tenantSlug])

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      const b = ev.target.result
      if (type === 'photo')   { setPPrev(b); setPhotoB64(b) }
      if (type === 'idPhoto') { setIPrev(b); setIdPhotoB64(b) }
    }
    r.readAsDataURL(file)
  }

  const tabStyle = active => ({ flex:1, padding:'8px 6px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700, border:'none', background: active ? D.goldDim : 'transparent', color: active ? D.gold : D.muted, borderBottom: active ? `2px solid ${D.gold}` : '2px solid transparent' })
  const imgBox   = { width:'100%', height:90, borderRadius:10, border:`1px solid ${D.border}`, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden' }

  const handleSave = () => {
    if (!form.name)      return toast.error('Non manm obligatwa.')
    if (!form.phone)     return toast.error('Telefòn obligatwa.')
    if (!positions.length) return toast.error('Chwazi omwen yon plas.')
    const creds = existing ? null : genCreds(form.name, form.phone)
    onSave({ ...form, positions, cDates, creds, existing, photoUrl: photoB64, idPhotoUrl: idPhotoB64 })
  }

  return (
    <Modal onClose={onClose} title="👤 Enskri Manm Sol" width={520}>
      {isFull ? (
        <div style={{ textAlign:'center', padding:'24px 0' }}>
          <AlertCircle size={40} style={{ color:D.red, marginBottom:12 }} />
          <p style={{ color:D.red, fontWeight:700 }}>Plan plen! ({plan.members?.length}/{slots})</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* ── PLAS + DAT KOLEKSYON ── */}
          <div style={{ background:D.goldDim, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <label style={{ ...lbl, margin:0 }}>Chwazi Plas (Dat Koleksyon)</label>
              {/* Toggle plizyè plas */}
              <button onClick={() => {
                const next = !multiMode
                setMultiMode(next)
                if (next) setSelMulti(selSingle ? [selSingle] : [])
                else setSelSingle(selMulti[0] || available[0] || null)
              }} style={{ padding:'4px 11px', borderRadius:8, border:'none', cursor:'pointer', fontSize:10, fontWeight:800, background: multiMode ? D.gold : D.borderSub, color: multiMode ? '#0a1222' : D.muted }}>
                {multiMode ? '✓ Plizyè Plas Aktif' : '+ Pran Plizyè Plas?'}
              </button>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {available.map(p => {
                const isOwn    = hasOwnerSlot(plan) && p === slots
                const isActive = multiMode ? selMulti.includes(p) : selSingle === p
                return (
                  <button key={p} onClick={() => togglePos(p)} style={{
                    padding:'7px 10px', borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', minWidth:66, position:'relative',
                    border:       `2px solid ${isActive ? (isOwn ? D.gold : D.blue) : D.borderSub}`,
                    background:    isActive ? (isOwn ? D.goldDim : D.blueBg) : 'transparent',
                  }}>
                    <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:14, color: isActive ? (isOwn ? D.gold : D.blue) : D.muted }}>#{p}</span>
                    <span style={{ fontSize:9, fontWeight:600, marginTop:2, color: isActive ? (isOwn ? D.gold : D.blue) : '#3a4a6a' }}>{ddmm(cDates[p])}</span>
                    {isOwn && <span style={{ position:'absolute', top:-5, right:-5, fontSize:8, background:D.gold, color:'#0a1222', borderRadius:6, padding:'1px 4px', fontWeight:900 }}>★</span>}
                    {multiMode && isActive && <span style={{ fontSize:8, color:D.blue, fontWeight:900 }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Rezime plas chwazi */}
            {positions.length > 0 && (
              <div style={{ marginTop:10, fontSize:11 }}>
                {positions.length > 1 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ color:D.gold, fontWeight:800 }}>
                      {positions.length} plas chwazi — {positions.length} manm ap kreye sou yon sèl kont
                    </span>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {positions.map(p => (
                        <span key={p} style={{ background:D.blueBg, color:D.blue, borderRadius:7, padding:'2px 8px', fontSize:10, fontWeight:700 }}>
                          Men #{p} → {ddmm(cDates[p])} · {fmt(memberPayout(plan))} HTG
                        </span>
                      ))}
                    </div>
                    <span style={{ color:D.green, fontWeight:700 }}>
                      💰 Total payout: {fmt(positions.length * memberPayout(plan))} HTG
                    </span>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:14, flexWrap:'wrap', color:D.muted }}>
                    <span>📅 Touche: <strong style={{ color:D.gold }}>{ddmm(cDates[positions[0]])}</strong></span>
                    <span>🏆 Payout: <strong style={{ color:D.green }}>{fmt(memberPayout(plan))} HTG</strong></span>
                    {itv > 1 && <span style={{ color:D.teal }}>⏱️ Interval ×{itv}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── TABS ── */}
          <div style={{ display:'flex', borderBottom:`1px solid ${D.borderSub}` }}>
            {[['info','👤 Enfòmasyon'],['kyc','🪪 KYC'],['ref','📞 Referans']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(tab===t)}>{l}</button>
            ))}
          </div>

          {/* TAB INFO */}
          {tab === 'info' && (
            <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
              <div>
                <label style={lbl}>Non Manm *</label>
                <input style={inp} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Non ak Prenon" />
              </div>
              <div>
                <label style={lbl}>Telefòn * {checking && <span style={{ color:D.muted, fontWeight:400 }}>ap verifye...</span>}</label>
                <input style={{ ...inp, fontSize:16 }} inputMode="tel" value={form.phone}
                  onChange={e => { sf('phone', e.target.value); checkPhone(e.target.value) }} placeholder="+509 XXXX XXXX" />
              </div>
              {existing && (
                <div style={{ background:D.tealBg, border:`1px solid ${D.teal}40`, borderRadius:10, padding:'10px 13px', display:'flex', gap:9 }}>
                  <UserCheck size={18} style={{ color:D.teal, flexShrink:0, marginTop:1 }} />
                  <div>
                    <p style={{ fontSize:12, fontWeight:800, color:D.teal, margin:'0 0 3px' }}>♻️ Kont Sol egziste pou {existing.memberName}</p>
                    <p style={{ fontSize:11, color:D.muted, margin:'0 0 3px' }}>Username: <strong style={{ color:D.text, fontFamily:'monospace' }}>{existing.username}</strong></p>
                    <p style={{ fontSize:10, color:D.muted, margin:0 }}>{existing.positions?.length || 0} men deja — nouvo men ap ajoute sou menm kont lan.</p>
                    <div style={{ marginTop:5, display:'flex', flexWrap:'wrap', gap:4 }}>
                      {existing.positions?.slice(0,4).map((pos,i) => (
                        <span key={i} style={{ fontSize:9, background:D.goldDim, color:D.gold, padding:'2px 7px', borderRadius:8, fontWeight:700 }}>{pos.planName} #{pos.memberPosition}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ background:D.purpleBg, border:`1px solid rgba(155,89,182,0.15)`, borderRadius:10, padding:'9px 13px', fontSize:11, color:D.muted, display:'flex', alignItems:'center', gap:8 }}>
                <Key size={13} style={{ color:D.purple, flexShrink:0 }} />
                <span>{existing
                  ? <><strong style={{ color:D.teal }}>Pozisyon(s) ap ajoute</strong> sou kont egzistant — kliyan ka wè tout men li nan yon sèl kont.</>
                  : <><strong style={{ color:D.purple }}>Nouvo kont Sol</strong> ap kreye otomatikman — kliyan ka wè tout men li ladan.</>
                }</span>
              </div>
            </div>
          )}

          {/* TAB KYC */}
          {tab === 'kyc' && (
            <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label style={lbl}>CIN</label><input style={inp} value={form.cin} onChange={e => sf('cin', e.target.value)} placeholder="1-23-456789-0" /></div>
                <div><label style={lbl}>NIF</label><input style={inp} value={form.nif} onChange={e => sf('nif', e.target.value)} placeholder="000-123-456-7" /></div>
              </div>
              <div><label style={lbl}>Adres Domisil</label><input style={inp} value={form.address} onChange={e => sf('address', e.target.value)} placeholder="Rue Capois, Pétionville" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Foto Kliyan</label>
                  <label htmlFor="s-photo" style={imgBox}>
                    {pPrev ? <img src={pPrev} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ textAlign:'center', color:D.muted }}><div style={{ fontSize:24 }}>📷</div><div style={{ fontSize:9 }}>Klike</div></div>}
                    <input id="s-photo" type="file" accept="image/*" style={{ display:'none' }} onChange={e => handlePhoto(e,'photo')} />
                  </label>
                </div>
                <div>
                  <label style={lbl}>Foto Pyes ID</label>
                  <label htmlFor="s-idphoto" style={imgBox}>
                    {iPrev ? <img src={iPrev} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ textAlign:'center', color:D.muted }}><div style={{ fontSize:24 }}>🪪</div><div style={{ fontSize:9 }}>CIN / Paspo</div></div>}
                    <input id="s-idphoto" type="file" accept="image/*" style={{ display:'none' }} onChange={e => handlePhoto(e,'idPhoto')} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB REFERANS */}
          {tab === 'ref' && (
            <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
              <div><label style={lbl}>Non Moun Referans</label><input style={inp} value={form.referenceName} onChange={e => sf('referenceName', e.target.value)} placeholder="Non ak Prenon" /></div>
              <div><label style={lbl}>Telefòn Referans</label><input style={inp} inputMode="tel" value={form.referencePhone} onChange={e => sf('referencePhone', e.target.value)} placeholder="+509 XXXX XXXX" /></div>
              <div>
                <label style={lbl}>Relasyon ak Kliyan</label>
                <select style={{ ...inp, cursor:'pointer' }} value={form.relationship} onChange={e => sf('relationship', e.target.value)}>
                  <option value="">— Chwazi —</option>
                  {RELS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ background:D.blueBg, borderRadius:10, padding:'9px 13px', fontSize:11, color:D.muted }}>
                <Shield size={12} style={{ color:D.blue, verticalAlign:'middle', marginRight:6 }} />
                Referans la ka kontakte si manm lan pa reyajisab.
              </div>
            </div>
          )}

          {/* BOUTON */}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:10, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
            <button disabled={loading || !positions.length} onClick={handleSave} style={{
              flex:2, padding:12, borderRadius:10, border:'none', cursor: loading ? 'default' : 'pointer',
              background: (loading || !positions.length) ? 'rgba(201,168,76,0.3)' : D.goldBtn,
              color:'#0a1222', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            }}>
              {loading ? <Loader size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Users size={15} />}
              {loading ? 'Ap enskri...' : positions.length > 1 ? `Enskri ${positions.length} Men` : existing ? 'Ajoute Men' : 'Enskri + Kreye Kont'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL — Credentials
// ─────────────────────────────────────────────────────────────
function ModalCreds({ member, creds, positions, cDates, plan, onClose }) {
  const [copied, setCopied] = useState(false)
  const isExist  = creds?.isExisting
  const multiPos = positions?.length > 1
  const itv      = Number(plan?.interval || 1)
  const payout   = plan ? memberPayout(plan) : 0

  const text = isExist
    ? `Non: ${member.name}\nItilizatè: ${creds.username}\n(Kont deja egziste)\nURL: app.plusgroupe.com/app/sol/login`
    : `Non: ${member.name}\nItilizatè: ${creds?.username}\nModpas: ${creds?.password}\nURL: app.plusgroupe.com/app/sol/login`

  const copy = () => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })

  return (
    <Modal onClose={onClose} title={isExist ? '🔗 Men Ajoute!' : '🔑 Kont Kliyan Kreye!'} width={430}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background: isExist ? D.tealBg : D.greenBg, border:`1px solid ${isExist ? D.teal : D.green}30`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <UserCheck size={22} style={{ color: isExist ? D.teal : D.green, flexShrink:0 }} />
          <div>
            <p style={{ fontSize:13, fontWeight:800, color: isExist ? D.teal : D.green, margin:0 }}>
              {multiPos ? `${positions.length} men enskri pou ${member.name}` : isExist ? `Men ajoute pou ${member.name}` : `Kont kreye pou ${member.name}`}
            </p>
            <p style={{ fontSize:11, color:D.muted, margin:'2px 0 0' }}>
              {multiPos ? `Kliyan ap wè tout ${positions.length} men li nan yon sèl kont Sol.` : 'Kliyan ka konekte pou wè tout enfòmasyon men li.'}
            </p>
          </div>
        </div>

        {/* Tablo men + dat si plizyè */}
        {multiPos && cDates && (
          <div style={{ background:D.goldDim, borderRadius:11, padding:'11px 14px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:D.gold, margin:'0 0 8px', textTransform:'uppercase' }}>📋 Lis Men ak Dat Koleksyon</p>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {positions.map((p, i) => (
                <div key={p} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, padding:'5px 8px', background:'rgba(0,0,0,0.2)', borderRadius:8 }}>
                  <span style={{ color:D.muted }}>Men #{i+1} <span style={{ color:D.blue, fontFamily:'monospace' }}>(Plas #{p})</span></span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'monospace', color:D.gold, fontWeight:700 }}>{ddmm(cDates[p])}</div>
                    <div style={{ fontSize:10, color:D.green }}>{fmt(payout)} HTG</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:8, fontSize:12, fontWeight:800, color:D.green, textAlign:'right' }}>
              Total: {fmt(positions.length * payout)} HTG
            </div>
          </div>
        )}

        <div style={{ background:D.purpleBg, border:`1px solid rgba(155,89,182,0.20)`, borderRadius:14, padding:16 }}>
          <p style={{ fontSize:10, fontWeight:800, color:D.purple, textTransform:'uppercase', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
            <Key size={11} /> Enfòmasyon Koneksyon
          </p>
          <div style={{ fontSize:10, color:D.muted, marginBottom:4 }}>URL Login</div>
          <div style={{ fontFamily:'monospace', fontSize:11, color:D.teal, background:'rgba(0,0,0,0.25)', padding:'7px 12px', borderRadius:8, marginBottom:10 }}>app.plusgroupe.com/app/sol/login</div>
          <div style={{ fontSize:10, color:D.muted, marginBottom:4 }}>Non Itilizatè</div>
          <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:18, color:D.text, background:'rgba(0,0,0,0.25)', padding:'10px 14px', borderRadius:8, wordBreak:'break-all', marginBottom:10 }}>{creds?.username}</div>
          {!isExist && creds?.password && (
            <>
              <div style={{ fontSize:10, color:D.muted, marginBottom:4 }}>Modpas Pwovizwa</div>
              <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:22, color:D.gold, background:'rgba(0,0,0,0.25)', padding:'10px 14px', borderRadius:8, letterSpacing:'0.15em', textAlign:'center' }}>{creds.password}</div>
            </>
          )}
          {isExist && <div style={{ background:D.tealBg, borderRadius:8, padding:'8px 12px', fontSize:11, color:D.teal, marginTop:6 }}>♻️ Kliyan itilize menm modpas li deja genyen an.</div>}
        </div>

        {!isExist && <p style={{ fontSize:11, color:D.muted, background:D.redBg, borderRadius:8, padding:'8px 12px', margin:0 }}>⚠️ Note modpas sa kounye a. Kliyan dwe chanje l apre premye koneksyon.</p>}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={copy} style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${D.borderSub}`, background:'rgba(255,255,255,0.05)', color: copied ? D.green : D.muted, cursor:'pointer', fontWeight:700, fontSize:13 }}>
            {copied ? '✅ Kopye!' : '📋 Kopye'}
          </button>
          <button onClick={onClose} style={{ flex:2, padding:11, borderRadius:10, border:'none', background:D.goldBtn, color:'#0a1222', cursor:'pointer', fontWeight:800, fontSize:13 }}>Fèmen</button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MODAL — Peman
// ✅ Total peryòd = maxMembers × interval
// ─────────────────────────────────────────────────────────────
function ModalPayment({ plan, member, onClose, onSave, loading }) {
  const itv      = Number(plan.interval || 1)
  const rounds   = totalRounds(plan.maxMembers, itv)
  const paidSet  = new Set(Object.keys(member.payments || {}))
  const today    = new Date().toISOString().split('T')[0]

  const allDates = useMemo(() =>
    Array.from({ length: rounds }, (_, i) => payPeriodDate(plan.startDate, plan.frequency, i + 1)),
    [plan, rounds]
  )
  const memberCollect = collectDate(plan.startDate, plan.frequency, member.position, itv)

  const [selected, setSelected] = useState({})
  const [timings,  setTimings]  = useState({})
  const [method,   setMethod]   = useState('cash')

  const selDates = Object.keys(selected).filter(d => selected[d])
  const total    = selDates.length * Number(plan.amount)

  return (
    <Modal onClose={onClose} title={`💳 Peman — ${member.name} (Plas #${member.position})`} width={520}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        <div style={{ background:D.goldDim, borderRadius:10, padding:'10px 14px', display:'flex', gap:16, flexWrap:'wrap', fontSize:11 }}>
          <span style={{ color:D.muted }}>🏆 Dat touche: <strong style={{ color:D.gold }}>{ddmm(memberCollect)}</strong></span>
          <span style={{ color:D.muted }}>💵 Payout: <strong style={{ color:D.green }}>{fmt(memberPayout(plan))} HTG</strong></span>
          <span style={{ color:D.muted }}>📊 Peye: <strong style={{ color:D.text }}>{paidSet.size}/{rounds}</strong></span>
          {itv > 1 && <span style={{ color:D.teal, fontWeight:700 }}>⏱️ Interval ×{itv} — {rounds} peryòd total ({plan.maxMembers} manm × {itv})</span>}
        </div>

        <div>
          <label style={{ ...lbl, marginBottom:8 }}>Chwazi Peryòd Peman
            <span style={{ fontWeight:400, textTransform:'none', marginLeft:8 }}>({paidSet.size} peye · {allDates.filter(d=>d<=today&&!paidSet.has(d)).length} anreta)</span>
          </label>
          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            {allDates.map((d, i) => {
              const isPaid = paidSet.has(d)
              const isLate = d <= today && !isPaid
              const isSel  = selected[d] && !isPaid
              const isColl = d === memberCollect
              return (
                <div key={d} onClick={() => !isPaid && setSelected(p => ({ ...p, [d]: !p[d] }))} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:9, cursor: isPaid ? 'default' : 'pointer',
                  background: isPaid ? 'rgba(34,197,94,0.06)' : isSel ? D.blueBg : isLate ? D.redBg : 'transparent',
                  border: `1px solid ${isPaid ? D.green+'30' : isSel ? D.blue+'60' : isLate ? D.red+'25' : D.borderSub}`,
                }}>
                  <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, border:`2px solid ${isPaid ? D.green : isSel ? D.blue : D.borderSub}`, background: isPaid ? D.green : isSel ? D.blue : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {(isPaid||isSel) && <span style={{ color:'#fff', fontSize:8 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:10, color:D.muted, fontFamily:'monospace', flexShrink:0 }}>P{i+1}</span>
                  <span style={{ fontSize:12, color: isPaid ? D.green : isLate ? D.red : D.text, flex:1 }}>
                    {ddmm(d)}
                    {isColl && <span style={{ marginLeft:6, fontSize:9, background:D.goldDim, color:D.gold, padding:'1px 5px', borderRadius:5, fontWeight:800 }}>★ Koleksyon</span>}
                  </span>
                  {isPaid && <span style={{ fontSize:10, color:D.green, fontWeight:700 }}>✅</span>}
                  {isLate && !isPaid && <span style={{ fontSize:10, color:D.red, fontWeight:700 }}>⚠️</span>}
                  {isSel && (
                    <select onClick={e => e.stopPropagation()} value={timings[d]||'onTime'}
                      onChange={e => { e.stopPropagation(); setTimings(p => ({ ...p, [d]: e.target.value })) }}
                      style={{ fontSize:10, background:D.card, color:D.text, border:`1px solid ${D.borderSub}`, borderRadius:6, padding:'2px 4px', cursor:'pointer' }}>
                      <option value="onTime">Alè</option>
                      <option value="late">Anreta</option>
                      <option value="early">Davans</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <label style={lbl}>Metòd Peman</label>
          <div style={{ display:'flex', gap:7 }}>
            {[['cash','💵 Kach'],['transfer','📱 Transfè'],['moncash','📲 MonCash'],['check','🏦 Chèk']].map(([v,l]) => (
              <button key={v} onClick={() => setMethod(v)} style={{ flex:1, padding:'7px 4px', borderRadius:9, border:`1px solid ${method===v ? D.gold+'50' : D.borderSub}`, cursor:'pointer', fontSize:10, fontWeight:700, background: method===v ? D.goldDim : 'transparent', color: method===v ? D.gold : D.muted }}>{l}</button>
            ))}
          </div>
        </div>

        {selDates.length > 0 && (
          <div style={{ background:D.goldDim, borderRadius:10, padding:'11px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:D.muted }}>{selDates.length} peryòd × {fmt(plan.amount)} HTG</span>
            <span style={{ fontSize:16, fontWeight:800, color:D.gold }}>{fmt(total)} HTG</span>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:11, borderRadius:10, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button disabled={loading || !selDates.length} onClick={() => onSave({ dates: selDates, timings, method })} style={{
            flex:2, padding:11, borderRadius:10, border:'none',
            background: (loading || !selDates.length) ? 'rgba(201,168,76,0.3)' : D.goldBtn,
            color:'#0a1222', fontWeight:800, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          }}>
            {loading ? <Loader size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <CheckCircle size={14} />}
            {loading ? 'Ap anrejistre...' : `Konfime ${selDates.length} Peman`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// KART PLAN
// ─────────────────────────────────────────────────────────────
function PlanCard({ plan, onAddMember, onMarkPaid, onDeleteMember, onEditPlan }) {
  const [expanded, setExpanded] = useState(false)
  const itv           = Number(plan.interval || 1)
  const activeMembers = (plan.members || []).filter(m => m.isActive)
  const slots         = totalSlots(plan)
  const rounds        = totalRounds(plan.maxMembers, itv)
  const paidCount     = activeMembers.reduce((s, m) => s + Object.keys(m.payments || {}).length, 0)
  const maxPaid       = activeMembers.length * rounds
  const pct           = maxPaid > 0 ? Math.round((paidCount / maxPaid) * 100) : 0
  const sColor        = { active:D.green, paused:D.yellow, completed:D.blue }[plan.status] || D.muted
  const sLabel        = { active:'Aktif', paused:'Suspann', completed:'Fini' }[plan.status] || plan.status

  return (
    <div style={{ background:D.card, borderRadius:16, border:`1px solid ${D.border}`, overflow:'hidden' }}>
      <div style={{ padding:'16px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:D.goldDim, border:`1px solid ${D.gold}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💰</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:800, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plan.name}</h3>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:6, background:sColor+'20', color:sColor, flexShrink:0 }}>{sLabel}</span>
            {itv > 1 && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:6, background:D.tealBg, color:D.teal, flexShrink:0 }}>×{itv}</span>}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', fontSize:11, color:D.muted }}>
            <span>💵 {fmt(plan.amount)} HTG</span>
            <span>👥 {activeMembers.length}/{slots}</span>
            <span>🗓️ {FREQ_LABELS[plan.frequency] || plan.frequency}</span>
            {itv > 1 && <span style={{ color:D.teal }}>⏱️ Touche ×{itv} — {rounds} peryòd</span>}
            <span>🏆 {fmt(memberPayout(plan))} HTG</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {plan.status === 'active' && (
            <button onClick={e => { e.stopPropagation(); onAddMember(plan) }} style={{ padding:'7px 13px', borderRadius:9, border:'none', cursor:'pointer', background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
              <Plus size={12} /> Manm
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onEditPlan(plan) }} style={{ padding:'7px 9px', borderRadius:9, border:`1px solid ${D.borderSub}`, background:'transparent', color:D.muted, cursor:'pointer' }}><Edit2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color:D.muted }} /> : <ChevronDown size={16} style={{ color:D.muted }} />}
        </div>
      </div>

      {/* Bari pwogrè */}
      <div style={{ height:3, background:D.borderSub, marginInline:18 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:D.goldBtn, borderRadius:99, transition:'width 0.5s' }} />
      </div>

      {/* Manm yo */}
      {expanded && (
        <div style={{ padding:'14px 18px 18px' }}>
          {activeMembers.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:D.muted, fontSize:13 }}>Pa gen manm — klike "Manm" pou ajoute.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {activeMembers.sort((a,b) => a.position - b.position).map(member => {
                const paidSet   = new Set(Object.keys(member.payments || {}))
                const today     = new Date().toISOString().split('T')[0]
                const allDates  = Array.from({ length: rounds }, (_, i) => payPeriodDate(plan.startDate, plan.frequency, i+1))
                const lateCount = allDates.filter(d => d <= today && !paidSet.has(d)).length
                const cDate     = collectDate(plan.startDate, plan.frequency, member.position, itv)
                return (
                  <div key={member.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, background:'rgba(255,255,255,0.025)', border:`1px solid ${D.borderSub}` }}>
                    <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, background: member.isOwnerSlot ? D.goldDim : D.blueBg, border:`1px solid ${member.isOwnerSlot ? D.gold+'40' : D.blue+'30'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', fontWeight:900, fontSize:13, color: member.isOwnerSlot ? D.gold : D.blue }}>
                      #{member.position}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:D.text, display:'flex', alignItems:'center', gap:6 }}>
                        {member.name}
                        {member.hasWon && <span style={{ fontSize:9, background:D.green+'20', color:D.green, padding:'1px 6px', borderRadius:5, fontWeight:800 }}>✓ Touche</span>}
                        {member.isOwnerSlot && <span style={{ fontSize:9, background:D.goldDim, color:D.gold, padding:'1px 6px', borderRadius:5, fontWeight:800 }}>Patwon</span>}
                      </div>
                      <div style={{ fontSize:11, color:D.muted, marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span>📞 {member.phone}</span>
                        <span style={{ color:D.gold }}>📅 {ddmm(cDate)}</span>
                        <span style={{ color:D.green }}>✅ {paidSet.size}/{rounds}</span>
                        {lateCount > 0 && <span style={{ color:D.red }}>⚠️ {lateCount} anreta</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {!member.isOwnerSlot && (
                        <button onClick={() => onMarkPaid(plan, member)} style={{ padding:'6px 11px', borderRadius:8, border:'none', cursor:'pointer', background:D.goldDim, color:D.gold, fontWeight:700, fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                          <DollarSign size={11} /> Peye
                        </button>
                      )}
                      <button onClick={() => onDeleteMember(plan.id, member)} style={{ padding:'6px 9px', borderRadius:8, border:`1px solid ${D.red}30`, background:D.redBg, color:D.red, cursor:'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGE PRENSIPAL
// ─────────────────────────────────────────────────────────────
export default function SabotayPage() {
  const api = useApi()
  const [plans,   setPlans]   = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [mPlan,   setMPlan]   = useState(null)
  const [mMember, setMMember] = useState(null)
  const [mPay,    setMPay]    = useState(null)
  const [mCreds,  setMCreds]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, sr] = await Promise.all([ api.get('/sabotay/plans?limit=100'), api.get('/sabotay/stats') ])
      if (pr.success) setPlans(pr.plans || [])
      if (sr.success) setStats(sr)
    } catch { toast.error('Erè chajman.') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSavePlan = async (data) => {
    setSaving(true)
    try {
      const res = mPlan?.id ? await api.put(`/sabotay/plans/${mPlan.id}`, data) : await api.post('/sabotay/plans', data)
      if (!res.success) throw new Error(res.message)
      toast.success(mPlan?.id ? 'Plan mete ajou!' : 'Plan kreye!')
      setMPlan(null); load()
    } catch (err) { toast.error(err.message || 'Erè.') } finally { setSaving(false) }
  }

  // ✅ Sipò plizyè plas — loop sou positions[]
  const handleSaveMember = async (data) => {
    if (!mMember) return
    setSaving(true)
    try {
      const { positions, cDates, creds, existing, ...base } = data
      const saved = []
      for (const pos of positions) {
        const isOwnerSlot = hasOwnerSlot(mMember) && pos === totalSlots(mMember)
        const res = await api.post(`/sabotay/plans/${mMember.id}/members`, {
          ...base,
          position:     pos,
          isOwnerSlot,
          preferredDate: cDates[pos] || null,
          credentials:  saved.length === 0 ? creds : null,  // sèlman premye fwa
        })
        if (!res.success) throw new Error(`Plas #${pos}: ${res.message}`)
        saved.push(res.member)
      }
      toast.success(positions.length > 1 ? `${saved.length} men enskri pou ${base.name}!` : `${base.name} enskri nan plas #${positions[0]}!`)

      // Afiche credentials
      const first = saved[0]
      if (first?._solAccount) {
        setMCreds({
          member:    first,
          creds:     { username: first._solAccount.username, password: first._solAccount.isExisting ? null : first._solAccount.plainPassword, isExisting: first._solAccount.isExisting },
          positions, cDates, plan: mMember,
        })
      }
      setMMember(null); load()
    } catch (err) { toast.error(err.message || 'Erè enskripsyon.') } finally { setSaving(false) }
  }

  const handleMarkPaid = async (data) => {
    if (!mPay) return
    setSaving(true)
    try {
      const res = await api.post(`/sabotay/plans/${mPay.plan.id}/members/${mPay.member.id}/payments`, data)
      if (!res.success) throw new Error(res.message)
      toast.success(`${res.count || data.dates?.length || 1} peman anrejistre!`)
      setMPay(null); load()
    } catch (err) { toast.error(err.message || 'Erè peman.') } finally { setSaving(false) }
  }

  const handleDeleteMember = async (planId, member) => {
    if (!window.confirm(`Retire ${member.name} (Plas #${member.position})?`)) return
    try {
      const res = await api.del(`/sabotay/plans/${planId}/members/${member.id}`)
      if (!res.success) throw new Error(res.message)
      toast.success('Manm retire.'); load()
    } catch (err) { toast.error(err.message || 'Erè.') }
  }

  const filtered = useMemo(() =>
    plans.filter(p => (filter === 'all' || p.status === filter) && (!search || p.name.toLowerCase().includes(search.toLowerCase()))),
    [plans, filter, search]
  )

  return (
    <div style={{ padding:'20px 16px', maxWidth:900, margin:'0 auto', color:D.text }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:D.gold }}>💰 Jesyon Sol</h1>
          <p style={{ margin:'3px 0 0', fontSize:12, color:D.muted }}>{plans.length} plan total</p>
        </div>
        <button onClick={() => setMPlan('new')} style={{ padding:'10px 18px', borderRadius:11, border:'none', cursor:'pointer', background:D.goldBtn, color:'#0a1222', fontWeight:800, fontSize:13, display:'flex', alignItems:'center', gap:7 }}>
          <Plus size={15} /> Nouvo Plan
        </button>
      </div>

      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10, marginBottom:20 }}>
          {[['📋','Plan Total',stats.totalPlans,D.blue],['🟢','Plan Aktif',stats.activePlans,D.green],['👥','Manm Aktif',stats.totalMembers,D.gold],['✅','Peman Jodi',stats.paymentsToday,D.teal]].map(([icon,label,val,color]) => (
            <div key={label} style={{ background:D.card, borderRadius:12, padding:'13px 15px', border:`1px solid ${D.borderSub}` }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:20, fontWeight:900, color }}>{val ?? '—'}</div>
              <div style={{ fontSize:10, color:D.muted, fontWeight:600, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:160 }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:D.muted }} />
          <input style={{ ...inp, paddingLeft:32 }} placeholder="Chèche plan..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','Tout'],['active','Aktif'],['paused','Suspann'],['completed','Fini']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding:'8px 13px', borderRadius:9, border:`1px solid ${filter===v ? D.gold+'40' : D.borderSub}`, cursor:'pointer', fontSize:12, fontWeight:700, background: filter===v ? D.goldDim : 'transparent', color: filter===v ? D.gold : D.muted }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'50px 0', color:D.muted }}>
          <Loader size={28} style={{ animation:'spin 0.8s linear infinite', marginBottom:12, color:D.gold }} />
          <p>Ap chaje...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', color:D.muted }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💰</div>
          <p style={{ fontSize:15, fontWeight:700, color:D.text }}>Pa gen plan Sol</p>
          <p>Klike "Nouvo Plan" pou kòmanse.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(plan => (
            <PlanCard key={plan.id} plan={plan}
              onAddMember={p => setMMember(p)}
              onMarkPaid={(p,m) => setMPay({ plan:p, member:m })}
              onDeleteMember={(pid,m) => handleDeleteMember(pid, m)}
              onEditPlan={p => setMPlan(p)} />
          ))}
        </div>
      )}

      {mPlan   && <ModalPlan plan={mPlan==='new'?null:mPlan} onClose={() => setMPlan(null)} onSave={handleSavePlan} loading={saving} />}
      {mMember && <ModalAddMember plan={mMember} onClose={() => setMMember(null)} onSave={handleSaveMember} loading={saving} />}
      {mPay    && <ModalPayment plan={mPay.plan} member={mPay.member} onClose={() => setMPay(null)} onSave={handleMarkPaid} loading={saving} />}
      {mCreds  && <ModalCreds member={mCreds.member} creds={mCreds.creds} positions={mCreds.positions} cDates={mCreds.cDates} plan={mCreds.plan} onClose={() => setMCreds(null)} />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
