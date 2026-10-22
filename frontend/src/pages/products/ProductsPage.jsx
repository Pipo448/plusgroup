// src/pages/products/ProductsPage.jsx — Plus Fit redesign
// ✅ KORIJE: lis la pa t rafrechi apre kreye/modifye/efase (invalidateQueries v5),
//            rechèch san debounce, to dola toujou 132, foto telefòn > 2 MB refize,
//            nivo pri vid ki te bloke anrejistreman an san mesaj
// ✅ NOUVO:  KPI, kategori an bouton koulè, ba stòk, mak "STÒK FINI", maj benefis an dirèk,
//            panye ak +/−, chwa Fakti OSWA Devi, Escape fèmen fenèt yo
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { compressImage } from '../../utils/imageCompression'
import {
  Plus, Search, Edit2, Trash2, Package, AlertTriangle, X, ChevronLeft, ChevronRight, Tag, Check, Lock,
  Camera, ShoppingCart, Layers, TrendingUp, Receipt, FileText, RefreshCw, Save, Minus,
} from 'lucide-react'
import HelpModal from '../../components/HelpModal'
import { useDraftCartStore } from '../../stores/draftCartStore'
import '../invoices/invoices.css'

const KNOWN_UNITS = ['unité', 'pyes', 'bout', 'kg', 'litre', 'boîte', 'paquet']
const COLORS = ['#1B3A6B', '#C0392B', '#27ae60', '#C9A84C', '#E8836A', '#8e44ad', '#16a085', '#2980b9', '#d35400', '#7f8c8d']
const GRADIENTS = [['#2D3FBF', '#1B2A8F'], ['#FF6B00', '#FF8C33'], ['#27ae60', '#16a085'], ['#8e44ad', '#6D28D9'],
  ['#C9A84C', '#8B6914'], ['#2980b9', '#1B2A8F'], ['#d35400', '#C0392B'], ['#16a085', '#2980b9']]

const fmt  = (n) => Number(n || 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('fr-HT', { maximumFractionDigits: 0 })
const tr = (t, key, fallback, opts) => { const v = t(key, opts); return v && v !== key ? v : fallback }

const shadeColor = (hex, amt) => {
  try {
    const c = hex.replace('#', '')
    const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
    const cl = (v) => Math.min(255, Math.max(0, v))
    return `rgb(${cl((n >> 16) + amt)},${cl(((n >> 8) & 0xff) + amt)},${cl((n & 0xff) + amt)})`
  } catch { return hex }
}
const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

const planHasFeature = (tenant, featureName) => {
  try {
    const f = tenant?.plan?.features
    if (!f) return false
    const features = Array.isArray(f) ? f : JSON.parse(String(f))
    const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const target = normalize(featureName)
    return features.some(feat => {
      const n = normalize(feat)
      return n.includes(target) || n.includes('tout nan biznis') || n.includes('tout nan premyum') || n.includes('tout fonksyon')
    })
  } catch { return false }
}

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t) }, [value, delay])
  return v
}

// ✅ Touch Escape fèmen fenèt la
function useEsc(onClose) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

function useCountUp(value, ms = 700) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0
    if (a === b) return
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return v
}

function Kpi({ label, value, icon: Icon, tone = '', delay = 0, money }) {
  const v = useCountUp(value)
  return (
    <div className={`iv-kpi ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="l"><Icon size={12}/> {label}</div>
      <div className="v">{money ? fmt0(v) : Math.round(v)}{money && <small>HTG</small>}</div>
    </div>
  )
}

const stockOf = (p) => {
  const qty = Number(p.quantity || 0), th = Number(p.alertThreshold || 0)
  if (p.isService) return { level: 'svc' }
  if (qty <= 0) return { level: 'out', qty, pct: 0, color: '#DC2626' }
  if (qty <= th) return { level: 'low', qty, pct: Math.max(8, Math.min(100, (qty / Math.max(th * 3, 1)) * 100)), color: '#D97706' }
  return { level: 'ok', qty, pct: Math.max(20, Math.min(100, (qty / Math.max(th * 3, 1)) * 100)), color: '#059669' }
}

// ════════════════════════════════════════════════════════════
// Modal Kategori
// ════════════════════════════════════════════════════════════
const CategoryModal = ({ categories, onClose }) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#1B3A6B' })
  useEsc(onClose)

  // ✅ KORIJE — { queryKey } (v5): anvan sa nouvo kategori a pa t parèt san rechaje paj la
  const refresh = () => { qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['products'] }) }
  const createMut = useMutation({
    mutationFn: (d) => productAPI.createCategory(d),
    onSuccess: () => { toast.success(tr(t, 'products.categoryCreated', 'Kategori kreye!')); refresh(); setForm({ name: '', color: '#1B3A6B' }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => productAPI.updateCategory(id, d),
    onSuccess: () => { toast.success(tr(t, 'products.categoryUpdated', 'Kategori mete ajou!')); refresh(); setEditItem(null); setForm({ name: '', color: '#1B3A6B' }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const busy = createMut.isPending || updateMut.isPending
  const handleSave = () => {
    if (!form.name.trim()) return toast.error(tr(t, 'products.categoryNameRequired', 'Non kategori a obligatwa.'))
    if (editItem) updateMut.mutate({ id: editItem.id, name: form.name.trim(), color: form.color })
    else createMut.mutate({ name: form.name.trim(), color: form.color })
  }

  return (
    <div className="iv-overlay sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 520 }}>
        <div className="iv-sheet-h">
          <h3><Tag size={18} style={{ verticalAlign: '-2px' }}/> {tr(t, 'products.manageCategories', 'Kategori yo')}</h3>
          <p>{categories?.length || 0} kategori</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b">
          <div style={{ padding: 14, borderRadius: 16, background: editItem ? 'rgba(255,200,61,.1)' : 'var(--soft)', border: `1px solid ${editItem ? 'rgba(201,168,76,.4)' : 'var(--line)'}` }}>
            <label className="iv-lbl">{editItem ? `Modifye: ${editItem.name}` : tr(t, 'products.newCategory', 'Nouvo kategori')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: form.color, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>
                {form.name ? form.name[0].toUpperCase() : <Tag size={16}/>}
              </div>
              <input className="iv-inp" placeholder={tr(t, 'products.categoryName', 'Non kategori a')} value={form.name} autoFocus
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSave()}/>
            </div>
            <div className="pd-colors" style={{ marginTop: 12 }}>
              {COLORS.map(c => (
                <button key={c} type="button" className={form.color === c ? 'on' : ''} style={{ background: c, '--cc': c }} onClick={() => setForm(f => ({ ...f, color: c }))}>
                  {form.color === c && <Check size={13} color="#fff" strokeWidth={3}/>}
                </button>
              ))}
              <label title="Lòt koulè">+<input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}/></label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {editItem && <button type="button" className="iv-act" style={{ flex: 1 }} onClick={() => { setEditItem(null); setForm({ name: '', color: '#1B3A6B' }) }}>Anile</button>}
              <button type="button" className="iv-btn-main" style={{ flex: 2, minHeight: 44 }} disabled={busy} onClick={handleSave}>
                {busy ? <RefreshCw size={15} className="spin"/> : editItem ? <Save size={15}/> : <Plus size={15}/>}
                {editItem ? 'Mete ajou' : tr(t, 'products.addCategory', 'Ajoute kategori')}
              </button>
            </div>
          </div>

          <div>
            <label className="iv-lbl">{tr(t, 'products.existingCategories', 'Kategori ki egziste')}</label>
            {!categories?.length ? (
              <p className="iv-note" style={{ textAlign: 'center', margin: 0 }}>{tr(t, 'products.noCategoriesYet', 'Poko gen kategori — kreye premye a anlè a.')}</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {categories.map((cat, i) => (
                  <div key={cat.id} className={`pd-catrow ${editItem?.id === cat.id ? 'on' : ''} a-slide`} style={{ animationDelay: `${i * 30}ms` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 9, background: cat.color || '#1B3A6B', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{cat.name?.[0]?.toUpperCase()}</span>
                      <b style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</b>
                      {cat._count?.products !== undefined && <span className="iv-pill muted">{cat._count.products}</span>}
                    </div>
                    <button type="button" className="iv-act" style={{ minHeight: 32, fontSize: 11 }} onClick={() => { setEditItem(cat); setForm({ name: cat.name, color: cat.color || '#1B3A6B' }) }}>
                      <Edit2 size={12}/> Modifye
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Lightbox foto
// ════════════════════════════════════════════════════════════
const ImageLightbox = ({ product, onClose }) => {
  const [zoomed, setZoomed] = useState(false)
  useEsc(onClose)
  return (
    <div className="iv-lightbox" onClick={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ overflow: 'hidden', borderRadius: 16, display: 'inline-block' }}>
          {/* ✅ KORIJE — pa gen flou/transisyon ankò: lè modal sa a louvri, imaj
              la DEJA se vrè gwo vèsyon an (nou tann l fini chaje AVAN nou louvri
              modal la — gade handleZoom). Yon sèl aparisyon, gwo, klè, net. */}
          <img src={product.imageUrl} alt={product.name} onClick={(e) => { e.stopPropagation(); setZoomed(z => !z) }}
            style={{
              width: 'min(92vw, 640px)', height: 'auto', display: 'block',
              transform: zoomed ? 'scale(2)' : 'scale(1)',
              transition: 'transform .25s',
              cursor: zoomed ? 'zoom-out' : 'zoom-in',
            }}/>
        </div>
        <p>{product.name} · {fmt(product.priceHtg)} HTG</p>
        <p style={{ fontSize: 11, opacity: .6, fontWeight: 600, margin: '4px 0 0' }}>Klike sou foto a pou {zoomed ? 'demaji' : 'zoome'} · Esc pou fèmen</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Modal Pwodwi
// ════════════════════════════════════════════════════════════
const ProductModal = ({ product, categories, exchangeRate, onClose, onSaved }) => {
  const { t } = useTranslation()
  const tenant = useAuthStore(s => s.tenant)
  const isEdit = !!product
  const rate = Number(exchangeRate || 132)
  const hasServiceFeature = planHasFeature(tenant, 'sevis')
  useEsc(onClose)

  const [imagePreview, setImagePreview] = useState(product?.imageUrl || null)
  const [imageChanged, setImageChanged] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Sèlman fichye imaj aksepte (JPEG, PNG, WebP).')
    // ✅ KORIJE — foto telefòn yo 3-8 MB; nou konprese yo, kidonk 2 MB te twò sevè
    if (file.size > 15 * 1024 * 1024) return toast.error('Foto a twò gwo — maksimòm 15 MB.')
    setImgBusy(true)
    try {
      // ✅ 2026-10-21 — Supabase sou plan peye kounye a. Anvan, 800px/75% isit la te
      // deja pèdi kalite a AVAN menm li rive bay backend — backend te ka monte limit
      // li (product.service.js) tout sa l vle, li t ap toujou re-konprese yon sous ki
      // deja flou. Kounye a nou voye yon sous pi gwo/pi klè (1600px/90%) soti nan
      // navigatè a; backend la ap toujou rezize li a 1280px/88% pou vèsyon final la,
      // men kounye a li gen vrè detay pou l travay avè l.
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.9 })
      setImagePreview(compressed)
      setImageChanged(true)
    } catch {
      toast.error('Erè pandan konprese foto a.')
    } finally {
      setImgBusy(false)
    }
  }

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    defaultValues: product
      ? { ...product, categoryId: product.categoryId || product.category?.id || '', priceHtg: Number(product.priceHtg), priceUsd: Number(product.priceUsd), costPriceHtg: Number(product.costPriceHtg),
          priceTiers: (product.priceTiers || []).slice().sort((a, b) => a.minQty - b.minQty).map(tt => ({
            minQty: tt.minQty, priceHtg: Number(tt.priceHtg), priceUsd: tt.priceUsd != null ? Number(tt.priceUsd) : '',
            totalPriceHtg: tt.totalPriceHtg != null ? Number(tt.totalPriceHtg) : '', label: tt.label || '',
          })) }
      : { isService: false, isActive: true, alertThreshold: 5, unit: 'pyes', priceHtg: '', priceUsd: '', costPriceHtg: '', priceTiers: [] },
  })
  const qc = useQueryClient()
  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({ control, name: 'priceTiers' })

  const isService = watch('isService')
  const priceHtg  = Number(watch('priceHtg') || 0)
  const costHtg   = Number(watch('costPriceHtg') || 0)
  const margin    = priceHtg > 0 && costHtg > 0 ? priceHtg - costHtg : null
  const marginPct = margin != null ? (margin / priceHtg) * 100 : null

  const handlePriceHtgChange = (e) => {
    const htg = Number(e.target.value)
    setValue('priceHtg', e.target.value, { shouldValidate: true })
    if (htg > 0) setValue('priceUsd', (htg / rate).toFixed(2))
  }
  const handlePriceUsdChange = (e) => {
    const usd = Number(e.target.value)
    setValue('priceUsd', e.target.value)
    if (usd > 0) setValue('priceHtg', (usd * rate).toFixed(2), { shouldValidate: true })
  }
  const handleTierHtgChange = (i, e) => {
    const htg = Number(e.target.value)
    setValue(`priceTiers.${i}.priceHtg`, e.target.value)
    if (htg > 0) setValue(`priceTiers.${i}.priceUsd`, (htg / rate).toFixed(2))
  }
  // ✅ Pri total pakè a → pri linite kalkile otomatikman (total egzak sove)
  const handleTierTotalChange = (i, e) => {
    const total = e.target.value
    setValue(`priceTiers.${i}.totalPriceHtg`, total)
    const totalNum = Number(total), minQty = Number(watch(`priceTiers.${i}.minQty`))
    if (totalNum > 0 && minQty > 0) {
      const unit = totalNum / minQty
      setValue(`priceTiers.${i}.priceHtg`, unit.toFixed(2))
      setValue(`priceTiers.${i}.priceUsd`, (unit / rate).toFixed(2))
    }
  }

  const mutation = useMutation({
    mutationFn: (data) => {
      let payload = imageChanged ? { ...data, imageUrl: imagePreview } : data
      payload = {
        ...payload,
        // ✅ Liy nivo vid yo retire (anvan sa yo te BLOKE anrejistreman an san okenn mesaj)
        priceTiers: (payload.priceTiers || [])
          .filter(tt => Number(tt.minQty) > 0 && Number(tt.priceHtg) > 0)
          .map(tt => ({
            minQty: Number(tt.minQty), priceHtg: Number(tt.priceHtg), priceUsd: tt.priceUsd ? Number(tt.priceUsd) : null,
            totalPriceHtg: tt.totalPriceHtg ? Number(tt.totalPriceHtg) : null, label: tt.label?.trim() || null,
          })),
      }
      return isEdit ? productAPI.update(product.id, payload) : productAPI.create(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? tr(t, 'products.productUpdated', 'Pwodwi mete ajou!') : tr(t, 'products.productCreated', 'Pwodwi kreye!'))
      qc.invalidateQueries({ queryKey: ['products'] })     // ✅ KORIJE (v5)
      qc.invalidateQueries({ queryKey: ['categories'] })
      onSaved?.()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onInvalid = (errs) => {
    const first = errs.name ? 'Non pwodwi a obligatwa.' : errs.categoryId ? (errs.categoryId.message || 'Chwazi yon kategori.') : errs.priceHtg ? 'Pri HTG a obligatwa.' : 'Tcheke chan ki an wouj yo.'
    toast.error(first)
  }

  const errStyle = (bad) => bad ? { borderColor: '#DC2626', boxShadow: '0 0 0 4px rgba(220,38,38,.08)' } : undefined

  return (
    <div className="iv-overlay sheet" onClick={(e) => e.target === e.currentTarget && !mutation.isPending && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 720 }}>
        <div className="iv-sheet-h">
          <h3><Package size={18} style={{ verticalAlign: '-2px' }}/> {isEdit ? tr(t, 'products.editProduct', 'Modifye pwodwi') : tr(t, 'products.newProduct', 'Nouvo pwodwi')}</h3>
          <p>{isEdit ? product.name : 'Ranpli enfòmasyon pwodwi a'}</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d), onInvalid)} className="iv-sheet-b">
          <div className="pd-img-up">
            <label className={`box ${imagePreview ? 'has' : ''}`} style={{ backgroundImage: imagePreview ? `url(${imagePreview})` : undefined, cursor: 'pointer' }}>
              {imgBusy ? <RefreshCw size={22} className="spin"/> : !imagePreview && <Camera size={26}/>}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }}/>
              {imagePreview && <button type="button" className="rm" onClick={(e) => { e.preventDefault(); setImagePreview(null); setImageChanged(true) }}><X size={13}/></button>}
            </label>
            <div>
              <b style={{ fontSize: 14 }}>Foto pwodwi a</b>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>Klike sou kare a pou {imagePreview ? 'chanje' : 'ajoute'} foto a.<br/>JPEG, PNG, WebP — li konprese otomatikman.</p>
            </div>
          </div>

          <div className="pd-form-grid">
            <div>
              <label className="iv-lbl">{tr(t, 'products.productName', 'Non pwodwi a')} *</label>
              <input className="iv-inp" style={errStyle(errors.name)} placeholder={tr(t, 'products.productNamePlaceholder', 'Egz: Diri 25 liv')} {...register('name', { required: true })}/>
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'products.code', 'Kòd')}</label>
              <input className="iv-inp" placeholder={tr(t, 'products.codePlaceholder', 'Egz: DR25')} {...register('code')}/>
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'products.category', 'Kategori')} *</label>
              <select className="iv-inp" style={errStyle(errors.categoryId)} {...register('categoryId', { required: tr(t, 'products.categoryRequired', 'Kategori obligatwa.') })}>
                <option value="">{tr(t, 'products.selectCategory', 'Chwazi yon kategori')}</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!categories?.length && <p style={{ fontSize: 11, color: 'var(--warn)', margin: '4px 0 0', fontWeight: 700 }}>{tr(t, 'products.createCategoryFirst', 'Kreye yon kategori anvan.')}</p>}
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'products.unit', 'Inite')}</label>
              <select className="iv-inp" {...register('unit')}>
                <option value="unité">{tr(t, 'products.units.unit', 'Inite')}</option>
                <option value="pyes">{tr(t, 'products.units.piece', 'Pyès')}</option>
                <option value="bout">{tr(t, 'products.units.bottle', 'Boutèy')}</option>
                <option value="kg">{tr(t, 'products.units.kg', 'Kg')}</option>
                <option value="litre">{tr(t, 'products.units.liter', 'Lit')}</option>
                <option value="boîte">{tr(t, 'products.units.box', 'Bwat')}</option>
                <option value="paquet">{tr(t, 'products.units.pack', 'Pake')}</option>
                {/* ✅ KORIJE — si inite pwodwi a pa nan lis la (egz. "sak"), li te pèdi lè w modifye pwodwi a */}
                {product?.unit && !KNOWN_UNITS.includes(product.unit) && <option value={product.unit}>{product.unit}</option>}
              </select>
            </div>
          </div>

          <div className="pd-form-grid three">
            <div>
              <label className="iv-lbl">{tr(t, 'products.priceHtg', 'Pri vann')} *</label>
              <div className="pd-suffix">
                <input type="number" step="0.01" min="0" className="iv-inp money" style={errStyle(errors.priceHtg)} placeholder="0.00"
                  {...register('priceHtg', { required: true, min: 0 })} onChange={handlePriceHtgChange} onFocus={e => e.target.select()}/>
                <span>HTG</span>
              </div>
            </div>
            <div>
              <label className="iv-lbl">USD <span style={{ color: 'var(--blue)', textTransform: 'none', letterSpacing: 0 }}>· otomatik</span></label>
              <div className="pd-suffix">
                <input type="number" step="0.01" min="0" className="iv-inp money" placeholder="0.00" {...register('priceUsd', { min: 0 })} onChange={handlePriceUsdChange} onFocus={e => e.target.select()}/>
                <span>USD</span>
              </div>
            </div>
            <div>
              <label className="iv-lbl">{tr(t, 'products.costPrice', 'Pri achte')}</label>
              <div className="pd-suffix">
                <input type="number" step="0.01" min="0" className="iv-inp money" placeholder="0.00" {...register('costPriceHtg', { min: 0 })} onFocus={e => e.target.select()}/>
                <span>HTG</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -8 }} className="mono">1 USD = {rate.toFixed(2)} HTG</div>

          {/* ✅ NOUVO — maj benefis an dirèk */}
          {margin != null && (
            <div className="pd-margin" style={{ background: margin > 0 ? 'var(--okBg)' : 'var(--badBg)', color: margin > 0 ? 'var(--ok)' : 'var(--bad)' }}>
              <span>{margin > 0 ? '📈 Benefis pa inite' : '⚠️ Ou ap vann pi ba pase pri achte a!'}</span>
              <span className="num" style={{ fontSize: 18 }}>{fmt(margin)} HTG · {marginPct.toFixed(0)}%</span>
            </div>
          )}

          {/* Pri an gwo */}
          <div style={{ border: '1.5px dashed var(--line2)', borderRadius: 16, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: tierFields.length ? 10 : 0 }}>
              <div>
                <b style={{ fontSize: 13 }}>Nivo pri an gwo</b>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Opsyonèl — 3+, Douzèn, Kès 24...</div>
              </div>
              <button type="button" className="iv-act" style={{ minHeight: 36 }} onClick={() => appendTier({ minQty: '', priceHtg: '', priceUsd: '', totalPriceHtg: '', label: '' })}>
                <Plus size={14}/> Nivo
              </button>
            </div>
            {tierFields.map((f, i) => (
              <div key={f.id} className="pd-tier">
                <div><label className="iv-lbl">Non</label><input className="iv-inp" placeholder="Douzèn" {...register(`priceTiers.${i}.label`)}/></div>
                <div><label className="iv-lbl">Qte ≥</label><input type="number" step="1" min="1" className="iv-inp money center" placeholder="12" {...register(`priceTiers.${i}.minQty`)} onFocus={e => e.target.select()}/></div>
                <div><label className="iv-lbl">Total pakè</label><input type="number" step="0.01" min="0" className="iv-inp money" placeholder="1750" {...register(`priceTiers.${i}.totalPriceHtg`)} onChange={e => handleTierTotalChange(i, e)} onFocus={e => e.target.select()}/></div>
                <div><label className="iv-lbl">Pri inite</label><input type="number" step="0.01" min="0" className="iv-inp money" placeholder="0.00" {...register(`priceTiers.${i}.priceHtg`)} onChange={e => handleTierHtgChange(i, e)} onFocus={e => e.target.select()}/></div>
                <div><label className="iv-lbl">USD</label><input type="number" step="0.01" min="0" className="iv-inp money" placeholder="0.00" {...register(`priceTiers.${i}.priceUsd`)} onFocus={e => e.target.select()}/></div>
                <button type="button" className="iv-act danger icon" style={{ minHeight: 40, width: 40 }} onClick={() => removeTier(i)} title="Retire nivo a"><Trash2 size={15}/></button>
              </div>
            ))}
            {tierFields.length > 0 && <p className="iv-note" style={{ margin: 0 }}>💡 Ranpli « Total pakè » (egz. 1750 pou 3) — pri inite a kalkile poukont li, epi fakti a ap bay total EGZAK la (1750,00).</p>}
          </div>

          {/* Stòk — kache pou sèvis */}
          {!isService && (
            <div className="pd-form-grid a-up">
              <div>
                <label className="iv-lbl">{tr(t, 'products.stockQuantity', 'Kantite an stòk')}</label>
                <input type="number" step="0.001" min="0" className="iv-inp money center" placeholder="0" {...register('quantity', { min: 0 })} disabled={isEdit} onFocus={e => e.target.select()}/>
                {isEdit && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0' }}>{tr(t, 'products.adjustInStockPage', 'Ajiste stòk la nan paj Stòk.')}</p>}
              </div>
              <div>
                <label className="iv-lbl">{tr(t, 'products.alertThreshold', 'Alèt stòk ba')}</label>
                <input type="number" step="0.001" min="0" className="iv-inp money center" placeholder="5" {...register('alertThreshold', { min: 0 })} onFocus={e => e.target.select()}/>
              </div>
            </div>
          )}

          <div>
            <label className="iv-lbl">{tr(t, 'products.description', 'Deskripsyon')}</label>
            <textarea className="iv-textarea" style={{ minHeight: 64 }} placeholder={tr(t, 'products.descriptionPlaceholder', 'Detay sou pwodwi a...')} {...register('description')}/>
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            {hasServiceFeature ? (
              <label className="pd-switch"><input type="checkbox" {...register('isService')}/><span className="sw"/> {tr(t, 'products.isService', 'Se yon sèvis (pa gen stòk)')}</label>
            ) : (
              <span className="iv-mode" style={{ background: 'rgba(255,107,0,.06)', borderColor: 'rgba(255,107,0,.25)', color: '#C2410C' }}><Lock size={11}/> Sèvis: Plan Biznis, Premyum oswa Antrepriz</span>
            )}
            {isEdit && <label className="pd-switch"><input type="checkbox" {...register('isActive')}/><span className="sw"/> {tr(t, 'products.active', 'Aktif')}</label>}
          </div>

          <div className="iv-sheet-f">
            <button type="button" className="iv-act" onClick={onClose} disabled={mutation.isPending}>Anile</button>
            <button type="submit" className="iv-btn-main" disabled={mutation.isPending || imgBusy}>
              {mutation.isPending ? <RefreshCw size={16} className="spin"/> : <Save size={16}/>}
              {mutation.isPending ? 'Ap sove...' : isEdit ? 'Mete ajou' : tr(t, 'products.createProduct', 'Kreye pwodwi')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Kat pwodwi
// ════════════════════════════════════════════════════════════
const ProductCard = ({ p, t, index, inCart, onEdit, onDelete, onAddToCart, onZoom }) => {
  const st = stockOf(p)
  const [g1, g2] = p.category?.color ? [p.category.color, shadeColor(p.category.color, -45)] : GRADIENTS[index % GRADIENTS.length]
  const tiers = p.priceTiers?.length || 0
  const out = st.level === 'out'

  return (
    <div className={`pd-card ${p.isActive === false ? 'off' : ''}`} style={{ animationDelay: `${Math.min(index, 14) * 40}ms` }}>
      <div className={`pd-media ${p.imageUrl ? 'zoom' : ''}`} style={{ '--g1': g1, '--g2': g2 }} onClick={() => p.imageUrl && onZoom(p)}>
        {p.imageUrl ? <div className="img" style={{ backgroundImage: `url(${p.imageUrl})` }}/> : <div className="ph"><b>{initials(p.name)}</b></div>}
        <div className="pd-tl">
          {p.isService && <span className="pd-tag svc">{tr(t, 'products.service', 'Sèvis')}</span>}
          {out && <span className="pd-tag bad">STÒK FINI</span>}
          {st.level === 'low' && <span className="pd-tag warn"><AlertTriangle size={10}/> Stòk ba</span>}
          {p.isActive === false && <span className="pd-tag">{tr(t, 'products.inactive', 'Inaktif')}</span>}
        </div>
        {tiers > 0 && <span className="pd-tiers">{tiers} nivo an gwo</span>}
      </div>

      <div className="pd-body">
        <div className="pd-name" title={p.name}>{p.name}</div>
        <div className="pd-meta">
          {p.category && <span className="cat" style={{ '--cc': p.category.color || '#1B2A8F' }}><i/>{p.category.name}</span>}
          {p.code && <span className="mono">{p.code}</span>}
        </div>
        <div className="pd-price">
          <span className="num">{fmt(p.priceHtg)}<small>HTG</small></span>
          {Number(p.priceUsd) > 0 && <span className="usd">${fmt(p.priceUsd)}</span>}
        </div>
        {st.level !== 'svc' && (
          <div className="pd-stock" style={{ '--sc': st.color }}>
            <span className="bar"><i style={{ width: `${st.pct}%` }}/></span>
            <b>{Number(p.quantity || 0).toLocaleString('fr-HT')}</b> {p.unit}
          </div>
        )}
      </div>

      <div className="pd-acts">
        <button className={`iv-act cart ${inCart ? 'in' : ''}`} disabled={out} onClick={() => onAddToCart(p)} title={out ? 'Pa gen stòk' : 'Ajoute nan panye'}>
          {inCart ? <Check size={14}/> : <ShoppingCart size={14}/>} <span>{out ? 'Fini' : inCart ? 'Nan panye' : 'Panye'}</span>
        </button>
        <button className="iv-act icon" onClick={() => onEdit(p)} title="Modifye"><Edit2 size={14}/></button>
        <button className="iv-act danger icon" onClick={() => onDelete(p)} title="Efase"><Trash2 size={14}/></button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Panye
// ════════════════════════════════════════════════════════════
const CartModal = ({ items, onClose, onQty, onRemove, onGo }) => {
  useEsc(onClose)
  const count = items.reduce((s, it) => s + Number(it.qty || 0), 0)
  const total = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0)
  return (
    <div className="iv-overlay sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="iv-sheet" style={{ maxWidth: 480 }}>
        <div className="iv-sheet-h" style={{ background: 'radial-gradient(120% 140% at 100% 0%, #FF8C33, #C2410C 70%)' }}>
          <h3><ShoppingCart size={18} style={{ verticalAlign: '-2px' }}/> Panye ({count})</h3>
          <p>{items.length} pwodwi diferan</p>
          <button className="x" onClick={onClose} aria-label="Fèmen"><X size={17}/></button>
        </div>
        <div className="iv-sheet-b">
          {!items.length ? (
            <p className="iv-note" style={{ textAlign: 'center', margin: 0 }}>Panye a vid.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {items.map((it, i) => {
                const p = it.product || {}
                return (
                  <div key={it.productId} className="pd-cart-it" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="iv-thumb" style={{ width: 44, height: 44, borderRadius: 11, backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : undefined }}>
                      {!p.imageUrl && <Package size={17} color="#1B2A8F"/>}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.description}</div>
                      <div className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>{fmt(Number(it.qty) * Number(it.unitPrice))} <small style={{ fontSize: 10, color: 'var(--muted)' }}>HTG</small></div>
                    </div>
                    <div className="pd-qty">
                      <button type="button" onClick={() => Number(it.qty) <= 1 ? onRemove(it.productId) : onQty(it.productId, Number(it.qty) - 1)}>{Number(it.qty) <= 1 ? <Trash2 size={13} color="#DC2626"/> : <Minus size={13}/>}</button>
                      <input type="number" min="1" value={it.qty} onChange={e => onQty(it.productId, e.target.value)} onFocus={e => e.target.select()}/>
                      <button type="button" onClick={() => onQty(it.productId, Number(it.qty) + 1)}><Plus size={13}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="iv-rtotal" style={{ marginTop: 0 }}>
                <span>Total estime</span>
                <span className="num">{fmt(total)}<small>HTG</small></span>
              </div>
              {/* ✅ NOUVO — ou chwazi: Fakti OSWA Devi (anvan sa > 5 atik te fòse Devi) */}
              {count > 5 && <p className="iv-note" style={{ margin: 0 }}>ℹ️ Plis pase 5 atik — nou rekòmande yon <b>Devi</b>, men ou ka fè yon fakti dirèk tou.</p>}
              <div className="pd-choice">
                <button type="button" className={count > 5 ? 'iv-act' : 'iv-btn-main'} style={{ minHeight: 52 }} onClick={() => onGo('/app/invoices/new')}>
                  <Receipt size={16}/> Kreye fakti
                </button>
                <button type="button" className={count > 5 ? 'iv-btn-main' : 'iv-act'} style={{ minHeight: 52, ...(count > 5 ? {} : {}) }} onClick={() => onGo('/app/quotes/new')}>
                  <FileText size={16}/> Kreye devi
                </button>
              </div>
            </>
          )}
          <button type="button" className="iv-link-btn" style={{ color: 'var(--muted)' }} onClick={onClose}>Kontinye chwazi pwodwi</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function ProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [zoomProduct, setZoomProduct] = useState(null)
  const [zoomLoading, setZoomLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 400)   // ✅ NOUVO — pa yon demand pou chak lèt

  const cartItems    = useDraftCartStore(s => s.items)
  const addProduct   = useDraftCartStore(s => s.addProduct)
  const setCartItems = useDraftCartStore(s => s.setItems)

  const tenant = useAuthStore(s => s.tenant)
  // ✅ KORIJE — to a soti nan exchangeRates.USD (tenant.exchangeRate pa egziste → toujou 132)
  const exchangeRate = Number(tenant?.exchangeRates?.USD || tenant?.exchangeRate || 132)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', debouncedSearch, catFilter, page],
    queryFn: () => productAPI.getAll({ search: debouncedSearch, categoryId: catFilter, page, limit: 15 }).then(r => r.data),
    placeholderData: (prev) => prev,   // ✅ react-query v5
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await productAPI.getCategories()).data?.categories || [],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.delete(id),
    onSuccess: (response) => {
      const msg = response?.data?.message || tr(t, 'products.productDeleted', 'Pwodwi efase.')
      if (response?.data?.soft) toast(msg, { icon: 'ℹ️', duration: 5000 })
      else toast.success(msg)
      qc.invalidateQueries({ queryKey: ['products'] })   // ✅ KORIJE (v5)
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè pandan siprime pwodwi a.'),
  })

  const handleDelete = (p) => { if (confirm(tr(t, 'products.deleteConfirm', `Efase "${p.name}"?`))) deleteMutation.mutate(p.id) }

  // ✅ KORIJE — lis pwodui a (GET /products) renvoye `thumbnailUrl` (100px/60%)
  // nan plas `imageUrl` pou ekonomize egress (gade product.service.js getAll()).
  // Konsa, modal zoom lan te toujou ap montre ti miniyati a olye vrè gwo imaj
  // la, kèlkeswa kalite konpresyon nou monte. Kounye a, lè w klike pou zoome,
  // nou louvri modal la touswit ak thumbnail la (rapid), epi nou chèche vrè
  // pwodui a endividyèlman (GET /products/:id) ki gen VRÈ `imageUrl` la, epi
  // nou ranplase l san moun pa wè okenn "flash".
  // ✅ KORIJE — pa louvri modal la ak thumbnail la pou apre ranplase l (sa te bay
  // yon "boza"/flou). Kounye a nou TANN vrè gwo vèsyon an (GET /products/:id)
  // FINI chaje anvan nou louvri modal la — yon sèl aparisyon, net, san flou.
  const handleZoom = async (p) => {
    setZoomLoading(true)
    try {
      const res  = await productAPI.getOne(p.id)
      const full = res.data?.product || res.data
      setZoomProduct(full?.imageUrl ? { ...p, imageUrl: full.imageUrl } : p)
    } catch {
      // ✅ filè sekirite — si rekèt la echwe, louvri kanmenm ak thumbnail la
      setZoomProduct(p)
    } finally {
      setZoomLoading(false)
    }
  }

  const inCart = useMemo(() => new Set(cartItems.map(it => it.productId)), [cartItems])
  const cartCount = cartItems.reduce((s, it) => s + Number(it.qty || 0), 0)
  const cartTotal = cartItems.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0)

  const addToCart = (p) => {
    // ✅ NOUVO — pa ajoute yon pwodwi ki pa gen stòk (fakti a t ap refize l apre)
    if (!p.isService && Number(p.quantity || 0) <= 0) return toast.error(`"${p.name}" pa gen stòk.`)
    if (inCart.has(p.id)) {
      setCartItems(cartItems.map(it => it.productId === p.id ? { ...it, qty: Number(it.qty || 0) + 1 } : it))
      toast.success(`+1 "${p.name}"`)
      return
    }
    addProduct(p)
    toast.success(`"${p.name}" ajoute nan panye.`)
  }
  const updateCartQty = (productId, qty) => setCartItems(cartItems.map(it => it.productId === productId ? { ...it, qty: Math.max(1, Number(qty) || 1) } : it))
  const removeFromCart = (productId) => setCartItems(cartItems.filter(it => it.productId !== productId))

  const products = data?.products || []
  const { lowCount, stockValue } = useMemo(() => products.reduce((a, p) => {
    const st = stockOf(p)
    if (st.level === 'low' || st.level === 'out') a.lowCount += 1
    if (!p.isService) a.stockValue += Number(p.quantity || 0) * Number(p.costPriceHtg || p.priceHtg || 0)
    return a
  }, { lowCount: 0, stockValue: 0 }), [products])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <div className="iv" style={{ paddingBottom: 96 }}>
      <section className="iv-hero">
        <div className="glow"/>
        <svg className="waves" viewBox="0 0 600 220" preserveAspectRatio="none">
          <path d="M -20 170 C 140 80, 340 230, 620 90" stroke="#FF6B00" strokeWidth="3" fill="none" opacity="0.55"/>
          <path d="M -20 200 C 160 120, 360 260, 620 130" stroke="#FFC83D" strokeWidth="2" fill="none" opacity="0.3"/>
        </svg>
        <div className="row">
          <div className="ico"><Package size={isMobile ? 20 : 24} color="#fff"/></div>
          <div className="grow">
            <p className="eyebrow">{tenant?.name || 'Plus Group'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1>{tr(t, 'products.title', 'Pwodwi')}</h1>
              <HelpModal page="products"/>
            </div>
            <p className="sub">Katalòg ou — pri, stòk ak foto. Ajoute nan panye pou fè yon fakti oswa yon devi.</p>
          </div>
          <div className="pd-tools newbtn">
            <button onClick={() => setModal({ type: 'category' })} className="iv-act" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.25)', minHeight: 46 }}>
              <Tag size={15}/> Kategori
            </button>
            <button onClick={() => setModal({ type: 'create' })} className="iv-btn-main pulse" style={{ flex: 1 }}>
              <Plus size={17}/> {tr(t, 'products.newProduct', 'Nouvo pwodwi')}
            </button>
          </div>
        </div>
        <div className="iv-kpis">
          <Kpi label="Pwodwi"            value={data?.total || 0} icon={Layers}        delay={80}/>
          <Kpi label="Valè stòk (paj la)" value={stockValue}       icon={TrendingUp}    delay={160} tone="gold" money/>
          <Kpi label="Stòk ba (paj la)"   value={lowCount}         icon={AlertTriangle} delay={240} tone={lowCount ? 'red' : 'green'}/>
        </div>
      </section>

      <div className="iv-bar a-up" style={{ animationDelay: '120ms' }}>
        <div className="iv-search">
          {isFetching && !isLoading ? <RefreshCw size={16} className="spin"/> : <Search size={16}/>}
          <input placeholder={tr(t, 'products.searchProducts', 'Chèche non oswa kòd pwodwi...')} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/>
        </div>
      </div>

      {/* ✅ NOUVO — kategori an bouton koulè (olye yon lis dewoulan) */}
      {categories?.length > 0 && (
        <div className="pd-cats a-up" style={{ animationDelay: '160ms' }}>
          <button type="button" className={`pd-cat ${!catFilter ? 'on' : ''}`} style={{ '--cc': '#0F1A5C' }} onClick={() => { setCatFilter(''); setPage(1) }}>
            <i/> Tout
          </button>
          {categories.map(c => (
            <button key={c.id} type="button" className={`pd-cat ${catFilter === c.id ? 'on' : ''}`} style={{ '--cc': c.color || '#1B2A8F' }}
              onClick={() => { setCatFilter(catFilter === c.id ? '' : c.id); setPage(1) }}>
              <i/> {c.name}{c._count?.products !== undefined && <small>{c._count.products}</small>}
            </button>
          ))}
        </div>
      )}

      <div className="pd-grid">
        {isLoading
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} className="pd-card" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="iv-sk" style={{ height: 'auto', aspectRatio: '4/3', borderRadius: 0 }}/>
                <div style={{ padding: 14 }}>{[80, 50, 60].map((w, j) => <div key={j} className="iv-sk" style={{ width: `${w}%`, marginBottom: 10 }}/>)}</div>
              </div>
            ))
          : !products.length
          ? (
            <div className="iv-table" style={{ gridColumn: '1 / -1' }}>
              <div className="iv-empty">
                <div className="art">
                  <div className="paper"><i/><i/><i/><i/><i/></div>
                  <div className="bubble">{debouncedSearch || catFilter ? <Search size={18}/> : <Plus size={20}/>}</div>
                </div>
                <h3>{debouncedSearch || catFilter ? 'Anyen pa koresponn' : tr(t, 'products.noProducts', 'Pa gen pwodwi')}</h3>
                <p>{debouncedSearch || catFilter ? 'Eseye yon lòt rechèch oswa yon lòt kategori.' : 'Ajoute premye pwodwi ou ak foto l ak pri l.'}</p>
                {!(debouncedSearch || catFilter) && <button className="iv-btn-main" onClick={() => setModal({ type: 'create' })}><Plus size={16}/> Nouvo pwodwi</button>}
              </div>
            </div>
          )
          : products.map((p, i) => (
              <ProductCard key={p.id} p={p} t={t} index={i} inCart={inCart.has(p.id)}
                onEdit={(prod) => setModal({ type: 'edit', product: prod })}
                onDelete={handleDelete} onAddToCart={addToCart} onZoom={handleZoom}/>
            ))}
      </div>

      {data?.pages > 1 && (
        <div className="iv-pager">
          <p>{tr(t, 'products.page', 'Paj')} <b style={{ color: 'var(--ink)' }}>{page}</b> / {data.pages} · <b style={{ color: 'var(--ink)' }}>{data.total}</b> pwodwi</p>
          <div className="btns">
            <button className="iv-pg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={17}/></button>
            <button className="iv-pg" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={17}/></button>
          </div>
        </div>
      )}

      {modal?.type === 'category' && <CategoryModal categories={categories} onClose={() => setModal(null)}/>}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <ProductModal product={modal.product} categories={categories} exchangeRate={exchangeRate} onClose={() => setModal(null)} onSaved={() => setModal(null)}/>
      )}
      {/* ✅ Pandan nou tann vrè gwo vèsyon an chaje (anvan modal la louvri) */}
      {zoomLoading && !zoomProduct && (
        <div className="iv-lightbox" style={{ cursor: 'default' }}>
          <RefreshCw size={30} className="spin" color="#fff"/>
        </div>
      )}
      {zoomProduct && <ImageLightbox product={zoomProduct} onClose={() => setZoomProduct(null)}/>}

      {cartCount > 0 && !cartOpen && (
        <button className="pd-fab" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={20}/>
          <span className="n">{cartCount}</span>
          <span className="lbl num">{fmt0(cartTotal)} HTG</span>
        </button>
      )}

      {cartOpen && (
        <CartModal items={cartItems} onClose={() => setCartOpen(false)} onQty={updateCartQty} onRemove={removeFromCart}
          onGo={(path) => { setCartOpen(false); navigate(path) }}/>
      )}
    </div>
  )
}