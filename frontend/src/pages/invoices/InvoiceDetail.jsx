// src/pages/invoices/InvoiceDetail.jsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { invoiceAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { usePrinter } from '../../hooks/usePrinter'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, XCircle, CheckCircle2, Clock, Printer, Download, ChevronDown, Bluetooth, BluetoothOff } from 'lucide-react'
import { format } from 'date-fns'

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

const PAYMENT_METHODS = [
  { value:'cash',     label:'Kach'      },
  { value:'moncash',  label:'MonCash'   },
  { value:'natcash',  label:'NatCash'   },
  { value:'card',     label:'Kat Kredi' },
  { value:'transfer', label:'Virement'  },
  { value:'check',    label:'Chèk'      },
]

const PDF_SIZES = [
  { value: '80mm', label: '80mm', desc: 'Enprimant nòmal (80×80)' },
  { value: '57mm', label: '57mm', desc: 'Ti enprimant (57×40)'    },
]

export default function InvoiceDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { hasRole, tenant } = useAuthStore()
  const qc          = useQueryClient()
  const pdfMenuRef  = useRef(null)

  const [showPayment, setShowPayment] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [payData, setPayData] = useState({ amountHtg: '', method: 'cash', reference: '' })

  // ── Bluetooth Printer
  const { connected, connecting, printing, connect, disconnect, print } = usePrinter()
  const hasBluetooth = typeof navigator !== 'undefined' && !!navigator.bluetooth

  useEffect(() => {
    const handler = (e) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target))
        setShowPdfMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn:  () => invoiceAPI.getOne(id).then(r => r.data.invoice)
  })

  const paymentMutation = useMutation({
    mutationFn: (data) => invoiceAPI.addPayment(id, data),
    onSuccess: () => {
      toast.success(`Peman anrejistre!`)
      qc.invalidateQueries(['invoice', id])
      setShowPayment(false)
      setPayData({ amountHtg: '', method: 'cash', reference: '' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan peman.')
  })

  const cancelMutation = useMutation({
    mutationFn: (reason) => invoiceAPI.cancel(id, { reason }),
    onSuccess: () => { toast.success('Facture anile.'); qc.invalidateQueries(['invoice', id]) }
  })

  const openPaymentModal = () => {
    const bal = Number(invoice?.balanceDueHtg || 0)
    setPayData({ amountHtg: bal > 0 ? String(bal) : '', method: 'cash', reference: '' })
    setShowPayment(true)
  }

  const downloadPdf = async (size) => {
    setShowPdfMenu(false)
    const toastId = toast.loading(`Ap prepare PDF ${size}...`)
    try {
      const res = await invoiceAPI.downloadPDF(invoice.id, size)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `facture-${invoice.invoiceNumber}-${size}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`PDF ${size} telechaje!`, { id: toastId })
    } catch {
      toast.error('Erè pandan telechajman PDF.', { id: toastId })
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>
  if (!invoice)  return null

  const snap        = invoice.clientSnapshot || {}
  const isPaid      = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const balance     = Number(invoice.balanceDueHtg || 0)
  const amtNum      = Number(payData.amountHtg || 0)
  const monnen      = amtNum > balance && balance > 0 ? amtNum - balance : 0  // ✅ Monnen pou remet

  return (
    <div className="animate-fade-in max-w-4xl">

      {/* ── Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold">{invoice.invoiceNumber}</h1>
              <span className={`badge ${isPaid ? 'badge-green' : isCancelled ? 'badge-gray' : invoice.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
                {isPaid ? '✓ Peye' : isCancelled ? 'Anile' : invoice.status === 'partial' ? 'Pasyal' : 'Impaye'}
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Soti devis:{' '}
              <Link to={`/quotes/${invoice.quoteId}`} className="text-brand-600 hover:underline">
                {invoice.quote?.quoteNumber}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">

          {/* ── Bouton Bluetooth Printer */}
          {hasBluetooth && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {!connected ? (
                <button onClick={connect} disabled={connecting} className="btn-secondary btn-sm"
                  style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Bluetooth size={14} />
                  {connecting ? 'Ap konekte...' : 'Konekte Printer'}
                </button>
              ) : (
                <>
                  <button onClick={() => print(invoice, tenant)} disabled={printing}
                    className="btn-secondary btn-sm"
                    style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(5,150,105,0.08)', color:'#059669', borderColor:'rgba(5,150,105,0.3)' }}>
                    <Printer size={14} />
                    {printing ? 'Ap enprime...' : 'Enprime Resi'}
                  </button>
                  <button onClick={disconnect} title="Dekonekte printer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'rgba(192,57,43,0.07)', border:'1px solid rgba(192,57,43,0.2)', color:'#C0392B', cursor:'pointer' }}>
                    <BluetoothOff size={13}/>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Bouton PDF */}
          <div className="relative" ref={pdfMenuRef}>
            <button onClick={() => setShowPdfMenu(v => !v)} className="btn-secondary btn-sm"
              style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Download size={14} />
              Resi PDF
              <ChevronDown size={12} style={{ transition:'transform 0.2s', transform: showPdfMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {showPdfMenu && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:50, background:'#fff', borderRadius:12, minWidth:210, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <div style={{ padding:'8px 14px 5px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Fòma enprimant
                </div>
                {PDF_SIZES.map((s, i) => (
                  <button key={s.value} onClick={() => downloadPdf(s.value)}
                    style={{ width:'100%', textAlign:'left', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', borderBottom: i < PDF_SIZES.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', fontFamily:'DM Sans,sans-serif' }}>🖨 {s.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isCancelled && !isPaid && hasRole(['admin','cashier']) && (
            <button onClick={openPaymentModal} className="btn-primary">
              <Plus size={16} /> Anrejistre Peman
            </button>
          )}
          {!isCancelled && hasRole('admin') && (
            <button onClick={() => {
              const reason = prompt('Rezon anilasyon:')
              if (reason !== null) cancelMutation.mutate(reason)
            }} className="btn-danger btn-sm">
              <XCircle size={14} /> Anile
            </button>
          )}
        </div>
      </div>

      {/* ── Bandwòl Bluetooth statut */}
      {connected && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'rgba(5,150,105,0.07)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:10, marginBottom:16, fontSize:12, color:'#059669', fontWeight:600 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#059669', animation:'pulse-dot 1.5s infinite' }}/>
          Goojprt PT-210 konekte via Bluetooth — Klike "Enprime Resi" pou voye resi bay printer a
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Kliyan */}
          <div className="card p-5">
            <h3 className="section-title">Kliyan</h3>
            {snap.name
              ? <div>
                  <p className="font-semibold text-slate-800">{snap.name}</p>
                  {snap.phone && <p className="text-sm text-slate-500">{snap.phone}</p>}
                  {snap.email && <p className="text-sm text-slate-500">{snap.email}</p>}
                  {snap.nif   && <p className="text-xs text-slate-400">NIF: {snap.nif}</p>}
                </div>
              : <p className="text-slate-400 italic">San kliyan</p>
            }
          </div>

          {/* Atik yo */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">Atik yo</h3>
            </div>
            <table className="table">
              <thead>
                <tr><th>Pwodui</th><th className="text-center">Qte</th><th className="text-right">Pri U.</th><th className="text-center">Rem.</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{item.product?.name || item.productSnapshot?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{item.product?.code || item.productSnapshot?.code}</p>
                    </td>
                    <td className="text-center font-mono">{Number(item.quantity)}</td>
                    <td className="text-right font-mono">{fmt(item.unitPriceHtg)}</td>
                    <td className="text-center text-slate-500">{Number(item.discountPct) > 0 ? `${item.discountPct}%` : '—'}</td>
                    <td className="text-right font-mono font-semibold">{fmt(item.totalHtg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Istwa Peman */}
          {invoice.payments?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-display font-bold text-slate-800">Istwa Peman ({invoice.payments.length})</h3>
              </div>
              <table className="table">
                <thead><tr><th>Dat</th><th>Metòd</th><th>Referans</th><th className="text-right">Montan HTG</th></tr></thead>
                <tbody>
                  {invoice.payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs text-slate-500">{format(new Date(p.paymentDate), 'dd/MM/yyyy')}</td>
                      <td><span className="badge-blue">{PAYMENT_METHODS.find(m=>m.value===p.method)?.label || p.method}</span></td>
                      <td className="text-xs text-slate-400 font-mono">{p.reference || '—'}</td>
                      <td className="text-right font-mono font-semibold text-emerald-600">{fmt(p.amountHtg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Kolòn dwat */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-bold text-slate-800 mb-4">Totaux</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span className="font-mono">{fmt(invoice.subtotalHtg)}</span></div>
              {Number(invoice.discountHtg) > 0 && <div className="flex justify-between text-red-600"><span>Remiz</span><span className="font-mono">-{fmt(invoice.discountHtg)}</span></div>}
              {Number(invoice.taxHtg) > 0 && <div className="flex justify-between"><span>TVA</span><span className="font-mono">{fmt(invoice.taxHtg)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
                <span>TOTAL</span><span className="font-mono text-brand-700">{fmt(invoice.totalHtg)} HTG</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Peye</span>
                <span className="font-mono font-semibold">{fmt(invoice.amountPaidHtg)} HTG</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-red-600">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> Balans</span>
                  <span className="font-mono font-bold">{fmt(balance)} HTG</span>
                </div>
              )}
            </div>
            {!isCancelled && Number(invoice.totalHtg) > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (Number(invoice.amountPaidHtg)/Number(invoice.totalHtg))*100)}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {((Number(invoice.amountPaidHtg)/Number(invoice.totalHtg))*100).toFixed(0)}% peye
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between"><span>Dat:</span><span>{format(new Date(invoice.issueDate), 'dd/MM/yyyy')}</span></div>
              <div className="flex justify-between"><span>Taux:</span><span className="font-mono">1 USD = {Number(invoice.exchangeRate||132).toFixed(2)} HTG</span></div>
            </div>

            {connected && (
              <button onClick={() => print(invoice, tenant)} disabled={printing}
                className="btn-primary w-full mt-4" style={{ justifyContent:'center' }}>
                <Printer size={15}/>
                {printing ? 'Ap enprime...' : 'Enprime Resi Bluetooth'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Peman */}
      {showPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div className="modal max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-display font-bold">Anrejistre Peman</h2>
                <p className="text-xs text-slate-400 mt-0.5">{invoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600 p-1 text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4">

              {/* Rezime balans */}
              <div style={{ background:'linear-gradient(135deg,#fef2f2,#fff5f5)', borderRadius:12, padding:'12px 16px', border:'1px solid #fecaca' }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>Total Fakti:</span>
                  <span style={{ fontFamily:'monospace', fontWeight:700, color:'#374151' }}>{fmt(invoice.totalHtg)} HTG</span>
                </div>
                {Number(invoice.amountPaidHtg) > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span style={{ fontSize:12, color:'#6b7280' }}>Deja peye:</span>
                    <span style={{ fontFamily:'monospace', color:'#16a34a', fontWeight:600 }}>-{fmt(invoice.amountPaidHtg)} HTG</span>
                  </div>
                )}
                <div style={{ borderTop:'1px solid #fecaca', marginTop:8, paddingTop:8 }} className="flex justify-between items-center">
                  <span style={{ fontSize:13, color:'#dc2626', fontWeight:700 }}>Balans ki rete:</span>
                  <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:800, color:'#dc2626' }}>{fmt(balance)} HTG</span>
                </div>
              </div>

              {/* ✅ Input montan — gwo ak onFocus select */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <label className="label mb-0">Montan kliyan bay (HTG) *</label>
                  {amtNum !== balance && balance > 0 && (
                    <button type="button"
                      onClick={() => setPayData(d => ({ ...d, amountHtg: String(balance) }))}
                      style={{ fontSize:10, color:'#2563eb', fontWeight:700, background:'#eff6ff', border:'none', cursor:'pointer', padding:'2px 8px', borderRadius:4 }}>
                      Ranpli tout ↑
                    </button>
                  )}
                </div>
                <input type="number" step="0.01" min="0.01" className="input"
                  value={payData.amountHtg}
                  onFocus={e => e.target.select()}
                  onChange={e => setPayData(d => ({ ...d, amountHtg: e.target.value }))}
                  style={{ fontSize:22, fontWeight:800, textAlign:'center' }}
                />

                {/* Eta 1: Peman pasyal */}
                {amtNum > 0 && amtNum < balance && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#d97706', fontWeight:700 }}>⚠ Peman pasyal</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#d97706' }}>{fmt(balance - amtNum)} HTG ap rete</span>
                  </div>
                )}

                {/* Eta 2: Peman egzak */}
                {amtNum === balance && amtNum > 0 && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#16a34a', fontWeight:700 }}>✓ Peman egzak</span>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#16a34a' }}>Pa gen monnen</span>
                  </div>
                )}

                {/* ✅ Eta 3: Kalkikatè monnen */}
                {monnen > 0 && (
                  <div style={{ marginTop:8, borderRadius:12, overflow:'hidden', border:'2px solid #16a34a' }}>
                    <div style={{ background:'#16a34a', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        💵 Monnen pou remet
                      </span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontFamily:'monospace' }}>
                        {fmt(amtNum)} − {fmt(balance)}
                      </span>
                    </div>
                    <div style={{ background:'#f0fdf4', padding:'14px', textAlign:'center' }}>
                      <p style={{ fontFamily:'monospace', fontSize:36, fontWeight:900, color:'#15803d', margin:0 }}>
                        {fmt(monnen)} <span style={{ fontSize:18, color:'#16a34a' }}>HTG</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Metòd */}
              <div>
                <label className="label">Metòd peman</label>
                <select className="input" value={payData.method} onChange={e => setPayData(d => ({ ...d, method: e.target.value }))}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Referans */}
              <div>
                <label className="label">Referans (opsyonèl)</label>
                <input className="input" placeholder="ex: MCash #12345"
                  value={payData.reference}
                  onChange={e => setPayData(d => ({ ...d, reference: e.target.value }))} />
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary" disabled={paymentMutation.isPending}>
                  Anile
                </button>
                <button type="button"
                  onClick={() => {
                    if (!amtNum || amtNum <= 0) return toast.error('Montan dwe plis ke 0.')
                    // ✅ Si kliyan bay plis, anrejistre sèlman balans la — pa lajan total li te bay
                    const amtToRecord = monnen > 0 ? balance : amtNum
                    paymentMutation.mutate({ ...payData, amountHtg: amtToRecord })
                  }}
                  disabled={paymentMutation.isPending || amtNum <= 0}
                  className="btn-primary"
                  style={{ minWidth:160 }}
                >
                  {paymentMutation.isPending
                    ? <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                        Ap anrejistre...
                      </span>
                    : monnen > 0
                      ? `✓ Konfime ${fmt(balance)} HTG`
                      : `✓ Konfime ${fmt(amtNum)} HTG`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
