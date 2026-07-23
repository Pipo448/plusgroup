// src/pages/direct-quotes/DirectQuoteForm.jsx
import { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api, { clientAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { compressImage } from '../../utils/imageCompression'
import {
  Plus, Trash2, Search, ArrowLeft, Save, X, Lock, User, Camera, Image as ImageIcon,
} from 'lucide-react'

function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

const fmt2 = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Rechèch kliyan (opsyonèl — Devi Dirèk ka fèt san kliyan)
const ClientSearch = memo(function ClientSearch({ value, onChange }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState(false)
  const debouncedSearch = useDebounce(search, 400)

  const { data } = useQuery({
    queryKey: ['clients-search-dq', debouncedSearch],
    queryFn:  () => clientAPI.getAll({ search: debouncedSearch, limit: 8 }).then(r => r.data.clients),
    enabled:  debouncedSearch.length >= 1,
    staleTime: 30_000,
  })

  const handleSelect = useCallback((c) => {
    onChange(c)
    setSearch('')
    setOpen(false)
  }, [onChange])

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            className="input pl-9"
            placeholder={t('directQuotes.searchClient')}
            value={value ? value.name : search}
            onFocus={() => setOpen(true)}
            onChange={e => { setSearch(e.target.value); if (value) onChange(null) }}
          />
        </div>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="btn-ghost p-2">
            <X size={15}/>
          </button>
        )}
      </div>
      {open && !value && data?.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 max-h-56 overflow-y-auto">
          {data.map(c => (
            <button key={c.id} type="button" onClick={() => handleSelect(c)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0">
              <User size={14} className="text-slate-400"/>
              <div>
                <p className="text-sm font-medium text-slate-800">{c.name}</p>
                {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

// ── Liy atik (desktop)
// ── Atik (foto + deskripsyon + gwosè + kantite/pri/rabè + total)
// Yon sèl konpozan pou ni web ni mobil — pi klè ak foto/gwosè ladan l
const ItemEntry = memo(function ItemEntry({ item, index, onChange, onRemove }) {
  const { t } = useTranslation()
  const total = Math.max(0, Number(item.quantity || 0) * Number(item.unitPriceHtg || 0) - Number(item.discountAmt || 0))

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error(t('directQuotes.imageOnlyError')); return }
    if (file.size > 2 * 1024 * 1024) { toast.error(t('directQuotes.imageTooLarge')); return }
    try {
      // ✅ NOUVO — konprese foto atik la anvan l vin base64
      const compressed = await compressImage(file, { maxWidth: 800, quality: 0.75 })
      onChange(index, { imageUrl: compressed })
    } catch {
      toast.error(t('directQuotes.errorCreating'))
    }
  }

  return (
    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/40">
      <div className="flex items-start gap-3 mb-3">
        {/* ✅ NOUVO — Foto pwodui a (opsyonèl), klikab pou ajoute/chanje */}
        <label className="relative flex-shrink-0 cursor-pointer group">
          <div style={{
            width: 56, height: 56, borderRadius: 10,
            background: item.imageUrl ? `url(${item.imageUrl}) center/cover no-repeat` : '#eef1f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px dashed #cbd5e1', overflow: 'hidden',
          }}>
            {!item.imageUrl && <ImageIcon size={20} className="text-slate-400"/>}
          </div>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden"/>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center border-2 border-white">
            <Camera size={10} className="text-white"/>
          </div>
        </label>

        <div className="flex-1 min-w-0">
          <input className="input py-1.5 text-sm w-full" placeholder={t('directQuotes.itemNamePlaceholder')}
            value={item.description} onChange={e => onChange(index, { description: e.target.value })}/>
          <input className="input py-1 text-xs mt-1.5 w-32" placeholder={t('directQuotes.sizePlaceholder')}
            value={item.size || ''} onChange={e => onChange(index, { size: e.target.value })}/>
        </div>

        <button type="button" onClick={() => onRemove(index)} className="text-slate-300 hover:text-red-500 p-1 flex-shrink-0">
          <Trash2 size={15}/>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold">{t('directQuotes.quantity')}</label>
          <input type="number" min="0" step="0.01" className="input py-1.5 text-sm text-center font-mono"
            value={item.quantity} onFocus={e => e.target.select()}
            onChange={e => onChange(index, { quantity: e.target.value })}/>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold">{t('directQuotes.unitPrice')}</label>
          <input type="number" min="0" step="0.01" className="input py-1.5 text-sm text-right font-mono"
            value={item.unitPriceHtg} onFocus={e => e.target.select()}
            onChange={e => onChange(index, { unitPriceHtg: e.target.value })}/>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold">{t('directQuotes.discount')}</label>
          <input type="number" min="0" step="0.01" className="input py-1.5 text-sm text-right font-mono"
            value={item.discountAmt} onFocus={e => e.target.select()}
            onChange={e => onChange(index, { discountAmt: e.target.value })}/>
        </div>
      </div>
      <div className="text-right mt-2 text-sm font-mono font-bold text-slate-700">{fmt2(total)} HTG</div>
    </div>
  )
})

// ══════════════════════════════════════════════
export default function DirectQuoteForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { tenant, user } = useAuthStore()
  const isMobile = useIsMobile()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true

  const [client, setClient]           = useState(null)
  const [expiryDate, setExpiryDate]   = useState('')
  const [notes, setNotes]             = useState('')
  const [terms, setTerms]             = useState('')
  const [discountValue, setDiscountValue] = useState(0)
  const [items, setItems] = useState([
    { description: '', imageUrl: null, size: '', quantity: 1, unitPriceHtg: 0, discountAmt: 0 }
  ])

  const updateItem = useCallback((idx, changes) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it))
  }, [])
  const removeItem = useCallback((idx) => {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))
  }, [])
  const addItem = useCallback(() => {
    setItems(prev => [...prev, { description: '', imageUrl: null, size: '', quantity: 1, unitPriceHtg: 0, discountAmt: 0 }])
  }, [])

  const subtotal = items.reduce((sum, it) =>
    sum + Math.max(0, Number(it.quantity || 0) * Number(it.unitPriceHtg || 0) - Number(it.discountAmt || 0)), 0)
  const total = Math.max(0, subtotal - Number(discountValue || 0))

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/direct-quotes', payload).then(r => r.data),
    onSuccess: (res) => {
      toast.success(
        isAdmin
          ? t('directQuotes.createdSuccessAdmin')
          : t('directQuotes.createdSuccessCashier')
      )
      navigate(`/app/direct-quotes/${res.directQuote.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('directQuotes.errorCreating'))
  })

  const buildPayload = () => ({
    clientId: client?.id || null,
    clientSnapshot: client
      ? { name: client.name, phone: client.phone, address: client.address }
      : { name: t('directQuotes.noClient') },
    currency: 'HTG',
    exchangeRate: Number(tenant?.exchangeRate || 132),
    discountType: 'amount',
    discountValue: Number(discountValue || 0),
    expiryDate: expiryDate || null,
    notes, terms,
    items: items
      .filter(it => it.description.trim())
      .map(it => ({
        description: it.description.trim(),
        // ✅ NOUVO
        imageUrl: it.imageUrl || null,
        size: it.size ? it.size.trim() : null,
        quantity: Number(it.quantity || 0),
        unitPriceHtg: Number(it.unitPriceHtg || 0),
        discountAmt: Number(it.discountAmt || 0),
      })),
  })

  const validate = () => {
    const valid = items.filter(it => it.description.trim())
    if (!valid.length) { toast.error(t('directQuotes.addAtLeastOneItem')); return false }
    if (valid.some(it => Number(it.quantity) <= 0)) { toast.error(t('directQuotes.quantityMustBePositive')); return false }
    return true
  }

  // ✅ MODIFYE — Kesye a anrejistre DIRÈKTEMAN, san PIN. Yon notifikasyon
  // otomatik ap voye bay tout admin yo pou yo otorize devi a apre sa.
  const handleSaveClick = () => {
    if (!validate()) return
    mutation.mutate(buildPayload())
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/app/direct-quotes')} className="btn-ghost p-2">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="page-title">{t('directQuotes.newDirectQuote')}</h1>
            <p className="text-slate-500 text-sm">{t('directQuotes.subtitle')}</p>
          </div>
        </div>
        {!isMobile && (
          <button type="button" onClick={handleSaveClick} disabled={mutation.isPending} className="btn-primary">
            <Save size={16}/> {mutation.isPending ? t('directQuotes.saving') : t('directQuotes.createDirectQuote')}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="mb-5 p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-2 text-sm text-violet-700">
          <Lock size={15}/>
          {t('directQuotes.authWarningCashier')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          <div className="card p-5">
            <h3 className="section-title">{t('directQuotes.clientAndDate')}</h3>
            <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
              <div className={isMobile ? '' : 'col-span-2'}>
                <label className="label">{t('directQuotes.searchClient')}</label>
                <ClientSearch value={client} onChange={setClient}/>
              </div>
              <div>
                <label className="label">{t('directQuotes.expiryDate')}</label>
                <input type="date" className="input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}/>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-800">{t('directQuotes.itemsTitle')}</h3>
              <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                <Plus size={14}/> {t('directQuotes.addLine')}
              </button>
            </div>

            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, idx) => (
                <ItemEntry key={idx} item={item} index={idx} onChange={updateItem} onRemove={removeItem}/>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100">
              <button type="button" onClick={addItem}
                className="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-1.5 transition-colors">
                <Plus size={15}/> {t('directQuotes.addAnotherItem')}
              </button>
            </div>
          </div>

          <div className="card p-5">
            <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-4'}>
              <div>
                <label className="label">{t('directQuotes.notesForClient')}</label>
                <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}/>
              </div>
              <div>
                <label className="label">{t('directQuotes.generalTerms')}</label>
                <textarea className="input" rows={3} value={terms} onChange={e => setTerms(e.target.value)}/>
              </div>
            </div>
          </div>
        </div>

        {/* Rezime */}
        <div className="card p-5 h-fit lg:sticky lg:top-5">
          <h3 className="section-title">{t('directQuotes.summary')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t('directQuotes.subtotalLabel')}</span>
              <span className="font-mono">{fmt2(subtotal)} HTG</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <label className="label">{t('directQuotes.generalDiscount')}</label>
              <input type="number" min="0" step="0.01" className="input py-1.5 text-sm text-right font-mono w-full"
                value={discountValue} onFocus={e => e.target.select()} onChange={e => setDiscountValue(e.target.value)}
                placeholder="0.00"/>
            </div>
            <div className="border-t-2 border-brand-200 pt-3 mt-1">
              <div className="flex justify-between items-start">
                <span className="font-display font-bold text-slate-800 text-lg">{t('directQuotes.totalLabel')}</span>
                <p className="font-bold text-brand-700 text-xl font-mono">{fmt2(total)} HTG</p>
              </div>
            </div>
          </div>

          {isMobile && (
            <button type="button" onClick={handleSaveClick} disabled={mutation.isPending} className="btn-primary w-full mt-4" style={{ justifyContent: 'center' }}>
              <Save size={16}/> {mutation.isPending ? t('directQuotes.saving') : t('directQuotes.createDirectQuote')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
