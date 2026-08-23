// src/pages/hotel/ReservationDetail.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, BedDouble, User, Utensils, CreditCard, LogIn, LogOut, XCircle, Plus, Trash2, Loader, Search, X, Package } from 'lucide-react'
import { format } from 'date-fns'
import { hotelAPI } from '../../services/hotelAPI'
import { productAPI } from '../../services/api'
import toast from 'react-hot-toast'

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

  const [cart, setCart]                       = useState([]) // [{ productId, name, priceHtg, unit, isService, quantity, availableQty }]
  const [productQuery, setProductQuery]       = useState('')
  const [productResults, setProductResults]   = useState([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const productSearchRef = useRef(null)
  const servicesSectionRef = useRef(null)
  const [paymentForm, setPaymentForm]       = useState({ cashReceivedHtg:'', method:'cash' })
  const [cancelReason, setCancelReason]     = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutMethod, setCheckoutMethod] = useState('cash')
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [checkinForm, setCheckinForm] = useState({ cashReceivedHtg:'', paymentMethod:'cash', guestIdPhotoUrl:'', guestAddress:'', guestNif:'' })

  const handleGuestPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCheckinForm(f => ({ ...f, guestIdPhotoUrl: reader.result }))
    reader.readAsDataURL(file)
  }

  // ── Rechèch pwodui nan stock la (pou lye Sèvis Anplis ak yon vrè atik) ──
  useEffect(() => {
    if (!productQuery || productQuery.trim().length < 2) { setProductResults([]); return }
    setSearchingProducts(true)
    const timer = setTimeout(() => {
      productAPI.getAll({ search: productQuery.trim(), isActive: true, limit: 6 })
        .then(r => setProductResults(r.data?.products || []))
        .catch(() => setProductResults([]))
        .finally(() => setSearchingProducts(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [productQuery])

  const addToCart = (p) => {
    setCart(c => {
      const existing = c.find(item => item.productId === p.id)
      if (existing) return c.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...c, { productId: p.id, name: p.name, priceHtg: Number(p.priceHtg), unit: p.unit, isService: p.isService, quantity: 1, availableQty: Number(p.quantity) }]
    })
    setProductQuery('')
    setProductResults([])
    productSearchRef.current?.focus()
  }
  const updateCartQty = (productId, qty) => setCart(c => c.map(item => item.productId === productId ? { ...item, quantity: qty } : item))
  const removeFromCart = (productId) => setCart(c => c.filter(item => item.productId !== productId))
  const cartTotal = cart.reduce((sum, item) => sum + item.priceHtg * item.quantity, 0)
  const cartHasStockIssue = cart.some(item => !item.isService && Number(item.quantity) > item.availableQty)

  const jumpToServices = () => {
    servicesSectionRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })
    setTimeout(() => productSearchRef.current?.focus(), 350)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn:  () => hotelAPI.getReservation(id).then(r => r.data?.data),
  })

  const invalidate = () => qc.invalidateQueries(['reservation', id])
  const onErr = (err, fallback) => toast.error(err.response?.data?.message || fallback)

  const checkInMut    = useMutation({
    mutationFn: (d) => hotelAPI.checkIn(id, d),
    onSuccess: (r) => {
      invalidate()
      setShowCheckinModal(false)
      setCheckinForm({ cashReceivedHtg:'', paymentMethod:'cash', guestIdPhotoUrl:'', guestAddress:'', guestNif:'' })
      if (r.data?.data?.invoice?.id) navigate(`/app/invoices/${r.data.data.invoice.id}`)
    },
    onError: (err) => onErr(err, 'Erè pandan check-in'),
  })
  const checkOutMut   = useMutation({
    mutationFn: (d) => hotelAPI.checkOut(id, d),
    onSuccess: (r) => { invalidate(); if (r.data?.data?.invoice?.id) navigate(`/app/invoices/${r.data.data.invoice.id}`) },
    onError:   (err) => onErr(err, 'Erè pandan check-out'),
  })
  const cancelMut     = useMutation({
    mutationFn: (d) => hotelAPI.cancelReservation(id, d),
    onSuccess:  () => { invalidate(); setShowCancelModal(false) },
    onError:    (err) => onErr(err, 'Erè pandan anilasyon'),
  })
  // ── Soumèt tout liy pànye a youn apre lòt; si youn echwe, rete anrejistre sa ki deja pase yo
  const addCartMut = useMutation({
    mutationFn: async () => {
      for (const item of cart) {
        await hotelAPI.addService(id, { productId: item.productId, quantity: item.quantity })
      }
    },
    onSuccess: () => { invalidate(); setCart([]); toast.success(t('hotel.reservationDetail.servicesAdded')) },
    onError:   (err) => { invalidate(); onErr(err, 'Erè pandan ajoute sèvis yo') },
  })
  const delServiceMut = useMutation({
    mutationFn: (sid) => hotelAPI.removeService(sid),
    onSuccess:  invalidate,
    onError:    (err) => onErr(err, 'Erè pandan retire sèvis'),
  })
  const addPaymentMut = useMutation({
    mutationFn: (d) => hotelAPI.addPayment(id, d),
    onSuccess:  () => { invalidate(); setPaymentForm({ cashReceivedHtg:'', method:'cash' }) },
    onError:    (err) => onErr(err, 'Erè pandan anrejistre peman'),
  })

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

  // ── Kalkil monnen — Ajoute Peman (balans aktyèl la, ka gen sèvis ladan l) ──
  const payBalanceDue  = Math.max(0, Number(data.balanceDueHtg || 0))
  const payReceived    = Number(paymentForm.cashReceivedHtg || 0)
  const payApplied     = Math.min(payReceived, payBalanceDue)
  const payChange       = Math.max(0, payReceived - payBalanceDue)

  // ── Kalkil monnen — Check-in (total rezèvasyon - sa ki deja peye kòm depo) ──
  const checkinBalanceDue = Math.max(0, Number(data.totalHtg || 0) - Number(data.amountPaidHtg || 0))
  const checkinReceived   = Number(checkinForm.cashReceivedHtg || 0)
  const checkinApplied    = Math.min(checkinReceived, checkinBalanceDue)
  const checkinChange     = Math.max(0, checkinReceived - checkinBalanceDue)

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
            <button onClick={() => setShowCheckinModal(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:11, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', boxShadow:`0 4px 14px ${D.success}45` }}>
              <LogIn size={14}/> {t('hotel.reservationDetail.checkIn')}
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
              <InfoBlock label={t('hotel.reservationDetail.client')} value={data.clientSnapshot?.name || t('hotel.reservationDetail.anonymous')} onClick={isActive ? jumpToServices : undefined} clickHint={isActive ? t('hotel.reservationDetail.offerProductHint') : undefined}/>
              <InfoBlock label={t('hotel.reservationDetail.phone')} value={data.clientSnapshot?.phone || '—'}/>
              <InfoBlock label={t('hotel.reservationDetail.adults')} value={data.adults}/>
              <InfoBlock label={t('hotel.reservationDetail.children')} value={data.children}/>
              <InfoBlock label={t('hotel.reservationDetail.source')} value={data.source}/>
              {data.guestAddress && <InfoBlock label={t('hotel.reservationDetail.checkinGuestAddress')} value={data.guestAddress}/>}
              {data.guestNif && <InfoBlock label={t('hotel.reservationDetail.checkinGuestNif')} value={data.guestNif}/>}
              {data.notes && <InfoBlock label={t('hotel.reservationDetail.notesLabel')} value={data.notes} fullWidth/>}
            </div>
            {data.guestIdPhotoUrl && (
              <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${D.border}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:D.muted, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>{t('hotel.reservationDetail.checkinGuestIdPhoto')}</p>
                <a href={data.guestIdPhotoUrl} target="_blank" rel="noopener noreferrer">
                  <img src={data.guestIdPhotoUrl} alt="" style={{ width:64, height:64, objectFit:'cover', borderRadius:8, border:`1px solid ${D.border}` }}/>
                </a>
              </div>
            )}
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
                <input type="number" placeholder={t('hotel.reservationDetail.amountReceivedPlaceholder')} value={paymentForm.cashReceivedHtg} onChange={e => setPaymentForm(f => ({ ...f, cashReceivedHtg: e.target.value }))} style={inputStyle}
                  onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} style={{ ...inputStyle, cursor:'pointer' }}>
                  <option value="cash">{t('hotel.reservationDetail.methodCash')}</option>
                  <option value="card">{t('hotel.reservationDetail.methodCard')}</option>
                  <option value="moncash">{t('hotel.reservationDetail.methodMoncash')}</option>
                  <option value="transfer">{t('hotel.reservationDetail.methodTransfer')}</option>
                </select>
              </div>
              {payReceived > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:4, padding:'8px 12px', borderRadius:8, background: payChange > 0 ? D.successBg : D.blueDim, marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:D.muted }}>{t('hotel.reservationDetail.appliedToBalance')}</span>
                    <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:D.text }}>{fmt(payApplied)} HTG</span>
                  </div>
                  {payChange > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:D.success }}>{t('hotel.reservationDetail.changeDue')}</span>
                      <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:13, color:D.success }}>{fmt(payChange)} HTG</span>
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => addPaymentMut.mutate({ amountHtg: payApplied, method: paymentForm.method })} disabled={addPaymentMut.isPending || !paymentForm.cashReceivedHtg || payApplied <= 0}
                style={{ width:'100%', padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', opacity: (!paymentForm.cashReceivedHtg || payApplied <= 0) ? 0.5 : 1 }}>
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
          <div ref={servicesSectionRef} style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, padding:20, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:13, fontWeight:800, margin:'0 0 14px', display:'flex', alignItems:'center', gap:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <Utensils size={15} color={D.blue}/> {t('hotel.reservationDetail.servicesTitle')}
            </h3>

            {/* Lis sèvis */}
            {data.services?.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {data.services.map(sv => (
                  <div key={sv.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'#F8F9FF', border:`1px solid ${D.border}` }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:D.text, margin:'0 0 2px', display:'flex', alignItems:'center', gap:5 }}>
                        {sv.productId && <Package size={11} color={D.success}/>} {sv.description}
                      </p>
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

            {/* Fòm ajoute sèvis — rechèch pwodui + pànye plizyè liy */}
            {isActive && (
              <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:16 }}>
                <p style={{ fontSize:12, fontWeight:800, color:D.text, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('hotel.reservationDetail.addServiceTitle')}</p>

                {/* ── Rechèch pwodui/sèvis nan katalòg la (sèl sous — pa gen antre manyèl) ── */}
                <div style={{ position:'relative', marginBottom:8 }}>
                  <div style={{ position:'relative' }}>
                    <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
                    <input ref={productSearchRef} placeholder={t('hotel.reservationDetail.searchProductPlaceholder')} value={productQuery} onChange={e => setProductQuery(e.target.value)}
                      style={{ ...inputStyle, paddingLeft:30 }}
                      onFocus={e => e.target.style.borderColor=D.blue} onBlur={e => e.target.style.borderColor=D.border}/>
                  </div>
                  {(productQuery.trim().length >= 2) && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:D.white, borderRadius:9, border:`1px solid ${D.border}`, boxShadow:'0 8px 20px rgba(0,0,0,0.12)', zIndex:20, maxHeight:220, overflowY:'auto' }}>
                      {searchingProducts ? (
                        <p style={{ padding:'10px 12px', fontSize:12, color:D.muted, margin:0 }}>{t('hotel.newReservation.loadingRooms')}</p>
                      ) : productResults.length === 0 ? (
                        <p style={{ padding:'10px 12px', fontSize:12, color:D.muted, margin:0 }}>{t('hotel.reservationDetail.noProductsFound')}</p>
                      ) : productResults.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)}
                          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', border:'none', borderBottom:`1px solid ${D.border}`, background:'transparent', cursor:'pointer', textAlign:'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontSize:12, fontWeight:700, color:D.text, display:'flex', alignItems:'center', gap:5 }}>
                            {p.isService ? '🔧' : <Package size={11}/>} {p.name}
                          </span>
                          <span style={{ fontSize:11, color: p.isService || Number(p.quantity) > 0 ? D.success : D.red, fontFamily:'monospace' }}>
                            {fmt(p.priceHtg)} HTG {!p.isService && `· ${p.quantity} ${p.unit || ''}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize:10, color:D.muted, margin:'-2px 0 12px' }}>{t('hotel.reservationDetail.stockOnlyHint')}</p>

                {/* ── Pànye — plizyè liy anvan yon sèl soumèt ── */}
                {cart.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                    {cart.map(item => {
                      const overStock = !item.isService && item.quantity > item.availableQty
                      return (
                        <div key={item.productId} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background: overStock ? D.redDim : '#F8F9FF', border:`1px solid ${overStock ? D.red+'40' : D.border}` }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:12, fontWeight:700, color:D.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
                            <p style={{ fontSize:10, color: overStock ? D.red : D.muted, margin:0, fontWeight: overStock ? 700 : 400 }}>
                              {fmt(item.priceHtg)} HTG {!item.isService && `· ${t('hotel.reservationDetail.stockLabel')}: ${item.availableQty}`}
                            </p>
                          </div>
                          <input type="number" min="1" value={item.quantity} onChange={e => updateCartQty(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width:52, padding:'6px 8px', borderRadius:7, border:`1.5px solid ${D.border}`, textAlign:'center', fontSize:12, fontWeight:700 }}/>
                          <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:12, color:D.blue, width:64, textAlign:'right' }}>{fmt(item.priceHtg * item.quantity)}</span>
                          <button onClick={() => removeFromCart(item.productId)} style={{ width:24, height:24, borderRadius:6, border:'none', background:D.redDim, color:D.red, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <X size={11}/>
                          </button>
                        </div>
                      )
                    })}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:D.muted }}>{t('hotel.reservationDetail.cartTotal')}</span>
                      <span style={{ fontFamily:'monospace', fontWeight:900, color:D.text, fontSize:13 }}>{fmt(cartTotal)} HTG</span>
                    </div>
                  </div>
                )}

                {cartHasStockIssue && (
                  <p style={{ color:D.red, fontSize:11, fontWeight:700, margin:'0 0 8px' }}>⚠ {t('hotel.reservationDetail.cartStockIssue')}</p>
                )}
                <button onClick={() => addCartMut.mutate()} disabled={cart.length === 0 || addCartMut.isPending || cartHasStockIssue}
                  style={{ width:'100%', padding:'9px', borderRadius:9, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: (cart.length === 0 || cartHasStockIssue) ? 0.5 : 1 }}>
                  {addCartMut.isPending ? <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Plus size={14}/>} {t('hotel.reservationDetail.addServiceBtn')} {cart.length > 0 && `(${cart.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Check-in */}
      {showCheckinModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:D.white, borderRadius:20, padding:28, width:420, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color:D.text, fontSize:18, fontWeight:900, margin:'0 0 8px' }}>{t('hotel.reservationDetail.checkinModalTitle')}</h3>
            <p style={{ color:D.muted, fontSize:13, margin:'0 0 20px' }}>{t('hotel.reservationDetail.checkoutFinalTotal')} <strong style={{ color:D.text }}>{fmt(data.totalHtg)} HTG</strong></p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('hotel.reservationDetail.checkinAmountPlaceholder')}</label>
                <input type="number" placeholder="0" value={checkinForm.cashReceivedHtg} onChange={e => setCheckinForm(f => ({ ...f, cashReceivedHtg: e.target.value }))} style={inputStyle}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('hotel.reservationDetail.checkinMethodLabel')}</label>
                <select value={checkinForm.paymentMethod} onChange={e => setCheckinForm(f => ({ ...f, paymentMethod: e.target.value }))} style={{ ...inputStyle, cursor:'pointer' }}>
                  <option value="cash">{t('hotel.reservationDetail.methodCash')}</option>
                  <option value="card">{t('hotel.reservationDetail.methodCard')}</option>
                  <option value="moncash">{t('hotel.reservationDetail.methodMoncash')}</option>
                  <option value="transfer">{t('hotel.reservationDetail.methodTransfer')}</option>
                </select>
              </div>
            </div>
            {checkinReceived > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, padding:'8px 12px', borderRadius:8, background: checkinChange > 0 ? D.successBg : D.blueDim, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:D.muted }}>{t('hotel.reservationDetail.appliedToBalance')}</span>
                  <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:D.text }}>{fmt(checkinApplied)} HTG</span>
                </div>
                {checkinChange > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:D.success }}>{t('hotel.reservationDetail.changeDue')}</span>
                    <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:13, color:D.success }}>{fmt(checkinChange)} HTG</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:14, marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:800, color:D.text, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 10px' }}>{t('hotel.reservationDetail.checkinGuestSection')}</p>

              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:6 }}>{t('hotel.reservationDetail.checkinGuestIdPhoto')}</label>
                <label style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, border:`1.5px dashed ${D.border}`, cursor:'pointer', background:'#F8F9FF' }}>
                  {checkinForm.guestIdPhotoUrl
                    ? <img src={checkinForm.guestIdPhotoUrl} alt="" style={{ width:36, height:36, objectFit:'cover', borderRadius:6 }}/>
                    : <div style={{ width:36, height:36, borderRadius:6, background:D.blueDim, display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, fontSize:16 }}>📷</div>
                  }
                  <span style={{ fontSize:12, color:D.muted }}>{t('hotel.reservationDetail.checkinGuestIdPhotoHint')}</span>
                  <input type="file" accept="image/*" onChange={handleGuestPhoto} style={{ display:'none' }}/>
                </label>
              </div>

              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:6 }}>{t('hotel.reservationDetail.checkinGuestAddress')}</label>
                <input placeholder={t('hotel.reservationDetail.checkinGuestAddressPlaceholder')} value={checkinForm.guestAddress} onChange={e => setCheckinForm(f => ({ ...f, guestAddress: e.target.value }))} style={inputStyle}/>
              </div>

              <div>
                <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:6 }}>{t('hotel.reservationDetail.checkinGuestNif')}</label>
                <input placeholder={t('hotel.reservationDetail.checkinGuestNifPlaceholder')} value={checkinForm.guestNif} onChange={e => setCheckinForm(f => ({ ...f, guestNif: e.target.value }))} style={inputStyle}/>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowCheckinModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${D.border}`, background:'transparent', color:D.muted, fontWeight:700, cursor:'pointer' }}>
                {t('hotel.roomTypes.cancel')}
              </button>
              <button onClick={() => checkInMut.mutate({ paymentAmountHtg: checkinApplied, paymentMethod: checkinForm.paymentMethod, guestIdPhotoUrl: checkinForm.guestIdPhotoUrl, guestAddress: checkinForm.guestAddress, guestNif: checkinForm.guestNif })} disabled={checkInMut.isPending}
                style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${D.success},#10B981)`, color:'#fff', fontWeight:800, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {checkInMut.isPending ? <><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> {t('hotel.reservationDetail.checkinProcessing')}</> : t('hotel.reservationDetail.checkinConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

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

function InfoBlock({ label, value, fullWidth, onClick, clickHint }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <p style={{ fontSize:10, fontWeight:700, color:'#6B7AAB', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 3px' }}>{label}</p>
      {onClick ? (
        <button onClick={onClick} title={clickHint} style={{ fontSize:13, fontWeight:600, color:'#1B2A8F', margin:0, background:'none', border:'none', padding:0, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted', textAlign:'left' }}>
          {value || '—'}
        </button>
      ) : (
        <p style={{ fontSize:13, fontWeight:600, color:'#0F1A5C', margin:0 }}>{value || '—'}</p>
      )}
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
