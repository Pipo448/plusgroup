// ─────────────────────────────────────────────────────────────
// ModalAddMember.jsx — Enskri Manm Sol
// ✅ NOUVO: Pwopriyete ka pran plizyè men otomatikman selon montan
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Users, Star, UserCheck, Loader } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Modal } from './sabotayAtoms'
import {
  D, inp, lbl, fmt, RELATIONSHIPS,
  getPayoutDate, hasOwnerSlot, generateCredentials, apiFetch, API_URL,
} from './sabotayUtils'

export function ModalAddMember({ plan, onClose, onSave, loading, onShowCreds }) {

  // ── Slots disponib pou manm nòmal ──────────────────────────
  const { availableSlots, ownerMember } = useMemo(() => {
    const taken    = new Set((plan.members || []).map(m => m.position))
    const maxPos   = Math.max(0, ...(plan.members || []).map(m => m.position))
    const ownerMember = (plan.members || []).find(m => m.isOwnerSlot)
    const PREVIEW_SLOTS = 10
    const gaps       = Array.from({ length: maxPos }, (_, i) => i + 1).filter(p => !taken.has(p) && p !== 1)
    const futureSlots = Array.from({ length: PREVIEW_SLOTS }, (_, i) => maxPos + 1 + i)
    const allPos     = [...gaps, ...futureSlots]
    const availableSlots = allPos.map(pos => ({ position: pos, date: getPayoutDate(plan, pos) }))
    return { availableSlots, ownerMember }
  }, [plan])

  // ── State ──────────────────────────────────────────────────
  const [selectedSlots,    setSelectedSlots]    = useState([])
  const [ownerMode,        setOwnerMode]        = useState(false)
  const [ownerAmount,      setOwnerAmount]      = useState('')   // ✅ NOUVO
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false)
  const [tab,              setTab]              = useState('info')
  const [form, setForm] = useState({ name: '', phone: '', cin: '', nif: '', address: '', referenceName: '', referencePhone: '', relationship: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [photoB64,       setPhotoB64]       = useState(null)
  const [idPhotoB64,     setIdPhotoB64]     = useState(null)
  const [existingAccount, setExistingAccount] = useState(null)
  const [checkingPhone,   setCheckingPhone]   = useState(false)

  // ── ✅ NOUVO: Kalkil men pwopriyete selon montan ──────────
  const planAmount     = Number(plan.amount) || 1
  const ownerAmountNum = Number(ownerAmount) || 0
  const ownerSlotsCount = ownerAmountNum >= planAmount
    ? Math.floor(ownerAmountNum / planAmount)
    : 1

  // Pozisyon pwopriyete: jwenn X premye pozisyon disponib (kòmanse #1)
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

  const positions        = ownerMode ? ownerPositions : selectedSlots.map(s => s.position)
  const currentActive    = (plan.members || []).filter(m => m.status !== 'stopped').length
  const projectedTotal   = currentActive + positions.length
  const projectedMemberPay = Math.max(0, planAmount * projectedTotal - Number(plan.feePerMember || 0))
  const projectedOwnerPay  = planAmount * projectedTotal * ownerSlotsCount
  const totalPerCycle    = positions.length * planAmount

  const toggleSlot = (slot) => {
    setOwnerMode(false)
    setSelectedSlots(prev =>
      prev.find(s => s.position === slot.position)
        ? prev.filter(s => s.position !== slot.position)
        : [...prev, slot]
    )
  }

  const checkPhone = useCallback(async (phone) => {
    if (phone.replace(/\D/g, '').length < 8) { setExistingAccount(null); return }
    setCheckingPhone(true)
    try {
      const slug      = localStorage.getItem('plusgroup-slug')
      const { token } = useAuthStore.getState()
      const res = await fetch(`${API_URL}/sabotay/sol-account?phone=${encodeURIComponent(phone)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': slug || '' } })
      const data = await res.json()
      setExistingAccount(res.ok ? (data.account || null) : null)
    } catch { setExistingAccount(null) }
    finally { setCheckingPhone(false) }
  }, [])

  const handlePhoto = (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      if (type === 'photo')   { setPhotoPreview(b64); setPhotoB64(b64) }
      if (type === 'idPhoto') { setIdPhotoPreview(b64); setIdPhotoB64(b64) }
    }
    reader.readAsDataURL(file)
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
    if (!form.name)  return toast.error('Non manm obligatwa.')
    if (!form.phone) return toast.error('Telefòn obligatwa.')
    if (ownerMode) {
      if (ownerAmountNum > 0 && ownerAmountNum < planAmount)
        return toast.error(`Montan minimòm: ${fmt(planAmount)} HTG (= 1 men sol).`)
      setShowOwnerConfirm(true)
    } else {
      if (!selectedSlots.length) return toast.error('Chwazi omwen yon dat.')
      doSave(false, positions)
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: 'none',
    background: active ? D.goldDim : 'transparent', color: active ? D.gold : D.muted,
    borderBottom: active ? `2px solid ${D.gold}` : '2px solid transparent', transition: 'all 0.15s',
  })

  const imgBox = {
    width: '100%', height: 90, borderRadius: 10, border: `1px solid ${D.border}`,
    background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
  }

  return (
    <Modal onClose={onClose} title="👤 Enskri Manm Sol" width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Avi pwopriyete deja enskri ── */}
        {ownerMember && (
          <div style={{ background: D.goldDim, border: `1px solid ${D.gold}40`, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Star size={16} style={{ color: D.gold, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: D.gold, margin: '0 0 2px' }}>Pwopriyete Sol — {ownerMember.name}</p>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Tape menm nimewo pou ajoute nouvo men.</p>
            </div>
          </div>
        )}

        {/* ── Bouton mode pwopriyete ── */}
        <button onClick={() => { setOwnerMode(o => !o); setSelectedSlots([]) }} style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: `2px solid ${ownerMode ? D.gold : `${D.gold}50`}`,
          background: ownerMode ? D.goldBtn : D.goldDim,
          color: ownerMode ? '#0a1222' : D.gold,
          cursor: 'pointer', fontWeight: 800, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Star size={14} />
          {ownerMode ? '⭐ Mode Pwopriyete Aktif' : 'Enskri kòm Pwopriyete Sol'}
        </button>

        {/* ── ✅ NOUVO: Montan pwopriyete + kalkil otomatik ── */}
        {ownerMode && (
          <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${D.gold}40`, borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: D.gold, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={11} /> Montan Pwopriyete ap Pran Sou Chak Moun
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Montan pa sik (HTG) *</label>
              <input
                type="number"
                style={{ ...inp, color: D.gold, fontWeight: 800, fontSize: 18, textAlign: 'center' }}
                value={ownerAmount}
                onChange={e => setOwnerAmount(e.target.value)}
                placeholder={fmt(planAmount)}
              />
              <p style={{ fontSize: 10, color: D.muted, margin: '5px 0 0' }}>
                Sol la = <strong style={{ color: D.gold }}>{fmt(planAmount)} HTG / manm / sik</strong>
              </p>
            </div>

            {/* Rezilta kalkil */}
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 11, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: D.muted }}>Montan ou antre:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: D.gold }}>{fmt(ownerAmountNum || planAmount)} HTG</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: D.muted }}>Montan ÷ sol ({fmt(planAmount)}):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: D.gold }}>
                  = <strong style={{ color: '#fff' }}>{ownerSlotsCount} men sol</strong>
                </span>
              </div>
              <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ownerPositions.map((pos, i) => (
                  <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: D.text }}>
                      {i === 0 ? '⭐ Men Pwopriyete' : `✦ Men Anplis ${i + 1}`} — Plas #{pos}
                    </span>
                    <span style={{ color: D.muted }}>📅 {getPayoutDate(plan, pos)?.split('-').reverse().join('/') || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {ownerSlotsCount > 1 && (
              <div style={{ marginTop: 10, background: D.greenBg, border: `1px solid ${D.green}30`, borderRadius: 10, padding: '9px 13px', fontSize: 11 }}>
                <span style={{ color: D.green, fontWeight: 700 }}>
                  ✅ Pwopriyete ap touche {ownerSlotsCount} × {fmt(projectedTotal * planAmount)} HTG = <strong>{fmt(projectedOwnerPay)} HTG</strong>
                </span>
                <br />
                <span style={{ color: D.muted }}>Chak manm nòmal ap touche <strong style={{ color: D.text }}>{fmt(projectedMemberPay)} HTG</strong></span>
              </div>
            )}
          </div>
        )}

        {/* ── Griy dat pou manm nòmal ── */}
        {!ownerMode && (
          <div style={{ background: D.goldDim, borderRadius: 12, padding: '12px 14px' }}>
            <label style={{ ...lbl, marginBottom: 8 }}>📅 Chwazi Dat Touche</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {availableSlots.map(slot => {
                const isActive = !!selectedSlots.find(s => s.position === slot.position)
                const dateDisp = slot.date ? slot.date.split('-').reverse().join('/') : '—'
                const isNewest = slot.position === Math.max(...availableSlots.map(s => s.position))
                return (
                  <button key={slot.position} onClick={() => toggleSlot(slot)} style={{
                    padding: '9px 11px', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 76, position: 'relative',
                    border: `2px solid ${isActive ? D.blue : isNewest ? `${D.gold}50` : D.borderSub}`,
                    background: isActive ? D.blueBg : isNewest ? 'rgba(201,168,76,0.05)' : 'transparent' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: isActive ? D.blue : isNewest ? D.gold : D.text }}>{dateDisp}</span>
                    <span style={{ fontSize: 9, color: isActive ? D.blue : D.muted, marginTop: 2 }}>Men #{slot.position}</span>
                    {isNewest && !isActive && <span style={{ fontSize: 8, color: D.gold }}>NOUVO</span>}
                    {isActive && <span style={{ position: 'absolute', top: -5, right: -5, background: D.blue, color: '#fff', borderRadius: 6, padding: '1px 4px', fontSize: 8, fontWeight: 900 }}>✓</span>}
                  </button>
                )
              })}
            </div>
            {selectedSlots.length > 0 && (
              <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '9px 12px' }}>
                {selectedSlots.map(s => (
                  <div key={s.position} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted, marginBottom: 3 }}>
                    <span style={{ color: D.text, fontWeight: 600 }}>Men #{s.position}</span>
                    <span style={{ display: 'flex', gap: 10 }}>
                      <span>📅 {s.date?.split('-').reverse().join('/') || '—'}</span>
                      <span style={{ color: D.green }}>🏆 {fmt(projectedMemberPay)} HTG</span>
                    </span>
                  </div>
                ))}
                {selectedSlots.length > 1 && (
                  <div style={{ borderTop: `1px solid ${D.borderSub}`, paddingTop: 6, marginTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: D.muted }}>Peman pa sik:</span>
                    <span style={{ color: D.orange, fontWeight: 700 }}>{selectedSlots.length} × {fmt(planAmount)} HTG = {fmt(totalPerCycle)} HTG</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tabs enfòmasyon ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${D.borderSub}` }}>
          {[['info', '👤 Enfòmasyon'], ['kyc', '🪪 KYC'], ['ref', '📞 Referans']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>{l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={lbl}>Non Manm *</label>
              <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Non ak Prenon" />
            </div>
            <div>
              <label style={lbl}>Telefòn * {checkingPhone && <span style={{ color: D.muted, fontWeight: 400 }}>ap verifye...</span>}</label>
              <input style={{ ...inp, fontSize: 16 }} inputMode="tel" value={form.phone}
                onChange={e => { set('phone', e.target.value); checkPhone(e.target.value) }} placeholder="+509 XXXX XXXX" />
            </div>
            {existingAccount && (
              <div style={{ background: 'rgba(20,184,166,0.08)', border: `1px solid ${D.teal}40`, borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <UserCheck size={18} style={{ color: D.teal, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: D.teal, margin: '0 0 3px' }}>♻️ Kont Sol egziste — {existingAccount.memberName}</p>
                  <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>Username: <strong style={{ fontFamily: 'monospace' }}>{existingAccount.username}</strong></p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'kyc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>CIN</label><input style={inp} value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="1-23-456789-0" /></div>
              <div><label style={lbl}>NIF</label><input style={inp} value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000-123-456-7" /></div>
            </div>
            <div><label style={lbl}>Adres</label><input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Vil, Depatman..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Foto Kliyan</label>
                <label htmlFor="sol-photo-upload" style={imgBox}>
                  {photoPreview
                    ? <img src={photoPreview} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ textAlign: 'center', color: D.muted }}><div style={{ fontSize: 24 }}>📷</div><div style={{ fontSize: 9 }}>Klike pou foto</div></div>}
                  <input id="sol-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e, 'photo')} />
                </label>
              </div>
              <div>
                <label style={lbl}>Foto Pyes Idantite</label>
                <label htmlFor="sol-id-upload" style={imgBox}>
                  {idPhotoPreview
                    ? <img src={idPhotoPreview} alt="id" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ textAlign: 'center', color: D.muted }}><div style={{ fontSize: 24 }}>🪪</div><div style={{ fontSize: 9 }}>CIN / Paspo</div></div>}
                  <input id="sol-id-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e, 'idPhoto')} />
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === 'ref' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div><label style={lbl}>Non Moun Referans</label><input style={inp} value={form.referenceName} onChange={e => set('referenceName', e.target.value)} placeholder="Non ak Prenon referans" /></div>
            <div><label style={lbl}>Telefòn Referans</label><input style={inp} inputMode="tel" value={form.referencePhone} onChange={e => set('referencePhone', e.target.value)} placeholder="+509 XXXX XXXX" /></div>
            <div>
              <label style={lbl}>Relasyon</label>
              <select style={{ ...inp, appearance: 'none', cursor: 'pointer' }} value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option value="">— Chwazi relasyon —</option>
                {RELATIONSHIPS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── Konfirmasyon pwopriyete ── */}
        {ownerMode && showOwnerConfirm && (
          <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 14, padding: '16px 15px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: D.gold, margin: '0 0 8px' }}>
              ⭐ Konfime — {ownerSlotsCount} Men Pwopriyete Sol
            </p>
            <p style={{ fontSize: 11, color: D.muted, margin: '0 0 12px', lineHeight: 1.7 }}>
              Pwopriyete a ap gen <strong style={{ color: D.gold }}>{ownerSlotsCount} men</strong>.{' '}
              Li ap touche <strong style={{ color: D.text }}>{fmt(projectedOwnerPay)} HTG</strong> total.{' '}
              Lòt manm: <strong style={{ color: D.green }}>{fmt(projectedMemberPay)} HTG</strong>.
            </p>
            <div style={{ marginBottom: 12 }}>
              {ownerPositions.map((pos, i) => (
                <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 7, marginBottom: 4 }}>
                  <span style={{ color: D.text, fontWeight: 600 }}>{i === 0 ? '⭐' : '✦'} Men #{pos}</span>
                  <span style={{ color: D.muted }}>📅 {getPayoutDate(plan, pos)?.split('-').reverse().join('/') || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowOwnerConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>← Tounen</button>
              <button disabled={loading} onClick={() => { setShowOwnerConfirm(false); doSave(true, ownerPositions) }}
                style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Star size={13} />}
                Wi, Kreye {ownerSlotsCount} Men Pwopriyete
              </button>
            </div>
          </div>
        )}

        {/* ── Bouton final ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, cursor: 'pointer', fontWeight: 700 }}>Anile</button>
          <button
            disabled={loading || showOwnerConfirm || (!ownerMode && selectedSlots.length === 0)}
            onClick={handleSubmit}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(201,168,76,0.3)' : D.goldBtn, color: '#0a1222', fontWeight: 800, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              opacity: (!ownerMode && selectedSlots.length === 0) ? 0.5 : 1 }}>
            {loading
              ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
              : ownerMode ? <Star size={15} /> : <Users size={15} />}
            {loading
              ? 'Ap enskri...'
              : ownerMode
                ? `Enskri Pwopriyete — ${ownerSlotsCount} Men (${fmt(ownerAmountNum || planAmount)} HTG/sik)`
                : selectedSlots.length > 1
                  ? `Enskri — ${selectedSlots.length} Men (${fmt(totalPerCycle)} HTG/sik)`
                  : selectedSlots.length === 1 ? 'Enskri — 1 Men'
                  : 'Chwazi Dat Anvan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
