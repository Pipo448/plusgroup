// src/pages/restaurant/RestoQrCard.jsx
// ─── Kòd QR pòtal restoran an (ak app Plus Resto) ─────────────────────
// Montre kòd QR la, telechaje l an PNG, oswa enprime yon kat tab (A6) /
// yon afich (A4). Afich yo toujou an Kreyòl + Français (de lang peyi a).
// Depandans: npm install qrcode
import { useEffect, useRef, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { QrCode, Download, Printer, Copy, Check } from 'lucide-react'
import { RESTO_BUNDLES } from './restoI18n'
import { Btn, Seg, cx } from './restoUI'

const ICON = '/plus-resto-192.png'
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function loadImg(src) {
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src })
}

// Kòd QR (koreksyon erè H) + ikòn Plus Resto nan mitan an
export async function renderQr(url, size = 1024) {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, url, { width: size, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#1d140d', light: '#ffffff' } })
  const icon = await loadImg(ICON)
  if (icon) {
    const ctx = canvas.getContext('2d')
    const s = Math.round(size * 0.2), x = (size - s) / 2, pad = Math.round(s * 0.12), r = Math.round(s * 0.24)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x - pad, x - pad, s + pad * 2, s + pad * 2, r); else ctx.rect(x - pad, x - pad, s + pad * 2, s + pad * 2)
    ctx.fill()
    ctx.drawImage(icon, x, x, s, s)
  }
  return canvas.toDataURL('image/png')
}

function printPoster({ format, qr, name, url, mode }) {
  const ht = RESTO_BUNDLES.ht.qr, fr = RESTO_BUNDLES.fr.qr
  const l1 = mode === 'dir' ? [ht.scanDir, fr.scanDir] : [ht.scan, fr.scan]
  const l2 = mode === 'dir' ? [ht.scanDirSub, fr.scanDirSub] : [ht.scanSub, fr.scanSub]
  const a4 = format === 'a4'
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentWindow.document
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — QR</title><style>
    @page { size: ${a4 ? 'A4' : 'A6'} portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; height: 100%; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1d140d; }
    .p { width: 100%; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center;
      padding: ${a4 ? '18mm 16mm 14mm' : '7mm 7mm 6mm'}; background: #fff8f1; border: ${a4 ? '3mm' : '1.6mm'} solid #e8642c; }
    .top { display: flex; flex-direction: column; align-items: center; gap: ${a4 ? '3mm' : '1.2mm'}; }
    .name { font: 700 ${a4 ? '40px' : '19px'}/1.1 Georgia, 'Times New Roman', serif; margin: 0; }
    .l1 { font-weight: 800; font-size: ${a4 ? '30px' : '15px'}; line-height: 1.15; margin: 0; color: #c2410c; }
    .l1b { font-weight: 600; font-size: ${a4 ? '20px' : '10.5px'}; margin: 0; color: #6b5847; }
    .qr { width: ${a4 ? '120mm' : '62mm'}; height: ${a4 ? '120mm' : '62mm'}; padding: ${a4 ? '5mm' : '2.5mm'}; background: #fff; border-radius: ${a4 ? '8mm' : '4mm'};
      box-shadow: 0 0 0 ${a4 ? '1mm' : '.5mm'} #f0d6c4; }
    .qr img { width: 100%; height: 100%; display: block; }
    .l2 { font-weight: 600; font-size: ${a4 ? '18px' : '9.5px'}; margin: 0; }
    .l2b { font-size: ${a4 ? '14px' : '8px'}; margin: 0; color: #6b5847; }
    .url { font: 600 ${a4 ? '15px' : '8px'}/1.2 'Courier New', monospace; margin: ${a4 ? '2mm' : '1mm'} 0 0; word-break: break-all; }
    .foot { font-size: ${a4 ? '12px' : '7px'}; color: #6b5847; display: flex; align-items: center; gap: 2mm; }
    .foot img { width: ${a4 ? '8mm' : '4mm'}; height: ${a4 ? '8mm' : '4mm'}; border-radius: 1mm; }
  </style></head><body><div class="p">
    <div class="top">
      <p class="name">${esc(name)}</p>
      <p class="l1">${esc(l1[0])}</p><p class="l1b">${esc(l1[1])}</p>
    </div>
    <div class="qr"><img src="${qr}" alt="QR"></div>
    <div class="top">
      <p class="l2">${esc(l2[0])}</p><p class="l2b">${esc(l2[1])}</p>
      <p class="url">${esc(url.replace(/^https?:\/\//, ''))}</p>
    </div>
    <div class="foot"><img src="${window.location.origin}${ICON}" alt=""> Plus Resto · PLUS GROUP · +509 4244 9024</div>
  </div></body></html>`)
  doc.close()
  const go = () => { try { frame.contentWindow.focus(); frame.contentWindow.print() } finally { setTimeout(() => frame.remove(), 2000) } }
  // tann imaj yo chaje anvan enpresyon an
  const imgs = [...doc.images]
  Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => { i.onload = ok; i.onerror = ok })))).then(() => setTimeout(go, 150))
}

export default function RestoQrCard({ t, portalUrl, directoryUrl, tenantName, slug, ready }) {
  const [mode, setMode] = useState('portal') // portal | dir
  const [qr, setQr] = useState(null)
  const [copied, setCopied] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const url = mode === 'dir' ? directoryUrl : portalUrl
  const name = mode === 'dir' ? 'Plus Resto' : tenantName

  useEffect(() => {
    let on = true
    setQr(null)
    if (!url) return undefined
    renderQr(url).then((d) => { if (on && alive.current) setQr(d) }).catch(() => {})
    return () => { on = false }
  }, [url])

  const download = useCallback(() => {
    if (!qr) return
    const a = document.createElement('a')
    a.href = qr
    a.download = `qr-${mode === 'dir' ? 'plus-resto' : slug || 'restoran'}.png`
    document.body.appendChild(a); a.click(); a.remove()
  }, [qr, mode, slug])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); toast.success(t('qr.copied')); setTimeout(() => setCopied(false), 1500) } catch { /* */ }
  }

  const disabled = !qr || (mode === 'portal' && !ready)

  return (
    <section className="rs-card rs-glass" style={{ '--delay': '50ms' }}>
      <h2 className="rs-card__title"><QrCode size={18} /> {t('qr.title')}</h2>
      <p className="rs-hint" style={{ marginTop: -6 }}>{t('qr.subtitle')}</p>
      <div className="rs-qr">
        <div className={cx('rs-qr__code', disabled && 'is-off')}>
          {qr ? <img src={qr} alt={`QR ${name}`} /> : <div className="rs-skel" style={{ width: '100%', height: '100%' }} />}
        </div>
        <div className="rs-qr__side">
          <span className="rs-label">{t('qr.target')}</span>
          <Seg value={mode} onChange={setMode} options={[{ id: 'portal', label: t('qr.portal') }, { id: 'dir', label: t('qr.directory') }]} />
          <code className="rs-qr__url">{url}</code>
          {mode === 'portal' && !ready && <div className="rs-alert rs-alert--warn">{t('qr.notReady')}</div>}
          <div className="rs-qr__btns">
            <Btn icon={Printer} onClick={() => printPoster({ format: 'a6', qr, name, url, mode })} disabled={disabled}>{t('qr.printTable')}</Btn>
            <Btn variant="glass" icon={Printer} onClick={() => printPoster({ format: 'a4', qr, name, url, mode })} disabled={disabled}>{t('qr.printPoster')}</Btn>
            <Btn variant="glass" icon={Download} onClick={download} disabled={disabled}>{t('qr.download')}</Btn>
            <Btn variant="glass" icon={copied ? Check : Copy} onClick={copy} disabled={!url}>{t('qr.copy')}</Btn>
          </div>
          <p className="rs-hint" style={{ margin: 0 }}>{t('qr.tip')}</p>
        </div>
      </div>
    </section>
  )
}