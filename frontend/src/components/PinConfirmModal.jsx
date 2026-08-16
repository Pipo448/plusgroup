// src/components/PinConfirmModal.jsx
import { useState } from 'react'
import { Lock, X, AlertCircle } from 'lucide-react'

const D = {
  card: '#0d1b2a', cardBorder: 'rgba(201,168,76,0.15)', gold: '#C9A84C',
  text: '#e8eaf0', muted: '#6b7a99', red: '#e74c3c', overlay: 'rgba(0,0,0,0.6)',
}

export default function PinConfirmModal({ title = 'Konfime avèk PIN', message, onConfirm, onClose, loading }) {
  const [pin, setPin]     = useState('')
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!pin || pin.length < 4) { setError('Antre PIN ou (4-6 chif).'); return }
    setError('')
    try { await onConfirm(pin) }
    catch (e) { setError(e?.response?.data?.message || e?.message || 'PIN pa kòrèk.') }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:D.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:D.card, border:`1px solid ${D.cardBorder}`, borderRadius:16, width:'100%', maxWidth:360, padding:'20px 20px 24px', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Lock size={16} style={{ color:D.red }}/>
            <h3 style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0 }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ width:26, height:26, borderRadius:7, border:'none', background:'rgba(255,255,255,0.06)', color:D.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={13}/>
          </button>
        </div>
        {message && <p style={{ fontSize:12, color:D.muted, margin:'0 0 14px' }}>{message}</p>}
        <input
          type="password" inputMode="numeric" maxLength={6} autoFocus
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="••••"
          style={{ width:'100%', boxSizing:'border-box', padding:'14px', fontSize:24, letterSpacing:8, textAlign:'center', borderRadius:10, border:`1px solid ${error ? D.red : D.cardBorder}`, background:'rgba(255,255,255,0.03)', color:D.text, outline:'none' }}
        />
        {error && (
          <p style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:D.red, margin:'8px 0 0' }}>
            <AlertCircle size={12}/> {error}
          </p>
        )}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:D.muted, cursor:'pointer', fontWeight:700 }}>Anile</button>
          <button onClick={handleConfirm} disabled={loading}
            style={{ flex:2, padding:'11px', borderRadius:10, border:'none', cursor:loading?'not-allowed':'pointer', background:`linear-gradient(135deg,${D.red},#a00)`, color:'#fff', fontWeight:800, opacity:loading?0.6:1 }}>
            {loading ? 'Ap verifye...' : 'Konfime'}
          </button>
        </div>
      </div>
    </div>
  )
}
