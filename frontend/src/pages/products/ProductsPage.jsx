// src/pages/products/ProductsPage.jsx - WITH FULL i18n + Plan Feature Guard
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  AlertTriangle, X, ChevronLeft, ChevronRight, Tag, Layers, Check, Lock
} from 'lucide-react'
import HelpModal from '../../components/HelpModal'

const COLORS = ['#1B3A6B','#C0392B','#27ae60','#C9A84C','#E8836A','#8e44ad','#16a085','#2980b9','#d35400','#7f8c8d']

// ── Helper: verifye si plan an gen yon feature
const planHasFeature = (tenant, featureName) => {
  try {
    const f = tenant?.plan?.features
    if (!f) return false
    const features = Array.isArray(f) ? f : JSON.parse(String(f))
    return features.some(feat =>
      String(feat).toLowerCase().includes(featureName.toLowerCase()) ||
      String(feat).toLowerCase().includes('tout nan biznis') ||
      String(feat).toLowerCase().includes('tout fonksyon')
    )
  } catch { return false }
}

// ── Modal Kategori
const CategoryModal = ({ categories, onClose }) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#1B3A6B' })

  const createMut = useMutation({
    mutationFn: (d) => productAPI.createCategory(d),
    onSuccess: () => {
      toast.success(t('products.categoryCreated'))
      qc.invalidateQueries(['categories'])
      setForm({ name: '', color: '#1B3A6B' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => productAPI.updateCategory(id, d),
    onSuccess: () => {
      toast.success(t('products.categoryUpdated'))
      qc.invalidateQueries(['categories'])
      setEditItem(null)
      setForm({ name: '', color: '#1B3A6B' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  const handleSave = () => {
    if (!form.name.trim()) return toast.error(t('products.categoryNameRequired'))
    if (editItem) {
      updateMut.mutate({ id: editItem.id, name: form.name, color: form.color })
    } else {
      createMut.mutate({ name: form.name, color: form.color })
    }
  }

  const startEdit = (cat) => {
    setEditItem(cat)
    setForm({ name: cat.name, color: cat.color || '#1B3A6B' })
  }

  const cancelEdit = () => {
    setEditItem(null)
    setForm({ name: '', color: '#1B3A6B' })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-brand-600"/>
            <h2 className="text-lg font-display font-bold">{t('products.manageCategories')}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20}/>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div style={{
            background: editItem ? 'rgba(201,168,76,0.06)' : 'rgba(26,58,107,0.04)',
            border: editItem ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(26,58,107,0.1)',
            borderRadius: 14, padding: 16
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {editItem ? `${t('products.editCategory')}: ${editItem.name}` : t('products.newCategory')}
            </p>

            <div className="flex gap-3 mb-3">
              <input className="input flex-1" placeholder={t('products.categoryName')}
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>

            <div>
              <p className="label mb-2">{t('products.color')}</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 28, height: 28, borderRadius: 8, background: c,
                      border: form.color === c ? '3px solid #1B3A6B' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: form.color === c ? '0 0 0 2px #fff, 0 0 0 4px ' + c : 'none',
                      transition: 'all 0.15s', cursor: 'pointer', flexShrink: 0
                    }}>
                    {form.color === c && <Check size={12} color="#fff" strokeWidth={3}/>}
                  </button>
                ))}
                <label style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', border: '2px dashed #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, pointerEvents: 'none' }}>+</span>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}/>
                </label>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div style={{ width: 20, height: 20, borderRadius: 6, background: form.color }}/>
                <span className="text-xs font-mono text-slate-400">{form.color}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {editItem && (
                <button type="button" onClick={cancelEdit} className="btn-secondary btn-sm flex-1">
                  {t('common.cancel')}
                </button>
              )}
              <button type="button" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="btn-primary btn-sm flex-1">
                {(createMut.isPending || updateMut.isPending) ? t('common.saving') : editItem ? t('common.update') : t('products.addCategory')}
              </button>
            </div>
          </div>

          <div>
            <p className="label mb-3">{t('products.existingCategories')} ({categories?.length || 0})</p>
            {!categories?.length
              ? <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  <Tag size={32} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }}/>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{t('products.noCategoriesYet')}</p>
                  <p style={{ fontSize: 11 }}>{t('products.useFormToCreate')}</p>
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {categories.map(cat => (
                    <div key={cat.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 12,
                      background: editItem?.id === cat.id ? 'rgba(201,168,76,0.08)' : '#fafaf8',
                      border: editItem?.id === cat.id ? '1px solid rgba(201,168,76,0.3)' : '1px solid #f0e8d8',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || '#1B3A6B', flexShrink: 0 }}/>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{cat.name}</span>
                        {cat._count?.products !== undefined && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(26,58,107,0.08)', color: '#1B3A6B' }}>
                            {cat._count.products} {t('products.productsCount')}
                          </span>
                        )}
                      </div>
                      <button onClick={() => startEdit(cat)} style={{ background: 'rgba(26,58,107,0.07)', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#1B3A6B' }}>
                        <Edit2 size={11}/> {t('common.edit')}
                      </button>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        <div className="flex justify-end p-5 pt-0">
          <button onClick={onClose} className="btn-secondary">{t('common.close')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Produit
const ProductModal = ({ product, categories, exchangeRate, onClose, onSaved }) => {
  const { t } = useTranslation()
  const tenant = useAuthStore(s => s.tenant)
  const isEdit = !!product
  const rate = Number(exchangeRate || 132)

  const hasServiceFeature = planHasFeature(tenant, 'service')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: product
      ? { ...product, priceHtg: Number(product.priceHtg), priceUsd: Number(product.priceUsd), costPriceHtg: Number(product.costPriceHtg) }
      : { isService: false, isActive: true, alertThreshold: 5, unit: 'pyes', priceHtg: '', priceUsd: '', costPriceHtg: '' }
  })
  const qc = useQueryClient()

  const handlePriceHtgChange = (e) => {
    const htg = Number(e.target.value)
    setValue('priceHtg', e.target.value)
    if (htg > 0) setValue('priceUsd', (htg / rate).toFixed(2))
  }

  const handlePriceUsdChange = (e) => {
    const usd = Number(e.target.value)
    setValue('priceUsd', e.target.value)
    if (usd > 0) setValue('priceHtg', (usd * rate).toFixed(2))
  }

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? productAPI.update(product.id, data) : productAPI.create(data),
    onSuccess: () => {
      toast.success(isEdit ? t('products.productUpdated') : t('products.productCreated'))
      qc.invalidateQueries(['products'])
      onSaved?.()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.')
  })

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-display font-bold">
            {isEdit ? t('products.editProduct') : t('products.newProduct')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('products.productName')} *</label>
              <input className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder={t('products.productNamePlaceholder')} {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">{t('products.code')}</label>
              <input className="input" placeholder={t('products.codePlaceholder')} {...register('code')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('products.category')}</label>
              <select className="input" {...register('categoryId')}>
                <option value="">{t('products.selectCategory')}</option>
                {categories && categories.length > 0
                  ? categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  : <option disabled>{t('products.noCategory')}</option>
                }
              </select>
              {(!categories || categories.length === 0) && (
                <p className="text-xs text-amber-500 mt-1">{t('products.createCategoryFirst')}</p>
              )}
            </div>
            <div>
              <label className="label">{t('products.unit')}</label>
              <select className="input" {...register('unit')}>
                <option value="unité">{t('products.units.unit')}</option>
                <option value="pyes">{t('products.units.piece')}</option>
                <option value="bout">{t('products.units.bottle')}</option>
                <option value="kg">{t('products.units.kg')}</option>
                <option value="litre">{t('products.units.liter')}</option>
                <option value="boîte">{t('products.units.box')}</option>
                <option value="paquet">{t('products.units.pack')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">{t('products.priceHtg')} *</label>
              <div className="relative">
                <input type="number" step="0.01" min="0"
                  className={`input pr-12 ${errors.priceHtg ? 'input-error' : ''}`}
                  placeholder="0.00"
                  {...register('priceHtg', { required: true, min: 0 })}
                  onChange={handlePriceHtgChange} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">HTG</span>
              </div>
            </div>
            <div>
              <label className="label">
                {t('products.priceUsd')}
                <span className="text-xs text-brand-500 font-normal ml-1">{t('products.automatic')}</span>
              </label>
              <div className="relative">
                <input type="number" step="0.01" min="0" className="input pr-12" placeholder="0.00"
                  {...register('priceUsd', { min: 0 })} onChange={handlePriceUsdChange} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">USD</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">1 USD = {rate.toFixed(2)} HTG</p>
            </div>
            <div>
              <label className="label">{t('products.costPrice')}</label>
              <div className="relative">
                <input type="number" step="0.01" min="0" className="input pr-12" placeholder="0.00"
                  {...register('costPriceHtg', { min: 0 })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">HTG</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('products.stockQuantity')}</label>
              <input type="number" step="0.001" min="0" className="input"
                placeholder="0" {...register('quantity', { min: 0 })} disabled={isEdit} />
              {isEdit && <p className="text-xs text-slate-400 mt-1">{t('products.adjustInStockPage')}</p>}
            </div>
            <div>
              <label className="label">{t('products.alertThreshold')}</label>
              <input type="number" step="0.001" min="0" className="input"
                placeholder="5" {...register('alertThreshold', { min: 0 })} />
            </div>
          </div>

          <div>
            <label className="label">{t('products.description')}</label>
            <textarea className="input resize-none" rows={2}
              placeholder={t('products.descriptionPlaceholder')} {...register('description')} />
          </div>

          <div className="flex items-center gap-6">
            {hasServiceFeature ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isService')}
                  className="w-4 h-4 rounded text-brand-600" />
                <span className="text-sm text-slate-600">{t('products.isService')}</span>
              </label>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(245,104,12,0.05)',
                border: '1px dashed rgba(245,104,12,0.25)',
              }}>
                <Lock size={13} style={{ color: '#f5680c', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Sèvis disponib sèlman nan{' '}
                <strong style={{ color: '#f5680c' }}>Plan Biznis, Premyum oswa Antrepriz</strong>
                </span>
              </div>
            )}
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isActive')}
                  className="w-4 h-4 rounded text-brand-600" />
                <span className="text-sm text-slate-600">{t('products.active')}</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? t('common.saving') : isEdit ? t('common.update') : t('products.createProduct')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Products Page
export default function ProductsPage() {
  const { t } = useTranslation()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const tenant = useAuthStore(s => s.tenant)
  const exchangeRate = Number(tenant?.exchangeRate || 132)

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, catFilter, page],
    queryFn: () => productAPI.getAll({ search, categoryId: catFilter, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const r = await productAPI.getCategories()
      return r.data?.categories || []
    },
    staleTime: 5 * 60 * 1000,
    retry: 2
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.remove(id),
    onSuccess: () => { toast.success(t('products.productDeleted')); qc.invalidateQueries(['products']) }
  })

  const fmt = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2 })

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          {/* ── Tit paj + bouton '?' ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">{t('products.title')}</h1>
            <HelpModal page="products" />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{data?.total || 0} {t('products.inCatalog')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: 'category' })} className="btn-secondary btn-sm">
            <Tag size={15} /> {t('products.category')}
          </button>
          <button onClick={() => setModal({ type: 'create' })} className="btn-primary">
            <Plus size={16} /> {t('products.newProduct')}
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={t('products.searchProducts')}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-48" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
          <option value="">{t('products.allCategories')}</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t('products.code')}</th>
              <th>{t('products.name')}</th>
              <th>{t('products.category')}</th>
              <th>{t('products.priceHtg')}</th>
              <th>{t('products.priceUsd')}</th>
              <th>{t('products.stock')}</th>
              <th>{t('products.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={8}>
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td></tr>
                ))
              : !data?.products?.length
              ? <tr><td colSpan={8}>
                  <div className="empty-state py-12">
                    <Package size={40} className="text-slate-300 mb-2" />
                    <p className="text-slate-500">{t('products.noProducts')}</p>
                  </div>
                </td></tr>
              : data.products.map(p => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs text-slate-500">{p.code || '—'}</td>
                    <td>
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        {p.isService && <span className="badge-blue text-[10px] px-1.5 py-0">{t('products.service')}</span>}
                      </div>
                    </td>
                    <td>
                      {p.category && (
                        <span className="badge-blue" style={{ color: p.category.color }}>
                          {p.category.name}
                        </span>
                      )}
                    </td>
                    <td className="font-mono font-medium">{fmt(p.priceHtg)} HTG</td>
                    <td className="font-mono text-slate-500">{fmt(p.priceUsd)} USD</td>
                    <td>
                      <span className={`font-mono font-bold text-sm ${Number(p.quantity) <= Number(p.alertThreshold) ? 'text-orange-600' : 'text-slate-700'}`}>
                        {Number(p.quantity).toLocaleString()} {p.unit}
                      </span>
                      {Number(p.quantity) <= Number(p.alertThreshold) && !p.isService && (
                        <AlertTriangle size={13} className="inline ml-1.5 text-orange-500" />
                      )}
                    </td>
                    <td>
                      <span className={p.isActive ? 'badge-green' : 'badge-gray'}>
                        {p.isActive ? t('products.active') : t('products.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ type: 'edit', product: p })} className="btn-ghost btn-sm p-2">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => {
                          if (confirm(t('products.deleteConfirm'))) deleteMutation.mutate(p.id)
                        }} className="btn-ghost btn-sm p-2 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {data?.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            {t('products.page')} {page} / {data.pages} · {data.total} {t('products.results')}
          </p>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm p-2">
              <ChevronLeft size={16} />
            </button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm p-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {modal?.type === 'category' && (
        <CategoryModal categories={categories} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'create' && (
        <ProductModal categories={categories} exchangeRate={exchangeRate}
          onClose={() => setModal(null)} onSaved={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <ProductModal product={modal.product} categories={categories} exchangeRate={exchangeRate}
          onClose={() => setModal(null)} onSaved={() => setModal(null)} />
      )}
    </div>
  )
}