// src/pages/hotel/HotelDashboard.jsx
//
// ── NÒT DESIZYON DESIGN ──────────────────────────────────────────────────
// Sijè a: yon tablo bòd operasyonèl pou anplwaye resepsyon otèl — pa yon paj
// vitrin. Travay li se yon sèl bagay: montre nan yon kout je ki chanm ki
// "vivan" kounye a e kite anplwaye a aji sou yo vit.
// Siyati a: JOD GAWO OKIPASYON an — yon gwo pousantaj + yon ba segmante
// (tankou yon jòj tèmomèt/kwiv otèl) ranplase 5 bwat estatistik idantik yo.
// Kat chanm yo vin ti "tikèt kle" ak yon ti rive kwiv nan kwen an, e yo
// antre younn apre lòt tankou limyè k ap limen nan yon koulwa lè paj la chaje.
// Kouple tipografi: Fraunces (seri karaktè, pou gwo nimewo/tit) + DM Sans
// (rès app la deja itilize l — konsistans nan tout sistèm nan).
// ───────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hotel, BedDouble, Plus, Wrench, Sparkles, Users, ChevronRight, Eye, Check } from 'lucide-react'
import { hotelAPI } from '../../services/hotelAPI'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  ivory:'#FFFDF8',
  brass:'#B8863A', brassLt:'#D3A45E', brassDim:'rgba(184,134,58,0.12)',
  red:'#C1502E', redDim:'rgba(193,80,46,0.10)',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#4C8B6E', successBg:'rgba(76,139,110,0.10)',
  warning:'#B8863A', warningBg:'rgba(184,134,58,0.12)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  plum:'#7A5980', plumBg:'rgba(122,89,128,0.10)',
  indigo:'#3D4A99', indigoBg:'rgba(61,74,153,0.10)',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const DISPLAY_FONT = "'Fraunces', Georgia, 'DM Sans', serif"

export default function HotelDashboard() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [now, setNow] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000)
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => { clearInterval(tick); cancelAnimationFrame(raf) }
  }, [])

  const STATUS_CONFIG = {
    available:   { label: t('hotel.dashboard.status.available'),   color: D.success,  bg: D.successBg,  icon: BedDouble, dot: D.success },
    occupied:    { label: t('hotel.dashboard.status.occupied'),    color: D.red,      bg: D.redDim,     icon: Users,     dot: D.red },
    reserved:    { label: t('hotel.dashboard.status.reserved'),    color: D.indigo,   bg: D.indigoBg,   icon: BedDouble, dot: D.indigo },
    cleaning:    { label: t('hotel.dashboard.status.cleaning'),    color: D.warning,  bg: D.warningBg,  icon: Sparkles,  dot: D.warning },
    maintenance: { label: t('hotel.dashboard.status.maintenance'), color: D.plum,     bg: D.plumBg,     icon: Wrench,    dot: D.plum },
  }
  const STATUS_ORDER = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance']

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['hotel-rooms'],
    queryFn: () => hotelAPI.getRooms().then(r => r.data?.data || []),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => hotelAPI.updateRoomStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['hotel-rooms']),
  })

  const rooms = roomsData || []
  const filtered = filterStatus ? rooms.filter(r => r.status === filterStatus) : rooms

  const stats = useMemo(() => ({
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    reserved:    rooms.filter(r => r.status === 'reserved').length,
    cleaning:    rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  }), [rooms])

  const total = rooms.length
  const occupancyPct = total > 0 ? Math.round((stats.occupied / total) * 100) : 0

  // ── Pousantaj k ap monte lè paj la fini chaje (jòj okipasyon an "reveye")
  const [displayPct, setDisplayPct] = useState(0)
  useEffect(() => {
    if (!mounted || isLoading) return
    let raf
    const start = performance.now()
    const duration = 700
    const from = 0
    const tickFrame = (now2) => {
      const p = Math.min(1, (now2 - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayPct(Math.round(from + (occupancyPct - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tickFrame)
    }
    raf = requestAnimationFrame(tickFrame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isLoading, occupancyPct])

  const clockStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  return (
    <div style={{ fontFamily: 'DM Sans,sans-serif' }} className="pg-hotel-dashboard">

      {/* ═══ Header ═══ */}
      <div className={`pg-header-in ${mounted ? 'pg-in' : ''}`} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:50, height:50, borderRadius:15, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 18px ${D.blue}45`, position:'relative' }}>
            <Hotel size={22} color="#fff"/>
            <span className="pg-pulse-ring" />
          </div>
          <div>
            <h1 style={{ fontFamily:DISPLAY_FONT, color:D.text, fontSize:26, fontWeight:700, margin:0, letterSpacing:'-0.01em' }}>{t('hotel.dashboard.title')}</h1>
            <p style={{ color:D.muted, fontSize:12.5, margin:'3px 0 0', fontVariantNumeric:'tabular-nums', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:99, background:D.success, display:'inline-block', animation:'pg-blink 2.4s ease-in-out infinite' }}/>
              {t('hotel.dashboard.roomsTotal', { count: total })} · {clockStr}
            </p>
          </div>
        </div>
        <div className="pg-dashboard-headerbtns" style={{ display:'flex', gap:10 }}>
          <Link to="/app/hotel/reservations/new" style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:13, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', boxShadow:`0 4px 16px ${D.orange}45` }}>
            <Plus size={16}/> {t('hotel.dashboard.newReservation')}
          </Link>
          <Link to="/app/hotel/reservations/new?type=moman" style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:13, background:'linear-gradient(135deg,#7C3AED,#9F67FF)', color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', boxShadow:'0 4px 16px rgba(124,58,237,0.35)' }}>
            <Plus size={16}/> {t('hotel.dashboard.quickMoman')}
          </Link>
          <Link to="/app/hotel/reservations" style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px', borderRadius:13, background:D.blueDim2, color:D.blue, fontWeight:800, fontSize:14, textDecoration:'none', border:`1px solid ${D.border}` }}>
            {t('hotel.dashboard.allReservations')} <ChevronRight size={15}/>
          </Link>
        </div>
      </div>

      {/* ═══ SIYATI — Jòj Okipasyon ═══ */}
      <div className={`pg-gauge-card pg-fade-in ${mounted ? 'pg-in' : ''}`} style={{ background:D.ivory, borderRadius:22, border:`1px solid ${D.border}`, boxShadow:D.shadow, padding:'24px 26px', marginBottom:22, position:'relative', overflow:'hidden' }}>
        <div className="pg-gauge-sheen" />
        <div className="pg-gauge-top" style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:20, marginBottom:16, position:'relative' }}>
          <div>
            <p style={{ fontSize:11, fontWeight:800, color:D.brass, textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 6px' }}>
              {t('hotel.dashboard.occupancyToday')}
            </p>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <span style={{ fontFamily:DISPLAY_FONT, fontSize:52, fontWeight:700, color:D.text, lineHeight:1, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums' }}>
                {isLoading ? '—' : displayPct}
              </span>
              {!isLoading && <span style={{ fontFamily:DISPLAY_FONT, fontSize:24, fontWeight:600, color:D.muted }}>%</span>}
            </div>
          </div>
          <p style={{ fontSize:13, color:D.muted, margin:0, textAlign:'right', maxWidth:220 }}>
            {t('hotel.dashboard.occupancySub', { occupied: stats.occupied, total })}
          </p>
        </div>

        {/* Ba segmante */}
        <div style={{ display:'flex', width:'100%', height:12, borderRadius:99, overflow:'hidden', background:D.blueDim, gap:2, position:'relative' }}>
          {total === 0 ? (
            <div style={{ flex:1, background:'repeating-linear-gradient(45deg,rgba(27,42,143,0.06),rgba(27,42,143,0.06) 6px,transparent 6px,transparent 12px)' }}/>
          ) : STATUS_ORDER.map((key, i) => {
            const cfg = STATUS_CONFIG[key]
            const pct = (stats[key] / total) * 100
            if (pct <= 0) return null
            return (
              <div key={key} className={`pg-segment ${mounted ? 'pg-in' : ''}`}
                style={{ width: `${pct}%`, background: cfg.color, borderRadius:99, transitionDelay:`${i*80}ms` }}
                title={`${cfg.label}: ${stats[key]}`}/>
            )
          })}
        </div>

        {/* Legend klikab — ranplase 5 bwat idantik yo */}
        <div className="pg-legend" style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:16 }}>
          {STATUS_ORDER.map(key => {
            const cfg = STATUS_CONFIG[key]
            const active = filterStatus === key
            return (
              <button key={key} onClick={() => setFilterStatus(active ? '' : key)}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:99,
                  border:`1.5px solid ${active ? cfg.color : D.border}`,
                  background: active ? cfg.bg : 'transparent',
                  cursor:'pointer', transition:'all 0.18s',
                }}>
                <span style={{ width:7, height:7, borderRadius:99, background:cfg.dot, flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:700, color: active ? cfg.color : D.muted }}>{cfg.label}</span>
                <span style={{ fontSize:12, fontWeight:900, color: active ? cfg.color : D.text, fontVariantNumeric:'tabular-nums' }}>{stats[key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ Grid chanm ═══ */}
      {isLoading ? (
        <div className="pg-rooms-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} style={{ height:150, borderRadius:18, background:'linear-gradient(100deg,#EEF0FF 40%,#F5F6FF 50%,#EEF0FF 60%)', backgroundSize:'200% 100%', animation:'pg-shimmer 1.6s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : !filtered.length ? (
        <div style={{ padding:'70px 20px', textAlign:'center', background:D.ivory, borderRadius:20, border:`1px dashed ${D.border}` }}>
          <div style={{ width:56, height:56, borderRadius:16, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <BedDouble size={26} color={D.blue}/>
          </div>
          <p style={{ fontFamily:DISPLAY_FONT, color:D.text, fontSize:18, fontWeight:600, margin:'0 0 18px' }}>{t('hotel.dashboard.noRooms')}</p>
          <Link to="/app/hotel/rooms/new" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:13, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:13, textDecoration:'none' }}>
            <Plus size={14}/> {t('hotel.dashboard.addRoom')}
          </Link>
        </div>
      ) : (
        <div className="pg-rooms-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
          {filtered.map((room, idx) => (
            <RoomCard key={room.id} room={room} idx={idx} mounted={mounted} D={D} DISPLAY_FONT={DISPLAY_FONT} STATUS_CONFIG={STATUS_CONFIG} t={t}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}/>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');

        @keyframes pg-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pg-blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes pg-ring { 0%{ transform:scale(1); opacity:0.55 } 100%{ transform:scale(1.9); opacity:0 } }
        @keyframes pg-rise { from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:translateY(0) } }
        @keyframes pg-flash { 0%{ box-shadow:0 0 0 0 rgba(76,139,110,0.55) } 100%{ box-shadow:0 0 0 14px rgba(76,139,110,0) } }

        .pg-pulse-ring { position:absolute; inset:0; border-radius:15px; border:2px solid #fff; animation:pg-ring 2.6s ease-out infinite; }

        .pg-header-in, .pg-fade-in { opacity:0; transform:translateY(-6px); transition:opacity 0.5s ease, transform 0.5s ease; }
        .pg-header-in.pg-in, .pg-fade-in.pg-in { opacity:1; transform:translateY(0); }
        .pg-fade-in.pg-in { transition-delay:0.08s; }

        .pg-gauge-card { isolation:isolate; }
        .pg-gauge-sheen {
          position:absolute; top:-40%; left:-20%; width:60%; height:180%;
          background:linear-gradient(75deg, transparent, rgba(184,134,58,0.07), transparent);
          transform:rotate(8deg); pointer-events:none; z-index:0;
        }
        .pg-gauge-top { z-index:1; }

        .pg-segment { transform:scaleX(0); transform-origin:left; transition:transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .pg-segment.pg-in { transform:scaleX(1); }

        .pg-room-card { opacity:0; transform:translateY(14px); animation:pg-rise 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .pg-room-card:hover { transform:translateY(-3px); }
        .pg-room-card.pg-flash { animation:pg-rise 0.5s cubic-bezier(0.22,1,0.36,1) forwards, pg-flash 0.9s ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .pg-pulse-ring, .pg-room-card, .pg-segment, .pg-header-in, .pg-fade-in { animation:none !important; transition:none !important; opacity:1 !important; transform:none !important; }
        }

        @media (max-width:640px) {
          .pg-hotel-dashboard .pg-dashboard-headerbtns { width:100%; }
          .pg-hotel-dashboard .pg-dashboard-headerbtns a { flex:1; justify-content:center; }
          .pg-hotel-dashboard .pg-gauge-top { flex-direction:column; align-items:flex-start; gap:10px; }
          .pg-hotel-dashboard .pg-legend { gap:6px; }
          .pg-hotel-dashboard .pg-rooms-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)) !important; }
        }
      `}</style>
    </div>
  )
}

function RoomCard({ room, idx, mounted, D, DISPLAY_FONT, STATUS_CONFIG, t, onStatusChange }) {
  const [showMenu, setShowMenu] = useState(false)
  const [flash, setFlash] = useState(false)
  const cfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.available
  const activeRes = room.reservations?.[0]
  const clientName = activeRes?.clientSnapshot?.name

  const changeStatus = (id, status) => {
    onStatusChange(id, status)
    setFlash(true)
    setTimeout(() => setFlash(false), 900)
  }

  return (
    <div
      className={`pg-room-card ${flash ? 'pg-flash' : ''}`}
      style={{
        animationDelay: mounted ? `${Math.min(idx, 12) * 45}ms` : '0ms',
        background:D.ivory, borderRadius:18, border:`1.5px solid ${cfg.color}28`,
        boxShadow:D.shadow, overflow:'hidden', transition:'transform 0.2s, box-shadow 0.2s',
        position:'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 10px 26px ${cfg.color}30`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = D.shadow}>

      {/* Rive kwiv — ti detay tikèt kle */}
      <span style={{ position:'absolute', top:10, right:10, width:6, height:6, borderRadius:99, background:D.brass, opacity:0.55 }}/>

      <div style={{ height:5, background:`linear-gradient(90deg,${cfg.color},${cfg.color}99)` }}/>

      <div style={{ padding:'15px 15px 13px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:9 }}>
          <span style={{ fontFamily:DISPLAY_FONT, fontSize:24, fontWeight:700, color:D.text, lineHeight:1 }}>#{room.number}</span>
          <span style={{ fontSize:9.5, fontWeight:800, padding:'3px 9px', borderRadius:99, background:cfg.bg, color:cfg.color, letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{cfg.label}</span>
        </div>

        <p style={{ fontSize:11, color:D.muted, margin:'0 0 3px', fontWeight:600 }}>{room.roomType?.name}</p>
        <p style={{ fontSize:12, color:D.muted, margin:'0 0 11px', fontFamily:'monospace' }}>
          {Number(room.roomType?.priceHtg || 0).toLocaleString()} HTG/nwit
        </p>

        {clientName && (
          <div style={{ padding:'6px 10px', borderRadius:8, background:D.blueDim, marginBottom:10 }}>
            <p style={{ fontSize:11, color:D.blue, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>👤 {clientName}</p>
          </div>
        )}

        <div style={{ display:'flex', gap:6 }}>
          {room.status === 'cleaning' ? (
            <button onClick={() => changeStatus(room.id, 'available')}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 10px', borderRadius:9, background:`linear-gradient(135deg,${D.success},#5DA37F)`, color:'#fff', fontWeight:700, fontSize:11, border:'none', cursor:'pointer' }}>
              <Check size={12}/> {t('hotel.dashboard.finishCleaning')}
            </button>
          ) : activeRes ? (
            <Link to={`/app/hotel/reservations/${activeRes.id}`}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 10px', borderRadius:9, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:700, fontSize:11, textDecoration:'none' }}>
              <Eye size={12}/> {t('hotel.dashboard.view')}
            </Link>
          ) : (
            <Link to={`/app/hotel/reservations/new?roomId=${room.id}`}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 10px', borderRadius:9, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:700, fontSize:11, textDecoration:'none' }}>
              <Plus size={12}/> {t('hotel.dashboard.reserve')}
            </Link>
          )}

          <div style={{ position:'relative' }}>
            <button onClick={() => setShowMenu(v => !v)}
              style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${D.border}`, background:D.blueDim, color:D.blue, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
              ⋯
            </button>
            {showMenu && (
              <div style={{ position:'absolute', right:0, top:36, background:D.white, borderRadius:10, border:`1px solid ${D.border}`, boxShadow:'0 8px 24px rgba(0,0,0,0.14)', zIndex:10, minWidth:150, overflow:'hidden' }}
                onMouseLeave={() => setShowMenu(false)}>
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== room.status).map(([k, v]) => (
                  <button key={k} onClick={() => { changeStatus(room.id, k); setShowMenu(false) }}
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
