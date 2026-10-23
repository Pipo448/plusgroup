// src/pages/public/PlusGroupPromo.jsx
// ─── Pwomosyon PLUS GROUP pou mèt restoran yo ─────────────────────────
// Kote li parèt:
//  • Anyè Plus Resto (/resto): yon gwo kat anba lis restoran yo + yon ti fenèt
//    ki parèt yon fwa (apre kèk segonn), pa plis pase yon fwa chak 5 jou.
//  • Pòtal chak restoran: yon ti liy diskrè anba paj meni an (pa janm yon popup,
//    pou pa deranje kliyan restoran an).
// Bouton WhatsApp la voye yon mesaj tou pare ki di ki kote moun nan soti
// (anyè a oswa pòtal ki restoran), konsa ou konnen ki kote kliyan yo soti.
import { useEffect, useState } from 'react'
import { QrCode, Bike, CalendarDays, ChefHat, Boxes, BarChart3, MessageCircle, Phone, Sparkles, ChevronRight, X } from 'lucide-react'
import { Btn, Modal, cx } from '../restaurant/restoUI'

// ── Kontak PLUS GROUP (chanje l isit la sèlman) ──
export const PLUS_CONTACT = {
  whatsapp: '50942449024',
  phone: '+50942449024',
  phoneLabel: '+509 4244 9024',
}

const POP_KEY = 'plusgroup-promo-seen'
const POP_EVERY = 5 * 24 * 60 * 60 * 1000 // 5 jou
const POP_DELAY = 9000

const BENEFITS = [
  { icon: QrCode, k: 'b1' }, { icon: Bike, k: 'b2' }, { icon: CalendarDays, k: 'b3' },
  { icon: ChefHat, k: 'b4' }, { icon: Boxes, k: 'b5' }, { icon: BarChart3, k: 'b6' },
]

export function waLink(t, source) {
  const text = `${t('pro.msg')}${source ? `\n(${t('pro.src')}: ${source})` : ''}`
  return `https://wa.me/${PLUS_CONTACT.whatsapp}?text=${encodeURIComponent(text)}`
}

function ContactButtons({ t, source, block }) {
  return (
    <div className={cx('rs-pro__ctas', block && 'is-block')}>
      <a className="rs-btn rs-btn--primary rs-btn--md rs-pro__wa" href={waLink(t, source)} target="_blank" rel="noreferrer">
        <MessageCircle size={18} /><span>{t('pro.wa')}</span>
      </a>
      <a className="rs-btn rs-btn--glass rs-btn--md" href={`tel:${PLUS_CONTACT.phone}`}>
        <Phone size={17} /><span>{t('pro.call')}</span>
      </a>
    </div>
  )
}

function BenefitList({ t, compact }) {
  return (
    <ul className={cx('rs-pro__list', compact && 'is-compact')}>
      {BENEFITS.map(({ icon: Icon, k }, i) => (
        <li key={k} style={{ '--d': `${i * 50}ms` }}>
          <span className="rs-pro__ic"><Icon size={18} /></span>
          <span><b>{t(`pro.${k}t`)}</b><small>{t(`pro.${k}d`)}</small></span>
        </li>
      ))}
    </ul>
  )
}

// Fenèt detay la (louvri depi kat la, liy pòtal la oswa ti fenèt la)
export function PromoSheet({ t, theme, source, onClose }) {
  return (
    <Modal theme={theme} title={t('pro.title')} subtitle={t('pro.team')} onClose={onClose} size="lg" closeLabel={t('pro.later')}
      footer={<ContactButtons t={t} source={source} block />}>
      <p className="rs-pro__sub" style={{ marginTop: 0 }}>{t('pro.sub')}</p>
      <BenefitList t={t} />
      <div className="rs-alert rs-alert--info" style={{ marginTop: 14 }}><Sparkles size={16} /> {t('pro.visible')}</div>
      <p className="rs-pro__trial">✓ {t('pro.trial')} · {PLUS_CONTACT.phoneLabel}</p>
    </Modal>
  )
}

// Gwo kat la — anyè Plus Resto
export function PromoCard({ t, theme, source = 'Plus Resto' }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rs-pro rs-glass" aria-label={t('pro.title')}>
      <div className="rs-pro__glow" aria-hidden="true" />
      <div className="rs-pro__head">
        <span className="rs-pro__tag"><Sparkles size={13} /> {t('pro.tag')}</span>
        <h2 className="rs-pro__title">{t('pro.title')}</h2>
        <p className="rs-pro__sub">{t('pro.sub')}</p>
      </div>
      <BenefitList t={t} compact />
      <div className="rs-pro__foot">
        <ContactButtons t={t} source={source} />
        <button type="button" className="rs-pro__more" onClick={() => setOpen(true)}>{t('pro.more')} <ChevronRight size={15} /></button>
      </div>
      <p className="rs-pro__trial">✓ {t('pro.trial')}</p>
      {open && <PromoSheet t={t} theme={theme} source={source} onClose={() => setOpen(false)} />}
    </section>
  )
}

// Ti liy diskrè — anba pòtal yon restoran
export function PromoStrip({ t, theme, source }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="rs-pro-strip" onClick={() => setOpen(true)}>
        <span className="rs-pro-strip__logo" aria-hidden="true"><img src="/plus-resto-192.png" alt="" /></span>
        <span className="rs-pro-strip__text"><b>{t('pro.strip')}</b><span>{t('pro.stripCta')}</span></span>
        <ChevronRight size={18} />
      </button>
      {open && <PromoSheet t={t} theme={theme} source={source} onClose={() => setOpen(false)} />}
    </>
  )
}

// Ti fenèt ki parèt yon fwa — anyè Plus Resto sèlman
export function PromoPopup({ t, theme, source = 'Plus Resto' }) {
  const [show, setShow] = useState(false)
  const [sheet, setSheet] = useState(false)
  useEffect(() => {
    let last = 0
    try { last = Number(localStorage.getItem(POP_KEY)) || 0 } catch { /* */ }
    if (Date.now() - last < POP_EVERY) return undefined
    const id = setTimeout(() => setShow(true), POP_DELAY)
    return () => clearTimeout(id)
  }, [])
  const done = () => { setShow(false); try { localStorage.setItem(POP_KEY, String(Date.now())) } catch { /* */ } }
  if (sheet) return <PromoSheet t={t} theme={theme} source={source} onClose={() => setSheet(false)} />
  if (!show) return null
  return (
    <div className="rs-pro-pop rs-glass" role="dialog" aria-label={t('pro.popTitle')}>
      <button type="button" className="rs-pro-pop__x" onClick={done} aria-label={t('pro.later')}><X size={16} /></button>
      <span className="rs-pro-pop__logo" aria-hidden="true"><img src="/plus-resto-192.png" alt="" /></span>
      <div className="rs-pro-pop__body">
        <b>{t('pro.popTitle')}</b>
        <span>{t('pro.popText')}</span>
        <div className="rs-pro-pop__btns">
          <Btn size="sm" iconRight={ChevronRight} onClick={() => { done(); setSheet(true) }}>{t('pro.more')}</Btn>
          <Btn size="sm" variant="ghost" onClick={done}>{t('pro.later')}</Btn>
        </div>
      </div>
    </div>
  )
}