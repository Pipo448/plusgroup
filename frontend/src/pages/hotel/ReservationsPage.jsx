// src/pages/hotel/ReservationsPage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus, Eye, ChevronLeft, ChevronRight, Search, Clock, Moon } from 'lucide-react'
import { format } from 'date-fns'
import { hotelAPI } from '../../services/hotelAPI'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  purple:'#7C3AED', purpleDim:'rgba(124,58,237,0.08)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const STATUS_MAP = {
  pending:     { label: 'Annatant', color: D.muted,   bg: 'rgba(107,122,171,0.10)' },
  confirmed:   { label: 'Konfime',  color: D.blue,    bg: D.blueDim2 },
  checked_in:  { label: 'Antre',    color: D.success, bg: D.successBg },
  checked_out: { label: 'Soti',     color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  cancelled:   { label: 'Anile',    color: D.red,     bg: D.redDim },
  no_show:     { label: 'No-show',  color: D.warning, bg: D.warningBg },
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })

// Afiche dire moman ann èd tan
const formatDuration = (minutes) => {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}èd tan`
  return `${h}èd ${m}min`
}

export default function ReservationsPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['hotel-reservations', status, page],
    queryFn: () => hotelAPI.getReservations({ status, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  })

  const reservations = raw?.data  || []
  const total        = raw?.total || 0
  const pages        = Math.ceil(total / 15) || 1

  const filtered = search
    ? reservations.filter(r =>
        r.reservationNumber?.toLowerCase().includes(search.toLowerCase()) ||
        r.clientSnapshot?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.room?.number?.includes(search)
      )
    : reservations

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
            <CalendarDays size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Rezèvasyon</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{total} total</p>
          </div>
        </div>
        <Link to="/app/hotel/reservations/new"
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', boxShadow:`0 4px 16px ${D.orange}45` }}>
          <Plus size={16}/> Nouvo Rezèvasyon
        </Link>
      </div>

      {/* Filtres */}
      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input placeholder="Chèche rezèvasyon, chanm, kliyan..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', paddingLeft:36, padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' }}
            onFocus={e => e.target.style.borderColor = D.blue}
            onBlur={e => e.target.style.borderColor = D.border}/>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { v:'',            l:'Tout' },
            { v:'confirmed',   l:'Konfime' },
            { v:'checked_in',  l:'Antre' },
            { v:'checked_out', l:'Soti' },
            { v:'cancelled',   l:'Anile' },
          ].map(opt => (
            <button key={opt.v} onClick={() => { setStatus(opt.v); setPage(1) }}
              style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s', background:status===opt.v ? D.blue : '#F4F6FF', color:status===opt.v ? '#fff' : D.muted, border:`1.5px solid ${status===opt.v ? D.blue : D.border}`, whiteSpace:'nowrap' }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
        {/* Header tablo */}
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 1.2fr 100px 100px 50px', padding:'11px 20px', background:D.blueDim, borderBottom:`1px solid ${D.border}` }}>
          {['#Rezèvasyon','Kliyan','Chanm','Dire','Total HTG','Estati','Dat',''].map((h, i) => (
            <span key={i} style={{ color:D.blue, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', textAlign: i >= 4 ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>

        {isLoading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ padding:'14px 20px', borderBottom:`1px solid ${D.border}`, display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 1.2fr 100px 100px 50px', gap:8, alignItems:'center' }}>
                {Array(8).fill(0).map((_, j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6, animation:'pulse 1.5s infinite' }}/>)}
              </div>
            ))
          : !filtered.length
          ? <div style={{ padding:'60px 20px', textAlign:'center' }}>
              <CalendarDays size={32} color={D.blue} style={{ marginBottom:12 }}/>
              <p style={{ color:D.muted, fontSize:15, fontWeight:600, margin:'0 0 16px' }}>Pa gen rezèvasyon</p>
              <Link to="/app/hotel/reservations/new" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:13, textDecoration:'none' }}>
                <Plus size={14}/> Nouvo Rezèvasyon
              </Link>
            </div>
          : filtered.map((res, idx) => <ResRow key={res.id} res={res} idx={idx} D={D} STATUS_MAP={STATUS_MAP} fmt={fmt} formatDuration={formatDuration}/>)
        }
      </div>

      {/* Paginasyon */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
          <p style={{ color:D.muted, fontSize:13 }}>Paj <strong style={{ color:D.text }}>{page}</strong> / {pages} · <strong style={{ color:D.text }}>{total}</strong> total</p>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} style={{ width:36, height:36, borderRadius:10, cursor:page<=1?'not-allowed':'pointer', background:page<=1?'#F4F6FF':D.blue, border:`1px solid ${page<=1?D.border:D.blue}`, color:page<=1?D.muted:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={16}/>
            </button>
            <button disabled={page>=pages} onClick={() => setPage(p=>p+1)} style={{ width:36, height:36, borderRadius:10, cursor:page>=pages?'not-allowed':'pointer', background:page>=pages?'#F4F6FF':D.blue, border:`1px solid ${page>=pages?D.border:D.blue}`, color:page>=pages?D.muted:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}

function ResRow({ res, idx, D, STATUS_MAP, fmt, formatDuration }) {
  const [hov, setHov] = useState(false)
  const s       = STATUS_MAP[res.status] || STATUS_MAP.pending
  const isMoman = res.type === 'moman'

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'grid', gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 1.2fr 100px 100px 50px', padding:'13px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background:hov ? D.blueDim : idx%2===0 ? '#fff' : 'rgba(244,246,255,0.4)', transition:'background 0.15s' }}>

      {/* # Rezèvasyon + badge type */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:12 }}>{res.reservationNumber}</span>
        {isMoman
          ? <span style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:99, background:D.purpleDim, color:D.purple, border:`1px solid ${D.purple}25`, display:'flex', alignItems:'center', gap:3 }}><Clock size={8}/>Moman</span>
          : <span style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:99, background:D.blueDim, color:D.blue, border:`1px solid ${D.border}`, display:'flex', alignItems:'center', gap:3 }}><Moon size={8}/>Nuit</span>
        }
      </div>

      <span style={{ fontSize:13, fontWeight:600, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{res.clientSnapshot?.name || '—'}</span>

      <span style={{ fontSize:13, fontWeight:700, color:D.text }}>
        #{res.room?.number} <span style={{ fontSize:11, color:D.muted, fontWeight:400 }}>{res.room?.roomType?.name}</span>
      </span>

      {/* Dire — nwit oswa èd tan */}
      <span style={{ fontSize:13, color:D.muted, textAlign:'center' }}>
        {isMoman
          ? <span style={{ color:D.purple, fontWeight:700 }}>{formatDuration(res.momentDurationMinutes)}</span>
          : `${res.nights} nwit`
        }
      </span>

      <div style={{ textAlign:'center' }}>
        <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text, fontSize:13 }}>{fmt(res.totalHtg)}</span>
        {Number(res.balanceDueHtg) > 0 && <div style={{ fontSize:10, color:D.red, fontFamily:'monospace' }}>Balans: {fmt(res.balanceDueHtg)}</div>}
      </div>

      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.label}</span>
      </div>

      <span style={{ fontSize:11, color:D.muted, fontFamily:'monospace', textAlign:'center' }}>
        {format(new Date(res.checkIn), 'dd/MM/yy')}
      </span>

      <div style={{ textAlign:'right' }}>
        <Link to={`/app/hotel/reservations/${res.id}`} style={{ width:30, height:30, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', background:hov ? `linear-gradient(135deg,${D.blue},${D.blueLt})` : D.blueDim, color:hov ? '#fff' : D.blue, textDecoration:'none', transition:'all 0.2s' }}>
          <Eye size={13}/>
        </Link>
      </div>
    </div>
  )
}