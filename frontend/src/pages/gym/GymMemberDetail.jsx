// src/pages/gym/GymMemberDetail.jsx
// ✅ NOUVO — Modil Jim/Gym: Detay manm (istwa abònman, peman, check-in)
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, CreditCard, Wallet, LogIn, Plus, X } from 'lucide-react'
import { gymAPI } from '../../services/api'

function NewMembershipModal({ memberId, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues: { planId: '', amountPaid: '', method: 'cash' } })

  const { data: plans } = useQuery({
    queryKey: ['gym-plans'],
    queryFn: () => gymAPI.getPlans().then(r => r.data.plans),
  })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.createMembership(memberId, data),
    onSuccess: () => {
      toast.success('Abònman kreye!')
      qc.invalidateQueries(['gym-member', memberId])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, amountPaid: Number(data.amountPaid || 0) })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: '#0f172a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: '#C9A84C', margin: 0, fontSize: 16 }}>Nouvo Abònman</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <label style={labelStyle}>Plan</label>
        <select {...register('planId', { required: true })} style={inputStyle}>
          <option value="">— Chwazi plan —</option>
          {plans?.map(p => <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHtg).toLocaleString('fr-FR')} HTG</option>)}
        </select>
        <label style={labelStyle}>Montan Peye (HTG)</label>
        <input type="number" step="0.01" {...register('amountPaid')} style={inputStyle} />
        <label style={labelStyle}>Metòd Peman</label>
        <select {...register('method')} style={inputStyle}>
          <option value="cash">Kach</option>
          <option value="moncash">MonCash</option>
          <option value="natcash">NatCash</option>
          <option value="card">Kat</option>
          <option value="bank">Bank</option>
        </select>
        <button type="submit" disabled={mutation.isPending}
          style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {mutation.isPending ? 'Ap sove...' : 'Kreye Abònman'}
        </button>
      </form>
    </div>
  )
}

function NewPaymentModal({ memberId, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues: { amountHtg: '', method: 'cash', type: 'visit', notes: '' } })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.addPayment(memberId, data),
    onSuccess: () => {
      toast.success('Peman anrejistre!')
      qc.invalidateQueries(['gym-member', memberId])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => mutation.mutate({ ...data, amountHtg: Number(data.amountHtg) })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: '#0f172a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: '#C9A84C', margin: 0, fontSize: 16 }}>Nouvo Peman</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <label style={labelStyle}>Montan (HTG)</label>
        <input type="number" step="0.01" {...register('amountHtg', { required: true })} style={inputStyle} />
        <label style={labelStyle}>Tip</label>
        <select {...register('type')} style={inputStyle}>
          <option value="visit">Pa Vizit</option>
          <option value="membership">Abònman</option>
          <option value="other">Lòt</option>
        </select>
        <label style={labelStyle}>Metòd</label>
        <select {...register('method')} style={inputStyle}>
          <option value="cash">Kach</option>
          <option value="moncash">MonCash</option>
          <option value="natcash">NatCash</option>
          <option value="card">Kat</option>
          <option value="bank">Bank</option>
        </select>
        <label style={labelStyle}>Nòt (opsyonèl)</label>
        <input {...register('notes')} style={inputStyle} />
        <button type="submit" disabled={mutation.isPending}
          style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {mutation.isPending ? 'Ap sove...' : 'Anrejistre Peman'}
        </button>
      </form>
    </div>
  )
}

const labelStyle = { display: 'block', color: '#94a3b8', fontSize: 12, margin: '12px 0 6px' }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }

const STATUS_COLORS = {
  active:    { bg: 'rgba(39,174,96,0.12)', color: '#27ae60', label: 'Aktif' },
  expired:   { bg: 'rgba(192,57,43,0.12)', color: '#C0392B', label: 'Ekspire' },
  cancelled: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Anile' },
}

export default function GymMemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showMembershipForm, setShowMembershipForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const { data: member, isLoading } = useQuery({
    queryKey: ['gym-member', id],
    queryFn: () => gymAPI.getMember(id).then(r => r.data.member),
  })

  if (isLoading) return <div style={{ padding: 20, color: 'rgba(255,255,255,0.4)' }}>Ap chaje...</div>
  if (!member) return <div style={{ padding: 20, color: '#C0392B' }}>Manm pa jwenn.</div>

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate('/app/gym/members')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={15} /> Retounen
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: '#fff' }}>{member.fullName}</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{member.phone || '—'} {member.email ? `· ${member.email}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowMembershipForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.1)', color: '#C9A84C', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            <CreditCard size={14} /> Abònman
          </button>
          <button onClick={() => setShowPaymentForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            <Wallet size={14} /> Peman
          </button>
        </div>
      </div>

      <h2 style={sectionTitle}>Istwa Abònman</h2>
      {!member.memberships?.length ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>Pa gen abònman ankò.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {member.memberships.map(ms => {
            const meta = STATUS_COLORS[ms.status] || STATUS_COLORS.cancelled
            return (
              <div key={ms.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{ms.plan?.name || 'Pa Vizit'}</p>
                  <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 11 }}>
                    {new Date(ms.startDate).toLocaleDateString('fr-FR')}
                    {ms.endDate && ` → ${new Date(ms.endDate).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
            )
          })}
        </div>
      )}

      <h2 style={sectionTitle}>Istwa Peman</h2>
      {!member.payments?.length ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>Pa gen peman ankò.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {member.payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{Number(p.amountHtg).toLocaleString('fr-FR')} HTG</p>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 11 }}>{p.type} · {p.method} · {new Date(p.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={sectionTitle}>Dènye Antre (Check-in)</h2>
      {!member.checkIns?.length ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>Pa gen antre ankò.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {member.checkIns.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <LogIn size={14} color="#27ae60" />
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                {new Date(c.checkInAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {c.checkOutAt && ` → ${new Date(c.checkOutAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {showMembershipForm && <NewMembershipModal memberId={member.id} onClose={() => setShowMembershipForm(false)} />}
      {showPaymentForm && <NewPaymentModal memberId={member.id} onClose={() => setShowPaymentForm(false)} />}
    </div>
  )
}

const sectionTitle = { fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }
