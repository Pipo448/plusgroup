// src/pages/WelcomePage.jsx
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const SYSTEMS = [
  {
    id: 'pos',
    title: 'Sistèm Jesyon Stòk & Kanè',
    subtitle: 'POS · Faktire · Depo · Rapò',
    desc: 'Kontwole stòk ou, fè fakti, jere kliyan ak anplwaye nan yon sèl kote.',
    route: '/login',
    available: true,
    accent: '#FF6B00',
    glow: 'rgba(255,107,0,0.5)',
    icon: '🏪',
    bgImage: '/flyers_jestion_stock.jpg',
    tags: ['Boutik', 'Restoran', 'Pharmacy', 'Sipèmache'],
    badge: 'DISPONIB',
    badgeColor: '#27ae60',
    particles: ['📦','💳','🧾','📊','💰'],
  },
  {
    id: 'dry',
    title: 'Sistèm Pressing & Dry',
    subtitle: 'Kliyan · Lòd · Livrezon · Peman',
    desc: 'Jere tout lòd pressing ou, swiv peman ak livrezon an tan reyèl.',
    route: '/login',
    available: false,
    accent: '#1B3A6B',
    glow: 'rgba(27,58,107,0.5)',
    icon: '👔',
    tags: ['Pressing', 'Teinturerie', 'Lavomatik'],
    badge: 'BYENTO',
    badgeColor: '#C9A84C',
    particles: ['👗','🧺','✨','🔵','💧'],
  },
  {
    id: 'hospital',
    title: 'Sistèm Jesyon Lopital',
    subtitle: 'Pasyan · Randevou · Dosye · Farmasi',
    desc: 'Dosye medikal, randevou doktè, faktire sèvis ak jesyon farmasi.',
    route: '/login',
    available: false,
    accent: '#C0392B',
    glow: 'rgba(192,57,43,0.4)',
    icon: '🏥',
    tags: ['Klinik', 'Lopital', 'Kabinè'],
    badge: 'BYENTO',
    badgeColor: '#C9A84C',
    particles: ['💊','🩺','❤️','🔬','🩻'],
  },
]

function FloatingParticle({ emoji, delay, duration, x }) {
  return (
    <span style={{
      position: 'absolute', fontSize: 18, opacity: 0,
      left: `${x}%`, bottom: '-20px',
      animation: `floatUp ${duration}s ease-in ${delay}s infinite`,
      pointerEvents: 'none', userSelect: 'none', zIndex: 2,
    }}>{emoji}</span>
  )
}

function SystemCard({ sys, idx }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  const handleClick = () => {
    if (!sys.available) return
    setClicked(true)
    setTimeout(() => navigate(sys.route), 400)
  }

  const particles = sys.particles.map((e, i) => ({
    emoji: e, delay: i * 0.7, duration: 3 + i * 0.4, x: 10 + i * 18
  }))

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 24, padding: '32px 28px 28px',
        cursor: sys.available ? 'pointer' : 'default',
        border: `1px solid ${hovered && sys.available ? sys.accent : 'rgba(255,255,255,0.08)'}`,
        // Background image si disponib
        ...(sys.bgImage ? {
          backgroundImage: `url(${sys.bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        } : {
          background: hovered && sys.available
            ? `linear-gradient(145deg, ${sys.accent}18, rgba(0,0,0,0.6))`
            : 'rgba(255,255,255,0.04)',
        }),
        backdropFilter: 'blur(0px)',
        transform: clicked ? 'scale(0.97)' : hovered && sys.available ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: hovered && sys.available
          ? `0 24px 60px ${sys.glow}, 0 0 0 2px ${sys.accent}80`
          : '0 4px 20px rgba(0,0,0,0.3)',
        animation: `cardIn 0.6s ease ${idx * 0.15}s both`,
        minHeight: 340,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Overlay gradient pou lisib tèks sou imaj */}
      {sys.bgImage && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, borderRadius: 24,
          background: hovered
            ? `linear-gradient(160deg, rgba(0,0,0,0.82) 0%, rgba(255,107,0,0.45) 60%, rgba(0,0,0,0.75) 100%)`
            : `linear-gradient(160deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.80) 100%)`,
          transition: 'background 0.4s ease',
        }}/>
      )}
      {/* Glow top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 2,
        background: `linear-gradient(90deg, transparent, ${sys.accent}, transparent)`,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }}/>

      {/* Shimmer sweep on hover */}
      {hovered && sys.available && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: `linear-gradient(105deg, transparent 30%, ${sys.accent}20 50%, transparent 70%)`,
          animation: 'shimmer 1.5s linear infinite',
        }}/>
      )}

      {/* Floating particles on hover */}
      {hovered && sys.available && particles.map((p, i) => (
        <FloatingParticle key={i} {...p}/>
      ))}

      {/* Badge */}
      <div style={{
        position: 'absolute', top: 16, right: 16, zIndex: 3,
        background: `${sys.badgeColor}22`,
        border: `1px solid ${sys.badgeColor}55`,
        color: sys.badgeColor,
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        padding: '3px 10px', borderRadius: 99,
      }}>{sys.badge}</div>

      {/* Icon */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 70, height: 70, borderRadius: 20,
        background: `linear-gradient(135deg, ${sys.accent}40, ${sys.accent}15)`,
        border: `1px solid ${sys.accent}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, marginBottom: 20,
        boxShadow: hovered ? `0 8px 24px ${sys.glow}` : 'none',
        transition: 'box-shadow 0.3s',
        animation: hovered && sys.available ? 'iconPulse 1s ease infinite' : 'none',
      }}>{sys.icon}</div>

      {/* Content */}
      <h3 style={{
        position: 'relative', zIndex: 1,
        color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 6px',
        fontFamily: "'Playfair Display', serif",
        lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      }}>{sys.title}</h3>

      <p style={{
        position: 'relative', zIndex: 1,
        color: sys.accent, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.08em', margin: '0 0 14px', textTransform: 'uppercase',
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      }}>{sys.subtitle}</p>

      <p style={{
        position: 'relative', zIndex: 1,
        color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.6,
        margin: '0 0 20px', flex: 1,
        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
      }}>{sys.desc}</p>

      {/* Tags */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {sys.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 99,
            background: `rgba(0,0,0,0.5)`,
            border: `1px solid ${sys.accent}50`,
            color: 'rgba(255,255,255,0.8)', fontWeight: 600,
            backdropFilter: 'blur(4px)',
          }}>{tag}</span>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 12,
        background: sys.available
          ? hovered ? sys.accent : `rgba(0,0,0,0.6)`
          : 'rgba(0,0,0,0.4)',
        border: `1px solid ${sys.available ? sys.accent + '80' : 'rgba(255,255,255,0.1)'}`,
        color: sys.available ? '#fff' : 'rgba(255,255,255,0.4)',
        fontWeight: 700, fontSize: 13,
        transition: 'all 0.3s',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        boxShadow: hovered && sys.available ? `0 4px 20px ${sys.glow}` : 'none',
      }}>
        {sys.available
          ? <><span style={{ fontSize: 15 }}>→</span> Konekte Kounye a</>
          : <><span style={{ fontSize: 13 }}>🔒</span> Byento Disponib</>
        }
      </div>
    </div>
  )
}

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#070a0f',
      fontFamily: 'DM Sans, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px 60px',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Animated background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,107,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}/>

      {/* Background orbs */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', top:'-10%', left:'-10%', background:'radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)', animation:'orbFloat 8s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', bottom:'-5%', right:'-5%', background:'radial-gradient(circle, rgba(27,58,107,0.12) 0%, transparent 70%)', animation:'orbFloat 10s ease-in-out 2s infinite reverse' }}/>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', top:'40%', left:'50%', background:'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', animation:'orbFloat 7s ease-in-out 1s infinite' }}/>
      </div>

      {/* Logo / Header */}
      <div style={{
        position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 52,
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(-20px)',
        transition: 'all 0.8s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:16 }}>
          <div style={{
            width:54, height:54, borderRadius:14,
            background:'linear-gradient(135deg, #FF6B00, #C9A84C)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, boxShadow:'0 8px 24px rgba(255,107,0,0.4)',
            animation:'logoPulse 3s ease-in-out infinite',
          }}>➕</div>
          <div style={{ textAlign:'left' }}>
            <p style={{ color:'#fff', fontSize:22, fontWeight:900, margin:0, letterSpacing:'0.05em', fontFamily:"'Playfair Display',serif" }}>PLUS GROUP</p>
            <p style={{ color:'#FF6B00', fontSize:10, fontWeight:700, margin:0, letterSpacing:'0.2em' }}>✦ INNOV@TION & TECH ✦</p>
          </div>
        </div>

        <h1 style={{
          color:'#fff', fontSize:'clamp(26px,4vw,42px)', fontWeight:900, margin:'0 0 10px',
          fontFamily:"'Playfair Display',serif",
          background:'linear-gradient(135deg, #fff 30%, #FF6B00 70%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>Chwazi Sistèm Ou A</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:15, margin:0 }}>
          Solisyon dijital pou tout kalite biznis ann Ayiti
        </p>
      </div>

      {/* Cards grid */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20, width: '100%', maxWidth: 980,
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.2s ease',
      }}>
        {SYSTEMS.map((sys, idx) => (
          <SystemCard key={sys.id} sys={sys} idx={idx}/>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        position:'relative', zIndex:1, marginTop:48,
        color:'rgba(255,255,255,0.18)', fontSize:11, letterSpacing:'0.08em',
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.8s ease',
      }}>
        📍 Ouanaminthe, Haïti · +509 4244 9024 · 3133 8785 · 4131 4961
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;600;700;800&display=swap');

        @keyframes cardIn {
          from { opacity:0; transform:translateY(30px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes floatUp {
          0%   { opacity:0; transform:translateY(0) scale(0.8); }
          15%  { opacity:0.8; }
          85%  { opacity:0.6; }
          100% { opacity:0; transform:translateY(-120px) scale(1.1); }
        }
        @keyframes shimmer {
          0%   { transform:translateX(-100%); }
          100% { transform:translateX(200%); }
        }
        @keyframes iconPulse {
          0%,100% { transform:scale(1); }
          50%      { transform:scale(1.08); }
        }
        @keyframes orbFloat {
          0%,100% { transform:translate(0,0); }
          50%     { transform:translate(30px,20px); }
        }
        @keyframes logoPulse {
          0%,100% { box-shadow:0 8px 24px rgba(255,107,0,0.4); }
          50%     { box-shadow:0 8px 40px rgba(255,107,0,0.7); }
        }
        * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#070a0f; }
        ::-webkit-scrollbar-thumb { background:#FF6B0040; border-radius:3px; }
      `}</style>
    </div>
  )
}
