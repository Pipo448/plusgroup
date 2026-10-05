// src/pages/gym/GymDashboard.jsx
// ✅ GYM FITNESS — Tablo bò, tèm klè pwofesyonèl + animasyon + responsive
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Dumbbell, Users, UserCheck, CreditCard, LogIn as LogInIcon,
  BookOpen, Wallet, ArrowUpRight,
} from 'lucide-react'
import { gymAPI } from '../../services/api'

const G = {
  teal:   '#14B8A6',
  tealLt: '#5EEAD4',
  ink:    '#1a0533',
  muted:  '#64748b',
  border: 'rgba(0,0,0,0.07)',
  card:   '#ffffff',
  shadow: '0 2px 14px rgba(20,20,43,0.06)',
}

const STATS = [
  { key:'totalMembers',      label:'Total Manm',    icon:Users,      color:'#14B8A6', bg:'rgba(20,184,166,0.12)' },
  { key:'activeMembers',     label:'Manm Aktif',    icon:UserCheck,  color:'#16a34a', bg:'rgba(34,197,94,0.12)'  },
  { key:'activeMemberships', label:'Abònman Aktif', icon:CreditCard, color:'#d97706', bg:'rgba(245,158,11,0.12)' },
  { key:'checkInsToday',     label:'Antre Jodi a',  icon:LogInIcon,  color:'#6366f1', bg:'rgba(99,102,241,0.12)' },
]

const QUICK_LINKS = [
  { to:'/app/gym/check-in', icon:LogInIcon,  label:'Check-in Rapid', color:'#6366f1' },
  { to:'/app/gym/members',  icon:Users,      label:'Jere Manm',      color:'#14B8A6' },
  { to:'/app/gym/plans',    icon:CreditCard, label:'Plan Abònman',   color:'#d97706' },
  { to:'/app/gym/classes',  icon:BookOpen,   label:'Klas & Antrenè', color:'#8b5cf6' },
]

function StatCard({ icon:Icon, label, value, color, bg, loading, delay }) {
  return (
    <div className="gym-fadeup" style={{
      background:G.card, border:`1px solid ${G.border}`, borderRadius:16,
      padding:'18px 20px', boxShadow:G.shadow, animationDelay:`${delay}ms`,
      display:'flex', alignItems:'center', gap:14, minWidth:0,
    }}>
      <div style={{ width:46, height:46, borderRadius:13, flexShrink:0, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={22} style={{ color }}/>
      </div>
      <div style={{ minWidth:0 }}>
        {loading
          ? <div className="gym-pulse" style={{ width:48, height:22, borderRadius:6, background:'rgba(0,0,0,0.08)' }}/>
          : <p style={{ margin:0, fontSize:24, fontWeight:800, color:G.ink, lineHeight:1.1 }}>{value}</p>
        }
        <p style={{ margin:'4px 0 0', fontSize:12, color:G.muted, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</p>
      </div>
    </div>
  )
}

function QuickLink({ to, icon:Icon, label, color, delay }) {
  return (
    <Link to={to} className="gym-fadeup gym-quicklink" style={{
      textDecoration:'none', background:G.card, border:`1px solid ${G.border}`,
      borderRadius:16, padding:'18px 16px', boxShadow:G.shadow,
      display:'flex', flexDirection:'column', gap:10, animationDelay:`${delay}ms`,
    }}>
      <div style={{ width:40, height:40, borderRadius:11, background:`${color}1F`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={19} style={{ color }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:13, fontWeight:700, color:G.ink }}>{label}</span>
        <ArrowUpRight size={15} style={{ color:G.muted }}/>
      </div>
    </Link>
  )
}

export default function GymDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['gym-stats'],
    // ✅ KORIJE — backend voye { success:true, stats:{...} }, pa stats yo dirèkteman.
    // Avan sa, "data" se te tout anvlòp la ({success,stats}) — kidonk data.totalMembers,
    // data.revenueThisMonth elt. te toujou "undefined" e kat yo te toujou afiche 0 / "—"
    // menm lè gen manm/peman ki egziste reyèlman nan baz done a.
    queryFn: () => gymAPI.getStats().then(r => r.data.stats),
  })

  const revenueMonth = data?.revenueThisMonth != null
    ? Number(data.revenueThisMonth).toLocaleString('fr-FR') + ' HTG'
    : '—'
  const revenueToday = data?.revenueToday != null
    ? Number(data.revenueToday).toLocaleString('fr-FR') + ' HTG'
    : '—'

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <div className="gym-fadeup" style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22, flexWrap:'wrap' }}>
        <div style={{ width:52, height:52, borderRadius:16, background:`linear-gradient(135deg,${G.teal},${G.tealLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 18px rgba(20,184,166,0.35)', flexShrink:0 }}>
          <Dumbbell size={26} color="#fff"/>
        </div>
        <div>
          <h1 style={{ margin:0, fontSize:21, fontWeight:800, color:G.ink }}>GYM FITNESS</h1>
          <p style={{ margin:'2px 0 0', fontSize:12.5, color:G.muted, fontWeight:500 }}>Tablo bò jeneral modil jim nan</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:14, marginBottom:28 }}>
        {STATS.map((s, i) => (
          <StatCard key={s.key} icon={s.icon} label={s.label} color={s.color} bg={s.bg}
            value={data?.[s.key] ?? 0} loading={isLoading} delay={i * 60}/>
        ))}
        <div className="gym-fadeup" style={{
          background:`linear-gradient(135deg,#6366f1,#4338ca)`, borderRadius:16, padding:'18px 20px',
          boxShadow:'0 8px 22px rgba(99,102,241,0.3)', display:'flex', alignItems:'center', gap:14,
          animationDelay:`${STATS.length * 60}ms`,
        }}>
          <div style={{ width:46, height:46, borderRadius:13, flexShrink:0, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Wallet size={22} color="#fff"/>
          </div>
          <div style={{ minWidth:0 }}>
            {isLoading
              ? <div className="gym-pulse" style={{ width:70, height:22, borderRadius:6, background:'rgba(255,255,255,0.3)' }}/>
              : <p style={{ margin:0, fontSize:20, fontWeight:800, color:'#fff', lineHeight:1.1, whiteSpace:'nowrap' }}>{revenueToday}</p>
            }
            <p style={{ margin:'4px 0 0', fontSize:12, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>Revni Jodi a</p>
          </div>
        </div>

        <div className="gym-fadeup" style={{
          background:`linear-gradient(135deg,${G.teal},#0d9488)`, borderRadius:16, padding:'18px 20px',
          boxShadow:'0 8px 22px rgba(20,184,166,0.3)', display:'flex', alignItems:'center', gap:14,
          animationDelay:`${(STATS.length + 1) * 60}ms`,
        }}>
          <div style={{ width:46, height:46, borderRadius:13, flexShrink:0, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Wallet size={22} color="#fff"/>
          </div>
          <div style={{ minWidth:0 }}>
            {isLoading
              ? <div className="gym-pulse" style={{ width:70, height:22, borderRadius:6, background:'rgba(255,255,255,0.3)' }}/>
              : <p style={{ margin:0, fontSize:20, fontWeight:800, color:'#fff', lineHeight:1.1, whiteSpace:'nowrap' }}>{revenueMonth}</p>
            }
            <p style={{ margin:'4px 0 0', fontSize:12, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>Revni Mwa sa a</p>
          </div>
        </div>
      </div>

      <p className="gym-fadeup" style={{ fontSize:11, color:G.muted, textTransform:'uppercase', letterSpacing:'0.09em', fontWeight:800, margin:'0 0 12px', animationDelay:`${(STATS.length + 2) * 60}ms` }}>
        Aksyon Rapid
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14 }}>
        {QUICK_LINKS.map((q, i) => (
          <QuickLink key={q.to} {...q} delay={(STATS.length + 3 + i) * 60}/>
        ))}
      </div>

      <style>{`
        @keyframes gymFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gymPulse { 0%,100% { opacity:0.4 } 50% { opacity:0.9 } }
        .gym-fadeup { opacity:0; animation: gymFadeUp 0.45s ease forwards; }
        .gym-pulse { animation: gymPulse 1.1s ease-in-out infinite; }
        .gym-quicklink { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .gym-quicklink:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(20,20,43,0.1); }
        @media (max-width: 480px) {
          .gym-quicklink { padding:14px !important; }
        }
      `}</style>
    </div>
  )
}