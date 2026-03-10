// src/pages/hotel/NewRoomPage.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BedDouble, Plus, X, Save } from 'lucide-react'
import { hotelAPI } from '../../services/hotelAPI'
import toast from 'react-hot-toast'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.12)',
  text:'#0F1A5C', muted:'#6B7AAB',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  success:'#059669',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const FLOORS = ['Rezd chosye', '1ye etaj', '2yèm etaj', '3yèm etaj', '4yèm etaj', '5yèm etaj']

const inputStyle = {
  width:'100%', padding:'11px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, background:D.white,
  color:D.text, fontSize:14, fontWeight:500,
  outline:'none', boxSizing:'border-box',
  fontFamily:'DM Sans,sans-serif',
  transition:'border-color 0.2s',
}

const labelStyle = {
  display:'block', fontSize:12, fontWeight:800,
  color:D.muted, textTransform:'uppercase',
  letterSpacing:'0.07em', marginBottom:6,
}

export default function NewRoomPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    number:     '',
    floor:      '',
    roomTypeId: '',
    notes:      '',
  })
  const [errors, setErrors] = useState({})

  // Chaje tip chanm yo
  const { data: roomTypesData, isLoading: loadingTypes } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: () => hotelAPI.getRoomTypes().then(r => r.data?.data || []),
  })
  const roomTypes = roomTypesData || []

  const mutation = useMutation({
    mutationFn: (data) => hotelAPI.createRoom(data),
    onSuccess: () => {
      qc.invalidateQueries(['hotel-rooms'])
      toast.success('Chanm kreye avèk siksè!')
      navigate('/app/hotel')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erè pandan kreyasyon')
    },
  })

  const validate = () => {
    const e = {}
    if (!form.number.trim())     e.number     = 'Nimewo chanm obligatwa'
    if (!form.roomTypeId)        e.roomTypeId = 'Tip chanm obligatwa'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate({
      number:     form.number.trim(),
      floor:      form.floor || null,
      roomTypeId: form.roomTypeId,
      notes:      form.notes.trim() || null,
    })
  }

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  const selectedType = roomTypes.find(t => t.id === form.roomTypeId)

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth:580, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <Link to="/app/hotel" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:38, height:38, borderRadius:10,
          background:D.blueDim2, border:`1px solid ${D.border}`,
          color:D.blue, textDecoration:'none',
        }}>
          <ArrowLeft size={16}/>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px ${D.blue}40` }}>
            <BedDouble size={20} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:20, fontWeight:900, margin:0 }}>Ajoute Chanm</h1>
            <p style={{ color:D.muted, fontSize:12, margin:'2px 0 0' }}>Kreye yon nouvo chanm nan otèl la</p>
          </div>
        </div>
      </div>

      {/* Fòm */}
      <div style={{ background:D.white, borderRadius:18, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{ height:4, background:`linear-gradient(90deg,${D.blue},${D.blueLt},${D.orange})` }}/>

        <div style={{ padding:'28px 28px 32px' }}>

          {/* Nimewo Chanm */}
          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Nimewo Chanm *</label>
            <input
              type="text"
              placeholder="Ex: 101, 202, A1..."
              value={form.number}
              onChange={e => set('number', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.number ? D.red : D.border }}
              onFocus={e => e.target.style.borderColor = errors.number ? D.red : D.blue}
              onBlur={e => e.target.style.borderColor = errors.number ? D.red : D.border}
            />
            {errors.number && <p style={{ color:D.red, fontSize:11, fontWeight:700, margin:'5px 0 0' }}>⚠ {errors.number}</p>}
          </div>

          {/* Etaj */}
          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Etaj</label>
            <select
              value={form.floor}
              onChange={e => set('floor', e.target.value)}
              style={{ ...inputStyle, cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7AAB' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center' }}
            >
              <option value="">— Chwazi etaj (opsyonèl) —</option>
              {FLOORS.map((f, i) => <option key={i} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Tip Chanm */}
          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Tip Chanm *</label>
            {loadingTypes ? (
              <div style={{ ...inputStyle, color:D.muted, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:14, height:14, border:`2px solid ${D.border}`, borderTop:`2px solid ${D.blue}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                Ap chaje...
              </div>
            ) : roomTypes.length === 0 ? (
              <div style={{ padding:'12px 14px', borderRadius:10, background:D.blueDim, border:`1.5px solid ${D.border}`, color:D.muted, fontSize:13 }}>
                Pa gen tip chanm encore.{' '}
                <span style={{ color:D.blue, fontWeight:700, cursor:'pointer' }}>
                  Kreye yon tip chanm anvan.
                </span>
              </div>
            ) : (
              <>
                <select
                  value={form.roomTypeId}
                  onChange={e => set('roomTypeId', e.target.value)}
                  style={{ ...inputStyle, cursor:'pointer', borderColor: errors.roomTypeId ? D.red : D.border, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7AAB' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center' }}
                  onFocus={e => e.target.style.borderColor = errors.roomTypeId ? D.red : D.blue}
                  onBlur={e => e.target.style.borderColor = errors.roomTypeId ? D.red : D.border}
                >
                  <option value="">— Chwazi tip chanm —</option>
                  {roomTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {Number(t.priceHtg).toLocaleString()} HTG/nwit
                    </option>
                  ))}
                </select>
                {errors.roomTypeId && <p style={{ color:D.red, fontSize:11, fontWeight:700, margin:'5px 0 0' }}>⚠ {errors.roomTypeId}</p>}
              </>
            )}
          </div>

          {/* Preview tip chwazi */}
          {selectedType && (
            <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:D.blueDim2, border:`1.5px solid ${D.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:800, color:D.blue }}>{selectedType.name}</span>
                <span style={{ fontSize:12, fontWeight:700, color:D.orange }}>{Number(selectedType.priceHtg).toLocaleString()} HTG/nwit</span>
              </div>
              <div style={{ display:'flex', gap:12 }}>
                <span style={{ fontSize:11, color:D.muted }}>👥 Maks {selectedType.maxAdults} adilt</span>
                <span style={{ fontSize:11, color:D.muted }}>👶 Maks {selectedType.maxChildren} timoun</span>
              </div>
              {selectedType.amenities?.length > 0 && (
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:6 }}>
                  {selectedType.amenities.map((a, i) => (
                    <span key={i} style={{ fontSize:10, padding:'3px 8px', borderRadius:99, background:D.white, border:`1px solid ${D.border}`, color:D.muted, fontWeight:600 }}>{a}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nòt */}
          <div style={{ marginBottom:28 }}>
            <label style={labelStyle}>Nòt (opsyonèl)</label>
            <textarea
              placeholder="Ekri nòt espesyal sou chanm nan..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize:'vertical', minHeight:80 }}
              onFocus={e => e.target.style.borderColor = D.blue}
              onBlur={e => e.target.style.borderColor = D.border}
            />
          </div>

          {/* Bouton yo */}
          <div style={{ display:'flex', gap:12 }}>
            <Link to="/app/hotel" style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:'12px 20px', borderRadius:12,
              background:D.blueDim, border:`1.5px solid ${D.border}`,
              color:D.blue, fontWeight:800, fontSize:14, textDecoration:'none',
              transition:'all 0.2s',
            }}>
              <X size={15}/> Anile
            </Link>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending || roomTypes.length === 0}
              style={{
                flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'12px 20px', borderRadius:12,
                background: mutation.isPending
                  ? 'rgba(27,42,143,0.4)'
                  : `linear-gradient(135deg,${D.blue},${D.blueLt})`,
                color:'#fff', fontWeight:800, fontSize:14,
                border:'none', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow:`0 4px 16px ${D.blue}40`,
                transition:'all 0.2s',
              }}
            >
              {mutation.isPending ? (
                <>
                  <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                  Ap sove...
                </>
              ) : (
                <><Save size={15}/> Sove Chanm</>
              )}
            </button>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
