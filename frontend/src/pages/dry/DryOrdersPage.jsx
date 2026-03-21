// src/pages/dry/DryOrdersPage.jsx
import { useState, useMemo, useCallback, memo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Scissors, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

// ── API helpers
const dryAPI = {
  getAll:  (params) => api.get('/dry', { params }),
  create:  (data)   => api.post('/dry', data),
}

// ── Konstan
const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB', white:'#FFFFFF', bg:'#F4F6FF',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  warning:'#D97706', warningBg:'rgba(217,119,6,0.10)',
  red:'#C0392B', redDim:'rgba(192,57,43,0.08)',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const STATUS_MAP = {
  received:   { label:'Resevwa',  color:'#1B2A8F', bg:'rgba(27,42,143,0.10)'  },
  processing: { label:'Ap Travay',color:'#D97706', bg:'rgba(217,119,6,0.10)'  },
  ready:      { label:'Pare',     color:'#059669', bg:'rgba(5,150,105,0.10)'   },
  delivered:  { label:'Remèt',    color:'#6b7280', bg:'rgba(107,114,128,0.10)' },
  cancelled:  { label:'Anile',    color:'#C0392B', bg:'rgba(192,57,43,0.08)'   },
}

const SERVICES = [
  { value:'presaj',    label:'Presaj'           },
  { value:'dry_clean', label:'Netwayaj Sèk'     },
  { value:'net_presaj',label:'Netwayaj + Presaj' },
  { value:'reparasyon',label:'Reparasyon'        },
  { value:'blanchi',   label:'Blanchiman'        },
]

const PAYMENT_METHODS = [
  { value:'cash',     label:'Kach'      },
  { value:'moncash',  label:'MonCash'   },
  { value:'natcash',  label:'NatCash'   },
  { value:'card',     label:'Kat Kredi' },
  { value:'transfer', label:'Virement'  },
]

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

function useDebounce(v, d = 400) {
  const [dv, setDv] = useState(v)
  useState(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t) })
  return dv
}

// ── Fòmilè atik vid
const emptyItem = () => ({
  _id: Math.random().toString(36).slice(2),
  service: 'presaj', description: '', color: '', quantity: 1, unitPriceHtg: '', notes: ''
})

// ══════════════════════════════════════════════════════════════
export default function DryOrdersPage() {
  const { hasRole } = useAuthStore()
  const qc = useQueryClient()

  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('')
  const [page, setPage]           = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  // ── Fòmilè nouvo lòd
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', pickupDate: '',
    depositAmount: '', paymentMethod: 'cash',
    amountGiven: '', notes: '',
    items: [emptyItem()],
  })

  const debouncedSearch = useDebounce(search, 400)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['dry-orders', debouncedSearch, status, page],
    queryFn:  () => dryAPI.getAll({ search: debouncedSearch, status, page, limit: 15 })
      .then(r => r.data),
    keepPreviousData: true,
    staleTime: 15000,
  })

  const data = raw || { orders: [], total: 0, pages: 1 }

  // ── Kalkil total + monnen
  const total = useMemo(() =>
    form.items.reduce((s, it) => s + Number(it.unitPriceHtg || 0) * Number(it.quantity || 1), 0),
    [form.items]
  )
  const deposit = Math.min(Number(form.depositAmount || 0), total)
  const balance = total - deposit
  const given   = Number(form.amountGiven || 0)
  const change  = given > deposit && deposit > 0 ? given - deposit : 0

  const createMutation = useMutation({
    mutationFn: (d) => dryAPI.create(d),
    onSuccess: () => {
      toast.success('Lòd prese kreye!')
      qc.invalidateQueries(['dry-orders'])
      setShowCreate(false)
      setForm({ clientName:'', clientPhone:'', pickupDate:'', depositAmount:'', paymentMethod:'cash', amountGiven:'', notes:'', items:[emptyItem()] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Ere pandan kreye lòd.')
  })

  const handleSubmit = () => {
    if (!form.clientName.trim()) return toast.error('Non kliyan obligatwa.')
    if (!form.pickupDate)        return toast.error('Dat pou tounen obligatwa.')
    if (!form.items.some(it => it.description.trim())) return toast.error('Omwen yon rad obligatwa.')
    createMutation.mutate({
      ...form,
      depositAmount: deposit,
      amountGiven:   given > 0 ? given : deposit,
      change,
      items: form.items
        .filter(it => it.description.trim())
        .map(({ _id, ...rest }) => rest),
    })
  }

  const setItem = useCallback((id, field, val) => {
    setForm(f => ({ ...f, items: f.items.map(it => it._id === id ? { ...it, [field]: val } : it) }))
  }, [])

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  const removeItem = (id) => setForm(f => ({ ...f, items: f.items.filter(it => it._id !== id) }))

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate  = tomorrow.new Date(new Date().getTime() - 5*60*60*1000).toISOString().split('T')[0]

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* ── Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
            <Scissors size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>Prese</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{data.total} lòd total</p>
          </div>
        </div>
        {hasRole(['admin','cashier']) && (
          <button onClick={() => setShowCreate(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:14, border:'none', cursor:'pointer', boxShadow:`0 4px 16px ${D.orange}45` }}>
            <Plus size={16}/> Nouvo Lòd
          </button>
        )}
      </div>

      {/* ── Filtre */}
      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input placeholder="Chèche pa nimewo, non, telefon..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ width:'100%', padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box' }}
          />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { v:'', l:'Tout' },
            { v:'received',   l:'Resevwa'   },
            { v:'processing', l:'Ap Travay' },
            { v:'ready',      l:'Pare'      },
            { v:'delivered',  l:'Remèt'     },
            { v:'cancelled',  l:'Anile'     },
          ].map(opt => (
            <button key={opt.v} onClick={() => { setStatus(opt.v); setPage(1) }}
              style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                background: status === opt.v ? D.blue : '#F4F6FF',
                color:      status === opt.v ? '#fff'  : D.muted,
                border:    `1.5px solid ${status === opt.v ? D.blue : D.border}`,
                boxShadow:  status === opt.v ? `0 3px 10px ${D.blue}35` : 'none',
              }}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tablo */}
      <div style={{ background:D.white, borderRadius:16, border:`1px solid ${D.border}`, boxShadow:D.shadow, overflow:'hidden' }}>
        {/* Entèt */}
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 1fr 1fr 1fr 90px 50px', padding:'11px 20px', background:D.bg, borderBottom:`1px solid ${D.border}` }}>
          {['Nimewo','Kliyan','Depoze','Pou Tounen','Total','Statut',''].map((h,i) => (
            <span key={i} style={{ color:D.blue, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>

        {isLoading
          ? Array(5).fill(0).map((_,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 1fr 1fr 1fr 90px 50px', padding:'14px 20px', borderBottom:`1px solid ${D.border}`, gap:8 }}>
                {Array(7).fill(0).map((_,j) => <div key={j} style={{ height:14, background:'#EEF0FF', borderRadius:6, animation:'pulse 1.5s infinite' }}/>)}
              </div>
            ))
          : !data.orders.length
          ? (
              <div style={{ padding:'60px 20px', textAlign:'center' }}>
                <Scissors size={40} color={D.blue} style={{ marginBottom:12, opacity:0.4 }}/>
                <p style={{ color:D.muted, fontSize:15, fontWeight:600 }}>Pa gen lòd pou kounye a</p>
                <button onClick={() => setShowCreate(true)}
                  style={{ marginTop:16, display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer' }}>
                  <Plus size={14}/> Kreye premye lòd
                </button>
              </div>
            )
          : data.orders.map((ord, idx) => {
              const s = STATUS_MAP[ord.status] || STATUS_MAP.received
              return (
                <div key={ord.id} className="dry-row"
                  style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 1fr 1fr 1fr 90px 50px', padding:'13px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background: idx%2===0 ? '#fff' : 'rgba(244,246,255,0.4)' }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:12 }}>{ord.orderNumber}</span>
                  <div>
                    <p style={{ fontWeight:700, color:D.text, fontSize:13, margin:0 }}>{ord.clientName}</p>
                    {ord.clientPhone && <p style={{ fontSize:11, color:D.muted, margin:0, fontFamily:'monospace' }}>{ord.clientPhone}</p>}
                  </div>
                  <span style={{ fontSize:11, color:D.muted, textAlign:'center', fontFamily:'monospace' }}>
                    {format(new Date(ord.depositDate), 'dd/MM/yy')}
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, textAlign:'center', fontFamily:'monospace',
                    color: new Date(ord.pickupDate) < new Date() && ord.status !== 'delivered' ? D.red : D.text }}>
                    {format(new Date(ord.pickupDate), 'dd/MM/yy')}
                  </span>
                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text, fontSize:12 }}>{fmt(ord.totalHtg)}</span>
                    {Number(ord.balanceDueHtg) > 0 && (
                      <div style={{ fontSize:10, color:D.red, fontFamily:'monospace' }}>-{fmt(ord.balanceDueHtg)} balans</div>
                    )}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{s.label}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <Link to={`/app/dry/${ord.id}`}
                      style={{ width:30, height:30, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'rgba(27,42,143,0.07)', color:D.blue, textDecoration:'none' }}>
                      <Eye size={13}/>
                    </Link>
                  </div>
                </div>
              )
            })
        }
      </div>

      {/* ── Paginasyon */}
      {data.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
          <p style={{ color:D.muted, fontSize:13 }}>Paj <strong style={{ color:D.text }}>{page}</strong> / {data.pages} · <strong style={{ color:D.text }}>{data.total}</strong> lòd</p>
          <div style={{ display:'flex', gap:6 }}>
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)}
              style={{ width:36, height:36, borderRadius:10, cursor:page<=1?'not-allowed':'pointer', background:page<=1?'#F4F6FF':D.blue, border:`1px solid ${page<=1?D.border:D.blue}`, color:page<=1?D.muted:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={16}/>
            </button>
            <button disabled={page>=data.pages} onClick={() => setPage(p=>p+1)}
              style={{ width:36, height:36, borderRadius:10, cursor:page>=data.pages?'not-allowed':'pointer', background:page>=data.pages?'#F4F6FF':D.blue, border:`1px solid ${page>=data.pages?D.border:D.blue}`, color:page>=data.pages?D.muted:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL NOUVO LÒD ══ */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'20px 16px' }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:680, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Antèt modal */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Scissors size={18} color="#fff"/>
                </div>
                <div>
                  <h2 style={{ fontWeight:900, fontSize:18, color:D.text, margin:0 }}>Nouvo Lòd Prese</h2>
                  <p style={{ fontSize:12, color:D.muted, margin:0 }}>Antre enfòmasyon kliyan ak rad yo</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ border:'none', background:'#f1f5f9', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ padding:'24px' }}>

              {/* Seksyon kliyan */}
              <div style={{ marginBottom:20 }}>
                <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Enfòmasyon Kliyan</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>Non Kliyan *</label>
                    <input className="input" value={form.clientName}
                      onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                      placeholder="ex: Marie Jeanne" style={{ width:'100%', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>Telefon</label>
                    <input className="input" value={form.clientPhone}
                      onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                      placeholder="509-XXXX-XXXX" style={{ width:'100%', boxSizing:'border-box' }}/>
                  </div>
                </div>
              </div>

              {/* Dat pou tounen */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>📅 Dat Pou Tounen Pran Rad *</label>
                <input type="date" className="input" value={form.pickupDate} min={minDate}
                  onChange={e => setForm(f => ({ ...f, pickupDate: e.target.value }))}
                  style={{ width:'100%', boxSizing:'border-box' }}/>
              </div>

              {/* Atik yo */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Rad / Atik yo</p>
                  <button onClick={addItem}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:`rgba(27,42,143,0.07)`, border:`1px solid ${D.border}`, color:D.blue, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <Plus size={12}/> Ajoute Rad
                  </button>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {form.items.map((item, idx) => (
                    <div key={item._id} style={{ background:'#f8fafc', borderRadius:12, padding:'14px', border:'1px solid #e2e8f0' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:10, marginBottom:10 }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>Deskripsyon *</label>
                          <input className="input" value={item.description}
                            onChange={e => setItem(item._id, 'description', e.target.value)}
                            placeholder="ex: Chemiz, Pantalon, Kostim..."
                            style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>Sèvis</label>
                          <select className="input" value={item.service} onChange={e => setItem(item._id, 'service', e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}>
                            {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 120px auto', gap:10, alignItems:'flex-end' }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>Koulè</label>
                          <input className="input" value={item.color}
                            onChange={e => setItem(item._id, 'color', e.target.value)}
                            placeholder="Blan, Nwa, Bleu..." style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>Kantite</label>
                          <input type="number" min="1" className="input" value={item.quantity}
                            onFocus={e => e.target.select()}
                            onChange={e => setItem(item._id, 'quantity', e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', textAlign:'center', fontSize:13 }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>Pri Unitè (HTG)</label>
                          <input type="number" min="0" className="input" value={item.unitPriceHtg}
                            onFocus={e => e.target.select()}
                            onChange={e => setItem(item._id, 'unitPriceHtg', e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', textAlign:'right', fontSize:13 }}/>
                        </div>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(item._id)}
                            style={{ width:34, height:34, borderRadius:8, border:'1px solid rgba(192,57,43,0.2)', background:'rgba(192,57,43,0.07)', color:'#C0392B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                      {/* Total liy */}
                      {Number(item.unitPriceHtg) > 0 && (
                        <div style={{ textAlign:'right', marginTop:6, fontSize:12, fontWeight:700, color:D.blue }}>
                          = {fmt(Number(item.unitPriceHtg || 0) * Number(item.quantity || 1))} HTG
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              {total > 0 && (
                <div style={{ background:`linear-gradient(135deg,rgba(27,42,143,0.06),rgba(27,42,143,0.03))`, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:900, fontSize:18, color:D.text, marginBottom:4 }}>
                    <span>TOTAL:</span>
                    <span style={{ fontFamily:'monospace' }}>{fmt(total)} HTG</span>
                  </div>
                </div>
              )}

              {/* Peman */}
              <div style={{ marginBottom:20 }}>
                <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Peman Depozit</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>Montan Depozit (HTG)</label>
                    <input type="number" min="0" className="input" value={form.depositAmount}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))}
                      placeholder="0 si pa peye kounye a" style={{ width:'100%', boxSizing:'border-box', textAlign:'center', fontSize:15, fontWeight:700 }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>Metod Peman</label>
                    <select className="input" value={form.paymentMethod}
                      onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      style={{ width:'100%', boxSizing:'border-box' }}>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Kòb bay + monnen */}
                {deposit > 0 && (
                  <div style={{ marginTop:10 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>Kòb Kliyan Bay (HTG)</label>
                    <input type="number" min={deposit} className="input" value={form.amountGiven}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, amountGiven: e.target.value }))}
                      placeholder={fmt(deposit)} style={{ width:'100%', boxSizing:'border-box', textAlign:'center', fontSize:15, fontWeight:700 }}/>
                  </div>
                )}

                {change > 0 && (
                  <div style={{ marginTop:10, borderRadius:12, overflow:'hidden', border:'2px solid #16a34a' }}>
                    <div style={{ background:'#16a34a', padding:'8px 14px', display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', textTransform:'uppercase' }}>Monnen pou remèt</span>
                    </div>
                    <div style={{ background:'#f0fdf4', padding:'12px', textAlign:'center' }}>
                      <p style={{ fontFamily:'monospace', fontSize:32, fontWeight:900, color:'#15803d', margin:0 }}>
                        {fmt(change)} HTG
                      </p>
                    </div>
                  </div>
                )}

                {/* Rezime peman */}
                {total > 0 && (
                  <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Balans apre depozit:</span>
                    <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color: balance > 0 ? D.red : '#16a34a' }}>
                      {balance > 0 ? `-${fmt(balance)}` : '✓ Peye nèt'} {balance > 0 ? 'HTG' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Nòt */}
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>Nòt Espesyal (opsyonèl)</label>
                <textarea className="input" value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ex: Rad gen bouton ki kase, fè atansyon..."
                  style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontSize:13 }}/>
              </div>

              {/* Bouton */}
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={() => setShowCreate(false)} className="btn-secondary" style={{ flex:1 }}>
                  Anile
                </button>
                <button onClick={handleSubmit} disabled={createMutation.isPending}
                  style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:15, border:'none', cursor:'pointer', boxShadow:`0 4px 16px ${D.blue}40` }}>
                  {createMutation.isPending
                    ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                        Ap kreye...
                      </span>
                    : <><Scissors size={16}/> Kreye Lòd Prese</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .dry-row:hover { background: rgba(27,42,143,0.04) !important; }
      `}</style>
    </div>
  )
}