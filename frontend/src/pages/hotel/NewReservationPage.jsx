// src/pages/hotel/NewReservationPage.jsx
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, BedDouble, User, Loader, Clock, Moon } from 'lucide-react'
import { hotelAPI } from '../../services/hotelAPI'
import { clientAPI } from '../../services/api'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  purple:'#7C3AED', purpleLt:'#9F67FF', purpleDim:'rgba(124,58,237,0.10)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const inputStyle = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, outline:'none',
  fontSize:14, color:D.text, background:'#F8F9FF',
  boxSizing:'border-box', fontFamily:'DM Sans,sans-serif',
}
const labelStyle = {
  fontSize:12, fontWeight:700, color:D.muted, display:'block',
  marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em'
}


const DURATIONS = [
  { value: 60,  label: '1èd tan' },
  { value: 90,  label: '1èd 30min' },
  { value: 120, label: '2èd tan' },
  { value: 180, label: '3èd tan' },
  { value: 240, label: '4èd tan' },
  { value: 300, label: '5èd tan' },
  { value: 360, label: '6èd tan' },
]

export default function NewReservationPage() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const preselectedRoom = params.get('roomId')

  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const nowTime  = new Date().toTimeString().slice(0,5)

  const [type, setType] = useState('nuit') // 'nuit' | 'moman'
  const [error, setError] = useState('')

  // ── Fòm Nuit
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

  // ── Fòm Moman
  const [mForm, setMForm] = useState({
    roomId:               preselectedRoom || '',
    clientId:             '',
    momentDurationMinutes: 120,
    momentStartTime:      nowTime,
    adults:               1,
    children:             0,
    depositHtg:           0,
    source:               'walk-in',
    notes:                '',
  })

  // ── Queries
  const { data: roomsData } = useQuery({
    queryKey: ['hotel-available-rooms', form.checkIn, form.checkOut],
    queryFn: () => hotelAPI.getAvailableRooms({ checkIn: form.checkIn, checkOut: form.checkOut }).then(r => r.data?.data || []),
    enabled: type === 'nuit' && !!form.checkIn && !!form.checkOut,
  })
  const { data: allRoomsData } = useQuery({
    queryKey: ['hotel-all-rooms'],
    queryFn: () => hotelAPI.getRooms().then(r => r.data?.data || []),
    enabled: type === 'moman',
  })
  const { data: clientsData } = useQuery({
    queryKey: ['clients-search'],
    queryFn: () => clientAPI.getAll({ limit: 100 }).then(r => r.data?.clients || []),
  })

  const rooms   = type === 'nuit' ? (roomsData || []) : (allRoomsData || []).filter(r => r.status === 'available')
  const clients = clientsData || []

  // ── Chanm chwazi
  const activeRoomId = type === 'nuit' ? form.roomId : mForm.roomId
  const selectedRoom = rooms.find(r => r.id === activeRoomId)

  // ── Kalkil Nuit
  const nights = form.checkIn && form.checkOut
    ? Math.max(0, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : 0
  const nightPrice = Number(selectedRoom?.roomType?.priceHtg || 0)
  const nightTotal = nightPrice * nights

  // ── Kalkil Moman
  const momentPrice    = Number(selectedRoom?.roomType?.momentPriceHtg || 0)
  const momentPerHour  = Number(selectedRoom?.roomType?.momentPricePerHourHtg || 0)
  const momentDurHours = Math.floor(mForm.momentDurationMinutes / 60)
  const momentDurMins  = mForm.momentDurationMinutes % 60
  // Lè moman an fini
  const momentEndTime = (() => {
    if (!mForm.momentStartTime) return ''
    const [h, m] = mForm.momentStartTime.split(':').map(Number)
    const total  = h * 60 + m + Number(mForm.momentDurationMinutes)
    return `${String(Math.floor(total/60) % 24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`
  })()

  // ── Mutation
  const mutation = useMutation({
    mutationFn: (data) => hotelAPI.createReservation(data),
    onSuccess: (res) => navigate(`/app/hotel/reservations/${res.data.data.id}`),
    onError: (err) => setError(err.response?.data?.message || 'Erè pandan kreyasyon'),
  })

  const set  = (k, v) => setForm(f  => ({ ...f, [k]: v }))
  const setM = (k, v) => setMForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    setError('')
    if (type === 'nuit') {
      if (!form.roomId)   return setError('Chwazi yon chanm')
      if (!form.checkIn)  return setError('Dat antre obligatwa')
      if (!form.checkOut) return setError('Dat soti obligatwa')
      if (nights <= 0)    return setError('Dat yo pa valid')
      mutation.mutate({
        ...form,
        type: 'nuit',
        adults:   parseInt(form.adults),
        children: parseInt(form.children),
      })
    } else {
      if (!mForm.roomId)               return setError('Chwazi yon chanm')
      if (!mForm.momentStartTime)      return setError('Lè kòmanse obligatwa')
      if (!mForm.momentDurationMinutes) return setError('Chwazi dire a')
      const now = new Date()
      const startDt = new Date(`${today}T${mForm.momentStartTime}:00`)
      const endDt   = new Date(startDt.getTime() + mForm.momentDurationMinutes * 60000)
      mutation.mutate({
        roomId:               mForm.roomId,
        clientId:             mForm.clientId,
        type:                 'moman',
        checkIn:              startDt.toISOString(),
        checkOut:             endDt.toISOString(),
        momentDurationMinutes: parseInt(mForm.momentDurationMinutes),
        momentStartTime:      startDt.toISOString(),
        momentEndTime:        endDt.toISOString(),
        adults:               parseInt(mForm.adults),
        children:             parseInt(mForm.children),
        depositHtg:           mForm.depositHtg,
        source:               mForm.source,
        notes:                mForm.notes,
      })
    }
  }

  // ── Tabs
  const TabBtn = ({ id, icon: Icon, label, color }) => (
    <button onClick={() => { setType(id); setError('') }}
      style={{
        flex:1, padding:'12px 8px', borderRadius:12, border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        fontWeight:800, fontSize:14, fontFamily:'DM Sans,sans-serif',
        background: type === id
          ? (id === 'nuit' ? `linear-gradient(135deg,${D.blue},${D.blueLt})` : `linear-gradient(135deg,${D.purple},${D.purpleLt})`)
          : '#F0F2FF',
        color: type === id ? '#fff' : D.muted,
        boxShadow: type === id ? `0 4px 16px ${id==='nuit'?D.blue:D.purple}40` : 'none',
        transition:'all 0.2s',
      }}>
      <Icon size={16}/> {label}
    </button>
  )

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth:760, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <Link to="/app/hotel" style={{ width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:D.blueDim2, color:D.blue, textDecoration:'none', border:`1px solid ${D.border}` }}>
          <ChevronLeft size={18}/>
        </Link>
        <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
          <CalendarDays size={22} color="#fff"/>
        </div>
        <div>
          <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Nouvo Rezèvasyon</h1>
          <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>Nuit oswa Moman</p>
        </div>
      </div>

      {/* Toggle Nuit / Moman */}
      <div style={{ display:'flex', gap:10, marginBottom:24, background:'#F0F2FF', padding:6, borderRadius:14 }}>
        <TabBtn id="nuit"  icon={Moon}  label="Nuit" />
        <TabBtn id="moman" icon={Clock} label="Moman" />
      </div>

      {/* ══════════════════════════════ MODE NUIT ══════════════════════════════ */}
      {type === 'nuit' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Kolòn 1 */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Dat */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
                <CalendarDays size={16} color={D.blue}/> Peryòd Sejou
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={labelStyle}>Antre</label>
                  <input type="date" value={form.checkIn} min={today} onChange={e => set('checkIn', e.target.value)} style={inputStyle}
                    onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
                <div>
                  <label style={labelStyle}>Soti</label>
                  <input type="date" value={form.checkOut} min={form.checkIn||today} onChange={e => set('checkOut', e.target.value)} style={inputStyle}
                    onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={labelStyle}>Granmoun</label>
                  <input type="number" min={1} max={10} value={form.adults} onChange={e=>set('adults',e.target.value)} style={inputStyle}
                    onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
                <div>
                  <label style={labelStyle}>Timoun</label>
                  <input type="number" min={0} max={10} value={form.children} onChange={e=>set('children',e.target.value)} style={inputStyle}
                    onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
              </div>
            </div>

            {/* Kliyan */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
                <User size={16} color={D.blue}/> Kliyan (opsyonèl)
              </h3>
              <select value={form.clientId} onChange={e=>set('clientId',e.target.value)} style={{...inputStyle,cursor:'pointer'}}>
                <option value="">— Kliyan Anonim —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:''}</option>)}
              </select>
            </div>

            {/* Sous + Nòt */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <div style={{ marginBottom:12 }}>
                <label style={labelStyle}>Sous</label>
                <select value={form.source} onChange={e=>set('source',e.target.value)} style={{...inputStyle,cursor:'pointer'}}>
                  <option value="walk-in">Walk-in</option>
                  <option value="phone">Telefòn</option>
                  <option value="online">Anliy</option>
                  <option value="agency">Ajans</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nòt</label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3}
                  style={{...inputStyle,resize:'vertical'}} placeholder="Demann espesyal..."
                  onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
            </div>
          </div>

          {/* Kolòn 2 */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Chanm */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
                <BedDouble size={16} color={D.blue}/> Chwazi Chanm
              </h3>
              {!form.checkIn||!form.checkOut||nights<=0 ? (
                <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>Antre dat yo pou wè chanm disponib</p>
              ) : rooms.length===0 ? (
                <p style={{ color:D.red, fontSize:13, textAlign:'center', padding:'20px 0' }}>Pa gen chanm disponib</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
                  {rooms.map(room=>(
                    <button key={room.id} onClick={()=>set('roomId',room.id)}
                      style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${form.roomId===room.id?D.blue:D.border}`, background:form.roomId===room.id?D.blueDim2:'#F8F9FF', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
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

            {/* Estimasyon */}
            <div style={{ background:`linear-gradient(135deg,${D.blue}08,${D.blueLt}05)`, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>Estimasyon Pri</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:D.muted }}>Pri pa nwit</span>
                  <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{nightPrice.toLocaleString()} HTG</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:D.muted }}>× {nights} nwit</span>
                  <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{nightTotal.toLocaleString()} HTG</span>
                </div>
                <div style={{ height:1, background:D.border }}/>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:14, fontWeight:800, color:D.text }}>Total</span>
                  <span style={{ fontFamily:'monospace', fontWeight:900, color:D.blue, fontSize:16 }}>{nightTotal.toLocaleString()} HTG</span>
                </div>
              </div>
              <div style={{ marginTop:16 }}>
                <label style={labelStyle}>Depo Inisyal (HTG)</label>
                <input type="number" min={0} value={form.depositHtg} onChange={e=>set('depositHtg',e.target.value)}
                  style={inputStyle} placeholder="0"
                  onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border}/>
                {Number(form.depositHtg)>0 && (
                  <p style={{ fontSize:12, color:D.muted, margin:'6px 0 0' }}>
                    Balans rès: <strong style={{ color:(nightTotal-Number(form.depositHtg))>0?D.red:D.success }}>{Math.max(0,nightTotal-Number(form.depositHtg)).toLocaleString()} HTG</strong>
                  </p>
                )}
              </div>
            </div>

            {error && <div style={{ padding:'12px 16px', borderRadius:10, background:D.redDim, border:`1px solid ${D.red}30`, color:D.red, fontSize:13, fontWeight:600 }}>{error}</div>}

            <button onClick={handleSubmit} disabled={mutation.isPending}
              style={{ padding:'14px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:15, border:'none', cursor:mutation.isPending?'not-allowed':'pointer', boxShadow:`0 4px 16px ${D.orange}45`, opacity:mutation.isPending?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {mutation.isPending ? <><Loader size={16} style={{ animation:'spin 1s linear infinite' }}/> Ap kreye...</> : 'Konfime Rezèvasyon'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ MODE MOMAN ══════════════════════════════ */}
      {type === 'moman' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Kolòn 1 */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Durasyon */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
                <Clock size={16} color={D.purple}/> Dire Moman
              </h3>

              {/* Lè kòmanse */}
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Lè Kòmanse</label>
                <input type="time" value={mForm.momentStartTime} onChange={e=>setM('momentStartTime',e.target.value)}
                  style={{...inputStyle, borderColor:D.border}}
                  onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>

              {/* Bouton durasyon */}
              <label style={labelStyle}>Kantite Tan</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                {DURATIONS.map(d=>(
                  <button key={d.value} onClick={()=>setM('momentDurationMinutes',d.value)}
                    style={{ padding:'9px 6px', borderRadius:9, border:`2px solid ${mForm.momentDurationMinutes===d.value?D.purple:D.border}`, background:mForm.momentDurationMinutes===d.value?D.purpleDim:'#F8F9FF', cursor:'pointer', fontWeight:800, fontSize:12, color:mForm.momentDurationMinutes===d.value?D.purple:D.muted, transition:'all 0.15s' }}>
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Afichaj lè fini */}
              {mForm.momentStartTime && (
                <div style={{ background:`linear-gradient(135deg,${D.purple}10,${D.purpleLt}08)`, borderRadius:10, padding:'10px 14px', border:`1px solid ${D.purple}25` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>Dire:</span>
                    <span style={{ fontWeight:900, color:D.purple, fontSize:13 }}>{momentDurHours > 0 ? `${momentDurHours}z` : ''}{momentDurMins > 0 ? ` ${momentDurMins}min` : ''}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                    <span style={{ fontSize:12, color:D.muted, fontWeight:600 }}>{mForm.momentStartTime} → {momentEndTime}</span>
                    <span style={{ fontSize:11, color:D.purple, fontWeight:700 }}>Lè fini</span>
                  </div>
                </div>
              )}
            </div>

            {/* Kliyan */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
                <User size={16} color={D.purple}/> Kliyan (opsyonèl)
              </h3>
              <select value={mForm.clientId} onChange={e=>setM('clientId',e.target.value)} style={{...inputStyle,cursor:'pointer'}}>
                <option value="">— Kliyan Anonim —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` · ${c.phone}`:''}</option>)}
              </select>
            </div>

            {/* Granmoun + Timoun */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={labelStyle}>Granmoun</label>
                  <input type="number" min={1} max={10} value={mForm.adults} onChange={e=>setM('adults',e.target.value)} style={inputStyle}
                    onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
                <div>
                  <label style={labelStyle}>Timoun</label>
                  <input type="number" min={0} max={10} value={mForm.children} onChange={e=>setM('children',e.target.value)} style={inputStyle}
                    onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Nòt</label>
                <textarea value={mForm.notes} onChange={e=>setM('notes',e.target.value)} rows={2}
                  style={{...inputStyle,resize:'vertical'}} placeholder="Demann espesyal..."
                  onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
            </div>
          </div>

          {/* Kolòn 2 */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Chanm */}
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
                <BedDouble size={16} color={D.purple}/> Chwazi Chanm
              </h3>
              {rooms.length===0 ? (
                <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>Ap chaje chanm...</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
                  {rooms.map(room=>{
                    const hasMoment = !!room.roomType?.momentPriceHtg
                    return (
                      <button key={room.id} onClick={()=>setM('roomId',room.id)}
                        style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${mForm.roomId===room.id?D.purple:D.border}`, background:mForm.roomId===room.id?D.purpleDim:'#F8F9FF', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontWeight:800, color:D.text, fontSize:14 }}>#{room.number}</span>
                          {hasMoment
                            ? <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:D.purple }}>{Number(room.roomType.momentPriceHtg).toLocaleString()} HTG/moman</span>
                            : <span style={{ fontSize:11, color:D.muted }}>Pa gen pri moman</span>
                          }
                        </div>
                        <span style={{ fontSize:11, color:D.muted }}>Etaj {room.floor} · {room.roomType?.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Estimasyon moman */}
            <div style={{ background:`linear-gradient(135deg,${D.purple}08,${D.purpleLt}05)`, borderRadius:16, border:`1px solid ${D.purple}20`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>Estimasyon Pri</h3>
              {!selectedRoom ? (
                <p style={{ color:D.muted, fontSize:13 }}>Chwazi yon chanm pou wè pri</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, color:D.muted }}>Pri fiks moman</span>
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{momentPrice.toLocaleString()} HTG</span>
                  </div>
                  {momentPerHour > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:D.muted }}>Pri pa èd tan (si depase)</span>
                      <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{momentPerHour.toLocaleString()} HTG/èd</span>
                    </div>
                  )}
                  <div style={{ height:1, background:`${D.purple}20` }}/>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:14, fontWeight:800, color:D.text }}>Total Estimasyon</span>
                    <span style={{ fontFamily:'monospace', fontWeight:900, color:D.purple, fontSize:16 }}>{momentPrice.toLocaleString()} HTG</span>
                  </div>
                  {momentPerHour > 0 && (
                    <p style={{ fontSize:11, color:D.muted, margin:0, fontStyle:'italic' }}>
                      + {momentPerHour.toLocaleString()} HTG chak èd siplemantè apre fini
                    </p>
                  )}
                </div>
              )}

              <div style={{ marginTop:16 }}>
                <label style={labelStyle}>Depo Inisyal (HTG)</label>
                <input type="number" min={0} value={mForm.depositHtg} onChange={e=>setM('depositHtg',e.target.value)}
                  style={inputStyle} placeholder="0"
                  onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
              </div>
            </div>

            {error && <div style={{ padding:'12px 16px', borderRadius:10, background:D.redDim, border:`1px solid ${D.red}30`, color:D.red, fontSize:13, fontWeight:600 }}>{error}</div>}

            <button onClick={handleSubmit} disabled={mutation.isPending}
              style={{ padding:'14px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.purple},${D.purpleLt})`, color:'#fff', fontWeight:800, fontSize:15, border:'none', cursor:mutation.isPending?'not-allowed':'pointer', boxShadow:`0 4px 16px ${D.purple}45`, opacity:mutation.isPending?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {mutation.isPending ? <><Loader size={16} style={{ animation:'spin 1s linear infinite' }}/> Ap kreye...</> : '⚡ Konfime Moman'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}