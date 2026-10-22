// src/pages/restaurant/RestaurantReservationsPage.jsx
// ─── Rezèvasyon tab (staff): an liy + nan telefòn ─────────────────────
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CalendarDays, Plus, Users, Phone, MessageCircle, Armchair, ChevronLeft, ChevronRight,
  CheckCircle2, Hourglass, Globe, UserRound, RefreshCw, Send,
} from 'lucide-react'
import { restaurantTablesAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi, waLink, waNumber } from './restoApi'
import {
  Stage, Hero, Stats, Stat, Btn, Badge, Modal, Field, Empty, SkeletonGrid, ThemeToggle, Stepper,
  useRestoTheme, getTenantName, haitiToday, dayParts, cx,
} from './restoUI'

const TONE = { an_atant: 'saffron', konfime: 'sky', chita: 'paprika', fini: 'basil', anile: 'chili', pa_vini: 'neutral' }
const ACTIONS = {
  an_atant: ['konfime', 'anile'],
  konfime: ['chita', 'pa_vini', 'anile'],
  chita: ['fini'],
  fini: [], anile: ['konfime'], pa_vini: ['konfime'],
}
const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }

function ResvRow({ r, index, onOpen, t }) {
  return (
    <button type="button" className="rs-resv" style={{ '--delay': `${Math.min(index, 12) * 50}ms` }} onClick={() => onOpen(r)}>
      <div className="rs-resv__time"><b>{r.time}</b><span>{t('common.people', { count: r.partySize })}</span></div>
      <div className="rs-resv__body">
        <span className="rs-resv__name">{r.customerName}</span>
        <span className="rs-resv__meta">
          <span><Phone size={12} /> {r.customerPhone}</span>
          {r.tableName && <span><Armchair size={12} /> {r.tableName}</span>}
          <span>{r.source === 'online' ? <Globe size={12} /> : <UserRound size={12} />} {t(`resv.source.${r.source}`)}</span>
        </span>
      </div>
      <Badge tone={TONE[r.status]} dot pulse={r.status === 'an_atant'}>{t(`resv.status.${r.status}`)}</Badge>
    </button>
  )
}

function ResvDetail({ r, tables, theme, tenantName, onClose, onChanged, t }) {
  const [tableId, setTableId] = useState(r.tableId || '')
  const [notes, setNotes] = useState(r.notes || '')
  const qc = useQueryClient()
  const wa = waNumber(r.customerPhone)
  const m = useMutation({
    mutationFn: async (payload) => {
      const res = await restoApi.updateReservation(r.id, payload)
      // Chita kliyan an → louvri tab la otomatikman pou sèvè a ka pran kòmand lan
      if (payload.status === 'chita' && payload.tableId) {
        const tb = tables.find((x) => String(x.id) === String(payload.tableId))
        if (tb?.kòmandAktif) toast(t('resv.tableBusy'))
        else if (tb) {
          await restaurantTablesAPI.openOrder(tb.id)
          qc.invalidateQueries({ queryKey: ['restaurant-tables'] })
          toast.success(t('resv.tableOpened', { table: tb.name, name: r.customerName }))
        }
      }
      return res
    },
    onSuccess: (res) => { toast.success(t('resv.updated')); onChanged(res.reservation) },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  })
  const save = (extra = {}) => {
    const tb = tables.find((x) => String(x.id) === String(tableId))
    m.mutate({ tableId: tableId || null, tableName: tb ? tb.name : '', notes, ...extra })
  }
  const { dow, num, mon } = dayParts(t, r.date)
  const waText = t('resv.waConfirm', { name: r.customerName.split(' ')[0], resto: tenantName, date: `${dow} ${num} ${mon}`, time: r.time, people: r.partySize, code: r.code })
  return (
    <Modal theme={theme} onClose={onClose} closeLabel={t('common.close')} title={r.customerName}
      subtitle={`${r.code} · ${dow} ${num} ${mon} · ${r.time} · ${t('common.people', { count: r.partySize })}`}
      footer={<>
        {(ACTIONS[r.status] || []).map((s) => (
          <Btn key={s} variant={s === 'anile' || s === 'pa_vini' ? 'danger' : s === 'fini' ? 'success' : 'primary'} loading={m.isPending && m.variables?.status === s}
            onClick={() => save({ status: s })}>{t(`resv.actions.${s}`)}</Btn>
        ))}
        <Btn variant="glass" onClick={() => save()} loading={m.isPending && !m.variables?.status}>{t('common.save')}</Btn>
      </>}>
      <div className="rs-row" style={{ marginBottom: 14 }}>
        <Badge tone={TONE[r.status]} dot>{t(`resv.status.${r.status}`)}</Badge>
        <a className="rs-btn rs-btn--glass rs-btn--sm" href={`tel:${r.customerPhone}`}><Phone size={15} /> {t('orders.actions.call')}</a>
        {wa && ['an_atant', 'konfime'].includes(r.status) && <a className="rs-btn rs-btn--primary rs-btn--sm" href={waLink(r.customerPhone, waText)} target="_blank" rel="noreferrer"><Send size={15} /> {t('resv.notify')}</a>}
        {wa && <a className="rs-btn rs-btn--glass rs-btn--sm" href={waLink(r.customerPhone)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={15} /></a>}
      </div>
      <div className="rs-form">
        <Field label={t('resv.assign')}>
          <select className="rs-select" value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">{t('resv.noTable')}</option>
            {tables.map((tb) => <option key={tb.id} value={tb.id}>{tb.name}{tb.zone ? ` — ${tb.zone}` : ''} ({t('tables.seats', { count: tb.seats })}){tb.kòmandAktif ? ` · ${t('tables.busy')}` : ''}</option>)}
          </select>
        </Field>
        <Field label={t('common.notes')}>
          <textarea className="rs-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {r.customerEmail && <p className="rs-hint">{r.customerEmail}</p>}
      </div>
    </Modal>
  )
}

function NewResvModal({ date, theme, onClose, onSaved, t, te }) {
  const [f, setF] = useState({ name: '', phone: '', partySize: 2, date, time: '19:00', notes: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })
  const m = useMutation({
    mutationFn: () => restoApi.createReservation({ customerName: f.name, customerPhone: f.phone, partySize: f.partySize, date: f.date, time: f.time, notes: f.notes }),
    onSuccess: (res) => { toast.success(t('resv.created')); onSaved(res.reservation) },
    onError: (e) => toast.error(te(e.response?.data?.code)),
  })
  return (
    <Modal theme={theme} title={t('resv.modal.title')} onClose={onClose} closeLabel={t('common.close')}
      footer={<><Btn variant="glass" onClick={onClose}>{t('common.cancel')}</Btn><Btn icon={CheckCircle2} loading={m.isPending} onClick={() => m.mutate()}>{t('resv.modal.create')}</Btn></>}>
      <form className="rs-form" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <div className="rs-form-grid">
          <Field label={t('resv.modal.name')}><input className="rs-input" autoFocus value={f.name} onChange={set('name')} /></Field>
          <Field label={t('resv.modal.phone')}><input className="rs-input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        </div>
        <div className="rs-form-grid">
          <Field label={t('resv.modal.date')}><input type="date" className="rs-input" value={f.date} onChange={set('date')} /></Field>
          <Field label={t('resv.modal.time')}><input type="time" className="rs-input" value={f.time} onChange={set('time')} /></Field>
        </div>
        <Field label={t('resv.modal.party')}><div><Stepper value={f.partySize} min={1} max={100} onChange={(v) => setF({ ...f, partySize: v })} /></div></Field>
        <Field label={t('resv.modal.notes')}><textarea className="rs-textarea" rows={2} value={f.notes} onChange={set('notes')} /></Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

export default function RestaurantReservationsPage() {
  const { t, te } = useRT()
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant } = useAuthStore()
  const tenantName = getTenantName(tenant)
  const qc = useQueryClient()
  const today = haitiToday()
  const [start, setStart] = useState(today)
  const [date, setDate] = useState(today)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const end = addDays(start, 13)

  const { data: list = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-reservations', start, end],
    queryFn: () => restoApi.reservations({ from: start, to: end }),
    refetchInterval: 60000,
  })
  const { data: tablesData } = useQuery({ queryKey: ['restaurant-tables'], queryFn: () => restaurantTablesAPI.getTables(), staleTime: 60000 })
  const tables = tablesData?.data?.tables || []

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(start, i)), [start])
  const countBy = useMemo(() => list.reduce((acc, r) => { if (!['anile', 'pa_vini'].includes(r.status)) acc[r.date] = (acc[r.date] || 0) + 1; return acc }, {}), [list])
  const dayList = list.filter((r) => r.date === date)
  const active = dayList.filter((r) => !['anile', 'pa_vini'].includes(r.status))
  const guests = active.reduce((s, r) => s + r.partySize, 0)
  const pending = dayList.filter((r) => r.status === 'an_atant').length

  const onChanged = (r) => {
    setSelected(null)
    qc.setQueryData(['restaurant-reservations', start, end], (old = []) => old.map((x) => (x.id === r.id ? r : x)))
    qc.invalidateQueries({ queryKey: ['restaurant-summary'] })
  }
  const shift = (n) => { const s = addDays(start, n); setStart(s < today ? today : s); setDate(s < today ? today : s) }

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap">
        <Hero overline={tenantName} title={t('resv.title')} subtitle={t('resv.subtitle')} icon={CalendarDays}
          actions={<>
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn variant="glass" icon={RefreshCw} onClick={() => refetch()} className={isRefetching ? 'rs-spinning' : undefined} aria-label={t('common.refresh')} />
            <Btn icon={Plus} onClick={() => setCreating(true)}>{t('resv.new')}</Btn>
          </>}>
          <Stats>
            <Stat index={0} icon={CalendarDays} tone="paprika" label={t('resv.stats.count')} value={active.length} />
            <Stat index={1} icon={Users} tone="sky" label={t('resv.stats.guests')} value={guests} />
            <Stat index={2} icon={Hourglass} tone="saffron" label={t('resv.stats.pending')} value={pending} />
          </Stats>
        </Hero>

        <div className="rs-row" style={{ flexWrap: 'nowrap', marginBottom: 18 }}>
          <Btn variant="glass" size="sm" icon={ChevronLeft} disabled={start <= today} onClick={() => shift(-7)} aria-label="<" />
          <div className="rs-days" style={{ flex: 1 }}>
            {days.map((d, i) => {
              const p = dayParts(t, d)
              return (
                <button key={d} type="button" className={cx('rs-day', d === date && 'is-active')} style={{ '--d': `${i * 30}ms` }} onClick={() => setDate(d)}>
                  <span className="rs-day__dow">{d === today ? t('common.today') : p.dow}</span>
                  <span className="rs-day__num">{p.num}</span>
                  {countBy[d] ? <span className="rs-day__dot" /> : <span style={{ height: 5 }} />}
                </button>
              )
            })}
          </div>
          <Btn variant="glass" size="sm" icon={ChevronRight} onClick={() => shift(7)} aria-label=">" />
        </div>

        {isLoading ? <SkeletonGrid count={4} height={88} className="rs-col" /> : !dayList.length ? (
          <Empty icon={CalendarDays} title={t('resv.empty')} text={t('resv.emptyText')} action={<Btn icon={Plus} onClick={() => setCreating(true)}>{t('resv.new')}</Btn>} />
        ) : (
          <div className="rs-col" style={{ gap: 10 }}>
            {dayList.map((r, i) => <ResvRow key={r.id} r={r} index={i} t={t} onOpen={setSelected} />)}
          </div>
        )}
      </div>

      {selected && <ResvDetail key={selected.id} r={selected} tables={tables} theme={theme} t={t} tenantName={tenantName} onClose={() => setSelected(null)} onChanged={onChanged} />}
      {creating && <NewResvModal date={date} theme={theme} t={t} te={te} onClose={() => setCreating(false)}
        onSaved={(r) => { setCreating(false); qc.invalidateQueries({ queryKey: ['restaurant-reservations'] }); if (r?.date) setDate(r.date) }} />}
    </Stage>
  )
}
