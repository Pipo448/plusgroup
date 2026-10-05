// src/pages/gym/GymClassesPage.jsx
// ✅ GYM FITNESS — Klas & Antrenè (stil Plus Fit: hero fonse, kat klas ak kapasite, modal orè)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, BookOpen, Users, Trash2, Edit2, CalendarDays, Clock, UserRound } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { C, GymStyles, PageHero, Modal, Field, Avatar, EmptyState, SectionHead } from './gymUI'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const ACCENTS = [C.volt, C.ember, '#6ec8ff', C.violet, C.teal]

function ClassFormModal({ gymClass, onClose }) {
  const { t } = useTranslation()
  const DAY_LABELS = t('gym.classes.days', { returnObjects: true })
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: gymClass ? { name: gymClass.name, trainerName: gymClass.trainerName, capacity: gymClass.capacity || '' } : { name: '', trainerName: '', capacity: '' },
  })
  const [schedule, setSchedule] = useState(gymClass?.schedule || [])

  const addSlot = () => setSchedule(s => [...s, { day: 'lundi', start: '18:00', end: '19:00' }])
  const removeSlot = (i) => setSchedule(s => s.filter((_, idx) => idx !== i))
  const updateSlot = (i, field, value) => setSchedule(s => s.map((slot, idx) => idx === i ? { ...slot, [field]: value } : slot))

  const mutation = useMutation({
    mutationFn: (data) => gymClass ? gymAPI.updateClass(gymClass.id, data) : gymAPI.createClass(data),
    onSuccess: () => {
      toast.success(gymClass ? t('gym.classes.modal.updated') : t('gym.classes.modal.created'))
      qc.invalidateQueries(['gym-classes'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.classes.error')),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, capacity: data.capacity ? Number(data.capacity) : null, schedule })

  return (
    <Modal icon={BookOpen} title={gymClass ? t('gym.classes.modal.editTitle') : t('gym.classes.modal.newTitle')}
      onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={500}>
      <Field label={t('gym.classes.modal.name')} error={errors.name && t('gym.classes.modal.nameRequired')}>
        <input {...register('name', { required: true })} placeholder={t('gym.classes.modal.namePlaceholder')} className="gx-input" autoFocus/>
      </Field>
      <div className="gx-two">
        <Field label={t('gym.classes.modal.trainerName')} error={errors.trainerName && t('gym.classes.modal.trainerRequired')}>
          <input {...register('trainerName', { required: true })} className="gx-input"/>
        </Field>
        <Field label={t('gym.classes.modal.capacity')}>
          <input type="number" {...register('capacity')} className="gx-input"/>
        </Field>
      </div>

      <div className="gx-divider"/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span className="gx-label" style={{ margin:0 }}>{t('gym.classes.modal.schedule')}</span>
        <button type="button" onClick={addSlot} className="gx-btn gx-btn-dark gx-btn-sm"><Plus size={13}/> {t('gym.classes.modal.add')}</button>
      </div>
      <div className="gx-stack" style={{ gap:8 }}>
        {schedule.map((slot, i) => (
          <div key={i} className="gx-slide" style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr auto', gap:6, alignItems:'center' }}>
            <select value={slot.day} onChange={e => updateSlot(i, 'day', e.target.value)} className="gx-input" style={{ padding:'10px' }}>
              {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select>
            <input type="time" value={slot.start} onChange={e => updateSlot(i, 'start', e.target.value)} className="gx-input" style={{ padding:'10px' }}/>
            <input type="time" value={slot.end} onChange={e => updateSlot(i, 'end', e.target.value)} className="gx-input" style={{ padding:'10px' }}/>
            <button type="button" onClick={() => removeSlot(i)} className="gx-icon-btn danger"><X size={14}/></button>
          </div>
        ))}
        {schedule.length === 0 && <p style={{ color:C.muted, fontSize:12, margin:0, padding:'12px', textAlign:'center', background:C.soft, borderRadius:12 }}>{t('gym.classes.modal.noSchedule')}</p>}
      </div>

      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:20 }}>
        {mutation.isPending ? t('gym.classes.modal.saving') : gymClass ? t('gym.classes.modal.saveChanges') : t('gym.classes.modal.create')}
      </button>
    </Modal>
  )
}

function ClassCard({ c, i, onEdit, onDelete, dayLabels, t }) {
  const enrolled = c._count?.enrollments || 0
  const pct = c.capacity ? Math.min(100, Math.round((enrolled / c.capacity) * 100)) : null
  const full = pct != null && pct >= 100
  const accent = ACCENTS[i % ACCENTS.length]
  return (
    <div className="gx-card gx-in gx-class" style={{ animationDelay:`${120 + Math.min(i, 8) * 60}ms`, '--accent': accent }}>
      <div className="gx-class-band">
        <span className="gx-class-num">{String(i + 1).padStart(2, '0')}</span>
        {full && <span className="gx-chip solid" style={{ '--c': C.ember }}>{t('gym.classes.full', 'COMPLET')}</span>}
      </div>
      <div className="gx-pad" style={{ paddingTop:16 }}>
        <h3 className="gx-class-name">{c.name}</h3>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <Avatar name={c.trainerName} size={28}/>
          <span style={{ fontSize:13, fontWeight:700 }}>{c.trainerName}</span>
        </div>

        {Array.isArray(c.schedule) && c.schedule.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:14 }}>
            {c.schedule.map((s, j) => (
              <span key={j} className="gx-slot">
                <b>{String(dayLabels[s.day] || s.day).slice(0, 3)}</b> {s.start}–{s.end}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:7 }}>
            <span style={{ display:'flex', alignItems:'center', gap:6, color:C.muted, fontSize:12, fontWeight:700 }}>
              <Users size={13}/> {t('gym.classes.enrolled')}
            </span>
            <span className="gx-display" style={{ fontSize:20 }}>
              {enrolled}{c.capacity ? <span style={{ color:C.muted, fontSize:15 }}> / {c.capacity}</span> : ''}
            </span>
          </div>
          {pct != null && <div className="gx-track"><i style={{ width:`${pct}%`, '--c': full ? C.ember : C.night }}/></div>}
        </div>

        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          <button onClick={onEdit} className="gx-btn gx-btn-soft gx-btn-sm" style={{ flex:1 }}>
            <Edit2 size={13}/> {t('gym.classes.edit')}
          </button>
          <button onClick={onDelete} className="gx-btn gx-btn-danger gx-btn-sm"><Trash2 size={13}/></button>
        </div>
      </div>
    </div>
  )
}

export default function GymClassesPage() {
  const { t } = useTranslation()
  const DAY_LABELS = t('gym.classes.days', { returnObjects: true })
  const qc = useQueryClient()
  const [editingClass, setEditingClass] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data: classes, isLoading } = useQuery({
    queryKey: ['gym-classes'],
    queryFn: () => gymAPI.getClasses().then(r => r.data.classes),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => gymAPI.deleteClass(id),
    onSuccess: () => { toast.success(t('gym.classes.deleted')); qc.invalidateQueries(['gym-classes']) },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.classes.error')),
  })

  const handleDelete = (c) => {
    if (!window.confirm(t('gym.classes.deleteConfirm', { name: c.name }))) return
    deleteMutation.mutate(c.id)
  }

  const list = classes || []
  const totalEnrolled = list.reduce((s, c) => s + (c._count?.enrollments || 0), 0)
  const totalSlots = list.reduce((s, c) => s + (Array.isArray(c.schedule) ? c.schedule.length : 0), 0)
  const trainers = new Set(list.map(c => c.trainerName).filter(Boolean)).size
  const openNew = () => { setEditingClass(null); setShowForm(true) }

  return (
    <div className="gx-page">
      <GymStyles/>
      <style>{`
        .gx-class{overflow:hidden;transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s}
        .gx-class:hover{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,21,26,.35)}
        .gx-class-band{position:relative;height:64px;background:${C.night};display:flex;align-items:center;justify-content:space-between;padding:0 18px;overflow:hidden}
        .gx-class-band::before{content:'';position:absolute;right:-30px;top:-40px;width:130px;height:130px;border-radius:50%;background:var(--accent);opacity:.9;transition:transform .5s cubic-bezier(.22,1,.36,1)}
        .gx-class:hover .gx-class-band::before{transform:scale(1.25) translate(-10px,6px)}
        .gx-class-band > *{position:relative}
        .gx-class-num{font-family:${"'Barlow Condensed', sans-serif"};font-weight:800;font-size:38px;color:rgba(242,241,236,.18);line-height:1}
        .gx-class-name{margin:0;font-family:${"'Barlow Condensed', sans-serif"};font-weight:800;font-size:26px;line-height:1;text-transform:uppercase;letter-spacing:.01em}
        .gx-slot{font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:10px;background:${C.soft};color:${C.ink}}
        .gx-slot b{text-transform:uppercase;font-weight:800;margin-right:3px}
      `}</style>

      <PageHero
        icon={BookOpen}
        eyebrow={t('gym.classes.eyebrow', 'Programme')}
        title={t('gym.classes.title')}
        subtitle={t('gym.classes.subtitle', 'Gérez les cours, les entraîneurs et les horaires')}
        actions={<button onClick={openNew} className="gx-btn gx-btn-volt"><Plus size={16}/> {t('gym.classes.newClass')}</button>}
        stats={[
          { label: t('gym.classes.statClasses', 'Cours'), value: list.length, icon: BookOpen, tone: 'volt', loading: isLoading },
          { label: t('gym.classes.statEnrolled', 'Inscrits'), value: totalEnrolled, icon: Users, tone: 'ember', loading: isLoading },
          { label: t('gym.classes.statSlots', 'Séances / semaine'), value: totalSlots, icon: CalendarDays, loading: isLoading },
          { label: t('gym.classes.statTrainers', 'Entraîneurs'), value: trainers, icon: UserRound, tone: 'sky', loading: isLoading },
        ]}
      />

      <SectionHead title={t('gym.classes.title')} count={isLoading ? null : list.length}/>

      {isLoading ? (
        <div className="gx-grid">{[0,1,2].map(i => <div key={i} className="gx-skel" style={{ height:280, borderRadius:22 }}/>)}</div>
      ) : !list.length ? (
        <EmptyState icon={Clock} text={t('gym.classes.noClasses')}
          action={<button onClick={openNew} className="gx-btn gx-btn-dark"><Plus size={15}/> {t('gym.classes.newClass')}</button>}/>
      ) : (
        <div className="gx-grid">
          {list.map((c, i) => (
            <ClassCard key={c.id} c={c} i={i} t={t} dayLabels={DAY_LABELS || {}}
              onEdit={() => { setEditingClass(c); setShowForm(true) }}
              onDelete={() => handleDelete(c)}/>
          ))}
        </div>
      )}

      {showForm && <ClassFormModal gymClass={editingClass} onClose={() => setShowForm(false)}/>}
    </div>
  )
}