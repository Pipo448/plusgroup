// src/pages/restaurant/RestoFlyerCard.jsx
// ─── Paramèt « Flyer meni »: telechaje / ranje / retire imaj meni yo ──
// Imaj la konprese nan navigatè a (max 2000 px, WebP) anvan l voye, epi
// backend lan rekonprese l (sharp) — konsa pòtal la chaje vit.
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileImage, ImagePlus, ArrowUp, ArrowDown, Trash2, ExternalLink } from 'lucide-react'
import { restoApi } from './restoApi'
import { Btn, ConfirmModal } from './restoUI'

const MAX_SIDE = 2000

async function compress(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h)
    let data = c.toDataURL('image/webp', 0.86)
    if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg', 0.86) // ansyen navigatè
    return { image: data, width: w, height: h }
  } finally { URL.revokeObjectURL(url) }
}

// Miniati (imaj staff la mande token → Blob → objectURL)
function Thumb({ flyer }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let url = null, on = true
    restoApi.flyerBlob(flyer.id, flyer.v).then((b) => { if (!on) return; url = URL.createObjectURL(b); setSrc(url) }).catch(() => {})
    return () => { on = false; if (url) URL.revokeObjectURL(url) }
  }, [flyer.id, flyer.v])
  return src ? <img src={src} alt={flyer.title || ''} /> : <div className="rs-skel" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
}

export default function RestoFlyerCard({ t, theme, previewUrl }) {
  const qc = useQueryClient()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(null)
  const { data } = useQuery({ queryKey: ['restaurant-flyers'], queryFn: restoApi.flyers })
  const flyers = data?.flyers || []
  const max = data?.max || 6
  const setList = (list) => qc.setQueryData(['restaurant-flyers'], (o) => ({ ...(o || {}), flyers: list }))
  const errMsg = (e) => {
    const c = e?.response?.data?.code
    const k = c && t(`flyer.errors.${c}`)
    return k && !k.includes('flyer.errors') ? k : (e?.response?.data?.message || t('common.error'))
  }

  const onFiles = async (files) => {
    const list = [...(files || [])].filter((f) => /^image\/(jpeg|png|webp)$/i.test(f.type))
    if (!list.length) { toast.error(t('flyer.errors.FLYER_TYPE')); return }
    setBusy(true)
    try {
      for (const file of list.slice(0, Math.max(0, max - flyers.length))) {
        const payload = await compress(file)
        const res = await restoApi.addFlyer({ ...payload, title: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) })
        setList(res.flyers)
      }
      toast.success(t('flyer.saved'))
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false); if (input.current) input.current.value = '' }
  }

  const upd = useMutation({ mutationFn: ({ id, body }) => restoApi.updateFlyer(id, body), onSuccess: (r) => setList(r.flyers), onError: (e) => toast.error(errMsg(e)) })
  const rm = useMutation({
    mutationFn: (id) => restoApi.deleteFlyer(id),
    onSuccess: (r) => { setList(r.flyers); setDel(null); toast.success(t('flyer.removed')) },
    onError: (e) => toast.error(errMsg(e)),
  })

  return (
    <section className="rs-card rs-glass" style={{ '--delay': '45ms' }}>
      <h2 className="rs-card__title" style={{ flexWrap: 'wrap' }}>
        <FileImage size={18} /> {t('flyer.sTitle')}
        <span className="rs-hint" style={{ marginLeft: 'auto', fontWeight: 600 }}>{flyers.length} / {max}</span>
      </h2>
      <p className="rs-hint" style={{ marginTop: -6 }}>{t('flyer.sDesc')}</p>

      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <div className="rs-flyer-admin">
        {flyers.map((f, i) => (
          <div key={f.id} className="rs-flyer-admin__item">
            <div className="rs-flyer-admin__img"><Thumb flyer={f} /></div>
            <div className="rs-flyer-admin__tools">
              <button type="button" disabled={i === 0 || upd.isPending} onClick={() => upd.mutate({ id: f.id, body: { move: 'up' } })} aria-label={t('flyer.up')} title={t('flyer.up')}><ArrowUp size={15} /></button>
              <button type="button" disabled={i === flyers.length - 1 || upd.isPending} onClick={() => upd.mutate({ id: f.id, body: { move: 'down' } })} aria-label={t('flyer.down')} title={t('flyer.down')}><ArrowDown size={15} /></button>
              <button type="button" className="is-danger" onClick={() => setDel(f)} aria-label={t('flyer.remove')} title={t('flyer.remove')}><Trash2 size={15} /></button>
            </div>
            <div className="rs-flyer-admin__bar">
              <input className="rs-input" defaultValue={f.title} placeholder={t('flyer.titlePh')} maxLength={80}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (f.title || '')) upd.mutate({ id: f.id, body: { title: v } }) }} />
            </div>
          </div>
        ))}
        {flyers.length < max && (
          <button type="button" className="rs-flyer-add" onClick={() => input.current?.click()} disabled={busy}>
            <ImagePlus size={26} />
            {busy ? t('flyer.uploading') : t('flyer.upload')}
            {!flyers.length && <small style={{ fontWeight: 500 }}>{t('flyer.emptyText')}</small>}
          </button>
        )}
      </div>

      <div className="rs-alert rs-alert--info" style={{ marginTop: 14 }}>{t('flyer.tip')}</div>
      {flyers.length > 0 && previewUrl && (
        <div style={{ marginTop: 12 }}>
          <Btn variant="glass" size="sm" icon={ExternalLink} onClick={() => window.open(previewUrl, '_blank', 'noopener')}>{t('flyer.see')}</Btn>
        </div>
      )}

      <ConfirmModal open={!!del} theme={theme} title={t('flyer.removeConfirm')} text={del?.title || ''} confirmLabel={t('flyer.remove')} cancelLabel={t('common.cancel')}
        loading={rm.isPending} onConfirm={() => rm.mutate(del.id)} onClose={() => setDel(null)} />
    </section>
  )
}