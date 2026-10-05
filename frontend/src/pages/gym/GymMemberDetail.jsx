// src/pages/gym/GymMemberDetail.jsx
// ✅ GYM FITNESS — Pwofil manm (stil Plus Fit): hero ak abònman aktif + jou ki rete,
//    istorik abònman, peman, check-in — animasyon, responsive
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Phone, Mail, Plus, CreditCard, Wallet, LogIn, Ban, Printer, CalendarClock, UserX } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { useAuthStore } from '../../stores/authStore'
import {
  C, GymStyles, Modal, Field, Avatar, AnimatedNumber, EmptyState, SkeletonRows,
  fmtMoney, fmtDate, fmtDateShort, fmtTime, FONT_DISPLAY,
} from './gymUI'

const STATUS_COLORS = {
  active:    { color:'#16a34a', labelKey:'gym.members.status.active' },
  expired:   { color:'#dc2626', labelKey:'gym.members.status.expired' },
  cancelled: { color:'#64748b', labelKey:'gym.members.status.cancelled' },
}

const METHODS = ['cash', 'moncash', 'natcash', 'card', 'bank']

function NewMembershipModal({ memberId, member, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const { register, handleSubmit, watch } = useForm()
  const { data: plans } = useQuery({ queryKey:['gym-plans'], queryFn: () => gymAPI.getPlans().then(r => r.data.plans) })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.createMembership(memberId, data),
    onSuccess: (res, variables) => {
      toast.success(t('gym.memberDetail.membershipModal.created'))
      qc.invalidateQueries(['gym-member', memberId])
      qc.invalidateQueries(['gym-memberships', memberId])
      const plan = plans?.find(p => p.id === variables.planId)
      printGym(member, tenant, 'plan', {
        planName: plan?.name,
        amountPaid: variables.amountPaid,
        method: variables.method,
        startDate: res.data.membership?.startDate || variables.startDate,
        endDate: res.data.membership?.endDate,
      })
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.memberDetail.error')),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, amountPaid: Number(data.amountPaid || 0) })

  const plan = plans?.find(p => p.id === watch('planId')) || plans?.[0]
  const start = watch('startDate')
  const endPreview = plan && start ? new Date(new Date(start).getTime() + Number(plan.durationDays) * 86400000) : null

  return (
    <Modal icon={CreditCard} title={t('gym.memberDetail.membershipModal.title')} subtitle={member?.fullName}
      onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={460}>
      <Field label={t('gym.memberDetail.membershipModal.plan')}>
        <select {...register('planId', { required:true })} className="gx-input">
          {plans?.map(p => <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHtg).toLocaleString('fr-FR')} HTG</option>)}
        </select>
      </Field>
      <Field label={t('gym.memberDetail.membershipModal.startDate')}
        hint={endPreview && !isNaN(endPreview) ? `→ ${fmtDate(endPreview)}` : null}>
        <input type="date" defaultValue={new Date().toISOString().split('T')[0]} {...register('startDate', { required:true })} className="gx-input"/>
      </Field>
      <div className="gx-two">
        <Field label={t('gym.memberDetail.membershipModal.amountPaid')}>
          <input type="number" step="0.01" {...register('amountPaid')} className="gx-input" placeholder={plan ? String(plan.priceHtg) : ''}/>
        </Field>
        <Field label={t('gym.memberDetail.membershipModal.method')}>
          <select {...register('method')} className="gx-input">
            {METHODS.map(m => <option key={m} value={m}>{t(`gym.memberDetail.methods.${m}`)}</option>)}
          </select>
        </Field>
      </div>
      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:8 }}>
        {mutation.isPending ? t('gym.memberDetail.membershipModal.saving') : t('gym.memberDetail.membershipModal.create')}
      </button>
    </Modal>
  )
}

function NewPaymentModal({ memberId, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues:{ type:'manual', method:'cash' } })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.addPayment(memberId, data),
    onSuccess: () => {
      toast.success(t('gym.memberDetail.paymentModal.recorded'))
      qc.invalidateQueries(['gym-payments', memberId])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.memberDetail.error')),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, amountHtg: Number(data.amountHtg) })

  return (
    <Modal icon={Wallet} title={t('gym.memberDetail.paymentModal.title')} onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={420}>
      <Field label={t('gym.memberDetail.paymentModal.amount')}>
        <input type="number" step="0.01" {...register('amountHtg', { required:true, min:0 })} className="gx-input big" autoFocus/>
      </Field>
      <Field label={t('gym.memberDetail.paymentModal.method')}>
        <select {...register('method')} className="gx-input">
          {METHODS.map(m => <option key={m} value={m}>{t(`gym.memberDetail.methods.${m}`)}</option>)}
        </select>
      </Field>
      <Field label={t('gym.memberDetail.paymentModal.notes')}>
        <input {...register('notes')} className="gx-input"/>
      </Field>
      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:8 }}>
        {mutation.isPending ? t('gym.memberDetail.paymentModal.saving') : t('gym.memberDetail.paymentModal.record')}
      </button>
    </Modal>
  )
}

function SectionCard({ icon:Icon, title, count, children, delay }) {
  return (
    <div className="gx-card gx-pad gx-in" style={{ animationDelay:`${delay}ms` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <span style={{ width:34, height:34, borderRadius:11, background:C.night, color:C.volt, display:'grid', placeItems:'center', flex:'none' }}>
          <Icon size={16}/>
        </span>
        <h3 style={{ margin:0, fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:20, textTransform:'uppercase', letterSpacing:'.05em' }}>{title}</h3>
        {count != null && <span className="gx-count">{count}</span>}
      </div>
      {children}
    </div>
  )
}

export default function GymMemberDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const [showMembership, setShowMembership] = useState(false)
  const [showPayment, setShowPayment] = useState(false)

  const { data: member, isLoading } = useQuery({
    queryKey: ['gym-member', id],
    queryFn: () => gymAPI.getMember(id).then(r => r.data.member),
  })
  const { data: memberships } = useQuery({
    queryKey: ['gym-memberships', id],
    queryFn: () => gymAPI.getMemberships(id).then(r => r.data.memberships),
  })
  const { data: payments } = useQuery({
    queryKey: ['gym-payments', id],
    queryFn: () => gymAPI.getPayments({ memberId: id, limit: 20 }).then(r => r.data.payments),
  })
  const { data: checkIns } = useQuery({
    queryKey: ['gym-checkins', id],
    queryFn: () => gymAPI.getCheckIns({ memberId: id, limit: 10 }).then(r => r.data.checkIns),
  })

  const cancelMutation = useMutation({
    mutationFn: (membershipId) => gymAPI.cancelMembership(membershipId),
    onSuccess: () => { toast.success(t('gym.memberDetail.membershipCancelled')); qc.invalidateQueries(['gym-memberships', id]) },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.memberDetail.error')),
  })

  if (isLoading) return (
    <div className="gx-page"><GymStyles/>
      <div className="gx-skel" style={{ height:230, borderRadius:28, marginBottom:20 }}/>
      <SkeletonRows rows={4} height={70}/>
    </div>
  )
  if (!member) return (
    <div className="gx-page"><GymStyles/>
      <EmptyState icon={UserX} text={t('gym.memberDetail.notFound')}
        action={<Link to="/app/gym/members" className="gx-btn gx-btn-dark"><ArrowLeft size={15}/> {t('gym.memberDetail.backToMembers')}</Link>}/>
    </div>
  )

  // Abònman aktif + jou ki rete
  const activeMs = memberships?.find(ms => ms.status === 'active')
  let daysLeft = null, progress = 0
  if (activeMs?.endDate) {
    const start = new Date(activeMs.startDate).getTime()
    const end = new Date(activeMs.endDate).getTime()
    const now = Date.now()
    daysLeft = Math.max(0, Math.ceil((end - now) / 86400000))
    progress = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 100
  }
  const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amountHtg || 0), 0)
  const lastVisit = checkIns?.[0]?.checkInAt
  const ringR = 52, ringC = 2 * Math.PI * ringR

  const reprintPayment = (p) => {
    if (p.type === 'daily') {
      printGym(member, tenant, 'daily', { amount: p.amountHtg, method: p.method })
    } else if (p.type === 'membership') {
      printGym(member, tenant, 'plan', {
        planName: p.membership?.plan?.name,
        amountPaid: p.amountHtg, method: p.method,
        startDate: p.membership?.startDate, endDate: p.membership?.endDate,
      })
    } else {
      printGym(member, tenant, 'peman', { amount: p.amountHtg, method: p.method, notes: p.notes })
    }
  }

  return (
    <div className="gx-page">
      <GymStyles/>
      <style>{`
        .gx-md-hero{display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center}
        .gx-md-side{display:flex;align-items:center;gap:18px;padding-left:28px;border-left:1px solid ${C.line}}
        .gx-md-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;align-items:start}
        .gx-back{display:inline-flex;align-items:center;gap:6px;color:${C.muted};font-size:13px;font-weight:700;text-decoration:none;margin-bottom:14px;transition:color .2s, gap .2s}
        .gx-back:hover{color:${C.ink};gap:10px}
        .gx-contact{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:rgba(242,241,236,.7);background:rgba(255,255,255,.06);padding:5px 11px;border-radius:999px;text-decoration:none}
        a.gx-contact:hover{background:rgba(255,255,255,.12);color:#fff}
        @media (max-width: 900px){
          .gx-md-hero{grid-template-columns:1fr}
          .gx-md-side{padding-left:0;border-left:0;border-top:1px solid ${C.line};padding-top:18px}
          .gx-md-grid{grid-template-columns:1fr}
        }
      `}</style>

      <Link to="/app/gym/members" className="gx-back gx-in"><ArrowLeft size={15}/> {t('gym.memberDetail.backToMembers')}</Link>

      <section className="gx-hero gx-in" style={{ animationDelay:'60ms' }}>
        <div className="gx-hero-glow"/>
        <div className="gx-hero-grid"/>
        <div className="gx-md-hero">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
              <Avatar name={member.fullName} size={72}/>
              <div style={{ minWidth:0 }}>
                <span className="gx-eyebrow">
                  {activeMs ? <><span className="gx-live"/> {t('gym.members.status.active')}</> : t('gym.memberDetail.noActivePlan', 'Aucun abonnement actif')}
                </span>
                <h1 className="gx-title">{member.fullName}</h1>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                  {member.phone && <a href={`tel:${member.phone}`} className="gx-contact"><Phone size={12}/>{member.phone}</a>}
                  {member.email && <a href={`mailto:${member.email}`} className="gx-contact"><Mail size={12}/>{member.email}</a>}
                </div>
              </div>
            </div>
            <div className="gx-hero-stats" style={{ '--n': 3 }}>
              <div className="gx-hstat tone-volt">
                <span className="gx-label-dark"><Wallet size={13}/> {t('gym.memberDetail.totalPaid', 'Total payé')}</span>
                <p className="gx-hstat-val"><AnimatedNumber value={totalPaid} suffix="HTG"/></p>
              </div>
              <div className="gx-hstat">
                <span className="gx-label-dark"><LogIn size={13}/> {t('gym.memberDetail.visits', 'Visites')}</span>
                <p className="gx-hstat-val"><AnimatedNumber value={checkIns?.length || 0}/></p>
              </div>
              <div className="gx-hstat tone-sky">
                <span className="gx-label-dark"><CalendarClock size={13}/> {t('gym.memberDetail.lastVisit', 'Dernière visite')}</span>
                <p className="gx-hstat-val">{lastVisit ? fmtDateShort(lastVisit) : '—'}</p>
              </div>
            </div>
          </div>

          <div className="gx-md-side">
            <div style={{ position:'relative', width:124, height:124, flex:'none' }}>
              <svg width="124" height="124" viewBox="0 0 124 124">
                <circle cx="62" cy="62" r={ringR} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12"/>
                <circle cx="62" cy="62" r={ringR} fill="none" stroke={daysLeft != null && daysLeft <= 3 ? C.ember : C.volt} strokeWidth="12"
                  strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringC * (progress / 100)}
                  transform="rotate(-90 62 62)" style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'grid', placeContent:'center', textAlign:'center' }}>
                <span style={{ fontFamily:FONT_DISPLAY, fontWeight:800, fontSize:38, lineHeight:1 }}>{daysLeft ?? '—'}</span>
                <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(242,241,236,.55)' }}>
                  {t('gym.memberDetail.daysLeft', 'jours restants')}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:170 }}>
              {activeMs && (
                <div style={{ marginBottom:4 }}>
                  <p style={{ margin:0, fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:22, textTransform:'uppercase' }}>{activeMs.planName || t('gym.memberDetail.plan')}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'rgba(242,241,236,.55)', fontWeight:600 }}>
                    {fmtDate(activeMs.startDate)}{activeMs.endDate && ` → ${fmtDate(activeMs.endDate)}`}
                  </p>
                </div>
              )}
              <button onClick={() => setShowMembership(true)} className="gx-btn gx-btn-volt"><Plus size={15}/> {t('gym.memberDetail.addMembership')}</button>
              <button onClick={() => setShowPayment(true)} className="gx-btn gx-btn-ghost-dark"><Plus size={15}/> {t('gym.memberDetail.addPayment')}</button>
            </div>
          </div>
        </div>
      </section>

      <div className="gx-md-grid">
        <div className="gx-stack" style={{ gap:16 }}>
          <SectionCard icon={CreditCard} title={t('gym.memberDetail.membershipHistory')} count={memberships?.length} delay={140}>
            {!memberships?.length ? (
              <p style={{ color:C.muted, fontSize:13, margin:0 }}>{t('gym.memberDetail.noMemberships')}</p>
            ) : (
              <div className="gx-stack" style={{ gap:8 }}>
                {memberships.map((ms, i) => {
                  const meta = STATUS_COLORS[ms.status] || STATUS_COLORS.cancelled
                  return (
                    <div key={ms.id} className="gx-row inset gx-slide" style={{ animationDelay:`${200 + i * 50}ms`, flexWrap:'wrap' }}>
                      <span style={{ width:4, alignSelf:'stretch', borderRadius:4, background:meta.color, flex:'none' }}/>
                      <div className="grow">
                        <p className="gx-row-title">{ms.planName || t('gym.memberDetail.plan')}</p>
                        <p className="gx-row-meta">{fmtDate(ms.startDate)} {ms.endDate && `→ ${fmtDate(ms.endDate)}`}</p>
                      </div>
                      <span className="gx-chip" style={{ '--c': meta.color }}><span className="dot"/>{t(meta.labelKey)}</span>
                      <button className="gx-icon-btn" title={t('gym.memberDetail.reprintMembership')} onClick={() => printGym(member, tenant, 'plan', {
                        planName: ms.plan?.name || ms.planName,
                        amountPaid: ms.priceHtg,
                        startDate: ms.startDate,
                        endDate: ms.endDate,
                      })}><Printer size={14}/></button>
                      {ms.status === 'active' && (
                        <button onClick={() => cancelMutation.mutate(ms.id)} title={t('gym.memberDetail.cancelAction')} className="gx-icon-btn danger">
                          <Ban size={14}/>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Wallet} title={t('gym.memberDetail.paymentHistory')} count={payments?.length} delay={200}>
            {!payments?.length ? (
              <p style={{ color:C.muted, fontSize:13, margin:0 }}>{t('gym.memberDetail.noPayments')}</p>
            ) : (
              <div className="gx-stack" style={{ gap:8 }}>
                {payments.map((p, i) => (
                  <div key={p.id} className="gx-row inset gx-slide" style={{ animationDelay:`${260 + Math.min(i, 8) * 40}ms` }}>
                    <div className="grow">
                      <p className="gx-display" style={{ margin:0, fontSize:22 }}>{fmtMoney(p.amountHtg)} <small style={{ fontSize:12, color:C.muted }}>HTG</small></p>
                      <p className="gx-row-meta">
                        {fmtDate(p.createdAt)}
                        <span className="gx-chip" style={{ '--c': C.ink, padding:'2px 8px', textTransform:'uppercase' }}>{p.method}</span>
                        {p.notes && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>· {p.notes}</span>}
                      </p>
                    </div>
                    <button className="gx-icon-btn" title={t('gym.memberDetail.reprintPayment')} onClick={() => reprintPayment(p)}><Printer size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard icon={LogIn} title={t('gym.memberDetail.recentCheckIns')} count={checkIns?.length} delay={260}>
          {!checkIns?.length ? (
            <p style={{ color:C.muted, fontSize:13, margin:0 }}>{t('gym.memberDetail.noCheckIns')}</p>
          ) : (
            <div style={{ position:'relative', paddingLeft:22 }}>
              <span style={{ position:'absolute', left:6, top:6, bottom:6, width:2, background:C.border, borderRadius:2 }}/>
              {checkIns.map((c, i) => (
                <div key={c.id} className="gx-slide" style={{ position:'relative', padding:'8px 0', animationDelay:`${320 + i * 45}ms` }}>
                  <span style={{ position:'absolute', left:-21, top:13, width:12, height:12, borderRadius:'50%', background: i === 0 ? C.volt : C.card, border:`2px solid ${i === 0 ? C.night : 'rgba(20,21,26,.25)'}` }}/>
                  <p style={{ margin:0, fontWeight:700, fontSize:13.5 }}>{fmtDate(c.checkInAt)}</p>
                  <p style={{ margin:'2px 0 0', color:C.muted, fontSize:12.5, fontWeight:600 }}>
                    {fmtTime(c.checkInAt)}{c.checkOutAt && ` → ${fmtTime(c.checkOutAt)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {showMembership && <NewMembershipModal memberId={id} member={member} onClose={() => setShowMembership(false)}/>}
      {showPayment && <NewPaymentModal memberId={id} onClose={() => setShowPayment(false)}/>}
    </div>
  )
}