// src/pages/restaurant/RestaurantMenuPage.jsx
// ─── Meni restoran an (staff) — design Plus Resto: glas, kat 3D, plat ki flote ──
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { compressImage } from '../../utils/imageCompression'
import {
  Plus, Edit2, Trash2, UtensilsCrossed, AlertTriangle, ChevronLeft, ChevronRight,
  Camera, Layers, PackageX, Tag, Check, FileUp,
} from 'lucide-react'
import RestoImportMenu from './RestoImportMenu'
import { useRT } from './restoI18n'
import { restoApi } from './restoApi'
import {
  Stage, Hero, Stats, Stat, Btn, Badge, Chips, SearchField, DishVisual, Modal, ConfirmModal,
  Field, Empty, SkeletonGrid, ThemeToggle, Seg, useRestoTheme, useTilt, useDebounced, fmt, money, getTenantName, cx,
} from './restoUI'

// ══════════════════════════════════════════════
// Kat plat (3D tilt)
// ══════════════════════════════════════════════
function MenuCard({ item, index, onEdit, onDelete, t }) {
  const tilt = useTilt()
  const qty = Number(item.quantity)
  const out = qty <= 0
  const low = !out && qty <= Number(item.alertThreshold || 0)
  return (
    <article ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
      className={cx('rs-dish-card', out && 'is-out')} style={{ '--delay': `${Math.min(index, 12) * 60}ms` }}>
      <div className="rs-dish-card__inner">
        <div className="rs-dish-card__glare" aria-hidden="true" />
        <div className="rs-dish-card__art"><DishVisual src={item.imageUrl} name={item.name} size={128} halo={!out} spin={!out} /></div>
        <div className="rs-dish-card__body">
          {(item.category?.name || low || out) && (
            <div className="rs-dish-card__tags">
              {item.category?.name && <Badge tone="neutral" icon={Tag}>{item.category.name}</Badge>}
              {(low || out) && <Badge tone={out ? 'chili' : 'saffron'} icon={AlertTriangle}>{out ? t('menu.out') : t('menu.low')}</Badge>}
            </div>
          )}
          <h3 className="rs-dish-card__name" title={item.name}>{item.name}</h3>
          {item.description && <p className="rs-dish-card__desc">{item.description}</p>}
          <div className="rs-dish-card__foot">
            <span className="rs-price">{money(item.priceHtg)}</span>
            <span className="rs-dish-card__meta"><span>{t('menu.inStock', { count: fmt(qty, 0), unit: item.unit || '' })}</span></span>
          </div>
          <div className="rs-dish-card__actions">
            <Btn variant="glass" size="sm" icon={Edit2} block onClick={() => onEdit(item)}>{t('common.edit')}</Btn>
            <Btn variant="danger" size="sm" icon={Trash2} onClick={() => onDelete(item)} aria-label={t('common.delete')} />
          </div>
        </div>
      </div>
    </article>
  )
}

// ══════════════════════════════════════════════
// Modal plat (nouvo / modifye)
// ══════════════════════════════════════════════
function MenuItemModal({ item, categories, exchangeRate, theme, onClose, t }) {
  const isEdit = !!item
  const rate = Number(exchangeRate || 132)
  const qc = useQueryClient()
  const [imagePreview, setImagePreview] = useState(item?.imageUrl || null)
  const [imageChanged, setImageChanged] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: item
      ? { ...item, categoryId: item.categoryId || '', priceHtg: Number(item.priceHtg), priceUsd: item.priceUsd ? Number(item.priceUsd) : '', quantity: Number(item.quantity), alertThreshold: Number(item.alertThreshold) }
      : { alertThreshold: 5, unit: 'pòsyon', priceHtg: '', priceUsd: '', quantity: '', categoryId: '' },
  })
  const name = watch('name')

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error(t('menu.modal.imageOnly')); return }
    if (file.size > 2 * 1024 * 1024) { toast.error(t('menu.modal.imageTooLarge')); return }
    try {
      const compressed = await compressImage(file, { maxWidth: 800, quality: 0.75 })
      setImagePreview(compressed); setImageChanged(true)
    } catch { toast.error(t('common.error')) }
  }

  const priceReg = register('priceHtg', { required: true, min: 0 })
  const onPrice = (e) => {
    priceReg.onChange(e)
    const htg = Number(e.target.value)
    setValue('priceUsd', htg > 0 ? (htg / rate).toFixed(2) : '')
  }

  const mutation = useMutation({
    mutationFn: (d) => {
      const payload = {
        name: d.name, description: d.description || '', unit: d.unit || '',
        categoryId: d.categoryId || null,
        priceHtg: Number(d.priceHtg), priceUsd: d.priceUsd ? Number(d.priceUsd) : 0,
        quantity: Number(d.quantity), alertThreshold: Number(d.alertThreshold || 0),
        ...(imageChanged ? { imageUrl: imagePreview } : {}),
      }
      return isEdit ? restoApi.updateItem(item.id, payload) : restoApi.createItem(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? t('menu.updated') : t('menu.added'))
      qc.invalidateQueries({ queryKey: ['restaurant-menu'] })
      qc.invalidateQueries({ queryKey: ['restaurant-summary'] })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const err = (k) => (errors[k] ? t('menu.modal.required') : undefined)

  return (
    <Modal theme={theme} size="lg" onClose={onClose} closeLabel={t('common.close')}
      title={isEdit ? t('menu.modal.editTitle') : t('menu.modal.newTitle')}
      footer={<>
        <Btn variant="glass" onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn variant="primary" icon={Check} loading={mutation.isPending} onClick={handleSubmit((d) => mutation.mutate(d))}>
          {isEdit ? t('menu.modal.update') : t('menu.modal.add')}
        </Btn>
      </>}>
      <form className="rs-form" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <Field label={t('menu.modal.photo')}>
          <div className="rs-photo-pick">
            <div className="rs-photo-pick__prev"><DishVisual src={imagePreview} name={name} size={84} spin={false} /></div>
            <div className="rs-row">
              <label className="rs-file"><Camera size={15} /> {imagePreview ? t('menu.modal.changePhoto') : t('menu.modal.addPhoto')}
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
              {imagePreview && <Btn variant="danger" size="sm" onClick={() => { setImagePreview(null); setImageChanged(true) }}>{t('menu.modal.removePhoto')}</Btn>}
            </div>
          </div>
        </Field>

        <Field label={`${t('menu.modal.name')} *`} error={err('name')}>
          <input className={cx('rs-input', errors.name && 'is-error')} placeholder={t('menu.modal.namePh')} {...register('name', { required: true })} />
        </Field>

        <div className="rs-form-grid">
          <Field label={t('menu.modal.category')}>
            <select className="rs-select" {...register('categoryId')}>
              <option value="">{t('menu.noCategory')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t('menu.modal.unit')}>
            <input className="rs-input" placeholder={t('menu.modal.unitPh')} {...register('unit')} />
          </Field>
        </div>

        <div className="rs-form-grid">
          <Field label={`${t('menu.modal.priceHtg')} *`} error={err('priceHtg')}>
            <input type="number" step="0.01" min="0" className={cx('rs-input rs-mono', errors.priceHtg && 'is-error')} {...priceReg} onChange={onPrice} />
          </Field>
          <Field label={t('menu.modal.priceUsd')} hint={`1 USD = ${fmt(rate)} HTG`}>
            <input type="number" step="0.01" min="0" readOnly className="rs-input rs-mono" {...register('priceUsd')} />
          </Field>
        </div>

        <div className="rs-form-grid">
          <Field label={`${t('menu.modal.quantity')} *`} error={err('quantity')}>
            <input type="number" step="1" min="0" className={cx('rs-input rs-mono', errors.quantity && 'is-error')} {...register('quantity', { required: true, min: 0 })} />
          </Field>
          <Field label={t('menu.modal.alertThreshold')}>
            <input type="number" step="1" min="0" className="rs-input rs-mono" {...register('alertThreshold')} />
          </Field>
        </div>

        <Field label={t('menu.modal.description')}>
          <textarea rows={2} className="rs-textarea" placeholder={t('menu.modal.descriptionPh')} {...register('description')} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

// ══════════════════════════════════════════════
// Modal kategori
// ══════════════════════════════════════════════
function CategoriesModal({ categories, theme, onClose, t }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['restaurant-categories'] }); qc.invalidateQueries({ queryKey: ['restaurant-menu'] }) }
  const onErr = (e) => toast.error(e.response?.data?.message || t('common.error'))

  const [kind, setKind] = useState('food')
  const refreshKinds = () => { refresh(); qc.invalidateQueries({ queryKey: ['restaurant-kinds'] }) }
  const create = useMutation({ mutationFn: () => restoApi.createCategory({ name: name.trim(), kind }), onSuccess: () => { setName(''); setKind('food'); toast.success(t('menu.cats.saved')); refreshKinds() }, onError: onErr })
  // ✅ NOUVO — chanje kalite yon kategori (Manje ↔ Bwason)
  const setCatKind = useMutation({ mutationFn: ({ id, k }) => restoApi.updateCategory(id, { kind: k }), onSuccess: () => { toast.success(t('menu.cats.saved')); refreshKinds() }, onError: onErr })
  const update = useMutation({ mutationFn: ({ id, n }) => restoApi.updateCategory(id, { name: n }), onSuccess: () => { setEditing(null); toast.success(t('menu.cats.saved')); refresh() }, onError: onErr })
  const remove = useMutation({ mutationFn: (id) => restoApi.deleteCategory(id), onSuccess: () => { setToDelete(null); toast.success(t('menu.cats.deleted')); refresh() }, onError: onErr })

  return (
    <Modal theme={theme} title={t('menu.cats.title')} subtitle={t('menu.cats.subtitle')} onClose={onClose} closeLabel={t('common.close')}>
      <form className="rs-col" style={{ gap: 8, marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate() }}>
        <div className="rs-row" style={{ flexWrap: 'nowrap' }}>
          <input className="rs-input" value={name} onChange={(e) => { setName(e.target.value); if (/(bwason|boisson|drink|bebida|ji\b|jus|bar\b|byè|biere|beer|soda|cocktail)/i.test(e.target.value)) setKind('drink') }} placeholder={t('menu.cats.namePh')} />
          <Btn type="submit" variant="primary" icon={Plus} loading={create.isPending} disabled={!name.trim()} aria-label={t('common.add')} />
        </div>
        <Seg value={kind} onChange={setKind} options={[{ id: 'food', label: `🍽️ ${t('kind.food')}` }, { id: 'drink', label: `🥤 ${t('kind.drink')}` }]} />
        <span className="rs-hint">{t('kind.catHint')}</span>
      </form>
      {!categories.length ? <p className="rs-hint" style={{ textAlign: 'center', padding: 18 }}>{t('menu.cats.empty')}</p> : (
        <ul className="rs-lines">
          {categories.map((c, i) => (
            <li key={c.id} className="rs-line" style={{ '--d': `${i * 40}ms` }}>
              {editing?.id === c.id ? (
                <form className="rs-row" style={{ flex: 1, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (editing.n.trim()) update.mutate({ id: c.id, n: editing.n.trim() }) }}>
                  <input className="rs-input" autoFocus value={editing.n} onChange={(e) => setEditing({ ...editing, n: e.target.value })} />
                  <Btn type="submit" variant="success" size="sm" icon={Check} loading={update.isPending} aria-label={t('common.save')} />
                </form>
              ) : (
                <>
                  <span className="rs-line__info"><span className="rs-line__name">{c.name}</span><span className="rs-line__sub">{c.kind === 'drink' ? t('kind.drinkHint') : t('kind.foodHint')}</span></span>
                  <button type="button" className={cx('rs-kind', c.kind === 'drink' && 'is-drink')} disabled={setCatKind.isPending}
                    onClick={() => setCatKind.mutate({ id: c.id, k: c.kind === 'drink' ? 'food' : 'drink' })} title={t('kind.label')}>
                    {c.kind === 'drink' ? `🥤 ${t('kind.drink')}` : `🍽️ ${t('kind.food')}`}
                  </button>
                  <button type="button" className="rs-icon-btn" onClick={() => setEditing({ id: c.id, n: c.name })} aria-label={t('common.edit')}><Edit2 size={14} /></button>
                  <button type="button" className="rs-icon-btn rs-icon-btn--danger" onClick={() => setToDelete(c)} aria-label={t('common.delete')}><Trash2 size={14} /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmModal open={!!toDelete} theme={theme} title={t('menu.cats.confirmDelete', { name: toDelete?.name })}
        confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </Modal>
  )
}

// ══════════════════════════════════════════════
// PAJ PRENSIPAL
// ══════════════════════════════════════════════
export default function RestaurantMenuPage() {
  const { t } = useRT()
  const [theme, toggleTheme] = useRestoTheme()
  const tenant = useAuthStore((s) => s.tenant)
  const tenantName = getTenantName(tenant)
  const exchangeRate = Number(tenant?.exchangeRate || tenant?.settings?.exchangeRate || 132)
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // {type:'item', item?} | {type:'cats'}
  const [toDelete, setToDelete] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-menu', debounced, catFilter, page],
    queryFn: () => restoApi.menu({ search: debounced, categoryId: catFilter, page, limit: 20 }),
    placeholderData: keepPreviousData,
  })
  const { data: categories = [] } = useQuery({ queryKey: ['restaurant-categories'], queryFn: restoApi.categories, staleTime: 5 * 60 * 1000 })
  const { data: summaryData } = useQuery({ queryKey: ['restaurant-summary'], queryFn: restoApi.summary, staleTime: 60 * 1000, retry: false })
  const summary = summaryData?.summary

  const items = useMemo(() => data?.products || [], [data])
  const outCount = useMemo(() => items.filter((i) => Number(i.quantity) <= 0).length, [items])

  const deleteMutation = useMutation({
    mutationFn: (id) => restoApi.deleteItem(id),
    onSuccess: (res) => {
      toast.success(res?.message || t('menu.deleted'))
      setToDelete(null)
      qc.invalidateQueries({ queryKey: ['restaurant-menu'] })
      qc.invalidateQueries({ queryKey: ['restaurant-summary'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  // ✅ NOUVO — detekte kategori an doub (egz. enpòtasyon ki te fèt 2 fwa) epi pwopoze netwaye yo
  const hasDupes = useMemo(() => {
    const names = categories.map((c) => String(c.name || '').trim().toLowerCase())
    return new Set(names).size !== names.length
  }, [categories])
  const [confirmDedupe, setConfirmDedupe] = useState(false)
  const dedupe = useMutation({
    mutationFn: () => restoApi.dedupeMenu(),
    onSuccess: (res) => {
      const r = res.result || {}
      toast.success(t('imp.dedupeDone', { items: r.itemsRemoved || 0, cats: r.categoriesMerged || 0 }), { duration: 6000 })
      setConfirmDedupe(false)
      ;['restaurant-menu', 'restaurant-categories', 'restaurant-summary', 'restaurant-kinds'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  const chipItems = [{ id: '', label: t('common.all') }, ...categories.map((c) => ({ id: c.id, label: c.name }))]

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap">
        <Hero overline={tenantName} title={t('menu.title')} subtitle={t('menu.subtitle')} icon={UtensilsCrossed}
          actions={<>
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn variant="glass" icon={Layers} onClick={() => setModal({ type: 'cats' })}>{t('menu.manageCategories')}</Btn>
            <Btn variant="glass" icon={FileUp} onClick={() => setModal({ type: 'import' })}>{t('imp.btn')}</Btn>
            <Btn variant="primary" icon={Plus} onClick={() => setModal({ type: 'item' })}>{t('menu.newItem')}</Btn>
          </>}>
          <Stats>
            <Stat index={0} icon={UtensilsCrossed} tone="paprika" label={t('menu.stats.items')} value={summary?.menuItems ?? data?.total ?? items.length} />
            <Stat index={1} icon={Layers} tone="sky" label={t('menu.stats.categories')} value={summary?.categories ?? categories.length} />
            <Stat index={2} icon={AlertTriangle} tone="saffron" label={t('menu.stats.lowStock')} value={summary?.lowStock ?? 0} />
            <Stat index={3} icon={PackageX} tone="chili" label={t('menu.stats.outStock')} value={outCount} />
          </Stats>
        </Hero>

        {hasDupes && (
          <div className="rs-alert rs-alert--warn" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <AlertTriangle size={16} /> <span style={{ flex: 1, minWidth: 200 }}>{t('imp.dedupeFound')}</span>
            <Btn size="sm" onClick={() => setConfirmDedupe(true)}>{t('imp.dedupe')}</Btn>
          </div>
        )}
        <ConfirmModal open={confirmDedupe} theme={theme} title={t('imp.dedupe')} text={t('imp.dedupeConfirm')} confirmLabel={t('imp.dedupe')} cancelLabel={t('common.cancel')}
          loading={dedupe.isPending} onConfirm={() => dedupe.mutate()} onClose={() => setConfirmDedupe(false)} />

        <div className="rs-toolbar">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} hints={[t('menu.searchPh')]} />
          <Chips items={chipItems} value={catFilter} onChange={(id) => { setCatFilter(id); setPage(1) }} label={t('menu.modal.category')} />
        </div>

        {isLoading ? <SkeletonGrid count={8} height={250} /> : !items.length ? (
          <Empty icon={UtensilsCrossed} title={search || catFilter ? t('menu.emptySearch') : t('menu.empty')}
            text={search || catFilter ? null : t('menu.emptyText')}
            action={!search && !catFilter && <Btn icon={Plus} onClick={() => setModal({ type: 'item' })}>{t('menu.newItem')}</Btn>} />
        ) : (
          <div className="rs-grid">
            {items.map((item, i) => (
              <MenuCard key={item.id} item={item} index={i} t={t}
                onEdit={(it) => setModal({ type: 'item', item: it })} onDelete={setToDelete} />
            ))}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="rs-pager">
            <Btn variant="glass" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="<" />
            <span>{t('menu.page', { page: data.page, pages: data.pages })}</span>
            <Btn variant="glass" size="sm" icon={ChevronRight} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label=">" />
          </div>
        )}
      </div>

      {modal?.type === 'item' && (
        <MenuItemModal item={modal.item} categories={categories} exchangeRate={exchangeRate} theme={theme} t={t} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'cats' && <CategoriesModal categories={categories} theme={theme} t={t} onClose={() => setModal(null)} />}
      {modal?.type === 'import' && <RestoImportMenu open theme={theme} t={t} onClose={() => setModal(null)} />}
      <ConfirmModal open={!!toDelete} theme={theme} title={t('menu.confirmDeleteTitle')} text={t('menu.confirmDelete', { name: toDelete?.name })}
        confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </Stage>
  )
}