// src/components/EnterpriseLock.jsx
// ============================================================
// Konpozan "Paj Kle" pou fonksyon Plan Antepriz
// Reyitilizab pou KanePage, SabotayPage, MobilPayPage
// 3 Lang: ht | fr | en
// ============================================================
import { useNavigate } from 'react-router-dom'
import { Lock, Sparkles, ArrowRight, Check, Zap } from 'lucide-react'

const T = {
  ht: {
    locked:      'Fonksyon Antepriz',
    description: 'Fonksyon sa a disponib eksklizivman pou abone Plan Antepriz. Ogmante plan ou pou debloke aksè konplè.',
    price:       '5,000 HTG / mwa',
    upgrade:     'Ogmante Plan Mwen',
    orContact:   'Oswa kontakte nou:',
    included:    'Sa ki enkli nan Plan Antepriz:',
    features: [
      'Ti Kanè Kès ak enpresyon reçu',
      'Vant recharge Sabotay',
      'Peman MonCash & NatCash',
      'Branch ilimite',
      'Rapò avanse konsolidé',
      'Sipò prioritè 24/7',
    ],
    currentPlan: 'Plan aktyèl ou:',
    contact:     'info@plusgroupe.com',
  },
  fr: {
    locked:      'Fonctionnalité Entreprise',
    description: "Cette fonctionnalité est disponible exclusivement pour les abonnés du Plan Entreprise. Mettez à niveau votre plan pour y accéder.",
    price:       '5,000 HTG / mois',
    upgrade:     'Mettre à Niveau',
    orContact:   'Ou contactez-nous:',
    included:    'Inclus dans le Plan Entreprise:',
    features: [
      'Petits bons de caisse avec impression',
      'Vente de recharges Sabotay',
      'Paiements MonCash & NatCash',
      'Branches illimitées',
      'Rapports avancés consolidés',
      'Support prioritaire 24/7',
    ],
    currentPlan: 'Votre plan actuel:',
    contact:     'info@plusgroupe.com',
  },
  en: {
    locked:      'Enterprise Feature',
    description: 'This feature is available exclusively for Enterprise Plan subscribers. Upgrade your plan to unlock full access.',
    price:       '5,000 HTG / month',
    upgrade:     'Upgrade My Plan',
    orContact:   'Or contact us:',
    included:    'Included in Enterprise Plan:',
    features: [
      'Cash vouchers with receipt printing',
      'Sabotay electronic recharge sales',
      'MonCash & NatCash payments',
      'Unlimited branches',
      'Advanced consolidated reports',
      'Priority support 24/7',
    ],
    currentPlan: 'Your current plan:',
    contact:     'info@plusgroupe.com',
  }
}

// Koulè pou chak paj
const PAGE_THEMES = {
  kane: {
    icon:    '🧾',
    color:   '#C9A84C',
    glow:    'rgba(201,168,76,0.15)',
    border:  'rgba(201,168,76,0.25)',
    name:    { ht: 'Ti Kanè Kès', fr: 'Bon de Caisse', en: 'Cash Voucher' }
  },
  sabotay: {
    icon:    '📱',
    color:   '#38bdf8',
    glow:    'rgba(56,189,248,0.12)',
    border:  'rgba(56,189,248,0.25)',
    name:    { ht: 'Sabotay Recharge', fr: 'Recharge Sabotay', en: 'Sabotay Recharge' }
  },
  mobilpay: {
    icon:    '💳',
    color:   '#a78bfa',
    glow:    'rgba(167,139,250,0.12)',
    border:  'rgba(167,139,250,0.25)',
    name:    { ht: 'MonCash & NatCash', fr: 'MonCash & NatCash', en: 'MonCash & NatCash' }
  },
}

export default function EnterpriseLock({ lang = 'ht', page = 'kane', currentPlanName = '' }) {
  const navigate = useNavigate()
  const t = T[lang] || T.ht
  const theme = PAGE_THEMES[page] || PAGE_THEMES.kane

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: theme.glow,
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Kont prensipal */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>

        {/* Badge "Plan Antepriz" */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 20,
          background: `${theme.color}18`,
          border: `1px solid ${theme.border}`,
          marginBottom: 24,
        }}>
          <Sparkles size={13} color={theme.color} />
          <span style={{ color: theme.color, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
            PLAN ANTEPRIZ
          </span>
        </div>

        {/* Gwo ikòn + kle */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `${theme.color}15`,
            border: `2px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            boxShadow: `0 0 40px ${theme.glow}`,
          }}>
            {theme.icon}
          </div>
          {/* Kle badge */}
          <div style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#0f172a',
            border: `2px solid ${theme.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Lock size={14} color={theme.color} />
          </div>
        </div>

        {/* Non paj + tit */}
        <h1 style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: 800,
          margin: '0 0 8px',
          textAlign: 'center',
          letterSpacing: '-0.02em',
        }}>
          {theme.name[lang] || theme.name.ht}
        </h1>

        <p style={{
          color: '#64748b',
          fontSize: 14,
          textAlign: 'center',
          margin: '0 0 32px',
          lineHeight: 1.6,
          maxWidth: 400,
        }}>
          {t.description}
        </p>

        {/* Kat prensipal */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {/* Header kat */}
          <div style={{
            padding: '20px 24px',
            borderBottom: `1px solid rgba(255,255,255,0.06)`,
            background: `${theme.color}08`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>{t.locked}</div>
              <div style={{ color: theme.color, fontWeight: 800, fontSize: 22 }}>{t.price}</div>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: `${theme.color}20`,
              border: `1px solid ${theme.border}`,
            }}>
              <Zap size={18} color={theme.color} />
            </div>
          </div>

          {/* Lis fonksyon */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14, fontWeight: 600 }}>
              {t.included}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {t.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: `${theme.color}20`,
                    border: `1px solid ${theme.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Check size={11} color={theme.color} />
                  </div>
                  <span style={{ color: '#cbd5e1', fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton Upgrade */}
          <div style={{ padding: '0 24px 24px' }}>
            <button
              onClick={() => navigate('/settings/billing')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${theme.color}, ${theme.color}99)`,
                color: '#000',
                fontWeight: 800,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 4px 20px ${theme.glow}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = `0 8px 30px ${theme.glow}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 4px 20px ${theme.glow}`
              }}
            >
              {t.upgrade}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Plan aktyèl + kontakt */}
        <div style={{ textAlign: 'center' }}>
          {currentPlanName && (
            <p style={{ color: '#475569', fontSize: 12, margin: '0 0 6px' }}>
              {t.currentPlan} <span style={{ color: '#94a3b8', fontWeight: 600 }}>{currentPlanName}</span>
            </p>
          )}
          <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>
            {t.orContact}{' '}
            <a href={`mailto:${t.contact}`} style={{ color: theme.color, textDecoration: 'none' }}>
              {t.contact}
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
