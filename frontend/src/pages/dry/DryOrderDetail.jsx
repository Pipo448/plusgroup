// src/pages/dry/DryOrderDetail.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Printer, Plus, CheckCircle2, Clock, AlertCircle, Bluetooth, BluetoothOff } from 'lucide-react'
import { format } from 'date-fns'
import { usePrinterStore } from '../../stores/printerStore'
import { isSunmi } from '../../services/printerService'

const dryAPI = {
  getOne:       (id)       => api.get(`/dry/${id}`),
  updateStatus: (id, data) => api.patch(`/dry/${id}/status`, data),
  addPayment:   (id, data) => api.post(`/dry/${id}/payment`, data),
}

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB', red:'#C0392B', warning:'#D97706', orange:'#FF6B00',
  success:'#059669', shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const fmt  = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits:2 })
const fmtR = (n) => Number(n||0).toLocaleString('fr-HT', { minimumFractionDigits:2 }).replace(/\u00A0/g,' ').replace(/\u202F/g,' ')
const toDate = (d, f='dd/MM/yyyy') => { try { return format(new Date(d), f) } catch { return '' } }

// ── Resi enprimab HTML (tradui selon lang chwazi)
function DryReceipt({ order, tenant }) {
  const { t } = useTranslation()
  if (!order) return null

  const STATUS_MAP = {
    received:   { label:t('dry.status.received'),   color:'#1B2A8F' },
    processing: { label:t('dry.status.processing'), color:'#D97706' },
    ready:      { label:t('dry.status.ready'),       color:'#059669' },
    delivered:  { label:t('dry.status.delivered'),   color:'#6b7280' },
    cancelled:  { label:t('dry.status.cancelled'),   color:'#C0392B' },
  }
  const SERVICES_LABEL = {
    presaj:t('dry.services.presaj'), dry_clean:t('dry.services.dry_clean'), net_presaj:t('dry.services.net_presaj'),
    reparasyon:t('dry.services.reparasyon'), blanchi:t('dry.services.blanchi'),
  }
  const METOD_LABEL = {
    cash:t('dry.paymentMethods.cash'), moncash:t('dry.paymentMethods.moncash'), natcash:t('dry.paymentMethods.natcash'),
    card:t('dry.paymentMethods.card'), transfer:t('dry.paymentMethods.transfer'), check:t('dry.paymentMethods.check'),
  }

  const is57     = tenant?.receiptSize === '57mm'
  const s        = STATUS_MAP[order.status] || STATUS_MAP.received
  const lastPay  = order.payments?.[order.payments.length - 1]
  const given    = Number(lastPay?.amountGiven || 0)
  const change   = Number(lastPay?.change || 0)
  const balance  = Number(order.balanceDueHtg || 0)
  const paid     = Number(order.amountPaidHtg || 0)

  const wrap = {
    fontFamily:"'Courier New',Courier,monospace",
    width:is57?'57mm':'80mm', maxWidth:is57?'57mm':'80mm',
    margin:'0 auto', padding:is57?'3mm 2mm':'4mm 4mm',
    background:'#fff', color:'#111',
    fontSize:is57?'10px':'11px', lineHeight:'1.35',
  }

  const Row = ({l,v,bold,color,lg}) => (
    <div style={{display:'flex',justifyContent:'space-between',fontWeight:bold?'700':'400',color:color||'#111',fontSize:lg?(is57?'12px':'13px'):'inherit',marginBottom:'1px'}}>
      <span>{l}</span><span>{v}</span>
    </div>
  )
  const HR   = () => <div style={{borderTop:'1.5px solid #111',margin:'3px 0'}}/>
  const DASH = () => <div style={{borderTop:'1px dashed #888',margin:'3px 0'}}/>

  return (
    <div id="dry-printable-receipt" style={{display:'none',...wrap}}>

      {/* Antèt */}
      <div style={{textAlign:'center',marginBottom:'4px'}}>
        <div style={{fontWeight:'900',fontSize:is57?'14px':'17px',letterSpacing:'1px'}}>
          {tenant?.name || 'PLUS GROUP'}
        </div>
        {tenant?.address && <div style={{fontSize:'9px',color:'#555'}}>{tenant.address}</div>}
        {tenant?.phone   && <div style={{fontSize:'9px',color:'#555'}}>{t('dry.receipt.phone')} {tenant.phone}</div>}
      </div>

      <HR/>
      <div style={{textAlign:'center',fontWeight:'900',fontSize:is57?'13px':'16px',letterSpacing:'1px',margin:'3px 0'}}>
        {t('dry.receipt.title')}
      </div>

      {/* Nimewo lòd — gwo + fon nwa */}
      <div style={{textAlign:'center',fontWeight:'900',fontSize:is57?'18px':'22px',letterSpacing:'3px',margin:'4px 0 3px',background:'#111',color:'#fff',padding:'5px 0',borderRadius:'2px'}}>
        {order.orderNumber}
      </div>

      {/* Kalite Sèvis — Imedya oswa Randevou, mis an valè */}
      <div style={{textAlign:'center',fontWeight:'900',fontSize:is57?'12px':'14px',letterSpacing:'1px',margin:'2px 0 3px',
        color: order.serviceMode === 'imedya' ? '#B45300' : '#1B2A8F'}}>
        {order.serviceMode === 'imedya' ? `⚡ ${t('dry.serviceModeImmediate').toUpperCase()}` : `📅 ${t('dry.serviceModeAppointment').toUpperCase()}`}
      </div>
      <HR/>

      {/* Info kliyan */}
      <div style={{fontSize:'9px',marginBottom:'3px'}}>
        <Row l={t('dry.receipt.depositDate')}  v={toDate(order.depositDate,'dd/MM/yyyy')} />
        <Row l={t('dry.receipt.client')}    v={order.clientName} bold />
        {order.clientPhone && <Row l={t('dry.receipt.phone')} v={order.clientPhone} />}
        {!is57 && order.creator?.fullName && <Row l={t('dry.receipt.cashier')} v={order.creator.fullName} />}
      </div>

      {/* Dat pou tounen — mis an valè */}
      <DASH/>
      <div style={{textAlign:'center',margin:'4px 0',padding:'5px 4px',background:'rgba(0,0,0,0.05)',borderRadius:'3px'}}>
        <div style={{fontSize:'8px',color:'#555',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>
          {t('dry.receipt.pickupDateBox')}
        </div>
        <div style={{fontWeight:'900',fontSize:is57?'15px':'18px',letterSpacing:'1px',marginTop:'1px'}}>
          {toDate(order.pickupDate,'dd/MM/yyyy')}
        </div>
      </div>
      <DASH/>

      {/* Atik yo */}
      <div style={{marginBottom:'3px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 18px 48px 48px',fontWeight:'700',fontSize:'9px',borderBottom:'1px solid #111',paddingBottom:'2px',marginBottom:'2px',gap:'2px'}}>
          <span>{t('dry.receipt.item')}</span>
          <span style={{textAlign:'right'}}>{t('dry.receipt.qty')}</span>
          <span style={{textAlign:'right'}}>{t('dry.receipt.unitPrice')}</span>
          <span style={{textAlign:'right'}}>{t('dry.receipt.total')}</span>
        </div>
        {order.items?.map((item,i) => (
          <div key={i}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 18px 48px 48px',fontSize:'9px',borderBottom:'1px dotted #ccc',padding:'1px 0',gap:'2px',alignItems:'baseline'}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:'600'}}>
                {item.description}{item.color ? ` (${item.color})` : ''}
              </span>
              <span style={{textAlign:'right'}}>{item.quantity}</span>
              <span style={{textAlign:'right'}}>{fmtR(item.unitPriceHtg)}</span>
              <span style={{textAlign:'right',fontWeight:'700'}}>{fmtR(item.totalHtg)}</span>
            </div>
            <div style={{fontSize:'8px',color:'#666',paddingLeft:'2px',marginBottom:'1px'}}>
              → {SERVICES_LABEL[item.service]||item.service}
              {item.notes ? ` · ${item.notes}` : ''}
            </div>
          </div>
        ))}
      </div>

      <DASH/>

      {/* Total + peman */}
      <div style={{fontSize:'9px'}}>
        <Row l={t('dry.receipt.totalCaps')}             v={`${fmtR(order.totalHtg)} G`} bold lg />
        {given > 0 &&  <Row l={t('dry.receipt.amountGiven')}    v={`${fmtR(given)} G`} bold />}
        <Row l={t('dry.receipt.amountReceived')} v={`${fmtR(paid)} G`} bold />
        {change > 0 && <Row l={t('dry.receipt.change')}      v={`${fmtR(change)} G`} bold />}
        {lastPay?.method && <Row l={t('dry.receipt.method')} v={METOD_LABEL[lastPay.method]||lastPay.method} />}
        {balance > 0 && (
          <>
            <DASH/>
            <Row l={t('dry.receipt.balanceDue')} v={`-${fmtR(balance)} G`} bold color="#C0392B" lg />
          </>
        )}
      </div>

      <HR/>

      {/* Statut */}
      <div style={{textAlign:'center',fontWeight:'900',fontSize:is57?'13px':'15px',color:s.color,margin:'3px 0',letterSpacing:'1px'}}>
        {s.label.toUpperCase()}
      </div>
      <HR/>

      {/* Nòt */}
      {order.notes && (
        <div style={{fontSize:'8px',color:'#666',fontStyle:'italic',margin:'3px 0'}}>
          {t('dry.receipt.notes')} {order.notes}
        </div>
      )}

      {/* Pye */}
      <div style={{textAlign:'center',fontSize:'8px',color:'#444',lineHeight:'1.5',marginTop:'4px',borderTop:'1px dashed #bbb',paddingTop:'4px'}}>
        <div style={{fontWeight:'900',fontSize:is57?'11px':'12px',marginBottom:'2px'}}>
          {t('dry.receipt.keepReceipt')}
        </div>
        {/* ✅ Avètisman pèsonalize pa chak tenant (Paramèt → Enfòmasyon Antrepriz) */}
        {tenant?.receiptFooterNote && (
          <div style={{fontStyle:'italic',color:'#333',margin:'3px 0',padding:'3px',borderTop:'1px dashed #ccc',borderBottom:'1px dashed #ccc'}}>
            {tenant.receiptFooterNote}
          </div>
        )}
        <div style={{fontStyle:'italic',color:'#888',marginBottom:'2px'}}>
          {t('dry.receipt.poweredBy')}
        </div>
        <div style={{color:'#555'}}>+509 4244-9024</div>
      </div>

    </div>
  )
}

// ══════════════════════════════════════════════════════════════
export default function DryOrderDetail() {
  const { t } = useTranslation()
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { hasRole, tenant } = useAuthStore()
  const qc        = useQueryClient()

  const [showPayment, setShowPayment] = useState(false)
  const [printing,    setPrinting]    = useState(false)
  const [payData, setPayData] = useState({ amountHtg:'', method:'cash', reference:'', amountGiven:'', notes:'' })

  const { connected, connecting, connect, disconnect, printDry, printing: printingBT } = usePrinterStore()
  const onSunmi     = isSunmi()
  const btSupported = (() => { try { return !onSunmi && !!navigator.bluetooth } catch { return false } })()

  const STATUS_MAP = {
    received:   { label:t('dry.status.received'),   color:'#1B2A8F', bg:'rgba(27,42,143,0.10)', next:'processing', nextLabel:t('dry.nextStatus.processing') },
    processing: { label:t('dry.status.processing'), color:'#D97706', bg:'rgba(217,119,6,0.10)', next:'ready',      nextLabel:t('dry.nextStatus.ready')       },
    ready:      { label:t('dry.status.ready'),       color:'#059669', bg:'rgba(5,150,105,0.10)', next:'delivered',  nextLabel:t('dry.nextStatus.delivered')   },
    delivered:  { label:t('dry.status.delivered'),   color:'#6b7280', bg:'rgba(107,114,128,0.10)', next:null },
    cancelled:  { label:t('dry.status.cancelled'),   color:'#C0392B', bg:'rgba(192,57,43,0.08)', next:null },
  }
  const SERVICES_LABEL = {
    presaj:t('dry.services.presaj'), dry_clean:t('dry.services.dry_clean'), net_presaj:t('dry.services.net_presaj'),
    reparasyon:t('dry.services.reparasyon'), blanchi:t('dry.services.blanchi'),
  }
  const PAYMENT_METHODS = [
    { value:'cash', label:t('dry.paymentMethods.cash') }, { value:'moncash', label:t('dry.paymentMethods.moncash') },
    { value:'natcash', label:t('dry.paymentMethods.natcash') }, { value:'card', label:t('dry.paymentMethods.card') },
    { value:'transfer', label:t('dry.paymentMethods.transfer') }, { value:'check', label:t('dry.paymentMethods.check') },
  ]
  const METOD_LABEL = {
    cash:t('dry.paymentMethods.cash'), moncash:t('dry.paymentMethods.moncash'), natcash:t('dry.paymentMethods.natcash'),
    card:t('dry.paymentMethods.card'), transfer:t('dry.paymentMethods.transfer'), check:t('dry.paymentMethods.check'),
  }

  const { data: order, isLoading } = useQuery({
    queryKey: ['dry-order', id],
    queryFn:  () => dryAPI.getOne(id).then(r => r.data.order),
  })

  const statusMutation = useMutation({
    mutationFn: (data) => dryAPI.updateStatus(id, data),
    onSuccess:  () => { toast.success(t('dry.toastStatusUpdated')); qc.invalidateQueries(['dry-order', id]); qc.invalidateQueries(['dry-orders']) },
    onError:    (e) => toast.error(e.response?.data?.message || t('dry.toastStatusError'))
  })

  const payMutation = useMutation({
    mutationFn: (data) => dryAPI.addPayment(id, data),
    onSuccess:  () => {
      toast.success(t('dry.toastPaymentRecorded'))
      qc.invalidateQueries(['dry-order', id])
      setShowPayment(false)
      setPayData({ amountHtg:'', method:'cash', reference:'', amountGiven:'', notes:'' })
    },
    onError: (e) => toast.error(e.response?.data?.message || t('dry.toastPaymentError'))
  })

  const handlePrint = async () => {
    setPrinting(true)
    const tid = toast.loading(t('dry.printing'))
    try {
      const el = document.getElementById('dry-printable-receipt')
      if (!el) throw new Error(t('dry.toastReceiptUnavailable'))
      const size = tenant?.receiptSize || '80mm'
      const old = document.getElementById('_dry_print_css')
      if (old) old.remove()
      const style = document.createElement('style')
      style.id = '_dry_print_css'
      style.textContent = `@media print{@page{margin:0;size:${size} auto;}body>*:not(#_dry_root){display:none!important;}#_dry_root{display:block!important;}#dry-printable-receipt{display:block!important;}}`
      document.head.appendChild(style)
      let root = document.getElementById('_dry_root')
      if (!root) { root = document.createElement('div'); root.id = '_dry_root'; root.style.cssText = 'display:none;position:absolute;top:0;left:0;width:100%;background:#fff;'; document.body.appendChild(root) }
      root.innerHTML = el.outerHTML.replace('display:none','display:block').replace('display: none','display: block')
      await new Promise(r => setTimeout(r, 150))
      window.print()
      toast.success(t('dry.toastReceiptSent'), { id: tid })
    } catch (e) {
      toast.error(t('dry.toastPrintError', { msg: e.message }), { id: tid })
    } finally { setPrinting(false) }
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner"/></div>
  if (!order)    return null

  const s        = STATUS_MAP[order.status] || STATUS_MAP.received
  const balance  = Number(order.balanceDueHtg || 0)
  const amtNum   = Number(payData.amountHtg || 0)
  const monnen   = amtNum > balance && balance > 0 ? amtNum - balance : 0
  const isOverdue = new Date(order.pickupDate) < new Date() && !['delivered','cancelled'].includes(order.status)

  return (
    <div className="animate-fade-in max-w-4xl">
      <DryReceipt order={order} tenant={tenant} />

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @media print { @page{margin:0;} #root>*{display:none!important;} #_dry_root{display:block!important;} body,html{background:#fff!important;margin:0!important;padding:0!important;} }
      `}</style>

      {/* ── Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button onClick={() => navigate('/app/dry')} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h1 className="text-2xl font-display font-bold" style={{ margin:0 }}>{order.orderNumber}</h1>
              <span style={{ fontSize:11, fontWeight:800, padding:'3px 12px', borderRadius:99, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</span>
              <span style={{ fontSize:11, fontWeight:800, padding:'3px 12px', borderRadius:99,
                background: order.serviceMode === 'imedya' ? 'rgba(255,107,0,0.10)' : 'rgba(27,42,143,0.10)',
                color: order.serviceMode === 'imedya' ? D.orange : D.blue }}>
                {order.serviceMode === 'imedya' ? `⚡ ${t('dry.serviceModeImmediate')}` : `📅 ${t('dry.serviceModeAppointment')}`}
              </span>
              {isOverdue && (
                <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:99, background:'rgba(192,57,43,0.1)', color:'#C0392B', display:'flex', alignItems:'center', gap:4 }}>
                  <AlertCircle size={12}/> {t('dry.overdue')}
                </span>
              )}
            </div>
            <p style={{ fontSize:13, color:D.muted, margin:'2px 0 0' }}>
              {order.clientName}{order.clientPhone ? ` · ${order.clientPhone}` : ''}
            </p>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={handlePrint} disabled={printing} className="btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Printer size={14}/> {printing ? t('dry.printing') : t('dry.printReceipt')}
          </button>

          {btSupported && !connected && (
            <button onClick={() => { try { connect() } catch { toast.error('BT') } }} disabled={connecting} className="btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Bluetooth size={14}/> {connecting ? t('dry.connecting') : t('dry.connectBT')}
            </button>
          )}
          {btSupported && connected && (
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => printDry(order, tenant)} disabled={printingBT} className="btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(5,150,105,0.08)', color:'#059669', border:'1px solid rgba(5,150,105,0.3)' }}>
                <Printer size={14}/> {printingBT ? t('dry.printing') : t('dry.printBT')}
              </button>
              <button onClick={disconnect} style={{ width:30, height:30, borderRadius:8, background:'rgba(192,57,43,0.07)', border:'1px solid rgba(192,57,43,0.2)', color:'#C0392B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BluetoothOff size={13}/>
              </button>
            </div>
          )}

          {/* Bouton chanje statut */}
          {s.next && hasRole(['admin','cashier']) && (
            <button onClick={() => statusMutation.mutate({ status: s.next })} disabled={statusMutation.isPending}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', boxShadow:`0 4px 12px ${D.blue}40` }}>
              {statusMutation.isPending ? t('dry.creating') : `→ ${s.nextLabel}`}
            </button>
          )}

          {balance > 0 && order.status !== 'cancelled' && hasRole(['admin','cashier']) && (
            <button onClick={() => { setPayData(d => ({ ...d, amountHtg: String(balance) })); setShowPayment(true) }}
              className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Plus size={14}/> {t('dry.recordPayment')}
            </button>
          )}

          {!['delivered','cancelled'].includes(order.status) && hasRole('admin') && (
            <button onClick={() => { const r = prompt(t('dry.cancelReasonPrompt')); if (r !== null) statusMutation.mutate({ status:'cancelled', cancelReason: r }) }}
              className="btn-danger btn-sm">{t('dry.cancelOrder')}</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Dat yo */}
          <div className="card p-5">
            <h3 className="section-title">{t('dry.datesTitle')}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:10 }}>
                <p style={{ fontSize:11, color:D.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>{t('dry.depositDate')}</p>
                <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:16, color:D.text, margin:0 }}>{toDate(order.depositDate)}</p>
              </div>
              <div style={{ textAlign:'center', padding:'12px', background: isOverdue ? 'rgba(192,57,43,0.06)' : '#f0fdf4', borderRadius:10, border: isOverdue ? '1px solid rgba(192,57,43,0.2)' : 'none' }}>
                <p style={{ fontSize:11, color: isOverdue ? D.red : D.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>
                  {t('dry.pickupDate')} {isOverdue ? '⚠️' : '✓'}
                </p>
                <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color: isOverdue ? D.red : '#16a34a', margin:0 }}>
                  {toDate(order.pickupDate)}
                </p>
              </div>
            </div>
            {order.deliveredAt && (
              <div style={{ textAlign:'center', marginTop:10, padding:'8px', background:'#f0fdf4', borderRadius:8 }}>
                <p style={{ fontSize:11, color:'#16a34a', fontWeight:600, margin:0 }}>
                  {t('dry.deliveredOn', { date: toDate(order.deliveredAt, 'dd/MM/yyyy HH:mm') })}
                </p>
              </div>
            )}
          </div>

          {/* Atik yo */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">{t('dry.itemsCount', { count: order.items?.length || 0 })}</h3>
            </div>
            <table className="table">
              <thead>
                <tr><th>{t('dry.descriptionLabel').replace(' *','')}</th><th>{t('dry.serviceLabel')}</th><th>{t('dry.colColor')}</th><th className="text-center">{t('dry.colQty')}</th><th className="text-right">{t('dry.colUnitPrice')}</th><th className="text-right">{t('dry.colTotal')}</th></tr>
              </thead>
              <tbody>
                {order.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="font-medium">{item.description}</td>
                    <td><span className="badge-blue" style={{ fontSize:10 }}>{SERVICES_LABEL[item.service]||item.service}</span></td>
                    <td className="text-slate-500 text-sm">{item.color || '—'}</td>
                    <td className="text-center font-mono">{item.quantity}</td>
                    <td className="text-right font-mono">{fmt(item.unitPriceHtg)}</td>
                    <td className="text-right font-mono font-semibold">{fmt(item.totalHtg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Istwa peman */}
          {order.payments?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-display font-bold text-slate-800">{t('dry.paymentHistory', { count: order.payments.length })}</h3>
              </div>
              <table className="table">
                <thead><tr><th>{t('dry.colDate')}</th><th>{t('dry.colMethod')}</th><th>{t('dry.colNoteRef')}</th><th className="text-right">{t('dry.colAmountHtg')}</th></tr></thead>
                <tbody>
                  {order.payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs text-slate-500">{toDate(p.paymentDate)}</td>
                      <td><span className="badge-blue">{METOD_LABEL[p.method]||p.method}</span></td>
                      <td className="text-xs text-slate-400 font-mono">{p.notes || p.reference || '—'}</td>
                      <td className="text-right font-mono font-semibold text-emerald-600">{fmt(p.amountHtg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {order.notes && (
            <div className="card p-5">
              <h3 className="section-title">{t('dry.specialNotes')}</h3>
              <p className="text-slate-600 italic">{order.notes}</p>
            </div>
          )}
          {order.cancelReason && (
            <div style={{ padding:'12px 16px', background:'rgba(192,57,43,0.06)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:10 }}>
              <p style={{ fontSize:12, fontWeight:700, color:D.red, margin:'0 0 4px' }}>{t('dry.cancelReasonTitle')}</p>
              <p style={{ fontSize:13, color:'#7f1d1d', margin:0 }}>{order.cancelReason}</p>
            </div>
          )}
        </div>

        {/* Kolòn dwat */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-bold text-slate-800 mb-4">{t('dry.totals')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-bold text-base border-b border-slate-200 pb-2">
                <span>{t('dry.colTotal').toUpperCase()}</span>
                <span className="font-mono text-brand-700">{fmt(order.totalHtg)} HTG</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14}/> {t('dry.paid')}</span>
                <span className="font-mono font-semibold">{fmt(order.amountPaidHtg)} HTG</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-red-600">
                  <span className="flex items-center gap-1.5"><Clock size={14}/> {t('dry.balance')}</span>
                  <span className="font-mono font-bold">-{fmt(balance)} HTG</span>
                </div>
              )}
            </div>
            {Number(order.totalHtg) > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width:`${Math.min(100,(Number(order.amountPaidHtg)/Number(order.totalHtg))*100)}%` }}/>
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {t('dry.percentPaid', { pct: ((Number(order.amountPaidHtg)/Number(order.totalHtg))*100).toFixed(0) })}
                </p>
              </div>
            )}
            <button onClick={handlePrint} disabled={printing} className="btn-primary w-full mt-4" style={{ justifyContent:'center', display:'flex', alignItems:'center', gap:6 }}>
              <Printer size={15}/> {printing ? t('dry.printing') : t('dry.printReceipt')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Peman */}
      {showPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div className="modal max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-display font-bold">{t('dry.payModalTitle')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{order.orderNumber} · {order.clientName}</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600 p-1 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div style={{ background:'linear-gradient(135deg,#fef2f2,#fff5f5)', borderRadius:12, padding:'12px 16px', border:'1px solid #fecaca' }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>{t('dry.orderTotal')}</span>
                  <span style={{ fontFamily:'monospace', fontWeight:700 }}>{fmt(order.totalHtg)} HTG</span>
                </div>
                <div style={{ borderTop:'1px solid #fecaca', marginTop:8, paddingTop:8 }} className="flex justify-between items-center">
                  <span style={{ fontSize:13, color:'#dc2626', fontWeight:700 }}>{t('dry.balanceRemaining')}</span>
                  <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:800, color:'#dc2626' }}>-{fmt(balance)} HTG</span>
                </div>
              </div>

              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <label className="label mb-0">{t('dry.amountGivenLabel')}</label>
                  {amtNum !== balance && balance > 0 && (
                    <button type="button" onClick={() => setPayData(d => ({ ...d, amountHtg: String(balance) }))}
                      style={{ fontSize:10, color:'#2563eb', fontWeight:700, background:'#eff6ff', border:'none', cursor:'pointer', padding:'2px 8px', borderRadius:4 }}>
                      {t('dry.fillAll')}
                    </button>
                  )}
                </div>
                <input type="number" step="0.01" min="0.01" className="input" value={payData.amountHtg}
                  onFocus={e => e.target.select()}
                  onChange={e => setPayData(d => ({ ...d, amountHtg: e.target.value }))}
                  style={{ fontSize:22, fontWeight:800, textAlign:'center' }}/>
                {amtNum > 0 && amtNum < balance && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#d97706', fontWeight:700 }}>{t('dry.partialPayment')}</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#d97706' }}>{t('dry.remainingAfter', { amount: fmt(balance - amtNum) + ' HTG' })}</span>
                  </div>
                )}
                {monnen > 0 && (
                  <div style={{ marginTop:8, borderRadius:12, overflow:'hidden', border:'2px solid #16a34a' }}>
                    <div style={{ background:'#16a34a', padding:'8px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', textTransform:'uppercase' }}>{t('dry.changeDue')}</span>
                    </div>
                    <div style={{ background:'#f0fdf4', padding:'14px', textAlign:'center' }}>
                      <p style={{ fontFamily:'monospace', fontSize:36, fontWeight:900, color:'#15803d', margin:0 }}>
                        {fmt(monnen)} HTG
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label">{t('dry.paymentMethodLabel')}</label>
                <select className="input" value={payData.method} onChange={e => setPayData(d => ({ ...d, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">{t('dry.referenceLabel')}</label>
                <input className="input" placeholder={t('dry.referencePlaceholder')} value={payData.reference}
                  onChange={e => setPayData(d => ({ ...d, reference: e.target.value }))}/>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary" disabled={payMutation.isPending}>{t('dry.cancel')}</button>
                <button type="button" disabled={payMutation.isPending || amtNum <= 0} className="btn-primary" style={{ minWidth:160 }}
                  onClick={() => {
                    if (!amtNum || amtNum <= 0) return toast.error(t('dry.toastItemRequired'))
                    const amtToRecord = monnen > 0 ? balance : amtNum
                    payMutation.mutate({ ...payData, amountHtg: amtToRecord, amountGiven: amtNum, change: monnen })
                  }}>
                  {payMutation.isPending
                    ? <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/> {t('dry.recording')}</span>
                    : t('dry.confirmPayment', { amount: fmt(monnen > 0 ? balance : amtNum) })
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
