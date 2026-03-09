// src/pages/hotel/NewReservationPage.jsx
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, BedDouble, User, Loader } from 'lucide-react'
import { hotelAPI } from '../../services/hotelAPI'
import { clientAPI } from '../../services/api'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  red:'#C0392B',
  white:'#FFFFFF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const inputStyle = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, outline:'none',
  fontSize:14, color:D.text, background:'#F8F9FF',
  boxSizing:'border-box', fontFamily:'DM Sans,sans-serif',
}

const labelStyle = { fontSize:12, fontWeight:700, color:D.muted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }

export default function NewReservationPage() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const preselectedRoom = params.get('roomId')

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    roomId:     preselectedRoom || '',
    clientId:   '',
    checkIn:    today,
    checkOut:   tomorrow,
    adults:     1,
    children:   0,
    depositHtg: 0,
    source:     'walk-in',
    notes:      '',
  })
  const [error, setError] = useState('')

  const { data: roomsData } = useQuery({
    queryKey: ['hotel-available-rooms', form.checkIn, form.checkOut],
    queryFn: () => hotelAPI.getAvailableRooms({ checkIn: form.checkIn, checkOut: form.checkOut }).then(r => r.data?.data || []),
    enabled: !!form.checkIn && !!form.checkOut,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients-search'],
    queryFn: () => clientAPI.getAll({ limit: 100 }).then(r => r.data?.clients || []),
  })

  const rooms   = roomsData   || []
  const clients = clientsData || []

  const selectedRoom = rooms.find(r => r.id === form.roomId) ||
    (preselectedRoom ? { id: preselectedRoom } : null)

  // Kalkile nwit ak estimasyon
  const nights = form.checkIn && form.checkOut
    ? Math.max(0, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : 0

  const roomPrice  = Number(selectedRoom?.roomType?.priceHtg || 0)
  const roomTotal  = roomPrice * nights
  const balance    = roomTotal - Number(form.depositHtg || 0)

  const mutation = useMutation({
    mutationFn: (data) => hotelAPI.createReservation(data),
    onSuccess: (res) => navigate(`/app/hotel/reservations/${res.data.data.id}`),
    onError: (err) => setError(err.response?.data?.message || 'Erè pandan kreyasyon'),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    setError('')
    if (!form.roomId)   return setError('Chwazi yon chanm')
    if (!form.checkIn)  return setError('Dat check-in obligatwa')
    if (!form.checkOut) return setError('Dat check-out obligatwa')
    if (nights <= 0)    return setError('Dat yo pa valid')
    mutation.mutate({ ...form, adults: parseInt(form.adults), children: parseInt(form.children) })
  }

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth:760, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <Link to="/app/hotel" style={{ width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:D.blueDim2, color:D.blue, textDecoration:'none', border:`1px solid ${D.border}` }}>
          <ChevronLeft size={18}/>
        </Link>
        <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
          <CalendarDays size={22} color="#fff"/>
        </div>
        <div>
          <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Nouvo Rezèvasyon</h1>
          <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>Ranpli enfòmasyon yo</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* ── KOLÒN 1 ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Dat */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
              <CalendarDays size={16} color={D.blue}/> Peryòd Sejou
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={labelStyle}>Check-in</label>
                <input type="date" value={form.checkIn} min={today} onChange={e => set('checkIn', e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
              </div>
              <div>
                <label style={labelStyle}>Check-out</label>
                <input type="date" value={form.checkOut} min={form.checkIn || today} onChange={e => set('checkOut', e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={labelStyle}>Granmoun</label>
                <input type="number" min={1} max={10} value={form.adults} onChange={e => set('adults', e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
              </div>
              <div>
                <label style={labelStyle}>Timoun</label>
                <input type="number" min={0} max={10} value={form.children} onChange={e => set('children', e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
              </div>
            </div>
          </div>

          {/* Kliyan */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
              <User size={16} color={D.blue}/> Kliyan (opsyonèl)
            </h3>
            <div>
              <label style={labelStyle}>Chwazi Kliyan</label>
              <select value={form.clientId} onChange={e => set('clientId', e.target.value)}
                style={{ ...inputStyle, cursor:'pointer' }}>
                <option value="">— Kliyan Anonim —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Sous + Nòt */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Sous Rezèvasyon</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
                <option value="walk-in">Walk-in</option>
                <option value="phone">Telefòn</option>
                <option value="online">Anliy</option>
                <option value="agency">Ajans</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nòt (opsyonèl)</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                style={{ ...inputStyle, resize:'vertical' }}
                placeholder="Demann espesyal, alèji, etc."
                onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
            </div>
          </div>
        </div>

        {/* ── KOLÒN 2 ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Chanm */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
              <BedDouble size={16} color={D.blue}/> Chwazi Chanm
            </h3>
            {!form.checkIn || !form.checkOut || nights <= 0 ? (
              <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>Antre dat yo pou wè chanm disponib</p>
            ) : rooms.length === 0 ? (
              <p style={{ color:D.red, fontSize:13, textAlign:'center', padding:'20px 0' }}>Pa gen chanm disponib pou dat sa yo</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
                {rooms.map(room => (
                  <button key={room.id} onClick={() => set('roomId', room.id)}
                    style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${form.roomId===room.id ? D.blue : D.border}`, background:form.roomId===room.id ? D.blueDim2 : '#F8F9FF', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontWeight:800, color:D.text, fontSize:14 }}>#{room.number}</span>
                      <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:D.blue }}>{Number(room.roomType?.priceHtg).toLocaleString()} HTG/nwit</span>
                    </div>
                    <span style={{ fontSize:11, color:D.muted }}>Etaj {room.floor} · {room.roomType?.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rezime pri */}
          <div style={{ background:`linear-gradient(135deg,${D.blue}08,${D.blueLt}05)`, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>Estimasyon Pri</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:D.muted }}>Pri pa nwit</span>
                <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{roomPrice.toLocaleString()} HTG</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:D.muted }}>× {nights} nwit</span>
                <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{roomTotal.toLocaleString()} HTG</span>
              </div>
              <div style={{ height:1, background:D.border }}/>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:14, fontWeight:800, color:D.text }}>Total Chanm</span>
                <span style={{ fontFamily:'monospace', fontWeight:900, color:D.blue, fontSize:16 }}>{roomTotal.toLocaleString()} HTG</span>
              </div>
            </div>

            {/* Depo */}
            <div style={{ marginTop:16 }}>
              <label style={labelStyle}>Depo Inisyal (HTG)</label>
              <input type="number" min={0} max={roomTotal} value={form.depositHtg} onChange={e => set('depositHtg', e.target.value)}
                style={inputStyle} placeholder="0"
                onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
              {Number(form.depositHtg) > 0 && (
                <p style={{ fontSize:12, color:D.muted, margin:'6px 0 0' }}>
                  Balans rès: <strong style={{ color:balance > 0 ? D.red : D.success }}>{Math.max(0,balance).toLocaleString()} HTG</strong>
                </p>
              )}
            </div>
          </div>

          {/* Erè */}
          {error && (
            <div style={{ padding:'12px 16px', borderRadius:10, background:D.redDim || 'rgba(192,57,43,0.08)', border:`1px solid ${D.red}30`, color:D.red, fontSize:13, fontWeight:600 }}>
              {error}
            </div>
          )}

          {/* Bouton */}
          <button onClick={handleSubmit} disabled={mutation.isPending}
            style={{ padding:'14px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:15, border:'none', cursor:mutation.isPending ? 'not-allowed' : 'pointer', boxShadow:`0 4px 16px ${D.orange}45`, opacity:mutation.isPending ? 0.7 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {mutation.isPending ? <><Loader size={16} style={{ animation:'spin 1s linear infinite' }}/> Ap kreye...</> : 'Konfime Rezèvasyon'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
