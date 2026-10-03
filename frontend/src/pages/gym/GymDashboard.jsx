// src/pages/gym/GymDashboard.jsx
// ✅ NOUVO — Modil Jim/Gym: Dashboard prensipal
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, UserCheck, CalendarCheck, Wallet, Dumbbell, LogIn, CreditCard, BookOpen } from 'lucide-react'
import { gymAPI } from '../../services/api'

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}20`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>{value}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      </div>
    </div>
  )
}

function QuickLink({ to, icon, label }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 12,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14,
    }}>
      {icon} {label}
    </Link>
  )
}

export default function GymDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['gym-stats'],
    queryFn: () => gymAPI.getStats().then(r => r.data.stats),
  })

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Dumbbell size={28} color="#C9A84C" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>Jim (Gym)</h1>
      </div>

      {isLoading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Ap chaje...</p>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          <StatCard icon={<Users size={20} color="#6baed6" />} label="Total Manm" value={data?.totalMembers ?? 0} color="#6baed6" />
          <StatCard icon={<UserCheck size={20} color="#27ae60" />} label="Manm Aktif" value={data?.activeMembers ?? 0} color="#27ae60" />
          <StatCard icon={<CalendarCheck size={20} color="#C9A84C" />} label="Abònman Aktif" value={data?.activeMemberships ?? 0} color="#C9A84C" />
          <StatCard icon={<LogIn size={20} color="#a78bfa" />} label="Antre Jodi a" value={data?.checkInsToday ?? 0} color="#a78bfa" />
          <StatCard icon={<Wallet size={20} color="#f59e0b" />} label="Revni Mwa sa a (HTG)" value={Number(data?.revenueThisMonth ?? 0).toLocaleString('fr-FR')} color="#f59e0b" />
        </div>
      )}

      <h2 style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Aksyon Rapid
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
      }}>
        <QuickLink to="/app/gym/check-in" icon={<LogIn size={18} color="#27ae60" />} label="Check-in Rapid" />
        <QuickLink to="/app/gym/members" icon={<Users size={18} color="#6baed6" />} label="Jere Manm" />
        <QuickLink to="/app/gym/plans" icon={<CreditCard size={18} color="#C9A84C" />} label="Plan Abònman" />
        <QuickLink to="/app/gym/classes" icon={<BookOpen size={18} color="#a78bfa" />} label="Klas & Antrenè" />
      </div>
    </div>
  )
}
