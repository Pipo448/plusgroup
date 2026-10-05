// src/pages/gym/GymPlansPage.jsx
// ✅ GYM FITNESS — Plan abònman (stil Plus Fit: kat pri, pri pa jou, modal)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, CreditCard, CalendarDays, CheckCircle2, Layers } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { C, GymStyles, PageHero, Modal, Field, EmptyState, SectionHead, fmt, fmtMoney } from './gymUI'

function PlanFormModal({ plan, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
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

  const days = Number(watch('durationDays') || 0)
  const price = Number(watch('priceHtg') || 0)
  const perDay = days > 0 && price > 0 ? price / days : 0

  return (
    <Modal icon={CreditCard} title={plan ? t('gym.plans.modal.editTitle') : t('gym.plans.modal.newTitle')}
      onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={440}>
      <Field label={t('gym.plans.modal.name')} error={errors.name && t('gym.plans.modal.nameRequired')}>
        <input {...register('name', { required: true })} placeholder={t('gym.plans.modal.namePlaceholder')} className="gx-input" autoFocus/>
      </Field>
      <Field label={t('gym.plans.modal.duration')}>
        <input type="number" {...register('durationDays', { required: true, min: 1 })} className="gx-input"/>
        <div className="gx-quick-amounts">
          {[1, 7, 30, 90, 365].map(d => (
            <button type="button" key={d} className={days === d ? 'on' : ''}
              onClick={() => setValue('durationDays', d, { shouldDirty: true, shouldValidate: true })}>
              {d} {t('gym.plans.daysUnit')}
            </button>
          ))}
        </div>
      </Field>
      <div className="gx-two">
        <Field label={t('gym.plans.modal.priceHtg')}>
          <input type="number" step="0.01" {...register('priceHtg', { required: true, min: 0 })} className="gx-input"/>
        </Field>
        <Field label={t('gym.plans.modal.priceUsd')}>
          <input type="number" step="0.01" {...register('priceUsd')} className="gx-input"/>
        </Field>
      </div>

      {perDay > 0 && (
        <div className="gx-summary">
          <div className="total" style={{ border:0, margin:0, padding:0 }}>
            <span>{t('gym.plans.perDay', 'Revient à / jour')}</span>
            <b>{fmtMoney(perDay)} <small style={{ fontSize:14, color:C.muted }}>HTG</small></b>
          </div>
        </div>
      )}

      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:8 }}>
        {mutation.isPending ? t('gym.plans.modal.saving') : plan ? t('gym.plans.modal.saveChanges') : t('gym.plans.modal.create')}
      </button>
    </Modal>
  )
}

function PlanCard({ plan, i, t, featured, onEdit, onDelete }) {
  const days = Number(plan.durationDays) || 0
  const perDay = days > 0 ? Number(plan.priceHtg) / days : 0
  return (
    <div className={`gx-plan gx-in ${featured ? 'featured' : ''} ${!plan.isActive ? 'off' : ''}`} style={{ animationDelay:`${120 + Math.min(i, 8) * 60}ms` }}>
      <div className="gx-plan-top">
        <span className="gx-plan-days"><CalendarDays size={13}/> {days} {t('gym.plans.daysUnit')}</span>
        {!plan.isActive
          ? <span className="gx-chip" style={{ '--c': C.red }}><span className="dot"/>{t('gym.plans.deactivated')}</span>
          : featured && <span className="gx-chip volt">{t('gym.plans.bestValue', 'Meilleur prix')}</span>}
      </div>
      <h3 className="gx-plan-name">{plan.name}</h3>
      <p className="gx-plan-price">{fmt(plan.priceHtg)}<span>HTG</span></p>
      <p className="gx-plan-usd">
        {Number(plan.priceUsd) > 0 ? `$${Number(plan.priceUsd).toLocaleString('fr-FR')} · ` : ''}
        {perDay > 0 && `${fmtMoney(perDay)} HTG / ${t('gym.plans.day', 'jour')}`}
      </p>
      <div className="gx-plan-actions">
        <button onClick={onEdit} className={`gx-btn gx-btn-sm ${featured ? 'gx-btn-volt' : 'gx-btn-soft'}`} style={{ flex:1 }}>
          <Edit2 size={13}/> {t('gym.plans.edit')}
        </button>
        <button onClick={onDelete} className="gx-btn gx-btn-danger gx-btn-sm"><Trash2 size={13}/></button>
      </div>
    </div>
  )
}

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

  const list = plans || []
  const active = list.filter(p => p.isActive)
  // Plan aktif ki pi bon mache pa jou (sèlman si gen plis pase 1)
  const best = active.length > 1
    ? active.reduce((b, p) => {
        const d = Number(p.durationDays) || 1, bd = Number(b.durationDays) || 1
        return Number(p.priceHtg) / d < Number(b.priceHtg) / bd ? p : b
      })
    : null
  const prices = active.map(p => Number(p.priceHtg) || 0)
  const openNew = () => { setEditingPlan(null); setShowForm(true) }

  return (
    <div className="gx-page">
      <GymStyles/>
      <style>{`
        .gx-plan{position:relative;overflow:hidden;background:${C.card};border:1px solid ${C.border};border-radius:24px;padding:22px;display:flex;flex-direction:column;
          transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s}
        .gx-plan:hover{transform:translateY(-5px);box-shadow:0 24px 44px -24px rgba(20,21,26,.4)}
        .gx-plan::after{content:'';position:absolute;right:-50px;bottom:-60px;width:160px;height:160px;border-radius:50%;background:${C.soft};transition:transform .5s cubic-bezier(.22,1,.36,1);z-index:0}
        .gx-plan:hover::after{transform:scale(1.3)}
        .gx-plan > *{position:relative;z-index:1}
        .gx-plan.featured{background:${C.night};color:#f2f1ec;border-color:${C.night}}
        .gx-plan.featured::after{background:${C.volt};opacity:.16}
        .gx-plan.off{opacity:.65}
        .gx-plan-top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:24px}
        .gx-plan-days{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:${C.muted}}
        .gx-plan.featured .gx-plan-days{color:rgba(242,241,236,.6)}
        .gx-plan-name{margin:16px 0 0;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:28px;line-height:1;text-transform:uppercase}
        .gx-plan-price{margin:14px 0 0;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:52px;line-height:.9;letter-spacing:-.01em}
        .gx-plan-price span{font-size:18px;margin-left:6px;color:${C.muted};letter-spacing:.04em}
        .gx-plan.featured .gx-plan-price{color:${C.volt}}
        .gx-plan.featured .gx-plan-price span{color:rgba(242,241,236,.55)}
        .gx-plan-usd{margin:8px 0 0;font-size:12.5px;font-weight:600;color:${C.muted};min-height:18px}
        .gx-plan.featured .gx-plan-usd{color:rgba(242,241,236,.6)}
        .gx-plan-actions{display:flex;gap:8px;margin-top:auto;padding-top:20px}
      `}</style>

      <PageHero
        icon={CreditCard}
        eyebrow={t('gym.plans.eyebrow', 'Tarifs')}
        title={t('gym.plans.title')}
        subtitle={t('gym.plans.subtitle', 'Définissez vos formules d\'abonnement et leurs prix')}
        actions={<button onClick={openNew} className="gx-btn gx-btn-volt"><Plus size={16}/> {t('gym.plans.newPlan')}</button>}
        stats={[
          { label: t('gym.plans.statActive', 'Plans actifs'), value: active.length, icon: CheckCircle2, tone: 'volt', loading: isLoading },
          { label: t('gym.plans.statTotal', 'Total plans'), value: list.length, icon: Layers, loading: isLoading },
          { label: t('gym.plans.statFrom', 'À partir de'), value: prices.length ? Math.min(...prices) : 0, suffix: 'HTG', icon: CreditCard, tone: 'ember', loading: isLoading },
        ]}
      />

      <SectionHead title={t('gym.plans.title')} count={isLoading ? null : list.length}/>

      {isLoading ? (
        <div className="gx-grid">{[0,1,2].map(i => <div key={i} className="gx-skel" style={{ height:250, borderRadius:24 }}/>)}</div>
      ) : !list.length ? (
        <EmptyState icon={CreditCard} text={t('gym.plans.noPlans')}
          action={<button onClick={openNew} className="gx-btn gx-btn-dark"><Plus size={15}/> {t('gym.plans.newPlan')}</button>}/>
      ) : (
        <div className="gx-grid">
          {list.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} i={i} t={t} featured={best?.id === plan.id}
              onEdit={() => { setEditingPlan(plan); setShowForm(true) }}
              onDelete={() => handleDelete(plan)}/>
          ))}
        </div>
      )}

      {showForm && <PlanFormModal plan={editingPlan} onClose={() => setShowForm(false)}/>}
    </div>
  )
}