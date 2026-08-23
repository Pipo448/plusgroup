// src/pages/hotel/ReservationDetail.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 0 })
const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box', fontFamily:'DM Sans,sans-serif' }

export default function ReservationDetail() {
  const { t } = useTranslation()
  const { id }   = useParams()
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const STATUS_MAP = {
    pending:     { label:t('hotel.reservations.status.pending'),    color:D.muted,   bg:'rgba(107,122,171,0.10)' },
    confirmed:   { label:t('hotel.reservations.status.confirmed'),  color:D.blue,    bg:D.blueDim2 },
    checked_in:  { label:'Check-in',  color:D.success, bg:D.successBg },
    checked_out: { label:'Check-out', color:'#7C3AED', bg:'rgba(124,58,237,0.08)' },
    cancelled:   { label:t('hotel.reservations.status.cancelled'),  color:D.red,     bg:D.redDim },
    no_show:     { label:t('hotel.reservations.status.noShow'),     color:D.warning, bg:D.warningBg },
  }

  const SERVICE_TYPES = [
    { v:'food',         l:t('hotel.reservationDetail.serviceTypeFood') },
    { v:'drink',        l:t('hotel.reservationDetail.serviceTypeDrink') },
    { v:'laundry',      l:t('hotel.reservationDetail.serviceTypeLaundry') },
    { v:'transport',    l:t('hotel.reservationDetail.serviceTypeTransport') },
    { v:'spa',          l:t('hotel.reservationDetail.serviceTypeSpa') },
    { v:'room_service', l:t('hotel.reservationDetail.serviceTypeRoomService') },
    { v:'other',        l:t('hotel.reservationDetail.serviceTypeOther') },
  ]

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
  if (!data) return <div style={{ padding:40, textAlign:'center', color:D.muted }}>{t('hotel.reservationDetail.notFound')}</div>

  const s         = STATUS_MAP[data.status] || STATUS_MAP.pending
  const isActive  = ['confirmed', 'checked_in'].includes(data.status)
  const canCheckIn  = data.status === 'confirmed'
  const canCheckOut = data.status === 'checked_in'
  const canCancel   = ['confirmed', 'pending'].includes(data.status)

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }} className="pg-hotel-resdetail">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link to="/app/hotel/reservations" style={{ width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:D.blueDim2, color:D.blue, textDecoration:'none', border:`1px solid ${D.border}` }}>
            <ChevronLeft size={18}/>
          </Link>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h1 style={{ color:D.text, fontSize:20, fontWeight:900, margin:0 }}>{data.reservationNumber}</h1>
              <span style={{ fontSize:11, fontWeight:800, padding:'3px 12px', borderRadius:99, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</span>
            </div>
            <p style={{ color:D.muted, fontSize:12, margin:'3px 0 0' }}>
              {format(new Date(data.checkIn),'dd/MM/yyyy')} → {format(new Date(data.checkOut),'dd/MM/yyyy')} · {t('hotel.reservations.nights', { count: data.nights })}
            </p>
          </div>
        </div>

        {/* Aksyon prensipal */}
        <div className="pg-resdetail-actions" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {canCheckIn && (
            <button onClick={() => checkInMut.mutate()} disabled={checkInMut.isPending}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${D.success}45` }}>
              {checkInMut.isPending ? <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> : <LogIn size={14}/>} {t('hotel.reservationDetail.checkIn')}
            </button>
          )}
          {canCheckOut && (
            <button onClick={() => setShowCheckoutModal(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${D.blue}45` }}>
              <LogOut size={14}/> {t('hotel.reservationDetail.checkOut')}
            </button>
          )}
          {canCancel && (
            <button onClick={() => setShowCancelModal(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:11, background:D.redDim, color:D.red, fontWeight:700, fontSize:13, border:`1.5px solid ${D.red}30`, cursor:'pointer' }}>
              <XCircle size={14}/> {t('hotel.reservationDetail.cancel')}
            </button>
          )}
        </div>
      </div>

      <div className="pg-resdetail-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* ── KOLÒN 1 ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Info chanm + kliyan */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <BedDouble size={15} color={D.blue}/> {t('hotel.reservationDetail.roomClientTitle')}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <InfoBlock label={t('hotel.reservationDetail.room')} value={`#${data.room?.number} — ${data.room?.floor}`}/>
              <InfoBlock label={t('hotel.reservationDetail.type')} value={data.room?.roomType?.name}/>
              <InfoBlock label={t('hotel.reservationDetail.client')} value={data.clientSnapshot?.name || t('hotel.reservationDetail.anonymous')}/>
              <InfoBlock label={t('hotel.reservationDetail.phone')} value={data.clientSnapshot?.phone || '—'}/>
              <InfoBlock label={t('hotel.reservationDetail.adults')} value={data.adults}/>
              <InfoBlock label={t('hotel.reservationDetail.children')} value={data.children}/>
              <InfoBlock label={t('hotel.reservationDetail.source')} value={data.source}/>
              {data.notes && <InfoBlock label={t('hotel.reservationDetail.notesLabel')} value={data.notes} fullWidth/>}
            </div>
          </div>

          {/* Finansye */}
          <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <CreditCard size={15} color={D.blue}/> {t('hotel.reservationDetail.financeTitle')}
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <FinRow label={t('hotel.reservationDetail.roomLabel')} val={`${fmt(data.roomTotalHtg)} HTG`} D={D}/>
              <FinRow label={t('hotel.reservationDetail.servicesLabel')} val={`${fmt(data.servicesTotalHtg)} HTG`} D={D}/>
              <div style={{ height:1, background:D.border }}/>
              <FinRow label={t('hotel.reservationDetail.totalLabel')} val={`${fmt(data.totalHtg)} HTG`} bold D={D}/>
              <FinRow label={t('hotel.reservationDetail.paidLabel')} val={`${fmt(data.amountPaidHtg)} HTG`} color={D.success} D={D}/>
              <FinRow label={t('hotel.reservationDetail.balanceLabel')} val={`${fmt(data.balanceDueHtg)} HTG`} color={Number(data.balanceDueHtg) > 0 ? D.red : D.success} bold D={D}/>
            </div>
          </div>

          {/* Peman — ajoute */}
          {isActive && (
            <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
              <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('hotel.reservationDetail.addPaymentTitle')}</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <input type="number" placeholder={t('hotel.reservationDetail.amountPlaceholder')} value={paymentForm.amountHtg} onChange={e => setPaymentForm(f => ({ ...f, amountHtg: e.target.value }))} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} style={{ ...inputStyle, cursor:'pointer' }}>
                  <option value="cash">{t('hotel.reservationDetail.methodCash')}</option>
                  <option value="card">{t('hotel.reservationDetail.methodCard')}</option>
                  <option value="moncash">{t('hotel.reservationDetail.methodMoncash')}</option>
                  <option value="transfer">{t('hotel.reservationDetail.methodTransfer')}</option>
                </select>
              </div>
              <button onClick={() => addPaymentMut.mutate(paymentForm)} disabled={addPaymentMut.isPending || !paymentForm.amountHtg}
                style={{ width:'100%', padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', opacity: !paymentForm.amountHtg ? 0.5 : 1 }}>
                {addPaymentMut.isPending ? t('hotel.reservationDetail.recording') : t('hotel.reservationDetail.recordPayment')}
              </button>

              {/* Istorik peman */}
              {data.payments?.length > 0 && (
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                  {data.payments.map(p => (
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', borderRadius:8, background:D.successBg }}>
                      <span style={{ fontSize:12, color:D.success, fontWeight:700 }}>{p.type === 'deposit' ? t('hotel.reservationDetail.depositType') : t('hotel.reservationDetail.paymentType')} · {p.method}</span>
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
              <Utensils size={15} color={D.blue}/> {t('hotel.reservationDetail.servicesTitle')}
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
                  <span style={{ fontFamily:'monospace', fontWeight:900, color:D.blue, fontSize:14 }}>{t('hotel.reservationDetail.totalLabel')}: {fmt(data.servicesTotalHtg)} HTG</span>
                </div>
              </div>
            ) : (
              <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:'16px 0' }}>{t('hotel.reservationDetail.noServices')}</p>
            )}

            {/* Fòm ajoute sèvis */}
            {isActive && (
              <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:16 }}>
                <p style={{ fontSize:12, fontWeight:800, color:D.text, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('hotel.reservationDetail.addServiceTitle')}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <select value={serviceForm.type} onChange={e => setServiceForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, cursor:'pointer' }}>
                    {SERVICE_TYPES.map(st => <option key={st.v} value={st.v}>{st.l}</option>)}
                  </select>
                  <input type="number" placeholder={t('hotel.reservationDetail.quantityPlaceholder')} value={serviceForm.quantity} onChange={e => setServiceForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                </div>
                <input placeholder={t('hotel.reservationDetail.descriptionPlaceholder')} value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, marginBottom:8 }}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <input type="number" placeholder={t('hotel.reservationDetail.unitPricePlaceholder')} value={serviceForm.unitPriceHtg} onChange={e => setServiceForm(f => ({ ...f, unitPriceHtg: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                  <input placeholder={t('hotel.reservationDetail.notesOptionalPlaceholder')} value={serviceForm.notes} onChange={e => setServiceForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                </div>
                <button onClick={() => addServiceMut.mutate(serviceForm)} disabled={addServiceMut.isPending || !serviceForm.description || !serviceForm.unitPriceHtg}
                  style={{ width:'100%', padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: (!serviceForm.description || !serviceForm.unitPriceHtg) ? 0.5 : 1 }}>
                  {addServiceMut.isPending ? <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Plus size={14}/>} {t('hotel.reservationDetail.addServiceBtn')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Check-out */}
      {showCheckoutModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:D.white, borderRadius:20, padding:28, width:380, maxWidth:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color:D.text, fontSize:18, fontWeight:900, margin:'0 0 8px' }}>{t('hotel.reservationDetail.checkoutModalTitle')}</h3>
            <p style={{ color:D.muted, fontSize:13, margin:'0 0 20px' }}>{t('hotel.reservationDetail.checkoutFinalTotal')} <strong style={{ color:D.text }}>{fmt(data.totalHtg)} HTG</strong> · {t('hotel.reservationDetail.checkoutBalance')} <strong style={{ color:Number(data.balanceDueHtg)>0 ? D.red : D.success }}>{fmt(data.balanceDueHtg)} HTG</strong></p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:700, color:D.muted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('hotel.reservationDetail.checkoutMethodLabel')}</label>
              <select value={checkoutMethod} onChange={e => setCheckoutMethod(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
                <option value="cash">{t('hotel.reservationDetail.methodCash')}</option>
                <option value="card">{t('hotel.reservationDetail.methodCard')}</option>
                <option value="moncash">{t('hotel.reservationDetail.methodMoncash')}</option>
                <option value="transfer">{t('hotel.reservationDetail.methodTransfer')}</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowCheckoutModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${D.border}`, background:'transparent', color:D.muted, fontWeight:700, cursor:'pointer' }}>
                {t('hotel.roomTypes.cancel')}
              </button>
              <button onClick={() => { checkOutMut.mutate({ paymentMethod: checkoutMethod }); setShowCheckoutModal(false) }}
                style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, border:'none', cursor:'pointer' }}>
                {checkOutMut.isPending ? t('hotel.reservationDetail.checkoutProcessing') : t('hotel.reservationDetail.checkoutConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anilasyon */}
      {showCancelModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:D.white, borderRadius:20, padding:28, width:380, maxWidth:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color:D.red, fontSize:18, fontWeight:900, margin:'0 0 12px' }}>{t('hotel.reservationDetail.cancelModalTitle')}</h3>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={t('hotel.reservationDetail.cancelReasonPlaceholder')} rows={3}
              style={{ ...inputStyle, resize:'vertical', marginBottom:16 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${D.border}`, background:'transparent', color:D.muted, fontWeight:700, cursor:'pointer' }}>
                {t('hotel.reservationDetail.back')}
              </button>
              <button onClick={() => cancelMut.mutate({ cancelReason })}
                style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${D.red},#E74C3C)`, color:'#fff', fontWeight:800, border:'none', cursor:'pointer' }}>
                {cancelMut.isPending ? t('hotel.reservationDetail.cancelling') : t('hotel.reservationDetail.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media (max-width:760px) {
          .pg-hotel-resdetail .pg-resdetail-grid { grid-template-columns:1fr !important; }
          .pg-hotel-resdetail .pg-resdetail-actions { width:100%; }
          .pg-hotel-resdetail .pg-resdetail-actions button { flex:1; justify-content:center; }
        }
      `}</style>
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
