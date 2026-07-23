// src/pages/restaurant/RestaurantMenuPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, Search, Edit2, Trash2, UtensilsCrossed, AlertTriangle,
  X, ChevronLeft, ChevronRight, Camera,
} from 'lucide-react'

// ✅ Palèt koulè cho, apwopriye pou yon Restoran (distenge de brand ble/oranj jeneral la)
const D = {
  red:     '#DC2626', redLt: '#EF4444', redDk: '#991B1B',
  redDim:  'rgba(220,38,38,0.08)', redDim2: 'rgba(220,38,38,0.14)',
  gold:    '#C9A84C',
  white:   '#FFFFFF', bg: '#FFF8F6',
  border:  'rgba(220,38,38,0.12)',
  text:    '#3B1212', muted: '#946B6B',
  success: '#059669', warning: '#D97706', warningBg: 'rgba(217,119,6,0.08)',
  shadow:  '0 4px 20px rgba(220,38,38,0.10)',
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

// ══════════════════════════════════════════════
// Modal Atik Meni (Manje/Bwason)
// ══════════════════════════════════════════════
function MenuItemModal({ item, categories, exchangeRate, onClose }) {
  const { t } = useTranslation()
  const isEdit = !!item
  const rate = Number(exchangeRate || 132)
  const qc = useQueryClient()

  const [imagePreview, setImagePreview] = useState(item?.imageUrl || null)
  const [imageChanged, setImageChanged] = useState(false)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error(t('restaurant.imageOnlyError')); return }
    if (file.size > 2 * 1024 * 1024) { toast.error(t('restaurant.imageTooLarge')); return }
    const reader = new FileReader()
    reader.onload = () => { setImagePreview(reader.result); setImageChanged(true) }
    reader.readAsDataURL(file)
  }
  const handleRemoveImage = () => { setImagePreview(null); setImageChanged(true) }

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: item
      ? { ...item, priceHtg: Number(item.priceHtg), quantity: Number(item.quantity), alertThreshold: Number(item.alertThreshold) }
      : { alertThreshold: 5, unit: 'pòsyon', priceHtg: '', quantity: '' }
  })

  const handlePriceChange = (e) => {
    const htg = Number(e.target.value)
    setValue('priceHtg', e.target.value)
    if (htg > 0) setValue('priceUsd', (htg / rate).toFixed(2))
  }

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = imageChanged ? { ...data, imageUrl: imagePreview } : data
      return isEdit
        ? api.put(`/restaurant/menu/${item.id}`, payload)
        : api.post('/restaurant/menu', payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? t('restaurant.updatedSuccess') : t('restaurant.addedSuccess'))
      qc.invalidateQueries(['restaurant-menu'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('restaurant.errorGeneric'))
  })

  const inp = {
    width:'100%', padding:'10px 12px', borderRadius:10,
    border:`1.5px solid ${D.border}`, outline:'none',
    fontSize:13, color:D.text, background:'#fff',
    fontFamily:'DM Sans,sans-serif',
  }
  const label = (text) => (
    <label style={{ display:'block', fontSize:11, fontWeight:800, color:D.muted, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>
      {text}
    </label>
  )

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-display font-bold" style={{ color: D.text }}>
            {isEdit ? t('restaurant.editModalTitle') : t('restaurant.newModalTitle')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            {label(t('restaurant.photoOptional'))}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{
                width:72, height:72, borderRadius:14, flexShrink:0,
                background: imagePreview ? `url(${imagePreview}) center/cover no-repeat` : D.redDim,
                display:'flex', alignItems:'center', justifyContent:'center',
                border:`1.5px solid ${D.border}`,
              }}>
                {!imagePreview && <UtensilsCrossed size={26} color={D.red}/>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:D.redDim, color:D.red, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  <Camera size={14}/> {imagePreview ? t('restaurant.changePhoto') : t('restaurant.addPhoto')}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display:'none' }}/>
                </label>
                {imagePreview && (
                  <button type="button" onClick={handleRemoveImage} style={{ padding:'8px 14px', borderRadius:10, background:'#fee2e2', color:'#dc2626', fontWeight:700, fontSize:12, border:'none', cursor:'pointer' }}>
                    {t('restaurant.removePhoto')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            {label(`${t('restaurant.itemName')} *`)}
            <input {...register('name', { required: true })} placeholder={t('restaurant.itemNamePlaceholder')}
              style={{ ...inp, borderColor: errors.name ? '#dc2626' : D.border }}/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {label(t('restaurant.category'))}
              <select {...register('categoryId')} style={inp}>
                <option value="">{t('restaurant.noCategoryOption')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              {label(t('restaurant.unit'))}
              <input {...register('unit')} placeholder={t('restaurant.unitPlaceholder')} style={inp}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {label(`${t('restaurant.priceHtg')} *`)}
              <input type="number" step="0.01" min="0" {...register('priceHtg', { required: true, min: 0 })}
                onChange={handlePriceChange}
                style={{ ...inp, borderColor: errors.priceHtg ? '#dc2626' : D.border, fontFamily:'monospace' }}/>
            </div>
            <div>
              {label(t('restaurant.priceUsd'))}
              <input type="number" step="0.01" min="0" {...register('priceUsd')} readOnly
                style={{ ...inp, background:'#f8f8f8', fontFamily:'monospace', color:D.muted }}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {label(`${t('restaurant.quantity')} *`)}
              <input type="number" step="1" min="0" {...register('quantity', { required: true, min: 0 })}
                style={{ ...inp, borderColor: errors.quantity ? '#dc2626' : D.border, fontFamily:'monospace' }}/>
            </div>
            <div>
              {label(t('restaurant.alertThreshold'))}
              <input type="number" step="1" min="0" {...register('alertThreshold')}
                style={{ ...inp, fontFamily:'monospace' }}/>
            </div>
          </div>

          <div>
            {label(t('restaurant.description'))}
            <textarea {...register('description')} rows={2} placeholder={t('restaurant.descriptionPlaceholder')}
              style={{ ...inp, resize:'vertical' }}/>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('restaurant.cancelBtn')}</button>
            <button type="submit" disabled={mutation.isPending}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:11,
                background:`linear-gradient(135deg,${D.red},${D.redLt})`, color:'#fff',
                border:'none', fontWeight:800, fontSize:13, cursor:'pointer',
                opacity: mutation.isPending ? 0.7 : 1 }}>
              {mutation.isPending ? t('restaurant.saving') : isEdit ? t('restaurant.updateBtn') : t('restaurant.addToMenuBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// PAJ PRENSIPAL
// ══════════════════════════════════════════════
export default function RestaurantMenuPage() {
  const { t } = useTranslation()
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage]           = useState(1)
  const [modal, setModal]         = useState(null)

  const tenant = useAuthStore(s => s.tenant)
  const exchangeRate = Number(tenant?.exchangeRate || 132)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-menu', search, catFilter, page],
    queryFn: () => api.get('/restaurant/menu', { params: { search, categoryId: catFilter, page, limit: 20 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['restaurant-categories'],
    queryFn: () => api.get('/restaurant/menu/categories').then(r => r.data.categories || []),
    staleTime: 5 * 60 * 1000,
  })
  const categories = categoriesData || []

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/restaurant/menu/${id}`),
    onSuccess: (res) => {
      toast.success(res?.data?.message || t('restaurant.deletedSuccess'))
      qc.invalidateQueries(['restaurant-menu'])
    },
    onError: (e) => toast.error(e.response?.data?.message || t('restaurant.errorDeleting'))
  })

  const handleDelete = (item) => {
    if (confirm(t('restaurant.confirmRemove', { name: item.name }))) deleteMutation.mutate(item.id)
  }

  const items = data?.products || []

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6" style={{ flexWrap:'wrap', gap:12 }}>
        <div className="flex items-center gap-3">
          <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${D.red},${D.redLt})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <UtensilsCrossed size={19} color="#fff"/>
          </div>
          <div>
            <h1 className="page-title" style={{ color: D.text }}>{t('restaurant.menuTitle')}</h1>
            <p style={{ color: D.muted, fontSize: 13, margin: '2px 0 0' }}>{t('restaurant.menuSubtitle')}</p>
          </div>
        </div>
        <button onClick={() => setModal({ type: 'new' })}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:12,
            background:`linear-gradient(135deg,${D.red},${D.redLt})`, color:'#fff',
            border:'none', fontWeight:800, fontSize:13, cursor:'pointer', boxShadow:D.shadow }}>
          <Plus size={16}/> {t('restaurant.newItem')}
        </button>
      </div>

      {/* Rechèch + Filtè Kategori */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:18 }}>
        <div style={{ position:'relative', flex:'1 1 260px' }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:D.muted }}/>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('restaurant.searchPlaceholder')}
            style={{ width:'100%', padding:'10px 14px 10px 36px', borderRadius:12, border:`1.5px solid ${D.border}`, outline:'none', fontSize:13, background:D.white }}
          />
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          <button onClick={() => { setCatFilter(''); setPage(1) }}
            style={{
              flexShrink:0, padding:'8px 16px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer',
              background: !catFilter ? D.red : D.white, color: !catFilter ? '#fff' : D.muted,
              border:`1.5px solid ${!catFilter ? D.red : D.border}`,
            }}>{t('restaurant.allCategoriesBtn')}</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => { setCatFilter(c.id); setPage(1) }}
              style={{
                flexShrink:0, padding:'8px 16px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer',
                background: catFilter === c.id ? D.red : D.white, color: catFilter === c.id ? '#fff' : D.muted,
                border:`1.5px solid ${catFilter === c.id ? D.red : D.border}`,
              }}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* Grid Atik yo */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:D.muted }}>{t('common.loading')}</div>
      ) : !items.length ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <UtensilsCrossed size={40} style={{ color: D.border, margin:'0 auto 12px' }}/>
          <p style={{ color:D.muted }}>{t('restaurant.noItems')}</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:16 }}>
          {items.map(item => {
            const lowStock = Number(item.quantity) <= Number(item.alertThreshold)
            const outOfStock = Number(item.quantity) <= 0
            return (
              <div key={item.id} style={{
                background:D.white, borderRadius:16, overflow:'hidden',
                border:`1px solid ${outOfStock ? '#fecaca' : D.border}`, boxShadow:D.shadow,
                display:'flex', flexDirection:'column',
              }}>
                <div style={{
                  height:140, background: item.imageUrl ? `url(${item.imageUrl}) center/cover no-repeat` : D.redDim,
                  display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
                }}>
                  {!item.imageUrl && <UtensilsCrossed size={32} color={D.red}/>}
                  {item.category && (
                    <span style={{ position:'absolute', top:8, left:8, padding:'3px 10px', borderRadius:99, background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:10, fontWeight:700 }}>
                      {item.category.name}
                    </span>
                  )}
                  {(lowStock || outOfStock) && (
                    <span style={{
                      position:'absolute', top:8, right:8, padding:'3px 8px', borderRadius:99,
                      background: outOfStock ? '#dc2626' : D.warning, color:'#fff',
                      fontSize:10, fontWeight:800, display:'flex', alignItems:'center', gap:3,
                    }}>
                      <AlertTriangle size={10}/> {outOfStock ? t('restaurant.outOfStock') : t('restaurant.lowStock')}
                    </span>
                  )}
                </div>

                <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8, flex:1 }}>
                  <h3 style={{ fontSize:14, fontWeight:800, color:D.text, margin:0, lineHeight:1.3 }}>{item.name}</h3>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:'auto' }}>
                    <span style={{ fontSize:16, fontWeight:900, color:D.red, fontFamily:'monospace' }}>{fmt(item.priceHtg)} HTG</span>
                    <span style={{ fontSize:11, color:D.muted, fontWeight:700 }}>{item.quantity} {item.unit}</span>
                  </div>

                  <div style={{ display:'flex', gap:8, marginTop:6 }}>
                    <button onClick={() => setModal({ type: 'edit', item })}
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 0', borderRadius:9, background:D.redDim, color:D.red, border:'none', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      <Edit2 size={12}/> {t('restaurant.edit')}
                    </button>
                    <button onClick={() => handleDelete(item)}
                      style={{ width:34, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:9, background:'#fee2e2', color:'#dc2626', border:'none', cursor:'pointer' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginasyon */}
      {data && data.pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:24 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ padding:8, borderRadius:9, border:`1px solid ${D.border}`, background:D.white, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
            <ChevronLeft size={16} color={D.text}/>
          </button>
          <span style={{ fontSize:12, color:D.muted, fontWeight:700 }}>{t('products.page')} {data.page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
            style={{ padding:8, borderRadius:9, border:`1px solid ${D.border}`, background:D.white, cursor: page >= data.pages ? 'not-allowed' : 'pointer', opacity: page >= data.pages ? 0.4 : 1 }}>
            <ChevronRight size={16} color={D.text}/>
          </button>
        </div>
      )}

      {(modal?.type === 'new' || modal?.type === 'edit') && (
        <MenuItemModal
          item={modal.item}
          categories={categories}
          exchangeRate={exchangeRate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
