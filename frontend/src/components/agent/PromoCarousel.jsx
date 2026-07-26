// src/components/agent/PromoCarousel.jsx
import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Wallet } from 'lucide-react'

const BANNER_URL = '/assets/banner-konkou.png'

const SLIDES = [
  { type: 'image' },
  { type: 'card', icon: Trophy, title: '100,000 HTG', text: 'Pou fèt fen ane a — bay 3 pi gwo ajan yo.' },
  { type: 'card', icon: TrendingUp, title: '20+ Antrepriz', text: 'Objektif ou pou fè pati 3 ganyan yo nan konkou a.' },
  { type: 'card', icon: Wallet, title: 'Komisyon Chak Mwa', text: 'Pou tout tan yon antrepriz w mennen rete abòne.' },
]

/**
 * Karousèl pwomosyon konkou ajan an.
 * @param {number} maxWidth - lajè maksimòm (default 380)
 * @param {number} height   - wotè fiks pou tout slide yo (default 420)
 * @param {number} interval - tan ant chak slide an ms (default 4500)
 */
export default function PromoCarousel({ maxWidth = 380, height = 420, interval = 4500 }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), interval)
    return () => clearInterval(t)
  }, [interval])

  const slide = SLIDES[index]

  return (
    <div style={{ width: '100%', maxWidth }}>
      <div style={{
        borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
        border: '1px solid #E2E8F0', height, background: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
      }}>
        {slide.type === 'image' ? (
          <img key="img" src={BANNER_URL} alt="Konkou Ajan — 100,000 HTG"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'pcFade 0.5s ease' }} />
        ) : (
          <div key={index} style={{ padding: 28, textAlign: 'center', animation: 'pcFade 0.5s ease' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <slide.icon size={28} color="#F97316" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>{slide.title}</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.5, maxWidth: 260 }}>{slide.text}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {SLIDES.map((_, i) => (
          <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`} style={{
            width: i === index ? 22 : 7, height: 7, borderRadius: 4, border: 'none',
            background: i === index ? '#F97316' : '#E2E8F0', cursor: 'pointer', transition: 'width 0.3s', padding: 0
          }} />
        ))}
      </div>

      <style>{`@keyframes pcFade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}
