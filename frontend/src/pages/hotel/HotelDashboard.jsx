// src/pages/hotel/HotelDashboard.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Hotel, BedDouble, Plus, RefreshCw, Wrench, Sparkles, Users, ChevronRight, Eye } from 'lucide-react'
import { hotelAPI } from '../../services/hotelAPI'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const STATUS_CONFIG = {
  available:   { label: 'Disponib',    color: D.success,  bg: D.successBg,   icon: BedDouble,  dot: '#059669' },
  occupied:    { label: 'Okipe',       color: D.red,      bg: D.redDim,      icon: Users,      dot: '#C0392B' },
  reserved:    { label: 'Rezève',      color: D.blue,     bg: D.blueDim2,    icon: BedDouble,  dot: '#1B2A8F' },
  cleaning:    { label: 'Ap Netwaye', color: D.warning,  bg: D.warningBg,   icon: Sparkles,   dot: '#D97706' },
  maintenance: { label: 'Reparasyon', color: '#7C3AED',  bg: 'rgba(124,58,237,0.08)', icon: Wrench, dot: '#7C3AED' },
}

export default function HotelDashboard() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['hotel-rooms'],
    queryFn: () => hotelAPI.getRooms().then(r => r.data?.data || []),
  })

  const { data: statsData } = useQuery({
    queryKey: ['hotel-stats'],
    queryFn: () => hotelAPI.getReservations({ status: 'checked_in', limit: 100 }).then(r => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => hotelAPI.updateRoomStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['hotel-rooms']),
  })

  const rooms = roomsData || []
  const filtered = filterStatus ? rooms.filter(r => r.status === filterStatus) : rooms

  const stats = {
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    reserved:    rooms.filter(r => r.status === 'reserved').length,
    cleaning:    rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  }

  return (
    <div style={{ fontFamily: 'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
            <Hotel size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Hotel Dashboard</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{rooms.length} chanm total</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link to="/app/hotel/reservations/new" style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', boxShadow:`0 4px 16px ${D.orange}45` }}>
            <Plus size={16}/> Nouvo Rezèvasyon
          </Link>
          <Link to="/app/hotel/reservations" style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:12, background:D.blueDim2, color:D.blue, fontWeight:800, fontSize:14, textDecoration:'none', border:`1px solid ${D.border}` }}>
            Tout Rezèvasyon <ChevronRight size={15}/>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {Object.entries(stats).map(([key, val]) => {
          const cfg = STATUS_CONFIG[key]
          return (
            <button key={key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              style={{ padding:'16px 18px', borderRadius:14, border:`2px solid ${filterStatus === key ? cfg.color : D.border}`, background: filterStatus === key ? cfg.bg : D.white, cursor:'pointer', textAlign:'left', boxShadow: filterStatus === key ? `0 4px 16px ${cfg.color}25` : D.shadow, transition:'all 0.2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:8, height:8, borderRadius:99, background:cfg.dot }}/>
                <span style={{ fontSize:11, fontWeight:800, color:cfg.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{cfg.label}</span>
              </div>
              <span style={{ fontSize:28, fontWeight:900, color:D.text }}>{val}</span>
            </button>
          )
        })}
      </div>

      {/* Grid chanm */}
      {isLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} style={{ height:120, borderRadius:14, background:'#EEF0FF', animation:'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ) : !filtered.length ? (
        <div style={{ padding:'60px 20px', textAlign:'center', background:D.white, borderRadius:16, border:`1px solid ${D.border}` }}>
          <BedDouble size={36} color={D.blue} style={{ marginBottom:12 }}/>
          <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:'0 0 16px' }}>Pa gen chanm</p>
          <Link to="/app/hotel/rooms/new" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:13, textDecoration:'none' }}>
            <Plus size={14}/> Ajoute Chanm
          </Link>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
          {filtered.map(room => <RoomCard key={room.id} room={room} D={D} STATUS_CONFIG={STATUS_CONFIG} onStatusChange={(id, status) => statusMutation.mutate({ id, status })}/>)}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}

function RoomCard({ room, D, STATUS_CONFIG, onStatusChange }) {
  const [showMenu, setShowMenu] = useState(false)
  const cfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.available
  const activeRes = room.reservations?.[0]
  const clientName = activeRes?.clientSnapshot?.name

  return (
    <div style={{ background:D.white, borderRadius:16, border:`2px solid ${cfg.color}30`, boxShadow:D.shadow, overflow:'hidden', transition:'transform 0.15s', position:'relative' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}>

      {/* Top color bar */}
      <div style={{ height:6, background:`linear-gradient(90deg,${cfg.color},${cfg.color}99)` }}/>

      <div style={{ padding:'14px 14px 12px' }}>
        {/* Nimewo chanm + estati */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:20, fontWeight:900, color:D.text }}>#{room.number}</span>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:99, background:cfg.bg, color:cfg.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{cfg.label}</span>
        </div>

        {/* Tip chanm */}
        <p style={{ fontSize:11, color:D.muted, margin:'0 0 4px', fontWeight:600 }}>{room.roomType?.name}</p>
        <p style={{ fontSize:12, color:D.muted, margin:'0 0 10px', fontFamily:'monospace' }}>
          {Number(room.roomType?.priceHtg || 0).toLocaleString()} HTG/nwit
        </p>

        {/* Kliyan si okipe */}
        {clientName && (
          <div style={{ padding:'6px 10px', borderRadius:8, background:D.blueDim, marginBottom:10 }}>
            <p style={{ fontSize:11, color:D.blue, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>👤 {clientName}</p>
          </div>
        )}

        {/* Aksyon */}
        <div style={{ display:'flex', gap:6 }}>
          {activeRes ? (
            <Link to={`/app/hotel/reservations/${activeRes.id}`}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 10px', borderRadius:9, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:700, fontSize:11, textDecoration:'none' }}>
              <Eye size={12}/> Wè
            </Link>
          ) : (
            <Link to={`/app/hotel/reservations/new?roomId=${room.id}`}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 10px', borderRadius:9, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:700, fontSize:11, textDecoration:'none' }}>
              <Plus size={12}/> Rezève
            </Link>
          )}

          {/* Menu chanjman estati */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowMenu(v => !v)}
              style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${D.border}`, background:D.blueDim, color:D.blue, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
              ⋯
            </button>
            {showMenu && (
              <div style={{ position:'absolute', right:0, top:36, background:D.white, borderRadius:10, border:`1px solid ${D.border}`, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:10, minWidth:150, overflow:'hidden' }}
                onMouseLeave={() => setShowMenu(false)}>
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== room.status).map(([k, v]) => (
                  <button key={k} onClick={() => { onStatusChange(room.id, k); setShowMenu(false) }}
                    style={{ width:'100%', padding:'9px 14px', border:'none', background:'transparent', textAlign:'left', cursor:'pointer', fontSize:12, fontWeight:700, color:v.color, display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => e.currentTarget.style.background = v.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width:8, height:8, borderRadius:99, background:v.dot }}/> {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
