// ─────────────────────────────────────────────────────────────
// ModalAddMember.jsx — Enskri Manm Sol
// ✅ Design "Plus Fit"
// ✅ Pwopriyetè ka pran plizyè men otomatikman selon montan
// ✅ NOUVO: verifikasyon telefòn ak "debounce" (1 sèl demann apre w fin tape — anvan sa: 1 pa lèt)
// ✅ NOUVO: foto yo konprese (max 1000px JPEG) avan voye — mwens done, mwens egress
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { Users, Star, UserCheck, UserPlus, ArrowLeft, Calendar, Camera, CreditCard, User, ShieldCheck, Phone, Trophy, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Modal } from './sabotayAtoms'
import { D, fmt, RELATIONSHIPS, getPayoutDate, generateCredentials, API_URL } from './sabotayUtils'
import { T, hexA } from './kane-epay/kaneEpayConstants'
import { Chip, Spinner, Field, PhotoBox } from './kane-epay/KaneEpayComponents'

const AM_STYLES = `
.am-owner{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:18px;border:1.5px dashed rgba(224,164,16,.5);background:#fffaf0;cursor:pointer;text-align:left;font:inherit;transition:all .25s}
.am-owner.on{border-style:solid;border-color:var(--night);background:var(--night);color:#f2f1ec}
.am-owner .ic{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FFD45C,#E0A410);color:#0b0c0f;flex-shrink:0}
.am-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:8px;max-height:236px;overflow-y:auto;padding:2px}
.am-slot{position:relative;padding:10px 8px;border-radius:15px;border:1.5px solid var(--border);background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit;transition:all .18s}
.am-slot:hover{border-color:rgba(20,21,26,.25);transform:translateY(-1px)}
.am-slot b{font-family:var(--display);font-weight:800;font-size:18px;line-height:1;color:var(--ink)}
.am-slot span{font-size:11px;font-weight:700;color:var(--muted)}
.am-slot.on{background:var(--night);border-color:var(--night)}
.am-slot.on b{color:#FFC83D}.am-slot.on span{color:rgba(242,241,236,.65)}
.am-slot .nw{position:absolute;top:-7px;right:6px;font-size:9px;font-weight:800;letter-spacing:.06em;background:#FFC83D;color:#0b0c0f;border-radius:999px;padding:1px 6px}
.am-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;background:var(--soft);border-radius:15px}
.am-tabs button{height:40px;border:0;border-radius:11px;background:transparent;font:700 12.5px var(--body);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s}
.am-tabs button.on{background:#fff;color:var(--ink);box-shadow:0 4px 12px -6px rgba(20,21,26,.3)}
.am-pos{display:flex;flex-direction:column;gap:6px}
.am-pos>div{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border-radius:13px;background:var(--soft);font-size:13px;font-weight:700}
`

// Konprese yon imaj (dataURL JPEG, max 1000px) — PA chanje kalite vizyèl
function compressImage(file, max = 1000, q = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = () => resolve(ev.target.result)
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        try { resolve(c.toDataURL('image/jpeg', q)) } catch { resolve(ev.target.result) }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

export function ModalAddMember({ plan, onClose, onSave, loading, onShowCreds }) {
  useEffect(() => {
    if (document.getElementById('am-styles')) return
    const el = document.createElement('style'); el.id = 'am-styles'; el.textContent = AM_STYLES
    document.head.appendChild(el)
  }, [])

  // ── Slots disponib pou manm nòmal ──────────────────────────
  const { availableSlots, ownerMember, newestPos } = useMemo(() => {
    const taken       = new Set((plan.members || []).map(m => m.position))
    const maxPos      = Math.max(0, ...(plan.members || []).map(m => m.position))
    const ownerMember = (plan.members || []).find(m => m.isOwnerSlot)
    const PREVIEW_SLOTS = 10
    const gaps        = Array.from({ length: maxPos }, (_, i) => i + 1).filter(p => !taken.has(p) && p !== 1)
    const futureSlots = Array.from({ length: PREVIEW_SLOTS }, (_, i) => maxPos + 1 + i)
    const availableSlots = [...gaps, ...futureSlots].map(pos => ({ position: pos, date: getPayoutDate(plan, pos) }))
    return { availableSlots, ownerMember, newestPos: maxPos + 1 }
  }, [plan])

  const [selectedSlots,    setSelectedSlots]    = useState([])
  const [ownerMode,        setOwnerMode]        = useState(false)
  const [ownerAmount,      setOwnerAmount]      = useState('')
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false)
  const [tab,              setTab]              = useState('info')
  const [form, setForm] = useState({ name: '', phone: '', cin: '', nif: '', address: '', referenceName: '', referencePhone: '', relationship: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [photoB64,        setPhotoB64]        = useState(null)
  const [idPhotoB64,      setIdPhotoB64]      = useState(null)
  const [existingAccount, setExistingAccount] = useState(null)
  const [checkingPhone,   setCheckingPhone]   = useState(false)

  // ── Kalkil men pwopriyetè ─────────────────────────────────
  const planAmount      = Number(plan.amount) || 1
  const ownerAmountNum  = Number(ownerAmount) || 0
  const ownerSlotsCount = ownerAmountNum >= planAmount ? Math.floor(ownerAmountNum / planAmount) : 1

  const ownerPositions = useMemo(() => {
    if (!ownerMode) return []
    const taken = new Set((plan.members || []).map(m => m.position))
    const result = []
    let pos = 1
    while (result.length < ownerSlotsCount && pos <= 500) {
      if (!taken.has(pos)) result.push(pos)
      pos++
    }
    return result
  }, [ownerMode, ownerSlotsCount, plan.members])

  const positions          = ownerMode ? ownerPositions : selectedSlots.map(s => s.position)
  const currentActive      = (plan.members || []).filter(m => m.status !== 'stopped').length
  const projectedTotal     = currentActive + positions.length
  const projectedMemberPay = Math.max(0, planAmount * projectedTotal - Number(plan.feePerMember || 0))
  const projectedOwnerPay  = planAmount * projectedTotal * ownerSlotsCount
  const totalPerCycle      = positions.length * planAmount

  const toggleSlot = (slot) => {
    setOwnerMode(false)
    setSelectedSlots(prev => prev.find(s => s.position === slot.position)
      ? prev.filter(s => s.position !== slot.position)
      : [...prev, slot].sort((a, b) => a.position - b.position))
  }

  // ── ✅ Verifikasyon telefòn ak debounce (600ms) ────────────
  const phoneTimer = useRef(null)
  const phoneReq   = useRef(0)
  useEffect(() => () => clearTimeout(phoneTimer.current), [])
  const checkPhone = (phone) => {
    clearTimeout(phoneTimer.current)
    if (phone.replace(/\D/g, '').length < 8) { setExistingAccount(null); setCheckingPhone(false); return }
    setCheckingPhone(true)
    phoneTimer.current = setTimeout(async () => {
      const id = ++phoneReq.current
      try {
        const slug      = localStorage.getItem('plusgroup-slug')
        const { token } = useAuthStore.getState()
        const res  = await fetch(`${API_URL}/sabotay/sol-account?phone=${encodeURIComponent(phone)}`,
          { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' } })
        const data = await res.json()
        if (id === phoneReq.current) setExistingAccount(res.ok ? (data.account || null) : null)
      } catch { if (id === phoneReq.current) setExistingAccount(null) }
      finally { if (id === phoneReq.current) setCheckingPhone(false) }
    }, 600)
  }

  const handlePhoto = async (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const b64 = await compressImage(file)
      if (type === 'photo') setPhotoB64(b64)
      else setIdPhotoB64(b64)
    } catch { toast.error('Pa ka li foto a.') }
  }

  const doSave = (isOwnerSlot, finalPositions) => {
    const firstPos       = finalPositions[0]
    const credentials    = existingAccount ? null : generateCredentials(form.name, form.phone)
    const payoutDatesMap = {}
    finalPositions.forEach(p => { payoutDatesMap[p] = getPayoutDate(plan, p) })
    onSave({
      ...form, position: firstPos, positions: finalPositions, credentials, isOwnerSlot,
      cin: form.cin || null, nif: form.nif || null, address: form.address || null,
      photoUrl: photoB64 || null, idPhotoUrl: idPhotoB64 || null,
      referenceName: form.referenceName || null, referencePhone: form.referencePhone || null,
      relationship: form.relationship || null, preferredDate: payoutDatesMap[firstPos] || null,
      _cb: (saved) => onShowCreds({
        member: saved || { ...form, position: firstPos, positions: finalPositions },
        credentials: existingAccount
          ? { username: existingAccount.username, password: null, isExisting: true }
          : { ...credentials, username: saved?.username || credentials?.username },
        positions: finalPositions, payoutDates: payoutDatesMap,
      }),
    })
  }

  const handleSubmit = () => {
    if (!form.name.trim())  { setTab('info'); return toast.error('Non manm obligatwa.') }
    if (!form.phone.trim()) { setTab('info'); return toast.error('Telefòn obligatwa.') }
    if (ownerMode) {
      if (ownerAmountNum > 0 && ownerAmountNum < planAmount) return toast.error(`Montan minimòm: ${fmt(planAmount)} HTG (= 1 men sol).`)
      setShowOwnerConfirm(true)
    } else {
      if (!selectedSlots.length) return toast.error('Chwazi omwen yon dat.')
      doSave(false, positions)
    }
  }

  const ownerConfirmFooter = (
    <>
      <button className="ke-fbtn" onClick={() => setShowOwnerConfirm(false)}><ArrowLeft size={16} /> Tounen</button>
      <button className="ke-fbtn main gold" disabled={loading} onClick={() => doSave(true, ownerPositions)}>
        {loading ? <Spinner size={16} /> : <Star size={17} />} {loading ? 'Ap enskri...' : `Wi, kreye ${ownerSlotsCount} men`}
      </button>
    </>
  )

  const footer = showOwnerConfirm ? ownerConfirmFooter : (
    <>
      <button className="ke-fbtn" onClick={onClose}>Anile</button>
      <button className={`ke-fbtn main ${ownerMode ? 'gold' : 'dark'}`} disabled={loading || (!ownerMode && selectedSlots.length === 0)} onClick={handleSubmit}>
        {loading ? <Spinner size={16} /> : ownerMode ? <Star size={17} /> : <UserPlus size={17} />}
        {loading ? 'Ap enskri...'
          : ownerMode ? `Pwopriyetè · ${ownerSlotsCount} men`
          : selectedSlots.length > 1 ? `Enskri · ${selectedSlots.length} men`
          : selectedSlots.length === 1 ? 'Enskri · 1 men' : 'Chwazi yon dat'}
      </button>
    </>
  )

  // ── Etap konfimasyon pwopriyetè ───────────────────────────
  if (showOwnerConfirm) return (
    <Modal onClose={onClose} title="Konfime pwopriyetè" subtitle={form.name} icon={<Star size={20} />} width={480} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>
        <div style={{ background: D.night, color: '#f2f1ec', borderRadius: 22, padding: 18 }}>
          <span className="ke-eyebrow" style={{ color: '#FFC83D' }}>{ownerSlotsCount} men pwopriyetè sol</span>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 42, lineHeight: 1, color: '#FFC83D' }}>
            {fmt(projectedOwnerPay)}<small style={{ fontSize: 14, color: 'rgba(242,241,236,.55)', marginLeft: 5 }}>HTG</small>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'rgba(242,241,236,.65)', fontWeight: 600 }}>Lòt manm yo ap touche {fmt(projectedMemberPay)} HTG chak</p>
        </div>
        <div className="am-pos">
          {ownerPositions.map((pos, i) => (
            <div key={pos}>
              <span>{i === 0 ? '★ Men pwopriyetè' : `Men anplis ${i + 1}`} · #{pos}</span>
              <Chip color={T.blue} icon={<Calendar size={10} />}>{getPayoutDate(plan, pos)?.split('-').reverse().join('/') || '—'}</Chip>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )

  return (
    <Modal onClose={onClose} title="Enskri manm" subtitle={`${plan.name} · ${fmt(planAmount)} HTG / sik`} icon={<UserPlus size={20} />} width={560} footer={footer}>
      <div className="ke-col" style={{ gap: 14 }}>

        {ownerMember && (
          <div className="ke-alert" style={{ '--c': T.goldInk, '--cbg': '#fffaf0', '--cbd': hexA(T.goldDeep, .35), margin: 0 }}>
            <Star size={16} /><div><b>Pwopriyetè sol — {ownerMember.name}.</b> Tape menm nimewo a pou ajoute nouvo men.</div>
          </div>
        )}

        <button className={`am-owner ${ownerMode ? 'on' : ''}`} onClick={() => { setOwnerMode(o => !o); setSelectedSlots([]) }}>
          <span className="ic"><Star size={19} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 14 }}>{ownerMode ? 'Mòd pwopriyetè aktif' : 'Enskri kòm pwopriyetè sol'}</b>
            <span style={{ fontSize: 12, opacity: .7, fontWeight: 600 }}>Pran premye plas yo, plizyè men selon montan</span>
          </span>
          {ownerMode && <CheckCircle size={20} color="#FFC83D" />}
        </button>

        {ownerMode ? (
          <div style={{ background: '#fff', border: `1px solid ${D.border}`, borderRadius: 20, padding: 16 }}>
            <Field label="Montan pa sik (HTG) *" hint={`Sol la = ${fmt(planAmount)} HTG / manm / sik`}>
              <input type="number" inputMode="decimal" className="ke-input" value={ownerAmount} onChange={e => setOwnerAmount(e.target.value)}
                placeholder={fmt(planAmount)} style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, textAlign: 'center', height: 56 }} />
            </Field>
            <div className="ke-summary">
              <div className="line"><span>Montan antre</span><b>{fmt(ownerAmountNum || planAmount)} HTG</b></div>
              <div className="line"><span>÷ sol ({fmt(planAmount)})</span><b style={{ color: T.goldInk }}>{ownerSlotsCount} men</b></div>
              <div className="total"><span>Ap touche</span><b style={{ color: T.green }}>{fmt(projectedOwnerPay)}</b></div>
            </div>
            <div className="am-pos" style={{ marginTop: 10 }}>
              {ownerPositions.map((pos, i) => (
                <div key={pos}>
                  <span>{i === 0 ? '★ Men pwopriyetè' : `Men anplis ${i + 1}`} · #{pos}</span>
                  <span style={{ color: D.muted }}>{getPayoutDate(plan, pos)?.split('-').reverse().join('/') || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="ke-label" style={{ margin: 0 }}><Calendar size={11} style={{ verticalAlign: '-1px' }} /> Chwazi dat touche</label>
              {selectedSlots.length > 0 && <Chip color={T.ink}>{selectedSlots.length} chwazi</Chip>}
            </div>
            <div className="am-slots">
              {availableSlots.map(slot => {
                const on = !!selectedSlots.find(s => s.position === slot.position)
                return (
                  <button key={slot.position} className={`am-slot ${on ? 'on' : ''}`} onClick={() => toggleSlot(slot)}>
                    {slot.position === newestPos && !on && <span className="nw">NOUVO</span>}
                    <b>{slot.date ? slot.date.split('-').reverse().slice(0, 2).join('/') : '—'}</b>
                    <span>Men #{slot.position}{slot.date ? ` · ${slot.date.slice(0, 4)}` : ''}</span>
                  </button>
                )
              })}
            </div>
            {selectedSlots.length > 0 && (
              <div className="ke-summary">
                <div className="line"><span><Trophy size={13} /> Chak men ap touche</span><b style={{ color: T.green }}>{fmt(projectedMemberPay)} HTG</b></div>
                <div className="line"><span>Peman pa sik</span><b>{selectedSlots.length} × {fmt(planAmount)} = {fmt(totalPerCycle)} HTG</b></div>
              </div>
            )}
          </div>
        )}

        <div className="am-tabs" role="tablist">
          {[['info', 'Enfòmasyon', <User size={14} key="i" />], ['kyc', 'KYC', <CreditCard size={14} key="i" />], ['ref', 'Referans', <ShieldCheck size={14} key="i" />]].map(([t, l, ic]) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{ic}{l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="ke-col" style={{ gap: 12 }}>
            <Field label="Non manm *">
              <input className="ke-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Non ak prenon" autoFocus />
            </Field>
            <Field label={<>Telefòn * {checkingPhone && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>· ap verifye...</span>}</>}>
              <input className="ke-input" inputMode="tel" value={form.phone}
                onChange={e => { set('phone', e.target.value); checkPhone(e.target.value) }} placeholder="+509 XXXX XXXX" />
            </Field>
            {existingAccount && (
              <div className="ke-alert" style={{ '--c': T.teal, '--cbg': hexA(T.teal, .07), '--cbd': hexA(T.teal, .3), margin: 0 }}>
                <UserCheck size={17} />
                <div><b>Kont sol egziste — {existingAccount.memberName}.</b> Itilizatè: <b>{existingAccount.username}</b>. Nouvo men an ap ajoute sou menm kont lan.</div>
              </div>
            )}
          </div>
        )}

        {tab === 'kyc' && (
          <div className="ke-col" style={{ gap: 12 }}>
            <div className="ke-two">
              <Field label="CIN"><input className="ke-input" value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="1-23-456789-0" /></Field>
              <Field label="NIF"><input className="ke-input" value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000-123-456-7" /></Field>
            </div>
            <Field label="Adrès"><input className="ke-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, depatman..." /></Field>
            <div className="ke-two">
              <PhotoBox label="Foto kliyan" icon={<Camera size={18} />} preview={photoB64} inputId="sol-photo-upload" hint="Peze pou foto" onChange={e => handlePhoto(e, 'photo')} />
              <PhotoBox label="Pyès idantite" icon={<CreditCard size={18} />} preview={idPhotoB64} inputId="sol-id-upload" hint="CIN / Paspò" onChange={e => handlePhoto(e, 'idPhoto')} />
            </div>
          </div>
        )}

        {tab === 'ref' && (
          <div className="ke-col" style={{ gap: 12 }}>
            <Field label="Non moun referans"><input className="ke-input" value={form.referenceName} onChange={e => set('referenceName', e.target.value)} placeholder="Non ak prenon" /></Field>
            <Field label="Telefòn referans"><input className="ke-input" inputMode="tel" value={form.referencePhone} onChange={e => set('referencePhone', e.target.value)} placeholder="+509 XXXX XXXX" /></Field>
            <Field label="Relasyon">
              <select className="ke-input" value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option value="">— Chwazi relasyon —</option>
                {RELATIONSHIPS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  )
}