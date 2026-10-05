// src/pages/gym/GymClassesPage.jsx
// ✅ GYM FITNESS — Klas & Antrenè (tèm klè, animasyon, responsive)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, BookOpen, Users, Trash2, Edit2 } from 'lucide-react'
import { gymAPI } from '../../services/api'

const G = {
  teal:'#14B8A6', ink:'#1a0533', muted:'#64748b',
  border:'rgba(0,0,0,0.08)', card:'#ffffff', bgSoft:'#f8fafc',
  shadow:'0 2px 14px rgba(20,20,43,0.06)', red:'#ef4444', violet:'#8b5cf6',
}

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

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
    <div style={{ position:'fixed', inset:0, background:'rgba(26,5,51,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="gym-modal-pop" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:18, padding:24, width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(20,20,43,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ color:G.ink, margin:0, fontSize:16, fontWeight:800 }}>{gymClass ? t('gym.classes.modal.editTitle') : t('gym.classes.modal.newTitle')}</h3>
          <button type="button" onClick={onClose} style={{ background:G.bgSoft, border:'none', borderRadius:8, padding:6, color:G.muted, cursor:'pointer', display:'flex' }}><X size={16} /></button>
        </div>

        <label style={labelStyle}>{t('gym.classes.modal.name')}</label>
        <input {...register('name', { required: true })} placeholder={t('gym.classes.modal.namePlaceholder')} style={inputStyle} />
        {errors.name && <p style={errorStyle}>{t('gym.classes.modal.nameRequired')}</p>}

        <label style={labelStyle}>{t('gym.classes.modal.trainerName')}</label>
        <input {...register('trainerName', { required: true })} style={inputStyle} />
        {errors.trainerName && <p style={errorStyle}>{t('gym.classes.modal.trainerRequired')}</p>}

        <label style={labelStyle}>{t('gym.classes.modal.capacity')}</label>
        <input type="number" {...register('capacity')} style={inputStyle} />

        <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${G.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <p style={{ color:G.muted, fontSize:12, margin:0, fontWeight:700 }}>{t('gym.classes.modal.schedule')}</p>
            <button type="button" onClick={addSlot} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:'none', background:'rgba(34,197,94,0.12)', color:'#16a34a', cursor:'pointer', fontSize:11, fontWeight:800 }}>
              <Plus size={12} /> {t('gym.classes.modal.add')}
            </button>
          </div>
          {schedule.map((slot, i) => (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
              <select value={slot.day} onChange={e => updateSlot(i, 'day', e.target.value)} style={{ ...inputStyle, flex:1.3 }}>
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
              <input type="time" value={slot.start} onChange={e => updateSlot(i, 'start', e.target.value)} style={{ ...inputStyle, flex:1 }} />
              <input type="time" value={slot.end} onChange={e => updateSlot(i, 'end', e.target.value)} style={{ ...inputStyle, flex:1 }} />
              <button type="button" onClick={() => removeSlot(i)} style={{ background:'none', border:'none', color:G.red, cursor:'pointer', padding:4 }}><X size={14} /></button>
            </div>
          ))}
          {schedule.length === 0 && <p style={{ color:'#94a3b8', fontSize:11 }}>{t('gym.classes.modal.noSchedule')}</p>}
        </div>

        <button type="submit" disabled={mutation.isPending}
          style={{ width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:14, boxShadow:'0 8px 20px rgba(20,184,166,0.3)' }}>
          {mutation.isPending ? t('gym.classes.modal.saving') : gymClass ? t('gym.classes.modal.saveChanges') : t('gym.classes.modal.create')}
        </button>
      </form>
    </div>
  )
}

const labelStyle = { display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'12px 0 6px' }
const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontSize:14, boxSizing:'border-box' }
const errorStyle = { color:G.red, fontSize:11, margin:'4px 0 0' }

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

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <div className="gym-fadeup" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(139,92,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BookOpen size={20} color={G.violet} />
          </div>
          <h1 style={{ margin:0, fontSize:19, fontWeight:800, color:G.ink }}>{t('gym.classes.title')}</h1>
        </div>
        <button onClick={() => { setEditingClass(null); setShowForm(true) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, boxShadow:'0 6px 16px rgba(20,184,166,0.3)' }}>
          <Plus size={16} /> {t('gym.classes.newClass')}
        </button>
      </div>

      {isLoading ? (
        <p style={{ color:G.muted }}>{t('gym.classes.loading')}</p>
      ) : !classes?.length ? (
        <div className="gym-fadeup" style={{ textAlign:'center', padding:50, background:G.card, border:`1px dashed ${G.border}`, borderRadius:16, color:G.muted }}>
          {t('gym.classes.noClasses')}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
          {classes.map((c, i) => (
            <div key={c.id} className="gym-fadeup gym-row" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:18, boxShadow:G.shadow, animationDelay:`${Math.min(i, 8) * 50}ms` }}>
              <p style={{ margin:0, color:G.ink, fontWeight:800, fontSize:16 }}>{c.name}</p>
              <p style={{ margin:'4px 0 0', color:G.teal, fontSize:13, fontWeight:600 }}>👤 {c.trainerName}</p>

              {Array.isArray(c.schedule) && c.schedule.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
                  {c.schedule.map((s, j) => (
                    <span key={j} style={{ fontSize:10, padding:'3px 8px', borderRadius:7, background:'rgba(99,102,241,0.1)', color:'#6366f1', fontWeight:700 }}>
                      {DAY_LABELS[s.day] || s.day} {s.start}-{s.end}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:12, color:G.muted, fontSize:12 }}>
                <Users size={13} /> {c._count?.enrollments || 0}{c.capacity ? ` / ${c.capacity}` : ''} {t('gym.classes.enrolled')}
              </div>

              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <button onClick={() => { setEditingClass(c); setShowForm(true) }}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', borderRadius:10, border:'1px solid rgba(99,102,241,0.25)', background:'rgba(99,102,241,0.08)', color:'#6366f1', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  <Edit2 size={13} /> {t('gym.classes.edit')}
                </button>
                <button onClick={() => handleDelete(c)}
                  style={{ padding:'9px 12px', borderRadius:10, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:G.red, cursor:'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ClassFormModal gymClass={editingClass} onClose={() => setShowForm(false)} />}

      <style>{`
        @keyframes gymFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gymPop { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .gym-fadeup { opacity:0; animation: gymFadeUp 0.4s ease forwards; }
        .gym-modal-pop { animation: gymPop 0.22s ease; }
        .gym-row { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .gym-row:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(20,20,43,0.1); }
      `}</style>
    </div>
  )
}