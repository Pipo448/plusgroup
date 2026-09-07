// src/pages/dry/DryOrdersPage.jsx
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Search, Plus, Eye, ChevronLeft, ChevronRight, ChevronDown, Scissors, X, Trash2, Settings } from 'lucide-react'
import { format } from 'date-fns'

// ── API helpers
const dryAPI = {
  getAll:  (params) => api.get('/dry', { params }),
  create:  (data)   => api.post('/dry', data),
  getCatalog:        () => api.get('/dry/catalog'),
  createCatalogItem: (data) => api.post('/dry/catalog', data),
  deleteCatalogItem: (id)   => api.delete(`/dry/catalog/${id}`),
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

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

function useDebounce(v, d = 400) {
  const [dv, setDv] = useState(v)
  useState(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t) })
  return dv
}

// ── Fòmilè atik vid (itilize pou ajout manyèl)
const emptyItem = () => ({
  _id: Math.random().toString(36).slice(2),
  service: 'presaj', description: '', color: '', quantity: 1, unitPriceHtg: '', notes: ''
})

const isBlankItem = (it) =>
  !it.description.trim() && !it.color.trim() && !it.unitPriceHtg && Number(it.quantity) === 1

const getTodayISO = () => new Date().toISOString().split('T')[0]

// ══════════════════════════════════════════════════════════════
export default function DryOrdersPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuthStore()
  const qc = useQueryClient()
  const overlayRef = useRef(null)
  const colorInputRefs = useRef({})

  const STATUS_MAP = useMemo(() => ({
    received:   { label:t('dry.status.received'),   color:'#1B2A8F', bg:'rgba(27,42,143,0.10)'  },
    processing: { label:t('dry.status.processing'), color:'#D97706', bg:'rgba(217,119,6,0.10)'  },
    ready:      { label:t('dry.status.ready'),       color:'#059669', bg:'rgba(5,150,105,0.10)'   },
    delivered:  { label:t('dry.status.delivered'),   color:'#6b7280', bg:'rgba(107,114,128,0.10)' },
    cancelled:  { label:t('dry.status.cancelled'),   color:'#C0392B', bg:'rgba(192,57,43,0.08)'   },
  }), [t])

  const SERVICES = useMemo(() => ([
    { value:'presaj',     label:t('dry.services.presaj')     },
    { value:'dry_clean',  label:t('dry.services.dry_clean')  },
    { value:'net_presaj', label:t('dry.services.net_presaj') },
    { value:'reparasyon', label:t('dry.services.reparasyon') },
    { value:'blanchi',    label:t('dry.services.blanchi')    },
  ]), [t])

  const PAYMENT_METHODS = useMemo(() => ([
    { value:'cash',     label:t('dry.paymentMethods.cash')     },
    { value:'moncash',  label:t('dry.paymentMethods.moncash')  },
    { value:'natcash',  label:t('dry.paymentMethods.natcash')  },
    { value:'card',     label:t('dry.paymentMethods.card')     },
    { value:'transfer', label:t('dry.paymentMethods.transfer') },
  ]), [t])

  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState('')
  const [page, setPage]             = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showCatalogMgr, setShowCatalogMgr] = useState(false)
  const [catalogForm, setCatalogForm] = useState({ name:'', unitPriceHtg:'', defaultService:'presaj' })
  const [lastAddedId, setLastAddedId] = useState(null)

  // ── Fòmilè nouvo lòd
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', pickupDate: getTodayISO(), serviceMode: 'imedya',
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

  const { data: catalog = [] } = useQuery({
    queryKey: ['dry-catalog'],
    queryFn:  () => dryAPI.getCatalog().then(r => r.data.items),
    staleTime: 60000,
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
      toast.success(t('dry.toastOrderCreated'))
      qc.invalidateQueries(['dry-orders'])
      setShowCreate(false)
      setForm({ clientName:'', clientPhone:'', pickupDate:getTodayISO(), serviceMode:'imedya', depositAmount:'', paymentMethod:'cash', amountGiven:'', notes:'', items:[emptyItem()] })
    },
    onError: (e) => toast.error(e.response?.data?.message || t('dry.toastOrderError'))
  })

  const addCatalogMutation = useMutation({
    mutationFn: (d) => dryAPI.createCatalogItem(d),
    onSuccess: () => {
      toast.success(t('dry.toastCatalogAdded'))
      qc.invalidateQueries(['dry-catalog'])
      setCatalogForm({ name:'', unitPriceHtg:'', defaultService:'presaj' })
    },
    onError: (e) => toast.error(e.response?.data?.message || t('dry.toastCatalogError'))
  })

  const deleteCatalogMutation = useMutation({
    mutationFn: (id) => dryAPI.deleteCatalogItem(id),
    onSuccess: () => { toast.success(t('dry.toastCatalogDeleted')); qc.invalidateQueries(['dry-catalog']) },
    onError: () => toast.error(t('dry.toastCatalogDeleteError'))
  })

  const handleSubmit = () => {
    if (!form.clientName.trim()) return toast.error(t('dry.toastClientRequired'))
    if (!form.pickupDate)        return toast.error(t('dry.toastPickupRequired'))
    if (!form.items.some(it => it.description.trim())) return toast.error(t('dry.toastItemRequired'))
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

  const handleAddCatalog = () => {
    if (!catalogForm.name.trim()) return toast.error(t('dry.toastCatalogNameRequired'))
    addCatalogMutation.mutate(catalogForm)
  }

  const setItem = useCallback((id, field, val) => {
    setForm(f => ({ ...f, items: f.items.map(it => it._id === id ? { ...it, [field]: val } : it) }))
  }, [])

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  const removeItem = (id) => setForm(f => ({ ...f, items: f.items.filter(it => it._id !== id) }))

  // ── Klike sou yon tip rad nan katalòg la: ajoute liy nan lòd la ak pri ranpli otomatikman
  const addFromCatalog = (cat) => {
    const newId = Math.random().toString(36).slice(2)
    setForm(f => {
      const base = (f.items.length === 1 && isBlankItem(f.items[0])) ? [] : f.items
      return {
        ...f,
        items: [...base, {
          _id: newId,
          service: cat.defaultService || 'presaj',
          description: cat.name,
          color: '',
          quantity: 1,
          unitPriceHtg: String(cat.unitPriceHtg),
          notes: '',
        }]
      }
    })
    setLastAddedId(newId)
  }

  // Fokis otomatik sou chan "Koulè" apre ajout nan katalòg la
  useEffect(() => {
    if (lastAddedId && colorInputRefs.current[lastAddedId]) {
      colorInputRefs.current[lastAddedId].focus()
    }
  }, [lastAddedId, form.items.length])

  // Dat pou tounen: jodi a se minimòm (sèvis imedya), men ou ka toujou chwazi yon dat pita (randevou)
  const today = new Date()
  const minDate = today.toISOString().split('T')[0]

  const scrollToBottom = () => {
    overlayRef.current?.scrollTo({ top: overlayRef.current.scrollHeight, behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif' }}>

      {/* ── Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
            <Scissors size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>{t('dry.title')}</h1>
            <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{t('dry.ordersTotal', { count: data.total })}</p>
          </div>
        </div>
        {hasRole(['admin','cashier']) && (
          <button onClick={() => setShowCreate(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:14, border:'none', cursor:'pointer', boxShadow:`0 4px 16px ${D.orange}45` }}>
            <Plus size={16}/> {t('dry.newOrder')}
          </button>
        )}
      </div>

      {/* ── Filtre */}
      <div style={{ background:D.white, borderRadius:14, padding:'14px 18px', border:`1px solid ${D.border}`, marginBottom:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', boxShadow:D.shadow }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input placeholder={t('dry.searchPlaceholder')}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ width:'100%', padding:'9px 14px 9px 36px', borderRadius:10, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, color:D.text, background:'#F8F9FF', boxSizing:'border-box' }}
          />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { v:'', l:t('dry.filterAll') },
            { v:'received',   l:STATUS_MAP.received.label   },
            { v:'processing', l:STATUS_MAP.processing.label },
            { v:'ready',      l:STATUS_MAP.ready.label      },
            { v:'delivered',  l:STATUS_MAP.delivered.label  },
            { v:'cancelled',  l:STATUS_MAP.cancelled.label  },
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
          {[t('dry.colNumber'), t('dry.colClient'), t('dry.colDeposited'), t('dry.colPickup'), t('dry.colTotal'), t('dry.colStatus'), ''].map((h,i) => (
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
                <p style={{ color:D.muted, fontSize:15, fontWeight:600 }}>{t('dry.noOrders')}</p>
                <button onClick={() => setShowCreate(true)}
                  style={{ marginTop:16, display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, color:'#fff', fontWeight:800, fontSize:13, border:'none', cursor:'pointer' }}>
                  <Plus size={14}/> {t('dry.createFirst')}
                </button>
              </div>
            )
          : data.orders.map((ord, idx) => {
              const s = STATUS_MAP[ord.status] || STATUS_MAP.received
              return (
                <div key={ord.id} className="dry-row"
                  style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 1fr 1fr 1fr 90px 50px', padding:'13px 20px', alignItems:'center', borderBottom:`1px solid ${D.border}`, background: idx%2===0 ? '#fff' : 'rgba(244,246,255,0.4)' }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, color:D.blue, fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                    <span title={ord.serviceMode === 'imedya' ? t('dry.serviceModeImmediate') : t('dry.serviceModeAppointment')}>
                      {ord.serviceMode === 'imedya' ? '⚡' : '📅'}
                    </span>
                    {ord.orderNumber}
                  </span>
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
                      <div style={{ fontSize:10, color:D.red, fontFamily:'monospace' }}>-{fmt(ord.balanceDueHtg)}</div>
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
          <p style={{ color:D.muted, fontSize:13 }}>{t('dry.page')} <strong style={{ color:D.text }}>{page}</strong> / {data.pages} · <strong style={{ color:D.text }}>{data.total}</strong> {t('dry.ordersWord')}</p>
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
        <div ref={overlayRef} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'20px 16px' }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:680, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Antèt modal */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Scissors size={18} color="#fff"/>
                </div>
                <div>
                  <h2 style={{ fontWeight:900, fontSize:18, color:D.text, margin:0 }}>{t('dry.modalNewTitle')}</h2>
                  <p style={{ fontSize:12, color:D.muted, margin:0 }}>{t('dry.modalNewSubtitle')}</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ border:'none', background:'#f1f5f9', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ padding:'24px' }}>

              {/* Seksyon kliyan */}
              <div style={{ marginBottom:20 }}>
                <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>{t('dry.clientInfo')}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.clientName')}</label>
                    <input className="input" value={form.clientName}
                      onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                      placeholder={t('dry.clientNamePlaceholder')} style={{ width:'100%', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.phone')}</label>
                    <input className="input" value={form.clientPhone}
                      onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                      placeholder={t('dry.phonePlaceholder')} style={{ width:'100%', boxSizing:'border-box' }}/>
                  </div>
                </div>
              </div>

              {/* Kalite Sèvis: Imedya oswa Randevou */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:6 }}>{t('dry.serviceModeLabel')}</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, serviceMode: 'imedya', pickupDate: minDate }))}
                    style={{ padding:'12px', borderRadius:12, cursor:'pointer', fontWeight:800, fontSize:13,
                      border: form.serviceMode === 'imedya' ? `2px solid ${D.orange}` : `1.5px solid ${D.border}`,
                      background: form.serviceMode === 'imedya' ? 'rgba(255,107,0,0.08)' : '#F8F9FF',
                      color: form.serviceMode === 'imedya' ? D.orange : D.muted }}>
                    ⚡ {t('dry.serviceModeImmediate')}
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, serviceMode: 'randevou' }))}
                    style={{ padding:'12px', borderRadius:12, cursor:'pointer', fontWeight:800, fontSize:13,
                      border: form.serviceMode === 'randevou' ? `2px solid ${D.blue}` : `1.5px solid ${D.border}`,
                      background: form.serviceMode === 'randevou' ? 'rgba(27,42,143,0.08)' : '#F8F9FF',
                      color: form.serviceMode === 'randevou' ? D.blue : D.muted }}>
                    📅 {t('dry.serviceModeAppointment')}
                  </button>
                </div>
              </div>

              {/* Dat pou tounen */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.pickupDateLabel')}</label>
                <input type="date" className="input" value={form.pickupDate} min={minDate}
                  disabled={form.serviceMode === 'imedya'}
                  onChange={e => setForm(f => ({ ...f, pickupDate: e.target.value }))}
                  style={{ width:'100%', boxSizing:'border-box', opacity: form.serviceMode === 'imedya' ? 0.7 : 1 }}/>
                <p style={{ fontSize:11, color:D.muted, margin:'4px 0 0' }}>{t('dry.pickupDateHint')}</p>
              </div>

              {/* Katalòg — klike pou ajoute */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{t('dry.catalogTitle')}</p>
                  {hasRole(['admin']) && (
                    <button onClick={() => setShowCatalogMgr(true)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:8, background:'transparent', border:`1px solid ${D.border}`, color:D.muted, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      <Settings size={11}/> {t('dry.manageCatalog')}
                    </button>
                  )}
                </div>
                {catalog.length > 0 ? (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {catalog.map(c => (
                      <button key={c.id} type="button" onClick={() => addFromCatalog(c)}
                        style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'8px 12px', borderRadius:10, border:`1.5px solid ${D.border}`, background:'#F8F9FF', cursor:'pointer', minWidth:88 }}>
                        <span style={{ fontSize:12, fontWeight:800, color:D.text }}>{c.name}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:D.blue, fontFamily:'monospace' }}>{fmt(c.unitPriceHtg)} HTG</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:D.muted, margin:0 }}>
                    {hasRole(['admin']) ? t('dry.catalogEmptyAdmin') : t('dry.catalogEmptyOther')}
                  </p>
                )}
              </div>

              {/* Atik yo */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{t('dry.itemsTitle')}</p>
                  <button onClick={addItem}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:`rgba(27,42,143,0.07)`, border:`1px solid ${D.border}`, color:D.blue, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    <Plus size={12}/> {t('dry.addItem')}
                  </button>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {form.items.map((item, idx) => (
                    <div key={item._id} style={{ background:'#f8fafc', borderRadius:12, padding:'14px', border:'1px solid #e2e8f0' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:10, marginBottom:10 }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>{t('dry.descriptionLabel')}</label>
                          <input className="input" value={item.description}
                            onChange={e => setItem(item._id, 'description', e.target.value)}
                            placeholder={t('dry.descriptionPlaceholder')}
                            style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>{t('dry.serviceLabel')}</label>
                          <select className="input" value={item.service} onChange={e => setItem(item._id, 'service', e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}>
                            {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 120px auto', gap:10, alignItems:'flex-end' }}>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>{t('dry.colorLabel')}</label>
                          <input className="input" value={item.color}
                            ref={el => { colorInputRefs.current[item._id] = el }}
                            onChange={e => setItem(item._id, 'color', e.target.value)}
                            placeholder={t('dry.colorPlaceholder')} style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>{t('dry.quantityLabel')}</label>
                          <input type="number" min="1" className="input" value={item.quantity}
                            onFocus={e => e.target.select()}
                            onChange={e => setItem(item._id, 'quantity', e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', textAlign:'center', fontSize:13 }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:11, fontWeight:700, color:D.muted, display:'block', marginBottom:3 }}>{t('dry.unitPriceLabel')}</label>
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
                    <span>{t('dry.totalLabel')}</span>
                    <span style={{ fontFamily:'monospace' }}>{fmt(total)} HTG</span>
                  </div>
                </div>
              )}

              {/* Peman */}
              <div style={{ marginBottom:20 }}>
                <p style={{ fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>{t('dry.depositSection')}</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.depositAmount')}</label>
                    <input type="number" min="0" className="input" value={form.depositAmount}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))}
                      placeholder={t('dry.depositPlaceholder')} style={{ width:'100%', boxSizing:'border-box', textAlign:'center', fontSize:15, fontWeight:700 }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.paymentMethodLabel')}</label>
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
                    <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.amountGiven')}</label>
                    <input type="number" min={deposit} className="input" value={form.amountGiven}
                      onFocus={e => e.target.select()}
                      onChange={e => setForm(f => ({ ...f, amountGiven: e.target.value }))}
                      placeholder={fmt(deposit)} style={{ width:'100%', boxSizing:'border-box', textAlign:'center', fontSize:15, fontWeight:700 }}/>
                  </div>
                )}

                {change > 0 && (
                  <div style={{ marginTop:10, borderRadius:12, overflow:'hidden', border:'2px solid #16a34a' }}>
                    <div style={{ background:'#16a34a', padding:'8px 14px', display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', textTransform:'uppercase' }}>{t('dry.changeDue')}</span>
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
                    <span style={{ fontSize:12, color:'#64748b' }}>{t('dry.balanceAfterDeposit')}</span>
                    <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, color: balance > 0 ? D.red : '#16a34a' }}>
                      {balance > 0 ? `-${fmt(balance)} HTG` : t('dry.fullyPaid')}
                    </span>
                  </div>
                )}
              </div>

              {/* Nòt */}
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:12, fontWeight:700, color:D.text, display:'block', marginBottom:4 }}>{t('dry.notesLabel')}</label>
                <textarea className="input" value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t('dry.notesPlaceholder')}
                  style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontSize:13 }}/>
              </div>

              {/* Bouton */}
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={() => setShowCreate(false)} className="btn-secondary" style={{ flex:1 }}>
                  {t('dry.cancel')}
                </button>
                <button onClick={handleSubmit} disabled={createMutation.isPending}
                  style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:12, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:800, fontSize:15, border:'none', cursor:'pointer', boxShadow:`0 4px 16px ${D.blue}40` }}>
                  {createMutation.isPending
                    ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
                        {t('dry.creating')}
                      </span>
                    : <><Scissors size={16}/> {t('dry.createOrder')}</>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* ── Bouton fiks nan kwen pou desann pi ba */}
          <button type="button" onClick={scrollToBottom}
            style={{ position:'fixed', bottom:24, right:24, zIndex:110, width:52, height:52, borderRadius:'50%', background:D.blue, color:'#fff', border:'none', boxShadow:`0 6px 20px ${D.blue}60`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
            title={t('dry.createOrder')}>
            <ChevronDown size={24}/>
          </button>
        </div>
      )}

      {/* ══ MODAL JERE KATALÒG ══ */}
      {showCatalogMgr && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:150, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'20px 16px' }}
          onClick={e => e.target === e.currentTarget && setShowCatalogMgr(false)}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #f1f5f9' }}>
              <h2 style={{ fontWeight:900, fontSize:16, color:D.text, margin:0 }}>{t('dry.catalogMgrTitle')}</h2>
              <button onClick={() => setShowCatalogMgr(false)} style={{ border:'none', background:'#f1f5f9', borderRadius:8, width:30, height:30, cursor:'pointer' }}>
                <X size={14}/>
              </button>
            </div>
            <div style={{ padding:'18px 22px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr auto', gap:8, marginBottom:14 }}>
                <input className="input" placeholder={t('dry.catalogNamePlaceholder')} value={catalogForm.name}
                  onChange={e => setCatalogForm(c => ({ ...c, name:e.target.value }))} style={{ fontSize:13 }}/>
                <input type="number" min="0" className="input" placeholder={t('dry.catalogPricePlaceholder')} value={catalogForm.unitPriceHtg}
                  onChange={e => setCatalogForm(c => ({ ...c, unitPriceHtg:e.target.value }))} style={{ fontSize:13 }}/>
                <select className="input" value={catalogForm.defaultService}
                  onChange={e => setCatalogForm(c => ({ ...c, defaultService:e.target.value }))} style={{ fontSize:12 }}>
                  {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button onClick={handleAddCatalog} disabled={addCatalogMutation.isPending}
                  style={{ padding:'8px 14px', borderRadius:8, background:D.blue, color:'#fff', border:'none', fontWeight:700, cursor:'pointer' }}>
                  <Plus size={14}/>
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
                {catalog.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:13, color:D.text }}>{c.name}</p>
                      <p style={{ margin:0, fontSize:11, color:D.muted }}>{SERVICES.find(s=>s.value===c.defaultService)?.label} · {fmt(c.unitPriceHtg)} HTG</p>
                    </div>
                    <button onClick={() => deleteCatalogMutation.mutate(c.id)}
                      style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(192,57,43,0.2)', background:'rgba(192,57,43,0.07)', color:'#C0392B', cursor:'pointer' }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
                {!catalog.length && <p style={{ fontSize:12, color:D.muted, textAlign:'center', padding:'12px 0' }}>{t('dry.catalogMgrEmpty')}</p>}
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