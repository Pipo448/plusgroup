// src/pages/gym/GymPlansPage.jsx
// ✅ NOUVO — Modil Jim/Gym: Jesyon plan abònman (Mansyèl, Trimès, Anyèl...)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, X, CreditCard } from 'lucide-react'
import { gymAPI } from '../../services/api'

function PlanFormModal({ plan, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: plan || { name: '', durationDays: 30, priceHtg: '', priceUsd: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data) => plan ? gymAPI.updatePlan(plan.id, data) : gymAPI.createPlan(data),
    onSuccess: () => {
      toast.success(plan ? 'Plan ajou!' : 'Plan kreye!')
      qc.invalidateQueries(['gym-plans'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => mutation.mutate({
    ...data,
    durationDays: Number(data.durationDays),
    priceHtg: Number(data.priceHtg),
    priceUsd: Number(data.priceUsd || 0),
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: '#0f172a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: '#C9A84C', margin: 0, fontSize: 16 }}>{plan ? 'Modifye Plan' : 'Nouvo Plan'}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>Non Plan</label>
        <input {...register('name', { required: true })} placeholder="Egzanp: Mansyèl"
          style={inputStyle} />
        {errors.name && <p style={errorStyle}>Non plan obligatwa.</p>}

        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, margin: '14px 0 6px' }}>Dire (jou)</label>
        <input type="number" {...register('durationDays', { required: true, min: 1 })} style={inputStyle} />

        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, margin: '14px 0 6px' }}>Pri (HTG)</label>
        <input type="number" step="0.01" {...register('priceHtg', { required: true, min: 0 })} style={inputStyle} />

        <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, margin: '14px 0 6px' }}>Pri (USD) — opsyonèl</label>
        <input type="number" step="0.01" {...register('priceUsd')} style={inputStyle} />

        <button type="submit" disabled={mutation.isPending}
          style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {mutation.isPending ? 'Ap sove...' : plan ? 'Sove Chanjman' : 'Kreye Plan'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }
const errorStyle = { color: '#C0392B', fontSize: 11, margin: '4px 0 0' }

export default function GymPlansPage() {
  const qc = useQueryClient()
  const [editingPlan, setEditingPlan] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['gym-plans'],
    queryFn: () => gymAPI.getPlans().then(r => r.data.plans),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => gymAPI.deletePlan(id),
    onSuccess: (res) => {
      toast.success(res.data.softDeleted ? 'Plan dezaktive (gen manm ki itilize l).' : 'Plan efase.')
      qc.invalidateQueries(['gym-plans'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const handleDelete = (plan) => {
    if (!window.confirm(`Efase plan "${plan.name}"?`)) return
    deleteMutation.mutate(plan.id)
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CreditCard size={22} color="#C9A84C" />
          <h1 style={{ margin: 0, fontSize: 19, color: '#fff' }}>Plan Abònman</h1>
        </div>
        <button onClick={() => { setEditingPlan(null); setShowForm(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={16} /> Nouvo Plan
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ap chaje...</p>
      ) : !plans?.length ? (
        <div style={{ textAlign: 'center', padding: 50, background: 'rgba(255,255,255,0.03)', borderRadius: 12, color: '#64748b' }}>
          Pa gen plan kreye ankò.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${plan.isActive ? 'rgba(39,174,96,0.25)' : 'rgba(192,57,43,0.25)'}`,
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 16 }}>{plan.name}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>{plan.durationDays} jou</p>
                </div>
                {!plan.isActive && <span style={{ fontSize: 10, color: '#C0392B', background: 'rgba(192,57,43,0.1)', padding: '2px 8px', borderRadius: 6 }}>Dezaktive</span>}
              </div>
              <p style={{ margin: '14px 0 0', color: '#C9A84C', fontWeight: 800, fontSize: 20 }}>
                {Number(plan.priceHtg).toLocaleString('fr-FR')} HTG
              </p>
              {Number(plan.priceUsd) > 0 && (
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>${Number(plan.priceUsd).toLocaleString('fr-FR')}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setEditingPlan(plan); setShowForm(true) }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Edit2 size={13} /> Modifye
                </button>
                <button onClick={() => handleDelete(plan)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(192,57,43,0.3)', background: 'rgba(192,57,43,0.1)', color: '#C0392B', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PlanFormModal plan={editingPlan} onClose={() => setShowForm(false)} />}
    </div>
  )
}
