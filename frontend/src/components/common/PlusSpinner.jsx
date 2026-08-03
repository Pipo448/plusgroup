// src/components/common/PlusSpinner.jsx
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Ti Spinner "+" (pou bouton, chan, ti chajman anndan)
// ══════════════════════════════════════════════════════════════
// Egzanp:
//   <button disabled={saving}>
//     {saving ? <PlusSpinner size={14} /> : 'Sove'}
//   </button>
//
// Pa itilize sa a pou chajman plenn paj — gade LoadingScreen.jsx pou sa.

export default function PlusSpinner({ size = 16, color = 'currentColor' }) {
  return (
    <span style={{ display: 'inline-flex', width: size, height: size, position: 'relative' }}>
      <style>{`
        @keyframes pgSpinnerRotate { to { transform: rotate(360deg); } }
        @keyframes pgSpinnerBreathe { 0%, 100% { transform: scale(0.85); opacity: 0.6; } 50% { transform: scale(1); opacity: 1; } }
      `}</style>
      <span style={{
        position: 'absolute', inset: 0,
        animation: 'pgSpinnerRotate 0.9s linear infinite, pgSpinnerBreathe 0.9s ease-in-out infinite',
      }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v7M12 14v7M3 12h7M14 12h7" stroke={color} strokeWidth={3} strokeLinecap="round" />
        </svg>
      </span>
    </span>
  )
}
