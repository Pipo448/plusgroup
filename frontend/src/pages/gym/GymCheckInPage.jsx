// src/pages/gym/GymCheckInPage.jsx
// ✅ GYM FITNESS — Check-in rapid (tèm klè, animasyon, responsive)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, LogIn, LogOut, CheckCircle2 } from 'lucide-react'
import { gymAPI } from '../../services/api'

const G = {
  teal:'#14B8A6', ink:'#1a0533', muted:'#64748b',
  border:'rgba(0,0,0,0.08)', card:'#ffffff',
  shadow:'0 2px 14px rgba(20,20,43,0.06)', green:'#22c55e', bgSoft:'#f8fafc',
}

export default function GymCheckInPage() {
  const { t } = useTranslation()
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
      if (hasActiveMembership) toast.success(t('gym.checkIn.checkInConfirmed'))
      else toast(warning || t('gym.checkIn.checkInNoMembership'), { icon: '⚠️' })
      setSearch('')
      qc.invalidateQueries(['gym-checkins-today'])
    },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.checkIn.error')),
  })

  const checkOutMutation = useMutation({
    mutationFn: (checkInId) => gymAPI.checkOut(checkInId),
    onSuccess: () => { toast.success(t('gym.checkIn.checkOutConfirmed')); qc.invalidateQueries(['gym-checkins-today']) },
    onError: (e) => toast.error(e.response?.data?.message || t('gym.checkIn.error')),
  })

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div className="gym-fadeup" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${G.green},#16a34a)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 16px rgba(34,197,94,0.3)' }}>
          <LogIn size={22} color="#fff" />
        </div>
        <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:G.ink }}>{t('gym.checkIn.title')}</h1>
      </div>

      <div className="gym-fadeup" style={{ position:'relative', marginBottom:14, animationDelay:'60ms' }}>
        <Search size={18} color={G.muted} style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)' }} />
        <input
          autoFocus
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('gym.checkIn.searchPlaceholder')}
          style={{ width:'100%', padding:'16px 16px 16px 46px', borderRadius:16, border:`1px solid ${G.border}`, background:G.card, color:G.ink, fontSize:16, boxSizing:'border-box', boxShadow:G.shadow }}
        />
      </div>

      {search.length >= 2 && (
        <div className="gym-fadeup" style={{ marginBottom:24, display:'flex', flexDirection:'column', gap:8 }}>
          {!membersData?.members?.length ? (
            <p style={{ color:G.muted, fontSize:13, textAlign:'center', padding:16 }}>{t('gym.checkIn.noMembers')}</p>
          ) : membersData.members.map(m => (
            <button key={m.id} onClick={() => checkInMutation.mutate(m.id)} disabled={checkInMutation.isPending}
              className="gym-row"
              style={{
                display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%',
                padding:'14px 18px', borderRadius:14, border:`1px solid rgba(34,197,94,0.25)`,
                background:'rgba(34,197,94,0.06)', color:G.ink, cursor:'pointer', textAlign:'left',
              }}>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{m.fullName}</p>
                <p style={{ margin:'3px 0 0', color:G.muted, fontSize:12 }}>{m.phone || '—'}</p>
              </div>
              <span style={{ display:'flex', alignItems:'center', gap:6, color:'#16a34a', fontWeight:800, fontSize:13 }}>
                <LogIn size={15} /> {t('gym.checkIn.checkInAction')}
              </span>
            </button>
          ))}
        </div>
      )}

      <h2 style={{ fontSize:12, color:G.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, fontWeight:800 }}>
        {t('gym.checkIn.todayCheckIns')}
      </h2>
      {loadingCheckIns ? (
        <p style={{ color:G.muted }}>{t('gym.checkIn.loading')}</p>
      ) : !recentCheckIns?.length ? (
        <div className="gym-fadeup" style={{ textAlign:'center', padding:30, background:G.card, border:`1px dashed ${G.border}`, borderRadius:14, color:G.muted }}>
          {t('gym.checkIn.noneToday')}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {recentCheckIns.map((c, i) => (
            <div key={c.id} className="gym-fadeup" style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'12px 16px', borderRadius:12, background:G.card, border:`1px solid ${G.border}`,
              boxShadow:G.shadow, animationDelay:`${Math.min(i, 8) * 40}ms`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <CheckCircle2 size={16} color={c.checkOutAt ? G.muted : '#16a34a'} />
                <div>
                  <p style={{ margin:0, color:G.ink, fontSize:13, fontWeight:700 }}>{c.member?.fullName}</p>
                  <p style={{ margin:'2px 0 0', color:G.muted, fontSize:11 }}>
                    {new Date(c.checkInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {c.checkOutAt && ` → ${new Date(c.checkOutAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
              {!c.checkOutAt && (
                <button onClick={() => checkOutMutation.mutate(c.id)} disabled={checkOutMutation.isPending}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:9, border:`1px solid ${G.border}`, background:G.bgSoft, color:G.muted, cursor:'pointer', fontSize:11, fontWeight:700 }}>
                  <LogOut size={12} /> {t('gym.checkIn.checkOut')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes gymFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .gym-fadeup { opacity:0; animation: gymFadeUp 0.4s ease forwards; }
        .gym-row { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .gym-row:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(20,20,43,0.08); }
      `}</style>
    </div>
  )
}