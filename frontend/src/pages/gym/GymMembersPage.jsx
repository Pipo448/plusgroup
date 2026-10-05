// src/pages/gym/GymMembersPage.jsx
// ✅ GYM FITNESS — Lis manm + ajoute nouvo manm (stil Plus Fit: hero, filtre estati, lis anime)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Users, ChevronRight, Printer, Settings2, UserPlus, UserCheck, UserX, Ticket } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { useAuthStore } from '../../stores/authStore'
import {
  C, GymStyles, PageHero, Modal, Field, Avatar, EmptyState, SkeletonRows, SectionHead, fmtMoney,
} from './gymUI'

const STATUS_COLORS = {
  active:    { color:'#16a34a', labelKey:'gym.members.status.active' },
  expired:   { color:'#dc2626', labelKey:'gym.members.status.expired' },
  cancelled: { color:'#64748b', labelKey:'gym.members.status.cancelled' },
}

function AddMemberModal({ onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()

  const { data: plans } = useQuery({
    queryKey: ['gym-plans'],
    queryFn: () => gymAPI.getPlans().then(r => r.data.plans),
  })

  // ✅ Kòb Enskripsyon — frè fiks yon sèl fwa, separe de pri plan an
  const { data: fee } = useQuery({
    queryKey: ['gym-registration-fee'],
    queryFn: () => gymAPI.getRegistrationFee().then(r => r.data.fee),
  })

  const selectedPlanId = watch('planId')
  const amountPaidWatch = watch('amountPaid')
  const selectedPlan = plans?.find(p => p.id === selectedPlanId)
  const registrationFeeHtg = Number(fee?.priceHtg || 0)
  const planPriceHtg = Number(selectedPlan?.priceHtg || 0)
  const totalDue = registrationFeeHtg + planPriceHtg
  const changeDue = totalDue > 0 ? Math.max(0, Number(amountPaidWatch || 0) - totalDue) : 0

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.addMember(data),
    onSuccess: (res, variables) => {
      toast.success(t('gym.members.added'))
      qc.invalidateQueries(['gym-members'])
      const plan = plans?.find(p => p.id === variables.planId)
      printGym(res.data.member, tenant, 'enskripsyon', {
        planName: plan?.name,
        amountPaid: variables.amountPaid,
        registrationFeeHtg,
      })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.members.error')),
  })

  const onSubmit = (data) => {
    const payload = { ...data }
    if (!payload.planId) delete payload.planId
    payload.amountPaid = Number(payload.amountPaid || 0)
    mutation.mutate(payload)
  }

  return (
    <Modal icon={UserPlus} title={t('gym.members.modal.title')} onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={520}>
      <Field label={t('gym.members.modal.fullName')} error={errors.fullName && t('gym.members.modal.fullNameRequired')}>
        <input {...register('fullName', { required: true })} className="gx-input" autoFocus/>
      </Field>
      <div className="gx-two">
        <Field label={t('gym.members.modal.phone')}><input {...register('phone')} className="gx-input"/></Field>
        <Field label={t('gym.members.modal.email')}><input type="email" {...register('email')} className="gx-input"/></Field>
      </div>
      <div className="gx-two">
        <Field label={t('gym.members.modal.emergencyContact')}><input {...register('emergencyContact')} className="gx-input"/></Field>
        <Field label={t('gym.members.modal.emergencyPhone')}><input {...register('emergencyPhone')} className="gx-input"/></Field>
      </div>

      <div className="gx-divider"/>
      <p className="gx-label" style={{ marginBottom:12 }}>{t('gym.members.modal.initialSubscription')}</p>

      <Field label={t('gym.members.modal.plan')}>
        <select {...register('planId')} className="gx-input">
          <option value="">{t('gym.members.modal.noPlanOption')}</option>
          {plans?.map(p => (
            <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHtg).toLocaleString('fr-FR')} HTG</option>
          ))}
        </select>
      </Field>

      {(registrationFeeHtg > 0 || selectedPlan) && (
        <div className="gx-summary gx-slide">
          {registrationFeeHtg > 0 && (
            <div className="line"><span>{t('gym.members.modal.registrationFeeLabel')}</span><span>{fmtMoney(registrationFeeHtg)} HTG</span></div>
          )}
          {selectedPlan && (
            <div className="line"><span>{t('gym.members.modal.planAmountLabel')}</span><span>{fmtMoney(planPriceHtg)} HTG</span></div>
          )}
          <div className="total">
            <span>{t('gym.members.modal.totalDue')}</span>
            <b>{fmtMoney(totalDue)} <small style={{ fontSize:13, color:C.muted }}>HTG</small></b>
          </div>
        </div>
      )}

      <Field label={t('gym.members.modal.amountPaid')}>
        <input type="number" step="0.01" {...register('amountPaid')} className="gx-input big"/>
        {totalDue > 0 && (
          <div className="gx-quick-amounts">
            {[...new Set([totalDue, ...[500, 1000].map(s => Math.ceil(totalDue / s) * s)])].map(v => (
              <button type="button" key={v} className={Number(amountPaidWatch) === v ? 'on' : ''}
                onClick={() => setValue('amountPaid', v, { shouldDirty: true })}>
                {fmtMoney(v)}
              </button>
            ))}
          </div>
        )}
      </Field>
      {changeDue > 0 && (
        <div className="gx-change">
          <span>{t('gym.members.modal.changeDue')}</span>
          <b>{fmtMoney(changeDue)} HTG</b>
        </div>
      )}

      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:18 }}>
        <UserPlus size={16}/> {mutation.isPending ? t('gym.members.modal.saving') : t('gym.members.modal.addMember')}
      </button>
    </Modal>
  )
}

function RegistrationFeeFormModal({ currentFee, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: { priceHtg: currentFee?.priceHtg || '', priceUsd: currentFee?.priceUsd || '' },
  })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.setRegistrationFee(data),
    onSuccess: () => {
      toast.success(t('gym.members.feeModal.updated'))
      qc.invalidateQueries(['gym-registration-fee'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.members.error')),
  })

  const onSubmit = (data) => mutation.mutate({ priceHtg: Number(data.priceHtg), priceUsd: data.priceUsd ? Number(data.priceUsd) : null })

  return (
    <Modal icon={Ticket} title={t('gym.members.feeModal.title')} subtitle={t('gym.members.feeModal.hint')}
      onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={420}>
      <Field label={t('gym.members.feeModal.priceHtg')}>
        <input type="number" step="0.01" {...register('priceHtg', { required:true, min:0 })} className="gx-input big" autoFocus/>
      </Field>
      <Field label={t('gym.members.feeModal.priceUsd')}>
        <input type="number" step="0.01" {...register('priceUsd')} className="gx-input"/>
      </Field>
      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:8 }}>
        {mutation.isPending ? t('gym.members.feeModal.saving') : t('gym.members.feeModal.save')}
      </button>
    </Modal>
  )
}

export default function GymMembersPage() {
  const { t } = useTranslation()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showFeeForm, setShowFeeForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['gym-members', search],
    queryFn: () => gymAPI.getMembers({ search: search || undefined, limit: 50 }).then(r => r.data),
  })

  const { data: fee } = useQuery({
    queryKey: ['gym-registration-fee'],
    queryFn: () => gymAPI.getRegistrationFee().then(r => r.data.fee),
  })

  const members = data?.members || []
  const statusOf = (m) => m.currentMembership?.status || 'none'
  const counts = {
    all: members.length,
    active: members.filter(m => statusOf(m) === 'active').length,
    expired: members.filter(m => statusOf(m) === 'expired').length,
    none: members.filter(m => statusOf(m) === 'none' || statusOf(m) === 'cancelled').length,
  }
  const shown = members.filter(m =>
    filter === 'all' ? true
    : filter === 'none' ? (statusOf(m) === 'none' || statusOf(m) === 'cancelled')
    : statusOf(m) === filter)

  const TABS = [
    { key:'all',     label: t('gym.members.filterAll', 'Tous') },
    { key:'active',  label: t('gym.members.status.active') },
    { key:'expired', label: t('gym.members.status.expired') },
    { key:'none',    label: t('gym.members.filterNoPlan', 'Sans plan') },
  ]

  return (
    <div className="gx-page">
      <GymStyles/>

      <PageHero
        icon={Users}
        eyebrow={t('gym.members.eyebrow', 'Communauté')}
        title={t('gym.members.title')}
        subtitle={t('gym.members.subtitle', 'Inscriptions, abonnements et fiches membres')}
        actions={<>
          <button onClick={() => setShowFeeForm(true)} className="gx-btn gx-btn-ghost-dark"><Settings2 size={15}/> {t('gym.members.editFee')}</button>
          <button onClick={() => setShowAdd(true)} className="gx-btn gx-btn-volt"><Plus size={16}/> {t('gym.members.newMember')}</button>
        </>}
        stats={[
          { label: t('gym.members.statTotal', 'Membres'), value: data?.total ?? members.length, icon: Users, tone: 'volt', loading: isLoading },
          { label: t('gym.members.status.active'), value: counts.active, icon: UserCheck, loading: isLoading },
          { label: t('gym.members.status.expired'), value: counts.expired, icon: UserX, tone: 'ember', loading: isLoading },
          { label: t('gym.members.registrationFee'), value: Number(fee?.priceHtg || 0), suffix: 'HTG', icon: Ticket, tone: 'sky' },
        ]}
      />

      <div className="gx-in" style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', animationDelay:'120ms' }}>
        <div className="gx-search" style={{ flex:'1 1 280px' }}>
          <Search size={18} className="lead"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('gym.members.searchPlaceholder')}/>
        </div>
        <div className="gx-tabs" style={{ overflowX:'auto', maxWidth:'100%' }}>
          {TABS.map(tab => (
            <button key={tab.key} className={filter === tab.key ? 'on' : ''} onClick={() => setFilter(tab.key)}>
              {tab.label} <span className="n">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <SectionHead title={t('gym.members.title')} count={isLoading ? null : shown.length}/>

      {isLoading ? (
        <SkeletonRows rows={6} height={70}/>
      ) : !shown.length ? (
        <EmptyState icon={Users} text={t('gym.members.noMembers')}
          action={<button onClick={() => setShowAdd(true)} className="gx-btn gx-btn-dark"><Plus size={15}/> {t('gym.members.newMember')}</button>}/>
      ) : (
        <div className="gx-stack">
          {shown.map((m, i) => {
            const statusMeta = m.currentMembership ? STATUS_COLORS[m.currentMembership.status] || STATUS_COLORS.cancelled : null
            return (
              <Link key={m.id} to={`/app/gym/members/${m.id}`} className="gx-row gx-in"
                style={{ animationDelay:`${Math.min(i, 10) * 40}ms`, borderColor: m.isActive ? undefined : 'rgba(220,38,38,.25)' }}>
                <Avatar name={m.fullName} size={44}/>
                <div className="grow">
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <p className="gx-row-title">{m.fullName}</p>
                    {!m.isActive && <span className="gx-chip" style={{ '--c': C.red }}>{t('gym.members.inactive')}</span>}
                  </div>
                  <p className="gx-row-meta">{m.phone || '—'}</p>
                </div>
                {statusMeta ? (
                  <span className="gx-chip gx-hide-sm" style={{ '--c': statusMeta.color }}>
                    <span className="dot"/>{m.currentMembership.planName || t('gym.members.plan')} · {t(statusMeta.labelKey)}
                  </span>
                ) : (
                  <span className="gx-chip gx-hide-sm" style={{ '--c': C.muted }}>{t('gym.members.filterNoPlan', 'Sans plan')}</span>
                )}
                {statusMeta && (
                  <span className="dot-sm" style={{ width:9, height:9, borderRadius:'50%', background:statusMeta.color, flex:'none' }} aria-hidden/>
                )}
                <button
                  title={t('gym.members.reprintRegistration')}
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation()
                    printGym(m, tenant, 'enskripsyon', { planName: m.currentMembership?.planName })
                  }}
                  className="gx-icon-btn">
                  <Printer size={15}/>
                </button>
                <ChevronRight size={18} className="gx-chevron"/>
              </Link>
            )
          })}
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)}/>}
      {showFeeForm && <RegistrationFeeFormModal currentFee={fee} onClose={() => setShowFeeForm(false)}/>}

      <style>{`
        .gx-row .dot-sm{display:none}
        @media (max-width:520px){ .gx-row .dot-sm{display:block} }
      `}</style>
    </div>
  )
}