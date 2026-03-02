// src/pages/invoices/NewInvoicePage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoiceAPI, clientAPI, productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Receipt, User, Search, ChevronDown, Save } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914',
  orange:'#FF6B00', orangeLt:'#FF8C33',
  white:'#FFFFFF', bg:'#F4F6FF',
  border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  success:'#059669', successBg:'rgba(5,150,105,0.08)',
  red:'#C0392B',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, outline:'none',
  fontSize:13, color:D.text, background:'#F8F9FF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
  transition:'border-color 0.2s',
}

const label = (txt) => (
  <label style={{ display:'block', color:D.muted, fontSize:11, fontWeight:700,
    marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>
    {txt}
  </label>
)

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

// ── Ligne atik ──────────────────────────────────
function ItemRow({ item, idx, onUpdate, onRemove, t }) {
  const [search, setSearch] = useState(item.description || '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const { data } = useQuery({
    queryKey: ['products-search', search],
    queryFn: () => productAPI.getAll({ search, limit: 8 }).then(r => r.data.products || []),
    enabled: search.length >= 1,
  })
  const products = data || []

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const lineTotal = (Number(item.unitPrice) * Number(item.qty)) * (1 - Number(item.discount || 0) / 100)

  const selectProduct = (p) => {
    setSearch(p.name)
    setOpen(false)
    onUpdate(idx, {
      description: p.name,
      productId:   p.id,
      unitPrice:   p.priceHtg || 0,
      qty:         1,
      discount:    0,
    })
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'2.5fr 70px 120px 80px 100px 36px', gap:8, alignItems:'start', padding:'12px 0', borderBottom:`1px solid ${D.border}` }}>

      {/* Deskripsyon / Pwodui */}
      <div ref={ref} style={{ position:'relative' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); onUpdate(idx, { description: e.target.value, productId: null }) }}
          onFocus={() => setOpen(true)}
          placeholder={t('invoice.searchProduct') || 'Chèche pwodui...'}
          style={{ ...inp, fontSize:12 }}
        />
        {open && products.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:D.white, borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:180, overflowY:'auto', marginTop:4 }}>
            {products.map(p => (
              <div key={p.id} onMouseDown={() => selectProduct(p)}
                style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, color:D.text, display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${D.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontWeight:600 }}>{p.name}</span>
                <span style={{ fontFamily:'monospace', color:D.blue, fontWeight:700 }}>{fmt(p.priceHtg)} HTG</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Qte */}
      <input type="number" min="1" value={item.qty}
        onChange={e => onUpdate(idx, { qty: Number(e.target.value) })}
        style={{ ...inp, fontSize:12, textAlign:'center' }}
        onFocus={e => e.target.style.borderColor = D.blue}
        onBlur={e => e.target.style.borderColor = D.border}
      />

      {/* Pri U. */}
      <input type="number" min="0" step="0.01" value={item.unitPrice}
        onChange={e => onUpdate(idx, { unitPrice: e.target.value })}
        style={{ ...inp, fontSize:12, fontFamily:'monospace' }}
        onFocus={e => e.target.style.borderColor = D.blue}
        onBlur={e => e.target.style.borderColor = D.border}
      />

      {/* Remiz % */}
      <input type="number" min="0" max="100" value={item.discount}
        onChange={e => onUpdate(idx, { discount: e.target.value })}
        style={{ ...inp, fontSize:12, textAlign:'center' }}
        onFocus={e => e.target.style.borderColor = D.blue}
        onBlur={e => e.target.style.borderColor = D.border}
      />

      {/* Total liy */}
      <div style={{ padding:'10px 6px', fontSize:12, fontFamily:'monospace', fontWeight:700, color:D.text, textAlign:'right' }}>
        {fmt(lineTotal)}
      </div>

      {/* Retire */}
      <button type="button" onClick={() => onRemove(idx)}
        style={{ width:34, height:38, borderRadius:9, background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.15)', color:D.red, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Trash2 size={13}/>
      </button>
    </div>
  )
}

// ── Paj prensipal ────────────────────────────────
export default function NewInvoicePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant } = useAuthStore()

  const [clientSearch, setClientSearch]   = useState('')
  const [clientOpen, setClientOpen]       = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const clientRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]
  const [invoiceDate, setInvoiceDate] = useState(today)
  const [dueDate, setDueDate]         = useState('')
  const [notes, setNotes]             = useState('')
  const [terms, setTerms]             = useState('')
  const [taxRate, setTaxRate]         = useState(tenant?.taxRate || 0)
  const [discountGlobal, setDiscountGlobal] = useState(0)

  const [items, setItems] = useState([
    { description:'', productId:null, qty:1, unitPrice:0, discount:0 }
  ])

  // Chèche kliyan
  const { data: clientData } = useQuery({
    queryKey: ['clients-search', clientSearch],
    queryFn: () => clientAPI.getAll({ search: clientSearch, limit: 8 }).then(r => r.data.clients || r.data),
    enabled: clientSearch.length >= 1,
  })
  const clients = clientData || []

  useEffect(() => {
    const h = (e) => { if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Kalkil totò
  const subtotal        = items.reduce((acc, it) => acc + (Number(it.unitPrice) * Number(it.qty)) * (1 - Number(it.discount || 0) / 100), 0)
  const discountAmount  = subtotal * (Number(discountGlobal) / 100)
  const afterDiscount   = subtotal - discountAmount
  const taxAmount       = afterDiscount * (Number(taxRate) / 100)
  const grandTotal      = afterDiscount + taxAmount

  const updateItem = (idx, changes) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it))
  }
  const removeItem = (idx) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }
  const addItem = () => {
    setItems(prev => [...prev, { description:'', productId:null, qty:1, unitPrice:0, discount:0 }])
  }

  const mutation = useMutation({
    mutationFn: (payload) => invoiceAPI.createDirect(payload),
    onSuccess: (res) => {
      const inv = res.data.invoice
      toast.success(t('invoice.invoiceCreated') || 'Fakti kreye avèk siksè!')
      navigate(`/app/invoices/${inv.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const handleSubmit = () => {
    const validItems = items.filter(it => it.description?.trim() && Number(it.unitPrice) > 0)
    if (!validItems.length) {
      toast.error(t('invoice.addAtLeastOneItem') || 'Ajoute omwen yon atik.')
      return
    }

    // Kalkile chak liy
    const mappedItems = validItems.map(it => {
      const qty         = Number(it.qty)
      const unitPrice   = Number(it.unitPrice)
      const discPct     = Number(it.discount || 0)
      const lineTotal   = qty * unitPrice * (1 - discPct / 100)
      return {
        description:  it.description,
        productId:    it.productId || null,
        quantity:     qty,                  // ✅ backend atann "quantity"
        unitPriceHtg: unitPrice,
        unitPriceUsd: 0,
        discountPct:  discPct,
        totalHtg:     lineTotal,
        totalUsd:     0,
        productSnapshot: {},
      }
    })

    // Kalkile totò
    const sub      = mappedItems.reduce((a, it) => a + it.totalHtg, 0)
    const discAmt  = sub * (Number(discountGlobal) / 100)
    const afterDis = sub - discAmt
    const taxAmt   = afterDis * (Number(taxRate) / 100)
    const total    = afterDis + taxAmt

    mutation.mutate({
      clientId:      selectedClient?.id || null,
      issueDate:     invoiceDate,
      dueDate:       dueDate || null,
      currency:      'HTG',
      exchangeRate:  0,
      subtotalHtg:   sub,
      subtotalUsd:   0,
      discountType:  'percent',
      discountValue: Number(discountGlobal),
      discountHtg:   discAmt,
      discountUsd:   0,
      taxRate:       Number(taxRate),
      taxHtg:        taxAmt,
      taxUsd:        0,
      totalHtg:      total,
      totalUsd:      0,
      notes,
      terms,
      items: mappedItems,
    })
  }

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth:860 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <button onClick={() => navigate('/app/invoices')}
          style={{ width:40, height:40, borderRadius:11, background:D.blueDim2, border:`1px solid ${D.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:D.blue }}>
          <ArrowLeft size={17}/>
        </button>
        <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.orange},${D.orangeLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.orange}40` }}>
          <Receipt size={22} color="#fff"/>
        </div>
        <div>
          <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>
            {t('invoice.directInvoiceTitle') || 'Nouvo Fakti Direk'}
          </h1>
          <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>
            {t('invoice.directInvoiceDesc') || 'Kreye yon fakti san pase pa devi'}
          </p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── Kliyan + Dat ── */}
        <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <User size={15} color={D.blue}/>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>
              {t('invoice.selectClient') || 'Chwazi Kliyan (opsyonèl)'}
            </h3>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>

            {/* Kliyan */}
            <div ref={clientRef} style={{ position:'relative', gridColumn:'1/-1' }}>
              {label(t('invoice.selectClient') || 'Kliyan')}
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
                <input
                  value={selectedClient ? selectedClient.name : clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setClientOpen(true) }}
                  onFocus={() => setClientOpen(true)}
                  placeholder={t('invoice.searchClientPlaceholder') || 'Chèche kliyan...'}
                  style={{ ...inp, paddingLeft:36 }}
                  onFocusCapture={e => e.target.style.borderColor = D.blue}
                  onBlur={e => e.target.style.borderColor = D.border}
                />
                {selectedClient && (
                  <button type="button" onClick={() => { setSelectedClient(null); setClientSearch('') }}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:D.muted, fontSize:16 }}>×</button>
                )}
              </div>
              {clientOpen && clients.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:D.white, borderRadius:10, border:`1px solid ${D.border}`, boxShadow:D.shadow, maxHeight:180, overflowY:'auto', marginTop:4 }}>
                  {clients.map(c => (
                    <div key={c.id} onMouseDown={() => { setSelectedClient(c); setClientOpen(false); setClientSearch('') }}
                      style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, color:D.text, borderBottom:`1px solid ${D.border}`, display:'flex', justifyContent:'space-between' }}
                      onMouseEnter={e => e.currentTarget.style.background = D.blueDim}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight:700 }}>{c.name}</span>
                      <span style={{ color:D.muted, fontSize:12 }}>{c.phone || c.email || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dat Fakti */}
            <div>
              {label(t('invoice.invoiceDate') || 'Dat Fakti')}
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                style={inp}
                onFocus={e => e.target.style.borderColor = D.blue}
                onBlur={e => e.target.style.borderColor = D.border}
              />
            </div>

            {/* Dat Limit */}
            <div>
              {label(t('invoice.dueDate') || 'Dat Limit')}
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={inp}
                onFocus={e => e.target.style.borderColor = D.blue}
                onBlur={e => e.target.style.borderColor = D.border}
              />
            </div>

            {/* Taks */}
            <div>
              {label(`${t('settings.taxRate') || 'Taks TVA'} (%)`)}
              <input type="number" min="0" max="100" step="0.5" value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                style={inp}
                onFocus={e => e.target.style.borderColor = D.blue}
                onBlur={e => e.target.style.borderColor = D.border}
              />
            </div>

          </div>
        </div>

        {/* ── Atik yo ── */}
        <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
          <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 4px' }}>
            {t('quotes.items') || 'Atik yo'}
          </h3>

          {/* Entèt kolonn */}
          <div style={{ display:'grid', gridTemplateColumns:'2.5fr 70px 120px 80px 100px 36px', gap:8, padding:'8px 0', borderBottom:`2px solid ${D.border}` }}>
            {[
              t('invoice.productDesc') || 'Pwodui / Deskripsyon',
              t('invoice.qty') || 'Qte',
              t('invoice.unitPriceHtg') || 'Pri U. (HTG)',
              t('invoice.discountPct') || 'Remiz %',
              'Total',
              '',
            ].map((h, i) => (
              <span key={i} style={{ fontSize:10, fontWeight:800, color:D.blue, textTransform:'uppercase', letterSpacing:'0.05em', textAlign: i >= 1 ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>

          {items.map((item, idx) => (
            <ItemRow key={idx} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem} t={t}/>
          ))}

          <button type="button" onClick={addItem}
            style={{ display:'flex', alignItems:'center', gap:7, marginTop:14, padding:'9px 18px', borderRadius:10, background:D.blueDim, border:`1px dashed ${D.blue}`, color:D.blue, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            <Plus size={14}/> {t('invoice.addAnotherItem') || 'Ajoute yon lòt atik'}
          </button>
        </div>

        {/* ── Rezime + Nòt ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Nòt */}
          <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow, display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              {label(t('invoice.notesForClient') || 'Nòt pou kliyan')}
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={3} placeholder={t('invoice.notesPlaceholder') || 'Remèsiman, kondisyon...'}
                style={{ ...inp, resize:'vertical', lineHeight:1.5 }}
                onFocus={e => e.target.style.borderColor = D.blue}
                onBlur={e => e.target.style.borderColor = D.border}
              />
            </div>
            <div>
              {label(t('invoice.generalTerms') || 'Kondisyon jeneral')}
              <textarea value={terms} onChange={e => setTerms(e.target.value)}
                rows={3} placeholder={t('invoice.termsPlaceholder') || 'Kondisyon pèman...'}
                style={{ ...inp, resize:'vertical', lineHeight:1.5 }}
                onFocus={e => e.target.style.borderColor = D.blue}
                onBlur={e => e.target.style.borderColor = D.border}
              />
            </div>
          </div>

          {/* Totò */}
          <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>
              {t('quotes.summary') || 'Rezime'}
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:D.muted }}>
                <span>{t('quotes.subtotal') || 'Sou-total'}</span>
                <span style={{ fontFamily:'monospace', fontWeight:700, color:D.text }}>{fmt(subtotal)} HTG</span>
              </div>

              {/* Remiz global */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:D.muted }}>
                <span>{t('quotes.discount') || 'Remiz'} (%)</span>
                <input type="number" min="0" max="100" value={discountGlobal}
                  onChange={e => setDiscountGlobal(e.target.value)}
                  style={{ ...inp, width:80, textAlign:'center', fontSize:12, padding:'6px 10px' }}
                  onFocus={e => e.target.style.borderColor = D.blue}
                  onBlur={e => e.target.style.borderColor = D.border}
                />
              </div>

              {discountAmount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:D.red }}>
                  <span>- {t('quotes.discount') || 'Remiz'}</span>
                  <span style={{ fontFamily:'monospace' }}>- {fmt(discountAmount)} HTG</span>
                </div>
              )}

              {Number(taxRate) > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:D.muted }}>
                  <span>TVA ({taxRate}%)</span>
                  <span style={{ fontFamily:'monospace' }}>+ {fmt(taxAmount)} HTG</span>
                </div>
              )}

              <div style={{ height:1, background:D.border, margin:'4px 0' }}/>

              <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:900 }}>
                <span style={{ color:D.text }}>{t('invoice.totalHtg') || 'TOTAL (HTG)'}</span>
                <span style={{ fontFamily:'monospace', color:D.blue }}>{fmt(grandTotal)} HTG</span>
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
              style={{ width:'100%', marginTop:22, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'13px 0', borderRadius:12,
                background: mutation.isPending ? '#ccc' : `linear-gradient(135deg,${D.orange},${D.orangeLt})`,
                color:'#fff', border:'none', fontWeight:800, fontSize:14, cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow:`0 4px 16px ${D.orange}40`, fontFamily:'DM Sans,sans-serif',
                transition:'transform 0.15s',
              }}
              onMouseEnter={e => { if (!mutation.isPending) e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <Save size={16}/>
              {mutation.isPending
                ? (t('invoice.saving') || 'Ap sovgade...')
                : (t('invoice.createInvoice') || 'Kreye Fakti')
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
