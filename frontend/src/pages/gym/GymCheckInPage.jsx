// src/pages/gym/GymCheckInPage.jsx
// ✅ GYM FITNESS — Check-in rapid (stil Plus Fit: hero fonse, rechèch gwo, tan reyèl, animasyon)
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, LogIn, LogOut, Users, Activity, Clock, UserX } from 'lucide-react'
import { gymAPI } from '../../services/api'
import {
  C, GymStyles, PageHero, Avatar, EmptyState, SkeletonRows, SectionHead, fmtTime,
} from './gymUI'

const durationLabel = (from, to) => {
  const mins = Math.max(0, Math.round((new Date(to || Date.now()) - new Date(from)) / 60000))
  const h = Math.floor(mins / 60)
  return h ? `${h}h${String(mins % 60).padStart(2, '0')}` : `${mins} min`
}

export default function GymCheckInPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: membersData, isFetching: searching } = useQuery({
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

  const list = recentCheckIns || []
  const inside = list.filter(c => !c.checkOutAt).length
  const left = list.length - inside
  const results = membersData?.members || []

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && results.length === 1 && !checkInMutation.isPending) checkInMutation.mutate(results[0].id)
    if (e.key === 'Escape') setSearch('')
  }

  return (
    <div className="gx-page narrow">
      <GymStyles/>

      <PageHero
        icon={LogIn}
        eyebrow={t('gym.checkIn.live', 'En direct')}
        title={t('gym.checkIn.title')}
        subtitle={t('gym.checkIn.subtitle', 'Recherchez un membre et validez son entrée en un clic')}
        stats={[
          { label: t('gym.checkIn.todayCheckIns'), value: list.length, icon: Activity, tone: 'volt', loading: loadingCheckIns },
          { label: t('gym.checkIn.insideNow', 'Dans la salle'), value: inside, icon: Users, tone: 'ember', loading: loadingCheckIns },
          { label: t('gym.checkIn.leftToday', 'Sortis'), value: left, icon: LogOut, loading: loadingCheckIns },
        ]}
      />

      <div className="gx-search big gx-in" style={{ animationDelay:'120ms' }}>
        <Search size={20} className="lead"/>
        <input
          autoFocus
          value={search} onChange={e => setSearch(e.target.value)} onKeyDown={onKeyDown}
          placeholder={t('gym.checkIn.searchPlaceholder')}
        />
        {search.length >= 2 && results.length === 1 && <span className="gx-kbd gx-hide-sm">↵ Enter</span>}
      </div>

      {search.length >= 2 && (
        <div className="gx-stack" style={{ marginTop:12 }}>
          {searching && !results.length ? (
            <SkeletonRows rows={2} height={70}/>
          ) : !results.length ? (
            <EmptyState icon={UserX} text={t('gym.checkIn.noMembers')}/>
          ) : results.map((m, i) => (
            <button key={m.id} onClick={() => checkInMutation.mutate(m.id)} disabled={checkInMutation.isPending}
              className="gx-row clickable gx-slide" style={{ animationDelay:`${i * 50}ms` }}>
              <Avatar name={m.fullName} size={44}/>
              <div className="grow">
                <p className="gx-row-title">{m.fullName}</p>
                <p className="gx-row-meta">{m.phone || '—'}</p>
              </div>
              <span className="gx-btn gx-btn-dark gx-btn-sm" style={{ pointerEvents:'none' }}>
                <LogIn size={14}/> {t('gym.checkIn.checkInAction')}
              </span>
            </button>
          ))}
        </div>
      )}

      <SectionHead title={t('gym.checkIn.todayCheckIns')} count={loadingCheckIns ? null : list.length}/>

      {loadingCheckIns ? (
        <SkeletonRows rows={4}/>
      ) : !list.length ? (
        <EmptyState icon={Clock} text={t('gym.checkIn.noneToday')}/>
      ) : (
        <div className="gx-stack">
          {list.map((c, i) => {
            const isIn = !c.checkOutAt
            return (
              <div key={c.id} className="gx-row gx-in" style={{ animationDelay:`${Math.min(i, 10) * 45}ms` }}>
                <div style={{ width:58, flex:'none' }}>
                  <p className="gx-display" style={{ margin:0, fontSize:22 }}>{fmtTime(c.checkInAt)}</p>
                  {c.checkOutAt && <p style={{ margin:'2px 0 0', fontSize:11.5, color:C.muted, fontWeight:700 }}>→ {fmtTime(c.checkOutAt)}</p>}
                </div>
                <Avatar name={c.member?.fullName} size={38}/>
                <div className="grow">
                  <p className="gx-row-title">{c.member?.fullName}</p>
                  <p className="gx-row-meta"><Clock size={12}/> {durationLabel(c.checkInAt, c.checkOutAt)}</p>
                </div>
                {isIn ? (
                  <>
                    <span className="gx-chip gx-hide-sm" style={{ '--c': C.green }}><span className="dot"/>{t('gym.checkIn.inside', 'Présent')}</span>
                    <button onClick={() => checkOutMutation.mutate(c.id)} disabled={checkOutMutation.isPending}
                      className="gx-btn gx-btn-soft gx-btn-sm">
                      <LogOut size={13}/> {t('gym.checkIn.checkOut')}
                    </button>
                  </>
                ) : (
                  <span className="gx-chip" style={{ '--c': C.muted }}>{t('gym.checkIn.left', 'Sorti')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}