// src/pages/gym/GymCheckInPage.jsx
// ✅ NOUVO — Modil Jim/Gym: Ekran rapid pou antre manm (check-in)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, LogIn, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { gymAPI } from '../../services/api'

export default function GymCheckInPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: membersData } = useQuery({
    queryKey: ['gym-members-search', search],
    queryFn: () => gymAPI.getMembers({ search: search || undefined, status: 'active', limit: 10 }).then(r => r.data),
    enabled: search.length >= 2,
  })

  const { data: recentCheckIns, isLoading: loadingCheckIns } = useQuery({
    queryKey: ['gym-checkins-today'],
    queryFn: () => gymAPI.getCheckIns({ date: new Date().toISOString().split('T')[0], limit: 30 }).then(r => r.data.checkIns),
    refetchInterval: 15000,
  })

  const checkInMutation = useMutation({
    mutationFn: (memberId) => gymAPI.checkIn(memberId, { method: 'manual' }),
    onSuccess: (res) => {
      const { hasActiveMembership, warning } = res.data
      if (hasActiveMembership) {
        toast.success('Antre konfime! ✅')
      } else {
        toast(warning || 'Antre konfime, men pa gen abònman aktif.', { icon: '⚠️' })
      }
      setSearch('')
      qc.invalidateQueries(['gym-checkins-today'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  const checkOutMutation = useMutation({
    mutationFn: (checkInId) => gymAPI.checkOut(checkInId),
    onSuccess: () => {
      toast.success('Soti konfime!')
      qc.invalidateQueries(['gym-checkins-today'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè.'),
  })

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <LogIn size={24} color="#27ae60" />
        <h1 style={{ margin: 0, fontSize: 20, color: '#fff' }}>Check-in Rapid</h1>
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          autoFocus
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Chèche manm pa non oswa telefòn..."
          style={{ width: '100%', padding: '16px 16px 16px 46px', borderRadius: 14, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 16, boxSizing: 'border-box' }}
        />
      </div>

      {search.length >= 2 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!membersData?.members?.length ? (
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 16 }}>Pa gen manm jwenn.</p>
          ) : membersData.members.map(m => (
            <button key={m.id} onClick={() => checkInMutation.mutate(m.id)} disabled={checkInMutation.isPending}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(39,174,96,0.3)',
                background: 'rgba(39,174,96,0.08)', color: '#fff', cursor: 'pointer', textAlign: 'left',
              }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{m.fullName}</p>
                <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>{m.phone || '—'}</p>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#27ae60', fontWeight: 700, fontSize: 13 }}>
                <LogIn size={15} /> Antre
              </span>
            </button>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        Antre Jodi a
      </h2>
      {loadingCheckIns ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ap chaje...</p>
      ) : !recentCheckIns?.length ? (
        <div style={{ textAlign: 'center', padding: 30, background: 'rgba(255,255,255,0.03)', borderRadius: 12, color: '#64748b' }}>
          Pa gen antre jodi a.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentCheckIns.map(c => (
            <div key={c.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color={c.checkOutAt ? '#64748b' : '#27ae60'} />
                <div>
                  <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{c.member?.fullName}</p>
                  <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 11 }}>
                    {new Date(c.checkInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {c.checkOutAt && ` → ${new Date(c.checkOutAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
              {!c.checkOutAt && (
                <button onClick={() => checkOutMutation.mutate(c.id)} disabled={checkOutMutation.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  <LogOut size={12} /> Soti
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
