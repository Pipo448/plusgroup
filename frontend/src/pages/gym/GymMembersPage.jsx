// src/pages/gym/GymMembersPage.jsx
// ✅ NOUVO — Modil Jim/Gym: Lis manm + ajoute nouvo manm
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, X, Users, ChevronRight } from 'lucide-react'
import { gymAPI } from '../../services/api'

function AddMemberModal({ onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: plans } = useQuery({
    queryKey: ['gym-plans'],
    queryFn: () => gymAPI.getPlans().then(r => r.data.plans),
  })

  const mutation = useMutation({
    mutationFn: (data) => gymAPI.addMember(data),
    onSuccess: () => {
      toast.success('Manm ajoute!')
      qc.invalidateQueries(['gym-members'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const onSubmit = (data) => {
    const payload = { ...data }
    if (!payload.planId) delete payload.planId
    else payload.amountPaid = Number(payload.amountPaid || 0)
    mutation.mutate(payload)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: '#0f172a', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: '#C9A84C', margin: 0, fontSize: 16 }}>Nouvo Manm</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <label style={labelStyle}>Non Konplè</label>
        <input {...register('fullName', { required: true })} style={inputStyle} />
        {errors.fullName && <p style={errorStyle}>Non obligatwa.</p>}

        <label style={labelStyle}>Telefòn</label>
        <input {...register('phone')} style={inputStyle} />

        <label style={labelStyle}>Email (opsyonèl)</label>
        <input type="email" {...register('email')} style={inputStyle} />

        <label style={labelStyle}>Kontak Ijans</label>
        <input {...register('emergencyContact')} style={inputStyle} />

        <label style={labelStyle}>Telefòn Ijans</label>
        <input {...register('emergencyPhone')} style={inputStyle} />

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 10px' }}>Abònman inisyal (opsyonèl)</p>
          <label style={labelStyle}>Plan</label>
          <select {...register('planId')} style={inputStyle}>
            <option value="">— San plan (ajoute pita) —</option>
            {plans?.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHtg).toLocaleString('fr-FR')} HTG</option>
            ))}
          </select>
          <label style={labelStyle}>Montan Peye (HTG)</label>
          <input type="number" step="0.01" {...register('amountPaid')} style={inputStyle} />
        </div>

        <button type="submit" disabled={mutation.isPending}
          style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {mutation.isPending ? 'Ap sove...' : 'Ajoute Manm'}
        </button>
      </form>
    </div>
  )
}

const labelStyle = { display: 'block', color: '#94a3b8', fontSize: 12, margin: '12px 0 6px' }
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }
const errorStyle = { color: '#C0392B', fontSize: 11, margin: '4px 0 0' }

const STATUS_COLORS = {
  active:    { bg: 'rgba(39,174,96,0.12)', color: '#27ae60', label: 'Aktif' },
  expired:   { bg: 'rgba(192,57,43,0.12)', color: '#C0392B', label: 'Ekspire' },
  cancelled: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Anile' },
}

export default function GymMembersPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['gym-members', search],
    queryFn: () => gymAPI.getMembers({ search: search || undefined, limit: 50 }).then(r => r.data),
  })

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={22} color="#C9A84C" />
          <h1 style={{ margin: 0, fontSize: 19, color: '#fff' }}>Manm Jim</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#27ae60', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={16} /> Nouvo Manm
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Chèche pa non oswa telefòn..."
          style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {isLoading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ap chaje...</p>
      ) : !data?.members?.length ? (
        <div style={{ textAlign: 'center', padding: 50, background: 'rgba(255,255,255,0.03)', borderRadius: 12, color: '#64748b' }}>
          Pa gen manm jwenn.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.members.map(m => {
            const statusMeta = m.currentMembership ? STATUS_COLORS[m.currentMembership.status] || STATUS_COLORS.cancelled : null
            return (
              <Link key={m.id} to={`/app/gym/members/${m.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${m.isActive ? 'rgba(255,255,255,0.08)' : 'rgba(192,57,43,0.2)'}`,
                textDecoration: 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{m.fullName}</span>
                    {!m.isActive && <span style={{ fontSize: 9, color: '#C0392B', background: 'rgba(192,57,43,0.1)', padding: '2px 6px', borderRadius: 4 }}>Inaktif</span>}
                  </div>
                  <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>{m.phone || '—'}</p>
                </div>
                {statusMeta && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: statusMeta.bg, color: statusMeta.color, whiteSpace: 'nowrap' }}>
                    {m.currentMembership.planName || 'Plan'} · {statusMeta.label}
                  </span>
                )}
                <ChevronRight size={16} color="#475569" />
              </Link>
            )
          })}
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
