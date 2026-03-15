// src/components/SolPushBanner.jsx
// ✅ Bannè pou aktive push notifications nan pòtal Sol la
// Ajoute nan paj prensipal Sol la: <SolPushBanner token={token} />

import { useSolPush } from '../hooks/useSolPush'

export default function SolPushBanner({ token }) {
  const {
    pushSupported, permission, pushEnabled,
    pushLoading, enablePush, disablePush,
  } = useSolPush(token)

  // Pa montre si pa sipòte oswa si pèmisyon bloke
  if (!pushSupported || permission === 'unsupported') return null

  if (permission === 'denied') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 10, margin: '0 0 12px',
        background: 'rgba(234,88,12,0.08)',
        border: '1px solid rgba(234,88,12,0.25)',
        fontSize: 12, color: '#ea580c',
      }}>
        <span>⚠️</span>
        <span>Notifikasyon bloke. Chanje paramèt navigatè ou a pou aktive yo.</span>
      </div>
    )
  }

  if (pushEnabled) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 10, margin: '0 0 12px',
        background: 'rgba(22,163,74,0.08)',
        border: '1px solid rgba(22,163,74,0.25)',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔔</span>
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            Notifikasyon aktive — ou ap resevwa avètisman peman
          </span>
        </div>
        <button onClick={disablePush} style={{
          padding: '4px 10px', borderRadius: 6, border: 'none',
          background: '#fee2e2', color: '#dc2626',
          fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>
          Dezaktive
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', borderRadius: 10, margin: '0 0 12px',
      background: 'rgba(27,42,143,0.06)',
      border: '1px solid rgba(27,42,143,0.2)',
      gap: 8, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🔔</span>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1B2A8F' }}>
            Aktive avètisman peman
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
            Resevwa yon notifikasyon sou telefon ou a lè se dat peman ou a
          </p>
        </div>
      </div>
      <button
        onClick={enablePush}
        disabled={pushLoading}
        style={{
          padding: '9px 16px', borderRadius: 8, border: 'none',
          background: pushLoading ? '#94a3b8' : '#1B2A8F',
          color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: pushLoading ? 'default' : 'pointer',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
        {pushLoading ? '...' : '🔔 Aktive'}
      </button>
    </div>
  )
}
