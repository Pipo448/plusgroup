// src/components/common/LoadingScreen.jsx
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Ekran Chajman ak Animasyon "+"
// ══════════════════════════════════════════════════════════════
// Sèvi ak sa a nan:
//  - Suspense fallback ki antoure <Router>/<Routes> pou lazy-loaded paj yo
//  - Verifikasyon sesyon inisyal la (pandan app la ap tcheke si moun nan konekte)
//  - Nenpòt lòt "gwo" chajman plenn paj (pa pou ti bouton — gade PlusSpinner pou sa)
//
// Egzanp:
//   <Suspense fallback={<LoadingScreen />}>
//     <Routes>...</Routes>
//   </Suspense>
const LOGO_URL = '/assets/logo.webp'

const NAVY = '#0F172A'
const ORANGE = '#F5680C'
const GOLD = '#E4A730'

// Pozisyon 8 ti siy "+" yo an sèk otou logo a (an degre, 0° = anlè)
const TICK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export default function LoadingScreen({ label = 'Ap chaje...' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#FFFFFF', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22,
    }}>
      <style>{`
        @keyframes pgLoaderBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes pgLoaderGlow {
          0%, 100% { opacity: 0.35; transform: scale(0.92); }
          50% { opacity: 0.65; transform: scale(1.08); }
        }
        @keyframes pgTickPulse {
          0%, 100% { opacity: 0.18; transform: scale(0.75); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes pgFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pgDotBlink {
          0%, 80%, 100% { opacity: 0.25; }
          40% { opacity: 1; }
        }
      `}</style>

      {/* Sèk siy "+" k ap animen otou logo a */}
      <div style={{ position: 'relative', width: 116, height: 116, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Glow dousman dèyè logo a */}
        <div style={{
          position: 'absolute', width: 90, height: 90, borderRadius: '50%',
          background: `radial-gradient(circle, ${ORANGE}22 0%, transparent 70%)`,
          animation: 'pgLoaderGlow 2.2s ease-in-out infinite',
        }} />

        {TICK_ANGLES.map((deg, i) => (
          <div
            key={deg}
            style={{
              position: 'absolute', width: 116, height: 116,
              transform: `rotate(${deg}deg)`,
              display: 'flex', justifyContent: 'center',
            }}
          >
            <PlusTick delay={i * 0.13} />
          </div>
        ))}

        {/* Logo santral la, respire dousman */}
        <img
          src={LOGO_URL} alt="Plus Group"
          style={{ width: 44, height: 44, objectFit: 'contain', position: 'relative', zIndex: 1, animation: 'pgLoaderBreathe 1.8s ease-in-out infinite' }}
        />
      </div>

      <div style={{ textAlign: 'center', animation: 'pgFadeUp 0.5s ease 0.15s both' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: '0.02em' }}>
          PLUS <span style={{ color: ORANGE }}>GROUP</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: '#7B8394', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span>{label}</span>
          <span style={{ display: 'inline-flex', gap: 2 }}>
            <Dot delay={0} /><Dot delay={0.2} /><Dot delay={0.4} />
          </span>
        </div>
      </div>
    </div>
  )
}

// Yon ti siy "+" (2 ba kwaze) ki klere/etenn nan sèk la, youn apre lòt
function PlusTick({ delay }) {
  return (
    <div style={{
      marginTop: 2, width: 9, height: 9, position: 'relative',
      animation: `pgTickPulse 1.3s ease-in-out ${delay}s infinite`,
    }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ORANGE}, ${GOLD})`, borderRadius: 2, transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, ${ORANGE}, ${GOLD})`, borderRadius: 2, transform: 'translateX(-50%)' }} />
    </div>
  )
}

function Dot({ delay }) {
  return <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7B8394', display: 'inline-block', animation: `pgDotBlink 1.3s ease-in-out ${delay}s infinite` }} />
}
