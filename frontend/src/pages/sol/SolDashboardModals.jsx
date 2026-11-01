// src/pages/sol/SolDashboardModals.jsx
// ─── ModalChangePassword + ModalPayMobile + ModalAccount (nouvo design) ───

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Key, Eye, EyeOff, Smartphone, LogOut, Bell, Check } from 'lucide-react'
import { V, THEMES, SOL_API } from './solDashboardUtils'

function Sheet({ onClose, children, label }) {
  return (
    <div className="sol-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sol-modal-sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sol-grab" />
        {children}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL CHANJE MODPAS
// ══════════════════════════════════════════════════════════════
export function ModalChangePassword({ onClose, token }) {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.current || !form.next) return toast.error('Ranpli tout chan yo.')
    if (form.next.length < 4)       return toast.error('Omwen 4 karaktè.')
    if (form.next !== form.confirm)  return toast.error('Modpas yo pa menm.')
    setLoading(true)
    try {
      const res = await fetch(`${SOL_API}/api/sol/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erè')
      toast.success('Modpas chanje!')
      onClose()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const fields = [
    { label: 'Modpas aktyèl',         key: 'current', ac: 'current-password' },
    { label: 'Nouvo modpas',          key: 'next',    ac: 'new-password' },
    { label: 'Konfime nouvo modpas',  key: 'confirm', ac: 'new-password' },
  ]
  const mismatch = form.confirm && form.next !== form.confirm

  return (
    <Sheet onClose={onClose} label="Chanje modpas">
      <h2 className="sol-modal-title">Chanje modpas</h2>
      <p className="sol-modal-sub">Chwazi yon modpas ou pa itilize yon lòt kote. Omwen 4 karaktè.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {fields.map(({ label, key, ac }) => (
          <div key={key}>
            <label className="sol-label" htmlFor={`pw-${key}`}>{label}</label>
            <div style={{ position: 'relative' }}>
              <input id={`pw-${key}`} type={show ? 'text' : 'password'} className="sol-inp"
                style={{ paddingRight: 46, borderColor: key === 'confirm' && mismatch ? V.red : undefined }}
                value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="••••••" autoComplete={ac} />
              {key === 'current' && (
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Kache modpas' : 'Montre modpas'}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: V.muted, cursor: 'pointer', padding: 8, display: 'flex' }}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              )}
            </div>
            {key === 'confirm' && mismatch && <p style={{ fontSize: 12, color: V.red, marginTop: 6, fontWeight: 600 }}>Modpas yo pa menm.</p>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="sol-btn" onClick={onClose} style={{ flex: 1 }}>Anile</button>
          <button className="sol-btn primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
            {loading
              ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              : <Key size={15} />}
            {loading ? 'Ap chanje…' : 'Chanje modpas'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL PEYE PA MOBIL MONI
// ══════════════════════════════════════════════════════════════
const copyText = async (text, ok) => {
  try { await navigator.clipboard.writeText(text); toast.success(ok) }
  catch { toast.error('Kopye a pa mache. Make nimewo a.') }
}

function PayCard({ color, soft, name, network, numero, nom }) {
  return (
    <div style={{ border: `1px solid ${soft}`, background: `linear-gradient(135deg, ${soft}, transparent 70%)`, borderRadius: 20, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <Smartphone size={20} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.015em' }}>{name}</div>
          <div style={{ fontSize: 12, color: V.muted }}>{network}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 8 }}>
        <button onClick={() => copyText(numero.replace(/\s/g, ''), 'Nimewo kopye!')}
          style={{ textAlign: 'left', background: 'var(--s-card2)', border: '1px solid var(--s-line)', borderRadius: 13, padding: '10px 12px', cursor: 'pointer', color: V.text }}>
          <div style={{ fontSize: 11, color: V.muted, fontWeight: 600, marginBottom: 4 }}>Nimewo · tape pou kopye</div>
          <div className="sol-num" style={{ fontSize: 13.5, fontWeight: 600 }}>{numero}</div>
        </button>
        <div style={{ background: 'var(--s-card2)', border: '1px solid var(--s-line)', borderRadius: 13, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: V.muted, fontWeight: 600, marginBottom: 4 }}>Non</div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{nom}</div>
        </div>
      </div>
    </div>
  )
}

export function ModalPayMobile({ onClose }) {
  return (
    <Sheet onClose={onClose} label="Peye pa MonCash oswa Natcash">
      <h2 className="sol-modal-title">Peye pa MonCash oswa Natcash</h2>
      <p className="sol-modal-sub">Voye kòb la, epi voye yon kopi resi a bay admin lan pou li konfime peman ou.</p>
      <PayCard color="#DC2626" soft="rgba(220,38,38,0.20)" name="Digicel MonCash" network="Mobil Moni Digicel" numero="+509 31 33 87 85" nom="Dasner JEAN" />
      <PayCard color="#EA580C" soft="rgba(234,88,12,0.20)"  name="Natcash"         network="Mobil Moni Natcom"  numero="+509 42 44 90 24" nom="Dasner JEAN" />
      <div style={{ background: 'var(--s-amber-soft)', border: '1px solid var(--s-amber-line)', borderRadius: 16, padding: '14px 16px', margin: '16px 0 20px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: V.amber, marginBottom: 4 }}>Frè tranzaksyon</div>
        <div style={{ fontSize: 13, color: V.muted2, lineHeight: 1.7 }}>
          Ajoute <strong style={{ color: V.text }}>15 HTG</strong> pou chak <strong style={{ color: V.text }}>250 HTG</strong> ou voye.
          Egzanp: pou 250 HTG, voye <strong style={{ color: V.amber }}>265 HTG</strong> an total.
        </div>
      </div>
      <button className="sol-btn block" onClick={onClose}>Fèmen</button>
    </Sheet>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL KONT (mobil) — aksyon + tèm + notifikasyon + dekonekte
// ══════════════════════════════════════════════════════════════
export function ModalAccount({ onClose, member, tenantName, theme, setTheme, onPay, onChangePw, onLogout, pushState, onEnablePush }) {
  const row = (icon, title, sub, onClick, tone) => (
    <button onClick={onClick} className="sol-side-btn" style={{ padding: '13px 14px', borderRadius: 16, marginBottom: 8, justifyContent: 'flex-start', textAlign: 'left', color: tone || V.text }}>
      <span style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--s-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 12, color: V.muted, fontWeight: 500, marginTop: 1 }}>{sub}</span>}
      </span>
    </button>
  )
  const initials = String(member?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <Sheet onClose={onClose} label="Kont mwen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: 18, background: 'var(--s-btn)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member?.name}</div>
          <div style={{ fontSize: 12.5, color: V.muted, marginTop: 2 }}>{member?.phone}{tenantName ? ` · ${tenantName}` : ''}</div>
        </div>
      </div>

      {row(<Smartphone size={17} style={{ color: V.red }} />, 'Peye pa MonCash / Natcash', 'Nimewo ak frè tranzaksyon', onPay)}
      {row(<Key size={17} style={{ color: V.accentText }} />, 'Chanje modpas', 'Sekirize kont ou', onChangePw)}
      {pushState === 'default' && row(<Bell size={17} style={{ color: V.amber }} />, 'Aktive notifikasyon', 'Resevwa rapèl peman ak mesaj chat', onEnablePush)}
      {pushState === 'granted' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: V.green, fontWeight: 600, padding: '4px 4px 10px' }}><Check size={14} /> Notifikasyon aktive</div>
      )}
      {pushState === 'denied' && (
        <div style={{ fontSize: 12, color: V.muted, padding: '4px 4px 10px', lineHeight: 1.6 }}>Notifikasyon bloke nan paramèt navigatè a. Pou resevwa rapèl, otorize yo la.</div>
      )}

      <div className="sol-label" style={{ margin: '14px 4px 9px' }}>Koulè aplikasyon an</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {Object.entries(THEMES).map(([key, t]) => (
          <button key={key} onClick={() => setTheme(key)} aria-pressed={theme === key} className={`sol-chip ${theme === key ? 'on' : ''}`}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent, border: '2px solid ' + (t.dark ? '#0C1630' : '#fff'), boxShadow: '0 0 0 1px var(--s-line2)' }} />
            {t.name}
          </button>
        ))}
      </div>

      <button className="sol-btn block" onClick={onLogout} style={{ color: V.red, borderColor: 'var(--s-red-line)' }}><LogOut size={16} /> Dekonekte</button>
    </Sheet>
  )
}
