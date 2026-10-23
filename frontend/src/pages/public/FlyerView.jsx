// src/pages/public/FlyerView.jsx
// ─── Flyer meni restoran an (imaj) sou pòtal la ───────────────────────
// Lis flyer yo + yon visyonè plen ekran: peze pou zoom, glise pou chanje,
// flèch klavye, Échap pou fèmen. Imaj yo sèvi ak kach 7 jou (?v=).
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Share2, FileImage } from 'lucide-react'
import { publicApi, PUBLIC_ORIGIN } from '../restaurant/restoApi'
import { Btn, Layer, cx } from '../restaurant/restoUI'

const ratio = (f) => (f.width && f.height ? `${f.width} / ${f.height}` : '2 / 3')

function Lightbox({ slug, flyers, start, theme, name, t, onClose }) {
  const [i, setI] = useState(start)
  const [zoom, setZoom] = useState(false)
  const scrollRef = useRef(null)
  const pending = useRef(null) // pozisyon pou zoom (0..1)
  const touch = useRef(null)
  const f = flyers[i]
  const total = flyers.length

  const go = useCallback((d) => { setZoom(false); setI((x) => (x + d + total) % total) }, [total])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && total > 1) go(1)
      if (e.key === 'ArrowLeft' && total > 1) go(-1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [go, onClose, total])

  // Apre zoom, mete pati kliyan an te peze a nan mitan ekran an
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (zoom && pending.current) {
      const { x, y } = pending.current
      el.scrollLeft = x * el.scrollWidth - el.clientWidth / 2
      el.scrollTop = y * el.scrollHeight - el.clientHeight / 2
      pending.current = null
    } else if (!zoom) { el.scrollLeft = 0; el.scrollTop = 0 }
  }, [zoom, i])

  const onImgClick = (e) => {
    if (zoom) { setZoom(false); return }
    const r = e.currentTarget.getBoundingClientRect()
    pending.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    setZoom(true)
  }
  const onTouchStart = (e) => { if (!zoom && e.touches.length === 1) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e) => {
    const s = touch.current; touch.current = null
    if (!s || zoom || total < 2) return
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }
  const share = async () => {
    const url = `${PUBLIC_ORIGIN}/resto/${slug}?v=flyer`
    try {
      if (navigator.share) await navigator.share({ title: name, url })
      else { await navigator.clipboard.writeText(url) }
    } catch { /* kliyan an anile */ }
  }

  return (
    <Layer theme={theme}>
      <div className="rs-lb" role="dialog" aria-modal="true" aria-label={t('flyer.title')}>
        <div className="rs-lb__bar">
          <span className="rs-lb__count">{f.title || t('flyer.title')}{total > 1 ? ` · ${t('flyer.count', { n: i + 1, total })}` : ''}</span>
          <button type="button" className="rs-lb__btn" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'Zoom -' : 'Zoom +'}>{zoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}</button>
          <button type="button" className="rs-lb__btn" onClick={share} aria-label={t('flyer.share')}><Share2 size={19} /></button>
          <button type="button" className="rs-lb__btn" onClick={onClose} aria-label={t('flyer.close')}><X size={22} /></button>
        </div>
        <div ref={scrollRef} className={cx('rs-lb__scroll', zoom && 'is-zoom')} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <img key={f.id} src={publicApi.flyerUrl(slug, f.id, f.v)} alt={f.title || t('flyer.title')} className="rs-lb__img"
            style={{ aspectRatio: ratio(f) }} onClick={onImgClick} draggable={false} />
        </div>
        {total > 1 && (
          <>
            <button type="button" className="rs-lb__nav rs-lb__nav--prev" onClick={() => go(-1)} aria-label={t('flyer.prev')}><ChevronLeft size={26} /></button>
            <button type="button" className="rs-lb__nav rs-lb__nav--next" onClick={() => go(1)} aria-label={t('flyer.next')}><ChevronRight size={26} /></button>
          </>
        )}
        {!zoom && <p className="rs-lb__hint">{t('flyer.zoomHint')}</p>}
      </div>
    </Layer>
  )
}

// Kat « Wè flyer meni an » (anlè meni an)
export function FlyerCta({ slug, flyers, onOpen, t }) {
  const f = flyers[0]
  if (!f) return null
  return (
    <button type="button" className="rs-flyer-cta rs-glass" onClick={onOpen}>
      <span className="rs-flyer-cta__thumb"><img src={publicApi.flyerUrl(slug, f.id, f.v)} alt="" loading="lazy" /></span>
      <span className="rs-flyer-cta__text">
        <b><FileImage size={16} /> {t('flyer.see')}</b>
        <small>{t('flyer.seeSub')}{flyers.length > 1 ? ` · ${flyers.length}` : ''}</small>
      </span>
      <ChevronRight size={20} className="rs-flyer-cta__go" />
    </button>
  )
}

// Paj flyer la (/resto/:slug?v=flyer) — oswa anndan meni an si pa gen plat an liy
export default function FlyerView({ slug, flyers, theme, name, t, onBack }) {
  const [open, setOpen] = useState(null)
  return (
    <section className="rs-flyers">
      <div className="rs-flyers__head">
        {onBack && <Btn variant="glass" size="sm" icon={ChevronLeft} onClick={onBack}>{t('flyer.back')}</Btn>}
        <h2 className="rs-flyers__title">{t('flyer.title')}</h2>
      </div>
      <div className="rs-flyers__list">
        {flyers.map((f, idx) => (
          <button key={f.id} type="button" className="rs-flyers__item" style={{ '--d': `${idx * 80}ms` }} onClick={() => setOpen(idx)} aria-label={f.title || t('flyer.title')}>
            <img src={publicApi.flyerUrl(slug, f.id, f.v)} alt={f.title || t('flyer.title')} loading={idx ? 'lazy' : 'eager'} style={{ aspectRatio: ratio(f) }} />
            {f.title && <span className="rs-flyers__cap">{f.title}</span>}
            <span className="rs-flyers__zoom"><ZoomIn size={18} /></span>
          </button>
        ))}
      </div>
      <p className="rs-hint" style={{ textAlign: 'center' }}>{t('flyer.zoomHint')}</p>
      {open != null && <Lightbox slug={slug} flyers={flyers} start={open} theme={theme} name={name} t={t} onClose={() => setOpen(null)} />}
    </section>
  )
}