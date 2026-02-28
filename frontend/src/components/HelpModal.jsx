// src/components/HelpModal.jsx
// Itilizasyon: <HelpModal page="dashboard" />
// Mete bouton '?' a nan nenpòt paj epi li ouvri modal avèk kontni espesifik pou paj la ak wòl itilizatè a

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import helpContent from '../i18n/helpContent'

const D = {
  blue: '#1B2A8F', blueLt: '#2D3FBF',
  blueDim: 'rgba(27,42,143,0.07)', blueDim2: 'rgba(27,42,143,0.13)',
  gold: '#C9A84C',
  white: '#FFFFFF', border: 'rgba(27,42,143,0.10)',
  text: '#0F1A5C', muted: '#6B7AAB',
  shadow: '0 8px 40px rgba(27,42,143,0.18)',
}

// ── Yon seksyon klap (accordion)
function HelpSection({ section, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      borderRadius: 12,
      border: `1.5px solid ${D.border}`,
      overflow: 'hidden',
      marginBottom: 10,
      transition: 'all 0.2s',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: open ? D.blueDim2 : D.blueDim,
          border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{section.icon}</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: D.text }}>{section.heading}</span>
        </div>
        {open
          ? <ChevronUp size={16} color={D.muted} />
          : <ChevronDown size={16} color={D.muted} />
        }
      </button>

      {open && (
        <div style={{ padding: '14px 16px', background: D.white }}>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {section.steps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: D.text, lineHeight: 1.6 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function HelpModal({ page }) {
  const [open, setOpen] = useState(false)
  const { i18n } = useTranslation()
  const { user } = useAuthStore()

  const lang = i18n.language?.slice(0, 2) || 'ht'
  const role = user?.role || 'viewer'

  // Jwenn kontni pou paj la ak lang lan
  const pageContent = helpContent[page]?.[lang] || helpContent[page]?.['ht']

  if (!pageContent) return null

  // Filtre seksyon yo selon wòl itilizatè a
  const visibleSections = pageContent.sections.filter(
    s => !s.role || s.role.includes(role) || s.role.includes('all')
  )

  if (visibleSections.length === 0) return null

  return (
    <>
      {/* ── Bouton '?' ── */}
      <button
        onClick={() => setOpen(true)}
        title="Èd / Aide / Help"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: '50%',
          background: D.blueDim2,
          border: `1.5px solid ${D.border}`,
          cursor: 'pointer', flexShrink: 0,
          transition: 'all 0.2s',
          color: D.blue,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = D.blue
          e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = D.blueDim2
          e.currentTarget.style.color = D.blue
        }}
      >
        <HelpCircle size={17} />
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,26,92,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div style={{
            background: D.white, borderRadius: 20,
            width: '100%', maxWidth: 520,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: D.shadow,
            animation: 'helpSlideIn 0.2s ease',
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px', borderBottom: `1px solid ${D.border}`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: `linear-gradient(135deg, ${D.blue}, ${D.blueLt})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 3px 12px ${D.blue}40`,
                }}>
                  <HelpCircle size={19} color="#fff" />
                </div>
                <div>
                  <h2 style={{ color: D.text, fontSize: 15, fontWeight: 900, margin: 0 }}>
                    {pageContent.title}
                  </h2>
                  <p style={{ color: D.muted, fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}>
                    {lang === 'ht' ? `Wòl ou: ${role}` : lang === 'fr' ? `Votre rôle: ${role}` : `Your role: ${role}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: D.blueDim, cursor: 'pointer', color: D.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Kontni */}
            <div style={{ overflowY: 'auto', padding: '18px 22px', flex: 1 }}>
              {visibleSections.map((section, i) => (
                <HelpSection
                  key={i}
                  section={section}
                  defaultOpen={i === 0}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 22px', borderTop: `1px solid ${D.border}`,
              flexShrink: 0, textAlign: 'center',
            }}>
              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
                {lang === 'ht'
                  ? '💡 Kontakte admin ou a si ou gen lòt kesyon.'
                  : lang === 'fr'
                    ? '💡 Contactez votre admin si vous avez d\'autres questions.'
                    : '💡 Contact your admin if you have other questions.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes helpSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
