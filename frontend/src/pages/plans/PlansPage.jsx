// src/pages/plans/PlansPage.jsx
import { useAuthStore } from '../../stores/authStore'
import { Check, Zap, Shield, Star, Phone, ArrowRight, Lock } from 'lucide-react'

const C = {
  black: '#1a0533', darkBg: '#2d0a4e', navBg: '#1f0a3a',
  gold: '#f5680c', goldLt: '#ff8534',
  enterprise: '#C9A84C',
  white: '#FFFFFF', muted: 'rgba(255,255,255,0.6)',
  border: 'rgba(245,104,12,0.15)',
}

const PLANS = [
  {
    id: 'starter',
    name: 'Démaré',
    nameHT: 'Pou kòmanse',
    price: 'Gratis',
    priceNote: 'Toujou gratis',
    color: '#475569',
    accent: 'rgba(71,85,105,0.15)',
    border: 'rgba(71,85,105,0.3)',
    icon: Zap,
    features: [
      '1 itilizatè',
      '50 pwodui maksimòm',
      '20 fakti pa mwa',
      'Rapò debaz',
      'Sipò pa imèl',
    ],
    locked: [
      'Branches',
      'Kane / Sabotay / MobilPay',
      'Itilizatè ilimite',
      'Analiz avanse',
    ],
    cta: 'Plan aktyèl ou a',
    disabled: true,
  },
  {
    id: 'biznis',
    name: 'Biznis',
    nameHT: 'Pou antrepriz ki grandi',
    price: '5,000 HTG',
    priceNote: 'pa mwa',
    color: C.gold,
    accent: 'rgba(245,104,12,0.12)',
    border: 'rgba(245,104,12,0.35)',
    icon: Shield,
    popular: true,
    features: [
      '5 itilizatè',
      'Pwodui ilimite',
      'Fakti ilimite',
      'Rapò avanse',
      'Gestion branch (2 branch)',
      'Sipò prioritè',
    ],
    locked: [
      'Kane / Sabotay / MobilPay',
      'Branch ilimite',
    ],
    cta: 'Chanje nan Biznis',
  },
  {
    id: 'antepriz',
    name: 'Antepriz',
    nameHT: 'Pou gwo konpayi',
    price: '15,000 HTG',
    priceNote: 'pa mwa',
    color: C.enterprise,
    accent: 'rgba(201,168,76,0.12)',
    border: 'rgba(201,168,76,0.4)',
    icon: Star,
    features: [
      'Itilizatè ilimite',
      'Pwodui ilimite',
      'Fakti ilimite',
      'Branch ilimite',
      '✦ Kane — Ti Kanè Kès',
      '✦ Sabotay — Peman digital',
      '✦ MonCash / NatCash',
      'Analiz konplè + BI',
      'Sipò dedye 24/7',
      'Onboarding pèsonalize',
    ],
    locked: [],
    cta: 'Chanje nan Antepriz',
  },
]

const WHATSAPP_NUMBER = '50942449024'
const WHATSAPP_MSG = (plan) =>
  encodeURIComponent(`Bonjou PLUS GROUP! Mwen vle upgrade nan plan ${plan} nan. Kijan mwen ka fè sa?`)

export default function PlansPage() {
  const { tenant } = useAuthStore()
  const planName = tenant?.plan?.name || ''
  const isEnterprise = ['antepriz', 'antrepriz', 'entreprise', 'enterprise']
    .includes(planName.toLowerCase().trim())

  const handleUpgrade = (plan) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG(plan.name)}`
    window.open(url, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.black} 0%, ${C.darkBg} 60%, ${C.navBg} 100%)`,
        padding: '48px 24px 56px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 300,
          background: 'radial-gradient(ellipse, rgba(245,104,12,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg,transparent,#b34200 10%,#f5680c 35%,#ff8534 50%,#f5680c 65%,#b34200 90%,transparent)',
        }}/>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 99,
          background: 'rgba(245,104,12,0.15)', border: '1px solid rgba(245,104,12,0.3)',
          marginBottom: 20,
        }}>
          <Star size={12} style={{ color: C.enterprise }}/>
          <span style={{ color: C.enterprise, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Plan disponib
          </span>
        </div>

        <h1 style={{ color: C.white, fontSize: 32, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.2 }}>
          Chwazi plan ki bon<br/>
          <span style={{ color: C.gold }}>pou biznis ou</span>
        </h1>
        <p style={{ color: C.muted, fontSize: 15, margin: 0, maxWidth: 420, marginInline: 'auto' }}>
          Upgrade pou jwenn aksè nan tout fonksyon PLUS GROUP — branches, peman digital, ak analiz avanse.
        </p>

        {isEnterprise && (
          <div style={{
            marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 99,
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)',
          }}>
            <Star size={14} style={{ color: C.enterprise }}/>
            <span style={{ color: C.enterprise, fontSize: 13, fontWeight: 700 }}>
              Ou deja sou plan Antepriz — mèsi! ✦
            </span>
          </div>
        )}
      </div>

      {/* Plans grid */}
      <div style={{
        maxWidth: 1100, marginInline: 'auto',
        padding: '40px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24,
      }}>
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrent = planName.toLowerCase().includes(plan.id) || (plan.id === 'starter' && !planName)

          return (
            <div key={plan.id} style={{
              background: plan.popular
                ? `linear-gradient(160deg, ${C.black}, ${C.darkBg})`
                : '#fff',
              borderRadius: 20,
              border: `1.5px solid ${isCurrent ? plan.border : plan.popular ? plan.border : 'rgba(0,0,0,0.08)'}`,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: plan.popular
                ? `0 20px 60px rgba(245,104,12,0.2)`
                : '0 4px 24px rgba(0,0,0,0.07)',
              transform: plan.popular ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>

              {plan.popular && (
                <div style={{
                  background: `linear-gradient(90deg, ${C.gold}, ${C.goldLt})`,
                  padding: '8px 0', textAlign: 'center',
                  fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.1em',
                }}>
                  ★ PI POPULÈ
                </div>
              )}

              {plan.id === 'antepriz' && (
                <div style={{
                  background: `linear-gradient(90deg, #9a6f1a, ${C.enterprise})`,
                  padding: '8px 0', textAlign: 'center',
                  fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.1em',
                }}>
                  ✦ ANTEPRIZ — AKSÈ KONPLÈ
                </div>
              )}

              <div style={{ padding: '28px 24px' }}>

                {/* Icon + Name */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: plan.accent,
                    border: `1px solid ${plan.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} style={{ color: plan.color }}/>
                  </div>
                  <div>
                    <h3 style={{
                      margin: 0, fontSize: 18, fontWeight: 900,
                      color: plan.popular || plan.id === 'antepriz' ? C.white : '#1a0533',
                    }}>
                      {plan.name}
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: plan.popular || plan.id === 'antepriz' ? C.muted : '#64748b' }}>
                      {plan.nameHT}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      fontSize: plan.price === 'Gratis' ? 28 : 26,
                      fontWeight: 900,
                      color: plan.popular || plan.id === 'antepriz' ? plan.color : plan.color,
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}>
                      {plan.price}
                    </span>
                    {plan.price !== 'Gratis' && (
                      <span style={{ fontSize: 12, color: plan.popular || plan.id === 'antepriz' ? C.muted : '#64748b' }}>
                        {plan.priceNote}
                      </span>
                    )}
                  </div>
                  {plan.price === 'Gratis' && (
                    <span style={{ fontSize: 11, color: plan.popular || plan.id === 'antepriz' ? C.muted : '#64748b' }}>
                      {plan.priceNote}
                    </span>
                  )}
                </div>

                {/* Features */}
                <div style={{ marginBottom: 20 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                        background: plan.accent, border: `1px solid ${plan.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={10} style={{ color: plan.color }}/>
                      </div>
                      <span style={{ fontSize: 13, color: plan.popular || plan.id === 'antepriz' ? 'rgba(255,255,255,0.85)' : '#334155', fontWeight: 500 }}>
                        {f}
                      </span>
                    </div>
                  ))}

                  {plan.locked.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, opacity: 0.4 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                        background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Lock size={9} style={{ color: '#64748b' }}/>
                      </div>
                      <span style={{ fontSize: 13, color: plan.popular || plan.id === 'antepriz' ? C.muted : '#94a3b8', fontWeight: 400, textDecoration: 'line-through' }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {isCurrent ? (
                  <div style={{
                    padding: '12px', borderRadius: 12, textAlign: 'center',
                    background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)',
                    fontSize: 13, fontWeight: 700, color: '#64748b',
                  }}>
                    ✓ Plan aktyèl ou a
                  </div>
                ) : plan.disabled ? (
                  <div style={{
                    padding: '12px', borderRadius: 12, textAlign: 'center',
                    background: 'rgba(100,116,139,0.08)', fontSize: 13, fontWeight: 600, color: '#94a3b8',
                  }}>
                    {plan.cta}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12,
                      border: 'none', cursor: 'pointer',
                      background: plan.id === 'antepriz'
                        ? `linear-gradient(135deg, #9a6f1a, ${C.enterprise})`
                        : `linear-gradient(135deg, ${C.gold}, ${C.goldLt})`,
                      color: '#fff', fontSize: 13, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: `0 4px 20px ${plan.id === 'antepriz' ? 'rgba(201,168,76,0.3)' : 'rgba(245,104,12,0.3)'}`,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${plan.id === 'antepriz' ? 'rgba(201,168,76,0.4)' : 'rgba(245,104,12,0.4)'}` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 20px ${plan.id === 'antepriz' ? 'rgba(201,168,76,0.3)' : 'rgba(245,104,12,0.3)'}` }}
                  >
                    <Phone size={14}/>
                    {plan.cta}
                    <ArrowRight size={14}/>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div style={{ textAlign: 'center', padding: '0 24px 48px', color: '#64748b', fontSize: 12 }}>
        <p>Pou nenpòt kesyon, kontakte nou sou WhatsApp oswa pa imèl.</p>
        <p style={{ color: C.gold, fontWeight: 700 }}>PLUS GROUP — Innov@tion & Tech 🇭🇹</p>
      </div>
    </div>
  )
}
