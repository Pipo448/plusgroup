// src/pages/sol/SolDashboardModals.jsx
// ─── ModalChangePassword + ModalPayMobile ─────────────────────

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Key } from 'lucide-react'
import { D, SOL_API, fmt } from './solDashboardUtils'

// ══════════════════════════════════════════════════════════════
// MODAL CHANJE MODPAS
// ══════════════════════════════════════════════════════════════
export function ModalChangePassword({ onClose, token }) {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
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

  const inp = {
    width: '100%', padding: '13px 15px', borderRadius: 12, fontSize: 15,
    border: '1.5px solid rgba(255,255,255,0.08)', color: D.text,
    background: 'rgba(255,255,255,0.04)', fontFamily: 'inherit', transition: 'all 0.2s',
  }

  return (
    <div className="sol-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sol-modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 6 }}>Chanje Modpas</h2>
        <p style={{ fontSize: 13, color: D.muted, marginBottom: 26, lineHeight: 1.6 }}>Sekirize kont ou ak yon nouvo modpas solid.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Modpas Aktyèl',           key: 'current' },
            { label: 'Nouvo Modpas',             key: 'next'    },
            { label: 'Konfime Nouvo Modpas',     key: 'confirm' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: D.gold, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
              <input type="password" className="sol-inp" style={inp}
                value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="••••••"
                autoComplete={key === 'current' ? 'current-password' : 'new-password'} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${D.borderSub}`, background: 'transparent', color: D.muted, fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>Anile</button>
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: loading ? 'rgba(37,99,235,0.32)' : D.goldBtn, color: '#0a0a00', fontWeight: 800, fontSize: 14, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <Key size={15} />}
              {loading ? 'Ap chanje...' : 'Chanje Modpas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL PEYE PA MOBIL MONI
// ══════════════════════════════════════════════════════════════
export function ModalPayMobile({ onClose }) {
  const payCard = (color, icon, title, subtitle, numero, nom) => (
    <div style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`, border: `1px solid ${color}30`, borderRadius: 20, padding: '22px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, borderRadius: 13, width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20, boxShadow: `0 4px 20px ${color}40` }}>{icon}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color, fontFamily: 'Syne, sans-serif' }}>{title}</div>
          <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 13, padding: '13px 15px' }}>
          <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Nimewo</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 14, color: '#fff', letterSpacing: '0.04em' }}>{numero}</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 13, padding: '13px 15px' }}>
          <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Non</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{nom}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="sol-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sol-modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 6 }}>📱 Peye pa Mobil Moni</h2>
        <p style={{ fontSize: 13, color: D.muted, marginBottom: 24, lineHeight: 1.7 }}>Voye kòb la epi voye yon kopi resi ou a bay admin pou konfime peman ou.</p>
        {payCard('#dc2626', '▶', 'Digicel MonCash', 'Mobil Moni Digicel', '+509 31 33 87 85', 'Dasner JEAN')}
        {payCard('#ea580c', 'nat', 'Natcash', 'Mobil Moni Natcom', '+509 42 44 90 24', 'Dasner JEAN')}
        <div style={{ background: D.goldDim, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 18px', marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 13 }}>
          <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: D.gold, marginBottom: 5 }}>Frè Tranzaksyon</div>
            <div style={{ fontSize: 12, color: D.mutedLt, lineHeight: 1.8 }}>
              Ajoute <strong style={{ color: D.text }}>15 HTG</strong> frè pou chak <strong style={{ color: D.text }}>250 HTG</strong> ou voye.<br />
              Egzanp: 250 HTG → voye <strong style={{ color: D.gold }}>265 HTG</strong> total.
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '15px', borderRadius: 13, border: `1px solid ${D.borderSub}`, background: 'rgba(255,255,255,0.04)', color: D.mutedLt, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>Fèmen</button>
      </div>
    </div>
  )
}
