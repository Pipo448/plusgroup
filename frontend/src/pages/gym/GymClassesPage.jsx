// src/pages/gym/GymClassesPage.jsx
// ✅ NOUVO — Modil Jim/Gym: Klas & Antrenè
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, BookOpen, Users, Trash2, Edit2 } from 'lucide-react'
import { gymAPI } from '../../services/api'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const DAY_LABELS = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mèk', jeudi: 'Jed', vendredi: 'Van', samedi: 'Sam', dimanche: 'Dim' }

function ClassFormModal({ gymClass, onClose }) {
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
      toast.success(gymClass ? 'Klas ajou!' : 'Klas kreye!')
      qc.invalidateQueries(['gym-classes'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => mutation.mutate({
    ...data,
    capacity: data.capacity ? Number(data.capacity) : null,
    schedule,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: '#0f172a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: '#C9A84C', margin: 0, fontSize: 16 }}>{gymClass ? 'Modifye Klas' : 'Nouvo Klas'}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <label style={labelStyle}>Non Klas</label>
        <input {...register('name', { required: true })} placeholder="Egzanp: Yoga" style={inputStyle} />
        {errors.name && <p style={errorStyle}>Non klas obligatwa.</p>}

        <label style={labelStyle}>Non Antrenè</label>
        <input {...register('trainerName', { required: true })} style={inputStyle} />
        {errors.trainerName && <p style={errorStyle}>Non antrenè obligatwa.</p>}

        <label style={labelStyle}>Kapasite (manm maksimòm) — opsyonèl</label>
        <input type="number" {...register('capacity')} style={inputStyle} />

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Orè Klas</p>
            <button type="button" onClick={addSlot} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(39,174,96,0.15)', color: '#27ae60', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              <Plus size={12} /> Ajoute
            </button>
          </div>
          {schedule.map((slot, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <select value={slot.day} onChange={e => updateSlot(i, 'day', e.target.value)} style={{ ...inputStyle, flex: 1.3 }}>
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
              <input type="time" value={slot.start} onChange={e => updateSlot(i, 'start', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input type="time" value={slot.end} onChange={e => updateSlot(i, 'end', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => removeSlot(i)} style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
            </div>
          ))}
          {schedule.length === 0 && <p style={{ color: '#475569', fontSize: 11 }}>Pa gen orè ajoute.</p>}
        </div>

        <button type="submit" disabled={mutation.isPending}
          style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {mutation.isPending ? 'Ap sove...' : gymClass ? 'Sove Chanjman' : 'Kreye Klas'}
        </button>
      </form>
    </div>
  )
}

const labelStyle = { display: 'block', color: '#94a3b8', fontSize: 12, margin: '12px 0 6px' }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }
const errorStyle = { color: '#C0392B', fontSize: 11, margin: '4px 0 0' }

export default function GymClassesPage() {
  const qc = useQueryClient()
  const [editingClass, setEditingClass] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data: classes, isLoading } = useQuery({
    queryKey: ['gym-classes'],
    queryFn: () => gymAPI.getClasses().then(r => r.data.classes),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => gymAPI.deleteClass(id),
    onSuccess: () => { toast.success('Klas efase.'); qc.invalidateQueries(['gym-classes']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleDelete = (c) => {
    if (!window.confirm(`Efase klas "${c.name}"?`)) return
    deleteMutation.mutate(c.id)
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={22} color="#C9A84C" />
          <h1 style={{ margin: 0, fontSize: 19, color: '#fff' }}>Klas & Antrenè</h1>
        </div>
        <button onClick={() => { setEditingClass(null); setShowForm(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={16} /> Nouvo Klas
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ap chaje...</p>
      ) : !classes?.length ? (
        <div style={{ textAlign: 'center', padding: 50, background: 'rgba(255,255,255,0.03)', borderRadius: 12, color: '#64748b' }}>
          Pa gen klas kreye ankò.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {classes.map(c => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 16 }}>{c.name}</p>
              <p style={{ margin: '4px 0 0', color: '#C9A84C', fontSize: 13 }}>👤 {c.trainerName}</p>

              {Array.isArray(c.schedule) && c.schedule.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {c.schedule.map((s, i) => (
                    <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                      {DAY_LABELS[s.day] || s.day} {s.start}-{s.end}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#64748b', fontSize: 12 }}>
                <Users size={13} /> {c._count?.enrollments || 0}{c.capacity ? ` / ${c.capacity}` : ''} enskri
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setEditingClass(c); setShowForm(true) }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Edit2 size={13} /> Modifye
                </button>
                <button onClick={() => handleDelete(c)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(192,57,43,0.3)', background: 'rgba(192,57,43,0.1)', color: '#C0392B', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ClassFormModal gymClass={editingClass} onClose={() => setShowForm(false)} />}
    </div>
  )
}
