// src/pages/gym/GymDailyPaymentPage.jsx
// ✅ GYM FITNESS — Peman Pa Jou: chèche manm, konfime peman tarif jounalye a
// san bezwen kreye yon plan. Tarif la konfigirab nenpòt kilè nan seksyon
// "Tarif" anwo paj la.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Search, Banknote, CheckCircle2, Settings2, X, Printer } from 'lucide-react'
import { gymAPI } from '../../services/api'
import { usePrinterStore } from '../../stores/printerStore'
import { useAuthStore } from '../../stores/authStore'

const G = {
  teal:'#14B8A6', ink:'#1a0533', muted:'#64748b',
  border:'rgba(0,0,0,0.08)', card:'#ffffff', bgSoft:'#f8fafc',
  shadow:'0 2px 14px rgba(20,20,43,0.06)', green:'#22c55e', amber:'#d97706',
}

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
    <div style={{ position:'fixed', inset:0, background:'rgba(26,5,51,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="gym-modal-pop" style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:18, padding:24, width:'100%', maxWidth:400, boxShadow:'0 24px 60px rgba(20,20,43,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ color:G.ink, margin:0, fontSize:16, fontWeight:800 }}>{t('gym.dailyPayment.rateModal.title')}</h3>
          <button type="button" onClick={onClose} style={{ background:G.bgSoft, border:'none', borderRadius:8, padding:6, color:G.muted, cursor:'pointer', display:'flex' }}><X size={16} /></button>
        </div>

        <label style={{ display:'block', color:G.muted, fontSize:12, fontWeight:600, marginBottom:6 }}>{t('gym.dailyPayment.rateModal.priceHtg')}</label>
        <input type="number" step="0.01" {...register('priceHtg', { required:true, min:0 })} style={inputStyle} autoFocus />

        <label style={{ display:'block', color:G.muted, fontSize:12, fontWeight:600, margin:'14px 0 6px' }}>{t('gym.dailyPayment.rateModal.priceUsd')}</label>
        <input type="number" step="0.01" {...register('priceUsd')} style={inputStyle} />

        <button type="submit" disabled={mutation.isPending}
          style={{ width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${G.teal},#0d9488)`, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:14, boxShadow:'0 8px 20px rgba(20,184,166,0.3)' }}>
          {mutation.isPending ? t('gym.dailyPayment.rateModal.saving') : t('gym.dailyPayment.rateModal.save')}
        </button>
        <p style={{ fontSize:11, color:G.muted, textAlign:'center', marginTop:12 }}>
          {t('gym.dailyPayment.rateModal.hint')}
        </p>
      </form>
    </div>
  )
}

const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontSize:14, boxSizing:'border-box' }

export default function GymDailyPaymentPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { tenant } = useAuthStore()
  const { printGym } = usePrinterStore()
  const [search, setSearch] = useState('')
  const [showRateForm, setShowRateForm] = useState(false)
  const [confirmed, setConfirmed] = useState([])

  const { data: rate, isLoading: loadingRate } = useQuery({
    queryKey: ['gym-daily-rate'],
    queryFn: () => gymAPI.getDailyRate().then(r => r.data.rate),
  })

  const { data: membersData } = useQuery({
    queryKey: ['gym-members-search-daily', search],
    queryFn: () => gymAPI.getMembers({ search: search || undefined, limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  })

  const confirmMutation = useMutation({
    mutationFn: (memberId) => gymAPI.confirmDailyPayment(memberId, { method: 'cash' }),
    onSuccess: (res, memberId) => {
      toast.success(t('gym.dailyPayment.paymentConfirmed'))
      const member = membersData?.members?.find(m => m.id === memberId)
      setConfirmed(c => [{ id: res.data.payment?.id || Date.now(), member, amount: res.data.payment?.amountHtg, at: new Date() }, ...c])
      printGym(member, tenant, 'daily', { amount: res.data.payment?.amountHtg, method: 'cash' })
      setSearch('')
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.dailyPayment.error')),
  })

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div className="gym-fadeup" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${G.amber},#b45309)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 16px rgba(217,119,6,0.3)' }}>
          <Banknote size={22} color="#fff" />
        </div>
        <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:G.ink }}>{t('gym.dailyPayment.title')}</h1>
      </div>

      <div className="gym-fadeup" style={{
        background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:'16px 20px',
        boxShadow:G.shadow, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:12, animationDelay:'60ms',
      }}>
        <div>
          <p style={{ margin:0, fontSize:11, color:G.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{t('gym.dailyPayment.currentRate')}</p>
          {loadingRate ? (
            <p style={{ margin:'4px 0 0', color:G.muted }}>{t('gym.dailyPayment.loading')}</p>
          ) : !rate ? (
            <p style={{ margin:'4px 0 0', color:'#dc2626', fontWeight:700, fontSize:14 }}>{t('gym.dailyPayment.noRate')}</p>
          ) : (
            <p style={{ margin:'4px 0 0', color:G.teal, fontWeight:900, fontSize:22 }}>
              {Number(rate.priceHtg).toLocaleString('fr-FR')} HTG
              {rate.priceUsd ? <span style={{ fontSize:13, color:G.muted, fontWeight:600 }}> · ${Number(rate.priceUsd).toLocaleString('fr-FR')}</span> : null}
            </p>
          )}
        </div>
        <button onClick={() => setShowRateForm(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.ink, fontWeight:700, cursor:'pointer', fontSize:12 }}>
          <Settings2 size={14} /> {t('gym.dailyPayment.editRate')}
        </button>
      </div>

      <div className="gym-fadeup" style={{ position:'relative', marginBottom:14, animationDelay:'100ms' }}>
        <Search size={18} color={G.muted} style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('gym.dailyPayment.searchPlaceholder')}
          style={{ width:'100%', padding:'16px 16px 16px 46px', borderRadius:16, border:`1px solid ${G.border}`, background:G.card, color:G.ink, fontSize:16, boxSizing:'border-box', boxShadow:G.shadow }}
        />
      </div>

      {search.length >= 2 && (
        <div className="gym-fadeup" style={{ marginBottom:24, display:'flex', flexDirection:'column', gap:8 }}>
          {!membersData?.members?.length ? (
            <p style={{ color:G.muted, fontSize:13, textAlign:'center', padding:16 }}>{t('gym.dailyPayment.noMembers')}</p>
          ) : membersData.members.map(m => (
            <button key={m.id} onClick={() => confirmMutation.mutate(m.id)} disabled={confirmMutation.isPending || !rate}
              className="gym-row"
              style={{
                display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%',
                padding:'14px 18px', borderRadius:14, border:`1px solid rgba(217,119,6,0.25)`,
                background:'rgba(217,119,6,0.06)', color:G.ink, cursor: rate ? 'pointer' : 'not-allowed', textAlign:'left',
                opacity: rate ? 1 : 0.6,
              }}>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{m.fullName}</p>
                <p style={{ margin:'3px 0 0', color:G.muted, fontSize:12 }}>{m.phone || '—'}</p>
              </div>
              <span style={{ display:'flex', alignItems:'center', gap:6, color:'#b45309', fontWeight:800, fontSize:13 }}>
                <CheckCircle2 size={15} /> {t('gym.dailyPayment.confirmPayment')}
              </span>
            </button>
          ))}
        </div>
      )}

      {confirmed.length > 0 && (
        <>
          <h2 style={{ fontSize:12, color:G.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, fontWeight:800 }}>
            {t('gym.dailyPayment.confirmedToday')}
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {confirmed.map(c => (
              <div key={c.id} className="gym-fadeup" style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 16px', borderRadius:12, background:G.card, border:`1px solid ${G.border}`, boxShadow:G.shadow,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <CheckCircle2 size={16} color={G.green} />
                  <p style={{ margin:0, color:G.ink, fontSize:13, fontWeight:700 }}>{c.member?.fullName}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ color:G.teal, fontWeight:800, fontSize:13 }}>{Number(c.amount).toLocaleString('fr-FR')} HTG</span>
                  <button
                    title={t('gym.dailyPayment.reprintReceipt')}
                    onClick={() => printGym(c.member, tenant, 'daily', { amount: c.amount, method: 'cash' })}
                    style={{ background:'rgba(20,184,166,0.1)', border:'none', borderRadius:8, padding:6, color:G.teal, cursor:'pointer', display:'flex' }}>
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showRateForm && <RateFormModal currentRate={rate} onClose={() => setShowRateForm(false)} />}

      <style>{`
        @keyframes gymFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gymPop { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .gym-fadeup { opacity:0; animation: gymFadeUp 0.4s ease forwards; }
        .gym-modal-pop { animation: gymPop 0.22s ease; }
        .gym-row { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .gym-row:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(20,20,43,0.08); }
      `}</style>
    </div>
  )
}