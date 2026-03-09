// src/pages/hotel/ReservationDetail.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, BedDouble, User, Utensils, CreditCard, LogIn, LogOut, XCircle, Plus, Trash2, Loader } from 'lucide-react'
import { format } from 'date-fns'
import { hotelAPI } from '../../services/hotelAPI'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  white:'#FFFFFF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const STATUS_MAP = {
  pending:     { label:'Annatant',  color:D.muted,   bg:'rgba(107,122,171,0.10)' },
  confirmed:   { label:'Konfime',   color:D.blue,    bg:D.blueDim2 },
  checked_in:  { label:'Check-in',  color:D.success, bg:D.successBg },
  checked_out: { label:'Check-out', color:'#7C3AED', bg:'rgba(124,58,237,0.08)' },
  cancelled:   { label:'Anile',     color:D.red,     bg:D.redDim },
  no_show:     { label:'No-show',   color:D.warning, bg:D.warningBg },
}

const SERVICE_TYPES = [
  { v:'food',         l:'🍽 Manje' },
  { v:'drink',        l:'🥤 Bwason' },
  { v:'laundry',      l:'👕 Lavaj' },
  { v:'transport',    l:'🚗 Transpò' },
  { v:'spa',          l:'💆 Spa' },
  { v:'room_service', l:'🛎 Sèvis Chanm' },
  { v:'other',        l:'📦 Lòt' },
]

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })
const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' }

export default function ReservationDetail() {
  const { id }   = useParams()
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const [serviceForm, setServiceForm]       = useState({ type:'other', description:'', quantity:1, unitPriceHtg:'', notes:'' })
  const [paymentForm, setPaymentForm]       = useState({ amountHtg:'', method:'cash' })
  const [cancelReason, setCancelReason]     = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutMethod, setCheckoutMethod] = useState('cash')

  const { data, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn:  () => hotelAPI.getReservation(id).then(r => r.data?.data),
  })

  const invalidate = () => qc.invalidateQueries(['reservation', id])

  const checkInMut    = useMutation({ mutationFn: ()    => hotelAPI.checkIn(id), onSuccess: invalidate })
  const checkOutMut   = useMutation({ mutationFn: (d)   => hotelAPI.checkOut(id, d), onSuccess: (r) => { invalidate(); if (r.data?.data?.invoice?.id) navigate(`/app/invoices/${r.data.data.invoice.id}`) } })
  const cancelMut     = useMutation({ mutationFn: (d)   => hotelAPI.cancelReservation(id, d), onSuccess: () => { invalidate(); setShowCancelModal(false) } })
  const addServiceMut = useMutation({ mutationFn: (d)   => hotelAPI.addService(id, d), onSuccess: () => { invalidate(); setServiceForm({ type:'other', description:'', quantity:1, unitPriceHtg:'', notes:'' }) } })
  const delServiceMut = useMutation({ mutationFn: (sid) => hotelAPI.removeService(sid), onSuccess: invalidate })
  const addPaymentMut = useMutation({ mutationFn: (d)   => hotelAPI.addPayment(id, d), onSuccess: () => { invalidate(); setPaymentForm({ amountHtg:'', method:'cash' }) } })

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <Loader size={28} color={D.blue} style={{ animation:'spin 1s linear infinite' }}/>
    </div>
  )
  if (!data) return <div style={{ padding:40, textAlign:'center', color:D.muted }}>Rezèvasyon pa jwenn</div>

  const s         = STATUS_MAP[data.status] || STATUS_MAP.pending
  const isActive  = ['confirmed', 'checked_in'].includes(data.status)
  const canCheckIn  = data.status === 'confirmed'
  const canCheckOut = data.status === 'checked_in'
  const canCancel   = ['confirmed', 'pending'].includes(data.status)

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link to="/app/hotel/reservations" style={{ width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:D.blueDim2, color:D.blue, textDecoration:'none', border:`1px solid ${D.border}` }}>
            <ChevronLeft size={18}/>
          </Link>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h1 style={{ color:D.text, fontSize:20, fontWeight:900, margin:0 }}>{data.reservationNumber}</h1>
              <span style={{ fontSize:11, fontWeight:800, padding:'3px 12px', borderRadius:99, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</span>
            </div>
            <p style={{ color:D.muted, fontSize:12, margin:'3px 0 0' }}>
              {format(new Date(data.checkIn),'dd/MM/yyyy')} → {format(new Date(data.checkOut),'dd/MM/yyyy')} · {data.nights} nwit
            </p>
          </div>
        </div>

        {/* Aksyon prensipal */}
        <div style={{ display:'flex', gap:8 }}>
          {canCheckIn && (
            <button onClick={() => checkInMut.mutate()} disabled={checkInMut.isPending}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${D.success}45` }}>
              {checkInMut.isPending ? <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> : <LogIn size={14}/>} Check-in
            </button>
          )}
          {canCheckOut && (
            <button onClick={() => setShowCheckoutModal(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${D.blue}45` }}>
              <LogOut size={14}/> Check-out
            </button>
          )}
          {canCancel && (
            <button onClick={() => setShowCancelModal(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:11, background:D.redDim, color:D.red, fontWeight:700, fontSize:13, border:`1.5px solid ${D.red}30`, cursor:'pointer' }}>
              <XCircle size={14}/> Anile
            </button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* ── KOLÒN 1 ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Info chanm + kliyan */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <BedDouble size={15} color={D.blue}/> Chanm & Kliyan
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <InfoBlock label="Chanm" value={`#${data.room?.number} — Etaj ${data.room?.floor}`}/>
              <InfoBlock label="Tip" value={data.room?.roomType?.name}/>
              <InfoBlock label="Kliyan" value={data.clientSnapshot?.name || 'Anonim'}/>
              <InfoBlock label="Telefòn" value={data.clientSnapshot?.phone || '—'}/>
              <InfoBlock label="Granmoun" value={data.adults}/>
              <InfoBlock label="Timoun" value={data.children}/>
              <InfoBlock label="Sous" value={data.source}/>
              {data.notes && <InfoBlock label="Nòt" value={data.notes} fullWidth/>}
            </div>
          </div>

          {/* Finansye */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <CreditCard size={15} color={D.blue}/> Finansye
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <FinRow label="Chanm" val={`${fmt(data.roomTotalHtg)} HTG`} D={D}/>
              <FinRow label="Sèvis" val={`${fmt(data.servicesTotalHtg)} HTG`} D={D}/>
              <div style={{ height:1, background:D.border }}/>
              <FinRow label="Total" val={`${fmt(data.totalHtg)} HTG`} bold D={D}/>
              <FinRow label="Peye" val={`${fmt(data.amountPaidHtg)} HTG`} color={D.success} D={D}/>
              <FinRow label="Balans" val={`${fmt(data.balanceDueHtg)} HTG`} color={Number(data.balanceDueHtg) > 0 ? D.red : D.success} bold D={D}/>
            </div>
          </div>

          {/* Peman — ajoute */}
          {isActive && (
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Ajoute Peman</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <input type="number" placeholder="Montan HTG" value={paymentForm.amountHtg} onChange={e => setPaymentForm(f => ({ ...f, amountHtg: e.target.value }))} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} style={{ ...inputStyle, cursor:'pointer' }}>
                  <option value="cash">Cash</option>
                  <option value="card">Kat</option>
                  <option value="moncash">MonCash</option>
                  <option value="transfer">Virement</option>
                </select>
              </div>
              <button onClick={() => addPaymentMut.mutate(paymentForm)} disabled={addPaymentMut.isPending || !paymentForm.amountHtg}
                style={{ width:'100%', padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', opacity: !paymentForm.amountHtg ? 0.5 : 1 }}>
                {addPaymentMut.isPending ? 'Ap anrejistre...' : '+ Anrejistre Peman'}
              </button>

              {/* Istorik peman */}
              {data.payments?.length > 0 && (
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                  {data.payments.map(p => (
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, background:D.successBg }}>
                      <span style={{ fontSize:12, color:D.success, fontWeight:700 }}>{p.type === 'deposit' ? 'Depo' : 'Peman'} · {p.method}</span>
                      <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:800, color:D.success }}>{fmt(p.amountHtg)} HTG</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── KOLÒN 2 — SÈVIS ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <Utensils size={15} color={D.blue}/> Sèvis Anplis
            </h3>

            {/* Lis sèvis */}
            {data.services?.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {data.services.map(sv => (
                  <div key={sv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'#F8F9FF', border:`1px solid ${D.border}` }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:D.text, margin:'0 0 2px' }}>{sv.description}</p>
                      <p style={{ fontSize:11, color:D.muted, margin:0 }}>×{sv.quantity} · {fmt(sv.unitPriceHtg)} HTG</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:13 }}>{fmt(sv.totalHtg)} HTG</span>
                      {isActive && (
                        <button onClick={() => delServiceMut.mutate(sv.id)}
                          style={{ width:28, height:28, borderRadius:7, border:'none', background:D.redDim, color:D.red, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'flex-end', padding:'8px 12px', background:D.blueDim, borderRadius:8 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:900, color:D.blue, fontSize:14 }}>Total: {fmt(data.servicesTotalHtg)} HTG</span>
                </div>
              </div>
            ) : (
              <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'16px 0' }}>Pa gen sèvis anplis</p>
            )}

            {/* Fòm ajoute sèvis */}
            {isActive && (
              <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:16 }}>
                <p style={{ fontSize:12, fontWeight:800, color:D.text, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Ajoute Sèvis</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <select value={serviceForm.type} onChange={e => setServiceForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, cursor:'pointer' }}>
                    {SERVICE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                  <input type="number" placeholder="Kantite" value={serviceForm.quantity} onChange={e => setServiceForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                </div>
                <input placeholder="Deskripsyon *" value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, marginBottom:8 }}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <input type="number" placeholder="Pri unitè HTG *" value={serviceForm.unitPriceHtg} onChange={e => setServiceForm(f => ({ ...f, unitPriceHtg: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                  <input placeholder="Nòt (opsyonèl)" value={serviceForm.notes} onChange={e => setServiceForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                </div>
                <button onClick={() => addServiceMut.mutate(serviceForm)} disabled={addServiceMut.isPending || !serviceForm.description || !serviceForm.unitPriceHtg}
                  style={{ width:'100%', padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: (!serviceForm.description || !serviceForm.unitPriceHtg) ? 0.5 : 1 }}>
                  {addServiceMut.isPending ? <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Plus size={14}/>} Ajoute Sèvis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Check-out */}
      {showCheckoutModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:D.white, borderRadius:20, padding:28, width:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color:D.text, fontSize:18, fontWeight:900, margin:'0 0 8px' }}>Konfime Check-out</h3>
            <p style={{ color:D.muted, fontSize:13, margin:'0 0 20px' }}>Total final: <strong style={{ color:D.text }}>{fmt(data.totalHtg)} HTG</strong> · Balans: <strong style={{ color:Number(data.balanceDueHtg)>0 ? D.red : D.success }}>{fmt(data.balanceDueHtg)} HTG</strong></p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:D.muted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Metòd Peman Final</label>
              <select value={checkoutMethod} onChange={e => setCheckoutMethod(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
                <option value="cash">Cash</option>
                <option value="card">Kat</option>
                <option value="moncash">MonCash</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowCheckoutModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${D.border}`, background:'transparent', color:D.muted, fontWeight:700, cursor:'pointer' }}>
                Anile
              </button>
              <button onClick={() => { checkOutMut.mutate({ paymentMethod: checkoutMethod }); setShowCheckoutModal(false) }}
                style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, border:'none', cursor:'pointer' }}>
                {checkOutMut.isPending ? 'Ap trete...' : 'Check-out + Jenere Fakti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anilasyon */}
      {showCancelModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:D.white, borderRadius:20, padding:28, width:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color:D.red, fontSize:18, fontWeight:900, margin:'0 0 12px' }}>Anile Rezèvasyon</h3>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Rezon anilasyon..." rows={3}
              style={{ ...inputStyle, resize:'vertical', marginBottom:16 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${D.border}`, background:'transparent', color:D.muted, fontWeight:700, cursor:'pointer' }}>
                Tounen
              </button>
              <button onClick={() => cancelMut.mutate({ cancelReason })}
                style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${D.red},#E74C3C)`, color:'#fff', fontWeight:800, border:'none', cursor:'pointer' }}>
                {cancelMut.isPending ? 'Ap anile...' : 'Konfime Anilasyon'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function InfoBlock({ label, value, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <p style={{ fontSize:10, fontWeight:700, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 3px' }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:600, color:'#0F1A5C', margin:0 }}>{value || '—'}</p>
    </div>
  )
}

function FinRow({ label, val, bold, color, D }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:13, color:D.muted }}>{label}</span>
      <span style={{ fontFamily:'monospace', fontSize: bold ? 14 : 13, fontWeight: bold ? 900 : 700, color: color || D.text }}>{val}</span>
    </div>
  )
}
