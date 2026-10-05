// src/pages/gym/GymPlansPage.jsx
// ✅ GYM FITNESS — Jesyon plan abònman (tèm klè, animasyon, responsive)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, X, CreditCard } from 'lucide-react'
import { gymAPI } from '../../services/api'

const G = {
  teal:'#14B8A6', ink:'#1a0533', muted:'#64748b',
  border:'rgba(0,0,0,0.08)', card:'#ffffff', bgSoft:'#f8fafc',
  shadow:'0 2px 14px rgba(20,20,43,0.06)', red:'#ef4444', amber:'#d97706',
}

function PlanFormModal({ plan, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: plan || { name: '', durationDays: 30, priceHtg: '', priceUsd: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data) => plan ? gymAPI.updatePlan(plan.id, data) : gymAPI.createPlan(data),
    onSuccess: () => {
      toast.success(plan ? t('gym.plans.modal.updated') : t('gym.plans.modal.created'))
      qc.invalidateQueries(['gym-plans'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.plans.error')),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, durationDays: Number(data.durationDays), priceHtg: Number(data.priceHtg), priceUsd: Number(data.priceUsd || 0) })

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,5,51,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="gym-modal-pop" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:18, padding:24, width:'100%', maxWidth:420, boxShadow:'0 24px 60px rgba(20,20,43,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ color:G.ink, margin:0, fontSize:16, fontWeight:800 }}>{plan ? t('gym.plans.modal.editTitle') : t('gym.plans.modal.newTitle')}</h3>
          <button type="button" onClick={onClose} style={{ background:G.bgSoft, border:'none', borderRadius:8, padding:6, color:G.muted, cursor:'pointer', display:'flex' }}><X size={16} /></button>
        </div>

        <label style={{ display:'block', color:G.muted, fontSize:12, fontWeight:600, marginBottom:6 }}>{t('gym.plans.modal.name')}</label>
        <input {...register('name', { required: true })} placeholder={t('gym.plans.modal.namePlaceholder')} style={inputStyle} />
        {errors.name && <p style={errorStyle}>{t('gym.plans.modal.nameRequired')}</p>}

        <label style={{ display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'14px 0 6px' }}>{t('gym.plans.modal.duration')}</label>
        <input type="number" {...register('durationDays', { required: true, min: 1 })} style={inputStyle} />

        <label style={{ display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'14px 0 6px' }}>{t('gym.plans.modal.priceHtg')}</label>
        <input type="number" step="0.01" {...register('priceHtg', { required: true, min: 0 })} style={inputStyle} />

        <label style={{ display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'14px 0 6px' }}>{t('gym.plans.modal.priceUsd')}</label>
        <input type="number" step="0.01" {...register('priceUsd')} style={inputStyle} />

        <button type="submit" disabled={mutation.isPending}
          style={{ width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:14, boxShadow:'0 8px 20px rgba(20,184,166,0.3)' }}>
          {mutation.isPending ? t('gym.plans.modal.saving') : plan ? t('gym.plans.modal.saveChanges') : t('gym.plans.modal.create')}
        </button>
      </form>
    </div>
  )
}

const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontSize:14, boxSizing:'border-box' }
const errorStyle = { color:G.red, fontSize:11, margin:'4px 0 0' }

export default function GymPlansPage() {
  const { t } = useTranslation()
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
      toast.success(res.data.softDeleted ? t('gym.plans.softDeleted') : t('gym.plans.deleted'))
      qc.invalidateQueries(['gym-plans'])
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.plans.error')),
  })

  const handleDelete = (plan) => {
    if (!window.confirm(t('gym.plans.deleteConfirm', { name: plan.name }))) return
    deleteMutation.mutate(plan.id)
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <div className="gym-fadeup" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(245,158,11,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CreditCard size={20} color={G.amber} />
          </div>
          <h1 style={{ margin:0, fontSize:19, fontWeight:800, color:G.ink }}>{t('gym.plans.title')}</h1>
        </div>
        <button onClick={() => { setEditingPlan(null); setShowForm(true) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, boxShadow:'0 6px 16px rgba(20,184,166,0.3)' }}>
          <Plus size={16} /> {t('gym.plans.newPlan')}
        </button>
      </div>

      {isLoading ? (
        <p style={{ color:G.muted }}>{t('gym.plans.loading')}</p>
      ) : !plans?.length ? (
        <div className="gym-fadeup" style={{ textAlign:'center', padding:50, background:G.card, border:`1px dashed ${G.border}`, borderRadius:16, color:G.muted }}>
          {t('gym.plans.noPlans')}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:14 }}>
          {plans.map((plan, i) => (
            <div key={plan.id} className="gym-fadeup gym-row" style={{
              background:G.card, border:`1px solid ${plan.isActive ? G.border : 'rgba(239,68,68,0.25)'}`,
              borderRadius:16, padding:18, boxShadow:G.shadow, animationDelay:`${Math.min(i, 8) * 50}ms`,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <p style={{ margin:0, color:G.ink, fontWeight:800, fontSize:16 }}>{plan.name}</p>
                  <p style={{ margin:'4px 0 0', color:G.muted, fontSize:12 }}>{plan.durationDays} {t('gym.plans.daysUnit')}</p>
                </div>
                {!plan.isActive && <span style={{ fontSize:10, color:G.red, background:'rgba(239,68,68,0.1)', padding:'2px 8px', borderRadius:7, fontWeight:700 }}>{t('gym.plans.deactivated')}</span>}
              </div>
              <p style={{ margin:'14px 0 0', color:G.teal, fontWeight:900, fontSize:21 }}>
                {Number(plan.priceHtg).toLocaleString('fr-FR')} HTG
              </p>
              {Number(plan.priceUsd) > 0 && (
                <p style={{ margin:'2px 0 0', color:G.muted, fontSize:12 }}>${Number(plan.priceUsd).toLocaleString('fr-FR')}</p>
              )}
              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <button onClick={() => { setEditingPlan(plan); setShowForm(true) }}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', borderRadius:10, border:'1px solid rgba(99,102,241,0.25)', background:'rgba(99,102,241,0.08)', color:'#6366f1', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  <Edit2 size={13} /> {t('gym.plans.edit')}
                </button>
                <button onClick={() => handleDelete(plan)}
                  style={{ padding:'9px 12px', borderRadius:10, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:G.red, cursor:'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PlanFormModal plan={editingPlan} onClose={() => setShowForm(false)} />}

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