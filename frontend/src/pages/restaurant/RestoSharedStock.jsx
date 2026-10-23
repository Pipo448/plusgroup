// src/pages/restaurant/RestoSharedStock.jsx
// ─── YON SÈL ESTÒK: pwodui POS (Pwodui / Estòk) ki vann nan restoran an tou ──
// Pa gen kopi: tab yo, kòmand an liy ak fakti yo itilize MENM pwodui a, kidonk
// estòk la bese menm kote a kit li vann nan POS la, kit li vann nan restoran an.
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Boxes, Check, Trash2, Plus } from 'lucide-react'
import { restoApi } from './restoApi'
import { Btn, Badge, Modal, Field, SearchField, DishVisual, ConfirmModal, useDebounced, money, fmt, cx } from './restoUI'

const KEYS = ['restaurant-shared', 'restaurant-kinds', 'restaurant-menu-search']

function AddModal({ theme, t, categories, onClose }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)
  const [picked, setPicked] = useState([])
  const drinkCat = categories.find((c) => c.kind === 'drink')
  const [categoryId, setCategoryId] = useState(drinkCat?.id || categories[0]?.id || '')
  const { data: results = [], isFetching } = useQuery({ queryKey: ['restaurant-stock-search', debounced], queryFn: () => restoApi.stockSearch(debounced) })
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const add = useMutation({
    mutationFn: () => restoApi.addShared(picked, categoryId || null),
    onSuccess: (r) => {
      toast.success(t('shared.added', { count: r.added || picked.length }))
      KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })
  return (
    <Modal theme={theme} title={t('shared.modalTitle')} onClose={onClose} size="lg"
      footer={<>
        <Btn variant="glass" onClick={onClose}>{t('common.cancel')}</Btn>
        <Btn icon={Check} disabled={!picked.length || add.isPending} loading={add.isPending} onClick={() => add.mutate()}>{t('shared.confirm', { count: picked.length })}</Btn>
      </>}>
      <div className="rs-form">
        <p className="rs-hint" style={{ margin: 0 }}>{t('shared.modalDesc')}</p>
        <SearchField value={search} onChange={setSearch} placeholder={t('shared.search')} hints={[t('shared.search')]} />
        <ul className={cx('rs-lines rs-stock-pick', isFetching && 'is-busy')}>
          {!results.length && !isFetching && <li className="rs-hint" style={{ padding: 12, textAlign: 'center' }}>{t('shared.empty')}</li>}
          {results.map((p) => {
            const on = picked.includes(p.id)
            return (
              <li key={p.id} className={cx('rs-line', on && 'is-picked', p.linked && 'is-linked')}>
                <button type="button" className="rs-stock-pick__btn" disabled={p.linked} onClick={() => toggle(p.id)} aria-pressed={on}>
                  <span className={cx('rs-check', on && 'is-on')}>{on && <Check size={13} strokeWidth={3} />}</span>
                  <DishVisual src={p.imageUrl} name={p.name} size={40} spin={false} />
                  <span className="rs-line__info">
                    <span className="rs-line__name">{p.name}</span>
                    <span className="rs-line__sub">{p.linked ? t('shared.already') : t('shared.stock', { qty: `${fmt(Number(p.quantity), 0)} ${p.unit || ''}` })}</span>
                  </span>
                  <span className="rs-line__amt">{money(Number(p.priceHtg), 0)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <Field label={t('shared.category')}>
          <select className="rs-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('shared.noCat')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.kind === 'drink' ? '🥤 ' : '🍽️ '}{c.name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

export default function RestoSharedStock({ theme, t, categories = [] }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [del, setDel] = useState(null)
  const { data: list = [] } = useQuery({ queryKey: ['restaurant-shared'], queryFn: restoApi.sharedProducts, staleTime: 30000 })
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const refresh = () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  const move = useMutation({ mutationFn: ({ id, categoryId }) => restoApi.updateShared(id, { categoryId }), onSuccess: refresh, onError: (e) => toast.error(e.response?.data?.message || t('common.error')) })
  const remove = useMutation({
    mutationFn: (id) => restoApi.removeShared(id),
    onSuccess: () => { setDel(null); toast.success(t('shared.removed')); refresh() },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })

  return (
    <section className="rs-card rs-glass rs-shared" style={{ marginBottom: 18 }}>
      <div className="rs-shared__head">
        <h2 className="rs-card__title" style={{ margin: 0 }}><Boxes size={18} /> {t('shared.title')} {list.length > 0 && <Badge tone="sky">{list.length}</Badge>}</h2>
        <Btn size="sm" variant="glass" icon={Plus} onClick={() => setOpen(true)}>{t('shared.add')}</Btn>
      </div>
      <p className="rs-hint" style={{ margin: '6px 0 0' }}>{t('shared.sub')}</p>
      {list.length > 0 && (
        <>
          <ul className="rs-lines" style={{ marginTop: 10 }}>
            {list.map((p, i) => {
              const out = Number(p.quantity) <= 0
              const low = !out && Number(p.quantity) <= Number(p.alertThreshold || 0)
              return (
                <li key={p.id} className="rs-line" style={{ '--d': `${Math.min(i, 10) * 35}ms` }}>
                  <DishVisual src={p.imageUrl} name={p.name} size={40} spin={false} />
                  <span className="rs-line__info">
                    <span className="rs-line__name">{p.name} <span className="rs-badge-drink" style={{ marginLeft: 4 }}>{t('shared.badge')}</span></span>
                    <span className="rs-line__sub">
                      {out ? <Badge tone="chili">{t('menu.out')}</Badge> : low ? <Badge tone="saffron">{t('menu.low')}</Badge> : null}
                      {t('shared.stock', { qty: `${fmt(Number(p.quantity), 0)} ${p.unit || ''}` })} · {money(Number(p.priceHtg), 0)}
                    </span>
                  </span>
                  <select className="rs-input rs-shared__cat" value={p.categoryId || ''} onChange={(e) => move.mutate({ id: p.id, categoryId: e.target.value || null })} aria-label={t('shared.category')}>
                    <option value="">{t('shared.noCat')}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="rs-icon-btn rs-icon-btn--danger" onClick={() => setDel(p)} aria-label={t('shared.remove')} title={t('shared.remove')}><Trash2 size={14} /></button>
                </li>
              )
            })}
          </ul>
          <p className="rs-hint" style={{ margin: '8px 0 0' }}>{t('shared.editHint')}</p>
        </>
      )}
      {open && <AddModal theme={theme} t={t} categories={categories.map((c) => ({ ...c, kind: catName[c.id]?.kind }))} onClose={() => setOpen(false)} />}
      <ConfirmModal open={!!del} theme={theme} title={t('shared.remove')} text={del?.name} confirmLabel={t('shared.remove')} cancelLabel={t('common.cancel')}
        loading={remove.isPending} onConfirm={() => remove.mutate(del.id)} onClose={() => setDel(null)} />
    </section>
  )
}