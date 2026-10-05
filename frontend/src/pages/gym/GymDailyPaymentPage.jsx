// src/pages/gym/GymDailyPaymentPage.jsx
// ✅ GYM FITNESS — Peman Pa Jou (stil Plus Fit): chèche manm, konfime peman tarif jounalye a
// san bezwen kreye yon plan. Tarif la konfigirab nenpòt kilè nan hero a anwo paj la.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Search, Banknote, CheckCircle2, Settings2, Printer, UserX, Receipt, Coins } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { useAuthStore } from '../../stores/authStore'
import {
  C, GymStyles, PageHero, Modal, Field, Avatar, EmptyState, SkeletonRows, SectionHead,
  fmtMoney, fmtTime,
} from './gymUI'

function RateFormModal({ currentRate, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: { priceHtg: currentRate?.priceHtg || '', priceUsd: currentRate?.priceUsd || '' },
  })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.setDailyRate(data),
    onSuccess: () => {
      toast.success(t('gym.dailyPayment.rateModal.updated'))
      qc.invalidateQueries(['gym-daily-rate'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.dailyPayment.error')),
  })

  const onSubmit = (data) => mutation.mutate({ priceHtg: Number(data.priceHtg), priceUsd: data.priceUsd ? Number(data.priceUsd) : null })

  return (
    <Modal icon={Settings2} title={t('gym.dailyPayment.rateModal.title')} subtitle={t('gym.dailyPayment.rateModal.hint')}
      onClose={onClose} onSubmit={handleSubmit(onSubmit)} maxWidth={420}>
      <Field label={t('gym.dailyPayment.rateModal.priceHtg')}>
        <input type="number" step="0.01" {...register('priceHtg', { required:true, min:0 })} className="gx-input big" autoFocus/>
      </Field>
      <Field label={t('gym.dailyPayment.rateModal.priceUsd')}>
        <input type="number" step="0.01" {...register('priceUsd')} className="gx-input"/>
      </Field>
      <button type="submit" disabled={mutation.isPending} className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:8 }}>
        {mutation.isPending ? t('gym.dailyPayment.rateModal.saving') : t('gym.dailyPayment.rateModal.save')}
      </button>
    </Modal>
  )
}

function ConfirmPaymentModal({ member, rate, onClose, onConfirm, isPending }) {
  const { t } = useTranslation()
  const due = Number(rate?.priceHtg || 0)
  const [amountGiven, setAmountGiven] = useState(String(due))
  const changeDue = Math.max(0, Number(amountGiven || 0) - due)
  const notEnough = Number(amountGiven || 0) < due

  // Montan rapid: egzak, epi awondi a 250 / 500 / 1000 siperyè
  const quick = [...new Set([due, ...[250, 500, 1000].map(s => Math.ceil(due / s) * s)])].filter(v => v > 0).slice(0, 4)

  return (
    <Modal icon={Banknote} title={t('gym.dailyPayment.changeModal.title')} onClose={onClose} maxWidth={420}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:C.soft, borderRadius:16, marginBottom:16 }}>
        <Avatar name={member?.fullName} size={42}/>
        <div style={{ minWidth:0 }}>
          <p className="gx-row-title">{member?.fullName}</p>
          <p className="gx-row-meta">{member?.phone || '—'}</p>
        </div>
      </div>

      <div className="gx-summary" style={{ background:C.night, color:'#f2f1ec' }}>
        <div className="total" style={{ border:0, margin:0, padding:0 }}>
          <span style={{ color:'rgba(242,241,236,.6)' }}>{t('gym.dailyPayment.changeModal.amountDue')}</span>
          <b style={{ color:C.volt, fontSize:34 }}>{fmtMoney(due)} <small style={{ fontSize:14, color:'rgba(242,241,236,.55)' }}>HTG</small></b>
        </div>
      </div>

      <Field label={t('gym.dailyPayment.changeModal.amountReceived')}>
        <input type="number" step="0.01" autoFocus value={amountGiven} onChange={e => setAmountGiven(e.target.value)}
          className="gx-input big" onKeyDown={e => { if (e.key === 'Enter' && !isPending && !notEnough) onConfirm(changeDue) }}/>
        <div className="gx-quick-amounts">
          {quick.map(v => (
            <button type="button" key={v} className={Number(amountGiven) === v ? 'on' : ''} onClick={() => setAmountGiven(String(v))}>
              {fmtMoney(v)}
            </button>
          ))}
        </div>
      </Field>

      {changeDue > 0 && (
        <div className="gx-change">
          <span>{t('gym.dailyPayment.changeModal.changeDue')}</span>
          <b>{fmtMoney(changeDue)} HTG</b>
        </div>
      )}

      <button type="button" disabled={isPending || notEnough} onClick={() => onConfirm(changeDue)}
        className="gx-btn gx-btn-dark gx-btn-block" style={{ marginTop:18 }}>
        <CheckCircle2 size={16}/> {isPending ? t('gym.dailyPayment.changeModal.confirming') : t('gym.dailyPayment.changeModal.confirm')}
      </button>
    </Modal>
  )
}

export default function GymDailyPaymentPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const [search, setSearch] = useState('')
  const [showRateForm, setShowRateForm] = useState(false)
  const [confirmed, setConfirmed] = useState([])
  const [payingMember, setPayingMember] = useState(null)

  const { data: rate, isLoading: loadingRate } = useQuery({
    queryKey: ['gym-daily-rate'],
    queryFn: () => gymAPI.getDailyRate().then(r => r.data.rate),
  })

  const { data: membersData, isFetching: searching } = useQuery({
    queryKey: ['gym-members-search-daily', search],
    queryFn: () => gymAPI.getMembers({ search: search || undefined, limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  })

  const confirmMutation = useMutation({
    mutationFn: ({ memberId }) => gymAPI.confirmDailyPayment(memberId, { method: 'cash' }),
    onSuccess: (res, { memberId, changeDue }) => {
      toast.success(t('gym.dailyPayment.paymentConfirmed'))
      const member = membersData?.members?.find(m => m.id === memberId) || payingMember
      setConfirmed(c => [{ id: res.data.payment?.id || Date.now(), member, amount: res.data.payment?.amountHtg, changeDue, at: new Date() }, ...c])
      printGym(member, tenant, 'daily', { amount: res.data.payment?.amountHtg, method: 'cash' })
      setSearch('')
      setPayingMember(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.dailyPayment.error')),
  })

  const results = membersData?.members || []
  const sessionTotal = confirmed.reduce((s, c) => s + Number(c.amount || 0), 0)

  const rateValue = loadingRate ? '…' : rate ? fmtMoney(rate.priceHtg) : '—'

  return (
    <div className="gx-page narrow">
      <GymStyles/>

      <PageHero
        icon={Banknote}
        eyebrow={t('gym.dailyPayment.eyebrow', 'Caisse')}
        title={t('gym.dailyPayment.title')}
        subtitle={t('gym.dailyPayment.subtitle', 'Encaissez une séance à la journée sans créer de plan')}
        actions={
          <button onClick={() => setShowRateForm(true)} className="gx-btn gx-btn-ghost-dark">
            <Settings2 size={15}/> {t('gym.dailyPayment.editRate')}
          </button>
        }
        stats={[
          {
            label: t('gym.dailyPayment.currentRate'), value: rateValue, suffix: rate ? 'HTG' : null, icon: Coins, tone: 'volt',
            hint: !loadingRate && !rate ? t('gym.dailyPayment.noRate') : rate?.priceUsd ? `$${Number(rate.priceUsd).toLocaleString('fr-FR')}` : null,
          },
          { label: t('gym.dailyPayment.confirmedToday'), value: confirmed.length, icon: Receipt },
          { label: t('gym.dailyPayment.sessionTotal', 'Encaissé'), value: sessionTotal, suffix: 'HTG', icon: Banknote, tone: 'ember' },
        ]}
      />

      {!loadingRate && !rate && (
        <div className="gx-in" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', padding:'14px 18px', borderRadius:18, background:'rgba(220,38,38,.07)', border:'1px solid rgba(220,38,38,.18)', color:C.red, fontWeight:700, fontSize:13.5, marginBottom:14 }}>
          {t('gym.dailyPayment.noRate')}
          <button onClick={() => setShowRateForm(true)} className="gx-btn gx-btn-dark gx-btn-sm"><Settings2 size={13}/> {t('gym.dailyPayment.editRate')}</button>
        </div>
      )}

      <div className="gx-search big gx-in" style={{ animationDelay:'120ms' }}>
        <Search size={20} className="lead"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('gym.dailyPayment.searchPlaceholder')}/>
      </div>

      {search.length >= 2 && (
        <div className="gx-stack" style={{ marginTop:12 }}>
          {searching && !results.length ? (
            <SkeletonRows rows={2} height={70}/>
          ) : !results.length ? (
            <EmptyState icon={UserX} text={t('gym.dailyPayment.noMembers')}/>
          ) : results.map((m, i) => (
            <button key={m.id} onClick={() => setPayingMember(m)} disabled={confirmMutation.isPending || !rate}
              className="gx-row clickable gx-slide" style={{ animationDelay:`${i * 50}ms`, opacity: rate ? 1 : .55 }}>
              <Avatar name={m.fullName} size={44}/>
              <div className="grow">
                <p className="gx-row-title">{m.fullName}</p>
                <p className="gx-row-meta">{m.phone || '—'}</p>
              </div>
              <span className="gx-btn gx-btn-dark gx-btn-sm" style={{ pointerEvents:'none' }}>
                <CheckCircle2 size={14}/> <span className="gx-hide-sm">{t('gym.dailyPayment.confirmPayment')}</span>
                {rate && <b style={{ color:C.volt }}>{fmtMoney(rate.priceHtg)}</b>}
              </span>
            </button>
          ))}
        </div>
      )}

      {confirmed.length > 0 && (
        <>
          <SectionHead title={t('gym.dailyPayment.confirmedToday')} count={confirmed.length}/>
          <div className="gx-stack">
            {confirmed.map(c => (
              <div key={c.id} className="gx-row gx-slide">
                <span style={{ width:38, height:38, borderRadius:12, background:C.volt, color:C.night, display:'grid', placeItems:'center', flex:'none' }}>
                  <CheckCircle2 size={18}/>
                </span>
                <div className="grow">
                  <p className="gx-row-title">{c.member?.fullName}</p>
                  <p className="gx-row-meta">
                    {fmtTime(c.at)}
                    {c.changeDue > 0 && <span style={{ color:'#b8430f', fontWeight:700 }}>· {t('gym.dailyPayment.changeModal.changeGiven')}: {fmtMoney(c.changeDue)} HTG</span>}
                  </p>
                </div>
                <span className="gx-display" style={{ fontSize:22, whiteSpace:'nowrap' }}>{fmtMoney(c.amount)} <small style={{ fontSize:12, color:C.muted }}>HTG</small></span>
                <button title={t('gym.dailyPayment.reprintReceipt')} className="gx-icon-btn"
                  onClick={() => printGym(c.member, tenant, 'daily', { amount: c.amount, method: 'cash' })}>
                  <Printer size={15}/>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showRateForm && <RateFormModal currentRate={rate} onClose={() => setShowRateForm(false)}/>}

      {payingMember && (
        <ConfirmPaymentModal
          member={payingMember}
          rate={rate}
          isPending={confirmMutation.isPending}
          onClose={() => setPayingMember(null)}
          onConfirm={(changeDue) => confirmMutation.mutate({ memberId: payingMember.id, changeDue })}
        />
      )}
    </div>
  )
}